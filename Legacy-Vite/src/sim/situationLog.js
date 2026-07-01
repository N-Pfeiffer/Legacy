import { TRAITS_BY_ID } from '../data/traits.js';
import { trackLabel } from '../data/educationTracks.js';
import { appendAnnals } from './annals.js';
import { recordMemory } from './memories.js';

/*
 * Event recording framework — where a resolved situation goes
 * ──────────────────────────────────────────────────────────
 * There is no Situation Log panel anymore. Every resolution routes to two
 * surfaces, chosen by the template's `record` tier:
 *
 *   - Annals (the chronicle): the play-by-play, chronological feed. Short-term
 *     record keeping — the player scrolls it to see what just happened.
 *   - Memories: the curated, permanent record. After 100+ years a player must
 *     still be able to look back and see WHAT happened, WHY, what they GAINED
 *     or LOST, and WHEN. Keep it strict — only outcomes worth remembering.
 *
 * Set `record` on the template (or a button) to one of:
 *
 *   'flavor'    — a minor in-situation beat: an attempt, a discovery, an
 *                 intermediate step the player won't revisit (e.g. one map
 *                 delivery, finding the lockbox, failing to pick it).
 *                 → Annals only.
 *   'milestone' — a reward / consequence / ending, or a standalone life event
 *                 worth remembering forever (schooling, prison fever, an arc's
 *                 final result, your birth temperament).
 *                 → Annals + Memories.
 *   'silent'    — the template writes its own annals/memory elsewhere (e.g.
 *                 applyEducationChoice, incarceratePlayer). The framework only
 *                 records the gating ledger. → neither.
 *
 * `record` may be a (player) => tier evaluated AFTER apply(), so an outcome can
 * branch (e.g. the patron run is 'flavor' per attempt, 'milestone' on the
 * delivery that completes the bargain).
 *
 * Milestones must be self-describing. The memory body is the authored
 * narrative plus an outcome line built from:
 *   - the auto stat/trait diff (before/after snapshot), and
 *   - an optional `reward` descriptor (string or (player) => string) for items
 *     or arc rewards the diff can't see (e.g. '+ Mysterious Relic').
 * A milestone that produces NEITHER warns in dev — a Memory with no
 * reward/consequence has no reason to exist (mark it 'flavor' instead, or give
 * it a stat effect / reward).
 *
 * Regardless of tier (except when omitted entirely), every resolution stamps
 * the resolvedSituations ledger so `once` popups and one-time offers don't
 * re-fire. See recordResolvedSituation / hasResolvedSituation below.
 *
 * One core, two entry points. `recordEvent()` owns the tier routing, outcome
 * composition, and dev guardrail. Situations call it through
 * `recordSituationResolution()` (which also stamps the ledger). Standalone life
 * events — births, deaths, marriages, degree completions, imprisonment — call
 * it through `recordMilestone()`, getting the same self-describing memories
 * (stat diff + `reward`) without a ledger entry. Prefer one of these two over
 * calling proposeAnnals/recordMemory directly; `'silent'` is the rare escape
 * hatch for anything that must hand-roll its own logging.
 *
 * Other template/button fields still used:
 *   domain     — key into SITUATION_DOMAINS; drives the pending card meta row.
 *   logContext — optional sub-descriptor; string or (player) => string.
 *   logText    — authored resolution narrative; string or (player) => string.
 *   memoryCategory — bucket for the Memories panel ('education', 'life', ...).
 * logContext and logText are evaluated after apply().
 */

export const SITUATION_DOMAINS = {
  education: { label: 'Education' },
  career: { label: 'Career' },
  family: { label: 'Family' },
  clan: { label: 'Clan' },
  estate: { label: 'Estate' },
};

const EDUCATION_TEMPLATE_PREFIXES = [
  'school_',
  'primary_',
  'secondary_',
  'graduation_',
  'university_',
  'licentiate_',
  'doctorate_',
  'univ_',
];

const STAT_KEYS = ['charisma', 'intelligence', 'wealth', 'insight', 'cunning', 'health'];

