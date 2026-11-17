import { expect, it } from 'vitest';
import {
  readNavigation,
  navigationSearch,
  resolveNavigation,
  initialNavigation,
} from '@/lib/navigation';
import { defaultEquipment, upgradeInventory, INVENTORY_CATALOG_VERSION } from '@/domain/equipment';
import { createMatch } from '@/domain/match';
import { templates } from '@/domain/templates';
import { inventorySchema } from '@/server/validation';
import type { Inventory } from '@/domain/types';

const match = () =>
  createMatch(
    {
      homeTeam: 'A',
      awayTeam: 'B',
      practice: 'FOOT_11',
      kickoffAt: '2026-12-01T14:00:00Z',
      timezone: 'Europe/Paris',
    },
    [],
    templates.FOOT_11,
  );
it('round-trips every page and nested view through the URL', () => {
  const m = match();
  m.status = 'COMPLETED';
  m.finishedAt = '2026-12-01T17:00:00Z';
  for (const params of [
    '?page=bag',
    '?page=bag&view=outfits',
    '?page=profile',
    '?page=matches&filter=history',
    `?page=matches&match=${m.id}`,
    `?page=matches&match=${m.id}&view=debrief`,
  ]) {
    const resolved = resolveNavigation(readNavigation(params), [m]);
    expect(resolveNavigation(readNavigation(navigationSearch(resolved)), [m])).toEqual(resolved);
  }
  expect(navigationSearch(initialNavigation)).toBe('');
});
it('rejects unavailable or foreign matches and gives the active tunnel priority', () => {
  expect(
    resolveNavigation(readNavigation('?page=matches&match=foreign&view=debrief'), []).activeId,
  ).toBeNull();
  const m = match();
  expect(resolveNavigation(readNavigation(`?match=${m.id}&view=debrief`), [m]).matchView).toBe(
    'summary',
  );
  m.status = 'ACTIVE';
  const restored = resolveNavigation(readNavigation('?page=bag&view=outfits'), [m]);
  expect(restored).toMatchObject({ activeId: m.id, tab: 'matches', matchView: 'summary' });
  expect(readNavigation('?page=javascript:bad').tab).toBe('home');
});
it('keeps unrelated URL parameters while changing the app page', () => {
  expect(
    navigationSearch(
      { ...initialNavigation, tab: 'bag' },
      '?tracking=yes&page=profile&view=debrief',
    ),
  ).toBe('?tracking=yes&page=bag');
});
it('opens the inventory from retired outfit links and removes the retired view parameter', () => {
  const nav = readNavigation('?page=bag&view=outfits');
  expect(nav.tab).toBe('bag');
  expect(navigationSearch(nav)).toBe('?page=bag');
});
it('provides four shirt colors and two distinct match paperwork items without a blue stock shirt', () => {
  const items = defaultEquipment();
  expect(items).toHaveLength(19);
  expect(items.filter((i) => i.type === 'SHIRT').map((i) => i.colors[0])).toEqual([
    'jaune',
    'rouge',
    'violet',
    'noir',
  ]);
  expect(items.find((i) => i.id === 'match-sheet')?.label).toContain('FMI');
  expect(items.find((i) => i.id === 'match-notes')?.label).toBe('Feuille de notes');
});
const legacy = (): Inventory => ({
  equipment: [
    { id: 'shirt-blue', label: 'Maillot bleu', type: 'SHIRT', colors: ['bleu'] },
    ...defaultEquipment().filter((i) =>
      ['shirt-yellow', 'shorts', 'socks', 'shoes'].includes(i.id),
    ),
    { id: 'my-tool', label: 'Mon matériel personnel', type: 'TOOL', colors: [] },
  ],
  outfits: [
    {
      id: 'kit-blue',
      name: 'La bleue',
      primaryColor: 'bleu',
      itemIds: ['shirt-blue', 'shorts', 'socks', 'shoes'],
    },
  ],
});
it('upgrades existing inventories once, preserving custom items and repairing outfits', () => {
  const old = legacy(),
    before = structuredClone(old),
    next = upgradeInventory(old);
  expect(old).toEqual(before);
  expect(next.catalogVersion).toBe(INVENTORY_CATALOG_VERSION);
  expect(next.equipment.some((i) => i.id === 'shirt-blue')).toBe(false);
  expect(next.equipment.find((i) => i.id === 'my-tool')?.label).toBe('Mon matériel personnel');
  expect(next.outfits[0]).toMatchObject({
    name: 'La noire',
    primaryColor: 'noir',
    itemIds: ['shirt-black', 'shorts', 'socks', 'shoes'],
  });
  expect(inventorySchema.safeParse(next).success).toBe(true);
  const edited = { ...next, equipment: next.equipment.filter((i) => i.id !== 'shirt-red') };
  expect(upgradeInventory(edited)).toBe(edited);
});
it('preserves personalized blue articles and resolves custom stock-id collisions', () => {
  const old = legacy();
  old.equipment[0].photoId = crypto.randomUUID();
  old.equipment.push({ id: 'shirt-black', label: 'Objet personnel', type: 'TOOL', colors: [] });
  const next = upgradeInventory(old);
  expect(next.equipment.find((i) => i.id === 'shirt-blue')?.photoId).toBe(old.equipment[0].photoId);
  expect(next.equipment.find((i) => i.id === 'shirt-black')?.label).toBe('Objet personnel');
  expect(next.equipment.some((i) => i.type === 'SHIRT' && i.colors[0] === 'noir')).toBe(true);
  expect(new Set(next.equipment.map((i) => i.id)).size).toBe(next.equipment.length);
});

it('preserves custom outfit identity while repairing references to the removed stock garment', () => {
  const old = legacy();
  old.outfits[0].name = 'Ma tenue de coupe';
  const next = upgradeInventory(old);
  expect(next.outfits[0]).toMatchObject({
    id: 'kit-blue',
    name: 'Ma tenue de coupe',
    primaryColor: 'noir',
    itemIds: ['shirt-black', 'shorts', 'socks', 'shoes'],
  });
});
it('adds the actual paperwork even when a custom tool uses the same reserved identifier', () => {
  const old = legacy();
  old.equipment.push({ id: 'match-sheet', label: 'Outil personnel', type: 'TOOL', colors: [] });
  const next = upgradeInventory(old);
  expect(next.equipment.find((i) => i.id === 'match-sheet')?.label).toBe('Outil personnel');
  expect(next.equipment.some((i) => i.label === 'Feuille de match papier (remplace la FMI)')).toBe(
    true,
  );
});

it('reserves catalog migration headroom without persisting inventories that cannot be saved again', () => {
  const old: Inventory = {
    equipment: Array.from({ length: 1000 }, (_, i) => ({
      id: `custom-${i}`,
      label: `Outil ${i}`,
      type: 'TOOL',
      colors: [],
    })),
    outfits: [],
  };
  expect(inventorySchema.safeParse(old).success).toBe(true);
  const next = upgradeInventory(old);
  expect(next.equipment).toHaveLength(1006);
  expect(inventorySchema.safeParse(next).success).toBe(true);
  const tooLarge = {
    ...old,
    equipment: [...old.equipment, { id: 'one-too-many', label: 'Trop', type: 'TOOL', colors: [] }],
  };
  expect(inventorySchema.safeParse(tooLarge).success).toBe(false);
});
