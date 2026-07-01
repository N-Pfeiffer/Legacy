/** Crafted consumables with onUse effects (Phase 5). */

function use(id, label, type, icon, description, opts = {}) {
  return {
    id,
    label,
    category: 'consumable',
    type,
    description,
    icon,
    ...opts,
  };
}

export const CRAFT_CONSUMABLE_ITEMS = [
  use(
    'oneiric_resin',
    'Oneiric Resin',
    'uncommon',
    '🌙',
    'Resin that stirs dreamlike visions. Used in mystic rites.',
    { useNote: 'Required for Séance rituals (not yet usable on its own).' },
  ),
  use(
    'elixir_of_comprehension',
    'Elixir of Comprehension',
    'rare',
    '🧪',
    'A draught that permanently sharpens the mind.',
    {
      effectSummary: '+1 Intelligence',
      useLabel: 'Drink',
      onUse: { stat: 'intelligence', delta: 1, permanent: true },
    },
  ),
  use(
    'stalkers_brew',
    "Stalker's Brew",
    'rare',
    '🍶',
    'A hunter’s draught that steadies the hand and eye.',
    {
      effectSummary: '+1 Prowess',
      useLabel: 'Drink',
      onUse: { stat: 'prowess', delta: 1, permanent: true },
    },
  ),
  use(
    'vial_of_blood',
    'Vial of Blood',
    'uncommon',
    '🩸',
    'Fresh blood in a stoppered glass vial.',
    {
      effectSummary: 'Restores Health (mortal)',
      useLabel: 'Use',
      onUse: { restore: 'health', amount: 50 },
      onUseVampire: { restore: 'blood', amount: 50, vampireOnly: true, unimplemented: true },
    },
  ),
];
