/** Equipment produced by crafting hobbies. */

function equip(id, label, slot, type, whileEquipped, description, opts = {}) {
  return {
    id,
    label,
    category: 'equipment',
    slot,
    type,
    description,
    effectSummary: opts.effectSummary || '',
    whileEquipped,
    icon: opts.icon || '⚔️',
    ...opts,
  };
}

export const CRAFT_EQUIPMENT_ITEMS = [
  equip(
    'ornate_cane',
    'Ornate Cane',
    'mainHand',
    'uncommon',
    { prowess: 2, charisma: 1 },
    'A gentleman’s cane with a concealed blade.',
    { effectSummary: '+2 Prowess, +1 Charisma', icon: '🦯' },
  ),
  equip(
    'noble_signet_ring',
    'Noble Signet Ring',
    'jewelry',
    'rare',
    { charisma: 1 },
    'A signet ring bearing a noble house seal.',
    { effectSummary: '+1 Charisma', icon: '💍' },
  ),
  equip(
    'telescope',
    'Telescope',
    'artifact',
    'rare',
    { insight: 1 },
    'A finely ground lens tube for reading the heavens.',
    { effectSummary: '+1 Insight', icon: '🔭' },
  ),
  equip(
    'bismuth_aegis_ring',
    'Bismuth Aegis Ring',
    'jewelry',
    'rare',
    { insight: 1 },
    'A bismuth ring said to turn ill fortune.',
    { effectSummary: '+1 Insight', icon: '💍' },
  ),
  equip(
    'bloodstone_amulet',
    'Bloodstone Amulet',
    'jewelry',
    'unique',
    { insight: 2 },
    'An amulet bound with vital essence.',
    { effectSummary: '+2 Insight', icon: '📿' },
  ),
  equip(
    'leather_armor',
    'Leather Armor',
    'body',
    'uncommon',
    { prowess: 1, health: 1 },
    'Sturdy cured-leather armor.',
    { effectSummary: '+1 Prowess, +1 Health', icon: '🧥' },
  ),
  equip(
    'footpads_cloak',
    "Footpad's Cloak",
    'back',
    'uncommon',
    { charisma: 1 },
    'A dark wool cloak favored by those who slip unseen.',
    { effectSummary: '+1 Charisma', icon: '🧣' },
  ),
];
