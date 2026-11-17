import type { Match } from '@/domain/types';
export type Tab = 'home' | 'matches' | 'bag' | 'profile';
export interface AppNavigation {
  tab: Tab;
  activeId: string | null;
  matchView: 'summary' | 'debrief';
  matchFilter: 'upcoming' | 'history';
  inventoryView: 'items' | 'outfits';
}
export const initialNavigation: AppNavigation = {
  tab: 'home',
  activeId: null,
  matchView: 'summary',
  matchFilter: 'upcoming',
  inventoryView: 'items',
};
export function readNavigation(search: string): AppNavigation {
  const params = new URLSearchParams(search);
  const page = params.get('page');
  return {
    ...initialNavigation,
    tab: ['home', 'matches', 'bag', 'profile'].includes(page ?? '') ? (page as Tab) : 'home',
    activeId: params.get('match'),
    matchView: params.get('view') === 'debrief' ? 'debrief' : 'summary',
    matchFilter: params.get('filter') === 'history' ? 'history' : 'upcoming',
    inventoryView: params.get('view') === 'outfits' ? 'outfits' : 'items',
  };
}
/** Resolve URLs only against the signed-in account's loaded matches. */
export function resolveNavigation(navigation: AppNavigation, matches: Match[]): AppNavigation {
  const active = matches.find((m) => m.status === 'ACTIVE');
  const match = active ?? matches.find((m) => m.id === navigation.activeId);
  if (!match) return { ...navigation, activeId: null, matchView: 'summary' };
  return {
    ...navigation,
    tab: 'matches',
    activeId: match.id,
    matchFilter: ['DRAFT', 'ACTIVE'].includes(match.status) ? 'upcoming' : 'history',
    matchView:
      navigation.matchView === 'debrief' && match.status === 'COMPLETED' && match.finishedAt
        ? 'debrief'
        : 'summary',
  };
}
export function navigationSearch(navigation: AppNavigation, currentSearch = ''): string {
  const params = new URLSearchParams(currentSearch);
  for (const key of ['page', 'match', 'view', 'filter']) params.delete(key);
  if (navigation.tab !== 'home') params.set('page', navigation.tab);
  if (navigation.activeId) {
    params.set('match', navigation.activeId);
    if (navigation.matchView === 'debrief') params.set('view', 'debrief');
  } else if (navigation.tab === 'matches' && navigation.matchFilter === 'history')
    params.set('filter', 'history');
  if (navigation.tab === 'bag' && navigation.inventoryView === 'outfits')
    params.set('view', 'outfits');
  return params.size ? `?${params.toString()}` : '';
}
