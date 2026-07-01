import {

  getRelationshipOrDefault,

  bumpDisposition,

  bumpIntimacy,

  ensureRelationship,

  syncSocialBuckets,

} from './relationships.js';

import { marryPersons } from './marriage.js';

import { tryConceiveFromPair } from './conception.js';

import {

  getActionPointCost,

  canSpendActionPoints,

  spendActionPoints,

} from './actionPoints.js';

import {

  PROPOSE_INTIMACY_REQUIRED,

  parseProposalRingActionId,

  getProposalRingTier,

  canAffordProposalRingTier,

  isProposalAttemptAction,

  computeMarriageProposalChance,

} from '../data/marriageProposal.js';

import { clamp, statCap } from '../utils/index.js';

import { G } from '../state/gameState.js';

import { addGrade } from './grade.js';



/** Intimacy must exceed this value (strictly above 25). */

export const INTERACT_SEX_INTIMACY_MIN = 26;



function buildChoiceDefs() {

  return [

    { id: 'spend_time', label: 'Spend time' },

    { id: 'study_with', label: 'Study with' },

    { id: 'flirt', label: 'Flirt' },

    { id: 'insult', label: 'Insult' },

    {

      id: 'have_sex',

      label: 'Make Love',

      requiresIntimacy: INTERACT_SEX_INTIMACY_MIN,

    },

    { id: 'propose_marriage', label: 'Propose Marriage' },

  ].map((def) => ({

    ...def,

    apCost: getActionPointCost(def.id),

  }));

}



function noActionPointsResult() {

  return { ok: false, reason: 'no_action_points' };

}



function spendForInteraction(player, actionId) {

  const cost = getActionPointCost(actionId);

  if (!canSpendActionPoints(player, cost)) return noActionPointsResult();

  if (!spendActionPoints(player, cost)) return noActionPointsResult();

  return null;

}



/** "Study with" — only for an enrolled classmate the player is on decent terms with. */
function canStudyWith(player, target, edge) {

  const stage = player?.education?.stage;

  if (stage !== 'primary' && stage !== 'secondary') return false;

  if (!(G.school?.studentIds || []).includes(target.id)) return false;

  return (edge?.disposition ?? 0) > 19;

}



export function getAvailableInteractChoices(player, target) {

  if (!player || !target || target.isPlayer || !target.isAlive) return [];



  const edge = getRelationshipOrDefault(player, target.id);

  const alreadySpouses = (player.spouseIds || []).includes(target.id);

  const choiceDefs = buildChoiceDefs();



  return choiceDefs.filter((def) => {

    if (def.requiresIntimacy != null && edge.intimacy < def.requiresIntimacy) return false;

    if (def.id === 'propose_marriage' && alreadySpouses) return false;

    if (def.id === 'study_with' && !canStudyWith(player, target, edge)) return false;

    return true;

  });

}



export function canAffordProposalRing(player, ringId) {

  return canAffordProposalRingTier(player, getProposalRingTier(ringId));

}



/**

 * Attempt marriage proposal (simple or with a ring tier).

 */

export function performMarriageProposal(player, target, actionId, year) {

  if (!player || !target || target.isPlayer || !target.isAlive) {

    return { ok: false };

  }



  const apBlock = spendForInteraction(player, actionId);

  if (apBlock) return apBlock;



  ensureRelationship(player, target.id, year);



  if ((player.spouseIds || []).includes(target.id)) {

    return { ok: false };

  }



  const edge = getRelationshipOrDefault(player, target.id);

  const ringId = parseProposalRingActionId(actionId);

  const ringTier = ringId ? getProposalRingTier(ringId) : null;



  if (ringTier && !canAffordProposalRingTier(player, ringTier)) {

    return {

      ok: true,

      showProposalResult: 'cannot_afford',

      targetId: target.id,

      ringLabel: ringTier.label,

    };

  }



  if (ringTier) {

    const cap = statCap('wealth', player.isVampire);

    player.wealth = clamp(player.wealth - ringTier.wealthCost, 0, cap);

  }



  if (edge.intimacy < PROPOSE_INTIMACY_REQUIRED) {

    bumpDisposition(player, target.id, -5, year, 'disposition_loss');

    syncSocialBuckets(player);

    return {

      ok: true,

      showProposalResult: 'insufficient_bond',

      targetId: target.id,

    };

  }



  const chance = computeMarriageProposalChance(edge, { ringTier });

  const accepted = Math.random() < chance;



  if (accepted) {

    if (!marryPersons(player, target)) return { ok: false };

    syncSocialBuckets(player);

    return {

      ok: true,

      showProposalResult: 'success',

      targetId: target.id,

    };

  }



  bumpDisposition(player, target.id, -5, year, 'disposition_loss');

  syncSocialBuckets(player);

  return {

    ok: true,

    showProposalResult: 'failure',

    targetId: target.id,

  };

}



