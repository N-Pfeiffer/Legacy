/**
 * Player school grade — a per-tier ladder climbing F → D → C → B → A, each band 0–100.
 *
 * The grade is ephemeral: it lives on `player.education.grade` only while the player is in a
 * graded tier (primary/secondary), is reset on entering a tier, and is cleared after the
 * end-of-tier reward is consumed (Phase 3). Player-only — classmates never carry a grade.
 *
 * Hitting 100 in a band promotes to the next letter at 0 (F → D → C → B → A). 'A' caps at 100;
 * 'F' floors at 0. University is NOT graded this pass.
 */

import { clamp } from '../utils/index.js';

/** Worst → best. Index 0 is the floor (F), index 4 the top (A). */
export const GRADE_ORDER = ['F', 'D', 'C', 'B', 'A'];

/** End-of-tier reward by final letter (applied at the tier transition — see Phase 3). */
export const GRADE_REWARDS = {
  A: { intelligence: 5, insight: 2, charisma: 1 },
  B: { intelligence: 3, insight: 1, charisma: 1 },
  C: { intelligence: 1 },
  D: {},
  F: { health: -10 }, // F also triggers expulsion, handled at the transition
};

const GRADED_STAGES = new Set(['primary', 'secondary']);

/** True while the player is in a tier that uses the grade system. */
export function isGradedTier(player) {
  return GRADED_STAGES.has(player?.education?.stage);
}

/**
 * Ensure a valid grade object exists while in a graded tier. Lazily creates F/0 so existing
 * in-school saves get a grade without a dedicated migration. Returns the grade or null.
 */
export function ensureGrade(player) {
  if (!player?.education || !isGradedTier(player)) return null;
  const ed = player.education;
  const g = ed.grade;
  if (!g || typeof g !== 'object'
      || !GRADE_ORDER.includes(g.letter)
      || typeof g.points !== 'number') {
    ed.grade = { letter: 'F', points: 0 };
  }
  return ed.grade;
}

/** Reset to F/0 — call on entering a tier. */
export function resetGrade(player) {
  if (!player?.education) return;
  player.education.grade = { letter: 'F', points: 0 };
}

/** Remove the grade object — call after consuming the end-of-tier reward. */
export function clearGrade(player) {
  if (player?.education && 'grade' in player.education) delete player.education.grade;
}

/**
 * Add (or subtract) grade points, rolling across letters. Promotes at 100, demotes below 0,
 * clamps at A/100 and F/0. Returns the grade object.
 */
export function addGrade(player, n) {
  const grade = ensureGrade(player);
  if (!grade || !n) return grade;
  let idx = GRADE_ORDER.indexOf(grade.letter);
  let points = grade.points + n;
  while (points >= 100 && idx < GRADE_ORDER.length - 1) {
    points -= 100;
    idx += 1;
  }
  while (points < 0 && idx > 0) {
    points += 100;
    idx -= 1;
  }
  grade.letter = GRADE_ORDER[idx];
  grade.points = Math.round(clamp(points, 0, 100));
  return grade;
}

/** Current letter (defaults to 'F'). Used for the end-of-tier reward. */
export function finalGradeLetter(player) {
  return ensureGrade(player)?.letter ?? 'F';
}

/** Display string, e.g. "C — 62 / 100". */
export function gradeLabel(player) {
  const g = ensureGrade(player);
  if (!g) return '';
  return `${g.letter} — ${Math.round(g.points)} / 100`;
}

/** Fill fraction (0..1) of the current letter band, for the progress bar. */
export function gradeFillFraction(player) {
  const g = ensureGrade(player);
  if (!g) return 0;
  return clamp(g.points / 100, 0, 1);
}

/**
 * Passive grade points gained per enrolled year from intelligence alone.
 * BALANCE: provisional — Int 10 → ~12/yr (fails), Int ~30 → ~40/yr (coasts to C), capped at 60.
 */
export function gradePassivePerYear(intelligence) {
  return clamp(Math.round(1.4 * (intelligence || 0) - 2), 0, 60);
}

/** Apply an end-of-tier reward (GRADE_REWARDS[letter]) directly to the player. */
export function applyGradeReward(player, letter, statCap) {
  const reward = GRADE_REWARDS[letter] || {};
  for (const [stat, delta] of Object.entries(reward)) {
    const cap = statCap ? statCap(stat, !!player.isVampire, stat === 'health' ? player : null) : Infinity;
    player[stat] = clamp((player[stat] || 0) + delta, 0, cap);
  }
}
