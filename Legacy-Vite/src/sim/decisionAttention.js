/** Track which eligible decisions the player has opened (unread pulse). */

function ensureDecisionsSeen(player) {
  if (!Array.isArray(player.decisionsSeen)) player.decisionsSeen = [];
}

export function isDecisionUnread(player, decisionId) {
  if (!player || !decisionId) return false;
  ensureDecisionsSeen(player);
  return !player.decisionsSeen.includes(decisionId);
}

export function markDecisionRead(player, decisionId) {
  if (!player || !decisionId) return;
  ensureDecisionsSeen(player);
  if (!player.decisionsSeen.includes(decisionId)) {
    player.decisionsSeen.push(decisionId);
  }
}

/** Clear tab/card pulses after the player opens the Decisions sub-tab. */
export function markAllDecisionsRead(player, eligibleList) {
  if (!player || !eligibleList?.length) return;
  for (const d of eligibleList) {
    markDecisionRead(player, d.id);
  }
}

export function unreadEligibleDecisions(player, eligibleList) {
  if (!player || !eligibleList?.length) return [];
  return eligibleList.filter((d) => isDecisionUnread(player, d.id));
}

export function hasUnreadDecisions(player, eligibleList) {
  return unreadEligibleDecisions(player, eligibleList).length > 0;
}
