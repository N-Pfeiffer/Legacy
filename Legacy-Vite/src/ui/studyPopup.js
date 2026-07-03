import {
  applyStudy,
  STUDY_BODY,
  STUDY_DECISION_AP,
  studyEligible,
} from '../data/decisions.js';

let _isOpen = false;
let _wired = false;

function getOverlayEl() {
  return document.getElementById('study-overlay');
}

function getModalEl() {
  return document.getElementById('study-modal');
}

export function isStudyPopupOpen() {
  return _isOpen;
}

export function closeStudyPopup() {
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

export function openStudyPopup(player, { escapeHtml, onComplete } = {}) {
  const overlay = getOverlayEl();
  const modal = getModalEl();
  if (!overlay || !modal || !player || !studyEligible(player)) return;

  modal.innerHTML = `
    <div class="situation-popup-title">Study</div>
    <div class="situation-popup-body">${formatBodyHtml(STUDY_BODY, escapeHtml)}</div>
    <div class="situation-choices situation-popup-choices">
      <button type="button" class="career-confirm-btn situation-choice-btn" data-study-popup-action="confirm">Study (${STUDY_DECISION_AP} AP)</button>
    </div>`;

  overlay.dataset.dismissible = 'true';
  overlay.classList.add('active');
  _isOpen = true;

  modal.querySelector('[data-study-popup-action="confirm"]')?.addEventListener('click', () => {
    if (!studyEligible(player)) {
      closeStudyPopup();
      if (typeof onComplete === 'function') onComplete();
      return;
    }
    applyStudy(player);
    closeStudyPopup();
    if (typeof onComplete === 'function') onComplete();
  });
}

export function wireStudyPopupOverlay(deps = {}) {
  if (_wired) return;
  const overlay = getOverlayEl();
  if (!overlay) return;
  _wired = true;

  overlay.addEventListener('click', (e) => {
    if (e.target !== overlay) return;
    if (overlay.dataset.dismissible !== 'true') return;
    closeStudyPopup();
    if (typeof deps.onDismiss === 'function') deps.onDismiss();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !_isOpen) return;
    if (overlay.dataset.dismissible !== 'true') return;
    closeStudyPopup();
    if (typeof deps.onDismiss === 'function') deps.onDismiss();
  });
}
