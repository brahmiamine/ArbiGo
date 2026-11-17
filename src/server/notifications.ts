import { db } from '@/lib/db';
import { scheduledAt } from '@/domain/time';
import type { Match } from '@/domain/types';
export function shouldNotify(match: Match, stepCode: string | null, kind: string) {
  if (kind === 'BAG') return match.status === 'DRAFT' && match.bag.some((i) => !i.packed);
  return (
    match.status === 'ACTIVE' &&
    !!match.ownerDeviceId &&
    !!stepCode &&
    !match.runs[stepCode]?.completedAt
  );
}
export async function scheduleNotifications(match: Match) {
  const jobs = [
    {
      stepCode: null,
      kind: 'BAG',
      scheduledAt: new Date(Date.parse(match.kickoffAt) - 86400000),
      dedupeKey: `${match.id}:bag`,
    },
    ...match.template.steps.flatMap((step) =>
      [5, 0].map((before) => ({
        stepCode: step.code,
        kind: before ? 'PREVIEW' : 'DUE',
        scheduledAt: new Date(scheduledAt(match.kickoffAt, step.offset - before)),
        dedupeKey: `${match.id}:${step.code}:${before}`,
      })),
    ),
  ];
  await db.notificationJob.createMany({
    data: jobs.map((j) => ({ ...j, matchId: match.id })),
    skipDuplicates: true,
  });
}
