import { ITEMS_BY_ID, itemTypeLabel } from '../data/items.js';
import {
  PROPOSAL_RING_TIERS,
  proposalRingActionId,
  canAffordProposalRingTier,
} from '../data/marriageProposal.js';
import { ownedItemIds } from '../sim/personItems.js';
import { canSpendActionPoints, getActionPointCost } from '../sim/actionPoints.js';
import { renderTraitPopupListHtml, countVisibleTraits } from '../sim/traits.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { openItemPopup } from './itemPopup.js';
import { renderEntryArt } from './renderArt.js';

/**
 * Traits | Items | optional Interact — shared between person popup and bloodline focal.
 */
export function renderPersonActionBarHtml(p, player, opts = {}) {
  const {
    actionAttr = 'person-info-action',
    showInteract = false,
    cssClass = 'person-info-action-bar',
  } = opts;

  const traitCount = countVisibleTraits(p);
  const itemCount = ownedItemIds(p).length;

  const buttons = [
    `<button type="button" class="person-info-action-btn" data-${actionAttr}="traits">Traits <span class="person-info-action-btn-count">(${traitCount})</span></button>`,
    `<button type="button" class="person-info-action-btn" data-${actionAttr}="items">Items <span class="person-info-action-btn-count">(${itemCount})</span></button>`,
  ];
  if (showInteract) {
    buttons.push(
      `<button type="button" class="person-info-interact-btn" data-${actionAttr}="interact">Interact</button>`,
    );
  }
  return `<div class="${cssClass}">${buttons.join('')}</div>`;
}

export function wirePersonActionBar(container, actionAttr, handlers = {}) {
  if (!container) return;
  container.querySelector(`[data-${actionAttr}="traits"]`)?.addEventListener('click', () => {
    handlers.onTraits?.();
  });
  container.querySelector(`[data-${actionAttr}="items"]`)?.addEventListener('click', () => {
    handlers.onItems?.();
  });
  container.querySelector(`[data-${actionAttr}="interact"]`)?.addEventListener('click', () => {
    handlers.onInteract?.();
  });
}

export function renderPersonTraitsPanelHtml(person, opts = {}) {
  const actionAttr = opts.actionAttr || 'person-panel-action';
  return `<div class="person-traits-panel">
    <button type="button" class="person-panel-back" data-${actionAttr}="back">← Back</button>
    <div class="person-panel-title">Traits</div>
    <div class="trait-popup-panel person-panel-body">${renderTraitPopupListHtml(person)}</div>
  </div>`;
}

export function renderPersonItemsPanelHtml(person, escapeHtml, itemPopupOptions = {}, opts = {}) {
  const actionAttr = opts.actionAttr || 'person-panel-action';
  const owned = ownedItemIds(person);

  if (!owned.length) {
    return `<div class="person-items-panel">
      <button type="button" class="person-panel-back" data-${actionAttr}="back">← Back</button>
      <div class="person-panel-title">Items</div>
      <div class="person-panel-body person-items-empty">None</div>
    </div>`;
  }

  const cards = owned.map((id) => {
    const item = ITEMS_BY_ID[id];
    if (!item) return '';
    return `<button type="button" class="item-grid-card" data-item-id="${escapeHtml(id)}" title="${escapeHtml(item.label)}">
      ${renderEntryArt(item, { size: 28, className: 'item-grid-icon', escapeHtml })}
      <span class="item-grid-label">${escapeHtml(item.label)}</span>
      <span class="item-grid-type">${escapeHtml(itemTypeLabel(item.type))}</span>
    </button>`;
  }).join('');

  return `<div class="person-items-panel">
    <button type="button" class="person-panel-back" data-${actionAttr}="back">← Back</button>
    <div class="person-panel-title">Items</div>
    <div class="person-panel-body items-panel">
      <div class="items-grid">${cards}</div>
    </div>
  </div>`;
}

export function wirePersonItemsPanel(container, viewer, escapeHtml, itemPopupOptions = {}) {
  if (!container) return;
  container.querySelectorAll('.item-grid-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const itemId = btn.getAttribute('data-item-id');
      const item = ITEMS_BY_ID[itemId];
      if (item) openItemPopup(item, viewer, escapeHtml, itemPopupOptions);
    });
  });
}

