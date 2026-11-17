import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function settled(page: Page) {
  await page.waitForFunction(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const request = indexedDB.open('arbigo-v1-demo');
      request.onsuccess = () => resolve(request.result);
    });
    const empty = await new Promise<boolean>((resolve) => {
      const request = db.transaction('operations').objectStore('operations').count();
      request.onsuccess = () => resolve(request.result === 0);
    });
    db.close();
    return empty;
  });
}

test('locker steps save independently offline, timing stays visible, and shell is compact', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 471, height: 844 });
  await page.goto('/demo');
  await expect(page.locator('.topbar, .app-footer')).toHaveCount(0);
  await expect(page.locator('.match-card .badge')).toHaveCount(0);
  await page.locator('.match-card').click();
  const bag = await page.locator('.match-bag').boundingBox();
  const start = await page.getByRole('button', { name: /Je suis arrivé/ }).boundingBox();
  expect(start!.y).toBeGreaterThanOrEqual(bag!.y + bag!.height);
  await page.getByRole('button', { name: /Je suis arrivé/ }).click();
  await expect(page.locator('.schedule-indicator')).toHaveText('En avance');
  await expect(page.locator('.schedule-indicator svg')).toBeVisible();
  await expect(page.locator('.step-description')).toHaveCount(0);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await page.getByRole('button', { name: 'Confirmer mon arrivée' }).click();
  await page.getByRole('button', { name: 'Suivant', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Mon vestiaire', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Numéro de mon vestiaire')).toBeVisible();
  await page.waitForFunction(async () =>
    Boolean(
      await (await caches.open('arbigo-shell-v1')).match(new URL('/demo', location.origin).href),
    ),
  );
  await context.setOffline(true);
  await page.getByLabel('Numéro de mon vestiaire').fill('A2');
  await page.getByRole('button', { name: 'Valider cette étape', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Étape validée', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Numéro de mon vestiaire')).toHaveValue('A2');
  await page.getByRole('button', { name: 'Suivant', exact: true }).click();
  await page.getByLabel('Vestiaire · Paris 13 Atletico').fill('3');
  await page.getByRole('button', { name: 'Valider cette étape', exact: true }).click();
  // Missing visitor room must not validate the stage.
  await expect(page.getByRole('button', { name: 'Étape validée', exact: true })).toHaveCount(0);
  await page.getByLabel('Vestiaire · FC Belleville').fill('4');
  await page.getByRole('button', { name: 'Valider cette étape', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Étape validée', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Vestiaire · Paris 13 Atletico')).toHaveValue('3');
  await expect(page.getByLabel('Vestiaire · FC Belleville')).toHaveValue('4');
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
  await page.screenshot({ path: 'test-results/locker-steps-471.png', fullPage: true });
  await page.getByRole('button', { name: 'Précédent', exact: true }).click();
  await expect(page.getByLabel('Numéro de mon vestiaire')).toHaveValue('A2');
  await page.getByLabel('Numéro de mon vestiaire').fill('B1');
  await page.getByRole('button', { name: 'Enregistrer les vestiaires', exact: true }).click();
  await page.reload();
  await expect(page.getByLabel('Numéro de mon vestiaire')).toHaveValue('B1');
  await context.setOffline(false);
});

test('legacy active snapshots gain locker steps without losing current card and use kickoff for final countdown', async ({
  page,
}) => {
  await page.setViewportSize({ width: 471, height: 844 });
  await page.goto('/demo');
  await page.locator('.match-card').click();
  await page.getByRole('button', { name: /Je suis arrivé/ }).click();
  await settled(page);
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
        if (m.status === 'ACTIVE') {
          m.template.steps = m.template.steps.filter((s: { kind: string }) => s.kind !== 'locker');
          delete m.runs['referee-locker'];
          delete m.runs['team-lockers'];
          m.runs.arrival.completedAt = new Date().toISOString();
          m.currentStep = 1;
          store.put(m);
        }
    };
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Tour du terrain', exact: true })).toBeVisible();
  await expect(page.locator('.tunnel-step-position')).toContainText('ÉTAPE 04 / 13');
  await page.getByRole('button', { name: 'Précédent', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Vestiaires des équipes', exact: true }),
  ).toBeVisible();
  // Set only the isolated demo snapshot to a ready state two minutes before kickoff.
  await settled(page);
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
        if (m.status === 'ACTIVE') {
          for (const s of m.template.steps)
            if (s.kind !== 'final') m.runs[s.code].completedAt = new Date().toISOString();
          m.currentStep = m.template.steps.length - 1;
          m.kickoffAt = new Date(Date.now() + 120000).toISOString();
          store.put(m);
        }
    };
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.reload();
  await expect(page.locator('.countdown').nth(1)).toContainText('COUP D’ENVOI');
  await expect(page.locator('.schedule-indicator')).toHaveText('En avance');
  await page.clock.install();
  await page.clock.fastForward(120000);
  await expect(page.locator('.schedule-indicator')).toHaveText('À l’heure');
  await page.clock.fastForward(62000);
  await expect(page.locator('.schedule-indicator')).toHaveText('En retard');
  await expect(page.locator('.countdown').first()).toContainText('RETARD');
  await page.screenshot({ path: 'test-results/timing-delay-471.png', fullPage: true });
});
