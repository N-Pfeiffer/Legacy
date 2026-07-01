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

const PARENT_AGE_GAP_MIN = 20; // BALANCE: provisional
const PARENT_AGE_GAP_MAX = 38;
const SIBLING_MIN = 0;         // BALANCE: provisional — small families for cohort scale
const SIBLING_MAX = 3;

const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

function makeAdult({ sex, age, surname, maidenName = null, generation = -1 }) {
  const roll = rollAdultStats();
  const p = createPerson({ firstName: randomName(sex), surname, sex, age, generation });
  p.yearBorn = G.year - age;
  p.charisma = roll.charisma;
  p.intelligence = roll.intelligence;
  p.insight = roll.insight;
  p.cunning = roll.cunning;
  p.fertilityBase = roll.fertilityBase;
  p.prowessBase = roll.prowessBase;
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

  const fatherAge = age + randInt(PARENT_AGE_GAP_MIN, PARENT_AGE_GAP_MAX);
  const motherAge = age + randInt(PARENT_AGE_GAP_MIN, PARENT_AGE_GAP_MAX);
  const father = makeAdult({ sex: 'M', age: fatherAge, surname: fam });
  const mother = makeAdult({ sex: 'F', age: motherAge, surname: fam, maidenName: randomSurname() });
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
