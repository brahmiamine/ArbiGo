import { describe, expect, it } from 'vitest';
import { knownClubs, pickClubLogo, searchClubs, typedClubLogo } from '@/domain/clubs';
import type { Match } from '@/domain/types';

const match = (kickoffAt: string, home: string, away: string, homeLogoId?: string) =>
  ({ kickoffAt, homeTeam: home, awayTeam: away, homeLogoId }) as Match;

describe('club list', () => {
  const clubs = knownClubs([
    match('2026-09-01T13:00:00Z', 'Étoile FC', 'MFC 1871', 'old'),
    match('2026-10-01T13:00:00Z', 'etoile fc', 'Trops FC', 'new'),
    match('2026-11-01T13:00:00Z', 'Etoile FC', 'MFC 1871'),
  ]);
  it('lists each club once, with its latest known logo', () => {
    expect(clubs).toEqual([
      { name: 'Etoile FC', logoId: 'new' },
      { name: 'MFC 1871', logoId: undefined },
      { name: 'Trops FC', logoId: undefined },
    ]);
  });
  it('searches without case or accents', () => {
    expect(searchClubs(clubs, 'éto').map((club) => club.name)).toEqual(['Etoile FC']);
    expect(searchClubs(clubs, 'fc trops').map((club) => club.name)).toEqual(['Trops FC']);
  });
  it('replaces a club logo but never a hand-picked one', () => {
    expect(pickClubLogo({ id: 'x' }, clubs[0]!)).toEqual({ id: 'new', source: 'club' });
    expect(pickClubLogo({ id: 'new', source: 'club' }, clubs[1]!)).toEqual({});
    expect(pickClubLogo({ id: 'mine', source: 'manual' }, clubs[0]!).id).toBe('mine');
  });
  it('drops a club logo when another name is typed', () => {
    expect(typedClubLogo({ id: 'new', source: 'club' }, clubs, 'Autre')).toEqual({});
    expect(typedClubLogo({}, clubs, 'etoile fc').id).toBe('new');
    expect(typedClubLogo({ id: 'saved' }, clubs, 'Autre').id).toBe('saved');
  });
});
