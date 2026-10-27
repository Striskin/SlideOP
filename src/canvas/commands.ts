import { ActiveSelection, Group, Textbox } from 'fabric';
import { liveCanvas, fromFabric, objectId } from './adapter';
import type { DesignObject } from './adapter';
import { currentPage, useEditor } from '../store/editor';
import { makeElement, cloneElements } from '../model/document';
import { produce } from 'immer';
import { editScope } from '../model/scope';

export function finishTextEditing() {
  const active = liveCanvas?.getActiveObject();
  if (active instanceof Textbox && active.isEditing) active.exitEditing();
}

export function captureEditingDocument() {
  const state = useEditor.getState(),
    canvas = liveCanvas;
  const active = canvas?.getActiveObject();
  if (!canvas || !(active instanceof Textbox) || !active.isEditing) return state.document;
  const elements = canvas.getObjects().map((object) => fromFabric(object, true));
  // Persist the draft without changing selection, undo history, or the live text object.
  return produce(state.document, (draft) => {
    editScope(draft, state.pageId, state.scopePath, (page) => {
      page.elements = elements;
    });
    draft.updatedAt = new Date().toISOString();
  });
}

export function commitCanvas() {
  if (!liveCanvas) return;
  useEditor.getState().replaceElements(liveCanvas.getObjects().map((obj) => fromFabric(obj, true)));
}
export function groupSelection() {
  const canvas = liveCanvas;
  if (!canvas) return;
  const selected = canvas.getActiveObjects();
  if (selected.length < 2 || selected.some((o) => (o as DesignObject).sourceElement?.locked))
    return;
  canvas.discardActiveObject();
  const index = Math.min(...selected.map((o) => canvas.getObjects().indexOf(o)));
  selected.forEach((o) => canvas.remove(o));
  const group = new Group(selected, { originX: 'left', originY: 'top' }) as DesignObject;
  group.elementId = crypto.randomUUID();
  group.sourceElement = makeElement('group', { id: group.elementId, name: 'Group' });
  canvas.insertAt(index, group);
  canvas.setActiveObject(group);
  commitCanvas();
  useEditor.getState().select([group.elementId]);
}
export function ungroupSelection() {
  const canvas = liveCanvas;
  if (!canvas) return;
  const group = canvas.getActiveObject();
  if (!(group instanceof Group) || group instanceof ActiveSelection) return;
  if ((group as DesignObject).sourceElement?.clip) {
    useEditor
      .getState()
      .set({ toast: 'Reset the group crop before ungrouping to preserve its appearance.' });
    return;
  }
  const elements = group.getObjects().map((o) => ({
    ...fromFabric(o, true),
    opacity: o.opacity * group.opacity,
    visible: o.visible && group.visible,
  }));
  const id = objectId(group);
  const page = currentPage();
  useEditor.getState().replaceElements(page.elements.flatMap((e) => (e.id === id ? elements : e)));
  useEditor.getState().select(elements.map((e) => e.id));
}
export function alignSelection(
  mode: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'horizontal' | 'vertical',
) {
  const canvas = liveCanvas;
  if (!canvas) return;
  const objects = canvas
    .getActiveObjects()
    .filter((o) => !(o as DesignObject).sourceElement?.locked);
  if (!objects.length) return;
  const ids = objects.map(objectId);
  canvas.discardActiveObject();
  const page = currentPage();
  const boxes = objects.map((o) => o.getBoundingRect());
  const left = objects.length === 1 ? 0 : Math.min(...boxes.map((b) => b.left)),
    top = objects.length === 1 ? 0 : Math.min(...boxes.map((b) => b.top));
  const right = objects.length === 1 ? page.width : Math.max(...boxes.map((b) => b.left + b.width)),
    bottom = objects.length === 1 ? page.height : Math.max(...boxes.map((b) => b.top + b.height));
  if (mode === 'horizontal' || mode === 'vertical') {
    if (objects.length < 3) {
      useEditor.getState().set({ toast: 'Select at least three objects to distribute.' });
      return;
    }
    const horizontal = mode === 'horizontal';
    const sorted = [...objects].sort((a, b) =>
      horizontal
        ? a.getBoundingRect().left - b.getBoundingRect().left
        : a.getBoundingRect().top - b.getBoundingRect().top,
    );
    const total = boxes.reduce((sum, b) => sum + (horizontal ? b.width : b.height), 0),
      gap = ((horizontal ? right - left : bottom - top) - total) / (objects.length - 1);
    let cursor = horizontal ? left : top;
    sorted.forEach((o) => {
      const b = o.getBoundingRect();
      o.set(
        horizontal ? 'left' : 'top',
        (horizontal ? o.left : o.top) + cursor - (horizontal ? b.left : b.top),
      );
      cursor += (horizontal ? b.width : b.height) + gap;
      o.setCoords();
    });
  } else
    objects.forEach((o, i) => {
      const b = boxes[i];
      if (['left', 'center', 'right'].includes(mode))
        o.left +=
          (mode === 'left'
            ? left
            : mode === 'center'
              ? (left + right - b.width) / 2
              : right - b.width) - b.left;
      else
        o.top +=
          (mode === 'top'
            ? top
            : mode === 'middle'
              ? (top + bottom - b.height) / 2
              : bottom - b.height) - b.top;
      o.setCoords();
    });
  canvas.setActiveObject(
    objects.length === 1 ? objects[0] : new ActiveSelection(objects, { canvas }),
  );
  commitCanvas();
  useEditor.getState().select(ids);
  canvas.requestRenderAll();
}

