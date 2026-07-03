import { statCap } from '../utils/statCap.js';
import { wealthTierLabel } from './careers.js';
import { proposeAnnals, ANNALS_PRIORITY } from './annals.js';
import { addMoney, formatMoney } from './money.js';

const DOWRY_BY_TIER = {
  Destitute: 0,
  Poor: 5,
  'Middle Class': 30,
  Rich: 80,
  Wealthy: 200,
};

function dowryForSpouse(spouse) {
  if (!spouse || spouse.isPlayer) return 0;
  return DOWRY_BY_TIER[wealthTierLabel(spouse.wealth)] ?? 0;
}

/** Pool household wealth to the higher spouse value (NPC pairs only). */
export function syncMarriageWealth(a, b) {
  if (!a || !b) return;
  if (a.isPlayer || b.isPlayer) return;
  const pooled = Math.max(Math.round(a.wealth ?? 0), Math.round(b.wealth ?? 0));
  a.wealth = Math.max(0, Math.min(statCap('wealth', !!a.isVampire), pooled));
  b.wealth = Math.max(0, Math.min(statCap('wealth', !!b.isVampire), pooled));
}

function applyPlayerMarriageDowry(a, b) {
  const player = a?.isPlayer ? a : b?.isPlayer ? b : null;
  if (!player) return;
  const spouse = player === a ? b : a;
  const dowry = dowryForSpouse(spouse);
  if (dowry <= 0) return;
  addMoney(player, dowry, {
    log: true,
    annalsMsg: `Your spouse's family settled a dowry of ${formatMoney(dowry)} upon the marriage.`,
    annalsType: 'good',
  });
}

/** Link two people as spouses. Idempotent for existing pairs. */
export function linkSpouses(a, b) {
  if (!a || !b || a.id === b.id) return false;
  if (!Array.isArray(a.spouseIds)) a.spouseIds = [];
  if (!Array.isArray(b.spouseIds)) b.spouseIds = [];
  if (!a.spouseIds.includes(b.id)) a.spouseIds.push(b.id);
  if (!b.spouseIds.includes(a.id)) b.spouseIds.push(a.id);
  syncMarriageWealth(a, b);
  applyPlayerMarriageDowry(a, b);
  return true;
}

/** Woman adopts husband's surname; prior surname kept as maidenName. */
export function applyMarriageSurnameChange(bride, groom) {
  if (!bride || !groom || bride.sex !== 'F' || groom.sex !== 'M') return;
  if (bride.surname === groom.surname) return;
  if (!bride.maidenName) bride.maidenName = bride.surname;
  bride.surname = groom.surname;
}

/** Marry two people: link spouses, pool wealth (NPCs), dowry (player), apply surname convention. */
export function marryPersons(a, b) {
  if (!linkSpouses(a, b)) return false;
  if (a.sex === 'M' && b.sex === 'F') applyMarriageSurnameChange(b, a);
  else if (a.sex === 'F' && b.sex === 'M') applyMarriageSurnameChange(a, b);
  return true;
}
