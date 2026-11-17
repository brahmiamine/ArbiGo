/** Note à la française : 7.5 → « 7,5 ». */
export function formatRating(value) {
  return String(value ?? '').replace('.', ',');
}

/** Libellé « domicile – extérieur » utilisé dans les exports. */
export function formatMatchLabel(form) {
  return [form.homeTeam, form.awayTeam].filter(Boolean).join(' – ');
}

export function plural(count, singular, pluralForm = `${singular}s`) {
  return count > 1 ? pluralForm : singular;
}

const DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** Date ISO (yyyy-mm-dd) → « 06/10/2026 », sans dépendre du fuseau horaire. */
export function formatDateFr(isoDate) {
  if (!isoDate) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate;
  const [, year, month, day] = match;
  return DATE_FORMATTER.format(new Date(Number(year), Number(month) - 1, Number(day)));
}
