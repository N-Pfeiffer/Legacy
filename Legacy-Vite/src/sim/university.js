import { G, getPerson } from '../state/gameState.js';
import { clamp, statCap } from '../utils/index.js';
import {
  UNIVERSITIES,
  DEGREES,
  DEGREES_BY_ID,
  CLASS_LOADS_BY_ID,
} from '../data/education.js';
import { generateAdultWithHousehold } from './npcFamilyGen.js';
import { ensureRelationship, bumpDisposition, getRelationshipOrDefault } from './relationships.js';
import { trySpendMoney, addMoney, getMoney, formatMoney } from './money.js';
import { spendActionPoints, canSpendActionPoints } from './actionPoints.js';
import { ANNALS_PRIORITY, proposeAnnals } from './annals.js';
import { recordMilestone } from './situationLog.js';

const UCL_TUITION = UNIVERSITIES.ucl.tuition;

export function getFather(player) {
  for (const id of player?.parentIds || []) {
    const p = getPerson(id);
    if (p?.sex === 'M') return p;
  }
  return null;
}

export function fatherIsAlive(player) {
  const father = getFather(player);
  return !!(father?.isAlive);
}

export function oxfordQualified(player) {
  if (player?.sex !== 'M') return false;
  const father = getFather(player);
  return !!(father?.isAlive && (father.wealth ?? 0) > 70);
}

export function isFreeRide(player) {
  const uni = player?.education?.university;
  if (!uni) return false;
  if (uni.sponsorship?.active) return true;
  if (uni.fatherFunded && fatherIsAlive(player)) return true;
  return false;
}

export function tuitionForLoad(player, loadId) {
  if (isFreeRide(player)) return 0;
  return UCL_TUITION[loadId] ?? 0;
}

export function canOfferUniversity(player) {
  const ed = player?.education;
  if (!ed || ed.stage !== 'completed') return false;
  if ((player.age ?? 0) < 17) return false;
  if (ed.universityMatriculated) return false;
  if (ed.universityDeclinedYear === G.year) return false;
  const pending = (player.situations || []).some((s) =>
    String(s.templateId || '').startsWith('univ_accept_'),
  );
  if (pending) return false;
  return true;
}

export function declineUniversityOffer(player) {
  if (!player.education) player.education = { stage: 'completed', since: null };
  player.education.universityDeclinedYear = G.year;
}

export function generateUniversityPatron(player) {
  const age = 45 + Math.floor(Math.random() * 16);
  const { focal: professor } = generateAdultWithHousehold({
    age,
    sex: 'M',
    careerId: 'schoolmaster',
    careerRank: 2,
    wealth: 55,
  });
  professor.intelligence = clamp(65 + Math.floor(Math.random() * 25), 0, statCap('intelligence', false));
  professor.insight = clamp(20 + Math.floor(Math.random() * 25), 0, statCap('insight', false));
  professor.charisma = clamp(40 + Math.floor(Math.random() * 20), 0, 100);
  if (professor.career) {
    professor.career.rank = 2;
    professor.career.yearsAtRank = 4;
  }
  ensureRelationship(player, professor.id, G.year, { disposition: 30 });
  return professor;
}

export function enrollUniversity(player, { school, fatherFunded = false, sponsorship = null }) {
  const ed = player.education;
  ed.stage = 'university';
  ed.since = G.year;
  ed.universityMatriculated = true;
  ed.university = {
    school,
    degreeId: null,
    progress: 0,
    fatherFunded: !!fatherFunded,
    sponsorship,
    enrolledYear: G.year,
    lastClassLoadId: null,
    lastClassLoadYear: null,
    fatherDeathNoticed: false,
  };
  proposeAnnals({
    msg: `You have matriculated at ${UNIVERSITIES[school]?.label ?? school}.`,
    type: 'good',
    priority: ANNALS_PRIORITY.MAJOR,
    category: 'education',
  });
}

export function leaveUniversity(player) {
  const ed = player.education;
  if (!ed || ed.stage !== 'university') return;
  ed.university = null;
  ed.stage = 'completed';
  ed.since = G.year;
}

export function setUniversityDegree(player, degreeId) {
  const uni = player.education?.university;
  if (!uni) return false;
  const degree = DEGREES_BY_ID[degreeId];
  if (!degree || !degree.schools.includes(uni.school)) return false;
  uni.degreeId = degreeId;
  return true;
}

export function degreesForSchool(schoolId) {
  return DEGREES.filter((d) => d.schools.includes(schoolId));
}

function getPatron(player) {
  const patronId = player.education?.university?.sponsorship?.patronId;
  return patronId ? getPerson(patronId) : null;
}

export function checkSponsorshipRevocation(player) {
  const sp = player.education?.university?.sponsorship;
  if (!sp?.active) return false;
  const patron = getPatron(player);
  const edge = patron ? getRelationshipOrDefault(player, patron.id) : null;
  if (!patron?.isAlive || (edge?.disposition ?? 0) < 0 || (sp.disappointments ?? 0) >= 2) {
    sp.active = false;
    proposeAnnals({
      msg: 'Your patron has withdrawn his support. You must pay your own way hereafter.',
      type: 'bad',
      priority: ANNALS_PRIORITY.MAJOR,
      category: 'education',
    });
    return true;
  }
  return false;
}

