'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  annualCycleHoldingCost,
  annualOrderingCost,
  sampleCostCurve,
  type EoqInput,
  type EoqResult,
} from '@/lib/eoq';
import { currencySymbol, formatMoney, formatQuantity } from '@sct/shared/lib/format';
import { clamp, invertLinear, linearScale, niceTicks } from '@sct/shared/lib/scale';

import { Figure } from '@sct/shared/ui/Figure';
import { useSettings } from './Settings';

export interface CostCurveProps {
  input: EoqInput;
  eoq: EoqResult;
}

const PAD = { top: 18, right: 16, bottom: 32, left: 62 };
const SAMPLES = 260;

interface Readout {
  quantity: number;
  ordering: number | null;
  holding: number | null;
  total: number;
  penaltyPercent: number;
}

/**
 * Annual cost against order quantity, drawn by hand.
 *
 * Three traces: ordering cost falling as D·S/Q, holding cost rising as
 * Q·H/2, and their sum. They cross at exactly Q*, and that crossing is the
 * whole argument of the model, so it is marked rather than left for the reader
 * to find.
 */
export function CostCurve({ input, eoq }: CostCurveProps) {
  const { locale, currency, t } = useSettings();
  const symbol = currencySymbol(currency, locale);

  const wrapper = useRef<HTMLDivElement>(null);
  const plotRef = useRef<SVGRectElement>(null);
  const [width, setWidth] = useState(760);
  const [cursor, setCursor] = useState<number | null>(null);

  useEffect(() => {
    const element = wrapper.current;
    if (element === null) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry !== undefined) setWidth(Math.max(280, entry.contentRect.width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const height = Math.round(clamp(width * 0.44, 230, 360));

  const geometry = useMemo(() => {
    const { annualDemand, orderCost, holdingCostPerUnit } = input;
    const optimum = eoq.optimalQuantity;

    const plotLeft = PAD.left;
    const plotRight = width - PAD.right;
    const plotTop = PAD.top;
    const plotBottom = height - PAD.bottom;

    const xMin = Math.max(optimum / 4, 1e-6);
    const xMax = optimum * 2.5;

    const classic = sampleCostCurve(
      annualDemand,
      orderCost,
      holdingCostPerUnit,
      xMin,
      xMax,
      SAMPLES,
    );

    // Measured from zero, because the reader is comparing two costs that both
    // start there.
    const yMin = 0;
    const yMax = Math.max(...classic.map((point) => point.total)) * 1.04;

    const x = linearScale([xMin, xMax], [plotLeft, plotRight]);
    const y = linearScale([yMin, yMax], [plotBottom, plotTop]);
    const xFromPixel = invertLinear([xMin, xMax], [plotLeft, plotRight]);

    const path = (points: Array<{ quantity: number; value: number }>): string =>
      points
        .map(
          (point, index) =>
            `${index === 0 ? 'M' : 'L'}${x(point.quantity).toFixed(2)} ${y(point.value).toFixed(2)}`,
        )
        .join(' ');

    return {
      plotLeft,
      plotRight,
      plotTop,
      plotBottom,
      xMin,
      xMax,
      yMin,
      yMax,
      x,
      y,
      xFromPixel,
      classic,
      orderingPath: path(classic.map((p) => ({ quantity: p.quantity, value: p.ordering }))),
      holdingPath: path(classic.map((p) => ({ quantity: p.quantity, value: p.holding }))),
      totalPath: path(classic.map((p) => ({ quantity: p.quantity, value: p.total }))),
      xTicks: niceTicks(xMin, xMax, width < 520 ? 3 : 6),
      yTicks: niceTicks(yMin, yMax, 4),
    };
  }, [input, eoq.optimalQuantity, width, height]);

  /** Cost at any quantity. */
  const readAt = useCallback(
    (quantity: number): Readout => {
      const { annualDemand, orderCost, holdingCostPerUnit } = input;

      const ordering = annualOrderingCost(annualDemand, orderCost, quantity);
      const holding = annualCycleHoldingCost(quantity, holdingCostPerUnit);
      const total = ordering + holding;
      return {
        quantity,
        ordering,
        holding,
        total,
        penaltyPercent: (total / eoq.relevantCostCore - 1) * 100,
      };
    },
    [input, eoq.relevantCostCore],
  );

  const activeQuantity = cursor ?? eoq.optimalQuantity;
  const readout = readAt(activeQuantity);

  const moveTo = useCallback(
    (clientX: number) => {
      const rect = plotRef.current?.getBoundingClientRect();
      if (rect === undefined) return;
      const ratio = (clientX - rect.left) / rect.width;
      const pixel = geometry.plotLeft + ratio * (geometry.plotRight - geometry.plotLeft);
      setCursor(clamp(geometry.xFromPixel(pixel), geometry.xMin, geometry.xMax));
    },
    [geometry],
  );

  const nudge = useCallback(
    (fraction: number) => {
      const span = geometry.xMax - geometry.xMin;
      setCursor((current) =>
        clamp((current ?? eoq.optimalQuantity) + span * fraction, geometry.xMin, geometry.xMax),
      );
    },
    [geometry, eoq.optimalQuantity],
  );

  function handleKeyDown(event: React.KeyboardEvent) {
    const keys: Record<string, () => void> = {
      ArrowLeft: () => nudge(-0.01),
      ArrowRight: () => nudge(0.01),
      ArrowDown: () => nudge(-0.01),
      ArrowUp: () => nudge(0.01),
      PageDown: () => nudge(-0.1),
      PageUp: () => nudge(0.1),
      Home: () => setCursor(geometry.xMin),
      End: () => setCursor(geometry.xMax),
      Escape: () => setCursor(null),
    };
    const action = keys[event.key];
    if (action === undefined) return;
    event.preventDefault();
    action();
  }

  const optimumX = geometry.x(eoq.optimalQuantity);

  const cursorX = geometry.x(activeQuantity);
  const inRange =
    eoq.optimalQuantity >= geometry.xMin && eoq.optimalQuantity <= geometry.xMax;

  /** A dozen rows of the same data, for anyone not reading the picture. */
  const tableRows = useMemo(() => {
    const rows: Readout[] = [];
    for (let index = 0; index <= 11; index += 1) {
      rows.push(
        readAt(geometry.xMin + ((geometry.xMax - geometry.xMin) * index) / 11),
      );
    }
    return rows;
  }, [geometry.xMin, geometry.xMax, readAt]);

  return (
    <section aria-label={t.a11y.chartRegion} className="panel">
      <div className="panel-head">
        <h2 className="t-label">{t.sections.chart}</h2>
        <p className="note t-micro text-[color:var(--text-2)]">
          {t.chart.readoutHint}
        </p>
      </div>

      <div ref={wrapper} className="px-2">
        <div
          role="slider"
          tabIndex={0}
          aria-label={t.chart.title}
          aria-valuemin={Math.round(geometry.xMin)}
          aria-valuemax={Math.round(geometry.xMax)}
          aria-valuenow={Math.round(activeQuantity)}
          aria-valuetext={`${formatQuantity(readout.quantity, locale)} ${t.units.units}, ${formatMoney(readout.total, locale)} ${symbol}`}
          className="block cursor-crosshair touch-none outline-offset-2"
          onKeyDown={handleKeyDown}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            moveTo(event.clientX);
          }}
          onPointerMove={(event) => {
            if (event.pointerType === 'mouse' || event.buttons > 0) moveTo(event.clientX);
          }}
          onPointerLeave={() => setCursor(null)}
        >
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={t.chart.title}
            className="block"
          >
            {/* Grid, kept faint: it is a reading aid, not a pattern. */}
            <g>
              {geometry.yTicks.map((tick) => (
                <line
                  key={`gy-${tick}`}
                  x1={geometry.plotLeft}
                  x2={geometry.plotRight}
                  y1={geometry.y(tick)}
                  y2={geometry.y(tick)}
                  stroke="var(--grid)"
                  strokeWidth={1}
                />
              ))}
              {geometry.yTicks.map((tick) => (
                <text
                  key={`ly-${tick}`}
                  x={geometry.plotLeft - 8}
                  y={geometry.y(tick)}
                  dy="0.32em"
                  textAnchor="end"
                  className="chart-tick"
                >
                  {formatMoney(tick, locale, 0)}
                </text>
              ))}
              {geometry.xTicks.map((tick) => (
                <text
                  key={`lx-${tick}`}
                  x={geometry.x(tick)}
                  y={geometry.plotBottom + 15}
                  textAnchor="middle"
                  className="chart-tick"
                >
                  {formatQuantity(tick, locale)}
                </text>
              ))}
            </g>

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

            <g fill="none">
                <path
                  d={geometry.orderingPath}
                  stroke="var(--trace-2)"
                  strokeWidth={1}
                  strokeDasharray="5 3"
                  data-testid="trace-ordering"
                />
                <path
                  d={geometry.holdingPath}
                  stroke="var(--trace-2)"
                  strokeWidth={1}
                  strokeDasharray="1 3"
                  strokeLinecap="round"
                  data-testid="trace-holding"
                />
                <path
                  d={geometry.totalPath}
                  stroke="var(--trace)"
                  strokeWidth={1.75}
                  data-testid="trace-total"
                />
            </g>

            {/* Red is the ink of the diagrams: it marks the point that matters
                on a chart, here Q* and its projection down to the axis. What it
                never does is set a figure, which would read as an error. */}
            {inRange ? (
              <g>
                <line
                  x1={optimumX}
                  x2={optimumX}
                  y1={geometry.y(eoq.relevantCostCore)}
                  y2={geometry.plotBottom}
                  stroke="var(--mark)"
                  strokeWidth={2}
                />
                <circle
                  cx={optimumX}
                  cy={geometry.y(eoq.relevantCostCore / 2)}
                  r={3.5}
                  fill="var(--mark)"
                  stroke="var(--text)"
                  strokeWidth={1}
                />
                <circle
                  cx={optimumX}
                  cy={geometry.y(eoq.relevantCostCore)}
                  r={4}
                  fill="var(--mark)"
                  stroke="var(--text)"
                  strokeWidth={1}
                />
                {/* Above the curve at its minimum, not on the axis row: the
                    scale keeps every tick, and the mark sits in the empty
                    space the U-shape leaves over its own low point. */}
                <text
                  x={optimumX}
                  y={geometry.y(eoq.relevantCostCore) - 14}
                  textAnchor="middle"
                  className="chart-mark"
                >
                  {t.chart.optimum}
                </text>
              </g>
            ) : null}

            {/* Inline end labels, the way a plotted chart is labelled. */}
            <g className="chart-label">
                <text x={geometry.plotRight - 4} y={geometry.y(geometry.classic[geometry.classic.length - 1].total) - 7} textAnchor="end">
                  {t.chart.total}
                </text>
                <text x={geometry.plotRight - 4} y={geometry.y(geometry.classic[geometry.classic.length - 1].holding) + 13} textAnchor="end">
                  {t.chart.holding}
                </text>
                <text x={geometry.plotRight - 4} y={geometry.y(geometry.classic[geometry.classic.length - 1].ordering) - 7} textAnchor="end">
                  {t.chart.ordering}
                </text>
            </g>

            {/* Crosshair */}
            {cursor === null ? null : (
              <g>
                <line
                  x1={cursorX}
                  x2={cursorX}
                  y1={geometry.plotTop}
                  y2={geometry.plotBottom}
                  stroke="var(--text)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                <circle
                  cx={cursorX}
                  cy={geometry.y(readout.total)}
                  r={3.5}
                  fill="var(--surface)"
                  stroke="var(--text)"
                  strokeWidth={1.5}
                />
              </g>
            )}

            {/* The pointer target, last so it sits above everything. */}
            <rect
              ref={plotRef}
              x={geometry.plotLeft}
              y={geometry.plotTop}
              width={Math.max(0, geometry.plotRight - geometry.plotLeft)}
              height={Math.max(0, geometry.plotBottom - geometry.plotTop)}
              fill="transparent"
            />
          </svg>
        </div>
      </div>

      {/* Readout. Width is reserved so the figures do not shift the row. */}
      <div
        aria-live="polite"
        className="chart-readout flex flex-wrap items-baseline gap-x-6 gap-y-1 border-t border-[color:var(--line)] px-4 py-2"
      >
        <span className="t-micro flex items-baseline gap-1.5 text-[color:var(--text-2)]">
          {t.chart.readoutQuantity}
          <Figure
            value={readout.quantity}
            decimals={0}
            width={7}
            className="text-[color:var(--text)]"
            testId="readout-quantity"
          />
          <span className="unit">{t.units.units}</span>
        </span>
        <span className="t-micro flex items-baseline gap-1.5 text-[color:var(--text-2)]">
          {t.chart.readoutCost}
          <Figure
            value={readout.total}
            decimals={2}
            width={11}
            className="text-[color:var(--text)]"
            testId="readout-cost"
          />
          <span className="unit">{symbol}</span>
        </span>
        <span className="t-micro flex items-baseline gap-1.5 text-[color:var(--text-2)]">
          {t.chart.readoutPenalty}
          <Figure
            value={readout.penaltyPercent}
            decimals={2}
            signed
            width={7}
            className="text-[color:var(--text)]"
            testId="readout-penalty"
          />
          <span className="unit">%</span>
        </span>
      </div>

      {/* Wrapped rather than hidden directly: a table box will not shrink
          below its min-content, so width:1px on the table itself is ignored
          and it keeps occupying layout even while clipped out of sight. */}
      <div className="sr-only">
        <table>
          <caption>{t.chart.tableCaption}</caption>
          <thead>
            <tr>
              <th scope="col">{t.chart.tableQuantity}</th>
              <th scope="col">{t.chart.tableOrdering}</th>
              <th scope="col">{t.chart.tableHolding}</th>
              <th scope="col">{t.chart.tableTotal}</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row) => (
              <tr key={row.quantity}>
                <td>{formatQuantity(row.quantity, locale)}</td>
                <td>{formatMoney(row.ordering ?? 0, locale)}</td>
                <td>{formatMoney(row.holding ?? 0, locale)}</td>
                <td>{formatMoney(row.total, locale)}</td>
              </tr>
            ))}
          </tbody>
          </table>
      </div>
    </section>
  );
}
