import { useEffect, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import type { PointerEvent } from 'react';
import type { Element } from '../model/document';
import { canCrop, constrainCrop, cropPatch, ratioCrop } from '../model/crop';
import type { CropRect } from '../model/crop';
import { assetURL, getAsset } from '../services/assets';
import { useEditor } from '../store/editor';
import { Modal, NumberField } from './ui';
import { renderCropSource } from '../canvas/adapter';
import { useEditingPage } from '../hooks/useEditingPage';

type CropSource = { url: string; width: number; height: number };

export function CropOverlay() {
  const cropId = useEditor((s) => s.cropId),
    page = useEditingPage();
  const element = page.elements.find((e) => e.id === cropId);
  if (!element || !canCrop(element) || (element.kind === 'image' && !getAsset(element.assetId!)))
    return null;
  return (
    <CropDialog
      key={element.id}
      element={element}
      onClose={() => useEditor.getState().set({ cropId: null })}
    />
  );
}

export function CropDialog({ element, onClose }: { element: Element; onClose: () => void }) {
  const [source, setSource] = useState<CropSource | null>(null),
    [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    setSource(null);
    setError('');
    if (element.kind === 'image') {
      const asset = getAsset(element.assetId!);
      if (asset) setSource({ url: assetURL(asset.id), width: asset.width, height: asset.height });
      else setError('The source image is no longer available.');
    } else {
      void renderCropSource(element)
        .then((preview) => {
          if (alive) setSource(preview);
        })
        .catch(() => {
          if (alive) setError('Could not prepare this element for cropping.');
        });
    }
    return () => {
      alive = false;
    };
  }, [element]);
  if (!source)
    return (
      <Modal
        title={element.kind === 'image' ? 'Crop image' : 'Crop element'}
        wide
        onClose={onClose}
      >
        {error ? (
          <p className="error-message" role="alert">
            {error}
          </p>
        ) : (
          <p role="status">
            <LoaderCircle size={18} className="spin" />
            Preparing crop preview…
          </p>
        )}
      </Modal>
    );
  return <CropEditor element={element} source={source} onClose={onClose} />;
}

