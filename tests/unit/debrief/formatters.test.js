import { describe, expect, it } from 'vitest';
import { formatDateFr, formatMatchLabel, formatRating, plural } from '@/domain/debrief/formatters';

describe('formatRating', () => {
  it('convertit le point en virgule', () => {
    expect(formatRating('7.5')).toBe('7,5');
  });

  it('laisse les entiers intacts', () => {
    expect(formatRating('8')).toBe('8');
  });

  it('gère les valeurs absentes', () => {
    expect(formatRating(undefined)).toBe('');
    expect(formatRating(null)).toBe('');
  });
});

describe('formatMatchLabel', () => {
  it('assemble les deux équipes', () => {
    expect(formatMatchLabel({ homeTeam: 'CO Lutèce', awayTeam: 'Grenelle' })).toBe(
      'CO Lutèce – Grenelle',
    );
  });

  it('tolère une équipe manquante', () => {
    expect(formatMatchLabel({ homeTeam: 'CO Lutèce', awayTeam: '' })).toBe('CO Lutèce');
    expect(formatMatchLabel({})).toBe('');
  });
});

describe('plural', () => {
  it('accorde au pluriel au-delà de 1', () => {
    expect(plural(1, 'champ')).toBe('champ');
    expect(plural(2, 'champ')).toBe('champs');
    expect(plural(0, 'champ')).toBe('champ');
  });

  it('accepte un pluriel irrégulier', () => {
    expect(plural(1, 'reste', 'restent')).toBe('reste');
    expect(plural(3, 'reste', 'restent')).toBe('restent');
  });
});

describe('formatDateFr', () => {
  it('convertit une date ISO en date française', () => {
    expect(formatDateFr('2026-10-06')).toBe('06/10/2026');
  });

  it('renvoie une chaîne vide sans date', () => {
    expect(formatDateFr('')).toBe('');
  });

  it('conserve une valeur non ISO', () => {
    expect(formatDateFr('samedi 6 octobre')).toBe('samedi 6 octobre');
  });

  it('ne décale pas la date selon le fuseau horaire', () => {
    expect(formatDateFr('2026-01-01')).toBe('01/01/2026');
    expect(formatDateFr('2026-12-31')).toBe('31/12/2026');
  });
});
