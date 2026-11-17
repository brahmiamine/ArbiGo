# ArbiGo — Cahier des charges fonctionnel et technique V1

**Version :** 1.0 — 16 novembre 2026  
**Statut :** spécification de conception, avant développement  
**Cible :** PWA mobile-first pour arbitres de football, hébergée sur VPS  
**Langue :** français  
**Décisions métier :** validées par le porteur de projet (28 choix et échanges précédents)  
**Conventions :** « obligatoire dans l’application » signifie une exigence produit et non automatiquement une obligation réglementaire.

## 1. Vision, objectifs et périmètre

ArbiGo est un **carnet de préparation d’avant-match interactif**. Chaque arbitre possède un compte unique et plusieurs matchs. La veille ou avant le déplacement, il prépare son sac. Au stade, il entre dans un **tunnel plein écran** consacré à une seule rencontre : compteur jusqu’au coup d’envoi, compteur jusqu’à la prochaine étape, fiche centrale interactive, état de l’étape précédente au-dessus et aperçu de la suivante au-dessous. Il valide manuellement chaque vérification. Le journal est sauvegardé localement, puis synchronisé vers MariaDB.

**Objectifs V1 :** éliminer la saisie répétitive, sécuriser le suivi des contrôles, signaler l’avance/retard sans décider à la place de l’arbitre, recommander une tenue depuis le sac, assurer la continuité hors ligne, conserver une traçabilité exploitable et offrir une interface rapide, élégante et animée.

**Inclus en V1 :** inscription et vérification de l’e-mail ; un rôle applicatif `ARBITRE` ; matchs multiples ; disciplines football à 11, football à 8, futsal (modèles distincts) ; inventaire et tenues ; sac par match ; tunnel ; contrôles et anomalies ; échauffement ; Web Push/VAPID ; sons et vibrations si compatibles ; historique détaillé ; report avec nouvelle rencontre ; récupération d’appareil ; synchronisation ; tests et déploiement.

**Hors V1 :** export PDF du journal, reconnaissance automatique des couleurs par IA, plusieurs rôles applicatifs, réseau social, gestion du match après le coup d’envoi, intégration automatique FMI/FFF, gestion officielle des décisions administratives, paiement, thème sombre et traduction multilingue. L’exercice du droit d’accès aux données personnelles reste distinct d’un export PDF de match.

## 2. Décisions définitives et arbitrages produit

| Domaine | Décision V1 |
|---|---|
| Nom | **ArbiGo** |
| Public | Tous les arbitres ; un compte par adresse e-mail vérifiée ; rôle unique `ARBITRE` |
| Pratiques | Football à 11, football à 8 et futsal, avec parcours et fiches adaptés |
| Référence de départ | Modèles **District 75**, versionnés par saison, pratique, catégorie et organisateur |
| Langue et thème | Français ; **thème clair uniquement** |
| Identité | Graphisme original inspiré de la palette retenue ; aucun écusson officiel non autorisé |
| Match | Deux équipes en **saisie libre**, date, heure ; stade facultatif ; compétition/catégorie facultatives via sélection |
| Sac | Inventaire FFF prérempli, entièrement personnalisable ; tenues photographiées élément par élément et regroupées |
| Sac par match | Copie de la checklist **non cochée** ; rappel proposé la veille ; sac incomplet n’empêche pas le tunnel |
| Tenues | Pastilles de couleur manuelles, suggestions des anciennes couleurs à reconfirmer ; conseil sur tenue disponible dans le sac ; alerte si conflit |
| Tunnel | Plein écran, une rencontre active, aucune navigation vers les autres onglets ; balayage vertical + boutons |
| Horaires | Planning **fixe par modèle versionné** ; pas de modification libre par utilisateur |
| Contrôles | `Conforme/Fait`, `Problème`, `Sans objet` lorsque pertinent ; commentaire facultatif et photo facultative |
| Navigation | Aucun changement de fiche ne valide automatiquement ; historique des étapes et anomalies conservé |
| Échauffement | Quatre phases guidées, démarrage, pause, reprise et fin manuels |
| Compteurs | Jusqu’au coup d’envoi ; jusqu’à l’horaire planifié de l’étape suivante ; avance/retard |
| Alertes | H−5 minutes et à l’horaire de chaque étape ; proposition d’activation Push au premier match |
| Retour sensoriel | Animations riches mais performantes, sons discrets actifs par défaut et muet permanent ; vibrations si compatibles |
| Fin normale | Validation manuelle « Coup d’envoi effectué » après bilan final |
| Fin exceptionnelle | « Rencontre non débutée » : annulée, reportée ou autre ; conserver intégralement le journal |
| Report | Ancien match conservé ; **nouveau brouillon lié** avec mêmes équipes/stade, mais aucune validation recopiée |
| Historique | Journal détaillé immuable après clôture ; notes ajoutées séparément ; consultation dans l’app, pas d’export PDF V1 |
| Multi-appareils | Plusieurs appareils liés au compte, **un seul propriétaire du tunnel** ; transfert sécurisé en ligne |
| Technique | Une seule application Next.js + API Route Handlers + NextAuth/Auth.js Credentials + MariaDB |
| Hors ligne | PWA installable, service worker, IndexedDB et synchronisation différée ; consultation des derniers matchs |
| Médias | Fichiers dans un stockage dédié ; métadonnées et références en base MariaDB |
| Hébergement | VPS, Docker Compose, HTTPS, sauvegardes et tests automatiques |

## 3. Provenance réglementaire et limites

**Sources effectivement consultées :**

