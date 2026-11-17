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

/** Actual validation against the kickoff-relative plan; never against the time of viewing. */
export function stageTiming(match: Match, step: Match['template']['steps'][number]) {
  const planned = Date.parse(match.kickoffAt) + step.offset * 60000;
  const completedAt = match.runs[step.code]?.completedAt;
  const completed = completedAt ? Date.parse(completedAt) : NaN;
  if (!Number.isFinite(planned) || !Number.isFinite(completed)) return null;
  const deltaMs = completed - planned;
  // Symmetric rounding avoids treating +30 s and -30 s differently.
  const rounded = Math.round(Math.abs(deltaMs) / 60000);
  const minutes = rounded ? Math.sign(deltaMs) * rounded : 0;
  const state = minutes > 0 ? 'late' : minutes < 0 ? 'ahead' : 'on-time';
  return {
    plannedAt: new Date(planned).toISOString(),
    completedAt: new Date(completed).toISOString(),
    deltaMs,
    minutes,
    state,
    label: state === 'late' ? 'En retard' : state === 'ahead' ? 'En avance' : 'À l’heure',
    value: `${minutes > 0 ? '+' : minutes < 0 ? '−' : ''}${Math.abs(minutes)} min`,
  } as const;
}
