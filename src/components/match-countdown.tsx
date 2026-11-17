'use client';
import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import { kickoffCountdown } from '@/domain/time';

/** Match cards render after the account's client-side store has loaded. */
export function MatchCountdown({ kickoffAt }: { kickoffAt: string }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const update = () => setNow(Date.now());
    const timer = window.setInterval(update, 1000);
    document.addEventListener('visibilitychange', update);
    window.addEventListener('pageshow', update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', update);
      window.removeEventListener('pageshow', update);
    };
  }, []);
  const due = now >= Date.parse(kickoffAt);
  return (
    <div className={`match-countdown ${due ? 'due' : ''}`} role="timer" aria-live="off">
      <span>
        <Timer size={14} aria-hidden="true" />
        {due ? 'Horaire prévu atteint' : 'Coup d’envoi dans'}
      </span>
      <strong>{kickoffCountdown(kickoffAt, now)}</strong>
    </div>
  );
}
