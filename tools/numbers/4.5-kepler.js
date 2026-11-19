/* ==========================================================================
   NUMBERS FOR PAGE 4.5 "KEPLER" (tools/numbers/4.5-kepler.js)
   Loads the site's shared code (common, time, ephemeris, the VSOP87
   reference of the page and the models mean-sun.js, precession.js,
   solar-eccentric.js, planet-epicycle.js, planet-equant.js,
   planet-arrangement.js and kepler.js) in a Node vm context and prints
   every number quoted on the page, in page order.

   The reference of the page: Ephem with { theory: 'vsop87' } for the Sun
   and Mars (the site's Standish planets are Kepler ellipses, STRUCTURE.md
   page 4.5). Observations and fits use it; so do the tests.

   Run from the repository root:  node tools/numbers/4.5-kepler.js
   (about a minute: the long tests sample the VSOP87 series often)

   TABLE OF CONTENTS
	 1. Loading the shared code
	 2. Helpers
	 3. The reference of the page
	 4. Lead: page 4.2's Mars
	 5. Observation: the Sun's speed and size; Mars triangulated
	 6. Model: the ellipse, the area law, the third law
	 7. Fit: the Sun's ellipse; Mars' ellipse
	 8. Test: Mars, its distances, the Sun, every model
	 9. Residual: what the ellipses leave; the Moon after Kepler
	 10. Exercises
	 11. The scales of the figures
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
	'shared/vsop87-data.js',
	'shared/vsop87.js',
	'shared/models/mean-sun.js',
	'shared/models/precession.js',
	'shared/models/solar-eccentric.js',
	'shared/models/lunar-epicycle.js',
	'shared/models/lunar-latitude.js',
	'shared/models/planet-epicycle.js',
	'shared/models/planet-equant.js',
	'shared/models/planet-arrangement.js',
	'shared/models/kepler.js'
]);
const { norm180, norm360, sin, cos, atan2d, Time, Ephem, MeanSun, Precession } = shared;
const { SolarEccentric, LunarEpicycle, LunarLatitude, PlanetEpicycle, PlanetEquant, PlanetArrangement, Kepler } =
	shared;
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
const JD = (y, m, d) => Time.julianDay(y, m, d);
const date = jd => Time.formatDate(jd);
const arcmin = degrees => degrees * 60;

/* The roots of fn in [start, end], found by stepping and bisection; a
   jump of more than 90 (a longitude wrapping) is not a root. */
function roots(fn, start, end, step) {
	const found = [];
	let x0 = start;
	let f0 = fn(start);

	for (let x = start + step; x <= end; x += step) {
		const f1 = fn(x);

		if (f0 * f1 < 0 && Math.abs(f0 - f1) < 90) {
			let a = x0;
			let b = x;
			let fa = f0;

			for (let i = 0; i < 50; i++) {
				const m = (a + b) / 2;
				const fm = fn(m);

				if (fa * fm <= 0) {
					b = m;
				} else {
					a = m;
					fa = fm;
				}
			}

			found.push((a + b) / 2);
		}

		x0 = x;
		f0 = f1;
	}

	return found;
}

/* The solution of A x = b by Gauss - Jordan elimination. */
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
			const h = 1e-7 * Math.max(1, Math.abs(x[j]));
			const moved = x.slice();

			moved[j] += h;

			return residuals(moved).map((v, i) => (v - r0[i]) / h);
		});
		const A = x.map((_, a) => x.map((__, b) => J[a].reduce((s, v, i) => s + v * J[b][i], 0)));
		const g = J.map(row => row.reduce((s, v, i) => s - v * r0[i], 0));
		const dx = solve(A, g);

		x = x.map((v, i) => v + dx[i]);

		if (maxAbs(dx) < 1e-12) {
			break;
		}
	}

	return { x, residuals: residuals(x) };
}

/* The largest and rms error of a model against a reference. */
function errors(fn, ref, start, end, step) {
	let max = 0;
	let when = start;
	const all = [];

	for (let jd = start; jd < end; jd += step) {
		const d = norm180(fn(jd) - ref(jd));

		all.push(d);

		if (Math.abs(d) > max) {
			max = Math.abs(d);
			when = jd;
		}
	}

	return { max, rms: rms(all), when };
}

