/**
 * Crafting recipes — Alchemy, Metallurgy, Artificing, Tailoring, Scholarship.
 * Omitted: Wolfsbane Poison, Blood Vial craft.
 */

function r(id, hobbyId, outputs, inputs, opts = {}) {
  return {
    id,
    hobbyId,
    outputs,
    inputs,
    skillReq: opts.skillReq ?? 0,
    apCost: opts.apCost ?? 1, // BALANCE: provisional
    skillGain: opts.skillGain ?? 0.5, // BALANCE: provisional
    extraSkillReqs: opts.extraSkillReqs ?? [],
    label: opts.label,
    requiresItem: opts.requiresItem,
    outputRoll: opts.outputRoll,
  };
}
const inp = (id, n = 1) => ({ id, n });
const oneOf = (...options) => ({ oneOf: options.map((o) => (typeof o === 'string' ? inp(o) : o)) });

export const RECIPES = [
  // —— Alchemy ——
  r('apothecarys_solvent', 'alchemy', [inp('apothecarys_solvent')], [inp('rushes', 4)]),
  r('analgesic_extract', 'alchemy', [inp('analgesic_extract')], [inp('willow_bark'), inp('apothecarys_solvent')]),
  r('yarrow_tincture', 'alchemy', [inp('yarrow_tincture')], [inp('yarrow'), inp('apothecarys_solvent')]),
  r('neurotoxin_alkaloid', 'alchemy', [inp('neurotoxin_alkaloid')], [
    inp('belladonna'),
    inp('wolfsbane'),
    inp('apothecarys_solvent'),
  ]),
  r('oneiric_resin', 'alchemy', [inp('oneiric_resin')], [inp('mugwort', 2), inp('apothecarys_solvent')]),
  r('elixir_of_comprehension', 'alchemy', [inp('elixir_of_comprehension')], [
    inp('mugwort'),
    inp('valerian_root'),
    inp('yarrow_tincture'),
    inp('liquid_silver'),
  ]),
  r('stalkers_brew', 'alchemy', [inp('stalkers_brew')], [
    inp('werewolf_fang'),
    inp('great_animal_heart'),
    inp('apothecarys_solvent'),
  ]),

  // —— Metallurgy ——
  r('bronze', 'metallurgy', [inp('bronze')], [inp('copper_scrap'), inp('tin_scrap')]),
  r('iron', 'metallurgy', [inp('iron')], [inp('wrought_iron_ore', 2)]),
  r('vessel', 'metallurgy', [inp('vessel')], [inp('clay', 2)]),
  r('glass', 'metallurgy', [inp('glass')], [inp('quartz'), inp('limestone')]),
  // BALANCE: provisional — Steel uses Apothecary's Solvent per design resolution
  r('steel', 'metallurgy', [inp('steel')], [inp('wrought_iron_ore'), inp('apothecarys_solvent')]),
  r('silver', 'metallurgy', [inp('silver')], [inp('silver_ore', 2)]),
  r('gold', 'metallurgy', [inp('gold')], [inp('raw_gold', 2)]),
  r('liquid_silver', 'metallurgy', [inp('liquid_silver')], [inp('silver'), inp('quicksilver')]),
  r('polished_bismuth', 'metallurgy', [inp('polished_bismuth')], [inp('bismuth', 2)]),

  // —— Artificing ——
  r('polished_gem', 'artificing', [inp('polished_gem')], [inp('raw_gemstone'), inp('bone_meal')]),
  r('jewel_setting', 'artificing', [inp('jewel_setting')], [oneOf('gold', 'silver')]),
  r('ornate_cane', 'artificing', [inp('ornate_cane')], [inp('iron', 2), inp('tusk')], { skillReq: 30 }),
  r('noble_signet_ring', 'artificing', [inp('noble_signet_ring')], [
    inp('jewel_setting'),
    inp('polished_gem'),
  ], { skillReq: 35 }),
  r('telescope', 'artificing', [inp('telescope')], [inp('glass'), inp('steel')], { skillReq: 40 }),
  r('bismuth_aegis_ring', 'artificing', [inp('bismuth_aegis_ring')], [
    inp('jewel_setting'),
    inp('polished_bismuth'),
    inp('polished_gem'),
  ], { skillReq: 50 }),
  r('bloodstone_amulet', 'artificing', [inp('bloodstone_amulet')], [
    inp('jewel_setting'),
    oneOf('great_animal_heart', 'human_heart'),
    inp('steel'),
  ], {
    skillReq: 50,
    extraSkillReqs: [{ skill: 'mysticism', level: 50 }],
  }),

  // —— Tailoring (includes hunting-derived component processing) ——
  r('cured_leather', 'tailoring', [inp('cured_leather')], [inp('simple_pelt', 2)]),
  r('thick_hide', 'tailoring', [inp('thick_hide')], [inp('fine_pelt', 2)]),
  r('pristine_leather', 'tailoring', [inp('pristine_leather')], [inp('exceptional_pelt', 2)]),
  r('bone_meal', 'tailoring', [inp('bone_meal')], [inp('bone', 2)]),
  r('bone_fasteners', 'tailoring', [inp('bone_fasteners')], [inp('bone')]),
  r('insulating_down', 'tailoring', [inp('insulating_down')], [inp('feather', 2)]),
  r('parchment', 'tailoring', [inp('parchment')], [inp('fine_pelt'), inp('limestone'), inp('bone_meal')]),
  r('linen_thread', 'tailoring', [inp('linen_thread')], [inp('flax')]),
  r('wool_yarn', 'tailoring', [inp('wool_yarn')], [inp('raw_wool')]),
  r('buckles', 'tailoring', [inp('buckles')], [inp('iron')]),
  r('leather_straps', 'tailoring', [inp('leather_straps')], [inp('cured_leather')]),
  r('bone_needle', 'tailoring', [inp('bone_needle')], [inp('bone')]),
  r('leather_armor', 'tailoring', [inp('leather_armor')], [
    inp('cured_leather', 3),
    inp('leather_straps', 2),
    inp('linen_thread'),
  ]),
  r('footpads_cloak', 'tailoring', [inp('footpads_cloak')], [inp('wool_yarn', 2), inp('leather_straps')]),

  // —— Scholarship ——
  r('notes', 'scholarship', [inp('notes')], [inp('blank_vellum')]),
  r('study_mysterious_relic', 'scholarship', [], [], {
    label: 'Study Mysterious Relic',
    requiresItem: 'mysterious_relic',
    outputRoll: 'mysterious_study',
  }),
  r('study_ominous_relic', 'scholarship', [], [], {
    label: 'Study Ominous Relic',
    skillReq: 75,
    requiresItem: 'ominous_relic',
    outputRoll: 'ominous_study',
  }),
  r('translate_tome', 'scholarship', [inp('translated_tome')], [inp('notes'), inp('foreign_tome')], {
    skillReq: 25,
    label: 'Translate Tome',
  }),
  r('create_tome', 'scholarship', [inp('scholars_tome')], [inp('blank_vellum', 5), inp('notes')], {
    skillReq: 50,
    label: 'Create Tome',
  }),
  r('candles', 'scholarship', [inp('candles')], [inp('bear_fat')]),
];

export const RECIPES_BY_ID = Object.fromEntries(RECIPES.map((recipe) => [recipe.id, recipe]));

export function recipesForHobby(hobbyId) {
  return RECIPES.filter((recipe) => recipe.hobbyId === hobbyId);
}
