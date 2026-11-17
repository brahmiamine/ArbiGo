import { beforeAll, afterAll, expect, it } from 'vitest';
import { db } from '@/lib/db';
import { hashPassword, makeToken, hashToken } from '@/lib/security';
import { authenticate, consumeToken } from '@/server/accounts';
import { newMatch, syncOne, transferTunnel } from '@/server/matches';
import { defaultEquipment } from '@/domain/equipment';
import type { Operation, Match } from '@/domain/types';
import { exportPersonalData, deleteAccount } from '@/server/privacy';
const uid = crypto.randomUUID(),
  did = crypto.randomUUID(),
  did2 = crypto.randomUUID();
let mid = '';
beforeAll(async () => {
  await db.user.create({
    data: {
      id: uid,
      email: `${uid}@test.local`,
      name: 'Test',
      passwordHash: await hashPassword('Long-password-2026!'),
      preferences: {},
      inventory: JSON.parse(JSON.stringify({ equipment: defaultEquipment(), outfits: [] })),
    },
  });
  await db.device.createMany({
    data: [
      { id: did, userId: uid, label: 'A' },
      { id: did2, userId: uid, label: 'B' },
    ],
  });
});
afterAll(async () => {
  await db.user.delete({ where: { id: uid } });
  await db.$disconnect();
});
it('requires email verification and consumes its token once', async () => {
  expect(await authenticate(`${uid}@test.local`, 'Long-password-2026!')).toBeNull();
  const token = makeToken();
  await db.accountToken.create({
    data: {
      userId: uid,
      hash: hashToken(token),
      purpose: 'VERIFY',
      expiresAt: new Date(Date.now() + 60000),
    },
  });
  await consumeToken(token, 'VERIFY');
  await expect(consumeToken(token, 'VERIFY')).rejects.toThrow('TOKEN_INVALID');
  expect(await authenticate(`${uid}@test.local`, 'Long-password-2026!')).toMatchObject({ id: uid });
});
it('rejects expired token', async () => {
  const token = makeToken();
  await db.accountToken.create({
    data: { userId: uid, hash: hashToken(token), purpose: 'RESET', expiresAt: new Date(0) },
  });
  await expect(consumeToken(token, 'RESET', 'Other-password-2026!')).rejects.toThrow(
    'TOKEN_INVALID',
  );
});
it('isolates accounts, persists idempotently and quarantines revoked device', async () => {
  const m = await newMatch(uid, {
    homeTeam: 'A',
    awayTeam: 'B',
    practice: 'FOOT_11',
    kickoffAt: '2026-12-01T14:00:00Z',
    timezone: 'Europe/Paris',
  });
  mid = m.id;
  const operation: Operation = {
    id: crypto.randomUUID(),
    matchId: mid,
    deviceId: did,
    expectedVersion: 0,
    fencingVersion: 0,
    occurredAt: new Date().toISOString(),
    action: { type: 'START' },
  };
  await expect(syncOne('another-user', operation)).rejects.toThrow('NOT_FOUND');
  const a = await syncOne(uid, operation);
  expect(a.status).toBe('APPLIED');
  expect((await syncOne(uid, operation)).status).toBe('APPLIED');
  expect(await db.matchEvent.count({ where: { matchId: mid } })).toBe(1);
  const transferred = await transferTunnel(uid, mid, did2, 1);
  const stale = await syncOne(uid, {
    ...operation,
    id: crypto.randomUUID(),
    expectedVersion: transferred.version,
    fencingVersion: 1,
    action: { type: 'NAVIGATE', index: 1 },
  });
  expect(stale.status).toBe('QUARANTINED');
  const row = await db.match.findUniqueOrThrow({ where: { id: mid } });
  expect((row.state as unknown as Match).currentStep).toBe(0);
});
it('serializes two simultaneous starts to a single active match', async () => {
  const m = await newMatch(uid, {
    homeTeam: 'C',
    awayTeam: 'D',
    practice: 'FOOT_11',
    kickoffAt: '2026-12-02T14:00:00Z',
    timezone: 'Europe/Paris',
  });
  await expect(
    syncOne(uid, {
      id: crypto.randomUUID(),
      matchId: m.id,
      deviceId: did2,
      expectedVersion: 0,
      fencingVersion: 0,
      occurredAt: new Date().toISOString(),
      action: { type: 'START' },
    }),
  ).rejects.toThrow('ACTIVE_TUNNEL');
});
it('exports only owned data and requires the current password before deletion', async () => {
  const id = crypto.randomUUID();
  await db.user.create({
    data: {
      id,
      email: `${id}@test.local`,
      name: 'Suppression',
      passwordHash: await hashPassword('Delete-my-test-2026!'),
      preferences: {},
      inventory: { equipment: [], outfits: [] },
    },
  });
  try {
    const exported = await exportPersonalData(id);
    expect(exported.account.id).toBe(id);
    expect(exported.account).not.toHaveProperty('passwordHash');
    expect(exported.matches).toEqual([]);
    await expect(deleteAccount(id, 'Wrong-password')).rejects.toThrow('FORBIDDEN');
    expect(await db.user.count({ where: { id } })).toBe(1);
    await deleteAccount(id, 'Delete-my-test-2026!');
    expect(await db.user.count({ where: { id } })).toBe(0);
    expect(await db.user.count({ where: { id: uid } })).toBe(1);
  } finally {
    await db.user.deleteMany({ where: { id } });
  }
});
it('saves owned finished-match debriefs across devices without rewriting preparation and rejects foreign or premature edits', async () => {
  const row = await db.match.findUniqueOrThrow({ where: { id: mid } });
  let current = row.state as unknown as Match;
  const write = async (action: Operation['action'], deviceId = did2) => {
    const op: Operation = {
      id: crypto.randomUUID(),
      matchId: mid,
      deviceId,
      expectedVersion: current.version,
      fencingVersion: current.fencingVersion,
      occurredAt: new Date().toISOString(),
      action,
    };
    const result = await syncOne(uid, op);
    if (result.match) current = result.match;
    return { op, result };
  };
  await expect(write({ type: 'DEBRIEF', changes: { objective: 'Trop tôt' } })).rejects.toThrow(
    'DEBRIEF_UNAVAILABLE',
  );
  await write({ type: 'KICKOFF', acknowledged: true });
  await expect(
    write({ type: 'DEBRIEF', changes: { objective: 'Encore trop tôt' } }),
  ).rejects.toThrow('DEBRIEF_UNAVAILABLE');
  const preparation = structuredClone(current.runs);
  await write({ type: 'FINISH_MATCH' }, did);
  const { op } = await write(
    {
      type: 'DEBRIEF',
      changes: { words: ['Calme', 'Juste', 'Clair'], objective: 'Lecture du jeu', rating: '7.5' },
    },
    did,
  );
  expect((await syncOne(uid, op)).status).toBe('APPLIED');
  await expect(syncOne('foreign-user', { ...op, id: crypto.randomUUID() })).rejects.toThrow(
    'NOT_FOUND',
  );
  const persisted = (await db.match.findUniqueOrThrow({ where: { id: mid } }))
    .state as unknown as Match;
  expect(persisted.debrief?.form.objective).toBe('Lecture du jeu');
  expect(persisted.runs).toEqual(preparation);
  const exported = await exportPersonalData(uid);
  expect(JSON.stringify(exported.matches)).toContain('Lecture du jeu');
});
