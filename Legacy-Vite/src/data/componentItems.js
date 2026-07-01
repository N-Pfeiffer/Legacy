/** Tier-2 crafted components. */

function comp(id, label, type = 'common', icon = '⚗️', description = '', opts = {}) {
  return {
    id,
    label,
    category: 'component',
    type,
    description: description || 'A crafted component used in further recipes.',
    icon,
    ...opts,
  };
}

export const COMPONENT_ITEMS = [
  comp('apothecarys_solvent', "Apothecary's Solvent", 'common', '⚗️', 'A clarifying base for alchemical work.'),
  comp('analgesic_extract', 'Analgesic Extract', 'uncommon', '💧', 'Numbing extract for pain and poultices.'),
  comp('yarrow_tincture', 'Yarrow Tincture', 'uncommon', '🌼', 'Tincture of yarrow for staunching and mixing.'),
  comp('neurotoxin_alkaloid', 'Neurotoxin Alkaloid', 'rare', '☠️', 'Potent alkaloid distilled from deadly herbs.'),
  comp('bronze', 'Bronze', 'common', '🟫', 'Smelted bronze ingot.'),
  comp('iron', 'Iron', 'common', '⬛', 'Wrought iron stock.'),
  comp('vessel', 'Vessel', 'common', '🏺', 'A simple fired clay vessel.'),
  comp('glass', 'Glass', 'uncommon', '🪟', 'Clear glass pane.'),
  comp('steel', 'Steel', 'uncommon', '⚙️', 'Hardened steel stock.'),
  comp('silver', 'Silver', 'uncommon', '🥈', 'Refined silver ingot.', { silver: true }),
  comp('gold', 'Gold', 'rare', '🟡', 'Refined gold ingot.'),
  comp('liquid_silver', 'Liquid Silver', 'rare', '☿️', 'Quicksilver alloy for mystic crafts.', { silver: true }),
  comp('polished_bismuth', 'Polished Bismuth', 'rare', '🔮', 'Polished bismuth crystal.'),
  comp('polished_gem', 'Polished Gem', 'rare', '💎', 'A cut and polished gemstone.'),
  comp('jewel_setting', 'Jewel Setting', 'uncommon', '💍', 'A mount ready to receive a stone.'),
  comp('cured_leather', 'Cured Leather', 'common', '🧥', 'Treated hide fit for armor.'),
  comp('thick_hide', 'Thick Hide', 'uncommon', '🧥', 'Dense hide from larger game.'),
  comp('pristine_leather', 'Pristine Leather', 'rare', '🧥', 'Flawless leather of exceptional quality.'),
  comp('bone_meal', 'Bone Meal', 'common', '🦴', 'Ground bone for crafts and rites.'),
  comp('bone_fasteners', 'Bone Fasteners', 'common', '📎', 'Carved bone pins and toggles.'),
  comp('insulating_down', 'Insulating Down', 'common', '🪶', 'Packed down for lining and insulation.'),
  comp('parchment', 'Parchment', 'uncommon', '📜', 'Fine parchment sheet.'),
  comp('linen_thread', 'Linen Thread', 'common', '🧵', 'Spun flax thread.'),
  comp('wool_yarn', 'Wool Yarn', 'common', '🧶', 'Spun wool yarn.'),
  comp('buckles', 'Buckles', 'common', '🔗', 'Iron buckles for straps and belts.'),
  comp('leather_straps', 'Leather Straps', 'common', '🎗️', 'Cut leather straps.'),
  comp('bone_needle', 'Bone Needle', 'common', '🪡', 'A sturdy needle carved from bone.'),
  comp('candles', 'Candles', 'common', '🕯️', 'Tallow candles for light and rites.'),
];
