'use client';

import { useEffect } from 'react';

/**
 * The document's language, which only the client knows.
 *
 * It is chosen in the page, out of a stored preference, a `?lang=` on the
 * link or the browser's own, and the markup is rendered before any of that
 * is known. So `lang` on <html> is the server's guess until this runs.
 *
 * The tab is not set here, and the attempt to set it is worth recording.
 * Next renders a <title> of its own from the `metadata` export, React owns
 * that element, and React re-renders it during hydration: an effect that
 * writes `document.title` is overwritten a moment later, and an effect that
 * writes it back is in a race it does not reliably win. A tool that wants a
 * tab in the reader's language renders its own <title> in the tree and lets
 * React keep it in step, and leaves `title` out of its metadata so there is
 * only one of them. See any of the three pages for the shape of it.
 */
export function useDocumentLanguage(locale: string): void {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
}
