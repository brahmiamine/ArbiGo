'use client';
import { useState } from 'react';
import { Euro } from 'lucide-react';
import { useApp } from './app-provider';
import { Button, Notice } from '@/components/ui';
import {
  euro,
  indemnityCategory,
  indemnityRates,
  indemnityStats,
  matchIndemnity,
  type MonthIndemnities,
} from '@/domain/indemnities';
import type { Match } from '@/domain/types';

const monthName = (key: string, style: 'long' | 'short' = 'long') =>
  new Intl.DateTimeFormat('fr-FR', { month: style, year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${key}-01T00:00:00Z`),
  );
const count = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;

function MonthColumn({
  month,
  title,
  future,
}: {
  month: MonthIndemnities;
  title: string;
  future?: boolean;
}) {
  const amount = future ? month.expected : month.earned;
  return (
    <div className={`indemnity-month${title === 'Ce mois-ci' ? ' current' : ''}`}>
      <span className="eyebrow">{title}</span>
      <strong>{euro(amount)}</strong>
      <small>{monthName(month.key)}</small>
      <p>
        {future
          ? month.planned
            ? `${count(month.planned, 'match prévu', 'matchs prévus')}`
            : 'Aucun match prévu'
          : `${count(month.done, 'match joué', 'matchs joués')}`}
        {!future && month.planned > 0 && (
          <>
            {' '}
            · {euro(month.expected)} à venir ({month.planned})
          </>
        )}
      </p>
    </div>
  );
}

/** Accueil : indemnités du mois précédent, du mois en cours et du mois suivant, et quelques repères. */
export function IndemnityCard() {
  const app = useApp();
  const [now] = useState(Date.now);
  const rates = indemnityRates(app.profile?.preferences.indemnityRates);
  const { months, season } = indemnityStats(
    app.matches,
    rates,
    now,
    app.profile?.preferences.timezone,
  );
  const unpriced = months.previous.unpriced + months.current.unpriced + months.next.unpriced;
  const thisMonth = months.current.done + months.current.planned;
  return (
    <section className="panel indemnity-card" aria-labelledby="indemnity-title">
      <div className="section-heading">
        <h2 id="indemnity-title">
          <Euro size={20} /> Mes indemnités
        </h2>
        <span className="eyebrow">Saison {season.label}</span>
      </div>
      <div className="indemnity-months">
        <MonthColumn month={months.previous} title="Mois précédent" />
        <MonthColumn month={months.current} title="Ce mois-ci" />
        <MonthColumn month={months.next} title="Mois suivant" future />
      </div>
      <dl className="indemnity-facts">
        <div>
          <dt>Matchs ce mois-ci</dt>
          <dd>{thisMonth}</dd>
        </div>
        <div>
          <dt>Matchs arbitrés (saison)</dt>
          <dd>{season.done}</dd>
        </div>
        <div>
          <dt>Total de la saison</dt>
          <dd>{euro(season.earned)}</dd>
        </div>
        <div>
          <dt>Moyenne par match</dt>
          <dd>{season.average === null ? '—' : euro(season.average)}</dd>
        </div>
      </dl>
      {season.byCategory.length > 0 && (
        <ul className="indemnity-categories" aria-label="Matchs arbitrés par catégorie">
          {season.byCategory.map((row) => (
            <li key={row.category}>
              <span>{row.category}</span>
              <strong>{row.done}</strong>
            </li>
          ))}
        </ul>
      )}
      {unpriced > 0 && (
        <Notice>
          {count(unpriced, 'match', 'matchs')} sans tarif.{' '}
          <button className="text-button" onClick={() => app.setTab('profile')}>
            Renseigner mes tarifs
          </button>{' '}
          (Profil › Matches › Mes indemnités).
        </Notice>
      )}
    </section>
  );
}

/** Fiche d’un match joué : montant retenu, modifiable pour ce seul match. */
export function MatchIndemnity({ match }: { match: Match }) {
  const app = useApp();
  const rates = indemnityRates(app.profile?.preferences.indemnityRates);
  const category = indemnityCategory(match);
  const current = matchIndemnity(match, rates);
  const [value, setValue] = useState(current === null ? '' : String(current));
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function save(amount: number | null) {
    setBusy(true);
    setError('');
    try {
      await app.dispatch(match.id, { type: 'INDEMNITY', amount });
      const next = amount ?? rates[category];
      setValue(next === undefined ? '' : String(next));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible.');
    } finally {
      setBusy(false);
    }
  }
  const amount = Number(value.replace(',', '.'));
  return (
    <section className="panel match-indemnity">
      <h2>
        <Euro size={21} />
        Indemnité
      </h2>
      <p className="muted">
        Catégorie <strong>{category}</strong> ·{' '}
        {match.indemnity
          ? 'montant propre à ce match'
          : rates[category] === undefined
            ? 'aucun tarif défini'
            : `tarif par défaut ${euro(rates[category])}`}
      </p>
      <form
        className="form indemnity-form"
        onSubmit={(event) => {
          event.preventDefault();
          void save(amount);
        }}
      >
        <label>
          Montant (€)
          <input
            inputMode="decimal"
            pattern="[0-9]+([.,][0-9]{1,2})?"
            maxLength={7}
            required
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </label>
        <Button type="submit" disabled={busy || !value.trim() || !Number.isFinite(amount)}>
          Enregistrer
        </Button>
        {match.indemnity && (
          <Button type="button" variant="ghost" disabled={busy} onClick={() => void save(null)}>
            Revenir au tarif de la catégorie
          </Button>
        )}
      </form>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </section>
  );
}
