import {
  ITEMS_BY_ID,
  ITEM_CATEGORIES,
  itemTypeLabel,
} from '../data/items.js';
import {
  listEquipment,
} from '../sim/personItems.js';
import {
  isEquipped,
  ensureEquippedSlots,
} from '../sim/equipment.js';
import { renderEntryArt } from './renderArt.js';
import { openItemPopup } from './itemPopup.js';
import {
  clearInventoryItemHighlight,
  isEntryHighlighted,
  possessionsPanelState,
  resetInventoryFiltersOnEnter,
} from './possessionsState.js';

export { possessionsPanelState, resetInventoryFiltersOnEnter } from './possessionsState.js';

export const INVENTORY_FILTER_ORDER = ['equipment', 'consumable', 'unique', 'material', 'component'];

const FILTER_LABELS = {
  equipment: ITEM_CATEGORIES.equipment,
  consumable: ITEM_CATEGORIES.consumable,
  unique: 'Unique Items',
  material: ITEM_CATEGORIES.material,
  component: ITEM_CATEGORIES.component,
};

const SORT_OPTIONS = [
  { id: 'recent', label: 'Recently added' },
  { id: 'alphabetical', label: 'Alphabetical' },
  { id: 'category', label: 'By category' },
];

const SLOT_DEFS = [
  { key: 'mainHand', label: 'Main Hand' },
  { key: 'offhand', label: 'Off Hand' },
  { key: 'body', label: 'Body' },
  { key: 'head', label: 'Head' },
  { key: 'back', label: 'Back' },
];

const JEWELRY_LABELS = ['J1', 'J2', 'J3', 'J4'];
const ARTIFACT_LABELS = ['A1', 'A2', 'A3', 'A4'];

function isOffhandTwoHandLocked(player) {
  const eq = ensureEquippedSlots(player);
  const mainUid = eq.mainHand;
  if (!mainUid) return false;
  const inst = listEquipment(player).find((e) => e.uid === mainUid);
  if (!inst) return false;
  return !!ITEMS_BY_ID[inst.id]?.twoHanded;
}

function buildInventoryEntries(player) {
  const entries = [];
  const materialAcq = player.materialAcq || {};

  for (const inst of listEquipment(player)) {
    const item = ITEMS_BY_ID[inst.id];
    if (!item) continue;
    entries.push({
      item,
      itemId: inst.id,
      uid: inst.uid,
      acq: inst.acq ?? 0,
      category: item.category,
      isUnique: !!item.uniqueItem,
      uniqueOnly: !!item.uniqueOnly,
    });
  }

  for (const [itemId, count] of Object.entries(player.materials || {})) {
    if (count <= 0) continue;
    const item = ITEMS_BY_ID[itemId];
    if (!item) continue;
    entries.push({
      item,
      itemId,
      count,
      acq: materialAcq[itemId] ?? 0,
      category: item.category,
      isUnique: !!item.uniqueItem,
      uniqueOnly: !!item.uniqueOnly,
    });
  }

  return entries;
}

function entrySortGroup(entry) {
  if (entry.isUnique) return 'unique';
  return entry.category;
}

function entryMatchesFilters(entry, activeFilters) {
  if (!activeFilters.length) return true;
  return activeFilters.some((filter) => {
    if (filter === 'unique') return entry.isUnique;
    if (entry.uniqueOnly) return false;
    return entry.category === filter;
  });
}

function sortInventoryEntries(entries, sortMode) {
  const sorted = [...entries];
  if (sortMode === 'alphabetical') {
    sorted.sort((a, b) => (a.item.label || a.itemId).localeCompare(b.item.label || b.itemId));
    return sorted;
  }
  if (sortMode === 'category') {
    const groupRank = (entry) => {
      const group = entrySortGroup(entry);
      const idx = INVENTORY_FILTER_ORDER.indexOf(group);
      return idx >= 0 ? idx : INVENTORY_FILTER_ORDER.length;
    };
    sorted.sort((a, b) => {
      const ga = groupRank(a);
      const gb = groupRank(b);
      if (ga !== gb) return ga - gb;
      return (b.acq || 0) - (a.acq || 0);
    });
    return sorted;
  }
  sorted.sort((a, b) => (b.acq || 0) - (a.acq || 0));
  return sorted;
}

