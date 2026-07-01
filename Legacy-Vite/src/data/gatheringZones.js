/** Gathering zone tables — Botany, Metallurgy, Angling. */

export const GATHERING_ZONES = [
  {
    hobbyId: 'botany',
    gatherVerb: 'foraged',
    actionLabel: 'Forage',
    skillGain: 0.5, // BALANCE: provisional
    zones: [
      {
        id: 'the_thames',
        label: 'The Thames',
        apCost: 1,
        skillReq: 0,
        flavor: 'Marshes and riverbanks along the Thames.',
        art: { kind: 'svg', ref: 'zone-the_thames' },
        theme: 'thames',
        drops: [
          { id: 'rushes', rarity: 'common' },
          { id: 'flax', rarity: 'common' },
          { id: 'willow_bark', rarity: 'uncommon' },
          { id: 'valerian_root', rarity: 'rare' },
          { id: 'grass', rarity: 'common' },
        ],
      },
      {
        id: 'the_outlands',
        label: 'The Outlands',
        apCost: 2,
        skillReq: 0, // BALANCE: provisional — design unspecified
        flavor: 'Roadways, plains, and lonely trails.',
        art: { kind: 'svg', ref: 'zone-the_outlands' },
        theme: 'outlands',
        drops: [
          { id: 'foxglove', rarity: 'common' },
          { id: 'yarrow', rarity: 'common' },
          { id: 'mugwort', rarity: 'uncommon' },
        ],
      },
      {
        id: 'the_deep_forest',
        label: 'The Deep Forest',
        apCost: 3,
        skillReq: 0, // BALANCE: provisional — design unspecified
        flavor: 'Dense, dark woodland far from London.',
        art: { kind: 'svg', ref: 'zone-the_deep_forest' },
        theme: 'deep_forest',
        drops: [
          { id: 'belladonna', rarity: 'common' },
          { id: 'wolfsbane', rarity: 'uncommon' },
        ],
      },
    ],
  },
  {
    hobbyId: 'metallurgy',
    gatherVerb: 'scavenged',
    actionLabel: 'Gather',
    skillGain: 0.5,
    zones: [
      {
        id: 'industrial_scrapyards',
        label: 'Industrial Scrapyards',
        apCost: 1,
        skillReq: 0,
        flavor: 'Soot, scrap, and the clangor of industry.',
        art: { kind: 'svg', ref: 'zone-industrial_scrapyards' },
        theme: 'scrapyards',
        drops: [
          { id: 'copper_scrap', rarity: 'common' },
          { id: 'tin_scrap', rarity: 'uncommon' },
        ],
      },
      {
        id: 'chalk_clay_pits',
        label: 'Chalk & Clay Pits',
        apCost: 1,
        skillReq: 25,
        flavor: 'Open pits of chalk and workable clay.',
        art: { kind: 'svg', ref: 'zone-chalk_clay_pits' },
        theme: 'chalk_clay',
        drops: [
          { id: 'clay', rarity: 'common' },
          { id: 'lead', rarity: 'uncommon' },
          { id: 'limestone', rarity: 'uncommon' },
          { id: 'wrought_iron_ore', rarity: 'rare' },
        ],
      },
      {
        id: 'the_weald',
        label: 'The Weald',
        apCost: 2,
        skillReq: 50,
        flavor: 'Ancient forest iron and hidden veins.',
        art: { kind: 'svg', ref: 'zone-the_weald' },
        theme: 'weald',
        drops: [
          { id: 'wrought_iron_ore', rarity: 'common' },
          { id: 'silver_ore', rarity: 'uncommon' },
          { id: 'quartz', rarity: 'uncommon' },
          { id: 'lodestone', rarity: 'rare' },
        ],
      },
      {
        id: 'the_cornwall_deeps',
        label: 'The Cornwall Deeps',
        apCost: 4,
        skillReq: 75,
        flavor: 'Cold slate quarries and primordial depth.',
        art: { kind: 'svg', ref: 'zone-the_cornwall_deeps' },
        theme: 'cornwall_deeps',
        drops: [
          { id: 'raw_gold', rarity: 'uncommon' },
          { id: 'raw_gemstone', rarity: 'uncommon' },
          { id: 'bismuth', rarity: 'rare' },
          { id: 'quicksilver', rarity: 'rare' },
        ],
      },
    ],
  },
  {
    hobbyId: 'angling',
    gatherVerb: 'fished',
    actionLabel: 'Fish',
    skillGain: 0.5,
    zones: [
      {
        id: 'the_riverbank',
        label: 'The Riverbank',
        apCost: 1,
        skillReq: 0,
        flavor: 'Quiet banks where the line clears the mind.',
        art: { kind: 'svg', ref: 'zone-the_riverbank' },
        theme: 'riverbank',
        // BALANCE: provisional — Angling underspecified in design
        healthRestore: { min: 1, max: 2 },
        drops: [
          { id: 'river_fish', rarity: 'common' },
          { id: 'eel', rarity: 'common' },
        ],
      },
    ],
  },
];

export const GATHERING_BY_HOBBY = Object.fromEntries(
  GATHERING_ZONES.map((g) => [g.hobbyId, g]),
);

export function getGatheringConfig(hobbyId) {
  return GATHERING_BY_HOBBY[hobbyId] ?? null;
}

export function getGatheringZonesForHobby(hobbyId) {
  return getGatheringConfig(hobbyId)?.zones ?? [];
}

export function getGatheringZone(hobbyId, zoneId) {
  return getGatheringZonesForHobby(hobbyId).find((z) => z.id === zoneId) ?? null;
}

export function hobbyHasGathering(hobbyId) {
  return getGatheringZonesForHobby(hobbyId).length > 0;
}
