import { consumeToken } from '@/server/accounts';
import { ok, fail, sameOrigin, jsonBody } from '@/server/http';
import { z } from 'zod';
export async function POST(r: Request) {
  try {
    sameOrigin(r);
    const b = z.object({ token: z.string(), password: z.string() }).parse(await jsonBody(r));
    await consumeToken(b.token, 'RESET', b.password);
    return ok({ message: 'Mot de passe modifié. Reconnectez-vous.' });
  } catch (e) {
    return fail(e);
  }
}
