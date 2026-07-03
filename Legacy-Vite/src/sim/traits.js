import { clamp } from '../utils/index.js';
import { statCap } from '../utils/statCap.js';
import {
  TRAITS_BY_ID,
  TRAIT_KIND,
  TRAIT_POINT_COST,
  CREATION_TRAIT_BUDGET,
  INNATE_TRAIT_IDS,
  INNATE_POSITIVE_IDS,
  INNATE_DRAWBACK_IDS,
  TRAIT_ID_MIGRATIONS,
  HUMOR_IDS,
  isTraitHidden,
} from '../data/traits.js';
import { HUMORS } from '../data/humors.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { logEvent } from './annals.js';

export function getTraitDisplayDescription(trait, person) {
  if (!trait) return '';
  if (trait.kind === TRAIT_KIND.HUMOR) {
    if (person?.isVampire && trait.vampireDescription) {
      const base = trait.mortalDescription || trait.description || '';
      return base ? `${base} ${trait.vampireDescription}` : trait.vampireDescription;
    }
    return trait.mortalDescription || trait.description || '';
  }
  const parts = [trait.description || ''];
  if (person?.isVampire && trait.vampireDescription) {
    parts.push(trait.vampireDescription);
  } else if (trait.hiddenDescription) {
    parts.push(trait.hiddenDescription);
  }
  return parts.filter(Boolean).join(' ');
}

/** Swap humor trait copy/effects when the player is Embraced (mechanics stub). */
export function applyHumorEmbraceSwap(person) {
  if (!person || !Array.isArray(person.traits)) return;
  const humorId = person.traits.find((id) => HUMOR_IDS.includes(id));
  if (!humorId) return;
  person.humorPhase = 'vampire';
}

export function getPersonHumorId(person) {
  return (person?.traits || []).find((id) => HUMOR_IDS.includes(id)) || null;
}

export function hasTrait(person, traitId) {
  return Array.isArray(person?.traits) && person.traits.includes(traitId);
}

export function hasAnyTrait(person, traitIds) {
  return traitIds.some((id) => hasTrait(person, id));
}

export function grantTrait(person, traitId) {
  if (!person || !TRAITS_BY_ID[traitId]) return false;
  if (!Array.isArray(person.traits)) person.traits = [];
  if (person.traits.includes(traitId)) return false;
  person.traits.unshift(traitId);
  if (
    person.isPlayer
    && (person.age ?? 0) > 0
    && !HUMOR_IDS.includes(traitId)
    && !isTraitHidden(traitId)
  ) {
    const trait = TRAITS_BY_ID[traitId];
    logEvent({
      msg: `You gained the trait ${trait?.label || traitId}.`,
      type: 'good',
      category: 'trait',
      title: trait?.label || traitId,
    });
  }
  return true;
}

/** Remove a trait from a person. Humor traits are permanent unless `force: true`. */
export function revokeTrait(person, traitId, opts = {}) {
  if (!person || !Array.isArray(person.traits)) return false;
  if (!opts.force && HUMOR_IDS.includes(traitId)) return false;
  const idx = person.traits.indexOf(traitId);
  if (idx < 0) return false;
  person.traits.splice(idx, 1);
  return true;
}

function applyTraitStatModsDelta(person, traitId, sign = 1) {
  if (!person || !sign) return;
  const trait = TRAITS_BY_ID[traitId];
  if (!trait?.statMods) return;
  const vampire = !!person.isVampire;
  for (const [stat, delta] of Object.entries(trait.statMods)) {
    const mod = delta * sign;
    if (stat === 'prowessBase') {
      person.prowessBase = (person.prowessBase || 0) + mod;
      continue;
    }
    if (!(stat in person)) continue;
    const cap = statCap(stat, vampire, person);
    person[stat] = clamp((person[stat] || 0) + mod, 0, cap);
  }
}

/** Grant a trait and apply its stat modifiers once. Hidden record traits skip stat mods. */
export function grantTraitWithEffects(person, traitId) {
  if (!grantTrait(person, traitId)) return false;
  if (!isTraitHidden(traitId)) {
    applyTraitStatModsDelta(person, traitId, 1);
  }
  return true;
}

/** Revoke a trait and reverse its stat modifiers once. */
export function revokeTraitWithEffects(person, traitId, opts = {}) {
  if (!revokeTrait(person, traitId, opts)) return false;
  applyTraitStatModsDelta(person, traitId, -1);
  return true;
}

/** Remap retired innate trait ids on loaded persons. */
export function migrateTraitIds(person) {
  if (!person?.traits?.length) return;
  person.traits = person.traits.map((id) => TRAIT_ID_MIGRATIONS[id] || id);
}

/** Apply all trait stat modifiers (call once after base stats are set). */
export function applyTraitStatMods(person) {
  if (!person || !Array.isArray(person.traits)) return;
  const vampire = !!person.isVampire;
  for (const id of person.traits) {
    const trait = TRAITS_BY_ID[id];
    if (!trait?.statMods || isTraitHidden(id)) continue;
    for (const [stat, delta] of Object.entries(trait.statMods)) {
      if (stat === 'prowessBase') {
        person.prowessBase = (person.prowessBase || 0) + delta;
        continue;
      }
      if (!(stat in person)) continue;
      const cap = statCap(stat, vampire, person);
      person[stat] = clamp((person[stat] || 0) + delta, 0, cap);
    }
  }
}

