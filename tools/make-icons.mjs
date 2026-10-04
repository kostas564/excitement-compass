// Rebuilds the app icons from icon.svg using Playwright's Chromium.
//
//   node tools/make-icons.mjs
//
// Writes icons/icon-192.png, icon-512.png, icon-maskable-512.png (artwork
// shrunk into the central 80% so any mask shape keeps it) and
// apple-touch-icon.png (180px).

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(join(root, 'icon.svg'), 'utf8');

// The same drawing with the artwork scaled to 80% and centred.
const maskable = svg.replace('<g id="art">', '<g id="art" transform="translate(51.2 51.2) scale(0.8)">');

const jobs = [
  [svg, 192, 'icons/icon-192.png'],
  [svg, 512, 'icons/icon-512.png'],
  [svg, 180, 'icons/apple-touch-icon.png'],
  [maskable, 512, 'icons/icon-maskable-512.png'],
];

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
for (const [source, size, out] of jobs) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const sized = source.replace('width="512" height="512"', `width="${size}" height="${size}"`);
  await page.setContent(`<body style="margin:0">${sized}</body>`);
  await page.screenshot({ path: join(root, out) });
  await page.close();
  console.log('wrote', out);
}
await browser.close();
