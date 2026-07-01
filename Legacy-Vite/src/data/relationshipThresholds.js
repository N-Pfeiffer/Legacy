/** Tunable thresholds for hybrid social bucket promotion. */



export const FRIEND_DISPOSITION_THRESHOLD = 40;

export const ENEMY_DISPOSITION_THRESHOLD = -50;

export const LOVER_INTIMACY_THRESHOLD = 50;

/** Keep lover bucket once intimacy reaches this, even if disposition drops. */

export const LOVER_INTIMACY_STICKY = 40;



/** Default seeds at game start (family only). */

export const SEED_PARENT = { disposition: 55, intimacy: 25 };

export const SEED_SIBLING = { disposition: 40, intimacy: 15 };

export const SEED_EXTENDED_KIN = { disposition: 25, intimacy: 0 };



/** Stranger first meeting defaults. */

export const STRANGER_MEET = { disposition: 0, intimacy: 0, enthrallment: 0 };



const DISPOSITION_TIERS = [

  { min: 61, label: 'Loyal' },

  { min: 21, label: 'Friendly' },

  { min: -20, label: 'Neutral' },

  { min: -50, label: 'Wary' },

  { min: -80, label: 'Hostile' },

  { min: -Infinity, label: 'Vendetta' },

];



const INTIMACY_TIERS = [

  { min: 51, label: 'Obsessed' },

  { min: 11, label: 'Attached' },

  { min: -10, label: 'Neutral' },

  { min: -40, label: 'Distant' },

  { min: -80, label: 'Cold' },

  { min: -Infinity, label: 'Repulsed' },

];



const ENTHRALLMENT_TIERS = [

  { min: 76, label: 'Absolute Thrall' },

  { min: 51, label: 'Thrall' },

  { min: 26, label: 'Bound' },

  { min: 1, label: 'Swayed' },

  { min: 0, label: 'Free will' },

];



function tierFor(value, tiers) {

  for (const tier of tiers) {

    if (value >= tier.min) return tier.label;

  }

  return tiers[tiers.length - 1].label;

}



export function dispositionTierLabel(value) {

  return tierFor(Math.round(Number(value) || 0), DISPOSITION_TIERS);

}



export function intimacyTierLabel(value) {

  return tierFor(Math.round(Number(value) || 0), INTIMACY_TIERS);

}



export function enthrallmentTierLabel(value) {

  return tierFor(Math.round(Number(value) || 0), ENTHRALLMENT_TIERS);

}


