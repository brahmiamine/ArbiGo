'use client';
import { JerseyArt } from '@/components/equipment-art';
import { MediaPhoto } from '../media';
import { rankMatchShirts } from '@/domain/equipment';
import type { Match } from '@/domain/types';

export function JerseyPreview({ match: m }: { match: Match }) {
  const suggested = rankMatchShirts(m)[0];
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
            <div className="jersey-choice-art">
              {suggested.item.photoId ? (
                <MediaPhoto
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
