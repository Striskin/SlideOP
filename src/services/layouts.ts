import { Textbox } from 'fabric';
import type { Page } from '../model/document';
import { useEditor } from '../store/editor';
import { finishTextEditing } from '../canvas/commands';

export async function fitLayoutText(page: Page): Promise<Page> {
  const fonts = new Map<string, string>();
  for (const e of page.elements)
    if (e.kind === 'text') {
      const font = `${e.fontWeight ?? 'normal'} ${e.fontSize ?? 24}px "${e.fontFamily ?? 'DM Sans'}"`;
      fonts.set(font, e.text ?? '');
    }
  await Promise.all([...fonts].map(([font, text]) => document.fonts.load(font, text)));
  for (const e of page.elements) {
    if (e.kind !== 'text' || !e.layoutPart) continue;
    const box = new Textbox(e.text ?? '', {
      width: e.width,
      fontSize: e.fontSize,
      fontFamily: e.fontFamily,
      fontWeight: e.fontWeight,
      lineHeight: e.lineHeight,
      splitByGrapheme: false,
      strokeWidth: 0,
    });
    // Preserve word boundaries. Fall back to character wrapping only for oversized tokens.
    if (box.width > e.width + 1) {
      e.characterWrap = true;
      box.set({ splitByGrapheme: true, width: e.width });
      box.initDimensions();
    }
    const min = Math.min(12, e.fontSize ?? 12);
    try {
      for (let step = 0; box.height > e.height && box.fontSize > min && step < 50; step++) {
        box.set({ fontSize: Math.max(min, Math.floor(box.fontSize * 0.94)), width: e.width });
        box.initDimensions();
      }
      if (box.height > e.height + 1)
        throw new Error(
          `“${e.name}” needs more room. Shorten the content or choose a larger layout.`,
        );
      e.fontSize = box.fontSize;
    } finally {
      box.dispose();
    }
  }
  return page;
}

export async function insertBuiltPages(pages: Page[]) {
  finishTextEditing();
  const documentId = useEditor.getState().document.id;
  for (const page of pages) await fitLayoutText(page);
  const s = useEditor.getState();
  if (s.document.id !== documentId)
    throw new Error('The open project changed. Build again in the current project.');
  if (s.document.pages.length + pages.length > 100)
    throw new Error('A project can contain up to 100 pages.');
  s.commit((doc) => {
    doc.pages.push(...pages);
  }, pages[0].id);
  s.set({
    selection: [],
    scopePath: [],
    toast: `${pages.length === 1 ? 'Your layout is' : `${pages.length} pages are`} ready. Every element is editable.`,
  });
}

export async function replaceWithRemix(original: Page, next: Page) {
  const docId = useEditor.getState().document.id;
  await fitLayoutText(next);
  const s = useEditor.getState();
  if (s.document.id !== docId || s.document.pages.find((p) => p.id === original.id) !== original)
    throw new Error('This page changed while preparing the remix. Try again.');
  s.commit((doc) => {
    const index = doc.pages.findIndex((p) => p.id === original.id);
    doc.pages[index] = next;
  });
  s.set({
    scopePath: [],
    selection: [],
    toast: 'Layout remixed. Your content and custom additions are preserved.',
  });
}
