import { describe, expect, it } from 'vitest';

import {
  CLASS_A_THRESHOLD,
  CLASS_B_THRESHOLD,
  classify,
  type AbcClass,
  type AbcItem,
} from './classify';
import { SAMPLE_ITEMS } from './sample';

/** A row, with an id derived from the name so the cases stay readable. */
function item(name: string, annualUsage: number, unitCost: number): AbcItem {
  return { id: name, name, annualUsage, unitCost };
}

/** The classes of a result, in the order the rows come back. */
function classes(items: ReadonlyArray<{ abcClass: AbcClass | null }>): Array<AbcClass | null> {
  return items.map((entry) => entry.abcClass);
}

function names(items: ReadonlyArray<{ name: string }>): string[] {
  return items.map((entry) => entry.name);
}

/* ================================================================== */
/* The model                                                          */
/* ================================================================== */

describe('annual consumption value', () => {
  it('is usage times unit cost, not either one alone', () => {
    const { items } = classify([
      item('cups', 180_000, 0.62),
      item('burr set', 3, 1450),
      item('milk', 16_000, 7.2),
    ]);

    expect(items.map((entry) => entry.annualValue)).toEqual([115_200, 111_600, 4350]);
  });

  it('ranks a cheap high-volume item above an expensive rare one', () => {
    const { items } = classify([item('burr set', 3, 1450), item('cups', 180_000, 0.62)]);

    // The burr is 2339 times the unit price and a twenty-sixth of the money.
    expect(names(items)).toEqual(['cups', 'burr set']);
  });

  it('sums shares to 100 percent and ends the cumulative column there', () => {
    const { items } = classify([item('a', 3, 5), item('b', 7, 11), item('c', 2, 2)]);

    const shareTotal = items.reduce((sum, entry) => sum + entry.valueShare, 0);
    expect(shareTotal).toBeCloseTo(100, 10);
    expect(items[items.length - 1].cumulativeShare).toBeCloseTo(100, 10);
  });
});

/* ================================================================== */
/* Order                                                              */
/* ================================================================== */

describe('order', () => {
  it('sorts by annual value descending, whatever the input order', () => {
    const { items } = classify([
      item('small', 1, 1),
      item('large', 100, 100),
      item('medium', 10, 10),
    ]);

    expect(names(items)).toEqual(['large', 'medium', 'small']);
  });

  it('breaks ties on name, so the same data always classifies the same way', () => {
    const forwards = classify([item('zinc', 10, 10), item('alum', 20, 5)]);
    const backwards = classify([item('alum', 20, 5), item('zinc', 10, 10)]);

    expect(names(forwards.items)).toEqual(['alum', 'zinc']);
    expect(names(backwards.items)).toEqual(['alum', 'zinc']);
  });

  it('keeps duplicate names as separate rows rather than merging them', () => {
    const { items, totalValue } = classify([
      { id: '1', name: 'oat milk', annualUsage: 100, unitCost: 10 },
      { id: '2', name: 'oat milk', annualUsage: 50, unitCost: 10 },
    ]);

    expect(items).toHaveLength(2);
    expect(totalValue).toBe(1500);
    expect(items.map((entry) => entry.id)).toEqual(['1', '2']);
  });
});

/* ================================================================== */
/* The thresholds                                                     */
/* ================================================================== */

describe('threshold crossing', () => {
  it('puts the item that crosses a threshold in the class it crosses into', () => {
    // Cumulative: 60, 79, 96, 100. The 96 crosses 95 and lands in C.
    const { items } = classify([
      item('one', 60, 1),
      item('two', 19, 1),
      item('three', 17, 1),
      item('four', 4, 1),
    ]);

    expect(items.map((entry) => Math.round(entry.cumulativeShare))).toEqual([60, 79, 96, 100]);
    expect(classes(items)).toEqual(['A', 'A', 'C', 'C']);
  });

  it('keeps an item landing exactly on 80 percent in A', () => {
    // Cumulative: 50, 80, 100. The second row sits on the threshold itself.
    const { items } = classify([item('half', 50, 1), item('thirty', 30, 1), item('rest', 20, 1)]);

    expect(items[1].cumulativeShare).toBeCloseTo(CLASS_A_THRESHOLD, 12);
    expect(classes(items)).toEqual(['A', 'A', 'C']);
  });

  it('keeps it in A even when the arithmetic lands just past 80 in binary', () => {
    // 0.1 + 0.2 + 0.5 has no exact double, so the cumulative share of the
    // second row comes out as 80.00000000000001 rather than 80.
    const { items } = classify([item('a', 0.5, 1), item('b', 0.3, 1), item('c', 0.2, 1)]);

    expect(items[1].cumulativeShare).toBeGreaterThanOrEqual(CLASS_A_THRESHOLD);
    expect(classes(items)).toEqual(['A', 'A', 'C']);
  });

  it('keeps an item landing exactly on 95 percent in B', () => {
    // Cumulative: 70, 95, 100.
    const { items } = classify([item('a', 70, 1), item('b', 25, 1), item('c', 5, 1)]);

    expect(items[1].cumulativeShare).toBeCloseTo(CLASS_B_THRESHOLD, 12);
    expect(classes(items)).toEqual(['A', 'B', 'C']);
  });
});

