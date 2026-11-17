import { describe, expect, it } from 'vitest';
import {
  OCR_STATUS,
  detectedStatus,
  detectedSummary,
  summarizeOcr,
} from '@/domain/designation/ocrCopy';

describe('summarizeOcr', () => {
  it('annonce la progression pendant la lecture', () => {
    expect(summarizeOcr({ busy: true, progress: 42, detectedCount: 0, hasFile: true })).toBe(
      'Lecture en cours… 42%',
    );
  });

  it('résume les informations détectées', () => {
    expect(summarizeOcr({ busy: false, detectedCount: 3, hasFile: true })).toBe(
      '3 informations détectées — clique pour vérifier',
    );
  });

  it('accorde le résumé au singulier', () => {
    expect(summarizeOcr({ busy: false, detectedCount: 1, hasFile: true })).toBe(
      '1 information détectée — clique pour vérifier',
    );
  });

  it('invite à lancer la lecture quand une capture est prête', () => {
    expect(summarizeOcr({ busy: false, detectedCount: 0, hasFile: true })).toBe(
      'Capture prête — clique pour lancer la lecture',
    );
  });

  it('invite à importer une capture au repos', () => {
    expect(summarizeOcr({ busy: false, detectedCount: 0, hasFile: false })).toBe(
      'Importe une capture : lecture et remplissage automatiques',
    );
  });
});

describe('detectedStatus', () => {
  it('invite à vérifier avant de remplir', () => {
    expect(detectedStatus(2)).toBe('2 informations détectées. Vérifie avant de remplir.');
  });
});

describe('detectedSummary', () => {
  it('n’ajoute pas de ponctuation', () => {
    expect(detectedSummary(1)).toBe('1 information détectée');
  });
});

describe('OCR_STATUS', () => {
  it('couvre tous les états du parcours OCR', () => {
    expect(Object.keys(OCR_STATUS).sort()).toEqual(
      ['applied', 'empty', 'failed', 'idle', 'initializing', 'invalidFile', 'ready'].sort(),
    );
  });
});
