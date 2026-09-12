/**
 * Inventory ordering models: economic order quantity, the cost-penalty table
 * and the stock profile.
 *
 * Everything here takes plain numbers and returns plain numbers or typed
 * objects. No React, no Intl, no formatting, no user-facing text. The only
 * strings are structural discriminants on result objects. Full precision is
 * kept throughout; rounding belongs to the presentation layer.
 *
 * Preconditions (D > 0, S > 0, H > 0, and so on) are enforced by
 * lib/validate.ts before these functions are called. Called with degenerate
 * input they return the natural IEEE result rather than throwing.
 */


/* ------------------------------------------------------------------ */
/* Classic EOQ                                                         */
/* ------------------------------------------------------------------ */

export interface EoqInput {
  /** D, annual demand in units per year. */
  annualDemand: number;
  /** S, fixed cost of placing one order. */
  orderCost: number;
  /** H, annual holding cost per unit held. */
  holdingCostPerUnit: number;
  /** Working days per year, used only to convert orders/year into days. */
  daysPerYear: number;
  /** C, unit purchase cost. Null when the user has not supplied it. */
  unitCost: number | null;
  /** SS, safety stock carried on top of cycle stock. */
  safetyStock: number;
}

export interface EoqResult {
  /** The order quantity this result was evaluated at. */
  quantity: number;
  /** The unconstrained optimum, for comparison against `quantity`. */
  optimalQuantity: number;
  ordersPerYear: number;
  daysBetweenOrders: number;
  orderingCost: number;
  /** (Q / 2) * H, the part of holding cost that depends on Q. */
  cycleHoldingCost: number;
  /** SS * H, constant with respect to Q. */
  safetyStockHoldingCost: number;
  /** cycleHoldingCost + safetyStockHoldingCost. */
  holdingCost: number;
  /** Ordering + cycle holding: the Q-dependent cost the EOQ minimises. */
  relevantCostCore: number;
  /** relevantCostCore + safety stock holding: what the buyer actually carries. */
  relevantCost: number;
  averageInventory: number;
  purchaseCost: number | null;
  totalCost: number | null;
  /** sqrt(2 * D * S * H): the closed form of relevantCostCore at Q*. */
  relevantCostClosedForm: number;
  /** True when ordering cost equals cycle holding cost at this Q. */
  costsBalanced: boolean;
}

/** H = i * C, when holding cost is expressed as a rate on unit value. */
export function holdingCostFromRate(rate: number, unitCost: number): number {
  return rate * unitCost;
}

/** Q* = sqrt(2 * D * S / H). */
export function economicOrderQuantity(
  annualDemand: number,
  orderCost: number,
  holdingCostPerUnit: number,
): number {
  return Math.sqrt((2 * annualDemand * orderCost) / holdingCostPerUnit);
}

/** Annual ordering cost (D / Q) * S. */
export function annualOrderingCost(
  annualDemand: number,
  orderCost: number,
  quantity: number,
): number {
  return (annualDemand / quantity) * orderCost;
}

/** Annual cycle holding cost (Q / 2) * H. */
export function annualCycleHoldingCost(
  quantity: number,
  holdingCostPerUnit: number,
): number {
  return (quantity / 2) * holdingCostPerUnit;
}

/**
 * Total relevant cost at an arbitrary Q, excluding safety stock.
 * TRC(Q) = (D / Q) * S + (Q / 2) * H
 */
export function totalRelevantCost(
  annualDemand: number,
  orderCost: number,
  holdingCostPerUnit: number,
  quantity: number,
): number {
  return (
    annualOrderingCost(annualDemand, orderCost, quantity) +
    annualCycleHoldingCost(quantity, holdingCostPerUnit)
  );
}

/** TRC at the optimum, in closed form: sqrt(2 * D * S * H). */
export function totalRelevantCostAtOptimum(
  annualDemand: number,
  orderCost: number,
  holdingCostPerUnit: number,
): number {
  return Math.sqrt(2 * annualDemand * orderCost * holdingCostPerUnit);
}

const BALANCE_TOLERANCE = 1e-9;

/** Evaluate the full cost picture at any order quantity. */
export function evaluateAtQuantity(input: EoqInput, quantity: number): EoqResult {
  const { annualDemand, orderCost, holdingCostPerUnit, daysPerYear, unitCost, safetyStock } =
    input;

  const optimalQuantity = economicOrderQuantity(annualDemand, orderCost, holdingCostPerUnit);
  const ordersPerYear = annualDemand / quantity;
  const ordering = annualOrderingCost(annualDemand, orderCost, quantity);
  const cycleHolding = annualCycleHoldingCost(quantity, holdingCostPerUnit);
  const safetyHolding = safetyStock * holdingCostPerUnit;
  const relevantCostCore = ordering + cycleHolding;
  const purchaseCost = unitCost === null ? null : annualDemand * unitCost;
  const relevantCost = relevantCostCore + safetyHolding;

  const scale = Math.max(Math.abs(ordering), Math.abs(cycleHolding), 1);

  return {
    quantity,
    optimalQuantity,
    ordersPerYear,
    daysBetweenOrders: daysPerYear / ordersPerYear,
    orderingCost: ordering,
    cycleHoldingCost: cycleHolding,
    safetyStockHoldingCost: safetyHolding,
    holdingCost: cycleHolding + safetyHolding,
    relevantCostCore,
    relevantCost,
    averageInventory: quantity / 2 + safetyStock,
    purchaseCost,
    totalCost: purchaseCost === null ? null : relevantCost + purchaseCost,
    relevantCostClosedForm: totalRelevantCostAtOptimum(
      annualDemand,
      orderCost,
      holdingCostPerUnit,
    ),
    costsBalanced: Math.abs(ordering - cycleHolding) / scale < BALANCE_TOLERANCE,
  };
}

