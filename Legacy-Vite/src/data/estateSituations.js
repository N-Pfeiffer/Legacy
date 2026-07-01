import { clamp } from '../utils/index.js';
import { statCap } from '../utils/statCap.js';
import { G } from '../state/gameState.js';
import { grantPatronMysteriousRelic } from '../sim/itemEffects.js';
import { grantTraitWithEffects } from '../sim/traits.js';
import { incarceratePlayer, isInPrison } from '../sim/prison.js';
import {
  initializeMudlarkFromFind,
  ensureMudlarkState,
  mudlarkDiscoveryEligible,
} from '../sim/mudlarkLockbox.js';
import { effectiveInsight } from '../sim/itemEffects.js';
import { currentProwess } from '../sim/prowess.js';
import { tickRookeriesSituations } from './rookeriesSituations.js';

const PATRON_OFFER_BODY =
  'A pale, wealthy eccentric in a carriage notices you on the street. The window glides down without a sound. ' +
  'They offer you an opportunity: they will reward you handsomely, provided you map out the blind spots in the ' +
  'Constabulary\'s patrol routes and leave the maps under a specific gargoyle once a year. They refuse to name ' +
  'the reward, but insist it will be what you are looking for.';

const LOCKBOX_BODY =
  'While wandering the banks of the river Thames at low tide, you spot a glimmer of cold steel. Upon investigation, ' +
  'you uncover a rusted iron lockbox wrapped in rotted leather. It rattles as you pick it up.';

const PATRON_ARC_YEARS = 10;
const PATRON_SUCCESSES_REQUIRED = 5;
const PATRON_OFFER_CHANCE = 0.035;
const LOCKBOX_FIND_CHANCE = 0.01;
const PATRON_JAIL_YEARS = 2;

const PATRON_MAPPING_NARRATIVE =
  'The thick Thames fog provides ample cover as you trail the night watch through the cobblestone labyrinth of the city. ' +
  'You carefully note the alleys they fear to tread and the blind corners they ignore, sketching a precise map by the dim glow of a tavern window. ' +
  'Nearing midnight, you approach the crumbling parish church and slip the rolled parchment into the hollowed mouth of the designated stone gargoyle.';

const PATRON_CAUGHT_NARRATIVE =
  'A heavy hand closes over your collar just as you finish sketching the patrol route. A pair of watchmen corner you in the alley, the harsh beam of their bullseye lantern blinding you in the dark.\n\n' +
  '"Charting the watch, are we?" the larger one growls, snatching the parchment from your hands. "Planning a bit of midnight burglary, or working for someone who is?" ' +
  'You are violently shoved against the brickwork and dragged toward the gaol.\n\n' +
  'The next morning, sitting in a damp holding cell, a local magistrate offers you a simple choice: give up the identity of your employer, or rot in Newgate.';

const PATRON_COMPLETION_NARRATIVE =
  'The Thames fog is suffocatingly thick tonight as you approach the crumbling parish church for the final time. You slip the rolled parchment into the hollowed mouth of the gargoyle, but before you can turn away, the clatter of heavy carriage wheels echoes through the square.\n\n' +
  'A pristine, black carriage drawn by two unnaturally quiet horses halts just outside the wrought-iron gates. The carriage bears no lanterns and no crest. The door opens, revealing only pitch-black interior. A single, pale hand wearing a pristine white glove extends from the darkness, tossing a small, velvet-wrapped box onto the damp cobblestones.\n\n' +
  'A voice drifts from the carriage—unnaturally smooth, quiet, yet resonating perfectly over the wind.\n\n' +
  '"The architecture of the watch is complete. You have proven yourself uniquely observant of the shadows, and discreet with their secrets. Take your reward gratefully mortal, it is worth more than your life."';

const PATRON_MAGISTRATE_BODY =
  'The magistrate fixes you with a cold stare. Give up the identity of your employer, or rot in Newgate.';

