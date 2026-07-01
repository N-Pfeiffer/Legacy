import { grantItem, removeItem } from '../sim/personItems.js';
import { clamp } from '../utils/index.js';
import { statCap } from '../utils/statCap.js';
import { G } from '../state/gameState.js';
import {
  ANNALS_PRIORITY,
  proposeAnnals,
} from '../sim/annals.js';
import { grantTrait, hasTrait } from '../sim/traits.js';
import { addGrade } from '../sim/grade.js';
import { EDUCATION_TRACKS, trackLabel, trackShortLabel } from '../data/educationTracks.js';
import { TRACK_TRAIT_IDS } from '../data/traits.js';
import { weightedPick } from '../utils/weightedPick.js';
const BACC_WEALTH_GATE = 50;

function bumpStat(player, stat, delta) {
  const cap = statCap(stat, !!player.isVampire);
  player[stat] = clamp((player[stat] || 0) + delta, 0, cap);
}

function enrollInDegree(player, degree, trackId = null) {
  if (trackId) {
    player.education.track = trackId;
    const traitId = TRACK_TRAIT_IDS[trackId];
    if (traitId) grantTrait(player, traitId);
  }
  player.education.stage = degree.inProgress;
  player.education.since = G.year;
  proposeAnnals({
    msg: `You have enrolled in the ${degree.label}${trackId ? ` (${trackShortLabel(trackId)})` : ''}.`,
    type: 'good',
    priority: ANNALS_PRIORITY.MAJOR,
    category: 'education',
  });
}

/** School + university situation templates.
 *
 * Template fields:
 *   domain     — key into SITUATION_DOMAINS (see sim/situationLog.js)
 *   logContext — optional sub-descriptor for the Situation Log meta row; string or (player) => string
 *   dismissible — optional; when false, the popup cannot be closed without a choice.
 *                 Defaults to true only when blocksPassYear is false (optional estate prompts).
 *   autoOpen    — when true, opens the situation popup automatically (not listed in the panel).
 *
 * Button fields:
 *   id, label, apply — required
 *   logText — immersive Situation Log copy (see sim/situationLog.js); string or (player) => string
 *   requiresTrait, requiresAnyTrait — optional visibility gates
 */
const SECONDARY_ENROLLMENT_BODY =
  'You have outgrown the primer. New halls, stricter masters, and subjects that ask more of you.\n\n' +
  'Where will you lean your attention in the years ahead?';

const SECONDARY_CHOICE_LOG = {
  languages:
    'You threw yourself into languages and rhetoric: Words came easily, and your tongue grew as sharp as your pen.',
  sciences:
    'Figures and natural law absorbed you: The world seemed a puzzle waiting to be solved, and you would not leave it unsolved.',
  arts:
    'You found your voice on stage and page: Applause felt like belonging, and the hall remembered your name.',
};

function applySecondaryEnrollmentChoice(player, choiceId) {
  // Chronicle + Memories are written from the resolution (record: 'milestone'); this
  // only applies the mechanical effects so we don't double-log the same beat.
  if (choiceId === 'languages') {
    if (!player.education.track) player.education.trackPref = 'letters';
    bumpStat(player, 'intelligence', 2);
    bumpStat(player, 'charisma', 1);
  } else if (choiceId === 'sciences') {
    if (!player.education.track) player.education.trackPref = 'natural_philosophy';
    bumpStat(player, 'intelligence', 3);
  } else if (choiceId === 'arts') {
    if (!player.education.track) player.education.trackPref = 'letters';
    bumpStat(player, 'charisma', 3);
  }
  // A studious start to secondary nudges the new tier's grade.
  if (choiceId) addGrade(player, 20);
}

