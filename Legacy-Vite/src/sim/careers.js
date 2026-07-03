import { G, getPerson } from '../state/gameState.js';
import {
  CAREERS,
  CAREERS_BY_ID,
  PAY_TIER_MAX,
} from '../data/careers.js';
import { DEGREES_BY_ID as EDU_DEGREES_BY_ID } from '../data/education.js';
import { statCap, weightedPick, clamp } from '../utils/index.js';
import { currentProwess } from './prowess.js';
import { currentFertility } from './conception.js';
import { effectiveStat } from './itemEffects.js';
import { ANNALS_PRIORITY, proposeAnnals } from './annals.js';
import { isJournaled } from './journal.js';
import { getHobbyLevel, addHobbySkill } from './hobbies.js';
import { addMoney } from './money.js';
import { getFather } from './university.js';
import {
  ensureWorkplaceState,
  enterBossMode,
  regenerateBoss,
  promotionThresholdForPlayer,
  PASSIVE_PROMOTION_DRIFT,
  clearWorkplace,
} from './workplace.js';

let hooks = {
  personNameHtmlAnnals: (p) => String(p?.firstName ?? ''),
};

export function registerCareerHooks(h) {
  hooks = { ...hooks, ...h };
}

// ── Labels ─────────────────────────────────────────────────────────

export function careerLabel(career, person) {
  if (!career) return '';
  if (career.labelBySex) {
    const sex = person?.sex || 'M';
    return career.labelBySex[sex] || career.labelBySex.M || career.label || career.id;
  }
  return career.label || career.id;
}

export function careerName(person) {
  if (!person?.career) return null;
  const career = CAREERS_BY_ID[person.career.id];
  if (!career) return null;
  return careerLabel(career, person);
}

export function careerRankLabel(person) {
  if (!person?.career) return null;
  const career = CAREERS_BY_ID[person.career.id];
  if (!career) return null;
  const rank = person.career.rank ?? 0;
  return career.rankLadder[rank] || null;
}

export function careerDisplay(person) {
  const name = careerName(person);
  const rank = careerRankLabel(person);
  if (!name && !rank) return null;
  if (!name) return rank;
  if (!rank) return name;
  if (rank === name) return name;
  return `${rank}, ${name}`;
}

// ── Pay ────────────────────────────────────────────────────────────

function payTierMaxForCareer(person, career) {
  if (career.payTierRange) {
    const [minTier, maxTier] = career.payTierRange;
    const cha = Math.max(0, Math.min(1, effectiveStat(person, 'charisma') / 100));
    const minPay = PAY_TIER_MAX[minTier] ?? 0;
    const maxPay = PAY_TIER_MAX[maxTier] ?? minPay;
    return minPay + (maxPay - minPay) * cha;
  }
  return PAY_TIER_MAX[career.payTier] ?? 0;
}

function effectivePayTierNumber(person, career) {
  if (career.payTierRange) {
    const [minTier, maxTier] = career.payTierRange;
    const cha = Math.max(0, Math.min(1, effectiveStat(person, 'charisma') / 100));
    return minTier + (maxTier - minTier) * cha;
  }
  return career.payTier ?? 1;
}

export function annualPay(person) {
  if (!person?.career) return 0;
  const career = CAREERS_BY_ID[person.career.id];
  if (!career) return 0;

  const tierMax = payTierMaxForCareer(person, career);
  const ladderLen = career.rankLadder.length;
  const rank = person.career.rank ?? 0;
  if (ladderLen <= 1) return Math.round(tierMax);
  const rankFactor = 0.5 + 0.5 * rank / (ladderLen - 1);
  return Math.round(tierMax * rankFactor);
}

export function hypotheticalAnnualPay(person, career, rank = 0) {
  const tierMax = payTierMaxForCareer(person, career);
  const ladderLen = career.rankLadder.length;
  if (ladderLen <= 1) return Math.round(tierMax);
  const rankFactor = 0.5 + 0.5 * rank / (ladderLen - 1);
  return Math.round(tierMax * rankFactor);
}

export function entryAnnualPay(person, career) {
  return hypotheticalAnnualPay(person, career, 0);
}

