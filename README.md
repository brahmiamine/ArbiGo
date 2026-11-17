# ArbiGo — Le terrain en tête

PWA mobile de préparation d’avant-match pour arbitres : matchs, inventaire, sac par rencontre, tunnel de contrôles, échauffement guidé et journal de préparation.

**Préversion : [arbigo.clubika.com](https://arbigo.clubika.com).** La V1 n’est pas déclarée terminée ; les critères et contrôles encore nécessaires sont consignés dans [la recette](docs/ACCEPTANCE.md). Le cahier des charges original est conservé dans [docs](docs/ArbiGo_Cahier_des_charges_V1.md).

## Fonctionnement

- Inscription, vérification de l’e-mail et réinitialisation par jetons à usage unique ; Credentials Auth.js avec sessions JWT et Argon2id.
- Football à 11, football à 8 et futsal : snapshots de modèles distincts, versionnés et identifiés comme brouillons tant que la revue applicable n’est pas achevée.
- Inventaire personnalisable, photos réencodées et sac indépendant pour chaque match. Les anciens assemblages restent conservés dans les données, sans onglet ni formulaire de tenues.
- Tunnel sans onglets, contrôles manuels, anomalies et revérification, deux compteurs et navigation sans validation implicite.
- Navigation du tunnel uniquement avec Précédent/Suivant en bas ; contrôles illustrés hors ligne, exemples de consignes avec confirmation unique et aperçu plein écran du maillot avant la prise en charge de la feuille. La suggestion compare les maillots du sac aux couleurs des joueurs et gardiens ; les couleurs manquantes restent à vérifier.
- Sans rencontre à venir, l’accueil affiche les trois derniers matchs et la liste présente le plus récent.
- Les cartes des matchs à venir affichent le temps restant avant le coup d’envoi, actualisé chaque seconde, sur l’accueil et dans Mes matchs. À l’horaire prévu, le compteur reste à zéro sans démarrer ni clôturer la rencontre.
- Le profil permet de modifier le nom, une photo privée et les textes des consignes aux capitaines, assistants et officiels de futsal. Les champs modifiés sont enregistrés séparément et restent disponibles dans le profil local pour la préparation hors ligne.
- L’écran des maillots propose le maillot conseillé par défaut et un carrousel pour choisir un autre article du sac. Le choix est propre à la rencontre et suit la synchronisation hors ligne habituelle.
- Quatre phases d’échauffement 3/4/3/3 minutes, démarrage/pause/reprise/fin manuels.
- Bilan, coup d’envoi confirmé manuellement, annulation/report et nouveau brouillon lié, notes distinctes après clôture.
- [Débrief d’après-match](docs/DEBRIEF.md) par rencontre jouée : huit sections, sauvegarde et synchronisation, PDF avec logos, copie du texte et OCR local des désignations.
- IndexedDB par compte, file atomique durable, synchronisation idempotente et conflits conservés ; transfert de propriété et fencing côté serveur.
- PWA installable, cache de l’interface, photos privées locales, Push VAPID avec worker MariaDB, sons et vibrations facultatifs.

## Démarrer

Node **24** recommandé ; minimum 22.12. MariaDB **11.8**. Dépendances épinglées dans `package-lock.json`.

```sh
cp .env.example .env
# Modifier les mots de passe dans .env et DATABASE_URL ensemble.
# AUTH_SECRET : générer avec openssl rand -base64 32.
docker compose --profile dev up --build -d
```

Application : `http://localhost:3000`. Boîte e-mail de développement Mailpit : `http://localhost:8025` (local uniquement). Consulter les e-mails de vérification pour activer un compte.

Une **démonstration locale sans compte**, indépendante des données serveur, est disponible à `/demo`. Les envois de photos, notifications et transferts réels nécessitent un compte. Ses données d’exemple restent dans le navigateur ; elle ne prouve pas le fonctionnement du serveur.

Sans Docker, configurer `DATABASE_URL` et SMTP, puis :

```sh
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

## Vérifier

```sh
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:worker-smoke
npm run test:integration  # base MariaDB isolée obligatoire
npm run build
npx playwright install chromium
npm run test:e2e
```

La CI exécute ces contrôles avec un service MariaDB. Aucun test de navigateur simulé ne remplace les essais physiques Android/iPhone et les notifications réelles. `PLAYWRIGHT_EXECUTABLE_PATH` permet d’utiliser un Chromium déjà installé.

## Architecture

Next.js App Router + React + TypeScript strict. Logique métier pure dans `src/domain`, services transactionnels dans `src/server`, écrans dans `src/features`. L’API fournit des enveloppes `{data, serverTime, revision?}` ou `{error:{code,message}, serverTime}`.

MariaDB conserve l’agrégat de préparation dans `Match.state` (JSON, version optimiste), avec événements, opérations de synchronisation, appareils, jetons, médias et notifications en tables séparées. Les contrôles et anomalies sont des snapshots de l’agrégat, plutôt que 26 tables relationnelles. Ce choix conserve une frontière transactionnelle unique et facilite la réplication ; il diffère du modèle logique indicatif du cahier des charges. Les contrôles de propriété sont systématiques dans les services.

Voir [l’exploitation](docs/DEPLOYMENT.md), [les contrats API](docs/API.md), [les références réglementaires](docs/REGULATORY.md) et [la recette](docs/ACCEPTANCE.md).
