/**
 * Reusable "NPC + nuclear family" generator.
 *
 * Produces a focal person plus 2 married parents and 0–3 siblings — NO grandparents and NO
 * aunts/uncles (per the education-cohort design). Mirrors the stat/humor wiring used by the
 * player's own family generation, but standalone and reusable (school cohort, staff, future
 * systems). All members are pushed to G.people; the caller decides what to do with the focal.
 *
 * This does NOT touch the player's own family generation (left untouched by design).
 */

import { G } from '../state/gameState.js';
import {
  createPerson,
  rollAdultStats,
  inheritStats,
  applyInheritedStats,
  snapshotBirthStats,
} from '../state/personFactory.js';
import { randomName, randomSurname } from '../data/names.js';
import { assignRandomHumor } from './humorPersonality.js';
import { rollSiblingCount } from './familyGeneration.js';
import { clamp } from '../utils/index.js';
import { weightedPick } from '../utils/weightedPick.js';
import { SOCIAL_CLASS_BY_ID } from '../data/socialClass.js';
import { CAREERS_BY_ID } from '../data/careers.js';
import { statCap } from '../utils/statCap.js';

const PARENT_AGE_GAP_MIN = 20; // BALANCE: provisional
const PARENT_AGE_GAP_MAX = 38;
const SIBLING_MIN = 0;         // BALANCE: provisional — small families for cohort scale
const SIBLING_MAX = 3;

// Household wealth distribution for generated families. Skews middle-class so the
// wealth-based school-dropout curve (npcEducationCurve.js) doesn't cull nearly the
// whole cohort — poor/destitute families still exist and still drop out realistically.
// BALANCE: provisional.
const HOUSEHOLD_WEALTH_WEIGHTS = [
  { id: 'destitute', weight: 1 },
  { id: 'poor', weight: 3 },
  { id: 'middle', weight: 4 },
  { id: 'rich', weight: 2 },
];

const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

function rollHouseholdWealth() {
  const tier = SOCIAL_CLASS_BY_ID[weightedPick(HOUSEHOLD_WEALTH_WEIGHTS).id];
  const base = tier?.wealth ?? 0;
  return Math.max(0, base + randInt(-6, 6)); // small jitter around the tier value
}

function makeAdult({ sex, age, surname, maidenName = null, generation = -1, wealth = 0 }) {
  const roll = rollAdultStats();
  const p = createPerson({ firstName: randomName(sex), surname, sex, age, generation });
  p.yearBorn = G.year - age;
  p.charisma = roll.charisma;
  p.intelligence = roll.intelligence;
  p.insight = roll.insight;
  p.cunning = roll.cunning;
  p.fertilityBase = roll.fertilityBase;
  p.prowessBase = roll.prowessBase;
  p.wealth = wealth;
  if (maidenName) p.maidenName = maidenName;
  snapshotBirthStats(p);
  assignRandomHumor(p);
  return p;
}

function makeChild({ sex, age, surname, father, mother, generation = 0 }) {
  const child = createPerson({
    firstName: randomName(sex),
    surname,
    sex,
    age,
    generation,
    parentIds: [father.id, mother.id],
  });
  child.yearBorn = G.year - age;
  applyInheritedStats(child, inheritStats(father, mother));
  snapshotBirthStats(child);
  assignRandomHumor(child);
  father.childIds.push(child.id);
  mother.childIds.push(child.id);
  return child;
}

/**
 * Generate a focal person of the given age with two parents and some siblings.
 * @param {{ age:number, sex?:'M'|'F', surname?:string }} opts
 * @returns {{ focal:object, members:object[] }}
 */
