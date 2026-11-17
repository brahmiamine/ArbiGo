import { FileDropzone } from '@/components/file-dropzone';
import { memo, useEffect, useRef } from 'react';
import { DESIGNATION_FIELDS } from '@/domain/designation/designation';
import { summarizeOcr } from '@/domain/designation/ocrCopy';

function OcrValue({ label, value }) {
  return (
    <div className={`ocr-value ${value ? '' : 'ocr-value--empty'}`}>
      <span>{label}</span>
      <strong>{value || 'Non détecté'}</strong>
    </div>
  );
}

/**
 * Bouton flottant en bas à droite (icône seule, façon bulle de chat) :
 * le clic ouvre directement la galerie, puis la lecture OCR et le remplissage du formulaire
 * se font automatiquement. Le panneau ne s'affiche que si rien n'a pu être rempli.
 */
function OcrDock({
  open,
  onClose,
  previewUrl,
  busy,
  progress,
  status,
  fields,
  detectedCount,
  rawText,
  onSelectFile,
  onRetry,
  onClear,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  const summary = summarizeOcr({ busy, progress, detectedCount, hasFile: Boolean(previewUrl) });

  return (
    <>
      <FileDropzone
        inputOnly
        inputRef={inputRef}
        inputClassName="ocr-file-input"
        label="Capture de désignation"
        accept="image/*"
        validate={false}
        onFile={onSelectFile}
      />

      <button
        type="button"
        className={`ocr-fab ${busy ? 'ocr-fab--busy' : ''}`}
        aria-label="Lire une désignation depuis une image"
        title={status}
        aria-expanded={open}
        aria-controls="ocr-dock"
        onClick={() => inputRef.current?.click()}
      >
        <span className="ocr-fab__icon" aria-hidden="true">
          {busy ? '⏳' : '📷'}
        </span>
        {detectedCount > 0 && !open ? (
          <span className="ocr-fab__badge" aria-hidden="true">
            {detectedCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <section
          className="ocr-dock"
          id="ocr-dock"
          role="dialog"
          aria-label="Lire une désignation depuis une image"
        >
          <header className="ocr-dock__head">
            <span className="ocr-dock__icon" aria-hidden="true">
              {busy ? '⏳' : '📷'}
            </span>
            <div>
              <strong>Lire une désignation</strong>
              <small>{summary}</small>
            </div>
            <button className="ocr-dock__close" type="button" onClick={onClose} aria-label="Fermer">
              ✕
            </button>
          </header>

          <div className="ocr-dock__body">
            <FileDropzone
              label="Importer une capture"
              accept="image/*"
              validate={false}
              hint="Image de votre désignation · 10 Mo maximum"
              previewUrl={previewUrl}
              busy={busy}
              onFile={onSelectFile}
            />

            <div className="ocr-progress" aria-live="polite">
              <div className="ocr-progress__meta">
                <span>{status}</span>
                {busy ? <strong>{progress}%</strong> : null}
              </div>
              {busy ? (
                <div className="ocr-progress__track">
                  <div className="ocr-progress__bar" style={{ width: `${progress}%` }} />
                </div>
              ) : null}
            </div>

            {!busy ? (
              <div className="ocr-actions">
                <button
                  className="btn btn--ocr-ghost"
                  type="button"
                  onClick={onRetry}
                  disabled={!previewUrl}
                >
                  Relire l’image
                </button>
                <button
                  className="btn btn--ocr-ghost"
                  type="button"
                  onClick={() => inputRef.current?.click()}
                >
                  Choisir une autre image
                </button>
                {previewUrl ? (
                  <button className="btn btn--ocr-ghost" type="button" onClick={onClear}>
                    Retirer
                  </button>
                ) : null}
              </div>
            ) : null}

            {fields ? (
              <div className="ocr-result">
                <div className="ocr-result__head">
                  <strong>Informations détectées</strong>
                </div>
                <div className="ocr-result__grid">
                  {DESIGNATION_FIELDS.map(({ key, label }) => (
                    <OcrValue key={key} label={label} value={fields[key]} />
                  ))}
                </div>
                {rawText ? (
                  <details className="ocr-raw">
                    <summary>Voir le texte OCR brut</summary>
                    <pre>{rawText}</pre>
                  </details>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </>
  );
}

export default memo(OcrDock);
