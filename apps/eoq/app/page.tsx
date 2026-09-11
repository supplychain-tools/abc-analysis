'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { AnswerPanel } from '@/components/AnswerPanel';
import { Equation } from '@/components/Equation';
import { Tabs } from '@/components/Tabs';
import { AppShell } from '@sct/shared/ui/AppShell';
import { CostCurve } from '@/components/CostCurve';
import { InventoryProfile } from '@/components/InventoryProfile';
import { InputRail } from '@/components/InputRail';
import { CostPenaltyTable } from '@/components/CostPenaltyTable';
import { SettingsProvider } from '@/components/Settings';
import { derive } from '@/lib/derive';
import type { CurrencyCode, Locale } from '@sct/shared/lib/format';
import { getDictionary } from '@/lib/i18n';
import {
  BLANK_STATE,
  EXAMPLE_STATE,
  decodeState,
  encodeState,
  reformatState,
  type ToolState,
} from '@/lib/state';
import type { FieldName } from '@/lib/validate';

import { SETTINGS_STORAGE_KEY } from '@sct/shared/ui/settings';

/**
 * Layout effects run after the DOM is committed but before the browser paints,
 * so state read from the URL is in place before anything is on screen to click.
 * A plain effect leaves a window in which the page is interactive but still
 * holds its defaults, and an export taken in that window would be blank.
 * useLayoutEffect has no meaning while prerendering, hence the guard.
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

export default function Page() {
  const [locale, setLocale] = useState<Locale>('fr');
  const [currency, setCurrency] = useState<CurrencyCode>('MAD');
  const [state, setState] = useState<ToolState>(() => reformatState(BLANK_STATE, 'en', 'fr'));
  const [revealErrors, setRevealErrors] = useState(false);
  const ready = useRef(false);

  /* ---- First load: stored settings, then the URL, then a clear field ---- */
  useBeforePaint(() => {
    const stored = readStoredSettings();
    const params = new URLSearchParams(window.location.search);
    const requested = params.get('lang');

    const resolved: Locale =
      requested === 'fr' || requested === 'en'
        ? requested
        : (stored.locale ??
          (typeof navigator !== 'undefined' && navigator.language.startsWith('fr') ? 'fr' : 'en'));

    setLocale(resolved);
    if (stored.currency !== undefined) setCurrency(stored.currency);

    // A clear field unless the URL carries one: the tool opens ready for the
    // user's own numbers, and the worked example is one button away.
    const shared = decodeState(window.location.search, resolved);
    setState(shared ?? reformatState(BLANK_STATE, 'en', resolved));
    ready.current = true;

    // A hook for the end-to-end suite: React attaches its handlers during
    // hydration, and until then a click on a button does nothing at all.
    // Tests wait for this rather than for a proxy that might already be true.
    document.documentElement.dataset.ready = 'true';
  }, []);

  /* ---- Persist the three settings, and reflect them on <html> ---- */
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

  /* ---- Keep the URL in step, so a result can be shared or bookmarked ---- */
  useEffect(() => {
    if (!ready.current) return;
    const timer = window.setTimeout(() => {
      const query = encodeState(state, locale);
      const url = `${window.location.pathname}?${query}&lang=${locale}`;
      window.history.replaceState(null, '', url);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [state, locale]);

  const t = useMemo(() => getDictionary(locale), [locale]);
  const derived = useMemo(() => derive(state, locale), [state, locale]);

  const patch = useCallback((update: Partial<ToolState>) => {
    setState((current) => ({ ...current, ...update }));
  }, []);

  const changeLocale = useCallback(
    (next: Locale) => {
      setState((current) => reformatState(current, locale, next));
      setLocale(next);
    },
    [locale],
  );

  const labelFor = (field: FieldName): string => t.fields[field].label;

  // Split what is still missing by the section that is waiting on it, so each
  // empty state names its own gaps rather than the whole form's.
  const missingLabels = derived.missing.map(labelFor);

  const settings = useMemo(() => ({ locale, currency, t }), [locale, currency, t]);

  /**
   * What the sawtooth needs. The demand rate is D over the working year, and
   * the floor is whatever buffer the buyer entered — zero if they entered none.
   */
  const profileInput = useMemo(() => {
    if (derived.eoq === null || derived.eoqInput === null) return null;
    const { annualDemand, daysPerYear } = derived.eoqInput;
    return {
      demandRate: annualDemand / daysPerYear,
      safetyStock: derived.values.safetyStock ?? 0,
      periodLabel: t.units.days,
    };
  }, [derived, t]);

  return (
    <SettingsProvider value={settings}>
      <a href="#results" className="sr-only">
        {t.a11y.skipToResults}
      </a>

      <AppShell
        labels={{
          tool: t.app.tool,
          language: t.app.language,
          currency: t.app.currency,
        }}
        onLocaleChange={changeLocale}
        onCurrencyChange={setCurrency}
        actions={
          <>
            <button
              type="button"
              className="btn btn-quiet t-micro"
              onClick={() => {
                setState(reformatState(EXAMPLE_STATE, 'en', locale));
                setRevealErrors(false);
              }}
            >
              {t.actions.loadExample}
            </button>
            <button
              type="button"
              className="btn btn-quiet t-micro"
              onClick={() => {
                setState(reformatState(BLANK_STATE, 'en', locale));
                setRevealErrors(false);
              }}
            >
              {t.actions.clear}
            </button>
          </>
        }
      />

      {/* Two columns, and the division is the whole point: what you type is on
          the left, what it produces is on the right, in reading order.

          The equation used to span both columns above them. It looked better
          on a page that already had an answer and was wrong on every other
          one: the tool opens on empty fields, so a reader met a full-width
          masthead over a column with nothing in it. The equation is output —
          it belongs at the head of the column the output is in, and it is the
          first thing the reader's own numbers reach.

          Narrow: one column, no order classes needed. The rail comes first in
          the source and the reading follows it, which is the order the work
          runs in. While the fields are on screen the pinned summary carries
          Q* at the top of the viewport, so the figure moves as it is typed. */}
      <main className="mx-auto grid max-w-[1440px] items-start gap-4 px-4 pb-16 pt-4 sm:px-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <form
          aria-label={t.a11y.inputRail}
          className="panel no-print p-4"
          onSubmit={(event) => {
            event.preventDefault();
            setRevealErrors(true);
          }}
        >
          <InputRail
            state={state}
            patch={patch}
            issues={derived.issues}
            revealErrors={revealErrors}
          />
        </form>

        {/* The reading, split into views.

            All four panels on one column is a long page on a phone and a long
            scroll on a desktop, and only the first screen of it answers the
            question most readers came with. The tabs put the answer and the
            cycle first and keep the two analyses one click away.

            The cost is real and worth knowing: the four panels are four views
            of the same change, and a reader who alters a field can no longer
            watch the curve and the table move with the answer. That is what
            tabs trade away. Print is not part of the trade — the sheet still
            carries all of it. */}
        {derived.eoq === null ? (
          <div id="results" className="sheet-stack grid min-w-0 gap-0">
            <Equation eoq={derived.eoq} missingLabels={missingLabels} />
          </div>
        ) : (
          <div id="results" className="min-w-0">
            <Tabs
              label={t.a11y.tabs}
              tabs={[
                {
                  id: 'overview',
                  label: t.tabs.overview,
                  content: (
                    <>
                      <Equation eoq={derived.eoq} missingLabels={missingLabels} />
                      <AnswerPanel eoq={derived.eoq} practical={derived.practical} />
                      {profileInput === null ? null : (
                        <InventoryProfile
                          orderQuantity={derived.eoq.quantity}
                          demandRate={profileInput.demandRate}
                          safetyStock={profileInput.safetyStock}
                          periodLabel={profileInput.periodLabel}
                        />
                      )}
                    </>
                  ),
                },
                {
                  id: 'chart',
                  label: t.tabs.chart,
                  content:
                    derived.eoqInput === null ? null : (
                      <CostCurve input={derived.eoqInput} eoq={derived.eoq} />
                    ),
                },
                {
                  id: 'sensitivity',
                  label: t.tabs.sensitivity,
                  content:
                    derived.penaltyRows.length === 0 ? null : (
                      <CostPenaltyTable penaltyRows={derived.penaltyRows} />
                    ),
                },
              ]}
            />
          </div>
        )}
      </main>
    </SettingsProvider>
  );
}

