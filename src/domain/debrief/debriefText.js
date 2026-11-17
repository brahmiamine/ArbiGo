import { formatDateFr, formatRating } from './formatters';

const checkbox = (selected, value) => (selected === value ? '☑' : '☐');

/** Version texte brut du débrief, utilisée par « Copier le texte ». */
export function buildDebriefText(form) {
  return `DÉBRIEF ARBITRE APRÈS-MATCH

FÉDÉRATION FRANÇAISE DE FOOTBALL — DISTRICT DE PARIS DE FOOTBALL

MATCH N° : ${form.matchNumber}
Équipe domicile : ${form.homeTeam}
Équipe extérieur : ${form.awayTeam}
Date : ${formatDateFr(form.date)}
Heure : ${form.time}
Compétition : ${form.competition}
Arbitre : ${form.referee}
Assistant 1 : ${form.assistant1}
Assistant 2 : ${form.assistant2}

1. 🟢 MON MATCH EN 3 MOTS
${form.words[0]} / ${form.words[1]} / ${form.words[2]}

2. ✅ MES 2 POINTS FORTS
1. ${form.strengths[0]}
2. ${form.strengths[1]}

3. ⚠️ MON PRINCIPAL POINT D’AMÉLIORATION
${form.improvement}

4. 🎯 LES 2 FAITS MARQUANTS
Décision / situation n°1 :
${form.facts[0]}

Décision / situation n°2 :
${form.facts[1]}

5. 🤝 RELATIONNEL / GESTION DU MATCH
${checkbox(form.relation, 'Très satisfaisante')} Très satisfaisante
${checkbox(form.relation, 'Satisfaisante')} Satisfaisante
${checkbox(form.relation, 'À améliorer')} À améliorer
Pourquoi ? ${form.relationWhy}

6. 🧠 AUTO-ÉVALUATION
Ma prestation globale : ⭐ ${formatRating(form.rating)}/10

Si je devais refaire le match, je changerais :
${form.redo}

7. 🚀 MON OBJECTIF POUR LE PROCHAIN MATCH
Je veux progresser sur : ${form.objective}
`;
}
