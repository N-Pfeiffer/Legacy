export const ERAS = [1800, 1850, 1900, 1950, 2000];
export const ERA_LENGTH = 50;
export const ERA_OVERLAP_YEARS = 10;

export function currentEra(year) {
  for (let i = ERAS.length - 1; i >= 0; i--) {
    if (year >= ERAS[i]) return ERAS[i];
  }
  return ERAS[0];
}

export function eligibleEras(year) {
  const cur = currentEra(year);
  const idx = ERAS.indexOf(cur);
  const hasNext = idx >= 0 && idx < ERAS.length - 1;
  if (!hasNext) return [cur];

  const eraEnd = cur + ERA_LENGTH;
  const inOverlap = year >= eraEnd - ERA_OVERLAP_YEARS;
  return inOverlap ? [cur, ERAS[idx + 1]] : [cur];
}
