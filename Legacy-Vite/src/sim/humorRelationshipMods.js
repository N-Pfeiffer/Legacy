import { HUMORS } from '../data/humors.js';
import { getPersonHumorId } from './traits.js';

/**
 * @typedef {'disposition_gain'|'disposition_loss'|'intimacy_gain'|'intimacy_loss'|'enthrallment_gain'|'enthrallment_loss'|'insult'|'natural_decay'} RelationshipDeltaContext
 */

function humorMods(npc) {
  const humorId = getPersonHumorId(npc);
  if (!humorId) return null;
  return HUMORS[humorId]?.personalityMods ?? null;
}

/**
 * Scale a relationship stat change based on the target NPC's humor.
 * @param {{ npc: object|null, stat: 'disposition'|'intimacy'|'enthrallment', rawDelta: number, context?: RelationshipDeltaContext|null }} opts
 */
export function scaleRelationshipDelta({ npc, stat, rawDelta, context = null }) {
  if (!rawDelta || !npc) return rawDelta;

  const mods = humorMods(npc);
  if (!mods) return rawDelta;

  const isGain = rawDelta > 0;
  const isLoss = rawDelta < 0;
  let mult = 1;

  if (stat === 'disposition') {
    if (context === 'insult' && isLoss && mods.insultDispositionLossMult != null) {
      mult = mods.insultDispositionLossMult;
    } else if ((context === 'disposition_gain' || (context === 'natural_decay' && isGain)) && mods.dispositionGainMult != null) {
      mult = mods.dispositionGainMult;
    } else if ((context === 'disposition_loss' || (context === 'natural_decay' && isLoss)) && mods.dispositionLossMult != null) {
      mult = mods.dispositionLossMult;
    }
  } else if (stat === 'intimacy') {
    if ((context === 'intimacy_gain' || (context === 'natural_decay' && isGain)) && mods.intimacyGainMult != null) {
      mult = mods.intimacyGainMult;
    } else if ((context === 'intimacy_loss' || (context === 'natural_decay' && isLoss)) && mods.intimacyLossMult != null) {
      mult = mods.intimacyLossMult;
    }
  } else if (stat === 'enthrallment') {
    if ((context === 'enthrallment_gain' || (context === 'natural_decay' && isGain)) && mods.enthrallmentGainMult != null) {
      mult = mods.enthrallmentGainMult;
    } else if ((context === 'enthrallment_loss' || (context === 'natural_decay' && isLoss)) && mods.enthrallmentLossMult != null) {
      mult = mods.enthrallmentLossMult;
    }
  }

  if (mult === 1) return rawDelta;
  return Math.round(rawDelta * mult);
}

/** Choleric: 25% resistance to intimidation attempts (for future actions). */
export function getIntimidationResist(npc) {
  return humorMods(npc)?.intimidationResist ?? 0;
}

/** Sanguine NPC susceptibility multiplier (Siren / player sanguine hooks). */
export function getSirenSusceptibilityMult(npc) {
  return humorMods(npc)?.sirenSusceptibilityMult ?? 1;
}
