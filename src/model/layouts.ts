import { makeElement, makePage, layoutContentSchema, walkElements } from './document';
import type { Element, LayoutContent, Page } from './document';
import { getTheme } from './themes';
import type { PageTheme, ThemeRole } from './themes';

export type LayoutId =
  | 'cover'
  | 'split'
  | 'agenda'
  | 'cards'
  | 'comparison'
  | 'quote'
  | 'metrics'
  | 'timeline'
  | 'closing'
  | 'brief'
  | 'report'
  | 'resume'
  | 'social'
  | 'announcement';
export type LayoutPreset = {
  id: LayoutId;
  name: string;
  category: 'Slides' | 'Documents' | 'Social';
  description: string;
  width: number;
  height: number;
  slots: number;
};
const slide = (id: LayoutId, name: string, description: string, slots = 3): LayoutPreset => ({
  id,
  name,
  description,
  slots,
  category: 'Slides',
  width: 1280,
  height: 720,
});
export const layoutPresets: LayoutPreset[] = [
  slide('cover', 'Big idea', 'A bold opening with a graphic accent.'),
  slide('split', 'Two sides', 'A headline beside a structured story.'),
  slide('agenda', 'The agenda', 'A clear numbered list.', 6),
  slide('cards', 'Idea cards', 'A flexible grid for features or ideas.', 6),
  slide('comparison', 'Side by side', 'Compare two directions.', 2),
  slide('quote', 'Words that matter', 'A statement with room to breathe.'),
  slide('metrics', 'By the numbers', 'Make key figures stand out.', 4),
  slide('timeline', 'The next steps', 'A sequence of milestones.', 4),
  slide('closing', 'Keep in touch', 'A focused closing and call to action.'),
  {
    id: 'brief',
    name: 'Project brief',
    category: 'Documents',
    description: 'A one-page outline for your next project.',
    width: 794,
    height: 1123,
    slots: 6,
  },
  {
    id: 'report',
    name: 'Field report',
    category: 'Documents',
    description: 'An editorial summary with a side column.',
    width: 794,
    height: 1123,
    slots: 6,
  },
  {
    id: 'resume',
    name: 'Simple resume',
    category: 'Documents',
    description: 'A clean profile, experience, and skills.',
    width: 794,
    height: 1123,
    slots: 6,
  },
  {
    id: 'social',
    name: 'Square story',
    category: 'Social',
    description: 'An expressive quote or message.',
    width: 1080,
    height: 1080,
    slots: 3,
  },
  {
    id: 'announcement',
    name: 'The announcement',
    category: 'Social',
    description: 'A bold portrait for an event or launch.',
    width: 1080,
    height: 1350,
    slots: 4,
  },
];
export const exampleContent: LayoutContent = {
  title: 'Good ideas deserve\na great beginning.',
  subtitle: 'A clear direction. A little curiosity. Room to make something that matters.',
  items: [
    { heading: 'Find the spark', body: 'Start with a question worth exploring.' },
    { heading: 'Make it tangible', body: 'Turn the possibility into a thoughtful first step.' },
    { heading: 'Keep it moving', body: 'Learn, refine, and share what comes next.' },
  ],
};
export const layoutExamples: Record<LayoutId, LayoutContent> = {
  cover: { ...exampleContent, items: [] },
  split: {
    title: 'A fresh perspective.',
    subtitle: 'Great work starts with asking better questions.',
    items: exampleContent.items,
  },
  agenda: {
    title: 'Today, in focus.',
    subtitle: 'A simple agenda for a productive conversation.',
    items: [
      { heading: 'The context', body: 'Where we are and what matters now.' },
      { heading: 'The opportunity', body: 'A closer look at what could be better.' },
      { heading: 'The direction', body: 'A shared idea of where to go next.' },
      { heading: 'The next step', body: 'Clear owners, actions, and a time to reconnect.' },
    ],
  },
  cards: {
    title: 'Small steps. Real progress.',
    subtitle: 'Three principles to keep a good idea moving.',
    items: exampleContent.items,
  },
  comparison: {
    title: 'Two ways forward.',
    subtitle: 'Make the trade-offs clear before choosing a direction.',
    items: [
      {
        heading: 'Explore broadly',
        body: 'Try several possibilities. Look for unexpected connections before narrowing the field.',
      },
      {
        heading: 'Focus deeply',
        body: 'Choose one strong direction. Build, test, and refine it with care.',
      },
    ],
  },
  quote: {
    title: 'Make room for the work that matters.',
    subtitle: 'Your perspective, clearly expressed.',
    items: [],
  },
  metrics: {
    title: 'A snapshot worth sharing.',
    subtitle: 'Sample figures. Replace these with your own data.',
    items: [
      { heading: '24%', body: 'Year-over-year growth' },
      { heading: '1,280', body: 'People reached' },
      { heading: '4.9/5', body: 'Average satisfaction' },
    ],
  },
  timeline: {
    title: 'From possibility to progress.',
    subtitle: 'A four-stage roadmap for your next project.',
    items: [
      { heading: '01 / Discover', body: 'Understand the need.' },
      { heading: '02 / Design', body: 'Explore a direction.' },
      { heading: '03 / Build', body: 'Make it tangible.' },
      { heading: '04 / Launch', body: 'Share and learn.' },
    ],
  },
  closing: {
    title: 'Let’s make\nsomething matter.',
    subtitle: 'Your next chapter starts with a conversation.',
    items: [{ heading: 'Say hello', body: 'yourname@example.com' }],
  },
  brief: {
    title: 'The project brief.',
    subtitle: 'Project name / Prepared by your team / Month, year',
    items: [
      { heading: 'The opportunity', body: 'Describe the challenge and why it is worth solving.' },
      { heading: 'The outcome', body: 'Define what success looks like for the people who matter.' },
      { heading: 'The approach', body: 'Outline the work, key milestones, and decisions to make.' },
      {
        heading: 'The essentials',
        body: 'List the owner, timeline, budget, and ways to measure progress.',
      },
    ],
  },
  report: {
    title: 'Notes from\nthe field.',
    subtitle: 'A concise report / Topic / Prepared by your team',
    items: [
      { heading: 'Context', body: 'When, where, and why this research took place.' },
      {
        heading: 'What we learned',
        body: 'Summarize the most useful observation, with a concrete example.',
      },
      { heading: 'Method', body: 'How information was gathered and the limits of the sample.' },
      {
        heading: 'What comes next',
        body: 'Turn the findings into a clear, practical recommendation.',
      },
    ],
  },
  resume: {
    title: 'Your name.',
    subtitle:
      'Your role / City / yourname@example.com\nA thoughtful one-line summary of what you bring.',
    items: [
      { heading: 'Profile', body: 'Your focus, strengths, and the work you want to do.' },
      {
        heading: 'Experience',
        body: 'Role / Organization / Dates\nDescribe the impact you made and how you made it.',
      },
      { heading: 'Skills', body: 'Your core skills\nTools and methods\nLanguages' },
      {
        heading: 'Education & projects',
        body: 'Qualification / Institution / Year\nA project that shows your approach and ability.',
      },
    ],
  },
  social: {
    title: 'Make space\nfor a new idea.',
    subtitle: 'A little curiosity can change the whole picture.',
    items: [],
  },
  announcement: {
    title: 'A gathering\nof good ideas.',
    subtitle: 'An open invitation to create, connect, and try something new.',
    items: [
      { heading: 'When', body: 'Date / Time' },
      { heading: 'Where', body: 'Venue / Your city' },
      { heading: 'Bring', body: 'Your curiosity' },
      { heading: 'Join us', body: 'Your website or contact' },
    ],
  },
};
export function getLayout(id: string) {
  return layoutPresets.find((p) => p.id === id) ?? layoutPresets[0];
}

