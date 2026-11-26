/**
 * In-app history. Every entry the app pushes carries its depth, so a "Retour" button knows
 * whether the previous entry is one of ours: `history.length` also counts other sites.
 * Only the app's own keys are passed in: Next.js copies its router state beside them.
 */
export const historyDepth = () => Number(window.history.state?.arbigoDepth) || 0;
export const savedScroll = () => Number(window.history.state?.arbigoScroll) || 0;

/** Keeps the scroll position on the current entry, before leaving its screen. */
export function rememberScroll() {
  window.history.replaceState(
    { arbigoDepth: historyDepth(), arbigoScroll: window.scrollY },
    '',
    window.location.href,
  );
}

export function pushEntry(url: string | URL) {
  window.history.pushState({ arbigoDepth: historyDepth() + 1 }, '', url);
}

export function replaceEntry(url: string | URL) {
  window.history.replaceState({ arbigoDepth: historyDepth() }, '', url);
}

/** Returns to the previous screen of the app, or to the logical parent on a direct opening. */
export function goBack(fallback: () => void) {
  if (historyDepth() > 0) window.history.back();
  else fallback();
}
