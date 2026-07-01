import { hasItem } from './playerItems.js';

/**
 * Gate a Journal decision on owned items.
 * @example eligible: (p) => requiresItems(p, ['mysterious_relic'], (pl) => pl.isVampire)
 */
export function requiresItems(player, itemIds, extra = () => true) {
  if (!player || !Array.isArray(itemIds) || !itemIds.length) return false;
  return extra(player) && itemIds.every((id) => hasItem(player, id));
}
