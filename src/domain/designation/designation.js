import { COLUMN_SEPARATOR } from './layout';

const MONTHS = {
  janvier: '01',
  fevrier: '02',
  février: '02',
  mars: '03',
  avril: '04',
  mai: '05',
  juin: '06',
  juillet: '07',
  aout: '08',
  août: '08',
  septembre: '09',
  octobre: '10',
  novembre: '11',
  decembre: '12',
  décembre: '12',
};

/** Champs affichés dans le récapitulatif de lecture de la désignation. */
export const DESIGNATION_FIELDS = [
  { key: 'matchNumber', label: 'N° de match' },
  { key: 'homeTeam', label: 'Équipe domicile' },
  { key: 'awayTeam', label: 'Équipe extérieur' },
  { key: 'date', label: 'Date' },
  { key: 'time', label: 'Heure' },
  { key: 'competition', label: 'Compétition' },
  { key: 'referee', label: 'Arbitre' },
  { key: 'assistant1', label: 'Assistant 1' },
  { key: 'assistant2', label: 'Assistant 2' },
];

const normalizeSpaces = (value = '') =>
  value
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+$/g, '')
    .trim();
export const cleanLine = (line = '') =>
  normalizeSpaces(line.replace(/[|]/g, 'I').replace(/[“”]/g, '"').replace(/[’]/g, "'"));

/** Libellés de fonction à retirer des noms (« Arbitre centre », « Assistant 1 »…). */
const ROLE_LABEL =
  /^\s*(?:arbitres?\s+assistants?|arbitres?\s+centr(?:e|al)|arbitres?|assistants?)\s*\d?\s*[:\-–]?\s*/i;

/** « Arbitre centre : NOM Prénom » → « NOM Prénom », « Assistant 1 : DUPONT » → « DUPONT ». */
export const stripRoleLabel = (value = '') =>
  cleanLine(value.replace(ROLE_LABEL, '').replace(/^[:\-–]\s*/, ''));

/**
 * Libellés qui suivent le nom quand l'OCR a collé toute la ligne :
 * « MOHAMED BRAHMI Numéro du match 56608650 » → coupé avant « Numéro du match ».
 */
const NAME_BOUNDARY =
  /\b(?:arbitres?|assistants?|num[ée]?ro\s+du\s+match|n[°ºo]\s*(?:de\s+)?(?:match|rencontre)|match\s*n[°ºo]|match|rencontre|comp[ée]tition|terrain|date|heure|officiels?|d[ée]sign[ée]s?|informations?)\b/i;

/** Ne conserve que le nom de l'arbitre : libellé de fonction retiré, libellés suivants coupés. */
const toRefereeName = (value = '') => cleanLine(stripRoleLabel(value).split(NAME_BOUNDARY)[0]);

/** Un nom de personne : deux à quatre mots composés de lettres, sans chiffre ni symbole. */
const isPersonName = (value = '') =>
  /^[A-Za-zÀ-ÖØ-öø-ÿ'’-]{2,}(?: [A-Za-zÀ-ÖØ-öø-ÿ'’-]{2,}){1,3}$/.test(value);

const lettersOf = (value) => (value.match(/[A-Za-zÀ-ÖØ-öø-ÿ]/g) || []).length;

/** Part de capitales : un nom d'équipe imprimé en capitales se détache du texte courant. */
const upperRatio = (value) => {
  const letters = lettersOf(value);
  return letters ? (value.match(/[A-ZÀ-ÖØ-Þ]/g) || []).length / letters : 0;
};

const isLikelyTeamLine = (line) => {
  const value = cleanLine(line);
  if (!value || value.length < 3 || value.length > 42) return false;
  if (
    /\b(DISTRICT|PARISIEN|FOOTBALL|DIMANCHE|SAMEDI|JOURNEE|JOURNÉE|ARBITRE|CENTRE|OFFICIELS|DESIGNES|DÉSIGNÉS|INFORMATIONS|NUMERO|NUMÉRO|MATCH|FMI|PARC|SPORTS|SYNTHETIQUE|SYNTHÉTIQUE)\b/i.test(
      value,
    )
  )
    return false;
  if (/^\d+\s*[-–]\s*\d+$/.test(value)) return false;
  return lettersOf(value) >= 3 && upperRatio(value) > 0.55;
};

