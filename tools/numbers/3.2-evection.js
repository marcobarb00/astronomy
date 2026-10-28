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
	 4. Observation: the equation at the syzygies and at the quarters
	 5. Model: Ptolemy's crank and the direction of the epicycle
	 6. Model: the first-order expansion
	 7. Fit: the eccentric fitted to the quarters of 2026
	 8. Test: longitude
	 9. Test: distance and apparent diameter
	10. Residual
	11. Exercises
	12. The scales of the figures
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
const { norm180, norm360, sin, cos, asin, R2D, D2R, Time, Ephem, MeanSun, SolarEccentric, LunarEpicycle, LunarCrank } =
	shared;
const { MEEUS, FIT_2026 } = LunarEpicycle;

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

const Y2026 = Time.julianDay(2026, 1, 1);
const Y2027 = Time.julianDay(2027, 1, 1);
const FROM = Time.julianDay(2021, 1, 1);
const TO = Time.julianDay(2031, 1, 1);

const SYZYGIES = phases(0, FROM, TO).concat(phases(180, FROM, TO));
const QUARTERS = phases(90, FROM, TO).concat(phases(270, FROM, TO));
const OCTANTS = [45, 135, 225, 315].flatMap(t => phases(t, FROM, TO));
const in2026 = list => list.filter(jd => jd >= Y2026 && jd < Y2027);

/* The real Moon's whole equation, true minus mean longitude (Meeus'
   linear mean motions, as on page 3.1), and its anomaly from the apogee. */
const meeusState = jd => LunarEpicycle.state(Object.assign({}, MEEUS, { e: 0 }), jd);
const realEquation = jd => norm180(moonLon(jd) - meeusState(jd).meanLongitude);

/* The least-squares amplitude a (deg) of q = -a sin M over a set of
   moments (the real equation against Meeus' anomaly). */
function amplitude(times) {
	let num = 0;
	let den = 0;

	times.forEach(jd => {
		const s = -sin(meeusState(jd).M);

		num += s * realEquation(jd);
		den += s * s;
	});

	return num / den;
}

/* ==========================================================================
   4. OBSERVATION
   ========================================================================== */

title('Observation: the whole equation at the syzygies and at the quarters, 2021 - 2030 (Figure 1)');
console.log(`${SYZYGIES.length} new and full Moons, ${QUARTERS.length} quarters`);
console.log(
	`greatest |true - mean|: at the syzygies ${f(maxAbs(SYZYGIES.map(realEquation)), 2)}°, at the quarters ${f(maxAbs(QUARTERS.map(realEquation)), 2)}°`
);
console.log(
	`least-squares amplitude of -a sin M: at the syzygies ${f(amplitude(SYZYGIES), 2)}°, at the quarters ${f(amplitude(QUARTERS), 2)}°`
);
console.log(
	`Meeus' terms: 6.289 - 1.274 = ${f(6.289 - 1.274, 3)}° (syzygies), 6.289 + 1.274 = ${f(6.289 + 1.274, 3)}° (quarters)`
);

title("Observation: page 3.1's epicycle (FIT_2026) at the phases of 2026");
{
	const epicycle = LunarEpicycle.make(FIT_2026);
	const error = jd => norm180(epicycle(jd) - moonLon(jd));

	console.log(
		`largest error at the syzygies ${f(maxAbs(in2026(SYZYGIES).map(error)) * 60, 1)}', at the quarters ${f(maxAbs(in2026(QUARTERS).map(error)), 2)}°, at the octants ${f(maxAbs(in2026(OCTANTS).map(error)), 2)}°`
	);

	/* At the quarters the error follows +a sin M: the epicycle's equation
	   is too small there. */
	const qs = in2026(QUARTERS);
	const corr =
		qs.reduce((s, jd) => s + error(jd) * sin(meeusState(jd).M), 0) /
		qs.reduce((s, jd) => s + sin(meeusState(jd).M) ** 2, 0);

	console.log(`at the quarters of 2026 the error is about ${f(corr, 2)}° x sin M`);
}

