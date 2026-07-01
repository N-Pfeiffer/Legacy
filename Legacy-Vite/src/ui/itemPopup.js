import {
  ITEMS_BY_ID,
  ITEM_CATEGORIES,
  itemTypeLabel,
} from '../data/items.js';
import { materialCount } from '../sim/personItems.js';
import { canUse, itemHasUsableEffect, useConsumable } from '../sim/consumables.js';
import { proposeAnnals, ANNALS_PRIORITY } from '../sim/annals.js';
import { equipItem, unequipItem, isEquipped } from '../sim/equipment.js';
import { renderEntryArt } from './renderArt.js';

let _wired = false;
let _openItemId = null;
let _openEquipmentUid = null;

function getOverlayEl() {
  return document.getElementById('item-overlay');
}

function getModalEl() {
  return document.getElementById('item-modal');
}

export function closeItemPopup() {
  const overlay = getOverlayEl();
  if (overlay) overlay.classList.remove('active');
  _openItemId = null;
  _openEquipmentUid = null;
}

export function getOpenItemPopupId() {
  return _openItemId;
}

/** Re-render the open item popup (e.g. after equip or Embrace toggles vampire-use visibility). */
export function refreshOpenItemPopup(item, player, escapeHtml, options = {}) {
  const overlay = getOverlayEl();
  if (!overlay?.classList.contains('active') || !item) return;
  openItemPopup(item, player, escapeHtml, {
    ...options,
    equipmentUid: options.equipmentUid ?? _openEquipmentUid,
  });
}

export function openItemPopup(item, player, escapeHtml, options = {}) {
  const overlay = getOverlayEl();
  const modal = getModalEl();
  if (!overlay || !modal || !item) return;

  _openItemId = item.id;
  _openEquipmentUid = options.equipmentUid || null;

  const {
    isDecisionEligible,
    onOpenDecision,
    getDecisionLabel,
    equipmentUid,
    onInventoryChange,
  } = options;

  const showVampireUse = player?.isVampire && item.vampireUse;
  const vampireHtml = showVampireUse
    ? `<div class="item-popup-vampire-use"><span class="item-popup-vampire-label">Vampire Use:</span> ${escapeHtml(item.vampireUse)}</div>`
    : '';

  const decisionId = item.decisionId;
  const showDecisionLink = decisionId
    && typeof isDecisionEligible === 'function'
    && isDecisionEligible(decisionId, player);
  const decisionLabel = showDecisionLink && typeof getDecisionLabel === 'function'
    ? getDecisionLabel(decisionId)
    : (showDecisionLink ? 'Open in Decisions' : '');
  const decisionLinkHtml = showDecisionLink
    ? `<button type="button" class="item-popup-decision-link" data-item-popup-action="open-decision">${escapeHtml(decisionLabel)}</button>`
    : '';

  const useNoteHtml = item.useNote
    ? `<div class="item-popup-use-note">${escapeHtml(item.useNote)}</div>`
    : '';

  const categoryLabel = item.category ? ITEM_CATEGORIES[item.category] : '';
  const count = item.category && item.category !== 'equipment'
    ? materialCount(player, item.id)
    : 0;
  const categoryLine = categoryLabel
    ? `<span class="item-popup-category">${escapeHtml(categoryLabel)}${count > 1 ? ` · ×${count}` : (count === 1 ? ' · ×1' : '')}</span>`
    : '';

  let equipActionHtml = '';
  if (item.category === 'equipment' && equipmentUid) {
    const equipped = isEquipped(player, equipmentUid);
    const label = equipped ? 'Unequip' : 'Equip';
    equipActionHtml = `<button type="button" class="item-popup-action-btn" data-item-popup-action="toggle-equip">${escapeHtml(label)}</button>`;
  }

  let useActionHtml = '';
  if (item.category === 'consumable' && itemHasUsableEffect(item, player)) {
    const useCheck = canUse(player, item.id);
    const useLabel = item.useLabel || 'Use';
    const disabled = !useCheck.ok ? ' disabled' : '';
    const titleAttr = !useCheck.ok && useCheck.message
      ? ` title="${escapeHtml(useCheck.message)}"`
      : '';
    useActionHtml = `<button type="button" class="item-popup-action-btn" data-item-popup-action="use-consumable"${disabled}${titleAttr}>${escapeHtml(useLabel)}</button>`;
  }

  modal.innerHTML = `
    <button type="button" class="item-popup-close" data-item-popup-action="close" aria-label="Close">×</button>
    <div class="item-popup-icon" aria-hidden="true">${renderEntryArt(item, { size: 40, className: 'item-popup-icon-art', escapeHtml })}</div>
    <div class="item-popup-name">${escapeHtml(item.label)}</div>
    <div class="item-popup-meta">
      <span class="item-popup-type">${escapeHtml(itemTypeLabel(item.type))}</span>
      ${categoryLine}
      ${item.effectSummary ? `<span class="item-popup-effect">${escapeHtml(item.effectSummary)}</span>` : ''}
    </div>
    ${equipActionHtml}
    ${useActionHtml}
    ${decisionLinkHtml}
    ${useNoteHtml}
    ${vampireHtml}
    <div class="item-popup-description">${escapeHtml(item.description || '')}</div>`;

  modal.querySelector('[data-item-popup-action="close"]')?.addEventListener('click', closeItemPopup);
  modal.querySelector('[data-item-popup-action="open-decision"]')?.addEventListener('click', () => {
    if (typeof onOpenDecision === 'function') onOpenDecision(decisionId);
  });

  modal.querySelector('[data-item-popup-action="toggle-equip"]')?.addEventListener('click', () => {
    if (!equipmentUid) return;
    if (isEquipped(player, equipmentUid)) {
      unequipItem(player, equipmentUid);
    } else {
      const result = equipItem(player, equipmentUid);
      if (!result.ok && result.reason) {
        // Surface failure via title on button briefly — no toast system yet
        const btn = modal.querySelector('[data-item-popup-action="toggle-equip"]');
        if (btn) btn.title = result.reason;
      }
    }
    if (typeof onInventoryChange === 'function') onInventoryChange();
    refreshOpenItemPopup(item, player, escapeHtml, options);
  });

  modal.querySelector('[data-item-popup-action="use-consumable"]')?.addEventListener('click', () => {
    if (!player?.isPlayer) return;
    const result = useConsumable(player, item.id);
    if (!result.ok) return;
    if (result.message) {
      proposeAnnals({
        msg: result.message,
        type: result.type || 'good',
        priority: ANNALS_PRIORITY.FLAVOR,
      });
    }
    if (typeof onInventoryChange === 'function') onInventoryChange();
    if (materialCount(player, item.id) <= 0) {
      closeItemPopup();
    } else {
      refreshOpenItemPopup(item, player, escapeHtml, options);
    }
  });

  overlay.classList.add('active');
}

export function wireItemPopupOverlay() {
  if (_wired) return;
  const overlay = getOverlayEl();
  if (!overlay) return;
  _wired = true;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeItemPopup();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) closeItemPopup();
  });
}
