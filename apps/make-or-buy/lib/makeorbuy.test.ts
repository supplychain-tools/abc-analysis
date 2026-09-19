import { describe, expect, it } from 'vitest';

import {
  buyUnitCostOf,
  compare,
  makeUnitCostOf,
  totalsAt,
  volumeAxisMax,
  type BuyInput,
  type MakeInput,
  type MakeOrBuyInput,
} from './makeorbuy';

/**
 * Every expected figure in this file was worked out by hand, on paper, from the
 * inputs above it. The arithmetic is written into the comments so that a reader
 * can check the check. Nothing here was produced by running the function and
 * pasting what came back, which would only prove the code agrees with itself.
 */

/* ------------------------------------------------------------------ */
/* Builders                                                            */
/* ------------------------------------------------------------------ */

const NO_MAKE: MakeInput = {
  materialsPerUnit: 0,
  laborHoursPerUnit: 0,
  laborRatePerHour: 0,
  variableOverheadPerUnit: 0,
  yieldRate: 1,
  fixedCosts: 0,
  toolingInvestment: 0,
  opportunityCostPerYear: 0,
};

const NO_BUY: BuyInput = {
  supplierPrice: 0,
  freightPerUnit: 0,
  dutyRate: 0,
  inspectionPerUnit: 0,
  switchingCost: 0,
};

function input(
  annualVolume: number,
  make: Partial<MakeInput>,
  buy: Partial<BuyInput>,
  horizonYears = 1,
): MakeOrBuyInput {
  return {
    annualVolume,
    horizonYears,
    make: { ...NO_MAKE, ...make },
    buy: { ...NO_BUY, ...buy },
  };
}

/* ------------------------------------------------------------------ */
/* The reference case                                                  */
/* ------------------------------------------------------------------ */

/**
 * Volume 10,000/yr, horizon 5 years.
 *
 * MAKE  materials 12, labour 0.5 h x 40 = 20, variable overhead 5,
 *       yield 95%, fixed 60,000,
 *       tooling 50,000 over the 5-year horizon.
 * BUY   price 40, freight 2, duty 2.5%, inspection 0.5.
 */
const REFERENCE = input(
  10_000,
  {
    materialsPerUnit: 12,
    laborHoursPerUnit: 0.5,
    laborRatePerHour: 40,
    variableOverheadPerUnit: 5,
    yieldRate: 0.95,
    fixedCosts: 60_000,
    toolingInvestment: 50_000,
  },
  {
    supplierPrice: 40,
    freightPerUnit: 2,
    dutyRate: 0.025,
    inspectionPerUnit: 0.5,
  },
  5,
);

