import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { errorMessages } from '@/domain/errors';
export async function userId() {
  const s = await auth();
  if (!s?.user?.id) throw new Error('UNAUTHORIZED');
  return s.user.id;
}
export function ok(data: unknown, revision?: number) {
  return NextResponse.json(
    { data, serverTime: new Date().toISOString(), ...(revision !== undefined ? { revision } : {}) },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
export function fail(error: unknown) {
  const code =
    error instanceof ZodError ? 'VALIDATION' : error instanceof Error ? error.message : 'INTERNAL';
  const statuses: Record<string, number> = {
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    RATE_LIMIT: 429,
    VERSION_CONFLICT: 409,
    DEVICE_REVOKED: 409,
    ACTIVE_TUNNEL: 409,
    TOKEN_INVALID: 400,
    SMTP_NOT_CONFIGURED: 503,
  };
  const messages: Record<string, string> = {
    ...errorMessages,
    UNAUTHORIZED: 'Connectez-vous pour continuer.',
    FORBIDDEN: 'Cette action n’est pas autorisée.',
    NOT_FOUND: 'Élément introuvable.',
    RATE_LIMIT: 'Trop de tentatives. Réessayez plus tard.',
    VERSION_CONFLICT:
      'Une autre modification a été enregistrée. Vos actions sont conservées pour résolution.',
    DEVICE_REVOKED: 'Ce tunnel appartient à un autre appareil.',
    TOKEN_INVALID: 'Ce lien est invalide, expiré ou déjà utilisé.',
    SMTP_NOT_CONFIGURED: 'L’envoi des e-mails n’est pas configuré.',
    VALIDATION: 'Vérifiez les champs du formulaire.',
  };
  const known =
    code in messages ||
    [
      'CLOSED',
      'REVIEW_REQUIRED',
      'KIT_REQUIRED',
      'CHECKS_REQUIRED',
      'RECHECK_REQUIRED',
      'COLORS_REQUIRED',
      'OUTFIT_NOT_PACKED',
      'TEMPLATE_UNAPPROVED',
    ].includes(code);
  const status = statuses[code] ?? (known ? 400 : 500);
  if (status === 500)
    console.error('[arbigo]', error instanceof Error ? error.name : 'UnknownError');
  return NextResponse.json(
    {
      error: {
        code: known ? code : 'INTERNAL',
        message: messages[code] ?? (known ? code : 'Le service est indisponible. Réessayez.'),
      },
      serverTime: new Date().toISOString(),
    },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const expected = new URL(process.env.APP_URL ?? request.url).origin;
  if (!origin || origin !== expected) throw new Error('FORBIDDEN');
}
export async function jsonBody(request: Request) {
  if (Number(request.headers.get('content-length') ?? 0) > 256000) throw new Error('FORBIDDEN');
  const reader = request.body?.getReader();
  if (!reader) throw new ZodError([]);
  let length = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 256000) {
      await reader.cancel();
      throw new Error('FORBIDDEN');
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    throw new ZodError([]);
  }
}
