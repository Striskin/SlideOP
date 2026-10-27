import { useEffect, useState } from 'react';
import { ArchiveRestore, History, Download, HardDrive } from 'lucide-react';
import {
  createVersion,
  exportProject,
  listTrash,
  listVersions,
  restoreTrash,
  restoreVersion,
} from '../services/persistence';
import type { ProjectVersion, TrashedProject } from '../services/persistence';
import { persistCurrent } from '../hooks/useProject';
import { useEditor } from '../store/editor';

export function RecoveryPanel({
  refresh,
  onRefresh,
  busy,
  setBusy,
}: {
  refresh: number;
  onRefresh: () => void;
  busy: boolean;
  setBusy: (value: boolean) => void;
}) {
  const projectId = useEditor((s) => s.document.id);
  const [tab, setTab] = useState<'versions' | 'trash'>('versions');
  const [versions, setVersions] = useState<ProjectVersion[]>([]),
    [trash, setTrash] = useState<TrashedProject[]>([]);
  const [error, setError] = useState(''),
    [label, setLabel] = useState('');
  const [storage, setStorage] = useState<StorageEstimate>();
  const [confirm, setConfirm] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void Promise.all([
      listVersions(projectId),
      listTrash(),
      navigator.storage?.estimate().catch(() => undefined),
    ])
      .then(([v, t, estimate]) => {
        if (alive) {
          setVersions(v);
          setTrash(t);
          setStorage(estimate);
        }
      })
      .catch(() => {
        if (alive) setError('Could not read recovery data.');
      });
    return () => {
      alive = false;
    };
  }, [projectId, refresh]);
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await action();
      onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The recovery operation failed.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="recovery-panel">
      <div className="section-heading">
        <h3>
          <History size={17} /> Recovery & backups
        </h3>
        <span className="storage-label">
          <HardDrive size={14} />
          {storage?.usage !== undefined
            ? `${(storage.usage / 1024 / 1024).toFixed(1)} MB used`
            : 'Browser storage'}
        </span>
      </div>
      <p className="small muted">
        Up to 20 versions per project, with automatic checkpoints at five-minute intervals when
        editing. Trash and versions stay in this browser. Download a backup for protection if
        browser data is cleared.
      </p>
      <div className="two-buttons">
        <button
          className={`secondary ${tab === 'versions' ? 'active' : ''}`}
          aria-pressed={tab === 'versions'}
          onClick={() => setTab('versions')}
        >
          Current project versions
        </button>
        <button
          className={`secondary ${tab === 'trash' ? 'active' : ''}`}
          aria-pressed={tab === 'trash'}
          onClick={() => setTab('trash')}
        >
          Trash ({trash.length})
        </button>
      </div>
      {tab === 'versions' ? (
        <>
          <div className="checkpoint-form">
            <input
              aria-label="Version label"
              maxLength={100}
              placeholder="Name this version (optional)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            <button
              className="secondary"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  if (!(await persistCurrent()))
                    throw new Error('Save failed. Export a backup before continuing.');
                  await createVersion(
                    useEditor.getState().document,
                    label.trim() || 'Manual checkpoint',
                  );
                  setLabel('');
                })
              }
            >
              Save version
            </button>
            <button
              className="secondary"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  if (!(await persistCurrent()))
                    throw new Error('Save failed. Use File > Export to download the open project.');
                  await exportProject(useEditor.getState().document);
                })
              }
            >
              <Download size={15} />
              Backup file
            </button>
          </div>
          <div className="recovery-list">
            {versions.map((version) => (
              <div className="recovery-row" key={version.id}>
                <div>
                  <strong>{version.label}</strong>
                  <small>
                    {new Date(version.createdAt).toLocaleString()} · {version.document.pages.length}{' '}
                    pages
                  </small>
                </div>
                {confirm === version.id ? (
                  <div>
                    <span className="small">
                      Replace the open project? Its current version will be saved.
                    </span>
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          if (!(await persistCurrent()))
                            throw new Error('Could not save current work. Restore cancelled.');
                          const doc = await restoreVersion(version.id);
                          useEditor.getState().load(doc);
                          setConfirm(null);
                        })
                      }
                    >
                      Restore version
                    </button>
                    <button className="text-button" onClick={() => setConfirm(null)}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() => setConfirm(version.id)}
                  >
                    Restore
                  </button>
                )}
              </div>
            ))}
          </div>
          {!versions.length && (
            <p className="tip">
              No saved versions yet. Save a checkpoint before making a big change.
            </p>
          )}
        </>
      ) : (
        <div className="recovery-list">
          {trash.map((item) => (
            <div className="recovery-row" key={item.id}>
              <div>
                <strong>{item.document.name}</strong>
                <small>Deleted {new Date(item.deletedAt).toLocaleString()}</small>
              </div>
              <button
                className="secondary"
                disabled={busy}
                onClick={() => void run(() => restoreTrash(item.id))}
              >
                <ArchiveRestore size={15} />
                Recover project
              </button>
            </div>
          ))}
          {!trash.length && (
            <p className="tip">Trash is empty. Deleted projects can be recovered here.</p>
          )}
        </div>
      )}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
