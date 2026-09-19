'use client';

import { useRef, useState, type ReactNode } from 'react';

export interface TabDefinition {
  id: string;
  label: string;
  content: ReactNode;
}

/**
 * The output column, split into views.
 *
 * Every panel stays mounted and inactive ones are hidden rather than
 * unmounted. Three reasons, all of them things that break when they are
 * unmounted instead: the diagram measures its own width with a ResizeObserver
 * and would remeasure from scratch on every switch; the print sheet has to
 * carry the whole reading rather than whichever tab happened to be open; and a
 * browser's find-in-page finds what is in the document.
 *
 * Keyboard behaviour follows the tabs pattern rather than being invented: one
 * stop in the tab order, arrow keys between tabs, Home and End to the ends.
 */
export function Tabs({ tabs, label }: { tabs: TabDefinition[]; label: string }) {
  const [active, setActive] = useState(0);
  const list = useRef<HTMLDivElement>(null);

  function focusTab(index: number) {
    setActive(index);
    const buttons = list.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    buttons?.[index]?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    const last = tabs.length - 1;
    if (event.key === 'ArrowRight') focusTab(active === last ? 0 : active + 1);
    else if (event.key === 'ArrowLeft') focusTab(active === 0 ? last : active - 1);
    else if (event.key === 'Home') focusTab(0);
    else if (event.key === 'End') focusTab(last);
    else return;
    event.preventDefault();
  }

  return (
    <>
      <div
        ref={list}
        role="tablist"
        aria-label={label}
        aria-orientation="horizontal"
        className="tablist no-print"
        onKeyDown={onKeyDown}
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={index === active}
            aria-controls={`panel-${tab.id}`}
            tabIndex={index === active ? 0 : -1}
            className="t-label"
            data-testid={`tab-${tab.id}`}
            onClick={() => setActive(index)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={index !== active}
          /* Focusable, because a panel holding no control of its own is a dead
             end for anyone arriving from the tab by keyboard. */
          tabIndex={0}
          className="tabpanel sheet-stack grid min-w-0 gap-0"
          data-testid={`panel-${tab.id}`}
        >
          {tab.content}
        </div>
      ))}
    </>
  );
}
