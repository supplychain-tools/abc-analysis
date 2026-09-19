/**
 * Locale-aware number parsing and formatting.
 *
 * Parsing is deliberately forgiving: a buyer typing into this tool may have a
 * French keyboard, an English spreadsheet on the other screen, and a habit of
 * pasting. "1 234,56", "1.234,56", "1,234.56" and "1234.56" all mean the same
 * thing and all have to work. Formatting, by contrast, is strict: one
 * convention per locale, one precision per kind of quantity.
 */

export type Locale = 'fr' | 'en';
export type CurrencyCode = 'MAD' | 'EUR' | 'USD';

export const LOCALES: readonly Locale[] = ['fr', 'en'];
export const CURRENCIES: readonly CurrencyCode[] = ['MAD', 'EUR', 'USD'];

/** BCP 47 tags behind the two-letter locale keys used through the app. */
const INTL_TAG: Record<Locale, string> = { fr: 'fr-FR', en: 'en-US' };

/** Shown wherever a figure does not exist yet. An en dash, not a zero. */
export const EMPTY_VALUE = '–';

/* ------------------------------------------------------------------ */
/* Parsing                                                             */
/* ------------------------------------------------------------------ */

/**
 * Every space a grouped number might contain. JavaScript's \s already covers
 * the no-break (U+00A0), thin (U+2009), figure (U+2007) and narrow no-break
 * (U+202F) spaces that Intl emits, so no literal invisible characters are
 * needed in this file.
 */
const SPACES = /\s/g;

/** An integer part is either bare digits or digits grouped in threes. */
function integerPartIsWellFormed(part: string): boolean {
  if (part === '') return true;
  if (/^\d+$/.test(part)) return true;

  const hasDot = part.includes('.');
  const hasComma = part.includes(',');
  if (hasDot && hasComma) return false;

  const separator = hasDot ? '\\.' : ',';
  return new RegExp(`^\\d{1,3}(?:${separator}\\d{3})+$`).test(part);
}

function occurrences(text: string, character: string): number {
  let count = 0;
  for (const char of text) if (char === character) count += 1;
  return count;
}

/**
 * Read a number out of whatever the user typed, or null if it is not a number.
 *
 * Which character is the decimal mark is decided like this:
 *   - both "." and "," present  -> the rightmost of the two is the decimal mark
 *   - the same one repeated     -> it is grouping, there is no decimal part
 *   - a single "."              -> decimal mark, in both locales
 *   - a single ","              -> decimal mark, unless the locale is English
 *                                  and exactly three digits follow, which is
 *                                  the genuinely ambiguous "1,234"
 *
 * A trailing percent sign is accepted and dropped, so "20%" and "20" agree.
 */
export function parseNumber(raw: string, locale: Locale): number | null {
  let text = raw.trim();
  if (text === '') return null;

  if (text.endsWith('%')) text = text.slice(0, -1).trim();
  text = text.replace(SPACES, '');
  if (text === '') return null;

  let sign = 1;
  if (text.startsWith('-')) {
    sign = -1;
    text = text.slice(1);
  } else if (text.startsWith('+')) {
    text = text.slice(1);
  }

  if (!/^[\d.,]+$/.test(text)) return null;

  const dots = occurrences(text, '.');
  const commas = occurrences(text, ',');

  let decimalMark: '.' | ',' | null;
  if (dots > 0 && commas > 0) {
    decimalMark = text.lastIndexOf('.') > text.lastIndexOf(',') ? '.' : ',';
  } else if (dots > 1 || commas > 1) {
    decimalMark = null;
  } else if (dots === 1) {
    decimalMark = '.';
  } else if (commas === 1) {
    const digitsAfter = text.length - text.lastIndexOf(',') - 1;
    decimalMark = locale === 'en' && digitsAfter === 3 ? null : ',';
  } else {
    decimalMark = null;
  }

  const splitAt = decimalMark === null ? -1 : text.lastIndexOf(decimalMark);
  const integerText = splitAt === -1 ? text : text.slice(0, splitAt);
  const fractionText = splitAt === -1 ? '' : text.slice(splitAt + 1);

  if (!/^\d*$/.test(fractionText)) return null;
  if (!integerPartIsWellFormed(integerText)) return null;

  const digits = integerText.replace(/[.,]/g, '');
  if (digits === '' && fractionText === '') return null;

  const value = sign * Number(`${digits === '' ? '0' : digits}.${fractionText || '0'}`);
  if (!Number.isFinite(value)) return null;
  return value === 0 ? 0 : value;
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

const formatterCache = new Map<string, Intl.NumberFormat>();

function formatter(locale: Locale, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let cached = formatterCache.get(key);
  if (cached === undefined) {
    cached = new Intl.NumberFormat(INTL_TAG[locale], options);
    formatterCache.set(key, cached);
  }
  return cached;
}

/**
 * Snap a value to the precision it will be shown at, so that a figure such as
 * -0.0004 displays as 0 rather than as a negative zero.
 */
function snap(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  const rounded = Math.round(value * factor) / factor;
  return rounded === 0 ? 0 : rounded;
}

export interface FormatOptions {
  decimals?: number;
  /** Show a leading + on positive values. Used for deviations. */
  signed?: boolean;
}

/** Format a bare number. Non-finite input yields the empty marker, never NaN. */
export function formatNumber(
  value: number,
  locale: Locale,
  { decimals = 2, signed = false }: FormatOptions = {},
): string {
  if (!Number.isFinite(value)) return EMPTY_VALUE;
  return formatter(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    signDisplay: signed ? 'exceptZero' : 'auto',
  }).format(snap(value, decimals));
}

