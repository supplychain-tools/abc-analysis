import { expect, test, type Page } from '@playwright/test';

/**
 * The ABC analyser, checked where it actually runs. The classification itself
 * is covered by lib/classify.test.ts; what is here is everything that only
 * exists once there is a browser: live recompute, the sort moving rows under
 * the cursor, the empty state, and the page not overflowing at 360px.
 */

const PAGE = '/?lang=en';

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

/**
 * The tool opens empty, so anything checked against the worked example has to
 * ask for it first. One helper rather than a fixture: the two tests that are
 * about the opening state itself must not have it applied behind their backs.
 */
async function withExample(page: Page): Promise<void> {
  await page.goto(PAGE);
  await ready(page);
  await page.locator('[data-testid="load-example"]').click();
  await expect(page.locator('[data-testid="item-row"]')).toHaveCount(25);
}

/** The row inputs, in the order the table currently shows them. */
function nameInputs(page: Page) {
  return page.locator('[data-testid="item-row"] input[id^="name-"]');
}

test('opens empty, on one row waiting to be typed into', async ({ page }) => {
  await page.goto(PAGE);
  await ready(page);

  await expect(page.locator('[data-testid="item-row"]')).toHaveCount(1);
  await expect(nameInputs(page).nth(0)).toHaveValue('');
  await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
  await expect(page.locator('svg[role="img"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="class-summary"]')).toHaveCount(0);
  // Nothing is invented where there is nothing to divide.
  await expect(page.locator('main')).not.toContainText('NaN');
});

test('puts the whole worked example one button away', async ({ page }) => {
  await withExample(page);

  await expect(page.locator('[data-testid="pareto-bar"]')).toHaveCount(25);
  await expect(page.locator('[data-testid="empty-state"]')).toHaveCount(0);

  // The finding, as the summary states it.
  await expect(page.locator('[data-testid="band-A-count"]')).toContainText('4');
  await expect(page.locator('[data-testid="band-A-item-share"]')).toContainText('16.0');
  await expect(page.locator('[data-testid="band-A-value-share"]')).toContainText('74.8');
  await expect(page.locator('[data-testid="total-value"]')).toContainText('654,622.00');
});

test('sorts by annual value descending, not by unit price', async ({ page }) => {
  await withExample(page);

  // The sample is not stored by value: the 12 oz cups are second in the list
  // and third by what they are worth, so a ranked table is the only way they
  // land third.
  await expect(nameInputs(page).nth(0)).toHaveValue('Espresso beans, house blend');
  await expect(nameInputs(page).nth(2)).toHaveValue('Takeaway cups, 12 oz');

  // The cheapest unit on the list is class A; the dearest is class C.
  const cups = page.locator('[data-testid="item-row"]').nth(2);
  await expect(cups).toHaveAttribute('data-class', 'A');
  await expect(cups.locator('input[id^="cost-"]')).toHaveValue('0.62');

  const burr = page.locator('[data-testid="item-row"]', {
    has: page.locator('input[value="Grinder burr set"]'),
  });
  await expect(burr).toHaveAttribute('data-class', 'C');
});

test('draws a marker for each threshold', async ({ page }) => {
  await withExample(page);

  await expect(page.locator('[data-testid="threshold-line"]')).toHaveCount(2);
  await expect(page.locator('[data-testid="cumulative-trace"]')).toHaveCount(1);
});

test('recomputes on every keystroke, with no button to press', async ({ page }) => {
  await withExample(page);

  const total = page.locator('[data-testid="total-value"]');
  await expect(total).toContainText('654,622.00');

  // Empty the largest line. Everything downstream has to move at once.
  const beans = page.locator('[data-testid="item-row"]', {
    has: page.locator('input[value="Espresso beans, house blend"]'),
  });
  await beans.locator('input[id^="usage-"]').fill('');

  await expect(total).toContainText('467,422.00');
  // The band itself moves, not just its figures: four lines carried 74.8% of
  // the money, six carry 79.8% of what is left after the biggest one goes.
  await expect(page.locator('[data-testid="band-A-count"]')).toContainText('6');
  await expect(page.locator('[data-testid="band-A-value-share"]')).toContainText('79.8');

  await expect(nameInputs(page).nth(0)).toHaveValue('Whole milk');
});

test('never moves a row that has not been filled in yet', async ({ page }) => {
  await page.goto(PAGE);
  await ready(page);

  // Six blank rows. Every one of them is worth nothing, so they were all tied
  // and the order fell to the name tiebreak: typing the first letter into the
  // top row sorted it against five empty names and sent it to the bottom,
  // carrying the cursor with it. A row worth nothing now keeps its place.
  for (let i = 0; i < 5; i += 1) await page.locator('[data-testid="add-row"]').click();
  await expect(page.locator('[data-testid="item-row"]')).toHaveCount(6);

  const first = nameInputs(page).nth(0);
  await first.click();
  await first.fill('Zinc');

  await expect(nameInputs(page).nth(0)).toHaveValue('Zinc');
  await expect(first).toBeFocused();

  // A usage on its own is still not a value, so it still does not move.
  const usage = page.locator('[data-testid="item-row"]').nth(0).locator('input[id^="usage-"]');
  await usage.click();
  await usage.fill('40');
  await expect(nameInputs(page).nth(0)).toHaveValue('Zinc');
  await expect(usage).toBeFocused();
});