describe('the reference case', () => {
  const result = compare(REFERENCE);

  it('grosses every variable cost up by the yield, not just materials', () => {
    // 12 + (0.5 x 40) + 5 = 37 per unit started
    // 37 / 0.95 = 38.947368421052631...  per good unit
    expect(result.make.variablePerUnit).toBeCloseTo(38.947368421052631, 9);
    expect(makeUnitCostOf(REFERENCE.make)).toBeCloseTo(37 / 0.95, 12);
  });

  it('reports the scrap loss as its own line', () => {
    // 37 / 0.95 - 37 = 1.947368421052631...
    const scrap = result.make.lines.find((each) => each.id === 'scrapLoss');
    expect(scrap?.perUnit).toBeCloseTo(1.947368421052631, 9);
    // 1.947368... x 10,000 = 19,473.68...
    expect(scrap?.annual).toBeCloseTo(19_473.684210526315, 6);
  });

  it('writes the tooling off straight line over its useful life', () => {
    // 50,000 / 5 = 10,000 a year
    const tooling = result.make.lines.find((each) => each.id === 'tooling');
    expect(tooling?.annual).toBe(10_000);
    // Spread back over 10,000 units: 10,000 / 10,000 = 1.00 per unit
    expect(tooling?.perUnit).toBe(1);
  });

  it('adds the fixed costs and the tooling to the variable total', () => {
    // Variable 38.947368... x 10,000       = 389,473.6842105263
    // Fixed                                =  60,000
    // Tooling 50,000 / 5                   =  10,000
    //                                        -----------------
    //                                        459,473.6842105263
    expect(result.make.totalAnnual).toBeCloseTo(459_473.6842105263, 6);
    expect(result.make.fixedAnnual).toBe(70_000);
    const fixed = result.make.lines.find((each) => each.id === 'fixedCosts');
    expect(fixed?.annual).toBe(60_000);
  });

  it('lands the buy side on 43.50 a unit and 435,000 a year', () => {
    // 40 price + 2 freight + (40 x 2.5% = 1) duty + 0.5 inspection = 43.50
    expect(result.buy.variablePerUnit).toBeCloseTo(43.5, 12);
    expect(buyUnitCostOf(REFERENCE.buy)).toBeCloseTo(43.5, 12);
    // 43.50 x 10,000 = 435,000, and no one-off cost to spread
    expect(result.buy.totalAnnual).toBeCloseTo(435_000, 6);
    expect(result.buy.totalPerUnit).toBeCloseTo(43.5, 12);
  });

  it('charges duty on the price alone, not on price plus freight', () => {
    // 40 x 2.5% = 1.00.  Had freight been in the base it would be 1.05.
    const duty = result.buy.lines.find((each) => each.id === 'duty');
    expect(duty?.perUnit).toBeCloseTo(1, 12);
  });

  it('says BUY, and by 24,474 a year', () => {
    // 459,473.6842105263 - 435,000 = 24,473.6842105263
    expect(result.verdict).toBe('buy');
    expect(result.savingPerYear).toBeCloseTo(24_473.6842105263, 6);
    // 24,473.68 / 10,000 = 2.4473684...
    expect(result.savingPerUnit).toBeCloseTo(2.44736842105263, 9);
  });

  it('puts the break-even at about 15,376 units', () => {
    // Fixed gap      70,000 - 0                       = 70,000
    // Variable gap   43.5 - 38.947368421052631        =  4.552631578947369
    // 70,000 / 4.552631578947369                      = 15,375.722543352601
    expect(result.breakEven.crossings).toHaveLength(1);
    expect(result.breakEven.primary?.volume).toBeCloseTo(15_375.7225433526, 6);
    expect(Math.ceil(result.breakEven.primary?.volume ?? 0)).toBe(15_376);
    // Make has the lower variable cost, so it wins above the crossing.
    expect(result.breakEven.primary?.cheaperAbove).toBe('make');
    expect(result.breakEven.dominant).toBeNull();
  });

  it('checks out at the break-even: both sides cost the same there', () => {
    const at = totalsAt(REFERENCE, 15_375.7225433526);
    expect(at.make).toBeCloseTo(at.buy, 4);
  });

  it('solves the flip price through the duty rather than around it', () => {
    // p x 1.025 x 10,000 + (2 + 0.5) x 10,000 = 459,473.6842105263
    // 10,250 p = 459,473.6842105263 - 25,000 = 434,473.6842105263
    // p = 42.387676508344...
    expect(result.flipPrice).toBeCloseTo(42.38767665, 6);

    // And it holds: buying at that price costs exactly what making costs.
    const atFlip = compare({
      ...REFERENCE,
      buy: { ...REFERENCE.buy, supplierPrice: result.flipPrice as number },
    });
    expect(atFlip.buy.totalAnnual).toBeCloseTo(atFlip.make.totalAnnual, 4);
  });


  it('puts the axis at twice the furthest landmark', () => {
    // max(10,000 current, 15,375.72 crossing) x 2 = 30,751.45
    expect(volumeAxisMax(REFERENCE, result.breakEven)).toBeCloseTo(30_751.4450867052, 6);
  });
});

/* ------------------------------------------------------------------ */
/* No break-even                                                       */
/* ------------------------------------------------------------------ */

