/**
 * Magistrate NPC — bribe decision, household generation, trial synergy.
 */

import { G, getPerson } from '../state/gameState.js';
import { generateAdultWithHousehold } from './npcFamilyGen.js';
import { ensureRelationship, bumpDisposition, getRelationshipOrDefault } from './relationships.js';
import { suspicionTier, addSuspicion } from './crime.js';
import { trySpendMoney, getMoney } from './money.js';
import { spendActionPoints, canSpendActionPoints } from './actionPoints.js';
import { ANNALS_PRIORITY, proposeAnnals } from './annals.js';
import { isInPrison } from './prison.js';

export const MAGISTRATE_AP_COST = 1;

const TIER_BASE_COST = {
  curious: 8,
  watchful: 20,
  warrant: 50,
};

function ensureMagistrateState() {
  if (G.magistrate == null) G.magistrate = null;
  return G.magistrate;
}

export function getMagistrate() {
  const state = ensureMagistrateState();
  if (!state?.personId) return null;
  const person = getPerson(state.personId);
  if (!person?.isAlive) return null;
  return person;
}

export function magistrateEligible(player) {
  if (!player?.isAlive || !player.isPlayer) return false;
  if ((player.age ?? 0) < 18) return false;
  if (isInPrison(player)) return false;
  if (!canSpendActionPoints(player, MAGISTRATE_AP_COST)) return false;
  return suspicionTier(player) !== 'unnoticed';
}

function bribeCostMultiplier(mag) {
  if (!mag?.lastBribeYear) return 1;
  if (G.year - mag.lastBribeYear > 5) return 1;
  const count = mag.bribeCount || 1;
  return 1.5 ** (count - 1);
}

function recordBribe(mag) {
  if (mag.lastBribeYear && G.year - mag.lastBribeYear <= 5) {
    mag.bribeCount = (mag.bribeCount || 0) + 1;
  } else {
    mag.bribeCount = 1;
  }
  mag.lastBribeYear = G.year;
}

export function computeBribeCosts(player) {
  const tier = suspicionTier(player);
  const base = TIER_BASE_COST[tier] ?? TIER_BASE_COST.curious;
  const mag = getMagistrate();
  const magState = ensureMagistrateState();
  const mult = magState ? bribeCostMultiplier(magState) : 1;
  const edge = mag ? getRelationshipOrDefault(player, mag.id) : null;
  const disp = edge?.disposition ?? 0;
  const friendDiscount = disp > 50 ? 0.75 : 1;
  const modest = Math.ceil(base * mult * friendDiscount);
  const heavy = Math.ceil(base * 2.5 * mult * friendDiscount);
  return { modest, heavy, disposition: disp };
}

function generateMagistrateNpc(player) {
  const hadPrior = !!G.magistrate?.personId;
  const age = 45 + Math.floor(Math.random() * 16);
  const { focal, members } = generateAdultWithHousehold({
    age,
    sex: 'M',
    careerId: 'magistrate',
    wealth: 65,
  });
  // HOOK: blackmail — wife, Cambridge son, and dowryless daughter exist for future leverage.
  G.magistrate = {
    personId: focal.id,
    lastBribeYear: null,
    bribeCount: 0,
    bribedBefore: false,
  };
  ensureRelationship(player, focal.id, G.year, { disposition: 0 });
  if (hadPrior) {
    proposeAnnals({
      msg: 'The old magistrate is in the ground, and a new man holds the bench. Whatever understanding you had is buried with him.',
      type: 'bad',
      priority: ANNALS_PRIORITY.LIFE,
      category: 'crime',
    });
  }
  return { focal, members };
}

export function ensureMagistrateForApproach(player) {
  let mag = getMagistrate();
  if (!mag) {
    const gen = generateMagistrateNpc(player);
    mag = gen.focal;
  }
  return mag;
}

export function magistrateIntroBody(mag) {
  return (
    `They say Magistrate ${mag.surname} dines alone at the Grey Boar every Thursday, at the ` +
    `corner table with his back to the wall. They say he has a wife who wants a house in ` +
    `the country, a son at Cambridge, and a daughter in want of a dowry. They say many ` +
    `things about what a man in his position must weigh. You have coin enough to be worth ` +
    `weighing.`
  );
}

export function magistrateRepeatBody(mag, disposition) {
  if (disposition > 50) {
    return (
      `${mag.firstName} ${mag.surname} greets you these days almost as a friend — which is to say, he ` +
      `lets you buy the wine before either of you mentions money.`
    );
  }
  if (disposition < 0) {
    return (
      `The magistrate's clerk keeps you waiting an hour, and the great man does not rise ` +
      `when you enter. This will cost you, if he consents to be bought at all.`
    );
  }
  return (
    `Magistrate ${mag.surname} receives you in his chambers with the careful neutrality of a man ` +
    `who has learned the price of every favour and the cost of every refusal.`
  );
}

function magistrateRefuses(player, mag) {
  addSuspicion(player, 5);
  proposeAnnals({
    msg: 'A clumsy approach, noted in the wrong ledgers.',
    type: 'bad',
    priority: ANNALS_PRIORITY.FLAVOR,
    category: 'crime',
  });
  if (mag) bumpDisposition(player, mag.id, -3, G.year);
}

export function attemptMagistrateBribe(player, tier, { heavy = false } = {}) {
  const mag = ensureMagistrateForApproach(player);
  const costs = computeBribeCosts(player);
  const cost = heavy ? costs.heavy : costs.modest;
  const disp = costs.disposition;

  if (disp < 0) {
    magistrateRefuses(player, mag);
    return { ok: false, reason: 'refused' };
  }

  if (tier === 'warrant' && Math.random() < 0.15) {
    magistrateRefuses(player, mag);
    return { ok: false, reason: 'refused_public' };
  }

  if (getMoney(player) < cost) {
    return { ok: false, reason: 'cannot_afford' };
  }

  trySpendMoney(player, cost);
  const suspicionClear = heavy ? -30 : -15;
  const extraFriend = disp > 50 ? -5 : 0;
  addSuspicion(player, suspicionClear + extraFriend);
  bumpDisposition(player, mag.id, heavy ? 8 : 3, G.year);

  const magState = ensureMagistrateState();
  if (magState) {
    recordBribe(magState);
    magState.bribedBefore = true;
  }

  return { ok: true, cost, heavy };
}

export function spendMagistrateApproachAp(player) {
  if (!canSpendActionPoints(player, MAGISTRATE_AP_COST)) return false;
  return spendActionPoints(player, MAGISTRATE_AP_COST);
}

export function hasMagistrateTrialSynergy(player) {
  const magState = G.magistrate;
  if (!magState?.bribedBefore) return false;
  const mag = getMagistrate();
  if (!mag) return false;
  const edge = getRelationshipOrDefault(player, mag.id);
  return (edge?.disposition ?? 0) > 25;
}

export function isFirstMagistrateApproach() {
  return !G.magistrate?.personId;
}
