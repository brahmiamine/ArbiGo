/** Charte FFF : bleu 0/50/135, rouge 230/0/40, or 190/150/90. */
export const PDF_COLORS = {
  blue: [0, 50, 135],
  red: [230, 0, 40],
  gold: [190, 150, 90],
  text: [26, 26, 26],
  muted: [100, 108, 120],
  line: [226, 230, 236],
  white: [255, 255, 255],
};

export const PAGE = {
  width: 210,
  height: 297,
  marginX: 16,
  headerBottom: 42,
  footerRuleY: 11,
  footerTextY: 7,
  contentBottom: 16,
};

export const FONT = {
  family: 'helvetica',
  label: 9,
  body: 9,
  small: 8.5,
  title: 9.5,
  header: 13,
  headerSmall: 7.5,
  footer: 7,
};

/** Logos d'en-tête : hauteur commune, largeurs déduites des ratios réels (FFF 1:1, District 192x256). */
export const LOGO = { top: 13, height: 14, fffWidth: 14, districtWidth: 10.5 };

export const LINE_HEIGHT = 4.3;
export const SPACING = { label: 5.2, paragraph: 5, section: 8 };
