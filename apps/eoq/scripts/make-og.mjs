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

/* Captured at exactly the size it is laid out at, 1200x630.
   Capturing at 2x for a sharper downscale backfires: WhatsApp reads the file's
   own pixels to choose between the full-width preview and a small left-aligned
   thumbnail, and a 2400x1260 file lands in the thumbnail, where the card is
   squeezed to about eighty pixels and nothing on it can be read. 1200x630 is
   what every network lays out from, and at 1:1 no pixel is resampled. */
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });

await page.goto(pathToFileURL(template).href);
await page.waitForFunction(() => document.documentElement.dataset.drawn === 'true');
await page.waitForFunction(() => document.fonts.ready.then(() => true));

await page.screenshot({ path: output, type: 'png' });
await browser.close();

console.log('écrit: ' + output);
