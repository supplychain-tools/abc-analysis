'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { getMakeOrBuyDictionary } from '@/lib/i18n';
import {
  EMPTY_VALUES,
  checkValues,
  exampleValues,
  isBlank,
  reformatValues,
  toInput,
  type FieldName,
  type FormValues,
} from '@/lib/inputs';
import { compare } from '@/lib/makeorbuy';
import { Breakdown } from '@/components/Breakdown';
import { BreakEvenChart } from '@/components/BreakEvenChart';
import { Inputs } from '@/components/Inputs';
import { SettingsProvider, useSettings } from '@/components/Settings';
import { Tabs } from '@/components/Tabs';
import { Verdict } from '@/components/Verdict';
import type { CurrencyCode, Locale } from '@sct/shared/lib/format';
import { AppShell } from '@sct/shared/ui/AppShell';
import { SETTINGS_STORAGE_KEY } from '@sct/shared/ui/settings';

/**
 * Layout effects run after the DOM is committed but before the browser paints,
 * so the resolved language is in place before there is anything on screen to
 * read. A plain effect leaves a window in which the page is showing English
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

export default function MakeOrBuyPage() {
  const [locale, setLocale] = useState<Locale>('fr');
  const [currency, setCurrency] = useState<CurrencyCode>('MAD');

  // The page opens on a clear form, ready for the reader's own part, with the
  // worked example one button away. Both siblings open the same way, so the
  // family does not ask to be learned three times — and a page that opens
  // already answered invites the answer to be read as the reader's own.
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const ready = useRef(false);

  useBeforePaint(() => {
    const stored = readStoredSettings();
    const params = new URLSearchParams(window.location.search);
    const requested = params.get('lang');

    // A link's own language wins, then a remembered choice, then the browser's.
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

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useMemo(() => getMakeOrBuyDictionary(locale), [locale]);

  // The whole computation, on every keystroke. It is a few dozen
  // multiplications, which is nothing next to the render it feeds, so there is
  // no calculate button and nothing to keep in step.
  const input = useMemo(() => toInput(values, locale), [values, locale]);
  const result = useMemo(() => compare(input), [input]);
  const issues = useMemo(() => checkValues(values, locale), [values, locale]);

  const changeLocale = useCallback(
    (next: Locale) => {
      setValues((current) => reformatValues(current, locale, next));
      setLocale(next);
    },
    [locale],
  );

  const editField = useCallback((field: FieldName, value: string) => {
    setValues((current) => ({ ...current, fields: { ...current.fields, [field]: value } }));
  }, []);





  const actions = (
    <>
      <button
        type="button"
        className="btn btn-quiet t-micro"
        data-testid="load-example"
        onClick={() => setValues(exampleValues(locale))}
      >
        {t.actions.loadExample}
      </button>
      <button
        type="button"
        className="btn btn-quiet t-micro"
        data-testid="clear-all"
        onClick={() => setValues(EMPTY_VALUES)}
      >
        {t.actions.clearAll}
      </button>
    </>
  );

  const tabs = [
    {
      id: 'verdict',
      label: t.tabs.verdict,
      content: (
        <>
          <Verdict result={result} input={input} />
          <Breakdown result={result} />
        </>
      ),
    },
    {
      id: 'volume',
      label: t.tabs.volume,
      content: <BreakEvenChart input={input} result={result} />,
    },
  ];

  return (
    <SettingsProvider value={{ locale, currency, t }}>
      <a href="#inputs" className="sr-only">
        {t.a11y.skipToInputs}
      </a>

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

      {/* Figures down one side, what they produce on the other. main carries
          the split itself, the way it does in both sibling tools: the page is
          a question and an answer and has nothing above either of them.

          The rail is sticky and scrolls inside itself, so a reader changing a
          figure watches the answer change without the two ever being on
          different screens. On a narrow window the split closes and the rail
          comes first, which is the order the work runs in. */}
      <main className="mx-auto grid max-w-[1440px] items-start gap-4 px-4 pb-16 pt-4 sm:px-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* The rail is one sheet, not a stack of cards. Its groups are
            headings on that sheet, divided by the hairlines the stack draws,
            because they are one continuous reading rather than three
            unrelated ones. */}
        <div className="min-w-0">
          <form
            id="inputs"
            aria-label={t.a11y.inputRail}
            className="input-rail panel p-4"
            // There is nothing to submit: the figures are already live, and
            // the form carries no submit button. This is a guard rather than
            // a handler, for the single-field case where a browser would
            // otherwise treat Enter as implicit submission and reload.
            onSubmit={(event) => event.preventDefault()}
          >
            <Inputs
              values={values}
              issues={issues}
              onChangeField={editField}
            />
          </form>
        </div>

        <div className="grid min-w-0 content-start gap-4">
          {result.isEmpty ? (
            <EmptyState />
          ) : (
            <>
              <div>
                <Tabs tabs={tabs} label={t.tabs.label} />
              </div>
            </>
          )}
        </div>
      </main>
    </SettingsProvider>
  );
}

/**
 * What stands where the answer does when there is no volume to cost. It says
 * what to enter, and leaves the example one click away in the header.
 */
function EmptyState() {
  const { t } = useSettings();

  return (
    <section className="panel" data-testid="empty-state">
      <div className="panel-body py-8">
        <h2 className="t-label mb-3 text-[color:var(--text-2)]">{t.sections.verdict}</h2>
        <p className="t-figure font-sans">{t.empty.title}</p>
        <p className="note t-body mt-2 text-[color:var(--text-2)]">{t.empty.message}</p>
      </div>
    </section>
  );
}
