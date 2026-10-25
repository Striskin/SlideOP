import { useRef, useState } from 'react';
import {
  LayoutTemplate,
  Shapes,
  Type,
  Upload,
  Layers,
  Sparkles,
  Search,
  ChevronRight,
  ArrowUpRight,
  Plus,
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
} from 'lucide-react';
import type { Element } from '../model/document';
import { presets } from '../model/document';
import { useEditor } from '../store/editor';
import type { Tab } from '../store/editor';
import { assetList, assetURL, uploadAsset } from '../services/assets';
import { IconButton } from './ui';

const tabs = [
  { name: 'Design', icon: LayoutTemplate },
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
const shapes: { kind: Element['kind']; label: string; path: string }[] = [
  { kind: 'rect', label: 'Rectangle', path: 'M8 14h48v36H8z' },
  { kind: 'ellipse', label: 'Circle', path: 'M32 8a24 24 0 1 0 0 48a24 24 0 1 0 0-48' },
  { kind: 'triangle', label: 'Triangle', path: 'M32 8L59 54H5z' },
  { kind: 'line', label: 'Line', path: 'M7 32h50v2H7z' },
  { kind: 'arrow', label: 'Arrow', path: 'M6 25h31V12l23 20-23 20V39H6z' },
  { kind: 'polygon', label: 'Hexagon', path: 'M19 8h26l15 24-15 24H19L4 32z' },
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
              <Check size={16} className="purple" />
            ) : (
              <ChevronRight size={15} />
            )}
          </button>
        ))}
      </div>
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
function ElementsLibrary() {
  const [search, setSearch] = useState('');
  return (
    <>
      <label className="search-field">
        <Search size={16} />
        <input
          placeholder="Find a shape"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <div className="section-heading">
        <h3>Basic shapes</h3>
        <span>6</span>
      </div>
      <div className="shape-grid">
        {shapes
          .filter((s) => s.label.toLowerCase().includes(search.toLowerCase()))
          .map((shape) => (
            <button
              key={shape.kind}
              aria-label={`Add ${shape.label.toLowerCase()}`}
              title={`Add ${shape.label.toLowerCase()}`}
              onClick={() => useEditor.getState().add(shape.kind)}
            >
              <svg viewBox="0 0 64 64">
                <path d={shape.path} />
              </svg>
              <span>{shape.label}</span>
            </button>
          ))}
      </div>
      <div className="section-heading">
        <h3>A little more character</h3>
      </div>
      <div className="shape-grid">
        <button onClick={() => useEditor.getState().add('rect', { radius: 40 })}>
          <div className="shape-preview rounded" />
          <span>Rounded</span>
        </button>
        <button
          onClick={() => useEditor.getState().add('rect', { width: 180, height: 300, radius: 90 })}
        >
          <div className="shape-preview arch" />
          <span>Capsule</span>
        </button>
        <button
          onClick={() =>
            useEditor.getState().add('polygon', {
              width: 200,
              height: 200,
              points: Array.from({ length: 10 }, (_, i) => {
                const radius = i % 2 ? 45 : 100,
                  angle = -Math.PI / 2 + (i * Math.PI) / 5;
                return { x: 100 + Math.cos(angle) * radius, y: 100 + Math.sin(angle) * radius };
              }),
            })
          }
        >
          <span className="star-preview">★</span>
          <span>Star</span>
        </button>
      </div>
      <div className="tip">
        <MouseHint />
        Hold <kbd>Shift</kbd> to select multiple objects. Resize and rotate with the canvas handles.
      </div>
    </>
  );
}
function MouseHint() {
  return <span className="tip-icon">↖</span>;
}
function TextLibrary() {
  return (
    <>
      <button className="primary full" onClick={() => useEditor.getState().add('text')}>
        <Plus size={17} />
        Add a text box
      </button>
      <div className="section-heading">
        <h3>Start with the essentials</h3>
      </div>
      <div className="text-presets">
        <button
          className="text-heading"
          onClick={() =>
            useEditor
              .getState()
              .add('text', { text: 'Add a heading', fontSize: 72, fontWeight: 'bold', width: 700 })
          }
        >
          Add a heading
        </button>
        <button
          className="text-subheading"
          onClick={() =>
            useEditor.getState().add('text', { text: 'Add a subheading', fontSize: 36, width: 600 })
          }
        >
          Add a subheading
        </button>
        <button
          onClick={() =>
            useEditor
              .getState()
              .add('text', { text: 'A little bit of body text', fontSize: 22, width: 500 })
          }
        >
          A little bit of body text
        </button>
      </div>
      <div className="section-heading">
        <h3>Find your voice</h3>
        <Type size={16} />
      </div>
      <button
        className="type-card editorial"
        onClick={() =>
          useEditor.getState().add('text', {
            text: 'Less, but\nbetter.',
            fontFamily: 'Georgia',
            fontSize: 80,
            width: 600,
          })
        }
      >
        <span>THE EDITORIAL</span>
        <strong>
          Less, but
          <br />
          <em>better.</em>
        </strong>
        <ArrowUpRight size={20} />
      </button>
      <button
        className="type-card bold-type"
        onClick={() =>
          useEditor.getState().add('text', {
            text: 'MAKE\nYOUR MARK.',
            fontFamily: 'Impact',
            fontSize: 92,
            width: 650,
          })
        }
      >
        <span>THE STATEMENT</span>
        <strong>
          MAKE
          <br />
          YOUR MARK.
        </strong>
        <ArrowUpRight size={20} />
      </button>
      <p className="muted small">
        Double-click text on the canvas to edit. Select a text box to refine its typography.
      </p>
    </>
  );
}
function UploadsLibrary() {
  const input = useRef<HTMLInputElement>(null);
  const [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false);
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
      setRevision(revision + 1);
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
        <span>{assetList().length}</span>
      </div>
      <div className="asset-grid">
        {assetList().map((a) => (
          <button
            key={a.id}
            title={`Add ${a.name}`}
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
        ))}
      </div>
      <div className="tip">
        Images stay on this device. SVG and HTML uploads are intentionally blocked; use PNG, JPEG,
        or WebP.
      </div>
    </>
  );
}
function TemplatesLibrary() {
  return (
    <div className="coming-soon">
      <div className="template-art">
        <div />
        <div />
        <div />
        <Sparkles size={26} />
      </div>
      <span className="pill">A LITTLE SOMETHING IN THE WORKS</span>
      <h3>
        Made by people.
        <br />
        Remixed by you.
      </h3>
      <p>
        A community of ideas is on its way. Share what you create, discover new perspectives, and
        make them your own.
      </p>
      <div className="coming-label">
        <span className="status-dot" />
        Community templates · Coming soon
      </div>
      <p className="small muted">
        For now, every great design
        <br />
        starts with your imagination.
      </p>
      <button
        className="secondary full"
        onClick={() => useEditor.getState().set({ tab: 'Design' })}
      >
        Make something original
        <ArrowUpRight size={16} />
      </button>
    </div>
  );
}
function LayersLibrary() {
  const page = useEditor((s) => s.document.pages.find((p) => p.id === s.pageId)!),
    selection = useEditor((s) => s.selection);
  return (
    <>
      <p className="muted small">Front to back. Select a layer to fine-tune it.</p>
      <div className="layers-list">
        {[...page.elements].reverse().map((e) => (
          <div
            key={e.id}
            className={`layer-row ${selection.includes(e.id) ? 'selected' : ''}`}
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
              value={e.name}
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
