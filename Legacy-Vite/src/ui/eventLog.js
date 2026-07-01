import { G } from '../state/gameState.js';
import { escapeHtml } from '../utils/escapeHtml.js';

export const LOG_MAX = 200;

function getLogEl() {
  return document.getElementById('event-log');
}

function createLogLi(entry) {
  const li = document.createElement('li');
  li.className = entry.type || 'info';

  const yearSpan = document.createElement('span');
  yearSpan.className = 'ly';
  yearSpan.textContent = String(entry.year);
  li.appendChild(yearSpan);

  if (entry.html) {
    const body = document.createElement('span');
    body.innerHTML = entry.msg;
    li.appendChild(body);
  } else {
    li.appendChild(document.createTextNode(String(entry.msg)));
  }

  return li;
}

/** Whether the Annals already contain an entry for this calendar year. */
export function hasAnnalsForYear(year) {
  if (!Array.isArray(G.eventLog)) return false;
  return G.eventLog.some((e) => e.year === year);
}

/** Append an annals entry (newest first). Multiple entries per year allowed. */
export function appendAnnalsEntry(entry) {
  const stored = {
    year: entry.year,
    msg: entry.msg,
    type: entry.type || 'info',
    html: !!entry.html,
  };

  if (!Array.isArray(G.eventLog)) G.eventLog = [];

  G.eventLog.unshift(stored);
  while (G.eventLog.length > LOG_MAX) G.eventLog.pop();

  renderEventLog();
}

/** @deprecated Use appendAnnalsEntry — kept for any external callers. */
export function writeAnnalsEntry(entry) {
  appendAnnalsEntry(entry);
}

/** Rebuild the Annals list from persisted game state (after load). */
export function renderEventLog() {
  const log = getLogEl();
  if (!log) return;
  log.replaceChildren();
  if (!Array.isArray(G.eventLog)) G.eventLog = [];
  for (const entry of G.eventLog) {
    log.appendChild(createLogLi(entry));
  }
}

/** Escape dynamic text before embedding in HTML annals templates. */
export { escapeHtml };
