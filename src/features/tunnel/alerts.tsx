'use client';
import { useEffect } from 'react';
import type { Match } from '@/domain/types';
import { useApp } from '../app-provider';
import { scheduledAt } from '@/domain/time';
export function StageAlerts({ match, muted }: { match: Match; muted: boolean }) {
  const { deviceId, setError } = useApp();
  useEffect(() => {
    function alert(tag: string, message: string) {
      const key = `arbigo:alert:${tag}`;
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, '1');
      setError(message);
      if (!muted) {
        try {
          const ctx = new AudioContext(),
            osc = ctx.createOscillator(),
            gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          gain.gain.value = 0.025;
          osc.frequency.value = 740;
          osc.start();
          osc.stop(ctx.currentTime + 0.2);
          osc.onended = () => void ctx.close();
          navigator.vibrate?.([50, 50, 50]);
        } catch {}
      }
    }
    function poll() {
      if (document.visibilityState !== 'visible' || match.ownerDeviceId !== deviceId) return;
      const now = Date.now();
      for (const step of match.template.steps) {
        if (match.runs[step.code].completedAt) continue;
        for (const before of [5, 0]) {
          const delta = now - Date.parse(scheduledAt(match.kickoffAt, step.offset - before));
          if (delta >= 0 && delta < 10000)
            alert(
              `${match.id}:${step.code}:${before}`,
              `${step.title} · ${before ? 'dans 5 minutes' : 'horaire prévu atteint'}`,
            );
        }
      }
    }
    const receive = (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_ALERT') alert(event.data.tag, event.data.body);
    };
    navigator.serviceWorker?.addEventListener('message', receive);
    poll();
    const timer = setInterval(poll, 5000);
    return () => {
      clearInterval(timer);
      navigator.serviceWorker?.removeEventListener('message', receive);
    };
  }, [match, muted, deviceId, setError]);
  return null;
}