describe('when the lines never cross', () => {
  it('reports buying as cheaper everywhere when it is cheaper per unit too', () => {
    // Make 50 Q + 10,000;  Buy 30 Q.  Make is dearer per unit and carries the
    // only fixed cost, so it can never catch up.  The root sits at
    // -10,000 / 20 = -500, which is not a volume.
    const result = compare(input(1_000, { materialsPerUnit: 50, fixedCosts: 10_000 }, { supplierPrice: 30 }));

    expect(result.breakEven.crossings).toHaveLength(0);
    expect(result.breakEven.primary).toBeNull();
    expect(result.breakEven.dominant).toBe('buy');
    // 50 x 1,000 + 10,000 = 60,000 against 30 x 1,000 = 30,000
    expect(result.make.totalAnnual).toBe(60_000);
    expect(result.buy.totalAnnual).toBe(30_000);
    expect(result.verdict).toBe('buy');
  });

  it('reports making as cheaper everywhere when it wins on both counts', () => {
    // Make 20 Q;  Buy 25 Q + 5,000.  Nothing to cross.
    const result = compare(input(1_000, { materialsPerUnit: 20 }, { supplierPrice: 25, switchingCost: 5_000 }));

    expect(result.breakEven.crossings).toHaveLength(0);
    expect(result.breakEven.dominant).toBe('make');
  });

  it('calls two identical lines parallel rather than crossing', () => {
    // Make 10 Q;  Buy 10 Q.  Same slope, same intercept, no crossing.
    const result = compare(input(500, { materialsPerUnit: 10 }, { supplierPrice: 10 }));

    expect(result.breakEven.crossings).toHaveLength(0);
    expect(result.breakEven.dominant).toBe('indifferent');
    expect(result.verdict).toBe('indifferent');
    expect(result.savingPerYear).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/* The horizon                                                         */
/* ------------------------------------------------------------------ */

describe('the horizon', () => {
  it('spreads a one-off switching cost across it', () => {
    // Switching 20,000 over 4 years = 5,000 a year.
    // Buy   10 x 5,000 +  5,000 = 55,000
    // Make   8 x 5,000 + 20,000 = 60,000
    const overFour = input(
      5_000,
      { materialsPerUnit: 8, fixedCosts: 20_000 },
      { supplierPrice: 10, switchingCost: 20_000 },
      4,
    );
    const result = compare(overFour);

    expect(result.buy.fixedAnnual).toBe(5_000);
    expect(result.buy.totalAnnual).toBe(55_000);
    expect(result.make.totalAnnual).toBe(60_000);
    expect(result.verdict).toBe('buy');
    expect(result.savingPerYear).toBe(5_000);

    // Crossing: slope 8 - 10 = -2, intercept 20,000 - 5,000 = 15,000
    //           root = 15,000 / 2 = 7,500
    expect(result.breakEven.primary?.volume).toBeCloseTo(7_500, 9);
    expect(result.breakEven.primary?.cheaperAbove).toBe('make');
    // And at 7,500 the two agree: 8 x 7,500 + 20,000 = 80,000
    //                             10 x 7,500 + 5,000 = 80,000
    expect(totalsAt(overFour, 7_500)).toEqual({ make: 80_000, buy: 80_000 });
  });

  it('charges the whole one-off cost to a single year when the horizon is one', () => {
    const result = compare(input(1_000, { materialsPerUnit: 8 }, { supplierPrice: 10, switchingCost: 20_000 }, 1));
    expect(result.buy.fixedAnnual).toBe(20_000);
  });
});


/* ------------------------------------------------------------------ */
/* The landed price, yield and the empty form                          */
/* ------------------------------------------------------------------ */

describe('the landed price', () => {
  it('charges duty on the purchase price and adds freight and inspection on top', () => {
    // duty 10% of 1,080 = 108; plus freight 20 and inspection 5
    const buy: BuyInput = {
      ...NO_BUY,
      supplierPrice: 1_080,
      dutyRate: 0.1,
      freightPerUnit: 20,
      inspectionPerUnit: 5,
    };
    expect(buyUnitCostOf(buy)).toBeCloseTo(1_213, 9);
  });

  it('charges no duty when the rate is nought', () => {
    const buy: BuyInput = { ...NO_BUY, supplierPrice: 50 };
    expect(buyUnitCostOf(buy)).toBe(50);
  });
});

describe('yield', () => {
  it('doubles the variable cost at fifty percent', () => {
    // 10 materials at 50% yield = 20 per good unit
    expect(makeUnitCostOf({ ...NO_MAKE, materialsPerUnit: 10, yieldRate: 0.5 })).toBe(20);
  });

  it('changes nothing at a whole yield', () => {
    expect(makeUnitCostOf({ ...NO_MAKE, materialsPerUnit: 10, yieldRate: 1 })).toBe(10);
  });

  it('falls back to a whole yield rather than dividing by zero', () => {
    expect(makeUnitCostOf({ ...NO_MAKE, materialsPerUnit: 10, yieldRate: 0 })).toBe(10);
    expect(Number.isFinite(makeUnitCostOf({ ...NO_MAKE, materialsPerUnit: 10, yieldRate: 0 }))).toBe(true);
  });
});

describe('the empty and the awkward', () => {
  it('returns no per-unit figures at zero volume, and no NaN anywhere', () => {
    const result = compare(input(0, { materialsPerUnit: 10, fixedCosts: 5_000 }, { supplierPrice: 12 }));

    expect(result.isEmpty).toBe(true);
    expect(result.make.totalPerUnit).toBeNull();
    expect(result.buy.totalPerUnit).toBeNull();
    expect(result.savingPerUnit).toBeNull();
    expect(result.flipPrice).toBeNull();
    // The fixed lines have no per-unit figure; the variable ones still do.
    expect(result.make.lines.find((each) => each.id === 'fixedCosts')?.perUnit).toBeNull();
    expect(result.make.lines.find((each) => each.id === 'materials')?.perUnit).toBe(10);
    // Only the fixed costs are left in the totals.
    expect(result.make.totalAnnual).toBe(5_000);
    expect(result.buy.totalAnnual).toBe(0);
  });

  it('treats empty optional fields as zero without breaking anything', () => {
    const result = compare(input(1_000, { materialsPerUnit: 10 }, { supplierPrice: 12 }));
    expect(result.make.totalAnnual).toBe(10_000);
    expect(result.buy.totalAnnual).toBe(12_000);
    expect(result.verdict).toBe('make');
  });

  it('reads a non-finite figure as zero rather than poisoning the total', () => {
    const result = compare(input(100, { materialsPerUnit: Number.NaN, fixedCosts: 1_000 }, { supplierPrice: 5 }));
    expect(result.make.totalAnnual).toBe(1_000);
    expect(Number.isFinite(result.buy.totalAnnual)).toBe(true);
  });

  it('never returns a negative saving', () => {
    const cheaperToMake = compare(input(1_000, { materialsPerUnit: 1 }, { supplierPrice: 50 }));
    const cheaperToBuy = compare(input(1_000, { materialsPerUnit: 50 }, { supplierPrice: 1 }));
    expect(cheaperToMake.savingPerYear).toBeGreaterThan(0);
    expect(cheaperToBuy.savingPerYear).toBeGreaterThan(0);
  });
});
