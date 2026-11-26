import type { Match } from './types';

export interface Club {
  name: string;
  logoId?: string;
}
export interface ClubLogo {
  id?: string;
  file?: File;
  source?: 'manual' | 'automatic' | 'club';
}

export const clubKey = (name: string) =>
  name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('fr')
    .replace(/\s+/g, ' ')
    .trim();

/** Clubs already met by the referee, each with the logo of its latest match that has one. */
export function knownClubs(matches: Match[]): Club[] {
  const clubs = new Map<string, Club>();
  for (const match of [...matches].sort((a, b) => b.kickoffAt.localeCompare(a.kickoffAt)))
    for (const [name, logoId] of [
      [match.homeTeam, match.homeLogoId],
      [match.awayTeam, match.awayLogoId],
    ] as const) {
      const key = clubKey(name);
      if (!key) continue;
      const club = clubs.get(key);
      if (!club) clubs.set(key, { name: name.trim(), logoId });
      else club.logoId ??= logoId;
    }
  return [...clubs.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

export function searchClubs(clubs: Club[], query: string) {
  const words = clubKey(query).split(' ');
  return clubs.filter((club) => words.every((word) => clubKey(club.name).includes(word)));
}

/** Logo of a side once a club is picked. A logo chosen by hand is never replaced. */
export function pickClubLogo(current: ClubLogo, club: Club): ClubLogo {
  if (current.source === 'manual') return current;
  return club.logoId ? { id: club.logoId, source: 'club' } : {};
}

/** Logo of a side while its name is typed: a club logo must not survive a change of club. */
export function typedClubLogo(current: ClubLogo, clubs: Club[], name: string): ClubLogo {
  const club = clubs.find((item) => clubKey(item.name) === clubKey(name));
  const replaceable = current.source === 'club' || (!current.id && !current.file);
  if (!replaceable) return current;
  return club ? pickClubLogo(current, club) : {};
}
