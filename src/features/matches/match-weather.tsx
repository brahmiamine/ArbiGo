'use client';
import { useEffect, useState } from 'react';
import { CloudSun, Droplets, Wind } from 'lucide-react';
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
  const time = (iso: string) =>
    new Intl.DateTimeFormat('fr', {
      timeZone: match.timezone,
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  return (
    <span className="match-weather">
      <span className="weather-head">
        <CloudSun size={18} aria-hidden="true" />
        <span>
          <strong>Météo</strong>
          <small>
            {location ? `${location.name} · ` : ''}
            {date}
          </small>
        </span>
      </span>
      {!location ? (
        <small className="weather-note">
          Définissez votre lieu météo dans Profil › Paramètres des rencontres.
        </small>
      ) : !result ? (
        <small className="weather-note">Chargement des prévisions…</small>
      ) : result.hours.length ? (
        <>
          <span className="weather-hours">
            {result.hours.map((hour) => (
              <span className="weather-hour" key={hour.at}>
                <small className="weather-time">{time(hour.at)}</small>
                <strong>{Math.round(hour.temperature)} °C</strong>
                <span className="weather-label">{weatherLabel(hour.code)}</span>
                {hour.rain !== null && (
                  <span className="weather-meta">
                    <Droplets size={13} aria-hidden="true" /> pluie {hour.rain} %
                  </span>
                )}
                {hour.wind !== null && (
                  <span className="weather-meta">
                    <Wind size={13} aria-hidden="true" /> rafales {Math.round(hour.wind)} km/h
                  </span>
                )}
              </span>
            ))}
          </span>
          <small className="weather-note">
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
        <small className="weather-note">{result.reason}</small>
      )}
    </span>
  );
}
