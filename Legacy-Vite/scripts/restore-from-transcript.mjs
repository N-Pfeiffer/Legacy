import fs from 'fs';
import path from 'path';

const transcript = process.argv[2];
if (!transcript) {
  console.error('Usage: node restore-from-transcript.mjs <transcript.jsonl>');
  process.exit(1);
}

const root = path.resolve(import.meta.dirname, '..');
const lines = fs.readFileSync(transcript, 'utf8').split('\n');
const restored = new Map();

for (const line of lines) {
  if (!line.includes('"Write"')) continue;
  let o;
  try {
    o = JSON.parse(line);
  } catch {
    continue;
  }
  for (const c of o.message?.content || []) {
    const p = c.input?.path?.replace(/\\/g, '/');
    const contents = c.input?.contents;
    if (!p || !contents || !p.includes('Legacy-Vite/src/')) continue;
    const rel = p.split('Legacy-Vite/src/')[1];
    if (!rel) continue;
    restored.set(rel, contents);
  }
}

for (const [rel, contents] of restored) {
  const out = path.join(root, 'src', rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, contents);
  console.log('wrote', rel, contents.length);
}

console.log('total files', restored.size);
