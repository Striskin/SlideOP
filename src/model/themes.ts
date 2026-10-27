import type { Element, Page } from './document';
import type { FontName } from './fonts';

export type ThemeRole = NonNullable<Element['themeRole']>;
export type PageTheme = {
  id: string;
  name: string;
  mood: string;
  headingFont: FontName;
  bodyFont: FontName;
} & Record<ThemeRole, string>;
export const pageThemes: PageTheme[] = [
  {
    id: 'studio',
    name: 'Studio orange',
    mood: 'Warm · Confident',
    background: '#fff8f0',
    ink: '#312a24',
    muted: '#766451',
    accent: '#c9551c',
    secondary: '#f0b684',
    surface: '#f2e6d7',
    headingFont: 'Manrope',
    bodyFont: 'DM Sans',
  },
  {
    id: 'midnight',
    name: 'Midnight signal',
    mood: 'Dark · Electric',
    background: '#151c2b',
    ink: '#f2f6ff',
    muted: '#a9b8d2',
    accent: '#b9e86c',
    secondary: '#7cb9e8',
    surface: '#253146',
    headingFont: 'Space Grotesk',
    bodyFont: 'Inter',
  },
  {
    id: 'editorial',
    name: 'Sunday paper',
    mood: 'Quiet · Editorial',
    background: '#f7f4eb',
    ink: '#2e342f',
    muted: '#696f63',
    accent: '#8a432c',
    secondary: '#a2af96',
    surface: '#e9e5d9',
    headingFont: 'Cormorant Garamond',
    bodyFont: 'DM Sans',
  },
  {
    id: 'ocean',
    name: 'Ocean air',
    mood: 'Clear · Professional',
    background: '#f1f7fb',
    ink: '#183a4c',
    muted: '#537283',
    accent: '#126c91',
    secondary: '#8bd0d3',
    surface: '#dcecf4',
    headingFont: 'Raleway',
    bodyFont: 'Nunito Sans',
  },
  {
    id: 'rose',
    name: 'Rose atelier',
    mood: 'Soft · Expressive',
    background: '#fff2f2',
    ink: '#472b35',
    muted: '#84606b',
    accent: '#a63d5b',
    secondary: '#e6ac99',
    surface: '#f4dce1',
    headingFont: 'Playfair Display',
    bodyFont: 'Inter',
  },
  {
    id: 'forest',
    name: 'Forest field',
    mood: 'Natural · Grounded',
    background: '#f2f4eb',
    ink: '#293d2e',
    muted: '#67735e',
    accent: '#3c7047',
    secondary: '#bc9c65',
    surface: '#e0e8d7',
    headingFont: 'Lora',
    bodyFont: 'Manrope',
  },
  {
    id: 'cobalt',
    name: 'Cobalt poster',
    mood: 'Bold · Modern',
    background: '#173db0',
    ink: '#ffffff',
    muted: '#c5d4ff',
    accent: '#ffe26c',
    secondary: '#f29a86',
    surface: '#294fbd',
    headingFont: 'Anton',
    bodyFont: 'DM Sans',
  },
  {
    id: 'mono',
    name: 'Ink & paper',
    mood: 'Minimal · Precise',
    background: '#ffffff',
    ink: '#1c1c1c',
    muted: '#656565',
    accent: '#383838',
    secondary: '#999999',
    surface: '#ededed',
    headingFont: 'JetBrains Mono',
    bodyFont: 'Inter',
  },
  {
    id: 'lavender',
    name: 'Lavender dusk',
    mood: 'Calm · Creative',
    background: '#f5f0fc',
    ink: '#37254d',
    muted: '#77628e',
    accent: '#73499a',
    secondary: '#d4b2ba',
    surface: '#e7dcf2',
    headingFont: 'Fraunces',
    bodyFont: 'Nunito Sans',
  },
  {
    id: 'sunny',
    name: 'Sunny notebook',
    mood: 'Playful · Human',
    background: '#fff8d9',
    ink: '#413322',
    muted: '#796645',
    accent: '#9a4619',
    secondary: '#e5bc58',
    surface: '#f5e9b3',
    headingFont: 'Caveat',
    bodyFont: 'Nunito Sans',
  },
];
export function getTheme(id: string) {
  return pageThemes.find((t) => t.id === id) ?? pageThemes[0];
}
export function applyPageTheme(
  page: Page,
  theme: PageTheme,
  includeUnlinked: boolean,
  fonts = false,
) {
  page.background = theme.background;
  if (page.layout) page.layout.themeId = theme.id;
  const colors = new Map<string, ThemeRole>();
  const visit = (elements: Element[]) =>
    elements.forEach((e) => {
      if (e.locked) return;
      if (e.children) visit(e.children);
      if (e.kind === 'image' || e.kind === 'group' || (!e.themeRole && !includeUnlinked)) return;
      let role = e.themeRole;
      if (!role) {
        if (e.kind === 'text') role = (e.fontSize ?? 24) < 22 ? 'muted' : 'ink';
        else {
          if (!colors.has(e.fill))
            colors.set(e.fill, (['accent', 'secondary', 'surface'] as const)[colors.size % 3]);
          role = colors.get(e.fill)!;
        }
      }
      e.fill = theme[role];
      if (e.gradient) e.gradient.end = theme.secondary;
      if (e.strokeWidth) e.stroke = theme.muted;
      if (fonts && e.kind === 'text')
        e.fontFamily = e.contentKey === 'title' ? theme.headingFont : theme.bodyFont;
    });
  visit(page.elements);
}