const STAT_LABELS = {
  charisma: 'Charisma',
  intelligence: 'Intelligence',
  wealth: 'Wealth',
  insight: 'Insight',
  cunning: 'Cunning',
  health: 'Health',
  prowess: 'Prowess',
};

const EDUCATION_STAGE_LABELS = {
  none: 'None',
  primary: 'Primary school',
  secondary: 'Secondary school',
  completed: 'School completed',
  dropped_out: 'Dropped out',
  baccalaureate_in_progress: 'Baccalaureate (in progress)',
  baccalaureate: 'Baccalaureate',
  licentiate_in_progress: 'Licentiate (in progress)',
  licentiate: 'Licentiate',
  doctorate_in_progress: 'Doctorate (in progress)',
  doctorate: 'Doctorate',
};

function educationStageLabel(stage) {
  if (!stage) return 'None';
  return EDUCATION_STAGE_LABELS[stage] || stage.replace(/_/g, ' ');
}

function resolveLogField(value, player) {
  if (typeof value === 'function') return value(player);
  if (typeof value === 'string' && value.trim()) return value;
  return '';
}

function inferDomainFromTemplateId(templateId) {
  if (!templateId) return null;
  if (EDUCATION_TEMPLATE_PREFIXES.some(prefix => templateId.startsWith(prefix))) {
    return 'education';
  }
  return null;
}

export function domainLabel(domainKey) {
  if (!domainKey) return '';
  return SITUATION_DOMAINS[domainKey]?.label || domainKey.replace(/_/g, ' ');
}

export function formatSituationContextLine({ domain, context, age }) {
  const parts = [];
  const domainText = domainLabel(domain);
  if (domainText) parts.push(domainText);
  if (context) parts.push(context);
  if (age != null && age !== '') parts.push(`Age ${age}`);
  return parts.join(' · ');
}

export function resolveSituationDomain(tpl, templateId) {
  return tpl?.domain || inferDomainFromTemplateId(templateId) || null;
}

/** Meta row for pending situation list cards and detail header. */
export function renderSituationPendingMetaHtml(tpl, inst, escapeHtml) {
  const source = domainLabel(resolveSituationDomain(tpl, inst?.templateId));
  const firedYear = inst?.firedYear;
  if (!source && firedYear == null) return '';

  const sourceHtml = source
    ? `<span class="situation-pending-source">${escapeHtml(source)}</span>`
    : '<span class="situation-pending-source"></span>';
  const yearHtml = firedYear != null
    ? `<span class="situation-pending-year">Appeared: <span class="situation-pending-year-value">${escapeHtml(String(firedYear))}</span></span>`
    : '';

  return `<div class="situation-pending-meta">${sourceHtml}${yearHtml}</div>`;
}

function snapshotForSituationResolve(player) {
  return {
    charisma: player.charisma ?? 0,
    intelligence: player.intelligence ?? 0,
    wealth: player.wealth ?? 0,
    insight: player.insight ?? 0,
    cunning: player.cunning ?? 0,
    health: player.health ?? 0,
    prowessBase: player.prowessBase ?? 0,
    prowessBonus: player.prowessBonus ?? 0,
    traits: [...(player.traits || [])],
    educationStage: player.education?.stage ?? 'none',
    educationTrack: player.education?.track ?? null,
  };
}

function diffSituationEffects(before, player) {
  const effects = [];

  for (const stat of STAT_KEYS) {
    const delta = (player[stat] ?? 0) - (before[stat] ?? 0);
    if (delta !== 0) effects.push({ kind: 'stat', stat, delta });
  }

  const prowBefore = before.prowessBase + before.prowessBonus;
  const prowAfter = (player.prowessBase ?? 0) + (player.prowessBonus ?? 0);
  const prowDelta = prowAfter - prowBefore;
  if (prowDelta !== 0) effects.push({ kind: 'stat', stat: 'prowess', delta: prowDelta });

  const afterTraits = player.traits || [];
  for (const traitId of afterTraits) {
    if (!before.traits.includes(traitId)) {
      effects.push({ kind: 'trait', traitId, gained: true });
    }
  }

  const stageAfter = player.education?.stage ?? 'none';
  if (stageAfter !== before.educationStage) {
    effects.push({
      kind: 'education',
      field: 'stage',
      from: before.educationStage,
      to: stageAfter,
    });
  }

  const trackAfter = player.education?.track ?? null;
  if (trackAfter !== before.educationTrack && trackAfter) {
    effects.push({
      kind: 'education',
      field: 'track',
      to: trackAfter,
    });
  }

  return effects;
}

