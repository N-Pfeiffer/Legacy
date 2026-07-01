/** Trait registry — innate (creation), humors (early situation), and earned (school / university). */

import { HUMORS, HUMOR_IDS } from './humors.js';

export const TRAIT_KIND = {
  INNATE: 'innate',
  HUMOR: 'humor',
  EARNED: 'earned',
};

/** Positive innate traits cost points; drawbacks refund points. */
export const TRAIT_POINT_COST = {
  uncanny: 1,
  beguiling: 2,
  gutter_born: 1,
  iron_vigor: 2,
  scholar: 1,
  beast_whisperer: 1,
  strong_arm: 1,
  longbowman: 1,
  street_duelist: 1,
  light_footed: 1,
  mysterious_inheritance: 1,
  haunted: -1,
  siren: -1,
  frail_constitution: -0.5,
  marked_by_rookeries: -1,
  hemophobia: -1,
  waking_dreamer: -1,
  opium_addict: -1,
  pox_scarred: -2,
  family_debt: -1,
  orphaned: -2,
  one_eyed: -1,
};

/** Remap retired innate ids on loaded saves. */
export const TRAIT_ID_MIGRATIONS = {
  academia: 'scholar',
  built_different: 'strong_arm',
  iron_constitution: 'iron_vigor',
  seductive: 'beguiling',
  gutter_rat: 'gutter_born',
  weak_humors: 'frail_constitution',
};

export const CREATION_TRAIT_BUDGET = 2;

export const INNATE_POSITIVE_IDS = [
  'uncanny',
  'beguiling',
  'gutter_born',
  'iron_vigor',
  'scholar',
  'beast_whisperer',
  'strong_arm',
  'longbowman',
  'street_duelist',
  'light_footed',
  'mysterious_inheritance',
];

export const INNATE_DRAWBACK_IDS = [
  'haunted',
  'siren',
  'frail_constitution',
  'marked_by_rookeries',
  'hemophobia',
  'waking_dreamer',
  'opium_addict',
  'pox_scarred',
  'family_debt',
  'orphaned',
  'one_eyed',
];

export const INNATE_TRAIT_IDS = [...INNATE_POSITIVE_IDS, ...INNATE_DRAWBACK_IDS];

