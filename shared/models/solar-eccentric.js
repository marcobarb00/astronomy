// @ts-check
/* ==========================================================================
   PREDICTING THE SKY - MODEL: THE SOLAR ECCENTRIC (models/solar-eccentric.js)
   The model of page 2.1, Hipparchus' Sun: the Sun moves uniformly on a
   circle whose centre C is not the Earth O but lies at a distance e (in
   units of the circle's radius) towards the apogee, at longitude lambdaA.
   Seen from C its longitude is the mean longitude lambdaBar of
   models/mean-sun.js; seen from O it is
	   lambda = lambdaBar + q,
	   q = -atan2(e sin M, 1 + e cos M),   M = lambdaBar - lambdaA,
   the equation of centre q, with the mean anomaly M counted from the
   apogee (STRUCTURE.md §6). q is negative from the apogee to the perigee
   (0 < M < 180°), where the Sun lags the mean Sun, as in Ptolemy, who
   subtracts the equation there (Almagest III 8).
   Needs common.js, time.js and models/mean-sun.js. Touches no DOM, so it
   can be loaded in Node.

   make(parameters) returns jd => longitude (JD(TT) in, degrees out), as
   ErrorCurve.addModel and ErrorCurve.addGhost expect (README.md).

   The fit (page 2.1, section 3; Almagest III 4)
	 Put the Earth at the origin, with x towards the vernal point and y
	 towards the summer solstice, and let C = (h, k) in units of the
	 radius, so h = e cos lambdaA, k = e sin lambdaA (h < 0 when the
	 apogee is beyond 90°, as now). Seen from C, the four points where
	 the axes (the lines from the Earth towards the equinoxes and the
	 solstices) meet the circle lie at
		 -asin k,  90° + asin h,  180° + asin k,  270° - asin h,
	 so the arcs of the four seasons are
		 a1 = 90° + asin h + asin k   (spring)
		 a2 = 90° - asin h + asin k   (summer)
		 a3 = 90° - asin h - asin k   (autumn)
		 a4 = 90° + asin h - asin k   (winter)
	 and each lasts a Y / 360° days. Two season lengths give asin k =
	 (a1 + a2 - 180°) / 2 and asin h = (a1 - a2) / 2, hence e and lambdaA;
	 and at the spring equinox the mean longitude is -asin k.

   TABLE OF CONTENTS
	 1. Parameter sets
	 2. The equation of centre
	 3. The model
	 4. The seasons and the fit
	 5. Export
   ========================================================================== */

