/**
 * English dictionary for the ABC analyser. This object defines the shape the
 * other language has to match: `AbcDictionary` is `typeof en`, so a missing or
 * misspelled key in fr.ts is a type error rather than a blank space on screen.
 *
 * Nothing here states the thresholds the classification uses. The bands are
 * drawn on the chart and named in the table; the arithmetic behind them is not
 * the reader's problem.
 */
export const en = {
  meta: {
    title: 'ABC inventory analysis',
    description:
      'Rank stocked items by annual consumption value and split them into A, B and C classes, in the browser.',
  },

  app: {
    /* The tool's full name, and the only place it is written on the page. It
       used to be shortened here because a standing heading underneath carried
       the long form; that heading is gone, so the header carries the name. */
    tool: 'ABC inventory analysis',
    language: 'Language',
    currency: 'Currency',
  },

  sections: {
    chart: 'Pareto chart',
    summary: 'Classes',
    table: 'Items',
    // Only a phone sees this one: the head of the second table, the half
    // holding what the tool computed.
    results: 'ABC analysis',
  },

  actions: {
    loadExample: 'Load example',
    clearAll: 'Clear all',
    addRow: 'Add row',
    removeRow: (name: string) => (name === '' ? 'Remove this row' : `Remove ${name}`),
  },

  table: {
    columns: {
      name: 'Item',
      annualUsage: 'Annual usage',
      unitCost: 'Unit cost',
      annualValue: 'Annual value',
      valueShare: 'Share',
      cumulativeShare: 'Cumulative',
      abcClass: 'Class',
    },
    total: 'Total',
    namePlaceholder: 'Item name',
    rowCount: (count: number) => (count === 1 ? '1 item' : `${count} items`),
  },

  summary: {
    ofItems: 'of items',
    ofValue: 'of the value',

    /* The two halves of a class card, each naming the figure under it rather
       than trailing after it. Both are shares, and they are named as shares of
       two different things, because that difference is the whole finding. */
    labels: {
      itemShare: 'Share of the list',
      valueShare: 'Share of the value',
    },

    columns: {
      abcClass: 'Class',
      itemCount: 'Items',
      itemShare: '% of items',
      valueShare: '% of value',
    },
  },

  chart: {
    title: 'Annual consumption value by item, ranked, with the running cumulative share',
    axisValue: 'Annual value',
    axisCumulative: 'Cumulative share',
    axisRank: 'Rank',
    readoutItem: 'Item',
    readoutValue: 'Annual value',
    readoutCumulative: 'Cumulative',
    hint: 'Point at a bar to read it.',
    tableCaption: 'Every item by rank, with its annual value, class and cumulative share',
  },

  empty: {
    title: 'Nothing to analyse yet',
    message:
      'Type an item name, the number of units used in a year, and the cost of one unit.',
  },

  units: {
    perYear: 'units/yr',
    items: 'items',
  },

  a11y: {
    skipToTable: 'Skip to the item table',
    chartRegion: 'Pareto chart',
    classOf: (abcClass: string) => `Class ${abcClass}`,
  },
};

export type AbcDictionary = typeof en;
