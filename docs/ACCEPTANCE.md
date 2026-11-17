# Recette V1

Version de travail du 17 novembre 2026. **La V1 complète au sens de la section 20 du cahier des charges n’est pas encore déclarée terminée.**

## Vérifications exécutées dans cette session

- Tests unitaires métier, sécurité et IndexedDB : 20 tests passent au premier point de livraison (les ajouts ultérieurs font l’objet de nouvelles exécutions).
- Génération du client Prisma 7.10.1 et migration initiale MariaDB : réussies.
- Compilation Next.js de production et TypeScript strict : réussis au premier point de contrôle.
- Les tests Playwright ont été tentés, mais Chromium est bloqué par les restrictions de création de socket de cet environnement. Ils ne sont pas déclarés réussis localement.
- MariaDB/Docker ne sont pas disponibles ici : la migration appliquée, les tests transactionnels et le Compose doivent être vérifiés par la CI/VPS.

## Couverture

| Références du cahier | Implémentation                                                                                                      | Preuve / recette restante                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| AUTH-01/02           | Auth.js, Argon2id, vérification/reset, version de session, limite de débit persistée                                | Tests unitaires de hash ; tests MariaDB et SMTP nécessaires                                               |
| MATCH-01             | Plusieurs matchs, saisie libre, trois pratiques, modification avant tunnel                                          | E2E fourni ; confirmation navigateur requise                                                              |
| BAG-01               | Inventaire FFF éditable, réordonnable et sac indépendant non coché                                                  | Test d’indépendance et snapshots réussi                                                                   |
| KIT-01/02            | Tenues en quatre éléments, photos, pastilles et classement explicable des seules tenues emportées                   | Tests de conflits et indisponibilité réussis ; recette photo à faire                                      |
| TIME-01/02           | Échéances absolues, double compteur, fuseau Paris et DST                                                            | Tests hiver/été, heure inexistante/ambiguë et retard réussis                                              |
| TUNNEL-01/02         | Mode sans onglets, boutons/swipe, précédente et suivante, validation manuelle                                       | Test de navigation sans validation réussi ; E2E fourni                                                    |
| CONTROL-01           | Conforme/problème/sans objet contextualisé, motifs, photos, suivi et revérification                                 | Tests NA interdit et anomalies réussis                                                                    |
| SAFETY-01            | Danger ouvert conservé et préparation jamais étiquetée complète                                                     | Test réussi ; décision de coup d’envoi manuelle maintenue                                                 |
| WARMUP-01            | Quatre phases, pauses/durées absolues, restauration locale                                                          | Tests pauses et lancement manuel de phase réussis                                                         |
| FINAL-01/02          | Bilan, clôture réelle, annulation/report/autre et brouillon lié                                                     | Tests clôture, notes et report vierge réussis                                                             |
| HIST-01              | Services interdisent toute mutation de contrôles après clôture, notes séparées, cache des derniers journaux ouverts | Tests métier réussis ; audit DBA des droits append-only recommandé                                        |
| OFFLINE-01/02        | SW d’interface, IndexedDB par compte, file atomique, accusés et idempotence                                         | Tests de réouverture et conservation d’actions plus récentes réussis ; E2E réseau fourni                  |
| DEVICE-01/02         | Verrou transactionnel par compte, version optimiste, fencing et quarantaine persistée                               | Tests d’intégration MariaDB fournis ; exécution requise                                                   |
| PUSH-01/02           | Worker de tâches, déduplication par abonnement/tag, propriétaire et étape contrôlés                                 | Test de sélection réussi ; essai VAPID réel Android/iOS requis                                            |
| FORMAT-01            | Trois profils distincts, sources et statut DRAFT                                                                    | **Bloquant lancement : validation applicable par catégorie/saison et rapprochement Lois Futsal FIFA/FFF** |
| UI-01                | Responsive 320px+, safe areas, clavier, thème clair, mouvement réduit                                               | Test axe/overflow fourni ; essai navigateur et téléphone réel requis                                      |
| OPS-01               | Compose, migration, CI, healthchecks, backup chiffré/restauration                                                   | **Exécution et restauration sur environnement isolé requises**                                            |

## Écarts et décisions de réalisation

- Persistance des contrôles/anomalies/tenues du match dans un agrégat JSON versionné, et non 26 tables ; événements, opérations, comptes, médias, appareils et notifications séparés. Préserve la transaction de préparation, réduit les jointures, rend les analyses SQL de contrôles moins directes.
- Le CRUD de l’inventaire écrit un document complet validé. Les autres documents ouverts peuvent devoir être rechargés après modification depuis un second appareil.
- La création et modification de matchs, la gestion d’inventaire et le transfert nécessitent une connexion ; la poursuite d’un tunnel provisionné reste locale. Les pièces photo nouvelles sont téléversées en ligne ; les photos déjà chargées sont mises en cache privé.
- Les modèles ne sont jamais auto-certifiés. Le foot à 8 reste générique en recette, avec avertissement de catégorie ; la validation finale doit préciser ses variantes.
- Les Push ne garantissent pas une livraison exacte sur un téléphone fermé hors réseau. Un crash au mauvais instant peut produire une nouvelle tentative, avec tag de déduplication visuelle.
- La politique de confidentialité livrée indique les informations exploitant à compléter. Ouverture publique interdite avant ce travail et les essais ci-dessus.

## Essais terrain avant lancement

Android et iPhone : installation, première permission Push, refus, arrière-plan, muet, rechargement durant échauffement, clavier ouvert, manque de stockage, session expirée, deux téléphones dont un hors ligne lors du transfert. Mesurer réactivité et accessibilité sur les appareils réels ; aucun score Lighthouse ni objectif 60 FPS n’a été inventé.

Les identifiants SMTP, les clés VAPID, le domaine et l’accès VPS doivent être fournis/configurés par l’exploitant pour le déploiement réel. Aucun serveur externe n’a été déployé dans cette session.
