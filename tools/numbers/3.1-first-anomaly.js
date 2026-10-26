/* ==========================================================================
   NUMBERS FOR PAGE 3.1 "THE FIRST ANOMALY" (tools/numbers/3.1-first-anomaly.js)
   Loads the site's shared code (common, time, ephemeris and the models
   mean-sun.js, solar-eccentric.js, precession.js) in a Node vm context and
   prints every number quoted on the page, in page order.

   DRAFT FOR THE PLAN. The lunar epicycle is written here, in section 3;
   once the plan is approved it moves to shared/models/lunar-epicycle.js
   and this script loads it from there.

   Run from the repository root:  node tools/numbers/3.1-first-anomaly.js

   TABLE OF CONTENTS
	 1. Loading the shared code
	 2. Formatting and searching
	 3. The lunar epicycle (moves to shared/models/lunar-epicycle.js)
	 4. The reference Moon: syzygies and eclipses
	 5. Observation: the Moon's uneven motion; the months
	 6. Model: the epicycle, its equation of anomaly, its eccentric
	 7. Fit: the three-eclipse method
	 8. Test: the error curves
	 9. Residual: the quarters
	10. Exercises
	11. The scales of the figures
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
	'shared/models/precession.js'
]);
const { norm180, norm360, sin, cos, asin, atan2d, R2D, D2R, Time, Ephem, MeanSun, SolarEccentric, Precession } = shared;

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

const when = jd => Time.formatDate(jd, { time: true });
const date = jd => Time.formatDate(jd);
const title = text => console.log(`\n=== ${text} ===`);
const f = (x, digits) => x.toFixed(digits);

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
   3. THE LUNAR EPICYCLE (moves to shared/models/lunar-epicycle.js)
   The centre K of the epicycle moves uniformly on the deferent, centred
   on the Earth, at the mean longitude lambdaBar; the Moon moves on the
   epicycle, westward near its apogee, by the anomaly M counted from the
   apogee (the point of the epicycle farthest from the Earth). With
   e = r / R, the ratio of the radii,
	   OMoon = R u(lambdaBar) + r u(lambdaBar - M),
	   q = -atan2(e sin M, 1 + e cos M),   lambda = lambdaBar + q,
   the equation of centre of page 2.1 with r / R for e.
   ========================================================================== */

/* The mean motions of the reference Moon: the linear terms of Meeus
   47.1 (L'), 47.4 (M', from the perigee) and 47.5 (F), deg a day. */
const MEEUS = {
	lon: 481267.88123421 / 36525,
	anomaly: 477198.8675055 / 36525,
	latitude: 483202.0175233 / 36525,
	elongation: 445267.1114034 / 36525,
	L0: 218.3164477,
	Mp0: 134.9633964
};

/* Ptolemy, Almagest IV 3 (the corrected daily motions), IV 8 (the epoch,
   Nabonassar, noon at Alexandria: Taurus 11;22 in longitude, 268;49° from
   the apogee of the epicycle) and IV 6 / IV 9 (the ratio 60 : 5;15). */
const PTOLEMY = {
	L0: 30 + 11 + 22 / 60,
	n: fromSexagesimal(13, 10, 34, 58, 33, 30, 30),
	M0: 268 + 49 / 60,
	nM: fromSexagesimal(13, 3, 53, 56, 17, 51, 59),
	epoch: MeanSun.PTOLEMY.epoch,
	clock: 'ut',
	e: 5.25 / 60
};

const equationOfAnomaly = SolarEccentric.equationOfCentre;

function daysSinceEpoch(p, jd) {
	return (p.clock === 'ut' ? Time.utFromTt(jd) : jd) - p.epoch;
}

/* { meanLongitude, M, q, lambda } of a parameter set at JD(TT). */
function lunarState(p, jd) {
	const t = daysSinceEpoch(p, jd);
	const meanLongitude = norm360(p.L0 + p.n * t);
	const M = norm360(p.M0 + p.nM * t);
	const q = equationOfAnomaly(M, p.e);

	return { meanLongitude, M, q, lambda: norm360(meanLongitude + q) };
}

const lunarModel = p => jd => lunarState(p, jd).lambda;
const uniformMoon = p => jd => lunarState(p, jd).meanLongitude;

/* The three-eclipse problem. Data: the anomaly covered from the first
   eclipse to the second (a12) and from the second to the third (a23),
   and the true motion minus the mean motion over each interval (d12,
   d23), all in degrees. Unknown: e and the anomaly M2 at the second
   eclipse. With X = e cos M2, Y = e sin M2, to first order in e,
	   d12 = -X sin a12 - Y (1 - cos a12),
	   d23 = -X sin a23 + Y (1 - cos a23)      (d in radians),
   a linear system; Newton's method then solves the exact equations. */
