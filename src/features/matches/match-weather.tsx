'use client';
import { useEffect, useState } from 'react';
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  Sun,
  Wind,
} from 'lucide-react';
import { hasUpcomingForecast, weatherLabel, type WeatherHour } from '@/domain/weather';
import type { Match } from '@/domain/types';
import { useApp } from '../app-provider';
function WeatherIcon({ code }: { code: number }) {
  const props = { size: 22, 'aria-hidden': true } as const;
  if (code === 0) return <Sun {...props} />;
  if (code <= 3) return <Cloud {...props} />;
  if (code <= 48) return <CloudFog {...props} />;
  if (code >= 95) return <CloudLightning {...props} />;
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return <CloudSnow {...props} />;
  return <CloudRain {...props} />;
}
export function MatchWeather({ match, compact = true }: { match: Match; compact?: boolean }) {
  const [saved, setResult] = useState<{ query: string; hours: WeatherHour[]; reason?: string }>();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const eligible = hasUpcomingForecast(match, now);
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
    if (!location || !eligible) return;
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
  }, [location, match.kickoffAt, query, eligible]);
  const date = new Intl.DateTimeFormat('fr', {
    timeZone: match.timezone,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(match.kickoffAt));
  if (!eligible) return null;
  if (!compact) {
    const time = (at: string) =>
      new Intl.DateTimeFormat('fr', {
        timeZone: match.timezone,
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(at));
    return (
      <section className="match-weather match-weather-detail" aria-label="Météo du match">
        <div className="weather-head">
          <CloudSun size={20} aria-hidden="true" />
          <div>
            <strong>Météo du match</strong>
            <span>{location ? `${location.name} · ${date}` : date}</span>
          </div>
        </div>
        {!location ? (
          <p className="weather-note">Définissez votre lieu météo dans les paramètres du profil.</p>
        ) : !result ? (
          <p className="weather-note">Chargement des prévisions…</p>
        ) : result.hours.length ? (
          <ul className="weather-hours">
            {result.hours.map((hour) => (
              <li className="weather-hour" key={hour.at}>
                <span className="weather-time">{time(hour.at)}</span>
                <WeatherIcon code={hour.code} />
                <strong>{Math.round(hour.temperature)}°</strong>
                <span className="weather-label">{weatherLabel(hour.code)}</span>
                <span className="weather-meta">
                  {hour.rain !== null && (
                    <span title="Probabilité de pluie">
                      <Droplets size={12} aria-hidden="true" />
                      {hour.rain} %
                    </span>
                  )}
                  {hour.wind !== null && (
                    <span title="Rafales">
                      <Wind size={12} aria-hidden="true" />
                      {Math.round(hour.wind)} km/h
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="weather-note">{result.reason}</p>
        )}
        <p className="weather-note">
          Prévisions horaires · Source{' '}
          <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">
            Open-Meteo
          </a>
        </p>
      </section>
    );
  }
  return (
    <span className={`match-weather ${compact ? 'match-weather-compact' : 'match-weather-detail'}`}>
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
            {(compact ? result.hours.slice(0, 1) : result.hours).map((hour) => (
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
