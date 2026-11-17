'use client';
import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { palette } from '@/domain/equipment';
import { JerseyArt } from '@/components/equipment-art';
import { MediaPhoto } from '../media';
import { rankMatchShirts } from '@/domain/equipment';
import type { Match } from '@/domain/types';

export function JerseyPreview({
  match: m,
  busy,
  onSelect,
}: {
  match: Match;
  busy: boolean;
  onSelect: (itemId: string) => Promise<boolean>;
}) {
  const shirts = rankMatchShirts(m);
  const index = Math.max(
    0,
    shirts.findIndex((shirt) => shirt.id === m.selectedShirtId),
  );
  const suggested = shirts[index];
  const touch = useRef<{ x: number; y: number } | null>(null);
  const choosing = useRef(false);
  async function select(next: number) {
    if (busy || choosing.current || !shirts[next] || next === index) return;
    choosing.current = true;
    try {
      await onSelect(shirts[next].id);
    } finally {
      choosing.current = false;
    }
  }
  return (
    <section className="jersey-preview" aria-label="Choix du maillot">
      <div className="jersey-opponents">
        {(
          [
            { name: m.homeTeam, players: 'home', keeper: 'homeKeeper' },
            { name: m.awayTeam, players: 'away', keeper: 'awayKeeper' },
          ] as const
        ).map((team) => (
          <section key={team.players}>
            <h2>{team.name}</h2>
            <div className="jersey-opponent-roles">
              {(
                [
                  [team.players, 'Joueurs'],
                  [team.keeper, 'Gardien'],
                ] as const
              ).map(([key, role]) => (
                <div key={key}>
                  <JerseyArt
                    color={m.colors[key][0]}
                    label={`${team.name} · ${role} · ${m.colors[key].join(' / ') || 'non renseigné'}`}
                  />
                  <strong>{role}</strong>
                  <span>{m.colors[key].join(' / ') || 'Non renseigné'}</span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="jersey-choice">
        <p className="eyebrow">VOTRE MAILLOT POUR LA RENCONTRE</p>
        <h1 tabIndex={-1}>{suggested ? suggested.item.label : 'Aucun maillot dans ce sac'}</h1>
        {suggested ? (
          <>
            <div
              className="jersey-slider"
              role="group"
              aria-label="Choisir le maillot"
              tabIndex={0}
              onKeyDown={(event) => {
                if ((event.target as HTMLElement).closest('button')) return;
                if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                  event.preventDefault();
                  void select(index + (event.key === 'ArrowLeft' ? -1 : 1));
                }
              }}
              onTouchStart={(event) => {
                if ((event.target as HTMLElement).closest('button') || event.touches.length !== 1)
                  return;
                touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
              }}
              onTouchCancel={() => {
                touch.current = null;
              }}
              onTouchEnd={(event) => {
                if (!touch.current) return;
                const dx = event.changedTouches[0].clientX - touch.current.x;
                const dy = event.changedTouches[0].clientY - touch.current.y;
                touch.current = null;
                if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4)
                  void select(index + (dx < 0 ? 1 : -1));
              }}
            >
              <button
                type="button"
                className="icon-button"
                aria-label="Maillot précédent"
                disabled={busy || index === 0}
                onClick={() => void select(index - 1)}
              >
                <ChevronLeft />
              </button>
              <div className="jersey-choice-art">
                {suggested.item.photoId ? (
                  <MediaPhoto
                    key={suggested.item.photoId}
                    id={suggested.item.photoId}
                    alt={suggested.item.label}
                    fallback={
                      <JerseyArt color={suggested.item.colors[0]} label={suggested.item.label} />
                    }
                  />
                ) : (
                  <JerseyArt color={suggested.item.colors[0]} label={suggested.item.label} />
                )}
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Maillot suivant"
                disabled={busy || index === shirts.length - 1}
                onClick={() => void select(index + 1)}
              >
                <ChevronRight />
              </button>
            </div>
            <div className="jersey-pagination" role="group" aria-label="Maillots du sac">
              {shirts.map((shirt, i) => (
                <button
                  key={shirt.id}
                  type="button"
                  className={index === i ? 'selected' : ''}
                  aria-label={`Choisir ${shirt.item.label}`}
                  aria-pressed={index === i}
                  disabled={busy}
                  onClick={() => void select(i)}
                >
                  <span style={{ background: palette[shirt.item.colors[0]] ?? '#d7dfeb' }} />
                </button>
              ))}
            </div>
            <p className="jersey-position" aria-live="polite">
              Maillot {index + 1} sur {shirts.length}
            </p>
            <strong className={`jersey-verdict verdict-${suggested.rating.toLowerCase()}`}>
              {suggested.rating === 'RECOMMENDED'
                ? 'Maillot conseillé'
                : suggested.rating === 'AVOID'
                  ? 'Conflit de couleur · prévoyez un autre maillot'
                  : 'Suggestion à vérifier sur place'}
            </strong>
            <p>{suggested.reason}</p>
            <p className="jersey-packed">
              {suggested.item.packed
                ? 'Coché dans votre sac'
                : 'À emporter · ce maillot n’est pas coché dans votre sac'}
            </p>
          </>
        ) : (
          <p>Ajoutez un maillot à votre inventaire pour vos prochaines rencontres.</p>
        )}
      </div>
    </section>
  );
}
