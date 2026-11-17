import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/security';
import { unlink } from 'node:fs/promises';
import path from 'node:path';

export async function exportPersonalData(userId: string) {
  return db.$transaction(async (tx) => {
    const account = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        preferences: true,
        inventory: true,
        createdAt: true,
      },
    });
    return {
      exportedAt: new Date().toISOString(),
      account,
      devices: await tx.device.findMany({
        where: { userId },
        select: { id: true, label: true, lastSeenAt: true, revokedAt: true },
      }),
      matches: await tx.match.findMany({ where: { userId }, include: { events: true } }),
      operations: await tx.syncOperation.findMany({ where: { userId } }),
      media: await tx.mediaAsset.findMany({ where: { userId } }),
    };
  });
}

export async function deleteAccount(userId: string, password: string) {
  const media = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM User WHERE id = ${userId} FOR UPDATE`;
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await verifyPassword(user.passwordHash, password))) throw new Error('FORBIDDEN');
    const assets = await tx.mediaAsset.findMany({
      where: { userId },
      select: { storageKey: true },
    });
    await tx.user.delete({ where: { id: userId } });
    return assets;
  });
  // Database ownership disappears first, immediately making all photos inaccessible.
  // A failed filesystem removal is logged without retaining a path or user data.
  for (const asset of media) {
    try {
      await unlink(path.join(process.env.MEDIA_ROOT ?? 'data/media', asset.storageKey));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
        console.error('[arbigo] MEDIA_CLEANUP_FAILED');
    }
  }
}
