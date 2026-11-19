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
  error curve over 2000 years.
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
- **Fit:** the rate from two timed meridian crossings (Vega at Greenwich,
  1 June 1925 and 1 June 2025, 36·625 turns apart); the geographic
  latitude and a declination from the two meridian crossings of a
  circumpolar star (Kochab from Alexandria). History block: Ptolemy's
  meridian ring and plaque (*Almagest* I 12) and his latitude of Alexandria,
  30°58′ (V 12).
- **Test:** the model's altitude against the real sky; the residual is
  refraction near the horizon (`Ephem.refraction`). No history block.
- **Residual:** refraction left out of the models; Polaris drifts (page
  2.3); the Sun, the Moon and the planets move among the stars; two
  coordinates and conversions are needed (page 1.2).
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
  frames at once: ecliptic and equator, drawn in the equatorial frame,
  with the obliquity marked between the two poles, the fixed stars, and
  the Sun moved along the ecliptic by the date; equator and horizon, drawn
  in the horizon frame, with $\theta$, $\alpha$ and $H$ as three arcs
  ($H$ on the equator, the other two beside it), then $A$ and $a$, and
  the ecliptic and its angle to the horizon as a second choice (exercise
  3). The horizon figure is not redrawn in the equatorial frame: page
  1.1 shows that pair of views. Two static figures: the spherical
  triangle of the pole, the zenith and the star, for the observation of
  section 1; and, in the Fit, the noon altitude of the Sun at Alexandria
  through 2025, with the obliquity above and below the altitude of the
  equator and the March equinox where the curve crosses it.
- **Fit:** the obliquity from the noon Sun at the two solstices (Alexandria,
  2025, the last whole year before today); the origin γ from the March
  equinox of 2025. History block: Ptolemy's
  meridian ring and plaque, his bounds and $23^\circ 51' 20''$ (*Almagest*
  I 12); Hipparchus' equinoxes on the equatorial ring (III 1).
- **Test:** the model with the mean obliquity against the real Sun of 2026,
  where only nutation remains (a static figure). History block: Ptolemy's
  tables of declination and right ascension (*Almagest* I 13–16), exact for
  his obliquity, so his declinations are too large by up to 10.7′;
  Copernicus finds the obliquity variable (*De Revolutionibus* II 2).
