import { pick } from '../utils/index.js';

import { HUMORS, HUMOR_IDS } from '../data/humors.js';

import { grantTraitWithEffects, getPersonHumorId } from './traits.js';



/** Assign one random Four Humors trait to an NPC (skipped for player / if already set). */

export function assignRandomHumor(person) {

  if (!person || person.isPlayer) return false;

  if (getPersonHumorId(person)) return false;



  const humorId = pick(HUMOR_IDS);

  if (!humorId || !HUMORS[humorId]) return false;

  if (!grantTraitWithEffects(person, humorId)) return false;



  person.humorPhase = 'mortal';

  return true;

}



/** Backfill random humors for all NPCs missing one (save migration). */

export function backfillNpcHumors(people) {

  if (!Array.isArray(people)) return;

  for (const person of people) {

    assignRandomHumor(person);

  }

}

