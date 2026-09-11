'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { sampleInventoryProfile } from '@/lib/eoq';
import { formatQuantity } from '@sct/shared/lib/format';
import { clamp, linearScale, niceTicks } from '@sct/shared/lib/scale';

import { useSettings } from './Settings';

export interface InventoryProfileProps {
  /** Q: the quantity each replenishment brings in. */
  orderQuantity: number;
  /** Demand per period. */
  demandRate: number;
  /** The buffer the buyer has decided to carry; the floor of the sawtooth. */
  safetyStock: number;
  /** What one period is called. */
  periodLabel: string;
}

const PAD = { top: 18, right: 16, bottom: 30, left: 58 };
const CYCLES = 3;

/**
 * Inventory over time: the sawtooth.
 *
 * This is the diagram the subject is taught with, and the tool already holds
 * every quantity it needs. It earns its place by showing what the safety stock
 * costs rather than merely stating it: the ramp stops at the buffer instead of
 * at zero, so the flat floor is the stock paid for all year and, in an
 * ordinary cycle, never sold.
 */
export function InventoryProfile({
  orderQuantity,
  demandRate,
  safetyStock,
  periodLabel,
}: InventoryProfileProps) {
  const { locale, t } = useSettings();
  const wrapper = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(760);

  useEffect(() => {
    const element = wrapper.current;
    if (element === null) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry !== undefined) setWidth(Math.max(280, entry.contentRect.width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const height = Math.round(clamp(width * 0.34, 190, 280));

  const view = useMemo(() => {
    const profile = sampleInventoryProfile(orderQuantity, demandRate, safetyStock, CYCLES);

    const plotLeft = PAD.left;
    const plotRight = width - PAD.right;
    const plotTop = PAD.top;
    const plotBottom = height - PAD.bottom;

    const x = linearScale([0, profile.horizon], [plotLeft, plotRight]);
    const y = linearScale([0, profile.peak * 1.08], [plotBottom, plotTop]);

    return {
      profile,
      plotLeft,
      plotRight,
      plotTop,
      plotBottom,
      x,
      y,
      path: profile.points
        .map(
          (point, index) =>
            `${index === 0 ? 'M' : 'L'}${x(point.time).toFixed(2)} ${y(point.level).toFixed(2)}`,
        )
        .join(' '),
      timeTicks: niceTicks(0, profile.horizon, width < 520 ? 3 : 6),
      levelTicks: niceTicks(0, profile.peak * 1.08, 3),
    };
  }, [orderQuantity, demandRate, safetyStock, width, height]);

  const { profile } = view;

  /**
   * The last time ticks are dropped where the period name goes: one legible
   * label beats two on top of each other.
   */
  const PERIOD_LABEL_ROOM = 54;
  const timeTicks = view.timeTicks.filter(
    (tick) => view.x(tick) < view.plotRight - PERIOD_LABEL_ROOM,
  );

  const events = useMemo(
    () =>
      profile.cycles.flatMap((cycle, index) => {
        const rows = [
          { key: `start-${index}`, label: t.profile.eventStart, time: cycle.start, level: profile.peak },
        ];
        rows.push({
          key: `delivery-${index}`,
          label: t.profile.eventDelivery,
          time: cycle.end,
          level: profile.low,
        });
        return rows;
      }),
    [profile, t],
  );

  return (
    <section className="panel" aria-label={t.profile.title}>
      <div className="panel-head">
        <h2 className="t-label">{t.profile.title}</h2>
      </div>

      <div ref={wrapper} className="px-2 pb-1">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={t.profile.title}
          className="block"
        >
          {view.levelTicks.map((tick) => (
            <g key={`level-${tick}`}>
              <line
                x1={view.plotLeft}
                x2={view.plotRight}
                y1={view.y(tick)}
                y2={view.y(tick)}
                stroke="var(--grid)"
                strokeWidth={1}
              />
              <text
                x={view.plotLeft - 8}
                y={view.y(tick)}
                dy="0.32em"
                textAnchor="end"
                className="chart-tick"
              >
                {formatQuantity(tick, locale)}
              </text>
            </g>
          ))}

          {timeTicks.map((tick) => (
            <text
              key={`time-${tick}`}
              x={view.x(tick)}
              y={view.plotBottom + 14}
              textAnchor="middle"
              className="chart-tick"
            >
              {formatQuantity(tick, locale)}
            </text>
          ))}

          <text
            x={view.plotRight}
            y={view.plotBottom + 14}
            textAnchor="end"
            className="chart-label"
          >
            {periodLabel}
          </text>

          <line
            x1={view.plotLeft}
            x2={view.plotRight}
            y1={view.plotBottom}
            y2={view.plotBottom}
            stroke="var(--line-strong)"
            strokeWidth={1}
          />
          <line
            x1={view.plotLeft}
            x2={view.plotLeft}
            y1={view.plotTop}
            y2={view.plotBottom}
            stroke="var(--line-strong)"
            strokeWidth={1}
          />

          {/* Safety stock: the floor the cycle is designed never to break. */}
          {safetyStock > 0 ? (
            <g>
              <line
                x1={view.plotLeft}
                x2={view.plotRight}
                y1={view.y(safetyStock)}
                y2={view.y(safetyStock)}
                stroke="var(--threshold)"
                strokeWidth={1.5}
                strokeDasharray="2 3"
              />
              <text
                x={view.plotLeft + 4}
                y={view.y(safetyStock) - 4}
                className="chart-label"
                data-testid="profile-safety-stock-label"
              >
                {t.results.safetyStock}
              </text>
            </g>
          ) : null}


          <path
            d={view.path}
            fill="none"
            stroke="var(--trace)"
            strokeWidth={1.75}
            strokeLinejoin="round"
            data-testid="profile-trace"
          />

        </svg>
      </div>

      {/* Wrapped rather than hidden directly: a table box will not shrink
          below its min-content, so width:1px on the table itself is ignored
          and it keeps occupying layout even while clipped out of sight. */}
      <div className="sr-only">
        <table>
          <caption>{t.profile.tableCaption}</caption>
          <thead>
            <tr>
              <th scope="col">{t.profile.tableEvent}</th>
              <th scope="col">{t.profile.tableTime}</th>
              <th scope="col">{t.profile.tableLevel}</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.key}>
                <td>{event.label}</td>
                <td>
                  {formatQuantity(event.time, locale, 1)} {periodLabel}
                </td>
                <td>{formatQuantity(event.level, locale)}</td>
              </tr>
            ))}
          </tbody>
          </table>
      </div>
    </section>
  );
}
