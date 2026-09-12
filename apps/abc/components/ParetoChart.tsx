'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import {
  CLASS_A_THRESHOLD,
  CLASS_B_THRESHOLD,
  type AbcAnalysis,
  type AbcClass,
  type ClassifiedItem,
} from '@/lib/classify';
import { currencySymbol, formatMoney, formatNumber } from '@sct/shared/lib/format';
import { clamp, linearScale, niceStep, niceTicks } from '@sct/shared/lib/scale';

import { Figure } from '@sct/shared/ui/Figure';
import { rankOf } from './rank';
import { useSettings } from './Settings';

export interface ParetoChartProps {
  analysis: AbcAnalysis;
}

const PAD = { top: 16, right: 40, bottom: 26, left: 62 };

/** The ramp token each band paints its bars with. */
const BAR_FILL: Record<AbcClass, string> = {
  A: 'var(--rank-1)',
  B: 'var(--rank-2)',
  C: 'var(--rank-3)',
};

/**
 * The Pareto chart: one bar per item by descending annual value, and the
 * running cumulative share drawn over them.
 *
 * The two together are the argument. The bars alone show a steep drop and no
 * more; the curve alone shows a rise to 100% and no more. Read against each
 * other they say how few of the bars account for how much of the money, which
 * is the only thing this page exists to say.
 *
 * Hand-built, like the diagrams in the sibling tool, so it inherits the type
 * scale, the tick styling and the palette instead of fighting a library for
 * them.
 */