export function peakAnnualPay(person, career) {
  const maxRank = Math.max(0, career.rankLadder.length - 1);
  return hypotheticalAnnualPay(person, career, maxRank);
}

// ── Requirements ─────────────────────────────────────────────────

function degreeLabel(degreeId) {
  return EDU_DEGREES_BY_ID[degreeId]?.label ?? degreeId;
}

function statValue(person, stat) {
  if (stat === 'prowess') return currentProwess(person);
  if (stat === 'fertility') return currentFertility(person);
  return effectiveStat(person, stat);
}

function educationStageMet(player, required) {
  const stage = player.education?.stage;
  const hasDegrees = (player.degrees?.length ?? 0) > 0;
  if (required === 'primary') {
    return stage === 'secondary' || stage === 'completed' || stage === 'university'
      || (stage === 'dropped_out' && player.age >= 12) || hasDegrees;
  }
  if (required === 'secondary') {
    return stage === 'completed' || stage === 'university'
      || (stage === 'dropped_out' && player.age >= 17) || hasDegrees;
  }
  return true;
}

function careerHasDegreeGate(req) {
  if (!req) return false;
  return !!(req.degrees?.length || req.anyDegree || req.degreesAnyOf?.length);
}

function isWidowed(person) {
  const ids = [...(person.spouseIds || []), ...(person.exSpouseIds || [])];
  for (const id of ids) {
    const sp = getPerson(id);
    if (sp && !sp.isAlive) return true;
  }
  return false;
}

/** Requirement lines for UI: { text, met }. */
export function careerRequirementLines(player, career) {
  const req = career.requirements;
  const lines = [];
  if (!req) return lines;

  if (req.degrees?.length) {
    for (const degId of req.degrees) {
      const met = (player.degrees ?? []).includes(degId);
      lines.push({ text: `${degreeLabel(degId)} degree`, met });
    }
  }
  if (req.anyDegree) {
    const met = (player.degrees?.length ?? 0) > 0;
    lines.push({ text: 'Any university degree', met });
  }
  if (req.degreesAnyOf?.length) {
    const met = req.degreesAnyOf.some((id) => (player.degrees ?? []).includes(id));
    const names = req.degreesAnyOf.map(degreeLabel).join(' or ');
    lines.push({ text: `${names} degree`, met });
  }
  if (req.educationStage) {
    const label = req.educationStage === 'primary' ? 'Primary schooling complete' : 'Secondary schooling complete';
    lines.push({ text: label, met: educationStageMet(player, req.educationStage) });
  }
  if (req.stats) {
    for (const [stat, min] of Object.entries(req.stats)) {
      const val = Math.round(statValue(player, stat));
      lines.push({ text: `${stat[0].toUpperCase()}${stat.slice(1)} ${min}`, met: val >= min });
    }
  }
  if (req.statsAnyOf?.length) {
    const parts = req.statsAnyOf.map((entry) => {
      const stat = Object.keys(entry)[0];
      return `${stat} ${entry[stat]}`;
    });
    const met = req.statsAnyOf.some((entry) => {
      const stat = Object.keys(entry)[0];
      return statValue(player, stat) >= entry[stat];
    });
    lines.push({ text: parts.join(' or '), met });
  }
  if (req.hobbySkills) {
    for (const [hobbyId, min] of Object.entries(req.hobbySkills)) {
      const val = Math.round(getHobbyLevel(player, hobbyId));
      lines.push({ text: `${hobbyId} skill ${min}`, met: val >= min });
    }
  }
  if (req.fatherWealth != null) {
    const father = getFather(player);
    const fw = father?.wealth ?? 0;
    lines.push({ text: `Father's wealth ${req.fatherWealth}`, met: fw >= req.fatherWealth });
  }
  if (req.sex) {
    lines.push({ text: req.sex === 'M' ? 'Male' : 'Female', met: player.sex === req.sex });
  }
  return lines;
}

function requirementsMet(player, career) {
  return careerRequirementLines(player, career).every((l) => l.met);
}

