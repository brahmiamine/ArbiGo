import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('review records each validation delta and the general indicator opens it from normal and shirt views offline', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 471, height: 844 });
  await page.clock.install({ time: new Date('2026-11-17T12:00:00Z') });
  await page.goto('/demo');
  await expect(page.locator('.match-card')).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(
    async () =>
      Boolean(navigator.serviceWorker.controller) &&
      Boolean(await (await caches.open('arbigo-shell-v1')).match('/demo')),
  );
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open('arbigo-v1-demo');
      r.onsuccess = () => resolve(r.result);
    });
    const tx = db.transaction('matches', 'readwrite'),
      store = tx.objectStore('matches'),
      rows = store.getAll();
    rows.onsuccess = () => {
      for (const m of rows.result)
        store.put({ ...m, kickoffAt: new Date(Date.now() + 78 * 60000).toISOString() });
    };
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.reload();
  await page.locator('.match-card').click();
  await page.getByRole('button', { name: /Je suis arrivé/ }).click();
  await page.getByRole('button', { name: 'Confirmer mon arrivée' }).click();
  await page.getByRole('button', { name: 'Suivant', exact: true }).click();
  await page.getByLabel('Numéro de mon vestiaire').fill('1');
  await page.clock.fastForward(7 * 60000);
  if (await page.getByRole('button', { name: 'Fermer le message' }).isVisible())
    await page.getByRole('button', { name: 'Fermer le message' }).click();
  await page.getByRole('button', { name: 'Valider cette étape', exact: true }).click();
  await page.getByRole('button', { name: 'Suivant', exact: true }).click();
  await page.getByLabel('Vestiaire · Paris 13 Atletico').fill('2');
  await page.getByLabel('Vestiaire · FC Belleville').fill('3');
  await page.getByRole('button', { name: 'Valider cette étape', exact: true }).click();
  await page.getByRole('button', { name: /Ouvrir le bilan/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Bilan avant le coup d’envoi', exact: true }),
  ).toBeVisible();
  const arrival = page.locator('.review-steps').getByRole('button', { name: /^Arrivée au stade/ });
  const referee = page.locator('.review-steps').getByRole('button', { name: /^Mon vestiaire/ });
  const teams = page
    .locator('.review-steps')
    .getByRole('button', { name: /^Vestiaires des équipes/ });
  const pitch = page.locator('.review-steps').getByRole('button', { name: /^Tour du terrain/ });
  await expect(arrival.locator('.step-timing')).toHaveText('−3 min');
  await expect(arrival.locator('.step-timing')).toHaveClass(/ahead/);
  await expect(referee.locator('.step-timing')).toHaveText('+2 min');
  await expect(referee.locator('.step-timing')).toHaveClass(/late/);
  await expect(teams.locator('.step-timing')).toHaveText('0 min');
  await expect(teams.locator('.step-timing')).toHaveClass(/on-time/);
  await expect(arrival.locator('.review-step-times')).toHaveText('Prévu 13:03 · Validé 13:00');
  await expect(pitch.locator('.step-timing')).toHaveCount(0);
  await expect(pitch.locator('.review-step-times')).toContainText('Non validée');
  await expect(
    page.getByRole('button', { name: 'Coup d’envoi effectué', exact: true }),
  ).toBeDisabled();
  for (const width of [320, 390, 471]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  }
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/stage-timing-471.png', fullPage: true });
  await context.setOffline(true);
  await page.clock.fastForward(6 * 3600000);
  await page.reload();
  await expect(arrival.locator('.step-timing')).toHaveText('−3 min');
  await expect(referee.locator('.step-timing')).toHaveText('+2 min');
  await arrival.click();
  await expect(page.getByRole('heading', { name: 'Arrivée au stade', exact: true })).toBeVisible();
  const indicator = page.getByRole('button', { name: /Ouvrir le bilan/ });
  await indicator.focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Bilan avant le coup d’envoi', exact: true }),
  ).toBeVisible();
  await page
    .locator('.review-steps')
    .getByRole('button', { name: /^Maillots et ballon/ })
    .click();
  await page.getByRole('button', { name: 'Suivant', exact: true }).click();
  await expect(page.locator('.jersey-preview')).toBeVisible();
  await page
    .locator('.jersey-timing')
    .getByRole('button', { name: /Ouvrir le bilan/ })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Bilan avant le coup d’envoi', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.jersey-preview')).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.getByRole('button', { name: /Ouvrir le bilan/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Bilan avant le coup d’envoi', exact: true }),
  ).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await context.setOffline(false);
});
