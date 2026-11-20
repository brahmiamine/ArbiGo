import { afterEach, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/journey/route';

afterEach(() => vi.unstubAllGlobals());

it('recommends a departure that reaches the venue before the preparation deadline', async () => {
  const deadline = Date.now() + 3 * 3600000;
  const iso = (minutes: number) => new Date(deadline + minutes * 60000).toISOString();
  const provider = vi.fn(async (url: URL) => {
    if (url.hostname === 'data.geopf.fr')
      return Response.json({ features: [{ geometry: { coordinates: [2.35, 48.85] } }] });
    expect(url.searchParams.get('arriveBy')).toBe('true');
    expect(url.searchParams.get('time')).toBe(iso(0));
    return Response.json({
      itineraries: [
        { startTime: iso(-15), endTime: iso(5), duration: 1200 },
        { startTime: iso(-35), endTime: iso(-5), duration: 1800 },
        { startTime: iso(-40), endTime: iso(-10), duration: 1800 },
      ],
    });
  });
  vi.stubGlobal('fetch', provider);
  const request = new Request('https://app.test/api/journey', {
    method: 'POST',
    body: JSON.stringify({
      origin: '10 rue de Paris',
      destination: '13 rue Guillaumat',
      arriveBy: iso(0),
    }),
  });
  expect(await (await POST(request)).json()).toMatchObject({
    to: '48.85,2.35',
    trip: { startTime: iso(-35), duration: 1800 },
  });
  expect(provider).toHaveBeenCalledTimes(3);
});
