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
import { weightedPick } from '../utils/weightedPick.js';
import { addMoney } from '../sim/money.js';
import {
  UNIVERSITIES,
  DEGREES,
  DEGREES_BY_ID,
  CLASS_LOADS,
  CLASS_LOADS_BY_ID,
} from './education.js';
import {
  enrollUniversity,
  declineUniversityOffer,
  generateUniversityPatron,
  setUniversityDegree,
  degreesForSchool,
  applyClassLoad,
  classLoadAffordable,
  classLoadCostLine,
  needsFatherDeathNotice,
  markFatherDeathNoticed,
  tuitionForLoad,
  isFreeRide,
} from '../sim/university.js';
import { canSpendActionPoints, spendActionPoints } from '../sim/actionPoints.js';
import { getMoney, formatMoney } from '../sim/money.js';
import { bumpDisposition } from '../sim/relationships.js';

function bumpStat(player, stat, delta) {
  const cap = statCap(stat, !!player.isVampire, stat === 'health' ? player : null);
  player[stat] = clamp((player[stat] || 0) + delta, 0, cap);
}

const FATHER_DEATH_NOTICE =
  "Your father's death has ended more than his life: the bursar's letters now come addressed to you.";

const MELANCHOLIC_ACCEPT_BODY_M =
  'He introduces himself after a public lecture — an older gentleman in scholar\'s black, ' +
  'studying you the way an anatomist studies a specimen he suspects of being rare. He says ' +
  'he has watched you; that he recognizes the particular gravity that sits behind your eyes, ' +
  'for it sits behind his own. Great minds, he says, are seldom happy ones, and unhappy minds ' +
  'left idle devour themselves. He is a professor, and a man of some quiet means. He will stand ' +
  'as your patron — fees, books, and lodging — and asks only that you do not waste.';

const MELANCHOLIC_ACCEPT_BODY_F =
  'He introduces himself after a public lecture — an older gentleman in scholar\'s black, ' +
  'studying you the way an anatomist studies a specimen he suspects of being rare. He says ' +
  'he has watched you; that he recognizes the particular gravity that sits behind your eyes, ' +
  'for it sits behind his own. Great minds, he says, are seldom happy ones, and unhappy minds ' +
  'left idle devour themselves. He is a professor, and a man of some quiet means. He will stand ' +
  'as your patron at the new college on Gower Street, which cares less than most who a mind belongs to.';