export function generateNpcWithFamily({ age, sex, surname } = {}) {
  const focalSex = sex || (Math.random() < 0.5 ? 'M' : 'F');
  const fam = surname || randomSurname();
  const members = [];

  // Shared household wealth → children inherit it (inheritStats averages the parents),
  // so families span classes instead of all being destitute.
  const household = rollHouseholdWealth();
  const fatherAge = age + randInt(PARENT_AGE_GAP_MIN, PARENT_AGE_GAP_MAX);
  const motherAge = age + randInt(PARENT_AGE_GAP_MIN, PARENT_AGE_GAP_MAX);
  const father = makeAdult({ sex: 'M', age: fatherAge, surname: fam, wealth: household });
  const mother = makeAdult({ sex: 'F', age: motherAge, surname: fam, maidenName: randomSurname(), wealth: household });
  father.spouseIds.push(mother.id);
  mother.spouseIds.push(father.id);

  const focal = makeChild({ sex: focalSex, age, surname: fam, father, mother });
  members.push(father, mother, focal);

  // Siblings — ages spread around the focal, constrained so each parent was at
  // least ~14 at the sibling's birth (and never older than the focal's parents allow).
  const youngestParentAge = Math.min(fatherAge, motherAge);
  const maxSibAge = Math.max(0, youngestParentAge - 14);
  const sibCount = rollSiblingCount({ min: SIBLING_MIN, max: SIBLING_MAX });
  for (let i = 0; i < sibCount; i++) {
    const sibAge = clamp(age + randInt(-6, 8), 0, maxSibAge);
    const sib = makeChild({
      sex: Math.random() < 0.5 ? 'M' : 'F',
      age: sibAge,
      surname: fam,
      father,
      mother,
    });
    members.push(sib);
  }

  for (const m of members) G.people.push(m);
  return { focal, members };
}

function skewCareerStat(person, stat, career) {
  const cap = statCap(stat, !!person.isVampire) || 100;
  const base = stat === career.primary ? 55 : 35;
  person[stat] = clamp(base + Math.floor(Math.random() * 30), 0, cap);
}

/**
 * Focal adult + opposite-sex spouse + 1–3 children for important NPCs.
 * @returns {{ focal: object, spouse: object, children: object[], members: object[] }}
 */
export function generateAdultWithHousehold({
  age,
  sex,
  careerId,
  wealth,
  surname,
  careerRank = 0,
} = {}) {
  const focalSex = sex || (Math.random() < 0.5 ? 'M' : 'F');
  const fam = surname || randomSurname();
  const household = wealth ?? rollHouseholdWealth();
  const focal = makeAdult({ sex: focalSex, age, surname: fam, wealth: household });
  const career = careerId ? CAREERS_BY_ID[careerId] : null;

  if (career) {
    skewCareerStat(focal, career.primary, career);
    if (career.secondary) skewCareerStat(focal, career.secondary, career);
    focal.career = {
      id: careerId,
      since: G.year - randInt(5, Math.min(20, Math.max(1, age - 25))),
      rank: careerRank,
      yearsAtRank: randInt(0, 5),
    };
  }

  const spouseSex = focalSex === 'M' ? 'F' : 'M';
  const spouseAge = clamp(age + randInt(-8, 8), 18, Math.max(18, age + 8));
  const spouse = makeAdult({
    sex: spouseSex,
    age: spouseAge,
    surname: focalSex === 'M' ? fam : randomSurname(),
    maidenName: focalSex === 'M' ? randomSurname() : null,
    wealth: household,
  });
  focal.spouseIds.push(spouse.id);
  spouse.spouseIds.push(focal.id);

  const children = [];
  const members = [focal, spouse];
  const childCount = randInt(1, 3);
  const father = focalSex === 'M' ? focal : spouse;
  const mother = focalSex === 'F' ? focal : spouse;

  for (let i = 0; i < childCount; i++) {
    const childAge = clamp(age - randInt(20, 38), 0, Math.max(0, age - 1));
    const child = makeChild({
      sex: Math.random() < 0.5 ? 'M' : 'F',
      age: childAge,
      surname: fam,
      father,
      mother,
      generation: 0,
    });
    children.push(child);
    members.push(child);
  }

  for (const m of members) G.people.push(m);
  return { focal, spouse, children, members };
}