function threeEclipses({ a12, a23, d12, d23 }) {
	const r12 = d12 * D2R;
	const r23 = d23 * D2R;
	const A = [
		[-sin(a12), -(1 - cos(a12))],
		[-sin(a23), 1 - cos(a23)]
	];
	const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
	const X1 = (r12 * A[1][1] - A[0][1] * r23) / det;
	const Y1 = (A[0][0] * r23 - A[1][0] * r12) / det;

	/* The exact residuals for a trial (X, Y), in degrees. */
	const residual = (X, Y) => {
		const e = Math.hypot(X, Y);
		const M2 = atan2d(Y, X);
		const q = M => equationOfAnomaly(M, e);

		return [q(M2) - q(M2 - a12) - d12, q(M2 + a23) - q(M2) - d23];
	};

	let X = X1;
	let Y = Y1;

	for (let i = 0; i < 20; i++) {
		const h = 1e-7;
		const r = residual(X, Y);
		const rx = residual(X + h, Y);
		const ry = residual(X, Y + h);
		const J = [
			[(rx[0] - r[0]) / h, (ry[0] - r[0]) / h],
			[(rx[1] - r[1]) / h, (ry[1] - r[1]) / h]
		];
		const dt = J[0][0] * J[1][1] - J[0][1] * J[1][0];

		X -= (r[0] * J[1][1] - J[0][1] * r[1]) / dt;
		Y -= (J[0][0] * r[1] - J[1][0] * r[0]) / dt;
	}

	const e = Math.hypot(X, Y);
	const M2 = norm360(atan2d(Y, X));

	return {
		first: { e: Math.hypot(X1, Y1), M2: norm360(atan2d(Y1, X1)) },
		e,
		M2,
		q2: equationOfAnomaly(M2, e)
	};
}

/* ==========================================================================
   4. THE REFERENCE MOON: SYZYGIES AND ECLIPSES
   Apparent longitudes of date, as every error curve of the site uses.
   ========================================================================== */

const moonLon = jd => Ephem.longitude('moon', jd);
const sunLon = jd => Ephem.longitude('sun', jd);
const moonLat = jd => Ephem.position('moon', jd).lat;

/* The daily motion (deg a day) at JD(TT): the change over one day
   centred on it. */
const moonMotion = jd => norm180(moonLon(jd + 0.5) - moonLon(jd - 0.5));

/* Every moment in [from, to] when the elongation Moon - Sun reaches
   'target' (0: new Moon, 180: full Moon, 90 / 270: quarters). */
