import { isImmersiveTemplate } from '../data/immersiveEvents.js';
import { HUMORS, HUMOR_IDS } from '../data/humors.js';
import { ITEMS_BY_ID } from '../data/items.js';
import { markSituationRead } from './situationAttention.js';
import { recordSituationResolution, formatChoiceEffectsLine } from './situationLog.js';
import { openItemPopup } from '../ui/itemPopup.js';

let _activeInstanceId = null;
let _isOpen = false;

function resolveField(field, ctx, player) {
  if (typeof field === 'function') return field(ctx, player);
  return field ?? '';
}

function getOverlayEl() {
  return document.getElementById('immersive-overlay');
}

function getModalEl() {
  return document.getElementById('immersive-modal');
}

function ensureInstanceCtx(inst) {
  if (!inst.ctx || typeof inst.ctx !== 'object') {
    inst.ctx = { stepIndex: 0, humorId: null };
  }
  if (typeof inst.ctx.stepIndex !== 'number') inst.ctx.stepIndex = 0;
  return inst.ctx;
}

function hasResolvedTemplate(player, templateId) {
  return !!player?.resolvedSituations?.[templateId];
}

function removeSituationInstance(player, instanceId) {
  if (!player?.situations?.length) return;
  const idx = player.situations.findIndex((s) => s.instanceId === instanceId);
  if (idx >= 0) player.situations.splice(idx, 1);
}

function findPendingImmersive(player, registry) {
  if (!player?.situations?.length) return null;

  const IMMERSIVE_PRIORITY = [
    'birth_humor',
    'univ_accept_melancholic',
    'univ_accept_letters',
    'univ_accept_gower_street',
    'secondary_enrollment',
    'headmasters_office',
    'peculiar_patron_caught',
    'peculiar_patron_map_result',
    'peculiar_patron_offer',
    'mudlarks_lockbox_find',
  ];

  const pending = [];

  for (let i = 0; i < player.situations.length; i++) {
    const inst = player.situations[i];
    const tpl = registry[inst.templateId];
    if (!tpl || !isImmersiveTemplate(tpl)) continue;

    if (tpl.once && hasResolvedTemplate(player, inst.templateId)) {
      player.situations.splice(i, 1);
      i -= 1;
      continue;
    }

    if (inst.templateId === 'birth_humor') {
      const humorId = inst.ctx?.humorId;
      const humorAssigned = humorId && HUMOR_IDS.includes(humorId) && player.traits?.includes(humorId);
      if (humorAssigned) {
        player.situations.splice(i, 1);
        i -= 1;
        continue;
      }
    }

    pending.push({ inst, tpl });
  }

  for (const templateId of IMMERSIVE_PRIORITY) {
    const match = pending.find((entry) => entry.inst.templateId === templateId);
    if (match) return match;
  }

  return pending[0] || null;
}

function closeImmersivePopup() {
  const overlay = getOverlayEl();
  const modal = getModalEl();
  if (overlay) overlay.classList.remove('active');
  if (modal) modal.classList.remove('immersive-modal--humor-grid');
  _isOpen = false;
  _activeInstanceId = null;
}

