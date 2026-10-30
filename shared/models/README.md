# Shared models

Models built on one page and reused by later pages (STRUCTURE.md §8): the solar
eccentric (2.1), the lunar epicycle (3.1), the planetary equant (4.2), and so on.
Later pages and the error-curve ghosts call them, so the ghost of a model is
always the model itself, never a copy.

Conventions for a model file `shared/models/<name>.js`:

- One global object per file, named after the model (e.g. `SolarEccentric`).
- A function `make(parameters)` that returns `jd => longitude`: input JD(TT),
  output the geocentric ecliptic longitude of date in degrees. This is exactly
  what `ErrorCurve.addModel` and `ErrorCurve.addGhost` take.
- The historical parameter sets as named constants with their source, e.g.
  `HIPPARCHUS = { e: ..., apogee: ... }  // Almagest III 4`, with every number
  computed by a script or quoted from the source.
- No DOM at load time; header and section comments as in the other shared files.

A model that does not predict a longitude exports plain, documented functions
instead of `make()`, since the error curve cannot judge it.

| File | Page | Contents |
|---|---|---|
| `diurnal.js` | 1.1 | `Diurnal`: the turning sky. Frames (sky, horizon), altitude, culminations, rising hour angle, fraction of a turn above the horizon. |
| `frames.js` | 1.2 | `Frames`: the equatorial, ecliptic and horizon frames. Rotation matrices and the multiplied-out formulas between them, azimuth from the north, the reduction to the equator, the angle between the ecliptic and the horizon; Ptolemy's obliquity and his tables of declination and right ascension (*Almagest* I 15–16). |
| `mean-sun.js` | 1.3 | `MeanSun`: the Sun moving uniformly along the ecliptic, `make({ L0, n, epoch, clock })`; the modern parameters (Meeus 25.2) and Ptolemy's (`PTOLEMY`, epoch Nabonassar at Alexandria, *Almagest* III 7), whose days are days of UT (`clock: 'ut'`). |
| `solar-eccentric.js` | 2.1 | `SolarEccentric`: Hipparchus' eccentric, `make({ L0, n, epoch, clock, e, apogee })` with the equation of centre $q = -\operatorname{atan2}(e \sin M, 1 + e \cos M)$; the greatest equation, the distance, the four season lengths and Hipparchus' fit from two seasons (`fitSeasons`); Ptolemy's parameters (`PTOLEMY`, *Almagest* III 4, 7) and ours (`FIT_2026`, fitted to the seasons of 2026); from page 2.3, an apogee moving at `apogeeRate` degrees a century (`apogeeAt`, `MOVING_2026`). |
| `clock.js` | 1.3 | `Clock`: the sidereal clock read off mean solar time. Sidereal time (linear Meeus 12.4), hour angle, local mean time, transits of a star, and the model Sun's noon, sunrise, sunset and day length ($h_0 = -50'$). |
| `equation-of-time.js` | 2.2 | `EquationOfTime`: apparent minus mean solar time, $E = -q + (\lambda - \alpha)$, for a solar model of `SolarEccentric` and an obliquity: the two parts and their sum, the first-order formula, the reduction to the equator written as an eccentric of eccentricity $\tan^2(\varepsilon/2)$ and its greatest value, the Sun at mean noon (the analemma) and the model's real noon. |
| `precession.js` | 2.3 | `Precession`: the stars turning about the poles of the ecliptic at a uniform rate, `make({ rate, epoch, obliquity }, lon0)`; the shift of every longitude, the equinox and the pole of the equator of date, positions of date, the rate of change of declination, the period and the sidereal year from the tropical year; the modern rate fitted to the reference sky (`MODERN`) and Ptolemy's 1° in 100 years from his catalogue's epoch (`PTOLEMY`, *Almagest* VII 2, 4). |
| `lunar-epicycle.js` | 3.1 | `LunarEpicycle`: the Moon's first anomaly, an epicycle on a deferent centred on the Earth, `make({ L0, n, M0, nM, epoch, clock, e })` with $e = r/R$ and the equation of anomaly $q = -\operatorname{atan2}(e \sin M, 1 + e \cos M)$ (the solar eccentric's function); the uniform Moon (`makeUniform`), the months, the daily motion; the equivalent eccentric (`construction`: K, C and the Moon, a parallelogram); the three-eclipse method (`threeEclipses`, `fitEclipses`) and the triples of Ptolemy and Copernicus (`TRIPLES`, *Almagest* IV 6, *De Rev.* IV 5); Ptolemy's parameters (`PTOLEMY`, *Almagest* IV 3, 8, 10), Meeus' mean motions (`MEEUS`) and ours (`FIT_2026`, from the eclipses of 2025–2026, `ECLIPSES_2026`). |
| `lunar-crank.js` | 3.2 | `LunarCrank`: Ptolemy's crank, the epicycle of page 3.1 carried on an eccentric whose centre turns about the Earth (*Almagest* V 2–7), `make()`, `makeDistance()`, `state`, `geometry`, `construction`; Ptolemy's parameters (`PTOLEMY`, V 4) and ours (`FIT_2026`, $c$ fitted to the quarters of 2026). |
| `lunar-latitude.js` | 3.3 | `LunarLatitude`: the Moon's circle inclined by $i$, its nodes moving westward; $\sin\beta = \sin i \sin F$ with $F = \bar F + q$; `make()` returns the latitude; `state`, `months` (draconitic, the turn of the node); Meeus' motion (`MEEUS`), Ptolemy's (`PTOLEMY`, *Almagest* IV 9, V 12) and ours (`FIT_2026`, $i$ and $F_0$ fitted to the new and full Moons of 2026). |
| `eclipses.js` | 3.3 | `Eclipses`: the eclipse model of a Sun and a Moon: apparent sizes, the limits (umbra with Danjon's rule, lunar, total, solar, central), the model's own syzygies and eclipses (`predict`), the reference sky's eclipses (`reference`, checked against NASA), Ptolemy's limits (VI 5), continued fractions for the saros; the model sets `FIT_2026` and `PTOLEMY`. |
