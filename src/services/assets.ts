import type { Asset } from '../model/document';
import { uid } from '../model/document';

const assets = new Map<string, Asset>();
const urls = new Map<string, string>();
const deleted = new Set<string>();
const listeners = new Set<() => void>();
let revision = 0;
const notify = () => {
  revision++;
  listeners.forEach((listener) => listener());
};
export const assetsRevision = () => revision;
export const subscribeAssets = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const isAssetDeleted = (id: string) => deleted.has(id);
export function assetList() {
  return [...assets.values()];
}
export function getAsset(id: string) {
  return assets.get(id);
}
export function registerAsset(asset: Asset) {
  if (deleted.has(asset.id)) return;
  assets.set(asset.id, asset);
  notify();
}
export function forgetAsset(id: string) {
  deleted.add(id);
  const url = urls.get(id);
  if (url) URL.revokeObjectURL(url);
  urls.delete(id);
  assets.delete(id);
  notify();
}
export function assetURL(id: string) {
  if (urls.has(id)) return urls.get(id)!;
  const a = assets.get(id);
  if (!a) throw new Error('Image asset is missing.');
  const url = URL.createObjectURL(a.blob);
  urls.set(id, url);
  return url;
}
export function clearAssets() {
  urls.forEach(URL.revokeObjectURL);
  urls.clear();
  assets.clear();
  notify();
}
export async function decodeAsset(blob: Blob, name: string, id: string = uid()): Promise<Asset> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(blob.type))
    throw new Error('Use PNG, JPEG, or WebP. SVG and HTML uploads are not accepted.');
  if (blob.size > 25 * 1024 * 1024) throw new Error('Images must be smaller than 25 MB.');
  const bitmap = await createImageBitmap(blob);
  const { width, height } = bitmap;
  bitmap.close();
  if (width > 16384 || height > 16384 || width * height > 40_000_000)
    throw new Error('Image is too large. Maximum: 40 megapixels and 16,384 pixels per side.');
  return { id, name, blob, width, height };
}
export async function uploadAsset(file: File) {
  const a = await decodeAsset(file, file.name);
  registerAsset(a);
  return a;
}
export function blobDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('Could not read image.'));
    r.readAsDataURL(blob);
  });
}
