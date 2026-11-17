export const errorMessages: Record<string, string> = {
  SHIRT_UNAVAILABLE: 'Ce maillot n’est pas dans le sac de cette rencontre.',
  MATCH_MISMATCH: 'Cette action ne correspond pas à la rencontre.',
  VERSION_CONFLICT:
    'Une autre version existe. Vos actions locales sont conservées pour résolution.',
  CLOSED: 'Cette préparation est clôturée.',
  DEVICE_REVOKED:
    'Le tunnel appartient à un autre appareil. Utilisez la récupération depuis le menu.',
  NOT_STARTED: 'Démarrez d’abord le tunnel.',
  ALREADY_STARTED: 'Cette préparation est déjà démarrée.',
  STEP_UNKNOWN: 'Cette étape n’est pas disponible.',
  CONTROL_UNKNOWN: 'Ce contrôle n’est pas disponible.',
  NA_FORBIDDEN: 'Ce contrôle ne peut pas être marqué sans objet.',
  REASON_REQUIRED: 'Précisez le motif du problème.',
  RECHECK_REQUIRED: 'Revérifiez et résolvez d’abord l’anomalie signalée.',
  CHECKS_REQUIRED: 'Renseignez tous les contrôles avant de valider cette étape.',
  WARMUP_REQUIRED: 'Terminez manuellement les quatre phases d’échauffement.',
  OUTFIT_NOT_PACKED: 'Cette tenue complète n’est pas dans le sac de cette rencontre.',
  PHASE_ORDER: 'Terminez la phase précédente avant de commencer.',
  PHASE_STATE: 'Cette action n’est pas disponible pour cette phase.',
  REVIEW_REQUIRED: 'Prenez connaissance du bilan et confirmez votre décision.',
  COMMENT_REQUIRED: 'Précisez le motif de clôture.',
  DEBRIEF_UNAVAILABLE: 'Le débrief est disponible après la fin d’un match joué.',
  NOTE_AFTER_CLOSURE: 'Les notes complémentaires sont disponibles après la clôture.',
  ACTIVE_TUNNEL: 'Une autre rencontre est déjà active. Terminez sa préparation.',
  TEMPLATE_UNAPPROVED:
    'Le modèle de cette pratique doit être validé avant son utilisation sur ce serveur.',
  ITEM_UNKNOWN: 'Cet article n’est pas dans le sac.',
  ISSUE_UNKNOWN: 'Cette anomalie n’est pas disponible.',
  NOT_POSTPONED: 'Un nouveau brouillon lié est proposé uniquement pour un report.',
};
export function errorMessage(error: unknown) {
  if (error instanceof Error) return errorMessages[error.message] ?? error.message;
  return 'Enregistrement impossible. Vérifiez l’espace disponible sur votre appareil.';
}
