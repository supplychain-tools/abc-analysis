import { expect, test, type Page } from '@playwright/test';

import { TAB, openTab } from './tabs';

/**
 * The two sensitivity tables, against D = 10 000, S = 50, H = 2, where
 * Q* = 707.11 and TRC = 1414.21.
 */
const CASE = '/?d=10000&s=50&h=2&y=365&hm=u&lang=en';

/**
 * A row of the penalty table by its Q/Q* ratio. Addressed by attribute rather
 * than by text: the figure is split into two cells for decimal alignment, so
 * a text selector would land on the fragment, not the row.
 */
/** Load the case and open the view this file is about. */
async function open(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await openTab(page, TAB.sensitivity);
}

function penaltyRow(page: Page, ratio: number) {
  return page.getByTestId('penalty-table').locator(`tbody tr[data-ratio="${ratio}"]`);
}

test('shows the full ratio range from half the optimum to twice it', async ({ page }) => {
  await open(page, CASE);

  const rows = page.getByTestId('penalty-table').locator('tbody tr');
  await expect(rows).toHaveCount(11);
  await expect(rows.first().locator('th')).toHaveText('0.50');
  await expect(rows.last().locator('th')).toHaveText('2.00');
});

test('prices being twenty percent under the optimum at two and a half percent', async ({
  page,
}) => {
  await open(page, CASE);

  const row = penaltyRow(page, 0.8);
  await expect(row.locator('td').nth(0)).toHaveText('566');
  await expect(row.locator('td').nth(1)).toHaveText('1,449.57');
  await expect(row.locator('td').nth(2)).toHaveText('2.50');
});

test('is symmetric in the ratio, as the formula says it must be', async ({ page }) => {
  await open(page, CASE);

  // 0.5 * (r + 1/r) gives the same penalty at 0.80 and at 1.25.
  await expect(penaltyRow(page, 0.8).locator('td').nth(2)).toHaveText('2.50');
  await expect(penaltyRow(page, 1.25).locator('td').nth(2)).toHaveText('2.50');
  await expect(penaltyRow(page, 0.5).locator('td').nth(2)).toHaveText('25.00');
  await expect(penaltyRow(page, 2).locator('td').nth(2)).toHaveText('25.00');
});

test('marks the optimum row, where the penalty is nil', async ({ page }) => {
  await open(page, CASE);

  const optimum = page.getByTestId('penalty-optimum');
  await expect(optimum).toHaveCount(1);
  await expect(optimum.locator('th')).toContainText('1.00');
  await expect(optimum.locator('td').nth(0)).toHaveText('707');
  await expect(optimum.locator('td').nth(1)).toHaveText('1,414.21');
  await expect(optimum.locator('td').nth(2)).toHaveText('0.00');
});

test('says why the table is worth reading', async ({ page }) => {
  await open(page, CASE);

  await expect(page.getByText('flat near its minimum', { exact: false })).toBeVisible();
});

test('keeps a wide table inside its own scroller', async ({ page }) => {
  await open(page, CASE);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
