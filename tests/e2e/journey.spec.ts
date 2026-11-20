import { expect, test } from '@playwright/test';

test('uses the profile address for match directions and keeps both links independent of the card', async ({
  page,
}) => {
  await page.route('**/api/journey', async (route) => {
    const input = route.request().postDataJSON();
    if (input.destination !== '13 rue du Général Guillaumat, 75015 Paris')
      return route.fulfill({ json: {} });
    expect(input.origin).toBe('10 rue de Paris, 75001 Paris');
    const arrival = Date.parse(input.arriveBy);
    await route.fulfill({
      json: {
        from: '48.86,2.34',
        to: '48.83,2.29',
        trip: {
          startTime: new Date(arrival - 1800000).toISOString(),
          endTime: input.arriveBy,
          duration: 1800,
        },
      },
    });
  });
  await page.goto('/demo?page=profile');
  await page.getByRole('button', { name: 'Modifier mon profil' }).click();
  await page.getByLabel('Adresse de départ par défaut').fill('10 rue de Paris, 75001 Paris');
  await page.getByRole('button', { name: 'Enregistrer mon profil' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  const nav = page.getByRole('navigation', { name: 'Navigation principale' });
  await nav.getByRole('button', { name: 'Matches', exact: true }).click();
  await page.getByRole('button', { name: 'Nouveau match' }).click();
  await page.getByLabel('Équipe domicile', { exact: true }).fill('Club trajet');
  await page.getByLabel('Équipe visiteuse', { exact: true }).fill('Club visiteur');
  await page
    .getByLabel('Date', { exact: true })
    .fill(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  await page
    .getByLabel('Adresse de la rencontre')
    .fill('13 rue du Général Guillaumat, 75015 Paris');
  await page.getByRole('button', { name: 'Créer la rencontre' }).click();
  const card = page.locator('.match-card').filter({ hasText: 'Club trajet' });
  await expect(card).toContainText('30 min');
  await expect(card).toContainText('Départ 13:15');
  await expect(card.getByRole('link', { name: 'Ouvrir dans Google Maps' })).toHaveAttribute(
    'href',
    /google\.com\/maps\/dir/,
  );
  await expect(card.getByRole('link', { name: 'Ouvrir dans Citymapper' })).toHaveAttribute(
    'href',
    /endcoord=48.83%2C2.29/,
  );
  await card.getByRole('button', { name: /Ouvrir la rencontre/ }).click();
  await expect(page.getByRole('heading', { name: 'Sac du match' })).toBeVisible();
});
