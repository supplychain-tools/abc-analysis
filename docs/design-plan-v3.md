# Design plan — revision 3

Third revision, and the first that changes what a reader actually sees rather
than how it is argued for. Revision 2 (`design-plan.md`) built a disciplined
neutral system and then said so itself, twice, in its own self-critique: *navy,
grey and red is the conventional operational palette, and conventional is a step
from generic.* It was right. Built, the page reads as a competent internal tool
from any large company: six identical white panels at 6px radius on a cold grey
ground, nothing anywhere for the eye to hold.

**Scope.** This revision applies to `apps/eoq` only. `packages/shared` is
untouched, so `abc` and `make-or-buy` keep revision 2's appearance until this
direction is judged. Everything below is an override layered on top of the
shared stylesheet, not a replacement for it.

**What is kept from revision 2**, because it was arrived at by testing rather
than by taste: the strict division between the figure face and the word face;
mathematical variables set in italic; decimal-aligned figures; two marked
colours with one meaning each; the sawtooth as the domain's own picture; no
gradients, no shadows, no icon set, no entrance animations; the print rules.

---

## 1. What this page actually is

Someone opens it with three numbers on a supplier's quotation and one question:
*how many do I order at a time.* The tool answers with √(2DS/H).

That square root is the single most recognisable object in inventory management.
It is on the first slide of every supply chain course and in every purchasing
handbook since Harris wrote it down in 1913. Revision 2 mentions it once, as an
11px caption under the results — `TRC = √(2·D·S·H)` — and otherwise hides the
derivation entirely. The buyer types four numbers into a rail on the left and a
figure appears in a box on the right, with nothing on screen connecting the two.

**So the equation becomes the page.** Not a caption, not a formula badge: the
masthead, set at display size, with the reader's own numbers substituted into it
as they type, resolving left to right into the answer. It is the hero because it
is simultaneously the domain's emblem, the derivation the reader needs in order
to trust the figure, and the missing link between the rail and the result. A
student can hand it to an examiner; a buyer can hand it to a supplier.

That is where the boldness is spent. Everything else on the page gets quieter
than revision 2 left it, not louder.

## 2. Colour

The palette comes from the floor the work happens on, not from a mood: poured
concrete, kraft, and hi-vis marking. Three of the five are neutral and carry all
the type; one is a marking colour that never carries type; one is red and appears
only where something is wrong or a threshold is crossed.

| Token           | Value     | Job                                                     |
| --------------- | --------- | ------------------------------------------------------- |
| `--ground`      | `#D9D6CE` | poured concrete: the floor the sheet lies on             |
| `--surface`     | `#FBFAF6` | the sheet                                                |
| `--surface-2`   | `#F1EEE6` | recessed: table stripes, the derivation line             |
| `--line`        | `#C6C1B5` | hairlines                                                |
| `--line-strong` | `#8A8578` | table heads, field edges, dividers that carry weight     |
| `--text`        | `#23211C` | a warm ink, not a tinted stand-in for black              |
| `--text-2`      | `#5E594E` | labels, units, annotations                               |
| `--accent`      | `#23211C` | structure and the one primary action: the ink itself     |
| `--mark`        | `#F2C302` | hi-vis: the answer, and the optimum on a diagram         |
| `--signal`      | `#A62A17` | a fault, and the reorder threshold                       |

**There is no brand hue.** `--accent` is the ink. A calculator does not need a
corporate blue to tell a reader which button is primary; a filled black button
on a warm ground does that better, and refusing the hue is what stops this
landing back in the navy-and-grey convention revision 2 flagged.

**`--mark` is a marking colour and obeys marking rules.** It is a fill with ink
on top of it, or a stroke with ink beside it. It never sets type on the surface
and it never sets a line on its own — at 4.5:1 against `--surface` it would fail,
and a yellow rule on a white sheet is invisible in print. Its one job on this
page is the answer: the resolved figure sits on a band of it, the way a buyer
marks the number that matters on a printed sheet before passing it on.

