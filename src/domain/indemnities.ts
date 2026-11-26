import { localDateParts } from './time';
import type { Match } from './types';

/**
 * Barème par défaut (€ par match, arbitre central), par catégorie normalisée.
 * À compléter avec l’annexe financière du District de Paris (75). Tant qu’une catégorie n’y
 * figure pas, elle n’a pas de tarif : l’arbitre saisit le montant sur la fiche du match.
 */
export const defaultIndemnityRates: Record<string, number> = {};

export const uncategorized = 'SANS CATÉGORIE';

/** « CDM D1 - Journée 5 » et « cdm d1 » relèvent de la même catégorie : « CDM D1 ». */
export function normalizeCategory(label?: string) {
  return (
    (label ?? '')
      .replace(/\s*[-–—:]\s*journ[ée]e\s*\d+.*$/i, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase() || uncategorized
  );
}

export const indemnityCategory = (match: Pick<Match, 'competition' | 'category'>) =>
  normalizeCategory(match.competition || match.category);

export const indemnityRates = (saved?: Record<string, number>) => ({
  ...defaultIndemnityRates,
  ...saved,
});

/** Montant propre au match, sinon tarif de sa catégorie ; `null` quand aucun tarif n’est connu. */
export function matchIndemnity(match: Match, rates: Record<string, number>) {
  return match.indemnity?.amount ?? rates[indemnityCategory(match)] ?? null;
}

export const euro = (amount: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);

const monthOf = (match: Match) => localDateParts(match.kickoffAt, match.timezone).date.slice(0, 7);
export const monthKey = (at: number | string | Date, timezone = 'Europe/Paris') =>
  localDateParts(new Date(at).toISOString(), timezone).date.slice(0, 7);
export function shiftMonth(key: string, delta: number) {
  const [year, month] = key.split('-').map(Number);
  const index = year * 12 + (month - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}
/** Saison sportive : de juillet à juin (« 2026-2027 »). */
export function seasonOf(key: string) {
  const [year, month] = key.split('-').map(Number);
  const start = month >= 7 ? year : year - 1;
  return `${start}-${start + 1}`;
}

export interface MonthIndemnities {
  key: string;
  done: number;
  planned: number;
  earned: number;
  expected: number;
  unpriced: number;
}
export interface IndemnityStats {
  months: { previous: MonthIndemnities; current: MonthIndemnities; next: MonthIndemnities };
  season: {
    label: string;
    done: number;
    planned: number;
    earned: number;
    average: number | null;
    byCategory: { category: string; done: number; earned: number }[];
  };
}

/** Une rencontre COMPLETED est jouée ; DRAFT/ACTIVE est à venir ; les autres statuts sont ignorés. */
export function indemnityStats(
  matches: Match[],
  rates: Record<string, number>,
  now = Date.now(),
  timezone = 'Europe/Paris',
): IndemnityStats {
  const current = monthKey(now, timezone);
  const season = seasonOf(current);
  const month = (key: string): MonthIndemnities => ({
    key,
    done: 0,
    planned: 0,
    earned: 0,
    expected: 0,
    unpriced: 0,
  });
  const months = {
    previous: month(shiftMonth(current, -1)),
    current: month(current),
    next: month(shiftMonth(current, 1)),
  };
  const stats: IndemnityStats = {
    months,
    season: { label: season, done: 0, planned: 0, earned: 0, average: null, byCategory: [] },
  };
  const categories = new Map<string, { category: string; done: number; earned: number }>();
  let priced = 0;
  for (const match of matches) {
    const played = match.status === 'COMPLETED';
    if (!played && !['DRAFT', 'ACTIVE'].includes(match.status)) continue;
    const key = monthOf(match);
    const amount = matchIndemnity(match, rates);
    const target = Object.values(months).find((m) => m.key === key);
    if (target) {
      target[played ? 'done' : 'planned']++;
      if (amount === null) target.unpriced++;
      else target[played ? 'earned' : 'expected'] += amount;
    }
    if (seasonOf(key) !== season) continue;
    if (!played) {
      stats.season.planned++;
      continue;
    }
    const category = indemnityCategory(match);
    const row = categories.get(category) ?? { category, done: 0, earned: 0 };
    row.done++;
    row.earned += amount ?? 0;
    categories.set(category, row);
    stats.season.done++;
    if (amount !== null) {
      stats.season.earned += amount;
      priced++;
    }
  }
  stats.season.average = priced ? stats.season.earned / priced : null;
  stats.season.byCategory = [...categories.values()].sort(
    (a, b) => b.done - a.done || a.category.localeCompare(b.category, 'fr'),
  );
  return stats;
}
