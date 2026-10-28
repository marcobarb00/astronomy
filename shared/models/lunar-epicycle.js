// @ts-check
/* ==========================================================================
   PREDICTING THE SKY - MODEL: THE LUNAR EPICYCLE (models/lunar-epicycle.js)
   The model of page 3.1, the Moon's first anomaly (Almagest IV 5-10): the
   centre K of an epicycle of radius r moves uniformly on a deferent of
   radius R centred on the Earth O, at the mean longitude
	   lambdaBar = L0 + n t,
   and the Moon moves uniformly on the epicycle, westward near its apogee
   (the point farthest from the Earth), by the anomaly
	   M = M0 + nM t,
   counted from the apogee of the epicycle (STRUCTURE.md §6). As a vector,
	   OMoon = R u(lambdaBar) + r u(lambdaBar - M),
   so with e = r / R the Moon is seen at
	   lambda = lambdaBar + q,   q = -atan2(e sin M, 1 + e cos M),
   the equation of centre of the solar eccentric (models/solar-eccentric.js)
   with r / R for e: q is negative from the apogee to the perigee, as in
   Ptolemy, who subtracts the equation there (Almagest IV 10).
   Needs common.js, time.js, models/mean-sun.js and
   models/solar-eccentric.js. Touches no DOM, so it can be loaded in Node.

   make(parameters) returns jd => longitude (JD(TT) in, degrees out), as
   ErrorCurve.addModel and ErrorCurve.addGhost expect (README.md).

   The equivalent eccentric (page 3.1, Almagest IV 5)
	 Vector addition commutes: the same point is r u(lambdaBar - M) +
	 R u(lambdaBar), the Moon on a circle of radius R whose centre C lies
	 at the distance r from the Earth towards lambdaBar - M. This eccentric
	 has its apogee at lambdaA = lambdaBar - M, which moves eastward at
	 n - nM, and the Moon moves on it at the mean longitude, as seen from C.

   The three-eclipse method (page 3.1, Almagest IV 6)
	 Three eclipses give the anomaly covered from the first to the second
	 (a12) and from the second to the third (a23), from the mean motion,
	 and the true motion minus the mean motion over each interval (d12,
	 d23). Unknown: e and the anomaly M2 at the second eclipse. With
	 X = e cos M2 and Y = e sin M2, to first order in e,
		 d12 = -X sin a12 - Y (1 - cos a12),
		 d23 = -X sin a23 + Y (1 - cos a23)       (d in radians),
	 a linear system; Newton's method then solves the exact equations.

   TABLE OF CONTENTS
	 1. Parameter sets
	 2. The model
	 3. The equivalent eccentric and the speed
	 4. The three-eclipse method
	 5. Export
   ========================================================================== */

