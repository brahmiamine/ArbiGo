import { MapPin } from 'lucide-react';
import type { GeoPosition } from '@/domain/types';

export function currentPosition(): Promise<GeoPosition | undefined> {
  if (!navigator.geolocation) return Promise.resolve(undefined);
  return new Promise((resolve) =>
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: Math.round(coords.accuracy),
        }),
      () => resolve(undefined),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    ),
  );
}

export function ArrivalPosition({ position }: { position: GeoPosition }) {
  const { latitude, longitude, accuracy } = position;
  return (
    <p className="arrival-position">
      <MapPin size={15} aria-hidden="true" />
      <a
        href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Position enregistrée
      </a>{' '}
      (± {accuracy} m)
    </p>
  );
}