function CropEditor({
  element,
  source: asset,
  onClose,
}: {
  element: Element;
  source: CropSource;
  onClose: () => void;
}) {
  const image = element.kind === 'image';
  const [rect, setRect] = useState<CropRect>(
    image
      ? {
          x: element.cropX ?? 0,
          y: element.cropY ?? 0,
          width: element.width,
          height: element.height,
        }
      : constrainCrop(
          element.clip ?? { x: 0, y: 0, width: asset.width, height: asset.height },
          asset.width,
          asset.height,
        ),
  );
  const [ratio, setRatio] = useState(0);
  const surface = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    x: number;
    y: number;
    rect: CropRect;
    corner: string;
    scale: number;
  } | null>(null);
  const start = (e: PointerEvent<HTMLDivElement | HTMLButtonElement>, corner: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      rect,
      corner,
      scale: asset.width / surface.current!.getBoundingClientRect().width,
    };
  };
  const move = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.x) * d.scale,
      dy = (e.clientY - d.y) * d.scale;
    if (d.corner === 'move') {
      setRect(
        constrainCrop({ ...d.rect, x: d.rect.x + dx, y: d.rect.y + dy }, asset.width, asset.height),
      );
      return;
    }
    const west = d.corner.includes('w'),
      north = d.corner.includes('n');
    const anchorX = west ? d.rect.x + d.rect.width : d.rect.x;
    const anchorY = north ? d.rect.y + d.rect.height : d.rect.y;
    const maxW = west ? anchorX : asset.width - anchorX;
    const maxH = north ? anchorY : asset.height - anchorY;
    let w = Math.max(1, Math.min(maxW, d.rect.width + (west ? -dx : dx)));
    let h = Math.max(1, Math.min(maxH, d.rect.height + (north ? -dy : dy)));
    if (ratio) {
      w = Math.min(w, maxH * ratio);
      h = w / ratio;
    }
    setRect({
      x: west ? anchorX - w : anchorX,
      y: north ? anchorY - h : anchorY,
      width: w,
      height: h,
    });
  };
  return (
    <Modal title={image ? 'Crop image' : 'Crop element'} wide onClose={onClose}>
      <p className="muted">
        Drag the crop window to reframe. Drag a corner to resize.{' '}
        {image
          ? 'Your source image stays intact.'
          : 'Hidden areas are preserved so your element stays editable.'}
      </p>
      <div
        className="crop-surface"
        ref={surface}
        style={{
          aspectRatio: `${asset.width} / ${asset.height}`,
          maxWidth: Math.min(680, (400 * asset.width) / asset.height),
        }}
      >
        <img
          src={asset.url}
          alt={image ? 'Full source image' : 'Full element before cropping'}
          draggable={false}
        />
        <div
          className="crop-window"
          style={{
            left: `${(rect.x / asset.width) * 100}%`,
            top: `${(rect.y / asset.height) * 100}%`,
            width: `${(rect.width / asset.width) * 100}%`,
            height: `${(rect.height / asset.height) * 100}%`,
          }}
          onPointerDown={(e) => start(e, 'move')}
          onPointerMove={move}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
        >
          <div className="crop-thirds" />
          {['nw', 'ne', 'sw', 'se'].map((corner) => (
            <button
              key={corner}
              className={`crop-handle ${corner}`}
              aria-label={`Crop ${corner} corner`}
              onPointerDown={(e) => start(e, corner)}
            />
          ))}
        </div>
      </div>
      <label className="stack-label">
        Aspect ratio
        <select
          value={ratio}
          onChange={(e) => {
            const value = Number(e.target.value);
            setRatio(value);
            if (value) setRect(ratioCrop(rect, value, asset.width, asset.height));
          }}
        >
          <option value={0}>Freeform</option>
          <option value={image ? element.width / element.height : asset.width / asset.height}>
            Current frame
          </option>
          <option value={1}>Square 1:1</option>
          <option value={16 / 9}>Landscape 16:9</option>
          <option value={4 / 3}>Photo 4:3</option>
          <option value={3 / 4}>Portrait 3:4</option>
          <option value={9 / 16}>Story 9:16</option>
        </select>
      </label>
      <div className="field-grid">
        <NumberField
          label="Crop left"
          value={rect.x}
          min={0}
          max={asset.width - rect.width}
          onChange={(x) => setRect({ ...rect, x })}
        />
        <NumberField
          label="Crop top"
          value={rect.y}
          min={0}
          max={asset.height - rect.height}
          onChange={(y) => setRect({ ...rect, y })}
        />
        <NumberField
          label="Crop width"
          value={rect.width}
          min={1}
          max={Math.min(
            asset.width - rect.x,
            ratio ? (asset.height - rect.y) * ratio : asset.width,
          )}
          onChange={(width) =>
            setRect({ ...rect, width, height: ratio ? width / ratio : rect.height })
          }
        />
        <NumberField
          label="Crop height"
          value={rect.height}
          min={1}
          max={Math.min(
            asset.height - rect.y,
            ratio ? (asset.width - rect.x) / ratio : asset.height,
          )}
          onChange={(height) =>
            setRect({ ...rect, height, width: ratio ? height * ratio : rect.width })
          }
        />
      </div>
      <p className="small muted">
        {Math.round(rect.width)} × {Math.round(rect.height)}{' '}
        {image
          ? 'source pixels. Frame width stays the same; height follows the crop ratio.'
          : 'object units. The original selection frame and position stay the same. Reset crop restores hidden areas.'}
      </p>
      <div className="two-buttons">
        <button
          className="secondary"
          onClick={() => {
            setRect({ x: 0, y: 0, width: asset.width, height: asset.height });
            setRatio(0);
          }}
        >
          Reset crop
        </button>
        <button
          className="primary"
          onClick={() => {
            const crop = constrainCrop(rect, asset.width, asset.height);
            const full =
              crop.x < 0.01 &&
              crop.y < 0.01 &&
              Math.abs(crop.width - asset.width) < 0.01 &&
              Math.abs(crop.height - asset.height) < 0.01;
            const patch: Partial<Element> = image
              ? cropPatch(element, crop)
              : { clip: full ? undefined : crop };
            if (image && (patch.scaleX! > 100 || patch.scaleY! > 100)) {
              useEditor
                .getState()
                .set({ toast: 'Choose a larger crop area to stay within the image zoom limit.' });
              return;
            }
            useEditor.getState().update([element.id], patch);
            onClose();
          }}
        >
          Apply crop
        </button>
      </div>
    </Modal>
  );
}
