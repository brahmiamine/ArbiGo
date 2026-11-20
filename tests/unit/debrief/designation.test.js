import { describe, expect, it } from 'vitest';
import { REAL_CAPTURES } from './designationCaptures';
import {
  DESIGNATION_FIELDS,
  cleanLine,
  countDetectedFields,
  extractDesignationFields,
  parseFrenchDate,
  parseTime,
  stripRoleLabel,
} from '@/domain/designation/designation';

const designationText = [
  'MATCH N° 123456',
  'SENIORS D4 - JOURNEE 1',
  'CO LUTECE',
  '2 - 1',
  'GRENELLE PARIS A.S.',
  'SAMEDI 06 OCTOBRE 2026',
  'COUP D ENVOI 15H00',
  'ARBITRE CENTRE : NOM PRENOM',
  'ARBITRE ASSISTANT 1 : DUPONT',
  'ARBITRE ASSISTANT 2 : MARTIN',
].join('\n');

/** Capture réelle du portail : pas de score lu, les deux équipes sur une même ligne. */
const designationSansScore = [
  'DISTRICT PARISIEN DE FOOTBALL',
  'dimanche 4 octobre 2026 à 11H00',
  'CDM D1 - Journée 1',
  'MAYDAY FC BENFICA ARGOSELO S.',
  '(LA, TÉLÉCHARGER LA FEUILLE DE MATCH INFORMATISEE',
  'OFFICIELS DÉSIGNÉS INFORMATIONS LIEU',
  'Arbitre centre MOHAMED BRAHMI Numéro du match 56608650 | + | a JF  /',
].join('\n');

/** Même capture, lue avec les coordonnées des mots : les colonnes sont marquées. */
const designationEnColonnes = [
  'DISTRICT PARISIEN DE FOOTBALL',
  'dimanche 4 octobre 2026 à 11H00',
  'CDM D1 - Journée 1',
  '~ BENFICA',
  'MAYDAY FC ~ ARGOSELO S.',
  '~ Ceo. ) Py Le Prise =',
].join('\n');

/** Capture mobile : chaque équipe sur sa ligne, précédée de l'icône du club. */
const designationMobile = [
  'SFR16:58 @ ~ Os Sal @ 36%',
  'DISTRICT PARISIEN DE FOOTBALL',
  'dimanche 4 octobre 2026 à 11H00',
  'CDM D1 - Journée 1',
  '© MAYDAY FC',
  'Na',
  'Li BENFICA ARGOSELO S.',
  'R TÉLÉCHARGER LA FEUILLE DE MATCH',
  'OFFICIELS DÉSIGNÉS',
  'r ~ MOHAMED BRAHMI',
  'INFORMATIONS',
  '| ~ 56608650',
].join('\n');

describe('cleanLine', () => {
  it('normalise espaces, barres verticales et apostrophes', () => {
    expect(cleanLine('  ARBITRE |  D’ANGELO  ')).toBe("ARBITRE I D'ANGELO");
  });
});

describe('stripRoleLabel', () => {
  it.each([
    ['Arbitre centre : NOM PRENOM', 'NOM PRENOM'],
    ['ARBITRE CENTRE: NOM PRENOM', 'NOM PRENOM'],
    ['Arbitre centre NOM PRENOM', 'NOM PRENOM'],
    ['Arbitre : NOM PRENOM', 'NOM PRENOM'],
    ['Arbitre central : NOM PRENOM', 'NOM PRENOM'],
    ['Arbitre assistant 1 : DUPONT', 'DUPONT'],
    ['Assistant 2 : MARTIN', 'MARTIN'],
    [': NOM PRENOM', 'NOM PRENOM'],
  ])('%s → %s', (input, expected) => {
    expect(stripRoleLabel(input)).toBe(expected);
  });

  it('ne touche pas un nom déjà nettoyé', () => {
    expect(stripRoleLabel('NOM PRENOM')).toBe('NOM PRENOM');
  });

  it('renvoie une chaîne vide si le libellé est seul', () => {
    expect(stripRoleLabel('ARBITRE CENTRE')).toBe('');
  });
});

