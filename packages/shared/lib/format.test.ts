import { describe, expect, it } from 'vitest';

import {
  csvSeparator,
  currencySymbol,
  decimalMark,
  EMPTY_VALUE,
  axisScale,
  formatAxisTick,
  formatMoney,
  formatMoneyWithCurrency,
  formatNumber,
  formatPercent,
  formatQuantity,
  parseNumber,
  splitFormatted,
} from './format';

/** Compare ignoring which flavour of space Intl chose for grouping. */
function normalise(text: string): string {
  return text.replace(/\s/g, ' ');
}

describe('parsing what the user typed', () => {
  it('reads the three conventions the brief calls out', () => {
    expect(parseNumber('1 234,56', 'fr')).toBeCloseTo(1234.56, 10);
    expect(parseNumber('1,234.56', 'fr')).toBeCloseTo(1234.56, 10);
    expect(parseNumber('1234.56', 'fr')).toBeCloseTo(1234.56, 10);
    expect(parseNumber('1 234,56', 'en')).toBeCloseTo(1234.56, 10);
    expect(parseNumber('1,234.56', 'en')).toBeCloseTo(1234.56, 10);
    expect(parseNumber('1234.56', 'en')).toBeCloseTo(1234.56, 10);
  });

  it('accepts every grouping space, including the ones Intl itself emits', () => {
    // Plain, no-break, narrow no-break, thin and figure spaces, addressed by
    // code point so the test does not rely on invisible characters surviving
    // a copy, a paste or an editor.
    for (const code of [0x20, 0xa0, 0x202f, 0x2009, 0x2007]) {
      const space = String.fromCharCode(code);
      expect(parseNumber(`1${space}234,56`, 'fr')).toBeCloseTo(1234.56, 10);
      expect(parseNumber(`1${space}234.56`, 'en')).toBeCloseTo(1234.56, 10);
    }
  });

  it('takes the rightmost separator as the decimal mark when both appear', () => {
    expect(parseNumber('1.234,56', 'fr')).toBeCloseTo(1234.56, 10);
    expect(parseNumber('1.234,56', 'en')).toBeCloseTo(1234.56, 10);
    expect(parseNumber('9.876.543,21', 'fr')).toBeCloseTo(9876543.21, 10);
    expect(parseNumber('9,876,543.21', 'en')).toBeCloseTo(9876543.21, 10);
  });

  it('resolves the ambiguous 1,234 by locale', () => {
    expect(parseNumber('1,234', 'en')).toBe(1234);
    expect(parseNumber('1,234', 'fr')).toBeCloseTo(1.234, 10);
  });

  it('treats a lone period as a decimal mark in both locales', () => {
    expect(parseNumber('1.234', 'en')).toBeCloseTo(1.234, 10);
    expect(parseNumber('1.234', 'fr')).toBeCloseTo(1.234, 10);
    expect(parseNumber('0.5', 'fr')).toBeCloseTo(0.5, 10);
  });

  it('reads repeated separators as grouping', () => {
    expect(parseNumber('1,234,567', 'en')).toBe(1234567);
    expect(parseNumber('1.234.567', 'fr')).toBe(1234567);
    expect(parseNumber('1.234.567', 'en')).toBe(1234567);
  });

  it('handles signs, bare fractions and trailing marks', () => {
    expect(parseNumber('-5', 'en')).toBe(-5);
    expect(parseNumber('+5', 'en')).toBe(5);
    expect(parseNumber('.5', 'en')).toBeCloseTo(0.5, 10);
    expect(parseNumber(',5', 'fr')).toBeCloseTo(0.5, 10);
    expect(parseNumber('5.', 'en')).toBe(5);
    expect(parseNumber('  42  ', 'en')).toBe(42);
  });

  it('accepts a trailing percent sign so 20% and 20 agree', () => {
    expect(parseNumber('20%', 'en')).toBe(20);
    expect(parseNumber('95 %', 'fr')).toBe(95);
    expect(parseNumber('0,2 %', 'fr')).toBeCloseTo(0.2, 10);
  });

  it('rejects what is not a number', () => {
    expect(parseNumber('', 'en')).toBeNull();
    expect(parseNumber('   ', 'en')).toBeNull();
    expect(parseNumber('abc', 'en')).toBeNull();
    expect(parseNumber('12abc', 'en')).toBeNull();
    expect(parseNumber('1e5', 'en')).toBeNull();
    expect(parseNumber('-', 'en')).toBeNull();
    expect(parseNumber('.', 'en')).toBeNull();
    expect(parseNumber('$50', 'en')).toBeNull();
  });

  it('rejects malformed grouping instead of silently dropping digits', () => {
    expect(parseNumber('1,23,456', 'en')).toBeNull();
    expect(parseNumber('12,34', 'en')).toBeCloseTo(12.34, 10);
    expect(parseNumber('1,2345', 'en')).toBeCloseTo(1.2345, 10);
    expect(parseNumber('1.234.56', 'en')).toBeNull();
  });

  it('never returns a negative zero', () => {
    expect(Object.is(parseNumber('-0', 'en'), -0)).toBe(false);
    expect(parseNumber('-0', 'en')).toBe(0);
  });

  it('round-trips its own formatted output', () => {
    for (const locale of ['fr', 'en'] as const) {
      for (const value of [0, 1, 12.5, 707.11, 1234.56, 9876543.21]) {
        const formatted = formatNumber(value, locale, { decimals: 2 });
        expect(parseNumber(formatted, locale)).toBeCloseTo(value, 8);
      }
    }
  });
});