export function careerEligibilityForPlayer(player, career) {
  const stage = player.education?.stage;
  const inSchool = stage === 'primary' || stage === 'secondary';
  if (inSchool) {
    if (player.age < 14) {
      return { eligible: false, reason: 'Age 14 to balance school and work.' };
    }
    if (!career.schoolCompatible) {
      return { eligible: false, reason: 'Part-time trades only while still in school.' };
    }
  } else if (stage === 'none') {
    return { eligible: false, reason: 'More years lived.' };
  }

  const unmet = careerRequirementLines(player, career).find((l) => !l.met);
  if (unmet) {
    return { eligible: false, reason: unmet.text };
  }

  return { eligible: true };
}

function npcMeetsRequirements(person, career) {
  const req = career.requirements;
  if (!req) return true;

  if (req.sex && person.sex !== req.sex) return false;
  if (req.minAge != null && person.age < req.minAge) return false;
  if (req.widowed && !isWidowed(person)) return false;

  if (careerHasDegreeGate(req)) {
    if (person.education?.stage !== 'completed') return false;
    if ((person.wealth ?? 0) < 50) return false;
  }

  return true;
}

// ── NPC assignment ─────────────────────────────────────────────────

function wealthBand(wealth) {
  const w = Math.max(0, Math.round(wealth));
  if (w <= 5) return 'destitute';
  if (w <= 25) return 'poor';
  if (w <= 50) return 'middle';
  if (w <= 75) return 'rich';
  return 'elite';
}

function classMatchMultiplier(person, career) {
  const band = wealthBand(person.wealth ?? 0);
  const group = career.socialGroup;

  if (group === 'criminal' && (band === 'destitute' || band === 'poor')) return 1.5;
  if (group === band) return 3;
  if (group === 'elite' && band === 'elite') return 3;
  return 1;
}

export function pickCareerForNPC(person, opts = {}) {
  let eligible = CAREERS.filter((c) => npcMeetsRequirements(person, c));
  if (opts.schoolCompatibleOnly) {
    eligible = eligible.filter((c) => c.schoolCompatible);
  }
  if (typeof opts.filter === 'function') {
    eligible = eligible.filter(opts.filter);
  }
  if (!eligible.length) return null;

  const isVamp = !!person.isVampire;
  const statVal = (stat) => {
    if (stat === 'prowess') return currentProwess(person);
    if (stat === 'fertility') return currentFertility(person);
    return effectiveStat(person, stat);
  };

  const weighted = eligible.map((c) => {
    const primCap = statCap(c.primary, isVamp) || 100;
    const secCap = statCap(c.secondary, isVamp) || 100;
    const primNorm = Math.max(0, statVal(c.primary)) / primCap;
    const secNorm = Math.max(0, statVal(c.secondary)) / secCap;
    const classMult = classMatchMultiplier(person, c);
    const weight = (10 + primNorm * 30 + secNorm * 10) * classMult;
    return { weight, career: c };
  });

  const picked = weightedPick(weighted);
  return picked.career.id;
}

export function assignCareerToPerson(person, year = G.year) {
  if (person.isPlayer) return;
  if (!person.isAlive) return;
  if (person.career) return;

  const careerId = pickCareerForNPC(person);
  if (!careerId) return;
  person.career = { id: careerId, since: year, rank: 0, yearsAtRank: 0 };
}

export function assignCareerToPersonWithAgeFit(person, year = G.year, opts = {}) {
  if (person.isPlayer || !person.isAlive || person.career) return;

  for (let i = 0; i < 8; i++) {
    const careerId = pickCareerForNPC(person, opts);
    if (!careerId) return;
    const c = CAREERS_BY_ID[careerId];
    if (c) {
      person.career = { id: careerId, since: year, rank: 0, yearsAtRank: 0 };
      return;
    }
  }
}

export function assignEarlyCareerToNPC(person, year = G.year) {
  assignCareerToPersonWithAgeFit(person, year, { schoolCompatibleOnly: true });
}

// ── Progression ────────────────────────────────────────────────────

const PROMOTION_THRESHOLDS = [0.28, 0.60, 0.72, 0.85];
const ENTRY_RANK_PROMOTION_BONUS = 0.10;
export const RETIREMENT_AGE = 65;
export const PROMOTION_CADENCE_YEARS = 10;
const DEMOTION_MARGIN = 0.15;
const DEMOTION_BASE_CHANCE = 0.20;

