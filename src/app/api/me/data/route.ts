import { NextResponse } from 'next/server';
import { userId, sameOrigin, jsonBody, ok, fail } from '@/server/http';
import { rateLimit } from '@/server/accounts';
import { exportPersonalData, deleteAccount } from '@/server/privacy';
import { z } from 'zod';

export async function GET() {
  try {
    const uid = await userId();
    await rateLimit(`personal-export:${uid}`, 4, 3600000);
    return NextResponse.json(await exportPersonalData(uid), {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Disposition': 'attachment; filename="arbigo-donnees-personnelles.json"',
      },
    });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request) {
  try {
    sameOrigin(request);
    const uid = await userId();
    await rateLimit(`account-delete:${uid}`, 5, 3600000);
    const { password } = z
      .object({ password: z.string().min(1).max(128) })
      .parse(await jsonBody(request));
    await deleteAccount(uid, password);
    return ok({ deleted: true });
  } catch (error) {
    return fail(error);
  }
}
