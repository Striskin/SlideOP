import { describe, expect, it } from 'vitest';
import { makeElement, newDocument, validateDocument } from './document';
import { fontNames } from './fonts';
import { shapePresets, regularPolygon } from './shapes';

describe('expanded editor catalogs', () => {
  it('serializes every built-in shape and font through the owned document schema', () => {
    const doc = newDocument();
    doc.pages[0].elements = [
      ...shapePresets.map((s) => makeElement(s.kind, s.properties)),
      ...fontNames.map((fontFamily) => makeElement('text', { fontFamily })),
    ];
    expect(validateDocument(JSON.parse(JSON.stringify(doc)))).toEqual(doc);
    expect(shapePresets).toHaveLength(24);
    expect(fontNames).toHaveLength(26);
  });
  it('bounds custom polygons and produces evenly spaced vertices', () => {
    expect(regularPolygon(2)).toHaveLength(3);
    expect(regularPolygon(99)).toHaveLength(24);
    for (const point of regularPolygon(7))
      expect(Math.hypot(point.x - 100, point.y - 100)).toBeCloseTo(100);
  });
});