export function careerFitScore(person) {
  if (!person.career) return 0;
  const career = CAREERS_BY_ID[person.career.id];
  if (!career) return 0;

  const isVamp = !!person.isVampire;
  const statVal = (stat) => {
    if (stat === 'prowess') return currentProwess(person);
    if (stat === 'fertility') return currentFertility(person);
    return effectiveStat(person, stat);
  };
  const primCap = statCap(career.primary, isVamp) || 100;
  const secCap = statCap(career.secondary, isVamp) || 100;
  const primNorm = Math.min(1, Math.max(0, statVal(career.primary)) / primCap);
  const secNorm = Math.min(1, Math.max(0, statVal(career.secondary)) / secCap);

  const yearsInCareer = Math.max(0, G.year - (person.career.since || G.year));
  const tenureBonus = Math.min(0.15, Math.floor(yearsInCareer / 10) * 0.05);

  return primNorm * 0.5 + secNorm * 0.25 + tenureBonus;
}

export function progressPlayerCareerOneYear(player) {
  if (!player?.isPlayer || !player.career) return;
  const career = CAREERS_BY_ID[player.career.id];
  if (!career) return;

  if (!player.isVampire && player.age >= RETIREMENT_AGE) return;

  const maxRank = career.rankLadder.length - 1;
  const currentRank = player.career.rank ?? 0;
  const wp = ensureWorkplaceState();

  if (currentRank >= maxRank) {
    if (wp && !wp.isBoss && career.workplace?.type !== 'solo') {
      enterBossMode(player);
    }
    return;
  }

  if (wp?.isBoss) return;

  player.career.promotionProgress = Math.min(
    100,
    (player.career.promotionProgress ?? 0) + PASSIVE_PROMOTION_DRIFT,
  );

  const threshold = promotionThresholdForPlayer(player);
  if (threshold === Infinity) return;
  if ((player.career.promotionProgress ?? 0) < threshold) return;

  player.career.rank = currentRank + 1;
  player.career.promotionProgress = 0;

  const newRankName = career.rankLadder[player.career.rank];
  const displayName = careerName(player) || career.id;
  const pay = annualPay(player);

  proposeAnnals({
    msg: `You were promoted — you are now ${newRankName} (${displayName}). Your wages rise to £${pay} a year.`,
    type: 'good',
    priority: ANNALS_PRIORITY.LIFE,
  });

  if (player.career.rank >= maxRank) {
    if (career.workplace?.type !== 'solo') {
      enterBossMode(player);
    }
  } else {
    regenerateBoss(player);
  }
}

export function progressCareerOneYear(person) {
  if (!person.career || !person.isAlive) return;
  const career = CAREERS_BY_ID[person.career.id];
  if (!career) return;

  person.career.yearsAtRank = (person.career.yearsAtRank || 0) + 1;

  if (!person.isVampire && person.age >= RETIREMENT_AGE) return;
  if (person.career.yearsAtRank < PROMOTION_CADENCE_YEARS) return;

  const scoreBase = careerFitScore(person) + (Math.random() * 0.2 - 0.1);
  const currentRank = person.career.rank || 0;
  const score = currentRank === 0 ? scoreBase + ENTRY_RANK_PROMOTION_BONUS : scoreBase;
  const maxRank = career.rankLadder.length - 1;

  if (currentRank >= maxRank) {
    person.career.yearsAtRank = 0;
    return;
  }

  const nextThreshold = PROMOTION_THRESHOLDS[currentRank] ?? 1.0;

  if (score >= nextThreshold) {
    person.career.rank = currentRank + 1;
    person.career.yearsAtRank = 0;
    const newRankName = career.rankLadder[person.career.rank];
    const displayName = careerName(person) || career.id;
    if (person.isPlayer) {
      proposeAnnals({
        msg: `You were promoted — you are now ${newRankName} (${displayName}).`,
        type: 'good',
        priority: ANNALS_PRIORITY.LIFE,
      });
    } else if (isJournaled(person)) {
      proposeAnnals({
        msg: `${hooks.personNameHtmlAnnals(person)} was promoted — now ${newRankName} (${displayName}).`,
        type: 'info',
        html: true,
        priority: ANNALS_PRIORITY.LIFE,
      });
    }
    return;
  }

  person.career.yearsAtRank = 0;

  if (currentRank > 0) {
    const currentRankThreshold = PROMOTION_THRESHOLDS[currentRank - 1] ?? 0;
    if (score < currentRankThreshold - DEMOTION_MARGIN && Math.random() < DEMOTION_BASE_CHANCE) {
      person.career.rank = currentRank - 1;
      const newRankName = career.rankLadder[person.career.rank];
      const displayName = careerName(person) || career.id;
      if (person.isPlayer) {
        proposeAnnals({
          msg: `You were demoted — you are now ${newRankName} (${displayName}).`,
          type: 'bad',
          priority: ANNALS_PRIORITY.LIFE,
        });
      } else if (isJournaled(person)) {
        proposeAnnals({
          msg: `${hooks.personNameHtmlAnnals(person)} was demoted — now ${newRankName} (${displayName}).`,
          type: 'bad',
          html: true,
          priority: ANNALS_PRIORITY.LIFE,
        });
      }
    }
  }
}

