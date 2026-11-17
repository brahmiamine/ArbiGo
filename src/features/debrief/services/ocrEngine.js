import { extractDesignationFields } from '@/domain/designation/designation';
import { tsvToText } from '@/domain/designation/layout';
import { needsSecondReading, pickBestReading } from '@/domain/designation/reading';

/** Agrandissement de la seconde lecture : les noms en petits caractères deviennent lisibles. */
const SECOND_READING_SCALE = 2;

/** Image agrandie en PNG, pour une seconde lecture. */
async function upscaleImage(file, scale) {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    const factor = Math.min(scale, 4000 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.round(bitmap.width * factor);
    canvas.height = Math.round(bitmap.height * factor);
    const context = canvas.getContext('2d');
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Agrandissement impossible'))),
        'image/png',
      ),
    );
  } finally {
    bitmap.close?.();
  }
}

/**
 * Reconnaissance de texte d'une image via Tesseract.js.
 * Le texte est reconstitué depuis la sortie TSV pour conserver la mise en page de la désignation :
 * sans les coordonnées des mots, les deux équipes d'une même ligne seraient indissociables.
 * Le moteur est chargé à la demande : tesseract.js ne fait pas partie du bundle initial.
 * Quand un nom d'équipe manque à la première lecture, une seconde lecture sur l'image agrandie
 * est tentée et la meilleure des deux est conservée.
 */
export async function recognizeDesignationImage(file, onProgress = () => {}) {
  const { createWorker } = await import('tesseract.js');

  const assetBase = `${location.origin}/debrief/ocr/v1`;
  const worker = await createWorker(['fra', 'eng'], 1, {
    workerPath: `${assetBase}/worker.min.js`,
    workerBlobURL: false,
    corePath: assetBase,
    langPath: assetBase,
    logger: (message) => {
      const percent = Math.round((message.progress || 0) * 100);
      if (message.status === 'recognizing text') onProgress(percent, 'Lecture du texte…');
      else if (message.status === 'loading language traineddata')
        onProgress(percent, 'Chargement du français…');
      else if (message.status === 'initializing api') onProgress(percent, 'Initialisation OCR…');
    },
  });

  const read = async (image) => {
    const { data } = await worker.recognize(image, {}, { text: true, tsv: true });
    return tsvToText(data.tsv) || data.text || '';
  };

  try {
    const bitmap = await createImageBitmap(file);
    const oversized = Math.max(bitmap.width, bitmap.height) > 2400;
    bitmap.close();
    const first = await read(oversized ? await upscaleImage(file, 1) : file);
    if (!needsSecondReading(extractDesignationFields(first))) return first;

    try {
      onProgress(0, 'Seconde lecture…');
      const second = await read(await upscaleImage(file, SECOND_READING_SCALE));
      return pickBestReading(first, second);
    } catch (error) {
      // La seconde lecture est un bonus : sa panne ne doit pas faire perdre la première.
      console.warn('Seconde lecture ignorée', error);
      return first;
    }
  } finally {
    await worker.terminate();
  }
}
