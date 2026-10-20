/* ==========================================================================
   PREDICTING THE SKY - MODEL: THE MEAN SUN (models/mean-sun.js)
   The Sun moving uniformly along the ecliptic: its longitude grows by the
   same angle n every day,
	   lambda_bar(t) = L0 + n (t - epoch).
   Page 1.3 uses it to define mean solar time and to model the length of
   the day; page 2.1 starts from it (the uniform circle) and shows its
   error. Needs common.js and time.js. Touches no DOM, so it can be loaded
   in Node.

   make(parameters) returns jd => longitude (JD(TT) in, degrees out), as
   ErrorCurve.addModel and ErrorCurve.addGhost expect (README.md).

   TABLE OF CONTENTS
	 1. Parameter sets
	 2. The model
	 3. Export
   ========================================================================== */

const MeanSun = (function () {
	/* ======================================================================
	   1. PARAMETER SETS
	   L0: mean longitude at the epoch (deg); n: daily motion (deg / day);
	   epoch: JD(TT).
	   ====================================================================== */

	/* J. Meeus, Astronomical Algorithms (2nd ed., 1998), 25.2: the linear
	   part of L0 = 280.46646 + 36000.76983 T + 0.0003032 T^2, with T in
	   Julian centuries from J2000.0. The daily motion n = 0.98564736°
	   gives the tropical year 360° / n = 365.24219 days
	   (tools/numbers/1.3-clocks.js). */
	const MODERN = {
		L0: 280.46646,
		n: 36000.76983 / 36525,
		epoch: 2451545.0
	};

	/* ======================================================================
	   2. THE MODEL
	   ====================================================================== */

	/* jd (TT) -> the mean longitude of date (deg, [0, 360)). */
	function make(parameters = MODERN) {
		const { L0, n, epoch } = parameters;

		return jd => norm360(L0 + n * (jd - epoch));
	}

	/* The length of the year (days) implied by a daily motion n. */
	function yearLength(parameters = MODERN) {
		return 360 / parameters.n;
	}

	/* ======================================================================
	   3. EXPORT
	   ====================================================================== */

	return {
		MODERN,
		make,
		yearLength
	};
})();
