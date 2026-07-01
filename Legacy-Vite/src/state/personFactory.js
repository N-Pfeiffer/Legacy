/**
 * Person creation and stat inheritance — single source of truth for new NPCs/player.
 */

import { rollNormal } from '../utils/random.js';
import { PERSON_DEFAULTS } from './person.js';
import { nextId } from './gameState.js';

function freshPersonDefaults() {
  const p = {};
  for (const [key, def] of Object.entries(PERSON_DEFAULTS)) {
    p[key] = def !== null && typeof def === 'object' ? structuredClone(def) : def;
  }
  return p;
}

/**
 * Create a new person record. Does not add to G.people — caller pushes when ready.
 */
export function createPerson({
  firstName = '',
  surname = '',
  sex,
  age = 0,
  generation = 0,
  isPlayer = false,
  parentIds = [],
} = {}) {
  const person = freshPersonDefaults();

  Object.assign(person, {
    id: nextId(),
    firstName,
    surname,
    sex,
    age,
    generation,
    isPlayer,
    isAlive: true,
    parentIds: [...parentIds],
    childIds: [],
    spouseIds: [],
    exSpouseIds: [],
    loverIds: [],
    friendIds: [],
    enemyIds: [],
    childerIds: [],
    minionIds: [],
    traits: [],
    items: [],
    situations: [],
    resolvedSituations: {},
    decisionsSeen: [],
    careerPickAge: 18 + Math.floor(Math.random() * 13),
    pregnant: { active: false, conceivedYear: null, fatherId: null },
    education: { stage: 'none', since: null, track: null },
  });

  if (isPlayer) person.relationships = {};
  return person;
}

/** Immutable birth snapshot — call after baseline stats are set. Idempotent. */
export function snapshotBirthStats(person) {
  if (person.birthStats) return;
  person.birthStats = {
    charisma: person.charisma,
    intelligence: person.intelligence,
    insight: person.insight,
    cunning: person.cunning,
    fertility: person.fertilityBase,
    prowess: person.prowessBase,
  };
}

const FALLBACK_BIRTH_STATS = {
  charisma: 50,
  intelligence: 50,
  insight: 0,
  cunning: 0,
  fertility: 80,
  prowess: 5,
};

/**
 * Roll child stats from two parents' birth stats. Wealth uses current household average.
 */
export function inheritStats(parentA, parentB) {
  const stat = (a, b, sd = 12) => {
    const mean = (a + b) / 2;
    return rollNormal(mean, sd);
  };

  const aBirth = parentA?.birthStats ?? FALLBACK_BIRTH_STATS;
  const bBirth = parentB?.birthStats ?? FALLBACK_BIRTH_STATS;

  return {
    charisma: stat(aBirth.charisma, bBirth.charisma, 12),
    intelligence: stat(aBirth.intelligence, bBirth.intelligence, 12),
    insight: stat(aBirth.insight, bBirth.insight, 8),
    cunning: stat(aBirth.cunning, bBirth.cunning, 8),
    fertilityBase: stat(aBirth.fertility, bBirth.fertility, 8),
    prowessBase: stat(aBirth.prowess ?? 5, bBirth.prowess ?? 5, 4),
    wealth: Math.round(((parentA?.wealth ?? 0) + (parentB?.wealth ?? 0)) / 2),
  };
}

/** Roll believable adult starting stats for NPCs without known birth context. */
export function rollAdultStats() {
  return {
    charisma: rollNormal(40, 15),
    intelligence: rollNormal(40, 15),
    insight: rollNormal(8, 10),
    cunning: rollNormal(8, 10),
    wealth: 0,
    fertilityBase: rollNormal(80, 8),
    prowessBase: rollNormal(5, 4),
  };
}

/** Apply an inheritStats() result onto a person object. */
export function applyInheritedStats(person, inherited) {
  person.charisma = inherited.charisma;
  person.intelligence = inherited.intelligence;
  person.insight = inherited.insight;
  person.cunning = inherited.cunning;
  person.fertilityBase = inherited.fertilityBase;
  person.prowessBase = inherited.prowessBase;
  person.wealth = inherited.wealth;
}
