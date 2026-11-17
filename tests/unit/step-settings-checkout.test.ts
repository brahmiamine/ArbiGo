import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import {
  createMatch,
  applyOperation,
  needsLockerSteps,
  needsSportcashStep,
  requiresCheckout,
  summarize,
  createRematch,
} from '@/domain/match';
import { normalizeStepPreferences, stepPreferencesSchema } from '@/domain/step-settings';
import { templates } from '@/domain/templates';
import { profilePatchSchema } from '@/server/validation';
import { resolveNavigation, readNavigation } from '@/lib/navigation';
import { preparationActions } from '../helpers/preparation';
import type { Match, OperationInput } from '@/domain/types';
const input = {
  homeTeam: 'A',
  awayTeam: 'B',
  practice: 'FOOT_11' as const,
  kickoffAt: '2026-12-01T14:00:00Z',
  timezone: 'Europe/Paris',
};
const fresh = (settings?: ReturnType<typeof normalizeStepPreferences>) =>
  createMatch(input, [], templates.FOOT_11, undefined, settings);
const op = (m: Match, action: OperationInput) => ({
  id: crypto.randomUUID(),
  matchId: m.id,
  deviceId: 'a',
  expectedVersion: m.version,
  fencingVersion: m.fencingVersion,
  occurredAt: '2026-12-01T14:00:00Z',
  action,
});
const act = (m: Match, action: OperationInput) => applyOperation(m, op(m, action));
function played(settings?: ReturnType<typeof normalizeStepPreferences>) {
  let m = act(fresh(settings), { type: 'START' });
  for (const input of preparationActions(m)) m = act(m, input);
  return act(m, { type: 'KICKOFF', acknowledged: true });
}
it('keeps the default order and captures per-match personal order, disabled controls and countdown positions without mutating defaults', () => {
  expect(fresh().template).toEqual(templates.FOOT_11);
  expect(fresh().checkout).toBeUndefined();
  const settings = normalizeStepPreferences({
    order: ['pitch', 'arrival'],
    disabled: ['referee-locker', 'sportcash'],
    checkoutEnabled: true,
  });
  const original = structuredClone(templates.FOOT_11),
    m = fresh(settings);
  expect(m.template.steps[0]).toMatchObject({ code: 'pitch', offset: original.steps[0].offset });
  expect(m.template.steps[1]).toMatchObject({ code: 'arrival', offset: original.steps[1].offset });
  expect(m.template.steps.at(-1)?.kind).toBe('final');
  expect(m.runs['referee-locker']).toBeUndefined();
  expect(m.runs.sportcash).toBeUndefined();
  expect(needsLockerSteps(m)).toBe(false);
  expect(needsSportcashStep(m)).toBe(false);
  const before = structuredClone(m);
  settings.order.reverse();
  settings.disabled.push('warmup');
  expect(m).toEqual(before);
  expect(templates.FOOT_11).toEqual(original);
});
it('validates settings and preserves a manual final action even when all preparation and checkout are disabled', () => {
  for (const value of [
    { order: ['arrival', 'arrival'], disabled: [] },
    { order: ['final'], disabled: [] },
    { order: [], disabled: ['unknown'] },
    { order: [], disabled: ['sportcash-checkout'] },
  ])
    expect(stepPreferencesSchema.safeParse(value).success).toBe(false);
  expect(
    profilePatchSchema.safeParse({
      preferences: { steps: { order: [], disabled: [], checkoutEnabled: false } },
    }).success,
  ).toBe(true);
  const settings = normalizeStepPreferences();
  settings.disabled = [...settings.order];
  settings.checkoutEnabled = false;
  const m = fresh(settings);
  expect(m.template.steps.map((s) => s.code)).toEqual(['final']);
  expect(summarize(m).complete).toBe(true);
  expect(() => act(act(m, { type: 'START' }), { type: 'KICKOFF', acknowledged: false })).toThrow(
    'REVIEW_REQUIRED',
  );
  expect(requiresCheckout(played(settings))).toBe(false);
});
it('opens a persistent checkout after kickoff, respects ownership and replay, and leaves old closed journals alone', () => {
  let m = act(fresh(), { type: 'START' });
  expect(() => act(m, { type: 'SPORTCASH_CHECKOUT' })).toThrow('CHECKOUT_UNAVAILABLE');
  m = played();
  const before = structuredClone(m);
  expect(requiresCheckout(m)).toBe(true);
  expect(resolveNavigation(readNavigation('?page=profile'), [m]).activeId).toBe(m.id);
  expect(() =>
    applyOperation(m, { ...op(m, { type: 'SPORTCASH_CHECKOUT' }), deviceId: 'b' }),
  ).toThrow('DEVICE_REVOKED');
  const checkout = op(m, { type: 'SPORTCASH_CHECKOUT' });
  m = applyOperation(m, checkout);
  expect(requiresCheckout(m)).toBe(false);
  expect(applyOperation(m, checkout)).toBe(m);
  const second = { ...op(m, { type: 'SPORTCASH_CHECKOUT' }), occurredAt: '2026-12-01T14:30:00Z' };
  expect(applyOperation(m, second).checkout?.completedAt).toBe(checkout.occurredAt);
  expect(m.closedAt).toBe(before.closedAt);
  expect(m.runs).toEqual(before.runs);
  expect(requiresCheckout({ ...before, checkout: undefined })).toBe(false);
  // A pending event from an older client can still preserve its finish/debrief data.
  expect(act(before, { type: 'FINISH_MATCH' }).finishedAt).toBeTruthy();
});
it('keeps personalized rematches independent and does not re-enable suppressed stages', () => {
  const settings = normalizeStepPreferences({
    order: ['kit'],
    disabled: ['sportcash', 'team-lockers'],
    checkoutEnabled: false,
  });
  const m = act(act(fresh(settings), { type: 'START' }), {
    type: 'CLOSE',
    reason: 'POSTPONED',
    comment: 'Report',
  });
  const next = createRematch(m, '2026-12-08T14:00:00Z');
  expect(next.stepPreferences).toEqual(settings);
  expect(next.template.steps).toEqual(m.template.steps);
  expect(next.checkout).toBeUndefined();
  expect(needsSportcashStep(next)).toBe(false);
  expect(needsLockerSteps(next)).toBe(false);
});

it('preserves the personal snapshot when a demo draft changes practice and kickoff', async () => {
  const { LocalStore } = await import('@/lib/local-store');
  const { updateDraft } = await import('@/features/matches/update-draft');
  const store = new LocalStore(crypto.randomUUID());
  const settings = normalizeStepPreferences({
    order: ['kit'],
    disabled: ['sportcash', 'team-lockers'],
    checkoutEnabled: false,
  });
  const m = fresh(settings);
  await store.putMatch(m);
  const next = await updateDraft(
    m,
    { ...input, practice: 'FOOT_8', kickoffAt: '2026-12-08T14:00:00Z' },
    { equipment: [], outfits: [] },
    store,
    true,
  );
  expect(next.stepPreferences).toEqual(settings);
  expect(next.template.steps[0]).toMatchObject({ code: 'kit', offset: -60 });
  expect(
    next.template.steps.some((step) => step.code === 'sportcash' || step.code === 'team-lockers'),
  ).toBe(false);
  expect(needsLockerSteps(next)).toBe(false);
  expect(needsSportcashStep(next)).toBe(false);
});
