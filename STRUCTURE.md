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
Kepler, eclipses; which body is taken as at rest, and what the
observations can decide about it (page 4.4: Tycho's system, the phases of
Venus, the argument from stellar parallax). The models are presented as
history, never as true (WRITING.md §9).

**Out of scope for now** (signposted with detour cards and the *Beyond Kepler*
page, see §7.4): planetary latitudes in detail, nutation, aberration, the
measurement of stellar parallax, Tycho's observations, Islamic astronomy (Tusi couple, Ibn al-Shatir),
Newtonian dynamics and perturbations, calendars, instruments, the slowing of
the Earth's rotation ($\Delta T$).

---

## 4. The path

Five acts, sixteen pages, plus a hub and an epilogue. Pages are numbered
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
- **Math:** unit vectors, rotation matrices $R_y(\theta)$ (the tilt about the
  east–west axis) and $R_z(\theta)$ (the turn), the altitude of a star as a dot
  product; the turning Earth and the turning sky give the same altitudes.
- **Figures:** a blue plate of the sky around the pole, with the circle of
  the stars that never set at Rome; 3D sphere with horizon, pole and a
  star's daily circle; latitude and time sliders.
- **Exercises:** the condition $\delta > 90^\circ - \varphi$ for a circumpolar
  star; the fraction of the day a star of declination $\delta$ is above the
  horizon (and Ptolemy's longest day at Rhodes); the equinox day, 10 minutes
  longer than the model's 12 hours (refraction and the Sun's radius).
- **Test:** the model's altitude against the real sky; the residual is
  refraction near the horizon (`Ephem.refraction`).
- **Hands over:** "rotation about the pole" needs coordinates to be stated
  precisely.

#### 1.2 · Frames

- **Question:** how do we name a direction, and how do we change names?
- **Learn:** equatorial $(\alpha, \delta)$ ($\delta$ was met on page 1.1 as the
  distance from the equator; $\alpha$ completes it), ecliptic $(\lambda, \beta)$ and
  horizontal $(A, a)$ frames, each defined by a fundamental plane and an
  origin; transformations as compositions of rotations; the spherical
  trigonometry formulas obtained by multiplying out the matrices.
- **Figures:** a blue plate of the zodiac around Aldebaran, with the
  equatorial grid and the ecliptic; one fixed direction shown in two
  frames at once; the axes rotate, the point does not (ecliptic and equator,
  drawn in the equatorial frame; equator and horizon, drawn in the horizon
  frame, with buttons to redraw it in the equatorial frame). A table of Ptolemy's declinations and right
  ascensions against the real Sun of AD 137.