function applySponsorshipClassReaction(player, loadId) {
  const sp = player.education?.university?.sponsorship;
  if (!sp?.active) return;
  const patron = getPatron(player);
  if (!patron) return;

  if (loadId === 'standard') {
    bumpDisposition(player, patron.id, 5, G.year);
    proposeAnnals({
      msg: 'Your patron approves of your diligence this term.',
      type: 'good',
      priority: ANNALS_PRIORITY.FLAVOR,
      category: 'education',
    });
  } else if (loadId === 'few') {
    bumpDisposition(player, patron.id, -10, G.year);
    proposeAnnals({
      msg: 'Your patron notes your slack attendance with disapproval.',
      type: 'bad',
      priority: ANNALS_PRIORITY.FLAVOR,
      category: 'education',
    });
  } else if (loadId === 'skip') {
    bumpDisposition(player, patron.id, -20, G.year);
    sp.disappointments = (sp.disappointments ?? 0) + 1;
    proposeAnnals({
      msg: "Your patron's letters grow cold.",
      type: 'bad',
      priority: ANNALS_PRIORITY.FLAVOR,
      category: 'education',
    });
    checkSponsorshipRevocation(player);
  }
}

export function classLoadAffordable(player, load) {
  if (!load) return false;
  if (load.id === 'skip') return true;
  const tuition = tuitionForLoad(player, load.id);
  if (getMoney(player) < tuition) return false;
  if (load.ap > 0 && !canSpendActionPoints(player, load.ap)) return false;
  return true;
}

export function applyClassLoad(player, loadId) {
  const uni = player.education?.university;
  const load = CLASS_LOADS_BY_ID[loadId];
  if (!uni || !load) return { ok: false };

  if (loadId !== 'skip') {
    const tuition = tuitionForLoad(player, loadId);
    if (getMoney(player) < tuition) return { ok: false, reason: 'money' };
    if (load.ap > 0 && !canSpendActionPoints(player, load.ap)) return { ok: false, reason: 'ap' };
    if (tuition > 0) trySpendMoney(player, tuition);
    if (load.ap > 0) spendActionPoints(player, load.ap);
  }

  uni.progress = (uni.progress ?? 0) + load.progress;
  uni.lastClassLoadId = loadId;
  uni.lastClassLoadYear = G.year;

  applySponsorshipClassReaction(player, loadId);
  checkSponsorshipRevocation(player);

  return graduateIfReady(player) || { ok: true };
}

export function graduateIfReady(player) {
  const uni = player.education?.university;
  const degreeId = uni?.degreeId;
  const degree = degreeId ? DEGREES_BY_ID[degreeId] : null;
  if (!uni || !degree) return null;
  if ((uni.progress ?? 0) < degree.progressCost) return null;

  if (!Array.isArray(player.degrees)) player.degrees = [];
  if (!player.degrees.includes(degreeId)) player.degrees.push(degreeId);

  const sponsorshipActive = uni.sponsorship?.active;
  const patron = sponsorshipActive ? getPatron(player) : null;

  recordMilestone(player, {
    title: `Degree: ${degree.label}`,
    narrative: `You have earned your ${degree.label} from ${UNIVERSITIES[uni.school]?.label ?? uni.school}.`,
    memoryCategory: 'education',
    type: 'good',
    year: G.year,
  });

  if (sponsorshipActive && patron) {
    addMoney(player, 10, {
      log: true,
      annalsMsg: 'Your patron presses a modest purse into your hand — a graduation gift.',
      annalsType: 'good',
    });
    bumpDisposition(player, patron.id, 10, G.year);
    // HOOK: patron recommendation — future career-referral perk
  }

  player.education.university = null;
  player.education.stage = 'completed';
  player.education.since = G.year;

  return { ok: true, graduated: true, degreeId };
}

export function playerHasDegree(player, degreeId) {
  return (player.degrees ?? []).includes(degreeId);
}

export function universityAcceptanceTemplateId(player) {
  if (player.traits?.includes('melancholic')) return 'univ_accept_melancholic';
  if (oxfordQualified(player)) return 'univ_accept_letters';
  return 'univ_accept_gower_street';
}

export function needsFatherDeathNotice(player) {
  const uni = player.education?.university;
  return !!(uni?.fatherFunded && !fatherIsAlive(player) && !uni.fatherDeathNoticed);
}

export function markFatherDeathNoticed(player) {
  const uni = player.education?.university;
  if (uni) uni.fatherDeathNoticed = true;
}

export function classLoadCostLine(player, load) {
  const tuition = tuitionForLoad(player, load.id);
  const tuitionPart = tuition > 0 ? formatMoney(tuition) : '£0';
  const apPart = load.ap > 0 ? `${load.ap} AP` : '0 AP';
  return `${tuitionPart} tuition · ${apPart}`;
}
