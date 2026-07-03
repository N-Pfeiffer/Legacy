/** Person schema defaults and migration. */

import { migrateLegacyItemAcquireBonuses } from '../sim/itemEffects.js';
import { migrateTraitIds } from '../sim/traits.js';
import { assignRandomHumor } from '../sim/humorPersonality.js';
import { backfillCrimePath } from '../sim/crimePath.js';
import { migrateStaleCareer } from '../sim/careers.js';
import { ensureInventoryStores } from '../sim/personItems.js';

export const PERSON_DEFAULTS = {
  firstName: '',
  surname: '',
  maidenName: null,
  sex: 'M',
  age: 0,
  generation: 0,
  isPlayer: false,
  isAlive: true,
  entity: 'mortal',
  parentIds: [],
  childIds: [],
  spouseIds: [],
  exSpouseIds: [],
  loverIds: [],
  friendIds: [],
  enemyIds: [],
  isVampire: false,
  sireId: null,
  childerIds: [],
  yearTurned: null,
  minionIds: [],
  masterId: null,
  minionType: null,
  yearBorn: null,
  yearDied: null,
  health: 100,
  charisma: 50,
  intelligence: 50,
  wealth: 0,
  money: 0,
  insight: 0,
  cunning: 0,
  prowessBase: 0,
  prowessBonus: 0,
  meleeDamageBonus: 0,
  fertilityBase: 80,
  vampireFertilityBonus: 0,
  pregnant: { active: false, conceivedYear: null, fatherId: null },
  birthStats: null,
  career: null,
  careerPickAge: 18,
  education: { stage: 'none', since: null, track: null, university: null, universityMatriculated: false, universityDeclinedYear: null },
  degrees: [],
  traits: [],
  situations: [],
  resolvedSituations: {},
  decisionsSeen: [],
  items: [],
  materials: {},
  materialAcq: {},
  equipment: [],
  equipped: {
    mainHand: null,
    offhand: null,
    body: null,
    head: null,
    back: null,
    jewelry: [null, null, null, null],
    artifacts: [null, null, null, null],
  },
  patronArc: null,
  mudlarkLockbox: null,
  prison: null,
  crimePath: false,
  thievingUnseen: false,
  syndicateFencedBefore: false,
  suspicion: 0,
  crimeLedger: [],
  suspicionEverPositive: false,
  suspicionTiersSeen: {},
  actionPoints: 20,
  actionPointsMax: 20,
  hobbies: {},
  pinnedIds: [], // "Persons of Note" bookmarks (player only)
};

/**
 * Fold a legacy `situationLog[]` into the `resolvedSituations` ledger and
 * drop the old array. The ledger is keyed by templateId and only used for
 * gating (once popups, one-time offers); it is never displayed. Idempotent.
 */
export function foldSituationLogToLedger(p) {
  if (!p.resolvedSituations || typeof p.resolvedSituations !== 'object'
      || Array.isArray(p.resolvedSituations)) {
    p.resolvedSituations = {};
  }
  if (Array.isArray(p.situationLog)) {
    for (const entry of p.situationLog) {
      const id = entry?.templateId;
      if (!id) continue;
      const cur = p.resolvedSituations[id];
      if (cur) {
        cur.count = (cur.count || 0) + 1;
        cur.lastYear = entry.year ?? cur.lastYear;
      } else {
        p.resolvedSituations[id] = {
          firstYear: entry.year ?? null,
          lastYear: entry.year ?? null,
          count: 1,
        };
      }
    }
    delete p.situationLog;
  }
}

/** Fill missing Person fields from defaults. Mutates and returns p. */
export function migratePerson(p) {
  for (const [key, def] of Object.entries(PERSON_DEFAULTS)) {
    if (!(key in p)) {
      p[key] =
        def && typeof def === 'object' ? structuredClone(def) : def;
    }
  }
  if (!Array.isArray(p.traits)) p.traits = [];
  foldSituationLogToLedger(p);
  if (!Array.isArray(p.decisionsSeen)) p.decisionsSeen = [];
  if (!Array.isArray(p.items)) p.items = [];
  ensureInventoryStores(p);
  if (p.education && !('track' in p.education)) p.education.track = null;
  if (p.education && !('university' in p.education)) p.education.university = null;
  if (p.education && !('universityMatriculated' in p.education)) p.education.universityMatriculated = false;
  if (p.education && !('universityDeclinedYear' in p.education)) p.education.universityDeclinedYear = null;
  if (!Array.isArray(p.degrees)) p.degrees = [];
  if (p.suspicion == null) p.suspicion = 0;
  if (!Array.isArray(p.crimeLedger)) p.crimeLedger = [];
  if (p.suspicionEverPositive == null) {
    p.suspicionEverPositive = (p.suspicion ?? 0) > 0;
  }
  if (!p.suspicionTiersSeen || typeof p.suspicionTiersSeen !== 'object') {
    p.suspicionTiersSeen = {};
  }
  if (p.crimePath == null) p.crimePath = false;
  if (p.thievingUnseen == null) p.thievingUnseen = false;
  if (p.syndicateFencedBefore == null) p.syndicateFencedBefore = false;
  if (p._casedDistrict == null) p._casedDistrict = null;
  if (p.isPlayer && p.career && p.career.promotionProgress == null) {
    p.career.promotionProgress = 0;
  }
  migrateLegacyItemAcquireBonuses(p);
  migrateTraitIds(p);
  migrateStaleCareer(p);
  if (p.isPlayer) backfillCrimePath(p);
  assignRandomHumor(p);
  return p;
}
