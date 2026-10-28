/* ==========================================================================
   NUMBERS FOR PAGE 3.2 "EVECTION AND THE DISTANCE PROBLEM"
   (tools/numbers/3.2-evection.js)
   Loads the site's shared code (common, time, ephemeris and the models
   mean-sun.js, solar-eccentric.js, lunar-epicycle.js, lunar-crank.js) in
   a Node vm context and prints every number quoted on the page, in page
   order.

   Run from the repository root:  node tools/numbers/3.2-evection.js
   (about a minute: it finds every phase of the Moon over ten years)

   TABLE OF CONTENTS
	 1. Loading the shared code
	 2. Formatting and searching
	 3. The reference Moon: its phases
	 4. Introduction
	 5. Observation: the equation at the syzygies and at the quarters
	 6. Model: Ptolemy's crank
	 7. Model: the direction of the epicycle
	 8. Model: the first-order expansion
	 9. Fit: Ptolemy's eccentric, and ours
	10. Test: longitude
	11. Test: distance and apparent diameter
	12. Residual
	13. Exercises
	14. The scales of the figures
   ========================================================================== */

const { loadFiles } = require('../check/load.js');

/* ==========================================================================
   1. LOADING THE SHARED CODE
   ========================================================================== */

const shared = loadFiles([
	'shared/common.js',
	'shared/time.js',
	'shared/ephemeris.js',
	'shared/models/mean-sun.js',
	'shared/models/solar-eccentric.js',
	'shared/models/lunar-epicycle.js',
	'shared/models/lunar-crank.js'
]);
const { norm180, norm360, sin, asin, R2D, Time, Ephem, SolarEccentric, LunarEpicycle, LunarCrank } = shared;
const { MEEUS } = LunarEpicycle;
const P = LunarCrank.PTOLEMY;
const FIT = LunarCrank.FIT_2026;
const FIT_NO_DIRECTION = Object.assign({}, FIT, { direction: false });

/* ==========================================================================
   2. FORMATTING AND SEARCHING
   ========================================================================== */

/* The sexagesimal value d;m,s,... of the sources -> decimal. */
const fromSexagesimal = (...parts) => parts.reduce((sum, part, i) => sum + part / Math.pow(60, i), 0);

/* Degrees -> "2°23'15"" (sign in front). */
function dms(degrees, digits = 0) {
	const sign = degrees < 0 ? '-' : '';
	const total = Number((Math.abs(degrees) * 3600).toFixed(digits));
	const d = Math.floor(total / 3600);
	const m = Math.floor((total - 3600 * d) / 60);
	const s = total - 3600 * d - 60 * m;

	return `${sign}${d}°${String(m).padStart(2, '0')}'${s.toFixed(digits).padStart(digits ? digits + 3 : 2, '0')}"`;
}

/* A number in the sexagesimal notation of the sources: 5.2167 -> "5;13". */
function sexagesimal(value, places = 1) {
	let units = Math.round(Math.abs(value) * Math.pow(60, places));
	const parts = [];

	for (let i = 0; i < places; i++) {
		parts.unshift(String(units % 60).padStart(2, '0'));
		units = Math.floor(units / 60);
	}

	return `${value < 0 ? '-' : ''}${units};${parts.join(',')}`;
}

const date = jd => Time.formatDate(jd);
const title = text => console.log(`\n=== ${text} ===`);
const f = (x, digits) => x.toFixed(digits);
const maxAbs = list => Math.max(...list.map(Math.abs));
const mean = list => list.reduce((s, v) => s + v, 0) / list.length;
const rms = list => Math.sqrt(list.reduce((s, v) => s + v * v, 0) / list.length);

/* Root of fn in [a, b] by bisection (fn(a) and fn(b) of opposite signs). */
function bisect(fn, a, b, steps = 50) {
	const signA = Math.sign(fn(a));

	for (let i = 0; i < steps; i++) {
		const middle = (a + b) / 2;

		if (Math.sign(fn(middle)) === signA) {
			a = middle;
		} else {
			b = middle;
		}
	}

	return (a + b) / 2;
}

/* ==========================================================================
   3. THE REFERENCE MOON: ITS PHASES
   Apparent longitudes of date, as every error curve of the site uses.
   ========================================================================== */

const moonLon = jd => Ephem.longitude('moon', jd);
const sunLon = jd => Ephem.longitude('sun', jd);
const moonDist = jd => Ephem.position('moon', jd).dist; // km

/* Every moment in [from, to] when the elongation Moon - Sun reaches
   'target' (0 new Moon, 90 first quarter, 180 full, 270 last quarter). */
