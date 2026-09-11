import { expect, test, type Page } from '@playwright/test';

/**
 * The classic EOQ path, end to end in a real browser.
 *
 * Where a test needs an exact starting point it goes in through the query
 * string rather than by clicking the form into shape: that keeps the test
 * about the behaviour under examination, and exercises the shareable-URL
 * feature at the same time.
 */

/** D = 10 000, S = 50, H = 2, 365-day year: the brief's first worked case. */
const VERIFICATION_CASE = '/?d=10000&s=50&h=2&y=365&hm=u&lang=en';

/**
 * Read a figure as one string. textContent, not innerText: the decimal-aligned
 * figure is a two-cell grid, and innerText would insert a break between the
 * integer part and the fraction. Every flavour of space, including the narrow
 * no-break space French grouping uses, is normalised to a plain one.
 */
async function figure(page: Page, name: string): Promise<string> {
  // Q* and the total cost exist twice in the markup, once pinned for narrow
  // viewports and once in the four-across band; exactly one is displayed.
  const text = await page.locator(`[data-testid="${name}"]:visible`).textContent();
  return (text ?? '').replace(/\s/g, ' ').trim();
}

/** Retries, because the figures settle a tick after the page loads. */
async function expectFigure(page: Page, name: string, expected: string): Promise<void> {
  await expect.poll(() => figure(page, name)).toBe(expected);
}

test('opens on a clear field', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('empty-state')).toBeVisible();
  await expect(page.getByLabel('Annual demand', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Cost per order', { exact: true })).toHaveValue('');
});

test('fills itself in from the worked example on request', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load example' }).click();

  await expect(page.getByLabel('Annual demand', { exact: true })).not.toHaveValue('');
  await expect.poll(() => figure(page, 'result-quantity')).toMatch(/\d/);
});

test('clears back to an empty field', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load example' }).click();
  await expect(page.getByLabel('Annual demand', { exact: true })).not.toHaveValue('');

  await page.getByRole('button', { name: 'Clear all fields' }).click();
  await expect(page.getByLabel('Annual demand', { exact: true })).toHaveValue('');
  await expect(page.getByTestId('empty-state')).toBeVisible();
});

test('reproduces the first verification case', async ({ page }) => {
  await page.goto(VERIFICATION_CASE);

  await expectFigure(page, 'result-quantity', '707.1');
  await expectFigure(page, 'result-orders', '14.14');
  await expectFigure(page, 'result-days', '25.8');
  await expectFigure(page, 'result-trc', '1,414.21');
});

test('updates as the user types, with nothing to submit', async ({ page }) => {
  await page.goto(VERIFICATION_CASE);
  await expectFigure(page, 'result-quantity', '707.1');

  // Four times the demand, twice the order quantity: Q* goes as the square root.
  await page.getByLabel('Annual demand', { exact: true }).fill('40000');
  await expectFigure(page, 'result-quantity', '1,414.2');
});

test('reads French number entry, and writes French number output', async ({ page }) => {
  await page.goto('/?hm=u&y=365&lang=fr');

  await page.getByLabel('Demande annuelle', { exact: true }).fill('10 000');
  await page.getByLabel('Coût de passation par commande', { exact: true }).fill('50');
  await page.getByLabel('Coût de possession unitaire', { exact: true }).fill('2');

  await expectFigure(page, 'result-quantity', '707,1');
  await expectFigure(page, 'result-trc', '1 414,21');
});

test('accepts a point as the decimal mark in French too', async ({ page }) => {
  await page.goto('/?d=1200&s=25&y=365&hm=r&lang=fr');

  await page.getByLabel('Taux de possession', { exact: true }).fill('20');
  await page.getByLabel('Coût d’achat unitaire', { exact: true }).fill('5.00');

  // H = 0.20 x 5 = 1.00, so Q* = TRC = 244.95: the brief's second case.
  await expectFigure(page, 'result-quantity', '244,9');
  await expectFigure(page, 'result-trc', '244,95');
});

test('holds back the error message until the field is left', async ({ page }) => {
  await page.goto(VERIFICATION_CASE);
  const demand = page.getByLabel('Annual demand', { exact: true });

  await demand.fill('12a');
  await expect(page.getByText('Not a number', { exact: false })).toBeHidden();

  await demand.blur();
  await expect(page.getByText('Not a number', { exact: false })).toBeVisible();
});

test('tidies a value into the locale convention when the field is left', async ({ page }) => {
  await page.goto(VERIFICATION_CASE);
  const demand = page.getByLabel('Annual demand', { exact: true });

  await demand.fill('12500.5');
  await demand.blur();
  await expect(demand).toHaveValue('12,500.5');
});

test('explains what is still needed instead of showing a broken result', async ({ page }) => {
  await page.goto(VERIFICATION_CASE);
  await page.getByLabel('Annual demand', { exact: true }).fill('');

  await expect(page.getByTestId('empty-state')).toBeVisible();
  await expect(page.getByText('Still needed:')).toBeVisible();
});

test('never prints NaN, Infinity or a negative zero', async ({ page }) => {
  await page.goto('/?d=10000&s=50&h=2&y=365&hm=u&lang=en');
  await page.getByLabel('Cost per order', { exact: true }).fill('0');
  await page.getByLabel('Cost per order', { exact: true }).blur();

  const body = await page.locator('body').innerText();
  expect(body).not.toMatch(/NaN|Infinity|-0\b/);
});

test('carries the inputs in the URL so a result can be shared', async ({ page }) => {
  await page.goto(VERIFICATION_CASE);
  await page.getByLabel('Annual demand', { exact: true }).fill('31500');

  await expect(page).toHaveURL(/d=31500/);

  // Reopening the URL restores the same answer.
  const shared = page.url();
  await page.goto(shared);
  await expect(page.getByLabel('Annual demand', { exact: true })).toHaveValue('31,500');
});

test('puts the fields before the answer on a 360px screen', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'viewport-specific');

  await page.goto(VERIFICATION_CASE);

  // One column, so the order has to mean something: the fields come first and
  // what they produce follows. There is no pinned copy holding the answer on
  // screen any more, so the answer really is below the fold on opening.
  await expect(page.getByLabel('Annual demand', { exact: true })).toBeInViewport();
  await expect(page.getByTestId('result-quantity')).not.toBeInViewport();

  await page.getByTestId('result-quantity').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('result-quantity')).toBeInViewport();
});

test('never scrolls the page sideways at 360px', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'viewport-specific');

  await page.goto('/');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
