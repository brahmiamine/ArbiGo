/**
 * Importe des désignations dans le compte d’un utilisateur, sans créer de doublon
 * (même coup d’envoi + mêmes équipes). Les matchs passés sont enregistrés comme joués.
 *
 * Usage : tsx scripts/import-matches.ts EMAIL fichier.json
 * Fichier : [{ "home": "…", "away": "…", "date": "2026-11-28", "time": "15:30", "competition": "U14 D2" }]
 */
import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { db } from '../src/lib/db';
import { Prisma } from '../src/generated/prisma/client';
import { createMatch } from '../src/domain/match';
import { parseLocalKickoff } from '../src/domain/time';
import { currentInventory } from '../src/server/inventory';
import { selectTemplate } from '../src/server/matches';
import { scheduleNotifications } from '../src/server/notifications';
import type { ProfilePreferences } from '../src/domain/profile';

const entries = z.array(
  z.object({
    home: z.string().trim().min(1),
    away: z.string().trim().min(1),
    date: z.string(),
    time: z.string(),
    competition: z.string().trim().optional(),
  }),
);
const key = (value: string) =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
const matchKey = (kickoff: Date | string, home: string, away: string) =>
  `${new Date(kickoff).toISOString()}|${key(home)}|${key(away)}`;

const [email, file] = process.argv.slice(2);
if (!email || !file) throw new Error('Usage: tsx scripts/import-matches.ts EMAIL fichier.json');
const list = entries.parse(JSON.parse(await readFile(file, 'utf8')));
const user = await db.user.findUniqueOrThrow({ where: { email: email.toLowerCase() } });
const inventory = await currentInventory(user.id);
const template = await selectTemplate('FOOT_11');
const preferences = user.preferences as unknown as ProfilePreferences;
const existing = new Set(
  (
    await db.match.findMany({
      where: { userId: user.id },
      select: { kickoffAt: true, state: true },
    })
  ).map((row) => {
    const state = row.state as { homeTeam: string; awayTeam: string };
    return matchKey(row.kickoffAt, state.homeTeam, state.awayTeam);
  }),
);
let created = 0;
for (const entry of list) {
  const kickoffAt = parseLocalKickoff(entry.date, entry.time, 'Europe/Paris');
  const id = matchKey(kickoffAt, entry.home, entry.away);
  if (existing.has(id)) {
    console.log(`= déjà présent : ${entry.date} ${entry.home} – ${entry.away}`);
    continue;
  }
  const match = createMatch(
    {
      homeTeam: entry.home,
      awayTeam: entry.away,
      kickoffAt,
      timezone: 'Europe/Paris',
      practice: 'FOOT_11',
      ...(entry.competition ? { competition: entry.competition } : {}),
    },
    inventory.equipment,
    template,
    undefined,
    preferences.steps,
  );
  match.outfits = structuredClone(inventory.outfits);
  const played = Date.parse(kickoffAt) < Date.now();
  if (played) {
    // Un match déjà arbitré : terminé, sans parcours de préparation ni check-out à faire.
    match.status = 'COMPLETED';
    match.closedAt = match.finishedAt = new Date(
      Date.parse(kickoffAt) + 2 * 3600_000,
    ).toISOString();
  }
  await db.$transaction(async (tx) => {
    await tx.match.create({
      data: {
        id: match.id,
        userId: user.id,
        kickoffAt: new Date(kickoffAt),
        status: match.status,
        state: JSON.parse(JSON.stringify(match)) as Prisma.InputJsonValue,
      },
    });
    if (!played) await scheduleNotifications(match, tx);
  });
  existing.add(id);
  created++;
  console.log(`+ ${played ? 'joué' : 'à venir'} : ${entry.date} ${entry.home} – ${entry.away}`);
}
console.log(`${created} match(s) ajouté(s), ${list.length - created} déjà présent(s).`);
await db.$disconnect();
