import { useState } from 'react';
import {
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Copy,
  Trash2,
  LockKeyhole,
  UnlockKeyhole,
  Group,
  Ungroup,
  Sparkles,
  Crop,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  WandSparkles,
  ArrowLeftRight,
  ArrowUpDown,
} from 'lucide-react';
import { useEditor } from '../store/editor';
import type { Element } from '../model/document';
import { alignSelection, groupSelection, ungroupSelection } from '../canvas/commands';
import { getAsset } from '../services/assets';
import { removeImageBackground } from '../services/background';
import { ColorField, IconButton, NumberField } from './ui';

export function Properties({ onCheck }: { onCheck: () => void }) {
  const page = useEditor((s) => s.document.pages.find((p) => p.id === s.pageId)!),
    selection = useEditor((s) => s.selection);
  const elements = page.elements.filter((e) => selection.includes(e.id)),
    element = elements.length === 1 ? elements[0] : null;
  const [busy, setBusy] = useState(false);
  const update = (props: Partial<Element>) => useEditor.getState().update(selection, props);
  const removeBackground = async () => {
    if (!element?.assetId) return;
    const documentId = useEditor.getState().document.id;
    const pageId = page.id;
    setBusy(true);
    try {
      const a = await removeImageBackground(element.assetId, element.name);
      if (useEditor.getState().document.id !== documentId) return;
      useEditor.getState().commit((doc) => {
        const target = doc.pages
          .find((p) => p.id === pageId)
          ?.elements.find((e) => e.id === element.id);
        if (target) target.assetId = a.id;
      });
      useEditor
        .getState()
        .set({ toast: 'Background removed. Original image is preserved in uploads.' });
    } catch (error) {
      useEditor.getState().set({
        toast: `Background removal failed. ${error instanceof Error ? error.message : 'Check your connection and try again.'}`,
      });
    } finally {
      setBusy(false);
    }
  };
  return (
    <aside className="properties-panel">
      <div className="panel-heading">
        <h2>
          {elements.length > 1 ? `${elements.length} selected` : element ? 'Properties' : 'Page'}
        </h2>
        <SlidersHorizontal size={16} />
      </div>
      <div className="properties-content">
        {!elements.length ? (
          <>
            <section>
              <div className="section-heading">
                <h3>Canvas</h3>
                <span className="tag">CUSTOM</span>
              </div>
              <div className="field-grid">
                <NumberField
                  label="W"
                  value={page.width}
                  min={100}
                  max={8192}
                  onChange={(width) => useEditor.getState().updatePage({ width })}
                />
                <NumberField
                  label="H"
                  value={page.height}
                  min={100}
                  max={8192}
                  onChange={(height) => useEditor.getState().updatePage({ height })}
                />
              </div>
              <p className="small muted">Dimensions in pixels</p>
            </section>
            <section>
              <h3>Background</h3>
              <ColorField
                label="Color"
                value={page.background}
                onChange={(background) => useEditor.getState().updatePage({ background })}
              />
            </section>
            <section>
              <h3>Page details</h3>
              <label className="stack-label">
                Page name
                <input
                  value={page.name}
                  onChange={(e) => useEditor.getState().updatePage({ name: e.target.value })}
                />
              </label>
              <div className="detail-row">
                <span>Objects</span>
                <strong>{page.elements.length}</strong>
              </div>
              <div className="detail-row">
                <span>Guides</span>
                <strong>{page.guides.length}</strong>
              </div>
              {page.guides.length > 0 && (
                <button
                  className="text-button"
                  onClick={() => useEditor.getState().updatePage({ guides: [] })}
                >
                  Clear all guides
                </button>
              )}
              <p className="small muted">
                Click a ruler to add a guide. Double-click a guide to remove it.
              </p>
            </section>
            <div className="select-hint">
              <MouseCursor />
              <h3>A little detail goes a long way.</h3>
              <p>
                Select anything on your canvas
                <br />
                to make it just right.
              </p>
            </div>
          </>
        ) : (
          <>
            <section>
              <div className="section-heading">
                <h3>
                  {element ? element.kind[0].toUpperCase() + element.kind.slice(1) : 'Selection'}
                </h3>
                <div className="toolbar-group">
                  <IconButton
                    label="Duplicate selected"
                    onClick={() => useEditor.getState().duplicate()}
                  >
                    <Copy size={15} />
                  </IconButton>
                  <IconButton label="Delete selected" onClick={() => useEditor.getState().remove()}>
                    <Trash2 size={15} />
                  </IconButton>
                </div>
              </div>
              {element && (
                <input
                  className="element-name"
                  aria-label="Element name"
                  value={element.name}
                  onChange={(e) => update({ name: e.target.value })}
                />
              )}
              <div className="align-tools">
                {(
                  [
                    { mode: 'left', icon: AlignStartVertical },
                    { mode: 'center', icon: AlignCenterVertical },
                    { mode: 'right', icon: AlignEndVertical },
                    { mode: 'top', icon: AlignStartHorizontal },
                    { mode: 'middle', icon: AlignCenterHorizontal },
                    { mode: 'bottom', icon: AlignEndHorizontal },
                  ] as const
                ).map(({ mode, icon: Icon }) => (
                  <IconButton
                    key={mode}
                    label={`Align ${mode}`}
                    onClick={() => alignSelection(mode)}
                  >
                    <Icon size={17} />
                  </IconButton>
                ))}
              </div>
              {elements.length >= 3 && (
                <div className="two-buttons">
                  <button className="secondary" onClick={() => alignSelection('horizontal')}>
                    <ArrowLeftRight size={15} />
                    Distribute X
                  </button>
                  <button className="secondary" onClick={() => alignSelection('vertical')}>
                    <ArrowUpDown size={15} />
                    Distribute Y
                  </button>
                </div>
              )}
              {element && (
                <>
                  <div className="field-grid">
                    <NumberField label="X" value={element.x} onChange={(x) => update({ x })} />
                    <NumberField label="Y" value={element.y} onChange={(y) => update({ y })} />
                    <NumberField
                      label="W"
                      value={element.width * element.scaleX}
                      min={1}
                      max={20000}
                      onChange={(w) =>
                        update(
                          element.kind === 'text'
                            ? { width: w / element.scaleX }
                            : { scaleX: w / element.width },
                        )
                      }
                    />
                    <NumberField
                      label="H"
                      value={element.height * element.scaleY}
                      min={1}
                      max={20000}
                      onChange={(h) => update({ scaleY: h / element.height })}
                    />
                    <NumberField
                      label="Rotation"
                      value={element.rotation}
                      min={-360}
                      max={360}
                      onChange={(rotation) => update({ rotation })}
                    />
                    {element.kind === 'rect' && (
                      <NumberField
                        label="Radius"
                        value={element.radius}
                        min={0}
                        max={10000}
                        onChange={(radius) => update({ radius })}
                      />
                    )}
                  </div>
                  <div className="two-buttons">
                    <button className="secondary" onClick={() => update({ flipX: !element.flipX })}>
                      <ArrowLeftRight size={14} />
                      Flip X
                    </button>
                    <button className="secondary" onClick={() => update({ flipY: !element.flipY })}>
                      <ArrowUpDown size={14} />
                      Flip Y
                    </button>
                  </div>
                </>
              )}
            </section>
            {element?.kind === 'text' && (
              <section>
                <h3>Typography</h3>
                <select
                  aria-label="Font family"
                  value={element.fontFamily ?? 'Arial'}
                  onChange={(e) => update({ fontFamily: e.target.value as Element['fontFamily'] })}
                >
                  {['Arial', 'Georgia', 'Verdana', 'Courier New', 'Trebuchet MS', 'Impact'].map(
                    (font) => (
                      <option key={font}>{font}</option>
                    ),
                  )}
                </select>
                <div className="field-grid">
                  <NumberField
                    label="Size"
                    value={element.fontSize ?? 48}
                    min={1}
                    max={1000}
                    onChange={(fontSize) => update({ fontSize })}
                  />
                  <NumberField
                    label="Line"
                    value={element.lineHeight ?? 1.16}
                    min={0.5}
                    max={5}
                    step={0.05}
                    onChange={(lineHeight) => update({ lineHeight })}
                  />
                </div>
                <NumberField
                  label="Letter spacing"
                  value={element.charSpacing ?? 0}
                  min={-200}
                  max={1000}
                  onChange={(charSpacing) => update({ charSpacing })}
                />
                <div className="format-tools">
                  <IconButton
                    label="Bold"
                    className={element.fontWeight === 'bold' ? 'active' : ''}
                    onClick={() =>
                      update({ fontWeight: element.fontWeight === 'bold' ? 'normal' : 'bold' })
                    }
                  >
                    <Bold size={16} />
                  </IconButton>
                  <IconButton
                    label="Italic"
                    className={element.fontStyle === 'italic' ? 'active' : ''}
                    onClick={() =>
                      update({ fontStyle: element.fontStyle === 'italic' ? 'normal' : 'italic' })
                    }
                  >
                    <Italic size={16} />
                  </IconButton>
                  <IconButton
                    label="Underline"
                    className={element.underline ? 'active' : ''}
                    onClick={() => update({ underline: !element.underline })}
                  >
                    <Underline size={16} />
                  </IconButton>
                  <span className="toolbar-divider" />
                  {(
                    [
                      { value: 'left', icon: AlignLeft },
                      { value: 'center', icon: AlignCenter },
                      { value: 'right', icon: AlignRight },
                    ] as const
                  ).map(({ value, icon: Icon }) => (
                    <IconButton
                      key={value}
                      label={`Text ${value}`}
                      className={element.textAlign === value ? 'active' : ''}
                      onClick={() => update({ textAlign: value })}
                    >
                      <Icon size={16} />
                    </IconButton>
                  ))}
                </div>
                <label className="stack-label">
                  Text content
                  <textarea
                    value={element.text ?? ''}
                    rows={3}
                    onChange={(e) => update({ text: e.target.value })}
                  />
                </label>
              </section>
            )}
            {element?.kind === 'image' && (
              <section>
                <h3>Image tools</h3>
                <button
                  className="secondary full"
                  disabled={busy}
                  onClick={() => void removeBackground()}
                >
                  <WandSparkles size={16} />
                  {busy ? 'Processing locally…' : 'Remove background'}
                </button>
                <p className="small muted">
                  Private, on-device AI. First use downloads the free model (about 40 MB). Requires
                  internet for this download. AGPL-3.0 library.
                </p>
                <h3 className="crop-label">
                  <Crop size={15} />
                  Crop source image
                </h3>
                <div className="field-grid">
                  <NumberField
                    label="Crop X"
                    value={element.cropX ?? 0}
                    min={0}
                    max={(getAsset(element.assetId!)?.width ?? 1) - 1}
                    onChange={(cropX) =>
                      update({
                        cropX,
                        width: Math.min(
                          element.width,
                          (getAsset(element.assetId!)?.width ?? element.width) - cropX,
                        ),
                      })
                    }
                  />
                  <NumberField
                    label="Crop Y"
                    value={element.cropY ?? 0}
                    min={0}
                    max={(getAsset(element.assetId!)?.height ?? 1) - 1}
                    onChange={(cropY) =>
                      update({
                        cropY,
                        height: Math.min(
                          element.height,
                          (getAsset(element.assetId!)?.height ?? element.height) - cropY,
                        ),
                      })
                    }
                  />
                  <NumberField
                    label="Crop W"
                    value={element.width}
                    min={1}
                    max={
                      (getAsset(element.assetId!)?.width ?? element.width) - (element.cropX ?? 0)
                    }
                    onChange={(width) => update({ width })}
                  />
                  <NumberField
                    label="Crop H"
                    value={element.height}
                    min={1}
                    max={
                      (getAsset(element.assetId!)?.height ?? element.height) - (element.cropY ?? 0)
                    }
                    onChange={(height) => update({ height })}
                  />
                </div>
                <button
                  className="text-button"
                  onClick={() => {
                    const a = getAsset(element.assetId!);
                    if (a) update({ cropX: 0, cropY: 0, width: a.width, height: a.height });
                  }}
                >
                  Reset crop
                </button>
              </section>
            )}
            {element && element.kind !== 'image' && element.kind !== 'group' && (
              <section>
                <div className="section-heading">
                  <h3>Fill</h3>
                  <select
                    className="mini-select"
                    aria-label="Fill type"
                    value={element.gradient ? 'gradient' : 'solid'}
                    onChange={(e) =>
                      update({
                        gradient:
                          e.target.value === 'gradient' ? { end: '#f4a46e', angle: 45 } : undefined,
                      })
                    }
                  >
                    <option value="solid">Solid</option>
                    <option value="gradient">Gradient</option>
                  </select>
                </div>
                <ColorField
                  label="Color"
                  value={element.fill}
                  onChange={(fill) => update({ fill })}
                />
                {element.gradient && (
                  <>
                    <ColorField
                      label="End"
                      value={element.gradient.end}
                      onChange={(end) => update({ gradient: { ...element.gradient!, end } })}
                    />
                    <NumberField
                      label="Angle"
                      value={element.gradient.angle}
                      onChange={(angle) => update({ gradient: { ...element.gradient!, angle } })}
                    />
                  </>
                )}
              </section>
            )}
            <section>
              <h3>Appearance</h3>
              <label className="range-label">
                <span>Opacity</span>
                <span>{Math.round((element?.opacity ?? 1) * 100)}%</span>
              </label>
              <input
                aria-label="Opacity"
                type="range"
                min="0"
                max="100"
                value={Math.round((element?.opacity ?? 1) * 100)}
                onChange={(e) => update({ opacity: Number(e.target.value) / 100 })}
              />
              {element && (
                <>
                  <ColorField
                    label="Stroke"
                    value={element.stroke}
                    onChange={(stroke) => update({ stroke })}
                  />
                  <NumberField
                    label="Stroke width"
                    value={element.strokeWidth}
                    min={0}
                    max={100}
                    onChange={(strokeWidth) => update({ strokeWidth })}
                  />
                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={!!element.shadow}
                      onChange={(e) =>
                        update({
                          shadow: e.target.checked
                            ? { color: '#686070', blur: 20, x: 0, y: 8 }
                            : undefined,
                        })
                      }
                    />
                    Drop shadow
                  </label>
                  {element.shadow && (
                    <>
                      <ColorField
                        label="Shadow"
                        value={element.shadow.color}
                        onChange={(color) => update({ shadow: { ...element.shadow!, color } })}
                      />
                      <div className="field-grid">
                        <NumberField
                          label="Blur"
                          value={element.shadow.blur}
                          min={0}
                          max={200}
                          onChange={(blur) => update({ shadow: { ...element.shadow!, blur } })}
                        />
                        <NumberField
                          label="Offset Y"
                          value={element.shadow.y}
                          onChange={(y) => update({ shadow: { ...element.shadow!, y } })}
                        />
                      </div>
                    </>
                  )}
                </>
              )}
            </section>
            <section>
              <h3>Arrange</h3>
              <div className="two-buttons">
                {elements.length > 1 ? (
                  <button className="secondary" onClick={groupSelection}>
                    <Group size={15} />
                    Group
                  </button>
                ) : element?.kind === 'group' ? (
                  <button className="secondary" onClick={ungroupSelection}>
                    <Ungroup size={15} />
                    Ungroup
                  </button>
                ) : null}
                <button
                  className="secondary"
                  onClick={() => update({ locked: !elements.every((e) => e.locked) })}
                >
                  {elements.every((e) => e.locked) ? (
                    <UnlockKeyhole size={15} />
                  ) : (
                    <LockKeyhole size={15} />
                  )}{' '}
                  {elements.every((e) => e.locked) ? 'Unlock' : 'Lock'}
                </button>
              </div>
              {element && (
                <div className="two-buttons">
                  <button
                    className="secondary"
                    onClick={() => useEditor.getState().reorder(element.id, 1)}
                  >
                    <ArrowUp size={15} />
                    Forward
                  </button>
                  <button
                    className="secondary"
                    onClick={() => useEditor.getState().reorder(element.id, -1)}
                  >
                    <ArrowDown size={15} />
                    Backward
                  </button>
                </div>
              )}
            </section>
          </>
        )}
      </div>
      <div className="checker-card">
        <div>
          <span className="checker-icon">
            <Sparkles size={18} />
          </span>
          <span>
            <strong>A second pair of eyes.</strong>
            <small>Give your design a quick check.</small>
          </span>
        </div>
        <button className="secondary full" onClick={onCheck}>
          Run Slide Checker
          <ArrowUp size={15} style={{ transform: 'rotate(45deg)' }} />
        </button>
      </div>
    </aside>
  );
}
function MouseCursor() {
  return (
    <svg width="30" height="38" viewBox="0 0 30 38" fill="none">
      <path d="M6 4L25 21L15 22L10 32L6 4Z" fill="#e8e0fa" stroke="#9984c8" strokeWidth="1.5" />
    </svg>
  );
}