export function wealthTierLabel(wealth) {
  const w = Math.max(0, Math.round(wealth));
  if (w <= 5) return 'Destitute';
  if (w <= 25) return 'Poor';
  if (w <= 50) return 'Middle Class';
  if (w <= 75) return 'Rich';
  return 'Wealthy';
}

export function careerWealthTarget(person) {
  if (!person.career) return null;
  const career = CAREERS_BY_ID[person.career.id];
  if (!career) return null;

  const payTierEff = effectivePayTierNumber(person, career);
  let target = Math.round(Math.max(5, Math.min(95, payTierEff * 9)));
  target += (person.career.rank || 0) * 8;

  if (!person.isVampire && person.age >= RETIREMENT_AGE) {
    target = Math.max(0, target - 15);
  }
  return target;
}

export function tickWealthGravity(person) {
  if (person.isPlayer) return;
  if (!person.career) return;
  const target = careerWealthTarget(person);
  if (target == null) return;

  const cap = statCap('wealth', !!person.isVampire);
  const current = person.wealth;
  const diff = target - current;

  if (Math.abs(diff) < 1) return;
  const step = Math.sign(diff) * Math.min(2, Math.abs(diff));
  person.wealth = Math.max(0, Math.min(cap, current + step));
}

function tickPlayerCareerYearlyEffects(player) {
  if (!player?.isPlayer || !player.career) return;
  const career = CAREERS_BY_ID[player.career.id];
  if (!career?.yearlyEffects) return;

  const effects = career.yearlyEffects;
  if (effects.hobbySkills) {
    for (const [hobbyId, gain] of Object.entries(effects.hobbySkills)) {
      addHobbySkill(player, hobbyId, gain);
    }
  }
  if (effects.stdChance != null && Math.random() < effects.stdChance) {
    const cap = statCap('health', !!player.isVampire, player);
    player.health = clamp((player.health ?? 0) - 15, 0, cap);
    proposeAnnals({
      msg: 'You have contracted a disease.',
      type: 'bad',
      priority: ANNALS_PRIORITY.LIFE,
      category: 'health',
    });
    // HOOK: disease system — replace flat health hit with proper disease state
  }
}

function tickPlayerCareerSalary(player) {
  if (!player?.isPlayer || !player.career) return;
  const pay = annualPay(player);
  if (pay <= 0) return;
  addMoney(player, pay, {
    log: true,
    annalsMsg: `Your year's wages: £${pay}.`,
    annalsType: 'good',
  });
}

export function tickCareerProgression() {
  for (const p of G.people) {
    if (!p.isAlive || !p.career) continue;

    if (p.isPlayer) {
      progressPlayerCareerOneYear(p);
    } else if (p._journaled) {
      progressCareerOneYear(p);
    }
    tickWealthGravity(p);

    if (p.isPlayer) {
      tickPlayerCareerYearlyEffects(p);
      tickPlayerCareerSalary(p);
    }
  }
}

/** Clear career if id is unknown (stale save). */
export function migrateStaleCareer(person) {
  if (person.career?.id && !CAREERS_BY_ID[person.career.id]) {
    person.career = null;
    if (person.isPlayer) clearWorkplace();
  }
}
