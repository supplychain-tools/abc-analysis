'use client';

import type { ClassBand } from '@/lib/classify';
import { currencySymbol } from '@sct/shared/lib/format';

import { Measure } from '@sct/shared/ui/Figure';
import { rankOf } from './rank';
import { useSettings } from './Settings';

export interface ClassSummaryProps {
  bands: readonly ClassBand[];
}

/**
 * What each class holds, as three cards rather than three rows.
 *
 * It was a table, and a table was the wrong shape for it. Three rows of five
 * columns asked a reader to travel along a row to collect one class and down a
 * column to compare classes, and the finding needs both at once: a sixth of
 * the lines, three quarters of the spend. Side by side, each class is one
 * object you can take in whole, and the three read against each other without
 * anyone tracking across a rule.
 *
 * Each card is in two halves, and the division is the whole argument. Left:
 * what the class costs in attention. Right: what it returns. The halves are
 * set beside each other rather than stacked, because the finding is a
 * comparison of the two shares and a comparison wants them on one line: 16,0
 * and 74,8 sit at the same height, a rule apart, and the gap between them is
 * read in a glance rather than assembled from two readings.
 *
 * Both shares are set at one size. They were 13px and 22px, which decided the
 * comparison before the reader made it: the figure that matters is whichever
 * is larger in the particular class being looked at, and in C it is the item
 * share. Same size, and which one is larger is the reader's to see.
 *
 * Each share carries its own words inline — "% of items", "% of value" — so a
 * figure is claimed by the thing it is a share of without a separate line of
 * label above it. Under each share sits the figure it was computed from: the
 * count on the left, the money on the right, quiet, because they are the
 * evidence rather than the finding. The two halves share their row tracks, so
 * those two lines sit on one baseline however the words above them wrap.
 *
 * The share of the value is the only coloured thing in the card. Both shares
 * are set at one size, so size cannot say which of the two the reader is here
 * for, and the answer is the money: blue on the value share, the text colour
 * on the share of the list beside it. The class chip supplies the other blue,
 * and between them nothing else in the card is coloured at all.
 *
 * No bar is drawn under any of it. A pair of figures that far apart does not
 * need a bar to be believed.
 */
export function ClassSummary({ bands }: ClassSummaryProps) {
  const { locale, currency, t } = useSettings();
  const symbol = currencySymbol(currency, locale);

  return (
    <section className="panel" aria-label={t.sections.summary}>
      <div className="panel-head">
        <h2 className="t-label">{t.sections.summary}</h2>
      </div>

      <div className="panel-body">
        <div className="grid gap-3 sm:grid-cols-3" data-testid="class-summary">
          {bands.map((band) => (
            <div key={band.abcClass} className="class-card" data-testid={`band-${band.abcClass}`}>
              {/* The same chip the table rows and the diagram's bars are keyed
                  to, so a class is one mark wherever it appears. */}
              <span className="rank-chip" data-rank={rankOf(band.abcClass)}>
                <span className="sr-only">{t.a11y.classOf(band.abcClass)}</span>
                <span aria-hidden="true">{band.abcClass}</span>
              </span>

              <dl className="class-card-split mt-3">
                <div className="class-card-cost">
                  {/* The words sit inline after the figure, so the term the
                      screen reader needs is the same one the eye reads. */}
                  <dt className="sr-only">{t.summary.labels.itemShare}</dt>
                  <dd
                    className="t-figure-lg num class-card-share"
                    data-testid={`band-${band.abcClass}-item-share`}
                  >
                    <Measure value={band.itemShare} decimals={1} unit="%" />{' '}
                    <span className="class-card-of">{t.summary.ofItems}</span>
                  </dd>

                  {/* The count the share was taken of. Named for a screen
                      reader only: on screen "4 items" says what it is. */}
                  <dt className="sr-only">{t.summary.columns.itemCount}</dt>
                  <dd
                    className="t-body num class-card-basis"
                    data-testid={`band-${band.abcClass}-count`}
                  >
                    {t.table.rowCount(band.itemCount)}
                  </dd>
                </div>

                <div className="class-card-return">
                  <dt className="sr-only">{t.summary.labels.valueShare}</dt>
                  <dd
                    className="t-figure-lg num class-card-share class-card-share-value"
                    data-testid={`band-${band.abcClass}-value-share`}
                  >
                    <Measure value={band.valueShare} decimals={1} unit="%" />{' '}
                    <span className="class-card-of">{t.summary.ofValue}</span>
                  </dd>

                  {/* The money the share was taken of. The currency symbol
                      names it on screen, so the term is for the reader who
                      cannot see it. */}
                  <dt className="sr-only">{t.table.columns.annualValue}</dt>
                  <dd className="t-body num class-card-basis">
                    <Measure value={band.totalValue} decimals={2} unit={symbol} />
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
