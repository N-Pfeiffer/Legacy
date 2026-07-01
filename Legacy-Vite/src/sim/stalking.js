import { CAREERS_BY_ID } from '../data/careers.js';
import { TRAITS_BY_ID } from '../data/traits.js';
import { getAlive } from '../state/gameState.js';
import { pick } from '../utils/index.js';
import {
  canSpendActionPoints,
  spendActionPoints,
} from './actionPoints.js';
import { addHobbySkill, getHobbyLevel, isHobbyUnlocked } from './hobbies.js';
import { HOBBIES_BY_ID } from '../data/hobbies.js';

function personDisplayName(p) {
  return [p.firstName, p.surname].filter(Boolean).join(' ') || 'a stranger';
}

function spyDetail(target) {
  if (target.traits?.length) {
    const traitId = pick(target.traits);
    const trait = TRAITS_BY_ID[traitId];
    if (trait?.label) return `they bear the mark of ${trait.label.toLowerCase()}`;
  }
  const career = target.career?.id ? CAREERS_BY_ID[target.career.id] : null;
  if (career) {
    const name = career.nameByEra?.[1800] || career.id.replace(/_/g, ' ');
    return `they earn their keep as a ${name.toLowerCase()}`;
  }
  if (target.enemyIds?.length) return 'they quarrel with half the parish';
  if (target.loverIds?.length) return 'they keep a secret rendezvous after dusk';
  return 'they slip through crowds with practiced ease';
}

export function runStalkingSpy(player) {
  if (!player?.isPlayer) return { ok: false, reason: 'not_player' };
  if (!isHobbyUnlocked(player, HOBBIES_BY_ID.stalking)) return { ok: false, reason: 'locked' };

  const cost = 1;
  if (!canSpendActionPoints(player, cost)) return { ok: false, reason: 'no_action_points' };
  if (!spendActionPoints(player, cost)) return { ok: false, reason: 'no_action_points' };

  const targets = getAlive().filter((p) => !p.isPlayer && (p.age ?? 0) >= 14);
  if (!targets.length) {
    return { ok: false, reason: 'no_targets', message: 'There is no one worth watching this year.' };
  }

  const target = pick(targets);
  addHobbySkill(player, 'stalking', 0.5);
  const level = Math.round(getHobbyLevel(player, 'stalking'));
  const name = personDisplayName(target);
  const detail = spyDetail(target);

  return {
    ok: true,
    message: `You shadowed ${name} and learned that ${detail}. (Stalking skill now ${level}.)`,
    type: 'info',
    level,
  };
}
