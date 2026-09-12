/**
 * ABC classification: sorting stocked items by what they are worth in a year,
 * and cutting the sorted list into three bands of management attention.
 *
 * Everything here takes plain numbers and returns plain numbers or typed
 * objects. No React, no Intl, no formatting, no user-facing text. Full
 * precision is kept throughout; rounding belongs to the presentation layer.
 *
 * The one thing worth stating twice, because it is the whole model and the
 * usual mistake: classification is on annual consumption *value*, never on
 * quantity and never on unit price. A part bought three times a year at 1450
 * each is a small item. A cup bought 180000 times a year at 0.62 is a large
 * one.
 */

/* ------------------------------------------------------------------ */
/* Inputs and outputs                                                  */
/* ------------------------------------------------------------------ */

export interface AbcItem {
  /** Stable across edits and re-sorts. Names are not unique and may repeat. */
  id: string;
  name: string;
  /** Units consumed per year. */
  annualUsage: number;
  /** Cost of one unit. */
  unitCost: number;
}

export type AbcClass = 'A' | 'B' | 'C';

/** The three bands, in the order they are always read and rendered. */
export const ABC_CLASSES: readonly AbcClass[] = ['A', 'B', 'C'];

export interface ClassifiedItem extends AbcItem {
  /** annualUsage times unitCost. */
  annualValue: number;
  /** This item's share of total annual value, in percent. */
  valueShare: number;
  /** Share of total annual value carried by this item and every richer one. */
  cumulativeShare: number;
  /** Null only when there is nothing to classify. See AbcAnalysis.isEmpty. */
  abcClass: AbcClass | null;
}

export interface ClassBand {
  abcClass: AbcClass;
  itemCount: number;
  /** Percent of the item count. The small half of the revelation. */
  itemShare: number;
  /** Percent of total annual value. The large half. */
  valueShare: number;
  totalValue: number;
}

export interface AbcAnalysis {
  /** Every input row, by descending annual value, then by name. */
  items: ClassifiedItem[];
  totalValue: number;
  /** A, B and C: always all three, always in that order. */
  bands: ClassBand[];
  /** True when there is no value to divide up: no rows, or every row at zero. */
  isEmpty: boolean;
}

/* ------------------------------------------------------------------ */
/* The thresholds                                                      */
/* ------------------------------------------------------------------ */

/** Cumulative share, in percent, up to and including which an item is A. */
export const CLASS_A_THRESHOLD = 80;

/** And up to and including which it is B. Past this, C. */
export const CLASS_B_THRESHOLD = 95;

/**
 * A cumulative share is a sum of ratios, so an item landing exactly on a
 * threshold can arrive at 80.00000000000001 and fall into the wrong band for
 * no reason a reader could ever see. This tolerance sits eleven orders of
 * magnitude below the thresholds it guards and several above double-precision
 * noise, so it can catch that and nothing else.
 */
const TOLERANCE = 1e-9;

/* ------------------------------------------------------------------ */
/* Classification                                                      */
/* ------------------------------------------------------------------ */

/**
 * A quantity or a price that is missing, unparseable, infinite or negative
 * counts as zero. None of those describe a stocked item, and letting one
 * through would put NaN through every figure downstream of it rather than
 * into the one cell that caused it.
 */