const showError = (label, e) =>
	console.log(`${label}: within ${f(arcmin(e.max), 2)}' (${date(e.when)}), rms ${f(arcmin(e.rms), 2)}'`);

/* ==========================================================================
   3. THE REFERENCE OF THE PAGE
   ========================================================================== */

const VSOP = { theory: 'vsop87' };

/* fn, remembering its values: the tests ask for the reference at the
   same dates for several models. */
function remembered(fn) {
	const cache = new Map();

	return jd => {
		if (!cache.has(jd)) {
			cache.set(jd, fn(jd));
		}

		return cache.get(jd);
	};
}

const sunRef = remembered(jd => Ephem.sun(jd, VSOP));
const sunLon = jd => sunRef(jd).lon;
const marsRef = remembered(jd => Ephem.planet('mars', jd, VSOP));
const marsLon = jd => marsRef(jd).lon;
const marsHelio = jd => Ephem.heliocentric('mars', jd, VSOP);

title('The reference: VSOP87 against the site reference (Standish), 1926 - 2126');
{
	let sun = 0;
	let mars = 0;

	for (let jd = JD(1926, 1, 1); jd < JD(2126, 1, 1); jd += 3) {
		sun = Math.max(sun, Math.abs(norm180(sunLon(jd) - Ephem.sun(jd).lon)));
		mars = Math.max(mars, Math.abs(norm180(marsLon(jd) - Ephem.longitude('mars', jd))));
	}

	console.log(`the Sun differs by up to ${f(arcmin(sun), 2)}', Mars by up to ${f(arcmin(mars), 2)}'`);
	console.log('VSOP87 against JPL Horizons (DE441): node tools/make-vsop87.js (Mars from the Earth within 0.61")');
}

/* ==========================================================================
   4. LEAD: PAGE 4.2'S MARS
   ========================================================================== */

const FIT_START = JD(2010, 1, 1);
const FIT_END = JD(2026, 1, 1);
const equant = PlanetEquant.make(PlanetEquant.MARS_FIT);

title("Lead: page 4.2's equant, 2010 - 2025, against page 4.2's reference");
showError(
	'equant',
	errors(equant, jd => Ephem.longitude('mars', jd), FIT_START, FIT_END, 1)
);
console.log("(page 4.2's residual, the epicycle turned by the real Sun: 32', e = 0.0935, tools/numbers/4.2-equant.js)");

/* ==========================================================================
   5. OBSERVATION
   ========================================================================== */

title("Observation (a): the Sun's daily motion and apparent diameter, 2025 (Figure 1)");

/* The Sun's radius at 1 au (arcsec), as Meeus and the IAU. */
const SUN_RADIUS = 959.63;
const sunDays = [];

for (let jd = JD(2025, 1, 1); jd < JD(2026, 1, 1); jd += 1) {
	const s = sunRef(jd);

	sunDays.push({
		jd,
		speed: norm180(sunLon(jd + 0.5) - sunLon(jd - 0.5)),
		dist: s.dist,
		diameter: (2 * SUN_RADIUS) / s.dist / 60
	});
}
{
	const sp = sunDays.map(d => d.speed);
	const di = sunDays.map(d => d.diameter);
	const spread = list => Math.max(...list) / Math.min(...list) - 1;
	const r2v = sunDays.map(d => d.speed * d.dist * d.dist);
	const r1v = sunDays.map(d => d.speed * d.dist);
	const pct = list => list.map(x => 100 * (x / mean(list) - 1));

	console.log(
		`daily motion ${f(Math.min(...sp), 4)}° to ${f(Math.max(...sp), 4)}° (${f(100 * spread(sp), 1)}% apart)`
	);
	console.log(
		`apparent diameter ${f(Math.min(...di), 2)}' to ${f(Math.max(...di), 2)}' (${f(100 * spread(di), 1)}% apart)`
	);
	console.log(
		`speed x distance^2 constant within ${f(100 * spread(r2v), 2)}%; speed x distance varies by ${f(100 * spread(r1v), 1)}%`
	);
	console.log(
		`in percent from the mean: speed ${f(Math.min(...pct(sp)), 2)} to ${f(Math.max(...pct(sp)), 2)}, diameter ${f(
			Math.min(...pct(di)),
			2
		)} to ${f(Math.max(...pct(di)), 2)}, diameter^2 ${f(Math.min(...pct(di.map(x => x * x))), 2)} to ${f(
			Math.max(...pct(di.map(x => x * x))),
			2
		)}`
	);
	const fastest = sunDays.reduce((a, b) => (b.speed > a.speed ? b : a));
	const slowest = sunDays.reduce((a, b) => (b.speed < a.speed ? b : a));

	console.log(`fastest ${date(fastest.jd)}, slowest ${date(slowest.jd)}`);
}