export function createLayout(
  id: LayoutId,
  content: LayoutContent = layoutExamples[id],
  themeId = 'studio',
): Page {
  const preset = getLayout(id),
    c = layoutContentSchema.parse(content),
    theme = getTheme(themeId);
  if (c.items.length > preset.slots)
    throw new Error(
      `${preset.name} fits up to ${preset.slots} content items. Choose a roomier layout or shorten the outline.`,
    );
  const page = makePage(preset.width, preset.height);
  page.name = c.title.replace(/\n/g, ' ').slice(0, 80) || preset.name;
  page.background = theme.background;
  page.layout = { id, themeId, content: c };
  const els = page.elements;
  const rect = (
    x: number,
    y: number,
    width: number,
    height: number,
    role: ThemeRole = 'surface',
    radius = 0,
  ) =>
    els.push(
      makeElement('rect', {
        x,
        y,
        width,
        height,
        fill: theme[role],
        radius,
        layoutPart: true,
        themeRole: role,
        name: `${role} panel`,
      }),
    );
  const text = (
    value: string,
    key: string,
    x: number,
    y: number,
    width: number,
    height: number,
    fontSize: number,
    role: ThemeRole = 'ink',
    heading = false,
    extra: Partial<Element> = {},
  ) => {
    if (!value) return;
    els.push(
      makeElement('text', {
        text: value,
        name: key === 'title' ? 'Title' : key === 'subtitle' ? 'Subtitle' : value.slice(0, 35),
        x,
        y,
        width,
        height,
        fontSize,
        fontFamily: heading ? theme.headingFont : theme.bodyFont,
        fontWeight: heading ? 'bold' : 'normal',
        fill: theme[role],
        themeRole: role,
        contentKey: key,
        layoutPart: true,
        lineHeight: 1.18,
        ...extra,
      }),
    );
  };
  const item = (i: number, x: number, y: number, w: number, h: number, size = 28) => {
    const value = c.items[i];
    if (!value) return;
    text(value.heading, `item-${i}-heading`, x, y, w, h * 0.33, size, 'ink', true);
    text(value.body, `item-${i}-body`, x, y + h * 0.4, w, h * 0.6, size * 0.65, 'muted');
  };
  const footer = () => {
    rect(64, page.height - 48, page.width - 128, 1, 'secondary');
    text(
      'SLIDEOP / MADE TO BE YOURS',
      'decoration',
      64,
      page.height - 32,
      page.width - 128,
      18,
      10,
      'muted',
    );
  };
  if (['brief', 'report', 'resume'].includes(id)) {
    const side = id !== 'brief';
    if (side) rect(0, 0, 246, page.height, 'surface');
    rect(44, 50, 48, 5, 'accent');
    text(c.title, 'title', 44, 84, 706, 138, 47, 'ink', true);
    text(c.subtitle, 'subtitle', 44, 240, 700, 112, 18, 'muted');
    const count = Math.max(c.items.length, 1),
      rows = side ? Math.ceil(count / 2) : count;
    const gap = side ? 30 : 18,
      y0 = 390,
      available = 630;
    c.items.forEach((_, i) => {
      const col = side ? i % 2 : 0,
        row = side ? Math.floor(i / 2) : i;
      const x = side ? (col ? 284 : 44) : 44,
        w = side ? (col ? 465 : 164) : 706;
      const h = (available - gap * (rows - 1)) / rows;
      item(i, x, y0 + row * (h + gap), w, h, side ? 22 : 24);
    });
    footer();
  } else if (id === 'cover' || id === 'closing') {
    rect(850, 0, 430, 720, 'surface');
    rect(64, 75, 70, 6, 'accent');
    els.push(
      makeElement('ellipse', {
        x: 900,
        y: 130,
        width: 270,
        height: 270,
        fill: theme.accent,
        themeRole: 'accent',
        layoutPart: true,
        name: 'Accent circle',
      }),
    );
    rect(970, 350, 150, 220, 'secondary', 70);
    text(c.title, 'title', 64, 134, 735, 280, 78, 'ink', true);
    text(c.subtitle, 'subtitle', 68, 450, 690, 105, 25, 'muted');
    // Keep all supplied items editable even in a title-led layout.
    c.items.forEach((_, i) => item(i, 68 + i * 242, 570, 215, 74, 17));
    footer();
  } else if (id === 'quote' || id === 'social') {
    const square = id === 'social',
      w = page.width,
      h = page.height;
    rect(w * 0.06, h * 0.08, 8, h * 0.72, 'accent');
    text('“', 'decoration', w * 0.11, h * 0.08, 100, 130, 140, 'accent', true);
    text(c.title, 'title', w * 0.13, h * 0.27, w * 0.76, h * 0.36, square ? 76 : 65, 'ink', true);
    text(c.subtitle, 'subtitle', w * 0.13, h * 0.67, w * 0.75, h * 0.12, 25, 'muted');
    c.items.forEach((_, i) => item(i, w * 0.13 + i * w * 0.255, h * 0.83, w * 0.23, h * 0.09, 17));
  } else if (id === 'split') {
    rect(0, 0, 520, 720, 'surface');
    rect(64, 70, 64, 5, 'accent');
    text(c.title, 'title', 64, 130, 400, 320, 61, 'ink', true);
    text(c.subtitle, 'subtitle', 64, 490, 400, 130, 23, 'muted');
    const h = 510 / Math.max(c.items.length, 1);
    c.items.forEach((_, i) => item(i, 580, 100 + i * h, 620, h - 25, 34));
    footer();
  } else if (id === 'announcement') {
    rect(0, 0, 1080, 190, 'accent');
    text('SOMETHING GOOD IS COMING', 'decoration', 70, 68, 940, 60, 26, 'background', true);
    text(c.title, 'title', 70, 280, 940, 370, 100, 'ink', true);
    text(c.subtitle, 'subtitle', 76, 720, 920, 180, 36, 'muted');
    c.items.forEach((_, i) =>
      item(i, 76 + (i % 2) * 485, 990 + Math.floor(i / 2) * 130, 440, 105, 26),
    );
    footer();
  } else {
    rect(64, 62, 54, 5, 'accent');
    text(c.title, 'title', 64, 100, 1152, 102, 55, 'ink', true);
    text(c.subtitle, 'subtitle', 68, 222, 1120, 65, 23, 'muted');
    const n = Math.max(c.items.length, 1);
    if (id === 'agenda') {
      const h = 315 / n;
      c.items.forEach((_, i) => {
        text(
          String(i + 1).padStart(2, '0'),
          'decoration',
          68,
          325 + i * h,
          70,
          h - 10,
          27,
          'accent',
          true,
        );
        text(
          c.items[i].heading,
          `item-${i}-heading`,
          170,
          325 + i * h,
          390,
          h - 10,
          27,
          'ink',
          true,
        );
        text(c.items[i].body, `item-${i}-body`, 600, 325 + i * h, 600, h - 10, 20, 'muted');
      });
    } else if (id === 'timeline') {
      rect(100, 348, 1060, 3, 'secondary');
      c.items.forEach((_, i) => {
        const x = 80 + i * (1140 / n);
        els.push(
          makeElement('ellipse', {
            x,
            y: 335,
            width: 28,
            height: 28,
            fill: theme.accent,
            themeRole: 'accent',
            layoutPart: true,
            name: 'Milestone',
          }),
        );
        item(i, x, 400, 1050 / n, 220, 29);
      });
    } else {
      const columns = id === 'comparison' ? 2 : id === 'metrics' ? Math.min(n, 4) : Math.min(n, 3);
      const rows = Math.ceil(n / columns),
        gap = 22,
        cw = (1152 - (columns - 1) * gap) / columns,
        ch = (320 - (rows - 1) * gap) / rows;
      c.items.forEach((_, i) => {
        const x = 64 + (i % columns) * (cw + gap),
          y = 325 + Math.floor(i / columns) * (ch + gap);
        rect(x, y, cw, ch, 'surface', 16);
        item(i, x + 24, y + 22, cw - 48, ch - 44, id === 'metrics' ? 58 : 30);
      });
    }
    footer();
  }
  return page;
}

