import { userId, fail } from '@/server/http';
import { db } from '@/lib/db';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
export async function GET(r: Request, c: { params: Promise<{ id: string }> }) {
  try {
    const uid = await userId();
    const { id } = await c.params;
    const asset = await db.mediaAsset.findFirst({ where: { id, userId: uid } });
    if (!asset) throw new Error('NOT_FOUND');
    const bytes = await readFile(
      /* turbopackIgnore: true */
      path.join(
        /* turbopackIgnore: true */ process.env.MEDIA_ROOT ?? 'data/media',
        asset.storageKey,
      ),
    );
    return new Response(bytes, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (e) {
    return fail(e);
  }
}
