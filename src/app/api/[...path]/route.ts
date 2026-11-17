import { db } from '@/lib/db';
import { ok, fail, userId, sameOrigin, jsonBody } from '@/server/http';
import {
  newMatch,
  ownedMatch,
  syncOne,
  transferTunnel,
  rematch,
  selectTemplate,
} from '@/server/matches';
import { inventorySchema, operationSchema } from '@/server/validation';
import { matchInputSchema, createMatch } from '@/domain/match';
import { z } from 'zod';
import type { Match } from '@/domain/types';
import { Prisma } from '@/generated/prisma/client';
import { rateLimit } from '@/server/accounts';
import { currentInventory } from '@/server/inventory';
import { upgradeInventory } from '@/domain/equipment';
import { scheduleNotifications } from '@/server/notifications';
type Context = { params: Promise<{ path: string[] }> };
const json = (v: unknown) => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
export async function GET(r: Request, c: Context) {
  try {
    const uid = await userId();
    const path = (await c.params).path;
    if (path[0] === 'me') {
      const user = await db.user.findUniqueOrThrow({
        where: { id: uid },
        select: { id: true, name: true, email: true, preferences: true, createdAt: true },
      });
      return ok({ ...user, vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '' });
    }
    if (path[0] === 'inventory' || path[0] === 'equipment' || path[0] === 'outfits') {
      const inventory = await currentInventory(uid);
      return ok(
        path[0] === 'inventory' ? inventory : inventory[path[0] as 'equipment' | 'outfits'],
      );
    }
    if (path[0] === 'devices')
      return ok(
        await db.device.findMany({
          where: { userId: uid },
          select: { id: true, label: true, lastSeenAt: true, revokedAt: true },
        }),
      );
    if (path.join('/') === 'sync/bootstrap') {
      const [matches, inventory, quarantine] = await Promise.all([
        db.match.findMany({ where: { userId: uid }, orderBy: { kickoffAt: 'desc' }, take: 200 }),
        currentInventory(uid),
        db.syncOperation.findMany({
          where: { userId: uid, status: 'QUARANTINED' },
          orderBy: { receivedAt: 'desc' },
          take: 100,
        }),
      ]);
      return ok({ matches: matches.map((m) => m.state), inventory, quarantine });
    }
    if (path[0] === 'matches') {
      if (!path[1])
        return ok(
          (
            await db.match.findMany({
              where: { userId: uid },
              orderBy: { kickoffAt: 'asc' },
              take: 200,
            })
          ).map((m) => m.state),
        );
      const m = await ownedMatch(uid, path[1]);
      if (path[2] === 'history')
        return ok({
          match: m.state,
          events: await db.matchEvent.findMany({
            where: { matchId: m.id },
            orderBy: [{ receivedAt: 'asc' }, { id: 'asc' }],
          }),
        });
      return ok(m.state, m.version);
    }
    throw new Error('NOT_FOUND');
  } catch (e) {
    return fail(e);
  }
}
export async function POST(r: Request, c: Context) {
  return mutate(r, c, 'POST');
}
export async function PUT(r: Request, c: Context) {
  return mutate(r, c, 'PUT');
}
export async function PATCH(r: Request, c: Context) {
  return mutate(r, c, 'PATCH');
}
export async function DELETE(r: Request, c: Context) {
  return mutate(r, c, 'DELETE');
}
async function mutate(r: Request, c: Context, method: string) {
  try {
    sameOrigin(r);
    const uid = await userId();
    await rateLimit(`mutation:${uid}`, 600, 60000);
    const path = (await c.params).path;
    const b = method === 'DELETE' ? {} : await jsonBody(r);
    if (path[0] === 'me' && method === 'PATCH') {
      const parsed = z
        .object({
          name: z.string().trim().min(1).max(100).optional(),
          preferences: z
            .object({
              soundEnabled: z.boolean(),
              pushEnabled: z.boolean(),
              timezone: z.string().max(100),
              locale: z.literal('fr'),
            })
            .optional(),
        })
        .parse(b);
      await db.user.update({ where: { id: uid }, data: parsed });
      return ok({ updated: true });
    }
    if (path[0] === 'devices') {
      if (method === 'POST') {
        const device = z.object({ id: z.uuid(), label: z.string().max(100) }).parse(b);
        const existing = await db.device.findUnique({ where: { id: device.id } });
        if (existing && (existing.userId !== uid || existing.revokedAt))
          throw new Error('FORBIDDEN');
        return ok(
          await db.device.upsert({
            where: { id: device.id },
            create: { ...device, userId: uid },
            update: { lastSeenAt: new Date() },
          }),
        );
      }
      if (method === 'DELETE' && path[1]) {
        await db.device.updateMany({
          where: { id: path[1], userId: uid },
          data: { revokedAt: new Date() },
        });
        await db.pushSubscription.updateMany({
          where: { deviceId: path[1], device: { userId: uid } },
          data: { active: false },
        });
        return ok({ revoked: true });
      }
    }
    if (path[0] === 'inventory' && method === 'PUT') {
      const parsed = upgradeInventory(inventorySchema.parse(b));
      const ids = parsed.equipment.flatMap((i) => (i.photoId ? [i.photoId] : []));
      if (
        ids.length &&
        (await db.mediaAsset.count({ where: { id: { in: ids }, userId: uid } })) !==
          new Set(ids).size
      )
        throw new Error('FORBIDDEN');
      await db.user.update({ where: { id: uid }, data: { inventory: json(parsed) } });
      return ok(parsed);
    }
    if (path.join('/') === 'sync/batch') {
      const { operations } = z
        .object({ operations: z.array(operationSchema).min(1).max(50) })
        .parse(b);
      const results = [];
      for (const op of operations) {
        try {
          const result = await syncOne(uid, op);
          results.push(result);
          if (result.status !== 'APPLIED') break;
        } catch (error) {
          const code = error instanceof Error ? error.message : 'INTERNAL';
          results.push({ id: op.id, status: 'CONFLICT', reason: code });
          break;
        }
      }
      return ok({ results });
    }
    if (path[0] === 'tunnels' && path[2] === 'transfer') {
      const v = z.object({ deviceId: z.uuid(), expectedVersion: z.number().int() }).parse(b);
      return ok(await transferTunnel(uid, path[1], v.deviceId, v.expectedVersion));
    }
    if (path[0] === 'matches') {
      if (!path[1] && method === 'POST') return ok(await newMatch(uid, b));
      if (path[2] === 'create-rematch') {
        const { kickoffAt } = z.object({ kickoffAt: z.iso.datetime({ offset: true }) }).parse(b);
        return ok(await rematch(uid, path[1], kickoffAt));
      }
      if (!path[2] && method === 'PATCH') {
        const { input, expectedVersion } = z
          .object({ input: matchInputSchema, expectedVersion: z.number().int() })
          .parse(b);
        const row = await ownedMatch(uid, path[1]);
        const old = row.state as unknown as Match;
        if (old.status !== 'DRAFT') throw new Error('CLOSED');
        const inventory = await currentInventory(uid);
        const next = createMatch(
          input,
          inventory.equipment,
          await selectTemplate(input.practice),
          old.id,
        );
        next.bag = next.bag.map((i) => ({
          ...i,
          packed: old.bag.find((previous) => previous.id === i.id)?.packed ?? false,
        }));
        next.appliedOperations = old.appliedOperations;
        next.version = old.version + 1;
        next.outfits = inventory.outfits;
        await db.$transaction(async (tx) => {
          const result = await tx.match.updateMany({
            where: { id: old.id, userId: uid, version: expectedVersion, status: 'DRAFT' },
            data: { state: json(next), kickoffAt: new Date(next.kickoffAt), version: next.version },
          });
          if (!result.count) throw new Error('VERSION_CONFLICT');
          await tx.notificationJob.deleteMany({ where: { matchId: old.id, sentAt: null } });
          await scheduleNotifications(next, tx);
        });
        return ok(next, next.version);
      }
      // Explicit endpoints share the exact same validated event pipeline as offline batches.
      const operation = operationSchema.parse(b);
      if (operation.matchId !== path[1]) throw new Error('FORBIDDEN');
      const allowed: Record<string, string[]> = {
        bag: ['BAG'],
        'tunnel/start': ['START'],
        kickoff: ['KICKOFF'],
        'close-without-kickoff': ['CLOSE'],
        notes: ['NOTE'],
        debrief: ['DEBRIEF', 'FINISH_MATCH'],
      };
      const route = path.slice(2).join('/');
      const expected =
        allowed[route] ??
        (path[2] === 'steps' && path[4] === 'responses'
          ? ['ANSWER', 'COLORS', 'ISSUE_UPDATE', 'WARMUP']
          : path[2] === 'steps' && path[4] === 'complete'
            ? ['COMPLETE']
            : []);
      if (!expected.includes(operation.action.type)) throw new Error('FORBIDDEN');
      return ok(await syncOne(uid, operation));
    }
    throw new Error('NOT_FOUND');
  } catch (e) {
    return fail(e);
  }
}
