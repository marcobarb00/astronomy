// @ts-check
/* ==========================================================================
   PREDICTING THE SKY - MODEL: KEPLER'S ELLIPSES (models/kepler.js)
   The model of page 4.5. A body moves on an ellipse with the Sun at one
   focus (for the Sun itself, described from the Earth, the Earth at the
   focus), and the line from the focus sweeps equal areas in equal times.

   An orbit, in units of its semi-major axis a, in the frame of its
   apsidal line: the focus at the origin, the center C at (e, 0), x
   towards the aphelion A (the farthest point, at ecliptic longitude
   lambdaA; the apogee for the Sun seen from the Earth), as in
   models/planet-equant.js (section 5). With M the mean anomaly counted
   from the aphelion (STRUCTURE.md §6) and E the eccentric anomaly, the
   angle at the center C from the aphelion of the point P' of the circle
   on the long axis above or below the body,
	   M = E + e sin E                         (Kepler's equation)
	   P = (e + cos E, sqrt(1 - e^2) sin E)    (from the focus)
	   r = 1 + e cos E                         (the distance)
   and the body is seen from the focus at lambdaA + (M + q), q the
   equation of center (negative from the aphelion to the perihelion).
   Fitzpatrick (§ 4.2) counts M and E from the perihelion, so his
   Kepler's equation reads M = E - e sin E.

   A planet seen from the Earth (make): the planet on its ellipse about
   the Sun, the Sun on its ellipse about the Earth (the Earth's ellipse
   about the Sun, described from the Earth), both in the plane of the
   ecliptic: the planet's direction from the Earth is that of
	   r_P u(lambda_P) + R u(lambda_sun),
   where lambda_P is the planet's heliocentric ecliptic longitude and R the
   Earth - Sun distance (au). The planets' inclinations are left out.

   Parameter sets: those of an orbit, { L0 (the mean longitude at the
   epoch, deg), n (deg / day), epoch (JD TT), apogee (lambdaA at the
   epoch, deg), apogeeRate (deg / day), e, a (au) }.

   Needs common.js, time.js, models/mean-sun.js and models/precession.js.
   Touches no DOM, so it can be loaded in Node.

   TABLE OF CONTENTS
	 1. Parameter sets
	 2. Kepler's equation
	 3. One orbit
	 4. The Sun, and a planet seen from the Earth
	 5. The fits: the seasons, the third law, triangulation
	 6. Export
   ========================================================================== */

