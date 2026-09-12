# Supply Chain Tools

Three tools, three sites, one design system. Everything runs in the browser; there
is no backend, no database and no analytics. Each app builds to a complete
static site.

| App        | What it does                                                                                          |
| ---------- | ----------------------------------------------------------------------------------------------------- |
| `apps/eoq` | **Inventory ordering.** Economic order quantity, the cost of ordering off it, and what a safety stock costs to hold |
| `apps/abc` | **ABC analysis.** Ranks stocked items by annual consumption value and cuts the ranked list into A, B and C |
| `apps/make-or-buy` | **Make or buy.** Costs a year of producing a component in-house against a year of buying it, and finds the break-even volume |

All three are bilingual French and English, with locale-aware number entry and
formatting, and a currency selector for MAD, EUR and USD. Each opens in the
reader's own language and remembers a choice made in any of them, because they
share one stored preference.

## Why a workspace

The tools are deployed separately and read as separate sites, but they are
one design system. `packages/shared` holds it, and there is exactly one copy:
tokens, the stylesheet, number formatting, axis arithmetic, and the interface
primitives. A second copy would diverge at the first correction, which
is the whole reason this is a workspace and not three repositories.

```
packages/shared     the layer every tool inherits unchanged. See its own README
packages/tools      who is in the family, and where each member lives
apps/eoq            the ordering calculator, at eoq.vercel.app
apps/abc            the ABC analyser, at abc-analyser.vercel.app
apps/make-or-buy    the make-or-buy calculator, at make-or-buy.vercel.app
docs/               the design plan, written before any CSS
```

Two packages rather than one, because they answer different questions.
`shared` is defined by a rule it can be checked against: nothing in it knows
any tool's domain, and `grep -rniE "eoq|abc|pareto|make-or-buy"` over it
turns up only comments. A roster naming ABC and EOQ would break that rule and
blunt the check, so the roster lives next door.

`packages/tools` is what stops the family growing as N by N-1. Before it, each
tool carried every other tool's address and name in both languages, so adding
the third meant reopening the first two. Adding a tool is one entry there now,
and every header recomputes its own links from it. The third tool was added
that way: one entry, and the first two listed it in both languages without
being edited.

The shared layer ships as TypeScript source rather than as a built artefact, so
each app compiles it (`transpilePackages`) and Tailwind is pointed at it
(`@source`). No build step sits between the two.

## Running it

```bash
npm install
```

One command per tool, on different ports so all three can run at once:

```bash
npm run dev:eoq
```

```bash
npm run dev:abc
```

```bash
npm run dev:make-or-buy
```

`dev:eoq` serves <http://localhost:3000>, `dev:abc` serves
<http://localhost:3001>, `dev:make-or-buy` serves <http://localhost:3002>.

| Command                   | What it does                                               |
| ------------------------- | ---------------------------------------------------------- |
| `npm run dev:eoq`         | Ordering calculator, port 3000                              |
| `npm run dev:abc`         | ABC analyser, port 3001                                     |
| `npm run dev:make-or-buy` | Make-or-buy calculator, port 3002                           |
| `npm run build`           | Static build of every app, into each app's `out/`           |
| `npm test`                | Vitest across the shared layer and every calculation layer  |
| `npm run typecheck`       | `tsc --noEmit` across every package                         |
| `npm run e2e`             | Playwright, every suite, desktop and 360px                  |
| `npm run e2e:install`     | Downloads the Chromium build Playwright drives              |

Anything can also be run against one package: `npm test --workspace @sct/abc`.

Nothing is tied to one machine. Playwright starts and stops its own dev server
on a loopback port, and every path in the repository is relative. A fresh clone
needs `npm install`, then `npm run e2e:install` once before the first browser
run.

Node 20.9 or later.

## Deploying

One Vercel project per app, each pointed at this repository, each with its
**Root Directory** set to the app:

| Vercel project | Root Directory |
| -------------- | -------------- |
| the ordering calculator    | `apps/eoq` |
| the ABC analyser           | `apps/abc` |
| the make-or-buy calculator | `apps/make-or-buy` |

