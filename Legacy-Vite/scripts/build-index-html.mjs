import fs from 'fs';
import path from 'path';

const root = path.resolve(import.meta.dirname, '..');
const srcHtml = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(root, '..', 'legacy-0.0.2.html');
const outHtml = path.join(root, 'index.html');

if (!fs.existsSync(srcHtml)) {
  console.error(
    'Source HTML not found:',
    srcHtml,
    '\nThe monolithic legacy-0.0.2.html was removed after extraction.',
    '\nEdit index.html directly, or pass a source file:',
    '\n  node scripts/build-index-html.mjs <path-to-source.html>',
  );
  process.exit(1);
}

const txt = fs.readFileSync(srcHtml, 'utf8');
const headEnd = txt.indexOf('</head>');
if (headEnd === -1) {
  console.error('Could not locate </head> in', srcHtml);
  process.exit(1);
}
const bodyStart = txt.indexOf('<body>', headEnd);
const scriptStart = txt.indexOf('<script>', bodyStart);
const bodyEnd = txt.indexOf('</body>');

if (bodyStart === -1 || scriptStart === -1 || bodyEnd === -1) {
  console.error('Could not locate <body>, <script>, or </body> in', srcHtml);
  process.exit(1);
}

// Main screens (before inline script) + overlays (after </script>, still in body).
const bodyInner = txt.slice(bodyStart + '<body>'.length, scriptStart).trim();
const afterScript = txt.slice(txt.indexOf('</script>', scriptStart) + '</script>'.length, bodyEnd).trim();

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Legacy</title>
  </head>
  <body>
${bodyInner}

${afterScript}
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
`;

fs.writeFileSync(outHtml, html);
console.log('Wrote', outHtml, `(${html.length} bytes)`);