1. *CDA District de Paris — Réunion de début de saison 2026-2027*, **p. 12** : ponctualité « 1H15 MINIMUM avant la rencontre », ainsi que consignes de tenue et d’échauffement. Cette source fonde **H−75** pour les arbitres relevant de ces consignes, et non universellement pour tout match joué à Paris.
2. *FFF / CFA / Direction de l’arbitrage — Formation initiale, Compte à rebours d’avant-match*, **p. 1** : modèle pédagogique à H−60 (arrivée), H−55 (terrain), H−50 (avancée FMI), H−45 (maillots et ballon), H−40 (prise en charge FMI), H−35 (capitaines), H−30 (échauffement), H−15 (assistants), H−10 (appel), H−5 (protocole). Ces horaires de préparation ne sont pas tous des délais réglementaires obligatoires.
3. *FFF / CFA — Formation initiale, Composition du sac d’arbitrage*, **p. 1** : deux maillots distincts, short/chaussettes, chaussures, écusson, montre, sifflet, cartons, stylos, pièce, tenue d’échauffement et affaires de douche ; drapeaux/gants selon les circonstances. La liste constitue le préremplissage personnalisable du sac.
4. *FFF / CFA — Formation initiale, Échauffement*, **pp. 1–2** : quatre phases de **3 + 4 + 3 + 3 minutes**, soit 13 minutes d’exercices, dans une séance annoncée de 12 à 15 minutes.
5. *FFF / CFA — Formation initiale, Ma relation aux autres*, **p. 1** : relation aux dirigeants, consignes aux capitaines et aux assistants bénévoles. Le contenu doit être reformulé selon la situation et le statut des participants.
6. *IFAB, Lois du Jeu 2026/27*, **Loi 4, § 3, p. 74 du PDF fourni** : distinction des couleurs entre équipes, gardiens et arbitres. Ne pas transformer les recommandations de l’app en décision officielle.

**Point bloquant de contenu réglementaire avant lancement des modèles à 8 et futsal :** les fiches pédagogiques fournies sont principalement bâties pour le football à 11. La V1 doit bien livrer les trois parcours demandés, mais le contenu détaillé du foot à 8 et du futsal ne sera validé qu’après vérification des textes de l’organisateur, de la catégorie et de la saison (et des Lois du Jeu Futsal FIFA/FFF applicables). Un modèle non vérifié ne doit jamais être présenté comme « officiel » ; les contrôles inapplicables n’apparaissent pas ou sont marqués « Sans objet ». Le déploiement des trois parcours fait partie des critères d’acceptation V1.

## 4. Profils de parcours et planification

Chaque match sélectionne obligatoirement une **pratique** : `FOOT_11`, `FOOT_8` ou `FUTSAL`. La catégorie et la compétition sont des précisions facultatives, mais l’application doit signaler si une précision est nécessaire à l’applicabilité d’un contrôle. Tous les utilisateurs conservent le rôle `ARBITRE` ; il n’y a pas de choix central/assistant à l’inscription.

Le moteur utilise des **templates versionnés en base** : `code`, pratique, saison, organisateur, catégorie éventuelle, version, statut de validation et référence documentaire. Un changement de modèle en base ne modifie pas les préparations anciennes. Chaque match reçoit un **instantané du modèle** à sa création ou au démarrage du tunnel.

### Planning de base football à 11 — District 75 (saison 2026/27)

Pour un coup d’envoi à **15 h 00** :

| Heure prévue | Repère | Fiche | Type d’interaction |
|---|---|---|---|
| 13 h 45 | H−75 | Arrivée au stade | Bouton de confirmation |
| 14 h 05 | H−55 | Tour du terrain | Contrôles de sécurité |
| 14 h 10 | H−50 | Avancée FMI | Checklist |
| 14 h 15 | H−45 | Maillots et ballon | Couleurs, recommandation, contrôles |
| 14 h 20 | H−40 | Prise en charge FMI | Checklist contextualisée |
| 14 h 25 | H−35 | Consignes aux capitaines | Cartes de consignes |
| 14 h 30 | H−30 | Échauffement | Quatre phases guidées |
| 14 h 45 | H−15 | Consignes aux assistants | Contrôles contextualisés |
| 14 h 50 | H−10 | Appel des joueurs | Contrôles |
| 14 h 55 | H−5 | Protocole d’avant-match | Checklist et tirage au sort |
| 15 h 00 | H | Bilan final puis coup d’envoi | Récapitulatif et confirmation |

**Distinction cruciale :** l’arrivée H−75 est issue des consignes de la CDA Paris ; les autres jalons sont ceux de la fiche FFF à partir de H−55, qui constituait initialement un planning commençant par H−60. La V1 ajoute donc une marge de 20 minutes entre l’arrivée et le tour du terrain. Ces horaires intermédiaires sont des **repères de fonctionnement du produit**, pas des sanctions automatiques. Si le match est à une autre heure, on conserve les mêmes offsets. Les modèles spécifiques foot à 8 et futsal auront leur propre liste d’étapes, leur matériel et leur séquencement vérifiés, et non une transposition aveugle.

## 5. Écrans et navigation

### Navigation normale

Quatre onglets seulement : **Accueil**, **Mes matchs**, **Mon sac**, **Profil**. L’accueil présente le prochain match et son degré de préparation. L’onglet matchs distingue « À venir » et « Historique ». Le sac conserve l’inventaire permanent ; sa préparation pour une rencontre est distincte. Le profil porte préférences, compte, notifications, appareils et aide.

### Inscription et première utilisation

E-mail unique + mot de passe → e-mail de vérification à lien temporaire → activation → connexion. Création de l’inventaire initial à partir de la liste FFF ; ajout facultatif de photos/couleurs des tenues ; création du premier match ; proposition volontaire d’activer Push (installation préalable expliquée pour iPhone) ; préparation du sac ; accès au tunnel.

### Fiche « Nouveau match »

Obligatoires : date, heure locale du coup d’envoi, nom de l’équipe domicile, nom de l’équipe visiteuse, pratique. Facultatifs : stade, compétition, catégorie. Les noms sont en **saisie libre** ; l’interface minimise la frappe avec date-picker, choix d’heure et sélecteur de pratique. Les suggestions d’anciens noms sont une aide locale, jamais une intégration à un référentiel FFF. Validation des dates, noms vides et doublons plausibles, sans bloquer les rencontres réellement identiques.

### Tunnel plein écran

