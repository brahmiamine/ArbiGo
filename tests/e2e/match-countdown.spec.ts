import { test, expect } from '@playwright/test';

test('upcoming cards count down independently on home and match list, update after return, and exclude history', async ({
  page,
}) => {
  const now = Date.parse('2026-11-17T12:00:00Z');
  await page.clock.setFixedTime(now);
  await page.setViewportSize({ width: 471, height: 844 });
  await page.goto('/demo');
  await expect(page.locator('.match-card')).toBeVisible();
  await page.evaluate(async (now) => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const request = indexedDB.open('arbigo-v1-demo');
      request.onsuccess = () => resolve(request.result);
    });
    const tx = db.transaction('matches', 'readwrite');
    const store = tx.objectStore('matches');
    const rows = store.getAll();
    rows.onsuccess = () => {
      const source = rows.result[0];
      store.clear();
      for (const [homeTeam, delta, status] of [
        ['Décompte proche', 90000, 'DRAFT'],
        ['Décompte demain', 90000000, 'DRAFT'],
        ['Ancien match', -86400000, 'COMPLETED'],
      ] as const)
        store.put({
          ...source,
          id: crypto.randomUUID(),
          homeTeam,
          status,
          kickoffAt: new Date(now + delta).toISOString(),
        });
    };
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, now);
  await page.reload();
  await expect(page.getByRole('timer')).toContainText('00:01:30');
  await expect(page.getByRole('timer')).toHaveAttribute('aria-live', 'off');
  await page.screenshot({ path: 'test-results/home-countdown-471.png' });
  await page
    .getByRole('navigation', { name: 'Navigation mobile' })
    .getByRole('button', { name: 'Mes matchs', exact: true })
    .click();
  const close = page.locator('.match-card').filter({ hasText: 'Décompte proche' });
  const tomorrow = page.locator('.match-card').filter({ hasText: 'Décompte demain' });
  await expect(page.getByRole('timer')).toHaveCount(2);
  await expect(close.getByRole('timer')).toContainText('00:01:30');
  await expect(tomorrow.getByRole('timer')).toContainText('1 j 01:00:00');
  await page.clock.setFixedTime(now + 2000);
  await expect(close.getByRole('timer')).toContainText('00:01:28');
  await expect(tomorrow.getByRole('timer')).toContainText('1 j 00:59:58');
  await page.clock.setFixedTime(now + 95000);
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(close.getByRole('timer')).toContainText('Horaire prévu atteint');
  await expect(close.getByRole('timer')).toContainText('00:00:00');
  for (const width of [320, 390, 471]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  }
  await page.screenshot({ path: 'test-results/matches-countdown-471.png' });
  await page.reload();
  await expect(close.getByRole('timer')).toContainText('Horaire prévu atteint');
  await page.getByRole('button', { name: 'Historique', exact: true }).click();
  await expect(page.locator('.match-card')).toContainText('Ancien match');
  await expect(page.getByRole('timer')).toHaveCount(0);
});
