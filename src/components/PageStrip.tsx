import { memo, useEffect, useState, useRef } from 'react';
import { Plus, Copy, Trash2, ChevronLeft, ChevronRight, GalleryHorizontalEnd } from 'lucide-react';
import type { Page } from '../model/document';
import { useEditor } from '../store/editor';
import { renderPage } from '../canvas/adapter';
import { projectThumbnail } from '../services/persistence';
import { IconButton } from './ui';
import { queueThumbnail } from '../services/thumbnailQueue';

export const PageThumbnail = memo(function PageThumbnail({
  page,
  stored = false,
}: {
  page: Page;
  stored?: boolean;
}) {
  const [image, setImage] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      rootMargin: '200px',
    });
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void queueThumbnail(
        () => (stored ? projectThumbnail(page) : renderPage(page, 250)),
        () => cancelled,
      )
        .then((url) => {
          if (!cancelled && url) setImage(url);
        })
        .catch(() => {});
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [page, stored, visible]);
  return (
    <div ref={root} className="thumbnail-image">
      {image ? (
        <img src={image} alt={page.name} draggable={false} />
      ) : (
        <div style={{ background: page.background }} />
      )}
    </div>
  );
});
export function PageStrip() {
  const pages = useEditor((s) => s.document.pages),
    pageId = useEditor((s) => s.pageId);
  const [collapsed, setCollapsed] = useState(false),
    [drag, setDrag] = useState<string | null>(null);
  return (
    <section className={`page-strip ${collapsed ? 'collapsed' : ''}`} aria-label="Pages">
      <div className="page-strip-header">
        <button className="text-button" onClick={() => setCollapsed(!collapsed)}>
          <GalleryHorizontalEnd size={15} />
          <strong>Pages</strong>
          <span className="count-badge">{pages.length}</span>
        </button>
        <span className="muted">
          {pages.findIndex((p) => p.id === pageId) + 1} of {pages.length}
        </span>
      </div>
      {!collapsed && (
        <div className="page-list">
          {pages.map((page, index) => (
            <div
              key={page.id}
              className={`page-item ${pageId === page.id ? 'selected' : ''}`}
              draggable
              onDragStart={() => setDrag(page.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (drag) {
                  const from = pages.findIndex((p) => p.id === drag);
                  useEditor.getState().movePage(drag, index - from);
                  setDrag(null);
                }
              }}
            >
              <button
                className="page-thumb"
                aria-label={`Open page ${index + 1}: ${page.name}`}
                onClick={() =>
                  useEditor.getState().set({ pageId: page.id, selection: [], scopePath: [] })
                }
              >
                <PageThumbnail page={page} />
                <span className="page-number">{String(index + 1).padStart(2, '0')}</span>
              </button>
              <div className="page-item-footer">
                <span>{page.name}</span>
                <div className="page-actions">
                  <IconButton
                    label={`Move page ${index + 1} left`}
                    disabled={index === 0}
                    onClick={() => useEditor.getState().movePage(page.id, -1)}
                  >
                    <ChevronLeft size={13} />
                  </IconButton>
                  <IconButton
                    label={`Duplicate page ${index + 1}`}
                    onClick={() => useEditor.getState().duplicatePage(page.id)}
                  >
                    <Copy size={12} />
                  </IconButton>
                  <IconButton
                    label={`Delete page ${index + 1}`}
                    disabled={pages.length === 1}
                    onClick={() => useEditor.getState().deletePage(page.id)}
                  >
                    <Trash2 size={12} />
                  </IconButton>
                  <IconButton
                    label={`Move page ${index + 1} right`}
                    disabled={index === pages.length - 1}
                    onClick={() => useEditor.getState().movePage(page.id, 1)}
                  >
                    <ChevronRight size={13} />
                  </IconButton>
                </div>
              </div>
            </div>
          ))}
          <button className="add-page" onClick={() => useEditor.getState().addPage()}>
            <Plus size={22} />
            <span>Add page</span>
          </button>
        </div>
      )}
    </section>
  );
}
