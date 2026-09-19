'use client';

import { fill } from '@/lib/i18n';
import type { MakeOrBuyInput, MakeOrBuyResult } from '@/lib/makeorbuy';
import { currencySymbol, formatQuantity } from '@sct/shared/lib/format';
import { Figure, Measure } from '@sct/shared/ui/Figure';

import { useSettings } from './Settings';

/**
 * The answer, at the top of the first tab.
 *
 * Three things, in the order a reader needs them: which option, what it saves,
 * and the volume at which that would change. Everything else on the page is
 * either the evidence for one of those or a consequence of it.
 *
 * The two unit costs sit under the headline rather than in a tab of their own,
 * because a verdict nobody can check is an assertion. They are the two numbers
 * the whole comparison reduces to, and having them here means the claim above
 * can be verified without going anywhere.
 */
export function Verdict({
  result,
  input,
}: {
  result: MakeOrBuyResult;
  input: MakeOrBuyInput;
}) {
  const { locale, currency, t } = useSettings();
  const symbol = currencySymbol(currency, locale);
  const tie = result.verdict === 'indifferent';
  const primary = result.breakEven.primary;

  /**
   * The sentence under the figures.
   *
   * "Above X, making is cheaper" is only true when nothing changes it back. A
   * quantity break can, so where a further crossing sits above this one the
   * region is bounded on both sides and the sentence has to say so, or it
   * would be stating as open-ended a stretch of the axis that ends.
   */
  const above = result.breakEven.crossings
    .map((crossing) => crossing.volume)
    .filter((volume) => primary !== null && volume > primary.volume)
    .sort((a, b) => a - b)[0];

  const reading =
    primary === null
      ? result.breakEven.dominant === 'make'
        ? t.breakEven.noneMake
        : result.breakEven.dominant === 'buy'
          ? t.breakEven.noneBuy
          : t.breakEven.noneEither
      : above === undefined
        ? fill(primary.cheaperAbove === 'make' ? t.breakEven.aboveMake : t.breakEven.aboveBuy, {
            volume: formatQuantity(Math.ceil(primary.volume), locale, 0),
          })
        : fill(
            primary.cheaperAbove === 'make' ? t.breakEven.betweenMake : t.breakEven.betweenBuy,
            {
              low: formatQuantity(Math.ceil(primary.volume), locale, 0),
              high: formatQuantity(Math.floor(above), locale, 0),
            },
          );

  return (
    <section className="panel" aria-label={t.a11y.verdictRegion} data-testid="verdict">
      <div className="panel-body pb-4 pt-5">
        {/* The answer, and on the same line the volume it holds at.

            Nothing names the panel any more: the section carries its own
            accessible name and the word below was already the largest thing on
            the page, so a label over it only told a reader what they were
            about to read. With it gone the volume was left alone on a line of
            its own, which read as a stray note rather than as a qualifier. It
            belongs against the verdict it qualifies, on the same baseline, the
            way the unit sits beside the figure in the ordering tool: the two
            are one statement, "buy, at ten thousand a year".

            justify-between rather than a gap, so the volume stays on the right
            edge of the sheet where the eye leaves the line, and flex-wrap so a
            narrow window drops it under the word instead of squeezing it. */}
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="t-display answer" data-testid="verdict-word">
            {t.verdict[result.verdict]}
          </p>
          <span className="t-micro text-[color:var(--text-2)]">
            {t.verdict.atVolume} <Figure value={input.annualVolume} decimals={0} />{' '}
            {t.units.perYear}
          </span>
        </div>

        {tie ? (
          <p className="t-body mt-1 text-[color:var(--text-2)]">{t.verdict.sameCost}</p>
        ) : (
          <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
            <span className="t-figure-lg">
              <Measure
                value={result.savingPerYear}
                unit={symbol}
                decimals={0}
                testId="verdict-saving"
              />
            </span>
            <span className="t-body text-[color:var(--text-2)]">{t.verdict.cheaperBy}</span>
            <span className="t-micro text-[color:var(--text-2)]">
              <Measure
                value={result.savingPerUnit}
                unit={symbol}
                decimals={2}
                testId="verdict-saving-unit"
              />{' '}
              {t.verdict.perUnitSaving}
            </span>
          </p>
        )}

        {/* The three figures the answer rests on, each in its own box, the way
            both siblings set the readings under their own answer. The cheaper
            unit cost is marked by weight alone: the word above has already
            said which side won, and a second marking on the same fact was an
            accessory rather than information. */}
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Reading
            label={t.verdict.unitMake}
            best={result.verdict === 'make'}
            value={result.make.totalPerUnit}
            unit={symbol}
            decimals={2}
            testId="unit-make"
          />
          <Reading
            label={t.verdict.unitBuy}
            best={result.verdict === 'buy'}
            value={result.buy.totalPerUnit}
            unit={symbol}
            decimals={2}
            testId="unit-buy"
          />
          <Reading
            label={t.breakEven.heading}
            best={false}
            value={primary === null ? null : Math.ceil(primary.volume)}
            unit={t.units.perYear}
            decimals={0}
            testId="break-even-volume"
          />
        </dl>

        <p className="note t-body mt-3" data-testid="break-even-reading">
          {reading}
        </p>
      </div>
    </section>
  );
}

function Reading({
  label,
  value,
  unit,
  decimals,
  best,
  testId,
}: {
  label: string;
  value: number | null;
  unit: string;
  decimals: number;
  best: boolean;
  testId: string;
}) {
  return (
    <div className="kpi min-w-0">
      <dt className="t-micro text-[color:var(--text-2)]">{label}</dt>
      <dd className={`t-figure-lg mt-1 ${best ? 'num-total' : ''}`}>
        <Measure value={value} unit={unit} decimals={decimals} testId={testId} />
      </dd>
    </div>
  );
}