/**

 * Perform a social interaction for the current year.

 * @returns {{ ok: boolean, message?: string, html?: boolean, type?: string, openProposePanel?: boolean, reason?: string }}

 */

export function performPersonInteraction(player, target, actionId, year, {

  personNameHtml,

  currentFertility,

}) {

  if (!player || !target || target.isPlayer || !target.isAlive) {

    return { ok: false };

  }



  const name = typeof personNameHtml === 'function' ? personNameHtml(target) : target.firstName;

  ensureRelationship(player, target.id, year);



  switch (actionId) {

    case 'spend_time': {

      const apBlock = spendForInteraction(player, actionId);

      if (apBlock) return apBlock;

      bumpDisposition(player, target.id, 3, year, 'disposition_gain');

      bumpIntimacy(player, target.id, 2, year, 'intimacy_gain');

      syncSocialBuckets(player);

      return {

        ok: true,

        html: true,

        type: 'info',

        message: `You spent time with ${name}.`,

      };

    }



    case 'flirt': {

      const apBlock = spendForInteraction(player, actionId);

      if (apBlock) return apBlock;

      bumpIntimacy(player, target.id, 5, year, 'intimacy_gain');

      syncSocialBuckets(player);

      return {

        ok: true,

        html: true,

        type: 'info',

        message: `You flirted with ${name}.`,

      };

    }



    case 'insult': {

      const apBlock = spendForInteraction(player, actionId);

      if (apBlock) return apBlock;

      bumpDisposition(player, target.id, -8, year, 'insult');

      syncSocialBuckets(player);

      return {

        ok: true,

        html: true,

        type: 'bad',

        message: `You insulted ${name}.`,

      };

    }



    case 'have_sex': {

      const intimacy = getRelationshipOrDefault(player, target.id).intimacy;

      if (intimacy < INTERACT_SEX_INTIMACY_MIN) return { ok: false };

      const apBlock = spendForInteraction(player, actionId);

      if (apBlock) return apBlock;

      bumpIntimacy(player, target.id, 10, year, 'intimacy_gain');

      bumpDisposition(player, target.id, 3, year, 'disposition_gain');

      syncSocialBuckets(player);

      const conceived = typeof currentFertility === 'function'

        && tryConceiveFromPair(player, target, year, { currentFertility });

      const baseMsg = `You made love with ${name}.`;

      return {

        ok: true,

        html: true,

        type: 'info',

        conceived: !!conceived,

        message: conceived

          ? `${baseMsg} You may have conceived.`

          : baseMsg,

      };

    }



    case 'study_with': {

      if (!canStudyWith(player, target, getRelationshipOrDefault(player, target.id))) {

        return { ok: false };

      }

      const apBlock = spendForInteraction(player, actionId);

      if (apBlock) return apBlock;

      addGrade(player, 34);

      bumpDisposition(player, target.id, 5, year, 'disposition_gain');

      syncSocialBuckets(player);

      return {

        ok: true,

        html: true,

        type: 'info',

        message: `You studied with ${name}.`,

      };

    }



    case 'propose_marriage':

      return { ok: true, openProposePanel: true };



    default:

      if (isProposalAttemptAction(actionId)) {

        return performMarriageProposal(player, target, actionId, year);

      }

      return { ok: false };

  }

}


