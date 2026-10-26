# Predicting the Sky · Decisions

The choices already made, and why, so no session reopens them by accident.
Claude Code does not remember earlier sessions: this file is that memory.
Each entry says where the rule now lives; that file has the detail.

To change a decision, change it here first, with the date and the reason,
then in the file it points to. Add new decisions at the end of their
section.

---

## Course

- **Audience: readers with a mathematical education who want to really
  learn the subject.** Results are derived, the mathematics is shown
  inline, and simulations are instruments for checking it, not
  illustrations. → STRUCTURE.md §2
- **Objective: by the end, the reader can compute where the Sun, the Moon
  and a planet are on a given date, with geometric models they derived
  themselves, and knows how wrong each model is and why.** Every page
  serves this; topics that don't go in detour notes. → STRUCTURE.md §1, §3
- **Order: Act I the stage, Act II the Sun, Act III the Moon, Act IV the
  planets.** The Sun first because it is the simplest complete model, then
  the Moon, then the planets: each act builds on the models of the last.
  → STRUCTURE.md §4
- **Act I comes first even though it is the least exciting.** The
  foundations (the turning sky, frames, clocks) are needed to state any
  prediction. Act 0, a hook ("Where is Mars tonight?"), is built last,
  because it needs the Act IV models. → STRUCTURE.md §4, §12
- **The story ends with Kepler.** Newton, perturbations and modern
  ephemerides are in a short epilogue, "Beyond Kepler", with pointers to
  future material. → STRUCTURE.md §4
- **One rhythm per page: observation, model, fit, test, residual.** Each
  page ends on the question the next one answers. → STRUCTURE.md §5
- **The error curve is the thread of the course.** From page 2.1 on, every
  model is tested against the reference sky, with earlier models as
  ghosts. → STRUCTURE.md §7.3
- **Exercises of four kinds: compute then check, predict then play,
  derive, break the model.** Two or three per page, with hint and worked
  answer, every number from a script. → STRUCTURE.md §7.2
- **Page 4.4 (Kepler) cannot be judged by the planetary reference.** The
  reference is itself Keplerian (Standish), so the error would be near
  zero by construction; the page needs another yardstick. → STRUCTURE.md
  §11

## Look

- **The star-atlas style (variant "B2"): navy ink on parchment, margin
  notes, graduated frames, four-pointed stars.** Chosen over a scholarly
  and a notebook style, from mock-ups of page 1.1. → STYLE.md
- **Modern wording.** The look is an old atlas; the words are not. No
  archaic phrasing, in labels or prose. → STYLE.md §1
- **The palette is locked.** The `:root` variables in `shared/theme.css`
  and `COL` in `shared/common.js`, in sync, changed only in a dedicated
  style revamp. → STYLE.md §2, CLAUDE.md
- **Graduated frame: the corners are always solid; the bands stretch or
  squash to fit between them**, an odd number per edge, starting and
  ending light. → STYLE.md §6
- **Stars are four-pointed, sized by magnitude, never dots.** Magnitudes
  are V from SIMBAD (Hipparcos for the plate stars SIMBAD lacks). → STYLE.md §5
- **Blue plates only for static 2D charts of the sky, at most one per
  page, never for mathematics.** Page 1.1 has the sky around the pole,
  page 1.2 the zodiac around Taurus, page 2.3 the path of the pole (on
  trial, 2026-10-24: Marco decides whether to keep it). → STYLE.md §7
- **Origin notes show the heading only** ("Origin · Greek"); the hub
  explains the origins once, in a key. A one-sentence explanation per note
  may come later. → STRUCTURE.md §7.1
- **Detours are margin notes**, not cards. → STRUCTURE.md §7.4
- **Table of contents: section number and the `<h2>` title, in the
  contents column on the left, sticky.** → STYLE.md §4.1, §4.2
- **An equation is numbered only when the text refers to it.** → STYLE.md
  §4.6
- **Figures follow strict rules**: one size whatever the controls,
  fixed scales, an observer's sky in the horizon frame, a control only
  when it shows the point of the section. → CLAUDE.md, "Rules for every
  figure"
- **A label never jumps: moving points are named by letters, words stay
  put.** On 2026-10-26 Marco noticed names that jumped wildly as their
  object moved (page 3.1, Figure 2: "Moon", "deferent", "epicycle"). They
  were moved to the other side of their point, to avoid a line or
  another label, by `LabelPlacer` or by the page's own choice of side. A
  moving point is now named by a letter the text defines (O, K, L, A),
  or not named when the title or the key says what it is; a word keeps
  its side of its object, and `LabelPlacer` moves only labels of one or
  two characters. → CLAUDE.md, "Rules for every figure"

## Writing

- **The voice of a good teacher writing a careful textbook.** "We" for the
  work done together, "you" for what the reader does with the page; why
  before what; no announced plans, verdict sentences or slogans. Adopted
  after Marco found the first drafts read as machine-written (examples A
  to D in WRITING.md). → WRITING.md, CLAUDE.md "Writing"