function matriculateWithPatron(player, school) {
  const patron = generateUniversityPatron(player);
  enrollUniversity(player, {
    school,
    fatherFunded: false,
    sponsorship: { patronId: patron.id, disappointments: 0, active: true },
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
    bumpStat(player, 'charisma', 2);
    player.prowessBonus = (player.prowessBonus || 0) + 1;
  }
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
            { id: 'languages', label: 'Languages and letters', effects: [{ kind: 'stat', stat: 'intelligence', delta: 2 }, { kind: 'stat', stat: 'charisma', delta: 1 }] },
            { id: 'sciences', label: 'Sciences and mathematics', effects: [{ kind: 'stat', stat: 'intelligence', delta: 3 }] },
            { id: 'arts', label: 'Arts and performance', effects: [{ kind: 'stat', stat: 'charisma', delta: 2 }, { kind: 'stat', stat: 'prowess', delta: 1 }] },
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
          bodyHtml: true,
          body:
            'While doing chores, you notice the Headmaster has left the door to his private study ajar. Sitting on his mahogany desk is a <a class="log-item-link" href="#" data-immersive-item-link="mysterious_relic">Mysterious Relic</a> — a heavy, strangely shaped silver and deep crimson heirloom.\n\n' +
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

    {
      id: 'univ_accept_melancholic',
      presentation: 'immersive',
      once: true,
      domain: 'education',
      record: 'milestone',
      memoryCategory: 'education',
      logContext: 'University',
      eyebrow: () => String(G.year),
      title: 'A Peculiar Kindness',
      steps: [
        {
          id: 'offer',
          body: (player) => (player.sex === 'F' ? MELANCHOLIC_ACCEPT_BODY_F : MELANCHOLIC_ACCEPT_BODY_M),
          choices: (player) => {
            const choices = [];
            if (player.sex === 'M') {
              choices.push({ id: 'oxford', label: 'Accept — read at Oxford [Patron pays]' });
            }
            choices.push({ id: 'ucl', label: 'Accept — enrol at University College London [Patron pays]' });
            choices.push({ id: 'decline', label: 'Refuse his charity', complete: true });
            return choices;
          },
        },
      ],
      onComplete(player, ctx, choice) {
        if (choice?.id === 'oxford') matriculateWithPatron(player, 'oxford');
        else if (choice?.id === 'ucl') matriculateWithPatron(player, 'ucl');
        else declineUniversityOffer(player);
      },
      logText: (player, ctx, choice) => {
        if (choice?.id === 'decline') return 'You refused the professor\'s charity — for now, the university doors remain shut.';
        const school = choice?.id === 'oxford' ? 'Oxford' : 'University College London';
        return `You accepted your patron's support and matriculated at ${school}.`;
      },
    },

    {
      id: 'univ_accept_letters',
      presentation: 'immersive',
      once: true,
      domain: 'education',
      record: 'milestone',
      memoryCategory: 'education',
      logContext: 'University',
      eyebrow: () => String(G.year),
      title: 'Letters of Acceptance',
      steps: [
        {
          id: 'letters',
          body:
            'Two letters arrive at the house in the same week. The first bears the arms of the ' +
            'University of Oxford — heavy cream paper, a seal pressed deep as a thumbprint. You are ' +
            'invited to matriculate among the sons of gentlemen. Your father reads it twice, says ' +
            'nothing, and instructs that his good claret be brought up from the cellar. He will pay ' +
            'your way, he announces, so long as there is breath in him — no son of his shall want ' +
            'for Latin. The second letter is thinner, from the new college on Gower Street, where a ' +
            'man may study the sciences without swearing to any articles of faith. It promises no ' +
            'dinners in hall — only lectures, at forty pounds the year. Your father sets it face ' +
            'down on the table. If it is Gower Street you want, it is your own purse that shall bleed for it.',
          choices: [
            { id: 'oxford', label: 'Matriculate at Oxford [Father pays]' },
            { id: 'ucl', label: 'Enrol at University College London [£40 a year, your own purse]' },
            { id: 'decline', label: 'Decline them both', complete: true },
          ],
        },
      ],
      onComplete(player, ctx, choice) {
        if (choice?.id === 'oxford') enrollUniversity(player, { school: 'oxford', fatherFunded: true });
        else if (choice?.id === 'ucl') enrollUniversity(player, { school: 'ucl', fatherFunded: false });
        else declineUniversityOffer(player);
      },
      logText: (player, ctx, choice) => {
        if (choice?.id === 'decline') return 'You set both letters aside — the university could wait.';
        if (choice?.id === 'oxford') return 'You matriculated at Oxford on your father\'s purse.';
        return 'You enrolled at University College London — Gower Street, at your own expense.';
      },
    },

    {
      id: 'univ_accept_gower_street',
      presentation: 'immersive',
      once: true,
      domain: 'education',
      record: 'milestone',
      memoryCategory: 'education',
      logContext: 'University',
      eyebrow: () => String(G.year),
      title: 'A Letter from Gower Street',
      steps: [
        {
          id: 'letter',
          body:
            'A single letter finds you, postage paid in smudged pence rather than a gentleman\'s ' +
            'frank. University College London — the godless institution on Gower Street — will have ' +
            'you. They care nothing for your pedigree, your parish, or your professed faith; they ' +
            'care that the fees are met by Michaelmas. Forty pounds the year for a full course of ' +
            'lectures, less for fewer. It is not Oxford. But the men who built the railways, and the ' +
            'men who will build whatever comes after, are sitting in those lecture rooms — and there ' +
            'is a seat among them with your name upon it, if you can pay for it.',
          choices: [
            { id: 'ucl', label: 'Enrol at University College London' },
            { id: 'decline', label: 'Decline — the fees must wait', complete: true },
          ],
        },
      ],
      onComplete(player, ctx, choice) {
        if (choice?.id === 'ucl') enrollUniversity(player, { school: 'ucl', fatherFunded: false });
        else declineUniversityOffer(player);
      },
      logText: (player, ctx, choice) => {
        if (choice?.id === 'decline') return 'You folded the letter away — the fees must wait.';
        return 'You enrolled at University College London on Gower Street.';
      },
    },
  ];
}

