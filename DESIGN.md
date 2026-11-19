# Identité visuelle ArbiGo

La référence est le débrief d’après-match. `src/app/theme.css` définit les couleurs, les familles typographiques et les styles communs, après les feuilles de mise en page.

- Bleu FFF `#003287` : navigation, titres de sections, liens et sélection.
- Rouge `#e60028` : action principale. Les actions destructives utilisent un fond rouge pâle et un libellé explicite.
- Or `#be965a` : repère d’identité des rencontres et formulaires. Le texte doré utilise la variante lisible `--gold-ink`.
- Fond `#f5f5f5`, surfaces blanches, texte `#1a1a1a`, contours `#e5e7eb`.
- Texte et formulaires : même pile sans-serif que le débrief. Titres de page, marque et chronomètres : Barlow Condensed, conservée pour la hiérarchie commune.
- Cartes : contour discret et rayon de 12 px. Champs : rayon de 11 px, texte de 16 px. Boutons : hauteur minimale de 44 px.

Les écrans de connexion, d’accueil, de matchs, de sac, de profil, de préparation et de débrief partagent ces règles. Les couleurs réelles des maillots, des équipes et des logos restent des données de la rencontre. Les états de réussite, d’attente et d’erreur conservent leurs significations vert, ambre et rouge.

Les styles propres à un écran gèrent sa composition, sans redéfinir une palette locale. Les variantes sur fond bleu (export du débrief, par exemple) utilisent un texte clair accessible. Le focus clavier reste visible et les préférences de réduction des animations sont respectées.
