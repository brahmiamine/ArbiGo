import { describe, expect, it } from 'vitest';
import { initialNavigation, parentNavigation } from '@/lib/navigation';

describe('logical parent of a screen', () => {
  it('goes from a debrief to the match, then to the list', () => {
    const debrief = {
      ...initialNavigation,
      tab: 'matches' as const,
      activeId: 'm1',
      matchView: 'debrief' as const,
      matchFilter: 'history' as const,
    };
    const summary = parentNavigation(debrief);
    expect(summary).toMatchObject({ activeId: 'm1', matchView: 'summary' });
    expect(parentNavigation(summary)).toMatchObject({
      tab: 'matches',
      activeId: null,
      matchFilter: 'history',
    });
  });
  it('goes home from the screens opened by a home card', () => {
    for (const tab of ['bag', 'indemnity', 'stats'] as const)
      expect(parentNavigation({ ...initialNavigation, tab }).tab).toBe('home');
  });
  it('stays on a root screen', () => {
    const profile = { ...initialNavigation, tab: 'profile' as const };
    expect(parentNavigation(profile)).toBe(profile);
  });
});
