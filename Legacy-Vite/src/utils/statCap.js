/** Per-stat ceilings for mortals vs vampires (bars, clamps, events). */

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

export function statCap(stat, vampire) {
  const table = STAT_CAPS[vampire ? 'vampire' : 'mortal'];
  return table[stat] ?? 100;
}
