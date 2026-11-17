import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('profile name and custom briefings persist and appear in the tunnel; shirt carousel saves independently offline', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 471, height: 844 });
  await page.goto('/demo?page=profile');
  await page.getByRole('button', { name: 'Modifier mon profil', exact: true }).click();
  await page.getByLabel('Nom', { exact: true }).fill('Arbitre personnalisé');
  await page.screenshot({ path: 'test-results/profile-editor-471.png' });
  await page.getByRole('button', { name: 'Enregistrer mon profil' }).click();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Arbitre personnalisé', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Modifier les consignes', exact: true }).click();
  await page
    .getByLabel('Consignes aux capitaines', { exact: true })
    .fill('Bonjour capitaines.\nGardons un dialogue calme.');
  await page
    .getByLabel('Consignes aux assistants', { exact: true })
    .fill('Bonjour assistants, communiquons clairement.');
  await page.screenshot({ path: 'test-results/briefing-editor-471.png' });
  await page.getByRole('button', { name: 'Enregistrer les consignes' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Modifier les consignes', exact: true }).click();
  await expect(page.getByLabel('Consignes aux capitaines', { exact: true })).toHaveValue(
    'Bonjour capitaines.\nGardons un dialogue calme.',
  );
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Navigation mobile' })
    .getByRole('button', { name: 'Accueil', exact: true })
    .click();
  await page.locator('.match-card').first().click();
  await expect(page.getByRole('checkbox', { name: 'Feuille de notes', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Je suis arrivé/ }).click();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  const next = () => page.getByRole('button', { name: 'Suivant', exact: true }).click();
  await next();
  await expect(page.locator('.step-description')).toHaveCount(0);
  await expect(page.locator('.control-illustration')).toHaveCount(5);
  await next();
  await next();
  await next();
  await expect(page.locator('.jersey-preview')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Maillot jaune', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Maillot suivant', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Maillot rouge', exact: true })).toBeVisible();
  await context.setOffline(true);
  await page.locator('.jersey-slider').evaluate((slider) => {
    const touch = (x: number) =>
      new Touch({ identifier: 1, target: slider, clientX: x, clientY: 350 });
    slider.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [touch(330)] }));
    slider.dispatchEvent(
      new TouchEvent('touchend', { bubbles: true, changedTouches: [touch(100)] }),
    );
  });
  await expect(page.getByRole('heading', { name: 'Maillot violet', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Maillot violet', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Choisir Maillot noir', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Maillot noir', exact: true })).toBeVisible();
  for (const width of [320, 390, 471]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  }
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(results.violations).toEqual([]);
  await page.screenshot({ path: 'test-results/shirt-carousel-471.png', fullPage: true });
  await next();
  await next();
  await expect(page.locator('.briefing blockquote')).toHaveText(
    'Bonjour capitaines.\nGardons un dialogue calme.',
  );
  await next();
  await next();
  await expect(page.locator('.briefing blockquote')).toHaveText(
    'Bonjour assistants, communiquons clairement.',
  );
  await context.setOffline(false);
});
