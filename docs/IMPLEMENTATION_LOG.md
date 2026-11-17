# Journal de réalisation

Plan : docs/superpowers/plans/2026-11-17-arbigo-v1.md. Cahier original conservé sans modification.

- Dépôt initialement vide, initialisation sur main puis réalisation sur `feat/arbigo-v1`.
- Fondations, comptes, matchs, inventaire, tunnel, fiches, échauffement, clôture, file locale et Push implémentés.
- Cycles RED→GREEN exécutés pour moteur de préparation (10 échecs→15 tests verts), hachage/token (2 échecs→17 tests verts), persistence locale (2 échecs→19 tests verts).
- Sélection de notifications ajoutée : suite à 20 tests verts.
- Génération Prisma/migration et build vérifiés. Les erreurs TypeScript liées aux valeurs JSON Prisma ont été corrigées par sérialisation explicite.
- Choix : agrégat Match JSON versionné, détaillé dans README/recette ; isolation et invariants conservés côté services.
- Choix : conserver les trois modèles en DRAFT jusqu’à la recette documentaire, plutôt que prétendre une conformité non établie ; lancement public bloqué par configuration d’approbation.
- Blocage environnemental : absence MariaDB/Docker et refus de socket Chromium, empêchant tests d’intégration/E2E locaux. CI dédiée fournie pour ces essais.
- Blocages externes : accès VPS, domaine, paramètres SMTP/VAPID, essais Android/iPhone réels et politique exploitant.

La recette décrit les critères vérifiés et non vérifiés ; aucune ligne de plan n’est réputée terminée uniquement sur la présence du code.
