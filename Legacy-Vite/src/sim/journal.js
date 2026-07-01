import { G, getPlayer, getParents, getChildren, getScions } from '../state/gameState.js';

/** Recompute cached `_journaled` on every person (once per year tick). */
export function recomputeJournalFlags() {
  const player = getPlayer();
  if (!player) {
    for (const p of G.people) p._journaled = false;
    return;
  }

  const journaled = new Set([player.id]);
  const add = (id) => {
    if (id) journaled.add(id);
  };
  for (const id of player.parentIds) add(id);
  for (const id of player.childIds) add(id);
  for (const id of player.spouseIds) add(id);
  for (const id of player.exSpouseIds) add(id);
  for (const id of player.loverIds) add(id);
  for (const id of player.friendIds) add(id);
  for (const id of player.enemyIds) add(id);
  for (const id of player.childerIds) add(id);
  for (const id of player.minionIds) add(id);
  if (player.sireId) add(player.sireId);
  if (player.masterId) add(player.masterId);

  for (const key of Object.keys(player.relationships || {})) {
    const id = parseInt(key, 10);
    if (!Number.isNaN(id)) add(id);
  }

  if (player.parentIds.length) {
    const playerParents = new Set(player.parentIds);
    for (const p of G.people) {
      if (p.parentIds.some((id) => playerParents.has(id))) journaled.add(p.id);
    }
    const gpIds = new Set();
    for (const parent of getParents(player)) {
      for (const gpid of parent.parentIds) {
        gpIds.add(gpid);
        add(gpid);
      }
    }
    if (gpIds.size) {
      for (const p of G.people) {
        if (
          p.parentIds.some((id) => gpIds.has(id)) &&
          !p.parentIds.some((id) => playerParents.has(id))
        ) {
          journaled.add(p.id);
        }
      }
    }
  }

  for (const child of getChildren(player)) {
    for (const gc of getChildren(child)) add(gc.id);
  }
  for (const scion of getScions(player)) add(scion.id);

  for (const p of G.people) p._journaled = journaled.has(p.id);
}

/** Whether this person gets full simulation (player, family, or relationship graph). */
export function isJournaled(p) {
  if (!p) return false;
  if (p.isPlayer) return true;
  if (typeof p._journaled === 'boolean') return p._journaled;
  recomputeJournalFlags();
  return !!p._journaled;
}
