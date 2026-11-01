import { useMemo, useState } from 'react';
import { Grid2X2, LoaderCircle, Shuffle, Sparkles } from 'lucide-react';
import {
  createLayout,
  getLayout,
  layoutPresets,
  parseOutline,
  readLayoutContent,
  remixLayout,
  suggestLayout,
  themePairing,
} from '../model/layouts';
import type { LayoutId } from '../model/layouts';
import { getTheme, pageThemes } from '../model/themes';
import { insertBuiltPages, replaceWithRemix } from '../services/layouts';
import { finishTextEditing, repeatSelection, tidySelection } from '../canvas/commands';
import { useEditor } from '../store/editor';
import { LayoutPreview } from './LayoutPreview';
import { NumberField } from './ui';
import { PhotoGridBuilder } from './PhotoGridBuilder';

const sample = `# Ideas into motion
A small plan for making something meaningful.
---
# A clearer way forward
Three steps. One shared direction.
- Discover: Understand the problem before choosing a solution.
- Create: Give your strongest idea a tangible first form.
- Refine: Test, learn, and make the next version better.`;

export function BuildPanel() {
  const [outline, setOutline] = useState(sample),
    [mode, setMode] = useState<'auto' | LayoutId>('auto'),
    [themeId, setThemeId] = useState('studio');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [previewIndex, setPreviewIndex] = useState(0);
  const page = useEditor((s) => s.document.pages.find((p) => p.id === s.pageId)!),
    inGroup = useEditor((s) => s.scopePath.length > 0);
  const parsed = useMemo(() => {
    try {
      const contents = parseOutline(outline);
      return {
        pages: contents.map((content, index) =>
          createLayout(mode === 'auto' ? suggestLayout(content, index) : mode, content, themeId),
        ),
        error: '',
      };
    } catch (e) {
      return { pages: [], error: e instanceof Error ? e.message : 'Check your outline.' };
    }
  }, [outline, mode, themeId]);
  const preview = parsed.pages[Math.min(previewIndex, parsed.pages.length - 1)];
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not build this design.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="build-hero">
        <span className="eyebrow">
          <Sparkles size={13} /> REMIX STUDIO
        </span>
        <h3>
          Your words.
          <br />A world of layouts.
        </h3>
        <p>
          Turn a simple outline into editable pages. Try a different look whenever inspiration
          strikes.
        </p>
        <span className="local-build-tag">Built locally · No account needed</span>
      </div>
      <label className="stack-label">
        Design direction
        <select
          value={mode}
          onChange={(e) => {
            setMode(e.target.value as typeof mode);
            setPreviewIndex(0);
          }}
        >
          <option value="auto">Auto-select slide layouts</option>
          {(['Slides', 'Documents', 'Social'] as const).map((category) => (
            <optgroup key={category} label={category}>
              {layoutPresets
                .filter((p) => p.category === category)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </label>
      <label className="stack-label">
        Color & font pairing
        <select value={themeId} onChange={(e) => setThemeId(e.target.value)}>
          {pageThemes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <p className="small muted font-pairing">{themePairing(getTheme(themeId))}</p>
      <label className="stack-label">
        Your outline
        <textarea
          className="outline-input"
          aria-label="Your outline"
          value={outline}
          maxLength={60000}
          onChange={(e) => {
            setOutline(e.target.value);
            setPreviewIndex(0);
          }}
          rows={12}
        />
      </label>
      <p className="outline-help">
        Start each page with a title. Use <code>- Heading: detail</code> for up to six items.
        Separate pages with <code>---</code>. Your text is arranged as written.
      </p>
      {preview && (
        <div className="build-preview">
          <LayoutPreview page={preview} />
          <div>
            <span>
              {parsed.pages.length} {parsed.pages.length === 1 ? 'page' : 'pages'} ·{' '}
              {getLayout(preview.layout!.id).name}
            </span>
            <select
              aria-label="Preview built page"
              value={Math.min(previewIndex, parsed.pages.length - 1)}
              onChange={(e) => setPreviewIndex(Number(e.target.value))}
            >
              {parsed.pages.map((p, index) => (
                <option key={index} value={index}>
                  Page {index + 1}: {p.name.slice(0, 25)}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
      {parsed.error && (
        <p className="error-message" role="alert">
          {parsed.error}
        </p>
      )}
      <button
        className="primary full"
        disabled={busy || !parsed.pages.length}
        onClick={() =>
          void run(() => insertBuiltPages(parsed.pages.map((p) => structuredClone(p))))
        }
      >
        {busy ? <LoaderCircle className="spin" size={16} /> : <Sparkles size={16} />}Build{' '}
        {parsed.pages.length || ''} editable {parsed.pages.length === 1 ? 'page' : 'pages'}
      </button>
      {page.layout && (
        <section className="remix-current">
          <div className="section-heading">
            <h3>Remix this page</h3>
            <Shuffle size={16} />
          </div>
          <p className="small muted">
            Rearrange your current page with the selected layout and pairing. Edited text and custom
            additions stay with it. Undo restores the previous design.
          </p>
          <button
            className="secondary full"
            disabled={busy || inGroup}
            onClick={() =>
              void run(async () => {
                finishTextEditing();
                const current = useEditor
                  .getState()
                  .document.pages.find((p) => p.id === useEditor.getState().pageId)!;
                const content = readLayoutContent(current),
                  id = mode === 'auto' ? suggestLayout(content, 1) : mode;
                await replaceWithRemix(current, remixLayout(current, id, themeId));
              })
            }
          >
            Remix current page
          </button>
          <button
            className="text-button"
            onClick={() => {
              finishTextEditing();
              const current = useEditor
                .getState()
                .document.pages.find((p) => p.id === useEditor.getState().pageId)!;
              try {
                const c = readLayoutContent(current);
                setOutline(
                  `# ${c.title}\n${c.subtitle}\n${c.items.map((i) => `- ${i.heading}${i.body ? `: ${i.body}` : ''}`).join('\n')}`,
                );
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Could not read page content.');
              }
            }}
          >
            Load current page into outline
          </button>
        </section>
      )}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      <AutoArrangeTools />
      <PhotoGridBuilder themeId={themeId} />
    </>
  );
}

function AutoArrangeTools() {
  const count = useEditor((s) => s.selection.length);
  const [columns, setColumns] = useState(3),
    [rows, setRows] = useState(2),
    [gap, setGap] = useState(24);
  return (
    <section className="auto-arrange">
      <div className="section-heading">
        <h3>Arrange & repeat</h3>
        <Grid2X2 size={16} />
      </div>
      <p className="small muted">
        Turn a selection into a tidy grid, or repeat it into a pattern. Locked objects stay put.
      </p>
      <div className="field-grid">
        <NumberField label="Columns" value={columns} min={1} max={10} onChange={setColumns} />
        <NumberField label="Rows" value={rows} min={1} max={10} onChange={setRows} />
        <NumberField label="Grid gap" value={gap} min={0} max={500} onChange={setGap} />
      </div>
      <div className="two-buttons">
        <button
          className="secondary"
          disabled={count < 2}
          onClick={() => tidySelection(columns, gap)}
        >
          Tidy selection
        </button>
        <button
          className="secondary"
          disabled={!count || columns * rows <= 1}
          onClick={() => repeatSelection(columns, rows, gap)}
        >
          Repeat selection
        </button>
      </div>
      <p className="small muted">
        Tidy uses columns and gap. Repeat uses all three settings. Each action is one undo step.
      </p>
    </section>
  );
}
