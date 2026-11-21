/* ==========================================================================
   NUMBERS FOR THE TOOLBOX (tools/numbers/toolbox.js)
   Loads the site's shared code in a Node vm context and prints every
   number the toolbox quotes, in page order: the ellipses of Mercury,
   Venus, Jupiter and Saturn fitted by page 4.5's method, the errors of
   the calculator's models, and the largest error of every model of the
   course (the error ladder) with the bounds of its scale.

   The reference of the planets and the Sun: Ephem with
   { theory: 'vsop87' } (shared/vsop87.js, with vsop87-planets.js), since
   the site's Standish planets are ellipses themselves (STRUCTURE.md,
   page 4.5, and Epilogue). The Moon: Meeus ch. 47, the site's reference.

   Run from the repository root:  node tools/numbers/toolbox.js
   (a few minutes: the fits search a century of conjunctions)

   TABLE OF CONTENTS
	 1. Loading the shared code
	 2. Helpers
	 3. The reference
	 4. The four ellipses, fitted to a century of conjunctions
	 5. The calculator: the errors of its models
	 6. The error ladder
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
	'shared/vsop87-planets.js',
	'shared/vsop87.js',
	'shared/models/mean-sun.js',
	'shared/models/precession.js',
	'shared/models/solar-eccentric.js',
	'shared/models/lunar-epicycle.js',
	'shared/models/lunar-crank.js',
	'shared/models/lunar-latitude.js',
	'shared/models/planet-epicycle.js',
	'shared/models/planet-equant.js',
	'shared/models/planet-arrangement.js',
	'shared/models/kepler.js'
]);
const { norm180, Time, Ephem, MeanSun } = shared;
const { SolarEccentric, LunarEpicycle, LunarCrank, PlanetEpicycle, PlanetEquant, PlanetArrangement, Kepler } = shared;
const J2000 = 2451545.0;

/* ==========================================================================
   2. HELPERS
   ========================================================================== */

const title = text => console.log(`\n=== ${text} ===`);
const f = (x, digits) => x.toFixed(digits);
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
   { x, residuals } for residuals(x) -> [..]; scale[j] sets the step of
   the derivative of x[j]. */
function leastSquares(residuals, x0, scale, iterations = 40) {
	let x = x0.slice();

	for (let it = 0; it < iterations; it++) {
		const r0 = residuals(x);
		const J = x.map((_, j) => {
			const h = scale[j];
			const moved = x.slice();

			moved[j] += h;

			return residuals(moved).map((v, i) => (v - r0[i]) / h);
		});
		const A = x.map((_, a) => x.map((__, b) => J[a].reduce((s, v, i) => s + v * J[b][i], 0)));
		const g = J.map(row => row.reduce((s, v, i) => s - v * r0[i], 0));
		const dx = solve(A, g);

		x = x.map((v, i) => v + dx[i]);

		if (dx.every((v, i) => Math.abs(v) < 1e-6 * scale[i])) {
			break;
		}
	}

	return { x, residuals: residuals(x) };
}

/* The largest error (deg) of a model against a reference, and when. */
function largest(fn, ref, start, end, step) {
	let max = 0;
	let when = start;

	for (let jd = start; jd < end; jd += step) {
		const d = Math.abs(norm180(fn(jd) - ref(jd)));

		if (d > max) {
			max = d;
			when = jd;
		}
	}

	return { max, when };
}

/* fn, remembering its values. */
function remembered(fn) {
	const cache = new Map();

	return jd => {
		if (!cache.has(jd)) {
			cache.set(jd, fn(jd));
		}

		return cache.get(jd);
	};
}

/* ==========================================================================
   3. THE REFERENCE
   ========================================================================== */

const VSOP = { theory: 'vsop87' };
const sunLon = remembered(jd => Ephem.sun(jd, VSOP).lon);
const moonLon = remembered(jd => Ephem.moon(jd).lon);
const planetLon = {};

Ephem.PLANETS.slice(0, 5).forEach(name => {
	planetLon[name] = remembered(jd => Ephem.planet(name, jd, VSOP).lon);
});

/* ==========================================================================
   4. THE FOUR ELLIPSES, FITTED TO A CENTURY OF CONJUNCTIONS
   Page 4.5's method for Mars, on 1926 - 2025: at an opposition to the
   real Sun (outer planet) the planet's geocentric ecliptic longitude is
   its heliocentric one; at an inferior conjunction (inner planet) its
   heliocentric ecliptic longitude is the Earth's, the Sun's plus 180°.
   Fitted: the mean longitude L0 at J2000 and the mean motion n, the
   aphelion at J2000 (fixed among the stars, as Mars'), e. Then a from the
   third law, with the sidereal year of page 4.5.
   ========================================================================== */