describe('formatting', () => {
  it('uses a comma decimal mark and grouped spaces in French', () => {
    expect(normalise(formatNumber(1234.5, 'fr', { decimals: 2 }))).toBe('1 234,50');
    expect(decimalMark('fr')).toBe(',');
  });

  it('uses a period decimal mark and grouped commas in English', () => {
    expect(formatNumber(1234.5, 'en', { decimals: 2 })).toBe('1,234.50');
    expect(decimalMark('en')).toBe('.');
  });

  it('holds precision steady: quantities whole, money to two, percent to one', () => {
    expect(formatQuantity(707.1067812, 'en')).toBe('707');
    expect(formatQuantity(707.1067812, 'en', 1)).toBe('707.1');
    expect(formatMoney(1414.2135624, 'en')).toBe('1,414.21');
    expect(formatPercent(0.76274, 'en')).toBe('0.8');
  });

  it('shows a sign on deviations when asked', () => {
    expect(formatPercent(9.5445, 'en', { signed: true })).toBe('+9.5');
    expect(formatPercent(-8.7129, 'en', { signed: true })).toBe('-8.7');
    expect(formatPercent(0, 'en', { signed: true })).toBe('0.0');
  });

  it('never renders NaN, Infinity or a negative zero', () => {
    expect(formatNumber(NaN, 'en')).toBe(EMPTY_VALUE);
    expect(formatNumber(Infinity, 'en')).toBe(EMPTY_VALUE);
    expect(formatNumber(-Infinity, 'fr')).toBe(EMPTY_VALUE);
    expect(formatMoneyWithCurrency(NaN, 'fr', 'MAD')).toBe(EMPTY_VALUE);
    expect(formatNumber(-0, 'en', { decimals: 2 })).toBe('0.00');
    expect(formatNumber(-0.0004, 'en', { decimals: 2 })).toBe('0.00');
    expect(formatNumber(-0.004, 'fr', { decimals: 1 })).toBe('0,0');
  });

  it('gives the currency symbol on its own so it can be set apart', () => {
    expect(currencySymbol('EUR', 'fr')).toBe('€');
    expect(currencySymbol('USD', 'en')).toBe('$');
    expect(currencySymbol('MAD', 'en').length).toBeGreaterThan(0);
  });

  it('formats money with its symbol for exports', () => {
    expect(normalise(formatMoneyWithCurrency(1234.5, 'en', 'USD'))).toBe('$1,234.50');
    expect(normalise(formatMoneyWithCurrency(1234.5, 'fr', 'EUR'))).toBe('1 234,50 €');
  });
});

