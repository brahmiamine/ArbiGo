import { db } from '@/lib/db';
import { Prisma } from '@/generated/prisma/client';
import { upgradeInventory } from '@/domain/equipment';
import type { Inventory } from '@/domain/types';
/** Serialize catalog updates with account writes so custom items cannot be overwritten by a concurrent migration. */
export async function currentInventory(userId: string): Promise<Inventory> {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM User WHERE id = ${userId} FOR UPDATE`;
    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { inventory: true },
    });
    const previous = user.inventory as unknown as Inventory;
    const next = upgradeInventory(previous);
    if (next !== previous)
      await tx.user.update({
        where: { id: userId },
        data: { inventory: JSON.parse(JSON.stringify(next)) as Prisma.InputJsonValue },
      });
    return next;
  });
}
