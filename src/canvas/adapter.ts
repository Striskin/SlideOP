import {
  Canvas,
  StaticCanvas,
  FabricObject,
  Rect,
  Ellipse,
  Triangle,
  Line,
  Polygon,
  Textbox,
  FabricImage,
  Group,
  Gradient,
  Shadow,
  util,
  Point,
  LayoutManager,
  FixedLayout,
} from 'fabric';
import type { Element, Page } from '../model/document';
import { makeElement } from '../model/document';
import { assetURL } from '../services/assets';

export type DesignObject = FabricObject & { elementId?: string; sourceElement?: Element };
export const objectId = (object: FabricObject) => (object as DesignObject).elementId ?? '';
type AssetResolver = (id: string) => string;
export async function toFabric(
  e: Element,
  resolveAsset: AssetResolver = assetURL,
): Promise<DesignObject> {
  let object: FabricObject;
  if (e.kind === 'text')
    object = new Textbox(e.text ?? '', {
      width: e.width,
      fontFamily: e.fontFamily ?? 'Arial',
      fontSize: e.fontSize ?? 48,
      fontWeight: e.fontWeight ?? 'normal',
      fontStyle: e.fontStyle ?? 'normal',
      underline: e.underline,
      textAlign: e.textAlign ?? 'left',
      charSpacing: e.charSpacing ?? 0,
      lineHeight: e.lineHeight ?? 1.16,
      splitByGrapheme: false,
    });
  else if (e.kind === 'ellipse') object = new Ellipse({ rx: e.width / 2, ry: e.height / 2 });
  else if (e.kind === 'triangle') object = new Triangle({ width: e.width, height: e.height });
  else if (e.kind === 'line') object = new Line([0, 0, e.width, 0]);
  else if (e.kind === 'arrow')
    object = new Polygon([
      { x: 0, y: e.height * 0.36 },
      { x: e.width * 0.65, y: e.height * 0.36 },
      { x: e.width * 0.65, y: 0 },
      { x: e.width, y: e.height / 2 },
      { x: e.width * 0.65, y: e.height },
      { x: e.width * 0.65, y: e.height * 0.64 },
      { x: 0, y: e.height * 0.64 },
    ]);
  else if (e.kind === 'polygon') {
    const points =
      e.points ??
      Array.from({ length: 6 }, (_, i) => ({
        x: Math.cos((i * Math.PI) / 3),
        y: Math.sin((i * Math.PI) / 3),
      }));
    const minX = Math.min(...points.map((p) => p.x)),
      minY = Math.min(...points.map((p) => p.y));
    const spanX = Math.max(...points.map((p) => p.x)) - minX,
      spanY = Math.max(...points.map((p) => p.y)) - minY;
    // Normalize intrinsic bounds so serialize/rebuild cycles cannot shrink a polygon.
    object = new Polygon(
      points.map((p) => ({
        x: ((p.x - minX) / Math.max(spanX, 0.001)) * e.width,
        y: ((p.y - minY) / Math.max(spanY, 0.001)) * e.height,
      })),
    );
  } else if (e.kind === 'image') {
    object = await FabricImage.fromURL(resolveAsset(e.assetId!));
    object.set({ width: e.width, height: e.height, cropX: e.cropX ?? 0, cropY: e.cropY ?? 0 });
  } else if (e.kind === 'group') {
    const children = await Promise.all(
      (e.children ?? []).map((child) => toFabric(child, resolveAsset)),
    );
    object = new Group(children, {
      width: e.width,
      height: e.height,
      layoutManager: new LayoutManager(new FixedLayout()),
    });
    // Children in the owned format are already in group-local coordinates.
    children.forEach((child, i) => child.set({ left: e.children![i].x, top: e.children![i].y }));
  } else object = new Rect({ width: e.width, height: e.height, rx: e.radius, ry: e.radius });
  object.set({
    originX: 'left',
    originY: 'top',
    left: e.x,
    top: e.y,
    scaleX: e.scaleX,
    scaleY: e.scaleY,
    angle: e.rotation,
    skewX: e.skewX,
    skewY: e.skewY,
    flipX: e.flipX,
    flipY: e.flipY,
    fill: e.fill,
    stroke: e.stroke,
    strokeWidth: e.strokeWidth,
    opacity: e.opacity,
    visible: e.visible,
    selectable: !e.locked,
    evented: !e.locked,
    lockMovementX: e.locked,
    lockMovementY: e.locked,
    lockRotation: e.locked,
    lockScalingX: e.locked,
    lockScalingY: e.locked,
    cornerColor: '#ffffff',
    cornerStrokeColor: '#8462df',
    borderColor: '#8462df',
    cornerSize: 9,
    transparentCorners: false,
    padding: 0,
  });
  if (e.gradient && e.kind !== 'image') {
    const rad = (e.gradient.angle * Math.PI) / 180;
    object.set(
      'fill',
      new Gradient({
        type: 'linear',
        gradientUnits: 'percentage',
        coords: {
          x1: 0.5 - Math.cos(rad) / 2,
          y1: 0.5 - Math.sin(rad) / 2,
          x2: 0.5 + Math.cos(rad) / 2,
          y2: 0.5 + Math.sin(rad) / 2,
        },
        colorStops: [
          { offset: 0, color: e.fill },
          { offset: 1, color: e.gradient.end },
        ],
      }),
    );
  }
  if (e.shadow)
    object.set(
      'shadow',
      new Shadow({
        color: e.shadow.color,
        blur: e.shadow.blur,
        offsetX: e.shadow.x,
        offsetY: e.shadow.y,
      }),
    );
  const result = object as DesignObject;
  result.elementId = e.id;
  result.sourceElement = e;
  object.setCoords();
  return result;
}
export function fromFabric(object: FabricObject, world = false): Element {
  const obj = object as DesignObject;
  const source = obj.sourceElement ?? makeElement(object instanceof Group ? 'group' : 'rect');
  let x = object.left,
    y = object.top,
    scaleX = object.scaleX,
    scaleY = object.scaleY,
    rotation = object.angle,
    skewX = object.skewX,
    skewY = object.skewY,
    flipX = object.flipX,
    flipY = object.flipY;
  if (world && object.group) {
    const matrix = object.calcTransformMatrix();
    const d = util.qrDecompose(matrix);
    const detached = new Rect({
      width: object.width,
      height: object.height,
      strokeWidth: object.strokeWidth,
      originX: 'left',
      originY: 'top',
      scaleX: d.scaleX,
      scaleY: Math.abs(d.scaleY),
      angle: d.angle,
      skewX: d.skewX,
      flipY: d.scaleY < 0,
    });
    detached.setPositionByOrigin(new Point(d.translateX, d.translateY), 'center', 'center');
    x = detached.left;
    y = detached.top;
    scaleX = detached.scaleX;
    scaleY = detached.scaleY;
    rotation = detached.angle;
    skewX = detached.skewX;
    skewY = 0;
    flipX = false;
    flipY = detached.flipY;
  }
  const e: Element = {
    ...source,
    x,
    y,
    width: Math.max(1, object.width),
    height: Math.max(1, object.height),
    scaleX,
    scaleY,
    rotation,
    skewX,
    skewY,
    flipX,
    flipY,
  };
  if (object instanceof Textbox)
    Object.assign(e, {
      text: object.text,
      fontSize: object.fontSize,
      width: object.width,
      height: object.height,
    });
  if (object instanceof Group) e.children = object.getObjects().map((child) => fromFabric(child));
  return e;
}
export async function populate(canvas: StaticCanvas, page: Page, resolveAsset?: AssetResolver) {
  const objects = await Promise.all(page.elements.map((e) => toFabric(e, resolveAsset)));
  canvas.clear();
  canvas.backgroundColor = page.background;
  canvas.add(...objects);
  canvas.renderAll();
}
export async function renderPage(
  page: Page,
  maxWidth?: number,
  resolveAsset?: AssetResolver,
): Promise<string> {
  const scale = maxWidth ? Math.min(1, maxWidth / page.width) : 1;
  const canvas = new StaticCanvas(undefined, {
    width: Math.round(page.width * scale),
    height: Math.round(page.height * scale),
    enableRetinaScaling: false,
  });
  try {
    canvas.setZoom(scale);
    await populate(canvas, page, resolveAsset);
    return canvas.toDataURL({ format: 'png', multiplier: 1 });
  } finally {
    await canvas.dispose();
  }
}
export let liveCanvas: Canvas | null = null;
export function setLiveCanvas(canvas: Canvas | null) {
  liveCanvas = canvas;
}
