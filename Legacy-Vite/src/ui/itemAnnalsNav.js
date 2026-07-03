import { showSection, setSubTab } from './navigation.js';
import { itemInventoryStore } from '../data/items.js';
import { listEquipment } from '../sim/personItems.js';
import {
  possessionsPanelState,
  resetInventoryFiltersOnEnter,
  setInventoryItemHighlight,
  clearInventoryItemHighlight,
} from './possessionsState.js';

export {
  setInventoryItemHighlight,
  clearInventoryItemHighlight,
  isEntryHighlighted,
} from './possessionsState.js';

export function navigateToPlayerInventory() {
  clearInventoryItemHighlight();
  possessionsPanelState.activeFilters = [];
  showSection('particulars');
  setSubTab('particulars', 'possessions');
  resetInventoryFiltersOnEnter();
}

export function navigateToInventoryItem(itemId, equipmentUid, { render, getPlayer } = {}) {
  if (!itemId) return;
  let uid = equipmentUid || null;
  if (!uid && typeof getPlayer === 'function' && itemInventoryStore(itemId) === 'equipment') {
    const instances = listEquipment(getPlayer()).filter((e) => e.id === itemId);
    if (instances.length) {
      const newest = instances.reduce((a, b) => ((b.acq ?? 0) > (a.acq ?? 0) ? b : a));
      uid = newest.uid;
    }
  }
  setInventoryItemHighlight(itemId, uid);
  possessionsPanelState.activeFilters = [];
  showSection('particulars');
  setSubTab('particulars', 'possessions');
  resetInventoryFiltersOnEnter();
  if (typeof render === 'function') render();

  requestAnimationFrame(() => {
    const panel = document.getElementById('part-panel-possessions');
    if (!panel) return;
    let card = null;
    if (equipmentUid) {
      card = panel.querySelector(
        `.item-grid-card[data-item-id="${CSS.escape(itemId)}"][data-equipment-uid="${CSS.escape(equipmentUid)}"]`,
      );
    }
    if (!card) {
      card = panel.querySelector(`.item-grid-card[data-item-id="${CSS.escape(itemId)}"]`);
    }
    card?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

let _wired = false;

export function wireAnnalsItemLinks({ render, getPlayer } = {}) {
  if (_wired) return;
  _wired = true;

  function handleClick(e) {
    const link = e.target.closest('.log-item-link[data-item-id]');
    if (!link) return;
    e.preventDefault();
    const itemId = link.dataset.itemId;
    const equipmentUid = link.dataset.equipmentUid || null;
    navigateToInventoryItem(itemId, equipmentUid, { render, getPlayer });
  }

  document.getElementById('event-log')?.addEventListener('click', handleClick);
  document.getElementById('memories-list')?.addEventListener('click', handleClick);
}
