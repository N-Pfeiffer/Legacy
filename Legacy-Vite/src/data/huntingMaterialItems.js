/** Hunting-derived materials (drops in Phase 7; catalog for crafting recipes now). */

function mat(id, label, type = 'common', icon = '🦴', description = '') {
  return {
    id,
    label,
    category: 'material',
    type,
    description: description || `A ${type} material from the hunt.`,
    icon,
  };
}

export const HUNTING_MATERIAL_ITEMS = [
  mat('simple_pelt', 'Simple Pelt', 'common', '🦌'),
  mat('fine_pelt', 'Fine Pelt', 'uncommon', '🦌'),
  mat('exceptional_pelt', 'Exceptional Pelt', 'rare', '🦌'),
  mat('legendary_white_pelt', 'Legendary White Pelt', 'unique', '🦌'),
  mat('legendary_wolf_pelt', 'Legendary Wolf Pelt', 'unique', '🐺'),
  mat('bone', 'Bone', 'common', '🦴'),
  mat('raw_wool', 'Raw Wool', 'common', '🧶'),
  mat('feather', 'Feather', 'common', '🪶'),
  mat('badger_claw', 'Badger Claw', 'uncommon', '🐾'),
  mat('tusk', 'Tusk', 'uncommon', '🦷'),
  mat('animal_heart', 'Animal Heart', 'uncommon', '❤️'),
  mat('great_animal_heart', 'Great Animal Heart', 'rare', '❤️'),
  mat('human_heart', 'Human Heart', 'rare', '🖤'),
  mat('lycanthrope_heart', 'Lycanthrope Heart', 'rare', '🖤'),
  mat('bear_fat', 'Bear Fat', 'uncommon', '🧈'),
  mat('werewolf_fang', 'Werewolf Fang', 'rare', '🦷'),
  mat('blank_vellum', 'Blank Vellum', 'common', '📜', 'Empty vellum sheets for scribes.'),
];
