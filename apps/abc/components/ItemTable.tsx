'use client';

import type { AbcAnalysis } from '@/lib/classify';
import type { ItemRow } from '@/lib/rows';
import { currencySymbol, formatForInput, parseNumber } from '@sct/shared/lib/format';

import { Figure } from '@sct/shared/ui/Figure';
import { rankOf } from './rank';
import { useSettings } from './Settings';

export interface ItemTableProps {
  rows: readonly ItemRow[];
  analysis: AbcAnalysis;
  onEdit: (id: string, patch: Partial<Omit<ItemRow, 'id'>>) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}

/**
 * The table, which is also the input.
 *
 * Three columns are typed into and four are computed from them, in one grid
 * rather than in a form beside a result. Every keystroke re-sorts, re-shares
 * and re-classifies the whole list, so there is nothing to submit and no
 * button to press: what the table shows is what the numbers in it mean.
 *
 * Rows are shown in ranked order, richest first, so the cumulative column
 * reads down the table as the running total it is and the classes arrive in
 * one block each.
 *
 * A row still being filled in never moves: a row is worth nothing until it has
 * both a usage and a cost, and classify() holds every such row in input order
 * rather than sorting it by name. That is what stopped the table jumping under
 * the cursor at the first letter typed. See byValueThenName in lib/classify.
 *
 * On a narrow screen the table drops Part and Cumul and keeps the five
 * columns the classification is actually made of. See .col-detail in
 * app/globals.css.
 *
 * Rows are keyed by a stable id, not by position or name. That is what lets
 * the sort move a finished row without React tearing down the input being
 * typed into, and it is why duplicate names cost nothing.
 */
