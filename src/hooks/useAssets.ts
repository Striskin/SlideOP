import { useSyncExternalStore } from 'react';
import { assetList, assetsRevision, subscribeAssets } from '../services/assets';

export function useAssets() {
  useSyncExternalStore(subscribeAssets, assetsRevision);
  return assetList();
}
