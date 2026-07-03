/** Hobby definitions — skills, unlock requirements, and endeavors. */



export const HOBBIES = [

  {

    id: 'botany',

    label: 'Botany',

    icon: '🌿',

    description:

      'Forage herbs, craft herbal remedies, and grow and study plants across the countryside.',

    tags: ['gathering', 'crafting'],

    endeavors: [],

  },

  {

    id: 'alchemy',

    label: 'Alchemy',

    icon: '⚗️',

    description:

      'Combine a wide range of ingredients into specific potions and concoctions.',

    tags: ['crafting'],

    requires: { hobbyId: 'botany', level: 50 },

    endeavors: [],

  },

  {

    id: 'metallurgy',

    label: 'Metallurgy',

    icon: '⚒️',

    description:

      'Gather ores, scavenge metals, and smith weapons, tools, and armor.',

    tags: ['gathering', 'crafting'],

    endeavors: [],

  },

  {

    id: 'artificing',

    label: 'Artificing',

    icon: '💎',

    description:

      'Create jewelry, unique devices, and even mystical artifacts.',

    tags: ['crafting'],

    requires: {

      all: [

        { hobbyId: 'metallurgy', level: 50 },

        { skill: 'mysticism', level: 25 },

      ],

    },

    endeavors: [],

  },

  {

    id: 'angling',

    label: 'Angling',

    icon: '🎣',

    description:

      'Fish the waters of Britain and ease your stress along quiet banks.',

    tags: ['gathering', 'health'],

    endeavors: [],

  },

  {

    id: 'hunting',

    label: 'Hunting',

    icon: '🏹',

    description: 'Hunt and track wildlife, and skin pelts.',

    tags: ['gathering'],

    endeavors: [],

  },

  {

    id: 'stalking',

    label: 'Stalking',

    icon: '🎯',

    description:
      'Stalk people and intelligent creatures — learn their habits, their routes, and the moment they are most alone.',

    tags: ['gathering'],

    requires: {
      all: [
        { hobbyId: 'hunting', level: 50 },
        { stat: 'cunning', level: 20 },
      ],
    },

    endeavors: [
      {
        id: 'spy',
        label: 'Spy on an acquaintance',
        apCost: 1,
        skillGain: 0.5,
      },
      {
        id: 'case_mark',
        label: 'Case a Mark',
        apCost: 2,
        skillGain: 0.5,
      },
    ],

  },

  {
    id: 'thieving',
    label: 'Thieving',
    icon: '🗝️',
    description: 'Pockets, locks, and ledgers — relieve London of what it will not miss.',
    tags: ['gathering'],
    hidden: true,
    endeavors: [],
  },

  {

    id: 'tailoring',

    label: 'Tailoring',

    icon: '🧵',

    description:

      'Use leathers, skins, pelts, and plant fibers to create clothing, armor, and fabrics.',

    tags: ['crafting'],

    requires: { hobbyId: 'hunting', level: 15 },

    endeavors: [],

  },

  {

    id: 'performance',

    label: 'Performance',

    icon: '🎻',

    description:

      'Play instruments and dance like a refined member of the elite.',

    tags: ['charisma'],

    endeavors: [],

  },

  {

    id: 'scholarship',

    label: 'Scholarship',

    icon: '📜',

    description:

      'Translate languages, study relics, and create tomes of learning.',

    tags: ['crafting', 'int'],

    endeavors: [],

  },

  {

    id: 'mysticism',

    label: 'Mysticism',

    icon: '✨',

    description:

      'Read the stars, interpret omens, use artifacts, and commune with spirits.',

    tags: ['int'],

    requires: { hobbyId: 'scholarship', level: 20 },

    endeavors: [
      {
        id: 'read_the_stars',
        label: 'Read the Stars',
        apCost: 1,
        skillGain: 0.5,
      },
      {
        id: 'seance',
        label: 'Hold a Séance',
        apCost: 2,
        skillGain: 0.5,
      },
      {
        id: 'dark_ritual',
        label: 'Dark Ritual (WIP)',
        apCost: 3,
        skillGain: 0,
      },
    ],

  },

].map((h) => ({

  ...h,

  hasCrafting: (h.tags || []).includes('crafting'),

  art: h.art ?? { kind: 'svg', ref: `hobby-${h.id}` },

}));



export const HOBBIES_BY_ID = Object.fromEntries(HOBBIES.map((h) => [h.id, h]));