test('keeps the caret in the cell when the sort moves the row', async ({ page }) => {
  await withExample(page);

  // The water filter cartridge is last by value. Typing a large usage into it
  // should carry it to the top without the input being torn down under the
  // cursor.
  const filter = page.locator('[data-testid="item-row"]', {
    has: page.locator('input[value="Water filter cartridge"]'),
  });
  const usage = filter.locator('input[id^="usage-"]');
  await usage.click();
  await usage.fill('9000');

  await expect(nameInputs(page).nth(0)).toHaveValue('Water filter cartridge');
  await expect(usage).toBeFocused();
});

test('treats an unparseable cell as zero rather than showing NaN', async ({ page }) => {
  await withExample(page);

  const beans = page.locator('[data-testid="item-row"]', {
    has: page.locator('input[value="Espresso beans, house blend"]'),
  });
  await beans.locator('input[id^="cost-"]').fill('not a number');

  await expect(page.locator('main')).not.toContainText('NaN');
  await expect(page.locator('[data-testid="total-value"]')).toContainText('467,422.00');
});

test('clears to one blank row and an empty state, and comes back', async ({ page }) => {
  await withExample(page);

  await page.locator('[data-testid="clear-all"]').click();

  await expect(page.locator('[data-testid="item-row"]')).toHaveCount(1);
  await expect(nameInputs(page).nth(0)).toHaveValue('');
  await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
  await expect(page.locator('svg[role="img"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="class-summary"]')).toHaveCount(0);
  // No figure is invented where there is nothing to divide.
  await expect(page.locator('main')).not.toContainText('NaN');

  // Clearing is never a door that closes behind you.
  await page.locator('[data-testid="load-example"]').click();
  await expect(page.locator('[data-testid="item-row"]')).toHaveCount(25);
  await expect(page.locator('[data-testid="total-value"]')).toContainText('654,622.00');
});

test('classifies the one row a cleared table leaves as A', async ({ page }) => {
  await page.goto(PAGE);
  await ready(page);

  const row = page.locator('[data-testid="item-row"]').first();
  await row.locator('input[id^="name-"]').fill('Sole item');
  await row.locator('input[id^="usage-"]').fill('10');
  await row.locator('input[id^="cost-"]').fill('10');

  await expect(row).toHaveAttribute('data-class', 'A');
  await expect(page.locator('[data-testid="band-A-value-share"]')).toContainText('100.0');
});

test('adds and removes rows, and never removes the last one', async ({ page }) => {
  await withExample(page);

  await page.locator('[data-testid="add-row"]').click();
  await expect(page.locator('[data-testid="item-row"]')).toHaveCount(26);

  await page.locator('[data-testid="clear-all"]').click();
  await expect(page.locator('[data-testid="item-row"]')).toHaveCount(1);

  // The remove button on the only row leaves a blank row, not an empty table.
  await page.locator('[data-testid="item-row"] button').first().click();
  await expect(page.locator('[data-testid="item-row"]')).toHaveCount(1);
});

test('allows duplicate names without merging them', async ({ page }) => {
  await page.goto(PAGE);
  await ready(page);

  const first = page.locator('[data-testid="item-row"]').first();
  await first.locator('input[id^="name-"]').fill('Oat milk');
  await first.locator('input[id^="usage-"]').fill('100');
  await first.locator('input[id^="cost-"]').fill('10');

  await page.locator('[data-testid="add-row"]').click();
  const second = page.locator('[data-testid="item-row"]').nth(1);
  await second.locator('input[id^="name-"]').fill('Oat milk');
  await second.locator('input[id^="usage-"]').fill('50');
  await second.locator('input[id^="cost-"]').fill('10');

  await expect(page.locator('[data-testid="item-row"]')).toHaveCount(2);
  await expect(page.locator('[data-testid="total-value"]')).toContainText('1,500.00');
});

test('follows the browser language, and starts in dirhams', async ({ page }) => {
  // The Playwright context runs in en-GB, so an English page here is the tool
  // reading navigator.language rather than imposing a language of its own.
  await page.goto('/');
  await ready(page);

  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByLabel('Currency')).toHaveValue('MAD');

  await page.locator('[data-testid="load-example"]').click();
  await expect(page.locator('[data-testid="total-value"]')).toContainText('654,622.00');
});

test('answers a French browser in French, and in dirhams', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'fr-FR' });
  const page = await context.newPage();

  await page.goto('/');
  // A generous budget, because this is not waiting on the application. The
  // development server compiles a route the first time it is asked for one,
  // and a request arriving during that compile waits on the compiler. Against
  // a warm server it resolves at once; against a cold one the five-second
  // default was losing whole tests to the compiler rather than to a defect.
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });

  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page.getByLabel('Devise')).toHaveValue('MAD');

  await context.close();
});

