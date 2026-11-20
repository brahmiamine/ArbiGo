import { test, expect, type Page } from '@playwright/test';
import sharp from 'sharp';

async function newMatch(page: Page) {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Nouveau match', exact: true }).click();
  return page.getByRole('dialog', { name: 'Nouvelle rencontre', exact: true });
}

test('manual logos survive creation, editing, cards, stage navigation and offline reload', async ({
  page,
  context,
}) => {
  const logo = {
    name: 'logo.png',
    mimeType: 'image/png',
    buffer: await sharp({ create: { width: 48, height: 48, channels: 4, background: '#d51c39' } })
      .png()
      .toBuffer(),
  };
  const dialog = await newMatch(page);
  await dialog.getByLabel('Équipe domicile', { exact: true }).fill('Club Alpha');
  await dialog.getByLabel('Équipe visiteuse', { exact: true }).fill('Club Beta');
  await dialog.getByLabel('Date', { exact: true }).fill('2026-12-01');
  await dialog.locator('input[aria-label="Logo domicile"]').setInputFiles(logo);
  await dialog.locator('input[aria-label="Logo visiteur"]').setInputFiles(logo);
  for (const width of [320, 390, 471]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    );
  }
  await dialog.screenshot({ path: 'work/new-match-modal.png' });
  await page.setViewportSize({ width: 1280, height: 720 });
  await dialog.getByRole('button', { name: 'Créer la rencontre', exact: true }).click();
  await expect(dialog).toBeHidden();
  // Open the complete match list: the dashboard may retain the earlier seeded match.
  await page
    .getByRole('navigation', { name: 'Navigation principale' })
    .getByRole('button', { name: 'Matches', exact: true })
    .click();
  const card = page.locator('.match-card').filter({ hasText: 'Club Alpha' });
  await expect(card.locator('.team-logo img')).toHaveCount(2);
  await card.click();
  await expect(page.locator('.page-heading .team-logo img')).toHaveCount(2);
  await page.getByRole('button', { name: 'Modifier la rencontre', exact: true }).click();
  const edit = page.getByRole('dialog', { name: 'Modifier la rencontre', exact: true });
  await expect(edit.locator('.saved-logo img')).toHaveCount(2);
  await edit
    .getByRole('textbox', { name: 'Adresse de la rencontre facultatif', exact: true })
    .fill('Terrain Alpha');
  await edit.getByRole('button', { name: 'Enregistrer la rencontre', exact: true }).click();
  await expect(edit).toBeHidden();
  await expect(page.locator('.page-heading .team-logo img')).toHaveCount(2);
  await page.getByRole('button', { name: /Je suis arrivé/ }).click();
  await expect(page.locator('.tunnel-header .team-logo img')).toHaveCount(2);
  await page.getByRole('button', { name: 'Suivant', exact: true }).click();
  await expect(page.locator('.tunnel-header .team-logo img')).toHaveCount(2);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  // The existing service worker caches the HTML shell on a controlled navigation.
  await page.reload();
  await expect(page.locator('.tunnel-header .team-logo img')).toHaveCount(2);
  await page.waitForFunction(async () =>
    Boolean(await (await caches.open('arbigo-shell-v1')).match('/demo')),
  );
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.tunnel-header .team-logo img')).toHaveCount(2);
});

test('local OCR fills a new match and extracts visible badges from the same screenshot', async ({
  page,
}) => {
  test.setTimeout(120000);
  const dialog = await newMatch(page);
  await dialog
    .getByRole('textbox', { name: 'Adresse de la rencontre facultatif', exact: true })
    .fill('Stade conservé');
  await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 720;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 1200, 720);
    ctx.fillStyle = 'black';
    ctx.font = 'bold 36px Arial';
    for (const [text, y] of [
      ['DISTRICT PARISIEN DE FOOTBALL', 50],
      ['dimanche 4 octobre 2026 à 11H00', 110],
      ['CDM D1 - Journée 1', 170],
      ['MAYDAY FC', 300],
      ['2 - 1', 360],
      ['BENFICA ARGOSELO S.', 440],
      ['Arbitre centre : MOHAMED BRAHMI', 560],
      ['Numéro du match : 56608650', 620],
    ] as const)
      ctx.fillText(text, 180, y);
    ctx.fillStyle = '#d51c39';
    ctx.fillRect(60, 245, 72, 72);
    ctx.fillStyle = '#2454ce';
    ctx.fillRect(60, 385, 72, 72);
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), 'image/png'),
    );
    const transfer = new DataTransfer();
    transfer.items.add(new File([blob], 'designation.png', { type: 'image/png' }));
    const input = document.querySelector<HTMLInputElement>(
      'input[aria-label="Lire une désignation depuis une image"]',
    )!;
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(dialog.getByLabel('Équipe domicile', { exact: true })).toHaveValue('MAYDAY FC', {
    timeout: 90000,
  });
  await expect(dialog.getByLabel('Équipe visiteuse', { exact: true })).toHaveValue(
    'BENFICA ARGOSELO S.',
  );
  await expect(dialog.getByLabel('Date', { exact: true })).toHaveValue('2026-10-04');
  await expect(dialog.getByLabel('Coup d’envoi', { exact: true })).toHaveValue('11:00');
  await expect(
    dialog.getByRole('textbox', { name: 'Adresse de la rencontre facultatif', exact: true }),
  ).toHaveValue('Stade conservé');
  await expect(dialog.getByRole('region', { name: 'Logo domicile', exact: true })).toContainText(
    'Logo repéré',
  );
  await expect(dialog.getByRole('region', { name: 'Logo visiteur', exact: true })).toContainText(
    'Logo repéré',
  );
  await dialog.getByText('Informations de désignation', { exact: true }).click();
  await expect(dialog.getByLabel('Numéro du match', { exact: true })).toHaveValue('56608650');
  await dialog.getByRole('button', { name: 'Créer la rencontre', exact: true }).click();
  await expect(dialog).toBeHidden();
});
