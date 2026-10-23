// @ts-check
/* ==========================================================================
   PREDICTING THE SKY - MODEL: THE EQUATION OF TIME (models/equation-of-time.js)
   The model of page 2.2: the difference between the time a sundial
   shows (apparent solar time, the hour angle of the real Sun) and the
   time a clock shows (mean solar time, the hour angle of the mean Sun of
   page 1.3, whose right ascension is the mean longitude lambdaBar),
	   E = alpha_m - alpha = lambdaBar - alpha        (degrees; 1° = 4 min)
	     = (lambdaBar - lambda) + (lambda - alpha)
	     = -q + (lambda - alpha),
   the sum of two parts: the equation of centre q of the solar model
   (models/solar-eccentric.js, page 2.1), and the reduction to the
   equator lambda - alpha, which the obliquity causes (models/frames.js,
   page 1.2). E is positive when the sundial is ahead of the clock
   (Meeus ch. 28, Ephem.equationOfTime), and the real Sun crosses the
   meridian at 12 h - E local mean time.
   Needs common.js, time.js, ephemeris.js (mean obliquity),
   models/frames.js, models/mean-sun.js and models/solar-eccentric.js.
   Touches no DOM, so it can be loaded in Node.

   This model predicts a time, not a longitude, so it exports plain
   functions instead of make() (see README.md).

   The reduction as an eccentric (page 2.2, section 2)
	 From tan alpha = cos eps tan lambda,
		 tan(lambda - alpha) = e_eps sin 2 lambda / (1 + e_eps cos 2 lambda),
		 e_eps = tan^2(eps / 2) = (1 - cos eps) / (1 + cos eps),
	 the form of the equation of centre with e -> e_eps and M -> 2 lambda:
		 alpha - lambda = q(2 lambda, e_eps)   (SolarEccentric.equationOfCentre),
	 so to first order lambda - alpha = e_eps sin 2 lambda, and its
	 greatest value is asin e_eps, at 2 lambda = 90° + asin e_eps, where
	 d alpha / d lambda = 1. To first order in e and e_eps (radians),
		 E = e sin M + e_eps sin 2 lambdaBar.

   TABLE OF CONTENTS
	 1. Constants
	 2. The reduction to the equator, as an eccentric
	 3. The two parts and their sum
	 4. The Sun at mean noon, and the real noon
	 5. Export
   ========================================================================== */

