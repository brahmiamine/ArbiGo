import { DISTRICT75_LOGO, FFF_LOGO, loadLogoDataUrls } from '../../assets/logos.js';
import { formatDateFr, formatMatchLabel, formatRating } from '@/domain/debrief/formatters';
import { buildExportFileName } from '@/domain/debrief/fileName';
import { FONT, LINE_HEIGHT, LOGO, PAGE, PDF_COLORS, SPACING } from './debriefTheme';

const CONTENT_WIDTH = PAGE.width - PAGE.marginX * 2;

/**
 * Petit écrivain séquentiel : garde la position verticale courante, gère les sauts de page
 * et expose des primitives de mise en page (libellé, titre de section, paragraphe…).
 */
function createPageWriter(doc, { fffLogo, districtLogo }) {
  let y = 16;

  /** Un logo illisible ne doit jamais empêcher la génération du débrief : on l'omet. */
  const addLogo = (source, x, width) => {
    try {
      doc.addImage(source, 'PNG', x, LOGO.top, width, LOGO.height);
    } catch (error) {
      console.warn('Logo ignoré dans le PDF', error);
    }
  };

  const addHeader = () => {
    addLogo(fffLogo, PAGE.marginX, LOGO.fffWidth);
    addLogo(districtLogo, PAGE.width - PAGE.marginX - LOGO.districtWidth, LOGO.districtWidth);
    doc.setFont(FONT.family, 'bold');
    doc.setFontSize(FONT.header);
    doc.setTextColor(...PDF_COLORS.blue);
    doc.text('DÉBRIEF ARBITRE APRÈS-MATCH', PAGE.width / 2, 17, { align: 'center' });
    doc.setFontSize(FONT.headerSmall);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text('FÉDÉRATION FRANÇAISE DE FOOTBALL', PAGE.width / 2, 22, { align: 'center' });
    doc.text('DISTRICT DE PARIS DE FOOTBALL', PAGE.width / 2, 26, { align: 'center' });
    doc.setDrawColor(...PDF_COLORS.red);
    doc.setLineWidth(0.8);
    doc.line(PAGE.marginX, 33, PAGE.width - PAGE.marginX, 33);
    doc.setDrawColor(...PDF_COLORS.gold);
    doc.setLineWidth(0.25);
    doc.line(PAGE.marginX, 34.5, PAGE.width - PAGE.marginX, 34.5);
    y = PAGE.headerBottom;
  };

  const ensureSpace = (needed = 18) => {
    if (y + needed <= PAGE.height - PAGE.contentBottom) return;
    doc.addPage();
    addHeader();
  };

  const paragraph = (text, { prefix = '', muted = false } = {}) => {
    doc.setFont(FONT.family, 'normal');
    doc.setFontSize(FONT.body);
    doc.setTextColor(...(muted ? PDF_COLORS.muted : PDF_COLORS.text));
    const lines = doc.splitTextToSize(`${prefix}${text || '—'}`, CONTENT_WIDTH);
    for (const line of lines) {
      ensureSpace(LINE_HEIGHT + 2);
      doc.setFont(FONT.family, 'normal');
      doc.setFontSize(FONT.body);
      doc.setTextColor(...(muted ? PDF_COLORS.muted : PDF_COLORS.text));
      doc.text(line, PAGE.marginX, y);
      y += LINE_HEIGHT;
    }
    y += 2;
  };

  return {
    addHeader,
    ensureSpace,
    paragraph,
    get y() {
      return y;
    },
    set y(value) {
      y = value;
    },
    labelValue(label, value) {
      ensureSpace(7);
      doc.setFontSize(FONT.label);
      doc.setFont(FONT.family, 'bold');
      doc.setTextColor(...PDF_COLORS.blue);
      const labelWidth = doc.getTextWidth(`${label} : `);
      doc.setFont(FONT.family, 'normal');
      doc.setTextColor(...PDF_COLORS.text);
      const lines = doc.splitTextToSize(value || '—', CONTENT_WIDTH - labelWidth);
      lines.forEach((line, index) => {
        ensureSpace(LINE_HEIGHT + 2);
        if (index === 0) {
          doc.setFont(FONT.family, 'bold');
          doc.setTextColor(...PDF_COLORS.blue);
          doc.text(`${label} :`, PAGE.marginX, y);
        }
        doc.setFont(FONT.family, 'normal');
        doc.setFontSize(FONT.body);
        doc.setTextColor(...PDF_COLORS.text);
        doc.text(line, PAGE.marginX + labelWidth, y);
        y += LINE_HEIGHT;
      });
      y += 1;
    },
    sectionTitle(number, title) {
      ensureSpace(13);
      y += 2;
      doc.setFillColor(...PDF_COLORS.blue);
      doc.roundedRect(PAGE.marginX, y - 4.3, CONTENT_WIDTH, 8, 1.5, 1.5, 'F');
      doc.setFont(FONT.family, 'bold');
      doc.setFontSize(FONT.title);
      doc.setTextColor(...PDF_COLORS.white);
      doc.text(`${number}. ${title}`, PAGE.marginX + 3, y + 0.8);
      y += SPACING.section;
    },
    /** Intertitre coloré suivi d'une ligne vide (utilisé pour les faits marquants). */
    emphasis(text, color = PDF_COLORS.red) {
      ensureSpace(9);
      doc.setFont(FONT.family, 'bold');
      doc.setTextColor(...color);
      doc.setFontSize(FONT.small);
      doc.text(text, PAGE.marginX, y);
      y += 4.8;
    },
  };
}