title('Observation (b): Mars triangulated from pairs one sidereal period apart, 2010 - 2025 (Figure 2)');

/* Mars' sidereal period from page 4.1's mean motion and page 2.3's
   precession. */
const P_MARS = Kepler.siderealPeriod(PlanetEpicycle.MARS_FIT.n);
const P_PREC = Kepler.PRECESSION_PER_DAY;

/* The smallest angle between the two lines of sight of a pair (deg). */
const TRIANGLE_ANGLE = 20;

/* The triangulated points: a first sighting every 10 days from 2010,
   each with its second P_MARS later (before 2026). */
const triangulated = Kepler.triangulatePath({
	sun: sunRef,
	planet: marsLon,
	start: FIT_START,
	end: FIT_END,
	step: 10,
	period: P_MARS,
	precession: P_PREC,
	minAngle: TRIANGLE_ANGLE
});

triangulated.forEach(q => {
	q.ref = marsHelio(q.t).r;
});
console.log(
	`sidereal period ${f(P_MARS, 2)} days; ${triangulated.length} pairs whose lines cross at ${TRIANGLE_ANGLE}° or more`
);
console.log(
	`distances ${f(Math.min(...triangulated.map(q => q.r)), 3)} to ${f(Math.max(...triangulated.map(q => q.r)), 3)} au;` +
		` within ${f(maxAbs(triangulated.map(q => q.r - q.ref)), 4)} au of the reference's`
);

const apsides = Kepler.apsidalCircle(triangulated);
{
	const below = triangulated.map(q => q.r - apsides.along(q.lon));

	triangulated.forEach((q, i) => {
		q.belowCircle = below[i];
	});
	console.log(
		`the line of the apsides at ${f(apsides.line, 1)}°; farthest ${f(apsides.rFar, 4)} au, nearest ${f(apsides.rNear, 4)} au`
	);
	console.log(
		`the points against the circle through the apsides: ${f(Math.min(...below), 4)} to ${f(Math.max(...below), 4)} au`
	);
}

/* ==========================================================================
   6. MODEL
   ========================================================================== */

title('Model: the ellipse and the area law, for Mars and for the Sun');
{
	const em = Kepler.MARS_FIT.e;
	const es = Kepler.SUN_2026.e;
	const ratio = e => (1 + e) / (1 - e);

	console.log(
		`Mars, e = ${f(em, 4)}: distance ratio ${f(ratio(em), 3)}, speed ratio about the Sun ${f(ratio(em) ** 2, 3)}`
	);
	console.log(`the Sun, e = ${f(es, 4)}: distance ratio ${f(ratio(es), 4)}, speed ratio ${f(ratio(es) ** 2, 4)}`);
	console.log(
		`Mars: b / a = ${f(Math.sqrt(1 - em * em), 5)}, a - b = ${f(1 - Math.sqrt(1 - em * em), 5)} a = ${f(
			(1 - Math.sqrt(1 - em * em)) * Kepler.MARS_FIT.a,
			4
		)} au (a e^2 / 2 = ${f((Kepler.MARS_FIT.a * em * em) / 2, 4)} au)`
	);
}

title("Model: the third law against page 4.3's distances");

/* The sidereal year: page 1.3's mean Sun and page 2.3's precession. */
const YS = Kepler.siderealPeriod(MeanSun.MODERN.n);
const Y = MeanSun.yearLength(MeanSun.MODERN);

