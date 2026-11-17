import { describe, expect, it } from 'vitest';
import { buildDebriefText } from '@/domain/debrief/debriefText';
import { createEmptyForm } from '@/domain/debrief/formModel';

const fullForm = {
  ...createEmptyForm(),
  matchNumber: '123456',
  homeTeam: 'CO Lutèce',
  awayTeam: 'Grenelle Paris A.S.',
  date: '2026-10-06',
  time: '15:00',
  competition: 'Seniors D4 – Journée 1',
  referee: 'NOM Prénom',
  assistant1: 'DUPONT',
  assistant2: 'MARTIN',
  words: ['Calme', 'Présence', 'Communication'],
  strengths: ['Gestion du temps', 'Communication claire'],
  improvement: 'Lecture des fautes',
  facts: ['Minute 23 : main', 'Minute 67 : contestation'],
  relation: 'Satisfaisante',
  relationWhy: 'Échanges corrects',
  rating: '7.5',
  redo: 'Retour plus rapide à la faute',
  objective: 'La lecture des fautes',
};

describe('buildDebriefText', () => {
  it('reprend l’identité de la rencontre', () => {
    const text = buildDebriefText(fullForm);
    expect(text).toContain('MATCH N° : 123456');
    expect(text).toContain('Équipe domicile : CO Lutèce');
    expect(text).toContain('Équipe extérieur : Grenelle Paris A.S.');
    expect(text).toContain('Heure : 15:00');
    expect(text).toContain('Compétition : Seniors D4 – Journée 1');
    expect(text).toContain('Arbitre : NOM Prénom');
    expect(text).toContain('Assistant 1 : DUPONT');
    expect(text).toContain('Assistant 2 : MARTIN');
  });

  it('formate la date et la note à la française', () => {
    const text = buildDebriefText(fullForm);
    expect(text).toContain('Date : 06/10/2026');
    expect(text).toContain('Ma prestation globale : ⭐ 7,5/10');
  });

  it('coche uniquement le niveau relationnel choisi', () => {
    const text = buildDebriefText(fullForm);
    expect(text).toContain('☐ Très satisfaisante');
    expect(text).toContain('☑ Satisfaisante');
    expect(text).toContain('☐ À améliorer');
  });

  it('reprend les sept sections du débrief', () => {
    const text = buildDebriefText(fullForm);
    for (const heading of [
      '1. 🟢 MON MATCH EN 3 MOTS',
      '2. ✅ MES 2 POINTS FORTS',
      '3. ⚠️ MON PRINCIPAL POINT D’AMÉLIORATION',
      '4. 🎯 LES 2 FAITS MARQUANTS',
      '5. 🤝 RELATIONNEL / GESTION DU MATCH',
      '6. 🧠 AUTO-ÉVALUATION',
      '7. 🚀 MON OBJECTIF POUR LE PROCHAIN MATCH',
    ]) {
      expect(text).toContain(heading);
    }
  });

  it('reste lisible sur un formulaire vide', () => {
    const text = buildDebriefText(createEmptyForm());
    expect(text).toContain('MATCH N° :');
    expect(text).toContain('Ma prestation globale : ⭐ 8/10');
    expect(text).not.toContain('undefined');
  });
});
