import { useRef, useState } from 'react';
import {
  Undo2,
  Redo2,
  Play,
  ArrowDownToLine,
  ChevronDown,
  Check,
  LoaderCircle,
  CloudOff,
  FolderOpen,
  Plus,
  Upload,
  Keyboard,
  Moon,
  Sun,
  Save,
  FileJson,
} from 'lucide-react';
import { useEditor } from '../store/editor';
import { importProject, exportProject } from '../services/persistence';
import { persistCurrent } from '../hooks/useProject';
import type { DialogName } from './Dialogs';
import { IconButton } from './ui';

export function TopBar({ openDialog }: { openDialog: (name: DialogName) => void }) {
  const name = useEditor((s) => s.document.name),
    saved = useEditor((s) => s.saved),
    theme = useEditor((s) => s.theme),
    canUndo = useEditor((s) => s.past.length > 0),
    canRedo = useEditor((s) => s.future.length > 0);
  const [menu, setMenu] = useState(false),
    [editing, setEditing] = useState(false),
    [draft, setDraft] = useState(name);
  const input = useRef<HTMLInputElement>(null);
  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      if (!(await persistCurrent())) return;
      const doc = await importProject(file);
      useEditor.getState().load(doc);
      useEditor.getState().set({ saved: 'saving', toast: 'Project imported. Make it your own.' });
    } catch (error) {
      useEditor.getState().set({
        toast:
          error instanceof Error
            ? `Import failed: ${error.message.slice(0, 220)}`
            : 'This project could not be imported.',
      });
    } finally {
      if (input.current) input.current.value = '';
    }
  };
  return (
    <header className="topbar">
      <button className="brand" title="Open local projects" onClick={() => openDialog('projects')}>
        <span className="brand-mark">
          <i />
          <i />
          <i />
        </span>
        <strong>
          slide<span>op</span>
        </strong>
      </button>
      <div className="file-menu-wrap">
        <button className="file-menu-button" aria-expanded={menu} onClick={() => setMenu(!menu)}>
          File
          <ChevronDown size={13} />
        </button>
        {menu && (
          <>
            <div className="menu-dismiss" onClick={() => setMenu(false)} />
            <div className="file-menu" onClick={() => setMenu(false)}>
              <button
                onClick={() => {
                  void persistCurrent().then((saved) => {
                    if (saved) useEditor.getState().newProject();
                  });
                }}
              >
                <Plus size={16} />
                New design
              </button>
              <button onClick={() => openDialog('projects')}>
                <FolderOpen size={16} />
                Local projects
              </button>
              <button onClick={() => input.current?.click()}>
                <Upload size={16} />
                Import SlideOP file
              </button>
              <button
                onClick={() =>
                  void exportProject(useEditor.getState().document).catch(() =>
                    useEditor.getState().set({ toast: 'Project export failed.' }),
                  )
                }
              >
                <FileJson size={16} />
                Export editable project
              </button>
              <hr />
              <button onClick={() => openDialog('shortcuts')}>
                <Keyboard size={16} />
                Keyboard shortcuts
              </button>
            </div>
          </>
        )}
      </div>
      <span className="toolbar-divider" />
      <div className="project-title">
        {editing ? (
          <input
            aria-label="Project name"
            autoFocus
            value={draft}
            maxLength={200}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              if (draft.trim())
                useEditor.getState().commit((d) => {
                  d.name = draft.trim();
                });
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') setEditing(false);
            }}
          />
        ) : (
          <button
            title="Rename project"
            onClick={() => {
              setDraft(name);
              setEditing(true);
            }}
          >
            {name}
            <ChevronDown size={13} />
          </button>
        )}
        <span className="project-type">Presentation · Personal workspace</span>
      </div>
      <button
        className={`save-state ${saved === 'error' ? 'error' : ''}`}
        onClick={() => void persistCurrent()}
        title="Save locally (Ctrl S)"
      >
        {saved === 'saved' ? (
          <Check size={14} />
        ) : saved === 'saving' ? (
          <LoaderCircle size={14} className="spin" />
        ) : (
          <CloudOff size={14} />
        )}
        <span>
          {saved === 'saved' ? 'Saved locally' : saved === 'saving' ? 'Saving…' : 'Save failed'}
        </span>
      </button>
      <div className="topbar-actions">
        <div className="history-actions">
          <IconButton
            label="Undo (Ctrl Z)"
            disabled={!canUndo}
            onClick={() => useEditor.getState().undo()}
          >
            <Undo2 size={18} />
          </IconButton>
          <IconButton
            label="Redo (Ctrl Shift Z)"
            disabled={!canRedo}
            onClick={() => useEditor.getState().redo()}
          >
            <Redo2 size={18} />
          </IconButton>
        </div>
        <span className="toolbar-divider" />
        <IconButton
          label="Save project"
          className="compact-save"
          onClick={() => void persistCurrent()}
        >
          <Save size={17} />
        </IconButton>
        <IconButton
          label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
          onClick={() => {
            const next = theme === 'light' ? 'dark' : 'light';
            useEditor.getState().set({ theme: next });
            try {
              localStorage.setItem('slideop-theme', next);
            } catch {
              /* Theme persistence is optional. */
            }
          }}
        >
          {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
        </IconButton>
        <button className="secondary preview-button" onClick={() => openDialog('preview')}>
          <Play size={15} />
          Preview
        </button>
        <button className="primary export-button" onClick={() => openDialog('export')}>
          <ArrowDownToLine size={16} />
          Export
          <ChevronDown size={13} />
        </button>
      </div>
      <input
        ref={input}
        type="file"
        hidden
        accept=".slideop,.json"
        onChange={(e) => void importFile(e.target.files?.[0])}
      />
    </header>
  );
}