/* ================================================================== */
/* Degenerate lists                                                   */
/* ================================================================== */

describe('a single item worth more than 80 percent of the total', () => {
  it('classifies the only item as A rather than emptying the A band', () => {
    const { items, bands, isEmpty } = classify([item('sole', 10, 10)]);

    expect(isEmpty).toBe(false);
    expect(items[0].cumulativeShare).toBeCloseTo(100, 10);
    expect(items[0].abcClass).toBe('A');
    expect(bands[0]).toMatchObject({ abcClass: 'A', itemCount: 1, valueShare: 100 });
  });

  it('classifies a dominant first item as A and applies the plain rule below it', () => {
    // Cumulative: 85, 95, 100. Unguarded, the 85 would cross into B and the
    // A band would hold nothing at all.
    const { items } = classify([item('dominant', 85, 1), item('b', 10, 1), item('c', 5, 1)]);

    expect(items[0].cumulativeShare).toBeCloseTo(85, 10);
    expect(classes(items)).toEqual(['A', 'B', 'C']);
  });
});

describe('zero and unusable rows', () => {
  it('gives a zero-cost row no value, no share and class C', () => {
    const { items, totalValue } = classify([
      item('paid', 100, 5),
      item('free samples', 4000, 0),
    ]);

    expect(totalValue).toBe(500);
    const free = items[items.length - 1];
    expect(free.name).toBe('free samples');
    expect(free.annualValue).toBe(0);
    expect(free.valueShare).toBe(0);
    expect(free.abcClass).toBe('C');
  });

  it('produces no NaN anywhere from a zero-cost row', () => {
    const { items } = classify([item('paid', 100, 5), item('free', 4000, 0)]);

    for (const entry of items) {
      expect(Number.isFinite(entry.annualValue)).toBe(true);
      expect(Number.isFinite(entry.valueShare)).toBe(true);
      expect(Number.isFinite(entry.cumulativeShare)).toBe(true);
    }
  });

  it('reports an empty analysis rather than dividing by a zero total', () => {
    const { items, totalValue, bands, isEmpty } = classify([
      item('nothing', 0, 0),
      item('also nothing', 500, 0),
    ]);

    expect(isEmpty).toBe(true);
    expect(totalValue).toBe(0);
    expect(items).toHaveLength(2);
    expect(classes(items)).toEqual([null, null]);
    expect(bands.every((band) => band.itemCount === 0 && band.valueShare === 0)).toBe(true);
  });

  it('reports an empty analysis for no rows at all', () => {
    const { items, totalValue, bands, isEmpty } = classify([]);

    expect(isEmpty).toBe(true);
    expect(totalValue).toBe(0);
    expect(items).toEqual([]);
    expect(bands.map((band) => band.abcClass)).toEqual(['A', 'B', 'C']);
  });

  it('treats NaN, infinity and negatives as zero instead of spreading them', () => {
    const { items, totalValue } = classify([
      item('good', 10, 10),
      item('not a number', Number.NaN, 5),
      item('infinite', Number.POSITIVE_INFINITY, 5),
      item('negative usage', -20, 5),
      item('negative cost', 20, -5),
    ]);

    expect(totalValue).toBe(100);
    expect(items.every((entry) => Number.isFinite(entry.annualValue))).toBe(true);
    expect(items.filter((entry) => entry.annualValue === 0)).toHaveLength(4);
  });
});

/* ================================================================== */
/* The band summary                                                   */
/* ================================================================== */

describe('band summary', () => {
  it('returns all three bands in order even when one holds nothing', () => {
    const { bands } = classify([item('only', 5, 5)]);

    expect(bands.map((band) => band.abcClass)).toEqual(['A', 'B', 'C']);
    expect(bands[1].itemCount).toBe(0);
    expect(bands[2].itemCount).toBe(0);
  });

  it('accounts for every item and every unit of value exactly once', () => {
    const { items, bands, totalValue } = classify(SAMPLE_ITEMS);

    expect(bands.reduce((sum, band) => sum + band.itemCount, 0)).toBe(items.length);
    expect(bands.reduce((sum, band) => sum + band.totalValue, 0)).toBeCloseTo(totalValue, 6);
    expect(bands.reduce((sum, band) => sum + band.valueShare, 0)).toBeCloseTo(100, 10);
    expect(bands.reduce((sum, band) => sum + band.itemShare, 0)).toBeCloseTo(100, 10);
  });
});

