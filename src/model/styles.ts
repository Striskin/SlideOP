import { stylePropertiesSchema } from './document';
import type { DesignDocument, Element, SavedStyle } from './document';

export function extractStyle(element: Element): SavedStyle['properties'] {
  return stylePropertiesSchema.parse(element);
}
export function styleKind(element: Element): SavedStyle['kind'] | null {
  return element.kind === 'text'
    ? 'text'
    : ['group', 'image'].includes(element.kind)
      ? null
      : 'shape';
}
export function applyStyle(element: Element, style: SavedStyle): Element {
  if (styleKind(element) !== style.kind || element.locked) return element;
  // Clear optional effects left behind by a previously applied style.
  return {
    ...element,
    gradient: undefined,
    shadow: undefined,
    underline: false,
    ...style.properties,
    styleId: style.id,
  };
}
export function updateLinkedStyle(doc: DesignDocument, style: SavedStyle) {
  doc.styles = doc.styles?.map((s) => (s.id === style.id ? style : s));
  const visit = (elements: Element[]) =>
    elements.forEach((e) => {
      if (e.locked) return;
      if (e.styleId === style.id) Object.assign(e, applyStyle(e, style));
      if (e.children) visit(e.children);
    });
  doc.pages.forEach((p) => visit(p.elements));
}
