import { migratePerson, foldSituationLogToLedger } from './person.js';
import { G, getPlayer, setNextId, _id } from './gameState.js';
import { syncMemoryIdFromSave } from '../sim/memories.js';
import { migratePlayerRelationships } from '../sim/relationships.js';
import { backfillNpcHumors } from '../sim/humorPersonality.js';
import { backfillMarriageWealth } from '../sim/marriage.js';
import { sanitizePregnancies } from '../sim/conception.js';
import { backfillRelationshipEdgeFloors } from '../sim/relationshipDecay.js';
import { migratePersonInventory } from '../sim/personItems.js';
import { migrateLegacyItemAcquireBonuses } from '../sim/itemEffects.js';

let migrationDeps = { pickCareerForNPC: null, CAREERS_BY_ID: {} };

export function registerSaveMigrationDeps(deps) {
  migrationDeps = { ...migrationDeps, ...deps };
}

export const SAVE_SCHEMA      = 28;
export const SAVE_SLOT_COUNT  = 10;
export const SAVE_KEY_PREFIX  = 'legacy';
export const SAVE_KEY_AUTO    = `${SAVE_KEY_PREFIX}:autosave`;
export const SAVE_KEY_SLOT    = i => `${SAVE_KEY_PREFIX}:slot:${i}`;
export const STORAGE_BUDGET   = 5 * 1024 * 1024;   // 5MB nominal localStorage cap