function bumpHealth(player, delta) {
  const cap = statCap('health', !!player.isVampire);
  player.health = clamp((player.health || 0) + delta, 0, cap);
}

function patronYearsRemaining(arc) {
  return Math.max(0, (arc?.endsYear ?? 0) - G.year);
}

function patronProgressLine(player) {
  const arc = player.patronArc;
  const successes = arc?.successes ?? 0;
  const yearsLeft = patronYearsRemaining(arc);
  return `Progress ${successes}/${PATRON_SUCCESSES_REQUIRED} Maps Delivered. ${yearsLeft} Years Remaining.`;
}

function hasSituationLogEntry(player, templateId) {
  return !!player.resolvedSituations?.[templateId];
}

function hasPendingSituation(player, templateId) {
  return (player.situations || []).some((s) => s.templateId === templateId);
}

function ensurePatronArc(player) {
  if (!player.patronArc || typeof player.patronArc !== 'object') {
    player.patronArc = null;
  }
  return player.patronArc;
}

function patronMappingStat(player) {
  const insight = effectiveInsight(player);
  const prowess = currentProwess(player);
  const source = insight >= prowess ? 'Insight' : 'Prowess';
  const value = Math.max(insight, prowess);
  return { value, source };
}

/** Calibrated on the leading stat only: 20 → 45%, 40+ → 75%. */
function patronMapSuccessChance(player) {
  const { value: stat } = patronMappingStat(player);
  if (stat <= 20) return 0.45;
  if (stat >= 40) return 0.75;
  return 0.45 + ((stat - 20) / 20) * (0.75 - 0.45);
}

function patronMapButtonLabel(player) {
  const { source } = patronMappingStat(player);
  const pct = Math.round(patronMapSuccessChance(player) * 100);
  return `Map the Constabulary Routes (${pct}% from ${source})`;
}

function patronAnnualBody(player) {
  const arc = player.patronArc;
  const yearsLeft = patronYearsRemaining(arc);
  const successes = arc?.successes ?? 0;

  return (
    'Another year, another chart of the Constabulary\'s blind spots. The patron expects a map beneath the parish ' +
    'gargoyle before the bargain expires.\n\n' +
    `You have ${yearsLeft} year${yearsLeft === 1 ? '' : 's'} left on the arrangement and have delivered ` +
    `${successes} of ${PATRON_SUCCESSES_REQUIRED} maps.`
  );
}

function resolvePatronAnnualDelivery(player) {
  const arc = ensurePatronArc(player);
  if (!arc?.active) return;

  const successChance = patronMapSuccessChance(player);
  if (Math.random() < successChance) {
    arc.successes += 1;
    arc.lastDeliveryOutcome = 'success';
    if (arc.successes >= PATRON_SUCCESSES_REQUIRED) {
      grantTraitWithEffects(player, 'strange_relic');
      grantPatronMysteriousRelic(player);
      arc.active = false;
      arc.completed = true;
    }
  } else {
    arc.pendingCaught = true;
    arc.lastDeliveryOutcome = 'caught';
  }
}

function patronMapResultBody(player) {
  return patronAnnualLogText(player);
}

function patronMapResultAcquisition(player) {
  return player.patronArc?.completed ? '+ Mysterious Relic' : '';
}

function patronAnnualLogText(player) {
  const arc = player.patronArc;
  if (arc?.lastDeliveryOutcome === 'caught') {
    return `${PATRON_MAPPING_NARRATIVE}\n\n${PATRON_CAUGHT_NARRATIVE}`;
  }
  if (arc?.completed) {
    return PATRON_COMPLETION_NARRATIVE;
  }
  if (arc?.lastDeliveryOutcome === 'success') {
    return `${PATRON_MAPPING_NARRATIVE}\n\n${patronProgressLine(player)}`;
  }
  return PATRON_MAPPING_NARRATIVE;
}

function applyPatronKeepSilence(player) {
  const arc = ensurePatronArc(player);
  if (!arc) return;
  arc.pendingCaught = false;
  incarceratePlayer(player, { years: PATRON_JAIL_YEARS, source: 'patron' });
}

