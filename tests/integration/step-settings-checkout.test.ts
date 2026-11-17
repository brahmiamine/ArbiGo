import { expect, it } from 'vitest';
import { db } from '@/lib/db';
import { updateUserProfile } from '@/server/profile';
import { newMatch, syncOne, transferTunnel } from '@/server/matches';
import { normalizeStepPreferences } from '@/domain/step-settings';
import type { Operation, OperationInput } from '@/domain/types';
it('keeps per-user settings private and snapshots enabled stages, then transfers and confirms pending checkout', async () => {
  const userId = crypto.randomUUID(),
    otherId = crypto.randomUUID(),
    deviceId = crypto.randomUUID(),
    secondId = crypto.randomUUID();
  for (const id of [userId, otherId])
    await db.user.create({
      data: {
        id,
        name: 'Parcours',
        email: `${id}@test.local`,
        passwordHash: 'unused-test-only',
        preferences: {},
        inventory: { equipment: [], outfits: [] },
      },
    });
  await db.device.createMany({
    data: [
      { id: deviceId, userId, label: 'A' },
      { id: secondId, userId, label: 'B' },
    ],
  });
  try {
    const settings = normalizeStepPreferences();
    settings.disabled = settings.order.filter((code) => code !== 'arrival');
    await updateUserProfile(userId, { preferences: { steps: settings } });
    const input = {
      homeTeam: 'A',
      awayTeam: 'B',
      practice: 'FOOT_11',
      kickoffAt: '2026-12-01T14:00:00Z',
      timezone: 'Europe/Paris',
    };
    let m = await newMatch(userId, input);
    const other = await newMatch(otherId, input);
    expect(m.template.steps.map((step) => step.code)).toEqual(['arrival', 'final']);
    expect(other.template.steps).toHaveLength(14);
    expect(other.stepPreferences).toBeUndefined();
    expect(await db.notificationJob.count({ where: { matchId: m.id, stepCode: 'pitch' } })).toBe(0);
    const snapshot = structuredClone(m);
    await updateUserProfile(userId, { preferences: { steps: normalizeStepPreferences() } });
    expect((await db.match.findUniqueOrThrow({ where: { id: m.id } })).state).toEqual(snapshot);
    const extra = await newMatch(userId, input);
    const operation = (action: OperationInput, device = deviceId, match = m): Operation => ({
      id: crypto.randomUUID(),
      matchId: match.id,
      deviceId: device,
      expectedVersion: match.version,
      fencingVersion: match.fencingVersion,
      occurredAt: new Date().toISOString(),
      action,
    });
    const write = async (action: OperationInput) => {
      m = (await syncOne(userId, operation(action))).match;
    };
    await write({ type: 'START' });
    await write({ type: 'COMPLETE', stepCode: 'arrival' });
    await write({ type: 'KICKOFF', acknowledged: true });
    expect(m.checkout).toEqual({ enabled: true });
    await expect(syncOne(userId, operation({ type: 'START' }, deviceId, extra))).rejects.toThrow(
      'ACTIVE_TUNNEL',
    );
    await expect(syncOne(otherId, operation({ type: 'SPORTCASH_CHECKOUT' }))).rejects.toThrow(
      'NOT_FOUND',
    );
    m = await transferTunnel(userId, m.id, secondId, m.version);
    const old = await syncOne(userId, operation({ type: 'SPORTCASH_CHECKOUT' }));
    expect(old.status).toBe('QUARANTINED');
    const checkout = operation({ type: 'SPORTCASH_CHECKOUT' }, secondId);
    m = (await syncOne(userId, checkout)).match;
    expect(m.checkout?.completedAt).toBeTruthy();
    expect((await syncOne(userId, checkout)).match).toEqual(m);
    expect(
      await db.matchEvent.count({ where: { matchId: m.id, type: 'SPORTCASH_CHECKOUT' } }),
    ).toBe(1);
    await expect(transferTunnel(userId, m.id, deviceId, m.version)).rejects.toThrow('CLOSED');
    expect((await syncOne(userId, operation({ type: 'START' }, deviceId, extra))).status).toBe(
      'APPLIED',
    );
  } finally {
    await db.user.deleteMany({ where: { id: { in: [userId, otherId] } } });
  }
});
