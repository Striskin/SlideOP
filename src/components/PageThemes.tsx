import { useState } from 'react';
import { Palette } from 'lucide-react';
import { pageThemes, applyPageTheme } from '../model/themes';
import { useEditor } from '../store/editor';

export function PageThemes() {
  const [selected, setSelected] = useState(pageThemes[0].id),
    [all, setAll] = useState(true);
  const inGroup = useEditor((s) => s.scopePath.length > 0);
  const theme = pageThemes.find((t) => t.id === selected)!;
  return (
    <section className="page-theme-section">
      <div className="section-heading">
        <h3>Page looks</h3>
        <Palette size={16} />
      </div>
      <p className="small muted">Color combinations with a clear role for every shade.</p>
      <div className="page-themes">
        {pageThemes.map((t) => (
          <button
            key={t.id}
            className={selected === t.id ? 'selected' : ''}
            aria-pressed={selected === t.id}
            aria-label={`Choose ${t.name} theme`}
            onClick={() => setSelected(t.id)}
          >
            <span className="theme-colors">
              {[t.background, t.ink, t.accent, t.secondary, t.surface].map((color, i) => (
                <i key={i} style={{ background: color }} />
              ))}
            </span>
            <strong>{t.name}</strong>
            <small>{t.mood}</small>
          </button>
        ))}
      </div>
      <label className="check-row">
        <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} />
        Recolor existing text and shapes
      </label>
      <button
        className="secondary full"
        disabled={inGroup}
        onClick={() => {
          const s = useEditor.getState();
          s.commit((doc) => {
            applyPageTheme(
              doc.pages.find((p) => p.id === s.pageId)!,
              theme,
              all,
            );
          });
          s.set({ toast: `${theme.name} applied. Locked objects and images are preserved.` });
        }}
      >
        Apply page look
      </button>
      <p className="small muted">
        One undo restores your previous colors. Uncheck recoloring to update only the background and
        theme-linked elements.
      </p>
    </section>
  );
}
