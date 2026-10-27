import type { DesignDocument, Element, Page } from './document';

export function scopeGroup(page: Page, path: string[]): Element | undefined {
  let elements = page.elements,
    group: Element | undefined;
  for (const id of path) {
    group = elements.find((e) => e.id === id && e.kind === 'group' && !e.locked);
    if (!group) return;
    elements = group.children ?? [];
  }
  return group;
}
export function scopedPage(page: Page, path: string[]): Page {
  const group = scopeGroup(page, path);
  if (!group) return page;
  return {
    ...page,
    id: group.id,
    name: group.name,
    width: group.width,
    height: group.height,
    guides: [],
    elements: (group.children ?? []).map((e) => ({
      ...e,
      x: e.x + group.width / 2,
      y: e.y + group.height / 2,
    })),
  };
}
export function editScope(
  doc: DesignDocument,
  pageId: string,
  path: string[],
  change: (page: Page) => void,
) {
  const page = doc.pages.find((p) => p.id === pageId)!;
  const group = scopeGroup(page, path);
  if (!group) {
    change(page);
    return;
  }
  const view = scopedPage(page, path);
  change(view);
  if (!view.elements.length) return; // A group must always contain at least one object.
  group.children = view.elements.map((e) => ({
    ...e,
    x: e.x - group.width / 2,
    y: e.y - group.height / 2,
  }));
}
