import { describe, expect, it } from 'vitest';
import { makeElement, newDocument, validateDocument } from './document';
import { insertMaskPoint, maskPath, presetMask, smoothNodes } from './masks';

describe('editable creative crop masks', () => {
  it('round-trips every preset without relying on Fabric serialization', () => {
    const doc = newDocument();
    doc.pages[0].elements = ['rect', 'ellipse', 'rounded', 'heart', 'star', 'polygon'].map((name) =>
      makeElement('rect', { clip: { x: 0, y: 0, width: 200, height: 160, ...presetMask(name) } }),
    );
    expect(validateDocument(JSON.parse(JSON.stringify(doc)))).toEqual(doc);
    expect(maskPath(presetMask('heart'), 200, 160)).toContain('C ');
  });
  it('rejects missing points, incomplete curve handles, and oversized paths', () => {
    const doc = newDocument();
    const clip = { x: 0, y: 0, width: 200, height: 160, ...presetMask('star') };
    doc.pages[0].elements = [makeElement('rect', { clip })];
    clip.nodes = undefined;
    expect(() => validateDocument(doc)).toThrow();
    clip.nodes = [
      { x: 0, y: 0, inX: 0 },
      { x: 1, y: 0 },
      { x: 0.5, y: 1 },
    ];
    expect(() => validateDocument(doc)).toThrow();
    clip.nodes = Array.from({ length: 65 }, () => ({ x: 0.5, y: 0.5 }));
    expect(() => validateDocument(doc)).toThrow();
  });
  it('subdivides curves without changing their geometry and smooths corners', () => {
    const nodes = presetMask('heart').nodes!;
    const next = insertMaskPoint(nodes, 0);
    const a = nodes[0],
      b = nodes[1];
    const midpoint = (x: number, p: number, q: number, y: number) => (x + 3 * p + 3 * q + y) / 8;
    expect(next[1].x).toBeCloseTo(midpoint(a.x, a.outX!, b.inX!, b.x));
    expect(next[1].y).toBeCloseTo(midpoint(a.y, a.outY!, b.inY!, b.y));
    expect(nodes).toHaveLength(4);
    expect(next).toHaveLength(5);
    expect(smoothNodes(presetMask('star').nodes!)[0].outX).toBeDefined();
  });
});
