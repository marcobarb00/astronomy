/* ==========================================================================
   PREDICTING THE SKY - MODEL: FRAMES (models/frames.js)
   The model of page 1.2: three frames on the sphere of directions, each a
   fundamental great circle, its pole and an origin on it; changing frames
   is a rotation. Needs common.js and models/diurnal.js. Touches no DOM,
   so it can be loaded in Node.

   This model does not predict a longitude, so it exports plain functions
   instead of make() (see README.md).

   Frames (right-handed, unit vectors)
	 equatorial: x towards the vernal point (the equinox), z towards the
				 north celestial pole P; coordinates (alpha, delta)
	 ecliptic:   x towards the vernal point, z towards the north ecliptic
				 pole K; coordinates (lambda, beta)
	 horizon:    x towards the south point, y east, z towards the zenith
				 (page 1.1); coordinates (A, a), the azimuth A counted from
				 north through east, like a compass bearing, so a direction
				 is (-cos a cos A, cos a sin A, sin a). Meeus (ch. 13)
				 counts from the south: his azimuth is A - 180°.
	 ecliptic -> equatorial:  R_x(eps)
	 equatorial -> horizon:   R_y(phi - 90°) R_z(-theta)  (Diurnal), where
				 theta is the angle the sky has turned and H = theta - alpha

   TABLE OF CONTENTS
	 1. Historical values (obliquity, Ptolemy's tables)
	 2. Matrices
	 3. Coordinates and vectors
	 4. The multiplied-out formulas
	 5. Angles between the frames
	 6. Export
   ========================================================================== */

