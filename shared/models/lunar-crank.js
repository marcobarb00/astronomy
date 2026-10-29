// @ts-check
/* ==========================================================================
   PREDICTING THE SKY - MODEL: PTOLEMY'S CRANK (models/lunar-crank.js)
   The model of page 3.2, the Moon's second anomaly (Almagest V 2-7). It
   keeps the epicycle of page 3.1 (models/lunar-epicycle.js) and carries
   its centre K on an eccentric whose centre C turns westward about the
   Earth O, so that K is farthest from the Earth at the mean new and full
   Moon and nearest at the mean quarters.

   Units: OA = 1, the greatest distance of K (Ptolemy's 60). With the
   mean elongation D = lambdaBar - lambdaBarSun:
	 C = c u(lambdaBar - 2D)      the centre of the eccentric, radius
								  1 - c, its apogee A at lambdaBar - 2D;
	 K = rho u(lambdaBar)         seen from O at the mean longitude, with
	 rho = c cos 2D + sqrt((1 - c)^2 - c^2 sin^2 2D)  (triangle O C K);
	 N = -C                       the point the epicycle's mean apogee is
								  directed from (Almagest V 5);
	 L = K + e u(phi - M)         the Moon, M counted westward from the
								  mean apogee, the direction phi of K
								  seen from N (or from O, without the
								  direction).
   So rho = 1 at mean syzygy and 1 - 2c at the mean quarters, and the
   greatest equation grows from asin e to asin(e / (1 - 2c)).

   make(parameters) returns jd => longitude (JD(TT) in, degrees out), as
   ErrorCurve.addModel and ErrorCurve.addGhost expect (README.md).
   Needs common.js, time.js, models/mean-sun.js, models/solar-eccentric.js
   and models/lunar-epicycle.js. Touches no DOM, so it can be loaded in
   Node.

   TABLE OF CONTENTS
	 1. Parameter sets
	 2. The geometry of one moment
	 3. The model
	 4. Export
   ========================================================================== */

const LunarCrank = (function () {
	/* ======================================================================
	   1. PARAMETER SETS
	   The parameters of models/lunar-epicycle.js (L0, n, M0, nM, epoch,
	   clock, e = r / OA), and: c, the distance OC as a fraction of OA;
	   sun, the parameter set of the mean Sun (models/mean-sun.js), for
	   the elongation; direction (default true): the epicycle's mean apogee
	   is directed from N (Almagest V 5); false, from the Earth O.
	   ====================================================================== */

	/* Ptolemy: where OA = 60, the radius of the eccentric is 49;41 and
	   OC = 10;19 (Almagest V 4); the epicycle 5;15 (IV 9); his mean
	   motions and epoch (IV 3, IV 7, IV 8) and his mean Sun (III 2, III 7).
	   Units of days of UT, as his days were turns of the Earth. */
	const PTOLEMY = Object.assign({}, LunarEpicycle.PTOLEMY, {
		c: (10 + 19 / 60) / 60,
		sun: MeanSun.PTOLEMY
	});

	/* Our fit (page 3.2, section 3): the epicycle of page 3.1, fitted to
	   three eclipses (LunarEpicycle.FIT_2026), with the modern mean Sun,
	   and c fitted by least squares to the 25 quarter Moons of 2026
	   (tools/numbers/3.2-evection.js). */
	const FIT_2026 = Object.assign({}, LunarEpicycle.FIT_2026, {
		c: 0.176153,
		sun: MeanSun.MODERN
	});

	/* ======================================================================
	   2. THE GEOMETRY OF ONE MOMENT
	   ====================================================================== */

	/* The distance OK (units of OA) at the double elongation 2D (deg). */
	function centreDistance(c, twoD) {
		const s = c * sin(twoD);

		return c * cos(twoD) + Math.sqrt((1 - c) * (1 - c) - s * s);
	}

	/* One moment of the model, in the frame turned to the mean longitude
	   (x towards lambdaBar), in units of OA: the points C, K, N and the
	   Moon L; the shift of the mean apogee (deg, the direction of K seen
	   from N, which is 0 for the direction from O); the equation q (deg)
	   and the distance OL. 'M' is the anomaly from the mean apogee. */
	function geometry(e, c, twoD, M, direction = true) {
		const rho = centreDistance(c, twoD);
		const C = [c * cos(twoD), -c * sin(twoD)];
		const K = [rho, 0];
		const N = [-C[0], -C[1]];
		const shift = direction ? atan2d(K[1] - N[1], K[0] - N[0]) : 0;
		const L = [K[0] + e * cos(shift - M), K[1] + e * sin(shift - M)];

		return {
			rho,
			C,
			K,
			N,
			L,
			shift,
			q: atan2d(L[1], L[0]),
			distance: Math.hypot(L[0], L[1])
		};
	}

	/* ======================================================================
	   3. THE MODEL
	   ====================================================================== */

	/* The state of the model at JD(TT): { meanLongitude, meanSun,
	   elongation (D), M, q, lambda, distance (units of OA), rho (OK),
	   shift } (deg; meanLongitude, meanSun, elongation, M, lambda in
	   [0, 360)). */
	function state(parameters, jd) {
		const t = MeanSun.daysSinceEpoch(parameters, jd);
		const meanLongitude = norm360(parameters.L0 + parameters.n * t);
		const meanSun = norm360(MeanSun.meanLongitude(parameters.sun, jd));
		const elongation = norm360(meanLongitude - meanSun);
		const M = norm360(parameters.M0 + parameters.nM * t);
		const g = geometry(parameters.e, parameters.c, 2 * elongation, M, parameters.direction !== false);

		return {
			meanLongitude,
			meanSun,
			elongation,
			M,
			q: g.q,
			lambda: norm360(meanLongitude + g.q),
			distance: g.distance,
			rho: g.rho,
			shift: g.shift
		};
	}

	/* jd (TT) -> the true longitude of date (deg, [0, 360)). */
	function make(parameters = FIT_2026) {
		return jd => state(parameters, jd).lambda;
	}

	/* jd (TT) -> the distance OL (units of OA). */
	function makeDistance(parameters = FIT_2026) {
		return jd => state(parameters, jd).distance;
	}

	/* The points of one moment for a drawing, with the Earth O at the
	   origin and x towards the vernal point, in units of OA: C, the
	   apogee A of the eccentric, K, N, the Moon L, and the direction
	   (deg) of the epicycle's mean apogee seen from K. */
	function construction(parameters, s) {
		const g = geometry(parameters.e, parameters.c, 2 * s.elongation, s.M, parameters.direction !== false);
		const turn = point => [
			point[0] * cos(s.meanLongitude) - point[1] * sin(s.meanLongitude),
			point[0] * sin(s.meanLongitude) + point[1] * cos(s.meanLongitude)
		];
		const apogee = s.meanLongitude - 2 * s.elongation;

		return {
			C: turn(g.C),
			A: [cos(apogee), sin(apogee)],
			K: turn(g.K),
			N: turn(g.N),
			L: turn(g.L),
			meanApogee: s.meanLongitude + g.shift
		};
	}

	/* ======================================================================
	   4. EXPORT
	   ====================================================================== */

	return {
		PTOLEMY,
		FIT_2026,
		centreDistance,
		geometry,
		state,
		make,
		makeDistance,
		construction
	};
})();