export function traitPointCost(traitId) {
  const cost = TRAIT_POINT_COST[traitId];
  return cost !== undefined ? cost : 1;
}

/** Format point cost for creation UI (supports ½). */
export function traitPointCostLabel(traitId) {
  const cost = traitPointCost(traitId);
  const abs = Math.abs(cost);
  const unit = abs === 0.5 ? '½ point' : `point${abs === 1 ? '' : 's'}`;
  if (cost > 0) return `Costs ${abs === 0.5 ? '½' : cost} ${unit}`;
  return `Refunds ${abs === 0.5 ? '½' : abs} ${unit}`;
}

export function creationTraitBudgetRemaining(selectedIds) {
  let remaining = CREATION_TRAIT_BUDGET;
  for (const id of selectedIds) {
    remaining -= traitPointCost(id);
  }
  return remaining;
}

/** Innate traits that require another selected trait. */
export function traitsDependingOn(traitId) {
  return INNATE_TRAIT_IDS.filter((id) => TRAITS_BY_ID[id]?.requiresTrait === traitId);
}

export function canToggleCreationTrait(selectedIds, traitId) {
  const idx = selectedIds.indexOf(traitId);
  if (idx >= 0) return true;
  if (!INNATE_TRAIT_IDS.includes(traitId)) return false;
  const trait = TRAITS_BY_ID[traitId];
  if (trait?.requiresTrait && !selectedIds.includes(trait.requiresTrait)) return false;
  return creationTraitBudgetRemaining(selectedIds) >= traitPointCost(traitId);
}

/** After deselecting a trait, remove dependents (e.g. Haunted when Uncanny removed). */
export function pruneDependentCreationTraits(selectedIds, removedId) {
  const dependents = traitsDependingOn(removedId);
  for (const dep of dependents) {
    const i = selectedIds.indexOf(dep);
    if (i >= 0) selectedIds.splice(i, 1);
    pruneDependentCreationTraits(selectedIds, dep);
  }
}

function traitLabelHtml(t) {
  if (t.kind === TRAIT_KIND.HUMOR && t.color) {
    const h = HUMORS[t.id];
    const accent = t.color;
    const labelColor = h?.nameTextColor || '#f5ecd8';
    return `<span class="trait-popup-item-label humor-mark" style="--humor-accent:${accent};--humor-label:${labelColor}">${escapeHtml(t.label)}</span>`;
  }
  return `<div class="trait-popup-item-label">${escapeHtml(t.label)}</div>`;
}

export function countVisibleTraits(person) {
  return (person?.traits || []).filter((id) => {
    const t = TRAITS_BY_ID[id];
    return t && !isTraitHidden(id);
  }).length;
}

export function renderTraitPopupListHtml(person) {
  if (!person?.traits?.length) {
    return '<div class="trait-popup-empty">None</div>';
  }
  return person.traits
    .map((id) => {
      const t = TRAITS_BY_ID[id];
      if (!t || isTraitHidden(id)) return '';
      const cls = t.kind === TRAIT_KIND.EARNED
        ? 'trait-popup-item earned'
        : t.kind === TRAIT_KIND.HUMOR
          ? 'trait-popup-item humor'
          : 'trait-popup-item innate';
      const desc = getTraitDisplayDescription(t, person);
      const taglineHtml = t.kind === TRAIT_KIND.HUMOR && t.tagline
        ? `<div class="trait-popup-item-tagline">${escapeHtml(t.tagline)}</div>`
        : '';
      return `<div class="${cls}">
        ${traitLabelHtml(t)}
        ${taglineHtml}
        ${desc ? `<div class="trait-popup-item-desc">${escapeHtml(desc)}</div>` : ''}
      </div>`;
    })
    .filter(Boolean)
    .join('');
}

export function renderTraitChipsHtml(person) {
  if (!person?.traits?.length) return 'None';
  return person.traits
    .map((id) => {
      const t = TRAITS_BY_ID[id];
      if (!t || isTraitHidden(id)) return '';
      const cls = t.kind === TRAIT_KIND.EARNED
        ? 'trait-chip earned'
        : t.kind === TRAIT_KIND.HUMOR
          ? 'trait-chip humor'
          : 'trait-chip innate';
      const desc = getTraitDisplayDescription(t, person);
      return `<span class="${cls}" title="${escapeHtml(desc || t.label)}">${escapeHtml(t.label)}</span>`;
    })
    .filter(Boolean)
    .join('');
}

export function renderEarnedTraitsHtml(person) {
  const earned = (person?.traits || [])
    .map((id) => TRAITS_BY_ID[id])
    .filter((t) => t && t.kind === TRAIT_KIND.EARNED && !t.hidden);
  if (!earned.length) return '';
  return earned.map((t) => `<span class="trait-chip earned">${escapeHtml(t.label)}</span>`).join('');
}

export {
  CREATION_TRAIT_BUDGET,
  INNATE_TRAIT_IDS,
  INNATE_POSITIVE_IDS,
  INNATE_DRAWBACK_IDS,
  TRAITS_BY_ID,
  TRAIT_KIND,
  HUMOR_IDS,
};
