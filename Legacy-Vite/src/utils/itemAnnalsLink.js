import { ITEMS_BY_ID } from '../data/items.js';
import { escapeHtml } from './escapeHtml.js';

/** Clickable item name for annals HTML entries. */
export function itemAnnalsLinkHtml(itemId, { equipmentUid, label } = {}) {
  const item = ITEMS_BY_ID[itemId];
  const text = escapeHtml(label || item?.label || itemId);
  if (!item) return text;
  const uidAttr = equipmentUid
    ? ` data-equipment-uid="${escapeHtml(equipmentUid)}"`
    : '';
  return `<a class="log-item-link" href="#" data-item-id="${escapeHtml(itemId)}"${uidAttr}>${text}</a>`;
}
