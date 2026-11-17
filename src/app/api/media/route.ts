import { userId, sameOrigin, ok, fail } from '@/server/http';
import { db } from '@/lib/db';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { hashToken } from '@/lib/security';
import { rateLimit } from '@/server/accounts';
export async function POST(r: Request) {
  let saved: string | undefined;
  try {
    sameOrigin(r);
    const uid = await userId();
    await rateLimit(`media-upload:${uid}`, 30, 60000);
    const max = 10 * 1024 * 1024;
    if (Number(r.headers.get('content-length') ?? 0) > max + 10000) throw new Error('FORBIDDEN');
    const reader = r.body?.getReader();
    if (!reader) throw new Error('FORBIDDEN');
    let total = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > max + 10000) {
        await reader.cancel();
        throw new Error('FORBIDDEN');
      }
      chunks.push(value);
    }
    const form = await new Request(r.url, {
      method: 'POST',
      headers: { 'content-type': r.headers.get('content-type') ?? '' },
      body: Buffer.concat(chunks),
    }).formData();
    const file = form.get('file');
    if (!(file instanceof File) || file.size > max) throw new Error('FORBIDDEN');
    const bytes = Buffer.from(await file.arrayBuffer());
    const metadata = await sharp(bytes, { limitInputPixels: 24000000 })
      .metadata()
      .catch(() => {
        throw new Error('FORBIDDEN');
      });
    if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? '')) throw new Error('FORBIDDEN');
    const output = await sharp(bytes)
      .rotate()
      .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer()
      .catch(() => {
        throw new Error('FORBIDDEN');
      });
    const id = crypto.randomUUID(),
      storageKey = `${id}.webp`;
    const root = process.env.MEDIA_ROOT ?? 'data/media';
    await mkdir(root, { recursive: true });
    saved = path.join(root, storageKey);
    await writeFile(saved, output, { flag: 'wx', mode: 0o600 });
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM User WHERE id = ${uid} FOR UPDATE`;
      const usage = await tx.mediaAsset.aggregate({ where: { userId: uid }, _sum: { size: true } });
      if ((usage._sum.size ?? 0) + output.length > 200 * 1024 * 1024) throw new Error('FORBIDDEN');
      await tx.mediaAsset.create({
        data: {
          id,
          userId: uid,
          storageKey,
          size: output.length,
          hash: hashToken(output.toString('base64')),
        },
      });
    });
    return ok({ id, url: `/api/media/${id}` });
  } catch (e) {
    if (saved) await unlink(saved).catch(() => {});
    return fail(e);
  }
}
