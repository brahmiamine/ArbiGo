import { NextResponse } from 'next/server';
import { z } from 'zod';

const requestSchema = z.object({
  origin: z.string().trim().max(200),
  destination: z.string().trim().min(3).max(200),
  arriveBy: z.iso.datetime().optional(),
});

async function geocode(address: string) {
  if (!address) return null;
  const url = new URL('https://data.geopf.fr/geocodage/search');
  url.search = new URLSearchParams({ q: address, limit: '1' }).toString();
  const response = await fetch(url, { signal: AbortSignal.timeout(6000), cache: 'no-store' });
  if (!response.ok) return null;
  const data = await response.json();
  const coordinates = data.features?.[0]?.geometry?.coordinates;
  if (
    !Array.isArray(coordinates) ||
    coordinates.length !== 2 ||
    !coordinates.every(Number.isFinite)
  )
    return null;
  return `${coordinates[1]},${coordinates[0]}`;
}

export async function POST(request: Request) {
  const input = requestSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({}, { status: 400 });
  const { origin, destination, arriveBy } = input.data;
  let from: string | null = null;
  let to: string | null = null;
  try {
    [from, to] = await Promise.all([geocode(origin), geocode(destination)]);
    if (!from || !to || !arriveBy || Date.parse(arriveBy) <= Date.now())
      return NextResponse.json({ from, to });
    const url = new URL('https://api.transitous.org/api/v6/plan');
    url.search = new URLSearchParams({
      fromPlace: from,
      toPlace: to,
      time: arriveBy,
      arriveBy: 'true',
      preTransitModes: 'WALK',
      postTransitModes: 'WALK',
      directModes: 'WALK',
      maxDirectTime: '2700',
      numItineraries: '4',
    }).toString();
    const response = await fetch(url, { signal: AbortSignal.timeout(20000), cache: 'no-store' });
    if (!response.ok) return NextResponse.json({ from, to });
    const data = await response.json();
    const itineraries = [...(data.itineraries ?? []), ...(data.direct ?? [])] as {
      startTime: string;
      endTime: string;
      duration: number;
    }[];
    const trip = itineraries
      .filter(
        (item) =>
          item.duration > 0 &&
          Date.parse(item.startTime) > Date.now() &&
          Date.parse(item.endTime) <= Date.parse(arriveBy) &&
          Date.parse(item.endTime) > Date.parse(item.startTime),
      )
      .sort((a, b) => Date.parse(b.startTime) - Date.parse(a.startTime))[0];
    return NextResponse.json({ from, to, trip });
  } catch {
    return NextResponse.json({ from, to });
  }
}
