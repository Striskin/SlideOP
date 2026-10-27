import { openDB } from 'idb';
import { assetList, blobDataURL, clearAssets, decodeAsset, registerAsset } from './assets';
import { uid, validateDocument, walkElements } from '../model/document';
import type { DesignDocument, Asset, Page } from '../model/document';
import { z } from 'zod';
import { renderPage } from '../canvas/adapter';
import { removeDocumentAsset } from '../model/assetRemoval';

const db = () =>
  openDB('slideop-studio', 3, {
    upgrade(db, oldVersion, _newVersion, tx) {
      if (oldVersion < 1) {
        db.createObjectStore('projects', { keyPath: 'id' });
        db.createObjectStore('assets', { keyPath: 'id' });
        db.createObjectStore('settings');
      }
      if (oldVersion < 2) {
        db.createObjectStore('trash', { keyPath: 'id' });
        db.createObjectStore('versions', { keyPath: 'id' }).createIndex('projectId', 'projectId');
      }
      if (oldVersion < 3)
        tx.objectStore('versions').createIndex('projectCreatedAt', ['projectId', 'createdAt']);
    },
    blocking() {
      void connection.then((database) => database.close());
    },
  });
const connection = db();
export type ProjectVersion = {
  id: string;
  projectId: string;
  createdAt: string;
  label: string;
  document: DesignDocument;
};
export type TrashedProject = { id: string; deletedAt: string; document: DesignDocument };
export type UploadSummary = {
  id: string;
  name: string;
  width: number;
  height: number;
  size: number;
};
export async function listStoredUploads(): Promise<UploadSummary[]> {
  const database = await connection;
  const tx = database.transaction('assets');
  const uploads: UploadSummary[] = [];
  let cursor = await tx.store.openCursor();
  while (cursor) {
    const asset = cursor.value as Asset;
    uploads.push({
      id: asset.id,
      name: asset.name,
      width: asset.width,
      height: asset.height,
      size: asset.blob.size,
    });
    cursor = await cursor.continue();
  }
  return uploads.sort((a, b) => a.name.localeCompare(b.name));
}
const projectVersionRange = (id: string) => IDBKeyRange.bound([id, ''], [id, '\uffff']);