Barre supérieure **fixe** : nom des équipes, deux compteurs, progression et bouton muet. En haut de la zone de travail, **étape précédente avec statut** ; au centre, **fiche active dominante** ; en bas, **étape suivante, heure et statut**. Animation de transition verticale, balayage et boutons Précédent/Suivant. Les gestes de défilement à l’intérieur d’un contrôle ne doivent pas déplacer par erreur le tunnel. Aucun autre onglet ni accès à un autre match pendant ce mode. Un menu discret donne accès uniquement à l’aide, au signalement d’une rencontre non débutée et aux situations de récupération.

**États visibles :** « À venir », « En cours », « Validée », « Validée avec anomalie à suivre », « Sans objet », « Non validée », « En retard ». Couleurs doublées de textes/icônes ; le rouge ne doit pas être le seul signal.

## 6. Spécifications détaillées des fiches

### 6.1 Arrivée au stade

Affiche les équipes, le lieu facultatif, la date et l’heure prévue. Action unique « Je suis arrivé » : enregistre l’heure réelle et débute le tunnel. Un démarrage tardif n’efface pas les étapes passées et ne réécrit pas leur horaire prévu.

### 6.2 Tour du terrain

Contrôles tactiles, avec affichage individuel `Conforme / Problème / Sans objet` **seulement quand Sans objet est admissible** : drapeaux de corner présents et en état, filets des buts correctement fixés et sans trous, buts fixés et sécurisés, lignes visibles, surface sans danger apparent. Les libellés spécifiques (terrain réduit, salle, buts, lignes, filets, drapeaux pertinents) dépendent du modèle. Si « Problème » : motif prédéfini (absent, détérioré, mal fixé, dangereux, autre), photo facultative, commentaire facultatif, statut « correction demandée », « en attente », puis « revérifiée/résolue ». Possibilité de poursuivre les étapes sans effacer l’alerte ; les dangers non résolus restent signalés jusqu’au bilan.

### 6.3 Avancée FMI

Vérifier le support de feuille prévu pour la rencontre et sa disponibilité ; choisir `FMI disponible`, `Autre feuille applicable`, `Problème` ou `Sans objet` selon le profil. L’application n’accède pas à la FMI fédérale et ne valide ni identité ni qualification à sa place.

### 6.4 Maillots et ballon

Quatre sélecteurs de couleurs par pastilles : équipe A joueurs, gardien A, équipe B joueurs, gardien B ; couleurs secondaires facultatives. L’application affiche automatiquement les **photos des tenues complètes présentes dans le sac de ce match**, classe les candidats « recommandé », « à vérifier », « à éviter » et présente la raison (conflit ou proximité). La sélection et la confirmation finales appartiennent à l’arbitre. Elle rappelle les couleurs déjà saisies pour ces équipes, mais **demande une confirmation à chaque rencontre**. Elle ne propose jamais comme adéquat un maillot indisponible ou manifestement conflictuel. Contrôles du ballon : état, adaptation à la pratique, conformité apparente ; renvoi aux règles de la compétition, sans inventer de taille réglementaire.

**Algorithme V1 déterministe :** comparaison entre couleurs principales/secondaires des quatre maillots déclarés et des tenues disponibles ; normalisation des noms de couleurs et familles de teintes ; exclusion des conflits évidents ; classement des autres avec motifs affichables. Pas de reconnaissance IA des photos ; la photo sert à visualiser la tenue, les pastilles renseignées servent au calcul. Une faible confiance doit produire « À vérifier », jamais « conforme garanti ». Traiter explicitement l’exception IFAB des deux gardiens identiquement vêtus lorsque les conditions réglementaires sont réunies, sans en faire une règle automatique du classement.

### 6.5 Prise en charge FMI

Checklist de contrôle et de procédure compatible avec la pratique et le support applicable : disponibilité des informations de rencontre, feuille présentée, contrôles nécessaires, réserves éventuelles à traiter suivant les textes. Aucun verdict automatique sur une licence, une qualification, un forfait ou une sanction.

### 6.6 Capitaines / éducateurs

Petites cartes courtes consultables puis validables, fondées sur la fiche « Ma relation aux autres » : présentation, questions éventuelles, procédure d’appel et dialogue calme. En jeunes, afficher les éventuels éducateurs concernés. Ne pas imposer à tous les arbitres des consignes relevant du central si leur situation diffère ; proposer « Sans objet » lorsque pertinent.

### 6.7 Échauffement

Quatre écrans successifs, illustrés et animés : **3 min** réveil musculaire ; **4 min** éducatifs de course ; **3 min** étirements activo-dynamiques ; **3 min** reprise et sprints. Chaque phase : illustration/exercice, compteur, Démarrer, Pause, Reprendre, Terminer ; lancement de la phase suivante **manuel**. Conserver durées effectives, pauses et validation. Ne jamais faire croire que l’application certifie un état de santé ou un protocole médical.

### 6.8 Consignes aux assistants

Cartes contextualisées selon la présence et la fonction réelle des assistants, notamment lorsqu’ils sont bénévoles ; rappel des signaux de sortie du ballon, hors-jeu, remplacements et coordination si applicable. Possibilité de marquer « Sans objet ». Le rôle informatique unique ne transforme pas un assistant en arbitre central : les missions réglementaires restent distinctes.

### 6.9 Appel et contrôles des joueurs

Vérifications administratives et d’équipement pertinentes pour l’organisateur, la catégorie et la pratique ; boutons fait/problème/sans objet selon l’élément. Le contenu de cette fiche n’affirme jamais que les joueurs sont qualifiés sur la seule base d’une case cochée.

### 6.10 Protocole

Checklist d’entrée et de préparation au coup d’envoi ; tirage au sort lorsque applicable, coordination arbitrale et derniers contrôles. Les consignes spécifiques relèvent du template vérifié de la compétition.

### 6.11 Bilan final et confirmation

