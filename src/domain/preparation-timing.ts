import type { Match } from './types';
import { activeStage } from './match';
import { scheduledAt } from './time';

// Validation, rather than the card being browsed, determines progress against the schedule.
export function preparationTiming(match: Match, now: number) {
  const { active, next } = activeStage(match);
  const kickoff = Date.parse(match.kickoffAt);
  const due = Math.min(kickoff, Date.parse(scheduledAt(match.kickoffAt, active.offset)));
  const delta = due - now;
  const state = delta > 60000 ? 'ahead' : delta < -60000 ? 'late' : 'on-time';
  const nextAt = Math.min(kickoff, Date.parse(scheduledAt(match.kickoffAt, next.offset)));
  return {
    state,
    label: state === 'ahead' ? 'En avance' : state === 'late' ? 'En retard' : 'À l’heure',
    nextAt: new Date(nextAt).toISOString(),
    nextLabel: nextAt === kickoff ? 'COUP D’ENVOI' : 'PROCHAINE ÉTAPE',
  } as const;
}
