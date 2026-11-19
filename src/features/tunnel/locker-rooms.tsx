'use client';
import { type FormEvent } from 'react';
import { Button } from '@/components/ui';
import { Check } from 'lucide-react';
import type { Match, OperationInput } from '@/domain/types';

export function LockerRooms({
  match,
  code,
  act,
}: {
  match: Match;
  code: string;
  act: (action: OperationInput) => Promise<boolean>;
}) {
  const referee = code === 'referee-locker';
  const fields = referee
    ? [{ key: 'referee' as const, label: 'Numéro de mon vestiaire' }]
    : [
        { key: 'home' as const, label: `Vestiaire · ${match.homeTeam}` },
        { key: 'away' as const, label: `Vestiaire · ${match.awayTeam}` },
      ];
  const completed = !!match.runs[code].completedAt;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (completed) return;
    const data = new FormData(event.currentTarget);
    const rooms = referee
      ? { referee: String(data.get('referee')).trim() }
      : { home: String(data.get('home')).trim(), away: String(data.get('away')).trim() };
    await act({ type: 'LOCKER_ROOMS', rooms });
  }
  return (
    <form className="form locker-rooms" onSubmit={submit}>
      {fields.map(({ key, label }) => (
        <label key={key}>
          {label}
          <input
            name={key}
            defaultValue={match.lockerRooms?.[key] ?? ''}
            required
            maxLength={30}
            pattern={'.*\\S.*'}
            autoComplete="off"
            placeholder="Ex. 3 ou A2"
            disabled={completed}
          />
        </label>
      ))}
      <Button type="submit" disabled={completed}>
        <Check size={19} />
        {completed ? 'Étape validée' : 'Valider cette étape'}
      </Button>
    </form>
  );
}
