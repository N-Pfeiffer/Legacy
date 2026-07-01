import fs from 'fs';

const legacyPath = 'src/legacy.js';
const lines = fs.readFileSync(legacyPath, 'utf8').split(/\r?\n/);

const unindent = (start, end) =>
  lines
    .slice(start - 1, end)
    .map((l) => l.replace(/^    /, ''))
    .join('\n');

const write = (path, content) => {
  fs.writeFileSync(path, content);
  console.log('wrote', path);
};

// ── data/eras.js
write(
  'src/data/eras.js',
  `${unindent(1734, 1760)}\n`,
);

// ── data/careers.js
write(
  'src/data/careers.js',
  `${unindent(1820, 2115).replace(/^const CAREERS/, 'export const CAREERS').replace(/^const CAREERS_BY_ID/, 'export const CAREERS_BY_ID')}\n`,
);

// ── data/education.js
write(
  'src/data/education.js',
  `${unindent(2590, 2660)}\n`,
);

// ── data/playerEvents.js
write(
  'src/data/playerEvents.js',
  `${unindent(2785, 3011).replace(/^const PLAYER_EVENTS/, 'export const PLAYER_EVENTS')}\n`,
);

// ── utils weightedPick
write(
  'src/utils/weightedPick.js',
  `${unindent(3030, 3040).replace(/^function weightedPick/, 'export function weightedPick')}\n`,
);

// ── sim/mortality.js
write(
  'src/sim/mortality.js',
  `import { G, getAlive } from '../state/gameState.js';

let hooks = {
  log: () => {},
  onPlayerDeath: () => {},
};

export function registerMortalityHooks(h) {
  hooks = { ...hooks, ...h };
}

${unindent(3103, 3118)
  .replace(/^function mortalityChance/, 'export function mortalityChance')
  .replace(/^function checkMortality/, 'export function checkMortality')}

export function killPerson(p) {
  p.isAlive = false;
  p.yearDied = G.year;
  hooks.log(
    hooks.personNameHtml(p) + \` has passed away at age \${p.age}.\`,
    p.isPlayer ? 'bad' : 'info',
    true,
  );
  if (p.isPlayer) {
    hooks.log('Your mortal life has ended. The bloodline endures.', 'bad', false);
    hooks.onPlayerDeath();
  }
}
`,
);

// Fix mortality - personNameHtml is a function not on hooks
// Rewrite mortality properly below

// ── sim/siblings.js
write(
  'src/sim/siblings.js',
  `import { G, getPerson } from '../state/gameState.js';

let hooks = {};

export function registerSiblingHooks(h) {
  hooks = { ...hooks, ...h };
}

${unindent(1660, 1708).replace(/^function spawnPendingSiblings/, 'export function spawnPendingSiblings')}
`,
);