console.log(`sidereal year ${f(YS, 4)} days`);
Object.entries(PlanetArrangement.FIT).forEach(([name, v]) => {
	const kind = name === 'mercury' || name === 'venus' ? 'inner' : 'outer';
	const tropical = PlanetArrangement.periodAboutSun(kind, v.S, Y);
	const P = Kepler.siderealPeriod(360 / tropical);
	const law = Kepler.thirdLaw(P, YS);

	console.log(
		`${name.padEnd(8)} a ${f(v.a, 4)} au, P ${f(P / YS, 4)} years: P^2 / a^3 ${f((P / YS) ** 2 / v.a ** 3, 3)};` +
			` a from the law ${f(law, 4)} (page 4.3 ${f(100 * (v.a / law - 1), 2)}%)`
	);
});

/* ==========================================================================
   7. FIT
   ========================================================================== */

title("Fit: the Sun's ellipse from the seasons of 2026 (page 2.1's method with Kepler's equation)");

/* The moments the Sun crosses 0°, 90° and 180° in a year. */
function seasons(year) {
	const cross = (target, month) =>
		roots(jd => norm180(sunLon(jd) - target), JD(year, month, 1), JD(year, month + 1, 1), 1)[0];
	const t0 = cross(0, 3);
	const t1 = cross(90, 6);
	const t2 = cross(180, 9);

	return { t0, spring: t1 - t0, summer: t2 - t1 };
}

const N_SUN = MeanSun.MODERN.n;
const seasons2026 = seasons(2026);
const sunFit = Kepler.fitSeasons(seasons2026.spring, seasons2026.summer, N_SUN);

/* The mean longitude at the equinox, carried back to J2000, and the
   apogee at J2000 on page 2.3's rate. */
const sunL0 = norm360(
	sunFit.apogee + Kepler.meanAnomalyAt(0, sunFit.e, sunFit.apogee) - N_SUN * (seasons2026.t0 - J2000)
);
const sunApogeeJ2000 = sunFit.apogee - Kepler.SUN_APOGEE_RATE * (seasons2026.t0 - J2000);

console.log(
	`spring equinox ${date(seasons2026.t0)}; spring ${f(seasons2026.spring, 3)} d, summer ${f(seasons2026.summer, 3)} d`
);
console.log(
	`e = ${f(sunFit.e, 6)}, apogee ${f(sunFit.apogee, 3)}° (Newton, ${sunFit.steps} steps);` +
		` page 2.1's eccentric: e = ${SolarEccentric.FIT_2026.e} (= 2 x ${f(SolarEccentric.FIT_2026.e / 2, 5)}), apogee ${SolarEccentric.FIT_2026.apogee}°`
);
console.log(`L0 (J2000) = ${f(sunL0, 6)}°; apogee at J2000 ${f(sunApogeeJ2000, 5)}° (for Kepler.SUN_2026)`);
{
	const es = [];
	const as = [];

	for (let year = 2016; year <= 2025; year++) {
		const s = seasons(year);
		const fit = Kepler.fitSeasons(s.spring, s.summer, N_SUN);

		es.push(fit.e);
		as.push(fit.apogee + Kepler.SUN_APOGEE_RATE * (seasons2026.t0 - s.t0));
	}

	console.log(
		`each year of 2016 - 2025 alone: e ${f(Math.min(...es), 5)} to ${f(Math.max(...es), 5)},` +
			` apogee (carried to 2026) ${f(Math.min(...as), 2)}° to ${f(Math.max(...as), 2)}°`
	);
}
{
	const k = Kepler.SUN_2026;

	console.log(
		`check Kepler.SUN_2026: L0 ${k.L0} (${f(arcmin(norm180(k.L0 - sunL0)) * 60, 2)}"), apogee ${k.apogee}, e ${k.e}`
	);
}

title('Fit: Mars from its oppositions to the real Sun, 2010 - 2025');

const oppositions = roots(jd => norm180(marsLon(jd) - sunLon(jd) - 180), FIT_START, FIT_END, 2);

oppositions.forEach(jd =>
	console.log(
		`${date(jd).padEnd(12)} ecliptic longitude ${f(marsLon(jd), 3)}°  (heliocentric ${f(marsHelio(jd).lon, 3)}°)`
	)
);

