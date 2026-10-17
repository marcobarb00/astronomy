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
