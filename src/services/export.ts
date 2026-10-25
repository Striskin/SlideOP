import { StaticCanvas } from 'fabric';
import { populate } from '../canvas/adapter';
import type { DesignDocument, Page } from '../model/document';
import { download } from './persistence';
import { walkElements } from '../model/document';
import { assetURL, blobDataURL, getAsset } from './assets';

export type ExportFormat = 'png' | 'jpeg' | 'svg' | 'pdf';
async function withPage<T>(page: Page, run: (canvas: StaticCanvas) => Promise<T> | T) {
  const canvas = new StaticCanvas(undefined, {
    width: page.width,
    height: page.height,
    enableRetinaScaling: false,
  });
  try {
    await populate(canvas, page);
    return await run(canvas);
  } finally {
    await canvas.dispose();
  }
}
export async function exportDesign(
  doc: DesignDocument,
  page: Page,
  format: ExportFormat,
  multiplier: number,
) {
  if (format === 'pdf') {
    const { jsPDF } = await import('jspdf');
    const first = doc.pages[0];
    const pdf = new jsPDF({
      orientation: first.width > first.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [first.width, first.height],
      hotfixes: ['px_scaling'],
    });
    for (let i = 0; i < doc.pages.length; i++) {
      const p = doc.pages[i];
      if (i) pdf.addPage([p.width, p.height], p.width > p.height ? 'landscape' : 'portrait');
      await withPage(p, (c) => {
        pdf.addImage(
          c.toDataURL({
            format: 'png',
            multiplier: Math.min(multiplier, 4096 / Math.max(p.width, p.height)),
          }),
          'PNG',
          0,
          0,
          p.width,
          p.height,
        );
      });
    }
    pdf.save(`${doc.name}.pdf`);
    return;
  }
  if (page.width * page.height * multiplier * multiplier > 40_000_000)
    throw new Error('Export is too large. Choose a smaller scale (maximum 40 megapixels).');
  await withPage(page, async (canvas) => {
    if (format === 'svg') {
      let svg = canvas.toSVG();
      const ids = new Set(
        walkElements(page.elements).flatMap((e) => (e.assetId ? [e.assetId] : [])),
      );
      for (const id of ids) {
        const asset = getAsset(id);
        if (!asset) throw new Error('An image asset is missing.');
        svg = svg.replaceAll(assetURL(id), await blobDataURL(asset.blob));
      }
      download(new Blob([svg], { type: 'image/svg+xml' }), `${doc.name}.svg`);
    } else {
      const url = canvas.toDataURL({ format, multiplier, quality: 0.95 });
      download(await (await fetch(url)).blob(), `${doc.name}.${format === 'jpeg' ? 'jpg' : 'png'}`);
    }
  });
}