title("Observation: Ptolemy's and Hipparchus' sightings at the quarters (Almagest V 3)");
{
	const simple = M => LunarEpicycle.equationOfAnomaly(M, 5.25 / 60);

	console.log(
		`AD 139 Feb 9: mean elongation ${dms(fromSexagesimal(316, 27) - fromSexagesimal(227, 20))}, anomaly 87;19: first anomaly q = ${dms(simple(fromSexagesimal(87, 19)))}; observed true - mean = ${dms(fromSexagesimal(229, 40) - fromSexagesimal(227, 20) - 360 + 360)} (Scorpius 9;40 - 17;20 = -7;40)`
	);
	console.log(
		`127 BC Aug 5: anomaly 257;47: first anomaly q = +${dms(simple(fromSexagesimal(257, 47)))}; observed true - mean = 93;55 - 86;15 = ${dms(fromSexagesimal(93, 55) - fromSexagesimal(86, 15))}`
	);
}

/* ==========================================================================
   5. MODEL
   ========================================================================== */

const P = LunarCrank.PTOLEMY;

title("Model: Ptolemy's eccentric from 5;15 and 7;40 (Almagest V 4)");
{
	const r = 5.25;
	const greatest = fromSexagesimal(7, 40);
	const OG = r / sin(greatest);
	const radius = (60 + OG) / 2;
	const c = 60 - radius;

	console.log(
		`OG = 5;15 / sin 7;40 = ${f(OG, 4)} = ${sexagesimal(OG)}; radius (60 + OG)/2 = ${f(radius, 4)} = ${sexagesimal(radius)}; OC = ${f(c, 4)} = ${sexagesimal(c)} (Ptolemy 39;22, 49;41, 10;19)`
	);
	console.log(
		`as fractions of OA: c = ${f(P.c, 5)}, e = ${f(P.e, 5)}; perigee of the eccentric 1 - 2c = ${f(1 - 2 * P.c, 5)} (= ${f(60 * (1 - 2 * P.c), 3)} parts)`
	);
	console.log(
		`greatest equation: at syzygy asin(5.25/60) = ${dms(asin(P.e))}, at quadrature asin(5.25/39;22) = ${dms(asin(P.e / (1 - 2 * P.c)))}`
	);
	console.log(
		`Ptolemy's table (V 8) uses 60 : 8 at quadrature: asin(8/60) = ${dms(asin(8 / 60))}; 60 x 5.25 / 39.3667 = ${f((60 * 5.25) / (60 - 2 * 10 - 19 / 30), 3)}`
	);
}

title("Model: the distances in Ptolemy's model (Almagest V 4, V 13; De Rev. IV 2, IV 22)");
const PTOLEMY_DIST = {
	greatest: 60 + 5.25,
	syzygyLeast: 60 - 5.25,
	quadratureGreatest: 60 * (1 - 2 * P.c) + 5.25,
	least: 60 * (1 - 2 * P.c) - 5.25
};
{
	const d = PTOLEMY_DIST;

	console.log(
		`in parts of OA = 60: greatest ${f(d.greatest, 3)} (${sexagesimal(d.greatest)}), at syzygy least ${f(d.syzygyLeast, 3)}, at quadrature ${f(d.quadratureGreatest, 3)} .. ${f(d.least, 3)} (${sexagesimal(d.least)})`
	);
	console.log(`greatest / least = ${f(d.greatest / d.least, 4)}`);

	/* V 13: OA = 59, OG = 38;43, r = 5;10 Earth radii. */
	const earthRadii = 59 / 60;

	console.log(
		`in Earth radii (OA = 59, V 13): greatest ${sexagesimal(d.greatest * earthRadii)} = ${f(d.greatest * earthRadii, 3)}, least ${sexagesimal(d.least * earthRadii)} = ${f(d.least * earthRadii, 3)} (Ptolemy 64;10 and 33;33; Copernicus quotes 64 1/6 and 33;33)`
	);
	console.log(
		`   OG in Earth radii: ${sexagesimal(60 * (1 - 2 * P.c) * earthRadii)} (Ptolemy 38;43); epicycle ${sexagesimal(5.25 * earthRadii)} (5;10)`
	);
}

