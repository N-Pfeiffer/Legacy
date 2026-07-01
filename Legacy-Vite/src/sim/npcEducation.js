import { npcSchoolDropoutChance } from '../data/npcEducationCurve.js';
import { grantTrait } from './traits.js';

/**
 * Roll for NPC school dropout and assign early workforce career if they leave.
 * Call after stage transitions, before age-18 auto-complete.
 */
export function tickNpcSchoolDropout(person, year, deps = {}) {
  if (!person || person.isPlayer || !person.isAlive) return false;
  if (person.career) return false;

  const stage = person.education?.stage;
  if (stage !== 'primary' && stage !== 'secondary') return false;

  const chance = npcSchoolDropoutChance(person, year);
  if (chance <= 0 || Math.random() >= chance) return false;

  person.education.stage = 'dropped_out';
  person.education.since = year;

  if (person.age >= 12 && !(person.traits || []).includes('school_dropout')) {
    grantTrait(person, 'school_dropout');
  }

  const { assignEarlyCareer } = deps;
  if (typeof assignEarlyCareer === 'function') {
    assignEarlyCareer(person, year);
  }

  return true;
}
