import { describe, expect, it } from 'vitest';
import { applyOperation, createMatch } from '@/domain/match';
import { templates } from '@/domain/templates';
import type { Match, Operation, OperationInput } from '@/domain/types';
import { actionSchema } from '@/server/validation';
import { operationBatch } from '@/lib/operation-batch';

const fresh = () =>
  createMatch(
    {
      homeTeam: 'Paris',
      awayTeam: 'Lyon',
      practice: 'FOOT_11',
      kickoffAt: '2026-12-01T14:00:00Z',
      timezone: 'Europe/Paris',
      competition: 'D4',
    },
    [],
    templates.FOOT_11,
  );
function action(m: Match, action: OperationInput, deviceId = 'a') {
  return applyOperation(m, {
    id: crypto.randomUUID(),
    matchId: m.id,
    deviceId,
    expectedVersion: m.version,
    fencingVersion: m.fencingVersion,
    occurredAt: '2026-12-01T17:00:00Z',
    action,
  });
}
const played = () =>
  action(action(fresh(), { type: 'START' }), { type: 'KICKOFF', acknowledged: true });

describe('optional kit selections', () => {
  it('validates the kit stage after ball checks without colors or outfit', () => {
    let m = action(fresh(), { type: 'START' });
    for (const control of m.template.steps.find((s) => s.kind === 'kit')!.controls)
      m = action(m, { type: 'ANSWER', stepCode: 'kit', controlCode: control.code, value: 'OK' });
    m = action(m, { type: 'COMPLETE', stepCode: 'kit' });
    expect(m.runs.kit.completedAt).toBeDefined();
  });
  it('saves partial colors automatically and rejects an outfit absent from the bag', () => {
    const m = action(fresh(), { type: 'START' });
    const colors = { home: ['rouge'], homeKeeper: [], away: [], awayKeeper: [] };
    expect(actionSchema.parse({ type: 'COLORS', colors })).toMatchObject({ colors });
    expect(action(m, { type: 'COLORS', colors }).colors.home).toEqual(['rouge']);
    expect(() => action(m, { type: 'COLORS', colors, selectedOutfitId: 'absent' })).toThrow(
      'OUTFIT_NOT_PACKED',
    );
  });
});
describe('per-match debrief lifecycle', () => {
  it('requires a played match explicitly marked finished, including from another registered device', () => {
    const m = played();
    expect(() => action(m, { type: 'DEBRIEF', changes: { objective: 'Progresser' } })).toThrow(
      'DEBRIEF_UNAVAILABLE',
    );
    const finished = action(m, { type: 'FINISH_MATCH' }, 'b');
    const next = action(
      finished,
      { type: 'DEBRIEF', changes: { objective: 'Progresser', rating: '7.5' } },
      'b',
    );
    expect(next.finishedAt).toBeDefined();
    expect(next.debrief?.form).toMatchObject({
      homeTeam: 'Paris',
      awayTeam: 'Lyon',
      date: '2026-12-01',
      time: '15:00',
      competition: 'D4',
      objective: 'Progresser',
      rating: '7.5',
    });
    expect(next.bag).toEqual(m.bag);
    expect(next.runs).toEqual(m.runs);
  });
  it('keeps canceled, postponed, active and draft matches out of the debrief', () => {
    const active = action(fresh(), { type: 'START' });
    for (const m of [
      fresh(),
      active,
      action(active, { type: 'CLOSE', reason: 'POSTPONED', comment: 'Pluie' }),
      action(active, { type: 'CLOSE', reason: 'CANCELED', comment: 'Annulé' }),
    ]) {
      expect(() => action(m, { type: 'FINISH_MATCH' })).toThrow();
      expect(() => action(m, { type: 'DEBRIEF', changes: { objective: 'x' } })).toThrow();
    }
  });
  it('patches a debrief without changing the archived identity or another match', () => {
    const a = action(played(), { type: 'FINISH_MATCH' }),
      b = action(played(), { type: 'FINISH_MATCH' });
    const first = action(a, {
      type: 'DEBRIEF',
      changes: { homeTeam: 'Nom dans le rapport', words: ['Calme', 'Juste', 'Clair'] },
    });
    const next = action(first, { type: 'DEBRIEF', changes: { objective: 'Communication' } });
    expect(next.homeTeam).toBe('Paris');
    expect(next.debrief?.form.words).toEqual(['Calme', 'Juste', 'Clair']);
    expect(next.debrief?.form.objective).toBe('Communication');
    expect(b.debrief).toBeUndefined();
    expect(() => action(next, { type: 'BAG', itemId: 'x', packed: true })).toThrow('CLOSED');
  });
  it('rejects malformed, oversized and unknown report fields', () => {
    for (const changes of [
      { words: ['one'] },
      { rating: '11' },
      { rating: '7.2' },
      { objective: 'x'.repeat(5001) },
      { injected: 'x' },
      { time: '25:01' },
    ])
      expect(actionSchema.safeParse({ type: 'DEBRIEF', changes }).success).toBe(false);
  });
  it('retains version conflict and operation idempotency for post-match edits', () => {
    const m = action(played(), { type: 'FINISH_MATCH' });
    const op: Operation = {
      id: crypto.randomUUID(),
      matchId: m.id,
      deviceId: 'b',
      expectedVersion: m.version,
      fencingVersion: 0,
      occurredAt: '2026-12-01T17:00:00Z',
      action: { type: 'DEBRIEF', changes: { objective: 'Premier' } },
    };
    const next = applyOperation(m, op);
    expect(applyOperation(next, op)).toEqual(next);
    expect(() => applyOperation(next, { ...op, id: crypto.randomUUID() })).toThrow(
      'VERSION_CONFLICT',
    );
  });
});
it('batches large unicode reports below the API byte limit without reordering or dropping the next batch', () => {
  const m = played();
  const operations = Array.from({ length: 50 }, (_, i): Operation => ({
    id: String(i),
    matchId: m.id,
    deviceId: 'a',
    fencingVersion: 1,
    expectedVersion: i,
    occurredAt: '2026-12-01T17:00:00Z',
    action: { type: 'DEBRIEF', changes: { objective: '🎯'.repeat(2500) } },
  }));
  const batch = operationBatch(operations);
  expect(batch.length).toBeGreaterThan(0);
  expect(batch.length).toBeLessThan(50);
  expect(
    new TextEncoder().encode(JSON.stringify({ operations: batch })).byteLength,
  ).toBeLessThanOrEqual(240000);
  expect(batch).toEqual(operations.slice(0, batch.length));
  expect(operationBatch(operations.slice(batch.length))[0].id).toBe(String(batch.length));
});
it('restores partially damaged reports while preserving valid values and match defaults', async () => {
  const { createMatchDebrief, restoreDebriefForm } = await import('@/domain/debrief/schema');
  const fallback = createMatchDebrief(fresh(), 'Nom arbitre');
  const restored = restoreDebriefForm(
    { words: ['Calme'], rating: 'corrompu', homeTeam: { bad: true }, objective: 'Lecture du jeu' },
    fallback,
  );
  expect(restored.words).toEqual(['Calme', '', '']);
  expect(restored.rating).toBe('8');
  expect(restored.homeTeam).toBe('Paris');
  expect(restored.referee).toBe('Nom arbitre');
  expect(restored.objective).toBe('Lecture du jeu');
});
