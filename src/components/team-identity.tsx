'use client';
import { MediaPhoto } from '@/features/media';
export function TeamIdentity({ name, logoId }: { name: string; logoId?: string }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toLocaleUpperCase('fr');
  return (
    <span className="team-identity">
      <span className="team-logo" aria-hidden="true" title={`Logo de ${name}`}>
        {logoId ? (
          <MediaPhoto key={logoId} id={logoId} alt="" fallback={initials} />
        ) : (
          <span>{initials || '?'}</span>
        )}
      </span>
      <span className="team-name">{name}</span>
    </span>
  );
}
