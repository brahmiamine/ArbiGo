import { expect, it, vi, afterEach } from 'vitest';
import { GET } from '@/app/api/weather/route';
afterEach(() => vi.unstubAllGlobals());
it('refuses invalid coordinates and out-of-range dates without querying a provider', async () => {
  const spy = vi.fn();
  vi.stubGlobal('fetch', spy);
  expect(
    (
      await GET(
        new Request(
          'https://app.test/api/weather?latitude=999&longitude=2&kickoff=2026-12-01T14:00:00Z',
        ),
      )
    ).status,
  ).toBe(400);
  const result = await GET(
    new Request(
      'https://app.test/api/weather?latitude=48&longitude=2&kickoff=2030-12-01T14:00:00Z',
    ),
  );
  expect((await result.json()).hours).toEqual([]);
  expect(spy).not.toHaveBeenCalled();
});
it('uses the requested coordinates and UTC date, and tolerates provider failure', async () => {
  const spy = vi.fn().mockRejectedValue(new Error('offline'));
  vi.stubGlobal('fetch', spy);
  const kickoff = new Date(Date.now() + 3600000).toISOString();
  const result = await GET(
    new Request(
      `https://app.test/api/weather?latitude=43.6&longitude=1.44&kickoff=${encodeURIComponent(kickoff)}`,
    ),
  );
  expect((await result.json()).hours).toEqual([]);
  const url = new URL(spy.mock.calls[0][0]);
  expect(url.hostname).toBe('api.open-meteo.com');
  expect(url.searchParams.get('latitude')).toBe('43.6');
  expect(url.searchParams.get('timezone')).toBe('UTC');
});