const IDENTITY_ROWS = [
  ['MATCH N°', (form) => form.matchNumber],
  ['Équipe domicile', (form) => form.homeTeam],
  ['Équipe extérieur', (form) => form.awayTeam],
  ['Date', (form) => formatDateFr(form.date)],
  ['Heure', (form) => form.time],
  ['Compétition', (form) => form.competition],
  ['Arbitre', (form) => form.referee],
  ['Assistant 1', (form) => form.assistant1],
  ['Assistant 2', (form) => form.assistant2],
];

function writeIdentity(writer, form) {
  IDENTITY_ROWS.forEach(([label, get]) => writer.labelValue(label, get(form)));
}

function writeSections(writer, form) {
  writer.sectionTitle('1', 'MON MATCH EN 3 MOTS');
  writer.paragraph(form.words.filter(Boolean).join('  /  ') || '—');

  writer.sectionTitle('2', 'MES 2 POINTS FORTS');
  writer.paragraph(form.strengths[0], { prefix: '1. ' });
  writer.paragraph(form.strengths[1], { prefix: '2. ' });

  writer.sectionTitle('3', "MON PRINCIPAL POINT D'AMÉLIORATION");
  writer.paragraph(form.improvement);

  writer.sectionTitle('4', 'LES 2 FAITS MARQUANTS');
  writer.emphasis('Décision / situation n°1');
  writer.paragraph(form.facts[0]);
  writer.emphasis('Décision / situation n°2');
  writer.paragraph(form.facts[1]);

  writer.sectionTitle('5', 'RELATIONNEL / GESTION DU MATCH');
  writer.paragraph(`Niveau : ${form.relation || '—'}`);
  writer.paragraph(form.relationWhy);

  writer.sectionTitle('6', 'AUTO-ÉVALUATION');
  writer.paragraph(`Ma prestation globale : ${formatRating(form.rating) || '—'}/10`);
  writer.emphasis('Si je devais refaire le match, je changerais :', PDF_COLORS.gold);
  writer.paragraph(form.redo);

  writer.sectionTitle('7', 'MON OBJECTIF POUR LE PROCHAIN MATCH');
  writer.paragraph(`Je veux progresser sur : ${form.objective || '—'}`);
}

function writeFooters(doc, form) {
  const totalPages = doc.getNumberOfPages();
  const mention = `Débrief d'après-match • ${form.referee || 'Arbitre'} • ${formatMatchLabel(form) || 'Rencontre'}`;

  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...PDF_COLORS.line);
    doc.line(
      PAGE.marginX,
      PAGE.height - PAGE.footerRuleY,
      PAGE.width - PAGE.marginX,
      PAGE.height - PAGE.footerRuleY,
    );
    doc.setFontSize(FONT.footer);
    doc.setFont(FONT.family, 'normal');
    doc.setTextColor(...PDF_COLORS.muted);
    const footer = doc.splitTextToSize(mention, CONTENT_WIDTH - 16);
    doc.text(
      `${footer[0]}${footer.length > 1 ? '…' : ''}`,
      PAGE.marginX,
      PAGE.height - PAGE.footerTextY,
    );
    doc.text(`${page}/${totalPages}`, PAGE.width - PAGE.marginX, PAGE.height - PAGE.footerTextY, {
      align: 'right',
    });
  }
}

/** Construit le document PDF du débrief (sans le sauvegarder), pour pouvoir le tester. */
export function createDebriefDocument(
  form,
  JsPDF,
  { fffLogo = FFF_LOGO, districtLogo = DISTRICT75_LOGO } = {},
) {
  const doc = new JsPDF({ unit: 'mm', format: 'a4', compress: true });
  const writer = createPageWriter(doc, { fffLogo, districtLogo });

  writer.addHeader();
  writeIdentity(writer, form);
  writeSections(writer, form);
  writeFooters(doc, form);

  return doc;
}

/** Génère puis télécharge le PDF. jsPDF est chargé à la demande pour ne pas alourdir le bundle initial. */
export async function exportDebriefPdf(form) {
  const [{ jsPDF }, { fffLogo, districtLogo }] = await Promise.all([
    import('jspdf'),
    loadLogoDataUrls(),
  ]);
  const doc = createDebriefDocument(form, jsPDF, { fffLogo, districtLogo });
  doc.save(buildExportFileName(form, 'pdf'));
  return doc;
}
