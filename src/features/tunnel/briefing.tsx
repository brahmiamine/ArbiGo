import type { Match, Step } from '@/domain/types';

export function Briefing({ match, step }: { match: Match; step: Step }) {
  const captains = step.code === 'captains';
  const futsal = match.practice === 'FUTSAL';
  return (
    <div className="briefing">
      <p className="eyebrow">
        EXEMPLE À DIRE {captains ? 'AUX CAPITAINES' : futsal ? 'AUX OFFICIELS' : 'AUX ASSISTANTS'}
      </p>
      <blockquote>
        <strong>
          {captains
            ? 'Bonjour à tous les deux. Je suis l’arbitre de la rencontre. Je compte sur vous pour relayer les consignes et encourager le respect entre joueurs et envers les officiels. Lors de l’appel, restez disponibles avec vos équipes et suivez mes indications. Si vous avez une question pendant le match, venez me parler calmement, à un moment approprié. Avez-vous des questions avant de commencer ? Bon match à tous.'
            : futsal
              ? 'Avant de commencer, répartissons clairement nos fonctions et convenons de nos signaux avec la table. Restons attentifs aux sorties du ballon, aux remplacements et aux échanges entre officiels. Pour toute information importante ou tout incident, prévenons-nous rapidement et clairement. Vérifions ensemble les procédures de la compétition. Avez-vous des questions ? Bon match.'
              : 'Bonjour, merci pour votre aide. Convenons de nos signaux pour les sorties du ballon et de notre façon de communiquer. Pour le hors-jeu, chacun applique les consignes correspondant à sa fonction. Restez attentifs aux remplacements et signalez-moi clairement tout incident. En cas de doute, échangeons calmement avant de reprendre. Avez-vous des questions sur votre rôle ? Bon match à tous.'}
        </strong>
      </blockquote>
    </div>
  );
}
