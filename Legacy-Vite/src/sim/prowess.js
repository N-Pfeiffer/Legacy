import { clamp } from '../utils/index.js';
import { itemBonus } from './itemEffects.js';

/** Effective prowess (age curve + training bonus + item bonuses while owned). */
export function currentProwess(p) {
  if (!p) return 0;

  let curve;
  if (p.age < 3) curve = 0;
  else if (p.age < 8) curve = 3;
  else if (p.age < 13) curve = 6;
  else if (p.age < 18) curve = 12;
  else if (p.age < 36) curve = 14;
  else if (p.age < 51) curve = 12;
  else if (p.age < 66) curve = 10;
  else curve = 6;

  const sexMult = p.sex === 'F' ? 0.70 : 1.00;
  const base = (p.prowessBase || 0) + (p.prowessBonus || 0);
  let total = Math.round(curve * sexMult + base);
  total += itemBonus(p, 'prowess');

  if (p.isVampire) {
    total += 10;
    return clamp(total, 0, 300);
  }
  return clamp(total, 0, 50);
}
