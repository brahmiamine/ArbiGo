import { test, expect, type Page } from '@playwright/test';

const nav = (page: Page) => page.getByRole('navigation', { name: 'Navigation mobile' });
const back = (page: Page) => page.getByRole('button', { name: 'Retour', exact: true });
const title = (page: Page, name: string) => page.getByRole('heading', { name, exact: true });

test.use({ viewport: { width: 390, height: 740 } });

test('"Retour" returns where the referee came from, without loops', async ({ page }) => {
  await page.goto('/demo');
  // Home → match → back goes home, not to the match list.
  await page.locator('.match-card').first().click();
  await back(page).click();
  await expect(title(page, 'Accueil')).toBeVisible();
  // A page opened from a home card keeps its section lit and returns with the scroll position.
  const card = page.getByRole('button', { name: /^Statistiques/ });
  await card.scrollIntoViewIfNeeded();
  const scrolled = await page.evaluate(() => window.scrollY);
  expect(scrolled).toBeGreaterThan(0);
  await card.click();
  await expect(title(page, 'Statistiques')).toBeVisible();
  await expect(nav(page).getByRole('button', { name: 'Accueil', exact: true })).toHaveAttribute(
    'aria-current',
    'true',
  );
  await back(page).click();
  await expect(title(page, 'Accueil')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scrolled);
  // The system back after "Retour" does not reopen the screen just left.
  await page.goBack();
  await expect(title(page, 'Statistiques')).toHaveCount(0);
});

test('a direct opening and a reload still lead to the logical parent', async ({ page }) => {
  for (const [query, parent] of [
    ['?page=bag', 'Accueil'],
    ['?page=indemnity', 'Accueil'],
    ['?page=stats', 'Accueil'],
  ]) {
    await page.goto(`/demo${query}`);
    await back(page).click();
    await expect(title(page, parent)).toBeVisible();
    await expect(page).toHaveURL(/\/demo$/);
  }
  await page.goto('/demo?page=matches');
  await page.locator('.match-card').first().click();
  await page.reload();
  await back(page).click();
  await expect(title(page, 'Matches')).toBeVisible();
  await page.goto('/demo?page=quiz&quiz=favorites');
  await back(page).click();
  await expect(page).toHaveURL(/quiz=reviews/);
  await back(page).click();
  await expect(page).toHaveURL(/quiz=home/);
});

test('the document reader answers both "Retour" and the system back', async ({ page }) => {
  await page.goto('/demo?page=documents');
  const open = page.getByRole('button', { name: 'Lire Lois du Jeu dans l’application' });
  await open.click();
  await expect(page).toHaveURL(/doc=/);
  await page.goBack();
  await expect(title(page, 'Mes documents')).toBeVisible();
  await open.click();
  await back(page).click();
  await expect(title(page, 'Mes documents')).toBeVisible();
  await expect(page).toHaveURL(/page=documents$/);
});

test('a modified form asks before closing, an untouched one does not', async ({ page }) => {
  await page.goto('/demo');
  const dialog = page.getByRole('dialog', { name: 'Nouvelle rencontre', exact: true });
  const create = page.getByRole('button', { name: 'Nouveau match', exact: true });
  const close = dialog.getByRole('button', { name: 'Fermer', exact: true });
  let asked = 0;
  let accept = false;
  page.on('dialog', (prompt) => {
    asked += 1;
    void (accept ? prompt.accept() : prompt.dismiss());
  });
  await create.click();
  await close.click();
  await expect(dialog).toBeHidden();
  expect(asked).toBe(0);
  await create.click();
  await dialog.getByLabel('Équipe domicile', { exact: true }).fill('Brouillon FC');
  await dialog.getByLabel('Date', { exact: true }).click();
  await close.click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog.getByLabel('Équipe domicile', { exact: true })).toHaveValue('Brouillon FC');
  accept = true;
  await close.click();
  await expect(dialog).toBeHidden();
  expect(asked).toBeGreaterThanOrEqual(2);
});

test('headers share one back button and fit every phone width', async ({ page }) => {
  for (const width of [320, 360, 375, 390, 414, 480, 768]) {
    await page.setViewportSize({ width, height: 800 });
    for (const query of ['?page=bag', '?page=indemnity', '?page=stats']) {
      await page.goto(`/demo${query}`);
      const box = (await back(page).boundingBox())!;
      expect([box.width, box.height]).toEqual([44, 44]);
      expect((await page.locator('.compact-heading').boundingBox())!.height).toBeLessThanOrEqual(
        48,
      );
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width,
      );
    }
  }
});
