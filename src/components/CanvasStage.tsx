import { useEffect, useRef, useState } from 'react';
import { ActiveSelection, Canvas, Textbox } from 'fabric';
import {
  MousePointer2,
  Hand,
  Minus,
  Plus,
  Maximize,
  Magnet,
  Grid2X2,
  PanelLeftClose,
  PanelRightClose,
  Ruler,
  Copy,
  Trash2,
  Group as GroupIcon,
} from 'lucide-react';
import { useEditor, currentPage } from '../store/editor';
import { objectId, toFabric, setLiveCanvas } from '../canvas/adapter';
import { commitCanvas, finishTextEditing, groupSelection } from '../canvas/commands';
import { IconButton } from './ui';

export function CanvasStage() {
  const page = useEditor((s) => s.document.pages.find((p) => p.id === s.pageId)!);
  const zoom = useEditor((s) => s.zoom),
    tool = useEditor((s) => s.tool),
    grid = useEditor((s) => s.grid),
    snapping = useEditor((s) => s.snapping),
    showGuides = useEditor((s) => s.showGuides);
  const selection = useEditor((s) => s.selection),
    ready = useEditor((s) => s.ready);
  const canvasElement = useRef<HTMLCanvasElement>(null),
    canvasRef = useRef<Canvas | null>(null),
    viewport = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false),
    [context, setContext] = useState<{ x: number; y: number } | null>(null);
  const [snapLines, setSnapLines] = useState<{ x?: number; y?: number }>({});
  const syncing = useRef(false),
    version = useRef(0),
    fitRef = useRef(() => {});
  useEffect(() => {
    const canvas = new Canvas(canvasElement.current!, {
      preserveObjectStacking: true,
      selectionColor: 'rgba(132,98,223,.08)',
      selectionBorderColor: '#8462df',
      selectionLineWidth: 1,
      stopContextMenu: true,
      fireRightClick: true,
    });
    canvasRef.current = canvas;
    setLiveCanvas(canvas);
    setLoaded(true);
    const select = () => {
      if (!syncing.current) useEditor.getState().select(canvas.getActiveObjects().map(objectId));
    };
    canvas.on('selection:created', select);
    canvas.on('selection:updated', select);
    canvas.on('selection:cleared', select);
    canvas.on('object:modified', () => {
      if (!syncing.current) {
        commitCanvas();
        setSnapLines({});
      }
    });
    canvas.on('text:editing:exited', () => {
      if (!syncing.current) commitCanvas();
    });
    canvas.on('text:changed', () => useEditor.getState().set({ saved: 'saving' }));
    const finishOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !canvas.wrapperEl.contains(event.target))
        finishTextEditing();
    };
    document.addEventListener('pointerdown', finishOnOutsideClick, true);
    canvas.on('object:moving', ({ target }) => {
      if (!useEditor.getState().snapping) return;
      const page = currentPage(),
        box = target.getBoundingRect(),
        tolerance = 6 / useEditor.getState().zoom;
      const xs = [
          0,
          page.width / 2,
          page.width,
          ...page.guides.filter((g) => g.axis === 'x').map((g) => g.position),
        ],
        ys = [
          0,
          page.height / 2,
          page.height,
          ...page.guides.filter((g) => g.axis === 'y').map((g) => g.position),
        ];
      for (const other of canvas.getObjects()) {
        if (
          other === target ||
          (target instanceof ActiveSelection && target.getObjects().includes(other)) ||
          !other.visible
        )
          continue;
        const b = other.getBoundingRect();
        xs.push(b.left, b.left + b.width / 2, b.left + b.width);
        ys.push(b.top, b.top + b.height / 2, b.top + b.height);
      }
      let dx = tolerance,
        dy = tolerance,
        sx: number | undefined,
        sy: number | undefined;
      for (const x of xs)
        for (const edge of [box.left, box.left + box.width / 2, box.left + box.width])
          if (Math.abs(x - edge) < Math.abs(dx)) {
            dx = x - edge;
            sx = x;
          }
      for (const y of ys)
        for (const edge of [box.top, box.top + box.height / 2, box.top + box.height])
          if (Math.abs(y - edge) < Math.abs(dy)) {
            dy = y - edge;
            sy = y;
          }
      if (sx !== undefined) target.left += dx;
      if (sy !== undefined) target.top += dy;
      target.setCoords();
      setSnapLines({ x: sx, y: sy });
    });
    canvas.on('mouse:up', () => setSnapLines({}));
    canvas.on('mouse:wheel', ({ e }) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        const z = useEditor.getState().zoom;
        useEditor
          .getState()
          .set({ zoom: Math.max(0.1, Math.min(3, z * Math.exp(-e.deltaY * 0.002))) });
      }
    });
    return () => {
      document.removeEventListener('pointerdown', finishOnOutsideClick, true);
      version.current++;
      setLiveCanvas(null);
      canvasRef.current = null;
      void canvas.dispose();
    };
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !loaded || !ready) return;
    const token = ++version.current;
    syncing.current = true;
    Promise.all(page.elements.map((e) => toFabric(e)))
      .then((objects) => {
        if (token !== version.current) {
          objects.forEach((o) => o.dispose());
          return;
        }
        canvas.discardActiveObject();
        canvas.clear();
        canvas.backgroundColor = page.background;
        canvas.add(...objects);
        const ids = useEditor.getState().selection,
          selected = objects.filter(
            (o) => ids.includes(objectId(o)) && o.visible && (ids.length === 1 || o.selectable),
          );
        if (selected.length)
          canvas.setActiveObject(
            selected.length === 1 ? selected[0] : new ActiveSelection(selected, { canvas }),
          );
        canvas.requestRenderAll();
        syncing.current = false;
      })
      .catch(() => {
        if (token === version.current) {
          syncing.current = false;
          useEditor.getState().set({
            toast: 'Could not render an image. Reopen the project or restore a project file.',
          });
        }
      });
  }, [page, loaded, ready]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || syncing.current) return;
    const active = canvas.getActiveObject();
    if (active instanceof Textbox && active.isEditing) return;
    const ids = canvas.getActiveObjects().map(objectId);
    if (ids.join() === selection.join()) return;
    syncing.current = true;
    canvas.discardActiveObject();
    const objects = canvas
      .getObjects()
      .filter(
        (o) =>
          selection.includes(objectId(o)) && o.visible && (selection.length === 1 || o.selectable),
      );
    if (objects.length)
      canvas.setActiveObject(
        objects.length === 1 ? objects[0] : new ActiveSelection(objects, { canvas }),
      );
    canvas.requestRenderAll();
    syncing.current = false;
  }, [selection]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setDimensions({ width: page.width * zoom, height: page.height * zoom });
    canvas.setZoom(zoom);
    canvas.requestRenderAll();
  }, [zoom, page.width, page.height, loaded]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.selection = tool === 'select';
    canvas.skipTargetFind = tool === 'hand';
    canvas.defaultCursor = tool === 'hand' ? 'grab' : 'default';
  }, [tool, loaded]);
  fitRef.current = () => {
    const el = viewport.current;
    if (el)
      useEditor.getState().set({
        zoom: Math.max(
          0.1,
          Math.min(1, (el.clientWidth - 120) / page.width, (el.clientHeight - 120) / page.height),
        ),
      });
  };
  useEffect(() => {
    fitRef.current();
  }, [page.id, page.width, page.height]);
  useEffect(() => {
    const observer = new ResizeObserver(() => fitRef.current());
    if (viewport.current) observer.observe(viewport.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    let start: { x: number; y: number; left: number; top: number } | null = null;
    const down = (e: PointerEvent) => {
      if (useEditor.getState().tool !== 'hand') return;
      start = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop };
      el.setPointerCapture(e.pointerId);
      e.preventDefault();
    };
    const move = (e: PointerEvent) => {
      if (start) {
        el.scrollLeft = start.left - e.clientX + start.x;
        el.scrollTop = start.top - e.clientY + start.y;
      }
    };
    const up = () => {
      start = null;
    };
    el.addEventListener('pointerdown', down, true);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down, true);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
  }, []);
  return (
    <main
      className="stage-area"
      aria-label="Design workspace"
      onClick={() => context && setContext(null)}
    >
      <div className="workspace-toolbar">
        <div className="toolbar-group">
          <IconButton
            label="Toggle left panel"
            onClick={() => useEditor.getState().set({ leftOpen: !useEditor.getState().leftOpen })}
          >
            <PanelLeftClose size={17} />
          </IconButton>
          <span className="toolbar-divider" />
          <IconButton
            label="Select (V)"
            className={tool === 'select' ? 'active' : ''}
            onClick={() => useEditor.getState().set({ tool: 'select' })}
          >
            <MousePointer2 size={17} />
          </IconButton>
          <IconButton
            label="Pan (H or hold Space)"
            className={tool === 'hand' ? 'active' : ''}
            onClick={() => useEditor.getState().set({ tool: 'hand' })}
          >
            <Hand size={17} />
          </IconButton>
        </div>
        <span className="workspace-label">
          {page.name}
          <span> · </span>
          {page.width} × {page.height}
        </span>
        <div className="toolbar-group">
          <IconButton
            label="Smart snapping"
            aria-pressed={snapping}
            className={snapping ? 'active-subtle' : ''}
            onClick={() => useEditor.getState().set({ snapping: !snapping })}
          >
            <Magnet size={17} />
          </IconButton>
          <IconButton
            label="Toggle grid"
            aria-pressed={grid}
            className={grid ? 'active-subtle' : ''}
            onClick={() => useEditor.getState().set({ grid: !grid })}
          >
            <Grid2X2 size={17} />
          </IconButton>
          <IconButton
            label="Toggle rulers and guides"
            className={showGuides ? 'active-subtle' : ''}
            onClick={() => useEditor.getState().set({ showGuides: !showGuides })}
          >
            <Ruler size={17} />
          </IconButton>
          <span className="toolbar-divider" />
          <IconButton
            label="Toggle properties"
            onClick={() => useEditor.getState().set({ rightOpen: !useEditor.getState().rightOpen })}
          >
            <PanelRightClose size={17} />
          </IconButton>
        </div>
      </div>
      <div className={`canvas-viewport ${tool === 'hand' ? 'panning' : ''}`} ref={viewport}>
        <div className="canvas-center">
          <div
            className="artboard-wrap"
            style={{ width: page.width * zoom, height: page.height * zoom }}
          >
            {showGuides && (
              <>
                <div
                  className="ruler horizontal"
                  title="Click to add a vertical guide"
                  onClick={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    useEditor.getState().updatePage({
                      guides: [
                        ...page.guides,
                        { axis: 'x', position: Math.round((e.clientX - r.left) / zoom) },
                      ],
                    });
                  }}
                >
                  {Array.from({ length: Math.ceil(page.width / 100) }, (_, i) => (
                    <span key={i} style={{ left: i * 100 * zoom }}>
                      {i * 100}
                    </span>
                  ))}
                </div>
                <div
                  className="ruler vertical"
                  title="Click to add a horizontal guide"
                  onClick={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    useEditor.getState().updatePage({
                      guides: [
                        ...page.guides,
                        { axis: 'y', position: Math.round((e.clientY - r.top) / zoom) },
                      ],
                    });
                  }}
                >
                  {Array.from({ length: Math.ceil(page.height / 100) }, (_, i) => (
                    <span key={i} style={{ top: i * 100 * zoom }}>
                      {i * 100}
                    </span>
                  ))}
                </div>
              </>
            )}
            <div
              className="artboard"
              onContextMenu={(e) => {
                e.preventDefault();
                setContext({
                  x: Math.min(e.clientX, window.innerWidth - 220),
                  y: Math.min(e.clientY, window.innerHeight - 230),
                });
              }}
            >
              <canvas ref={canvasElement} />
            </div>
            {grid && (
              <div
                className="grid-overlay"
                style={{ backgroundSize: `${20 * zoom}px ${20 * zoom}px` }}
              />
            )}
            {showGuides &&
              page.guides.map((g, i) => (
                <div
                  key={i}
                  className={`guide ${g.axis === 'x' ? 'vertical' : 'horizontal'}`}
                  style={g.axis === 'x' ? { left: g.position * zoom } : { top: g.position * zoom }}
                  title="Double-click to remove guide"
                  onDoubleClick={() =>
                    useEditor
                      .getState()
                      .updatePage({ guides: page.guides.filter((_, j) => i !== j) })
                  }
                />
              ))}
            {snapLines.x !== undefined && (
              <div className="snap-line vertical" style={{ left: snapLines.x * zoom }} />
            )}
            {snapLines.y !== undefined && (
              <div className="snap-line horizontal" style={{ top: snapLines.y * zoom }} />
            )}
          </div>
        </div>
      </div>
      <div className="stage-bottom">
        <span>
          <span className="status-dot" />
          All yours. All local.
        </span>
        <div className="zoom-control">
          <IconButton
            label="Zoom out"
            onClick={() => useEditor.getState().set({ zoom: Math.max(0.1, zoom - 0.1) })}
          >
            <Minus size={15} />
          </IconButton>
          <button onClick={() => fitRef.current()} title="Fit page">
            {Math.round(zoom * 100)}%
          </button>
          <IconButton
            label="Zoom in"
            onClick={() => useEditor.getState().set({ zoom: Math.min(3, zoom + 0.1) })}
          >
            <Plus size={15} />
          </IconButton>
          <span className="toolbar-divider" />
          <IconButton label="Fit to screen" onClick={() => fitRef.current()}>
            <Maximize size={15} />
          </IconButton>
        </div>
      </div>
      {context && (
        <div role="menu" className="context-menu" style={{ left: context.x, top: context.y }}>
          <button onClick={() => useEditor.getState().copy()}>
            <Copy size={16} />
            Copy<span>Ctrl C</span>
          </button>
          <button onClick={() => useEditor.getState().paste()}>
            Paste<span>Ctrl V</span>
          </button>
          <button onClick={() => useEditor.getState().duplicate()}>
            Duplicate<span>Ctrl D</span>
          </button>
          <button onClick={groupSelection}>
            <GroupIcon size={16} />
            Group<span>Ctrl G</span>
          </button>
          <button className="danger" onClick={() => useEditor.getState().remove()}>
            <Trash2 size={16} />
            Delete<span>Del</span>
          </button>
        </div>
      )}
    </main>
  );
}
