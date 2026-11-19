import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('@/lib/db', () => ({ db: { mediaAsset: { count: vi.fn() } } }));
import { db } from '@/lib/db';
import { assertMatchLogosOwned } from '@/server/match-logos';
const input = {
  homeTeam: 'A',
  awayTeam: 'B',
  practice: 'FOOT_11' as const,
  kickoffAt: '2026-12-01T14:00:00Z',
  timezone: 'Europe/Paris',
};
beforeEach(() => vi.resetAllMocks());
it('checks private media ownership for both logos, including when the same logo is used twice', async () => {
  vi.mocked(db.mediaAsset.count).mockResolvedValue(1);
  await expect(
    assertMatchLogosOwned('owner', { ...input, homeLogoId: 'crest', awayLogoId: 'crest' }),
  ).resolves.toBeUndefined();
  expect(db.mediaAsset.count).toHaveBeenCalledWith({
    where: { id: { in: ['crest'] }, userId: 'owner' },
  });
});
it('rejects a missing or foreign logo instead of storing a private reference from another account', async () => {
  vi.mocked(db.mediaAsset.count).mockResolvedValue(1);
  await expect(
    assertMatchLogosOwned('owner', { ...input, homeLogoId: 'owned', awayLogoId: 'foreign' }),
  ).rejects.toThrow('FORBIDDEN');
  expect(db.mediaAsset.count).toHaveBeenCalledWith({
    where: { id: { in: ['owned', 'foreign'] }, userId: 'owner' },
  });
});
it('allows existing matches with no logo references without querying media storage', async () => {
  await expect(assertMatchLogosOwned('owner', input)).resolves.toBeUndefined();
  expect(db.mediaAsset.count).not.toHaveBeenCalled();
});
