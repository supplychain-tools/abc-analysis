'use client';

import type { BuyLineId, CostLine, MakeLineId, MakeOrBuyResult, SideBreakdown } from '@/lib/makeorbuy';
import { currencySymbol } from '@sct/shared/lib/format';
import { Figure } from '@sct/shared/ui/Figure';

import { useSettings } from './Settings';

/**
 * Every cost line of both options, per unit and per year.
 *
 * Two tables rather than one, because the two sides do not share a single row.
 * Scrap loss has no counterpart on a purchase order and customs duty has none
 * on a production line, so a combined table would need a blank cell on one side
 * of nearly every row and would be claiming a correspondence that is not there.
 *
 * Two three-column tables also answer the narrow screen without a special case:
 * they sit side by side where there is room and stack where there is not, and
 * neither ever has to scroll sideways. A single table of five numeric columns
 * would have had to.
 */
export function Breakdown({ result }: { result: MakeOrBuyResult }) {
  const { t } = useSettings();

  return (
    <section className="panel" aria-label={t.a11y.breakdownRegion}>
      <div className="panel-head">
        <h2 className="t-label">{t.sections.breakdown}</h2>
      </div>

      <div className="panel-body grid gap-4 md:grid-cols-2">
        <SideTable
          heading={t.breakdown.make}
          side={result.make}
          nameOf={(id) => t.breakdown.makeLines[id]}
          best={result.verdict === 'make'}
          testId="breakdown-make"
        />
        <SideTable
          heading={t.breakdown.buy}
          side={result.buy}
          nameOf={(id) => t.breakdown.buyLines[id]}
          best={result.verdict === 'buy'}
          testId="breakdown-buy"
        />
      </div>
    </section>
  );
}

function SideTable<Id extends MakeLineId | BuyLineId>({
  heading,
  side,
  nameOf,
  best,
  testId,
}: {
  heading: string;
  side: SideBreakdown<Id>;
  nameOf: (id: Id) => string;
  best: boolean;
  testId: string;
}) {
  const { locale, currency, t } = useSettings();
  const symbol = currencySymbol(currency, locale);

  // A line at exactly zero is a cost that was asked for and is not there. It
  // is dropped rather than shown, because eight rows of nought are eight rows
  // a reader has to scan past to reach the four that carry the answer.
  const counted = side.lines.filter((line) => line.annual !== 0);

  return (
    <div className="min-w-0" data-testid={testId}>
      <div className="table-scroll">
        <table className="banded">
          <caption className="sr-only">{`${heading}: ${t.breakdown.caption}`}</caption>
          <thead>
            <tr>
              <th scope="col">{heading}</th>
              <th scope="col" className="n">
                {t.breakdown.perUnit}
              </th>
              <th scope="col" className="n">
                {t.breakdown.annual}
              </th>
            </tr>
          </thead>
          <tbody>
            {counted.map((line) => (
              <Row key={line.id} name={nameOf(line.id)} line={line} />
            ))}
          </tbody>
          <tfoot>
            <tr data-best={best} data-testid={`${testId}-total`}>
              <th scope="row" className="t-label">
                {t.breakdown.total}
              </th>
              <td className="n num-total">
                <Figure value={side.totalPerUnit} decimals={2} />
              </td>
              <td className="n num-total">
                <Figure value={side.totalAnnual} decimals={0} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="t-micro mt-1 text-right text-[color:var(--text-2)]">{symbol}</p>

    </div>
  );
}

function Row<Id extends string>({ name, line }: { name: string; line: CostLine<Id> }) {
  return (
    <tr data-line={line.id}>
      <th scope="row">{name}</th>
      <td className="n">
        <Figure value={line.perUnit} decimals={2} />
      </td>
      <td className="n">
        <Figure value={line.annual} decimals={0} />
      </td>
    </tr>
  );
}