function applyPatronExposeGargoyle(player) {
  const arc = ensurePatronArc(player);
  if (!arc) return;
  arc.active = false;
  arc.failed = true;
  arc.pendingCaught = false;
}

/** Immersive intro popups — fire after Pass the Year; accept routes to the Situations panel. */
export function buildEstateImmersiveEvents() {
  return [
    {
      id: 'peculiar_patron_offer',
      presentation: 'immersive',
      once: true,
      domain: 'estate',
      record: 'milestone',
      logContext: 'London Streets',
      eyebrow: () => String(G.year),
      title: 'The Peculiar Patron',
      steps: [
        {
          id: 'offer',
          body:
            `${PATRON_OFFER_BODY}\n\n` +
            'If you accept, you have ten years to make five successful deliveries. The reward stays unnamed until then.',
          choices: [
            { id: 'accept', label: 'Accept the bargain' },
            { id: 'decline', label: 'Decline and walk away', complete: true },
          ],
        },
      ],
      onComplete(player, ctx, choice) {
        if (choice?.id === 'accept') {
          player.patronArc = {
            active: true,
            startedYear: G.year,
            endsYear: G.year + PATRON_ARC_YEARS,
            successes: 0,
            failed: false,
            completed: false,
            pendingCaught: false,
            jailedUntilYear: null,
          };
          player._estateFollowUp = 'peculiar_patron_annual';
        }
      },
      logText: (player, ctx, choice) => (
        choice?.id === 'accept'
          ? 'You accepted the eccentric\'s bargain. You have ten years to deliver five maps of the Constabulary\'s blind spots beneath the parish gargoyle.'
          : 'You declined the carriage window and its unnamed reward. The eccentric rolls away without another word.'
      ),
    },

    {
      id: 'mudlarks_lockbox_find',
      presentation: 'immersive',
      domain: 'estate',
      // Finding the box is a discovery beat, not a reward → chronicle only.
      record: 'flavor',
      logContext: 'Thames Mudflats',
      eyebrow: () => String(G.year),
      title: 'The Mudlark\'s Lockbox',
      steps: [
        {
          id: 'discovery',
          body: LOCKBOX_BODY,
          choices: [
            { id: 'keep', label: 'Take the lockbox with you' },
            { id: 'leave', label: 'Leave it to the tide', complete: true },
          ],
        },
      ],
      onComplete(player, ctx, choice) {
        if (choice?.id === 'keep') {
          initializeMudlarkFromFind(player);
        } else {
          player.mudlarkLockbox = null;
        }
      },
      logText: (player, ctx, choice) => (
        choice?.id === 'keep'
          ? 'You took the lockbox from the mud. It rests among your assets — open it from Decisions when you are ready.'
          : 'You left the lockbox to the rising tide. Whatever it held is not yours to claim.'
      ),
    },

    {
      id: 'peculiar_patron_map_result',
      presentation: 'immersive',
      domain: 'estate',
      // Each delivery attempt is a minor beat → chronicle only; only the run that
      // completes the bargain (the reward) is worth a permanent Memory.
      record: (player) => (player.patronArc?.completed ? 'milestone' : 'flavor'),
      reward: (player) => patronMapResultAcquisition(player),
      logContext: 'The Peculiar Patron',
      eyebrow: () => String(G.year),
      title: 'Map the Constabulary Routes',
      steps: [
        {
          id: 'result',
          body: (ctx, player) => patronMapResultBody(player),
          acquisition: (ctx, player) => patronMapResultAcquisition(player),
          choices: [{ id: 'continue', label: 'Continue' }],
        },
      ],
      logText: (player) => patronAnnualLogText(player),
    },

    {
      id: 'peculiar_patron_caught',
      presentation: 'immersive',
      domain: 'estate',
      record: 'milestone',
      logContext: 'Newgate',
      eyebrow: () => String(G.year),
      title: 'The Magistrate\'s Choice',
      steps: [
        {
          id: 'decision',
          body: PATRON_MAGISTRATE_BODY,
          choices: [
            { id: 'keep_silence', label: 'Keep your silence. Take the beating and serve the sentence.' },
            { id: 'expose_gargoyle', label: 'Point them to the gargoyle. Expose the drop-point to buy your freedom.' },
          ],
        },
      ],
      onComplete(player, ctx, choice) {
        if (choice?.id === 'keep_silence') {
          applyPatronKeepSilence(player);
        } else if (choice?.id === 'expose_gargoyle') {
          applyPatronExposeGargoyle(player);
        }
      },
      logText: (player, ctx, choice) => (
        choice?.id === 'keep_silence'
          ? 'You kept your silence through the beating and two years of Newgate fever. You lost the map, but the Patron was pleased by your loyalty — the arrangement remained intact upon your release.'
          : 'You pointed the Constabulary to the parish gargoyle and walked free at once. They staked out the church, the Patron vanished, and the bargain was ended forever.'
      ),
    },
  ];
}

