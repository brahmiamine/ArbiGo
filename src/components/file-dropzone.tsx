'use client';
import { useEffect, useId, useRef, useState, type Ref } from 'react';
import { ImagePlus, UploadCloud, LoaderCircle } from 'lucide-react';
interface Props {
  label: string;
  onFile: (file: File) => void | Promise<unknown>;
  accept?: string;
  hint?: string;
  disabled?: boolean;
  busy?: boolean;
  inputOnly?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  inputClassName?: string;
  previewUrl?: string;
  validate?: boolean;
  compact?: boolean;
}
/** One accessible file picker for gallery selection, keyboard use and drag-and-drop. */
export function FileDropzone({
  label,
  onFile,
  accept = 'image/jpeg,image/png,image/webp',
  hint = 'JPEG, PNG ou WebP · 10 Mo maximum',
  disabled = false,
  busy = false,
  inputOnly = false,
  inputRef,
  inputClassName = '',
  previewUrl,
  validate = true,
  compact = false,
}: Props) {
  const id = useId();
  const [dragging, setDragging] = useState(false);
  const [name, setName] = useState('');
  const [failure, setFailure] = useState('');
  const [preview, setPreview] = useState('');
  const ownedUrl = useRef('');
  useEffect(
    () => () => {
      if (ownedUrl.current) URL.revokeObjectURL(ownedUrl.current);
    },
    [],
  );
  async function select(file?: File) {
    if (!file || disabled || busy) return;
    if (validate) {
      if (file.size > 10 * 1024 * 1024) {
        setFailure('Le fichier dépasse 10 Mo. Choisissez une image plus légère.');
        return;
      }
      const allowed = accept
        .split(',')
        .some((type) =>
          type.endsWith('/*') ? file.type.startsWith(type.slice(0, -1)) : file.type === type,
        );
      if (!allowed) {
        setFailure('Format non pris en charge. Choisissez une image JPEG, PNG ou WebP.');
        return;
      }
    }
    setFailure('');
    setName(file.name);
    if (ownedUrl.current) URL.revokeObjectURL(ownedUrl.current);
    ownedUrl.current =
      !inputOnly && validate && file.type.startsWith('image/') ? URL.createObjectURL(file) : '';
    setPreview(ownedUrl.current);
    try {
      await onFile(file);
    } catch {
      setFailure('Import impossible. Réessayez.');
    }
  }
  const input = (
    <input
      id={id}
      ref={inputRef}
      type="file"
      accept={accept}
      className={`file-zone-input ${inputClassName}`}
      aria-label={label}
      aria-describedby={inputOnly ? undefined : `${id}-hint`}
      disabled={disabled || busy}
      tabIndex={inputOnly ? -1 : 0}
      onChange={(event) => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = '';
        void select(file);
      }}
    />
  );
  if (inputOnly) return input;
  return (
    <div className="file-import">
      <label
        htmlFor={id}
        className={`file-zone ${dragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
        aria-busy={busy}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled && !busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void select(event.dataTransfer.files[0]);
        }}
      >
        {input}
        <span className="file-zone-icon">
          {busy ? (
            <LoaderCircle className="file-zone-spinner" size={23} />
          ) : previewUrl || preview ? (
            // Temporary local previews do not need the remote image optimizer.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl || preview} alt="Aperçu du fichier sélectionné" />
          ) : (
            <ImagePlus size={25} />
          )}
        </span>
        <span className="file-zone-copy">
          <strong>{label}</strong>
          <span>
            {busy
              ? 'Import en cours…'
              : name ||
                (compact
                  ? 'Choisir une image'
                  : 'Glissez une image ici ou choisissez-la dans vos fichiers')}
          </span>
          <small id={`${id}-hint`}>{hint}</small>
        </span>
        <span className="file-zone-action">
          <UploadCloud size={16} />
          {busy ? 'Import…' : 'Choisir une image'}
        </span>
      </label>
      {failure && (
        <p className="form-error" role="alert">
          {failure}
        </p>
      )}
    </div>
  );
}
