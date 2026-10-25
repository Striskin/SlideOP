import { assetURL, decodeAsset, registerAsset } from './assets';
import { useEditor } from '../store/editor';

export async function removeImageBackground(assetId: string, name: string) {
  const { removeBackground } = await import('@imgly/background-removal');
  const publicPath = import.meta.env.VITE_BACKGROUND_MODEL_BASE_URL as string | undefined;
  const blob = await removeBackground(assetURL(assetId), {
    model: 'isnet_quint8',
    device: 'cpu',
    proxyToWorker: true,
    ...(publicPath ? { publicPath: new URL(publicPath, location.origin).href } : {}),
    progress: (key, current, total) => {
      if (key.startsWith('fetch') && total > 0)
        useEditor
          .getState()
          .set({ toast: `Downloading background model: ${Math.round((current / total) * 100)}%` });
    },
  });
  const asset = await decodeAsset(blob, `${name} cutout`);
  registerAsset(asset);
  return asset;
}