The ground is decisively darker than the sheet — 13 points of luminance rather
than revision 2's 6 — so containment happens without a border, and a sheet can
therefore drop its outline entirely.

## 3. Type

Two families, same division of labour as revision 2, different faces.

**Chivo Mono** carries every figure. Two tests decided it. It is narrow for a
monospace, because a wide mono gives a comma a full character cell and sets
1 596,9 as `1 596 , 9`. And **its zero is a plain oval.** Most monospaces mark
the zero to tell it from a capital O — Spline Sans Mono, which this replaced,
puts a dot in it; Roboto, Noto, Red Hat, Martian and Sometype slash it. That is
right in a terminal, where a zero and an O can both turn up in the same string,
and wrong in a column of money, where no letter can appear and the mark is just
a speck inside every round figure. Nine faces were set at 58px to check that one
glyph, and two came back unmarked: Azeret Mono and this, which is the narrower.

**Fira Sans** carries every word. Drawn for interface text at small sizes, which
is where most of this page lives — the label step is 11.5px and the axis titles
are 11px. It has a true italic, which the equation needs: mathematical variables
are set in italic in print, and the mono has no italic at all.

| Step        | Size          | Family  | Weight | Used for                          |
| ----------- | ------------- | ------- | ------ | --------------------------------- |
| `equation`  | 26–46px fluid | both    | 700    | the hero equation and its answer  |
| `figure-lg` | 19–22px       | mono    | 700    | supporting results                |
| `figure`    | 16px          | mono    | 400    | table figures                     |
| `body`      | 13px          | Fira    | 400    | input values, prose               |
| `label`     | 11.5px        | Fira    | 600    | column heads, section names       |
| `micro`     | 11px          | Fira    | 400    | units, annotations                |

Precision is unchanged: money two decimals, quantities zero or one, percentages
one, the penalty against the optimum two.

## 4. Layout

### The sheet

```
┌────────────────────────────────────────────────────────────────────────┐
│  Commande de stock                        FR EN   MAD   exemple  vider │  bar
╞════════════════════════════════════════════════════════════════════════╡
│                                                                        │
│   ┌────────────────┐   ┌──────────────────────────────────────────┐    │
│   │ Demande et     │   │  Quantité économique de commande         │    │
│   │ coûts          │   │            ┌──────────┐                  │    │
│   │                │   │   Q★  =   ╲│ 2 · D · S   = ▓ 1 596,9 ▓   │    │
│   │ D [   24 000 ] │   │          ╲ │ ─────────                   │    │
│   │ S [      450 ] │   │            │     H                       │    │
│   │ i [       22 ] │   ├──────────────────────────────────────────┤    │
│   │ C [     38,5 ] │   │  15,03 /an   20,0 j   15 855,23 MAD      │    │
│   │                │   ├──────────────────────────────────────────┤    │
│   │ Année de       │   │  Évolution du stock    (sawtooth)        │    │
│   │ travail        │   ├──────────────────────────────────────────┤    │
│   │      ...       │   │  Courbe de coût                          │    │
│   │                │   ├──────────────────────────────────────────┤    │
│   │                │   │  coût d'une quantité erronée   (table)   │    │
│   └────────────────┘   └──────────────────────────────────────────┘    │
│      what you type          what it produces                           │
│         ground shows between sheets; no sheet has a border             │
└────────────────────────────────────────────────────────────────────────┘
```

Three changes of substance from revision 2.

**The equation heads the output column.** It was one of six equal panels
stacked in the right-hand column, differing from its neighbours only by type
size, and it is now the head of that column, set two steps larger than anything
under it.

It was tried spanning both columns above them, and that was wrong. The division
the page is built on is that what you type is on the left and what it produces
is on the right: the equation is output, so a masthead across the top broke the
one rule the layout has. It also looked worst in the state the tool actually
opens in — empty fields, and a full-width masthead over a column with nothing
in it.

**Containment is by tone, not by outline.** Every sheet is `--surface` on
`--ground` with no border and no radius. The ground does the separating, which
it can now that it is genuinely darker. Six identical bordered cards were the
strongest remaining tell in the built page and they are simply gone.

