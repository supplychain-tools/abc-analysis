'use client';

import type { ClassBand } from '@/lib/classify';

import { Measure } from '@sct/shared/ui/Figure';
import { useSettings } from './Settings';

export interface FindingProps {
  bands: readonly ClassBand[];
}

/**
 * The finding, at the head of the reading, set the way the ordering calculator
 * sets Q*.
 *
 * Every tool in this family answers one question, and every one of them puts
 * its answer first: the largest thing on the page, the only figures in the
 * accent, under a quiet line naming what they are. The stylesheet here has
 * described that line since revision 3 and nothing rendered it, so the reading
 * opened on a table of twenty-five rows and the reader was left to find the
 * point in it.
 *
 * There the line is an equation with one unknown. Here it is two figures with
 * a word between them, because the finding is a comparison and half of it is
 * not a finding: a share of the value means nothing without the share of the
 * list that carries it. 74,8 % is a number; 74,8 % on 16,0 % is the reason the
 * classification exists.
 *
 * Class A only. B and C are underneath, as cards, and they are the rest of the
 * distribution rather than the thing it reveals.
 */
export function Finding({ bands }: FindingProps) {
  const { t } = useSettings();

  const a = bands.find((band) => band.abcClass === 'A');
  if (a === undefined) return null;

  return (
    <section id="finding" className="panel" aria-label={t.a11y.findingRegion}>
      <div className="panel-body pb-4 pt-5">
        <h2 className="t-label mb-3 text-[color:var(--text-2)]">{t.finding.title}</h2>

        <p className="equation">
          <span className="answer">
            <Measure value={a.valueShare} decimals={1} unit="%" testId="finding-value-share" />{' '}
            <span className="unit">{t.summary.ofValue}</span>
          </span>

          <span className="op">{t.finding.on}</span>

          <span className="answer">
            <Measure value={a.itemShare} decimals={1} unit="%" testId="finding-item-share" />{' '}
            <span className="unit">{t.summary.ofItems}</span>
          </span>
        </p>
      </div>
    </section>
  );
}
