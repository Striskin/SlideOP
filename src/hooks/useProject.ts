import { useEffect } from 'react';
import { useEditor } from '../store/editor';
import { restoreProject, saveProject } from '../services/persistence';
import { assetList } from '../services/assets';
import { finishTextEditing } from '../canvas/commands';

let writeQueue = Promise.resolve();
export function persistCurrent() {
  finishTextEditing();
  const document = useEditor.getState().document;
  const assets = assetList();
  writeQueue = writeQueue.catch(() => {}).then(() => saveProject(document, assets));
  return writeQueue
    .then(() => {
      if (useEditor.getState().document === document) useEditor.getState().set({ saved: 'saved' });
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
    ready = useEditor((s) => s.ready);
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
    const timer = setTimeout(() => void persistCurrent(), 700);
    return () => clearTimeout(timer);
  }, [doc, ready]);
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === 'hidden') void persistCurrent();
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
