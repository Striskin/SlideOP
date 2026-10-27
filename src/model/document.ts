import { z } from 'zod';
import { fontNames } from './fonts';

export const uid = () => crypto.randomUUID();
const finite = z.number().finite();
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const point = z.object({ x: finite.min(-100000).max(100000), y: finite.min(-100000).max(100000) });
export const layoutContentSchema = z.object({
  title: z.string().max(300),
  subtitle: z.string().max(1200),
  items: z.array(z.object({ heading: z.string().max(160), body: z.string().max(1600) })).max(6),
});
export type LayoutContent = z.infer<typeof layoutContentSchema>;
const base = z.object({
  id: z.string().min(1).max(100),
  name: z.string().max(200),
  kind: z.enum([
    'rect',
    'ellipse',
    'triangle',
    'line',
    'arrow',
    'polygon',
    'text',
    'image',
    'group',
  ]),
  x: finite.min(-100000).max(100000),
  y: finite.min(-100000).max(100000),
  width: finite.positive().max(20000),
  height: finite.positive().max(20000),
  scaleX: finite.min(0.001).max(100),
  scaleY: finite.min(0.001).max(100),
  rotation: finite,
  skewX: finite,
  skewY: finite,
  flipX: z.boolean(),
  flipY: z.boolean(),
  fill: color,
  stroke: color,
  strokeWidth: finite.min(0).max(100),
  opacity: finite.min(0).max(1),
  radius: finite.min(0).max(10000),
  locked: z.boolean(),
  visible: z.boolean(),
  gradient: z.object({ end: color, angle: finite }).optional(),
  shadow: z.object({ color, blur: finite.min(0).max(200), x: finite, y: finite }).optional(),
  text: z.string().max(50000).optional(),
  fontFamily: z.enum(fontNames).optional(),
  fontSize: finite.min(1).max(1000).optional(),
  fontWeight: z.enum(['normal', 'bold']).optional(),
  fontStyle: z.enum(['normal', 'italic']).optional(),
  underline: z.boolean().optional(),
  textAlign: z.enum(['left', 'center', 'right', 'justify']).optional(),
  charSpacing: finite.min(-200).max(1000).optional(),
  lineHeight: finite.min(0.5).max(5).optional(),
  assetId: z.string().max(100).optional(),
  cropX: finite.min(0).optional(),
  cropY: finite.min(0).optional(),
  clip: z
    .object({
      x: finite.min(0).max(20000),
      y: finite.min(0).max(20000),
      width: finite.positive().max(20000),
      height: finite.positive().max(20000),
    })
    .optional(),
  points: z.array(point).min(3).max(50).optional(),
  styleId: z.string().max(100).optional(),
  themeRole: z.enum(['ink', 'muted', 'accent', 'secondary', 'surface', 'background']).optional(),
  layoutPart: z.boolean().optional(),
  contentKey: z.string().max(40).optional(),
  characterWrap: z.boolean().optional(),
});
export const stylePropertiesSchema = base
  .pick({
    fill: true,
    stroke: true,
    strokeWidth: true,
    opacity: true,
    radius: true,
    gradient: true,
    shadow: true,
    fontFamily: true,
    fontSize: true,
    fontWeight: true,
    fontStyle: true,
    underline: true,
    textAlign: true,
    charSpacing: true,
    lineHeight: true,
  })
  .partial();
