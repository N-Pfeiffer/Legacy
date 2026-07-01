#!/usr/bin/env node
/** One-off helper: extract inline data from legacy.js into data/*.js */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const legacyPath = path.join(ROOT, '../src/legacy.js');
const lines = fs.readFileSync(legacyPath, 'utf8').split('\n');

function findArrayBlock(startLineTrimmed) {
  const start = lines.findIndex((l) => l.trim() === startLineTrimmed);
  if (start < 0) throw new Error(`Start not found: ${startLineTrimmed}`);
  let depth = 0;
  for (let i = start; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '[') depth++;
      if (ch === ']') depth--;
    }
    if (i > start && depth === 0 && lines[i].trim().endsWith('];')) {
      return { start, end: i };
    }
  }
  throw new Error(`End not found for ${startLineTrimmed}`);
}

function careersFile(careersBlock) {
  return `/** Career taxonomy — Layer 1 data. */
export const SCHOOL_WORK_MIN_AGE = 14;
export const SCHOOL_WORK_HEALTH_COST_PER_YEAR = 10;

${careersBlock.replace('const CAREERS', 'export const CAREERS')};

export const CAREERS_BY_ID = Object.fromEntries(CAREERS.map((c) => [c.id, c]));
`;
}

function educationFile(ladderBlock) {
  return `/** Higher-education ladder and derived lookups. */

${ladderBlock.replace('const EDUCATION_LADDER', 'export const EDUCATION_LADDER')};

export const EDUCATION_LADDER_BY_ID = Object.fromEntries(EDUCATION_LADDER.map((d) => [d.id, d]));

export const HIGHER_ED_IN_PROGRESS_STAGES = new Set(EDUCATION_LADDER.map((d) => d.inProgress));

export const COMPLETED_DEGREE_STAGES = EDUCATION_LADDER.map((d) => d.stageName);

export const COMPLETED_DEGREE_INDEX = Object.fromEntries(
  COMPLETED_DEGREE_STAGES.map((s, i) => [s, i]),
);
`;
}

function eventsFile(eventsBlock) {
  return `/** Yearly random player events — static registry. */
import { clamp, pick } from '../utils/index.js';
import { statCap } from '../utils/statCap.js';

${eventsBlock.replace('const PLAYER_EVENTS', 'export const PLAYER_EVENTS')};
`;
}

const careers = findArrayBlock('const CAREERS = [');
const education = findArrayBlock('const EDUCATION_LADDER = [');
const events = findArrayBlock('const PLAYER_EVENTS = [');

const outDir = path.join(ROOT, '../src/data');
fs.writeFileSync(path.join(outDir, 'careers.js'), careersFile(lines.slice(careers.start, careers.end + 1).join('\n')));
fs.writeFileSync(path.join(outDir, 'education.js'), educationFile(lines.slice(education.start, education.end + 1).join('\n')));
fs.writeFileSync(path.join(outDir, 'playerEvents.js'), eventsFile(lines.slice(events.start, events.end + 1).join('\n')));
console.log('Extracted careers, education, playerEvents');
