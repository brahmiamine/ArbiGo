import { db } from '@/lib/db';
import { profilePatchSchema } from './validation';
import { mergePreferences, type ProfilePreferences } from '@/domain/profile';
import { Prisma } from '@/generated/prisma/client';

export async function updateUserProfile(userId: string, input: unknown) {
  const patch = profilePatchSchema.parse(input);
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM User WHERE id = ${userId} FOR UPDATE`;
    const current = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    const photoId = patch.preferences?.avatarPhotoId;
    if (photoId && !(await tx.mediaAsset.findFirst({ where: { id: photoId, userId } })))
      throw new Error('FORBIDDEN');
    const preferences = mergePreferences(
      current.preferences as unknown as ProfilePreferences,
      patch.preferences,
    );
    return tx.user.update({
      where: { id: userId },
      data: {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        preferences: JSON.parse(JSON.stringify(preferences)) as Prisma.InputJsonValue,
      },
      select: { id: true, name: true, email: true, preferences: true, createdAt: true },
    });
  });
}