title('Model: the direction of the epicycle, the example of Almagest V 6');
{
	const twoD = fromSexagesimal(90, 30);
	const M = fromSexagesimal(333, 12);
	const g = LunarCrank.geometry(P.e, P.c, twoD, M, true);
	const g0 = LunarCrank.geometry(P.e, P.c, twoD, M, false);

	console.log(
		`2D = 90;30, M = 333;12: shift of the mean apogee ${dms(g.shift)} (Ptolemy ZM = 12;1), anomaly from the true apogee ${dms(norm360(M - g.shift))} (345;13)`
	);
	console.log(
		`OK = ${f(60 * g.rho, 3)} parts (Ptolemy 48;31 = ${f(fromSexagesimal(48, 31), 3)}); q = ${dms(g.q)} (Ptolemy +1;26); without the direction q = ${dms(g0.q)}`
	);
	const greatestShift = (() => {
		let best = { v: 0 };

		for (let t = 0; t <= 360; t += 0.01) {
			const s = LunarCrank.geometry(P.e, P.c, t, 0, true).shift;

			if (Math.abs(s) > Math.abs(best.v)) {
				best = { v: s, t };
			}
		}

		return best;
	})();

	console.log(`the greatest shift ${dms(Math.abs(greatestShift.v))} at 2D = ${f(greatestShift.t, 1)}°`);
}

title('Model: the greatest equation at 2D = 120° (Almagest V 7)');
{
	const rho = LunarCrank.centreDistance(P.c, 120);

	console.log(
		`OK = ${f(60 * rho, 3)} parts (Ptolemy 43;43); greatest equation asin(e/rho) = ${dms(asin(P.e / rho))} (Ptolemy 6;54)`
	);
}

/* ==========================================================================
   6. MODEL: THE FIRST-ORDER EXPANSION
   ========================================================================== */

title('Model: the first-order expansion, q ~ -e0 sin M + e0 k sin(M - 2D)');
{
	const R = 1 - P.c;
	const e0 = P.e / R;
	const k = P.c / R;

	console.log(
		`Ptolemy: e0 = r / (OA - OC) = ${f(e0, 5)} = ${f(e0 * R2D, 3)}°, k = OC / (OA - OC) = ${f(k, 5)}, e0 k = ${f(e0 * k, 5)} = ${f(e0 * k * R2D, 3)}°`
	);
	console.log(`Meeus 47.A: 6.289° sin M' and 1.274° sin(2D - M')`);

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

	console.log(
		`crank alone (exact, Fourier): ${f(crank.M, 3)}° sin M, ${f(crank.minus, 3)}° sin(M - 2D), ${f(crank.plus, 3)}° sin(M + 2D)`
	);
	console.log(
		`with the direction:          ${f(full.M, 3)}° sin M, ${f(full.minus, 3)}° sin(M - 2D), ${f(full.plus, 3)}° sin(M + 2D)`
	);
	console.log(
		`first order: crank alone -${f(e0 * R2D, 3)} sin M + ${f((e0 * k * R2D) / 2, 3)} [sin(M - 2D) + sin(M + 2D)]; with the direction + ${f(e0 * k * R2D, 3)} sin(M - 2D)`
	);
}

/* ==========================================================================
   7. FIT
   ========================================================================== */

title('Fit: the eccentric fitted to the quarters of 2026');

/* Page 3.1's epicycle (L0, M0, n, nM, e from three eclipses) with the
   modern mean Sun; c by least squares on the quarters (golden section). */