export async function listVersions(projectId: string): Promise<ProjectVersion[]> {
  return (
    (await (
      await connection
    ).getAllFromIndex('versions', 'projectId', projectId)) as ProjectVersion[]
  ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function createVersion(document: DesignDocument, label = 'Manual checkpoint') {
  const database = await connection;
  const tx = database.transaction(['versions', 'settings'], 'readwrite');
  const ids = new Set(
    document.pages.flatMap((p) =>
      walkElements(p.elements).flatMap((e) => (e.assetId ? [e.assetId] : [])),
    ),
  );
  for (const id of ids)
    if (await tx.objectStore('settings').get(`deletedAsset:${id}`))
      document = removeDocumentAsset(document, id);
  const store = tx.objectStore('versions');
  const keys = await store.index('projectCreatedAt').getAllKeys(projectVersionRange(document.id));
  for (const key of keys.slice(0, Math.max(0, keys.length - 19))) await store.delete(key);
  await store.put({
    id: uid(),
    projectId: document.id,
    createdAt: new Date().toISOString(),
    label: label.slice(0, 100),
    document,
  });
  await tx.done;
}
export async function saveProject(document: DesignDocument, assets = assetList()) {
  const incomingIds = new Set(
    document.pages.flatMap((p) =>
      walkElements(p.elements).flatMap((e) => (e.assetId ? [e.assetId] : [])),
    ),
  );
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  const database = await connection;
  const tx = database.transaction(['projects', 'assets', 'settings', 'versions'], 'readwrite');
  // A queued save or an older tab must not put a permanently deleted image back.
  for (const id of incomingIds)
    if (await tx.objectStore('settings').get(`deletedAsset:${id}`))
      document = removeDocumentAsset(document, id);
  const needed = new Set(
    document.pages.flatMap((p) =>
      walkElements(p.elements).flatMap((e) => (e.assetId ? [e.assetId] : [])),
    ),
  );
  if ([...needed].some((id) => !assetsById.has(id))) {
    tx.abort();
    await tx.done.catch(() => {});
    throw new Error('Cannot save a missing image asset.');
  }
  const previous = (await tx.objectStore('projects').get(document.id)) as
    DesignDocument | undefined;
  if (previous && previous.updatedAt !== document.updatedAt) {
    const versionIndex = tx.objectStore('versions').index('projectCreatedAt');
    const latest = await versionIndex.openKeyCursor(projectVersionRange(document.id), 'prev');
    const createdAt = latest ? String((latest.key as [string, string])[1]) : '';
    if (!latest || Date.now() - Date.parse(createdAt) >= 5 * 60_000) {
      const keys = await versionIndex.getAllKeys(projectVersionRange(document.id));
      for (const key of keys.slice(0, Math.max(0, keys.length - 19)))
        await tx.objectStore('versions').delete(key);
      await tx.objectStore('versions').put({
        id: uid(),
        projectId: document.id,
        createdAt: new Date().toISOString(),
        label: 'Automatic checkpoint',
        document: previous,
      });
    }
  }
  await tx.objectStore('projects').put(document);
  // Asset IDs are immutable. Existing blobs need not be rewritten on every keystroke.
  for (const id of needed)
    if ((await tx.objectStore('assets').getKey(id)) === undefined)
      await tx.objectStore('assets').put(assetsById.get(id)!);
  await tx.objectStore('settings').put(document.id, 'lastProject');
  await tx.done;
}
export async function deleteStoredUpload(assetId: string) {
  const database = await connection;
  const tx = database.transaction(
    ['projects', 'versions', 'trash', 'assets', 'settings'],
    'readwrite',
  );
  try {
    for (const storeName of ['projects', 'versions', 'trash'] as const) {
      let cursor = await tx.objectStore(storeName).openCursor();
      while (cursor) {
        const record = cursor.value;
        const document =
          storeName === 'projects'
            ? (record as DesignDocument)
            : (record.document as DesignDocument);
        const cleaned = removeDocumentAsset(document, assetId);
        if (cleaned !== document)
          await cursor.update(
            storeName === 'projects' ? cleaned : { ...record, document: cleaned },
          );
        cursor = await cursor.continue();
      }
    }
    await tx.objectStore('assets').delete(assetId);
    await tx.objectStore('settings').put(true, `deletedAsset:${assetId}`);
    await tx.done;
  } catch (error) {
    try {
      tx.abort();
    } catch {
      /* The transaction may already have aborted. */
    }
    await tx.done.catch(() => {});
    throw error;
  }
}
export async function listProjects(): Promise<DesignDocument[]> {
  return (await (await connection).getAll('projects')).sort(
    (a: DesignDocument, b: DesignDocument) => b.updatedAt.localeCompare(a.updatedAt),
  );
}
export async function projectThumbnail(page: Page) {
  const database = await connection;
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
  const database = await connection;
  const key = id ?? (await database.get('settings', 'lastProject'));
  if (!key) return null;
  const raw = await database.get('projects', key);
  if (!raw) return null;
  return hydrateDocument(raw);
}
async function hydrateDocument(raw: unknown) {
  const database = await connection;
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
  const database = await connection;
  const tx = database.transaction(['projects', 'trash', 'settings'], 'readwrite');
  const document = await tx.objectStore('projects').get(id);
  if (document) {
    await tx.objectStore('trash').put({ id, deletedAt: new Date().toISOString(), document });
    await tx.objectStore('projects').delete(id);
    if ((await tx.objectStore('settings').get('lastProject')) === id)
      await tx.objectStore('settings').delete('lastProject');
  }
  await tx.done;
}
export async function listTrash(): Promise<TrashedProject[]> {
  return ((await (await connection).getAll('trash')) as TrashedProject[]).sort((a, b) =>
    b.deletedAt.localeCompare(a.deletedAt),
  );
}
export async function restoreTrash(id: string) {
  const database = await connection;
  const tx = database.transaction(['projects', 'trash'], 'readwrite');
  const item = (await tx.objectStore('trash').get(id)) as TrashedProject | undefined;
  if (!item) throw new Error('This project is no longer in Trash.');
  const doc = validateDocument(item.document);
  // Never overwrite a project that has been recreated in another tab.
  if (await tx.objectStore('projects').get(id)) doc.id = uid();
  await tx.objectStore('projects').put(doc);
  await tx.objectStore('trash').delete(id);
  await tx.done;
}
export async function restoreVersion(id: string) {
  const database = await connection;
  const version = (await database.get('versions', id)) as ProjectVersion | undefined;
  if (!version) throw new Error('This saved version is no longer available.');
  const current = (await database.get('projects', version.projectId)) as DesignDocument | undefined;
  if (current) await createVersion(current, 'Before restoring a version');
  const originalAssets = assetList();
  try {
    const doc = await hydrateDocument(version.document);
    doc.updatedAt = new Date().toISOString();
    await saveProject(doc);
    return doc;
  } catch (error) {
    clearAssets();
    originalAssets.forEach(registerAsset);
    throw error;
  }
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
