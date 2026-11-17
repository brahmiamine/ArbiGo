# Architecture et réutilisation — audit VPS du 17 novembre 2026

Le dépôt `main` ne contenait initialement que son README. La branche `feat/arbigo-v1` portait déjà la réalisation fonctionnelle. Elle est conservée comme origine du travail et intégrée à `main` avec les corrections vérifiées sur le VPS.

## Frontières de données

- Une préparation est un agrégat JSON dans `Match.state`. Le champ SQL `version` et la version du document avancent ensemble. Aucun changement du schéma initial n’a été nécessaire pour le raccordement au VPS.
- Les comptes, appareils, jetons, médias, opérations, événements et notifications sont séparés. `operationId`/identifiant d’opération unique empêche le doublonnage.
- Les services vérifient `userId`, puis l’appareil et sa révocation. Le verrou transactionnel de la ligne utilisateur sérialise les démarrages et les transferts d’un même compte. Le contrôle optimiste refuse les versions dépassées ; le fencing conserve les opérations d’un ancien propriétaire en quarantaine.
- Les événements sont ajoutés dans la transaction qui modifie la préparation. Les services refusent les mutations de contrôles après clôture. La suppression volontaire du compte constitue une opération distincte et efface aussi l’historique personnel.
- La création du match et celle de ses notifications sont désormais atomiques. La modification avant tunnel réutilise la sélection des modèles persistés et leur contrôle d’approbation.
- Les photos sont reformatées en WebP, isolées par compte, accessibles via une route authentifiée et conservées dans un volume nommé. Les secrets d’exploitation sont exclus du contexte Docker et des artefacts standalone.

## Contrats et requêtes observés

`src/server/validation.ts` valide les opérations et inventaires ; `src/domain/match.ts` porte les invariants métier ; les Route Handlers produisent les enveloppes documentées dans `API.md`. L’export personnel `/api/me/data` produit un document JSON téléchargeable sans hash de mot de passe ni jetons d’accès.

`EXPLAIN` a été exécuté sur le MariaDB partagé, dans la base de test isolée :

| Requête                                      | Index choisi                        | Accès |
| -------------------------------------------- | ----------------------------------- | ----- |
| Match par `userId`, ordre `kickoffAt`        | `Match_userId_kickoffAt_status_idx` | `ref` |
| Événements par `matchId`, ordre `occurredAt` | `MatchEvent_matchId_occurredAt_idx` | `ref` |

Ces plans sur une petite base prouvent la sélection des index, pas une latence ou une capacité en charge. Les tests MariaDB vérifient l’isolation, les jetons expirés/réutilisés, l’idempotence et le transfert. L’exécution des essais est reportée dans `ACCEPTANCE.md`.

## Infrastructure réutilisée

- Serveur `shared-mariadb`, MariaDB 11.8.6 ; réseau de proxy `clubika_internal` et relais SQL existant `mariadb`.
- Base dédiée `arbigo` ; compte de migration séparé du compte de fonctionnement.
- SMTP de `/home/debian/deploy/shared/smtp.env` ; clés VAPID propres à ArbiGo, conservées hors Git.
- Caddy existant pour HTTPS, aucun nouveau serveur public sur les ports 80/443.
- Déploiement à partir de `main` par le timer existant ; contrôle de santé application/base et worker.
- Monitor existant : projet ArbiGo, contrôle HTTP et conteneurs application/worker.
- Sauvegarde nocturne existante : découverte automatique des bases et volumes ; ajout explicite des fichiers de secrets ArbiGo à l’archive chiffrée.

## Limites de cette architecture

L’agrégat JSON facilite la réplication mais exige des extractions pour analyser des contrôles en SQL. L’inventaire est un document complet ; sa modification simultanée depuis deux appareils n’est pas fusionnée. La propriété d’un tunnel ne peut être révoquée instantanément sur un téléphone hors réseau ; le refus est assuré à la reconnexion. Les essais sur appareils physiques et la validation finale des modèles ne sont pas remplacés par les contrôles automatisés.