function phases(target, from, to) {
	const off = jd => norm180(moonLon(jd) - sunLon(jd) - target);
	const found = [];

	for (let jd = from; jd < to; jd += 0.5) {
		if (off(jd) < 0 && off(jd + 0.5) >= 0) {
			found.push(bisect(off, jd, jd + 0.5));
		}
	}

	return found;
}

const J2000 = 2451545.0;
const Y2026 = Time.julianDay(2026, 1, 1);
const Y2027 = Time.julianDay(2027, 1, 1);
const FROM = Time.julianDay(2021, 1, 1);
const TO = Time.julianDay(2031, 1, 1);

const SYZYGIES = phases(0, FROM, TO).concat(phases(180, FROM, TO));
const QUARTERS = phases(90, FROM, TO).concat(phases(270, FROM, TO));
const OCTANTS = [45, 135, 225, 315].flatMap(t => phases(t, FROM, TO));
const in2026 = list => list.filter(jd => jd >= Y2026 && jd < Y2027);

/* The real Moon's whole equation, true minus mean longitude (Meeus'
   linear mean motions, as on page 3.1), and its anomaly from the apogee
   (Meeus' M' + 180°). */
const meeusState = jd => LunarEpicycle.state(Object.assign({}, MEEUS, { e: 0 }), jd);
const realEquation = jd => norm180(moonLon(jd) - meeusState(jd).meanLongitude);

/* The least-squares amplitude a (deg) of -a sin M fitted to a list of
   values at a list of moments. */
function amplitude(times, valueAt) {
	let num = 0;
	let den = 0;

	times.forEach(jd => {
		const s = -sin(meeusState(jd).M);

		num += s * valueAt(jd);
		den += s * s;
	});

	return num / den;
}

/* The models of the page, and their error (arcmin) against the
   reference Moon. */
const models = {
	epicycle: LunarEpicycle.make(LunarEpicycle.FIT_2026),
	crank: LunarCrank.make(FIT_NO_DIRECTION),
	full: LunarCrank.make(FIT),
	ptolemy: LunarCrank.make(P),
	ptolemySimple: LunarEpicycle.make(LunarEpicycle.PTOLEMY)
};
const error = (fn, jd) => norm180(fn(jd) - moonLon(jd)) * 60;

/* The largest |error| over [from, to], sampled every 'step' days. */
function largest(fn, from, to, step = 0.05) {
	let worst = { v: 0 };

	for (let jd = from; jd <= to; jd += step) {
		const v = error(fn, jd);

		if (Math.abs(v) > Math.abs(worst.v)) {
			worst = { v, jd };
		}
	}

	return worst;
}

/* The errors (arcmin) over [from, to], every 'step' days. */
function errors(fn, from, to, step = 0.25) {
	const list = [];

	for (let jd = from; jd < to; jd += step) {
		list.push(error(fn, jd));
	}

	return list;
}

/* ==========================================================================
   4. INTRODUCTION
   ========================================================================== */

title("Introduction: page 3.1's epicycle and the crank in 2026");
{
	const epicycle = largest(models.epicycle, Y2026, Y2027);
	const full = largest(models.full, Y2026, Y2027);

	console.log(
		`the epicycle: at the syzygies within ${f(maxAbs(in2026(SYZYGIES).map(jd => error(models.epicycle, jd))), 1)}', largest ${f(Math.abs(epicycle.v) / 60, 2)}°; the complete crank: largest ${f(Math.abs(full.v) / 60, 2)}°`
	);
}

/* ==========================================================================
   5. OBSERVATION
   ========================================================================== */

title('Observation: the whole equation at the syzygies and at the quarters, 2021 - 2030 (Figure 1)');
console.log(`${SYZYGIES.length} new and full Moons, ${QUARTERS.length} quarters`);
console.log(
	`greatest |true - mean|: at the syzygies ${f(maxAbs(SYZYGIES.map(realEquation)), 2)}°, at the quarters ${f(maxAbs(QUARTERS.map(realEquation)), 2)}°`
);
console.log(
	`least-squares amplitude of -a sin M: at the syzygies ${f(amplitude(SYZYGIES, realEquation), 2)}°, at the quarters ${f(amplitude(QUARTERS, realEquation), 2)}°`
);

