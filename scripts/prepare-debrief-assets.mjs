import { copyFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const target = path.resolve('public/debrief/ocr/v1');
await mkdir(target, { recursive: true });
const packageDirectory = (name) => path.dirname(require.resolve(`${name}/package.json`));
await copyFile(
  path.join(packageDirectory('tesseract.js'), 'dist/worker.min.js'),
  path.join(target, 'worker.min.js'),
);
for (const name of ['tesseract-core-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js']) {
  await copyFile(path.join(packageDirectory('tesseract.js-core'), name), path.join(target, name));
}
for (const language of ['fra', 'eng']) {
  await copyFile(
    path.join(
      packageDirectory(`@tesseract.js-data/${language}`),
      `4.0.0/${language}.traineddata.gz`,
    ),
    path.join(target, `${language}.traineddata.gz`),
  );
}

await mkdir(path.resolve('public/quiz'), { recursive: true });
await copyFile(
  require.resolve('pdfjs-dist/build/pdf.worker.min.mjs'),
  path.resolve('public/quiz/pdf.worker.min.mjs'),
);
