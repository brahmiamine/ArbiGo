import { expect, it, vi, afterEach } from 'vitest';
import { GET } from '@/app/api/weather/address/route';
afterEach(() => vi.unstubAllGlobals());
it('validates coordinates before querying the address provider', async () => {
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  expect(
    (await GET(new Request('https://app.test/api/weather/address?latitude=999&longitude=2')))
      .status,
  ).toBe(400);
  expect(fetcher).not.toHaveBeenCalled();
});
it('returns a detected address and tolerates provider unavailability', async () => {
  const fetcher = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ display_name: '13 rue du Général Guillaumat, Paris' }),
  });
  vi.stubGlobal('fetch', fetcher);
  const request = new Request('https://app.test/api/weather/address?latitude=48.85&longitude=2.35');
  expect((await (await GET(request)).json()).address).toContain('Paris');
  expect(new URL(fetcher.mock.calls[0][0]).hostname).toBe('nominatim.openstreetmap.org');
  fetcher.mockRejectedValueOnce(new Error('offline'));
  expect((await (await GET(request)).json()).address).toBeNull();
});

import { hasUpcomingForecast } from '@/domain/weather';
it('only shows forecasts for upcoming matches within the provider horizon', () => {
  const now = Date.parse('2026-11-20T10:00:00Z');
  const upcoming = { status: 'DRAFT', kickoffAt: '2026-11-22T14:00:00Z' };
  expect(hasUpcomingForecast(upcoming, now)).toBe(true);
  for (const status of ['COMPLETED', 'CANCELLED', 'POSTPONED'])
    expect(hasUpcomingForecast({ ...upcoming, status }, now)).toBe(false);
  expect(hasUpcomingForecast({ ...upcoming, kickoffAt: '2026-11-19T14:00:00Z' }, now)).toBe(false);
  expect(hasUpcomingForecast({ ...upcoming, kickoffAt: '2027-01-01T14:00:00Z' }, now)).toBe(false);
});