/** Education immersive popups — blocking narrative scenes (not Journal list situations). */
export function buildEducationImmersiveEvents() {
  return [
    {
      id: 'secondary_enrollment',
      presentation: 'immersive',
      once: true,
      domain: 'education',
      record: 'milestone',
      memoryCategory: 'education',
      logContext: 'Secondary School',
      eyebrow: () => String(G.year),
      title: 'Secondary School',
      steps: [
        {
          id: 'enrollment',
          body: SECONDARY_ENROLLMENT_BODY,
          choices: [
            { id: 'languages', label: 'Languages and letters', effects: [{ kind: 'stat', stat: 'intelligence', delta: 2 }, { kind: 'stat', stat: 'charisma', delta: 1 }, { kind: 'grade', delta: 20 }] },
            { id: 'sciences', label: 'Sciences and mathematics', effects: [{ kind: 'stat', stat: 'intelligence', delta: 3 }, { kind: 'grade', delta: 20 }] },
            { id: 'arts', label: 'Arts and performance', effects: [{ kind: 'stat', stat: 'charisma', delta: 3 }, { kind: 'grade', delta: 20 }] },
          ],
        },
      ],
      onComplete(player, ctx, choice) {
        applySecondaryEnrollmentChoice(player, choice?.id);
      },
      logText: (player, ctx, choice) =>
        SECONDARY_CHOICE_LOG[choice?.id] || 'You took your place in the secondary halls.',
    },
    {
      id: 'headmasters_office',
      presentation: 'immersive',
      once: true,
      domain: 'education',
      record: 'milestone',
      memoryCategory: 'education',
      logContext: 'Primary School',
      eyebrow: () => String(G.year),
      title: "The Headmaster's Office",
      steps: [
        {
          id: 'office',
          body:
            'While doing chores, you notice the Headmaster has left the door to his private study ajar. Sitting on his mahogany desk is a Mysterious Relic — a heavy, strangely shaped silver and deep crimson heirloom.\n\n' +
            'Stealing it would be incredibly dangerous. The Headmaster is known for brutal discipline.',
          choices: [
            { id: 'leave', label: 'Leave it be', complete: true },
            {
              id: 'steal',
              label: 'Steal the Relic',
              effects: [
                { kind: 'stat', stat: 'cunning', delta: 3 },
                { kind: 'item', label: 'Mysterious Relic', gained: true },
              ],
            },
          ],
        },
        {
          id: 'inquisition',
          body:
            'Less than five minutes later, the heavy doors of the main hall slam shut. The Headmaster locks the deadbolt and turns to face the assembly.\n\n' +
            '"Which one of you gutter rats took it?" he barks. "Step forward now, or it will be much, much worse for you."\n\n' +
            'He begins a slow march down the central aisle, demanding everyone empty their pockets onto their desks.',
          choices: [
            {
              id: 'confess',
              label: '"I took it, sir."',
              complete: true,
              effects: [
                { kind: 'stat', stat: 'health', delta: -15 },
                { kind: 'item', label: 'Mysterious Relic', gained: false },
              ],
            },
            {
              id: 'silent',
              label: 'Stay silent',
              effects: [{ kind: 'stat', stat: 'cunning', delta: 5 }],
            },
          ],
        },
        {
          id: 'stained',
          body:
            'The Headmaster reaches the front of the room, his fury boiling over into a terrifying calm. "You think you are clever," he seethes. "But the thief was careless. You knocked over my inkwell."\n\n' +
            'He commands everyone to place their hands flat on their desks.\n\n' +
            'Your friend Thomas still has ink on his hands from the morning\'s penmanship lesson. Earlier he bragged about ten copper pieces he found — more than he had seen in his life. The Headmaster is walking down your row, now only three desks away.',
          choices: [
            {
              id: 'confess_boot',
              label: '"Wait! I have it!"',
              complete: true,
              effects: [
                { kind: 'stat', stat: 'health', delta: -30 },
                { kind: 'item', label: 'Mysterious Relic', gained: false },
              ],
            },
            {
              id: 'blame_thomas',
              label: 'Point at Thomas',
              complete: true,
              effects: [{ kind: 'stat', stat: 'cunning', delta: 6 }],
            },
          ],
        },
      ],
      onStepChoice(player, ctx, choice, stepIndex) {
        if (stepIndex === 0) {
          ctx.path = choice.id;
          if (choice.id === 'steal') {
            bumpStat(player, 'cunning', 3);
            grantItem(player, 'mysterious_relic', { silent: true });
            ctx.stoleRelic = true;
          }
          return;
        }
        ctx.path = `${ctx.path}>${choice.id}`;
        if (stepIndex === 1) {
          if (choice.id === 'confess' && ctx.stoleRelic) {
            bumpStat(player, 'health', -15);
            removeItem(player, 'mysterious_relic');
          }
          if (choice.id === 'silent') {
            bumpStat(player, 'cunning', 5);
          }
          return;
        }
        if (stepIndex === 2) {
          if (choice.id === 'confess_boot' && ctx.stoleRelic) {
            bumpStat(player, 'health', -30);
            removeItem(player, 'mysterious_relic');
          }
          if (choice.id === 'blame_thomas') {
            bumpStat(player, 'cunning', 6);
          }
        }
      },
      logText(player, ctx, choice) {
        const path = ctx.path || choice?.id || '';
        if (path === 'leave' || path.startsWith('leave')) {
          return 'You walked away from the open study, the faint hum of the relic fading as you returned to your duties.';
        }
        if (path.includes('confess') && !path.includes('blame')) {
          return 'You surrendered the relic and took the Headmaster\'s punishment — honesty bought you bruises, not mercy.';
        }
        if (path.includes('blame_thomas')) {
          return 'You sat in dead silence as Thomas was dragged away screaming his innocence, the relic still hidden in your boot.';
        }
        if (path.includes('silent')) {
          return 'You kept your face a mask of terror while the Headmaster searched empty pockets, the stolen relic tucked beneath your desk.';
        }
        return 'The Headmaster\'s study taught you how quickly innocence can become a performance.';
      },
    },
  ];
}

