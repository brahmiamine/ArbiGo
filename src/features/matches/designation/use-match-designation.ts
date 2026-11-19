'use client';
import { useEffect, useRef, useState } from 'react';
import { extractDesignationFields } from '@/domain/designation/designation';
import { recognizeDesignationImage } from './ocr-engine';
import { extractTeamLogos } from './read-image';

export interface DesignationImport {
  fields: Record<string, string>;
  logos: Partial<Record<'home' | 'away', File>>;
}
export function useMatchDesignation(onApply: (result: DesignationImport) => void) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [file, setFile] = useState<File>();
  const [failed, setFailed] = useState(false);
  const epoch = useRef(0);
  const applyRef = useRef(onApply);
  useEffect(() => {
    applyRef.current = onApply;
  }, [onApply]);
  useEffect(
    () => () => {
      epoch.current++;
    },
    [],
  );
  async function read(next: File) {
    const id = ++epoch.current;
    const stale = () => id !== epoch.current;
    setFile(next);
    setBusy(true);
    setFailed(false);
    setProgress(0);
    setStatus('Préparation de la lecture…');
    try {
      const result = await recognizeDesignationImage(next, (value: number, label: string) => {
        if (!stale()) {
          setProgress(value);
          setStatus(label);
        }
      });
      if (stale()) return;
      const fields = extractDesignationFields(result.text) as Record<string, string>;
      if (!Object.values(fields).some(Boolean))
        throw new Error('Aucune information détectée. Choisissez une capture plus nette.');
      setStatus('Recherche des logos…');
      let logos: DesignationImport['logos'] = {};
      try {
        logos = await extractTeamLogos(next, result.words, fields);
      } catch {
        /* Text import remains usable if the image contains no separable badges. */
      }
      if (stale()) return;
      applyRef.current({ fields, logos });
      setProgress(100);
      setStatus(
        Object.keys(logos).length
          ? 'Informations remplies. Vérifiez les noms, les horaires et les logos repérés.'
          : 'Informations remplies. Logos non détectés : vous pouvez les ajouter ci-dessous.',
      );
    } catch (error) {
      if (stale()) return;
      setFailed(true);
      setStatus(
        error instanceof Error && error.message.startsWith('Aucune information')
          ? error.message
          : 'Lecture impossible. Réessayez ou remplissez les champs manuellement.',
      );
    } finally {
      if (!stale()) setBusy(false);
    }
  }
  return { busy, status, progress, failed, read, retry: () => file && read(file) };
}
