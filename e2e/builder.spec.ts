import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { layoutPresets } from '../src/model/layouts';
import { makeElement, makePage, newDocument } from '../src/model/document';
import type { DesignDocument } from '../src/model/document';

async function save(page: Page): Promise<DesignDocument> {
  await page.locator('.save-state').click();
  await expect(page.getByText('Saved locally', { exact: true })).toBeVisible();
  return page.evaluate(
    () =>
      new Promise<DesignDocument>((resolve, reject) => {
        const request = indexedDB.open('slideop-studio');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result,
            key = db.transaction('settings').objectStore('settings').get('lastProject');
          key.onsuccess = () => {
            const doc = db.transaction('projects').objectStore('projects').get(key.result);
            doc.onsuccess = () => {
              resolve(doc.result);
              db.close();
            };
          };
        };
      }),
  );
}
async function start(page: Page) {
  await page.goto('/');
  await expect(page.locator('.loading-screen')).toBeHidden();
}

test('photo grid builder creates editable masked photos with local fonts, undo and reload', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await start(page);
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#e87936';
    ctx.fillRect(0, 0, 600, 400);
    return canvas.toDataURL().split(',')[1];
  });
  await page.getByRole('button', { name: 'Uploads', exact: true }).click();
  const input = page.locator('input[type=file][accept="image/png,image/jpeg,image/webp"]');
  await input.setInputFiles([
    { name: 'gallery-one.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') },
    { name: 'gallery-two.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') },
  ]);
  await page.getByRole('button', { name: 'Build', exact: true }).click();
  await page
    .getByRole('button', { name: 'Include gallery-one.png in gallery', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Include gallery-two.png in gallery', exact: true })
    .click();
  await page.getByLabel('Gallery title', { exact: true }).fill('Our photo story');
  await page.getByRole('button', { name: 'Build photo grid (2)', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Build photo grid (2)', exact: true }),
  ).toBeEnabled();
  let doc = await save(page);
  expect(doc.pages).toHaveLength(2);
  expect(doc.pages[1].elements.filter((e) => e.kind === 'image')).toHaveLength(2);
  expect(doc.pages[1].elements.find((e) => e.kind === 'image')?.clip?.shape).toBe('rounded');
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  await page.getByRole('textbox', { name: 'Rename gallery-one.png', exact: true }).click();
  await page.getByRole('button', { name: 'Crop image visually', exact: true }).click();
  await page.getByRole('button', { name: 'Use star crop', exact: true }).click();
  await page.getByRole('button', { name: 'Apply crop', exact: true }).click();
  doc = await save(page);
  expect(doc.pages[1].elements.find((e) => e.name === 'gallery-one.png')?.clip?.nodes).toHaveLength(
    10,
  );
  await page.getByRole('button', { name: 'Undo (Ctrl Z)' }).click();
  expect(
    (await save(page)).pages[1].elements.find((e) => e.name === 'gallery-one.png')?.clip?.shape,
  ).toBe('rounded');
  await page.getByRole('button', { name: 'Text', exact: true }).click();
  await page.getByLabel('Find a font', { exact: true }).fill('Outfit');
  await page.getByRole('button', { name: 'Add Outfit text', exact: true }).click();
  expect((await save(page)).pages[1].elements.at(-1)?.fontFamily).toBe('Outfit');
  expect(
    await page.evaluate(async () => {
      await Promise.all(
        ['Outfit', 'Rubik', 'Vollkorn', 'Sacramento'].map((font) =>
          document.fonts.load(`24px "${font}"`),
        ),
      );
      return ['Outfit', 'Rubik', 'Vollkorn', 'Sacramento'].every((font) =>
        document.fonts.check(`24px "${font}"`),
      );
    }),
  ).toBe(true);
  await page.reload();
  await expect(page.locator('.loading-screen')).toBeHidden();
  expect((await save(page)).pages).toHaveLength(2);
  expect(errors).toEqual([]);
});

test('every generic layout creates an editable page and can be inserted repeatedly', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await start(page);
  await page.getByRole('button', { name: 'Templates', exact: true }).click();
  for (const category of ['Slides', 'Documents', 'Social']) {
    await page.getByRole('button', { name: category, exact: true }).click();
    for (const preset of layoutPresets.filter((p) => p.category === category)) {
      await page.getByRole('button', { name: `Add ${preset.name} layout`, exact: true }).click();
      await expect(
        page.getByRole('button', { name: `Add ${preset.name} layout`, exact: true }),
      ).toBeEnabled();
    }
  }
  let doc = await save(page);
  expect(doc.pages).toHaveLength(15);
  expect(new Set(doc.pages.map((p) => p.id)).size).toBe(15);
  expect(doc.pages.filter((p) => p.layout)).toHaveLength(14);
  await page.getByRole('button', { name: 'Slides', exact: true }).click();
  await page.getByRole('button', { name: 'Add Big idea layout', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Add Big idea layout', exact: true }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Add Big idea layout', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Add Big idea layout', exact: true }),
  ).toBeEnabled();
  doc = await save(page);
  expect(new Set(doc.pages.map((p) => p.id)).size).toBe(17);
  await page.screenshot({ path: 'test-results/layout-library.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('outline builder, content-preserving remix, themes, undo, and reload work together', async ({
  page,
}) => {
  await start(page);
  await page.getByRole('button', { name: 'Build', exact: true }).click();
  await page
    .getByLabel('Your outline', { exact: true })
    .fill(
      '# Our next chapter\nA plan for better work.\n---\n# Three priorities\nChoose a clear direction.\n- Focus: Fewer things, done well.\n- Craft: Make the details count.\n- Share: Learn in the open.',
    );
  await page.getByLabel('Color & font pairing').selectOption('midnight');
  await page.getByRole('button', { name: 'Build 2 editable pages', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Build 2 editable pages', exact: true }),
  ).toBeEnabled();
  let doc = await save(page);
  expect(doc.pages).toHaveLength(3);
  expect(doc.pages[1].layout?.id).toBe('cover');
  expect(doc.pages[2].layout?.id).toBe('cards');
  await page.getByRole('button', { name: 'Open page 3: Three priorities', exact: true }).click();
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  await page.getByRole('textbox', { name: 'Rename Title', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Text content', exact: true })
    .fill('An edited title stays');
  await page.getByRole('textbox', { name: 'Text content', exact: true }).blur();
  await page.getByRole('button', { name: 'Build', exact: true }).click();
  await page.getByLabel('Design direction').selectOption('agenda');
  await page.getByLabel('Color & font pairing').selectOption('editorial');
  await page.getByRole('button', { name: 'Remix current page', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Remix current page', exact: true })).toBeEnabled();
  doc = await save(page);
  expect(doc.pages[2].layout?.id).toBe('agenda');
  expect(doc.pages[2].elements.find((e) => e.contentKey === 'title')?.text).toBe(
    'An edited title stays',
  );
  await page.getByRole('button', { name: 'Design', exact: true }).click();
  await page.getByRole('button', { name: 'Choose Ocean air theme' }).click();
  await page.getByRole('button', { name: 'Apply page look', exact: true }).click();
  doc = await save(page);
  expect(doc.pages[2].background).toBe('#f1f7fb');
  await page.getByRole('button', { name: 'Undo (Ctrl Z)' }).click();
  doc = await save(page);
  expect(doc.pages[2].background).toBe('#f7f4eb');
  await page.reload();
  await expect(page.locator('.loading-screen')).toBeHidden();
  doc = await save(page);
  expect(doc.pages[2].layout?.id).toBe('agenda');
  expect(doc.pages[2].elements.some((e) => e.text === 'An edited title stays')).toBe(true);
  const loaded = await page.evaluate(async () => {
    await Promise.all(
      ['Caveat', 'Cormorant Garamond', 'JetBrains Mono', 'Pacifico'].map((font) =>
        document.fonts.load(`24px "${font}"`),
      ),
    );
    return ['Caveat', 'Cormorant Garamond', 'JetBrains Mono', 'Pacifico'].every((font) =>
      document.fonts.check(`24px "${font}"`),
    );
  });
  expect(loaded).toBe(true);
});

test('auto arrangement and repeat are undoable editor operations', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: 'File', exact: true }).click();
  await page.getByRole('button', { name: 'New design', exact: true }).click();
  await page.getByRole('button', { name: 'Elements', exact: true }).click();
  await page.getByRole('button', { name: 'Add rectangle', exact: true }).click();
  await page.getByRole('button', { name: 'Build', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Columns', exact: true }).fill('2');
  await page.getByRole('spinbutton', { name: 'Columns', exact: true }).press('Enter');
  await page.getByRole('button', { name: 'Repeat selection', exact: true }).click();
  let doc = await save(page);
  expect(doc.pages[0].elements).toHaveLength(4);
  expect(new Set(doc.pages[0].elements.map((e) => e.x)).size).toBe(2);
  await page.getByRole('spinbutton', { name: 'Columns', exact: true }).fill('1');
  await page.getByRole('spinbutton', { name: 'Columns', exact: true }).press('Enter');
  await page.getByRole('button', { name: 'Tidy selection', exact: true }).click();
  doc = await save(page);
  expect(new Set(doc.pages[0].elements.map((e) => Math.round(e.x))).size).toBe(1);
  await page.getByRole('button', { name: 'Undo (Ctrl Z)' }).click();
  doc = await save(page);
  expect(new Set(doc.pages[0].elements.map((e) => e.x)).size).toBe(2);
  await page.getByRole('button', { name: 'Undo (Ctrl Z)' }).click();
  doc = await save(page);
  expect(doc.pages[0].elements).toHaveLength(1);
});

test('a 5,000-object project renders, edits, saves, and undoes without changing other pages', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await start(page);
  const doc = newDocument();
  doc.pages = Array.from({ length: 25 }, (_, p) => {
    const page = makePage();
    page.name = `Stress page ${p + 1}`;
    page.elements = Array.from({ length: 200 }, (_, i) =>
      makeElement('rect', {
        name: `Object ${i + 1}`,
        x: (i % 20) * 60,
        y: Math.floor(i / 20) * 60,
        width: 35,
        height: 35,
      }),
    );
    return page;
  });
  const started = Date.now();
  await page.locator('input[type=file][accept=".slideop,.json"]').setInputFiles({
    name: 'large.slideop',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ document: doc, assets: [] })),
  });
  await expect(page.getByText('Project imported. Make it your own.')).toBeVisible();
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  await page.getByRole('textbox', { name: 'Rename Object 1', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'X', exact: true }).fill('10');
  await page.getByRole('spinbutton', { name: 'X', exact: true }).press('Enter');
  const saved = await save(page);
  expect(saved.pages).toHaveLength(25);
  expect(saved.pages[0].elements[0].x).toBe(10);
  expect(saved.pages[1].elements[0].x).toBe(0);
  await page.getByRole('button', { name: 'Undo (Ctrl Z)' }).click();
  expect((await save(page)).pages[0].elements[0].x).toBe(0);
  console.info(
    `Browser scalability: import, render, edit, save, and undo 5,000 objects in ${Date.now() - started} ms.`,
  );
  expect(errors).toEqual([]);
});
