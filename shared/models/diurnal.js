// @ts-check
/* ==========================================================================
   PREDICTING THE SKY - MODEL: THE TURNING SKY (models/diurnal.js)
   The model of page 1.1: the sky is a rigid celestial sphere turning
   uniformly about the polar axis, seen by an observer at latitude phi.
   Needs common.js and time.js. Touches no DOM, so it can be loaded in Node.

   This model predicts altitudes and rising times, not a longitude, so it
   exports plain functions instead of make() (see README.md).

   Frames (page 1.1, section 2)
	 equatorial: x towards right ascension 0, z towards the north pole P
	 sky:        x towards the point M where the equator crosses the
				 meridian above the horizon, y east, z towards P; a star at
				 hour angle H is (cos d cos H, -cos d sin H, sin d)
	 horizon:    x towards the south point, y east, z towards the zenith
	 sky -> horizon:        R_y(phi - 90°)
	 equatorial -> horizon: R_y(phi - 90°) R_z(-theta), where theta is
				 the angle the sky has turned (the local sidereal time,
				 page 1.3) and H = theta - alpha.

   TABLE OF CONTENTS
	 1. Rotation rate
	 2. Frames
	 3. Altitude, culminations, rising
	 4. Export
   ========================================================================== */

const Diurnal = (function () {
	/* ======================================================================
	   1. ROTATION RATE
	   The sky turns 360.98564736629° per day of clock time (UT), the rate
	   of Greenwich sidereal time in Meeus 12.4 (time.js): one turn in
	   23 h 56 min 04.09 s.
	   ====================================================================== */

	const DEGREES_PER_DAY = Time.SIDEREAL_RATE;
	const DEGREES_PER_HOUR = DEGREES_PER_DAY / 24;
	const TURN_HOURS = 360 / DEGREES_PER_HOUR;

	/* ======================================================================
	   2. FRAMES
	   ====================================================================== */

	/* Sky frame -> horizon frame: tilt about the east-west axis. */
	function skyToHorizon(phi) {
		return rotY(phi - 90);
	}

	/* Equatorial frame -> horizon frame, after the sky has turned by theta. */
	function equatorialToHorizon(phi, theta) {
		return matMul(rotY(phi - 90), rotZ(-theta));
	}

	/* A star of declination dec at hour angle H, in the sky frame. */
	function starInSky(dec, H) {
		return [cos(dec) * cos(H), -cos(dec) * sin(H), sin(dec)];
	}

	/* The zenith of latitude phi, in the sky frame. */
	function zenithInSky(phi) {
		return [cos(phi), 0, sin(phi)];
	}

	/* Hour angle (deg, in [-180, 180)) of right ascension ra when the sky
	   has turned by theta. */
	function hourAngle(theta, ra) {
		return norm180(theta - ra);
	}

	/* ======================================================================
	   3. ALTITUDE, CULMINATIONS, RISING
	   All angles in degrees; h0 is the altitude taken as "the horizon"
	   (0 for the geometric horizon).
	   ====================================================================== */

	/* sin a = sin phi sin dec + cos phi cos dec cos H. */
	function altitude(dec, H, phi) {
		return asin(sin(phi) * sin(dec) + cos(phi) * cos(dec) * cos(H));
	}

	/* Highest altitude, at H = 0: 90° - |phi - dec|. */
	function upperCulmination(dec, phi) {
		return 90 - Math.abs(phi - dec);
	}

	/* Lowest altitude, at H = 180°: |phi + dec| - 90°. */
	function lowerCulmination(dec, phi) {
		return Math.abs(phi + dec) - 90;
	}

	/* 'circumpolar' (never sets), 'never' (never rises) or 'rises'. */
	function classify(dec, phi, h0 = 0) {
		if (lowerCulmination(dec, phi) > h0) {
			return 'circumpolar';
		}

		if (upperCulmination(dec, phi) < h0) {
			return 'never';
		}

		return 'rises';
	}

	/* Hour angle of setting H0 in [0, 180]: cos H0 = (sin h0 - sin phi sin dec)
	   / (cos phi cos dec). 180 for a star that never sets, 0 for one that
	   never rises; the star is above h0 for |H| < H0. */
	function risingHourAngle(dec, phi, h0 = 0) {
		const denominator = cos(phi) * cos(dec);

		if (Math.abs(denominator) < 1e-12) {
			return classify(dec, phi, h0) === 'circumpolar' ? 180 : 0; // at a pole
		}

		const c = (sin(h0) - sin(phi) * sin(dec)) / denominator;

		if (c <= -1) {
			return 180;
		}

		if (c >= 1) {
			return 0;
		}

		return acos(c);
	}

	/* Fraction of a turn spent above h0: H0 / 180°. */
	function fractionAbove(dec, phi, h0 = 0) {
		return risingHourAngle(dec, phi, h0) / 180;
	}

	/* ======================================================================
	   4. EXPORT
	   ====================================================================== */

	return {
		DEGREES_PER_DAY,
		DEGREES_PER_HOUR,
		TURN_HOURS,
		skyToHorizon,
		equatorialToHorizon,
		starInSky,
		zenithInSky,
		hourAngle,
		altitude,
		upperCulmination,
		lowerCulmination,
		classify,
		risingHourAngle,
		fractionAbove
	};
})();
