import { memo } from 'react';
import { RELATION_OPTIONS } from '@/domain/debrief/formModel';
import RatingField from './RatingField';
import Section from './Section';
import TextArea from './TextArea';

function DebriefSections({ form, onChange }) {
  return (
    <>
      <Section
        number="01"
        icon="🟢"
        title="Mon match en 3 mots"
        subtitle="Trois mots pour résumer la rencontre"
      >
        <div className="word-row">
          {form.words.map((word, index) => (
            <input
              key={index}
              className="word-input"
              aria-label={`Mot ${index + 1}`}
              value={word}
              onChange={(event) => onChange('words', event.target.value, index)}
              placeholder={`Mot ${index + 1}`}
              maxLength={28}
            />
          ))}
        </div>
      </Section>

      <Section
        number="02"
        icon="✅"
        title="Mes 2 points forts"
        subtitle="Ce qui a particulièrement bien fonctionné"
      >
        <div className="stack">
          <TextArea
            rows={5}
            label="Point fort 1"
            name="strengths"
            index={0}
            value={form.strengths[0]}
            onChange={onChange}
            placeholder="Ex. Bonne maîtrise globale du match"
          />
          <TextArea
            rows={5}
            label="Point fort 2"
            name="strengths"
            index={1}
            value={form.strengths[1]}
            onChange={onChange}
            placeholder="Ex. Communication claire avec les joueurs"
          />
        </div>
      </Section>

      <Section
        number="03"
        icon="⚠️"
        title="Mon principal point d’amélioration"
        subtitle="Un axe concret et utile pour progresser"
      >
        <TextArea
          ariaLabel="Point d’amélioration"
          name="improvement"
          value={form.improvement}
          onChange={onChange}
          placeholder="Ex. Être plus rapide dans ma lecture faute / avantage afin de ne pas laisser monter l’intensité."
        />
      </Section>

      <Section
        number="04"
        icon="🎯"
        title="Les 2 faits marquants"
        subtitle="Deux décisions ou situations importantes du match"
      >
        <div className="stack stack--large">
          <TextArea
            label="Décision / situation n°1"
            name="facts"
            index={0}
            value={form.facts[0]}
            onChange={onChange}
            placeholder="Minute, situation, décision prise, gestion éventuelle…"
            rows={5}
          />
          <TextArea
            label="Décision / situation n°2"
            name="facts"
            index={1}
            value={form.facts[1]}
            onChange={onChange}
            placeholder="Minute, situation, décision prise, gestion éventuelle…"
            rows={5}
          />
        </div>
      </Section>

      <Section
        number="05"
        icon="🤝"
        title="Relationnel / gestion du match"
        subtitle="Évalue la qualité de ta gestion humaine"
      >
        <div className="choice-grid">
          {RELATION_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`choice-card ${form.relation === option.value ? 'choice-card--active' : ''}`}
            >
              <input
                type="radio"
                name="relation"
                value={option.value}
                checked={form.relation === option.value}
                onChange={() => onChange('relation', option.value)}
              />
              <span className="choice-radio" />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        <TextArea
          label="Pourquoi ?"
          name="relationWhy"
          value={form.relationWhy}
          onChange={onChange}
          placeholder="Ex. Les échanges sont restés corrects et les contestations ont été rapidement maîtrisées."
        />
      </Section>

      <Section
        number="06"
        icon="🧠"
        title="Auto-évaluation"
        subtitle="Une note honnête et un recul sur ta prestation"
      >
        <RatingField value={form.rating} onChange={onChange} />
        <TextArea
          label="Si je devais refaire le match, je changerais :"
          name="redo"
          value={form.redo}
          onChange={onChange}
          placeholder="Ex. Je reviendrais plus rapidement à la faute lorsque l'avantage ne se développe pas."
        />
      </Section>

      <Section
        number="07"
        icon="🚀"
        title="Mon objectif pour le prochain match"
        subtitle="Un objectif simple, observable et directement lié à ton axe de progression"
      >
        <TextArea
          ariaLabel="Objectif du prochain match"
          name="objective"
          value={form.objective}
          onChange={onChange}
          placeholder="Ex. La lecture des fautes et l’application de l’avantage."
          rows={3}
        />
      </Section>
    </>
  );
}

export default memo(DebriefSections);
