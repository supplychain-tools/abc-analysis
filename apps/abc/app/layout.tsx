import type { Metadata } from 'next';
import { Archivo, Roboto_Mono } from 'next/font/google';

import { FAMILY } from '@sct/tools';

import { fr } from '@/lib/i18n/fr';

import './globals.css';

/**
 * Two families, doing two different jobs: mono carries every figure, Archivo
 * carries every word, and neither ever does the other's job. The division is
 * the design system's, not this page's.
 *
 * The mono is Roboto Mono rather than the Overpass Mono the sibling tool
 * loads, for one reason: Overpass Mono draws a dot inside its zero and offers
 * no alternate that removes it — not the `zero` feature, not a stylistic set.
 * A dotted zero is a programmer's convention, for telling 0 from O in a
 * typeface where they collide. Nothing on this page is code, every figure is a
 * quantity or an amount of money, and the mark reads as a decimal point that
 * has landed in the wrong place. Of the faces tested with a plain zero — Noto
 * Sans Mono, DM Mono and Inconsolata all slash theirs, Space Mono dots it —
 * this was the one that left it alone.
 */
const mono = Roboto_Mono({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-figure',
  display: 'swap',
  fallback: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
});

const text = Archivo({
  subsets: ['latin'],
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
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'Un diagramme de Pareto : quelques articles portent 80 % de la valeur de consommation annuelle, le reste forme une longue traîne.',
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
    images: ['/og.png'],
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
