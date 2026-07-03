import { G } from '../state/gameState.js';
import { clamp, statCap } from '../utils/index.js';
import { SCHOOL_WORK_HEALTH_COST_PER_YEAR } from '../data/careers.js';
import { pickUniversitySituation } from '../data/educationSituations.js';
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
import {
  canOfferUniversity,
  universityAcceptanceTemplateId,
  checkSponsorshipRevocation,
  playerHasDegree,
} from './university.js';

let hooks = {
  fireSituation: () => {},
  onAfterDegreeCommit: () => {},
};

export function registerEducationTickHooks(h) {
  hooks = { ...hooks, ...h };
}

export { playerHasDegree };

function resolvePlayerTierEnd(p, { tierName, nextStage, enrollSituationId }) {
  const letter = finalGradeLetter(p);

  if (letter === 'F') {
    applyGradeReward(p, 'F', statCap);
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

function tickPlayerUniversity(p) {
  const ed = p.education;
  const uni = ed.university;
  if (!uni) return;

  checkSponsorshipRevocation(p);

  if (!uni.degreeId) {
    hooks.fireSituation(p, 'univ_degree_choice');
    return;
  }

  if (uni.lastClassLoadYear !== G.year) {
    hooks.fireSituation(p, 'univ_class_load');
  }

  if (Math.random() < 0.7 && ed.lastAcademicSitYear !== G.year) {
    const sitId = pickUniversitySituation(p);
    if (sitId) {
      hooks.fireSituation(p, sitId);
      ed.lastAcademicSitYear = G.year;
    }
  }
}

export function tickEducation() {
  for (const p of G.people) {
    if (!p.isAlive) continue;

    if (!p.education) {
      p.education = { stage: 'none', since: null, track: null };
    }
    if (!('track' in p.education)) p.education.track = null;
    if (!('university' in p.education)) p.education.university = null;
    if (!('universityMatriculated' in p.education)) p.education.universityMatriculated = false;
    if (!Array.isArray(p.degrees)) p.degrees = [];

    const ed = p.education;

    if (p.age >= 6 && ed.stage === 'none') {
      ed.stage = 'primary';
      ed.since = G.year;
      if (p.isPlayer) {
        resetGrade(p);
        hooks.fireSituation(p, 'school_started_primary');
      }
    } else if (p.age >= 12 && ed.stage === 'primary') {
      if (p.isPlayer) {
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
        resolvePlayerTierEnd(p, { tierName: 'Secondary School', nextStage: 'completed' });
      } else {
        ed.stage = 'completed';
        ed.since = G.year;
      }
    }

    if (p.isPlayer && ed.stage === 'primary' && p.age === 7) {
      hooks.fireSituation(p, 'primary_sharp_wits');
    }
    if (p.isPlayer && ed.stage === 'primary' && p.age === 8) {
      hooks.fireSituation(p, 'headmasters_office');
    }
    if (p.isPlayer && ed.stage === 'primary' && p.age === 10) {
      hooks.fireSituation(p, 'primary_crossroads');
    }

    if (p.isPlayer && (ed.stage === 'primary' || ed.stage === 'secondary')) {
      addGrade(p, gradePassivePerYear(effectiveStat(p, 'intelligence')));
    }

    if (p.isPlayer && canOfferUniversity(p)) {
      hooks.fireSituation(p, universityAcceptanceTemplateId(p));
    }

    if (p.isPlayer && ed.stage === 'university') {
      tickPlayerUniversity(p);
    }

    if (p.isPlayer && p.career && (ed.stage === 'primary' || ed.stage === 'secondary')) {
      p.health = clamp(
        p.health - SCHOOL_WORK_HEALTH_COST_PER_YEAR,
        0,
        statCap('health', p.isVampire, p),
      );
      proposeAnnals({
        msg: 'School and work together wore on you.',
        type: 'bad',
        priority: ANNALS_PRIORITY.FLAVOR,
      });
    }
  }

  tickSchoolForPlayer();
}

export function educationStageLabel(stage) {
  switch (stage) {
    case 'none':        return 'Not yet schooled';
    case 'primary':     return 'Primary School';
    case 'secondary':   return 'Secondary School';
    case 'completed':   return 'Schooling Complete';
    case 'dropped_out': return 'Dropped Out';
    case 'university':  return 'At University';
    default:            return 'Unknown';
  }
}
