'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { classify } from '@/lib/classify';
import { getAbcDictionary } from '@/lib/i18n';
import {
  blankRow,
  exampleRows,
  openingRows,
  reformatRows,
  toItems,
  type ItemRow,
} from '@/lib/rows';
import { ClassSummary } from '@/components/ClassSummary';
import { ItemTable } from '@/components/ItemTable';
import { ParetoChart } from '@/components/ParetoChart';
import { ResultTable } from '@/components/ResultTable';
import { SettingsProvider, useSettings } from '@/components/Settings';
import type { CurrencyCode, Locale } from '@sct/shared/lib/format';
import { AppShell } from '@sct/shared/ui/AppShell';
import { SETTINGS_STORAGE_KEY } from '@sct/shared/ui/settings';

/**
 * Layout effects run after the DOM is committed but before the browser paints,
 * so the resolved language is in place before there is anything on screen to
 * read. A plain effect leaves a window in which the table is showing English
 * numbers to a French reader. useLayoutEffect has no meaning while
 * prerendering, hence the guard.
 */
const useBeforePaint = typeof window === 'undefined' ? useEffect : useLayoutEffect;

interface StoredSettings {
  locale?: Locale;
  currency?: CurrencyCode;
}

function readStoredSettings(): StoredSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    return raw === null ? {} : (JSON.parse(raw) as StoredSettings);
  } catch {
    // A blocked or full localStorage is not a reason to fail to load.
    return {};
  }
}

