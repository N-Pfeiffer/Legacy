/** Academic tracks chosen at baccalaureate enrollment. */

export const EDUCATION_TRACKS = [
  {
    id: 'letters',
    label: 'Letters & Humanities',
    shortLabel: 'Letters',
    description: 'Languages, rhetoric, history, and the arts of persuasion.',
    doctorateCareers: [],
    licentiateCareers: ['diplomat', 'schoolmaster'],
  },
  {
    id: 'law',
    label: 'Law & Governance',
    shortLabel: 'Law',
    description: 'Statute, precedent, and the architecture of civic order.',
    doctorateCareers: ['lawyer'],
    licentiateCareers: ['magistrate'],
  },
  {
    id: 'medicine',
    label: 'Medicine & Anatomy',
    shortLabel: 'Medicine',
    description: 'The body, its ailments, and the craft of healing.',
    doctorateCareers: ['doctor'],
    licentiateCareers: ['nurse'],
  },
  {
    id: 'theology',
    label: 'Theology & Divinity',
    shortLabel: 'Theology',
    description: 'Scripture, doctrine, and the offices of faith.',
    doctorateCareers: ['priest'],
    licentiateCareers: [],
  },
  {
    id: 'natural_philosophy',
    label: 'Natural Philosophy',
    shortLabel: 'Natural Philosophy',
    description: 'Mathematics, natural law, and the sciences emerging from observation.',
    doctorateCareers: [],
    licentiateCareers: ['archaeologist', 'occult_scholar'],
  },
];

export const EDUCATION_TRACKS_BY_ID = Object.fromEntries(
  EDUCATION_TRACKS.map((t) => [t.id, t]),
);

/** Careers that require a specific academic track at doctorate tier. */
export const CAREER_TRACK_REQUIREMENTS = {
  lawyer: 'law',
  doctor: 'medicine',
  priest: 'theology',
};

export function trackLabel(trackId) {
  return EDUCATION_TRACKS_BY_ID[trackId]?.label ?? trackId ?? '';
}

export function trackShortLabel(trackId) {
  return EDUCATION_TRACKS_BY_ID[trackId]?.shortLabel ?? trackId ?? '';
}
