import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { makeElement, newDocument } from '../src/model/document';
import type { DesignDocument } from '../src/model/document';

async function save(page: Page, manual = true): Promise<DesignDocument> {
  if (manual) await page.locator('.save-state').click();
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
async function fixture(page: Page) {
  await page.goto('/');
  await expect(page.locator('.loading-screen')).toBeHidden();
  const doc = newDocument();
  doc.pages[0].elements = [
    makeElement('rect', { name: 'First shape', x: 150, y: 180, width: 180, height: 130 }),
    makeElement('rect', { name: 'Second shape', x: 600, y: 180, width: 180, height: 130 }),
  ];
  await page.locator('input[type=file][accept=".slideop,.json"]').setInputFiles({
    name: 'controls.slideop',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ document: doc, assets: [] })),
  });
  await expect(page.getByText('Project imported. Make it your own.')).toBeVisible();
  return doc;
}

test('right-click opens actions for the clicked object', async ({ page }) => {
  await fixture(page);
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  await page.getByRole('textbox', { name: 'Rename First shape', exact: true }).click();
  const box = (await page.locator('.upper-canvas').boundingBox())!,
    zoom = box.width / 1280;
  await page.mouse.click(box.x + 650 * zoom, box.y + 220 * zoom, { button: 'right' });
  await expect(page.getByRole('menu')).toBeVisible();
  await page
    .getByRole('menu')
    .getByRole('button', { name: /Duplicate/ })
    .click();
  const doc = await save(page);
  expect(doc.pages[0].elements).toHaveLength(3);
  expect(doc.pages[0].elements[2].name).toBe('Second shape');
});

test('Space activates a focused button instead of switching to the pan tool', async ({ page }) => {
  await fixture(page);
  await page.getByRole('button', { name: 'Elements', exact: true }).click();
  const add = page.getByRole('button', { name: 'Add rectangle', exact: true });
  await add.focus();
  await add.press('Space');
  await expect(page.getByRole('textbox', { name: 'Element name', exact: true })).toHaveValue(
    'Rectangle',
  );
  expect((await save(page)).pages[0].elements).toHaveLength(3);
});

test('hex colors apply on Enter and numeric controls reset clamped drafts', async ({ page }) => {
  await fixture(page);
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  await page.getByRole('textbox', { name: 'Rename First shape', exact: true }).click();
  const color = page.getByRole('textbox', { name: 'Color hex', exact: true });
  await color.fill('#123456');
  await color.press('Enter');
  expect(await color.evaluate((el) => el === document.activeElement)).toBe(false);
  expect((await save(page)).pages[0].elements[0].fill).toBe('#123456');
  const rotation = page.getByRole('spinbutton', { name: 'Rotation', exact: true });
  await rotation.fill('360');
  await rotation.press('Enter');
  await rotation.fill('999');
  await rotation.press('Enter');
  await expect(rotation).toHaveValue('360');
});

test('line color control updates the visible stroke', async ({ page }) => {
  await fixture(page);
  await page.getByRole('button', { name: 'Elements', exact: true }).click();
  await page.getByRole('button', { name: 'Add line', exact: true }).click();
  const color = page.getByRole('textbox', { name: /^(Line color|Color) hex$/ });
  await color.fill('#11aa77');
  await color.blur();
  expect((await save(page)).pages[0].elements.at(-1)!.stroke).toBe('#11aa77');
});

test('autosave leaves an active text editing session open', async ({ page }) => {
  await fixture(page);
  await page.getByRole('button', { name: 'Text', exact: true }).click();
  await page.getByRole('button', { name: 'Add a text box', exact: true }).click();
  const canvas = (await page.locator('.upper-canvas').boundingBox())!,
    zoom = canvas.width / 1280;
  await page.mouse.dblclick(canvas.x + 590 * zoom, canvas.y + 300 * zoom);
  await expect(page.locator('textarea[data-fabric="textarea"]')).toBeFocused();
  await page.keyboard.press('Control+a');
  await page.keyboard.type('A sentence');
  await page.waitForTimeout(1000);
  const editing = await page
    .locator('textarea[data-fabric="textarea"]')
    .evaluateAll((els) => els.some((el) => el === document.activeElement));
  expect(editing).toBe(true);
  expect((await save(page, false)).pages[0].elements.at(-1)!.text).toBe('A sentence');
  await page.keyboard.type(' that keeps going');
  await page.keyboard.press('Escape');
  expect((await save(page)).pages[0].elements.at(-1)!.text).toBe('A sentence that keeps going');
});

test('pan moves a fitted canvas and Fit returns it to view', async ({ page }) => {
  await fixture(page);
  await page.getByRole('button', { name: 'Fit to screen', exact: true }).click();
  const canvas = page.locator('.upper-canvas'),
    before = (await canvas.boundingBox())!;
  await page.getByRole('button', { name: 'Pan (H or hold Space)', exact: true }).click();
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  await page.mouse.move(before.x + before.width / 2 + 65, before.y + before.height / 2 + 35, {
    steps: 5,
  });
  await page.mouse.up();
  const after = (await canvas.boundingBox())!;
  expect(after.x).toBeGreaterThan(before.x + 30);
  expect(after.y).toBeGreaterThan(before.y + 15);
  await page.getByRole('button', { name: 'Select (V)', exact: true }).click();
  await page.mouse.click(
    after.x + 220 * (after.width / 1280),
    after.y + 220 * (after.width / 1280),
  );
  await expect(page.getByRole('textbox', { name: 'Element name', exact: true })).toHaveValue(
    'First shape',
  );
  await page.getByRole('button', { name: 'Fit to screen', exact: true }).click();
  const fitted = (await canvas.boundingBox())!;
  expect(fitted.x).toBeCloseTo(before.x, 0);
  expect(fitted.y).toBeCloseTo(before.y, 0);
});

test('selecting a layer allows object shortcuts and double-click still allows renaming', async ({
  page,
}) => {
  await fixture(page);
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  await page.getByRole('textbox', { name: 'Rename First shape', exact: true }).click();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('spinbutton', { name: 'X', exact: true })).toHaveValue('151');
  await page.keyboard.press('Control+d');
  await expect(page.getByRole('spinbutton', { name: 'X', exact: true })).toHaveValue('175');
  expect((await save(page)).pages[0].elements).toHaveLength(3);
  const names = page.getByRole('textbox', { name: 'Rename First shape', exact: true });
  await names.first().dblclick();
  await page.keyboard.press('Control+a');
  await page.keyboard.type('Renamed layer');
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('textbox', { name: 'Rename Renamed layer', exact: true }),
  ).toBeVisible();
});

test('native color input changes apply without render loops', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await fixture(page);
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  await page.getByRole('textbox', { name: 'Rename First shape', exact: true }).click();
  await page
    .locator('input[type="color"][aria-label="Color"]')
    .evaluate((input: HTMLInputElement) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
        input,
        '#ab7733',
      );
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  expect((await save(page)).pages[0].elements[0].fill).toBe('#ab7733');
  expect(errors).toEqual([]);
});
