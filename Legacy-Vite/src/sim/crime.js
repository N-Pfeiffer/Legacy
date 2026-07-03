/**
 * Suspicion meter, crime ledger, tier thresholds, trial math, and yearly tick.
 */

import { G } from '../state/gameState.js';
import { clamp } from '../utils/index.js';
import { effectiveCharisma, effectiveCunning } from './itemEffects.js';
import { incarceratePlayer } from './prison.js';
import { killPerson } from './mortality.js';
import { trySpendMoney, formatMoney } from './money.js';
import { ANNALS_PRIORITY, proposeAnnals } from './annals.js';
import { recordMilestone } from './situationLog.js';
import { getMagistrate } from './magistrate.js';
import { getRelationshipOrDefault } from './relationships.js';
import { ITEMS_BY_ID } from '../data/items.js';
import { removeMaterial, materialCount } from './personItems.js';
import { unlockCrimePathFromSuspicion } from './crimePath.js';

const LEDGER_RETENTION_YEARS = 15;
const SEVERITY_WINDOW_YEARS = 10;

const TIER_LABELS = {
  unnoticed: 'Unnoticed',
  curious: 'The Watch is curious',
  watchful: 'The Watch is watchful',
  warrant: 'A warrant is out',
};

const TIER_ENTRY_ANNALS = {
  curious: 'You notice the same constable on your street two mornings running.',
  watchful: 'Constables ask after you by name at the chandler\'s shop.',
  warrant: 'Your face appears on a broadsheet pinned outside the magistrate\'s court.',
};

const PASSIVE_CAREER_SUSPICION = {
  poacher: 2,
  river_pirate: 4,
};

export function suspicionTierLabel(tier) {
  return TIER_LABELS[tier] || TIER_LABELS.unnoticed;
}

export function suspicionTierFromValue(value) {
  const s = clamp(value ?? 0, 0, 100);
  if (s >= 75) return 'warrant';
  if (s >= 50) return 'watchful';
  if (s >= 25) return 'curious';
  return 'unnoticed';
}

export function suspicionTier(player) {
  return suspicionTierFromValue(player?.suspicion ?? 0);
}

export function watchEyeVisible(player) {
  return !!(player?.isPlayer && player.suspicionEverPositive);
}

export function ledgerSeverity(player, years = SEVERITY_WINDOW_YEARS) {
  const ledger = player?.crimeLedger;
  if (!Array.isArray(ledger)) return 0;
  const cutoff = G.year - years;
  return ledger
    .filter((e) => (e.year ?? 0) >= cutoff)
    .reduce((sum, e) => sum + (e.severity ?? 0), 0);
}

function pruneLedger(player) {
  if (!Array.isArray(player?.crimeLedger)) return;
  const cutoff = G.year - LEDGER_RETENTION_YEARS;
  player.crimeLedger = player.crimeLedger.filter((e) => (e.year ?? 0) >= cutoff);
}

function ensureCrimeState(player) {
  if (player.suspicion == null) player.suspicion = 0;
  if (!Array.isArray(player.crimeLedger)) player.crimeLedger = [];
  if (!player.suspicionTiersSeen || typeof player.suspicionTiersSeen !== 'object') {
    player.suspicionTiersSeen = {};
  }
}

function logTierEntry(tier) {
  const msg = TIER_ENTRY_ANNALS[tier];
  if (!msg) return;
  proposeAnnals({
    msg,
    type: 'bad',
    priority: ANNALS_PRIORITY.FLAVOR,
    category: 'crime',
  });
}

function enterTier(player, tier, fireSituation) {
  if (!tier || tier === 'unnoticed') return;
  ensureCrimeState(player);
  if (player.suspicionTiersSeen[tier]) return;
  player.suspicionTiersSeen[tier] = true;
  logTierEntry(tier);
  if (tier === 'curious') {
    if (typeof fireSituation === 'function') {
      fireSituation(player, 'watch_questions');
    } else {
      if (!Array.isArray(player._crimeSituationQueue)) player._crimeSituationQueue = [];
      player._crimeSituationQueue.push('watch_questions');
    }
  }
}

/** Drain queued tier situations (e.g. after mid-year poaching). */
export function flushCrimeSituationQueue(player, fireSituation) {
  if (!player || typeof fireSituation !== 'function') return;
  const q = player._crimeSituationQueue;
  if (!Array.isArray(q) || !q.length) return;
  while (q.length) {
    const id = q.shift();
    fireSituation(player, id);
  }
}

