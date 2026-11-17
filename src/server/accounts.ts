import { db } from '@/lib/db';
import { hashPassword, verifyPassword, hashToken, makeToken } from '@/lib/security';
import { defaultEquipment, INVENTORY_CATALOG_VERSION } from '@/domain/equipment';
import { z } from 'zod';
import nodemailer from 'nodemailer';
export const emailSchema = z
  .email()
  .max(191)
  .transform((s) => s.toLowerCase().trim());
export const passwordSchema = z.string().min(12, 'Utilisez au moins 12 caractères.').max(128);
export async function rateLimit(key: string, max = 8, windowMs = 15 * 60 * 1000) {
  const now = new Date();
  const digest = hashToken(key);
  await db.$transaction(async (tx) => {
    const row = await tx.rateLimit.upsert({
      where: { key: digest },
      create: { key: digest, resetAt: new Date(+now + windowMs) },
      update: { count: { increment: 1 } },
    });
    if (row.resetAt < now) {
      await tx.rateLimit.update({
        where: { key: digest },
        data: { count: 1, resetAt: new Date(+now + windowMs) },
      });
      return;
    }
    if (row.count > max) throw new Error('RATE_LIMIT');
  });
}
async function sendAccountMail(email: string, token: string, purpose: 'VERIFY' | 'RESET') {
  const path = purpose === 'VERIFY' ? 'verify' : 'reset';
  const url = new URL(`/auth/${path}`, process.env.APP_URL ?? 'http://localhost:3000');
  url.searchParams.set('token', token);
  if (!process.env.SMTP_HOST) throw new Error('SMTP_NOT_CONFIGURED');
  const port = Number(process.env.SMTP_PORT ?? 587);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    ...(process.env.SMTP_USER
      ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } }
      : {}),
  });
  await transporter.sendMail({
    from: process.env.MAIL_FROM ?? 'ArbiGo <noreply@localhost>',
    to: email,
    subject:
      purpose === 'VERIFY'
        ? 'Confirmez votre compte ArbiGo'
        : 'Réinitialisez votre mot de passe ArbiGo',
    text: `${purpose === 'VERIFY' ? 'Confirmez votre adresse' : 'Choisissez un nouveau mot de passe'} : ${url}\nCe lien est personnel, temporaire et à usage unique.`,
  });
}
export async function register(input: unknown) {
  const { email, password, name } = z
    .object({
      email: emailSchema,
      password: passwordSchema,
      name: z.string().trim().min(1).max(100),
    })
    .parse(input);
  await rateLimit(`register:${email}`, 4);
  const passwordHash = await hashPassword(password);
  const user = await db.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name,
      passwordHash,
      preferences: {
        soundEnabled: true,
        pushEnabled: false,
        timezone: 'Europe/Paris',
        locale: 'fr',
      },
      inventory: JSON.parse(
        JSON.stringify({
          equipment: defaultEquipment(),
          outfits: [],
          catalogVersion: INVENTORY_CATALOG_VERSION,
        }),
      ),
    },
  });
  const token = makeToken();
  const issued = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM User WHERE id = ${user.id} FOR UPDATE`;
    const current = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
    if (current.emailVerifiedAt) return false;
    await tx.user.update({ where: { id: user.id }, data: { passwordHash, name } });
    await tx.accountToken.updateMany({
      where: { userId: user.id, purpose: 'VERIFY', usedAt: null },
      data: { usedAt: new Date() },
    });
    await tx.accountToken.create({
      data: {
        userId: user.id,
        hash: hashToken(token),
        purpose: 'VERIFY',
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    return true;
  });
  if (issued) await sendAccountMail(email, token, 'VERIFY');
}
export async function requestReset(input: unknown) {
  const email = emailSchema.parse(input);
  await rateLimit(`reset:${email}`, 4);
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return;
  const token = makeToken();
  await db.accountToken.create({
    data: {
      userId: user.id,
      hash: hashToken(token),
      purpose: 'RESET',
      expiresAt: new Date(Date.now() + 3600000),
    },
  });
  await sendAccountMail(email, token, 'RESET');
}
export async function consumeToken(token: string, purpose: 'VERIFY' | 'RESET', password?: string) {
  if (token.length < 40 || token.length > 100) throw new Error('TOKEN_INVALID');
  const passwordHash =
    purpose === 'RESET' ? await hashPassword(passwordSchema.parse(password)) : undefined;
  await db.$transaction(async (tx) => {
    const row = await tx.accountToken.findUnique({ where: { hash: hashToken(token) } });
    if (!row || row.purpose !== purpose || row.usedAt || row.expiresAt < new Date())
      throw new Error('TOKEN_INVALID');
    const used = await tx.accountToken.updateMany({
      where: { id: row.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (used.count !== 1) throw new Error('TOKEN_INVALID');
    await tx.user.update({
      where: { id: row.userId },
      data:
        purpose === 'VERIFY'
          ? { emailVerifiedAt: new Date() }
          : { passwordHash, sessionVersion: { increment: 1 } },
    });
    await tx.accountToken.updateMany({
      where: { userId: row.userId, purpose, usedAt: null },
      data: { usedAt: new Date() },
    });
  });
}
export async function authenticate(email: unknown, password: unknown) {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success || typeof password !== 'string' || password.length > 128) return null;
  await rateLimit(`login:${parsed.data}`, 10);
  const user = await db.user.findUnique({ where: { email: parsed.data } });
  if (!user) {
    await hashPassword('dummy-password-comparison');
    return null;
  }
  if (!(await verifyPassword(user.passwordHash, password)) || !user.emailVerifiedAt) return null;
  return { id: user.id, email: user.email, name: user.name, sessionVersion: user.sessionVersion };
}
