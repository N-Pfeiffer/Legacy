// Extracted from src/legacy.js VOCAB table.

export const VOCAB = {
  mortal: {
    // Top section nav
    'section.bloodline': 'Bloodline',
    'section.vocation': 'Station',
    'section.estate': 'Particulars',
    'section.decisions': 'Journal',

    // Bloodline sub-tabs
    'bl.family': 'Family',
    // not shown in mortal mode, but defined for completeness
    'bl.clan': 'Clan',
    'bl.minions': 'Minions',

    // Sidebar panel headings
    'panel.thyself': 'You',
    'panel.attributes': 'Attributes',

    // Attribute stats
    'stat.insight': 'Insight',
    'stat.actionPoints': 'Action Points',

    // Buttons
    'btn.passYear': 'Pass the Year \u25b7',

    // Station sub-tabs
    'vocation.title': 'Station',
    'vocation.edu': 'Education',
    'vocation.edu_empty':
      'You are still a child. School begins at age 6.',
    'vocation.career': 'Career',
    'vocation.career_empty':
      'A path will open in time. Few work before eighteen.',

    // Particulars sub-tabs
    'estate.title': 'Particulars',
    'estate.possessions': 'Items',
    "estate.possessions_empty":
      "You own nothing yet. The world is still your parents'.",
    'estate.equipment': 'Equipment',
    'estate.hobbies': 'Hobbies',
    'estate.hobbies_empty':
      "No pastimes taken up. Idle hands are the devil's workshop.",

    // Journal sub-tabs — five panels with mortal flavor
    'dec.focus': 'Focus',
    'dec.focus_empty':
      'No singular focus consumes you. The mind drifts where it will.',
    'dec.decisions': 'Decisions',
    'dec.decisions_empty':
      'No decisions weigh upon you. Life is, for now, simply lived.',
    'dec.goals': 'Goals',
    'dec.goals_empty':
      'You have set yourself no ambition. The road is open in every direction.',
    'dec.situations': 'Situations',
    'dec.situations_empty':
      'No matter presses upon you. The world is, for the moment, quiet.',
    'dec.memories': 'Memories',
    'dec.memories_empty':
      'Your years are yet too few to be remembered. Live them first.',
    'search.toggle': 'Search People',
  },
  vampire: {
    'section.bloodline': 'Bloodline',
    'section.vocation': 'Domain & Disciplines',
    'section.estate': 'Relics & Pursuits',
    'section.decisions': 'Ambitions',

    'bl.family': 'Mortal Family',
    'bl.clan': 'Clan',
    'bl.minions': 'Minions',

    'panel.thyself': 'You?',
    'panel.attributes': 'Attributes',

    'stat.insight': 'Resonance',
    'stat.actionPoints': 'Action Points',

    'btn.passYear': 'Endure the Day \u25b7',

    'vocation.title': 'Domain & Disciplines',
    'vocation.edu': 'Disciplines',
    'vocation.edu_empty':
      'No disciplines mastered. The blood remembers what the mind cannot.',
    'vocation.career': 'Domain',
    'vocation.career_empty':
      'You hold no territory. Other things hunt where you have not yet claimed.',

    'estate.title': 'Relics & Pursuits',
    'estate.possessions': 'Relics',
    'estate.possessions_empty':
      'Nothing of import has been gathered. The dead are patient collectors.',
    'estate.equipment': 'Equipment',
    'estate.hobbies': 'Pursuits',
    'estate.hobbies_empty':
      'Idleness is the curse of the immortal. Cultivate something, or rot.',

    // Ambitions sub-tabs — same structure as mortal Journal,
    // but with vampire-coded language: Plots, Reckonings, Chronicle.
    'dec.focus': 'Focus',
    'dec.focus_empty':
      'Nothing yet consumes your unliving attention.',
    'dec.decisions': 'Decisions',
    'dec.decisions_empty':
      'No choice presses against you. The night, for now, is yours to spend.',
    'dec.goals': 'Plots',
    'dec.goals_empty':
      'You scheme toward nothing. The patient gather power; the idle are devoured.',
    'dec.situations': 'Reckonings',
    'dec.situations_empty':
      'No reckoning awaits you. Debts have not yet come due.',
    'dec.memories': 'Chronicle',
    'dec.memories_empty':
      'Your unlife is too young to leave a mark on the record. It will.',
    'search.toggle': 'Seek a Face',
  },
};