const FIT_START = JD(1926, 1, 1);
const FIT_END = JD(2026, 1, 1);
const P_PREC = Kepler.PRECESSION_PER_DAY;
const YS = Kepler.siderealPeriod(MeanSun.MODERN.n);

/* The starting values: Standish's mean motions would do, but rounded
   values from the synodic periods of page 4.3 are enough. */
const START = {
	mercury: { L0: 252, n: 4.09, apogee: 257, e: 0.2 },
	venus: { L0: 181, n: 1.602, apogee: 312, e: 0.007 },
	jupiter: { L0: 34, n: 0.0831, apogee: 195, e: 0.048 },
	saturn: { L0: 50, n: 0.0335, apogee: 272, e: 0.054 }
};

/* The moments and the heliocentric ecliptic longitudes of a planet's
   oppositions (outer) or inferior conjunctions (inner) of 1926 - 2025. */
function events(name) {
	const inner = name === 'mercury' || name === 'venus';
	const lon = planetLon[name];
	const step = name === 'mercury' ? 1 : 3;
	let times;

	if (inner) {
		// an inferior conjunction: the planet passes the Sun going west,
		// so the elongation goes from positive to negative
		times = roots(jd => norm180(lon(jd) - sunLon(jd)), FIT_START, FIT_END, step).filter(
			jd => norm180(lon(jd + 1) - sunLon(jd + 1)) < norm180(lon(jd - 1) - sunLon(jd - 1))
		);

		return times.map(jd => ({ jd, lon: (sunLon(jd) + 180) % 360 }));
	}

	times = roots(jd => norm180(lon(jd) - sunLon(jd) - 180), FIT_START, FIT_END, step);

	return times.map(jd => ({ jd, lon: lon(jd) }));
}

const setOf = x => ({
	L0: x[0],
	n: x[1],
	epoch: J2000,
	apogee: x[2],
	apogeeRate: P_PREC,
	e: x[3],
	a: 1
});

title('The four ellipses, fitted to the oppositions and inferior conjunctions of 1926 - 2025');

const FITS = {};

['mercury', 'venus', 'jupiter', 'saturn'].forEach(name => {
	const list = events(name);
	const s = START[name];
	const fit = leastSquares(
		x => list.map(ev => norm180(Kepler.state(setOf(x), ev.jd).longitude - ev.lon)),
		[s.L0, s.n, s.apogee, s.e],
		[1e-5, 1e-9, 1e-5, 1e-7]
	);
	const P = Kepler.siderealPeriod(fit.x[1]);
	const a = Kepler.thirdLaw(P, YS);

	FITS[name] = Object.assign(setOf(fit.x), { a });
	console.log(
		`${name}: ${list.length} events (${date(list[0].jd)} - ${date(list[list.length - 1].jd)}); L0 ${f(fit.x[0], 6)}°,` +
			` n ${f(fit.x[1], 9)}°/day, aphelion (J2000) ${f(fit.x[2], 4)}°, e ${f(fit.x[3], 6)};` +
			` within ${f(arcmin(maxAbs(fit.residuals)), 2)}' of the events; P ${f(P, 3)} d, a ${f(a, 6)} au`
	);

	const k = Kepler.PLANETS_FIT ? Kepler.PLANETS_FIT[name] : null;

	if (k) {
		console.log(
			`  check Kepler.PLANETS_FIT.${name}: L0 ${k.L0}, n ${k.n}, apogee ${k.apogee}, e ${k.e}, a ${k.a}` +
				` (L0 off by ${f(arcmin(norm180(k.L0 - fit.x[0])) * 60, 2)}")`
		);
	}
});

/* ==========================================================================
   5. THE CALCULATOR: THE ERRORS OF ITS MODELS
   The Sun's ellipse (page 4.5), the Moon's crank (page 3.2), the five
   planets' ellipses (page 4.5 and section 4), every half day of 2026 and
   every 5 days of 1926 - 2125, against the reference.
   ========================================================================== */

title("The calculator's models: largest error in ecliptic longitude");

const CALCULATOR = [
	['Sun', Kepler.makeSun(), sunLon],
	['Moon', LunarCrank.make(LunarCrank.FIT_2026), moonLon]
].concat(
	['mercury', 'venus', 'mars', 'jupiter', 'saturn'].map(name => [
		name,
		Kepler.make(Kepler.PLANETS_FIT[name]),
		planetLon[name]
	])
);

CALCULATOR.forEach(([name, fn, ref]) => {
	const year = largest(fn, ref, JD(2026, 1, 1), JD(2027, 1, 1), 0.5);
	const span = largest(fn, ref, JD(1926, 1, 1), JD(2126, 1, 1), 5);
	const show = e => (arcmin(e.max) < 60 ? `${f(arcmin(e.max), 1)}'` : `${f(e.max, 2)}°`);

	console.log(
		`${name.padEnd(8)} 2026: ${show(year)} (${date(year.when)}); 1926 - 2125: ${show(span)} (${date(span.when)})`
	);
});

