/**
 * Reconstitution du texte d'une désignation à partir des coordonnées des mots (sortie TSV de
 * Tesseract). Les désignations présentent l'équipe domicile à gauche et l'équipe extérieur à
 * droite sur les mêmes lignes : un marqueur sépare les deux colonnes pour que le texte lu
 * reste exploitable, sans lui les noms des deux équipes seraient collés bout à bout.
 */

/** Marqueur inséré entre la colonne de gauche et celle de droite : « MAYDAY FC ~ BENFICA S. ». */
export const COLUMN_SEPARATOR = '~';

/** Niveau « mot » dans la sortie TSV de Tesseract. */
const WORD_LEVEL = '5';

/** Part minimale de la largeur d'une ligne qu'occupe la gouttière entre les deux colonnes. */
const GUTTER_SHARE = 0.25;

/** Une gouttière est aussi nettement plus large que les espaces habituels de sa ligne. */
const GUTTER_RATIO = 2;

/** Gouttière minimale en pixels, pour les pages à très petits espacements. */
const MIN_GUTTER = 24;

/** Colonnes du TSV : niveau, bloc, paragraphe, ligne, mot, gauche, haut, largeur, texte. */
const TSV = {
  level: 0,
  block: 2,
  paragraph: 3,
  line: 4,
  word: 5,
  left: 6,
  top: 7,
  width: 8,
  height: 9,
  text: 11,
};

const readWords = (tsv) => {
  const rows = String(tsv ?? '')
    .trim()
    .split('\n')
    .slice(1);

  return rows
    .map((row) => row.split('\t'))
    .filter((cells) => cells[TSV.level] === WORD_LEVEL && cells[TSV.text]?.trim())
    .map((cells) => ({
      // Les numéros de ligne se répètent d'un bloc à l'autre : la clé doit être complète.
      line: `${cells[TSV.block]}/${cells[TSV.paragraph]}/${cells[TSV.line]}`,
      text: cells[TSV.text].trim(),
      left: Number(cells[TSV.left]),
      top: Number(cells[TSV.top]),
      width: Number(cells[TSV.width]),
      height: Number(cells[TSV.height]),
    }));
};

const median = (values) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

const gapAfter = (word, next) => next.left - (word.left + word.width);

/**
 * Indice du premier mot de la colonne de droite, ou `-1` si la ligne se lit d'un seul tenant.
 * Une phrase à la typographie large (« Numéro du match : 56608650 ») conserve donc sa lecture
 * normale : seule une vraie gouttière, large devant toute la ligne, sépare deux colonnes.
 */
const columnBreak = (words) => {
  const gaps = words.slice(1).map((word, index) => gapAfter(words[index], word));
  const span = words.at(-1).left + words.at(-1).width - words[0].left;
  const widest = gaps.indexOf(Math.max(...gaps));
  const gutter = gaps[widest];
  // Les autres espaces de la ligne servent de référence : la gouttière ne se compare pas à elle-même.
  const typical = median(gaps.filter((_, index) => index !== widest));

  if (gutter < MIN_GUTTER || gutter < span * GUTTER_SHARE || gutter < typical * GUTTER_RATIO)
    return -1;
  return widest + 1;
};

/** Ligne visuelle : mots triés de gauche à droite, colonnes séparées par le marqueur. */
const buildLine = (words, middle) => {
  const breakAt = columnBreak(words);
  if (breakAt > 0) {
    return [
      words
        .slice(0, breakAt)
        .map((word) => word.text)
        .join(' '),
      words
        .slice(breakAt)
        .map((word) => word.text)
        .join(' '),
    ].join(` ${COLUMN_SEPARATOR} `);
  }

  const text = words.map((word) => word.text).join(' ');
  // Ligne entièrement dans la colonne de droite : le marqueur garde l'information de côté.
  return words[0].left > middle ? `${COLUMN_SEPARATOR} ${text}` : text;
};

/**
 * Transforme une sortie TSV en texte, une ligne visuelle par ligne, colonnes marquées.
 * Renvoie une chaîne vide si le TSV n'expose aucun mot exploitable.
 */
export function tsvToText(tsv) {
  const words = readWords(tsv);
  if (!words.length) return '';

  const byLine = new Map();
  for (const word of words) {
    if (!byLine.has(word.line)) byLine.set(word.line, []);
    byLine.get(word.line).push(word);
  }

  // L'ordre de lecture suit la position réelle des lignes, pas l'ordre des blocs du TSV.
  const lines = [...byLine.values()]
    .sort((a, b) => Math.min(...a.map((word) => word.top)) - Math.min(...b.map((word) => word.top)))
    .map((lineWords) => [...lineWords].sort((a, b) => a.left - b.left));
  const left = Math.min(...words.map((word) => word.left));
  const right = Math.max(...words.map((word) => word.left + word.width));
  const middle = (left + right) / 2;

  return lines.map((lineWords) => buildLine(lineWords, middle)).join('\n');
}
