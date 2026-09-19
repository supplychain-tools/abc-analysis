'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { fill } from '@/lib/i18n';
import {
  buyUnitCostOf,
  totalsAt,
  volumeAxisMax,
  type MakeOrBuyInput,
  type MakeOrBuyResult,
  type Verdict,
} from '@/lib/makeorbuy';
import {
  axisScale,
  currencySymbol,
  formatAxisTick,
  formatMoney,
  formatQuantity,
} from '@sct/shared/lib/format';
import { clamp, linearScale, niceTicks } from '@sct/shared/lib/scale';
import { Figure } from '@sct/shared/ui/Figure';

import { useSettings } from './Settings';

/**
 * Which option is cheaper at your volume, and where that changes.
 *
 * Two facts. A reader arriving from a link gives this a few seconds, and the
 * diagram earns its place only if it hands over both of them in that time, so
 * everything on it is either one of the two or is carrying them.
 *
 * The bands do the work. Before a line is traced or a figure read, the colour
 * behind the plot has already answered the question, and the reader's own
 * volume sits on one side of the change. The two cost lines stay, quieter than
 * the bands, because they are the evidence the bands are asserting and a
 * diagram that only asserted would be a graphic rather than a chart.
 *
 * What is deliberately not here, having been tried and removed:
 *
 *   A rule and a dot at the break-even. The break-even is where the bands
 *   change colour. Drawing a line there as well states it twice, and the
 *   second statement was the more eye-catching of the two.
 *
 *   The capacity line, its label and the wash beyond it. A limit is a warning,
 *   not a cost, and it is written in words above the chart where a warning
 *   belongs. On the diagram it was a third vertical thing competing with the
 *   two that matter.
 *
 *   A hover readout. It answers a question asked by someone already reading
 *   closely, and it was costing the glance to serve the study. The table
 *   behind the toggle answers it better and for everyone.
 */

/** Room for the badge above the plot, and the ticks and axis title below. */
const PAD = { top: 30, bottom: 44 };

const BADGE = { height: 21, padding: 10, gap: 6 };

/** Rough character widths, for boxes that must be sized before paint. */
const CHAR = { sans: 6.4, mono: 6.9 };

/**
 * How much room a band needs before it will name the option that wins in it.
 * Below the first it gives the bare name, below the second the colour carries
 * it alone. Dropping straight from the full phrase to nothing left narrow bands
 * unlabelled on a phone, which is where the naming is needed most.
 */
const BAND_LABEL_FULL = 84;
const BAND_LABEL_SHORT = 34;

interface Band {
  from: number;
  to: number;
  cheaper: Verdict;
}

