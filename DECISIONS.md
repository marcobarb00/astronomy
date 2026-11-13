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
  Test tests that model once, around the fit year and over longer spans
  when they show something, but not again in the historical astronomer's
  own time (clarified by Marco on 2026-11-08); Residual is short prose.
  The historical astronomer's fit and test move to a short history block
  at the end of each section: how he measured and how he checked his
  model, with the results in words.
  Both fits are kept: the modern one so that the error curve measures the
  geometry, not parameters nineteen centuries old; the historical one for
  how the ancients knew what they knew. Piloted on page 3.3 on 2026-11-07
  at Marco's request, after its Fit and Test read as streams of facts and
  numbers. → STRUCTURE.md §5
- **The error curve is the thread of the course.** From page 2.1 on, every
  model is tested against the reference sky, with earlier models as
  ghosts where the scales allow (not on page 2.1, see below). →
  STRUCTURE.md §7.3
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
- **Fits use documented, modern observations, fitted rather than
  copied.** On 2026-11-11 Marco rejected page 4.1's first fit, which took
  Mars' mean motion from the reference sky's theory and fitted the rest
  to 2018–2033, because Mars has no opposition in 2026. Three rules
  replace that reading of "the current period": every parameter is
  fitted from observations (the reference sky's positions stand in for
  them), never copied from the theory behind the reference (Meeus',
  Standish's mean motions); the observations are already documented, with
  no date after the time of writing, and only the test runs into the
  future; "current" means modern observations as against the historical
  astronomer's, over as many years as a parameter needs (a century for a
  rate), not the years around 2026. Page 4.1 now fits $n$ to oppositions
  79 years apart (1931–1946 and 2010–2025) and $L_0$ and $r$ to those of
  2010–2025. Pages 1.3 to 3.3 predate the rules (3.1 and 3.3 take their
  mean motions from Meeus). → STRUCTURE.md §5, §4 (page 4.1)
- **No Today note on page 4.1.** The modern counterpart of the simple
  epicycle is two orbits about the Sun, which would answer "why does
  every epicycle turn with the Sun?", page 4.2's closing question, before
  page 4.3 takes it up. Approved by Marco on 2026-11-09. → STRUCTURE.md
  §4 (page 4.1), §7.5
- **Page 2.1's error curve has no ghost of the uniform circle.** Its
  error (115′ in 2026) is about seventy times the eccentric's (1.7′), so
  on any scale that shows both the eccentric's error is a flat line; the
  figure that drew them together (a ghost and a line on zero) showed
  nothing. Page 2.1 plots the eccentric alone, over 1, 100 and 1000
  years, and the text gives both numbers. Later pages keep earlier models
  as ghosts where the scales allow. Decided by Marco on 2026-11-11. →
  STRUCTURE.md §4 (page 2.1), §7.3

- **Page 4.2 fits the deferent's centre and the equant apart, then adopts
  the bisection.** The oppositions fix OQ and the loops OC (to first
  order K's speed depends only on OQ, its distance only on OC); fitted
  alternately to 2010–2025 they give OC/OQ = 0.49, so Ptolemy's model
  is then fitted with OC = $e$, OQ = $2e$. Its apogee is fixed among the
  stars, as Ptolemy's (IX 5), moving at page 2.3's rate. Notation: OC =
  $e$, so $e$ compares directly with Kepler's. Approved by Marco on
  2026-11-13. → STRUCTURE.md §4 (page 4.2), §6
- **Page 4.2's error curve keeps page 4.1's epicycle as ghost**, though
  it is about forty times larger: the shrink is the point of the figure,
  and the pointer reads the equant's own error. Unlike page 2.1. Decided
  by Marco on 2026-11-13. → STRUCTURE.md §4 (page 4.2)
- **No Today note on page 4.2; the equant is compared with Kepler's
  ellipse as geometry** (the same circle's centre and foci O and Q),
  without the two orbits about the Sun, which would answer page 4.3's
  question. Approved by Marco on 2026-11-13. → STRUCTURE.md §4 (page 4.2)

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
- **The link back to the hub is sticky and starts with «**, so it can
  be clicked from anywhere on a long page and reads as a way back
  (2026-11-12). → STYLE.md §4.2
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
- **The planets' epicycle: $\mu$ eastward, $\eta$ positive from apogee to
  perigee.** A planet moves eastward at its epicycle's apogee (*Almagest*
  IX 5), the opposite of the Moon, so its anomaly $\mu$ counts eastward
  and the equation of the epicycle $\eta$, page 2.1's function with the
  sign reversed, is positive from the apogee to the perigee; $S$ and
  $P_\lambda$ are a planet's synodic period and period in ecliptic
  longitude ($P_s$ is the synodic month, P the planet in the figures);
  $e$ is left for page 4.2's eccentricity; the anomaly related to the Sun
  and the zodiacal anomaly are named so, not first and second, which
  the Moon's pages use the other way round.
  Approved by Marco on 2026-11-09. → STRUCTURE.md §6

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
- **ΔT is measured from 2005 to 2027, Espenak and Meeus' elsewhere.**
  Their 2006 polynomial for 2005–2050 was a forecast and gives 75 s for
  2026, against the 69 s measured. Since 2026-11-09 the reference sky
  interpolates the USNO's measured values (and IERS Bulletin A's
  prediction for 2027), and from 2027 to 2050 corrects their polynomial
  by an amount that falls to zero in 2050; before 2005 it is unchanged. →
  shared/time.js
