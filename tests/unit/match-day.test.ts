import { describe, expect, it } from 'vitest';
import { applyOperation, createMatch, hasDuplicateRooms } from '@/domain/match';
import { actionSchema } from '@/server/validation';
import { defaultEquipment } from '@/domain/equipment';
import { templates } from '@/domain/templates';
import type { Match, OperationInput } from '@/domain/types';

const base = createMatch(
  {
    homeTeam: 'A',
    awayTeam: 'B',
    kickoffAt: '2026-11-28T14:00:00.000Z',
    timezone: 'Europe/Paris',
    practice: 'FOOT_11',
  },
  defaultEquipment(),
  templates.FOOT_11,
);
const apply = (match: Match, action: OperationInput) =>
  applyOperation(match, {
    id: crypto.randomUUID(),
    matchId: match.id,
    deviceId: 'd',
    fencingVersion: 0,
    expectedVersion: match.version,
    occurredAt: '2026-11-28T12:00:00.000Z',
    action,
  });

describe('locker rooms', () => {
  it('requires three different rooms', () => {
    expect(hasDuplicateRooms({ referee: 'a 2', home: 'A2' })).toBe(true);
    expect(hasDuplicateRooms({ referee: '1', home: '2', away: '3' })).toBe(false);
    const match: Match = { ...base, status: 'ACTIVE', lockerRooms: { referee: '1' } };
    expect(() => apply(match, { type: 'LOCKER_ROOMS', rooms: { home: '1', away: '2' } })).toThrow(
      'LOCKER_ROOMS_DUPLICATE',
    );
  });
});

describe('arrival position', () => {
  it('is stored with the arrival confirmation', () => {
    const position = { latitude: 48.8, longitude: 2.3, accuracy: 12 };
    const action = { type: 'COMPLETE' as const, stepCode: 'arrival', position };
    expect(actionSchema.parse(action)).toEqual(action);
    const next = apply({ ...base, status: 'ACTIVE' }, action);
    expect(next.arrivalPosition).toMatchObject(position);
  });
});

describe('match fee payment', () => {
  it('keeps the payment method', () => {
    const action = { type: 'INDEMNITY' as const, amount: 40, payment: 'CASH' as const };
    expect(actionSchema.parse(action)).toEqual(action);
    const next = apply({ ...base, status: 'COMPLETED' }, action);
    expect(next.indemnity).toEqual({ amount: 40, payment: 'CASH' });
  });
});
