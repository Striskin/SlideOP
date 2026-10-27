import { useMemo, useState } from 'react';
import { ArrowUpRight, LayoutTemplate, LoaderCircle, Search } from 'lucide-react';
import { createLayout, layoutExamples, layoutPresets } from '../model/layouts';
import type { LayoutPreset } from '../model/layouts';
import { pageThemes } from '../model/themes';
import { insertBuiltPages } from '../services/layouts';
import { useEditor } from '../store/editor';
import { LayoutPreview } from './LayoutPreview';

export function LayoutsLibrary() {
  const [category, setCategory] = useState<LayoutPreset['category']>('Slides'),
    [theme, setTheme] = useState('studio'),
    [query, setQuery] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const layouts = useMemo(
    () =>
      layoutPresets
        .filter(
          (p) =>
            p.category === category &&
            `${p.name} ${p.description}`.toLowerCase().includes(query.toLowerCase()),
        )
        .map((p) => ({
          preset: p,
          page: createLayout(p.id, layoutExamples[p.id], theme),
        })),
    [category, theme, query],
  );
  return (
    <>
      <div className="layout-intro">
        <span className="eyebrow">A HEAD START, YOUR WAY</span>
        <h3>
          Good structure.
          <br />
          Endless possibilities.
        </h3>
        <p>Editable layouts for slides, documents, and everyday ideas.</p>
      </div>
      <label className="search-field">
        <Search size={16} />
        <input
          aria-label="Search layouts"
          placeholder="Find a layout"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="segmented-tabs" aria-label="Layout categories">
        {(['Slides', 'Documents', 'Social'] as const).map((c) => (
          <button key={c} aria-pressed={category === c} onClick={() => setCategory(c)}>
            {c}
          </button>
        ))}
      </div>
      <label className="stack-label">
        Layout color look
        <select value={theme} onChange={(e) => setTheme(e.target.value)}>
          {pageThemes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <div className="layout-cards">
        {layouts.map(({ preset, page }) => (
          <button
            className="layout-card"
            key={preset.id}
            disabled={busy}
            aria-label={`Add ${preset.name} layout`}
            onClick={() => {
              setBusy(true);
              setError('');
              void insertBuiltPages([createLayout(preset.id, layoutExamples[preset.id], theme)])
                .catch((e: unknown) =>
                  setError(e instanceof Error ? e.message : 'Could not create this layout.'),
                )
                .finally(() => setBusy(false));
            }}
          >
            <LayoutPreview page={page} />
            <span>
              <strong>{preset.name}</strong>
              <small>
                {preset.width} × {preset.height} · {preset.description}
              </small>
            </span>
            <LayoutTemplate size={16} />
          </button>
        ))}
      </div>
      {busy && (
        <p className="small muted" role="status">
          <LoaderCircle size={14} className="spin" />
          Preparing editable layout…
        </p>
      )}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {!layouts.length && <p className="tip">No matching layouts.</p>}
      <button className="secondary full" onClick={() => useEditor.getState().set({ tab: 'Build' })}>
        Build with your own content
        <ArrowUpRight size={15} />
      </button>
      <div className="community-note">
        <span className="pill">Community templates · Coming soon</span>
        <p>
          These built-in layouts are local and editable. Community publishing and browsing are still
          on the roadmap.
        </p>
      </div>
    </>
  );
}
