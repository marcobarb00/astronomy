/* ==========================================================================
   NUMBERS FOR PAGE 4.2 "THE EQUANT" (tools/numbers/4.2-equant.js)
   Loads the site's shared code (common, time, ephemeris and the models
   mean-sun.js, precession.js, planet-epicycle.js and planet-equant.js) in
   a Node vm context and prints every number quoted on the page, in page
   order.

   Run from the repository root:  node tools/numbers/4.2-equant.js
   (about half a minute: it fits the model to the loops by finding the
   model's stations again and again)

   TABLE OF CONTENTS
	 1. Loading the shared code
	 2. Helpers
	 3. Observation: the oppositions and the loops of 1986 - 2025
	 4. Model: one eccentric; the first order; the equant; Kepler
	 5. Fit: the centre and the equant apart, then bisected
	 6. Test: the error curve, the loops, Ptolemy in his time
	 7. Residual: the epicycle turned by the real Sun
	 8. Exercises
	 9. The scales of the figures
   ========================================================================== */

'use strict';

const { loadFiles } = require('../check/load.js');

/* ==========================================================================
   1. LOADING THE SHARED CODE
   ========================================================================== */

const shared = loadFiles([
	'shared/common.js',
	'shared/time.js',
	'shared/ephemeris.js',
	'shared/models/mean-sun.js',
	'shared/models/precession.js',
	'shared/models/planet-epicycle.js',
	'shared/models/planet-equant.js'
]);
const { norm180, norm360, sin, cos, asin, atan2d, Time, Ephem, MeanSun, PlanetEpicycle, PlanetEquant } = shared;
const MARS_41 = PlanetEpicycle.MARS_FIT;
const { MARS_FIT, MARS_SEPARATE, PTOLEMY } = PlanetEquant;
const J2000 = 2451545.0;
const R2D = 180 / Math.PI;

/* ==========================================================================
   2. HELPERS
   ========================================================================== */

const title = text => console.log(`\n=== ${text} ===`);
const f = (x, digits) => x.toFixed(digits);
const mean = list => list.reduce((a, b) => a + b, 0) / list.length;
const rms = list => Math.sqrt(mean(list.map(x => x * x)));
const maxAbs = list => Math.max(...list.map(Math.abs));
const range = (list, digits) => `${f(Math.min(...list), digits)} to ${f(Math.max(...list), digits)}`;
const JD = (y, m, d) => Time.julianDay(y, m, d);
const date = jd => Time.formatDate(jd);
const sexagesimal = x => `${Math.floor(x)};${String(Math.round((x % 1) * 60)).padStart(2, '0')}`;
const arcmin = degrees => degrees * 60;

/* Root of fn in [a, b] by bisection (signs of fn(a), fn(b) opposite). */
function bisect(fn, a, b, steps = 50) {
	let fa = fn(a);

	for (let i = 0; i < steps; i++) {
		const m = (a + b) / 2;
		const fm = fn(m);

		if (fa * fm <= 0) {
			b = m;
		} else {
			a = m;
			fa = fm;
		}
	}

	return (a + b) / 2;
}

/* Every root of fn in [start, end], from a scan every 'step' days. */
function roots(fn, start, end, step) {
	const found = [];
	let f0 = fn(start);

	for (let t = start + step; t <= end; t += step) {
		const f1 = fn(t);

		if (f0 * f1 <= 0 && Math.abs(f1 - f0) < 90) {
			found.push(bisect(fn, t - step, t));
		}

		f0 = f1;
	}

	return found;
}