const EquationOfTime = (function () {
	/* ======================================================================
	   1. CONSTANTS
	   ====================================================================== */

	/* The sky turns 360° in 24 h of mean solar time: 4 minutes a degree. */
	const MINUTES_PER_DEGREE = 4;

	/* ======================================================================
	   2. THE REDUCTION TO THE EQUATOR, AS AN ECCENTRIC
	   ====================================================================== */

	/* The "eccentricity" of the reduction, e_eps = tan^2(eps / 2). */
	function reductionEccentricity(eps) {
		const t = tan(eps / 2);

		return t * t;
	}

	/* alpha - lambda (deg) for a point of the ecliptic at longitude lon:
	   the equation of centre for the argument 2 lon and e_eps. Equal to
	   Frames.reduction(lon, eps). */
	function reduction(lon, eps) {
		return SolarEccentric.equationOfCentre(2 * lon, reductionEccentricity(eps));
	}

	/* The greatest reduction |alpha - lambda| = asin e_eps (deg), reached
	   at lon = 45° + asin(e_eps) / 2 (and 135°, 225°, 315° on the other
	   side of each solstice and equinox), where d alpha / d lambda = 1,
	   i.e. sin^2 lon = 1 / (1 + cos eps). */
	function greatestReduction(eps) {
		const value = asin(reductionEccentricity(eps));

		return { value: value, lon: 45 + value / 2 };
	}

	/* d alpha / d lambda = cos eps / cos^2 delta at longitude lon. */
	function reductionRate(lon, eps) {
		const sinDec = sin(eps) * sin(lon);

		return cos(eps) / (1 - sinDec * sinDec);
	}

	/* ======================================================================
	   3. THE TWO PARTS AND THEIR SUM
	   A solar model is a parameter set of SolarEccentric (e = 0 is the
	   uniform Sun of page 1.3). Times in minutes, angles in degrees.
	   ====================================================================== */

	/* The parts for a mean longitude L (deg), the eccentricity e, the
	   apogee and the obliquity eps: { meanLongitude, M, q, lambda, alpha,
	   eccentricity (= -q), obliquity (= lambda - alpha), total (= E) },
	   the last three in minutes of time. */
	function partsAt(L, e, apogee, eps) {
		const M = norm360(L - apogee);
		const q = SolarEccentric.equationOfCentre(M, e);
		const lambda = norm360(L + q);
		const toAlpha = reduction(lambda, eps);

		return {
			meanLongitude: norm360(L),
			M: M,
			q: q,
			lambda: lambda,
			alpha: norm360(lambda + toAlpha),
			eccentricity: -q * MINUTES_PER_DEGREE,
			obliquity: -toAlpha * MINUTES_PER_DEGREE,
			total: (-q - toAlpha) * MINUTES_PER_DEGREE
		};
	}

	/* The parts at JD(TT) for a solar model, with the obliquity eps (deg;
	   by default the mean obliquity of date). */
	function parts(sun, jdTT, eps = Ephem.meanObliquity(jdTT)) {
		return partsAt(MeanSun.meanLongitude(sun, jdTT), sun.e, sun.apogee, eps);
	}

	/* E (minutes of time) at JD(TT) for a solar model. */
	function equation(sun, jdTT, eps = Ephem.meanObliquity(jdTT)) {
		return parts(sun, jdTT, eps).total;
	}

	/* The first-order E (minutes): (e sin M + e_eps sin 2 L) in radians. */
	function firstOrder(L, e, apogee, eps) {
		const radians = e * sin(L - apogee) + reductionEccentricity(eps) * sin(2 * L);

		return radians * R2D * MINUTES_PER_DEGREE;
	}

	/* ======================================================================
	   4. THE SUN AT MEAN NOON, AND THE REAL NOON
	   At mean noon the mean Sun is on the meridian (H_m = 0), so the real
	   Sun's hour angle is H = H_m + alpha_m - alpha = E (as an angle,
	   E / 4 degrees, positive to the west). Drawn through a year, with its
	   declination, it is the analemma.
	   ====================================================================== */

	/* The Sun at mean noon on the meridian of longitude lon (east), on the
	   date whose 0 h UT is jd0: { jdUT, H (deg, west positive), dec (deg),
	   E (minutes) }. */
	function atMeanNoon(sun, jd0, lon = 0) {
		const jdUT = jd0 + 0.5 - lon / 360;
		const jdTT = Time.ttFromUt(jdUT);
		const eps = Ephem.meanObliquity(jdTT);
		const p = parts(sun, jdTT, eps);

		return {
			jdUT: jdUT,
			H: p.total / MINUTES_PER_DEGREE,
			dec: Frames.eclipticPoint(p.lambda, eps).dec,
			E: p.total
		};
	}

	/* JD(UT) of the model Sun's meridian crossing (the real noon of the
	   model) at longitude lon, on the date whose 0 h UT is jd0: mean noon
	   minus E, with E taken again at that moment. */
	function apparentNoon(sun, jd0, lon = 0) {
		const meanNoon = jd0 + 0.5 - lon / 360;
		let noon = meanNoon;

		for (let i = 0; i < 2; i++) {
			noon = meanNoon - equation(sun, Time.ttFromUt(noon)) / 1440;
		}

		return noon;
	}

	/* ======================================================================
	   5. EXPORT
	   ====================================================================== */

	return {
		MINUTES_PER_DEGREE,
		reductionEccentricity,
		reduction,
		greatestReduction,
		reductionRate,
		partsAt,
		parts,
		equation,
		firstOrder,
		atMeanNoon,
		apparentNoon
	};
})();