function resolveLogNarrative(logText, player, choiceLabel) {
  const narrative = resolveLogField(logText, player);
  if (narrative) return narrative;
  return `You chose ${choiceLabel.toLowerCase()}.`;
}

/**
 * The resolved-situations ledger — a lightweight record of which templates a
 * person has already resolved, keyed by templateId. It replaces the old
 * `situationLog[]` for gating (`once` popups, one-time offers, follow-ups).
 * It is NOT a display surface; the chronicle (annals) shows the play-by-play
 * and Memories holds the curated milestones.
 */
export function recordResolvedSituation(player, templateId, year) {
  if (!player || !templateId) return;
  if (!player.resolvedSituations || typeof player.resolvedSituations !== 'object'
      || Array.isArray(player.resolvedSituations)) {
    player.resolvedSituations = {};
  }
  const existing = player.resolvedSituations[templateId];
  if (existing) {
    existing.count = (existing.count || 0) + 1;
    existing.lastYear = year ?? existing.lastYear;
  } else {
    player.resolvedSituations[templateId] = {
      firstYear: year ?? null,
      lastYear: year ?? null,
      count: 1,
    };
  }
}

/** True once a template has been resolved at least once. */
export function hasResolvedSituation(player, templateId) {
  return !!player?.resolvedSituations?.[templateId];
}

/**
 * The shared routing core. Sends one resolved event to the chronicle and/or
 * Memories per its `record` tier. Both recordSituationResolution (situations)
 * and recordMilestone (standalone life events) delegate here so the tier
 * semantics, outcome composition, and dev guardrail live in exactly one place.
 *
 *   'flavor'    — a minor beat (an attempt, a discovery, an intermediate step).
 *                 → Annals only.
 *   'milestone' — a reward / consequence / ending, or a standalone life event
 *                 worth remembering forever. → Annals + Memories. Must carry an
 *                 outcome (stat diff and/or an explicit `reward`).
 *   'silent'    — caller logs itself elsewhere (e.g. incarceratePlayer). → nothing.
 *
 * `record` may be a (player) => tier evaluated here. `effects` is the
 * already-computed stat/trait diff (pass [] when there is none). The memory
 * body is the narrative plus an outcome line from the diff and an optional
 * `reward` descriptor (string or (player) => string) for items / arc rewards /
 * non-stat consequences the diff cannot see. A milestone with neither warns in
 * dev — a Memory with no reward/consequence has no reason to exist.
 */
export function recordEvent(player, {
  record,
  title,
  narrative,
  effects = [],
  reward,
  memoryCategory = 'story',
  type = 'info',
  warnIfEmpty = true,
  year,
  age,
}) {
  if (!player) return;

  const raw = typeof record === 'function' ? record(player) : record;
  const tier = (raw === 'flavor' || raw === 'milestone' || raw === 'silent') ? raw : 'silent';
  if (tier === 'silent') return;

  appendAnnals({ year, msg: narrative, type, html: false });
  if (tier !== 'milestone') return;

  const statLine = formatSituationOutcomeLine(effects);
  const rewardText = typeof reward === 'function' ? reward(player) : reward;
  let outcomeLine = statLine;
  if (rewardText) outcomeLine = outcomeLine ? `${outcomeLine} ${rewardText}` : rewardText;

  if (import.meta.env?.DEV && warnIfEmpty && !outcomeLine) {
    console.warn(
      `[events] Milestone "${title}" recorded to Memories with no stat change or reward — `
      + "it will read as purposeless. Add a `reward` or a stat effect, or mark it `record: 'flavor'`.",
    );
  }

  recordMemory({
    year,
    age: age ?? player.age,
    category: memoryCategory,
    title,
    msg: outcomeLine ? `${narrative}\n${outcomeLine}` : narrative,
    type: 'info',
    html: false,
  });
}

