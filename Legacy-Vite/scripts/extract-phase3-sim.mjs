#!/usr/bin/env node
/**
 * Extract year-tick simulation from legacy.js into sim/*.js (Phase 3).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const legacyPath = path.join(ROOT, '../src/legacy.js');
const simDir = path.join(ROOT, '../src/sim');
const lines = fs.readFileSync(legacyPath, 'utf8').split('\n');

function extractFunction(name) {
  const re = new RegExp(`^    function ${name}\\(`);
  const start = lines.findIndex((l) => re.test(l));
  if (start < 0) throw new Error(`Function not found: ${name}`);
  let depth = 0;
  let started = false;
  for (let i = start; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') {
        depth++;
        started = true;
      } else if (ch === '}') depth--;
    }
    if (started && depth === 0) {
      return lines.slice(start, i + 1).map((l) => l.replace(/^    /, '')).join('\n');
    }
  }
  throw new Error(`End not found: ${name}`);
}

function extractConstBlock(startPattern, endBefore) {
  const start = lines.findIndex((l) => startPattern.test(l));
  const end = lines.findIndex((l, i) => i > start && endBefore.test(l));
  if (start < 0 || end < 0) throw new Error(`Const block not found: ${startPattern}`);
  return lines.slice(start, end).map((l) => l.replace(/^    /, '')).join('\n');
}

function toExports(block) {
  return block.replace(/^function (\w+)/gm, 'export function $1');
}

function patchCareerPromotions(body) {
  return body
    .replace(/personNameHtmlAnnals\(/g, 'hooks.personNameHtmlAnnals(')
    .replace(/\bisJournaled\(/g, 'isJournaled(');
}

const careerConsts = extractConstBlock(
  /^    const PROMOTION_THRESHOLDS/,
  /^    function careerFitScore/,
);

const careersBody = patchCareerPromotions(
  toExports(
    [
      extractFunction('careerName'),
      extractFunction('careerRankLabel'),
      extractFunction('careerDisplay'),
      extractFunction('pickCareerForNPC'),
      extractFunction('assignCareerToPerson'),
      extractFunction('assignCareerToPersonWithAgeFit'),
      extractFunction('assignEarlyCareerToNPC'),
      careerConsts,
      extractFunction('careerFitScore'),
      extractFunction('progressCareerOneYear'),
      extractFunction('wealthTierLabel'),
      extractFunction('careerWealthTarget'),
      extractFunction('tickWealthGravity'),
      extractFunction('tickCareerProgression'),
    ].join('\n\n'),
  ),
);

fs.writeFileSync(
  path.join(simDir, 'careers.js'),
  `import { G } from '../state/gameState.js';
import { currentEra } from '../data/eras.js';
import { CAREERS, CAREERS_BY_ID } from '../data/careers.js';
import { statCap, weightedPick } from '../utils/index.js';
import { currentProwess } from './prowess.js';
import { currentFertility } from './conception.js';
import { effectiveStat } from './itemEffects.js';
import { ANNALS_PRIORITY, proposeAnnals } from './annals.js';
import { isJournaled } from './journal.js';

let hooks = {
  personNameHtmlAnnals: (p) => String(p?.firstName ?? ''),
};

export function registerCareerHooks(h) {
  hooks = { ...hooks, ...h };
}

${careersBody}
`,
);

const educationBody = toExports(
  [
    extractFunction('playerHasDegree'),
    extractFunction('nextDegreeFor'),
    extractFunction('canApplyForDegree'),
    extractFunction('commitDegreeApplication'),
    extractFunction('tickEducation'),
    extractFunction('educationStageLabel'),
  ].join('\n\n'),
)
  .replace(/fireSituation\(/g, 'hooks.fireSituation(')
  .replace(/render\(\);/g, 'hooks.onAfterDegreeCommit();');

fs.writeFileSync(
  path.join(simDir, 'educationTick.js'),
  `import { G } from '../state/gameState.js';
import { clamp, statCap } from '../utils/index.js';
import {
  EDUCATION_LADDER,
  EDUCATION_LADDER_BY_ID,
  HIGHER_ED_IN_PROGRESS_STAGES,
  COMPLETED_DEGREE_INDEX,
} from '../data/education.js';
import { SCHOOL_WORK_HEALTH_COST_PER_YEAR } from '../data/careers.js';
import { shouldOfferScholarship, pickUniversitySituation } from '../data/educationSituations.js';
import { ANNALS_PRIORITY, proposeAnnals } from './annals.js';
import { applyEducationChoice } from './educationChoiceMemory.js';
import { tickNpcSchoolDropout } from './npcEducation.js';
import { assignEarlyCareerToNPC } from './careers.js';

let hooks = {
  fireSituation: () => {},
  onAfterDegreeCommit: () => {},
};

export function registerEducationTickHooks(h) {
  hooks = { ...hooks, ...h };
}

${educationBody}
`,
);

const eventsBody = toExports(
  [
    extractFunction('resolveFlavor'),
    extractFunction('eventEligibleEras'),
    extractFunction('processPlayerEvents'),
  ].join('\n\n'),
).replace(
  /tickEstateSituations\(player, G\.year, fireSituation\)/,
  'tickEstateSituations(player, G.year, hooks.fireSituation)',
);

fs.writeFileSync(
  path.join(simDir, 'events.js'),
  `import { G } from '../state/gameState.js';
import { eligibleEras } from '../data/eras.js';
import { PLAYER_EVENTS } from '../data/playerEvents.js';
import { pick, weightedPick } from '../utils/index.js';
import { ANNALS_PRIORITY, proposeAnnals } from './annals.js';
import { isInPrison } from './prison.js';
import { tickEstateSituations } from '../data/estateSituations.js';

let hooks = {
  fireSituation: () => {},
};

export function registerEventHooks(h) {
  hooks = { ...hooks, ...h };
}

${eventsBody}
`,
);

const mortalityBody = toExports(
  [
    extractFunction('mortalityChance'),
    extractFunction('checkMortality'),
    extractFunction('killPerson'),
  ].join('\n\n'),
)
  .replace(/personNameHtmlAnnals\(/g, 'hooks.personNameHtmlAnnals(')
  .replace(/document\.getElementById\('btn-age-up'\)\.disabled = true;/, 'hooks.disableAgeUp();');

fs.writeFileSync(
  path.join(simDir, 'mortality.js'),
  `import { getAlive } from '../state/gameState.js';
import { ANNALS_PRIORITY, proposeAnnals } from './annals.js';
import { isJournaled } from './journal.js';

let hooks = {
  personNameHtmlAnnals: (p) => String(p?.firstName ?? ''),
  disableAgeUp: () => {},
};

export function registerMortalityHooks(h) {
  hooks = { ...hooks, ...h };
}

${mortalityBody}
`,
);

const siblingsBody = toExports(extractFunction('spawnPendingSiblings')).replace(
  /personNameHtmlAnnals\(/g,
  'hooks.personNameHtmlAnnals(',
);

fs.writeFileSync(
  path.join(simDir, 'siblings.js'),
  `import { G, getPerson } from '../state/gameState.js';
import { createPerson, inheritStats, applyInheritedStats, snapshotBirthStats } from '../state/personFactory.js';
import { randomName } from '../data/names.js';
import { assignRandomHumor } from './humorPersonality.js';
import { ANNALS_PRIORITY, proposeAnnals } from './annals.js';

let hooks = {
  personNameHtmlAnnals: (p) => String(p?.firstName ?? ''),
};

export function registerSiblingHooks(h) {
  hooks = { ...hooks, ...h };
}

${siblingsBody}
`,
);

console.log('Extracted sim modules for Phase 3');
