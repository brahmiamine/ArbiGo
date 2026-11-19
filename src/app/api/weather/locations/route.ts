import { NextResponse } from 'next/server';
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (q.length < 2 || q.length > 100) return NextResponse.json({ locations: [] });
  try {
    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.search = new URLSearchParams({
      name: q,
      count: '5',
      language: 'fr',
      format: 'json',
    }).toString();
    const response = await fetch(url, {
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 86400 },
    });
    if (!response.ok) throw new Error('Unavailable');
    const data = await response.json();
    return NextResponse.json({
      locations: (data.results ?? [])
        .filter(
          (r: { latitude: number; longitude: number }) =>
            Number.isFinite(r.latitude) && Number.isFinite(r.longitude),
        )
        .map(
          (r: {
            name: string;
            admin1?: string;
            country?: string;
            latitude: number;
            longitude: number;
          }) => ({
            name: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
            latitude: r.latitude,
            longitude: r.longitude,
          }),
        ),
    });
  } catch {
    return NextResponse.json({ locations: [], unavailable: true });
  }
}
