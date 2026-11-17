import { expect, it } from 'vitest';
import { kickoffCountdown } from '@/domain/time';

const now = Date.parse('2026-11-17T12:00:00Z');
it('formats days and a full hour/minute/second countdown without time-zone dependence', () => {
  expect(kickoffCountdown('2026-11-19T15:04:05Z', now)).toBe('2 j 03:04:05');
  expect(kickoffCountdown('2026-11-19T16:04:05+01:00', now)).toBe('2 j 03:04:05');
  expect(kickoffCountdown('2026-11-17T12:04:05Z', now)).toBe('00:04:05');
  expect(kickoffCountdown('2026-11-18T12:00:00Z', now)).toBe('1 j 00:00:00');
});
it('keeps the last partial second visible and stops at zero at or after the scheduled kickoff', () => {
  expect(kickoffCountdown('2026-11-17T12:00:00.500Z', now)).toBe('00:00:01');
  expect(kickoffCountdown('2026-11-17T12:00:00Z', now)).toBe('00:00:00');
  expect(kickoffCountdown('2026-11-16T12:00:00Z', now)).toBe('00:00:00');
});
