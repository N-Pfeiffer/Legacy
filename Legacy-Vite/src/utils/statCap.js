/** Per-stat ceilings for mortals vs vampires (bars, clamps, events). */

import { TRAITS_BY_ID } from '../data/traits.js';

export const STAT_CAPS = {
  mortal: {
    health: 100,
    prowess: 50,
    charisma: 100,
    intelligence: 100,
    wealth: 100,
    insight: 100,
    cunning: 100,
    fertility: 100,
  },
  vampire: {
    health: 200,
    prowess: 300,
    charisma: 200,
    intelligence: 200,
    wealth: 200,
    insight: 200,
    cunning: 200,
    fertility: 100,
  },
};

/** Sum trait `statMods.health` deltas into the person's health ceiling. */
function traitHealthCapBonus(person) {
  if (!person?.traits?.length) return 0;
  let bonus = 0;
  for (const id of person.traits) {
    const delta = TRAITS_BY_ID[id]?.statMods?.health;
    if (typeof delta === 'number') bonus += delta;
  }
  return bonus;
}

export function statCap(stat, vampire, person = null) {
  const table = STAT_CAPS[vampire ? 'vampire' : 'mortal'];
  let cap = table[stat] ?? 100;
  if (person && stat === 'health') {
    cap = Math.max(1, cap + traitHealthCapBonus(person));
  }
  return cap;
}
