import { describe, expect, it } from 'vitest';
import {
  createMatch,
  applyOperation,
  summarize,
  createRematch,
  activeStage,
  stageStatus,
} from '@/domain/match';
import { templates } from '@/domain/templates';
import { defaultEquipment, rankOutfits, previousTeamColors } from '@/domain/equipment';
import { parseLocalKickoff, scheduledAt, countdown } from '@/domain/time';
import { elapsedWarmup } from '@/domain/warmup';
import type { Match, Operation, OperationInput } from '@/domain/types';

const at = '2026-11-22T14:00:00.000Z';
const fresh = () =>
  createMatch(
    {
      homeTeam: 'Paris 13',
      awayTeam: 'Athletico',
      kickoffAt: at,
      timezone: 'Europe/Paris',
      practice: 'FOOT_11',
    },
    defaultEquipment(),
    templates.FOOT_11,
    'match-1',
  );
let seq = 0;
const op = (m: Match, action: OperationInput): Operation => ({
  id: `op-${++seq}`,
  matchId: m.id,
  deviceId: 'device-a',
  fencingVersion: m.fencingVersion,
  expectedVersion: m.version,
  occurredAt: '2026-11-22T12:45:00.000Z',
  action,
});
const act = (m: Match, action: OperationInput) => applyOperation(m, op(m, action));

