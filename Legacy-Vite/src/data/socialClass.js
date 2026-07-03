/** Birth social class — maps to parent NPC wealth; point cost is 25% of wealth (rounded up). */

export const SOCIAL_CLASS_TIERS = [
  { id: 'destitute', label: 'Destitute', wealth: 0, pointCost: 0 },
  { id: 'poor', label: 'Poor', wealth: 15, pointCost: 4 },
  { id: 'middle', label: 'Middle Class', wealth: 38, pointCost: 10 },
  { id: 'rich', label: 'Rich', wealth: 63, pointCost: 16 },
];

export const SOCIAL_CLASS_BY_ID = Object.fromEntries(
  SOCIAL_CLASS_TIERS.map((t) => [t.id, t]),
);

export const DEFAULT_SOCIAL_CLASS_ID = 'destitute';

export function formatSocialClassOptionLabel(tier) {
  const pts = tier.pointCost;
  const costLabel = pts === 1 ? '1 point' : `${pts} points`;
  return `${tier.label} — ${costLabel}`;
}
