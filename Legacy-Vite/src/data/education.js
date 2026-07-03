/** University higher-education data (Oxford / UCL). */

export const UNIVERSITIES = {
  oxford: {
    id: 'oxford',
    label: 'Oxford',
    tuition: { standard: 0, reduced: 0, few: 0 },
  },
  ucl: {
    id: 'ucl',
    label: 'University College London',
    tuition: { standard: 40, reduced: 30, few: 15 },
  },
};

export const DEGREES = [
  { id: 'theology', label: 'Theology', schools: ['oxford'], progressCost: 600 },
  { id: 'liberal_arts', label: 'Liberal Arts', schools: ['oxford'], progressCost: 400 },
  { id: 'medicine', label: 'Medicine', schools: ['oxford', 'ucl'], progressCost: 800 },
  { id: 'law', label: 'Law', schools: ['oxford', 'ucl'], progressCost: 800 },
  { id: 'bsc', label: 'Bachelor of Science', schools: ['ucl'], progressCost: 400 },
  { id: 'ba', label: 'Bachelor of Arts', schools: ['oxford', 'ucl'], progressCost: 400 },
];

export const DEGREES_BY_ID = Object.fromEntries(DEGREES.map((d) => [d.id, d]));

export const CLASS_LOADS = [
  { id: 'standard', label: 'Standard Classes', ap: 15, progress: 100 },
  { id: 'reduced', label: 'Reduced Classes', ap: 10, progress: 75 },
  { id: 'few', label: 'Few Classes', ap: 5, progress: 50 },
  { id: 'skip', label: "Don't Participate This Year", ap: 0, progress: 0 },
];

export const CLASS_LOADS_BY_ID = Object.fromEntries(CLASS_LOADS.map((c) => [c.id, c]));

export function trackLabel(track) {
  if (!track) return '';
  return String(track).replace(/_/g, ' ');
}