const base2026 = Object.assign({}, FIT_2026, { sun: MeanSun.MODERN });
const withC = (c, extra = {}) => Object.assign({}, base2026, { c }, extra);

function fitC(times, direction = true) {
	const cost = c => {
		const model = LunarCrank.make(withC(c, { direction }));

		return times.reduce((s, jd) => s + norm180(model(jd) - moonLon(jd)) ** 2, 0);
	};
	let a = 0.05;
	let b = 0.3;
	const g = (Math.sqrt(5) - 1) / 2;

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
}

const C_2026 = fitC(in2026(QUARTERS));
const FIT = withC(C_2026);
{
	const e = FIT.e;

	console.log(`the epicycle of page 3.1: e = ${f(e, 6)} (${f(60 * e, 3)} parts of 60)`);
	console.log(
		`fitted to the ${in2026(QUARTERS).length} quarters of 2026: c = ${f(C_2026, 6)} (${f(60 * C_2026, 3)} parts; Ptolemy ${f(60 * P.c, 3)}), perigee of the eccentric 1 - 2c = ${f(1 - 2 * C_2026, 5)} (${f(60 * (1 - 2 * C_2026), 3)} parts; Ptolemy 39.367)`
	);
	console.log(
		`greatest equation at the quarters asin(e / (1 - 2c)) = ${f(asin(e / (1 - 2 * C_2026)), 3)}° (${dms(asin(e / (1 - 2 * C_2026)))}); at syzygy asin e = ${f(asin(e), 3)}°`
	);
	console.log(
		`   fitted without the direction: c = ${f(fitC(in2026(QUARTERS), false), 6)}; fitted to the quarters and the octants: c = ${f(fitC(in2026(QUARTERS.concat(OCTANTS))), 6)}`
	);
	console.log(`   the quarters 2021 - 2030: c = ${f(fitC(QUARTERS), 6)}`);
}

/* ==========================================================================
   8. TEST: LONGITUDE
   ========================================================================== */

const models = {
	epicycle: LunarEpicycle.make(FIT_2026),
	crank: LunarCrank.make(withC(C_2026, { direction: false })),
	full: LunarCrank.make(FIT),
	ptolemy: LunarCrank.make(P),
	ptolemySimple: LunarEpicycle.make(LunarEpicycle.PTOLEMY)
};
const error = (fn, jd) => norm180(fn(jd) - moonLon(jd)) * 60; // arcmin

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

title('Test: the error over 2026 (Figure 5)');
['epicycle', 'crank', 'full'].forEach(name => {
	const fn = models[name];
	const all = largest(fn, Y2026, Y2027);
	const at = list => maxAbs(in2026(list).map(jd => error(fn, jd)));
	const sample = [];

	for (let jd = Y2026; jd < Y2027; jd += 0.25) {
		sample.push(error(fn, jd));
	}

	console.log(
		`${name.padEnd(9)} largest ${f(Math.abs(all.v), 0)}' (${f(Math.abs(all.v) / 60, 2)}°) on ${date(all.jd)}, rms ${f(rms(sample), 1)}'; at the syzygies ${f(at(SYZYGIES), 1)}', quarters ${f(at(QUARTERS), 1)}', octants ${f(at(OCTANTS), 1)}'`
	);
});

title('Test: over a century and at the syzygies of other centuries');
{
	const century = largest(models.full, Time.julianDay(1976, 1, 1), Time.julianDay(2076, 1, 1), 0.25);

	console.log(`1976 - 2076: largest ${f(century.v / 60, 2)}° on ${date(century.jd)}`);
}

