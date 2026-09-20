import { expect, test, type Page } from '@playwright/test';

/**
 * The make-or-buy calculator, checked where it actually runs. The arithmetic
 * itself is covered by lib/makeorbuy.test.ts and the dictionaries by
 * lib/i18n/dictionaries.test.ts; what is here is everything that only exists
 * once there is a browser: live recompute, the tabs, the chart's markers
 * landing where the model says they should, the validation messages, and the
 * page not overflowing on a phone.
 */

const PAGE = '/?lang=en';

async function ready(page: Page): Promise<void> {
  // A generous budget, because this is not waiting on the application. The
  // development server compiles a route the first time it is asked for one,
  // and a request arriving during that compile waits on the compiler rather
  // than on anything the page does. Against a warm server it resolves at once.
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', { timeout: 30_000 });
}

/** Type into a field and leave it, which is when validation is allowed to speak. */
async function fill(page: Page, id: string, value: string): Promise<void> {
  const field = page.locator(`#${id}`);
  await field.fill(value);
  await field.blur();
}

/**
 * Load the worked example.
 *
 * The page opens on a clear form, so anything that needs figures asks for
 * them here rather than assuming the page arrives already answered. Waiting
 * for the verdict rather than for the click is what makes the rest of a test
 * safe: until something is computed there are no tabs and no panels to find.
 */
async function loadExample(page: Page): Promise<void> {
  await page.locator('[data-testid="load-example"]').click();
  await expect(page.locator('[data-testid="verdict-word"]')).toBeVisible();
}

/** Open one of the two output views. */
async function openTab(page: Page, id: 'verdict' | 'volume'): Promise<void> {
  await page.locator(`[data-testid="tab-${id}"]`).click();
  await expect(page.locator(`[data-testid="tab-${id}"]`)).toHaveAttribute('aria-selected', 'true');
}

test('opens on a clear form, with nothing computed', async ({ page }) => {
  await page.goto(PAGE);
  await ready(page);

  // Nothing is filled in and nothing is answered: the tool opens ready for the
  // reader's own part, and says so rather than showing a blank panel.
  await expect(page.locator('#f-annualVolume')).toHaveValue('');
  await expect(page.locator('#f-supplierPrice')).toHaveValue('');
  await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
  await expect(page.locator('[data-testid="verdict-word"]')).toHaveCount(0);
});

test('computes the reference case once the example is loaded', async ({ page }) => {
  await page.goto(PAGE);
  await ready(page);
  await loadExample(page);

  await expect(page.locator('[data-testid="empty-state"]')).toHaveCount(0);
  // The first tab is the one a reader lands on: the answer, not the workings.
  await expect(page.locator('[data-testid="tab-verdict"]')).toHaveAttribute(
    'aria-selected',
    'true',
  );

  await expect(page.locator('[data-testid="verdict-word"]')).toHaveText('BUY');
  await expect(page.locator('[data-testid="verdict-saving"]')).toContainText('24,474');
  await expect(page.locator('[data-testid="unit-make"]')).toContainText('45.95');
  await expect(page.locator('[data-testid="unit-buy"]')).toContainText('43.50');
  await expect(page.locator('[data-testid="break-even-volume"]')).toContainText('15,376');
  await expect(page.locator('[data-testid="break-even-reading"]')).toHaveText(
    'Above 15,376 units a year, making is cheaper.',
  );
});

test('totals both sides from the lines it shows', async ({ page }) => {
  await page.goto(PAGE);
  await ready(page);
  await loadExample(page);

  // Variable 389,474 + fixed 60,000 + tooling 10,000.
  await expect(page.locator('[data-testid="breakdown-make-total"]')).toContainText('459,474');
  await expect(page.locator('[data-testid="breakdown-buy-total"]')).toContainText('435,000');
});

test('carries no judgement scoring anywhere on the page', async ({ page }) => {
  await page.goto(PAGE);
  await ready(page);

  // Removed outright rather than hidden: a weighted score and an annual cost
  // are not commensurable, and the tool no longer offers to combine them.
  await expect(page.locator('[data-testid="judgement"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="disagreement"]')).toHaveCount(0);
  await expect(page.locator('#scoring')).toHaveCount(0);
});

test('moves between the two views, one at a time', async ({ page }) => {
  await page.goto(PAGE);
  await ready(page);
  await loadExample(page);

  await expect(page.locator('[data-testid="panel-verdict"]')).toBeVisible();
  await expect(page.locator('[data-testid="panel-volume"]')).toBeHidden();

  await openTab(page, 'volume');
  await expect(page.locator('[data-testid="chart"]')).toBeVisible();
  await expect(page.locator('[data-testid="panel-verdict"]')).toBeHidden();

  await openTab(page, 'verdict');
  await expect(page.locator('[data-testid="verdict-word"]')).toBeVisible();
});

