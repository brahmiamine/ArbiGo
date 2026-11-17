import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('SPORTCASH follows team lockers, opens a separate tab and requires a manual confirmation that survives offline reload', async ({
  page,
  context,
}) => {
  await context.route('https://app.sportcash.fr/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<title>SPORTCASH test</title><p>Check-in</p>',
    }),
  );
  await page.setViewportSize({ width: 471, height: 844 });
  await page.goto('/demo');
  await expect(page.locator('.match-card')).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(
    async () =>
      Boolean(navigator.serviceWorker.controller) &&
      Boolean(await (await caches.open('arbigo-shell-v1')).match('/demo')),
  );
  await page.locator('.match-card').click();
  await page.getByRole('button', { name: /Je suis arrivé/ }).click();
  for (let i = 0; i < 2; i++)
    await page.getByRole('button', { name: 'Suivant', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Vestiaires des équipes', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: /^Étape suivante · Check-in SPORTCASH/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Check-in SPORTCASH', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.tunnel-step-position')).toContainText('ÉTAPE 04 / 14');
  await expect(page.locator('.adjacent-step.previous')).toContainText('Vestiaires des équipes');
  await expect(page.locator('.adjacent-step.next')).toContainText('Tour du terrain');
  const link = page.getByRole('link', { name: 'Ouvrir SPORTCASH', exact: true });
  await expect(link).toHaveAttribute('href', 'https://app.sportcash.fr/');
  await expect(link).toHaveAttribute('target', '_blank');
  const popup = await Promise.all([page.waitForEvent('popup'), link.click()]).then(([tab]) => tab);
  await expect(popup).toHaveURL('https://app.sportcash.fr/');
  expect(await popup.evaluate(() => window.opener)).toBeNull();
  await popup.close();
  await expect(
    page.getByRole('button', { name: 'Confirmer mon check-in', exact: true }),
  ).toBeEnabled();
  await expect(page.locator('.tunnel-footer')).toContainText('0 / 13 validées');
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
  await page.screenshot({ path: 'test-results/sportcash-471.png', fullPage: true });
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Confirmer mon check-in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Étape validée', exact: true })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Check-in SPORTCASH', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Étape validée', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Ouvrir le bilan/ }).click();
  await expect(
    page.locator('.review-steps').getByRole('button', { name: /^Check-in SPORTCASH/ }),
  ).toContainText('Validée');
  await context.setOffline(false);
});
