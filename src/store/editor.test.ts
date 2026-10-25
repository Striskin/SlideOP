import { beforeEach, describe, expect, it } from 'vitest';
import { useEditor, currentPage } from './editor';
import { newDocument } from '../model/document';

beforeEach(() => useEditor.getState().load(newDocument()));
describe('history and document operations', () => {
  it('undoes and redoes object edits without mutating prior snapshots', () => {
    const s = useEditor.getState();
    s.add('rect');
    const before = useEditor.getState().document;
    const id = currentPage().elements[0].id;
    s.update([id], { x: 420, fill: '#ff0000' });
    expect(before.pages[0].elements[0].x).not.toBe(420);
    s.undo();
    expect(currentPage().elements[0]).toEqual(before.pages[0].elements[0]);
    s.redo();
    expect(currentPage().elements[0].x).toBe(420);
  });
  it('restores active page and content after deletion', () => {
    const s = useEditor.getState();
    s.add('text');
    const first = currentPage().id;
    s.addPage();
    const second = currentPage().id;
    s.add('ellipse');
    s.deletePage(second);
    expect(currentPage().id).toBe(first);
    s.undo();
    expect(currentPage().id).toBe(second);
    expect(currentPage().elements[0].kind).toBe('ellipse');
    s.redo();
    expect(currentPage().id).toBe(first);
  });
  it('clears redo after a new edit and ignores no-op edits', () => {
    const s = useEditor.getState();
    s.add('rect');
    s.add('ellipse');
    s.undo();
    expect(useEditor.getState().future).toHaveLength(1);
    s.add('text');
    expect(useEditor.getState().future).toHaveLength(0);
    const count = useEditor.getState().past.length;
    s.commit(() => {});
    expect(useEditor.getState().past).toHaveLength(count);
  });
  it('protects the last page and locked objects from deletion', () => {
    const s = useEditor.getState();
    s.deletePage(currentPage().id);
    expect(useEditor.getState().document.pages).toHaveLength(1);
    s.add('rect', { locked: true });
    s.remove();
    expect(currentPage().elements).toHaveLength(1);
  });
  it('duplicates and reorders pages with independent IDs', () => {
    const s = useEditor.getState();
    s.add('rect');
    const first = currentPage();
    s.duplicatePage(first.id);
    expect(currentPage().elements[0].id).not.toBe(first.elements[0].id);
    s.movePage(currentPage().id, -1);
    expect(useEditor.getState().document.pages[0].id).not.toBe(first.id);
    s.undo();
    expect(useEditor.getState().document.pages[0].id).toBe(first.id);
  });
  it('copies and pastes into another page without embedding image data', () => {
    const s = useEditor.getState();
    s.add('image', { assetId: 'image-1' });
    s.copy();
    s.addPage();
    s.paste();
    expect(currentPage().elements).toHaveLength(1);
    expect(currentPage().elements[0].assetId).toBe('image-1');
    expect(JSON.stringify(useEditor.getState().past)).not.toContain('base64');
  });
  it('bounds history size', () => {
    const s = useEditor.getState();
    s.add('rect');
    const id = currentPage().elements[0].id;
    for (let i = 0; i < 100; i++) s.update([id], { x: i });
    expect(useEditor.getState().past).toHaveLength(80);
  });
});
