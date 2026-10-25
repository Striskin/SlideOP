import { test, expect } from '@playwright/test';
import type { Page as BrowserPage } from '@playwright/test';
import type { DesignDocument } from '../src/model/document';
import { readFile } from 'node:fs/promises';

async function savedDocument(page: BrowserPage): Promise<DesignDocument> {
  await page.locator('.save-state').click();
  await expect(page.getByText('Saved locally', { exact: true })).toBeVisible();
  return page.evaluate(
    () =>
      new Promise<DesignDocument>((resolve, reject) => {
        const request = indexedDB.open('slideop-studio');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const key = db.transaction('settings').objectStore('settings').get('lastProject');
          key.onsuccess = () => {
            const doc = db.transaction('projects').objectStore('projects').get(key.result);
            doc.onsuccess = () => {
              resolve(doc.result);
              db.close();
            };
            doc.onerror = () => reject(doc.error);
          };
        };
      }),
  );
}

test('editor creates, groups, exports, and restores a local design', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByText('Opening your studio…')).toBeHidden();
  await expect(page.locator('.upper-canvas')).toBeVisible();
  await page.screenshot({ path: 'test-results/studio-light.png', fullPage: true });
  await page.getByRole('button', { name: 'Elements', exact: true }).click();
  await page.getByRole('button', { name: 'Add rectangle', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Element name', exact: true })).toHaveValue(
    'Rectangle',
  );
  await page.getByRole('spinbutton', { name: 'X', exact: true }).fill('300');
  await page.getByRole('spinbutton', { name: 'X', exact: true }).press('Enter');
  await page.getByRole('button', { name: 'Duplicate selected', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'X', exact: true })).toHaveValue('324');
  await page.getByRole('button', { name: 'Undo (Ctrl Z)', exact: true }).click();
  await page.getByRole('button', { name: 'Redo (Ctrl Shift Z)', exact: true }).click();
  await page.getByRole('button', { name: 'Add page', exact: true }).click();
  await page.getByRole('button', { name: 'Text', exact: true }).click();
  await page.getByRole('button', { name: 'Add a heading', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Text content', exact: true })
    .fill('A real local design');
  await page.getByRole('textbox', { name: 'Text content', exact: true }).blur();
  await page.getByRole('button', { name: 'Templates', exact: true }).click();
  await expect(page.getByText('Community templates · Coming soon')).toBeVisible();
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download design', exact: true }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/\.png$/);
  await file.saveAs('test-results/design.png');
  await savedDocument(page);
  await page.reload();
  await expect(page.getByText('Opening your studio…')).toBeHidden();
  await page.getByRole('button', { name: 'Open page 2: Page 2', exact: true }).click();
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  await page.getByRole('textbox', { name: 'Rename Your text', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Text content', exact: true })).toHaveValue(
    'A real local design',
  );
  await page.getByRole('button', { name: 'Run Slide Checker', exact: true }).click();
  await expect(page.getByText('Slide Checker · Current page')).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Switch to dark theme', exact: true }).click();
  await page.screenshot({ path: 'test-results/studio-dark.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('direct canvas text editing commits on exit', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Opening your studio…')).toBeHidden();
  await page.getByRole('button', { name: 'File', exact: true }).click();
  await page.getByRole('button', { name: 'New design', exact: true }).click();
  await page.getByRole('button', { name: 'Text', exact: true }).click();
  await page.getByRole('button', { name: 'Add a text box', exact: true }).click();
  const element = (await savedDocument(page)).pages[0].elements[0];
  const box = (await page.locator('.upper-canvas').boundingBox())!;
  const scale = box.width / 1280;
  await page.mouse.dblclick(box.x + (element.x + 50) * scale, box.y + (element.y + 20) * scale);
  await page.keyboard.press('Control+a');
  await page.keyboard.type('Edited directly on the canvas');
  await page.keyboard.press('Escape');
  const after = await savedDocument(page);
  expect(after.pages[0].elements[0].text).toBe('Edited directly on the canvas');
  await page.mouse.dblclick(box.x + (element.x + 50) * scale, box.y + (element.y + 20) * scale);
  await page.keyboard.press('Control+a');
  await page.keyboard.type('Saved when switching pages');
  await page.getByRole('button', { name: 'Add page', exact: true }).click();
  expect((await savedDocument(page)).pages[0].elements[0].text).toBe('Saved when switching pages');
});

test('polygon dimensions survive repeated canvas commits', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Opening your studio…')).toBeHidden();
  await page.getByRole('button', { name: 'Elements', exact: true }).click();
  await page.getByRole('button', { name: 'Add hexagon', exact: true }).click();
  const before = (await savedDocument(page)).pages[0].elements.at(-1)!;
  const box = (await page.locator('.upper-canvas').boundingBox())!;
  const scale = box.width / 1280;
  let x = box.x + (before.x + before.width / 2) * scale,
    y = box.y + (before.y + before.height / 2) * scale;
  for (let i = 0; i < 3; i++) {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 20, y + 15, { steps: 4 });
    await page.mouse.up();
    const doc = await savedDocument(page),
      polygon = doc.pages[0].elements.at(-1)!;
    expect(polygon.width).toBeCloseTo(before.width, 3);
    expect(polygon.height).toBeCloseTo(before.height, 3);
    x = box.x + (polygon.x + polygon.width / 2) * scale;
    y = box.y + (polygon.y + polygon.height / 2) * scale;
  }
});

