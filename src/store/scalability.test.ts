import { expect, it } from 'vitest';
import { useEditor } from './editor';
import { makeElement, makePage, newDocument } from '../model/document';

it('shares unchanged pages and objects across a 5,000-object edit history', () => {
  const doc = newDocument();
  doc.pages = Array.from({ length: 25 }, () => {
    const page = makePage();
    page.elements = Array.from({ length: 200 }, (_, i) => makeElement('rect', { x: i * 2 }));
    return page;
  });
  useEditor.getState().load(doc);
  const id = doc.pages[0].elements[0].id,
    start = performance.now();
  for (let i = 0; i < 40; i++) useEditor.getState().update([id], { x: i + 1 });
  const elapsed = performance.now() - start,
    s = useEditor.getState();
  expect(s.document.pages[1]).toBe(doc.pages[1]);
  expect(s.document.pages[0].elements[1]).toBe(doc.pages[0].elements[1]);
  expect(s.past).toHaveLength(40);
  const references = new Set(
    s.past.flatMap((snapshot) => snapshot.document.pages.flatMap((p) => p.elements)),
  );
  expect(references.size).toBeLessThanOrEqual(5040);
  expect(doc.pages[0].elements[0].x).toBe(0);
  const before = s.document;
  s.update([id], { x: 40 });
  expect(useEditor.getState().document).toBe(before);
  console.info(
    `Scalability: 25 pages / 5,000 objects / 40 edits in ${elapsed.toFixed(1)} ms; ${references.size} retained object references across history.`,
  );
});
