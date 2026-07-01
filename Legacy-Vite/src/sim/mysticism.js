import { clamp } from '../utils/index.js';
import { statCap } from '../utils/statCap.js';
import {
  canSpendActionPoints,
  spendActionPoints,
} from './actionPoints.js';
import { addHobbySkill, getHobbyLevel, isHobbyUnlocked } from './hobbies.js';
import { HOBBIES_BY_ID } from '../data/hobbies.js';
import { hasItem, materialCount, removeMaterial } from './personItems.js';
import { equippedItems } from './equipment.js';
import { effectiveInsight } from './itemEffects.js';

function hasTelescope(player) {
  if (!player) return false;
  if (hasItem(player, 'telescope')) return true;
  return equippedItems(player).some((e) => e.id === 'telescope');
}

export function runReadTheStars(player) {
  if (!player?.isPlayer) return { ok: false, reason: 'not_player' };
  if (!isHobbyUnlocked(player, HOBBIES_BY_ID.mysticism)) return { ok: false, reason: 'locked' };
  if (!hasTelescope(player)) {
    return { ok: false, reason: 'no_telescope', message: 'You need a telescope to read the stars.' };
  }

  const cost = 1;
  if (!canSpendActionPoints(player, cost)) return { ok: false, reason: 'no_action_points' };
  if (!spendActionPoints(player, cost)) return { ok: false, reason: 'no_action_points' };

  addHobbySkill(player, 'mysticism', 0.5);
  const level = Math.round(getHobbyLevel(player, 'mysticism'));
  const cap = statCap('insight', !!player.isVampire);
  player.insight = clamp((player.insight ?? 0) + 1, 0, cap);

  return {
    ok: true,
    message: `You read the heavens through your lens and felt the omens align. (+1 Insight. Mysticism skill now ${level}.)`,
    type: 'good',
    level,
  };
}

export function runSeance(player) {
  if (!player?.isPlayer) return { ok: false, reason: 'not_player' };
  if (!isHobbyUnlocked(player, HOBBIES_BY_ID.mysticism)) return { ok: false, reason: 'locked' };

  const skill = getHobbyLevel(player, 'mysticism');
  if (skill < 50) {
    return { ok: false, reason: 'skill', message: 'Requires Mysticism 50.' };
  }

  const ingredients = [
    { id: 'bone_meal', n: 1 },
    { id: 'oneiric_resin', n: 1 },
    { id: 'candles', n: 1 },
  ];
  for (const ing of ingredients) {
    if (materialCount(player, ing.id) < ing.n) {
      return { ok: false, reason: 'inputs', message: 'You lack the ritual components (Bone Meal, Oneiric Resin, and Candles).' };
    }
  }

  const cost = 2;
  if (!canSpendActionPoints(player, cost)) return { ok: false, reason: 'no_action_points' };
  if (!spendActionPoints(player, cost)) return { ok: false, reason: 'no_action_points' };

  for (const ing of ingredients) removeMaterial(player, ing.id, ing.n);
  addHobbySkill(player, 'mysticism', 0.5);
  const level = Math.round(getHobbyLevel(player, 'mysticism'));

  // TODO: minion creation (spirit type, 5-year expiry) — minion system has display only
  return {
    ok: true,
    message: `You lit the candles and called across the veil. Something answered — but binding a spirit is beyond you yet. (Mysticism skill now ${level}.)`,
    type: 'good',
    level,
  };
}

export function runDarkRitualStub() {
  return {
    ok: false,
    reason: 'stub',
    message: 'Dark Ritual is not yet implemented.',
  };
}

export function runMysticismEndeavor(player, endeavorId) {
  switch (endeavorId) {
    case 'read_the_stars':
      return runReadTheStars(player);
    case 'seance':
      return runSeance(player);
    case 'dark_ritual':
      return runDarkRitualStub();
    default:
      return { ok: false, reason: 'invalid' };
  }
}