describe('match preparation', () => {
  it('keeps unresolved anomalies visible on completed stages and distinguishes whole-stage NA', () => {
    let m = act(fresh(), { type: 'START' });
    const pitch = m.template.steps.find((s) => s.code === 'pitch')!;
    for (const control of pitch.controls)
      m = act(m, {
        type: 'ANSWER',
        stepCode: pitch.code,
        controlCode: control.code,
        value: control.code === 'goals' ? 'PROBLEM' : 'OK',
        reason: control.code === 'goals' ? 'Danger' : undefined,
      });
    m = act(m, { type: 'COMPLETE', stepCode: pitch.code });
    expect(stageStatus(m, pitch).label).toBe('Validée avec anomalie à suivre');
    const captains = m.template.steps.find((s) => s.code === 'captains')!;
    for (const control of captains.controls)
      m = act(m, {
        type: 'ANSWER',
        stepCode: captains.code,
        controlCode: control.code,
        value: 'NA',
      });
    m = act(m, { type: 'COMPLETE', stepCode: captains.code });
    expect(stageStatus(m, captains).label).toBe('Sans objet');
  });
  it('keeps the next scheduled deadline independent from the displayed card', () => {
    let m = act(fresh(), { type: 'START' });
    const deadline = activeStage(m).next;
    m = act(m, { type: 'NAVIGATE', index: 8 });
    expect(activeStage(m).next).toEqual(deadline);
    m = act(m, { type: 'COMPLETE', stepCode: 'arrival' });
    expect(activeStage(m).active.code).toBe('referee-locker');
    const following = activeStage(m).next;
    m = act(m, { type: 'NAVIGATE', index: 0 });
    expect(activeStage(m).next).toEqual(following);
  });
  it('calculates Paris 15:00 schedule at H-75 and H-55', () => {
    const m = fresh();
    expect(scheduledAt(m.kickoffAt, -75)).toBe('2026-11-22T12:45:00.000Z');
    expect(scheduledAt(m.kickoffAt, -55)).toBe('2026-11-22T13:05:00.000Z');
    expect(countdown(at, Date.parse('2026-11-22T14:02:30Z'))).toBe('+02:30');
  });
  it('parses Paris local time in summer and winter without host timezone', () => {
    expect(parseLocalKickoff('2026-07-12', '15:00', 'Europe/Paris')).toBe(
      '2026-07-12T13:00:00.000Z',
    );
    expect(parseLocalKickoff('2026-12-12', '15:00', 'Europe/Paris')).toBe(
      '2026-12-12T14:00:00.000Z',
    );
  });
  it('rejects nonexistent and ambiguous DST wall times', () => {
    expect(() => parseLocalKickoff('2026-03-29', '02:30', 'Europe/Paris')).toThrow();
    expect(() => parseLocalKickoff('2026-10-25', '02:30', 'Europe/Paris')).toThrow();
  });
  it('rejects blank teams and invalid dates', () => {
    expect(() =>
      createMatch(
        {
          homeTeam: ' ',
          awayTeam: 'A',
          kickoffAt: 'bad',
          timezone: 'Europe/Paris',
          practice: 'FOOT_11',
        },
        [],
        templates.FOOT_11,
      ),
    ).toThrow();
  });
  it('creates independent unchecked bags and snapshots', () => {
    const a = fresh(),
      b = fresh();
    a.bag[0].packed = true;
    a.template.steps[0].title = 'Changed';
    expect(b.bag[0].packed).toBe(false);
    expect(b.template.steps[0].title).toBe('Arrivée au stade');
  });
  it('navigation never validates a step', () => {
    const m = act(fresh(), { type: 'START' });
    const n = act(m, { type: 'NAVIGATE', index: 2 });
    expect(n.currentStep).toBe(2);
    expect(n.runs.arrival.completedAt).toBeUndefined();
  });
  it('rejects incomplete checks and inadmissible not-applicable', () => {
    const m = act(fresh(), { type: 'START' });
    expect(() => act(m, { type: 'COMPLETE', stepCode: 'pitch' })).toThrow();
    expect(() =>
      act(m, { type: 'ANSWER', stepCode: 'pitch', controlCode: 'goals', value: 'NA' }),
    ).toThrow();
  });
  it('retains a critical issue until explicitly rechecked', () => {
    let m = act(fresh(), { type: 'START' });
    m = act(m, {
      type: 'ANSWER',
      stepCode: 'pitch',
      controlCode: 'goals',
      value: 'PROBLEM',
      reason: 'dangereux',
      comment: 'Fixation mobile',
    });
    const issue = m.issues[0];
    expect(summarize(m).safe).toBe(false);
    m = act(m, {
      type: 'ISSUE_UPDATE',
      issueId: issue.id,
      status: 'RESOLVED',
      comment: 'Fixation revérifiée',
    });
    expect(summarize(m).safe).toBe(true);
    expect(m.runs.pitch.answers.goals.value).toBe('OK');
  });
  it('rejects stale versions, revoked devices and duplicates are harmless', () => {
    const m = fresh();
    const operation = op(m, { type: 'START' });
    const started = applyOperation(m, operation);
    expect(applyOperation(started, operation)).toEqual(started);
    expect(() =>
      applyOperation(started, {
        ...op(started, { type: 'NAVIGATE', index: 1 }),
        expectedVersion: 0,
      }),
    ).toThrow('VERSION_CONFLICT');
    expect(() =>
      applyOperation(started, {
        ...op(started, { type: 'NAVIGATE', index: 1 }),
        deviceId: 'device-b',
      }),
    ).toThrow('DEVICE_REVOKED');
  });
  it('closes manually, preserves checks, allows only appended notes', () => {
    const m = act(act(fresh(), { type: 'START' }), {
      type: 'CLOSE',
      reason: 'POSTPONED',
      comment: 'Terrain impraticable',
    });
    expect(m.status).toBe('POSTPONED');
    expect(() =>
      act(m, { type: 'ANSWER', stepCode: 'pitch', controlCode: 'goals', value: 'OK' }),
    ).toThrow('CLOSED');
    expect(act(m, { type: 'NOTE', content: 'Décision communiquée' }).notes).toHaveLength(1);
    const next = createRematch(m, '2026-11-29T14:00:00Z');
    expect(next.originalMatchId).toBe(m.id);
    expect(next.status).toBe('DRAFT');
    expect(next.appliedOperations).toHaveLength(0);
    expect(next.bag.every((i) => !i.packed)).toBe(true);
  });
  it('requires final review acknowledgment before kickoff', () => {
    const m = act(fresh(), { type: 'START' });
    expect(() => act(m, { type: 'KICKOFF', acknowledged: false })).toThrow();
    const done = act(m, { type: 'KICKOFF', acknowledged: true });
    expect(done.status).toBe('COMPLETED');
    expect(done.closedAt).toBe('2026-11-22T12:45:00.000Z');
  });
});