Vercel reads `next.config.ts`, sees `output: 'export'`, and serves `out/`. It
installs from the workspace root on its own, so the shared package resolves
without extra configuration. Any other static host works the same way by
publishing an app's `out/`.

Each app links to the rest of the family in its header, and takes those links
from `packages/tools` rather than from its own configuration. Moving a tool to
a different address is one line in `registry.ts`, not a setting on every
project that points at it.

Addresses there are written out rather than read from the environment, so a
preview deployment links to its siblings in production. That is the honest
behaviour: a preview of one tool says nothing about the state of the others.
`NEXT_PUBLIC_SITE_URL` still overrides the address an app advertises to social
crawlers, which is what actually matters on a preview.

## Adding another tool

```
apps/<id>/                    copy any app's configs; they differ only in
                              the dev port and the package name
packages/tools/registry.ts    one entry: id, url, name and blurb per language
```

Then a Vercel project with Root Directory `apps/<id>`. Nothing else changes:
the existing tools pick the newcomer up from the roster, in both languages,
without being edited.

Each app declares `typescript`, `@types/node`, `@types/react`,
`@types/react-dom`, `tailwindcss` and `@tailwindcss/postcss` in its own
`devDependencies` rather than relying on the root. A Vercel build that expects
to inherit them from the workspace root fails instead on
`Cannot find module 'typescript'`.

## How each tool is put together

```
apps/eoq/
  lib/eoq.ts        the models: EOQ, the cost penalty, curve sampling, the
                    stock profile. Plain numbers in and out.
  lib/validate.ts   input rules, reported as typed codes
  lib/derive.ts     the bridge: raw strings to checked numbers to results
  lib/state.ts      the input model, and how it travels in a URL
  lib/i18n/         one dictionary per language, same typed shape
  components/       inputs, results, chart, tables
  app/              layout and the single page

apps/abc/
  lib/classify.ts   the whole model: value, order, shares, the three bands
  lib/sample.ts     the worked example, in both languages
  lib/rows.ts       the bridge: what is typed in a cell to what is classified
  lib/i18n/         its own two dictionaries
  components/       Pareto chart, class summary, the editable table
  app/              layout and the single page

apps/make-or-buy/
  lib/makeorbuy.ts  the whole model: the two total costs, the verdict, the
                    break-even volume, the flip price, and the chart axis
  lib/inputs.ts     the bridge: what is typed to what is compared, plus the
                    one rule a figure can break
  lib/sample.ts     the worked example
  lib/i18n/         its own two dictionaries
  components/       verdict card, key numbers, break-even chart, input rail
  app/              layout and the single page
```

The maths is kept strictly apart from the interface in all three. Nothing in
`lib/eoq.ts`, `lib/classify.ts` or `lib/makeorbuy.ts` imports React, calls `Intl`, or contains a
user-facing string; each takes plain numbers and returns plain numbers or typed
objects, keeping full precision throughout. Rounding happens only where a figure
is drawn. That is what makes the results checkable: the tests read as worked
examples, not as assertions about a rendering.

Validation returns codes rather than sentences, so the same rule reads correctly
in both languages and the message can never drift from the rule it describes.

## Dependencies, and why each one is here

| Package                              | Reason                                                        |
| ------------------------------------ | ------------------------------------------------------------- |
| `next`, `react`, `react-dom`         | The framework the brief specifies, and its static export       |
| `typescript`, `@types/*`             | TypeScript with `strict: true`                                 |
| `tailwindcss`, `@tailwindcss/postcss`| The styling layer the brief specifies, and how v4 is wired in  |
| `vitest`                             | Unit tests over the calculation layers                         |
| `@playwright/test`                   | Browser tests, so behaviour is checked where it actually runs  |

Six lines, and nothing else. No component kit, no chart library and no
internationalisation library:

- Every chart is hand-built SVG.
- The dictionaries are typed objects; each language's shape is `typeof en`, so a
  key missing from French is a build error.

## What the models do and do not cover

**Ordering calculator**

- **One price.** Demand is steady, nothing is backordered, and a unit costs the
  same whatever the order size. That is the classic EOQ and the whole of what is
  solved here. The lead time is not an input: it decides *when* to order, and
  this tool answers *how much*.
