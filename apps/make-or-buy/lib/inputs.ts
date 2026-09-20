import { formatForInput, parseNumber, type Locale } from '@sct/shared/lib/format';

import type { MakeOrBuyInput } from './makeorbuy';

/**
 * The bridge between what is in the fields and what the model can compare.
 *
 * A field holds the text the user actually typed, not a number. That is the
 * whole reason this file exists: a field being edited passes through states
 * that are not numbers at all, and a form that stored parsed values would
 * either refuse those keystrokes or lose them. Parsing happens on the way out.
 *
 * Validation returns typed codes rather than sentences, so the same rule reads
 * correctly in both languages and neither copy nor translation can drift away
 * from the rule it describes.
 */

/* ------------------------------------------------------------------ */
/* The shape of the form                                               */
/* ------------------------------------------------------------------ */

export type FieldName =
  | 'annualVolume'
  | 'horizonYears'
  | 'materialsPerUnit'
  | 'laborHoursPerUnit'
  | 'laborRatePerHour'
  | 'variableOverheadPerUnit'
  | 'yieldPercent'
  | 'fixedCosts'
  | 'toolingInvestment'
  | 'opportunityCostPerYear'
  | 'supplierPrice'
  | 'freightPerUnit'
  | 'dutyPercent'
  | 'inspectionPerUnit';

export const SHARED_FIELDS: readonly FieldName[] = ['annualVolume', 'horizonYears'];

export const MAKE_FIELDS: readonly FieldName[] = [
  'materialsPerUnit',
  'laborHoursPerUnit',
  'laborRatePerHour',
  'variableOverheadPerUnit',
  'yieldPercent',
  'fixedCosts',
  'toolingInvestment',
  'opportunityCostPerYear',
];

export const BUY_FIELDS: readonly FieldName[] = [
  'supplierPrice',
  'freightPerUnit',
  'dutyPercent',
  'inspectionPerUnit',
];

export const FIELDS: readonly FieldName[] = [...SHARED_FIELDS, ...MAKE_FIELDS, ...BUY_FIELDS];


export interface FormValues {
  fields: Record<FieldName, string>;
}

/* ------------------------------------------------------------------ */
/* What can be wrong                                                   */
/* ------------------------------------------------------------------ */

/**
 * There is no `required` code and no `not-a-number` code, and both omissions
 * are deliberate. An empty field means the figure is not known yet, which is
 * the state the page opens in after Clear all, and arguing with it would put
 * twenty complaints on an untouched form. Text that will not parse counts as
 * zero for the same reason: someone halfway through typing "1 2" should see the
 * page wait rather than object.
 *
 * What is refused is an entry that is complete, unambiguous, and describes
 * nothing: a negative cost, a yield of zero, a life of no years.
 */
export type IssueCode =
  | 'must-be-non-negative'
  | 'must-be-positive'
  | 'yield-out-of-range'
  | 'percent-out-of-range'
  | 'at-least-one-year';

export type FieldIssues = Partial<Record<FieldName, IssueCode>>;


export interface FormIssues {
  fields: FieldIssues;
  /** Anything at all is wrong. */
  any: boolean;
}

/* ------------------------------------------------------------------ */
/* Rules, one per field                                                */
/* ------------------------------------------------------------------ */

/** Fields counted in years, where anything under one is not a span. */
const AT_LEAST_ONE_YEAR = new Set<FieldName>(['horizonYears']);

/** Percentages that have to land inside nought to a hundred. */
const PERCENT_FIELDS = new Set<FieldName>(['dutyPercent']);

function issueFor(field: FieldName, value: number): IssueCode | null {
  if (field === 'yieldPercent') {
    // Strictly above zero: a process with no yield produces nothing, and the
    // cost per good unit would be a division by zero.
    return value > 0 && value <= 100 ? null : 'yield-out-of-range';
  }
  if (AT_LEAST_ONE_YEAR.has(field)) return value >= 1 ? null : 'at-least-one-year';
  if (PERCENT_FIELDS.has(field)) return value >= 0 && value <= 100 ? null : 'percent-out-of-range';
  return value >= 0 ? null : 'must-be-non-negative';
}

