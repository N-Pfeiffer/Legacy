#!/usr/bin/env node
/** Wire legacy.js to Phase 3 sim modules and remove extracted inline functions. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const legacyPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/legacy.js');
let src = fs.readFileSync(legacyPath, 'utf8');

const importBlock = `import {
  careerName,
  careerRankLabel,
  careerDisplay,
  pickCareerForNPC,
  assignCareerToPerson,
  assignCareerToPersonWithAgeFit,
  assignEarlyCareerToNPC,
  careerFitScore,
  wealthTierLabel,
  careerWealthTarget,
  tickCareerProgression,
  registerCareerHooks,
} from './sim/careers.js';
import {
  playerHasDegree,
  nextDegreeFor,
  canApplyForDegree,
  commitDegreeApplication,
  tickEducation,
  educationStageLabel,
  registerEducationTickHooks,
} from './sim/educationTick.js';
import { processPlayerEvents, registerEventHooks } from './sim/events.js';
import {
  checkMortality,
  killPerson,
  registerMortalityHooks,
} from './sim/mortality.js';
import { spawnPendingSiblings, registerSiblingHooks } from './sim/siblings.js';
import { currentFertility } from './sim/conception.js';
import { isJournaled } from './sim/journal.js';
`;

if (!src.includes("from './sim/careers.js'")) {
  src = src.replace(
    "} from './data/socialClass.js';\n",
    "} from './data/socialClass.js';\n" + importBlock,
  );
}

function removeBetween(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker, start);
  if (start < 0 || end < 0) {
    throw new Error(`removeBetween failed:\n  start: ${startMarker.slice(0, 60)}\n  end: ${endMarker.slice(0, 60)}`);
  }
  return text.slice(0, start) + text.slice(end);
}

// currentFertility block
src = removeBetween(
  src,
  '    // ════════════════════════════════════════════════════════════\n    //   FERTILITY',
  '    // ════════════════════════════════════════════════════════════\n    //   PROWESS',
);

// spawnPendingSiblings
src = removeBetween(
  src,
  '    // ── Spawn younger siblings when their birth year arrives ───\n    function spawnPendingSiblings(player) {',
  '    // ── Eras ───────────────────────────────────────────────────',
);

// Career sim through tickCareerProgression (keep UI section comment)
src = removeBetween(
  src,
  '    // Resolve the display name (career label only) for a person',
  '    // ── Education (Layer 4a + 4b) ──────────────────────────────',
);

// Education helpers + tick (keep events section)
src = removeBetween(
  src,
  '    // Returns true if the player\'s education stage represents having',
  '    // ── Events ─────────────────────────────────────────────────',
);

// Events helpers (keep mortality section)
src = removeBetween(
  src,
  '    // Resolve the flavor cell for an event at a given era/mode. Returns the',
  '    // ── Mortality ──────────────────────────────────────────────',
);

// Mortality functions
src = removeBetween(
  src,
  '    function mortalityChance(p) {',
  '    // ── Player career UI (Layer 3) ─────────────────────────────',
);

const hookBlock = `
    registerCareerHooks({ personNameHtmlAnnals });
    registerEducationTickHooks({
      fireSituation,
      onAfterDegreeCommit: render,
    });
    registerEventHooks({ fireSituation });
    registerMortalityHooks({
      personNameHtmlAnnals,
      disableAgeUp: () => {
        const btn = document.getElementById('btn-age-up');
        if (btn) btn.disabled = true;
      },
    });
    registerSiblingHooks({ personNameHtmlAnnals });
    registerSaveMigrationDeps({ pickCareerForNPC, CAREERS_BY_ID });
`;

if (!src.includes('registerEducationTickHooks')) {
  src = src.replace(
    '    registerSaveMigrationDeps({ pickCareerForNPC, CAREERS_BY_ID });',
    hookBlock.trim(),
  );
}

// Remove duplicate isJournaled if still inline
src = src.replace(
  /    function isJournaled\(p\) \{[\s\S]*?return !!p\._journaled;\n    \}\n\n/,
  '',
);

fs.writeFileSync(legacyPath, src);
console.log('Patched legacy.js for Phase 3');
