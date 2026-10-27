import { assetURL, decodeAsset, registerAsset, getAsset, isAssetDeleted } from './assets';
export type BackgroundProgress = { label: string; percent?: number };
let activeProgress: ((progress: BackgroundProgress) => void) | undefined;
let queue: Promise<unknown> = Promise.resolve();
const reportProgress = (key: string, current: number, total: number) => {
  if (key.startsWith('fetch') && total > 0)
    activeProgress?.({
      label: 'Downloading model resource',
      percent: Math.round((current / total) * 100),
    });
  else if (key.startsWith('compute'))
    activeProgress?.({
      label:
        key === 'compute:inference'
          ? 'Separating the subject…'
          : 'Creating your transparent image…',
    });
};

export function removeImageBackground(
  assetId: string,
  name: string,
  onProgress?: (progress: BackgroundProgress) => void,
) {
  const job = queue
    .catch(() => {})
    .then(async () => {
      activeProgress = onProgress;
      onProgress?.({ label: 'Preparing the local model…' });
      try {
        const { removeBackground } = await import('@imgly/background-removal');
        const publicPath = import.meta.env.VITE_BACKGROUND_MODEL_BASE_URL as string | undefined;
        const blob = await removeBackground(assetURL(assetId), {
          model: 'isnet_quint8',
          device: 'cpu',
          proxyToWorker: true,
          ...(publicPath ? { publicPath: new URL(publicPath, location.origin).href } : {}),
          progress: reportProgress,
        });
        if (isAssetDeleted(assetId) || !getAsset(assetId))
          throw new Error('The source image was deleted or its project was closed.');
        const asset = await decodeAsset(blob, `${name} cutout`);
        registerAsset(asset);
        return asset;
      } finally {
        activeProgress = undefined;
      }
    });
  queue = job;
  return job;
}
