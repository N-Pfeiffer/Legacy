import { clamp } from '../utils/index.js';
import { statCap } from '../utils/statCap.js';
import { G } from '../state/gameState.js';
import { refreshActionPoints } from './actionPoints.js';
import { hasTrait } from './traits.js';
import { recordMilestone } from './situationLog.js';
import { addMoney, getMoney, trySpendMoney } from './money.js';

export const PRIVATE_CELL_MONEY_MIN = 75;
export const PRISON_DISEASE_HEALTH_LOSS = 30;
export const PRISON_TURNKEY_MONEY_COST = 5;
export const PRISON_TURNKEY_CANNOT_PAY_HEALTH = 20;
export const PRISON_TURNKEY_MONEY_MIN = 10;

/** @deprecated use PRIVATE_CELL_MONEY_MIN */
export const PRIVATE_CELL_WEALTH_MIN = PRIVATE_CELL_MONEY_MIN;
/** @deprecated use PRISON_TURNKEY_MONEY_COST */
export const PRISON_TURNKEY_WEALTH_COST = PRISON_TURNKEY_MONEY_COST;
/** @deprecated use PRISON_TURNKEY_MONEY_MIN */
export const PRISON_TURNKEY_WEALTH_MIN = PRISON_TURNKEY_MONEY_MIN;

const TURNKEY_CHANCE_EARLY = 0.8;
const EARLY_ERA_YEAR_MAX = 1850;
const VICTORIAN_ERA_YEAR_MIN = 1850;

function bumpHealth(player, delta) {
  const cap = statCap('health', !!player.isVampire, player);
  player.health = clamp((player.health || 0) + delta, 0, cap);
}

function bumpWealth(player, delta) {
  if (player?.isPlayer) {
    addMoney(player, delta);
    return;
  }
  const cap = statCap('wealth', !!player.isVampire);
  player.wealth = clamp((player.wealth || 0) + delta, 0, cap);
}

export function isEarlyPrisonEra(year = G.year) {
  return year < EARLY_ERA_YEAR_MAX;
}

export function isVictorianPrisonEra(year = G.year) {
  return year >= VICTORIAN_ERA_YEAR_MIN;
}

/** @returns {'private' | 'dungeon'} */
export function assignCellType(player) {
  if (player?.isPlayer) {
    return getMoney(player) >= PRIVATE_CELL_MONEY_MIN ? 'private' : 'dungeon';
  }
  return (player?.wealth ?? 0) >= PRIVATE_CELL_WEALTH_MIN ? 'private' : 'dungeon';
}

export function isInPrison(player) {
  const prison = player?.prison;
  return !!(prison?.active && G.year < prison.untilYear);
}

export function prisonYearsRemaining(player) {
  if (!isInPrison(player)) return 0;
  return Math.max(0, player.prison.untilYear - G.year);
}

export function prisonCellLabel(cellType) {
  return cellType === 'private' ? 'Private Cell' : 'Common Dungeon';
}

export function prisonEraFlavorLine(year = G.year) {
  if (isVictorianPrisonEra(year)) {
    return 'Enforced silence. Masks hide every face; identities are stripped away.';
  }
  return 'Newgate runs on garnish and fever. The turnkey watches the bars.';
}

/**
 * Roll disease chance for the current prison year (percentage 0–100).
 * Mortals only; returns 0 for vampires.
 */
export function rollPrisonDiseaseChance(player) {
  if (player?.isVampire) return 0;

  const cell = player.prison?.cellType || 'dungeon';
  const baseMin = cell === 'private' ? 10 : 40;
  const baseMax = cell === 'private' ? 20 : 50;
  let chance = baseMin + Math.random() * (baseMax - baseMin);

  if (isEarlyPrisonEra()) chance += 20;
  if (hasTrait(player, 'iron_vigor')) chance -= 30;

  return Math.max(0, Math.min(100, chance));
}

export function rollPrisonDisease(player) {
  const chance = rollPrisonDiseaseChance(player);
  if (chance <= 0) return false;
  return Math.random() * 100 < chance;
}

