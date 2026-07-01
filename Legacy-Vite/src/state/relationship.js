/** Player↔NPC relationship edge shape and normalization. */

export const RELATIONSHIP_EDGE_DEFAULTS = {
  disposition: 0,
  intimacy: 0,
  enthrallment: 0,
  enthrallmentFloor: 0,
  metYear: null,
  lastInteractYear: null,
};

export function emptyRelationships() {
  return {};
}

export function relationshipKey(npcId) {
  return String(npcId);
}

export function clampDisposition(value) {
  const n = Math.round(Number(value) || 0);
  return Math.max(-100, Math.min(100, n));
}

export function clampIntimacy(value) {
  const n = Math.round(Number(value) || 0);
  return Math.max(-100, Math.min(100, n));
}

export function clampEnthrallment(value) {
  const n = Math.round(Number(value) || 0);
  return Math.max(0, Math.min(100, n));
}

function normalizeEdge(raw, metYearFallback = null) {
  const edge = { ...RELATIONSHIP_EDGE_DEFAULTS };
  if (raw && typeof raw === 'object') {
    edge.disposition = clampDisposition(raw.disposition);
    edge.intimacy = clampIntimacy(raw.intimacy);
    edge.enthrallment = clampEnthrallment(raw.enthrallment);
    edge.enthrallmentFloor = clampEnthrallment(raw.enthrallmentFloor ?? 0);
    edge.metYear =
      typeof raw.metYear === 'number' && Number.isFinite(raw.metYear)
        ? raw.metYear
        : metYearFallback;
    edge.lastInteractYear =
      typeof raw.lastInteractYear === 'number' && Number.isFinite(raw.lastInteractYear)
        ? raw.lastInteractYear
        : null;
  }
  if (edge.metYear == null && metYearFallback != null) {
    edge.metYear = metYearFallback;
  }
  return edge;
}

/**
 * Coerce player.relationships to string keys, clamp values, drop invalid npc ids.
 * @param {object} player
 * @param {object[]} [people] — roster used to validate ids (defaults to none: keep all numeric keys)
 */
export function normalizeRelationshipMap(player, people = null) {
  if (!player) return;
  if (!player.relationships || typeof player.relationships !== 'object') {
    player.relationships = emptyRelationships();
    return;
  }

  const validIds = people
    ? new Set(people.filter((p) => !p.isPlayer).map((p) => p.id))
    : null;

  const next = {};
  for (const [key, raw] of Object.entries(player.relationships)) {
    const npcId = parseInt(key, 10);
    if (Number.isNaN(npcId)) continue;
    if (validIds && !validIds.has(npcId)) continue;
    next[relationshipKey(npcId)] = normalizeEdge(raw);
  }
  player.relationships = next;
}

export function createRelationshipEdge(partial = {}) {
  return normalizeEdge(partial, partial.metYear ?? null);
}
