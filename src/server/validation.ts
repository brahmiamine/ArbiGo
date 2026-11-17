import { z } from 'zod';
import { debriefChangesSchema } from '@/domain/debrief/schema';
const colors = z.record(
  z.enum(['home', 'homeKeeper', 'away', 'awayKeeper']),
  z.array(z.string().min(1).max(32)).max(2),
);
export const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('START') }),
  z.object({ type: z.literal('FINISH_MATCH') }),
  z.object({ type: z.literal('DEBRIEF'), changes: debriefChangesSchema }),
  z.object({ type: z.literal('NAVIGATE'), index: z.number().int().min(0).max(30) }),
  z.object({ type: z.literal('BAG'), itemId: z.string().max(100), packed: z.boolean() }),
  z.object({
    type: z.literal('ANSWER'),
    stepCode: z.string().max(40),
    controlCode: z.string().max(40),
    value: z.enum(['OK', 'PROBLEM', 'NA']),
    reason: z.string().trim().max(200).optional(),
    comment: z.string().max(2000).optional(),
    photoId: z.uuid().optional(),
  }),
  z.object({ type: z.literal('COMPLETE'), stepCode: z.string().max(40) }),
  z.object({ type: z.literal('BRIEFING'), stepCode: z.enum(['captains', 'assistants']) }),
  z.object({
    type: z.literal('ISSUE_UPDATE'),
    issueId: z.string().max(100),
    status: z.enum(['REQUESTED', 'WAITING', 'RESOLVED']),
    comment: z.string().max(2000).optional(),
  }),
  z.object({ type: z.literal('COLORS'), colors, selectedOutfitId: z.string().max(100).optional() }),
  z.object({
    type: z.literal('WARMUP'),
    phase: z.number().int().min(0).max(3),
    command: z.enum(['START', 'PAUSE', 'RESUME', 'FINISH']),
  }),
  z.object({ type: z.literal('KICKOFF'), acknowledged: z.boolean() }),
  z.object({
    type: z.literal('CLOSE'),
    reason: z.enum(['CANCELED', 'POSTPONED', 'OTHER']),
    comment: z.string().trim().min(1).max(2000),
  }),
  z.object({ type: z.literal('NOTE'), content: z.string().trim().min(1).max(5000) }),
]);
export const operationSchema = z.object({
  id: z.uuid(),
  matchId: z.uuid(),
  deviceId: z.uuid(),
  fencingVersion: z.number().int().min(0),
  expectedVersion: z.number().int().min(0),
  occurredAt: z.iso.datetime({ offset: true }),
  action: actionSchema,
});
export const equipmentSchema = z.object({
  id: z.string().min(1).max(100),
  label: z.string().trim().min(1).max(100),
  type: z.enum(['SHIRT', 'SHORTS', 'SOCKS', 'SHOES', 'TOOL', 'OTHER']),
  colors: z.array(z.string().max(32)).max(2),
  photoId: z.uuid().optional(),
  active: z.boolean().optional(),
});
export const outfitSchema = z.object({
  id: z.string().max(100),
  name: z.string().trim().min(1).max(100),
  itemIds: z.array(z.string().max(100)).length(4),
  primaryColor: z.string().min(1).max(32),
  secondaryColor: z.string().max(32).optional(),
});
export const inventorySchema = z
  .object({
    catalogVersion: z.number().int().min(0).max(100).optional(),
    equipment: z.array(equipmentSchema).max(1006),
    outfits: z.array(outfitSchema).max(100),
  })
  .superRefine((value, ctx) => {
    if ((value.catalogVersion ?? 0) < 2 && value.equipment.length > 1000)
      ctx.addIssue({
        code: 'custom',
        message: 'L’ancien inventaire est limité à 1 000 articles avant sa mise à jour.',
      });
    const ids = value.equipment.map((i) => i.id);
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({ code: 'custom', message: 'Articles dupliqués' });
    for (const outfit of value.outfits) {
      const types = outfit.itemIds.map((id) => value.equipment.find((i) => i.id === id)?.type);
      if (
        !['SHIRT', 'SHORTS', 'SOCKS', 'SHOES'].every((t) =>
          types.includes(t as (typeof types)[number]),
        )
      )
        ctx.addIssue({
          code: 'custom',
          message: 'Une tenue contient un maillot, un short, des chaussettes et des chaussures.',
        });
    }
  });
