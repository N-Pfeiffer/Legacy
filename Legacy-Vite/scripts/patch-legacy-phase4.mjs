#!/usr/bin/env node
/** Wire legacy.js to Phase 4 UI modules and remove extracted inline code. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const legacyPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/legacy.js');
let src = fs.readFileSync(legacyPath, 'utf8');

const importBlock = `import {
  applyVocab,
  currentMode,
  setMode,
  toggleEmbrace,
  updateDebugLabel,
  registerThemeHooks,
} from './ui/theme.js';
import {
  SUBNAV,
  currentSubTab,
  setSubTab,
  renderSubNav,
  showSection,
  normalizeBloodlineSubTab,
  registerNavigationHooks,
} from './ui/navigation.js';
import { relationLabel } from './ui/relations.js';
import {
  searchState,
  wireSearch,
  renderSearchResults,
  registerSearchHooks,
} from './ui/searchPanel.js';
import { renderGameHud, registerRenderHudHooks } from './ui/renderHud.js';
import {
  canInteractWithPerson,
  registerPersonInteractHooks,
} from './ui/personInteract.js';
import {
  openPersonInfoModal,
  wirePersonInfoOverlay,
  renderPersonInfoInteractView,
  registerPersonModalHooks,
} from './ui/personModal.js';
import {
  setFocal,
  renderBloodline,
  wireBreadcrumbControls,
  wireSubsectionCollapse,
  initBloodlineFocus,
  registerBloodlineHooks,
} from './ui/bloodline.js';
`;

if (!src.includes("from './ui/theme.js'")) {
  src = src.replace(
    "} from './sim/siblings.js';\n",
    "} from './sim/siblings.js';\n" + importBlock,
  );
}

function removeBetween(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker, start);
  if (start < 0 || end < 0) {
    throw new Error(`removeBetween failed:\n  start: ${startMarker.slice(0, 80)}\n  end: ${endMarker.slice(0, 80)}`);
  }
  return text.slice(0, start) + text.slice(end);
}

// render() → thin wrapper
src = src.replace(
  /    \/\/ ── Render ─────────────────────────────────────────────────\n    function render\(\) \{[\s\S]*?    \}\n\n    \/\/ ════════════════════════════════════════════════════════════\n    \/\/   THEME & VOCABULARY/,
  `    function render() {
      renderGameHud();
    }

    // ════════════════════════════════════════════════════════════
    //   THEME & VOCABULARY`,
);

// Theme section through end of updateDebugLabel
src = removeBetween(
  src,
  '    // ════════════════════════════════════════════════════════════\n    //   THEME & VOCABULARY',
  '    // ════════════════════════════════════════════════════════════\n    //   SECTION + SUB-NAV SYSTEM',
);

// Navigation + search + relations + bloodline header through initBloodlineFocus
src = removeBetween(
  src,
  '    // ════════════════════════════════════════════════════════════\n    //   SECTION + SUB-NAV SYSTEM',
  '    registerCareerHooks({ personNameHtmlAnnals });',
);

const hookBlock = `
    registerThemeHooks({
      renderSubNav,
      render,
      getItemPopupOptions,
    });
    registerNavigationHooks({
      render,
      renderBloodline,
      getDecisionsViewingId: () => decisionsPanelState.viewingId,
      setDecisionsViewingId: (id) => { decisionsPanelState.viewingId = id; },
    });
    registerRenderHudHooks({
      personName,
      renderPrisonPanel,
      renderBloodline,
      renderVocation,
      renderEducationPanel,
      renderSituationsPanel,
      renderFocusPanel,
      renderDecisionsPanel,
      tryShowImmersivePopup,
      tryShowAutoSituationPopup,
      eligibleDecisions,
      getItemPopupOptions,
      isImmersiveTemplate,
      isAutoOpenTemplate,
      SITUATIONS_BY_ID,
    });
    registerSearchHooks({
      portrait,
      personNameHtml,
    });
    registerPersonInteractHooks({
      render,
      renderBloodline,
      renderPersonInfoInteractView,
      personNameHtml,
      personNameHtmlAnnals,
    });
    registerPersonModalHooks({
      portrait,
      personNameHtml,
      setFocal,
      getItemPopupOptions,
    });
    registerBloodlineHooks({
      portrait,
      personNameHtml,
      getItemPopupOptions,
    });

    registerCareerHooks({ personNameHtmlAnnals });`;

if (!src.includes('registerThemeHooks')) {
  src = src.replace(
    '    registerCareerHooks({ personNameHtmlAnnals });',
    hookBlock.trim(),
  );
}

// Remove duplicate render if patch created two
src = src.replace(
  /    function render\(\) \{\n      renderGameHud\(\);\n    \}\n\n    function render\(\) \{\n      renderGameHud\(\);\n    \}\n\n/g,
  '    function render() {\n      renderGameHud();\n    }\n\n',
);

fs.writeFileSync(legacyPath, src);
console.log('Patched legacy.js for Phase 4');