export function ParetoChart({ analysis }: ParetoChartProps) {
  const { locale, currency, t } = useSettings();
  const symbol = currencySymbol(currency, locale);

  const wrapper = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(880);
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    const element = wrapper.current;
    if (element === null) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry !== undefined) setWidth(Math.max(280, entry.contentRect.width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const height = Math.round(clamp(width * 0.4, 240, 380));
  const items = analysis.items;

  const geometry = useMemo(() => {
    const plotLeft = PAD.left;
    const plotRight = width - PAD.right;
    const plotTop = PAD.top;
    const plotBottom = height - PAD.bottom;
    const plotWidth = Math.max(0, plotRight - plotLeft);

    const maxValue = Math.max(...items.map((item) => item.annualValue), 0);
    // The tallest bar is the top of the scale rather than a round number above
    // it: with a distribution this skewed, headroom is wasted on nothing.
    const y = linearScale([0, maxValue || 1], [plotBottom, plotTop]);
    // The cumulative curve has its own axis, pinned to 0 and 100 so the two
    // marked lines always land in the same place whatever the data does.
    const yCumulative = linearScale([0, 100], [plotBottom, plotTop]);

    const slot = items.length === 0 ? plotWidth : plotWidth / items.length;
    const barWidth = Math.max(1, Math.min(slot - 1.5, slot * 0.82));
    const centre = (index: number): number => plotLeft + slot * (index + 0.5);

    const cumulativePath = items
      .map(
        (item, index) =>
          `${index === 0 ? 'M' : 'L'}${centre(index).toFixed(2)} ${yCumulative(item.cumulativeShare).toFixed(2)}`,
      )
      .join(' ');

    return {
      plotLeft,
      plotRight,
      plotTop,
      plotBottom,
      slot,
      barWidth,
      centre,
      y,
      yCumulative,
      cumulativePath,
      maxValue,
      valueTicks: niceTicks(0, maxValue || 1, 4),
    };
  }, [items, width, height]);

  /**
   * Rank ticks along the foot: the first, the last, and round numbers between.
   *
   * Counting off in even strides from the first rank does not work, because
   * the stride almost never divides the list: thirty items in strides of four
   * ends 25, 29, 30, with the last two labels touching. So the round numbers
   * are laid down first and the two ends are added to them, and an interior
   * tick that lands within half a stride of either end is dropped rather than
   * left to crowd it. Thirty items read 1, 5, 10, 15, 20, 25, 30.
   */
  const rankTicks = useMemo(() => {
    const count = items.length;
    if (count === 0) return [];
    if (count <= 2) return items.map((_, index) => index);

    const wanted = width < 520 ? 4 : 8;
    const step = Math.max(1, niceStep(count / wanted));

    const ranks = new Set<number>([1, count]);
    for (let rank = step; rank < count; rank += step) {
      if (rank - 1 >= step / 2 && count - rank >= step / 2) ranks.add(rank);
    }

    return [...ranks].sort((a, b) => a - b).map((rank) => rank - 1);
  }, [items.length, width]);

  const active: ClassifiedItem | null = hovered === null ? null : (items[hovered] ?? null);

  return (
    <section aria-label={t.a11y.chartRegion} className="panel">
      <div className="panel-head">
        <h2 className="t-label">{t.sections.chart}</h2>
        <p className="note t-micro text-[color:var(--text-2)]">{t.chart.hint}</p>
      </div>

      <div ref={wrapper} className="px-2">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={t.chart.title}
          className="block"
          onPointerLeave={() => setHovered(null)}
        >
          {/* Grid and the money axis, kept faint: a reading aid, not a pattern. */}
          <g>
            {geometry.valueTicks.map((tick) => (
              <line
                key={`g-${tick}`}
                x1={geometry.plotLeft}
                x2={geometry.plotRight}
                y1={geometry.y(tick)}
                y2={geometry.y(tick)}
                stroke="var(--grid)"
                strokeWidth={1}
              />
            ))}
            {geometry.valueTicks.map((tick) => (
              <text
                key={`t-${tick}`}
                x={geometry.plotLeft - 8}
                y={geometry.y(tick)}
                dy="0.32em"
                textAnchor="end"
                className="chart-tick"
              >
                {formatMoney(tick, locale, 0)}
              </text>
            ))}
          </g>

          {/* The bars, in the band's ink. Five dark then a long pale tail is
              the shape of the finding, before a single figure is read. */}
          <g>
            {items.map((item, index) => {
              const top = geometry.y(item.annualValue);
              return (
                <rect
                  key={item.id}
                  x={geometry.centre(index) - geometry.barWidth / 2}
                  y={top}
                  width={geometry.barWidth}
                  height={Math.max(0, geometry.plotBottom - top)}
                  fill={BAR_FILL[item.abcClass ?? 'C']}
                  data-testid="pareto-bar"
                  data-class={item.abcClass ?? ''}
                />
              );
            })}
          </g>

          {/* The two marked lines: where A ends and where B ends.

              These were red, from a time when the family had no colour for a
              threshold and red was the only marked ink available. It has one
              now, and red has narrowed to meaning a fault — it is the colour a
              rejected entry is flagged in. A class boundary is not a fault, it
              is the landmark the whole chart is read against, so it takes the
              amber the palette reserves for exactly that. */}
          {[CLASS_A_THRESHOLD, CLASS_B_THRESHOLD].map((threshold) => (
            <g key={`th-${threshold}`}>
              <line
                x1={geometry.plotLeft}
                x2={geometry.plotRight}
                y1={geometry.yCumulative(threshold)}
                y2={geometry.yCumulative(threshold)}
                stroke="var(--threshold)"
                strokeWidth={1}
                strokeDasharray="4 3"
                data-testid="threshold-line"
              />
              <text
                x={geometry.plotRight + 5}
                y={geometry.yCumulative(threshold)}
                dy="0.32em"
                textAnchor="start"
                className="chart-threshold"
              >
                {threshold}
              </text>
            </g>
          ))}

          {/* 100 anchors the right-hand scale the two marked lines are read
              against, so they are read as a height and not as a decoration. */}
          <text
            x={geometry.plotRight + 5}
            y={geometry.yCumulative(100)}
            dy="0.32em"
            textAnchor="start"
            className="chart-tick"
          >
            100
          </text>

          {/* The cumulative curve, over the bars it is drawn from. */}
          <path
            d={geometry.cumulativePath}
            fill="none"
            stroke="var(--trace)"
            strokeWidth={1.75}
            strokeLinejoin="round"
            data-testid="cumulative-trace"
          />
          {items.map((item, index) => (
            <circle
              key={`p-${item.id}`}
              cx={geometry.centre(index)}
              cy={geometry.yCumulative(item.cumulativeShare)}
              r={hovered === index ? 3.5 : 1.6}
              fill="var(--trace)"
            />
          ))}

          {/* Axes */}
          <line
            x1={geometry.plotLeft}
            x2={geometry.plotRight}
            y1={geometry.plotBottom}
            y2={geometry.plotBottom}
            stroke="var(--line)"
            strokeWidth={1}
          />
          <line
            x1={geometry.plotLeft}
            x2={geometry.plotLeft}
            y1={geometry.plotTop}
            y2={geometry.plotBottom}
            stroke="var(--line)"
            strokeWidth={1}
          />

          {rankTicks.map((index) => (
            <text
              key={`r-${index}`}
              x={geometry.centre(index)}
              y={geometry.plotBottom + 14}
              textAnchor="middle"
              className="chart-tick"
            >
              {index + 1}
            </text>
          ))}

          {/* One transparent target per bar, last so it sits above everything.
              A slot rather than the bar itself: a short bar is two pixels tall
              and impossible to point at. */}
          <g>
            {items.map((item, index) => (
              <rect
                key={`hit-${item.id}`}
                x={geometry.centre(index) - geometry.slot / 2}
                y={geometry.plotTop}
                width={geometry.slot}
                height={Math.max(0, geometry.plotBottom - geometry.plotTop)}
                fill="transparent"
                onPointerEnter={() => setHovered(index)}
              />
            ))}
          </g>
        </svg>
      </div>

      {/* The readout. Width is reserved on the figures so pointing along the
          bars does not shuffle the row sideways. */}
      <div
        aria-live="polite"
        className="chart-readout flex flex-wrap items-baseline gap-x-6 gap-y-1 border-t border-[color:var(--line)] px-4 py-2"
      >
        <span className="t-micro flex min-w-0 items-baseline gap-1.5 text-[color:var(--text-2)]">
          {t.chart.readoutItem}
          <span className="t-body truncate text-[color:var(--text)]" data-testid="readout-item">
            {active === null ? '' : active.name}
          </span>
        </span>
        <span className="t-micro flex items-baseline gap-1.5 text-[color:var(--text-2)]">
          {t.chart.readoutValue}
          <Figure
            value={active?.annualValue ?? null}
            decimals={2}
            width={12}
            className="text-[color:var(--text)]"
            testId="readout-value"
          />
          <span className="unit">{symbol}</span>
        </span>
        <span className="t-micro flex items-baseline gap-1.5 text-[color:var(--text-2)]">
          {t.chart.readoutCumulative}
          <Figure
            value={active?.cumulativeShare ?? null}
            decimals={1}
            width={6}
            className="text-[color:var(--text)]"
            testId="readout-cumulative"
          />
          <span className="unit">%</span>
        </span>
        {active === null || active.abcClass === null ? null : (
          <span className="rank-chip" data-rank={rankOf(active.abcClass)}>
            {active.abcClass}
          </span>
        )}
      </div>

      {/* Wrapped rather than hidden directly: a table box will not shrink below
          its min-content, so width:1px on the table itself is ignored and it
          keeps occupying layout while clipped out of sight. */}
      <div className="sr-only">
        <table>
          <caption>{t.chart.tableCaption}</caption>
          <thead>
            <tr>
              <th scope="col">{t.chart.axisRank}</th>
              <th scope="col">{t.table.columns.name}</th>
              <th scope="col">{t.table.columns.annualValue}</th>
              <th scope="col">{t.table.columns.cumulativeShare}</th>
              <th scope="col">{t.table.columns.abcClass}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={`sr-${item.id}`}>
                <td>{index + 1}</td>
                <td>{item.name}</td>
                <td>{formatMoney(item.annualValue, locale)}</td>
                <td>{formatNumber(item.cumulativeShare, locale, { decimals: 1 })}</td>
                <td>{item.abcClass ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
