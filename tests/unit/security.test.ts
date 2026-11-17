import { expect, it } from 'vitest';
import { hashPassword, verifyPassword, makeToken, hashToken } from '@/lib/security';
it('uses Argon2id and refuses a different password', async () => {
  const hash = await hashPassword('Long-secret-2026!');
  expect(hash).toMatch(/^\$argon2id\$/);
  expect(await verifyPassword(hash, 'Long-secret-2026!')).toBe(true);
  expect(await verifyPassword(hash, 'wrong')).toBe(false);
});
it('generates unpredictable tokens and stores only a SHA-256 digest', () => {
  const one = makeToken();
  const two = makeToken();
  expect(one).not.toBe(two);
  expect(one.length).toBeGreaterThanOrEqual(43);
  expect(hashToken(one)).toHaveLength(64);
  expect(hashToken(one)).not.toBe(one);
});
