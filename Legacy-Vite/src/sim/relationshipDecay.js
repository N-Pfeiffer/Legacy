import { getPerson, getParents, getGrandparents } from '../state/gameState.js';
import {
  clampDisposition,
  clampEnthrallment,
  clampIntimacy,
} from '../state/relationship.js';
import {
  DECAY_HIGH_BOND_THRESHOLD,
  DECAY_RATE_BONDED,
  DECAY_RATE_DISPOSITION,
  DECAY_RATE_ENTHRALLMENT,
  DECAY_RATE_INTIMACY,
  DECAY_SOFT_CAP,
  ENTHRALLMENT_DECAY_FREEZE,
} from '../data/relationshipDecay.js';
import { scaleRelationshipDelta } from './humorRelationshipMods.js';
import { syncSocialBuckets } from './relationships.js';

/**
 * Apply one year of drift toward zero, with humor scaling on the decay step.
 */
function applyDecayTowardZero(value, rate, npc, stat) {
  if (!value || !rate) return value;

  const rawDelta = value > 0 ? -rate : rate;
  const scaledDelta = scaleRelationshipDelta({
    npc,
    stat,
    rawDelta: rawDelta,
    context: 'natural_decay',
  });

  const next = value + scaledDelta;
  if (value > 0) return Math.max(0, next);
  if (value < 0) return Math.min(0, next);
  return 0;
}

function decayDisposition(edge, rate, npc, { floor = null } = {}) {
  if (!edge.disposition) return;

  let next = applyDecayTowardZero(edge.disposition, rate, npc, 'disposition');
  next = clampDisposition(Math.round(next));

  if (floor != null && edge.disposition > floor && next < floor) {
    next = floor;
  }

  edge.disposition = next;
}

function decayIntimacy(edge, rate, npc) {
  if (!edge.intimacy) return;

  const next = clampIntimacy(Math.round(
    applyDecayTowardZero(edge.intimacy, rate, npc, 'intimacy'),
  ));
  edge.intimacy = next;
}

function decayEnthrallment(edge, rate, npc) {
  if (!edge.enthrallment) return;

  const floor = clampEnthrallment(edge.enthrallmentFloor ?? 0);
  let next = applyDecayTowardZero(edge.enthrallment, rate, npc, 'enthrallment');
  next = clampEnthrallment(Math.round(next));

  if (next < floor) next = floor;
  edge.enthrallment = next;
}

/** Parents and grandparents do not lose bond stats to natural decay. */
function decayExemptNpcIds(player) {
  const ids = new Set();
  for (const p of getParents(player)) ids.add(p.id);
  for (const gp of getGrandparents(player)) ids.add(gp.id);
  return ids;
}

/** Natural yearly decay on all player relationship edges. */
export function tickRelationshipDecay(player) {
  if (!player?.relationships) return;

  const exemptIds = decayExemptNpcIds(player);

  for (const key of Object.keys(player.relationships)) {
    const npcId = parseInt(key, 10);
    if (Number.isNaN(npcId)) continue;

    if (exemptIds.has(npcId)) continue;

    const npc = getPerson(npcId);
    if (!npc?.isAlive) continue;

    const edge = player.relationships[key];
    if (!edge) continue;

    if (edge.enthrallmentFloor == null) {
      edge.enthrallmentFloor = 0;
    }

    if (!edge.disposition && !edge.intimacy && !edge.enthrallment) continue;

    decayEnthrallment(edge, DECAY_RATE_ENTHRALLMENT, npc);

    const enthrallment = edge.enthrallment ?? 0;
    const disposition = edge.disposition ?? 0;
    const intimacy = edge.intimacy ?? 0;

    if (enthrallment > ENTHRALLMENT_DECAY_FREEZE) {
      if (disposition < 0) {
        decayDisposition(edge, DECAY_RATE_DISPOSITION, npc);
      }
      continue;
    }

    const highBond = disposition > DECAY_HIGH_BOND_THRESHOLD
      && intimacy > DECAY_HIGH_BOND_THRESHOLD;

    if (highBond) {
      decayDisposition(edge, DECAY_RATE_BONDED, npc, { floor: DECAY_SOFT_CAP });
      decayIntimacy(edge, DECAY_RATE_BONDED, npc);
      continue;
    }

    if (disposition !== 0) {
      const dispFloor = disposition > DECAY_SOFT_CAP ? DECAY_SOFT_CAP : null;
      decayDisposition(edge, DECAY_RATE_DISPOSITION, npc, { floor: dispFloor });
    }

    if (intimacy !== 0) {
      decayIntimacy(edge, DECAY_RATE_INTIMACY, npc);
    }
  }

  syncSocialBuckets(player);
}

/** Backfill enthrallmentFloor on relationship edges (save migration). */
export function backfillRelationshipEdgeFloors(player) {
  if (!player?.relationships) return;
  for (const edge of Object.values(player.relationships)) {
    if (!edge || typeof edge !== 'object') continue;
    if (edge.enthrallmentFloor == null) {
      edge.enthrallmentFloor = 0;
    }
  }
}
