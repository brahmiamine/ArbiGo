import type { BagItem, Equipment, KitColors, Outfit, Match, Inventory } from './types';
export function defaultEquipment(): Equipment[] {
  return [
    ['shirt-yellow', 'Maillot jaune', 'SHIRT', 'jaune'],
    ['shirt-red', 'Maillot rouge', 'SHIRT', 'rouge'],
    ['shirt-purple', 'Maillot violet', 'SHIRT', 'violet'],
    ['shirt-black', 'Maillot noir', 'SHIRT', 'noir'],
    ['shorts', 'Short noir', 'SHORTS', 'noir'],
    ['socks', 'Chaussettes noires', 'SOCKS', 'noir'],
    ['shoes', 'Chaussures de terrain', 'SHOES', 'noir'],
    ['match-sheet', 'Feuille de match papier (remplace la FMI)', 'TOOL', ''],
    ['match-notes', 'Feuille de notes (cartons, buts, incidents)', 'TOOL', ''],
    ['badge', 'Écusson', 'TOOL', ''],
    ['watch', 'Montre / chronomètre', 'TOOL', ''],
    ['whistle', 'Sifflet et sifflet de secours', 'TOOL', ''],
    ['cards', 'Cartons et carnet', 'TOOL', ''],
    ['pens', 'Stylos', 'TOOL', ''],
    ['coin', 'Pièce de tirage au sort', 'TOOL', ''],
    ['warmup-kit', 'Tenue d’échauffement', 'OTHER', ''],
    ['shower', 'Affaires de douche', 'OTHER', ''],
    ['flags', 'Drapeaux (selon la rencontre)', 'TOOL', ''],
    ['gloves', 'Gants (selon les conditions)', 'OTHER', ''],
  ].map(([id, label, type, color]) => ({
    id,
    label,
    type: type as Equipment['type'],
    colors: color ? [color] : [],
    active: true,
  }));
}
export const INVENTORY_CATALOG_VERSION = 2;
/** One-time update of stock suggestions; personal articles and archived match bags stay independent. */
export function upgradeInventory(inventory: Inventory): Inventory {
  if ((inventory.catalogVersion ?? 0) >= INVENTORY_CATALOG_VERSION) return inventory;
  const blue = inventory.equipment.find(
    (i) =>
      i.id === 'shirt-blue' &&
      i.type === 'SHIRT' &&
      i.label === 'Maillot bleu' &&
      i.colors.length === 1 &&
      i.colors[0] === 'bleu' &&
      !i.photoId,
  );
  const equipment = inventory.equipment.filter((i) => i !== blue).map((i) => structuredClone(i));
  for (const item of defaultEquipment().filter((i) =>
    [
      'shirt-yellow',
      'shirt-red',
      'shirt-purple',
      'shirt-black',
      'match-sheet',
      'match-notes',
    ].includes(i.id),
  )) {
    const exists = equipment.some((i) =>
      item.type === 'SHIRT'
        ? i.type === 'SHIRT' && i.colors[0] === item.colors[0]
        : i.type === item.type && i.label === item.label,
    );
    if (!exists) {
      let id = item.id;
      let suffix = 2;
      while (equipment.some((i) => i.id === id)) id = `${item.id}-catalog-${suffix++}`;
      equipment.push({ ...item, id });
    }
  }

  const black = equipment.find((i) => i.type === 'SHIRT' && i.colors[0] === 'noir')!;
  return {
    ...inventory,
    catalogVersion: INVENTORY_CATALOG_VERSION,
    equipment,
    outfits: inventory.outfits.map((o) =>
      blue && o.itemIds.includes(blue.id)
        ? {
            ...o,
            itemIds: o.itemIds.map((id) => (id === blue.id ? black.id : id)),
            primaryColor: 'noir',
            secondaryColor: o.secondaryColor === 'noir' ? undefined : o.secondaryColor,
            name: o.name === 'La bleue' ? 'La noire' : o.name,
          }
        : structuredClone(o),
    ),
  };
}
const family: Record<string, string> = {
  bleu: 'blue',
  marine: 'blue',
  turquoise: 'blue',
  rouge: 'red',
  bordeaux: 'red',
  rose: 'red',
  jaune: 'yellow',
  or: 'yellow',
  orange: 'yellow',
  vert: 'green',
  noir: 'black',
  gris: 'black',
  blanc: 'white',
  violet: 'purple',
};
export const palette: Record<string, string> = {
  bleu: '#003287',
  marine: '#172841',
  rouge: '#E60028',
  bordeaux: '#7c233f',
  rose: '#e886b2',
  jaune: '#f2d429',
  orange: '#ed8832',
  vert: '#31a77b',
  noir: '#182126',
  gris: '#89939b',
  blanc: '#ffffff',
  violet: '#7d59ac',
  turquoise: '#20acb8',
};
export function rankOutfits(outfits: Outfit[], bag: BagItem[], colors: KitColors) {
  const packed = new Set(bag.filter((i) => i.packed).map((i) => i.id));
  const opponents = Object.values(colors)
    .flat()
    .map((c) => c.toLowerCase().trim());
  return outfits
    .filter((o) => o.itemIds.length > 0 && o.itemIds.every((id) => packed.has(id)))
    .map((outfit) => {
      const mine = [outfit.primaryColor, outfit.secondaryColor]
        .filter(Boolean)
        .map((c) => c!.toLowerCase().trim());
      const exact = mine.find((c) => opponents.includes(c));
      const near = mine.find((c) =>
        opponents.some((opp) => family[c] && family[c] === family[opp]),
      );
      const complete =
        !!outfit.primaryColor.trim() &&
        Object.values(colors).every((v) => v.length > 0) &&
        mine.every((c) => family[c]) &&
        opponents.every((c) => family[c]);
      return {
        ...outfit,
        rating: exact
          ? ('AVOID' as const)
          : near || !complete
            ? ('CHECK' as const)
            : ('RECOMMENDED' as const),
        reason: exact
          ? `Conflit de couleur : ${exact}`
          : near
            ? `Teintes proches : ${near}`
            : !complete
              ? 'Couleurs incomplètes ou à préciser'
              : 'Aucun conflit évident dans les couleurs déclarées ; à confirmer visuellement.',
      };
    })
    .sort(
      (a, b) =>
        ({ RECOMMENDED: 0, CHECK: 1, AVOID: 2 })[a.rating] -
        { RECOMMENDED: 0, CHECK: 1, AVOID: 2 }[b.rating],
    );
}
export function previousTeamColors(matches: Match[], current: Match): Partial<KitColors> {
  const normalize = (team: string) => team.trim().toLocaleLowerCase('fr');
  const history = matches
    .filter((m) => m.id !== current.id && m.colorsConfirmedAt)
    .sort((a, b) => b.colorsConfirmedAt!.localeCompare(a.colorsConfirmedAt!));
  const result: Partial<KitColors> = {};
  for (const [team, players, keeper] of [
    [current.homeTeam, 'home', 'homeKeeper'],
    [current.awayTeam, 'away', 'awayKeeper'],
  ] as const) {
    const previous = history.find((m) =>
      [m.homeTeam, m.awayTeam].some((t) => normalize(t) === normalize(team)),
    );
    if (!previous) continue;
    const home = normalize(previous.homeTeam) === normalize(team);
    result[players] = [...previous.colors[home ? 'home' : 'away']];
    result[keeper] = [...previous.colors[home ? 'homeKeeper' : 'awayKeeper']];
  }
  return result;
}

/** Compare real shirts in this match bag, including keeper and secondary colors. */
export function rankMatchShirts(m: Pick<Match, 'bag' | 'colors'>) {
  const shirts = m.bag.filter((i) => i.type === 'SHIRT');
  const ranked = rankOutfits(
    shirts.map((i) => ({
      id: i.id,
      name: i.label,
      itemIds: [i.id],
      primaryColor: i.colors[0] ?? '',
      secondaryColor: i.colors[1],
    })),
    shirts.map((i) => ({ ...i, packed: true })),
    m.colors,
  );
  const order = { RECOMMENDED: 0, CHECK: 1, AVOID: 2 };
  return ranked
    .map((o) => ({ ...o, item: shirts.find((i) => i.id === o.id)! }))
    .sort(
      (a, b) => order[a.rating] - order[b.rating] || Number(b.item.packed) - Number(a.item.packed),
    );
}
