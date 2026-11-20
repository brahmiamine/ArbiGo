'use client';
import { useEffect, useState } from 'react';
import type { WeatherLocation } from '@/domain/weather';
export function WeatherLocationPicker({
  value,
  onChange,
  label = 'Ville du stade pour la météo',
}: {
  value?: WeatherLocation;
  onChange: (value?: WeatherLocation) => void;
  label?: string;
}) {
  const [query, setQuery] = useState(value?.name ?? ''),
    [locations, setLocations] = useState<WeatherLocation[]>([]),
    [error, setError] = useState('');
  useEffect(() => {
    if (query.length < 2 || query === value?.name) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void fetch(`/api/weather/locations?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then((r) => r.json())
        .then((data) => {
          setLocations(data.locations);
          setError(
            data.unavailable
              ? 'Recherche de lieu indisponible. Vous pouvez créer le match sans météo.'
              : data.locations.length
                ? ''
                : 'Aucun lieu trouvé. Essayez la ville du stade.',
          );
        })
        .catch(() => {});
    }, 500);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, value?.name]);
  return (
    <div className="weather-location-picker">
      <label>
        {label} <span className="optional">facultatif</span>
        <input
          value={query}
          placeholder="Rechercher la ville du stade"
          onChange={(event) => {
            setQuery(event.target.value);
            onChange(undefined);
            setLocations([]);
          }}
          autoComplete="off"
          maxLength={100}
        />
      </label>
      <button
        type="button"
        className="button secondary"
        onClick={() => {
          if (!navigator.geolocation) {
            setError('La localisation n’est pas disponible sur cet appareil.');
            return;
          }
          setError('Recherche de votre position…');
          navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
              const location = {
                name: 'Position du téléphone',
                latitude: coords.latitude,
                longitude: coords.longitude,
              };
              onChange(location);
              setQuery(location.name);
              setLocations([]);
              setError('');
            },
            () =>
              setError('Position indisponible ou accès refusé. Vous pouvez rechercher une ville.'),
            { timeout: 10000, maximumAge: 300000 },
          );
        }}
      >
        Utiliser ma position
      </button>
      {locations.length > 0 && (
        <ul aria-label="Lieux météo proposés">
          {locations.map((location) => (
            <li key={`${location.latitude}:${location.longitude}`}>
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  onChange(location);
                  setQuery(location.name);
                  setLocations([]);
                  setError('');
                }}
              >
                {location.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {value && <small>Lieu retenu : {value.name} · Source Open-Meteo</small>}
      {error && <p role="status">{error}</p>}
    </div>
  );
}