export function BreakEvenChart({
  input,
  result,
}: {
  input: MakeOrBuyInput;
  result: MakeOrBuyResult;
}) {
  const { locale, currency, t } = useSettings();
  const symbol = currencySymbol(currency, locale);

  const wrapper = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(880);

  useEffect(() => {
    const element = wrapper.current;
    if (element === null) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry !== undefined) setAvailable(Math.max(280, entry.contentRect.width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  /**
   * The diagram stops widening before the panel does.
   *
   * Given the whole width of a desktop panel it drew at better than four to
   * one, and at that shape two cost lines are two near-horizontal scratches:
   * the slopes flatten, the gap between them closes, and the picture stops
   * being one. Held to a readable proportion it sits centred with air either
   * side, which costs nothing a reader wanted and buys back the vertical space
   * the lines need to separate.
   */
  const width = Math.min(available, 880);
  const narrow = width < 460;
  const height = Math.round(clamp(width * 0.52, 240, 360));

  const padLeft = narrow ? 44 : 62;
  const padRight = narrow ? 50 : 78;

  const geometry = useMemo(() => {
    const plotLeft = padLeft;
    const plotRight = Math.max(plotLeft + 40, width - padRight);
    const plotTop = PAD.top;
    const plotBottom = height - PAD.bottom;

    const xMax = volumeAxisMax(input, result.breakEven);

    // Two points: the buy line is straight, so its ends are all it needs.
    const buyFixed = totalsAt(input, 0).buy;
    const buyPoints = [
      { volume: 0, cost: buyFixed },
      { volume: xMax, cost: buyUnitCostOf(input.buy) * xMax + buyFixed },
    ];

    const makeStart = totalsAt(input, 0).make;
    const makeEnd = totalsAt(input, xMax).make;
    const yMax = Math.max(makeStart, makeEnd, ...buyPoints.map((p) => p.cost), 1) * 1.1;

    return {
      plotLeft,
      plotRight,
      plotTop,
      plotBottom,
      xMax,
      buyPoints,
      makeStart,
      makeEnd,
      x: linearScale([0, xMax], [plotLeft, plotRight]),
      y: linearScale([0, yMax], [plotBottom, plotTop]),
      volumeTicks: niceTicks(0, xMax, narrow ? 2 : 4),
      // Three rules at most. They exist so the lines have somewhere to sit, not
      // so a cost can be read off them: the figures are in the tables.
      costTicks: niceTicks(0, yMax, narrow ? 2 : 3),
    };
  }, [input, result.breakEven, width, height, padLeft, padRight, narrow]);

  const costScale = axisScale(geometry.costTicks[geometry.costTicks.length - 1] ?? 0, locale);
  const volumeScale = axisScale(geometry.volumeTicks[geometry.volumeTicks.length - 1] ?? 0, locale);

  /** The stretches of the axis on which one option is cheaper than the other. */
  const bands = useMemo<Band[]>(() => {
    const bounds = result.breakEven.crossings
      .map((crossing) => crossing.volume)
      .filter((volume) => volume > 0 && volume < geometry.xMax);
    const edges = [0, ...bounds, geometry.xMax];

    return edges.slice(0, -1).map((from, index) => {
      const to = edges[index + 1] as number;
      const at = totalsAt(input, (from + to) / 2);
      const gap = at.make - at.buy;
      return { from, to, cheaper: gap < 0 ? 'make' : gap > 0 ? 'buy' : 'indifferent' };
    });
  }, [result.breakEven.crossings, geometry.xMax, input]);

  /**
   * Every band change on the picture, and which of them get their volume
   * printed underneath.
   *
   * Every change is drawn, because each one is a place the answer turns over
   * and leaving one out would be drawing a different chart. Not every one is
   * numbered: quantity breaks put changes close together, and two figures
   * fighting for the same inch of axis is how a simple diagram stops being
   * one.
   *
   * So the figures are placed by how much they matter, which on this chart
   * means how near they are to the volume the reader actually typed: that is
   * the one that answers "how far am I from this changing?". The nearest is
   * placed first and keeps its room; anything that cannot fit beside what is
   * already there goes unnumbered, with the band edge still drawn. A figure
   * landing on the cost axis is dropped for the same reason.
   */
  const boundaries = useMemo(() => {
    const MIN_APART = 52;
    const all = result.breakEven.crossings
      .filter((crossing) => crossing.volume > 0 && crossing.volume < geometry.xMax)
      .map((crossing) => ({
        x: geometry.x(crossing.volume),
        volume: crossing.volume,
        figure: formatQuantity(Math.ceil(crossing.volume), locale, 0),
      }));

    const placed: number[] = [];
    for (const candidate of [...all].sort(
      (a, b) =>
        Math.abs(a.volume - input.annualVolume) - Math.abs(b.volume - input.annualVolume),
    )) {
      if (candidate.x < geometry.plotLeft + 28 || candidate.x > geometry.plotRight - 12) continue;
      if (placed.some((x) => Math.abs(x - candidate.x) < MIN_APART)) continue;
      placed.push(candidate.x);
    }

    return all.map((boundary) => ({ ...boundary, labelled: placed.includes(boundary.x) }));
  }, [result.breakEven.crossings, geometry, locale, input.annualVolume]);

  const showCurrent = input.annualVolume > 0 && input.annualVolume <= geometry.xMax;
  const currentX = geometry.x(clamp(input.annualVolume, 0, geometry.xMax));

  const badge = useMemo(() => {
    const label = narrow ? '' : t.chart.currentVolume;
    const figure = formatQuantity(input.annualVolume, locale, 0);
    const text =
      label.length * CHAR.sans + (label === '' ? 0 : BADGE.gap) + figure.length * CHAR.mono;
    const box = text + BADGE.padding * 2;
    return {
      label,
      figure,
      width: box,
      centre: clamp(currentX, box / 2 + 2, Math.max(box / 2 + 2, width - box / 2 - 2)),
    };
  }, [narrow, t, input.annualVolume, locale, currentX, width]);

  /**
   * Where the two names sit at the right edge. Each belongs at the height its
   * own line ends at, which is what makes them need no legend, but two lines
   * ending a few pixels apart would print their names on top of each other.
   */
  const names = useMemo(() => {
    // The height of the label's own box, not a gap between two boxes: below
    // this the two names touch. 13 cleared Archivo and does not clear Fira
    // Sans, whose box is taller at the same size, so it is measured from the
    // face the page actually loads.
    const minimum = 15;
    const makeY = geometry.y(geometry.makeEnd);
    const buyY = geometry.y(geometry.buyPoints[geometry.buyPoints.length - 1]?.cost ?? 0);
    if (Math.abs(makeY - buyY) >= minimum) return { makeY, buyY };
    const middle = (makeY + buyY) / 2;
    return makeY <= buyY
      ? { makeY: middle - minimum / 2, buyY: middle + minimum / 2 }
      : { makeY: middle + minimum / 2, buyY: middle - minimum / 2 };
  }, [geometry]);


  const summary = useMemo(() => {
    const current = formatQuantity(input.annualVolume, locale, 0);
    const primary = result.breakEven.primary;
    if (primary === null) {
      const dominant = result.breakEven.dominant ?? 'indifferent';
      return fill(t.chart.summaryNoCrossing, {
        dominant: t.chart[dominant === 'indifferent' ? 'make' : dominant],
        current,
        gap: `${formatMoney(result.savingPerYear, locale, 0)} ${symbol}`,
      });
    }
    const below = primary.cheaperAbove === 'make' ? 'buy' : 'make';
    return fill(t.chart.summaryCrossing, {
      crossing: formatQuantity(Math.ceil(primary.volume), locale, 0),
      below: t.chart[below],
      above: t.chart[primary.cheaperAbove === 'make' ? 'make' : 'buy'],
      current,
      verdict: t.chart[result.verdict === 'make' ? 'make' : 'buy'],
    });
  }, [input.annualVolume, locale, result, t, symbol]);

  const makePath = `M ${geometry.x(0)} ${geometry.y(geometry.makeStart)} L ${geometry.x(geometry.xMax)} ${geometry.y(geometry.makeEnd)}`;
  const buyPath = geometry.buyPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${geometry.x(p.volume)} ${geometry.y(p.cost)}`)
    .join(' ');

  return (
    <section aria-label={t.a11y.chartRegion} className="panel">
      <div className="panel-head">
        <h2 className="t-label">{t.sections.chart}</h2>
      </div>

      <div ref={wrapper} className="panel-body">
        <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={`${t.chart.title}. ${summary}`}
            className="mx-auto block"
            data-testid="chart"
          >
            {/* The answer, said in colour before anything is read. */}
            <g data-testid="regions">
              {bands.map((band) => (
                <rect
                  key={`${band.from}-${band.to}`}
                  x={geometry.x(band.from)}
                  y={geometry.plotTop}
                  width={Math.max(0, geometry.x(band.to) - geometry.x(band.from))}
                  height={geometry.plotBottom - geometry.plotTop}
                  fill={band.cheaper === 'make' ? 'var(--accent)' : 'var(--trace-b)'}
                  opacity={band.cheaper === 'indifferent' ? 0 : 0.12}
                  data-cheaper={band.cheaper}
                />
              ))}
            </g>

            <g>
              {geometry.costTicks.map((tick) => (
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
              {geometry.costTicks.map((tick) => (
                <text
                  key={`ct-${tick}`}
                  x={geometry.plotLeft - 7}
                  y={geometry.y(tick)}
                  dy="0.32em"
                  textAnchor="end"
                  className="chart-tick"
                >
                  {formatAxisTick(tick, locale, costScale)}
                </text>
              ))}
            </g>

            {/* The two costs, kept quieter than the bands they explain. */}
            <path
              d={makePath}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={1.75}
              data-testid="make-line"
            />
            <path
              d={buyPath}
              fill="none"
              stroke="var(--trace-b)"
              strokeWidth={1.75}
              strokeDasharray="9 5"
              strokeLinejoin="round"
              data-testid="buy-line"
            />

            {/* Which option wins in each band, named in the band's own colour.
                The largest type on the diagram, because it is the reading the
                diagram exists to hand over. */}
            <g>
              {bands.map((band) => {
                const from = geometry.x(band.from);
                const to = geometry.x(band.to);
                const room = to - from;
                if (room < BAND_LABEL_SHORT || band.cheaper === 'indifferent') return null;
                const name = t.chart[band.cheaper];
                return (
                  <text
                    key={`bl-${band.from}`}
                    x={(from + to) / 2}
                    y={geometry.plotTop + 15}
                    textAnchor="middle"
                    className="chart-band-label"
                    fill={band.cheaper === 'make' ? 'var(--accent)' : 'var(--trace-b)'}
                    data-testid="region-label"
                  >
                    {room >= BAND_LABEL_FULL ? `${name} ${t.chart.cheaperHere}` : name}
                  </text>
                );
              })}
            </g>

            {/* Where the reader is standing: the one vertical rule on the
                diagram, so nothing competes with it for that reading. */}
            {showCurrent ? (
              <g data-testid="current-volume-marker">
                <line
                  x1={currentX}
                  x2={currentX}
                  y1={geometry.plotTop}
                  y2={geometry.plotBottom}
                  stroke="var(--text)"
                  strokeWidth={1.5}
                />
                <rect
                  x={badge.centre - badge.width / 2}
                  y={geometry.plotTop - BADGE.height}
                  width={badge.width}
                  height={BADGE.height}
                  rx={4}
                  fill="var(--text)"
                />
                <text
                  x={badge.centre}
                  y={geometry.plotTop - BADGE.height / 2}
                  dy="0.36em"
                  textAnchor="middle"
                  data-testid="current-volume-label"
                >
                  {badge.label === '' ? null : (
                    <tspan className="chart-badge-label">{badge.label}</tspan>
                  )}
                  <tspan className="chart-badge-figure" dx={badge.label === '' ? 0 : BADGE.gap}>
                    {badge.figure}
                  </tspan>
                </text>
              </g>
            ) : null}

            {/* The edge of the bands, drawn.

                The colour change was meant to carry this on its own, and it
                does not: two tints this pale are nearly the same tint, and
                under deuteranopia the teal and the blue are the same colour
                exactly. Hue identifies which band is which, with the label to
                confirm it; the division itself has to survive without hue, so
                it is a hairline. One per boundary, and nothing hangs off it. */}
            {boundaries.map((boundary, index) => (
              <line
                key={`edge-${index}`}
                data-testid="crossing-marker"
                x1={boundary.x}
                x2={boundary.x}
                y1={geometry.plotTop}
                y2={geometry.plotBottom}
                stroke="var(--line-strong)"
                strokeWidth={1}
              />
            ))}

            <line
              x1={geometry.plotLeft}
              x2={geometry.plotRight}
              y1={geometry.plotBottom}
              y2={geometry.plotBottom}
              stroke="var(--line-strong)"
              strokeWidth={1}
            />

            {/* The volume each change happens at, under the edge it happens
                on. No dot and no second rule: the band edge above it is
                already the line, and this is the number that edge is worth. */}
            {boundaries
              .filter((boundary) => boundary.labelled)
              .map((boundary, index) => (
                <text
                  key={`b-${index}`}
                  x={boundary.x}
                  y={geometry.plotBottom + 16}
                  textAnchor="middle"
                  className="chart-boundary-figure"
                  data-testid="crossing-label"
                >
                  {boundary.figure}
                </text>
              ))}

            {/* The ruler. Dropped wherever it would sit on a boundary figure,
                which is the more useful of the two: one is a round number the
                axis happens to pass, the other is the answer. */}
            {geometry.volumeTicks.map((tick) => {
              const x = geometry.x(tick);
              // The origin is already labelled by the cost axis sitting on it,
              // and two noughts in one corner is one nought too many.
              if (tick === 0) return null;
              if (
                boundaries.some(
                  (boundary) => boundary.labelled && Math.abs(boundary.x - x) < 40,
                )
              ) {
                return null;
              }
              // The badge above the plot already names the reader's own volume.
              // A round tick landing on the same place printed it a second time,
              // which on a phone, where the badge is the bare figure, read as
              // the same number twice for no reason.
              if (showCurrent && Math.abs(currentX - x) < 40) return null;
              return (
                <text
                  key={`vt-${tick}`}
                  x={x}
                  y={geometry.plotBottom + 16}
                  textAnchor="middle"
                  className="chart-tick"
                >
                  {formatAxisTick(tick, locale, volumeScale)}
                </text>
              );
            })}

            <g>
              <text
                x={geometry.plotRight + 8}
                y={names.makeY}
                dy="0.32em"
                className="chart-series-label"
                fill="var(--accent)"
                data-testid="make-label"
              >
                {t.chart.make}
              </text>
              <text
                x={geometry.plotRight + 8}
                y={names.buyY}
                dy="0.32em"
                className="chart-series-label"
                fill="var(--trace-b)"
                data-testid="buy-label"
              >
                {t.chart.buy}
              </text>
            </g>

            {/* One line naming both axes, so neither needs a title of its own
                and nothing has to be read sideways. */}
            <text
              x={geometry.plotLeft}
              y={height - 6}
              textAnchor="start"
              className="chart-axis-title"
            >
              {`${t.chart.axisVolume} (${t.units.perYear})`}
            </text>
            <text x={2} y={geometry.plotTop - 9} textAnchor="start" className="chart-axis-title">
              {`${t.chart.axisCost} (${symbol})`}
            </text>
        </svg>
      </div>
    </section>
  );
}

