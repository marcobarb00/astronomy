// @ts-check
/* ==========================================================================
   PREDICTING THE SKY - MODEL: THE MEAN SUN (models/mean-sun.js)
   The Sun moving uniformly along the ecliptic: its longitude grows by the
   same angle n every day,
	   lambda_bar(t) = L0 + n (t - epoch).
   Page 1.3 uses it to define mean solar time and to model the length of
   the day; page 2.1 starts from it (the uniform circle), shows its error,
   and builds the eccentric on it (models/solar-eccentric.js). Needs
   common.js and time.js. Touches no DOM, so it can be loaded in Node.

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
	   epoch: JD; clock (optional): 'tt' (default), the epoch and the days
	   are in Terrestrial Time, or 'ut', they are days of Universal Time,
	   the turning Earth's, as every ancient count of days was.
	   ====================================================================== */

	/* The mean Sun fitted on page 1.3 to the reference Sun as it is seen
	   (tools/numbers/1.3-clocks.js), from documented observations only
	   (STRUCTURE.md §5): the year is the mean of the four years given by
	   lines through the moments of each equinox and solstice of 1926 -
	   2025, n = 360° / Y; L0 is the mean of lambda - n d over the 19 whole
	   years 2007 - 2025, which also cover a turn of the nutation. */
	const MODERN = {
		L0: 280.461355,
		n: 0.98564734824,
		epoch: 2451545.0
	};

	/* The two constants that define Universal Time, fixed by convention
	   since 1984 (J. Meeus, Astronomical Algorithms, 2nd ed., 1998, 12.4,
	   the linear part of Greenwich mean sidereal time): the mean Sun's
	   right ascension at J2000.0 and its daily motion. The reference sky's
	   sidereal time (time.js) uses them; the site's models use the fitted
	   MODERN, and page 1.3 compares the two. */
	const UT_CONVENTION = {
		L0: 280.46061837,
		n: 0.98564736629,
		epoch: 2451545.0
	};

	/* Ptolemy, Almagest III 7: at the epoch, noon at Alexandria on Thoth 1
	   of the first year of Nabonassar (26 February 747 BC; JD 1448638.0
	   is noon at Greenwich, page 1.3), the mean Sun is at Pisces 0;45 =
	   330;45°, and it moves 0;59,8,17,13,12,31° a day (III 2). Ptolemy
	   counts the time "with respect to the local time at Alexandria"
	   (III 8): its meridian is 29.92° east of Greenwich, so its noon came
	   29.92 / 360 of a day earlier in UT. */
	const ALEXANDRIA_LONGITUDE = 29.92;
	const NABONASSAR_NOON_GREENWICH = 1448638.0;

	const PTOLEMY = {
		L0: 330 + 45 / 60,
		n: polynomial(1 / 60, [0, 59, 8, 17, 13, 12, 31]),
		epoch: NABONASSAR_NOON_GREENWICH - ALEXANDRIA_LONGITUDE / 360,
		clock: 'ut'
	};

	/* ======================================================================
	   2. THE MODEL
	   ====================================================================== */

	/* The time since the epoch (days) at JD(TT), counted on the model's
	   own clock: days of UT for a model whose epoch is in UT. */
	function daysSinceEpoch(parameters, jd) {
		const t = parameters.clock === 'ut' ? Time.utFromTt(jd) : jd;

		return t - parameters.epoch;
	}

	/* The mean longitude (deg, not reduced) at JD(TT). */
	function meanLongitude(parameters, jd) {
		return parameters.L0 + parameters.n * daysSinceEpoch(parameters, jd);
	}

	/* jd (TT) -> the mean longitude of date (deg, [0, 360)). */
	function make(parameters = MODERN) {
		return jd => norm360(meanLongitude(parameters, jd));
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
		UT_CONVENTION,
		PTOLEMY,
		daysSinceEpoch,
		meanLongitude,
		make,
		yearLength
	};
})();
