import { VOCAB } from '../data/vocab.js';
import {
  bl,
  getPerson,
  getPlayer,
  getCurrentSection,
  setCurrentSection,
} from '../state/gameState.js';
import { closeSituationPopup, isSituationPopupOpen } from '../sim/situationPopup.js';
import { closeHobbiesDrillDown } from './hobbiesPanel.js';
import { resetInventoryFiltersOnEnter } from './renderPossessions.js';
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

export const SUBNAV = {
  bloodline: [
    { key: 'family',    label: 'Family',    vocab: 'bl.family', panelId: 'bl-panel-family'    },
    { key: 'relations', label: 'Relations',                     panelId: 'bl-panel-relations' },
    // Clan shows when either the player or the current bloodline focal is
    // a vampire — the player so the tab persists wherever they navigate,
    // and the focal so we can inspect a vampire NPC's clan tree if they
    // have one. Falls back to the empty state otherwise.
    { key: 'childer',   label: 'Clan',      vocab: 'bl.clan',   panelId: 'bl-panel-childer',
      condition: (player) => {
        if (player && player.isVampire) return true;
        const focal = getPerson(bl.focalId);
        return !!(focal && focal.isVampire);
      } },
    // Minions: herd, ghouls, blood-bound, and supernatural servants.
    // Visibility mirrors Clan — anywhere a vampire is involved (player
    // or focal), the tab is shown. Empty state otherwise.
    { key: 'minions',   label: 'Minions',   vocab: 'bl.minions', panelId: 'bl-panel-minions',
      condition: (player) => {
        if (player && player.isVampire) return true;
        const focal = getPerson(bl.focalId);
        return !!(focal && focal.isVampire);
      } },
  ],
  vocation: [
    { key: 'career',    label: 'Career',    vocab: 'vocation.career', panelId: 'voc-panel-career'    },
    { key: 'education', label: 'Education', vocab: 'vocation.edu',    panelId: 'voc-panel-education' },
  ],
  particulars: [
    { key: 'hobbies',     label: 'Hobbies',     vocab: 'particulars.hobbies',     panelId: 'part-panel-hobbies'     },
    { key: 'equipment',   label: 'Equipment',   vocab: 'particulars.equipment',   panelId: 'part-panel-equipment'   },
    { key: 'possessions', label: 'Items',         vocab: 'particulars.possessions', panelId: 'part-panel-possessions' },
  ],
  // Decisions / Journal / Ambitions:
  //   Situations  — blocking prompts the player must resolve (now first
  //                 and default — the most urgent thing in the inbox)
  //   Focus       — current preoccupation, single-thread attention
  //   Decisions   — non-blocking choices available whenever
  //   Goals       — long-term ambitions (mortal: Goals, vampire: Plots)
  //   Memories    — past notable moments (mortal: Memories, vampire: Chronicle)
  decisions: [
    { key: 'situations', label: 'Situations', vocab: 'dec.situations', panelId: 'dec-panel-situations' },
    { key: 'focus',      label: 'Focus',      vocab: 'dec.focus',      panelId: 'dec-panel-focus'      },
    { key: 'decisions',  label: 'Decisions',  vocab: 'dec.decisions',  panelId: 'dec-panel-decisions'  },
    { key: 'goals',      label: 'Goals',      vocab: 'dec.goals',      panelId: 'dec-panel-goals'      },
    { key: 'memories',   label: 'Memories',   vocab: 'dec.memories',   panelId: 'dec-panel-memories'   },
  ],
};

// currentSubTab is derived: for each section, the default is the FIRST
// item in its SUBNAV array. This keeps the two structures in sync — if
// you reorder a SUBNAV section, the default sub-tab updates automatically.
// During gameplay this object is mutated by setSubTab() to remember the
// player's last-active sub-tab per section.
export const currentSubTab = Object.fromEntries(
  Object.entries(SUBNAV).map(([section, items]) => [section, items[0]?.key ?? null])
);

