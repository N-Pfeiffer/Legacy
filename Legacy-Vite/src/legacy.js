// Extracted from legacy-0.0.2.html

import { pick, clamp, statCap, rollNormal, weightedPick } from './utils/index.js';
import { VOCAB } from './data/vocab.js';
import {
  G,
  bl,
  _id,
  START_YEAR,
  nextId,
  setNextId,
  getPlayer,
  getPerson,
  getAlive,
  getSpouses,
  getLovers,
  getFriends,
  getEnemies,
  getChildren,
  getParents,
  getGrandparents,
  getSiblings,
  getAuntsUncles,
  getCousins,
  getGrandchildren,
  getScions,
  getSire,
  currentSection,
  setCurrentSection,
} from './state/gameState.js';
import { registerSaveMigrationDeps } from './state/saveSystem.js';
import {
  renderFamilyTab,
  defaultFamilyCollapseState,
  FAMILY_PREVIEW_COUNT,
} from './ui/familyTab.js';
import {
  rollSiblingCount,
  maxParentSiblingAge,
  rollParentSiblingAge,
  maxOlderSiblingAgeDiff,
} from './sim/familyGeneration.js';
import { renderEventLog, escapeHtml } from './ui/eventLog.js';
import { renderMemoriesPanel } from './ui/memoriesPanel.js';
import { syncMemoryIdFromSave } from './sim/memories.js';
import { relationshipBondPanelHtml, relationshipCardBarsHtml } from './ui/relationshipBars.js';
import {
  ANNALS_PRIORITY,
  proposeAnnals,
  closeAnnalsYear,
  recordAnnalsImmediate,
} from './sim/annals.js';
import { runYearTick } from './sim/yearTick.js';
import { recomputeJournalFlags } from './sim/journal.js';
import {
  ensureRelationship,
  bumpDisposition,
  bumpIntimacy,
  seedFamilyRelationships,
  syncSocialBuckets,
  migratePlayerRelationships,
} from './sim/relationships.js';
import {
  applyTraitStatMods,
  applyHumorEmbraceSwap,
  renderEarnedTraitsHtml,
  canToggleCreationTrait,
  creationTraitBudgetRemaining,
  traitPointCostLabel,
  pruneDependentCreationTraits,
  migrateTraitIds,
  grantTrait,
  hasTrait,
  TRAITS_BY_ID,
  INNATE_POSITIVE_IDS,
  INNATE_DRAWBACK_IDS,
  CREATION_TRAIT_BUDGET,
} from './sim/traits.js';
import { assignRandomHumor, backfillNpcHumors } from './sim/humorPersonality.js';
import { linkSpouses, syncMarriageWealth, backfillMarriageWealth } from './sim/marriage.js';
import {
  getAvailableInteractChoices,
  performPersonInteraction,
} from './sim/personInteractions.js';
import { clearPregnancy, sanitizePregnancies } from './sim/conception.js';
import { backfillRelationshipEdgeFloors } from './sim/relationshipDecay.js';
import { tickBirths } from './sim/birth.js';
import { tickNpcSchoolDropout } from './sim/npcEducation.js';
import {
  createPerson,
  snapshotBirthStats,
  inheritStats,
  rollAdultStats,
  applyInheritedStats,
} from './state/personFactory.js';
import { randomName, randomSurname } from './data/names.js';
import { CAREER_TRACK_REQUIREMENTS, trackLabel, trackShortLabel } from './data/educationTracks.js';
import {
  buildEducationSituations,
  buildEducationImmersiveEvents,
  pickUniversitySituation,
  shouldOfferScholarship,
  buildFocusPanelHtml,
} from './data/educationSituations.js';
import { recordSituationResolution, recordMilestone, renderSituationPendingMetaHtml } from './sim/situationLog.js';
import { buildImmersiveEvents, isImmersiveTemplate } from './data/immersiveEvents.js';
import { buildEstateSituations, buildEstateImmersiveEvents, tickEstateSituations, processEstateFollowUp } from './data/estateSituations.js';
import { buildRookeriesSituations } from './data/rookeriesSituations.js';
import { buildPrisonSituations } from './data/prisonSituations.js';
import {
  incarceratePlayer,
  isInPrison,
  migratePatronJailToPrison,
  prisonCellLabel,
  prisonEraFlavorLine,
  prisonYearsRemaining,
  releasePrison,
  tickPrisonYear,
} from './sim/prison.js';
import { showImmersivePopupIfNeeded } from './sim/immersivePopup.js';
import { hasUnreadSituations, unreadPanelSituations } from './sim/situationAttention.js';
import {
  isDecisionUnread,
  markDecisionRead,
  markAllDecisionsRead,
  unreadEligibleDecisions,
} from './sim/decisionAttention.js';
import {
  closeSituationPopup,
  isAutoOpenTemplate,
  isSituationPopupOpen,
  openSituationPopup,
  refreshSituationPopup,
  showAutoSituationPopupIfNeeded,
  wireSituationPopupOverlay,
} from './sim/situationPopup.js';
import { ITEMS, ITEMS_BY_ID } from './data/items.js';
import { clearItems, grantItem, hasItem, removeItem, migratePersonInventory } from './sim/playerItems.js';
import { closeItemPopup, getOpenItemPopupId, refreshOpenItemPopup, wireItemPopupOverlay } from './ui/itemPopup.js';
import {
  effectiveCharisma,
  effectiveInsight,
  effectiveStat,
  migrateLegacyItemAcquireBonuses,
  migratePatronRelicToItem,
} from './sim/itemEffects.js';
import { currentProwess } from './sim/prowess.js';
import {
  renderHobbiesPanel,
  registerHobbiesHooks,
} from './ui/hobbiesPanel.js';
import {
  renderPersonActionBarHtml,
  wirePersonActionBar,
  renderPersonTraitsPanelHtml,
  renderPersonItemsPanelHtml,
  wirePersonItemsPanel,
  renderPersonInteractPanelHtml,
  renderProposeMarriagePanelHtml,
  wirePersonInteractPanel,
  wireProposeMarriagePanel,
  wirePersonPanelBack,
} from './ui/personPanels.js';
import { buildDecisions } from './data/decisions.js';
import {
  closeDecisionPopup,
  isDecisionPopupOpen,
  openMudlarkLockboxPopup,
  wireDecisionPopupOverlay,
} from './ui/decisionPopup.js';
import { openMarriageProposalResultPopup } from './ui/marriageProposalPopup.js';
import { isProposalAttemptAction } from './data/marriageProposal.js';
import { initializeMudlarkFromFind, migrateMudlarkLockboxToItems } from './sim/mudlarkLockbox.js';
import { STARTING_LOCATION } from './data/setting.js';
import {
  SOCIAL_CLASS_TIERS,
  SOCIAL_CLASS_BY_ID,
  DEFAULT_SOCIAL_CLASS_ID,
  formatSocialClassOptionLabel,
} from './data/socialClass.js';
import {
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
} from './sim/careers.js';
import {
  playerHasDegree,
  nextDegreeFor,
  canApplyForDegree,
  commitDegreeApplication,
  tickEducation,
  educationStageLabel,
  registerEducationTickHooks,
} from './sim/educationTick.js';
import { ensureGrade, gradeFillFraction } from './sim/grade.js';
import { ensureSchoolState } from './sim/schoolCohort.js';
import { processPlayerEvents, registerEventHooks } from './sim/events.js';
import {
  checkMortality,
  killPerson,
  registerMortalityHooks,
} from './sim/mortality.js';
import { spawnPendingSiblings, registerSiblingHooks } from './sim/siblings.js';
import {
  applyVocab,
  currentMode,
  setMode,
  toggleEmbrace,
  updateDebugLabel,
  registerThemeHooks,
} from './ui/theme.js';
import {
  SUBNAV,
  currentSubTab,
  setSubTab,
  renderSubNav,
  showSection,
  normalizeBloodlineSubTab,
  registerNavigationHooks,
} from './ui/navigation.js';
import { relationLabel } from './ui/relations.js';
import {
  wireSearch,
  renderSearchResults,
  registerSearchHooks,
} from './ui/searchPanel.js';
import { renderGameHud, registerRenderHudHooks } from './ui/renderHud.js';
import {
  canInteractWithPerson,
  registerPersonInteractHooks,
} from './ui/personInteract.js';
import {
  openPersonInfoModal,
  wirePersonInfoOverlay,
  renderPersonInfoInteractView,
  registerPersonModalHooks,
  personInfoState,
} from './ui/personModal.js';
import {
  setFocal,
  renderBloodline,
  wireBreadcrumbControls,
  wireSubsectionCollapse,
  initBloodlineFocus,
  registerBloodlineHooks,
  resetBlFocalInteractSubView,
} from './ui/bloodline.js';
import { currentFertility } from './sim/conception.js';
import { refreshActionPoints } from './sim/actionPoints.js';
import { isJournaled } from './sim/journal.js';
import { currentEra, eligibleEras } from './data/eras.js';
import {
  CAREERS,
  CAREERS_BY_ID,
  SCHOOL_WORK_MIN_AGE,
  SCHOOL_WORK_HEALTH_COST_PER_YEAR,
} from './data/careers.js';
import {
  EDUCATION_LADDER,
  EDUCATION_LADDER_BY_ID,
  HIGHER_ED_IN_PROGRESS_STAGES,
  COMPLETED_DEGREE_STAGES,
  COMPLETED_DEGREE_INDEX,
} from './data/education.js';
import { PLAYER_EVENTS } from './data/playerEvents.js';

