import type { Metadata } from 'next';
import { Archivo, Chivo_Mono } from 'next/font/google';

import { FAMILY } from '@sct/tools';

import { fr } from '@/lib/i18n/fr';

import './globals.css';

/**
 * Two families, doing two different jobs: mono carries every figure, Archivo
 * carries every word, and neither ever does the other's job. The division is
 * the design system's, not this page's.
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
