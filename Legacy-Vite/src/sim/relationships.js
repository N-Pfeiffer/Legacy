import { G, getPerson } from '../state/gameState.js';
import {
  clampDisposition,
  clampEnthrallment,
  clampIntimacy,
  createRelationshipEdge,
  emptyRelationships,
  normalizeRelationshipMap,
  relationshipKey,
} from '../state/relationship.js';
import {
  ENEMY_DISPOSITION_THRESHOLD,
  FRIEND_DISPOSITION_THRESHOLD,
  LOVER_INTIMACY_THRESHOLD,
  SEED_EXTENDED_KIN,
  SEED_PARENT,
  SEED_SIBLING,
  STRANGER_MEET,
} from '../data/relationshipThresholds.js';
import { scaleRelationshipDelta } from './humorRelationshipMods.js';

function roster(people) {
  return people ?? G.people;
}

function personById(people, id) {
  return people.find((p) => p.id === id) ?? null;
}

function parentsOf(player, people) {
  return (player.parentIds || []).map((id) => personById(people, id)).filter(Boolean);
}

function siblingsOf(player, people) {
  const parentSet = new Set(player.parentIds || []);
  if (!parentSet.size) return [];
  return people.filter(
    (q) =>
      !q.isPlayer
      && q.id !== player.id
      && q.parentIds?.some((id) => parentSet.has(id)),
  );
}

function auntsUnclesOf(player, people) {
  const seen = new Set();
  const out = [];
  for (const parent of parentsOf(player, people)) {
    const parentSet = new Set(parent.parentIds || []);
    if (!parentSet.size) continue;
    for (const q of people) {
      if (q.id === player.id || q.id === parent.id) continue;
      if (!q.parentIds?.some((id) => parentSet.has(id))) continue;
      if (seen.has(q.id)) continue;
      seen.add(q.id);
      out.push(q);
    }
  }
  return out;
}

function cousinsOf(player, people) {
  const parentSet = new Set(player.parentIds || []);
  if (!parentSet.size) return [];
  const gpSet = new Set();
  for (const parent of parentsOf(player, people)) {
    for (const gpid of parent.parentIds || []) gpSet.add(gpid);
  }
  if (!gpSet.size) return [];
  const auIds = new Set(auntsUnclesOf(player, people).map((au) => au.id));
  return people.filter((q) => {
    if (q.id === player.id) return false;
    if (parentSet.has(q.id)) return false;
    if (q.parentIds?.some((id) => parentSet.has(id))) return false;
    if (auIds.has(q.id)) return false;
    return q.parentIds?.some((id) => gpSet.has(id));
  });
}

function getEdge(player, npcId) {
  if (!player?.relationships) return null;
  const edge = player.relationships[relationshipKey(npcId)];
  return edge ?? null;
}

export function getRelationship(player, npcId) {
  return getEdge(player, npcId);
}

/** Zeros when never met — for UI bars. */
export function getRelationshipOrDefault(player, npcId) {
  return getEdge(player, npcId) ?? createRelationshipEdge(STRANGER_MEET);
}

function ensureRelationshipArrays(player) {
  if (!Array.isArray(player.friendIds)) player.friendIds = [];
  if (!Array.isArray(player.loverIds)) player.loverIds = [];
  if (!Array.isArray(player.enemyIds)) player.enemyIds = [];
}

function pushBucket(arr, npcId) {
  if (!arr.includes(npcId)) arr.push(npcId);
}

export function ensureRelationship(player, npcId, year, partial = {}) {
  if (!player || npcId == null || npcId === player.id) return null;
  if (!player.relationships || typeof player.relationships !== 'object') {
    player.relationships = emptyRelationships();
  }

  const key = relationshipKey(npcId);
  const existing = player.relationships[key];
  if (existing) {
    if (partial.disposition != null) {
      existing.disposition = clampDisposition(partial.disposition);
    }
    if (partial.intimacy != null) {
      existing.intimacy = clampIntimacy(partial.intimacy);
    }
    if (partial.enthrallment != null) {
      existing.enthrallment = clampEnthrallment(partial.enthrallment);
    }
    if (partial.enthrallmentFloor != null) {
      existing.enthrallmentFloor = clampEnthrallment(partial.enthrallmentFloor);
    }
    if (partial.metYear != null) existing.metYear = partial.metYear;
    if (partial.lastInteractYear != null) {
      existing.lastInteractYear = partial.lastInteractYear;
    }
    return existing;
  }

  const edge = createRelationshipEdge({
    ...STRANGER_MEET,
    ...partial,
    metYear: partial.metYear ?? year,
    lastInteractYear: partial.lastInteractYear ?? null,
  });
  player.relationships[key] = edge;
  return edge;
}

