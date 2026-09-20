import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Metadata } from 'next';
import { Chivo_Mono, Fira_Sans } from 'next/font/google';

import { fr } from '@/lib/i18n/fr';

import './globals.css';

/**
 * Two families, doing two different jobs.
 *
 * Chivo Mono carries the figures. Two tests decided it. It is narrow for a
 * monospace, because a wide mono gives a comma a whole character cell and sets
 * 1 596,9 as `1 596 , 9`. And its zero is a plain oval: most monospaces mark
 * the zero to tell it from a capital O, with a dot or a slash, which is right
 * in a terminal and wrong in a column of money where no letter can appear.
 * Nine faces were set side by side at 58px to check that one glyph; only two
 * came back unmarked.
 *
 * Fira Sans carries the words. Drawn for interface text at small sizes, where
 * most of this page lives, and it has a real italic, which the equation needs:
 * a mathematical variable is set in italic in print and the mono has no italic
 * at all.
 */
const mono = Chivo_Mono({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-figure',
  display: 'swap',
  fallback: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
});

const text = Fira_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-text',
  display: 'swap',
  fallback: ['system-ui', 'Segoe UI', 'Helvetica Neue', 'Arial', 'sans-serif'],
});

/**
 * The canonical address, overridable so a fork or a preview deployment
 * advertises itself rather than this one. Social crawlers resolve the image
 * against it: a relative path alone gives them nothing to fetch.
 */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://eoq.vercel.app';

/**
 * The card's address carries a hash of the card itself.
 *
 * A network that has already scraped this page holds the old picture against
 * the bare path and will go on printing it. A path that changes when the
 * bytes change asks for the new one, and stays put when they do not.
 *
 * Read at build time, which is the only time it can be read: this is a static
 * export and there is no server later to ask.
 */
const ogImage =
  '/og.png?' +
  createHash('sha256')
    .update(readFileSync(join(process.cwd(), 'public', 'og.png')))
    .digest('hex')
    .slice(0, 16);

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  // No `title`: the page renders its own, in the language it is actually
  // in. Two titles would be React's and ours fighting over the tab.
  description: fr.meta.description,
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'Supply Chain Tools',
    title: fr.meta.title,
    description: fr.meta.description,
    url: '/',
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: 'La courbe du coût annuel en fonction de la quantité commandée, avec Q* marqué à son minimum.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: fr.meta.title,
    description: fr.meta.description,
    images: [ogImage],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // lang is corrected on the client once the stored or requested locale is
  // known; French is the default because that is the majority audience here.
  return (
    <html lang="fr" className={`${mono.variable} ${text.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
