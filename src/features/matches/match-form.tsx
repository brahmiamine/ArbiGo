'use client';
import { useState, type FormEvent } from 'react';
import { useApp } from '../app-provider';
import { Button, Notice } from '@/components/ui';
import { updateDraft } from './update-draft';
import { parseLocalKickoff, localDateParts } from '@/domain/time';
import { practiceLabels } from '@/domain/templates';
import type { Practice, Match, MatchInput } from '@/domain/types';
export function MatchForm({ onDone, initial }: { onDone: () => void; initial?: Match }) {
  const app = useApp();
  const { create, setError } = app;
  const local = initial ? localDateParts(initial.kickoffAt, initial.timezone) : undefined;
  const [busy, setBusy] = useState(false),
    [practice, setPractice] = useState<Practice>(initial?.practice ?? 'FOOT_11'),
    [failure, setFailure] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setFailure('');
    const d = new FormData(e.currentTarget);
    try {
      const input: MatchInput = {
        homeTeam: String(d.get('homeTeam')),
        awayTeam: String(d.get('awayTeam')),
        kickoffAt: parseLocalKickoff(String(d.get('date')), String(d.get('time')), 'Europe/Paris'),
        timezone: 'Europe/Paris',
        practice,
        stadium: String(d.get('stadium') ?? ''),
        competition: String(d.get('competition') ?? ''),
        category: String(d.get('category') ?? ''),
      };
      if (initial) {
        await updateDraft(initial, input, app.inventory, app.store!, app.demo);
        await app.refresh();
      } else await create(input);
      onDone();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Création impossible';
      setFailure(message);
      setError('');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="form">
      <p className="muted">Une rencontre, un sac et un parcours qui vous sont propres.</p>
      <datalist id="old-teams">
        {[...new Set(app.matches.flatMap((m) => [m.homeTeam, m.awayTeam]))].map((team) => (
          <option key={team}>{team}</option>
        ))}
      </datalist>
      <div className="field">
        <span>Pratique</span>
        <div className="segmented">
          {Object.entries(practiceLabels).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={value === practice}
              className={value === practice ? 'selected' : ''}
              onClick={() => setPractice(value as Practice)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="form-grid">
        <label>
          Équipe domicile
          <input
            name="homeTeam"
            defaultValue={initial?.homeTeam}
            list="old-teams"
            autoComplete="off"
            maxLength={100}
            required
            placeholder="Paris 13 Atletico"
          />
        </label>
        <label>
          Équipe visiteuse
          <input
            name="awayTeam"
            defaultValue={initial?.awayTeam}
            list="old-teams"
            autoComplete="off"
            maxLength={100}
            required
            placeholder="FC Belleville"
          />
        </label>
        <label>
          Date
          <input type="date" name="date" defaultValue={local?.date} required />
        </label>
        <label>
          Coup d’envoi · heure de Paris
          <input type="time" name="time" defaultValue={local?.time ?? '15:00'} required />
        </label>
      </div>
      <label>
        Stade <span className="optional">facultatif</span>
        <input
          name="stadium"
          defaultValue={initial?.stadium}
          maxLength={200}
          placeholder="Nom du stade"
        />
      </label>
      <div className="form-grid">
        <label>
          Compétition <span className="optional">facultatif</span>
          <input
            name="competition"
            defaultValue={initial?.competition}
            list="competitions"
            maxLength={100}
          />
          <datalist id="competitions">
            <option>Championnat D4</option>
            <option>Coupe</option>
            <option>Amical</option>
          </datalist>
        </label>
        <label>
          Catégorie <span className="optional">facultatif</span>
          <input
            name="category"
            defaultValue={initial?.category}
            list="categories"
            maxLength={100}
          />
          <datalist id="categories">
            <option>Seniors</option>
            <option>U18</option>
            <option>U16</option>
            <option>U13</option>
          </datalist>
        </label>
      </div>
      <Notice>
        Les parcours sont des aides de préparation. Leur validation documentaire pour la saison et
        la compétition reste à effectuer avant lancement officiel.
      </Notice>
      {failure && (
        <p className="form-error" role="alert">
          {failure}
        </p>
      )}
      <Button disabled={busy} type="submit">
        {busy ? 'Enregistrement…' : initial ? 'Enregistrer la rencontre' : 'Créer la rencontre'}
      </Button>
    </form>
  );
}
