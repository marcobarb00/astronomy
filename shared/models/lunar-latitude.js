// @ts-check
/* ==========================================================================
   PREDICTING THE SKY - MODEL: THE MOON'S LATITUDE (models/lunar-latitude.js)
   The model of page 3.3 (Almagest IV 9, V 12): the Moon's circle, with
   the epicycle of page 3.1 on it, is tilted by the inclination i to the
   ecliptic and crosses it at the two nodes, which move westward. The
   argument of latitude F is the Moon's angle along its circle from the
   ascending node:
	   Fbar = F0 + nF t           the mean argument of latitude,
	   F = Fbar + q               the true one, with the equation of
								  anomaly q of page 3.1,
	   sin beta = sin i sin F     the latitude (the right spherical
								  triangle node - Moon - ecliptic).
   The mean longitude of the ascending node is lambdaBar - Fbar: it moves
   westward at nF - n, a turn in 18.6 years.
   Ptolemy counts the argument of latitude from the northern limit, the
   point 90° past the ascending node (Almagest IV 9): his omega = F - 90°.

   make(parameters) returns jd => latitude (JD(TT) in, degrees out); the
   longitude is that of models/lunar-epicycle.js.
   Needs common.js, time.js, models/mean-sun.js, models/solar-eccentric.js
   and models/lunar-epicycle.js. Touches no DOM, so it can be loaded in
   Node.

   TABLE OF CONTENTS
	 1. Parameter sets
	 2. The model
	 3. Export
   ========================================================================== */

const LunarLatitude = (function () {
	/* ======================================================================
	   1. PARAMETER SETS
	   Those of models/lunar-epicycle.js, and: F0, the mean argument of
	   latitude at the epoch (deg, from the ascending node); nF, its daily
	   motion (deg a day); i, the inclination (deg).
	   ====================================================================== */

	/* The linear term of the mean argument of latitude F in J. Meeus,
	   Astronomical Algorithms (2nd ed., 1998), 47.5 (deg a day), and its
	   value at J2000.0. */
	const MEEUS = {
		nF: 483202.0175233 / 36525,
		F0: 93.272095,
		epoch: 2451545.0
	};

	/* Ptolemy: the inclination 5° (Almagest V 12); the daily motion in
	   latitude 13;13,45,39,48,56,37° as corrected in IV 9; at the epoch
	   (Nabonassar, MeanSun.PTOLEMY) the mean Moon 354;15° from the
	   northern limit (IV 9), so F0 = 354;15° + 90°. On his simple Moon of
	   page 3.1. */
	const PTOLEMY = Object.assign({}, LunarEpicycle.PTOLEMY, {
		F0: (354 + 15 / 60 + 90) % 360,
		nF: polynomial(1 / 60, [13, 13, 45, 39, 48, 56, 37]),
		i: 5
	});

	/* Our fit (page 3.3, section 3): the epicycle of page 3.1
	   (LunarEpicycle.FIT_2026) with Meeus' motion in latitude, and i and
	   F0 fitted by least squares to the reference Moon's latitude at the
	   25 new and full Moons of 2026 (tools/numbers/3.3-eclipses.js). */
	const FIT_2026 = Object.assign({}, LunarEpicycle.FIT_2026, {
		F0: 93.266574,
		nF: MEEUS.nF,
		i: 4.999207
	});

	/* ======================================================================
	   2. THE MODEL
	   ====================================================================== */

	/* The latitude (deg) at the argument of latitude F for the
	   inclination i. */
	function latitude(F, i) {
		return asin(sin(i) * sin(F));
	}

	/* The argument of latitude (deg, [0, 180]) at which the latitude is
	   'beta': the inverse of latitude() on the first quadrant. */
	function argumentForLatitude(beta, i) {
		return asin(Math.min(1, sin(beta) / sin(i)));
	}

	/* The state of the model at JD(TT): the state of the epicycle
	   (models/lunar-epicycle.js) and { meanArgument (Fbar), F, beta,
	   node (the mean longitude of the ascending node) } (deg). */
	function state(parameters, jd) {
		const s = LunarEpicycle.state(parameters, jd);
		const t = MeanSun.daysSinceEpoch(parameters, jd);
		const meanArgument = norm360(parameters.F0 + parameters.nF * t);
		const F = norm360(meanArgument + s.q);

		return Object.assign(s, {
			meanArgument,
			F,
			beta: latitude(F, parameters.i),
			node: norm360(s.meanLongitude - meanArgument)
		});
	}

	/* jd (TT) -> the latitude (deg). */
	function make(parameters = FIT_2026) {
		return jd => state(parameters, jd).beta;
	}

	/* The months of a parameter set (days): the draconitic month (the
	   return of the argument of latitude) and the turn of the node. */
	function months(parameters) {
		return {
			draconitic: 360 / parameters.nF,
			node: 360 / (parameters.nF - parameters.n)
		};
	}

	/* ======================================================================
	   3. EXPORT
	   ====================================================================== */

	return {
		MEEUS,
		PTOLEMY,
		FIT_2026,
		latitude,
		argumentForLatitude,
		state,
		make,
		months
	};
})();
