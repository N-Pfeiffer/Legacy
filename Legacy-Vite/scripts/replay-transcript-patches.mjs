import fs from 'fs';
import path from 'path';

const transcript = process.argv[2];
const filterFile = process.argv[3]; // optional basename e.g. legacy.js
if (!transcript) {
  console.error('Usage: node replay-transcript-patches.mjs <transcript.jsonl> [file-filter]');
  process.exit(1);
}

const root = path.resolve(import.meta.dirname, '..');
const lines = fs.readFileSync(transcript, 'utf8').split('\n');

let applied = 0;
let skipped = 0;
let failed = 0;

function normPath(p) {
  if (!p) return null;
  const n = p.replace(/\\/g, '/');
  const i = n.indexOf('Legacy-Vite/src/');
  if (i === -1) return null;
  return n.slice(i + 'Legacy-Vite/src/'.length);
}

function applyStrReplace(rel, oldString, newString) {
  const filePath = path.join(root, 'src', rel);
  if (!fs.existsSync(filePath)) {
    console.warn('missing file', rel);
    failed++;
    return;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes(oldString)) {
    skipped++;
    return;
  }
  fs.writeFileSync(filePath, content.replace(oldString, newString));
  applied++;
}

function applyPatch(rel, patchText) {
  const filePath = path.join(root, 'src', rel);
  let content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';

  const hunks = patchText.split('\n').filter((l) => l.startsWith('@@'));
  // Simple unified patch: only handle Update File hunks with +/- lines
  const blocks = patchText.split('@@').slice(1);
  for (const block of blocks) {
    const blockLines = block.split('\n');
    const oldLines = [];
    const newLines = [];
    for (const line of blockLines.slice(1)) {
      if (!line.length) continue;
      if (line.startsWith('***')) continue;
      const tag = line[0];
      const text = line.slice(1);
      if (tag === ' ') {
        oldLines.push(text);
        newLines.push(text);
      } else if (tag === '-') {
        oldLines.push(text);
      } else if (tag === '+') {
        newLines.push(text);
      }
    }
    const oldString = oldLines.join('\n');
    const newString = newLines.join('\n');
    if (!oldString && newString && !content) {
      content = newString;
      continue;
    }
    if (content.includes(oldString)) {
      content = content.replace(oldString, newString);
      applied++;
    } else {
      skipped++;
    }
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

for (const line of lines) {
  if (!line.trim()) continue;
  let o;
  try {
    o = JSON.parse(line);
  } catch {
    continue;
  }
  for (const c of o.message?.content || []) {
    const name = c.name;
    const input = c.input || {};

    if (name === 'StrReplace') {
      const rel = normPath(input.path);
      if (!rel || (filterFile && !rel.endsWith(filterFile))) continue;
      applyStrReplace(rel, input.old_string, input.new_string);
    }

    if (name === 'ApplyPatch' && typeof input === 'string') {
      const m = input.match(/\*\*\* (Add|Update) File: ([^\n]+)/);
      if (!m) continue;
      const rel = normPath(m[2]);
      if (!rel || (filterFile && !rel.endsWith(filterFile))) continue;
      applyPatch(rel, input);
    }
  }
}

console.log({ applied, skipped, failed, filter: filterFile || 'all' });