export function readLayoutContent(page: Page): LayoutContent {
  const content = structuredClone(page.layout?.content ?? exampleContent);
  for (const e of page.elements) {
    if (!e.contentKey || e.kind !== 'text') continue;
    if (e.contentKey === 'title') content.title = e.text ?? '';
    else if (e.contentKey === 'subtitle') content.subtitle = e.text ?? '';
    else {
      const match = /^item-(\d+)-(heading|body)$/.exec(e.contentKey);
      if (match && content.items[Number(match[1])])
        content.items[Number(match[1])][match[2] as 'heading' | 'body'] = e.text ?? '';
    }
  }
  return layoutContentSchema.parse(content);
}

export function remixLayout(page: Page, id: LayoutId, themeId: string): Page {
  if (!page.layout) throw new Error('Choose a page made with a layout to remix it.');
  if (
    page.elements.some(
      (e) => e.kind === 'group' && walkElements(e.children ?? []).some((child) => child.layoutPart),
    )
  )
    throw new Error('Ungroup layout-generated objects before remixing this page.');
  if (page.elements.some((e) => e.layoutPart && e.locked))
    throw new Error('Unlock the layout objects before remixing this page.');
  const next = createLayout(id, readLayoutContent(page), themeId);
  next.id = page.id;
  next.guides = page.guides;
  next.elements.push(...page.elements.filter((e) => !e.layoutPart));
  return next;
}

