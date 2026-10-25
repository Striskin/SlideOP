import { openDB } from 'idb';
import { assetList, blobDataURL, clearAssets, decodeAsset, registerAsset } from './assets';
import { uid, validateDocument, walkElements } from '../model/document';
import type { DesignDocument, Asset, Page } from '../model/document';
import { z } from 'zod';
import { renderPage } from '../canvas/adapter';

const db = () =>
  openDB('slideop-studio', 1, {
    upgrade(db) {
      db.createObjectStore('projects', { keyPath: 'id' });
      db.createObjectStore('assets', { keyPath: 'id' });
      db.createObjectStore('settings');
    },
  });
export async function saveProject(document: DesignDocument, assets = assetList()) {
  const needed = new Set(
    document.pages.flatMap((p) =>
      walkElements(p.elements).flatMap((e) => (e.assetId ? [e.assetId] : [])),
    ),
  );
  if ([...needed].some((id) => !assets.some((asset) => asset.id === id)))
    throw new Error('Cannot save a missing image asset.');
  const database = await db();
  const tx = database.transaction(['projects', 'assets', 'settings'], 'readwrite');
  await tx.objectStore('projects').put(document);
  for (const asset of assets) if (needed.has(asset.id)) await tx.objectStore('assets').put(asset);
  await tx.objectStore('settings').put(document.id, 'lastProject');
  await tx.done;
}
export async function listProjects(): Promise<DesignDocument[]> {
  return (await (await db()).getAll('projects')).sort((a: DesignDocument, b: DesignDocument) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}
export async function projectThumbnail(page: Page) {
  const database = await db();
  const urls = new Map<string, string>();
  try {
    for (const e of walkElements(page.elements)) {
      if (!e.assetId || urls.has(e.assetId)) continue;
      const asset = (await database.get('assets', e.assetId)) as Asset | undefined;
      if (!asset) throw new Error('Missing thumbnail asset.');
      urls.set(e.assetId, URL.createObjectURL(asset.blob));
    }
    return await renderPage(page, 250, (id) => urls.get(id)!);
  } finally {
    urls.forEach(URL.revokeObjectURL);
  }
}
export async function restoreProject(id?: string) {
  const database = await db();
  const key = id ?? (await database.get('settings', 'lastProject'));
  if (!key) return null;
  const raw = await database.get('projects', key);
  if (!raw) return null;
  const doc = validateDocument(raw);
  const ids = new Set(
    doc.pages.flatMap((p) =>
      walkElements(p.elements).flatMap((e) => (e.assetId ? [e.assetId] : [])),
    ),
  );
  const loaded: Asset[] = [];
  for (const id of ids) {
    const a = (await database.get('assets', id)) as Asset | undefined;
    if (!a) throw new Error('This project has a missing image asset.');
    loaded.push(a);
  }
  clearAssets();
  loaded.forEach(registerAsset);
  return doc;
}
export async function deleteProject(id: string) {
  const database = await db();
  await database.delete('projects', id);
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export async function exportProject(doc: DesignDocument) {
  const ids = new Set(
    doc.pages.flatMap((p) =>
      walkElements(p.elements).flatMap((e) => (e.assetId ? [e.assetId] : [])),
    ),
  );
  const assets = await Promise.all(
    assetList()
      .filter((a) => ids.has(a.id))
      .map(async (a) => ({ id: a.id, name: a.name, data: await blobDataURL(a.blob) })),
  );
  download(
    new Blob([JSON.stringify({ document: doc, assets })], { type: 'application/json' }),
    `${doc.name}.slideop`,
  );
}
const envelope = z.object({
  document: z.unknown(),
  assets: z
    .array(
      z.object({
        id: z.string().min(1).max(100),
        name: z.string().max(200),
        data: z
          .string()
          .max(36_000_000)
          .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/),
      }),
    )
    .max(500),
});
export async function importProject(file: File) {
  if (file.size > 150 * 1024 * 1024) throw new Error('Project must be smaller than 150 MB.');
  const data = envelope.parse(JSON.parse(await file.text()));
  const doc = validateDocument(data.document);
  if (new Set(data.assets.map((a) => a.id)).size !== data.assets.length)
    throw new Error('Duplicate image IDs.');
  const assets: Asset[] = [];
  for (const a of data.assets) {
    const blob = await (await fetch(a.data)).blob();
    assets.push(await decodeAsset(blob, a.name, a.id));
  }
  const byId = new Map(assets.map((a) => [a.id, a]));
  for (const e of doc.pages.flatMap((p) => walkElements(p.elements))) {
    if (!e.assetId) continue;
    const asset = byId.get(e.assetId);
    if (!asset) throw new Error('Project references a missing image.');
    if (
      e.width + (e.cropX ?? 0) > asset.width + 0.01 ||
      e.height + (e.cropY ?? 0) > asset.height + 0.01
    )
      throw new Error('Image crop exceeds its source dimensions.');
  }
  // Import as an independent copy so assets and projects cannot overwrite existing records.
  doc.id = uid();
  const importedIds = new Map(assets.map((a) => [a.id, uid()]));
  for (const e of doc.pages.flatMap((p) => walkElements(p.elements)))
    if (e.assetId) e.assetId = importedIds.get(e.assetId)!;
  assets.forEach((a) => {
    a.id = importedIds.get(a.id)!;
  });
  clearAssets();
  assets.forEach(registerAsset);
  return doc;
}