const LunarEpicycle = (function () {
	/* ======================================================================
	   1. PARAMETER SETS
	   L0: mean longitude at the epoch (deg); n: daily motion in longitude
	   (deg / day); M0: anomaly at the epoch, from the apogee of the
	   epicycle (deg); nM: daily motion in anomaly; epoch: JD; clock
	   (optional, as in models/mean-sun.js): 'ut' for days of the turning
	   Earth; e: r / R.
	   ====================================================================== */

	/* The mean motions of the reference Moon: the linear terms of the
	   mean longitude L' and of the mean anomaly M' in J. Meeus,
	   Astronomical Algorithms (2nd ed., 1998), 47.1 and 47.4 (deg a day).
	   Meeus counts M' from the perigee; from the apogee it is M' + 180°. */
	const MEEUS = {
		n: 481267.88123421 / 36525,
		nM: 477198.8675055 / 36525,
		L0: 218.3164477,
		M0: 134.9633964 + 180,
		epoch: 2451545.0
	};

	/* Ptolemy: the daily motions in longitude 13;10,34,58,33,30,30° and in
	   anomaly 13;3,53,56,17,51,59° (Almagest IV 3, as corrected in IV 7);
	   at the epoch, noon at Alexandria on Thoth 1 of the first year of
	   Nabonassar (MeanSun.PTOLEMY), the mean Moon at Taurus 11;22 and
	   268;49° from the apogee of the epicycle (IV 8); the radius of the
	   epicycle 5;15 where the deferent's is 60 (IV 9, IV 10). */
	const PTOLEMY = {
		L0: 30 + 11 + 22 / 60,
		n: polynomial(1 / 60, [13, 10, 34, 58, 33, 30, 30]),
		M0: 268 + 49 / 60,
		nM: polynomial(1 / 60, [13, 3, 53, 56, 17, 51, 59]),
		epoch: MeanSun.PTOLEMY.epoch,
		clock: 'ut',
		e: 5.25 / 60
	};

	/* The moments (JD(TT)) of the three oppositions of the reference sky,
	   at the lunar eclipses of 7 September 2025, 3 March 2026 and 28
	   August 2026, to which page 3.1 fits its epicycle
	   (tools/numbers/3.1-first-anomaly.js). */
	const ECLIPSES_2026 = [2460926.256636, 2461102.986269, 2461280.680274];

	/* Our fit (page 3.1, section 3): the three-eclipse method applied to
	   those eclipses, with Meeus' mean motions; the epoch J2000.0
	   (tools/numbers/3.1-first-anomaly.js). */
	const FIT_2026 = {
		L0: 218.320909,
		n: MEEUS.n,
		M0: 320.013246,
		nM: MEEUS.nM,
		epoch: 2451545.0,
		e: 0.084402
	};

	/* ======================================================================
	   2. THE MODEL
	   ====================================================================== */

	/* The equation of anomaly q (deg) for the anomaly M (deg, from the
	   apogee of the epicycle) and e = r / R: the equation of centre of the
	   eccentric (page 3.1, section 2). */
	const equationOfAnomaly = SolarEccentric.equationOfCentre;

	/* The state of the model at JD(TT): { meanLongitude, M, q, lambda,
	   apogee } (deg; apogee is the apogee of the equivalent eccentric,
	   lambdaBar - M). meanLongitude, M, lambda and apogee in [0, 360). */
	function state(parameters, jd) {
		const t = MeanSun.daysSinceEpoch(parameters, jd);
		const meanLongitude = norm360(parameters.L0 + parameters.n * t);
		const M = norm360(parameters.M0 + parameters.nM * t);
		const q = equationOfAnomaly(M, parameters.e);

		return {
			meanLongitude,
			M,
			q,
			lambda: norm360(meanLongitude + q),
			apogee: norm360(meanLongitude - M)
		};
	}

	/* jd (TT) -> the true longitude of date (deg, [0, 360)). */
	function make(parameters = FIT_2026) {
		return jd => state(parameters, jd).lambda;
	}

	/* jd (TT) -> the mean longitude (deg): the uniform Moon, a Moon with
	   no anomaly at all. */
	function makeUniform(parameters = FIT_2026) {
		return jd => state(parameters, jd).meanLongitude;
	}

	/* The months of a parameter set (days): the tropical month (the
	   return of the mean longitude), the anomalistic month (the return of
	   the anomaly), and the turn of the equivalent eccentric's apogee. */
	function months(parameters) {
		return {
			tropical: 360 / parameters.n,
			anomalistic: 360 / parameters.nM,
			apogee: 360 / (parameters.n - parameters.nM)
		};
	}

	/* ======================================================================
	   3. THE EQUIVALENT ECCENTRIC AND THE SPEED
	   ====================================================================== */

	/* The two constructions of one moment, in units of the deferent's
	   radius R, with the Earth at the origin and x towards the vernal
	   point: K, the centre of the epicycle; C, the centre of the
	   equivalent eccentric; moon, the Moon, the fourth corner of the
	   parallelogram O K moon C. */
	function construction(s, e) {
		const K = [cos(s.meanLongitude), sin(s.meanLongitude)];
		const C = [e * cos(s.apogee), e * sin(s.apogee)];

		return { K, C, moon: [K[0] + C[0], K[1] + C[1]] };
	}

	/* The Moon's daily motion (deg a day) at the anomaly M: the mean
	   motion plus nM dq/dM, with dq/dM = -e (e + cos M) / (1 + 2 e cos M +
	   e^2) (radians per radian). Least at the apogee of the epicycle,
	   n - nM e / (1 + e), greatest at its perigee, n + nM e / (1 - e). */
	function dailyMotion(parameters, M) {
		const e = parameters.e;
		const slope = (-e * (e + cos(M))) / (1 + 2 * e * cos(M) + e * e);

		return parameters.n + parameters.nM * slope;
	}

	/* ======================================================================
	   4. THE THREE-ECLIPSE METHOD
	   ====================================================================== */

	/* Three sets of eclipses, as the sources give them: the anomaly from
	   the first eclipse to the second (a12) and from the second to the
	   third (a23), and the true motion minus the mean motion over each
	   interval (d12, d23), in degrees; with the source's own result. */
	const TRIPLES = {
		/* Almagest IV 6: the Babylonian eclipses of 721 BC March 19/20,
		   720 BC March 8/9 and 720 BC September 1/2. The Moon moved 349;15°
		   and 169;30° (true) against 345;51° and 170;7° (mean), covering
		   306;25° and 150;26° of anomaly. Ptolemy finds 5;13 where the
		   deferent is 60, the Moon 12;24° from the apogee at the second
		   eclipse and the equation -0;59 there. */
		babylon: {
			a12: 306 + 25 / 60,
			a23: 150 + 26 / 60,
			d12: 3 + 24 / 60,
			d23: -37 / 60,
			result: { e: (5 + 13 / 60) / 60, M2: 12 + 24 / 60 }
		},

		/* Almagest IV 6: Ptolemy's eclipses at Alexandria, AD 133 May 6/7,
		   134 October 20/21 and 136 March 5/6. True 161;55° and 138;55°
		   against mean 169;37° and 137;34°; anomaly 110;21° and 81;36°.
		   Ptolemy finds 5;14, 64;38° and -4;20. */
		alexandria: {
			a12: 110 + 21 / 60,
			a23: 81 + 36 / 60,
			d12: -(7 + 42 / 60),
			d23: 1 + 21 / 60,
			result: { e: (5 + 14 / 60) / 60, M2: 64 + 38 / 60 }
		},

		/* De Revolutionibus IV 5 [ff. 107v-109r]: Copernicus' eclipses of
		   1511 October 6/7, 1522 September 5/6 and 1523 August 25/26. True
		   329;47° and 349;9° against mean 334;47° and 346;10°; anomaly
		   250;36° and 306;43°. Copernicus finds 8604 parts where the
		   deferent is 100·000, and the Moon 74;27° from the apogee at the
		   second eclipse. */
		copernicus: {
			a12: 250 + 36 / 60,
			a23: 306 + 43 / 60,
			d12: -5,
			d23: 2 + 59 / 60,
			result: { e: 8604 / 100000, M2: 74 + 27 / 60 }
		}
	};

	/* The data of a triple from three moments (JD(TT)) and the true
	   longitudes there, with the mean motions of 'motions' ({ n, nM }). */
	function tripleFromObservations(times, longitudes, motions) {
		const [t1, t2, t3] = times;
		const [l1, l2, l3] = longitudes;

		return {
			a12: norm360(motions.nM * (t2 - t1)),
			a23: norm360(motions.nM * (t3 - t2)),
			d12: norm180(l2 - l1 - motions.n * (t2 - t1)),
			d23: norm180(l3 - l2 - motions.n * (t3 - t2))
		};
	}

	/* The first-order system of a triple: the two rows [A, B, d] of
	   A X + B Y = d (d in radians), with X = e cos M2, Y = e sin M2. */
	function firstOrderRows(data) {
		return [
			[-sin(data.a12), -(1 - cos(data.a12)), data.d12 * D2R],
			[-sin(data.a23), 1 - cos(data.a23), data.d23 * D2R]
		];
	}

	/* The exact equations of a triple at a trial (X, Y): the model's true
	   minus mean motion over each interval, less the observed one (deg). */
	function residuals(data, X, Y) {
		const e = Math.hypot(X, Y);
		const M2 = atan2d(Y, X);
		const q = M => equationOfAnomaly(M, e);

		return [q(M2) - q(M2 - data.a12) - data.d12, q(M2 + data.a23) - q(M2) - data.d23];
	}

	/* Solve 2 x 2: rows [[a, b, r], [c, d, s]] -> [x, y]. */
	function solve2(rows) {
		const [[a, b, r], [c, d, s]] = rows;
		const det = a * d - b * c;

		return [(r * d - b * s) / det, (a * s - c * r) / det];
	}

	/* The three-eclipse method: { first: { X, Y, e, M2 } to first order,
	   X, Y, e, M2, q2 } exact (M2 and q2 in degrees). Newton's method,
	   with the Jacobian by differences, from the first-order solution. */
	function threeEclipses(data) {
		const [X1, Y1] = solve2(firstOrderRows(data));
		const step = 1e-7;
		let X = X1;
		let Y = Y1;

		for (let i = 0; i < 12; i++) {
			const r = residuals(data, X, Y);
			const rx = residuals(data, X + step, Y);
			const ry = residuals(data, X, Y + step);
			const [dX, dY] = solve2([
				[(rx[0] - r[0]) / step, (ry[0] - r[0]) / step, r[0]],
				[(rx[1] - r[1]) / step, (ry[1] - r[1]) / step, r[1]]
			]);

			X -= dX;
			Y -= dY;
		}

		const e = Math.hypot(X, Y);
		const M2 = norm360(atan2d(Y, X));

		return {
			first: { X: X1, Y: Y1, e: Math.hypot(X1, Y1), M2: norm360(atan2d(Y1, X1)) },
			X,
			Y,
			e,
			M2,
			q2: equationOfAnomaly(M2, e)
		};
	}

	/* A parameter set from three eclipses: the moments (JD(TT)), the true
	   longitudes there, and the mean motions { n, nM }; the epoch
	   'epoch'. The mean longitude at the second eclipse is its true
	   longitude less the equation there. */
	function fitEclipses(times, longitudes, motions, epoch) {
		const solution = threeEclipses(tripleFromObservations(times, longitudes, motions));
		const t2 = times[1];
		const meanAt2 = longitudes[1] - solution.q2;

		return {
			L0: norm360(meanAt2 - motions.n * (t2 - epoch)),
			n: motions.n,
			M0: norm360(solution.M2 - motions.nM * (t2 - epoch)),
			nM: motions.nM,
			epoch: epoch,
			e: solution.e
		};
	}

	/* ======================================================================
	   5. EXPORT
	   ====================================================================== */

	return {
		MEEUS,
		PTOLEMY,
		ECLIPSES_2026,
		FIT_2026,
		TRIPLES,
		equationOfAnomaly,
		state,
		make,
		makeUniform,
		months,
		construction,
		dailyMotion,
		tripleFromObservations,
		firstOrderRows,
		residuals,
		threeEclipses,
		fitEclipses
	};
})();