title("Observation: page 3.1's epicycle at the quarters of 2026");
{
	const qs = in2026(QUARTERS);
	const errorDeg = jd => error(models.epicycle, jd) / 60;

	/* At the quarters the error follows +a sin M: the epicycle's equation
	   is too small there, with the same sign. */
	console.log(
		`largest error at the ${qs.length} quarters ${f(maxAbs(qs.map(errorDeg)), 2)}°; it is about ${f(-amplitude(qs, errorDeg), 2)}° x sin M`
	);
}

title("Observation: Ptolemy's and Hipparchus' sightings near the quarters (Almagest V 3)");
{
	const simple = M => LunarEpicycle.equationOfAnomaly(M, P.e);

	console.log(
		`AD 139 Feb 9: anomaly 87;19, first anomaly q = ${dms(simple(fromSexagesimal(87, 19)))}; observed Scorpius 9;40 - mean 17;20 = -7;40`
	);
	console.log(
		`128 BC Aug 5 (Toomer -127): anomaly 257;47, first anomaly q = +${dms(simple(fromSexagesimal(257, 47)))}; observed 93;55 - 86;15 = +${dms(fromSexagesimal(93, 55) - fromSexagesimal(86, 15))}`
	);
	console.log(`7 2/3° = ${f(7 + 2 / 3, 3)}°`);
}

/* ==========================================================================
   6. MODEL: PTOLEMY'S CRANK
   ========================================================================== */

title("Model: the greatest equation in Ptolemy's crank (Almagest V 2, V 4)");
console.log(
	`OK at syzygy 1 (60 parts), at quadrature 1 - 2c = ${f(1 - 2 * P.c, 5)} (${f(60 * (1 - 2 * P.c), 3)} parts); greatest equation asin e = ${dms(asin(P.e))} (${f(asin(P.e), 2)}°), asin(e / (1 - 2c)) = ${dms(asin(P.e / (1 - 2 * P.c)))} (${f(asin(P.e / (1 - 2 * P.c)), 2)}°)`
);

title('Model: Figure 2, the crank fitted to 2026 without the direction');
{
	const s = LunarCrank.state(FIT_NO_DIRECTION, Y2026);

	console.log(
		`1 Jan 2026 0h: mean longitude ${f(s.meanLongitude, 2)}°, D ${f(s.elongation, 2)}°, OK ${f(s.rho, 4)}, M ${f(s.M, 2)}°, q ${f(s.q, 2)}°`
	);
	console.log(
		`greatest equation: at syzygy ${f(asin(FIT.e), 2)}°, at quadrature ${f(asin(FIT.e / (1 - 2 * FIT.c)), 2)}°`
	);
}

/* ==========================================================================
   7. MODEL: THE DIRECTION OF THE EPICYCLE
   ========================================================================== */

title('Model: the direction of the epicycle, the example of Almagest V 6 (Figure 3)');
{
	const twoD = fromSexagesimal(90, 30);
	const M = fromSexagesimal(333, 12);
	const g = LunarCrank.geometry(P.e, P.c, twoD, M, true);
	const g0 = LunarCrank.geometry(P.e, P.c, twoD, M, false);

	console.log(
		`2D = 90;30, M = 333;12: shift of the mean apogee ${dms(g.shift)} (Ptolemy 12;1), anomaly from the true apogee ${dms(norm360(M - g.shift))} (345;13)`
	);
	console.log(
		`OK = ${f(60 * g.rho, 3)} parts (Ptolemy 48;31 = ${f(fromSexagesimal(48, 31), 3)}); q = ${dms(g.q)} (Ptolemy +1;26); without the direction q = ${dms(g0.q)}`
	);

	let best = { v: 0 };

	for (let t = 0; t <= 360; t += 0.01) {
		const s = LunarCrank.geometry(P.e, P.c, t, 0, true).shift;

		if (Math.abs(s) > Math.abs(best.v)) {
			best = { v: s, t };
		}
	}
	console.log(
		`the greatest shift ${dms(Math.abs(best.v))} (${f(Math.abs(best.v), 1)}°) at 2D = ${f(best.t, 1)}° (D = ${f(best.t / 2, 1)}°)`
	);
}

console.log(
	`as decimals: 2D = 90;30 = ${f(90.5, 1)}°, M = 333;12 = ${f(fromSexagesimal(333, 12), 1)}°, from the true apogee 345;13 = ${f(fromSexagesimal(345, 13), 1)}°; q +1;26 = ${f(fromSexagesimal(1, 26), 2)}°, without the direction ${f(LunarCrank.geometry(P.e, P.c, 90.5, fromSexagesimal(333, 12), false).q, 2)}°`
);

