import { useId, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { clampUnit, insertMaskPoint, maskPath, presetMask, smoothNodes } from '../model/masks';
import type { MaskDesign, MaskNode } from '../model/masks';
import { NumberField } from './ui';

type MaskProps = { mask: MaskDesign; onChange: (mask: MaskDesign) => void };
type EditProps = {
  editing: boolean;
  setEditing: (value: boolean) => void;
  drawing: boolean;
  setDrawing: (value: boolean) => void;
  selected: number;
  setSelected: (value: number) => void;
};

export function MaskTools({
  mask,
  onChange,
  editing,
  setEditing,
  drawing,
  setDrawing,
  selected,
  setSelected,
}: MaskProps & EditProps) {
  const nodes = mask.nodes ?? [],
    node = nodes[selected];
  return (
    <section className="mask-tools" aria-label="Creative crop tools">
      <div className="section-heading">
        <h3>Creative crop</h3>
        <span>NON-DESTRUCTIVE</span>
      </div>
      <div className="mask-presets">
        {['rect', 'ellipse', 'rounded', 'heart', 'star', 'polygon'].map((name) => (
          <button
            key={name}
            className="secondary"
            aria-label={`Use ${name} crop`}
            aria-pressed={name === mask.shape && name !== 'path'}
            onClick={() => {
              onChange(presetMask(name));
              setEditing(false);
              setDrawing(false);
              setSelected(0);
            }}
          >
            {
              {
                rect: 'Rectangle',
                ellipse: 'Oval',
                rounded: 'Rounded',
                heart: 'Heart',
                star: 'Star',
                polygon: 'Polygon',
              }[name]
            }
          </button>
        ))}
        <button
          className={drawing ? 'primary' : 'secondary'}
          aria-pressed={drawing}
          onClick={() => {
            setDrawing(!drawing);
            setEditing(true);
          }}
        >
          Draw freeform
        </button>
        {mask.shape === 'path' && (
          <button
            className={editing && !drawing ? 'primary' : 'secondary'}
            aria-pressed={editing && !drawing}
            onClick={() => {
              setEditing(!editing);
              setDrawing(false);
            }}
          >
            Edit curve points
          </button>
        )}
      </div>
      {mask.shape === 'rounded' && (
        <NumberField
          label="Corner roundness %"
          value={(mask.roundness ?? 0.2) * 100}
          min={0}
          max={50}
          onChange={(v) => onChange({ ...mask, roundness: v / 100 })}
        />
      )}
      {editing && mask.shape === 'path' && !drawing && node && (
        <>
          <div className="mask-point-tools">
            <label>
              Point{' '}
              <select
                aria-label="Selected crop point"
                value={selected}
                onChange={(e) => setSelected(Number(e.target.value))}
              >
                {nodes.map((_, i) => (
                  <option key={i} value={i}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="secondary"
              disabled={nodes.length >= 64}
              onClick={() => {
                onChange({ ...mask, nodes: insertMaskPoint(nodes, selected) });
                setSelected(selected + 1);
              }}
            >
              Add point
            </button>
            <button
              className="secondary"
              disabled={nodes.length <= 3}
              onClick={() => {
                onChange({ ...mask, nodes: nodes.filter((_, i) => i !== selected) });
                setSelected(Math.max(0, selected - 1));
              }}
            >
              Delete point
            </button>
            <button
              className="secondary"
              onClick={() => {
                const smooth = smoothNodes(nodes)[selected];
                onChange({ ...mask, nodes: nodes.map((n, i) => (i === selected ? smooth : n)) });
              }}
            >
              Curve point
            </button>
            <button
              className="secondary"
              onClick={() =>
                onChange({
                  ...mask,
                  nodes: nodes.map((n, i) => (i === selected ? { x: n.x, y: n.y } : n)),
                })
              }
            >
              Corner point
            </button>
            <button
              className="secondary"
              onClick={() => onChange({ ...mask, nodes: smoothNodes(nodes) })}
            >
              Smooth all
            </button>
          </div>
          <div className="field-grid">
            <NumberField
              label="Point X %"
              min={0}
              max={100}
              value={node.x * 100}
              onChange={(v) =>
                onChange({ ...mask, nodes: moveNode(nodes, selected, v / 100, node.y) })
              }
            />
            <NumberField
              label="Point Y %"
              min={0}
              max={100}
              value={node.y * 100}
              onChange={(v) =>
                onChange({ ...mask, nodes: moveNode(nodes, selected, node.x, v / 100) })
              }
            />
          </div>
        </>
      )}
      <p className="small muted" role="status">
        {drawing
          ? 'Draw a closed outline inside the crop frame. Release to close it. Draw at least three distinct points.'
          : editing && mask.shape === 'path'
            ? 'Drag points to shape the mask. Select a point to drag its orange curve handles. Arrow keys nudge focused points.'
            : 'Choose a mask, or draw your own outline. All masks follow the crop frame.'}
      </p>
    </section>
  );
}

function moveNode(nodes: MaskNode[], index: number, x: number, y: number) {
  const node = nodes[index],
    dx = x - node.x,
    dy = y - node.y;
  const clampHandle = (v: number) => Math.max(-2, Math.min(3, v));
  return nodes.map((n, i) =>
    i === index
      ? {
          ...n,
          x,
          y,
          ...(n.inX !== undefined
            ? { inX: clampHandle(n.inX + dx), inY: clampHandle((n.inY ?? n.y) + dy) }
            : {}),
          ...(n.outX !== undefined
            ? { outX: clampHandle(n.outX + dx), outY: clampHandle((n.outY ?? n.y) + dy) }
            : {}),
        }
      : n,
  );
}

export function MaskCanvas({
  mask,
  onChange,
  editing,
  drawing,
  setDrawing,
  selected,
  setSelected,
  width,
  height,
}: MaskProps & Omit<EditProps, 'setEditing'> & { width: number; height: number }) {
  const svg = useRef<SVGSVGElement>(null);
  const shadeId = useId();
  const drag = useRef<{ index: number; handle?: 'in' | 'out' } | null>(null);
  const trace = useRef<MaskNode[] | null>(null);
  const [draft, setDraft] = useState<MaskNode[]>([]);
  const nodes = mask.nodes ?? [];
  const position = (e: PointerEvent) => {
    const box = svg.current!.getBoundingClientRect();
    return {
      x: clampUnit((e.clientX - box.left) / box.width),
      y: clampUnit((e.clientY - box.top) / box.height),
    };
  };
  const stop = () => {
    if (trace.current) {
      const points = trace.current;
      // Uniformly bound large drawings; preserve the outline without growing document/history size.
      const bounded =
        points.length <= 64
          ? points
          : Array.from(
              { length: 64 },
              (_, i) => points[Math.floor((i * (points.length - 1)) / 63)],
            );
      if (bounded.length >= 3) {
        onChange({ shape: 'path', nodes: bounded });
        setSelected(0);
        setDrawing(false);
      }
      trace.current = null;
      setDraft([]);
    }
    drag.current = null;
  };
  const path = maskPath(mask, width, height);
  const round = Math.min(width, height) * (mask.roundness ?? 0.2);
  const silhouette =
    mask.shape === 'path'
      ? path
      : mask.shape === 'ellipse'
        ? `M 0 ${height / 2} A ${width / 2} ${height / 2} 0 1 0 ${width} ${height / 2} A ${width / 2} ${height / 2} 0 1 0 0 ${height / 2} Z`
        : mask.shape === 'rounded'
          ? `M ${round} 0 H ${width - round} Q ${width} 0 ${width} ${round} V ${height - round} Q ${width} ${height} ${width - round} ${height} H ${round} Q 0 ${height} 0 ${height - round} V ${round} Q 0 0 ${round} 0 Z`
          : `M 0 0 H ${width} V ${height} H 0 Z`;
  const begin = (e: PointerEvent<SVGElement>, index: number, handle?: 'in' | 'out') => {
    if (!editing || drawing) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelected(index);
    drag.current = { index, handle };
  };
  return (
    <svg
      ref={svg}
      className={`mask-canvas ${editing ? 'editing' : ''}`}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-label="Crop mask editor"
      onPointerDown={(e) => {
        if (!drawing) return;
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        trace.current = [position(e)];
        setDraft(trace.current);
      }}
      onPointerMove={(e) => {
        if (!trace.current && !drag.current) return;
        e.stopPropagation();
        const p = position(e);
        if (trace.current) {
          const last = trace.current[trace.current.length - 1];
          if (Math.hypot(p.x - last.x, p.y - last.y) > 0.012 && trace.current.length < 2048) {
            trace.current.push(p);
            setDraft([...trace.current]);
          }
        } else if (drag.current) {
          const { index, handle } = drag.current;
          if (handle) {
            const box = svg.current!.getBoundingClientRect();
            const clampHandle = (v: number) => Math.max(-2, Math.min(3, v));
            onChange({
              ...mask,
              nodes: nodes.map((n, i) =>
                i === index
                  ? {
                      ...n,
                      [`${handle}X`]: clampHandle((e.clientX - box.left) / box.width),
                      [`${handle}Y`]: clampHandle((e.clientY - box.top) / box.height),
                    }
                  : n,
              ),
            });
          } else onChange({ ...mask, nodes: moveNode(nodes, index, p.x, p.y) });
        }
      }}
      onPointerUp={(e) => {
        if (trace.current || drag.current) {
          e.stopPropagation();
          stop();
        }
      }}
      onPointerCancel={() => {
        trace.current = null;
        drag.current = null;
        setDraft([]);
      }}
    >
      <defs>
        <mask id={shadeId} maskUnits="userSpaceOnUse" x={0} y={0} width={width} height={height}>
          <rect width={width} height={height} fill="white" />
          <path d={silhouette} fill="black" fillRule="nonzero" />
        </mask>
      </defs>
      <rect
        width={width}
        height={height}
        fill="#0009"
        mask={`url(#${shadeId})`}
        pointerEvents="none"
      />
      <path
        d={silhouette}
        fill="none"
        stroke="white"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
      />
      {draft.length > 0 && (
        <polyline
          points={draft.map((p) => `${p.x * width},${p.y * height}`).join(' ')}
          fill="none"
          stroke="#ff8b3d"
          strokeWidth={3}
          vectorEffect="non-scaling-stroke"
        />
      )}
      {editing &&
        !drawing &&
        nodes.map((n, i) => (
          <g key={i}>
            {i === selected &&
              (['in', 'out'] as const).map(
                (handle) =>
                  n[`${handle}X`] !== undefined && (
                    <g key={handle}>
                      <line
                        x1={n.x * width}
                        y1={n.y * height}
                        x2={n[`${handle}X`]! * width}
                        y2={n[`${handle}Y`]! * height}
                        stroke="#ff8b3d"
                        strokeWidth={1.5}
                        vectorEffect="non-scaling-stroke"
                      />
                      <circle
                        className="curve-handle"
                        role="button"
                        tabIndex={0}
                        aria-label={`Crop point ${i + 1} ${handle} handle`}
                        cx={n[`${handle}X`]! * width}
                        cy={n[`${handle}Y`]! * height}
                        r={Math.min(width, height) * 0.018}
                        fill="#ff8b3d"
                        stroke="white"
                        strokeWidth={1.5}
                        vectorEffect="non-scaling-stroke"
                        onPointerDown={(e) => begin(e, i, handle)}
                        onKeyDown={(e) => {
                          if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key))
                            return;
                          e.preventDefault();
                          e.stopPropagation();
                          const step = e.shiftKey ? 0.05 : 0.005;
                          const clamp = (v: number) => Math.max(-2, Math.min(3, v));
                          onChange({
                            ...mask,
                            nodes: nodes.map((point, index) =>
                              index === i
                                ? {
                                    ...point,
                                    [`${handle}X`]: clamp(
                                      point[`${handle}X`]! +
                                        (e.key === 'ArrowRight'
                                          ? step
                                          : e.key === 'ArrowLeft'
                                            ? -step
                                            : 0),
                                    ),
                                    [`${handle}Y`]: clamp(
                                      point[`${handle}Y`]! +
                                        (e.key === 'ArrowDown'
                                          ? step
                                          : e.key === 'ArrowUp'
                                            ? -step
                                            : 0),
                                    ),
                                  }
                                : point,
                            ),
                          });
                        }}
                      />
                    </g>
                  ),
              )}
            <circle
              role="button"
              tabIndex={0}
              aria-label={`Crop point ${i + 1}`}
              className="mask-node"
              cx={n.x * width}
              cy={n.y * height}
              r={Math.min(width, height) * 0.022}
              fill={i === selected ? '#ff8b3d' : 'white'}
              stroke="#713709"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
              onFocus={() => setSelected(i)}
              onPointerDown={(e) => begin(e, i)}
              onKeyDown={(e) => {
                if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
                e.preventDefault();
                e.stopPropagation();
                const step = e.shiftKey ? 0.05 : 0.005;
                onChange({
                  ...mask,
                  nodes: moveNode(
                    nodes,
                    i,
                    clampUnit(
                      n.x + (e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0),
                    ),
                    clampUnit(
                      n.y + (e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0),
                    ),
                  ),
                });
              }}
            />
          </g>
        ))}
    </svg>
  );
}
