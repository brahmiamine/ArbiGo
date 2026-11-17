import { jsPDF } from 'jspdf';
import { describe, expect, it, vi } from 'vitest';
import { createEmptyForm } from '@/domain/debrief/formModel';
import { TEST_LOGOS } from './fixtures';
import { createDebriefDocument } from '@/features/debrief/services/pdf/debriefPdf';
import { LOGO } from '@/features/debrief/services/pdf/debriefTheme';

const fullForm = {
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

const build = (form) => createDebriefDocument(form, jsPDF, TEST_LOGOS);

describe('createDebriefDocument', () => {
  it('produit un PDF valide', () => {
    const output = build(fullForm).output('arraybuffer');
    const header = new TextDecoder().decode(new Uint8Array(output, 0, 4));
    expect(header).toBe('%PDF');
    expect(output.byteLength).toBeGreaterThan(1000);
  });

  it('tient sur une page pour un débrief complet', () => {
    expect(build(fullForm).getNumberOfPages()).toBe(1);
  });

  it('ajoute des pages quand le contenu est très long', () => {
    const longForm = {
      ...fullForm,
      improvement: 'Description très longue. '.repeat(200),
      redo: 'Autre description très longue. '.repeat(200),
    };
    expect(build(longForm).getNumberOfPages()).toBeGreaterThan(1);
  });

  it('génère aussi un document pour un formulaire vide', () => {
    expect(() => build(createEmptyForm())).not.toThrow();
  });

  it('génère quand même le PDF si un logo est illisible', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const doc = createDebriefDocument(fullForm, jsPDF, {
      fffLogo: '/assets/inconnu.png',
      districtLogo: '/assets/inconnu.png',
    });
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it('accepte des logos injectés (utile pour les tests)', () => {
    const addImage = vi.fn();
    const FakePdf = function FakePdf() {
      return {
        addImage,
        setFont: vi.fn(),
        setFontSize: vi.fn(),
        setTextColor: vi.fn(),
        setDrawColor: vi.fn(),
        setLineWidth: vi.fn(),
        setFillColor: vi.fn(),
        text: vi.fn(),
        line: vi.fn(),
        rect: vi.fn(),
        roundedRect: vi.fn(),
        addPage: vi.fn(),
        splitTextToSize: vi.fn(() => ['ligne']),
        getTextWidth: vi.fn(() => 10),
        getNumberOfPages: vi.fn(() => 1),
        setPage: vi.fn(),
      };
    };
    createDebriefDocument(fullForm, FakePdf, {
      fffLogo: 'data:fff',
      districtLogo: 'data:district',
    });
    expect(addImage).toHaveBeenCalledWith(
      'data:fff',
      'PNG',
      expect.any(Number),
      LOGO.top,
      LOGO.fffWidth,
      LOGO.height,
    );
    expect(addImage).toHaveBeenCalledWith(
      'data:district',
      'PNG',
      expect.any(Number),
      LOGO.top,
      LOGO.districtWidth,
      LOGO.height,
    );
  });
});
it('never emits a long narrative below the printable page area', () => {
  const positions = [];
  function TrackedPdf(options) {
    const doc = new jsPDF(options),
      original = doc.text.bind(doc);
    doc.text = (text, x, y, ...rest) => {
      positions.push(y);
      return original(text, x, y, ...rest);
    };
    return doc;
  }
  const doc = createDebriefDocument(
    {
      ...fullForm,
      improvement: 'Une décision à analyser. '.repeat(250),
      redo: 'Une autre situation. '.repeat(250),
    },
    TrackedPdf,
    TEST_LOGOS,
  );
  expect(doc.getNumberOfPages()).toBeGreaterThan(2);
  expect(positions.every((y) => y <= 281 || y === 290)).toBe(true);
});
