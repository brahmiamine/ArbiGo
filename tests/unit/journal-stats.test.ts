import { describe, expect, it } from 'vitest';
import { createMatch } from '@/domain/match';
import { buildJournal, duration, journalSummary } from '@/domain/journal';
import { refereeStats } from '@/domain/stats';
import { defaultEquipment } from '@/domain/equipment';
import { templates } from '@/domain/templates';
import type { Match } from '@/domain/types';

const base = createMatch(
  {
    homeTeam: 'A',
    awayTeam: 'B',
    kickoffAt: '2026-11-22T14:00:00.000Z',
    timezone: 'Europe/Paris',
    practice: 'FOOT_11',
    stadium: 'Stade X',
  },
  defaultEquipment(),
  templates.FOOT_11,
);
const arrival = base.template.steps.find((s) => s.kind === 'arrival')!;
const planned = Date.parse(base.kickoffAt) + arrival.offset * 60000;
const played: Match = {
  ...base,
  status: 'COMPLETED',
  startedAt: new Date(planned).toISOString(),
  closedAt: base.kickoffAt,
  indemnity: { amount: 40, payment: 'CASH' },
  runs: {
    ...base.runs,
    [arrival.code]: { answers: {}, completedAt: new Date(planned + 7 * 60000).toISOString() },
  },
};

describe('journal', () => {
  it('tells the delay and time between milestones', () => {
    const entries = buildJournal(played);
    expect(entries.map((e) => e.kind)).toEqual(['start', 'step', 'kickoff']);
    expect(entries[1].timing).toMatchObject({ state: 'late', minutes: 7 });
    expect(entries[1].sinceMs).toBe(7 * 60000);
    expect(journalSummary(played)).toMatchObject({ done: 1, late: 1 });
    expect(duration(95 * 60000)).toBe('1 h 35');
  });
});

describe('statistics', () => {
  it('summarises played matches only', () => {
    const stats = refereeStats(
      [played, { ...base, id: 'draft' }],
      {},
      'season',
      Date.parse('2026-11-26T10:00:00Z'),
    );
    expect(stats).toMatchObject({ played: 1, punctuality: 0, earned: 40, upcoming: 0 });
    expect(stats.payments).toEqual([{ label: 'Espèces', value: 1 }]);
    expect(stats.stadiums).toEqual([{ label: 'Stade X', value: 1 }]);
  });
});
