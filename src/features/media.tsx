'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { Shirt } from 'lucide-react';
import { useApp } from './app-provider';
import { EquipmentArt } from '@/components/equipment-art';
import type { Equipment } from '@/domain/types';

export function ProfileAvatar({
  name,
  photoId,
  large = false,
}: {
  name: string;
  photoId?: string | null;
  large?: boolean;
}) {
  const initial = name.trim().charAt(0).toLocaleUpperCase('fr') || '?';
  return (
    <span className={`avatar profile-avatar ${large ? 'large' : ''}`}>
      {photoId ? (
        <MediaPhoto key={photoId} id={photoId} alt={`Photo de ${name}`} fallback={initial} />
      ) : (
        initial
      )}
    </span>
  );
}

export function EquipmentImage({ item }: { item: Equipment }) {
  const illustration = <EquipmentArt item={item} />;
  return (
    <span className="equipment-image" aria-hidden="true">
      {item.photoId ? (
        <MediaPhoto id={item.photoId} alt={item.label} fallback={illustration} />
      ) : (
        illustration
      )}
    </span>
  );
}

export function MediaPhoto({
  id,
  alt,
  fallback,
}: {
  id: string;
  alt: string;
  fallback?: ReactNode;
}) {
  const { store } = useApp();
  const [url, setUrl] = useState('');
  useEffect(() => {
    let objectUrl = '',
      canceled = false;
    void store
      ?.media(id)
      .then((blob) => {
        if (canceled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {});
    return () => {
      canceled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [store, id]);
  return url ? (
    // Private photos use account-scoped offline Blob URLs, already resized on upload.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} className="equipment-photo" loading="lazy" />
  ) : (
    <span
      className="equipment-photo photo-placeholder"
      role="img"
      aria-label={`${alt} · photo indisponible`}
    >
      {fallback ?? <Shirt size={22} />}
    </span>
  );
}
