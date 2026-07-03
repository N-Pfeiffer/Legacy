import { ITEMS_BY_ID } from '../data/items.js';
import { itemAnnalsLinkHtml } from '../utils/itemAnnalsLink.js';
import {
  getGatheringConfig,
  getGatheringZone,
} from '../data/gatheringZones.js';
import { HOBBIES_BY_ID } from '../data/hobbies.js';
import { clamp, weightedPick } from '../utils/index.js';
import { statCap } from '../utils/statCap.js';
import { addMaterial } from './personItems.js';
import {
  canSpendActionPoints,
  spendActionPoints,
} from './actionPoints.js';
import { addHobbySkill, getHobbyLevel, isHobbyUnlocked } from './hobbies.js';

// BALANCE: provisional drop weights
const RARITY_WEIGHTS = {
  common: 60,
  uncommon: 28,
  rare: 10,
  unique: 2,
};

function dropAttemptsForSkill(skill) {
  let attempts = 1;
  if (skill >= 50) attempts += 1;
  if (skill >= 80) attempts += 1;
  return attempts;
}

function groupDropsByRarity(drops) {
  const map = {};
  for (const d of drops) {
    if (!map[d.rarity]) map[d.rarity] = [];
    map[d.rarity].push(d);
  }
  return map;
}

function rarityWeightsForZone(byRarity, skill) {
  return Object.entries(RARITY_WEIGHTS)
    .map(([rarity, base]) => {
      if (!byRarity[rarity]?.length) return null;
      let weight = base;
      if (rarity === 'uncommon') weight += skill * 0.2;
      if (rarity === 'rare') weight += skill * 0.15;
      if (rarity === 'unique') weight += skill * 0.05;
      return { rarity, weight };
    })
    .filter(Boolean);
}

function pickDropEntry(zone, skill) {
  const byRarity = groupDropsByRarity(zone.drops || []);
  const weights = rarityWeightsForZone(byRarity, skill);
  if (!weights.length) return null;
  const tier = weightedPick(weights).rarity;
  const pool = byRarity[tier];
  return pool[Math.floor(Math.random() * pool.length)];
}

function quantityForRarity(rarity) {
  if (rarity === 'common') return 1 + Math.floor(Math.random() * 3);
  if (rarity === 'uncommon') return 1 + Math.floor(Math.random() * 2);
  return 1;
}

function formatDropList(totals) {
  const parts = [...totals.entries()]
    .filter(([, n]) => n > 0)
    .sort((a, b) => (ITEMS_BY_ID[a[0]]?.label || a[0]).localeCompare(ITEMS_BY_ID[b[0]]?.label || b[0]))
    .map(([id, n]) => {
      const link = itemAnnalsLinkHtml(id);
      return n > 1 ? `${n}× ${link}` : link;
    });

  if (!parts.length) return 'nothing of note';
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

export function canGather(player, hobbyId, zoneId) {
  if (!player?.isPlayer) return { ok: false, reason: 'not_player' };
  const hobby = HOBBIES_BY_ID[hobbyId];
  const zone = getGatheringZone(hobbyId, zoneId);
  const config = getGatheringConfig(hobbyId);
  if (!hobby || !zone || !config) return { ok: false, reason: 'invalid' };
  if (!isHobbyUnlocked(player, hobby)) return { ok: false, reason: 'locked' };
  const skill = getHobbyLevel(player, hobbyId);
  if (skill < (zone.skillReq ?? 0)) return { ok: false, reason: 'skill' };
  const cost = zone.apCost ?? 1;
  if (!canSpendActionPoints(player, cost)) return { ok: false, reason: 'no_action_points' };
  return { ok: true };
}

export function runGather(player, hobbyId, zoneId) {
  const check = canGather(player, hobbyId, zoneId);
  if (!check.ok) return { ok: false, reason: check.reason };

  const hobby = HOBBIES_BY_ID[hobbyId];
  const zone = getGatheringZone(hobbyId, zoneId);
  const config = getGatheringConfig(hobbyId);
  const cost = zone.apCost ?? 1;

  if (!spendActionPoints(player, cost)) {
    return { ok: false, reason: 'no_action_points' };
  }

  const skillBefore = getHobbyLevel(player, hobbyId);
  addHobbySkill(player, hobbyId, config.skillGain ?? 0.5);
  const level = Math.round(getHobbyLevel(player, hobbyId));

  const totals = new Map();
  const attempts = dropAttemptsForSkill(skillBefore);
  for (let i = 0; i < attempts; i++) {
    const entry = pickDropEntry(zone, skillBefore);
    if (!entry) continue;
    const qty = quantityForRarity(entry.rarity);
    totals.set(entry.id, (totals.get(entry.id) || 0) + qty);
    addMaterial(player, entry.id, qty);
  }

  let healthLine = '';
  if (zone.healthRestore) {
    const min = zone.healthRestore.min ?? 1;
    const max = zone.healthRestore.max ?? min;
    const gain = min + Math.floor(Math.random() * (max - min + 1));
    const cap = statCap('health', !!player.isVampire);
    player.health = clamp((player.health ?? 0) + gain, 0, cap);
    healthLine = ` You feel somewhat restored (+${gain} Health).`;
  }

  const verb = config.gatherVerb || 'gathered at';
  const dropsText = formatDropList(totals);
  const message = `You ${verb} ${zone.label} and gained ${dropsText}.${healthLine} (${hobby.label} skill now ${level}).`;

  return { ok: true, message, type: 'good', level, totals };
}
