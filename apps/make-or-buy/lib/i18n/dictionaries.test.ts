import { describe, expect, it } from 'vitest';

import { en } from './en';
import { fr } from './fr';

/**
 * TypeScript already refuses to compile a French dictionary that is missing a
 * key, since MakeOrBuyDictionary is typeof en. These tests catch what the type
 * system cannot see: a key present but empty, a key present but never actually
 * translated, and the copy drifting into the patterns the design plan bans.
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
 * Strings that are the same in both languages on purpose: a currency-free unit
 * written the same way, and words French borrows unchanged.
 */
const SHARED_BY_DESIGN = new Set([
  // Cognates: the French word is the English word.
  'sections.verdict',
  'tabs.verdict',
  'a11y.verdictRegion',
]);

describe('the two dictionaries', () => {
  it('carry exactly the same keys', () => {
    expect(french.map(([path]) => path).sort()).toEqual(english.map(([path]) => path).sort());
  });

  it('leave nothing blank', () => {
    for (const [path, value] of [...english, ...french]) {
      expect(value.trim(), `empty string at ${path}`).not.toBe('');
    }
  });

  it('actually translate everything that is not a cognate', () => {
    const untranslated = english
      .filter(([path, value]) => !SHARED_BY_DESIGN.has(path) && frenchByPath.get(path) === value)
      .map(([path]) => path);
    expect(untranslated).toEqual([]);
  });

  it('names every issue code the input layer can produce', () => {
    // Keeping these in step matters: an unmapped code would render as blank.
    const codes = [
      'must-be-non-negative',
      'must-be-positive',
      'yield-out-of-range',
      'percent-out-of-range',
      'at-least-one-year',
    ] as const;
    for (const code of codes) {
      expect(en.issues[code]).toBeTruthy();
      expect(fr.issues[code]).toBeTruthy();
    }
  });


  it('names every cost line both breakdowns can show', () => {
    const makeLines = [
      'materials',
      'labor',
      'variableOverhead',
      'scrapLoss',
      'fixedCosts',
      'tooling',
      'opportunityCost',
    ] as const;
    const buyLines = ['purchasePrice', 'freight', 'duty', 'inspection', 'switching'] as const;
    for (const id of makeLines) {
      expect(en.breakdown.makeLines[id]).toBeTruthy();
      expect(fr.breakdown.makeLines[id]).toBeTruthy();
    }
    for (const id of buyLines) {
      expect(en.breakdown.buyLines[id]).toBeTruthy();
      expect(fr.breakdown.buyLines[id]).toBeTruthy();
    }
  });

  it('keeps the placeholders in a sentence identical across the two languages', () => {
    // A sentence is assembled by substitution, so a placeholder dropped in
    // translation is a figure that silently never appears.
    const placeholders = (value: string) => (value.match(/\{\w+\}/g) ?? []).sort();
    for (const [path, value] of english) {
      const other = frenchByPath.get(path);
      if (other === undefined) continue;
      expect(placeholders(other), `placeholders at ${path}`).toEqual(placeholders(value));
    }
  });

  it('uses the French supply chain vocabulary, not a literal translation', () => {
    expect(fr.app.tool).toBe('Produire ou acheter');
    expect(fr.verdict.make).toBe('PRODUIRE');
    expect(fr.verdict.buy).toBe('ACHETER');
    expect(fr.breakEven.heading).toBe('Seuil d’indifférence');
    expect(fr.fields.annualVolume.label).toBe('Volume annuel');
    expect(fr.verdict.flipPrice).toBe('Prix d’indifférence');
  });

  it('gives every field a label, a unit and a hint in both languages', () => {
    for (const [key, copy] of Object.entries(en.fields)) {
      expect(copy.label, `label at ${key}`).toBeTruthy();
      expect(copy.unit, `unit at ${key}`).toBeTruthy();
      expect(copy.hint, `hint at ${key}`).toBeTruthy();
      const other = fr.fields[key as keyof typeof fr.fields];
      expect(other.label, `French label at ${key}`).toBeTruthy();
      expect(other.unit, `French unit at ${key}`).toBeTruthy();
      expect(other.hint, `French hint at ${key}`).toBeTruthy();
    }
  });

  it('keeps bascule as a verb, in the subtitle and nowhere else', () => {
    // Four labels once shared that one word for two different quantities: a
    // volume and a price. It is a verb here, used once.
    const uses = french.filter(([, value]) => /bascule/i.test(value)).map(([path]) => path);
    expect(uses).toEqual(['intro.lead']);
  });

  it('sets every apostrophe as a typographic one', () => {
    const straight = french.filter(([, value]) => value.includes("'")).map(([path]) => path);
    expect(straight).toEqual([]);
  });

  /* ---- The banned-patterns list, §7 of the design plan ------------- */

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

  it('uses no em dashes and no emoji', () => {
    for (const [path, value] of [...english, ...french]) {
      expect(value, `em dash at ${path}`).not.toContain('—');
      expect(value, `emoji at ${path}`).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });
});
