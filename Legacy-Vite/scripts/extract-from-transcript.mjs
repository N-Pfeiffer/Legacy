import fs from 'fs';
import path from 'path';

const transcript = process.argv[2];
const needle = process.argv[3];
const outRel = process.argv[4];
if (!transcript || !needle || !outRel) {
  console.error('Usage: node extract-from-transcript.mjs <jsonl> <needle> <out-path>');
  process.exit(1);
}

const lines = fs.readFileSync(transcript, 'utf8').split('\n');
for (const line of lines) {
  if (!line.includes(needle)) continue;
  let o;
  try {
    o = JSON.parse(line);
  } catch {
    continue;
  }
  for (const c of o.message?.content || []) {
    if (c.name !== 'Write' || !c.input?.path?.includes(needle)) continue;
    const out = path.resolve(import.meta.dirname, '..', outRel);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, c.input.contents);
    console.log('wrote', out, c.input.contents.length);
    process.exit(0);
  }
}
console.error('not found:', needle);
process.exit(1);