title('Model: the greatest equation at 2D = 120° (Almagest V 7, a check)');
{
	const rho = LunarCrank.centreDistance(P.c, 120);

	console.log(
		`OK = ${f(60 * rho, 3)} parts (Ptolemy 43;43); greatest equation ${dms(asin(P.e / rho))} (Ptolemy 6;54)`
	);
}

/* ==========================================================================
   8. MODEL: THE FIRST-ORDER EXPANSION
   ========================================================================== */

title('Model: the first-order expansion, q ~ -e0 sin M + e0 k sin(M - 2D)');
{
	const e0 = P.e / (1 - P.c);
	const k = P.c / (1 - P.c);

	console.log(
		`Ptolemy: e0 = e / (1 - c) = ${f(e0, 4)} rad = ${f(e0 * R2D, 2)}°, k = c / (1 - c) = ${f(k, 4)}, e0 k = ${f(e0 * k, 5)} = ${f(e0 * k * R2D, 2)}°, e0 k / 2 = ${f((e0 * k * R2D) / 2, 2)}°`
	);
	console.log(`Meeus 47.A: 6.288774° sin M' and 1.274027° sin(2D - M'), M' = M - 180°`);

	/* The exact model's coefficients of sin M, sin(M - 2D), sin(M + 2D),
	   by a double Fourier sum over M and 2D. */
	const coefficients = direction => {
		const n = 360;
		const sums = { M: 0, minus: 0, plus: 0 };

		for (let i = 0; i < n; i++) {
			for (let j = 0; j < n; j++) {
				const M = (360 * i) / n;
				const twoD = (360 * j) / n;
				const q = LunarCrank.geometry(P.e, P.c, twoD, M, direction).q;

				sums.M += q * sin(M);
				sums.minus += q * sin(M - twoD);
				sums.plus += q * sin(M + twoD);
			}
		}

		const norm = 2 / (n * n);

		return { M: sums.M * norm, minus: sums.minus * norm, plus: sums.plus * norm };
	};
	const crank = coefficients(false);
	const full = coefficients(true);

	console.log('table, coefficients (deg) of sin M, sin(M - 2D), sin(M + 2D):');
	console.log(`   crank alone        ${f(crank.M, 2)}  ${f(crank.minus, 2)}  ${f(crank.plus, 2)}`);
	console.log(`   with the direction ${f(full.M, 2)}  ${f(full.minus, 2)}  ${f(full.plus, 2)}`);
	/* Meeus 47.A: +0.053322 sin(2D + M'), and sin(2D + M - 180°) =
	   -sin(M + 2D). */
	console.log(`   reference (Meeus)  ${f(-6.288774, 2)}  ${f(1.274027, 2)}  ${f(-0.053322, 2)}`);
}

/* ==========================================================================
   9. FIT
   ========================================================================== */

title("Fit: Ptolemy's eccentric from 5;15 and 7;40 (Almagest V 4)");
{
	const OG = 5.25 / sin(fromSexagesimal(7, 40));
	const radius = (60 + OG) / 2;

	console.log(
		`OG = 5.25 / sin 7°40' = ${f(OG, 2)}; radius (60 + OG) / 2 = ${f(radius, 2)}; OC = ${f(60 - radius, 2)}`
	);
	console.log(
		`Ptolemy: OG 39;22 = ${f(fromSexagesimal(39, 22), 2)}, radius 49;41 = ${f(fromSexagesimal(49, 41), 2)}, OC 10;19 = ${f(fromSexagesimal(10, 19), 2)}; c = ${f(P.c, 4)}`
	);
	console.log(
		`the point N from Hipparchus' sightings (V 5): ON = 10;18 = ${f(fromSexagesimal(10, 18), 2)} and 10;20 = ${f(fromSexagesimal(10, 20), 2)}`
	);
}

title('Fit: c fitted to the quarters (golden section on the sum of squares)');
{
	const withC = (c, direction = true) => Object.assign({}, FIT, { c, direction });
	const fitC = times => {
		const cost = c => {
			const model = LunarCrank.make(withC(c));

			return times.reduce((s, jd) => s + norm180(model(jd) - moonLon(jd)) ** 2, 0);
		};
		const g = (Math.sqrt(5) - 1) / 2;
		let a = 0.05;
		let b = 0.3;

		for (let i = 0; i < 80; i++) {
			const x1 = b - g * (b - a);
			const x2 = a + g * (b - a);

			if (cost(x1) < cost(x2)) {
				b = x2;
			} else {
				a = x1;
			}
		}

		return (a + b) / 2;
	};
	const c2026 = fitC(in2026(QUARTERS));

	console.log(`the epicycle of page 3.1: e = ${f(FIT.e, 6)} (${f(60 * FIT.e, 2)} parts where OA = 60)`);
	console.log(
		`the ${in2026(QUARTERS).length} quarters of 2026: c = ${f(c2026, 6)} (model file ${FIT.c}) = ${f(c2026, 4)}, ${f(60 * c2026, 2)} parts (Ptolemy ${f(60 * P.c, 2)})`
	);
	console.log(
		`greatest equation: at the quarters ${f(asin(FIT.e / (1 - 2 * FIT.c)), 2)}°, at new and full Moon ${f(asin(FIT.e), 2)}°`
	);
	console.log(`the quarters of 2021 - 2030: c = ${f(fitC(QUARTERS), 4)}`);
}