/** Quantities: whole units by default, since you cannot order 707.1 of a thing. */
export function formatQuantity(value: number, locale: Locale, decimals = 0): string {
  return formatNumber(value, locale, { decimals });
}

/** Money: always two decimals, currency symbol rendered separately. */
export function formatMoney(value: number, locale: Locale, decimals = 2): string {
  return formatNumber(value, locale, { decimals });
}

/** Percentages: the value is already in percent units, so 2.06 means 2.06%. */
export function formatPercent(
  value: number,
  locale: Locale,
  { decimals = 1, signed = false }: FormatOptions = {},
): string {
  return formatNumber(value, locale, { decimals, signed });
}

/**
 * The one scale a whole axis is written in.
 *
 * Chosen once, from the axis maximum, rather than per figure. Deciding per
 * figure is what produces a ruler reading 800K, 1M, 1.2M, where three
 * consecutive ticks are in two different units and a reader comparing two of
 * them has to convert one first. With one scale the same axis reads 800K,
 * 1,000K, 1,200K, and the ticks can be compared as the numbers they are.
 *
 * The thresholds keep an axis unscaled while its labels are still short,
 * because a reader should not be made to expand 20,625 into anything.
 */
export interface AxisScale {
  /** Divide a tick by this before formatting it. */
  divisor: number;
  /** What to append, including whatever separator the locale puts first. */
  unit: string;
}

export function axisScale(maxAbs: number, locale: Locale): AxisScale {
  const magnitude = Number.isFinite(maxAbs) ? Math.abs(maxAbs) : 0;

  // The ladder runs to billions, not to millions. Stopping at 1e6 is fine until
  // an axis reaches ten figures, and then every tick on it reads "20,000M":
  // scaled, but no shorter than the number it replaced, which is the one thing
  // a scaled axis exists to avoid. A tool costing millions of units a year at
  // thousands apiece gets there easily.
  const divisor =
    magnitude < 1e5 ? 1 : magnitude < 1e7 ? 1e3 : magnitude < 1e10 ? 1e6 : 1e9;
  if (divisor === 1) return { divisor: 1, unit: '' };

  // The suffix, and the space French puts before it, taken from Intl rather
  // than written out: "1K" in English, "1 k" in French, and everything except
  // the digits of that 1 is what a tick on this axis has to carry.
  const parts = formatter(locale, {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 0,
  }).formatToParts(divisor);

  const unit = parts
    .filter((part) => part.type !== 'integer' && part.type !== 'group')
    .map((part) => part.value)
    .join('');

  return { divisor, unit };
}

/**
 * One tick, written in the scale its axis chose.
 *
 * The origin keeps its bare zero. A scaled zero is still zero, and "0 k" asks
 * a reader to divide by a thousand to arrive back where they started.
 */
export function formatAxisTick(value: number, locale: Locale, scale: AxisScale): string {
  if (!Number.isFinite(value)) return EMPTY_VALUE;
  const scaled = value / scale.divisor;
  const figure = formatNumber(scaled, locale, { decimals: 0 });
  return scaled === 0 ? figure : `${figure}${scale.unit}`;
}

/**
 * The currency symbol on its own, so the layout can set it smaller and lighter
 * than the figure it qualifies.
 */
export function currencySymbol(currency: CurrencyCode, locale: Locale): string {
  const parts = formatter(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).formatToParts(0);
  return parts.find((part) => part.type === 'currency')?.value ?? currency;
}

/** Money with its symbol, for exports and anywhere a single string is needed. */
export function formatMoneyWithCurrency(
  value: number,
  locale: Locale,
  currency: CurrencyCode,
  decimals = 2,
): string {
  if (!Number.isFinite(value)) return EMPTY_VALUE;
  return formatter(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(snap(value, decimals));
}

/** The locale's decimal mark, taken from Intl rather than assumed. */
export function decimalMark(locale: Locale): string {
  const parts = formatter(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).formatToParts(1.1);
  return parts.find((part) => part.type === 'decimal')?.value ?? '.';
}

export interface SplitNumber {
  /** Everything up to and excluding the decimal mark. */
  integer: string;
  /** The decimal mark and the digits after it, or an empty string. */
  fraction: string;
}

/**
 * Split a formatted figure at its decimal mark so a table can align columns on
 * the decimal point instead of ragged right, even when rows carry a different
 * number of decimals.
 */
export function splitFormatted(formatted: string, locale: Locale): SplitNumber {
  const mark = decimalMark(locale);
  const index = formatted.lastIndexOf(mark);
  if (index === -1) return { integer: formatted, fraction: '' };
  return { integer: formatted.slice(0, index), fraction: formatted.slice(index) };
}

/**
 * Field separator for CSV. French Excel reads "," as a decimal mark, so a
 * comma-separated file with French numbers in it lands in one column.
 */
export function csvSeparator(locale: Locale): string {
  return locale === 'fr' ? ';' : ',';
}

/**
 * Format a value for display inside an input field: grouped, but with no
 * trailing zeros forced on, so a field reads "10 000" and "38,50" rather than
 * "10 000,00" and "38,500000".
 */
export function formatForInput(value: number, locale: Locale): string {
  if (!Number.isFinite(value)) return '';
  return formatter(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  }).format(value === 0 ? 0 : value);
}

/**
 * Format a figure for a spreadsheet cell: the locale's decimal mark, but no
 * grouping. Excel will not parse "1 414,21" as a number, because the grouping
 * character Intl emits is a narrow no-break space.
 */
export function formatForCsv(value: number, locale: Locale, decimals: number): string {
  if (!Number.isFinite(value)) return '';
  return formatter(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: false,
  }).format(snap(value, decimals));
}
