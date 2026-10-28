// @ts-check
/* ==========================================================================
   PREDICTING THE SKY - MODEL: PTOLEMY'S CRANK (models/lunar-crank.js)
   The model of page 3.2, the Moon's second anomaly (Almagest V 2-7). It
   keeps the epicycle of page 3.1 (models/lunar-epicycle.js) and carries
   its centre K on an eccentric whose centre C turns westward about the
   Earth O, so that K is farthest from the Earth at mean new and full
   Moon and nearest at the mean quarters.

   Units: OA = 1, the greatest distance of K (Ptolemy's 60). With the
   mean elongation D = lambdaBar - lambdaBarSun:
	 C = c u(lambdaBar - 2D)          the centre of the eccentric,
									  radius 1 - c, apogee A at
									  lambdaBar - 2D;
	 K = rho u(lambdaBar),            seen from O at the mean longitude,
	 rho = c cos 2D + sqrt((1 - c)^2 - c^2 sin^2 2D);
	 N = -C                           the point the epicycle's mean
									  apogee is directed from (V 5);
	 L = K + e u(phi - M)             the Moon, M counted westward from
									  the mean apogee, the direction
									  phi of K seen from N (or from O,
									  without the direction).
   So rho = 1 at mean syzygy and 1 - 2c at the mean quarters, and the
   greatest equation grows from asin e to asin(e / (1 - 2c)).

   make(parameters) returns jd => longitude (JD(TT) in, degrees out), as
   ErrorCurve.addModel and ErrorCurve.addGhost expect (README.md).
   Needs common.js, time.js, models/mean-sun.js. Touches no DOM.

   TABLE OF CONTENTS
	 1. Parameter sets
	 2. The model
	 3. Export
   ========================================================================== */

const LunarCrank = (function () {
	/* ======================================================================
	   1. PARAMETER SETS
	   The parameters of models/lunar-epicycle.js (L0, n, M0, nM, epoch,
	   clock, e = r / OA), and: c, the distance OC as a fraction of OA;
	   sun, the parameter set of the mean Sun (models/mean-sun.js);
	   direction (default true): the epicycle's mean apogee is directed
	   from N (V 5); false, from the Earth O.
	   ====================================================================== */

	/* Ptolemy (Almagest V 4): where OA = 60, the radius of the eccentric is
	   49;41 and OC = 10;19; the epicycle 5;15 (IV 9); his mean motions and
	   epoch (IV 3, IV 7, IV 8) and his mean Sun (III 2, III 7). */
	const PTOLEMY = {
		L0: 30 + 11 + 22 / 60,
		n: polynomial(1 / 60, [13, 10, 34, 58, 33, 30, 30]),
		M0: 268 + 49 / 60,
		nM: polynomial(1 / 60, [13, 3, 53, 56, 17, 51, 59]),
		epoch: MeanSun.PTOLEMY.epoch,
		clock: 'ut',
		e: 5.25 / 60,
		c: (10 + 19 / 60) / 60,
		sun: MeanSun.PTOLEMY
	};

	/* ======================================================================
	   2. THE MODEL
	   ====================================================================== */

	/* The distance OK (units of OA) at the double elongation 2D (deg). */
	function centreDistance(c, twoD) {
		const s = c * sin(twoD);

		return c * cos(twoD) + Math.sqrt((1 - c) * (1 - c) - s * s);
	}

	/* One moment of the model, in the frame turned to the mean longitude
	   (x towards lambdaBar): the points C, K, N and the Moon L, the shift
	   of the mean apogee (deg, the angle from OK to NK), the equation q
	   and the distance OL. 'M' is the anomaly from the mean apogee. */
	function geometry(e, c, twoD, M, direction = true) {
		const rho = centreDistance(c, twoD);
		const C = [c * cos(-twoD), c * sin(-twoD)];
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

	/* The state of the model at JD(TT): { meanLongitude, meanSun,
	   elongation (D), M, q, lambda, distance (units of OA), rho, shift }. */
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
	function make(parameters = PTOLEMY) {
		return jd => state(parameters, jd).lambda;
	}

	/* ======================================================================
	   3. EXPORT
	   ====================================================================== */

	return {
		PTOLEMY,
		centreDistance,
		geometry,
		state,
		make
	};
})();
