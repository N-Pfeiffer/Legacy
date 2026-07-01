import {
  ITEMS_BY_ID,
  ITEM_CATEGORIES,
  itemTypeLabel,
} from '../data/items.js';
import {
  listEquipment,
} from '../sim/personItems.js';
import {
  unequipItem,
  isEquipped,
  ensureEquippedSlots,
} from '../sim/equipment.js';
import { renderEntryArt } from './renderArt.js';
import { openItemPopup } from './itemPopup.js';

export const possessionsPanelState = {
  inventoryTab: 'equipment',
};

const SLOT_DEFS = [
  { key: 'mainHand', label: 'Main Hand' },
  { key: 'offhand', label: 'Off Hand' },
  { key: 'body', label: 'Body' },
  { key: 'head', label: 'Head' },
  { key: 'back', label: 'Back' },
];

const JEWELRY_LABELS = ['J1', 'J2', 'J3', 'J4'];
const ARTIFACT_LABELS = ['A1', 'A2', 'A3', 'A4'];
const INVENTORY_TABS = ['equipment', 'material', 'component', 'consumable'];

function playerHasAnyInventory(player) {
  if (!player) return false;
  const mats = player.materials || {};
  if (Object.values(mats).some((n) => n > 0)) return true;
  if (listEquipment(player).length > 0) return true;
  if (Array.isArray(player.items) && player.items.length > 0) return true;
  return false;
}

function isOffhandTwoHandLocked(player) {
  const eq = ensureEquippedSlots(player);
  const mainUid = eq.mainHand;
  if (!mainUid) return false;
  const inst = listEquipment(player).find((e) => e.uid === mainUid);
  if (!inst) return false;
  return !!ITEMS_BY_ID[inst.id]?.twoHanded;
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

function renderInventoryTabs(activeTab, escapeHtml) {
  if (!INVENTORY_TABS.includes(activeTab)) {
    possessionsPanelState.inventoryTab = 'equipment';
    activeTab = 'equipment';
  }
  const tabs = INVENTORY_TABS.map((key) => {
    const cls = 'hobby-section-btn' + (key === activeTab ? ' active' : '');
    return `<button type="button" class="${cls}" data-inventory-tab="${escapeHtml(key)}">${escapeHtml(ITEM_CATEGORIES[key])}</button>`;
  }).join('');
  return `<div class="possessions-inventory-tabs hobby-section-nav hobby-section-nav--split">${tabs}</div>`;
}

function renderFungibleCard(itemId, count, escapeHtml) {
  const item = ITEMS_BY_ID[itemId];
  if (!item) return '';
  return `<button type="button" class="item-grid-card" data-item-id="${escapeHtml(itemId)}" title="${escapeHtml(item.label)}">
    <span class="item-stack-badge">×${count}</span>
    ${renderEntryArt(item, { size: 28, className: 'item-grid-icon', escapeHtml })}
    <span class="item-grid-label">${escapeHtml(item.label)}</span>
    <span class="item-grid-type">${escapeHtml(itemTypeLabel(item.type))}</span>
  </button>`;
}

function renderInventoryGrid(player, tab, escapeHtml) {
  if (tab === 'equipment') {
    const instances = listEquipment(player);
    if (!instances.length) {
      return `<div class="possessions-inventory-empty">No equipment in inventory.</div>`;
    }
    const cards = instances.map((inst) => {
      const item = ITEMS_BY_ID[inst.id];
      if (!item) return '';
      const equipped = isEquipped(player, inst.uid);
      const eqBadge = equipped ? '<span class="item-equipped-badge">Equipped</span>' : '';
      return `<button type="button" class="item-grid-card${equipped ? ' item-grid-card--equipped' : ''}"
        data-item-id="${escapeHtml(inst.id)}"
        data-equipment-uid="${escapeHtml(inst.uid)}"
        title="${escapeHtml(item.label)}">
        ${eqBadge}
        ${renderEntryArt(item, { size: 28, className: 'item-grid-icon', escapeHtml })}
        <span class="item-grid-label">${escapeHtml(item.label)}</span>
        <span class="item-grid-type">${escapeHtml(itemTypeLabel(item.type))}</span>
      </button>`;
    }).join('');
    return `<div class="items-grid">${cards}</div>`;
  }

  const materials = player.materials || {};
  const ids = Object.keys(materials).filter(
    (id) => materials[id] > 0 && ITEMS_BY_ID[id]?.category === tab,
  );
  if (!ids.length) {
    return `<div class="possessions-inventory-empty">No ${escapeHtml(ITEM_CATEGORIES[tab].toLowerCase())} yet.</div>`;
  }
  ids.sort((a, b) => (ITEMS_BY_ID[a]?.label || a).localeCompare(ITEMS_BY_ID[b]?.label || b));
  return `<div class="items-grid">${ids.map((id) => renderFungibleCard(id, materials[id], escapeHtml)).join('')}</div>`;
}

function wireEquipSlots(panel, player, onChange) {
  panel.querySelectorAll('.equip-slot[data-equip-uid]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const uid = btn.dataset.equipUid;
      if (uid) {
        unequipItem(player, uid);
        onChange();
      }
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
    });
  });
}