const Frames = (function () {

	/* ======================================================================
	   1. HISTORICAL VALUES (deg): OBLIQUITY, PTOLEMY'S TABLES
	   ====================================================================== */

	/* Ptolemy: the arc between the solstices is 47°42'40", so
	   eps = 23°51'20" (Almagest I 12, I 14). */
	const PTOLEMY_OBLIQUITY = 23 + 51 / 60 + 20 / 3600;

	/* The ratio 11 : 83 of the meridian (Almagest I 12, attributed to
	   Eratosthenes and Hipparchus): 2 eps = 360° x 11 / 83. */
	const RATIO_11_83_OBLIQUITY = 180 * 11 / 83;

	/* Degrees, minutes, seconds -> degrees. */
	const fromDms = (d, m = 0, s = 0) => d + m / 60 + s / 3600;

	/* Ptolemy's table of inclination (Almagest I 15, transl. Toomer): the
	   declination of the ecliptic point at lambda = 1°, 2°, ..., 90°,
	   computed with eps = 23°51'20" by Menelaus' theorem (I 13-14).
	   Transcribed as printed, [degrees, minutes, seconds]. Toomer flags
	   27° and 51° as probable scribal errors (computed 10°34'48" and
	   18°19'07"). */
	const PTOLEMY_DECLINATIONS = [
		[0, 24, 16], [0, 48, 31], [1, 12, 46], [1, 37, 0], [2, 1, 12],
		[2, 25, 22], [2, 49, 30], [3, 13, 35], [3, 37, 37], [4, 1, 38],
		[4, 25, 32], [4, 49, 24], [5, 13, 11], [5, 36, 53], [6, 0, 31],
		[6, 24, 1], [6, 47, 26], [7, 10, 45], [7, 33, 57], [7, 57, 3],
		[8, 20, 0], [8, 42, 50], [9, 5, 32], [9, 28, 5], [9, 50, 29],
		[10, 12, 46], [10, 34, 57], [10, 56, 44], [11, 18, 25], [11, 39, 59],
		[12, 1, 20], [12, 22, 30], [12, 43, 28], [13, 4, 14], [13, 24, 47],
		[13, 45, 6], [14, 5, 11], [14, 25, 2], [14, 44, 39], [15, 4, 4],
		[15, 23, 10], [15, 42, 2], [16, 0, 38], [16, 18, 58], [16, 37, 1],
		[16, 54, 47], [17, 12, 16], [17, 29, 27], [17, 46, 20], [18, 2, 53],
		[18, 19, 15], [18, 35, 5], [18, 50, 41], [19, 5, 57], [19, 20, 56],
		[19, 35, 28], [19, 49, 42], [20, 3, 31], [20, 17, 4], [20, 30, 9],
		[20, 42, 58], [20, 55, 24], [21, 7, 21], [21, 18, 58], [21, 30, 11],
		[21, 41, 0], [21, 51, 25], [22, 1, 25], [22, 11, 1], [22, 20, 11],
		[22, 28, 57], [22, 37, 17], [22, 45, 11], [22, 52, 39], [22, 59, 41],
		[23, 6, 17], [23, 12, 27], [23, 18, 11], [23, 23, 28], [23, 28, 16],
		[23, 32, 30], [23, 36, 35], [23, 40, 2], [23, 43, 2], [23, 45, 34],
		[23, 47, 39], [23, 49, 16], [23, 50, 25], [23, 51, 6], [23, 51, 20]
	].map(([d, m, s]) => fromDms(d, m, s));

	/* Ptolemy's rising-times at sphaera recta (Almagest I 16): the arc of
	   the equator that crosses the meridian with each 10° of the ecliptic,
	   from the equinox, [degrees, minutes]. Their running sums are the
	   right ascensions of lambda = 10°, 20°, ..., 90°. */
	const PTOLEMY_RIGHT_ASCENSION_STEPS = [
		[9, 10], [9, 15], [9, 25], [9, 40], [9, 58], [10, 16], [10, 34], [10, 47], [10, 55]
	].map(([d, m]) => fromDms(d, m));

	/* Ptolemy's declination of an integer longitude 0..360 (deg), using the
	   symmetries of the ecliptic: delta(180 - l) = delta(l), delta(-l) = -delta(l). */
	function ptolemyDeclination(lon) {
		const l = norm360(Math.round(lon));
		const folded = l <= 90 ? l : (l <= 270 ? 180 - l : l - 360);
		const magnitude = folded === 0 ? 0 : PTOLEMY_DECLINATIONS[Math.abs(folded) - 1];

		return Math.sign(folded) * magnitude;
	}

	/* Ptolemy's right ascensions of lambda = 0°, 10°, ..., 90° (deg). */
	function ptolemyRightAscensions() {
		let sum = 0;

		return [0].concat(PTOLEMY_RIGHT_ASCENSION_STEPS.map(step => {
			sum += step;

			return sum;
		}));
	}


	/* ======================================================================
	   2. MATRICES
	   Each takes a vector's components in the first frame to its
	   components in the second. The inverse is the transpose.
	   ====================================================================== */

	/* Ecliptic -> equatorial: a turn by eps about the common x axis. */
	function eclipticToEquatorialMatrix(eps) {
		return rotX(eps);
	}

	/* Equatorial -> ecliptic. */
	function equatorialToEclipticMatrix(eps) {
		return rotX(-eps);
	}

	/* Equatorial -> horizon, after the sky has turned by theta. */
	function equatorialToHorizonMatrix(phi, theta) {
		return Diurnal.equatorialToHorizon(phi, theta);
	}

	/* Ecliptic -> horizon: the two turns in a row. */
	function eclipticToHorizonMatrix(eps, phi, theta) {
		return matMul(equatorialToHorizonMatrix(phi, theta), eclipticToEquatorialMatrix(eps));
	}


	/* ======================================================================
	   3. COORDINATES AND VECTORS
	   Equatorial and ecliptic coordinates are a longitude and a latitude
	   (fromLonLat / toLonLat in common.js). The azimuth runs the other way.
	   ====================================================================== */

	/* Unit vector in the horizon frame of azimuth A and altitude a. */
	function fromHorizontal(A, a) {
		return [-cos(a) * cos(A), cos(a) * sin(A), sin(a)];
	}

	/* { A in [0, 360), a } of a horizon-frame vector. */
	function toHorizontal(v) {
		const p = toLonLat(v);

		return { A: norm360(180 - p.lon), a: p.lat };
	}


	/* ======================================================================
	   4. THE MULTIPLIED-OUT FORMULAS
	   The same transformations as the matrices, written as the spherical
	   trigonometry of page 1.2. All angles in degrees.
	   ====================================================================== */

	/* Ecliptic (lon, lat) -> { ra, dec }:
	   sin d = sin b cos e + cos b sin e sin l,
	   cos d cos a = cos b cos l,
	   cos d sin a = cos b cos e sin l - sin b sin e. */
	function eclipticToEquatorial(lon, lat, eps) {
		const dec = asin(sin(lat) * cos(eps) + cos(lat) * sin(eps) * sin(lon));
		const ra = atan2d(cos(lat) * cos(eps) * sin(lon) - sin(lat) * sin(eps), cos(lat) * cos(lon));

		return { ra: norm360(ra), dec: dec };
	}

	/* Equatorial (ra, dec) -> { lon, lat }: the same with eps -> -eps. */
	function equatorialToEcliptic(ra, dec, eps) {
		const lat = asin(sin(dec) * cos(eps) - cos(dec) * sin(eps) * sin(ra));
		const lon = atan2d(cos(dec) * cos(eps) * sin(ra) + sin(dec) * sin(eps), cos(dec) * cos(ra));

		return { lon: norm360(lon), lat: lat };
	}

	/* Equatorial (ra, dec) -> { A, a, H } for latitude phi, turn theta:
	   sin a = sin phi sin d + cos phi cos d cos H,
	   cos a sin A = -cos d sin H,
	   cos a cos A = cos phi sin d - sin phi cos d cos H. */
	function equatorialToHorizontal(ra, dec, phi, theta) {
		const H = norm180(theta - ra);
		const a = asin(sin(phi) * sin(dec) + cos(phi) * cos(dec) * cos(H));
		const A = atan2d(-cos(dec) * sin(H), cos(phi) * sin(dec) - sin(phi) * cos(dec) * cos(H));

		return { A: norm360(A), a: a, H: H };
	}

	/* Horizontal (A, a) -> { ra, dec, H }: the transpose. */
	function horizontalToEquatorial(A, a, phi, theta) {
		const dec = asin(sin(phi) * sin(a) + cos(phi) * cos(a) * cos(A));
		const H = atan2d(-cos(a) * sin(A), cos(phi) * sin(a) - sin(phi) * cos(a) * cos(A));

		return { ra: norm360(theta - H), dec: dec, H: norm180(H) };
	}

	/* A point of the ecliptic (beta = 0) at longitude lon:
	   sin d = sin e sin l, tan a = cos e tan l (a in the quadrant of l). */
	function eclipticPoint(lon, eps) {
		return eclipticToEquatorial(lon, 0, eps);
	}

	/* The reduction to the equator, alpha - lambda (deg, in (-180, 180]). */
	function reduction(lon, eps) {
		return norm180(eclipticPoint(lon, eps).ra - lon);
	}


	/* ======================================================================
	   5. ANGLES BETWEEN THE FRAMES
	   ====================================================================== */

	/* The ecliptic pole K in equatorial coordinates: (270°, 90° - eps). */
	function eclipticPole(eps) {
		return matApply(eclipticToEquatorialMatrix(eps), [0, 0, 1]);
	}

	/* Altitude (deg) of the north ecliptic pole for latitude phi, turn theta. */
	function eclipticPoleAltitude(eps, phi, theta) {
		return asin(matApply(eclipticToHorizonMatrix(eps, phi, theta), [0, 0, 1])[2]);
	}

	/* Angle (deg, 0 to 90) between the planes of the ecliptic and the
	   horizon: 90° minus the altitude of the ecliptic pole above or below. */
	function eclipticHorizonAngle(eps, phi, theta) {
		return 90 - Math.abs(eclipticPoleAltitude(eps, phi, theta));
	}


	/* ======================================================================
	   6. EXPORT
	   ====================================================================== */

	return {
		PTOLEMY_OBLIQUITY,
		RATIO_11_83_OBLIQUITY,
		PTOLEMY_DECLINATIONS,
		PTOLEMY_RIGHT_ASCENSION_STEPS,
		ptolemyDeclination,
		ptolemyRightAscensions,
		eclipticToEquatorialMatrix,
		equatorialToEclipticMatrix,
		equatorialToHorizonMatrix,
		eclipticToHorizonMatrix,
		fromHorizontal,
		toHorizontal,
		eclipticToEquatorial,
		equatorialToEcliptic,
		equatorialToHorizontal,
		horizontalToEquatorial,
		eclipticPoint,
		reduction,
		eclipticPole,
		eclipticPoleAltitude,
		eclipticHorizonAngle
	};
})();
