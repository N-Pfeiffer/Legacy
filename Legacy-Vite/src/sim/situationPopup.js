import { isImmersiveTemplate } from '../data/immersiveEvents.js';
import { isImmersivePopupOpen } from './immersivePopup.js';
import { markSituationRead } from './situationAttention.js';
import { renderSituationPendingMetaHtml, formatChoiceEffectsLine } from './situationLog.js';

let _openInstanceId = null;
let _isOpen = false;
let _wired = false;

/** Templates that open automatically instead of appearing in the Situations list. */
export function isAutoOpenTemplate(tpl) {
  return tpl?.autoOpen === true;
}

function findPendingAutoOpen(player, registry) {
  if (!player?.situations?.length) return null;
  for (const inst of player.situations) {
    const tpl = registry[inst.templateId];
    if (!tpl || !isAutoOpenTemplate(tpl) || isImmersiveTemplate(tpl)) continue;
    return { inst, tpl };
  }
  return null;
}

/** Show the first pending auto-open situation popup, if any. */
export function showAutoSituationPopupIfNeeded(player, registry, deps) {
  if (!player) return false;
  if (_isOpen) return true;
  if (isImmersivePopupOpen()) return false;

  const pending = findPendingAutoOpen(player, registry);
  if (!pending) return false;

  openSituationPopup(player, pending.inst, pending.tpl, deps);
  return true;
}

/** Whether the player can close without choosing (back / outside click). */
export function isSituationDismissible(tpl) {
  if (tpl?.dismissible === true) return true;
  if (tpl?.dismissible === false) return false;
  return tpl?.blocksPassYear === false;
}

function getOverlayEl() {
  return document.getElementById('situation-overlay');
}

function getModalEl() {
  return document.getElementById('situation-modal');
}

export function isSituationPopupOpen() {
  return _isOpen;
}

export function closeSituationPopup() {
  const overlay = getOverlayEl();
  if (overlay) overlay.classList.remove('active');
  _isOpen = false;
  _openInstanceId = null;
}

function formatBodyHtml(body, escapeHtml) {
  const text = String(body || '');
  return escapeHtml(text)
    .replace(/\n\n/g, '</p><p>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}

function filterVisibleButtons(tpl, player, inst, hasTrait) {
  return (tpl.buttons || []).filter((b) => {
    if (b.requiresTrait && !hasTrait(player, b.requiresTrait)) return false;
    if (b.requiresAnyTrait && !b.requiresAnyTrait.some((id) => hasTrait(player, id))) return false;
    if (typeof b.visible === 'function' && !b.visible(player, inst)) return false;
    return true;
  });
}

function renderModalContent(modal, player, inst, tpl, escapeHtml, hasTrait) {
  const title = typeof tpl.title === 'function' ? tpl.title(player) : tpl.title;
  const body = typeof tpl.body === 'function' ? tpl.body(player) : tpl.body;
  const dismissible = isSituationDismissible(tpl);
  const visibleButtons = filterVisibleButtons(tpl, player, inst, hasTrait);
  const metaHtml = renderSituationPendingMetaHtml(tpl, inst, escapeHtml);
  const backHtml = dismissible
    ? '<button type="button" class="situation-popup-back" data-situation-popup-action="back">← Back</button>'
    : '';

  const buttonsHtml = visibleButtons.map((b) => {
    const label = typeof b.label === 'function' ? b.label(player, inst) : b.label;
    const effectsSuffix = formatChoiceEffectsLine(b.effects);
    return `<button type="button" class="career-confirm-btn situation-choice-btn" data-situation-button="${escapeHtml(b.id)}">${escapeHtml(label)}${effectsSuffix}</button>`;
  }).join('');
  const choicesBlock = buttonsHtml
    ? `<div class="situation-choices situation-popup-choices">${buttonsHtml}</div>`
    : '';

  modal.innerHTML = `
    ${backHtml}
    ${metaHtml}
    <div class="situation-popup-title">${escapeHtml(title)}</div>
    <div class="situation-popup-body">${formatBodyHtml(body, escapeHtml)}</div>
    ${choicesBlock}`;
}

function wireModalHandlers(modal, player, inst, tpl, deps) {
  const { escapeHtml, hasTrait, onResolve, onDismiss } = deps;

  renderModalContent(modal, player, inst, tpl, escapeHtml, hasTrait);

  modal.querySelector('[data-situation-popup-action="back"]')?.addEventListener('click', () => {
    if (typeof onDismiss === 'function') onDismiss();
  });

  modal.querySelectorAll('[data-situation-button]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const buttonId = btn.getAttribute('data-situation-button');
      if (typeof onResolve === 'function') onResolve(inst.instanceId, buttonId);
    });
  });
}

export function openSituationPopup(player, inst, tpl, deps) {
  const overlay = getOverlayEl();
  const modal = getModalEl();
  if (!overlay || !modal || !player || !inst || !tpl) return;

  _openInstanceId = inst.instanceId;
  _isOpen = true;
  markSituationRead(inst);
  overlay.classList.add('active');
  overlay.dataset.dismissible = isSituationDismissible(tpl) ? 'true' : 'false';

  wireModalHandlers(modal, player, inst, tpl, deps);
}

export function refreshSituationPopup(player, inst, tpl, deps) {
  if (!_isOpen || _openInstanceId !== inst?.instanceId) return;
  const modal = getModalEl();
  if (!modal) return;
  wireModalHandlers(modal, player, inst, tpl, deps);
}

function overlayBackdropHandler(e, onDismiss) {
  const overlay = getOverlayEl();
  if (!overlay || e.target !== overlay) return;
  if (overlay.dataset.dismissible !== 'true') return;
  if (typeof onDismiss === 'function') onDismiss();
}

/** One-time overlay wiring (backdrop + Escape). */
export function wireSituationPopupOverlay(deps) {
  if (_wired) return;
  const overlay = getOverlayEl();
  if (!overlay) return;
  _wired = true;

  overlay.addEventListener('click', (e) => {
    overlayBackdropHandler(e, deps.onDismiss);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !_isOpen) return;
    if (overlay.dataset.dismissible !== 'true') return;
    if (typeof deps.onDismiss === 'function') deps.onDismiss();
  });
}