// sibling body uses createPerson, randomName, etc. - replace with hooks.
const siblingBody = unindent(1660, 1708)
  .replace(/^function spawnPendingSiblings/, 'export function spawnPendingSiblings')
  .replace(/createPerson\(/g, 'hooks.createPerson(')
  .replace(/randomName\(/g, 'hooks.randomName(')
  .replace(/inheritStats\(/g, 'hooks.inheritStats(')
  .replace(/snapshotBirthStats\(/g, 'hooks.snapshotBirthStats(')
  .replace(/personNameHtml\(/g, 'hooks.personNameHtml(')
  .replace(/addLog\(/g, 'hooks.addLog(');

write(
  'src/sim/siblings.js',
  `import { G, getPerson } from '../state/gameState.js';

let hooks = {};

export function registerSiblingHooks(h) {
  hooks = { ...hooks, ...h };
}

${siblingBody}
`,
);

// ── sim/educationTick.js
const eduTick = unindent(2673, 2729)
  .replace(/^function tickEducation/, 'export function tickEducation')
  .replace(/fireSituation\(/g, 'hooks.fireSituation(')
  .replace(/addLog\(/g, 'hooks.addLog(');

write(
  'src/sim/educationTick.js',
  `import { G } from '../state/gameState.js';
import {
  EDUCATION_LADDER,
  HIGHER_ED_IN_PROGRESS_STAGES,
} from '../data/education.js';

let hooks = {};

export function registerEducationTickHooks(h) {
  hooks = { ...hooks, ...h };
}

${eduTick}
`,
);

// education data file needs export keywords
let eduData = unindent(2590, 2660);
eduData = eduData
  .replace(/^const EDUCATION_LADDER/, 'export const EDUCATION_LADDER')
  .replace(/^const EDUCATION_LADDER_BY_ID/, 'export const EDUCATION_LADDER_BY_ID')
  .replace(/^const HIGHER_ED_IN_PROGRESS_STAGES/, 'export const HIGHER_ED_IN_PROGRESS_STAGES')
  .replace(/^const COMPLETED_DEGREE_STAGES/, 'export const COMPLETED_DEGREE_STAGES')
  .replace(/^const COMPLETED_DEGREE_INDEX/, 'export const COMPLETED_DEGREE_INDEX')
  .replace(/^function playerHasDegree/, 'export function playerHasDegree')
  .replace(/^function nextDegreeFor/, 'export function nextDegreeFor')
  .replace(/^function canApplyForDegree/, 'export function canApplyForDegree');
write('src/data/education.js', `${eduData}\n`);

// ── sim/events.js
let eventsSim = unindent(3013, 3100);
eventsSim = eventsSim
  .replace(/^function resolveFlavor/, 'export function resolveFlavor')
  .replace(/^function eventEligibleEras/, 'export function eventEligibleEras')
  .replace(/^function processPlayerEvents/, 'export function processPlayerEvents')
  .replace(/eligibleEras\(/g, 'eligibleEras(')
  .replace(/addLog\(/g, 'hooks.addLog(')
  .replace(/const count = pick\(/g, 'const count = hooks.pick(');

write(
  'src/sim/events.js',
  `import { G } from '../state/gameState.js';
import { eligibleEras } from '../data/eras.js';
import { PLAYER_EVENTS } from '../data/playerEvents.js';
import { weightedPick } from '../utils/weightedPick.js';
import { pick } from '../utils/index.js';

let hooks = { addLog: () => {}, pick };

export function registerEventHooks(h) {
  hooks = { ...hooks, ...h };
}

${eventsSim.replace(/weightedPick\(weighted\)/g, 'weightedPick(weighted)')}
`,
);

// Fix events - processPlayerEvents uses pick not weightedPick for count
const eventsBody = unindent(3055, 3100)
  .replace(/^function processPlayerEvents/, 'export function processPlayerEvents')
  .replace(/addLog\(/g, 'hooks.addLog(')
  .replace(/\bpick\(/g, 'hooks.pick(');

const eventsHelpers = unindent(3013, 3040)
  .replace(/^function resolveFlavor/, 'export function resolveFlavor')
  .replace(/^function eventEligibleEras/, 'export function eventEligibleEras');

write(
  'src/sim/events.js',
  `import { G } from '../state/gameState.js';
import { eligibleEras } from '../data/eras.js';
import { PLAYER_EVENTS } from '../data/playerEvents.js';
import { weightedPick } from '../utils/weightedPick.js';

let hooks = { addLog: () => {}, pick: (arr) => arr[0] };

export function registerEventHooks(h) {
  hooks = { ...hooks, ...h };
}

${eventsHelpers}

${eventsBody.replace(/weightedPick\(/g, 'weightedPick(')}
`,
);

// ── sim/careers.js - large block with hooks for stat helpers
let careersSim = unindent(2117, 2514);
careersSim = careersSim
  .replace(/^function /gm, 'export function ')
  .replace(/^const PROMOTION/, 'export const PROMOTION')
  .replace(/^const RETIREMENT/, 'export const RETIREMENT')
  .replace(/^const DEMOTION/, 'export const DEMOTION')
  .replace(/currentEra\(/g, 'currentEra(')
  .replace(/CAREERS_BY_ID/g, 'CAREERS_BY_ID')
  .replace(/CAREERS\./g, 'CAREERS.')
  .replace(/addLog\(/g, 'hooks.addLog(')
  .replace(/personNameHtml\(/g, 'hooks.personNameHtml(')
  .replace(/currentProwess\(/g, 'hooks.currentProwess(')
  .replace(/currentFertility\(/g, 'hooks.currentFertility(')
  .replace(/statCap\(/g, 'hooks.statCap(')
  .replace(/recomputeJournalFlags\(\)/g, 'recomputeJournalFlags()');

write(
  'src/sim/careers.js',
  `import { G } from '../state/gameState.js';
import { CAREERS, CAREERS_BY_ID } from '../data/careers.js';
import { currentEra } from '../data/eras.js';
import { recomputeJournalFlags } from './journal.js';
import { weightedPick } from '../utils/weightedPick.js';

let hooks = {
  addLog: () => {},
  personNameHtml: () => '',
  currentProwess: () => 0,
  currentFertility: () => 0,
  statCap: () => 100,
};

export function registerCareerHooks(h) {
  hooks = { ...hooks, ...h };
}

${careersSim}
`,
);

// ── sim/journal.js add isJournaled
const isJournaledFn = unindent(2173, 2181).replace(/^function isJournaled/, 'export function isJournaled');
const journalExisting = fs.readFileSync('src/sim/journal.js', 'utf8');
if (!journalExisting.includes('isJournaled')) {
  write('src/sim/journal.js', `${journalExisting.trim()}\n\n${isJournaledFn}\n`);
}

// ── ui/theme.js
write(
  'src/ui/theme.js',
  `import { VOCAB } from '../data/vocab.js';

let hooks = {
  renderSubNav: () => {},
  render: () => {},
  getPlayer: () => null,
};

export function registerThemeHooks(h) {
  hooks = { ...hooks, ...h };
}

${unindent(4290, 4322)
  .replace(/^function applyVocab/, 'export function applyVocab')
  .replace(/^function currentMode/, 'export function currentMode')
  .replace(/^function setMode/, 'export function setMode')
  .replace(/renderSubNav\(\)/g, 'hooks.renderSubNav()')
  .replace(/getPlayer\(\)/g, 'hooks.getPlayer()')
  .replace(/typeof render === 'function' && hooks.getPlayer\(\) render\(\)/, 'hooks.getPlayer() && hooks.render()')}
`,
);

// Fix setMode line manually in theme
let themeCode = unindent(4290, 4322)
  .replace(/^function applyVocab/, 'export function applyVocab')
  .replace(/^function currentMode/, 'export function currentMode')
  .replace(/^function setMode/, 'export function setMode');

themeCode = themeCode.replace(
  `  if (typeof renderSubNav === 'function') renderSubNav();
  // The bloodline view caches its display values — re-render so the
  // 'Mortal' / 'Vampire' badge in the sidebar updates if applicable.
  if (typeof render === 'function' && getPlayer()) render();`,
  `  hooks.renderSubNav();
  if (hooks.getPlayer()) hooks.render();`,
);

write(
  'src/ui/theme.js',
  `import { VOCAB } from '../data/vocab.js';

let hooks = {
  renderSubNav: () => {},
  render: () => {},
  getPlayer: () => null,
};

export function registerThemeHooks(h) {
  hooks = { ...hooks, ...h };
}

${themeCode}
`,
);

// ── ui/navigation.js
let navBlock = unindent(4375, 4509);
navBlock = navBlock
  .replace(/^const SUBNAV/, 'export const SUBNAV')
  .replace(/^const currentSubTab/, 'export let currentSubTab')
  .replace(/^function setSubTab/, 'export function setSubTab')
  .replace(/^function renderSubNav/, 'export function renderSubNav')
  .replace(/^function showSection/, 'export function showSection')
  .replace(/setCurrentSection\(/g, 'setCurrentSection(')
  .replace(/currentSection/g, 'getCurrentSection()')
  .replace(/getCurrentSection\(\) ===/g, 'getCurrentSection() ===')
  .replace(/currentSubTab\[getCurrentSection\(\)\]/g, 'currentSubTab[getCurrentSection()]')
  .replace(/SUBNAV\[getCurrentSection\(\)\]/g, 'SUBNAV[getCurrentSection()]')
  .replace(/renderBloodline\(\)/g, 'hooks.renderBloodline()')
  .replace(/typeof render === 'function' render\(\)/g, 'hooks.render()');

write(
  'src/ui/navigation.js',
  `import { VOCAB } from '../data/vocab.js';
import { bl, getPerson, getPlayer, getCurrentSection, setCurrentSection } from '../state/gameState.js';
import { currentMode } from './theme.js';

let hooks = {
  renderBloodline: () => {},
  render: () => {},
  resetDecisionsState: () => {},
  resetSituationsState: () => {},
};

export function registerNavigationHooks(h) {
  hooks = { ...hooks, ...h };
}

${navBlock
  .replace(
    `      decisionsPanelState.viewingId = null;
      situationsPanelState.viewingId = null;`,
    `      hooks.resetDecisionsState();
      hooks.resetSituationsState();`,
  )
  .replace(
    /`section-\$\{name\}`/,
    '`section-${name}`',
  )}
`,
);

// Fix navigation - currentSection used as variable in renderSubNav - need getCurrentSection import
// gameState needs getCurrentSection export

// ── ui/renderHud.js
const hudBody = unindent(4177, 4269).replace(/^function render\(\) \{[\s\S]*?const player = getPlayer\(\);/m, '').replace(/^\s*const player = getPlayer\(\);\n/, '');

write(
  'src/ui/renderHud.js',
  `import { G, getPlayer, getSire, getCurrentSection } from '../state/gameState.js';
import { clamp } from '../utils/index.js';

export function renderPlayerHud(ctx) {
  const player = getPlayer();
  if (!player) return;

  const {
    cc,
    portrait,
    personName,
    statCap,
    currentProwess,
    currentFertility,
    wealthTierLabel,
    renderBloodline,
    renderVocation,
    renderEducationPanel,
    renderSituationsPanel,
    renderDecisionsPanel,
    pendingSituationCount,
  } = ctx;

${hudBody}}
`,
);

// ── mortality.js proper
write(
  'src/sim/mortality.js',
  `import { G, getAlive } from '../state/gameState.js';

let hooks = {
  addLog: () => {},
  disableAgeUp: () => {},
  personNameHtml: (p) => String(p?.firstName ?? ''),
};

export function registerMortalityHooks(h) {
  hooks = { ...hooks, ...h };
}

${unindent(3103, 3118)
  .replace(/^function mortalityChance/, 'export function mortalityChance')
  .replace(/^function checkMortality/, 'export function checkMortality')}

export function killPerson(p) {
  p.isAlive = false;
  p.yearDied = G.year;
  hooks.addLog(\`\${hooks.personNameHtml(p)} has passed away at age \${p.age}.\`, p.isPlayer ? 'bad' : 'info');
  if (p.isPlayer) {
    hooks.addLog('Your mortal life has ended. The bloodline endures.', 'bad');
    hooks.disableAgeUp();
  }
}
`,
);

// ── Patch legacy: remove ranges (descending)
const ranges = [
  [4375, 4509],
  [4290, 4322],
  [4176, 4270],
  [3102, 3128],
  [2749, 3100],
  [2673, 2729],
  [2590, 2660],
  [2117, 2514],
  [1820, 2115],
  [1734, 1760],
  [1659, 1708],
];

let L = [...lines];
for (const [start, end] of ranges.sort((a, b) => b[0] - a[0])) {
  L.splice(start - 1, end - start + 1);
}

const newImports = `import { currentEra, eligibleEras } from './data/eras.js';
import { CAREERS, CAREERS_BY_ID } from './data/careers.js';
import {
  EDUCATION_LADDER,
  EDUCATION_LADDER_BY_ID,
  HIGHER_ED_IN_PROGRESS_STAGES,
  playerHasDegree,
  nextDegreeFor,
  canApplyForDegree,
} from './data/education.js';
import { spawnPendingSiblings, registerSiblingHooks } from './sim/siblings.js';
import {
  careerName,
  careerRankLabel,
  careerDisplay,
  isJournaled,
  pickCareerForNPC,
  assignCareerToPerson,
  assignCareerToPersonWithAgeFit,
  tickCareerProgression,
  careerFitScore,
  playerCareerFitScore,
  wealthTierLabel,
  careerWealthTarget,
  PROMOTION_CADENCE_YEARS,
  RETIREMENT_AGE,
  registerCareerHooks,
} from './sim/careers.js';
import { tickEducation, registerEducationTickHooks } from './sim/educationTick.js';
import { processPlayerEvents, registerEventHooks } from './sim/events.js';
import { checkMortality, registerMortalityHooks } from './sim/mortality.js';
import { applyVocab, currentMode, setMode, registerThemeHooks } from './ui/theme.js';
import {
  SUBNAV,
  currentSubTab,
  setSubTab,
  renderSubNav,
  showSection,
  registerNavigationHooks,
} from './ui/navigation.js';
import { renderPlayerHud } from './ui/renderHud.js';
`;

let out = L.join('\n');
out = out.replace(
  /import { runYearTick } from '\.\/sim\/yearTick\.js';\n/,
  `import { runYearTick } from './sim/yearTick.js';\n${newImports}`,
);

// Insert render() wrapper and hook registration before IIFE end
const hookBlock = `
    registerSiblingHooks({
      createPerson,
      randomName,
      inheritStats,
      snapshotBirthStats,
      personNameHtml,
      addLog,
    });
    registerEducationTickHooks({ fireSituation, addLog });
    registerEventHooks({ addLog, pick });
    registerMortalityHooks({
      addLog,
      personNameHtml,
      disableAgeUp: () => {
        const btn = document.getElementById('btn-age-up');
        if (btn) btn.disabled = true;
      },
    });
    registerCareerHooks({
      addLog,
      personNameHtml,
      currentProwess,
      currentFertility,
      statCap,
    });
    registerThemeHooks({ renderSubNav, render, getPlayer });
    registerNavigationHooks({
      renderBloodline,
      render,
      resetDecisionsState: () => { decisionsPanelState.viewingId = null; },
      resetSituationsState: () => { situationsPanelState.viewingId = null; },
    });

    function render() {
      renderPlayerHud({
        cc,
        portrait,
        personName,
        statCap,
        currentProwess,
        currentFertility,
        wealthTierLabel,
        renderBloodline,
        renderVocation,
        renderEducationPanel,
        renderSituationsPanel,
        renderDecisionsPanel,
        pendingSituationCount,
      });
    }
`;

out = out.replace(
  /registerSaveMigrationDeps\(\{ pickCareerForNPC, CAREERS_BY_ID \}\);/,
  `${hookBlock}\n    registerSaveMigrationDeps({ pickCareerForNPC, CAREERS_BY_ID });`,
);

// Fix ageUp to use direct imports
out = out.replace(
  /const advanced = runYearTick\(\{[\s\S]*?\}\);/,
  `const advanced = runYearTick({
        pendingSituationCount,
        onPlayerCareerNudge(player) {
          if (!player.career) {
            if (player.age === 18) {
              addLog('You are of age. A path lies open — choose a career when you are ready.', 'info');
            } else if (player.age === 25) {
              addLog('Years are passing without a calling. Visit your Vocation panel to choose a path.', 'info');
            }
          }
        },
      });`,
);

fs.writeFileSync(legacyPath, out);
console.log('patched legacy.js', L.length, 'lines');