function renderEquipSlot(player, def, escapeHtml) {
  const eq = ensureEquippedSlots(player);
  const twoHandLocked = def.key === 'offhand' && isOffhandTwoHandLocked(player);
  let uid = eq[def.key];
  if (twoHandLocked) uid = eq.mainHand;

  const inst = uid ? listEquipment(player).find((e) => e.uid === uid) : null;
  const item = inst ? ITEMS_BY_ID[inst.id] : null;
  const lockedClass = twoHandLocked ? ' equip-slot--locked' : '';
  const filledClass = item ? ' equip-slot--filled' : ' equip-slot--empty';
  const title = twoHandLocked
    ? 'Held in both hands'
    : (item ? item.label : def.label);

  const inner = item
    ? renderEntryArt(item, { size: 28, className: 'item-grid-icon', escapeHtml })
    : `<span class="equip-slot-glyph" aria-hidden="true">${twoHandLocked ? '✥' : '○'}</span>
       <span class="equip-slot-name">${escapeHtml(def.label)}</span>`;

  const uidAttr = item && !twoHandLocked ? ` data-equip-uid="${escapeHtml(uid)}"` : '';

  return `<button type="button"
    class="equip-slot${lockedClass}${filledClass}"
    data-equip-slot="${escapeHtml(def.key)}"
    title="${escapeHtml(title)}"
    ${twoHandLocked ? 'disabled' : ''}${uidAttr}>
    ${inner}
  </button>`;
}

function renderArraySlots(player, slotKey, labels, escapeHtml) {
  const eq = ensureEquippedSlots(player);
  const arr = eq[slotKey] || [];
  return labels.map((shortLabel, index) => {
    const uid = arr[index];
    const inst = uid ? listEquipment(player).find((e) => e.uid === uid) : null;
    const item = inst ? ITEMS_BY_ID[inst.id] : null;
    const fullLabel = slotKey === 'jewelry' ? `Jewelry ${index + 1}` : `Artifact ${index + 1}`;
    const filledClass = item ? ' equip-slot--filled' : ' equip-slot--empty';
    const inner = item
      ? renderEntryArt(item, { size: 28, className: 'item-grid-icon', escapeHtml })
      : `<span class="equip-slot-glyph" aria-hidden="true">○</span>
         <span class="equip-slot-name">${escapeHtml(shortLabel)}</span>`;
    const uidAttr = item ? ` data-equip-uid="${escapeHtml(uid)}"` : '';

    return `<button type="button"
      class="equip-slot equip-slot--array${filledClass}"
      data-equip-slot="${escapeHtml(slotKey)}"
      data-slot-index="${index}"
      title="${escapeHtml(item ? item.label : fullLabel)}"${uidAttr}>
      ${inner}
    </button>`;
  }).join('');
}

function renderEquipSection(player, escapeHtml) {
  const handSlots = SLOT_DEFS.map((d) => renderEquipSlot(player, d, escapeHtml)).join('');
  const jewelry = renderArraySlots(player, 'jewelry', JEWELRY_LABELS, escapeHtml);
  const artifacts = renderArraySlots(player, 'artifacts', ARTIFACT_LABELS, escapeHtml);

  return `<section class="possessions-equip-section" aria-label="Equipped gear">
    <div class="equip-slots">
      <div class="equip-slots-row equip-slots-row--hands">${handSlots}</div>
      <div class="equip-slots-row">
        <span class="equip-slots-row-label">Jewelry</span>
        <div class="equip-slots-array">${jewelry}</div>
      </div>
      <div class="equip-slots-row">
        <span class="equip-slots-row-label">Artifacts</span>
        <div class="equip-slots-array">${artifacts}</div>
      </div>
    </div>
  </section>`;
}

function renderInventoryHeader(sortMode, escapeHtml) {
  const options = SORT_OPTIONS.map((opt) => {
    const selected = opt.id === sortMode ? ' selected' : '';
    return `<option value="${escapeHtml(opt.id)}"${selected}>${escapeHtml(opt.label)}</option>`;
  }).join('');
  return `<div class="inventory-header-row">
    <h3 class="possessions-section-title">Inventory</h3>
    <select class="inventory-sort-select" data-inventory-sort aria-label="Sort inventory">${options}</select>
  </div>`;
}

function renderInventoryFilters(activeFilters, escapeHtml) {
  const tabs = INVENTORY_FILTER_ORDER.map((key) => {
    const cls = 'hobby-section-btn' + (activeFilters.includes(key) ? ' active' : '');
    return `<button type="button" class="${cls}" data-inventory-filter="${escapeHtml(key)}">${escapeHtml(FILTER_LABELS[key])}</button>`;
  }).join('');
  return `<div class="possessions-inventory-tabs hobby-section-nav hobby-section-nav--split">${tabs}</div>`;
}

