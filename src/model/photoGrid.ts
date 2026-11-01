import { makeElement, makePage } from './document';
import type { Asset, Page } from './document';
import { getTheme } from './themes';

export type PhotoGridOptions = {
  width: number;
  height: number;
  columns: number;
  gap: number;
  title: string;
  themeId: string;
  fit: 'cover' | 'contain';
  rounded: boolean;
};
export function createPhotoGrid(
  assets: Pick<Asset, 'id' | 'name' | 'width' | 'height'>[],
  options: PhotoGridOptions,
): Page {
  const { width, height, title, themeId, fit, rounded } = options;
  if (!assets.length || assets.length > 24) throw new Error('Choose between 1 and 24 images.');
  if (
    ![width, height, options.columns, options.gap].every(Number.isFinite) ||
    width < 100 ||
    height < 100 ||
    width > 8192 ||
    height > 8192 ||
    title.length > 100
  )
    throw new Error('Check the gallery dimensions and title.');
  const columns = Math.max(1, Math.min(6, Math.round(options.columns), assets.length));
  const gap = Math.max(0, Math.min(120, options.gap)),
    rows = Math.ceil(assets.length / columns);
  const margin = Math.min(width, height) * 0.055;
  const header = title.trim() ? Math.min(height * 0.17, 120) : 0;
  const cellW = (width - margin * 2 - gap * (columns - 1)) / columns;
  const cellH = (height - margin * 2 - header - gap * (rows - 1)) / rows;
  if (cellW < 30 || cellH < 30)
    throw new Error('Use fewer images, a smaller gap, or a larger page.');
  const theme = getTheme(themeId),
    page = makePage(width, height);
  page.name = title.trim() || 'Photo gallery';
  page.background = theme.background;
  if (title.trim())
    page.elements.push(
      makeElement('text', {
        name: 'Gallery title',
        text: title.trim(),
        x: margin,
        y: margin,
        width: width - margin * 2,
        height: header * 0.8,
        fontFamily: theme.headingFont,
        fontWeight: 'bold',
        fontSize: Math.min(56, header * 0.45),
        fill: theme.ink,
        layoutPart: true,
        themeRole: 'ink',
      }),
    );
  assets.forEach((asset, i) => {
    const zoom =
      fit === 'cover'
        ? Math.max(cellW / asset.width, cellH / asset.height)
        : Math.min(cellW / asset.width, cellH / asset.height);
    if (!Number.isFinite(zoom) || zoom < 0.001 || zoom > 100)
      throw new Error(
        'An image is too small or too large for these cells. Change the grid size or choose another image.',
      );
    const w = fit === 'cover' ? cellW / zoom : asset.width;
    const h = fit === 'cover' ? cellH / zoom : asset.height;
    page.elements.push(
      makeElement('image', {
        name: asset.name,
        assetId: asset.id,
        x: margin + (i % columns) * (cellW + gap) + (cellW - w * zoom) / 2,
        y: margin + header + Math.floor(i / columns) * (cellH + gap) + (cellH - h * zoom) / 2,
        width: w,
        height: h,
        scaleX: zoom,
        scaleY: zoom,
        cropX: (asset.width - w) / 2,
        cropY: (asset.height - h) / 2,
        ...(rounded
          ? { clip: { x: 0, y: 0, width: w, height: h, shape: 'rounded', roundness: 0.08 } }
          : {}),
      }),
    );
  });
  return page;
}