Récapitulatif : nombre de fiches validées, non validées et sans objet ; contrôles avec anomalie ouverte/résolue ; heure prévue/réelle des validations ; tenue choisie ; sac ; éventuels retards. Chaque anomalie ouvre sa fiche d’origine. Une **préparation complète** ne peut être affichée avec une anomalie de sécurité ouverte. En revanche, le bouton « Coup d’envoi effectué » doit pouvoir **enregistrer un fait réellement survenu** sans effacer l’anomalie : avertissement fort et confirmation explicite, sans laisser entendre que l’app autorise la tenue de la rencontre. Enregistrer l’horodatage réel déclaré. Ne jamais fermer automatiquement à H=0.

### 6.12 Fin exceptionnelle

Action « Rencontre non débutée » → choix **Annulée / Reportée / Autre motif** → confirmation → journal clôturé en lecture seule. Si « Reportée », créer un **nouveau brouillon lié** avec mêmes équipes/stade éventuel, date/heure à compléter, checklist et tunnel réinitialisés ; aucune réponse ou validation ancienne recopiée. L’app enregistre le constat de l’utilisateur, sans statuer sur le sort officiel de la rencontre.

## 7. Moteur temporel, statuts et anomalies

**Deux compteurs en permanence :** `T_match = scheduledKickoffAt − now` ; `T_next = nextScheduledStepAt − now`. Afficher heures, minutes et secondes ; au dépassement, afficher `+mm:ss de retard` plutôt qu’un zéro trompeur. L’heure du téléphone et les échéances absolues déterminent le calcul : **ne jamais décrémenter une valeur enregistrée par intervalle**, ce qui dérive lorsqu’un navigateur est en arrière-plan. Recalculer à l’ouverture, au retour au premier plan, après un changement d’horloge, de fuseau ou après synchronisation. Les dates serveur sont en UTC, les rendez-vous saisis en fuseau `Europe/Paris`, avec prise en charge des changements d’heure.

Distinguer l’**étape affichée** de l’**étape active du parcours** : consulter une fiche précédente n’avance pas le pointeur actif, ne réinitialise pas les alertes et ne change pas arbitrairement le deuxième compteur. L’étape suivante est celle programmée après l’étape active ; un horaire dépassé reste en retard tant que l’événement n’est pas traité. Réponses autosauvegardées ; validation explicite de la fiche ; les étapes non validées restent visibles dans le bilan.

**Statuts de fiche :** `PENDING`, `IN_PROGRESS`, `COMPLETED`, `COMPLETED_WITH_OPEN_ISSUE`, `NOT_APPLICABLE` (si la fiche entière ne s’applique pas). **Statuts de contrôle :** `UNANSWERED`, `OK`, `ISSUE`, `NOT_APPLICABLE`. **Statuts d’anomalie :** `OPEN`, `CORRECTION_REQUESTED`, `RESOLVED` ; jamais de suppression silencieuse. En cas de correction, ajout d’un événement daté avec nouvelle vérification.

**Alertes par étape :** J−1 pour le sac ; H−5 et H=0 **relatifs à l’horaire de l’étape** ; désactiver/dédupliquer les alertes pour une étape déjà finalisée, et ne pas bombarder le téléphone si plusieurs échéances passées ont été rattrapées.

## 8. Inventaire et tenues

Le catalogue par défaut reprend les familles de la fiche FFF : maillots distincts, short, chaussettes, chaussures, écusson, montre, sifflet, cartons, stylos, carte, pièce, tenue d’échauffement, affaires de douche, et équipements facultatifs. L’utilisateur peut ajouter, modifier, supprimer et réordonner ses articles ; les éléments source FFF sont marqués « suggestion de formation », pas « tous obligatoires ».

Une **tenue complète** assemble des articles séparés (maillot, short, chaussettes, chaussures), chacun avec photo facultative, couleur principale, couleur secondaire et disponibilité. La présence dans le sac se coche pour **chaque match**, pas de manière globale. Créer à chaque match un instantané du contenu de sac sélectionné ; les photos restent référencées, et la suppression d’un article de l’inventaire ne doit pas modifier l’historique clos.

## 9. Architecture logicielle et dossiers

Une application **Next.js App Router + React + TypeScript strict**, sans NestJS ni autre API indépendante. Les **Route Handlers** (`app/api/.../route.ts`) forment l’API ; la logique métier est hors des contrôleurs HTTP. **NextAuth / Auth.js, provider Credentials**, gère la connexion e-mail/mot de passe ; la gestion des comptes, hachages, vérifications e-mail, renouvellement/réinitialisation et limitation des tentatives est développée séparément. Pour Credentials, privilégier **sessions JWT** conformément aux contraintes du provider. **Prisma ORM 7** est proposé et épinglé car compatible MariaDB ; ne pas migrer automatiquement vers Prisma 8 tant que son support MariaDB n’est pas confirmé. Tailwind CSS, composants accessibles, Motion pour les transitions, Vitest/React Testing Library, Playwright, Docker Compose.

Découpage recommandé :

- `src/app` : pages/Route Handlers et layouts, dont layout tunnel sans navigation globale ;
- `src/features/auth`, `matches`, `bag`, `outfits`, `templates`, `tunnel`, `checklists`, `warmup`, `issues`, `history`, `notifications`, `sync` : composants, hooks et cas d’usage propres à chaque domaine ;
- `src/components/ui` : composants visuels génériques ;
- `src/lib/db`, `auth`, `time`, `validation`, `storage`, `push`, `security` : adaptateurs techniques ;
- `src/server/repositories`, `services`, `policies` : règles métier et accès aux données, testables sans rendu React ;
- `public/manifest.webmanifest`, `public/sw.js`, icônes/sounds et médias statiques ;
- `prisma/schema.prisma`, migrations, seeds versionnés de templates ;
- `tests/unit`, `integration`, `e2e`, `offline`, `visual`, `accessibility`.

Les composants `Countdown`, `StepShell`, `StepCard`, `StepNavigator`, `CheckControl`, `StatusBadge`, `KitPicker`, `WarmupTimer`, `IssueEditor`, `SyncStatus`, `MuteToggle` utilisent des interfaces stables. Toute animation dispose d’une version `prefers-reduced-motion` ; tous les boutons sont utilisables au clavier et avec lecteurs d’écran.

