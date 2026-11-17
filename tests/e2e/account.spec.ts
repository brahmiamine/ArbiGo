import { test, expect, type APIRequestContext } from '@playwright/test';

const mailpit = process.env.E2E_MAILPIT_URL;
test.skip(!mailpit, 'Requires the isolated SMTP inbox configured in CI.');

async function accountLink(request: APIRequestContext, email: string, kind: string) {
  let link = '';
  await expect
    .poll(
      async () => {
        const found = await (
          await request.get(`${mailpit}/api/v1/search`, { params: { query: `to:${email}` } })
        ).json();
        for (const item of found.messages ?? []) {
          const message = await (await request.get(`${mailpit}/api/v1/message/${item.ID}`)).json();
          const match = (String(message.Text).match(/https?:\/\/\S+/g) ?? []).find(
            (value) => new URL(value).pathname === `/auth/${kind}`,
          );
          if (match) {
            link = match;
            return true;
          }
        }
        return false;
      },
      { timeout: 15000 },
    )
    .toBe(true);
  return link;
}

test('real account: SMTP verification, authentication, match, reset, export and deletion', async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  const email = `arbigo-${crypto.randomUUID()}@example.test`;
  const password = 'ArbiGo-test-password-2026!';
  const nextPassword = 'ArbiGo-reset-password-2026!';
  await page.goto('/auth/register');
  await page.getByLabel('Prénom ou nom').fill('Recette SMTP');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await expect(page.getByText(/un e-mail de confirmation vous sera envoyé/)).toBeVisible();
  await page.goto('/auth/login');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: /vérification/ })).toBeVisible();
  const verify = await accountLink(request, email, 'verify');
  await page.goto(verify);
  await page.getByRole('button', { name: 'Confirmer mon adresse' }).click();
  await expect(page.getByText(/confirmée/)).toBeVisible();
  await page.goto('/auth/login');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
  await page.getByRole('button', { name: 'Nouveau match', exact: true }).click();
  await page.getByLabel('Équipe domicile').fill('Domicile SMTP');
  await page.getByLabel('Équipe visiteuse').fill('Visiteurs SMTP');
  await page.getByLabel('Date', { exact: true }).fill('2026-12-12');
  await page.getByRole('button', { name: 'Créer la rencontre' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const data = await page.request.get('/api/me/data');
  expect(data.ok()).toBe(true);
  const exported = await data.json();
  expect(exported.account.email).toBe(email);
  expect(exported.account).not.toHaveProperty('passwordHash');
  expect(exported.matches).toHaveLength(1);
  await page.goto('/auth/forgot');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByRole('button', { name: 'Recevoir le lien' }).click();
  await expect(page.getByText(/un e-mail vous sera envoyé/)).toBeVisible();
  await page.goto(await accountLink(request, email, 'reset'));
  await page.getByLabel('Mot de passe', { exact: true }).fill(nextPassword);
  await page.getByRole('button', { name: 'Enregistrer le mot de passe' }).click();
  await expect(
    page.getByText('Mot de passe modifié. Reconnectez-vous.', { exact: true }),
  ).toBeVisible();
  await page.goto('/auth/login');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(nextPassword);
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
  const deleted = await page.request.delete('/api/me/data', {
    headers: { Origin: new URL(page.url()).origin },
    data: { password: nextPassword },
  });
  expect(deleted.ok()).toBe(true);
  expect((await page.request.get('/api/me')).status()).toBe(401);
});
