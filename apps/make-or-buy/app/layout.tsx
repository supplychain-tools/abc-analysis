import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Metadata } from 'next';
import { Chivo_Mono, Fira_Sans } from 'next/font/google';

import { FAMILY } from '@sct/tools';

import { fr } from '@/lib/i18n/fr';

import './globals.css';

/**
 * Two families, doing two different jobs. The same pair the ordering tool
 * loads, because the division is the design system's and not this page's:
 * mono carries every figure, the text face carries every word, and neither
 * ever does the other's job.
 *
 * Fira Sans rather than Archivo, which this tool loaded while it was being
 * built alone. Two things follow from the swap and both are why it is the
 * right face here. It is drawn for interface text at small sizes, which is
 * where most of this page lives. And it has a real italic, which a comparison
 * with two sides needs: a mathematical variable is set in italic in print,
 * and the mono has no italic at all.
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
 * advertises itself rather than this one.
 */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://make-or-buy.vercel.app';

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
 * writes to.
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
        alt: "Le nom de l'outil au-dessus du graphique du seuil d'indifférence : le coût annuel total de la production et celui de l'achat selon le volume, sur deux bandes de couleur qui nomment l'option la moins chère de chaque côté du volume où l'arbitrage change.",
      },
    ],
  },
  /* A large card rather than the small square one. With `summary` and no image
     declared, which is what this carried until now, a link to the tool was
     printed as a line of text with no picture at all. */
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
