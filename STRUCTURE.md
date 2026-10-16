# Predicting the Sky

*From the celestial sphere to Kepler: an interactive course in classical positional astronomy.*

This file is the plan for the whole site. Every page is built against it.
When a decision here changes, change it here first, then in the code.

---

## 1. Objective

By the end, the reader can **compute where the Sun, the Moon and a planet are
on a given date**, using geometric models they derived themselves, and knows
**how wrong each model is and why**.

Every page has one job: it either adds a piece to that machine, or it removes
an error that the previous piece left behind.

## 2. Audience

Readers with a mathematical education (linear algebra, trigonometry, calculus,
series expansions) who want to *really* learn the subject.

Consequences:

- Mathematics is shown inline, in full, not hidden behind toggles. Long
  routine algebra may be folded, but the key steps stay visible.
- Results are derived, not quoted. When a derivation is out of scope, say so
  and cite where it can be found.
- Simulations are instruments for checking the mathematics, not decorations.

## 3. Scope

**In scope:** the sphere and its coordinates, time, the Sun, the Moon, the
planets in longitude, the models of Hipparchus, Ptolemy, Copernicus and
Kepler, eclipses.

**Out of scope for now** (signposted with detour cards and the *Beyond Kepler*
page, see §7.4): planetary latitudes in detail, nutation, aberration,
parallax of stars, Tycho, Islamic astronomy (Tusi couple, Ibn al-Shatir),
Newtonian dynamics and perturbations, calendars, instruments.

---

## 4. The path

Five acts, fifteen pages, plus a hub and an epilogue. Pages are numbered
`act.page`. Each entry gives the guiding question, what the reader learns,
the main figures, exercise ideas, and the residual that hands over to the
next page.

### Act 0: The hook

#### 0.1 · Where is Mars tonight?

- **Question:** how good was a model built from circles?
- **Content:** Ptolemy's Mars, with the *Almagest* parameters, run forward
  from his epoch to tonight, beside the real Mars. The error is a few degrees
  after almost nineteen centuries. Two questions follow: how can circles do
  this well, and why are they still wrong? The rest of the site answers both.
- **Figures:** a strip of the zodiac with both positions; a date slider; the
  error curve over 2,000 years.
- **Note:** this page uses the Act IV machinery, so it is **built last**.

### Act I: The stage

The language needed to state any prediction.

#### 1.1 · The turning sky

- **Question:** what moves, and around what?
- **Learn:** the celestial sphere as a model of directions; diurnal rotation
  as a rotation about the polar axis; the role of the observer's latitude
  $\varphi$; circumpolar, rising and never-rising stars; the horizon.
- **Math:** unit vectors, rotation matrices $R_x(\theta)$, $R_z(\theta)$,
  the altitude of a star as a dot product.
- **Figures:** 3D sphere with horizon, pole and a star's daily circle;
  latitude and time sliders.
- **Exercises:** the condition $\delta > 90^\circ - \varphi$ for a circumpolar
  star; the fraction of the day a star of declination $\delta$ is above the
  horizon.
- **Hands over:** "rotation about the pole" needs coordinates to be stated
  precisely.

#### 1.2 · Frames

- **Question:** how do we name a direction, and how do we change names?
- **Learn:** equatorial $(\alpha, \delta)$, ecliptic $(\lambda, \beta)$ and
  horizontal $(A, a)$ frames, each defined by a fundamental plane and an
  origin; transformations as compositions of rotations; the spherical
  trigonometry formulas obtained by multiplying out the matrices.
- **Figures:** one fixed direction shown in two frames at once; the axes
  rotate, the point does not.
- **Exercises:** derive ecliptic → equatorial; the right ascension and
  declination of the Sun at $\lambda = 60^\circ$; the altitude of a star at
  transit.
- **Hands over:** frames are fixed, but the sky turns: we need time.

#### 1.3 · Clocks

- **Question:** what time is it according to the sky?
- **Learn:** sidereal day versus solar day (one extra turn per year);
  sidereal time; hour angle $H = \text{LST} - \alpha$; mean solar time;
  Julian Date as a continuous time scale.
- **Payoff:** day length as a function of latitude and date; transit times
  of stars.
- **Exercises:** how many sidereal days in a year and why; when a given star
  transits at the reader's longitude on a given night.
- **Hands over:** we assumed the Sun moves uniformly along the ecliptic. It
  does not.

### Act II: The Sun

The first anomaly and the simplest complete model.

#### 2.1 · The uneven year

