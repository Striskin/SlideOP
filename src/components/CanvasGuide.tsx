import { useRef, useState } from 'react';
import { currentPage, useEditor } from '../store/editor';
import type { Page } from '../model/document';

export function CanvasGuide({
  guide,
  index,
  zoom,
}: {
  guide: Page['guides'][number];
  index: number;
  zoom: number;
}) {
  const [draft, setDraft] = useState<number | null>(null);
  const drag = useRef<{ start: number; position: number; value: number } | null>(null);
  const update = (position: number) =>
    useEditor
      .getState()
      .updatePage({
        guides: currentPage().guides.map((g, i) => (i === index ? { ...g, position } : g)),
      });
  const remove = () =>
    useEditor.getState().updatePage({ guides: currentPage().guides.filter((_, i) => i !== index) });
  return (
    <button
      className={`guide ${guide.axis === 'x' ? 'vertical' : 'horizontal'}`}
      aria-label={`${guide.axis === 'x' ? 'Vertical' : 'Horizontal'} guide ${index + 1}`}
      title={`Guide at ${Math.round(draft ?? guide.position)} px. Drag or use arrow keys; double-click or Delete to remove.`}
      style={
        guide.axis === 'x'
          ? { left: (draft ?? guide.position) * zoom }
          : { top: (draft ?? guide.position) * zoom }
      }
      onPointerDown={(e) => {
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = {
          start: guide.axis === 'x' ? e.clientX : e.clientY,
          position: guide.position,
          value: guide.position,
        };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const page = currentPage(),
          limit = guide.axis === 'x' ? page.width : page.height;
        d.value = Math.max(
          0,
          Math.min(
            limit,
            Math.round(
              d.position + ((guide.axis === 'x' ? e.clientX : e.clientY) - d.start) / zoom,
            ),
          ),
        );
        setDraft(d.value);
      }}
      onPointerUp={() => {
        if (drag.current) update(drag.current.value);
        drag.current = null;
        setDraft(null);
      }}
      onPointerCancel={() => {
        drag.current = null;
        setDraft(null);
      }}
      onDoubleClick={remove}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          remove();
        }
        if (e.key.startsWith('Arrow')) {
          e.preventDefault();
          const limit = guide.axis === 'x' ? currentPage().width : currentPage().height;
          update(
            Math.max(
              0,
              Math.min(
                limit,
                guide.position +
                  (['ArrowLeft', 'ArrowUp'].includes(e.key) ? -1 : 1) * (e.shiftKey ? 10 : 1),
              ),
            ),
          );
        }
      }}
    />
  );
}