test('optional real local background inference', async ({ page }) => {
  test.skip(
    !process.env.SLIDEOP_TEST_BACKGROUND,
    'Opt in to the model download with SLIDEOP_TEST_BACKGROUND=1.',
  );
  test.setTimeout(180000);
  await page.goto('/');
  await expect(page.getByText('Opening your studio…')).toBeHidden();
  const data = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#b14d25';
    ctx.beginPath();
    ctx.ellipse(64, 60, 28, 46, 0, 0, Math.PI * 2);
    ctx.fill();
    return c.toDataURL();
  });
  await page.getByRole('button', { name: 'Uploads', exact: true }).click();
  await page.locator('input[type=file][accept="image/png,image/jpeg,image/webp"]').setInputFiles({
    name: 'inference-test.png',
    mimeType: 'image/png',
    buffer: Buffer.from(data.split(',')[1], 'base64'),
  });
  const before = (await savedDocument(page)).pages[0].elements.at(-1)!;
  await page.getByRole('button', { name: 'Remove background', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Remove background', exact: true })).toBeEnabled({
    timeout: 160000,
  });
  const after = (await savedDocument(page)).pages[0].elements.at(-1)!;
  expect(after.assetId).not.toBe(before.assetId);
});

test('group and ungroup preserve geometry; editable project and all-page PDF export work', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByText('Opening your studio…')).toBeHidden();
  await page.getByRole('button', { name: 'File', exact: true }).click();
  await page.getByRole('button', { name: 'New design', exact: true }).click();
  await page.getByRole('button', { name: 'Elements', exact: true }).click();
  await page.getByRole('button', { name: 'Add rectangle', exact: true }).click();
  for (const [name, value] of [
    ['X', '100'],
    ['Y', '100'],
    ['Rotation', '20'],
  ]) {
    const input = page.getByRole('spinbutton', { name, exact: true });
    await input.fill(value);
    await input.press('Enter');
  }
  await page.getByRole('button', { name: 'Add circle', exact: true }).click();
  const before = (await savedDocument(page)).pages[0].elements;
  await page.getByRole('button', { name: 'Select (V)', exact: true }).click();
  await page.keyboard.press('Control+a');
  await page.getByRole('button', { name: 'Group', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Element name', exact: true })).toHaveValue(
    'Group',
  );
  const grouped = (await savedDocument(page)).pages[0].elements;
  expect(grouped).toHaveLength(1);
  expect(grouped[0].kind).toBe('group');
  await page.getByRole('button', { name: 'Ungroup', exact: true }).click();
  const after = (await savedDocument(page)).pages[0].elements;
  expect(after).toHaveLength(2);
  for (let i = 0; i < 2; i++) {
    expect(after[i].x).toBeCloseTo(before[i].x, 3);
    expect(after[i].y).toBeCloseTo(before[i].y, 3);
    expect(after[i].rotation).toBeCloseTo(before[i].rotation, 3);
  }
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await page.getByLabel('File type').selectOption('slideop');
  let pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download design', exact: true }).click();
  const project = await pending;
  await project.saveAs('test-results/roundtrip.slideop');
  await page.getByRole('button', { name: 'Add page', exact: true }).click();
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await page.getByLabel('File type').selectOption('pdf');
  pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download design', exact: true }).click();
  const pdf = await pending;
  expect(pdf.suggestedFilename()).toMatch(/\.pdf$/);
  await pdf.saveAs('test-results/design.pdf');
  await page
    .locator('input[type=file][accept=".slideop,.json"]')
    .setInputFiles('test-results/roundtrip.slideop');
  await expect(page.getByText('Project imported. Make it your own.')).toBeVisible();
});

