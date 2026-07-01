/**
 * School cohort — the player's generated classmates, maintained year over year.
 *
 * On the player entering primary, generate 3–5 students at each age 6–11 (each with a nuclear
 * family) and staff the school. Each subsequent year: add 3–5 new 6-year-olds, prune students who
 * have left school (graduated / dropped / died — they persist in G.people, just leave the roster),
 * and re-staff (self-heals deaths). Students progress via the normal tickEducation transitions.
 *
 * `G.school.studentIds` is the *current enrolled roster*; cohort members persist permanently in
 * the world after they leave it.
 */

import { G, getPerson, getPlayer } from '../state/gameState.js';
import { generateNpcWithFamily } from './npcFamilyGen.js';
import { fillSchoolStaff } from './schoolStaff.js';

export const SCHOOL_STUDENTS_PER_AGE_MIN = 3; // BALANCE: provisional
export const SCHOOL_STUDENTS_PER_AGE_MAX = 5;
export const SCHOOL_PRIMARY_MIN_AGE = 6;
export const SCHOOL_PRIMARY_MAX_AGE = 11;
// Very high for now so it never limits in practice; lowered later if perf demands.
export const SCHOOL_COHORT_CAP = 1000; // BALANCE: provisional

const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

/** Normalize G.school into its default shape. Does not generate anyone. */
export function ensureSchoolState() {
  if (!G.school || typeof G.school !== 'object') {
    G.school = {
      active: false,
      primaryTeacherId: null,
      secondaryTeacherId: null,
      headmasterId: null,
      studentIds: [],
    };
  }
  if (!Array.isArray(G.school.studentIds)) G.school.studentIds = [];
  return G.school;
}

function rosterCount() {
  return G.school.studentIds.length;
}

function addStudentsAtAge(age, n) {
  const school = G.school;
  for (let i = 0; i < n; i++) {
    if (rosterCount() >= SCHOOL_COHORT_CAP) return;
    const { focal } = generateNpcWithFamily({ age });
    focal.education = {
      stage: age >= 12 ? 'secondary' : 'primary',
      since: G.year,
      track: null,
    };
    school.studentIds.push(focal.id);
  }
}

/** True when an id still belongs in the enrolled roster. */
function stillEnrolled(id) {
  const p = getPerson(id);
  if (!p || !p.isAlive) return false;
  const st = p.education?.stage;
  return st === 'primary' || st === 'secondary';
}

/** First year the player is in primary: build the full initial cohort + staff. */
export function startSchoolCohort() {
  const school = ensureSchoolState();
  school.active = true;
  fillSchoolStaff();
  for (let age = SCHOOL_PRIMARY_MIN_AGE; age <= SCHOOL_PRIMARY_MAX_AGE; age++) {
    addStudentsAtAge(age, randInt(SCHOOL_STUDENTS_PER_AGE_MIN, SCHOOL_STUDENTS_PER_AGE_MAX));
  }
}

/** Each subsequent year while the player is enrolled. */
export function tickSchoolCohort() {
  const school = ensureSchoolState();
  if (!school.active) return;
  school.studentIds = school.studentIds.filter(stillEnrolled);
  addStudentsAtAge(SCHOOL_PRIMARY_MIN_AGE, randInt(SCHOOL_STUDENTS_PER_AGE_MIN, SCHOOL_STUDENTS_PER_AGE_MAX));
  fillSchoolStaff();
}

/** Player has left school — stop generating (cohort members remain in the world). */
export function stopSchoolCohort() {
  if (G.school) G.school.active = false;
}

/**
 * Drive cohort lifecycle from the player's current stage. Call once per year tick
 * (after per-person transitions). Safe/idempotent.
 */
export function tickSchoolForPlayer() {
  const player = getPlayer();
  if (!player?.isAlive) return;
  const stage = player.education?.stage;
  const inSchool = stage === 'primary' || stage === 'secondary';
  if (inSchool) {
    if (!G.school?.active) startSchoolCohort();
    else tickSchoolCohort();
  } else if (G.school?.active) {
    stopSchoolCohort();
  }
}
