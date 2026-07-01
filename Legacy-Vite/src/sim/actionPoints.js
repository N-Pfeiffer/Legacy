/** Player action points — yearly budget for character interactions. */

export const ACTION_POINTS_PER_YEAR = 20;

/** Opening the propose sub-panel does not spend AP; attempts do. */
const INTERACTION_AP_COSTS = {
  propose_marriage: 0,
  study_with: 2, // BALANCE: provisional — schoolyard "Study with" interaction
};

export function getActionPointCost(actionId) {
  if (actionId != null && actionId in INTERACTION_AP_COSTS) {
    return INTERACTION_AP_COSTS[actionId];
  }
  return 1;
}

export function refreshActionPoints(player) {
  if (!player?.isPlayer) return;
  const max = player.actionPointsMax ?? ACTION_POINTS_PER_YEAR;
  player.actionPointsMax = max;
  player.actionPoints = max;
}

export function canSpendActionPoints(player, cost = 1) {
  if (!player?.isPlayer || cost <= 0) return !!player?.isPlayer;
  const ap = player.actionPoints ?? 0;
  return ap >= cost;
}

export function spendActionPoints(player, cost = 1) {
  if (!canSpendActionPoints(player, cost)) return false;
  if (cost > 0) player.actionPoints -= cost;
  return true;
}
