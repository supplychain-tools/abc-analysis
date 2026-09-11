import { expect, test, type Page } from '@playwright/test';

import { TAB, openTab } from './tabs';

/**
 * Structural accessibility, checked against the rendered page rather than
 * against intentions: every control named, every diagram named, focus visible,
 * targets big enough to hit, and nothing overflowing at 360px.
 */

const FULL =
  '/?d=24000&s=450&i=22&c=38.5&y=300&m=120&hm=r&ss=275&lang=en';

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

test('names every form control', async ({ page }) => {
  await page.goto(FULL);
  await ready(page);

  const unnamed = await page.evaluate(() => {
    const named = (element: Element): boolean => {
      const id = element.getAttribute('id');
      const hasLabel = id !== null && document.querySelector(`label[for="${id}"]`) !== null;
      return (
        hasLabel ||
        element.closest('label') !== null ||
        (element.getAttribute('aria-label') ?? '').trim() !== '' ||
        element.getAttribute('aria-labelledby') !== null
      );
    };
    return [...document.querySelectorAll('input, select, textarea')]
      .filter((element) => !named(element))
      .map((element) => element.outerHTML.slice(0, 90));
  });

  expect(unnamed).toEqual([]);
});

test('names every button', async ({ page }) => {
  await page.goto(FULL);
  await ready(page);

  const unnamed = await page.evaluate(() =>
    [...document.querySelectorAll('button')]
      .filter(
        (button) =>
          (button.textContent ?? '').trim() === '' &&
          (button.getAttribute('aria-label') ?? '').trim() === '',
      )
      .map((button) => button.outerHTML.slice(0, 90)),
  );

  expect(unnamed).toEqual([]);
});

test('names every diagram, and offers each as a table', async ({ page }) => {
  await page.goto(FULL);
  await ready(page);

  // One diagram per view, so the check runs once per view. A hidden panel is
  // still in the document but out of the accessibility tree, which is what a
  // hidden panel should be and why this cannot be asserted in one pass.
  const views = [
    { tab: TAB.overview, table: 'Inventory level at each event' },
    { tab: TAB.chart, table: 'Cost curve values' },
  ];

  for (const view of views) {
    await openTab(page, view.tab);
    const diagram = page.locator('svg[role="img"]:visible');
    await expect(diagram, view.table).toHaveCount(1);
    await expect(diagram, view.table).toHaveAttribute('aria-label', /\w/);
    await expect(page.getByRole('table', { name: view.table })).toBeAttached();
  }
});

test('has one first-level heading and no gaps in the levels below it', async ({ page }) => {
  await page.goto(FULL);
  await ready(page);

  const levels = await page.evaluate(() =>
    [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((h) => Number(h.tagName[1])),
  );

  expect(levels.filter((level) => level === 1)).toHaveLength(1);
  expect(levels[0]).toBe(1);
  for (let index = 1; index < levels.length; index += 1) {
    expect(levels[index] - levels[index - 1]).toBeLessThanOrEqual(1);
  }
});

test('puts the page in landmarks', async ({ page }) => {
  await page.goto(FULL);
  await ready(page);

  await expect(page.getByRole('banner')).toHaveCount(1);
  await expect(page.getByRole('main')).toHaveCount(1);
});

test('shows a visible focus ring on everything reachable', async ({ page }) => {
  await page.goto(FULL);
  await ready(page);

  // A text field, a select and a button: the three shapes of control on the
  // page, since each takes its ring from a different rule.
  const controls: [string, ReturnType<typeof page.locator>][] = [
    ['text field', page.locator('#annual-demand')],
    ['select', page.locator('#currency')],
    ['button', page.getByRole('button', { name: 'Load example', exact: true })],
  ];

  for (const [name, control] of controls) {
    await control.focus();
    const outline = await control.evaluate((node) => {
      const style = getComputedStyle(node);
      return { width: style.outlineWidth, style: style.outlineStyle };
    });
    expect(outline.style, name).not.toBe('none');
    expect(Number.parseFloat(outline.width), name).toBeGreaterThanOrEqual(2);
  }
});

test('reaches the chart readout by keyboard', async ({ page }) => {
  await page.goto(FULL);
  await ready(page);
  await openTab(page, TAB.chart);

  const plot = page.getByRole('slider');
  await plot.focus();
  await expect(plot).toBeFocused();
  await expect(plot).toHaveAttribute('aria-valuenow', /\d/);
  await expect(plot).toHaveAttribute('aria-valuetext', /\w/);
});

test('gives every target enough room to hit', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'target size matters where fingers are');

  await page.goto(FULL);
  await ready(page);

  // WCAG 2.2 asks for 24 by 24 CSS pixels on anything you have to point at.
  // Skip links are excluded: being 1x1 until focused is what they are for.
  const small = await page.evaluate(() => {
    const targets = [...document.querySelectorAll('button, select, a[href], label[data-active]')]
      .filter((element) => !element.classList.contains('sr-only'));
    return targets
      .map((element) => {
        const box = element.getBoundingClientRect();
        return { html: element.outerHTML.slice(0, 70), w: Math.round(box.width), h: Math.round(box.height) };
      })
      .filter((box) => box.w > 0 && box.h > 0 && (box.w < 24 || box.h < 24));
  });

  expect(small).toEqual([]);
});

test('never scrolls sideways, at any of the sizes it claims to support', async ({ page }) => {
  // Five full page loads in one test, each waiting for hydration. Against a
  // development server compiling under the rest of the suite that runs to
  // about half a minute, which is the default budget for a whole test rather
  // than for five navigations inside one.
  test.slow();

  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(FULL);
    await ready(page);
    await page.waitForTimeout(250);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `overflow at ${width}px`).toBeLessThanOrEqual(0);
  }
});

test('respects a request for reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(FULL);
  await ready(page);

  const animated = await page.evaluate(() =>
    [...document.querySelectorAll('*')]
      .filter((element) => {
        const style = getComputedStyle(element);
        const duration = (property: string) =>
          Math.max(0, ...property.split(',').map((value) => Number.parseFloat(value) || 0));
        return duration(style.transitionDuration) > 0.05 || duration(style.animationDuration) > 0.05;
      })
      .map((element) => element.tagName),
  );

  expect(animated).toEqual([]);
});