/* Linear equations A x = b (Gauss - Jordan with pivoting). */
function solve(A, b) {
	const n = b.length;
	const M = A.map((row, i) => row.concat([b[i]]));

	for (let c = 0; c < n; c++) {
		let p = c;

		for (let r = c + 1; r < n; r++) {
			if (Math.abs(M[r][c]) > Math.abs(M[p][c])) {
				p = r;
			}
		}

		[M[c], M[p]] = [M[p], M[c]];

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

/* Least squares by Gauss - Newton, with numerical derivatives:
   { x, residuals } for residuals(x) -> [..]. */
function leastSquares(residuals, x0, iterations = 40) {
	let x = x0.slice();

	for (let it = 0; it < iterations; it++) {
		const r0 = residuals(x);
		const J = x.map((_, j) => {
			const h = 1e-6 * Math.max(1, Math.abs(x[j]));
			const moved = x.slice();

			moved[j] += h;

			return residuals(moved).map((v, i) => (v - r0[i]) / h);
		});
		const A = x.map((_, a) => x.map((__, b) => J[a].reduce((s, v, i) => s + v * J[b][i], 0)));
		const g = J.map(row => row.reduce((s, v, i) => s - v * r0[i], 0));
		const dx = solve(A, g);

		x = x.map((v, i) => v + dx[i]);

		if (maxAbs(dx) < 1e-11) {
			break;
		}
	}

	return { x, residuals: residuals(x) };
}

const lon = jd => Ephem.longitude('mars', jd);
const meanSun = jd => MeanSun.meanLongitude(MeanSun.MODERN, jd);
const offMeanSun = jd => norm180(lon(jd) - meanSun(jd) - 180);
const N = MARS_41.n;
const N_SUN = MeanSun.MODERN.n;

/* A parameter set of Mars on the modern mean Sun, epoch J2000.0. */
const modern = values =>
	Object.assign(
		{ n: N, epoch: J2000, sun: MeanSun.MODERN, apogeeRate: PlanetEquant.PRECESSION_PER_DAY, r: 0.66 },
		values
	);

/* The loop of a parameter set nearest the date 'near': { arc, days,
   middle (the planet opposite the mean Sun) }, from the model's own
   stations. */
function modelLoop(p, near) {
	const fn = PlanetEquant.make(p);
	const motion = t => norm180(fn(t + 0.25) - fn(t - 0.25)) / 0.5;
	const stations = [];
	let m0 = motion(near - 90);

	for (let t = near - 89; t <= near + 90; t += 1) {
		const m1 = motion(t);

		if (m0 * m1 < 0) {
			stations.push(bisect(motion, t - 1, t, 30));
		}

		m0 = m1;
	}

	const [a, b] = stations;

	return {
		arc: norm180(fn(a) - fn(b)),
		days: b - a,
		middle: bisect(jd => norm180(fn(jd) - meanSun(jd) - 180), a, b, 40)
	};
}

/* The residuals of the directions of K at oppositions (deg), and of the
   arcs of loops (deg). */
const directionResiduals = (p, list) => list.map(jd => norm180(PlanetEquant.state(p, jd).centreLongitude - lon(jd)));
const arcResiduals = (p, list) => list.map(l => modelLoop(p, l.middle).arc - l.arc);

/* The largest and rms error of a model against the reference Mars. */
function errors(fn, start, end, step) {
	let max = 0;
	let when = start;
	const all = [];

	for (let jd = start; jd < end; jd += step) {
		const d = norm180(fn(jd) - lon(jd));

		all.push(d);

		if (Math.abs(d) > max) {
			max = Math.abs(d);
			when = jd;
		}
	}

	return { max, rms: rms(all), when, mean: mean(all) };
}

/* ==========================================================================
   3. OBSERVATION
   The rule of the page's data (STRUCTURE.md §5): the observations are
   already documented, before 2026; only the test runs into the future.
   ========================================================================== */

const DATA_START = JD(1986, 1, 1);
const DATA_END = JD(2026, 1, 1);
const FIT_START = JD(2010, 1, 1);
const oppositions = roots(offMeanSun, DATA_START, DATA_END, 2);
const fitOppositions = oppositions.filter(jd => jd >= FIT_START);
const loops = PlanetEpicycle.referenceEvents('mars', 'outer', JD(1985, 6, 1), DATA_END).loops.filter(
	l => l.middle >= DATA_START
);
const fitLoops = loops.filter(l => l.middle >= FIT_START);

title("Observation: the oppositions to the mean Sun, 1986 - 2025, against page 4.1's mean longitude (Figure 1a)");

const observed = oppositions.map(jd => ({
	jd,
	lon: lon(jd),
	q: norm180(lon(jd) - (MARS_41.L0 + MARS_41.n * (jd - J2000)))
}));

observed.forEach(o =>
	console.log(
		`${date(o.jd).padEnd(12)} ecliptic longitude ${f(o.lon, 1).padStart(5)}°  less the mean ${f(o.q, 2).padStart(6)}°`
	)
);
console.log(
	`${observed.length} oppositions; less the mean longitude ${range(
		observed.map(o => o.q),
		1
	)}°`
);
{
	// where the curve crosses zero going down and up: between neighbouring
	// oppositions, by linear interpolation in the ecliptic longitude
	const sorted = observed.slice().sort((a, b) => a.lon - b.lon);
	const crossings = [];

	sorted.forEach((o, i) => {
		const next = sorted[(i + 1) % sorted.length];
		const span = norm360(next.lon - o.lon);

		if (o.q * next.q < 0) {
			crossings.push(`${f(norm360(o.lon + (span * o.q) / (o.q - next.q)), 0)}° (${o.q > 0 ? 'down' : 'up'})`);
		}
	});
	console.log(`crosses zero at about ${crossings.join(', ')}`);
}

title('Observation: the loops, 1986 - 2025 (Figure 1b, page 4.1)');
{
	const longest = loops.reduce((a, b) => (b.arc > a.arc ? b : a));
	const shortest = loops.reduce((a, b) => (b.arc < a.arc ? b : a));

	console.log(
		`${loops.length} loops; arcs ${range(
			loops.map(l => l.arc),
			1
		)}°`
	);
	console.log(
		`longest ${f(longest.arc, 1)}° (${date(longest.middle)}, at ${f(longest.lon, 0)}°); shortest ${f(shortest.arc, 1)}° (${date(shortest.middle)}, at ${f(shortest.lon, 0)}°)`
	);
}

/* ==========================================================================
   4. MODEL
   ========================================================================== */

title('Model: one eccentric (C = Q) fitted to the oppositions of 2010 - 2025');

const eccentricFit = leastSquares(
	x => directionResiduals(modern({ L0: x[0], apogee: x[1], centre: x[2], equant: x[2] }), fitOppositions),
	[MARS_41.L0, 150, 0.2]
);
const ECCENTRIC = modern({
	L0: eccentricFit.x[0],
	apogee: eccentricFit.x[1],
	centre: eccentricFit.x[2],
	equant: eccentricFit.x[2]
});
{
	ECCENTRIC.r = leastSquares(x => arcResiduals(Object.assign({}, ECCENTRIC, { r: x[0] }), fitLoops), [0.66], 10).x[0];

	const arcs = fitLoops.map(l => modelLoop(ECCENTRIC, l.middle).arc);

	console.log(
		`e = ${f(ECCENTRIC.centre, 4)}, apogee ${f(ECCENTRIC.apogee, 1)}°; directions within ${f(arcmin(maxAbs(eccentricFit.residuals)), 0)}' (rms ${f(arcmin(rms(eccentricFit.residuals)), 0)}')`
	);
	console.log(`with r fitted to the arcs (${f(ECCENTRIC.r, 3)}) its loops: ${arcs.map(a => f(a, 1)).join(', ')}°`);
	console.log(`the real loops:                        ${fitLoops.map(l => f(l.arc, 1)).join(', ')}°`);
	console.log(`at ecliptic longitudes:                ${fitLoops.map(l => f(l.lon, 0)).join(', ')}°`);
	console.log(
		`the eccentric's loops ${range(arcs, 1)}°, the real ${range(
			fitLoops.map(l => l.arc),
			1
		)}°`
	);
}

title('Model: speed and distance of K at the apsides (OQ = 0.2)');
{
	// the angular speed of K seen from O is n QK / OK at the apsides
	[
		['eccentric, OC = OQ = 0.2', 0.2, 0.2],
		['equant, OC = 0.1, OQ = 0.2', 0.1, 0.2]
	].forEach(([label, c, qq]) => {
		const apogee = (1 + c - qq) / (1 + c);
		const perigee = (1 - c + qq) / (1 - c);

		console.log(
			`${label.padEnd(28)} OK ${f(1 + c, 2)} at the apogee, ${f(1 - c, 2)} at the perigee; K's speed seen from O ${f(apogee, 3)} n, ${f(perigee, 3)} n`
		);
	});
}

title("Model: the equant, Ptolemy's Mars (OQ = 12, OC = 6 where the deferent is 60)");
{
	const e = PTOLEMY.e;
	let qmax = 0;
	let Mmax = 0;

	for (let M = 0; M < 360; M += 0.01) {
		const z = PlanetEquant.zodiacal(M, e, 2 * e);

		if (Math.abs(z.q) > qmax) {
			qmax = Math.abs(z.q);
			Mmax = M;
		}
	}

	console.log(
		`greatest zodiacal equation ${f(qmax, 2)}° at M = ${f(Mmax, 1)}° (first order 2e radians = ${f(2 * e * R2D, 2)}°; an eccentric of 2e, asin 2e = ${f(asin(2 * e), 2)}°)`
	);
	console.log(
		`OK from ${f(PlanetEquant.zodiacal(180, e, 2 * e).distance, 3)} to ${f(PlanetEquant.zodiacal(0, e, 2 * e).distance, 3)} (an eccentric of 2e: ${f(1 - 2 * e, 2)} to ${f(1 + 2 * e, 2)})`
	);
}

title("Model: the equant against Kepler's ellipse, to second order (M from the apogee)");
console.log('eccentric, OC = 2e:          q = -2e sin M + 2 e^2 sin 2M     OK = 1 + 2e cos M + 2 e^2 sin^2 M');
console.log('equant, OC = e, OQ = 2e:     q = -2e sin M + e^2 sin 2M       OK = 1 + e cos M + 3/2 e^2 sin^2 M');
console.log("Kepler's ellipse, e:         q = -2e sin M + 5/4 e^2 sin 2M   r  = 1 + e cos M + e^2 sin^2 M");
{
	// the coefficients of sin M and sin 2M of the exact q, at e = 0.001
	const e = 0.001;
	const coefficients = qOf => {
		let a1 = 0;
		let a2 = 0;
		const steps = 3600;

		for (let i = 0; i < steps; i++) {
			const M = (360 * i) / steps;
			const q = qOf(M) / R2D;

			a1 += (2 / steps) * q * sin(M);
			a2 += (2 / steps) * q * sin(2 * M);
		}

		return [a1 / e, a2 / (e * e)];
	};

	[
		['eccentric, OC = 2e', M => PlanetEquant.zodiacal(M, 2 * e, 2 * e).q],
		['equant, OC = e, OQ = 2e', M => PlanetEquant.zodiacal(M, e, 2 * e).q],
		["Kepler's ellipse", M => PlanetEquant.kepler(M, e).q]
	].forEach(([label, qOf]) => {
		const [c1, c2] = coefficients(qOf);

		console.log(`check at e = ${e}: ${label.padEnd(24)} ${f(c1, 4)} e sin M, ${f(c2, 4)} e^2 sin 2M`);
	});

	// the direction of the point of the ellipse from the empty focus Q
	let worst = 0;

	for (let M = 0; M < 360; M += 1) {
		const point = PlanetEquant.kepler(M, e).point;
		const fromQ = atan2d(point[1], point[0] - 2 * e);

		worst = Math.max(worst, Math.abs(norm180(fromQ - M)) / R2D / (e * e));
	}

	console.log(`the direction from the empty focus less M: at most ${f(worst, 4)} e^2`);
}

/* The greatest differences of the equant and of the eccentric (OC = 2e)
   from the ellipse, in direction and in distance. */
function comparison(e) {
	let dq = 0;
	let dqEccentric = 0;
	let dd = 0;
	let atM = 0;

	for (let M = 0; M < 360; M += 0.05) {
		const k = PlanetEquant.kepler(M, e);
		const z = PlanetEquant.zodiacal(M, e, 2 * e);
		const c = PlanetEquant.zodiacal(M, 2 * e, 2 * e);

		if (Math.abs(z.q - k.q) > dq) {
			dq = Math.abs(z.q - k.q);
			atM = M;
		}

		dqEccentric = Math.max(dqEccentric, Math.abs(c.q - k.q));
		dd = Math.max(dd, Math.abs(z.distance - k.distance));
	}

	return { dq, dqEccentric, dd, atM };
}

[0.3, 0.2, 0.1, 0.05, 0.0167].forEach(e => {
	const c = comparison(e);
	const second = (e * e * R2D) / 4;

	console.log(
		`e = ${e}: equant - ellipse up to ${f(arcmin(c.dq), 2)}' (e^2/4 = ${f(arcmin(second), 2)}', ratio ${f(c.dq / second, 3)});` +
			` eccentric - ellipse ${f(arcmin(c.dqEccentric), 2)}' (3e^2/4 = ${f(arcmin(3 * second), 2)}'); distance up to ${f(c.dd, 5)} (e^2/2 = ${f((e * e) / 2, 5)})`
	);
});

/* ==========================================================================
   5. FIT
   ========================================================================== */

title('Fit: OQ from the oppositions, OC and r from the loops (2010 - 2025), alternately');

const separate = modern({ L0: MARS_41.L0, apogee: 150, centre: 0, equant: 0.2 });

for (let step = 1; step <= 5; step++) {
	const a = leastSquares(
		x => directionResiduals(Object.assign({}, separate, { L0: x[0], apogee: x[1], equant: x[2] }), fitOppositions),
		[separate.L0, separate.apogee, separate.equant]
	);

	Object.assign(separate, { L0: a.x[0], apogee: a.x[1], equant: a.x[2] });

	const b = leastSquares(
		x => arcResiduals(Object.assign({}, separate, { r: x[0], centre: x[1] }), fitLoops),
		[separate.r, separate.centre],
		12
	);

	Object.assign(separate, { r: b.x[0], centre: b.x[1] });
	console.log(
		`round ${step}: OQ ${f(separate.equant, 4)}  OC ${f(separate.centre, 4)}  OC/OQ ${f(separate.centre / separate.equant, 3)}  r ${f(separate.r, 4)}` +
			`  apogee ${f(separate.apogee, 2)}°  L0 ${f(separate.L0, 3)}°  | directions rms ${f(arcmin(rms(a.residuals)), 1)}', arcs rms ${f(rms(b.residuals), 2)}°`
	);
}

console.log(
	`MARS_SEPARATE: L0 ${f(separate.L0, 6)}, apogee ${f(separate.apogee, 4)}, centre ${f(separate.centre, 6)}, equant ${f(separate.equant, 6)}, r ${f(separate.r, 6)}`
);
console.log(
	`in planet-equant.js:  L0 ${MARS_SEPARATE.L0}, apogee ${MARS_SEPARATE.apogee}, centre ${MARS_SEPARATE.centre}, equant ${MARS_SEPARATE.equant}, r ${MARS_SEPARATE.r}`
);

title("Fit: Ptolemy's bisection, OC = e, OQ = 2e");

const bisected = leastSquares(
	x => directionResiduals(modern({ L0: x[0], apogee: x[1], e: x[2] }), fitOppositions),
	[separate.L0, separate.apogee, separate.equant / 2]
);
const fitted = modern({ L0: bisected.x[0], apogee: bisected.x[1], e: bisected.x[2] });
{
	const b = leastSquares(x => arcResiduals(Object.assign({}, fitted, { r: x[0] }), fitLoops), [0.66], 12);

	fitted.r = b.x[0];
	console.log(
		`L0 = ${f(fitted.L0, 6)}° at J2000.0, apogee ${f(fitted.apogee, 4)}°, e = ${f(fitted.e, 6)} (OQ ${f(2 * fitted.e, 4)}), r = ${f(fitted.r, 6)}`
	);
	console.log(
		`where the deferent is 60: OC ${f(60 * fitted.e, 2)}, OQ ${f(120 * fitted.e, 2)}, r ${f(60 * fitted.r, 2)} (Ptolemy 6, 12, 39.5)`
	);
	console.log(
		`directions at the 8 oppositions within ${f(arcmin(maxAbs(bisected.residuals)), 1)}' (rms ${f(arcmin(rms(bisected.residuals)), 1)}');` +
			` arcs within ${f(maxAbs(b.residuals), 2)}° (rms ${f(rms(b.residuals), 2)}°)`
	);
	console.log(`page 4.1's mean longitude moves by ${f(fitted.L0 - MARS_41.L0, 2)}°`);
	console.log(`in planet-equant.js:  L0 ${MARS_FIT.L0}, apogee ${MARS_FIT.apogee}, e ${MARS_FIT.e}, r ${MARS_FIT.r}`);
}

/* ==========================================================================
   6. TEST
   ========================================================================== */

title('Test: the equant fitted to 2010 - 2025 against the reference Mars (Figure 5)');

const equantFn = PlanetEquant.make(MARS_FIT);
const simpleFn = PlanetEpicycle.make(MARS_41);

[
	['2010 - 2025', FIT_START, DATA_END, 1],
	['2026', JD(2026, 1, 1), JD(2027, 1, 1), 1],
	['1926 - 2126', JD(1926, 1, 1), JD(2126, 1, 1), 3]
].forEach(([label, a, b, step]) => {
	const e1 = errors(equantFn, a, b, step);
	const e2 = errors(simpleFn, a, b, step);

	console.log(
		`${label}: the equant within ${f(e1.max, 2)}° (rms ${f(e1.rms, 2)}°, worst on ${date(e1.when)}); page 4.1's epicycle ${f(e2.max, 1)}° (rms ${f(e2.rms, 1)}°)`
	);
});

title('Test: the loops of 1986 - 2025 (Figure 6)');
{
	const rows = loops.map((l, i) => ({
		l,
		m: modelLoop(MARS_FIT, l.middle),
		next: i + 1 < loops.length ? loops[i + 1].middle - l.middle : NaN
	}));

	rows.forEach((row, i) => {
		row.modelNext = i + 1 < rows.length ? rows[i + 1].m.middle - row.m.middle : NaN;
		console.log(
			`${date(row.l.middle).padEnd(12)} at ${f(row.l.lon, 0).padStart(3)}°: back ${f(row.l.arc, 1)}° (equant ${f(row.m.arc, 1)}°)` +
				` in ${f(row.l.days, 0)} d (${f(row.m.days, 0)} d); next after ${f(row.next, 0)} d (${f(row.modelNext, 0)} d)`
		);
	});

	const outside = rows.filter(row => row.l.middle < FIT_START);
	const withNext = rows.filter(row => Number.isFinite(row.next));

	console.log(
		`the ${outside.length} loops of 1986 - 2009, outside the fit: arcs within ${f(maxAbs(outside.map(row => row.m.arc - row.l.arc)), 1)}°` +
			` (rms ${f(rms(outside.map(row => row.m.arc - row.l.arc)), 1)}°)`
	);
	console.log(
		`all ${rows.length}: arcs within ${f(maxAbs(rows.map(row => row.m.arc - row.l.arc)), 1)}°; intervals within ${f(maxAbs(withNext.map(row => row.modelNext - row.next)), 1)} days`
	);
	console.log(
		`the equant's arcs ${range(
			rows.map(row => row.m.arc),
			1
		)}°; intervals ${range(
			withNext.map(row => row.modelNext),
			0
		)} days (real ${range(
			withNext.map(row => row.next),
			0
		)})`
	);

	// like with like: the real intervals between oppositions to the mean Sun
	// (the reference's oppositions to the true Sun differ by the Sun's own
	// anomaly), against the model's, which are to the mean Sun
	const realMean = oppositions.slice(1).map((jd, i) => jd - oppositions[i]);
	const modelMean = oppositions
		.slice(1)
		.map((jd, i) => modelLoop(MARS_FIT, oppositions[i + 1]).middle - modelLoop(MARS_FIT, oppositions[i]).middle);
	const trueVsMean = withNext.map((row, i) => row.next - realMean[i]);

	console.log(
		`intervals between oppositions to the mean Sun: real ${range(realMean, 1)} days, the equant within ${f(maxAbs(modelMean.map((m, i) => m - realMean[i])), 1)} days;` +
			` the real intervals to the true and to the mean Sun differ by up to ${f(maxAbs(trueVsMean), 1)} days`
	);
}

title("Test, history: Ptolemy's Mars (Almagest X 7 - 10) in his own time");
{
	const fn = PlanetEquant.make(PTOLEMY);
	const decade = errors(fn, Time.julianDay(130, 1, 1), Time.julianDay(140, 1, 1), 2);
	const sun = [];

	for (let jd = Time.julianDay(130, 1, 1); jd < Time.julianDay(140, 1, 1); jd += 2) {
		sun.push(norm180(MeanSun.meanLongitude(MeanSun.PTOLEMY, jd) - meanSun(jd)));
	}

	console.log(
		`check: the anomaly at the epoch ${f(norm360(MeanSun.PTOLEMY.L0 - PTOLEMY.L0), 2)}° (X 10: 327° 13′ = ${f(327 + 13 / 60, 2)}°)`
	);
	console.log(
		`AD 130 - 139: his Mars within ${f(decade.max, 1)}° of the reference, on average ${f(decade.mean, 2)}°; his mean Sun ${f(mean(sun), 2)}°`
	);
	{
		// a check, not a fit: his mean longitude of Mars against Standish's of date
		const reference = PlanetEpicycle.meanOfDate('mars');
		const lag = [];

		for (let jd = Time.julianDay(130, 1, 1); jd < Time.julianDay(140, 1, 1); jd += 2) {
			lag.push(
				norm180(PlanetEquant.state(PTOLEMY, jd).meanLongitude - (reference.L0 + reference.n * (jd - J2000)))
			);
		}

		console.log(
			`his mean ecliptic longitude of Mars less the reference's mean longitude, AD 130 - 139: ${f(mean(lag), 2)}°`
		);
	}

	// his own check (X 7): the observed intervals from his rounded result
	const o = PlanetEquant.PTOLEMY_OPPOSITIONS;
	const third = 90 + 25.5 + 135 + 39 / 60;
	const means = [third - o.meanArcs[0] - o.meanArcs[1], third - o.meanArcs[1], third];
	const directions = means.map(m => m + PlanetEquant.zodiacal(m - 115.5, 0.1, 0.2).q);

	console.log(
		`his check: from 2e = 12 and the apogee at Cancer 25;30, intervals ${f(directions[1] - directions[0], 2)}°, ${f(directions[2] - directions[1], 2)}°` +
			` (observed ${f(o.longitudes[1] - o.longitudes[0], 2)}°, ${f(o.longitudes[2] - o.longitudes[1], 2)}°)`
	);
}

/* ==========================================================================
   7. RESIDUAL
   ========================================================================== */

title('Residual: the epicycle turned by the real Sun, its direction and distance, instead of the mean Sun');
{
	// at an opposition to the real Sun the planet is again on the line OK
	const sunOf = jd => Ephem.sun(jd, { apparent: false });
	const withSun = p => jd => {
		const s = PlanetEquant.state(p, jd);
		const K = [s.rho * cos(s.centreLongitude), s.rho * sin(s.centreLongitude)];
		const sv = sunOf(jd);
		const R = p.r * sv.dist;

		return norm360(atan2d(K[1] + R * sin(sv.lon), K[0] + R * cos(sv.lon)));
	};
	const realOppositions = roots(jd => norm180(lon(jd) - Ephem.sun(jd).lon - 180), FIT_START, DATA_END, 2);
	const a = leastSquares(
		x => directionResiduals(modern({ L0: x[0], apogee: x[1], e: x[2] }), realOppositions),
		[MARS_FIT.L0, MARS_FIT.apogee, MARS_FIT.e]
	);
	const p = modern({ L0: a.x[0], apogee: a.x[1], e: a.x[2], r: MARS_FIT.r });

	p.r = leastSquares(
		x =>
			fitLoops.map(l => {
				const fn = withSun(Object.assign({}, p, { r: x[0] }));
				const motion = t => norm180(fn(t + 0.25) - fn(t - 0.25)) / 0.5;
				const stations = roots(motion, l.middle - 90, l.middle + 90, 1);

				return norm180(fn(stations[0]) - fn(stations[1])) - l.arc;
			}),
		[p.r],
		8
	).x[0];

	const e1 = errors(withSun(p), FIT_START, DATA_END, 1);
	const second = (p.e * p.e * R2D) / 4;

	console.log(
		`refitted: e = ${f(p.e, 4)}, apogee ${f(p.apogee, 1)}°, r = ${f(p.r, 4)}; within ${f(arcmin(e1.max), 0)}' (rms ${f(arcmin(e1.rms), 0)}') over 2010 - 2025`
	);
	console.log(`(a check, not a fit: the reference's ellipse of Mars has e = ${f(Ephem.ELEMENTS.mars.at[1], 4)})`);
	console.log(
		`second order: e^2 / 4 = ${f(arcmin(second), 1)}' (exact ${f(arcmin(comparison(p.e).dq), 1)}'); near opposition times 1 / (1 - r) = ${f(1 / (1 - p.r), 2)}: ${f(arcmin(second) / (1 - p.r), 0)}'`
	);
}

/* ==========================================================================
   8. EXERCISES
   ========================================================================== */

title("Exercise 1: the equant and Kepler's ellipse, Mars (e = 0.1005) and the Sun");
{
	const e = MARS_FIT.e;
	const c = comparison(e);
	const second = (e * e * R2D) / 4;

	console.log(
		`Mars, e = ${f(e, 4)}: e^2/4 = ${f(arcmin(second), 1)}' (exact ${f(arcmin(c.dq), 1)}' at M = ${f(c.atM, 0)}°);` +
			` the eccentric 3e^2/4 = ${f(arcmin(3 * second), 1)}' (exact ${f(arcmin(c.dqEccentric), 1)}'); distance e^2/2 = ${f((e * e) / 2, 4)} (exact ${f(c.dd, 4)})`
	);

	const eSun = 0.0167;

	console.log(
		`the Sun, e = ${eSun}: the equant e^2/4 = ${f(arcmin((eSun * eSun * R2D) / 4), 2)}', the eccentric 3e^2/4 = ${f(arcmin((3 * eSun * eSun * R2D) / 4), 2)}'`
	);
}

title("Exercise 2: Ptolemy's three oppositions of Mars (Almagest X 7)");
{
	const o = PlanetEquant.PTOLEMY_OPPOSITIONS;
	const solution = PlanetEquant.threeOppositions(o);

	console.log(
		`longitudes ${o.longitudes.map(x => f(x, 3)).join(', ')}°; apparent intervals ${f(o.longitudes[1] - o.longitudes[0], 3)}°,` +
			` ${f(o.longitudes[2] - o.longitudes[1], 3)}°; mean ${f(o.meanArcs[0], 3)}°, ${f(o.meanArcs[1], 3)}°`
	);
	console.log(
		`the arcs less the mean motion: ${f(o.longitudes[1] - o.longitudes[0] - o.meanArcs[0], 3)}°, ${f(o.longitudes[2] - o.longitudes[1] - o.meanArcs[1], 3)}°`
	);
	console.log(
		`first order: 2e = ${f(2 * solution.first.e, 4)} (${f(120 * solution.first.e, 1)} where the deferent is 60), apogee ${f(solution.first.apogee, 1)}°`
	);

	// the first order puts the observed longitudes where the mean ones belong:
	// at the exact solution they differ by q at each opposition
	const e = solution.exact.e;
	const Ms = [solution.exact.M - o.meanArcs[0] - o.meanArcs[1], solution.exact.M - o.meanArcs[1], solution.exact.M];

	console.log(
		`the observed less the mean longitudes (q) at the three: ${Ms.map(M => f(PlanetEquant.zodiacal(M, e, 2 * e).q, 2)).join(', ')}°`
	);
	console.log(
		`exact: 2e = ${f(2 * solution.exact.e, 5)} (${sexagesimal(120 * solution.exact.e)}), apogee ${f(solution.exact.apogee, 2)}° = Cancer ${sexagesimal(solution.exact.apogee - 90)};` +
			` the mean anomaly at the third ${f(solution.exact.M, 2)}° (Ptolemy 135;39 = ${f(135 + 39 / 60, 2)}°); residual ${f(solution.exact.residual * 3600, 3)}"`
	);
}

title('Exercise 3: the loops at the apsides, OC moved between O and Q (Figure 4)');
{
	const { equant, r } = MARS_SEPARATE;

	[0, MARS_SEPARATE.centre, equant].forEach(c => {
		const apogee = PlanetEquant.loopAt(0, c, equant, r, N, N_SUN);
		const perigee = PlanetEquant.loopAt(180, c, equant, r, N, N_SUN);

		console.log(
			`OC = ${f(c, 4)}: at the apogee ${f(apogee.arc, 1)}° in ${f(apogee.days, 0)} d; at the perigee ${f(perigee.arc, 1)}° in ${f(perigee.days, 0)} d`
		);
	});

	const p = PlanetEpicycle.PTOLEMY.mars;
	const nSun = p.n + p.nMu;
	const apogee = PlanetEquant.loopAt(0, 0.1, 0.2, PTOLEMY.r, p.n, nSun);
	const perigee = PlanetEquant.loopAt(180, 0.1, 0.2, PTOLEMY.r, p.n, nSun);

	console.log(
		`Ptolemy's model: at the apogee ${f(apogee.arc, 2)}° in ${f(apogee.days, 1)} d, at the perigee ${f(perigee.arc, 2)}° in ${f(perigee.days, 1)} d` +
			` (XII 4: 19;53,32 = ${f(19 + 53 / 60 + 32 / 3600, 2)}° in 80 d, 11;12,14 = ${f(11 + 12 / 60 + 14 / 3600, 2)}° in 64 1/2 d)`
	);
}

/* ==========================================================================
   9. THE SCALES OF THE FIGURES
   ========================================================================== */

title('Scales');
{
	// Figure 2(b): the distance OK of the equant and of the eccentric with
	// the same OQ
	[0.2, MARS_FIT.e].forEach(e => {
		const apogee = PlanetEquant.loopAt(0, e, 2 * e, MARS_FIT.r, N, N_SUN);
		const perigee = PlanetEquant.loopAt(180, e, 2 * e, MARS_FIT.r, N, N_SUN);

		console.log(
			`Figure 2, e = ${f(e, 4)}: OK of the eccentric with the same directions from ${f(1 - 2 * e, 3)} to ${f(1 + 2 * e, 3)};` +
				` loops at the apogee ${f(apogee.arc, 1)}°, at the perigee ${f(perigee.arc, 1)}°`
		);
	});
	console.log(
		`(at e = 0.25 the loop at the perigee: ${f(PlanetEquant.loopAt(180, 0.25, 0.5, MARS_FIT.r, N, N_SUN).arc, 1)}°)`
	);

	// Figure 3(b): the differences from the ellipse, per view
	[0.3, MARS_FIT.e].forEach(e => {
		const c = comparison(e);

		console.log(
			`Figure 3(b), e = ${f(e, 4)}: equant - ellipse up to ${f(arcmin(c.dq), 1)}', eccentric - ellipse up to ${f(arcmin(c.dqEccentric), 1)}'`
		);
	});

	// Figure 4: every OC of the slider, with MARS_SEPARATE's OQ and r
	const { equant, r } = MARS_SEPARATE;
	let low = Infinity;
	let high = -Infinity;
	let qLow = Infinity;
	let qHigh = -Infinity;

	for (let c = 0; c <= equant + 1e-9; c += equant / 40) {
		for (let M = 0; M < 360; M += 5) {
			const loop = PlanetEquant.loopAt(M, c, equant, r, N, N_SUN);
			const z = PlanetEquant.zodiacal(M, c, equant);

			low = Math.min(low, loop.arc);
			high = Math.max(high, loop.arc);
			qLow = Math.min(qLow, z.q);
			qHigh = Math.max(qHigh, z.q);
		}
	}

	const dots = fitOppositions.map(jd => norm180(lon(jd) - PlanetEquant.state(MARS_SEPARATE, jd).meanLongitude));

	console.log(
		`Figure 4: OC in [0, OQ]: arcs ${f(low, 1)} to ${f(high, 1)}°; zodiacal equation ${f(qLow, 2)} to ${f(qHigh, 2)}°; the dots ${range(dots, 2)}°`
	);

	// Figure 6: the equant's arcs and intervals round the zodiac
	const arcs = [];
	const intervals = [];

	for (let M = 0; M < 360; M += 2) {
		arcs.push(PlanetEquant.loopAt(M, MARS_FIT.e, 2 * MARS_FIT.e, MARS_FIT.r, N, N_SUN).arc);
		intervals.push(PlanetEquant.oppositionInterval(M, MARS_FIT.e, 2 * MARS_FIT.e, N, N_SUN));
	}

	console.log(`Figure 6: the equant's arcs ${range(arcs, 2)}°, intervals ${range(intervals, 1)} days`);

	// the dots of Figure 6(b): the intervals between the geometric
	// oppositions to the mean Sun that the page computes
	const geometric = roots(
		jd => norm180(Ephem.position('mars', jd, { apparent: false }).lon - meanSun(jd) - 180),
		DATA_START,
		DATA_END,
		2
	);

	console.log(
		`Figure 6(b): intervals between the geometric oppositions to the mean Sun ${range(
			geometric.slice(1).map((jd, i) => jd - geometric[i]),
			1
		)} days`
	);
}
