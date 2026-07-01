#!/usr/bin/env node
/** Remove Phase-2 data blocks from legacy.js after extraction to data/*.js */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const legacyPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/legacy.js');
let src = fs.readFileSync(legacyPath, 'utf8');

const importBlock = `import { currentEra, eligibleEras } from './data/eras.js';
import {
  CAREERS,
  CAREERS_BY_ID,
  SCHOOL_WORK_MIN_AGE,
  SCHOOL_WORK_HEALTH_COST_PER_YEAR,
} from './data/careers.js';
import {
  EDUCATION_LADDER,
  EDUCATION_LADDER_BY_ID,
  HIGHER_ED_IN_PROGRESS_STAGES,
  COMPLETED_DEGREE_STAGES,
  COMPLETED_DEGREE_INDEX,
} from './data/education.js';
import { PLAYER_EVENTS } from './data/playerEvents.js';
`;

if (!src.includes("from './data/eras.js'")) {
  src = src.replace(
    "} from './data/socialClass.js';\n",
    "} from './data/socialClass.js';\n" + importBlock,
  );
}

function removeBetween(srcText, startMarker, endMarker) {
  const start = srcText.indexOf(startMarker);
  const end = srcText.indexOf(endMarker, start);
  if (start < 0 || end < 0) {
    throw new Error(`Markers not found: ${startMarker.slice(0, 40)} ... ${endMarker.slice(0, 40)}`);
  }
  return srcText.slice(0, start) + srcText.slice(end);
}

// Eras block (keep section comment, drop inline definitions)
src = removeBetween(
  src,
  '    const ERAS = [1800, 1850, 1900, 1950, 2000];',
  '    // ── Careers ────────────────────────────────────────────────',
);

// Careers data (keep careers section comment)
src = removeBetween(
  src,
  '    const SCHOOL_WORK_MIN_AGE = 14;',
  '    // Resolve the display name (career label only) for a person',
);

// Education ladder + derived constants (keep helper functions)
src = removeBetween(
  src,
  '    const EDUCATION_LADDER = [',
  '    // Returns true if the player\'s education stage represents having',
);

// Player events array (keep resolveFlavor)
src = removeBetween(
  src,
  '    const PLAYER_EVENTS = [',
  '    // Resolve the flavor cell for an event at a given era/mode. Returns the',
);

fs.writeFileSync(legacyPath, src);
console.log('Patched legacy.js');
