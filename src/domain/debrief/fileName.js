export function slug(value) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .toLowerCase();
}

const EXPORT_NAME_FALLBACK = 'debrief-arbitre';

/**
 * Nom de fichier d'export : arbitre + numéro de match + équipes + compétition.
 * Les parties vides sont ignorées pour rester lisible.
 */
export function buildExportBaseName(form) {
  const teams = [form.homeTeam, form.awayTeam].filter(Boolean).join(' vs ');
  const parts = [form.referee, form.matchNumber, teams, form.competition].map(slug).filter(Boolean);
  return parts.length ? parts.join('_') : EXPORT_NAME_FALLBACK;
}

export function buildExportFileName(form, extension) {
  return `${buildExportBaseName(form)}.${extension}`;
}
