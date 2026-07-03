import { mudlarkLockboxEligible } from '../sim/mudlarkLockbox.js';
import { magistrateEligible } from '../sim/magistrate.js';
import { addGrade, isGradedTier } from '../sim/grade.js';
import { canSpendActionPoints, spendActionPoints } from '../sim/actionPoints.js';
import { proposeAnnals, ANNALS_PRIORITY } from '../sim/annals.js';
import { appendAnnalsOutcomeHtml } from '../sim/situationLog.js';
import { clamp, pick } from '../utils/index.js';
import { statCap } from '../utils/statCap.js';
// Crafting / item-gated decisions: use requiresItems() from sim/decisionGates.js
//   eligible: (p) => requiresItems(p, ['artifact'], (pl) => pl.isVampire)
// Artifact acquisition is deferred to a future combine-relics decision.

export const STUDY_DECISION_AP = 2;            // BALANCE: provisional
export const STUDY_BODY =
  'Bury yourself in extracurricular study to improve your grade and condition your mind';
const STUDY_DECISION_GRADE = 25;               // applied in primary/secondary only
const STUDY_DECISION_INT = 0.25;

const STUDY_ANNALS_POOL = [
  'You sacrificed your leisure time to the books, drilling the extra coursework into your memory.',
  'You burned the candle down to the wick, pushing your mind through another grueling study session.',
  'You traded rest for discipline, ignoring your fatigue to secure better marks.',
  'You spent hours buried in advanced texts, rigidly conditioning your intellect.',
];

export function studyEligible(p) {
  if (!p?.isPlayer || !p.isAlive) return false;
  const stage = p.education?.stage;
  const inSchool = stage === 'primary' || stage === 'secondary' || stage === 'university';
  return inSchool && canSpendActionPoints(p, STUDY_DECISION_AP);
}

export function applyStudy(p) {
  if (!spendActionPoints(p, STUDY_DECISION_AP)) return;
  // addGrade is a no-op outside a graded tier (e.g. university), so studying
  // there grants only the intelligence trickle.
  addGrade(p, STUDY_DECISION_GRADE);
  const cap = statCap('intelligence', !!p.isVampire);
  p.intelligence = clamp((p.intelligence || 0) + STUDY_DECISION_INT, 0, cap);
  const effects = [{ kind: 'stat', stat: 'intelligence', delta: STUDY_DECISION_INT }];
  if (isGradedTier(p)) effects.unshift({ kind: 'grade', delta: STUDY_DECISION_GRADE });
  proposeAnnals({
    msg: appendAnnalsOutcomeHtml(pick(STUDY_ANNALS_POOL), effects),
    type: 'info',
    html: true,
    priority: ANNALS_PRIORITY.FLAVOR,
    category: 'education',
  });
}

/** Journal > Decisions registry. */
export function buildDecisions() {
  return [
    {
      id: 'open_mudlarks_lockbox',
      title: "Open Mudlark's Lockbox",
      eligible: mudlarkLockboxEligible,
      popup: 'mudlark_lockbox',
    },
    {
      id: 'approach_magistrate',
      title: 'Approach the Magistrate',
      eligible: magistrateEligible,
      popup: 'magistrate_bribe',
    },
  ];
}
