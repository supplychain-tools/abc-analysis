import { describe, expect, it } from 'vitest';

import {
  costPenaltyRatio,
  costPenaltyTable,
  economicOrderQuantity,
  evaluateAtQuantity,
  holdingCostFromRate,
  sampleInventoryProfile,
  solveEoq,
  totalRelevantCost,
  totalRelevantCostAtOptimum,
  type EoqInput,
} from './eoq';

/** The tool's stated inputs, with the optional ones switched off. */
function input(overrides: Partial<EoqInput> = {}): EoqInput {
  return {
    annualDemand: 10_000,
    orderCost: 50,
    holdingCostPerUnit: 2,
    daysPerYear: 365,
    unitCost: null,
    safetyStock: 0,
    ...overrides,
  };
}

/* ================================================================== */
/* Verification case 1: D=10000, S=50, H=2                            */
/* ================================================================== */

describe('verification case 1 — D=10000, S=50, H=2', () => {
  const result = solveEoq(input());

  it('gives Q* = 707.11', () => {
    expect(result.quantity).toBeCloseTo(707.11, 2);
    expect(result.quantity).toBeCloseTo(Math.sqrt(500_000), 10);
  });

  it('gives N = 14.14 orders per year', () => {
    expect(result.ordersPerYear).toBeCloseTo(14.14, 2);
  });

  it('gives TRC = 1414.21', () => {
    expect(result.relevantCost).toBeCloseTo(1414.21, 2);
  });

  it('splits that cost evenly: Cord = Chold = 707.11', () => {
    expect(result.orderingCost).toBeCloseTo(707.11, 2);
    expect(result.cycleHoldingCost).toBeCloseTo(707.11, 2);
  });

  it('reports the balance between ordering and holding cost', () => {
    expect(result.costsBalanced).toBe(true);
  });

  it('spaces orders 25.8 days apart on a 365-day year', () => {
    expect(result.daysBetweenOrders).toBeCloseTo(365 / 14.142135, 3);
  });

  it('rescales the cycle when the working year is 250 days', () => {
    const shorter = solveEoq(input({ daysPerYear: 250 }));
    expect(shorter.quantity).toBeCloseTo(result.quantity, 10);
    expect(shorter.daysBetweenOrders).toBeCloseTo(250 / 14.142135, 3);
  });
});

/* ================================================================== */
/* Verification case 2: D=1200, S=25, i=0.20, C=5                     */
/* ================================================================== */

describe('verification case 2 — D=1200, S=25, i=0.20, C=5', () => {
  const holdingCostPerUnit = holdingCostFromRate(0.2, 5);
  const result = solveEoq(
    input({ annualDemand: 1200, orderCost: 25, holdingCostPerUnit, unitCost: 5 }),
  );

  it('derives H = 1.00 from the rate and the unit cost', () => {
    expect(holdingCostPerUnit).toBeCloseTo(1, 12);
  });

  it('gives Q* = 244.95', () => {
    expect(result.quantity).toBeCloseTo(244.95, 2);
  });

  it('gives TRC = 244.95', () => {
    expect(result.relevantCost).toBeCloseTo(244.95, 2);
  });

  it('adds the purchase cost when C is known', () => {
    expect(result.purchaseCost).toBeCloseTo(6000, 6);
    expect(result.totalCost).toBeCloseTo(6000 + 244.9489743, 6);
  });
});

/* ================================================================== */
/* The two properties that must hold at the optimum                   */
/* ================================================================== */

describe('properties at Q*', () => {
  const cases: Array<[number, number, number]> = [
    [10_000, 50, 2],
    [1200, 25, 1],
    [37, 3.5, 0.4],
    [980_000, 1250, 17.5],
  ];

  it.each(cases)('ordering cost equals holding cost (D=%i, S=%i, H=%i)', (d, s, h) => {
    const result = solveEoq(input({ annualDemand: d, orderCost: s, holdingCostPerUnit: h }));
    expect(result.orderingCost).toBeCloseTo(result.cycleHoldingCost, 8);
    expect(result.costsBalanced).toBe(true);
  });

  it.each(cases)('TRC equals sqrt(2 D S H) (D=%i, S=%i, H=%i)', (d, s, h) => {
    const result = solveEoq(input({ annualDemand: d, orderCost: s, holdingCostPerUnit: h }));
    expect(result.relevantCostCore).toBeCloseTo(Math.sqrt(2 * d * s * h), 8);
    expect(result.relevantCostCore).toBeCloseTo(result.relevantCostClosedForm, 8);
  });

  it.each(cases)('Q* is the minimum of TRC (D=%i, S=%i, H=%i)', (d, s, h) => {
    const optimum = economicOrderQuantity(d, s, h);
    const best = totalRelevantCost(d, s, h, optimum);
    for (const factor of [0.5, 0.9, 0.99, 1.01, 1.1, 2]) {
      expect(totalRelevantCost(d, s, h, optimum * factor)).toBeGreaterThan(best);
    }
  });

  it('is flagged as unbalanced away from the optimum', () => {
    expect(evaluateAtQuantity(input(), 500).costsBalanced).toBe(false);
  });
});

