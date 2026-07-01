/**
 * School staffing — fills 3 role slots (primary teacher, secondary teacher, headmaster) from the
 * world. Prefers an existing eligible NPC who holds the `schoolmaster` career; only generates a
 * new NPC (with a nuclear family) as a fallback. Self-healing: a dead/invalid slot is refilled on
 * the next call (called each year from tickEducation, which runs before mortality).
 */

import { G, getPlayer, getPerson } from '../state/gameState.js';
import { generateNpcWithFamily } from './npcFamilyGen.js';

const TEACHER_RANK = 1;     // 'Teacher' on the schoolmaster ladder
const HEADMASTER_RANK = 3;  // 'Headmaster/Principal'
const STAFF_AGE_MIN = 28;   // BALANCE: provisional
const STAFF_AGE_MAX = 55;

const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

function isEligibleSchoolmaster(p, excludeIds) {
  return p && p.isAlive && !p.isPlayer
    && p.career?.id === 'schoolmaster'
    && (p.age ?? 0) >= 18
    && !excludeIds.has(p.id);
}

/** Pick the best existing schoolmaster for a slot, or null. */
function pickExisting({ preferSex, preferTopRank }, excludeIds) {
  const cands = G.people.filter((p) => isEligibleSchoolmaster(p, excludeIds));
  if (!cands.length) return null;
  cands.sort((a, b) => {
    if (preferSex) {
      const as = a.sex === preferSex ? 0 : 1;
      const bs = b.sex === preferSex ? 0 : 1;
      if (as !== bs) return as - bs;
    }
    const ar = a.career?.rank ?? 0;
    const br = b.career?.rank ?? 0;
    if (preferTopRank && ar !== br) return br - ar; // highest rank first for headmaster
    return (b.age ?? 0) - (a.age ?? 0);             // else oldest/most senior
  });
  return cands[0];
}

function makeSchoolmaster(person, rankIdx) {
  const tenure = randInt(2, 12);
  person.career = {
    id: 'schoolmaster',
    since: G.year - tenure,
    rank: rankIdx,
    yearsAtRank: 0,
  };
}

function fillSlot(key, opts, used) {
  const current = getPerson(G.school[key]);
  if (current && current.isAlive) { used.add(current.id); return; }
  G.school[key] = null;

  let person = pickExisting(opts, used);
  if (!person) {
    const sex = opts.preferSex || (Math.random() < 0.5 ? 'M' : 'F');
    const { focal } = generateNpcWithFamily({ age: randInt(STAFF_AGE_MIN, STAFF_AGE_MAX), sex });
    makeSchoolmaster(focal, opts.rankIdx);
    person = focal;
  }
  G.school[key] = person.id;
  used.add(person.id);
}

/** Ensure all three staff slots reference a living, valid schoolmaster. Idempotent. */
export function fillSchoolStaff() {
  const school = G.school;
  if (!school) return;
  const used = new Set();
  // Headmaster first (prefers the highest-rank schoolmaster), so a senior
  // existing NPC isn't grabbed as a plain teacher.
  fillSlot('headmasterId',       { preferSex: null, preferTopRank: true,  rankIdx: HEADMASTER_RANK }, used);
  fillSlot('primaryTeacherId',   { preferSex: 'F',  preferTopRank: false, rankIdx: TEACHER_RANK },   used);
  fillSlot('secondaryTeacherId', { preferSex: 'F',  preferTopRank: false, rankIdx: TEACHER_RANK },   used);
}