describe('splitting a figure for decimal alignment', () => {
  it('splits at the locale decimal mark', () => {
    expect(splitFormatted('1,234.50', 'en')).toEqual({ integer: '1,234', fraction: '.50' });
    expect(splitFormatted(normalise(formatNumber(1234.5, 'fr', { decimals: 2 })), 'fr')).toEqual({
      integer: '1 234',
      fraction: ',50',
    });
  });

  it('leaves a whole number with an empty fraction', () => {
    expect(splitFormatted('707', 'en')).toEqual({ integer: '707', fraction: '' });
  });

  it('does not mistake English grouping commas for a decimal mark', () => {
    expect(splitFormatted('1,234,567', 'en')).toEqual({ integer: '1,234,567', fraction: '' });
  });
});

describe('axis tick figures', () => {
  it('leaves a short axis unscaled, so nothing has to be expanded', () => {
    const scale = axisScale(20_625, 'en');

    expect(scale).toEqual({ divisor: 1, unit: '' });
    expect(formatAxisTick(20_000, 'en', scale)).toBe('20,000');
  });

  it('writes a whole axis in one unit rather than deciding per tick', () => {
    // The defect this exists to stop: 800K, 1M, 1.2M on one ruler, where two
    // consecutive ticks are in different units.
    const scale = axisScale(1_280_000, 'en');

    expect(formatAxisTick(800_000, 'en', scale)).toBe('800K');
    expect(formatAxisTick(1_000_000, 'en', scale)).toBe('1,000K');
    expect(formatAxisTick(1_200_000, 'en', scale)).toBe('1,200K');
  });

  it('steps up to millions only once thousands would run long', () => {
    expect(formatAxisTick(9.5e7, 'en', axisScale(9.5e7, 'en'))).toBe('95M');
    expect(formatAxisTick(2e7, 'en', axisScale(2e7, 'en'))).toBe('20M');
  });

  it('steps up again to billions, rather than printing 20,000M', () => {
    // A tool costing millions of units a year at thousands apiece reaches ten
    // figures, and millions stop shortening anything there.
    expect(formatAxisTick(4e10, 'en', axisScale(4.4e10, 'en'))).toBe('40B');
    expect(formatAxisTick(2e10, 'en', axisScale(4.4e10, 'en'))).toBe('20B');
    expect(normalise(formatAxisTick(2e10, 'fr', axisScale(4.4e10, 'fr')))).toBe('20 Md');
  });

  it('keeps millions until the axis actually needs billions', () => {
    // The boundary itself: 9.9 thousand million still reads better as millions.
    expect(axisScale(9.9e9, 'en').divisor).toBe(1e6);
    expect(axisScale(1.2e10, 'en').divisor).toBe(1e9);
  });

  it('takes the suffix and its spacing from the locale, not from a table', () => {
    // French sets a space before a lowercase k; English sets neither.
    expect(normalise(formatAxisTick(800_000, 'fr', axisScale(1_280_000, 'fr')))).toBe('800 k');
    expect(formatAxisTick(800_000, 'en', axisScale(1_280_000, 'en'))).toBe('800K');
  });

  it('leaves the origin as a bare zero', () => {
    // "0K" would ask a reader to divide by a thousand to get back to nothing.
    expect(formatAxisTick(0, 'en', axisScale(1_280_000, 'en'))).toBe('0');
    expect(formatAxisTick(0, 'fr', axisScale(1_280_000, 'fr'))).toBe('0');
  });

  it('yields the empty marker rather than NaN', () => {
    const scale = axisScale(1_280_000, 'en');

    expect(formatAxisTick(Number.NaN, 'en', scale)).toBe(EMPTY_VALUE);
    expect(formatAxisTick(Number.POSITIVE_INFINITY, 'en', scale)).toBe(EMPTY_VALUE);
  });

  it('survives an axis with no magnitude at all', () => {
    expect(axisScale(0, 'en')).toEqual({ divisor: 1, unit: '' });
    expect(axisScale(Number.NaN, 'en')).toEqual({ divisor: 1, unit: '' });
  });
});

describe('CSV field separator', () => {
  it('uses a semicolon in French, where the comma is the decimal mark', () => {
    expect(csvSeparator('fr')).toBe(';');
    expect(csvSeparator('en')).toBe(',');
  });
});