const SolarEccentric = (function () {
	/* ======================================================================
	   1. PARAMETER SETS
	   Those of models/mean-sun.js (L0, n, epoch, clock), with e (the
	   distance OC, in units of the radius) and apogee (lambdaA, deg). The
	   apogee is fixed relative to the equinoxes, as in Ptolemy.
	   ====================================================================== */

	/* Hipparchus' two seasons (Almagest III 4): 94 1/2 days from the
	   spring equinox to the summer solstice, 92 1/2 days from there to the
	   autumn equinox. */
	const HIPPARCHUS_SEASONS = { spring: 94.5, summer: 92.5 };

	/* Ptolemy, Almagest III 4 and III 7: the eccentricity 2;30 parts on a
	   radius of 60 (1 : 24), the apogee at Gemini 5° 30' = 65.5°, on his mean Sun
	   (MeanSun.PTOLEMY, epoch Nabonassar, days of UT at Alexandria). */
	const PTOLEMY = Object.assign({}, MeanSun.PTOLEMY, {
		e: 2.5 / 60,
		apogee: 65.5
	});

	/* Our fit (page 2.1, section 3): Hipparchus' method applied to the
	   seasons of 2026 of the reference Sun (spring 92.739 d, summer
	   93.663 d) with the modern year, and the mean longitude from the
	   moment of the spring equinox, on the modern mean motion
	   (tools/numbers/2.1-uneven-year.js). */
	const FIT_2026 = Object.assign({}, MeanSun.MODERN, {
		L0: 280.45897,
		e: 0.033473,
		apogee: 103.732
	});

	/* ======================================================================
	   2. THE EQUATION OF CENTRE
	   ====================================================================== */

	/* q (deg) for the mean anomaly M (deg, from the apogee) and e. */
	function equationOfCentre(M, e) {
		return -atan2d(e * sin(M), 1 + e * cos(M));
	}

	/* The first-order approximation, -e sin M (deg). */
	function equationOfCentreFirstOrder(M, e) {
		return -e * sin(M) * R2D;
	}

	/* The greatest equation of centre: |q| = asin e, reached at M = 90° +
	   asin e (and 270° - asin e), where the Sun is 90° from the apogee as
	   seen from the Earth (Almagest III 4: 2;23° at 92;23°). */
	function greatestEquation(e) {
		return { q: asin(e), M: 90 + asin(e) };
	}

	/* The distance Earth - Sun, in units of the radius. */
	function distance(M, e) {
		return Math.sqrt(1 + 2 * e * cos(M) + e * e);
	}

	/* ======================================================================
	   3. THE MODEL
	   ====================================================================== */

	/* jd (TT) -> the true longitude of date (deg, [0, 360)). */
	function make(parameters = FIT_2026) {
		return jd => {
			const meanLongitude = MeanSun.meanLongitude(parameters, jd);

			return norm360(meanLongitude + equationOfCentre(meanLongitude - parameters.apogee, parameters.e));
		};
	}

	/* The state of the model at JD(TT): { meanLongitude, M, q, lambda }
	   (deg; meanLongitude and lambda in [0, 360), M in [0, 360)). */
	function state(parameters, jd) {
		const meanLongitude = norm360(MeanSun.meanLongitude(parameters, jd));
		const M = norm360(meanLongitude - parameters.apogee);
		const q = equationOfCentre(M, parameters.e);

		return { meanLongitude, M, q, lambda: norm360(meanLongitude + q) };
	}

	/* ======================================================================
	   4. THE SEASONS AND THE FIT
	   ====================================================================== */

	/* The arcs (deg, seen from C) of spring, summer, autumn and winter for
	   the centre C = (h, k). */
	function seasonArcs(h, k) {
		const sh = asin(h);
		const sk = asin(k);

		return [90 + sh + sk, 90 - sh + sk, 90 - sh - sk, 90 + sh - sk];
	}

	/* The four season lengths (days) of an eccentric (e, apogee) for a
	   year of Y days. */
	function seasonLengths(e, apogee, Y) {
		return seasonArcs(e * cos(apogee), e * sin(apogee)).map(arc => (arc * Y) / 360);
	}

	/* Hipparchus' method: from the lengths of spring and summer (days) and
	   the year Y, the centre { h, k }, e, the apogee, the four arcs and
	   season lengths, and the mean longitude at the spring equinox. */
	function fitSeasons(spring, summer, Y) {
		const a1 = (360 * spring) / Y;
		const a2 = (360 * summer) / Y;
		const sk = (a1 + a2 - 180) / 2;
		const sh = (a1 - a2) / 2;
		const h = sin(sh);
		const k = sin(sk);
		const arcs = seasonArcs(h, k);

		return {
			h,
			k,
			e: Math.hypot(h, k),
			apogee: norm360(atan2d(k, h)),
			arcs,
			lengths: arcs.map(arc => (arc * Y) / 360),
			meanLongitudeAtEquinox: norm360(-sk)
		};
	}

	/* ======================================================================
	   5. EXPORT
	   ====================================================================== */

	return {
		HIPPARCHUS_SEASONS,
		PTOLEMY,
		FIT_2026,
		equationOfCentre,
		equationOfCentreFirstOrder,
		greatestEquation,
		distance,
		make,
		state,
		seasonArcs,
		seasonLengths,
		fitSeasons
	};
})();