export default function AbcPage() {
  const [locale, setLocale] = useState<Locale>('fr');
  const [currency, setCurrency] = useState<CurrencyCode>('MAD');

  // The tool opens on an empty row, ready for the reader's own numbers, with
  // the worked example one button away. The sibling calculator opens the same
  // way, so the family does not ask to be learned twice.
  const [rows, setRows] = useState<ItemRow[]>(() => openingRows());
  const ready = useRef(false);

  /* ---- First load: the reader's language and currency ---- */
  useBeforePaint(() => {
    const stored = readStoredSettings();
    const params = new URLSearchParams(window.location.search);
    const requested = params.get('lang');

    // A link's own language wins, then a remembered choice, then the browser's.
    // The same order as the sibling tool, so the family answers a reader the
    // same way whichever of the two they happen to open first. Currency starts
    // at MAD in both and is remembered once changed.
    const resolved: Locale =
      requested === 'fr' || requested === 'en'
        ? requested
        : (stored.locale ??
          (typeof navigator !== 'undefined' && navigator.language.startsWith('fr') ? 'fr' : 'en'));

    setLocale(resolved);
    if (stored.currency !== undefined) setCurrency(stored.currency);
    ready.current = true;

    // A hook for the end-to-end suite: React attaches its handlers during
    // hydration, and until then a click on a button does nothing at all.
    document.documentElement.dataset.ready = 'true';
  }, []);

  useEffect(() => {
    if (!ready.current) return;
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ locale, currency }));
    } catch {
      // Nothing to do: the tool works fine without a remembered preference.
    }
  }, [locale, currency]);

  const t = useMemo(() => getAbcDictionary(locale), [locale]);

  // Language is chosen on the client, so these two are the server's guess
  // until the stored or requested locale is known. Both are corrected here.
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = t.meta.title;
  }, [locale, t]);

  // The whole computation, on every keystroke. It is a sort and two passes
  // over at most a few hundred rows, which is nothing next to the render it
  // feeds, so there is no calculate button and nothing to keep in step.
  const analysis = useMemo(() => classify(toItems(rows, locale)), [rows, locale]);

  const changeLocale = useCallback(
    (next: Locale) => {
      // Figures follow the reader's convention. Names do not: by now they may
      // have been edited, and rewriting them would be editing the data.
      setRows((current) => reformatRows(current, locale, next));
      setLocale(next);
    },
    [locale],
  );

  const edit = useCallback((id: string, patch: Partial<Omit<ItemRow, 'id'>>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }, []);

  // Removing the last row would leave nothing to type into, so the table
  // always keeps one. Clearing is never a door that closes behind you.
  const remove = useCallback((id: string) => {
    setRows((current) => {
      const kept = current.filter((row) => row.id !== id);
      return kept.length === 0 ? [blankRow()] : kept;
    });
  }, []);

  const add = useCallback(() => {
    setRows((current) => [...current, blankRow()]);
  }, []);

  /* Filling the table and emptying it are the two things done to the whole
     document rather than to any one row, which is what the shell's action slot
     is for. They sat over the table itself, which put them inside the thing
     they act on and left them to scroll away with it.

     Both quiet, following the sibling tool. The example button used to fill
     solid while the table was empty, to point at the one useful thing on an
     untouched page; a filled button in a header is loud in every state that
     follows, and the empty panel already says what the example does and why. */
  const actions = (
    <>
      <button
        type="button"
        className="btn btn-quiet t-micro"
        data-testid="load-example"
        onClick={() => setRows(exampleRows(locale))}
      >
        {t.actions.loadExample}
      </button>
      <button
        type="button"
        className="btn btn-quiet t-micro"
        data-testid="clear-all"
        onClick={() => setRows([blankRow()])}
      >
        {t.actions.clearAll}
      </button>
    </>
  );

  return (
    <SettingsProvider value={{ locale, currency, t }}>
      <a href="#items" className="sr-only">
        {t.a11y.skipToTable}
      </a>

      {/* The header names this tool and nothing else.

          The shell takes an optional family name and an optional list of
          sibling tools, and both are withheld here on purpose: a reader who
          arrives at this page came for an ABC analysis, and a row of links out
          of it is an invitation to leave before they have done the one thing
          the page is for. The shell is built for exactly this — a tool that
          stands on its own carries a single name rather than a path. */}
      <AppShell
        labels={{
          tool: t.app.tool,
          language: t.app.language,
          currency: t.app.currency,
        }}
        onLocaleChange={changeLocale}
        onCurrencyChange={setCurrency}
        actions={actions}
      />

      <main className="mx-auto max-w-[1440px] px-4 pb-16 pt-4 sm:px-6">
        {/* The table first, across the page, and the reading under it.

            The sibling calculator puts its input in a rail down the left and
            its output beside it, and that was tried here and abandoned. It
            works there because six fields fit in a narrow column. The input
            here is a table of thirty rows and seven columns: pushed into half
            the page it is a table read through a slot, and the diagram beside
            it is a Pareto chart of thirty bars squeezed into four hundred
            pixels. Both halves lose, to keep a convention.

            So this tool takes the width for the thing that needs it. You fill
            the table, then you look under it: what each class holds on the
            left, the curve it came from on the right. */}
        <div className="grid gap-4">
          <ItemTable rows={rows} analysis={analysis} onEdit={edit} onRemove={remove} onAdd={add} />

          {/* The phone's second table is the computed half of the one above it,
              so it stays with the table it was cut from rather than joining
              the reading. */}
          {analysis.isEmpty ? null : <ResultTable analysis={analysis} />}

          {/* Two sheets, not one.

              What each class holds and the curve it was read off were joined
              into a single hairline-divided sheet, on the reasoning that they
              are one argument told twice. They are not read that way. The
              cards are a verdict you take in at a glance and stop at; the
              diagram is something you go into, point at and follow. Sharing a
              surface asked the eye to carry straight on from one into the
              other, and put a full-width plot directly under three boxes with
              nothing between them to say the reading had changed shape.

              Apart, each is the thing it is, and the ground between them does
              the separating — which is how every other sheet on this page is
              contained. */}
          {analysis.isEmpty ? (
            <EmptyState />
          ) : (
            <>
              <ClassSummary bands={analysis.bands} />
              <ParetoChart analysis={analysis} />
            </>
          )}
        </div>
      </main>
    </SettingsProvider>
  );
}

/**
 * What stands where the chart does when there is no value to chart. It says
 * what to type and leaves the example one click away, immediately above it.
 */
function EmptyState() {
  const { t } = useSettings();

  return (
    <section className="panel" data-testid="empty-state">
      <div className="panel-head">
        <h2 className="t-label">{t.sections.chart}</h2>
      </div>
      <div className="panel-body py-8">
        <p className="t-figure font-sans">{t.empty.title}</p>
        <p className="note t-body mt-2 text-[color:var(--text-2)]">{t.empty.message}</p>
      </div>
    </section>
  );
}