export function setSubTab(section, key) {
  // Verify the tab actually exists and (if conditional) is currently allowed.
  const player = getPlayer();
  const item = SUBNAV[section].find(it => it.key === key);
  if (!item) return;
  if (item.condition && !item.condition(player)) return;

  const wasAlreadyActive = currentSubTab[section] === key;

  currentSubTab[section] = key;
  if (section === 'particulars' && key === 'possessions' && !wasAlreadyActive) {
    resetInventoryFiltersOnEnter();
  }
  renderSubNav();

  // Situations / Decisions detail views are transient — reset when the
  // player re-clicks the same sub-tab or returns from another sub-tab.
  let needsRender = false;
  if (key === 'situations') {
    if (isSituationPopupOpen() || !wasAlreadyActive) {
      closeSituationPopup();
      needsRender = true;
    }
  }
  if (key === 'decisions') {
    if (hooks.getDecisionsViewingId() != null || !wasAlreadyActive) {
      hooks.setDecisionsViewingId(null);
      needsRender = true;
    }
  }
  if (needsRender) hooks.render();

  // The bloodline section needs its own re-render because the panel
  // content is computed dynamically per focal person.
  if (section === 'bloodline') hooks.renderBloodline();
}

export function renderSubNav() {
  const nav = document.getElementById('sub-nav');
  if (!nav) return;
  const items = SUBNAV[getCurrentSection()] || [];
  const player = getPlayer();
  const dict   = VOCAB[currentMode()] || {};

  // Filter by condition (e.g. Childer hidden for mortals).
  const visible = items.filter(it => !it.condition || it.condition(player));

  // If the active sub-tab is no longer visible (e.g. became mortal again
  // while on Childer), drop back to the first available.
  let active = currentSubTab[getCurrentSection()];
  if (!visible.some(it => it.key === active)) {
    active = visible.length ? visible[0].key : null;
    currentSubTab[getCurrentSection()] = active;
  }

  // Render buttons.
  nav.innerHTML = visible.map(it => {
    const label = (it.vocab && dict[it.vocab]) || it.label;
    const cls   = 'sub-tab' + (it.key === active ? ' active' : '');
    return `<button class="${cls}" data-subkey="${it.key}">${label}</button>`;
  }).join('');

  // Wire clicks.
  nav.querySelectorAll('.sub-tab').forEach(btn => {
    btn.addEventListener('click', () => setSubTab(getCurrentSection(), btn.dataset.subkey));
  });

  // Show only the active sub-panel within the current section.
  const section = document.getElementById(`section-${getCurrentSection()}`);
  if (section) {
    items.forEach(it => {
      const panel = document.getElementById(it.panelId);
      if (panel) panel.style.display = (it.key === active) ? '' : 'none';
    });
  }
}

export function showSection(name) {
  setCurrentSection(name);
  document.querySelectorAll('.section').forEach(s => {
    s.style.display = (s.id === `section-${name}`) ? '' : 'none';
  });
  document.querySelectorAll('.section-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.section === name);
  });
  // Reset transient panel state on section switch so the user always
  // arrives at the canonical view, not a stale sub-view from a previous
  // visit. Both Decisions and Situations have such state; if others
  // grow similar state, reset them here.
  hooks.setDecisionsViewingId(null);
  closeSituationPopup();
  closeHobbiesDrillDown();
  renderSubNav();
  // Re-render content so section-specific panels populate when arrived at.
  // (Pre-Layer-3 only Bloodline had dynamic content, which renders into
  // its own DOM regardless of section visibility — but Vocation only
  // populates when actively shown.)
  hooks.render();
}

export function normalizeBloodlineSubTab() {
  const player = getPlayer();
  const item = SUBNAV.bloodline.find(it => it.key === currentSubTab.bloodline);
  if (item && item.condition && !item.condition(player)) {
    currentSubTab.bloodline = SUBNAV.bloodline[0].key;
  }
}
