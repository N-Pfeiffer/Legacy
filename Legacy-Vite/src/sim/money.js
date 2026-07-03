import { proposeAnnals, ANNALS_PRIORITY } from './annals.js';
import { ensureInventoryStores } from './personItems.js';

/** Starting purse by character-creation social class (not tied to standing bands). */
export const STARTING_MONEY_BY_CLASS = {
  destitute: 0,
  poor: 4,
  middle: 20,
  rich: 60,
};

export function startingMoneyForClass(classId) {
  return STARTING_MONEY_BY_CLASS[classId] ?? 0;
}

/** Map player £ to legacy pseudo-wealth and standing label. */
export function moneyStandingBand(money) {
  const m = Math.max(0, Math.floor(money ?? 0));
  if (m <= 9) return { pseudoWealth: 10, label: 'Destitute' };
  if (m <= 49) return { pseudoWealth: 25, label: 'Poor' };
  if (m <= 199) return { pseudoWealth: 40, label: 'Middle Class' };
  if (m <= 599) return { pseudoWealth: 55, label: 'Rich' };
  if (m <= 1499) return { pseudoWealth: 70, label: 'Rich' };
  return { pseudoWealth: 85, label: 'Wealthy' };
}

export function moneyStandingLabel(money) {
  return moneyStandingBand(money).label;
}

export function getMoney(player) {
  return Math.max(0, Math.floor(player?.money ?? 0));
}

export function formatMoney(n) {
  return `£${Math.max(0, Math.floor(n ?? 0))}`;
}

export function syncSovereignMirror(player) {
  if (!player?.isPlayer) return;
  ensureInventoryStores(player);
  const count = getMoney(player);
  if (count > 0) {
    player.materials.sovereign = count;
    if (!player.materialAcq.sovereign) {
      player.materialAcq.sovereign = Date.now();
    }
  } else {
    delete player.materials.sovereign;
    delete player.materialAcq.sovereign;
  }
}

/**
 * @param {{ log?: boolean, annalsMsg?: string, annalsType?: string }} [opts]
 */
export function addMoney(player, n, opts = {}) {
  if (!player?.isPlayer || typeof n !== 'number' || !Number.isFinite(n)) return 0;
  const before = getMoney(player);
  const after = Math.max(0, before + Math.round(n));
  player.money = after;
  syncSovereignMirror(player);
  const delta = after - before;
  if (opts.log && delta !== 0) {
    proposeAnnals({
      msg: opts.annalsMsg ?? (delta > 0 ? `You gained ${formatMoney(delta)}.` : `You spent ${formatMoney(-delta)}.`),
      type: opts.annalsType ?? (delta > 0 ? 'good' : 'bad'),
      priority: ANNALS_PRIORITY.MINOR,
      category: 'money',
    });
  }
  return delta;
}

export function trySpendMoney(player, n) {
  const cost = Math.max(0, Math.round(n ?? 0));
  if (getMoney(player) < cost) return false;
  addMoney(player, -cost);
  return true;
}

/** NPC 0–100 wealth → pseudo-wealth for child inheritance when a parent is the player. */
export function parentWealthForInheritance(parent) {
  if (!parent) return 0;
  if (parent.isPlayer) return moneyStandingBand(getMoney(parent)).pseudoWealth;
  return Math.round(parent.wealth ?? 0);
}
