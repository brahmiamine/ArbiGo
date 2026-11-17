import { expect, it } from 'vitest';
import { shouldNotify } from '@/server/notifications';
import { createMatch, applyOperation } from '@/domain/match';
import { templates } from '@/domain/templates';
it('does not notify finished steps or closed matches', () => {
  const m = createMatch(
    {
      homeTeam: 'A',
      awayTeam: 'B',
      practice: 'FOOT_11',
      kickoffAt: '2026-12-01T14:00:00Z',
      timezone: 'Europe/Paris',
    },
    [],
    templates.FOOT_11,
  );
  expect(shouldNotify(m, 'pitch', 'DUE')).toBe(false);
  const active = applyOperation(m, {
    id: 'a',
    matchId: m.id,
    deviceId: 'a',
    fencingVersion: 0,
    expectedVersion: 0,
    occurredAt: '2026-12-01T13:00:00Z',
    action: { type: 'START' },
  });
  expect(shouldNotify(active, 'pitch', 'DUE')).toBe(true);
  active.runs.pitch.completedAt = '2026-12-01T13:00:00Z';
  expect(shouldNotify(active, 'pitch', 'DUE')).toBe(false);
  active.status = 'CANCELED';
  expect(shouldNotify(active, 'arrival', 'DUE')).toBe(false);
});