function syzygies(target, from, to) {
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
const J2000 = 2451545.0;

/* ==========================================================================
   5. OBSERVATION
   ========================================================================== */

title("Observation: the Moon's daily motion in 2026 (Figure 1)");
{
	let slowest = { v: 99 };
	let fastest = { v: 0 };

	for (let jd = Y2026; jd <= Y2027; jd += 0.05) {
		const v = moonMotion(jd);

		if (v < slowest.v) {
			slowest = { v, jd };
		}
		if (v > fastest.v) {
			fastest = { v, jd };
		}
	}
	console.log(`mean daily motion (Meeus L'): ${f(MEEUS.lon, 4)}°/d`);
	console.log(
		`slowest ${f(slowest.v, 2)}°/d on ${date(slowest.jd)}; fastest ${f(fastest.v, 2)}°/d on ${date(fastest.jd)}`
	);
	console.log(
		`swing: ${f((100 * (fastest.v - MEEUS.lon)) / MEEUS.lon, 1)}% / ${f((100 * (slowest.v - MEEUS.lon)) / MEEUS.lon, 1)}% about the mean (the Sun: 3.4%, page 2.1)`
	);
}

title('Observation: the fastest moments of 2026 against the phases');
{
	const full = syzygies(180, Y2026 - 20, Y2027 + 20);
	const fullIn = full.filter(jd => jd >= Y2026 && jd < Y2027);

	/* Local maxima of the speed, to the day. */
	const maxima = [];

	for (let jd = Y2026; jd < Y2027; jd += 0.1) {
		if (moonMotion(jd) > moonMotion(jd - 0.1) && moonMotion(jd) >= moonMotion(jd + 0.1)) {
			maxima.push(jd);
		}
	}
	console.log('fastest moments of 2026, with the days since the last full Moon:');
	maxima.forEach(jd => {
		const lastFull = full.filter(t => t <= jd).pop();

		console.log(`   ${date(jd)}  ${f(moonMotion(jd), 2)}°/d  ${f(jd - lastFull, 1)} d after full Moon`);
	});
	console.log(
		`intervals between maxima: ${maxima
			.slice(1)
			.map((jd, i) => f(jd - maxima[i], 1))
			.join(', ')}`
	);
	console.log('the full Moons of 2026 and the speed at each:');
	fullIn.forEach(jd => console.log(`   ${when(jd)} TT  ${f(moonMotion(jd), 2)}°/d`));
}

title('Observation: the months (mean motions, Meeus 47)');
const p = Precession.MODERN.rate / 365.25; // deg a day
const nSun = MeanSun.MODERN.n;
const MONTHS = {
	tropical: 360 / MEEUS.lon,
	sidereal: 360 / (MEEUS.lon - p),
	synodic: 360 / (MEEUS.lon - nSun),
	anomalistic: 360 / MEEUS.anomaly,
	draconitic: 360 / MEEUS.latitude
};
const dhm = days => {
	const d = Math.floor(days);
	const hours = (days - d) * 24;
	const h = Math.floor(hours);
	const m = Math.round((hours - h) * 60);

	return `${d} d ${h} h ${m} min`;
};

Object.entries(MONTHS).forEach(([name, days]) => console.log(`${name.padEnd(12)} ${f(days, 5)} d  (${dhm(days)})`));
console.log(`synodic from the elongation rate D: ${f(360 / MEEUS.elongation, 5)} d`);
console.log(
	`anomalistic - sidereal = ${f((MONTHS.anomalistic - MONTHS.sidereal) * 24, 2)} h; sidereal - draconitic = ${f((MONTHS.sidereal - MONTHS.draconitic) * 24, 2)} h`
);

title('Observation: the beat of the speed against the phases');
const BEAT = 1 / (1 / MONTHS.anomalistic - 1 / MONTHS.synodic);

console.log(`beat 1 / (1/anomalistic - 1/synodic) = ${f(BEAT, 2)} d = ${f(BEAT / MONTHS.synodic, 3)} synodic months`);
console.log(
	`apsidal turn 1 / (1/anomalistic - 1/sidereal)... the apogee: 360 / (n - nM) = ${f(360 / (MEEUS.lon - MEEUS.anomaly) / 365.25, 2)} years (tropical)`
);
console.log(`   relative to the stars: ${f(360 / (MEEUS.lon - p - MEEUS.anomaly) / 365.25, 2)} years`);

title('Observation: the ancient period relations (Almagest IV 2)');
{
	const synP = fromSexagesimal(29, 31, 50, 8, 20);

	console.log(
		`Hipparchus' synodic month 29;31,50,8,20 = ${f(synP, 7)} d; real ${f(MONTHS.synodic, 7)} d; diff ${f((synP - MONTHS.synodic) * 86400, 2)} s`
	);
	console.log(
		`'Periodic': 223 syn = ${f(223 * MONTHS.synodic, 3)} d, 239 anom = ${f(239 * MONTHS.anomalistic, 3)} d, 242 drac = ${f(242 * MONTHS.draconitic, 3)} d (Almagest: 6585 1/3 d)`
	);
	console.log(
		`251 syn = ${f(251 * MONTHS.synodic, 3)} d, 269 anom = ${f(269 * MONTHS.anomalistic, 3)} d; difference ${f((251 * MONTHS.synodic - 269 * MONTHS.anomalistic) * 24, 2)} h`
	);
	console.log(
		`   anomalistic month from 251/269: ${f((251 * synP) / 269, 5)} d (Hipparchus), real ${f(MONTHS.anomalistic, 5)} d`
	);
	console.log(`5458 syn = ${f(5458 * MONTHS.synodic, 2)} d, 5923 drac = ${f(5923 * MONTHS.draconitic, 2)} d`);
	console.log(`   draconitic from 5458/5923: ${f((5458 * synP) / 5923, 5)} d, real ${f(MONTHS.draconitic, 5)} d`);
	console.log(
		`Hipparchus' 126007 d 1 h / 4267 = ${f((126007 + 1 / 24) / 4267, 7)} d; 4573 anom = ${f(4573 * MONTHS.anomalistic, 2)} d vs 4267 syn ${f(4267 * MONTHS.synodic, 2)} d`
	);
	console.log(`Ptolemy's daily motions: longitude ${f(PTOLEMY.n, 8)}°, anomaly ${f(PTOLEMY.nM, 8)}°`);
	console.log(`   his months: tropical ${f(360 / PTOLEMY.n, 5)} d, anomalistic ${f(360 / PTOLEMY.nM, 5)} d`);
	console.log(`   real: n = ${f(MEEUS.lon, 8)}°, nM = ${f(MEEUS.anomaly, 8)}°`);
}

/* ==========================================================================
   6. MODEL
   ========================================================================== */

title('Model: the epicycle of Ptolemy, 60 : 5;15 (Almagest IV 6, IV 9)');
{
	const e = PTOLEMY.e;
	const g = SolarEccentric.greatestEquation(e);
	let worst = 0;

	for (let M = 0; M < 360; M += 0.01) {
		worst = Math.max(worst, Math.abs(equationOfAnomaly(M, e) - SolarEccentric.equationOfCentreFirstOrder(M, e)));
	}
	console.log(
		`r/R = ${f(e, 5)}; greatest equation asin(r/R) = ${f(g.q, 3)}° = ${dms(g.q)} at M = ${f(g.M, 2)}° (table IV 10: 5;1 at 96°)`
	);
	console.log(
		`first-order -e sin M: greatest ${f(e * R2D, 3)}°; the exact and first-order curves differ by at most ${f(worst * 60, 1)}'`
	);

	/* The model's daily motion at the apogee and perigee of the epicycle:
	   n + nM dq/dM, dq/dM = -e (e + cos M) / (1 + 2 e cos M + e^2). */
	const speed = M => PTOLEMY.n - (PTOLEMY.nM * e * (e + cos(M))) / (1 + 2 * e * cos(M) + e * e);

	console.log(
		`daily motion at the apogee ${f(speed(0), 2)}°/d, at the perigee ${f(speed(180), 2)}°/d (mean ${f(PTOLEMY.n, 2)})`
	);
}

title('Model: the eccentric equivalent to the epicycle');
{
	const rate = MEEUS.lon - MEEUS.anomaly;
	const rateP = PTOLEMY.n - PTOLEMY.nM;

	console.log(
		`its apogee lambdaBar - M moves east by n - nM = ${f(rate, 5)}°/d = ${f(rate * MONTHS.anomalistic, 2)}° an anomalistic month, ${f(rate * 365.25, 2)}° a year; one turn in ${f(360 / rate, 0)} d = ${f(360 / rate / 365.25, 2)} years`
	);
	console.log(
		`Ptolemy: n - nM = ${sexagesimal(rateP, 5)} = ${f(rateP, 6)}°/d, a turn in ${f(360 / rateP / 365.25, 2)} years`
	);
	console.log(
		'the Sun (page 2.1): the two periods are equal (apart from the slow apogee), so the eccentric does not turn'
	);
}

/* ==========================================================================
   7. FIT
   ========================================================================== */

const triples = {
	/* Almagest IV 6: the Babylonian eclipses of -720 Mar 19/20, -719 Mar
	   8/9, -719 Sep 1/2. Anomaly 306;25 then 150;26; true motion minus
	   mean motion +3;24, then -0;37. Ptolemy: 60 : 5;13, the Moon 12;24°
	   from the apogee at the second, equation -0;59. */
	babylon: {
		a12: fromSexagesimal(306, 25),
		a23: fromSexagesimal(150, 26),
		d12: fromSexagesimal(3, 24),
		d23: -fromSexagesimal(0, 37)
	},
	/* Almagest IV 6: Ptolemy's eclipses of 133 May 6/7, 134 Oct 20/21,
	   136 Mar 5/6. Anomaly 110;21 then 81;36; -7;42, then +1;21. Ptolemy:
	   60 : 5;14, 64;38° at the second, equation -4;20. */
	alexandria: {
		a12: fromSexagesimal(110, 21),
		a23: fromSexagesimal(81, 36),
		d12: -fromSexagesimal(7, 42),
		d23: fromSexagesimal(1, 21)
	},
	/* De Revolutionibus IV 5: Copernicus' eclipses of 1511 Oct 6/7, 1522
	   Sep 5/6, 1523 Aug 25/26. Anomaly 250;36 then 306;43; true motions
	   329;47 against mean 334;47 (-5;00), then 349;09 against 346;10
	   (+2;59). Copernicus: 8,604 parts to 100,000, 21;10° at the third
	   (74;27° at the second). */
	copernicus: {
		a12: fromSexagesimal(250, 36),
		a23: fromSexagesimal(306, 43),
		d12: -5,
		d23: fromSexagesimal(2, 59)
	}
};

title('Fit: the three-eclipse method on the historical data');
Object.entries(triples).forEach(([name, data]) => {
	const s = threeEclipses(data);

	console.log(
		`${name.padEnd(11)} first order: r/R = ${f(s.first.e, 5)}, M2 = ${f(s.first.M2, 2)}°;  exact: r/R = ${f(s.e, 5)} (${sexagesimal(s.e * 60, 2)} on 60), M2 = ${f(s.M2, 2)}° (${dms(s.M2)}), q2 = ${f(s.q2, 3)}° (${dms(s.q2)}), greatest ${f(asin(s.e), 2)}°`
	);
});

/* The lunar eclipses of the reference sky: full Moons with the Moon
   within 1° of the ecliptic (umbral eclipses need about 0.9°; the
   page names only the ones that were). */
const FULL = syzygies(180, Time.julianDay(2019, 1, 1), Time.julianDay(2031, 1, 1));
const NEW = syzygies(0, Time.julianDay(2019, 1, 1), Time.julianDay(2031, 1, 1));
const ECLIPSES = FULL.filter(jd => Math.abs(moonLat(jd)) < 0.9);

title('Fit: the lunar eclipses of the reference sky, 2019 - 2030 (|beta| < 0.9° at full Moon)');
ECLIPSES.forEach(jd => console.log(`   ${when(jd)} TT   lambda ${f(moonLon(jd), 3)}°   beta ${f(moonLat(jd), 3)}°`));

/* The triple's data from three reference eclipses: the anomaly from
   Meeus' mean motion, the true motion of the reference Moon. */
function referenceTriple(t1, t2, t3) {
	const mean12 = MEEUS.lon * (t2 - t1);
	const mean23 = MEEUS.lon * (t3 - t2);

	return {
		a12: norm360(MEEUS.anomaly * (t2 - t1)),
		a23: norm360(MEEUS.anomaly * (t3 - t2)),
		d12: norm180(moonLon(t2) - moonLon(t1) - mean12),
		d23: norm180(moonLon(t3) - moonLon(t2) - mean23)
	};
}

/* Our fit: the second of the three eclipses fixes the epoch. */
function fitFromEclipses(t1, t2, t3) {
	const data = referenceTriple(t1, t2, t3);
	const s = threeEclipses(data);
	const meanAt2 = norm360(moonLon(t2) - s.q2);

	return {
		data,
		s,
		params: {
			L0: norm360(meanAt2 - MEEUS.lon * (t2 - J2000)),
			n: MEEUS.lon,
			M0: norm360(s.M2 - MEEUS.anomaly * (t2 - J2000)),
			nM: MEEUS.anomaly,
			epoch: J2000,
			e: s.e
		}
	};
}

const pick = (y, m, d) => ECLIPSES.find(jd => Math.abs(jd - Time.julianDay(y, m, d)) < 2);
const E1 = pick(2025, 9, 7);
const E2 = pick(2026, 3, 3);
const E3 = pick(2026, 8, 28);
const FIT = fitFromEclipses(E1, E2, E3);

title('Fit: our three eclipses, 2025 Sep 7, 2026 Mar 3, 2026 Aug 28');
console.log(`times (TT): ${[E1, E2, E3].map(when).join('; ')}`);
console.log(
	`anomaly a12 = ${f(FIT.data.a12, 2)}°, a23 = ${f(FIT.data.a23, 2)}°; true minus mean d12 = ${f(FIT.data.d12, 3)}°, d23 = ${f(FIT.data.d23, 3)}°`
);
console.log(
	`first order r/R = ${f(FIT.s.first.e, 5)}, M2 = ${f(FIT.s.first.M2, 2)}°; exact r/R = ${f(FIT.s.e, 5)}, M2 = ${f(FIT.s.M2, 2)}°, q2 = ${f(FIT.s.q2, 3)}°, greatest ${f(asin(FIT.s.e), 3)}°`
);
console.log(
	`parameters at J2000: L0 = ${f(FIT.params.L0, 4)}° (Meeus L'0 ${MEEUS.L0}), M0 = ${f(FIT.params.M0, 4)}° from the apogee (Meeus M'0 + 180 = ${f(MEEUS.Mp0 + 180, 4)})`
);

title('Fit: every triple of consecutive eclipses, 2019 - 2030');
{
	const values = [];

	for (let i = 0; i + 2 < ECLIPSES.length; i++) {
		const s = threeEclipses(referenceTriple(ECLIPSES[i], ECLIPSES[i + 1], ECLIPSES[i + 2]));

		values.push(s.e);
		console.log(
			`   ${date(ECLIPSES[i])} .. ${date(ECLIPSES[i + 2])}: r/R = ${f(s.e, 5)}, greatest ${f(asin(s.e), 2)}°`
		);
	}
	console.log(`range ${f(Math.min(...values), 4)} .. ${f(Math.max(...values), 4)}`);
}

title('Fit: least squares on every new and full Moon of 2026 (a check)');
{
	const times = FULL.concat(NEW).filter(jd => jd >= Y2026 && jd < Y2027);

	/* Linear in (L, X, Y) to first order: lambda - n d = L - X sin(nM d) - Y cos(nM d),
	   with X = e cos M0 and Y = e sin M0, d from J2000. Normal equations. */
	const rows = times.map(jd => {
		const d = jd - J2000;
		const unwrap = norm180(moonLon(jd) - (FIT.params.L0 + MEEUS.lon * d));

		return {
			x: [1, -sin(MEEUS.anomaly * d), -cos(MEEUS.anomaly * d)],
			y: unwrap * D2R
		};
	});
	const N = [
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0]
	];
	const b = [0, 0, 0];

	rows.forEach(row => {
		for (let i = 0; i < 3; i++) {
			b[i] += row.x[i] * row.y;
			for (let j = 0; j < 3; j++) {
				N[i][j] += row.x[i] * row.x[j];
			}
		}
	});

	/* Gaussian elimination on 3 x 3. */
	const solve = (A, v) => {
		const m = A.map((r, i) => r.concat([v[i]]));

		for (let i = 0; i < 3; i++) {
			for (let k = i + 1; k < 3; k++) {
				const factor = m[k][i] / m[i][i];

				for (let j = i; j < 4; j++) {
					m[k][j] -= factor * m[i][j];
				}
			}
		}

		const x = [0, 0, 0];

		for (let i = 2; i >= 0; i--) {
			x[i] = (m[i][3] - m[i].slice(i + 1, 3).reduce((s, a, j) => s + a * x[i + 1 + j], 0)) / m[i][i];
		}

		return x;
	};
	const [, X, Y] = solve(N, b);

	console.log(
		`${times.length} syzygies; first-order least squares: r/R = ${f(Math.hypot(X, Y), 5)}, greatest ${f(Math.hypot(X, Y) * R2D, 2)}°`
	);
}

