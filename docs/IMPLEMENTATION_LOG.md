# Journal de réalisation

Plan : docs/superpowers/plans/2026-11-17-arbigo-v1.md. Cahier original conservé sans modification.

- Dépôt initialement vide, initialisation sur main puis réalisation sur `feat/arbigo-v1`.
- Fondations, comptes, matchs, inventaire, tunnel, fiches, échauffement, clôture, file locale et Push implémentés.
- Cycles RED→GREEN exécutés pour moteur de préparation (10 échecs→15 tests verts), hachage/token (2 échecs→17 tests verts), persistence locale (2 échecs→19 tests verts).
- Sélection de notifications ajoutée : suite à 20 tests verts.
- Génération Prisma/migration et build vérifiés. Les erreurs TypeScript liées aux valeurs JSON Prisma ont été corrigées par sérialisation explicite.
- Choix : agrégat Match JSON versionné, détaillé dans README/recette ; isolation et invariants conservés côté services.
- Choix : conserver les trois modèles en DRAFT jusqu’à la recette documentaire, plutôt que prétendre une conformité non établie ; lancement public bloqué par configuration d’approbation.
- Résolution de l’environnement de recette : MariaDB Docker partagée avec schéma de test séparé, relais SMTP isolé et Chromium installés ; 28 tests d’intégration et 5 tests E2E réussis.
- Préversion déployée sur le VPS, schéma dédié `arbigo`, domaine HTTPS via Caddy partagé ; worker, monitor, SMTP, VAPID et sauvegarde chiffrée vérifiés.
- La production a révélé puis corrigé l’import ESM du worker `web-push` sous Node 24 ; le smoke test de démarrage est désormais exécuté en CI et au build Docker.
- Le statut « Modèle en brouillon » est visible sur le détail du match ; le formulaire demande de préciser la catégorie pour foot à 8 et futsal sans bloquer l’enregistrement de la préversion.
- Restent nécessaires avant l’ouverture publique : identité/contact de l’exploitant (reportés à plus tard), validation des profils 11/8/futsal, restauration isolée de sauvegarde, et tests de Push sur appareils Android/iPhone.

La recette décrit les critères vérifiés et non vérifiés ; aucune ligne de plan n’est réputée terminée uniquement sur la présence du code.
