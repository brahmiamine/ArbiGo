'use client';
import { useState, type FormEvent } from 'react';
import { useApp } from '../app-provider';
import { Button, Progress } from '@/components/ui';
import { FileDropzone } from '@/components/file-dropzone';
import { updateDraft } from './update-draft';
import { parseLocalKickoff, localDateParts } from '@/domain/time';
import type { Match, MatchInput } from '@/domain/types';
import { useMatchDesignation } from './designation/use-match-designation';
import { WeatherLocationPicker } from './weather-location-picker';
import { TeamLogoInput } from './team-logo-input';
import { saveTeamLogo, type TeamLogoDraft } from './team-logo-files';

export function MatchForm({ onDone, initial }: { onDone: () => void; initial?: Match }) {
  const app = useApp();
  const local = initial ? localDateParts(initial.kickoffAt, initial.timezone) : undefined;
  const [fields, setFields] = useState({
    homeTeam: initial?.homeTeam ?? '',
    awayTeam: initial?.awayTeam ?? '',
    date: local?.date ?? '',
    time: local?.time ?? '15:00',
    stadium: initial?.stadium ?? '',
    competition: initial?.competition ?? '',
    category: initial?.category ?? '',
  });
  const [weatherLocation, setWeatherLocation] = useState(initial?.weatherLocation);
  const [designation, setDesignation] = useState<MatchInput['designation']>(initial?.designation);
  const [homeLogo, setHomeLogo] = useState<TeamLogoDraft>({ id: initial?.homeLogoId });
  const [awayLogo, setAwayLogo] = useState<TeamLogoDraft>({ id: initial?.awayLogoId });
  const [busy, setBusy] = useState(false),
    [failure, setFailure] = useState('');
  const ocr = useMatchDesignation(({ fields: detected, logos }) => {
    setFields((current) => ({
      ...current,
      ...Object.fromEntries(
        Object.entries(detected).filter(([key, value]) => key in current && !!value),
      ),
    }));
    setDesignation((current) => ({
      ...current,
      ...Object.fromEntries(
        Object.entries(detected).filter(
          ([key, value]) =>
            ['matchNumber', 'referee', 'assistant1', 'assistant2'].includes(key) && !!value,
        ),
      ),
    }));
    for (const [side, update] of [
      ['home', setHomeLogo],
      ['away', setAwayLogo],
    ] as const) {
      update((current) =>
        current.source === 'manual' || current.id
          ? current
          : logos[side]
            ? { file: logos[side], source: 'automatic' }
            : {},
      );
    }
  });
  const disabled = busy || ocr.busy;
  const change = (key: keyof typeof fields, value: string) =>
    setFields((current) => ({ ...current, [key]: value }));
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (disabled) return;
    setBusy(true);
    setFailure('');
    try {
      if (!app.store) throw new Error('Le formulaire n’est pas encore prêt. Réessayez.');
      const kickoffAt = parseLocalKickoff(
        fields.date,
        fields.time,
        initial?.timezone ?? 'Europe/Paris',
      );
      const homeLogoId = await saveTeamLogo(homeLogo, app.store, app.demo);
      setHomeLogo((current) => ({ id: homeLogoId, source: current.source }));
      const awayLogoId = await saveTeamLogo(awayLogo, app.store, app.demo);
      setAwayLogo((current) => ({ id: awayLogoId, source: current.source }));
      const input: MatchInput = {
        ...fields,
        weatherLocation,
        homeLogoId,
        awayLogoId,
        designation,
        kickoffAt,
        timezone: initial?.timezone ?? 'Europe/Paris',
        practice: initial?.practice ?? 'FOOT_11',
      };
      if (initial) {
        await updateDraft(initial, input, app.inventory, app.store, app.demo);
        await app.refresh();
      } else await app.create(input);
      onDone();
    } catch (err) {
      setFailure(err instanceof Error ? err.message : 'Création impossible');
      app.setError('');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="form match-form">
      <p className="muted">Une rencontre, un sac et un parcours qui vous sont propres.</p>
      <section className="match-designation-import" aria-label="Importer une désignation">
        <FileDropzone
          label="Lire une désignation depuis une image"
          onFile={ocr.read}
          disabled={disabled}
          hint="Capture ou photo · lecture sur cet appareil · noms, date, heure et logos si repérables"
        />
        {ocr.status && <p role={ocr.failed ? 'alert' : 'status'}>{ocr.status}</p>}
        {ocr.busy && <Progress value={ocr.progress} label="Lecture de la désignation" />}
        {ocr.failed && (
          <Button type="button" variant="secondary" onClick={() => void ocr.retry()}>
            Réessayer la lecture
          </Button>
        )}
      </section>
      <fieldset className="match-form-fields" disabled={disabled}>
        <datalist id="old-teams">
          {[...new Set(app.matches.flatMap((m) => [m.homeTeam, m.awayTeam]))].map((team) => (
            <option key={team}>{team}</option>
          ))}
        </datalist>
        <div className="form-grid">
          <label>
            Équipe domicile
            <input
              name="homeTeam"
              value={fields.homeTeam}
              onChange={(e) => change('homeTeam', e.target.value)}
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
              value={fields.awayTeam}
              onChange={(e) => change('awayTeam', e.target.value)}
              list="old-teams"
              autoComplete="off"
              maxLength={100}
              required
              placeholder="FC Belleville"
            />
          </label>
        </div>
        <div className="form-grid team-logo-fields">
          <TeamLogoInput
            label="Logo domicile"
            value={homeLogo}
            disabled={disabled}
            onChange={setHomeLogo}
          />
          <TeamLogoInput
            label="Logo visiteur"
            value={awayLogo}
            disabled={disabled}
            onChange={setAwayLogo}
          />
        </div>
        <div className="form-grid">
          <label>
            Date
            <input
              type="date"
              name="date"
              value={fields.date}
              onChange={(e) => change('date', e.target.value)}
              required
            />
          </label>
          <label>
            Coup d’envoi
            <input
              type="time"
              name="time"
              value={fields.time}
              onChange={(e) => change('time', e.target.value)}
              required
            />
          </label>
        </div>
        <label>
          Stade <span className="optional">facultatif</span>
          <input
            name="stadium"
            value={fields.stadium}
            onChange={(e) => change('stadium', e.target.value)}
            maxLength={200}
            placeholder="Nom du stade"
          />
        </label>
        <WeatherLocationPicker value={weatherLocation} onChange={setWeatherLocation} />
        <div className="form-grid">
          <label>
            Compétition <span className="optional">facultatif</span>
            <input
              name="competition"
              value={fields.competition}
              onChange={(e) => change('competition', e.target.value)}
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
              value={fields.category}
              onChange={(e) => change('category', e.target.value)}
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
        {designation && (
          <details className="designation-details">
            <summary>Informations de désignation</summary>
            <div className="form-grid">
              {(
                [
                  ['matchNumber', 'Numéro du match'],
                  ['referee', 'Arbitre désigné'],
                  ['assistant1', 'Assistant 1'],
                  ['assistant2', 'Assistant 2'],
                ] as const
              ).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    value={designation[key] ?? ''}
                    maxLength={200}
                    onChange={(e) =>
                      setDesignation((current) => ({ ...current, [key]: e.target.value }))
                    }
                  />
                </label>
              ))}
            </div>
          </details>
        )}
      </fieldset>
      {failure && (
        <p className="form-error" role="alert">
          {failure}
        </p>
      )}
      <Button disabled={disabled} type="submit">
        {busy ? 'Enregistrement…' : initial ? 'Enregistrer la rencontre' : 'Créer la rencontre'}
      </Button>
    </form>
  );
}
