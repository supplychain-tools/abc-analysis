import { expect, test, type Page } from '@playwright/test';

import { TAB, openTab } from './tabs';

/**
 * Labels in the diagrams must not land on top of each other.
 *
 * This is not a hypothetical: an axis tick and the Q* mark share a row, so
 * whenever Q* fell on a round number the two printed over one another; and the
 * safety stock rule and the trace are two marks that very nearly
 * coincide when Q dwarfs both, which put their labels in the same place. Both
 * were reported from real use.
 *
 * Rather than test the two cases that were reported, this checks the property
 * that was actually wanted: inside a diagram, no two pieces of text overlap.
 */

async function ready(page: Page): Promise<void> {
  // A generous budget, because this is not waiting on the application. The
  // development server compiles a route the first time it is asked for one,
  // and a request arriving during that compile waits on the compiler. Against
  // a warm server it resolves at once; against a cold one the five-second
  // default was losing whole tests to the compiler rather than to a defect.
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
}

/** Every pair of labels in a diagram that share screen space. */
async function collisions(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    // A couple of pixels of slack: the labels carry a halo stroke, and boxes
    // that merely touch are not a legibility problem.
    const SLACK = 2;
    const found: string[] = [];

    for (const svg of document.querySelectorAll('svg[role="img"]')) {
      const labels = [...svg.querySelectorAll('text')]
        .map((node) => ({ text: (node.textContent ?? '').trim(), box: node.getBoundingClientRect() }))
        .filter((label) => label.text !== '' && label.box.width > 0);

      for (let a = 0; a < labels.length; a += 1) {
        for (let b = a + 1; b < labels.length; b += 1) {
          const one = labels[a];
          const two = labels[b];
          const overlapX =
            Math.min(one.box.right, two.box.right) - Math.max(one.box.left, two.box.left);
          const overlapY =
            Math.min(one.box.bottom, two.box.bottom) - Math.max(one.box.top, two.box.top);
          if (overlapX > SLACK && overlapY > SLACK) {
            found.push(`"${one.text}" over "${two.text}"`);
          }
        }
      }
    }
    return found;
  });
}

/**
 * Cases chosen because they broke: Q* landing exactly on a round tick, and a
 * safety stock dwarfed by the order quantity so its rule sits on the axis.
 */
const CASES: Record<string, string> = {
  'Q* on a round tick, buffer dwarfed by Q':
    '/?d=1000000&s=50&h=1&y=365&hm=u&ss=250&lang=fr',
  'the worked example':
    '/?d=24000&s=450&i=22&c=38.5&y=300&m=120&hm=r&ss=275&lang=en',
  'the classic case, no buffer':
    '/?d=10000&s=50&h=2&y=365&hm=u&lang=en',
  'French, where the words are longest':
    '/?d=10000&s=50&h=2&y=365&hm=u&ss=40&lang=fr',
};

for (const [name, url] of Object.entries(CASES)) {
  test(`keeps every diagram label readable: ${name}`, async ({ page }) => {
    await page.goto(url);
    await ready(page);

    // One diagram per view now, so the check runs once per view. A hidden
    // panel measures zero and is filtered out of `collisions`, which would
    // quietly reduce this to whichever view happened to be open.
    for (const view of [TAB.overview, TAB.chart]) {
      await openTab(page, view);
      await page.waitForTimeout(400);
      expect(await collisions(page), `${view}`).toEqual([]);
    }
  });
}

test('keeps the scale complete and marks Q* above the curve', async ({ page }) => {
  // Q* is exactly 10 000 here, which is where a tick falls.
  await page.goto('/?d=1000000&s=50&h=1&y=365&hm=u&lang=en');
  await openTab(page, TAB.chart);
  await ready(page);

  // Scoped to the cost curve: the sawtooth has ticks of its own.
  const chart = page.locator('section', { has: page.locator('.chart-mark') });
  const mark = chart.locator('.chart-mark');
  await expect(mark).toHaveCount(1);
  await expect(mark).toHaveText('Q*');

  // The tick stays: the mark moved off the axis rather than the axis giving
  // way to the mark. Grouping separators differ by locale, so compare digits.
  const ticks = await chart.locator('.chart-tick').allTextContents();
  expect(ticks.map((tick) => tick.replace(/\D/g, ''))).toContain('10000');

  // And the mark sits well above the axis row those ticks occupy.
  const markBox = await mark.boundingBox();
  const axisRow = await chart.locator('.chart-tick').last().boundingBox();
  expect(markBox).not.toBeNull();
  expect(axisRow).not.toBeNull();
  if (markBox === null || axisRow === null) return;
  expect(markBox.y + markBox.height).toBeLessThan(axisRow.y - 20);
});

test('keeps the buffer label clear of the time axis', async ({ page }) => {
  await page.goto('/?d=1000000&s=50&h=1&y=365&hm=u&ss=250&lang=en');
  await ready(page);

  const safety = await page.getByTestId('profile-safety-stock-label').boundingBox();
  const axisRow = await page.getByTestId('profile-trace').evaluate((node) => {
    const svg = (node as SVGGraphicsElement).ownerSVGElement;
    return svg === null ? 0 : svg.getBoundingClientRect().bottom;
  });
  expect(safety).not.toBeNull();
  if (safety === null) return;

  // The label sits inside the plot, not on the row the ticks occupy.
  expect(safety.y + safety.height).toBeLessThan(axisRow - 12);
});
