import { defineConfig, globalIgnores } from 'eslint/config';
import next from 'eslint-config-next/core-web-vitals';
import ts from 'eslint-config-next/typescript';
export default defineConfig([
  ...next,
  ...ts,
  globalIgnores([
    'src/generated/**',
    'work/**',
    'public/quiz/**',
    'public/debrief/ocr/**',
    'coverage/**',
    'test-results/**',
    'playwright-report/**',
    '.superpowers/**',
  ]),
]);
