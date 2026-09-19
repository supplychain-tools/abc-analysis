/**
 * Make or buy: the annual cost of producing a component in-house against the
 * annual cost of buying it, and the volumes at which the cheaper of the two
 * changes hands.
 *
 * Everything here takes plain numbers and returns plain numbers or typed
 * objects. No React, no Intl, no formatting, no user-facing text. Full
 * precision is kept throughout; rounding belongs to the presentation layer.
 *
 * One decision is encoded in this file that a reader will not find in a
 * textbook formula, and it is the point of the tool:
 *
 *   Yield grosses up every variable cost, not only materials. Scrap is
 *   discovered at the end of the line, so the labour and the overhead on a
 *   unit that fails were spent as surely as its materials were. Cost per good
 *   unit is therefore the whole variable cost per unit started divided by the
 *   yield.
 *
 * The model says nothing about lead time, supplier dependency, or the value of
 * keeping a capability in-house. It is a cost comparison, and those are not
 * costs. The interface says so; the arithmetic cannot.
 */

/* ================================================================== */
/* Inputs                                                              */
/* ================================================================== */


export interface MakeInput {
  materialsPerUnit: number;
  laborHoursPerUnit: number;
  laborRatePerHour: number;
  variableOverheadPerUnit: number;
  /**
   * Good units out of units started, as a fraction in (0, 1]. A yield of 1 is
   * a process that scraps nothing; 0 would be one that produces nothing, and
   * dividing by it is why the input layer refuses it.
   */
  yieldRate: number;
  /** Per year, and gone if the part is bought instead. Part of the decision. */
  fixedCosts: number;
  /** Written off straight line over the horizon the comparison is run for. */
  toolingInvestment: number;
  /**
   * Contribution per year given up elsewhere by using the capacity for this
   * part. A real cost of making, and invisible on any invoice.
   */
  opportunityCostPerYear: number;
}

export interface BuyInput {
  /** Per unit, in the supplier's currency, before any quantity break. */
  supplierPrice: number;
  /** Per unit, in the local currency. */
  freightPerUnit: number;
  /** A fraction of the purchase price, so 0.025 is two and a half percent. */
  dutyRate: number;
  /** Per unit, in the local currency. */
  inspectionPerUnit: number;
  /** Paid once, on switching to this supplier. Spread over the horizon. */
  switchingCost: number;
}

export interface MakeOrBuyInput {
  annualVolume: number;
  /** Years the one-off costs are spread over. At least 1. */
  horizonYears: number;
  make: MakeInput;
  buy: BuyInput;
}

/* ================================================================== */
/* Outputs                                                             */
/* ================================================================== */

/**
 * One row of a breakdown. `id` is a stable key: the dictionaries look up their
 * wording by it, so a renamed label can never silently stop matching the
 * figure beside it.
 */
export type MakeLineId =
  | 'materials'
  | 'labor'
  | 'variableOverhead'
  | 'scrapLoss'
  | 'fixedCosts'
  | 'tooling'
  | 'opportunityCost';

export type BuyLineId = 'purchasePrice' | 'freight' | 'duty' | 'inspection' | 'switching';

export interface CostLine<Id extends string = string> {
  id: Id;
  /** Per good unit. Null only when the volume is zero and the cost is fixed. */
  perUnit: number | null;
  /** Per year. */
  annual: number;
}

export interface SideBreakdown<Id extends string = string> {
  lines: CostLine<Id>[];
  /** Cost of one more good unit. The slope of this side's cost line. */
  variablePerUnit: number;
  /** Cost per year that does not move with volume. The intercept. */
  fixedAnnual: number;
  totalAnnual: number;
  /** Total divided by volume. Null at zero volume. */
  totalPerUnit: number | null;
}

export type Verdict = 'make' | 'buy' | 'indifferent';

/** A volume at which the cheaper option changes. */
export interface Crossing {
  volume: number;
  /** Which side is cheaper immediately above this volume. */
  cheaperAbove: Verdict;
}