export function parseOutline(input: string): LayoutContent[] {
  if (input.length > 60000) throw new Error('Keep the outline under 60,000 characters.');
  const blocks = input
    .trim()
    .split(/^\s*---\s*$/m)
    .filter((b) => b.trim());
  if (!blocks.length) throw new Error('Add a title and a few ideas first.');
  if (blocks.length > 20) throw new Error('Build up to 20 pages at a time.');
  return blocks.map((block, index) => {
    const lines = block
        .trim()
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean),
      title = lines.shift()!.replace(/^#{1,6}\s*/, '');
    const subtitle: string[] = [],
      items: LayoutContent['items'] = [];
    for (const line of lines) {
      if (/^[-*]\s+/.test(line)) {
        const value = line.replace(/^[-*]\s+/, ''),
          colon = value.indexOf(':');
        items.push({
          heading: colon >= 0 ? value.slice(0, colon).trim() : value,
          body: colon >= 0 ? value.slice(colon + 1).trim() : '',
        });
      } else subtitle.push(line);
    }
    const result = layoutContentSchema.safeParse({ title, subtitle: subtitle.join('\n'), items });
    if (!result.success)
      throw new Error(
        `Page ${index + 1} is too long. Use up to 6 bullets, shorter titles, or split it with ---.`,
      );
    return result.data;
  });
}
export function suggestLayout(content: LayoutContent, index: number): LayoutId {
  return content.items.length > 4
    ? 'agenda'
    : content.items.length === 2
      ? 'comparison'
      : content.items.length >= 3
        ? 'cards'
        : index === 0
          ? 'cover'
          : 'split';
}
export function themePairing(theme: PageTheme) {
  return `${theme.headingFont} + ${theme.bodyFont}`;
}