/**
 * Resolve a situation: run apply(), diff stats/traits, stamp the
 * resolved-situations ledger, then route through recordEvent per `record`.
 * Back-compat: a bare `memory: true` (no explicit `record`) is a milestone.
 */
export function recordSituationResolution(player, {
  year,
  templateId,
  title,
  choiceLabel,
  logText,
  age,
  memory,
  memoryCategory = 'story',
  record,
  reward,
  type,
  apply,
}) {
  if (!player) return;

  const before = snapshotForSituationResolve(player);
  apply();
  const effects = diffSituationEffects(before, player);
  // Resolve narrative after apply so logText functions can reflect outcomes (e.g. prowess checks).
  const narrative = resolveLogNarrative(logText, player, choiceLabel);

  recordResolvedSituation(player, templateId, year);

  recordEvent(player, {
    record: record ?? (memory ? 'milestone' : 'silent'),
    title,
    narrative,
    effects,
    reward,
    memoryCategory,
    type,
    year,
    age: age ?? player.age,
  });
}

/**
 * Record a standalone life event (birth, death, marriage, degree, sentence)
 * through the same routing + outcome rules as situations — but without a
 * situations-ledger entry, since these are not template-gated prompts.
 *
 * Pass `apply` to have effects auto-diffed (snapshot → apply → diff), or pass
 * pre-computed `effects`. Many life events have no stat change; give them a
 * `reward` string describing what happened (e.g. 'Married Eleanor Vance',
 * 'Died of fever') so the memory still self-describes its outcome.
 */
export function recordMilestone(player, {
  record = 'milestone',
  title,
  narrative,
  reward,
  memoryCategory = 'life',
  type = 'info',
  warnIfEmpty = false,
  year,
  age,
  apply,
  effects,
}) {
  if (!player) return;

  let resolvedEffects = effects || [];
  if (typeof apply === 'function') {
    const before = snapshotForSituationResolve(player);
    apply(player);
    resolvedEffects = diffSituationEffects(before, player);
  }

  recordEvent(player, {
    record,
    title,
    narrative,
    effects: resolvedEffects,
    reward,
    memoryCategory,
    type,
    warnIfEmpty,
    year,
    age: age ?? player.age,
  });
}

/** Snapshot player state, run apply(), return stat/education diffs (excludes trait gains). */
export function runChoiceWithEffects(player, applyFn) {
  const before = snapshotForSituationResolve(player);
  applyFn(player);
  const effects = diffSituationEffects(before, player);
  return effects.filter((e) => e.kind !== 'trait');
}

export function formatSituationEffectText(effect) {
  if (effect.kind === 'stat') {
    const label = STAT_LABELS[effect.stat] || effect.stat;
    const sign = effect.delta > 0 ? '+' : '−';
    const magnitude = Math.abs(effect.delta);
    return `${sign}${magnitude} ${label}`;
  }
  if (effect.kind === 'trait') {
    const trait = TRAITS_BY_ID[effect.traitId];
    const label = trait?.label || effect.traitId.replace(/_/g, ' ');
    return effect.gained ? `Gained: ${label}` : `Lost: ${label}`;
  }
  if (effect.kind === 'education') {
    if (effect.field === 'stage') {
      return educationStageLabel(effect.to);
    }
    if (effect.field === 'track') {
      return trackLabel(effect.to);
    }
  }
  if (effect.kind === 'item') {
    const sign = effect.gained === false ? '−' : '+';
    return `${sign} ${effect.label || effect.id || 'Item'}`;
  }
  if (effect.kind === 'grade') {
    const sign = effect.delta > 0 ? '+' : '−';
    return `${sign}${Math.abs(effect.delta)} Grade`;
  }
  return '';
}

/** Append formatted effect preview to a choice label (school events, immersive choices). */
export function formatChoiceEffectsLine(effects) {
  const line = formatSituationOutcomeLine(effects);
  return line ? ` ${line}` : '';
}

export function formatSituationOutcomeLine(effects) {
  const parts = (effects || [])
    .map(e => formatSituationEffectText(e))
    .filter(Boolean);
  if (!parts.length) return '';
  return `(${parts.join(', ')})`;
}

