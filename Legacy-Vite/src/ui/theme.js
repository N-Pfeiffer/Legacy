import { VOCAB } from '../data/vocab.js';
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

export function applyVocab() {
  const mode = currentMode();
  const dict = VOCAB[mode];
  document.querySelectorAll('[data-vocab]').forEach(el => {
    const key = el.dataset.vocab;
    if (key in dict) {
      // Buttons may contain trailing arrow glyphs — the VOCAB value is the
      // full intended button text, so plain textContent is correct.
      el.textContent = dict[key];
    }
  });

  // Section-tab titles (tooltips) — useful when icon-only at narrow widths.
  document.querySelectorAll('.section-tab[data-section]').forEach(tab => {
    const k = `section.${tab.dataset.section}`;
    if (k in dict) tab.title = dict[k];
  });
}

export function currentMode() {
  return document.body.classList.contains('vampire-mode') ? 'vampire' : 'mortal';
}

export function setMode(mode) {
  document.body.classList.remove('mortal-mode', 'vampire-mode');
  document.body.classList.add(mode + '-mode');
  applyVocab();
  // Sub-nav may need a redraw because Childer visibility depends on isVampire.
  hooks.renderSubNav();
  // The bloodline view caches its display values — re-render so the
  // 'Mortal' / 'Vampire' badge in the sidebar updates if applicable.
  const player = getPlayer();
  if (player) hooks.render();
  const openItemId = getOpenItemPopupId();
  if (player && openItemId) {
    const item = ITEMS_BY_ID[openItemId];
    if (item) refreshOpenItemPopup(item, player, escapeHtml, hooks.getItemPopupOptions());
  }
}

export function toggleEmbrace() {
  const newMode = currentMode() === 'mortal' ? 'vampire' : 'mortal';
  const player = getPlayer();
  if (player) {
    if (newMode === 'vampire' && player.pregnant?.active) {
      clearPregnancy(player);
      proposeAnnals({
        msg: 'The turning claimed what grew within you. The child was lost in the change.',
        type: 'bad',
        priority: ANNALS_PRIORITY.MAJOR,
        category: 'life',
      });
    }
    player.isVampire = (newMode === 'vampire');
    if (player.isVampire && player.yearTurned === null) {
      player.yearTurned = G.year;
      applyHumorEmbraceSwap(player);
    } else if (!player.isVampire) {
      player.yearTurned = null;
      player.humorPhase = null;
    }
  }
  setMode(newMode);
  proposeAnnals({
    msg: newMode === 'vampire'
      ? 'The blood awakens. You are no longer what you were.'
      : 'The curse lifts. Warmth returns to your veins.',
    type: newMode === 'vampire' ? 'bad' : 'good',
    priority: ANNALS_PRIORITY.MAJOR,
    category: 'life',
    title: newMode === 'vampire' ? 'Embraced' : 'Mortal again',
  });
}

export function updateDebugLabel() { /* sidebar button removed; see toggleEmbrace */ }