export function renderProposeMarriagePanelHtml(player, opts = {}) {
  const {
    actionAttr = 'person-panel-action',
    bondHtml = '',
  } = opts;

  const simpleCost = getActionPointCost('propose_simple');
  const simpleApOk = canSpendActionPoints(player, simpleCost);
  const simpleDisabled = simpleApOk ? '' : ' disabled';

  const ringButtons = PROPOSAL_RING_TIERS.map((tier) => {
    const actionId = proposalRingActionId(tier.id);
    const apCost = getActionPointCost(actionId);
    const apOk = canSpendActionPoints(player, apCost);
    const moneyOk = canAffordProposalRingTier(player, tier);
    const cost = tier.moneyCost ?? tier.wealthCost ?? 0;
    const disabled = apOk && moneyOk ? '' : ' disabled';
    const title = !apOk
      ? 'No action points left this year'
      : moneyOk
        ? `Costs ${cost} pounds and ${apCost} AP`
        : `Requires ${cost} pounds`;
    return `<button type="button" class="career-confirm-btn situation-choice-btn"${disabled} data-${actionAttr}="${escapeHtml(actionId)}" title="${escapeHtml(title)}">Propose with ${escapeHtml(tier.label)} (${cost}, ${apCost} AP)</button>`;
  }).join('');

  return `<div class="person-interact-panel person-propose-panel">
    <button type="button" class="person-panel-back" data-${actionAttr}="propose-back">← Back</button>
    <div class="person-panel-title">Propose Marriage</div>
    ${bondHtml ? `<div class="person-interact-bond">${bondHtml}</div>` : ''}
    <div class="person-panel-body person-interact-body">
      <p class="person-info-interact-lead">How do you wish to ask?</p>
      <div class="person-info-interact-choices person-propose-choices">
        <button type="button" class="career-confirm-btn situation-choice-btn"${simpleDisabled} data-${actionAttr}="propose_simple">Simply propose (${simpleCost} AP)</button>
        ${ringButtons}
      </div>
      <p class="person-propose-hint">Finer rings improve their answer — Silver, then Gold, then Diamond.</p>
    </div>
  </div>`;
}

export function wireProposeMarriagePanel(container, actionAttr, handlers = {}) {
  if (!container) return;
  container.querySelector(`[data-${actionAttr}="propose-back"]`)?.addEventListener('click', () => {
    handlers.onBack?.();
  });
  container.querySelectorAll(`.person-info-interact-choices [data-${actionAttr}]`).forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const actionId = btn.getAttribute(`data-${actionAttr}`);
      if (actionId) handlers.onAction?.(actionId);
    });
  });
}

function interactButtonHtml(actionAttr, choice, player) {
  const cost = choice.apCost ?? getActionPointCost(choice.id);
  const apSuffix = cost > 0 ? ` (${cost} AP)` : '';
  const disabled = canSpendActionPoints(player, cost) ? '' : ' disabled';
  return `<button type="button" class="career-confirm-btn situation-choice-btn"${disabled} data-${actionAttr}="${escapeHtml(choice.id)}">${escapeHtml(choice.label)}${escapeHtml(apSuffix)}</button>`;
}

export function renderPersonInteractPanelHtml(opts = {}) {
  const {
    player,
    actionAttr = 'person-panel-action',
    bondHtml = '',
    choices = [],
  } = opts;

  const buttons = choices.map((c) => interactButtonHtml(actionAttr, c, player)).join('');

  return `<div class="person-interact-panel">
    <button type="button" class="person-panel-back" data-${actionAttr}="back">← Back</button>
    <div class="person-panel-title">Interact</div>
    ${bondHtml ? `<div class="person-interact-bond">${bondHtml}</div>` : ''}
    <div class="person-panel-body person-interact-body">
      <p class="person-info-interact-lead">Choose how you wish to engage them this year.</p>
      <div class="person-info-interact-choices">${buttons}</div>
    </div>
  </div>`;
}

export function wirePersonInteractPanel(container, actionAttr, handlers = {}) {
  if (!container) return;
  container.querySelector(`[data-${actionAttr}="back"]`)?.addEventListener('click', () => {
    handlers.onBack?.();
  });
  container.querySelectorAll(`.person-info-interact-choices [data-${actionAttr}]`).forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const actionId = btn.getAttribute(`data-${actionAttr}`);
      if (actionId) handlers.onAction?.(actionId);
    });
  });
}

export function wirePersonPanelBack(container, actionAttr, onBack) {
  container?.querySelector(`[data-${actionAttr}="back"]`)?.addEventListener('click', onBack);
}