/* ================================================================== */
/* The sample data, checked against the hand calculation              */
/* ================================================================== */

describe('the café sample', () => {
  const analysis = classify(SAMPLE_ITEMS);

  it('has twenty-five rows and a total of 654 622', () => {
    expect(SAMPLE_ITEMS).toHaveLength(25);
    expect(analysis.totalValue).toBeCloseTo(654_622, 6);
  });

  it('puts four items, a sixth of the list, over three quarters of the money', () => {
    const [a] = analysis.bands;

    // 489 400 out of 654 622, summed off the sorted list by hand.
    expect(a.itemCount).toBe(4);
    expect(a.totalValue).toBe(489_400);
    expect(a.itemShare).toBeCloseTo(16, 5);
    expect(a.valueShare).toBeCloseTo(74.760702, 5);
  });

  it('splits the tail eleven to B and ten to C', () => {
    const [, b, c] = analysis.bands;

    // 132 134 and 33 088 out of 654 622, summed off the sorted list by hand.
    expect(b.itemCount).toBe(11);
    expect(b.totalValue).toBe(132_134);
    expect(b.valueShare).toBeCloseTo(20.184778, 5);
    expect(c.itemCount).toBe(10);
    expect(c.totalValue).toBe(33_088);
    expect(c.valueShare).toBeCloseTo(5.05452, 5);
  });

  it('ranks the four A items in the order the hand calculation gives', () => {
    expect(names(analysis.items.slice(0, 4))).toEqual([
      'Espresso beans, house blend',
      'Whole milk',
      'Takeaway cups, 12 oz',
      'Oat milk',
    ]);
    expect(analysis.items[3].cumulativeShare).toBeCloseTo(74.761, 3);
    expect(analysis.items[4].cumulativeShare).toBeCloseTo(80.535, 3);
  });

  it('puts the cheapest units on the list in A and the dearest in C', () => {
    const byName = (name: string) => analysis.items.find((entry) => entry.name === name);

    // 0.62 a cup, 180 000 cups: third by value, and firmly class A.
    expect(byName('Takeaway cups, 12 oz')).toMatchObject({ unitCost: 0.62, abcClass: 'A' });
    // 1450 a set, three sets a year: eighteenth by value, and class C.
    expect(byName('Grinder burr set')).toMatchObject({ unitCost: 1450, abcClass: 'C' });
    // A second pair making the same point, in case the first is read as a fluke.
    expect(byName('Cup lids, 12 oz')).toMatchObject({ unitCost: 0.21, abcClass: 'B' });
    expect(byName('Water filter cartridge')).toMatchObject({ unitCost: 340, abcClass: 'C' });
  });

  it('resolves the one genuine tie by name', () => {
    // Cup carriers and hazelnut syrup are both worth 5280 a year, so the order
    // between them comes from the names and from nothing else.
    const carriers = analysis.items.findIndex((entry) => entry.name === 'Cup carriers, 4 cup');
    const syrup = analysis.items.findIndex((entry) => entry.name === 'Hazelnut syrup');

    expect(analysis.items[carriers].annualValue).toBe(analysis.items[syrup].annualValue);
    expect(carriers).toBeLessThan(syrup);
  });

  it('would let that tiebreak decide a class, where a pair straddles a line', () => {
    // What the sample showed while it was thirty lines long, kept here on data
    // built for it: two items of equal value on either side of 95%, so the name
    // that sorts first takes B and the other takes C.
    const { items } = classify([
      item('bulk', 800, 1),
      item('middle', 80, 1),
      item('zinc', 60, 1),
      item('alum', 60, 1),
    ]);

    // 80, 88, 94, 100: the pair arrives at 94 and 100, one either side of 95.
    expect(names(items)).toEqual(['bulk', 'middle', 'alum', 'zinc']);
    expect(items.map((entry) => entry.abcClass)).toEqual(['A', 'B', 'B', 'C']);
  });

  it('gives every item a unique id, so duplicate names could not collide', () => {
    const ids = new Set(SAMPLE_ITEMS.map((entry) => entry.id));
    expect(ids.size).toBe(SAMPLE_ITEMS.length);
  });
});