function checkTierTransition(player, before, fireSituation) {
  const oldTier = suspicionTierFromValue(before);
  const newTier = suspicionTier(player);
  if (newTier === oldTier) return;
  enterTier(player, newTier, fireSituation);
}

/** Flat −15 on criminal success rolls at watchful+ (Thieving, assassination — Phase B/C). */
export function criminalRollPenalty(player) {
  return suspicionTier(player) === 'watchful' ? -15 : 0;
}

export function addSuspicion(player, n, opts = {}) {
  if (!player?.isPlayer || !n) return;
  const { type, severity, witnessed, fireSituation } = opts;
  ensureCrimeState(player);
  const before = player.suspicion ?? 0;
  player.suspicion = clamp(before + n, 0, 100);
  if (player.suspicion > 0) player.suspicionEverPositive = true;
  if (n > 0) player._suspicionGainedThisYear = true;

  unlockCrimePathFromSuspicion(player, before, player.suspicion, { fireSituation });

  if (type) {
    player.crimeLedger.push({
      year: G.year,
      type,
      severity: severity ?? 1,
      witnessed: !!witnessed,
    });
  }

  checkTierTransition(player, before, fireSituation);
}

export function confiscateHotGoods(player) {
  if (!player?.isPlayer) return false;
  let found = false;
  for (const [itemId, count] of Object.entries(player.materials || {})) {
    if (count > 0 && ITEMS_BY_ID[itemId]?.hotGoods) {
      removeMaterial(player, itemId, count);
      found = true;
    }
  }
  if (found) {
    addSuspicion(player, 10);
  }
  return found;
}

export function trialEvidenceScore(player) {
  let evidence = ledgerSeverity(player);
  const recentWitness = (player?.crimeLedger || []).some(
    (e) => e.witnessed && (G.year - (e.year ?? 0)) <= 3,
  );
  if (recentWitness) evidence += 3;
  return evidence;
}

export function hasCapitalCharges(player) {
  return (player?.crimeLedger || []).some(
    (e) => e.type === 'murder' && e.witnessed,
  );
}

function hasMurderCharges(player) {
  return (player?.crimeLedger || []).some((e) => e.type === 'murder');
}

function applyGallows(player) {
  recordMilestone(player, {
    title: 'Hanged at Newgate',
    narrative: 'Hanged at Newgate before a paying crowd.',
    memoryCategory: 'life',
    type: 'bad',
    year: G.year,
  });
  killPerson(player, { skipMilestone: true });
}

function rollD20() {
  return Math.floor(Math.random() * 20) + 1;
}

function wouldTransport(evidence) {
  return evidence >= 10;
}

function gaolYearsForEvidence(evidence) {
  return clamp(Math.round(evidence / 2), 1, 7);
}

function applyAcquittal(player) {
  addSuspicion(player, -30);
  recordMilestone(player, {
    title: 'Acquitted',
    narrative: 'The jury retires for scarcely an hour. When they return, the foreman will not meet your eye — but the verdict is not guilty.',
    memoryCategory: 'life',
    type: 'good',
    year: G.year,
  });
}

function applyGaolSentence(player, years) {
  incarceratePlayer(player, { years, source: 'crime' });
}

function applyTransportation(player) {
  incarceratePlayer(player, { years: 7, source: 'transportation' });
  recordMilestone(player, {
    title: 'Transported',
    narrative: 'The sentence is the hulks at Woolwich, then the long passage south. London will forget your name before you see her shores again.',
    memoryCategory: 'life',
    type: 'bad',
    year: G.year,
  });
}

function improveVerdictOneStep(player, evidence) {
  if (wouldTransport(evidence)) {
    applyGaolSentence(player, gaolYearsForEvidence(evidence));
    return 'gaol';
  }
  const years = gaolYearsForEvidence(evidence);
  if (years >= 3) {
    applyGaolSentence(player, Math.max(1, Math.floor(years / 2)));
    return 'reduced_gaol';
  }
  applyAcquittal(player);
  return 'acquittal';
}

function applyConviction(player, evidence) {
  if (hasCapitalCharges(player) && evidence >= 12) {
    applyGallows(player);
    return 'gallows';
  }
  if (hasMurderCharges(player)) {
    applyTransportation(player);
    return 'transportation';
  }
  if (wouldTransport(evidence)) {
    applyTransportation(player);
    return 'transportation';
  }
  applyGaolSentence(player, gaolYearsForEvidence(evidence));
  return 'gaol';
}

/**
 * Resolve a crime trial defense choice. Returns outcome key.
 */
