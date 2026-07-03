/**
 * crimePath unlock — doors into the Thieving hobby.
 */

import { CAREERS_BY_ID } from '../data/careers.js';
import { hasTrait } from './traits.js';
import { getMoney } from './money.js';

export function hasCrimePath(player) {
  return !!player?.crimePath;
}

function markTradeOpensResolved(player) {
  if (!player.resolvedSituations || typeof player.resolvedSituations !== 'object') {
    player.resolvedSituations = {};
  }
  if (!player.resolvedSituations.the_trade_opens) {
    player.resolvedSituations.the_trade_opens = {
      firstYear: null,
      lastYear: null,
      count: 0,
    };
  }
}

/**
 * Flip crimePath on. Returns true if newly unlocked.
 * @param {{ fireSituation?: Function, silent?: boolean }} opts — silent skips the_trade_opens (save backfill).
 */
export function unlockCrimePath(player, { fireSituation, silent = false } = {}) {
  if (!player?.isPlayer || player.crimePath) return false;
  player.crimePath = true;
  player.thievingUnseen = true;

  if (!silent && typeof fireSituation === 'function') {
    const seen = player.resolvedSituations?.the_trade_opens;
    if (!seen?.count) {
      fireSituation(player, 'the_trade_opens');
    }
  } else if (!silent) {
    const seen = player.resolvedSituations?.the_trade_opens;
    if (!seen?.count) {
      if (!Array.isArray(player._crimeSituationQueue)) player._crimeSituationQueue = [];
      player._crimeSituationQueue.push('the_trade_opens');
    }
  } else if (silent) {
    markTradeOpensResolved(player);
  }

  return true;
}

/** After salary and career upkeep — broke at year end. */
export function checkPovertyCrimePath(player, { fireSituation } = {}) {
  if (!player?.isPlayer || !player.isAlive) return;
  if (player.crimePath) return;
  if ((player.age ?? 0) < 12) return;
  if (getMoney(player) !== 0) return;
  unlockCrimePath(player, { fireSituation });
}

export function unlockCrimePathFromCareer(player, careerId, { fireSituation } = {}) {
  const career = CAREERS_BY_ID[careerId];
  if (career?.socialGroup === 'criminal') {
    unlockCrimePath(player, { fireSituation });
  }
}

export function unlockCrimePathFromTrait(player, { fireSituation } = {}) {
  if (hasTrait(player, 'marked_by_rookeries')) {
    unlockCrimePath(player, { fireSituation, silent: true });
  }
}

export function unlockCrimePathFromSuspicion(player, before, after, { fireSituation } = {}) {
  if ((before ?? 0) <= 0 && (after ?? 0) > 0) {
    unlockCrimePath(player, { fireSituation });
  }
}

export function clearThievingUnseen(player) {
  if (player) player.thievingUnseen = false;
}

export function backfillCrimePath(player) {
  if (!player?.isPlayer || player.crimePath) return;
  const criminal = player.career && CAREERS_BY_ID[player.career.id]?.socialGroup === 'criminal';
  const rook = hasTrait(player, 'marked_by_rookeries');
  if ((player.suspicion ?? 0) > 0 || criminal || rook) {
    unlockCrimePath(player, { silent: true });
  }
}