export const parseFrenchDate = (text) => {
  const match = text.match(
    /\b(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)?\s*(\d{1,2})\s+(janvier|f[eé]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[eé]cembre)\s+(20\d{2})\b/i,
  );
  if (!match) return '';
  const day = String(Number(match[1])).padStart(2, '0');
  const monthKey = match[2]
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const month = MONTHS[monthKey] || MONTHS[match[2].toLowerCase()];
  return month ? `${match[3]}-${month}-${day}` : '';
};

export const parseTime = (text) => {
  const match = text.match(/\b(\d{1,2})\s*(?:h|:)\s*(\d{2})\b/i);
  if (!match) return '';
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return '';
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

/** Numéro seul sur sa ligne, juste après le libellé « INFORMATIONS » : le libellé a été perdu. */
const findLabellessMatchNumber = (lines) => {
  // Le titre de bloc est en capitales (« INFORMATIONS », parfois collé à « OFFICIELS DÉSIGNÉS ») :
  // la phrase « Voici les informations… » ne doit pas être prise pour lui.
  const index = lines.findIndex((line) =>
    /^(?:OFFICIELS\s+D[ÉE]SIGN[ÉE]S\s+)?INFORMATIONS\b/.test(line),
  );
  if (index < 0) return '';

  return (
    lines
      .slice(index + 1, index + 4)
      .map((line) => line.match(/\b(\d{6,10})\b/)?.[1])
      .find(Boolean) || ''
  );
};

/** Dernier recours : un numéro de match fait 8 chiffres, et c'est le seul nombre de cette taille de la page. */
const findIsolatedMatchNumber = (text) => {
  const numbers = [...new Set(text.match(/\b\d{8}\b/g) || [])];
  return numbers.length === 1 ? numbers[0] : '';
};

const findMatchNumber = (lines, text) => {
  const patterns = [
    /(?:match|rencontre)\s*n[°ºo]\s*[:\-]?\s*(\d{2,10})/i,
    /n[°ºo]\s*(?:de\s+)?(?:match|rencontre)\s*[:\-]?\s*(\d{2,10})/i,
    /num[ée]?ro\s+du\s+match\s*[:\-]?\s*(\d{2,10})/i,
  ];
  return (
    patterns.map((pattern) => text.match(pattern)?.[1]).find(Boolean) ||
    findLabellessMatchNumber(lines) ||
    findIsolatedMatchNumber(text)
  );
};

const findCompetition = (lines) => {
  const patterns = [
    /\b(?:CDM|SENIORS?|U\s?\d{2}|FUTSAL|VETERANS?|VÉTÉRANS?|ANCIENS?|CRITERIUM|CRITÉRIUM)\b.*\b(?:D\s?\d|R\s?\d|JOURN[ÉE]E|COUPE)\b/i,
    /\b(?:D\s?\d|R\s?\d)\b.*\bJOURN[ÉE]E\b/i,
  ];
  return lines.find((line) => patterns.some((pattern) => pattern.test(line))) || '';
};

/**
 * Bloc « OFFICIELS DÉSIGNÉS » : quand le libellé « Arbitre centre » disparaît à la lecture,
 * le nom de l'arbitre reste la seule ligne du bloc qui ressemble à un nom de personne.
 */
const findLabellessReferee = (lines) => {
  const index = lines.findIndex((line) => /OFFICIELS\s+D[ÉE]SIGN[ÉE]S/i.test(line));
  if (index < 0) return '';

  // Les colonnes « Officiels », « Informations » et « Lieu » partagent la même ligne : le nom est
  // dans la colonne de gauche, parfois seule, parfois suivi du numéro de match.
  const name = lines
    .slice(index + 1, index + 3)
    .flatMap((line) => line.split(COLUMN_SEPARATOR))
    .map(trimTeamEdges)
    .find((line) => {
      const words = line.split(' ');
      return (
        words.length >= 2 &&
        words.length <= 4 &&
        !/\d/.test(line) &&
        !TEAM_NOISE.test(line) &&
        words.every((word) => lettersOf(word) >= 2)
      );
    });

  return name || '';
};

const findReferee = (lines, text) => {
  // « Arbitre centre : NOM Prénom » sur une même ligne.
  const direct = text.match(/Arbitre\s+centr(?:e|al)\s*[:\-–]?\s*([^\n]+)/i);
  if (direct?.[1]) {
    const candidate = toRefereeName(direct[1]);
    if (isPersonName(candidate) && candidate.length < 60) return candidate;
  }

  // « ARBITRE CENTRE » seul sur sa ligne, le nom juste en dessous.
  const index = lines.findIndex((line) => /Arbitre\s+centr(?:e|al)/i.test(line));
  if (index >= 0 && lines[index + 1]) {
    const candidate = toRefereeName(lines[index + 1]);
    if (isPersonName(candidate) && !/OFFICIELS|INFORMATIONS/i.test(candidate)) return candidate;
  }

  const labelled = toRefereeName(text.match(/Arbitre\s*[:\-–]\s*([^\n]+)/i)?.[1] ?? '');
  return isPersonName(labelled) ? labelled : findLabellessReferee(lines);
};

const isScoreLine = (line) => /^\d+\s*[-–]\s*\d+$/.test(line);

/** Libellés et mots de lieu qui ne sont jamais des noms d'équipe. */
const TEAM_NOISE =
  /\b(?:d[ée]signations?|pass[ée]es?|informatis[ée]e?|t[ée]l[ée]charger|feuille|fmi|informations?|lieu|itin[ée]raire|officiels?|d[ée]sign[ée]s?|arbitres?|assistants?|distance|domicile|installation|synth[ée]tique|terrain|stade|complexe|parc|rue|avenue|boulevard|route|journ[ée]e|poule|match|rencontre|num[ée]?ro)\b/i;

const isTeamCandidate = (line) => {
  // Les pictogrammes collés au nom (« M4 BENFICA… ») ne doivent pas faire écarter la ligne.
  const original = cleanLine(line);
  const value = trimTeamEdges(original);
  // Un chiffre trahit un bandeau système, un score ou une date, jamais un nom d'équipe.
  if (TEAM_NOISE.test(value) || /\d/.test(value) || value.length > 42) return false;
  if (lettersOf(value) < 4 || upperRatio(value) <= 0.55) return false;

  // Chaque côté du marqueur doit ressembler à un nom : sinon c'est du bruit autour d'un libellé.
  // Le contrôle porte sur la ligne d'origine, avant le retrait des bribes d'icônes.
  return original.split(COLUMN_SEPARATOR).every((part) => !part.trim() || lettersOf(part) >= 2);
};

const MAX_TEAM_WORDS = 4;

/**
 * Retire les bribes d'icônes collées aux noms par la lecture d'image :
 * « © MAYDAY FC », « Li BENFICA ARGOSELO S. » → « MAYDAY FC », « BENFICA ARGOSELO S. ».
 */
const trimTeamEdges = (value = '') => {
  const words = cleanLine(value).split(' ').filter(Boolean);
  // Un sigle de club est en capitales (« S. », « FC ») : seul un mot sans lettre ou en minuscules est un parasite.
  const isNoise = (word) => {
    const letters = lettersOf(word);
    if (/\d/.test(word) && letters <= 3) return true;
    return letters === 0 || (letters < 4 && word !== word.toUpperCase());
  };

  while (words.length > 1 && isNoise(words[0])) words.shift();
  while (words.length > 1 && isNoise(words.at(-1))) words.pop();

  return words.join(' ');
};

/**
 * Les captures mobiles affichent chacune des deux équipes sur sa propre ligne, juste après la
 * compétition : la première est l'équipe domicile, la seconde l'équipe extérieur.
 */
const findTeamsOnLines = (lines) => {
  const competitionIndex = lines.findIndex((line) => findCompetition([line]));
  if (competitionIndex < 0) return null;

  // Après les équipes viennent le bouton de la feuille de match, puis les blocs « Officiels »…
  const afterCompetition = lines.slice(competitionIndex + 1);
  const end = afterCompetition.findIndex((line) =>
    /T[ÉE]L[ÉE]CHARGER|FEUILLE|OFFICIELS|INFORMATIONS/i.test(line),
  );
  const teams = (end >= 0 ? afterCompetition.slice(0, end) : afterCompetition)
    .filter(isTeamCandidate)
    .map(trimTeamEdges)
    .filter((line) => line.split(' ').length <= MAX_TEAM_WORDS)
    .slice(0, 2);

  const [homeTeam = '', awayTeam = ''] = teams;
  return homeTeam && awayTeam ? { homeTeam, awayTeam } : null;
};

/** « MAYDAY FC ~ BENFICA ARGOSELO S. » → `{ left: 'MAYDAY FC', right: 'BENFICA ARGOSELO S.' }`. */
const splitColumns = (line) => {
  const value = cleanLine(line);
  const [left = '', right = ''] = value.split(COLUMN_SEPARATOR);
  return {
    left: cleanLine(left),
    right: cleanLine(right),
    hasColumn: value.includes(COLUMN_SEPARATOR),
  };
};

/**
 * Les désignations affichent l'équipe domicile à gauche et l'équipe extérieur à droite.
 * On retient la suite de lignes d'équipes la plus fournie dont les deux colonnes sont remplies :
 * les lignes parasites (graphismes, score illisible) sont ainsi écartées.
 */
const findTeamsFromColumns = (lines) => {
  let best = null;
  let run = [];

  const keepRun = () => {
    if (!run.length) return;
    const columns = run.map(splitColumns);
    const homeTeam = cleanLine(columns.map((column) => column.left).join(' '));
    const awayTeam = cleanLine(columns.map((column) => column.right).join(' '));
    const total = lettersOf(homeTeam) + lettersOf(awayTeam);
    const usesColumns = columns.some((column) => column.hasColumn);

    if (usesColumns && homeTeam && awayTeam && total > (best?.total ?? 0)) {
      best = { homeTeam, awayTeam, total };
    }
    run = [];
  };

  lines.forEach((line) => (isTeamCandidate(line) ? run.push(line) : keepRun()));
  keepRun();

  return best;
};

/** Équipes de part et d'autre de la ligne de score. */
const teamsAroundScore = (lines, scoreIndex) => {
  const before = lines.slice(Math.max(0, scoreIndex - 5), scoreIndex).filter(isLikelyTeamLine);
  const after = lines.slice(scoreIndex + 1, scoreIndex + 7).filter(isLikelyTeamLine);

  let homeTeam = before.at(-1) || '';
  let awayTeam = after[0] || '';

  if (!homeTeam || !awayTeam) {
    const nearby = lines
      .slice(Math.max(0, scoreIndex - 6), scoreIndex + 7)
      .filter(isLikelyTeamLine);
    if (!homeTeam) homeTeam = nearby[0] || '';
    if (!awayTeam) awayTeam = nearby.find((line) => line !== homeTeam) || '';
  }

  return { homeTeam, awayTeam };
};

/** Abréviations de club qui encadrent un nom d'équipe : « FC », « AS », « US », « A.S. », « S. »… */
const CLUB_ABBREVIATIONS = new Set([
  'AS',
  'US',
  'FC',
  'SC',
  'ES',
  'AC',
  'CS',
  'CO',
  'CA',
  'JA',
  'SO',
  'RC',
  'SA',
  'OC',
  'ASC',
  'ASPTT',
  'ASF',
  'USM',
  'USO',
  'ESN',
  'ESA',
  'CSA',
  'CSC',
  'FCS',
]);

/** Sigle ponctué (« A.S. », « F.C. », « S. ») ou abréviation connue. */
const isClubAbbreviation = (word) =>
  CLUB_ABBREVIATIONS.has(word.toUpperCase()) || /^(?:[A-Z]\.|[A-Z](?:\.[A-Z])+\.?)$/i.test(word);

/**
 * Note une coupure : la première équipe finit par son sigle (« MAYDAY FC ») ou la seconde
 * commence par le sien (« US TORCY »), et les deux noms restent équilibrés.
 */
const scoreBreak = (home, away) => {
  const score = isClubAbbreviation(home.at(-1)) ? 3 : 0;
  const bonus = isClubAbbreviation(away[0]) ? 2 : 0;
  const balance = Math.abs(home.length - away.length) <= 1 ? 1 : 0;
  return score + bonus + balance;
};

/**
 * Les deux équipes arrivent parfois collées sur une seule ligne, faute de score lu :
 * « MAYDAY FC BENFICA ARGOSELO S. » → « MAYDAY FC » et « BENFICA ARGOSELO S. ».
 */
const splitMergedTeams = (line) => {
  const words = line.split(' ');
  if (words.length < 4) return null;

  let best = null;
  for (let index = 1; index < words.length - 1; index += 1) {
    if (!isClubAbbreviation(words[index])) continue;
    // Le sigle termine la première équipe, ou bien commence la seconde.
    for (const cut of [index, index + 1]) {
      const home = words.slice(0, cut);
      const away = words.slice(cut);
      if (home.length < 2 || away.length < 2) continue;
      const score = scoreBreak(home, away);
      if (score > (best?.score ?? 0)) best = { score, home: home.join(' '), away: away.join(' ') };
    }
  }

  return best;
};

/**
 * Dans l'application mobile le score se glisse entre les deux noms, souvent sur la ligne d'un nom
 * qui passe à la ligne : « SALESIENNE 1 = 3 MINHOTOS ». Il devient un séparateur de colonnes.
 * Une ligne qui n'est qu'un score reste intacte : elle sert de repère à `teamsAroundScore`.
 */
const SCORE_IN_LINE = /\b\d{1,2}\s*[-–=]\s*\d{1,2}\b/g;
const scoreToColumn = (line) => {
  if (isScoreLine(line) || !/[A-Za-zÀ-ÿ]{3}/.test(line)) return line;
  return cleanLine(
    line
      .replace(SCORE_IN_LINE, ` ${COLUMN_SEPARATOR} `)
      .replace(/(?:~\s*){2,}/g, `${COLUMN_SEPARATOR} `),
  );
};

const findTeams = (rawLines) => {
  const lines = rawLines.map(scoreToColumn);
  // Les désignations en deux colonnes portent le marqueur de colonne, bien plus fiable que l'ordre
  // de lecture : l'équipe domicile est toujours à gauche, l'équipe extérieur toujours à droite.
  const columns = findTeamsFromColumns(lines);
  if (columns) return { homeTeam: columns.homeTeam, awayTeam: columns.awayTeam };

  const scoreIndex = lines.findIndex(isScoreLine);
  if (scoreIndex >= 0) return teamsAroundScore(lines, scoreIndex);

  const separateLines = findTeamsOnLines(lines);
  if (separateLines) return separateLines;

  const merged = lines.filter(isLikelyTeamLine).map(splitMergedTeams).find(Boolean);

  return merged ? { homeTeam: merged.home, awayTeam: merged.away } : { homeTeam: '', awayTeam: '' };
};

const findAssistants = (lines) => {
  const names = lines
    .filter((line) => /Arbitre\s+assistant|Assistant/i.test(line))
    .map(stripRoleLabel)
    .filter(Boolean);
  const [assistant1 = '', assistant2 = ''] = [...new Set(names)];
  return { assistant1, assistant2 };
};

/** La lecture d'image perd souvent les points des sigles : « U.A. » → « UA. », « G.S. » → « GS. ». */
const NOT_INITIALS = new Set(['ST', 'STE', 'STS']);
const restoreInitialDots = (value = '') =>
  value.replace(/(^|\s)([A-Z]{2,3})\.(?=\s|$)/g, (match, space, letters) =>
    NOT_INITIALS.has(letters) ? match : `${space}${[...letters].join('.')}.`,
  );

/** Retire le marqueur de colonne : il structure la lecture, il ne fait jamais partie d'une valeur. */
const withoutColumns = (value = '') => cleanLine(value.split(COLUMN_SEPARATOR).join(' '));

/** Analyse le texte brut d'une désignation et renvoie les champs du formulaire détectés. */
export function extractDesignationFields(rawText = '') {
  const text = rawText.replace(/\r/g, '');
  const lines = text.split('\n').map(cleanLine).filter(Boolean);

  const { homeTeam, awayTeam } = findTeams(lines);
  const { assistant1, assistant2 } = findAssistants(lines);

  const fields = {
    matchNumber: findMatchNumber(lines, text),
    homeTeam: restoreInitialDots(trimTeamEdges(homeTeam)),
    awayTeam: restoreInitialDots(trimTeamEdges(awayTeam)),
    date: parseFrenchDate(text),
    time: parseTime(text),
    competition: findCompetition(lines),
    referee: findReferee(lines, text),
    assistant1,
    assistant2,
  };

  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, withoutColumns(value)]),
  );
}

export function countDetectedFields(fields) {
  return fields ? Object.values(fields).filter(Boolean).length : 0;
}
