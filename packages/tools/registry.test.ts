import { describe, expect, it } from 'vitest';

import { FAMILY, TOOLS, siblingsOf, toolById } from './registry';

const LOCALES = ['fr', 'en'] as const;

describe('the roster', () => {
  it('names the family once', () => {
    expect(FAMILY).toBe('Supply Chain Tools');
  });

  it('gives every tool a unique id and a unique address', () => {
    expect(new Set(TOOLS.map((t) => t.id)).size).toBe(TOOLS.length);
    expect(new Set(TOOLS.map((t) => t.url)).size).toBe(TOOLS.length);
  });

  it('gives every tool a name and a line in both languages', () => {
    for (const tool of TOOLS) {
      for (const locale of LOCALES) {
        expect(tool.name[locale], `${tool.id}.name.${locale}`).toMatch(/\S/);
        expect(tool.blurb[locale], `${tool.id}.blurb.${locale}`).toMatch(/\S/);
      }
    }
  });

  it('addresses every tool absolutely, because the family spans sites', () => {
    for (const tool of TOOLS) {
      expect(tool.url, tool.id).toMatch(/^https:\/\/[^/]+$/);
    }
  });

  it('carries the three tools built so far', () => {
    expect(TOOLS.map((t) => t.id)).toEqual(['eoq', 'abc', 'make-or-buy']);
  });
});

describe('siblingsOf', () => {
  it('offers every other tool, and never the one being looked at', () => {
    for (const tool of TOOLS) {
      for (const locale of LOCALES) {
        const siblings = siblingsOf(tool.id, locale);
        expect(siblings).toHaveLength(TOOLS.length - 1);
        expect(siblings.map((s) => s.href)).not.toContain(tool.url);
      }
    }
  });

  it('labels a sibling in the language of whoever is reading', () => {
    expect(siblingsOf('eoq', 'fr')).toEqual([
      { href: 'https://abc-analyser.vercel.app', label: 'Analyse ABC' },
      { href: 'https://make-or-buy.vercel.app', label: 'Produire ou acheter' },
    ]);
    expect(siblingsOf('abc', 'en')).toEqual([
      { href: 'https://eoq.vercel.app', label: 'Inventory ordering' },
      { href: 'https://make-or-buy.vercel.app', label: 'Make or buy' },
    ]);
  });

  it('refuses an id that is not in the roster, rather than listing everything', () => {
    expect(() => siblingsOf('nope', 'fr')).toThrow(/unknown tool/);
    expect(() => toolById('nope')).toThrow(/unknown tool/);
  });
});
