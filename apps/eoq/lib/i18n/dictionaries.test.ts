import { describe, expect, it } from 'vitest';

import { en } from './en';
import { fr } from './fr';

/**
 * TypeScript already refuses to compile a French dictionary that is missing a
 * key, since Dictionary is typeof en. These tests catch what the type system
 * cannot see: a key present but empty, and a key present but never actually
 * translated.
 */

type Leaf = [path: string, value: string];

function leaves(value: unknown, prefix = ''): Leaf[] {
  if (typeof value === 'string') return [[prefix, value]];
  if (value === null || typeof value !== 'object') return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    leaves(child, prefix === '' ? key : `${prefix}.${key}`),
  );
}

const english = leaves(en);
const french = leaves(fr);
const frenchByPath = new Map(french);

/**
 * Strings that are the same in both languages on purpose: mathematical
 * symbols, units written the same way, and the percent sign.
 */
const SHARED_BY_DESIGN = new Set([
  'fields.annualDemand.symbol',
  'fields.orderCost.symbol',
  'fields.holdingCostPerUnit.symbol',
  'fields.holdingRate.symbol',
  'fields.unitCost.symbol',
  'fields.daysPerYear.symbol',
  'fields.safetyStock.symbol',
  'holdingMode.derived',
  // Cognates: the French word is the English word.
  'penalty.optimum',
  'profile.cycle',
  'results.quantityShort',
  'penalty.columns.ratio',
  'penalty.columns.quantity',
  'units.percent',
  'chart.optimum',
  'chart.total',
]);

describe('the two dictionaries', () => {
  it('carry exactly the same keys', () => {
    expect(french.map(([path]) => path).sort()).toEqual(english.map(([path]) => path).sort());
  });

  /**
   * The working year is a practical setting rather than a model variable, so
   * it carries no symbol and the stripe down the rail stays honest about which
   * inputs are which. Deliberately empty, and asserted as such.
   */
  const DELIBERATELY_EMPTY = new Set(['fields.daysPerYear.symbol']);

  it('leaves blank only the symbol that is meant to be blank', () => {
    for (const [path, value] of [...english, ...french]) {
      if (DELIBERATELY_EMPTY.has(path)) {
        expect(value, `${path} should be empty`).toBe('');
      } else {
        expect(value.trim(), `empty string at ${path}`).not.toBe('');
      }
    }
  });

  it('actually translate everything that is not a symbol or a unit', () => {
    const untranslated = english
      .filter(([path, value]) => !SHARED_BY_DESIGN.has(path) && frenchByPath.get(path) === value)
      .map(([path]) => path);
    expect(untranslated).toEqual([]);
  });

  it('names every issue code a validator can produce', () => {
    // Keeping these in step matters: an unmapped code would render as blank.
    const codes = [
      'required',
      'not-a-number',
      'must-be-positive',
      'must-be-non-negative',
      'rate-out-of-range',
    ] as const;
    for (const code of codes) {
      expect(en.errors[code]).toBeTruthy();
      expect(fr.errors[code]).toBeTruthy();
    }
  });

  it('uses the French supply chain vocabulary, not a literal translation', () => {
    expect(fr.results.quantity).toBe('Quantité économique de commande');
    expect(fr.fields.orderCost.label).toBe('Coût de passation par commande');
    expect(fr.fields.holdingCostPerUnit.label).toBe('Coût de possession unitaire');
    expect(fr.results.safetyStock).toBe('Stock de sécurité');
    expect(fr.fields.safetyStock.label).toContain('Stock de sécurité');
  });

  it('keeps the copy free of the words the brief rules out', () => {
    const banned = [
      'seamless',
      'effortless',
      'robust',
      'comprehensive',
      'elevate',
      'unlock',
      'streamline',
      'empower',
      'cutting-edge',
      'intuitive',
      'powerful',
    ];
    for (const [path, value] of english) {
      for (const word of banned) {
        expect(value.toLowerCase(), `"${word}" at ${path}`).not.toContain(word);
      }
    }
  });

  it('has no exclamation marks and no rhetorical headings', () => {
    for (const [path, value] of [...english, ...french]) {
      expect(value, `exclamation at ${path}`).not.toContain('!');
      expect(value, `question heading at ${path}`).not.toMatch(/^[^.]*\?$/);
    }
  });
});