export function buildEducationSituations({ EDUCATION_LADDER_BY_ID }) {
  const bacc = EDUCATION_LADDER_BY_ID.baccalaureate;
  const licentiate = EDUCATION_LADDER_BY_ID.licentiate;
  const doctorate = EDUCATION_LADDER_BY_ID.doctorate;
  const universityLogContext = (player) => trackShortLabel(player.education?.track) || 'University';

  return [
    {
      id: 'school_started_primary',
      autoOpen: true,
      domain: 'education',
      record: 'milestone',
      memoryCategory: 'education',
      logContext: 'Primary School',
      title: 'You Begin School',
      body:
        'A new building, smelling of chalk and damp wool. The schoolmaster names each child in turn.\n\n' +
        'You are six years old, and your name is among them. The lessons begin.',
      buttons: [
        {
          id: 'eager',
          label: 'Eager to learn',
          effects: [{ kind: 'stat', stat: 'intelligence', delta: 2 }, { kind: 'grade', delta: 20 }],
          logText:
            'You met the schoolhouse with open hands: Each lesson sharpened your wits, and the masters noticed your hunger to learn.',
          apply: (player) => {
            bumpStat(player, 'intelligence', 2);
            addGrade(player, 20);
          },
        },
        {
          id: 'dragged',
          label: 'Dragged kicking',
          effects: [{ kind: 'stat', stat: 'prowess', delta: 2 }, { kind: 'grade', delta: 5 }],
          logText:
            'You fought the schoolhouse door and lost: The struggle toughened your young body, even if your spirit resisted.',
          apply: (player) => {
            player.prowessBonus = (player.prowessBonus || 0) + 2;
            addGrade(player, 5);
          },
        },
        {
          id: 'reading_ahead',
          label: 'Already reading ahead',
          requiresTrait: 'scholar',
          effects: [{ kind: 'stat', stat: 'intelligence', delta: 4 }, { kind: 'grade', delta: 30 }],
          logText:
            'You arrived already reading ahead: The mundane lessons bored you, but the extra reading honed your mind.',
          apply: (player) => {
            bumpStat(player, 'intelligence', 4);
            addGrade(player, 30);
          },
        },
      ],
    },

    {
      id: 'primary_sharp_wits',
      autoOpen: true,
      domain: 'education',
      record: 'flavor',
      memoryCategory: 'education',
      logContext: 'Primary School',
      title: 'Sharp Eyes in the Yard',
      body:
        'Recess is a parliament of whispers. You notice who trades favors, who bluffs, and who always slips away untouched.\n\n' +
        'You could learn from watching — or keep your head down.',
      buttons: [
        {
          id: 'watch',
          label: 'Study the older boys',
          effects: [{ kind: 'stat', stat: 'cunning', delta: 2 }, { kind: 'grade', delta: 10 }],
          logText:
            'You watched the yard like a hawk: Who lied, who led, and who paid — and you remembered every detail.',
          apply: (player) => {
            bumpStat(player, 'cunning', 2);
            addGrade(player, 10);
          },
        },
        {
          id: 'ignore',
          label: 'Keep your head down',
          logText:
            'You kept to the wall and let the politics pass you by — safer, if less illuminating.',
          apply: () => {},
        },
      ],
    },

    {
      id: 'primary_crossroads',
      autoOpen: true,
      domain: 'education',
      record: 'milestone',
      memoryCategory: 'education',
      logContext: 'Primary School',
      title: 'A Crossroads at School',
      body:
        'You are ten, and the schoolyard has its own laws. The teachers watch from the windows; the children watch each other.\n\n' +
        'Where you stand this year will follow you.',
      buttons: [
        {
          id: 'teachers_pet',
          label: "Become the teacher's pet",
          annalsType: 'good',
          effects: [{ kind: 'stat', stat: 'intelligence', delta: 8 }, { kind: 'grade', delta: 40 }],
          logText:
            'You sat at the front and answered every question: Diligence became your reputation, and the faculty took you under their wing.',
          apply: (player) => {
            bumpStat(player, 'intelligence', 8);
            addGrade(player, 40);
          },
        },
        {
          id: 'playground_king',
          label: 'Rule the playground',
          annalsType: 'good',
          effects: [{ kind: 'stat', stat: 'charisma', delta: 8 }, { kind: 'grade', delta: 10 }],
          logText:
            'You learned to lead with laughter and nerve: The yard moved when you did, and other children looked to you first.',
          apply: (player) => {
            bumpStat(player, 'charisma', 8);
            addGrade(player, 10);
          },
        },
        {
          id: 'skip_class',
          label: 'Skip class whenever you can',
          effects: [
            { kind: 'stat', stat: 'prowess', delta: 5 },
            { kind: 'stat', stat: 'charisma', delta: -3 },
            { kind: 'grade', delta: -20 },
          ],
          logText:
            'Lessons became optional in your mind: You learned other things outdoors, and trouble followed in your wake.',
          apply: (player) => {
            player.prowessBase = (player.prowessBase || 0) + 3;
            player.prowessBonus = (player.prowessBonus || 0) + 2;
            bumpStat(player, 'charisma', -3);
            addGrade(player, -20);
          },
        },
      ],
    },

    {
      id: 'secondary_streetwise',
      autoOpen: true,
      domain: 'education',
      record: 'flavor',
      memoryCategory: 'education',
      logContext: 'Secondary School',
      title: 'A Lesson in the Alley',
      body:
        'After lessons, you cut through the alley behind the dormitory. Two older students are running a quiet racket — forged hall passes for a few coins.\n\n' +
        'They have not noticed you yet.',
      buttons: [
        {
          id: 'learn',
          label: 'Watch and memorize their trick',
          effects: [{ kind: 'stat', stat: 'cunning', delta: 3 }],
          logText:
            'You memorized the forged seal and the lie they told the porter — useful knowledge, if morally grey.',
          apply: (player) => {
            bumpStat(player, 'cunning', 3);
          },
        },
        {
          id: 'report',
          label: 'Report them to a master',
          annalsType: 'good',
          effects: [{ kind: 'stat', stat: 'charisma', delta: 1 }, { kind: 'grade', delta: 15 }],
          logText:
            'You reported the racket and earned a nod of approval — and two new enemies in the dormitory.',
          apply: (player) => {
            bumpStat(player, 'charisma', 1);
            addGrade(player, 15);
          },
        },
      ],
    },

    {
      id: 'university_enrollment',
      domain: 'education',
      logContext: (player) => trackLabel(player.education?.track) || 'University',
      title: 'Choose Your Track',
      body: (player) => {
        const wealth = player.wealth ?? 0;
        const gateNote =
          wealth >= BACC_WEALTH_GATE
            ? 'Your family can bear the fees.'
            : `Wealth ${wealth} — below the usual gate of ${BACC_WEALTH_GATE}. A patron or scholarship may be your only path.`;
        return (
          'The university doors stand open to those with means and merit. Before you enroll, you must declare your field of study.\n\n' +
          gateNote
        );
      },
      buttons: EDUCATION_TRACKS.map((track) => ({
        id: `track_${track.id}`,
        label: track.shortLabel,
        logText: (player) =>
          player.wealth < BACC_WEALTH_GATE
            ? `You wished to study ${track.label}, but the fees remained beyond reach — for now.`
            : `You declared for ${track.label}: The university recorded your name, and the years of study began in earnest.`,
        apply: (player) => {
          if (player.wealth < BACC_WEALTH_GATE) {
            proposeAnnals({
              msg: `You cannot afford enrollment in ${track.label} — not yet.`,
              type: 'bad',
              priority: ANNALS_PRIORITY.LIFE,
            });
            return;
          }
          enrollInDegree(player, bacc, track.id);
        },
      })),
    },

    {
      id: 'university_scholarship',
      domain: 'education',
      logContext: 'University',
      title: 'A Scholarship Offer',
      body:
        'Your merit has been noticed. A benefactor offers to cover your first years at university — if you accept the obligation of study and the scrutiny that comes with charity.',
      buttons: [
        {
          id: 'accept_letters',
          label: 'Accept — Letters & Humanities',
          logText:
            'You accepted the benefactor\'s charity for Letters & Humanities: Pride stung, but the gates of learning opened all the same.',
          apply: (player) => {
            player.wealth = clamp(player.wealth + 15, 0, statCap('wealth', !!player.isVampire));
            enrollInDegree(player, bacc, 'letters');
          },
        },
        {
          id: 'accept_natural',
          label: 'Accept — Natural Philosophy',
          logText:
            'You accepted the benefactor\'s charity for Natural Philosophy: The scrutiny of charity weighed on you, but so did the opportunity.',
          apply: (player) => {
            player.wealth = clamp(player.wealth + 15, 0, statCap('wealth', !!player.isVampire));
            enrollInDegree(player, bacc, 'natural_philosophy');
          },
        },
        {
          id: 'decline',
          label: 'Decline for now',
          logText:
            'You turned the scholarship down: Pride, or prudence — only time would tell whether you had chosen wisely.',
          apply: (player) => {
            player.education.scholarshipDeclined = G.year;
            proposeAnnals({
              msg: 'You turned the offer down. Pride, or prudence — only time will tell.',
              type: 'info',
              priority: ANNALS_PRIORITY.LIFE,
            });
          },
        },
      ],
    },

    {
      id: 'licentiate_enrollment',
      domain: 'education',
      logContext: (player) => trackLabel(player.education?.track) || 'Licentiate',
      title: 'Pursue the Licentiate',
      body: (player) => {
        const track = trackLabel(player.education?.track);
        return (
          `Your Baccalaureate is earned. The faculty invites you to continue toward the Licentiate${track ? ` in the tradition of ${track}` : ''}.\n\n` +
          `Required wealth: ${licentiate.wealthGate}. You have ${player.wealth}.`
        );
      },
      buttons: [
        {
          id: 'confirm',
          label: 'Begin Licentiate',
          logText: (player) =>
            player.wealth < licentiate.wealthGate
              ? 'You wished to pursue the Licentiate, but your purse could not bear the cost.'
              : 'You accepted the faculty\'s invitation: The Licentiate years began, and your name was entered in the college rolls.',
          apply: (player) => {
            if (player.wealth < licentiate.wealthGate) {
              proposeAnnals({
                msg: 'You lack the means to continue your studies.',
                type: 'bad',
                priority: ANNALS_PRIORITY.LIFE,
              });
              return;
            }
            enrollInDegree(player, licentiate);
          },
        },
        {
          id: 'wait',
          label: 'Not yet',
          logText:
            'You deferred the Licentiate: The academy would wait — for a time — and you would return when you were ready.',
          apply: (player) => {
            proposeAnnals({
              msg: 'You deferred the Licentiate. The academy will wait — for a time.',
              type: 'info',
              priority: ANNALS_PRIORITY.LIFE,
            });
          },
        },
      ],
    },

    {
      id: 'doctorate_enrollment',
      domain: 'education',
      logContext: (player) => trackLabel(player.education?.track) || 'Doctorate',
      title: 'Pursue the Doctorate',
      body: (player) => {
        const track = trackLabel(player.education?.track);
        return (
          `The highest title awaits: Doctorate${track ? ` in ${track}` : ''}. Two more years of thesis, examination, and faculty judgment.\n\n` +
          `Required wealth: ${doctorate.wealthGate}. You have ${player.wealth}.`
        );
      },
      buttons: [
        {
          id: 'confirm',
          label: 'Begin Doctorate',
          logText: (player) =>
            player.wealth < doctorate.wealthGate
              ? 'You wished to pursue the Doctorate, but the final ascent demanded coin you did not have.'
              : 'You accepted the highest challenge: Thesis, examination, and faculty judgment — the Doctorate had begun.',
          apply: (player) => {
            if (player.wealth < doctorate.wealthGate) {
              proposeAnnals({
                msg: 'You lack the means to pursue the Doctorate.',
                type: 'bad',
                priority: ANNALS_PRIORITY.LIFE,
              });
              return;
            }
            enrollInDegree(player, doctorate);
          },
        },
        {
          id: 'wait',
          label: 'Not yet',
          logText:
            'You chose to pause before the final ascent: The thesis could wait, and so could the title.',
          apply: (player) => {
            proposeAnnals({
              msg: 'You chose to pause before the final ascent. The thesis can wait.',
              type: 'info',
              priority: ANNALS_PRIORITY.LIFE,
            });
          },
        },
      ],
    },

    // ── Yearly university situations ──
    {
      id: 'univ_debate_society',
      domain: 'education',
      record: 'flavor',
      logContext: universityLogContext,
      title: 'Debate Society',
      body: (player) =>
        `The ${trackShortLabel(player.education?.track) || 'university'} debating hall fills with sharp voices. ` +
        'An argument is forming — and someone expects you to take a side.',
      buttons: [
        {
          id: 'speak',
          label: 'Take the floor',
          annalsType: 'good',
          logText:
            'You took the floor in debate: Reason and presence carried the day, and the hall remembered who spoke last.',
          apply: (player) => {
            bumpStat(player, 'charisma', 2);
            bumpStat(player, 'intelligence', 1);
          },
        },
        {
          id: 'listen',
          label: 'Listen and learn',
          logText:
            'You held your tongue and watched the masters of argument: Their methods became yours by careful observation.',
          apply: (player) => {
            bumpStat(player, 'intelligence', 2);
          },
        },
      ],
    },

    {
      id: 'univ_lab_accident',
      domain: 'education',
      record: 'flavor',
      logContext: universityLogContext,
      title: 'An Accident in the Laboratory',
      body: 'Glass shatters; someone cries out. In the scramble, you must decide whether to help, flee, or exploit the chaos.',
      buttons: [
        {
          id: 'help',
          label: 'Help the injured',
          annalsType: 'good',
          logText:
            'When glass shattered and someone cried out, you stayed: You staunched the wound and earned quiet gratitude.',
          apply: (player) => {
            bumpStat(player, 'insight', 1);
            bumpStat(player, 'charisma', 1);
          },
        },
        {
          id: 'flee',
          label: 'Slip away unnoticed',
          logText:
            'You slipped away before blame could settle: Cowardice, or survival — the laboratory would not say which.',
          apply: () => {},
        },
        {
          id: 'gutter_shortcut',
          label: 'Lift what you can and run',
          requiresTrait: 'gutter_born',
          annalsType: 'bad',
          logText:
            'In the confusion you pocketed what you could and ran: Old habits die hard, and reagents spend like coin.',
          apply: (player) => {
            player.wealth = clamp(player.wealth + 5, 0, statCap('wealth', !!player.isVampire));
          },
        },
      ],
    },

    {
      id: 'univ_thesis_crisis',
      domain: 'education',
      record: 'flavor',
      logContext: universityLogContext,
      title: 'Thesis Crisis',
      body: 'Your work has stalled. The faculty grows impatient; your own doubts grow louder.',
      buttons: [
        {
          id: 'grind',
          label: 'Lock yourself in and write',
          annalsType: 'good',
          logText:
            'You locked yourself in with ink and doubt: Exhaustion took its toll, but the stalled chapter finally turned.',
          apply: (player) => {
            bumpStat(player, 'intelligence', 3);
            player.health = clamp(player.health - 5, 0, statCap('health', !!player.isVampire));
          },
        },
        {
          id: 'collaborate',
          label: 'Seek a collaborator',
          annalsType: 'good',
          logText:
            'You sought a fellow student\'s counsel: Together you untangled what neither could solve alone.',
          apply: (player) => {
            bumpStat(player, 'intelligence', 2);
            bumpStat(player, 'charisma', 1);
          },
        },
      ],
    },

    {
      id: 'univ_patron_offer',
      domain: 'education',
      record: 'flavor',
      logContext: universityLogContext,
      title: 'A Patron Offers Funding',
      body: 'A wealthy benefactor seeks a bright student to advise on matters of learning — and perhaps loyalty.',
      buttons: [
        {
          id: 'accept',
          label: 'Accept patronage',
          logText:
            'You accepted a patron\'s coin: The fees eased, but another\'s interests now sat beside your own.',
          apply: (player) => {
            player.wealth = clamp(player.wealth + 8, 0, statCap('wealth', !!player.isVampire));
            bumpStat(player, 'charisma', 1);
          },
        },
        {
          id: 'refuse',
          label: 'Refuse politely',
          logText:
            'You declined the patron\'s strings with courtesy: Independence had its cost, but your conscience stayed your own.',
          apply: (player) => {
            bumpStat(player, 'charisma', 1);
          },
        },
      ],
    },

    {
      id: 'univ_academia_seminar',
      domain: 'education',
      record: 'flavor',
      logContext: universityLogContext,
      title: 'Advanced Seminar',
      body: 'A closed seminar admits only the most prepared students. The text is dense; the master expects answers.',
      buttons: [
        {
          id: 'excel',
          label: 'Answer every challenge',
          requiresTrait: 'scholar',
          annalsType: 'good',
          logText:
            'You met every challenge in the closed seminar: The master\'s nod of approval was rare, and you earned it.',
          apply: (player) => {
            bumpStat(player, 'intelligence', 4);
          },
        },
        {
          id: 'struggle',
          label: 'Struggle through',
          logText:
            'You survived the seminar bruised but wiser: The text had been dense, and you had not pretended otherwise.',
          apply: (player) => {
            bumpStat(player, 'intelligence', 1);
          },
        },
      ],
    },

    {
      id: 'univ_tuition_strain',
      domain: 'education',
      record: 'flavor',
      logContext: universityLogContext,
      title: 'Tuition Strain',
      body: 'Fees come due. Your purse is lighter than your ambition.',
      buttons: [
        {
          id: 'pay',
          label: 'Pay from your own funds',
          logText:
            'You paid the term fees from your own purse: Thin meals followed, but you remained enrolled.',
          apply: (player) => {
            player.wealth = clamp(player.wealth - 3, 0, statCap('wealth', !!player.isVampire));
          },
        },
        {
          id: 'borrow',
          label: 'Borrow from family',
          logText:
            'You borrowed from family to meet the fees: The coin kept you at your books — and indebted in other ways.',
          apply: (player) => {
            player.wealth = clamp(player.wealth - 1, 0, statCap('wealth', !!player.isVampire));
          },
        },
      ],
    },
  ];
}

