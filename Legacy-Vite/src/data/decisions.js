import { mudlarkLockboxEligible } from '../sim/mudlarkLockbox.js';
import { addGrade } from '../sim/grade.js';
import { canSpendActionPoints, spendActionPoints } from '../sim/actionPoints.js';
import { proposeAnnals, ANNALS_PRIORITY } from '../sim/annals.js';
import { HIGHER_ED_IN_PROGRESS_STAGES } from './education.js';
import { clamp } from '../utils/index.js';
import { statCap } from '../utils/statCap.js';
// Crafting / item-gated decisions: use requiresItems() from sim/decisionGates.js
//   eligible: (p) => requiresItems(p, ['artifact'], (pl) => pl.isVampire)
// Artifact acquisition is deferred to a future combine-relics decision.

export const STUDY_DECISION_AP = 2;            // BALANCE: provisional
const STUDY_DECISION_GRADE = 25;               // applied in primary/secondary only
const STUDY_DECISION_INT = 0.25;

function studyEligible(p) {
  if (!p?.isPlayer || !p.isAlive) return false;
  const stage = p.education?.stage;
  const inSchool = stage === 'primary' || stage === 'secondary'
    || HIGHER_ED_IN_PROGRESS_STAGES.has(stage);
  return inSchool && canSpendActionPoints(p, STUDY_DECISION_AP);
}

function applyStudy(p) {
  if (!spendActionPoints(p, STUDY_DECISION_AP)) return;
  // addGrade is a no-op outside a graded tier (e.g. university), so studying
  // there grants only the intelligence trickle.
  addGrade(p, STUDY_DECISION_GRADE);
  const cap = statCap('intelligence', !!p.isVampire);
  p.intelligence = clamp((p.intelligence || 0) + STUDY_DECISION_INT, 0, cap);
  proposeAnnals({
    msg: 'You spent the year bent over your books.',
    type: 'info',
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
      id: 'study_school',
      title: 'Study',
      eligible: studyEligible,
      body:
        'Bend over your books for the year — long hours by candlelight to better your standing in school.',
      confirmLabel: `Study (${STUDY_DECISION_AP} AP)`,
      apply: applyStudy,
    },
  ];
}
