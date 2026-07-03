/**
 * "Persons of Note" — the player's bookmark list of people worth tracking.
 *
 * Stored as `player.pinnedIds` (an array of person ids), serialized with the player record.
 * Order is chronological (most-recently pinned is last); `pinnedPeople` returns newest-first.
 */

import { getPerson } from '../state/gameState.js';

export function ensurePinned(player) {
  if (!player) return [];
  if (!Array.isArray(player.pinnedIds)) player.pinnedIds = [];
  return player.pinnedIds;
}

export function isPinned(player, id) {
  return !!player && Array.isArray(player.pinnedIds) && player.pinnedIds.includes(id);
}

/** Toggle a person's pin. Ignores self / nullish ids. Returns the new pinned state. */
export function togglePin(player, id) {
  if (!player || id == null || id === player.id) return false;
  const arr = ensurePinned(player);
  const idx = arr.indexOf(id);
  if (idx >= 0) {
    arr.splice(idx, 1);
    return false;
  }
  arr.push(id);
  return true;
}

/** Resolve pinned ids to person records (newest-first). Dead people are kept; missing ids dropped. */
export function pinnedPeople(player) {
  const arr = ensurePinned(player);
  const out = [];
  for (let i = arr.length - 1; i >= 0; i--) {
    const p = getPerson(arr[i]);
    if (p) out.push(p);
  }
  return out;
}
