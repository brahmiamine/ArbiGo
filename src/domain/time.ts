export function scheduledAt(kickoff: string, offset: number) {
  return new Date(Date.parse(kickoff) + offset * 60000).toISOString();
}
export function countdown(target: string, now = Date.now()) {
  const seconds = Math.floor(Math.abs(Date.parse(target) - now) / 1000);
  const hours = Math.floor(seconds / 3600);
  return `${Date.parse(target) < now ? '+' : ''}${hours ? `${String(hours).padStart(2, '0')}:` : ''}${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
export function kickoffCountdown(target: string, now = Date.now()) {
  const targetTime = Date.parse(target);
  if (!Number.isFinite(targetTime)) return '—';
  const seconds = Math.max(0, Math.ceil((targetTime - now) / 1000));
  const days = Math.floor(seconds / 86400);
  const clock = [Math.floor(seconds / 3600) % 24, Math.floor(seconds / 60) % 60, seconds % 60]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
  return days ? `${days} j ${clock}` : clock;
}
export function localDateParts(iso: string, timezone = 'Europe/Paris') {
  const parts = new Intl.DateTimeFormat('fr-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const v = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return { date: `${v.year}-${v.month}-${v.day}`, time: `${v.hour}:${v.minute}` };
}
export function parseLocalKickoff(date: string, time: string, timezone: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time))
    throw new Error('Date ou heure invalide');
  const center = Date.parse(`${date}T${time}:00Z`);
  if (!Number.isFinite(center)) throw new Error('Date invalide');
  const candidates = [];
  for (let offset = -14 * 60; offset <= 14 * 60; offset += 15) {
    const iso = new Date(center + offset * 60000).toISOString();
    const local = localDateParts(iso, timezone);
    if (local.date === date && local.time === time) candidates.push(iso);
  }
  if (candidates.length !== 1)
    throw new Error(
      candidates.length
        ? 'Heure ambiguë lors du changement d’heure. Choisissez une autre heure.'
        : 'Heure inexistante ou date invalide.',
    );
  return candidates[0];
}
export function formatTime(iso: string, timezone = 'Europe/Paris') {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}
