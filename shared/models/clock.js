// @ts-check
/* ==========================================================================
   PREDICTING THE SKY - MODEL: THE CLOCKS (models/clock.js)
   The model of page 1.3: the sky turns uniformly with respect to mean
   solar time, by 360° plus the mean Sun's daily motion n every day, so
   that the turn of the sky (the sidereal time) can be read off a clock.
   Needs common.js, time.js, ephemeris.js (mean obliquity), models/diurnal.js,
   models/frames.js and models/mean-sun.js. Touches no DOM, so it can be
   loaded in Node.

   This model predicts times (transits, sunrise, sunset), not a longitude,
   so it exports plain functions instead of make() (see README.md).

   Conventions
	 - Times are Julian Dates in Universal Time, JD(UT); "jd0" is 0h UT of
	   a calendar date.
	 - lon is the observer's geographic longitude, positive east (written
	   ell on the site). Meeus counts it positive west.
	 - theta is the local sidereal time (deg): the angle the sky has turned
	   since the vernal point crossed the meridian (pages 1.1, 1.2), and
	   H = theta - alpha.

   The clock (page 1.3, section 2)
	 Mean solar time is the hour angle of the mean Sun, a point moving
	 along the equator with right ascension equal to the mean longitude,
	 alpha_m = L0 + n d, plus 12 h. With d = JD(UT) - 2451545.0,
		 theta_G = H_m + alpha_m = 280.46061837° + 360.98564736629° d,
	 the linear part of Meeus 12.4: L0 = 280.46061837° and n =
	 0.98564736629° a day, the values fixed by convention for UT.
	 The Sun's geometric mean longitude of models/mean-sun.js (Meeus 25.2)
	 is 21" (1.4 s) larger at J2000.0: 20.5" is the aberration of light (the
	 clock's mean Sun follows the Sun as seen), 0.5" the difference between
	 the two fits. The site neglects it: mean noon is 12:00 local mean time.

   TABLE OF CONTENTS
	 1. Constants
	 2. Sidereal time and hour angle
	 3. Local mean time
	 4. Transits of a star
	 5. The model Sun: noon, sunrise, sunset, length of the day
	 6. Export
   ========================================================================== */