## 10. Schéma de données MariaDB (modèle logique)

Les clés primaires sont des identifiants opaques ; `userId` détermine la propriété. Les horodatages métier sont persistés en UTC avec trace du fuseau de la rencontre. Les champs ci-dessous représentent **le minimum du modèle**, à détailler en migration Prisma.

| Table | Champs structurants et contraintes |
|---|---|
| `users` | `id`, `email UNIQUE`, `passwordHash`, `emailVerifiedAt`, `role=ARBITRE`, `createdAt`, `deletedAt?` |
| `email_verification_tokens` | `userId`, `tokenHash`, `expiresAt`, `usedAt` |
| `password_reset_tokens` | `userId`, `tokenHash`, `expiresAt`, `usedAt` |
| `user_preferences` | `userId UNIQUE`, `soundEnabled`, `pushEnabled`, `reducedMotion`, `timezone`, `locale=fr` |
| `devices` | `id`, `userId`, `label`, `lastSeenAt`, `revokedAt`, `publicDeviceId` |
| `push_subscriptions` | `id`, `deviceId`, `endpoint UNIQUE`, `p256dh`, `auth`, `status`, `expiresAt?` |
| `equipment_items` | `id`, `userId`, `type`, `label`, `sortOrder`, `active`, `photoId?`, `colorsJson` |
| `outfits` | `id`, `userId`, `name`, `active` |
| `outfit_items` | `outfitId`, `equipmentItemId`, `slot` ; unicité par emplacement |
| `media_assets` | `id`, `userId`, `storageKey`, `mimeType`, `size`, `hash`, `createdAt` |
| `template_versions` | `id`, `practice`, `season`, `organizer`, `version`, `source`, `approvedAt`, `status` |
| `template_steps` | `id`, `templateVersionId`, `code`, `sortOrder`, `offsetMinutes`, `contentJson` |
| `template_controls` | `id`, `templateStepId`, `code`, `label`, `inputType`, `allowNotApplicable`, `criticalSafety` |
| `matches` | `id`, `userId`, `practice`, `homeTeam`, `awayTeam`, `stadium?`, `competition?`, `category?`, `kickoffAt`, `timezone`, `status`, `templateVersionId`, `originalMatchId?`, `version` |
| `match_bag_items` | `matchId`, `equipmentItemId`, `packed`, `selectedOutfitId?`, `snapshotJson` |
| `match_kit_colors` | `matchId`, `teamSide`, `actorType` (joueurs/gardien), `primaryColor`, `secondaryColor?`, `confirmedAt` |
| `tunnel_sessions` | `id`, `matchId UNIQUE`, `ownerDeviceId`, `fencingVersion`, `leaseExpiresAt`, `startedAt`, `closedAt?`, `closeReason?` |
| `step_runs` | `id`, `sessionId`, `templateStepId`, `status`, `startedAt`, `completedAt`, `revision` |
| `control_answers` | `id`, `stepRunId`, `templateControlId`, `answer`, `answeredAt`, `revision` |
| `issues` | `id`, `matchId`, `controlAnswerId`, `type`, `criticalSafety`, `status`, `photoId?`, `comment?` |
| `warmup_runs` | `id`, `stepRunId`, `phaseCode`, `startedAt`, `pausedDurationMs`, `endedAt?`, `status` |
| `match_events` | `id`, `matchId`, `actorDeviceId`, `type`, `payloadJson`, `occurredAt`, `receivedAt`, `operationId UNIQUE` ; **append-only** |
| `match_notes` | `id`, `matchId`, `content`, `createdAt` ; notes après clôture distinctes des événements |
| `notification_jobs` | `id`, `matchId`, `stepCode?`, `kind`, `scheduledAt`, `sentAt?`, `canceledAt?`, `dedupeKey UNIQUE` |
| `sync_operations` | `id`, `userId`, `deviceId`, `operationId UNIQUE`, `entityVersion`, `result`, `receivedAt` |

**Index :** `matches(userId,kickoffAt,status)`, `match_events(matchId,occurredAt)`, `step_runs(sessionId)`, `issues(matchId,status)`, `notification_jobs(scheduledAt,sentAt,canceledAt)`. Les clés étrangères imposent l’isolation entre utilisateurs ; chaque accès API vérifie **aussi** la propriété, et pas seulement un `id` transmis par le navigateur.

## 11. Contrats d’API (proposés)

Tous les endpoints d’administration de données sont protégés par la session, validés avec des schémas typés (Zod proposé), journalisés et limités en débit lorsque nécessaire. Réponses cohérentes : `data`, `error.code`, `error.message`, `serverTime`, `revision` si mutation. Les opérations de validation possèdent une clé d’idempotence stable et ne créent jamais deux événements à cause d’un double clic.

| Méthode | Route | Objet |
|---|---|---|
| POST | `/api/auth/register` | Inscription et demande de vérification |
| POST | `/api/auth/verify-email` | Activation avec jeton à usage unique |
| POST | `/api/auth/forgot-password` | Demande de réinitialisation |
| POST | `/api/auth/reset-password` | Réinitialisation sécurisée |
| GET/PATCH | `/api/me` | Profil et préférences |
| GET/POST | `/api/equipment` | Inventaire |
| PATCH/DELETE | `/api/equipment/{id}` | Modifier/supprimer un article |
| GET/POST | `/api/outfits` | Tenues complètes |
| GET/POST | `/api/matches` | Lister/créer les matchs |
| GET/PATCH | `/api/matches/{id}` | Détail et modification avant tunnel |
| GET/PUT | `/api/matches/{id}/bag` | Sac propre au match |
| POST | `/api/matches/{id}/tunnel/start` | Entrée dans le tunnel et attribution d’appareil |
| GET | `/api/matches/{id}/tunnel` | État et journal de la préparation |
| POST | `/api/matches/{id}/steps/{code}/responses` | Contrôles, anomalies et « Sans objet » |
| POST | `/api/matches/{id}/steps/{code}/complete` | Validation manuelle |
| POST | `/api/matches/{id}/kickoff` | Coup d’envoi réellement confirmé |
| POST | `/api/matches/{id}/close-without-kickoff` | Annulé/reporté/autre et clôture |
| POST | `/api/matches/{id}/create-rematch` | Nouveau brouillon lié après report |
| POST | `/api/tunnels/{id}/transfer` | Transfert sécurisé de propriété d’appareil |
| GET | `/api/matches/{id}/history` | Lecture immuable du journal |
| POST | `/api/matches/{id}/notes` | Ajouter une note après clôture |
| POST/DELETE | `/api/push/subscriptions` | Abonnements VAPID de l’appareil |
| POST | `/api/media` | Upload contrôlé de photos |
| GET | `/api/sync/bootstrap` | Données utiles au mode hors ligne |
| POST | `/api/sync/batch` | Envoyer les opérations locales idempotentes |

