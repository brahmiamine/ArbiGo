import { expect, it } from 'vitest';
import { createMatch, applyOperation } from '@/domain/match';
import { stageTiming } from '@/domain/preparation-timing';
import { templates } from '@/domain/templates';
import type { Practice } from '@/domain/types';
const fresh = (practice: Practice = 'FOOT_11') =>
  createMatch(
    {
      homeTeam: 'A',
      awayTeam: 'B',
      kickoffAt: '2026-11-17T15:00:00+01:00',
      timezone: 'Europe/Paris',
      practice,
    },
    [],
    templates[practice],
  );
it('compares actual validation to each kickoff-relative stage, with symmetric minute rounding', () => {
  const m = fresh(),
    step = m.template.steps[0];
  const due = Date.parse(m.kickoffAt) + step.offset * 60000;
  for (const [seconds, minutes, state, value] of [
    [-180, -3, 'ahead', '−3 min'],
    [120, 2, 'late', '+2 min'],
    [0, 0, 'on-time', '0 min'],
    [-29, 0, 'on-time', '0 min'],
    [29, 0, 'on-time', '0 min'],
    [-30, -1, 'ahead', '−1 min'],
    [30, 1, 'late', '+1 min'],
  ] as const) {
    m.runs[step.code].completedAt = new Date(due + seconds * 1000).toISOString();
    expect(stageTiming(m, step)).toMatchObject({ minutes, state, value, deltaMs: seconds * 1000 });
  }
});
it('does not invent a compliance result for an unfinished or invalid timestamp', () => {
  const m = fresh(),
    step = m.template.steps[0];
  expect(stageTiming(m, step)).toBeNull();
  m.runs[step.code].answers = { example: { value: 'OK', at: m.kickoffAt } };
  expect(stageTiming(m, step)).toBeNull();
  m.runs[step.code].completedAt = 'not-a-time';
  expect(stageTiming(m, step)).toBeNull();
});
it('uses stored schedules for all practices, handles offsets and equivalent timezones, and never changes journals', () => {
  for (const practice of ['FOOT_11', 'FOOT_8', 'FUTSAL'] as const) {
    const m = fresh(practice);
    for (const step of m.template.steps) {
      const due = Date.parse(m.kickoffAt) + step.offset * 60000;
      m.runs[step.code].completedAt = new Date(due - 120000).toISOString();
      const before = structuredClone(m);
      expect(stageTiming(m, step)?.value).toBe('−2 min');
      const equivalent = { ...m, kickoffAt: '2026-11-17T14:00:00Z' };
      expect(stageTiming(equivalent, step)).toEqual(stageTiming(m, step));
      expect(m).toEqual(before);
    }
  }
});
it('keeps validation deltas fixed when browsing later or waiting; a new validation updates the recorded result', () => {
  let m = fresh();
  const act = (action: Parameters<typeof applyOperation>[1]['action'], at: string) => {
    m = applyOperation(m, {
      id: crypto.randomUUID(),
      matchId: m.id,
      deviceId: 'a',
      fencingVersion: m.fencingVersion,
      expectedVersion: m.version,
      occurredAt: at,
      action,
    });
  };
  act({ type: 'START' }, '2026-11-17T12:40:00Z');
  act({ type: 'COMPLETE', stepCode: 'arrival' }, '2026-11-17T12:42:00Z');
  const step = m.template.steps[0],
    result = stageTiming(m, step);
  expect(result?.value).toBe('−3 min');
  act({ type: 'NAVIGATE', index: m.template.steps.length - 1 }, '2026-11-17T14:10:00Z');
  expect(stageTiming(m, step)).toEqual(result);
  act({ type: 'COMPLETE', stepCode: 'arrival' }, '2026-11-17T12:47:00Z');
  expect(stageTiming(m, step)?.value).toBe('+2 min');
});
