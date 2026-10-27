import { useEffect, useState } from 'react';
import {
  ArrowDownToLine,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  FileImage,
  FileJson,
  FolderOpen,
  Plus,
  Trash2,
  Keyboard,
  LoaderCircle,
  Sparkles,
} from 'lucide-react';
import { Modal, IconButton } from './ui';
import { useEditor, currentPage } from '../store/editor';
import { exportDesign } from '../services/export';
import type { ExportFormat } from '../services/export';
import {
  deleteProject,
  exportProject,
  listProjects,
  restoreProject,
} from '../services/persistence';
import { persistCurrent } from '../hooks/useProject';
import { checkPage } from '../services/checker';
import type { Warning } from '../services/checker';
import type { DesignDocument } from '../model/document';
import { renderPage } from '../canvas/adapter';
import { PageThumbnail } from './PageStrip';
import { RecoveryPanel } from './RecoveryPanel';

export type DialogName = 'export' | 'preview' | 'projects' | 'checker' | 'shortcuts' | null;
export function Dialogs({ name, onClose }: { name: DialogName; onClose: () => void }) {
  if (name === 'export') return <ExportDialog onClose={onClose} />;
  if (name === 'preview') return <PreviewDialog onClose={onClose} />;
  if (name === 'projects') return <ProjectsDialog onClose={onClose} />;
  if (name === 'checker') return <CheckerDialog onClose={onClose} />;
  if (name === 'shortcuts')
    return (
      <Modal title="A faster way to create" onClose={onClose}>
        <div className="shortcuts-intro">
          <Keyboard size={24} />
          <p>
            Your favorite tools, just a keystroke away.
            <br />
            Use ⌘ in place of Ctrl on a Mac.
          </p>
        </div>
        <div className="shortcut-list">
          {[
            ['Undo / Redo', 'Ctrl Z / Ctrl Shift Z'],
            ['Save locally', 'Ctrl S'],
            ['Copy / Cut / Paste', 'Ctrl C / X / V'],
            ['Duplicate', 'Ctrl D'],
            ['Select all', 'Ctrl A'],
            ['Group / Ungroup', 'Ctrl G / Ctrl Shift G'],
            ['Delete selection', 'Delete'],
            ['Nudge / Large nudge', 'Arrows / Shift Arrows'],
            ['Select / Hand tool', 'V / H'],
            ['Pan temporarily', 'Hold Space'],
            ['Text / Rectangle / Circle', 'T / R / O'],
            ['Zoom', 'Ctrl + Scroll'],
            ['Multi-select', 'Shift + Click'],
            ['Clear selection', 'Esc'],
          ].map(([label, key]) => (
            <div key={label}>
              <span>{label}</span>
              <kbd>{key}</kbd>
            </div>
          ))}
        </div>
      </Modal>
    );
  return null;
}
function ExportDialog({ onClose }: { onClose: () => void }) {
  const [format, setFormat] = useState<ExportFormat | 'slideop'>('png'),
    [scale, setScale] = useState(1),
    [transparent, setTransparent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const run = async () => {
    setBusy(true);
    setError('');
    try {
      const doc = useEditor.getState().document;
      if (format === 'slideop') await exportProject(doc);
      else
        await exportDesign(
          doc,
          doc.pages.find((p) => p.id === useEditor.getState().pageId)!,
          format,
          scale,
          transparent,
        );
      useEditor.getState().set({ toast: 'Your export is ready.' });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed. Try a smaller scale.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="Made something good? Take it with you." onClose={onClose}>
      <p className="muted">High quality. No watermarks. Always yours.</p>
      <label className="stack-label">
        File type
        <select value={format} onChange={(e) => setFormat(e.target.value as typeof format)}>
          <option value="png">PNG · Crisp images, transparency support</option>
          <option value="jpeg">JPG · Small file, easy to share</option>
          <option value="pdf">PDF · All pages, ready to present</option>
          <option value="svg">SVG · Editable vector export</option>
          <option value="slideop">SlideOP · Complete editable project</option>
        </select>
      </label>
      {!['svg', 'slideop'].includes(format) && (
        <label className="stack-label">
          Resolution
          <select value={scale} onChange={(e) => setScale(Number(e.target.value))}>
            <option value="1">1× · Original size</option>
            <option value="2">2× · High resolution</option>
            <option value="3">3× · Extra high resolution</option>
          </select>
        </label>
      )}
      {format === 'png' && (
        <label className="check-row export-transparent">
          <input
            type="checkbox"
            checked={transparent}
            onChange={(e) => setTransparent(e.target.checked)}
          />
          Transparent background
        </label>
      )}
      <div className="export-info">
        {format === 'slideop' ? <FileJson size={22} /> : <FileImage size={22} />}
        <span>
          {format === 'pdf'
            ? 'All pages are included. PDF pages are rasterized.'
            : format === 'slideop'
              ? 'All pages, layers, and original image assets are included.'
              : format === 'svg'
                ? 'Current page. Text stays editable; fonts must be installed on the destination device. Images are embedded.'
                : 'Exports the current page. To export all pages together, choose PDF.'}
        </span>
      </div>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      <button className="primary full" disabled={busy} onClick={() => void run()}>
        {busy ? <LoaderCircle size={18} className="spin" /> : <ArrowDownToLine size={18} />}{' '}
        {busy ? 'Preparing your export…' : 'Download design'}
      </button>
    </Modal>
  );
}
function PreviewDialog({ onClose }: { onClose: () => void }) {
  const pages = useEditor((s) => s.document.pages);
  const [index, setIndex] = useState(pages.findIndex((p) => p.id === useEditor.getState().pageId)),
    [image, setImage] = useState('');
  useEffect(() => {
    let alive = true;
    setImage('');
    void renderPage(pages[index], 1600)
      .then((url) => {
        if (alive) setImage(url);
      })
      .catch(() => useEditor.getState().set({ toast: 'Preview could not be rendered.' }));
    return () => {
      alive = false;
    };
  }, [pages, index]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(pages.length - 1, i + 1));
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [pages.length]);
  return (
    <Modal title="Presentation preview" wide onClose={onClose}>
      <div className="presentation-preview">
        {image ? <img src={image} alt={pages[index].name} /> : <LoaderCircle className="spin" />}
      </div>
      <div className="preview-navigation">
        <IconButton
          label="Previous slide"
          disabled={index === 0}
          onClick={() => setIndex(index - 1)}
        >
          <ChevronLeft size={20} />
        </IconButton>
        <span>
          {index + 1} / {pages.length}
        </span>
        <IconButton
          label="Next slide"
          disabled={index === pages.length - 1}
          onClick={() => setIndex(index + 1)}
        >
          <ChevronRight size={20} />
        </IconButton>
      </div>
    </Modal>
  );
}
function ProjectsDialog({ onClose }: { onClose: () => void }) {
  const [refresh, setRefresh] = useState(0);
  const [projects, setProjects] = useState<DesignDocument[]>([]),
    [error, setError] = useState(''),
    [confirm, setConfirm] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    void persistCurrent()
      .then(() => listProjects())
      .then(setProjects)
      .catch(() => setError('Could not read local projects.'));
  }, [refresh]);
  const open = async (id: string) => {
    setBusy(true);
    try {
      if (!(await persistCurrent())) return;
      const doc = await restoreProject(id);
      if (doc) {
        useEditor.getState().load(doc);
        onClose();
      }
    } catch {
      setError('Could not open this project. The saved copy has been kept.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="Your local workspace" wide onClose={onClose}>
      <div className="projects-heading">
        <p className="muted">
          Saved in this browser, on this device.
          <br />
          Export a SlideOP file to keep a portable backup.
        </p>
        <button
          className="primary"
          disabled={busy}
          onClick={() => {
            void persistCurrent().then((saved) => {
              if (saved) {
                useEditor.getState().newProject();
                onClose();
              }
            });
          }}
        >
          <Plus size={17} />
          New design
        </button>
      </div>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      <div className="projects-grid">
        {projects.map((project) => (
          <div className="project-card" key={project.id}>
            <button disabled={busy} className="project-cover" onClick={() => void open(project.id)}>
              <PageThumbnail page={project.pages[0]} stored />
            </button>
            <div>
              <button className="text-button" disabled={busy} onClick={() => void open(project.id)}>
                <FolderOpen size={15} />
                <strong>{project.name}</strong>
              </button>
              <IconButton
                label={`Delete ${project.name}`}
                disabled={busy}
                onClick={() => setConfirm(project.id)}
              >
                <Trash2 size={15} />
              </IconButton>
            </div>
            <small>
              {project.pages.length} {project.pages.length === 1 ? 'page' : 'pages'} ·{' '}
              {new Date(project.updatedAt).toLocaleDateString()}
            </small>
            {confirm === project.id && (
              <div className="delete-confirm">
                <span>Move this project to Trash?</span>
                <button
                  className="danger"
                  onClick={() => {
                    setBusy(true);
                    void persistCurrent()
                      .then(async (saved) => {
                        if (!saved) throw new Error('Save failed');
                        await deleteProject(project.id);
                        if (useEditor.getState().document.id === project.id)
                          useEditor.getState().newProject();
                      })
                      .then(() => {
                        setProjects(projects.filter((p) => p.id !== project.id));
                        setConfirm(null);
                        setRefresh((v) => v + 1);
                      })
                      .catch(() => setError('Could not move project to Trash.'))
                      .finally(() => setBusy(false));
                  }}
                  disabled={busy}
                >
                  Delete
                </button>
                <button onClick={() => setConfirm(null)}>Keep</button>
              </div>
            )}
          </div>
        ))}
      </div>
      <RecoveryPanel
        refresh={refresh}
        onRefresh={() => setRefresh((v) => v + 1)}
        busy={busy}
        setBusy={setBusy}
      />
    </Modal>
  );
}
function CheckerDialog({ onClose }: { onClose: () => void }) {
  const [warnings, setWarnings] = useState<Warning[]>([]),
    [busy, setBusy] = useState(true),
    [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    void checkPage(currentPage())
      .then((result) => {
        if (alive) setWarnings(result);
      })
      .catch(() => {
        if (alive) setError('Could not inspect this page. Try reopening the project.');
      })
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
    };
  }, []);
  return (
    <Modal title="A second pair of eyes" onClose={onClose}>
      <div className="checker-summary">
        {busy ? (
          <LoaderCircle size={28} className="spin" />
        ) : warnings.length ? (
          <Sparkles size={28} />
        ) : (
          <CheckCircle2 size={28} />
        )}
        <div>
          <h3>
            {busy
              ? 'Looking over your page…'
              : warnings.length
                ? `${warnings.length} things to take a look at`
                : 'Looking good.'}
          </h3>
          <p>Slide Checker · Current page</p>
        </div>
      </div>
      <p className="small muted">
        Suggestions, not rules. Checks page boundaries, text box overflow, text overlap, near
        alignment, and text contrast against the page background. Intentional layering, groups,
        image backgrounds, and rotated text may need a human eye.
      </p>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      <div className="warning-list">
        {warnings.map((w, i) => (
          <button
            key={i}
            onClick={() => {
              useEditor.getState().select([w.id]);
              onClose();
            }}
          >
            <AlertTriangle size={18} />
            <span>
              <strong>{w.title}</strong>
              <small>{w.detail}</small>
            </span>
            <ChevronRight size={17} />
          </button>
        ))}
      </div>
      {!busy && !warnings.length && (
        <p className="checker-success">No issues found by the basic checks. Keep creating.</p>
      )}
    </Modal>
  );
}
