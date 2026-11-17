import { describe, expect, it } from 'vitest';
import {
  OPTIONAL_FIELDS,
  RELATION_OPTIONS,
  REQUIRED_FIELDS,
  computeProgress,
  createEmptyForm,
  getMissingFields,
  getUnfilledOptionalFields,
  isFilled,
  normalizeForm,
  pickDetectedFields,
} from '@/domain/debrief/formModel';

const completeForm = {
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

describe('createEmptyForm', () => {
  it('renvoie un formulaire vierge avec la note par défaut', () => {
    const form = createEmptyForm();
    expect(form.rating).toBe('8');
    expect(form.words).toEqual(['', '', '']);
    expect(form.strengths).toEqual(['', '']);
    expect(form.facts).toEqual(['', '']);
    expect(form.relation).toBe('');
  });

  it('renvoie des tableaux indépendants à chaque appel', () => {
    const first = createEmptyForm();
    first.words[0] = 'modifié';
    expect(createEmptyForm().words[0]).toBe('');
  });
});

describe('isFilled', () => {
  it.each([
    ['texte', 'Lutèce', true],
    ['espaces seuls', '   ', false],
    ['chaîne vide', '', false],
    ['null', null, false],
    ['undefined', undefined, false],
    ['nombre', 0, true],
  ])('%s → %s', (_label, value, expected) => {
    expect(isFilled(value)).toBe(expected);
  });
});

describe('getMissingFields', () => {
  it('liste tous les champs obligatoires sur un formulaire vide', () => {
    expect(getMissingFields(createEmptyForm())).toEqual(
      REQUIRED_FIELDS.map((field) => field.label),
    );
  });

  it('signale la note comme déjà remplie et ignore les assistants', () => {
    const labels = getMissingFields(createEmptyForm());
    expect(labels).not.toContain('Assistant 1');
    expect(labels).not.toContain('Auto-évaluation');
  });

  it('ne renvoie rien quand tous les champs obligatoires sont remplis', () => {
    expect(getMissingFields(completeForm)).toEqual([]);
  });

  it('détecte un mot manquant dans un tableau', () => {
    const form = { ...completeForm, words: ['Calme', '', 'Communication'] };
    expect(getMissingFields(form)).toEqual(['Mot 2']);
  });
});

describe('getUnfilledOptionalFields', () => {
  it('signale les assistants vides', () => {
    expect(getUnfilledOptionalFields(createEmptyForm())).toEqual(
      OPTIONAL_FIELDS.map((field) => field.label),
    );
  });

  it('devient vide dès que les assistants sont renseignés', () => {
    expect(getUnfilledOptionalFields(completeForm)).toEqual([]);
  });
});

describe('computeProgress', () => {
  it('ne vaut que la part de la note sur un formulaire vide', () => {
    expect(computeProgress(createEmptyForm())).toBe(5);
  });

  it('vaut 100 % quand tout est rempli', () => {
    expect(computeProgress(completeForm)).toBe(100);
  });

  it('augmente quand on remplit un champ', () => {
    const empty = createEmptyForm();
    const filled = { ...empty, homeTeam: 'CO Lutèce' };
    expect(computeProgress(filled)).toBeGreaterThan(computeProgress(empty));
  });

  it('ignore les assistants facultatifs', () => {
    const empty = createEmptyForm();
    const withAssistants = { ...empty, assistant1: 'DUPONT', assistant2: 'MARTIN' };
    expect(computeProgress(withAssistants)).toBe(computeProgress(empty));
  });
});

describe('normalizeForm', () => {
  it('complète un formulaire partiel avec les valeurs par défaut', () => {
    const form = normalizeForm({ homeTeam: 'CO Lutèce' });
    expect(form.homeTeam).toBe('CO Lutèce');
    expect(form.words).toEqual(['', '', '']);
    expect(form.rating).toBe('8');
  });

  it('écarte les clés inconnues et les valeurs de type inattendu', () => {
    const form = normalizeForm({ homeTeam: { x: 1 }, rating: null, matchNumber: 42, intrus: 'x' });
    expect(form.homeTeam).toBe('');
    expect(form.rating).toBe('8');
    expect(form.matchNumber).toBe('42');
    expect(form).not.toHaveProperty('intrus');
  });

  it('tronque les tableaux trop longs et complète les trop courts', () => {
    const form = normalizeForm({ words: ['un'], strengths: ['a', 'b', 'c'], facts: ['x', 'y'] });
    expect(form.words).toEqual(['un', '', '']);
    expect(form.strengths).toEqual(['a', 'b']);
    expect(form.facts).toEqual(['x', 'y']);
  });

  it('remplace les valeurs non textuelles des tableaux', () => {
    expect(normalizeForm({ words: [42, null, undefined] }).words).toEqual(['42', '', '']);
  });

  it('préserve les mots saisis en fin de tableau', () => {
    const form = normalizeForm({ words: ['calme', 'présence', 'communication'] });
    expect(form.words).toEqual(['calme', 'présence', 'communication']);
  });

  it('renvoie un formulaire vide pour une entrée invalide', () => {
    expect(normalizeForm(null)).toEqual(createEmptyForm());
    expect(normalizeForm('texte')).toEqual(createEmptyForm());
  });
});

describe('pickDetectedFields', () => {
  it('ignore les champs vides', () => {
    expect(pickDetectedFields({ homeTeam: 'CO Lutèce', awayTeam: '', referee: '  ' })).toEqual({
      homeTeam: 'CO Lutèce',
    });
  });

  it('renvoie un objet vide sans détection', () => {
    expect(pickDetectedFields(null)).toEqual({});
  });
});

describe('RELATION_OPTIONS', () => {
  it('expose les trois niveaux attendus', () => {
    expect(RELATION_OPTIONS.map((option) => option.value)).toEqual([
      'Très satisfaisante',
      'Satisfaisante',
      'À améliorer',
    ]);
  });
});
