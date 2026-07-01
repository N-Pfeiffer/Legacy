import {
  LOCKBOX_COOLDOWN_LABEL,
  LOCKBOX_INTRO_BODY,
  LOCKBOX_SUCCESS_ACQUISITION,
  LOCKBOX_SUCCESS_BODY,
  attemptMudlarkOpen,
  mudlarkAttemptLogText,
  mudlarkOnCooldown,
} from '../sim/mudlarkLockbox.js';
import { G } from '../state/gameState.js';
import { recordSituationResolution } from '../sim/situationLog.js';

let _isOpen = false;
let _wired = false;

function getOverlayEl() {
  return document.getElementById('decision-overlay');
}

function getModalEl() {
  return document.getElementById('decision-modal');
}

export function isDecisionPopupOpen() {
  return _isOpen;
}

export function closeDecisionPopup() {
  const overlay = getOverlayEl();
  if (overlay) overlay.classList.remove('active');
  _isOpen = false;
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
    ? ` data-disabled-reason="${escapeHtml(choice.disabledReason)}" title="${escapeHtml(choice.disabledReason)}"`
    : '';
  return `<button type="button" class="${cls}" data-decision-choice="${escapeHtml(choice.id)}"${disabled ? ' disabled' : ''}${reasonAttr}>${escapeHtml(choice.label)}</button>`;
}

function openResultPopup({ title, body, acquisition }, escapeHtml, onClose) {
  const overlay = getOverlayEl();
  const modal = getModalEl();
  if (!overlay || !modal) return;

  const acquisitionHtml = acquisition
    ? `<div class="decision-popup-acquisition">${escapeHtml(acquisition)}</div>`
    : '';

  modal.innerHTML = `
    <button type="button" class="situation-popup-back" data-decision-popup-action="close">← Back</button>
    <div class="situation-popup-title">${escapeHtml(title)}</div>
    <div class="situation-popup-body">${formatBodyHtml(body, escapeHtml)}</div>
    ${acquisitionHtml}
    <div class="situation-choices situation-popup-choices">
      <button type="button" class="career-confirm-btn situation-choice-btn" data-decision-popup-action="close">Continue</button>
    </div>`;

  modal.querySelectorAll('[data-decision-popup-action="close"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      closeDecisionPopup();
      if (typeof onClose === 'function') onClose();
    });
  });

  overlay.dataset.dismissible = 'true';
  overlay.classList.add('active');
  _isOpen = true;
}

function recordMudlarkAttempt(player, method) {
  const choiceLabel = method === 'study' ? 'Study the mechanism' : 'Force the lock';
  let outcome = { success: false };
  recordSituationResolution(player, {
    year: G.year,
    templateId: 'mudlarks_lockbox',
    title: "The Mudlark's Lockbox",
    choiceId: method,
    choiceLabel,
    logText: (p) => mudlarkAttemptLogText(p),
    domain: 'estate',
    logContext: 'Thames Mudflats',
    age: player.age,
    // Each pick is a beat in the chronicle; only the successful open earns a Memory.
    record: (p) => (p.mudlarkLockbox?.lastOutcome === 'success' ? 'milestone' : 'flavor'),
    reward: (p) => (p.mudlarkLockbox?.lastOutcome === 'success' ? '+ Lockbox prised open' : ''),
    apply: () => {
      outcome = attemptMudlarkOpen(player, method);
    },
  });
  return outcome.success;
}

export function openMudlarkLockboxPopup(player, { escapeHtml, year, onComplete } = {}) {
  const overlay = getOverlayEl();
  const modal = getModalEl();
  if (!overlay || !modal || !player) return;

  const onCooldown = mudlarkOnCooldown(player);
  const choices = [
    {
      id: 'force',
      label: 'Force the lock — Prowess',
      disabled: onCooldown,
      disabledReason: LOCKBOX_COOLDOWN_LABEL,
    },
    {
      id: 'study',
      label: 'Study the mechanism — Insight',
      disabled: onCooldown,
      disabledReason: LOCKBOX_COOLDOWN_LABEL,
    },
  ];

  modal.innerHTML = `
    <button type="button" class="situation-popup-back" data-decision-popup-action="close">← Back</button>
    <div class="situation-popup-title">The Mudlark's Lockbox</div>
    <div class="situation-popup-body">${formatBodyHtml(LOCKBOX_INTRO_BODY, escapeHtml)}</div>
    <div class="situation-choices situation-popup-choices">
      ${choices.map((c) => renderChoiceButton(c, escapeHtml)).join('')}
    </div>`;

  overlay.dataset.dismissible = 'true';
  overlay.classList.add('active');
  _isOpen = true;

  const finish = () => {
    if (typeof onComplete === 'function') onComplete();
  };

  modal.querySelector('[data-decision-popup-action="close"]')?.addEventListener('click', () => {
    closeDecisionPopup();
    finish();
  });

  modal.querySelectorAll('[data-decision-choice]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const choiceId = btn.getAttribute('data-decision-choice');

      const success = recordMudlarkAttempt(player, choiceId);

      if (success) {
        openResultPopup(
          {
            title: "The Mudlark's Lockbox",
            body: LOCKBOX_SUCCESS_BODY,
            acquisition: LOCKBOX_SUCCESS_ACQUISITION,
          },
          escapeHtml,
          finish,
        );
      } else {
        closeDecisionPopup();
        finish();
      }
    });
  });
}

export function wireDecisionPopupOverlay(deps = {}) {
  if (_wired) return;
  const overlay = getOverlayEl();
  if (!overlay) return;
  _wired = true;

  overlay.addEventListener('click', (e) => {
    if (e.target !== overlay) return;
    if (overlay.dataset.dismissible !== 'true') return;
    closeDecisionPopup();
    if (typeof deps.onDismiss === 'function') deps.onDismiss();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !_isOpen) return;
    if (overlay.dataset.dismissible !== 'true') return;
    closeDecisionPopup();
    if (typeof deps.onDismiss === 'function') deps.onDismiss();
  });
}
