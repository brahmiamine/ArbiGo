export const STORAGE_KEY = 'rapport-arbitre-75-v1';

export const RATING = { min: 1, max: 10, step: 0.5, default: '8' };

export function createEmptyForm() {
  return {
    matchNumber: '',
    homeTeam: '',
    awayTeam: '',
    date: '',
    time: '',
    competition: '',
    referee: '',
    assistant1: '',
    assistant2: '',
    words: ['', '', ''],
    strengths: ['', ''],
    improvement: '',
    facts: ['', ''],
    relation: '',
    relationWhy: '',
    rating: RATING.default,
    redo: '',
    objective: '',
  };
}

export const RELATION_OPTIONS = [
  { value: 'Très satisfaisante', label: 'Très satisfaisante' },
  { value: 'Satisfaisante', label: 'Satisfaisante' },
  { value: 'À améliorer', label: 'À améliorer' },
];

export const REQUIRED_FIELDS = [
  { label: 'Numéro du match', get: (form) => form.matchNumber },
  { label: 'Équipe domicile', get: (form) => form.homeTeam },
  { label: 'Équipe extérieur', get: (form) => form.awayTeam },
  { label: 'Date du match', get: (form) => form.date },
  { label: 'Heure du match', get: (form) => form.time },
  { label: 'Compétition', get: (form) => form.competition },
  { label: 'Arbitre', get: (form) => form.referee },
  { label: 'Mot 1', get: (form) => form.words[0] },
  { label: 'Mot 2', get: (form) => form.words[1] },
  { label: 'Mot 3', get: (form) => form.words[2] },
  { label: 'Point fort 1', get: (form) => form.strengths[0] },
  { label: 'Point fort 2', get: (form) => form.strengths[1] },
  { label: 'Point d’amélioration', get: (form) => form.improvement },
  { label: 'Fait marquant 1', get: (form) => form.facts[0] },
  { label: 'Fait marquant 2', get: (form) => form.facts[1] },
  { label: 'Relationnel / gestion du match', get: (form) => form.relation },
  { label: 'Pourquoi ce relationnel', get: (form) => form.relationWhy },
  { label: 'Ce que je changerais', get: (form) => form.redo },
  { label: 'Objectif du prochain match', get: (form) => form.objective },
];

export const OPTIONAL_FIELDS = [
  { label: 'Assistant 1', get: (form) => form.assistant1 },
  { label: 'Assistant 2', get: (form) => form.assistant2 },
];

const RATING_FIELD = { label: 'Auto-évaluation', get: (form) => form.rating };

export function isFilled(value) {
  return String(value ?? '').trim().length > 0;
}

const missingFrom = (fields, form) =>
  fields.filter((field) => !isFilled(field.get(form))).map((field) => field.label);

export function getMissingFields(form) {
  return missingFrom(REQUIRED_FIELDS, form);
}

export function getUnfilledOptionalFields(form) {
  return missingFrom(OPTIONAL_FIELDS, form);
}

/** Progression du débrief : champs obligatoires + note. Les assistants facultatifs n'entrent pas dans le calcul. */
export function computeProgress(form) {
  const fields = [...REQUIRED_FIELDS, RATING_FIELD];
  const completed = fields.filter((field) => isFilled(field.get(form))).length;
  return Math.round((completed / fields.length) * 100);
}

/**
 * Force un tableau de champs texte à la longueur attendue :
 * les valeurs saisies sont conservées, les cases manquantes complétées.
 */
const asFixedLengthArray = (value, length) =>
  Array.from({ length }, (_, index) => {
    const item = Array.isArray(value) ? value[index] : undefined;
    return item == null ? '' : String(item);
  });

/** Fusionne un formulaire sauvegardé (potentiellement incomplet ou obsolète) avec les valeurs par défaut. */
export function normalizeForm(parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return createEmptyForm();
  const empty = createEmptyForm();
  // Seules les clés connues sont reprises, avec le type attendu : une sauvegarde altérée
  // (nombre, objet, clé inconnue) ne doit jamais atteindre les champs ni les exports.
  const scalars = Object.fromEntries(
    Object.entries(empty)
      .filter(([, fallback]) => typeof fallback === 'string')
      .map(([key, fallback]) => {
        const value = parsed[key];
        return [
          key,
          typeof value === 'string' ? value : typeof value === 'number' ? String(value) : fallback,
        ];
      }),
  );
  return {
    ...scalars,
    words: asFixedLengthArray(parsed.words, empty.words.length),
    strengths: asFixedLengthArray(parsed.strengths, empty.strengths.length),
    facts: asFixedLengthArray(parsed.facts, empty.facts.length),
  };
}

/** Ne conserve que les champs réellement détectés par l'OCR. */
export function pickDetectedFields(detected) {
  if (!detected) return {};
  return Object.fromEntries(Object.entries(detected).filter(([, value]) => isFilled(value)));
}