- **Fit:** the obliquity from the noon Sun at the two solstices (Ptolemy's
  $23^\circ 51' 20''$, *Almagest* I 12); the origin γ from the March equinox.
- **Test:** the formulas against Ptolemy's tables of declination and right
  ascension (*Almagest* I 15–16), and his values against the real Sun of
  AD 137 (a table); the model with the mean obliquity against the real Sun of
  2026, where only nutation remains (a static figure).
- **Exercises:** the inverse, equatorial → ecliptic, by transposing (the
  forward transformation is derived in the text, which needs it); the right
  ascension and declination of the Sun at $\lambda = 60^\circ$; the angle
  between the ecliptic and the horizon (the altitude at transit was already
  page 1.1's).
- **Introduces:** $\theta$, the angle the sky has turned since γ crossed the
  meridian, and $H = \theta - \alpha$; page 1.3 names $\theta$ the local
  sidereal time and reads it off a clock.
- **Hands over:** the obliquity and the origin drift (page 2.3); first, the
  turn $\theta$ is still a free slider: we need time.

#### 1.3 · Clocks

- **Question:** what time is it according to the sky?
- **Learn:** sidereal day versus solar day (one extra turn per year);
  sidereal time; hour angle $H = \text{LST} - \alpha$ (page 1.2 already wrote
  $H = \theta - \alpha$, with $\theta$ the turn of the sky: here
  $\theta = \text{LST}$); mean solar time; Julian Date as a continuous time
  scale.
- **Payoff:** day length as a function of latitude and date; transit times
  of stars. Day length counts the Sun's upper limb with refraction
  ($h_0 = -50'$, `Ephem.refraction`), as found on page 1.1.
- **Figures:** the sky from above the pole through 2026 (date and time:
  366 turns of the sky in 365 days; play a day or a year); the three angles of
  $\theta_G = H_m + \alpha_m$ on the equator (static, one worked moment);
  $\theta$, $\alpha$ and $H$ as arcs of the
  equator in the observer's sky (3D, time and longitude); a star calendar of
  transits and nights; the length of the day at one latitude and at every
  latitude; the model Sun against the real one.
- **Model:** $Y$ solar days are $Y + 1$ sidereal days; $\theta = \theta_G +
  \ell$; mean solar time from the mean Sun ($\alpha_m = \bar\lambda$), which
  gives $\theta_G = L_0 + (360^\circ + n)\,d$, the linear part of Meeus 12.4.
  The payoffs (transits, day length) are the model's predictions, derived
  in the Model section and checked in Test.
- **Fit:** the rate from the year (Ptolemy's 365.24667 days, *Almagest*
  III 1), the constant from the mean Sun at J2000, the longitude from one
  timed transit.
- **Test:** the stars, against apparent sidereal time (within 0.7 s, the
  nutation); the Sun, model minus real noon, sunrise and sunset through 2026
  (a figure): noon from −14 to +16 min at every latitude, the day up to
  13 min too short at 65°.
- **Exercises:** how many sidereal days in a year and why (with Ptolemy's
  daily motion, and the Moon's 24 h 50 min day); when Sirius transits at Rome
  on New Year's Eve, then at the reader's longitude; the earliest sunset and
  the latest sunrise are not on the solstice (break the model).
- **Code:** `models/mean-sun.js` (the uniform Sun, `make()`) and
  `models/clock.js` (sidereal time, transits, the model Sun's day).
- **Hands over:** we assumed the Sun moves uniformly along the ecliptic. It
  does not. (Noon's second cause, the tilt, goes to page 2.2; $\Delta T$,
  the drift of the Earth's rotation, to page 3.3 and a detour card.)

### Act II: The Sun

The first anomaly and the simplest complete model.

#### 2.1 · The uneven year

- **Question:** why are the seasons not equal?
- **Learn:** mean longitude $\bar\lambda$ and true longitude $\lambda$; the
  eccentric circle; the equation of centre $q$, with
  $\lambda = \bar\lambda + q$; fitting the eccentricity $e$ and the apogee
  $\lambda_A$ from two season lengths (Hipparchus' method); $q$ to first order,
  $q \approx -e\sin M$ with $M$ measured from the apogee, so the greatest
  equation of centre is about $e$ radians (exactly $\arcsin e$). (Kepler's
  ellipse gives $2e_\text{K}$: the eccentric's offset is twice the ellipse's
  eccentricity, a point picked up again on page 4.2.)
- **Notation:** the centre of the eccentric is $C = (h, k)$, so that $x$
  and $y$ stay the axes, and $q$ the equation of centre; $h < 0$ today,
  since the apogee is beyond 90°.
- **Model:** $q = -\operatorname{atan2}(e \sin M, 1 + e \cos M)$, derived
  from $\vec{OS} = \vec{OC} + \vec{CS}$; the seasons are the arcs of the
  eccentric between the lines from the Earth to the equinoxes and solstices.
- **Figures:** the real Sun's daily motion through 2026 (static); the
  eccentric with its four seasons beside $q(t)$ over a year (date and $e$,
  starting at the exaggerated $e = 0.2$); Hipparchus' construction, with
  the centre $C = (h, k)$ drawn six times farther out to show the angles
  $\arcsin h$, $\arcsin k$ and the arcs $a_1$, $a_2$, and C at its true
  place magnified (spring and summer, with presets). **First appearance of
  the error curve:** (a) the uniform circle (ghost) against the eccentric
  fitted to 2026 and (b) the eccentric alone on a scale a hundred times
  finer; Ptolemy's Sun in AD 140 and over 2,000 years; the eccentric over
  100 and 1,000 years. A photo: Peurbach's woodcut of the Sun's eccentric
  orbs.
- **Fit:** $e$ and $\lambda_A$ from spring and summer (Hipparchus'
  $94\tfrac12$ and $92\tfrac12$ days, *Almagest* III 4; the reference
  seasons of 2026, which give $e = 2e_\text{K}$ within 0.1%); the mean
  longitude at epoch $L_0$ from the timed spring equinox (page 1.3 used
  Meeus' value without deriving it).
- **Test:** the eccentric against the reference Sun (within 1.7′ in 2026,
  against 115′ for the uniform circle); page 1.3's day at 65° now within
  0.3 min; Ptolemy's own Sun 1.1° behind in AD 140 (his equinoxes a day
  late), 9.2° by 2026.
- **Exercises:** "Hipparchus' Sun from two numbers" (fit $e \approx 0.041$,
  $\lambda_A \approx 65.4^\circ$ from $94\tfrac12$ and $92\tfrac12$ days;
  predict autumn and winter); derive $q$ to second order and its greatest
  value $\arcsin e$ (Ptolemy's $2^\circ 23'$ at $92^\circ 23'$); Ptolemy's fixed apogee
  against the real seasons of AD 140 (break the model).
- **Code:** `models/solar-eccentric.js` (`SolarEccentric.make()`, the
  parameter sets `PTOLEMY` and `FIT_2026`, `fitSeasons`); `MeanSun.PTOLEMY`,
  whose days are days of UT.
- **Hands over:** the apogee moves, about 1.75° a century relative to γ, so
  the model drifts slowly over centuries (page 2.3); the eccentric's distance
  varies twice as much as the real one (pages 3.2, 4.5); first, a consequence
  we can see every day.

#### 2.2 · The equation of time

- **Question:** why does the sundial disagree with the clock?
- **Learn:** apparent versus mean solar time; the equation of time $E$,
  apparent minus mean (positive when the sundial is ahead; page 1.3's noon
  error was $E$); the true solar day and $E$ as the running sum of its
  excesses over 24 h; the two contributions, $E = -q + (\lambda - \alpha)$,
  from the eccentricity (page 2.1) and from the obliquity (the reduction to
  the equator); $\tan(\lambda - \alpha)$ has the form of page 2.1's
  equation of centre, with $e_\varepsilon = \tan^2(\varepsilon/2)$ for $e$
  and $2\lambda$ for $M$, so page 2.1's results apply (first order
  $e_\varepsilon \sin 2\lambda$, greatest value $\arcsin e_\varepsilon$);
  $d\alpha/d\lambda = \cos\varepsilon / \cos^2\delta$, derived from
  $\cos\delta\cos\alpha = \cos\lambda$ (page 1.2), and the lag greatest where
  it equals 1; the mean Sun as a reference point moving along the equator;
  their
  sum to first order, $E \approx e\sin M + e_\varepsilon \sin 2\bar\lambda$
  (radians); the analemma.
- **Figures:** the true solar day and its running sum, $E$, through 2026
  (static); a photo of an analemma in the sky (Donatiello, CC0); the
  reduction to the equator (3D: the uniform Sun on the ecliptic, its hour
  circle, the mean Sun on the equator; with $\lambda - \alpha$ against
  $\lambda$; longitude and obliquity, starting at an exaggerated 45°, with
  a preset for today's); the two components and their sum over 2026; the analemma drawn as the Sun's
  position at mean noon (date; both causes, eccentricity only, obliquity
  only); the model against the real $E$ in 2026; the real $E$ against the
  Sun's longitude in a chosen year, 1000 BC to AD 3000.
- **When building:** the obliquity part is the reduction to the equator,
  $\alpha - \lambda$, computed by `Frames.reduction` in
  `shared/models/frames.js` (page 1.2 notes the lag in its table of Ptolemy's
  values).
- **Fit:** no new parameter. The equation of time alone gives back those of
  pages 1.2 and 2.1: its yearly and half-yearly terms (averages over a year)
  give $e$, $\lambda_A$ and $\varepsilon$ to first order (biased by the cross
  term $e\,e_\varepsilon$); the exact model fitted by least squares gives
  $e = 0.0334$ and $\lambda_A = 103.4^\circ$.
- **Test:** in time, not with the $\Delta\lambda$ widget (the longitude model
  is page 2.1's): within 6 s of the real $E$ in 2026, against page 1.3's
  ±16 min; Ptolemy's total in *Almagest* III 9 ($3\tfrac23 + 4\tfrac23 =
  8\tfrac13$ time-degrees, 33⅓ min), which his own model reproduces,
  against the real 31 min of his time, and why he needed it (the Moon).
  Keep the numbers in the prose few and rounded.
- **Exercises:** compute the equation of time on a given date (3 November
  2026) and split it into its two parts; predict the dates when it vanishes
  with $e = 0$ and with $\varepsilon = 0$, then find the real ones; derive
  where the reduction is greatest, and its greatest value.
- **Code:** `models/equation-of-time.js` (`EquationOfTime`: the two parts and
  their sum for a solar model and an obliquity, the reduction as an
  eccentric, the first-order formula, the Sun at mean noon, real noon from
  mean noon). Pages 3.1 and 3.3 reuse it: Ptolemy converts true into mean
  solar days for the Moon (III 9), and ancient eclipse times are in
  apparent time.
- **Hands over:** the orientation of the whole picture is not fixed either.
  The shape of $E$ changes over the centuries, because the apogee moves
  relative to γ: symmetric around 1246, when the apogee passed the summer
  solstice (page 2.3).

#### 2.3 · Precession

- **Question:** why do the stars' longitudes grow?
- **Learn:** Hipparchus' comparison of Spica with Timocharis (8° and 6°
  before the autumn equinox, *Almagest* VII 2); the recorded longitudes of
  Spica from Timocharis to Copernicus; latitudes fixed, declinations
  changing (VII 3); precession as a turn about the poles of the ecliptic,
  or the equator turning westward over a fixed ecliptic (Copernicus, III 1),
  with γ in the direction of $\vec P \times \vec K$; the rate of change of
  declination, $p\sin\varepsilon\cos\beta\cos\lambda/\cos\delta$; the
  pole's circle of 25,770 years (Thuban, Polaris, Vega); tropical versus
  sidereal year, $Y_\text{s} = Y \cdot 360^\circ/(360^\circ - pY)$; the
  slow motion of the solar apogee; why the model of 2.1 drifts over
  centuries.
- **Figures:** six stars of the reference sky over 6,000 years ((a) the
  change of λ and β, one line each; (b) δ, a curve per star; static); the
  equator turning over the fixed ecliptic (3D in the ecliptic frame, year
  slider and play, presets 2831 BC, 128 BC, 2026, AD 13,790); a blue plate
  of the path of the pole among the northern stars (on trial: Marco decides
  whether to keep it); Spica's six records with the line fitted to them and
  Ptolemy's rule (static); the error curves of uniform precession for Spica
  and of the eccentric with and without a moving apogee over 2,000 years;
  the thirteen records of Spica, Regulus and β Scorpii minus the real sky,
  with the error of Ptolemy's Sun (static).
- **Fit:** Ptolemy's 1° in 100 years from Regulus (VII 2); the rate from
  Spica's records over 18 centuries (50.6″ a year); $p = 50.29''$ a year
  from the reference sky around 2026; Copernicus' mean rate (III 6); the
  apogee's rate, 1.741° a century, from the seasons of seventeen years by
  Hipparchus' method, of which 1.397° is precession.
- **Test:** uniform precession within 2.6′ of Spica over 2,000 years; the
  eccentric with a moving apogee within 6′ over 2,000 years (38.5′ with the
  apogee fixed), and page 2.2's equation of time within 11 s over 1,000
  years; Ptolemy's slow rate comes mostly from his Sun: the records he
  reduced err as his Sun does, and 49.9″ less the 14.9″ a year of his
  Sun's drift gives 34.9″, near his 36″ (the full cause is debated).
- **Exercises:** the rate from two records of Regulus (Hipparchus and
  al-Battani; Hipparchus and Ptolemy); the sidereal year from the
  tropical year and the rate, and Ptolemy's, nearly right because his
  errors cancel; Copernicus' uneven precession (break the model).
- **Code:** `models/precession.js` (`Precession`: `MODERN`, `PTOLEMY`, the
  records of the three stars); `SolarEccentric.apogeeAt` and
  `MOVING_2026`; Regulus in `Stars.LIST`, β Scorpii and Thuban in
  `Stars.MORE`.
- **Detour:** nutation; Newton (the cause of precession); perturbations
  (the apogee's own motion).
- **Hands over:** the Sun is solved to arcminutes. The Moon is next, and it is
  much harder.

### Act III: The Moon

#### 3.1 · The first anomaly

- **Question:** why does the Moon's speed vary, and with what period?
- **Learn:** the Moon's daily motion, 11.8° to 15.3° in 2026, its peaks
  drifting through the phases; the tropical, sidereal, synodic,
  anomalistic and draconitic months, and the beat of the speed against
  the phases (411.8 days); the period relations of *Almagest* IV 2 (251
  synodic = 269 anomalistic months), from Babylonian astronomy (Toomer);
  the epicycle model (IV 6), with the equation of anomaly
  $q = -\operatorname{atan2}(e\sin M, 1 + e\cos M)$, $e = r/R$, the solar
  equation of centre of page 2.1; the speed, $n + n_M\,dq/dM$; **the
  eccentric/epicycle equivalence theorem**, proved by commuting the two
  vectors (a parallelogram, IV 5), the eccentric's apogee turning at
  $n - n_M$ (8.85 years), reused in Act IV; the three-eclipse method,
  linear to first order in $X = e\cos M_2$, $Y = e\sin M_2$, exact by
  Newton's method.
- **Figures:** the Moon's daily motion through 2026 with its full Moons
  (static); the epicycle with $q$ over two months (date and $r/R$,
  starting at an exaggerated 0.3, with Ptolemy's 5.25 in 60 as a preset); the
  epicycle and its eccentric drawn together, the parallelogram O K Moon C
  (date, a month or nine years); the three-eclipse method on four sets of
  eclipses, with the two equations in the plane of $X, Y$; the error curve
  of our epicycle (uniform Moon as ghost, dots at new and full Moon); the
  error curve of Ptolemy's simple Moon. A photo: the eclipse of 7 September
  2025 (Donatiello, CC0).
- **Fit:** the mean motions, $n = n_\odot + 360^\circ/P_s$ (Ptolemy's from
  his Sun and Hipparchus' synodic month, IV 2-3) and $n_M = 269 \times
  360^\circ / (251\,P_s)$ (corrected in IV 7), ours from Meeus 47; the data
  of a triple: the arcs of anomaly $a = n_M\,\Delta t$ from the intervals,
  reckoned in mean solar days (the equation of time, III 9), and $d$ = the
  Sun's true motion between the eclipses (the Moon's, beyond whole turns)
  minus $n\,\Delta t$, worked through for the Babylonian eclipses (a
  table); $e$ and the anomaly from three
  eclipses: Ptolemy's Babylonian and Alexandrian triples give back 5.22
  and 5.23 where the deferent is 60 (he uses 5.25, IV 6, IV 10), Copernicus' 0.08604 (*De Rev.*
  IV 5); ours of 7 Sep 2025, 3 Mar 2026, 28 Aug 2026 give $e = 0.0844$;
  consecutive triples of 2019 to 2030 range from 0.080 to 0.093, and a
  least-squares fit to the 25 new and full Moons of 2026 gives 0.0864.
- **Test:** in 2026 within 40′ at the 25 new and full Moons, up to 2.9°
  at the quarters and 3.2° overall (the uniform Moon 7.9°); no growth over
  a thousand years. Ptolemy's simple Moon is a degree behind at his own
  eclipses, as his Sun is, and 10° behind by 2026.
- **Exercises:** prove the equivalence in Ptolemy's general form, and
  judge Hipparchus' two ratios (IV 11); the anomalistic month from the
  beat of the fastest full Moons, 2001 to 2039; Ptolemy's Babylonian
  triple, to first order and exactly.
- **Code:** `models/lunar-epicycle.js` (`LunarEpicycle`: `make()`,
  `makeUniform()`, `construction` for the equivalence, `threeEclipses`,
  `fitEclipses`, `TRIPLES`, `PTOLEMY`, `MEEUS`, `FIT_2026`);
  `ErrorCurve.addMarks` (dots at chosen dates).
- **Residual:** at the quarters, Hipparchus' sighting of 127 BC (V 3);
  the evection, which takes 1.27° from the ellipse's 6.29° at new and full
  Moon and adds it at the quarters; the remaining 40′ at new and full Moon
  is half the three-eclipse fit (a least-squares epicycle, $e = 0.0864$,
  stays within 22′) and mostly the annual equation (11′).
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

- **Question:** what changes if the Sun is taken as at rest?
- **Learn:** Copernicus' arrangement: in Ptolemy's models every outer
  planet's epicycle radius stays parallel to the line from the Earth to
  the mean Sun (*Almagest* X 6), and the deferents of Venus and Mercury
  follow the mean Sun approximately (from the equant, not the Earth);
  linking them all to one Earth–Sun line, at a scale of its own for each
  planet, turns the free ratios into distances; the order of the planets;
  sidereal periods from synodic periods; Mercury and Venus' maximum
  elongations.
- **Figures:** the same planet in the heliostatic and geostatic
  descriptions side by side; the error curve, **unchanged**.
- **Point to make:** the predictions barely improved. What changed is that
  the system now has a scale and an order. They come from the arrangement:
  the body taken as at rest changes no prediction (WRITING.md §9).
- **Exercises:** the radius of Venus' orbit from its greatest elongation.
- **Hands over:** Tycho kept this arrangement with the Earth at rest. What
  can the observations decide?

#### 4.4 · What moves?

- **Question:** can the observations decide which body is at rest?
- **Learn:**
  - The frame (what is taken as at rest) and the arrangement (how the
    motions are linked; the order and the distances of the planets) are
    separate questions. Directions from the Earth depend only on the
    relative positions and velocities of the bodies, so they cannot decide
    the frame, while the arrangement makes predictions that can be tested.
  - Tycho's system (1588): the Sun, the Moon and the planets arranged as
    in Copernicus, about a resting Earth, the planets going round the Sun
    and the Sun round the Earth. Copernicus' model moved to the Earth at
    rest gives the same direction to every planet at every moment, proved
    with vectors as in the equivalence of page 3.1. Tycho's stars stay on
    a sphere about the Earth, though, so the two arrangements differ for
    the stars.
  - The phases of Venus (Galileo, observed 1610): when Venus' epicycle
    lies wholly between the Earth and the Sun, as in Ptolemy's order
    (*Almagest* IX 1, and the nested spheres of the *Planetary
    Hypotheses*), Venus is never more than half lit; a gibbous Venus is
    expected in Copernicus' arrangement and Tycho's alike.
  - Stellar parallax: Copernicus explains its absence by the distance of
    the stars (*De Revolutionibus* I 10); Bessel measured it in 1838 (61
    Cygni). With the Earth at rest it means that every star moves each
    year with the Sun, which Tycho's stars do not: parallax decides
    between Tycho's arrangement and Copernicus'. Aberration (Bradley,
    1729), which depends on the Earth's velocity relative to the stars,
    bears on the same question.
  - The physical arguments: Ptolemy's clouds and thrown objects
    (*Almagest* I 7), and his answer to an air that turns with the Earth;
    Copernicus' natural motion and his ship (*De Revolutionibus* I 8);
    Newton's laws of motion (*Principia*, 1687), which hold in inertial
    frames, where the solar system's centre of mass, near the Sun, is at
    rest or moves uniformly, and are simplest where it is at rest (Book
    III, Hypothesis 1 and Propositions 11–12). Physics makes the
    heliostatic description simpler; the geostatic one stays correct once
    the forces of an accelerated, turning frame are added. The Earth's
    daily rotation shows in an experiment on the ground (Foucault, 1851);
    its yearly motion, a free fall, does not show in experiments of that
    kind.
- **Figures:** Mars seen from the Earth in Copernicus' and Tycho's systems,
  side by side, with one error curve for both, identical by construction;
  the phases of Venus in Ptolemy's arrangement and in Copernicus'; a star's
  parallax drawn with the Sun at rest and with the Earth at rest.
- **Exercises:** derive that Tycho's and Copernicus' systems give the same
  directions; the greatest phase of Venus in Ptolemy's arrangement; the
  parallax of 61 Cygni from its distance, and why Copernicus could not see
  it.
- **Rhythm:** no longitude to fit, as in Act I: observation (Venus),
  model (frames and arrangements), test (the two error curves coincide),
  residual (Mars).
- **Sources:** *Almagest* I 7, IX 1 and X 6; *De Revolutionibus* I 5,
  I 8, I 10 and the preface to Book II; for Tycho, Galileo, Bessel,
  Bradley, Newton, Foucault and Kepler, sources outside the
  `astronomy-sources` library, to be chosen and checked when the page is
  built (the dates above are not yet checked against them).
- **Hands over:** circles still leave an error, and Mars shows it most.
  Kepler, who looked in the Sun for the physical cause of the planets'
  motions (*Mysterium Cosmographicum*, 1596; *Astronomia Nova*, 1609),
  removes it.

#### 4.5 · Kepler

- **Question:** what shape removes the last error?
- **Learn:** the ellipse; the area law; mean, eccentric and true anomaly;
  Kepler's equation and its iterative solution; the third law.
- **Figures:** Mars on its ellipse with swept areas; the error curve, nearly
  flat; all previous error curves overlaid.
- **Exercises:** solve Kepler's equation by fixed-point and Newton iteration;
  compare the convergence.
- **Caution (reference sky):** the reference planets in `shared/ephemeris.js`
  are themselves Keplerian (Standish's elements). A Kepler model with modern
  elements would match them almost by construction, so the error curve's last
  step would look misleadingly good. This page must either compare Kepler's
  own parameters (the *Rudolphine Tables*, 1627) with the reference, or use
  VSOP87 as the reference on this page. The same applies to any later page
  that judges a Keplerian model at the arcminute level.
- **Hands over:** to the epilogue.

### Epilogue

#### Beyond Kepler

One short page: where the story goes next. Each entry has one sentence on why
it matters, and becomes a link when its page exists. Unbuilt entries are
shown greyed out. Candidates: Tycho's observations, Newton and gravitation,
perturbations, nutation, aberration and stellar parallax, planetary latitudes,
the Islamic critiques of the equant, calendars, instruments.

### Hub

The site's `index.html`: the objective in two sentences, the course as a
journey through the models before Kepler (WRITING.md §9), the five acts as a
map, and a link to *Beyond Kepler*. Optional: a notation page (§6).

---

## 5. Page anatomy

Every content page is **one scrolling article** (no tabs), so the argument
reads in order. A table of contents on the left lists the sections and
follows the reader down the page (sticky). The look of every page is set by
`STYLE.md`.

Every page follows the same rhythm:

1. **Observation.** What is seen in the sky, with numbers.
2. **Model.** The geometric idea, derived.
3. **Fit.** How the model's parameters are obtained from observations.
4. **Test.** The model against the reference sky, with the error curve from
   page 2.1 on. Act I has no longitude model: its pages test the quantity
   they predict (an altitude, a rising time).
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
| $A,\ a$ | azimuth (from north through east), altitude |
| $\varphi$ | observer's latitude |
| $\varepsilon$ | obliquity of the ecliptic |
| $H$ | hour angle, $H = \theta - \alpha$ |
| $\theta$ | the angle the sky has turned since γ crossed the meridian (local sidereal time, page 1.3) |
| $\theta_G$ | the sidereal time at Greenwich, $\theta = \theta_G + \ell$ |
| $\ell$ | geographic longitude, positive east (Meeus counts it positive west; Fitzpatrick writes $\varphi$) |
| $d$ | days since J2000.0, $\text{JD} - 2451545.0$ |
| $n$ | the mean Sun's daily motion, $360^\circ / Y$ |
| γ | the vernal point, origin of $\alpha$ and $\lambda$ (♈ in older books) |
| P, K, Z | north celestial pole, north ecliptic pole, zenith |
| $\bar\lambda$ | mean longitude |
| $\lambda_A$ | longitude of the apogee |
| $M$ | mean anomaly, measured from the apogee, $M = \bar\lambda - \lambda_A$ (Fitzpatrick counts it from the perigee) |
| $q$ | equation of centre ($\lambda = \bar\lambda + q$), negative from the apogee to the perigee |
| $e$ | eccentricity, as a fraction of the deferent radius |
| $R,\ r$ | deferent radius, epicycle radius |
| $E$ | equation of time, apparent minus mean solar time ($\bar\lambda - \alpha$, at 4 min per degree), positive when the sundial is ahead of the clock (Meeus' sign) |
| $e_\varepsilon$ | $\tan^2(\varepsilon/2)$, the "eccentricity" of the reduction to the equator, $\tan(\lambda - \alpha) = e_\varepsilon \sin 2\lambda / (1 + e_\varepsilon \cos 2\lambda)$ (page 2.2) |
| $\Delta\lambda$ | model minus reference, in arcminutes |
| $p$ | the rate of precession in longitude (″ a year), page 2.3 |
| $Y,\ Y_\text{s}$ | the tropical year (page 1.3) and the sidereal year (page 2.3) |
| $\dot\lambda_A$ | the motion of the apogee relative to γ (degrees a century), page 2.3 |
| $n_M$ | the daily motion in anomaly (page 3.1); $n$ is then the daily motion in longitude |
| $q$ (Moon) | the equation of anomaly, $\lambda = \bar\lambda + q$, with $M$ counted from the apogee of the epicycle and $e = r/R$ (page 3.1) |

Angles are in degrees in prose and figures. Code works in degrees through the
helpers in `shared/common.js`. An angle quoted from a historical source is
written in degrees, minutes and seconds ($23^\circ 51' 20''$), always with its
decimal value. Other sexagesimal quantities are written as decimals: a ratio on
a radius of 60 as 5.25, a length of the year as 365.24667 days. The
sources' semicolon notation is not used on the pages;
the scripts in `tools/numbers/` keep it, to check the values against the
sources.

The sign convention for $q$ and the anomalies is fixed on page 2.1 and used
everywhere afterwards: $M$ counts from the apogee, and $q$ is negative while
the body goes from the apogee to the perigee, as in Ptolemy, who subtracts
the equation there (*Almagest* III 8).

---

## 7. Conventions

### 7.1 Origin notes

Each idea is tagged with where it came from, by a note in the margin next
to its paragraph (`STYLE.md` §4.5): a small-caps heading "Origin · Greek",
coloured by origin. For now the note is the heading only; a one-sentence
explanation comes later, with the content work. The hub explains the
origins once, in a key:

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
script's output is what goes in the answer. The script is kept in
`tools/numbers/` (one per page, loading the shared code in Node), with any
raw data it was built from.

### 7.3 The error curve

The running thread of the site. A shared widget plots
$\Delta\lambda = \lambda_\text{model} - \lambda_\text{reference}$ in
arcminutes against time. It can overlay the curves of earlier models as
faint "ghosts", so the reader sees the error shrink page by page.

### 7.4 Detour notes

A margin note next to the paragraph where a topic outside the scope
naturally comes up (`STYLE.md` §4.5): the heading "Detour · coming later",
then the topic and why it matters, "*Nutation: the small wobble of the pole
on top of precession.*" When the topic gets its own page, the topic becomes
a link.

---

## 8. Shared code

No build step: plain `<script>` tags, so the site works on GitHub Pages and
from a local static server.

| File | Contents |
|---|---|
| `shared/theme.css` | The shared theme, in the style of `STYLE.md`. The `:root` variables hold the palette of `STYLE.md` §2 and are fixed. Fonts, page layout (contents on the left, text and margin columns), the graduated frame, margin notes, controls, exercises, navigation. |
| `shared/common.js` | The `COL` palette (mirrors the `:root` variables) and `textColor`; the four-pointed star (`drawStar`, `starPath`, `starSize`: every star in every figure, never a dot, `STYLE.md` §5) and the canvas fonts; angle and vector helpers, formatting (degrees, sexagesimal, times), KaTeX rendering helpers. |
| `shared/sphere3d.js` | Drawing a draggable 3D sphere on a canvas: projection, great circles, arcs, stars (`star`), labels, front/back styling. |
| `shared/plot2d.js` | Simple 2D plots: axes, curves, markers, stars (`star`), legends. Used by the error curve and other graphs. |
| `shared/time.js` | Julian Date, calendar conversions, sidereal time. |
| `shared/ephemeris.js` | The reference sky: geocentric ecliptic longitudes of the Sun, the Moon and the planets from modern analytical theories (see §11), precession, and atmospheric refraction. Documents its accuracy and range. |
| `shared/stars.js` | Bright stars (J2000 positions, proper motions and V magnitudes from SIMBAD) and their positions of date. |
| `shared/plate.js` | The blue plate (`STYLE.md` §7): static charts of the sky in SVG, polar and rectangular, with the constellation figures, the Milky Way, the graduated ring or border and the highlight. |
| `shared/plate-stars.js` | The stars of the plates (SIMBAD and Hipparcos, V < 5.0 in the charted regions and the constellation stars), generated by `tools/make-plate-stars.py` from `tools/numbers/data/`. |
| `shared/errorcurve.js` | The error-curve widget (§7.3). |
| `shared/site-map.js` | The site map: acts, pages (with their `ready` flag), detour topics, origins, exercise kinds. Publishing a page is setting its `ready: true` here. |
| `shared/components.js` | Built from the site map: the page header, the sticky table of contents, origin and detour margin notes, exercises with hint and answer, figure numbers, previous/next navigation, the hub; and the graduated frame around every figure (`GraduatedFrame`, `STYLE.md` §6). |
| `shared/tests.html` | A test page that checks the ephemeris and time functions against published worked examples and prints pass/fail. |

Models built on one page and reused later (the turning sky, the frames, the
solar eccentric, the lunar epicycle, the planetary equant) live in
`shared/models/` so later pages and the error-curve ghosts can call them. A
model that does not predict a longitude (the turning sky, `models/diurnal.js`;
the frames, `models/frames.js`; the clocks, `models/clock.js`; the equation
of time, `models/equation-of-time.js`) exports plain functions instead of
`make()`. Precession (`models/precession.js`, page 2.3) predicts the
longitude of a star: its `make(parameters, lon0)` takes the star's longitude
at the epoch. The lunar epicycle (`models/lunar-epicycle.js`, page 3.1)
reuses the solar equation of centre as its equation of anomaly. The mean Sun (`models/mean-sun.js`, page 1.3)
is the first model with `make()`, and the solar eccentric
(`models/solar-eccentric.js`, page 2.1) the first that adds an anomaly to it.
A parameter set whose days are turns of the Earth, as every ancient one is,
says so with `clock: 'ut'`.

## 9. Repository layout

```
index.html                 hub
STRUCTURE.md               this file
shared/                    see §8
  models/
templates/                 page template and a demo of the shared components
tools/numbers/             the script behind each page's numbers (§7.2)
tools/check/               checks run after every change (golden values, smoke test)
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
  04-what-moves/
  05-kepler/
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
  Planets* (JPL): the planetary reference. Being Keplerian, it cannot judge a
  Keplerian model (see page 4.5).
- J. Vondrák, N. Capitaine, P. Wallace, *New precession expressions, valid
  for long time intervals* (A&A, 2011), as in SOFA / ERFA: the precession
  used by the reference sky.
- JPL Horizons (DE441): the yardstick for the reference sky's documented
  accuracy and for some of the tests.
- SIMBAD (CDS, Strasbourg): star positions and proper motions (ICRS J2000)
  for `shared/stars.js`.
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