export interface BreakEvenSummary {
  /** Every crossing above zero volume, in ascending order. */
  crossings: Crossing[];
  /**
   * The crossing nearest the volume being costed: the one that answers "how
   * far am I from the answer changing?". Null when the two never cross.
   */
  primary: Crossing | null;
  /**
   * Which side is cheaper at every volume, when there is no crossing at all.
   * Null whenever there is one.
   */
  dominant: Verdict | null;
}

/**
 * Something true about the figures that the arithmetic cannot refuse but a
 * reader has to see. Distinct from a field-level validation error, which is
 * about what was typed; these are about what it means.
 */


export interface MakeOrBuyResult {
  make: SideBreakdown<MakeLineId>;
  buy: SideBreakdown<BuyLineId>;
  verdict: Verdict;
  /** How much the verdict saves over the other side, per year. Never negative. */
  savingPerYear: number;
  /** The same saving spread over the volume. Null at zero volume. */
  savingPerUnit: number | null;
  /** Signed, make minus buy, for anywhere the direction is wanted. */
  difference: number;
  breakEven: BreakEvenSummary;
  /** The purchase price at which both sides cost the same. A negotiation target. */
  flipPrice: number | null;
  /** True when there is no volume to cost, and every per-unit figure is null. */
  isEmpty: boolean;
}

/* ================================================================== */
/* Arithmetic helpers                                                  */
/* ================================================================== */

/**
 * A figure that is missing, unparseable or infinite counts as zero. None of
 * those describe a cost, and letting one through would put NaN into every
 * result downstream rather than into the one field that caused it.
 */
