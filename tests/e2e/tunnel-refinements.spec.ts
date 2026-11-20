import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const next = (page: Page) => page.getByRole('button', { name: 'Suivant', exact: true }).click();
async function swipe(page: Page) {
  await page.locator('.step-card, .jersey-preview').evaluate((card) => {
    const touch = (y: number) =>
      new Touch({ identifier: 1, target: card, clientX: 160, clientY: y });
    card.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [touch(550)] }));
    card.dispatchEvent(new TouchEvent('touchend', { bubbles: true, changedTouches: [touch(200)] }));
  });
}

test('scrolling never changes steps; illustrated controls, full-screen shirt and single briefings persist', async ({
  page,
}) => {
  await page.setViewportSize({ width: 471, height: 844 });
  await page.goto('/demo');
  await page.locator('.match-card').first().click();
  await expect(page.locator('.detail-actions, .detail-badges')).toHaveCount(0);
  await page.getByRole('button', { name: /Je suis arrivé/ }).click();
  await swipe(page);
  await page.mouse.wheel(0, 450);
  await expect(page.locator('.tunnel-step-position')).toContainText('ÉTAPE 01');
  await expect(page.locator('.adjacent-step.next')).toContainText('Mon vestiaire');
  await page.getByRole('button', { name: 'Confirmer mon arrivée' }).click();
  await expect(page.locator('.tunnel-step-position')).toContainText('ÉTAPE 01');
  await next(page);
  await next(page);
  await next(page);
  await next(page);
  await expect(page.locator('.control-illustration')).toHaveCount(5);
  await expect(page.getByRole('img', { name: /points de fixation au sol/ })).toBeVisible();
  await swipe(page);
  await expect(page.locator('.tunnel-step-position')).toContainText('ÉTAPE 05');
  await page.screenshot({ path: 'test-results/controls-471.png', fullPage: true });
  await next(page);
  await next(page);
  await expect(page.getByText(/Aucune tenue complète|Si les deux gardiens/)).toHaveCount(0);
  await expect(
    page.getByRole('img', { name: /Revêtement, forme et état du ballon/ }),
  ).toBeVisible();
  const home = page.getByRole('region', { name: 'Domicile · Paris 13 Atletico' });
  const away = page.getByRole('region', { name: 'Extérieur · FC Belleville' });
  for (const [team, role, color] of [
    [home, 'Joueurs', 'rouge'],
    [home, 'Gardien', 'violet'],
    [away, 'Joueurs', 'blanc'],
    [away, 'Gardien', 'noir'],
  ] as const) {
    await team
      .getByRole('group', { name: role, exact: true })
      .getByRole('button', { name: color, exact: true })
      .click();
  }
  await next(page);
  await expect(page.locator('.jersey-preview')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Maillot jaune', exact: true })).toBeVisible();
  await expect(page.locator('.tunnel-header')).toBeHidden();
  await expect(page.locator('.jersey-opponents svg')).toHaveCount(4);
  await expect(page.locator('.jersey-preview')).toContainText('À emporter');
  for (const width of [320, 390, 471]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  }
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(axe.violations).toEqual([]);
  await page.screenshot({ path: 'test-results/jersey-preview-471.png', fullPage: true });
  await page.reload();
  await expect(page.locator('.jersey-preview')).toBeVisible();
  await swipe(page);
  await expect(page.locator('.jersey-preview')).toBeVisible();
  await page.getByRole('button', { name: 'Précédent', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Maillots et ballon', exact: true }),
  ).toBeVisible();
  await next(page);
  await expect(page.locator('.jersey-preview')).toBeVisible();
  await next(page);
  await expect(
    page.getByRole('heading', { name: 'Prise en charge de la feuille', exact: true }),
  ).toBeVisible();
  await next(page);
  await expect(page.locator('.briefing blockquote strong')).toContainText(
    'Bonjour à tous les deux',
  );
  await expect(page.locator('.step-fieldset button')).toHaveCount(1);
  await page.getByRole('button', { name: 'Confirmer les consignes données' }).click();
  await expect(page.getByRole('button', { name: 'Étape validée' })).toBeVisible();
  await expect(page.locator('.tunnel-step-position')).toContainText('ÉTAPE 09');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Étape validée' })).toBeVisible();
  await next(page);
  await next(page);
  await expect(
    page.getByRole('heading', { name: 'Consignes aux assistants', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.step-fieldset button')).toHaveCount(1);
  await page.getByRole('button', { name: 'Confirmer les consignes données' }).click();
  await expect(page.getByRole('button', { name: 'Étape validée' })).toBeVisible();
  await page.screenshot({ path: 'test-results/briefing-471.png', fullPage: true });
});

test('restored shirt preview on a transferred tunnel keeps transfer controls reachable', async ({
  page,
}) => {
  await page.goto('/demo');
  await page.locator('.match-card').first().click();
  await page.getByRole('button', { name: /Je suis arrivé/ }).click();
  for (let i = 0; i < 7; i++) await next(page);
  await expect(page.locator('.jersey-preview')).toBeVisible();
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open('arbigo-v1-demo');
      r.onsuccess = () => resolve(r.result);
    });
    const tx = db.transaction('matches', 'readwrite');
    const store = tx.objectStore('matches');
    const rows = store.getAll();
    rows.onsuccess = () => {
      for (const m of rows.result)
        if (m.status === 'ACTIVE') store.put({ ...m, ownerDeviceId: 'another-device' });
    };
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.reload();
  await expect(page.locator('.jersey-preview')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Transférer sur cet appareil' })).toBeVisible();
  for (const button of await page.locator('button.adjacent-step').all())
    await expect(button).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Options de la rencontre' })).toBeVisible();
});

test('without upcoming matches, home and match list show newest archived matches in date order', async ({
  page,
}) => {
  await page.goto('/demo');
  await expect(page.locator('.match-card')).toBeVisible();
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open('arbigo-v1-demo');
      r.onsuccess = () => resolve(r.result);
    });
    const tx = db.transaction('matches', 'readwrite');
    const store = tx.objectStore('matches');
    const rows = store.getAll();
    rows.onsuccess = () => {
      const source = rows.result[0];
      store.clear();
      for (const [i, date] of ['2026-10-01', '2026-10-25', '2026-11-01', '2026-10-15'].entries())
        store.put({
          ...source,
          id: `old-${i}`,
          homeTeam: `Archive ${date}`,
          awayTeam: 'Visiteurs',
          kickoffAt: `${date}T14:00:00Z`,
          status: 'COMPLETED',
          finishedAt: `${date}T16:00:00Z`,
        });
    };
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Dernier match', exact: true })).toBeVisible();
  await expect(page.locator('.recent-matches .match-card')).toHaveCount(1);
  await expect(page.locator('.recent-matches .match-card').first()).toContainText(
    'Archive 2026-11-01',
  );
  await page
    .getByRole('navigation', { name: 'Navigation principale' })
    .getByRole('button', { name: 'Matches', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Dernier match', exact: true })).toBeVisible();
  await expect(page.locator('.last-match .match-card')).toContainText('Archive 2026-11-01');
  await page.locator('.last-match .match-card').click();
  await expect(page.getByRole('button', { name: 'Ouvrir le débrief', exact: true })).toBeVisible();
});
