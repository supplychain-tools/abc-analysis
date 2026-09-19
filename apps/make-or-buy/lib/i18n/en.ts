/**
 * English dictionary for the make-or-buy calculator. This object defines the
 * shape the other language has to match: `MakeOrBuyDictionary` is `typeof en`,
 * so a missing or misspelled key in fr.ts is a type error rather than a blank
 * space on screen.
 */
export const en = {
  meta: {
    title: 'Make or buy calculator',
    description:
      'Compare the full annual cost of producing a component in-house against buying it, with yield, tooling, duty and quantity breaks, and find the volume at which the cheaper option changes.',
  },

  app: {
    tool: 'Make or buy',
    language: 'Language',
    currency: 'Currency',
  },

  intro: {
    title: 'Make or buy calculator',
    lead: 'Cost a part both ways: in-house with its scrap, tooling and opportunity cost, or bought with its freight, duty and quantity breaks. Then find the volume where the cheaper option flips.',
  },

  sections: {
    verdict: 'Cost verdict',
    breakdown: 'Cost breakdown',
    chart: 'Total cost by volume',
    inputs: 'Figures',
  },

  tabs: {
    /** Names the strip itself for a screen reader. */
    label: 'Results',
    verdict: 'Verdict',
    volume: 'Cost by volume',
  },

  verdict: {
    make: 'MAKE',
    buy: 'BUY',
    indifferent: 'EITHER',
    /**
     * The verdict holds at one volume, so the line under it always names that
     * volume. A bare MAKE reads as a property of the part rather than as the
     * answer to the question that was actually asked.
     */
    atVolume: 'At',
    cheaperBy: 'cheaper per year',
    perUnitSaving: 'per unit',
    sameCost: 'the two cost the same',
    unitMake: 'In-house unit cost',
    unitBuy: 'Supplier unit cost',
    flipPrice: 'Price that would level it',
    flipPriceNote: 'Below this supplier price, buying wins.',
  },

  breakdown: {
    line: 'Cost line',
    perUnit: 'Per unit',
    annual: 'Per year',
    make: 'Make',
    buy: 'Buy',
    total: 'Decision total',
    makeLines: {
      materials: 'Direct materials',
      labor: 'Direct labour',
      variableOverhead: 'Variable overhead',
      scrapLoss: 'Scrap and yield loss',
      fixedCosts: 'Fixed costs',
      tooling: 'Tooling, written off',
      opportunityCost: 'Opportunity cost of capacity',
    },
    buyLines: {
      purchasePrice: 'Purchase price',
      freight: 'Freight',
      duty: 'Customs duty',
      inspection: 'Receiving and inspection',
      switching: 'Switching cost, spread',
    },
    caption: 'Every cost line for both options, per unit and per year',
  },

  chart: {
    title: 'Total annual cost of making and of buying, against annual volume',
    axisVolume: 'Annual volume',
    axisCost: 'Cost',
    make: 'Make',
    buy: 'Buy',
    currentVolume: 'Your volume',
    crossing: 'Break-even',
    cheaperHere: 'cheaper',
    tableDifference: 'Difference',
    /** Read by a screen reader in place of the picture. */
    summaryCrossing:
      'Two cost lines against annual volume. They cross at {crossing} units a year: below that, {below} is cheaper; above it, {above} is cheaper. At the volume entered, {current} units, {verdict} is cheaper.',
    summaryNoCrossing:
      'Two cost lines against annual volume. They do not cross: {dominant} is cheaper at every volume. At the volume entered, {current} units, the gap is {gap}.',
  },

  breakEven: {
    heading: 'Break-even volume',
    /** "Above 15,376 units/year, making is cheaper." */
    aboveMake: 'Above {volume} units a year, making is cheaper.',
    aboveBuy: 'Above {volume} units a year, buying is cheaper.',
    betweenMake: 'Between {low} and {high} units a year, making is cheaper.',
    betweenBuy: 'Between {low} and {high} units a year, buying is cheaper.',
    noneMake: 'No break-even. Making is cheaper at every volume.',
    noneBuy: 'No break-even. Buying is cheaper at every volume.',
    noneEither: 'No break-even. The two cost the same at every volume.',
    several: 'The answer changes {count} times, because a quantity break steps the price down.',
    rounding: 'Rounded up to whole units.',
    distance: 'Your volume is {gap} units away.',
  },


  groups: {
    shared: 'Both options',
    make: 'Make in-house',
    buy: 'Buy from a supplier',
    makeVariable: 'Per unit',
    makeFixed: 'Per year',
    makeCapacity: 'Capacity given up',
    buyPrice: 'Price',
    buyLanded: 'Landing it',
    buyTerms: 'Terms',
  },

  fields: {
    annualVolume: { label: 'Annual volume', unit: 'units/yr', hint: 'Good units needed a year. Both options are costed at this volume.' },
    horizonYears: { label: 'Analysis horizon', unit: 'years', hint: 'One-off costs, such as switching supplier, are spread over this many years.' },

    materialsPerUnit: { label: 'Direct materials', unit: 'per unit', hint: 'Material cost of one unit started.' },
    laborHoursPerUnit: { label: 'Direct labour', unit: 'hours/unit', hint: 'Hours of direct labour per unit started.' },
    laborRatePerHour: { label: 'Labour rate', unit: 'per hour', hint: 'Fully loaded hourly cost of that labour.' },
    variableOverheadPerUnit: { label: 'Variable overhead', unit: 'per unit', hint: 'Power, consumables and anything else that rises with each unit made.' },
    yieldPercent: {
      label: 'Yield',
      unit: '%',
      hint: 'Good units out of units started. Cost is incurred on every unit started, including the ones scrapped, so the cost per good unit is the variable cost divided by the yield.',
    },
    fixedCosts: {
      label: 'Fixed costs',
      unit: 'per year',
      hint: 'Fixed cost that stops if the part is bought instead: a dedicated supervisor, a leased machine, a line that would be shut. Overhead that continues either way does not belong here, because a cost that does not change with the decision cannot inform it.',
    },
    toolingInvestment: { label: 'Tooling investment', unit: 'one-off', hint: 'Jigs, moulds and equipment bought to make this part, written off straight line over the horizon.' },
    opportunityCostPerYear: {
      label: 'Opportunity cost',
      unit: 'per year',
      hint: 'Contribution given up elsewhere by using this capacity for this part. A real cost of making that appears on no invoice.',
    },

    supplierPrice: { label: 'Supplier price', unit: 'per unit', hint: 'Quoted price per unit, in your own currency, before any quantity break.' },
    freightPerUnit: { label: 'Freight', unit: 'per unit', hint: 'Inbound transport per unit.' },
    dutyPercent: { label: 'Customs duty', unit: '% of price', hint: 'Charged on the purchase price, not on freight.' },
    inspectionPerUnit: { label: 'Receiving and inspection', unit: 'per unit', hint: 'Goods-in handling and quality checks per unit.' },
    switchingCost: { label: 'Switching cost', unit: 'one-off', hint: 'Onboarding, qualification and first-article costs, spread over the horizon.' },
  },


  actions: {
    loadExample: 'Load example',
    clearAll: 'Clear all',
  },

  issues: {
    'must-be-non-negative': 'Enter zero or more.',
    'must-be-positive': 'Enter more than zero.',
    'yield-out-of-range': 'Enter a yield above 0 and up to 100.',
    'percent-out-of-range': 'Enter a percentage between 0 and 100.',
    'at-least-one-year': 'Enter at least one year.',
  },


  empty: {
    title: 'Nothing to compare yet',
    message: 'Enter the annual volume, then what one unit costs each way. The verdict, the breakdown and the chart appear as you type.',
  },

  units: {
    perYear: 'units/yr',
    perUnit: 'per unit',
    units: 'units',
    years: 'years',
  },

  a11y: {
    skipToInputs: 'Skip to the figures',
    inputRail: 'Figures',
    chartRegion: 'Break-even chart',
    verdictRegion: 'Cost verdict',
    breakdownRegion: 'Cost breakdown',
  },

};

export type MakeOrBuyDictionary = typeof en;
