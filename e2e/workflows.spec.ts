import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { makeElement, newDocument } from '../src/model/document';
import type { DesignDocument } from '../src/model/document';
import { makePage } from '../src/model/document';

async function save(page: Page): Promise<DesignDocument> {
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
          };
        };
      }),
  );
}
async function importDoc(
  page: Page,
  document: DesignDocument,
  assets: { id: string; name: string; data: string }[] = [],
) {
  await page.goto('/');
  await expect(page.locator('.loading-screen')).toBeHidden();
  await page
    .locator('input[type=file][accept=".slideop,.json"]')
    .setInputFiles({
      name: 'workflow.slideop',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ document, assets })),
    });
  await expect(page.getByText('Project imported. Make it your own.')).toBeVisible();
  await expect(page.locator('.upper-canvas')).toBeVisible();
}
async function projects(page: Page) {
  await page.getByRole('button', { name: 'File', exact: true }).click();
  await page.getByRole('button', { name: 'Local projects', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Your local workspace' })).toBeVisible();
}
async function selectLayer(page: Page, name: string) {
  if (!(await page.locator('.layers-list').isVisible()))
    await page.getByRole('button', { name: 'Layers', exact: true }).click();
  await page.getByRole('textbox', { name: `Rename ${name}`, exact: true }).click();
}
async function imageData(page: Page) {
  await page.goto('/');
  return page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 400;
    c.height = 300;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#ee9933';
    ctx.fillRect(0, 0, 400, 300);
    ctx.fillStyle = '#345678';
    ctx.fillRect(100, 80, 150, 150);
    return c.toDataURL();
  });
}

test('visual crop supports ratio, dragging, cancellation, undo, and reload', async ({ page }) => {
  const data = await imageData(page),
    doc = newDocument();
  doc.pages[0].elements = [
    makeElement('image', { assetId: 'photo', name: 'Photo', width: 400, height: 300 }),
  ];
  await importDoc(page, doc, [{ id: 'photo', name: 'photo.png', data }]);
  await selectLayer(page, 'Photo');
  await page.getByRole('button', { name: 'Crop image visually' }).click();
  await page.getByLabel('Aspect ratio').selectOption('1');
  const window = (await page.locator('.crop-window').boundingBox())!;
  await page.mouse.move(window.x + window.width / 2, window.y + window.height / 2);
  await page.mouse.down();
  await page.mouse.move(window.x + window.width / 2 + 30, window.y + window.height / 2, {
    steps: 5,
  });
  await page.mouse.up();
  const handle = (await page.getByRole('button', { name: 'Crop se corner' }).boundingBox())!;
  await page.mouse.move(handle.x + 5, handle.y + 5);
  await page.mouse.down();
  await page.mouse.move(handle.x - 40, handle.y - 40, { steps: 5 });
  await page.mouse.up();
  await page.screenshot({ path: 'test-results/visual-crop.png', fullPage: true });
  await page.getByRole('button', { name: 'Apply crop' }).click();
  const cropped = (await save(page)).pages[0].elements[0];
  expect(cropped.cropX).toBeGreaterThan(50);
  expect(cropped.width).toBeLessThan(300);
  expect(cropped.width).toBeCloseTo(cropped.height);
  expect(cropped.scaleX).toBeCloseTo(cropped.scaleY);
  expect(cropped.width * cropped.scaleX).toBeCloseTo(400);
  await page.getByRole('button', { name: 'Crop image visually' }).click();
  await page
    .getByRole('dialog', { name: 'Crop image' })
    .getByRole('button', { name: 'Reset crop', exact: true })
    .click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  expect((await save(page)).pages[0].elements[0].width).toBeCloseTo(cropped.width);
  await page.getByRole('button', { name: 'Undo (Ctrl Z)' }).click();
  expect((await save(page)).pages[0].elements[0].width).toBe(400);
  await page.getByRole('button', { name: 'Redo (Ctrl Shift Z)' }).click();
  await save(page);
  await page.reload();
  await expect(page.locator('.loading-screen')).toBeHidden();
  expect((await save(page)).pages[0].elements[0].cropX).toBeCloseTo(cropped.cropX!);
});