- **Numbers in prose at the precision the point needs; exact values in
  exercise answers.** → WRITING.md §4
- **A quotation or historical aside must do work in the argument.**
  Historical claims cite book and chapter; disputed ones get the
  "Debated" origin. → WRITING.md §5, STRUCTURE.md §7.1
- **Figure keys are short: what a label in the figure can't say and the
  reader can't see at once, five entries at most, often one or two.**
  Things are named by labels in the figure; the caption says what to do
  and notice; obvious elements (a curve under a labelled axis, grid lines,
  the dot on the date, the pointer line) are not described. Replaced, on
  2026-10-23, the earlier rule of one key line for every element, which
  made keys of nine entries; on 2026-10-25 Marco dropped the requirement
  that every element be explained, in favour of these simpler
  descriptions. → WRITING.md §7, CLAUDE.md "Rules for every figure"

## Code

- **Static site, no build step, plain `<script>` tags, KaTeX 0.16.9 pinned
  from cdnjs.** So it runs on GitHub Pages and from a simple local server.
  → CLAUDE.md, STRUCTURE.md §8
- **No libraries shipped with the site.** The code revamp looked for
  libraries that would simplify the code and adopted none for the site;
  the models the course teaches must stay in our own code anyway. → STRUCTURE.md §8
- **astronomy-engine as a development-only cross-check** of the reference
  sky (`tools/check/crosscheck.js`): a report, not a pass or fail. →
  tools/check/README.md
- **Every number on a page comes from a script in `tools/numbers/`.** →
  STRUCTURE.md §7.2, the `check-numbers` skill
- **Safety net: `golden.txt` and `readouts.txt` must stay identical unless
  a change is meant to alter what a page shows**; then they are
  regenerated in the same commit. → tools/check/README.md
- **CI fails on changed reference values, console errors and failed
  checks; screenshot differences are only reported**, because fonts and
  anti-aliasing differ between machines. → .github/workflows/check.yml
- **Prettier for `.js` and `.css` only, never `.html`** (it would reflow
  the prose and the KaTeX). `@ts-check` non-strict. → package.json,
  tools/check/README.md
- **Robustness choices of the code revamp**: pages keep working without
  KaTeX; a touch read-out stays after the finger lifts; spheres turn with
  the arrow keys; off-screen figures pause and resume where they were. →
  shared/
- **Shared code over page code.** A helper used twice moves to `shared/`;
  a model reused later goes in `shared/models/`. → CLAUDE.md,
  STRUCTURE.md §8
- **Two lists of stars.** `Stars.LIST` holds the bright stars that the
  skies of pages 1.1 and 1.3 draw (Regulus joined it on 2026-10-24, for
  page 2.3); a fainter star that a page names (β Scorpii, Thuban) goes in
  `Stars.MORE`, which `Stars.find` also searches, so those skies do not
  change. → shared/stars.js
- **The historical records of star longitudes live in the precession
  model** (`Precession.RECORDS`, with their sources), so the page, its
  numbers script and later pages read one copy. → shared/models/precession.js

## Workflow

- **Work on temporary branches, merged by Marco.** Branch names use `_`,
  not `/`, so raw.githack can serve them for checking on a phone. → the
  `preview-link` skill
- **Opus at high effort, plan mode first, one page or one coherent change
  per commit.** Large changes are staged: plan, a sample, approval, then
  the rest.
- **Sources through the `astronomy-sources` skill** (Toomer's *Almagest*,
  Rosen's *De Revolutionibus*, Fitzpatrick's *A Modern Almagest*, split by
  chapter). The chapter files are not in the repository (`.gitignore`),
  only on Marco's computer.
- **Two review agents, no tester agent.** `math-reviewer` and
  `writing-reviewer` report before a page is merged; the mechanical tests
  are `npm run check`. → .claude/agents/

---

## Open questions

- **JPL checks of the reference sky in antiquity.** Against JPL Horizons
  our Moon is within 1′ at 200 BC and 137 AD; the large differences in
  `crosscheck.txt` around 500 BC are astronomy-engine's (crosscheck.js
  header). But there are no JPL values for Mercury and Venus, and none
  before 200 BC. Acts III and IV use ancient observations (eclipses back
  to the 8th century BC), so add Horizons values for every body at a few
  dates between 750 BC and 200 BC before Act III. On 2026-10-26 (page 3.1)
  the Horizons API answered every request from a cloud session with a
  server error, so this is still open: page 3.1 fits and tests its
  epicycle on 2025 - 2026 and AD 133 - 136, and keeps the errors at
  Ptolemy's Babylonian eclipses of 721 - 720 BC out of its prose (they are
  only in its numbers script).
- **Sources in cloud sessions.** The `astronomy-sources` chapter files are
  not in the repository, so cloud sessions cannot read them. Options: a
  private repository for the sources, or attaching the needed chapters to
  the session. On 2026-10-26 a session with the `astronomy_reference`
  repository attached could read every chapter through its copy of the
  skill (`astronomy_reference/.claude/skills/astronomy-sources/`).
- **Where page 4.4 gets its yardstick** (see Course).
