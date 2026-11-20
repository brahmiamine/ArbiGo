import type { StepPreferences } from './step-settings';
import type { WeatherLocation } from './weather';
export const defaultBriefings = {
  captains:
    'Bonjour à tous les deux. Je suis l’arbitre de la rencontre. Je compte sur vous pour relayer les consignes et encourager le respect entre joueurs et envers les officiels. Lors de l’appel, restez disponibles avec vos équipes et suivez mes indications. Si vous avez une question pendant le match, venez me parler calmement, à un moment approprié. Avez-vous des questions avant de commencer ? Bon match à tous.',
  assistants:
    'Bonjour, merci pour votre aide. Convenons de nos signaux pour les sorties du ballon et de notre façon de communiquer. Pour le hors-jeu, chacun applique les consignes correspondant à sa fonction. Restez attentifs aux remplacements et signalez-moi clairement tout incident. En cas de doute, échangeons calmement avant de reprendre. Avez-vous des questions sur votre rôle ? Bon match à tous.',
  futsalOfficials:
    'Avant de commencer, répartissons clairement nos fonctions et convenons de nos signaux avec la table. Restons attentifs aux sorties du ballon, aux remplacements et aux échanges entre officiels. Pour toute information importante ou tout incident, prévenons-nous rapidement et clairement. Vérifions ensemble les procédures de la compétition. Avez-vous des questions ? Bon match.',
};
export type BriefingTexts = typeof defaultBriefings;
export interface ProfilePreferences {
  soundEnabled: boolean;
  pushEnabled: boolean;
  timezone: string;
  locale: 'fr';
  avatarPhotoId?: string | null;
  weatherLocation?: WeatherLocation | null;
  briefings?: Partial<BriefingTexts>;
  steps?: StepPreferences;
}
export interface ProfilePatch {
  name?: string;
  preferences?: Partial<ProfilePreferences>;
}
export function mergePreferences(
  previous: ProfilePreferences,
  changes?: Partial<ProfilePreferences>,
): ProfilePreferences {
  return {
    ...previous,
    ...changes,
    ...(changes?.briefings ? { briefings: { ...previous.briefings, ...changes.briefings } } : {}),
  };
}