export function buildEducationSituations() {
  const universityLogContext = () => 'University';

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
          effects: [{ kind: 'stat', stat: 'intelligence', delta: 2 }, { kind: 'grade', delta: 10 }],
          logText:
            'You met the schoolhouse with open hands: Each lesson sharpened your wits, and the masters noticed your hunger to learn.',
          apply: (player) => {
            bumpStat(player, 'intelligence', 2);
            addGrade(player, 10);
          },
        },
        {
          id: 'dragged',
          label: 'Dragged kicking',
          effects: [{ kind: 'stat', stat: 'prowess', delta: 4 }],
          logText:
            'You fought the schoolhouse door and lost: The struggle toughened your young body, even if your spirit resisted.',
          apply: (player) => {
            player.prowessBonus = (player.prowessBonus || 0) + 4;
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
          effects: [{ kind: 'stat', stat: 'cunning', delta: 2 }],
          logText:
            'You watched the yard like a hawk: Who lied, who led, and who paid — and you remembered every detail.',
          apply: (player) => {
            bumpStat(player, 'cunning', 2);
          },
        },
        {
          id: 'ignore',
          label: 'Keep your head down',
          effects: [{ kind: 'stat', stat: 'intelligence', delta: 2 }],
          logText:
            'You kept to the wall and let the politics pass you by — safer, if less illuminating.',
          apply: (player) => {
            bumpStat(player, 'intelligence', 2);
          },
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
          effects: [{ kind: 'stat', stat: 'intelligence', delta: 2 }, { kind: 'grade', delta: 40 }],
          logText:
            'You sat at the front and answered every question: Diligence became your reputation, and the faculty took you under their wing.',
          apply: (player) => {
            bumpStat(player, 'intelligence', 2);
            addGrade(player, 40);
          },
        },
        {
          id: 'playground_king',
          label: 'Rule the playground',
          annalsType: 'good',
          effects: [{ kind: 'stat', stat: 'prowess', delta: 4 }],
          logText:
            'You learned to lead with laughter and nerve: The yard moved when you did, and other children looked to you first.',
          apply: (player) => {
            player.prowessBonus = (player.prowessBonus || 0) + 4;
          },
        },
        {
          id: 'skip_class',
          label: 'Skip class whenever you can',
          effects: [
            { kind: 'stat', stat: 'charisma', delta: 6 },
            { kind: 'grade', delta: -30 },
          ],
          logText:
            'Lessons became optional in your mind: You learned other things outdoors, and trouble followed in your wake.',
          apply: (player) => {
            bumpStat(player, 'charisma', 6);
            addGrade(player, -30);
          },
        },
      ],
    },

    {
      id: 'univ_degree_choice',
      autoOpen: true,
      domain: 'education',
      record: 'milestone',
      memoryCategory: 'education',
      logContext: 'University',
      title: 'Choose Your Degree',
      body: (player) => {
        const school = player.education?.university?.school;
        const schoolLabel = UNIVERSITIES[school]?.label ?? 'the university';
        return `You have matriculated at ${schoolLabel}. Declare the field in which you shall labour — the choice shapes your title, not the breadth of your learning.`;
      },
      buttons: (player) => {
        const school = player.education?.university?.school;
        return degreesForSchool(school).map((deg) => ({
          id: `degree_${deg.id}`,
          label: `${deg.label} (${deg.progressCost} progress)`,
          logText: `You declared for ${deg.label}.`,
          apply: (p) => setUniversityDegree(p, deg.id),
        }));
      },
    },

    {
      id: 'univ_class_load',
      autoOpen: true,
      domain: 'education',
      record: 'flavor',
      memoryCategory: 'education',
      logContext: 'University',
      title: 'This Year\'s Classes',
      body: (player) => {
        const lines = [];
        if (needsFatherDeathNotice(player)) {
          lines.push(FATHER_DEATH_NOTICE);
          markFatherDeathNoticed(player);
        }
        const school = UNIVERSITIES[player.education?.university?.school]?.label ?? 'university';
        lines.push(
          `Another year at ${school}. Choose how much of yourself you shall give to lectures this term — each load costs tuition and time.`
        );
        return lines.join('\n\n');
      },
      buttons: (player) => CLASS_LOADS.map((load) => {
        const affordable = classLoadAffordable(player, load);
        const costLine = classLoadCostLine(player, load);
        return {
          id: `load_${load.id}`,
          label: `${load.label} (${costLine})`,
          disabled: load.id !== 'skip' && !affordable,
          logText: load.id === 'skip'
            ? 'You did not attend classes this year — your purse and your hours were spared.'
            : `You chose ${load.label.toLowerCase()} this year.`,
          apply: (p) => {
            const result = applyClassLoad(p, load.id);
            if (result?.reason === 'money') {
              proposeAnnals({ msg: 'You cannot afford that course load.', type: 'bad', priority: ANNALS_PRIORITY.LIFE });
            } else if (result?.reason === 'ap') {
              proposeAnnals({ msg: 'You lack the hours for that course load.', type: 'bad', priority: ANNALS_PRIORITY.LIFE });
            }
          },
        };
      }),
    },

    // ── Yearly university situations ──
    {
      id: 'univ_debate_society',
      domain: 'education',
      record: 'flavor',
      logContext: universityLogContext,
      title: 'Debate Society',
      body: 'The debating hall fills with sharp voices. An argument is forming — and someone expects you to take a side.',
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
            addMoney(player, 5);
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
            player.health = clamp(player.health - 5, 0, statCap('health', !!player.isVampire, player));
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
      title: 'A Benefactor\'s Offer',
      body: 'A wealthy benefactor seeks a bright student to advise on matters of learning — and perhaps loyalty.',
      buttons: [
        {
          id: 'accept',
          label: 'Accept patronage',
          logText:
            'You accepted a patron\'s coin: The fees eased, but another\'s interests now sat beside your own.',
          apply: (player) => {
            addMoney(player, 8);
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
            addMoney(player, -3);
          },
        },
        {
          id: 'borrow',
          label: 'Borrow from family',
          logText:
            'You borrowed from family to meet the fees: The coin kept you at your books — and indebted in other ways.',
          apply: (player) => {
            addMoney(player, -1);
          },
        },
      ],
    },

    {
      id: 'sponsor_patron_summons',
      domain: 'education',
      record: 'flavor',
      logContext: universityLogContext,
      title: 'Your Patron Summons You',
      body:
        'Your patron requests a favour — transcription, cataloguing a shelf of his library, ' +
        'or some other task befitting a grateful scholar. It will cost you an hour or two.',
      buttons: [
        {
          id: 'help',
          label: 'Attend to his request (2 AP)',
          logText: 'You answered your patron\'s summons — tedious work, but he seemed pleased.',
          apply: (player) => {
            if (!canSpendActionPoints(player, 2)) return;
            spendActionPoints(player, 2);
            const patronId = player.education?.university?.sponsorship?.patronId;
            if (patronId) bumpDisposition(player, patronId, 5, G.year);
            bumpStat(player, 'intelligence', 1);
          },
        },
        {
          id: 'decline',
          label: 'Beg off this year',
          logText: 'You declined your patron\'s summons — he did not take it well.',
          apply: (player) => {
            const patronId = player.education?.university?.sponsorship?.patronId;
            if (patronId) bumpDisposition(player, patronId, -5, G.year);
          },
        },
      ],
    },
  ];
}

