/**
 * Render the Open Graph image.
 *
 * A social preview must be a raster: LinkedIn, Slack and WhatsApp all refuse
 * SVG. Rather than add an image library, this drives the Chromium that
 * Playwright already installs for the test suite — so the picture is rendered
 * by the same engine as the site, with the same fonts and the same maths.
 *
 *   npm run og
 *
 * The result is committed, because a social image changes far less often than
 * the code and should not depend on a browser being present at build time.
 */
import { chromium } from '@playwright/test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const template = join(here, 'og-template.html');
const output = join(here, '..', 'public', 'og.png');

const browser = await chromium.launch();
/* Laid out at 1200x630, the size the networks quote, but captured at twice
 * that. A card is almost never shown at its own size: a feed scales it to
 * whatever the column is, and a browser resampling a 1200px sheet down to 790
 * lands every stem and counter between pixels, which is what turns 26px type
 * into mush. Drawn at 2400x1260 there is a whole pixel to give away on each
 * side of that, and the downscale stays sharp. The CSS is untouched — only the
 * capture is denser. */
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });

await page.goto(pathToFileURL(template).href);
await page.waitForFunction(() => document.documentElement.dataset.drawn === 'true');
await page.waitForFunction(() => document.fonts.ready.then(() => true));

await page.screenshot({ path: output, type: 'png' });
await browser.close();

console.log('écrit: ' + output);
