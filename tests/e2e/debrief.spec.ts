import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';

async function history(page: Page) {
  await page
    .getByRole('navigation', { name: 'Navigation mobile' })
    .getByRole('button', { name: 'Matches', exact: true })
    .click();
  await page.getByRole('button', { name: 'Historique', exact: true }).click();
  await page.locator('.match-card').first().click();
}
async function finishMatch(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/demo');
  await expect(page.locator('.match-card')).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await page.locator('.match-card').first().click();
  await page.getByRole('button', { name: /Je suis arrivé/ }).click();
  for (let i = 0; i < 13; i++) {
    if (i === 0) await page.getByRole('button', { name: 'Confirmer mon arrivée' }).click();
    else if (i === 1) {
      await page.getByLabel('Numéro de mon vestiaire').fill('A1');
      await page.getByRole('button', { name: 'Valider cette étape', exact: true }).click();
    } else if (i === 2) {
      await page.getByLabel('Vestiaire · Paris 13 Atletico').fill('2');
      await page.getByLabel('Vestiaire · FC Belleville').fill('3');
      await page.getByRole('button', { name: 'Valider cette étape', exact: true }).click();
    } else if (i === 3) await page.getByRole('button', { name: 'Confirmer mon check-in' }).click();
    else if (i === 8 || i === 10)
      await page.getByRole('button', { name: 'Confirmer les consignes données' }).click();
    else {
      if (i === 9) {
        for (let phase = 0; phase < 4; phase++) {
          if (phase)
            await page.getByRole('button', { name: `Phase ${phase + 1} :`, exact: false }).click();
          await page.getByRole('button', { name: 'Démarrer', exact: true }).click();
          await page.getByRole('button', { name: 'Terminer la phase', exact: true }).click();
        }
      }
      for (const control of await page.locator('.step-fieldset .control').all())
        await control.getByRole('button', { name: 'Conforme / fait', exact: true }).click();
      await page.getByRole('button', { name: 'Valider cette étape', exact: true }).click();
    }
    await page.getByRole('button', { name: 'Suivant', exact: true }).click();
    if (i === 6) {
      await expect(page.locator('.jersey-preview')).toBeVisible();
      await page.getByRole('button', { name: 'Suivant', exact: true }).click();
    }
    await expect(page.locator('.tunnel-step-position')).toContainText(
      `ÉTAPE ${String(i + 2).padStart(2, '0')}`,
    );
  }
  await page.getByRole('checkbox', { name: /J’ai pris connaissance du bilan/ }).check();
  await page.getByRole('button', { name: 'Coup d’envoi effectué', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Check-out SPORTCASH', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Confirmer mon check-out', exact: true }).click();
  await history(page);
  await expect(page.getByRole('button', { name: 'Ouvrir le débrief', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Match terminé · faire le débrief', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Débrief d’après-match', exact: true }),
  ).toBeVisible();
}
const saved = async (page: Page) => {
  await expect(page.locator('.debrief-save')).toContainText('Enregistré sur cet appareil');
  await expect(page.locator('.debrief-save')).not.toContainText('Enregistrement…');
};

