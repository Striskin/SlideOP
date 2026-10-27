import type { Element } from './document';

export type CropRect = { x: number; y: number; width: number; height: number };
export const canCrop = (element: Element) => element.kind !== 'line' && !element.locked;
export function constrainCrop(rect: CropRect, width: number, height: number): CropRect {
  const w = Math.max(1, Math.min(width, rect.width));
  const h = Math.max(1, Math.min(height, rect.height));
  return {
    x: Math.max(0, Math.min(width - w, rect.x)),
    y: Math.max(0, Math.min(height - h, rect.y)),
    width: w,
    height: h,
  };
}
export function ratioCrop(rect: CropRect, ratio: number, width: number, height: number): CropRect {
  let w = rect.width,
    h = w / ratio;
  if (h > rect.height) {
    h = rect.height;
    w = h * ratio;
  }
  return constrainCrop(
    { x: rect.x + (rect.width - w) / 2, y: rect.y + (rect.height - h) / 2, width: w, height: h },
    width,
    height,
  );
}
export function cropPatch(element: Element, rect: CropRect): Partial<Element> {
  // Keep the displayed width. Adjust height with the same zoom to avoid distortion.
  return {
    cropX: rect.x,
    cropY: rect.y,
    width: rect.width,
    height: rect.height,
    scaleX: (element.width * element.scaleX) / rect.width,
    scaleY: (element.scaleY * element.width) / rect.width,
  };
}
