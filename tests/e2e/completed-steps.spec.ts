import { test, expect, type Page } from '@playwright/test';

const next = (page: Page) => page.getByRole('button', { name: 'Suivant', exact: true }).click();

test('validated steps stay read-only after browsing and reloading, including the shirt preview', async ({
  page,
}) => {
  await page.goto('/demo');
  await page.locator('.match-card').first().click();
  await page.getByRole('button', { name: /Je suis arrivé/ }).click();
  await page.getByRole('button', { name: 'Confirmer mon arrivée' }).click();
  await next(page);
  await page.getByLabel('Numéro de mon vestiaire').fill('A2');
  await page.getByRole('button', { name: 'Valider cette étape', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Étape validée', exact: true })).toBeVisible();
  await expect(page.getByLabel('Numéro de mon vestiaire')).toBeDisabled();
  await page.reload();
  await expect(page.getByLabel('Numéro de mon vestiaire')).toHaveValue('A2');
  await expect(page.getByLabel('Numéro de mon vestiaire')).toBeDisabled();
  await next(page);
  await expect(page.getByLabel('Vestiaire · Paris 13 Atletico')).toBeEnabled();
  await next(page);
  await next(page);
  await page.getByRole('button', { name: 'Problème', exact: true }).first().click();
  await page.getByRole('button', { name: 'Enregistrer l’anomalie' }).click();
  for (const button of (
    await page.getByRole('button', { name: 'Conforme / fait', exact: true }).all()
  ).slice(1))
    await button.click();
  await page.getByRole('button', { name: 'Valider cette étape', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Résolvez les anomalies' })).toBeVisible();
  await page.getByRole('button', { name: 'Fermer le message', exact: true }).click();
  await page.getByRole('button', { name: 'Revérifiée et résolue' }).click();
  await page.getByRole('button', { name: 'Valider cette étape', exact: true }).click();
  for (const button of await page.locator('.answer-options button').all())
    await expect(button).toBeDisabled();
  await next(page);
  await next(page);
  await page
    .getByRole('region', { name: 'Domicile · Paris 13 Atletico' })
    .getByRole('group', { name: 'Joueurs', exact: true })
    .getByRole('button', { name: 'rouge', exact: true })
    .click();
  await page.getByRole('button', { name: 'Conforme / fait', exact: true }).click();
  await next(page);
  const choice = await page.locator('.jersey-pagination button').last().getAttribute('aria-label');
  const chosenShirt = choice!.replace('Choisir ', '');
  await page.getByRole('button', { name: choice!, exact: true }).click();
  await expect(page.locator('.jersey-preview h1')).toHaveText(chosenShirt);
  await page.getByRole('button', { name: 'Précédent', exact: true }).click();
  await page.getByRole('button', { name: 'Valider cette étape', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Étape validée', exact: true })).toBeVisible();
  for (const button of await page.locator('.kit-control button').all())
    await expect(button).toBeDisabled();
  await next(page);
  await expect(page.locator('.jersey-preview')).toBeVisible();
  for (const button of await page.locator('.jersey-preview button').all())
    await expect(button).toBeDisabled();
  const shirt = await page.locator('.jersey-preview h1').innerText();
  expect(shirt).toBe(chosenShirt);
  await page.getByRole('group', { name: 'Choisir le maillot', exact: true }).focus();
  await page.keyboard.press('ArrowLeft');
  await page.locator('.jersey-slider').evaluate((slider) => {
    const touch = (x: number) =>
      new Touch({ identifier: 1, target: slider, clientX: x, clientY: 200 });
    slider.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [touch(100)] }));
    slider.dispatchEvent(
      new TouchEvent('touchend', { bubbles: true, changedTouches: [touch(300)] }),
    );
  });
  await expect(page.locator('.jersey-preview h1')).toHaveText(shirt);
  await page.reload();
  await expect(page.locator('.jersey-preview h1')).toHaveText(shirt);
  for (const button of await page.locator('.jersey-preview button').all())
    await expect(button).toBeDisabled();
  await next(page);
  await expect(
    page.getByRole('heading', { name: 'Prise en charge de la feuille', exact: true }),
  ).toBeVisible();
});
