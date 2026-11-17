import { describe, expect, it } from 'vitest';
import { createEmptyForm } from '@/domain/debrief/formModel';
import { buildExportBaseName, buildExportFileName, slug } from '@/domain/debrief/fileName';

const fullForm = {
  ...createEmptyForm(),
  referee: 'NOM Prénom',
  matchNumber: '123456',
  homeTeam: 'CO Lutèce',
  awayTeam: 'Grenelle Paris A.S.',
  competition: 'Seniors D4 – Journée 1',
};

describe('slug', () => {
  it('supprime les accents et les caractères spéciaux', () => {
    expect(slug('CO Lutèce – Grenelle Paris A.S.')).toBe('co-lutece-grenelle-paris-a-s');
  });

  it('renvoie une chaîne vide pour une valeur absente', () => {
    expect(slug(undefined)).toBe('');
    expect(slug('')).toBe('');
  });

  it('ne laisse ni tiret initial ni tiret final', () => {
    expect(slug('  ...test...  ')).toBe('test');
  });
});

describe('buildExportBaseName', () => {
  it('concatène arbitre, numéro de match, équipes et compétition', () => {
    expect(buildExportBaseName(fullForm)).toBe(
      'nom-prenom_123456_co-lutece-vs-grenelle-paris-a-s_seniors-d4-journee-1',
    );
  });

  it('ignore les parties vides', () => {
    const form = { ...createEmptyForm(), matchNumber: '42', homeTeam: 'CO Lutèce' };
    expect(buildExportBaseName(form)).toBe('42_co-lutece');
  });

  it('retombe sur un nom générique pour un formulaire vide', () => {
    expect(buildExportBaseName(createEmptyForm())).toBe('debrief-arbitre');
  });

  it('utilise une seule équipe quand l’autre est absente', () => {
    const form = { ...createEmptyForm(), homeTeam: 'CO Lutèce' };
    expect(buildExportBaseName(form)).toBe('co-lutece');
  });
});

describe('buildExportFileName', () => {
  it('ajoute l’extension demandée', () => {
    expect(buildExportFileName(fullForm, 'pdf')).toMatch(/\.pdf$/);
    expect(buildExportFileName(fullForm, 'txt')).toMatch(/\.txt$/);
  });

  it('produit un nom de fichier sans caractère interdit', () => {
    expect(buildExportFileName(fullForm, 'pdf')).not.toMatch(/[\\/:*?"<>| ]/);
  });

  it('contient bien les quatre informations demandées', () => {
    const name = buildExportFileName(fullForm, 'pdf');
    expect(name).toContain('nom-prenom');
    expect(name).toContain('123456');
    expect(name).toContain('co-lutece-vs-grenelle-paris-a-s');
    expect(name).toContain('seniors-d4-journee-1');
  });
});
