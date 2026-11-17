import { describe, expect, it } from 'vitest';
import { COLUMN_SEPARATOR, tsvToText } from '@/domain/designation/layout';

/** Ligne TSV de Tesseract : niveau, page, bloc, paragraphe, ligne, mot, gauche, haut, largeur… */
const word = ({ block = 1, line = 1, index = 1, text, left, width = 100, top = 100 }) =>
  [
    '5',
    '1',
    String(block),
    '1',
    String(line),
    String(index),
    String(left),
    String(top),
    String(width),
    '30',
    '92',
    text,
  ].join('\t');

const HEADER = ['1', '1', '0', '0', '0', '0', '0', '0', '0', '0', '-1', ''].join('\t');

const tsv = (...rows) => [HEADER, ...rows].join('\n');

const read = (...rows) => tsvToText(tsv(...rows));

const row = (text, left, options = {}) => word({ text, left, ...options });

describe('tsvToText', () => {
  it('recolle les mots d’une ligne et marque la colonne de droite', () => {
    const text = read(
      row('MAYDAY', 50),
      row('FC', 180, { index: 2 }),
      row('BENFICA', 528, { index: 3 }),
      row('ARGOSELO', 668, { index: 4 }),
      row('S.', 828, { index: 5 }),
    );

    expect(text).toBe(`MAYDAY FC ${COLUMN_SEPARATOR} BENFICA ARGOSELO S.`);
  });

  it('garde la lecture normale d’une phrase à la typographie large', () => {
    // Une ligne pleine largeur : ses espaces larges ne sont pas une gouttière.
    const text = read(
      row('Arbitre', 109, { width: 120 }),
      row('centre', 240, { width: 120, index: 2 }),
      row('MOHAMED', 560, { width: 150, index: 3 }),
      row('BRAHMI', 740, { width: 130, index: 4 }),
      row('Numéro', 978, { width: 120, index: 5 }),
      row('du', 1108, { width: 40, index: 6 }),
      row('match', 1160, { width: 90, index: 7 }),
      row('56608650', 1574, { width: 140, index: 8 }),
      row('|', 1827, { width: 20, index: 9 }),
      row('+', 1850, { width: 20, index: 10 }),
      row('|', 1891, { width: 20, index: 11 }),
      row('a', 2033, { width: 20, index: 12 }),
      row('JF', 2232, { width: 40, index: 13 }),
    );

    expect(text).toBe('Arbitre centre MOHAMED BRAHMI Numéro du match 56608650 | + | a JF');
  });

  it('marque une ligne qui n’occupe que la colonne de droite', () => {
    const text = read(
      row('MAYDAY', 50),
      row('FC', 180, { index: 2 }),
      row('BENFICA', 528, { index: 3 }),
      row('ARGOSELO', 668, { index: 4 }),
      row('S.', 528, { line: 2 }),
    );

    expect(text.split('\n')[1]).toBe(`${COLUMN_SEPARATOR} S.`);
  });

  it('respecte la ligne de lecture de Tesseract', () => {
    const text = read(
      row('Première', 40, { top: 100 }),
      row('Deuxième', 40, { line: 2, top: 160 }),
    );

    expect(text.split('\n')).toEqual(['Première', 'Deuxième']);
  });

  it('ne mélange pas des lignes portant le même numéro dans des blocs différents', () => {
    const text = read(
      row('MATCH', 30),
      row('123456', 150, { index: 2 }),
      row('Arbitre', 30, { block: 2, top: 200 }),
      row('centre', 150, { block: 2, index: 2, top: 200 }),
    );

    expect(text.split('\n')).toEqual(['MATCH 123456', 'Arbitre centre']);
  });

  it('renvoie une chaîne vide sans mot exploitable', () => {
    expect(tsvToText('')).toBe('');
    expect(tsvToText(HEADER)).toBe('');
    expect(tsvToText(undefined)).toBe('');
  });
});
