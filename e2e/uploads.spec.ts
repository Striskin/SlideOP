import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
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
async function upload(page: Page) {
  await page.goto('/');
  await expect(page.locator('.loading-screen')).toBeHidden();
  await page.getByRole('button', { name: 'File', exact: true }).click();
  await page.getByRole('button', { name: 'New design', exact: true }).click();
  const image = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 80;
    c.height = 60;
    c.getContext('2d')!.fillRect(0, 0, 80, 60);
    return c.toDataURL();
  });
  await page.getByRole('button', { name: 'Uploads', exact: true }).click();
  await page.locator('input[type=file][accept="image/png,image/jpeg,image/webp"]').setInputFiles({
    name: 'remove-me.png',
    mimeType: 'image/png',
    buffer: Buffer.from(image.split(',')[1], 'base64'),
  });
  await expect(
    page.getByRole('button', { name: 'Delete upload remove-me.png', exact: true }),
  ).toBeVisible();
  return save(page);
}
async function storage(page: Page, assetId: string) {
  return page.evaluate(
    (id) =>
      new Promise<{ exists: boolean; refs: boolean; orphan: boolean }>((resolve) => {
        const r = indexedDB.open('slideop-studio');
        r.onsuccess = () => {
          const db = r.result,
            tx = db.transaction(['assets', 'projects', 'versions', 'trash']);
          const asset = tx.objectStore('assets').get(id),
            orphan = tx.objectStore('assets').get('orphan-upload'),
            projects = tx.objectStore('projects').getAll(),
            versions = tx.objectStore('versions').getAll(),
            trash = tx.objectStore('trash').getAll();
          tx.oncomplete = () => {
            resolve({
              exists: !!asset.result,
              orphan: !!orphan.result,
              refs: JSON.stringify([projects.result, versions.result, trash.result]).includes(id),
            });
            db.close();
          };
        };
      }),
    assetId,
  );
}

test('deleting an upload clears stored bytes, saved references, undo, clipboard, and other tabs', async ({
  page,
  context,
}) => {
  const doc = await upload(page),
    assetId = doc.pages[0].elements[0].assetId!;
  await page.getByRole('button', { name: 'Duplicate selected', exact: true }).click();
  await page.getByRole('button', { name: 'Undo (Ctrl Z)' }).click();
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  await page.getByRole('textbox', { name: 'Rename remove-me.png', exact: true }).click();
  await page.keyboard.press('Control+c');
  await save(page);
  await page.evaluate(
    ({ doc, assetId }) =>
      new Promise<void>((resolve) => {
        const r = indexedDB.open('slideop-studio');
        r.onsuccess = () => {
          const db = r.result,
            tx = db.transaction(['assets', 'projects', 'versions', 'trash'], 'readwrite');
          tx.objectStore('projects').put({
            ...doc,
            id: 'shared-project',
            name: 'Shared saved project',
          });
          tx.objectStore('versions').put({
            id: 'saved-version',
            projectId: doc.id,
            createdAt: new Date().toISOString(),
            label: 'With image',
            document: doc,
          });
          tx.objectStore('trash').put({
            id: 'trash-project',
            deletedAt: new Date().toISOString(),
            document: { ...doc, id: 'trash-project' },
          });
          const asset = tx.objectStore('assets').get(assetId);
          asset.onsuccess = () =>
            tx
              .objectStore('assets')
              .put({ ...asset.result, id: 'orphan-upload', name: 'old-unused.png' });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
        };
      }),
    { doc, assetId },
  );
  const other = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  other.on('pageerror', (error) => errors.push(error.message));
  await other.goto('/');
  await expect(other.locator('.loading-screen')).toBeHidden();
  await other.getByRole('button', { name: 'Uploads', exact: true }).click();
  await expect(
    other.getByRole('button', { name: 'Delete upload remove-me.png', exact: true }),
  ).toBeVisible();
  await other.getByRole('button', { name: 'Layers', exact: true }).click();
  await other.getByRole('textbox', { name: 'Rename remove-me.png', exact: true }).click();
  await other.getByRole('button', { name: 'Crop image visually', exact: true }).click();
  await expect(other.getByRole('dialog', { name: 'Crop image', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Uploads', exact: true }).click();
  await page.getByRole('button', { name: 'Delete upload remove-me.png', exact: true }).click();
  await page.getByRole('button', { name: 'Keep upload', exact: true }).click();
  expect((await storage(page, assetId)).exists).toBe(true);
  await page.getByRole('button', { name: 'Delete upload remove-me.png', exact: true }).click();
  await page.getByRole('button', { name: 'Delete permanently', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(other.getByRole('dialog', { name: 'Crop image', exact: true })).toBeHidden();
  await other.getByRole('button', { name: 'Uploads', exact: true }).click();
  await expect(
    other.getByRole('button', { name: 'Delete upload remove-me.png', exact: true }),
  ).toBeHidden();
  expect(await storage(page, assetId)).toEqual({ exists: false, refs: false, orphan: true });
  await page.getByRole('button', { name: 'Redo (Ctrl Shift Z)' }).click();
  await page.getByRole('button', { name: 'Undo (Ctrl Z)' }).click();
  await page.locator('.workspace-label').click();
  await page.keyboard.press('Control+v');
  expect((await save(page)).pages[0].elements).toHaveLength(0);
  await save(other);
  expect((await storage(page, assetId)).exists).toBe(false);
  await page.getByRole('button', { name: 'Manage stored uploads', exact: true }).click();
  await page
    .getByRole('button', { name: 'Delete stored upload old-unused.png', exact: true })
    .click();
  await page.getByRole('button', { name: 'Delete permanently', exact: true }).click();
  await expect(page.getByText('No stored uploads.', { exact: true })).toBeVisible();
  expect((await storage(page, assetId)).orphan).toBe(false);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.reload();
  await expect(page.locator('.loading-screen')).toBeHidden();
  expect((await save(page)).pages[0].elements).toHaveLength(0);
  expect(errors).toEqual([]);
});
