import type { WarmupPhase } from './types';
export function elapsedWarmup(phase: WarmupPhase, now = Date.now()) {
  if (!phase.startedAt) return 0;
  return Math.max(
    0,
    (phase.status === 'PAUSED'
      ? Date.parse(phase.pausedAt!)
      : phase.endedAt
        ? Date.parse(phase.endedAt)
        : now) -
      Date.parse(phase.startedAt) -
      phase.pausedMs,
  );
}
