import type { Control, Practice, Step, Template } from './types';
const c = (code: string, label: string, critical = false, allowNA = false): Control => ({
  code,
  label,
  critical,
  allowNA,
});
const s = (
  code: string,
  title: string,
  offset: number,
  description: string,
  controls: Control[] = [],
  kind: Step['kind'] = 'checks',
): Step => ({ code, title, offset, description, controls, kind });
const common: Step[] = [
  s(
    'arrival',
    'Arrivée au stade',
    -75,
    'Prenez vos repères et présentez-vous aux responsables de la rencontre.',
    [],
    'arrival',
  ),
  s(
    'pitch',
    'Tour du terrain',
    -55,
    'Repérez les dangers et demandez leur correction. Le contrôle reste sous votre responsabilité.',
    [
      c('corners', 'Drapeaux de corner en place', false, true),
      c('nets', 'Filets correctement fixés'),
      c('goals', 'Buts fixés et sécurisés', true),
      c('lines', 'Lignes visibles'),
      c('surface', 'Surface sans danger apparent', true),
    ],
  ),
  s(
    'sheet-progress',
    'Avancée de la feuille',
    -50,
    'Vérifiez le support prévu pour la rencontre. ArbiGo ne se connecte pas à la FMI.',
    [
      c('support', 'FMI disponible ou autre feuille applicable'),
      c('availability', 'Responsable et support disponibles'),
    ],
  ),
  s(
    'kit',
    'Maillots et ballon',
    -45,
    'Repérez les couleurs et votre tenue si besoin, puis vérifiez le ballon.',
    [c('ball', 'Ballon en bon état et adapté à la rencontre')],
    'kit',
  ),
  s(
    'sheet',
    'Prise en charge de la feuille',
    -40,
    'Appliquez les procédures de votre compétition ; aucune licence ni qualification n’est validée par ArbiGo.',
    [
      c('presented', 'Feuille présentée'),
      c('information', 'Informations de rencontre vérifiées'),
      c('reserves', 'Réserves éventuelles traitées selon les textes', false, true),
    ],
  ),
  s(
    'captains',
    'Consignes aux capitaines',
    -35,
    'Présentez-vous, répondez aux questions et convenez d’un dialogue calme.',
    [
      c('presentation', 'Présentation et questions', false, true),
      c('call', 'Procédure d’appel expliquée', false, true),
      c('dialogue', 'Dialogue et respect rappelés', false, true),
    ],
  ),
  s(
    'warmup',
    'Échauffement',
    -30,
    'Treize minutes guidées. Adaptez les mouvements à votre condition et aux consignes reçues.',
    [],
    'warmup',
  ),
  s(
    'assistants',
    'Consignes aux assistants',
    -15,
    'Adaptez les consignes à leur présence et à leur fonction réelle.',
    [
      c('signals', 'Sorties du ballon et coordination', false, true),
      c('offside', 'Hors-jeu selon leur fonction', false, true),
      c('subs', 'Remplacements et échanges', false, true),
    ],
  ),
  s(
    'players',
    'Appel des joueurs',
    -10,
    'Effectuez les contrôles applicables à votre compétition.',
    [
      c('identity', 'Appel et contrôles d’identité applicables'),
      c('equipment', 'Équipement et objets dangereux vérifiés', true),
      c('keepers', 'Gardiens et couleurs identifiés'),
    ],
  ),
  s(
    'protocol',
    'Protocole d’avant-match',
    -5,
    'Terminez le protocole applicable, sans décision automatique.',
    [
      c('toss', 'Tirage au sort effectué'),
      c('positions', 'Participants et officiels prêts'),
      c('protocol', 'Protocole applicable effectué', false, true),
    ],
  ),
  s(
    'final',
    'Bilan avant le coup d’envoi',
    0,
    'Prenez connaissance des contrôles manquants et des anomalies. Vous seul confirmez le coup d’envoi.',
    [],
    'final',
  ),
];
export function withLockerSteps(steps: Step[]): Step[] {
  const arrival = steps.find((step) => step.kind === 'arrival');
  if (!arrival) return steps;
  return steps.flatMap((step) =>
    step === arrival
      ? [
          step,
          ...(!steps.some((item) => item.code === 'referee-locker')
            ? [s('referee-locker', 'Mon vestiaire', arrival.offset + 2, '', [], 'locker')]
            : []),
          ...(!steps.some((item) => item.code === 'team-lockers')
            ? [s('team-lockers', 'Vestiaires des équipes', arrival.offset + 4, '', [], 'locker')]
            : []),
        ]
      : [step],
  );
}
export function withSportcashStep(steps: Step[]): Step[] {
  if (steps.some((step) => step.code === 'sportcash')) return steps;
  return steps.flatMap((step) =>
    step.code === 'team-lockers'
      ? [step, s('sportcash', 'Check-in SPORTCASH', step.offset + 1, '', [], 'checkin')]
      : [step],
  );
}
const make = (practice: Practice, steps: Step[], status: Template['status']): Template => ({
  code: `D75-${practice}-2026-v3`,
  practice,
  season: '2026/27',
  version: 3,
  organizer: 'Profil de préparation — organisateur à confirmer',
  status,
  sources: [
    'FFF/CFA — Compte à rebours avant-match',
    'FFF/CFA — Composition du sac',
    'FFF/CFA — Échauffement',
    'CDA Paris 2026/27, p.12 (H−75, football à 11)',
  ],
  steps: withSportcashStep(withLockerSteps(steps)),
});
export const templates: Record<Practice, Template> = {
  FOOT_11: make('FOOT_11', common, 'DRAFT'),
  FOOT_8: make(
    'FOOT_8',
    common.map((st) => ({
      ...st,
      title: st.code === 'captains' ? 'Capitaines et éducateurs' : st.title,
      controls:
        st.code === 'pitch'
          ? st.controls
              .filter((cc) => cc.code !== 'corners')
              .map((cc) => (cc.code === 'nets' ? { ...cc, allowNA: true } : cc))
          : st.controls,
      description:
        st.code === 'players'
          ? 'Contrôlez l’équipement et le support applicable à cette catégorie de football à 8.'
          : st.description,
      offset: st.code === 'arrival' ? -60 : st.offset,
    })),
    'DRAFT',
  ),
  FUTSAL: make(
    'FUTSAL',
    common.map((st) => ({
      ...st,
      title:
        st.code === 'pitch'
          ? 'Contrôle de la salle'
          : st.code === 'assistants'
            ? 'Coordination des officiels et de la table'
            : st.title,
      offset: st.code === 'arrival' ? -60 : st.offset,
      controls:
        st.code === 'pitch'
          ? [
              c('goals', 'Buts de salle fixés et sécurisés', true),
              c('surface', 'Sol praticable et dégagements sûrs', true),
              c('lines', 'Marquages adaptés visibles'),
              c('table', 'Table et chronométrage disponibles', false, true),
            ]
          : st.code === 'assistants'
            ? [
                c('officials', 'Répartition des fonctions entre officiels', false, true),
                c('table-signals', 'Communication avec la table applicable', false, true),
              ]
            : st.code === 'players'
              ? [
                  c('equipment', 'Équipement adapté à la salle et sans danger', true),
                  c('identity', 'Contrôles applicables au support de la rencontre'),
                ]
              : st.controls,
    })),
    'DRAFT',
  ),
};
templates.FOOT_8.sources.push(
  'https://district75foot.fff.fr/wp-content/uploads/sites/126/bsk-pdf-manager/ffaccd2e31bd4e43075ab2566f97cced.pdf (art.8–10, catégorie à confirmer)',
  'https://district75foot.fff.fr/wp-content/uploads/sites/126/bsk-pdf-manager/cc063760663c8bfe801596edb5b66d61.pdf (féminines à 8, profil distinct à valider)',
);
templates.FUTSAL.sources.push(
  'https://district75foot.fff.fr/wp-content/uploads/sites/126/bsk-pdf-manager/13fe22c9dfcb0675bc7efacaef3fd186.pdf (2026/27, art.6–14)',
);
export const practiceLabels: Record<Practice, string> = {
  FOOT_11: 'Football à 11',
  FOOT_8: 'Football à 8',
  FUTSAL: 'Futsal',
};
export const warmupPhases = [
  {
    title: 'Réveil musculaire',
    duration: 180,
    description: 'Course légère, mobilisation progressive des articulations.',
    icon: 'activity',
  },
  {
    title: 'Éducatifs de course',
    duration: 240,
    description: 'Montées de genoux, talons-fesses, pas latéraux. Progressivement.',
    icon: 'route',
  },
  {
    title: 'Étirements activo-dynamiques',
    duration: 180,
    description: 'Mouvements contrôlés, alternés, sans forcer.',
    icon: 'stretch',
  },
  {
    title: 'Reprise et sprints',
    duration: 180,
    description: 'Accélérations progressives et changements de direction.',
    icon: 'zap',
  },
];
