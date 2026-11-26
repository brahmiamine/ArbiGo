import { describe, expect, it } from 'vitest';
import { extractDesignationFields } from '@/domain/designation/designation';
import { needsSecondReading } from '@/domain/designation/reading';

// Lecture OCR d’une capture mobile : barre d’état, écussons lus comme des bribes, année de club.
const text = [
  '11:12 © 68%',
  'District Parisien de Football ~ x',
  'Dimanche 29 novembre 2026- 15H00',
  'SENIORS D4 - POULE A - Journée 6',
  'CL ~ QJ',
  'TROPS FC ~ MFC 1871',
  'Stade Déjerine n° 2',
  'Arbitre centre',
].join('\n');

describe('mobile designation capture', () => {
  it('reads both full team names and the kickoff time, not the phone clock', () => {
    const fields = extractDesignationFields(text);
    expect(fields).toMatchObject({
      homeTeam: 'TROPS FC',
      awayTeam: 'MFC 1871',
      date: '2026-11-29',
      time: '15:00',
    });
    expect(needsSecondReading(fields)).toBe(false);
  });
});
