import { expect, it } from 'vitest';
import { db } from '@/lib/db';
import { newMatch, syncOne } from '@/server/matches';
import type { Match, Operation, OperationInput } from '@/domain/types';

it('persists audited legacy locker upgrade, private room numbers, replay and new notifications', async () => {
  const userId = crypto.randomUUID(),
    deviceId = crypto.randomUUID(),
    otherId = crypto.randomUUID();
  await db.user.create({
    data: {
      id: userId,
      name: 'Vestiaires',
      email: `${userId}@test.local`,
      passwordHash: 'unused-test-only',
      preferences: {},
      inventory: { equipment: [], outfits: [] },
    },
  });
  await db.device.create({ data: { id: deviceId, userId, label: 'Test' } });
  try {
    let m = await newMatch(userId, {
      homeTeam: 'A',
      awayTeam: 'B',
      practice: 'FOOT_11',
      kickoffAt: new Date(Date.now() + 74 * 60000).toISOString(),
      timezone: 'Europe/Paris',
    });
    // A pre-release active snapshot still at its original pitch card.
    m.template.steps = m.template.steps.filter(
      (s) => s.kind !== 'locker' && s.code !== 'sportcash',
    );
    delete m.runs['referee-locker'];
    delete m.runs['team-lockers'];
    m.status = 'ACTIVE';
    m.ownerDeviceId = deviceId;
    m.fencingVersion = 1;
    m.currentStep = 1;
    m.runs.arrival.completedAt = '2026-12-01T12:40:00Z';
    await db.match.update({
      where: { id: m.id },
      data: { status: m.status, state: JSON.parse(JSON.stringify(m)) },
    });
    await db.notificationJob.deleteMany({
      where: { matchId: m.id, stepCode: { in: ['referee-locker', 'team-lockers', 'sportcash'] } },
    });
    const operation = (action: OperationInput): Operation => ({
      id: crypto.randomUUID(),
      matchId: m.id,
      deviceId,
      expectedVersion: m.version,
      fencingVersion: m.fencingVersion,
      occurredAt: new Date().toISOString(),
      action,
    });
    const upgrade = operation({ type: 'ADD_LOCKER_STEPS' });
    const result = await syncOne(userId, upgrade);
    m = result.match;
    expect(m.template.steps[m.currentStep].code).toBe('pitch');
    expect((await syncOne(userId, upgrade)).match).toEqual(m);
    expect(
      await db.notificationJob.count({
        where: { matchId: m.id, stepCode: { in: ['referee-locker', 'team-lockers'] } },
      }),
    ).toBe(2);
    expect(
      await db.notificationJob.count({
        where: {
          matchId: m.id,
          stepCode: { in: ['referee-locker', 'team-lockers'] },
          kind: 'PREVIEW',
        },
      }),
    ).toBe(0);
    await expect(
      syncOne(otherId, operation({ type: 'LOCKER_ROOMS', rooms: { referee: '1' } })),
    ).rejects.toThrow('NOT_FOUND');
    m = (await syncOne(userId, operation({ type: 'LOCKER_ROOMS', rooms: { referee: 'A2' } })))
      .match;
    m = (
      await syncOne(userId, operation({ type: 'LOCKER_ROOMS', rooms: { home: '3', away: '4' } }))
    ).match;
    const checkinUpgrade = operation({ type: 'ADD_SPORTCASH_STEP' });
    m = (await syncOne(userId, checkinUpgrade)).match;
    expect((await syncOne(userId, checkinUpgrade)).match).toEqual(m);
    expect(m.template.steps[m.currentStep].code).toBe('pitch');
    expect(m.runs.sportcash).toEqual({ answers: {} });
    expect(
      await db.notificationJob.count({ where: { matchId: m.id, stepCode: 'sportcash' } }),
    ).toBe(1);
    expect(
      await db.notificationJob.count({
        where: { matchId: m.id, stepCode: 'sportcash', kind: 'PREVIEW' },
      }),
    ).toBe(0);
    m = (await syncOne(userId, operation({ type: 'COMPLETE', stepCode: 'sportcash' }))).match;
    const stored = (await db.match.findUniqueOrThrow({ where: { id: m.id } }))
      .state as unknown as Match;
    expect(stored.lockerRooms).toEqual({ referee: 'A2', home: '3', away: '4' });
    expect(stored.currentStep).toBe(4);
    expect(stored.runs.sportcash.completedAt).toBeTruthy();
    expect(stored.runs.arrival.completedAt).toBe('2026-12-01T12:40:00Z');
    expect(await db.matchEvent.count({ where: { matchId: m.id, type: 'ADD_LOCKER_STEPS' } })).toBe(
      1,
    );
    expect(await db.matchEvent.count({ where: { matchId: m.id, type: 'LOCKER_ROOMS' } })).toBe(2);
  } finally {
    await db.user.delete({ where: { id: userId } });
  }
});
