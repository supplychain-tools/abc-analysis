import type { Metadata } from 'next';
import { Chivo_Mono, Fira_Sans } from 'next/font/google';

import { FAMILY } from '@sct/tools';

import { fr } from '@/lib/i18n/fr';

import './globals.css';

/**
 * Two families, doing two different jobs: mono carries every figure, the text
 * face carries every word, and neither ever does the other's job. The division
 * is the design system's, not this page's.
 *
 * Both faces are the ordering calculator's, chosen there and adopted here
 * rather than chosen again. Two tools in one family that set the same figure
 * and the same label in two different faces are two tools, whatever else they
 * share: the face is the first thing a reader recognises and the last thing
 * that should vary between siblings.
 *
 * The mono is Chivo Mono, the one the sibling tool carries its figures in, so
 * both tools set a number the same way.
 *
 * It is here for its zero. Most monospaces mark the zero to tell it from a
 * capital O — a dot inside it or a stroke across it — which is right in a
 * terminal and wrong in a column of money, where no letter can appear and the
 * mark reads as a decimal point that has landed in the wrong place. Overpass
 * Mono dots its zero and offers no alternate that removes it. Roboto Mono
 * replaced it here and turned out to strike a bar through its own, which is
 * the same mistake wearing a different hat: measured against a capital O at
 * 110px, the zero carries ink through its middle and the O carries none.
 * Chivo Mono's zero is a plain oval, measured the same way and empty.
 */
const mono = Chivo_Mono({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-figure',
  display: 'swap',
  fallback: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
});

/*
 * Fira Sans carries the words. Drawn for interface text at small sizes, which
 * is where nearly all of this page lives — a table of twenty-five rows is read
 * at 11 and 13px and almost nowhere else. The weights and the italic are
 * declared rather than left to the default: the table heads are set at 500,
 * the labels at 600, and the class letters at 700, so a subset carrying 400
 * alone would have the browser slant and embolden the face itself.
 */
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
 * advertises itself rather than this one.
 */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://abc-analyser.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  // No `title`: the page renders its own, in the language it is actually
  // in. Two titles would be React's and ours fighting over the tab.
  description: fr.meta.description,
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: FAMILY,
    title: fr.meta.title,
    description: fr.meta.description,
    url: '/',
  },
  twitter: {
    card: 'summary',
    title: fr.meta.title,
    description: fr.meta.description,
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