/** Evaluate at the unconstrained optimum Q*. */
export function solveEoq(input: EoqInput): EoqResult {
  return evaluateAtQuantity(
    input,
    economicOrderQuantity(input.annualDemand, input.orderCost, input.holdingCostPerUnit),
  );
}

/* ------------------------------------------------------------------ */
/* Cost penalty                                                         */
/* ------------------------------------------------------------------ */

/** Q / Q* ratios for the cost-penalty table. */
export const COST_PENALTY_RATIOS = [
  0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0,
] as const;

export interface CostPenaltyRow {
  ratio: number;
  quantity: number;
  relevantCost: number;
  /** TRC(Q) / TRC(Q*), which equals 0.5 * (ratio + 1 / ratio). */
  costRatio: number;
  penaltyPercent: number;
  isOptimum: boolean;
}

/**
 * The EOQ cost curve is flat near its minimum:
 * TRC(Q) / TRC(Q*) = 0.5 * (Q / Q* + Q* / Q)
 * Ordering 20% away from the optimum costs about 2% more.
 */
export function costPenaltyRatio(ratio: number): number {
  return 0.5 * (ratio + 1 / ratio);
}

export function costPenaltyTable(
  annualDemand: number,
  orderCost: number,
  holdingCostPerUnit: number,
  ratios: readonly number[] = COST_PENALTY_RATIOS,
): CostPenaltyRow[] {
  const optimum = economicOrderQuantity(annualDemand, orderCost, holdingCostPerUnit);
  const optimalCost = totalRelevantCostAtOptimum(annualDemand, orderCost, holdingCostPerUnit);

  return ratios.map((ratio) => {
    const costRatio = costPenaltyRatio(ratio);
    return {
      ratio,
      quantity: optimum * ratio,
      relevantCost: optimalCost * costRatio,
      costRatio,
      penaltyPercent: (costRatio - 1) * 100,
      isOptimum: ratio === 1,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Curve sampling for the chart                                         */
/* ------------------------------------------------------------------ */

export interface CurvePoint {
  quantity: number;
  ordering: number;
  holding: number;
  total: number;
}

/** Sample the three classic cost curves across a quantity range. */
export function sampleCostCurve(
  annualDemand: number,
  orderCost: number,
  holdingCostPerUnit: number,
  from: number,
  to: number,
  steps: number,
): CurvePoint[] {
  const points: CurvePoint[] = [];
  const span = to - from;
  for (let index = 0; index <= steps; index += 1) {
    const quantity = from + (span * index) / steps;
    if (quantity <= 0) continue;
    const ordering = annualOrderingCost(annualDemand, orderCost, quantity);
    const holding = annualCycleHoldingCost(quantity, holdingCostPerUnit);
    points.push({ quantity, ordering, holding, total: ordering + holding });
  }
  return points;
}

/* ------------------------------------------------------------------ */
/* Inventory over time                                                  */
/* ------------------------------------------------------------------ */

export interface InventoryCycle {
  /** When this cycle begins, in periods, with stock at its peak. */
  start: number;
  /** When stock reaches its low point and the replenishment lands. */
  end: number;
}

export interface InventoryProfile {
  /** Q + SS: the level just after a delivery. */
  peak: number;
  /** SS: the level just before one. */
  low: number;
  /** Q / demand rate: how long one cycle lasts, in periods. */
  cycleLength: number;
  cycles: InventoryCycle[];
  /** Vertices of the sawtooth, in order. A delivery is two points at one time. */
  points: Array<{ time: number; level: number }>;
  horizon: number;
}

/**
 * The sawtooth: stock falling at the demand rate from Q + SS down to the
 * safety stock, where a delivery restores it. It is the diagram every
 * inventory course draws, and it is built from quantities the rest of this
 * file already computes.
 *
 * What it shows is the role of the buffer: the ramp stops at SS rather than at
 * zero, so the height of the flat floor is the stock that is paid for all year
 * and, in the ordinary cycle, never sold.
 */
export function sampleInventoryProfile(
  orderQuantity: number,
  demandRate: number,
  safetyStock: number,
  cycleCount: number,
): InventoryProfile {
  const peak = orderQuantity + safetyStock;
  const cycleLength = orderQuantity / demandRate;

  const cycles: InventoryCycle[] = [];
  const points: Array<{ time: number; level: number }> = [];

  for (let index = 0; index < cycleCount; index += 1) {
    const start = index * cycleLength;
    const end = start + cycleLength;
    cycles.push({ start, end });

    // Two points at the same time where a delivery lands: the sawtooth is
    // discontinuous there, and drawing it as a ramp would be a lie about how
    // replenishment works.
    points.push({ time: start, level: peak });
    points.push({ time: end, level: safetyStock });
  }

  return {
    peak,
    low: safetyStock,
    cycleLength,
    cycles,
    points,
    horizon: cycleCount * cycleLength,
  };
}
