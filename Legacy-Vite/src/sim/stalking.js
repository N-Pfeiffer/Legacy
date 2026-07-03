import { CAREERS_BY_ID } from '../data/careers.js';
import { TRAITS_BY_ID } from '../data/traits.js';
import { THIEVING_CONFIG, getThievingDistrict } from '../data/thievingDistricts.js';
import { G, getAlive, getPerson } from '../state/gameState.js';
import { pick, clamp } from '../utils/index.js';
import {
  canSpendActionPoints,
  spendActionPoints,
} from './actionPoints.js';
import { addHobbySkill, getHobbyLevel, isHobbyUnlocked } from './hobbies.js';
import { HOBBIES_BY_ID } from '../data/hobbies.js';
import { effectiveStat } from './itemEffects.js';
import { addMoney } from './money.js';
import { addSuspicion, criminalRollPenalty } from './crime.js';
import {
  ensureRelationship,
  syncSocialBuckets,
} from './relationships.js';
import { hasTrait } from './traits.js';
import { killPerson } from './mortality.js';
import { applyCriminalCareerBackOutPenalty, victimDisplayName, victimRevealContext, wealthBandForNpc } from './thieving.js';
import { statCap } from '../utils/statCap.js';

const CASE_MARK_AP = 2;
const CONTRACT_CHANCE = 0.4;
const FEE_BY_BAND = {
  destitute: 30,
  poor: 40,
  middle: 60,
  rich: 100,
  wealthy: 150,
};

function personDisplayName(p) {
  return [p.firstName, p.surname].filter(Boolean).join(' ') || 'a stranger';
}

function spyDetail(target) {
  if (target.traits?.length) {
    const traitId = pick(target.traits);
    const trait = TRAITS_BY_ID[traitId];
    if (trait?.label) return `they bear the mark of ${trait.label.toLowerCase()}`;
  }
  const career = target.career?.id ? CAREERS_BY_ID[target.career.id] : null;
  if (career) {
    const name = career.label || career.labelBySex?.[target.sex] || career.id.replace(/_/g, ' ');
    return `they earn their keep as a ${name.toLowerCase()}`;
  }
  if (target.enemyIds?.length) return 'they quarrel with half the parish';
  if (target.loverIds?.length) return 'they keep a secret rendezvous after dusk';
  return 'they slip through crowds with practiced ease';
}

function rollD20() {
  return Math.floor(Math.random() * 20) + 1;
}

