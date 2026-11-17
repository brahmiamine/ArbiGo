import { expect, it } from 'vitest';
import { db } from '@/lib/db';
import { updateUserProfile } from '@/server/profile';
import { defaultBriefings } from '@/domain/profile';

it('persists partial profile changes across clients, serializes concurrent settings and rejects foreign avatars atomically', async () => {
  const userId = crypto.randomUUID(),
    otherId = crypto.randomUUID();
  const ownedPhoto = crypto.randomUUID(),
    foreignPhoto = crypto.randomUUID();
  for (const id of [userId, otherId])
    await db.user.create({
      data: {
        id,
        name: 'Test profil',
        email: `${id}@test.local`,
        passwordHash: 'unused-test-only',
        preferences: {
          soundEnabled: true,
          pushEnabled: false,
          timezone: 'Europe/Paris',
          locale: 'fr',
          briefings: defaultBriefings,
        },
        inventory: { equipment: [], outfits: [] },
      },
    });
  try {
    await db.mediaAsset.createMany({
      data: [
        {
          id: ownedPhoto,
          userId,
          storageKey: `${ownedPhoto}.webp`,
          size: 100,
          hash: 'a'.repeat(64),
        },
        {
          id: foreignPhoto,
          userId: otherId,
          storageKey: `${foreignPhoto}.webp`,
          size: 100,
          hash: 'b'.repeat(64),
        },
      ],
    });
    await updateUserProfile(userId, {
      name: 'Amine modifié',
      preferences: { avatarPhotoId: ownedPhoto },
    });
    await Promise.all([
      updateUserProfile(userId, {
        preferences: { briefings: { captains: 'Bonjour capitaines personnalisés' } },
      }),
      updateUserProfile(userId, {
        preferences: {
          soundEnabled: false,
          briefings: { assistants: 'Bonjour assistants personnalisés' },
        },
      }),
    ]);
    const saved = await db.user.findUniqueOrThrow({ where: { id: userId } });
    expect(saved.name).toBe('Amine modifié');
    expect(saved.preferences).toMatchObject({
      avatarPhotoId: ownedPhoto,
      soundEnabled: false,
      pushEnabled: false,
      briefings: {
        captains: 'Bonjour capitaines personnalisés',
        assistants: 'Bonjour assistants personnalisés',
        futsalOfficials: defaultBriefings.futsalOfficials,
      },
    });
    await expect(
      updateUserProfile(userId, {
        name: 'Must not change',
        preferences: { avatarPhotoId: foreignPhoto },
      }),
    ).rejects.toThrow('FORBIDDEN');
    expect((await db.user.findUniqueOrThrow({ where: { id: userId } })).name).toBe(saved.name);
    const removed = await updateUserProfile(userId, { preferences: { avatarPhotoId: null } });
    expect(removed.preferences).toMatchObject({
      avatarPhotoId: null,
      briefings: { captains: 'Bonjour capitaines personnalisés' },
    });
  } finally {
    await db.user.deleteMany({ where: { id: { in: [userId, otherId] } } });
  }
});
