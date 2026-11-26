'use client';
import { useState } from 'react';
import { PageHeader, Empty } from '@/components/ui';
import { useApp } from './app-provider';
import { refereeStats, type Count } from '@/domain/stats';
import { euro, indemnityRates } from '@/domain/indemnities';
import { duration } from '@/domain/journal';

const percent = (value: number | null) => (value === null ? '—' : `${value} %`);
const monthName = (key: string) =>
  new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${key}-01T00:00:00Z`),
  );

function Tiles({ items }: { items: [string, string | number][] }) {
  return (
    <dl className="stat-tiles">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
function Bars({ title, rows }: { title: string; rows: Count[] }) {
  if (!rows.length) return null;
  const max = Math.max(...rows.map((r) => r.value));
  return (
    <>
      <h3>{title}</h3>
      <ul className="stat-bars">
        {rows.map((row) => (
          <li key={row.label}>
            <span>{row.label}</span>
            <strong>{row.value}</strong>
            <i style={{ width: `${(row.value / max) * 100}%` }} aria-hidden="true" />
          </li>
        ))}
      </ul>
    </>
  );
}

export function StatsScreen() {
  const app = useApp();
  const [now] = useState(Date.now);
  const [period, setPeriod] = useState<'season' | 'all'>('season');
  const s = refereeStats(
    app.matches,
    indemnityRates(app.profile?.preferences.indemnityRates),
    period,
    now,
    app.profile?.preferences.timezone,
  );
  return (
    <div className="stats-page">
      <PageHeader title="Statistiques" />
      <div className="tabs stat-period">
        {(['season', 'all'] as const).map((key) => (
          <button
            key={key}
            aria-pressed={period === key}
            className={period === key ? 'selected' : ''}
            onClick={() => setPeriod(key)}
          >
            {key === 'season' ? `Saison ${s.season}` : 'Tout'}
          </button>
        ))}
      </div>
      <section className="panel">
        <h2>Activité</h2>
        <Tiles
          items={[
            ['Matchs arbitrés', s.played],
            ['À venir', s.upcoming],
            ['Reportés / annulés', s.notPlayed],
            ['Préparations complètes', percent(s.completeRate)],
          ]}
        />
        <Bars title="Par mois" rows={s.months.map((m) => ({ ...m, label: monthName(m.label) }))} />
      </section>
      {s.played === 0 ? (
        <Empty
          title="Pas encore de statistiques"
          description="Elles apparaîtront après votre premier match arbitré."
        />
      ) : (
        <>
          <section className="panel">
            <h2>Ponctualité</h2>
            <Tiles
              items={[
                ['Étapes dans les temps', percent(s.punctuality)],
                ['Arrivées à l’heure', percent(s.arrivalOnTime)],
                [
                  'Retard moyen',
                  s.averageDelay === null ? '—' : `${Math.round(s.averageDelay)} min`,
                ],
                [
                  'Durée de préparation',
                  s.averagePreparationMs === null ? '—' : duration(s.averagePreparationMs),
                ],
              ]}
            />
            <Bars title="Étapes le plus souvent en retard" rows={s.lateSteps} />
          </section>
          <section className="panel">
            <h2>Indemnités</h2>
            <Tiles
              items={[
                ['Total', euro(s.earned)],
                [
                  'Moyenne par match',
                  s.averageFee === null ? '—' : euro(Math.round(s.averageFee * 100) / 100),
                ],
              ]}
            />
            <Bars title="Modes de paiement" rows={s.payments} />
          </section>
          <section className="panel">
            <h2>Terrain</h2>
            <Tiles
              items={[
                ['Anomalies signalées', s.issues],
                ['Non résolues', s.openIssues],
              ]}
            />
            <Bars title="Anomalies fréquentes" rows={s.topIssues} />
            <Bars title="Catégories arbitrées" rows={s.categories} />
            <Bars title="Stades les plus fréquentés" rows={s.stadiums} />
          </section>
          <section className="panel">
            <h2>À compléter</h2>
            <Tiles
              items={[
                ['Check-out à faire', s.toDo.checkout],
                ['Indemnités à saisir', s.toDo.indemnity],
                ['Débriefs à faire', s.toDo.debrief],
              ]}
            />
          </section>
        </>
      )}
    </div>
  );
}
