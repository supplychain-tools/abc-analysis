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
 * Each card is in two halves, and the division is the whole argument. Above:
 * what the class costs in attention. Below: what it returns. The gap between
 * them is where the Pareto effect is legible: the top half of A is small and
 * the bottom half is nearly everything, and C is the other way round.
 *
 * Each half is one reading, set the way the ordering calculator sets a
 * headline metric: the name of the figure above it, small and quiet, and the
 * figure under its own name. The labels used to trail the figures inline —
 * "16,0 % des articles", "74,8 % de la valeur" — which put four numbers and
 * four sets of words into one column and left a reader to work out which
 * belonged to which. Overhead, each figure is claimed before it is read.
 *
 * Both shares are now set at one size. They were 13px and 22px, which decided
 * the comparison before the reader made it: the figure that matters is
 * whichever is larger in the particular class being looked at, and in C it is
 * the top half. Same size, and the gap between 16,0 and 74,8 is the reader's
 * to see. Under each share sits the figure it was computed from — the count,
 * the money — quiet, because it is the evidence rather than the finding.
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

              <dl className="mt-3">
                <div className="class-card-cost">
                  <dt className="t-micro text-[color:var(--text-2)]">
                    {t.summary.labels.itemShare}
                  </dt>
                  <dd
                    className="t-figure-lg num mt-1"
                    data-testid={`band-${band.abcClass}-item-share`}
                  >
                    <Measure value={band.itemShare} decimals={1} unit="%" />
                  </dd>

                  {/* The count the share was taken of. Named for a screen
                      reader only: on screen "4 articles" says what it is. */}
                  <dt className="sr-only">{t.summary.columns.itemCount}</dt>
                  <dd
                    className="t-body num mt-0.5 text-[color:var(--text-2)]"
                    data-testid={`band-${band.abcClass}-count`}
                  >
                    {t.table.rowCount(band.itemCount)}
                  </dd>
                </div>

                <div className="class-card-return">
                  <dt className="t-micro text-[color:var(--text-2)]">
                    {t.summary.labels.valueShare}
                  </dt>
                  <dd
                    className="t-figure-lg num mt-1"
                    data-testid={`band-${band.abcClass}-value-share`}
                  >
                    <Measure value={band.valueShare} decimals={1} unit="%" />
                  </dd>

                  {/* The money the share was taken of. The currency symbol
                      names it on screen, so the term is for the reader who
                      cannot see it. */}
                  <dt className="sr-only">{t.table.columns.annualValue}</dt>
                  <dd className="t-body num mt-0.5 text-[color:var(--text-2)]">
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