/** Pool of yearly academic situations keyed by track affinity. */
const UNIVERSITY_YEARLY_POOL = [
  { id: 'univ_debate_society', weight: 12 },
  { id: 'univ_lab_accident', weight: 8, tracks: ['medicine', 'natural_philosophy'] },
  { id: 'univ_thesis_crisis', weight: 10, minStage: 'licentiate_in_progress' },
  { id: 'univ_patron_offer', weight: 8 },
  { id: 'univ_academia_seminar', weight: 6 },
  { id: 'univ_tuition_strain', weight: 10 },
];

export function pickUniversitySituation(player, inProgressStage) {
  const track = player.education?.track;
  const eligible = UNIVERSITY_YEARLY_POOL.filter((entry) => {
    if (entry.tracks && track && !entry.tracks.includes(track)) return false;
    if (entry.minStage === 'licentiate_in_progress') {
      const licentiateStages = new Set([
        'licentiate_in_progress',
        'doctorate_in_progress',
      ]);
      if (!licentiateStages.has(inProgressStage)) return false;
    }
    return true;
  });
  if (!eligible.length) return null;
  return weightedPick(eligible).id;
}

export function shouldOfferScholarship(player) {
  if (player.education?.stage !== 'completed') return false;
  if (player.wealth >= BACC_WEALTH_GATE) return false;
  if (player.education?.scholarshipDeclined === G.year) return false;
  if (player.education?.scholarshipOffered) return false;
  const merit =
    hasTrait(player, 'scholar') ||
    (player.intelligence ?? 0) >= 55;
  return merit;
}

