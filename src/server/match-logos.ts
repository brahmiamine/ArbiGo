import { db } from '@/lib/db';
import type { MatchInput } from '@/domain/types';

export async function assertMatchLogosOwned(userId: string, input: MatchInput) {
  const ids = [...new Set([input.homeLogoId, input.awayLogoId].filter((id): id is string => !!id))];
  if (
    ids.length &&
    (await db.mediaAsset.count({ where: { id: { in: ids }, userId } })) !== ids.length
  )
    throw new Error('FORBIDDEN');
}
