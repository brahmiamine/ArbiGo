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
  await expect(page.locator('.adjacent-step')).toHaveCount(0);
  await page.getByRole('button', { name: 'Précédent', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Étape validée' })).toBeVisible();
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
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(
    page.getByRole('dialog').getByRole('button', { name: /Football à|Futsal/ }),
  ).toHaveCount(0);
  await expect(page.getByRole('dialog').locator('.notice')).toHaveCount(0);
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
  await expect(page.getByText('Modèle en brouillon', { exact: true })).toHaveCount(0);
  await expect(page.locator('.detail-actions')).toHaveCount(0);
});

for (const width of [320, 390, 471]) {
  test(`team shirts persist and warmup stays compact at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/demo');
    await page.locator('.match-card').first().click();
    await expect(page.getByText('Votre compte à rebours')).toHaveCount(0);
    await expect(page.locator('.bag-checks .equipment-image')).toHaveCount(19);
    for (const name of [
      'Maillot noir',
      'Short noir',
      'Chaussettes noires',
      'Chaussures de terrain',
    ]) {
      await page.getByRole('checkbox', { name, exact: true }).check();
    }
    await page.getByRole('button', { name: /Je suis arrivé/ }).click();
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: 'Suivant', exact: true }).click();
      await expect(page.locator('.tunnel-step-position')).toContainText(`0${i + 2}`);
    }
    const home = page.getByRole('region', { name: 'Domicile · Paris 13 Atletico' });
    const away = page.getByRole('region', { name: 'Extérieur · FC Belleville' });
    await expect(home.getByRole('heading', { name: 'Paris 13 Atletico' })).toBeVisible();
    await expect(away.getByRole('heading', { name: 'FC Belleville' })).toBeVisible();
    await expect(page.getByText('Couleur secondaire', { exact: true })).toHaveCount(0);
    const kits = [
      { team: home, role: 'Joueurs', color: 'rouge', hex: '#E60028' },
      { team: home, role: 'Gardien', color: 'vert', hex: '#31a77b' },
      { team: away, role: 'Joueurs', color: 'blanc', hex: '#ffffff' },
      { team: away, role: 'Gardien', color: 'noir', hex: '#182126' },
    ];
    for (const kit of kits) {
      await kit.team
        .getByRole('group', { name: kit.role, exact: true })
        .getByRole('button', { name: kit.color, exact: true })
        .click();
      await expect(
        kit.team
          .getByRole('img', { name: new RegExp(`${kit.role} · ${kit.color}`) })
          .locator('.jersey-fabric'),
      ).toHaveAttribute('fill', kit.hex);
    }
    await page.getByRole('button', { name: /La noire/ }).click();
    await expect(
      page.getByRole('button', { name: /Confirmer couleurs|Reconfirmer couleurs/ }),
    ).toHaveCount(0);
    await expect(page.getByRole('button', { name: /La noire/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Maillots et ballon', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /La noire/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    for (const kit of kits) {
      await expect(
        kit.team
          .getByRole('group', { name: kit.role, exact: true })
          .getByRole('button', { name: kit.color, exact: true }),
      ).toHaveAttribute('aria-pressed', 'true');
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
    await page.screenshot({ path: `test-results/kits-${width}.png`, fullPage: true });
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: 'Suivant', exact: true }).click();
      if (i === 0) {
        await expect(page.locator('.jersey-preview')).toBeVisible();
        await page.getByRole('button', { name: 'Suivant', exact: true }).click();
      }
      await expect(page.locator('.tunnel-step-position')).toContainText(`0${i + 5}`);
    }
    await expect(page.getByRole('heading', { name: 'Échauffement', exact: true })).toBeVisible();
    await expect(page.locator('.warmup-clock')).toHaveText('03:00');
    const card = await page.locator('.step-warmup').boundingBox();
    expect(card!.height).toBeLessThan(510);
    await page.getByRole('button', { name: 'Démarrer', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Reprendre', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Terminer la phase', exact: true }).click();
    await expect(page.getByText('Phase terminée', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Phase 2 : Éducatifs de course' }).click();
    await expect(page.locator('.warmup-clock')).toHaveText('04:00');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({ path: `test-results/warmup-${width}.png`, fullPage: true });
  });
}
