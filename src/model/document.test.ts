import { describe, expect, it } from 'vitest';
import {
  cloneElements,
  makeElement,
  newDocument,
  starterDocument,
  validateDocument,
} from './document';

describe('owned document format', () => {
  it('round-trips a complete design without Fabric serialization', () => {
    const doc = starterDocument();
    const imported = validateDocument(JSON.parse(JSON.stringify(doc)));
    expect(imported).toEqual(doc);
    expect(imported.version).toBe(1);
  });
  it('rejects unsupported versions, duplicate IDs and invalid transforms', () => {
    const doc = newDocument();
    expect(() => validateDocument({ ...doc, version: 2 })).toThrow();
    const e = makeElement('rect');
    doc.pages[0].elements = [e, { ...e }];
    expect(() => validateDocument(doc)).toThrow(/duplicate/);
    doc.pages[0].elements = [{ ...e, scaleX: -1 }];
    expect(() => validateDocument(doc)).toThrow();
  });
  it('rejects unsafe fill values and missing image references', () => {
    const doc = newDocument();
    doc.pages[0].elements = [makeElement('rect', { fill: 'url(https://example.com/evil.svg)' })];
    expect(() => validateDocument(doc)).toThrow();
    doc.pages[0].elements = [makeElement('image')];
    expect(() => validateDocument(doc)).toThrow(/asset/);
  });
  it('limits recursion before schema traversal', () => {
    const bad: { child?: unknown } = {};
    let pointer = bad;
    for (let i = 0; i < 25; i++) {
      const child = {};
      pointer.child = child;
      pointer = child;
    }
    expect(() => validateDocument(bad)).toThrow(/complex/);
  });
  it('duplicates nested groups with fresh IDs while sharing image references', () => {
    const child = makeElement('image', { assetId: 'shared-asset' }),
      group = makeElement('group', { children: [child] });
    const [copy] = cloneElements([group]);
    expect(copy.id).not.toBe(group.id);
    expect(copy.children![0].id).not.toBe(child.id);
    expect(copy.children![0].assetId).toBe(child.assetId);
    expect(copy.x).toBe(group.x + 24);
    expect(copy.children![0].x).toBe(child.x);
  });
});