export function tidySelection(columns: number, gap: number) {
  const canvas = liveCanvas;
  if (!canvas) return;
  const objects = canvas
    .getActiveObjects()
    .filter((o) => !(o as DesignObject).sourceElement?.locked);
  if (objects.length < 2) return;
  canvas.discardActiveObject();
  objects.sort((a, b) => a.top - b.top || a.left - b.left);
  const boxes = objects.map((o) => o.getBoundingRect());
  const cols = Math.max(1, Math.min(objects.length, Math.floor(columns))),
    rows = Math.ceil(objects.length / cols),
    spacing = Math.max(0, Math.min(500, gap));
  const widths = Array.from({ length: cols }, (_, col) =>
    Math.max(...boxes.filter((_, i) => i % cols === col).map((b) => b.width)),
  );
  const heights = Array.from({ length: rows }, (_, row) =>
    Math.max(...boxes.slice(row * cols, (row + 1) * cols).map((b) => b.height)),
  );
  const left = Math.min(...boxes.map((b) => b.left)),
    top = Math.min(...boxes.map((b) => b.top));
  objects.forEach((object, i) => {
    const col = i % cols,
      row = Math.floor(i / cols),
      box = boxes[i];
    object.left +=
      left + widths.slice(0, col).reduce((sum, w) => sum + w, 0) + col * spacing - box.left;
    object.top +=
      top + heights.slice(0, row).reduce((sum, h) => sum + h, 0) + row * spacing - box.top;
    object.setCoords();
  });
  commitCanvas();
  useEditor.getState().select(objects.map(objectId));
}

export function repeatSelection(columns: number, rows: number, gap: number) {
  const canvas = liveCanvas;
  if (!canvas) return;
  const objects = canvas
    .getActiveObjects()
    .filter((o) => !(o as DesignObject).sourceElement?.locked);
  if (!objects.length) return;
  canvas.discardActiveObject();
  const boxes = objects.map((o) => o.getBoundingRect()),
    left = Math.min(...boxes.map((b) => b.left)),
    top = Math.min(...boxes.map((b) => b.top));
  const width = Math.max(...boxes.map((b) => b.left + b.width)) - left,
    height = Math.max(...boxes.map((b) => b.top + b.height)) - top;
  const cols = Math.max(1, Math.min(10, Math.floor(columns))),
    rowCount = Math.max(1, Math.min(10, Math.floor(rows))),
    spacing = Math.max(0, Math.min(500, gap));
  const base = objects.map((o) => fromFabric(o, true)),
    page = currentPage();
  if (page.elements.length + base.length * (cols * rowCount - 1) > 2000) {
    useEditor.getState().set({ toast: 'Repeat would exceed the 2,000 objects per page limit.' });
    return;
  }
  const copies = [];
  for (let row = 0; row < rowCount; row++)
    for (let col = 0; col < cols; col++) {
      if (!row && !col) continue;
      copies.push(
        ...cloneElements(base, 0).map((e) => ({
          ...e,
          x: e.x + col * (width + spacing),
          y: e.y + row * (height + spacing),
        })),
      );
    }
  useEditor.getState().replaceElements([...page.elements, ...copies]);
  useEditor.getState().select([...base, ...copies].map((e) => e.id));
}