- **The safety stock is entered, not derived.** The buyer decides the buffer;
  the tool prices it. It shifts the total cost by `SS x H` and leaves Q\*
  untouched, which is why it can be a plain input rather than a service level
  and a demand variance.
- The cost curve is flat near its minimum: `TRC(Q)/TRC(Q*) = (Q/Q* + Q*/Q)/2`.
  Ordering 20% off the optimum costs about 2% more, which is the point of the
  penalty table and the reason precision here is worth less than it looks.

**Make-or-buy calculator**

- **Avoidable fixed costs only.** Overhead that continues whether or not the
  part is made is sunk, belongs in neither column, and would bias the answer by
  whichever side it were entered under. The model cannot detect it, so the page
  says so in its method note.
- **One period and one volume.** Cost alone: quality control, intellectual
  property, supplier dependency and lead time decide plenty of these cases and
  none of them appear here.
- Where the two lines do not cross above zero, the tool names the side that is
  cheaper at every volume rather than printing a negative or infinite
  break-even.

**ABC analyser**

- Classification is on annual consumption **value**, never on quantity and never
  on unit price. That is the entire model, and the usual mistake.
- Thresholds are fixed. An item that crosses one belongs to the class it crosses
  into, with a single marked exception described under Verification.
- Duplicate item names are kept as separate rows and never merged.

## Accessibility

Audited against the rendered page rather than against intentions, and held there
by the end-to-end suites: every control and every diagram carries an accessible
name, headings run without gaps under a single `h1`, focus is visible on
everything reachable, targets meet the 24px minimum, motion is suppressed on
request, and neither page ever scrolls sideways at 360, 390, 768, 1024 or 1440.

Every diagram publishes its data as a table for anyone not reading the picture.
Those tables uncovered two bugs worth knowing about. `.sr-only` does not work
applied to a `<table>`, because a table box will not shrink below its min-content
and simply ignores `width: 1px`; they are wrapped in a hidden `div` instead. And
an absolutely positioned `.sr-only` label is clipped by its nearest *positioned*
ancestor rather than by every scroller it sits inside, so one deep in a wide
table escaped its scroller entirely and widened the whole document: sideways page
scroll caused by an invisible element. `.table-scroll` is a containing block now.

Contrast was measured across every token pairing before any of it was written.

## Verification

`apps/eoq/lib/eoq.test.ts` carries the worked cases the models are checked
against, including D = 10 000, S = 50, H = 2 giving Q\* = 707.11 and
TRC = 1414.21, and D = 1200, S = 25, i = 20%, C = 5 giving Q\* = 244.95. The
symmetry of the penalty ratio is asserted as a property rather than by table
lookup: ordering at half the optimum and at twice it costs the same 25% more.

`apps/abc/lib/classify.test.ts` carries the ABC cases: an item landing exactly on
a threshold, an item landing there only in binary arithmetic, a single item worth
more than the whole A band, a zero-cost row, and a total of zero. The café sample
is checked against a hand calculation summed off the sorted list — 527 200,
99 614 and 33 872 out of 660 686, which is five items carrying 79.8% of the
money. The two counterintuitive placements are asserted by name, because they are
the point of the sample rather than a property of it: cups at 0.62 each are
class A, a burr set at 1450 each is class C.

`apps/make-or-buy/lib/makeorbuy.test.ts` carries the make-or-buy cases,
including equal per-unit costs, a negative break-even, an exact tie between the
two totals, and a volume of zero. The sample is checked against a hand
calculation: 180 000 + 42 x 8 000 = 516 000 to make against
15 000 + 58 x 8 000 = 479 000 to buy, so buying wins by 37 000. The lines cross
at 165 000 / 16 = 10 312.5 units, and the purchase price that would tie them at
8 000 units is 501 000 / 8 000 = 62.625. The crossing sits a quarter above the
volume being costed, which is the point of the sample rather than a property of
it: the answer turns on volume, and is not guessable from the inputs by eye.

One deviation from the plain rule is deliberate and marked in the source. An item
crossing a threshold belongs to the class it crosses into, which for a single
dominant line means crossing both at once and coming out C, leaving the A class
empty. The richest line is always A instead. It is one conditional, and deleting
it restores the unguarded rule.
