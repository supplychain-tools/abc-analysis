import { expect, test, type Page } from '@playwright/test';

import { TAB, openTab } from './tabs';

/**
 * The cost curve. What matters here is not that pixels landed somewhere, but
 * that the chart says the right thing: the crossing sits at Q*, and the
 * readout tracks pointer and keyboard.
 */

const CLASSIC = '/?d=10000&s=50&h=2&y=365&hm=u&lang=en';

/** Load a case and open the view this file is about. */
async function open(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await openTab(page, TAB.chart);
}

async function figure(page: Page, name: string): Promise<string> {
  const text = await page.locator(`[data-testid="${name}"]:visible`).textContent();
  return (text ?? '').replace(/\s/g, ' ').trim();
}

test('draws the three classic traces', async ({ page }) => {
  await open(page, CLASSIC);

  await expect(page.getByTestId('trace-ordering')).toBeVisible();
  await expect(page.getByTestId('trace-holding')).toBeVisible();
  await expect(page.getByTestId('trace-total')).toBeVisible();
});

test('opens its readout at the optimum, where the penalty is nil', async ({ page }) => {
  await open(page, CLASSIC);

  await expect.poll(() => figure(page, 'readout-quantity')).toBe('707');
  await expect.poll(() => figure(page, 'readout-cost')).toBe('1,414.21');
  await expect.poll(() => figure(page, 'readout-penalty')).toBe('0.00');
});

test('reads out cost at any quantity from the keyboard', async ({ page }) => {
  await open(page, CLASSIC);
  await expect.poll(() => figure(page, 'readout-quantity')).toBe('707');

  const plot = page.getByRole('slider');
  await plot.focus();
  for (let press = 0; press < 5; press += 1) await plot.press('ArrowRight');

  // Moved off the optimum, so the quantity rose and the penalty left zero.
  const quantity = Number((await figure(page, 'readout-quantity')).replace(/,/g, ''));
  expect(quantity).toBeGreaterThan(707);
  expect(Number(await figure(page, 'readout-penalty'))).toBeGreaterThan(0);

  await plot.press('Home');
  await expect.poll(() => figure(page, 'readout-quantity')).toBe('177');
});

test('reads out cost where the pointer is', async ({ page }) => {
  await open(page, CLASSIC);
  const plot = page.getByRole('slider');
  const box = await plot.boundingBox();
  expect(box).not.toBeNull();
  if (box === null) return;

  // hover() with a position scrolls the element into view and resolves the
  // coordinates against it, rather than against a viewport that may have moved.
  await plot.hover({ position: { x: box.width * 0.85, y: box.height / 2 } });
  await expect
    .poll(async () => Number((await figure(page, 'readout-quantity')).replace(/,/g, '')))
    .toBeGreaterThan(1000);
});

test('publishes the curve as a table for anyone not reading the picture', async ({ page }) => {
  await open(page, CLASSIC);

  const table = page.getByRole('table', { name: 'Cost curve values' });
  await expect(table).toBeAttached();
  await expect(table.getByRole('row')).toHaveCount(13); // header plus twelve samples
});