**Sections inside a sheet are separated by rules, not by more boxes.** The
supporting figures, the two diagrams and the table share one sheet in the right
column, divided by hairlines, because they are one continuous reading.

Alignment is left throughout, including the equation: it reads as a line of
worked arithmetic, and a centred equation would be a plaque.

### Narrow, 360px and up

One column, and the two sheets simply stack in source order: **the rail first,
then the reading** — equation, supporting figures, diagrams, table. No ordering
rules are needed, because the wide layout already puts input before output.

An earlier attempt put the equation above the fields on every width. On a phone
that meant a reader met an answer before they had given anything to answer
with, and then had to scroll past every result to reach the first input.

The pinned summary that used to hold Q* and the total relevant cost at the top
of the viewport is gone, at the client's decision. The consequence is worth
stating rather than discovering: on a phone the answer is now genuinely below
the fold while the fields are being filled, so a figure changed in the rail is
not visible until the reader scrolls to it. On a wide screen nothing changes —
the two columns are side by side and the answer never leaves the view.

The equation stacks — numerator over rule over denominator stays intact down to
320px, and the resolved answer wraps to its own line under the radical rather
than shrinking below the figure-lg step.

## 5. Motion

**None.** A marking band wiping in behind the figure as the answer resolved was
built, ran for a while, and went with the band itself. Nothing on the page now
moves except the 160ms colour response and the 90ms press on controls, which
are evidence that a click landed rather than decoration.

That is the right end state rather than a loss. The `prefers-reduced-motion`
block guards something that no longer exists, which is the correct way round.

## 6. Self-critique, before any code

*Would I have produced this for any other calculator brief?*

**The live equation — no.** It only works where the subject has one canonical
closed form that a practitioner already recognises, and where showing the
substitution is genuinely useful rather than showy. EOQ is exactly that case.
Make-or-buy has a break-even formula and could inherit the idea; ABC has no
formula at all and must not be given a fake one. That is the correct test for
whether it is domain-honest, and it passes.

**Concrete, kraft and hi-vis — mostly no, with one risk.** The risk is that a
warm neutral ground drifts towards the cream-and-serif cluster the brief names
first. Two things hold it off: the ground is `#D9D6CE`, a grey with a kraft cast
rather than a paper cream, and it is decisively darker than the sheet rather than
a wash the type sits directly on; and there is no serif anywhere. If it still
reads as cream once built, the fix is more grey in the ground, not a different
family.

**Hi-vis yellow — a real choice, and the one I would defend hardest.** It is
where the domain and the discipline agree: a warehouse marks what matters in a
colour that cannot carry text, which forces it to be a fill and stops it
spreading. One use, one meaning.

**Black as the accent — revised from my own first draft.** The first pass had a
deep ochre as the primary action colour. It was an invented brand hue doing
nothing the ink could not do, and pairing it with the marking yellow put two
warm colours in tension for no gain. Cut.

**The borderless sheet — partly generic and kept anyway.** Tone-based
containment is a standard application shape. It stays because the alternative
here is the bordered card grid that failed, and because what stops a shape being
generic is what it contains.

**Cut: a cost-balance graphic.** At Q\* the ordering cost equals the holding
cost, and a two-bar balance showing it was drafted beside the equation. The
equation already carries the argument, the cost curve already shows the minimum,
and a third picture of the same fact is decoration. One idea, one picture.

**Cut: the substitution line.** A recessed strip under the equation restated
what D, S and H currently stand for. It was built, reviewed on screen and cut:
the rail carries all three figures, in the fields the reader typed them into,
a few inches away. Saying them again is a second copy to keep in step rather
than information, and it pushed the answer further from the fields that produce
it. Where H is derived from a rate rather than entered, that derivation belongs
beside the two fields it comes from, not under the equation.

**Cut: numbering the rail sections.** Four numbered steps would imply a sequence.
The fields can be filled in any order, so the numbers would be a lie told for
structure.

---

## 7. Found while building

