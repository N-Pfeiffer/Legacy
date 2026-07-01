import { G, getPlayer } from '../state/gameState.js';
import { memoryCategoryLabel } from '../data/memoryCategories.js';

let _memoryId = 0;

export function nextMemoryId() {
  return ++_memoryId;
}

export function setMemoryIdCounter(n) {
  _memoryId = n;
}

export function syncMemoryIdFromSave(memories) {
  if (!memories?.length) {
    setMemoryIdCounter(0);
    return;
  }
  const maxId = memories.reduce((m, e) => Math.max(m, e.id || 0), 0);
  setMemoryIdCounter(maxId);
}

/** Append a curated milestone to G.memories (newest first). */
export function recordMemory(entry) {
  if (!Array.isArray(G.memories)) G.memories = [];

  const player = getPlayer();
  const stored = {
    id: entry.id ?? nextMemoryId(),
    year: entry.year ?? G.year,
    age: entry.age ?? player?.age,
    category: entry.category || 'life',
    title: entry.title || undefined,
    msg: entry.msg,
    type: entry.type || 'info',
    html: !!entry.html,
  };

  G.memories.unshift(stored);
  return stored;
}

export function formatMemoryContextLine({ category, age }) {
  const parts = [memoryCategoryLabel(category)];
  if (age != null) parts.push(`Age ${age}`);
  return parts.join(' · ');
}

/** Summary line plus optional parenthetical stat outcome on its own row. */
export function formatMemoryBody(msg, escapeHtml) {
  const text = String(msg || '');
  const nl = text.indexOf('\n');
  if (nl < 0) return escapeHtml(text);
  const summary = escapeHtml(text.slice(0, nl));
  const outcome = escapeHtml(text.slice(nl + 1).trim());
  if (!outcome) return summary;
  return `${summary}<div class="memory-log-outcome">${outcome}</div>`;
}

export function renderMemoriesHtml(memories, escapeHtml) {
  if (!memories?.length) {
    return '<div class="memory-log-empty" data-vocab="dec.memories_empty">Your years are yet too few to be remembered. Live them first.</div>';
  }

  const entries = [...memories];
  return entries.map((entry) => {
    const contextLine = formatMemoryContextLine({
      category: entry.category,
      age: entry.age,
    });
    const titleHtml = entry.title
      ? `<div class="memory-log-title">${escapeHtml(entry.title)}</div>`
      : '';
    const bodyHtml = entry.html
      ? entry.msg
      : formatMemoryBody(entry.msg, escapeHtml);

    return `<div class="memory-log-entry memory-log-entry--${escapeHtml(entry.type || 'info')}">
      <div class="memory-log-meta">
        <span class="memory-log-context">${escapeHtml(contextLine)}</span>
        <span class="memory-log-year">${escapeHtml(String(entry.year))}</span>
      </div>
      ${titleHtml}
      <div class="memory-log-body">${bodyHtml}</div>
    </div>`;
  }).join('');
}
