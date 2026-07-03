import { G } from '../state/gameState.js';
import { confiscateHotGoods, resolveTrialDefense, trialEvidenceScore, hasCapitalCharges } from '../sim/crime.js';
import { hasMagistrateTrialSynergy } from '../sim/magistrate.js';
import { getMoney, formatMoney } from '../sim/money.js';
import { effectiveCharisma, effectiveCunning } from '../sim/itemEffects.js';

const WATCH_QUESTIONS_BODY =
  'A constable stops you on the corner of Chancery Lane. He asks your name, your business, ' +
  'and whether you have lately been in the habit of keeping late hours. His notebook is open. ' +
  'He writes slowly, as though every letter costs him something.';

const WATCH_SEARCHES_BODY =
  'There is a pounding at your door before dawn. A constable and two parish watchmen turn out ' +
  'your rooms — the mattress, the cupboard, the loose board by the hearth. They are polite, ' +
  'which is worse than violence. They are looking for something, and they will remember your face.';

const TRIAL_BODY =
  'The Old Bailey smells of vinegar and unwashed wool. The judge does not look at you; ' +
  'the clerk reads the charges in a voice worn smooth by ten thousand repetitions. ' +
  'Twelve men who have never missed a meal will now weigh the worth of your word.';

import {
  backOutOfThievingJob,
  backOutSyndicateFenceJob,
  buildPreCrimeBody,
  resolveThievingJob,
  startThievingJob,
  victimDisplayName,
} from '../sim/thieving.js';
import {
  acceptAssassinContract,
  backOutOfAssassinJob,
  buildAssassinContractBody,
  buildAssassinPreCrimeBody,
  declineAssassinContract,
  resolveAssassinationContract,
} from '../sim/stalking.js';
import { proposeAnnals, ANNALS_PRIORITY } from '../sim/annals.js';

const TRADE_OPENS_BODY =
  'You have seen how it is done, now. The lifted latch, the sleeve that swallows a ' +
  'watch, the crowd that closes like water behind a dip. London has been teaching you ' +
  'all along; the only question left is whether you were taking notes.';

const SYNDICATE_FENCE_BODY =
  'A message reaches you through the usual channels: the syndicate has work that wants doing. ' +
  'Not a favour — a reminder of who holds your fence. Refuse, and the Watch may hear a name it has been wanting.';