**A class name collision that broke every figure on the page.** The equation's
fraction was first written with `.frac`, `.num` and `.den`. The shared `Figure`
primitive already owns `.num`, `.int` and `.frac`: it splits every figure on the
page at its decimal mark into an `.int` cell and a `.frac` cell so columns line
up on the point. A bare `.frac` rule therefore caught all of them and set each
decimal part as its own inline grid, which lifted the fraction off the baseline
in every table and every result. Renamed to `.eq-frac` / `.eq-num` / `.eq-den`.
The lesson generalises: an app overriding a shared stylesheet shares its
namespace, so anything new here takes a prefix.

**A print rule that lost to a screen rule.** Media queries add no specificity.
The screen rules in this file come after the shared sheet's `@media print`
block, so the marked table rows kept their box shadow on paper until the print
block here restated `box-shadow: none`.

**The fraction has to refuse to wrap.** A numerator that wraps stops being a
numerator. `white-space: nowrap` on the fraction and on the marked answer, so
the equation breaks at its own gaps — which is what puts the answer on its own
line at 375px, intact.

**The social card and the app icon carried the old palette.** Both are rebuilt:
the card is now the equation rather than a headline over a chart, and its
tracked-out capital eyebrow and its all-caps footer labels are gone, since those
are the template chrome the brief rules out. `npm run og --workspace @sct/eoq`
regenerates it.

**A segmented control with an empty half.** `.seg` is an inline-flex box, and a
grid item stretches by default, so in the rail the box was pulled to the column
width while its two labels kept their own: the choice sat in the left half and
the right half was an outlined rectangle with nothing in it. The options divide
the full width now, which also lines the control up with the field boxes above
and below it — the rail's one rule is that every box shares one left and one
right edge. Scoped to the rail: the language toggle in the header is the same
control and goes on hugging its two labels.

**A clear field that was not clear.** The working year opened on 365, so the
tool did not start empty and "clear all fields" left a field filled. It starts
empty now. A placeholder 365 was tried in between and cut: a grey figure sitting
inside a field the tool is at the same time outlining in red for being empty
reads as a value being refused rather than a suggestion. The field is blank like
every other required field, and a cleared form lists it among what is still
needed — a working year substituted silently behind a buyer is exactly the kind
of default that produces a wrong figure in a purchase decision.

**Two radii, both soft.** Controls at 6px, sheets at 10px. Square sheets were
argued for here and overruled: a rounded area reading as a card is the point
once the palette is an analytics one. The radius sits on the *stack* rather
than on each panel in it — rounding the panels individually rounds every
internal join and lets the ground show through the notches between them, so
`.sheet-stack` carries the radius and clips, which takes the wide table's
scroller with it.

**The highlighter is gone.** The answer was set on a filled band — hi-vis in
kraft, blue-100 in navy — and is now marked by size and the accent alone. A fill
under it was a third marking on top of two that already worked.

**The equation waits for an answer.** It was drawn in its symbolic form from
the first paint, with a dash where the figure would go. That is a promise the
page cannot keep yet, and since the tool opens on empty fields it was the state
a reader met first. It renders only once there is a result; until then the panel
carries what is still missing and nothing else. The empty state is therefore a
sentence on a sheet rather than a formula over a blank, and the equation's first
appearance coincides with the marking band it arrives with.

**The formula came out of the answer line.** √(2DS/H) was drawn between two
equals signs, radical and all, and the line now reads `Q* = 1 596,9 unités`.
Written down because it reverses the plan above, and the reasoning is worth
keeping: on screen the formula stood between a reader and the one figure they
came for, and the rail already carries every input in the field it was typed
into. What is left is the naming rather than decoration — the star is what
separates the optimum from any other order quantity.

Section 1 and section 5 of this plan are therefore no longer what was built.
They are left as written: a plan that quietly rewrites itself to match the
result stops being a record of why anything was decided. The signature element
is the sawtooth, which was always the more domain-honest of the two.

The social card was rebuilt to match, because it is a picture of this same
line and a card showing a formula the page does not have is a second version
of the design loose on the internet.

