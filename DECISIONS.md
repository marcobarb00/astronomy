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
- **Fit, Test and Residual narrowed; history in short blocks.** Fit says
  which observation fixes each parameter and gives the fitted values once;
  Test covers the current period only (the fit year, at most the decade
  around it); Residual is short prose. The historical astronomer's fit
  and test move to a short history block at the end of each section: how
  he measured and how he checked his model, with the results in words.
  Both fits are kept: the modern one so that the error curve measures the
  geometry, not parameters nineteen centuries old; the historical one for
  how the ancients knew what they knew. Piloted on page 3.3 on 2026-11-07
  at Marco's request, after its Fit and Test read as streams of facts and
  numbers. → STRUCTURE.md §5
- **The error curve is the thread of the course.** From page 2.1 on, every
  model is tested against the reference sky, with earlier models as
  ghosts. → STRUCTURE.md §7.3
- **Exercises of four kinds: compute then check, predict then play,
  derive, break the model.** Two or three per page, with hint and worked
  answer, every number from a script. → STRUCTURE.md §7.2
- **Page 4.5 (Kepler) cannot be judged by the planetary reference.** The
  reference is itself Keplerian (Standish), so the error would be near
  zero by construction; the page needs another yardstick. → STRUCTURE.md
  §11
- **A historical journey, not a claim about what moves.** The course
  follows the astronomers before Kepler and rebuilds their models as
  theirs; it never presents one as true. Directions seen from the Earth
  cannot decide which body is at rest, so the text says what each model
  takes as at rest (geostatic, heliostatic), keeps the frame apart from
  the arrangement, and never speaks of a true centre. Adopted on
  2026-10-27 at Marco's request, with a new page 4.4, "What moves?", on
  the question; Kepler became page 4.5. → WRITING.md §9, STRUCTURE.md §4
