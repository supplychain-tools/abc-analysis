'use client';

import type { ClassBand } from '@/lib/classify';
import { currencySymbol } from '@sct/shared/lib/format';

import { Figure, Measure } from '@sct/shared/ui/Figure';
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
 * what the class costs in attention — how many lines, what fraction of the
 * list. Below: what it returns — the share of the money, and the money. The
 * gap between them is where the Pareto effect is legible: the top half of A
 * is small and the bottom half is nearly everything, and C is the other way
 * round.
 *
 * No bar is drawn under any of it. The gap between 16.0 and 74.8 is the point
 * and a pair of figures that far apart does not need a bar to be believed.
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
                  <dt className="sr-only">{t.summary.columns.itemCount}</dt>
                  <dd className="t-body num" data-testid={`band-${band.abcClass}-count`}>
                    {t.table.rowCount(band.itemCount)}
                  </dd>

                  <dt className="sr-only">{t.summary.columns.itemShare}</dt>
                  <dd className="t-body num" data-testid={`band-${band.abcClass}-item-share`}>
                    <Measure value={band.itemShare} decimals={1} unit="%" />{' '}
                    <span className="unit">{t.summary.ofItems}</span>
                  </dd>
                </div>

                <div className="class-card-return">
                  <dt className="sr-only">{t.summary.columns.valueShare}</dt>
                  <dd
                    className="t-figure-lg num"
                    data-testid={`band-${band.abcClass}-value-share`}
                  >
                    <Measure value={band.valueShare} decimals={1} unit="%" />{' '}
                    <span className="unit">{t.summary.ofValue}</span>
                  </dd>

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
