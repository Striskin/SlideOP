import { useRef, useState } from 'react';
import {
  LayoutTemplate,
  Shapes,
  Type,
  Upload,
  Layers,
  Sparkles,
  ChevronRight,
  Eye,
  EyeOff,
  LockKeyhole,
  UnlockKeyhole,
  ArrowUp,
  ArrowDown,
  Image,
  Palette,
  Check,
  LayoutGrid,
  WandSparkles,
  Trash2,
  HardDrive,
} from 'lucide-react';
import { presets } from '../model/document';
import { useEditor } from '../store/editor';
import type { Tab } from '../store/editor';
import { assetURL, uploadAsset } from '../services/assets';
import type { UploadSummary } from '../services/persistence';
import { IconButton, Modal } from './ui';
import { useAssets } from '../hooks/useAssets';
import { deleteUpload } from '../hooks/useProject';
import { StoredUploadsDialog } from './StoredUploadsDialog';
import { ElementsLibrary } from './ElementsLibrary';
import { TextLibrary } from './TextLibrary';
import { StylesPanel } from './StylesPanel';
import { useEditingPage } from '../hooks/useEditingPage';
import { BuildPanel } from './BuildPanel';
import { LayoutsLibrary } from './LayoutsLibrary';
import { PageThemes } from './PageThemes';