title('Fit: what the real Moon is made of at the syzygies (Meeus 47, Fitzpatrick 6.5-6.6)');
console.log(
	`Kepler: 2 e_K = 2 x 0.0549 = ${f(2 * 0.0549, 4)}, greatest ${f(asin(2 * 0.0549), 2)}°; Meeus' leading term 6.289°`
);
console.log(
	`evection 1.274° sin(2D - M'): at new and full Moon it is -1.274 sin M', so the amplitude is 6.289 - 1.274 = ${f(6.289 - 1.274, 3)}°, i.e. r/R = ${f(sin(6.289 - 1.274), 4)}`
);
console.log(`at the quarters 6.289 + 1.274 = ${f(6.289 + 1.274, 3)}° (Ptolemy, Almagest V 3: about 7 2/3°)`);

/* ==========================================================================
   8. TEST
   ========================================================================== */

const model = lunarModel(FIT.params);
const uniform = uniformMoon(FIT.params);
const error = (fn, jd) => norm180(fn(jd) - moonLon(jd)) * 60; // arcmin

/* Largest |error| over [from, to], sampled every 'step' days. */
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

title('Test: our epicycle against the reference Moon, 2026');
{
	const all = largest(model, Y2026, Y2027);
	const flat = largest(uniform, Y2026, Y2027);
	const syz = FULL.concat(NEW).filter(jd => jd >= Y2026 && jd < Y2027);
	const atSyz = syz.map(jd => error(model, jd));
	const quarters = syzygies(90, Y2026, Y2027).concat(syzygies(270, Y2026, Y2027));
	const atQ = quarters.map(jd => error(model, jd));
	const maxAbs = list => Math.max(...list.map(Math.abs));

	console.log(`uniform Moon: largest error ${f(flat.v / 60, 2)}° on ${date(flat.jd)}`);
	console.log(`epicycle: largest error ${f(all.v / 60, 2)}° on ${date(all.jd)}`);
	console.log(
		`epicycle at the ${syz.length} new and full Moons: largest ${f(maxAbs(atSyz), 1)}', rms ${f(Math.sqrt(atSyz.reduce((s, v) => s + v * v, 0) / atSyz.length), 1)}'`
	);
	console.log(`epicycle at the ${quarters.length} quarters: largest ${f(maxAbs(atQ) / 60, 2)}°`);
	console.log(`at the three fitted eclipses: ${[E1, E2, E3].map(jd => f(error(model, jd), 2)).join(', ')}'`);
	console.log(
		`at the eclipses of 2025 Mar 14 and 2027 (outside the fit): ${ECLIPSES.filter(jd => jd < E1 || jd > E3)
			.filter(jd => Math.abs(jd - E2) < 800)
			.map(jd => `${date(jd)} ${f(error(model, jd), 1)}'`)
			.join('; ')}`
	);
}

title('Test: our epicycle over 100 and 1,000 years');
{
	const a = largest(model, Time.julianDay(1976, 1, 1), Time.julianDay(2076, 1, 1), 0.25);
	const b = largest(model, Time.julianDay(1526, 1, 1), Time.julianDay(2526, 1, 1), 1);

	console.log(
		`1976 - 2076: largest ${f(a.v / 60, 2)}° on ${date(a.jd)}; 1526 - 2526: largest ${f(b.v / 60, 2)}° on ${date(b.jd)}`
	);

	/* At the syzygies only, at the ends of the millennium. */
	[1526, 1776, 2276, 2526].forEach(y => {
		const full = syzygies(180, Time.julianDay(y, 1, 1), Time.julianDay(y + 1, 1, 1));
		const worst = Math.max(...full.map(jd => Math.abs(error(model, jd))));

		console.log(`   full Moons of ${y}: largest ${f(worst, 1)}'`);
	});
}

