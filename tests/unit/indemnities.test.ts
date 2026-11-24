import { describe, expect, it } from 'vitest';
import { applyOperation, createMatch } from '@/domain/match';
import {
  indemnityCategory,
  indemnityStats,
  matchIndemnity,
  normalizeCategory,
  seasonOf,
  shiftMonth,
} from '@/domain/indemnities';
import { defaultEquipment } from '@/domain/equipment';
import { templates } from '@/domain/templates';
import type { Match } from '@/domain/types';

const match = (
  kickoffAt: string,
  status: Match['status'],
  competition?: string,
  id = kickoffAt,
) => ({
  ...createMatch(
    {
      homeTeam: 'A',
      awayTeam: 'B',
      kickoffAt,
      timezone: 'Europe/Paris',
      practice: 'FOOT_11',
      competition,
    },
    defaultEquipment(),
    templates.FOOT_11,
    id,
  ),
  status,
});
const now = Date.parse('2026-11-24T12:00:00Z');
const rates = { 'SENIORS D4': 40, 'ANCIENS D2': 30, 'U14 D2': 25 };

describe('indemnity categories', () => {
  it('ignores case, spacing and the matchday suffix', () => {
    expect(normalizeCategory('  cdm   d1 - Journée 5 ')).toBe('CDM D1');
    expect(normalizeCategory('')).toBe('SANS CATÉGORIE');
    expect(indemnityCategory({ competition: '', category: 'Seniors D4' })).toBe('SENIORS D4');
  });
});

describe('indemnity amount', () => {
  it('prefers the match amount over the category rate, and is null without a rate', () => {
    const m = match('2026-11-22T10:00:00.000Z', 'COMPLETED', 'Seniors D4');
    expect(matchIndemnity(m, rates)).toBe(40);
    expect(matchIndemnity({ ...m, indemnity: { amount: 55 } }, rates)).toBe(55);
    expect(matchIndemnity({ ...m, competition: 'Coupe' }, rates)).toBeNull();
  });

  it('only changes through INDEMNITY on a played match', () => {
    const op = (m: Match, amount: number | null) => ({
      id: crypto.randomUUID(),
      matchId: m.id,
      deviceId: 'd',
      fencingVersion: 0,
      expectedVersion: m.version,
      occurredAt: '2026-11-22T12:00:00.000Z',
      action: { type: 'INDEMNITY' as const, amount },
    });
    const played = match('2026-11-22T10:00:00.000Z', 'COMPLETED');
    const set = applyOperation(played, op(played, 42.5));
    expect(set.indemnity).toEqual({ amount: 42.5 });
    expect(applyOperation(set, op(set, null)).indemnity).toBeUndefined();
    const canceled = match('2026-12-05T10:00:00.000Z', 'CANCELED');
    expect(() => applyOperation(canceled, op(canceled, 10))).toThrow('INDEMNITY_UNAVAILABLE');
  });
});

describe('indemnity statistics', () => {
  const matches = [
    match('2026-10-18T09:00:00.000Z', 'COMPLETED', 'Anciens D2'),
    match('2026-11-14T12:30:00.000Z', 'COMPLETED', 'U14 D2'),
    match('2026-11-22T10:00:00.000Z', 'COMPLETED', 'Seniors D4'),
    match('2026-11-28T14:30:00.000Z', 'DRAFT', 'U14 D2'),
    match('2026-11-29T14:00:00.000Z', 'DRAFT', 'Seniors D4'),
    match('2026-12-06T10:00:00.000Z', 'DRAFT', 'Seniors D4'),
    match('2026-12-13T10:00:00.000Z', 'DRAFT', 'Coupe'),
    match('2026-11-08T10:00:00.000Z', 'CANCELED', 'Seniors D4'),
    match('2026-09-13T07:00:00.000Z', 'COMPLETED', 'Anciens D2'),
  ];
  const { months, season } = indemnityStats(matches, rates, now);

  it('splits previous, current and next month', () => {
    expect(months.previous).toMatchObject({ key: '2026-10', done: 1, earned: 30 });
    expect(months.current).toMatchObject({
      key: '2026-11',
      done: 2,
      earned: 65,
      planned: 2,
      expected: 65,
    });
    expect(months.next).toMatchObject({
      key: '2026-12',
      done: 0,
      planned: 2,
      expected: 40,
      unpriced: 1,
    });
  });

  it('summarises the season without counting canceled matches', () => {
    expect(season).toMatchObject({ label: '2026-2027', done: 4, planned: 4, earned: 125 });
    expect(season.average).toBeCloseTo(31.25);
    expect(season.byCategory[0]).toEqual({ category: 'ANCIENS D2', done: 2, earned: 60 });
  });
});

describe('month helpers', () => {
  it('rolls over years and seasons', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(seasonOf('2026-06')).toBe('2025-2026');
    expect(seasonOf('2026-07')).toBe('2026-2027');
  });
});
