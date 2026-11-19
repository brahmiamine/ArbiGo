import { expect, it } from 'vitest';
import { applyOperation, createMatch, stageStatus } from '@/domain/match';
import { templates } from '@/domain/templates';
import { defaultEquipment, rankMatchShirts } from '@/domain/equipment';
import { actionSchema } from '@/server/validation';
import type { Match, Operation, OperationInput, Practice } from '@/domain/types';

function fresh(practice: Practice = 'FOOT_11') {
  return createMatch(
    {
      homeTeam: 'A',
      awayTeam: 'B',
      practice,
      kickoffAt: '2026-12-01T14:00:00Z',
      timezone: 'Europe/Paris',
    },
    defaultEquipment(),
    templates[practice],
  );
}
const operation = (m: Match, action: OperationInput): Operation => ({
  id: crypto.randomUUID(),
  matchId: m.id,
  deviceId: 'device-a',
  expectedVersion: m.version,
  fencingVersion: m.fencingVersion,
  occurredAt: '2026-12-01T13:00:00Z',
  action,
});
const act = (m: Match, action: OperationInput) => applyOperation(m, operation(m, action));

it('confirms both briefings atomically on stored templates for every practice without moving stages', () => {
  for (const practice of ['FOOT_11', 'FOOT_8', 'FUTSAL'] as const) {
    let m = act(fresh(practice), { type: 'START' });
    for (const stepCode of ['captains', 'assistants'] as const) {
      const previous = structuredClone(m);
      const op = operation(m, { type: 'BRIEFING', stepCode });
      expect(actionSchema.safeParse(op.action).success).toBe(true);
      m = applyOperation(m, op);
      expect(m.currentStep).toBe(previous.currentStep);
      expect(m.runs[stepCode].completedAt).toBe(op.occurredAt);
      expect(Object.values(m.runs[stepCode].answers).every((a) => a.value === 'OK')).toBe(true);
      expect(
        stageStatus(
          m,
          m.template.steps.find((s) => s.code === stepCode)!,
        ).label,
      ).toBe('Validée');
      expect(applyOperation(m, op)).toBe(m);
      expect(previous.runs[stepCode].completedAt).toBeUndefined();
    }
  }
});
it('requires briefing anomalies to be resolved and preserves earlier answers', () => {
  let m = act(fresh(), { type: 'START' });
  m = act(m, {
    type: 'ANSWER',
    stepCode: 'captains',
    controlCode: 'presentation',
    value: 'PROBLEM',
    reason: 'Capitaine absent',
  });
  m = act(m, { type: 'ANSWER', stepCode: 'captains', controlCode: 'call', value: 'NA' });
  expect(() => act(m, { type: 'BRIEFING', stepCode: 'captains' })).toThrow('ISSUES_UNRESOLVED');
  m = act(m, { type: 'ISSUE_UPDATE', issueId: m.issues[0].id, status: 'RESOLVED' });
  const issues = structuredClone(m.issues),
    answers = structuredClone(m.runs.captains.answers);
  m = act(m, { type: 'BRIEFING', stepCode: 'captains' });
  expect(m.issues).toEqual(issues);
  expect(m.runs.captains.answers).toMatchObject(answers);
  expect(
    stageStatus(
      m,
      m.template.steps.find((s) => s.code === 'captains')!,
    ).label,
  ).toBe('Validée');
});
it('cannot use a briefing to bypass checks, match closure or device ownership', () => {
  let m = fresh();
  expect(() => act(m, { type: 'BRIEFING', stepCode: 'captains' })).toThrow('NOT_STARTED');
  m = act(m, { type: 'START' });
  expect(actionSchema.safeParse({ type: 'BRIEFING', stepCode: 'pitch' }).success).toBe(false);
  expect(() =>
    act(m, { type: 'BRIEFING', stepCode: 'pitch' } as unknown as OperationInput),
  ).toThrow('STEP_UNKNOWN');
  expect(() =>
    applyOperation(m, {
      ...operation(m, { type: 'BRIEFING', stepCode: 'captains' }),
      deviceId: 'device-b',
    }),
  ).toThrow('DEVICE_REVOKED');
  m = act(m, { type: 'CLOSE', reason: 'CANCELED', comment: 'Annulé' });
  expect(() => act(m, { type: 'BRIEFING', stepCode: 'captains' })).toThrow('CLOSED');
});
it('ranks real bag shirts against players, keepers and secondary colors before packed or selected preference', () => {
  const m = fresh();
  m.colors = { home: ['rouge'], homeKeeper: ['violet'], away: ['blanc'], awayKeeper: ['noir'] };
  m.bag.find((i) => i.id === 'shirt-black')!.packed = true;
  m.outfits = [
    {
      id: 'chosen',
      name: 'La noire',
      itemIds: ['shirt-black', 'shorts', 'socks', 'shoes'],
      primaryColor: 'noir',
    },
  ];
  m.selectedOutfitId = 'chosen';
  expect(rankMatchShirts(m)[0]).toMatchObject({
    id: 'shirt-yellow',
    rating: 'RECOMMENDED',
    item: { packed: false },
  });
  m.bag.find((i) => i.id === 'shirt-yellow')!.colors.push('rouge');
  expect(rankMatchShirts(m).find((i) => i.id === 'shirt-yellow')?.rating).toBe('AVOID');
});
it('marks incomplete colors and similar shades for checking, and never invents a shirt', () => {
  const m = fresh();
  expect(rankMatchShirts(m).every((i) => i.rating === 'CHECK')).toBe(true);
  m.colors = { home: ['orange'], homeKeeper: ['vert'], away: ['blanc'], awayKeeper: ['turquoise'] };
  m.bag.push({
    id: 'unknown-color',
    label: 'Mon maillot',
    type: 'SHIRT',
    colors: [],
    packed: true,
  });
  expect(rankMatchShirts(m).find((i) => i.id === 'unknown-color')?.rating).toBe('CHECK');
  expect(rankMatchShirts(m).find((i) => i.id === 'shirt-yellow')?.rating).toBe('CHECK');
  m.bag = m.bag.filter((i) => i.type !== 'SHIRT');
  expect(rankMatchShirts(m)).toEqual([]);
});
it('preserves legacy outfit metadata when updating colors without the retired outfit UI', () => {
  let m = act(fresh(), { type: 'START' });
  m.outfits = [
    {
      id: 'legacy',
      name: 'Ma tenue',
      itemIds: ['shirt-black', 'shorts', 'socks', 'shoes'],
      primaryColor: 'noir',
    },
  ];
  m.selectedOutfitId = 'legacy';
  const previous = structuredClone(m.outfits);
  m = act(m, { type: 'COLORS', colors: { ...m.colors, home: ['rouge'] } });
  expect(m.selectedOutfitId).toBe('legacy');
  expect(m.outfits).toEqual(previous);
  expect(m.colors.home).toEqual(['rouge']);
});
