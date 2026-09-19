import Link from 'next/link';

/**
 * The 404, in both languages.
 *
 * A static export cannot know which locale the reader wanted: the page is
 * served before any script runs, and the choice lives in localStorage. So it
 * says the same thing twice rather than guessing wrong half the time.
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-[1440px] flex-col justify-center px-4 py-16 sm:px-6">
      <p className="t-label text-[color:var(--text-2)]">404</p>

      <h1 className="t-display mt-3">Cette page n’existe pas</h1>
      <p className="note t-body mt-3 text-[color:var(--text-2)]">
        L’adresse est peut-être incomplète, ou la page a changé de nom.
      </p>

      <p className="t-body mt-8" lang="en">
        <span className="font-semibold">This page does not exist.</span>{' '}
        <span className="text-[color:var(--text-2)]">
          The address may be incomplete, or the page may have been renamed.
        </span>
      </p>

      <p className="mt-8">
        <Link href="/" className="btn btn-primary t-body inline-flex items-center">
          Retour au calculateur — Back to the calculator
        </Link>
      </p>
    </main>
  );
}
