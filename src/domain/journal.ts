import { stageTiming } from './preparation-timing';
import type { Match } from './types';

export interface JournalEntry {
  at: string;
  kind: 'start' | 'step' | 'issue' | 'resolved' | 'kickoff' | 'closed' | 'after';
  title: string;
  details: string[];
  timing?: NonNullable<ReturnType<typeof stageTiming>>;
  /** Temps écoulé depuis le repère précédent de la préparation. */
  sinceMs?: number;
}

export function duration(ms: number) {
  const minutes = Math.round(Math.max(0, ms) / 60000);
  if (minutes < 1) return 'moins d’1 min';
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`;
}

const warmupMs = (match: Match) =>
  match.warmup.reduce(
    (sum, p) =>
      p.startedAt && p.endedAt
        ? sum + Math.max(0, Date.parse(p.endedAt) - Date.parse(p.startedAt) - p.pausedMs)
        : sum,
    0,
  );

function stepDetails(match: Match, step: Match['template']['steps'][number]) {
  const details: string[] = [];
  const answers = Object.values(match.runs[step.code].answers);
  if (step.controls.length) {
    const count = (value: string) => answers.filter((a) => a.value === value).length;
    details.push(
      [
        `${count('OK')}/${step.controls.length} contrôles OK`,
        count('PROBLEM') && `${count('PROBLEM')} problème(s)`,
        count('NA') && `${count('NA')} sans objet`,
      ]
        .filter(Boolean)
        .join(' · '),
    );
  }
  const rooms = match.lockerRooms;
  if (step.code === 'referee-locker' && rooms?.referee) details.push(`Vestiaire ${rooms.referee}`);
  if (step.code === 'team-lockers' && rooms?.home && rooms.away)
    details.push(`${match.homeTeam} : ${rooms.home} · ${match.awayTeam} : ${rooms.away}`);
  if (step.kind === 'warmup' && warmupMs(match))
    details.push(`Échauffement effectif : ${duration(warmupMs(match))}`);
  if (step.kind === 'arrival' && match.arrivalPosition)
    details.push(`Position GPS relevée (± ${match.arrivalPosition.accuracy} m)`);
  return details;
}

/** Récit chronologique d’une rencontre, reconstruit depuis son état (disponible hors ligne). */
export function buildJournal(match: Match): JournalEntry[] {
  const entries: JournalEntry[] = [];
  if (match.startedAt)
    entries.push({
      at: match.startedAt,
      kind: 'start',
      title: 'Préparation démarrée',
      details: [
        `${duration(Date.parse(match.kickoffAt) - Date.parse(match.startedAt))} avant l’heure du match`,
      ],
    });
  for (const step of match.template.steps) {
    const at = match.runs[step.code]?.completedAt;
    if (!at || step.kind === 'final') continue;
    entries.push({
      at,
      kind: 'step',
      title: step.title,
      details: stepDetails(match, step),
      timing: stageTiming(match, step) ?? undefined,
    });
  }
  for (const issue of match.issues) {
    const step = match.template.steps.find((s) => s.code === issue.stepCode);
    entries.push({
      at: issue.createdAt,
      kind: 'issue',
      title: `${issue.critical ? 'Anomalie de sécurité' : 'Anomalie'} : ${issue.reason}`,
      details: [step?.title, issue.comment].filter((v): v is string => !!v),
    });
    if (issue.resolvedAt)
      entries.push({
        at: issue.resolvedAt,
        kind: 'resolved',
        title: `Anomalie résolue : ${issue.reason}`,
        details: [
          `Résolue en ${duration(Date.parse(issue.resolvedAt) - Date.parse(issue.createdAt))}`,
        ],
      });
  }
  if (match.closedAt) {
    if (match.status === 'COMPLETED') {
      const delta = Date.parse(match.closedAt) - Date.parse(match.kickoffAt);
      entries.push({
        at: match.closedAt,
        kind: 'kickoff',
        title: 'Coup d’envoi confirmé',
        details: [
          Math.abs(delta) < 60000
            ? 'À l’heure prévue'
            : `${duration(Math.abs(delta))} ${delta > 0 ? 'après' : 'avant'} l’heure prévue`,
        ],
      });
    } else
      entries.push({
        at: match.closedAt,
        kind: 'closed',
        title: 'Rencontre non débutée',
        details: match.closeComment ? [match.closeComment] : [],
      });
  }
  if (match.checkout?.completedAt)
    entries.push({
      at: match.checkout.completedAt,
      kind: 'after',
      title: 'Check-out SPORTCASH confirmé',
      details: [],
    });
  if (match.finishedAt)
    entries.push({ at: match.finishedAt, kind: 'after', title: 'Match terminé', details: [] });
  for (const note of match.notes)
    entries.push({ at: note.at, kind: 'after', title: 'Note ajoutée', details: [note.content] });
  entries.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  let previous: string | undefined;
  for (const entry of entries) {
    if (!['start', 'step', 'kickoff'].includes(entry.kind)) continue;
    if (previous) entry.sinceMs = Date.parse(entry.at) - Date.parse(previous);
    previous = entry.at;
  }
  return entries;
}

export function journalSummary(match: Match) {
  const steps = match.template.steps.filter((s) => s.kind !== 'final');
  const timed = steps.flatMap((step) => {
    const timing = stageTiming(match, step);
    return timing ? [{ step, timing }] : [];
  });
  const late = timed.filter((t) => t.timing.state === 'late');
  return {
    preparationMs:
      match.startedAt && match.closedAt
        ? Date.parse(match.closedAt) - Date.parse(match.startedAt)
        : null,
    done: steps.filter((s) => match.runs[s.code]?.completedAt).length,
    total: steps.length,
    late: late.length,
    worst: late.sort((a, b) => b.timing.minutes - a.timing.minutes)[0],
    issues: match.issues.length,
    missed: steps.filter((s) => !match.runs[s.code]?.completedAt).map((s) => s.title),
  };
}