Les conventions de suppression et d’erreurs HTTP seront uniformisées lors de la rédaction des contrats OpenAPI. Aucune API privée de la FFF n’est présumée accessible.

## 12. Hors ligne, appareil actif et conflits

**Architecture offline-first :** Service Worker pour l’interface et les ressources nécessaires ; IndexedDB pour matchs à venir, tunnel actif, sac, médias utiles et derniers historiques ouverts ; file d’opérations locales durable. Toute pression utilisateur écrit d’abord une opération locale horodatée puis, si possible, synchronise ; afficher « enregistré sur cet appareil », « synchronisation en attente » ou « synchronisé ». Ne jamais promettre que « sauvegardé » signifie « déjà dans MariaDB » sans confirmation du serveur.

**Un seul appareil actif :** le serveur attribue un **jeton de propriété clôturé par version** (`fencingVersion`) à un téléphone. Les autres restent en lecture seule pour ce tunnel. Le transfert nécessite une connexion et révoque la version précédente. **Limite technique incontournable :** un ancien appareil totalement hors ligne ne peut pas apprendre immédiatement sa révocation ; ses opérations locales ultérieures sont donc **mises en quarantaine et non appliquées** à MariaDB lorsqu’il se reconnecte. Cela évite d’écraser l’état du nouvel appareil, mais interdit de garantir une exclusivité physique instantanée pendant une partition réseau. Un écran de résolution explique les données non synchronisées.

Gestion des conflits : `operationId` unique, version optimistic locking, horodatage d’événement client **et** de réception serveur, ordre stable de réplication ; jamais de « dernière écriture gagne » aveugle pour anomalies, historique, clôture ou coup d’envoi. En perte de stockage local, seules les données effectivement synchronisées sont récupérables. Première connexion/inscription et transfert d’appareil exigent le réseau ; consultation et poursuite d’un tunnel déjà provisionné sont possibles hors ligne.

## 13. Notifications, sons, vibrations et animations

**Web Push** : Service Worker, VAPID, abonnement par appareil, clés privées côté serveur, tâche planifiée fiable sur VPS (worker/cron connecté à MariaDB, pouvant tourner dans le même projet Next.js). Préavis 5 minutes avant chaque étape et alerte à l’heure prévue ; rappel veille du match pour le sac. Les alertes de tunnel ciblent **uniquement l’appareil propriétaire** ; les étapes terminées ne reçoivent plus d’alerte. Prévenir les doublons entre alertes de premier plan et Push. Retenter les échecs temporaires et invalider les abonnements expirés.

**Compatibilité :** Push sur iOS nécessite une application installée sur l’écran d’accueil et un système compatible (iOS 16.4+ selon documentation Next.js), avec permission volontaire ; la Vibration API n’est pas disponible dans Safari iOS ; l’audio peut nécessiter une interaction utilisateur préalable. Sans Internet, le compteur et les signaux visuels locaux fonctionnent **si la PWA est ouverte**, mais on ne promet pas une notification système hors ligne à heure fixe lorsque l’application est fermée. En l’absence de permission/support, afficher une aide simple plutôt qu’une erreur bloquante.

**Design sonore** : validation, alerte d’étape, fin de phase, confirmation, tous courts, discrets et indépendants de l’interface. Sons activés par défaut mais bouton **Muet** constamment visible dans le tunnel. Vibrations uniquement si le navigateur et le téléphone le permettent, sans exigence fonctionnelle bloquante.

**Animation** : transitions verticales 200–350 ms comme cible de conception, chiffres de compteurs stables sans saut de largeur, coche de validation, barres de progression, cartes de tenues, états d’anomalie et exercice guidé. Animation sur `transform`/`opacity` quand possible. `prefers-reduced-motion` neutralise les mouvements inutiles. Éviter les flashs répétés et le défilement automatique provoquant des clics erronés.

## 14. Design system et accessibilité

Identité **ArbiGo**, originale, **inspirée** des couleurs approuvées dans ce projet : bleu `#003287`, rouge `#E60028`, or `#BE965A`, blanc `#FFFFFF`. Ces valeurs ne constituent pas à elles seules une **charte officielle certifiée District Paris 75**. Ne pas utiliser l’écusson ni affirmer une affiliation sans autorisation. Thème clair uniquement ; couleurs sémantiques de succès/alerte/retard distinctes des couleurs de marque.

Mobile-first à partir d’environ **320 px de largeur**, prise en charge des zones sûres (« safe areas »), mode portrait prioritaire et adaptation paysage/tablette/ordinateur. En mode installé, demander l’affichage `standalone` ; dans un onglet navigateur, ne pas promettre de supprimer l’interface système. Zone supérieure des deux compteurs **sticky**, carte précédente compacte mais toujours présente, carte centrale flexible et scrollable, carte suivante et actions visibles dans une zone basse fixe ou accessible. Utilisation confortable à une main : cibles tactiles **au moins 44 × 44 px**, retours visuels immédiats, contraste WCAG AA visé, labels pour lecteurs d’écran, navigation clavier, pas d’information portée uniquement par la couleur.

## 15. Sécurité, confidentialité, exploitation

