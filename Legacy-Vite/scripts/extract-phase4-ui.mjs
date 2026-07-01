#!/usr/bin/env node
/** Extract UI layers from legacy.js into ui/*.js (Phase 4). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const legacyPath = path.join(ROOT, '../src/legacy.js');
const uiDir = path.join(ROOT, '../src/ui');
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

function extractBlock(startLineTrimmed, endBeforeLine) {
  const start = lines.findIndex((l) => l.trim() === startLineTrimmed);
  const end = lines.findIndex((l, i) => i > start && l.trim().startsWith(endBeforeLine));
  if (start < 0 || end < 0) throw new Error(`Block not found: ${startLineTrimmed} → ${endBeforeLine}`);
  return lines.slice(start, end).map((l) => l.replace(/^    /, '')).join('\n');
}

function extractLet(name) {
  const re = new RegExp(`^    (const|let) ${name}`);
  const start = lines.findIndex((l) => re.test(l));
  if (start < 0) throw new Error(`Var not found: ${name}`);
  let end = start;
  for (let i = start; i < lines.length; i++) {
    if (lines[i].trim().endsWith(';') && i > start) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end + 1).map((l) => l.replace(/^    /, '')).join('\n');
}

function toExports(block) {
  return block.replace(/^function (\w+)/gm, 'export function $1');
}

function patchSection(block, replacements) {
  let out = block;
  for (const [from, to] of replacements) {
    out = out.replace(from, to);
  }
  return out;
}

const subnavBlock = extractBlock('const SUBNAV = {', '// ── Section nav');

// ── theme.js ──
fs.writeFileSync(
  path.join(uiDir, 'theme.js'),
  `import { VOCAB } from '../data/vocab.js';
import { G, getPlayer } from '../state/gameState.js';
import { clearPregnancy } from '../sim/conception.js';
import { applyHumorEmbraceSwap } from '../sim/traits.js';
import { ANNALS_PRIORITY, proposeAnnals } from '../sim/annals.js';
import { ITEMS_BY_ID } from '../data/items.js';
import { getOpenItemPopupId, refreshOpenItemPopup } from './itemPopup.js';
import { escapeHtml } from './eventLog.js';

let hooks = {
  renderSubNav: () => {},
  render: () => {},
  getItemPopupOptions: () => ({}),
};

export function registerThemeHooks(h) {
  hooks = { ...hooks, ...h };
}

${toExports(
  patchSection(
    [
      extractFunction('applyVocab'),
      extractFunction('currentMode'),
      extractFunction('setMode'),
      extractFunction('toggleEmbrace'),
      extractFunction('updateDebugLabel'),
    ].join('\n\n'),
    [
      [/if \(typeof renderSubNav === 'function'\) renderSubNav\(\)/g, 'hooks.renderSubNav()'],
      [/if \(typeof render === 'function' && player\) render\(\)/g, 'if (player) hooks.render()'],
      [/getItemPopupOptions\(\)/g, 'hooks.getItemPopupOptions()'],
      [/refreshOpenItemPopup\(item, player, escapeHtml, hooks\.getItemPopupOptions\(\)\)/g, 'refreshOpenItemPopup(item, player, escapeHtml, hooks.getItemPopupOptions())'],
    ],
  ),
)}
`,
);

// ── navigation.js ──
fs.writeFileSync(
  path.join(uiDir, 'navigation.js'),
  `import { VOCAB } from '../data/vocab.js';
import {
  bl,
  getPerson,
  getPlayer,
  getCurrentSection,
  setCurrentSection,
} from '../state/gameState.js';
import { closeSituationPopup, isSituationPopupOpen } from '../sim/situationPopup.js';
import { currentMode } from './theme.js';

let hooks = {
  render: () => {},
  renderBloodline: () => {},
  getDecisionsViewingId: () => null,
  setDecisionsViewingId: (_id) => {},
};

export function registerNavigationHooks(h) {
  hooks = { ...hooks, ...h };
}

${subnavBlock}

${toExports(
  patchSection(
    [
      extractFunction('setSubTab'),
      extractFunction('renderSubNav'),
      extractFunction('showSection'),
      extractFunction('normalizeBloodlineSubTab'),
    ].join('\n\n'),
    [
      [/decisionsPanelState\.viewingId/g, 'hooks.getDecisionsViewingId()'],
      [/hooks\.getDecisionsViewingId\(\) = null/g, 'hooks.setDecisionsViewingId(null)'],
      [/if \(needsRender && typeof render === 'function'\) render\(\)/g, 'if (needsRender) hooks.render()'],
      [/renderBloodline\(\)/g, 'hooks.renderBloodline()'],
      [/if \(typeof render === 'function'\) render\(\)/g, 'hooks.render()'],
      [/SUBNAV\[currentSection\]/g, 'SUBNAV[getCurrentSection()]'],
      [/currentSubTab\[currentSection\]/g, 'currentSubTab[getCurrentSection()]'],
      [/setSubTab\(currentSection,/g, 'setSubTab(getCurrentSection(),'],
      [/section-\$\{currentSection\}/g, 'section-${getCurrentSection()}'],
    ],
  ),
)}
`,
);

// ── relations.js ──
const relationsBlock = extractBlock(
  'const RELATION_LABEL_PRIORITY = [',
  'function matchesRelationFilter',
);
fs.writeFileSync(
  path.join(uiDir, 'relations.js'),
  `import {
  getPlayer,
  getPerson,
  getSiblings,
  getScions,
  getCousins,
  getGrandparents,
  getAuntsUncles,
  getGrandchildren,
} from '../state/gameState.js';

${relationsBlock}

${toExports(extractFunction('relationLabel'))}
`,
);

// ── searchPanel.js ──
fs.writeFileSync(
  path.join(uiDir, 'searchPanel.js'),
  `import { G, getPlayer } from '../state/gameState.js';
import { escapeHtml } from './eventLog.js';
import { careerDisplay } from '../sim/careers.js';
import { relationLabel } from './relations.js';
import { showSection, setSubTab } from './navigation.js';

let hooks = {
  portrait: () => '👤',
  personNameHtml: () => '',
};

export function registerSearchHooks(h) {
  hooks = { ...hooks, ...h };
}

${extractLet('searchState')}

${toExports(
  patchSection(
    [
      extractFunction('wireSearch'),
      extractFunction('clearSearchInput'),
      extractFunction('setSearchExpanded'),
      extractFunction('openSearchFromHeader'),
      extractFunction('toggleRelationChip'),
      extractFunction('paintChipGroup'),
      extractFunction('matchesRelationFilter'),
      extractFunction('renderSearchResults'),
      extractFunction('searchPersonCardHtml'),
    ].join('\n\n'),
    [
      [/portrait\(p\)/g, 'hooks.portrait(p)'],
      [/personNameHtml\(p\)/g, 'hooks.personNameHtml(p)'],
    ],
  ),
)}
`,
);

// ── renderHud.js ──
const renderBody = extractFunction('render').replace(/^function render/, 'export function renderGameHud');
fs.writeFileSync(
  path.join(uiDir, 'renderHud.js'),
  `import { G, getPlayer, getCurrentSection } from '../state/gameState.js';
import { clamp, statCap } from '../utils/index.js';
import { currentProwess } from '../sim/prowess.js';
import { currentFertility } from '../sim/conception.js';
import { effectiveCharisma, effectiveInsight } from '../sim/itemEffects.js';
import { wealthTierLabel } from '../sim/careers.js';
import { isInPrison, prisonCellLabel } from '../sim/prison.js';
import { hasUnreadSituations, unreadPanelSituations } from '../sim/situationAttention.js';
import { unreadEligibleDecisions } from '../sim/decisionAttention.js';
import { renderMemoriesPanel } from './memoriesPanel.js';
import { renderPossessionsPanel } from './renderPossessions.js';
import { escapeHtml } from './eventLog.js';
import { applyVocab } from './theme.js';

let hooks = {
  personName: () => '',
  renderPrisonPanel: () => {},
  renderBloodline: () => {},
  renderVocation: () => {},
  renderEducationPanel: () => {},
  renderSituationsPanel: () => {},
  renderFocusPanel: () => {},
  renderDecisionsPanel: () => {},
  tryShowImmersivePopup: () => {},
  tryShowAutoSituationPopup: () => {},
  eligibleDecisions: () => [],
  getItemPopupOptions: () => ({}),
  isImmersiveTemplate: () => false,
  isAutoOpenTemplate: () => false,
  SITUATIONS_BY_ID: {},
};

export function registerRenderHudHooks(h) {
  hooks = { ...hooks, ...h };
}

${patchSection(renderBody, [
  [/personName\(player\)/g, 'hooks.personName(player)'],
  [/renderPrisonPanel\(player\)/g, 'hooks.renderPrisonPanel(player)'],
  [/renderBloodline\(\)/g, 'hooks.renderBloodline()'],
  [/renderVocation\(\)/g, 'hooks.renderVocation()'],
  [/renderEducationPanel\(\)/g, 'hooks.renderEducationPanel()'],
  [/renderSituationsPanel\(\)/g, 'hooks.renderSituationsPanel()'],
  [/renderFocusPanel\(\)/g, 'hooks.renderFocusPanel()'],
  [/renderDecisionsPanel\(\)/g, 'hooks.renderDecisionsPanel()'],
  [/tryShowImmersivePopup\(\)/g, 'hooks.tryShowImmersivePopup()'],
  [/tryShowAutoSituationPopup\(\)/g, 'hooks.tryShowAutoSituationPopup()'],
  [/eligibleDecisions\(player\)/g, 'hooks.eligibleDecisions(player)'],
  [/isImmersiveTemplate/g, 'hooks.isImmersiveTemplate'],
  [/isAutoOpenTemplate/g, 'hooks.isAutoOpenTemplate'],
  [/SITUATIONS_BY_ID/g, 'hooks.SITUATIONS_BY_ID'],
  [/getItemPopupOptions\(\)/g, 'hooks.getItemPopupOptions()'],
  [/if \(currentSection ===/g, 'if (getCurrentSection() ==='],
])}
`,
);

// ── personInteract.js ──
fs.writeFileSync(
  path.join(uiDir, 'personInteract.js'),
  `import { G, getPlayer, getPerson } from '../state/gameState.js';
import { ANNALS_PRIORITY, proposeAnnals } from '../sim/annals.js';
import { currentFertility } from '../sim/conception.js';
import {
  getAvailableInteractChoices,
  isProposalAttemptAction,
  performPersonInteraction,
} from '../sim/personInteraction.js';
import {
  renderPersonInteractPanelHtml,
  renderProposeMarriagePanelHtml,
  wirePersonInteractPanel,
  wireProposeMarriagePanel,
} from './personPanels.js';
import { relationshipBondPanelHtml } from './relationshipBars.js';
import { openMarriageProposalResultPopup } from './marriageProposalPopup.js';
import { escapeHtml } from './eventLog.js';

let hooks = {
  render: () => {},
  renderBloodline: () => {},
  renderPersonInfoInteractView: (_id) => {},
  personNameHtml: () => '',
  personNameHtmlAnnals: () => '',
};

export function registerPersonInteractHooks(h) {
  hooks = { ...hooks, ...h };
}

${toExports(
  patchSection(
    [
      extractFunction('canInteractWithPerson'),
      extractFunction('interactPanelHtml'),
      extractFunction('wireInteractPanel'),
      extractFunction('handlePersonInteractAction'),
    ].join('\n\n'),
    [
      [/personNameHtmlAnnals/g, 'hooks.personNameHtmlAnnals'],
      [/personNameHtml/g, 'hooks.personNameHtml'],
      [/render\(\)/g, 'hooks.render()'],
      [/renderBloodline\(\)/g, 'hooks.renderBloodline()'],
      [/renderPersonInfoInteractView\(p\.id\)/g, 'hooks.renderPersonInfoInteractView(p.id)'],
      [/renderPersonInfoInteractView\(personId\)/g, 'hooks.renderPersonInfoInteractView(personId)'],
    ],
  ),
)}
`,
);

// ── personModal.js ──
const personInfoStateBlock = extractLet('personInfoState').replace('const personInfoState', 'export const personInfoState');
fs.writeFileSync(
  path.join(uiDir, 'personModal.js'),
  `import { getPerson, getPlayer, getCurrentSection } from '../state/gameState.js';
import { escapeHtml } from './eventLog.js';
import { careerDisplay } from '../sim/careers.js';
import { relationLabel } from './relations.js';
import { focalStatsHtml } from './bloodline.js';
import { showSection, setSubTab } from './navigation.js';
import {
  renderPersonActionBarHtml,
  renderPersonTraitsPanelHtml,
  renderPersonItemsPanelHtml,
  wirePersonActionBar,
  wirePersonItemsPanel,
  wirePersonPanelBack,
} from './personPanels.js';
import { relationshipBondPanelHtml } from './relationshipBars.js';
import {
  canInteractWithPerson,
  interactPanelHtml,
  wireInteractPanel,
  handlePersonInteractAction,
} from './personInteract.js';

let hooks = {
  portrait: () => '👤',
  personNameHtml: () => '',
  setFocal: (_id) => {},
  getItemPopupOptions: () => ({}),
};

export function registerPersonModalHooks(h) {
  hooks = { ...hooks, ...h };
}

${personInfoStateBlock}

${toExports(
  patchSection(
    [
      extractFunction('wirePersonInfoInteractEvents'),
      extractFunction('closePersonInfoModal'),
      extractFunction('personInfoHeaderHtml'),
      extractFunction('wirePersonInfoPortrait'),
      extractFunction('wirePersonInfoActionBar'),
      extractFunction('wirePersonInfoDetailsEvents'),
      extractFunction('renderPersonInfoDetailsView'),
      extractFunction('renderPersonInfoTraitsView'),
      extractFunction('renderPersonInfoItemsView'),
      extractFunction('renderPersonInfoInteractView'),
      extractFunction('openPersonInfoModal'),
      extractFunction('wirePersonInfoOverlay'),
    ].join('\n\n'),
    [
      [/portrait\(p\)/g, 'hooks.portrait(p)'],
      [/personNameHtml\(p\)/g, 'hooks.personNameHtml(p)'],
      [/getItemPopupOptions\(\)/g, 'hooks.getItemPopupOptions()'],
      [/currentSection !== 'bloodline'/g, "getCurrentSection() !== 'bloodline'"],
      [/setFocal\(p\.id\)/g, 'hooks.setFocal(p.id)'],
    ],
  ),
)}
`,
);

// ── bloodline.js ──
const breadcrumbMax = extractLet('BREADCRUMB_MAX');
const blFocalViewLet = "let blFocalView = 'profile';\nlet blFocalInteractSubView = null;";
const subsectionStateBlock = extractBlock(
  'const subsectionCollapseState = {',
  '/** Apply per-focal family collapse defaults',
);
const lastFamilyLet = 'let lastFamilyCollapseFocalId = null;';
const clanMaxDepth = extractLet('CLAN_MAX_DEPTH');
const minionGroups = extractBlock('const MINION_GROUPS = [', '// Collect this focal');

const bloodlineFunctions = [
  'ensureBloodlineTrail',
  'setFocal',
  'jumpToCrumb',
  'clearBloodlineTrail',
  'renderBloodline',
  'renderFocalPartner',
  'focalStatsHtml',
  'renderBreadcrumb',
  'wireBreadcrumbControls',
  'syncFamilyCollapseDefaults',
  'renderBlFocalActions',
  'renderBlFocalStats',
  'wireSubsectionCollapse',
  'renderClanTab',
  'clanTierHtml',
  'minionsByType',
  'renderMinionsTab',
  'minionGroupHtml',
  'renderRelationsTab',
  'subsectionCollapsibleHtml',
  'personCardHtml',
  'initBloodlineFocus',
].map((name) => extractFunction(name)).join('\n\n');

const subnavExports = subnavBlock
  .replace(/^const SUBNAV/, 'export const SUBNAV')
  .replace(/^const currentSubTab/, 'export const currentSubTab');

// Re-write navigation with exports
fs.writeFileSync(
  path.join(uiDir, 'navigation.js'),
  fs.readFileSync(path.join(uiDir, 'navigation.js'), 'utf8').replace(subnavBlock, subnavExports),
);

fs.writeFileSync(
  path.join(uiDir, 'bloodline.js'),
  `import { VOCAB } from '../data/vocab.js';
import {
  bl,
  getPerson,
  getPlayer,
  getSpouses,
  getLovers,
  getFriends,
  getEnemies,
  getSire,
  getCurrentSection,
} from '../state/gameState.js';
import { statCap } from '../utils/index.js';
import { currentProwess } from '../sim/prowess.js';
import { currentFertility } from '../sim/conception.js';
import { wealthTierLabel, careerDisplay } from '../sim/careers.js';
import {
  renderFamilyTab,
  defaultFamilyCollapseState,
  FAMILY_PREVIEW_COUNT,
} from './familyTab.js';
import { escapeHtml } from './eventLog.js';
import { relationLabel } from './relations.js';
import { relationshipBondPanelHtml, relationshipCardBarsHtml } from './relationshipBars.js';
import {
  renderPersonActionBarHtml,
  renderPersonTraitsPanelHtml,
  renderPersonItemsPanelHtml,
  wirePersonActionBar,
  wirePersonItemsPanel,
  wirePersonPanelBack,
} from './personPanels.js';
import { currentMode } from './theme.js';
import {
  SUBNAV,
  currentSubTab,
  renderSubNav,
  normalizeBloodlineSubTab,
} from './navigation.js';
import {
  canInteractWithPerson,
  interactPanelHtml,
  wireInteractPanel,
  handlePersonInteractAction,
} from './personInteract.js';

let hooks = {
  portrait: () => '👤',
  personNameHtml: () => '',
  getItemPopupOptions: () => ({}),
};

export function registerBloodlineHooks(h) {
  hooks = { ...hooks, ...h };
}

${breadcrumbMax}

${blFocalViewLet}

${subsectionStateBlock}

${lastFamilyLet}

${clanMaxDepth}

${minionGroups}

${toExports(
  patchSection(bloodlineFunctions, [
    [/portrait\(/g, 'hooks.portrait('],
    [/personNameHtml\(/g, 'hooks.personNameHtml('],
    [/getItemPopupOptions\(\)/g, 'hooks.getItemPopupOptions()'],
    [/currentSection === 'bloodline'/g, "getCurrentSection() === 'bloodline'"],
  ]),
)}
`,
);

console.log('Phase 4 UI modules written to src/ui/');
