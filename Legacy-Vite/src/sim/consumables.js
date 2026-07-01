import { ITEMS_BY_ID } from '../data/items.js';
import { clamp } from '../utils/index.js';
import { statCap } from '../utils/statCap.js';
import { materialCount, removeMaterial } from './personItems.js';

const STAT_LABELS = {
  health: 'Health',
  prowess: 'Prowess',
  charisma: 'Charisma',
  intelligence: 'Intelligence',
  insight: 'Insight',
  wealth: 'Wealth',
  fertility: 'Fertility',
};

/** Active onUse descriptor for this player (mortal vs vampire branches). */
export function getActiveOnUse(item, player) {
  if (!item) return null;
  if (player?.isVampire && item.onUseVampire) return item.onUseVampire;
  return item.onUse ?? null;
}

export function itemHasUsableEffect(item, player) {
  return getActiveOnUse(item, player) != null;
}

function validateEffect(player, effect) {
  if (!effect) return { ok: false, reason: 'no_use', message: 'This item cannot be used yet.' };
  if (effect.vampireOnly && !player?.isVampire) {
    return { ok: false, reason: 'vampire_only', message: 'Only vampires can use this.' };
  }
  if (effect.mortalOnly && player?.isVampire) {
    return { ok: false, reason: 'mortal_only', message: 'Mortals only.' };
  }
  if (effect.unimplemented || effect.restore === 'blood') {
    return {
      ok: false,
      reason: 'unimplemented',
      message: 'Vampire Blood is not tracked yet.',
    };
  }
  return { ok: true };
}

export function canUse(player, itemId) {
  const item = ITEMS_BY_ID[itemId];
  if (!player || !item) return { ok: false, reason: 'invalid' };
  if (item.category !== 'consumable') return { ok: false, reason: 'not_consumable' };

  const effect = getActiveOnUse(item, player);
  const check = validateEffect(player, effect);
  if (!check.ok) return check;

  if (materialCount(player, itemId) < 1) {
    return { ok: false, reason: 'none_owned', message: 'You do not have any.' };
  }

  return { ok: true };
}

function applyEffect(player, effect) {
  const vampire = !!player.isVampire;

  if (effect.stat && typeof effect.delta === 'number') {
    const stat = effect.stat;
    const cap = statCap(stat, vampire);
    player[stat] = clamp((player[stat] ?? 0) + effect.delta, 0, cap);
  }

  if (effect.restore === 'health' && typeof effect.amount === 'number') {
    const cap = statCap('health', vampire);
    player.health = clamp((player.health ?? 0) + effect.amount, 0, cap);
  }
}

function buildUseMessage(item, effect) {
  if (effect.stat && typeof effect.delta === 'number') {
    const statLabel = STAT_LABELS[effect.stat] || effect.stat;
    const sign = effect.delta > 0 ? `+${effect.delta}` : String(effect.delta);
    return `You used ${item.label}. (${sign} ${statLabel}.)`;
  }
  if (effect.restore === 'health' && typeof effect.amount === 'number') {
    return `You used ${item.label}. (Restored ${effect.amount} Health.)`;
  }
  return `You used ${item.label}.`;
}

export function useConsumable(player, itemId) {
  const check = canUse(player, itemId);
  if (!check.ok) return { ok: false, reason: check.reason, message: check.message };

  const item = ITEMS_BY_ID[itemId];
  const effect = getActiveOnUse(item, player);

  applyEffect(player, effect);
  removeMaterial(player, itemId, 1);

  return {
    ok: true,
    message: buildUseMessage(item, effect),
    type: 'good',
  };
}
