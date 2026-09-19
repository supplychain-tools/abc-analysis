import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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

/**
 * The social image, addressed by its contents.
 *
 * LinkedIn, Slack and the rest cache a preview by the image's URL and keep
 * serving their own copy of the bitmap long after the file behind it changes —
 * re-scraping the page does not help, because the address it finds is the
 * address they already hold. So the file's own hash rides along in the query
 * string: redraw the card and the address changes with it, and every crawler
 * sees a resource it has never fetched. Leave the card alone and the address
 * does not move, so nothing re-downloads for free.
 *
 * Read at build time, which is the only time it can be read: this is a static
 * export and there is no server later to ask. The path is the one `npm run og`
 * writes to. Next addresses its own icons exactly this way.
 */
const ogImage =
  '/og.png?' +
  createHash('sha256')
    .update(readFileSync(join(process.cwd(), 'public', 'og.png')))
    .digest('hex')
    .slice(0, 16);

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: fr.meta.title,
  description: fr.meta.description,
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: FAMILY,
    title: fr.meta.title,
    description: fr.meta.description,
    url: '/',
    images: [
      {
        url: ogImage,
        /* The file's real pixels, which are twice the 1200x630 the card is
           laid out at: it is captured at 2x so a feed's downscale stays
           sharp. The ratio is what a network lays out from, and that is
           unchanged. */
        width: 2400,
        height: 1260,
        alt: "Le nom de l'outil au-dessus du diagramme de Pareto de l'exemple : vingt-cinq articles classés par valeur annuelle décroissante, la courbe cumulée franchissant les seuils de 80 % et de 95 %, et les bandes A, B et C nommées sous les barres.",
      },
    ],
  },
  /* A large card rather than the small square one. Without an image declared
     at all, which is what this carried until now, LinkedIn and the rest print
     a bare link with no picture. */
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
