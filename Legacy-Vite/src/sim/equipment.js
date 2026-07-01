import { ITEMS_BY_ID, slotForItem } from '../data/items.js';

export const EQUIPPED_SLOT_DEFAULTS = {
  mainHand: null,
  offhand: null,
  body: null,
  head: null,
  back: null,
  jewelry: [null, null, null, null],
  artifacts: [null, null, null, null],
};

export function ensureEquippedSlots(person) {
  if (!person.equipped || typeof person.equipped !== 'object') {
    person.equipped = structuredClone(EQUIPPED_SLOT_DEFAULTS);
    return person.equipped;
  }
  const eq = person.equipped;
  for (const key of ['mainHand', 'offhand', 'body', 'head', 'back']) {
    if (!(key in eq)) eq[key] = null;
  }
  if (!Array.isArray(eq.jewelry) || eq.jewelry.length !== 4) {
    eq.jewelry = [...EQUIPPED_SLOT_DEFAULTS.jewelry];
  }
  if (!Array.isArray(eq.artifacts) || eq.artifacts.length !== 4) {
    eq.artifacts = [...EQUIPPED_SLOT_DEFAULTS.artifacts];
  }
  return eq;
}

function findInstance(person, uid) {
  if (!person || !uid || !Array.isArray(person.equipment)) return null;
  const entry = person.equipment.find((e) => e?.uid === uid);
  if (!entry?.id || !ITEMS_BY_ID[entry.id]) return null;
  return entry;
}

function clearUidFromSlots(person, uid) {
  const eq = ensureEquippedSlots(person);
  for (const key of ['mainHand', 'offhand', 'body', 'head', 'back']) {
    if (eq[key] === uid) eq[key] = null;
  }
  for (const arrKey of ['jewelry', 'artifacts']) {
    const arr = eq[arrKey];
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] === uid) arr[i] = null;
    }
  }
}

function setSingleSlot(person, slotKey, uid) {
  const eq = ensureEquippedSlots(person);
  const prev = eq[slotKey];
  if (prev && prev !== uid) clearUidFromSlots(person, prev);
  eq[slotKey] = uid;
}

function setTwoHanded(person, uid) {
  const eq = ensureEquippedSlots(person);
  for (const existing of [eq.mainHand, eq.offhand]) {
    if (existing && existing !== uid) clearUidFromSlots(person, existing);
  }
  eq.mainHand = uid;
  eq.offhand = uid;
}

function firstEmptyArraySlot(arr) {
  const idx = arr.findIndex((v) => v == null);
  return idx >= 0 ? idx : -1;
}

/**
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function equipItem(person, uid) {
  if (!person || !uid) return { ok: false, reason: 'Invalid item.' };
  const instance = findInstance(person, uid);
  if (!instance) return { ok: false, reason: 'Item not in inventory.' };

  const catalog = ITEMS_BY_ID[instance.id];
  if (!catalog || catalog.category !== 'equipment') {
    return { ok: false, reason: 'Not equippable.' };
  }

  const slot = catalog.slot;
  if (!slot) return { ok: false, reason: 'No equipment slot defined.' };

  clearUidFromSlots(person, uid);

  if (catalog.twoHanded) {
    setTwoHanded(person, uid);
    return { ok: true };
  }

  const eq = ensureEquippedSlots(person);

  if (slot === 'jewelry' || slot === 'artifact') {
    const arrKey = slot === 'artifact' ? 'artifacts' : 'jewelry';
    const arr = eq[arrKey];
    const idx = firstEmptyArraySlot(arr);
    if (idx < 0) return { ok: false, reason: 'No free slot.' };
    arr[idx] = uid;
    return { ok: true };
  }

  if (slot === 'offhand' && eq.mainHand) {
    const mainInst = findInstance(person, eq.mainHand);
    if (mainInst && ITEMS_BY_ID[mainInst.id]?.twoHanded) {
      return { ok: false, reason: 'Both hands hold a two-handed weapon.' };
    }
  }

  if (slot === 'mainHand' && eq.offhand) {
    const offInst = findInstance(person, eq.offhand);
    if (offInst && offInst.uid !== eq.mainHand) {
      clearUidFromSlots(person, eq.offhand);
    }
  }

  setSingleSlot(person, slot, uid);
  return { ok: true };
}

export function unequipItem(person, uid) {
  if (!person || !uid) return false;
  clearUidFromSlots(person, uid);
  return true;
}

export function equippedUids(person) {
  if (!person) return [];
  const eq = ensureEquippedSlots(person);
  const uids = new Set();
  for (const key of ['mainHand', 'offhand', 'body', 'head', 'back']) {
    if (eq[key]) uids.add(eq[key]);
  }
  for (const arrKey of ['jewelry', 'artifacts']) {
    for (const uid of eq[arrKey]) {
      if (uid) uids.add(uid);
    }
  }
  return [...uids];
}

export function equippedItems(person) {
  if (!person) return [];
  const eq = ensureEquippedSlots(person);
  const out = [];

  const pushSlot = (slot, uid) => {
    if (!uid) return;
    const inst = findInstance(person, uid);
    if (inst) out.push({ uid, id: inst.id, slot });
  };

  for (const key of ['mainHand', 'offhand', 'body', 'head', 'back']) {
    pushSlot(key, eq[key]);
  }
  eq.jewelry.forEach((uid, i) => pushSlot(`jewelry${i}`, uid));
  eq.artifacts.forEach((uid, i) => pushSlot(`artifact${i}`, uid));

  return out;
}

export function isEquipped(person, uid) {
  return equippedUids(person).includes(uid);
}

export { slotForItem };
