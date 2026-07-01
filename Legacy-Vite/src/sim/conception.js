import { CONCEPTION_BASE_RATE, GESTATION_YEARS } from '../data/conception.js';

export { GESTATION_YEARS };

/** Effective fertility 0–100 from age curve (mortals) or vampire bonus. */
export function currentFertility(p) {
  if (!p) return 0;
  if (p.isVampire) return p.vampireFertilityBonus || 0;
  if (p.age < 11) return 0;

  const base = p.fertilityBase || 80;
  let modifier;

  if (p.sex === 'F') {
    if (p.age <= 35) modifier = 1.0;
    else if (p.age <= 40) modifier = 0.9;
    else if (p.age <= 43) modifier = 0.7;
    else if (p.age <= 46) modifier = 0.45;
    else if (p.age <= 49) modifier = 0.2;
    else if (p.age <= 51) modifier = 0.05;
    else modifier = 0.0;
  } else {
    if (p.age <= 45) modifier = 1.0;
    else if (p.age <= 50) modifier = 0.8;
    else if (p.age <= 55) modifier = 0.55;
    else if (p.age <= 60) modifier = 0.4;
    else modifier = 0.3;
  }

  return Math.round(base * modifier);
}

function ensurePregnantField(person) {
  if (!person.pregnant || typeof person.pregnant !== 'object') {
    person.pregnant = { active: false, conceivedYear: null, fatherId: null };
  }
}

/** Resolve heterosexual pair into mother (carrier) and father. */
export function resolveConceptionRoles(a, b) {
  if (!a || !b || !a.isAlive || !b.isAlive) return null;
  if (a.sex === 'F' && b.sex === 'M') return { mother: a, father: b };
  if (a.sex === 'M' && b.sex === 'F') return { mother: b, father: a };
  return null;
}

export function isDueForBirth(person, year) {
  if (!person?.pregnant?.active) return false;
  const conceived = person.pregnant.conceivedYear;
  if (conceived == null) return false;
  return year >= conceived + GESTATION_YEARS;
}

export function clearPregnancy(person) {
  if (!person) return;
  person.pregnant = { active: false, conceivedYear: null, fatherId: null };
}

/**
 * Roll for pregnancy after Make Love. Returns true if conception succeeded.
 * @param {{ currentFertility: (p: object) => number }} deps
 */
export function tryConceive(mother, father, year, deps = {}) {
  const currentFertility = deps.currentFertility;
  if (!mother || !father || !currentFertility) return false;
  if (mother.sex !== 'F' || father.sex !== 'M') return false;
  if (!mother.isAlive || !father.isAlive) return false;

  ensurePregnantField(mother);
  if (mother.pregnant.active) return false;

  const carrierF = currentFertility(mother);
  const fatherF = currentFertility(father);
  if (carrierF <= 0 || fatherF <= 0) return false;

  const chance = CONCEPTION_BASE_RATE * (carrierF / 100) * (fatherF / 100);
  if (Math.random() >= chance) return false;

  mother.pregnant = {
    active: true,
    conceivedYear: year,
    fatherId: father.id,
  };
  return true;
}

/** Try conception from player + NPC partner (Make Love). */
export function tryConceiveFromPair(a, b, year, deps = {}) {
  const roles = resolveConceptionRoles(a, b);
  if (!roles) return false;
  return tryConceive(roles.mother, roles.father, year, deps);
}

/** Clear invalid pregnancy records on loaded saves. */
export function sanitizePregnancies(people, getPerson) {
  if (!Array.isArray(people)) return;
  for (const p of people) {
    if (!p?.pregnant?.active) continue;
    let valid = p.sex === 'F';
    if (valid && p.pregnant.fatherId != null) {
      const father = getPerson(p.pregnant.fatherId);
      valid = !!(father && father.sex === 'M');
    }
    if (!valid) clearPregnancy(p);
  }
}
