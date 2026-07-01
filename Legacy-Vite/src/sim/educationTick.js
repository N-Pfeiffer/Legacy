import { G } from '../state/gameState.js';
import { clamp, statCap } from '../utils/index.js';
import {
  EDUCATION_LADDER,
  EDUCATION_LADDER_BY_ID,
  HIGHER_ED_IN_PROGRESS_STAGES,
  COMPLETED_DEGREE_INDEX,
} from '../data/education.js';
import { SCHOOL_WORK_HEALTH_COST_PER_YEAR } from '../data/careers.js';
import { shouldOfferScholarship, pickUniversitySituation } from '../data/educationSituations.js';
import { ANNALS_PRIORITY, proposeAnnals } from './annals.js';
import { recordMilestone } from './situationLog.js';
import { tickNpcSchoolDropout } from './npcEducation.js';
import { assignEarlyCareerToNPC } from './careers.js';
import {
  resetGrade,
  clearGrade,
  finalGradeLetter,
  applyGradeReward,
  gradePassivePerYear,
  addGrade,
} from './grade.js';
import { effectiveStat } from './itemEffects.js';
import { tickSchoolForPlayer } from './schoolCohort.js';

let hooks = {
  fireSituation: () => {},
  onAfterDegreeCommit: () => {},
};

export function registerEducationTickHooks(h) {
  hooks = { ...hooks, ...h };
}

export function playerHasDegree(player, degreeId) {
  const stage = player.education?.stage;
  if (!stage) return false;
  const stageIdx = COMPLETED_DEGREE_INDEX[stage];
  if (stageIdx === undefined) return false;        // not at a completed-degree stage
  const requiredIdx = COMPLETED_DEGREE_INDEX[degreeId];
  if (requiredIdx === undefined) return false;     // unknown degree id
  return stageIdx >= requiredIdx;
}

export function nextDegreeFor(player) {
  const stage = player.education?.stage;
  if (stage === 'completed')     return EDUCATION_LADDER_BY_ID.baccalaureate;
  if (stage === 'baccalaureate') return EDUCATION_LADDER_BY_ID.licentiate;
  if (stage === 'licentiate')    return EDUCATION_LADDER_BY_ID.doctorate;
  return null;
}

export function canApplyForDegree(player, degree) {
  if (!degree) return false;
  const next = nextDegreeFor(player);
  if (!next || next.id !== degree.id) return false;     // wrong tier
  if (player.wealth < degree.wealthGate) return false;
  return true;
}

export function commitDegreeApplication(player, degree) {
  if (!canApplyForDegree(player, degree)) return;
  player.education.stage = degree.inProgress;
  player.education.since = G.year;
  proposeAnnals({
    msg: `You have enrolled in the ${degree.label}.`,
    type: 'good',
    priority: ANNALS_PRIORITY.MAJOR,
    category: 'education',
  });
  hooks.onAfterDegreeCommit();
}

/**
 * Resolve the end of a graded tier for the PLAYER: deliver the grade reward (or expulsion on F),
 * then advance the stage. Returns true if the player advanced, false if expelled.
 */
function resolvePlayerTierEnd(p, { tierName, nextStage, enrollSituationId }) {
  const letter = finalGradeLetter(p);

  if (letter === 'F') {
    applyGradeReward(p, 'F', statCap); // −10 Health
    clearGrade(p);
    p.education.stage = 'dropped_out';
    p.education.since = G.year;
    p.education.expelled = true;
    recordMilestone(p, {
      title: `Expelled from ${tierName}`,
      narrative: `You ended ${tierName.toLowerCase()} with a failing mark. The schoolmaster's ruler had the last word, and the door of formal learning closed behind you.`,
      memoryCategory: 'education',
      type: 'bad',
      year: G.year,
    });
    return false;
  }

  recordMilestone(p, {
    title: `${tierName} — Grade ${letter}`,
    narrative: `You finished ${tierName.toLowerCase()} with a grade of ${letter}.`,
    memoryCategory: 'education',
    type: 'good',
    year: G.year,
    apply: (pl) => applyGradeReward(pl, letter, statCap),
  });

  p.education.stage = nextStage;
  p.education.since = G.year;
  if (nextStage === 'secondary') {
    resetGrade(p);
    if (enrollSituationId) hooks.fireSituation(p, enrollSituationId);
  } else {
    clearGrade(p);
  }
  return true;
}

