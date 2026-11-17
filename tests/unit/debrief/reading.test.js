import { describe, expect, it } from 'vitest';
import { needsSecondReading, pickBestReading, readingScore } from '@/domain/designation/reading';

const complete = {
  matchNumber: '56608650',
  homeTeam: 'MAYDAY FC',
  awayTeam: 'BENFICA ARGOSELO S.',
  date: '2026-10-04',
  time: '11:00',
  referee: 'MOHAMED BRAHMI',
};

describe('needsSecondReading', () => {
  it('ne relit pas une désignation dont les deux équipes sont plausibles', () => {
    expect(needsSecondReading(complete)).toBe(false);
  });

  it.each([
    ['équipe absente', { ...complete, homeTeam: '' }],
    ['nom réduit à du bruit', { ...complete, homeTeam: 'HN' }],
    ['équipe extérieur absente', { ...complete, awayTeam: '' }],
  ])('relit quand %s', (_, fields) => {
    expect(needsSecondReading(fields)).toBe(true);
  });
});

describe('readingScore', () => {
  it('compte les champs essentiels lus', () => {
    expect(readingScore(complete)).toBe(6);
    expect(readingScore({ ...complete, referee: '', matchNumber: '' })).toBe(4);
  });

  it('ne compte pas un nom d’équipe invraisemblable', () => {
    expect(readingScore({ ...complete, homeTeam: 'HN' })).toBe(5);
  });
});

describe('pickBestReading', () => {
  const extract = (text) =>
    ({ première: { ...complete, homeTeam: 'HN' }, seconde: complete })[text];

  it('retient la seconde lecture quand elle est meilleure', () => {
    expect(pickBestReading('première', 'seconde', extract)).toBe('seconde');
  });

  it('garde la première à égalité', () => {
    expect(pickBestReading('seconde', 'seconde', extract)).toBe('seconde');
    expect(pickBestReading('première', 'première', extract)).toBe('première');
  });

  it('garde la première quand la seconde est moins bonne', () => {
    expect(pickBestReading('seconde', 'première', extract)).toBe('seconde');
  });
});
