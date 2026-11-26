import { test, expect, type Page, type Locator } from '@playwright/test';
import type { Match } from '@/domain/types';

async function appearance(locator: Locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      font: style.fontFamily,
      color: style.color,
      background: style.backgroundColor,
      border: style.borderRightColor,
      top: style.borderTopColor,
      radius: style.borderRadius,
    };
  });
}
async function debriefReference(page: Page) {
  await page.goto('/demo');
  await page.locator('.match-card').first().waitFor();
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const request = indexedDB.open('arbigo-v1-demo');
      request.onsuccess = () => resolve(request.result);
    });
    const tx = db.transaction('matches', 'readwrite'),
      store = tx.objectStore('matches'),
      rows = store.getAll();
    rows.onsuccess = () => {
      const source = rows.result[0] as Match;
      store.put({
        ...source,
        id: 'design-reference',
        status: 'COMPLETED',
        closedAt: source.kickoffAt,
        finishedAt: source.kickoffAt,
        checkout: { enabled: false },
      });
    };
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.goto('/demo?page=matches&match=design-reference&view=debrief&filter=history');
  await page.locator('.debrief-app .card').first().waitFor();
  return {
    body: await appearance(page.locator('.debrief-app')),
    field: await appearance(page.locator('.debrief-app .field input').first()),
    action: await appearance(page.locator('.debrief-app .btn--primary')),
    card: await appearance(page.locator('.debrief-app .card').first()),
  };
}

test('login, dashboard, forms and preparation share the debrief visual language', async ({
  page,
}) => {
  const reference = await debriefReference(page);
  await page.goto('/auth/login');
  const body = await appearance(page.locator('body'));
  expect(body.font).toBe(reference.body.font);
  expect(body.color).toBe(reference.body.color);
  expect(await appearance(page.locator('input[name="email"]'))).toMatchObject({
    font: reference.field.font,
    border: reference.field.border,
    radius: reference.field.radius,
    background: reference.field.background,
  });
  expect(
    (await appearance(page.getByRole('button', { name: 'Se connecter', exact: true }))).background,
  ).toBe(reference.action.background);
  // The home page highlights its match as a hero; the list keeps the shared card.
  await page.goto('/demo?page=matches');
  expect(await appearance(page.locator('.match-card').first())).toMatchObject({
    font: reference.card.font,
    color: reference.card.color,
    radius: reference.card.radius,
    border: reference.card.border,
    background: reference.card.background,
  });
  expect((await appearance(page.locator('.match-card').first())).top).toBe(reference.card.top);
  await page.getByRole('button', { name: 'Nouveau match', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Nouvelle rencontre', exact: true });
  expect(await appearance(modal.getByLabel('Équipe domicile', { exact: true }))).toMatchObject({
    font: reference.field.font,
    border: reference.field.border,
    radius: reference.field.radius,
    background: reference.field.background,
  });
  expect(
    (await appearance(modal.getByRole('button', { name: 'Créer la rencontre', exact: true })))
      .background,
  ).toBe(reference.action.background);
  await modal.getByRole('button', { name: 'Fermer', exact: true }).click();
  await page.locator('.match-card').first().click();
  await page.getByRole('button', { name: /Je suis arrivé/ }).click();
  expect(await appearance(page.locator('.step-card'))).toMatchObject({
    font: reference.card.font,
    color: reference.card.color,
    radius: reference.card.radius,
    border: reference.card.border,
    background: reference.card.background,
  });
});