/* ================================================================== */
/* Safety stock feeds back into the totals                            */
/* ================================================================== */

describe('safety stock in the cost totals', () => {
  const withSafetyStock = solveEoq(input({ safetyStock: 40 }));

  it('carries Q/2 + SS on average', () => {
    expect(withSafetyStock.averageInventory).toBeCloseTo(707.1067812 / 2 + 40, 6);
  });

  it('charges holding cost on the safety stock', () => {
    expect(withSafetyStock.safetyStockHoldingCost).toBeCloseTo(80, 8);
    expect(withSafetyStock.holdingCost).toBeCloseTo(707.1067812 + 80, 6);
  });

  it('leaves the Q-dependent cost untouched, so Q* does not move', () => {
    expect(withSafetyStock.relevantCostCore).toBeCloseTo(1414.2135624, 6);
    expect(withSafetyStock.relevantCost).toBeCloseTo(1414.2135624 + 80, 6);
    expect(withSafetyStock.quantity).toBeCloseTo(solveEoq(input()).quantity, 10);
  });
});

/* ================================================================== */
/* Cost penalty                                                       */
/* ================================================================== */

describe('cost penalty of ordering the wrong quantity', () => {
  it('matches 0.5 * (r + 1/r)', () => {
    expect(costPenaltyRatio(1)).toBeCloseTo(1, 12);
    expect(costPenaltyRatio(0.8)).toBeCloseTo(1.025, 12);
    expect(costPenaltyRatio(1.25)).toBeCloseTo(1.025, 12);
    expect(costPenaltyRatio(0.5)).toBeCloseTo(1.25, 12);
    expect(costPenaltyRatio(2)).toBeCloseTo(1.25, 12);
  });

  it('costs about 2.5% to order 20% below the optimum', () => {
    const rows = costPenaltyTable(10_000, 50, 2);
    const row = rows.find((candidate) => candidate.ratio === 0.8);
    expect(row?.quantity).toBeCloseTo(565.685, 3);
    expect(row?.relevantCost).toBeCloseTo(1449.569, 3);
    expect(row?.penaltyPercent).toBeCloseTo(2.5, 6);
  });

  it('costs nothing at the optimum, and flags that row', () => {
    const rows = costPenaltyTable(10_000, 50, 2);
    const row = rows.find((candidate) => candidate.isOptimum);
    expect(row?.penaltyPercent).toBeCloseTo(0, 12);
    expect(row?.relevantCost).toBeCloseTo(1414.2135624, 6);
  });

  it('agrees with a direct TRC evaluation at every ratio', () => {
    for (const row of costPenaltyTable(10_000, 50, 2)) {
      expect(row.relevantCost).toBeCloseTo(totalRelevantCost(10_000, 50, 2, row.quantity), 6);
    }
  });
});

/* ================================================================== */
/* Inventory over time                                                */
/* ================================================================== */

describe('the inventory sawtooth', () => {
  // 700 units at 50 a day, on a 40-unit buffer.
  const profile = sampleInventoryProfile(700, 50, 40, 3);

  it('peaks at Q above the safety stock and troughs on it', () => {
    expect(profile.peak).toBe(740);
    expect(profile.low).toBe(40);
    expect(profile.peak - profile.low).toBe(700);
  });

  it('runs one cycle per Q of demand', () => {
    expect(profile.cycleLength).toBeCloseTo(14, 10);
    expect(profile.cycles).toHaveLength(3);
    expect(profile.horizon).toBeCloseTo(42, 10);
  });

  it('draws a delivery as a jump, not as a ramp', () => {
    // Two vertices share the time at which stock is restored.
    expect(profile.points[1].time).toBeCloseTo(profile.points[2].time, 10);
    expect(profile.points[1].level).toBe(40);
    expect(profile.points[2].level).toBe(740);
  });

  it('carries no safety stock when none is asked for', () => {
    const bare = sampleInventoryProfile(707.11, 27.4, 0, 2);
    expect(bare.low).toBe(0);
    expect(bare.peak).toBeCloseTo(707.11, 8);
  });

  it('holds the buffer as a floor the ramp never goes below', () => {
    // The point of the diagram: every trough is the safety stock, so the
    // flat floor is stock paid for all year and never sold.
    for (const point of profile.points) {
      expect(point.level).toBeGreaterThanOrEqual(profile.low);
    }
    expect(Math.min(...profile.points.map((point) => point.level))).toBe(40);
  });
});
