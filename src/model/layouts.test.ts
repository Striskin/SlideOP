import { describe, expect, it } from 'vitest';
import {
  createLayout,
  exampleContent,
  layoutPresets,
  parseOutline,
  readLayoutContent,
  remixLayout,
  suggestLayout,
} from './layouts';
import { pageThemes, applyPageTheme } from './themes';
import { makeElement, newDocument, validateDocument, cloneElements } from './document';

describe('editable layout catalog and outline builder', () => {
  it('serializes all layouts and themes with unique object IDs and bounded geometry', () => {
    for (const theme of pageThemes)
      for (const preset of layoutPresets) {
        const page = createLayout(
            preset.id,
            { ...exampleContent, items: exampleContent.items.slice(0, preset.slots) },
            theme.id,
          ),
          doc = newDocument();
        doc.pages = [page];
        expect(validateDocument(JSON.parse(JSON.stringify(doc)))).toEqual(doc);
        for (const e of page.elements) {
          expect(e.x).toBeGreaterThanOrEqual(0);
          expect(e.y).toBeGreaterThanOrEqual(0);
          expect(e.x + e.width).toBeLessThanOrEqual(page.width + 0.01);
          expect(e.y + e.height).toBeLessThanOrEqual(page.height + 0.01);
        }
      }
  });
  it('parses titles, paragraphs and colon-separated items without inventing content', () => {
    const pages = parseOutline(
      '# Start\nA <script>literal</script> message\n---\n# Next\n- One: Do this: carefully\n- Two',
    );
    expect(pages[0].subtitle).toBe('A <script>literal</script> message');
    expect(pages[1].items).toEqual([
      { heading: 'One', body: 'Do this: carefully' },
      { heading: 'Two', body: '' },
    ]);
    expect(suggestLayout(pages[1], 1)).toBe('comparison');
    expect(() => parseOutline('')).toThrow();
    expect(() => parseOutline(Array.from({ length: 21 }, () => '# Page').join('\n---\n'))).toThrow(
      /20/,
    );
    expect(() => parseOutline('# Title\n' + '- Item\n'.repeat(7))).toThrow(/6 bullets/);
  });
  it('preserves edited text and custom additions when remixing and blocks locked layout parts', () => {
    const original = createLayout('cards');
    original.elements.find((e) => e.contentKey === 'title')!.text = 'My edited title';
    const custom = makeElement('rect', { name: 'Personal addition' });
    original.elements.push(custom);
    const next = remixLayout(original, 'agenda', 'midnight');
    expect(next.id).toBe(original.id);
    expect(readLayoutContent(next).title).toBe('My edited title');
    expect(next.elements.find((e) => e.id === custom.id)).toBe(custom);
    expect(next.background).toBe(pageThemes[1].background);
    const duplicate = cloneElements(original.elements.filter((e) => e.contentKey === 'title'))[0];
    expect(duplicate.layoutPart).toBeUndefined();
    expect(duplicate.contentKey).toBeUndefined();
    original.elements[0].locked = true;
    expect(() => remixLayout(original, 'agenda', 'studio')).toThrow(/Unlock/);
    expect(() => createLayout('comparison', exampleContent)).toThrow(/2 content/);
  });
  it('recolors nested editable elements and protects locked groups and images', () => {
    const page = createLayout('cover'),
      untouched = makeElement('rect', { locked: true, fill: '#112233' });
    const child = makeElement('rect', { fill: '#445566' }),
      group = makeElement('group', { locked: true, children: [child] });
    page.elements.push(
      untouched,
      group,
      makeElement('image', { assetId: 'test', fill: '#778899' }),
    );
    applyPageTheme(page, pageThemes[1], true, true);
    expect(page.elements.find((e) => e.contentKey === 'title')!.fill).toBe(pageThemes[1].ink);
    expect(untouched.fill).toBe('#112233');
    expect(child.fill).toBe('#445566');
    expect(page.elements.at(-1)!.fill).toBe('#778899');
  });
});
