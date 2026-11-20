import { NextResponse } from 'next/server';
import { z } from 'zod';
export async function GET(request: Request) {
  const parsed = z
    .object({
      latitude: z.coerce.number().min(-90).max(90),
      longitude: z.coerce.number().min(-180).max(180),
    })
    .safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ address: null }, { status: 400 });
  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.search = new URLSearchParams({
      lat: parsed.data.latitude.toFixed(4),
      lon: parsed.data.longitude.toFixed(4),
      format: 'jsonv2',
      'accept-language': 'fr',
      zoom: '18',
    }).toString();
    const response = await fetch(url, {
      headers: { 'User-Agent': 'ArbiGo/1.0 (https://arbigo.clubika.com)' },
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 86400 },
    });
    if (!response.ok) throw new Error('Unavailable');
    const data = await response.json();
    return NextResponse.json({
      address: typeof data.display_name === 'string' ? data.display_name.slice(0, 200) : null,
    });
  } catch {
    return NextResponse.json({ address: null });
  }
}
