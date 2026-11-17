import { db } from '@/lib/db';
import { ok, fail, userId, sameOrigin, jsonBody } from '@/server/http';
import { z } from 'zod';
import { updateUserProfile } from '@/server/profile';
const schema = z.object({
  deviceId: z.uuid(),
  endpoint: z.url().max(512),
  keys: z.object({ p256dh: z.string().max(256), auth: z.string().max(256) }),
});
export async function POST(r: Request) {
  try {
    sameOrigin(r);
    const uid = await userId();
    const data = schema.parse(await jsonBody(r));
    const endpoint = new URL(data.endpoint);
    if (
      endpoint.protocol !== 'https:' ||
      !['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com'].includes(
        endpoint.hostname,
      ) ||
      endpoint.username ||
      endpoint.password
    )
      throw new Error('FORBIDDEN');
    if (
      !(await db.device.findFirst({ where: { id: data.deviceId, userId: uid, revokedAt: null } }))
    )
      throw new Error('FORBIDDEN');
    const existing = await db.pushSubscription.findUnique({
      where: { endpoint: data.endpoint },
      include: { device: true },
    });
    if (existing && existing.device.userId !== uid) throw new Error('FORBIDDEN');
    await db.pushSubscription.upsert({
      where: { endpoint: data.endpoint },
      create: { ...data, active: true },
      update: { ...data, active: true },
    });
    await updateUserProfile(uid, { preferences: { pushEnabled: true } });
    return ok({ subscribed: true });
  } catch (e) {
    return fail(e);
  }
}
export async function DELETE(r: Request) {
  try {
    sameOrigin(r);
    const uid = await userId();
    await db.pushSubscription.updateMany({
      where: { device: { userId: uid } },
      data: { active: false },
    });
    await updateUserProfile(uid, { preferences: { pushEnabled: false } });
    return ok({ subscribed: false });
  } catch (e) {
    return fail(e);
  }
}