/** After an estate popup resolves, queue panel situations or caught follow-ups. */
export function processEstateFollowUp(player, fireSituation) {
  if (!player || typeof fireSituation !== 'function') return;

  if (player._estateFollowUp) {
    const templateId = player._estateFollowUp;
    delete player._estateFollowUp;
    fireSituation(player, templateId);
    return;
  }

  if (player.patronArc?.pendingCaught && !hasPendingSituation(player, 'peculiar_patron_caught')) {
    player.patronArc.pendingCaught = false;
    fireSituation(player, 'peculiar_patron_caught');
  }
}

/** Estate situation templates — player-initiated from the Situations panel.
 *  blocksPassYear: false makes the popup dismissible (back / click outside). */
export function buildEstateSituations() {
  return [
    {
      id: 'peculiar_patron_annual',
      blocksPassYear: false,
      domain: 'estate',
      memory: true,
      logContext: 'The Peculiar Patron',
      title: 'Map the Constabulary Routes',
      body: (player) => patronAnnualBody(player),
      buttons: [
        {
          id: 'map',
          label: (player) => patronMapButtonLabel(player),
          showResultPopup: true,
          apply(player) {
            resolvePatronAnnualDelivery(player);
          },
        },
      ],
    },
  ];
}

/** Roll for estate events at year end — intro popups first; ongoing work lives in the panel. */
export function tickEstateSituations(player, year, fireSituation) {
  if (!player?.isAlive || typeof fireSituation !== 'function') return;

  const arc = ensurePatronArc(player);
  ensureMudlarkState(player);

  if (arc?.active && !arc.failed && !arc.pendingCaught) {
    const inGaol = isInPrison(player);
    if (year > arc.endsYear || arc.successes >= PATRON_SUCCESSES_REQUIRED) {
      arc.active = false;
    } else if (!inGaol && !hasPendingSituation(player, 'peculiar_patron_annual')) {
      fireSituation(player, 'peculiar_patron_annual');
    }
  }

  const hasPendingEstateIntro = (player.situations || []).some((s) => (
    s.templateId === 'peculiar_patron_offer' || s.templateId === 'mudlarks_lockbox_find'
  ));
  if (hasPendingEstateIntro) return;

  if (
    !player.isVampire
    && !arc
    && !hasSituationLogEntry(player, 'peculiar_patron_offer')
    && !hasPendingSituation(player, 'peculiar_patron_offer')
    && player.age >= 16
    && Math.random() < PATRON_OFFER_CHANCE
  ) {
    fireSituation(player, 'peculiar_patron_offer');
    return;
  }

  if (
    mudlarkDiscoveryEligible(player)
    && !hasPendingSituation(player, 'mudlarks_lockbox_find')
    && Math.random() < LOCKBOX_FIND_CHANCE
  ) {
    fireSituation(player, 'mudlarks_lockbox_find');
  }

  tickRookeriesSituations(player, fireSituation);
}