/* ==========================================================================
   10. TEST: LONGITUDE
   ========================================================================== */

title('Test: the error over 2026 (Figure 4)');
['epicycle', 'crank', 'full'].forEach(name => {
	const fn = models[name];
	const all = largest(fn, Y2026, Y2027);
	const at = list => maxAbs(in2026(list).map(jd => error(fn, jd)));

	console.log(
		`${name.padEnd(9)} largest ${f(Math.abs(all.v) / 60, 2)}° on ${date(all.jd)}, rms ${f(rms(errors(fn, Y2026, Y2027)), 0)}'; at the syzygies ${f(at(SYZYGIES), 0)}', quarters ${f(at(QUARTERS) / 60, 2)}°, octants ${f(at(OCTANTS) / 60, 2)}°`
	);
});
{
	const century = largest(models.full, Time.julianDay(1976, 1, 1), Time.julianDay(2076, 1, 1), 0.25);

	console.log(`the complete crank, 1976 - 2076: largest ${f(Math.abs(century.v) / 60, 2)}° on ${date(century.jd)}`);
}

title("Test: Ptolemy's complete Moon (Almagest V), 20 Jan - 21 Mar 139 (Figure 5)");
{
	const from = Time.julianDay(139, 1, 20);
	const to = from + 60;
	const full = errors(models.ptolemy, from, to);
	const simple = errors(models.ptolemySimple, from, to);
	const ptolemySun = SolarEccentric.make(SolarEccentric.PTOLEMY);
	const sunErrors = [];

	for (let jd = from; jd < to; jd += 1) {
		sunErrors.push(norm180(ptolemySun(jd) - sunLon(jd)) * 60);
	}
	console.log(
		`simple Moon from ${f(Math.min(...simple) / 60, 2)}° to ${f(Math.max(...simple) / 60, 2)}° (spread ${f((Math.max(...simple) - Math.min(...simple)) / 60, 2)}°, mean ${f(mean(simple) / 60, 2)}°)`
	);
	console.log(
		`complete Moon from ${f(Math.min(...full) / 60, 2)}° to ${f(Math.max(...full) / 60, 2)}° (spread ${f((Math.max(...full) - Math.min(...full)) / 60, 2)}°, mean ${f(mean(full) / 60, 2)}°)`
	);
	console.log(
		`the complete Moon's spread is ${f((Math.max(...full) - Math.min(...full)) / (Math.max(...simple) - Math.min(...simple)), 2)} of the simple Moon's`
	);
	console.log(`his Sun over the same months: mean error ${f(mean(sunErrors), 0)}'`);
	console.log(`both on average ${f(-mean(full) / 60, 1)}° behind`);
	[1000, 2026].forEach(y => {
		const a = Time.julianDay(y, 1, 1);

		console.log(`   the year ${y}: mean error ${f(mean(errors(models.ptolemy, a, a + 365)) / 60, 1)}°`);
	});
}

/* ==========================================================================
   11. TEST: DISTANCE AND APPARENT DIAMETER
   ========================================================================== */

const MOON_RADIUS = 1737.4; // km, IAU
const EARTH_RADIUS = 6378.14; // km, equatorial (Meeus)
const SUN_RADIUS = 696000; // km (Meeus)
const AU = 149597870.7; // km
const diameter = km => 2 * asin(MOON_RADIUS / km) * 60; // arcmin

/* The real Moon's nearest and farthest moments of 2026. */
const REAL = (() => {
	let near = { v: 1e9 };
	let far = { v: 0 };

	for (let jd = Y2026; jd <= Y2027; jd += 0.02) {
		const d = moonDist(jd);

		if (d < near.v) {
			near = { v: d, jd };
		}
		if (d > far.v) {
			far = { v: d, jd };
		}
	}

	return { near, far };
})();

