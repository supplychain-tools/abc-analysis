'use client';

import type { FieldIssues } from '@/lib/derive';
import { currencySymbol } from '@sct/shared/lib/format';
import type { HoldingMode, ToolState } from '@/lib/state';

import { ChoiceGroup, RailSection } from '@sct/shared/ui/Controls';
import { Field } from '@sct/shared/ui/Field';
import { useSettings } from './Settings';

export interface InputRailProps {
  state: ToolState;
  patch: (patch: Partial<ToolState>) => void;
  issues: FieldIssues;
  revealErrors: boolean;
}

/**
 * The input rail. A stripe of mathematical symbols runs down its left edge, so
 * it reads the way the variables list in a paper does, and every field box
 * shares one left and one right edge.
 */
export function InputRail({
  state,
  patch,
  issues,
  revealErrors,
}: InputRailProps) {
  const { locale, currency, t } = useSettings();
  const symbol = currencySymbol(currency, locale);
  const byRate = state.holdingMode === 'rate';

  const message = (field: keyof FieldIssues): string | null => {
    const code = issues[field];
    return code === undefined ? null : t.errors[code];
  };

  return (
    <div className="space-y-4">
      <RailSection title={t.sections.demandAndCost}>
        <Field
          id="annual-demand"
          symbol={t.fields.annualDemand.symbol}
          label={t.fields.annualDemand.label}
          unit={t.units.unitsPerYear}
          value={state.annualDemand}
          onChange={(value) => patch({ annualDemand: value })}
          error={message('annualDemand')}
          revealErrors={revealErrors}
        />

        <Field
          id="order-cost"
          symbol={t.fields.orderCost.symbol}
          label={t.fields.orderCost.label}
          unit={`${symbol} ${t.units.perOrder}`}
          value={state.orderCost}
          onChange={(value) => patch({ orderCost: value })}
          error={message('orderCost')}
          revealErrors={revealErrors}
        />

        <ChoiceGroup<HoldingMode>
          name="holding-mode"
          legend={t.holdingMode.legend}
          value={state.holdingMode}
          onChange={(value) => patch({ holdingMode: value })}
          choices={[
            { value: 'perUnit', label: t.holdingMode.perUnit },
            { value: 'rate', label: t.holdingMode.rate },
          ]}
        />

        {byRate ? (
          <>
            <Field
              id="holding-rate"
              symbol={t.fields.holdingRate.symbol}
              label={t.fields.holdingRate.label}
              unit={t.units.percentOfUnitCost}
              value={state.holdingRate}
              onChange={(value) => patch({ holdingRate: value })}
              error={message('holdingRate')}
              revealErrors={revealErrors}
            />
            <Field
              id="unit-cost"
              symbol={t.fields.unitCost.symbol}
              label={t.fields.unitCost.label}
              unit={`${symbol} ${t.units.perUnit}`}
              value={state.unitCost}
              onChange={(value) => patch({ unitCost: value })}
              error={message('unitCost')}
              revealErrors={revealErrors}
            />
          </>
        ) : (
          <>
            <Field
              id="holding-cost"
              symbol={t.fields.holdingCostPerUnit.symbol}
              label={t.fields.holdingCostPerUnit.label}
              unit={`${symbol} ${t.units.perUnitYear}`}
              value={state.holdingCostPerUnit}
              onChange={(value) => patch({ holdingCostPerUnit: value })}
              error={message('holdingCostPerUnit')}
              revealErrors={revealErrors}
            />
            <Field
              id="unit-cost"
              symbol={t.fields.unitCost.symbol}
              label={t.fields.unitCost.label}
              unit={`${symbol} ${t.units.perUnit}`}
              value={state.unitCost}
              onChange={(value) => patch({ unitCost: value })}
              error={message('unitCost')}
              revealErrors={revealErrors}
            />
          </>
        )}
      </RailSection>

      <RailSection title={t.sections.workingYear}>
        <Field
          id="days-per-year"
          label={t.fields.daysPerYear.label}
          unit={t.units.days}
          value={state.daysPerYear}
          onChange={(value) => patch({ daysPerYear: value })}
          error={message('daysPerYear')}
          revealErrors={revealErrors}
        />
      </RailSection>

      <RailSection title={t.sections.safetyStock}>
        <Field
          id="safety-stock"
          label={t.fields.safetyStock.label}
          symbol={t.fields.safetyStock.symbol}
          unit={t.units.units}
          value={state.safetyStock}
          onChange={(value) => patch({ safetyStock: value })}
          error={message('safetyStock')}
          revealErrors={revealErrors}
        />
      </RailSection>
    </div>
  );
}
