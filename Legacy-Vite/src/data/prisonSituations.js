import {
  applyPrisonDisease,
  applyPrisonTurnkeyCannotPay,
  applyPrisonTurnkeyPay,
  canPayTurnkeyGarnish,
  incarceratePlayer,
  prisonCellLabel,
} from '../sim/prison.js';

const DISEASE_BODY =
  'The suffocating damp of your cell breeds a vicious, unrelenting fever in your blood.\n\n' +
  'The grueling weeks spent shivering in the dark leave your body withered.';

const TURNKEY_BODY =
  'The head Turnkey stops at the bars, rattling his iron keys.\n\n' +
  '"Bedding and board is a shilling a week," he grunts, eyeing your boots. "Otherwise, you sleep on the ' +
  'damp stone with the fever-rats. What\'ll it be?"';

/** Prison year events — auto-open blocking popups during incarceration. */
export function buildPrisonSituations() {
  return [
    {
      id: 'prison_disease',
      autoOpen: true,
      dismissible: false,
      domain: 'particulars',
      record: 'milestone',
      memoryCategory: 'life',
      logContext: (player) => prisonCellLabel(player.prison?.cellType),
      title: 'Prison Fever',
      body: DISEASE_BODY,
      buttons: [
        {
          id: 'endure',
          label: 'Endure the fever',
          logText:
            'The suffocating damp of your cell bred a vicious fever. The grueling weeks in the dark left your body withered.',
          apply(player) {
            applyPrisonDisease(player);
          },
        },
      ],
    },

    {
      id: 'prison_turnkey',
      autoOpen: true,
      dismissible: false,
      domain: 'particulars',
      record: 'milestone',
      memoryCategory: 'life',
      logContext: 'Newgate',
      title: 'Turnkey Extortion',
      body: TURNKEY_BODY,
      buttons: [
        {
          id: 'pay',
          label: 'Pay the garnish and keep your bedding',
          visible: (player) => canPayTurnkeyGarnish(player),
          logText: `You paid the turnkey's garnish and kept your bedding for another year.`,
          apply(player) {
            applyPrisonTurnkeyPay(player);
          },
        },
        {
          id: 'refuse',
          label: 'Cannot pay — sleep on the cold stone',
          visible: (player) => !canPayTurnkeyGarnish(player),
          logText:
            'You could not pay the garnish. You slept on the cold, damp stone while fever-rats scurried nearby.',
          apply(player) {
            applyPrisonTurnkeyCannotPay(player);
          },
        },
      ],
    },

    {
      id: 'prison_sentenced',
      autoOpen: false,
      dismissible: false,
      domain: 'particulars',
      record: 'silent',
      logContext: 'Magistrates',
      title: 'Sentenced to Gaol',
      body:
        'The magistrate\'s gavel falls. Constables seize your arms and march you toward Newgate.\n\n' +
        'Your wealth will decide whether you see a private cell or the common dungeon.',
      buttons: [
        {
          id: 'accept',
          label: 'Accept your sentence',
          logText: 'You accepted the sentence and were marched to gaol.',
          apply(player) {
            incarceratePlayer(player, { years: 2, source: 'general' });
          },
        },
      ],
    },
  ];
}
