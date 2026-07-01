/** Birth social class — maps to wealth stat; point cost equals wealth value (1:1). */

export const SOCIAL_CLASS_TIERS = [
  { id: 'destitute', label: 'Destitute', wealth: 0, pointCost: 0 },
  { id: 'poor', label: 'Poor', wealth: 15, pointCost: 15 },
  { id: 'middle', label: 'Middle Class', wealth: 38, pointCost: 38 },
  { id: 'rich', label: 'Rich', wealth: 63, pointCost: 63 },
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