// Run any cross-version migrations on a loaded save object.
//
//   schema 1 → 2: introduced era system. The calendar timeline shifted from
//     starting at 1990 to starting at 1800. Old saves keep their year value
//     intact — a save made in 1995 still loads as 1995, and currentEra() will
//     resolve it to the 1950 era chunk. No data transformation needed.
//
//   schema 2 → 3: introduced career system (Layer 1). Person now has a
//     career field. Backfill: every non-player adult NPC without a career
//     and past their careerPickAge gets one assigned via pickCareerForNPC.
//     Player stays null; their career system arrives in a later layer.
//     careerPickAge defaults to 18 via PERSON_DEFAULTS, then is re-rolled
//     here for accuracy (the default is fine for new persons but a loaded
//     adult NPC needs the proper [18,30] roll so backfill doesn't fire
//     immediately for everyone).
//
//   schema 3 → 4: introduced career progression (Layer 2). career objects
//     gain `rank` and `yearsAtRank`. For existing careers we derive a
//     plausible rank from time-since-career-start (roughly one tier per
//     decade in role, soft-capped to keep loaded saves consistent). The
//     yearsAtRank is set to the remainder so the next promotion roll fires
//     on a reasonable cadence rather than immediately.
//
//   schema 4 → 5: introduced education stages (Layer 4a). Person gains an
//     `education: { stage, since }` field. Backfill derives stage from age.
//
//   schema 5 → 6: introduced higher-education stages (Layer 4b). New
//     stages 'baccalaureate_in_progress', 'baccalaureate', etc. No
//     backfill needed — no person could have those stages before.
//
//   schema 6 → 7: introduced Situations system. Every person gains a
//     `situations: []` array for active blocking prompts. Old saves
//     don't retroactively fire any situations.
//
// Future migrations append below.
//
//   if (save.schema < 8) { ...; save.schema = 8; }
export function migrateSave(save) {
  // schema 1 → 2: no field rewrites needed. The schema bump is a marker so
  // that the rest of the system knows era-aware code paths are available.
  // Old year values pass through untouched.

  if (save.schema < 3) {
    // Re-roll careerPickAge for everyone (the default 18 from
    // PERSON_DEFAULTS would otherwise make every old adult eligible
    // immediately, which is correct for backfill but means children
    // would all be assigned at exactly 18 going forward — we want the
    // proper spread).
    for (const p of save.people) {
      if (p.careerPickAge === 18) {
        // Spread 18-30 for the proper distribution. We can't tell which
        // ones already had this field meaningfully set, so we reroll all
        // 18s on the assumption that no one rolled this field before
        // schema 3 (they didn't — it didn't exist).
        p.careerPickAge = 18 + Math.floor(Math.random() * 13);
      }
    }
    // Backfill careers for adult NPCs who have already passed their pick age.
    for (const p of save.people) {
      if (!p.isPlayer && p.isAlive && p.career == null && p.age >= p.careerPickAge) {
        const careerId = migrationDeps.pickCareerForNPC(p, save.year);
        if (careerId) {
          p.career = { id: careerId, since: save.year - Math.min(p.age - p.careerPickAge, 5) };
        }
      }
    }
  }

  if (save.schema < 4) {
    // For each existing career, derive rank and yearsAtRank.
    // Heuristic: one rank tier per ~10 years in career, capped by the
    // career's actual rankLadder length. yearsAtRank gets the leftover
    // so the next promotion check fires at the natural cadence.
    for (const p of save.people) {
      if (!p.career) continue;
      if (typeof p.career.rank !== 'number') {
        const yearsInCareer = Math.max(0, save.year - (p.career.since || save.year));
        const career = migrationDeps.CAREERS_BY_ID[p.career.id];
        const maxRank = career ? Math.max(0, career.rankLadder.length - 1) : 0;
        // Soft cap: even an old NPC doesn't auto-jump to the top — they
        // had to earn ranks. Cap at floor(years / 10), bounded by maxRank.
        const derivedRank = Math.min(maxRank, Math.floor(yearsInCareer / 10));
        p.career.rank = derivedRank;
        p.career.yearsAtRank = yearsInCareer % 10;
      }
    }
  }

  if (save.schema < 5) {
    // Backfill education stage from age. Old saves had no education
    // tracking, so we derive a stage that matches the person's current
    // age bracket. The `since` is approximated to the year they would
    // have entered that stage.
    for (const p of save.people) {
      if (p.education && p.education.stage && p.education.stage !== 'none') continue;
      const stage =
        p.age < 6   ? 'none' :
        p.age < 12  ? 'primary' :
        p.age < 18  ? 'secondary' :
                      'completed';
      const sinceAge =
        stage === 'primary'   ? 6 :
        stage === 'secondary' ? 12 :
        stage === 'completed' ? 18 :
                                null;
      const since = (sinceAge != null) ? save.year - (p.age - sinceAge) : null;
      p.education = { stage, since };
    }
  }

  if (save.schema < 6) {
    // Higher education tiers (baccalaureate / licentiate / doctorate)
    // didn't exist before schema 6. No old person could have those
    // stages, so the migration is a no-op. We bump the schema marker
    // so the rest of the system knows higher-ed code paths are
    // available.
  }

  if (save.schema < 7) {
    // Situations didn't exist before schema 7. Initialize the empty
    // array on every person. We don't retroactively fire any situations
    // for existing players — going back in time and saying "by the way
    // you have an unresolved school-starting choice from your childhood"
    // would be jarring. Old saves keep their unmarked history.
    for (const p of save.people) {
      if (!Array.isArray(p.situations)) p.situations = [];
    }
  }

  if (save.schema < 8) {
    // Annals / event log were DOM-only before schema 8. Old saves start
    // with an empty log — we can't reconstruct what was already lost.
    if (!Array.isArray(save.eventLog)) save.eventLog = [];
  }

  if (save.schema < 9) {
    // One-entry-per-year annals queue; old saves have no pending candidate.
    if (save.annalsCandidate !== null && typeof save.annalsCandidate !== 'object') {
      save.annalsCandidate = null;
    }
    if (!('annalsCandidate' in save)) save.annalsCandidate = null;
  }

  if (save.schema < 10) {
    for (const p of save.people) {
      migratePerson(p);
    }
  }

  if (save.schema < 11) {
    for (const p of save.people) {
      if (!Array.isArray(p.situationLog)) p.situationLog = [];
    }
  }

  if (save.schema < 12) {
    for (const p of save.people) {
      if (p.heritage == null) p.heritage = null;
    }
  }

  if (save.schema < 16) {
    const player = save.people.find((p) => p.isPlayer);
    if (player) {
      migratePlayerRelationships(player, save.year, save.people);
    }
  }

  if (save.schema < 17) {
    const player = save.people.find((p) => p.isPlayer);
    if (player) {
      migratePlayerRelationships(player, save.year, save.people);
    }
  }

  if (save.schema < 18) {
    backfillNpcHumors(save.people);
  }

  if (save.schema < 19) {
    backfillMarriageWealth(save.people);
  }

  if (save.schema < 20) {
    const byId = Object.fromEntries((save.people || []).map((p) => [p.id, p]));
    sanitizePregnancies(save.people, (id) => byId[id]);
  }

  if (save.schema < 21) {
    const player = save.people.find((p) => p.isPlayer);
    if (player) backfillRelationshipEdgeFloors(player);
  }

  if (save.schema < 22) {
    if (!Array.isArray(save.memories)) save.memories = [];
    delete save.annalsCandidate;
  }

  if (save.schema < 26) {
    // Situation Log retired as a display surface. Fold each person's
    // situationLog[] into the resolvedSituations ledger (gating-only).
    for (const p of save.people) {
      foldSituationLogToLedger(p);
    }
  }

  if (save.schema < 27) {
    // Hybrid inventory: materials map + equipment instances + equipped slots.
    // Legacy items[] moves into the new stores unequipped; stats come from
    // equipped gear only. One-time strip of old permanent acquire bonuses.
    for (const p of save.people) {
      migratePersonInventory(p);
      if (!p._possessionItemBonuses) {
        migrateLegacyItemAcquireBonuses(p);
      }
    }
  }

  if (save.schema < 28) {
    // Cunning attribute — backfill for existing people.
    for (const p of save.people) {
      if (typeof p.cunning !== 'number') {
        const insight = p.insight ?? 0;
        const age = p.age ?? 0;
        // BALANCE: provisional — adults get a small baseline from insight
        p.cunning = age >= 12 ? Math.min(15, Math.round(insight * 0.15)) : 0;
      }
    }
  }

  // Always end by stamping current schema.
  save.schema = SAVE_SCHEMA;
  return save;
}
// Snapshot the current game into a serializable object.
// Captures world state + UI state needed to restore the view.
export function snapshotGame() {
  const player = getPlayer();
  return {
    schema:        SAVE_SCHEMA,
    savedAt:       Date.now(),
    // World state
    year:          G.year,
    surname:       G.surname,
    people:        G.people,
    pendingSiblings: G.pendingSiblings,
    eventLog:      G.eventLog || [],
    memories:      G.memories || [],
    school:        G.school || null,
    nextId:        _id,
    // Player-level metadata for slot display
    meta: {
      playerName:    player ? `${player.firstName} ${player.surname}` : 'Unknown',
      playerAge:     player ? player.age : 0,
      playerYear:    G.year,
      playerVampire: player ? !!player.isVampire : false,
      playerAlive:   player ? !!player.isAlive : false,
    },
  };
}