const N_MARS = PlanetEpicycle.MARS_FIT.n;
const marsSet = x => ({
	L0: x[0],
	n: N_MARS,
	epoch: J2000,
	apogee: x[1],
	apogeeRate: P_PREC,
	e: x[2],
	a: 1
});
const marsFit = leastSquares(
	x => oppositions.map(jd => norm180(Kepler.state(marsSet(x), jd).longitude - marsLon(jd))),
	[355.4, 156, 0.093]
);
const A_MARS = Kepler.thirdLaw(P_MARS, YS);

console.log(
	`${oppositions.length} oppositions: L0 ${f(marsFit.x[0], 6)}°, aphelion (J2000) ${f(marsFit.x[1], 5)}°, e ${f(
		marsFit.x[2],
		6
	)}; within ${f(arcmin(maxAbs(marsFit.residuals)), 2)}' of the oppositions`
);
console.log(`n = ${N_MARS} (page 4.1); P = ${f(P_MARS, 3)} d = ${f(P_MARS / YS, 5)} years; a = ${f(A_MARS, 6)} au`);
console.log(
	`(page 4.2's refit with the real Sun: e = 0.0935; page 4.3's distance ${f(1 / PlanetEquant.MARS_FIT.r, 4)} au)`
);
{
	const k = Kepler.MARS_FIT;

	console.log(
		`check Kepler.MARS_FIT: L0 ${k.L0} (${f(arcmin(norm180(k.L0 - marsFit.x[0])) * 60, 2)}"), apogee ${k.apogee}, e ${k.e}, a ${k.a}`
	);
}

/* ==========================================================================
   8. TEST
   ========================================================================== */

const kepler = Kepler.make();

title('Test: Mars against the reference (Figure 4)');
{
	const k16 = errors(kepler, marsLon, FIT_START, FIT_END, 1);
	const k200 = errors(kepler, marsLon, JD(1926, 1, 1), JD(2126, 1, 1), 2);
	const q16 = errors(equant, marsLon, FIT_START, FIT_END, 1);
	const q200 = errors(equant, marsLon, JD(1926, 1, 1), JD(2126, 1, 1), 2);

	showError('Kepler 2010 - 2025', k16);
	showError('Kepler 1926 - 2126', k200);
	console.log(
		`page 4.2's equant on this reference: 2010 - 2025 within ${f(q16.max, 2)}°; 1926 - 2126 within ${f(q200.max, 2)}°`
	);
	console.log(
		`(on page 4.2's reference: ${f(errors(equant, jd => Ephem.longitude('mars', jd), FIT_START, FIT_END, 1).max, 2)}°)`
	);
}

title("Test: Mars' distances");
{
	let worst = 0;
	let when = FIT_START;
	let worstQ = 0;

	for (let jd = FIT_START; jd < FIT_END; jd += 1) {
		const d = Math.abs(Kepler.geocentric(Kepler.MARS_FIT, Kepler.SUN_2026, jd).dist - marsRef(jd).dist);

		if (d > worst) {
			worst = d;
			when = jd;
		}

		const m = PlanetArrangement.moment('mars', jd).heliostatic;

		worstQ = Math.max(worstQ, Math.abs(Math.hypot(m.P[0] - m.O[0], m.P[1] - m.O[1]) - marsRef(jd).dist));
	}

	console.log(
		`from the Earth: within ${f(worst, 4)} au (${date(when)}); page 4.3's equant on this reference ${f(worstQ, 4)} au`
	);
	const off = triangulated.map(q => q.r - Kepler.state(Kepler.MARS_FIT, q.t).distance);

	console.log(`the triangulated distances within ${f(maxAbs(off), 4)} au of the ellipse`);
}

