/**
 * Player workplace — boss, coworkers, and solo peers generated on career join.
 * Persisted on `G.workplace` (like `G.school`).
 */

import { G, getPerson } from '../state/gameState.js';
import { CAREERS_BY_ID } from '../data/careers.js';
import { createPerson, snapshotBirthStats } from '../state/personFactory.js';
import { randomName, randomSurname } from '../data/names.js';
import { assignRandomHumor } from './humorPersonality.js';
import { ensureRelationship, getRelationshipOrDefault } from './relationships.js';
import { careerLabel } from './careers.js';
import { canSpendActionPoints, spendActionPoints } from './actionPoints.js';
import { clamp, statCap } from '../utils/index.js';
import { ANNALS_PRIORITY, proposeAnnals } from './annals.js';

const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

export const CAREER_UPKEEP_AP = 5;
export const WORK_HARD_AP_COST = 5;
export const WORK_HARD_PROGRESS = 5;
export const PASSIVE_PROMOTION_DRIFT = 5;

export function ensureWorkplaceState() {
  if (!G.workplace || typeof G.workplace !== 'object') {
    G.workplace = null;
    return null;
  }
  if (!Array.isArray(G.workplace.coworkerIds)) G.workplace.coworkerIds = [];
  if (!Array.isArray(G.workplace.peerIds)) G.workplace.peerIds = [];
  if (!G.workplace.roleByPersonId || typeof G.workplace.roleByPersonId !== 'object') {
    G.workplace.roleByPersonId = {};
  }
  if (G.workplace.isBoss == null) G.workplace.isBoss = false;
  return G.workplace;
}

export function clearWorkplace() {
  G.workplace = null;
}

function skewStat(person, stat, career) {
  const isVamp = !!person.isVampire;
  const cap = statCap(stat, isVamp) || 100;
  const base = stat === career.primary ? 55 : 35;
  const val = base + Math.floor(Math.random() * 30);
  person[stat] = clamp(val, 0, cap);
}

function makeColleague({
  player,
  career,
  age,
  rank,
  roleLabel = null,
  withCareer = true,
}) {
  const sex = Math.random() < 0.5 ? 'M' : 'F';
  const person = createPerson({
    firstName: randomName(sex),
    surname: randomSurname(),
    sex,
    age,
    generation: -1,
  });
  person.yearBorn = G.year - age;
  skewStat(person, career.primary, career);
  skewStat(person, career.secondary, career);
  if (withCareer) {
    person.career = {
      id: career.id,
      since: G.year - randInt(2, Math.min(12, age - 20)),
      rank,
      yearsAtRank: randInt(0, 5),
    };
  }
  snapshotBirthStats(person);
  assignRandomHumor(person);
  G.people.push(person);

  const disposition = randInt(-5, 15);
  ensureRelationship(player, person.id, G.year, { disposition });

  if (roleLabel) {
    ensureWorkplaceState();
    G.workplace.roleByPersonId[person.id] = roleLabel;
  }

  return person;
}

function bossRankFor(playerRank, maxRank) {
  return Math.min(maxRank, (playerRank ?? 0) + 1);
}

function bossDisplayRole(career, bossRank) {
  const wp = career.workplace;
  if (wp?.bossTitle) return wp.bossTitle;
  return career.rankLadder[bossRank] || career.rankLadder[career.rankLadder.length - 1];
}

function generateBoss(player, career) {
  const maxRank = career.rankLadder.length - 1;
  const rank = bossRankFor(player.career?.rank ?? 0, maxRank);
  const age = randInt(35, 55);
  const boss = makeColleague({ player, career, age, rank, withCareer: true });
  ensureWorkplaceState();
  G.workplace.roleByPersonId[boss.id] = bossDisplayRole(career, rank);
  G.workplace.bossId = boss.id;
  return boss;
}

function generateGrandBoss(player, career) {
  const title = career.workplace?.grandBoss;
  if (!title) return null;
  const age = randInt(50, 68);
  const npc = makeColleague({
    player,
    career,
    age,
    rank: career.rankLadder.length - 1,
    roleLabel: title,
    withCareer: false,
  });
  ensureWorkplaceState();
  G.workplace.grandBossId = npc.id;
  return npc;
}

function generateCoworkers(player, career) {
  const wp = career.workplace;
  if (!wp?.coworkers) return;
  const [minC, maxC] = wp.coworkers;
  const count = randInt(minC, maxC);
  const ids = [];
  for (let i = 0; i < count; i++) {
    const age = randInt(18, 50);
    const rank = Math.random() < 0.7 ? 0 : 1;
    const coworker = makeColleague({ player, career, age, rank, withCareer: true });
    const role = career.rankLadder[rank] || 'Colleague';
    G.workplace.roleByPersonId[coworker.id] = role;
    ids.push(coworker.id);
  }
  G.workplace.coworkerIds = ids;
}

function generatePeers(player, career) {
  const peers = career.workplace?.peers || [];
  const count = Math.min(peers.length, randInt(1, Math.min(3, peers.length)));
  const picked = [...peers].sort(() => Math.random() - 0.5).slice(0, count);
  const ids = [];
  for (const peer of picked) {
    const age = randInt(25, 55);
    const npc = makeColleague({
      player,
      career,
      age,
      rank: 0,
      roleLabel: peer.role,
      withCareer: false,
    });
    ids.push(npc.id);
  }
  G.workplace.peerIds = ids;
}