function usable(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

/** A yield outside (0, 1] cannot be divided by, so it falls back to a whole one. */
function usableYield(value: number): number {
  return Number.isFinite(value) && value > 0 && value <= 1 ? value : 1;
}

/** A span of years that something is spread over is at least one. */
function usableYears(value: number): number {
  return Number.isFinite(value) && value >= 1 ? value : 1;
}

/**
 * Landed cost of one bought unit, in the local currency.
 *
 * Duty is charged on the purchase price, which is how customs assesses it, and
 * freight and inspection are added on top.
 */
export function buyUnitCostOf(buy: BuyInput): number {
  const priceLocal = usable(buy.supplierPrice);
  return (
    priceLocal +
    priceLocal * usable(buy.dutyRate) +
    usable(buy.freightPerUnit) +
    usable(buy.inspectionPerUnit)
  );
}

/** Cost of one more good unit made in-house. */
export function makeUnitCostOf(make: MakeInput): number {
  const perUnitStarted =
    usable(make.materialsPerUnit) +
    usable(make.laborHoursPerUnit) * usable(make.laborRatePerHour) +
    usable(make.variableOverheadPerUnit);
  return perUnitStarted / usableYield(make.yieldRate);
}

/** Annual cost of making that does not move with volume. */
export function makeFixedOf(make: MakeInput, horizonYears: number): number {
  return (
    usable(make.fixedCosts) +
    usable(make.toolingInvestment) / usableYears(horizonYears) +
    usable(make.opportunityCostPerYear)
  );
}

/** Annual cost of buying that does not move with volume. */
export function buyFixedOf(buy: BuyInput, horizonYears: number): number {
  return usable(buy.switchingCost) / usableYears(horizonYears);
}

/* ================================================================== */
/* Breakdowns                                                          */
/* ================================================================== */

function line<Id extends string>(id: Id, perUnit: number | null, annual: number): CostLine<Id> {
  return { id, perUnit, annual };
}

/** Annual cost of a fixed figure divided back out over the volume. */
function perUnitOf(annual: number, volume: number): number | null {
  return volume > 0 ? annual / volume : null;
}

export function makeBreakdown(input: MakeOrBuyInput): SideBreakdown<MakeLineId> {
  const make = input.make;
  const volume = Math.max(0, usable(input.annualVolume));
  const yieldRate = usableYield(make.yieldRate);

  const materials = usable(make.materialsPerUnit);
  const labor = usable(make.laborHoursPerUnit) * usable(make.laborRatePerHour);
  const overhead = usable(make.variableOverheadPerUnit);
  const perUnitStarted = materials + labor + overhead;

  // Shown as its own line rather than folded into the three above it. The
  // grossing-up is the part a reader gets wrong, and a number they can see is
  // a number they can check: at 95% yield on 37 of variable cost it is 1.95,
  // which is the answer to "what is scrap costing me per unit".
  const scrapLoss = perUnitStarted / yieldRate - perUnitStarted;

  const toolingAnnual = usable(make.toolingInvestment) / usableYears(input.horizonYears);
  const fixedCosts = usable(make.fixedCosts);
  const opportunity = usable(make.opportunityCostPerYear);

  const variablePerUnit = perUnitStarted / yieldRate;
  const fixedAnnual = fixedCosts + toolingAnnual + opportunity;
  const totalAnnual = variablePerUnit * volume + fixedAnnual;

  return {
    lines: [
      line('materials', materials, materials * volume),
      line('labor', labor, labor * volume),
      line('variableOverhead', overhead, overhead * volume),
      line('scrapLoss', scrapLoss, scrapLoss * volume),
      line('fixedCosts', perUnitOf(fixedCosts, volume), fixedCosts),
      line('tooling', perUnitOf(toolingAnnual, volume), toolingAnnual),
      line('opportunityCost', perUnitOf(opportunity, volume), opportunity),
    ],
    variablePerUnit,
    fixedAnnual,
    totalAnnual,
    totalPerUnit: perUnitOf(totalAnnual, volume),
  };
}

export function buyBreakdown(input: MakeOrBuyInput): SideBreakdown<BuyLineId> {
  const buy = input.buy;
  const volume = Math.max(0, usable(input.annualVolume));

  const priceLocal = usable(buy.supplierPrice);
  const duty = priceLocal * usable(buy.dutyRate);
  const freight = usable(buy.freightPerUnit);
  const inspection = usable(buy.inspectionPerUnit);
  const switchingAnnual = buyFixedOf(buy, input.horizonYears);

  const variablePerUnit = priceLocal + duty + freight + inspection;
  const totalAnnual = variablePerUnit * volume + switchingAnnual;

  return {
    lines: [
      line('purchasePrice', priceLocal, priceLocal * volume),
      line('freight', freight, freight * volume),
      line('duty', duty, duty * volume),
      line('inspection', inspection, inspection * volume),
      line('switching', perUnitOf(switchingAnnual, volume), switchingAnnual),
    ],
    variablePerUnit,
    fixedAnnual: switchingAnnual,
    totalAnnual,
    totalPerUnit: perUnitOf(totalAnnual, volume),
  };
}

/* ================================================================== */
/* Chart geometry                                                      */
/* ================================================================== */

/** Both total costs at one volume, with any quantity break applied. */
export interface CostPair {
  make: number;
  buy: number;
}

export function totalsAt(input: MakeOrBuyInput, volume: number): CostPair {
  const at = Math.max(0, usable(volume));
  return {
    make: makeUnitCostOf(input.make) * at + makeFixedOf(input.make, input.horizonYears),
    buy: buyUnitCostOf(input.buy) * at + buyFixedOf(input.buy, input.horizonYears),
  };
}

/* ================================================================== */
/* Where the answer changes                                            */
/* ================================================================== */
/**
 * The volume at which the two lines meet.
 *
 * Both sides are straight, so a crossing is a root and is found exactly rather
 * than searched for. There is at most one: two straight lines meet once unless
 * they are parallel, in which case one side is cheaper at every volume and the
 * caller reports that instead.
 */
function findCrossings(input: MakeOrBuyInput): Crossing[] {
  const slope = makeUnitCostOf(input.make) - buyUnitCostOf(input.buy);
  if (slope === 0) return [];

  const intercept =
    makeFixedOf(input.make, input.horizonYears) - buyFixedOf(input.buy, input.horizonYears);
  const root = -intercept / slope;
  if (!(root > 0) || !Number.isFinite(root)) return [];

  return [{ volume: root, cheaperAbove: slope < 0 ? 'make' : 'buy' }];
}

function breakEvenOf(input: MakeOrBuyInput, difference: number): BreakEvenSummary {
  const crossings = findCrossings(input);
  const volume = Math.max(0, usable(input.annualVolume));

  if (crossings.length === 0) {
    // No crossing anywhere, so one side is cheaper at every volume. Which one
    // is read off the comparison already made, and off the variable costs when
    // there is no volume to compare at.
    const makeVariable = makeUnitCostOf(input.make);
    const buyVariable = buyUnitCostOf(input.buy);
    const slope = makeVariable - buyVariable;
    const dominant: Verdict =
      difference !== 0
        ? difference < 0
          ? 'make'
          : 'buy'
        : slope < 0
          ? 'make'
          : slope > 0
            ? 'buy'
            : 'indifferent';

    return { crossings, primary: null, dominant };
  }

  // The nearest crossing, because the question a reader is asking is how far
  // their own volume sits from the answer changing, not which crossing the
  // arithmetic happened to find first.
  const primary = crossings.reduce((nearest, candidate) =>
    Math.abs(candidate.volume - volume) < Math.abs(nearest.volume - volume) ? candidate : nearest,
  );

  return { crossings, primary, dominant: null };
}

/* ================================================================== */
/* The comparison                                                      */
/* ================================================================== */


/**
 * The supplier price at which buying would cost exactly what making costs.
 *
 * Not the annual gap divided by the volume and added to the price. Duty is a
 * percentage *of* the price, so a dirham moved onto the price drags the duty up
 * with it and the two sides do not meet where that shortcut says they will. The
 * price is solved for instead:
 *
 *   p · (1 + duty) · Q + (freight + inspection) · Q + switching = make
 */
function flipPriceOf(input: MakeOrBuyInput, makeAnnual: number, volume: number): number | null {
  if (!(volume > 0)) return null;

  const perUnitCoefficient = 1 + usable(input.buy.dutyRate);
  if (!(perUnitCoefficient > 0)) return null;

  const otherPerUnit = usable(input.buy.freightPerUnit) + usable(input.buy.inspectionPerUnit);
  const switching = buyFixedOf(input.buy, input.horizonYears);

  return (makeAnnual - switching - otherPerUnit * volume) / (perUnitCoefficient * volume);
}

/**
 * Compare the two sides at one volume. Pure: the same input always gives the
 * same output, and nothing outside this file is consulted.
 */
export function compare(input: MakeOrBuyInput): MakeOrBuyResult {
  const volume = Math.max(0, usable(input.annualVolume));
  const make = makeBreakdown(input);
  const buy = buyBreakdown(input);

  const difference = make.totalAnnual - buy.totalAnnual;
  const verdict: Verdict = difference < 0 ? 'make' : difference > 0 ? 'buy' : 'indifferent';
  const savingPerYear = Math.abs(difference);
  const isEmpty = !(volume > 0);

  return {
    make,
    buy,
    verdict,
    savingPerYear,
    savingPerUnit: isEmpty ? null : savingPerYear / volume,
    difference,
    breakEven: breakEvenOf(input, difference),
    flipPrice: flipPriceOf(input, make.totalAnnual, volume),
    isEmpty,
  };
}

/**
 * The upper end of the volume axis: twice the larger of the volume being costed
 * and the furthest crossing, so whichever sits further right still has room
 * beyond it, and the payoff of the diagram — seeing which side of a crossing
 * your own volume lands on — has both of them on screen at once.
 */
export function volumeAxisMax(input: MakeOrBuyInput, breakEven: BreakEvenSummary): number {
  const volume = Math.max(0, usable(input.annualVolume));
  const furthest = breakEven.crossings.reduce((high, crossing) => Math.max(high, crossing.volume), 0);
  const largest = Math.max(volume, furthest);
  return largest > 0 ? largest * 2 : 1;
}

