import { clamp } from '../utils/index.js';
import { statCap } from '../utils/statCap.js';
import { ITEMS_BY_ID, itemStatMods } from '../data/items.js';
import { TRAITS_BY_ID } from '../data/traits.js';
import { hasTrait } from './traits.js';
import { ownedItemIds, grantItem, hasItem } from './playerItems.js';
import { equippedItems } from './equipment.js';

/** Sum bonuses from all currently equipped gear (`whileEquipped` on catalog entries). */
export function itemBonusesFromEquipped(player) {
  const totals = {};
  if (!player) return totals;
  const seen = new Set();
  for (const { uid, id } of equippedItems(player)) {
    if (seen.has(uid)) continue;
    seen.add(uid);
    const mods = itemStatMods(ITEMS_BY_ID[id]);
    if (!mods) continue;
    for (const [stat, delta] of Object.entries(mods)) {
      totals[stat] = (totals[stat] || 0) + delta;
    }
  }
  return totals;
}

/** @deprecated Use itemBonusesFromEquipped — stats now come from equipped gear only. */
export const itemBonusesFromOwnership = itemBonusesFromEquipped;

/** Prowess from innate traits when matching weapons are equipped (Longbowman, Street Duelist). */
export function traitWeaponProwessBonus(player) {
  if (!player?.traits?.length) return 0;
  const equippedIds = new Set(equippedItems(player).map((e) => e.id));
  let total = 0;
  for (const traitId of player.traits) {
    const weaponProwess = TRAITS_BY_ID[traitId]?.weaponProwess;
    if (!weaponProwess) continue;
    for (const [weaponId, delta] of Object.entries(weaponProwess)) {
      if (equippedIds.has(weaponId)) total += delta;
    }
  }
  return total;
}

export function itemBonus(player, stat) {
  const fromItems = itemBonusesFromEquipped(player)[stat] || 0;
  if (stat === 'prowess') return fromItems + traitWeaponProwessBonus(player);
  return fromItems;
}

/** Stored stat + bonuses from equipped gear. */
export function effectiveStat(player, stat) {
  if (!player) return 0;
  const vampire = !!player.isVampire;
  const base = player[stat] ?? 0;
  const bonus = itemBonus(player, stat);
  const cap = statCap(stat, vampire, player);
  return clamp(base + bonus, 0, cap);
}

export function effectiveInsight(player) {
  return effectiveStat(player, 'insight');
}

export function effectiveCunning(player) {
  return effectiveStat(player, 'cunning');
}

export function effectiveCharisma(player) {
  return effectiveStat(player, 'charisma');
}

export function effectiveMeleeDamage(player) {
  const base = player?.meleeDamageBonus ?? 0;
  return base + itemBonus(player, 'meleeDamage');
}

/**
 * One-time migration: old saves applied item stats permanently on acquire.
 * Strip those deltas from stored stats so bonuses come only from equipment.
 */
export function migrateLegacyItemAcquireBonuses(player) {
  if (!player || player._possessionItemBonuses) return;
  for (const id of ownedItemIds(player)) {
    const legacy = itemStatMods(ITEMS_BY_ID[id]);
    if (!legacy) continue;
    for (const [stat, delta] of Object.entries(legacy)) {
      if (stat === 'prowess') {
        player.prowessBonus = Math.max(0, (player.prowessBonus || 0) - delta);
      } else if (stat === 'meleeDamage') {
        player.meleeDamageBonus = Math.max(0, (player.meleeDamageBonus || 0) - delta);
      } else if (stat in player) {
        player[stat] = Math.max(0, (player[stat] || 0) - delta);
      }
    }
  }
  player._possessionItemBonuses = true;
}

/** Patron arc completion: inventory item (insight when equipped, not a one-time bump). */
export function grantPatronMysteriousRelic(player) {
  if (!player || !ITEMS_BY_ID.mysterious_relic) return false;
  if (hasItem(player, 'mysterious_relic')) return false;
  return grantItem(player, 'mysterious_relic', { silent: true });
}

/** Saves with earned Strange Relic trait but no inventory item yet. */
export function migratePatronRelicToItem(player) {
  if (!hasTrait(player, 'strange_relic')) return;
  grantPatronMysteriousRelic(player);
}
