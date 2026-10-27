import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { makeElement, newDocument } from '../src/model/document';
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
async function open(page: Page) {
  await page.goto('/');
  await expect(page.locator('.loading-screen')).toBeHidden();
  const doc = newDocument();
  doc.pages[0].elements = [
    makeElement('rect', {
      name: 'Crop rectangle',
      x: 100,
      y: 100,
      width: 300,
      height: 200,
      fill: '#ed965d',
    }),
    makeElement('group', {
      name: 'Rotated group',
      x: 700,
      y: 100,
      width: 200,
      height: 160,
      rotation: 30,
      children: [
        makeElement('rect', { x: -100, y: -80, width: 100, height: 160, fill: '#ff0000' }),
        makeElement('rect', { x: 0, y: -80, width: 100, height: 160, fill: '#0000ff' }),
      ],
    }),
  ];
  await page
    .locator('input[type=file][accept=".slideop,.json"]')
    .setInputFiles({
      name: 'crop-elements.slideop',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ document: doc, assets: [] })),
    });
  await expect(page.getByText('Project imported. Make it your own.')).toBeVisible();
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
}
async function field(page: Page, label: string, value: string) {
  const input = page.getByRole('dialog').getByRole('spinbutton', { name: label, exact: true });
  await input.fill(value);
  await input.press('Enter');
}

test('shape and rotated group crops affect rendered pixels, preserve edits, and survive reload', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await open(page);
  await page.getByRole('textbox', { name: 'Rename Crop rectangle', exact: true }).click();
  await page.getByRole('button', { name: 'Crop element', exact: true }).click();
  await field(page, 'Crop width', '120');
  await field(page, 'Crop height', '80');
  await field(page, 'Crop left', '100');
  await field(page, 'Crop top', '40');
  await page.getByRole('button', { name: 'Apply crop', exact: true }).click();
  let doc = await save(page);
  expect(doc.pages[0].elements[0]).toMatchObject({
    x: 100,
    y: 100,
    width: 300,
    height: 200,
    clip: { x: 100, y: 40, width: 120, height: 80 },
  });
  await page.getByRole('button', { name: 'Undo (Ctrl Z)' }).click();
  expect((await save(page)).pages[0].elements[0].clip).toBeUndefined();
  await page.getByRole('button', { name: 'Redo (Ctrl Shift Z)' }).click();
  await page.getByRole('textbox', { name: 'Rename Rotated group', exact: true }).click();
  await page.getByRole('button', { name: 'Crop element', exact: true }).click();
  await field(page, 'Crop width', '100');
  await field(page, 'Crop left', '100');
  await page.screenshot({ path: 'test-results/group-crop.png', fullPage: true });
  await page.getByRole('button', { name: 'Apply crop', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ungroup', exact: true })).toBeDisabled();
  doc = await save(page);
  expect(doc.pages[0].elements[1].rotation).toBe(30);
  expect(doc.pages[0].elements[1].children).toHaveLength(2);
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  let pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download design', exact: true }).click();
  await (await pending).saveAs('test-results/element-crop.png');
  const data = (await readFile('test-results/element-crop.png')).toString('base64');
  const colors = await page.evaluate(async (base64) => {
    const image = await createImageBitmap(
      await (await fetch(`data:image/png;base64,${base64}`)).blob(),
    );
    const c = document.createElement('canvas');
    c.width = image.width;
    c.height = image.height;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(image, 0, 0);
    image.close();
    return [
      [150, 180],
      [240, 180],
      [703, 194],
      [790, 244],
    ].map(([x, y]) => [...ctx.getImageData(x, y, 1, 1).data]);
  }, data);
  expect(colors).toEqual([
    [255, 255, 255, 255],
    [237, 150, 93, 255],
    [255, 255, 255, 255],
    [0, 0, 255, 255],
  ]);
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await page.getByLabel('File type').selectOption('svg');
  pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download design', exact: true }).click();
  await (await pending).saveAs('test-results/element-crop.svg');
  expect(await readFile('test-results/element-crop.svg', 'utf8')).toContain('<clipPath');
  await page.reload();
  await expect(page.locator('.loading-screen')).toBeHidden();
  expect((await save(page)).pages[0].elements[1].clip?.x).toBe(100);
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  await page.getByRole('textbox', { name: 'Rename Rotated group', exact: true }).click();
  await page.getByRole('button', { name: 'Reset element crop', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ungroup', exact: true })).toBeEnabled();
  expect((await save(page)).pages[0].elements[1].clip).toBeUndefined();
  expect(errors).toEqual([]);
});

test('right-click crop opens for an element and cancellation leaves it intact', async ({
  page,
}) => {
  await open(page);
  const box = (await page.locator('.upper-canvas').boundingBox())!,
    z = box.width / 1280;
  await page.mouse.click(box.x + 200 * z, box.y + 160 * z, { button: 'right' });
  await page.getByRole('menu').getByRole('button', { name: 'Crop', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Crop element', exact: true })).toBeVisible();
  await field(page, 'Crop width', '100');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  expect((await save(page)).pages[0].elements[0].clip).toBeUndefined();
});
