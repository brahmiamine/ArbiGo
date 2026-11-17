import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
async function next(page: Page) {
  const heading = await page.locator('.tunnel-body h1').textContent();
  await page.getByRole('button', { name: 'Suivant', exact: true }).click();
  await expect(page.locator('.tunnel-body h1')).not.toHaveText(heading!);
}
async function final(page: Page) {
  for (let i = 0; i < 15; i++) {
    if (
      await page
        .getByRole('heading', { name: 'Bilan avant le coup d’envoi', exact: true })
        .isVisible()
    )
      return;
    await next(page);
  }
  throw new Error('Final stage not reached');
}
test('team context, clickable neighbors and final shortcuts stay usable offline and kickoff requires all stages', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 471, height: 844 });
  await page.goto('/demo');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(
    async () =>
      Boolean(navigator.serviceWorker.controller) &&
      Boolean(await (await caches.open('arbigo-shell-v1')).match('/demo')),
  );
  await page.locator('.match-card').click();
  await page.getByRole('button', { name: /Je suis arrivé/ }).click();
  await page.getByRole('button', { name: 'Confirmer mon arrivée' }).click();
  await expect(page.getByRole('button', { name: /^Étape suivante ·/ })).toContainText(
    'Mon vestiaire',
  );
  await next(page);
  await page.getByLabel('Numéro de mon vestiaire').fill('1');
  await page.getByRole('button', { name: 'Valider cette étape', exact: true }).click();
  await next(page);
  await page.getByLabel('Vestiaire · Paris 13 Atletico').fill('A2');
  await page.getByLabel('Vestiaire · FC Belleville').fill('3');
  await page.getByRole('button', { name: 'Valider cette étape', exact: true }).click();
  await next(page);
  await expect(page.getByRole('button', { name: /^Étape précédente ·/ })).toContainText(
    'Vestiaires des équipes',
  );
  await expect(page.getByRole('button', { name: /^Étape précédente ·/ })).toContainText('Validée');
  await expect(page.getByRole('button', { name: /^Étape suivante ·/ })).toContainText(
    'Avancée de la feuille',
  );
  await page.getByRole('button', { name: /^Étape précédente ·/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Vestiaires des équipes', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: /^Étape suivante ·/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Tour du terrain', exact: true })).toBeVisible();
  await expect(page.locator('.tunnel-footer')).toContainText('3 / 12 validées');
  await page.mouse.wheel(0, 350);
  await expect(page.getByRole('heading', { name: 'Tour du terrain', exact: true })).toBeVisible();
  await next(page);
  await next(page);
  await page
    .getByRole('region', { name: 'Domicile · Paris 13 Atletico' })
    .getByRole('group', { name: 'Joueurs', exact: true })
    .getByRole('button', { name: 'rouge', exact: true })
    .click();
  await page
    .getByRole('region', { name: 'Extérieur · FC Belleville' })
    .getByRole('group', { name: 'Joueurs', exact: true })
    .getByRole('button', { name: 'jaune', exact: true })
    .click();
  await expect(page.locator('.tunnel-team').first()).toContainText('rouge');
  await expect(page.locator('.tunnel-team').first()).toContainText('Vest. A2');
  await expect(page.locator('.tunnel-team').nth(1)).toContainText('jaune');
  await expect(page.locator('.tunnel-team').nth(1)).toContainText('Vest. 3');
  await next(page);
  await expect(page.locator('.jersey-preview')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Étape précédente ·/ })).toContainText(
    'Maillots et ballon',
  );
  await expect(page.getByRole('button', { name: /^Étape suivante ·/ })).toContainText(
    'Prise en charge',
  );
  await page.getByRole('button', { name: /^Étape précédente · Maillots et ballon/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Maillots et ballon', exact: true }),
  ).toBeVisible();
  await next(page);
  await expect(page.locator('.jersey-preview')).toBeVisible();
  await page
    .getByRole('button', { name: /^Étape suivante · Prise en charge de la feuille/ })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Prise en charge de la feuille', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: /^Étape précédente · Maillots et ballon/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Maillots et ballon', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: /^Étape suivante · Prise en charge de la feuille/ })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Prise en charge de la feuille', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.jersey-preview')).toHaveCount(0);
  await final(page);
  await page.getByRole('checkbox', { name: /J’ai pris connaissance/ }).check();
  await expect(
    page.getByRole('button', { name: 'Coup d’envoi effectué', exact: true }),
  ).toBeDisabled();
  await page
    .locator('.review-steps')
    .getByRole('button', { name: /Consignes aux assistants/ })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Consignes aux assistants', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Consignes aux assistants', exact: true }),
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
  await page.screenshot({ path: 'test-results/tunnel-neighbors-471.png', fullPage: true });
  await final(page);
  // Isolate the last missing briefing to verify the gate unblocks after its actual confirmation.
  await page.waitForFunction(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open('arbigo-v1-demo');
      r.onsuccess = () => resolve(r.result);
    });
    const count = await new Promise<number>((resolve) => {
      const r = db.transaction('operations').objectStore('operations').count();
      r.onsuccess = () => resolve(r.result);
    });
    db.close();
    return count === 0;
  });
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open('arbigo-v1-demo');
      r.onsuccess = () => resolve(r.result);
    });
    const tx = db.transaction('matches', 'readwrite'),
      store = tx.objectStore('matches'),
      rows = store.getAll();
    rows.onsuccess = () => {
      for (const m of rows.result)
        if (m.status === 'ACTIVE') {
          for (const step of m.template.steps)
            if (step.kind !== 'final' && step.code !== 'captains')
              m.runs[step.code].completedAt = new Date().toISOString();
          delete m.runs.captains.completedAt;
          store.put(m);
        }
    };
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.reload();
  await context.setOffline(true);
  await page.getByRole('checkbox', { name: /J’ai pris connaissance/ }).check();
  await expect(
    page.getByRole('button', { name: 'Coup d’envoi effectué', exact: true }),
  ).toBeDisabled();
  await page
    .locator('.review-steps')
    .getByRole('button', { name: /Consignes aux capitaines/ })
    .click();
  await page.getByRole('button', { name: 'Confirmer les consignes données' }).click();
  await final(page);
  await expect(
    page.getByRole('button', { name: 'Coup d’envoi effectué', exact: true }),
  ).toBeDisabled();
  await page.getByRole('checkbox', { name: /J’ai pris connaissance/ }).check();
  await expect(
    page.getByRole('button', { name: 'Coup d’envoi effectué', exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByText('Préparation complète. Vous pouvez confirmer le coup d’envoi.', { exact: true }),
  ).toHaveCount(0);
  await page.screenshot({ path: 'test-results/tunnel-final-471.png', fullPage: true });
  await context.setOffline(false);
});