test('images retain crops after reload, embed into SVG, and reject unsafe uploads', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByText('Opening your studio…')).toBeHidden();
  const data = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 240;
    c.height = 160;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#f4a46e';
    ctx.fillRect(0, 0, 240, 160);
    ctx.fillStyle = '#4a5140';
    ctx.fillRect(40, 40, 100, 100);
    return c.toDataURL();
  });
  await page.getByRole('button', { name: 'Uploads', exact: true }).click();
  const input = page.locator('input[type=file][accept="image/png,image/jpeg,image/webp"]');
  await input.setInputFiles({
    name: 'sample.png',
    mimeType: 'image/png',
    buffer: Buffer.from(data.split(',')[1], 'base64'),
  });
  await expect(page.getByRole('textbox', { name: 'Element name', exact: true })).toHaveValue(
    'sample.png',
  );
  await page.getByRole('spinbutton', { name: 'Crop X', exact: true }).fill('20');
  await page.getByRole('spinbutton', { name: 'Crop X', exact: true }).press('Enter');
  await savedDocument(page);
  await page.reload();
  await expect(page.getByText('Opening your studio…')).toBeHidden();
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  await page.getByRole('textbox', { name: 'Rename sample.png', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'Crop X', exact: true })).toHaveValue('20');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await page.getByLabel('File type').selectOption('svg');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download design', exact: true }).click();
  const svg = await pending;
  await svg.saveAs('test-results/image.svg');
  const markup = await readFile('test-results/image.svg', 'utf8');
  expect(markup).toContain('data:image/png;base64,');
  expect(markup).not.toContain('blob:');
  await page.getByRole('button', { name: 'Uploads', exact: true }).click();
  await page.locator('input[type=file][accept="image/png,image/jpeg,image/webp"]').setInputFiles({
    name: 'unsafe.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg onload="alert(1)"/>'),
  });
  await expect(
    page.getByText('Use PNG, JPEG, or WebP. SVG and HTML uploads are not accepted.'),
  ).toBeVisible();
});

test('canvas drag commits a reversible edit and locked objects stay put', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Opening your studio…')).toBeHidden();
  await page.getByRole('button', { name: 'File', exact: true }).click();
  await page.getByRole('button', { name: 'New design', exact: true }).click();
  await page.getByRole('button', { name: 'Elements', exact: true }).click();
  await page.getByRole('button', { name: 'Add rectangle', exact: true }).click();
  const before = (await savedDocument(page)).pages[0].elements[0];
  const box = (await page.locator('.upper-canvas').boundingBox())!;
  const scale = box.width / 1280;
  const x = box.x + (before.x + before.width / 2) * scale,
    y = box.y + (before.y + before.height / 2) * scale;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 80, y + 45, { steps: 10 });
  await page.mouse.up();
  const after = (await savedDocument(page)).pages[0].elements[0];
  expect(after.x).toBeGreaterThan(before.x + 50);
  await page.getByRole('button', { name: 'Undo (Ctrl Z)', exact: true }).click();
  await expect(
    page.locator('.properties-panel').getByText('Canvas', { exact: true }),
  ).toBeVisible();
  expect((await savedDocument(page)).pages[0].elements[0].x).toBeCloseTo(before.x);
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  await page.getByRole('textbox', { name: 'Rename Rectangle', exact: true }).click();
  await page.getByRole('button', { name: 'Lock', exact: true }).click();
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 70, y + 40, { steps: 5 });
  await page.mouse.up();
  expect((await savedDocument(page)).pages[0].elements[0].x).toBeCloseTo(before.x);
});