export function buildFocusPanelHtml(player, { EDUCATION_LADDER_BY_ID, HIGHER_ED_IN_PROGRESS_STAGES }) {
  const ed = player.education || {};
  if (!HIGHER_ED_IN_PROGRESS_STAGES.has(ed.stage)) {
    return '';
  }

  const tier = Object.values(EDUCATION_LADDER_BY_ID).find((d) => d.inProgress === ed.stage);
  const yearsIn = ed.since != null ? Math.max(0, G.year - ed.since) : 0;
  const track = trackLabel(ed.track);
  const duration = tier?.duration ?? 1;
  const progress = Math.min(100, Math.round((yearsIn / duration) * 100));

  const blurbs = {
    baccalaureate_in_progress:
      'Lectures by day, texts by night. You are laying the foundation of an educated life.',
    licentiate_in_progress:
      'The arguments grow finer; the faculty knows your name. Mastery is within reach.',
    doctorate_in_progress:
      'The thesis weighs on every hour. One final ascent separates you from the title.',
  };

  return `<div class="career-page">
    <div class="career-page-title">Academic Focus</div>
    <div class="career-detail-headline">
      <div class="career-detail-rank">${escapeHtml(tier?.label ?? 'Higher Education')}</div>
      ${track ? `<div class="career-detail-since">${escapeHtml(track)}</div>` : ''}
    </div>
    <div class="edu-progress-wrap">
      <div class="edu-progress-bar"><div class="edu-progress-fill" style="width:${progress}%"></div></div>
      <div class="edu-progress-label">Year ${yearsIn + 1} of ${duration}</div>
    </div>
    <div class="career-page-subtitle">${escapeHtml(blurbs[ed.stage] || 'Your studies demand the better part of your days.')}</div>
    <div class="career-page-subtitle" style="margin-top:12px;">
      This year's academic life will surface as Situations in your Journal when something needs your attention.
    </div>
  </div>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
