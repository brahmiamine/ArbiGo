import { expect, it } from 'vitest';
import { db } from '@/lib/db';
import { currentInventory } from '@/server/inventory';
import { newMatch } from '@/server/matches';
import { createMatch } from '@/domain/match';
import { templates } from '@/domain/templates';
import type { Inventory } from '@/domain/types';

it('persists a concurrent catalog upgrade once, preserves personal items and archived bags, and respects later deletions', async () => {
  const id = crypto.randomUUID();
  const inventory: Inventory = {
    equipment: [
      { id: 'shirt-blue', label: 'Maillot bleu', type: 'SHIRT', colors: ['bleu'] },
      { id: 'personal', label: 'Mon matériel', type: 'TOOL', colors: [] },
    ],
    outfits: [],
  };
  const designation = {
    homeTeam: 'A',
    awayTeam: 'B',
    practice: 'FOOT_11' as const,
    kickoffAt: '2026-12-01T14:00:00Z',
    timezone: 'Europe/Paris',
  };
  const archived = createMatch(designation, inventory.equipment, templates.FOOT_11);
  archived.status = 'COMPLETED';
  archived.finishedAt = '2026-12-01T17:00:00Z';
  await db.user.create({
    data: {
      id,
      email: `${id}@test.local`,
      name: 'Ancien inventaire',
      passwordHash: 'unused-test-account',
      preferences: {},
      inventory: JSON.parse(JSON.stringify(inventory)),
    },
  });
  try {
    await db.match.create({
      data: {
        id: archived.id,
        userId: id,
        kickoffAt: new Date(archived.kickoffAt),
        status: archived.status,
        state: JSON.parse(JSON.stringify(archived)),
      },
    });
    const [first, concurrent] = await Promise.all([currentInventory(id), currentInventory(id)]);
    expect(concurrent).toEqual(first);
    expect(first.catalogVersion).toBe(2);
    expect(first.equipment.map((i) => i.id)).toEqual([
      'personal',
      'shirt-yellow',
      'shirt-red',
      'shirt-purple',
      'shirt-black',
      'match-sheet',
      'match-notes',
    ]);
    expect((await db.user.findUniqueOrThrow({ where: { id } })).inventory).toEqual(first);
    expect((await db.match.findUniqueOrThrow({ where: { id: archived.id } })).state).toEqual(
      JSON.parse(JSON.stringify(archived)),
    );
    expect((await newMatch(id, designation)).bag.map((i) => i.id)).toEqual(
      first.equipment.map((i) => i.id),
    );
    const edited = { ...first, equipment: first.equipment.filter((i) => i.id !== 'shirt-red') };
    await db.user.update({
      where: { id },
      data: { inventory: JSON.parse(JSON.stringify(edited)) },
    });
    expect(await currentInventory(id)).toEqual(edited);
  } finally {
    await db.user.delete({ where: { id } });
  }
});
