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

Empty for now: the first model arrives with page 2.1.
