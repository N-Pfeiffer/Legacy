import { ITEMS_BY_ID } from '../data/items.js';
import { pick } from '../utils/index.js';
import { addEquipment } from './personItems.js';

/** Semi-random outputs for Study Mysterious Relic. */
const MYSTERIOUS_STUDY_POOL = [
  'artifact',
  'noble_signet_ring',
  'skinny_dagger',
  'footpads_cloak',
  'telescope',
];

export function rollScholarshipOutput(rollId) {
  switch (rollId) {
    case 'mysterious_study':
      return pick(MYSTERIOUS_STUDY_POOL);
    case 'ominous_study':
      return 'bloodstone_amulet';
    default:
      return null;
  }
}

export function grantScholarshipRoll(person, rollId) {
  const itemId = rollScholarshipOutput(rollId);
  if (!itemId || !ITEMS_BY_ID[itemId]) return null;
  addEquipment(person, itemId);
  return ITEMS_BY_ID[itemId].label;
}
