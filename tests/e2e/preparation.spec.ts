import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('mobile preparation, issue and postponed match keep independent state', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/demo');
  await expect(page.getByRole('heading', { name: /Prêt pour le prochain/ })).toBeVisible();
  await page.locator('.match-card').first().click();
  await page.getByRole('checkbox', { name: 'Montre / chronomètre' }).check();
  await page.getByRole('button', { name: /Je suis arrivé/ }).click();
  await expect(page.getByRole('navigation', { name: 'Navigation mobile' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Confirmer mon arrivée' }).click();
  await expect(page.getByRole('button', { name: 'Étape validée' })).toBeVisible();
  await page.getByRole('button', { name: 'Suivant', exact: true }).click();
  const goals = page.locator('.control').filter({ hasText: 'Buts fixés et sécurisés' });
  await goals.getByRole('button', { name: 'Problème', exact: true }).click();
  await page.getByLabel('Commentaire facultatif').fill('Ancrage à contrôler');
  await page.getByRole('button', { name: 'Enregistrer l’anomalie' }).click();
  await expect(page.locator('.issue-card')).toContainText('Ancrage à contrôler');
  await page.getByRole('button', { name: 'Options de la rencontre' }).click();
  await page.getByRole('button', { name: 'Signaler une rencontre non débutée' }).click();
  await page.getByRole('combobox', { name: 'Motif', exact: true }).selectOption('POSTPONED');
  await page.getByLabel('Précision').fill('Terrain impraticable');
  await page.getByRole('button', { name: 'Clôturer la préparation' }).click();
  await page
    .getByRole('navigation', { name: 'Navigation mobile' })
    .getByRole('button', { name: 'Mes matchs' })
    .click();
  await page.getByRole('button', { name: 'Historique', exact: true }).click();
  await page.locator('.match-card').first().click();
  await expect(page.getByText('Terrain impraticable', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Créer la nouvelle rencontre liée' }).click();
  await page.getByLabel('Date', { exact: true }).fill('2026-12-06');
  await page.getByRole('button', { name: 'Créer le brouillon lié' }).click();
  await expect(page.getByRole('checkbox', { name: 'Montre / chronomètre' })).not.toBeChecked();
});
test('offline tunnel survives reload with local queue', async ({ page, context }) => {
  await page.goto('/demo');
  await expect(page.locator('.match-card')).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(async () => {
    const controller = navigator.serviceWorker.controller;
    if (!controller) return false;
    const cache = await caches.open('arbigo-shell-v1');
    return Boolean(await cache.match(new URL('/demo', location.origin).href));
  });
  await page.locator('.match-card').first().click();
  await page.getByRole('button', { name: /Je suis arrivé/ }).click();
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Confirmer mon arrivée' }).click();
  await page.getByRole('button', { name: 'Suivant', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tour du terrain' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Tour du terrain' })).toBeVisible();
  await expect(page.locator('.adjacent-step.previous')).toContainText('Validée');
  await context.setOffline(false);
});
test('no horizontal overflow and accessible dashboard at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/demo');
  await expect(page.locator('.match-card')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
test('create match with free teams and optional stadium', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Nouveau match', exact: true }).click();
  await page.getByRole('button', { name: 'Football à 8' }).click();
  await expect(page.getByText(/Foot à 8 : précisez la catégorie/)).toBeVisible();
  await expect(page.getByText(/modèle de préparation en brouillon/)).toBeVisible();
  await page.getByLabel('Équipe domicile').fill('Mon équipe libre');
  await page.getByLabel('Équipe visiteuse').fill('Équipe invitée');
  await page.getByLabel('Date', { exact: true }).fill('2026-12-12');
  await page.getByRole('button', { name: 'Créer la rencontre' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page
    .getByRole('navigation', { name: 'Navigation principale' })
    .getByRole('button', { name: 'Mes matchs' })
    .click();
  await expect(page.getByText('Mon équipe libre', { exact: true })).toBeVisible();
  await page.locator('.match-card').first().click();
  await expect(page.getByText('Modèle en brouillon', { exact: true })).toBeVisible();
});
