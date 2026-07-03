/** World + view state and relationship getters. */

export const START_YEAR = 1800;

export let G = {
  year: START_YEAR,
  surname: '',
  people: [],
  // Younger siblings not yet born: each entry has yearsUntilBirth = player age
  // at which they spawn (see spawnPendingSiblings in sim/siblings.js).
  pendingSiblings: [],
  // Annals / event log. Newest entry first. Each: { year, msg, type, html? }.
  eventLog: [],
  // Curated milestone log for Journal → Memories. Newest first.
  memories: [],
  // School cohort + staff (see sim/schoolCohort.js). null until the player enters school.
  school: null,
  // Player workplace (boss/coworkers/peers). null until the player joins a career.
  workplace: null,
};

/** Which top-level section tab is active. */
export let currentSection = 'bloodline';

export function getCurrentSection() {
  return currentSection;
}

export function setCurrentSection(name) {
  currentSection = name;
}

/** Bloodline focal person + breadcrumb trail (up to 50 names; clear via ↺). */
export const bl = { focalId: null, trail: [], focalIndex: 0 };

/** Monotonic person id counter. */
export let _id = 0;

export const nextId = () => ++_id;

export function setNextId(n) {
  _id = n;
}

export const getPlayer = () => G.people.find((p) => p.isPlayer);
export const getPerson = (id) => G.people.find((p) => p.id === id);
export const getAlive = () => G.people.filter((p) => p.isAlive);

/** Iterate living people without allocating a filtered array. */
export function forEachAlive(fn) {
  for (const p of G.people) {
    if (p.isAlive) fn(p);
  }
}

export const getSpouses = (p) => p.spouseIds.map(getPerson).filter(Boolean);
export const getLovers = (p) => p.loverIds.map(getPerson).filter(Boolean);
export const getFriends = (p) => p.friendIds.map(getPerson).filter(Boolean);
export const getEnemies = (p) => p.enemyIds.map(getPerson).filter(Boolean);
export const getChildren = (p) => p.childIds.map(getPerson).filter(Boolean);
export const getParents = (p) => p.parentIds.map(getPerson).filter(Boolean);

export const getGrandparents = (p) => {
  const seen = new Set();
  const out = [];
  for (const parent of getParents(p)) {
    for (const gid of parent.parentIds) {
      if (seen.has(gid)) continue;
      seen.add(gid);
      const gp = getPerson(gid);
      if (gp) out.push(gp);
    }
  }
  return out;
};

export const getSire = (p) => (p.sireId ? getPerson(p.sireId) : null);

export const getSiblings = (p) => {
  if (!p.parentIds.length) return [];
  const parentSet = new Set(p.parentIds);
  return G.people.filter(
    (q) => q.id !== p.id && q.parentIds.some((id) => parentSet.has(id)),
  );
};

/** Parent's siblings from the player's perspective (aunts and uncles). */
export const getAuntsUncles = (p) => {
  const seen = new Set();
  const out = [];
  for (const parent of getParents(p)) {
    for (const sib of getSiblings(parent)) {
      if (seen.has(sib.id)) continue;
      seen.add(sib.id);
      out.push(sib);
    }
  }
  return out;
};

/** Grandparents on one parental line (via that parent). */
export const getGrandparentsOnLine = (parent) => {
  if (!parent) return [];
  return parent.parentIds.map(getPerson).filter(Boolean);
};

/** Aunts and uncles on one parental line (that parent's siblings). */
export const getAuntsUnclesOnLine = (parent) => {
  if (!parent) return [];
  return getSiblings(parent);
};

/** Children of the focal's aunts/uncles (i.e. people who share a grandparent). */
export const getCousins = (p) => {
  const auIds = new Set(getAuntsUncles(p).map((au) => au.id));
  if (!auIds.size) return [];
  const seen = new Set();
  const out = [];
  for (const q of G.people) {
    if (q.id === p.id || seen.has(q.id)) continue;
    if (q.parentIds.some((id) => auIds.has(id))) {
      seen.add(q.id);
      out.push(q);
    }
  }
  return out;
};

/** Children of focal's children. */
export const getGrandchildren = (p) => {
  const out = [];
  for (const child of getChildren(p)) {
    for (const gc of getChildren(child)) out.push(gc);
  }
  return out;
};

/** All descendants deeper than grandchildren (great-grandchildren and beyond). */
export const getScions = (p) => {
  const out = [];
  const seen = new Set();

  function collectDescendants(person, generationsFromFocal) {
    for (const child of getChildren(person)) {
      const gen = generationsFromFocal + 1;
      if (gen >= 3 && !seen.has(child.id)) {
        seen.add(child.id);
        out.push(child);
      }
      collectDescendants(child, gen);
    }
  }

  collectDescendants(p, 0);
  return out;
};