function weightedPick(items, weights) {
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (!items.length || total <= 0) return null;
  let roll = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function underworldKnowsPlayer(player) {
  if (!player?.isPlayer) return false;
  const career = player.career?.id ? CAREERS_BY_ID[player.career.id] : null;
  if (career?.socialGroup === 'criminal') return true;
  if (hasTrait(player, 'marked_by_rookeries')) return true;
  return (player.suspicion ?? 0) >= 25;
}

export function unlockedThievingDistricts(player) {
  if (!player?.crimePath) return [];
  const skill = getHobbyLevel(player, 'thieving');
  return THIEVING_CONFIG.districts.filter((d) => skill >= (d.skillReq ?? 0));
}

export function runStalkingSpy(player) {
  if (!player?.isPlayer) return { ok: false, reason: 'not_player' };
  if (!isHobbyUnlocked(player, HOBBIES_BY_ID.stalking)) return { ok: false, reason: 'locked' };

  const cost = 1;
  if (!canSpendActionPoints(player, cost)) return { ok: false, reason: 'no_action_points' };
  if (!spendActionPoints(player, cost)) return { ok: false, reason: 'no_action_points' };

  const targets = getAlive().filter((p) => !p.isPlayer && (p.age ?? 0) >= 14);
  if (!targets.length) {
    return { ok: false, reason: 'no_targets', message: 'There is no one worth watching this year.' };
  }

  const target = pick(targets);
  addHobbySkill(player, 'stalking', 0.5);
  const level = Math.round(getHobbyLevel(player, 'stalking'));
  const name = personDisplayName(target);
  const detail = spyDetail(target);

  return {
    ok: true,
    message: `You shadowed ${name} and learned that ${detail}. (Stalking skill now ${level}.)`,
    type: 'info',
    level,
  };
}

export function canCaseMark(player, districtId) {
  if (!player?.isPlayer) return { ok: false, reason: 'not_player' };
  if (!isHobbyUnlocked(player, HOBBIES_BY_ID.stalking)) return { ok: false, reason: 'locked' };
  if (!getThievingDistrict(districtId)) return { ok: false, reason: 'invalid' };
  if (!unlockedThievingDistricts(player).some((d) => d.id === districtId)) {
    return { ok: false, reason: 'district_locked' };
  }
  if (!canSpendActionPoints(player, CASE_MARK_AP)) return { ok: false, reason: 'no_action_points' };
  return { ok: true };
}

export function runCaseMark(player, districtId) {
  const check = canCaseMark(player, districtId);
  if (!check.ok) return check;
  if (!spendActionPoints(player, CASE_MARK_AP)) {
    return { ok: false, reason: 'no_action_points' };
  }

  player._casedDistrict = districtId;
  addHobbySkill(player, 'stalking', 0.5);
  const level = Math.round(getHobbyLevel(player, 'stalking'));
  const label = getThievingDistrict(districtId)?.label || districtId;

  return {
    ok: true,
    message:
      `You cased ${label} — routes, habits, and the hour your mark is most alone. ` +
      `Your next job there will profit. (Stalking skill now ${level}.)`,
    type: 'info',
    level,
  };
}

export function pickContractTarget() {
  const pool = getAlive().filter((p) => !p.isPlayer && (p.age ?? 0) >= 14);
  if (!pool.length) return null;

  const weights = pool.map((p) => {
    const band = wealthBandForNpc(p);
    let w = 1;
    if (band === 'rich' || band === 'wealthy') w += 3;
    w += (p.enemyIds?.length ?? 0) * 0.5;
    return w;
  });

  return weightedPick(pool, weights);
}

export function contractFeeForTarget(target) {
  const band = wealthBandForNpc(target);
  return FEE_BY_BAND[band] ?? 60;
}

export function buildAssassinContractBody(player) {
  const offer = player?._assassinContractOffer;
  if (!offer) return '';
  const name = victimDisplayName(offer.targetId);
  const ctx = victimRevealContext(player, offer.targetId);
  return (
    `A folded note names ${name}${ctx}. The fee is £${offer.fee}, half now and half when the work is done. ` +
    'The knife is already paid for. Should the Watch hang you at Newgate, no one from the syndicate will weep.'
  );
}

export function buildAssassinPreCrimeBody(player) {
  const pending = player?._pendingAssassin;
  if (!pending) return '';
  const name = victimDisplayName(pending.targetId);
  const ctx = victimRevealContext(player, pending.targetId);
  return (
    `The contract names ${name}${ctx}. The knife is already paid for. ` +
    'There is no warrant out yet — but the gallows are real, and the Watch remembers a face in a crowd.'
  );
}

export function acceptAssassinContract(player) {
  const offer = player?._assassinContractOffer;
  if (!offer) return { ok: false, reason: 'no_offer' };

  player._pendingAssassin = {
    targetId: offer.targetId,
    fee: offer.fee,
    syndicate: !!offer.syndicate,
  };
  delete player._assassinContractOffer;

  if (!Array.isArray(player._crimeSituationQueue)) player._crimeSituationQueue = [];
  player._crimeSituationQueue.push('assassin_pre_crime');

  return { ok: true };
}

export function declineAssassinContract(player) {
  const offer = player?._assassinContractOffer;
  if (!offer) return false;
  delete player._assassinContractOffer;
  if (offer.syndicate) addSuspicion(player, 5);
  return true;
}

export function backOutOfAssassinJob(player) {
  const pending = player?._pendingAssassin;
  if (!pending) return false;
  const syndicate = pending.syndicate;
  delete player._pendingAssassin;
  applyCriminalCareerBackOutPenalty(player);
  if (syndicate) addSuspicion(player, 5);
  return true;
}

export function resolveAssassinationContract(player) {
  const pending = player?._pendingAssassin;
  if (!pending) return { ok: false, reason: 'no_pending' };

  const target = getPerson(pending.targetId);
  delete player._pendingAssassin;

  if (!target?.isAlive) {
    return {
      ok: true,
      outcome: 'vanished',
      message: 'By the time you reached the mark, they were already gone — dead or fled.',
      type: 'info',
    };
  }

  const skill = getHobbyLevel(player, 'stalking');
  const roll =
    skill +
    effectiveStat(player, 'prowess') / 2 +
    rollD20() +
    criminalRollPenalty(player);
  const dc = effectiveStat(target, 'prowess') + 15;

  // HOOK: vampire — feeding / draining attach here later.

  if (roll < dc) {
    ensureRelationship(player, target.id, G.year, { disposition: -100 });
    syncSocialBuckets(player);
    const cap = statCap('health', !!player.isVampire, player);
    player.health = clamp((player.health ?? 0) - 15, 0, cap);
    addSuspicion(player, 15, { type: 'murder', severity: 8 });
    const name = personDisplayName(target);
    return {
      ok: true,
      outcome: 'botched',
      message: `${name} saw you coming. You fled bloodied and empty-handed — and they will not forget your face.`,
      type: 'bad',
    };
  }

  const witnessed = Math.random() < 0.25;
  killPerson(target);
  addMoney(player, pending.fee);
  addHobbySkill(player, 'stalking', 1);
  const level = Math.round(getHobbyLevel(player, 'stalking'));
  const name = personDisplayName(target);

  if (witnessed) {
    addSuspicion(player, 25, { type: 'murder', severity: 8, witnessed: true });
    return {
      ok: true,
      outcome: 'witnessed',
      message:
        `You cut ${name} down in the dark, but someone saw. The fee is yours — £${pending.fee}. ` +
        `(Stalking skill now ${level}.)`,
      type: 'bad',
      level,
    };
  }

  addSuspicion(player, 10, { type: 'murder', severity: 8 });
  return {
    ok: true,
    outcome: 'clean',
    message:
      `You cut ${name} down cleanly. The fee is yours — £${pending.fee}. ` +
      `(Stalking skill now ${level}.)`,
    type: 'good',
    level,
  };
}

export function tickAssassinContracts(player, { fireSituation } = {}) {
  if (!player?.isAlive || !player.isPlayer) return;
  if (player._pendingAssassin || player._assassinContractOffer) return;
  if (getHobbyLevel(player, 'stalking') < 50) return;
  if (!underworldKnowsPlayer(player)) return;
  if (Math.random() >= CONTRACT_CHANCE) return;

  const target = pickContractTarget();
  if (!target) return;

  player._assassinContractOffer = {
    targetId: target.id,
    fee: contractFeeForTarget(target),
    syndicate: hasTrait(player, 'marked_by_rookeries'),
  };

  if (typeof fireSituation === 'function') {
    fireSituation(player, 'assassin_contract');
  } else {
    if (!Array.isArray(player._crimeSituationQueue)) player._crimeSituationQueue = [];
    player._crimeSituationQueue.push('assassin_contract');
  }
}
