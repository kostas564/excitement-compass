// Builds the test site into test/ from the files in the working copy.
//
//   node tools/make-test-site.mjs
//
// The test site is served at /excitement-compass/test/ and is a copy of the app
// that cannot disturb the real one:
//   - it saves to its own storage key, so test data never mixes with real data
//   - it keeps its own offline cache (names start "ec-test-"), and its service
//     worker never touches the real app's caches
//   - it does not count visits, and tells search engines to ignore it
//   - it shows a small TEST label and installs as "Compass TEST"
// Only the test/ folder is written, nothing else.

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'test');

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

for (const name of ['index.html', 'styles.css', 'app.js', 'storage.js', 'strings.js', 'sky.js', 'sw.js', 'manifest.webmanifest', 'icon.svg']) {
  cpSync(join(root, name), join(out, name));
}
for (const dir of ['fonts', 'icons', 'images']) {
  if (existsSync(join(root, dir))) cpSync(join(root, dir), join(out, dir), { recursive: true });
}

const edit = (file, fn) => {
  const path = join(out, file);
  writeFileSync(path, fn(readFileSync(path, 'utf8')));
};

// Separate storage, so nothing from the test site reaches the real app's data.
const keys = (s) => s
  .replaceAll('excitement-compass-v1', 'ec-test-v1')
  .replaceAll('excitement-compass-line-hint', 'ec-test-line-hint');
edit('index.html', keys);
edit('storage.js', keys);
edit('app.js', keys);

// Separate offline cache, so the two service workers never delete each other's files.
edit('sw.js', (s) => s
  .replace('`excitement-compass-v${VERSION}`', '`ec-test-v${VERSION}`')
  .replace("k.startsWith('excitement-compass-')", "k.startsWith('ec-test-')"));

// No visit counting from the test site.
edit('strings.js', (s) => s.replace(/const ANALYTICS_CODE = '[^']*';/, "const ANALYTICS_CODE = '';"));

// Installs as its own app, with its own name.
edit('manifest.webmanifest', (s) => {
  const m = JSON.parse(s);
  m.name = 'Excitement Compass (test)';
  m.short_name = 'Compass TEST';
  return JSON.stringify(m, null, 2) + '\n';
});

// Not for search engines, and clearly labelled.
edit('index.html', (s) => s
  .replace('<meta charset="utf-8">', '<meta charset="utf-8">\n  <meta name="robots" content="noindex, nofollow">')
  .replace('<title>Excitement Compass</title>', '<title>Excitement Compass (test)</title>')
  .replace('<meta name="apple-mobile-web-app-title" content="Compass">', '<meta name="apple-mobile-web-app-title" content="Compass TEST">')
  .replace('</head>', '  <style>body::after{content:"TEST VERSION";position:fixed;top:calc(env(safe-area-inset-top) + 2px);left:50%;transform:translateX(-50%);z-index:50;padding:2px 10px;border-radius:0 0 8px 8px;background:#e29a45;color:#1a1130;font:700 10px/1.6 system-ui,sans-serif;letter-spacing:.12em;pointer-events:none}</style>\n</head>'));

// Sanity checks: the test copy must not share anything with the real app.
const all = readdirSync(out, { recursive: true }).map(String);
const text = ['index.html', 'app.js', 'storage.js', 'sw.js', 'strings.js'].map((f) => readFileSync(join(out, f), 'utf8')).join('\n');
const problems = [];
if (/excitement-compass-v1|excitement-compass-line-hint/.test(text)) problems.push('a real storage key is still used');
if (/startsWith\('excitement-compass-/.test(text)) problems.push("the service worker could delete the real app's caches");
if (/const ANALYTICS_CODE = '[^']+'/.test(text)) problems.push('visit counting is still on');
if (problems.length) {
  console.error('Test site NOT safe:', problems.join('; '));
  process.exit(1);
}
console.log(`Test site written to test/ (${all.length} entries). Open /excitement-compass/test/`);
