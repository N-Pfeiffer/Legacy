/** Minimum intimacy for a proposal to have any real chance of success. */
export const PROPOSE_INTIMACY_REQUIRED = 50;

/** Ring tiers: wealth cost and flat success bonus when proposing. */
export const PROPOSAL_RING_TIERS = [
  { id: 'silver', label: 'Silver ring', wealthCost: 20, chanceBonus: 0.10 },
  { id: 'gold', label: 'Gold ring', wealthCost: 40, chanceBonus: 0.20 },
  { id: 'diamond', label: 'Diamond ring', wealthCost: 60, chanceBonus: 0.32 },
];

/** Vampire may override a refusal when enthrallment is strictly above this value. */
export const PROPOSE_ENTHRALLMENT_FORCE_MIN = 20;

export const PROPOSAL_SUCCESS_BODY =
  'The parish bells ring. The vows have been spoken, the terms of the estate settled, ' +
  'and your lives are now legally and financially bound. Whatever affection exists between you, ' +
  'the law now views you as a single, indivisible entity.';

export const PROPOSAL_FAILURE_BODY =
  'You extend an offer of marriage, but it is declined. Whether due to station, timing, ' +
  'or personal feeling, they will not accept your suit.';

export const PROPOSAL_INSUFFICIENT_BOND_BODY =
  'You offer marriage, but they refuse you. The bond between you is not close enough yet — ' +
  'they will not entertain your suit.';

export const PROPOSAL_CANNOT_AFFORD_TITLE = 'Cannot afford';

export const PROPOSAL_FORCE_REFUSAL_BUTTON_LABEL =
  'You Refuse Their Refusal [Requires: Enthrallment 20]';

export const PROPOSAL_FORCE_REFUSAL_BODY =
  'You allow them their little speech of refusal, smiling through your fangs. ' +
  'Then, you assert your dominance. They do not get to say no.';

export function getProposalRingTier(ringId) {
  return PROPOSAL_RING_TIERS.find((t) => t.id === ringId) ?? null;
}

export function proposalRingActionId(ringId) {
  return `propose_ring_${ringId}`;
}

export function parseProposalRingActionId(actionId) {
  if (!actionId || !actionId.startsWith('propose_ring_')) return null;
  const ringId = actionId.slice('propose_ring_'.length);
  return getProposalRingTier(ringId) ? ringId : null;
}

export function isProposalAttemptAction(actionId) {
  return actionId === 'propose_simple' || parseProposalRingActionId(actionId) != null;
}

export function canAffordProposalRingTier(player, tier) {
  if (!tier) return false;
  return Math.round(player?.wealth ?? 0) >= tier.wealthCost;
}

export function proposalSuccessTitle(target) {
  const pronoun = target?.sex === 'F' ? 'She' : 'He';
  return `${pronoun} said yes!`;
}

export function proposalSpouseRoleLabel(target) {
  return target?.sex === 'F' ? 'bride' : 'groom';
}

export function canForceProposalRefusal(player, edge) {
  return !!player?.isVampire && (edge?.enthrallment ?? 0) > PROPOSE_ENTHRALLMENT_FORCE_MIN;
}

/**
 * Success probability in [0, 1]. Returns 0 if intimacy is below required.
 * Higher intimacy and disposition improve odds; ring tier adds a flat bonus.
 */
export function computeMarriageProposalChance(edge, { ringTier = null } = {}) {
  const intimacy = edge?.intimacy ?? 0;
  const disposition = edge?.disposition ?? 0;

  if (intimacy < PROPOSE_INTIMACY_REQUIRED) return 0;

  const intimacyPart = 0.12 + ((intimacy - PROPOSE_INTIMACY_REQUIRED) / 50) * 0.38;
  const dispositionPart = (disposition / 100) * 0.22;
  const ringPart = ringTier?.chanceBonus ?? 0;

  return Math.min(0.92, Math.max(0.06, intimacyPart + dispositionPart + ringPart));
}
