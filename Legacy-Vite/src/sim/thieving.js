/**
 * Thieving jobs — victim pick, pre-crime pending state, resolution, fence, pass-off.
 */

import { G, getAlive } from '../state/gameState.js';
import { getThievingDistrict, THIEVING_CONFIG } from '../data/thievingDistricts.js';
import { CAREERS_BY_ID } from '../data/careers.js';
import { ITEMS_BY_ID } from '../data/items.js';
import { relationLabel } from '../ui/relations.js';
import { clamp } from '../utils/index.js';
import { effectiveCharisma, effectiveCunning } from './itemEffects.js';
import { addMoney } from './money.js';
import { addHobbySkill, getHobbyLevel, isHobbyUnlocked } from './hobbies.js';
import { HOBBIES_BY_ID } from '../data/hobbies.js';
import {
  canSpendActionPoints,
  spendActionPoints,
} from './actionPoints.js';
import {
  addSuspicion,
  criminalRollPenalty,
} from './crime.js';
import { bumpDisposition, getRelationshipOrDefault } from './relationships.js';
import { getBoss, ensureWorkplaceState } from './workplace.js';
import { getPerson } from '../state/gameState.js';
import { addMaterial, materialCount, removeMaterial } from './personItems.js';
import { hasTrait } from './traits.js';
import { ANNALS_PRIORITY, proposeAnnals } from './annals.js';
import { statCap } from '../utils/statCap.js';

const CASED_BONUS = 15;

const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

export function wealthBandForNpc(npc) {
  const w = npc?.wealth ?? 0;
  if (w <= 9) return 'destitute';
  if (w <= 24) return 'poor';
  if (w <= 49) return 'middle';
  if (w <= 69) return 'rich';
  return 'wealthy';
}

function rollD20() {
  return Math.floor(Math.random() * 20) + 1;
}

function pickVictim(player, district) {
  const pool = getAlive().filter(
    (p) => !p.isPlayer && (p.age ?? 0) >= 14,
  );
  const bands = district.wealthBands || [];
  let candidates = pool.filter((p) => bands.includes(wealthBandForNpc(p)));

  if (district.preferCareers?.length && candidates.length) {
    const preferred = candidates.filter(
      (p) => district.preferCareers.includes(p.career?.id),
    );
    if (preferred.length && Math.random() < 0.6) {
      candidates = preferred;
    }
  }

  if (!candidates.length) {
    return { stranger: true, victimId: null };
  }

  const victim = candidates[Math.floor(Math.random() * candidates.length)];
  return { stranger: false, victimId: victim.id };
}

export function victimRevealContext(player, victimId) {
  if (!victimId) return ' — a stranger to you';
  const victim = getPerson(victimId);
  if (!victim) return ' — a stranger to you';

  const role = relationLabel(victim, player, { fallback: '' });
  if (role) return `, your ${role.toLowerCase()}`;

  const edge = getRelationshipOrDefault(player, victimId);
  const disp = edge?.disposition ?? 0;
  if (disp > 30) return ', whom you drink with on Sundays';
  if (disp < -20) return ', who already mistrusts you';
  return ' — a stranger to you';
}

export function victimDisplayName(victimId) {
  if (!victimId) return 'a stranger';
  const v = getPerson(victimId);
  if (!v) return 'a stranger';
  return `${v.firstName} ${v.surname}`.trim();
}

export function buildPreCrimeBody(player) {
  const pending = player._pendingThieve;
  if (!pending) return '';
  const name = victimDisplayName(pending.victimId);
  const ctx = victimRevealContext(player, pending.victimId);
  return (
    `You've watched the house for three nights. Tonight the servants' door will be left on ` +
    `the latch. But crossing the lamplight you finally see the owner's face — ${name}${ctx}.`
  );
}

export function canStartThievingJob(player, districtId) {
  if (!player?.isPlayer) return { ok: false, reason: 'not_player' };
  const district = getThievingDistrict(districtId);
  if (!district) return { ok: false, reason: 'invalid' };
  if (!isHobbyUnlocked(player, HOBBIES_BY_ID.thieving)) {
    return { ok: false, reason: 'locked' };
  }
  const skill = getHobbyLevel(player, 'thieving');
  if (skill < (district.skillReq ?? 0)) return { ok: false, reason: 'skill' };
  const cost = district.apCost ?? 1;
  if (!canSpendActionPoints(player, cost)) return { ok: false, reason: 'no_action_points' };
  if (player._pendingThieve) return { ok: false, reason: 'pending' };
  return { ok: true };
}

