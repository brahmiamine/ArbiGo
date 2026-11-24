import type { ReactNode } from 'react';
import { CalendarDays, Clock3, MapPin } from 'lucide-react';
import { TeamIdentity } from '@/components/team-identity';
import { formatTime } from '@/domain/time';
import type { Match } from '@/domain/types';
const dateLabel = (m: Match) =>
  new Intl.DateTimeFormat('fr-FR', {
    timeZone: m.timezone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(m.kickoffAt));
export function MatchHero({
  match: m,
  badge,
  children,
}: {
  match: Match;
  badge?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="detail-hero">
      {badge && <div className="detail-hero-badge">{badge}</div>}
      <h1 className="detail-hero-teams">
        <TeamIdentity name={m.homeTeam} logoId={m.homeLogoId} />
        <span className="detail-hero-vs" aria-label="contre">
          VS
        </span>
        <TeamIdentity name={m.awayTeam} logoId={m.awayLogoId} />
      </h1>
      <p className="detail-hero-meta">
        <span>
          <CalendarDays size={15} aria-hidden="true" />
          {dateLabel(m)}
        </span>
        <span>
          <Clock3 size={15} aria-hidden="true" />
          {formatTime(m.kickoffAt, m.timezone)}
        </span>
        {m.stadium && (
          <span>
            <MapPin size={15} aria-hidden="true" />
            {m.stadium}
          </span>
        )}
      </p>
      {children && <div className="detail-hero-actions">{children}</div>}
    </header>
  );
}