export const savedStyleSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
  kind: z.enum(['text', 'shape']),
  properties: stylePropertiesSchema,
});
export type SavedStyle = z.infer<typeof savedStyleSchema>;
export type Element = z.infer<typeof base> & { children?: Element[] };
export const elementSchema: z.ZodType<Element> = base.extend({
  children: z.lazy(() => z.array(elementSchema).max(2000)).optional(),
});
export const pageSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().max(200),
  width: finite.min(100).max(8192),
  height: finite.min(100).max(8192),
  background: color,
  elements: z.array(elementSchema).max(2000),
  guides: z.array(z.object({ axis: z.enum(['x', 'y']), position: finite })).max(100),
  layout: z
    .object({ id: z.string().max(50), themeId: z.string().max(50), content: layoutContentSchema })
    .optional(),
});
export const documentSchema = z.object({
  format: z.literal('slideop'),
  version: z.literal(1),
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  updatedAt: z.string(),
  pages: z.array(pageSchema).min(1).max(100),
  styles: z.array(savedStyleSchema).max(100).optional(),
  palette: z.array(color).max(32).optional(),
});
export type Page = z.infer<typeof pageSchema>;
export type DesignDocument = z.infer<typeof documentSchema>;
export type Asset = { id: string; name: string; blob: Blob; width: number; height: number };
export const presets = [
  { name: 'Presentation', detail: '16:9 · Widescreen', width: 1280, height: 720 },
  { name: 'Social post', detail: '1:1 · Square', width: 1080, height: 1080 },
  { name: 'Story', detail: '9:16 · Vertical', width: 1080, height: 1920 },
  { name: 'Poster', detail: 'A4 · Portrait', width: 794, height: 1123 },
  { name: 'Website mockup', detail: 'Desktop · Visual design', width: 1440, height: 1000 },
];
export function makeElement(kind: Element['kind'], overrides: Partial<Element> = {}): Element {
  return {
    id: uid(),
    name:
      kind === 'text'
        ? 'Your text'
        : kind === 'rect'
          ? 'Rectangle'
          : kind[0].toUpperCase() + kind.slice(1),
    kind,
    x: 100,
    y: 100,
    width: 200,
    height: 160,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    skewX: 0,
    skewY: 0,
    flipX: false,
    flipY: false,
    fill: '#ed965d',
    stroke: '#282432',
    strokeWidth: 0,
    opacity: 1,
    radius: 0,
    locked: false,
    visible: true,
    ...(kind === 'text'
      ? {
          text: 'Your next big idea',
          width: 500,
          height: 70,
          fontSize: 48,
          fontFamily: 'DM Sans',
          fontWeight: 'normal',
          fontStyle: 'normal',
          textAlign: 'left',
          charSpacing: 0,
          lineHeight: 1.16,
          fill: '#292535',
        }
      : {}),
    ...(kind === 'line' ? { height: 1, strokeWidth: 3 } : {}),
    ...(kind === 'ellipse' ? { height: 200 } : {}),
    ...overrides,
  };
}
export function makePage(width = 1280, height = 720): Page {
  return {
    id: uid(),
    name: 'Untitled page',
    width,
    height,
    background: '#ffffff',
    elements: [],
    guides: [],
  };
}
export function newDocument(): DesignDocument {
  return {
    format: 'slideop',
    version: 1,
    id: uid(),
    name: 'Untitled design',
    updatedAt: new Date().toISOString(),
    pages: [makePage()],
  };
}
export function walkElements(elements: Element[]): Element[] {
  return elements.flatMap((e) => [e, ...walkElements(e.children ?? [])]);
}
export function validateDocument(input: unknown): DesignDocument {
  // Bound recursion before invoking the recursive schema, including malformed imports.
  let count = 0;
  function inspect(value: unknown, depth: number) {
    if (depth > 20 || ++count > 250000) throw new Error('Project is too complex.');
    if (value && typeof value === 'object')
      for (const child of Object.values(value)) inspect(child, depth + 1);
  }
  inspect(input, 0);
  const doc = documentSchema.parse(input);
  const ids = [
    doc.id,
    ...doc.pages.flatMap((p) => [p.id, ...walkElements(p.elements).map((e) => e.id)]),
  ];
  if (new Set(ids).size !== ids.length) throw new Error('Project contains duplicate IDs.');
  const styles = doc.styles ?? [];
  if (new Set(styles.map((style) => style.id)).size !== styles.length)
    throw new Error('Project contains duplicate style IDs.');
  for (const e of doc.pages.flatMap((p) => walkElements(p.elements))) {
    if (e.kind === 'image' && !e.assetId) throw new Error('Image is missing an asset.');
    if (e.kind === 'group' && !e.children?.length)
      throw new Error('Empty groups are not supported.');
  }
  return doc;
}
export function cloneElements(elements: Element[], offset = 24, preserveLayout = false): Element[] {
  const clone = (e: Element): Element => ({
    ...structuredClone(e),
    id: uid(),
    children: e.children?.map(clone),
    ...(preserveLayout ? {} : { layoutPart: undefined, contentKey: undefined }),
  });
  return elements.map((e) => ({ ...clone(e), x: e.x + offset, y: e.y + offset }));
}
export function starterDocument(): DesignDocument {
  const doc = newDocument();
  doc.name = 'Room for big ideas';
  const page = doc.pages[0];
  page.name = 'The big idea';
  page.background = '#f8f5ef';
  const text = (
    content: string,
    x: number,
    y: number,
    size: number,
    extra: Partial<Element> = {},
  ) =>
    makeElement('text', {
      text: content,
      name: content.slice(0, 35),
      x,
      y,
      fontSize: size,
      fill: '#34322e',
      width: 650,
      height: size * 1.2,
      ...extra,
    });
  page.elements = [
    text('A LITTLE SPACE. A LOT OF POSSIBILITY.', 74, 63, 14, {
      charSpacing: 160,
      fontWeight: 'bold',
    }),
    text('Make room\nfor your next\nbig idea.', 70, 174, 85, {
      fontFamily: 'Georgia',
      lineHeight: 1.02,
      width: 680,
      height: 290,
    }),
    text(
      'A fresh perspective starts with a blank page.\nLet’s make something worth sharing.',
      76,
      518,
      21,
      { fill: '#777269', width: 550, lineHeight: 1.5 },
    ),
    makeElement('rect', {
      name: 'Lilac arch',
      x: 842,
      y: 124,
      width: 285,
      height: 410,
      fill: '#b5a1df',
      radius: 142,
    }),
    makeElement('ellipse', {
      name: 'Apricot sun',
      x: 745,
      y: 292,
      width: 264,
      height: 264,
      fill: '#f4a46e',
    }),
    makeElement('rect', {
      name: 'Ink accent',
      x: 1022,
      y: 358,
      width: 100,
      height: 200,
      radius: 50,
      fill: '#4a5140',
      rotation: 32,
    }),
    makeElement('ellipse', {
      name: 'Paper circle',
      x: 902,
      y: 348,
      width: 148,
      height: 148,
      fill: '#f8f5ef',
    }),
    makeElement('line', {
      x: 76,
      y: 641,
      width: 1128,
      height: 1,
      stroke: '#d9d3ca',
      strokeWidth: 1,
      name: 'Footer rule',
    }),
    text('THE CREATIVE NOTEBOOK', 76, 665, 12, { charSpacing: 140 }),
    text('01 / IDEAS IN MOTION', 1020, 665, 12, { width: 220, charSpacing: 60 }),
  ];
  return doc;
}