export function resolveTrialDefense(player, defenseId) {
  const evidence = trialEvidenceScore(player);
  const dc = 20 + evidence * 2;
  let defense = 0;
  let barristerBonus = 0;

  if (defenseId === 'charisma') {
    defense = effectiveCharisma(player) / 2 + rollD20();
  } else if (defenseId === 'cunning') {
    defense = effectiveCunning(player) / 2 + rollD20();
  } else if (defenseId === 'barrister') {
    const ownBarrister = player.career?.id === 'barrister';
    if (!ownBarrister && !trySpendMoney(player, 10 * evidence)) {
      return { ok: false, reason: 'cannot_afford' };
    }
    defense = Math.max(effectiveCharisma(player), effectiveCunning(player)) / 2 + rollD20();
    barristerBonus = 15;
  } else if (defenseId === 'quiet_word') {
    const cost = 15 * evidence;
    if (!trySpendMoney(player, cost)) {
      return { ok: false, reason: 'cannot_afford' };
    }
    const mag = getMagistrate();
    const edge = mag ? getRelationshipOrDefault(player, mag.id) : null;
    const disp = edge?.disposition ?? 0;
    if (disp > 50) {
      improveVerdictOneStep(player, evidence);
      return { ok: true, outcome: 'quiet_word_success' };
    }
    const charmRoll = effectiveCharisma(player) / 2 + rollD20();
    if (charmRoll >= dc) {
      improveVerdictOneStep(player, evidence);
      return { ok: true, outcome: 'quiet_word_success' };
    }
    applyConviction(player, evidence);
    return { ok: true, outcome: 'convicted' };
  } else {
    return { ok: false, reason: 'invalid' };
  }

  const total = defense + barristerBonus;
  if (total >= dc) {
    applyAcquittal(player);
    return { ok: true, outcome: 'acquitted' };
  }

  applyConviction(player, evidence);
  return { ok: true, outcome: 'convicted' };
}

export function settleCrimeOnPrisonRelease(player, source) {
  if (!player?.isPlayer) return;
  ensureCrimeState(player);
  if (source === 'transportation') {
    player.suspicion = 0;
    player.crimeLedger = [];
    recordMilestone(player, {
      title: 'Returned from Transportation',
      narrative: 'You return to London older, free, and forgotten. The Watch has no memory of your name.',
      memoryCategory: 'life',
      type: 'info',
      year: G.year,
    });
    return;
  }
  player.suspicion = Math.min(player.suspicion ?? 0, 20);
}

function applyPassiveCareerSuspicion(player) {
  const id = player.career?.id;
  const n = PASSIVE_CAREER_SUSPICION[id];
  if (n) addSuspicion(player, n);
}

function applyDecay(player) {
  const gained = !!player._suspicionGainedThisYear;
  const delta = gained ? -4 : -10;
  if (delta < 0) {
    const before = player.suspicion ?? 0;
    player.suspicion = clamp(before + delta, 0, 100);
  }
}

function rollWarrantArrest(player) {
  const s = player.suspicion ?? 0;
  if (s < 75) return false;
  const chance = (s - 70) / 80;
  return Math.random() < chance;
}

/**
 * Yearly suspicion tick — decay, passive careers, threshold events, arrest.
 * Returns template ids the caller should fire (excluding those fired inline).
 */
export function tickSuspicion(player, { fireSituation } = {}) {
  if (!player?.isPlayer || !player.isAlive) return [];
  ensureCrimeState(player);

  player._suspicionGainedThisYear = false;
  pruneLedger(player);

  const tierBefore = suspicionTier(player);
  applyPassiveCareerSuspicion(player);
  applyDecay(player);

  const s = player.suspicion ?? 0;
  if (s < 25) delete player.suspicionTiersSeen.curious;
  if (s < 50) delete player.suspicionTiersSeen.watchful;
  if (s < 75) delete player.suspicionTiersSeen.warrant;

  const tierAfter = suspicionTier(player);
  if (tierAfter !== tierBefore) {
    enterTier(player, tierAfter, fireSituation);
  }

  const queued = [];

  if (tierAfter === 'watchful' && Math.random() < 0.2) {
    queued.push('watch_searches');
  }

  if (tierAfter === 'warrant' && rollWarrantArrest(player)) {
    queued.push('crime_trial');
  }

  player._suspicionGainedThisYear = false;

  for (const id of queued) {
    if (typeof fireSituation === 'function') fireSituation(player, id);
  }

  return queued;
}

export function fireCrimeTrial(player, fireSituation) {
  if (typeof fireSituation === 'function') fireSituation(player, 'crime_trial');
}
