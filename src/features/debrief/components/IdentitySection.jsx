import { memo } from 'react';
import Field from './Field';

function IdentitySection({ form, onChange }) {
  return (
    <section className="card card--identity">
      <div className="section-heading">
        <span className="section-number">00</span>
        <div>
          <h2>La rencontre</h2>
          <p>Informations générales du match</p>
        </div>
      </div>
      <div className="form-grid form-grid--2">
        <Field
          label="Numéro du match"
          name="matchNumber"
          value={form.matchNumber}
          onChange={onChange}
          placeholder="Ex. 123456"
        />
        <Field
          label="Compétition"
          name="competition"
          value={form.competition}
          onChange={onChange}
          placeholder="Ex. Seniors D4 – Journée 1"
        />
        <Field
          label="Équipe domicile"
          name="homeTeam"
          value={form.homeTeam}
          onChange={onChange}
          placeholder="Ex. CO Lutèce"
        />
        <Field
          label="Équipe extérieur"
          name="awayTeam"
          value={form.awayTeam}
          onChange={onChange}
          placeholder="Ex. Grenelle Paris A.S."
        />
        <Field
          label="Date du match"
          name="date"
          type="date"
          value={form.date}
          onChange={onChange}
        />
        <Field
          label="Heure du match"
          name="time"
          type="time"
          value={form.time}
          onChange={onChange}
        />
        <Field
          className="span-2"
          label="Arbitre"
          name="referee"
          value={form.referee}
          onChange={onChange}
          placeholder="Nom et prénom"
        />
        <Field
          label="Assistant 1"
          name="assistant1"
          value={form.assistant1}
          onChange={onChange}
          placeholder="Nom ou laisser vide"
        />
        <Field
          label="Assistant 2"
          name="assistant2"
          value={form.assistant2}
          onChange={onChange}
          placeholder="Nom ou laisser vide"
        />
      </div>
    </section>
  );
}

export default memo(IdentitySection);
