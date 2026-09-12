'use client';

import type { EoqResult } from '@/lib/eoq';
import { currencySymbol } from '@sct/shared/lib/format';

import { Figure, Measure } from '@sct/shared/ui/Figure';
import { useSettings } from './Settings';

export interface AnswerPanelProps {
  eoq: EoqResult | null;
}

/** One headline metric, in its own box. */
function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="kpi min-w-0">
      <dt className="t-micro text-[color:var(--text-2)]">{label}</dt>
      <dd className="t-figure-lg num mt-1">{children}</dd>
    </div>
  );
}

/** One line of the secondary block: a name, and the figure it names. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-4 py-1.5">
      <dt className="t-micro text-[color:var(--text-2)]">{label}</dt>
      <dd className="t-body num">{children}</dd>
    </div>
  );
}

/**
 * What follows from the answer, once the equation above has given it.
 *
 * Q* left this panel in revision 3 and became the masthead. What stays here is
 * the supporting detail — how often that means ordering, how many days a cycle
 * runs, what it costs — set at one size below the equation and at the head of
 * the column that carries the rest of the reading.
 */
export function AnswerPanel({ eoq }: AnswerPanelProps) {
  const { locale, currency, t } = useSettings();
  const symbol = currencySymbol(currency, locale);

  if (eoq === null) return null;

  return (
    <section className="panel" aria-label={t.sections.results}>
      <div className="panel-body">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label={t.results.ordersPerYear}>
            <Measure
              value={eoq.ordersPerYear}
              decimals={2}
              unit={t.units.perYear}
              width={5}
              testId="result-orders"
            />
          </Stat>
          <Stat label={t.results.daysBetween}>
            <Measure
              value={eoq.daysBetweenOrders}
              decimals={1}
              unit={t.units.days}
              width={4}
              testId="result-days"
            />
          </Stat>
          <Stat label={t.results.relevantCost}>
            <Measure
              value={eoq.relevantCost}
              decimals={2}
              unit={symbol}
              width={8}
              testId="result-trc"
            />
          </Stat>
        </dl>

        {/* Four figures that were a wrapped sentence of label-value pairs, set
            as a list now: two columns where there is room, each figure against
            the right edge of its own column, so the eye reads down the names or
            down the numbers rather than along a paragraph of both. */}
        <dl className="figure-list mt-4 grid gap-x-8 sm:grid-cols-2">
          <Row label={t.results.averageInventory}>
            <Figure value={eoq.averageInventory} decimals={1} />
          </Row>
          <Row label={t.results.closedForm}>
            <Figure value={eoq.relevantCostClosedForm} decimals={2} />
          </Row>
          {eoq.purchaseCost === null ? null : (
            <Row label={t.results.purchaseCost}>
              <Figure value={eoq.purchaseCost} decimals={2} />
            </Row>
          )}
          {eoq.totalCost === null ? null : (
            <Row label={t.results.totalCost}>
              <span className="num-total">
                <Figure value={eoq.totalCost} decimals={2} />
              </span>
            </Row>
          )}
        </dl>

      </div>
    </section>
  );
}
