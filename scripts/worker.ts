import 'dotenv/config';
import { sendNotification, setVapidDetails } from 'web-push';
import { db } from '../src/lib/db';
import { shouldNotify } from '../src/server/notifications';
import type { Match } from '../src/domain/types';
import { writeFile } from 'node:fs/promises';
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
  setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:admin@example.fr',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
let stopped = false;
for (const signal of ['SIGTERM', 'SIGINT'])
  process.on(signal, () => {
    stopped = true;
  });
async function tick() {
  if (!process.env.VAPID_PRIVATE_KEY) return;
  const now = new Date();
  const jobs = await db.notificationJob.findMany({
    where: {
      scheduledAt: { lte: now },
      sentAt: null,
      canceledAt: null,
      attempts: { lt: 5 },
      OR: [{ claimedAt: null }, { claimedAt: { lt: new Date(+now - 60000) } }],
    },
    orderBy: { scheduledAt: 'asc' },
    take: 30,
    include: { match: true },
  });
  for (const job of jobs) {
    const claimed = await db.notificationJob.updateMany({
      where: {
        id: job.id,
        sentAt: null,
        canceledAt: null,
        OR: [{ claimedAt: null }, { claimedAt: { lt: new Date(+now - 60000) } }],
      },
      data: { claimedAt: now, attempts: { increment: 1 } },
    });
    if (!claimed.count) continue;
    const row = await db.match.findUniqueOrThrow({ where: { id: job.matchId } });
    const match = row.state as unknown as Match;
    if (!shouldNotify(match, job.stepCode, job.kind) || +now - +job.scheduledAt > 10 * 60000) {
      await db.notificationJob.update({ where: { id: job.id }, data: { canceledAt: now } });
      continue;
    }
    const user = await db.user.findUnique({ where: { id: row.userId } });
    const preferences = user?.preferences as { pushEnabled?: boolean };
    if (preferences?.pushEnabled === false) {
      await db.notificationJob.update({ where: { id: job.id }, data: { canceledAt: now } });
      continue;
    }
    const devices = await db.device.findMany({
      where: {
        userId: row.userId,
        revokedAt: null,
        ...(job.kind === 'BAG' ? {} : { id: match.ownerDeviceId }),
      },
      include: { subscriptions: { where: { active: true } } },
    });
    const step = match.template.steps.find((s) => s.code === job.stepCode);
    const payload = JSON.stringify({
      title: job.kind === 'BAG' ? 'Votre sac pour demain' : (step?.title ?? 'ArbiGo'),
      body:
        job.kind === 'BAG'
          ? `${match.homeTeam} / ${match.awayTeam} : préparez votre matériel.`
          : job.kind === 'PREVIEW'
            ? 'Votre prochaine étape commence dans 5 minutes.'
            : 'C’est l’heure prévue de cette étape.',
      tag: job.dedupeKey,
    });
    let retry = false;
    for (const device of devices)
      for (const sub of device.subscriptions) {
        if (
          await db.notificationDelivery.findUnique({
            where: { jobId_subscriptionId: { jobId: job.id, subscriptionId: sub.id } },
          })
        )
          continue;
        try {
          await sendNotification(
            { endpoint: sub.endpoint, keys: sub.keys as { p256dh: string; auth: string } },
            payload,
            { TTL: 300, urgency: 'normal', timeout: 10000 },
          );
          await db.notificationDelivery.create({ data: { jobId: job.id, subscriptionId: sub.id } });
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410)
            await db.pushSubscription.update({ where: { id: sub.id }, data: { active: false } });
          else retry = true;
        }
      }
    await db.notificationJob.update({
      where: { id: job.id },
      data: retry
        ? { claimedAt: new Date(Date.now() + 2 ** job.attempts * 15000) }
        : { sentAt: now },
    });
  }
  await db.rateLimit.deleteMany({ where: { resetAt: { lt: new Date(Date.now() - 86400000) } } });
}
while (!stopped) {
  try {
    await tick();
    await writeFile(
      process.env.ARBIGO_WORKER_HEARTBEAT ?? '/tmp/arbigo-worker-heartbeat',
      String(Date.now()),
    );
  } catch (error) {
    console.error('[worker]', error instanceof Error ? error.name : 'UnknownError');
  }
  await new Promise((resolve) => setTimeout(resolve, 10000));
}
await db.$disconnect();