test('complete debrief persists offline, exports PDF with logos, copies and resets only this report', async ({
  page,
  context,
}) => {
  test.setTimeout(90000);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await finishMatch(page);
  await expect(page.locator('.debrief-app .card')).toHaveCount(8);
  await expect(page.locator('.debrief-heading img')).toHaveCount(0);
  expect((await page.locator('.debrief-heading').boundingBox())!.height).toBeLessThan(75);
  await expect(page.getByLabel('Point fort 1', { exact: true })).toHaveJSProperty(
    'tagName',
    'TEXTAREA',
  );
  expect(
    (await page.getByLabel('Point fort 1', { exact: true }).boundingBox())!.height,
  ).toBeGreaterThanOrEqual(136);
  await expect(page.getByLabel('Équipe domicile', { exact: true })).toHaveValue(
    'Paris 13 Atletico',
  );
  await expect(page.getByLabel('Équipe extérieur', { exact: true })).toHaveValue('FC Belleville');
  await expect(page.getByLabel('Arbitre', { exact: true })).toHaveValue('Amine');
  await page.getByLabel('Numéro du match', { exact: true }).fill('123456');
  for (const [label, value] of [
    ['Mot 1', 'Calme'],
    ['Mot 2', 'Juste'],
    ['Mot 3', 'Présent'],
    ['Point fort 1', 'Placement\nAnticipation des transitions'],
    ['Point fort 2', 'Communication'],
    ['Point d’amélioration', 'Lecture des fautes'],
    ['Décision / situation n°1', '23e minute : avantage'],
    ['Décision / situation n°2', '67e minute : penalty'],
    ['Pourquoi ?', 'Échanges corrects'],
    ['Si je devais refaire le match, je changerais :', 'Revenir plus vite à la faute'],
    ['Objectif du prochain match', 'Améliorer la lecture du jeu'],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page
    .locator('.choice-card')
    .filter({ hasText: /^Satisfaisante$/ })
    .click();
  await page.getByRole('slider', { name: 'Auto-évaluation sur 10' }).fill('7.5');
  await saved(page);
  await expect(page.locator('.debrief-progress')).toContainText('100 %');
  for (const width of [320, 390, 471]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  }
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(axe.violations).toEqual([]);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/debrief-471.png' });
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Débrief d’après-match', exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('Mot 1', { exact: true })).toHaveValue('Calme');
  await expect(page.getByLabel('Point fort 1', { exact: true })).toHaveValue(
    'Placement\nAnticipation des transitions',
  );
  await expect(page.getByRole('slider', { name: 'Auto-évaluation sur 10' })).toHaveValue('7.5');
  await page.waitForLoadState('networkidle');
  await context.setOffline(true);
  await page
    .getByLabel('Objectif du prochain match', { exact: true })
    .fill('Objectif conservé hors ligne');
  await saved(page);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Débrief d’après-match', exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('Objectif du prochain match', { exact: true })).toHaveValue(
    'Objectif conservé hors ligne',
  );
  await page.getByRole('button', { name: 'Copier le texte', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Copié dans le presse-papiers' }),
  ).toBeAttached();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    'Objectif conservé hors ligne',
  );
  await page.getByRole('button', { name: 'Exporter en PDF', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Tout est prêt pour l’export');
  await expect(page.getByRole('dialog')).toContainText('Assistant 1');
  const downloading = page.waitForEvent('download');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Exporter en PDF', exact: true })
    .click();
  const download = await downloading;
  expect(download.suggestedFilename()).toContain('amine_123456');
  const bytes = await readFile((await download.path())!);
  expect(bytes.subarray(0, 4).toString()).toBe('%PDF');
  expect(bytes.toString('latin1')).toContain('/Subtype /Image');
  await page.getByRole('button', { name: 'Vider les champs', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(page.getByLabel('Mot 1', { exact: true })).toHaveValue('Calme');
  await page.getByRole('button', { name: 'Vider les champs', exact: true }).click();
  await page.getByRole('button', { name: 'Oui, tout vider', exact: true }).click();
  await saved(page);
  await expect(page.getByLabel('Mot 1', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: 'Bilan de la rencontre' }).click();
  await expect(page.getByRole('heading', { name: /Paris 13 Atletico/ })).toBeVisible();
  await page.getByRole('button', { name: 'Ouvrir le débrief', exact: true }).click();
  await page
    .getByLabel('Objectif du prochain match', { exact: true })
    .pressSequentially('a'.repeat(120));
  await saved(page);
  await context.setOffline(false);
  await page.reload();
  await expect(page.getByLabel('Objectif du prochain match', { exact: true })).toHaveValue(
    'a'.repeat(120),
  );
});

test('the debrief uses match information without exposing the designation OCR importer', async ({
  page,
}) => {
  test.setTimeout(90000);
  await finishMatch(page);
  await expect(page.getByLabel('Équipe domicile', { exact: true })).toHaveValue(
    'Paris 13 Atletico',
  );
  await expect(page.locator('.ocr-file-input, .ocr-fab, .ocr-dock')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Lire une désignation depuis une image' }),
  ).toHaveCount(0);
});

test('kit step no longer requires color or packed outfit confirmation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/demo');
  await page.locator('.match-card').first().click();
  await page.getByRole('button', { name: /Je suis arrivé/ }).click();
  for (let i = 0; i < 6; i++) {
    await page.getByRole('button', { name: 'Suivant', exact: true }).click();
    await expect(page.locator('.tunnel-step-position')).toContainText(`0${i + 2}`);
  }
  await expect(
    page.getByRole('button', { name: /Confirmer couleurs|Reconfirmer couleurs/ }),
  ).toHaveCount(0);
  await page
    .locator('.control')
    .getByRole('button', { name: 'Conforme / fait', exact: true })
    .click();
  await page.getByRole('button', { name: 'Valider cette étape', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Étape validée', exact: true })).toBeVisible();
});
