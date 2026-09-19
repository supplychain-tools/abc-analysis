import type { Locale } from '@sct/shared/lib/format';

import { en, type MakeOrBuyDictionary } from './en';
import { fr } from './fr';

export type { MakeOrBuyDictionary };

const DICTIONARIES: Record<Locale, MakeOrBuyDictionary> = { en, fr };

export function getMakeOrBuyDictionary(locale: Locale): MakeOrBuyDictionary {
  return DICTIONARIES[locale];
}

/**
 * Put already-formatted figures into a sentence.
 *
 * The figures are substituted rather than concatenated because word order is
 * not the same in both languages, and a sentence assembled from fragments can
 * only be built in one of them. A placeholder with no value is left standing,
 * so a missing figure shows as `{volume}` in testing rather than disappearing
 * into a sentence that still reads plausibly.
 */
export function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole);
}