title("Test: the distances of Ptolemy's model (Almagest V 4, V 13)");
{
	const greatest = 60 + 5.25;
	const least = 60 * (1 - 2 * P.c) - 5.25;

	console.log(
		`where OA = 60: greatest 60 + 5.25 = ${f(greatest, 2)}, least ${f(60 * (1 - 2 * P.c), 2)} - 5.25 = ${f(least, 2)}; ratio ${f(greatest / least, 2)}`
	);
	console.log(
		`in Earth radii (OA = 59): least ${f((least * 59) / 60, 2)}; the real Moon's nearest of 2026 ${f(REAL.near.v / EARTH_RADIUS, 2)}, ${f(REAL.near.v / EARTH_RADIUS / ((least * 59) / 60), 2)} times farther`
	);
}

title('Test: the real Moon in 2026 (Figure 6)');
console.log(
	`nearest ${f(REAL.near.v, 0)} km on ${date(REAL.near.jd)}, farthest ${f(REAL.far.v, 0)} km on ${date(REAL.far.jd)}; ratio ${f(REAL.far.v / REAL.near.v, 3)}; apparent diameter ${f(diameter(REAL.far.v), 1)}' .. ${f(diameter(REAL.near.v), 1)}'`
);

title('Test: the models with their greatest distance set to the real farthest of 2026 (Figure 6)');
{
	/* A model's diameter: the real smallest diameter of 2026, times its
	   greatest distance over its distance. */
	const smallest = diameter(REAL.far.v);
	const range = (distanceAt, greatest) => {
		let lo = 1e9;
		let hi = 0;

		for (let jd = Y2026; jd <= Y2027; jd += 0.02) {
			const d = (smallest * greatest) / distanceAt(jd);

			lo = Math.min(lo, d);
			hi = Math.max(hi, d);
		}

		return [lo, hi];
	};
	const crank = range(LunarCrank.makeDistance(FIT), 1 + FIT.e);
	const e = LunarEpicycle.FIT_2026.e;
	const epicycleDistance = jd => {
		const M = LunarEpicycle.state(LunarEpicycle.FIT_2026, jd).M;

		return Math.hypot(1 + e * Math.cos(M / R2D), e * Math.sin(M / R2D));
	};
	const epicycle = range(epicycleDistance, 1 + e);

	console.log(`the crank: ${f(crank[0], 1)}' .. ${f(crank[1], 1)}' (x ${f(crank[1] / crank[0], 2)})`);
	console.log(
		`page 3.1's epicycle: ${f(epicycle[0], 1)}' .. ${f(epicycle[1], 1)}' (x ${f(epicycle[1] / epicycle[0], 2)})`
	);
	console.log(
		`Ptolemy's 31;20' at the greatest distance would become ${f(fromSexagesimal(31, 20) * (65.25 / (60 * (1 - 2 * P.c) - 5.25)), 1)}'`
	);
}

title("Test: the Sun's eccentric of page 2.1 (Almagest V 14)");
{
	const e = SolarEccentric.FIT_2026.e;
	const eK = 0.0167086; // the Earth's orbit, J2000 (Meeus 25.4)
	const sunDiameter = 2 * asin(SUN_RADIUS / AU) * 60;

	console.log(
		`the eccentric: distance varies by +-${f(100 * e, 2)}%, the real one by +-${f(100 * eK, 2)}%; the Sun's diameter at 1 AU ${f(sunDiameter, 1)}': eccentric ${f(sunDiameter / (1 + e), 1)}' .. ${f(sunDiameter / (1 - e), 1)}', real ${f(sunDiameter / (1 + eK), 1)}' .. ${f(sunDiameter / (1 - eK), 1)}'`
	);
}

/* ==========================================================================
   12. RESIDUAL
   ========================================================================== */

