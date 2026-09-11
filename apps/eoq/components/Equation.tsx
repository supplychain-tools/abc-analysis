'use client';

import type { EoqResult } from '@/lib/eoq';

import { Measure } from '@sct/shared/ui/Figure';
import { useSettings } from './Settings';

export interface EquationProps {
  eoq: EoqResult | null;
  missingLabels: string[];
}

/**
 * The answer, at the head of the output column: Q* = the quantity.
 *
 * Q* is why someone opened the page, so it is set larger than anything under it
 * and marked, and it is named rather than left as a bare number: the star is
 * what separates the optimum from any other order quantity.
 *
 * It appears only once there is an answer. Standing over a dash it was a
 * promise the page could not yet keep, and the tool opens on empty fields, so
 * that was the state a reader met first. Until then the panel carries what is
 * still missing and nothing else.
 *
 * Three things were built into this line and cut, in this order: a substitution
 * line restating D, S and H under it; √(2DS/H) drawn between the equals signs;
 * and the symbolic form in the empty state. Each was another thing to read
 * before the figure, and the rail already carries every input in the field the
 * reader typed it into.
 */
export function Equation({ eoq, missingLabels }: EquationProps) {
  const { t } = useSettings();

  return (
    <section id="answer" className="panel" aria-label={t.a11y.resultsRegion}>
      {/* Nothing to divide by nothing. An equation standing over a dash is a
          promise the page cannot keep yet, so until there are numbers to put
          through it the panel carries only what is missing. */}
      {eoq === null ? (
        <div className="panel-body">
          <p className="note t-body text-[color:var(--text-2)]">
            <span data-testid="empty-state">{t.empty.headline}</span>
            {missingLabels.length > 0 ? (
              <span className="block">
                {t.empty.needs} {missingLabels.join(', ')}
              </span>
            ) : null}
          </p>
        </div>
      ) : (
        <div className="panel-body pb-4 pt-5">
          <h2 className="t-label mb-3 text-[color:var(--text-2)]">{t.results.quantity}</h2>

          <p className="equation">
            <span aria-hidden="true" className="symbol">
              Q<span className="star">*</span>
            </span>
            <span aria-hidden="true" className="op">
              =
            </span>

            <span className="answer">
              <Measure
                value={eoq.quantity}
                decimals={1}
                unit={t.units.units}
                testId="result-quantity"
              />
            </span>
          </p>
        </div>
      )}
    </section>
  );
}
