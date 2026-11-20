'use client';
import { useEffect, useState } from 'react';
import { MapPin, TrainFront } from 'lucide-react';
import type { Match } from '@/domain/types';
import { formatTime } from '@/domain/time';
import { useApp } from '../app-provider';

type Journey = {
  from?: string;
  to?: string;
  trip?: { startTime: string; endTime: string; duration: number };
};

export function MatchJourney({ match }: { match: Match }) {
  const { profile } = useApp();
  const origin = profile?.preferences.homeAddress?.trim() ?? '';
  const destination = match.stadium?.trim() ?? '';
  const kickoff = Date.parse(match.kickoffAt);
  const offset = match.template.steps.find((step) => step.kind === 'arrival')?.offset ?? -60;
  const [now] = useState(Date.now);
  const arrival = kickoff + offset * 60000;
  const upcoming = ['DRAFT', 'ACTIVE'].includes(match.status) && kickoff > now;
  const arriveBy =
    upcoming && origin && arrival > now ? new Date(arrival).toISOString() : undefined;
  const request =
    upcoming && destination.length >= 3 ? JSON.stringify({ origin, destination, arriveBy }) : '';
  const [result, setResult] = useState<{ request: string; data: Journey }>();
  useEffect(() => {
    if (!request) return;
    const controller = new AbortController();
    void fetch('/api/journey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: request,
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : {}))
      .catch(() => ({}))
      .then((data) => {
        if (!controller.signal.aborted) setResult({ request, data });
      });
    return () => controller.abort();
  }, [request]);

  if (!destination || !upcoming) return null;
  const data = result?.request === request ? result.data : undefined;
  const maps = new URLSearchParams({ api: '1', destination, travelmode: 'transit' });
  if (origin) maps.set('origin', origin);
  const citymapper = new URLSearchParams({ endname: destination, endaddress: destination });
  if (data?.to) citymapper.set('endcoord', data.to);
  if (data?.from) citymapper.set('startcoord', data.from);
  if (origin) citymapper.set('startname', origin);
  const trip = data?.trip;
  return (
    <div className="match-journey">
      <div>
        <a
          className="icon-button"
          aria-label="Ouvrir dans Google Maps"
          title="Google Maps"
          href={`https://www.google.com/maps/dir/?${maps}`}
          target="_blank"
          rel="noreferrer"
        >
          <MapPin size={18} />
        </a>
        {data?.to && (
          <a
            className="icon-button"
            aria-label="Ouvrir dans Citymapper"
            title="Citymapper"
            href={`https://citymapper.com/directions?${citymapper}`}
            target="_blank"
            rel="noreferrer"
          >
            <TrainFront size={18} />
          </a>
        )}
      </div>
      <small>
        {trip ? (
          <>
            Transport / marche · {Math.ceil(trip.duration / 60)} min
            <br />
            <strong>Départ {formatTime(trip.startTime, match.timezone)}</strong> · Arrivée{' '}
            {formatTime(trip.endTime, match.timezone)}
            <br />
            Transitous
          </>
        ) : !origin ? (
          'Ajoutez votre adresse dans Profil pour calculer le trajet.'
        ) : !arriveBy ? (
          'L’heure prévue d’arrivée est passée.'
        ) : !data ? (
          'Calcul du trajet…'
        ) : (
          'Trajet indisponible pour cet horaire.'
        )}
      </small>
    </div>
  );
}
