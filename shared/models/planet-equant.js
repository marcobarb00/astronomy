// @ts-check
/* ==========================================================================
   PREDICTING THE SKY - MODEL: THE PLANETARY EQUANT (models/planet-equant.js)
   The model of page 4.2, Ptolemy's model of an outer planet (Almagest
   IX 5 - 6, X 6 - 8, XI 9). The epicycle of page 4.1
   (models/planet-epicycle.js) is carried on an eccentric deferent, and
   its centre K moves uniformly as seen from a second point, the equant Q.

   Units: the deferent's radius is 1. In the frame of the apsidal line,
   with the Earth O at the origin and x towards the apogee A (ecliptic
   longitude lambdaA):
	 C = (OC, 0)        the centre of the deferent;
	 Q = (OQ, 0)        the equant, about which the line QK turns
						uniformly: its direction is the mean longitude
						lambdaBar, at the mean anomaly M = lambdaBar -
						lambdaA;
	 K = Q + QK u(M),   QK = -d cos M + sqrt(1 - d^2 sin^2 M), d = OQ - OC
						(the law of cosines in the triangle C Q K, CK = 1).
   Ptolemy bisects the eccentricity: OC = e, OQ = 2e (IX 5, X 6). The
   parameters may instead give centre (OC) and equant (OQ) apart, as the
   fit of page 4.2 does before it finds OC = OQ / 2.

   Seen from O, K is at lambdaBar + q, q the zodiacal equation (negative
   from the apogee to the perigee, as page 2.1's equation of centre), at
   the distance rho = OK. The radius KP of the epicycle (radius r) is
   parallel to the line from the Earth to the mean Sun (X 6), so the
   anomaly mu = lambdaBarSun - lambdaBar is counted from the mean apogee
   of the epicycle, on the line QK (IX 6), and the planet is seen at
	   lambda = lambdaBar + q + eta,
	   eta = atan2(r sin(mu - q), rho + r cos(mu - q)),
   the equation of the epicycle of page 4.1 with the anomaly counted from
   the true apogee, on the line OK (XI 9). With OC = OQ = 0 this is page
   4.1's model.

   The apogee is fixed among the stars, as in Ptolemy (IX 5: it moves
   "about the same ... as the amount determined for the sphere of the
   fixed stars"), so in ecliptic longitude of date it moves at the rate of precession.

   make(parameters) returns jd => longitude (JD(TT) in, degrees out), as
   ErrorCurve.addModel and ErrorCurve.addGhost expect (README.md).
   Needs common.js, time.js, models/mean-sun.js, models/precession.js and
   models/planet-epicycle.js. Touches no DOM, so it can be loaded in Node.

   TABLE OF CONTENTS
	 1. Parameter sets
	 2. The deferent and the equant
	 3. The model
	 4. The loops
	 5. Kepler's ellipse, for comparison
	 6. Ptolemy's three oppositions (Almagest X 7)
	 7. Export
   ========================================================================== */