function renderEquipmentCard(entry, player, escapeHtml) {
  const { item, itemId, uid } = entry;
  const equipped = isEquipped(player, uid);
  const eqBadge = equipped ? '<span class="item-equipped-badge">Equipped</span>' : '';
  const highlightClass = isEntryHighlighted(entry) ? ' has-unread' : '';
  return `<button type="button" class="item-grid-card${equipped ? ' item-grid-card--equipped' : ''}${highlightClass}"
    data-item-id="${escapeHtml(itemId)}"
    data-equipment-uid="${escapeHtml(uid)}"
    title="${escapeHtml(item.label)}">
    ${eqBadge}
    ${renderEntryArt(item, { size: 28, className: 'item-grid-icon', escapeHtml })}
    <span class="item-grid-label">${escapeHtml(item.label)}</span>
    <span class="item-grid-type">${escapeHtml(itemTypeLabel(item.type))}</span>
  </button>`;
}

function renderFungibleCard(entry, escapeHtml) {
  const { item, itemId, count } = entry;
  const highlightClass = isEntryHighlighted(entry) ? ' has-unread' : '';
  const hotBadge = item.hotGoods ? '<span class="item-hot-badge" title="Hot goods">!</span>' : '';
  return `<button type="button" class="item-grid-card${highlightClass}${item.hotGoods ? ' item-grid-card--hot' : ''}" data-item-id="${escapeHtml(itemId)}" title="${escapeHtml(item.label)}">
    <span class="item-stack-badge">×${count}</span>
    ${hotBadge}
    ${renderEntryArt(item, { size: 28, className: 'item-grid-icon', escapeHtml })}
    <span class="item-grid-label">${escapeHtml(item.label)}</span>
    <span class="item-grid-type">${escapeHtml(itemTypeLabel(item.type))}</span>
  </button>`;
}

function renderEntryCard(entry, player, escapeHtml) {
  if (entry.uid) return renderEquipmentCard(entry, player, escapeHtml);
  return renderFungibleCard(entry, escapeHtml);
}

function renderInventoryGridContent(entries, sortMode, player, escapeHtml) {
  if (!entries.length) {
    return `<div class="possessions-inventory-empty">No items match the current filters.</div>`;
  }

  if (sortMode !== 'category') {
    return `<div class="items-grid">${entries.map((e) => renderEntryCard(e, player, escapeHtml)).join('')}</div>`;
  }

  const byGroup = new Map();
  for (const entry of entries) {
    const group = entrySortGroup(entry);
    if (!byGroup.has(group)) byGroup.set(group, []);
    byGroup.get(group).push(entry);
  }

  const sections = INVENTORY_FILTER_ORDER.map((groupKey) => {
    const groupEntries = byGroup.get(groupKey);
    if (!groupEntries?.length) return '';
    groupEntries.sort((a, b) => (b.acq || 0) - (a.acq || 0));
    const cards = groupEntries.map((e) => renderEntryCard(e, player, escapeHtml)).join('');
    return `<div class="inventory-category-group">
      <div class="inventory-category-head">${escapeHtml(FILTER_LABELS[groupKey])}</div>
      <div class="items-grid">${cards}</div>
    </div>`;
  }).filter(Boolean).join('');

  return sections || `<div class="possessions-inventory-empty">No items match the current filters.</div>`;
}

function renderUnifiedInventoryGrid(player, escapeHtml) {
  const { activeFilters, sortMode } = possessionsPanelState;
  const allEntries = buildInventoryEntries(player);
  if (!allEntries.length) {
    return `<div class="possessions-inventory-empty">You own nothing yet.</div>`;
  }
  const filtered = allEntries.filter((entry) => entryMatchesFilters(entry, activeFilters));
  const sorted = sortInventoryEntries(filtered, sortMode);
  return renderInventoryGridContent(sorted, sortMode, player, escapeHtml);
}

