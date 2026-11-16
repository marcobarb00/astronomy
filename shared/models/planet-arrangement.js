// @ts-check
/* ==========================================================================
   PREDICTING THE SKY - MODEL: COPERNICUS' ARRANGEMENT
   (models/planet-arrangement.js)
   The model of page 4.3. Ptolemy's epicycle models of pages 4.1 and 4.2,
   one per planet, each in units of its own deferent, are joined into one
   arrangement: in each model the vector from the Earth O to the planet P
   is the sum of two vectors, and one of them always points to the mean
   Sun,
	   outer planet:  OP = OK + KP,  KP = r u(lambdaBarSun),
	   inner planet:  OP = OK + KP,  OK = u(lambdaBarSun) (deferent 1).
   Adding the two vectors in the other order puts the point of the mean
   Sun, written sun below, at the corner of a parallelogram:
	   O sun = KP (outer) or OK (inner),  sun P = OK (outer) or KP (inner).
   Divided by r (outer) or 1 (inner), which turns no direction, O sun has
   length 1 for every planet: one mean Sun for all five, and the planets
   at the distances a = 1 / r (outer) and a = r (inner) from it, in units
   of the Earth's distance (the astronomical unit, au). Copernicus held
   that point fixed, the Earth going round it in a year
   (De Revolutionibus I 10); every direction from the Earth stays as it
   was.

   Mars is page 4.2's equant (models/planet-equant.js), its deferent
   centred at C, near the mean Sun once moved; Venus is a simple epicycle
   (models/planet-epicycle.js) fitted on page 4.3. The periods about the
   mean Sun follow from the synodic periods S (days) and the year Y:
	   outer: 1 / P = 1 / Y - 1 / S,   inner: 1 / P = 1 / Y + 1 / S.

   Needs common.js, time.js, models/mean-sun.js, models/precession.js,
   models/planet-epicycle.js and models/planet-equant.js. Touches no DOM,
   so it can be loaded in Node.

   make(name) returns jd => longitude (JD(TT) in, degrees out), as
   ErrorCurve.addModel and ErrorCurve.addGhost expect (README.md).

   TABLE OF CONTENTS
	 1. Parameter sets
	 2. Periods and distances
	 3. One moment, in both descriptions
	 4. Copernicus' eccentric with an epicyclet (De Revolutionibus V 4)
	 5. Export
   ========================================================================== */

