import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { applyOperation, createMatch, createRematch, matchInputSchema } from '@/domain/match';
import { templates } from '@/domain/templates';
import { createMatchDebrief } from '@/domain/debrief/schema';

const input = {
  homeTeam: 'Mayday FC',
  awayTeam: 'Benfica',
  practice: 'FOOT_11' as const,
  kickoffAt: '2026-12-01T14:00:00Z',
  timezone: 'Europe/Paris',
  homeLogoId: 'd2e461ac-0c34-43a1-839b-ba83b2d68711',
  awayLogoId: 'ac5c890d-357d-47d6-9b4f-f98e6a371205',
  designation: {
    matchNumber: '56608650',
    referee: 'Arbitre désigné',
    assistant1: 'Premier assistant',
  },
};
it('preserves both private logo references and OCR metadata when creating and rescheduling a match', () => {
  const match = createMatch(input, [], templates.FOOT_11);
  expect(match).toMatchObject(input);
  const closed = applyOperation(match, {
    id: crypto.randomUUID(),
    matchId: match.id,
    deviceId: 'a',
    fencingVersion: 0,
    expectedVersion: 0,
    occurredAt: '2026-12-01T12:00:00Z',
    action: { type: 'START' },
  });
  const postponed = applyOperation(closed, {
    id: crypto.randomUUID(),
    matchId: match.id,
    deviceId: 'a',
    fencingVersion: 1,
    expectedVersion: 1,
    occurredAt: '2026-12-01T12:01:00Z',
    action: { type: 'CLOSE', reason: 'POSTPONED', comment: 'Pluie' },
  });
  expect(createRematch(postponed, '2026-12-08T14:00:00Z')).toMatchObject({
    homeLogoId: input.homeLogoId,
    awayLogoId: input.awayLogoId,
  });
});
it('accepts old matches without logos and refuses image URLs and malformed logo references', () => {
  const legacy = { ...input, homeLogoId: undefined, awayLogoId: undefined, designation: undefined };
  expect(matchInputSchema.safeParse(legacy).success).toBe(true);
  for (const logo of ['https://example.com/logo.png', 'data:image/png;base64,abc', '../private'])
    expect(matchInputSchema.safeParse({ ...input, homeLogoId: logo }).success).toBe(false);
});
it('uses the imported designation to prefill the later debrief without reading the image again', () => {
  expect(createMatchDebrief(input, 'Nom du profil')).toMatchObject({
    homeTeam: 'Mayday FC',
    awayTeam: 'Benfica',
    matchNumber: '56608650',
    referee: 'Arbitre désigné',
    assistant1: 'Premier assistant',
    assistant2: '',
  });
});

it('preserves logo references on a draft edit and supports removing one without affecting the other', async () => {
  const { LocalStore } = await import('@/lib/local-store');
  const { updateDraft } = await import('@/features/matches/update-draft');
  const store = new LocalStore(crypto.randomUUID());
  const match = createMatch(input, [], templates.FOOT_11);
  await store.putMatch(match);
  const edited = await updateDraft(
    match,
    { ...input, stadium: 'Nouveau stade' },
    { equipment: [], outfits: [] },
    store,
    true,
  );
  expect(edited).toMatchObject({
    homeLogoId: input.homeLogoId,
    awayLogoId: input.awayLogoId,
    stadium: 'Nouveau stade',
  });
  const removed = await updateDraft(
    edited,
    { ...input, homeLogoId: undefined },
    { equipment: [], outfits: [] },
    store,
    true,
  );
  expect(removed.homeLogoId).toBeUndefined();
  expect(removed.awayLogoId).toBe(input.awayLogoId);
  await expect(
    updateDraft(
      { ...edited, status: 'ACTIVE' },
      input,
      { equipment: [], outfits: [] },
      store,
      true,
    ),
  ).rejects.toThrow('déjà démarrée');
  await store.clear();
});