/** Spend AP, pick victim, queue pre-crime reveal. */
export function startThievingJob(player, districtId) {
  const check = canStartThievingJob(player, districtId);
  if (!check.ok) return check;

  const district = getThievingDistrict(districtId);
  const cost = district.apCost ?? 1;
  if (!spendActionPoints(player, cost)) {
    return { ok: false, reason: 'no_action_points' };
  }

  const { stranger, victimId } = pickVictim(player, district);
  player._pendingThieve = {
    districtId,
    victimId: stranger ? null : victimId,
    stranger,
  };

  return { ok: true, needsReveal: true };
}

function effectiveTakeRange(player, district) {
  if (player._casedDistrict !== district.id) {
    return { min: district.takeMin, max: district.takeMax };
  }
  const idx = THIEVING_CONFIG.districts.findIndex((d) => d.id === district.id);
  if (idx < 0 || idx >= THIEVING_CONFIG.districts.length - 1) {
    return { min: district.takeMin, max: district.takeMax };
  }
  const next = THIEVING_CONFIG.districts[idx + 1];
  return { min: next.takeMin, max: next.takeMax };
}

export function unlockedThievingDistrictsForPlayer(player) {
  const skill = getHobbyLevel(player, 'thieving');
  return THIEVING_CONFIG.districts.filter((d) => skill >= (d.skillReq ?? 0));
}

function expectedWealthBandForDistrict(district) {
  const bands = district.wealthBands || [];
  return bands[bands.length - 1] || 'poor';
}

function victimWealthExceedsDistrict(victim, district) {
  if (!victim) return false;
  const victimBand = wealthBandForNpc(victim);
  const expected = expectedWealthBandForDistrict(district);
  const rank = { destitute: 0, poor: 1, middle: 2, rich: 3, wealthy: 4 };
  return (rank[victimBand] ?? 0) > (rank[expected] ?? 0);
}

function rollHotGoods(player, district) {
  if (!district.hotGoodsChance || Math.random() >= district.hotGoodsChance) return null;
  const pool = district.hotGoodsPool || [];
  if (!pool.length) return null;
  const itemId = pool[Math.floor(Math.random() * pool.length)];
  if (!ITEMS_BY_ID[itemId]) return null;
  addMaterial(player, itemId, 1);
  return itemId;
}

function applyCriminalCareerBackOut(player) {
  applyCriminalCareerBackOutPenalty(player);
}

export function applyCriminalCareerBackOutPenalty(player) {
  const career = CAREERS_BY_ID[player.career?.id];
  if (career?.socialGroup !== 'criminal') return;

  const boss = getBoss(player);
  if (boss) bumpDisposition(player, boss.id, -10, G.year);

  const wp = ensureWorkplaceState();
  for (const id of wp?.coworkerIds || []) {
    bumpDisposition(player, id, -5, G.year);
  }

  proposeAnnals({
    msg: 'Word gets round the crew that your nerve failed at the door.',
    type: 'bad',
    priority: ANNALS_PRIORITY.FLAVOR,
    category: 'crime',
  });
}

export function backOutOfThievingJob(player) {
  const pending = player._pendingThieve;
  if (!pending) return false;
  delete player._pendingThieve;
  applyCriminalCareerBackOut(player);
  return true;
}

/** Resolve pending job after pre-crime Proceed. */
export function resolveThievingJob(player) {
  const pending = player._pendingThieve;
  if (!pending) return { ok: false, reason: 'no_pending' };

  const district = getThievingDistrict(pending.districtId);
  if (!district) {
    delete player._pendingThieve;
    return { ok: false, reason: 'invalid' };
  }

  delete player._pendingThieve;

  const victim = pending.victimId ? getPerson(pending.victimId) : null;
  let casedBonus = 0;
  if (player._casedDistrict === district.id) {
    casedBonus = CASED_BONUS;
    player._casedDistrict = null;
  }

  const skill = getHobbyLevel(player, 'thieving');
  const roll =
    skill +
    effectiveCunning(player) / 2 +
    casedBonus +
    rollD20() +
    criminalRollPenalty(player);
  const success = roll >= (district.difficulty ?? 20);
  const witnessed = !success || Math.random() < 0.25;

  if (!success) {
    addSuspicion(player, district.suspicionWitnessed, {
      type: 'theft',
      severity: district.ledgerSeverity ?? 1,
      witnessed: true,
    });
    if (Math.random() < 0.3) {
      if (!Array.isArray(player._crimeSituationQueue)) player._crimeSituationQueue = [];
      player._crimeSituationQueue.push('crime_trial');
    } else {
      const cap = statCap('health', !!player.isVampire, player);
      player.health = clamp((player.health ?? 0) - 5, 0, cap);
    }
    return {
      ok: true,
      outcome: 'failed',
      message: witnessed
        ? 'You were seen and fled over the rooftops, breathless and empty-handed.'
        : 'You scrambled over the rooftops empty-handed.',
      type: 'bad',
    };
  }

  let take = randInt(...Object.values(effectiveTakeRange(player, district)));
  if (victimWealthExceedsDistrict(victim, district)) {
    take = Math.round(take * 1.5);
  }
  addMoney(player, take);

  const suspicionDelta = witnessed ? district.suspicionWitnessed : district.suspicionClean;
  addSuspicion(player, suspicionDelta, {
    type: 'theft',
    severity: district.ledgerSeverity ?? 1,
    witnessed,
  });

  if (victim) {
    victim.wealth = clamp((victim.wealth ?? 0) - randInt(3, 8), 0, statCap('wealth', !!victim.isVampire));
    if (witnessed) bumpDisposition(player, victim.id, -40, G.year);
  }

  rollHotGoods(player, district);
  addHobbySkill(player, 'thieving', 0.5);
  const level = Math.round(getHobbyLevel(player, 'thieving'));

  return {
    ok: true,
    outcome: witnessed ? 'witnessed' : 'clean',
    message: `You worked ${district.label} and cleared £${take} (${district.jobLabel}). (Thieving skill now ${level}.)`,
    type: witnessed ? 'bad' : 'good',
    level,
  };
}