export function tickEducation() {
  for (const p of G.people) {
    if (!p.isAlive) continue;

    // Defensive: skip if education field is somehow missing.
    if (!p.education) {
      p.education = { stage: 'none', since: null, track: null };
    }
    if (!('track' in p.education)) p.education.track = null;

    const ed = p.education;

    // Layer 4a stage transitions — happen AT the boundary age, exactly
    // once. Idempotent.
    if (p.age >= 6 && ed.stage === 'none') {
      ed.stage = 'primary';
      ed.since = G.year;
      if (p.isPlayer) {
        resetGrade(p);
        hooks.fireSituation(p, 'school_started_primary');
      }
    } else if (p.age >= 12 && ed.stage === 'primary') {
      if (p.isPlayer) {
        // End-of-primary: grade reward, or expulsion on F (no secondary).
        resolvePlayerTierEnd(p, {
          tierName: 'Primary School',
          nextStage: 'secondary',
          enrollSituationId: 'secondary_enrollment',
        });
      } else {
        ed.stage = 'secondary';
        ed.since = G.year;
      }
    }

    if (!p.isPlayer && (ed.stage === 'primary' || ed.stage === 'secondary')) {
      tickNpcSchoolDropout(p, G.year, { assignEarlyCareer: assignEarlyCareerToNPC });
    }

    if (p.age >= 17 && ed.stage === 'secondary') {
      if (p.isPlayer) {
        // End-of-secondary: grade reward, or expulsion on F (no university).
        resolvePlayerTierEnd(p, { tierName: 'Secondary School', nextStage: 'completed' });
      } else {
        ed.stage = 'completed';
        ed.since = G.year;
      }
    }

    // School situation chain — fire once at exact ages while enrolled.
    if (p.isPlayer && ed.stage === 'primary' && p.age === 7) {
      hooks.fireSituation(p, 'primary_sharp_wits');
    }
    if (p.isPlayer && ed.stage === 'primary' && p.age === 8) {
      hooks.fireSituation(p, 'headmasters_office');
    }
    if (p.isPlayer && ed.stage === 'primary' && p.age === 10) {
      hooks.fireSituation(p, 'primary_crossroads');
    }
    if (p.isPlayer && ed.stage === 'secondary' && p.age === 13) {
      hooks.fireSituation(p, 'secondary_streetwise');
    }

    // Passive grade accrual from intelligence, each enrolled year (player only).
    if (p.isPlayer && (ed.stage === 'primary' || ed.stage === 'secondary')) {
      addGrade(p, gradePassivePerYear(effectiveStat(p, 'intelligence')));
    }

    // Scholarship offer for merit students who lack wealth for university.
    if (p.isPlayer && shouldOfferScholarship(p)) {
      p.education.scholarshipOffered = true;
      hooks.fireSituation(p, 'university_scholarship');
    }

    // Layer 4b transitions: an in-progress tier becomes a completed
    // tier when the player has been in it for the tier's duration.
    // Player-only — NPCs never enter these stages.
    if (p.isPlayer && HIGHER_ED_IN_PROGRESS_STAGES.has(ed.stage)) {
      const tier = EDUCATION_LADDER.find(d => d.inProgress === ed.stage);
      if (tier) {
        const yearsIn = G.year - (ed.since ?? G.year);
        if (yearsIn >= tier.duration) {
          ed.stage = tier.stageName;
          ed.since = G.year;
          recordMilestone(p, {
            title: tier.label,
            narrative: `You have earned your ${tier.label}.`,
            memoryCategory: 'education',
            type: 'good',
            year: G.year,
            // The doctorate confers a final intelligence boost; the diff
            // surfaces it as the memory's outcome line.
            apply: tier.id === 'doctorate'
              ? (player) => {
                  const cap = statCap('intelligence', !!player.isVampire);
                  player.intelligence = clamp((player.intelligence || 0) + 5, 0, cap);
                }
              : undefined,
          });
        }
      }

      // ~70% chance of an academic Situation each year while enrolled.
      if (Math.random() < 0.7 && ed.lastAcademicSitYear !== G.year) {
        const sitId = pickUniversitySituation(p, ed.stage);
        if (sitId) {
          hooks.fireSituation(p, sitId);
          ed.lastAcademicSitYear = G.year;
        }
      }
    }

    // No per-year stat drips. Education shapes stats only via Situations
    // that fire during schooling — see SITUATIONS registry. See the
    // header comment for the reasoning behind this choice.

    // Part-time work while still enrolled: fixed health cost each year.
    if (p.isPlayer && p.career && (ed.stage === 'primary' || ed.stage === 'secondary')) {
      p.health = clamp(
        p.health - SCHOOL_WORK_HEALTH_COST_PER_YEAR,
        0,
        statCap('health', p.isVampire)
      );
      proposeAnnals({
        msg: 'School and work together wore on you.',
        type: 'bad',
        priority: ANNALS_PRIORITY.FLAVOR,
      });
    }
  }

  // Maintain the player's school cohort + staff once per year (after per-person
  // transitions; new people are added outside the loop above).
  tickSchoolForPlayer();
}

export function educationStageLabel(stage) {
  switch (stage) {
    case 'none':                        return 'Not yet schooled';
    case 'primary':                     return 'Primary School';
    case 'secondary':                   return 'Secondary School';
    case 'completed':                   return 'Schooling Complete';
    case 'dropped_out':                 return 'Dropped Out';
    case 'baccalaureate_in_progress':   return 'Pursuing Baccalaureate';
    case 'baccalaureate':               return 'Baccalaureate';
    case 'licentiate_in_progress':      return 'Pursuing Licentiate';
    case 'licentiate':                  return 'Licentiate';
    case 'doctorate_in_progress':       return 'Pursuing Doctorate';
    case 'doctorate':                   return 'Doctorate';
    default:                            return 'Unknown';
  }
}
