import { clamp } from './index.js';

/** Box-Muller approximately-normal distribution, clamped 0–100. */
export function rollNormal(mean, sd) {
  const u1 = Math.random() || 1e-9;
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return clamp(Math.round(mean + z * sd), 0, 100);
}