const PlanetEquant = (function () {
	/* ======================================================================
	   1. PARAMETER SETS
	   L0: the mean longitude at the epoch (deg); n: its daily motion
	   (deg / day); epoch: JD (TT, or UT with clock: 'ut', as in
	   models/mean-sun.js); sun: the mean Sun (MeanSun parameters); apogee:
	   lambdaA at the epoch (deg); apogeeRate: its motion (deg / day); e:
	   OC, with the equant at 2e, or centre and equant given apart; r: the
	   epicycle's radius.
	   ====================================================================== */

	/* The modern rate of precession of page 2.3, per day: the apogee is
	   fixed among the stars. */
	const PRECESSION_PER_DAY = Precession.MODERN.rate / 365.25;

	/* Mars fitted on page 4.2 (tools/numbers/4.2-equant.js), from
	   documented observations only: n kept from page 4.1 (oppositions 79
	   years apart); L0, the apogee and the eccentricity from the eight
	   oppositions to the mean Sun of 2010 - 2025, with Ptolemy's bisection;
	   r from the eight arcs of retrogradation of those years. */
	const MARS_FIT = {
		L0: 355.375032,
		n: PlanetEpicycle.MARS_FIT.n,
		epoch: 2451545.0,
		sun: MeanSun.MODERN,
		apogee: 151.082,
		apogeeRate: PRECESSION_PER_DAY,
		e: 0.100469,
		r: 0.65803
	};

	/* The same fit with the centre C and the equant Q found apart (page
	   4.2, section 3): OQ from the oppositions, OC and r from the loops,
	   alternately until nothing changes. OC / OQ = 0.49. */
	const MARS_SEPARATE = {
		L0: 355.374664,
		n: PlanetEpicycle.MARS_FIT.n,
		epoch: 2451545.0,
		sun: MeanSun.MODERN,
		apogee: 151.0811,
		apogeeRate: PRECESSION_PER_DAY,
		centre: 0.098287,
		equant: 0.200731,
		r: 0.658102
	};

	/* Ptolemy's Mars: his mean Sun (III 2, III 7) and his mean motion in
	   longitude (IX 3, the tables of IX 4); at the epoch, noon at
	   Alexandria on Thoth 1 of Nabonassar 1, the mean longitude Aries 3;32°
	   and the apogee Cancer 16;40° (X 10), the apogee moving 1° in 100
	   Egyptian years of 365 days (IX 5, X 10); the double eccentricity 12 and the epicycle 39;30 where
	   the deferent is 60 (X 7, X 8). Days of UT. */
	const PTOLEMY = {
		L0: 3 + 32 / 60,
		n: PlanetEpicycle.PTOLEMY.mars.n,
		epoch: MeanSun.PTOLEMY.epoch,
		clock: 'ut',
		sun: MeanSun.PTOLEMY,
		apogee: 90 + 16 + 40 / 60,
		apogeeRate: 1 / 100 / 365,
		e: 6 / 60,
		r: 39.5 / 60
	};

	/* ======================================================================
	   2. THE DEFERENT AND THE EQUANT
	   In the frame of the apsidal line (x towards the apogee), units of
	   the deferent's radius.
	   ====================================================================== */

	/* OC and OQ of a parameter set: { centre, equant }. */
	function offsets(parameters) {
		if (parameters.centre !== undefined) {
			return { centre: parameters.centre, equant: parameters.equant };
		}

		return { centre: parameters.e, equant: 2 * parameters.e };
	}

	/* QK at the mean anomaly M (deg) for OC = centre and OQ = equant. */
	function equantDistance(M, centre, equant) {
		const d = equant - centre;

		return -d * cos(M) + Math.sqrt(1 - d * d * sin(M) * sin(M));
	}

	/* K at the mean anomaly M: [x, y]. */
	function centreOfEpicycle(M, centre, equant) {
		const QK = equantDistance(M, centre, equant);

		return [equant + QK * cos(M), QK * sin(M)];
	}

	/* K seen from the Earth: { q (deg, the zodiacal equation, the
	   direction of K less M), distance (OK) }. */
	function zodiacal(M, centre, equant) {
		const K = centreOfEpicycle(M, centre, equant);

		return { q: norm180(atan2d(K[1], K[0]) - M), distance: Math.hypot(K[0], K[1]) };
	}

	/* ======================================================================
	   3. THE MODEL
	   ====================================================================== */

	/* The longitude of the apogee (deg) at JD(TT). */
	function apogeeAt(parameters, jd) {
		return parameters.apogee + parameters.apogeeRate * MeanSun.daysSinceEpoch(parameters, jd);
	}

	/* The state at JD(TT): { meanLongitude (lambdaBar), apogee, M, q,
	   centreLongitude (of K, lambdaBar + q), rho (OK), sun (the mean
	   Sun's longitude), mu, eta, lambda } (deg; longitudes in [0, 360)). */
	function state(parameters, jd) {
		const t = MeanSun.daysSinceEpoch(parameters, jd);
		const meanLongitude = parameters.L0 + parameters.n * t;
		const apogee = apogeeAt(parameters, jd);
		const M = norm360(meanLongitude - apogee);
		const o = offsets(parameters);
		const z = zodiacal(M, o.centre, o.equant);
		const sun = MeanSun.meanLongitude(parameters.sun, jd);
		const mu = norm360(sun - meanLongitude);
		const r = parameters.r;
		const eta = atan2d(r * sin(mu - z.q), z.distance + r * cos(mu - z.q));

		return {
			meanLongitude: norm360(meanLongitude),
			apogee: norm360(apogee),
			M,
			q: z.q,
			centreLongitude: norm360(meanLongitude + z.q),
			rho: z.distance,
			sun: norm360(sun),
			mu,
			eta,
			lambda: norm360(meanLongitude + z.q + eta)
		};
	}

	/* jd (TT) -> the planet's longitude of date (deg, [0, 360)). */
	function make(parameters = MARS_FIT) {
		return jd => state(parameters, jd).lambda;
	}

	/* The points of one moment for a drawing, with the Earth O at the
	   origin and x towards the vernal point, units of the deferent's
	   radius: C, Q, K and the planet P. */
	function construction(parameters, s) {
		const o = offsets(parameters);
		const along = (length, lon) => [length * cos(lon), length * sin(lon)];
		const K = along(s.rho, s.centreLongitude);

		return {
			C: along(o.centre, s.apogee),
			Q: along(o.equant, s.apogee),
			K,
			planet: [K[0] + parameters.r * cos(s.sun), K[1] + parameters.r * sin(s.sun)]
		};
	}

	/* ======================================================================
	   4. THE LOOPS
	   A loop of the model whose mean opposition (K opposite the mean Sun)
	   falls at the mean anomaly M0, found in the frame of the apsidal
	   line: around it K moves from M0 at n and the mean Sun from opposite
	   K at nSun. The apogee's motion, under a minute of arc in a loop, is
	   left out.
	   ====================================================================== */

	/* The planet's direction (deg, unwrapped near K's) t days after the
	   mean opposition at M0. */
	function directionNear(M0, t, centre, equant, r, n, nSun) {
		const z0 = zodiacal(M0, centre, equant);
		const K = centreOfEpicycle(M0 + n * t, centre, equant);
		const sun = M0 + z0.q + 180 + nSun * t;

		return atan2d(K[1] + r * sin(sun), K[0] + r * cos(sun));
	}

	/* The loop at the mean anomaly M0: { lon (K's direction at the mean
	   opposition, from the apogee, deg), arc (deg), days }, NaN without a
	   loop. */
	function loopAt(M0, centre, equant, r, n, nSun) {
		const direction = t => directionNear(M0, t, centre, equant, r, n, nSun);
		const motion = t => norm180(direction(t + 0.05) - direction(t - 0.05)) / 0.1;
		const first = bisect(motion, -60, 0, 40);
		const second = bisect(motion, 0, 60, 40);

		return {
			lon: norm360(M0 + zodiacal(M0, centre, equant).q),
			arc: norm180(direction(first) - direction(second)),
			days: second - first
		};
	}

	/* The time (days) from the mean opposition at M0 to the next: the
	   mean Sun gains 360° on the direction of K. */
	function oppositionInterval(M0, centre, equant, n, nSun) {
		const q0 = zodiacal(M0, centre, equant).q;
		const gain = t => (nSun - n) * t - zodiacal(M0 + n * t, centre, equant).q + q0 - 360;

		return bisect(gain, 500, 1100, 50);
	}

	/* ======================================================================
	   5. KEPLER'S ELLIPSE, FOR COMPARISON
	   An ellipse of semi-major axis 1 and eccentricity e, its centre at C =
	   (e, 0) and its foci at O and Q = (2e, 0), the points of the equant
	   model with the same e. A point moving on it by the area law about O
	   has, with M counted from the apogee, the eccentric anomaly E from
	   M = E + e sin E (Kepler's equation counted from the apogee).
	   ====================================================================== */

	/* The eccentric anomaly E (deg) for M (deg), by Newton's method. */
	function keplerAnomaly(M, e) {
		let E = M;

		for (let i = 0; i < 30; i++) {
			const step = (E + e * R2D * sin(E) - M) / (1 + e * cos(E));

			E -= step;

			if (Math.abs(step) < 1e-12) {
				break;
			}
		}

		return E;
	}

	/* The point on the ellipse at the mean anomaly M: { point [x, y] in
	   the frame of the apsidal line, q (its direction less M), distance
	   (from O), E }. */
	function kepler(M, e) {
		const E = keplerAnomaly(M, e);
		const point = [e + cos(E), Math.sqrt(1 - e * e) * sin(E)];

		return {
			point,
			q: norm180(atan2d(point[1], point[0]) - M),
			distance: 1 + e * cos(E),
			E
		};
	}

	/* ======================================================================
	   6. PTOLEMY'S THREE OPPOSITIONS (ALMAGEST X 7)
	   Three oppositions give the directions of K at three moments; the
	   mean motion gives the arcs of mean longitude between them. With the
	   bisection, three unknowns: e, the apogee and the mean longitude at
	   the third opposition. To first order the equation is q = -2e sin M =
	   -X sin lambdaBar + Y cos lambdaBar (radians), X = 2e cos lambdaA, Y =
	   2e sin lambdaA, linear in X and Y once lambdaBar is replaced by the
	   observed longitude; then exactly, by Newton's method.
	   ====================================================================== */

	/* Ptolemy's oppositions of Mars (X 7): AD 130 Dec 14/15 at Gemini 21°,
	   AD 135 Feb 21/22 at Leo 28;50°, AD 139 May 27/28 at Sagittarius
	   2;34°; the arcs of mean motion between them 81;44° and 95;28°. */
	const PTOLEMY_OPPOSITIONS = {
		longitudes: [60 + 21, 120 + 28 + 50 / 60, 240 + 2 + 34 / 60],
		meanArcs: [81 + 44 / 60, 95 + 28 / 60]
	};

	/* The solution of 2 x 2 or 3 x 3 linear equations A x = b. */
	function solveLinear(A, b) {
		const n = b.length;
		const M = A.map((row, i) => row.concat([b[i]]));

		for (let c = 0; c < n; c++) {
			let pivot = c;

			for (let r = c + 1; r < n; r++) {
				if (Math.abs(M[r][c]) > Math.abs(M[pivot][c])) {
					pivot = r;
				}
			}

			[M[c], M[pivot]] = [M[pivot], M[c]];

			for (let r = 0; r < n; r++) {
				if (r !== c) {
					const k = M[r][c] / M[c][c];

					for (let j = c; j <= n; j++) {
						M[r][j] -= k * M[c][j];
					}
				}
			}
		}

		return M.map((row, i) => row[n] / row[i]);
	}

	/* From three oppositions { longitudes, meanArcs }: { first: { e,
	   apogee }, exact: { e, apogee, M (the mean anomaly at the third),
	   residual (deg) } }. */
	function threeOppositions(data = PTOLEMY_OPPOSITIONS) {
		const [l1, l2, l3] = data.longitudes;
		const [a1, a2] = data.meanArcs;

		// first order: differences of the three equations eliminate the
		// mean longitude
		const A = [
			[-(sin(l2) - sin(l1)), cos(l2) - cos(l1)],
			[-(sin(l3) - sin(l2)), cos(l3) - cos(l2)]
		];
		const b = [(l2 - l1 - a1) / R2D, (l3 - l2 - a2) / R2D];
		const [X, Y] = solveLinear(A, b);
		const first = { e: Math.hypot(X, Y) / 2, apogee: norm360(atan2d(Y, X)) };

		// exact: Newton's method on (L, e, apogee), L the mean longitude at
		// the third opposition
		const residuals = x => {
			const means = [x[0] - a1 - a2, x[0] - a2, x[0]];

			return means.map((m, i) => norm180(m + zodiacal(m - x[2], x[1], 2 * x[1]).q - data.longitudes[i]));
		};
		let x = [l3 + 2 * first.e * R2D * sin(l3 - first.apogee), first.e, first.apogee];

		for (let iteration = 0; iteration < 30; iteration++) {
			const r0 = residuals(x);
			const J = r0.map(() => [0, 0, 0]);

			x.forEach((value, j) => {
				const h = 1e-7 * Math.max(1, Math.abs(value));
				const moved = x.slice();

				moved[j] += h;
				residuals(moved).forEach((v, i) => {
					J[i][j] = (v - r0[i]) / h;
				});
			});

			const step = solveLinear(
				J,
				r0.map(v => -v)
			);

			x = x.map((value, i) => value + step[i]);

			if (Math.max(...step.map(Math.abs)) < 1e-12) {
				break;
			}
		}

		return {
			first,
			exact: {
				e: x[1],
				apogee: norm360(x[2]),
				M: norm360(x[0] - x[2]),
				residual: Math.max(...residuals(x).map(Math.abs))
			}
		};
	}

	/* ======================================================================
	   7. EXPORT
	   ====================================================================== */

	return {
		PRECESSION_PER_DAY,
		MARS_FIT,
		MARS_SEPARATE,
		PTOLEMY,
		PTOLEMY_OPPOSITIONS,
		offsets,
		equantDistance,
		centreOfEpicycle,
		zodiacal,
		apogeeAt,
		state,
		make,
		construction,
		directionNear,
		loopAt,
		oppositionInterval,
		keplerAnomaly,
		kepler,
		threeOppositions
	};
})();
