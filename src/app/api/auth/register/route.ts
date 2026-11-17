import { register } from '@/server/accounts';
import { ok, fail, sameOrigin, jsonBody } from '@/server/http';
export async function POST(r: Request) {
  try {
    sameOrigin(r);
    await register(await jsonBody(r));
    return ok({
      message: 'Si cette adresse peut être inscrite, un e-mail de confirmation vous sera envoyé.',
    });
  } catch (e) {
    return fail(e);
  }
}