// Apply a loaded save to game state. Caller is responsible for ensuring
// the save object has been migrated already.
export function applySave(save) {
  G.year            = save.year;
  G.surname         = save.surname;
  G.people          = (save.people || []).map(migratePerson);
  G.pendingSiblings = save.pendingSiblings || [];
  G.eventLog        = save.eventLog || [];
  G.memories        = save.memories || [];
  G.school          = save.school || null;
  syncMemoryIdFromSave(G.memories);
  setNextId(save.nextId || G.people.reduce((m, p) => Math.max(m, p.id), 0)) || G.people.reduce((m, p) => Math.max(m, p.id), 0);
}

// Try to write a save to localStorage. Returns { ok, error? }.
// Handles quota errors and other failures gracefully.
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

// Try to read a save. Returns the parsed+migrated object, or null.
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

// List all known save slots. Returns array of { key, slot, isAuto, save? }.
// `save` is null for empty slots.
export function listSaves() {
  const slots = [];
  slots.push({ key: SAVE_KEY_AUTO, slot: 0, isAuto: true, save: readSave(SAVE_KEY_AUTO) });
  for (let i = 1; i <= SAVE_SLOT_COUNT; i++) {
    const key = SAVE_KEY_SLOT(i);
    slots.push({ key, slot: i, isAuto: false, save: readSave(key) });
  }
  return slots;
}

// Sum the bytes used across all our save keys.
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

// Save to a specific slot. `slotIndex` 0 = autosave; 1..N = manual slot.
// `customName` overrides the auto-derived slot name (stored in save.meta.label).
export function saveToSlot(slotIndex, customName) {
  const key = slotIndex === 0 ? SAVE_KEY_AUTO : SAVE_KEY_SLOT(slotIndex);
  const save = snapshotGame();
  if (customName) save.meta.label = customName;
  return writeSave(key, save);
}

// Load a specific slot into the active game and switch to the game screen.
// Returns { ok, error? }.
function loadFromSlot(slotIndex) {
  const key = slotIndex === 0 ? SAVE_KEY_AUTO : SAVE_KEY_SLOT(slotIndex);
  const save = readSave(key);
  if (!save) return { ok: false, error: 'Slot is empty.' };
  applySave(save);
  enterGameScreen();
  return { ok: true };
}

// Auto-save fires from ageUp after a successful year-tick.
export function autoSave() {
  const result = saveToSlot(0);
  if (!result.ok) {
    // Don't toast on auto-save failure — it's noisy. Log to console instead.
    console.warn('Auto-save failed:', result.error);
  }
}

// Build the default slot label from save metadata.
//   "Eleanor Ashford · Age 47 · 2037"
export function defaultLabel(save) {
  const m = save.meta || {};
  const parts = [];
  if (m.playerName)  parts.push(m.playerName);
  if (typeof m.playerAge === 'number') parts.push(`Age ${m.playerAge}`);
  if (m.playerYear)  parts.push(String(m.playerYear));
  return parts.join(' · ');
}

// Human-readable real-world timestamp for a save.
export function formatSavedAt(ms) {
  const d = new Date(ms);
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}