/**
 * Input validation, kept apart from both the maths and the UI.
 *
 * Validation returns typed codes rather than sentences. The dictionaries in
 * lib/i18n turn a code into a message, so the same rule reads correctly in
 * French and in English and neither copy nor translation can drift away from
 * the rule it describes.
 */

import { parseNumber, type Locale } from '@sct/shared/lib/format';

export type FieldName =
  | 'annualDemand'
  | 'orderCost'
  | 'holdingCostPerUnit'
  | 'holdingRate'
  | 'unitCost'
  | 'daysPerYear'
  | 'safetyStock';

export type IssueCode =
  | 'required'
  | 'not-a-number'
  | 'must-be-positive'
  | 'must-be-non-negative'
  | 'rate-out-of-range';

export interface FieldIssue {
  field: FieldName;
  code: IssueCode;
}

/**
 * What a field is allowed to hold.
 *   positive     strictly greater than zero
 *   nonNegative  zero or more
 *   rate         a share of unit value: greater than 0, at most 1
 */
export type FieldRule = 'positive' | 'nonNegative' | 'rate';

export interface FieldSpec {
  rule: FieldRule;
  required: boolean;
  /**
   * The field is typed as a percentage. The user enters 20 and 95; the model
   * wants 0.2 and 0.95. Dividing here keeps the entry unit in one place and
   * lets the rule below read in model units.
   */
  percent?: boolean;
}

export interface FieldCheck {
  value: number | null;
  issue: FieldIssue | null;
}

/** Parse and check one field. An empty optional field is valid and yields null. */
export function checkField(
  field: FieldName,
  raw: string,
  locale: Locale,
  { rule, required, percent = false }: FieldSpec,
): FieldCheck {
  if (raw.trim() === '') {
    return required ? { value: null, issue: { field, code: 'required' } } : { value: null, issue: null };
  }

  const parsed = parseNumber(raw, locale);
  if (parsed === null) return { value: null, issue: { field, code: 'not-a-number' } };

  const value = percent ? parsed / 100 : parsed;

  switch (rule) {
    case 'positive':
      if (!(value > 0)) return { value: null, issue: { field, code: 'must-be-positive' } };
      break;
    case 'nonNegative':
      if (!(value >= 0)) return { value: null, issue: { field, code: 'must-be-non-negative' } };
      break;
    case 'rate':
      if (!(value > 0 && value <= 1)) {
        return { value: null, issue: { field, code: 'rate-out-of-range' } };
      }
      break;
  }

  return { value, issue: null };
}
