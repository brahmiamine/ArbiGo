import { expect, it } from 'vitest';
import { applyOperation, createMatch, summarize } from '@/domain/match';
import { templates } from '@/domain/templates';
import { preparationActions } from '../helpers/preparation';
import type { Match, OperationInput } from '@/domain/types';
const act = (m: Match, action: OperationInput) =>
  applyOperation(m, {
    id: crypto.randomUUID(),
    matchId: m.id,
    deviceId: 'a',
    fencingVersion: m.fencingVersion,
    expectedVersion: m.version,
    occurredAt: '2026-12-01T14:00:00Z',
    action,
  });
const kickoff = { type: 'KICKOFF', acknowledged: true } as const;
it('requires every preparatory stage for all practices, reblocks edited checks, and preserves historical closure', () => {
  for (const practice of ['FOOT_11', 'FOOT_8', 'FUTSAL'] as const) {
    let m = act(
      createMatch(
        {
          homeTeam: 'A',
          awayTeam: 'B',
          kickoffAt: '2026-12-01T14:00:00Z',
          timezone: 'Europe/Paris',
          practice,
        },
        [],
        templates[practice],
      ),
      { type: 'START' },
    );
    expect(() => act(m, kickoff)).toThrow('PREPARATION_REQUIRED');
    const unchanged = structuredClone(m);
    for (const input of preparationActions(m)) m = act(m, input);
    expect(summarize(m).complete).toBe(true);
    const ready = structuredClone(m);
    for (const step of m.template.steps.filter((s) => s.kind !== 'final')) {
      const missing = structuredClone(ready);
      delete missing.runs[step.code].completedAt;
      expect(() => act(missing, kickoff)).toThrow('PREPARATION_REQUIRED');
    }
    expect(unchanged.status).toBe('ACTIVE');
    const edited = act(m, { type: 'ANSWER', stepCode: 'pitch', controlCode: 'goals', value: 'OK' });
    expect(() => act(edited, kickoff)).toThrow('PREPARATION_REQUIRED');
    const done = act(m, kickoff);
    expect(done.status).toBe('COMPLETED');
    expect(done.runs.final.completedAt).toBe('2026-12-01T14:00:00Z');
    expect(() => act(done, kickoff)).toThrow('CLOSED');
  }
});
it('blocks unresolved issues even after stage completion and allows resolved problems and applicable NA', () => {
  let m = act(
    createMatch(
      {
        homeTeam: 'A',
        awayTeam: 'B',
        kickoffAt: '2026-12-01T14:00:00Z',
        timezone: 'Europe/Paris',
        practice: 'FOOT_11',
      },
      [],
      templates.FOOT_11,
    ),
    { type: 'START' },
  );
  for (const input of preparationActions(m)) m = act(m, input);
  m = act(m, { type: 'ANSWER', stepCode: 'pitch', controlCode: 'corners', value: 'NA' });
  m = act(m, {
    type: 'ANSWER',
    stepCode: 'pitch',
    controlCode: 'goals',
    value: 'PROBLEM',
    reason: 'But à fixer',
  });
  m = act(m, { type: 'COMPLETE', stepCode: 'pitch' });
  expect(summarize(m).missing).toEqual([]);
  expect(() => act(m, kickoff)).toThrow('PREPARATION_REQUIRED');
  m = act(m, { type: 'ISSUE_UPDATE', issueId: m.issues[0].id, status: 'RESOLVED' });
  expect(() => act(m, { type: 'KICKOFF', acknowledged: false })).toThrow('REVIEW_REQUIRED');
  expect(act(m, kickoff).status).toBe('COMPLETED');
});

it('keeps an already applied legacy kickoff idempotent but rejects an unapplied incomplete kickoff', () => {
  const active = act(
    createMatch(
      {
        homeTeam: 'A',
        awayTeam: 'B',
        kickoffAt: '2026-12-01T14:00:00Z',
        timezone: 'Europe/Paris',
        practice: 'FOOT_11',
      },
      [],
      templates.FOOT_11,
    ),
    { type: 'START' },
  );
  const op = {
    id: crypto.randomUUID(),
    matchId: active.id,
    deviceId: 'a',
    fencingVersion: active.fencingVersion,
    expectedVersion: active.version,
    occurredAt: '2026-12-01T14:00:00Z',
    action: kickoff,
  };
  const before = structuredClone(active);
  expect(() => applyOperation(active, op)).toThrow('PREPARATION_REQUIRED');
  expect(active).toEqual(before);
  const legacy = {
    ...structuredClone(active),
    status: 'COMPLETED' as const,
    version: active.version + 1,
    closedAt: op.occurredAt,
    appliedOperations: [...active.appliedOperations, op.id],
  };
  expect(applyOperation(legacy, op)).toBe(legacy);
});
