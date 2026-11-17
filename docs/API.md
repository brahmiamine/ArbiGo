# API ArbiGo

Toutes les routes de données exigent une session Auth.js dont la version n’a pas été révoquée. Les mutations contrôlent `Origin` contre `APP_URL`. Aucun identifiant utilisateur transmis par le client n’est utilisé comme autorité.

Réussite : `{ "data": ..., "serverTime": "ISO UTC", "revision": 1 }` (revision facultative).
Erreur : `{ "error": { "code": "...", "message": "..." }, "serverTime": "ISO UTC" }`.

| Méthode     | Route                              | Contrat                                                                                 |
| ----------- | ---------------------------------- | --------------------------------------------------------------------------------------- |
| POST        | `/api/auth/register`               | `{name,email,password}` ; minimum 12 caractères, confirmation obligatoire               |
| POST        | `/api/auth/verify-email`           | `{token}` ; usage unique, 24 heures                                                     |
| POST        | `/api/auth/forgot-password`        | `{email}` ; réponse sans révéler l’existence du compte                                  |
| POST        | `/api/auth/reset-password`         | `{token,password}` ; jeton 1 heure, révoque les sessions précédentes                    |
| GET/PATCH   | `/api/me`                          | profil et préférences                                                                   |
| POST/GET    | `/api/devices`                     | `{id:UUID,label}` / liste des appareils du compte                                       |
| DELETE      | `/api/devices/{id}`                | révoquer un appareil et ses abonnements                                                 |
| GET/PUT     | `/api/inventory`                   | `{equipment:Equipment[],outfits:Outfit[]}` ; schéma Zod dans `src/server/validation.ts` |
| GET         | `/api/equipment`, `/api/outfits`   | vues de l’inventaire ; l’interface écrit atomiquement l’inventaire complet              |
| POST        | `/api/media`                       | multipart `file`, image JPEG/PNG/WebP, 10 Mo maximum                                    |
| GET         | `/api/media/{id}`                  | média privé, propriétaire vérifié                                                       |
| GET/POST    | `/api/matches`                     | liste / `MatchInput` avec coup d’envoi UTC et timezone IANA                             |
| GET/PATCH   | `/api/matches/{id}`                | état / `{input:MatchInput,expectedVersion}` uniquement avant démarrage                  |
| GET         | `/api/matches/{id}/history`        | `{match,events}` avec heure client et heure serveur                                     |
| GET         | `/api/matches/{id}/tunnel`         | état du tunnel et snapshot des contrôles                                                |
| POST        | `/api/matches/{id}/create-rematch` | `{kickoffAt}` après report uniquement                                                   |
| POST        | `/api/tunnels/{matchId}/transfer`  | `{deviceId,expectedVersion}` ; en ligne uniquement                                      |
| GET         | `/api/sync/bootstrap`              | derniers 200 matchs, inventaire et opérations mises en quarantaine                      |
| POST        | `/api/sync/batch`                  | `{operations:Operation[]}` ; 50 maximum, ordre conservé, arrêt au premier conflit       |
| POST/DELETE | `/api/push/subscriptions`          | abonnement VAPID par appareil / désactivation des abonnements du compte                 |
| GET         | `/api/health`                      | santé MariaDB, sans contenu utilisateur                                                 |

## Événements

`Operation` et ses actions sont définis dans `src/domain/types.ts` et validés côté serveur par `operationSchema`.

```json
{
  "operations": [
    {
      "id": "UUID de l’opération",
      "matchId": "UUID du match",
      "deviceId": "UUID de l’appareil lié au compte",
      "expectedVersion": 0,
      "fencingVersion": 0,
      "occurredAt": "2026-11-22T12:45:00.000Z",
      "action": { "type": "START" }
    }
  ]
}
```

Les identifiants de cet exemple sont des descriptions : utiliser de vrais UUID. Actions : `START`, `ADD_LOCKER_STEPS`, `LOCKER_ROOMS`, `NAVIGATE`, `BAG`, `SELECT_SHIRT`, `ANSWER`, `COMPLETE`, `BRIEFING`, `ISSUE_UPDATE`, `COLORS`, `WARMUP`, `KICKOFF`, `CLOSE`, `NOTE`, `FINISH_MATCH`, `DEBRIEF`.

