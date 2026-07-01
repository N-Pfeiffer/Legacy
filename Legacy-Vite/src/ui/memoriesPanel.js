import { G } from '../state/gameState.js';
import { renderMemoriesHtml } from '../sim/memories.js';
import { escapeHtml } from '../utils/escapeHtml.js';

export function renderMemoriesPanel() {
  const panel = document.getElementById('memories-list');
  if (!panel) return;
  panel.innerHTML = renderMemoriesHtml(G.memories || [], escapeHtml);
}