function formatBodyHtml(body, escapeHtml, isHtml = false) {
  const text = String(body || '');
  // isHtml bodies are trusted static template content (may embed item links);
  // they must arrive pre-escaped except for their intentional markup.
  const safe = isHtml ? text : escapeHtml(text);
  return safe
    .replace(/\n\n/g, '</p><p>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}

function resolveChoices(step, player) {
  const raw = step?.choices;
  if (typeof raw === 'function') return raw(player) || [];
  return raw || [];
}

function renderChoicesHtml(step, player, escapeHtml) {
  const choices = resolveChoices(step, player);
  const useCards = choices.some((c) => c.description);

  if (useCards) {
    return `<div class="immersive-humor-grid">${choices.map((choice) => {
      const accent = choice.accent ? ` style="--humor-accent:${choice.accent};--humor-label:${choice.labelColor || '#f5ecd8'}"` : '';
      return `<button type="button" class="immersive-humor-card" data-immersive-choice="${escapeHtml(choice.id)}"${accent}>
        <div class="immersive-humor-name-wrap">
          <div class="immersive-humor-name">${escapeHtml(choice.label)}</div>
        </div>
        ${choice.tagline ? `<div class="immersive-humor-tagline">${escapeHtml(choice.tagline)}</div>` : ''}
        <div class="immersive-humor-desc">${escapeHtml(choice.description || '')}</div>
      </button>`;
    }).join('')}</div>`;
  }

  return `<div class="immersive-choices">${choices.map((choice) => {
    const accent = choice.accent ? ` style="--humor-accent:${choice.accent}"` : '';
    const cls = choice.accent ? 'immersive-choice immersive-choice--humor' : 'immersive-choice';
    return `<button type="button" class="${cls}" data-immersive-choice="${escapeHtml(choice.id)}"${accent}>${escapeHtml(choice.label)}${formatChoiceEffectsLine(choice.effects)}</button>`;
  }).join('')}</div>`;
}

function wireChoiceHandlers(modal, step, tpl, inst, player, ctx, escapeHtml, onAdvance, onComplete) {
  const choices = resolveChoices(step, player);
  // Buttons from a superseded step must go inert: if a transition ever stalls,
  // a second click would otherwise resolve against the advanced stepIndex and
  // silently complete the situation on the wrong step.
  const wiredStepIndex = ctx.stepIndex;
  modal.querySelectorAll('[data-immersive-choice]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (ctx.stepIndex !== wiredStepIndex) return;
      const choiceId = btn.getAttribute('data-immersive-choice');
      const choice = choices.find((c) => c.id === choiceId);
      if (!choice) return;

      if (typeof tpl.onStepChoice === 'function') {
        tpl.onStepChoice(player, ctx, choice, ctx.stepIndex);
      }

      const isFinalStep = ctx.stepIndex >= (tpl.steps.length - 1) || choice.complete === true;
      if (isFinalStep) {
        onComplete(choice);
        return;
      }

      ctx.humorId = choiceId;
      ctx.stepIndex += 1;
      onAdvance();
    });
  });
}

function renderStepContent(modal, tpl, inst, player, ctx, escapeHtml, onAdvance, onComplete) {
  const step = tpl.steps?.[ctx.stepIndex];
  if (!step) return;

  const eyebrow = resolveField(tpl.eyebrow, ctx, player);
  const title = resolveField(tpl.title, ctx, player);
  const body = resolveField(step.body, ctx, player);
  const acquisition = step.acquisition ? resolveField(step.acquisition, ctx, player) : '';
  const choices = resolveChoices(step, player);
  const useHumorGrid = choices.some((c) => c.description);
  modal.classList.toggle('immersive-modal--humor-grid', useHumorGrid);

  modal.innerHTML = `
    <div class="immersive-step immersive-step--visible">
      ${eyebrow ? `<div class="immersive-eyebrow">${escapeHtml(eyebrow)}</div>` : ''}
      <div class="immersive-title">${escapeHtml(title)}</div>
      <div class="immersive-body">${formatBodyHtml(body, escapeHtml, step.bodyHtml === true)}</div>
      ${acquisition ? `<div class="immersive-acquisition">${escapeHtml(acquisition)}</div>` : ''}
      ${renderChoicesHtml(step, player, escapeHtml)}
    </div>`;

  wireChoiceHandlers(modal, step, tpl, inst, player, ctx, escapeHtml, onAdvance, onComplete);

  // Item mentions in bodyHtml steps open the item popup overlay (stacks above
  // the immersive overlay) rather than navigating to the inventory.
  modal.querySelectorAll('[data-immersive-item-link]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const item = ITEMS_BY_ID[el.getAttribute('data-immersive-item-link')];
      if (item) openItemPopup(item, player, escapeHtml);
    });
  });
}

