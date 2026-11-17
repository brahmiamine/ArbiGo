import { expect, it } from 'vitest';
import { db } from '@/lib/db';
import { newMatch, syncOne } from '@/server/matches';
import { normalizeStepPreferences } from '@/domain/step-settings';
import type { Match, Operation, OperationInput } from '@/domain/types';

it('stores each match report independently in MariaDB and restores the saved version across registered devices', async () => {
  const userId = crypto.randomUUID(),
    deviceA = crypto.randomUUID(),
    deviceB = crypto.randomUUID();
  const settings = normalizeStepPreferences();
  settings.disabled = [...settings.order];
  settings.checkoutEnabled = false;
  await db.user.create({
    data: {
      id: userId,
      name: 'Débrief',
      email: `${userId}@test.local`,
      passwordHash: 'unused-test-only',
      preferences: { steps: settings },
      inventory: { equipment: [], outfits: [] },
    },
  });
  await db.device.createMany({
    data: [
      { id: deviceA, userId, label: 'A' },
      { id: deviceB, userId, label: 'B' },
    ],
  });
  try {
    const input = {
      homeTeam: 'Domicile A',
      awayTeam: 'Visiteurs A',
      practice: 'FOOT_11',
      kickoffAt: '2026-12-01T14:00:00Z',
      timezone: 'Europe/Paris',
    };
    let first = await newMatch(userId, input),
      second = await newMatch(userId, {
        ...input,
        homeTeam: 'Domicile B',
        awayTeam: 'Visiteurs B',
        kickoffAt: '2026-12-08T14:00:00Z',
      });
    const operation = (m: Match, action: OperationInput, deviceId = deviceA): Operation => ({
      id: crypto.randomUUID(),
      matchId: m.id,
      deviceId,
      expectedVersion: m.version,
      fencingVersion: m.fencingVersion,
      occurredAt: new Date().toISOString(),
      action,
    });
    const write = async (m: Match, action: OperationInput, deviceId = deviceA) =>
      (await syncOne(userId, operation(m, action, deviceId))).match;
    for (const action of [
      { type: 'START' },
      { type: 'KICKOFF', acknowledged: true },
      { type: 'FINISH_MATCH' },
    ] as OperationInput[])
      first = await write(first, action);
    for (const action of [
      { type: 'START' },
      { type: 'KICKOFF', acknowledged: true },
      { type: 'FINISH_MATCH' },
    ] as OperationInput[])
      second = await write(second, action);
    first = await write(first, {
      type: 'DEBRIEF',
      changes: { objective: 'Analyse propre au premier match', strengths: ['Calme', 'Placement'] },
    });
    second = await write(second, {
      type: 'DEBRIEF',
      changes: {
        objective: 'Analyse propre au deuxième match',
        strengths: ['Dialogue', 'Lecture du jeu'],
      },
    });
    const secondSnapshot = structuredClone(second);
    const edit = operation(
      first,
      { type: 'DEBRIEF', changes: { improvement: 'Travailler l’avantage' } },
      deviceB,
    );
    first = (await syncOne(userId, edit)).match;
    expect((await syncOne(userId, edit)).match.version).toBe(first.version);
    const rows = await db.match.findMany({ where: { userId }, select: { id: true, state: true } });
    const saved = new Map(rows.map((row) => [row.id, row.state as unknown as Match]));
    expect(saved.get(first.id)?.debrief?.form).toMatchObject({
      homeTeam: 'Domicile A',
      objective: 'Analyse propre au premier match',
      improvement: 'Travailler l’avantage',
      strengths: ['Calme', 'Placement'],
    });
    expect(saved.get(second.id)).toEqual(secondSnapshot);
    expect(saved.get(second.id)?.debrief?.form).toMatchObject({
      homeTeam: 'Domicile B',
      objective: 'Analyse propre au deuxième match',
      strengths: ['Dialogue', 'Lecture du jeu'],
    });
    expect(saved.get(first.id)?.debrief?.updatedAt).toBe(edit.occurredAt);
    expect(await db.matchEvent.count({ where: { matchId: first.id, type: 'DEBRIEF' } })).toBe(2);
    expect(await db.matchEvent.count({ where: { matchId: second.id, type: 'DEBRIEF' } })).toBe(1);
    await expect(syncOne('another-account', { ...edit, id: crypto.randomUUID() })).rejects.toThrow(
      'NOT_FOUND',
    );
  } finally {
    await db.user.delete({ where: { id: userId } });
  }
});
