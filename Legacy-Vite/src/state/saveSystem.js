import { migratePerson } from './person.js';
import { G, getPlayer, setNextId, _id } from './gameState.js';
import { syncMemoryIdFromSave } from '../sim/memories.js';
import { syncSovereignMirror } from '../sim/money.js';
import { ensureSchoolState } from '../sim/schoolCohort.js';
import { ensureWorkplaceState, healWorkplaceIfNeeded } from '../sim/workplace.js';

export const SAVE_SCHEMA      = 30;
export const SAVE_REJECTED    = Symbol('saveRejected');
export const SAVE_REJECT_MESSAGE = 'This save predates the currency update and cannot be loaded.';
export const SAVE_SLOT_COUNT  = 10;
export const SAVE_KEY_PREFIX  = 'legacy';
export const SAVE_KEY_AUTO    = `${SAVE_KEY_PREFIX}:autosave`;
export const SAVE_KEY_SLOT    = i => `${SAVE_KEY_PREFIX}:slot:${i}`;
export const STORAGE_BUDGET   = 5 * 1024 * 1024;

/** @deprecated pre-schema-30 migrations removed; kept as a no-op stub. */
export function registerSaveMigrationDeps() {}

export function migrateSave(save) {
  if (!save || typeof save.schema !== 'number' || save.schema < SAVE_SCHEMA) {
    return { [SAVE_REJECTED]: true, message: SAVE_REJECT_MESSAGE };
  }
  save.schema = SAVE_SCHEMA;
  return save;
}

export function snapshotGame() {
  const player = getPlayer();
  return {
    schema:        SAVE_SCHEMA,
    savedAt:       Date.now(),
    year:          G.year,
    surname:       G.surname,
    people:        G.people,
    pendingSiblings: G.pendingSiblings,
    eventLog:      G.eventLog || [],
    memories:      G.memories || [],
    school:        G.school || null,
    workplace:     G.workplace || null,
    nextId:        _id,
    meta: {
      playerName:    player ? `${player.firstName} ${player.surname}` : 'Unknown',
      playerAge:     player ? player.age : 0,
      playerYear:    G.year,
      playerVampire: player ? !!player.isVampire : false,
      playerAlive:   player ? !!player.isAlive : false,
    },
  };
}

export function applySave(save) {
  G.year            = save.year;
  G.surname         = save.surname;
  G.people          = (save.people || []).map(migratePerson);
  G.pendingSiblings = save.pendingSiblings || [];
  G.eventLog        = save.eventLog || [];
  G.memories        = save.memories || [];
  G.school          = save.school || null;
  G.workplace       = save.workplace || null;
  if (G.school) ensureSchoolState();
  if (G.workplace) ensureWorkplaceState();
  syncMemoryIdFromSave(G.memories);
  setNextId(save.nextId || G.people.reduce((m, p) => Math.max(m, p.id), 0)) || G.people.reduce((m, p) => Math.max(m, p.id), 0);
  const player = getPlayer();
  if (player) {
    syncSovereignMirror(player);
    healWorkplaceIfNeeded(player);
  }
}

export function writeSave(key, saveObj) {
  try {
    const json = JSON.stringify(saveObj);
    localStorage.setItem(key, json);
    return { ok: true, size: json.length };
  } catch (err) {
    const msg = (err && err.name === 'QuotaExceededError')
      ? 'Out of storage — delete a save to free space.'
      : `Save failed: ${err.message || err}`;
    return { ok: false, error: msg };
  }
}

export function readSave(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return migrateSave(obj);
  } catch (err) {
    console.warn(`Failed to read save '${key}':`, err);
    return null;
  }
}

export function deleteSave(key) {
  try { localStorage.removeItem(key); return { ok: true }; }
  catch (err) { return { ok: false, error: err.message || String(err) }; }
}

export function listSaves() {
  const slots = [];
  slots.push({ key: SAVE_KEY_AUTO, slot: 0, isAuto: true, save: readSave(SAVE_KEY_AUTO) });
  for (let i = 1; i <= SAVE_SLOT_COUNT; i++) {
    const key = SAVE_KEY_SLOT(i);
    slots.push({ key, slot: i, isAuto: false, save: readSave(key) });
  }
  return slots;
}

export function storageUsedBytes() {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(SAVE_KEY_PREFIX)) continue;
    const v = localStorage.getItem(k);
    if (v) total += k.length + v.length;
  }
  return total;
}

export function saveToSlot(slotIndex, customName) {
  const key = slotIndex === 0 ? SAVE_KEY_AUTO : SAVE_KEY_SLOT(slotIndex);
  const save = snapshotGame();
  if (customName) save.meta.label = customName;
  return writeSave(key, save);
}

export function autoSave() {
  const result = saveToSlot(0);
  if (!result.ok) {
    console.warn('Auto-save failed:', result.error);
  }
}

export function defaultLabel(save) {
  const m = save.meta || {};
  const parts = [];
  if (m.playerName)  parts.push(m.playerName);
  if (typeof m.playerAge === 'number') parts.push(`Age ${m.playerAge}`);
  if (m.playerYear)  parts.push(String(m.playerYear));
  return parts.join(' · ');
}

export function formatSavedAt(ms) {
  const d = new Date(ms);
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
