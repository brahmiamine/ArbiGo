'use client';
import { useEffect, useState } from 'react';
import { CloudSun } from 'lucide-react';
import { weatherLabel, type WeatherHour } from '@/domain/weather';
import type { Match } from '@/domain/types';
import { useApp } from '../app-provider';
export function MatchWeather({ match, compact = true }: { match: Match; compact?: boolean }) {
  const [saved, setResult] = useState<{ query: string; hours: WeatherHour[]; reason?: string }>();
  const { profile } = useApp();
  const location =
    profile?.preferences.weatherLocation === undefined
      ? match.weatherLocation
      : profile.preferences.weatherLocation;
  const query = location
    ? new URLSearchParams({
        latitude: String(location.latitude),
        longitude: String(location.longitude),
        kickoff: match.kickoffAt,
      }).toString()
    : '';
  const result = saved?.query === query ? saved : undefined;
  useEffect(() => {
    if (!location) return;
    const controller = new AbortController();
    void fetch(
      `/api/weather?${new URLSearchParams({ latitude: String(location.latitude), longitude: String(location.longitude), kickoff: match.kickoffAt })}`,
      { signal: controller.signal },
    )
      .then((r) => r.json())
      .then((data) => {
        if (!controller.signal.aborted) setResult({ ...data, query });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setResult({ query, hours: [], reason: 'Météo indisponible hors ligne.' });
      });
    return () => controller.abort();
  }, [location, match.kickoffAt, query]);
  const date = new Intl.DateTimeFormat('fr', {
    timeZone: match.timezone,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(match.kickoffAt));
  return (
    <span className="match-weather">
      <span>
        <CloudSun size={16} /> Météo · {date}
      </span>
      {!location ? (
        <small>Définissez votre lieu météo dans les paramètres du profil.</small>
      ) : !result ? (
        <small>Chargement des prévisions…</small>
      ) : result.hours.length ? (
        <>
          <span>{location.name}</span>
          <span>
            {result.hours.map((hour) => (
              <small key={hour.at}>
                {new Intl.DateTimeFormat('fr', {
                  timeZone: match.timezone,
                  hour: '2-digit',
                  minute: '2-digit',
                }).format(new Date(hour.at))}{' '}
                · {Math.round(hour.temperature)} °C · {weatherLabel(hour.code)}
                {hour.rain !== null ? ` · pluie ${hour.rain} %` : ''}
                {hour.wind !== null ? ` · rafales ${Math.round(hour.wind)} km/h` : ''}
              </small>
            ))}
          </span>
          <small>
            Prévisions horaires · Source{' '}
            {compact ? (
              'Open-Meteo'
            ) : (
              <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">
                Open-Meteo
              </a>
            )}
          </small>
        </>
      ) : (
        <small>{result.reason}</small>
      )}
    </span>
  );
}
