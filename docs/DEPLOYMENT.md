# Déploiement VPS et exploitation

## Préparation

1. Installer Docker Compose sur le VPS et configurer les enregistrements DNS du domaine.
2. Copier `.env.example` vers `.env`, sans le committer. Générer des secrets distincts : `openssl rand -base64 32` pour `AUTH_SECRET` et des mots de passe MariaDB propres à l’environnement. Mettre le même mot de passe dans `DATABASE_URL` et `MARIADB_PASSWORD`.
3. Configurer `APP_URL=https://votre-domaine`, le SMTP réel, `MAIL_FROM`, `AUTH_TRUST_HOST=true` derrière le seul reverse proxy de confiance.
4. Générer les clés VAPID avec `node -e "console.log(require('web-push').generateVAPIDKeys())"` dans l’environnement installé. Copier la clé publique vers `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, la privée vers `VAPID_PRIVATE_KEY`, et renseigner un contact valide dans `VAPID_SUBJECT`.
5. Renseigner la politique de confidentialité et les procédures de droits des personnes avant ouverture publique.
6. Faire examiner les modèles et leurs sources par l’organisateur. **Conserver `REQUIRE_APPROVED_TEMPLATES=true` en production publique.** La valeur `false` sert uniquement à la recette privée des brouillons.

## Lancement

```sh
docker compose --profile https up --build -d
docker compose ps
docker compose logs --tail=100 app worker migrate
```

Le conteneur de migration attend MariaDB, applique les migrations versionnées et crée les modèles manquants. Les seeds ne modifient pas les versions existantes. `app` et `worker` attendent la fin des migrations. Le port applicatif est lié à `127.0.0.1`; MariaDB n’a aucun port hôte exposé.

Si Caddy est déjà utilisé sur le VPS, ne pas lancer le profil `https`. Ajouter un hôte Caddy pointant sur `127.0.0.1:3000`, ou relier les conteneurs sur un réseau partagé approprié. Éviter de publier le port MariaDB.

Les volumes `db_data` et `media_data` sont persistants. La limite des photos est de 10 Mo en entrée et 200 Mo de stockage par compte. Le décodage JPEG/PNG/WebP est vérifié, les images sont réorientées, redimensionnées puis réencodées WebP sans EXIF.

## Modèles

Les profils livrés portent le statut `DRAFT`. Le planning H−75 à 11 provient du cahier fourni ; il n’est pas présenté comme une règle universelle. La revue de catégorie et des textes Futsal FIFA/FFF doit être achevée avant validation.

Après une vérification documentaire réelle, enregistrer une référence complète :

```sh
docker compose exec app ./node_modules/.bin/tsx scripts/approve-template.ts CODE_MODELE REFERENCE_VERIFIEE
```

Cette commande n’effectue pas la vérification ; elle en enregistre l’approbation de l’exploitant. Pour modifier un modèle déjà utilisé, créer une nouvelle version/code et actualiser le sélecteur de modèles. Ne jamais réécrire les snapshots des anciennes rencontres. Exceptions additives de l’interface : `ADD_LOCKER_STEPS` et `ADD_SPORTCASH_STEP` ajoutent les fiches de vestiaires et de check-in aux seuls tunnels actifs, par des commandes auditées du propriétaire ; les contrôles existants et les rencontres clôturées sont préservés. Les nouveaux matchs utilisent les modèles v3.

## Sauvegarde et restauration

Installer `age` sur l’hôte. Conserver la clé privée de déchiffrement hors du VPS et conserver une copie chiffrée des sauvegardes hors du serveur.

```sh
BACKUP_PUBLIC_KEY=age1... sh scripts/backup.sh /chemin/sauvegardes
RESTORE_AGE_IDENTITY=/chemin/cle.age RESTORE_CONFIRM=RESTORE-ARBIGO sh scripts/restore.sh /chemin/archive.tar.gz.age
```

La sauvegarde exporte MariaDB avec `--single-transaction` et les médias, puis chiffre l’archive. Pour une copie strictement cohérente entre base et photos, mettre les écritures applicatives en maintenance durant la capture. La restauration remplace les données et exige la variable de confirmation explicite. La tester d’abord sur une **instance isolée** ; ne pas lancer sur une base de production sans fenêtre de maintenance.

Le VPS réutilise la sauvegarde chiffrée quotidienne existante à 03:17 UTC. Elle découvre les schémas MariaDB de production et les volumes Docker ; les fichiers `/home/debian/deploy/arbigo/.env` et `migration.env` sont ajoutés à l’archive de configuration. Exécution vérifiée le 17 novembre 2026 : le dump `arbigo`, le volume `arbigo_media` et les sommes SHA-256 figurent dans l’archive. La clé privée reste hors du VPS. La restauration sur une instance isolée n’a pas encore été vérifiée.

## Notifications et supervision

Le worker réclame les tâches atomiquement, cible le propriétaire actif et ignore les étapes terminées. Les échéances anciennes de plus de 10 minutes sont abandonnées pour éviter une rafale au redémarrage. Les abonnements expirés sont invalidés ; les envois réussis sont suivis par abonnement pour limiter les doublons lors des retries. Les tags permettent la déduplication visuelle côté navigateur. Une panne exactement entre l’envoi au fournisseur et l’écriture de l’accusé peut encore provoquer une nouvelle tentative : ce n’est pas une garantie réseau « exactement une fois ».

Sur iOS, les Push nécessitent une PWA installée et une version compatible. L’application fonctionne sans vibration et sans permission de notification. Tester les alertes sur les téléphones visés, application au premier plan et en arrière-plan.

Le domaine `https://arbigo.clubika.com` utilise le Caddy partagé et le réseau Docker `clubika_internal`. Le déploiement automatique suit `main`, applique les migrations/seed et attend l’application ainsi que le worker sains. Le projet ArbiGo est enregistré dans le monitor existant avec un contrôle HTTPS et deux contrôles Docker. SMTP provient du fichier partagé, les clés VAPID restent propres à ArbiGo. Surveiller `/api/health`, les médias, les tâches, le certificat et les sauvegardes ; les journaux n’impriment ni mots de passe ni jetons.

Cette instance est une préversion. `REQUIRE_APPROVED_TEMPLATES=false` y autorise l’essai des modèles DRAFT ; mettre cette valeur à `true` avant une ouverture publique. Le responsable de traitement et son contact ont été reportés par l’exploitant. Ne pas déclarer la V1 ouverte tant que ces informations, la revue réglementaire des modèles et les essais terrain ne sont pas terminés.