title("Test: the Sun's ellipse against the reference (Figure 5)");
{
	const ellipse = Kepler.makeSun();
	const ghost = SolarEccentric.make(SolarEccentric.MOVING_2026);
	const spans = [
		['2026', JD(2026, 1, 1), JD(2027, 1, 1), 1],
		['1976 - 2076', JD(1976, 1, 1), JD(2076, 1, 1), 2],
		['1526 - 2526', JD(1526, 1, 1), JD(2526, 1, 1), 5]
	];

	spans.forEach(([label, a, b, step]) => {
		const e1 = errors(ellipse, sunLon, a, b, step);
		const e2 = errors(ghost, sunLon, a, b, step);

		console.log(
			`${label}: ellipse within ${f(arcmin(e1.max), 2)}', page 2.1's eccentric (moving apogee) ${f(arcmin(e2.max), 2)}'`
		);
	});
	console.log(
		`(page 2.1's eccentric fitted to 2026, fixed apogee, in 2026: ${f(
			arcmin(errors(SolarEccentric.make(SolarEccentric.FIT_2026), sunLon, JD(2026, 1, 1), JD(2027, 1, 1), 1).max),
			2
		)}')`
	);

	let real = [9, 0];
	let model = [9, 0];
	let ecc = [9, 0];

	for (let jd = JD(2026, 1, 1); jd < JD(2027, 1, 1); jd += 0.5) {
		const r = sunRef(jd).dist;
		const s = Kepler.state(Kepler.SUN_2026, jd).distance;
		const st = SolarEccentric.state(SolarEccentric.FIT_2026, jd);
		const c = Math.sqrt(1 + 2 * SolarEccentric.FIT_2026.e * cos(st.M) + SolarEccentric.FIT_2026.e ** 2);

		real = [Math.min(real[0], r), Math.max(real[1], r)];
		model = [Math.min(model[0], s), Math.max(model[1], s)];
		ecc = [Math.min(ecc[0], c), Math.max(ecc[1], c)];
	}

	const show = (label, [a, b]) => `${label} ${f(a, 5)} to ${f(b, 5)} (ratio ${f(b / a, 4)})`;

	console.log(
		`distance in 2026: ${show('real', real)}; ${show('ellipse', model)}; ${show("page 2.1's eccentric", ecc)}`
	);
}

title('Test: every model of the Sun (2026) and of Mars (2010 - 2025) (Figure 6)');

const SUMMARY = [
	['Sun', 'uniform (1.3)', MeanSun.make(MeanSun.MODERN)],
	['Sun', 'eccentric (2.1)', SolarEccentric.make(SolarEccentric.FIT_2026)],
	['Sun', 'ellipse (4.5)', Kepler.makeSun()],
	['Mars', 'uniform (4.1)', PlanetEpicycle.makeUniform(PlanetEpicycle.MARS_FIT)],
	['Mars', 'epicycle (4.1)', PlanetEpicycle.make(PlanetEpicycle.MARS_FIT)],
	['Mars', 'equant (4.2)', equant],
	['Mars', 'epicyclet (4.3)', PlanetArrangement.makeEpicyclet()],
	['Mars', 'ellipses (4.5)', kepler]
];

SUMMARY.forEach(([body, label, fn]) => {
	const e =
		body === 'Sun'
			? errors(fn, sunLon, JD(2026, 1, 1), JD(2027, 1, 1), 1)
			: errors(fn, marsLon, FIT_START, FIT_END, 1);

	console.log(`${body.padEnd(5)} ${label.padEnd(16)} ${f(arcmin(e.max), 3)}' = ${f(e.max, 3)}°`);
});

/* ==========================================================================
   9. RESIDUAL
   ========================================================================== */

title('Residual: the aphelion turning, fitted to the oppositions of 1931 - 1946 and 2010 - 2025');
{
	const early = roots(jd => norm180(marsLon(jd) - sunLon(jd) - 180), JD(1931, 1, 1), JD(1947, 1, 1), 2);
	const all = early.concat(oppositions);
	const set = x => ({ L0: x[0], n: x[1], epoch: J2000, apogee: x[2], apogeeRate: x[3] / 36525, e: x[4], a: 1 });
	const fit = leastSquares(
		x => all.map(jd => norm180(Kepler.state(set(x), jd).longitude - marsLon(jd))),
		[355.44, N_MARS, 156.1, 1.4, 0.0934]
	);
	const turning = Object.assign(set(fit.x), { a: Kepler.thirdLaw(Kepler.siderealPeriod(fit.x[1]), YS) });
	const stars = fit.x[3] - Precession.MODERN.rate * 100;

	console.log(
		`${all.length} oppositions: the aphelion turns ${f(fit.x[3], 3)}° a century relative to the equinox, ${f(stars, 2)}° among the stars; e ${f(
			fit.x[4],
			5
		)}`
	);
	showError(
		'1926 - 2126 with the turning aphelion',
		errors(Kepler.make(turning), marsLon, JD(1926, 1, 1), JD(2126, 1, 1), 2)
	);
}