function usable(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/** Which band a cumulative share falls in, before the top-item rule below. */
function bandFor(cumulativeShare: number): AbcClass {
  if (cumulativeShare <= CLASS_A_THRESHOLD + TOLERANCE) return 'A';
  if (cumulativeShare <= CLASS_B_THRESHOLD + TOLERANCE) return 'B';
  return 'C';
}

/**
 * Descending by annual value, ties broken by name — except at zero.
 *
 * The tiebreak is what makes the order deterministic rather than merely
 * repeatable: two items of equal value can land on opposite sides of a
 * threshold, so which one is printed first decides which class each gets.
 * Comparison is by code unit rather than by locale, because a sort that
 * depended on the reader's language would classify the same data differently
 * in French and in English. Rows equal on both keys keep their input order,
 * which the specification has guaranteed of Array.prototype.sort since ES2019.
 *
 * Rows worth nothing are the exception, and leaving them to the name tiebreak
 * made the table unusable to type into. A row is worth nothing until both a
 * usage and a unit cost are in it, which is to say for the whole time somebody
 * is filling it in — and every such row is tied with every other, so the order
 * fell to the names. Typing the first letter into an empty row sorted it
 * against the blanks around it and moved it away under the cursor, before it
 * meant anything at all.
 *
 * So at zero the tiebreak is withheld and the input order stands. Nothing is
 * lost by it: the name tiebreak exists to decide which of two equal items
 * falls on which side of a threshold, and items worth nothing are not
 * classified — they sit below every classified row, in the order they were
 * typed, until they are worth something and the value sorts them properly.
 */
function byValueThenName(a: ClassifiedItem, b: ClassifiedItem): number {
  if (b.annualValue !== a.annualValue) return b.annualValue - a.annualValue;
  if (a.annualValue === 0) return 0;
  if (a.name < b.name) return -1;
  if (a.name > b.name) return 1;
  return 0;
}

/**
 * Classify a list of items. Pure: the same input always gives the same output,
 * and nothing outside this file is consulted.
 */
export function classify(items: readonly AbcItem[]): AbcAnalysis {
  const valued: ClassifiedItem[] = items.map((item) => {
    const annualUsage = usable(item.annualUsage);
    const unitCost = usable(item.unitCost);
    return {
      ...item,
      annualUsage,
      unitCost,
      annualValue: annualUsage * unitCost,
      valueShare: 0,
      cumulativeShare: 0,
      abcClass: null,
    };
  });

  valued.sort(byValueThenName);

  const totalValue = valued.reduce((sum, item) => sum + item.annualValue, 0);

  // Nothing to divide up. Every share would be 0/0, so no share is claimed and
  // no class assigned: the rows come back sorted and otherwise untouched.
  if (!(totalValue > 0)) {
    return { items: valued, totalValue: 0, bands: emptyBands(), isEmpty: true };
  }

  let runningValue = 0;
  valued.forEach((item, index) => {
    runningValue += item.annualValue;
    item.valueShare = (item.annualValue / totalValue) * 100;
    item.cumulativeShare = (runningValue / totalValue) * 100;

    // An item that crosses a threshold belongs to the class it crosses into,
    // which is what bandFor says. The first row is the exception: a single
    // item worth more than 80% of the total crosses both thresholds at once
    // and would come out C, leaving the A class empty. The richest line is
    // always A, because an analysis saying otherwise reports the reverse of
    // what it measures. Delete this one conditional to get the unguarded rule.
    item.abcClass = index === 0 ? 'A' : bandFor(item.cumulativeShare);
  });

  return { items: valued, totalValue, bands: summarise(valued, totalValue), isEmpty: false };
}

/* ------------------------------------------------------------------ */
/* The band summary                                                    */
/* ------------------------------------------------------------------ */

/** With no value there are no members, whatever the number of rows on screen. */
function emptyBands(): ClassBand[] {
  return ABC_CLASSES.map((abcClass) => ({
    abcClass,
    itemCount: 0,
    itemShare: 0,
    valueShare: 0,
    totalValue: 0,
  }));
}

/**
 * How many items each band holds, and how much of the money it accounts for.
 * The point of the summary is the gap between those two columns.
 */
function summarise(items: readonly ClassifiedItem[], totalValue: number): ClassBand[] {
  return ABC_CLASSES.map((abcClass) => {
    const members = items.filter((item) => item.abcClass === abcClass);
    const bandValue = members.reduce((sum, item) => sum + item.annualValue, 0);
    return {
      abcClass,
      itemCount: members.length,
      itemShare: items.length === 0 ? 0 : (members.length / items.length) * 100,
      valueShare: (bandValue / totalValue) * 100,
      totalValue: bandValue,
    };
  });
}