export function ItemTable({ rows, analysis, onEdit, onRemove, onAdd }: ItemTableProps) {
  const { locale, currency, t } = useSettings();
  const symbol = currencySymbol(currency, locale);

  const rowsById = new Map(rows.map((row) => [row.id, row]));

  /**
   * Leaving a numeric cell rewrites what is in it into the reader's
   * convention, exactly as the sibling tool's fields do. It never rewrites
   * something that did not parse: an unfinished entry is left to be finished.
   */
  const tidy = (id: string, field: 'usage' | 'cost', text: string) => {
    const parsed = parseNumber(text, locale);
    if (parsed === null) return;
    const formatted = formatForInput(parsed, locale);
    if (formatted !== text) onEdit(id, { [field]: formatted });
  };

  return (
    // The id sits on the panel rather than on a wrapper, because .panel is
    // what carries min-width:0. A bare div around it would be a grid item that
    // refuses to shrink below the table's min-content, and would widen every
    // other track on the page along with its own.
    <section id="items" className="panel">
      <div className="panel-head">
        <h2 className="t-label">{t.sections.table}</h2>
      </div>

      <div className="table-scroll px-4 py-2">
        <table className="banded t-body" data-testid="item-table">
          <caption className="sr-only">{t.sections.table}</caption>
          <thead>
            <tr>
              <th scope="col" className="min-w-[3.5rem] sm:min-w-[16rem]">
                {t.table.columns.name}
              </th>
              <th scope="col" className="n">
                <span className="sm:hidden">{t.table.short.annualUsage}</span>
                <span className="hidden sm:inline">{t.table.columns.annualUsage}</span>{' '}
                <span className="unit">{t.units.perYear}</span>
              </th>
              <th scope="col" className="n">
                <span className="sm:hidden">{t.table.short.unitCost}</span>
                <span className="hidden sm:inline">{t.table.columns.unitCost}</span>{' '}
                <span className="unit">{symbol}</span>
              </th>
              <th scope="col" className="n">
                <span className="sm:hidden">{t.table.short.annualValue}</span>
                <span className="hidden sm:inline">{t.table.columns.annualValue}</span>{' '}
                <span className="unit">{symbol}</span>
              </th>
              <th scope="col" className="n col-detail">
                {t.table.columns.valueShare} <span className="unit">%</span>
              </th>
              <th scope="col" className="n col-detail">
                {t.table.columns.cumulativeShare} <span className="unit">%</span>
              </th>
              <th scope="col">{t.table.columns.abcClass}</th>
              <th scope="col" className="no-print">
                <span className="sr-only">{t.actions.removeRow('')}</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {analysis.items.map((item) => {
              const row = rowsById.get(item.id);
              if (row === undefined) return null;

              return (
                <tr key={item.id} data-testid="item-row" data-class={item.abcClass ?? ''}>
                  <td>
                    <label className="sr-only" htmlFor={`name-${item.id}`}>
                      {t.table.columns.name}
                    </label>
                    <input
                      id={`name-${item.id}`}
                      className="field-input field-text t-body min-w-[3.5rem] sm:min-w-[16rem]"
                      type="text"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder={t.table.namePlaceholder}
                      value={row.name}
                      onChange={(event) => onEdit(item.id, { name: event.target.value })}
                    />
                  </td>

                  <td className="n">
                    <label className="sr-only" htmlFor={`usage-${item.id}`}>
                      {t.table.columns.annualUsage}
                    </label>
                    <input
                      id={`usage-${item.id}`}
                      className="field-input t-body min-w-[4.25rem] sm:w-[7.5rem]"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      spellCheck={false}
                      value={row.usage}
                      onChange={(event) => onEdit(item.id, { usage: event.target.value })}
                      onBlur={(event) => tidy(item.id, 'usage', event.target.value)}
                    />
                  </td>

                  <td className="n">
                    <label className="sr-only" htmlFor={`cost-${item.id}`}>
                      {t.table.columns.unitCost}
                    </label>
                    <input
                      id={`cost-${item.id}`}
                      className="field-input t-body min-w-[3.25rem] sm:w-[6.5rem]"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      spellCheck={false}
                      value={row.cost}
                      onChange={(event) => onEdit(item.id, { cost: event.target.value })}
                      onBlur={(event) => tidy(item.id, 'cost', event.target.value)}
                    />
                  </td>

                  {/* Whole MAD on a phone. Centimes are two characters the
                      narrow table cannot spare, and no classification has
                      ever turned on them. */}
                  <td className="n" data-testid="cell-value">
                    <span className="sm:hidden">
                      <Figure value={analysis.isEmpty ? null : item.annualValue} decimals={0} />
                    </span>
                    <span className="hidden sm:inline">
                      <Figure value={analysis.isEmpty ? null : item.annualValue} decimals={2} />
                    </span>
                  </td>
                  <td className="n col-detail" data-testid="cell-share">
                    <Figure value={analysis.isEmpty ? null : item.valueShare} decimals={1} />
                  </td>
                  <td className="n col-detail" data-testid="cell-cumulative">
                    <Figure value={analysis.isEmpty ? null : item.cumulativeShare} decimals={1} />
                  </td>
                  <td data-testid="cell-class">
                    {item.abcClass === null ? null : (
                      <span className="rank-chip" data-rank={rankOf(item.abcClass)}>
                        <span className="sr-only">{t.a11y.classOf(item.abcClass)}</span>
                        <span aria-hidden="true">{item.abcClass}</span>
                      </span>
                    )}
                  </td>

                  <td className="no-print">
                    <button
                      type="button"
                      className="btn btn-quiet t-micro px-1.5 py-1"
                      aria-label={t.actions.removeRow(row.name.trim())}
                      onClick={() => onRemove(item.id)}
                    >
                      <span aria-hidden="true">×</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>

          <tfoot>
            <tr>
              <th scope="row" className="border-t border-[color:var(--line-strong)] pt-1.5">
                {t.table.total}
              </th>
              <td className="border-t border-[color:var(--line-strong)] pt-1.5" />
              <td className="border-t border-[color:var(--line-strong)] pt-1.5" />
              <td
                className="n num-total border-t border-[color:var(--line-strong)] pt-1.5"
                data-testid="total-value"
              >
                <span className="sm:hidden">
                  <Figure value={analysis.isEmpty ? null : analysis.totalValue} decimals={0} />
                </span>
                <span className="hidden sm:inline">
                  <Figure value={analysis.isEmpty ? null : analysis.totalValue} decimals={2} />
                </span>
              </td>
              <td className="n num-total col-detail border-t border-[color:var(--line-strong)] pt-1.5">
                <Figure value={analysis.isEmpty ? null : 100} decimals={1} />
              </td>
              <td className="col-detail border-t border-[color:var(--line-strong)] pt-1.5" />
              <td className="border-t border-[color:var(--line-strong)] pt-1.5" />
              <td className="no-print border-t border-[color:var(--line-strong)] pt-1.5" />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="no-print flex flex-wrap items-center justify-between gap-2 border-t border-[color:var(--line)] px-4 py-2">
        <button type="button" className="btn t-micro" onClick={onAdd} data-testid="add-row">
          {t.actions.addRow}
        </button>
        <span className="t-micro text-[color:var(--text-2)]">
          {t.table.rowCount(analysis.items.length)}
        </span>
      </div>
    </section>
  );
}
