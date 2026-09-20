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
