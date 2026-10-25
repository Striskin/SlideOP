import { StaticCanvas, Textbox } from 'fabric';
import type { Page } from '../model/document';
import { objectId, populate } from '../canvas/adapter';

export type Warning = {
  id: string;
  kind: 'bounds' | 'overlap' | 'contrast' | 'alignment' | 'overflow';
  title: string;
  detail: string;
};
export function contrast(a: string, b: string) {
  const luminance = (hex: string) => {
    const c = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
  };
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export async function checkPage(page: Page): Promise<Warning[]> {
  const canvas = new StaticCanvas(undefined, { width: page.width, height: page.height });
  const warnings: Warning[] = [];
  try {
    await populate(canvas, page);
    const objects = canvas.getObjects().filter((o) => o.visible);
    const boxes = objects.map((o) => o.getBoundingRect());
    objects.forEach((o, i) => {
      const b = boxes[i],
        e = page.elements.find((e) => e.id === objectId(o))!;
      if (
        b.left < -0.5 ||
        b.top < -0.5 ||
        b.left + b.width > page.width + 0.5 ||
        b.top + b.height > page.height + 0.5
      )
        warnings.push({
          id: e.id,
          kind: 'bounds',
          title: 'Outside the page',
          detail: `“${e.name}” extends beyond the page. Move or resize it.`,
        });
      if (o instanceof Textbox) {
        if (o.height > e.height + 2 || o.width > e.width + 2)
          warnings.push({
            id: e.id,
            kind: 'overflow',
            title: 'Text exceeds its box',
            detail: `“${e.name}” needs more room. Widen it or reduce the font size.`,
          });
        const ratio = contrast(e.fill, page.background);
        if (!e.gradient && ratio < 3)
          warnings.push({
            id: e.id,
            kind: 'contrast',
            title: 'Low text contrast',
            detail: `“${e.name}” has ${ratio.toFixed(1)}:1 contrast against the page. Try a darker or lighter color.`,
          });
      }
      for (let j = 0; j < i; j++) {
        const c = boxes[j],
          other = objects[j];
        const width = Math.min(b.left + b.width, c.left + c.width) - Math.max(b.left, c.left),
          height = Math.min(b.top + b.height, c.top + c.height) - Math.max(b.top, c.top);
        if (o instanceof Textbox && other instanceof Textbox && width > 5 && height > 5)
          warnings.push({
            id: e.id,
            kind: 'overlap',
            title: 'Text boxes overlap',
            detail: `“${e.name}” overlaps another text box. Check readability.`,
          });
        const diff = Math.abs(b.left - c.left);
        if (diff > 1 && diff < 6 && height < 0)
          warnings.push({
            id: e.id,
            kind: 'alignment',
            title: 'Nearly aligned edges',
            detail: `“${e.name}” is ${Math.round(diff)} px from another left edge. Use Align left.`,
          });
      }
    });
    return warnings.slice(0, 100);
  } finally {
    await canvas.dispose();
  }
}
