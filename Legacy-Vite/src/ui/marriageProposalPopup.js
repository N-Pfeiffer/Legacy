import { G } from '../state/gameState.js';
import {
  PROPOSAL_SUCCESS_BODY,
  PROPOSAL_FAILURE_BODY,
  PROPOSAL_INSUFFICIENT_BOND_BODY,
  PROPOSAL_CANNOT_AFFORD_TITLE,
  PROPOSAL_FORCE_REFUSAL_BUTTON_LABEL,
  PROPOSAL_FORCE_REFUSAL_BODY,
  PROPOSE_ENTHRALLMENT_FORCE_MIN,
  proposalSuccessTitle,
  proposalSpouseRoleLabel,
  canForceProposalRefusal,
} from '../data/marriageProposal.js';
import { getRelationshipOrDefault, bumpIntimacy, syncSocialBuckets } from '../sim/relationships.js';
import { marryPersons } from '../sim/marriage.js';
import { closeDecisionPopup } from './decisionPopup.js';

let _isOpen = false;

function getOverlayEl() {
  return document.getElementById('decision-overlay');
}

function getModalEl() {
  return document.getElementById('decision-modal');
}

export function isMarriageProposalPopupOpen() {
  return _isOpen;
}

function formatBodyHtml(body, escapeHtml) {
  const text = String(body || '');
  return escapeHtml(text)
    .replace(/\n\n/g, '</p><p>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}

function renderChoiceButton(choice, escapeHtml) {
  const disabled = choice.disabled;
  const cls = disabled
    ? 'career-confirm-btn situation-choice-btn situation-choice-btn--disabled'
    : 'career-confirm-btn situation-choice-btn';
  const reasonAttr = disabled && choice.disabledReason
    ? ` title="${escapeHtml(choice.disabledReason)}"`
    : '';
  return `<button type="button" class="${cls}" data-proposal-choice="${escapeHtml(choice.id)}"${disabled ? ' disabled' : ''}${reasonAttr}>${escapeHtml(choice.label)}</button>`;
}

function finishPopup(onComplete) {
  closeDecisionPopup();
  _isOpen = false;
  if (typeof onComplete === 'function') onComplete();
}

function openSimpleProposalPopup({ title, bodyHtml, escapeHtml, onComplete }) {
  const modal = getModalEl();
  const overlay = getOverlayEl();
  if (!modal || !overlay) return;

  modal.innerHTML = `
    <div class="situation-popup-title">${escapeHtml(title)}</div>
    <div class="situation-popup-body">${bodyHtml}</div>
    <div class="situation-choices situation-popup-choices">
      ${renderChoiceButton({ id: 'continue', label: 'Continue' }, escapeHtml)}
    </div>`;

  overlay.dataset.dismissible = 'false';
  overlay.classList.add('active');
  _isOpen = true;

  modal.querySelector('[data-proposal-choice="continue"]')?.addEventListener('click', () => {
    finishPopup(onComplete);
  });
}

function annalsPersonName(target, ctx) {
  const fn = ctx.personNameHtmlAnnals || ctx.personNameHtml;
  return typeof fn === 'function' ? fn(target) : target.firstName;
}

function openForceRefusalFollowUpPopup(player, target, ctx) {
  const { escapeHtml, onComplete, onAnnals } = ctx;
  const modal = getModalEl();
  const overlay = getOverlayEl();
  if (!modal || !overlay || !player || !target) return;

  const name = annalsPersonName(target, ctx);

  modal.innerHTML = `
    <div class="situation-popup-title">${escapeHtml('You Refuse Their Refusal')}</div>
    <div class="situation-popup-body">${formatBodyHtml(PROPOSAL_FORCE_REFUSAL_BODY, escapeHtml)}</div>
    <div class="situation-choices situation-popup-choices">
      ${renderChoiceButton({ id: 'continue', label: 'Continue' }, escapeHtml)}
    </div>`;

  overlay.dataset.dismissible = 'false';
  overlay.classList.add('active');
  _isOpen = true;

  modal.querySelector('[data-proposal-choice="continue"]')?.addEventListener('click', () => {
    if (!marryPersons(player, target)) {
      finishPopup(onComplete);
      return;
    }
    syncSocialBuckets(player);
    onAnnals?.({
      msg: `You overrode ${name}'s refusal. The law binds you all the same — but something in their eyes will never be the same.`,
      type: 'bad',
      html: true,
    });
    finishPopup(onComplete);
  });
}

function openRefusalPopup(player, target, body, ctx) {
  const { escapeHtml, onComplete, onAnnals, personNameHtml } = ctx;
  const modal = getModalEl();
  const overlay = getOverlayEl();
  if (!modal || !overlay || !player || !target) return;

  const edge = getRelationshipOrDefault(player, target.id);
  const canForce = canForceProposalRefusal(player, edge);
  const forceDisabledReason = `Requires Enthrallment above ${PROPOSE_ENTHRALLMENT_FORCE_MIN}`;

  const choices = [{ id: 'accept', label: 'Accept their answer' }];
  if (player.isVampire) {
    choices.push({
      id: 'force',
      label: PROPOSAL_FORCE_REFUSAL_BUTTON_LABEL,
      disabled: !canForce,
      disabledReason: forceDisabledReason,
    });
  }

  modal.innerHTML = `
    <div class="situation-popup-title">Declined</div>
    <div class="situation-popup-body">${formatBodyHtml(body, escapeHtml)}</div>
    <div class="situation-choices situation-popup-choices">
      ${choices.map((c) => renderChoiceButton(c, escapeHtml)).join('')}
    </div>`;

  overlay.dataset.dismissible = 'false';
  overlay.classList.add('active');
  _isOpen = true;

  modal.querySelector('[data-proposal-choice="accept"]')?.addEventListener('click', () => {
    finishPopup(onComplete);
  });

  modal.querySelector('[data-proposal-choice="force"]')?.addEventListener('click', () => {
    if (!canForce) return;
    openForceRefusalFollowUpPopup(player, target, { escapeHtml, onComplete, onAnnals, personNameHtml });
  });
}

/**
 * @param {'success' | 'failure' | 'insufficient_bond' | 'cannot_afford'} result
 * @param {{ escapeHtml: Function, onComplete?: Function, onAnnals?: Function, personNameHtml?: Function, ringLabel?: string }} ctx
 */
export function openMarriageProposalResultPopup(player, target, result, ctx = {}) {
  const { escapeHtml, onComplete, onAnnals, personNameHtml, ringLabel } = ctx;
  const overlay = getOverlayEl();
  const modal = getModalEl();
  if (!overlay || !modal || !player || !target) return;

  const nameHtml = typeof personNameHtml === 'function' ? personNameHtml(target) : escapeHtml(target.firstName);

  if (result === 'insufficient_bond') {
    openRefusalPopup(player, target, PROPOSAL_INSUFFICIENT_BOND_BODY, ctx);
    return;
  }

  if (result === 'cannot_afford') {
    const ringText = escapeHtml(String(ringLabel || 'ring').toLowerCase());
    openSimpleProposalPopup({
      title: PROPOSAL_CANNOT_AFFORD_TITLE,
      bodyHtml: `<p>You cannot afford a ${ringText} worthy of ${nameHtml}.</p>`,
      escapeHtml,
      onComplete,
    });
    return;
  }

  if (result === 'success') {
    const role = proposalSpouseRoleLabel(target);
    modal.innerHTML = `
      <div class="situation-popup-title">${escapeHtml(proposalSuccessTitle(target))}</div>
      <div class="situation-popup-body">${formatBodyHtml(PROPOSAL_SUCCESS_BODY, escapeHtml)}</div>
      <div class="situation-choices situation-popup-choices">
        ${renderChoiceButton({ id: 'kiss', label: `Kiss the ${role}` }, escapeHtml)}
      </div>`;

    overlay.dataset.dismissible = 'false';
    overlay.classList.add('active');
    _isOpen = true;

    modal.querySelector('[data-proposal-choice="kiss"]')?.addEventListener('click', () => {
      bumpIntimacy(player, target.id, 5, G.year, 'intimacy_gain');
      syncSocialBuckets(player);
      onAnnals?.({
        msg: `You kiss your new ${role}.`,
        type: 'good',
        html: true,
      });
      finishPopup(onComplete);
    });
    return;
  }

  openRefusalPopup(player, target, PROPOSAL_FAILURE_BODY, ctx);
}
