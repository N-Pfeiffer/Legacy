import { pick } from '../utils/index.js';
import { G, getPlayer } from '../state/gameState.js';
import { currentEra } from '../data/eras.js';
import { appendAnnalsEntry, hasAnnalsForYear } from '../ui/eventLog.js';
import { recordMemory } from './memories.js';

/** Legacy priority tiers — kept for call-site readability; no longer used for competition. */
export const ANNALS_PRIORITY = {
  FILLER: 0,
  FLAVOR: 10,
  LIFE: 30,
  MAJOR: 50,
  CRITICAL: 70,
};

const FILLERS = {
  infant: [
    'You slept through most of the year, warm and unbothered by the world.',
    'The household moved around you in soft voices and lamplight.',
    'You learned the weight of hands that lifted you, and the smell of bread cooling.',
    'A year of milk, blankets, and the slow discovery of your own name.',
  ],
  child: [
    'You chased hens, scraped knees, and came home with mud on your cuffs.',
    'Lessons and games traded places until the seasons blurred together.',
    'You lost a tooth, found a frog, and considered both equal treasures.',
    'The year passed in chalk dust, stolen apples, and long summer dusk.',
  ],
  student: [
    'Another year of desks, ink stains, and whispered notes passed under cover.',
    'You memorized dates, routes, and rumors with equal diligence.',
    'School terms came and went; you grew taller between the terms.',
    'The year turned on examinations, friendships, and the walk home.',
  ],
  youngAdult: [
    'You tested your limits — in work, in rest, in the company you kept.',
    'Ambition and habit tugged in different directions; the year ended undecided.',
    'Small wages, late nights, and the feeling that life was widening.',
    'You learned which doors opened easily and which wanted a harder knock.',
  ],
  adult: [
    'Responsibility settled on you like weather — familiar, not always welcome.',
    'The year asked for steadiness more than spectacle, and you supplied it.',
    'Household accounts, old quarrels, and quiet satisfactions marked the months.',
    'Nothing dramatic — only the patient work of keeping a life in order.',
  ],
  middleAge: [
    'The year measured itself in routines you no longer questioned.',
    'You mended what broke, postponed what could wait, and slept lighter.',
    'Time accelerated in small ways — a grey hair, a creaking stair.',
    'The world changed around you; you changed more slowly, but you changed.',
  ],
  elder: [
    'The seasons felt shorter. You watched more than you hurried.',
    'Memory outpaced appetite; the year was mostly sitting and remembering.',
    'You offered advice no one asked for and took comfort anyway.',
    'Another year settled into the bones like frost — quiet, persistent.',
  ],
  vampire: [
    'You moved through mortal bustle like a shadow through rain.',
    'The nights lengthened in your favor; the days were something to endure.',
    'You fed carefully and kept your name out of frightened conversation.',
    'Immortality did not spare you boredom — only the luxury of waiting.',
  ],
  era1800: [
    'Candlelight, horse-tracks in mud, and news that arrived weeks late.',
    'The parish bell marked time more faithfully than any clock you owned.',
  ],
  era1850: [
    'Steam and soot crept nearer; the old rhythms still held, but barely.',
    'Railways murmured in the distance like the future clearing its throat.',
  ],
  era1900: [
    'Telegrams and motor-cars made the world feel crowded and quick.',
    'The century turned its collar up and walked faster than your parents did.',
  ],
  era1950: [
    'Radios hummed in kitchens; the world felt larger and less patient.',
    'Prosperity and anxiety shared the same table throughout the year.',
  ],
  era2000: [
    'Screens glowed late into the evening; everyone seemed connected and distracted.',
    'The year vanished in notifications, traffic, and the hum of machines.',
  ],
};

function fillerPoolFor({ age, vampire, era }) {
  let band =
    age < 2   ? 'infant' :
    age < 6   ? 'infant' :
    age < 12  ? 'child' :
    age < 18  ? 'student' :
    age < 30  ? 'youngAdult' :
    age < 50  ? 'adult' :
    age < 65  ? 'middleAge' :
                'elder';

  const pool = [...FILLERS[band]];
  if (vampire) pool.push(...FILLERS.vampire);
  if (era === 1800) pool.push(...FILLERS.era1800);
  else if (era === 1850) pool.push(...FILLERS.era1850);
  else if (era === 1900) pool.push(...FILLERS.era1900);
  else if (era === 1950) pool.push(...FILLERS.era1950);
  else if (era === 2000) pool.push(...FILLERS.era2000);
  return pool;
}

function buildFillerEntry(year) {
  const player = getPlayer();
  const age = player?.age ?? 0;
  const msg = pick(fillerPoolFor({
    age,
    vampire: !!player?.isVampire,
    era: currentEra(year),
  }));
  return { year, msg, type: 'info', html: false };
}

function normalizeEntry(entry) {
  return {
    year: entry.year ?? G.year,
    msg: entry.msg,
    type: entry.type || 'info',
    html: !!entry.html,
    category: entry.category,
    title: entry.title,
    age: entry.age,
    memory: entry.memory,
  };
}

/** Append an annals entry immediately (multiple entries per year allowed). */
export function appendAnnals(entry) {
  const next = normalizeEntry(entry);
  appendAnnalsEntry(next);
  return next;
}

/** Log to annals and optionally to memories when category or memory flag is set. */
export function logEvent(entry, opts = {}) {
  const next = normalizeEntry(entry);
  appendAnnalsEntry(next);

  const shouldMemory = opts.memory === true || next.memory === true || next.category;
  if (shouldMemory) {
    recordMemory({
      year: next.year,
      age: next.age,
      category: next.category || opts.category || 'life',
      title: next.title,
      msg: next.msg,
      type: next.type,
      html: next.html,
    });
  }

  return next;
}

/** Queue an annals entry — appends immediately; pass category/memory for milestones. */
export function proposeAnnals(entry) {
  return logEvent(entry);
}

/** No-op — annals append immediately; kept for backward compatibility during cleanup. */
export function flushAnnalsCandidate() {}

/** Close the year: add a filler if nothing was logged this year. */
export function closeAnnalsYear(year = G.year) {
  if (!hasAnnalsForYear(year)) {
    appendAnnalsEntry(buildFillerEntry(year));
  }
}

/** Write annals (+ memory when flagged) immediately (e.g. birth at game start). */
export function recordAnnalsImmediate(entry) {
  return logEvent(entry, { memory: entry.memory ?? !!entry.category });
}

/** @deprecated Use appendAnnalsEntry from eventLog.js */
export function writeAnnalsEntry(entry) {
  appendAnnalsEntry(entry);
}
