/** Scholarship-specific catalog entries. */

function mat(id, label, type = 'common', icon = '📜', description = '') {
  return {
    id,
    label,
    category: 'material',
    type,
    description,
    icon,
  };
}

function comp(id, label, type = 'common', icon = '📜', description = '') {
  return {
    id,
    label,
    category: 'component',
    type,
    description,
    icon,
  };
}

function equip(id, label, slot, type, whileEquipped, description, opts = {}) {
  return {
    id,
    label,
    category: 'equipment',
    slot,
    type,
    description,
    effectSummary: opts.effectSummary || '',
    whileEquipped,
    icon: opts.icon || '📜',
  };
}

export const SCHOLARSHIP_ITEMS = [
  comp('notes', 'Notes', 'common', '📝', 'Scribbled observations for translation and study.'),
  mat('foreign_tome', 'Foreign Tome', 'uncommon', '📕', 'A text in an unfamiliar tongue.'),
  equip(
    'translated_tome',
    'Translated Tome',
    'artifact',
    'rare',
    { intelligence: 1, insight: 1 },
    'A painstaking translation rich with foreign lore.',
    { effectSummary: '+1 Intelligence, +1 Insight', icon: '📖' },
  ),
  equip(
    'scholars_tome',
    "Scholar's Tome",
    'artifact',
    'rare',
    { intelligence: 2 },
    'A formal volume of your own authorship.',
    { effectSummary: '+2 Intelligence', icon: '📚' },
  ),
];