describe('parseFrenchDate', () => {
  it('convertit une date en français au format ISO', () => {
    expect(parseFrenchDate('SAMEDI 06 OCTOBRE 2026')).toBe('2026-10-06');
  });

  it('accepte les accents manquants', () => {
    expect(parseFrenchDate('lundi 3 fevrier 2025')).toBe('2025-02-03');
  });

  it('renvoie une chaîne vide sans date reconnue', () => {
    expect(parseFrenchDate('aucune date ici')).toBe('');
  });
});

describe('parseTime', () => {
  it.each([
    ['COUP D ENVOI 15H00', '15:00'],
    ['début 9h30', '09:30'],
    ['à 19:45', '19:45'],
  ])('%s → %s', (input, expected) => {
    expect(parseTime(input)).toBe(expected);
  });

  it('refuse les heures impossibles', () => {
    expect(parseTime('29h99')).toBe('');
  });

  it('renvoie une chaîne vide sans heure', () => {
    expect(parseTime('rien')).toBe('');
  });
});

describe('extractDesignationFields', () => {
  it('détecte l’ensemble des champs d’une désignation complète', () => {
    expect(extractDesignationFields(designationText)).toEqual({
      matchNumber: '123456',
      homeTeam: 'CO LUTECE',
      awayTeam: 'GRENELLE PARIS A.S.',
      date: '2026-10-06',
      time: '15:00',
      competition: 'SENIORS D4 - JOURNEE 1',
      referee: 'NOM PRENOM',
      assistant1: 'DUPONT',
      assistant2: 'MARTIN',
    });
  });

  it('ne garde que le nom de l’arbitre, sans le libellé', () => {
    expect(extractDesignationFields('Arbitre centre : NOM PRENOM').referee).toBe('NOM PRENOM');
    expect(extractDesignationFields('ARBITRE CENTRE\nNOM PRENOM').referee).toBe('NOM PRENOM');
  });

  it('coupe le nom de l’arbitre quand l’OCR a collé la suite sur la même ligne', () => {
    const texte = 'Arbitre centre : MOHAMED BRAHMI Numéro du match 56608650 I + I a JF /';
    expect(extractDesignationFields(texte).referee).toBe('MOHAMED BRAHMI');
    expect(extractDesignationFields('Arbitre : NOM PRENOM Assistants : DUPONT').referee).toBe(
      'NOM PRENOM',
    );
  });

  it('sépare les deux équipes collées sur une même ligne faute de score', () => {
    const fields = extractDesignationFields(designationSansScore);
    expect(fields.homeTeam).toBe('MAYDAY FC');
    expect(fields.awayTeam).toBe('BENFICA ARGOSELO S.');
    expect(fields.competition).toBe('CDM D1 - Journée 1');
    expect(fields.date).toBe('2026-10-04');
    expect(fields.time).toBe('11:00');
    expect(fields.matchNumber).toBe('56608650');
    expect(fields.referee).toBe('MOHAMED BRAHMI');
  });

  it('suit les colonnes quand les coordonnées des mots sont connues', () => {
    expect(extractDesignationFields(designationEnColonnes)).toMatchObject({
      homeTeam: 'MAYDAY FC',
      awayTeam: 'BENFICA ARGOSELO S.',
    });
  });

  it('lit les équipes sur deux lignes successives, icônes comprises', () => {
    const fields = extractDesignationFields(designationMobile);
    expect(fields.homeTeam).toBe('MAYDAY FC');
    expect(fields.awayTeam).toBe('BENFICA ARGOSELO S.');
    expect(fields.competition).toBe('CDM D1 - Journée 1');
  });

  it('retrouve le numéro de match et l’arbitre malgré les libellés perdus', () => {
    const fields = extractDesignationFields(designationMobile);
    expect(fields.matchNumber).toBe('56608650');
    expect(fields.referee).toBe('MOHAMED BRAHMI');
  });

  it.each([
    [
      ['U14 D3 - POULE A - Journée 3', 'CHANTIERS PARIS U.A.', '==', 'All PARIS XIII E.S.'],
      'CHANTIERS PARIS U.A.',
      'PARIS XIII E.S.',
    ],
    [
      [
        'Anciens D2 - POULE A - Journée 10',
        '© SALESIENNE DE PARIS',
        'ALL)',
        'Bis MINHOTOS OS G.S.',
      ],
      'SALESIENNE DE PARIS',
      'MINHOTOS OS G.S.',
    ],
  ])('écarte les icônes collées aux noms (%#)', (lines, homeTeam, awayTeam) => {
    expect(extractDesignationFields(lines.join('\n'))).toMatchObject({ homeTeam, awayTeam });
  });

  it('coupe avant le sigle quand celui-ci ouvre la seconde équipe', () => {
    expect(extractDesignationFields('SENIORS D4 - JOURNEE 1\nUS CRETEIL US TORCY').homeTeam).toBe(
      'US CRETEIL',
    );
    expect(extractDesignationFields('SENIORS D4 - JOURNEE 1\nUS CRETEIL US TORCY').awayTeam).toBe(
      'US TORCY',
    );
  });

  it('ne retient jamais le marqueur de colonne dans une valeur', () => {
    const fields = extractDesignationFields(designationEnColonnes);
    expect(Object.values(fields).join(' ')).not.toContain('~');
  });

  it('ne découpe pas une équipe seule', () => {
    expect(extractDesignationFields('SENIORS D4 - JOURNEE 1\nCO LUTECE')).toMatchObject({
      homeTeam: '',
      awayTeam: '',
    });
  });

  it('ne garde que les noms des assistants, sans les libellés', () => {
    const fields = extractDesignationFields('Arbitre assistant 1 : DUPONT\nAssistant 2 : MARTIN');
    expect(fields.assistant1).toBe('DUPONT');
    expect(fields.assistant2).toBe('MARTIN');
  });

  it('renvoie des champs vides sur un texte sans information', () => {
    const fields = extractDesignationFields('bonjour');
    expect(countDetectedFields(fields)).toBe(0);
  });

  it('gère un texte vide', () => {
    expect(extractDesignationFields('')).toBeTruthy();
    expect(extractDesignationFields().matchNumber).toBe('');
  });

  it('expose les libellés utilisés par le récapitulatif', () => {
    expect(DESIGNATION_FIELDS.map((field) => field.key)).toEqual([
      'matchNumber',
      'homeTeam',
      'awayTeam',
      'date',
      'time',
      'competition',
      'referee',
      'assistant1',
      'assistant2',
    ]);
  });
});

