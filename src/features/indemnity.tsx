'use client';
import { useState } from 'react';
import { Euro } from 'lucide-react';
import { useApp } from './app-provider';
import { Button, Notice, PageHeader, Empty } from '@/components/ui';
import {
  euro,
  indemnityCategory,
  monthKey,
  seasonOf,
  indemnityRates,
  indemnityStats,
  matchIndemnity,
  type MonthIndemnities,
} from '@/domain/indemnities';
import type { Match, PaymentMethod } from '@/domain/types';

const paymentLabels: Record<PaymentMethod, string> = {
  CHECK: 'Chèque',
  CASH: 'Espèces',
  SPORTCASH: 'SPORTCASH',
};

const monthName = (key: string, style: 'long' | 'short' = 'long') =>
  new Intl.DateTimeFormat('fr-FR', { month: style, timeZone: 'UTC' }).format(
    new Date(`${key}-01T00:00:00Z`),
  );
const count = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;
const roundedEuro = (amount: number) => euro(Math.round(amount * 100) / 100);

function MonthTile({ month, future }: { month: MonthIndemnities; future?: boolean }) {
  const matches = future ? month.planned : month.done;
  return (
    <li>
      <span>{monthName(month.key)}</span>
      <strong>{euro(future ? month.expected : month.earned)}</strong>
      <small>{count(matches, future ? 'prévu' : 'joué')}</small>
      {!future && month.expected > 0 && (
        <small className="fee-expected">+ {euro(month.expected)} à venir</small>
      )}
    </li>
  );
}

/** Page Indemnités : total de la saison, trois mois, répartition et détail match par match. */
export function IndemnityScreen() {
  const app = useApp();
  const [now] = useState(Date.now);
  const rates = indemnityRates(app.profile?.preferences.indemnityRates);
  const timezone = app.profile?.preferences.timezone;
  const { months, season } = indemnityStats(app.matches, rates, now, timezone);
  const history = app.matches
    .filter((m) => m.status === 'COMPLETED')
    .sort((a, b) => Date.parse(b.kickoffAt) - Date.parse(a.kickoffAt));
  const played = history.filter(
    (m) => seasonOf(monthKey(m.kickoffAt, m.timezone)) === season.label,
  );
  const toEnter = history.filter((m) => !m.indemnity?.payment).length;
  const byPayment = Object.entries(paymentLabels).map(([key, label]) => ({
    label,
    amount: played.reduce(
      (sum, m) => sum + (m.indemnity?.payment === key ? m.indemnity.amount : 0),
      0,
    ),
  }));
  const groups = new Map<string, Match[]>();
  for (const match of history) {
    const key = monthKey(match.kickoffAt, match.timezone);
    groups.set(key, [...(groups.get(key) ?? []), match]);
  }
  const maxCategory = Math.max(1, ...season.byCategory.map((row) => row.earned));
  return (
    <div className="fee-page">
      <PageHeader title="Indemnités" />
      <section className="fee-total" aria-label={`Saison ${season.label}`}>
        <span>Saison {season.label}</span>
        <strong>{euro(season.earned)}</strong>
        <p>
          {count(season.done, 'match arbitré', 'matchs arbitrés')}
          {season.average !== null && ` · ${roundedEuro(season.average)} en moyenne`}
        </p>
      </section>
      <ul className="fee-months">
        <MonthTile month={months.previous} />
        <MonthTile month={months.current} />
        <MonthTile month={months.next} future />
      </ul>
      {toEnter > 0 && (
        <Notice>
          {count(toEnter, 'match', 'matchs')} à compléter (montant ou mode de paiement). Touchez le
          match ci-dessous.
        </Notice>
      )}
      {history.length === 0 ? (
        <Empty
          title="Aucune indemnité pour l’instant"
          description="Vos montants apparaîtront après votre premier match arbitré."
        />
      ) : (
        <>
          <section className="panel">
            <h2>Historique des matchs</h2>
            {[...groups].map(([key, matches]) => (
              <div key={key} className="fee-group">
                <h3>
                  <span>
                    {monthName(key)} {key.slice(0, 4)}
                  </span>
                  <span>
                    {euro(matches.reduce((sum, m) => sum + (matchIndemnity(m, rates) ?? 0), 0))}
                  </span>
                </h3>
                <ul>
                  {matches.map((match) => {
                    const amount = matchIndemnity(match, rates);
                    const payment = match.indemnity?.payment;
                    return (
                      <li key={match.id}>
                        <button type="button" onClick={() => app.setActiveId(match.id)}>
                          <span className="fee-day">
                            {new Intl.DateTimeFormat('fr-FR', {
                              day: '2-digit',
                              timeZone: match.timezone,
                            }).format(new Date(match.kickoffAt))}
                          </span>
                          <span className="fee-match">
                            <strong>
                              {match.homeTeam} – {match.awayTeam}
                            </strong>
                            <small>{indemnityCategory(match)}</small>
                          </span>
                          <span className="fee-amount">
                            <strong>{amount === null ? '—' : euro(amount)}</strong>
                            <small className={payment ? '' : 'missing'}>
                              {payment ? paymentLabels[payment] : 'À saisir'}
                            </small>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </section>
          <section className="panel">
            <h2>Par catégorie · saison</h2>
            <ul className="stat-bars">
              {season.byCategory.map((row) => (
                <li key={row.category}>
                  <span>
                    {row.category} · {count(row.done, 'match')}
                  </span>
                  <strong>{euro(row.earned)}</strong>
                  <i style={{ width: `${(row.earned / maxCategory) * 100}%` }} aria-hidden="true" />
                </li>
              ))}
            </ul>
          </section>
          <section className="panel">
            <h2>Paiements · saison</h2>
            <dl className="stat-tiles">
              {byPayment.map((row) => (
                <div key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{euro(row.amount)}</dd>
                </div>
              ))}
            </dl>
          </section>
        </>
      )}
    </div>
  );
}

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
