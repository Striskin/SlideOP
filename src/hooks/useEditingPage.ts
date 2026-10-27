import { useMemo } from 'react';
import { useEditor } from '../store/editor';
import { scopedPage } from '../model/scope';

export function useEditingPage() {
  const page = useEditor((s) => s.document.pages.find((p) => p.id === s.pageId)!);
  const path = useEditor((s) => s.scopePath);
  return useMemo(() => scopedPage(page, path), [page, path]);
}
