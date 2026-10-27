import type { DesignDocument, Element } from './document';

export function removeAssetElements(elements: Element[], assetId: string): Element[] {
  let changed = false;
  const remaining: Element[] = [];
  for (const element of elements) {
    if (element.assetId === assetId) {
      changed = true;
      continue;
    }
    if (element.children) {
      const children = removeAssetElements(element.children, assetId);
      if (children !== element.children) {
        changed = true;
        if (children.length) remaining.push({ ...element, children });
        continue;
      }
    }
    remaining.push(element);
  }
  return changed ? remaining : elements;
}

export function removeDocumentAsset(document: DesignDocument, assetId: string): DesignDocument {
  let changed = false;
  const pages = document.pages.map((page) => {
    const elements = removeAssetElements(page.elements, assetId);
    if (elements === page.elements) return page;
    changed = true;
    return { ...page, elements };
  });
  return changed ? { ...document, pages, updatedAt: new Date().toISOString() } : document;
}
