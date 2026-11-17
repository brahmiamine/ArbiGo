import { expect, it } from 'vitest';
import { applyOperation, createMatch, needsSportcashStep } from '@/domain/match';
import { templates } from '@/domain/templates';
import { actionSchema } from '@/server/validation';
import type { Match, OperationInput, Practice } from '@/domain/types';
const fresh = (practice: Practice = 'FOOT_11') =>
  createMatch(
    {
      homeTeam: 'A',
      awayTeam: 'B',
      practice,
      kickoffAt: '2026-12-01T14:00:00Z',
      timezone: 'Europe/Paris',
    },
    [],
    templates[practice],
  );
const operation = (m: Match, action: OperationInput) => ({
  id: crypto.randomUUID(),
  matchId: m.id,
  deviceId: 'a',
  expectedVersion: m.version,
  fencingVersion: m.fencingVersion,
  occurredAt: '2026-12-01T12:50:00Z',
  action,
});
const act = (m: Match, action: OperationInput) => applyOperation(m, operation(m, action));
it('places the check-in after team lockers in every new practice and saves its explicit confirmation without navigation', () => {
  for (const practice of ['FOOT_11', 'FOOT_8', 'FUTSAL'] as const) {
    let m = fresh(practice);
    const index = m.template.steps.findIndex((s) => s.code === 'sportcash');
    expect(m.template.version).toBe(3);
    expect(m.template.steps[index - 1].code).toBe('team-lockers');
    expect(m.template.steps[index + 1].code).toBe('pitch');
    expect(m.template.steps[index].offset).toBe(m.template.steps[index - 1].offset + 1);
    expect(m.runs.sportcash.completedAt).toBeUndefined();
    m = act(m, { type: 'START' });
    const before = structuredClone(m);
    m = act(m, { type: 'COMPLETE', stepCode: 'sportcash' });
    expect(m.runs.sportcash.completedAt).toBe('2026-12-01T12:50:00Z');
    expect(m.currentStep).toBe(before.currentStep);
    expect(m.runs['team-lockers']).toEqual(before.runs['team-lockers']);
    expect(before.runs.sportcash.completedAt).toBeUndefined();
  }
});
it('migrates an active v2 snapshot after earlier queued navigation, preserving journals, current card and source metadata', () => {
  let m = fresh();
  m.template.steps = m.template.steps.filter((s) => s.code !== 'sportcash');
  delete m.runs.sportcash;
  m.template.version = 2;
  m.template.code = 'legacy-v2';
  m = act(m, { type: 'START' });
  expect(needsSportcashStep(m)).toBe(true);
  m = act(m, { type: 'COMPLETE', stepCode: 'arrival' });
  m = act(m, { type: 'NAVIGATE', index: 5 });
  expect(m.template.steps[m.currentStep].code).toBe('kit');
  const before = structuredClone(m),
    op = operation(m, { type: 'ADD_SPORTCASH_STEP' });
  expect(actionSchema.safeParse(op.action).success).toBe(true);
  m = applyOperation(m, op);
  expect(needsSportcashStep(m)).toBe(false);
  expect(m.template.steps[m.currentStep].code).toBe('kit');
  expect(m.template.code).toBe('legacy-v2');
  expect(m.template.version).toBe(2);
  for (const [key, run] of Object.entries(before.runs)) expect(m.runs[key]).toEqual(run);
  expect(m.issues).toEqual(before.issues);
  expect(m.bag).toEqual(before.bag);
  expect(m.runs.sportcash).toEqual({ answers: {} });
  expect(applyOperation(m, op)).toBe(m);
  expect(act(m, { type: 'ADD_SPORTCASH_STEP' }).template.steps).toEqual(m.template.steps);
  expect(before.template.steps.some((s) => s.code === 'sportcash')).toBe(false);
});
it('respects ownership, active state and closed journals during augmentation', () => {
  let m = fresh();
  m.template.steps = m.template.steps.filter((s) => s.code !== 'sportcash');
  delete m.runs.sportcash;
  expect(() => act(m, { type: 'ADD_SPORTCASH_STEP' })).toThrow('NOT_STARTED');
  m = act(m, { type: 'START' });
  expect(() =>
    applyOperation(m, { ...operation(m, { type: 'ADD_SPORTCASH_STEP' }), deviceId: 'b' }),
  ).toThrow('DEVICE_REVOKED');
  m = act(m, { type: 'CLOSE', reason: 'POSTPONED', comment: 'Reporté' });
  expect(needsSportcashStep(m)).toBe(false);
  expect(() => act(m, { type: 'ADD_SPORTCASH_STEP' })).toThrow('CLOSED');
});