title("Test: Ptolemy's simple Moon (first anomaly only)");
{
	const ptolemy = lunarModel(PTOLEMY);
	const check = (label, y, m, d) => {
		const jd = FULL.length && syzygiesNear(y, m, d);
		const s = lunarState(PTOLEMY, jd);

		console.log(
			`   ${label}: opposition ${when(jd)} TT; Ptolemy's Moon ${f(s.lambda, 2)}°, real ${f(moonLon(jd), 2)}°, error ${f(error(ptolemy, jd), 1)}'; mean ${f(s.meanLongitude, 2)}°, anomaly ${f(s.M, 2)}°`
		);
	};
	const syzygiesNear = (y, m, d) => {
		const jd0 = Time.julianDay(y, m, d);

		return syzygies(180, jd0 - 3, jd0 + 3)[0];
	};

	console.log('at the eclipses of IV 6 (the real moments of opposition):');
	check('-720 Mar 19', -720, 3, 19);
	check('-719 Mar 8', -719, 3, 8);
	check('-719 Sep 1', -719, 9, 1);
	check('133 May 6', 133, 5, 6);
	check('134 Oct 20', 134, 10, 20);
	check('136 Mar 5', 136, 3, 5);

	const from = Time.julianDay(135, 1, 1);
	const to = Time.julianDay(136, 1, 1);
	const all = largest(ptolemy, from, to);
	const syz = syzygies(180, from, to)
		.concat(syzygies(0, from, to))
		.map(jd => error(ptolemy, jd));

	console.log(
		`AD 135: largest error ${f(all.v / 60, 2)}°; at the syzygies between ${f(Math.min(...syz) / 60, 2)}° and ${f(Math.max(...syz) / 60, 2)}°`
	);

	[-720, 1, 500, 1000, 1500, 2026].forEach(y => {
		const a = Time.julianDay(y, 1, 1);
		const syzY = syzygies(180, a, a + 365)
			.concat(syzygies(0, a, a + 365))
			.map(jd => error(ptolemy, jd));
		const mean = syzY.reduce((s, v) => s + v, 0) / syzY.length;

		console.log(`   ${y}: mean error at the syzygies ${f(mean / 60, 2)}°`);
	});

	/* The check of our implementation against IV 7: the mean positions
	   at the second Babylonian eclipse, 27 Egyptian years 17 days 11 1/6
	   h after the epoch (IV 8): Virgo 14;44 and 12;24° of anomaly. */
	const t = 27 * 365 + 17 + 11 / 24 + 10 / 1440;

	console.log(
		`implementation check: ${f(norm360(PTOLEMY.L0 + PTOLEMY.n * t), 3)}° (Virgo 14;44 = 164.733), anomaly ${f(norm360(PTOLEMY.M0 + PTOLEMY.nM * t), 3)}° (12;24 = 12.400)`
	);
}

