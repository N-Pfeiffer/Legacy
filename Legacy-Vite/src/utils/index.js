export { escapeHtml } from './escapeHtml.js';
export { statCap } from './statCap.js';
export { weightedPick } from './weightedPick.js';
export { rollNormal } from './random.js';

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