/** Crime / Watch situation templates (Phase A + B). */
export function buildCrimeSituations() {
  return [
    {
      id: 'watch_questions',
      autoOpen: true,
      dismissible: false,
      once: false,
      domain: 'particulars',
      record: 'flavor',
      logContext: 'The Watch',
      title: 'Questions in the Street',
      body: WATCH_QUESTIONS_BODY,
      buttons: [
        {
          id: 'answer',
          label: 'Answer plainly and be on your way',
          logText: 'A constable questioned you in the street. You answered plainly and went on your way.',
          apply() {},
        },
      ],
    },

    {
      id: 'watch_searches',
      autoOpen: true,
      dismissible: false,
      domain: 'particulars',
      record: 'flavor',
      logContext: 'Your Lodgings',
      title: 'A Search of Your Rooms',
      body: WATCH_SEARCHES_BODY,
      buttons: [
        {
          id: 'endure',
          label: 'Stand aside and let them search',
          logText: (player) => {
            const seized = !!player._watchSearchSeized;
            delete player._watchSearchSeized;
            return seized
              ? 'Constables searched your rooms and confiscated hot goods they found among your possessions.'
              : 'Constables turned out your rooms and found nothing to seize.';
          },
          apply(player) {
            player._watchSearchSeized = confiscateHotGoods(player);
          },
        },
      ],
    },

    {
      id: 'crime_trial',
      autoOpen: true,
      dismissible: false,
      domain: 'particulars',
      record: 'milestone',
      memoryCategory: 'life',
      logContext: 'Old Bailey',
      title: 'Trial at the Old Bailey',
      body: TRIAL_BODY,
      buttons(player) {
        const evidence = trialEvidenceScore(player);
        const barristerCost = 10 * evidence;
        const quietCost = 15 * evidence;
        const ownBarrister = player.career?.id === 'barrister';
        const canAffordBarrister = ownBarrister || getMoney(player) >= barristerCost;
        const canAffordQuiet = getMoney(player) >= quietCost;
        const quietAvailable = hasMagistrateTrialSynergy(player) && !hasCapitalCharges(player);

        const buttons = [
          {
            id: 'charisma',
            label: `Plead your character (Charisma ${Math.round(effectiveCharisma(player))})`,
            logText: 'You pleaded your character before the court.',
            apply(p) {
              resolveTrialDefense(p, 'charisma');
            },
          },
          {
            id: 'cunning',
            label: `Outwit the prosecution (Cunning ${Math.round(effectiveCunning(player))})`,
            logText: 'You sought to outwit the prosecution at trial.',
            apply(p) {
              resolveTrialDefense(p, 'cunning');
            },
          },
          {
            id: 'barrister',
            label: ownBarrister
              ? 'Conduct your own defense'
              : `Retain a barrister (${formatMoney(barristerCost)})`,
            disabled: !canAffordBarrister,
            logText: ownBarrister
              ? 'You conducted your own defense before the bench.'
              : 'You retained a barrister to speak for you.',
            apply(p) {
              resolveTrialDefense(p, 'barrister');
            },
          },
        ];

        if (quietAvailable) {
          buttons.push({
            id: 'quiet_word',
            label: `A quiet word with an old friend (${formatMoney(quietCost)})`,
            disabled: !canAffordQuiet,
            logText: 'You arranged a quiet word with an old friend before the verdict.',
            apply(p) {
              resolveTrialDefense(p, 'quiet_word');
            },
          });
        }

        return buttons;
      },
    },

    {
      id: 'the_trade_opens',
      autoOpen: true,
      dismissible: false,
      once: true,
      domain: 'particulars',
      record: 'flavor',
      logContext: 'London',
      title: 'The Trade Opens',
      body: TRADE_OPENS_BODY,
      buttons: [
        {
          id: 'ack',
          label: 'So it is',
          logText: 'London had been teaching you the trade all along; you were taking notes.',
          apply() {},
        },
      ],
    },

    {
      id: 'thieving_pre_crime',
      autoOpen: true,
      dismissible: false,
      domain: 'particulars',
      record: 'flavor',
      logContext: (player) => player._pendingThieve?.districtId || 'London',
      title: 'At the Door',
      body: (player) => buildPreCrimeBody(player),
      buttons: [
        {
          id: 'proceed',
          label: 'Proceed',
          logText: (player) => {
            const name = victimDisplayName(player._lastThieveVictimId);
            delete player._lastThieveVictimId;
            return `You went through with the job against ${name}.`;
          },
          apply(player) {
            const pending = player._pendingThieve;
            player._lastThieveVictimId = pending?.victimId;
            const result = resolveThievingJob(player);
            if (result.message) {
              proposeAnnals({
                msg: result.message,
                type: result.type || 'info',
                priority: ANNALS_PRIORITY.FLAVOR,
                category: 'crime',
              });
            }
          },
        },
        {
          id: 'back_out',
          label: 'Back out',
          logText: 'You cased the place but turned away at the last moment.',
          apply(player) {
            backOutOfThievingJob(player);
          },
        },
      ],
    },

    {
      id: 'syndicate_fence_job',
      autoOpen: true,
      dismissible: false,
      domain: 'particulars',
      record: 'flavor',
      logContext: 'The Rookeries',
      title: 'Syndicate Errand',
      body: SYNDICATE_FENCE_BODY,
      buttons: [
        {
          id: 'proceed',
          label: 'Take the work',
          logText: 'You agreed to the syndicate\'s errand.',
          apply(player) {
            const districtId = 'the_rookeries';
            const result = startThievingJob(player, districtId);
            if (result.ok && result.needsReveal) {
              if (!Array.isArray(player._crimeSituationQueue)) player._crimeSituationQueue = [];
              player._crimeSituationQueue.push('thieving_pre_crime');
            }
          },
        },
        {
          id: 'refuse',
          label: 'Refuse',
          logText: 'You refused the syndicate\'s errand.',
          apply(player) {
            backOutSyndicateFenceJob(player);
          },
        },
      ],
    },

    {
      id: 'assassin_contract',
      autoOpen: true,
      dismissible: false,
      domain: 'particulars',
      record: 'flavor',
      logContext: 'The Underworld',
      title: 'A Folded Note',
      body: (player) => buildAssassinContractBody(player),
      buttons: [
        {
          id: 'accept',
          label: 'Accept the contract',
          logText: (player) => {
            const name = victimDisplayName(player._pendingAssassin?.targetId);
            return `You accepted the contract against ${name}.`;
          },
          apply(player) {
            acceptAssassinContract(player);
          },
        },
        {
          id: 'decline',
          label: 'Decline',
          logText: 'You declined the contract.',
          apply(player) {
            declineAssassinContract(player);
          },
        },
      ],
    },

    {
      id: 'assassin_pre_crime',
      autoOpen: true,
      dismissible: false,
      domain: 'particulars',
      record: 'flavor',
      logContext: 'London',
      title: 'The Quiet Knife',
      body: (player) => buildAssassinPreCrimeBody(player),
      buttons: [
        {
          id: 'proceed',
          label: 'Proceed',
          logText: (player) => {
            const name = victimDisplayName(player._lastAssassinTargetId);
            delete player._lastAssassinTargetId;
            return `You went through with the contract against ${name}.`;
          },
          apply(player) {
            const pending = player._pendingAssassin;
            player._lastAssassinTargetId = pending?.targetId;
            const result = resolveAssassinationContract(player);
            if (result.message) {
              proposeAnnals({
                msg: result.message,
                type: result.type || 'info',
                priority: ANNALS_PRIORITY.FLAVOR,
                category: 'crime',
              });
            }
          },
        },
        {
          id: 'back_out',
          label: 'Back out',
          logText: 'You took the fee but turned away at the last moment.',
          apply(player) {
            backOutOfAssassinJob(player);
          },
        },
      ],
    },
  ];
}