- **Question:** why are the seasons not equal?
- **Learn:** mean longitude $\bar\lambda$ and true longitude $\lambda$; the
  eccentric circle; the equation of centre $q$, with
  $\lambda = \bar\lambda + q$; fitting the eccentricity $e$ and the apogee
  $\lambda_A$ from two season lengths (Hipparchus' method); $q$ to first order,
  $q \approx -e\sin M$ with $M$ measured from the apogee, so the greatest
  equation of centre is about $e$ radians. (Kepler's ellipse gives
  $2e_\text{K}$: the eccentric's offset is twice the ellipse's eccentricity,
  a point picked up again on page 4.2.)
- **Figures:** the eccentric with the four seasons; $q(t)$ over a year.
  **First appearance of the error curve:** uniform circle versus eccentric
  versus the reference Sun.
- **Exercises:** the worked exercise "Hipparchus' Sun from two numbers"
  (fit $e \approx 0.041$, $\lambda_A \approx 65.4^\circ$ from $94\tfrac12$ and
  $92\tfrac12$ days; predict autumn and winter).
- **Hands over:** the model drifts slowly over centuries (page 2.3); first,
  a consequence we can see every day.

#### 2.2 · The equation of time

- **Question:** why does the sundial disagree with the clock?
- **Learn:** apparent versus mean solar time; the two contributions, from the
  eccentricity (page 2.1) and from the obliquity (projection of the ecliptic
  onto the equator); their sum; the analemma.
- **Figures:** the two components and their sum over a year; the analemma
  drawn as the Sun's position at mean noon.
- **Exercises:** compute the equation of time on a given date and split it
  into its two parts; find the dates when it vanishes.
- **Hands over:** the orientation of the whole picture is not fixed either.

#### 2.3 · Precession

- **Question:** why do the stars' longitudes grow?
- **Learn:** Hipparchus' comparison of Spica with older records; the
  equinoxes moving westward along the ecliptic; tropical versus sidereal
  year; the pole circling the ecliptic pole; the slow motion of the solar
  apogee; why the model of 2.1 drifts over centuries.
- **Figures:** the equator sliding over a fixed ecliptic; the longitude shift
  of several stars as a function of date; the error curve of 2.1 over 2,000
  years with and without a moving apogee.
- **Exercises:** recover the precession rate from two dated longitudes;
  the length of the tropical year given the sidereal year and the rate.
- **Detour:** nutation.
- **Hands over:** the Sun is solved to arcminutes. The Moon is next, and it is
  much harder.

### Act III: The Moon

#### 3.1 · The first anomaly

- **Question:** why does the Moon's speed vary, and with what period?
- **Learn:** sidereal, synodic, anomalistic and draconitic months; the
  epicycle model; **the eccentric/epicycle equivalence theorem**, proved here
  and reused in Act IV; fitting the epicycle radius from eclipses.
- **Figures:** epicycle and eccentric drawn together, tracing the same point;
  the equation of anomaly over two months; error curve against the reference
  Moon.
- **Exercises:** prove the equivalence; find the anomalistic month from the
  beat between two periods.
- **Hands over:** the model is good at new and full Moon and bad in between.

#### 3.2 · Evection and the distance problem

- **Question:** what goes wrong at the quarters?
- **Learn:** the second anomaly (evection), largest at quadratures; Ptolemy's
  crank mechanism; the consequence that the model's Earth-Moon distance
  varies by nearly a factor of two, while the Moon's apparent size does not.
  A model can predict directions correctly and distances absurdly.
- **Figures:** the crank mechanism animated; the predicted versus real
  apparent diameter; the error curve before and after evection.
- **Exercises:** the ratio of greatest to least distance in Ptolemy's model.
- **Hands over:** longitude is now good enough to time eclipses, once we add
  latitude.

#### 3.3 · Eclipses

- **Question:** when does a new Moon become a solar eclipse?
- **Learn:** the inclined lunar orbit; nodes and their regression; eclipse
  limits; the eclipse seasons; the saros. Capstone of Acts II and III.
- **Figures:** the Sun and the Moon near a node; eclipse limits; a calendar of
  syzygies marking which ones are eclipses.
- **Exercises:** decide whether a given new Moon produces an eclipse; derive
  the saros from the three months.
- **Hands over:** the Sun and the Moon each have their own laws. The planets
  are tied to the Sun.

### Act IV: The planets

#### 4.1 · Going backwards

- **Question:** why do planets loop, and why always at opposition?
- **Learn:** retrograde motion; the two anomalies of a planet (zodiacal and
  solar); the epicycle as the carrier of the solar anomaly; superior versus
  inferior planets; synodic period.
- **Figures:** the loop seen from the Earth; the epicycle model; the error
  curve of the simple model for Mars (degrees).
- **Exercises:** the condition for a stationary point; synodic period from
  sidereal periods.
- **Hands over:** the loops come out the wrong size in different parts of the
  zodiac.

#### 4.2 · The equant

- **Question:** what does the simple model miss?
- **Learn:** why one eccentricity cannot fit both the zodiacal anomaly and the
  loop sizes; Ptolemy's bisected eccentricity and the equant point; fitting
  Mars; the equant compared with Kepler's empty focus, and to what order in
  $e$ they agree (derived, then checked numerically).
- **Figures:** deferent, equant and epicycle; the equant versus a Keplerian
  ellipse with the same $e$; the error curve, much smaller.
- **Exercises:** expand both models in $e$ and compare term by term.
- **Hands over:** the model works, but every planet's epicycle turns in step
  with the Sun. Why?

#### 4.3 · Same geometry, new centre

- **Question:** what changes if the Sun is at the centre?
- **Learn:** every epicycle is the Earth's orbit seen from the planet; the
  free ratios become distances; the order of the planets; sidereal periods
  from synodic periods; Mercury and Venus' maximum elongations.
- **Figures:** the same planet in the heliocentric and geocentric frames
  side by side; the error curve, **unchanged**.
- **Point to make:** the predictions barely improved. What changed is that
  the system now has a scale and an order.
- **Exercises:** the radius of Venus' orbit from its greatest elongation.
- **Hands over:** circles still leave an error. Mars shows it most.

#### 4.4 · Kepler

- **Question:** what shape removes the last error?
- **Learn:** the ellipse; the area law; mean, eccentric and true anomaly;
  Kepler's equation and its iterative solution; the third law.
- **Figures:** Mars on its ellipse with swept areas; the error curve, nearly
  flat; all previous error curves overlaid.
- **Exercises:** solve Kepler's equation by fixed-point and Newton iteration;
  compare the convergence.
- **Hands over:** to the epilogue.

### Epilogue

#### Beyond Kepler

One short page: where the story goes next. Each entry has one sentence on why
it matters, and becomes a link when its page exists. Unbuilt entries are
shown greyed out. Candidates: Tycho's observations, Newton and gravitation,
perturbations, nutation, aberration and stellar parallax, planetary latitudes,
the Islamic critiques of the equant, calendars, instruments.

### Hub

The site's `index.html`: the objective in two sentences, the five acts as a
map, and a link to *Beyond Kepler*. Optional: a notation page (§6).

---

## 5. Page anatomy

Every content page is **one scrolling article** (no tabs), so the argument
reads in order. A sticky table of contents lists the sections.

Every page follows the same rhythm:

1. **Observation.** What is seen in the sky, with numbers.
2. **Model.** The geometric idea, derived.
3. **Fit.** How the model's parameters are obtained from observations.
4. **Test.** The model against the reference sky, with the error curve.
5. **Residual.** What is still wrong, and the question for the next page.

Followed by:

- **Exercises** (two or three, see §7.2).
- **Sources** for the page (primary and modern).
- **Previous / next** navigation.

Length target: a page should be readable in 20 to 40 minutes. If it grows
beyond that, split it.

---

## 6. Notation

One notation across the site. Where a historical source uses another, say so
once on the page.

| Symbol | Meaning |
|---|---|
| $\alpha,\ \delta$ | right ascension, declination |
| $\lambda,\ \beta$ | ecliptic longitude, latitude |
| $A,\ a$ | azimuth, altitude |
| $\varphi$ | observer's latitude |
| $\varepsilon$ | obliquity of the ecliptic |
| $H$ | hour angle |
| $\bar\lambda$ | mean longitude |
| $M$ | mean anomaly, measured from the apogee |
| $q$ | equation of centre ($\lambda = \bar\lambda + q$) |
| $e$ | eccentricity, as a fraction of the deferent radius |
| $R,\ r$ | deferent radius, epicycle radius |
| $\Delta\lambda$ | model minus reference, in arcminutes |

Angles are in degrees in prose and figures. Code works in degrees through the
helpers in `shared/common.js`. Sexagesimal values (e.g. $2;29$) are shown when
quoting a historical source, always with their decimal value.

The sign convention for $q$ and the anomalies is fixed on page 2.1 and used
everywhere afterwards.

---

## 7. Conventions

### 7.1 Origin badges

Each idea is tagged with where it came from:

- **Babylonian:** inherited from Mesopotamian astronomy.
- **Greek:** from earlier Greek astronomers and mathematicians.
- **Hipparchus / Ptolemy / Copernicus / Kepler:** the author's contribution, as far as the sources allow.
- **Debated:** attribution or details still discussed by historians.
- **Modern:** the modern understanding or notation.

### 7.2 Exercises

Two or three per page, of four kinds:

- **Compute, then check:** a calculation by hand, then verified in a figure.
- **Predict, then play:** commit to an answer before running the simulation.
- **Derive:** prove a result used on the page.
- **Break the model:** find where the model fails, and explain why.

Each exercise has an optional hint and a full worked answer, both collapsed.
**Every numerical answer is computed by a script, not by hand**, and the
script's output is what goes in the answer.

### 7.3 The error curve

The running thread of the site. A shared widget plots
$\Delta\lambda = \lambda_\text{model} - \lambda_\text{reference}$ in
arcminutes against time. It can overlay the curves of earlier models as
faint "ghosts", so the reader sees the error shrink page by page.

### 7.4 Detour cards

A small, muted card where a topic outside the scope naturally comes up:
"*Detour: nutation, the wobble on top of precession. Coming later.*"
When the topic gets its own page, the card becomes a link.

---

## 8. Shared code

No build step: plain `<script>` tags, so the site works on GitHub Pages and
from a local static server.

| File | Contents |
|---|---|
| `shared/theme.css` | The shared theme. The `:root` variables (background, card, ink, earth, planet, sun, deferent, epicycle colours) are fixed. Layout for articles, figures, badges, exercises, detours, navigation. |
| `shared/common.js` | The `COL` palette (mirrors the `:root` variables), angle and vector helpers, formatting (degrees, sexagesimal, times), KaTeX rendering helpers. |
| `shared/sphere3d.js` | Drawing a draggable 3D sphere on a canvas: projection, great circles, arcs, labels, front/back styling. |
| `shared/plot2d.js` | Simple 2D plots: axes, curves, markers, legends. Used by the error curve and other graphs. |
| `shared/time.js` | Julian Date, calendar conversions, sidereal time. |
| `shared/ephemeris.js` | The reference sky: geocentric ecliptic longitudes of the Sun, the Moon and the planets from modern analytical theories (see §11). Documents its accuracy and range. |
| `shared/errorcurve.js` | The error-curve widget (§7.3). |
| `shared/components.js` | Badges, exercises with hint and answer, detour cards, sticky table of contents, previous/next navigation. |
| `shared/tests.html` | A test page that checks the ephemeris and time functions against published worked examples and prints pass/fail. |

Models built on one page and reused later (the solar eccentric, the lunar
epicycle, the planetary equant) live in `shared/models/` so later pages and
the error-curve ghosts can call them.

## 9. Repository layout

```
index.html                 hub
STRUCTURE.md               this file
shared/                    see §8
  models/
templates/                 page template and a demo of the shared components
act0-hook/
  01-mars-tonight/         index.html, page.js, page.css (optional)
act1-stage/
  01-turning-sky/
  02-frames/
  03-clocks/
act2-sun/
  01-uneven-year/
  02-equation-of-time/
  03-precession/
act3-moon/
  01-first-anomaly/
  02-evection/
  03-eclipses/
act4-planets/
  01-going-backwards/
  02-equant/
  03-new-centre/
  04-kepler/
beyond-kepler/
archive/                   earlier pages, kept for reference, not linked
```

## 10. Code style

- C-style indentation (tabs), braces on the same line, one statement per line.
- CSS and JavaScript fully commented: a header block per file, a comment per
  section, a short comment per non-obvious function.
- Small helper functions with descriptive names rather than long blocks.
- Each page's JavaScript is split by figure: one file or one clearly marked
  section per figure, each with its own `init`, `update` and `draw`.
- Equations are typeset with KaTeX (pinned version, loaded from cdnjs).
- 3D figures where the geometry is genuinely three-dimensional (the sphere,
  frames, inclined orbits); 2D otherwise.
- Light theme, soft palette, from `shared/theme.css` only. Pages add CSS for
  their own figures, never new colours.
- No console errors. Every page is checked in a browser before it is committed.

## 11. Sources

Primary sources (in the project): Ptolemy, *Almagest* (English translation);
Copernicus, *De Revolutionibus*.

Modern references:

- R. Fitzpatrick, *A Modern Almagest*: Ptolemaic models with modern
  parameters, the main reference for Acts II to IV.
- J. Meeus, *Astronomical Algorithms*: time scales, sidereal time, worked
  examples for the tests, and the truncated lunar theory used as the
  reference Moon.
- E. M. Standish, *Keplerian Elements for Approximate Positions of the Major
  Planets* (JPL): the planetary reference.
- J. Evans, *The History and Practice of Ancient Astronomy*.
- O. Neugebauer, *A History of Ancient Mathematical Astronomy*.

Every page lists the sources it actually used.

## 12. Build order

1. Foundation: shared code, page template, hub, tests (no content pages).
2. Act I, in order.
3. Act II, in order.
4. Act III, in order.
5. Act IV, in order.
6. Act 0 (needs the Act IV models).
7. *Beyond Kepler*.

After each act: a consistency pass over the act (notation, rhythm, error
curves, cross-links).
