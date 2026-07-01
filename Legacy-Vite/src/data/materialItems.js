/** Raw gathering materials (Phase 3 catalog). */

function mat(id, label, type = 'common', icon = '🌿', description = '') {
  return {
    id,
    label,
    category: 'material',
    type,
    description: description || `A ${type} material used in crafting and trade.`,
    icon,
  };
}

export const MATERIAL_ITEMS = [
  mat('grass', 'Grass', 'common', '🌾', 'Common meadow grass, useful as filler and kindling.'),
  mat('rushes', 'Rushes', 'common', '🌾', 'Stabilizing and clarifying river reeds.'),
  mat('flax', 'Flax', 'common', '🪴', 'Tall, reedy, fibrous stems.'),
  mat('willow_bark', 'Willow Bark', 'uncommon', '🌳', 'Numbing bark valued for pain relief.'),
  mat('valerian_root', 'Valerian Root', 'rare', '🌱', 'Calming sedative root touched with mystic repute.'),
  mat('foxglove', 'Foxglove', 'common', '🌸', 'Adrenaline-sharp blooms of the open road.'),
  mat('yarrow', 'Yarrow', 'common', '🌼', 'Staunches bleeding; mystics favor it in rites.'),
  mat('mugwort', 'Mugwort', 'uncommon', '🍃', 'Dreaming herb with psychedelic whispers.'),
  mat('belladonna', 'Belladonna', 'common', '☠️', 'Toxic berries and leaves.'),
  mat('wolfsbane', 'Wolfsbane', 'uncommon', '🌑', 'Paralyzing agent; deadly to lycanthropes.'),
  mat('copper_scrap', 'Copper Scrap', 'common', '🟤', 'Salvaged copper fit for smelting.'),
  mat('tin_scrap', 'Tin Scrap', 'uncommon', '⚪', 'Soft tin scavenged from industry.'),
  mat('clay', 'Clay', 'common', '🧱', 'Workable clay from chalk pits.'),
  mat('lead', 'Lead', 'uncommon', '⬛', 'Heavy lead useful in alloys and seals.'),
  mat('limestone', 'Limestone', 'uncommon', '🪨', 'Pale stone for lime and glasswork.'),
  mat('wrought_iron_ore', 'Wrought Iron Ore', 'rare', '⛏️', 'Iron ore worth the furnace.'),
  mat('silver_ore', 'Silver Ore', 'uncommon', '🥈', 'Ore streaked with silver.'),
  mat('quartz', 'Quartz', 'uncommon', '💠', 'Clear quartz crystals.'),
  mat('lodestone', 'Lodestone', 'rare', '🧲', 'Magnetic stone of rare pull.'),
  mat('raw_gold', 'Raw Gold', 'uncommon', '🟡', 'Unrefined gold from deep delves.'),
  mat('raw_gemstone', 'Raw Gemstone', 'uncommon', '💎', 'Uncut gem rough from the deeps.'),
  mat('bismuth', 'Bismuth', 'rare', '🔮', 'Iridescent bismuth crystal.'),
  mat('quicksilver', 'Quicksilver', 'rare', '☿️', 'Liquid mercury — handle with care.'),
  // BALANCE: provisional — Angling underspecified in design
  mat('river_fish', 'River Fish', 'common', '🐟', 'A modest catch from quiet waters.'),
  mat('eel', 'Eel', 'common', '🐍', 'Slippery eel from the riverbank.'),
];
