import { useEffect } from 'react';
import { ActiveSelection, Textbox } from 'fabric';
import { useEditor, currentPage } from '../store/editor';
import { liveCanvas, objectId } from '../canvas/adapter';
import { groupSelection, ungroupSelection } from '../canvas/commands';
import { persistCurrent } from './useProject';

export function useShortcuts() {
  useEffect(() => {
    let handBefore = false;
    const down = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void persistCurrent();
        return;
      }
      const target = e.target as HTMLElement;
      if (target.closest('input,textarea,select,[contenteditable="true"],[role="dialog"]')) return;
      const active = liveCanvas?.getActiveObject();
      if (active instanceof Textbox && active.isEditing) return;
      const s = useEditor.getState(),
        mod = e.ctrlKey || e.metaKey,
        key = e.key.toLowerCase();
      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
      } else if (mod && key === 'y') {
        e.preventDefault();
        s.redo();
      } else if (mod && key === 's') {
        e.preventDefault();
        void persistCurrent();
      } else if (mod && key === 'c') {
        e.preventDefault();
        s.copy();
      } else if (mod && key === 'v') {
        e.preventDefault();
        s.paste();
      } else if (mod && key === 'x') {
        e.preventDefault();
        s.copy();
        s.remove();
      } else if (mod && key === 'd') {
        e.preventDefault();
        s.duplicate();
      } else if (mod && key === 'g') {
        e.preventDefault();
        if (e.shiftKey) ungroupSelection();
        else groupSelection();
      } else if (mod && key === 'a') {
        e.preventDefault();
        if (liveCanvas) {
          const objects = liveCanvas.getObjects().filter((o) => o.selectable && o.visible);
          liveCanvas.setActiveObject(new ActiveSelection(objects, { canvas: liveCanvas }));
          s.select(objects.map(objectId));
          liveCanvas.requestRenderAll();
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        s.remove();
      } else if (e.key === 'Escape') {
        liveCanvas?.discardActiveObject();
        liveCanvas?.requestRenderAll();
        s.select([]);
      } else if (e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat) {
          handBefore = s.tool === 'hand';
          s.set({ tool: 'hand' });
        }
      } else if (!mod && key === 'v') s.set({ tool: 'select' });
      else if (!mod && key === 'h') s.set({ tool: 'hand' });
      else if (!mod && key === 't') s.add('text');
      else if (!mod && key === 'r') s.add('rect');
      else if (!mod && key === 'o') s.add('ellipse');
      else if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const delta = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowRight' ? delta : e.key === 'ArrowLeft' ? -delta : 0,
          dy = e.key === 'ArrowDown' ? delta : e.key === 'ArrowUp' ? -delta : 0;
        s.replaceElements(
          currentPage().elements.map((el) =>
            s.selection.includes(el.id) && !el.locked ? { ...el, x: el.x + dx, y: el.y + dy } : el,
          ),
        );
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !handBefore) useEditor.getState().set({ tool: 'select' });
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);
}
