import { ITEMS_BY_ID } from '../data/items.js';
import { HOBBIES_BY_ID } from '../data/hobbies.js';
import {
  getHuntingConfig,
  getHuntingZone,
  isDeepWealdUnlocked,
} from '../data/huntingZones.js';
import { weightedPick } from '../utils/index.js';
import { currentProwess } from './prowess.js';
import { effectiveCunning } from './itemEffects.js';
import { addEquipment, addMaterial } from './personItems.js';
import {
  canSpendActionPoints,
  spendActionPoints,
} from './actionPoints.js';
import { addHobbySkill, getHobbyLevel, isHobbyUnlocked } from './hobbies.js';

function meetsStatRequirement(player, req) {
  if (req.hunting != null && getHobbyLevel(player, 'hunting') < req.hunting) return false;
  if (req.prowess != null && currentProwess(player) < req.prowess) return false;
  if (req.cunning != null && effectiveCunning(player) < req.cunning) return false;
  return true;
}

function creatureEligible(player, creature) {
  if (creature.requiresStalking && !isHobbyUnlocked(player, HOBBIES_BY_ID.stalking)) {
    return false;
  }
  if (creature.requiresAny?.length) {
    if (!creature.requiresAny.some((req) => meetsStatRequirement(player, req))) return false;
  }
  if (creature.requires?.length) {
    if (!creature.requires.every((req) => meetsStatRequirement(player, req))) return false;
  }
  return true;
}

function eligibleCreatures(player, zone) {
  return (zone.creatures || []).filter((c) => creatureEligible(player, c));
}

function pickCreature(player, zone) {
  const pool = eligibleCreatures(player, zone);
  if (!pool.length) return null;
  const weights = pool.map((c) => ({ creature: c, weight: c.weight ?? 1 }));
  return weightedPick(weights).creature;
}

function grantDrop(person, drop) {
  const item = ITEMS_BY_ID[drop.id];
  if (!item || !person) return;
  const n = drop.n ?? 1;
  if (drop.asEquipment || item.category === 'equipment') {
    for (let i = 0; i < n; i++) addEquipment(person, drop.id);
  } else {
    addMaterial(person, drop.id, n);
  }
}

function formatDropList(totals) {
  const parts = [...totals.entries()]
    .filter(([, n]) => n > 0)
    .sort((a, b) => (ITEMS_BY_ID[a[0]]?.label || a[0]).localeCompare(ITEMS_BY_ID[b[0]]?.label || b[0]))
    .map(([id, n]) => {
      const label = ITEMS_BY_ID[id]?.label || id;
      return `${n} ${label}`;
    });

  if (!parts.length) return 'nothing of note';
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

function applyCreatureDrops(player, creature, totals) {
  for (const drop of creature.drops || []) {
    const n = drop.n ?? 1;
    totals.set(drop.id, (totals.get(drop.id) || 0) + n);
    grantDrop(player, drop);
  }
  for (const drop of creature.chanceDrops || []) {
    if (Math.random() >= (drop.chance ?? 0)) continue;
    totals.set(drop.id, (totals.get(drop.id) || 0) + 1);
    grantDrop(player, { ...drop, n: 1 });
  }
}

export function canHunt(player, zoneId) {
  if (!player?.isPlayer) return { ok: false, reason: 'not_player' };
  const zone = getHuntingZone(zoneId);
  const config = getHuntingConfig();
  if (!zone || !config) return { ok: false, reason: 'invalid' };
  if (!isHobbyUnlocked(player, HOBBIES_BY_ID.hunting)) return { ok: false, reason: 'locked' };

  const skill = getHobbyLevel(player, 'hunting');
  if (skill < (zone.skillReq ?? 0)) return { ok: false, reason: 'skill' };
  if (zone.questLocked && !isDeepWealdUnlocked(player)) return { ok: false, reason: 'quest' };

  if (!eligibleCreatures(player, zone).length) return { ok: false, reason: 'no_prey' };

  const cost = zone.apCost ?? 1;
  if (!canSpendActionPoints(player, cost)) return { ok: false, reason: 'no_action_points' };
  return { ok: true };
}

export function runHunt(player, zoneId) {
  const check = canHunt(player, zoneId);
  if (!check.ok) return { ok: false, reason: check.reason };

  const zone = getHuntingZone(zoneId);
  const config = getHuntingConfig();
  const cost = zone.apCost ?? 1;

  if (!spendActionPoints(player, cost)) {
    return { ok: false, reason: 'no_action_points' };
  }

  const creature = pickCreature(player, zone);
  if (!creature) return { ok: false, reason: 'no_prey' };

  addHobbySkill(player, 'hunting', config.skillGain ?? 0.5);
  const level = Math.round(getHobbyLevel(player, 'hunting'));

  const totals = new Map();
  applyCreatureDrops(player, creature, totals);

  let extra = '';
  if (creature.witnessChance && Math.random() < creature.witnessChance) {
    // TODO: witness event — roll consequence when crime/bounty system exists
    extra = ' Someone may have seen you.';
  }
  if (player.isVampire && creature.requiresStalking) {
    // TODO: Blood/Hunger stat — offer Drain for Blood choice
    extra += ' (Drain for Blood is not yet available.)';
  }

  const dropsText = formatDropList(totals);
  const message = `You hunted ${zone.label} and brought down a ${creature.label.toLowerCase()}, gaining ${dropsText}.${extra} (Hunting skill now ${level}.)`;

  return { ok: true, message, type: 'good', level, creature: creature.id, totals };
}
