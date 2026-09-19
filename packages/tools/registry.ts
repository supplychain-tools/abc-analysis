import type { Locale } from '@sct/shared/lib/format';

/**
 * Who is in the family, and where each member lives.
 *
 * This is the one place that knows the roster. Before it existed, every tool
 * carried every other tool's address and name, in both languages, so adding
 * the third meant reopening the first two, and the fourth meant reopening
 * three: the work grew as N by N-1 rather than as N. Adding a tool is one
 * entry here now.
 *
 * It is deliberately not in @sct/shared. That package is defined by a rule it
 * can be checked against — nothing in it knows any tool's domain — and a
 * roster naming ABC and EOQ would break the rule and blunt the check. The
 * design system and the composition of the family are two different ideas, so
 * they are two different packages. The dependency runs one way: this knows
 * about shared, shared knows nothing about this.
 *
 * Addresses are written out rather than read from the environment. A preview
 * deployment therefore links to its siblings in production, which is the
 * honest behaviour: a preview of one tool says nothing about the others.
 */
export interface ToolEntry {
  /** Stable key, and the directory name under apps/. */
  id: string;
  /** Absolute, because the family spans sites rather than routes. */
  url: string;
  /** The tool's name, as its own interface says it. */
  name: Record<Locale, string>;
  /** One line: what it does, for a directory or a link title. */
  blurb: Record<Locale, string>;
}

/** The family name. Identical in both languages, so it is not a dictionary key. */
export const FAMILY = 'Supply Chain Tools';

export const TOOLS: readonly ToolEntry[] = [
  {
    id: 'eoq',
    url: 'https://eoq.vercel.app',
    name: { fr: 'Commande de stock', en: 'Inventory ordering' },
    blurb: {
      fr: 'Quantité économique de commande, stock de sécurité et coût d’une commande hors optimum.',
      en: 'Economic order quantity, safety stock, and the cost of ordering off the optimum.',
    },
  },
  {
    id: 'abc',
    url: 'https://abc-analyser.vercel.app',
    name: { fr: 'Analyse ABC', en: 'ABC analysis' },
    blurb: {
      fr: 'Classe les articles stockés par valeur de consommation annuelle, en A, B et C.',
      en: 'Ranks stocked items by annual consumption value into A, B and C.',
    },
  },
  {
    id: 'make-or-buy',
    url: 'https://make-or-buy.vercel.app',
    name: { fr: 'Produire ou acheter', en: 'Make or buy' },
    blurb: {
      fr: "Compare le coût annuel de la production interne à celui de l'achat, et trouve le volume de bascule.",
      en: 'Compares the annual cost of making a component in-house against buying it, and finds the break-even volume.',
    },
  },
];

/** One tool by id. Throws rather than returning undefined: an unknown id is a typo. */
export function toolById(id: string): ToolEntry {
  const tool = TOOLS.find((entry) => entry.id === id);
  if (tool === undefined) throw new Error(`unknown tool: ${id}`);
  return tool;
}

/**
 * What the shell needs to offer the rest of the family: every tool except the
 * one being looked at, since the shell already names that one itself.
 */
export function siblingsOf(id: string, locale: Locale): Array<{ href: string; label: string }> {
  toolById(id); // an unknown id would silently list everything
  return TOOLS.filter((tool) => tool.id !== id).map((tool) => ({
    href: tool.url,
    label: tool.name[locale],
  }));
}
