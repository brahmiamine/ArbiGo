import type { LocalStore } from '@/lib/local-store';

export interface TeamLogoDraft {
  id?: string;
  file?: File;
  source?: 'manual' | 'automatic';
}
export async function saveTeamLogo(draft: TeamLogoDraft, store: LocalStore, demo: boolean) {
  if (!draft.file) return draft.id;
  const file = draft.file;
  if (
    !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
    file.size > 10 * 1024 * 1024
  )
    throw new Error('Choisissez un logo JPEG, PNG ou WebP de moins de 10 Mo.');
  const bitmap = await createImageBitmap(file);
  let blob: Blob;
  try {
    if (bitmap.width * bitmap.height > 24000000)
      throw new Error('Le logo est trop grand. Choisissez une image plus petite.');
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 256 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) => (value ? resolve(value) : reject(new Error('Logo illisible.'))),
        'image/webp',
        0.9,
      ),
    );
  } finally {
    bitmap.close();
  }
  let id: string;
  if (demo) id = crypto.randomUUID();
  else {
    const data = new FormData();
    data.set('file', new File([blob], 'logo.webp', { type: blob.type }));
    const response = await fetch('/api/media', { method: 'POST', body: data });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message ?? 'Logo non enregistré.');
    id = result.data.id;
  }
  await store.cache(`media:${id}`, blob);
  return id;
}
