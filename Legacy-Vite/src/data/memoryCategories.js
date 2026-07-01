/** Labels for Journal → Memories category meta rows. */
export const MEMORY_CATEGORIES = {
  family_birth:    { label: 'Birth' },
  family_death:    { label: 'Death' },
  family_marriage: { label: 'Marriage' },
  education:       { label: 'Education' },
  career:          { label: 'Career' },
  story:           { label: 'Story' },
  item:            { label: 'Item' },
  trait:           { label: 'Trait' },
  life:            { label: 'Life' },
};

export function memoryCategoryLabel(category) {
  return MEMORY_CATEGORIES[category]?.label || category || 'Memory';
}
