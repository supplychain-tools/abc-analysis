/**
 * The tool's input model, and how it travels in a URL.
 *
 * Every field is held as the raw string the user typed, so nothing is
 * reformatted or rounded behind their back mid-edit. Parsing happens once, in
 * lib/derive.ts, against the active locale.
 */

import { formatForInput, parseNumber, type Locale } from '@sct/shared/lib/format';

export type HoldingMode = 'perUnit' | 'rate';

export interface ToolState {
  annualDemand: string;
  orderCost: string;
  holdingMode: HoldingMode;
  holdingCostPerUnit: string;
  /** Entered as a percentage: 20 means 20% of unit cost. */
  holdingRate: string;
  unitCost: string;
  daysPerYear: string;

  /** Entered directly: the buffer the buyer has decided to carry. */
  safetyStock: string;
}

/**
 * A clear field, and clear means clear.
 *
 * The working year used to open on 365, which made two things untrue at once:
 * the tool did not start empty, and "clear all fields" left a field filled. It
 * was then offered as the field's placeholder, and that was no better: a grey
 * 365 inside a field the tool is simultaneously outlining in red for being
 * empty reads as a value the page is refusing to accept. The field is blank,
 * like every other required field, and says so the same way.
 */
export const BLANK_STATE: ToolState = {
  annualDemand: '',
  orderCost: '',
  holdingMode: 'perUnit',
  holdingCostPerUnit: '',
  holdingRate: '',
  unitCost: '',
  daysPerYear: '',

  safetyStock: '',
};

/**
 * A worked example, loaded on request from the title block. The tool itself
 * opens on a clear field.
 *
 * A distributor buying a mid-value part: 300 working days at 80 units a day is
 * the 24 000 annual demand, ordered in pallets of 120.
 */
export const EXAMPLE_STATE: ToolState = {
  annualDemand: '24000',
  orderCost: '450',
  holdingMode: 'rate',
  holdingCostPerUnit: '',
  holdingRate: '22',
  unitCost: '38.50',
  daysPerYear: '300',

  safetyStock: '275',
};

/* ------------------------------------------------------------------ */
/* URL state                                                           */
/* ------------------------------------------------------------------ */

/**
 * Short query keys. Numbers travel in canonical form — a point for the
 * decimal mark, no grouping — so a link pasted between a French and an English
 * reader means the same thing on both ends.
 */
const KEYS = {
  annualDemand: 'd',
  orderCost: 's',
  holdingCostPerUnit: 'h',
  holdingRate: 'i',
  unitCost: 'c',
  daysPerYear: 'y',
  safetyStock: 'ss',
} as const;

type NumericKey = keyof typeof KEYS;

function canonical(raw: string, locale: Locale): string | null {
  const value = parseNumber(raw, locale);
  return value === null ? null : String(value);
}

/** Encode the inputs into a query string that can be shared or bookmarked. */
export function encodeState(state: ToolState, locale: Locale): string {
  const params = new URLSearchParams();

  for (const [field, key] of Object.entries(KEYS) as Array<[NumericKey, string]>) {
    const value = canonical(state[field], locale);
    if (value !== null) params.set(key, value);
  }

  params.set('hm', state.holdingMode === 'rate' ? 'r' : 'u');

  return params.toString();
}

/**
 * Read inputs back out of a query string, formatted for display in the given
 * locale. Returns null when the query carries none of our keys, which is how a
 * bare URL ends up on a clear field.
 */
export function decodeState(search: string, locale: Locale): ToolState | null {
  const params = new URLSearchParams(search);
  const known = [...Object.values(KEYS), 'hm'];
  if (!known.some((key) => params.has(key))) return null;

  const state: ToolState = { ...BLANK_STATE };

  for (const [field, key] of Object.entries(KEYS) as Array<[NumericKey, string]>) {
    const raw = params.get(key);
    if (raw === null) continue;
    // Canonical form: a point decimal mark, which English parsing reads exactly.
    const value = parseNumber(raw, 'en');
    if (value !== null) state[field] = formatForInput(value, locale);
  }

  state.holdingMode = params.get('hm') === 'r' ? 'rate' : 'perUnit';

  return state;
}

/** Rewrite every filled field into the conventions of another locale. */
export function reformatState(state: ToolState, from: Locale, to: Locale): ToolState {
  const convert = (raw: string): string => {
    const value = parseNumber(raw, from);
    return value === null ? raw : formatForInput(value, to);
  };

  return {
    ...state,
    annualDemand: convert(state.annualDemand),
    orderCost: convert(state.orderCost),
    holdingCostPerUnit: convert(state.holdingCostPerUnit),
    holdingRate: convert(state.holdingRate),
    unitCost: convert(state.unitCost),
    daysPerYear: convert(state.daysPerYear),
    safetyStock: convert(state.safetyStock),
  };
}
