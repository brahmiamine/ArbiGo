import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { pickDetectedFields } from '@/domain/debrief/formModel';
import { countDetectedFields, extractDesignationFields } from '@/domain/designation/designation';
import { OCR_STATUS } from '@/domain/designation/ocrCopy';
import { recognizeDesignationImage } from '../services/ocrEngine';

/**
 * Lecture d'une désignation depuis une capture d'écran.
 * Dès qu'une image est choisie, la lecture et le remplissage du formulaire sont automatiques
 * et aucun panneau n'est affiché. Le panneau ne s'ouvre que si rien n'a pu être rempli,
 * pour expliquer l'échec et proposer de relire l'image.
 * Le moteur OCR et l'analyse du texte sont injectables pour rester testables sans Tesseract.
 */
/** @param {{ onApply?: (fields: Partial<import('@/domain/debrief/schema').DebriefForm>) => void, recognize?: typeof recognizeDesignationImage, extract?: typeof extractDesignationFields }} options */
export function useDesignationOcr({
  recognize = recognizeDesignationImage,
  extract = extractDesignationFields,
  onApply,
} = {}) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [rawText, setRawText] = useState('');
  const [fields, setFields] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState(OCR_STATUS.idle);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const previewUrlRef = useRef('');
  const onApplyRef = useRef(onApply);
  // Numéro de la lecture en cours : une lecture périmée (autre image choisie, capture retirée)
  // ne doit ni écraser l'état courant ni remplir le formulaire.
  const readIdRef = useRef(0);

  useEffect(() => {
    onApplyRef.current = onApply;
  }, [onApply]);

  const releasePreview = useCallback(() => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = '';
    setPreviewUrl('');
  }, []);

  useEffect(
    () => () => {
      readIdRef.current += 1;
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  const read = useCallback(
    async (target) => {
      if (!target) return;
      const readId = ++readIdRef.current;
      const isStale = () => readId !== readIdRef.current;
      setBusy(true);
      setProgress(0);
      setStatus(OCR_STATUS.initializing);

      try {
        const text = await recognize(target, (value, label) => {
          if (isStale()) return;
          setProgress(value);
          setStatus(label);
        });
        if (isStale()) return;
        const detected = extract(text);
        setRawText(text);
        setFields(detected);

        if (countDetectedFields(detected) === 0) {
          setStatus(OCR_STATUS.empty);
          setOpen(true);
          return;
        }

        onApplyRef.current?.(pickDetectedFields(detected));
        setStatus(OCR_STATUS.applied);
        setOpen(false);
      } catch (error) {
        if (isStale()) return;
        console.error(error);
        setStatus(OCR_STATUS.failed);
        setOpen(true);
      } finally {
        if (!isStale()) setBusy(false);
      }
    },
    [extract, recognize],
  );

  /** Sélectionne une capture, puis lance la lecture et le remplissage automatiques. */
  const selectFile = useCallback(
    (nextFile) => {
      if (!nextFile) return undefined;
      readIdRef.current += 1;
      setBusy(false);
      if (!nextFile.type.startsWith('image/')) {
        setStatus(OCR_STATUS.invalidFile);
        setOpen(true);
        return undefined;
      }

      if (nextFile.size > 10 * 1024 * 1024) {
        setStatus('Image trop volumineuse : 10 Mo maximum.');
        setOpen(true);
        return undefined;
      }
      releasePreview();
      previewUrlRef.current = URL.createObjectURL(nextFile);
      setPreviewUrl(previewUrlRef.current);
      setFile(nextFile);
      setRawText('');
      setFields(null);
      setProgress(0);
      setStatus(OCR_STATUS.ready);
      return read(nextFile);
    },
    [read, releasePreview],
  );

  const retry = useCallback(() => read(file), [file, read]);

  /** Retire la capture : le panneau se referme, il n'a plus rien à expliquer. */
  const clear = useCallback(() => {
    readIdRef.current += 1;
    setBusy(false);
    releasePreview();
    setFile(null);
    setRawText('');
    setFields(null);
    setProgress(0);
    setStatus(OCR_STATUS.idle);
    setOpen(false);
  }, [releasePreview]);

  const detectedCount = useMemo(() => countDetectedFields(fields), [fields]);

  return {
    file,
    previewUrl,
    rawText,
    fields,
    detectedCount,
    progress,
    status,
    busy,
    open,
    close: useCallback(() => setOpen(false), []),
    selectFile,
    retry,
    clear,
  };
}
