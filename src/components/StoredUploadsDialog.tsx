import { useEffect, useState } from 'react';
import { HardDrive, Trash2 } from 'lucide-react';
import { listStoredUploads } from '../services/persistence';
import type { UploadSummary } from '../services/persistence';
import { assetList } from '../services/assets';
import { Modal, IconButton } from './ui';

export function StoredUploadsDialog({
  onClose,
  onDelete,
}: {
  onClose: () => void;
  onDelete: (upload: UploadSummary) => void;
}) {
  const [uploads, setUploads] = useState<UploadSummary[]>([]),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    void listStoredUploads()
      .then((stored) => {
        if (!alive) return;
        const merged = new Map(stored.map((asset) => [asset.id, asset]));
        for (const asset of assetList())
          merged.set(asset.id, {
            id: asset.id,
            name: asset.name,
            width: asset.width,
            height: asset.height,
            size: asset.blob.size,
          });
        setUploads([...merged.values()].sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => {
        if (alive) setError('Could not read stored uploads.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);
  return (
    <Modal title="Stored uploads" onClose={onClose}>
      <p className="muted">
        Images stored by SlideOP in this browser, including older projects and unused stored copies.
        Delete an image to remove it permanently from SlideOP.
      </p>
      <div className="stored-upload-total">
        <HardDrive size={17} />
        {uploads.length} images ·{' '}
        {(uploads.reduce((sum, asset) => sum + asset.size, 0) / 1024 / 1024).toFixed(2)} MB
      </div>
      <div className="stored-upload-list">
        {uploads.map((asset) => (
          <div className="stored-upload-row" key={asset.id}>
            <div>
              <strong>{asset.name}</strong>
              <small>
                {asset.width} × {asset.height} · {(asset.size / 1024).toFixed(1)} KB
              </small>
            </div>
            <IconButton
              label={`Delete stored upload ${asset.name}`}
              onClick={() => onDelete(asset)}
            >
              <Trash2 size={16} />
            </IconButton>
          </div>
        ))}
      </div>
      {loading && (
        <p role="status" className="small muted">
          Reading local storage…
        </p>
      )}
      {!loading && !uploads.length && <p className="small muted">No stored uploads.</p>}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      <p className="small muted">
        Original files on your laptop and downloaded exports are outside SlideOP's browser storage.
      </p>
    </Modal>
  );
}
