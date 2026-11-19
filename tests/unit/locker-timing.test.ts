import { expect, it } from 'vitest';
import { applyOperation, createMatch } from '@/domain/match';
import { templates } from '@/domain/templates';
import { defaultEquipment } from '@/domain/equipment';
import { preparationTiming } from '@/domain/preparation-timing';
import { actionSchema } from '@/server/validation';
import type { Match, OperationInput, Practice } from '@/domain/types';
const fresh = (practice: Practice = 'FOOT_11') =>
  createMatch(
    {
      homeTeam: 'Domicile',
      awayTeam: 'Visiteurs',
      practice,
      kickoffAt: '2026-12-01T14:00:00Z',
      timezone: 'Europe/Paris',
    },
    defaultEquipment(),
    templates[practice],
  );
const act = (match: Match, action: OperationInput) =>
  applyOperation(match, {
    id: crypto.randomUUID(),
    matchId: match.id,
    expectedVersion: match.version,
    deviceId: 'device-a',
    fencingVersion: match.fencingVersion,
    occurredAt: '2026-12-01T12:45:00Z',
    action,
  });
it('adds two ordered locker stages for every practice with kickoff-relative times', () => {
  for (const practice of ['FOOT_11', 'FOOT_8', 'FUTSAL'] as const) {
    const m = fresh(practice);
    expect(m.template.steps.slice(0, 5).map((s) => s.code)).toEqual([
      'arrival',
      'referee-locker',
      'team-lockers',
      'sportcash',
      'pitch',
    ]);
    expect(
      m.template.steps.every((s, i, steps) => i === 0 || s.offset >= steps[i - 1].offset),
    ).toBe(true);
  }
});
it('audits an additive legacy upgrade without losing the displayed stage, completed runs, issues or template metadata', () => {
  let m = fresh();
  m.template.steps = m.template.steps.filter((s) => s.kind !== 'locker' && s.code !== 'sportcash');
  m.template.version = 1;
  m.template.code = 'legacy-v1';
  delete m.runs['referee-locker'];
  delete m.runs['team-lockers'];
  m = act(m, { type: 'START' });
  expect(m.template.steps[1].code).toBe('pitch');
  m = act(m, { type: 'NAVIGATE', index: 3 });
  expect(m.template.steps[m.currentStep].code).toBe('kit');
  // Simulate an already active v1 snapshot with completed work.
  m.template.steps = m.template.steps.filter((s) => s.kind !== 'locker' && s.code !== 'sportcash');
  delete m.runs['referee-locker'];
  delete m.runs['team-lockers'];
  m.currentStep = m.template.steps.findIndex((s) => s.code === 'kit');
  m = act(m, { type: 'COMPLETE', stepCode: 'arrival' });
  const before = structuredClone(m);
  const op = {
    id: crypto.randomUUID(),
    matchId: m.id,
    expectedVersion: m.version,
    deviceId: 'device-a',
    fencingVersion: m.fencingVersion,
    occurredAt: '2026-12-01T12:46:00Z',
    action: { type: 'ADD_LOCKER_STEPS' } as const,
  };
  m = applyOperation(m, op);
  expect(m.template.steps[m.currentStep].code).toBe('kit');
  expect(m.runs.arrival).toEqual(before.runs.arrival);
  expect(m.issues).toEqual(before.issues);
  expect(m.template.code).toBe('legacy-v1');
  expect(m.version).toBe(before.version + 1);
  expect(applyOperation(m, op)).toBe(m);
  expect(act(m, { type: 'ADD_LOCKER_STEPS' }).template.steps).toEqual(m.template.steps);
  expect(before.template.steps.some((s) => s.kind === 'locker')).toBe(false);
});
it('validates locker numbers atomically and keeps navigation and other stages separate', () => {
  let m = act(fresh(), { type: 'START' });
  expect(() => act(m, { type: 'COMPLETE', stepCode: 'referee-locker' })).toThrow(
    'LOCKER_ROOMS_REQUIRED',
  );
  expect(actionSchema.safeParse({ type: 'LOCKER_ROOMS', rooms: { referee: '  ' } }).success).toBe(
    false,
  );
  expect(actionSchema.safeParse({ type: 'LOCKER_ROOMS', rooms: { home: '1' } }).success).toBe(
    false,
  );
  expect(
    actionSchema.safeParse({ type: 'LOCKER_ROOMS', rooms: { referee: '1', home: '2', away: '3' } })
      .success,
  ).toBe(false);
  expect(
    actionSchema.safeParse({ type: 'LOCKER_ROOMS', rooms: { referee: 'x'.repeat(31) } }).success,
  ).toBe(false);
  m = act(m, { type: 'LOCKER_ROOMS', rooms: { referee: ' A2 ' } });
  expect(m.lockerRooms).toEqual({ referee: 'A2' });
  expect(m.runs['referee-locker'].completedAt).toBeTruthy();
  expect(m.runs['team-lockers'].completedAt).toBeUndefined();
  expect(m.currentStep).toBe(0);
  m = act(m, { type: 'LOCKER_ROOMS', rooms: { home: '3', away: '4' } });
  expect(m.lockerRooms).toEqual({ referee: 'A2', home: '3', away: '4' });
  expect(() => act(m, { type: 'LOCKER_ROOMS', rooms: { referee: 'B1' } })).toThrow(
    'STEP_COMPLETED',
  );
  expect(m.lockerRooms).toEqual({ referee: 'A2', home: '3', away: '4' });
  expect(m.runs.arrival.completedAt).toBeUndefined();
  const foreign = { ...m, ownerDeviceId: 'another-device' };
  expect(() => act(foreign, { type: 'LOCKER_ROOMS', rooms: { referee: '2' } })).toThrow(
    'DEVICE_REVOKED',
  );
  expect(() => act(foreign, { type: 'ADD_LOCKER_STEPS' })).toThrow('DEVICE_REVOKED');
  m = act(m, { type: 'CLOSE', reason: 'CANCELED', comment: 'Annulé' });
  expect(() => act(m, { type: 'ADD_LOCKER_STEPS' })).toThrow('CLOSED');
  expect(() => act(m, { type: 'LOCKER_ROOMS', rooms: { referee: '2' } })).toThrow('CLOSED');
});
it('shows advance, on-time and delay independent of browsing, then counts down to kickoff', () => {
  let m = act(fresh(), { type: 'START' });
  const due = Date.parse(m.kickoffAt) - 75 * 60000;
  expect(preparationTiming(m, due - 60001).state).toBe('ahead');
  expect(preparationTiming(m, due - 60000).state).toBe('on-time');
  expect(preparationTiming(m, due + 60000).state).toBe('on-time');
  expect(preparationTiming(m, due + 60001).state).toBe('late');
  const timing = preparationTiming(m, due);
  m = act(m, { type: 'NAVIGATE', index: m.template.steps.length - 1 });
  expect(preparationTiming(m, due)).toEqual(timing);
  for (const step of m.template.steps.filter((s) => s.kind !== 'final'))
    m.runs[step.code].completedAt = new Date(due).toISOString();
  expect(preparationTiming(m, due)).toMatchObject({
    nextAt: new Date(m.kickoffAt).toISOString(),
    nextLabel: 'COUP D’ENVOI',
    state: 'ahead',
  });
  expect(preparationTiming(m, Date.parse(m.kickoffAt))).toMatchObject({ state: 'on-time' });
  expect(preparationTiming(m, Date.parse(m.kickoffAt) + 61000).state).toBe('late');
});
