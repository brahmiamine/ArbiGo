import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const mobileNav = (page: Page) => page.getByRole('navigation', { name: 'Navigation mobile' });
async function reloadOn(page: Page, pattern: RegExp) {
  await expect(page).toHaveURL(pattern);
  await page.reload();
  await expect(page).toHaveURL(pattern);
}
test('inventory spacing, revised equipment and every navigation view survive reload and back', async ({
  page,
}) => {
  await page.setViewportSize({ width: 471, height: 844 });
  await page.goto('/demo');
  await mobileNav(page).getByRole('button', { name: 'Mon sac', exact: true }).click();
  await reloadOn(page, /page=bag/);
  await expect(page.getByRole('heading', { name: 'Mon sac.' })).toBeVisible();
  for (const color of ['jaune', 'rouge', 'violet', 'noir'])
    await expect(
      page.locator('.inventory-label strong').filter({ hasText: `Maillot ${color}` }),
    ).toBeVisible();
  await expect(page.getByText('Maillot bleu', { exact: true })).toHaveCount(0);
  await expect(
    page.getByText('Feuille de match papier (remplace la FMI)', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Feuille de notes (cartons, buts, incidents)', { exact: true }),
  ).toBeVisible();
  for (const width of [320, 390, 471]) {
    await page.setViewportSize({ width, height: 844 });
    const row = page.locator('.inventory-row').first();
    const image = await row.locator('.equipment-image').boundingBox(),
      label = await row.locator('.inventory-label').boundingBox();
    expect(label!.x - (image!.x + image!.width)).toBeGreaterThanOrEqual(10);
    expect((await row.boundingBox())!.height).toBeLessThan(130);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/inventory-471.png' });
  await page.getByRole('button', { name: /Mes tenues/ }).click();
  await reloadOn(page, /page=bag&view=outfits/);
  await expect(page.getByRole('button', { name: /Mes tenues/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await mobileNav(page).getByRole('button', { name: 'Profil', exact: true }).click();
  await reloadOn(page, /page=profile/);
  await expect(
    mobileNav(page).getByRole('button', { name: 'Profil', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await mobileNav(page).getByRole('button', { name: 'Mes matchs', exact: true }).click();
  await page.getByRole('button', { name: 'Historique', exact: true }).click();
  await reloadOn(page, /page=matches&filter=history/);
  await expect(page.getByRole('button', { name: 'Historique', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'À venir', exact: true }).click();
  await page.locator('.match-card').first().click();
  await reloadOn(page, /page=matches&match=/);
  await expect(page.getByRole('heading', { name: 'Sac du match', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Mes matchs.' })).toBeVisible();
});

test('modern file zones explain unavailable demo uploads and expose the same accessible picker', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/demo?page=bag');
  await page.getByRole('button', { name: 'Ajouter un article', exact: true }).click();
  const zone = page.locator('.file-zone');
  await expect(zone).toBeVisible();
  await expect(zone).toContainText('Choisir une image');
  await expect(page.getByLabel('Photo facultative', { exact: true })).toBeDisabled();
  await expect(zone).toContainText('disponible avec un compte');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(results.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'test-results/import-390.png' });
});
