import { useState } from 'react';
import { Images } from 'lucide-react';
import { useAssets } from '../hooks/useAssets';
import { assetURL, getAsset } from '../services/assets';
import { createPhotoGrid } from '../model/photoGrid';
import { insertBuiltPages } from '../services/layouts';
import { useEditor } from '../store/editor';
import { NumberField } from './ui';

export function PhotoGridBuilder({ themeId }: { themeId: string }) {
  const assets = useAssets(),
    page = useEditor((s) => s.document.pages.find((p) => p.id === s.pageId)!);
  const [selected, setSelected] = useState<string[]>([]),
    [columns, setColumns] = useState(3),
    [gap, setGap] = useState(20),
    [title, setTitle] = useState('A collection of moments'),
    [fit, setFit] = useState<'cover' | 'contain'>('cover'),
    [rounded, setRounded] = useState(true),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const chosen = selected.filter((id) => assets.some((a) => a.id === id));
  return (
    <section className="photo-grid-options">
      <div className="section-heading">
        <h3>Auto photo grid</h3>
        <Images size={17} />
      </div>
      <p className="small muted">
        Choose images in order. Build an editable gallery using this page's size and the color
        pairing above.
      </p>
      {!assets.length ? (
        <button
          className="secondary full"
          onClick={() => useEditor.getState().set({ tab: 'Uploads' })}
        >
          Upload photos to begin
        </button>
      ) : (
        <>
          <div className="photo-grid-picker" aria-label="Gallery images">
            {assets.map((asset) => (
              <button
                key={asset.id}
                aria-label={`Include ${asset.name} in gallery`}
                aria-pressed={chosen.includes(asset.id)}
                disabled={!chosen.includes(asset.id) && chosen.length >= 24}
                onClick={() =>
                  setSelected(
                    chosen.includes(asset.id)
                      ? chosen.filter((id) => id !== asset.id)
                      : [...chosen, asset.id],
                  )
                }
              >
                <img src={assetURL(asset.id)} alt={asset.name} loading="lazy" />
                {chosen.includes(asset.id) && <span>{chosen.indexOf(asset.id) + 1}</span>}
              </button>
            ))}
          </div>
          <div className="two-buttons">
            <button
              className="text-button"
              onClick={() => setSelected(assets.slice(0, 24).map((a) => a.id))}
            >
              Select first 24
            </button>
            <button
              className="text-button"
              disabled={!chosen.length}
              onClick={() => setSelected([])}
            >
              Clear selection
            </button>
          </div>
          <label className="stack-label">
            Gallery title
            <input
              aria-label="Gallery title"
              value={title}
              maxLength={100}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <div className="field-grid">
            <NumberField
              label="Gallery columns"
              value={columns}
              min={1}
              max={6}
              onChange={setColumns}
            />
            <NumberField label="Gallery gap" value={gap} min={0} max={120} onChange={setGap} />
          </div>
          <label className="stack-label">
            Image fitting
            <select value={fit} onChange={(e) => setFit(e.target.value as typeof fit)}>
              <option value="cover">Fill cells (center crop)</option>
              <option value="contain">Fit entire images</option>
            </select>
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={rounded}
              onChange={(e) => setRounded(e.target.checked)}
            />
            Rounded photo corners
          </label>
          <button
            className="primary full"
            disabled={busy || !chosen.length}
            onClick={() => {
              setBusy(true);
              setError('');
              const projectId = useEditor.getState().document.id;
              const images = chosen.map((id) => getAsset(id)).filter((a) => !!a);
              const grid = () =>
                createPhotoGrid(images, {
                  width: page.width,
                  height: page.height,
                  columns,
                  gap,
                  title,
                  themeId,
                  fit,
                  rounded,
                });
              void (async () => {
                try {
                  const next = grid();
                  if (projectId !== useEditor.getState().document.id)
                    throw new Error('The project changed. Build again.');
                  await insertBuiltPages([next]);
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Could not build this gallery.');
                } finally {
                  setBusy(false);
                }
              })();
            }}
          >
            Build photo grid{chosen.length ? ` (${chosen.length})` : ''}
          </button>
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
        </>
      )}
    </section>
  );
}