describe('extractDesignationFields — captures réelles', () => {
  it.each(REAL_CAPTURES)('$name', ({ text, expected }) => {
    const fields = extractDesignationFields(text);
    expect(fields).toMatchObject(expected);
  });

  it('ne prend pas du bruit pour un nom d’arbitre', () => {
    expect(extractDesignationFields('Arbitre centre\n= ~ & GE').referee).toBe('');
    expect(extractDesignationFields('Arbitre centre\nBE 68 B&B & 6').referee).toBe('');
  });

  it('retrouve un numéro de match isolé de 8 chiffres', () => {
    expect(extractDesignationFields('dimanche 4 octobre 2026 à 11H00\n56608650').matchNumber).toBe(
      '56608650',
    );
  });

  it('restitue les points d’un sigle perdu par la lecture', () => {
    const { homeTeam, awayTeam } = extractDesignationFields(
      'CDM D1 - Journée 1\nCHANTIERS PARIS UA. ~ PARIS XIII ES.',
    );
    expect(homeTeam).toBe('CHANTIERS PARIS U.A.');
    expect(awayTeam).toBe('PARIS XIII E.S.');
  });
});

it('imports the street and postal address from the itinerary section', () => {
  expect(
    extractDesignationFields(
      `${designationText}\nLIEU/ITINÉRAIRE\nComplexe Sportif de la Plaine\n13 rue du General Guillaumat\n75015 Paris`,
    ).stadium,
  ).toBe('13 rue du General Guillaumat, 75015 Paris');
});
