# Recette V1

Version de travail du 17 novembre 2026. **La V1 complète au sens de la section 20 du cahier des charges n’est pas encore déclarée terminée.**

## Vérifications exécutées le 17 novembre 2026

- `npm run typecheck`, `npm run lint`, `npm run format:check` et build Next.js de production : réussis sur `main`.
- Tests unitaires : 23 réussis ; tests d’intégration MariaDB : 28 réussis sur le schéma isolé `arbigo_test`.
- Playwright/Chromium : 5 parcours réussis, dont inscription, vérification SMTP de test, réinitialisation, export, suppression et contrôle des photos privées.
- Smoke test du worker : démarrage ESM Node 24 et battement de santé réussis ; la CI et le build Docker l’exécutent désormais.
- CI GitHub du commit `11229c630b5bf9201cb65b57ba5f08534f5fa894` : succès.
- Production de recette : migration appliquée sur le schéma dédié `arbigo` de l’instance MariaDB Docker partagée ; application et worker sains derrière Caddy/HTTPS.
- SMTP partagé : connexion/authentification vérifiées sans envoyer de message ; VAPID : génération de signature vérifiée.
- Sauvegarde chiffrée du 17 novembre 2026 : contient le dump `arbigo`, le volume `arbigo_media` et les fichiers de configuration ; sommes SHA-256 validées.
- La restauration de cette archive, la livraison Push sur téléphone physique et la recette Android/iPhone ne sont pas encore vérifiées.

## Couverture

| Références du cahier | Implémentation                                                                                                      | Preuve / recette restante                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| AUTH-01/02           | Auth.js, Argon2id, vérification/reset, version de session, limite de débit persistée                                | E2E SMTP de test et MariaDB réussis ; l’envoi SMTP réel est seulement vérifié par connexion               |
| MATCH-01             | Plusieurs matchs, saisie libre, trois pratiques, modification avant tunnel                                          | E2E Chromium réussi ; contenu des modèles reste à approuver                                               |
| BAG-01               | Inventaire FFF éditable, réordonnable et sac indépendant non coché                                                  | Test d’indépendance et snapshots réussi                                                                   |
| KIT-01/02            | Tenues en quatre éléments, photos, pastilles et classement explicable des seules tenues emportées                   | Tests de classement et upload photo privé réussis ; vérification physique restante                        |
| TIME-01/02           | Échéances absolues, double compteur, fuseau Paris et DST                                                            | Tests hiver/été, heure inexistante/ambiguë et retard réussis                                              |
| TUNNEL-01/02         | Mode sans onglets, boutons/swipe, précédente et suivante, validation manuelle                                       | Test de navigation sans validation réussi ; E2E fourni                                                    |
| CONTROL-01           | Conforme/problème/sans objet contextualisé, motifs, photos, suivi et revérification                                 | Tests NA interdit et anomalies réussis                                                                    |
| SAFETY-01            | Danger ouvert conservé et préparation jamais étiquetée complète                                                     | Test réussi ; décision de coup d’envoi manuelle maintenue                                                 |
| WARMUP-01            | Quatre phases, pauses/durées absolues, restauration locale                                                          | Tests pauses et lancement manuel de phase réussis                                                         |
| FINAL-01/02          | Bilan, clôture réelle, annulation/report/autre et brouillon lié                                                     | Tests clôture, notes et report vierge réussis                                                             |
| HIST-01              | Services interdisent toute mutation de contrôles après clôture, notes séparées, cache des derniers journaux ouverts | Tests métier réussis ; audit DBA des droits append-only recommandé                                        |
| OFFLINE-01/02        | SW d’interface, IndexedDB par compte, file atomique, accusés et idempotence                                         | Tests de réouverture et conservation d’actions plus récentes réussis ; E2E réseau fourni                  |
| DEVICE-01/02         | Verrou transactionnel par compte, version optimiste, fencing et quarantaine persistée                               | 28 tests d’intégration MariaDB exécutés avec succès                                                       |
| PUSH-01/02           | Worker de tâches, déduplication par abonnement/tag, propriétaire et étape contrôlés                                 | Worker et signature VAPID vérifiés ; notification réelle Android/iOS restante                             |
| FORMAT-01            | Trois profils distincts, sources et statut DRAFT                                                                    | **Bloquant lancement : validation applicable par catégorie/saison et rapprochement Lois Futsal FIFA/FFF** |
| UI-01                | Responsive 320px+, safe areas, clavier, thème clair, mouvement réduit                                               | Test axe/overflow fourni ; essai navigateur et téléphone réel requis                                      |
| OPS-01               | Compose, migration, CI, healthchecks, backup chiffré/restauration                                                   | Déploiement et sauvegarde vérifiés ; restauration isolée encore requise                                   |

## Écarts et décisions de réalisation

- Persistance des contrôles/anomalies/tenues du match dans un agrégat JSON versionné, et non 26 tables ; événements, opérations, comptes, médias, appareils et notifications séparés. Préserve la transaction de préparation, réduit les jointures, rend les analyses SQL de contrôles moins directes.
- Le CRUD de l’inventaire écrit un document complet validé. Les autres documents ouverts peuvent devoir être rechargés après modification depuis un second appareil.
- La création et modification de matchs, la gestion d’inventaire et le transfert nécessitent une connexion ; la poursuite d’un tunnel provisionné reste locale. Les pièces photo nouvelles sont téléversées en ligne ; les photos déjà chargées sont mises en cache privé.
- Les modèles ne sont jamais auto-certifiés. Le foot à 8 reste générique en recette, avec avertissement de catégorie ; la validation finale doit préciser ses variantes.
- Les Push ne garantissent pas une livraison exacte sur un téléphone fermé hors réseau. Un crash au mauvais instant peut produire une nouvelle tentative, avec tag de déduplication visuelle.
- La politique de confidentialité indique les informations de l’exploitant à compléter. L’exploitant a demandé de les définir plus tard ; cette instance reste une préversion et ne constitue pas l’ouverture publique de la V1.

## Essais terrain avant lancement

Android et iPhone : installation, première permission Push, refus, arrière-plan, muet, rechargement durant échauffement, clavier ouvert, manque de stockage, session expirée, deux téléphones dont un hors ligne lors du transfert. Mesurer réactivité et accessibilité sur les appareils réels ; aucun score Lighthouse ni objectif 60 FPS n’a été inventé.

La préversion est hébergée sur `https://arbigo.clubika.com`. Les coordonnées de l’exploitant, la validation des modèles et les essais de terrain restent des prérequis avant l’ouverture publique et la déclaration de V1 terminée.