title("Test: Ptolemy's complete Moon (Almagest V), around his observation of AD 139 Feb 9");
{
	const from = Time.julianDay(139, 1, 20);
	const to = from + 61;
	const simple = largest(models.ptolemySimple, from, to);
	const full = largest(models.ptolemy, from, to);
	const sample = (fn, a, b) => {
		const list = [];

		for (let jd = a; jd < b; jd += 0.25) {
			list.push(error(fn, jd));
		}

		return list;
	};
	const mean = list => list.reduce((s, v) => s + v, 0) / list.length;
	const sFull = sample(models.ptolemy, from, to);
	const sSimple = sample(models.ptolemySimple, from, to);

	console.log(
		`20 Jan - 22 Mar 139: simple Moon from ${f(Math.min(...sSimple) / 60, 2)}° to ${f(Math.max(...sSimple) / 60, 2)}° (mean ${f(mean(sSimple) / 60, 2)}°); complete Moon from ${f(Math.min(...sFull) / 60, 2)}° to ${f(Math.max(...sFull) / 60, 2)}° (mean ${f(mean(sFull) / 60, 2)}°)`
	);
	console.log(
		`   spread about the mean: simple ${f((Math.max(...sSimple) - Math.min(...sSimple)) / 120, 2)}°, complete ${f((Math.max(...sFull) - Math.min(...sFull)) / 120, 2)}°; largest |error| simple ${f(Math.abs(simple.v) / 60, 2)}°, complete ${f(Math.abs(full.v) / 60, 2)}°`
	);
	const ptolemySun = SolarEccentric.make(SolarEccentric.PTOLEMY);
	const sunErrors = [];

	for (let jd = from; jd < to; jd += 1) {
		sunErrors.push(norm180(ptolemySun(jd) - sunLon(jd)) * 60);
	}
	console.log(`   his Sun over the same months: mean error ${f(mean(sunErrors), 0)}'`);

	/* His observation of V 3: the model at that moment against the real
	   Moon (UT: 5 1/2 equinoctial hours before noon at Alexandria). */
	const ut = Time.julianDay(139, 2, 9) + (12 - 5.5) / 24 - 29.92 / 360;
	const tt = Time.ttFromUt(ut);
	const s = LunarCrank.state(P, tt);

	console.log(
		`   9 Feb 139, ${f((ut % 1) * 24, 2)} h UT: his mean Moon ${f(s.meanLongitude, 2)}° (Scorpius 17;20 = 227.33), M ${f(s.M, 2)}° (87;19), elongation ${f(s.elongation, 2)}°; his q ${dms(s.q)}, lambda ${f(s.lambda, 2)}° (Scorpius 9;40 = 219.67); real ${f(moonLon(tt), 2)}°`
	);
}

title("Test: Ptolemy's complete Moon over the centuries, at the quarters");
[139, 1000, 2026].forEach(y => {
	const a = Time.julianDay(y, 1, 1);
	const qs = phases(90, a, a + 365).concat(phases(270, a, a + 365));
	const ss = phases(0, a, a + 365).concat(phases(180, a, a + 365));
	const mean = list => list.reduce((s, v) => s + v, 0) / list.length;

	console.log(
		`   ${y}: mean error at the quarters ${f(mean(qs.map(jd => error(models.ptolemy, jd))) / 60, 2)}°, at the syzygies ${f(mean(ss.map(jd => error(models.ptolemy, jd))) / 60, 2)}°; the simple Moon at the quarters ${f(mean(qs.map(jd => error(models.ptolemySimple, jd))) / 60, 2)}°`
	);
});

/* ==========================================================================
   9. TEST: DISTANCE AND APPARENT DIAMETER
   ========================================================================== */

const MOON_RADIUS = 1737.4; // km, IAU
const EARTH_RADIUS = 6378.14; // km, equatorial (Meeus)
const diameter = km => 2 * asin(MOON_RADIUS / km) * 60; // arcmin

