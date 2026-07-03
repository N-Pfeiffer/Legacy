/** Item catalog — same entries for mortals and vampires; vampire-only use text is hidden until Embrace. */

import { COMPONENT_ITEMS } from './componentItems.js';
import { CRAFT_CONSUMABLE_ITEMS } from './craftConsumableItems.js';
import { CRAFT_EQUIPMENT_ITEMS } from './craftEquipmentItems.js';
import { SCHOLARSHIP_ITEMS } from './scholarshipItems.js';
import { HUNTING_MATERIAL_ITEMS } from './huntingMaterialItems.js';
import { MATERIAL_ITEMS } from './materialItems.js';

export const ITEM_TYPES = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  unique: 'Unique',
};

/** @typedef {'equipment'|'material'|'component'|'consumable'} ItemCategory */

export const ITEM_CATEGORIES = {
  equipment: 'Equipment',
  material: 'Materials',
  component: 'Components',
  consumable: 'Consumables',
};

export const ITEMS = [
  {
    id: 'ominous_relic',
    label: 'Ominous Relic',
    category: 'equipment',
    slot: 'artifact',
    type: 'rare',
    effectSummary: '+2 Insight',
    whileEquipped: { insight: 2 },
    description:
      "A heavy, jagged heirloom of unrecognizable black stone. It's unnaturally cold at all times.",
    vampireUse: 'Can study to uncover an artifact.',
    icon: '◆',
  },
  {
    id: 'mysterious_relic',
    label: 'Mysterious Relic',
    category: 'equipment',
    slot: 'artifact',
    type: 'common',
    effectSummary: '+1 Insight',
    whileEquipped: { insight: 1 },
    description: 'A mysterious relic of the ancient past.',
    vampireUse: 'Can study to uncover an artifact.',
    icon: '◆',
  },
  {
    id: 'artifact',
    label: 'Artifact',
    category: 'equipment',
    slot: 'artifact',
    type: 'uncommon',
    effectSummary: '+2 Insight',
    whileEquipped: { insight: 2 },
    description: 'Artifacts of deeper lore discovered from mysterious relics.',
    vampireUse: 'Required to improve some disciplines, in goals, and in crafting.',
    icon: '⚱',
  },
  {
    id: 'mudlarks_lockbox',
    label: "Mudlark's Lockbox",
    category: 'consumable',
    uniqueItem: true,
    uniqueOnly: true,
    type: 'unique',
    decisionId: 'open_mudlarks_lockbox',
    description:
      'A heavy, rusted iron lockbox recovered from the Thames at low tide. The locking mechanism is seized by river mud and time. It rattles slightly when shaken.',
    vampireUse: null,
    icon: '🔒',
  },
  {
    id: 'sovereign',
    label: 'Sovereign',
    category: 'material',
    type: 'unique',
    uniqueItem: true,
    description: 'A gold Sovereign with the face of King George on it. Worth £1',
    vampireUse: null,
    icon: '👛',
  },
  {
    id: 'skinny_dagger',
    label: 'Skinny Dagger',
    category: 'equipment',
    slot: 'mainHand',
    type: 'common',
    effectSummary: '+2 Melee Damage',
    whileEquipped: { meleeDamage: 2 },
    description:
      'A thin, dull blade that wiggles in its loose wooden handle.',
    vampireUse: null,
    icon: '🗡',
  },
  {
    id: 'rapier',
    label: 'Rapier',
    category: 'equipment',
    slot: 'mainHand',
    type: 'uncommon',
    effectSummary: '+4 Prowess',
    whileEquipped: { prowess: 4 },
    description:
      'A finely balanced, elegant blade favored by duelists. It demands precision over brute strength, making it lethal in a trained hand.',
    vampireUse: null,
    icon: '⚔',
  },
  {
    id: 'single_shot_flintlock',
    label: 'Single Shot Flintlock',
    category: 'equipment',
    slot: 'mainHand',
    type: 'uncommon',
    effectSummary: '+3 Prowess (one shot)',
    whileEquipped: { prowess: 3 },
    singleUse: true,
    useNote:
      'One shot only. When fired, the pistol breaks and is removed from your possessions.',
    description:
      "A heavy pistol that packs a devastating punch, provided the omnipresent London damp hasn't fouled the powder. Its accuracy is notoriously unreliable past a few paces. It carries but a single ball and charge — once fired, the mechanism warps and the piece is ruined.",
    vampireUse: null,
    icon: '🔫',
  },
  {
    id: 'hidden_sword_cane',
    label: 'Hidden Sword Cane',
    category: 'equipment',
    slot: 'mainHand',
    type: 'uncommon',
    effectSummary: '+2 Prowess, +1 Charisma',
    whileEquipped: { prowess: 2, charisma: 1 },
    description:
      'A distinguished malacca walking cane that conceals a length of sharpened steel. Perfect for the gentleman who expects trouble but respects appearances.',
    vampireUse: null,
    icon: '🦯',
  },
  {
    id: 'peasants_longbow',
    label: "Peasant's Longbow",
    category: 'equipment',
    slot: 'mainHand',
    twoHanded: true,
    type: 'common',
    effectSummary: '+3 Prowess',
    whileEquipped: { prowess: 3 },
    description:
      'A rough-hewn yew bow, functional but crude. It requires significant strength to draw and lacks the polished balance of aristocratic sporting models.',
    vampireUse: null,
    icon: '🏹',
  },
  {
    id: 'nobles_longbow',
    label: "Noble's Longbow",
    category: 'equipment',
    slot: 'mainHand',
    twoHanded: true,
    type: 'rare',
    effectSummary: '+5 Prowess',
    whileEquipped: { prowess: 5 },
    description:
      'A masterpiece of tension and lacquered wood crafted for Toxophilite societies. It strikes with lethal, silent precision from frightening range.',
    vampireUse: null,
    icon: '🏹',
  },
  ...MATERIAL_ITEMS,
  ...HUNTING_MATERIAL_ITEMS,
  ...COMPONENT_ITEMS,
  ...CRAFT_CONSUMABLE_ITEMS,
  ...CRAFT_EQUIPMENT_ITEMS,
  ...SCHOLARSHIP_ITEMS,
].map((item) => ({
  ...item,
  art: item.art ?? (['material', 'component', 'consumable'].includes(item.category)
    ? { kind: 'emoji', glyph: item.icon || '🌿' }
    : { kind: 'svg', ref: `item-${item.id}` }),
}));

export const ITEMS_BY_ID = Object.fromEntries(ITEMS.map((item) => [item.id, item]));

/** Equipment in the main-hand / two-handed sense (legacy name kept for callers). */
export const WEAPON_ITEMS = ITEMS.filter(
  (item) => item.category === 'equipment' && item.slot === 'mainHand',
);

export function itemTypeLabel(typeKey) {
  return ITEM_TYPES[typeKey] || typeKey;
}

export function itemsByCategory(category) {
  return ITEMS.filter((item) => item.category === category);
}

/** Stat modifiers for an item whether catalog uses whileEquipped or legacy whileOwned. */
export function itemStatMods(item) {
  if (!item) return null;
  return item.whileEquipped ?? item.whileOwned ?? null;
}

/** Which inventory store receives a granted item id. */
export function itemInventoryStore(itemId) {
  const item = ITEMS_BY_ID[itemId];
  if (!item) return null;
  if (item.category === 'equipment') return 'equipment';
  if (item.category === 'material' || item.category === 'component' || item.category === 'consumable') {
    return 'material';
  }
  return null;
}

export function slotForItem(itemId) {
  return ITEMS_BY_ID[itemId]?.slot ?? null;
}
