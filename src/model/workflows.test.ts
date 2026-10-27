import { describe, expect, it } from 'vitest';
import { canCrop, constrainCrop, cropPatch, ratioCrop } from './crop';
import { makeElement, newDocument, validateDocument } from './document';
import { extractStyle, applyStyle, updateLinkedStyle } from './styles';
import { useEditor, currentPage } from '../store/editor';

describe('visual crop geometry', () => {
  it('bounds crops to the source and centers a ratio crop', () => {
    expect(constrainCrop({ x: 390, y: -20, width: 100, height: 800 }, 400, 300)).toEqual({
      x: 300,
      y: 0,
      width: 100,
      height: 300,
    });
    expect(ratioCrop({ x: 0, y: 0, width: 400, height: 300 }, 1, 400, 300)).toEqual({
      x: 50,
      y: 0,
      width: 300,
      height: 300,
    });
  });
  it('keeps frame width without introducing image distortion', () => {
    const e = makeElement('image', {
      width: 400,
      height: 300,
      scaleX: 0.5,
      scaleY: 0.5,
      rotation: 30,
    });
    const patch = cropPatch(e, { x: 50, y: 20, width: 200, height: 200 });
    expect(patch.width! * patch.scaleX!).toBe(200);
    expect(patch.scaleX).toBe(patch.scaleY);
    expect(patch).not.toHaveProperty('rotation');
    expect(patch.cropX).toBe(50);
  });
  it('round trips non-destructive element crops and rejects malformed masks', () => {
    const doc = newDocument();
    doc.pages[0].elements = [
      makeElement('rect', { rotation: 30, clip: { x: 20, y: 10, width: 120, height: 80 } }),
    ];
    expect(validateDocument(JSON.parse(JSON.stringify(doc)))).toEqual(doc);
    expect(canCrop(doc.pages[0].elements[0])).toBe(true);
    expect(canCrop(makeElement('rect', { locked: true }))).toBe(false);
    expect(canCrop(makeElement('line'))).toBe(false);
    const bad = structuredClone(doc);
    bad.pages[0].elements[0].clip!.width = -1;
    expect(() => validateDocument(bad)).toThrow();
    useEditor.getState().load(doc);
    useEditor.getState().update([doc.pages[0].elements[0].id], { clip: undefined });
    useEditor.getState().undo();
    expect(currentPage().elements[0].clip).toEqual(doc.pages[0].elements[0].clip);
    useEditor.getState().select([doc.pages[0].elements[0].id]);
    useEditor.getState().duplicate();
    expect(currentPage().elements[1].clip).toEqual(doc.pages[0].elements[0].clip);
  });
});

describe('project styles', () => {
  it('round trips named styles without capturing content or geometry', () => {
    const doc = newDocument(),
      e = makeElement('text', { x: 555, text: 'Keep my words', fill: '#aa3300', fontSize: 32 });
    const style = {
      id: 'heading-style',
      name: 'Heading',
      kind: 'text' as const,
      properties: extractStyle(e),
    };
    doc.styles = [style];
    doc.palette = ['#aa3300'];
    doc.pages[0].elements.push(applyStyle(e, style));
    expect(style.properties).not.toHaveProperty('text');
    expect(style.properties).not.toHaveProperty('x');
    expect(validateDocument(JSON.parse(JSON.stringify(doc)))).toEqual(doc);
    updateLinkedStyle(doc, { ...style, properties: { fill: '#000000', fontSize: 64 } });
    expect(doc.pages[0].elements[0]).toMatchObject({
      x: 555,
      text: 'Keep my words',
      fill: '#000000',
      fontSize: 64,
    });
  });
  it('updates nested instances, clears old effects, and protects locked objects', () => {
    const doc = newDocument(),
      style = { id: 'card', name: 'Card', kind: 'shape' as const, properties: { fill: '#ff0000' } };
    const child = makeElement('rect', { styleId: 'card', gradient: { end: '#ffffff', angle: 0 } });
    doc.styles = [style];
    doc.pages[0].elements = [
      makeElement('group', { children: [child] }),
      makeElement('rect', { styleId: 'card', locked: true }),
    ];
    updateLinkedStyle(doc, style);
    expect(child.fill).toBe('#ff0000');
    expect(child.gradient).toBeUndefined();
    expect(doc.pages[0].elements[1].fill).not.toBe('#ff0000');
    expect(applyStyle(makeElement('text'), style).styleId).toBeUndefined();
    doc.pages[0].elements[0].locked = true;
    updateLinkedStyle(doc, { ...style, properties: { fill: '#00ff00' } });
    expect(child.fill).toBe('#ff0000');
  });
});

describe('group isolation', () => {
  it('edits local coordinates and preserves parent transforms through undo and serialization', () => {
    const doc = newDocument();
    const child = makeElement('rect', { x: -100, y: -50, width: 80, height: 40 });
    const group = makeElement('group', {
      x: 300,
      y: 200,
      width: 200,
      height: 100,
      rotation: 35,
      scaleX: 2,
      scaleY: 1.5,
      children: [child],
    });
    doc.pages[0].elements = [group];
    useEditor.getState().load(doc);
    useEditor.getState().enterGroup(group.id);
    expect(currentPage().elements[0].x).toBe(0);
    useEditor.getState().update([child.id], { x: 24, fill: '#123456' });
    const stored = useEditor.getState().document.pages[0].elements[0];
    expect(stored).toMatchObject({ x: 300, y: 200, rotation: 35, scaleX: 2, scaleY: 1.5 });
    expect(stored.children![0]).toMatchObject({ x: -76, fill: '#123456' });
    expect(validateDocument(useEditor.getState().document)).toEqual(useEditor.getState().document);
    useEditor.getState().undo();
    expect(useEditor.getState().document.pages[0].elements[0].children![0].x).toBe(-100);
    useEditor.getState().redo();
    expect(useEditor.getState().document.pages[0].elements[0].children![0].x).toBe(-76);
  });
  it('supports nested scopes, exits on page changes, and prevents empty groups', () => {
    const doc = newDocument(),
      child = makeElement('rect');
    const inner = makeElement('group', { children: [child] }),
      outer = makeElement('group', { children: [inner] });
    doc.pages[0].elements = [outer];
    useEditor.getState().load(doc);
    useEditor.getState().enterGroup(outer.id);
    useEditor.getState().enterGroup(inner.id);
    useEditor.getState().select([child.id]);
    useEditor.getState().remove();
    expect(currentPage().elements).toHaveLength(1);
    useEditor.getState().add('text');
    expect(currentPage().elements).toHaveLength(2);
    useEditor.getState().addPage();
    expect(useEditor.getState().scopePath).toEqual([]);
  });
});
