import { isDeepStrictEqual } from 'node:util';
import { db } from '@/lib/db';
import { Prisma } from '@/generated/prisma/client';
import {
  createMatch,
  createRematch,
  applyOperation,
  matchInputSchema,
  requiresCheckout,
} from '@/domain/match';
import { templates } from '@/domain/templates';
import type { ProfilePreferences } from '@/domain/profile';
import type { Match, Operation, Practice } from '@/domain/types';
import { currentInventory } from './inventory';
import { operationSchema } from './validation';
import { scheduleNotifications } from './notifications';
const json = (v: unknown) => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
export async function ownedMatch(userId: string, id: string) {
  const row = await db.match.findFirst({ where: { id, userId } });
  if (!row) throw new Error('NOT_FOUND');
  return row;
}
export async function newMatch(userId: string, input: unknown) {
  const parsed = matchInputSchema.parse(input);
  const inventory = await currentInventory(userId);
  const template = await selectTemplate(parsed.practice);
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { preferences: true },
  });
  const preferences = user.preferences as unknown as ProfilePreferences;
  const match = createMatch(parsed, inventory.equipment, template, undefined, preferences.steps);
  match.outfits = structuredClone(inventory.outfits);
  await db.$transaction(async (tx) => {
    await tx.match.create({
      data: {
        id: match.id,
        userId,
        kickoffAt: new Date(match.kickoffAt),
        status: match.status,
        state: json(match),
      },
    });
    await scheduleNotifications(match, tx);
  });
  return match;
}
export async function selectTemplate(practice: Practice) {
  const persisted = await db.templateVersion.findUnique({
    where: { code: templates[practice].code },
  });
  const template = persisted
    ? (persisted.content as unknown as Match['template'])
    : templates[practice];
  if (process.env.REQUIRE_APPROVED_TEMPLATES === 'true' && template.status !== 'VERIFIED')
    throw new Error('TEMPLATE_UNAPPROVED');
  return template;
}
export async function syncOne(userId: string, input: unknown) {
  const op: Operation = operationSchema.parse(input);
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM User WHERE id = ${userId} FOR UPDATE`;
    const row = await tx.match.findFirst({ where: { id: op.matchId, userId } });
    if (!row) throw new Error('NOT_FOUND');
    const device = await tx.device.findFirst({
      where: { id: op.deviceId, userId, revokedAt: null },
    });
    if (!device) throw new Error('FORBIDDEN');
    const previous = await tx.syncOperation.findUnique({ where: { id: op.id } });
    if (previous) {
      if (previous.userId !== userId || !isDeepStrictEqual(previous.payload, json(op)))
        throw new Error('FORBIDDEN');
      return {
        id: op.id,
        status: previous.status,
        reason: previous.reason,
        match: row.state as unknown as Match,
      };
    }
    const state = row.state as unknown as Match;
    if (
      state.ownerDeviceId &&
      !['NOTE', 'DEBRIEF', 'FINISH_MATCH'].includes(op.action.type) &&
      (state.ownerDeviceId !== op.deviceId || state.fencingVersion !== op.fencingVersion)
    ) {
      await tx.syncOperation.create({
        data: {
          id: op.id,
          userId,
          deviceId: op.deviceId,
          matchId: op.matchId,
          status: 'QUARANTINED',
          reason: 'DEVICE_REVOKED',
          payload: json(op),
        },
      });
      return { id: op.id, status: 'QUARANTINED', reason: 'DEVICE_REVOKED', match: state };
    }
    if (op.action.type === 'START') {
      const others = await tx.match.findMany({
        where: { userId, id: { not: op.matchId }, status: { in: ['ACTIVE', 'COMPLETED'] } },
        select: { status: true, state: true },
      });
      if (
        others.some(
          (other) => other.status === 'ACTIVE' || requiresCheckout(other.state as unknown as Match),
        )
      )
        throw new Error('ACTIVE_TUNNEL');
    }
    if (
      op.action.type === 'ANSWER' &&
      op.action.photoId &&
      !(await tx.mediaAsset.findFirst({ where: { id: op.action.photoId, userId } }))
    )
      throw new Error('FORBIDDEN');
    const next = applyOperation(state, op);
    const changed = await tx.match.updateMany({
      where: { id: row.id, userId, version: op.expectedVersion },
      data: { state: json(next), status: next.status, version: next.version },
    });
    if (changed.count !== 1) throw new Error('VERSION_CONFLICT');
    if (next.template.steps.length > state.template.steps.length)
      await scheduleNotifications(next, tx, Date.now());
    await tx.matchEvent.create({
      data: {
        matchId: row.id,
        operationId: op.id,
        actorDeviceId: op.deviceId,
        type: op.action.type,
        payload: json(op.action),
        occurredAt: new Date(op.occurredAt),
      },
    });
    await tx.syncOperation.create({
      data: {
        id: op.id,
        userId,
        deviceId: op.deviceId,
        matchId: op.matchId,
        status: 'APPLIED',
        payload: json(op),
      },
    });
    return { id: op.id, status: 'APPLIED', reason: null, match: next };
  });
}
export async function transferTunnel(
  userId: string,
  matchId: string,
  deviceId: string,
  expectedVersion: number,
) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM User WHERE id = ${userId} FOR UPDATE`;
    const row = await tx.match.findFirst({ where: { id: matchId, userId } });
    if (!row) throw new Error('NOT_FOUND');
    if (!(await tx.device.findFirst({ where: { id: deviceId, userId, revokedAt: null } })))
      throw new Error('FORBIDDEN');
    const m = row.state as unknown as Match;
    if (m.status !== 'ACTIVE' && !requiresCheckout(m)) throw new Error('CLOSED');
    if (m.version !== expectedVersion) throw new Error('VERSION_CONFLICT');
    const next = {
      ...m,
      ownerDeviceId: deviceId,
      fencingVersion: m.fencingVersion + 1,
      version: m.version + 1,
    };
    await tx.match.update({
      where: { id: matchId },
      data: { version: next.version, state: json(next) },
    });
    await tx.matchEvent.create({
      data: {
        matchId,
        operationId: crypto.randomUUID(),
        actorDeviceId: deviceId,
        type: 'TRANSFER',
        payload: {
          previousDevice: m.ownerDeviceId ?? '',
          newDevice: deviceId,
          fencingVersion: next.fencingVersion,
        },
        occurredAt: new Date(),
      },
    });
    return next;
  });
}
export async function rematch(userId: string, id: string, kickoffAt: string) {
  const row = await ownedMatch(userId, id);
  const next = createRematch(row.state as unknown as Match, kickoffAt);
  await db.$transaction(async (tx) => {
    await tx.match.create({
      data: {
        id: next.id,
        userId,
        kickoffAt: new Date(next.kickoffAt),
        status: next.status,
        state: json(next),
      },
    });
    await scheduleNotifications(next, tx);
  });
  return next;
}