export const TRAITS = {
  // ── Innate positives ──
  uncanny: {
    id: 'uncanny',
    label: 'The Uncanny',
    kind: TRAIT_KIND.INNATE,
    description: '−7 Charisma, +4 Insight. You see too much. Others find you unnerving and strange.',
    statMods: { charisma: -7, insight: 4 },
  },
  beguiling: {
    id: 'beguiling',
    label: 'Beguiling',
    kind: TRAIT_KIND.INNATE,
    description: '+5 Charisma. Dangerously magnetic — relationships through flirting and romance build faster.',
    statMods: { charisma: 5 },
    hiddenDescription: '20% faster relationship building through flirting/romance.',
  },
  gutter_born: {
    id: 'gutter_born',
    label: 'The Gutter-born',
    kind: TRAIT_KIND.INNATE,
    description: '−2 Intelligence, −2 Charisma. The streets raised you rough. You know how to steal when you need to.',
    statMods: { intelligence: -2, charisma: -2 },
    hiddenDescription: 'Unlocks a steal decision to boost wealth temporarily.',
  },
  iron_vigor: {
    id: 'iron_vigor',
    label: 'Iron Vigor',
    kind: TRAIT_KIND.INNATE,
    description: '+25 Max Health. You are unnaturally sturdy.',
    statMods: { health: 25 },
    vampireDescription: 'Survive an otherwise deadly injury once every 20 years.',
  },
  scholar: {
    id: 'scholar',
    label: 'Scholar',
    kind: TRAIT_KIND.INNATE,
    description: '+7 Intelligence, −3 Charisma. You take more comfort from dusty tomes than people.',
    statMods: { intelligence: 7, charisma: -3 },
  },
  beast_whisperer: {
    id: 'beast_whisperer',
    label: 'The Beast Whisperer',
    kind: TRAIT_KIND.INNATE,
    description: 'Creatures regard you with the same respect you show them. Tame pets for free.',
    hiddenDescription: 'Tame pets for free.',
    vampireDescription: 'Start your unlife with the Animalism discipline.',
  },
  strong_arm: {
    id: 'strong_arm',
    label: 'Strong Arm',
    kind: TRAIT_KIND.INNATE,
    description: '+3 Prowess, −1 Intelligence. Your stature is well suited to combat.',
    statMods: { prowessBase: 3, intelligence: -1 },
  },
  longbowman: {
    id: 'longbowman',
    label: 'Longbowman',
    kind: TRAIT_KIND.INNATE,
    description:
      "+2 bonus Prowess with longbows while you carry one. You've spent many leisure hours at the aristocratic archery targets.",
    weaponProwess: { peasants_longbow: 2, nobles_longbow: 2 },
  },
  street_duelist: {
    id: 'street_duelist',
    label: 'Street Duelist',
    kind: TRAIT_KIND.INNATE,
    description: '+2 bonus Prowess with rapiers while you carry one. You are no stranger to rapier duels in back alleys.',
    weaponProwess: { rapier: 2 },
  },
  light_footed: {
    id: 'light_footed',
    label: 'Light-Footed',
    kind: TRAIT_KIND.INNATE,
    description: '+1 Prowess, +1 Insight. You tread silently, moving through soot-choked alleys like a ghost.',
    statMods: { prowessBase: 1, insight: 1 },
  },
  mysterious_inheritance: {
    id: 'mysterious_inheritance',
    label: 'Mysterious Inheritance',
    kind: TRAIT_KIND.INNATE,
    description:
      'Begin the game with an Ominous Relic in your inventory — a strange family heirloom from exceedingly odd circumstances.',
    startItems: ['ominous_relic'],
  },

  // ── Innate drawbacks ──
  haunted: {
    id: 'haunted',
    label: 'The Haunted',
    kind: TRAIT_KIND.INNATE,
    requiresTrait: 'uncanny',
    description: '−5 Prowess, −10 Max Health, +3 Insight.',
    statMods: { prowessBase: -5, health: -10, insight: 3 },
    hiddenDescription: 'Attract spirits with the same mechanic as Melancholic.',
  },
  siren: {
    id: 'siren',
    label: 'Siren',
    kind: TRAIT_KIND.INNATE,
    requiresTrait: 'beguiling',
    description: 'Dangerously alluring. Few forget your face.',
    hiddenDescription: 'Addictive kiss / stalker mechanic from Sanguine humor.',
  },
  frail_constitution: {
    id: 'frail_constitution',
    label: 'Frail Constitution',
    kind: TRAIT_KIND.INNATE,
    description: '−10 Max Health. Prone to sickness and frailty.',
    statMods: { health: -10 },
  },
  marked_by_rookeries: {
    id: 'marked_by_rookeries',
    label: 'Marked by the Rookeries',
    kind: TRAIT_KIND.INNATE,
    description:
      'You crossed the wrong crime syndicate early in life. The gutters have eyes, and they are looking for you.',
    hiddenDescription: 'Periodic dangerous encounters with Underworld thugs.',
    vampireDescription:
      "The syndicate's hunters eventually realize you survived death — an early-game combat Reckoning against heavily armed mobsters.",
  },
  hemophobia: {
    id: 'hemophobia',
    label: 'Hemophobia',
    kind: TRAIT_KIND.INNATE,
    description:
      '−5 Prowess in combat when someone is injured. The sight of blood makes you woozy, nauseous, and weak-kneed.',
    statMods: { prowessBase: -5 },
    vampireDescription:
      'For 50 years after becoming a vampire, feeding is more difficult and you only drain half blood.',
  },
  waking_dreamer: {
    id: 'waking_dreamer',
    label: 'Waking Dreamer',
    kind: TRAIT_KIND.INNATE,
    description: '+2 Intelligence. You see things that are not real — and they see you too. Situations appear that are not real.',
    statMods: { intelligence: 2 },
    vampireDescription: 'Reckonings will also appear.',
  },
  opium_addict: {
    id: 'opium_addict',
    label: 'Opium Addict',
    kind: TRAIT_KIND.INNATE,
    description: '−5 Wealth, −2 Intelligence. Soothed with poppy syrup as a child, you became dependent on it.',
    statMods: { wealth: -5, intelligence: -2 },
  },
  pox_scarred: {
    id: 'pox_scarred',
    label: 'Pox-Scarred',
    kind: TRAIT_KIND.INNATE,
    description:
      '−5 Charisma. As a child you survived the great outbreaks, but your face bears permanent scars. Most relationships start with bad impressions.',
    statMods: { charisma: -5 },
    hiddenDescription:
      'Decision to completely heal scars with full blood (consumes 30% blood) — hidden until eligible.',
    vampireDescription: 'Good chance new relationships start at −10 when meeting someone new.',
  },
  family_debt: {
    id: 'family_debt',
    label: 'Family Debt',
    kind: TRAIT_KIND.INNATE,
    description: '−7 Wealth. Your family begins under a burden of debt.',
    statMods: { wealth: -7 },
  },
  orphaned: {
    id: 'orphaned',
    label: 'Orphaned',
    kind: TRAIT_KIND.INNATE,
    description: '−10 Wealth. All that remains of your family is your name.',
    statMods: { wealth: -10 },
    hiddenDescription: 'No parents, siblings, or grandparents are generated. Skips the family record step.',
  },
  one_eyed: {
    id: 'one_eyed',
    label: 'One-eyed',
    kind: TRAIT_KIND.INNATE,
    description: '−2 Prowess. One of your eyes was lost as a child.',
    statMods: { prowessBase: -2 },
  },

  // ── Four Humors (assigned after load-in; vampire text hidden until Embrace) ──
  ...Object.fromEntries(
    HUMOR_IDS.map((id) => {
      const h = HUMORS[id];
      return [id, {
        id: h.id,
        label: h.label,
        kind: TRAIT_KIND.HUMOR,
        color: h.color,
        tagline: h.tagline,
        description: h.mortalDescription,
        mortalDescription: h.mortalDescription,
        vampireDescription: h.vampireDescription,
        ...(h.statMods ? { statMods: h.statMods } : {}),
      }];
    }),
  ),

  // ── Hidden record traits (education track / dropout — not shown to player) ──
  school_dropout: {
    id: 'school_dropout',
    label: 'School Dropout',
    kind: TRAIT_KIND.EARNED,
    hidden: true,
    description: 'You left the classroom behind.',
  },
  strange_relic: {
    id: 'strange_relic',
    label: 'Strange Relic',
    kind: TRAIT_KIND.EARNED,
    description: 'You fulfilled the Peculiar Patron\'s bargain. The Mysterious Relic in your possessions is the reward they left behind.',
  },
  track_letters: {
    id: 'track_letters',
    label: 'Letters Scholar',
    kind: TRAIT_KIND.EARNED,
    hidden: true,
    description: 'Trained in languages, rhetoric, and the humanities.',
  },
  track_law: {
    id: 'track_law',
    label: 'Legal Mind',
    kind: TRAIT_KIND.EARNED,
    hidden: true,
    description: 'Argument and precedent are your instruments.',
  },
  track_medicine: {
    id: 'track_medicine',
    label: 'Clinical Training',
    kind: TRAIT_KIND.EARNED,
    hidden: true,
    description: 'Anatomy, diagnosis, and steady hands.',
  },
  track_theology: {
    id: 'track_theology',
    label: 'Divine Studies',
    kind: TRAIT_KIND.EARNED,
    hidden: true,
    description: 'Scripture, doctrine, and the weight of faith.',
  },
  track_natural_philosophy: {
    id: 'track_natural_philosophy',
    label: 'Natural Philosopher',
    kind: TRAIT_KIND.EARNED,
    hidden: true,
    description: 'The physical world yields its patterns to you.',
  },
  university_dropout: {
    id: 'university_dropout',
    label: 'University Dropout',
    kind: TRAIT_KIND.EARNED,
    hidden: true,
    description: 'Higher learning was not your path.',
  },
};

export const TRAITS_BY_ID = Object.fromEntries(Object.values(TRAITS).map((t) => [t.id, t]));

export { HUMOR_IDS, HUMORS };

export const TRACK_TRAIT_IDS = {
  letters: 'track_letters',
  law: 'track_law',
  medicine: 'track_medicine',
  theology: 'track_theology',
  natural_philosophy: 'track_natural_philosophy',
};

/** Record-keeping traits (dropout, track) — stored on person but hidden from UI. */
export const HIDDEN_TRAIT_IDS = new Set(
  Object.values(TRAITS)
    .filter((t) => t.hidden)
    .map((t) => t.id),
);

export function isTraitHidden(traitId) {
  return HIDDEN_TRAIT_IDS.has(traitId) || !!TRAITS_BY_ID[traitId]?.hidden;
}
