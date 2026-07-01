import { statCap } from '../utils/statCap.js';

/** Pool household wealth to the higher spouse value (each clamped to their cap). */
export function syncMarriageWealth(a, b) {
  if (!a || !b) return;
  const pooled = Math.max(Math.round(a.wealth ?? 0), Math.round(b.wealth ?? 0));
  a.wealth = Math.max(0, Math.min(statCap('wealth', !!a.isVampire), pooled));
  b.wealth = Math.max(0, Math.min(statCap('wealth', !!b.isVampire), pooled));
}

/** Link two people as spouses and pool their wealth. Idempotent for existing pairs. */
export function linkSpouses(a, b) {
  if (!a || !b || a.id === b.id) return false;
  if (!Array.isArray(a.spouseIds)) a.spouseIds = [];
  if (!Array.isArray(b.spouseIds)) b.spouseIds = [];
  if (!a.spouseIds.includes(b.id)) a.spouseIds.push(b.id);
  if (!b.spouseIds.includes(a.id)) b.spouseIds.push(a.id);
  syncMarriageWealth(a, b);
  return true;
}

/** Woman adopts husband's surname; prior surname kept as maidenName. */
export function applyMarriageSurnameChange(bride, groom) {
  if (!bride || !groom || bride.sex !== 'F' || groom.sex !== 'M') return;
  if (bride.surname === groom.surname) return;
  if (!bride.maidenName) bride.maidenName = bride.surname;
  bride.surname = groom.surname;
}

/** Marry two people: link spouses, pool wealth, apply surname convention. */
export function marryPersons(a, b) {
  if (!linkSpouses(a, b)) return false;
  if (a.sex === 'M' && b.sex === 'F') applyMarriageSurnameChange(b, a);
  else if (a.sex === 'F' && b.sex === 'M') applyMarriageSurnameChange(a, b);
  return true;
}

/** Backfill pooled wealth for every married pair in a save. */
export function backfillMarriageWealth(people) {
  if (!Array.isArray(people)) return;
  const byId = new Map(people.map((p) => [p.id, p]));
  const seen = new Set();

  for (const person of people) {
    for (const spouseId of person.spouseIds || []) {
      const key = person.id < spouseId
        ? `${person.id}:${spouseId}`
        : `${spouseId}:${person.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const spouse = byId.get(spouseId);
      if (spouse) syncMarriageWealth(person, spouse);
    }
  }
}
