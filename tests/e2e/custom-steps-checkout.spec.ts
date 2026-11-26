import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
async function next(page: Page) {
  const heading = await page.locator('.tunnel-body h1').textContent();
  await page.getByRole('button', { name: 'Suivant', exact: true }).click();
  await expect(page.locator('.tunnel-body h1')).not.toHaveText(heading!);
}
async function completeVisible(page: Page) {
  const card = page.locator('.step-card');
  if (await page.locator('.jersey-preview').isVisible()) return;
  if (await page.getByRole('button', { name: 'Confirmer mon arrivée', exact: true }).isVisible()) {
    await page.getByRole('button', { name: 'Confirmer mon arrivée', exact: true }).click();
    return;
  }
  if (await page.getByRole('button', { name: 'Confirmer mon check-in', exact: true }).isVisible()) {
    await page.getByRole('button', { name: 'Confirmer mon check-in', exact: true }).click();
    return;
  }
  if (
    await page
      .getByRole('button', { name: 'Confirmer les consignes données', exact: true })
      .isVisible()
  ) {
    await page
      .getByRole('button', { name: 'Confirmer les consignes données', exact: true })
      .click();
    return;
  }
  for (const field of await card.locator('.locker-rooms input').all()) await field.fill('2');
  for (const control of await card.locator('.control').all())
    await control.getByRole('button', { name: 'Conforme / fait', exact: true }).click();
  await page.getByRole('button', { name: 'Valider cette étape', exact: true }).click();
}
test('personal settings persist for new matches and lead to a full-screen checkout that survives offline reload', async ({
  page,
  context,
}) => {
  test.setTimeout(60000);
  await context.route('https://app.sportcash.fr/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<title>SPORTCASH</title>' }),
  );
  await page.setViewportSize({ width: 471, height: 844 });
  await page.goto('/demo?page=profile');
  await page.getByRole('tab', { name: 'Paramètres des rencontres', exact: true }).click();
  await page.getByRole('button', { name: 'Personnaliser les étapes' }).click();
  await expect(page.locator('.step-settings-list li')).toHaveCount(13);
  await expect(page.getByRole('checkbox', { name: 'Activer Arrivée au stade' })).toBeChecked();
  await page.getByRole('button', { name: 'Monter Tour du terrain', exact: true }).click();
  await expect(page.locator('.step-settings-list li').nth(3)).toContainText('Tour du terrain');
  await page.getByRole('checkbox', { name: 'Activer Échauffement', exact: true }).uncheck();
  await page
    .getByRole('checkbox', { name: 'Activer Prise en charge de la feuille', exact: true })
    .uncheck();
  await page.screenshot({ path: 'test-results/custom-steps-471.png', fullPage: true });
  await page.getByRole('button', { name: 'Enregistrer mon parcours' }).click();
  await page.reload();
  await page.getByRole('tab', { name: 'Paramètres des rencontres', exact: true }).click();
  await page.getByRole('button', { name: 'Personnaliser les étapes' }).click();
  await expect(
    page.getByRole('checkbox', { name: 'Activer Échauffement', exact: true }),
  ).not.toBeChecked();
  await expect(page.locator('.step-settings-list li').nth(3)).toContainText('Tour du terrain');
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Navigation mobile' })
    .getByRole('button', { name: 'Accueil', exact: true })
    .click();
  await page.getByRole('button', { name: 'Nouveau match', exact: true }).click();
  await page.getByLabel('Équipe domicile').fill('Personnalisé');
  await page.getByLabel('Équipe visiteuse').fill('Visiteurs');
  await page.getByLabel('Date', { exact: true }).fill('2026-12-12');
  await page.getByRole('button', { name: 'Créer la rencontre', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page
    .getByRole('navigation', { name: 'Navigation mobile' })
    .getByRole('button', { name: 'Matches', exact: true })
    .click();
  await page.locator('.match-card').filter({ hasText: 'Personnalisé' }).click();
  await page.getByRole('button', { name: /Je suis arrivé/ }).click();
  await page.getByRole('button', { name: /Ouvrir le bilan/ }).click();
  await expect(
    page.locator('.review-steps').getByRole('button', { name: /^Échauffement/ }),
  ).toHaveCount(0);
  await expect(
    page.locator('.review-steps').getByRole('button', { name: /^Prise en charge de la feuille/ }),
  ).toHaveCount(0);
  await expect(page.locator('.review-steps > button').nth(3)).toContainText('Tour du terrain');
  await page
    .locator('.review-steps')
    .getByRole('button', { name: /^Arrivée au stade/ })
    .click();
  await expect(page.getByRole('heading', { name: 'Arrivée au stade', exact: true })).toBeVisible();
  for (let i = 0; i < 20; i++) {
    if (
      await page
        .getByRole('heading', { name: 'Bilan avant le coup d’envoi', exact: true })
        .isVisible()
    )
      break;
    await completeVisible(page);
    await next(page);
  }
  await expect(
    page.getByRole('heading', { name: 'Bilan avant le coup d’envoi', exact: true }),
  ).toBeVisible();
  await page.getByRole('checkbox', { name: /J’ai pris connaissance/ }).check();
  await page.getByRole('button', { name: 'Coup d’envoi effectué', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Check-out SPORTCASH', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Navigation mobile' })).toHaveCount(0);
  const popup = await Promise.all([
    page.waitForEvent('popup'),
    page.getByRole('link', { name: 'Ouvrir SPORTCASH', exact: true }).click(),
  ]).then(([tab]) => tab);
  await expect(popup).toHaveURL('https://app.sportcash.fr/');
  expect(await popup.evaluate(() => window.opener)).toBeNull();
  await popup.close();
  await expect(
    page.getByRole('heading', { name: 'Check-out SPORTCASH', exact: true }),
  ).toBeVisible();
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
  await page.screenshot({ path: 'test-results/checkout-471.png', fullPage: true });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(
    async () =>
      Boolean(navigator.serviceWorker.controller) &&
      Boolean(await (await caches.open('arbigo-shell-v1')).match('/demo')),
  );
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Check-out SPORTCASH', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Confirmer mon check-out', exact: true }).click();
  await page.getByRole('button', { name: 'Saisir plus tard', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Check-out SPORTCASH', exact: true })).toHaveCount(
    0,
  );
  await page.reload();
  await expect(page.getByRole('navigation', { name: 'Navigation mobile' })).toBeVisible();
  await context.setOffline(false);
});
