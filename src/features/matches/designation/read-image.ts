import { detectTeamLogoRegions, type OcrWord } from '@/domain/designation/team-logos';

/** Crops badge candidates from the original image, retaining its pixels rather than OCR text. */
export async function extractTeamLogos(
  file: File,
  words: OcrWord[],
  fields: { homeTeam?: string; awayTeam?: string },
) {
  const image = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 768 / Math.max(image.width, image.height));
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d', { willReadFrequently: true })!;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const regions = detectTeamLogoRegions(
      context.getImageData(0, 0, canvas.width, canvas.height),
      words,
      fields,
    );
    const logos: Partial<Record<'home' | 'away', File>> = {};
    for (const side of ['home', 'away'] as const) {
      const region = regions[side];
      if (!region) continue;
      const crop = document.createElement('canvas');
      crop.width = crop.height = 256;
      const ctx = crop.getContext('2d')!;
      const w = region.width * image.width,
        h = region.height * image.height;
      const factor = Math.min(256 / w, 256 / h);
      ctx.drawImage(
        image,
        region.left * image.width,
        region.top * image.height,
        w,
        h,
        (256 - w * factor) / 2,
        (256 - h * factor) / 2,
        w * factor,
        h * factor,
      );
      const blob = await new Promise<Blob | null>((resolve) => crop.toBlob(resolve, 'image/png'));
      if (blob) logos[side] = new File([blob], `logo-${side}.png`, { type: 'image/png' });
    }
    return logos;
  } finally {
    image.close();
  }
}
