import type { Match, MatchInput, Inventory } from '@/domain/types';
import { createMatch } from '@/domain/match';
import { templates } from '@/domain/templates';
import { api } from '@/lib/api';
import type { LocalStore } from '@/lib/local-store';
export async function updateDraft(
  m: Match,
  input: MatchInput,
  inventory: Inventory,
  store: LocalStore,
  demo: boolean,
) {
  if ((await store.pending()).some((o) => o.matchId === m.id))
    throw new Error(
      'Synchronisez les dernières modifications du sac avant de modifier la rencontre.',
    );
  let next: Match;
  if (demo) {
    next = createMatch(
      input,
      inventory.equipment,
      templates[input.practice],
      m.id,
      m.stepPreferences,
    );
    next.version = m.version + 1;
    next.appliedOperations = m.appliedOperations;
    next.outfits = structuredClone(inventory.outfits);
    next.bag = next.bag.map((i) => ({
      ...i,
      packed: m.bag.find((old) => old.id === i.id)?.packed ?? false,
    }));
  } else next = await api<Match>(`matches/${m.id}`, 'PATCH', { input, expectedVersion: m.version });
  await store.putMatch(next);
  return next;
}
