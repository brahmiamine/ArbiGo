# Quiz et météo dans ArbiGo

## Provenance

- Quiz : `brahmiamine/Quizfff`, révision `29ac644149be2490f4f179f6e345284610c1960b`. Les trois lots (159 questions avant les filtres pédagogiques d’origine), composants, règles de score et supports ont été importés dans `src/features/quiz` et `public/quiz`.
- Météo : Open-Meteo, comme `brahmiamine/Clubika`, révision `2444bb4e95b142e322fd438f43b5e969cbd13910`. L’intégration ArbiGo sélectionne explicitement le lieu du stade au lieu de supposer Paris.

## Parcours conservés

Entraînement, examen, durée personnalisée, pause/reprise, mélange stable, crédit partiel, correction, favoris, erreurs, questions non validées, sélection adaptative, historique et statistiques, lots, réglages sons/animations/thème, questions et réponses, abréviations, notes, schéma de terrain, documents PDF avec navigation et zoom. Les préférences et sessions sont locales et séparées par compte ArbiGo ; elles ne sont pas synchronisées entre appareils. La reprise inclut la première question.

Le shell ArbiGo reste unique. La sous-navigation du quiz est dans le contenu, avec URL et retour navigateur. Les styles et les préférences de thème du quiz sont isolés de l’application ; le thème clair utilise les couleurs et arrondis communs du débrief. Aucun second service worker ou compte n’est installé. Les PDF et illustrations locaux visités sont disponibles via le cache existant ; les vidéos externes nécessitent une connexion.

## Météo

Sélection d’une ville géolocalisée dans le formulaire de rencontre. Prévisions horaires Open-Meteo au plus près du coup d’envoi et sur les deux heures suivantes, en tenant compte du fuseau horaire. Il s’agit de prévisions horaires, pas d’une mesure à la minute. Aucun lieu n’est déduit arbitrairement d’un nom de stade. L’absence de lieu, une date hors horizon (15 jours), une panne ou l’absence de connexion n’empêchent jamais de créer ou de préparer une rencontre.

Les requêtes serveur utilisent des hôtes fixes, un délai de quatre secondes et un cache. La source Open-Meteo est affichée sur les cartes et liée dans le détail du match. Le lecteur PDF utilise `pdfjs-dist` et son worker local, préparé à chaque build. Sa licence est conservée dans `public/quiz/PDFJS-LICENSE`.