describe('outfit recommendations', () => {
  it('treats an unknown opposing color as uncertain and suggests history without confirming it', () => {
    const old = fresh();
    old.id = 'old';
    old.colorsConfirmedAt = '2026-11-01T12:00:00Z';
    old.colors = { home: ['mauve'], homeKeeper: ['vert'], away: ['noir'], awayKeeper: ['jaune'] };
    const current = fresh();
    const suggestions = previousTeamColors([old, current], current);
    expect(suggestions.home).toEqual(['mauve']);
    expect(current.colorsConfirmedAt).toBeUndefined();
    const ranked = rankOutfits(
      [{ id: 'one', name: 'Rouge', itemIds: ['shirt'], primaryColor: 'rouge' }],
      [{ id: 'shirt', label: 'Maillot', type: 'SHIRT', packed: true, colors: ['rouge'] }],
      old.colors,
    );
    expect(ranked[0].rating).toBe('CHECK');
  });
  it('excludes absent outfits and explains color conflict', () => {
    const m = fresh();
    m.bag.forEach((i) => (i.packed = true));
    const items = m.bag.map((i) => i.id).slice(0, 4);
    const outfits = [
      { id: 'one', name: 'Bleue', itemIds: items, primaryColor: 'bleu', secondaryColor: 'noir' },
      { id: 'two', name: 'Absente', itemIds: ['absent'], primaryColor: 'rouge' },
    ];
    const ranked = rankOutfits(outfits, m.bag, {
      home: ['bleu'],
      homeKeeper: ['vert'],
      away: ['blanc'],
      awayKeeper: ['jaune'],
    });
    expect(ranked).toHaveLength(1);
    expect(ranked[0].rating).toBe('AVOID');
    expect(ranked[0].reason).toContain('bleu');
  });
  it('treats unknown team colors as uncertain', () => {
    const ranked = rankOutfits(
      [{ id: 'one', name: 'Tenue', itemIds: ['shirt'], primaryColor: 'rouge' }],
      [{ id: 'shirt', label: 'Maillot', type: 'SHIRT', packed: true, colors: ['rouge'] }],
      { home: [], homeKeeper: [], away: [], awayKeeper: [] },
    );
    expect(ranked[0].rating).toBe('CHECK');
  });
});

describe('warmup', () => {
  it('excludes pauses and restores elapsed time from absolute timestamps', () => {
    expect(
      elapsedWarmup(
        { status: 'RUNNING', startedAt: '2026-11-22T13:30:00Z', pausedMs: 20000 },
        Date.parse('2026-11-22T13:31:00Z'),
      ),
    ).toBe(40000);
    expect(
      elapsedWarmup(
        {
          status: 'PAUSED',
          startedAt: '2026-11-22T13:30:00Z',
          pausedAt: '2026-11-22T13:30:30Z',
          pausedMs: 0,
        },
        Date.parse('2026-11-22T14:00:00Z'),
      ),
    ).toBe(30000);
  });
  it('requires manual start of the following phase', () => {
    let m = act(fresh(), { type: 'START' });
    m = act(m, { type: 'WARMUP', phase: 0, command: 'START' });
    m = act(m, { type: 'WARMUP', phase: 0, command: 'FINISH' });
    expect(m.warmup[0].status).toBe('FINISHED');
    expect(m.warmup[1].status).toBe('IDLE');
  });
});
