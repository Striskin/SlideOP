import type { Element } from './document';

export type CropMask = NonNullable<Element['clip']>;
export type MaskNode = NonNullable<CropMask['nodes']>[number];
export type MaskDesign = Pick<CropMask, 'shape' | 'roundness' | 'nodes'>;
export const clampUnit = (v: number) => Math.max(0, Math.min(1, v));

export function smoothNodes(nodes: MaskNode[], amount = 1): MaskNode[] {
  return nodes.map((n, i) => {
    const previous = nodes[(i + nodes.length - 1) % nodes.length];
    const next = nodes[(i + 1) % nodes.length];
    const dx = ((next.x - previous.x) * amount) / 6;
    const dy = ((next.y - previous.y) * amount) / 6;
    return { x: n.x, y: n.y, inX: n.x - dx, inY: n.y - dy, outX: n.x + dx, outY: n.y + dy };
  });
}

export function presetMask(name: string): MaskDesign {
  if (name === 'rect' || name === 'ellipse') return { shape: name };
  if (name === 'rounded') return { shape: 'rounded', roundness: 0.2 };
  if (name === 'heart')
    return {
      shape: 'path',
      nodes: [
        { x: 0.5, y: 0.22, inX: 0.1, inY: 0.04, outX: 0.9, outY: 0.04 },
        { x: 0.95, y: 0.38, inX: 0.95, inY: 0.02, outX: 0.95, outY: 0.58 },
        { x: 0.5, y: 0.98, inX: 0.76, inY: 0.72, outX: 0.24, outY: 0.72 },
        { x: 0.05, y: 0.38, inX: 0.05, inY: 0.58, outX: 0.05, outY: 0.02 },
      ],
    };
  const count = name === 'star' ? 10 : 6;
  return {
    shape: 'path',
    nodes: Array.from({ length: count }, (_, i) => {
      const angle = -Math.PI / 2 + (i * Math.PI * 2) / count;
      const radius = name === 'star' && i % 2 ? 0.22 : 0.48;
      return { x: 0.5 + Math.cos(angle) * radius, y: 0.5 + Math.sin(angle) * radius };
    }),
  };
}

// Generate our own bounded path data. Imported SVG or executable strings are never accepted.
export function maskPath(mask: MaskDesign, width: number, height: number): string {
  const nodes = mask.nodes;
  if (!nodes || nodes.length < 3) return '';
  const xy = (x: number, y: number) => `${x * width} ${y * height}`;
  return (
    `M ${xy(nodes[0].x, nodes[0].y)} ` +
    nodes
      .map((a, i) => {
        const b = nodes[(i + 1) % nodes.length];
        return `C ${xy(a.outX ?? a.x, a.outY ?? a.y)} ${xy(b.inX ?? b.x, b.inY ?? b.y)} ${xy(b.x, b.y)}`;
      })
      .join(' ') +
    ' Z'
  );
}

export function insertMaskPoint(nodes: MaskNode[], index: number): MaskNode[] {
  const a = nodes[index],
    b = nodes[(index + 1) % nodes.length];
  const mid = (p: number, q: number) => (p + q) / 2;
  // De Casteljau subdivision keeps the original curve exactly intact.
  const p = { x: a.outX ?? a.x, y: a.outY ?? a.y };
  const q = { x: b.inX ?? b.x, y: b.inY ?? b.y };
  const u = { x: mid(a.x, p.x), y: mid(a.y, p.y) };
  const v = { x: mid(p.x, q.x), y: mid(p.y, q.y) };
  const w = { x: mid(q.x, b.x), y: mid(q.y, b.y) };
  const l = { x: mid(u.x, v.x), y: mid(u.y, v.y) };
  const r = { x: mid(v.x, w.x), y: mid(v.y, w.y) };
  const n = { x: mid(l.x, r.x), y: mid(l.y, r.y), inX: l.x, inY: l.y, outX: r.x, outY: r.y };
  const next = nodes.map((node, i) => ({
    ...node,
    ...(i === index ? { outX: u.x, outY: u.y } : {}),
    ...(i === (index + 1) % nodes.length ? { inX: w.x, inY: w.y } : {}),
  }));
  next.splice(index + 1, 0, n);
  return next;
}
