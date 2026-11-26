import { matchIndemnity, indemnityCategory, monthKey, seasonOf } from './indemnities';
import { stageTiming } from './preparation-timing';
import { requiresCheckout } from './match';
import type { Match } from './types';

export interface Count {
  label: string;
  value: number;
}
const average = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const percent = (part: number, total: number) => (total ? Math.round((part / total) * 100) : null);
function ranking(labels: (string | undefined)[], limit = 5): Count[] {
  const counts = new Map<string, number>();
  for (const label of labels) if (label) counts.set(label, (counts.get(label) ?? 0) + 1);
  return [...counts]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'fr'))
    .slice(0, limit);
}

/** Statistiques de l’arbitre sur la saison en cours (juillet à juin) ou sur tout l’historique. */
export function refereeStats(
  matches: Match[],
  rates: Record<string, number>,
  period: 'season' | 'all',
  now = Date.now(),
  timezone = 'Europe/Paris',
) {
  const season = seasonOf(monthKey(now, timezone));
  const scoped =
    period === 'all'
      ? matches
      : matches.filter((m) => seasonOf(monthKey(m.kickoffAt, m.timezone)) === season);
  const played = scoped.filter((m) => m.status === 'COMPLETED');
  const timings = played.flatMap((m) =>
    m.template.steps
      .filter((s) => s.kind !== 'final')
      .flatMap((step) => {
        const timing = stageTiming(m, step);
        return timing ? [{ step, timing }] : [];
      }),
  );
  const arrivals = timings.filter((t) => t.step.kind === 'arrival');
  const late = timings.filter((t) => t.timing.state === 'late');
  const issues = played.flatMap((m) => m.issues);
  const complete = played.filter((m) =>
    m.template.steps.every((s) => s.kind === 'final' || m.runs[s.code]?.completedAt),
  );
  const preparation = played.flatMap((m) =>
    m.startedAt && m.closedAt ? [Date.parse(m.closedAt) - Date.parse(m.startedAt)] : [],
  );
  const amounts = played.flatMap((m) => {
    const amount = matchIndemnity(m, rates);
    return amount === null ? [] : [amount];
  });
  const payments = { CHECK: 'Chèque', CASH: 'Espèces', SPORTCASH: 'SPORTCASH' } as const;
  return {
    season,
    played: played.length,
    upcoming: scoped.filter(
      (m) => ['DRAFT', 'ACTIVE'].includes(m.status) && Date.parse(m.kickoffAt) > now,
    ).length,
    notPlayed: scoped.filter((m) => ['CANCELED', 'POSTPONED', 'OTHER'].includes(m.status)).length,
    punctuality: percent(timings.length - late.length, timings.length),
    arrivalOnTime: percent(
      arrivals.filter((t) => t.timing.state !== 'late').length,
      arrivals.length,
    ),
    averageDelay: average(late.map((t) => t.timing.minutes)),
    lateSteps: ranking(
      late.map((t) => t.step.title),
      3,
    ),
    averagePreparationMs: average(preparation),
    completeRate: percent(complete.length, played.length),
    issues: issues.length,
    openIssues: issues.filter((i) => i.status !== 'RESOLVED').length,
    topIssues: ranking(
      issues.map((i) => i.reason),
      3,
    ),
    earned: amounts.reduce((a, b) => a + b, 0),
    averageFee: average(amounts),
    payments: ranking(
      played.map((m) => (m.indemnity?.payment ? payments[m.indemnity.payment] : undefined)),
    ),
    categories: ranking(played.map(indemnityCategory)),
    stadiums: ranking(
      played.map((m) => m.stadium),
      3,
    ),
    months: ranking(
      played.map((m) => monthKey(m.kickoffAt, m.timezone)),
      Infinity,
    ).sort((a, b) => a.label.localeCompare(b.label)),
    /** Matchs joués dont il reste une action à faire. */
    toDo: {
      checkout: played.filter(requiresCheckout).length,
      indemnity: played.filter((m) => !m.indemnity?.payment).length,
      debrief: played.filter((m) => !m.debrief).length,
    },
  };
}