title('Test: the real distance and apparent diameter in 2026 (Figure 6)');
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
console.log(
	`nearest ${f(REAL.near.v, 0)} km on ${date(REAL.near.jd)}, farthest ${f(REAL.far.v, 0)} km on ${date(REAL.far.jd)}; ratio ${f(REAL.far.v / REAL.near.v, 4)}`
);
console.log(
	`in Earth radii ${f(REAL.near.v / EARTH_RADIUS, 2)} .. ${f(REAL.far.v / EARTH_RADIUS, 2)}; apparent diameter ${f(diameter(REAL.far.v), 1)}' .. ${f(diameter(REAL.near.v), 1)}'`
);

title("Test: the models' apparent diameters, scaled to 31;20' at the greatest distance (Almagest V 14)");
{
	const D0 = (fromSexagesimal(31, 20) / 60) * 60; // arcmin

	const ratioPtolemy = PTOLEMY_DIST.greatest / PTOLEMY_DIST.least;
	const e = FIT_2026.e;
	const ratioEpicycle = (1 + e) / (1 - e);
	const ratioFit = (1 + e) / (1 - 2 * C_2026 - e);

	console.log(`Ptolemy: ${f(D0, 2)}' .. ${f(D0 * ratioPtolemy, 1)}' (x ${f(ratioPtolemy, 3)})`);
	console.log(`page 3.1's epicycle: x ${f(ratioEpicycle, 3)}; the crank fitted to 2026: x ${f(ratioFit, 3)}`);
	console.log(
		`real: x ${f(REAL.far.v / REAL.near.v, 3)}; real diameter at full Moon at greatest distance in 2026 ~ ${f(diameter(REAL.far.v), 1)}'`
	);

	/* The model fitted to 2026, scaled so that its distance at the
	   greatest equals the real farthest distance: its least distance. */
	const scale = REAL.far.v / (1 + e);

	console.log(
		`the fitted crank with OA = ${f(scale, 0)} km: least ${f(scale * (1 - 2 * C_2026 - e), 0)} km, diameter up to ${f(diameter(scale * (1 - 2 * C_2026 - e)), 1)}'`
	);

	/* Over 2026 the model distance at each moment, for the plot: its
	   range with the scaling of Ptolemy. */
	let lo = 9;
	let hi = 0;

	for (let jd = Y2026; jd <= Y2027; jd += 0.05) {
		const d = LunarCrank.state(FIT, jd).distance;

		lo = Math.min(lo, d);
		hi = Math.max(hi, d);
	}
	console.log(`the fitted crank over 2026: distance ${f(lo, 4)} .. ${f(hi, 4)} of OA; ratio ${f(hi / lo, 3)}`);
}

title("Test: the Sun's eccentric of page 2.1 (Almagest V 14: the Sun's diameter does not change)");
{
	const e = SolarEccentric.FIT_2026.e;
	const eK = 0.0167086; // the Earth's orbit, J2000 (Meeus 25.4)

	console.log(
		`eccentric e = ${f(e, 4)}: distance x ${f(1 - e, 4)} .. ${f(1 + e, 4)} (ratio ${f((1 + e) / (1 - e), 4)}); real e_K = ${f(eK, 4)}: ratio ${f((1 + eK) / (1 - eK), 4)}`
	);
}

/* ==========================================================================
   10. RESIDUAL
   ========================================================================== */

title("Residual: what remains of the fitted crank's error in 2026");
{
	const fn = models.full;
	const D = jd => norm360(297.8501921 + (445267.1114034 / 36525) * (jd - 2451545)); // Meeus 47.2, linear
	const errs = [];
	const vars = [];

	for (let jd = Y2026; jd < Y2027; jd += 0.25) {
		errs.push(error(fn, jd));
		vars.push(-0.658314 * sin(2 * D(jd)) * 60);
	}

	/* The correlation of the error with minus the variation. */
	const num = errs.reduce((s, v, i) => s + v * vars[i], 0);
	const den = vars.reduce((s, v) => s + v * v, 0);

	console.log(`the error's projection on -0.658° sin 2D: ${f(num / den, 3)} (1 = all of it)`);
	console.log(
		`after removing the variation: rms ${f(rms(errs.map((v, i) => v - (num / den) * vars[i])), 1)}' (before ${f(rms(errs), 1)}')`
	);
	console.log(
		`Meeus 47.A: variation 0.658° sin 2D = ${f(0.658314 * 60, 1)}', annual equation 0.186° = ${f(0.185116 * 60, 1)}'`
	);
}