function transitionToStep(modal, tpl, inst, player, ctx, escapeHtml, onAdvance, onComplete) {
  const current = modal.querySelector('.immersive-step');
  if (!current) {
    renderStepContent(modal, tpl, inst, player, ctx, escapeHtml, onAdvance, onComplete);
    return;
  }

  // The fade-in class from the previous transition must come off first: with
  // both classes present the later-declared fade-in rule wins the cascade, no
  // new animation starts, and animationend never fires (popup stalls). The
  // reflow read restarts the fade-out animation cleanly.
  current.classList.remove('immersive-step--fade-in');
  void current.offsetWidth;
  current.classList.add('immersive-step--fade-out');

  let advanced = false;
  const proceed = () => {
    if (advanced) return;
    advanced = true;
    renderStepContent(modal, tpl, inst, player, ctx, escapeHtml, onAdvance, onComplete);
    const next = modal.querySelector('.immersive-step');
    if (next) {
      next.classList.add('immersive-step--fade-in');
    }
  };
  current.addEventListener('animationend', proceed, { once: true });
  // Never strand the popup on a skipped/interrupted animation (350ms nominal).
  setTimeout(proceed, 450);
}

function openImmersivePopup(player, inst, tpl, deps) {
  const { escapeHtml, year, onResolved, getPlayer } = deps;
  const overlay = getOverlayEl();
  const modal = getModalEl();
  if (!overlay || !modal) return;

  const ctx = ensureInstanceCtx(inst);
  _activeInstanceId = inst.instanceId;
  _isOpen = true;
  markSituationRead(inst);
  overlay.classList.add('active');

  const onAdvance = () => {
    transitionToStep(modal, tpl, inst, player, ctx, escapeHtml, onAdvance, onComplete);
  };

  const onComplete = (choice) => {
    const livePlayer = (typeof getPlayer === 'function' ? getPlayer() : null) || player;
    if (!livePlayer) return;

    const keepPending = typeof tpl.keepPending === 'function'
      && tpl.keepPending(livePlayer, ctx, choice);

    if (!keepPending) {
      removeSituationInstance(livePlayer, inst.instanceId);
    }
    closeImmersivePopup();

    const title = resolveField(tpl.title, ctx, livePlayer);
    const choiceLabel = ctx.humorId
      ? (HUMORS[ctx.humorId]?.label || choice.label || choice.id)
      : (choice.label || choice.id);
    const logText = typeof tpl.logText === 'function'
      ? tpl.logText(livePlayer, ctx, choice)
      : tpl.logText;

    recordSituationResolution(livePlayer, {
      year,
      templateId: inst.templateId,
      title,
      choiceId: ctx.humorId || choice.id,
      choiceLabel,
      logText,
      domain: tpl.domain,
      logContext: tpl.logContext,
      age: livePlayer.age,
      memory: tpl.memory,
      memoryCategory: tpl.memoryCategory,
      record: tpl.record,
      reward: tpl.reward,
      type: tpl.annalsType,
      apply: () => {
        if (typeof tpl.onComplete === 'function') tpl.onComplete(livePlayer, ctx, choice);
      },
      declaredEffects: choice.effects,
    });

    if (keepPending && typeof tpl.afterComplete === 'function') {
      tpl.afterComplete(livePlayer, ctx, choice, inst);
    }

    if (typeof onResolved === 'function') onResolved();
  };

  renderStepContent(modal, tpl, inst, player, ctx, escapeHtml, onAdvance, onComplete);
}

/** True while an immersive popup is displayed. */
export function isImmersivePopupOpen() {
  return _isOpen;
}

/** Show the first pending immersive situation, if any. */
export function showImmersivePopupIfNeeded(player, registry, deps) {
  if (!player) return false;
  if (_isOpen) return true;

  const pending = findPendingImmersive(player, registry);
  if (!pending) return false;

  openImmersivePopup(player, pending.inst, pending.tpl, deps);
  return true;
}

export { isImmersiveTemplate, findPendingImmersive };
