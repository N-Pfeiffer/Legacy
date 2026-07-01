import { G } from '../state/gameState.js';
import { currentEra } from '../data/eras.js';
import { CAREERS, CAREERS_BY_ID } from '../data/careers.js';
import { statCap, weightedPick } from '../utils/index.js';
import { currentProwess } from './prowess.js';
import { currentFertility } from './conception.js';
import { effectiveStat } from './itemEffects.js';
import { ANNALS_PRIORITY, proposeAnnals } from './annals.js';
import { isJournaled } from './journal.js';

let hooks = {
  personNameHtmlAnnals: (p) => String(p?.firstName ?? ''),
};

export function registerCareerHooks(h) {
  hooks = { ...hooks, ...h };
}

export function careerName(person, year = G.year) {
  if (!person?.career) return null;
  const career = CAREERS_BY_ID[person.career.id];
  if (!career) return null;
  const era = currentEra(year);
  return career.nameByEra[era] || null;
}

export function careerRankLabel(person) {
  if (!person?.career) return null;
  const career = CAREERS_BY_ID[person.career.id];
  if (!career) return null;
  const rank = person.career.rank ?? 0;
  return career.rankLadder[rank] || null;
}

export function careerDisplay(person, year = G.year) {
  const name = careerName(person, year);
  const rank = careerRankLabel(person);
  if (!name && !rank) return null;
  if (!name) return rank;
  if (!rank) return name;
  if (rank === name) return name;
  return `${rank}, ${name}`;
}

export function pickCareerForNPC(person, year = G.year, opts = {}) {
  const era = currentEra(year);
  let eligible = CAREERS.filter(c => c.eras.includes(era));
  if (opts.schoolCompatibleOnly) {
    eligible = eligible.filter(c => c.schoolCompatible);
  }
  if (typeof opts.filter === 'function') {
    eligible = eligible.filter(opts.filter);
  }
  if (!eligible.length) return null;

  const isVamp = !!person.isVampire;
  const statValue = (stat) => {
    // Use the live value, but for derived stats (prowess, fertility)
    // pull from the curve function so we get the actual current number.
    if (stat === 'prowess')   return currentProwess(person);
    if (stat === 'fertility') return currentFertility(person);
    return effectiveStat(person, stat);
  };

  const weighted = eligible.map(c => {
    const primCap = statCap(c.primary, isVamp) || 100;
    const secCap  = statCap(c.secondary, isVamp) || 100;
    const primNorm = Math.max(0, statValue(c.primary)) / primCap;
    const secNorm  = Math.max(0, statValue(c.secondary)) / secCap;
    const weight = 10 + primNorm * 30 + secNorm * 10;
    return { weight, career: c };
  });

  const picked = weightedPick(weighted);
  return picked.career.id;
}

export function assignCareerToPerson(person, year = G.year) {
  if (person.isPlayer) return;             // player career is Layer 3
  if (!person.isAlive) return;
  if (person.career) return;               // already has one — idempotent

  const careerId = pickCareerForNPC(person, year);
  if (!careerId) return;
  person.career = { id: careerId, since: year, rank: 0, yearsAtRank: 0 };
}

export function assignCareerToPersonWithAgeFit(person, year = G.year, opts = {}) {
  if (person.isPlayer || !person.isAlive || person.career) return;

  const era = currentEra(year);
  const ageFits = (c) => person.age >= c.startAge[0] && person.age <= c.startAge[1] + 5;
  const careerFits = (c) => {
    if (!c.eras.includes(era) || !ageFits(c)) return false;
    if (opts.schoolCompatibleOnly && !c.schoolCompatible) return false;
    return true;
  };

  // Try up to 5 stat-weighted picks; accept the first that fits the age.
  for (let i = 0; i < 5; i++) {
    const careerId = pickCareerForNPC(person, year, opts);
    if (!careerId) return;
    const c = CAREERS_BY_ID[careerId];
    if (c && careerFits(c)) {
      person.career = { id: careerId, since: year, rank: 0, yearsAtRank: 0 };
      return;
    }
  }

  // Fallback: uniform pick from age-eligible careers in this era.
  const fallback = CAREERS.filter(c => careerFits(c));
  if (!fallback.length) return;
  const chosen = fallback[Math.floor(Math.random() * fallback.length)];
  person.career = { id: chosen.id, since: year, rank: 0, yearsAtRank: 0 };
}

