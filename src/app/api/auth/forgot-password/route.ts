import { requestReset } from '@/server/accounts';
import { ok, fail, sameOrigin, jsonBody } from '@/server/http';
import { z } from 'zod';
export async function POST(r: Request) {
  try {
    sameOrigin(r);
    const { email } = z.object({ email: z.string() }).parse(await jsonBody(r));
    await requestReset(email);
    return ok({ message: 'Si ce compte existe, un e-mail vous sera envoyé.' });
  } catch (e) {
    return fail(e);
  }
}