const PlanetArrangement = (function () {
	/* ======================================================================
	   1. PARAMETER SETS
	   ====================================================================== */

	/* The five planets, from the Sun outwards, and their kind. */
	const PLANETS = ['mercury', 'venus', 'mars', 'jupiter', 'saturn'];
	const KIND = {
		mercury: 'inner',
		venus: 'inner',
		mars: 'outer',
		jupiter: 'outer',
		saturn: 'outer'
	};

	/* The synodic periods S (days) and the distances a (au) fitted on
	   page 4.3 (tools/numbers/4.3-new-centre.js), from documented
	   observations only: S from a straight line through the times of the
	   oppositions (outer) or inferior conjunctions (inner) of 1926 - 2025;
	   a from the greatest elongations of 1986 - 2025 (inner, a = the mean
	   of sin epsilon) and from the mean arc of the loops of 1986 - 2025
	   (Jupiter and Saturn, a = 1 / r with page 4.1's station formula).
	   Mars keeps page 4.2's equant: a = 1 / r. */
	const FIT = {
		mercury: { S: 115.877747, a: 0.379632 },
		venus: { S: 583.922074, a: 0.722563 },
		mars: { S: 779.927956, a: 1 / PlanetEquant.MARS_FIT.r },
		jupiter: { S: 398.876314, a: 5.200876 },
		saturn: { S: 378.102808, a: 9.562304 }
	};

	/* Ptolemy's epicycles (where the deferent is 60, PlanetEpicycle.PTOLEMY,
	   Almagest X - XI) read as distances: a = r (inner), 1 / r (outer). */
	const PTOLEMY = Object.fromEntries(
		PLANETS.map(name => {
			const r = PlanetEpicycle.PTOLEMY[name].r;

			return [name, { a: KIND[name] === 'inner' ? r : 1 / r }];
		})
	);

	/* Copernicus' distances (De Revolutionibus V 9, V 14, V 19, V 21, V 27:
	   the radius of the Earth's circle against the planet's, 10000 parts)
	   and his period relations (V 1): in 'years' sidereal years the Earth
	   passes the planet 'synodic' times, while the planet goes round the
	   Sun 'turns' times. Mercury's radius varies, 3573 to 3953; its mean is
	   3763. */
	const COPERNICUS = {
		mercury: { a: 0.3763, years: 46, synodic: 145, turns: 191 },
		venus: { a: 0.7193, years: 8, synodic: 5, turns: 13 },
		mars: { a: 10000 / 6580, years: 79, synodic: 37, turns: 42 },
		jupiter: { a: 10000 / 1916, years: 71, synodic: 65, turns: 6 },
		saturn: { a: 10000 / 1090, years: 59, synodic: 57, turns: 2 }
	};

	/* Venus as a simple epicycle (models/planet-epicycle.js), fitted on page
	   4.3: its motion in anomaly from the synodic period, its anomaly at
	   J2000 from the 63 inferior conjunctions of 1926 - 2025 (mu = 180°
	   there), its epicycle from the greatest elongations. */
	const VENUS_FIT = {
		kind: 'inner',
		mu0: 261.492905,
		nMu: 360 / FIT.venus.S,
		epoch: 2451545.0,
		r: FIT.venus.a,
		sun: MeanSun.MODERN
	};

	/* ======================================================================
	   2. PERIODS AND DISTANCES
	   ====================================================================== */

	/* The period (days) about the mean Sun of a planet of the given kind
	   whose synodic period is S, for a year Y (days): the tropical year
	   gives the period in ecliptic longitude, the sidereal year the period
	   against the stars. */
	function periodAboutSun(kind, S, Y) {
		const sign = kind === 'inner' ? 1 : -1;

		return 1 / (1 / Y + sign / S);
	}

	/* The synodic period (days) of a planet whose period about the mean
	   Sun is P, for the year Y: the inverse of periodAboutSun. */
	function synodicPeriod(kind, P, Y) {
		return kind === 'inner' ? 1 / (1 / P - 1 / Y) : 1 / (1 / Y - 1 / P);
	}

	/* The distance (au) given by an epicycle of radius r where the
	   deferent is 1. */
	function distanceOf(kind, r) {
		return kind === 'inner' ? r : 1 / r;
	}

	/* The greatest elongation (deg) of an inner planet at the distance a:
	   the line of sight touches its circle, sin epsilon = a. */
	function greatestElongation(a) {
		return asin(a);
	}

	/* The angle psi (deg) at the mean Sun between the Earth and an outer
	   planet at quadrature, where the angle at the Earth is right:
	   cos psi = 1 / a. */
	function quadratureAngle(a) {
		return acos(1 / a);
	}

	/* ======================================================================
	   3. ONE MOMENT, IN BOTH DESCRIPTIONS
	   The planet at JD(TT), drawn as Ptolemy's model (the Earth O at the
	   origin, units of the deferent's radius) and as Copernicus'
	   arrangement (the mean Sun at the origin, units of the Earth's
	   distance, au). Points are [x, y] with x towards the vernal point.
	   ====================================================================== */

	/* The model behind each planet that pages 4.3 and 4.4 draw. */
	const MODELS = {
		mars: PlanetEquant.MARS_FIT,
		venus: VENUS_FIT
	};

	const along = (length, lon) => [length * cos(lon), length * sin(lon)];
	const minus = (a, b) => [a[0] - b[0], a[1] - b[1]];
	const times = (a, k) => [a[0] * k, a[1] * k];

	/* { name, kind, scale (au per unit of the deferent), sun (the mean
	   Sun's ecliptic longitude), lambda (the planet's, seen from O),
	   elongation (lambda less the mean Sun's, deg in [-180, 180)),
	   distance (OP, au), geostatic: { O, K, P, S, C, Q }, heliostatic:
	   { S, O, P, C, Q } } (C and Q, the centre of the deferent and the
	   equant, for Mars only). In the heliostatic drawing the Earth is at
	   -O sun and the planet at P - O sun; an outer planet's deferent, the
	   circle of K about O, has become the circle of P about sun, so its
	   centre and its equant keep their places relative to sun. */
	function moment(name, jd) {
		const p = MODELS[name];

		if (KIND[name] === 'outer') {
			const s = PlanetEquant.state(p, jd);
			const c = PlanetEquant.construction(p, s);
			const S = along(p.r, s.sun);
			const scale = 1 / p.r;

			return finish(
				name,
				s.sun,
				scale,
				{ O: [0, 0], K: c.K, P: c.planet, S, C: c.C, Q: c.Q },
				{
					S: [0, 0],
					O: times(S, -scale),
					P: times(minus(c.planet, S), scale),
					C: times(c.C, scale),
					Q: times(c.Q, scale)
				}
			);
		}

		const s = PlanetEpicycle.state(p, jd);
		const c = PlanetEpicycle.construction(s, p.r);

		return finish(
			name,
			s.sun,
			1,
			{ O: [0, 0], K: c.K, P: c.planet, S: c.K },
			{
				S: [0, 0],
				O: times(c.K, -1),
				P: minus(c.planet, c.K)
			}
		);
	}

	/* The common part of moment(): the direction and the distance, from
	   the heliostatic points. */
	function finish(name, sun, scale, geostatic, heliostatic) {
		const sight = minus(heliostatic.P, heliostatic.O);
		const lambda = norm360(atan2d(sight[1], sight[0]));

		return {
			name,
			kind: KIND[name],
			scale,
			sun: norm360(sun),
			lambda,
			elongation: norm180(lambda - sun),
			distance: Math.hypot(sight[0], sight[1]),
			geostatic,
			heliostatic
		};
	}

	/* jd (TT) -> the planet's ecliptic longitude seen from the Earth in
	   Copernicus' arrangement (deg, [0, 360)): the same, by construction,
	   as the geostatic model's. */
	function make(name = 'mars') {
		return jd => moment(name, jd).lambda;
	}

	/* jd (TT) -> the planet's distance from the Earth (au). */
	function makeDistance(name = 'mars') {
		return jd => moment(name, jd).distance;
	}

	/* ======================================================================
	   4. COPERNICUS' ECCENTRIC WITH AN EPICYCLET (DE REVOLUTIONIBUS V 4)
	   Copernicus gave up the equant: a deferent of radius 1 whose centre
	   lies 3e/2 from the centre of motion towards the apogee, and on it a
	   small epicycle of radius e/2 turning twice as fast, which puts the
	   planet at
		   [3e/2 + cos M - (e/2) cos 2M,  sin M - (e/2) sin 2M]
	   in the frame of the apsidal line (x towards the apogee). Seen from
	   the centre of motion it has the equant's direction and distance to
	   first order (Fitzpatrick § 4.5).
	   ====================================================================== */

	/* The point at the mean anomaly M (deg), for the eccentricity e of
	   the equant it replaces: { point, q (its direction less M), distance }. */
	function epicyclet(M, e) {
		const point = [1.5 * e + cos(M) - 0.5 * e * cos(2 * M), sin(M) - 0.5 * e * sin(2 * M)];

		return {
			point,
			q: norm180(atan2d(point[1], point[0]) - M),
			distance: Math.hypot(point[0], point[1])
		};
	}

	/* jd (TT) -> the longitude of a planet whose deferent and equant
	   (PlanetEquant parameters, OC = e, OQ = 2e) are replaced by
	   Copernicus' eccentric with an epicyclet: the same epicycle, turned
	   by the mean Sun, and the same mean motion. */
	function makeEpicyclet(parameters = PlanetEquant.MARS_FIT) {
		return jd => {
			const s = PlanetEquant.state(parameters, jd);
			const z = epicyclet(s.M, parameters.e);
			const centre = s.meanLongitude + z.q;
			const r = parameters.r;
			const eta = atan2d(r * sin(s.sun - centre), z.distance + r * cos(s.sun - centre));

			return norm360(centre + eta);
		};
	}

	/* ======================================================================
	   5. EXPORT
	   ====================================================================== */

	return {
		PLANETS,
		KIND,
		FIT,
		PTOLEMY,
		COPERNICUS,
		VENUS_FIT,
		periodAboutSun,
		synodicPeriod,
		distanceOf,
		greatestElongation,
		quadratureAngle,
		moment,
		make,
		makeDistance,
		epicyclet,
		makeEpicyclet
	};
})();
