'use client';

import {
  BUY_FIELDS,
  MAKE_FIELDS,
  type FieldName,
  type FormIssues,
  type FormValues,
} from '@/lib/inputs';
import { Field } from '@sct/shared/ui/Field';

import { useSettings } from './Settings';

/**
 * The figures, laid out as the comparison they feed.
 *
 * Make on the left and buy on the right, which is the mapping the breakdown
 * table and the two labelled lines on the chart both repeat. A reader learns
 * one side-to-side arrangement on arriving and it is still true everywhere
 * else on the page, so nothing below has to be re-read to work out which
 * column is which.
 *
 * Each field carries its label and its unit and nothing else: the definitions
 * live in the documentation rather than behind a disclosure on every row.
 */
/** Where the make column breaks into its own subheadings. */
const MAKE_GROUPS: readonly {
  heading: 'makeVariable' | 'makeFixed' | 'makeCapacity';
  fields: FieldName[];
  /** Hide the legend, where every field in the group already states its unit. */
  quiet?: boolean;
}[] = [
  {
    heading: 'makeVariable',
    // No legend. Each of these five states its own unit on the right of its
    // label, and three of them are not per unit at all: an hourly rate and a
    // percentage sat under a heading that said "per unit" of them.
    quiet: true,
    fields: ['materialsPerUnit', 'laborHoursPerUnit', 'laborRatePerHour', 'variableOverheadPerUnit', 'yieldPercent'],
  },
  {
    heading: 'makeFixed',
    quiet: true,
    fields: ['fixedCosts', 'toolingInvestment'],
  },
  { heading: 'makeCapacity', quiet: true, fields: ['opportunityCostPerYear'] },
];

// Same as the make column: the legends name the groups for a screen reader
// and stay off the page, because each of these four rows already states its
// own unit beside the label.
const BUY_GROUPS: readonly { heading: 'buyPrice' | 'buyLanded'; fields: FieldName[] }[] = [
  { heading: 'buyPrice', fields: ['supplierPrice'] },
  { heading: 'buyLanded', fields: ['freightPerUnit', 'dutyPercent', 'inspectionPerUnit'] },
];

/**
 * Fields that carry no unit beside the label.
 *
 * The figure is still a yearly one or a one-off; the tag saying so is what has
 * gone, because the label and the group it sits in already carry it. Worth
 * knowing: "one-off" was the only thing distinguishing the tooling investment
 * from an annual cost on screen, so the distinction now lives in the field's
 * definition rather than on the row.
 */
const UNITS_HIDDEN = new Set<FieldName>([
  'fixedCosts',
  'toolingInvestment',
  'opportunityCostPerYear',
]);

export interface InputsProps {
  values: FormValues;
  issues: FormIssues;
  onChangeField: (field: FieldName, value: string) => void;
}

export function Inputs({ values, issues, onChangeField }: InputsProps) {
  const { t } = useSettings();

  const field = (name: FieldName) => {
    const copy = t.fields[name];
    const code = issues.fields[name];

    return (
      <Field
        key={name}
        id={`f-${name}`}
        label={copy.label}
        unit={UNITS_HIDDEN.has(name) ? undefined : copy.unit}
        value={values.fields[name]}
        error={code === undefined ? null : t.issues[code]}
        onChange={(value) => onChangeField(name, value)}
      />
    );
  };

  /**
   * One group of figures: a name, and the fields under it.
   *
   * The rail is one sheet, and the groups are sections on it divided by an
   * inset hairline, which is how the ordering tool sets its own rail. Not a
   * card each: three bordered boxes stacked in a 340px column read as three
   * unrelated forms, and the figures in them are one reading.
   */
  const group = (id: string, heading: string, body: React.ReactNode, showHeading = true) => (
    <section
      className="border-t border-[color:var(--line)] pt-3 first:border-t-0 first:pt-0"
      aria-labelledby={id}
    >
      {/* The heading still exists when it is not shown. It names the section
          for anyone reading the form through a screen reader, which is the
          only thing the visible title was doing for the first group: the two
          figures in it are already labelled, and a title over the very first
          rows of a form names what a reader can see in one glance. */}
      <div className={showHeading ? 'mb-2 flex items-baseline gap-2' : undefined}>
        <h2 id={id} className={showHeading ? 't-label' : 'sr-only'}>
          {heading}
        </h2>
      </div>
      {body}
    </section>
  );

  return (
    <div className="space-y-4">
      {/* What both options are costed against. Above the split, because it
          belongs to neither column and changing it moves both. */}
      {group(
        'group-shared',
        t.groups.shared,
        <div className="space-y-2.5">
          {field('annualVolume')}
          {field('horizonYears')}
        </div>,
        false,
      )}

      {/* One column, not two.

          Make beside Buy mirrors the comparison and is the right arrangement
          when the form has the width of a page. In a rail it does not: two
          columns of a 340px rail are 150px each, and at that width "Receiving
          and inspection" wraps to three lines and every label in the form
          becomes a paragraph. The left-is-make, right-is-buy mapping still
          holds where it is read rather than typed, which is the breakdown and
          the two labelled lines on the chart. */}
      {group(
        'group-make',
        t.groups.make,
        <div className="space-y-3">
          {MAKE_GROUPS.map((each) => (
            <fieldset key={each.heading} className="space-y-2.5">
              <legend
                className={
                  each.quiet === true ? 'sr-only' : 't-micro pb-1 text-[color:var(--text-2)]'
                }
              >
                {t.groups[each.heading]}
              </legend>
              {each.fields.map((name) => field(name))}
            </fieldset>
          ))}
        </div>,
      )}

      {group(
        'group-buy',
        t.groups.buy,
        <div className="space-y-3">
          {BUY_GROUPS.map((each) => (
            <fieldset key={each.heading} className="space-y-2.5">
              <legend className="sr-only">{t.groups[each.heading]}</legend>
              {each.fields.map((name) => field(name))}
            </fieldset>
          ))}
        </div>,
      )}
    </div>
  );
}


export { MAKE_FIELDS, BUY_FIELDS };
