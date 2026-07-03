/** Hunting zones — creatures with requirements and drop tables. */

export const HUNTING_CONFIG = {
  hobbyId: 'hunting',
  huntVerb: 'hunted',
  actionLabel: 'Hunt',
  skillGain: 0.5, // BALANCE: provisional
  zones: [
    {
      id: 'the_moors',
      label: 'The Moors',
      apCost: 1,
      skillReq: 0,
      flavor: 'Shrublands, roadways, and lonely heath.',
      art: { kind: 'svg', ref: 'zone-the_outlands' },
      theme: 'outlands',
      creatures: [
        {
          id: 'fox',
          label: 'Fox',
          weight: 28,
          drops: [{ id: 'simple_pelt', n: 1 }, { id: 'bone', n: 1 }],
        },
        {
          id: 'small_deer',
          label: 'Small Deer',
          weight: 24,
          drops: [{ id: 'simple_pelt', n: 1 }, { id: 'bone', n: 1 }],
        },
        {
          id: 'rabbit',
          label: 'Rabbit',
          weight: 22,
          drops: [{ id: 'simple_pelt', n: 1 }, { id: 'bone', n: 1 }],
        },
        {
          id: 'sheep',
          label: 'Sheep',
          weight: 14,
          drops: [{ id: 'raw_wool', n: 1 }, { id: 'bone', n: 1 }],
        },
        {
          id: 'pheasant',
          label: 'Pheasant',
          weight: 14,
          drops: [{ id: 'feather', n: 1 }, { id: 'bone', n: 1 }],
        },
        {
          id: 'badger',
          label: 'Badger',
          weight: 8,
          drops: [{ id: 'simple_pelt', n: 1 }, { id: 'bone', n: 1 }, { id: 'badger_claw', n: 1 }],
        },
        {
          id: 'moor_mortal',
          label: 'Mortal',
          weight: 4,
          requiresStalking: true,
          humanPrey: true,
          witnessChance: 0.08,
          drops: [{ id: 'human_heart', n: 1 }, { id: 'vial_of_blood', n: 1 }],
        },
      ],
    },
    {
      id: 'the_forest',
      label: 'The Forest',
      apCost: 2,
      skillReq: 25,
      royalDomain: true,
      witnessChance: 0.10,
      flavor: 'Deep timber where larger game roams.',
      art: { kind: 'svg', ref: 'zone-the_deep_forest' },
      theme: 'deep_forest',
      creatures: [
        {
          id: 'forest_elk',
          label: 'Elk',
          weight: 22,
          drops: [{ id: 'fine_pelt', n: 1 }, { id: 'bone', n: 2 }, { id: 'animal_heart', n: 1 }],
        },
        {
          id: 'forest_fox',
          label: 'Fox',
          weight: 18,
          drops: [{ id: 'fine_pelt', n: 1 }, { id: 'bone', n: 2 }, { id: 'animal_heart', n: 1 }],
        },
        {
          id: 'forest_rabbit',
          label: 'Rabbit',
          weight: 16,
          drops: [{ id: 'fine_pelt', n: 1 }, { id: 'bone', n: 2 }, { id: 'animal_heart', n: 1 }],
        },
        {
          id: 'boar',
          label: 'Boar',
          weight: 14,
          drops: [
            { id: 'fine_pelt', n: 1 },
            { id: 'bone', n: 2 },
            { id: 'animal_heart', n: 1 },
            { id: 'tusk', n: 1 },
          ],
        },
        {
          id: 'bandit_or_hunter',
          label: 'Bandit or Hunter',
          weight: 8,
          requiresStalking: true,
          humanPrey: true,
          witnessChance: 0.05,
          requiresAny: [{ prowess: 50 }, { cunning: 40 }],
          drops: [{ id: 'vial_of_blood', n: 1 }, { id: 'human_heart', n: 1 }],
          chanceDrops: [
            { id: 'copper_scrap', chance: 0.25 },
            { id: 'tin_scrap', chance: 0.25 },
            { id: 'nobles_longbow', chance: 0.25, asEquipment: true },
            { id: 'fine_pelt', chance: 0.25 },
            { id: 'animal_heart', chance: 0.25 },
            { id: 'foreign_tome', chance: 0.15 },
          ],
        },
        {
          id: 'black_bear',
          label: 'Black Bear',
          weight: 10,
          requiresAny: [{ hunting: 40 }, { prowess: 30 }],
          drops: [
            { id: 'fine_pelt', n: 1 },
            { id: 'bone', n: 2 },
            { id: 'animal_heart', n: 1 },
            { id: 'bear_fat', n: 1 },
          ],
        },
        {
          id: 'brown_bear',
          label: 'Brown Bear',
          weight: 6,
          requiresAny: [{ hunting: 75 }, { prowess: 50 }],
          drops: [
            { id: 'fine_pelt', n: 1 },
            { id: 'bone', n: 2 },
            { id: 'great_animal_heart', n: 1 },
            { id: 'bear_fat', n: 1 },
          ],
        },
        {
          id: 'great_white_stag',
          label: 'Great White Stag',
          weight: 2,
          requires: [{ hunting: 50 }],
          drops: [
            { id: 'legendary_white_pelt', n: 1 },
            { id: 'bone', n: 4 },
            { id: 'great_animal_heart', n: 1 },
          ],
        },
      ],
    },
    {
      id: 'the_deep_weald',
      label: 'The Deep Weald',
      apCost: 4,
      skillReq: 100,
      questLocked: true,
      lockHint: 'Deep Weald quest required',
      flavor: 'The deepest primordial forest — hidden and perilous.',
      art: { kind: 'svg', ref: 'zone-the_deep_forest' },
      theme: 'weald',
      creatures: [
        {
          id: 'weald_wolf',
          label: 'Wolf',
          weight: 30,
          drops: [{ id: 'fine_pelt', n: 1 }, { id: 'bone', n: 2 }, { id: 'animal_heart', n: 1 }],
        },
        {
          id: 'dire_stag',
          label: 'Dire Stag',
          weight: 28,
          drops: [{ id: 'fine_pelt', n: 1 }, { id: 'bone', n: 2 }, { id: 'animal_heart', n: 1 }],
        },
        {
          id: 'dark_boar',
          label: 'Dark Boar',
          weight: 16,
          requires: [{ prowess: 50 }],
          drops: [
            { id: 'exceptional_pelt', n: 1 },
            { id: 'bone', n: 2 },
            { id: 'animal_heart', n: 1 },
            { id: 'tusk', n: 1 },
          ],
        },
        {
          id: 'direwolf',
          label: 'Direwolf',
          weight: 12,
          requires: [{ prowess: 100 }],
          drops: [
            { id: 'exceptional_pelt', n: 1 },
            { id: 'bone', n: 4 },
            { id: 'lycanthrope_heart', n: 1 },
          ],
        },
        {
          id: 'werewolf',
          label: 'Werewolf',
          weight: 6,
          requires: [{ prowess: 150 }],
          drops: [
            { id: 'legendary_wolf_pelt', n: 1 },
            { id: 'bone', n: 4 },
            { id: 'lycanthrope_heart', n: 1 },
            { id: 'werewolf_fang', n: 1 },
          ],
        },
      ],
    },
  ],
};

export function getHuntingConfig(hobbyId = 'hunting') {
  return HUNTING_CONFIG.hobbyId === hobbyId ? HUNTING_CONFIG : null;
}

export function getHuntingZone(zoneId) {
  return HUNTING_CONFIG.zones.find((z) => z.id === zoneId) ?? null;
}

export function hobbyHasHunting(hobbyId) {
  return hobbyId === 'hunting' && HUNTING_CONFIG.zones.length > 0;
}

export function isDeepWealdUnlocked(player) {
  return !!player?.huntingQuests?.deepWeald;
}
