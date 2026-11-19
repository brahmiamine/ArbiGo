import { test, expect } from '@playwright/test';
test('quiz settings, lots, session reload and shared navigation form one app', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/demo?page=quiz');
  await expect(page.getByRole('heading', { name: 'Quiz Arbitrage', exact: true })).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Navigation du quiz' });
  await nav.getByRole('button', { name: 'Paramètres', exact: true }).click();
  await page.getByLabel('Lot de questions', { exact: true }).selectOption('lot2');
  await page.reload();
  await expect(page.getByLabel('Lot de questions', { exact: true })).toHaveValue('lot2');
  await nav.getByRole('button', { name: 'Accueil', exact: true }).click();
  await page.getByRole('button', { name: /Quiz rapide/ }).click();
  await expect(page.locator('.question-card')).toBeVisible();
  await page.reload();
  await expect(page.locator('.question-card')).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Navigation mobile' })
    .getByRole('button', { name: 'Profil', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Profil', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Ouvrir les quiz et leurs paramètres' }).click();
  await expect(page.locator('.question-card')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
test('weather uses selected stadium coordinates and kickoff, and never blocks match creation', async ({
  page,
}) => {
  await page.route('**/api/weather/locations?*', (route) =>
    route.fulfill({
      json: { locations: [{ name: 'Paris, France', latitude: 48.85, longitude: 2.35 }] },
    }),
  );
  await page.route('**/api/weather?*', (route) =>
    route.fulfill({
      json: {
        hours: [{ at: '2026-12-01T14:00:00Z', temperature: 12, code: 3, rain: 20, wind: 18 }],
      },
    }),
  );
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Nouveau match', exact: true }).click();
  await page.getByLabel('Équipe domicile', { exact: true }).fill('Météo domicile');
  await page.getByLabel('Équipe visiteuse', { exact: true }).fill('Météo visiteurs');
  await page.getByLabel('Date', { exact: true }).fill('2026-12-01');
  await page.getByPlaceholder('Rechercher la ville du stade').fill('Paris');
  await page.getByRole('button', { name: 'Paris, France', exact: true }).click();
  await page.getByRole('button', { name: 'Créer la rencontre', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Navigation principale' })
    .getByRole('button', { name: 'Mes matchs', exact: true })
    .click();
  const card = page.locator('.match-card').filter({ hasText: 'Météo domicile' });
  await expect(card).toContainText('12 °C');
  await expect(card).toContainText('01/12/2026');
  await expect(card).toContainText('Source Open-Meteo');
});

test('training corrections, favorites, results and statistics persist across views', async ({
  page,
}) => {
  await page.goto('/demo?page=quiz');
  await page.getByRole('button', { name: /Quiz rapide/ }).click();
  await page.getByRole('button', { name: 'Ajouter aux favoris', exact: true }).click();
  for (let index = 0; index < 10; index++) {
    await page.locator('.option-btn').first().click();
    await page.getByRole('button', { name: 'Valider', exact: true }).click();
    await expect(page.locator('.question-card')).toContainText(
      /Explication|Réponse|réponse|référence|retenir/,
    );
    await page
      .getByRole('button', {
        name: index === 9 ? 'Voir les résultats' : 'Question suivante',
        exact: true,
      })
      .click();
  }
  await expect(page.locator('.results-screen')).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Navigation principale' })
    .getByRole('button', { name: 'Accueil', exact: true })
    .click();
  await page.goto('/demo?page=quiz&quiz=statistics');
  await expect(page.locator('.screen')).toContainText(/10|quiz/);
  const nav = page.getByRole('navigation', { name: 'Navigation du quiz' });
  await nav.getByRole('button', { name: 'Révisions', exact: true }).click();
  await page.getByRole('button', { name: /Mes favoris/ }).click();
  await expect(page.locator('.screen')).toContainText('1 question');
  await page.getByRole('button', { name: /Retour/ }).click();
  await expect(page).toHaveURL(/quiz=reviews/);
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Mes favoris', exact: true })).toBeVisible();
});

test('documents, pitch zoom and quiz-local dark settings remain inside ArbiGo', async ({
  page,
}) => {
  await page.goto('/demo?page=quiz&quiz=documents');
  await page
    .getByRole('button', { name: 'Lire Rapport disciplinaire dans l’application', exact: true })
    .click();
  await expect(page.locator('.document-viewer-loading')).toHaveCount(0, { timeout: 20000 });
  await expect(page.locator('.document-page-controls')).toContainText('Page 1 / 1');
  await expect(page.getByRole('button', { name: 'Page suivante', exact: true })).toBeDisabled();
  await expect(page.locator('canvas[aria-label*="page 1"]')).toBeVisible();
  await expect(page.locator('.document-viewer-loading')).toHaveCount(0);
  await expect(page.locator('.document-viewer-error')).toHaveCount(0);
  await page.getByRole('button', { name: '← Mes documents', exact: true }).click();
  await page
    .getByRole('button', { name: 'Lire Lois du Jeu dans l’application', exact: true })
    .click();
  await expect(page.getByRole('button', { name: 'Page suivante', exact: true })).toBeEnabled({
    timeout: 20000,
  });
  await expect(page.locator('.document-page-controls')).toContainText('276');
  await page.getByRole('button', { name: 'Page suivante', exact: true }).click();
  await expect(page.locator('canvas[aria-label*="page 2"]')).toBeVisible();
  await expect(page.locator('.document-viewer-loading')).toHaveCount(0, { timeout: 20000 });
  await expect(page.locator('.document-viewer-error')).toHaveCount(0);
  await page.goto('/demo?page=quiz&quiz=terrain');
  await page.getByRole('button', { name: 'Agrandir le zoom', exact: true }).click();
  await expect(page.locator('.terrain-zoom-value')).toContainText('125');
  await page.goto('/demo?page=quiz&quiz=settings');
  await page
    .getByRole('group', { name: 'Thème du quiz' })
    .getByRole('button', { name: 'Sombre', exact: true })
    .click();
  await expect(page.locator('.quiz-app')).toHaveAttribute('data-theme', 'dark');
  await page
    .getByRole('navigation', { name: 'Navigation principale' })
    .getByRole('button', { name: 'Profil', exact: true })
    .click();
  expect(await page.locator('body').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
    'rgb(245, 245, 245)',
  );
});

test('timed exam supports pause, resume, previous navigation and final correction', async ({
  page,
}) => {
  await page.goto('/demo?page=quiz&quiz=settings');
  await page
    .getByRole('group', { name: 'Mode par défaut' })
    .getByRole('button', { name: 'Examen', exact: true })
    .click();
  await page.getByRole('checkbox', { name: /Chrono par défaut/ }).check();
  await page
    .getByRole('navigation', { name: 'Navigation du quiz' })
    .getByRole('button', { name: 'Accueil', exact: true })
    .click();
  await page.getByRole('button', { name: /Examen rapide/ }).click();
  await expect(page.locator('.timer-badge')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Valider', exact: true })).toHaveCount(0);
  await page.locator('.option-btn').first().click();
  await page.getByRole('button', { name: 'Suivante →', exact: true }).click();
  await page.getByRole('button', { name: /Mettre en pause/ }).click();
  await page.getByRole('button', { name: 'Reprendre le quiz', exact: true }).click();
  await expect(page.locator('.progress-label')).toContainText('Question 2');
  await page.getByRole('button', { name: '← Précédente', exact: true }).click();
  for (let i = 0; i < 9; i++)
    await page.getByRole('button', { name: 'Suivante →', exact: true }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: "Terminer l'examen", exact: true }).click();
  await expect(page.locator('.results-screen')).toBeVisible();
  await expect(page.locator('.review-item')).toHaveCount(10);
});