function wireInventoryPanel(panel, player, escapeHtml, itemPopupOptions, onChange) {
  panel.querySelectorAll('[data-inventory-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      possessionsPanelState.inventoryTab = btn.dataset.inventoryTab;
      onChange();
    });
  });

  wireItemGridCards(panel, player, escapeHtml, itemPopupOptions, onChange);
}

function renderEquipmentInventorySection(player, escapeHtml) {
  return `<section class="possessions-inventory-section possessions-equipment-inventory" aria-label="Equipment inventory">
    <h3 class="possessions-section-title">${escapeHtml(ITEM_CATEGORIES.equipment)}</h3>
    ${renderInventoryGrid(player, 'equipment', escapeHtml)}
  </section>`;
}

/**
 * Render the Estate → Equipment panel (equipped slots + equipment inventory).
 */
export function renderEquipmentPanel(player, escapeHtml, itemPopupOptions = {}) {
  const panel = document.getElementById('est-panel-equipment');
  if (!panel || !player) return;

  const onChange = typeof itemPopupOptions.onInventoryChange === 'function'
    ? itemPopupOptions.onInventoryChange
    : () => {};

  panel.innerHTML = `<div class="items-panel equipment-panel">
    ${renderEquipSection(player, escapeHtml)}
    ${renderEquipmentInventorySection(player, escapeHtml)}
  </div>`;

  wireEquipSlots(panel, player, onChange);
  wireItemGridCards(panel, player, escapeHtml, itemPopupOptions, onChange);
}

/**
 * Render the Estate → Items panel (categorized inventory).
 */
export function renderPossessionsPanel(player, escapeHtml, itemPopupOptions = {}) {
  const panel = document.getElementById('est-panel-possessions');
  if (!panel) return;

  const onChange = typeof itemPopupOptions.onInventoryChange === 'function'
    ? itemPopupOptions.onInventoryChange
    : () => {};

  if (!playerHasAnyInventory(player)) {
    panel.innerHTML = `<div class="placeholder-card">
      <div class="placeholder-emblem">♛</div>
      <div class="placeholder-text" data-vocab="estate.possessions_empty">
        You own nothing yet. The world is still your parents'.
      </div>
    </div>`;
    return { empty: true };
  }

  const tab = possessionsPanelState.inventoryTab;
  panel.innerHTML = `<div class="items-panel possessions-panel">
    <section class="possessions-inventory-section" aria-label="Inventory">
      <h3 class="possessions-section-title">Inventory</h3>
      ${renderInventoryTabs(tab, escapeHtml)}
      ${renderInventoryGrid(player, tab, escapeHtml)}
    </section>
  </div>`;

  wireInventoryPanel(panel, player, escapeHtml, itemPopupOptions, onChange);

  return { empty: false };
}
