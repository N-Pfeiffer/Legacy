import { HOBBIES, HOBBIES_BY_ID } from '../data/hobbies.js';

import { clamp } from '../utils/index.js';

import { effectiveStat } from './itemEffects.js';
import { runStalkingSpy } from './stalking.js';
import { runMysticismEndeavor } from './mysticism.js';
import {
  canSpendActionPoints,
  spendActionPoints,
} from './actionPoints.js';



export const HOBBY_SKILL_MIN = 1;

export const HOBBY_SKILL_MAX = 100;



/** Hobbies for ages 6–11; none below 6; full list at 12+. */

export const HOBBIES_CHILDHOOD = new Set(['angling', 'botany', 'performance']);

export const HOBBY_CHILDHOOD_MIN_AGE = 6;

export const HOBBY_FULL_UNLOCK_AGE = 12;

/** @deprecated Use HOBBIES_CHILDHOOD */

export const HOBBIES_UNDER_12 = HOBBIES_CHILDHOOD;



function meetsAgeGate(player, hobbyId) {

  const age = player?.age ?? 0;

  if (age < HOBBY_CHILDHOOD_MIN_AGE) return false;

  if (age >= HOBBY_FULL_UNLOCK_AGE) return true;

  return HOBBIES_CHILDHOOD.has(hobbyId);

}



export function meetsHobbyAgeGate(player, hobbyId) {

  return meetsAgeGate(player, hobbyId);

}



function ensureHobbiesMap(player) {

  if (!player.hobbies || typeof player.hobbies !== 'object') {

    player.hobbies = {};

  }

}



/** Current skill level (0 = never practiced; display may show 0 until first gain). */

export function getHobbyLevel(player, hobbyId) {

  if (!player) return 0;

  ensureHobbiesMap(player);

  const v = player.hobbies[hobbyId];

  return typeof v === 'number' ? v : 0;

}



function checkHobbyRequirement(player, req) {

  if (!req) return true;

  if (Array.isArray(req.all)) {

    return req.all.every((part) => checkHobbyRequirement(player, part));

  }

  if (req.skill) {

    return getHobbyLevel(player, req.skill) >= (req.level ?? 0);

  }

  if (req.hobbyId) {

    return getHobbyLevel(player, req.hobbyId) >= (req.level ?? 0);

  }

  if (req.stat) {

    return effectiveStat(player, req.stat) >= (req.level ?? 0);

  }

  return true;

}



export function isHobbyUnlocked(player, hobby) {

  if (!player || !hobby) return false;

  if (!meetsAgeGate(player, hobby.id)) return false;

  return checkHobbyRequirement(player, hobby.requires);

}



function formatRequirementPart(req) {

  if (req.all) {

    return req.all.map(formatRequirementPart).join(' · ');

  }

  if (req.skill) {

    const label = HOBBIES_BY_ID[req.skill]?.label || req.skill;

    return `${label} ${req.level ?? 0}`;

  }

  if (req.hobbyId) {

    const label = HOBBIES_BY_ID[req.hobbyId]?.label || req.hobbyId;

    return `${label} ${req.level ?? 0}`;

  }

  if (req.stat) {

    const label = req.stat.charAt(0).toUpperCase() + req.stat.slice(1);

    return `${label} ${req.level ?? 0}`;

  }

  return '';

}



/** Short unlock hint for greyed hobby cards. */

export function getHobbyUnlockHint(hobby) {

  if (!hobby?.requires) return '';

  return `Requires ${formatRequirementPart(hobby.requires)}`;

}



function collectPrerequisiteIds(req, out) {

  if (!req) return;

  if (req.all) {

    req.all.forEach((part) => collectPrerequisiteIds(part, out));

    return;

  }

  if (req.hobbyId) out.add(req.hobbyId);

  if (req.skill) out.add(req.skill);

}



/** Hobby ids that at least one other hobby lists as a requirement. */

export const HOBBIES_THAT_UNLOCK_OTHERS = (() => {

  const ids = new Set();

  for (const hobby of HOBBIES) {

    collectPrerequisiteIds(hobby.requires, ids);

  }

  return ids;

})();



/** In-character hint when this hobby is a prerequisite for another. */

export function getHobbyAdvancedCraftHint(hobby) {

  if (!hobby?.id || !HOBBIES_THAT_UNLOCK_OTHERS.has(hobby.id)) return '';

  return 'I suspect there is a more advanced craft beyond my current mastery.';
}



/** Hobbies visible on the list for this player's age. Locked hobbies omitted unless includeLocked. */

function isHobbyHiddenFromPlayer(player, hobby) {
  if (!hobby?.hidden) return false;
  return !player?.crimePath;
}

export function hobbiesVisibleToPlayer(player, options = {}) {

  if (!player) return [];

  const ageFiltered = HOBBIES.filter((h) => meetsAgeGate(player, h.id));

  const visible = ageFiltered.filter((h) => !isHobbyHiddenFromPlayer(player, h));

  if (options.includeLocked) return visible;

  return visible.filter((h) => isHobbyUnlocked(player, h));

}



export function unlockedHobbies(player) {

  if (!player) return [];

  return HOBBIES.filter((h) => !isHobbyHiddenFromPlayer(player, h) && isHobbyUnlocked(player, h));

}



/**

 * Add skill with diminishing returns. Returns actual gain applied.

 */

export function addHobbySkill(player, hobbyId, baseGain) {

  if (!player || !hobbyId || baseGain <= 0) return 0;

  ensureHobbiesMap(player);

  const level = getHobbyLevel(player, hobbyId);

  const scaled = baseGain * (1 - level / HOBBY_SKILL_MAX);

  const gain = Math.max(0.01, scaled);

  const next = clamp(level + gain, 0, HOBBY_SKILL_MAX);

  const applied = next - level;

  player.hobbies[hobbyId] = next;

  return applied;

}



export function getEndeavorDef(hobbyId, endeavorId) {

  const hobby = HOBBIES_BY_ID[hobbyId];

  if (!hobby) return null;

  return (hobby.endeavors || []).find((e) => e.id === endeavorId) ?? null;

}



/**

 * Run a legacy hobby endeavor (non-gathering): spend AP, raise skill, return annals message.

 */

export function runHobbyEndeavor(player, hobbyId, endeavorId) {

  if (!player?.isPlayer) return { ok: false };



  const hobby = HOBBIES_BY_ID[hobbyId];

  if (!hobby || !isHobbyUnlocked(player, hobby)) {

    return { ok: false };

  }



  const endeavor = getEndeavorDef(hobbyId, endeavorId);

  if (!endeavor) return { ok: false };

  if (hobbyId === 'stalking' && endeavorId === 'spy') {
    return runStalkingSpy(player);
  }

  if (hobbyId === 'mysticism') {
    const mystic = runMysticismEndeavor(player, endeavorId);
    if (mystic.ok || mystic.message) return mystic;
    return mystic;
  }

  const cost = endeavor.apCost ?? 1;

  if (!canSpendActionPoints(player, cost)) {

    return { ok: false, reason: 'no_action_points' };

  }

  if (!spendActionPoints(player, cost)) {

    return { ok: false, reason: 'no_action_points' };

  }



  addHobbySkill(player, hobbyId, endeavor.skillGain ?? 0.5);

  const level = Math.round(getHobbyLevel(player, hobbyId));

  const flavor = endeavor.flavor

    || `You practiced ${hobby.label}.`;

  const message = `${flavor} (${hobby.label} skill now ${level}).`;



  return { ok: true, message, type: 'info', level };

}


