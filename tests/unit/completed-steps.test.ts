import { expect, it } from 'vitest';
import { applyOperation, createMatch } from '@/domain/match';
import { templates } from '@/domain/templates';
import { defaultEquipment } from '@/domain/equipment';
import type { Match, OperationInput } from '@/domain/types';
import { preparationActions } from '../helpers/preparation';

const fresh = () =>
  act(
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
    ),
    { type: 'START' },
  );

const act = (match: Match, action: OperationInput) =>
  applyOperation(match, {
    id: crypto.randomUUID(),
    matchId: match.id,
    deviceId: 'a',
    fencingVersion: match.fencingVersion,
    expectedVersion: match.version,
    occurredAt: '2026-12-01T13:00:00Z',
    action,
  });

it.each(['FOOT_11', 'FOOT_8', 'FUTSAL'] as const)(
  'freezes validated steps in %s without preventing consultation or kickoff',
  (practice) => {
    let match = act(
      createMatch(
        {
          homeTeam: 'A',
          awayTeam: 'B',
          practice,
          kickoffAt: '2026-12-01T14:00:00Z',
          timezone: 'Europe/Paris',
        },
        defaultEquipment(),
        templates[practice],
      ),
      { type: 'START' },
    );
    match = act(match, { type: 'COLORS', colors: { ...match.colors, home: ['rouge'] } });
    match = act(match, { type: 'SELECT_SHIRT', itemId: 'shirt-yellow' });
    for (const action of preparationActions(match)) match = act(match, action);
    const before = structuredClone(match);
    const edits: OperationInput[] = [
      ...match.template.steps
        .filter((step) => step.kind !== 'final' && step.kind !== 'locker')
        .map((step): OperationInput => ({ type: 'COMPLETE', stepCode: step.code })),
      ...match.template.steps.flatMap((step) =>
        step.controls.map((control): OperationInput => ({
          type: 'ANSWER',
          stepCode: step.code,
          controlCode: control.code,
          value: 'PROBLEM',
          reason: 'Autre',
        })),
      ),
      { type: 'LOCKER_ROOMS', rooms: { referee: 'B2' } },
      { type: 'LOCKER_ROOMS', rooms: { home: '5', away: '6' } },
      { type: 'BRIEFING', stepCode: 'captains' },
      { type: 'BRIEFING', stepCode: 'assistants' },
      { type: 'COLORS', colors: { ...match.colors, home: ['bleu'] } },
      { type: 'SELECT_SHIRT', itemId: 'shirt-black' },
      { type: 'WARMUP', phase: 0, command: 'START' },
    ];
    for (const action of edits)
      expect(() => act(match, action), action.type).toThrow('STEP_COMPLETED');
    expect(match).toEqual(before);
    expect(act(match, { type: 'NAVIGATE', index: 4 }).currentStep).toBe(4);
    expect(act(match, { type: 'KICKOFF', acknowledged: true }).status).toBe('COMPLETED');
  },
);

it.each(['pitch', 'captains', 'assistants'])(
  'requires resolved anomalies before validating %s',
  (stepCode) => {
    let match = fresh();
    const step = match.template.steps.find((s) => s.code === stepCode)!;
    for (const [index, control] of step.controls.entries())
      match = act(match, {
        type: 'ANSWER',
        stepCode,
        controlCode: control.code,
        value: index === 0 ? 'PROBLEM' : 'OK',
        reason: index === 0 ? 'Absent' : undefined,
      });
    const completion: OperationInput =
      stepCode === 'pitch'
        ? { type: 'COMPLETE', stepCode }
        : { type: 'BRIEFING', stepCode: stepCode as 'captains' | 'assistants' };
    expect(() => act(match, completion)).toThrow('ISSUES_UNRESOLVED');
    expect(() => act(match, { type: 'COMPLETE', stepCode })).toThrow('ISSUES_UNRESOLVED');
    match = act(match, { type: 'ISSUE_UPDATE', issueId: match.issues[0].id, status: 'RESOLVED' });
    match = act(match, completion);
    const before = structuredClone(match);
    expect(() =>
      act(match, { type: 'ISSUE_UPDATE', issueId: match.issues[0].id, status: 'WAITING' }),
    ).toThrow('STEP_COMPLETED');
    expect(match).toEqual(before);
    match = act(match, { type: 'LOCKER_ROOMS', rooms: { referee: 'A2' } });
    expect(match.lockerRooms?.referee).toBe('A2');
  },
);