/** Pool of yearly academic situations while at university. */
const UNIVERSITY_YEARLY_POOL = [
  { id: 'univ_debate_society', weight: 12 },
  { id: 'univ_lab_accident', weight: 8, degrees: ['medicine', 'bsc'] },
  { id: 'univ_thesis_crisis', weight: 10, minProgress: 300 },
  { id: 'univ_patron_offer', weight: 8 },
  { id: 'univ_academia_seminar', weight: 6 },
  { id: 'univ_tuition_strain', weight: 10 },
  { id: 'sponsor_patron_summons', weight: 10, requiresSponsorship: true },
];

export function pickUniversitySituation(player) {
  if (player.education?.stage !== 'university') return null;
  const uni = player.education.university;
  const degreeId = uni?.degreeId;
  const progress = uni?.progress ?? 0;
  const hasSponsorship = !!uni?.sponsorship?.active;

  const eligible = UNIVERSITY_YEARLY_POOL.filter((entry) => {
    if (entry.degrees && degreeId && !entry.degrees.includes(degreeId)) return false;
    if (entry.minProgress != null && progress <= entry.minProgress) return false;
    if (entry.requiresSponsorship && !hasSponsorship) return false;
    if (entry.id === 'univ_patron_offer' && hasSponsorship) return false;
    return true;
  });
  if (!eligible.length) return null;
  return weightedPick(eligible).id;
}

export function buildUniversityProgressHtml(player) {
  const ed = player.education || {};
  const uni = ed.university;
  if (!uni || ed.stage !== 'university') return '';

  const degree = uni.degreeId ? DEGREES_BY_ID[uni.degreeId] : null;
  const cost = degree?.progressCost ?? 400;
  const progress = uni.progress ?? 0;
  const pct = Math.min(100, Math.round((progress / cost) * 100));
  const loadLabel = uni.lastClassLoadId
    ? (CLASS_LOADS_BY_ID[uni.lastClassLoadId]?.label ?? '—')
    : '—';

  return `
    <div class="edu-progress-wrap">
      <div class="edu-progress-bar"><div class="edu-progress-fill" style="width:${pct}%"></div></div>
      <div class="edu-progress-label">${progress} / ${cost} progress</div>
    </div>
    <div class="edu-apply-row"><span>This year's load</span><span>${escapeHtml(loadLabel)}</span></div>`;
}

export function buildUniversityPanelHtml(player) {
  const ed = player.education || {};
  const uni = ed.university;
  if (!uni || ed.stage !== 'university') return '';

  const schoolLabel = UNIVERSITIES[uni.school]?.label ?? uni.school;
  const degree = uni.degreeId ? DEGREES_BY_ID[uni.degreeId] : null;
  const progressHtml = buildUniversityProgressHtml(player);

  return `<div class="career-page">
    <div class="career-page-title">At University</div>
    <div class="career-detail-headline">
      <div class="career-detail-rank">${escapeHtml(schoolLabel)}</div>
      <div class="career-detail-since">${escapeHtml(degree?.label ?? 'Degree undeclared')}</div>
    </div>
    ${progressHtml}
  </div>`;
}

/** @deprecated use buildUniversityPanelHtml */
export function buildFocusPanelHtml(player) {
  return buildUniversityPanelHtml(player);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
