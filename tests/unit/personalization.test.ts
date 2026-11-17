import { expect, it } from 'vitest';
import { applyOperation, createMatch, createRematch } from '@/domain/match';
import { defaultEquipment, equipmentLabel, upgradeInventory } from '@/domain/equipment';
import { templates } from '@/domain/templates';
import { defaultBriefings, mergePreferences, type ProfilePreferences } from '@/domain/profile';
import { actionSchema, profilePatchSchema } from '@/server/validation';
import type { Match, OperationInput } from '@/domain/types';
const fresh = () =>
  createMatch(
    {
      homeTeam: 'A',
      awayTeam: 'B',
      practice: 'FOOT_11',
      kickoffAt: '2026-12-01T14:00:00Z',
      timezone: 'Europe/Paris',
    },
    defaultEquipment(),
    templates.FOOT_11,
  );
function act(m: Match, action: OperationInput, deviceId = 'device-a') {
  return applyOperation(m, {
    id: crypto.randomUUID(),
    matchId: m.id,
    deviceId,
    expectedVersion: m.version,
    fencingVersion: m.fencingVersion,
    occurredAt: '2026-12-01T13:00:00Z',
    action,
  });
}
it('selects an actual bag shirt without changing colors, checks or the current stage', () => {
  let m = act(fresh(), { type: 'START' });
  const previous = structuredClone(m);
  m = act(m, { type: 'SELECT_SHIRT', itemId: 'shirt-red' });
  expect(m.selectedShirtId).toBe('shirt-red');
  expect(m.colors).toEqual(previous.colors);
  expect(m.runs).toEqual(previous.runs);
  expect(m.currentStep).toBe(previous.currentStep);
  expect(m.bag.find((item) => item.id === 'shirt-red')?.packed).toBe(false);
  expect(previous.selectedShirtId).toBeUndefined();
  expect(() => act(m, { type: 'SELECT_SHIRT', itemId: 'shorts' })).toThrow('SHIRT_UNAVAILABLE');
  expect(() => act(m, { type: 'SELECT_SHIRT', itemId: 'foreign-shirt' })).toThrow(
    'SHIRT_UNAVAILABLE',
  );
  expect(() => act(m, { type: 'SELECT_SHIRT', itemId: 'shirt-black' }, 'other-device')).toThrow(
    'DEVICE_REVOKED',
  );
  m = act(m, { type: 'CLOSE', reason: 'POSTPONED', comment: 'Report' });
  expect(() => act(m, { type: 'SELECT_SHIRT', itemId: 'shirt-black' })).toThrow('CLOSED');
  expect(createRematch(m, '2026-12-02T14:00:00Z').selectedShirtId).toBeUndefined();
});
it('merges partial account settings without dropping other briefing texts or preferences', () => {
  const previous: ProfilePreferences = {
    soundEnabled: true,
    pushEnabled: false,
    timezone: 'Europe/Paris',
    locale: 'fr',
    avatarPhotoId: crypto.randomUUID(),
    briefings: { ...defaultBriefings },
  };
  const next = mergePreferences(previous, { briefings: { assistants: 'Mon texte personnel' } });
  expect(next).toMatchObject({
    avatarPhotoId: previous.avatarPhotoId,
    soundEnabled: true,
    briefings: {
      captains: defaultBriefings.captains,
      assistants: 'Mon texte personnel',
      futsalOfficials: defaultBriefings.futsalOfficials,
    },
  });
  expect(previous.briefings?.assistants).toBe(defaultBriefings.assistants);
  expect(mergePreferences(next, { avatarPhotoId: null }).avatarPhotoId).toBeNull();
});
it('validates bounded profile fields, photo identifiers and shirt command shapes', () => {
  expect(profilePatchSchema.safeParse({ name: '   ' }).success).toBe(false);
  expect(
    profilePatchSchema.safeParse({ preferences: { briefings: { captains: 'a'.repeat(5001) } } })
      .success,
  ).toBe(false);
  expect(
    profilePatchSchema.safeParse({
      preferences: { avatarPhotoId: 'https://outside.example/photo.jpg' },
    }).success,
  ).toBe(false);
  expect(profilePatchSchema.parse({ name: '  Amine  ', email: 'forbidden@example.test' })).toEqual({
    name: 'Amine',
  });
  expect(actionSchema.safeParse({ type: 'SELECT_SHIRT', itemId: '' }).success).toBe(false);
});
it('renames existing stock notes without re-adding deleted shirts or changing personal labels', () => {
  const next = upgradeInventory({
    catalogVersion: 2,
    outfits: [],
    equipment: [
      {
        id: 'match-notes',
        label: 'Feuille de notes (cartons, buts, incidents)',
        type: 'TOOL',
        colors: [],
      },
      { id: 'personal', label: 'Mes notes personnelles', type: 'TOOL', colors: [] },
    ],
  });
  expect(next.catalogVersion).toBe(3);
  expect(next.equipment.map((item) => item.label)).toEqual([
    'Feuille de notes',
    'Mes notes personnelles',
  ]);
  expect(next.equipment).toHaveLength(2);
  expect(equipmentLabel('Feuille de notes (cartons, buts, incidents)')).toBe('Feuille de notes');
});