const Kepler = (function () {
	/* ======================================================================
	   1. PARAMETER SETS
	   Fitted on page 4.5 (tools/numbers/4.5-kepler.js) to the reference of
	   that page (Ephem with { theory: 'vsop87' }), from documented
	   observations only (STRUCTURE.md §5).
	   ====================================================================== */

	/* The precession of page 2.3, per day: Mars' aphelion is fixed among
	   the stars, as the apogee of page 4.2's equant. */
	const PRECESSION_PER_DAY = Precession.MODERN.rate / 365.25;

	/* The Sun's apogee moves 1.751° a century relative to the equinoxes
	   (page 2.3, SolarEccentric.MOVING_2026). */
	const SUN_APOGEE_RATE = 1.751 / 36525;

	/* The Sun's ellipse (the Earth's, described from the Earth): page
	   2.1's method, Hipparchus' two seasons, applied to the spring and the
	   summer of 2026 with Kepler's equation in place of the eccentric, the
	   mean longitude from the moment of the spring equinox, on page 1.3's
	   mean motion; a = 1 au. */
	const SUN_2026 = {
		L0: 280.461044,
		n: MeanSun.MODERN.n,
		epoch: 2451545.0,
		apogee: 102.92153,
		apogeeRate: SUN_APOGEE_RATE,
		e: 0.016655,
		a: 1
	};

	/* Mars: n kept from page 4.1 (oppositions 79 years apart); L0, the
	   aphelion and e from its eight oppositions to the real Sun of
	   2010 - 2025, where its geocentric ecliptic longitude is its
	   heliocentric one; a from the third law and its sidereal period. */
	const MARS_FIT = {
		L0: 355.441625,
		n: 0.524070384,
		epoch: 2451545.0,
		apogee: 156.14578,
		apogeeRate: PRECESSION_PER_DAY,
		e: 0.093409,
		a: 1.523694
	};

	/* ======================================================================
	   2. KEPLER'S EQUATION
	   M = E + e sin E (degrees), with M and E counted from the aphelion.
	   ====================================================================== */

	/* E for M (deg) by Newton's method, from E = M: { E, steps } with
	   every iterate, until a step is smaller than tol (deg). */
	function newton(M, e, tol = 1e-12) {
		const steps = [];
		let E = M;

		for (let i = 0; i < 60; i++) {
			const step = (E + e * R2D * sin(E) - M) / (1 + e * cos(E));

			E -= step;
			steps.push(E);

			if (Math.abs(step) < tol) {
				break;
			}
		}

		return { E, steps };
	}

	/* E for M (deg) by fixed-point iteration, E <- M - e sin E, from
	   E = M: { E, steps }. Each step multiplies the error by about
	   e |cos E|, so it is slow for e near 1. */
	function fixedPoint(M, e, tol = 1e-12) {
		const steps = [];
		let E = M;

		for (let i = 0; i < 10000; i++) {
			const next = M - e * R2D * sin(E);

			steps.push(next);

			if (Math.abs(next - E) < tol) {
				E = next;
				break;
			}

			E = next;
		}

		return { E, steps };
	}

	/* The eccentric anomaly (deg) for M (deg). */
	function eccentricAnomaly(M, e) {
		return newton(M, e).E;
	}

	/* ======================================================================
	   3. ONE ORBIT
	   ====================================================================== */

	/* The point of the ellipse (a = 1) at the mean anomaly M: { M, E, q,
	   point [x, y] from the focus in the frame of the apsidal line,
	   distance }. */
	function atAnomaly(M, e) {
		const E = eccentricAnomaly(M, e);
		const point = [e + cos(E), Math.sqrt(1 - e * e) * sin(E)];

		return {
			M,
			E,
			q: norm180(atan2d(point[1], point[0]) - M),
			point,
			distance: 1 + e * cos(E)
		};
	}

	/* The ecliptic longitude of the aphelion (or apogee) at JD(TT). */
	function apogeeAt(p, jd) {
		return p.apogee + (p.apogeeRate ?? 0) * (jd - p.epoch);
	}

	/* The mean longitude (deg, not reduced) at JD(TT). */
	function meanLongitude(p, jd) {
		return p.L0 + p.n * (jd - p.epoch);
	}

	/* The orbit at JD(TT): { meanLongitude, apogee, M, E, q, longitude
	   (seen from the focus, deg in [0, 360)), distance (au) }. */
	function state(p, jd) {
		const lambdaBar = norm360(meanLongitude(p, jd));
		const apogee = norm360(apogeeAt(p, jd));
		const s = atAnomaly(norm360(lambdaBar - apogee), p.e);

		return {
			meanLongitude: lambdaBar,
			apogee,
			M: s.M,
			E: s.E,
			q: s.q,
			longitude: norm360(lambdaBar + s.q),
			distance: p.a * s.distance
		};
	}

	/* The mean anomaly (deg) at which the body is seen from the focus at
	   the ecliptic longitude lon, for e and the apogee lambdaA: the true
	   anomaly v = lon - lambdaA, then tan(E / 2) = sqrt((1 + e) / (1 - e))
	   tan(v / 2), then Kepler's equation. Not reduced to [0, 360). */
	function meanAnomalyAt(lon, e, apogee) {
		const v = norm180(lon - apogee);
		const E = 2 * R2D * Math.atan(Math.sqrt((1 + e) / (1 - e)) * Math.tan((v * D2R) / 2));

		return E + e * R2D * sin(E);
	}

	/* ======================================================================
	   4. THE SUN, AND A PLANET SEEN FROM THE EARTH
	   ====================================================================== */

	/* The Sun's ellipse as a model: jd -> ecliptic longitude (deg). */
	function makeSun(p = SUN_2026) {
		return jd => state(p, jd).longitude;
	}

	/* A planet seen from the Earth at JD(TT): { lon (deg), dist (au),
	   planet, sun } with the two orbits' states. */
	function geocentric(planet, sun, jd) {
		const P = state(planet, jd);
		const S = state(sun, jd);
		const x = P.distance * cos(P.longitude) + S.distance * cos(S.longitude);
		const y = P.distance * sin(P.longitude) + S.distance * sin(S.longitude);

		return { lon: norm360(atan2d(y, x)), dist: Math.hypot(x, y), planet: P, sun: S };
	}

	/* The planet's model: jd -> geocentric ecliptic longitude (deg). */
	function make(planet = MARS_FIT, sun = SUN_2026) {
		return jd => geocentric(planet, sun, jd).lon;
	}

	/* ======================================================================
	   5. THE FITS
	   ====================================================================== */

	/* Hipparchus' method with the ellipse (page 2.1, Almagest III 4): the
	   lengths (days) of spring and summer, from the Sun at ecliptic
	   longitude 0° to 90° and from 90° to 180°, and the mean motion n
	   (deg / day) give e and the apogee, by Newton's method on the two
	   equations "the mean anomaly covered = n times the days". Returns
	   { e, apogee, steps }. */
	function fitSeasons(spring, summer, n) {
		const residuals = (e, apogee) => {
			const m0 = meanAnomalyAt(0, e, apogee);
			const m1 = meanAnomalyAt(90, e, apogee);
			const m2 = meanAnomalyAt(180, e, apogee);

			return [norm180(m1 - m0) - n * spring, norm180(m2 - m1) - n * summer];
		};
		let e = 0.0167;
		let apogee = 100;
		let steps = 0;

		for (; steps < 30; steps++) {
			const r = residuals(e, apogee);
			const h = 1e-7;
			const de = residuals(e + h, apogee).map((v, i) => (v - r[i]) / h);
			const da = residuals(e, apogee + h).map((v, i) => (v - r[i]) / h);
			const det = de[0] * da[1] - de[1] * da[0];
			const stepE = (-r[0] * da[1] + r[1] * da[0]) / det;
			const stepA = (-de[0] * r[1] + de[1] * r[0]) / det;

			e += stepE;
			apogee += stepA;

			if (Math.abs(stepE) < 1e-12 && Math.abs(stepA) < 1e-10) {
				break;
			}
		}

		return { e, apogee: norm360(apogee), steps };
	}

	/* The third law: the semi-major axis (au) of an orbit of sidereal
	   period P, in the units of the sidereal year Ys (a^3 = (P / Ys)^2). */
	function thirdLaw(P, Ys) {
		return Math.pow(P / Ys, 2 / 3);
	}

	/* The sidereal period (days) of a mean motion n in tropical ecliptic
	   longitude (deg / day), with the precession rate p (deg / day). */
	function siderealPeriod(n, p = PRECESSION_PER_DAY) {
		return 360 / (n - p);
	}

	/* Triangulation (Kepler, Astronomia Nova): the point where the line
	   from the Earth at E1 in the direction lon1 meets the line from the
	   Earth at E2 in the direction lon2 (points [x, y] in au, directions
	   in deg, one frame). Returns { point, angle (between the lines,
	   deg) } or null for parallel lines. */
	function triangulate(E1, lon1, E2, lon2) {
		const u1 = [cos(lon1), sin(lon1)];
		const u2 = [cos(lon2), sin(lon2)];
		const det = -u1[0] * u2[1] + u1[1] * u2[0];

		if (Math.abs(det) < 1e-12) {
			return null;
		}

		const bx = E2[0] - E1[0];
		const by = E2[1] - E1[1];
		const s = (-bx * u2[1] + by * u2[0]) / det;

		return {
			point: [E1[0] + s * u1[0], E1[1] + s * u1[1]],
			angle: Math.abs(norm180(lon1 - lon2))
		};
	}

	/* Mars' path triangulated, as Kepler did (Voelkel ch. 3), from
	   observations: the planet returns to the same point of its path
	   after one sidereal period, so two sightings 'period' days apart,
	   from two places of the Earth, fix that point. options: sun(jd) ->
	   { lon, dist } (the Sun seen from the Earth: its direction, and its
	   distance from the apparent diameter), planet(jd) -> its geocentric
	   ecliptic longitude, start, end (JD: both sightings inside), step
	   (days between first sightings), period (days), precession (deg /
	   day: the second sighting's frame is turned back by it, since the
	   point is fixed among the stars), minAngle (deg: pairs whose lines
	   meet at a smaller angle are left out). Returns the points, in the
	   ecliptic of date at the first sighting, the Sun at the origin:
	   [{ t, t2, x, y, lon, r, angle, earth1, earth2 }]. */
	function triangulatePath(options) {
		const { sun, planet, start, end, step, period, precession, minAngle } = options;
		const earth = (jd, turn) => {
			const s = sun(jd);

			return [-s.dist * cos(s.lon - turn), -s.dist * sin(s.lon - turn)];
		};
		const points = [];

		for (let t = start; t + period < end; t += step) {
			const t2 = t + period;
			const turn = precession * period;
			const earth1 = earth(t, 0);
			const earth2 = earth(t2, turn);
			const result = triangulate(earth1, planet(t), earth2, planet(t2) - turn);

			if (result && result.angle >= minAngle) {
				const [x, y] = result.point;

				points.push({
					t,
					t2,
					x,
					y,
					lon: norm360(atan2d(y, x)),
					r: Math.hypot(x, y),
					angle: result.angle,
					earth1,
					earth2
				});
			}
		}

		return points;
	}

	/* The circle through the two apsides of a triangulated path, the
	   circle Kepler compared his distances with: the line of the apsides
	   from the Sun through the center of the circle nearest the points (an
	   algebraic least-squares fit, x^2 + y^2 + D x + E y + F = 0), the
	   farthest and nearest points on it, and the circle on that diameter.
	   Returns { line (deg), rFar, rNear, center [x, y], radius, along(lon)
	   (the circle's distance from the Sun in the direction lon) }. */
	function apsidalCircle(points) {
		// the normal equations of the algebraic fit, unknowns D, E, F
		const A = [
			[0, 0, 0],
			[0, 0, 0],
			[0, 0, 0]
		];
		const b = [0, 0, 0];

		points.forEach(({ x, y }) => {
			const row = [x, y, 1];
			const rhs = -(x * x + y * y);

			row.forEach((v, i) => {
				row.forEach((w, j) => {
					A[i][j] += v * w;
				});
				b[i] += v * rhs;
			});
		});

		const [D, E] = solve3(A, b);
		const line = norm360(atan2d(-E / 2, -D / 2));
		const rFar = Math.max(...points.map(q => q.r));
		const rNear = Math.min(...points.map(q => q.r));
		const offset = (rFar - rNear) / 2;
		const center = [offset * cos(line), offset * sin(line)];
		const radius = (rFar + rNear) / 2;

		// the distance from the origin to the circle along lon
		const along = lon => {
			const k = cos(lon) * center[0] + sin(lon) * center[1];

			return k + Math.sqrt(k * k - offset * offset + radius * radius);
		};

		return { line, rFar, rNear, center, radius, along };
	}

	/* The solution of a 3 x 3 linear system, by Cramer's rule. */
	function solve3(A, b) {
		const det = m =>
			m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
			m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
			m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
		const whole = det(A);

		return [0, 1, 2].map(k => det(A.map((row, i) => row.map((v, j) => (j === k ? b[i] : v)))) / whole);
	}

	/* ======================================================================
	   6. EXPORT
	   ====================================================================== */

	return {
		PRECESSION_PER_DAY,
		SUN_APOGEE_RATE,
		SUN_2026,
		MARS_FIT,
		newton,
		fixedPoint,
		eccentricAnomaly,
		atAnomaly,
		apogeeAt,
		meanLongitude,
		state,
		meanAnomalyAt,
		makeSun,
		geocentric,
		make,
		fitSeasons,
		thirdLaw,
		siderealPeriod,
		triangulate,
		triangulatePath,
		apsidalCircle
	};
})();