const tabs = [
  { name: 'Design', icon: LayoutTemplate },
  { name: 'Build', icon: WandSparkles },
  { name: 'Elements', icon: Shapes },
  { name: 'Text', icon: Type },
  { name: 'Uploads', icon: Upload },
  { name: 'Templates', icon: LayoutGrid },
  { name: 'Layers', icon: Layers },
] as const;
const palettes = [
  ['#f8f5ef', '#34322e', '#b5a1df', '#f4a46e', '#4a5140'],
  ['#f4f7fb', '#24364b', '#80a3c4', '#d7e4ee', '#e4b3a4'],
  ['#fbf0ef', '#943f51', '#e48d98', '#efbdab', '#6c5c62'],
  ['#eeeee4', '#344333', '#9ca78a', '#d5c7a9', '#b06d4d'],
];
export function Sidebar() {
  const tab = useEditor((s) => s.tab),
    open = useEditor((s) => s.leftOpen);
  return (
    <>
      <nav className="tool-rail" aria-label="Editor tools">
        <div className="rail-tools">
          {tabs.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={tab === name && open ? 'selected' : ''}
              onClick={() =>
                useEditor
                  .getState()
                  .set({ tab: name as Tab, leftOpen: tab === name ? !open : true })
              }
            >
              <Icon size={21} strokeWidth={1.6} />
              <span>{name}</span>
              {name === 'Templates' && <i />}
            </button>
          ))}
        </div>
        <div className="rail-bottom">
          <div className="local-avatar" title="Your local workspace">
            Y
          </div>
        </div>
      </nav>
      {open && (
        <aside className="library-panel">
          <div className="panel-heading">
            <h2>{tab}</h2>
            {tab === 'Design' && <span className="tag">STUDIO</span>}
          </div>
          <div className="library-content">
            {tab === 'Design' ? (
              <DesignLibrary />
            ) : tab === 'Build' ? (
              <BuildPanel />
            ) : tab === 'Elements' ? (
              <ElementsLibrary />
            ) : tab === 'Text' ? (
              <TextLibrary />
            ) : tab === 'Uploads' ? (
              <UploadsLibrary />
            ) : tab === 'Layers' ? (
              <LayersLibrary />
            ) : (
              <TemplatesLibrary />
            )}
          </div>
        </aside>
      )}
    </>
  );
}
function DesignLibrary() {
  const page = useEditor((s) => s.document.pages.find((p) => p.id === s.pageId)!);
  return (
    <>
      <StylesPanel />
      <div className="creative-card">
        <span className="eyebrow">A SPACE TO CREATE</span>
        <h3>
          Good ideas
          <br />
          start here.
        </h3>
        <p>
          Big ambitions. Blank canvas.
          <br />
          Make it your own.
        </p>
        <div className="card-art">
          <i />
          <i />
          <i />
        </div>
      </div>
      <div className="section-heading">
        <h3>Canvas size</h3>
        <span>px</span>
      </div>
      <div className="preset-list">
        {presets.map((p, i) => (
          <button
            key={p.name}
            onClick={() => useEditor.getState().updatePage({ width: p.width, height: p.height })}
          >
            <span className={`preset-icon preset-${i}`}>
              <LayoutTemplate size={19} />
            </span>
            <span>
              <strong>{p.name}</strong>
              <small>{p.detail}</small>
            </span>
            {p.width === page.width && p.height === page.height ? (
              <Check size={16} className="accent-text" />
            ) : (
              <ChevronRight size={15} />
            )}
          </button>
        ))}
      </div>
      <PageThemes />
      <div className="section-heading">
        <h3>Color stories</h3>
        <Palette size={16} />
      </div>
      <p className="muted small">Select a color to change the page background.</p>
      <div className="palettes">
        {palettes.map((palette, i) => (
          <div key={i} className="palette">
            {palette.map((color) => (
              <button
                key={color}
                title={`Page color ${color}`}
                aria-label={`Page color ${color}`}
                style={{ background: color }}
                onClick={() => useEditor.getState().updatePage({ background: color })}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="library-note">
        <Sparkles size={16} />
        <span>
          Every tool. Every idea.
          <br />
          <strong>No subscription required.</strong>
        </span>
      </div>
    </>
  );
}
function UploadsLibrary() {
  const input = useRef<HTMLInputElement>(null);
  const assets = useAssets();
  const [busy, setBusy] = useState(false),
    [pending, setPending] = useState<UploadSummary | null>(null),
    [deleteError, setDeleteError] = useState(''),
    [manage, setManage] = useState(false);
  const add = async (files: FileList | null) => {
    if (!files) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const a = await uploadAsset(file),
          scale = Math.min(1, 500 / a.width, 500 / a.height);
        useEditor.getState().add('image', {
          assetId: a.id,
          name: a.name,
          width: a.width,
          height: a.height,
          scaleX: scale,
          scaleY: scale,
        });
      }
    } catch (error) {
      useEditor
        .getState()
        .set({ toast: error instanceof Error ? error.message : 'Upload failed.' });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };
  return (
    <>
      {manage && !pending && (
        <StoredUploadsDialog
          onClose={() => setManage(false)}
          onDelete={(asset) => {
            setDeleteError('');
            setPending(asset);
          }}
        />
      )}
      {pending && (
        <Modal
          title="Permanently delete upload?"
          onClose={() => {
            if (!busy) setPending(null);
          }}
        >
          <p>
            <strong>{pending.name}</strong>
            <br />
            {(pending.size / 1024).toFixed(1)} KB · {pending.width} × {pending.height}
          </p>
          <p>
            This deletes SlideOP's stored image and removes its placements from all local projects,
            saved versions, Trash, undo history, and the editor clipboard.
          </p>
          <p className="small muted">
            This cannot be undone. Your original file and previously downloaded exports are not
            deleted.
          </p>
          {deleteError && (
            <p className="error-message" role="alert">
              {deleteError}
            </p>
          )}
          <div className="two-buttons">
            <button className="secondary" disabled={busy} onClick={() => setPending(null)}>
              Keep upload
            </button>
            <button
              className="danger"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                setDeleteError('');
                void deleteUpload(pending.id)
                  .then(() => {
                    setPending(null);
                    useEditor
                      .getState()
                      .set({ toast: 'Upload permanently deleted from SlideOP storage.' });
                  })
                  .catch((error: unknown) =>
                    setDeleteError(
                      error instanceof Error ? error.message : 'Could not delete this upload.',
                    ),
                  )
                  .finally(() => setBusy(false));
              }}
            >
              {busy ? 'Deleting…' : 'Delete permanently'}
            </button>
          </div>
        </Modal>
      )}
      <input
        type="file"
        ref={input}
        hidden
        accept="image/png,image/jpeg,image/webp"
        multiple
        onChange={(e) => void add(e.target.files)}
      />
      <button className="primary full" disabled={busy} onClick={() => input.current?.click()}>
        <Upload size={17} />
        {busy ? 'Reading images…' : 'Upload images'}
      </button>
      <button
        className="secondary full manage-uploads-button"
        disabled={busy}
        onClick={() => setManage(true)}
      >
        <HardDrive size={16} />
        Manage stored uploads
      </button>
      <div className="cutout-note">
        <WandSparkles size={20} />
        <div>
          <strong>Background gone. Possibilities open.</strong>
          <p>
            Upload an image, select it, then choose <b>Remove background</b> in Image tools. Free,
            private, and on-device.
          </p>
        </div>
      </div>
      <div
        className="upload-drop"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void add(e.dataTransfer.files);
        }}
      >
        <div className="upload-icon">
          <Image size={28} />
        </div>
        <h3>Your images, your story.</h3>
        <p>
          Drop images here to make
          <br />
          something uniquely yours.
        </p>
        <span>PNG, JPG, WEBP · UP TO 25 MB</span>
      </div>
      <div className="section-heading">
        <h3>Your uploads</h3>
        <span>{assets.length}</span>
      </div>
      <div className="asset-grid">
        {assets.map((a) => (
          <div className="upload-asset" key={a.id}>
            <button
              className="asset-add"
              disabled={busy}
              title={`Add ${a.name}`}
              aria-label={`Add upload ${a.name}`}
              onClick={() => {
                const scale = Math.min(1, 500 / a.width, 500 / a.height);
                useEditor.getState().add('image', {
                  assetId: a.id,
                  name: a.name,
                  width: a.width,
                  height: a.height,
                  scaleX: scale,
                  scaleY: scale,
                });
              }}
            >
              <img src={assetURL(a.id)} alt={a.name} />
            </button>
            <div className="asset-caption">
              <span title={a.name}>{a.name}</span>
              <IconButton
                label={`Delete upload ${a.name}`}
                disabled={busy}
                onClick={() => {
                  setDeleteError('');
                  setPending({
                    id: a.id,
                    name: a.name,
                    width: a.width,
                    height: a.height,
                    size: a.blob.size,
                  });
                }}
              >
                <Trash2 size={15} />
              </IconButton>
            </div>
          </div>
        ))}
      </div>
      {!assets.length && <p className="small muted">No uploads in this project.</p>}
      <div className="tip">
        Images stay on this device. SVG and HTML uploads are intentionally blocked; use PNG, JPEG,
        or WebP.
      </div>
    </>
  );
}
function TemplatesLibrary() {
  return <LayoutsLibrary />;
}
function LayersLibrary() {
  const page = useEditingPage(),
    selection = useEditor((s) => s.selection);
  return (
    <>
      <p className="muted small">Front to back. Select a layer to fine-tune it.</p>
      <div className="layers-list">
        {[...page.elements].reverse().map((e) => (
          <div
            key={e.id}
            className={`layer-row ${selection.includes(e.id) ? 'selected' : ''}`}
            onDoubleClick={() => useEditor.getState().enterGroup(e.id)}
            onClick={(event) =>
              useEditor
                .getState()
                .select(event.shiftKey ? [...new Set([...selection, e.id])] : [e.id])
            }
          >
            <span className="layer-kind">
              {e.kind === 'text' ? (
                <Type size={15} />
              ) : e.kind === 'image' ? (
                <Image size={15} />
              ) : e.kind === 'group' ? (
                <Layers size={15} />
              ) : (
                <Shapes size={15} />
              )}
            </span>
            <input
              aria-label={`Rename ${e.name}`}
              title="Click to select. Double-click to rename."
              value={e.name}
              onMouseDown={(event) => {
                if (document.activeElement !== event.currentTarget) event.preventDefault();
              }}
              onDoubleClick={(event) => {
                event.stopPropagation();
                event.currentTarget.focus();
                event.currentTarget.select();
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur();
              }}
              onChange={(ev) => useEditor.getState().update([e.id], { name: ev.target.value })}
            />
            <IconButton
              label={e.visible ? 'Hide layer' : 'Show layer'}
              onClick={(event) => {
                event.stopPropagation();
                useEditor.getState().update([e.id], { visible: !e.visible });
              }}
            >
              {e.visible ? <Eye size={14} /> : <EyeOff size={14} />}
            </IconButton>
            <IconButton
              label={e.locked ? 'Unlock layer' : 'Lock layer'}
              onClick={(event) => {
                event.stopPropagation();
                useEditor.getState().update([e.id], { locked: !e.locked });
              }}
            >
              {e.locked ? <LockKeyhole size={14} /> : <UnlockKeyhole size={14} />}
            </IconButton>
          </div>
        ))}
      </div>
      {page.elements.length === 0 && (
        <div className="empty-state">
          <Layers size={30} />
          <h3>A clean slate.</h3>
          <p>
            Add text, shapes, or images.
            <br />
            Your layers will appear here.
          </p>
        </div>
      )}
      {selection.length === 1 && (
        <div className="layer-order">
          <button
            className="secondary"
            onClick={() => useEditor.getState().reorder(selection[0], 1)}
          >
            <ArrowUp size={16} />
            Forward
          </button>
          <button
            className="secondary"
            onClick={() => useEditor.getState().reorder(selection[0], -1)}
          >
            <ArrowDown size={16} />
            Backward
          </button>
        </div>
      )}
    </>
  );
}