- **The Sun and the Moon are connected to the models used today, without
  new pages.** On 2026-11-02 Marco noted that Acts II and III end on
  Hipparchus' and Ptolemy's circles, which are not used today, and that
  the hub promised each astronomer fixing the last one's model, while the
  pages show Hipparchus and Ptolemy refining their own. Two options were
  set aside: a site limited to Hipparchus and Ptolemy, with Kepler on
  another site (it drops the story's end and the objective), and full
  Copernican and Keplerian treatments of the Sun and the Moon (too long;
  Copernicus' Sun is page 2.1's eccentric and his Moon's second epicycle
  is on page 3.2, and a bare ellipse is not today's Moon either).
  Adopted instead: a "Today" margin note on pages 2.1, 3.1 and 3.2 giving
  the modern counterpart of the page's model; a short section of page 4.5
  and an epilogue entry on the Moon after Kepler (its remaining terms come
  from the Sun's pull); the hub's opening rewritten to say where the
  ellipse comes in and what is used as it is today. → STRUCTURE.md §4
  (pages 2.1, 3.1, 3.2, 4.5, epilogue, hub), §7.5
- **Page 4.5 applies the ellipse back to the Sun (on trial).** A section
  fits Kepler's ellipse to the Sun of page 2.1 and closes its open
  questions (the second-order error, the distance varying twice too
  much). Adopted on 2026-11-02 on trial: Marco decides whether to keep it
  once the page is built. → STRUCTURE.md §4 (page 4.5)

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
  trial, 2026-10-24: Marco decides whether to keep it), page 3.3 the
  Moon's path near Regulus in August 2026 (approved by Marco on
  2026-10-30). → STYLE.md §7
- **Origin notes show the heading only** ("Origin · Greek"); the hub
  explains the origins once, in a key. A one-sentence explanation per note
  may come later. → STRUCTURE.md §7.1
- **Detours are margin notes**, not cards. → STRUCTURE.md §7.4
- **Today notes are a third kind of margin note**, headed "Today" in the
  colour of the Modern origin, saying what replaces the page's model as
  the modern first approximation (pages 2.1, 3.1, 3.2; 2026-11-02). →
  STYLE.md §4.5, STRUCTURE.md §7.5
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
- **A fast and a slow motion in one figure: two views, not a faster
  play.** Playing the slow motion at the speed it needs (years a second)
  made the fast one flicker (pages 3.1 and 3.3, Figure 3), and drawing
  only every n-th frame, tried on 2026-11-02, looked wrong to Marco. On
  2026-11-03 Marco chose a view switch: "A month" draws everything, the
  slow view ("The eccentric's turn", "The nodes' turn") draws only what
  moves slowly, and the play button plays the chosen view at its own
  speed. What is drawn changes only when the reader changes the view. →
  CLAUDE.md, "Rules for every figure"

## Writing

- **Every longitude and latitude names its kind** (ecliptic, geographic,
  heliocentric), even where the context seems to make it clear. Marco
  asked for it on 2026-11-03, on page 3.3, where "the Sun's longitude"
  and "the Moon's latitude" were left bare, and the same day on every
  page, the templates and the site map. The names of quantities that are
  not coordinates (the argument of latitude) keep their form; a general
  frame of page 1.2 has "the frame's longitude". A slider label such as
  "geographic latitude φ" wraps onto two lines, in a label column widened
  to 82 px on a phone so that "geographic" fits. → CLAUDE.md "Writing"
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
- **No semicolon notation on the pages.** A sexagesimal number from a
  source is written as an angle in degrees and minutes (86°15′, Virgo
  13°45′) or as a decimal (5.25 where the deferent is 60; 365.24667
  days), never as 5;15 or 365;14,48. Marco asked for it on 2026-10-27:
  the notation is the sources', and readers do not know it. Replaced the
  earlier rule that ratios kept the source's notation. → STRUCTURE.md §6
- **No comma between thousands.** Four digits take no separator (4267,
  2000 years); longer numbers set off their thousands with a raised dot
  (126·007 days, AD 13·790); an equation has no separator at all, since a
  raised dot there reads as a product. Marco asked for it on 2026-10-28,
  after reading "4,267" on page 3.1 as a number with decimals. → WRITING.md
  §4

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
- **Eclipses: umbral only, with Danjon's rule.** A lunar eclipse counts
  when part of the Moon enters the umbra, as with Ptolemy's limits; the
  penumbral ones are not counted. The shadow is enlarged by 1% of the
  Moon's parallax (Danjon), as in NASA's canon, with which the reference
  sky's eclipses of 2021–2030 then agree in kind and, for the lunar ones,
  within 0.002 in magnitude (the traditional 2% gave 0.008 too much).
  Adopted on 2026-10-30 for page 3.3. → shared/models/eclipses.js
- **The plate stars south of +20° from Gemini to Virgo are XHIP's, for
  now.** On 2026-10-30 no CDS host (SIMBAD, VizieR and its mirrors)
  answered from the session that built page 3.3, so its plate takes those
  stars from the Extended Hipparcos Compilation (Anderson and Francis,
  2012) as packaged by the npm package d3-celestial, without proper
  motions (20″ at most over 26 years). Replace them by a SIMBAD query
  when CDS answers. → tools/numbers/data/fetch-plate-stars-xhip.sh

## Workflow

- **Work on temporary branches, merged by Marco.** Branch names use `_`,
  not `/`, so raw.githack can serve them for checking on a phone. → the
  `preview-link` skill
- **Opus at high effort, plan mode first, one page or one coherent change
  per commit.** Large changes are staged: plan, a sample, approval, then
  the rest.
- **Sources through the `astronomy-sources` skill** (Toomer's *Almagest*,
  Rosen's *De Revolutionibus*, Fitzpatrick's *A Modern Almagest*,
  Neugebauer's *A History of Ancient Mathematical Astronomy*, Part One, and
  Voelkel's *Johannes Kepler and the New Astronomy*, split by chapter). The
  chapter files are not in the repository (`.gitignore`), only on Marco's
  computer and in the `astronomy_reference` repository. Voelkel is a short
  biography, not Kepler's *Astronomia Nova*, whose text is still missing.
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
  only in its numbers script). On 2026-10-30 Horizons answered from a
  cloud session again (page 3.3 did not need it: it uses AD 100–200 and
  2001–2100).
- **Sources in cloud sessions.** The `astronomy-sources` chapter files are
  not in the repository, so cloud sessions cannot read them. Options: a
  private repository for the sources, or attaching the needed chapters to
  the session. On 2026-10-26 a session with the `astronomy_reference`
  repository attached could read every chapter through its copy of the
  skill (`astronomy_reference/.claude/skills/astronomy-sources/`).
- **Where page 4.5 (Kepler) gets its yardstick** (see Course).
- **Whether page 4.5 keeps its section on the Sun** (see Course), once the
  page is built. If it goes, the hub's sentence on the Earth's orbit still
  holds, since it states history, not the page's content.
- **The plate stars of page 3.3 from SIMBAD** (see Code): refetch the
  region right ascension 105° to 195°, declination −20° to +20°, and drop
  the XHIP file.