- **Residual:** the obliquity changes (14.5′ since Ptolemy) and γ moves
  (page 2.3); $\theta$ is still a slider (page 1.3).
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
  366 turns of the sky in 365 days, the solid part of the ecliptic showing
  the extra turn; play a day or a year); the three angles of
  $\theta_G = H_m + \alpha_m$ on the equator (static, one worked moment);
  $\theta_G$, $\ell$, $\alpha$ and $H$ as arcs of the equator seen from
  above the pole (2D, time and longitude: the time turns the sky, the
  longitude the observer's meridian); a star calendar of transits and
  nights; the length of the day through the year at one latitude, and
  against the latitude on three dates; the model Sun against the real one
  (noon and the length of the day).
- **Model:** $Y$ solar days are $Y + 1$ sidereal days; $\theta = \theta_G +
  \ell$; mean solar time from the mean Sun ($\alpha_m = \bar\lambda$), which
  gives $\theta_G = L_0 + (360^\circ + n)\,d$, the linear part of Meeus 12.4.
  The payoffs (transits, day length) are the model's predictions, derived
  in the Model section and checked in Test.
- **Fit:** the rate from the year, measured from the equinoxes and
  solstices of 1926–2025 (365.24219 days; an error in the rate
  accumulates, in the clock as in the mean Sun: 16 s a century for a
  minute in the year), the constant $L_0$ as the mean of $\lambda_\odot -
  n\,d$ over the 19 whole years 2007–2025, carried from days of TT to the
  days of UT the clock counts (+2.6″), the longitude from one timed
  transit. UT's own constants (Meeus 12.4) are a convention, quoted in the
  Model for the worked example. History block: Hipparchus' and Ptolemy's
  365.24667 days from solstices and equinoxes one to several centuries apart
  (*Almagest* III 1), their mean Sun, and a clock built on it, 0.44° a
  century behind. No history block in the Test.
- **Residual:** ΔT in short prose (69 s today, about 2½ hours in Ptolemy's
  time; every ancient timing from page 2.1 on is corrected by it), the
  estimate from the lengthening day in a fold; the stars' drift (page 2.3);
  the two causes of the noon error, the tilt (page 2.2) and the uneven Sun,
  the only cause of the day-length error (page 2.1).
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
  does not. (Noon's other cause, the tilt, goes to page 2.2; $\Delta T$,
  the drift of the Earth's rotation, is applied to every ancient timing from
  page 2.1 on, explained in a detour card.)

### Act II: The Sun

The first anomaly and the simplest complete model.

#### 2.1 · The uneven year

- **Question:** why are the seasons not equal?
- **Learn:** mean longitude $\bar\lambda$ and true longitude $\lambda$; the
  eccentric circle; the equation of center $q$, with
  $\lambda = \bar\lambda + q$; fitting the eccentricity $e$ and the apogee
  $\lambda_A$ from two season lengths (Hipparchus' method); $q$ to first order,
  $q \approx -e\sin M$ with $M$ measured from the apogee, so the greatest
  equation of center is about $e$ radians (exactly $\arcsin e$). (Kepler's
  ellipse gives $2e_\text{K}$: the eccentric's offset is twice the ellipse's
  eccentricity, a point picked up again on page 4.2.)
- **Notation:** the center of the eccentric is $C = (h, k)$, so that $x$
  and $y$ stay the axes, and $q$ the equation of center; $h < 0$ today,
  since the apogee is beyond 90°.
- **Model:** $q = -\operatorname{atan2}(e \sin M, 1 + e \cos M)$, derived
  from $\vec{OS} = \vec{OC} + \vec{CS}$; the seasons are the arcs of the
  eccentric between the lines from the Earth to the equinoxes and solstices.
- **Figures:** the real Sun's daily motion from the September equinox of
  2025 to that of 2026, with the four seasons and their lengths above it
  (static); the same arrow from the Earth to the Sun with the Earth at
  rest and with the Sun at rest (static); the equation of center, the
  eccentric with M and q beside $q(t)$ over a year (date, and two views:
  the exaggerated $e = 0.2$ and the Sun's $e$), next to the definition of
  q; the four seasons as the arcs between the lines to the equinoxes and
  solstices, at $e = 0.2$ and to scale (static); Hipparchus' construction,
  with the center $C = (h, k)$ drawn six times farther out to show the two
  right triangles of the text (legs $h$ and $k$, angles $\arcsin h$,
  $\arcsin k$) and the arcs $a_1$, $a_2$, and C at its true place
  magnified (spring and summer, with presets including AD 140 for
  Exercise 3). **First appearance of the error curve:** the eccentric
  fitted to 2026, over 1, 100 and 1000 years. The uniform circle is not
  drawn as a ghost: its error is about seventy times larger, so on any
  scale that showed it the eccentric's error would be a flat line; the
  text gives both numbers. A photo: Peurbach's woodcut of the Sun's
  eccentric orbs.
- **Fit:** $e$ and $\lambda_A$ from spring and summer, by Hipparchus'
  construction applied to the reference spring and summer of 2026 ($e =
  0.03347$, $\lambda_A = 103.73^\circ$, the autumn and winter of 2025–26
  within half an hour; one
  hour moved between the seasons shifts the apogee 1.2°); the mean
  longitude at epoch $L_0$ from the timed spring equinox (page 1.3 used
  Meeus' value without deriving it). History block: equinoxes timed with
  bronze rings in the plane of the equator, solstices to a quarter of a
  day (III 1); Hipparchus' seasons give the apogee within half a degree
  and $e$ a fifth too large; Ptolemy repeats the computation (III 4) and
  takes his epoch back to Nabonassar (III 7).
- **Test:** the eccentric against the reference Sun (within 1.7′ in 2026,
  against 115′ for the uniform circle; about 3′ within fifty years, almost
  20′ five centuries away); page 1.3's day now within half a minute.
  History block, in words: Ptolemy finds Hipparchus' seasons again and
  takes the apogee as fixed (III 4); his equinoxes a day late (the
  "faked observations" dispute); his Sun about a degree behind in his
  time, falling further behind every century.
- **Exercises:** "Hipparchus' Sun from two numbers" (fit $e \approx 0.041$,
  $\lambda_A \approx 65.4^\circ$ from $94\tfrac12$ and $92\tfrac12$ days;
  predict autumn and winter); derive $q$ to second order and its greatest
  value $\arcsin e$ (Ptolemy's $2^\circ 23'$ at $92^\circ 23'$); Ptolemy's fixed apogee
  against the real seasons of AD 140 (break the model).
- **Code:** `models/solar-eccentric.js` (`SolarEccentric.make()`, the
  parameter sets `PTOLEMY` and `FIT_2026`, `fitSeasons`); `MeanSun.PTOLEMY`,
  whose days are days of UT.
- **Today note** (§7.5), beside the residual: Kepler's ellipse, the first
  approximation used today for the Sun's path relative to the Earth; to
  second order, with $M$ from the apogee, $q \approx -2e_\text{K}\sin M +
  \tfrac54 e_\text{K}^2\sin 2M$, against the eccentric's
  $-e\sin M + \tfrac12 e^2\sin 2M$ with $e = 2e_\text{K}$; page 4.5
  applies it to the Sun.
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
  equation of center, with $e_\varepsilon = \tan^2(\varepsilon/2)$ for $e$
  and $2\lambda$ for $M$, so page 2.1's results apply (first order
  $e_\varepsilon \sin 2\lambda$, greatest value $\arcsin e_\varepsilon$);
  $d\alpha/d\lambda = \cos\varepsilon / \cos^2\delta$, derived from
  $\cos\delta\cos\alpha = \cos\lambda$ (page 1.2), and the lag greatest where
  it equals 1; the mean Sun as a reference point moving along the equator;
  their
  sum to first order, $E \approx e\sin M + e_\varepsilon \sin 2\bar\lambda$
  (radians); the analemma.
- **Figures:** the true solar day and its running sum, $E$, through 2025
  (static); a photo of an analemma in the sky (Donatiello, CC0); the
  reduction to the equator (3D: the uniform Sun on the ecliptic, its hour
  circle, the mean Sun on the equator; with $\lambda - \alpha$ against
  $\lambda$; longitude and obliquity, starting at an exaggerated 45°, with
  a preset for today's); the two components and their sum over 2025; the analemma drawn as the Sun's
  position at mean noon (date; both causes, eccentricity only, obliquity
  only); the model against the real $E$ in 2025; the real $E$ against the
  Sun's longitude in a chosen year, 1000 BC to AD 3000.
- **When building:** the obliquity part is the reduction to the equator,
  $\alpha - \lambda$, computed by `Frames.reduction` in
  `shared/models/frames.js` (page 1.2 notes the lag in its table of Ptolemy's
  values).
- **Fit:** no new parameter. The equation of time alone gives back those of
  pages 1.2 and 2.1: its yearly and half-yearly terms (averages over a year)
  give $e$, $\lambda_A$ and $\varepsilon$ to first order (biased by the cross
  term $e\,e_\varepsilon$); the exact model fitted by least squares gives
  $e = 0.0334$ and $\lambda_A = 103.4^\circ$ from the real $E$ of 2025.
- **Test:** in time, not with the $\Delta\lambda$ widget (the longitude model
  is page 2.1's): within 6.4 s of the real $E$ in 2025, against page 1.3's
  ±16 min. History block, in words: Ptolemy's equation of time in
  time-degrees (*Almagest* III 9), about half an hour at most, a little
  more than the real value of his time, and why he needed it (the Moon).
  No history block in the Fit: Ptolemy did not fit the equation of time.
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
  pole's circle of 25·770 years (Thuban, Polaris, Vega); tropical versus
  sidereal year, $Y_\text{s} = Y \cdot 360^\circ/(360^\circ - pY)$; the
  slow motion of the solar apogee; why the model of 2.1 drifts over
  centuries.
- **Figures:** six stars of the reference sky over 6000 years ((a) the
  change of λ and β, one line each; (b) δ, a curve per star; static); the
  equator turning over the fixed ecliptic (3D in the ecliptic frame, year
  slider and play, presets 2831 BC, 128 BC, 2026, AD 13·790); a blue plate
  of the path of the pole among the northern stars (on trial: Marco decides
  whether to keep it); Spica's six records with the line fitted to them and
  Ptolemy's rule (static); the error curves of uniform precession for Spica
  and of the eccentric with and without a moving apogee over 2000 years;
  the thirteen records of Spica, Regulus and β Scorpii minus the real sky,
  with the error of Ptolemy's Sun (static).
- **Fit:** a long baseline fixes the rate (an error of 1° is 14″ a year
  over 265 years, 2″ over 18 centuries); the rate from Spica's records
  (50.6″ a year, Figure 4); $p = 50.28''$ a year from the reference sky
  of 1926.0–2026.0; the apogee's rate, 1.751° a century, from the seasons
  of every year from 1826 to 2025 by Hipparchus' method, of which 1.397°
  is precession.
  History block: Ptolemy's 1° in 100 years from Regulus (VII 2),
  Hipparchus' lower bound, the III 1 remedy, Copernicus' mean rate (III 6).
- **Test:** uniform precession within 2.4′ of Spica over 2000 years; the
  eccentric with a moving apogee within 6.4′ over 2000 years (38.2′ with
  the apogee fixed), and page 2.2's equation of time within 12 s over 1000
  years. History block, with Figure 6 (kept for Exercises 1 and 3):
  Ptolemy's slow rate comes mostly from his Sun, the records he reduced
  err as his Sun does (the full cause is debated).
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
  equation of center of page 2.1; the speed, $n + n_M\,dq/dM$; **the
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
  of our epicycle (uniform Moon as ghost, dots at new and full Moon). A
  photo: the eclipse of 7 September 2025 (Donatiello, CC0).
- **Fit:** the mean motions, $n = n_\odot + 360^\circ/P_s$ and $n_M = 269
  \times 360^\circ / (251\,P_s)$, best fixed by observations far apart,
  so ours from the 1237 new Moons of 1926–2025 (the five months of
  section 1 measured the same way); why eclipses (the Moon opposite the Sun, parallax
  does not move the moment, the second anomaly vanishes); the data of a
  triple, $a = n_M\,\Delta t$ and $d$ = the Sun's true motion minus $n\,\Delta
  t$, worked through for the eclipses of 7 Sep 2025, 3 Mar 2026 and 28 Aug
  2026 (a table), which give $e = 0.0844$; consecutive triples of 2014 to
  2026 range from 0.075 to 0.093. History block: eclipses "the only
  observations" (IV 1); Hipparchus' month from Chaldaean and later
  eclipses (IV 2); Ptolemy's two exact solutions, "very nearly the same",
  5.25 (IV 6); Copernicus' almost the same (*De Rev.* IV 5).
- **Test:** in 2026 within 40′ at the 25 new and full Moons, up to 2.9°
  at the quarters and 3.2° overall (the uniform Moon 7.9°). History block,
  in words: his check was the agreement of two epicycles from eclipses
  nine centuries apart; his Moon about a degree behind at his own
  eclipses, as his Sun is; drifting with his Sun, a little faster, by
  Hipparchus' month.
- **Exercises:** prove the equivalence in Ptolemy's general form, and
  judge Hipparchus' two ratios (IV 11); the anomalistic month from the
  beat of the fastest full Moons, 2001 to 2039; Ptolemy's Babylonian
  triple, to first order and exactly (his values given in the statement).
- **Code:** `models/lunar-epicycle.js` (`LunarEpicycle`: `make()`,
  `makeUniform()`, `construction` for the equivalence, `threeEclipses`,
  `fitEclipses`, `TRIPLES`, `PTOLEMY`, `MEEUS`, `FIT_2026`);
  `ErrorCurve.addMarks` (dots at chosen dates).
- **Today note** (§7.5): the Moon's longitude is computed today from a
  series of terms derived from Newton's gravitation (Meeus 47); the first
  is the ellipse's, the others come from the Sun's pull, which also turns
  the perigee round in 8.85 years, like the apogee of the eccentric of
  section 2 (Fitzpatrick § 6.1).
- **Residual:** at the quarters, Hipparchus' sighting of 128 BC (V 3);
  the evection, which takes 1.27° from the ellipse's 6.29° at new and full
  Moon and adds it at the quarters; the remaining 40′ at new and full Moon
  is half the three-eclipse fit (a least-squares epicycle, $e = 0.0864$,
  stays within 22′) and mostly the annual equation (11′).
- **Hands over:** the model is good at new and full Moon and bad in between.

#### 3.2 · Evection and the distance problem

- **Question:** what goes wrong at the quarters?
- **Learn:** the second anomaly, largest at the quarters: the real Moon's
  whole equation reaches 4.96° at new and full Moon and 7.68° at the
  quarters (2016–2025); Ptolemy's description (*Almagest* V 2), his and
  Hipparchus' sightings of 7⅔° (V 3); Ptolemy's crank mechanism (V 2): K
  seen from the Earth at the mean longitude, carried on an eccentric whose
  center C turns westward, its apogee A at $\bar\lambda - 2D$, so that
  $\rho = \text{OK} = c\cos 2D + \sqrt{(1-c)^2 - c^2\sin^2 2D}$, 1 at mean
  syzygy and $1 - 2c$ at the mean quarters, and $q = -\operatorname{atan2}(e
  \sin M, \rho + e\cos M)$; the direction of the epicycle (V 5), its mean
  apogee on the line from N, opposite C, shifted by $\sigma =
  -\operatorname{atan2}(c\sin 2D, \rho + c\cos 2D)$, up to 13°; to first
  order $q \approx -e_0\sin M + e_0 \kappa\sin(M - 2D)$, the ellipse's term and
  the evection of Meeus' series ($e_0 = 6.05°$, $e_0\kappa = 1.26°$ against
  6.29° and 1.27°; $\sigma$ and $\kappa$, since $\delta$ is the declination
  and $k$ page 2.1's coordinate), the crank alone adding a spurious term in $M + 2D$ that
  the direction cancels (a table of the exact coefficients). The model
  predicts directions within a degree and distances that vary by a factor
  of 1.91, while the Moon's apparent size does not (Copernicus, IV 2).
- **Notation:** $D = \bar\lambda - \bar\lambda_\odot$, the mean
  elongation; lengths in units of OA (Ptolemy's 60); $c = \text{OC}$; the
  points O, C, A, K, N, L.
- **Figures:** the real Moon's equation against $M$ at the new and full
  Moons and at the quarters of 2016–2025 (static); the crank fitted to
  2026, without the direction, with $q$ over two months against page 3.1's
  epicycle (date); the direction of the epicycle in Ptolemy's example of
  V 6 (static, the epicycle enlarged); the error curve of the crank with
  the epicycle and the crank without the direction as ghosts, dots at the
  quarters; the apparent diameter through 2026, the real Moon against the two models
  (static). No photo: no public-domain or CC0 photograph of the Moon at
  perigee and apogee side by side was found (2026-10-28).
- **Fit:** the quarters fix $c$ ($\sin q_\text{max} = r/\text{OG}$ with
  the epicycle at the eccentric's perigee); the direction of the epicycle
  shows near the octants and is kept as Ptolemy found it, so the octants
  test the model; ours keeps page 3.1's fit and fits $c = 0.1769$ to the
  25 quarters of 2025 (0.6% more for 2016–2025); the Test runs over 2026. History block:
  Ptolemy's $c = 0.1719$ from 7⅔° at the quarters (V 4); ON = OC from two
  of Hipparchus' sightings near the octants (V 5).
- **Test:** over 2026 the largest error falls from 3.2° (epicycle) to 2.7°
  (crank alone) and 1.8° (with the direction); 2.0° over 1976–2076.
  Distances: 1.91 in the model, 1.14 in the real Moon; the apparent
  diameter of the crank nearly doubles at the quarters. History block, in
  words: Ptolemy's complete Moon around AD 139 a third as wide as his
  simple one, both a degree behind (his Sun); his diameter measured only
  at greatest distance (V 14); Copernicus' objection (IV 2); the Sun's
  eccentric errs the same way.
- **Exercises:** Ptolemy's eccentric and the ratio of greatest to least
  distance (1.913; 64.16 and 33.55 Earth radii; 59.9′); derive that the
  direction cancels the term in $M + 2D$; Ptolemy's parallax of 135 (V 13),
  67′ measured, 44′ for the real distance (break the model).
- **Code:** `models/lunar-crank.js` (`LunarCrank`: `make()`,
  `makeDistance()`, `state`, `geometry`, `construction`, `PTOLEMY`,
  `FIT_2026`).
- **Today note** (§7.5), beside the distances: the evection as an effect
  of the Sun's pull, which through each month makes the Moon's ellipse
  more and less eccentric and swings its axis; with the Earth at the
  focus, the 1.27° in longitude costs little distance, where the crank
  brings the whole epicycle nearer.
- **Residual:** the variation, $0.66°\sin 2D$ (detour: Tycho), 44% of the
  error's mean square in 2026, then the first anomaly left by page 3.1's
  three-eclipse fit (its anomaly at the epoch 5° off), then the annual
  equation; at the syzygies
  the crank changes nothing (V 10). The distance: Copernicus' second
  epicycle (IV 3), a ratio of 1.31 at the quarters (IV 17) against the
  real 1.14; detour: Ibn al-Shatir.
- **Hands over:** at new and full Moon the crank changes nothing, so
  eclipses keep page 3.1's longitude; they still need latitude.

#### 3.3 · Eclipses

- **Question:** when does a new Moon become a solar eclipse?
- **Learn:** the eclipses of 2016–2025 from the reference sky, which match
  NASA's list (22 solar, 13 umbral lunar; penumbral eclipses not counted),
  in 21 seasons 173.8 days apart on average, each about 18 days earlier in
  the year; the Moon's greatest latitude, 4.98° to 5.30°; the nodes
  moving westward 19.34° a year (18.61 years); Ptolemy's "Periodic" of
  223 months (IV 2, Babylonian; "wrongly" called the saros, Toomer). The
  inclined circle (V 12): from $R_z(\Omega)R_x(i)$, $\sin\beta = \sin
  i\sin F$ and $\tan(\lambda - \Omega) = \cos i\tan F$, page 2.2's
  reduction with $i$ for $\varepsilon$ (at most 6.55′, under 4′ within the
  eclipse limits; left out by Ptolemy, IV 6, and by the model);
  $F = \bar F + q$ (IV 9); at a syzygy $F$ is the Sun's distance from the
  node; the eclipse year, $1/Y_\text{e} = 1/P_d - 1/P_s$ (346.620 days).
  The shadow: $u = 1.01\,\pi + \pi_\odot - s_\odot$ (Danjon's rule, as
  NASA); lunar eclipse $|\beta| < u + s$, total $< u - s$; solar eclipse
  seen somewhere $|\beta| < \pi - \pi_\odot + s + s_\odot$, central $<
  \pi - \pi_\odot$, total or annular by the Moon's radius from the
  point where the shadow's axis meets the Earth (non-central total and
  annular eclipses included); the least distance taken as $|\beta|$ at the
  syzygy (0.9956 of it). The limits from the node (lunar 10.3° to
  12.2°, solar 16.4° to 18.3°, with the Moon's distance); Ptolemy's
  (VI 5). The eclipse seasons: the solar limits take 31.5 to 35.3 days to
  cross, more than a month, so at least two solar eclipses a year; the
  lunar 19.7 to 23.4 days (VI 6). Capstone of Acts II and III.
- **Notation:** $i$, $F$ and $\bar F$, $\Omega$ (☊ ☋ in figures),
  $n_F$, $P_s$, $P_d$, $P_a$, $Y_\text{e}$; $s$, $s_\odot$, $\pi$,
  $\pi_\odot$, $u$ (§6).
- **Figures:** a calendar of the new and full Moons of 2016–2025 with the
  eclipses (static); a photo of the total eclipse of 21 August 2017
  (NASA, public domain); a blue plate of the Moon's path near Regulus,
  11–15 August 2026, crossing the ecliptic at the node 16 hours after the
  total eclipse of 12 August; the Moon's inclined circle (3D, ecliptic
  frame, inclination drawn three times larger; date; three views: a
  month, with the triangle of $F$, $\lambda - \Omega$, $\beta$ and $i$,
  a year, with the Sun, the Earth's shadow and the nodes, and the nodes'
  turn over 19 years); the two shadows (static, not to scale: the
  Earth's shadow at the Moon's distance, with $\pi$ divided into $u$ and
  $s_\odot - \pi_\odot$, and the Moon's shadow on the Earth from the
  side, with $\beta$ and $\gamma$); the Sun, the Moon and the shadow
  near a node, with the Moon's path and a box for each limit (the Sun's
  distance from the node and the Moon's distance); the eclipse seasons of
  2026–2027 (static); the error curve of the latitude (dots at new and
  full Moon, and those of the mean inclination); Ptolemy's latitude
  around AD 134 and over 2000 years. Tables: the eclipses of 2026, model
  against real; Ptolemy's three eclipses at Alexandria (IV 6).
- **Fit:** Ptolemy's 5° (V 12, 4.99° from his figures); Hipparchus' 5458
  months = 5923 returns in latitude (IV 2, Babylonian), 0.1 s from the
  reference; Ptolemy's correction and epoch (IV 9); his diameter and
  shadow from two eclipses (VI 5); Copernicus' motion in latitude from
  eclipses at opposite nodes (IV 13). Ours: $n_F$ from the latitudes at
  the 2473 new and full Moons of 1926–2025 (±0.02° a century), and $i$
  and $F_0$ fitted to the latitudes at the last 25 documented ones, 5
  November 2025 to 26 October 2026: $i = 5.00^\circ$ (the mean
  inclination 5.145° would be up to 10′ off there), the node at J2000
  125.05° (Meeus 125.04°); the sizes from the model's distances, the mean
  distance the reference Moon's average over 1926–2025.
- **Test:** the latitude within 1.7′ at the fitted new and full Moons,
  2.6′ at the others of 2021–2030, 26′ over 2026, 29′ over a century; the
  eclipses: all 38 of 2021–2030 and no other, one of another kind (the
  deep partial solar eclipse of 29 March 2025 comes out total), times rms
  43 min, worst 95 min (page 3.1's 40′). Ptolemy: his
  latitudes within 2.3′ and his times within half an hour at his three
  eclipses; his lunar limit holds all 157 lunar eclipses of AD 100–200;
  in 2021–2030 still 37 of 38 eclipses, times wrong by up to 4.3 h.
- **Exercises:** decide whether the new Moon of 12 August 2026 is an
  eclipse, central, total or annular (and 11 September); derive the saros
  from the three months by continued fractions, the exeligmos, the length
  of a series, Hipparchus' 5458 months; Ptolemy's eclipse of 20 October
  134 with a uniformly turning Earth, and $\Delta T$ from his time (break
  the model: 2.50 h against the reference's 2.57 h).
- **Code:** `models/lunar-latitude.js` (`LunarLatitude`: `state`, `make`,
  `latitude`, `MEEUS`, `PTOLEMY`, `FIT_2026`) and `models/eclipses.js`
  (`Eclipses`: sizes, limits, syzygies, `predict`, `reference`, Ptolemy's
  limits, convergents; `FIT_2026`, `PTOLEMY`); `ErrorCurve`'s `quantity`
  option (Δβ); `Plate.line` and day ticks on `Plate.highlightCurve`; the
  figure of Leo.
- **Residual:** the times (the epicycle's anomaly, page 3.2); the latitude
  between the new and full Moons (the epicycle's error in $F$, and the
  inclination, 5.3° at the quarters against 5.0° at new and full Moon, the
  reference Moon's $0.17^\circ\sin(2D - F)$; detour: Tycho); a solar
  eclipse for one observer (VI 10, *De Revolutionibus* IV 30).
- **Hands over:** the Sun and the Moon each have their own laws. The planets
  are tied to the Sun.

### Act IV: The planets

#### 4.1 · Going backwards

- **Question:** why do planets loop, and why always at opposition?
- **Learn:** retrograde motion and the stations (Mars' loop of 2024–2025,
  19.2° in 79 days); the loops of the five planets in 1986–2025 (a table),
  centered on opposition for Mars, Jupiter and Saturn and on inferior
  conjunction for Venus and Mercury, which never pass 47° and 28° from the
  Sun (XII 1); the two anomalies, related to the Sun and to the place in
  the ecliptic, the zodiacal anomaly (IX 2); Ptolemy's asymmetry, longer from greatest speed to
  mean than from mean to least (IX 5). The epicycle (Apollonius, XII 1),
  its radius KP parallel to the line to the mean Sun (X 6):
  $\vec{OP} = \hat u(\bar\lambda) + r\,\hat u(\bar\lambda + \mu)$ with
  $\mu = \bar\lambda_\odot - \bar\lambda$, $n + n_\mu = n_\odot$; the
  equation of the epicycle $\eta = \operatorname{atan2}(r\sin\mu, 1 +
  r\cos\mu)$, page 2.1's function with the sign reversed; the speed, and
  why the planet moves eastward at the epicycle's apogee (IX 5, the
  opposite of the Moon); retrogradation iff $r > n/(n + n_\mu)$ (XII 1),
  centered on the opposition to the mean Sun; the stations, $\cos\mu_s =
  -(1 + r^2(1 + k))/(r(2 + k))$, $k = n_\mu/n$, and the arc; inner planets
  (K on the mean Sun, greatest elongation $\arcsin r$); the synodic
  period, $1/P_\lambda + 1/S = 1/Y$.
- **Notation:** $\mu$, $\eta$, $n_\mu$, $S$, $P_\lambda$ (§6); $n$ is
  the planet's mean motion and $n_\odot$ the mean Sun's; lengths in units of
  the deferent's radius (Ptolemy's 60); $e$ is left free for page 4.2.
- **Figures:** a blue plate of Mars' path among the stars of Gemini and
  Cancer (the whole of both figures), 15 October 2024 to 15 April 2025,
  with the stations dated outside the ends of the loop; the daily motion
  against the days from opposition (from inferior conjunction for Venus
  and Mercury), one curve per loop of 2006–2025, from conjunction to
  conjunction (a view per planet; a stepper draws one loop in full and
  the others faint, with its arc, its duration and the ecliptic longitude
  of its middle); the epicycle of Mars and the daily motion against
  $\mu$, the arc between the stations shaded in both (date and $r$,
  presets Ptolemy's, no loop, no epicycle); in the Fit, the arc and the
  anomaly of the first station against $r$, with the eight loops of
  2010–2025 and the band of a station timed five days off (static); the
  error curve of Mars in degrees (the uniform planet as ghost, dots at the
  oppositions; 2016–2019, the 16 years of the fit, 200 years); in the
  Test, K moved back 12° at the perigee, the planet's direction turned by
  33° (static); the arcs and the intervals of the loops of 1986–2025
  against the ecliptic longitude of opposition
  (static).
- **Fit:** documented oppositions only (§5). $n$ from the eight
  oppositions to the mean Sun of 2010–2025 and those 79 years earlier
  (1931–1946: 37 synodic periods, 42 turns and 2.8° to 4.6° more, so
  both anomalies cancel), 0.524070° a day; $L_0$ from the eight of
  2010–2025, where the planet is seen through K (X 6), 355.83°, each
  opposition 11° to 12° off; $r$ from the mean arc of retrogradation of
  their loops, 16.7°, so 0.660 (39.6 in 60; Ptolemy 39.5), each loop
  alone 0.63 to 0.67. The arc is measured, not $\mu_s$: a station's
  place is easy to measure and its moment is not, and for a trial $r$
  the station condition gives $\mu_s$ and the arc. History block: the period relations "computed by
  Hipparchus", Babylonian (IX 3, Toomer), and Ptolemy's corrections;
  stations hard to time (IX 2); Ptolemy's oppositions, where the ecliptic
  anomaly is isolated (X 6), and his epicycle of Mars (X 7–8).
- **Test:** within 34° over 2010–2025 (the uniform planet 54°), rms a
  third of the uniform planet's; the same over 1926–2126; largest near
  the oppositions (33° at that of May 2016), an
  error in K multiplied by $1/(1 - r)$ there. History block: Hipparchus'
  verdict on the models of a "single unvarying anomaly and retrograde arc"
  (IX 2).
- **Residual:** the arcs follow the zodiac, 10.0° to 19.5° against the
  model's 16.7°, and the intervals 764 to 811 days against 779.9;
  Neugebauer's remark on constant arcs (HAMA p. 191). Detour: planetary
  latitudes (the shape of the loop).
- **Exercises:** Apollonius' form of the station (TP/OP = $n/n_\mu$) and
  Ptolemy's Mars at mean distance, 16°18′44″ in about 73 days (XII 4),
  with Jupiter and Saturn; the synodic periods from the periods of return
  to the same star, and Ptolemy's 79-year relation for Mars (IX 3);
  the oppositions of 1999 and 2003 in the model, outside the fit (break
  the model).
- **Code:** `models/planet-epicycle.js` (`PlanetEpicycle`: `make`,
  `makeUniform`, `state`, `dailyMotion`, `loopThreshold`,
  `stationAnomaly`, `loop`, `ratioForArc`, `construction`,
  `referenceEvents` (the reference sky's stations and loops); `PTOLEMY`
  (the mean motions of IX 3 and the epicycles, five planets),
  `MARS_FIT`, `VENUS_MEAN`); the figures GEMINI and CANCER in `plate.js`.
- **No Today note:** its modern counterpart (two orbits about the Sun)
  would answer page 4.2's closing question before page 4.3 asks it.
- **Hands over:** the loops come out the wrong size in different parts of
  the zodiac.

#### 4.2 · The equant

- **Question:** what does the simple model miss?
- **Learn:** the oppositions to the mean Sun of 1986–2025 show the
  zodiacal anomaly alone (the planet seen along OK, X 6), −12.0° to
  +11.0° about page 4.1's $\bar\lambda$; the loops (10.0° to 19.5°) are
  longest and shortest near where it crosses zero; Ptolemy's two remarks,
  the zodiacal anomaly suits an eccentric (IX 5) and its eccentricity is
  "about twice" the loops' (X 6). The eccentric deferent (page 2.1's $q$
  for K); fitted to the oppositions of 2010–2025 it needs $e$ = 0.200 and
  gets the loops the wrong way round (8.2° to 21.7°, longest where the
  real ones are shortest). To first order, with K turning uniformly about
  a point Q: K's speed seen from O is $n(1 - \text{OQ}\cos M)$ and its
  distance $1 + \text{OC}\cos M$, so the oppositions fix OQ and the
  loops OC. The equant (IX 5): OC = $e$, OQ = $2e$; QK from the law of
  cosines (page 3.2's quadratic), $q = -\operatorname{atan2}(2e\sin M,
  \text{QK} + 2e\cos M)$; the planet $\lambda = \bar\lambda + q + \eta$,
  $\mu$ counted from the mean apogee on QK (IX 6, XI 9); the apogee fixed
  among the stars (IX 5). The equant against Kepler's ellipse with the
  same $e$ (center C, foci O and Q), as geometry: to second order $q$ =
  $-2e\sin M + e^2\sin 2M$ against $-2e\sin M + \tfrac54 e^2\sin 2M$, the
  distances $1 + e\cos M + \tfrac32 e^2\sin^2 M$ against $1 + e\cos M +
  e^2\sin^2 M$, page 2.1's eccentric beside them; checked numerically
  (the coefficients at $e$ = 0.001; 10.5′ exact against 8.7′ for Mars).
- **Notation:** OC = $e$ and OQ = $2e$ (so $e$ compares directly with
  Kepler's); Q the equant, C the center of the deferent, A its apogee;
  $q$ the zodiacal equation (K seen from O less $\bar\lambda$), $\rho$ =
  OK; K′ the point of the ellipse.
- **Figures:** the oppositions and the loops of 1986–2025 against the
  ecliptic longitude, one above the other, with dotted lines where the
  oppositions cross the mean place (static); the equant's two jobs, the
  deferent alone with K's places at equal steps of $M$, the speed of K
  seen from O with its first order, and the distance OK, against $M$ (OC
  from O to Q, OQ = 0.2; presets C at O, Ptolemy, C at Q); the
  perpendiculars from C and O onto QK, the right triangles CHK and OGK of
  the first-order derivation (static, offsets three times Mars'); the
  whole model, deferent, equant and epicycle, with the line OK (date,
  2010–2025, an opposition preset; views $e$ = 0.2 and Mars); the equant
  and Kepler's ellipse, the drawing at $e$ = 0.3 and the differences in
  direction divided by $e^2$, exact for Mars and to second order
  (static); the fit of the center,
  the oppositions and the loops of 2010–2025 with OC from O to Q (presets
  C at O, fitted, C at Q); the error curve with page 4.1's epicycle as
  ghost (4, 16 and 200 years); page 4.1's Figure 7 again with the
  equant's curves (static).
- **Fit:** $n$ kept from page 4.1; OC and OQ fitted apart, alternately:
  OQ, $\lambda_A$ and $L_0$ from the eight oppositions to the mean Sun of
  2010–2025, $r$ and OC from their eight loops; OQ = 0.2007, OC = 0.0983,
  OC/OQ = 0.49, so the bisection is adopted and the fit repeated: $e$ =
  0.1005, $\lambda_A$ = 151.08°, $L_0$ = 355.38°, $r$ = 0.658 (6.03, 12.06
  and 39.48 where the deferent is 60). History block: the three
  oppositions and the iteration (X 7), the bisection taken for granted
  (*HAMA* pp. 172–173, Debated), the epicycle from one sighting (X 8).
- **Test:** within 0.9° over 2010–2025 (page 4.1's epicycle 34°), about
  1° over 1926–2126; the 11 loops of 1986–2009 within 1.2°, the intervals
  between oppositions to the mean Sun within a day. History block: his check of the intervals (X 7); his
  Mars of AD 130–139 within about 2°, a degree behind, as his mean
  ecliptic longitude of Mars is (and his mean Sun).
- **Residual:** the epicycle follows the mean Sun; turned by the real
  Sun (direction and distance) and refitted, within 32′, with $e$ =
  0.0935 (the reference's ellipse 0.0934); the rest mostly the
  difference from the ellipse, about 9′ ($e^2/4$ = 7.5′), tripled near
  opposition.
- **Exercises:** expand the equant and the ellipse to second order
  (derive); Ptolemy's three oppositions of Mars, first order and exactly
  (12;00, Cancer 25;30); the loops at the apsides with C at O and at Q,
  against XII 4 (predict, then play).
- **Code:** `models/planet-equant.js` (`PlanetEquant`: `make`, `state`,
  `construction`, `zodiacal`, `loopAt`, `oppositionInterval`, `kepler`,
  `threeOppositions`, `PTOLEMY_OPPOSITIONS`, `PTOLEMY`, `MARS_FIT`,
  `MARS_SEPARATE`); `quarterTicks` and `nameAbove` moved to `plot2d.js`.
- **No Today note:** as on page 4.1; the comparison with the ellipse is
  geometry, without the two orbits about the Sun.
- **Hands over:** the model works, but every planet's epicycle turns in
  step with the Sun. Why?

#### 4.3 · Same geometry, new center

- **Question:** what changes when the Sun is fixed?
- **Learn:** the Sun enters every planet's motion: the elongations of the
  five planets in 2022–2025, each loop at opposition or inferior
  conjunction; the synodic periods (115.88 to 779.93 days, 1926–2025); in
  Ptolemy's models every outer planet's epicycle radius stays parallel to
  the line from the Earth to the mean Sun (*Almagest* X 6), and the
  centers of the epicycles of Venus and Mercury follow the mean Sun (from
  the equant, not the Earth); five free ratios, and no order without a
  parallax (IX 1). The exchange of the two vectors, $\vec{\text{OP}} =
  \vec{\text{OK}} + \vec{\text{KP}} = \vec{\text{O}\odot} +
  \vec{\odot\text{P}}$ (page 3.1's equivalence): the epicycle of an
  outer planet, the deferent of an inner one (in page 4.1's simple model,
  which the page uses for Venus and Mercury), becomes the Earth's circle;
  one scale for all five ($|\text{O}\odot| = 1$) turns the ratios into
  distances, $a = 1/r$ (outer), $a = r$ (inner), in au; Copernicus fixed
  the Sun (*De Revolutionibus* I 10), which turns no direction (the frame
  is page 4.4's question). The periods about the Sun, $1/P = 1/Y \mp
  1/S$, and Ptolemy's period relations as sums (IX 3, V 1: Venus 8 + 5 =
  13); the order by distance and by period (I 10); greatest elongation
  $\sin\varepsilon_\text{max} = a$; loops from the Earth's motion (V 3)
  and their sizes (I 10). Copernicus without the equant: the eccentric
  with an epicyclet, $\tfrac32 e$ and $\tfrac12 e$ (V 4; Debated: al-Tusi
  and Ibn ash-Shatir, *HAMA* p. 11), the equant's
  directions to second order, distances off by $e^2$ against
  $\tfrac12 e^2$ (Fitzpatrick § 1.3, § 4.4–4.5), page 4.2's Mars a little
  worse (largest error 0.88° to 0.91°); Kepler brought the equant's point
  back as the empty focus (*HAMA* p. 155, page 4.5).
- **Notation:** $a$, a planet's distance from ☉ in units of the Earth's
  (au); ☉ the point of the mean Sun at distance 1 (S is the synodic
  period); $P$ the period about the Sun (§6).
- **Figures:** the elongations of the five planets, 2022–2025, thick where
  they go back (static); one planet in Ptolemy's description (O fixed,
  the parallelogram O K P ☉) beside Copernicus' (☉ fixed), each circle in
  its colour of (a) (date, play; views Mars, page 4.2's equant, and
  Venus); Ptolemy's five models with deferents of one size, and the same
  numbers on one scale, out to Saturn and out to Mars (static); a photo:
  Copernicus' manuscript, f. 9v (Jagiellonian Library, public domain);
  the error curve of Mars with Copernicus' epicyclet in place of the
  equant, page 4.2's equant as ghost (4 and 16 years), in the Model;
  the two right triangles of the fit, Venus at greatest elongation and
  Saturn at quadrature, with the quadrature a day early (static); Mars' distance from the Earth, 2010–2025, the
  equant on Copernicus' scale and without the equant, and the difference
  (static).
- **Point to make:** the predicted directions do not change. What changed
  is that the system now has a scale and an order, and the distances
  are a new prediction. They come from the arrangement: fixing the Sun
  changes no prediction (WRITING.md §9).
- **Fit:** the synodic periods from lines through the oppositions and
  inferior conjunctions of 1926–2025, the periods about the Sun with the
  sidereal year; the distances of Venus and Mercury from their greatest
  elongations of 1986–2025, of Jupiter and Saturn from the mean arcs of
  their loops of 1986–2025 (page 4.1's method), Mars from page 4.2's
  equant (1.520 au). Not quadratures: a day's error moves Saturn's
  distance by 16%. History block: Copernicus' periods in sidereal years
  (V 1), his triangles from one sighting (V 9, V 14, V 19), Venus (V 21),
  Mercury (V 27); his distances are Ptolemy's ratios inverted (V 19;
  *HAMA* p. 147).
- **Test:** the directions identical to page 4.2's ($6 \times 10^{-12}$°),
  so their error curve is page 4.2's Figure 7, not repeated;
  Mars' distance from the Earth within 0.020 au (1.6%) over 2010–2025,
  0.022 au over 1926–2125; the five distances within
  0.3% of the reference, Mercury 1.9% short (its elongated path: at a
  greatest elongation the radius is not perpendicular to the line of
  sight); the periods within 0.1%; the distances follow the real
  oppositions because the deferent is eccentric (a concentric one gives
  0.52 au at every opposition).
  History block: Copernicus' check of Jupiter's motion (V 12); Tycho on
  his distances (Voelkel ch. 2).
- **Residual:** one Earth for every planet, uniform about ☉, so the
  Earth's unevenness (page 2.1) is missing from the three outer planets
  alike;
  Ptolemy's eccentricities are vector sums of the Earth's and the
  planet's (*HAMA* p. 147); page 4.2's residual (the epicycle turned by
  the real Sun) gives the Earth's circle the real Sun's unevenness; Kepler and the
  Sun's actual position (Voelkel ch. 3). Detour: Tycho.
- **Today note** (§7.5), beside the distances: the modern first
  approximation keeps this arrangement, every planet and the Earth on a
  Kepler ellipse about the Sun (Standish's elements, the reference sky).
- **Exercises:** the radius of Venus' orbit from its greatest elongations
  of 2025, and Copernicus' V 21 (compute, then check); Copernicus'
  eccentric with an epicyclet against the equant, with his Mars of V 19
  and its second order (derive); Mercury's greatest elongations, 17.835°
  to 27.789°, against one circle, and why their mean falls short (break
  the model).
- **Code:** `models/planet-arrangement.js` (`PlanetArrangement`: `FIT`,
  `PTOLEMY`, `COPERNICUS`, `VENUS_FIT`, `periodAboutSun`,
  `synodicPeriod`, `greatestElongation`, `quadratureAngle`, `moment`
  (one moment in both descriptions), `make`, `makeDistance`, `epicyclet`,
  `makeEpicyclet`).
- **Hands over:** Tycho kept this arrangement with the Earth fixed. What
  can the observations decide?

#### 4.4 · Phases and parallax

- **Question:** can the observations decide which body is at rest?
- **Learn:**
  - The frame (what is taken as at rest) and the arrangement (how the
    motions are linked; the order and the distances of the planets) are
    separate questions. Directions from the Earth depend only on the
    relative positions of the bodies, so they cannot decide the frame
    (Copernicus I 5; Ptolemy's concession, I 7), while the arrangement
    makes predictions that can be tested.
  - Observation: the phases and sizes of the real Venus over one synodic
    period (superior conjunction of 4 June 2024 to that of 6 January
    2026): full and 9.6″ at superior conjunction, a crescent of 59.5″ at
    inferior conjunction, half lit near the greatest elongations;
    Osiander's objection to the size of Venus' epicycle ("To the
    Reader"); the Platonists' argument that Venus below the Sun would be
    "seen halved or at any rate less than fully round" (*De
    Revolutionibus* I 10); Ptolemy's two orders (IX 1).
  - Tycho's system (1588, Voelkel ch. 1): the
    Sun, the Moon and the planets arranged as in Copernicus, about a
    resting Earth. Copernicus' model moved to the Earth at rest (every
    place less the Earth's) gives the same direction to every planet at
    every moment; for Mars it is page 4.2's model with page 4.3's
    parallelogram drawn as circles. Mars' circle crosses the Sun's. Tycho's
    stars stay on a sphere about the Earth, so the two arrangements differ
    for the stars.
  - The phases: $k = (1 + \cos\chi)/2$; where the center K of Venus'
    epicycle lies on the line to the Sun turns no direction (page 4.3's
    scale) but decides the phases. Below the Sun (O☉ > (1 + r) OK,
    Ptolemy's order, IX 1, and his nested spheres, HAMA I B 5, reported
    in *De Revolutionibus* I 10, with the Sun's mean distance of
    *Almagest* V 15: O☉ = 1.80 OK) Venus is never more than half lit;
    above it (O☉ < (1 − r) OK) never less; around it (O☉ = OK, Copernicus
    and Tycho alike) half lit at greatest elongation. The sizes, $(1 +
    r)/(1 - r)$ = 6.2, are the same in every order: they test $r$, the
    phases the arrangement. Galileo's observation (anagram of 11 December
    1610, solved 1 January 1611; *Il Saggiatore*, 1623).
  - Stellar parallax: Copernicus' stars at rest about ☉ trace each year an
    ellipse of semi-axes $\varpi$ and $\varpi\sin\beta$; Copernicus
    explains its absence by the distance of the stars (*De
    Revolutionibus* I 10); Tycho's stars have none. Aberration (Bradley,
    1729): the same ellipse a quarter year later, 20.5″, following the
    Earth's velocity relative to the stars. Bessel measured the parallax
    of 61 Cygni in 1838 (0.314″, today 0.286″). Parallax and aberration
    decide between Tycho's arrangement and Copernicus'.
  - The physical arguments: Ptolemy's clouds and thrown objects
    (*Almagest* I 7), and his answer to an air that turns with the Earth;
    Copernicus' natural motion and his ship (*De Revolutionibus* I 8);
    Newton's laws of motion (*Principia*, 1687), which hold in inertial
    frames, where the solar system's center of mass, near the Sun, is at
    rest or moves uniformly, and are simplest where it is at rest (Book
    III, Hypothesis 1 and Propositions 11–12, third edition). Physics
    makes the heliostatic description simpler; the geostatic one stays
    correct once the forces of an accelerated, turning frame are added.
    The Earth's daily rotation shows in an experiment on the ground
    (Foucault, 1851); its yearly motion, a free fall, does not show in
    experiments of that kind.
- **Notation:** $k$ the illuminated fraction (Meeus' symbol), $\chi$ the
  phase angle at the planet between the Sun and the Earth ($i$ is the
  Moon's inclination), $\varpi$ the parallax ($p$ is precession); the
  arrangement of Venus as the ratio O☉ : OK, with no new letter (§6).
- **Figures:** the disks of the real Venus at twelve dates of 2024–2026,
  to scale, with their phases (static); Venus, the Earth and Mars in
  Copernicus' system (☉ fixed) and Tycho's (O fixed), with a read-out of
  Mars' ecliptic longitude in both (date 2010–2025, play); the phases of
  Venus in three orders, below, around and above the Sun, the drawing
  from above beside the disk as seen from O (date over a synodic period,
  play, three views); the illuminated fraction against the elongation,
  the three orders against the real Venus (static); a star's parallax
  with the Sun at rest and with the Earth at rest, and the apparent path
  of 61 Cygni in arcseconds (date over 2026, play); the phase of Venus
  in 2026–2033, the arrangement around the Sun against the real Venus,
  Ptolemy's order as ghost, and the difference (static). A photo: the
  phases of Venus in Galileo's *Il Saggiatore*. No error curve: the
  directions are page 4.2's (DECISIONS.md, 2026-11-17).
- **Fit:** the arrangement of Venus from its phase at greatest elongation,
  $k = \tfrac12$ only when O☉ = OK: the 50 greatest elongations of
  1986–2025 (page 4.3's) give O☉ = 0.998 OK, and K at the Sun is
  adopted. The stars: directions to the naked eye only bound their
  distance (no yearly shift over 1′: beyond 6875 au); a measured parallax
  fixes it. History block: Galileo's telescope and his anagram; Bessel's
  heliometer and 61 Cygni.
- **Test:** the directions of Tycho's system are Copernicus' and page
  4.2's ($10^{-13}$°), so their error is page 4.2's Figure 7; the phase
  of Venus within 0.03 over 2026–2033, Ptolemy's order and the order
  above the Sun off by the whole disk; the parallax of 61 Cygni, which
  Tycho's arrangement cannot give. History block: Tycho's argument from
  the missing parallax and the size of the stars (letter to Rothmann,
  1589; Graney), Bradley's aberration (1729), Bessel (1838).
- **Today note** (§7.5), beside Newton: positions are computed today in
  the frame of the solar system's center of mass, its axes fixed by
  distant radio sources, and then referred to the Earth.
- **Residual:** the observations decided the arrangement, not the frame;
  both systems keep page 4.2's error of Mars.
- **Exercises:** derive that Tycho's and Copernicus' systems give the same
  directions, and what Tycho's stars would have to do to show
  Copernicus' parallax; the greatest phase of Venus in Ptolemy's order
  (compute, then check in the figure); the parallax of 61 Cygni from its
  distance, its dates, and why Copernicus could not see it.
- **Rhythm:** observation (Venus), model (frames and arrangements), fit
  (the arrangement of Venus from its phases), test (directions, phases,
  parallax), residual (Mars).
- **Code:** `Ephem.phase` (the illuminated fraction and the apparent
  diameter of the reference planets); `PlanetArrangement.tycho`,
  `venusPhase` and `ORDERS`; 61 Cygni A in `Stars.MORE`, with its
  parallax, and `Stars.parallax`.
- **Sources:** *Almagest* I 7, IX 1; *De Revolutionibus*, "To the
  Reader", I 5, I 8, I 10; HAMA I B 5; Voelkel ch. 1 and 3; outside the
  library: Galileo's letters to Giuliano de' Medici (*Opere* XI) and *Il
  Saggiatore*; Bradley (*Phil. Trans.* 35, 1729); Bessel (*Astronomische
  Nachrichten* 16, 1838); Newton, *Principia* (transl. Motte); Foucault
  (*Comptes rendus* 32, 1851); C. M. Graney on Tycho's star-size
  argument; SIMBAD / Gaia DR3 for 61 Cygni; Meeus ch. 41.
- **Hands over:** circles still leave an error, and Mars shows it most.
  Kepler, who looked in the Sun for the physical cause of the planets'
  motions (*Mysterium Cosmographicum*, 1596; *Astronomia Nova*, 1609),
  removes it.

#### 4.5 · Kepler

- **Question:** what shape removes the last error?
- **Reference (decided 2026-11-18):** the site's Standish planets are
  Kepler ellipses, so a Kepler model fitted to them would match by
  construction. On this page the Sun and Mars come from VSOP87B
  (Bretagnon and Francou, 1988), truncated to 220 terms for the Earth and
  606 for Mars (`shared/vsop87-data.js`, generated by
  `tools/make-vsop87.js` from the IMCCE's files), within 0.61″ of JPL's
  DE441 for Mars seen from the Earth over 1900–2150; `Ephem` takes it with
  `{ theory: 'vsop87' }`. Observations, fits, tests and the ghosts all use
  it. It differs from the earlier pages' reference by up to 7.3′ for Mars
  and 0.69′ for the Sun. Kepler's own parameters (the *Rudolphine Tables*)
  were set aside: the tables are not in the library.
- **Learn:** the area law seen in the Sun (its daily motion varies as the
  square of its apparent diameter, 7.0% against 3.4%, $r^2$ times the
  speed constant within 0.10%, so page 2.1's eccentric needs twice the
  distance's variation); Mars triangulated from pairs of
  sightings one sidereal period apart (103 points of 2010–2025, within
  0.0010 au of the reference), inside the circle through the apsides by up
  to 0.0064 au; the ellipse (foci ☉ and Q, center C, $b = a\sqrt{1 -
  e^2}$, the circle on the long axis squeezed by $b/a$, $a - b \approx
  ae^2/2$); the eccentric anomaly $E$; the area law and Kepler's equation
  $M = E + e\sin E$ (from the aphelion; Fitzpatrick's $M = E - e\sin E$
  from the perihelion), derived from the area of the focal sector;
  fixed-point and Newton iteration; the empty focus as an equant to first
  order (page 4.2's table; *HAMA* p. 172); the third law $P^2 = a^3$,
  checked on page 4.3's five distances (within 0.3%, Mercury 1.9%); Mars
  seen from the Earth as the sum of two ellipses, page 4.2's residual model
  with the equant's circle replaced.
- **The Sun on an ellipse (on trial, 2026-11-02: Marco decides whether to
  keep it now that the page is built):** the Earth's ellipse is part of
  Mars' model, so its fit is in the Fit; Figure 5 (the Sun's error curve)
  and the Sun's distances are the part on trial.
- **Notation:** $a$, $b$ the semi-axes ($a$ keeps page 4.3's meaning, in
  au); $e = \text{C☉}/a$; Q the empty focus; A the aphelion (the apogee
  for the Sun), Π the perihelion; $E$ the eccentric anomaly from the
  aphelion (not page 2.2's $E$); the true anomaly written $M + q$; $r$ =
  ☉P (not the epicycle's radius); $\lambda_\text{h}$ a heliocentric
  ecliptic longitude, $R$ the Earth–Sun distance; P′ the point of the
  circle on the long axis.
- **Figures:** the Sun's daily motion, apparent diameter and its square
  through 2025, in percent of the mean (static); Mars triangulated, (a)
  the points from above with one pair and its lines of sight, (b) the
  distances less the circle through the apsides (static); the ellipse and
  the area law, its circle, ☉, C, Q, P and P′, twelve sectors of equal
  time (days from the aphelion over one period of Mars, play; views $e$ =
  0.6 and Mars); Mars' error curve, the two ellipses with page 4.2's
  equant as ghost, dots at the oppositions (4, 16 and 200 years); the
  Sun's error curve, the ellipse with page 2.1's eccentric (moving
  apogee) as ghost (1, 100 and 1000 years; on trial); every model of the
  Sun (over 2026) and of Mars (over 2010–2025), the largest error on a
  scale of powers of ten (static), in place of "all previous error curves
  overlaid", which span four orders of magnitude. A photo: the
  frontispiece of the *Rudolphine Tables* (1627).
- **Fit:** the Earth's ellipse by page 2.1's method (the seasons of
  2026, 92.735 and 93.653 days) with Kepler's equation, solved by
  Newton's method: $e$ = 0.016655, the apogee at 103.38° (page 2.1's
  eccentric 0.033473, 103.73°), each year of 2016–2025 alone 0.01665 to
  0.01675; $L_0$ from the equinox, page 1.3's $n$, page 2.3's apogee rate.
  Mars: page 4.1's $n$; $L_0$, $\lambda_A$ and $e$ from the eight
  oppositions to the real Sun of 2010–2025, where the geocentric ecliptic
  longitude is the heliocentric one: $e$ = 0.0934 (page 4.2's real-Sun
  refit 0.0935), the aphelion at 156.15° (J2000) fixed among the stars,
  within 0.75′; $a$ = 1.5237 au from the third law (686.981 days), so no
  distance enters the fit. History block: the true Sun (*HAMA* p. 171),
  the Earth's faster motion near the Sun, found from Mars (Voelkel ch. 3),
  and its equant (*HAMA* p. 155; the halved eccentricity, Fitzpatrick §
  1.4), the free equant for the longitudes and another model for the
  distances (*HAMA* pp. 98, 172), the 8′ of the halved eccentricity
  (Fitzpatrick § 1.4), the area law, the sausage and the ellipse
  (Voelkel ch. 3), the third law of 15 May 1618 (ch. 4).
- **Test:** Mars within 5.7′ over 2010–2025 (page 4.2's equant 0.81° on
  this reference, 0.88° on its own), 18′ over 1926–2126; its distance from
  the Earth within 0.0019 au (page 4.3: 0.0205 au); the triangulated
  points within 0.0010 au of the ellipse. The Sun within a quarter of an arcminute in 2026
  (page 2.1's eccentric 1.74′), 1.2′ and 2.7′ within fifty years and five
  centuries (2.0′, 3.9′); its distance 0.98335–1.01665 au against the real
  0.98330–1.01664 (the eccentric 0.9665–1.0335). History block: the
  *Rudolphine Tables*, fifty times more accurate (Voelkel ch. 6), the
  transit of Mercury of 1631 within six hours, Gassendi (ch. 7), the
  frontispiece.
- **Residual:** the planets' pulls (detours *perturbations*, *newton*):
  Mars' aphelion turns 0.43° a century among the stars (fitted to the
  oppositions of 1931–1946 and 2010–2025), and with it and the mean motion
  refitted to the same oppositions the two-century error falls from 18′
  to 8.4′; the tilt of Mars' plane, at most 0.9′
  (detour *latitudes*); the Sun's quarter of an arcminute, about half of
  it the Earth's monthly swing about the Earth–Moon center of mass (6.9″),
  under 0.13′ averaged over a month, with the nutation the model leaves
  out. **The Moon after Kepler** (an h3, no
  figure): the ellipse's 6.29°, then the evection 1.27°, the variation
  0.66°, the annual equation 11′, the perigee (8.85 years) and the nodes
  (18.61 years), from the Sun's pull; the epilogue.
- **Today note** (§7.5), beside the residual: today's ephemerides
  integrate Newton's equations or, like VSOP87, start from Kepler's
  ellipses and add the planets' pulls.
- **Exercises:** Kepler's equation by fixed-point and Newton iteration,
  for Mars, the view $e$ = 0.6 and Halley's comet (9 and 3 steps, 19 and 5,
  312 and 4; the contraction $e|\cos E|$; compute, then check); the third
  law from Kepler's own periods and distances (Voelkel ch. 4), and Mars'
  distance from its period (compute); Kepler's first try, an eccentric
  circle with the area law, $\tfrac32 e^2\sin 2M$ against the ellipse's
  $\tfrac54$ and the equant's 1, up to 7.53′ and 8.96′ for Mars (break the
  model).
- **Code:** `models/kepler.js` (`Kepler`: `newton`, `fixedPoint`,
  `atAnomaly`, `state`, `meanAnomalyAt`, `makeSun`, `geocentric`, `make`,
  `fitSeasons`, `thirdLaw`, `siderealPeriod`, `triangulate`,
  `triangulatePath`, `apsidalCircle`; `SUN_2026`, `MARS_FIT`);
  `vsop87.js` and `vsop87-data.js`; `Ephem.addTheory` and the option
  `theory`.
- **Sources:** Voelkel ch. 3, 4, 6, 7; *HAMA* pp. 98, 155, 171–172;
  Fitzpatrick § 1.4, § 4.2; Bretagnon and Francou (1988); Standish; Meeus
  ch. 30 and Table 47.A.
- **Hands over:** to the epilogue.

### Epilogue

#### Beyond Kepler

One short page: where the story goes next. Each entry has one sentence on why
it matters, and becomes a link when its page exists. Unbuilt entries are
shown greyed out. Candidates: Tycho's observations, Newton and gravitation,
perturbations, the Moon after Kepler (the evection, the variation and the
annual equation as effects of the Sun's pull; modern lunar series), nutation, aberration and stellar parallax, planetary latitudes,
the Islamic critiques of the equant, calendars, instruments.

### Hub

The site's `index.html`: the story in a few short paragraphs, the five
acts as a map, and a link to *Beyond Kepler*. Optional: a notation page
(§6). The opening says, as part of the story and not as a warning:

- each page rebuilds a historical model as its author conceived it
  (WRITING.md §9); some steps refine an astronomer's own model, others
  change its form;
- Kepler's ellipse is the first approximation used today, for the
  planets and for the Sun's path relative to the Earth; the course
  reaches it on page 4.5;
- circles already come close for the Sun and the Moon, and much of what
  the reader learns on the way (coordinates, sidereal time, the equation
  of time, precession, eclipse limits) is used as it is today;
- the Moon needs more than an ellipse, and its remaining terms lead to the
  epilogue;
- the objective (§1).

---

## 5. Page anatomy

Every content page is **one scrolling article** (no tabs), so the argument
reads in order. A table of contents on the left lists the sections and
follows the reader down the page (sticky). The look of every page is set by
`STYLE.md`.

Every page follows the same rhythm:

1. **Observation.** What is seen in the sky, with numbers.
2. **Model.** The geometric idea, derived.
3. **Fit.** How the model's parameters could be obtained: for each
   parameter, which observation fixes it and why that observation is the
   right one. The method comes first; the fitted values appear once, as
   its outcome, not as a stream of numbers. The data of the fit follow
   three rules:
   - **Fitted, not copied.** Every parameter is fitted from observations
     (the reference sky's positions, standing in for modern
     observations). A value is never taken from the theory behind the
     reference sky (Meeus' or Standish's mean motions, a mean node): that
     would put the answer into the fit.
   - **Documented.** The observations are ones already made: no date
     after the time of writing. Only the test runs the model into the
     future, as a prediction.
   - **Modern, over the span the parameter needs.** "The current period"
     means modern observations, as against the historical astronomer's
     (the model is never fitted to Ptolemy's or Hipparchus' data; their
     fits go in the history block). It does not mean the years around
     2026: a rate takes observations decades or a century apart, an
     anomaly a full turn of it.
   Adopted on 2026-11-11 (DECISIONS.md); pages 1.1 to 3.3 were refitted
   to it on 2026-11-12.
4. **Test.** The model fitted to modern observations against the
   reference sky, with the error curve from page 2.1 on: around the fit
   year, and over centuries or millennia when that shows something about
   the model. It is tested once: the same test is not repeated in the
   historical astronomer's own time (Hipparchus', Ptolemy's). Act I has no
   longitude model: its pages test the quantity they predict (an
   altitude, a rising time).
5. **Residual.** In short prose with few numbers: what the model still
   lacks and why, ending with the question for the next page.

Fit and Test are mostly modern, with a little history. Each may end with a
short **history block** about the astronomer whose model the page rebuilds:
two or three short paragraphs, after the modern text and never between its
paragraphs, in a `<div class="history">` headed "History".

- **History in the Fit:** how he measured each parameter, the observation
  he chose, the instrument, and why that observation was the right one.
  How the ancients knew what they knew is the point; the result is given
  in words, compared with the modern fit, with at most one number when the
  agreement is the point. The numbers of his observations are left out,
  or kept for an exercise in which the reader redoes his measurement.
- **History in the Test:** how he checked his model, and how it fared, in
  words: whether it held in his own time, and, when it shows something
  the modern test cannot, how it does today. At most one or two numbers,
  no tables of his observations and no figures of his errors.

Where his numbers were off, say so in words, without working through
them. Every statement of how he measured or checked comes from the
sources (book and chapter), like any historical claim. The block is
styled by `shared/theme.css` (STYLE.md §4.8; see `templates/page.html`).

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
| $n$ | the mean Sun's daily motion, $360^\circ / Y$; for the Moon and a planet, their mean daily motion in ecliptic longitude, the Sun's then $n_\odot$ (pages 3.1, 4.1) |
| γ | the vernal point, origin of $\alpha$ and $\lambda$ (♈ in older books) |
| P, K, Z | north celestial pole, north ecliptic pole, zenith |
| $\bar\lambda$ | mean longitude |
| $\lambda_A$ | longitude of the apogee |
| $M$ | mean anomaly, measured from the apogee, $M = \bar\lambda - \lambda_A$ (Fitzpatrick counts it from the perigee) |
| $q$ | equation of center ($\lambda = \bar\lambda + q$), negative from the apogee to the perigee |
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
| $D$ | the mean elongation of the Moon, $\bar\lambda - \bar\lambda_\odot$ (Meeus' $D$), page 3.2 |
| $c$ | OC, the distance of the center of Ptolemy's lunar eccentric from the Earth, where OA = 1 (page 3.2) |
| $i$ | the inclination of the Moon's circle to the ecliptic (page 3.3) |
| $\Omega$ | the longitude of the Moon's ascending node; ☊ and ☋, the ascending and descending nodes, in figures (page 3.3) |
| $F,\ \bar F$ | the argument of latitude, the Moon's angle along its circle from the ascending node, and its mean value $\bar\lambda - \Omega$ (Meeus' $F$); Ptolemy counts it from the northern limit, $F - 90^\circ$ (page 3.3) |
| $n_F$ | the daily motion of $\bar F$ (page 3.3) |
| $P_s,\ P_a,\ P_d$ | the synodic, anomalistic and draconitic months (pages 3.1, 3.3) |
| $Y_\text{e}$ | the eclipse year, the Sun's return to a node (page 3.3) |
| $s,\ s_\odot$ | the apparent radii of the Moon and the Sun (page 3.3) |
| $\pi,\ \pi_\odot$ | the horizontal parallaxes of the Moon and the Sun (page 3.3) |
| $u$ | the radius of the Earth's umbra at the Moon's distance (page 3.3) |
| $\mu$ | a planet's anomaly on its epicycle, counted from the epicycle's apogee eastward, in the direction of the motion (page 4.1); for an outer planet $\mu = \bar\lambda_\odot - \bar\lambda$ |
| $\eta$ | the equation of the epicycle, $\lambda = \bar\lambda + \eta$, positive from the apogee to the perigee (page 4.1) |
| $n_\mu$ | a planet's daily motion in anomaly; for an outer planet $n + n_\mu = n_\odot$ (page 4.1) |
| $S,\ P_\lambda$ | a planet's synodic period and its period in ecliptic longitude (page 4.1) |
| Q, $e$ | the equant, and for a planet OC = $e$, OQ = $2e$ (C the center of the deferent); $M$ the mean anomaly of K on the deferent, the angle at Q from the apogee (the planet's anomaly on the epicycle stays $\mu$); $q$ the zodiacal equation, $\rho$ = OK, and $\mu$ counted from the mean apogee on QK (page 4.2) |
| $a$ | a planet's distance from the Sun's mean place ☉, in units of the Earth's (au), $1/r$ for an outer planet and $r$ for an inner one; ☉ that point in figures, since $S$ is the synodic period (page 4.3) |
| $P$ | a planet's period about the Sun, $1/P = 1/Y \mp 1/S$ (outer, inner), against the stars with $Y_\text{s}$ (page 4.3) |
| $\varepsilon_\text{max}$ | an inner planet's greatest elongation, $\sin\varepsilon_\text{max} = a$ for a circle (not the obliquity; page 4.3) |
| $\psi$ | the angle at ☉ between the Earth and an outer planet, $\cos\psi = 1/a$ at quadrature (page 4.3) |
| $d_1,\ d_2$ | Copernicus' eccentricity and epicyclet (*De Revolutionibus* V 4), $\tfrac32 e$ and $\tfrac12 e$ (page 4.3) |
| $k$ | the illuminated fraction of a planet's disk, $(1 + \cos\chi)/2$ (Meeus' symbol; page 4.1 uses $k$ for $n_\mu/n$ in one formula) (page 4.4) |
| $\chi$ | the phase angle, at the planet between the Sun and the Earth (page 4.4) |
| $\varpi$ | the parallax of a star, in arcseconds (page 4.4) |
| $a,\ b$ | the semi-major and semi-minor axes of an ellipse; $a$ in au is page 4.3's distance (page 4.5) |
| $e$ (ellipse) | C☉ / $a$, C the center, ☉ and Q the foci (page 4.5); page 4.2's OC = $e$ |
| $E$ (ellipse) | the eccentric anomaly, from the aphelion, $M = E + e\sin E$ (not the equation of time; Fitzpatrick counts from the perihelion) (page 4.5) |
| $r$ (ellipse) | ☉P, the distance from the Sun (page 4.5; not the epicycle's radius) |
| $R$ (page 4.5) | the Earth–Sun distance (not the deferent's radius); $\lambda_\text{h}$ a heliocentric ecliptic longitude; P′ the point of the circle on the long axis, Π the perihelion |

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
- **Hipparchus / Ptolemy / Copernicus / Tycho / Kepler:** the author's contribution, as far as the sources allow.
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

### 7.5 Today notes

On a page whose model is not the one used today, a margin note headed
"Today" says, in one or two sentences, what replaces it as the modern
first approximation and how the two compare (a formula, a number from the
page's script). It states the modern counterpart; it does not judge the
historical model, which the page tests with the error curve. Pages 2.1,
3.1, 3.2, 4.3 and 4.4 have one (§4); other pages add one only when their model has
a direct modern counterpart. Its numbers come from the page's script, like
every other number. Adopted on 2026-11-02; written on pages 2.1, 3.1 and
3.2 the same day. The style is in `STYLE.md` §4.5.

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
| `shared/vsop87.js`, `shared/vsop87-data.js` | The reference of page 4.5: the Earth and Mars from VSOP87B, truncated (generated by `tools/make-vsop87.js`), added to `Ephem` as the theory `vsop87`. |
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
reuses the solar equation of center as its equation of anomaly. Ptolemy's crank (`models/lunar-crank.js`, page 3.2) carries that epicycle on a turning eccentric and also gives the Moon's distance. The Moon's latitude (`models/lunar-latitude.js`, page 3.3) tilts that epicycle's circle, and `models/eclipses.js` joins a Sun and a Moon into an eclipse model, with the reference sky's eclipses (`Eclipses.reference`) to test it against. The simple planetary epicycle (`models/planet-epicycle.js`, page 4.1) carries a planet on an epicycle whose radius keeps the direction of the mean Sun, and finds the reference sky's stations and loops (`PlanetEpicycle.referenceEvents`). The planetary equant (`models/planet-equant.js`, page 4.2) puts that epicycle on an eccentric deferent turning uniformly about the equant, and holds Ptolemy's Mars, which page 0.1 runs to tonight. Kepler's ellipses (`models/kepler.js`, page 4.5) give the Sun and a planet seen from the Earth, with Kepler's equation and the third law. The mean Sun (`models/mean-sun.js`, page 1.3)
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
  03-new-center/
  04-phases-parallax/
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
Copernicus, *De Revolutionibus*. Kepler's *Astronomia Nova* is not in the
project yet.

Modern references:

- R. Fitzpatrick, *A Modern Almagest*: Ptolemaic models with modern
  parameters, the main reference for Acts II to IV.
- J. Meeus, *Astronomical Algorithms*: time scales, sidereal time, worked
  examples for the tests, and the truncated lunar theory used as the
  reference Moon.
- E. M. Standish, *Keplerian Elements for Approximate Positions of the Major
  Planets* (JPL): the planetary reference. Being Keplerian, it cannot judge a
  Keplerian model (see page 4.5).
- P. Bretagnon and G. Francou, "Planetary theories in rectangular and
  spherical variables. VSOP 87 solutions" (A&A, 1988): the reference of
  page 4.5 for the Earth and Mars, from the IMCCE's files.
- J. Vondrák, N. Capitaine, P. Wallace, *New precession expressions, valid
  for long time intervals* (A&A, 2011), as in SOFA / ERFA: the precession
  used by the reference sky.
- JPL Horizons (DE441): the yardstick for the reference sky's documented
  accuracy and for some of the tests.
- SIMBAD (CDS, Strasbourg): star positions and proper motions (ICRS J2000)
  for `shared/stars.js`.
- J. Evans, *The History and Practice of Ancient Astronomy*.
- O. Neugebauer, *A History of Ancient Mathematical Astronomy* (in the
  project: Part One, the Almagest, its predecessors and Babylonian
  astronomy).
- J. R. Voelkel, *Johannes Kepler and the New Astronomy* (in the project):
  Kepler's life and the outline of his work, for pages 4.4 and 4.5. A
  short biography: precise claims are checked in other sources.

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
