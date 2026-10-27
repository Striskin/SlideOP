import { describe, expect, it } from 'vitest';
import { makeElement, newDocument, validateDocument } from './document';
import { removeAssetElements, removeDocumentAsset } from './assetRemoval';

describe('permanent asset reference removal', () => {
  it('removes nested placements and empty groups without mutating the original document', () => {
    const doc = newDocument(),
      image = makeElement('image', { assetId: 'deleted' });
    doc.pages[0].elements = [
      makeElement('group', { children: [makeElement('group', { children: [image] })] }),
      makeElement('rect'),
    ];
    const cleaned = removeDocumentAsset(doc, 'deleted');
    expect(cleaned.pages[0].elements.map((e) => e.kind)).toEqual(['rect']);
    expect(doc.pages[0].elements).toHaveLength(2);
    expect(validateDocument(cleaned)).toEqual(cleaned);
  });
  it('preserves unrelated images and the remaining children and transform of a group', () => {
    const keep = makeElement('image', { assetId: 'kept' }),
      group = makeElement('group', {
        x: 250,
        rotation: 37,
        children: [makeElement('image', { assetId: 'deleted' }), keep],
      });
    const cleaned = removeAssetElements([group], 'deleted');
    expect(cleaned[0]).toMatchObject({ x: 250, rotation: 37, children: [keep] });
    expect(cleaned[0].children![0]).toBe(keep);
    expect(group.children).toHaveLength(2);
  });
  it('shares unchanged documents and arrays', () => {
    const doc = newDocument();
    doc.pages[0].elements = [makeElement('rect')];
    expect(removeDocumentAsset(doc, 'missing')).toBe(doc);
    expect(removeAssetElements(doc.pages[0].elements, 'missing')).toBe(doc.pages[0].elements);
  });
});
