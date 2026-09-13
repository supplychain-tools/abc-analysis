import type { Locale } from '@sct/shared/lib/format';

import type { AbcItem } from './classify';

/**
 * A year of supplies for one busy café.
 *
 * Twenty lines. It was thirty, and the ten that went were the back of the
 * list — the descaler, the tamper mat, the knock box — things a café buys
 * once a year and which taught the reader nothing the lines above them had
 * not already taught. Every line that carries part of the argument stayed.
 *
 * Chosen so the Pareto effect is visible rather than argued for: four of the
 * twenty lines carry 76.3% of the money. It also carries two placements that
 * contradict the reflex of ranking a stock list by unit price, because that
 * reflex is the thing an ABC analysis exists to break:
 *
 *   Takeaway cups, 12 oz    0.62 each, 180 000 a year   third by value, A
 *   Cup lids, 12 oz         0.21 each, 180 000 a year   fifth by value,  B
 *   Grinder burr set        1450 each, 3 a year         18th by value,   C
 *   Water filter cartridge   340 each, 6 a year         20th by value,   C
 *
 * The cheapest thing on the list outranks the dearest by a factor of
 * twenty-six. Nothing here needs saying in the interface: the table says it.
 *
 * Two lines are still worth exactly 5280 a year, so the sample still exercises
 * the name tiebreak in the sort. On thirty lines the pair straddled the 95%
 * mark and the tiebreak decided a class as well as an order; on twenty it
 * lands inside C. Keeping that property would have meant dropping the middle
 * of the list — the milk, the napkins, the syrups — and keeping the oddments,
 * which is a worse sample to look at. The class-deciding case is covered by
 * its own test in classify.test.ts instead.
 */
interface SampleRow {
  id: string;
  en: string;
  fr: string;
  /** Units per year. */
  annualUsage: number;
  unitCost: number;
}

const SAMPLE_ROWS: readonly SampleRow[] = [
  { id: 's01', en: 'Espresso beans, house blend', fr: 'Café en grains, mélange maison', annualUsage: 2400, unitCost: 78 },
  { id: 's02', en: 'Takeaway cups, 12 oz', fr: 'Gobelets à emporter, 12 oz', annualUsage: 180_000, unitCost: 0.62 },
  { id: 's03', en: 'Whole milk', fr: 'Lait entier', annualUsage: 16_000, unitCost: 7.2 },
  { id: 's04', en: 'Oat milk', fr: "Lait d'avoine", annualUsage: 5200, unitCost: 14.5 },
  { id: 's05', en: 'Cup lids, 12 oz', fr: 'Couvercles, 12 oz', annualUsage: 180_000, unitCost: 0.21 },
  { id: 's06', en: 'Takeaway cups, 8 oz', fr: 'Gobelets à emporter, 8 oz', annualUsage: 34_000, unitCost: 0.54 },
  { id: 's07', en: 'Single-origin beans, guest', fr: 'Café de spécialité, origine unique', annualUsage: 110, unitCost: 132 },
  { id: 's08', en: 'Vanilla syrup', fr: 'Sirop vanille', annualUsage: 240, unitCost: 42 },
  { id: 's09', en: 'Chocolate powder', fr: 'Chocolat en poudre', annualUsage: 140, unitCost: 68 },
  { id: 's10', en: 'Napkins, box of 500', fr: 'Serviettes, boîte de 500', annualUsage: 480, unitCost: 18 },
  { id: 's11', en: 'Loose leaf tea', fr: 'Thé en vrac', annualUsage: 48, unitCost: 168 },
  { id: 's12', en: 'Caramel syrup', fr: 'Sirop caramel', annualUsage: 165, unitCost: 42 },
  { id: 's13', en: 'Cup lids, 8 oz', fr: 'Couvercles, 8 oz', annualUsage: 34_000, unitCost: 0.19 },
  { id: 's14', en: 'Decaf beans', fr: 'Café en grains, décaféiné', annualUsage: 70, unitCost: 92 },
  { id: 's15', en: 'Cup carriers, 4 cup', fr: 'Porte-gobelets, 4 places', annualUsage: 11_000, unitCost: 0.48 },
  { id: 's16', en: 'Sugar sachets, box of 1000', fr: 'Sucre en bûchettes, boîte de 1000', annualUsage: 190, unitCost: 28 },
  { id: 's17', en: 'Hazelnut syrup', fr: 'Sirop noisette', annualUsage: 120, unitCost: 44 },
  { id: 's18', en: 'Grinder burr set', fr: 'Jeu de meules pour moulin', annualUsage: 3, unitCost: 1450 },
  { id: 's22', en: 'Pastry bags', fr: 'Sachets viennoiserie', annualUsage: 9000, unitCost: 0.28 },
  { id: 's24', en: 'Water filter cartridge', fr: "Cartouche de filtration d'eau", annualUsage: 6, unitCost: 340 },
];

/** The sample in one language. Ids are stable across both. */
export function sampleItems(locale: Locale): AbcItem[] {
  return SAMPLE_ROWS.map((row) => ({
    id: row.id,
    name: locale === 'fr' ? row.fr : row.en,
    annualUsage: row.annualUsage,
    unitCost: row.unitCost,
  }));
}

/**
 * The English sample, for the tests. The two languages sort identically here,
 * including across the tie: "Porte-gobelets" precedes "Sirop noisette" exactly
 * as "Cup carriers" precedes "Hazelnut syrup", so the worked figures in
 * classify.test.ts hold in both.
 */
export const SAMPLE_ITEMS: AbcItem[] = sampleItems('en');