function renderEquipmentOnlyGrid(player, escapeHtml) {
  const instances = listEquipment(player);
  if (!instances.length) {
    return `<div class="possessions-inventory-empty">No equipment in inventory.</div>`;
  }
  const entries = instances.map((inst) => {
    const item = ITEMS_BY_ID[inst.id];
    return item ? {
      item,
      itemId: inst.id,
      uid: inst.uid,
      acq: inst.acq ?? 0,
      category: item.category,
      isUnique: !!item.uniqueItem,
      uniqueOnly: !!item.uniqueOnly,
    } : null;
  }).filter(Boolean);
  entries.sort((a, b) => (b.acq || 0) - (a.acq || 0));
  const cards = entries.map((e) => renderEquipmentCard(e, player, escapeHtml)).join('');
  return `<div class="items-grid">${cards}</div>`;
}

function wireEquipSlots(panel, player, escapeHtml, itemPopupOptions, onChange) {
  panel.querySelectorAll('.equip-slot[data-equip-uid]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const uid = btn.dataset.equipUid;
      if (!uid) return;
      const inst = listEquipment(player).find((e) => e.uid === uid);
      const item = inst ? ITEMS_BY_ID[inst.id] : null;
      if (!item) return;
      openItemPopup(item, player, escapeHtml, {
        ...itemPopupOptions,
        equipmentUid: uid,
        onInventoryChange: onChange,
      });
    });
  });
}

function wireItemGridCards(panel, player, escapeHtml, itemPopupOptions, onChange) {
  panel.querySelectorAll('.item-grid-card[data-item-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const itemId = btn.dataset.itemId;
      const item = ITEMS_BY_ID[itemId];
      if (!item) return;
      openItemPopup(item, player, escapeHtml, {
        ...itemPopupOptions,
        equipmentUid: btn.dataset.equipmentUid || null,
        onInventoryChange: onChange,
      });
      clearInventoryItemHighlight();
      onChange();
    });
  });
}

function wireInventoryPanel(panel, player, escapeHtml, itemPopupOptions, onChange) {
  panel.querySelectorAll('[data-inventory-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.inventoryFilter;
      if (!filter) return;
      const { activeFilters } = possessionsPanelState;
      const idx = activeFilters.indexOf(filter);
      if (idx >= 0) activeFilters.splice(idx, 1);
      else activeFilters.push(filter);
      onChange();
    });
  });

  const sortSelect = panel.querySelector('[data-inventory-sort]');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      possessionsPanelState.sortMode = sortSelect.value || 'recent';
      onChange();
    });
  }

  wireItemGridCards(panel, player, escapeHtml, itemPopupOptions, onChange);
}

function renderEquipmentInventorySection(player, escapeHtml) {
  return `<section class="possessions-inventory-section possessions-equipment-inventory" aria-label="Equipment inventory">
    <h3 class="possessions-section-title">${escapeHtml(ITEM_CATEGORIES.equipment)}</h3>
    ${renderEquipmentOnlyGrid(player, escapeHtml)}
  </section>`;
}

/**
 * Render the Particulars → Equipment panel (equipped slots + equipment inventory).
 */
export function renderEquipmentPanel(player, escapeHtml, itemPopupOptions = {}) {
  const panel = document.getElementById('part-panel-equipment');
  if (!panel || !player) return;

  const onChange = typeof itemPopupOptions.onInventoryChange === 'function'
    ? itemPopupOptions.onInventoryChange
    : () => {};

  panel.innerHTML = `<div class="items-panel equipment-panel">
    ${renderEquipSection(player, escapeHtml)}
    ${renderEquipmentInventorySection(player, escapeHtml)}
  </div>`;

  wireEquipSlots(panel, player, escapeHtml, itemPopupOptions, onChange);
  wireItemGridCards(panel, player, escapeHtml, itemPopupOptions, onChange);
}

/**
 * Render the Particulars → Items panel (unified inventory with filters and sort).
 */
export function renderPossessionsPanel(player, escapeHtml, itemPopupOptions = {}) {
  const panel = document.getElementById('part-panel-possessions');
  if (!panel) return;

  const onChange = typeof itemPopupOptions.onInventoryChange === 'function'
    ? itemPopupOptions.onInventoryChange
    : () => {};

  const { sortMode } = possessionsPanelState;
  panel.innerHTML = `<div class="items-panel possessions-panel">
    <section class="possessions-inventory-section" aria-label="Inventory">
      ${renderInventoryHeader(sortMode, escapeHtml)}
      ${renderInventoryFilters(possessionsPanelState.activeFilters, escapeHtml)}
      ${renderUnifiedInventoryGrid(player, escapeHtml)}
    </section>
  </div>`;

  wireInventoryPanel(panel, player, escapeHtml, itemPopupOptions, onChange);

  return { empty: false };
}
