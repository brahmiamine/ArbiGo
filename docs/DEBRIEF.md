# Débrief d’après-match

Le module reprend les fonctionnalités de [brahmiamine/debriefarbitre](https://github.com/brahmiamine/debriefarbitre), révision `e0950ad695bab5bdecd2132688bfdd360fa78533` : identité, sept sections d’auto-évaluation, progression, export PDF FFF / District 75, copie du texte, remise à zéro confirmée et lecture OCR des désignations. Les fonctions métier, l’analyse OCR, les composants et les tests correspondants ont été repris et adaptés.

## Parcours

Dans **Mes matchs → Historique**, ouvrir une rencontre dont le coup d’envoi a été enregistré. **Match terminé · faire le débrief** déclare la rencontre terminée et ouvre son formulaire. Les rencontres annulées, reportées ou non débutées n’ont pas de débrief. Le bouton devient **Ouvrir le débrief** pour les reprises.

L’identité est préremplie depuis le match et le profil, avec la date et l’heure dans le fuseau du match. La modifier dans le rapport, y compris par OCR, ne modifie pas la désignation ni le journal de préparation. **Vider les champs** ne vide que ce rapport, après confirmation.

L’URL conserve l’écran ouvert (onglet, rencontre, historique ou débrief) après rechargement et permet le retour navigateur. Seules les rencontres du compte sont résolues ; un tunnel actif garde la priorité. L’en-tête compact du formulaire n’affiche plus de logos ; ceux-ci restent présents dans le PDF. Les deux points forts se saisissent sur plusieurs lignes.

## Sauvegarde et synchronisation

Chaque changement déclenche immédiatement une transaction IndexedDB et une opération `DEBRIEF` contenant les champs modifiés. Les données sont isolées par compte et par rencontre. L’indication **Enregistré sur cet appareil** attend la fin des écritures locales ; l’état de synchronisation est affiché séparément. Une écriture échouée propose une nouvelle tentative, avec la saisie conservée à l’écran.

Les opérations passent par la synchronisation existante : authentification, appareil enregistré, propriété du match, versions optimistes, idempotence et résolution de conflits. La file se vide en plusieurs lots après reconnexion ; les lots respectent la limite de taille de l’API, y compris pour le texte Unicode. Le débrief est stocké dans l’état JSON du match : il fait partie de l’export personnel et de la suppression du compte, sans nouvelle migration SQL.

`COMPLETED` reste l’état historique « coup d’envoi effectué ». `FINISH_MATCH` ajoute `finishedAt`. `DEBRIEF` est autorisé seulement pour un match `COMPLETED` portant ce marqueur. Ces opérations d’après-match, comme les notes, peuvent provenir d’un autre appareil enregistré du même compte ; les commandes du tunnel restent soumises à son propriétaire.

## Exports et OCR hors ligne

Le PDF A4 reprend les logos, toutes les rubriques et la pagination ; les paragraphes longs sont répartis sur plusieurs pages. La confirmation d’export indique les champs manquants et permet de poursuivre. Le nom du fichier combine arbitre, numéro, équipes et compétition. Le texte peut également être copié pour le partager manuellement.

Le moteur PDF et son module d’export sont préparés à l’ouverture du formulaire. Le service worker conserve leurs fichiers et les logos pour les exports hors ligne après une première ouverture connectée.

L’OCR s’exécute sur l’appareil avec Tesseract.js, en français et en anglais. Aucun fichier de désignation n’est envoyé à un service OCR externe. Le worker, les moteurs WebAssembly et les langues sont servis depuis `/debrief/ocr/v1/`, préparés par `scripts/prepare-debrief-assets.mjs` lors de `dev` et `build`. Leurs dépendances sont épinglées ; les fichiers générés sont exclus de Git, du lint et du formatage. L’OCR devient disponible hors ligne après une première lecture connectée ayant mis ces ressources en cache. La CSP autorise uniquement les workers du même site et la compilation WebAssembly, sans ouvrir les connexions à un CDN.

Les images sont limitées à 10 Mo et la taille du canevas d’analyse est bornée. Une lecture dépassée par une autre sélection, un retrait ou une sortie du formulaire ne peut pas modifier le rapport.

## Couleurs et tenue

L’étape « Maillots et ballon » conserve le contrôle du ballon. Les couleurs et la tenue sont facultatives et enregistrées au clic, sans bouton de confirmation ni blocage de validation. Une tenue effectivement choisie doit toujours être présente dans le sac.