/* ==========================================================================
   9. RESIDUAL
   ========================================================================== */

title('Residual: the quarters');
{
	const quarters = syzygies(90, Y2026, Y2027).concat(syzygies(270, Y2026, Y2027));
	const worst = quarters.reduce(
		(w, jd) => (Math.abs(error(model, jd)) > Math.abs(w.v) ? { v: error(model, jd), jd } : w),
		{ v: 0 }
	);

	console.log(`largest error at a quarter in 2026: ${f(worst.v / 60, 2)}° on ${date(worst.jd)}`);
}

title("Residual: Hipparchus' sighting of -127 Aug 5 (Almagest V 3)");
{
	const M = fromSexagesimal(257, 47);
	const q = equationOfAnomaly(M, PTOLEMY.e);
	const meanToSun = fromSexagesimal(93, 55);
	const observed = fromSexagesimal(86, 15);

	console.log(
		`first anomaly at 257;47: q = +${f(q, 2)}° (${dms(q)}); predicted Sun - Moon = ${f(meanToSun - q, 2)}°, observed ${f(observed, 2)}°: the model is ${f(meanToSun - q - observed, 2)}° short`
	);
	console.log(`Ptolemy: true minus mean ${f(meanToSun - observed, 2)}° (7 2/3) instead of about 5`);
}

