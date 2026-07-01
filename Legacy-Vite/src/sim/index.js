// Public sim barrel — only finished modules.
export { recomputeJournalFlags, isJournaled } from './journal.js';
export { runYearTick } from './yearTick.js';
export { linkSpouses, syncMarriageWealth, backfillMarriageWealth, marryPersons } from './marriage.js';
export { tryConceive, tryConceiveFromPair, clearPregnancy, sanitizePregnancies, currentFertility } from './conception.js';
export { spawnChild, tickBirths } from './birth.js';
export {
  createPerson,
  snapshotBirthStats,
  inheritStats,
  rollAdultStats,
  applyInheritedStats,
} from '../state/personFactory.js';
export { randomName, randomSurname } from '../data/names.js';
export { tickNpcSchoolDropout } from './npcEducation.js';
export { tickRelationshipDecay, backfillRelationshipEdgeFloors } from './relationshipDecay.js';
export { scaleRelationshipDelta, getIntimidationResist, getSirenSusceptibilityMult } from './humorRelationshipMods.js';
export {
  careerName,
  careerRankLabel,
  careerDisplay,
  pickCareerForNPC,
  assignCareerToPerson,
  assignCareerToPersonWithAgeFit,
  assignEarlyCareerToNPC,
  careerFitScore,
  wealthTierLabel,
  careerWealthTarget,
  tickCareerProgression,
  registerCareerHooks,
} from './careers.js';
export {
  playerHasDegree,
  nextDegreeFor,
  canApplyForDegree,
  commitDegreeApplication,
  tickEducation,
  educationStageLabel,
  registerEducationTickHooks,
} from './educationTick.js';
export { processPlayerEvents, registerEventHooks } from './events.js';
export { checkMortality, killPerson, registerMortalityHooks } from './mortality.js';
export { spawnPendingSiblings, registerSiblingHooks } from './siblings.js';
export {
  ACTION_POINTS_PER_YEAR,
  getActionPointCost,
  refreshActionPoints,
  canSpendActionPoints,
  spendActionPoints,
} from './actionPoints.js';
export {
  HOBBY_SKILL_MIN,
  HOBBY_SKILL_MAX,
  HOBBIES_CHILDHOOD,
  HOBBIES_UNDER_12,
  HOBBY_CHILDHOOD_MIN_AGE,
  HOBBY_FULL_UNLOCK_AGE,
  getHobbyLevel,
  isHobbyUnlocked,
  unlockedHobbies,
  addHobbySkill,
  runHobbyEndeavor,
} from './hobbies.js';
