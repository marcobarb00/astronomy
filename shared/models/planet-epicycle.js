// @ts-check
/* ==========================================================================
   PREDICTING THE SKY - MODEL: THE SIMPLE PLANETARY EPICYCLE
   (models/planet-epicycle.js)
   The model of page 4.1, the planets' anomaly relative to the Sun with a
   single epicycle on a deferent centred on the Earth (Almagest IX 5,
   X 6, XII 1). The centre K of the epicycle moves uniformly on the
   deferent (radius R = 1, the unit of every length here) at the mean
   longitude lambdaBar, and the planet moves uniformly on the epicycle
   (radius r) by the anomaly mu, counted from the apogee of the epicycle
   (the point farthest from the Earth) in the direction of the motion,
   eastward: the opposite of the Moon's epicycle (page 3.1, IX 5). As a
   vector,
	   OP = u(lambdaBar) + r u(lambdaBar + mu),
   so the planet is seen at
	   lambda = lambdaBar + eta,   eta = atan2(r sin mu, 1 + r cos mu),
   the equation of the epicycle, positive from the apogee to the perigee
   (STRUCTURE.md §6).

   Outer planets (Mars, Jupiter, Saturn): lambdaBar moves at the
   planet's own mean motion n, and mu = lambdaBarSun - lambdaBar, so that
   lambdaBar + mu is the mean Sun's longitude: the radius KP stays
   parallel to the line from the Earth to the mean Sun (X 6). The motion
   in anomaly is n_mu = n_sun - n.
   Inner planets (Venus, Mercury): lambdaBar is the mean Sun's longitude,
   and mu moves at a rate of its own, n_mu.

   Needs common.js, time.js, ephemeris.js (only for the reference sky's
   loops, section 5) and models/mean-sun.js. Touches no DOM, so it can be
   loaded in Node.

   make(parameters) returns jd => longitude (JD(TT) in, degrees out), as
   ErrorCurve.addModel and ErrorCurve.addGhost expect (README.md).

   TABLE OF CONTENTS
	 1. Parameter sets
	 2. The model
	 3. The speed, the stations and the loop
	 4. The drawing of one moment
	 5. The reference sky's loops
	 6. Export
   ========================================================================== */