test('reads its figures in French and switches without losing them', async ({ page }) => {
  await page.goto('/?lang=fr');
  await ready(page);
  await page.locator('[data-testid="load-example"]').click();

  await expect(page.locator('[data-testid="total-value"]')).toContainText('654 622,00');
  await expect(page.getByRole('heading', { name: 'Analyse ABC des stocks' })).toBeVisible();

  // The language switch is a segmented control whose radios are hidden behind
  // their labels. A real user clicks the label, so the test does too.
  await page.getByText('EN', { exact: true }).click();
  await expect(page.getByRole('radio', { name: 'EN', exact: true })).toBeChecked();
  await expect(page.locator('[data-testid="total-value"]')).toContainText('654,622.00');
  await expect(page.locator('[data-testid="band-A-count"]')).toContainText('4');
});

test('names itself and offers no way out of the page', async ({ page }) => {
  await page.goto(PAGE);
  await ready(page);

  // The header carried the family name and a link to each sibling tool, and
  // both were taken out: a reader who opened this page came for an ABC
  // analysis, and a row of links out of it is an invitation to leave before
  // they have done the one thing the page is for.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ABC inventory analysis');
  await expect(page.locator('header a')).toHaveCount(0);
});

test('splits the table in two on a phone and keeps it whole on a desk', async ({ page }) => {
  await page.goto(PAGE);
  await ready(page);
  await page.getByTestId('load-example').click();

  const entry = page.getByTestId('item-table');
  const results = page.getByTestId('result-table');
  const computed = entry.locator('thead th.col-computed');

  await page.setViewportSize({ width: 375, height: 812 });

  // What is typed stays in the first table; what is computed moves to the
  // second, and both rows read the same article at the same rank.
  await expect(computed.first()).toBeHidden();
  await expect(results).toBeVisible();
  await expect(results.locator('[data-testid="result-row"]')).toHaveCount(25);
  await expect(results.locator('[data-testid="result-value"]').first()).toContainText('187,200.00');
  await expect(results.locator('[data-testid="result-class"]').first()).toContainText('A');

  // No cumulative column here, and a long name wraps instead of being cut:
  // the second table exists to tie a figure to an article, and an article
  // clipped to nine characters ties it to nothing.
  await expect(results.locator('thead th')).toHaveCount(4);
  const name = results.locator('.result-name').first();
  await expect(name).toContainText('Espresso beans, house blend');
  expect(await name.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await expect(entry.locator('#name-' + (await firstId(page)))).toBeVisible();

  // The desk gets the one table, whole, and never renders the second.
  await page.setViewportSize({ width: 1024, height: 812 });
  await expect(computed.first()).toBeVisible();
  await expect(computed).toHaveCount(4);
  await expect(results).toBeHidden();
});

async function firstId(page: Page): Promise<string> {
  const id = await page
    .getByTestId('item-row')
    .first()
    .locator('input')
    .first()
    .getAttribute('id');
  return (id ?? '').replace('name-', '');
}

/* ---- The house rules the sibling tool is held to ------------------- */

test('never scrolls sideways, at any of the sizes it claims to support', async ({ page }) => {
  // Five full page loads in one test, each waiting for hydration. Against a
  // development server compiling under the rest of the suite that runs to
  // about half a minute, which is the default budget for a whole test rather
  // than for five navigations inside one.
  test.slow();

  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    // With the example loaded: an empty table is not what once overflowed.
    await withExample(page);
    await page.waitForTimeout(250);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `overflow at ${width}px`).toBeLessThanOrEqual(0);
  }
});

test('names every control and every diagram', async ({ page }) => {
  await withExample(page);

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
    return [
      ...[...document.querySelectorAll('input, select, textarea')].filter(
        (element) => !named(element),
      ),
      ...[...document.querySelectorAll('button')].filter(
        (button) =>
          (button.textContent ?? '').trim() === '' &&
          (button.getAttribute('aria-label') ?? '').trim() === '',
      ),
    ].map((element) => element.outerHTML.slice(0, 90));
  });

  expect(unnamed).toEqual([]);

  await expect(page.locator('svg[role="img"]')).toHaveAttribute('aria-label', /\w/);
});

test('has one first-level heading and no gaps in the levels below it', async ({ page }) => {
  await page.goto(PAGE);
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

test('gives every target enough room to hit', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'target size matters where fingers are');

  await withExample(page);

  const small = await page.evaluate(() => {
    const targets = [
      ...document.querySelectorAll('button, select, a[href], label[data-active]'),
    ].filter((element) => !element.classList.contains('sr-only'));
    return targets
      .map((element) => {
        const box = element.getBoundingClientRect();
        return {
          html: element.outerHTML.slice(0, 70),
          w: Math.round(box.width),
          h: Math.round(box.height),
        };
      })
      .filter((box) => box.w > 0 && box.h > 0 && (box.w < 24 || box.h < 24));
  });

  expect(small).toEqual([]);
});