title("Residual: the tilt of Mars' plane (1.85°), in heliocentric ecliptic longitude");
{
	const i = 1.85;
	let worst = 0;

	for (let u = 0; u < 360; u += 0.5) {
		worst = Math.max(worst, Math.abs(norm180(atan2d(cos(i) * sin(u), cos(u)) - u)));
	}

	console.log(`at most ${f(arcmin(worst), 1)}'`);
	showError(
		"Mars' heliocentric ecliptic longitude, ellipse against the reference, 2010 - 2025",
		errors(
			jd => Kepler.state(Kepler.MARS_FIT, jd).longitude,
			jd => marsHelio(jd).lon,
			FIT_START,
			FIT_END,
			1
		)
	);
}

title('Residual: the Earth about the Earth - Moon center of mass, seen from the Sun, 2026');
{
	// the Earth's offset from the Earth - Moon barycenter: the Moon's
	// distance divided by 1 + 81.30056 (ephemeris.js), as an angle at 1 au
	let worst = 0;

	for (let jd = JD(2026, 1, 1); jd < JD(2027, 1, 1); jd += 0.25) {
		const offset = Ephem.moon(jd).dist / (1 + 81.30056) / Ephem.AU_KM / sunRef(jd).dist;

		worst = Math.max(worst, offset);
	}

	console.log(
		`the Earth swings up to ${f(worst * R2D * 3600, 1)}" about the center of mass each month, seen from the Sun`
	);

	// the ellipse's error over 2026, after a running mean over one synodic
	// month: what is left without the monthly wobble
	const ellipse = Kepler.makeSun();
	const daily = [];

	for (let jd = JD(2026, 1, 1) - 15; jd < JD(2027, 1, 1) + 15; jd += 1) {
		daily.push(norm180(ellipse(jd) - sunLon(jd)));
	}

	const smooth = [];

	for (let i = 15; i < daily.length - 15; i++) {
		smooth.push(mean(daily.slice(i - 15, i + 15)));
	}

	console.log(
		`the ellipse's error over 2026 averaged over a month: ${f(arcmin(Math.min(...smooth)), 2)}' to ${f(arcmin(Math.max(...smooth)), 2)}'`
	);
}

title('Residual: the nutation in 2026');
{
	let worst = 0;

	for (let jd = JD(2026, 1, 1); jd < JD(2027, 1, 1); jd += 1) {
		worst = Math.max(worst, Math.abs(Ephem.nutation(jd).dpsi));
	}

	console.log(`up to ${f(worst * 3600, 1)}"`);
}

title('Residual: the Moon after Kepler (Meeus, Table 47.A; pages 3.1 - 3.3)');
console.log("ellipse's term 6.288774° sin M' = 6.29°; evection 1.274027° = 1.27°; variation 0.658314° = 0.66°");
console.log(`annual equation 0.185116° = ${f(0.185116 * 60, 0)}'`);
console.log(
	`the perigee turns once in ${f(360 / (LunarEpicycle.MEEUS.n - LunarEpicycle.MEEUS.nM) / 365.25, 2)} years,` +
		` the nodes in ${f(360 / (LunarLatitude.MEEUS.nF - LunarEpicycle.MEEUS.n) / 365.25, 2)} years`
);

/* ==========================================================================
   10. EXERCISES
   ========================================================================== */

title("Exercise 1: Kepler's equation, fixed point and Newton (to 1e-8°)");
[
	['Mars', 0.0934, 30],
	['the exaggerated view of Figure 3', 0.6, 90],
	["Halley's comet", 0.967, 30]
].forEach(([name, e, M]) => {
	const fp = Kepler.fixedPoint(M, e, 1e-8);
	const nw = Kepler.newton(M, e, 1e-8);
	const s = Kepler.atAnomaly(M, e);

	console.log(
		`${name}, e = ${e}, M = ${M}°: E = ${f(s.E, 6)}°, the point (${f(s.point[0], 4)}, ${f(s.point[1], 4)}) a,` +
			` M + q = ${f(M + s.q, 4)}°, q = ${f(s.q, 4)}°, r = ${f(s.distance, 5)} a`
	);
	console.log(
		`  fixed point: ${fp.steps.length} steps; first ${fp.steps
			.slice(0, 4)
			.map(x => f(x, 4))
			.join(', ')}`
	);
	console.log(`  Newton: ${nw.steps.length} steps; ${nw.steps.map(x => f(x, 8)).join(', ')}`);
	console.log(
		`  e |cos E| = ${f(e * Math.abs(cos(s.E)), 3)}; Newton's errors ${nw.steps.map(x => (x - s.E).toExponential(1)).join(', ')}`
	);
});