title('Residual: Copernicus (De Rev. IV 17, IV 22)');
console.log(
	`half Moon 52;17 .. 68;21 Earth radii: ratio ${f(fromSexagesimal(68, 21) / fromSexagesimal(52, 17), 3)}; syzygy 55;8 .. 65;30: ratio ${f(65.5 / fromSexagesimal(55, 8), 3)}; diameters 28;45' .. 37;34'`
);

/* ==========================================================================
   11. EXERCISES
   ========================================================================== */

title('Exercise 1: the eccentric and the distances (V 4, V 13, V 14)');
console.log('(the numbers are in the Model sections above)');

title("Exercise 3: Ptolemy's parallax of 1 October 135 (Almagest V 13)");
{
	/* 5 5/6 equinoctial hours after noon at Alexandria (Ptolemy's
	   "accurately": mean time; take local mean time). */
	const ut = Time.julianDay(135, 10, 1) + (12 + 5 + 5 / 6) / 24 - 29.92 / 360;
	const tt = Time.ttFromUt(ut);
	const s = LunarCrank.state(P, tt);
	const realKm = moonDist(tt);
	const zTrue = fromSexagesimal(49, 48);
	const zApp = fromSexagesimal(50, 55);
	const modelRadii = 39.75; // 39;45, V 13

	console.log(
		`his elongation ${f(s.elongation, 2)}° (78;13), anomaly ${f(s.M, 2)}° (262;20), distance ${f(60 * s.distance, 2)} parts (40;25 = ${f(fromSexagesimal(40, 25), 2)})`
	);
	console.log(
		`his parallax 50;55 - 49;48 = ${dms(zApp - zTrue)}; distance 39;45 Earth radii; parallax at z' = 50;55 for that distance: ${dms(asin(sin(zApp) / modelRadii))}`
	);
	console.log(
		`the real Moon then: ${f(realKm, 0)} km = ${f(realKm / EARTH_RADIUS, 2)} Earth radii; its parallax at z' = 50;55: ${dms(asin(sin(zApp) / (realKm / EARTH_RADIUS)))} = ${f(asin(sin(zApp) / (realKm / EARTH_RADIUS)) * 60, 1)}'`
	);
	console.log(
		`Ptolemy's distance at mean syzygy 59 Earth radii; the real mean distance ${f(385000.56 / EARTH_RADIUS, 2)}`
	);
}

/* ==========================================================================
   12. THE SCALES OF THE FIGURES
   ========================================================================== */

title('Scales');
{
	const all = SYZYGIES.concat(QUARTERS).map(realEquation);

	console.log(`Figure 1: |true - mean| up to ${f(maxAbs(all), 2)}°`);

	/* Figure 2 (b): q of Ptolemy's model over two months (greatest at the
	   quadrature perigee... asin(e / (1 - 2c))). */
	console.log(`Figure 2 (b): |q| up to asin(5.25 / 39.37) = ${f(asin(P.e / (1 - 2 * P.c)), 2)}°`);

	let lo = 1e9;
	let hi = 0;

	for (let jd = Y2026; jd <= Y2027; jd += 0.02) {
		lo = Math.min(lo, diameter(moonDist(jd)));
		hi = Math.max(hi, diameter(moonDist(jd)));
	}
	console.log(
		`Figure 6: real diameter ${f(lo, 2)}' .. ${f(hi, 2)}'; Ptolemy's up to ${f(31 + 1 / 3, 2)} x ${f(PTOLEMY_DIST.greatest / PTOLEMY_DIST.least, 3)}`
	);
}