test('moves between tabs with the arrow keys', async ({ page }) => {
  await page.goto(PAGE);
  await ready(page);
  await loadExample(page);

  await page.locator('[data-testid="tab-verdict"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-testid="tab-volume"]')).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.keyboard.press('End');
  await expect(page.locator('[data-testid="tab-volume"]')).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.keyboard.press('Home');
  await expect(page.locator('[data-testid="tab-verdict"]')).toHaveAttribute(
    'aria-selected',
    'true',
  );
});

test('recomputes as the figures are typed', async ({ page }) => {
  await page.goto(PAGE);
  await ready(page);
  await loadExample(page);

  // Well above the 15,376 break-even, so the answer has to turn over.
  await fill(page, 'f-annualVolume', '30000');
  await expect(page.locator('[data-testid="verdict-word"]')).toHaveText('MAKE');

  await fill(page, 'f-annualVolume', '10000');
  await expect(page.locator('[data-testid="verdict-word"]')).toHaveText('BUY');
});

test('refuses the figures that describe nothing, and keeps answering', async ({ page }) => {
  await page.goto(PAGE);
  await ready(page);
  await loadExample(page);

  await fill(page, 'f-yieldPercent', '0');
  await expect(page.locator('#f-yieldPercent')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#f-yieldPercent-error')).toHaveText(
    'Enter a yield above 0 and up to 100.',
  );

  await fill(page, 'f-materialsPerUnit', '-5');
  await expect(page.locator('#f-materialsPerUnit-error')).toHaveText('Enter zero or more.');

  await fill(page, 'f-horizonYears', '0');
  await expect(page.locator('#f-horizonYears-error')).toHaveText('Enter at least one year.');

  await fill(page, 'f-dutyPercent', '150');
  await expect(page.locator('#f-dutyPercent-error')).toHaveText(
    'Enter a percentage between 0 and 100.',
  );

  // One bad field does not take the page down with it.
  await expect(page.locator('[data-testid="verdict-word"]')).toBeVisible();
});

test('says the same figures in French', async ({ page }) => {
  await page.goto('/?lang=fr');
  await ready(page);
  await loadExample(page);

  await expect(page.locator('[data-testid="verdict-word"]')).toHaveText('ACHETER');
  // French groups with a narrow no-break space and marks decimals with a comma.
  await expect(page.locator('[data-testid="breakdown-make-total"]')).toContainText('459');
  await expect(page.locator('[data-testid="unit-buy"]')).toContainText('43,50');
  await expect(page.locator('[data-testid="break-even-reading"]')).toHaveText(
    'Au-dessus de 15 376 unités par an, produire revient moins cher.',
  );
});

test('returns to the state it opened in when emptied', async ({ page }) => {
  await page.goto(PAGE);
  await ready(page);
  await loadExample(page);

  await page.locator('[data-testid="clear-all"]').click();
  await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
  await expect(page.locator('[data-testid="verdict-word"]')).toHaveCount(0);

  await page.locator('[data-testid="load-example"]').click();
  await expect(page.locator('[data-testid="verdict-word"]')).toHaveText('BUY');
});

test('never scrolls the page sideways, and never overlaps a chart label', async ({ page }) => {
  await page.goto(PAGE);
  await ready(page);
  await loadExample(page);
  await openTab(page, 'volume');

  const findings = await page.evaluate(() => {
    const doc = document.documentElement;
    const texts = [...document.querySelectorAll('svg[data-testid="chart"] text')];
    const boxes = texts.map((node) => ({
      text: node.textContent?.trim() ?? '',
      box: node.getBoundingClientRect(),
    }));
    const overlaps: string[] = [];
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i]!.box;
        const b = boxes[j]!.box;
        if (
          a.width > 0 &&
          b.width > 0 &&
          a.left < b.right &&
          b.left < a.right &&
          a.top < b.bottom &&
          b.top < a.bottom
        ) {
          overlaps.push(`${boxes[i]!.text} / ${boxes[j]!.text}`);
        }
      }
    }
    return { overflow: doc.scrollWidth - doc.clientWidth, overlaps };
  });

  expect(findings.overflow).toBeLessThanOrEqual(0);
  expect(findings.overlaps).toEqual([]);
});