export function rollPrisonTurnkey(player) {
  if (player?.isVampire) return false;
  if (!isEarlyPrisonEra()) return false;
  return Math.random() < TURNKEY_CHANCE_EARLY;
}

export function applyPrisonDisease(player) {
  bumpHealth(player, -PRISON_DISEASE_HEALTH_LOSS);
}

export function applyPrisonTurnkeyCannotPay(player) {
  bumpHealth(player, -PRISON_TURNKEY_CANNOT_PAY_HEALTH);
}

export function applyPrisonTurnkeyPay(player) {
  if (player?.isPlayer) {
    trySpendMoney(player, PRISON_TURNKEY_MONEY_COST);
    return;
  }
  bumpWealth(player, -PRISON_TURNKEY_WEALTH_COST);
}

export function canPayTurnkeyGarnish(player) {
  if (player?.isPlayer) {
    return getMoney(player) >= PRISON_TURNKEY_MONEY_MIN;
  }
  return (player?.wealth ?? 0) > PRISON_TURNKEY_WEALTH_MIN;
}

/**
 * Legacy saves: patronArc.jailedUntilYear → player.prison.
 * Phase 2: prison.inmates[] for limited NPC relations.
 */
export function migratePatronJailToPrison(player, year = G.year) {
  if (!player || player.prison?.active) return;
  const until = player.patronArc?.jailedUntilYear;
  if (!until || year >= until) return;

  player.prison = {
    active: true,
    untilYear: until,
    enteredYear: year,
    cellType: assignCellType(player),
    source: 'patron',
    maskedIdentity: year >= VICTORIAN_ERA_YEAR_MIN,
  };
  if (player.patronArc) player.patronArc.jailedUntilYear = null;
}

export function incarceratePlayer(player, { years = 2, source = 'general' } = {}) {
  if (!player) return;
  const sentenceYears = Math.max(1, years);
  const enteredYear = G.year;

  player.prison = {
    active: true,
    untilYear: enteredYear + sentenceYears,
    enteredYear,
    cellType: assignCellType(player),
    source,
    maskedIdentity: isVictorianPrisonEra(enteredYear),
    // inmates: [] — Phase 2: prison NPCs and capped relations
  };

  if (player.patronArc) {
    player.patronArc.pendingCaught = false;
    player.patronArc.jailedUntilYear = null;
  }

  const cell = prisonCellLabel(player.prison.cellType);
  recordMilestone(player, {
    title: 'Imprisoned',
    narrative: `You are sentenced to ${sentenceYears} year${sentenceYears === 1 ? '' : 's'} in gaol — ${cell}.`,
    memoryCategory: 'life',
    type: 'bad',
    year: G.year,
  });
}

import { settleCrimeOnPrisonRelease } from './crime.js';

export function releasePrison(player) {
  if (!player?.prison) return;
  const source = player.prison.source;
  const cell = prisonCellLabel(player.prison.cellType);
  player.prison = null;

  if (player.isPlayer) {
    settleCrimeOnPrisonRelease(player, source);
  }

  recordMilestone(player, {
    title: 'Released',
    narrative: `Your sentence is served. You leave the ${cell.toLowerCase()} and step back into the world.`,
    memoryCategory: 'life',
    type: 'info',
    year: G.year,
  });
}

/**
 * Advance one calendar year while incarcerated. Returns pending situation count
 * after any queued prison events (caller should render + show popups).
 */
export function tickPrisonYear(player, { fireSituation, checkMortality } = {}) {
  if (!player?.isAlive || !isInPrison(player)) return 0;

  G.year++;
  player.age += 1;

  let queued = 0;

  if (typeof fireSituation === 'function') {
    if (rollPrisonTurnkey(player)) {
      fireSituation(player, 'prison_turnkey');
      queued += 1;
    } else if (rollPrisonDisease(player)) {
      fireSituation(player, 'prison_disease');
      queued += 1;
    }
  }

  if (G.year >= player.prison.untilYear) {
    releasePrison(player);
  }

  if (typeof checkMortality === 'function') checkMortality();

  if (player.isAlive) refreshActionPoints(player);

  return queued;
}
