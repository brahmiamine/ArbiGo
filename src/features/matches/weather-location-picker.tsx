'use client';
import { useState } from 'react';
import type { WeatherLocation } from '@/domain/weather';
export function WeatherLocationPicker({
  value,
  onChange,
}: {
  value?: WeatherLocation;
  onChange: (value?: WeatherLocation) => void;
}) {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  function locate() {
    if (!navigator.geolocation) {
      setStatus('La localisation n’est pas disponible sur cet appareil.');
      return;
    }
    setBusy(true);
    setStatus('Recherche de votre position…');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const fallback = `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
        let name = fallback;
        try {
          const response = await fetch(
            `/api/weather/address?${new URLSearchParams({ latitude: String(coords.latitude), longitude: String(coords.longitude) })}`,
          );
          const data = await response.json();
          if (typeof data.address === 'string' && data.address) name = data.address;
        } catch {
          /* Coordinates remain usable when address lookup is unavailable. */
        }
        onChange({ name, latitude: coords.latitude, longitude: coords.longitude });
        setStatus(
          name === fallback
            ? 'Adresse indisponible ; coordonnées détectées conservées.'
            : 'Adresse détectée.',
        );
        setBusy(false);
      },
      () => {
        setStatus(
          'Position indisponible ou accès refusé. Autorisez la localisation dans votre navigateur puis réessayez.',
        );
        setBusy(false);
      },
      { timeout: 10000, maximumAge: 0 },
    );
  }
  return (
    <div className="weather-location-picker">
      {value ? (
        <p className="weather-detected-address">
          <strong>Position détectée</strong>
          <br />
          {value.name}
        </p>
      ) : (
        <p className="muted">Aucune position enregistrée.</p>
      )}
      <button type="button" className="button secondary" disabled={busy} onClick={locate}>
        {busy ? 'Localisation…' : 'Utiliser ma position'}
      </button>
      {status && <p role="status">{status}</p>}
      {value && <small>Adresse : OpenStreetMap · Météo : Open-Meteo</small>}
    </div>
  );
}