title("Residual: what remains of the crank's error in 2026");
{
	/* The mean elongation (Meeus 47.2, linear part). */
	const D = jd => norm360(297.8501921 + (445267.1114034 / 36525) * (jd - J2000));
	const errs = [];
	const variation = [];

	for (let jd = Y2026; jd < Y2027; jd += 0.25) {
		errs.push(error(models.full, jd));
		variation.push(-0.658314 * sin(2 * D(jd)) * 60);
	}

	/* The error's projection on minus the variation: 1 if all of the
	   variation is in it. */
	const k = errs.reduce((s, v, i) => s + v * variation[i], 0) / variation.reduce((s, v) => s + v * v, 0);

	console.log(
		`variation 0.658314° sin 2D = ${f(0.658314 * 60, 0)}'; annual equation 0.185116° = ${f(0.185116 * 60, 0)}'`
	);
	console.log(`the error's projection on -(variation): ${f(k, 2)}`);
	console.log(
		`rms ${f(rms(errs), 0)}', after removing the variation ${f(rms(errs.map((v, i) => v - k * variation[i])), 0)}'`
	);
	console.log(
		`share of the variance removed: ${f(100 * (1 - rms(errs.map((v, i) => v - k * variation[i])) ** 2 / rms(errs) ** 2), 0)}%`
	);
	console.log(
		`at the syzygies of 2026: the crank ${f(maxAbs(in2026(SYZYGIES).map(jd => error(models.full, jd))), 0)}', the epicycle ${f(maxAbs(in2026(SYZYGIES).map(jd => error(models.epicycle, jd))), 0)}'`
	);

	/* The error regressed on the terms of the reference Moon it may hold:
	   the variation (sin 2D), the first anomaly left by the fit of page
	   3.1 (sin and cos of Meeus' M'), the annual equation (sin of the
	   Sun's anomaly) and the reduction to the ecliptic (sin 2F); least
	   squares by the normal equations. */
	const T = jd => (jd - J2000) / 36525;
	const columns = [
		jd => sin(2 * D(jd)),
		jd => sin(134.9633964 + 477198.8675055 * T(jd)),
		jd => Math.cos((134.9633964 + 477198.8675055 * T(jd)) / R2D),
		jd => sin(357.5291092 + 35999.0502909 * T(jd)),
		jd => sin(2 * (93.272095 + 483202.0175233 * T(jd)))
	];
	const times = [];

	for (let jd = Y2026; jd < Y2027; jd += 0.25) {
		times.push(jd);
	}

	const n = columns.length;
	const A = columns.map(a => columns.map(b => times.reduce((sum, jd) => sum + a(jd) * b(jd), 0)));
	const y = columns.map(a => times.reduce((sum, jd) => sum + a(jd) * error(models.full, jd), 0));

	for (let i = 0; i < n; i++) {
		for (let r = i + 1; r < n; r++) {
			const factor = A[r][i] / A[i][i];

			for (let j = i; j < n; j++) {
				A[r][j] -= factor * A[i][j];
			}
			y[r] -= factor * y[i];
		}
	}

	const x = new Array(n).fill(0);

	for (let i = n - 1; i >= 0; i--) {
		x[i] = (y[i] - A[i].slice(i + 1).reduce((sum, v, j) => sum + v * x[i + 1 + j], 0)) / A[i][i];
	}
	console.log(
		`regression (arcmin): sin 2D ${f(x[0], 1)}; first anomaly ${f(Math.hypot(x[1], x[2]), 1)} (sin M' ${f(x[1], 1)}, cos M' ${f(x[2], 1)}); sin M_sun ${f(x[3], 1)}; sin 2F ${f(x[4], 1)}`
	);
	console.log(`page 3.1's anomaly at the epoch minus Meeus': ${f(LunarEpicycle.FIT_2026.M0 - MEEUS.M0, 2)}°`);

	/* The largest error left after removing the fitted variation. */
	let worst = 0;

	times.forEach(jd => {
		worst = Math.max(worst, Math.abs(error(models.full, jd) - x[0] * sin(2 * D(jd))));
	});
	console.log(`largest error after removing the variation: ${f(worst / 60, 2)}°`);
}

title('Residual: Copernicus (De Rev. IV 8, IV 17, IV 22)');
console.log(
	`epicycles 1097 and 237 where the deferent is 10000; the Moon at the quarters 52;17 = ${f(fromSexagesimal(52, 17), 2)} .. 68 1/3 = ${f(68 + 1 / 3, 2)} Earth radii (IV 17): ratio ${f((68 + 1 / 3) / fromSexagesimal(52, 17), 2)}`
);

/* ==========================================================================
   13. EXERCISES
   ========================================================================== */

