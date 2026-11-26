import { AlertTriangle, Check, Flag, Play, StickyNote, XCircle } from 'lucide-react';
import { buildJournal, duration, journalSummary, type JournalEntry } from '@/domain/journal';
import { formatTime } from '@/domain/time';
import type { Match } from '@/domain/types';
import type { ReactNode } from 'react';
import { Notice } from '@/components/ui';
import { ArrivalPosition } from '../tunnel/arrival-position';

const icons: Record<JournalEntry['kind'], typeof Check> = {
  start: Play,
  step: Check,
  issue: AlertTriangle,
  resolved: Check,
  kickoff: Flag,
  closed: XCircle,
  after: StickyNote,
};

/** Bilan et journal d’une rencontre passée, réunis dans une seule carte. */
export function Journal({ match, children }: { match: Match; children?: ReactNode }) {
  const entries = buildJournal(match);
  const summary = journalSummary(match);
  const open = match.issues.filter((issue) => issue.status !== 'RESOLVED');
  return (
    <section className="panel journal">
      <h2>
        <Flag size={21} />
        Bilan du match
      </h2>
      {match.closedAt && (
        <p className="muted">Clôturée le {new Date(match.closedAt).toLocaleString('fr-FR')}</p>
      )}
      {match.closeComment && <Notice>{match.closeComment}</Notice>}
      {match.arrivalPosition && <ArrivalPosition position={match.arrivalPosition} />}
      <dl className="journal-summary">
        <div>
          <dt>Préparation</dt>
          <dd>{summary.preparationMs === null ? '—' : duration(summary.preparationMs)}</dd>
        </div>
        <div>
          <dt>Étapes validées</dt>
          <dd>
            {summary.done}/{summary.total}
          </dd>
        </div>
        <div className={summary.late ? 'late' : ''}>
          <dt>En retard</dt>
          <dd>{summary.late}</dd>
        </div>
        <div className={summary.issues ? 'late' : ''}>
          <dt>Anomalies</dt>
          <dd>{summary.issues}</dd>
        </div>
      </dl>
      {summary.worst && (
        <p className="journal-highlight">
          Plus gros retard : <strong>{summary.worst.step.title}</strong> (
          {summary.worst.timing.value})
        </p>
      )}
      {summary.missed.length > 0 && (
        <p className="journal-highlight">Non validées : {summary.missed.join(', ')}</p>
      )}
      {open.length > 0 && (
        <p className="journal-highlight">{open.length} anomalie(s) restée(s) ouverte(s).</p>
      )}
      <h3>Journal des événements</h3>
      {entries.length === 0 && <p className="muted">Aucun événement enregistré.</p>}
      <ol className="timeline">
        {entries.map((entry, index) => {
          const Icon = icons[entry.kind];
          const tone = entry.kind === 'issue' ? 'late' : (entry.timing?.state ?? '');
          return (
            <li key={`${entry.at}-${index}`} className={tone}>
              <span className="timeline-icon">
                <Icon size={14} aria-hidden="true" />
              </span>
              <div>
                <p className="timeline-head">
                  <time dateTime={entry.at}>{formatTime(entry.at, match.timezone)}</time>
                  <strong>{entry.title}</strong>
                </p>
                {entry.timing && (
                  <p className="timeline-timing">
                    <span className={`timeline-chip ${entry.timing.state}`}>
                      {entry.timing.label}
                      {entry.timing.state !== 'on-time' && ` · ${entry.timing.value}`}
                    </span>
                    <span>prévu {formatTime(entry.timing.plannedAt, match.timezone)}</span>
                  </p>
                )}
                {entry.details.map((detail) => (
                  <p key={detail}>{detail}</p>
                ))}
                {entry.sinceMs !== undefined && (
                  <p className="timeline-since">+ {duration(entry.sinceMs)} depuis le précédent</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {children}
    </section>
  );
}
