import { describe, expect, it } from 'vitest';
import { newDocument, validateDocument } from './document';
import { createPhotoGrid } from './photoGrid';
import type { PhotoGridOptions } from './photoGrid';

const options: PhotoGridOptions = {
  width: 1280,
  height: 720,
  columns: 2,
  gap: 20,
  title: 'Gallery',
  themeId: 'studio',
  fit: 'cover',
  rounded: true,
};
const assets = [
  { id: 'wide', name: 'Landscape', width: 1200, height: 600 },
  { id: 'tall', name: 'Portrait', width: 600, height: 1200 },
];
describe('automatic photo grids', () => {
  it('center crops without distortion, keeps assets reusable, and validates as an editable document', () => {
    const page = createPhotoGrid(assets, options),
      images = page.elements.filter((e) => e.kind === 'image');
    expect(images).toHaveLength(2);
    for (const image of images) {
      const source = assets.find((a) => a.id === image.assetId)!;
      expect(image.scaleX).toBe(image.scaleY);
      expect(image.cropX! + image.width).toBeLessThanOrEqual(source.width);
      expect(image.cropY! + image.height).toBeLessThanOrEqual(source.height);
      expect(image.clip?.shape).toBe('rounded');
    }
    const doc = newDocument();
    doc.pages = [page];
    expect(validateDocument(doc)).toEqual(doc);
  });
  it('contain preserves full images and bounds stay on the page', () => {
    const page = createPhotoGrid(assets, { ...options, fit: 'contain', title: '', rounded: false });
    expect(page.elements).toHaveLength(2);
    page.elements.forEach((e, i) => {
      expect(e.width).toBe(assets[i].width);
      expect(e.height).toBe(assets[i].height);
      expect(e.x + e.width * e.scaleX).toBeLessThan(page.width);
      expect(e.y + e.height * e.scaleY).toBeLessThan(page.height);
    });
  });
  it('rejects impossible grids instead of creating invalid geometry', () => {
    expect(() => createPhotoGrid([], options)).toThrow();
    expect(() =>
      createPhotoGrid(
        Array.from({ length: 24 }, () => assets[0]),
        { ...options, width: 100, height: 100, gap: 120 },
      ),
    ).toThrow();
    expect(() => createPhotoGrid([{ ...assets[0], width: 1, height: 1 }], options)).toThrow();
  });
});