test('named styles link objects across pages and survive reload with palettes', async ({
  page,
}) => {
  const doc = newDocument();
  doc.pages[0].elements = [
    makeElement('rect', { name: 'First', fill: '#bb3300' }),
    makeElement('rect', { name: 'Second', x: 400 }),
  ];
  const secondPage = makePage();
  secondPage.name = 'Second page';
  doc.pages.push(secondPage);
  await importDoc(page, doc);
  await selectLayer(page, 'First');
  await page.getByLabel('Style name', { exact: true }).fill('Brand accent');
  await page.getByRole('button', { name: 'Save named style' }).click();
  await selectLayer(page, 'Second');
  await page.getByRole('button', { name: 'Design', exact: true }).click();
  await page.getByRole('button', { name: 'Apply style Brand accent' }).click();
  await page.getByRole('button', { name: 'Duplicate selected', exact: true }).click();
  // Move a linked instance through the editor clipboard to another page.
  await page.locator('.workspace-label').click();
  await page.keyboard.press('Control+x');
  await page.getByRole('button', { name: 'Open page 2: Second page', exact: true }).click();
  await page.keyboard.press('Control+v');
  let saved = await save(page);
  expect(saved.styles).toHaveLength(1);
  expect(saved.pages[0].elements.map((e) => e.fill)).toEqual(['#bb3300', '#bb3300']);
  await page.getByLabel('Color hex', { exact: true }).fill('#225588');
  await page.getByLabel('Color hex', { exact: true }).blur();
  await page.getByRole('button', { name: 'Update style across project' }).click();
  await page.getByRole('button', { name: 'Save color to palette' }).click();
  saved = await save(page);
  expect(saved.pages.flatMap((p) => p.elements).every((e) => e.fill === '#225588')).toBe(true);
  expect(saved.palette).toHaveLength(1);
  await page.reload();
  await expect(page.locator('.loading-screen')).toBeHidden();
  expect((await save(page)).styles?.[0].properties.fill).toBe('#225588');
});

test('existing version-one browser projects migrate without losing data', async ({ page }) => {
  await page.route('**/migration-setup', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>Migration fixture</title>',
    }),
  );
  await page.goto('/migration-setup');
  const doc = newDocument();
  doc.name = 'Existing project';
  doc.pages[0].elements = [makeElement('text', { text: 'Keep this saved work' })];
  await page.evaluate(
    (document) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('slideop-studio', 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          db.createObjectStore('projects', { keyPath: 'id' });
          db.createObjectStore('assets', { keyPath: 'id' });
          db.createObjectStore('settings');
        };
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result,
            tx = db.transaction(['projects', 'settings'], 'readwrite');
          tx.objectStore('projects').put(document);
          tx.objectStore('settings').put(document.id, 'lastProject');
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    doc,
  );
  await page.goto('/');
  await expect(page.locator('.loading-screen')).toBeHidden();
  const saved = await save(page);
  expect(saved.id).toBe(doc.id);
  expect(saved.pages[0].elements[0].text).toBe('Keep this saved work');
  await projects(page);
  await page.getByRole('button', { name: 'Save version', exact: true }).click();
  await expect(page.getByText('Manual checkpoint', { exact: true })).toBeVisible();
});