/** Build or rebuild the player's workplace for their current career. */
export function generateWorkplace(player, careerId = player.career?.id) {
  const career = CAREERS_BY_ID[careerId];
  if (!player?.isPlayer || !career?.workplace) {
    clearWorkplace();
    return;
  }

  G.workplace = {
    careerId,
    bossId: null,
    grandBossId: null,
    coworkerIds: [],
    peerIds: [],
    roleByPersonId: {},
    isBoss: false,
  };

  const wpType = career.workplace.type;

  if (wpType === 'solo') {
    generatePeers(player, career);
    return;
  }

  // hierarchical or crew
  if (wpType === 'crew') {
    // HOOK: crime system — crew-specific suspicion events attach here
  }

  generateBoss(player, career);
  generateGrandBoss(player, career);
  generateCoworkers(player, career);
}

export function workplaceRoleLabel(personId) {
  const wp = ensureWorkplaceState();
  if (!wp) return '';
  return wp.roleByPersonId[personId] || '';
}

export function getBoss(player) {
  const wp = ensureWorkplaceState();
  if (!wp?.bossId || wp.isBoss) return null;
  return getPerson(wp.bossId);
}

export function getBossDisposition(player) {
  const boss = getBoss(player);
  if (!boss) return null;
  const edge = getRelationshipOrDefault(player, boss.id);
  return edge?.disposition ?? 0;
}

export function promotionThresholdForPlayer(player) {
  const career = CAREERS_BY_ID[player.career?.id];
  const wp = career?.workplace;
  if (!wp || wp.type === 'solo') return 100;

  const wpState = ensureWorkplaceState();
  if (wpState?.isBoss) return Infinity;

  const disp = getBossDisposition(player);
  if (disp == null) return 100;
  if (disp < 0) return Infinity;
  if (disp > 50) return 50;
  return 100;
}

export function isPromotionBlocked(player) {
  const career = CAREERS_BY_ID[player.career?.id];
  if (!career?.workplace || career.workplace.type === 'solo') return false;
  const wp = ensureWorkplaceState();
  if (wp?.isBoss) return false;
  const disp = getBossDisposition(player);
  return disp != null && disp < 0;
}

export function enterBossMode(player) {
  const career = CAREERS_BY_ID[player.career?.id];
  const wp = ensureWorkplaceState();
  if (!wp || !career) return;

  wp.bossId = null;
  wp.isBoss = true;
  const label = careerLabel(career, player);
  proposeAnnals({
    msg: `You now run the ${label.toLowerCase()}.`,
    type: 'good',
    priority: ANNALS_PRIORITY.LIFE,
    category: 'career',
  });
  // HOOK: elite career upgrades — Constable → Royal Guard, etc.
}

export function regenerateBoss(player) {
  const career = CAREERS_BY_ID[player.career?.id];
  const wp = ensureWorkplaceState();
  if (!wp || !career || wp.isBoss) return;

  const oldBoss = wp.bossId ? getPerson(wp.bossId) : null;
  if (oldBoss) {
    if (Math.random() < 0.7) {
      proposeAnnals({
        msg: `${oldBoss.firstName} ${oldBoss.surname} has departed — a new superior awaits.`,
        type: 'info',
        priority: ANNALS_PRIORITY.FLAVOR,
        category: 'career',
      });
    } else {
      wp.coworkerIds.push(oldBoss.id);
      wp.roleByPersonId[oldBoss.id] = career.rankLadder[oldBoss.career?.rank ?? 0] || 'Former superior';
      proposeAnnals({
        msg: `${oldBoss.firstName} ${oldBoss.surname} steps down to work alongside you.`,
        type: 'info',
        priority: ANNALS_PRIORITY.FLAVOR,
        category: 'career',
      });
    }
  }

  generateBoss(player, career);
}

export function workHardForPromotion(player) {
  if (!player?.isPlayer || !player.career) return false;
  const wp = ensureWorkplaceState();
  if (wp?.isBoss) return false;
  const career = CAREERS_BY_ID[player.career.id];
  if (!career) return false;
  const maxRank = career.rankLadder.length - 1;
  if ((player.career.rank ?? 0) >= maxRank) return false;

  if (!canSpendActionPoints(player, WORK_HARD_AP_COST)) return false;
  spendActionPoints(player, WORK_HARD_AP_COST);
  player.career.promotionProgress = Math.min(
    100,
    (player.career.promotionProgress ?? 0) + WORK_HARD_PROGRESS,
  );
  return true;
}

export function deductCareerUpkeep(player) {
  if (!player?.isPlayer || !player.career) return;
  player.actionPoints = Math.max(0, (player.actionPoints ?? 0) - CAREER_UPKEEP_AP);
}

/** After load: player with career but missing workplace gets one generated. */
export function healWorkplaceIfNeeded(player) {
  if (!player?.isPlayer || !player.career) {
    if (G.workplace) clearWorkplace();
    return;
  }
  const wp = ensureWorkplaceState();
  if (!wp || wp.careerId !== player.career.id) {
    generateWorkplace(player, player.career.id);
    return;
  }
  if (player.career.promotionProgress == null) player.career.promotionProgress = 0;
  const career = CAREERS_BY_ID[player.career.id];
  const maxRank = (career?.rankLadder?.length ?? 1) - 1;
  if ((player.career.rank ?? 0) >= maxRank && career?.workplace?.type !== 'solo' && !wp.isBoss) {
    enterBossMode(player);
  }
}