const Clock = (function () {
	/* ======================================================================
	   1. CONSTANTS
	   ====================================================================== */

	/* Greenwich mean sidereal time at J2000.0 (deg) and its rate per day
	   of UT, Meeus 12.4 (linear part). The rate is 360° + n, with n the
	   mean Sun's daily motion (models/mean-sun.js). */
	const THETA0 = 280.46061837;
	const RATE = 360.98564736629;

	/* One turn of the sky (a sidereal day) in hours of mean solar time:
	   23 h 56 min 04.09 s. */
	const SIDEREAL_DAY_HOURS = (24 * 360) / RATE;

	/* The Sun's hour angle grows 15° per hour of mean solar time. */
	const SUN_DEGREES_PER_HOUR = 15;

	/* Sunrise and sunset: the Sun's upper limb on the seen horizon. Its
	   centre is then 34' (refraction, page 1.1) + 16' (its radius) = 50'
	   below the true horizon (Meeus ch. 15). */
	const SUN_HORIZON = -50 / 60;

	/* The model Sun's longitude. */
	const meanLongitude = MeanSun.make(MeanSun.MODERN);

	/* ======================================================================
	   2. SIDEREAL TIME AND HOUR ANGLE
	   ====================================================================== */

	/* Greenwich mean sidereal time (deg, [0, 360)) at JD(UT): the linear
	   clock. It differs from the full Meeus 12.4 (Time.gmst) by a few
	   milliseconds of time in this century. */
	function gmst(jdUT) {
		return norm360(THETA0 + RATE * (jdUT - Time.J2000));
	}

	/* Local sidereal time theta (deg) at longitude lon (east). */
	function lst(jdUT, lon) {
		return norm360(gmst(jdUT) + lon);
	}

	/* Hour angle H = theta - alpha (deg, in [-180, 180)). */
	function hourAngle(jdUT, lon, ra) {
		return norm180(lst(jdUT, lon) - ra);
	}

	/* ======================================================================
	   3. LOCAL MEAN TIME
	   Local mean time = UT + lon / 15° (hours): the mean solar time of the
	   observer's own meridian.
	   ====================================================================== */

	/* Local mean time (hours, [0, 24)) at JD(UT). */
	function localMeanTime(jdUT, lon) {
		const ut = (jdUT + 0.5 - Math.floor(jdUT + 0.5)) * 24;

		return (((ut + lon / 15) % 24) + 24) % 24;
	}

	/* JD(UT) of a local mean time (hours) on the date whose 0h UT is jd0. */
	function fromLocalMeanTime(jd0, hours, lon) {
		return jd0 + (hours - lon / 15) / 24;
	}

	/* ======================================================================
	   4. TRANSITS OF A STAR
	   A star crosses the meridian when theta = alpha. After 0h UT the sky
	   needs (alpha - lon - theta_G0) mod 360° more, at RATE per day.
	   ====================================================================== */

	/* JD(UT) of every upper transit of right ascension ra within the UT
	   day [jd0, jd0 + 1). Usually one; on one day a year, two. */
	function transits(ra, jd0, lon) {
		const first = norm360(ra - lon - gmst(jd0)) / RATE;
		const turn = 360 / RATE;
		const list = [];

		for (let t = first; t < 1; t += turn) {
			list.push(jd0 + t);
		}

		return list;
	}

	/* JD(UT) of the transits within any window [start, start + length),
	   in days, e.g. from one local noon to the next. */
	function transitsBetween(ra, start, length, lon) {
		const first = norm360(ra - lon - gmst(start)) / RATE;
		const turn = 360 / RATE;
		const list = [];

		for (let t = first; t < length; t += turn) {
			list.push(start + t);
		}

		return list;
	}

	/* ======================================================================
	   5. THE MODEL SUN: NOON, SUNRISE, SUNSET, LENGTH OF THE DAY
	   The model Sun moves uniformly along the ecliptic, lambda = lambda_bar,
	   so sin delta = sin eps sin lambda_bar (page 1.2), with the mean
	   obliquity of date. It crosses the meridian at mean noon, 12:00 local
	   mean time, and its hour angle grows 15° per hour, so it rises and
	   sets H0 / 15° hours before and after noon (page 1.1).
	   ====================================================================== */

	/* The model Sun's declination (deg) at JD(UT). */
	function sunDeclination(jdUT) {
		const jdTT = Time.ttFromUt(jdUT);

		return Frames.eclipticPoint(meanLongitude(jdTT), Ephem.meanObliquity(jdTT)).dec;
	}

	/* The model Sun's day on the date whose 0h UT is jd0, at latitude phi
	   and longitude lon: { noon, rise, set (JD(UT), NaN when the Sun does
	   not rise or set), hours (time above h0), H0 (deg), dec (deg), kind:
	   'rises' | 'polar day' | 'polar night' }. */
	function sunDay(jd0, phi, lon, h0 = SUN_HORIZON) {
		const noon = fromLocalMeanTime(jd0, 12, lon);
		const dec = sunDeclination(noon);
		const H0 = Diurnal.risingHourAngle(dec, phi, h0);
		const kind = {
			circumpolar: 'polar day',
			never: 'polar night',
			rises: 'rises'
		}[Diurnal.classify(dec, phi, h0)];
		const halfDay = H0 / SUN_DEGREES_PER_HOUR / 24;
		const sets = kind === 'rises';

		return {
			noon: noon,
			rise: sets ? noon - halfDay : NaN,
			set: sets ? noon + halfDay : NaN,
			hours: (2 * H0) / SUN_DEGREES_PER_HOUR,
			H0: H0,
			dec: dec,
			kind: kind
		};
	}

	/* ======================================================================
	   6. EXPORT
	   ====================================================================== */

	return {
		THETA0,
		RATE,
		SIDEREAL_DAY_HOURS,
		SUN_DEGREES_PER_HOUR,
		SUN_HORIZON,
		meanLongitude,
		gmst,
		lst,
		hourAngle,
		localMeanTime,
		fromLocalMeanTime,
		transits,
		transitsBetween,
		sunDeclination,
		sunDay
	};
})();
