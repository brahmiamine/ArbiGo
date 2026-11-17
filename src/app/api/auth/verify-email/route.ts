import { consumeToken } from '@/server/accounts';
import { ok, fail, sameOrigin, jsonBody } from '@/server/http';
import { z } from 'zod';
export async function POST(r: Request) {
  try {
    sameOrigin(r);
    const { token } = z.object({ token: z.string() }).parse(await jsonBody(r));
    await consumeToken(token, 'VERIFY');
    return ok({ message: 'Adresse confirmée. Vous pouvez vous connecter.' });
  } catch (e) {
    return fail(e);
  }
}
