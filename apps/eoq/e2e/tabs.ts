import { expect, type Page } from '@playwright/test';

/**
 * The output column is split into views, so a panel that used to be on the
 * page is now one click away. Tests that read the cost curve or the
 * sensitivity table open their own view first.
 *
 * Named by a pattern that matches either language, because the suite runs
 * cases in both and the tab is the same tab.
 */
export const TAB = {
  overview: /Order and cycle|Commande et cycle/,
  chart: /^(Cost curve|Courbe de coût)$/,
  sensitivity: /Sensitivity|Sensibilité/,
} as const;

/**
 * Open one view.
 *
 * Waits for hydration first, and that is not belt and braces: before React
 * attaches, there is no tab strip to find, so a bare count would come back
 * zero, this would return quietly, and the test would fail later against the
 * wrong view with an error that says nothing about tabs.
 *
 * A page with no answer yet genuinely has no tabs, which is not a failure.
 */
export async function openTab(page: Page, name: RegExp): Promise<void> {
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', { timeout: 30_000 });

  const tab = page.getByRole('tab', { name });
  if ((await tab.count()) === 0) return;
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
}