title('Exercise 1: the eccentric and the distances (V 4, V 13, V 14)');
{
	const OG = 5.25 / sin(fromSexagesimal(7, 40));
	const radius = (60 + OG) / 2;
	const greatest = 65.25;
	const least = 60 * (1 - 2 * P.c) - 5.25;
	const toRadii = 59 / 60;

	console.log(`OG = ${f(OG, 3)}, radius ${f(radius, 3)}, OC ${f(60 - radius, 3)} (Ptolemy 39.367, 49.683, 10.317)`);
	console.log(
		`with Ptolemy's values: greatest ${f(greatest, 2)}, least ${f(60 * (1 - 2 * P.c), 3)} - 5.25 = ${f(least, 3)}; ratio ${f(greatest / least, 3)}`
	);
	console.log(
		`in Earth radii (OA = 59): ${f(greatest * toRadii, 2)} (${sexagesimal(greatest * toRadii)}) and ${f(least * toRadii, 2)} (${sexagesimal(least * toRadii)})`
	);
	console.log(
		`the diameter: 31;20' = ${f(fromSexagesimal(31, 20), 2)}' at the greatest distance, ${f(fromSexagesimal(31, 20) * (greatest / least), 1)}' at the least`
	);
	console.log(
		`the real Moon in 2026: ratio ${f(REAL.far.v / REAL.near.v, 3)}, ${f(diameter(REAL.far.v), 1)}' .. ${f(diameter(REAL.near.v), 1)}'`
	);
}

title('Exercise 2: the direction to first order');
{
	const k = P.c / (1 - P.c);
	const twoD = 90.5;
	const exact = LunarCrank.geometry(P.e, P.c, twoD, 0, true).shift;

	console.log(
		`shift at 2D = 90;30: -c sin 2D = ${f(-P.c * sin(twoD) * R2D, 2)}°, -kappa sin 2D = ${f(-k * sin(twoD) * R2D, 2)}°, exact ${f(exact, 2)}° (kappa = ${f(k, 4)}); Ptolemy 12;1 = ${f(12 + 1 / 60, 2)}°`
	);
	console.log('(the coefficients are in the table of section 8)');
}

title("Exercise 3: Ptolemy's parallax of 1 October 135 (Almagest V 13)");
{
	/* 5 5/6 equinoctial hours after noon at Alexandria, local time. */
	const ut = Time.julianDay(135, 10, 1) + (12 + 5 + 5 / 6) / 24 - 29.92 / 360;
	const tt = Time.ttFromUt(ut);
	const s = LunarCrank.state(P, tt);
	const realKm = moonDist(tt);
	const zApparent = fromSexagesimal(50, 55);
	const zTrue = fromSexagesimal(49, 48);
	const radii = realKm / EARTH_RADIUS;

	console.log(
		`his model: elongation ${f(s.elongation, 2)}° (78;13), anomaly ${f(s.M, 2)}° (262;20), distance ${f(60 * s.distance, 2)} parts where OA = 60 (Ptolemy 40;25 = ${f(fromSexagesimal(40, 25), 2)})`
	);
	console.log(`zenith distances 50;55 = ${f(zApparent, 2)}°, 49;48 = ${f(zTrue, 2)}°`);
	console.log(
		`his parallax 50;55 - 49;48 = ${f((zApparent - zTrue) * 60, 0)}' -> 39;45 = ${f(39.75, 2)} Earth radii; OA = 39.75 x 60 / 40.42 = ${f((39.75 * 60) / fromSexagesimal(40, 25), 2)} (Ptolemy 59)`
	);
	console.log(
		`from 67' and sin p = sin 50;55 / d: d = ${f(sin(zApparent) / sin(67 / 60), 2)} Earth radii (Toomer: more accurate 39;50 = ${f(fromSexagesimal(39, 50), 2)})`
	);
	console.log(
		`the reference Moon then: ${f(realKm, 0)} km = ${f(radii, 1)} Earth radii; parallax sin p = sin 50;55 / d: ${f(asin(sin(zApparent) / radii) * 60, 0)}' (his 67')`
	);
}

/* ==========================================================================
   14. THE SCALES OF THE FIGURES
   ========================================================================== */

title('Scales');
{
	console.log(`Figure 1: |true - mean| up to ${f(maxAbs(SYZYGIES.concat(QUARTERS).map(realEquation)), 2)}°`);
	console.log(
		`Figure 2 (b): |q| of the fitted crank up to asin(e / (1 - 2c)) = ${f(asin(FIT.e / (1 - 2 * FIT.c)), 2)}°`
	);
	console.log(`Figure 2 (a): the greatest distance OL = 1 + e = ${f(1 + FIT.e, 4)}`);

	let lo = 1e9;
	let hi = 0;

	for (let jd = Y2026; jd <= Y2027; jd += 0.02) {
		lo = Math.min(lo, diameter(moonDist(jd)));
		hi = Math.max(hi, diameter(moonDist(jd)));
	}
	console.log(`Figure 6: the real diameter ${f(lo, 2)}' .. ${f(hi, 2)}' (the crank's in section 11)`);
}