export function assignEarlyCareerToNPC(person, year = G.year) {
  assignCareerToPersonWithAgeFit(person, year, { schoolCompatibleOnly: true });
}

const PROMOTION_THRESHOLDS = [0.28, 0.60, 0.72, 0.85];
const ENTRY_RANK_PROMOTION_BONUS = 0.10;  // rank 0 → 1: time-in-seat mobility
const RETIREMENT_AGE = 65;
const PROMOTION_CADENCE_YEARS = 10;
const DEMOTION_MARGIN = 0.15;     // score below threshold by this much risks demotion
const DEMOTION_BASE_CHANCE = 0.20;

// Compute the "fit score" for a person at their current career.
// Pure function — no randomness. The promotion check adds noise on top.

export function careerFitScore(person) {
  if (!person.career) return 0;
  const career = CAREERS_BY_ID[person.career.id];
  if (!career) return 0;

  const isVamp = !!person.isVampire;
  const statValue = (stat) => {
    if (stat === 'prowess')   return currentProwess(person);
    if (stat === 'fertility') return currentFertility(person);
    return effectiveStat(person, stat);
  };
  const primCap = statCap(career.primary, isVamp) || 100;
  const secCap  = statCap(career.secondary, isVamp) || 100;
  const primNorm = Math.min(1, Math.max(0, statValue(career.primary)) / primCap);
  const secNorm  = Math.min(1, Math.max(0, statValue(career.secondary)) / secCap);

  const yearsInCareer = Math.max(0, G.year - (person.career.since || G.year));
  const tenureBonus = Math.min(0.15, Math.floor(yearsInCareer / 10) * 0.05);

  return primNorm * 0.5 + secNorm * 0.25 + tenureBonus;
}

export function progressCareerOneYear(person) {
  if (!person.career) return;
  if (!person.isAlive) return;
  const career = CAREERS_BY_ID[person.career.id];
  if (!career) return;

  person.career.yearsAtRank = (person.career.yearsAtRank || 0) + 1;

  // Retirement — mortals only. Vampires keep working forever.
  if (!person.isVampire && person.age >= RETIREMENT_AGE) return;

  // Only roll on cadence.
  if (person.career.yearsAtRank < PROMOTION_CADENCE_YEARS) return;

  const scoreBase = careerFitScore(person) + (Math.random() * 0.2 - 0.1);
  const currentRank = person.career.rank || 0;
  const score = currentRank === 0 ? scoreBase + ENTRY_RANK_PROMOTION_BONUS : scoreBase;
  const maxRank = career.rankLadder.length - 1;

  // At top of ladder — no more rolls.
  if (currentRank >= maxRank) {
    person.career.yearsAtRank = 0;   // stop accumulating, save a bit of memory
    return;
  }

  const nextThreshold = PROMOTION_THRESHOLDS[currentRank] ?? 1.0;

  if (score >= nextThreshold) {
    // Promotion!
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

  // Failed the promotion check. Reset the clock and check for demotion.
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
  if (w <= 5)  return 'Destitute';
  if (w <= 25) return 'Poor';
  if (w <= 50) return 'Middle Class';
  if (w <= 75) return 'Rich';
  return         'Wealthy';
}

export function careerWealthTarget(person) {
  if (!person.career) return null;
  const career = CAREERS_BY_ID[person.career.id];
  if (!career) return null;

  const base = 8 + (career.prestige || 0) * 16;
  const rankBonus = (person.career.rank || 0) * 8;
  let target = base + rankBonus;

  if (!person.isVampire && person.age >= RETIREMENT_AGE) {
    target = Math.max(0, target - 15);
  }
  return target;
}

export function tickWealthGravity(person) {
  if (!person.career) return;
  const target = careerWealthTarget(person);
  if (target == null) return;

  const cap = statCap('wealth', !!person.isVampire);
  const current = person.wealth;
  const diff = target - current;

  if (Math.abs(diff) < 1) return;      // close enough; no drift
  const step = Math.sign(diff) * Math.min(2, Math.abs(diff));
  person.wealth = Math.max(0, Math.min(cap, current + step));
}

export function tickCareerProgression() {
  for (const p of G.people) {
    if (!p.isAlive) continue;
    if (!p.career) continue;

    // Player and journaled NPCs both get full progression rolls.
    // The player has career only once they pick one (Layer 3); before
    // that this loop skips them naturally via the !p.career guard above.
    if (p._journaled || p.isPlayer) {
      progressCareerOneYear(p);
    }
    tickWealthGravity(p);
  }
}
