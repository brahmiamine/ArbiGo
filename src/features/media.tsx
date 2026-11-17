'use client';
import { useEffect, useState } from 'react';
import { Shirt } from 'lucide-react';
import { useApp } from './app-provider';
export function MediaPhoto({ id, alt }: { id: string; alt: string }) {
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
    <img src={url} alt={alt} className="equipment-photo" loading="lazy" />
  ) : (
    <span
      className="equipment-photo photo-placeholder"
      role="img"
      aria-label={`${alt} · photo indisponible`}
    >
      <Shirt size={22} />
    </span>
  );
}