title('Why Mercury and Venus err most: the tilt of their orbits, which the ellipses leave out');

['mercury', 'venus', 'jupiter', 'saturn'].forEach(name => {
	// the inclination as the largest heliocentric ecliptic latitude over a
	// century of the reference
	let tilt = 0;

	for (let jd = FIT_START; jd < FIT_END; jd += 2) {
		tilt = Math.max(tilt, Math.abs(Ephem.heliocentric(name, jd, VSOP).lat));
	}

	const reduction = Math.pow(Math.tan(((tilt / 2) * Math.PI) / 180), 2) * (180 / Math.PI);
	const helio = largest(
		jd => Kepler.state(Kepler.PLANETS_FIT[name], jd).longitude,
		jd => Ephem.heliocentric(name, jd, VSOP).lon,
		JD(2026, 1, 1),
		JD(2027, 1, 1),
		0.5
	);

	console.log(
		`${name}: inclination ${f(tilt, 2)}°, the reduction to the ecliptic up to ${f(arcmin(reduction), 1)}';` +
			` the ellipse's heliocentric error in 2026 ${f(arcmin(helio.max), 1)}'`
	);
});

title("What the calculator leaves out: the planets' ecliptic latitudes, 2026");

['mercury', 'venus', 'mars', 'jupiter', 'saturn'].forEach(name => {
	let beta = 0;

	for (let jd = JD(2026, 1, 1); jd < JD(2027, 1, 1); jd += 0.5) {
		beta = Math.max(beta, Math.abs(Ephem.planet(name, jd, VSOP).lat));
	}

	console.log(`${name}: the reference's geocentric ecliptic latitude reaches ${f(beta, 1)}°`);
});

/* ==========================================================================
   6. THE ERROR LADDER
   The largest error of every model of the course: the Sun and the Moon
   every day of 2026, Mars every day of 2010 - 2025 (page 4.5's Figure
   6), the other planets' ellipses every day of 2026. The scale runs over
   powers of ten that cover them all.
   ========================================================================== */

title('The error ladder: the largest error of every model');

const crankNoDirection = Object.assign({}, LunarCrank.FIT_2026, { direction: false });
const LADDER = {
	'the Sun, 2026': [
		['1.3 uniform', MeanSun.make(MeanSun.MODERN)],
		['2.1 eccentric', SolarEccentric.make(SolarEccentric.FIT_2026)],
		['4.5 ellipse', Kepler.makeSun()]
	],
	'the Moon, 2026': [
		['3.1 uniform', LunarEpicycle.makeUniform(LunarEpicycle.FIT_2026)],
		['3.1 epicycle', LunarEpicycle.make(LunarEpicycle.FIT_2026)],
		['3.2 crank alone', LunarCrank.make(crankNoDirection)],
		['3.2 crank', LunarCrank.make(LunarCrank.FIT_2026)]
	],
	'Mars, 2010 - 2025': [
		['4.1 uniform', PlanetEpicycle.makeUniform(PlanetEpicycle.MARS_FIT)],
		['4.1 epicycle', PlanetEpicycle.make(PlanetEpicycle.MARS_FIT)],
		['4.2 equant', PlanetEquant.make(PlanetEquant.MARS_FIT)],
		['4.3 epicyclet', PlanetArrangement.makeEpicyclet()],
		['4.5 ellipses', Kepler.make()]
	],
	'the other planets, 2026': ['mercury', 'venus', 'jupiter', 'saturn'].map(name => [
		`${name} ellipses`,
		Kepler.make(Kepler.PLANETS_FIT[name])
	])
};
const LADDER_REF = {
	'the Sun, 2026': [sunLon, 2026, 2027],
	'the Moon, 2026': [moonLon, 2026, 2027],
	'Mars, 2010 - 2025': [planetLon.mars, 2010, 2026]
};
let smallest = Infinity;
let biggest = 0;

Object.entries(LADDER).forEach(([panel, rows]) => {
	console.log(panel);
	rows.forEach(([label, fn]) => {
		const name = label.split(' ')[0];
		const [ref, from, to] = LADDER_REF[panel] || [planetLon[name], 2026, 2027];
		const e = largest(fn, ref, JD(from, 1, 1), JD(to, 1, 1), 1);

		smallest = Math.min(smallest, arcmin(e.max));
		biggest = Math.max(biggest, arcmin(e.max));
		console.log(`  ${label.padEnd(18)} ${f(arcmin(e.max), 2)}' = ${f(e.max, 3)}°`);
	});
});
console.log(
	`from ${f(smallest, 2)}' to ${f(biggest, 0)}' (${f(biggest / 60, 1)}°): the scale runs from 0.1' to 100°, as page 4.5's`
);
