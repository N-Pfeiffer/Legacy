import {
  getPlayer,
  getPerson,
  getSiblings,
  getScions,
  getCousins,
  getGrandparents,
  getAuntsUncles,
  getGrandchildren,
} from '../state/gameState.js';

const RELATION_LABEL_PRIORITY = [
  'self', 'spouse', 'ex', 'sire', 'childe',
  'lover', 'friend', 'enemy', 'family',
];

const LABEL_BY_TAG = {
  spouse: 'Spouse',
  ex:     'Ex',
  sire:   'Sire',
  childe: 'Childe',
  lover:  'Lover',
  friend: 'Friend',
  enemy:  'Enemy',
};

// Compute the family role of `person` relative to `focal`, or null if
// none. Used both in card display and in relationLabel below.
export function familyRole(person, focal) {
  if (focal.parentIds.includes(person.id))
    return person.sex === 'M' ? 'Father' : 'Mother';
  if (focal.childIds.includes(person.id))
    return person.sex === 'M' ? 'Son' : 'Daughter';
  const parentSet = new Set(focal.parentIds);
  if (parentSet.size && person.parentIds.some(id => parentSet.has(id)))
    return person.sex === 'M' ? 'Brother' : 'Sister';
  for (const cid of focal.childIds) {
    const child = getPerson(cid);
    if (child?.childIds.includes(person.id))
      return person.sex === 'M' ? 'Grandson' : 'Granddaughter';
  }
  if (getScions(focal).some((s) => s.id === person.id)) return 'Scion';
  for (const pid of focal.parentIds) {
    const parent = getPerson(pid);
    if (parent?.parentIds.includes(person.id))
      return person.sex === 'M' ? 'Grandfather' : 'Grandmother';
  }
  for (const pid of focal.parentIds) {
    const parent = getPerson(pid);
    if (parent && getSiblings(parent).some((s) => s.id === person.id))
      return person.sex === 'M' ? 'Uncle' : 'Aunt';
  }
  if (getCousins(focal).some((c) => c.id === person.id)) return 'Cousin';
  return null;
}

// Returns a Set of relation tags between `person` and the player.
// Used by search filters and by relationLabel when the focal is the player.
export function relationsForPerson(person) {
  const player = getPlayer();
  const tags = new Set();
  if (!player || !person) return tags;
  if (person.id === player.id) { tags.add('self'); return tags; }

  // Family — any parent/child/sibling/grandparent tie
  if (player.parentIds.includes(person.id))                              tags.add('family');
  if (player.childIds.includes(person.id))                               tags.add('family');
  const parentSet = new Set(player.parentIds);
  if (parentSet.size && person.parentIds.some(id => parentSet.has(id)))  tags.add('family');
  if (getGrandparents(player).some((gp) => gp.id === person.id))        tags.add('family');
  if (getAuntsUncles(player).some((au) => au.id === person.id))       tags.add('family');
  if (getCousins(player).some((c) => c.id === person.id))              tags.add('family');
  if (getGrandchildren(player).some((gc) => gc.id === person.id))      tags.add('family');
  if (getScions(player).some((s) => s.id === person.id))               tags.add('family');

  // Social ties
  if (player.spouseIds.includes(person.id))    tags.add('spouse');
  if (player.exSpouseIds.includes(person.id))  tags.add('ex');
  if (player.loverIds.includes(person.id))     tags.add('lover');
  if (player.friendIds.includes(person.id))    tags.add('friend');
  if (player.enemyIds.includes(person.id))     tags.add('enemy');

  // Vampire lineage
  if (player.sireId === person.id)             tags.add('sire');
  if (player.childerIds.includes(person.id))   tags.add('childe');

  return tags;
}

// Unified relation-label function. Returns a human-readable string
// for "this person's relationship to the focal person."
//
// When `focal` is the player, social tags (friend/enemy/lover/spouse/
// ex/sire/childe) are recognized via relationsForPerson. When `focal`
// is any other person, only kinship is computed (we don't track
// non-player social graphs yet).
export function relationLabel(person, focal, opts = {}) {
  const prefix    = opts.prefix    ?? '';
  const fallback  = opts.fallback  ?? '';
  const selfLabel = opts.selfLabel ?? 'Self';

  if (!person || !focal) return fallback;
  if (person.id === focal.id) return selfLabel;

  // If focal is the player, use the full tag system (social ties + family).
  if (focal.isPlayer) {
    const tags = relationsForPerson(person);
    if (tags.size === 0) return fallback;

    // Refine 'family' into the actual familial role for display.
    // (Search filters still use the broad 'family' tag.)
    if (tags.has('family')) {
      const role = familyRole(person, focal);
      if (role) return prefix + role;
    }
    // Otherwise the most specific tag in priority order.
    for (const k of RELATION_LABEL_PRIORITY) {
      if (k === 'self' || k === 'family') continue;
      if (tags.has(k)) return prefix + LABEL_BY_TAG[k];
    }
    return fallback;
  }

  // Focal isn't the player — fall back to kinship + vampire lineage only.
  const role = familyRole(person, focal);
  if (role) return prefix + role;
  if (focal.childerIds.includes(person.id)) return prefix + 'Childe';
  if (person.childerIds.includes(focal.id)) return prefix + 'Sire';
  return fallback;
}
