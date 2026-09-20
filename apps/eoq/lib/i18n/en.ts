/**
 * English dictionary. This object defines the shape every other language has
 * to match: `Dictionary` is `typeof en`, so a missing or misspelled key in
 * fr.ts is a type error rather than a blank space in the interface.
 */
export const en = {
  meta: {
    title: 'Economic order quantity',
    description:
      'How much to order at a time, and what ordering off the optimum costs. Calculated in the browser.',
  },

  app: {
    name: 'Inventory ordering calculator',
    tool: 'Inventory ordering',
    language: 'Language',
    currency: 'Currency',
  },

  actions: {
    loadExample: 'Load example',
    clear: 'Clear all fields',
  },

  sections: {
    demandAndCost: 'Demand and cost',
    workingYear: 'Working year',
    safetyStock: 'Safety stock',
    results: 'Results',
    chart: 'Cost curve',
    penalty: 'Cost of ordering the wrong quantity',
  },

  tabs: {
    overview: 'Order and cycle',
    chart: 'Cost curve',
    sensitivity: 'Sensitivity',
    /** Names the tab list for anyone not seeing it. */
    label: 'Views',
  },

  fields: {
    annualDemand: { symbol: 'D', label: 'Annual demand' },
    orderCost: { symbol: 'S', label: 'Cost per order' },
    holdingCostPerUnit: { symbol: 'H', label: 'Holding cost per unit' },
    holdingRate: { symbol: 'i', label: 'Holding rate' },
    unitCost: { symbol: 'C', label: 'Unit purchase cost' },
    daysPerYear: { symbol: '', label: 'Working days per year' },
    safetyStock: { symbol: 'SS', label: 'Safety stock carried' },
  },

  holdingMode: {
    legend: 'Holding cost given as',
    perUnit: 'Amount per unit',
    rate: 'Rate on unit cost',
    derived: 'H = i × C',
  },

  results: {
    quantity: 'Economic order quantity',
    quantityShort: 'Q*',
    ordersPerYear: 'Orders per year',
    daysBetween: 'Days between orders',
    relevantCost: 'Total relevant cost',
    relevantCostShort: 'TRC',
    purchaseCost: 'Purchase cost',
    totalCost: 'Total annual cost',
    averageInventory: 'Average inventory',
    safetyStock: 'Safety stock',
    closedForm: 'Ordering & Holding Cost',
    orderWhole: 'Order in whole units: round up to',
    beforeRounding: 'before rounding',
  },

  units: {
    units: 'units',
    unitsPerYear: 'units/year',
    unitsPerDay: 'units/day',
    unitsPerWeek: 'units/week',
    ordersPerYear: 'orders/year',
    days: 'days',
    weeks: 'weeks',
    perOrder: 'per order',
    perUnitYear: 'per unit/year',
    perUnit: 'per unit',
    perYear: 'per year',
    percent: '%',
    percentOfUnitCost: '% of unit cost',
  },

  penalty: {
    caption:
      'The cost curve is flat near its minimum. Ordering 20% away from Q* costs about 2% more.',
    columns: {
      ratio: 'Q / Q*',
      quantity: 'Q',
      relevantCost: 'Ordering & Holding Cost',
      penalty: 'Penalty',
    },
    optimum: 'Optimum',
  },

  profile: {
    title: 'Inventory over time',
    cycle: 'Cycle',
    axisTime: 'Time',
    axisLevel: 'Stock on hand',
    tableCaption: 'Inventory level at each event',
    tableEvent: 'Event',
    tableTime: 'Time',
    tableLevel: 'Stock on hand',
    eventStart: 'Cycle starts, stock replenished',
    eventDelivery: 'Safety stock reached, delivery arrives',
  },

  chart: {
    title: 'Annual cost against order quantity',
    xAxis: 'Order quantity',
    yAxis: 'Annual cost',
    ordering: 'ordering',
    holding: 'holding',
    total: 'total',
    optimum: 'Q*',
    readoutHint: 'Move across the chart to read cost at any quantity.',
    readoutQuantity: 'At Q',
    readoutCost: 'Cost',
    readoutPenalty: 'Versus optimum',
    tableCaption: 'Cost curve values',
    tableQuantity: 'Order quantity',
    tableOrdering: 'Ordering cost',
    tableHolding: 'Holding cost',
    tableTotal: 'Total cost',
  },

  errors: {
    required: 'Enter a value',
    'not-a-number': 'Not a number. Use digits, with a comma or a point for decimals.',
    'must-be-positive': 'Must be greater than 0',
    'must-be-non-negative': 'Must be 0 or more',
    'rate-out-of-range': 'Must be greater than 0 and at most 100',
  },

  empty: {
    headline: 'Nothing to calculate yet',
    needs: 'Still needed:',
  },

  a11y: {
    skipToResults: 'Skip to results',
    inputRail: 'Inputs',
    resultsRegion: 'Results',
    tabs: 'Views',
    chartRegion: 'Cost curve',
  },
};

export type Dictionary = typeof en;
