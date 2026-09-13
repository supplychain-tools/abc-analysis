'use client';

import type { AbcAnalysis } from '@/lib/classify';
import { currencySymbol } from '@sct/shared/lib/format';

import { Figure } from '@sct/shared/ui/Figure';
import { rankOf } from './rank';
import { useSettings } from './Settings';

export interface ResultTableProps {
  analysis: AbcAnalysis;
}

/**
 * What the numbers came to, as a second table — on a phone only.
 *
 * Seven columns do not fit 375px, and the two ways out are both worse than
 * this one. Hiding columns throws away the answer; swiping sideways keeps it
 * but never shows a name and its class at the same time, which is the one
 * thing reading a row is for.
 *
 * So the table is cut where it already divides: above, the three columns a
 * person types into; here, the four the tool computes from them. The article
 * is repeated at the head of each row, because it is what ties the two
 * halves together — without it this is a column of unattached figures.
 *
 * Rows come from analysis.items, the same ranked list the entry table walks,
 * so the two read down in step and the cumulative column is the running
 * total it claims to be.
 *
 * Read-only: nothing here can be typed into, so the names are text rather
 * than fields and there is no remove button. The wide screen never renders
 * this at all — it gets the one table, whole.
 */
export function ResultTable({ analysis }: ResultTableProps) {
  const { locale, currency, t } = useSettings();
  const symbol = currencySymbol(currency, locale);

  return (
    <section className="panel sm:hidden" aria-label={t.sections.results}>
      <div className="panel-head">
        <h2 className="t-label">{t.sections.results}</h2>
      </div>

      <div className="table-scroll px-4 py-2">
        <table className="banded t-body" data-testid="result-table">
          <caption className="sr-only">{t.sections.results}</caption>
          <thead>
            <tr>
              <th scope="col">{t.table.columns.name}</th>
              <th scope="col" className="n">
                {t.table.columns.annualValue} <span className="unit">{symbol}</span>
              </th>
              <th scope="col" className="n">
                {t.table.columns.valueShare} <span className="unit">%</span>
              </th>
              <th scope="col" className="n">
                {t.table.columns.cumulativeShare} <span className="unit">%</span>
              </th>
              <th scope="col">{t.table.columns.abcClass}</th>
            </tr>
          </thead>

          <tbody>
            {analysis.items.map((item) => (
              <tr key={item.id} data-testid="result-row" data-class={item.abcClass ?? ''}>
                {/* The name is the row's heading here, not one more cell:
                    every figure beside it is a figure about this article. */}
                <th scope="row" className="result-name">
                  {item.name === '' ? (
                    <span className="text-[color:var(--text-2)]">{t.table.namePlaceholder}</span>
                  ) : (
                    item.name
                  )}
                </th>

                <td className="n" data-testid="result-value">
                  <Figure value={analysis.isEmpty ? null : item.annualValue} decimals={2} />
                </td>
                <td className="n">
                  <Figure value={analysis.isEmpty ? null : item.valueShare} decimals={1} />
                </td>
                <td className="n">
                  <Figure value={analysis.isEmpty ? null : item.cumulativeShare} decimals={1} />
                </td>
                <td data-testid="result-class">
                  {item.abcClass === null ? null : (
                    <span className="rank-chip" data-rank={rankOf(item.abcClass)}>
                      <span className="sr-only">{t.a11y.classOf(item.abcClass)}</span>
                      <span aria-hidden="true">{item.abcClass}</span>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr>
              <th scope="row" className="border-t border-[color:var(--line-strong)] pt-1.5">
                {t.table.total}
              </th>
              <td
                className="n num-total border-t border-[color:var(--line-strong)] pt-1.5"
                data-testid="result-total"
              >
                <Figure value={analysis.isEmpty ? null : analysis.totalValue} decimals={2} />
              </td>
              <td className="n num-total border-t border-[color:var(--line-strong)] pt-1.5">
                <Figure value={analysis.isEmpty ? null : 100} decimals={1} />
              </td>
              <td className="border-t border-[color:var(--line-strong)] pt-1.5" />
              <td className="border-t border-[color:var(--line-strong)] pt-1.5" />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