test('group isolation edits children while preserving parent transforms', async ({ page }) => {
  const doc = newDocument();
  const group = makeElement('group', {
    name: 'Card group',
    x: 350,
    y: 160,
    width: 240,
    height: 180,
    rotation: 30,
    scaleX: 1.4,
    scaleY: 1.4,
    children: [
      makeElement('rect', { name: 'Inner card', x: -120, y: -90, width: 120, height: 100 }),
      makeElement('ellipse', { name: 'Badge', x: 10, y: 10, width: 50, height: 50 }),
    ],
  });
  doc.pages[0].elements = [group];
  await importDoc(page, doc);
  await selectLayer(page, 'Card group');
  await page.getByRole('button', { name: 'Edit group contents' }).click();
  await expect(page.getByRole('navigation', { name: 'Group editing' })).toBeVisible();
  await selectLayer(page, 'Inner card');
  await page.getByRole('spinbutton', { name: 'X', exact: true }).fill('20');
  await page.getByRole('spinbutton', { name: 'X', exact: true }).press('Enter');
  await page.getByLabel('Color hex', { exact: true }).fill('#226688');
  await page.getByLabel('Color hex', { exact: true }).blur();
  await page.getByRole('button', { name: 'Exit group', exact: true }).click();
  const saved = (await save(page)).pages[0].elements[0];
  expect(saved).toMatchObject({ x: 350, y: 160, rotation: 30, scaleX: 1.4, scaleY: 1.4 });
  expect(saved.children![0]).toMatchObject({ x: -100, fill: '#226688' });
  // Re-enter through the actual canvas double-click gesture.
  const box = (await page.locator('.upper-canvas').boundingBox())!,
    z = box.width / 1280;
  const angle = Math.PI / 6,
    localX = 60 * 1.4,
    localY = 50 * 1.4;
  await page.mouse.dblclick(
    box.x + (350 + localX * Math.cos(angle) - localY * Math.sin(angle)) * z,
    box.y + (160 + localX * Math.sin(angle) + localY * Math.cos(angle)) * z,
  );
  await expect(page.getByRole('navigation', { name: 'Group editing' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to page', exact: true }).click();
  await page.reload();
  await expect(page.locator('.loading-screen')).toBeHidden();
  expect((await save(page)).pages[0].elements[0].children![0].fill).toBe('#226688');
});

test('versions restore images after reload and Trash recovers deleted projects', async ({
  page,
}) => {
  const data = await imageData(page),
    doc = newDocument();
  doc.name = 'Recovery test';
  doc.pages[0].elements = [
    makeElement('image', { assetId: 'photo', name: 'Kept photo', width: 400, height: 300 }),
  ];
  await importDoc(page, doc, [{ id: 'photo', name: 'photo.png', data }]);
  await projects(page);
  await page.getByLabel('Version label').fill('Before experiment');
  await page.getByRole('button', { name: 'Save version', exact: true }).click();
  await expect(page.getByText('Before experiment', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await selectLayer(page, 'Kept photo');
  await page.getByRole('button', { name: 'Delete selected', exact: true }).click();
  await save(page);
  await page.reload();
  await expect(page.locator('.loading-screen')).toBeHidden();
  await projects(page);
  const version = page.locator('.recovery-row').filter({ hasText: 'Before experiment' });
  await version.getByRole('button', { name: 'Restore', exact: true }).click();
  await version.getByRole('button', { name: 'Restore version', exact: true }).click();
  await expect(page.getByText('Before restoring a version', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/recovery.png', fullPage: true });
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  const restored = await save(page);
  expect(restored.pages[0].elements[0].assetId).toBeTruthy();
  await selectLayer(page, 'Kept photo');
  await expect(page.getByRole('button', { name: 'Crop image visually' })).toBeVisible();
  await projects(page);
  await page.getByRole('button', { name: 'Delete Recovery test', exact: true }).click();
  await page
    .locator('.delete-confirm')
    .getByRole('button', { name: 'Delete', exact: true })
    .click();
  await page.getByRole('button', { name: 'Trash (1)', exact: true }).click();
  await page.getByRole('button', { name: 'Recover project', exact: true }).click();
  await expect(page.locator('.project-card').filter({ hasText: 'Recovery test' })).toBeVisible();
  await page
    .locator('.project-card')
    .filter({ hasText: 'Recovery test' })
    .getByRole('button', { name: 'Recovery test', exact: true })
    .click();
  expect((await save(page)).pages[0].elements[0].assetId).toBe(
    restored.pages[0].elements[0].assetId,
  );
});

test('guides drag and keyboard nudge with undo', async ({ page }) => {
  await importDoc(page, newDocument());
  const ruler = (await page.locator('.ruler.horizontal').boundingBox())!;
  await page.mouse.click(ruler.x + 100, ruler.y + 5);
  const before = (await save(page)).pages[0].guides[0].position;
  const guide = page.getByRole('button', { name: 'Vertical guide 1', exact: true }),
    box = (await guide.boundingBox())!;
  await page.mouse.move(box.x + 2, box.y + 50);
  await page.mouse.down();
  await page.mouse.move(box.x + 32, box.y + 50, { steps: 5 });
  await page.mouse.up();
  const after = (await save(page)).pages[0].guides[0].position;
  expect(after).toBeGreaterThan(before);
  await guide.focus();
  await guide.press('Shift+ArrowRight');
  expect((await save(page)).pages[0].guides[0].position).toBe(after + 10);
  await page.getByRole('button', { name: 'Undo (Ctrl Z)' }).click();
  expect((await save(page)).pages[0].guides[0].position).toBe(after);
});
