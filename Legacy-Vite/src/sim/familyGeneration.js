import { clamp } from '../utils/index.js';
import { weightedPick } from '../utils/weightedPick.js';

/** Default bounds for a parent's siblings at player game start (per side). */
export const DEFAULT_SIBLING_COUNT_MIN = 1;
export const DEFAULT_SIBLING_COUNT_MAX = 5;

/** Minimum age each parent must be when a child (or older sibling) is born. */
export const PARENT_MIN_AGE_AT_CHILDBIRTH = 8;

/**
 * Max years older than the player an older sibling can be at player birth.
 * Uses the younger parent so both were at least PARENT_MIN_AGE_AT_CHILDBIRTH when the sibling was born.
 */
export function maxOlderSiblingAgeDiff(fatherAge, motherAge, { playerOlderCap = 10 } = {}) {
  const youngestParent = Math.min(fatherAge, motherAge);
  return Math.max(0, Math.min(playerOlderCap, youngestParent - PARENT_MIN_AGE_AT_CHILDBIRTH));
}

const randInt = (min, max) =>
  min + Math.floor(Math.random() * (max - min + 1));

/**
 * Declining weights for sibling counts: 1 sibling is most likely, 5 least.
 * Pass custom min/max for other contexts (e.g. NPC families later).
 */
export function siblingCountWeights(
  min = DEFAULT_SIBLING_COUNT_MIN,
  max = DEFAULT_SIBLING_COUNT_MAX,
) {
  const items = [];
  for (let count = min; count <= max; count++) {
    items.push({ count, weight: max - count + 1 });
  }
  return items;
}

/**
 * How many siblings a focal person has on one family line.
 * @param {{ min?: number, max?: number, weights?: { count: number, weight: number }[] }} [options]
 */
export function rollSiblingCount(options = {}) {
  const min = options.min ?? DEFAULT_SIBLING_COUNT_MIN;
  const max = options.max ?? DEFAULT_SIBLING_COUNT_MAX;
  if (min >= max) return min;
  const picked = weightedPick(options.weights ?? siblingCountWeights(min, max));
  return picked.count;
}

/** Plausible max age for a parent's sibling given grandparent ages. */
export function maxParentSiblingAge(parent, grandfather, grandmother) {
  return Math.max(
    1,
    Math.min(
      parent.age + 14,
      (grandfather?.age ?? parent.age + 30) - 12,
      (grandmother?.age ?? parent.age + 30) - 12,
    ),
  );
}

/**
 * Age of one parental sibling relative to the parent at `referenceYear`.
 * NPC family builders may pass different spread rules later.
 */
export function rollParentSiblingAge(parentAge, maxAge) {
  return clamp(parentAge + randInt(-8, 10), 1, maxAge);
}
