import { G, getPlayer, getCurrentSection } from '../state/gameState.js';
import { clamp, statCap } from '../utils/index.js';
import { currentProwess } from '../sim/prowess.js';
import { currentFertility } from '../sim/conception.js';
import { effectiveCharisma, effectiveCunning, effectiveInsight } from '../sim/itemEffects.js';
import { wealthTierLabel } from '../sim/careers.js';
import { isInPrison, prisonCellLabel } from '../sim/prison.js';
import { hasUnreadSituations, unreadPanelSituations } from '../sim/situationAttention.js';
import { unreadEligibleDecisions } from '../sim/decisionAttention.js';
import { renderMemoriesPanel } from './memoriesPanel.js';
import { renderEquipmentPanel, renderPossessionsPanel } from './renderPossessions.js';
import { renderHobbiesPanel } from './hobbiesPanel.js';
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
  renderHobbiesPanel: () => {},
};

export function registerRenderHudHooks(h) {
  hooks = { ...hooks, ...h };
}

export function renderGameHud() {
  const player = getPlayer();

  hooks.renderPrisonPanel(player);

  document.getElementById('current-year').textContent = G.year;

  document.getElementById('player-name-label').textContent = hooks.personName(player);
  document.getElementById('player-age-label').textContent = `Age: ${player.age ?? 0}`;

  // Stat bars. The bar's width is `val / cap`, so a 75/200 vampire bar
  // visually fills the same proportion that 37.5/100 would on a mortal.
  // The numeric value beside the bar is the truth; the bar is its
  // proportional reading against the mode-appropriate ceiling.
  //
  // After the stat-name standardization, the element IDs use the same
  // keys as STAT_CAPS, so one parameter does double duty.
  const bar = (statKey, val) => {
    const cap = statCap(statKey, player.isVampire);
    const pct = clamp((val / cap) * 100, 0, 100);
    document.getElementById(`sb-${statKey}`).style.width = `${pct}%`;
    document.getElementById(`sv-${statKey}`).textContent = `${Math.round(val)}`;
  };
  bar('health',       player.health);
  bar('prowess',      currentProwess(player));
  bar('charisma',     effectiveCharisma(player));
  bar('intelligence', player.intelligence);
  bar('wealth',       player.wealth);
  bar('insight',      effectiveInsight(player));
  bar('cunning',      effectiveCunning(player));
  bar('fertility',    currentFertility(player));

  const apMax = player.actionPointsMax ?? 20;
  const apCurrent = Math.max(0, Math.min(apMax, player.actionPoints ?? 0));
  const apPct = clamp((apCurrent / apMax) * 100, 0, 100);
  const apLabelEl = document.getElementById('sv-action-points');
  const apBarEl = document.getElementById('sb-action-points');
  if (apLabelEl) apLabelEl.textContent = `${apCurrent} / ${apMax}`;
  if (apBarEl) apBarEl.style.width = `${apPct}%`;

  // Wealth tier label (Destitute / Poor / Middle Class / Rich / Wealthy)
  // sits below the bar and updates with the wealth value.
  document.getElementById('sv-wealth-tier').textContent = wealthTierLabel(player.wealth);

  hooks.renderBloodline();
  // Render the active section's content. Each section knows how to
  // populate its own panels; switching sections re-runs render().
  if (getCurrentSection() === 'vocation') {
    hooks.renderVocation();
    hooks.renderEducationPanel();
  }
  if (getCurrentSection() === 'decisions') {
    hooks.renderSituationsPanel();
    hooks.renderFocusPanel();
    hooks.renderDecisionsPanel();
    renderMemoriesPanel();
  }
  if (getCurrentSection() === 'estate') {
    hooks.renderHobbiesPanel(player);
    renderEquipmentPanel(player, escapeHtml, hooks.getItemPopupOptions());
    const possessionsResult = renderPossessionsPanel(player, escapeHtml, hooks.getItemPopupOptions());
    if (possessionsResult?.empty && typeof applyVocab === 'function') applyVocab();
  }

  // Auto-open popups first so unread flags clear before badge updates.
  hooks.tryShowImmersivePopup();
  hooks.tryShowAutoSituationPopup();

  // ── Situations badges (unread pulse only) ────────────────
  // Unread situations surface a small pulse on the Journal tab and on
  // individual situation cards until the player opens them once.
  const unreadPanel = unreadPanelSituations(player, hooks.SITUATIONS_BY_ID, {
    isImmersiveTemplate: hooks.isImmersiveTemplate,
    isAutoOpenTemplate: hooks.isAutoOpenTemplate,
  });
  const journalTab    = document.querySelector('.section-tab[data-section="decisions"]');
  const situationsBtn = document.querySelector('.sub-tab[data-subkey="situations"]');
  const decisionsBtn  = document.querySelector('.sub-tab[data-subkey="decisions"]');
  const hasUnreadSituationAttention = hasUnreadSituations(player);
  const eligible = hooks.eligibleDecisions(player);
  const unreadDecisions = unreadEligibleDecisions(player, eligible);
  if (journalTab) journalTab.classList.toggle('has-pending', hasUnreadSituationAttention || unreadDecisions.length > 0);
  if (situationsBtn) situationsBtn.classList.toggle('has-pending', unreadPanel.length > 0);
  if (decisionsBtn) decisionsBtn.classList.toggle('has-pending', unreadDecisions.length > 0);

  // Pass-the-Year is never blocked by situations (only death ends the run).
  const ageBtn = document.getElementById('btn-age-up');
  if (ageBtn && player.isAlive) {
    ageBtn.disabled = false;
    if (isInPrison(player)) {
      ageBtn.textContent = 'End Another Year ▶';
      ageBtn.title = `Serve another year in ${prisonCellLabel(player.prison.cellType).toLowerCase()}.`;
    } else {
      ageBtn.title = '';
    }
    if (typeof applyVocab === 'function') applyVocab();
  }
}
