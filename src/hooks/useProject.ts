import { useEffect } from 'react';
import { useEditor } from '../store/editor';
import { restoreProject, saveProject, deleteStoredUpload } from '../services/persistence';
import { assetList, forgetAsset } from '../services/assets';
import { captureEditingDocument, finishTextEditing } from '../canvas/commands';
import { removeAssetElements, removeDocumentAsset } from '../model/assetRemoval';

let writeQueue = Promise.resolve();
function purgeOpenAsset(assetId: string) {
  const state = useEditor.getState(),
    document = removeDocumentAsset(state.document, assetId);
  state.set({
    document,
    past: state.past.map((s) => ({ ...s, document: removeDocumentAsset(s.document, assetId) })),
    future: state.future.map((s) => ({ ...s, document: removeDocumentAsset(s.document, assetId) })),
    clipboard: removeAssetElements(state.clipboard, assetId),
    ...(document !== state.document
      ? { scopePath: [], selection: [], saved: 'saving' as const }
      : {}),
  });
  forgetAsset(assetId);
}
export async function deleteUpload(assetId: string) {
  if (!(await persistCurrent()))
    throw new Error('Could not save current work. The upload has been kept.');
  const deletion = writeQueue.catch(() => {}).then(() => deleteStoredUpload(assetId));
  writeQueue = deletion;
  await deletion;
  purgeOpenAsset(assetId);
  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel('slideop-upload-deletions');
    channel.postMessage({ type: 'deleted', assetId });
    channel.close();
  }
}
export function persistCurrent({ keepEditing = false }: { keepEditing?: boolean } = {}) {
  if (!useEditor.getState().ready) return Promise.resolve(false);
  if (!keepEditing) finishTextEditing();
  const source = useEditor.getState().document,
    revision = useEditor.getState().textRevision;
  const document = keepEditing ? captureEditingDocument() : source;
  const assets = assetList();
  writeQueue = writeQueue.catch(() => {}).then(() => saveProject(document, assets));
  return writeQueue
    .then(() => {
      const state = useEditor.getState();
      if (state.document === source && state.textRevision === revision)
        state.set({ saved: 'saved' });
      return true;
    })
    .catch(() => {
      useEditor.getState().set({
        saved: 'error',
        toast: 'Could not save locally. Export a SlideOP file to keep a backup.',
      });
      return false;
    });
}
export function useProject() {
  const doc = useEditor((s) => s.document),
    textRevision = useEditor((s) => s.textRevision),
    ready = useEditor((s) => s.ready);
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel('slideop-upload-deletions');
    channel.onmessage = (event: MessageEvent<unknown>) => {
      const data = event.data as { type?: unknown; assetId?: unknown } | null;
      if (
        data?.type === 'deleted' &&
        typeof data.assetId === 'string' &&
        data.assetId.length <= 100
      )
        purgeOpenAsset(data.assetId);
    };
    return () => channel.close();
  }, []);
  useEffect(() => {
    let cancelled = false;
    restoreProject()
      .then((document) => {
        if (cancelled) return;
        if (document) useEditor.getState().load(document);
        else useEditor.getState().set({ ready: true, saved: 'saving' });
      })
      .catch(() => {
        if (!cancelled)
          useEditor.getState().set({
            ready: true,
            saved: 'error',
            toast: 'Could not restore the last project. Your saved projects have not been deleted.',
          });
      });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => void persistCurrent({ keepEditing: true }), 700);
    return () => clearTimeout(timer);
  }, [doc, ready, textRevision]);
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === 'hidden') void persistCurrent({ keepEditing: true });
    };
    const leave = (e: BeforeUnloadEvent) => {
      if (useEditor.getState().saved !== 'saved') {
        e.preventDefault();
      }
    };
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('beforeunload', leave);
    return () => {
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('beforeunload', leave);
    };
  }, []);
}
