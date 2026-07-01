/** Wealth band for NPC schooling dropout (matches wealthTierLabel breakpoints). */
export function wealthBand(wealth) {
  const w = Math.max(0, Math.round(wealth ?? 0));
  if (w <= 5) return 'destitute';
  if (w <= 25) return 'poor';
  return 'middle_plus'; // middle class, rich, wealthy — stay in school
}

/**
 * Annual probability of leaving school while enrolled (primary or secondary).
 * @returns {number} 0–1
 */
export function npcSchoolDropoutChance(person, year) {
  if (!person || person.isPlayer || !person.isAlive) return 0;

  const stage = person.education?.stage;
  if (stage !== 'primary' && stage !== 'secondary') return 0;

  const age = person.age;
  if (age < 10) return 0;

  const band = wealthBand(person.wealth);
  const post1850 = year >= 1850;

  if (band === 'destitute' || band === 'poor') {
    if (age >= 10 && age <= 12) return post1850 ? 0.20 : 0.30;
    if (age >= 13 && age <= 14) return post1850 ? 0.30 : 0.45;
    if (age >= 15 && age <= 17) return post1850 ? 0.15 : 0.25;
    return 0;
  }

  // Middle class and above
  if (age >= 10 && age <= 14) return post1850 ? 0.01 : 0.03;
  if (age >= 15 && age <= 17) return post1850 ? 0.01 : 0.05;
  return 0;
}
