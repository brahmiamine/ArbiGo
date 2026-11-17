import argon2 from 'argon2';
import { randomBytes, createHash } from 'node:crypto';
export const hashPassword = (password: string) =>
  argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
export async function verifyPassword(hash: string, password: string) {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}
export function makeToken() {
  return randomBytes(32).toString('base64url');
}
export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
