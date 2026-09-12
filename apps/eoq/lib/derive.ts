/**
 * From what the user typed to what the model says.
 *
 * One pass: parse and check every field against the active locale, then feed
 * the numbers that survived into lib/eoq.ts. Nothing here does any formatting,
 * and nothing in lib/eoq.ts knows this file exists.
 */

import {
  costPenaltyTable,
  holdingCostFromRate,
  solveEoq,
  type CostPenaltyRow,
  type EoqInput,
  type EoqResult,
} from './eoq';
import type { Locale } from '@sct/shared/lib/format';
import type { ToolState } from './state';
import { checkField, type FieldName, type FieldSpec, type IssueCode } from './validate';

export type FieldIssues = Partial<Record<FieldName, IssueCode>>;
export type FieldValues = Partial<Record<FieldName, number>>;

export interface Derived {
  values: FieldValues;
  issues: FieldIssues;
  /** Required fields still empty. Distinct from fields holding something wrong. */
  missing: FieldName[];

  holdingCostPerUnit: number | null;
  unitCost: number | null;

  eoqInput: EoqInput | null;
  eoq: EoqResult | null;
  penaltyRows: CostPenaltyRow[];
}

/**
 * Which rule each field follows, and whether it is required, given the holding
 * mode currently switched on. A field that is not in play is not required, so
 * the rail never asks for a number the model will not use.
 */
export function fieldSpecs(state: ToolState): Record<FieldName, FieldSpec> {
  const byRate = state.holdingMode === 'rate';

  return {
    annualDemand: { rule: 'positive', required: true },
    orderCost: { rule: 'positive', required: true },
    holdingCostPerUnit: { rule: 'positive', required: !byRate },
    holdingRate: { rule: 'rate', required: byRate, percent: true },
    // The rate mode derives H from C, so the unit cost stops being optional.
    unitCost: { rule: 'positive', required: byRate },
    daysPerYear: { rule: 'positive', required: true },
    safetyStock: { rule: 'nonNegative', required: false },
  };
}

const RAW: Record<FieldName, (state: ToolState) => string> = {
  annualDemand: (s) => s.annualDemand,
  orderCost: (s) => s.orderCost,
  holdingCostPerUnit: (s) => s.holdingCostPerUnit,
  holdingRate: (s) => s.holdingRate,
  unitCost: (s) => s.unitCost,
  daysPerYear: (s) => s.daysPerYear,
  safetyStock: (s) => s.safetyStock,
};

export function derive(state: ToolState, locale: Locale): Derived {
  const specs = fieldSpecs(state);
  const values: FieldValues = {};
  const issues: FieldIssues = {};
  const missing: FieldName[] = [];

  for (const field of Object.keys(specs) as FieldName[]) {
    const { value, issue } = checkField(field, RAW[field](state), locale, specs[field]);
    if (value !== null) values[field] = value;
    if (issue !== null) {
      issues[field] = issue.code;
      if (issue.code === 'required') missing.push(field);
    }
  }

  const unitCost = values.unitCost ?? null;
  const holdingCostPerUnit =
    state.holdingMode === 'rate'
      ? values.holdingRate !== undefined && unitCost !== null
        ? holdingCostFromRate(values.holdingRate, unitCost)
        : null
      : (values.holdingCostPerUnit ?? null);

  const annualDemand = values.annualDemand;
  const orderCost = values.orderCost;
  const daysPerYear = values.daysPerYear;

  let eoqInput: EoqInput | null = null;
  let eoq: EoqResult | null = null;
  let penaltyRows: CostPenaltyRow[] = [];

  if (
    annualDemand !== undefined &&
    orderCost !== undefined &&
    daysPerYear !== undefined &&
    holdingCostPerUnit !== null
  ) {
    eoqInput = {
      annualDemand,
      orderCost,
      holdingCostPerUnit,
      daysPerYear,
      unitCost,
      safetyStock: values.safetyStock ?? 0,
    };
    eoq = solveEoq(eoqInput);
    penaltyRows = costPenaltyTable(annualDemand, orderCost, holdingCostPerUnit);
  }

  return {
    values,
    issues,
    missing,
    holdingCostPerUnit,
    unitCost,
    eoqInput,
    eoq,
    penaltyRows,
  };
}
