import { extractDesignationFields } from './designation';

const CORE_FIELDS = ['matchNumber', 'homeTeam', 'awayTeam', 'date', 'time', 'referee'];
const MIN_TEAM_LETTERS = 4;

const lettersOf = (value = '') => (value.match(/[A-Za-zÀ-ÖØ-öø-ÿ]/g) || []).length;
const isPlausibleTeam = (value) => lettersOf(value) >= MIN_TEAM_LETTERS;

/**
 * Une équipe absente ou réduite à quelques lettres (« HN » à la place de « MAYDAY FC ») trahit
 * une lecture ratée, typiquement un nom blanc sur fond noir à petite taille.
 */
export const needsSecondReading = (fields) =>
  !isPlausibleTeam(fields.homeTeam) || !isPlausibleTeam(fields.awayTeam);

/** Nombre de champs essentiels lus, les noms d'équipe invraisemblables comptant pour rien. */
export const readingScore = (fields) =>
  CORE_FIELDS.filter(
    (key) => fields[key] && (!key.endsWith('Team') || isPlausibleTeam(fields[key])),
  ).length;

/** Garde la lecture qui livre le plus d'informations ; à égalité, la première (plus rapide, déjà vue). */
export function pickBestReading(first, second, extract = extractDesignationFields) {
  return readingScore(extract(second)) > readingScore(extract(first)) ? second : first;
}