const PlanetEpicycle = (function () {
	/* ======================================================================
	   1. PARAMETER SETS
	   kind: 'outer' or 'inner'; r: the epicycle's radius where the
	   deferent's is 1; epoch: JD(TT); sun: the mean Sun (MeanSun
	   parameters). Outer: L0, the mean longitude at the epoch (deg), and
	   n, its daily motion (deg / day). Inner: mu0, the anomaly at the
	   epoch, and nMu, its daily motion.
	   ====================================================================== */

	/* The general precession in longitude (deg a Julian century), the
	   linear term of IAU 2006 (5028.796195"): it turns Standish's mean
	   longitudes, referred to the fixed equinox of J2000, into longitudes
	   of date, which the models predict. */
	const PRECESSION_PER_CENTURY = 5028.796195 / 3600;

	/* A mean longitude of Standish's (Ephem.ELEMENTS, Table 2a: L at
	   J2000 in the J2000 frame and its rate a Julian century), of date:
	   { L0 (deg, at J2000), n (deg / day) }. */
	function meanOfDate(body) {
		const L = Ephem.ELEMENTS[body].at[3];
		const rate = Ephem.ELEMENTS[body].rate[3];

		return {
			L0: norm360(L),
			n: (rate + PRECESSION_PER_CENTURY) / 36525
		};
	}

	/* Ptolemy's mean motions in longitude and in anomaly (deg / day,
	   Almagest IX 3, the sexagesimal values of the tables of IX 4) and the
	   radii of the epicycles where the deferent is 60 (X 2, X 8, XI 2,
	   XI 6, IX 9, as tabulated in HAMA p. 146), for the simple model: only the motions and
	   the ratios, no epoch (page 4.2 adds the eccentricities). These are
	   not parameter sets for make() or state(), which need an epoch and a
	   mean Sun: they feed loop() and loopThreshold() with their own n and
	   nMu. For the inner planets the motion in longitude is the mean
	   Sun's (III 2). */
	const SUN_DAILY = MeanSun.PTOLEMY.n;
	const PTOLEMY = {
		saturn: {
			kind: 'outer',
			n: polynomial(1 / 60, [0, 2, 0, 33, 31, 28, 51]),
			nMu: polynomial(1 / 60, [0, 57, 7, 43, 41, 43, 40]),
			r: 6.5 / 60
		},
		jupiter: {
			kind: 'outer',
			n: polynomial(1 / 60, [0, 4, 59, 14, 26, 46, 31]),
			nMu: polynomial(1 / 60, [0, 54, 9, 2, 46, 26, 0]),
			r: 11.5 / 60
		},
		mars: {
			kind: 'outer',
			n: polynomial(1 / 60, [0, 31, 26, 36, 53, 51, 33]),
			nMu: polynomial(1 / 60, [0, 27, 41, 40, 19, 20, 58]),
			r: 39.5 / 60
		},
		venus: {
			kind: 'inner',
			n: SUN_DAILY,
			nMu: polynomial(1 / 60, [0, 36, 59, 25, 53, 11, 28]),
			r: (43 + 10 / 60) / 60
		},
		mercury: {
			kind: 'inner',
			n: SUN_DAILY,
			nMu: polynomial(1 / 60, [3, 6, 24, 6, 59, 35, 50]),
			r: 22.5 / 60
		}
	};

	/* Mars fitted on page 4.1 (tools/numbers/4.1-going-backwards.js), from
	   documented oppositions only: n from the eight oppositions to the mean
	   Sun of 2010 - 2025 and those 79 years earlier; L0 from the eight of
	   2010 - 2025; r from the mean of their eight arcs of retrogradation,
	   16.66°. Epoch J2000.0. */
	const MARS_FIT = {
		kind: 'outer',
		L0: 355.837484,
		n: 0.524070392,
		epoch: 2451545.0,
		r: 0.66015,
		sun: MeanSun.MODERN
	};

	/* Venus for the figure of page 4.1: the reference's mean motions (its
	   anomaly is Standish's mean longitude less the mean Sun's, so that the
	   planet is at the apogee of the epicycle at mean superior
	   conjunction), with Ptolemy's ratio 43;10 / 60. */
	const VENUS_MEAN = {
		kind: 'inner',
		mu0: norm360(meanOfDate('venus').L0 - MeanSun.MODERN.L0),
		nMu: meanOfDate('venus').n - MeanSun.MODERN.n,
		epoch: 2451545.0,
		r: PTOLEMY.venus.r,
		sun: MeanSun.MODERN
	};

	/* ======================================================================
	   2. THE MODEL
	   ====================================================================== */

	/* The equation of the epicycle eta (deg) at the anomaly mu (deg, from
	   the apogee, eastward) for the ratio r: the solar equation of centre
	   of page 2.1 with the sign reversed, since mu counts the other way. */
	function equationOfEpicycle(mu, r) {
		return atan2d(r * sin(mu), 1 + r * cos(mu));
	}

	/* The two daily motions of a parameter set: { n, nMu } (deg / day),
	   n the motion of K in longitude, nMu the motion in anomaly. */
	function motions(parameters) {
		if (parameters.kind === 'inner') {
			return { n: parameters.sun.n, nMu: parameters.nMu };
		}

		return { n: parameters.n, nMu: parameters.sun.n - parameters.n };
	}

	/* The state of the model at JD(TT): { sun (the mean Sun's longitude),
	   meanLongitude (K's), mu, eta, lambda } (deg, in [0, 360) except
	   eta). */
	function state(parameters, jd) {
		const sun = MeanSun.meanLongitude(parameters.sun, jd);
		const t = jd - parameters.epoch;
		let meanLongitude;
		let mu;

		if (parameters.kind === 'inner') {
			meanLongitude = sun;
			mu = parameters.mu0 + parameters.nMu * t;
		} else {
			meanLongitude = parameters.L0 + parameters.n * t;
			mu = sun - meanLongitude;
		}

		const eta = equationOfEpicycle(mu, parameters.r);

		return {
			sun: norm360(sun),
			meanLongitude: norm360(meanLongitude),
			mu: norm360(mu),
			eta,
			lambda: norm360(meanLongitude + eta)
		};
	}

	/* jd (TT) -> the planet's longitude of date (deg, [0, 360)). */
	function make(parameters = MARS_FIT) {
		return jd => state(parameters, jd).lambda;
	}

	/* jd (TT) -> the mean longitude (deg): a planet moving uniformly, with
	   no epicycle at all. */
	function makeUniform(parameters = MARS_FIT) {
		return jd => state(parameters, jd).meanLongitude;
	}

	/* ======================================================================
	   3. THE SPEED, THE STATIONS AND THE LOOP
	   ====================================================================== */

	/* d eta / d mu (radians per radian) at the anomaly mu. */
	function equationSlope(mu, r) {
		return (r * (r + cos(mu))) / (1 + 2 * r * cos(mu) + r * r);
	}

	/* The daily motion (deg / day) at the anomaly mu, for the motions
	   { n, nMu } and the ratio r: n + nMu d eta / d mu. Greatest at the
	   apogee, n + nMu r / (1 + r), least at the perigee, n - nMu r /
	   (1 - r). */
	function dailyMotion(mu, r, n, nMu) {
		return n + nMu * equationSlope(mu, r);
	}

	/* The ratio below which the planet never goes backwards: at the
	   perigee r / (1 - r) = n / nMu, i.e. r = n / (n + nMu) (Almagest
	   XII 1). */
	function loopThreshold(n, nMu) {
		return n / (n + nMu);
	}

	/* The anomaly (deg) of the first station, before the perigee, where
	   the daily motion is zero:
		   cos mu = -(1 + r^2 (1 + k)) / (r (2 + k)),  k = nMu / n.
	   NaN when r is at or below the threshold (no station). The second
	   station is at 360° - mu. */
	function stationAnomaly(r, n, nMu) {
		if (r <= loopThreshold(n, nMu)) {
			return NaN;
		}

		const k = nMu / n;

		return acos(-(1 + r * r * (1 + k)) / (r * (2 + k)));
	}

	/* The loop of the model: { mu (first station, deg), arc (deg, the
	   distance the planet goes back), days (between the stations) }, or
	   NaN values when there is no loop. From the first station to the
	   second the mean longitude grows by n days and eta falls by
	   2 eta(mu). */
	function loop(r, n, nMu) {
		const mu = stationAnomaly(r, n, nMu);
		const days = (2 * (180 - mu)) / nMu;

		return {
			mu,
			arc: 2 * equationOfEpicycle(mu, r) - n * days,
			days
		};
	}

	/* The ratio r whose loop has the given arc (deg), for the motions
	   { n, nMu }: the arc grows with r, so bisection. */
	function ratioForArc(arc, n, nMu) {
		const low = loopThreshold(n, nMu) + 1e-9;

		return bisect(r => loop(r, n, nMu).arc - arc, low, 0.999, 60);
	}

	/* ======================================================================
	   4. THE DRAWING OF ONE MOMENT
	   ====================================================================== */

	/* The points of one moment, in units of the deferent's radius, with
	   the Earth at the origin and x towards the vernal point: K, the
	   centre of the epicycle, and planet, the planet; and the direction
	   of the mean Sun (deg). */
	function construction(s, r) {
		const K = [cos(s.meanLongitude), sin(s.meanLongitude)];
		const along = s.meanLongitude + s.mu;

		return {
			K,
			planet: [K[0] + r * cos(along), K[1] + r * sin(along)],
			sun: s.sun
		};
	}

	/* ======================================================================
	   5. THE REFERENCE SKY'S LOOPS
	   The stations, oppositions (outer) or inferior conjunctions (inner)
	   and loops of a planet in the reference sky (Ephem), from samples
	   refined by bisection. Used by page 4.1's figures and its numbers
	   script, so both read one computation. options: apparent (true: the
	   apparent positions the numbers script quotes; false: geometric
	   ones, under 1' away and four times faster, for the figures) and
	   step (days between samples).
	   ====================================================================== */

	/* The reference planet's ecliptic longitude of date (deg). */
	function referenceLongitude(body, jd, apparent = true) {
		return Ephem.position(body, jd, { apparent }).lon;
	}

	/* The reference planet's daily motion (deg / day) at JD(TT): the
	   change of its longitude over the half day centred there. */
	function referenceMotion(body, jd, apparent = true) {
		const before = referenceLongitude(body, jd - 0.25, apparent);
		const after = referenceLongitude(body, jd + 0.25, apparent);

		return norm180(after - before) / 0.5;
	}

	/* The elongation of the reference planet from the true Sun (deg, in
	   [-180, 180)): its longitude less the Sun's. */
	function referenceElongation(body, jd, apparent = true) {
		return norm180(referenceLongitude(body, jd, apparent) - Ephem.sun(jd, { apparent }).lon);
	}

	/* The events of a planet in [start, end] (JD(TT)): { days, lons (the
	   samples), stations: [{ jd, kind: 'R' (turning back) or 'D' (turning
	   forward), lon }], loops: [{ start, end, arc, days, middle, lon (at
	   the middle) }] }. The middle of a loop is the opposition (outer
	   planet) or the inferior conjunction (inner): during the loop the
	   elongation only decreases, so it is found by bisection between the
	   two stations. */
	function referenceEvents(body, kind, start, end, options = {}) {
		const { apparent = true, step = 1 } = options;
		const lon = jd => referenceLongitude(body, jd, apparent);
		const days = [];
		const lons = [];

		for (let jd = start; jd <= end; jd += step) {
			days.push(jd);
			lons.push(lon(jd));
		}

		// a station between two samples where the direction changes
		const stations = [];

		for (let i = 1; i + 1 < days.length; i++) {
			const before = norm180(lons[i] - lons[i - 1]);
			const after = norm180(lons[i + 1] - lons[i]);

			if (before * after < 0) {
				const jd = bisect(t => referenceMotion(body, t, apparent), days[i] - step / 2, days[i] + step / 2, 30);

				stations.push({ jd, kind: before > 0 ? 'R' : 'D', lon: lon(jd) });
			}
		}

		const target = kind === 'inner' ? 0 : 180;
		const off = t => norm180(referenceElongation(body, t, apparent) - target);
		const loops = [];

		for (let i = 0; i + 1 < stations.length; i++) {
			const a = stations[i];
			const b = stations[i + 1];

			if (a.kind === 'R' && b.kind === 'D' && off(a.jd) > 0 && off(b.jd) < 0) {
				const middle = bisect(off, a.jd, b.jd, 30);

				loops.push({
					start: a.jd,
					end: b.jd,
					arc: norm180(a.lon - b.lon),
					days: b.jd - a.jd,
					middle,
					lon: lon(middle)
				});
			}
		}

		return { days, lons, stations, loops };
	}

	/* ======================================================================
	   6. EXPORT
	   ====================================================================== */

	return {
		PRECESSION_PER_CENTURY,
		PTOLEMY,
		MARS_FIT,
		VENUS_MEAN,
		meanOfDate,
		equationOfEpicycle,
		motions,
		state,
		make,
		makeUniform,
		equationSlope,
		dailyMotion,
		loopThreshold,
		stationAnomaly,
		loop,
		ratioForArc,
		construction,
		referenceLongitude,
		referenceMotion,
		referenceElongation,
		referenceEvents
	};
})();
