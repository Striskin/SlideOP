import { useCallback, useEffect, useState } from 'react';
import { Check, Keyboard, X } from 'lucide-react';
import { useEditor } from './store/editor';
import { useProject } from './hooks/useProject';
import { useShortcuts } from './hooks/useShortcuts';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { Properties } from './components/Properties';
import { CanvasStage } from './components/CanvasStage';
import { PageStrip } from './components/PageStrip';
import { Dialogs } from './components/Dialogs';
import type { DialogName } from './components/Dialogs';
import { IconButton } from './components/ui';
import { CropOverlay } from './components/CropDialog';

export default function App() {
  useProject();
  useShortcuts();
  const theme = useEditor((s) => s.theme),
    rightOpen = useEditor((s) => s.rightOpen),
    toast = useEditor((s) => s.toast),
    ready = useEditor((s) => s.ready);
  const [dialog, setDialog] = useState<DialogName>(null);
  const close = useCallback(() => setDialog(null), []);
  useEffect(() => {
    try {
      if (localStorage.getItem('slideop-theme') === 'dark')
        useEditor.getState().set({ theme: 'dark' });
    } catch {
      /* Use the default theme when storage is unavailable. */
    }
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => useEditor.getState().set({ toast: '' }), 6000);
    return () => clearTimeout(timer);
  }, [toast]);
  return (
    <div className="app">
      <TopBar openDialog={setDialog} />
      <div className="editor-shell">
        <Sidebar />
        <div className="center-column">
          <CanvasStage />
          <PageStrip />
        </div>
        {rightOpen && <Properties onCheck={() => setDialog('checker')} />}
      </div>
      <footer className="app-footer">
        <span>
          <span className="footer-wordmark">SLIDEOP</span>
          <span className="footer-separator">/</span>Your ideas, beautifully made.
        </span>
        <div>
          <span>Private by design</span>
          <span className="footer-separator">·</span>
          <button onClick={() => setDialog('shortcuts')}>
            <Keyboard size={14} />
            Shortcuts
          </button>
          <span className="version-tag">v0.1</span>
        </div>
      </footer>
      <Dialogs name={dialog} onClose={close} />
      <CropOverlay />
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          <span>{toast}</span>
          <IconButton
            label="Dismiss notification"
            onClick={() => useEditor.getState().set({ toast: '' })}
          >
            <X size={16} />
          </IconButton>
        </div>
      )}
      {!ready && (
        <div className="loading-screen">
          <div className="loading-mark">S</div>
          <span>Opening your studio…</span>
        </div>
      )}
    </div>
  );
}
