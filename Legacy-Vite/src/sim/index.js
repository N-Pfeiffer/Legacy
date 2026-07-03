// Public sim barrel — only finished modules.
export { recomputeJournalFlags, isJournaled } from './journal.js';
export { runYearTick } from './yearTick.js';
export { linkSpouses, syncMarriageWealth, marryPersons } from './marriage.js';
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
  careerLabel,
  careerEligibilityForPlayer,
  careerRequirementLines,
  annualPay,
  entryAnnualPay,
  peakAnnualPay,
  pickCareerForNPC,
  assignCareerToPerson,
  assignCareerToPersonWithAgeFit,
  assignEarlyCareerToNPC,
  careerFitScore,
  wealthTierLabel,
  careerWealthTarget,
  tickCareerProgression,
  registerCareerHooks,
  migrateStaleCareer,
  progressPlayerCareerOneYear,
  PROMOTION_CADENCE_YEARS,
  RETIREMENT_AGE,
} from './careers.js';
export {
  ensureWorkplaceState,
  clearWorkplace,
  generateWorkplace,
  healWorkplaceIfNeeded,
  workHardForPromotion,
  deductCareerUpkeep,
  getBossDisposition,
  isPromotionBlocked,
  workplaceRoleLabel,
  CAREER_UPKEEP_AP,
  WORK_HARD_AP_COST,
} from './workplace.js';
export {
  playerHasDegree,
  tickEducation,
  educationStageLabel,
  registerEducationTickHooks,
} from './educationTick.js';
export {
  getMoney,
  addMoney,
  trySpendMoney,
  formatMoney,
  syncSovereignMirror,
  moneyStandingBand,
  moneyStandingLabel,
  startingMoneyForClass,
  parentWealthForInheritance,
} from './money.js';
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