/* ==========================================================================
   10. EXERCISES
   ========================================================================== */

title("Exercise 1: Hipparchus' two ratios (IV 11)");
[
	['eccentric 60 : 6;15', 6.25 / 60],
	['epicycle 60 : 4;46', (4 + 46 / 60) / 60],
	['Ptolemy 60 : 5;15', 5.25 / 60]
].forEach(([label, e]) => console.log(`   ${label}: greatest equation ${dms(asin(e))} (${f(asin(e), 3)}°)`));

title('Exercise 2: the anomalistic month from the beat');
{
	/* The full Moons nearest perigee: the fastest full Moon of each run. */
	const full = syzygies(180, Time.julianDay(2000, 1, 1), Time.julianDay(2040, 1, 1));
	const speeds = full.map(jd => ({ jd, v: moonMotion(jd) }));
	const peaks = speeds.filter(
		(s, i) => i > 0 && i < speeds.length - 1 && s.v > speeds[i - 1].v && s.v > speeds[i + 1].v
	);

	console.log('fastest full Moons (local maxima of the speed at full Moon):');
	peaks.forEach((s, i) =>
		console.log(`   ${date(s.jd)} ${f(s.v, 3)}°/d${i ? `  +${f(s.jd - peaks[i - 1].jd, 1)} d` : ''}`)
	);

	const span = peaks[peaks.length - 1].jd - peaks[0].jd;
	const beats = peaks.length - 1;

	console.log(
		`${beats} beats in ${f(span, 1)} d: beat ${f(span / beats, 2)} d; anomalistic month 1/(1/29.530589 + beats/span) = ${f(1 / (1 / MONTHS.synodic + beats / span), 4)} d (real ${f(MONTHS.anomalistic, 4)})`
	);
	console.log(`with the beat 411.78 d: ${f(1 / (1 / MONTHS.synodic + 1 / 411.78), 5)} d`);
	console.log(`from the Periodic, 223 syn / 239: ${f((223 * MONTHS.synodic) / 239, 4)} d`);
}

