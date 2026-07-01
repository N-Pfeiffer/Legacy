import { clamp } from '../utils/index.js';
import { statCap } from '../utils/statCap.js';
import { hasTrait } from '../sim/traits.js';
import { hasItem, consumeSingleUseItem } from '../sim/playerItems.js';
import { currentProwess } from '../sim/prowess.js';
import { isInPrison } from '../sim/prison.js';

export const ROOKERIES_MIN_AGE = 10;
export const SYNDICATE_COLLECT_CHANCE = 0.10;
export const SYNDICATE_PROWESS_THRESHOLD = 48;

const SYNDICATE_SEARCHES_BODY =
  'The rookeries have a long memory and a far reach. The crime syndicate you crossed has not forgiven your debt. ' +
  'Enforcers keep one eye out for you, and so do the bounty hunters after the small sum on your head.';

const SYNDICATE_COLLECTS_BODY =
  'You hear the heavy, scraping scuff of boots behind you before you see them. Three men have silently blocked the narrow exit of the alley, ' +
  'cutting off your route to the main thoroughfare. There are no dramatic threats. One of them, reeking of stale gin and wet wool, ' +
  'simply taps a lead-weighted leather sap against his palm while the others fan out into the shadows. The syndicate has found you, and your debt is due.';

function hasPendingSituation(player, templateId) {
  return (player.situations || []).some((s) => s.templateId === templateId);
}

function bumpHealth(player, delta) {
  const cap = statCap('health', !!player.isVampire);
  player.health = clamp((player.health || 0) + delta, 0, cap);
}

function bumpWealth(player, delta) {
  const cap = statCap('wealth', !!player.isVampire);
  player.wealth = clamp((player.wealth || 0) + delta, 0, cap);
}

function rollProwessCheck(player, threshold = SYNDICATE_PROWESS_THRESHOLD) {
  const roll = Math.floor(Math.random() * 20) + 1;
  return currentProwess(player) + roll >= threshold;
}

export function rookeriesEligible(player) {
  if (!player?.isAlive) return false;
  if (!hasTrait(player, 'marked_by_rookeries')) return false;
  return (player.age || 0) >= ROOKERIES_MIN_AGE;
}

function applySyndicateFight(player) {
  if (rollProwessCheck(player)) {
    bumpHealth(player, -5);
    player._rookeriesLastFightLog =
      'You left them bleeding and groaning on the wet stones, but not without taking a few blows yourself.';
  } else {
    bumpHealth(player, -25);
    bumpWealth(player, -10);
    player._rookeriesLastFightLog =
      'A heavy blow from a sap caught the back of your skull. You woke hours later, freezing, bruised, and with your pockets turned inside out.';
  }
}

/** Panel + auto-open situation templates for Marked by the Rookeries. */
export function buildRookeriesSituations() {
  return [
    {
      id: 'syndicate_searches',
      blocksPassYear: false,
      domain: 'estate',
      logContext: 'The Rookeries',
      title: 'The Syndicate Searches',
      body: SYNDICATE_SEARCHES_BODY,
      buttons: [],
    },

    {
      id: 'syndicate_collects',
      autoOpen: true,
      dismissible: false,
      domain: 'estate',
      record: 'flavor',
      logContext: 'The Rookeries',
      title: 'The Syndicate Collects',
      body: SYNDICATE_COLLECTS_BODY,
      buttons: [
        {
          id: 'fight',
          label: 'Fight like a cornered rat (Prowess)',
          annalsType: 'bad',
          logText: (player) => {
            const text = player._rookeriesLastFightLog;
            delete player._rookeriesLastFightLog;
            return text || 'You fought the syndicate\'s collectors in the alley.';
          },
          apply(player) {
            applySyndicateFight(player);
          },
        },
        {
          id: 'flintlock',
          label: 'Fire a warning shot (Single Shot Flintlock)',
          visible: (player) => hasItem(player, 'single_shot_flintlock'),
          logText:
            'You drew your flintlock and pulled the trigger. The deafening, sulfurous roar echoed off the brick walls. ' +
            'The weapon is ruined, but the gunshot sent the thugs scrambling into the shadows.',
          apply(player) {
            consumeSingleUseItem(player, 'single_shot_flintlock');
          },
        },
        {
          id: 'yield',
          label: 'Take the beating',
          annalsType: 'bad',
          logText:
            'You dropped to the wet cobblestones and covered your head while their boots and lead saps took their toll.',
          apply(player) {
            bumpHealth(player, -30);
            bumpWealth(player, -10);
          },
        },
      ],
    },
  ];
}

/** Year-end rolls for rookeries trait: ongoing search + 10% collect ambush. */
export function tickRookeriesSituations(player, fireSituation) {
  if (!player?.isAlive || typeof fireSituation !== 'function') return;
  if (!rookeriesEligible(player) || isInPrison(player)) return;

  if (!hasPendingSituation(player, 'syndicate_searches')) {
    fireSituation(player, 'syndicate_searches');
  }

  if (
    !hasPendingSituation(player, 'syndicate_collects')
    && Math.random() < SYNDICATE_COLLECT_CHANCE
  ) {
    fireSituation(player, 'syndicate_collects');
  }
}