title("Exercise 2: the third law with Kepler's numbers (Voelkel, ch. 4)");
[
	['Mercury', 88, 388],
	['Venus', 225, 724],
	['Earth', 365, 1000],
	['Mars', 687, 1524],
	['Jupiter', 4333, 5200],
	['Saturn', 10759, 9510]
].forEach(([name, days, thousandths]) => {
	const P = days / 365;
	const a = thousandths / 1000;

	console.log(
		`${name.padEnd(8)} P = ${f(P, 3)}, a = ${f(a, 3)}: P / a = ${f(P / a, 3)}, P^2 / a^3 = ${f((P * P) / a ** 3, 3)}`
	);
});
console.log(`Mars: P = ${f(P_MARS, 3)} d / ${f(YS, 4)} d = ${f(P_MARS / YS, 5)} years, a = ${f(A_MARS, 5)} au`);

title("Exercise 3: Kepler's first try, an eccentric circle with the area law");
{
	/* q of the circle with the area law: Kepler's equation with E = phi,
	   the direction atan2(sin phi, e + cos phi) (b = a). */
	const qCircle = (M, e) => {
		const E = Kepler.eccentricAnomaly(M, e);

		return norm180(atan2d(sin(E), e + cos(E)) - M);
	};
	const qEllipse = (M, e) => Kepler.atAnomaly(M, e).q;
	const qEquant = (M, e) => {
		const QK = -e * cos(M) + Math.sqrt(1 - e * e * sin(M) ** 2);

		return -atan2d(2 * e * sin(M), QK + 2 * e * cos(M));
	};

	/* The coefficient of sin 2M in q, in units of e^2, at a small e. */
	const coefficient = fn => {
		const e = 0.001;
		let sum = 0;

		for (let M = 0.5; M < 360; M += 1) {
			sum += fn(M, e) * sin(2 * M);
		}

		return sum / 180 / (e * e * R2D);
	};

	console.log(
		`coefficient of sin 2M: circle with the area law ${f(coefficient(qCircle), 4)} e^2, ellipse ${f(
			coefficient(qEllipse),
			4
		)} e^2, equant ${f(coefficient(qEquant), 4)} e^2`
	);

	const e = 0.0934;

	[
		['circle with the area law', qCircle],
		['equant', qEquant]
	].forEach(([name, fn]) => {
		let worst = 0;
		let at = 0;

		for (let M = 0; M < 360; M += 0.1) {
			const d = fn(M, e) - qEllipse(M, e);

			if (Math.abs(d) > Math.abs(worst)) {
				worst = d;
				at = M;
			}
		}

		console.log(
			`Mars, e = ${e}: ${name} less the ellipse up to ${f(arcmin(Math.abs(worst)), 2)}' (M = ${f(at, 1)}°)`
		);
	});
	console.log(`second order e^2 / 4 = ${f(arcmin((e * e * R2D) / 4), 2)}'; b / a = ${f(Math.sqrt(1 - e * e), 5)}`);
}

/* ==========================================================================
   11. THE SCALES OF THE FIGURES
   ========================================================================== */

title('Scales of the figures');
console.log('Figure 1: the three curves stay within ±3.5%: the axis is ±4%');
console.log(
	`Figure 2: the points within ${f(Math.max(...triangulated.map(q => q.r)), 3)} au of the Sun; against the circle ${f(
		Math.min(...triangulated.map(q => q.belowCircle)),
		4
	)} to ${f(Math.max(...triangulated.map(q => q.belowCircle)), 4)} au`
);
console.log(
	"Figure 6: from the ellipse of the Sun (0.24') to the uniform Mars (53.7°): the axis runs from 0.1' to 100°"
);
