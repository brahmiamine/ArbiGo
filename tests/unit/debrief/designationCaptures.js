/**
 * Textes reconstitués par l'OCR (colonnes marquées par « ~ ») depuis de vraies captures du portail
 * des officiels et de l'application mobile. Ils servent de tests de non-régression de l'analyse.
 */
export const REAL_CAPTURES = [
  {
    name: 'portail large : numéro et arbitre sans libellé, trois colonnes',
    text: 'SFR17:01@ ~ 15 sl 36%\n. ~ 5G\nM % officielsffffr/des« + © :\n© pa . a\n— gan PortailOfficiel\n= @ ortal clels ~ 608\nVous avez été désigné(e) par DISTRICT PARISIEN DE FOOTBALL\nVoici les informations concernant votre désignation.\nLE MATCH\nDISTRICT PARISIEN DE FOOTBALL\ndimanche 4 octobre 2026 à 11H00\nCDM D1 - Journée 1\nNZ ~ \\¥\nMAYDAY FC ~ BENFICA ARGOSELO S.\n(2, TÉLÉCHARGER LA FEUILLE DE MATCH INFORMATISÉE\nOFFICIELS DÉSIGNÉS INFORMATIONS LIEU\nMOHAMED BRAHMI ~ 56608650 + ba - - ~~\n~ Synthétique # Se Va ui\nri ~ Stade de\n/S ~ a ee\n~ PARC DES SPORTS\n~ INTERDÉPART N°05\n~ AVENUE DE LA DIVISION LECLERC\n~ 93000 BOBIGNY',
    expected: {
      matchNumber: '56608650',
      homeTeam: 'MAYDAY FC',
      awayTeam: 'BENFICA ARGOSELO S.',
      date: '2026-10-04',
      time: '11:00',
      competition: 'CDM D1 - Journée 1',
      referee: 'MOHAMED BRAHMI',
    },
  },
  {
    name: 'portail large, équipe domicile « UA. » sans points',
    text: 'SFR17:01@ ~ ES @ 36%\n. ~ 5G\nM % officielsffffr/des« + © :\n© pa . a\n— gan PortailOfficiel\n= @ ortal clels ~ 608\nVous avez été désigné(e) par DISTRICT PARISIEN DE FOOTBALL\nVoici les informations concernant votre désignation.\nLE MATCH\nDISTRICT PARISIEN DE FOOTBALL\nsamedi 3 octobre 2026 à 15H00\nU14 D3 - POULE A - Journée 3\n2-4 ~ Fer\n~ il\nCHANTIERS PARIS U.A. ~ PARIS XIII E.S.\n(2, TÉLÉCHARGER LA FEUILLE DE MATCH INFORMATISÉE\nOFFICIELS DÉSIGNÉS INFORMATIONS LIEU\nMOHAMED BRAHMI ~ 55742699 + A 2 es ~\nps ~ OA\nSynthétique ~ 2 Fi) x 4\n~ "Us Soy À\nSL ~ téo Lagrange 7% 7K\n~ 4. { a rH\nNN > es ~ 71%\nWo ~ 1 Lost | Opersieetiap contours\n~ STADE LEO LAGRANGE\n~ 68 BLD PONIATOWSKI\n~ 75012 PARIS',
    expected: {
      matchNumber: '55742699',
      homeTeam: 'CHANTIERS PARIS U.A.',
      awayTeam: 'PARIS XIII E.S.',
      date: '2026-10-03',
      time: '15:00',
      competition: 'U14 D3 - POULE A - Journée 3',
      referee: 'MOHAMED BRAHMI',
    },
  },
  {
    name: 'portail défilé : équipes sur deux lignes, bouton PDF sous la seconde',
    text: 'SFR16:58 @ ~ Js Gul 36%\nM % officielsffffridesic + D :\nDISTRICT PARISIEN DE FOOTBALL\ndimanche 4 octobre 2026 à 11H00\nCDM D1 - Journée 1\n© MAYDAY FC\nNEA\nM4 BENFICA ARGOSELO S.\n(ve\n0 TELECHARGER LA FEUILLE DE MATCH\nPE INFORMATISÉE\nOFFICIELS DÉSIGNÉS\n~ MOHAMED BRAHMI\nINFORMATIONS\n~ 56608650',
    expected: {
      matchNumber: '56608650',
      homeTeam: 'MAYDAY FC',
      awayTeam: 'BENFICA ARGOSELO S.',
      date: '2026-10-04',
      time: '11:00',
      competition: 'CDM D1 - Journée 1',
      referee: 'MOHAMED BRAHMI',
    },
  },
  {
    name: "application mobile, liste : nom d'équipe sur deux lignes, score entre les deux",
    text: 'SFR16:50 @ ~ Pi CG) 37%\nDÉSIGNATIONS ~ @\n< DESIGNATIONS PASSÉES\nDistrict Parisien de Football\nDimanche 4 octobre 2026 - 11H00\nCDM D1 - Journée 1\n0 = 2 ~ BENFICA\nMAYDAY FC ~ ARGOSELO S.\nParc des Sports Interdépart N°05\nArbitre centre\n= ~ & GE\nMessages Évènements Indisponibilit.. Rapports',
    expected: {
      matchNumber: '',
      homeTeam: 'MAYDAY FC',
      awayTeam: 'BENFICA ARGOSELO S.',
      date: '2026-10-04',
      time: '11:00',
      competition: 'CDM D1 - Journée 1',
      referee: '',
    },
  },
  {
    name: 'application mobile, liste : domicile et extérieur sur deux lignes',
    text: "SFR16:50 @ ~ gh ul 37%\nDESIGNATIONS ~ @\n< DESIGNATIONS PASSÉES\nDistrict Parisien de Football\nDimanche 13 septembre 2026 - 09H00\nAnciens D2 - POULE A - Journée 10\na 4, ~ gesu 5)\n© ~ a cf\nSALESIENNE 1 = 3 MINHOTOS\nDE PARIS ~ OS G.S.\nStade Porte d' Asnières\nArbitre centre\nBE 68 B&B & 6\nDésignations Messages Evénements Indisponibilit.. Rapports",
    expected: {
      matchNumber: '',
      homeTeam: 'SALESIENNE DE PARIS',
      awayTeam: 'MINHOTOS OS G.S.',
      date: '2026-09-13',
      time: '09:00',
      competition: 'Anciens D2 - POULE A - Journée 10',
      referee: '',
    },
  },
  {
    name: 'application mobile, liste : points des sigles perdus',
    text: 'SFR16:50 @ ~ Ks Sl 37%\nDESIGNATIONS ~ @\n< DESIGNATIONS PASSÉES\nDistrict Parisien de Football\nSamedi 3 octobre 2026 - 15H00\nU14 D3 - POULE A - Journée 3\nUAC ~ GRR\nPARIS ~ ARIS\nee ~ Al\nCHANTIERS ~ 2 = 4\nPARIS UA. ~ PARIS XIII E.S.\nStade léo Lagrange\nArbitre centre\nBE 68 © & 6\nDésignations Messages … Évènements Indisponibilit.. Rapports',
    expected: {
      matchNumber: '',
      homeTeam: 'CHANTIERS PARIS U.A.',
      awayTeam: 'PARIS XIII E.S.',
      date: '2026-10-03',
      time: '15:00',
      competition: 'U14 D3 - POULE A - Journée 3',
      referee: '',
    },
  },
];