export function checkValues(values: FormValues, locale: Locale): FormIssues {
  const fields: FieldIssues = {};

  for (const field of FIELDS) {
    const parsed = parseNumber(values.fields[field], locale);
    if (parsed === null) continue;
    const code = issueFor(field, parsed);
    if (code !== null) fields[field] = code;
  }


  return {
    fields,
    any: Object.keys(fields).length > 0,
  };
}

/* ------------------------------------------------------------------ */
/* Reading the form                                                    */
/* ------------------------------------------------------------------ */

/**
 * What the model sees. Empty and unparseable fields become zero, which is what
 * the model does with them anyway, and a rejected entry becomes its own safe
 * default so that one bad field cannot drag every figure on the page down with
 * it: the field shows its own complaint, and the rest of the page keeps
 * answering.
 */
export function toInput(values: FormValues, locale: Locale): MakeOrBuyInput {
  const read = (field: FieldName, fallback = 0): number => {
    const parsed = parseNumber(values.fields[field], locale);
    if (parsed === null) return fallback;
    return issueFor(field, parsed) === null ? parsed : fallback;
  };


  return {
    annualVolume: read('annualVolume'),
    horizonYears: read('horizonYears', 1),
    make: {
      materialsPerUnit: read('materialsPerUnit'),
      laborHoursPerUnit: read('laborHoursPerUnit'),
      laborRatePerHour: read('laborRatePerHour'),
      variableOverheadPerUnit: read('variableOverheadPerUnit'),
      // Entered as a percentage, used as a fraction.
      yieldRate: read('yieldPercent', 100) / 100,
      fixedCosts: read('fixedCosts'),
      toolingInvestment: read('toolingInvestment'),
      opportunityCostPerYear: read('opportunityCostPerYear'),
    },
    buy: {
      supplierPrice: read('supplierPrice'),
      freightPerUnit: read('freightPerUnit'),
      dutyRate: read('dutyPercent') / 100,
      inspectionPerUnit: read('inspectionPerUnit'),
      // No longer asked for on the form. The model still carries the term, so
      // a one-off switching cost stays expressible; nothing on screen sets it.
      switchingCost: 0,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Starting states                                                     */
/* ------------------------------------------------------------------ */

const BLANK_FIELDS = Object.fromEntries(FIELDS.map((field) => [field, ''])) as Record<
  FieldName,
  string
>;

export const EMPTY_VALUES: FormValues = { fields: BLANK_FIELDS };


/**
 * The worked example: the case the documentation is written around, so that
 * what a reader sees on opening the page is the case they can check by hand.
 */
const EXAMPLE_NUMBERS: Record<FieldName, number | null> = {
  annualVolume: 10_000,
  // Five years, which is what the tooling is written off over now that the
  // horizon is the only span in the form.
  horizonYears: 5,
  materialsPerUnit: 12,
  laborHoursPerUnit: 0.5,
  laborRatePerHour: 40,
  variableOverheadPerUnit: 5,
  yieldPercent: 95,
  fixedCosts: 60_000,
  toolingInvestment: 50_000,
  opportunityCostPerYear: 0,
  supplierPrice: 40,
  freightPerUnit: 2,
  dutyPercent: 2.5,
  inspectionPerUnit: 0.5,
};

export function exampleValues(locale: Locale): FormValues {
  const fields = Object.fromEntries(
    FIELDS.map((field) => {
      const value = EXAMPLE_NUMBERS[field];
      return [field, value === null ? '' : formatForInput(value, locale)];
    }),
  ) as Record<FieldName, string>;

  return { fields };
}

/**
 * Rewrite the figures into another locale's conventions, leaving anything that
 * does not parse exactly as typed. Someone mid-keystroke when the language
 * changes keeps their keystroke.
 */
export function reformatValues(values: FormValues, from: Locale, to: Locale): FormValues {
  const convert = (text: string): string => {
    const parsed = parseNumber(text, from);
    return parsed === null ? text : formatForInput(parsed, to);
  };

  return {
    fields: Object.fromEntries(
      FIELDS.map((field) => [field, convert(values.fields[field])]),
    ) as Record<FieldName, string>,
  };
}

/** True when every figure is empty, which is the state Clear all leaves. */
export function isBlank(values: FormValues): boolean {
  return FIELDS.every((field) => values.fields[field].trim() === '');
}