function seedEdgeIfAbsent(player, npcId, year, seeds) {
  if (npcId == null || npcId === player.id) return;
  const key = relationshipKey(npcId);
  if (player.relationships[key]) return;
  player.relationships[key] = createRelationshipEdge({
    disposition: seeds.disposition,
    intimacy: seeds.intimacy,
    metYear: year,
    lastInteractYear: null,
  });
}

/** Idempotent family seeds after the tree exists. */
export function seedFamilyRelationships(player, year, people = null) {
  if (!player) return;
  if (!player.relationships || typeof player.relationships !== 'object') {
    player.relationships = emptyRelationships();
  }

  const list = roster(people);

  for (const parent of parentsOf(player, list)) {
    seedEdgeIfAbsent(player, parent.id, year, SEED_PARENT);
  }
  for (const sib of siblingsOf(player, list)) {
    seedEdgeIfAbsent(player, sib.id, year, SEED_SIBLING);
  }
  for (const au of auntsUnclesOf(player, list)) {
    seedEdgeIfAbsent(player, au.id, year, SEED_EXTENDED_KIN);
  }
  for (const cousin of cousinsOf(player, list)) {
    seedEdgeIfAbsent(player, cousin.id, year, SEED_EXTENDED_KIN);
  }
}

export function bumpDisposition(player, npcId, delta, year, context = null) {
  if (!player || npcId == null || npcId === player.id || !delta) return 0;
  ensureRelationship(player, npcId, year);
  const edge = getEdge(player, npcId);
  if (!edge) return 0;

  const npc = getPerson(npcId);
  const ctx = context ?? (delta > 0 ? 'disposition_gain' : 'disposition_loss');
  const scaled = scaleRelationshipDelta({ npc, stat: 'disposition', rawDelta: delta, context: ctx });

  edge.disposition = clampDisposition(edge.disposition + scaled);
  edge.lastInteractYear = year;
  return edge.disposition;
}

export function bumpIntimacy(player, npcId, delta, year, context = null) {
  if (!player || npcId == null || npcId === player.id || !delta) return 0;
  ensureRelationship(player, npcId, year);
  const edge = getEdge(player, npcId);
  if (!edge) return 0;

  const npc = getPerson(npcId);
  const ctx = context ?? (delta > 0 ? 'intimacy_gain' : 'intimacy_loss');
  const scaled = scaleRelationshipDelta({ npc, stat: 'intimacy', rawDelta: delta, context: ctx });

  edge.intimacy = clampIntimacy(edge.intimacy + scaled);
  edge.lastInteractYear = year;
  return edge.intimacy;
}

export function bumpEnthrallment(player, npcId, delta, year, context = null) {
  if (!player || npcId == null || npcId === player.id || !delta) return 0;
  ensureRelationship(player, npcId, year);
  const edge = getEdge(player, npcId);
  if (!edge) return 0;

  const npc = getPerson(npcId);
  const ctx = context ?? (delta > 0 ? 'enthrallment_gain' : 'enthrallment_loss');
  const scaled = scaleRelationshipDelta({ npc, stat: 'enthrallment', rawDelta: delta, context: ctx });

  edge.enthrallment = clampEnthrallment(edge.enthrallment + scaled);
  edge.lastInteractYear = year;
  return edge.enthrallment;
}

/** Hybrid promotion: add to friend/lover/enemy arrays when thresholds crossed; never auto-remove. */
export function syncSocialBuckets(player) {
  if (!player) return;
  ensureRelationshipArrays(player);
  if (!player.relationships) return;

  for (const key of Object.keys(player.relationships)) {
    const npcId = parseInt(key, 10);
    if (Number.isNaN(npcId)) continue;
    const edge = player.relationships[key];
    if (!edge) continue;

    if (edge.disposition <= ENEMY_DISPOSITION_THRESHOLD) {
      pushBucket(player.enemyIds, npcId);
    }
    if (edge.disposition >= FRIEND_DISPOSITION_THRESHOLD) {
      pushBucket(player.friendIds, npcId);
    }
    if (edge.intimacy >= LOVER_INTIMACY_THRESHOLD) {
      pushBucket(player.loverIds, npcId);
    }
  }
}

export function migratePlayerRelationships(player, year, people) {
  if (!player?.isPlayer) return;
  if (!player.relationships || typeof player.relationships !== 'object') {
    player.relationships = emptyRelationships();
  }
  normalizeRelationshipMap(player, people);
  seedFamilyRelationships(player, year, people);
  syncSocialBuckets(player);
}