`BRIEFING` prend `stepCode: "captains" | "assistants"`. Une confirmation marque atomiquement les consignes données : les réponses manquantes du snapshot sont renseignées et l’étape est terminée, sans navigation. Les anciennes réponses et anomalies restent conservées. L’action respecte les mêmes contrôles de propriété de l’appareil, version et idempotence que les autres commandes du tunnel.

L’interface de tenues est retirée. Les anciens assemblages et sélections restent présents dans les données et exports ; une action `COLORS` sans `selectedOutfitId` conserve l’ancienne sélection. La suggestion actuelle du maillot utilise uniquement les articles du sac et les couleurs des équipes.

`SELECT_SHIRT` prend `itemId` et enregistre `selectedShirtId` dans la rencontre active. L’article doit être un maillot du sac ; le choix ne coche pas le sac et ne valide pas une étape. Les contrôles d’appareil propriétaire, version et idempotence s’appliquent.

`PATCH /api/me` accepte un nom et des préférences partielles. `avatarPhotoId` est un UUID de média appartenant au compte, ou `null` pour retirer la photo. `briefings` accepte séparément `captains`, `assistants` et `futsalOfficials`, chacun limité à 5 000 caractères non vides. Les champs omis restent conservés, y compris dans les préférences imbriquées. La réponse contient le profil actualisé. Ces données sont comprises dans l’export personnel et la suppression du compte ; aucune migration SQL n’est nécessaire.

Des routes explicites partagent le même contrat `Operation` : `/bag`, `/tunnel/start`, `/steps/{code}/responses`, `/steps/{code}/complete`, `/kickoff`, `/close-without-kickoff`, `/notes` sous un match. L’interface utilise principalement le batch pour unifier parcours connecté et hors ligne. Les routes CRUD unitaires d’équipement proposées dans le cahier ne sont pas exposées : l’écriture d’inventaire est groupée et validée.

Le batch renvoie un résultat par opération traitée (`APPLIED`, `CONFLICT`, `QUARANTINED`). Un HTTP 200 n’implique pas l’application de toutes les opérations. Le client doit examiner chaque résultat et conserver celles non accusées. La réutilisation d’un `id` avec un contenu différent est refusée. Les événements acceptés sont insérés dans la même transaction que l’agrégat et l’accusé d’idempotence.

`LOCKER_ROOMS` prend `rooms: {referee: "A2"}` ou `rooms: {home: "3", away: "4"}`. Les valeurs sont obligatoires, nettoyées et limitées à 30 caractères ; la saisie valide uniquement l’étape correspondante, sans navigation. `COMPLETE` ne peut pas contourner la saisie. Les numéros sont conservés dans `Match.lockerRooms`, avec journalisation, contrôle du propriétaire, fencing, version et idempotence.

Les nouveaux modèles v2 comprennent les deux étapes après l’arrivée. Sur les anciens tunnels actifs, le client propriétaire émet `ADD_LOCKER_STEPS` après les opérations déjà mises en file : ajout uniquement des deux étapes et runs manquants, conservation des anciens contrôles, réponses, anomalies et du code de la fiche affichée. L’opération est auditée ; les nouveaux rappels futurs sont ajoutés sans doublon (aucun rappel périmé n’est recréé). `START` ne modifie pas la structure des anciens modèles, afin de conserver le sens des index de navigation dans les files hors ligne. Les rencontres clôturées ne sont pas modifiées.

`KICKOFF` exige la confirmation du bilan et toutes les étapes de préparation terminées, sans anomalie ouverte (`PREPARATION_REQUIRED` sinon). Cette règle s’applique côté serveur et dans la file locale, quelle que soit la fiche affichée. Les rencontres déjà clôturées et le rejeu idempotent d’un ancien coup d’envoi appliqué restent inchangés. Une ancienne commande encore en attente avec préparation incomplète est conservée en conflit pour résolution, ainsi que les actions suivantes.