export function loadLegacyIntoDocument() {
  (function(){
    /* ════════════════════════════════════════════════════════════
       CHARACTER CREATION LOGIC
    ════════════════════════════════════════════════════════════ */

    // URL ?smoke=1 skips creation and exposes window.__LEGACY_TEST__ for Playwright smoke tests.
    const SMOKE_TEST_MODE =
      typeof location !== 'undefined' && new URLSearchParams(location.search).has('smoke');
    const SKIP_CREATION_FOR_TESTING = SMOKE_TEST_MODE;

    const DEFAULT_CREATION_FIRST_NAME = 'John';
    const DEFAULT_CREATION_LAST_NAME = 'Smith';

    // ── Creation state (filled in by the form) ─────────────────
    const cc = {
      firstName:  DEFAULT_CREATION_FIRST_NAME,
      lastName:   DEFAULT_CREATION_LAST_NAME,
      sex:        'M',
      heritage:   'English',
      statBudget: 100,
      charisma:     0,
      intelligence: 0,
      socialClass:  DEFAULT_SOCIAL_CLASS_ID,
      wealth:       0,
      insight:      0,
      prowess:      0,
      traits:       [],
      fatherAge:    20,
      motherAge:    18,
      siblings:     [],
    };

    function applyTestDefaults() {
      Object.assign(cc, {
        firstName:  DEFAULT_CREATION_FIRST_NAME,
        lastName:   DEFAULT_CREATION_LAST_NAME,
        sex:        'M',
        heritage:   'English',
        statBudget: 100,
        charisma:     0,
        intelligence: 0,
        socialClass:  DEFAULT_SOCIAL_CLASS_ID,
      wealth:       0,
        insight:      0,
        prowess:      0,
        traits:       [],
        fatherAge:    20,
        motherAge:    18,
        siblings:     [],
      });
    }

    // ── Step navigation ────────────────────────────────────────
    let currentStep = 1;
    const TOTAL_STEPS = 2;

    function isOrphanCreation() {
      return creationTraitSelection.includes('orphaned');
    }

    function goStep(n) {
      if (n > currentStep) {
        const err = validateStep(currentStep);
        if (err) { alert(err); return; }
        collectStep(currentStep);
        if (currentStep === 1 && isOrphanCreation() && n === 2) {
          startGame();
          return;
        }
      }
      if (n === 2 && isOrphanCreation()) return;
      currentStep = n;
      document.querySelectorAll('.step-panel').forEach((p, i) => {
        p.classList.toggle('active', i + 1 === n);
      });
      document.querySelectorAll('.step-dot').forEach((d, i) => {
        d.classList.remove('active', 'done', 'skipped');
        if (isOrphanCreation() && i === 1) {
          d.classList.add('skipped');
          return;
        }
        if (i + 1 === n)      d.classList.add('active');
        else if (i + 1 < n)   d.classList.add('done');
      });
      updateCreationProceedButton();
    }

    function validateStep(n) {
      if (n === 1) {
        const fn = document.getElementById('cc-firstname').value.trim();
        const ln = document.getElementById('cc-lastname').value.trim();
        if (!ln) return 'Please enter a surname.';
        if (!fn) return 'Please enter a Christian name.';
        if (usedPoints() > getStatBudget()) {
          return 'You have spent more points than your allotted budget allows.';
        }
        if (creationTraitBudgetRemaining(creationTraitSelection) < 0) {
          return 'You have spent more trait points than allowed.';
        }
      }
      return null;
    }

    function collectStep(n) {
      if (n === 1) {
        cc.lastName  = document.getElementById('cc-lastname').value.trim();
        cc.firstName = document.getElementById('cc-firstname').value.trim();
        cc.sex       = document.getElementById('cc-sex')?.value || 'M';
        cc.heritage  = document.getElementById('cc-heritage')?.value || 'English';
        cc.statBudget = getStatBudget();
        cc.charisma     = readCreationStat('sl-charisma');
        cc.intelligence = readCreationStat('sl-intelligence');
        cc.wealth       = getSelectedSocialClass().wealth;
        cc.socialClass  = getSelectedSocialClass().id;
        cc.insight      = readCreationStat('sl-insight');
        cc.prowess      = readCreationStat('sl-prowess');
        cc.traits       = [...creationTraitSelection];
      }
      if (n === 2) {
        cc.fatherAge = parseInt(document.getElementById('cc-father-age').value) || DEFAULT_FATHER_AGE;
        cc.motherAge = parseInt(document.getElementById('cc-mother-age').value) || DEFAULT_MOTHER_AGE;
        cc.siblings = collectSiblings();
      }
    }

    // ── Toggle button groups ───────────────────────────────────
    document.querySelectorAll('.toggle-group').forEach(group => {
      group.addEventListener('click', e => {
        const btn = e.target.closest('.toggle-btn');
        if (!btn) return;
        group.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });

    // ── Stat steppers with points budget ──────────────────────
    //
    // Budget: Charisma & Intelligence cost 2 per point (max 30 each);
    // Insight & Prowess cost 4 per point (max 20 each). +/- steppers avoid
    // range-slider fights with enforcePointBudget.

    const STAT_BUDGET_MIN = 50;
    const STAT_BUDGET_MAX = 250;
    const STAT_BUDGET_DEFAULT = 100;
    const STAT_BUDGET_STEP = 10;
    const INTENDED_PLAY_BUDGETS = [90, 100, 110];

    const sliders = [
      { sl: 'sl-charisma',     lbl: 'lbl-charisma',     base: 0, max: 30, costMult: 2 },
      { sl: 'sl-intelligence', lbl: 'lbl-intelligence', base: 0, max: 30, costMult: 2 },
      { sl: 'sl-insight',      lbl: 'lbl-insight',      base: 0, max: 20, costMult: 4 },
      { sl: 'sl-prowess',      lbl: 'lbl-prowess',      base: 0, max: 20, costMult: 4 },
    ];

    function getStatBudget() {
      const el = document.getElementById('sl-stat-budget');
      return el ? parseInt(el.value, 10) || STAT_BUDGET_DEFAULT : cc.statBudget;
    }

    function getStatValue(cfg) {
      return parseInt(document.getElementById(cfg.sl)?.value, 10) || 0;
    }

    function readCreationStat(sliderId) {
      const cfg = sliders.find((s) => s.sl === sliderId);
      const raw = parseInt(document.getElementById(sliderId)?.value, 10) || 0;
      return raw + (cfg?.base ?? 0);
    }

    function setStatValue(cfg, value) {
      const v = clamp(value, 0, cfg.max);
      const input = document.getElementById(cfg.sl);
      const lbl = document.getElementById(cfg.lbl);
      if (input) input.value = String(v);
      if (lbl) lbl.textContent = String(v + cfg.base);
      updatePointsDisplay();
      updateStepperStates();
    }

    function canAffordStatIncrease(cfg) {
      const cur = getStatValue(cfg);
      if (cur >= cfg.max) return false;
      return usedPoints() + cfg.costMult <= getStatBudget();
    }

    function tryAdjustStat(cfg, delta) {
      const cur = getStatValue(cfg);
      const next = cur + delta;
      if (next < 0 || next > cfg.max) return;
      if (delta > 0 && !canAffordStatIncrease(cfg)) return;
      setStatValue(cfg, next);
    }

    function shrinkStatsToFitBudget() {
      let guard = 0;
      while (usedPoints() > getStatBudget() && guard < 200) {
        guard += 1;
        let reduced = false;
        for (let i = sliders.length - 1; i >= 0; i--) {
          const cfg = sliders[i];
          const cur = getStatValue(cfg);
          if (cur > 0) {
            setStatValue(cfg, cur - 1);
            reduced = true;
            break;
          }
        }
        if (!reduced) {
          clampSocialClassToBudget();
          if (usedPoints() > getStatBudget()) break;
        }
      }
    }

    function adjustBudget(delta) {
      const cur = getStatBudget();
      const next = clamp(cur + delta, STAT_BUDGET_MIN, STAT_BUDGET_MAX);
      if (next === cur) return;
      const input = document.getElementById('sl-stat-budget');
      if (input) input.value = String(next);
      shrinkStatsToFitBudget();
      updateBudgetDisplay();
    }

    function updateStepperStates() {
      for (const cfg of sliders) {
        const root = document.querySelector(`#creation-screen [data-stepper="${cfg.sl}"]`);
        if (!root) continue;
        const v = getStatValue(cfg);
        const dec = root.querySelector('[data-step="-1"]');
        const inc = root.querySelector('[data-step="1"]');
        if (dec) dec.disabled = v <= 0;
        if (inc) inc.disabled = v >= cfg.max || !canAffordStatIncrease(cfg);
      }
      const budgetRoot = document.querySelector('#creation-screen [data-stepper="sl-stat-budget"]');
      if (budgetRoot) {
        const b = getStatBudget();
        const dec = budgetRoot.querySelector(`[data-step="-${STAT_BUDGET_STEP}"]`);
        const inc = budgetRoot.querySelector(`[data-step="${STAT_BUDGET_STEP}"]`);
        if (dec) dec.disabled = b <= STAT_BUDGET_MIN;
        if (inc) inc.disabled = b >= STAT_BUDGET_MAX;
      }
    }

    function wireCreationSteppers() {
      document.querySelectorAll('#creation-screen .cc-stepper').forEach((root) => {
        const inputId = root.dataset.stepper;
        root.querySelectorAll('.cc-stepper-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            const step = parseInt(btn.dataset.step, 10);
            if (inputId === 'sl-stat-budget') {
              adjustBudget(step);
              return;
            }
            const cfg = sliders.find((s) => s.sl === inputId);
            if (cfg) tryAdjustStat(cfg, step);
          });
        });
      });
    }
    wireCreationSteppers();

    function budgetEpithet(budget) {
      if (budget >= 225) return { main: 'Blessed Princeling', alt: '' };
      if (budget >= 200) return { main: 'Silver Spoon', alt: '' };
      if (budget >= 175) return { main: 'Exceptional Gifts', alt: '' };
      if (budget >= 150) return { main: 'Comfortably born', alt: '' };
      if (budget >= 111) return { main: 'Of Ordinary Station', alt: '' };
      if (budget >= 90)  return { main: 'A Bitter Lot', alt: '' };
      if (budget >= 75)  return { main: 'Against All Odds', alt: '' };
      return { main: 'Forsaken', alt: '' };
    }

    function updateBudgetDisplay() {
      const budget = getStatBudget();
      cc.statBudget = budget;
      const totalEl = document.getElementById('budget-total');
      const budgetLbl = document.getElementById('lbl-stat-budget');
      if (totalEl) totalEl.textContent = budget;
      if (budgetLbl) budgetLbl.textContent = budget;
      const { main, alt } = budgetEpithet(budget);
      const epithetEl = document.getElementById('budget-epithet');
      const altEl = document.getElementById('budget-epithet-alt');
      if (epithetEl) epithetEl.textContent = `Difficulty: ${main}`;
      if (altEl) altEl.textContent = alt || '';
      const intendedNote = document.getElementById('budget-intended-note');
      if (intendedNote) {
        intendedNote.hidden = !INTENDED_PLAY_BUDGETS.includes(budget);
      }
      updatePointsDisplay();
      updateStepperStates();
    }

    function buildSocialClassSelect() {
      const sel = document.getElementById('cc-social-class');
      if (!sel) return;
      const prev = cc.socialClass || sel.value || DEFAULT_SOCIAL_CLASS_ID;
      sel.innerHTML = SOCIAL_CLASS_TIERS.map((tier) => {
        const label = formatSocialClassOptionLabel(tier);
        const selected = tier.id === prev ? ' selected' : '';
        return `<option value="${escapeHtml(tier.id)}"${selected}>${escapeHtml(label)}</option>`;
      }).join('');
      if (!SOCIAL_CLASS_BY_ID[sel.value]) sel.value = DEFAULT_SOCIAL_CLASS_ID;
    }

    buildSocialClassSelect();

    function getSelectedSocialClass() {
      const id = document.getElementById('cc-social-class')?.value || cc.socialClass || DEFAULT_SOCIAL_CLASS_ID;
      return SOCIAL_CLASS_BY_ID[id] || SOCIAL_CLASS_BY_ID[DEFAULT_SOCIAL_CLASS_ID];
    }

    function sliderPointsUsed() {
      return sliders.reduce((sum, cfg) => sum + cost(cfg), 0);
    }

    function socialClassPointCost() {
      return getSelectedSocialClass().pointCost;
    }

    function clampSocialClassToBudget() {
      const budget = getStatBudget();
      const sliderUsed = sliderPointsUsed();
      let best = SOCIAL_CLASS_TIERS[0];
      for (const tier of SOCIAL_CLASS_TIERS) {
        if (tier.pointCost <= budget - sliderUsed) best = tier;
      }
      const sel = document.getElementById('cc-social-class');
      if (sel && sel.value !== best.id) sel.value = best.id;
      cc.socialClass = best.id;
      cc.wealth = best.wealth;
    }

    function onSocialClassChange() {
      const tier = getSelectedSocialClass();
      if (sliderPointsUsed() + tier.pointCost > getStatBudget()) {
        clampSocialClassToBudget();
      } else {
        cc.socialClass = tier.id;
        cc.wealth = tier.wealth;
      }
      updatePointsDisplay();
      updateStepperStates();
    }

    const socialClassSel = document.getElementById('cc-social-class');
    if (socialClassSel) {
      socialClassSel.addEventListener('change', onSocialClassChange);
    }

    function cost(cfg) {
      return getStatValue(cfg) * cfg.costMult;
    }

    function usedPoints() {
      return sliderPointsUsed() + socialClassPointCost();
    }

    function updatePointsDisplay() {
      const budget = getStatBudget();
      const remainingEl = document.getElementById('pts-remaining');
      if (remainingEl) remainingEl.textContent = budget - usedPoints();
    }

    updateBudgetDisplay();

    // ── Innate trait point-buy ─────────────────────────────────
    const creationTraitSelection = [];

    function formatTraitBudgetRemaining(remaining) {
      return Number.isInteger(remaining) ? String(remaining) : remaining.toFixed(1);
    }

    function updateTraitPointsDisplay() {
      const el = document.getElementById('trait-pts-remaining');
      if (el) el.textContent = formatTraitBudgetRemaining(creationTraitBudgetRemaining(creationTraitSelection));
    }

    function renderCreationTraitCard(id) {
      const t = TRAITS_BY_ID[id];
      const selected = creationTraitSelection.includes(id);
      const canToggle = selected || canToggleCreationTrait(creationTraitSelection, id);
      const cls = ['cc-trait-card', selected ? 'selected' : '', canToggle ? '' : 'disabled'].filter(Boolean).join(' ');
      const req = t.requiresTrait && !selected && !creationTraitSelection.includes(t.requiresTrait);
      const reqHint = req
        ? `<div class="cc-trait-req">Requires ${escapeHtml(TRAITS_BY_ID[t.requiresTrait]?.label || t.requiresTrait)}</div>`
        : '';
      return `<div class="${cls}" data-trait-id="${escapeHtml(id)}" role="button" tabindex="0">
          <div class="cc-trait-name">${escapeHtml(t.label)}</div>
          <div class="cc-trait-desc">${escapeHtml(t.description || '')}</div>
          <div class="cc-trait-cost">${escapeHtml(traitPointCostLabel(id))}</div>
          ${reqHint}
        </div>`;
    }

    function wireCreationTraitCards(container) {
      container.querySelectorAll('.cc-trait-card').forEach((card) => {
        const toggle = () => {
          const id = card.dataset.traitId;
          const idx = creationTraitSelection.indexOf(id);
          if (idx >= 0) {
            creationTraitSelection.splice(idx, 1);
            pruneDependentCreationTraits(creationTraitSelection, id);
          } else if (canToggleCreationTrait(creationTraitSelection, id)) {
            creationTraitSelection.push(id);
          } else {
            return;
          }
          renderCreationTraitGrid();
          updateTraitPointsDisplay();
          updateCreationProceedButton();
        };
        card.addEventListener('click', toggle);
        card.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
        });
      });
    }

    function renderCreationTraitGrid() {
      const grid = document.getElementById('cc-trait-grid');
      if (!grid) return;
      grid.innerHTML = `
        <h3 class="cc-trait-subtitle">Congenital Peculiarities</h3>
        <div class="cc-trait-grid-section">${INNATE_POSITIVE_IDS.map(renderCreationTraitCard).join('')}</div>
        <h3 class="cc-trait-subtitle">Afflictions</h3>
        <div class="cc-trait-grid-section">${INNATE_DRAWBACK_IDS.map(renderCreationTraitCard).join('')}</div>`;
      wireCreationTraitCards(grid);
      updateCreationProceedButton();
    }

    function updateCreationProceedButton() {
      const btn = document.getElementById('btn-cc-proceed');
      if (!btn) return;
      if (isOrphanCreation()) {
        btn.textContent = 'Begin the Legacy ❦';
        btn.onclick = () => startGame();
      } else {
        btn.textContent = 'Proceed to Family Record →';
        btn.onclick = () => goStep(2);
      }
      const dot2 = document.getElementById('dot-2');
      if (dot2) dot2.classList.toggle('skipped', isOrphanCreation());
    }

    // Parent ages at the player's birth (1800 — young parents were common).
    const PARENT_AGE_MIN = 12;
    const PARENT_AGE_MAX = 26;
    const DEFAULT_FATHER_AGE = 20;
    const DEFAULT_MOTHER_AGE = 18;
    const GRANDPARENT_AGE_AT_BIRTH_MIN = 14;
    const GRANDPARENT_AGE_AT_BIRTH_MAX = 26;
    const GRANDPARENT_DEAD_CHANCE = 0.16;
    // ── Parent age dropdowns (populated on page load & when ages change) ──────────
    function buildParentAgeDropdowns() {
      const fSel = document.getElementById('cc-father-age');
      const mSel = document.getElementById('cc-mother-age');
      [fSel, mSel].forEach((sel, i) => {
        const min = PARENT_AGE_MIN;
        const max = PARENT_AGE_MAX;
        const def = i === 0 ? DEFAULT_FATHER_AGE : DEFAULT_MOTHER_AGE;
        sel.innerHTML = '';
        for (let age = min; age <= max; age++) {
          const opt = document.createElement('option');
          opt.value = age;
          opt.textContent = `${age} years old`;
          if (age === def) opt.selected = true;
          sel.appendChild(opt);
        }
      });
      // Rebuild sibling dropdowns whenever parent ages change
      fSel.addEventListener('change', rebuildSiblingAgeDropdowns);
      mSel.addEventListener('change', rebuildSiblingAgeDropdowns);
    }

    // Older siblings: each parent must have been at least 8 when the sibling was born.
    function siblingAgeOptions() {
      const fAge = parseInt(document.getElementById('cc-father-age').value) || DEFAULT_FATHER_AGE;
      const mAge = parseInt(document.getElementById('cc-mother-age').value) || DEFAULT_MOTHER_AGE;
      const maxOlder = maxOlderSiblingAgeDiff(fAge, mAge);
      // Younger siblings: up to 12 years younger (born after player)
      const maxYounger = 12;
      // Build array: positive = sibling is that many years OLDER at player birth
      //              negative = sibling will be born that many years AFTER player
      const opts = [];
      for (let a = maxOlder; a >= 1; a--) opts.push({ val: a, label: `${a} year${a > 1 ? 's' : ''} older` });
      opts.push({ val: 0, label: 'Twin (same age)' });
      for (let a = 1; a <= maxYounger; a++) opts.push({ val: -a, label: `${a} year${a>1?'s':''} younger` });
      return opts;
    }

    function buildSiblingAgeSelect() {
      const sel = document.createElement('select');
      sel.className = 'sib-age';
      const fAge = parseInt(document.getElementById('cc-father-age')?.value) || DEFAULT_FATHER_AGE;
      const mAge = parseInt(document.getElementById('cc-mother-age')?.value) || DEFAULT_MOTHER_AGE;
      const maxOlder = maxOlderSiblingAgeDiff(fAge, mAge);
      const defaultVal = maxOlder >= 2 ? 2 : (maxOlder >= 1 ? 1 : 0);
      siblingAgeOptions().forEach(({ val, label }) => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = label;
        if (val === defaultVal) opt.selected = true;
        sel.appendChild(opt);
      });
      return sel;
    }

    function rebuildSiblingAgeDropdowns() {
      // Refresh the age dropdown on every existing sibling row
      document.querySelectorAll('.sibling-row').forEach(row => {
        const oldSel = row.querySelector('.sib-age');
        const prevVal = parseInt(oldSel.value);
        const newSel = buildSiblingAgeSelect();
        // Try to preserve the previous selection if it's still valid
        const match = Array.from(newSel.options).find(o => parseInt(o.value) === prevVal);
        if (match) match.selected = true;
        oldSel.replaceWith(newSel);
      });
    }

    // ── Sibling builder ────────────────────────────────────────
    let sibCount = 0;

    function addSibling() {
      if (sibCount >= 10) return;
      sibCount++;
      const id = `sib-${sibCount}`;
      const row = document.createElement('div');
      row.className = 'sibling-row';
      row.id = id;

      const sexSel = document.createElement('select');
      sexSel.className = 'sib-sex';
      sexSel.innerHTML = '<option value="M">♂ Brother</option><option value="F">♀ Sister</option>';

      const ageSel = buildSiblingAgeSelect();

      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-sib';
      removeBtn.textContent = '×';
      removeBtn.onclick = () => removeSibling(id);

      row.appendChild(sexSel);
      row.appendChild(ageSel);
      row.appendChild(removeBtn);
      document.getElementById('sibling-list').appendChild(row);
    }

    function removeSibling(id) {
      document.getElementById(id)?.remove();
    }

    function collectSiblings() {
      const rows = document.querySelectorAll('.sibling-row');
      return Array.from(rows).map(row => ({
        sex:     row.querySelector('.sib-sex').value,
        // val > 0 → sibling is that many years older at player birth
        // val < 0 → sibling is born |val| years after player
        // val = 0 → twin
        ageDiff: parseInt(row.querySelector('.sib-age').value),
      }));
    }

    buildParentAgeDropdowns();

    function resetCharacterCreation() {
      Object.assign(cc, {
        firstName:  DEFAULT_CREATION_FIRST_NAME,
        lastName:   DEFAULT_CREATION_LAST_NAME,
        sex:        'M',
        heritage:   'English',
        statBudget: 100,
        charisma:     0,
        intelligence: 0,
        socialClass:  DEFAULT_SOCIAL_CLASS_ID,
        wealth:       0,
        insight:      0,
        prowess:      0,
        traits:       [],
        fatherAge:    DEFAULT_FATHER_AGE,
        motherAge:    DEFAULT_MOTHER_AGE,
        siblings:     [],
      });

      creationTraitSelection.length = 0;

      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
      };

      setVal('cc-firstname', DEFAULT_CREATION_FIRST_NAME);
      setVal('cc-lastname', DEFAULT_CREATION_LAST_NAME);
      setVal('cc-sex', 'M');
      setVal('cc-heritage', 'English');
      setVal('sl-stat-budget', String(STAT_BUDGET_DEFAULT));
      setVal('sl-charisma', '0');
      setVal('sl-intelligence', '0');
      setVal('sl-insight', '0');
      setVal('sl-prowess', '0');

      const lbl = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
      };
      lbl('lbl-charisma', '0');
      lbl('lbl-intelligence', '0');
      lbl('lbl-insight', '0');
      lbl('lbl-prowess', '0');
      lbl('lbl-stat-budget', String(STAT_BUDGET_DEFAULT));

      buildSocialClassSelect();
      renderCreationTraitGrid();
      updateTraitPointsDisplay();
      updateCreationProceedButton();
      updateBudgetDisplay();
      updateStepperStates();

      setVal('cc-father-age', String(DEFAULT_FATHER_AGE));
      setVal('cc-mother-age', String(DEFAULT_MOTHER_AGE));

      const sibList = document.getElementById('sibling-list');
      if (sibList) sibList.innerHTML = '';
      sibCount = 0;

      currentStep = 1;
      document.querySelectorAll('.step-panel').forEach((p, i) => {
        p.classList.toggle('active', i + 1 === 1);
      });
      document.querySelectorAll('.step-dot').forEach((d, i) => {
        d.classList.remove('active', 'done');
        if (i === 0) d.classList.add('active');
      });
    }

    /* ════════════════════════════════════════════════════════════
       GAME ENGINE
    ════════════════════════════════════════════════════════════ */

    // ── Utilities ──────────────────────────────────────────────
    // rollNormal, inheritStats, rollAdultStats, createPerson → state/personFactory.js
    // randomName, randomSurname → data/names.js

    // ════════════════════════════════════════════════════════════
    //   PROWESS
    // ════════════════════════════════════════════════════════════
    //
    // `currentProwess(p)` returns the person's effective prowess 0-100,
    // applying an age curve, a sex multiplier, life-events bonus, and the
    // vampire +10 bonus from Embrace.
    //
    // Curve shape — peak adult AVERAGES (no base, no bonus, no training):
    //   age 0-2:    ~0  (babies have no prowess)
    //   age 3-7:    ~3  (slow ramp through childhood)
    //   age 8-12:   ~6
    //   age 13-17:  ~12 (rapid pubescent gains)
    //   age 18-35:  ~14 (male peak; ~10 for women at 70% multiplier)
    //   age 36-50:  ~12
    //   age 51-65:  ~10
    //   age 66+:    ~6
    //
    // Reference points for the new scale:
    //   15  — average healthy adult man
    //   8   — average healthy adult woman
    //   30-50 — MMA fighter / elite soldier (requires sustained training)
    //   60+ — superhuman, only possible via Embrace
    //   100 — average elder vampire
    //   300 — vampire cap (reached through disciplines / decisions / story,
    //         not age. Age does not push a vampire past the curve.)
    //
    // Women peak at 70% of the male curve at every age, same curve shape.
    //
    // Mortal cap: 50 (peak athletes only). Embrace lifts the cap to 300 and
    // adds a flat +10 to the live number — small narrative bump, the real
    // growth past mortal limits comes from story/discipline progression.

    // currentProwess — imported from sim/prowess.js (age curve + item bonuses while owned)

    // ════════════════════════════════════════════════════════════
    //   STAT CAPS
    // ════════════════════════════════════════════════════════════
    //
    // Most stats are capped at 100 for mortals and a higher ceiling for
    // vampires. The cap is used both for clamping live values and for
    // scaling bar widths (Option A: a 75/200 vampire bar reads 37.5%).
    //
    // Vampires get a 200 cap on Charisma to represent supernatural
    // presence — a preternatural pull that no mortal can match.
    //
    // Fertility is special: it's a *computed* value via currentFertility().
    // The cap for that bar matches whatever currentFertility could return,
    // which tops out at fertilityBase (≤100) for mortals or vampireFertilityBonus
    // for vampires (currently always 0, but capped at 100 by convention).

    // ════════════════════════════════════════════════════════════
    //   INHERITANCE — see state/personFactory.js (inheritStats, rollAdultStats)
    // ════════════════════════════════════════════════════════════

    // Emoji portrait — accepts either a person object or (sex, age) pair.
    // Vampires get a more cryptic icon regardless of age.
    function portrait(personOrSex, age) {
      let sex, a, isVampire = false;
      if (typeof personOrSex === 'object' && personOrSex !== null) {
        sex = personOrSex.sex;
        a = personOrSex.age;
        isVampire = !!personOrSex.isVampire;
      } else {
        sex = personOrSex;
        a = age;
      }
      if (isVampire) return sex === 'M' ? '🧛‍♂️' : '🧛‍♀️';
      if (a < 1)  return sex === 'M' ? '👦' : '👧';
      if (a < 13) return sex === 'M' ? '👦' : '👧';
      if (a < 30) return sex === 'M' ? '🧑' : '👩';
      if (a < 60) return sex === 'M' ? '👨' : '👩';
      return sex === 'M' ? '👴' : '👵';
    }

    // Person factory → state/personFactory.js (createPerson, snapshotBirthStats)

    // Display name. Women who married & changed surname keep maiden in parens.
    function personName(p, opts = {}) {
      const base = `${p.firstName} ${p.surname}`.trim();
      if (opts.hideMaiden || !p.maidenName) return base;
      return `${base} (${p.maidenName})`;
    }

    // HTML variant — italicizes the maiden name. Use this anywhere the result
    // goes through innerHTML; for textContent / log messages, use personName().
    // stacked: compact cards put maiden on its own line (née …) to keep width even.
    // hideMaiden: omit maiden name (Annals sidebar).
    // link: wrap in a clickable anchor that opens the person profile.
    function personNameHtml(p, opts = {}) {
      if (!p) return '';
      const base = `${escapeHtml(p.firstName)} ${escapeHtml(p.surname)}`.trim();
      let nameHtml = base;
      if (!opts.hideMaiden && p.maidenName) {
        if (opts.stacked) {
          nameHtml = `${base}<span class="pc-maiden">née ${escapeHtml(p.maidenName)}</span>`;
        } else {
          nameHtml = `${base} <em class="maiden">(${escapeHtml(p.maidenName)})</em>`;
        }
      }
      if (opts.link && p.id != null) {
        return `<a class="log-person-link" href="#" data-person-id="${p.id}">${nameHtml}</a>`;
      }
      return nameHtml;
    }

    const personNameHtmlAnnals = (p) => personNameHtml(p, { hideMaiden: true, link: true });

    // ── Game state ─────────────────────────────────────────────
    // G holds world/data state — calendar, people, queued events.
    // year is the actual calendar year (game starts in 1800, the first era).
    // pendingSiblings: younger siblings not yet born.
    //   Each entry: { sex, yearsUntilBirth, fatherId, motherId }
    //   yearsUntilBirth counts down each ageUp; when it hits 0 the sibling is spawned.
    // ════════════════════════════════════════════════════════════
    //   SAVE / LOAD SYSTEM
    // ════════════════════════════════════════════════════════════
    //
    // Persists game state to localStorage. Design points:
    //
    //   • 10 manual slots + 1 auto-save (separate, overwrites every year).
    //   • Plain JSON, no compression. Saves are inspectable in DevTools.
    //   • Versioning: every save records a schema version. On load we run
    //     a chain of migrations to upgrade old saves to the current schema.
    //   • Defensive loading: every Person is normalized through `migratePerson`
    //     which fills in missing fields with defaults. Adding a Person field
    //     does NOT require bumping schema as long as the new field has a
    //     sensible default.
    //   • Storage budget: localStorage caps at ~5MB. We expose used bytes
    //     in the save UI so the player can see usage.
    //   • Export/import: each save can be written to or read from a .json file.
    //
    // Key naming:
    //   legacy:autosave       — the auto-save (single slot)
    //   legacy:slot:1 .. 10   — manual slots
    //   legacy:meta           — { schema, lastSlotUsed }
    //
    // To inspect a save in DevTools console:
    //   inspectSave('legacy:slot:1')

    const SAVE_SCHEMA      = 28;
    const SAVE_SLOT_COUNT  = 10;
    const SAVE_KEY_PREFIX  = 'legacy';
    const SAVE_KEY_AUTO    = `${SAVE_KEY_PREFIX}:autosave`;
    const SAVE_KEY_SLOT    = i => `${SAVE_KEY_PREFIX}:slot:${i}`;
    const STORAGE_BUDGET   = 5 * 1024 * 1024;   // 5MB nominal localStorage cap

    // Default field values — canonical copy in state/person.js (PERSON_DEFAULTS).
    // Kept here for migratePerson until save load fully uses state/person.js.
    const PERSON_DEFAULTS = {
      firstName: '', surname: '', maidenName: null,
      sex: 'M', age: 0, generation: 0,
      isPlayer: false, isAlive: true,
      entity: 'mortal',
      parentIds: [], childIds: [],
      spouseIds: [], exSpouseIds: [], loverIds: [], friendIds: [], enemyIds: [],
      isVampire: false, sireId: null, childerIds: [], yearTurned: null,
      minionIds: [], masterId: null, minionType: null,
      yearBorn: null, yearDied: null,
      health: 100,
      charisma: 50, intelligence: 50, wealth: 0, insight: 0, cunning: 0,
      prowessBase: 0, prowessBonus: 0,
      fertilityBase: 80, vampireFertilityBonus: 0,
      pregnant: { active: false, conceivedYear: null, fatherId: null },
      birthStats: null,
      // Career fields (Layer 1: assignment + display only).
      //   career: { id: string, since: number } | null
      //     id matches a CAREERS entry; since is the game year they started.
      //   careerPickAge: number
      //     The age at which this NPC will be assigned their career. Rolled
      //     once at person creation, falls in [18, 30] for most NPCs but is
      //     overridden by per-career startAge ranges at assignment time.
      //     Children get this rolled at birth so we don't need to remember
      //     to roll it later.
      career: null,
      careerPickAge: 18,
      // Education (Layer 4a: primary + secondary schooling).
      //   stage: 'none' | 'primary' | 'secondary' | 'completed' | 'dropped_out'
      //   since: game year they entered the current stage
      // Auto-progression on age boundaries:
      //   age 6  → 'primary'
      //   age 12 → 'secondary'
      //   age 18 → 'completed' (unless dropped out)
      // The player can drop out from the Vocation > Education tab between 12 and 17.
      // NPCs auto-graduate (Layer 4a is player-driven for choices; NPCs
      // get the schooling stat-drips but not the decision).
      education: { stage: 'none', since: null, track: null },
      traits: [],
      // Situations (Layer ~4c): blocking prompts that demand the player's
      // attention before Pass-the-Year is re-enabled. NPCs never have
      // situations; the array is on the schema for migration uniformity
      // but only the player ever populates it. Each entry shape:
      //   { instanceId, templateId, firedYear, unread? }
      // The template (in SITUATIONS) defines title, body, buttons, and
      // per-button apply functions. Resolving removes the entry.
      situations: [],
      resolvedSituations: {},
      patronArc: null,
      mudlarkLockbox: null,
      prison: null,
      actionPoints: 20,
      actionPointsMax: 20,
      hobbies: {},
      items: [],
    };

    // Fold a legacy situationLog[] into the resolvedSituations ledger (keyed by
    // templateId, gating-only, never displayed) and drop the old array.
    function foldSituationLogToLedger(p) {
      if (!p.resolvedSituations || typeof p.resolvedSituations !== 'object'
          || Array.isArray(p.resolvedSituations)) {
        p.resolvedSituations = {};
      }
      if (Array.isArray(p.situationLog)) {
        for (const entry of p.situationLog) {
          const id = entry?.templateId;
          if (!id) continue;
          const cur = p.resolvedSituations[id];
          if (cur) {
            cur.count = (cur.count || 0) + 1;
            cur.lastYear = entry.year ?? cur.lastYear;
          } else {
            p.resolvedSituations[id] = {
              firstYear: entry.year ?? null,
              lastYear: entry.year ?? null,
              count: 1,
            };
          }
        }
        delete p.situationLog;
      }
    }

    // Fill in any missing fields on a loaded Person with defaults. Mutates
    // the input. Idempotent.
    function migratePerson(p) {
      for (const [key, def] of Object.entries(PERSON_DEFAULTS)) {
        if (!(key in p)) {
          // Deep-clone arrays/objects so different people don't share a reference
          p[key] = (def && typeof def === 'object') ? structuredClone(def) : def;
        }
      }
      if (!Array.isArray(p.traits)) p.traits = [];
      foldSituationLogToLedger(p);
      if (!('patronArc' in p)) p.patronArc = null;
      if (!('mudlarkLockbox' in p)) p.mudlarkLockbox = null;
      if (!('prison' in p)) p.prison = null;
      if (!Array.isArray(p.items)) p.items = [];
      if (p.education && !('track' in p.education)) p.education.track = null;
      migratePatronJailToPrison(p);
      migrateMudlarkLockboxToItems(p);
      migratePatronRelicToItem(p);
      migrateLegacyItemAcquireBonuses(p);
      migrateTraitIds(p);
      assignRandomHumor(p);
      if (Array.isArray(p.situations)) {
        p.situations = p.situations.filter((s) => s.templateId !== 'mudlarks_lockbox');
      }
      return p;
    }

    // Run any cross-version migrations on a loaded save object.
    //
    //   schema 1 → 2: introduced era system. The calendar timeline shifted from
    //     starting at 1990 to starting at 1800. Old saves keep their year value
    //     intact — a save made in 1995 still loads as 1995, and currentEra() will
    //     resolve it to the 1950 era chunk. No data transformation needed.
    //
    //   schema 2 → 3: introduced career system (Layer 1). Person now has a
    //     career field. Backfill: every non-player adult NPC without a career
    //     and past their careerPickAge gets one assigned via pickCareerForNPC.
    //     Player stays null; their career system arrives in a later layer.
    //     careerPickAge defaults to 18 via PERSON_DEFAULTS, then is re-rolled
    //     here for accuracy (the default is fine for new persons but a loaded
    //     adult NPC needs the proper [18,30] roll so backfill doesn't fire
    //     immediately for everyone).
    //
    //   schema 3 → 4: introduced career progression (Layer 2). career objects
    //     gain `rank` and `yearsAtRank`. For existing careers we derive a
    //     plausible rank from time-since-career-start (roughly one tier per
    //     decade in role, soft-capped to keep loaded saves consistent). The
    //     yearsAtRank is set to the remainder so the next promotion roll fires
    //     on a reasonable cadence rather than immediately.
    //
    //   schema 4 → 5: introduced education stages (Layer 4a). Person gains an
    //     `education: { stage, since }` field. Backfill derives stage from age.
    //
    //   schema 5 → 6: introduced higher-education stages (Layer 4b). New
    //     stages 'baccalaureate_in_progress', 'baccalaureate', etc. No
    //     backfill needed — no person could have those stages before.
    //
    //   schema 6 → 7: introduced Situations system. Every person gains a
    //     `situations: []` array for active blocking prompts. Old saves
    //     don't retroactively fire any situations.
    //
    // Future migrations append below.
    //
    //   if (save.schema < 8) { ...; save.schema = 8; }
    function migrateSave(save) {
      // schema 1 → 2: no field rewrites needed. The schema bump is a marker so
      // that the rest of the system knows era-aware code paths are available.
      // Old year values pass through untouched.

      if (save.schema < 3) {
        // Re-roll careerPickAge for everyone (the default 18 from
        // PERSON_DEFAULTS would otherwise make every old adult eligible
        // immediately, which is correct for backfill but means children
        // would all be assigned at exactly 18 going forward — we want the
        // proper spread).
        for (const p of save.people) {
          if (p.careerPickAge === 18) {
            // Spread 18-30 for the proper distribution. We can't tell which
            // ones already had this field meaningfully set, so we reroll all
            // 18s on the assumption that no one rolled this field before
            // schema 3 (they didn't — it didn't exist).
            p.careerPickAge = 18 + Math.floor(Math.random() * 13);
          }
        }
        // Backfill careers for adult NPCs who have already passed their pick age.
        for (const p of save.people) {
          if (!p.isPlayer && p.isAlive && p.career == null && p.age >= p.careerPickAge) {
            const careerId = pickCareerForNPC(p, save.year);
            if (careerId) {
              p.career = { id: careerId, since: save.year - Math.min(p.age - p.careerPickAge, 5) };
            }
          }
        }
      }

      if (save.schema < 4) {
        // For each existing career, derive rank and yearsAtRank.
        // Heuristic: one rank tier per ~10 years in career, capped by the
        // career's actual rankLadder length. yearsAtRank gets the leftover
        // so the next promotion check fires at the natural cadence.
        for (const p of save.people) {
          if (!p.career) continue;
          if (typeof p.career.rank !== 'number') {
            const yearsInCareer = Math.max(0, save.year - (p.career.since || save.year));
            const career = CAREERS_BY_ID[p.career.id];
            const maxRank = career ? Math.max(0, career.rankLadder.length - 1) : 0;
            // Soft cap: even an old NPC doesn't auto-jump to the top — they
            // had to earn ranks. Cap at floor(years / 10), bounded by maxRank.
            const derivedRank = Math.min(maxRank, Math.floor(yearsInCareer / 10));
            p.career.rank = derivedRank;
            p.career.yearsAtRank = yearsInCareer % 10;
          }
        }
      }

      if (save.schema < 5) {
        // Backfill education stage from age. Old saves had no education
        // tracking, so we derive a stage that matches the person's current
        // age bracket. The `since` is approximated to the year they would
        // have entered that stage.
        for (const p of save.people) {
          if (p.education && p.education.stage && p.education.stage !== 'none') continue;
          const stage =
            p.age < 6   ? 'none' :
            p.age < 12  ? 'primary' :
            p.age < 17  ? 'secondary' :
                          'completed';
          const sinceAge =
            stage === 'primary'   ? 6 :
            stage === 'secondary' ? 12 :
            stage === 'completed' ? 17 :
                                    null;
          const since = (sinceAge != null) ? save.year - (p.age - sinceAge) : null;
          p.education = { stage, since };
        }
      }

      if (save.schema < 6) {
        // Higher education tiers (baccalaureate / licentiate / doctorate)
        // didn't exist before schema 6. No old person could have those
        // stages, so the migration is a no-op. We bump the schema marker
        // so the rest of the system knows higher-ed code paths are
        // available.
      }

      if (save.schema < 7) {
        // Situations didn't exist before schema 7. Initialize the empty
        // array on every person. We don't retroactively fire any situations
        // for existing players — going back in time and saying "by the way
        // you have an unresolved school-starting choice from your childhood"
        // would be jarring. Old saves keep their unmarked history.
        for (const p of save.people) {
          if (!Array.isArray(p.situations)) p.situations = [];
        }
      }

      if (save.schema < 8) {
        // Annals / event log were DOM-only before schema 8. Old saves start
        // with an empty log — we can't reconstruct what was already lost.
        if (!Array.isArray(save.eventLog)) save.eventLog = [];
      }

      if (save.schema < 9) {
        if (save.annalsCandidate !== null && typeof save.annalsCandidate !== 'object') {
          save.annalsCandidate = null;
        }
        if (!('annalsCandidate' in save)) save.annalsCandidate = null;
      }

      if (save.schema < 10) {
        for (const p of save.people) {
          migratePerson(p);
        }
      }

      if (save.schema < 11) {
        for (const p of save.people) {
          if (!Array.isArray(p.situationLog)) p.situationLog = [];
        }
      }

      if (save.schema < 13) {
        for (const p of save.people) {
          if (!('prison' in p)) p.prison = null;
          migratePatronJailToPrison(p, save.year);
        }
      }

      if (save.schema < 14) {
        for (const p of save.people) {
          if (!Array.isArray(p.items)) p.items = [];
        }
      }

      if (save.schema < 15) {
        for (const p of save.people) {
          migratePatronRelicToItem(p);
        }
      }

      if (save.schema < 16) {
        const player = save.people.find((p) => p.isPlayer);
        if (player) {
          migratePlayerRelationships(player, save.year, save.people);
        }
      }

      if (save.schema < 17) {
        const player = save.people.find((p) => p.isPlayer);
        if (player) {
          migratePlayerRelationships(player, save.year, save.people);
        }
      }

      if (save.schema < 18) {
        backfillNpcHumors(save.people);
      }

      if (save.schema < 19) {
        backfillMarriageWealth(save.people);
      }

      if (save.schema < 20) {
        const byId = Object.fromEntries((save.people || []).map((p) => [p.id, p]));
        sanitizePregnancies(save.people, (id) => byId[id]);
      }

      if (save.schema < 21) {
        const player = save.people.find((p) => p.isPlayer);
        if (player) backfillRelationshipEdgeFloors(player);
      }

      if (save.schema < 22) {
        if (!Array.isArray(save.memories)) save.memories = [];
        delete save.annalsCandidate;
      }

      if (save.schema < 26) {
        // Situation Log retired as a display surface. Fold each person's
        // situationLog[] into the resolvedSituations ledger (gating-only).
        for (const p of save.people) {
          foldSituationLogToLedger(p);
        }
      }

      if (save.schema < 27) {
        for (const p of save.people) {
          migratePersonInventory(p);
          if (!p._possessionItemBonuses) {
            migrateLegacyItemAcquireBonuses(p);
          }
        }
      }

      if (save.schema < 28) {
        for (const p of save.people) {
          if (typeof p.cunning !== 'number') {
            const insight = p.insight ?? 0;
            const age = p.age ?? 0;
            // BALANCE: provisional — adults get a small baseline from insight
            p.cunning = age >= 12 ? Math.min(15, Math.round(insight * 0.15)) : 0;
          }
        }
      }

      // Always end by stamping current schema.
      save.schema = SAVE_SCHEMA;
      return save;
    }

    // ── Settings ───────────────────────────────────────────────
    //
    // User preferences. Distinct from game state in that they:
    //   • Persist across all games and sessions (one settings object in
    //     localStorage, separate from saves).
    //   • Apply to the DOM, not the world model.
    //   • Aren't versioned or migrated — old shapes are merged with defaults
    //     at load time and unknown keys are ignored.
    //
    // Schema-light by design: the structure is just a flat object of
    // key→value pairs. Add a new setting by adding a SETTINGS_DEFAULTS key,
    // a UI control in the overlay, and an applySettings() branch if it
    // needs to do something DOM-side.
    const SETTINGS_DEFAULTS = {
      // Display
      reduceMotion: false,    // disables animations (pulse, hovers, fades)
      showGrain:  true,       // background noise overlay
      // Testing / debug
      testingCheats: false,  // when on, shows the Debug settings section
    };

    const SETTINGS_STORAGE_KEY = 'legacy_settings_v1';

    // Live settings state. Mutated by the settings UI; persisted on every
    // change via saveSettings(). On first load, falls back to defaults.
    let G_SETTINGS = { ...SETTINGS_DEFAULTS };

    function loadSettings() {
      try {
        const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          // Merge into defaults — unknown keys ignored, missing keys default.
          // This is the implicit migration for old settings shapes.
          G_SETTINGS = { ...SETTINGS_DEFAULTS, ...parsed };
        }
      } catch (e) {
        // Corrupt settings — log and fall back to defaults rather than
        // refusing to boot.
        console.warn('Settings load failed, using defaults:', e);
        G_SETTINGS = { ...SETTINGS_DEFAULTS };
      }
    }

    function saveSettings() {
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(G_SETTINGS));
      } catch (e) {
        // localStorage quota or denied. Don't break the UI — settings just
        // won't persist this session.
        console.warn('Settings save failed:', e);
      }
    }

    // Apply current settings to the DOM. Idempotent; safe to call any time.
    // Drives presentation via classes on <body> so any styled element can
    // react. CSS hooks expected:
    //   body.reduce-motion       — disables animations (the pending-pulse
    //                              keyframes, card hover lifts, modal fades)
    //   body.no-grain            — hides the body::before noise overlay
    function applySettings() {
      const body = document.body;
      if (!body) return;
      body.classList.toggle('reduce-motion', !!G_SETTINGS.reduceMotion);
      body.classList.toggle('no-grain',     !G_SETTINGS.showGrain);
    }

    // Mutate one setting + persist + apply. The single funnel for changes.
    function updateSetting(key, value) {
      if (!(key in SETTINGS_DEFAULTS)) return;
      G_SETTINGS[key] = value;
      saveSettings();
      applySettings();
    }

    // Open/close the settings overlay. The overlay HTML is built dynamically
    // from G_SETTINGS each open so controls always reflect the live state.
    function openSettings() {
      const overlay = document.getElementById('settings-overlay');
      if (!overlay) return;
      resetReturnToMenuConfirm('settings-return-btn', 'settings-return-confirm');
      setReturnToMenuFooterVisible('settings-modal-footer');
      renderSettings();
      overlay.classList.add('active');
    }

    function closeSettings() {
      const overlay = document.getElementById('settings-overlay');
      if (overlay) overlay.classList.remove('active');
    }

    // Render the overlay's body content. Rebuilds on every open so the
    // controls reflect any changes since last open (e.g. settings imported
    // from a future feature, or a different tab having mutated localStorage).
    function renderSettings() {
      const modal = document.getElementById('settings-modal-body');
      if (!modal) return;

      // Helper to build a toggle row
      const toggleRow = (key, label, hint) => `
        <div class="settings-row">
          <div class="settings-row-label">
            ${escapeHtml(label)}
            ${hint ? `<div class="settings-row-hint">${escapeHtml(hint)}</div>` : ''}
          </div>
          <div class="settings-row-controls">
            <label class="settings-toggle">
              <input type="checkbox" data-setting="${escapeHtml(key)}" ${G_SETTINGS[key] ? 'checked' : ''}>
              <span class="settings-toggle-slider"></span>
            </label>
          </div>
        </div>`;

      modal.innerHTML = `
        <div class="settings-section">
          <div class="settings-section-title">Display</div>
          ${toggleRow('reduceMotion', 'Reduce Motion', 'Disable pulses, hover lifts, and transitions.')}
          ${toggleRow('showGrain',    'Background Grain', 'Subtle film-grain overlay across the page.')}
        </div>

        <div class="settings-section">
          ${toggleRow('testingCheats', 'Testing (cheats)', 'Show debug tools and cheat buttons for development.')}
        </div>

        ${G_SETTINGS.testingCheats ? `
        <div class="settings-section" data-settings-section="debug">
          <div class="settings-section-title">Debug</div>
          <div class="settings-row" data-settings-row="debug-embrace">
            <div class="settings-row-label">
              Embrace Toggle
              <div class="settings-row-hint">Flip between mortal and vampire mode (testing). Will be replaced by an in-game event.</div>
            </div>
            <div class="settings-row-controls">
              <button class="settings-action-btn" id="settings-embrace-btn">${escapeHtml(currentMode() === 'vampire' ? 'Make Mortal' : 'Embrace')}</button>
            </div>
          </div>
          ${renderDebugImmersiveEventsSection()}
        </div>
        ` : ''}
      `;

      // Wire toggles
      modal.querySelectorAll('input[type="checkbox"][data-setting]').forEach(cb => {
        cb.addEventListener('change', () => {
          updateSetting(cb.dataset.setting, cb.checked);
          if (cb.dataset.setting === 'testingCheats') {
            renderSettings();
            render();
          }
        });
      });

      // Wire embrace
      const embraceBtn = document.getElementById('settings-embrace-btn');
      if (embraceBtn) {
        embraceBtn.addEventListener('click', () => {
          // Same handler as the old sidebar debug toggle.
          if (typeof toggleEmbrace === 'function') {
            toggleEmbrace();
            // Refresh the overlay label to match new mode.
            renderSettings();
          }
        });
      }

      modal.querySelectorAll('[data-debug-event]').forEach(btn => {
        btn.addEventListener('click', () => {
          const templateId = btn.getAttribute('data-debug-event');
          closeSettings();
          debugFireImmersiveEvent(templateId);
        });
      });

      modal.querySelectorAll('[data-debug-prison]').forEach(btn => {
        btn.addEventListener('click', () => {
          const years = parseInt(btn.getAttribute('data-debug-prison'), 10) || 2;
          closeSettings();
          debugEnterPrison(years);
        });
      });
      modal.querySelector('[data-debug-prison-release]')?.addEventListener('click', () => {
        closeSettings();
        debugReleasePrison();
      });

      modal.querySelectorAll('[data-debug-item]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const itemId = btn.getAttribute('data-debug-item');
          const action = btn.getAttribute('data-debug-item-action');
          const player = getPlayer();
          if (!player) return;
          closeSettings();
          if (action === 'grant') grantItem(player, itemId);
          else removeItem(player, itemId);
          render();
        });
      });
      modal.querySelector('[data-debug-item-clear]')?.addEventListener('click', () => {
        const player = getPlayer();
        if (!player) return;
        closeSettings();
        clearItems(player);
        render();
      });
    }

    // Snapshot the current game into a serializable object.
    // Captures world state + UI state needed to restore the view.
    function snapshotGame() {
      const player = getPlayer();
      return {
        schema:        SAVE_SCHEMA,
        savedAt:       Date.now(),
        // World state
        year:          G.year,
        surname:       G.surname,
        people:        G.people,
        pendingSiblings: G.pendingSiblings,
        eventLog:      G.eventLog || [],
        memories:      G.memories || [],
        school:        G.school || null,
        nextId:        _id,
        // Player-level metadata for slot display
        meta: {
          playerName:    player ? `${player.firstName} ${player.surname}` : 'Unknown',
          playerAge:     player ? player.age : 0,
          playerYear:    G.year,
          playerVampire: player ? !!player.isVampire : false,
          playerAlive:   player ? !!player.isAlive : false,
        },
      };
    }

    // Apply a loaded save to game state. Caller is responsible for ensuring
    // the save object has been migrated already.
    function applySave(save) {
      G.year            = save.year;
      G.surname         = save.surname;
      G.people          = (save.people || []).map(migratePerson);
      G.pendingSiblings = save.pendingSiblings || [];
      G.eventLog        = save.eventLog || [];
      G.memories        = save.memories || [];
      G.school          = save.school || null;
      // Normalize the school shape (no generation here — the next year tick
      // populates a cohort for an old in-school save). Safe across save round-trips.
      if (G.school) ensureSchoolState();
      syncMemoryIdFromSave(G.memories);
      setNextId(save.nextId || G.people.reduce((m, p) => Math.max(m, p.id), 0));
    }

    // Try to write a save to localStorage. Returns { ok, error? }.
    // Handles quota errors and other failures gracefully.
    function writeSave(key, saveObj) {
      try {
        const json = JSON.stringify(saveObj);
        localStorage.setItem(key, json);
        return { ok: true, size: json.length };
      } catch (err) {
        const msg = (err && err.name === 'QuotaExceededError')
          ? 'Out of storage — delete a save to free space.'
          : `Save failed: ${err.message || err}`;
        return { ok: false, error: msg };
      }
    }

    // Try to read a save. Returns the parsed+migrated object, or null.
    function readSave(key) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const obj = JSON.parse(raw);
        return migrateSave(obj);
      } catch (err) {
        console.warn(`Failed to read save '${key}':`, err);
        return null;
      }
    }

    function deleteSave(key) {
      try { localStorage.removeItem(key); return { ok: true }; }
      catch (err) { return { ok: false, error: err.message || String(err) }; }
    }

    // List all known save slots. Returns array of { key, slot, isAuto, save? }.
    // `save` is null for empty slots.
    function listSaves() {
      const slots = [];
      slots.push({ key: SAVE_KEY_AUTO, slot: 0, isAuto: true, save: readSave(SAVE_KEY_AUTO) });
      for (let i = 1; i <= SAVE_SLOT_COUNT; i++) {
        const key = SAVE_KEY_SLOT(i);
        slots.push({ key, slot: i, isAuto: false, save: readSave(key) });
      }
      return slots;
    }

    // Sum the bytes used across all our save keys.
    function storageUsedBytes() {
      let total = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith(SAVE_KEY_PREFIX)) continue;
        const v = localStorage.getItem(k);
        if (v) total += k.length + v.length;
      }
      return total;
    }

    // Save to a specific slot. `slotIndex` 0 = autosave; 1..N = manual slot.
    // `customName` overrides the auto-derived slot name (stored in save.meta.label).
    function saveToSlot(slotIndex, customName) {
      const key = slotIndex === 0 ? SAVE_KEY_AUTO : SAVE_KEY_SLOT(slotIndex);
      const save = snapshotGame();
      if (customName) save.meta.label = customName;
      return writeSave(key, save);
    }

    // Load a specific slot into the active game and switch to the game screen.
    // Returns { ok, error? }.
    function loadFromSlot(slotIndex) {
      const key = slotIndex === 0 ? SAVE_KEY_AUTO : SAVE_KEY_SLOT(slotIndex);
      const save = readSave(key);
      if (!save) return { ok: false, error: 'Slot is empty.' };
      applySave(save);
      enterGameScreen();
      return { ok: true };
    }

    // Auto-save fires from ageUp after a successful year-tick.
    function autoSave() {
      const result = saveToSlot(0);
      if (!result.ok) {
        // Don't toast on auto-save failure — it's noisy. Log to console instead.
        console.warn('Auto-save failed:', result.error);
      }
    }

    // Build the default slot label from save metadata.
    //   "Eleanor Ashford · Age 47 · 2037"
    function defaultLabel(save) {
      const m = save.meta || {};
      const parts = [];
      if (m.playerName)  parts.push(m.playerName);
      if (typeof m.playerAge === 'number') parts.push(`Age ${m.playerAge}`);
      if (m.playerYear)  parts.push(String(m.playerYear));
      return parts.join(' · ');
    }

    // Human-readable real-world timestamp for a save.
    function formatSavedAt(ms) {
      const d = new Date(ms);
      return d.toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    }

    // Dev helper — inspect a save in the console.
    window.inspectSave = function (key) {
      const save = readSave(key || SAVE_KEY_AUTO);
      console.log(save);
      return save;
    };

    // ── Export / Import ────────────────────────────────────────
    // Export: triggers a file download of the current game's save.
    function exportCurrentSaveToFile() {
      const save = snapshotGame();
      const blob = new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      const player = getPlayer();
      const name = player ? `${player.firstName}-${player.surname}` : 'legacy';
      a.href = url;
      a.download = `${name}-y${G.year}.legacy.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    // Import: read a save file and apply it. Used both from the title screen
    // (no game running yet) and from the in-game overlay (overwrites current).
    function importSaveFromFile(file, onDone) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const save = migrateSave(JSON.parse(reader.result));
          applySave(save);
          enterGameScreen();
          onDone?.({ ok: true });
        } catch (err) {
          onDone?.({ ok: false, error: 'That file isn\'t a valid save.' });
        }
      };
      reader.onerror = () => onDone?.({ ok: false, error: 'Couldn\'t read the file.' });
      reader.readAsText(file);
    }

    // ── Save overlay UI ────────────────────────────────────────
    // `mode` ∈ 'save' | 'load' — controls which slot actions are offered.
    let saveOverlayMode = 'save';

    function resetReturnToMenuConfirm(btnId, confirmId) {
      const returnConfirm = document.getElementById(confirmId);
      const returnBtn     = document.getElementById(btnId);
      if (returnConfirm) returnConfirm.classList.remove('visible');
      if (returnBtn)     returnBtn.style.display = '';
    }

    function setReturnToMenuFooterVisible(footerId) {
      const footer = document.getElementById(footerId);
      if (!footer) return;
      const inGame = document.getElementById('game-screen').classList.contains('active');
      footer.style.display = inGame ? '' : 'none';
    }

    function wireReturnToMenuConfirm({ btnId, confirmId, cancelId, yesId }) {
      const returnBtn       = document.getElementById(btnId);
      const returnConfirm   = document.getElementById(confirmId);
      const returnYesBtn    = document.getElementById(yesId);
      const returnCancelBtn = document.getElementById(cancelId);
      if (!returnBtn || !returnConfirm || !returnYesBtn || !returnCancelBtn) return;

      returnBtn.addEventListener('click', () => {
        returnConfirm.classList.add('visible');
        returnBtn.style.display = 'none';
      });
      returnCancelBtn.addEventListener('click', () => {
        returnConfirm.classList.remove('visible');
        returnBtn.style.display = '';
      });
      returnYesBtn.addEventListener('click', () => {
        returnToMainMenu();
      });
    }

    function openSaveOverlay(mode) {
      saveOverlayMode = mode;
      document.getElementById('save-overlay').classList.add('active');
      document.getElementById('save-modal-title').textContent =
        mode === 'save' ? 'Save Game' : 'Load Game';

      resetReturnToMenuConfirm('save-return-btn', 'save-return-confirm');
      setReturnToMenuFooterVisible('save-modal-footer');

      renderSaveOverlay();
    }

    function closeSaveOverlay() {
      document.getElementById('save-overlay').classList.remove('active');
    }

    function renderSaveOverlay() {
      const slots = listSaves();
      const container = document.getElementById('save-slots');

      container.innerHTML = slots.map(s => slotRowHtml(s)).join('');

      // Wire row actions
      container.querySelectorAll('[data-slot-action]').forEach(btn => {
        const action  = btn.dataset.slotAction;
        const slotIdx = parseInt(btn.dataset.slotIndex, 10);
        btn.addEventListener('click', () => handleSlotAction(action, slotIdx));
      });

      // Wire rename inputs
      container.querySelectorAll('.save-slot-name-input').forEach(input => {
        const slotIdx = parseInt(input.dataset.slotIndex, 10);
        input.addEventListener('blur', () => commitRename(slotIdx, input.value));
        input.addEventListener('keydown', e => {
          if (e.key === 'Enter') input.blur();
          if (e.key === 'Escape') { input.value = input.dataset.original; input.blur(); }
        });
      });

      // Storage meter
      const used = storageUsedBytes();
      const pct  = Math.min(100, (used / STORAGE_BUDGET) * 100);
      document.getElementById('save-storage-fill').style.width = `${pct}%`;
      document.getElementById('save-storage-text').textContent =
        `${formatBytes(used)} / ${formatBytes(STORAGE_BUDGET)}`;
    }

    function slotRowHtml(s) {
      const isAuto = s.isAuto;
      const filled = !!s.save;
      const label  = isAuto ? 'AUTO' : `${s.slot}`;
      const cls    = ['save-slot', isAuto ? 'autosave' : '', filled ? '' : 'empty'].filter(Boolean).join(' ');

      if (!filled) {
        // Empty slot: only offer "Save here" in save mode.
        const action = (saveOverlayMode === 'save' && !isAuto)
          ? `<button class="save-slot-btn primary" data-slot-action="save" data-slot-index="${s.slot}">Save Here</button>`
          : '';
        const emptyText = isAuto ? 'No auto-save yet.' : 'Empty slot.';
        return `<div class="${cls}">
          <div class="save-slot-num">${label}</div>
          <div class="save-slot-info"><div class="save-slot-empty-text">${emptyText}</div></div>
          <div class="save-slot-actions">${action}</div>
        </div>`;
      }

      const save  = s.save;
      const meta  = save.meta || {};
      const name  = meta.label || defaultLabel(save);
      const time  = formatSavedAt(save.savedAt || 0);
      const deceased = meta.playerAlive === false ? ' · deceased' : '';
      const vamp     = meta.playerVampire ? ' · vampire' : '';

      // Action set depends on overlay mode and whether the slot is auto.
      const actions = [];
      if (saveOverlayMode === 'save' && !isAuto) {
        actions.push(`<button class="save-slot-btn primary" data-slot-action="save" data-slot-index="${s.slot}">Overwrite</button>`);
      }
      actions.push(`<button class="save-slot-btn" data-slot-action="load" data-slot-index="${s.slot}">Load</button>`);
      if (!isAuto) {
        actions.push(`<button class="save-slot-btn danger" data-slot-action="delete" data-slot-index="${s.slot}">Delete</button>`);
      }

      // Rename input (only for non-auto slots)
      const nameRow = isAuto
        ? `<div class="save-slot-name">${escapeHtml(name)}</div>`
        : `<div class="save-slot-name">
             <input type="text" class="save-slot-name-input"
                    value="${escapeHtml(name)}"
                    data-original="${escapeHtml(name)}"
                    data-slot-index="${s.slot}" />
           </div>`;

      return `<div class="${cls}">
        <div class="save-slot-num">${label}</div>
        <div class="save-slot-info">
          ${nameRow}
          <div class="save-slot-meta">${escapeHtml(time)}${escapeHtml(vamp)}${escapeHtml(deceased)}</div>
        </div>
        <div class="save-slot-actions">${actions.join('')}</div>
      </div>`;
    }

    function handleSlotAction(action, slotIdx) {
      if (action === 'save') {
        if (slotIdx === 0) return;   // can't manually save to autosave
        // Use existing label if any (preserves rename).
        const existing = readSave(SAVE_KEY_SLOT(slotIdx));
        const label = existing?.meta?.label;
        const result = saveToSlot(slotIdx, label);
        if (result.ok) { showToast('Game saved.'); renderSaveOverlay(); }
        else           { showToast(result.error, true); }
      }
      else if (action === 'load') {
        const result = loadFromSlot(slotIdx);
        if (result.ok) { closeSaveOverlay(); showToast('Game loaded.'); }
        else           { showToast(result.error, true); }
      }
      else if (action === 'delete') {
        if (!confirm('Delete this save? This cannot be undone.')) return;
        const result = deleteSave(SAVE_KEY_SLOT(slotIdx));
        if (result.ok) { showToast('Save deleted.'); renderSaveOverlay(); }
        else           { showToast(result.error, true); }
      }
    }

    // Commit a slot rename to its underlying save object. No-op if value
    // is unchanged or slot is empty.
    function commitRename(slotIdx, value) {
      const key = SAVE_KEY_SLOT(slotIdx);
      const save = readSave(key);
      if (!save) return;
      const trimmed = (value || '').trim();
      const next = trimmed || defaultLabel(save);
      if ((save.meta?.label || defaultLabel(save)) === next) return;
      save.meta = save.meta || {};
      save.meta.label = next;
      writeSave(key, save);
    }

    // ── Toast ──────────────────────────────────────────────────
    let _toastTimer = null;
    function showToast(message, isError = false) {
      const t = document.getElementById('save-toast');
      if (!t) return;
      t.textContent = message;
      t.classList.toggle('error', isError);
      t.classList.add('show');
      clearTimeout(_toastTimer);
      _toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
    }

    function formatBytes(n) {
      if (n < 1024) return `${n} B`;
      if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
      return `${(n / (1024 * 1024)).toFixed(2)} MB`;
    }

    // ── Wire one-time overlay handlers ─────────────────────────
    function wireSaveOverlay() {
      document.getElementById('save-modal-close').addEventListener('click', closeSaveOverlay);

      // Click outside modal to close
      document.getElementById('save-overlay').addEventListener('click', e => {
        if (e.target.id === 'save-overlay') closeSaveOverlay();
      });

      // Escape to close
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && document.getElementById('save-overlay').classList.contains('active')) {
          closeSaveOverlay();
        }
      });

      // Export
      document.getElementById('save-action-export').addEventListener('click', () => {
        exportCurrentSaveToFile();
        showToast('Save exported.');
      });

      // Import
      const importInput = document.getElementById('save-import-input');
      document.getElementById('save-action-import').addEventListener('click', () => importInput.click());
      importInput.addEventListener('change', e => {
        const file = e.target.files?.[0];
        if (!file) return;
        importSaveFromFile(file, result => {
          if (result.ok) { closeSaveOverlay(); showToast('Save imported.'); }
          else           { showToast(result.error, true); }
        });
        importInput.value = '';
      });

      // Return to Main Menu — two-step confirm (save + settings overlays).
      wireReturnToMenuConfirm({
        btnId: 'save-return-btn',
        confirmId: 'save-return-confirm',
        cancelId: 'save-return-cancel',
        yesId: 'save-return-yes',
      });
    }

    // Navigate from in-game back to the title screen. Closes the save
    // overlay first (it might be open), hides the game screen, shows the
    // title screen, and refreshes the title screen's Continue/Load button
    // states so they reflect the current save inventory.
    //
    // Notably does NOT reset G or wipe gameplay state — the game is left
    // frozen in memory. The player resumes from autosave via Continue,
    // which is the cleanest "no surprises" model: what's preserved is
    // what's been saved, what's lost is what hasn't.
    function returnToMainMenu() {
      resetReturnToMenuConfirm('save-return-btn', 'save-return-confirm');
      resetReturnToMenuConfirm('settings-return-btn', 'settings-return-confirm');

      closeSaveOverlay();
      closeSettings();
      document.getElementById('game-screen').classList.remove('active');
      document.getElementById('creation-screen').classList.remove('active');
      document.getElementById('title-screen').classList.add('active');
      refreshTitleButtons();
    }

    function proceedToCharacterCreation() {
      resetCharacterCreation();
      document.getElementById('title-screen')?.classList.remove('active');
      document.getElementById('creation-screen')?.classList.add('active');
    }

    // ── Title screen ───────────────────────────────────────────
    function wireTitleScreen() {
      // New game → character creation (or straight into game when testing)
      document.getElementById('title-new-game').addEventListener('click', () => {
        if (SKIP_CREATION_FOR_TESTING) {
          startGame();
          return;
        }
        proceedToCharacterCreation();
      });

      // Continue → load autosave
      document.getElementById('title-continue').addEventListener('click', () => {
        const result = loadFromSlot(0);
        if (!result.ok) showToast(result.error, true);
      });

      // Load → open overlay in load mode (transitions to game on selection)
      document.getElementById('title-load').addEventListener('click', () => {
        openSaveOverlay('load');
      });

      // Import from file (title screen variant — separate input for first-load case)
      const fileInput = document.getElementById('title-import-input');
      document.getElementById('title-import').addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', e => {
        const file = e.target.files?.[0];
        if (!file) return;
        importSaveFromFile(file, result => {
          if (result.ok) showToast('Save imported.');
          else           showToast(result.error, true);
        });
        fileInput.value = '';
      });

      // Settings → open settings overlay. Reachable from both title screen
      // and in-game sidebar; same overlay both places.
      document.getElementById('title-settings').addEventListener('click', openSettings);

      // Update Continue / Load button states from current save inventory.
      refreshTitleButtons();
    }

    function refreshTitleButtons() {
      const auto = readSave(SAVE_KEY_AUTO);
      const continueBtn = document.getElementById('title-continue');
      const continueSub = document.getElementById('title-continue-sub');

      if (auto && auto.meta) {
        continueBtn.classList.remove('disabled');
        const m = auto.meta;
        const parts = [];
        if (m.playerName) parts.push(m.playerName);
        if (m.playerYear) parts.push(String(m.playerYear));
        continueSub.textContent = parts.join(' · ') || defaultLabel(auto);
      } else {
        continueBtn.classList.add('disabled');
        continueSub.textContent = 'No auto-save found';
      }

      // Count non-empty manual slots
      let count = 0;
      for (let i = 1; i <= SAVE_SLOT_COUNT; i++) {
        if (readSave(SAVE_KEY_SLOT(i))) count++;
      }
      const loadBtn = document.getElementById('title-load');
      const loadSub = document.getElementById('title-load-sub');
      if (count === 0) {
        loadBtn.classList.add('disabled');
        loadSub.textContent = 'No saved games';
      } else {
        loadBtn.classList.remove('disabled');
        loadSub.textContent = `${count} ${count === 1 ? 'save' : 'saves'}`;
      }
    }

    // Run title-screen wiring + overlay wiring once the DOM is parsed.
    // (The overlay HTML lives below the <script> block, so we can't query
    // for its elements at module-load time.)
    //
    // Settings load happens at the same point so user preferences are
    // applied before any UI elements render. The order is:
    //   1. loadSettings()    — read from localStorage into G_SETTINGS
    //   2. applySettings()   — apply DOM-level effects (text size etc.)
    //   3. wire* functions   — attach event listeners
    //
    // The settings overlay's close-and-backdrop listeners ALSO live here
    // (not in wireGameScreen) because Settings must be openable from the
    // title screen — before any game is started. wireGameScreen() only
    // runs once the player commits to a game, which is too late for an
    // overlay that's already reachable.
    function _bootstrapUI() {
      loadSettings();
      applySettings();
      renderCreationTraitGrid();
      updateTraitPointsDisplay();
      wireTitleScreen();
      wireSaveOverlay();

      wireReturnToMenuConfirm({
        btnId: 'settings-return-btn',
        confirmId: 'settings-return-confirm',
        cancelId: 'settings-return-cancel',
        yesId: 'settings-return-yes',
      });

      // Settings overlay close: × button + backdrop click (clicking the
      // dimmed area outside the modal). Backdrop click only fires when the
      // event target is the overlay itself, not a bubbled click from inside.
      document.getElementById('settings-modal-close').addEventListener('click', closeSettings);
      document.getElementById('settings-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'settings-overlay') closeSettings();
      });
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', _bootstrapUI);
    } else {
      _bootstrapUI();
    }

    const randInt = (min, max) =>
      min + Math.floor(Math.random() * (max - min + 1));

    /** One married grandparent pair for `parent`; uses `familySurname` on that line. */
    function spawnGrandparentsForParent(parent, familySurname) {
      const gfAgeAtBirth = randInt(GRANDPARENT_AGE_AT_BIRTH_MIN, GRANDPARENT_AGE_AT_BIRTH_MAX);
      const gmAgeAtBirth = randInt(GRANDPARENT_AGE_AT_BIRTH_MIN, GRANDPARENT_AGE_AT_BIRTH_MAX);
      const gfRoll = rollAdultStats();
      const gmRoll = rollAdultStats();

      const grandfather = createPerson({
        firstName: randomName('M'),
        surname:   familySurname,
        sex: 'M',
        age: parent.age + gfAgeAtBirth,
        generation: -2,
      });
      const grandmother = createPerson({
        firstName: randomName('F'),
        surname:   familySurname,
        sex: 'F',
        age: parent.age + gmAgeAtBirth,
        generation: -2,
      });

      for (const [gp, roll] of [[grandfather, gfRoll], [grandmother, gmRoll]]) {
        gp.yearBorn = G.year - gp.age;
        gp.charisma      = roll.charisma;
        gp.intelligence  = roll.intelligence;
        gp.insight       = roll.insight;
        gp.fertilityBase = roll.fertilityBase;
        gp.prowessBase   = roll.prowessBase;
        gp.wealth        = clamp(Math.round(parent.wealth * 0.85 + rollNormal(0, 8)), 5, 100);
      }

      linkSpouses(grandfather, grandmother);
      for (const gp of [grandfather, grandmother]) {
        snapshotBirthStats(gp);
        assignRandomHumor(gp);
      }

      grandfather.childIds  = [parent.id];
      grandmother.childIds  = [parent.id];
      parent.parentIds      = [grandfather.id, grandmother.id];

      for (const gp of [grandfather, grandmother]) {
        if (Math.random() < GRANDPARENT_DEAD_CHANCE) {
          const minDeath = Math.max(28, gp.age - 18);
          gp.age = randInt(minDeath, gp.age);
          gp.yearDied = gp.yearBorn + gp.age;
          gp.isAlive = false;
        } else if (gp.age >= 18) {
          assignCareerToPersonWithAgeFit(gp, G.year);
        }
      }

      G.people.push(grandfather, grandmother);
    }

    /** Aunts/uncles on one parental line — shares grandparents with `parent`. */
    function spawnSiblingsForParent(parent, lineSurname) {
      if (parent.parentIds.length < 2) return;

      const grandfather = getPerson(parent.parentIds[0]);
      const grandmother = getPerson(parent.parentIds[1]);
      const maxAge = maxParentSiblingAge(parent, grandfather, grandmother);
      const count = rollSiblingCount();

      for (let i = 0; i < count; i++) {
        const sex = Math.random() < 0.5 ? 'M' : 'F';
        const age = rollParentSiblingAge(parent.age, maxAge);
        const inherited = inheritStats(grandfather, grandmother);
        const auntUncle = createPerson({
          firstName: randomName(sex),
          surname:   lineSurname,
          sex,
          age,
          generation: -1,
          parentIds:  [...parent.parentIds],
        });
        auntUncle.yearBorn      = G.year - age;
        applyInheritedStats(auntUncle, inherited);
        snapshotBirthStats(auntUncle);
        assignRandomHumor(auntUncle);

        if (grandfather) grandfather.childIds.push(auntUncle.id);
        if (grandmother) grandmother.childIds.push(auntUncle.id);

        if (auntUncle.age >= 18) assignCareerToPersonWithAgeFit(auntUncle, G.year);
        G.people.push(auntUncle);
      }
    }

    // ── Start game (called from preview step) ──────────────────
    function startGame() {
      if (SKIP_CREATION_FOR_TESTING) applyTestDefaults();
      else {
        const err = validateStep(1);
        if (err) { alert(err); return; }
        collectStep(1);
        if (!creationTraitSelection.includes('orphaned')) collectStep(2);
      }

      G.surname = cc.lastName;
      G.year    = START_YEAR;
      G.people  = [];
      G.eventLog = [];
      G.memories = [];

      const surname = cc.lastName;

      const player = createPerson({
        firstName:  cc.firstName,
        surname:    surname,
        sex:        cc.sex,
        age:        0,
        generation: 0,
        isPlayer:   true,
      });
      player.yearBorn     = G.year;
      player.heritage     = cc.heritage;
      player.socialClass  = cc.socialClass;
      player.charisma     = cc.charisma;
      player.intelligence = cc.intelligence;
      player.wealth       = cc.wealth;
      player.insight      = cc.insight;
      player.prowessBase  = cc.prowess;
      player.health       = 100;
      player.traits       = [...(cc.traits || [])];
      applyTraitStatMods(player);
      for (const traitId of player.traits) {
        const startItems = TRAITS_BY_ID[traitId]?.startItems;
        if (startItems) {
          for (const itemId of startItems) grantItem(player, itemId);
        }
      }
      // Player's birth stats are their character-creation stats — snapshot now,
      // before anything (events, ageing) can shift the live numbers.
      snapshotBirthStats(player);
      G.people.push(player);
      refreshActionPoints(player);

      let twinSibling = null;
      const playerOrphaned = hasTrait(player, 'orphaned');

      if (!playerOrphaned) {
      // ── Parents (ages chosen by player in character creation) ──
      const fatherAge = cc.fatherAge;
      const motherAge = cc.motherAge;

      // Roll believable adult stats for both parents. The father's wealth is
      // derived from the household's wealth (cc.wealth), since household
      // economics is the father's domain in this period. Slight variance
      // so he's not literally identical to the child's "family wealth" value.
      const fatherRoll = rollAdultStats();
      const motherRoll = rollAdultStats();

      // Mild positive correlation: wealthier households tend to skew slightly
      // more attractive and educated on average. Soft real-world signal.
      if (cc.wealth >= 60) {
        fatherRoll.charisma     = clamp(fatherRoll.charisma     + 5, 0, 100);
        fatherRoll.intelligence = clamp(fatherRoll.intelligence + 5, 0, 100);
        motherRoll.charisma     = clamp(motherRoll.charisma     + 5, 0, 100);
        motherRoll.intelligence = clamp(motherRoll.intelligence + 5, 0, 100);
      } else if (cc.wealth <= 15) {
        fatherRoll.charisma     = clamp(fatherRoll.charisma     - 5, 0, 100);
        motherRoll.charisma     = clamp(motherRoll.charisma     - 5, 0, 100);
      }

      const father = createPerson({
        firstName: randomName('M'),
        surname:   surname,
        sex: 'M', age: fatherAge, generation: -1,
      });
      father.yearBorn      = G.year - fatherAge;
      father.charisma      = fatherRoll.charisma;
      father.intelligence  = fatherRoll.intelligence;
      father.insight       = fatherRoll.insight;
      father.fertilityBase = fatherRoll.fertilityBase;
      father.prowessBase   = fatherRoll.prowessBase;
      father.wealth        = clamp(cc.wealth + pick([-10,-5,0,5,10]), 20, 100);

      // Mother has a maiden name from before she married the father.
      const motherMaiden = randomSurname();
      const mother = createPerson({
        firstName:  randomName('F'),
        surname:    surname,       // adopted husband's surname
        sex: 'F', age: motherAge, generation: -1,
      });
      mother.maidenName    = motherMaiden;
      mother.yearBorn      = G.year - motherAge;
      mother.charisma      = motherRoll.charisma;
      mother.intelligence  = motherRoll.intelligence;
      mother.insight       = motherRoll.insight;
      mother.fertilityBase = motherRoll.fertilityBase;
      mother.prowessBase   = motherRoll.prowessBase;

      linkSpouses(father, mother);
      snapshotBirthStats(father);
      snapshotBirthStats(mother);
      assignRandomHumor(father);
      assignRandomHumor(mother);

      // Hook up the parents' marriage and children
      father.childIds    = [player.id];
      mother.childIds    = [player.id];
      player.parentIds   = [father.id, mother.id];
      G.people.push(father, mother);

      // Parents are adults — assign their careers immediately. We use the
      // age-aware variant so a 22-year-old young father doesn't end up as
      // a Magistrate. The "since" year is computed backward from the parent's
      // career start age, so a 40-year-old Lawyer reads as having been one
      // for ~15 years. Capped at 10 years so we don't claim someone started
      // at 5 if the parent is very old.
      //
      // We also give them a starting rank that matches their tenure — using
      // the same heuristic as the schema-4 migration (one tier per decade,
      // capped by the rank ladder). This way the player's father isn't a
      // "Junior Clerk" at age 45, he's a "Clerk" or "Senior Clerk" depending
      // on stats and how many years he's been in the role.
      for (const parent of [father, mother]) {
        assignCareerToPersonWithAgeFit(parent, G.year);
        if (parent.career) {
          const c = CAREERS_BY_ID[parent.career.id];
          const typicalStart = c ? Math.round((c.startAge[0] + c.startAge[1]) / 2) : 22;
          const yearsIn = Math.min(10, parent.age - typicalStart);
          if (yearsIn > 0) parent.career.since = G.year - yearsIn;

          // Derive starting rank: one tier per ~10 years in career, bounded
          // by the ladder length. This is the same shape as the migration
          // heuristic so loaded saves and new games are consistent.
          if (c) {
            const totalYearsIn = Math.max(0, G.year - parent.career.since);
            const maxRank = Math.max(0, c.rankLadder.length - 1);
            parent.career.rank = Math.min(maxRank, Math.floor(totalYearsIn / 10));
            parent.career.yearsAtRank = totalYearsIn % 10;
          }

          // Seed their wealth at the career's target so they start at the
          // right social class. Otherwise a Lawyer father at game start
          // would have wealth from cc.wealth + parents-of-parents drift,
          // but no signal that "she's a Lawyer, that means she has money."
          const target = careerWealthTarget(parent);
          if (target != null) {
            // Average their current wealth with the target — they didn't earn
            // it all from nothing, but their career has shaped it.
            parent.wealth = Math.round((parent.wealth + target) / 2);
          }
        }
      }
      syncMarriageWealth(father, mother);

      // ── Grandparents + their other children (player's aunts/uncles) ──
      spawnGrandparentsForParent(father, surname);
      spawnSiblingsForParent(father, surname);
      spawnGrandparentsForParent(mother, motherMaiden);
      spawnSiblingsForParent(mother, motherMaiden);

      // ── Siblings ──
      // ageDiff convention (matches the dropdown):
      //   ageDiff > 0 → sibling is that many years OLDER than player at birth
      //   ageDiff = 0 → twin
      //   ageDiff < 0 → sibling is born |ageDiff| years AFTER player
      G.pendingSiblings = [];

      // Helper: create a sibling, inherit stats from parents (per inheritStats
      // rules), set their household wealth from current parent wealth, snapshot
      // their birth stats. The sibling.age is set by the caller before this fires.
      const buildSibling = (sex, age) => {
        const sib = createPerson({
          firstName: randomName(sex),
          surname:   surname,
          sex, age, generation: 0,
          parentIds: [father.id, mother.id],
        });
        const inherited = inheritStats(father, mother);
        applyInheritedStats(sib, inherited);
        snapshotBirthStats(sib);
        assignRandomHumor(sib);
        return sib;
      };

      for (const sib of cc.siblings) {
        if (sib.ageDiff === 0) {
          const sibling = buildSibling(sib.sex, 0);
          sibling.yearBorn = G.year;
          G.people.push(sibling);
          father.childIds.push(sibling.id);
          mother.childIds.push(sibling.id);
          twinSibling = sibling;
        } else if (sib.ageDiff > 0) {
          const maxOlder = maxOlderSiblingAgeDiff(fatherAge, motherAge);
          const sibAge = clamp(sib.ageDiff, 1, Math.max(1, maxOlder));
          const sibling = buildSibling(sib.sex, sibAge);
          sibling.yearBorn = G.year - sibAge;
          G.people.push(sibling);
          father.childIds.push(sibling.id);
          mother.childIds.push(sibling.id);
        } else {
          // yearsUntilBirth = target player age when sibling spawns (not a countdown field).
          G.pendingSiblings.push({
            sex:             sib.sex,
            yearsUntilBirth: Math.abs(sib.ageDiff),
            fatherId:        father.id,
            motherId:        mother.id,
          });
        }
      }
      } else {
        player.parentIds = [];
        G.pendingSiblings = [];
      }

      seedFamilyRelationships(player, G.year);
      syncSocialBuckets(player);
      backfillNpcHumors(G.people);

      // Switch to game-screen and run all the one-time wiring + first render
      // common to BOTH new game and load game.
      fireSituation(player, 'birth_humor');
      enterGameScreen();
      let birthMsg;
      if (playerOrphaned) {
        birthMsg = `${personNameHtmlAnnals(player)} is born in ${escapeHtml(STARTING_LOCATION)} — alone in the world, save for a name.`;
      } else if (twinSibling) {
        birthMsg = `${personNameHtmlAnnals(player)} is born in ${escapeHtml(STARTING_LOCATION)} — with a twin, ${personNameHtmlAnnals(twinSibling)}!`;
      } else {
        birthMsg = `${personNameHtmlAnnals(player)} is born in ${escapeHtml(STARTING_LOCATION)}.`;
      }
      recordAnnalsImmediate({
        msg: birthMsg,
        type: 'good',
        html: true,
        priority: ANNALS_PRIORITY.MAJOR,
        category: 'life',
        title: 'Born',
      });
    }

    /** Expose creation handlers for inline onclick + delegated clicks. */
    function wireCreationHandlers() {
      window.goStep = goStep;
      window.addSibling = addSibling;
      window.startGame = startGame;

      const creation = document.getElementById('creation-screen');
      if (!creation) return;

      const returnBtn = document.getElementById('creation-return-menu');
      if (returnBtn) {
        returnBtn.addEventListener('click', () => {
          resetCharacterCreation();
          returnToMainMenu();
        });
      }

      creation.addEventListener('click', (e) => {
        if (e.target.closest('.btn-start')) {
          e.preventDefault();
          startGame();
        }
      });
    }
    wireCreationHandlers();

    // ── Game-screen lifecycle helpers ──────────────────────────
    // Called by both startGame (new) and loadGame (existing). Mounts the
    // game UI, wires its event handlers (idempotently — safe to call twice
    // because we use a wired flag), runs the initial render.
    function enterGameScreen() {
      document.getElementById('title-screen').classList.remove('active');
      document.getElementById('creation-screen').classList.remove('active');
      document.getElementById('game-screen').classList.add('active');

      initBloodlineFocus();
      setMode(getPlayer()?.isVampire ? 'vampire' : 'mortal');
      showSection('bloodline');
      renderEventLog();
      renderMemoriesPanel();
      render();

      wireGameScreen();
      wireItemPopupOverlay();
      wireDecisionPopupOverlay();
    }

    // Wire all in-game event handlers. Idempotent — guarded by `_wired` so
    // repeated calls (e.g. on load) don't stack duplicate listeners.
    let _gameWired = false;
    function wireGameScreen() {
      if (_gameWired) return;
      _gameWired = true;

      document.getElementById('btn-age-up').addEventListener('click', ageUp);

      document.querySelectorAll('.section-tab').forEach(tab => {
        tab.addEventListener('click', () => showSection(tab.dataset.section));
      });

      wireSearch();
      wireSubsectionCollapse();
      wireBreadcrumbControls();
      wirePersonInfoOverlay();

      // Debug toggle: flip mortal ↔ vampire. This is now reached via the
      // Settings overlay (sidebar Settings button → Debug section → Embrace).
      // Will be replaced by a real in-game event (the Embrace quest) once
      // relationships land. The function is exposed top-level so the
      // settings overlay can call it directly.
      //
      // (Old sidebar debug-embrace-toggle button removed — its event
      // listener used to live here. The handler now lives in toggleEmbrace().)
      if (typeof updateDebugLabel === 'function') updateDebugLabel();

      // Clicking the player card jumps to Bloodline → Family with you as focal.
      document.getElementById('player-panel').addEventListener('click', (e) => {
        const player = getPlayer();
        if (!player) return;
        const card = e.currentTarget;
        const section = card.closest('.player-section') || card;
        section.classList.remove('is-flashing');
        void section.offsetWidth;
        section.classList.add('is-flashing');
        const clearFlash = () => section.classList.remove('is-flashing');
        section.addEventListener('animationend', clearFlash, { once: true });
        setTimeout(clearFlash, 450);
        if (currentSection !== 'bloodline') showSection('bloodline');
        setSubTab('bloodline', 'family');
        if (bl.focalId !== player.id) {
          setFocal(player.id);
        } else if (currentSection === 'bloodline') {
          renderBloodline();
        }
        card.blur();
      });

      // Save/Load button in sidebar opens the save overlay.
      document.getElementById('btn-save-load').addEventListener('click', () => openSaveOverlay('save'));

      // Settings button in sidebar opens the settings overlay. (The
      // overlay's own close + backdrop listeners are wired globally in
      // _bootstrapUI, since the overlay must work from the title screen
      // too — before wireGameScreen ever runs.)
      document.getElementById('btn-settings').addEventListener('click', openSettings);
    }

    function runBirthTick() {
      tickBirths(G.people, G.year, {
        getPerson,
        onPlayerChildBorn(child) {
          proposeAnnals({
            msg: `Your ${child.sex === 'M' ? 'son' : 'daughter'} ${personNameHtmlAnnals(child)} has been born!`,
            type: 'good',
            html: true,
            priority: ANNALS_PRIORITY.LIFE,
            category: 'family_birth',
          });
        },
      });
    }

    // ── Age up ─────────────────────────────────────────────────
    function ageUp() {
      const guardPlayer = getPlayer();
      if (!guardPlayer?.isAlive) return;

      if (isInPrison(guardPlayer)) {
        tickPrisonYear(guardPlayer, {
          fireSituation,
          checkMortality,
        });

        const player = getPlayer();
        closeAnnalsYear(G.year);
        render();
        autoSave();
        return;
      }

      const advanced = runYearTick({
        spawnPendingSiblings,
        tickBirths: runBirthTick,
        assignCareerToPersonWithAgeFit,
        tickCareerProgression,
        tickEducation,
        processPlayerEvents,
        checkMortality,
        onPlayerCareerNudge(player) {
          if (!player.career) {
            if (player.age === 18) {
              proposeAnnals({
                msg: 'You are of age. A path lies open — choose a career when you are ready.',
                type: 'info',
                priority: ANNALS_PRIORITY.FLAVOR,
              });
            } else if (player.age === 25) {
              proposeAnnals({
                msg: 'Years are passing without a calling. Visit your Vocation panel to choose a path.',
                type: 'info',
                priority: ANNALS_PRIORITY.FLAVOR,
              });
            }
          }
        },
      });
      if (!advanced) return;

      const player = getPlayer();
      closeAnnalsYear(G.year);
      render();
      autoSave();
    }

    // ── Eras ───────────────────────────────────────────────────
    //
    // The game spans roughly 1800 → present, broken into 50-year chunks.
    // Each era has its own flavor for the same underlying "beats" — a tavern
    // visit in 1810 reads differently from a speakeasy visit in 1925, even
    // though mechanically they're the same event (small social wealth/charisma
    // nudge). Eras are invisible scaffolding: nothing in the UI surfaces them.
    //
    // The last era (2000) has no successor — the game stays in "modern-ish"
    // flavor permanently for any year ≥ 2000.
    //
    // currentEra(year): which chunk does this year live in?
    //   1837 → 1800,  1923 → 1900,  2055 → 2000
    //
    // eligibleEras(year): which era flavor cells can fire for events this year?
    //   Normally returns [currentEra]. In the last 10 years of an era — and only
    //   if a next era exists — returns [currentEra, nextEra] so the world starts
    //   to "bleed in" before the formal boundary. This is the soft transition:
    //   in 1843 the picker can draw from 1800 OR 1850 flavor, additively.
    //
    // Why additive rather than crossfade? Historical transitions feel like
    // the new world arriving alongside the old, not the old being slowly
    // replaced. New gadgets appear while old habits linger. The pool gets
    // richer in transition years, which is the right vibe.
    // ── Careers ────────────────────────────────────────────────
    //
    // Layer 1 of the career system: a fixed taxonomy of careers. NPCs are
    // assigned one at adulthood and keep it for life (no promotion logic
    // yet — that's Layer 2, and will only run for journaled NPCs).
    //
    // Career shape:
    //   {
    //     id:        string                       — stable identifier
    //     nameByEra: { [era]: string }            — display name per era. If
    //                                               an era isn't listed, the
    //                                               career doesn't exist then.
    //                                               Lookup uses the CURRENT
    //                                               game year, not the year
    //                                               the NPC started: a
    //                                               Constable in 1880 will
    //                                               read as "Police Officer"
    //                                               in 1950.
    //     primary:   stat                         — strong stat affinity
    //                                               (heavy weight in selection)
    //     secondary: stat                         — soft stat affinity
    //                                               (light weight in selection)
    //     prestige:  0 | 1 | 2 | 3                — social rank.
    //                                                 0 = labor / service
    //                                                 1 = skilled tradesperson
    //                                                 2 = professional
    //                                                 3 = elite / high society
    //                                               Goals like the Socialite's
    //                                               "5 friends in high places"
    //                                               check prestige >= 2.
    //     category:  string                       — broad grouping for goal
    //                                               filtering. Categories:
    //                                                 labor, trade, service,
    //                                                 medical, legal, civic,
    //                                                 academic, military,
    //                                                 arts, religious,
    //                                                 mercantile, mystical
    //     eras:      number[]                     — which era chunks this
    //                                               career exists in. Derived
    //                                               from nameByEra's keys but
    //                                               kept explicit for clarity.
    //     startAge:  [min, max]                   — typical age range at which
    //                                               someone starts this career.
    //                                               A Lawyer starts later than
    //                                               a Farmhand. NPCs' rolled
    //                                               careerPickAge is clamped
    //                                               into this range when their
    //                                               career is assigned.
    //     rankLadder: string[]                    — placeholder for Layer 2.
    //                                               Not used yet; defines the
    //                                               progression path so Layer 2
    //                                               can light it up without a
    //                                               retrofit. Index 0 is the
    //                                               entry rank.
    //   }
    //
    // Mix: ~70% grounded (labor/trade/service/civic), ~20% dramatic (legal/
    // military/arts/elite), ~10% mystical (insight-tagged).
    // ── Education (Layer 4a + 4b) ──────────────────────────────
    //
    // Layer 4a (primary + secondary):
    //   Auto-progression based on age boundaries:
    //     age 6  → 'primary'    (enrolled in school)
    //     age 12 → 'secondary'  (continues unless dropped out)
    //     age 18 → 'completed'  (secondary done — eligible for higher ed)
    //
    //   Dropped-out path:
    //     At age 12+, the player can drop out from the Education tab.
    //     Setting education.stage = 'dropped_out' prevents progression
    //     to 'completed' and forecloses higher-ed paths.
    //
    // Layer 4b (higher education):
    //   Three sequential tiers, each gated by wealth threshold at enrollment:
    //     Baccalaureate (4 yrs, wealth ≥ 50)
    //     Licentiate    (2 yrs, wealth ≥ 60, requires Baccalaureate)
    //     Doctorate     (2 yrs, wealth ≥ 60, requires Licentiate)
    //
    //   Wealth check is at the apply-gate ONLY. Once enrolled, the player
    //   may lose all their wealth and still complete — but they can't then
    //   apply for the next tier until they recover wealth.
    //
    //   Stages added: 'baccalaureate_in_progress', 'baccalaureate',
    //   'licentiate_in_progress', 'licentiate', 'doctorate_in_progress',
    //   'doctorate'. 'doctorate' is the terminal degree tier.
    //
    //   Career gating: careers may declare `requiresDegree`. The check
    //   passes if the player's highest completed degree is at-or-above
    //   the required tier. See careerEligibilityForPlayer.
    //
    // ── Stat-shaping philosophy ─────────────────────────────────
    //   Education does NOT trickle stats per year. Earlier drafts had
    //   per-year +1 INT drips for school and +2 INT for university,
    //   which produced deterministic outcomes: every educated character
    //   accumulated ~+30 INT regardless of player choices. That collapsed
    //   schooling into "click through tenure, get smart."
    //
    //   Instead, stat shaping happens through Situations that fire during
    //   schooling. Each Situation presents a choice (Eager / Dragged etc.)
    //   and only the chosen path nudges stats. A student who picks
    //   intellectual moments comes out smart; a student who picks social
    //   moments comes out charming. The stats are *earned through play*
    //   rather than awarded by tenure.
    //
    //   School popups (autoOpen): school_started_primary at age 6,
    //   primary_crossroads at age 10. Panel situations include graduation
    //   fork and higher-ed beats; more may be added in subsequent rounds.
    //   The total Situation count across a fully-educated life will likely
    //   be 5-10, each a deliberate authored moment rather than a counter.
    //
    // NOT included in this layer:
    //   • Higher-ed dropout (TODO: add a "Leave University" decision card
    //     for players who want to abandon mid-tier).
    //   • Per-year tuition costs (chose a single wealth check at the gate
    //     for simplicity).
    //   • NPC higher education — NPCs continue to skip higher ed entirely
    //     and just get assigned careers regardless of credentials. Their
    //     "Doctor" assignment is a furniture detail.

    // The higher-education ladder. Order matters — index i requires
    // completion of index i-1 (except index 0). Each tier:
    //   id           — matches the stage name without the suffix
    //                  ('baccalaureate', etc.). Also used as the value
    //                  in career.requiresDegree.
    //   label        — display name
    //   duration     — years spent in the tier
    //   wealthGate   — minimum wealth at enrollment
    //   stageName    — completed-stage name on Person.education.stage
    //   inProgress   — in-progress-stage name on Person.education.stage
    //   prereq       — required prior degree (null for Baccalaureate)
    //
    // Ladder is small; lookups are linear-scan, which is fine.
    // ── Events ─────────────────────────────────────────────────
    //
    // Event shape (post era-refactor):
    //   {
    //     id:       string                              — stable identifier
    //     weight:   number                              — picker weight (honored)
    //     cond:     (player) => boolean                 — eligibility check
    //     eras?:    number[]                            — if present, event ONLY
    //                                                     fires when at least one
    //                                                     of the player's eligible
    //                                                     eras is in this list
    //                                                     (used for era-locked
    //                                                     historical moments)
    //     flavor:   { [era]: { mortal?, vampire? } }    — flavor text per era/mode.
    //                                                     Each cell is { log: string }.
    //                                                     If a cell is missing,
    //                                                     the event is INELIGIBLE
    //                                                     for that era/mode combo
    //                                                     (no fallback — sparse
    //                                                     coverage is intentional).
    //     apply:    (player) => void                    — universal mechanical
    //                                                     effect (stat changes).
    //                                                     Does NOT log; logging
    //                                                     happens after, with
    //                                                     resolved flavor.
    //   }
    //
    // Coverage policy: any event whose flavor table is missing the relevant
    // (era, mode) cell is silently skipped. This means content gaps shrink the
    // eligible pool rather than producing generic fallback text — gaps are
    // visible as "quieter years" which is acceptable signal during authoring.
    //
    // All stat-modifying events use statCap() to honor the mode-appropriate
    // ceiling. A mortal's Health caps at 100; a vampire's at 200. The events
    // don't know or care which — they just clamp against whatever the cap
    // resolves to.
    // ── Mortality ──────────────────────────────────────────────
    // ── Player career UI (Layer 3) ─────────────────────────────
    //
    // Lives in the Vocation > Career sub-tab. The same panel serves two
    // purposes depending on player state:
    //
    //   pre-pick  → picker UI showing era-eligible careers, stat-fit
    //               readouts, category filter chips, and confirm/cancel.
    //   post-pick → detail view showing current rank, tenure, fit score,
    //               wealth target.
    //
    // The transition between views is one-way for Layer 3 — once the
    // player commits, they have a career until career-switching ships
    // (a deliberate future feature).
    //
    // UI state kept locally; not persisted to save. Reset between sessions
    // is fine — these are transient picker filters, not gameplay state.
    // (selectedId was removed when card-clicks were rewired to open a
    // modal directly. The modal owns the "currently inspecting this
    // career" state implicitly via its own lifecycle.)
    const careerPickerState = {
      category: 'all',     // active category filter chip
    };

    // Compute a fit score for the PLAYER vs a candidate career. Uses the
    // same shape as careerFitScore but without the tenure bonus (the player
    // hasn't started yet, so tenure is 0). Returns a value in [0, 1].
    function playerCareerFitScore(player, career) {
      const isVamp = !!player.isVampire;
      const statValue = (stat) => {
        if (stat === 'prowess')   return currentProwess(player);
        if (stat === 'fertility') return currentFertility(player);
        return effectiveStat(player, stat);
      };
      const primCap = statCap(career.primary, isVamp) || 100;
      const secCap  = statCap(career.secondary, isVamp) || 100;
      const primNorm = Math.min(1, Math.max(0, statValue(career.primary)) / primCap);
      const secNorm  = Math.min(1, Math.max(0, statValue(career.secondary)) / secCap);
      return primNorm * 0.5 + secNorm * 0.25;
    }

    // Map a fit score to a label and a CSS class. Three bands:
    //   < 0.20 → weak    ("Poor fit")
    //   0.20–0.40 → ok   ("Fair fit")
    //   ≥ 0.40 → strong  ("Strong fit")
    // The thresholds are tuned to the playerCareerFitScore range — a
    // player with primary stat 80 of 100 has primNorm 0.8 → score 0.4,
    // which clears "Strong fit". A balanced 50/50 player gets ~0.375
    // across the board, putting them in "Fair fit" for most careers,
    // which feels right for a generic build.
    function fitLabel(score) {
      if (score >= 0.40) return { text: 'Strong fit', cls: 'strong' };
      if (score >= 0.20) return { text: 'Fair fit',   cls: ''       };
      return                       { text: 'Poor fit',   cls: 'weak'  };
    }

    // Compute whether the player can currently take a given career, and
    // if not, why. Returns one of:
    //   { eligible: true }
    //   { eligible: false, reason: 'human-readable hint' }
    //
    // We surface only ONE reason — the most binding, defined as the one
    // most likely to lift first (loosest gating). Order checked:
    //   1. era (unlikely to lift mid-life unless time passes)
    //   2. in-school (part-time trades only, age 14+) OR mid-degree
    //   3. degree requirement (will lift when player earns the degree)
    //   4. age (lifts each year)
    //
    // We check in this order so the *more permanent* reason is shown.
    // An age-14 in-school player who looks at Lawyer (24+, doctorate)
    // gets "Part-time trades only..." because full careers wait for
    // graduation.
    //
    // Era check uses the inclusive list on each career; if the current
    // era isn't included, the career doesn't exist yet (or anymore).
    //
    // Education check: out of school, careers require 'completed',
    // 'dropped_out', or a higher-ed completed degree. In primary or
    // secondary, only careers marked schoolCompatible are allowed (age
    // 14+). Mid-degree *_in_progress stages block career entry.
    //
    // Degree check: if the career declares `requiresDegree`, the player's
    // highest completed degree must be at-or-above that tier. A dropped-out
    // player can never satisfy this (their education ends at 'dropped_out',
    // which is not in the degree ladder).
    //
    // Age check: simple comparison to startAge[0]. We do NOT enforce
    // the upper bound startAge[1] for the player — they can begin a
    // career later than typical.
    function careerEligibilityForPlayer(player, career) {
      const era = currentEra(G.year);
      if (!career.eras.includes(era)) {
        // Era list is contiguous; find the next era this career exists in
        // (if any) for a better hint than "wrong era."
        const futureEras = career.eras.filter(e => e > era);
        if (futureEras.length) {
          return { eligible: false, reason: `The ${futureEras[0]}s or later.` };
        }
        return { eligible: false, reason: 'An earlier era — this trade no longer exists.' };
      }

      const stage = player.education?.stage;
      const inSchool = stage === 'primary' || stage === 'secondary';
      if (inSchool) {
        if (player.age < SCHOOL_WORK_MIN_AGE) {
          return { eligible: false, reason: `Age ${SCHOOL_WORK_MIN_AGE} to balance school and work.` };
        }
        if (!career.schoolCompatible) {
          return { eligible: false, reason: 'Part-time trades only while still in school.' };
        }
      } else if (stage === 'none') {
        return { eligible: false, reason: 'More years lived.' };
      } else if (HIGHER_ED_IN_PROGRESS_STAGES.has(stage)) {
        const tier = EDUCATION_LADDER.find(d => d.inProgress === stage);
        return { eligible: false, reason: `Your ${tier?.label ?? 'degree'} completed.` };
      }

      // Degree requirement, if any. A dropped-out player can never satisfy
      // this since their stage is 'dropped_out', not a degree tier.
      if (career.requiresDegree) {
        const required = EDUCATION_LADDER_BY_ID[career.requiresDegree];
        if (!playerHasDegree(player, career.requiresDegree)) {
          return { eligible: false, reason: `A ${required?.label ?? 'degree'}.` };
        }
      }

      // Doctorate-tier careers may require a matching academic track.
      const requiredTrack = CAREER_TRACK_REQUIREMENTS[career.id];
      if (requiredTrack && career.requiresDegree === 'doctorate') {
        if (player.education?.track !== requiredTrack) {
          return {
            eligible: false,
            reason: `Requires a ${trackShortLabel(requiredTrack)} degree.`,
          };
        }
      }

      if (player.age < career.startAge[0]) {
        return { eligible: false, reason: `Age ${career.startAge[0]} or older.` };
      }

      return { eligible: true };
    }

    // Build the picker HTML. Shows ALL era-eligible careers, sorted with
    // "can take now" cards at the top and "can't take yet" cards (dimmed)
    // below. Each card surfaces its eligibility status — ineligible cards
    // show the specific reason inline.
    //
    // Card clicks only open the confirm modal for eligible cards;
    // ineligible cards are non-interactive.
    function renderCareerPicker(player) {
      const era = currentEra(G.year);
      // All careers that exist in this era. Out-of-era careers are
      // hidden entirely (showing them as ineligible would only confuse —
      // there's no path to making them eligible except waiting decades).
      const inEra = CAREERS.filter(c => c.eras.includes(era));

      // Distinct categories present in the in-era set, plus 'all'.
      const cats = ['all', ...Array.from(new Set(inEra.map(c => c.category))).sort()];

      const filtered = inEra.filter(c =>
        careerPickerState.category === 'all' || c.category === careerPickerState.category
      );

      // Annotate each career with fit score and eligibility, then sort:
      //   1. eligible cards first (sorted by fit desc within group)
      //   2. ineligible cards after (also sorted by fit desc within group)
      // This keeps the "what could I aim for" cards grouped by appeal in
      // both halves.
      const annotated = filtered.map(c => ({
        c,
        fit: playerCareerFitScore(player, c),
        eligibility: careerEligibilityForPlayer(player, c),
      }));

      annotated.sort((a, b) => {
        // Eligible before ineligible
        if (a.eligibility.eligible !== b.eligibility.eligible) {
          return a.eligibility.eligible ? -1 : 1;
        }
        // Within group, by fit descending
        return b.fit - a.fit;
      });

      const chipsHtml = cats.map(cat => {
        const active = (cat === careerPickerState.category) ? 'active' : '';
        const label = cat === 'all' ? 'All' : cat[0].toUpperCase() + cat.slice(1);
        return `<button class="career-chip ${active}" data-cat="${cat}">${label}</button>`;
      }).join('');

      const cardsHtml = annotated.map(({ c, fit, eligibility }) => {
        const name = c.nameByEra[era];
        const fitInfo = fitLabel(fit);
        const dots = [0,1,2].map(i =>
          `<span class="cc-prestige-dot ${i < c.prestige ? 'filled' : ''}"></span>`
        ).join('');
        const primCap = statCap(c.primary, !!player.isVampire);
        const secCap  = statCap(c.secondary, !!player.isVampire);
        const primStat = c.primary === 'prowess' ? currentProwess(player)
                       : c.primary === 'fertility' ? currentFertility(player)
                       : player[c.primary];
        const secStat  = c.secondary === 'prowess' ? currentProwess(player)
                       : c.secondary === 'fertility' ? currentFertility(player)
                       : player[c.secondary];
        const statParts = [];
        if (c.primary !== 'health') {
          statParts.push(`${escapeHtml(c.primary)} ${Math.round(primStat)}/${primCap}`);
        }
        if (c.secondary !== 'health') {
          statParts.push(`${escapeHtml(c.secondary)} ${Math.round(secStat)}/${secCap}`);
        }
        const statsHtml = statParts.length
          ? `<div class="cc-stats">${statParts.join(' · ')}</div>`
          : '';

        // Ineligible cards: dimmed, not clickable, and display the reason
        // in place of the fit row's interactive content.
        const lockedClass = eligibility.eligible ? '' : 'locked';
        const reasonHtml = eligibility.eligible
          ? `<div class="cc-fit-row">
               <span class="cc-fit-label">${fitInfo.text}</span>
               <span class="cc-fit-value ${fitInfo.cls}">${Math.round(fit * 100)}</span>
             </div>`
          : `<div class="cc-locked-reason">${escapeHtml(eligibility.reason)}</div>`;

        return `<div class="career-card ${lockedClass}" data-career-id="${c.id}">
          <div class="cc-name">${escapeHtml(name)}</div>
          <div class="cc-category">${escapeHtml(c.category)}</div>
          ${statsHtml}
          <div class="cc-fit-row">
            <span class="cc-fit-label">Prestige</span>
            <span class="cc-prestige">${dots}</span>
          </div>
          ${reasonHtml}
        </div>`;
      }).join('');

      const inSchoolWork = (player.education?.stage === 'primary' || player.education?.stage === 'secondary')
        && player.age >= SCHOOL_WORK_MIN_AGE;
      const subtitle = inSchoolWork
        ? 'Part-time trades you can hold while school continues. Full careers unlock after graduation.'
        : 'Your stats shape what suits you. Your choice shapes what comes.';

      // No inline confirm row — selecting a card opens a modal popup.
      // (Pre-Layer-3-revision this used an inline row; the modal is the
      // current form because the career choice is a one-time-per-lifetime
      // moment that earns more visual weight than a footer button.)

      return `<div class="career-page">
        <div class="career-page-title">Choose a Career</div>
        <div class="career-page-subtitle">${escapeHtml(subtitle)}</div>
        <div class="career-filter-strip">${chipsHtml}</div>
        <div class="career-grid">${cardsHtml}</div>
      </div>`;
    }

    // Build the post-pick detail HTML. Shows rank, tenure, fit, and wealth
    // target — the player's view of "how am I doing in my career."
    function renderCareerDetail(player) {
      const career = CAREERS_BY_ID[player.career.id];
      if (!career) {
        // Defensive: career id doesn't match anything in the taxonomy.
        // Shouldn't happen but bail with a placeholder.
        return `<div class="career-page">
          <div class="career-page-title">Unknown Career</div>
          <div class="career-page-subtitle">Your career record is corrupted. Please report this.</div>
        </div>`;
      }

      const era = currentEra(G.year);
      const name = career.nameByEra[era] || career.nameByEra[Object.keys(career.nameByEra).sort()[0]];
      const rankLabel = career.rankLadder[player.career.rank] || career.rankLadder[0];
      const yearsInCareer = G.year - (player.career.since || G.year);
      const yearsAtRank = player.career.yearsAtRank || 0;
      const yearsUntilCheck = Math.max(0, PROMOTION_CADENCE_YEARS - yearsAtRank);
      const atTop = player.career.rank >= career.rankLadder.length - 1;
      const retired = !player.isVampire && player.age >= RETIREMENT_AGE;

      const fitScore = careerFitScore(player);
      const fitInfo = fitLabel(fitScore);

      const target = careerWealthTarget(player);

      // Build the four detail cells.
      const cells = [];
      const stillInSchool = player.education?.stage === 'primary' || player.education?.stage === 'secondary';
      if (stillInSchool) {
        cells.push({
          label: 'Schedule',
          value: 'Part-time',
          note: 'You still attend school alongside this work.',
        });
      }

      cells.push({
        label: 'Tenure',
        value: `${yearsInCareer} year${yearsInCareer === 1 ? '' : 's'} in career`,
        note: yearsAtRank > 0 ? `${yearsAtRank} at current rank` : 'newly arrived at rank',
      });

      if (retired) {
        cells.push({
          label: 'Status',
          value: 'Retired',
          note: 'Your career years are behind you.',
        });
      } else if (atTop) {
        cells.push({
          label: 'Status',
          value: 'At the top of your field',
          note: 'No higher rung remains.',
        });
      } else {
        // Twin pathways to promotion:
        //   1. Automatic review every 10 years (PROMOTION_CADENCE_YEARS).
        //   2. Player-initiated petition via the Journal (decision card,
        //      ships in a later layer — UI text references it now as a
        //      forward-looking hint so the system reads as intentional
        //      when the petition feature lands).
        // We surface both in one cell so the player understands the
        // structure: a slow river and an active lever.
        cells.push({
          label: 'Next Review',
          value: yearsUntilCheck === 0 ? 'This year' : `${yearsUntilCheck} year${yearsUntilCheck === 1 ? '' : 's'} away`,
          note: 'Or petition for promotion early from your Journal.',
        });
      }

      cells.push({
        label: 'Fit',
        value: fitInfo.text,
        note: `Your ${career.primary} and ${career.secondary} matter most here.`,
      });

      if (target != null) {
        const diff = target - player.wealth;
        let note;
        if (Math.abs(diff) < 4)     note = 'You live at your station.';
        else if (diff > 0)          note = `Your station calls for more — drift +${Math.round(diff)} over time.`;
        else                        note = `You hold wealth above your station — it will settle by ${Math.round(-diff)}.`;
        cells.push({
          label: 'Expected Wealth',
          value: `${target}`,
          note,
        });
      }

      const cellsHtml = cells.map(c => `
        <div class="career-detail-cell">
          <div class="career-detail-cell-label">${escapeHtml(c.label)}</div>
          <div class="career-detail-cell-value">${escapeHtml(c.value)}</div>
          <div class="career-detail-cell-note">${escapeHtml(c.note)}</div>
        </div>`).join('');

      return `<div class="career-page">
        <div class="career-detail-headline">
          <div class="career-detail-rank">${escapeHtml(rankLabel)}</div>
          <div class="career-detail-name">${escapeHtml(name)}</div>
          <div class="career-detail-since">Since ${player.career.since}</div>
        </div>
        <div class="career-detail-grid">${cellsHtml}</div>
      </div>`;
    }

    // Pre-adult placeholder. Two flavors:
    //   • In-school children under 14: part-time work not yet available.
    //   • Pre-school children (age 0-5, stage 'none'): soft "wait" message.
    function renderCareerPreAdult() {
      const player = getPlayer();
      const stage = player?.education?.stage;
      const stillInSchool = (stage === 'primary' || stage === 'secondary');

      const text = stillInSchool
        ? `Your hours are still spent in lessons. From age ${SCHOOL_WORK_MIN_AGE}, part-time trades appear here while school continues — or leave schooling under Education.`
        : 'You are still very young. A path will open in time.';

      return `<div class="placeholder-card">
        <div class="placeholder-emblem">✦</div>
        <div class="placeholder-text">${escapeHtml(text)}</div>
      </div>`;
    }

    // Main vocation renderer — chooses the right view for the player's state
    // and wires the picker buttons after innerHTML replacement.
    function renderVocation() {
      const player = getPlayer();
      if (!player) return;
      const panel = document.getElementById('voc-panel-career');
      if (!panel) return;

      // Decide which view to show. Order matters:
      //   1. Player already has a career → detail view.
      //   2. In-school and under 14 → pre-adult placeholder.
      //   3. Pre-12 with no career → pre-adult placeholder.
      //   4. Otherwise → picker (includes in-school age 14+ for part-time
      //      trades, dropouts, and schooling-complete adults).
      let html;
      const stage = player.education?.stage;
      const stillInSchool = (stage === 'primary' || stage === 'secondary');
      if (player.career) {
        html = renderCareerDetail(player);
      } else if (stillInSchool && player.age < SCHOOL_WORK_MIN_AGE) {
        html = renderCareerPreAdult();
      } else if (player.age < 12) {
        // Pre-12 with stage 'none' — too young even to have entered the
        // workforce-via-dropout path.
        html = renderCareerPreAdult();
      } else {
        html = renderCareerPicker(player);
      }
      panel.innerHTML = html;

      // Wire chip clicks
      panel.querySelectorAll('.career-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          careerPickerState.category = chip.dataset.cat;
          renderVocation();
        });
      });

      // Wire card clicks — clicking an ELIGIBLE card opens the confirmation
      // modal. Locked cards have the .locked class and are non-interactive.
      // We filter by :not(.locked) at the selector level so locked cards
      // don't get any click listener attached.
      panel.querySelectorAll('.career-card:not(.locked)').forEach(card => {
        card.addEventListener('click', () => {
          openCareerConfirmModal(player, card.dataset.careerId);
        });
      });
    }

    // Open the career confirmation modal for a given career id. Builds
    // the modal contents fresh each open — career stats, fit reading,
    // expected wealth target, and the begin/cancel buttons.
    //
    // This is the commit gate: the only path from "I'm browsing careers"
    // to "I have a career" goes through this modal. The two-click pattern
    // (card → modal confirm) is the safety; we don't need an additional
    // "are you sure" step on top.
    function openCareerConfirmModal(player, careerId) {
      const career = CAREERS_BY_ID[careerId];
      if (!career) return;

      // Defense in depth: even though the picker only attaches the click
      // listener to non-locked cards, an eligibility check here ensures
      // no path can open the modal for a career the player can't take.
      const eligibility = careerEligibilityForPlayer(player, career);
      if (!eligibility.eligible) return;

      const era = currentEra(G.year);
      const name = career.nameByEra[era] || careerId;
      const entryRank = career.rankLadder[0] || name;

      const fit = playerCareerFitScore(player, career);
      const fitInfo = fitLabel(fit);

      // Use the same target wealth helper used in the detail view, but we
      // need to evaluate it for a hypothetical career-at-rank-0 instead of
      // an actual assigned career. We construct a synthetic person view
      // just for that calculation.
      const ghostPerson = Object.assign(Object.create(Object.getPrototypeOf(player)), player, {
        career: { id: careerId, rank: 0 },
      });
      const expectedWealth = careerWealthTarget(ghostPerson);

      // Prestige dots, same shape as the picker card.
      const dots = [0,1,2].map(i =>
        `<span class="cc-prestige-dot ${i < career.prestige ? 'filled' : ''}"></span>`
      ).join('');

      const stage = player.education?.stage;
      const inSchool = stage === 'primary' || stage === 'secondary';
      const schoolWarningHtml = inSchool
        ? `<div class="career-confirm-warning">This will have negative affects on your health while you're also in school.</div>`
        : '';

      const overlay = document.getElementById('career-confirm-overlay');
      const modal   = document.getElementById('career-confirm-modal');
      modal.innerHTML = `
        <div class="career-confirm-eyebrow">A path opens</div>
        <div class="career-confirm-name">${escapeHtml(name)}</div>
        <div class="career-confirm-entry-rank">You will begin as ${escapeHtml(entryRank)}.</div>
        ${schoolWarningHtml}
        <div class="career-confirm-stats">
          <div class="career-confirm-stat-cell">
            <div class="career-confirm-stat-label">Fit</div>
            <div class="career-confirm-stat-value ${fitInfo.cls}">${fitInfo.text}</div>
          </div>
          <div class="career-confirm-stat-cell">
            <div class="career-confirm-stat-label">Prestige</div>
            <div class="career-confirm-stat-value"><span class="cc-prestige">${dots}</span></div>
          </div>
          <div class="career-confirm-stat-cell">
            <div class="career-confirm-stat-label">Stats that matter</div>
            <div class="career-confirm-stat-value">${escapeHtml(career.primary)} · ${escapeHtml(career.secondary)}</div>
          </div>
          <div class="career-confirm-stat-cell">
            <div class="career-confirm-stat-label">Expected Wealth</div>
            <div class="career-confirm-stat-value">${expectedWealth != null ? Math.round(expectedWealth) : '—'}</div>
          </div>
        </div>
        <div class="career-confirm-actions">
          <button class="career-cancel-btn" data-modal-action="cancel">Cancel</button>
          <button class="career-confirm-btn" data-modal-action="confirm">Begin as ${escapeHtml(name)}</button>
        </div>
      `;
      overlay.classList.add('active');

      // Wire actions (each open replaces the buttons, so listeners stay fresh).
      modal.querySelector('[data-modal-action="cancel"]').addEventListener('click', closeCareerConfirmModal);
      modal.querySelector('[data-modal-action="confirm"]').addEventListener('click', () => {
        closeCareerConfirmModal();
        commitPlayerCareer(player, careerId);
      });

      // Click-outside-to-cancel: clicking the dim background closes without committing.
      overlay.addEventListener('click', overlayBackdropHandler);
    }

    function overlayBackdropHandler(e) {
      // Only close on direct overlay clicks, not bubbled-up clicks from inside.
      if (e.target.id === 'career-confirm-overlay') closeCareerConfirmModal();
    }

    function closeCareerConfirmModal() {
      const overlay = document.getElementById('career-confirm-overlay');
      overlay.classList.remove('active');
      overlay.removeEventListener('click', overlayBackdropHandler);
    }


    // the standard shape (rank 0, yearsAtRank 0) and triggers a render.
    // This is the one-way transition from picker → detail view; once it
    // runs, the player has a career and the picker becomes unreachable
    // (until career-switching ships, which is a later feature).
    function commitPlayerCareer(player, careerId) {
      if (!careerId) return;
      const career = CAREERS_BY_ID[careerId];
      if (!career) return;

      player.career = { id: careerId, since: G.year, rank: 0, yearsAtRank: 0 };
      const era = currentEra(G.year);
      const name = career.nameByEra[era] || careerId;
      recordMilestone(player, {
        title: 'Career Begun',
        narrative: `You have begun your career as ${name}.`,
        memoryCategory: 'career',
        type: 'good',
        year: G.year,
      });

      // Reset picker filter so a hypothetical future career-switching
      // session opens clean rather than retaining a stale category chip.
      careerPickerState.category = 'all';

      render();
    }

    // ── Education panel (Layer 4a + school dropout) ──────────────
    //
    // Lives in the Vocation > Education sub-tab. Shows the player's
    // current stage, years in stage, and a brief narrative paragraph.
    // Secondary-school students (age 12–17) can drop out here; higher-ed
    // applications appear when eligible.
    function canDropOutOfSchool(player) {
      return player.isAlive &&
        player.age >= 12 &&
        player.age < 17 &&
        player.education?.stage === 'secondary';
    }

    function dropOutOfSchool(player) {
      // The hidden `school_dropout` trait is a functionless record; we no longer
      // grant it to the player (the `dropped_out` stage already gates progression).
      player.education = { stage: 'dropped_out', since: G.year, track: null };
      recordMilestone(player, {
        title: 'Left School',
        narrative: 'You have dropped out of school.',
        memoryCategory: 'education',
        type: 'bad',
        year: G.year,
      });
    }

    function canDropOutOfUniversity(player) {
      return player.isAlive &&
        player.isPlayer &&
        HIGHER_ED_IN_PROGRESS_STAGES.has(player.education?.stage);
    }

    function dropOutOfUniversity(player) {
      const stage = player.education?.stage;
      if (!HIGHER_ED_IN_PROGRESS_STAGES.has(stage)) return;

      if (stage === 'baccalaureate_in_progress') {
        player.education.stage = 'completed';
      } else if (stage === 'licentiate_in_progress') {
        player.education.stage = 'baccalaureate';
      } else if (stage === 'doctorate_in_progress') {
        player.education.stage = 'licentiate';
      }
      player.education.since = G.year;
      grantTrait(player, 'university_dropout');
      recordMilestone(player, {
        title: 'Left University',
        narrative: 'You have left the university. Your studies end here — for now.',
        memoryCategory: 'education',
        type: 'bad',
        year: G.year,
      });
    }

    // Transient: true while the in-panel "Drop Out" confirm prompt is showing.
    let eduDropoutConfirming = false;
    // Social View: in secondary, toggle to also view the still-running primary school.
    let schoolViewShowPrimary = false;

    function schoolPersonCardHtml(p, metaLabel) {
      if (!p) return '';
      const name = `${p.firstName || ''} ${p.surname || ''}`.trim();
      return `<button type="button" class="school-person-card" data-person-id="${p.id}">
        <span class="school-person-name">${escapeHtml(name)}</span>
        <span class="school-person-meta">${escapeHtml(metaLabel)}</span>
      </button>`;
    }

    function buildSchoolSocialViewHtml(player) {
      const school = G.school;
      const stage = player.education?.stage;
      if (!school?.active || (stage !== 'primary' && stage !== 'secondary')) return '';

      const staff = [
        { id: school.headmasterId, role: 'Headmaster' },
        { id: school.primaryTeacherId, role: 'Primary Teacher' },
        { id: school.secondaryTeacherId, role: 'Secondary Teacher' },
      ]
        .map((s) => ({ p: getPerson(s.id), role: s.role }))
        .filter((s) => s.p && s.p.isAlive);

      const showPrimary = stage === 'secondary' ? schoolViewShowPrimary : true;
      const wantStage = showPrimary ? 'primary' : 'secondary';
      const students = (school.studentIds || [])
        .map(getPerson)
        .filter((p) => p && p.isAlive && p.education?.stage === wantStage)
        .sort((a, b) => b.age - a.age);

      const title = showPrimary ? 'Primary School' : 'Secondary School';
      const toggleHtml = stage === 'secondary'
        ? `<button type="button" class="school-toggle-btn" data-school-toggle>${schoolViewShowPrimary ? 'View Secondary' : 'View Primary'}</button>`
        : '';
      const staffHtml = staff.map((s) => schoolPersonCardHtml(s.p, s.role)).join('');
      const studentHtml = students.length
        ? students.map((p) => schoolPersonCardHtml(p, `Age ${p.age}`)).join('')
        : `<div class="school-empty">The desks are empty this year.</div>`;

      return `
        <div class="school-view">
          <div class="school-view-head">
            <span class="school-view-title">${escapeHtml(title)}</span>
            ${toggleHtml}
          </div>
          ${staffHtml ? `<div class="school-staff-row">${staffHtml}</div>` : ''}
          <div class="school-students">${studentHtml}</div>
        </div>`;
    }

    function renderEducationPanel() {
      const player = getPlayer();
      if (!player) return;
      const panel = document.getElementById('voc-panel-education');
      if (!panel) return;

      const ed = player.education || { stage: 'none', since: null };
      const stage = ed.stage;
      const yearsInStage = (ed.since != null) ? Math.max(0, G.year - ed.since) : 0;

      // Build the narrative body based on stage.
      let stageLabel, yearsText, body;
      switch (stage) {
        case 'none':
          stageLabel = 'Not Yet Schooled';
          yearsText  = '';
          body       = 'You are still too young for school. The world is small and full of wonder.';
          break;
        case 'primary':
          stageLabel = 'Primary School';
          yearsText  = `${yearsInStage} ${yearsInStage === 1 ? 'year' : 'years'} in`;
          body       = 'You are learning your letters and numbers. The teachers are stern, the days are long, but the world is opening.';
          break;
        case 'secondary':
          stageLabel = 'Secondary School';
          yearsText  = `${yearsInStage} ${yearsInStage === 1 ? 'year' : 'years'} in`;
          body       = 'Your schooling continues. Mathematics, history, languages — the foundations of an educated life.';
          break;
        case 'completed':
          stageLabel = 'Schooling Complete';
          yearsText  = `Since ${ed.since ?? '—'}`;
          body       = 'You have finished your schooling. Higher education may yet beckon — or perhaps your path lies elsewhere.';
          break;
        case 'dropped_out':
          stageLabel = ed.expelled ? 'Expelled' : 'Dropped Out';
          yearsText  = `Since ${ed.since ?? '—'}`;
          body       = ed.expelled
            ? 'You were expelled in disgrace. Whatever wisdom comes to you now comes from the world itself, not its teachers — and the schoolhouse doors are barred to you.'
            : 'You left school behind. Whatever wisdom comes to you now comes from the world itself, not its teachers.';
          break;
        case 'baccalaureate_in_progress': {
          const tier = EDUCATION_LADDER_BY_ID.baccalaureate;
          const remaining = Math.max(0, tier.duration - yearsInStage);
          stageLabel = 'Pursuing Baccalaureate';
          yearsText  = remaining === 0 ? 'Completing this year' : `${remaining} ${remaining === 1 ? 'year' : 'years'} remaining`;
          body       = trackLabel(ed.track)
            ? `You study ${trackLabel(ed.track)}. Lectures by day, texts by night.`
            : 'You spend your days at lectures, your nights at books. The world of letters opens before you.';
          break;
        }
        case 'baccalaureate':
          stageLabel = 'Baccalaureate';
          yearsText  = `Earned ${ed.since ?? '—'}`;
          body       = 'You hold a Baccalaureate. The educated trades and professions are within your reach.';
          break;
        case 'licentiate_in_progress': {
          const tier = EDUCATION_LADDER_BY_ID.licentiate;
          const remaining = Math.max(0, tier.duration - yearsInStage);
          stageLabel = 'Pursuing Licentiate';
          yearsText  = remaining === 0 ? 'Completing this year' : `${remaining} ${remaining === 1 ? 'year' : 'years'} remaining`;
          body       = 'You pursue mastery. The faculty knows you by name; the arguments grow finer.';
          break;
        }
        case 'licentiate':
          stageLabel = 'Licentiate';
          yearsText  = `Earned ${ed.since ?? '—'}`;
          body       = 'You hold a Licentiate. The bench, the academy, and the higher civic offices await.';
          break;
        case 'doctorate_in_progress': {
          const tier = EDUCATION_LADDER_BY_ID.doctorate;
          const remaining = Math.max(0, tier.duration - yearsInStage);
          stageLabel = 'Pursuing Doctorate';
          yearsText  = remaining === 0 ? 'Completing this year' : `${remaining} ${remaining === 1 ? 'year' : 'years'} remaining`;
          body       = trackLabel(ed.track)
            ? `The thesis weighs on you — ${trackLabel(ed.track)} is your field, and the title is within reach.`
            : 'The thesis weighs on you, but the title weighs more — Medicine, Law, or Theology, whatever path you chose.';
          break;
        }
        case 'doctorate':
          stageLabel = 'Doctorate';
          yearsText  = `Earned ${ed.since ?? '—'}`;
          body       = 'You hold the Doctorate. The classic elite professions are open to you. Few rise this far.';
          break;
        default:
          stageLabel = 'Unknown';
          yearsText  = '';
          body       = '';
      }

      let progressHtml = '';
      if (HIGHER_ED_IN_PROGRESS_STAGES.has(stage)) {
        const tier = EDUCATION_LADDER.find(d => d.inProgress === stage);
        if (tier) {
          const pct = Math.min(100, Math.round((yearsInStage / tier.duration) * 100));
          progressHtml = `
            <div class="edu-progress-wrap">
              <div class="edu-progress-bar"><div class="edu-progress-fill" style="width:${pct}%"></div></div>
              <div class="edu-progress-label">Year ${yearsInStage + 1} of ${tier.duration}</div>
            </div>`;
        }
      }

      const distinctionsHtml = renderEarnedTraitsHtml(player);
      const distinctionsBlock = distinctionsHtml
        ? `<div class="edu-distinctions">
            <div class="edu-distinctions-title">Distinctions</div>
            <div class="edu-distinctions-chips">${distinctionsHtml}</div>
          </div>`
        : '';

      // Build the apply card if there's a next degree available. The card
      // shows the tier name, duration, wealth threshold, and a Confirm
      // button that's disabled when wealth is insufficient.
      let applyCardHtml = '';
      const next = nextDegreeFor(player);
      if (next) {
        const qualifies = player.wealth >= next.wealthGate;
        const wealthClass = qualifies ? 'qualifies' : 'short';
        const buttonAttrs = qualifies ? '' : 'disabled';
        const ctaLabel = `Begin ${next.label}`;
        const hint = qualifies
          ? `You may begin this term. The years will pass; the title will be yours.`
          : `Your station is not yet enough. Reach wealth ${next.wealthGate} and the gate opens.`;
        applyCardHtml = `
          <div class="edu-apply-card">
            <div class="edu-apply-title">${escapeHtml(next.label)}</div>
            <div class="edu-apply-rows">
              <div class="edu-apply-row"><span>Duration</span><span>${next.duration} years</span></div>
              <div class="edu-apply-row"><span>Required Wealth</span><span class="${wealthClass}">${player.wealth} / ${next.wealthGate}</span></div>
            </div>
            <div class="edu-apply-hint">${escapeHtml(hint)}</div>
            <div class="career-confirm-actions">
              <button class="career-confirm-btn" data-degree-apply="${next.id}" ${buttonAttrs}>${escapeHtml(ctaLabel)}</button>
            </div>
          </div>`;
      }

      // Grade progress bar (primary/secondary only) with Study shortcut and the
      // relocated Drop Out control (with an in-panel confirm prompt).
      let gradeBlockHtml = '';
      if (stage === 'primary' || stage === 'secondary') {
        const grade = ensureGrade(player);
        const pct = Math.round(gradeFillFraction(player) * 100);
        let dropoutControl = '';
        if (eduDropoutConfirming) {
          dropoutControl = `
            <div class="edu-dropout-confirm">
              <div class="edu-dropout-confirm-text">Leave school for good? The classroom feels small and the world is wide — but the years ahead, and every path that asks for a finished education, will be closed to you.</div>
              <div class="career-confirm-actions">
                <button class="career-cancel-btn" type="button" data-edu-dropout-cancel>Stay</button>
                <button class="career-confirm-btn edu-dropout-btn" type="button" data-edu-dropout-confirm>Drop Out</button>
              </div>
            </div>`;
        } else if (canDropOutOfSchool(player)) {
          dropoutControl = `<button class="career-confirm-btn edu-dropout-btn" type="button" data-edu-dropout>Drop Out</button>`;
        }
        gradeBlockHtml = `
          <div class="edu-grade-block">
            <div class="edu-grade-head">
              <span class="edu-grade-label-text">Grade</span>
              <span class="edu-grade-value"><span class="edu-grade-letter">${escapeHtml(grade.letter)}</span> ${Math.round(grade.points)} / 100</span>
            </div>
            <div class="stat-bar edu-grade-bar"><div class="stat-fill" style="width:${pct}%; background:var(--green);"></div></div>
            <div class="edu-grade-actions">
              <button class="career-confirm-btn edu-study-btn" type="button" data-edu-study>Study</button>
              ${dropoutControl}
            </div>
          </div>`;
      }

      let uniDropoutHtml = '';
      if (canDropOutOfUniversity(player)) {
        uniDropoutHtml = `
          <div class="edu-apply-card edu-dropout-card">
            <div class="edu-apply-title">Leave University</div>
            <div class="edu-apply-hint">Walk away from your current degree. Any completed tiers remain — but the in-progress work is abandoned.</div>
            <div class="career-confirm-actions">
              <button class="career-confirm-btn edu-dropout-btn" type="button" data-edu-uni-dropout>Leave University</button>
            </div>
          </div>`;
      }

      panel.innerHTML = `<div class="career-page">
        <div class="career-page-title">Education</div>
        <div class="career-detail-headline">
          <div class="career-detail-rank">${escapeHtml(stageLabel)}</div>
          ${yearsText ? `<div class="career-detail-since">${escapeHtml(yearsText)}</div>` : ''}
        </div>
        ${gradeBlockHtml}
        ${ed.track ? `<div class="career-page-subtitle" style="margin-bottom:8px;">Track: ${escapeHtml(trackLabel(ed.track))}</div>` : ''}
        <div class="career-page-subtitle">${escapeHtml(body)}</div>
        ${buildSchoolSocialViewHtml(player)}
        ${progressHtml}
        ${distinctionsBlock}
        ${uniDropoutHtml}
        ${applyCardHtml}
      </div>`;

      // Wire the apply button if present.
      const applyBtn = panel.querySelector('[data-degree-apply]');
      if (applyBtn && !applyBtn.disabled) {
        applyBtn.addEventListener('click', () => {
          const degreeId = applyBtn.getAttribute('data-degree-apply');
          if (degreeId === 'baccalaureate') {
            fireSituation(player, 'university_enrollment');
          } else if (degreeId === 'licentiate') {
            fireSituation(player, 'licentiate_enrollment');
          } else if (degreeId === 'doctorate') {
            fireSituation(player, 'doctorate_enrollment');
          } else {
            const degree = EDUCATION_LADDER_BY_ID[degreeId];
            if (degree) commitDegreeApplication(player, degree);
          }
          render();
        });
      }

      // Social View: classmate/staff cards open the person modal; secondary toggle.
      panel.querySelectorAll('.school-person-card[data-person-id]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = Number(btn.getAttribute('data-person-id'));
          if (Number.isFinite(id)) openPersonInfoModal(id);
        });
      });
      const schoolToggleBtn = panel.querySelector('[data-school-toggle]');
      if (schoolToggleBtn) {
        schoolToggleBtn.addEventListener('click', () => {
          schoolViewShowPrimary = !schoolViewShowPrimary;
          render();
        });
      }

      // Study shortcut → open the Study decision directly (falls back to the
      // Decisions list if it isn't currently eligible, e.g. no AP left).
      const studyBtn = panel.querySelector('[data-edu-study]');
      if (studyBtn) {
        studyBtn.addEventListener('click', () => {
          if (isDecisionEligible('study_school', player)) {
            openDecisionFromItem('study_school');
          } else {
            showSection('decisions');
            setSubTab('decisions', 'decisions');
          }
        });
      }

      // Drop Out opens an in-panel confirm prompt; only Confirm actually drops.
      const dropoutBtn = panel.querySelector('[data-edu-dropout]');
      if (dropoutBtn) {
        dropoutBtn.addEventListener('click', () => {
          if (!canDropOutOfSchool(player)) return;
          eduDropoutConfirming = true;
          render();
        });
      }
      const dropoutCancelBtn = panel.querySelector('[data-edu-dropout-cancel]');
      if (dropoutCancelBtn) {
        dropoutCancelBtn.addEventListener('click', () => {
          eduDropoutConfirming = false;
          render();
        });
      }
      const dropoutConfirmBtn = panel.querySelector('[data-edu-dropout-confirm]');
      if (dropoutConfirmBtn) {
        dropoutConfirmBtn.addEventListener('click', () => {
          eduDropoutConfirming = false;
          if (!canDropOutOfSchool(player)) { render(); return; }
          dropOutOfSchool(player);
          render();
        });
      }

      const uniDropoutBtn = panel.querySelector('[data-edu-uni-dropout]');
      if (uniDropoutBtn) {
        uniDropoutBtn.addEventListener('click', () => {
          if (!canDropOutOfUniversity(player)) return;
          dropOutOfUniversity(player);
          render();
        });
      }
    }

    // Wrap renderVocation to also render the education panel.
    // (We don't replace renderVocation itself — career renderer stays
    // untouched. Education is a separate sub-tab; this is the hook.)
    //
    // Implementation note: renderVocation was declared with `function`
    // (hoisted, name-bound), so we can't reassign it cleanly. Instead,
    // the main render() call site below also calls renderEducationPanel
    // when the section is active. See render() at the bottom of the file.

    // ── Situations system ──────────────────────────────────────
    //
    // Situations are prompts that may demand a reaction; they never block
    // Pass-the-Year. Distinct from:
    //   • Annals/log lines (passive, no acknowledgement needed): tavern
    //     visits, illness, windfalls.
    //   • Decisions (non-blocking, available whenever): future life choices.
    //
    // The semantic split is: a Situation is a moment that demands a
    // reaction NOW. A Decision is an option that's always there if the
    // player wants it. An Annals entry is texture for the historical record.
    //
    // Template shape:
    //   {
    //     id:        string                — stable identifier
    //     title:     string | (ctx) => str — card headline
    //     body:      string | (ctx) => str — narrative paragraph(s) on detail
    //     buttons:   [                     — at least one; usually 2-3
    //       {
    //         id:    string                — stable within the template
    //         label: string                — button text
    //         apply: (player, ctx) => void — runs on resolve. May log,
    //                                         mutate stats, set state.
    //       }
    //     ]
    //   }
    //
    // Instance shape (lives on player.situations):
    //   { instanceId, templateId, firedYear }
    //
    // Instances don't carry context data right now — every situation has
    // a fixed structure. Future situations that need per-instance context
    // (e.g. "X has died, choose how to mourn" needs the deceased's name)
    // will add a `ctx` field. The shape is forward-compatible.
    const SITUATIONS = [
      ...buildEducationSituations({ EDUCATION_LADDER_BY_ID }),
      ...buildEducationImmersiveEvents(),
      ...buildImmersiveEvents(),
      ...buildEstateImmersiveEvents(),
      ...buildEstateSituations(),
      ...buildRookeriesSituations(),
      ...buildPrisonSituations(),
    ];

    const SITUATIONS_BY_ID = Object.fromEntries(SITUATIONS.map(s => [s.id, s]));

    const DEBUG_IMMERSIVE_EVENTS = [
      { id: 'school_started_primary', label: 'Primary School — Begin (popup)' },
      { id: 'primary_crossroads', label: 'Primary School — Crossroads (popup)' },
      { id: 'secondary_enrollment', label: 'Secondary School (popup)' },
      { id: 'peculiar_patron_offer', label: 'Peculiar Patron — Offer (popup)' },
      { id: 'mudlarks_lockbox_find', label: "Mudlark's Lockbox — Find (popup)" },
      { id: 'peculiar_patron_annual', label: 'Peculiar Patron — Annual (panel)' },
      { id: 'peculiar_patron_map_result', label: 'Peculiar Patron — Map Result (popup)' },
      { id: 'peculiar_patron_caught', label: 'Peculiar Patron — Magistrate (popup)' },
      { id: 'open_mudlarks_lockbox', label: "Mudlark's Lockbox — Open (Decisions)" },
      { id: 'prison_sentenced', label: 'Prison — Sentenced (panel → gaol)' },
      { id: 'syndicate_searches', label: 'Rookeries — Syndicate Searches (panel)' },
      { id: 'syndicate_collects', label: 'Rookeries — Syndicate Collects (popup)' },
    ];

    function renderDebugItemsSection() {
      const player = getPlayer();
      const inGame = player && document.getElementById('game-screen')?.classList.contains('active');
      if (!inGame) return '';

      const buttons = ITEMS.map((item) => {
        const owned = hasItem(player, item.id);
        const action = owned ? 'revoke' : 'grant';
        const label = owned ? `Remove ${item.label}` : `Grant ${item.label}`;
        return `<button type="button" class="settings-action-btn settings-debug-event-btn" data-debug-item="${escapeHtml(item.id)}" data-debug-item-action="${action}">${escapeHtml(label)}</button>`;
      }).join('');

      return `
          <div class="settings-row" data-settings-row="debug-items">
            <div class="settings-row-label">
              Items (debug)
              <div class="settings-row-hint">Grant to test Assets/Relics grid. Console: debugGrantItem("mudlarks_lockbox")</div>
            </div>
          </div>
          <div class="settings-debug-event-grid">${buttons}
            <button type="button" class="settings-action-btn settings-debug-event-btn" data-debug-item-clear>Clear all items</button>
          </div>`;
    }

    function debugGrantItem(itemId) {
      const player = getPlayer();
      if (!player) {
        console.warn('[debugGrantItem] No active player.');
        return false;
      }
      if (!grantItem(player, itemId)) {
        console.warn(`[debugGrantItem] Unknown or already owned: ${itemId}`);
        return false;
      }
      render();
      console.info(`[debugGrantItem] Granted "${itemId}".`);
      return true;
    }

    window.debugGrantItem = debugGrantItem;

    function renderDebugPrisonSection() {
      const player = getPlayer();
      const inGame = player && document.getElementById('game-screen')?.classList.contains('active');
      if (!inGame) return '';

      return `
          <div class="settings-row" data-settings-row="debug-prison">
            <div class="settings-row-label">
              Prison (debug)
              <div class="settings-row-hint">Console: debugEnterPrison(2) — private cell if wealth ≥ 63</div>
            </div>
          </div>
          <div class="settings-debug-event-grid">
            <button type="button" class="settings-action-btn settings-debug-event-btn" data-debug-prison="2">Enter gaol (2 years)</button>
            <button type="button" class="settings-action-btn settings-debug-event-btn" data-debug-prison-release>Release from gaol</button>
          </div>`;
    }

    function debugEnterPrison(years = 2) {
      const player = getPlayer();
      if (!player) {
        console.warn('[debugEnterPrison] No active player.');
        return false;
      }
      if (!document.getElementById('game-screen')?.classList.contains('active')) {
        console.warn('[debugEnterPrison] Enter the game screen first.');
        return false;
      }
      incarceratePlayer(player, { years, source: 'debug' });
      render();
      console.info(`[debugEnterPrison] Incarcerated (${prisonCellLabel(player.prison.cellType)}, until ${player.prison.untilYear}).`);
      return true;
    }

    function debugReleasePrison() {
      const player = getPlayer();
      if (!player?.prison?.active) return false;
      releasePrison(player);
      render();
      console.info('[debugReleasePrison] Released.');
      return true;
    }

    window.debugEnterPrison = debugEnterPrison;

    function renderDebugImmersiveEventsSection() {
      const player = getPlayer();
      const inGame = player && document.getElementById('game-screen')?.classList.contains('active');
      if (!inGame) return '';

      const buttons = DEBUG_IMMERSIVE_EVENTS.map((ev) =>
        `<button type="button" class="settings-action-btn settings-debug-event-btn" data-debug-event="${escapeHtml(ev.id)}">${escapeHtml(ev.label)}</button>`
      ).join('');

      return `
          <div class="settings-row" data-settings-row="debug-events">
            <div class="settings-row-label">
              Immersive popups
              <div class="settings-row-hint">Force intro popups or panel situations. Console: debugFireEvent("mudlarks_lockbox_find")</div>
            </div>
          </div>
          <div class="settings-debug-event-grid">${buttons}</div>
          ${renderDebugItemsSection()}
          ${renderDebugPrisonSection()}`;
    }

    function debugFireImmersiveEvent(templateId) {
      const player = getPlayer();
      if (!player) {
        console.warn('[debugFireEvent] No active player — start or load a game first.');
        return false;
      }
      if (!document.getElementById('game-screen')?.classList.contains('active')) {
        console.warn('[debugFireEvent] Enter the game screen first.');
        return false;
      }

      if (templateId === 'open_mudlarks_lockbox') {
        initializeMudlarkFromFind(player);
        render();
        console.info('[debugFireEvent] Granted lockbox item; use Journal > Decisions to open.');
        return true;
      }

      if (!SITUATIONS_BY_ID[templateId]) {
        console.warn(`[debugFireEvent] Unknown template: ${templateId}`);
        return false;
      }

      player.situations = (player.situations || []).filter((s) => s.templateId !== templateId);
      const tpl = SITUATIONS_BY_ID[templateId];
      if (tpl?.once && player.resolvedSituations) {
        delete player.resolvedSituations[templateId];
      }

      if (templateId === 'peculiar_patron_offer') {
        player.patronArc = null;
        delete player._estateFollowUp;
      } else if (templateId === 'mudlarks_lockbox_find') {
        player.mudlarkLockbox = null;
        delete player._estateFollowUp;
      } else if (templateId === 'peculiar_patron_annual') {
        player.patronArc = {
          active: true,
          startedYear: G.year,
          endsYear: G.year + 10,
          successes: 2,
          failed: false,
          completed: false,
          pendingCaught: false,
          jailedUntilYear: null,
        };
      } else if (templateId === 'peculiar_patron_caught') {
        player.patronArc = {
          active: true,
          startedYear: G.year - 1,
          endsYear: G.year + 9,
          successes: 2,
          failed: false,
          completed: false,
          pendingCaught: true,
          jailedUntilYear: null,
          lastDeliveryOutcome: 'caught',
        };
      }

      fireSituation(player, templateId);
      closeSituationPopup();
      render();
      const firedTpl = SITUATIONS_BY_ID[templateId];
      const kind = (isImmersiveTemplate(firedTpl) || isAutoOpenTemplate(firedTpl)) ? 'popup' : 'panel situation';
      console.info(`[debugFireEvent] Fired ${kind} "${templateId}".`);
      return true;
    }

    window.debugFireEvent = debugFireImmersiveEvent;

    // Monotonic counter for situation instanceIds, scoped to the current
    // session. Doesn't need to persist — instance ids are only used during
    // the lifetime of an unresolved situation, and a save+reload that
    // loses the counter just starts the counter back at 0 (the existing
    // situation ids are still unique within the array).
    let _situationInstanceSeq = 0;

    // Create a new situation instance for the player. Idempotent against
    // double-firing of the same template — if the player already has an
    // active situation of this template id, we don't fire a second one.
    // (Situations are blocking; firing the same one twice would be a
    // state mistake, not a desired multi-prompt.)
    function fireSituation(player, templateId) {
      if (!player) return;
      const tpl = SITUATIONS_BY_ID[templateId];
      if (!tpl) return;
      if (!Array.isArray(player.situations)) player.situations = [];
      if (player.situations.some(s => s.templateId === templateId)) return;
      const entry = {
        instanceId: ++_situationInstanceSeq,
        templateId,
        firedYear: G.year,
        unread: true,
      };
      if (isImmersiveTemplate(tpl)) {
        entry.ctx = typeof tpl.initialCtx === 'function'
          ? tpl.initialCtx(player)
          : { stepIndex: 0, humorId: null };
      }
      player.situations.push(entry);
    }

    // Resolve a situation by running the chosen button's apply, then
    // removing the situation from the player's array. After resolve, the
    // caller should call render() to refresh the panel + Pass-the-Year
    // gating; we don't call render() here because it might be called from
    // inside a render-driven event handler and we want to avoid surprise
    // re-entrant renders.
    function resolveSituation(player, instanceId, buttonId) {
      if (!player || !Array.isArray(player.situations)) return false;
      const idx = player.situations.findIndex(s => s.instanceId === instanceId);
      if (idx < 0) return false;
      const inst = player.situations[idx];
      const tpl = SITUATIONS_BY_ID[inst.templateId];
      if (!tpl) {
        // Template missing (code change, save migration gap). Remove the
        // orphan situation so it doesn't block forever.
        player.situations.splice(idx, 1);
        return true;
      }
      const button = tpl.buttons.find(b => b.id === buttonId);
      if (!button) return false;

      if (button.showResultPopup) {
        button.apply(player);
        player.situations.splice(idx, 1);
        fireSituation(player, button.resultPopupId || 'peculiar_patron_map_result');
        return true;
      }

      const title = (typeof tpl.title === 'function') ? tpl.title(player) : tpl.title;
      const choiceLabel = (typeof button.label === 'function') ? button.label(player, inst) : button.label;
      recordSituationResolution(player, {
        year: G.year,
        templateId: inst.templateId,
        title,
        choiceId: button.id,
        choiceLabel,
        logText: button.logText,
        domain: tpl.domain,
        logContext: tpl.logContext,
        age: player.age,
        memory: tpl.memory,
        memoryCategory: tpl.memoryCategory,
        record: button.record ?? tpl.record,
        reward: button.reward ?? tpl.reward,
        type: button.annalsType ?? tpl.annalsType,
        apply: () => button.apply(player),
      });

      const keepPending = typeof button.keepPending === 'function'
        ? button.keepPending(player, inst)
        : false;

      if (!keepPending) {
        player.situations.splice(idx, 1);
      }

      return true;
    }

    // Convenience: get the player's unresolved situations. Returns the
    // raw array reference (situations are removed on resolve, so anything
    // in there is "pending" by definition).
    function pendingSituations(player) {
      if (!player) return [];
      return player.situations || [];
    }

    function pendingSituationCount(player) {
      return pendingSituations(player).length;
    }

    function panelPendingSituations(player) {
      return pendingSituations(player).filter((inst) => {
        const tpl = SITUATIONS_BY_ID[inst.templateId];
        return tpl && !isImmersiveTemplate(tpl) && !isAutoOpenTemplate(tpl);
      });
    }

    function hasAutoOpenPending(player) {
      return pendingSituations(player).some((inst) => {
        const tpl = SITUATIONS_BY_ID[inst.templateId];
        return tpl && isAutoOpenTemplate(tpl);
      });
    }

    function tryShowImmersivePopup() {
      const player = getPlayer();
      if (!player) return;
      showImmersivePopupIfNeeded(player, SITUATIONS_BY_ID, {
        escapeHtml,
        year: G.year,
        getPlayer,
        onResolved: () => {
          processEstateFollowUp(getPlayer(), fireSituation);
          render();
        },
      });
    }

    function tryShowAutoSituationPopup() {
      const player = getPlayer();
      if (!player) return;
      showAutoSituationPopupIfNeeded(player, SITUATIONS_BY_ID, situationPopupDeps());
    }

    const situationPopupDeps = () => ({
      escapeHtml,
      hasTrait,
      onDismiss: () => closeSituationPopup(),
      onResolve: (instanceId, buttonId) => {
        const livePlayer = getPlayer();
        if (!livePlayer) return;
        resolveSituation(livePlayer, instanceId, buttonId);
        const inst = (livePlayer.situations || []).find((s) => s.instanceId === instanceId);
        if (inst) {
          const tpl = SITUATIONS_BY_ID[inst.templateId];
          if (tpl) refreshSituationPopup(livePlayer, inst, tpl, situationPopupDeps());
          else closeSituationPopup();
        } else {
          closeSituationPopup();
        }
        render();
      },
    });

    wireSituationPopupOverlay({ onDismiss: () => closeSituationPopup() });

    // Render the Situations sub-tab — pending list only; detail opens in a
    // popup. Resolved situations are no longer shown here: minor beats live in
    // the chronicle (Annals) and milestones in Memories.
    function wrapSituationsPanel(pendingHtml) {
      return pendingHtml;
    }

    function renderSituationsPanel() {
      const player = getPlayer();
      if (!player) return;
      const panel = document.getElementById('dec-panel-situations');
      if (!panel) return;

      const pending = panelPendingSituations(player);

      // List view
      if (!pending.length) {
        panel.innerHTML = wrapSituationsPanel(`<div class="placeholder-card">
          <div class="placeholder-emblem">✧</div>
          <div class="placeholder-text" data-vocab="dec.situations_empty">
            Nothing requires your attention.
          </div>
        </div>`);
        if (typeof applyVocab === 'function') applyVocab();
        return;
      }

      const cardsHtml = pending.map(inst => {
        const tpl = SITUATIONS_BY_ID[inst.templateId];
        if (!tpl) return '';
        const title = (typeof tpl.title === 'function') ? tpl.title(player) : tpl.title;
        const metaHtml = renderSituationPendingMetaHtml(tpl, inst, escapeHtml);
        const unreadClass = inst.unread === true ? ' has-unread' : '';
        return `<div class="decision-card situation-card${unreadClass}" data-situation-id="${inst.instanceId}">
          ${metaHtml}
          <div class="decision-card-title">${escapeHtml(title)}</div>
        </div>`;
      }).join('');

      panel.innerHTML = wrapSituationsPanel(`<div class="career-page">
        <div class="career-page-title">Situations</div>
        <div class="career-page-subtitle">Moments that ask something of you.</div>
        <div class="decision-list">${cardsHtml}</div>
      </div>`);

      panel.querySelectorAll('.situation-card').forEach(card => {
        card.addEventListener('click', () => {
          const id = parseInt(card.dataset.situationId, 10);
          const inst = pending.find(s => s.instanceId === id);
          if (!inst) return;
          const tpl = SITUATIONS_BY_ID[inst.templateId];
          if (!tpl) return;
          openSituationPopup(player, inst, tpl, situationPopupDeps());
        });
      });
    }

    // ── Decisions system ───────────────────────────────────────
    //
    // A Decisions registry. Each decision is a self-contained object:
    //
    //   {
    //     id:        string                       — stable identifier
    //     title:     string                       — short label in the list
    //     eligible:  (player) => boolean          — appears in list when true
    //     body:      string | (player) => string  — narrative writeup shown
    //                                                on the detail screen
    //     confirmLabel?: string                   — button text on detail
    //                                                (default: "Confirm")
    //     apply:     (player) => void             — what the decision does
    //   }
    //
    // Decisions appear in the Decisions sub-tab of the Decisions section
    // (Journal in mortal vocab / Ambitions in vampire vocab). The panel
    // shows either a list of available decisions or an in-panel detail
    // view when one is clicked. Confirming on the detail view commits
    // the decision via apply().
    //
    // Decisions are one-shot by default — once committed, they're consumed
    // because their `eligible` function returns false from then on. A
    // repeatable decision would just have an eligibility that stays true
    // after apply (none yet exist in this layer).
    const DECISIONS = buildDecisions();

    const DECISIONS_BY_ID = Object.fromEntries(DECISIONS.map(d => [d.id, d]));

    // UI state for the Decisions panel. When `viewingId` is non-null, the
    // panel renders the detail view for that decision; otherwise it
    // renders the list. Reset on each commit and on section switch.
    const decisionsPanelState = {
      viewingId: null,
    };

    // List of decisions the player can act on right now. Filters the
    // registry by each entry's `eligible` function.
    function eligibleDecisions(player) {
      return DECISIONS.filter(d => d.eligible(player));
    }

    function isDecisionEligible(decisionId, player) {
      const d = DECISIONS_BY_ID[decisionId];
      return d ? d.eligible(player) : false;
    }

    function getDecisionLabel(decisionId) {
      const d = DECISIONS_BY_ID[decisionId];
      return d?.title || 'Open in Decisions';
    }

    function openDecisionFromItem(decisionId) {
      const player = getPlayer();
      const d = DECISIONS_BY_ID[decisionId];
      if (!player || !d || !d.eligible(player)) return;
      markDecisionRead(player, decisionId);
      closeItemPopup();
      showSection('decisions');
      setSubTab('decisions', 'decisions');
      if (d.popup === 'mudlark_lockbox') {
        openMudlarkLockboxPopup(player, {
          escapeHtml,
          onComplete: () => render(),
        });
        return;
      }
      decisionsPanelState.viewingId = decisionId;
      render();
    }

    // Commit a decision by id. Runs `apply` (which may mutate the player)
    // and clears the panel state so the player returns to the list view
    // after a re-render.
    function commitDecision(player, decisionId) {
      const d = DECISIONS_BY_ID[decisionId];
      if (!d) return;
      if (!d.eligible(player)) return;     // defensive — eligibility changed
      d.apply(player);
      decisionsPanelState.viewingId = null;
      render();
    }

    // Render the Focus sub-tab — active academic life while in higher ed.
    function renderFocusPanel() {
      const player = getPlayer();
      if (!player) return;
      const panel = document.getElementById('dec-panel-focus');
      if (!panel) return;

      const html = buildFocusPanelHtml(player, {
        EDUCATION_LADDER_BY_ID,
        HIGHER_ED_IN_PROGRESS_STAGES,
      });

      if (!html) {
        panel.innerHTML = `<div class="placeholder-card">
          <div class="placeholder-emblem">⊙</div>
          <div class="placeholder-text" data-vocab="dec.focus_empty">
            No singular focus consumes you. The mind drifts where it will.
          </div>
        </div>`;
        if (typeof applyVocab === 'function') applyVocab();
        return;
      }

      panel.innerHTML = html;
    }

    // Render the Decisions sub-tab. Two views:
    //   list   — when viewingId is null. Shows eligible decisions as cards.
    //            Empty pool falls back to the vocab placeholder text.
    //   detail — when viewingId is set. Shows the full body and a confirm
    //            button, plus a back link.
    function renderDecisionsPanel() {
      const player = getPlayer();
      if (!player) return;
      const panel = document.getElementById('dec-panel-decisions');
      if (!panel) return;

      if (currentSection === 'decisions' && currentSubTab.decisions === 'decisions') {
        markAllDecisionsRead(player, eligibleDecisions(player));
      }

      // Detail view: a specific decision is being inspected.
      if (decisionsPanelState.viewingId) {
        markDecisionRead(player, decisionsPanelState.viewingId);
        const d = DECISIONS_BY_ID[decisionsPanelState.viewingId];
        if (!d || !d.eligible(player)) {
          // Stale viewingId — eligibility changed mid-view. Fall back to list.
          decisionsPanelState.viewingId = null;
          renderDecisionsPanel();
          return;
        }
        const body = (typeof d.body === 'function') ? d.body(player) : d.body;
        const confirmLabel = d.confirmLabel || 'Confirm';
        panel.innerHTML = `<div class="career-page">
          <button class="decision-back-btn" data-decision-action="back">← Back</button>
          <div class="career-page-title">${escapeHtml(d.title)}</div>
          <div class="decision-body">${escapeHtml(body).replace(/\n\n/g, '</p><p>').replace(/^/, '<p>').replace(/$/, '</p>')}</div>
          <div class="career-confirm-actions">
            <button class="career-cancel-btn" data-decision-action="back">Cancel</button>
            <button class="career-confirm-btn" data-decision-action="confirm">${escapeHtml(confirmLabel)}</button>
          </div>
        </div>`;
        panel.querySelectorAll('[data-decision-action="back"]').forEach(btn =>
          btn.addEventListener('click', () => {
            decisionsPanelState.viewingId = null;
            render();
          })
        );
        panel.querySelector('[data-decision-action="confirm"]').addEventListener('click', () =>
          commitDecision(player, d.id)
        );
        return;
      }

      // List view: show eligible decisions as cards.
      const eligible = eligibleDecisions(player);
      if (!eligible.length) {
        // Restore the original vocab-driven placeholder. We rebuild it
        // here rather than relying on the static HTML because the panel
        // has been overwritten by a prior list/detail render.
        panel.innerHTML = `<div class="placeholder-card">
          <div class="placeholder-emblem">✧</div>
          <div class="placeholder-text" data-vocab="dec.decisions_empty">
            No decisions weigh upon you. Life is, for now, simply lived.
          </div>
        </div>`;
        // Re-apply vocab to the freshly-inserted placeholder.
        if (typeof applyVocab === 'function') applyVocab();
        return;
      }

      const cardsHtml = eligible.map(d => {
        const unreadClass = isDecisionUnread(player, d.id) ? ' has-unread' : '';
        return `<div class="decision-card${unreadClass}" data-decision-id="${d.id}">
          <div class="decision-card-title">${escapeHtml(d.title)}</div>
        </div>`;
      }).join('');

      panel.innerHTML = `<div class="career-page">
        <div class="career-page-title">Decisions</div>
        <div class="career-page-subtitle">Choices that shape what comes.</div>
        <div class="decision-list">${cardsHtml}</div>
      </div>`;

      panel.querySelectorAll('.decision-card').forEach(card =>
        card.addEventListener('click', () => {
          const decisionId = card.dataset.decisionId;
          const d = DECISIONS_BY_ID[decisionId];
          markDecisionRead(player, decisionId);
          if (d?.popup === 'mudlark_lockbox') {
            openMudlarkLockboxPopup(player, {
              escapeHtml,
              onComplete: () => render(),
            });
            return;
          }
          decisionsPanelState.viewingId = decisionId;
          render();
        })
      );
    }

    function renderPrisonPanel(player) {
      const panel = document.getElementById('prison-panel');
      const mainBody = document.querySelector('.main-body');
      if (!panel) return;

      const inPrison = isInPrison(player);
      document.body.classList.toggle('prison-mode', inPrison);

      if (!inPrison) {
        panel.style.display = 'none';
        panel.setAttribute('aria-hidden', 'true');
        if (mainBody) mainBody.style.display = '';
        return;
      }

      panel.style.display = '';
      panel.removeAttribute('aria-hidden');
      if (mainBody) mainBody.style.display = 'none';

      const cell = prisonCellLabel(player.prison.cellType);
      const yearsLeft = prisonYearsRemaining(player);
      const bodyText = player.prison.cellType === 'private'
        ? 'Stone walls, a narrow cot, and a door that locks from outside. Your coin bought relative safety — but not freedom.'
        : 'The common dungeon stinks of damp lime and unwashed bodies. Iron bars and fever-rats are your only company.';

      panel.innerHTML = `
        <div class="prison-panel-eyebrow">Newgate · ${escapeHtml(String(G.year))}</div>
        <div class="prison-panel-title">Imprisoned</div>
        <div class="prison-panel-cell">${escapeHtml(cell)}</div>
        <div class="prison-panel-body">${escapeHtml(bodyText)}</div>
        <div class="prison-panel-era">${escapeHtml(prisonEraFlavorLine())}</div>
        <div class="prison-panel-sentence"><strong>${yearsLeft}</strong> year${yearsLeft === 1 ? '' : 's'} until release · Free <strong>${player.prison.untilYear}</strong></div>`;
    }

    function getItemPopupOptions() {
      return {
        isDecisionEligible,
        getDecisionLabel,
        onOpenDecision: openDecisionFromItem,
        onInventoryChange: render,
      };
    }

    function render() {
      renderGameHud();
    }

    registerThemeHooks({
      renderSubNav,
      render,
      getItemPopupOptions,
    });
    registerNavigationHooks({
      render,
      renderBloodline,
      getDecisionsViewingId: () => decisionsPanelState.viewingId,
      setDecisionsViewingId: (id) => { decisionsPanelState.viewingId = id; },
    });
    registerRenderHudHooks({
      personName,
      renderPrisonPanel,
      renderBloodline,
      renderVocation,
      renderEducationPanel,
      renderSituationsPanel,
      renderFocusPanel,
      renderDecisionsPanel,
      renderHobbiesPanel,
      tryShowImmersivePopup,
      tryShowAutoSituationPopup,
      eligibleDecisions,
      getItemPopupOptions,
      isImmersiveTemplate,
      isAutoOpenTemplate,
      SITUATIONS_BY_ID,
    });
    registerHobbiesHooks({
      render,
      isTestingCheatsEnabled: () => !!G_SETTINGS.testingCheats,
    });
    registerSearchHooks({
      portrait,
      personNameHtml,
    });
    registerPersonInteractHooks({
      render,
      renderBloodline,
      renderPersonInfoInteractView,
      personNameHtml,
      personNameHtmlAnnals,
      clearInteractSubViews: () => {
        personInfoState.interactSubView = null;
        resetBlFocalInteractSubView();
      },
    });
    registerPersonModalHooks({
      portrait,
      personNameHtml,
      setFocal,
      getItemPopupOptions,
    });
    registerBloodlineHooks({
      portrait,
      personNameHtml,
      getItemPopupOptions,
    });

    registerCareerHooks({ personNameHtmlAnnals });
    registerEducationTickHooks({
      fireSituation,
      onAfterDegreeCommit: render,
    });
    registerEventHooks({ fireSituation });
    registerMortalityHooks({
      personNameHtmlAnnals,
      disableAgeUp: () => {
        const btn = document.getElementById('btn-age-up');
        if (btn) btn.disabled = true;
      },
    });
    registerSiblingHooks({ personNameHtmlAnnals });
    registerSaveMigrationDeps({ pickCareerForNPC, CAREERS_BY_ID });

    if (SMOKE_TEST_MODE) {
      /** @internal Playwright smoke-test API — only when ?smoke=1 is in the URL. */
      window.__LEGACY_TEST__ = {
        SAVE_SCHEMA,
        SAVE_KEY_SLOT,
        startGame,
        ageUp,
        snapshotGame,
        applySave,
        readSave,
        saveToSlot,
        loadFromSlot,
        migrateSave,
        getState() {
          const player = getPlayer();
          return {
            year: G.year,
            surname: G.surname,
            peopleCount: G.people.length,
            pendingSiblings: G.pendingSiblings.length,
            player: player
              ? { id: player.id, age: player.age, isAlive: player.isAlive, isPlayer: player.isPlayer }
              : null,
          };
        },
        /** Click through blocking immersive/situation overlays until idle or maxSteps. */
        async completeBlockingUi(maxSteps = 24) {
          for (let i = 0; i < maxSteps; i++) {
            await new Promise((resolve) => {
              requestAnimationFrame(() => requestAnimationFrame(resolve));
            });
            const immersive = document.getElementById('immersive-overlay');
            if (immersive?.classList.contains('active')) {
              const btn = immersive.querySelector('[data-immersive-choice]');
              if (btn) {
                btn.click();
                continue;
              }
            }
            const situation = document.getElementById('situation-overlay');
            if (situation?.classList.contains('active')) {
              const btn =
                situation.querySelector('[data-situation-button]') ||
                situation.querySelector('button');
              if (btn) {
                btn.click();
                continue;
              }
            }
            return;
          }
          throw new Error('completeBlockingUi: still blocked after maxSteps');
        },
      };
    }
  })();
}