title("Exercise 3: Ptolemy's three Babylonian eclipses (see the Fit section)");
{
	const s = threeEclipses(triples.babylon);

	console.log(`first order: X = e cos M2, Y = e sin M2 -> r/R = ${f(s.first.e, 5)}, M2 = ${f(s.first.M2, 2)}°`);
	console.log(
		`exact: r/R = ${f(s.e, 5)} = ${sexagesimal(s.e * 60, 2)} parts in 60 (Ptolemy 5;13), M2 = ${dms(s.M2)} (12;24), q2 = ${dms(s.q2)} (-0;59)`
	);
	console.log(
		`mean longitude at the second eclipse: true Virgo 13;45 (163.75°) - q2 = ${f(163.75 - s.q2, 3)}° (Virgo 14;44 = 164.733)`
	);
}

/* ==========================================================================
   11. THE SCALES OF THE FIGURES
   ========================================================================== */

title('Scales');
console.log(`Figure 2 (b): q for r/R up to 0.3: greatest asin 0.3 = ${f(asin(0.3), 2)}°`);
{
	let lo = 99;
	let hi = 0;

	for (let jd = Y2026; jd <= Y2027; jd += 0.05) {
		lo = Math.min(lo, moonMotion(jd));
		hi = Math.max(hi, moonMotion(jd));
	}
	console.log(`Figure 1: daily motion between ${f(lo, 2)} and ${f(hi, 2)}°/d`);
}