Checked after the build: 109 end-to-end tests pass, including no sideways scroll
at 360, 390, 768, 1024 and 1440; a 24px minimum target on mobile; the answer in
view on a 360px screen; nothing animating under `prefers-reduced-motion`; and no
two labels overlapping in either diagram.


---

## 8. The navy experiment

Running, and reversible in one line. `app/globals.css` imports a palette:

```css
@import './theme-navy.css';   /* or './theme-kraft.css' */
```

Both files define the same token set and contain no rules at all, so every rule
in `globals.css` is written once and judged under either. Switching is that
import and nothing else.

**What it changes.** Concrete, kraft and hi-vis become an analytics palette:
`#F4F6F8` ground, white surfaces, `#172033` navy text, `#2563EB` blue, and amber
kept back for a threshold. The roles are the point more than the hues — blue is
identity and data, amber is a threshold worth noticing and nothing else, red is
a fault, white is a surface. Q\* leaves the hi-vis band for a blue tint with
blue text; the sawtooth and the cost curve go navy; the safety stock rule, which
was a quiet grey, becomes the page's only amber.

**What is worth knowing before judging it.** `#F4F6F8`, `#2563EB`, `#64748B`,
`#E2E8F0` and `#172033` are Tailwind's slate-50, blue-600, slate-500, slate-200
and near slate-900: this is the default palette of the framework most of the web
is built in. Revision 2 was already a neutral-grey-plus-blue system, and its own
self-critique is on record as calling that conventional. The experiment is
therefore a return to where revision 3 started, in a more current blue. That is
a legitimate thing to want — it reads as a professional data tool, which is
exactly what a portfolio piece for a supply chain role may need to read as — but
it is the opposite trade from the one revision 3 made, and it should be chosen
knowing that.

**Two values were adjusted from the proposal**, both measured: `--line-strong`
from `#94A3B8` to `#7A8899`, because the edge of a control needs 3:1 and
slate-400 gives 2.60:1 on white; and `--text-2` from `#64748B` to `#5B6779`,
because 11px labels also sit on the `--surface-2` table stripe, where
`#64748B` measures 4.35:1 against a 4.5:1 floor.

**Not yet switched:** the social card (`scripts/og-template.html`) and the
favicon still carry the kraft palette. They are left alone until the theme is
decided, so that reverting is one import rather than three files.


---

## 9. The disclosure experiment

Also running, also at the client's request, and unlike the palette this one is
not a single import to undo.

**What changed.** The output column is three views — order and cycle, cost
curve, sensitivity — behind a tab strip. The three figures under the answer sit
in `--surface-2` boxes instead of floating in a row. The four-figure block that
followed them was a wrapped sentence of label-value pairs and is a two-column
list now, each figure against the right edge of its own column, so the eye can
read down the names or down the numbers. Panels holding a diagram get more room
between the heading and the picture.

**The cost, stated rather than discovered.** The four panels are four views of
the same change. A reader who alters a field could watch the answer, the
sawtooth, the curve and the penalty table move together, and that simultaneity
was an argument the page was making. Tabs trade it for a shorter first screen.
On a phone that is a good trade; on a wide screen the column had room for all
of it, and the trade is less obviously worth it there. Worth revisiting if the
tabs turn out to be clicked once and never again.

**Hidden, not unmounted.** Inactive panels stay in the document with `hidden`.
Three things depend on it: the two diagrams measure their own width with a
ResizeObserver and would remeasure from scratch on every switch; the print sheet
still carries the whole reading, because `@media print` un-hides all three; and
find-in-page finds what is in the document.

**What it cost the test suite.** Sixteen tests failed on the first run, all for
the same reason: a panel that is out of the accessibility tree cannot be found
by role, which is correct behaviour and exactly what hiding it should do. Four
spec files now open their own view through one shared helper. The helper waits
for hydration before looking for the tab strip, because without that wait it
found no tabs, returned quietly, and left the tests failing later against the
wrong view with an error that said nothing about tabs.