export function listHotGoodsIds(player) {
  if (!player) return [];
  const ids = [];
  for (const [itemId, count] of Object.entries(player.materials || {})) {
    if (count > 0 && ITEMS_BY_ID[itemId]?.hotGoods) ids.push(itemId);
  }
  return ids;
}

export function countHotGoods(player) {
  let n = 0;
  for (const id of listHotGoodsIds(player)) {
    n += materialCount(player, id);
  }
  return n;
}

export function fenceRateForPlayer(player) {
  return hasTrait(player, 'marked_by_rookeries') ? 0.55 : 0.4;
}

export function canVisitFence(player) {
  if (!player?.isPlayer) return false;
  if (!countHotGoods(player)) return false;
  const cost = 1;
  return canSpendActionPoints(player, cost);
}

export function visitFence(player) {
  if (!canVisitFence(player)) return { ok: false };
  if (!spendActionPoints(player, 1)) return { ok: false, reason: 'no_action_points' };

  const rate = fenceRateForPlayer(player);
  let total = 0;
  for (const itemId of [...listHotGoodsIds(player)]) {
    const def = ITEMS_BY_ID[itemId];
    const count = materialCount(player, itemId);
    const value = def?.fenceValue ?? 0;
    total += Math.round(value * rate) * count;
    removeMaterial(player, itemId, count);
  }

  addMoney(player, total);

  if (hasTrait(player, 'marked_by_rookeries')) {
    player.syndicateFencedBefore = true;
  }

  return {
    ok: true,
    total,
    rate,
    message: `The fence weighed your goods and paid £${total} — ${Math.round(rate * 100)}% of their whispered value.`,
  };
}

export function tryPassOffHotGoods(player, itemId) {
  const def = ITEMS_BY_ID[itemId];
  if (!def?.hotGoods || materialCount(player, itemId) < 1) {
    return { ok: false, reason: 'none' };
  }

  const roll = effectiveCharisma(player) / 2 + rollD20();
  if (roll >= 28) {
    const payout = def.fenceValue ?? 0;
    removeMaterial(player, itemId, 1);
    addMoney(player, payout);
    proposeAnnals({
      msg: 'You dabbed your eye and spoke of your late grandmother until the pawnbroker paid full price for the \'family heirloom.\'',
      type: 'good',
      priority: ANNALS_PRIORITY.FLAVOR,
      category: 'crime',
    });
    return { ok: true, payout };
  }

  addSuspicion(player, 4);
  proposeAnnals({
    msg: 'Pawnbrokers talk to constables.',
    type: 'bad',
    priority: ANNALS_PRIORITY.FLAVOR,
    category: 'crime',
  });
  return { ok: false, reason: 'failed' };
}

/** Yearly syndicate fence errand — separate from debt arc. */
export function tickSyndicateFenceJob(player, { fireSituation } = {}) {
  if (!player?.isPlayer || !player.isAlive || !player.crimePath) return;
  if (!hasTrait(player, 'marked_by_rookeries')) return;
  if (!player.syndicateFencedBefore) return;
  if (player._syndicateCollectsYear === G.year) return;
  if (Math.random() >= 0.15) return;
  if ((player.situations || []).some((s) => s.templateId === 'syndicate_fence_job')) return;
  if (typeof fireSituation === 'function') {
    fireSituation(player, 'syndicate_fence_job');
  }
}

export function backOutSyndicateFenceJob(player) {
  addSuspicion(player, 5);
  proposeAnnals({
    msg: 'The syndicate made sure the Watch heard your name.',
    type: 'bad',
    priority: ANNALS_PRIORITY.FLAVOR,
    category: 'crime',
  });
}
