'use client';

import { useEffect, useState, type ReactNode } from 'react';

import { formatForInput, parseNumber } from '../lib/format';

import { useSettings } from './settings';

export interface FieldProps {
  id: string;
  /**
   * The mathematical variable, set in the stripe down the left of the rail.
   * A node rather than a string, because a symbol distinguishing two sides of
   * a comparison needs a subscript to do it: F with a subscript is one symbol,
   * and "F_m" is three characters pretending to be one.
   */
  symbol?: ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  unit?: string;
  /** Resolved message. Held back until the field has been left at least once. */
  error?: string | null;
  /** Reveal held-back errors, when the whole form is being checked at once. */
  revealErrors?: boolean;
  disabled?: boolean;
  placeholder?: string;
  /**
   * One sentence on what the figure is, behind a toggle beside the unit.
   *
   * Not a `title` attribute: that needs a hovering mouse, never appears on a
   * touch screen, and is read inconsistently by screen readers. This is a
   * disclosure, so the same affordance works for a pointer, a finger and a
   * keyboard, and the text it reveals is a real element that can be described
   * from the input.
   */
  hint?: string;
  /** Open the hint from the start. For a figure whose definition is the trap. */
  hintOpen?: boolean;
  /** Names the toggle for a screen reader, since its glyph carries no text. */
  hintLabel?: string;
}

/**
 * One text input. Deliberately not <input type="number">: its spinners and its
 * locale handling differ between browsers, and this tool has to accept both a
 * comma and a point as the decimal mark.
 *
 * Validation messages appear on blur, not on keystroke, so the field does not
 * argue with someone halfway through typing. Leaving the field also rewrites
 * what is in it into the conventions of the active locale.
 */
export function Field({
  id,
  symbol,
  label,
  value,
  onChange,
  unit,
  error,
  revealErrors = false,
  disabled = false,
  placeholder,
  hint,
  hintOpen = false,
  hintLabel,
}: FieldProps) {
  const { locale } = useSettings();
  const [touched, setTouched] = useState(false);
  const [showHint, setShowHint] = useState(hintOpen);

  // A field the user has not reached yet still shows its error once the whole
  // form is checked, and goes quiet again if the value is corrected.
  useEffect(() => {
    if (revealErrors) setTouched(true);
  }, [revealErrors]);

  const showError = error != null && error !== '' && touched;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const hasHint = hint !== undefined && hint !== '';

  // An input describes itself by whichever of the two is on screen. The error
  // comes first, because a field that is both explained and wrong needs the
  // complaint read before the explanation.
  const describedBy = [showError ? errorId : null, hasHint && showHint ? hintId : null]
    .filter((each) => each !== null)
    .join(' ');

  function handleBlur() {
    setTouched(true);
    const parsed = parseNumber(value, locale);
    if (parsed !== null) {
      const tidy = formatForInput(parsed, locale);
      if (tidy !== value) onChange(tidy);
    }
  }

  // The stripe down the left exists to hold a symbol. A form that names its
  // figures in words rather than in algebra gets the width back.
  const hasSymbol = symbol !== undefined && symbol !== '';

  return (
    <div className={`grid gap-x-2 ${hasSymbol ? 'grid-cols-[1.9rem_1fr]' : 'grid-cols-[0_1fr]'}`}>
      <div className="col-start-2 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="t-label">
          {label}
        </label>
        <span className="flex shrink-0 items-baseline gap-1">
          {unit === undefined || unit === '' ? null : <span className="unit">{unit}</span>}
          {hasHint ? (
            <button
              type="button"
              className="field-hint-toggle"
              aria-expanded={showHint}
              aria-controls={hintId}
              aria-label={hintLabel ?? label}
              onClick={() => setShowHint((open) => !open)}
            >
              {/* A lower-case i in a ring, drawn rather than set, so it keeps
                  its shape at 14px where a glyph in the text face would not. */}
              <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" focusable="false">
                <circle cx="8" cy="8" r="6.6" fill="none" stroke="currentColor" strokeWidth="1.3" />
                <circle cx="8" cy="4.9" r="0.95" fill="currentColor" />
                <path d="M8 7.1v4.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
          ) : null}
        </span>
      </div>

      {hasSymbol ? (
        <div className="col-start-1 row-start-2 flex items-center justify-end pr-1">
          <span aria-hidden="true" className="symbol t-body text-[color:var(--text-2)]">
            {symbol}
          </span>
        </div>
      ) : null}

      <div className="col-start-2 row-start-2">
        <input
          id={id}
          className="field-input t-body"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={showError ? 'true' : undefined}
          aria-describedby={describedBy === '' ? undefined : describedBy}
          onChange={(event) => onChange(event.target.value)}
          onBlur={handleBlur}
        />
      </div>

      {showError ? (
        <p id={errorId} className="col-start-2 row-start-3 t-micro pt-1 text-[color:var(--signal)]">
          {error}
        </p>
      ) : null}

      {hasHint && showHint ? (
        <p id={hintId} className="col-start-2 row-start-4 t-micro pt-1 text-[color:var(--text-2)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