- **The mean Sun and the clock are fitted, not taken from Meeus.** The
  year comes from lines through each equinox and solstice of 1926–2025 in
  the reference sky (365.2421940 days, $n = 0.98564734824^\circ$ a day),
  and $L_0 = 280.461355^\circ$ at J2000 from the mean of $\lambda_\odot
  - n\,d$ over the 19 whole years 2007–2025, which average out nutation.
  The clock of page 1.3 uses them, carried from the days of TT of the
  fit to the days of UT it counts: $\theta_G = L_0 + n\,\Delta T_{2000} +
  (360^\circ + n)\,d$, with $\Delta T_{2000}$ = 64 s, 2.6″ (decided
  2026-11-12 after a check: over 2007–2025 the real Sun then crosses at
  the clock's noon within 0.08 s on average, against 0.25 s without the
  2.6″ and 0.40 s by UT's own constant). The constants of UT (Meeus 12.4)
  differ by 5.3″ and 0.16 s a century; they are a convention tied to the
  Earth's rotation, kept as `MeanSun.UT_CONVENTION` for the worked
  example and its test. Replaces the decision of 2026-11-09 that took the
  clock's rate from Meeus 12.4. Decided on 2026-11-12 (STRUCTURE.md §5).
  → shared/models/mean-sun.js, shared/models/clock.js,
  tools/numbers/1.3-clocks.js
- **The sky's rate on page 1.1 is fitted from Vega's meridian crossings**
  at Greenwich on 1 June 1925 and 1 June 2025, 36·625 turns apart:
  360.98562418° a day, one turn in 23 h 56 min 4.10 s. It is the rate
  against the stars, so it differs from the clock's rate against γ by
  precession (page 2.3); other bright stars give the same turn within
  0.005 s. Decided on 2026-11-12. → shared/models/diurnal.js,
  tools/numbers/1.1-turning-sky.js
- **Observations and fits use documented years only.** Page 1.2 fits the
  obliquity from the solstices of 2025, not 2026, whose December solstice
  is still ahead; the other pages move their observations the same way.
  Only a Test may run into the future. Decided on 2026-11-12. →
  STRUCTURE.md §5
- **The rates of Acts II and III are fitted from documented spans.**
  Precession from the shift of γ over 1926.0–2026.0 (50.283″ a year); the
  Sun's apogee from Hipparchus' method on every year 1826–2025 (1.751° a
  century); the Moon's $n$ and $n_M$ from the new Moons of 1926–2025 and
  the 251 : 269 relation; $n_F$ from the latitudes at the new and full
  Moons of 1926–2025; the Moon's mean distance as the reference Moon's
  average over 1926–2025. Observations move to the last documented year
  or decade (2025, September 2025 – September 2026, 2016–2025); the
  Tests of 2.1, 3.1 to 3.3 keep 2026 and 2021–2030, which may run into
  the future, and 2.2 tests on 2025, the year before its fit. NASA's eclipse
  lists for 2016–2020 were added to check the reference decade. Decided
  on 2026-11-12. → shared/models/, tools/numbers/2.*.js, 3.*.js
- **The figures of page 4.1 find the reference loops from geometric
  positions every two days.** The apparent positions the numbers script
  quotes cost four times as much (the Moon's series, for the Earth, twice
  per call), and the loops of forty years took about five seconds in the
  page; the geometric arcs are within 0.05′ of the quoted ones
  (tools/numbers/4.1-going-backwards.js). One function,
  `PlanetEpicycle.referenceEvents`, with the option `apparent`, serves
  both. Decided on 2026-11-09. → shared/models/planet-epicycle.js

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
