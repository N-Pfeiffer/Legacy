import { clamp } from '../utils/index.js';
import { statCap } from '../utils/statCap.js';
import { G } from '../state/gameState.js';
import { hasItem, grantItem } from './playerItems.js';
import { effectiveInsight } from './itemEffects.js';
import { currentProwess } from './prowess.js';

export const LOCKBOX_CHECK_THRESHOLD = 48;

export const LOCKBOX_INTRO_BODY =
  'The rusted lockbox waits — heavy, secretive, and still locked. You may try to open it when you are ready.';

export const LOCKBOX_SUCCESS_BODY =
  'The lockbox yields its hoard. You tuck the gold away before anyone else combs the flats.';

export const LOCKBOX_SUCCESS_ACQUISITION = '+£10';

export const LOCKBOX_COOLDOWN_LABEL = 'Cooldown: 1 year';

function rollStatCheck(statValue, threshold = LOCKBOX_CHECK_THRESHOLD) {
  const roll = Math.floor(Math.random() * 20) + 1;
  return statValue + roll >= threshold;
}

import { addMoney } from './money.js';

function bumpWealth(player, delta) {
  if (player?.isPlayer) {
    addMoney(player, delta);
    return;
  }
  const cap = statCap('wealth', !!player.isVampire);
  player.wealth = clamp((player.wealth || 0) + delta, 0, cap);
}

export function ensureMudlarkState(player) {
  if (!player.mudlarkLockbox || typeof player.mudlarkLockbox !== 'object') {
    player.mudlarkLockbox = null;
  }
  return player.mudlarkLockbox;
}

/** Ensure progress state exists when the player owns the lockbox item. */
export function ensureMudlarkLockboxReady(player) {
  if (!hasItem(player, 'mudlarks_lockbox')) return null;
  const mudlark = ensureMudlarkState(player);
  if (!mudlark) {
    player.mudlarkLockbox = { active: true, resolved: false };
    return player.mudlarkLockbox;
  }
  return mudlark;
}

/** Whether the yearly Thames discovery popup can roll (1% by default). */
export function mudlarkDiscoveryEligible(player) {
  if (!player?.isAlive) return false;
  if (hasItem(player, 'mudlarks_lockbox')) return false;
  const mudlark = ensureMudlarkState(player);
  if (mudlark?.active && !mudlark.abandoned) return false;
  return true;
}

export function mudlarkLockboxEligible(player) {
  if (!player?.isAlive) return false;
  if (!hasItem(player, 'mudlarks_lockbox')) return false;
  const mudlark = ensureMudlarkLockboxReady(player);
  if (mudlark?.abandoned || mudlark?.resolved) return false;
  return true;
}

export function mudlarkOnCooldown(player) {
  const mudlark = ensureMudlarkState(player);
  return mudlark?.lastAttemptYear === G.year;
}

export function mudlarkAttemptLogText(player) {
  const mudlark = player.mudlarkLockbox;
  if (mudlark?.lastOutcome === 'success') return LOCKBOX_SUCCESS_BODY;
  if (mudlark?.lastOutcome === 'fail') {
    return 'The lockbox resists you — for now.';
  }
  return 'You left the lockbox to the rising tide. Whatever it held is not yours to claim.';
}

export function initializeMudlarkFromFind(player) {
  grantItem(player, 'mudlarks_lockbox', { silent: true });
  player.mudlarkLockbox = { active: true, resolved: false, kept: true };
}

export function attemptMudlarkOpen(player, method) {
  const mudlark = ensureMudlarkState(player) || {};
  const statValue = method === 'study' ? effectiveInsight(player) : currentProwess(player);
  const success = rollStatCheck(statValue);

  player.mudlarkLockbox = {
    ...mudlark,
    lastAttemptYear: G.year,
    lastOutcome: success ? 'success' : 'fail',
    resolved: success,
    openedYear: success ? G.year : undefined,
  };

  if (success) bumpWealth(player, 10);

  return { success, method };
}

/** Backfill item ownership for saves that still have active mudlark state without items[]. */
export function migrateMudlarkLockboxToItems(player) {
  const mudlark = ensureMudlarkState(player);
  if (mudlark?.abandoned && !hasItem(player, 'mudlarks_lockbox')) {
    player.mudlarkLockbox = null;
  }
  if (mudlark?.active && !mudlark.resolved && !mudlark.abandoned) {
    grantItem(player, 'mudlarks_lockbox', { silent: true });
  }
  ensureMudlarkLockboxReady(player);
}
