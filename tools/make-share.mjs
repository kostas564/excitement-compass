// Draws share.html at 1200 x 630 and saves it as share.png.
//
//   node tools/make-share.mjs

import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(pathToFileURL(join(root, 'share.html')).href);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: join(root, 'share.png') });
await browser.close();
console.log('wrote share.png');