- Auth.js Credentials ; mot de passe **haché Argon2id** (ou équivalent robuste), jamais stocké ni journalisé en clair ; email normalisé et unique ; vérification et réinitialisation par jeton à usage unique, expiration et stockage de hash de jeton.
- Sessions protégées, cookies sécurisés/HttpOnly/SameSite adaptés, CSRF selon les mécanismes Auth.js, limitation des tentatives de connexion et d’e-mail, anti-énumération et contrôle d’accès systématique par `userId`.
- Validation/sanitation serveur ; upload image avec MIME réel, taille maximale configurable, réencodage, suppression métadonnées EXIF non nécessaires, nom aléatoire et accès authentifié ; limites d’espace par compte.
- TLS/HTTPS, secrets hors du dépôt, clé VAPID privée réservée au serveur, protection contre XSS et injections, politiques CSP pertinentes, droits minimaux MariaDB.
- Sur VPS : conteneur Next.js, MariaDB, stockage média persistant, processus de tâches planifiées, reverse proxy HTTPS, volumes, réseau privé interne ; migrations versionnées, redémarrage/healthchecks, sauvegardes chiffrées et essais de restauration.
- Journal d’événements append-only ; suppression/rectification des données personnelles organisée séparément du verrou de l’historique métier ; politique de conservation et mentions RGPD à fixer avant publication ; possibilité de retirer consentement Push et de supprimer compte/données selon règles applicables.

## 16. Performances et objectifs de qualité

**Cibles d’acceptation proposées, à mesurer (non garanties avant tests) :** interaction de coche ressentie immédiatement avec mise à jour locale visée en moins de **100 ms** sur téléphone cible ; animation à **60 FPS cible** sur appareils suffisamment puissants ; parcours tunnel hors ligne restauré après fermeture/rechargement ; pas de perte d’opération locale à une reconnexion ordinaire ; image optimisée et lazy loading des médias historiques ; pas de rerender de toutes les fiches chaque seconde ; **Lighthouse PWA/performance/accessibilité** suivi dans CI sans utiliser un score unique comme preuve suffisante.

Les compteurs sont calculés avec `Date.now()` et échéances absolues, mais les affichages dynamiques ne doivent rafraîchir que les composants concernés. Précharger la fiche précédente/suivante, différer les écrans d’historique, réduire le poids des sons et médias. Tester la consommation mémoire sur smartphones d’entrée de gamme et la résistance à une longue séance ouverte.

## 17. Stratégie de tests et critères d’acceptation

**Outils :** Vitest et React Testing Library (unitaires et composants), tests intégration sur MariaDB de test isolée, Playwright E2E sur moteurs compatibles, axe/accessibility et tests manuels sur vrais iPhone/Android. Lancer lint, format, TypeScript strict, tests et build en CI. Déploiement impossible si tests critiques échouent.

| Référence | Test d’acceptation V1 |
|---|---|
| AUTH-01 | Inscription impossible à activer sans e-mail vérifié ; token expiré/refait rejeté |
| AUTH-02 | Connexion mot de passe valide, hachage sûr, mot de passe oublié, isolation des comptes |
| MATCH-01 | Plusieurs matchs ; équipes libres ; stade facultatif ; pratique obligatoire ; catégorie/compétition facultatives |
| BAG-01 | Checklist FFF créée, personnalisable ; cochage propre au match ; nouvelle rencontre non cochée |
| KIT-01 | Tenues complètes depuis articles et photos ; seules les tenues emportées sont proposées |
| KIT-02 | Couleurs équipe/gardien sauvegardées ; recommandation explicable ; conflit affiché et décision finale manuelle |
| TIME-01 | Match 15 h : H−75 = 13 h 45 ; H−55 = 14 h 05 ; valeurs recalculées après réveil du téléphone |
| TIME-02 | Les compteurs de match et d’étape restent indépendants ; retards négatifs représentés correctement |
| TUNNEL-01 | Un seul match actif et pas d’onglets pendant tunnel ; swipe/boutons sans validation implicite |
| TUNNEL-02 | Précédente et suivante visibles ; statuts persistants ; validation manuelle de chaque étape |
| CONTROL-01 | Conforme, Problème, Sans objet autorisé ; anomalies/photo/commentaires et corrections horodatées |
| SAFETY-01 | Anomalie sécurité ouverte empêche l’étiquette « Préparation complète » ; aucun événement supprimé |
| WARMUP-01 | Quatre phases 3/4/3/3 min ; pause/reprise ; validation manuelle ; état restaurable |
| FINAL-01 | Bilan complet, navigation vers problèmes ; bouton coup d’envoi saisit heure réelle, jamais déclenché par l’horloge |
| FINAL-02 | Sortie annulée/reportée/autre ; journal conservé ; match reporté génère nouveau brouillon indépendant |
| HIST-01 | Journal clos immuable, notes ultérieures distinctes, aucune fonction d’export PDF de match |
| OFFLINE-01 | Mode tunnel complet utilisable hors réseau après synchronisation initiale ; file locale persistée |
| OFFLINE-02 | Idempotence des mutations et synchronisation sans doublon après coupure/reconnexion |
| DEVICE-01 | Un second appareil ne modifie pas un tunnel actif ; transfert révoque l’ancien `fencingVersion` |
| DEVICE-02 | Opérations tardives de l’ancien téléphone hors ligne mises en quarantaine, non fusionnées aveuglément |
| PUSH-01 | Alertes H−5/H0 uniques sur appareil actif ; permission refusée n’empêche pas le match |
| PUSH-02 | Cas PWA iOS installée / Android ; absence de vibration Safari et réseau hors ligne gérés sans erreur |
| FORMAT-01 | Trois profils 11/8/futsal distincts, contenus versionnés, adaptés et vérifiés réglementairement |
| UI-01 | Mobile 320 px+, safe areas, mode clair, animations réduites, contrôles tactiles accessibles |
| OPS-01 | Docker Compose reproductible ; migrations ; sauvegarde/restauration ; secrets ; healthchecks ; CI verte |

