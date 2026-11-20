'use client';
import { useEffect, useState } from 'react';
import { FileDropzone } from '@/components/file-dropzone';
import { Button } from '@/components/ui';
import { MediaPhoto } from '../media';
import type { TeamLogoDraft } from './team-logo-files';

export function TeamLogoInput({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: TeamLogoDraft;
  disabled: boolean;
  onChange: (value: TeamLogoDraft) => void;
}) {
  const [preview, setPreview] = useState<{ file: File; url: string }>();
  useEffect(() => {
    const file = value.file;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreview({ file, url: String(reader.result) });
    reader.readAsDataURL(file);
    return () => {
      reader.onload = null;
      reader.abort();
    };
  }, [value.file]);
  return (
    <section className="team-logo-input" aria-label={label}>
      {value.id && !value.file && (
        <span className="team-logo saved-logo">
          <MediaPhoto key={value.id} id={value.id} alt={label} />
        </span>
      )}
      <FileDropzone
        key={value.id ?? value.file?.name ?? 'empty'}
        label={label}
        compact
        previewUrl={value.file && preview?.file === value.file ? preview.url : ''}
        hint="Facultatif · 10 Mo max."
        disabled={disabled}
        onFile={(file) => onChange({ file, source: 'manual' })}
      />
      {value.source === 'automatic' && (
        <small>Logo repéré dans la capture : vérifiez l’équipe et le recadrage.</small>
      )}
      {(value.file || value.id) && (
        <Button type="button" variant="ghost" disabled={disabled} onClick={() => onChange({})}>
          Retirer {label.toLocaleLowerCase('fr')}
        </Button>
      )}
    </section>
  );
}
