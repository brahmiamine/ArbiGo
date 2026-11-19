import { NextResponse } from 'next/server';
import { z } from 'zod';
import { matchWeatherHours } from '@/domain/weather';
export async function GET(request: Request) {
  const parsed = z
    .object({
      latitude: z.coerce.number().min(-90).max(90),
      longitude: z.coerce.number().min(-180).max(180),
      kickoff: z.iso.datetime({ offset: true }),
    })
    .safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success)
    return NextResponse.json({ hours: [], reason: 'Lieu ou date invalide' }, { status: 400 });
  const { latitude, longitude, kickoff } = parsed.data,
    distance = Date.parse(kickoff) - Date.now();
  if (distance < -86400000 || distance > 15 * 86400000)
    return NextResponse.json({
      hours: [],
      reason: 'Prévisions disponibles à l’approche du match (jusqu’à 15 jours).',
    });
  try {
    const date = new Date(kickoff).toISOString().slice(0, 10),
      end = new Date(Date.parse(kickoff) + 2 * 3600000).toISOString().slice(0, 10);
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.search = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      hourly: 'temperature_2m,weather_code,precipitation_probability,wind_gusts_10m',
      timezone: 'UTC',
      timeformat: 'unixtime',
      start_date: date,
      end_date: end,
    }).toString();
    const response = await fetch(url, {
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 3600 },
    });
    if (!response.ok) throw new Error('Unavailable');
    const hours = matchWeatherHours(await response.json(), kickoff);
    return NextResponse.json({
      hours,
      reason: hours.length ? '' : 'Prévisions indisponibles pour cet horaire.',
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ hours: [], reason: 'Service météo temporairement indisponible.' });
  }
}
