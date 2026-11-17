import { test, expect, type APIRequestContext } from '@playwright/test';
import sharp from 'sharp';

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
  await expect(
    page.getByText(/un e-mail de confirmation vous sera envoyé/),
    await page.locator('body').innerText(),
  ).toBeVisible();
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
  await page.goto('/app?page=profile');
  await page.getByRole('button', { name: 'Modifier mon profil', exact: true }).click();
  await page.getByLabel('Nom', { exact: true }).fill('Arbitre personnalisé');
  await page.getByLabel('Photo de profil', { exact: true }).setInputFiles({
    name: 'portrait.png',
    mimeType: 'image/png',
    buffer: await sharp({ create: { width: 32, height: 32, channels: 3, background: '#003287' } })
      .png()
      .toBuffer(),
  });
  await expect(page.getByRole('button', { name: 'Retirer la photo', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Enregistrer mon profil', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.profile-account img')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Arbitre personnalisé', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Modifier les consignes', exact: true }).click();
  await page
    .getByLabel('Consignes aux capitaines', { exact: true })
    .fill('Bonjour capitaines du compte réel.');
  await page
    .getByLabel('Consignes aux assistants', { exact: true })
    .fill('Bonjour assistants du compte réel.');
  await page.getByRole('button', { name: 'Enregistrer les consignes', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const profileOrigin = new URL(page.url()).origin;
  // Another client changes an untouched field while an editor is open.
  await page.getByRole('button', { name: 'Modifier les consignes', exact: true }).click();
  expect(
    (
      await page.request.patch('/api/me', {
        headers: { Origin: profileOrigin },
        data: { preferences: { briefings: { captains: 'Autre appareil : capitaines' } } },
      })
    ).ok(),
  ).toBe(true);
  await page
    .getByLabel('Consignes aux assistants', { exact: true })
    .fill('Mes assistants modifiés seuls');
  await page.getByRole('button', { name: 'Enregistrer les consignes', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Modifier mon profil', exact: true }).click();
  expect(
    (
      await page.request.patch('/api/me', {
        headers: { Origin: profileOrigin },
        data: { preferences: { avatarPhotoId: null } },
      })
    ).ok(),
  ).toBe(true);
  await page.getByLabel('Nom', { exact: true }).fill('Arbitre renommé');
  await page.getByRole('button', { name: 'Enregistrer mon profil', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const personal = (await (await page.request.get('/api/me')).json()).data;
  expect(personal.name).toBe('Arbitre renommé');
  expect(personal.preferences.avatarPhotoId).toBeNull();
  expect(personal.preferences.briefings).toMatchObject({
    captains: 'Autre appareil : capitaines',
    assistants: 'Mes assistants modifiés seuls',
  });
  await page.goto('/app');
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
  // Exercise the same authenticated operation endpoint used by offline debrief synchronization.
  const match = exported.matches[0].state;
  let revision = match.version;
  const deviceId = await page.evaluate(
    (id) => localStorage.getItem(`arbigo:device:${id}`),
    exported.account.id,
  );
  const origin = new URL(page.url()).origin;
  for (const action of [
    { type: 'START' },
    { type: 'SELECT_SHIRT', itemId: 'shirt-red' },
    { type: 'BRIEFING', stepCode: 'captains' },
    { type: 'BRIEFING', stepCode: 'assistants' },
    { type: 'KICKOFF', acknowledged: true },
    { type: 'FINISH_MATCH' },
    {
      type: 'DEBRIEF',
      changes: { objective: 'Débrief synchronisé du compte réel', rating: '7.5' },
    },
  ]) {
    const response = await page.request.post('/api/sync/batch', {
      headers: { Origin: origin },
      data: {
        operations: [
          {
            id: crypto.randomUUID(),
            matchId: match.id,
            deviceId,
            expectedVersion: revision,
            fencingVersion: revision ? 1 : 0,
            occurredAt: new Date().toISOString(),
            action,
          },
        ],
      },
    });
    expect(response.ok()).toBe(true);
    const result = (await response.json()).data.results[0];
    expect(result.status).toBe('APPLIED');
    revision = result.match.version;
  }
  const afterDebrief = await (await page.request.get('/api/me/data')).json();
  expect(afterDebrief.matches[0].state.debrief.form.objective).toBe(
    'Débrief synchronisé du compte réel',
  );
  expect(afterDebrief.matches[0].state.runs.captains.completedAt).toBeTruthy();
  expect(afterDebrief.matches[0].state.runs.assistants.completedAt).toBeTruthy();
  expect(afterDebrief.matches[0].state.selectedShirtId).toBe('shirt-red');
  const photo = await page.request.post('/api/media', {
    headers: { Origin: origin },
    multipart: {
      file: {
        name: 'test.png',
        mimeType: 'image/png',
        buffer: await sharp({
          create: { width: 32, height: 32, channels: 3, background: '#003287' },
        })
          .png()
          .toBuffer(),
      },
    },
  });
  expect(photo.ok()).toBe(true);
  const asset = (await photo.json()).data;
  expect((await page.request.get(`/api/media/${asset.id}`)).headers()['content-type']).toBe(
    'image/webp',
  );
  expect((await request.get(`${origin}/api/media/${asset.id}`)).status()).toBe(401);
  const invalidPhoto = await page.request.post('/api/media', {
    headers: { Origin: origin },
    multipart: {
      file: { name: 'fake.png', mimeType: 'image/png', buffer: Buffer.from('not an image') },
    },
  });
  expect(invalidPhoto.status()).toBe(403);
  // Use the shared import zone through the actual authenticated UI, including rejection and drop.
  await page.goto('/app?page=bag');
  await page.getByRole('button', { name: 'Ajouter un article', exact: true }).click();
  const picker = page.getByLabel('Photo facultative', { exact: true });
  await picker.setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not a photo'),
  });
  await expect(
    page.getByRole('alert').filter({ hasText: /Format non pris en charge/ }),
  ).toBeVisible();
  await picker.setInputFiles({
    name: 'too-large.png',
    mimeType: 'image/png',
    buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
  });
  await expect(page.getByRole('alert').filter({ hasText: /dépasse 10 Mo/ })).toBeVisible();
  const photoBuffer = await sharp({
    create: { width: 32, height: 32, channels: 3, background: '#003287' },
  })
    .png()
    .toBuffer();
  await page.locator('.file-zone').evaluate(
    (zone, bytes) => {
      const transfer = new DataTransfer();
      transfer.items.add(
        new File([new Uint8Array(bytes)], 'mon-article.png', { type: 'image/png' }),
      );
      zone.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: transfer }));
    },
    [...photoBuffer],
  );
  await expect(page.getByText('Photo enregistrée', { exact: true })).toBeVisible();
  await expect(page.getByAltText('Aperçu du fichier sélectionné')).toBeVisible();
  await expect(page.locator('.file-zone')).toContainText('mon-article.png');
  await expect(page.locator('.file-import [role="alert"]')).toHaveCount(0);
  await page.getByLabel('Nom de l’article', { exact: true }).fill('Mon article photographié');
  await page.getByRole('button', { name: 'Enregistrer l’article', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  const photoRow = page.locator('.inventory-row').filter({ hasText: 'Mon article photographié' });
  await expect(photoRow).toContainText('Photo enregistrée');
  await expect(photoRow.locator('img')).toBeVisible();
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
  await expect(page.getByRole('heading', { name: 'Accueil', exact: true })).toBeVisible();
  // A save finishing after the profile modal closes must not restore identity after logout.
  await page.goto('/app?page=profile');
  let releaseWrite!: () => void;
  let enteredWrite!: () => void;
  const heldWrite = new Promise<void>((resolve) => {
    releaseWrite = resolve;
  });
  const entered = new Promise<void>((resolve) => {
    enteredWrite = resolve;
  });
  await page.route('**/api/me', async (route) => {
    if (route.request().method() === 'PATCH') {
      enteredWrite();
      await heldWrite;
    }
    await route.continue();
  });
  await page.getByRole('button', { name: 'Modifier mon profil', exact: true }).click();
  await page.getByLabel('Nom', { exact: true }).fill('Nom sauvegardé avant déconnexion');
  await page.getByRole('button', { name: 'Enregistrer mon profil', exact: true }).click();
  await entered;
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  await page.getByRole('button', { name: 'Se déconnecter', exact: true }).click();
  releaseWrite();
  await expect(page).toHaveURL(`${profileOrigin}/auth/login`);
  expect(await page.evaluate(() => localStorage.getItem('arbigo:identity'))).toBeNull();
  await page.unroute('**/api/me');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(nextPassword);
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole('heading', { name: 'Accueil', exact: true })).toBeVisible();
  const deleted = await page.request.delete('/api/me/data', {
    headers: { Origin: new URL(page.url()).origin },
    data: { password: nextPassword },
  });
  expect(deleted.ok(), await deleted.text()).toBe(true);
  expect((await page.request.get('/api/me')).status()).toBe(401);
});
