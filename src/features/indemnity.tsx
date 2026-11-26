'use client';
import { useState } from 'react';
import { Euro } from 'lucide-react';
import { useApp } from './app-provider';
import { Button, Notice, PageHeader } from '@/components/ui';
import {
  euro,
  indemnityRates,
  indemnityStats,
  matchIndemnity,
  type MonthIndemnities,
} from '@/domain/indemnities';
import type { Match, PaymentMethod } from '@/domain/types';

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

/** Page Indemnités : montants du mois précédent, du mois en cours et du mois suivant, et quelques repères. */
export function IndemnityScreen() {
  return (
    <>
      <PageHeader title="Indemnités" />
      <IndemnitySummary />
    </>
  );
}

function IndemnitySummary() {
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
          <Euro size={20} /> Saison {season.label}
        </h2>
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
          {count(unpriced, 'match', 'matchs')} sans montant. Saisissez-le dans la fiche du match,
          une fois celui-ci joué.
        </Notice>
      )}
    </section>
  );
}

const paymentLabels: Record<PaymentMethod, string> = {
  CHECK: 'Chèque',
  CASH: 'Espèces',
  SPORTCASH: 'SPORTCASH',
};

/** Saisie du montant et du mode de paiement d’un match. */
export function IndemnityForm({ match, onSaved }: { match: Match; onSaved?: () => void }) {
  const app = useApp();
  const suggested = matchIndemnity(match, indemnityRates(app.profile?.preferences.indemnityRates));
  const [value, setValue] = useState(suggested === null ? '' : String(suggested));
  const [payment, setPayment] = useState<PaymentMethod | ''>(match.indemnity?.payment ?? '');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const amount = Number(value.replace(',', '.'));
  return (
    <form
      className="form indemnity-form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!payment) return;
        setBusy(true);
        setError('');
        try {
          await app.dispatch(match.id, { type: 'INDEMNITY', amount, payment });
          onSaved?.();
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Enregistrement impossible.');
          setBusy(false);
        }
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
      <fieldset className="payment-choice">
        <legend>Mode de paiement</legend>
        {Object.entries(paymentLabels).map(([key, label]) => (
          <label key={key} className={payment === key ? 'selected' : ''}>
            <input
              type="radio"
              name="payment"
              required
              checked={payment === key}
              onChange={() => setPayment(key as PaymentMethod)}
            />
            {label}
          </label>
        ))}
      </fieldset>
      <Button type="submit" disabled={busy || !value.trim() || !Number.isFinite(amount)}>
        Enregistrer l’indemnité
      </Button>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </form>
  );
}

/** Fiche d’un match joué : saisie tant qu’elle manque, puis lecture seule. */
export function MatchIndemnity({ match }: { match: Match }) {
  const saved = match.indemnity;
  if (saved?.payment)
    return (
      <section className="panel indemnity-summary" aria-label="Indemnité">
        <Euro size={18} aria-hidden="true" />
        <span>Indemnité</span>
        <strong>{euro(saved.amount)}</strong>
        <span className="muted">{paymentLabels[saved.payment]}</span>
      </section>
    );
  return (
    <section className="panel match-indemnity">
      <h2>
        <Euro size={21} />
        Indemnité
      </h2>
      <IndemnityForm match={match} />
    </section>
  );
}
