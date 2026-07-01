import fs from 'fs';
import path from 'path';

const legacyPath = path.resolve(import.meta.dirname, '../src/legacy.js');
let s = fs.readFileSync(legacyPath, 'utf8');

if (s.includes('\\n\\nexport')) {
  s = s.replace(
    /^\/\/ Extracted from legacy-0\.0\.2\.html\\n\\nexport function loadLegacyIntoDocument\(\) \{\\n  \(function\(\)\{\\n    \/\* /,
    '// Extracted from legacy-0.0.2.html\n\nexport function loadLegacyIntoDocument() {\n  (function(){\n    /* ',
  );
  s = s.replace(/\}\\n  \}\)\(\);\\n\}\\n?$/, '}\n  })();\n}\n');
  fs.writeFileSync(legacyPath, s);
  console.log('Fixed legacy.js parse escapes');
} else {
  console.log('No escape fix needed at start');
}