Tests spécifiques : changement d’heure hiver/été, déplacement du match avant le tunnel, annulation pendant une alerte Push, Safari avec clavier ouvert, duplication de clic, rafraîchissement à mi-échauffement, disparition du réseau, saturation du stockage local, photo trop volumineuse et reprise après expiration de session.

## 18. Plan de réalisation recommandé

| Lot | Livrables | Validation |
|---|---|---|
| 0. Fondations | Next.js/TS, structure modulaire, design tokens, CI, Docker, MariaDB, Prisma version compatible | Build, migrations et tests de base |
| 1. Auth | Inscription, e-mail confirmé, connexion, reset, préférences, appareils | Tests sécurité et authentification |
| 2. Matchs | Création, listes, pratique, modèles et horaires, historique minimal | Matchs créés avec planning correct |
| 3. Inventaire | Checklist FFF, photos, articles, tenues complètes, sac par match | Équipements réutilisables et snapshots |
| 4. Tunnel moteur | Plein écran, navigation, deux compteurs, statuts, sauvegarde locale | Scénarios de navigation et temps |
| 5. Fiches | Terrain, FMI, couleurs, capitaines, assistants, joueurs, protocole | Tests fonctionnels et règles d’applicabilité |
| 6. Échauffement | Quatre phases, minuteurs, illustrations, sons | Pause/reprise et restaurations |
| 7. Finalisation | Anomalies, bilan, coup d’envoi, sortie exceptionnelle, report, historique immuable | Parcours E2E complet |
| 8. Hors ligne / multi-device | Service Worker, IndexedDB, synchronisation, idempotence, verrou et transfert | Tests de conflit et coupure réseau |
| 9. Push et polish | VAPID, tâches planifiées, sons/vibrations, animations, accessibilité | Tests réels Android/iOS |
| 10. Recette réglementaire et production | Validation templates 11/8/futsal 2026/27, performance, sécurité, backup, déploiement | Critères d’acceptation intégralement satisfaits |

L’ordre est indicatif : l’architecture de synchronisation, les événements immuables et la notion de propriétaire de tunnel doivent être anticipés dès les lots 0–4, pas ajoutés tardivement comme un correctif.

## 19. Risques, limites et décisions déjà tranchées

**R1 — Sources applicables :** le planning de formation à 11 n’est pas automatiquement la règle des compétitions à 8 et futsal. Templates distincts et audit documentaire sont des prérequis V1.  
**R2 — Un appareil actif vs hors ligne :** exclusivité instantanée impossible en cas de deux appareils déconnectés ; garantie côté serveur par versionnement et mise en quarantaine.  
**R3 — Alertes :** VAPID nécessite le réseau Push ; notifications système hors ligne et sons en arrière-plan non garantis ; dégradation élégante obligatoire.  
**R4 — « Plein écran » :** `standalone` lorsque PWA installée, mais interface du navigateur non supprimable de force.  
**R5 — Photos de tenues :** classement des couleurs basé sur les choix manuels, non sur une analyse d’image.  
**R6 — Décisions arbitrales :** ArbiGo est un carnet d’aide et ne remplace ni le central, ni la FMI, ni l’organisateur, ni les Lois du Jeu.  
**R7 — Prisma/MariaDB :** version ORM à figer sur une édition officiellement compatible ; à la date de rédaction Prisma 7 convient, Prisma 8 ne doit pas être adopté sans nouvelle vérification.  
**R8 — Absence d’export PDF :** historique consultable uniquement dans l’app en V1, sans empêcher l’exercice des droits personnels légaux.

## 20. Définition de « V1 terminée »

ArbiGo V1 est terminée uniquement si un nouvel arbitre peut **s’inscrire et vérifier son e-mail**, **constituer son sac**, **créer plusieurs matchs**, **préparer un sac pour une rencontre**, **activer le tunnel**, **réaliser les contrôles et l’échauffement avec les deux compteurs**, **prendre connaissance des anomalies**, **clôturer par un coup d’envoi réel ou une fin exceptionnelle**, **consulter le journal immuable** et **retrouver ses données après perte temporaire de connexion** ; si un autre appareil ne peut pas modifier le tunnel sans transfert sécurisé ; si les trois profils 11/8/futsal ont été vérifiés et testés ; et si la qualité, la sécurité, les sauvegardes et les tests Android/iPhone sont satisfaisants.

---

## Références documentaires et techniques

**Fichiers de référence fournis au projet :**

- `Réunion début de saison 2026-2027.pdf` — CDA Paris, p. 12 (arrivée H−75).
- `Séance 2 - Contenus portail formation - 2 - Fiche compte à rebours davant match.pdf` — FFF/CFA, p. 1.
- `Séance 2 - Contenus portail formation - 1 - Fiche composition sac arbitrage.pdf` — FFF/CFA, p. 1.
- `Séance 1 - Contenus portail formation - 1 - Fiche échauffement.pdf` — FFF/CFA, pp. 1–2.
- `Séance 2 - Contenus portail formation - 3 - Fiche ma relation aux autres.pdf` — FFF/CFA, p. 1.
- `Lois du Jeu 2026_27_pages simples FRANCE.pdf` — IFAB, Loi 4, §3, p. 74 du PDF.

**Documentation publique consultée :**

- IFAB, Loi 4 : https://www.theifab.com/fr/laws/latest/the-players-equipment/
- IFAB, documents 2026/27 : https://www.theifab.com/fr/laws-of-the-game-documents/
- Next.js, Route Handlers : https://nextjs.org/docs/app/getting-started/route-handlers
- Next.js, PWA et Web Push : https://nextjs.org/docs/app/guides/progressive-web-apps
- Auth.js, Credentials : https://authjs.dev/getting-started/authentication/credentials
- Prisma 7, MySQL/MariaDB : https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/mysql
- Prisma 8, statut de prise en charge des SGBD : https://www.prisma.io/docs/orm/supported-databases
- MDN, Vibration API : https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API
- District 75, documents officiels : https://district75foot.fff.fr/documents/
- Ligue Paris Île-de-France, documents : https://paris-idf.fff.fr/documents/

**Fin du cahier des charges ArbiGo V1.**
