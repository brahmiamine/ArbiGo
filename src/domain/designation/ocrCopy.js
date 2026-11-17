import { plural } from '@/domain/debrief/formatters';

export const OCR_STATUS = {
  idle: 'Ajoute une capture de ta désignation',
  ready: 'Lecture de la capture…',
  initializing: 'Initialisation OCR…',
  invalidFile: 'Choisis une image ou une capture d’écran.',
  failed: 'Lecture impossible. Essaie une capture plus nette ou recadrée.',
  empty: 'Texte lu, mais aucune information n’a été reconnue automatiquement.',
  applied: 'Formulaire rempli automatiquement. Vérifie les valeurs détectées.',
};

export function detectedSummary(count) {
  return `${count} ${plural(count, 'information')} ${plural(count, 'détectée', 'détectées')}`;
}

export function detectedStatus(count) {
  return `${detectedSummary(count)}. Vérifie avant de remplir.`;
}

/** Phrase affichée dans l'en-tête de la fenêtre OCR. */
export function summarizeOcr({ busy, progress, detectedCount, hasFile }) {
  if (busy) return `Lecture en cours… ${progress}%`;
  if (detectedCount > 0) return `${detectedSummary(detectedCount)} — clique pour vérifier`;
  if (hasFile) return 'Capture prête — clique pour lancer la lecture';
  return 'Importe une capture : lecture et remplissage automatiques';
}
