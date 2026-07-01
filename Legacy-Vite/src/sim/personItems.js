import { ITEMS_BY_ID, itemInventoryStore } from '../data/items.js';
import { nextId } from '../state/gameState.js';
import { logEvent } from './annals.js';
import {
  ensureEquippedSlots,
  EQUIPPED_SLOT_DEFAULTS,
  unequipItem,
} from './equipment.js';

export function ensureItemsArray(person) {
  if (!person) return [];
  if (!Array.isArray(person.items)) person.items = [];
  return person.items;
}

export function ensureInventoryStores(person) {
  if (!person) return;
  ensureItemsArray(person);
  if (!person.materials || typeof person.materials !== 'object') {
    person.materials = {};
  }
  if (!Array.isArray(person.equipment)) person.equipment = [];
  ensureEquippedSlots(person);
}

function newEquipmentUid() {
  return `eq_${nextId()}`;
}

export function addMaterial(person, itemId, n = 1) {
  if (!person || !ITEMS_BY_ID[itemId] || n <= 0) return false;
  ensureInventoryStores(person);
  person.materials[itemId] = (person.materials[itemId] || 0) + n;
  return true;
}

export function removeMaterial(person, itemId, n = 1) {
  if (!person || n <= 0) return false;
  ensureInventoryStores(person);
  const cur = person.materials[itemId] || 0;
  if (cur < n) return false;
  const next = cur - n;
  if (next <= 0) delete person.materials[itemId];
  else person.materials[itemId] = next;
  return true;
}

export function materialCount(person, itemId) {
  if (!person) return 0;
  ensureInventoryStores(person);
  return person.materials[itemId] || 0;
}

export function addEquipment(person, itemId) {
  if (!person || !ITEMS_BY_ID[itemId]) return null;
  ensureInventoryStores(person);
  const uid = newEquipmentUid();
  person.equipment.push({ uid, id: itemId });
  return uid;
}

export function removeEquipmentByUid(person, uid) {
  if (!person || !uid) return false;
  ensureInventoryStores(person);
  const idx = person.equipment.findIndex((e) => e.uid === uid);
  if (idx < 0) return false;
  person.equipment.splice(idx, 1);
  unequipItem(person, uid);
  return true;
}

export function listEquipment(person) {
  if (!person) return [];
  ensureInventoryStores(person);
  return person.equipment.filter((e) => e?.uid && ITEMS_BY_ID[e.id]);
}

export function hasItem(person, itemId) {
  if (!person || !ITEMS_BY_ID[itemId]) return false;
  if (materialCount(person, itemId) > 0) return true;
  return listEquipment(person).some((e) => e.id === itemId);
}

export function ownedItemIds(person) {
  if (!person) return [];
  ensureInventoryStores(person);
  const ids = new Set();
  for (const [id, count] of Object.entries(person.materials)) {
    if (count > 0 && ITEMS_BY_ID[id]) ids.add(id);
  }
  for (const { id } of listEquipment(person)) {
    ids.add(id);
  }
  for (const id of ensureItemsArray(person)) {
    if (ITEMS_BY_ID[id]) ids.add(id);
  }
  return [...ids];
}

function logPlayerItemGained(person, itemId) {
  if (!person?.isPlayer || (person.age ?? 0) === 0) return;
  const item = ITEMS_BY_ID[itemId];
  if (!item) return;
  logEvent({
    msg: `You acquired ${item.label || item.name || itemId}.`,
    type: 'good',
    category: 'item',
    title: item.label || item.name || itemId,
  });
}

export function grantItem(person, itemId, opts = {}) {
  if (!person || !ITEMS_BY_ID[itemId]) return false;

  ensureInventoryStores(person);
  const store = itemInventoryStore(itemId);
  if (!store) return false;

  if (store === 'equipment') {
    addEquipment(person, itemId);
  } else {
    addMaterial(person, itemId, 1);
  }

  if (person.isPlayer && itemId === 'mudlarks_lockbox' && !person.mudlarkLockbox) {
    person.mudlarkLockbox = { active: true, resolved: false };
  }
  if (!opts.silent) logPlayerItemGained(person, itemId);
  return true;
}

export function removeItem(person, itemId) {
  if (!person || !ITEMS_BY_ID[itemId]) return false;
  ensureInventoryStores(person);

  if (materialCount(person, itemId) > 0) {
    return removeMaterial(person, itemId, 1);
  }

  const inst = listEquipment(person).find((e) => e.id === itemId);
  if (inst) return removeEquipmentByUid(person, inst.uid);

  const items = ensureItemsArray(person);
  const idx = items.indexOf(itemId);
  if (idx < 0) return false;
  items.splice(idx, 1);
  return true;
}

export function itemIsSingleUse(itemId) {
  return !!ITEMS_BY_ID[itemId]?.singleUse;
}

/**
 * Consume a single-use item (e.g. flintlock after firing). Removes one instance.
 */
export function consumeSingleUseItem(person, itemId) {
  if (!person || !itemIsSingleUse(itemId) || !hasItem(person, itemId)) return false;
  return removeItem(person, itemId);
}

export function clearItems(person) {
  if (!person) return;
  person.items = [];
  person.materials = {};
  person.equipment = [];
  person.equipped = structuredClone(EQUIPPED_SLOT_DEFAULTS);
}

/**
 * Schema 27: move legacy `items[]` into hybrid stores (unequipped).
 * Caller should run migrateLegacyItemAcquireBonuses once after if needed.
 */
export function migratePersonInventory(person) {
  if (!person) return;
  ensureInventoryStores(person);

  const legacy = Array.isArray(person.items) ? [...person.items] : [];
  for (const id of legacy) {
    if (!ITEMS_BY_ID[id]) continue;
    const store = itemInventoryStore(id);
    if (store === 'equipment') addEquipment(person, id);
    else if (store === 'material') addMaterial(person, id, 1);
  }
  person.items = [];
}
