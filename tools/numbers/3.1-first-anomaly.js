/* ==========================================================================
   NUMBERS FOR PAGE 3.1 "THE FIRST ANOMALY" (tools/numbers/3.1-first-anomaly.js)
   Loads the site's shared code (common, time, ephemeris and the models
   mean-sun.js, solar-eccentric.js, precession.js, lunar-epicycle.js) in a
   Node vm context and prints every number quoted on the page, in page
   order.

   Run from the repository root:  node tools/numbers/3.1-first-anomaly.js
   (about a minute: it finds every new and full Moon of forty years)

   TABLE OF CONTENTS
	 1. Loading the shared code
	 2. Formatting and searching
	 3. The reference Moon: syzygies and eclipses
	 4. Observation: the Moon's uneven motion; the months
	 5. Model: the epicycle, its equation of anomaly, its eccentric
	 6. Fit: the three-eclipse method
	 7. Test: the error curves
	 8. Residual: the quarters
	 9. Exercises
	10. The scales of the figures
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
	'shared/models/precession.js',
	'shared/models/lunar-epicycle.js'
]);
const { norm180, sin, asin, R2D, D2R, Time, Ephem, MeanSun, SolarEccentric, Precession, LunarEpicycle } = shared;
const { MEEUS, PTOLEMY, TRIPLES } = LunarEpicycle;

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
const maxAbs = list => Math.max(...list.map(Math.abs));

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
   3. THE REFERENCE MOON: SYZYGIES AND ECLIPSES
   Apparent longitudes of date, as every error curve of the site uses.
   ========================================================================== */

const moonLon = jd => Ephem.longitude('moon', jd);
const sunLon = jd => Ephem.longitude('sun', jd);
const moonLat = jd => Ephem.position('moon', jd).lat;

/* The daily motion (deg a day) at JD(TT): the change over one day
   centred on it. */
const moonMotion = jd => norm180(moonLon(jd + 0.5) - moonLon(jd - 0.5));

/* Every moment in [from, to] when the elongation Moon - Sun reaches
   'target' (0: new Moon, 180: full Moon, 90 and 270: the quarters). */
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
const J2000 = 2451545.0;

/* Every new and full Moon of 2019 - 2030, and the lunar eclipses among
   the full Moons: the Moon within 0.9° of the ecliptic, about the limit
   for an eclipse by the umbra. */
const FULL = phases(180, Time.julianDay(2019, 1, 1), Time.julianDay(2031, 1, 1));
const NEW = phases(0, Time.julianDay(2019, 1, 1), Time.julianDay(2031, 1, 1));
const ECLIPSES = FULL.filter(jd => Math.abs(moonLat(jd)) < 0.9);
const in2026 = list => list.filter(jd => jd >= Y2026 && jd < Y2027);

/* ==========================================================================
   4. OBSERVATION
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
	console.log(`mean daily motion (Meeus L'): ${f(MEEUS.n, 4)}°/d`);
	console.log(
		`slowest ${f(slowest.v, 2)}°/d on ${date(slowest.jd)}; fastest ${f(fastest.v, 2)}°/d on ${date(fastest.jd)}`
	);
	console.log(
		`swing about the mean: +${f((100 * (fastest.v - MEEUS.n)) / MEEUS.n, 1)}% / ${f((100 * (slowest.v - MEEUS.n)) / MEEUS.n, 1)}% (the Sun: 3.4%, page 2.1)`
	);
}

title('Observation: the fastest moments of 2026 against the full Moons');
{
	const full = phases(180, Y2026 - 40, Y2027);
	const maxima = [];

	for (let jd = Y2026; jd < Y2027; jd += 0.1) {
		if (moonMotion(jd) > moonMotion(jd - 0.1) && moonMotion(jd) >= moonMotion(jd + 0.1)) {
			maxima.push(jd);
		}
	}
	console.log('fastest moments of 2026, and the days since the last full Moon:');
	maxima.forEach(jd => {
		const lastFull = full.filter(t => t <= jd).pop();

		console.log(`   ${date(jd)}  ${f(moonMotion(jd), 2)}°/d  ${f(jd - lastFull, 1)} d after full Moon`);
	});
	console.log(
		`mean interval between maxima: ${f((maxima[maxima.length - 1] - maxima[0]) / (maxima.length - 1), 2)} d`
	);
	console.log('the full Moons of 2026 and the speed at each:');
	in2026(FULL).forEach(jd => console.log(`   ${when(jd)} TT  ${f(moonMotion(jd), 2)}°/d`));
}

title('Observation: the months (mean motions, Meeus 47)');
const p = Precession.MODERN.rate / 365.25; // deg a day
const nSun = MeanSun.MODERN.n;
const nF = 483202.0175233 / 36525; // Meeus 47.5, the argument of latitude
const MONTHS = {
	tropical: 360 / MEEUS.n,
	sidereal: 360 / (MEEUS.n - p),
	synodic: 360 / (MEEUS.n - nSun),
	anomalistic: 360 / MEEUS.nM,
	draconitic: 360 / nF
};
const dhm = days => {
	const d = Math.floor(days);
	const hours = (days - d) * 24;
	const h = Math.floor(hours);
	const m = Math.round((hours - h) * 60);

	return `${d} d ${h} h ${m} min`;
};

Object.entries(MONTHS).forEach(([name, days]) => console.log(`${name.padEnd(12)} ${f(days, 5)} d  (${dhm(days)})`));
console.log(
	`sidereal - tropical = ${f((MONTHS.sidereal - MONTHS.tropical) * 86400, 1)} s; anomalistic - sidereal = ${f((MONTHS.anomalistic - MONTHS.sidereal) * 24, 2)} h; sidereal - draconitic = ${f((MONTHS.sidereal - MONTHS.draconitic) * 24, 2)} h`
);

title('Observation: the beat of the speed against the phases');
const BEAT = 1 / (1 / MONTHS.anomalistic - 1 / MONTHS.synodic);

console.log(`beat 1/(1/anomalistic - 1/synodic) = ${f(BEAT, 2)} d = ${f(BEAT / MONTHS.synodic, 3)} synodic months`);
console.log(
	`the fastest moment comes ${f(MONTHS.synodic - MONTHS.anomalistic, 2)} d earlier in the cycle of phases each month`
);
console.log(
	`the place of greatest speed turns east once in ${f(1 / (1 / MONTHS.tropical - 1 / MONTHS.anomalistic) / 365.25, 2)} years (relative to γ), ${f(1 / (1 / MONTHS.sidereal - 1 / MONTHS.anomalistic) / 365.25, 2)} years (to the stars)`
);

title('Observation: the ancient period relations (Almagest IV 2, IV 3)');
{
	const synP = fromSexagesimal(29, 31, 50, 8, 20);

	console.log(
		`Hipparchus' synodic month 29;31,50,8,20 = ${f(synP, 7)} d; real ${f(MONTHS.synodic, 7)} d; difference ${f((synP - MONTHS.synodic) * 86400, 2)} s`
	);
	console.log(
		`'Periodic': 223 syn = ${f(223 * MONTHS.synodic, 2)} d, 239 anom = ${f(239 * MONTHS.anomalistic, 2)} d, 242 drac = ${f(242 * MONTHS.draconitic, 2)} d (Almagest: 6585 1/3 d)`
	);
	console.log(
		`251 syn = ${f(251 * MONTHS.synodic, 3)} d, 269 anom = ${f(269 * MONTHS.anomalistic, 3)} d; difference ${f((251 * MONTHS.synodic - 269 * MONTHS.anomalistic) * 24 * 60, 1)} min`
	);
	console.log(
		`   anomalistic month from 251/269 and Hipparchus' synodic month: ${f((251 * synP) / 269, 5)} d, real ${f(MONTHS.anomalistic, 5)} d`
	);
	console.log(
		`5458 syn = ${f(5458 * MONTHS.synodic, 2)} d, 5923 drac = ${f(5923 * MONTHS.draconitic, 2)} d; draconitic from them ${f((5458 * synP) / 5923, 5)} d, real ${f(MONTHS.draconitic, 5)} d`
	);
	console.log(
		`Ptolemy's daily motions: longitude ${f(PTOLEMY.n, 8)}°, anomaly ${f(PTOLEMY.nM, 8)}°; real ${f(MEEUS.n, 8)}°, ${f(MEEUS.nM, 8)}°`
	);
	console.log(
		`   his tropical month ${f(360 / PTOLEMY.n, 5)} d, anomalistic ${f(360 / PTOLEMY.nM, 5)} d (${f((360 / PTOLEMY.nM - MONTHS.anomalistic) * 86400, 1)} s too long)`
	);
	console.log(`248 days / 9 = ${f(248 / 9, 4)} d (the Babylonian table of the Moon's daily motion)`);
}

/* ==========================================================================
   5. MODEL
   ========================================================================== */

title("Model: Ptolemy's epicycle, 60 : 5;15 (Almagest IV 9, IV 10)");

/* The ratios of the sources, in parts where the deferent is 60, written
   as decimals on the page: Ptolemy's 5;13 and 5;14 from his eclipses
   (IV 6) and the 5;15 he adopts (IV 9), Hipparchus' 6;15 and 4;46 (IV 11). */
console.log(
	`the ratios as decimals of 60: ${[
		[5, 13],
		[5, 14],
		[5, 15],
		[6, 15],
		[4, 46]
	]
		.map(([units, minutes]) => `${units};${minutes} = ${f(units + minutes / 60, 2)}`)
		.join(', ')}`
);
{
	const e = PTOLEMY.e;
	const g = SolarEccentric.greatestEquation(e);
	let worst = 0;

	for (let M = 0; M < 360; M += 0.01) {
		worst = Math.max(
			worst,
			Math.abs(LunarEpicycle.equationOfAnomaly(M, e) - SolarEccentric.equationOfCentreFirstOrder(M, e))
		);
	}
	console.log(
		`r/R = ${f(e, 5)}; greatest equation asin(r/R) = ${f(g.q, 3)}° = ${dms(g.q)} at M = ${f(g.M, 2)}° (his table: 5;1 at 96°)`
	);
	console.log(`the exact and first-order curves differ by at most ${f(worst * 60, 1)}'`);
	console.log(
		`daily motion at the apogee of the epicycle ${f(LunarEpicycle.dailyMotion(PTOLEMY, 0), 2)}°/d, at the perigee ${f(LunarEpicycle.dailyMotion(PTOLEMY, 180), 2)}°/d`
	);
}

title('Model: the equivalent eccentric');
{
	const rate = MEEUS.n - MEEUS.nM;
	const rateP = PTOLEMY.n - PTOLEMY.nM;

	console.log(
		`its apogee moves east by n - nM = ${f(rate, 5)}°/d = ${f(rate * MONTHS.anomalistic, 2)}° an anomalistic month, ${f(rate * 365.25, 1)}° a year; a turn in ${f(360 / rate, 0)} d = ${f(360 / rate / 365.25, 2)} years`
	);
	console.log(
		`Ptolemy: n - nM = ${sexagesimal(rateP, 5)}° = ${f(rateP, 6)}°/d, a turn in ${f(360 / rateP / 365.25, 2)} years`
	);
}

/* ==========================================================================
   6. FIT
   ========================================================================== */

title('Fit: the mean motions from the synodic month and the Sun (Almagest IV 2, IV 3)');
{
	const synodic = fromSexagesimal(29, 31, 50, 8, 20);
	const nSunP = MeanSun.PTOLEMY.n;
	const perMonth = nSunP * synodic + 360;
	const n = perMonth / synodic;
	const nMRaw = (269 * 360) / (251 * synodic);
	const nMRawSource = fromSexagesimal(13, 3, 53, 56, 29, 38, 38);
	const correction = fromSexagesimal(0, 0, 0, 0, 11, 46, 39);

	console.log(
		`Hipparchus' synodic month: 126,007 d 1 h / 4,267 = ${f((126007 + 1 / 24) / 4267, 7)} d; Ptolemy's value 29;31,50,8,20 = ${f(synodic, 7)} d`
	);
	console.log(
		`the Moon's mean motion in a month: Sun's ${f(nSunP, 8)}°/d x ${f(synodic, 7)} d + 360° = ${f(perMonth, 4)}° (Ptolemy 389;6,23,... = ${f(fromSexagesimal(389, 6, 23, 1, 24, 2, 30, 57), 4)}°)`
	);
	console.log(
		`n = n_sun + 360°/P_s = ${f(n, 8)}°/d (Ptolemy 13;10,34,58,33,30,30 = ${f(PTOLEMY.n, 8)}°/d; reference ${f(MEEUS.n, 8)}°/d)`
	);
	console.log(
		`   Ptolemy's n minus the reference's: ${f((PTOLEMY.n - MEEUS.n) * 3600, 4)}"/d = ${f((PTOLEMY.n - MEEUS.n) * 3600 * 365.25, 1)}" a year`
	);
	console.log(
		`n_M = 269 x 360° / (251 P_s) = ${f(nMRaw, 8)}°/d (Ptolemy before correction 13;3,53,56,29,38,38 = ${f(nMRawSource, 8)}°/d)`
	);
	console.log(
		`   corrected (IV 7) by ${f(correction * 3600, 5)}" a day: ${f(nMRawSource - correction, 8)}°/d (PTOLEMY.nM ${f(PTOLEMY.nM, 8)}; reference ${f(MEEUS.nM, 8)}°/d)`
	);
	console.log(
		`the same with the modern Sun and month: n = ${f(MeanSun.MODERN.n + 360 / MONTHS.synodic, 8)}°/d, n_M = ${f((269 * 360) / (251 * MONTHS.synodic), 8)}°/d`
	);
	console.log(`the Moon moves ${f(MEEUS.n / 24, 3)}° in an hour`);
}

title("Fit: the data of Ptolemy's Babylonian triple (Almagest IV 6)");
{
	const intervals = [354 + 2.5 / 24, 176 + 20.5 / 24];
	const mean = [fromSexagesimal(345, 51), fromSexagesimal(170, 7)];
	const anomaly = [fromSexagesimal(306, 25), fromSexagesimal(150, 26)];
	const sun = [fromSexagesimal(349, 15), fromSexagesimal(169, 30)];
	const wrap = x => ((x % 360) + 360) % 360;

	intervals.forEach((days, i) => {
		const longitude = wrap(PTOLEMY.n * days);
		const turns = Math.floor((PTOLEMY.n * days) / 360);
		const accurate = (mean[i] + 360 * turns) / PTOLEMY.n;

		console.log(
			`interval ${i + 1}: ${f(days, 4)} d as recorded; n dt = ${dms(longitude)} (${f(longitude, 3)}°, Ptolemy ${dms(mean[i])}), nM dt = ${dms(wrap(PTOLEMY.nM * days))} (Ptolemy ${dms(anomaly[i])}); in decimal minutes ${Math.floor(longitude)}°${f((longitude % 1) * 60, 1)}', ${Math.floor(wrap(PTOLEMY.nM * days))}°${f((wrap(PTOLEMY.nM * days) % 1) * 60, 1)}'`
		);
		console.log(
			`   his mean motion in longitude implies ${f(accurate, 4)} d = ${Math.floor(accurate)} d ${f((accurate % 1) * 24, 2)} h; difference from the recorded ${f((accurate - days) * 24 * 60, 0)} min`
		);
		console.log(
			`   d = Sun's true motion ${dms(sun[i])} - mean ${dms(mean[i])} = ${dms(sun[i] - mean[i])} (${f(sun[i] - mean[i], 4)}°)`
		);
	});
}

title('Fit: the three-eclipse method on the sources');
Object.entries(TRIPLES).forEach(([name, data]) => {
	const s = LunarEpicycle.threeEclipses(data);

	console.log(
		`${name.padEnd(11)} first order: r/R = ${f(s.first.e, 5)}, M2 = ${f(s.first.M2, 2)}° (X ${f(s.first.X, 4)}, Y ${f(s.first.Y, 4)})`
	);
	console.log(
		`            exact: r/R = ${f(s.e, 5)} (${sexagesimal(s.e * 60, 2)} on 60), M2 = ${dms(s.M2)}, q2 = ${dms(s.q2)}, greatest ${f(asin(s.e), 2)}° (X ${f(s.X, 4)}, Y ${f(s.Y, 4)})`
	);
	console.log(
		`            the source: r/R = ${f(data.result.e, 5)}, M2 = ${dms(data.result.M2)}; greatest ${dms(asin(data.result.e))}`
	);
});

title('Fit: the lunar eclipses of the reference sky, 2019 - 2030');
ECLIPSES.forEach(jd =>
	console.log(`   ${when(jd)} TT  JD ${f(jd, 6)}  lambda ${f(moonLon(jd), 3)}°  beta ${f(moonLat(jd), 3)}°`)
);

/* Our fit: the three eclipses around 2026; the second fixes the epoch. */
const pick = (y, m, d) => ECLIPSES.find(jd => Math.abs(jd - Time.julianDay(y, m, d)) < 2);
const OURS = [pick(2025, 9, 7), pick(2026, 3, 3), pick(2026, 8, 28)];
const OURS_LON = OURS.map(moonLon);
const OURS_DATA = LunarEpicycle.tripleFromObservations(OURS, OURS_LON, MEEUS);
const OURS_SOLUTION = LunarEpicycle.threeEclipses(OURS_DATA);
const FIT = LunarEpicycle.fitEclipses(OURS, OURS_LON, MEEUS, J2000);

title('Fit: our three eclipses, 7 Sep 2025, 3 Mar 2026, 28 Aug 2026');
console.log(`moments (TT): ${OURS.map(when).join('; ')}`);
console.log(`ECLIPSES_2026 = [${OURS.map(jd => f(jd, 6)).join(', ')}]`);
console.log(`true longitudes ${OURS_LON.map(l => f(l, 3)).join('°, ')}°`);
console.log(
	`anomaly a12 = ${f(OURS_DATA.a12, 2)}°, a23 = ${f(OURS_DATA.a23, 2)}°; true minus mean d12 = ${f(OURS_DATA.d12, 3)}°, d23 = ${f(OURS_DATA.d23, 3)}°`
);
console.log(
	`first order r/R = ${f(OURS_SOLUTION.first.e, 5)}, M2 = ${f(OURS_SOLUTION.first.M2, 2)}°; exact r/R = ${f(OURS_SOLUTION.e, 5)}, M2 = ${f(OURS_SOLUTION.M2, 2)}°, q2 = ${f(OURS_SOLUTION.q2, 3)}°, greatest ${f(asin(OURS_SOLUTION.e), 3)}° (X ${f(OURS_SOLUTION.X, 4)}, Y ${f(OURS_SOLUTION.Y, 4)})`
);
console.log(
	`FIT_2026: L0 = ${f(FIT.L0, 6)}, M0 = ${f(FIT.M0, 6)}, e = ${f(FIT.e, 6)} (model file: L0 ${LunarEpicycle.FIT_2026.L0}, M0 ${LunarEpicycle.FIT_2026.M0}, e ${LunarEpicycle.FIT_2026.e})`
);
console.log(
	`   against Meeus at J2000: L'0 = ${MEEUS.L0}, M'0 + 180 = ${f(MEEUS.M0, 4)}; differences ${f((FIT.L0 - MEEUS.L0) * 60, 2)}', ${f(FIT.M0 - MEEUS.M0, 2)}°`
);

title('Fit: the data of the eclipses of 2025 - 2026, from the Sun');
{
	OURS.slice(1).forEach((t2, i) => {
		const t1 = OURS[i];
		const days = t2 - t1;
		const sunMotion = norm180(sunLon(t2) - sunLon(t1) - 180) + 180;
		const moonMotionTrue = norm180(moonLon(t2) - moonLon(t1) - 180) + 180;
		const mean = (((MEEUS.n * days) % 360) + 360) % 360;
		const a = (((MEEUS.nM * days) % 360) + 360) % 360;

		console.log(
			`interval ${i + 1}: ${f(days, 4)} d = ${Math.floor(days)} d ${f((days % 1) * 24, 1)} h; Sun's true motion ${f(sunMotion, 3)}° (the Moon's ${f(moonMotionTrue, 3)}°); mean n dt = ${f(mean, 3)}°; a = nM dt = ${f(a, 2)}°; d = ${f(sunMotion - mean, 3)}°`
		);
	});
}

title('Fit: every three consecutive eclipses, 2019 - 2030');
{
	const values = [];

	for (let i = 0; i + 2 < ECLIPSES.length; i++) {
		const times = ECLIPSES.slice(i, i + 3);
		const s = LunarEpicycle.threeEclipses(LunarEpicycle.tripleFromObservations(times, times.map(moonLon), MEEUS));

		values.push(s.e);
		console.log(`   ${date(times[0])} .. ${date(times[2])}: r/R = ${f(s.e, 4)}, greatest ${f(asin(s.e), 2)}°`);
	}
	console.log(
		`range r/R ${f(Math.min(...values), 3)} .. ${f(Math.max(...values), 3)}; greatest equation ${f(asin(Math.min(...values)), 1)}° .. ${f(asin(Math.max(...values)), 1)}°`
	);
}

title('Fit: least squares on every new and full Moon of 2026 (a check)');
{
	const times = in2026(FULL.concat(NEW));

	/* To first order, lambda - n d = L - X sin(nM d) - Y cos(nM d), with
	   X = e cos M0 and Y = e sin M0 and d from J2000: linear in (L, X, Y).
	   The normal equations, solved by elimination. */
	const rows = times.map(jd => {
		const d = jd - J2000;

		return {
			x: [1, -sin(MEEUS.nM * d), -Math.cos(MEEUS.nM * d * D2R)],
			y: norm180(moonLon(jd) - (FIT.L0 + MEEUS.n * d)) * D2R
		};
	});
	const N = [0, 1, 2].map(i => [0, 1, 2].map(j => rows.reduce((s, r) => s + r.x[i] * r.x[j], 0)));
	const b = [0, 1, 2].map(i => rows.reduce((s, r) => s + r.x[i] * r.y, 0));

	for (let i = 0; i < 3; i++) {
		for (let k = i + 1; k < 3; k++) {
			const factor = N[k][i] / N[i][i];

			for (let j = i; j < 3; j++) {
				N[k][j] -= factor * N[i][j];
			}
			b[k] -= factor * b[i];
		}
	}

	const x = [0, 0, 0];

	for (let i = 2; i >= 0; i--) {
		let sum = b[i];

		for (let j = i + 1; j < 3; j++) {
			sum -= N[i][j] * x[j];
		}
		x[i] = sum / N[i][i];
	}
	console.log(
		`${times.length} new and full Moons: r/R = ${f(Math.hypot(x[1], x[2]), 4)}, greatest ${f(Math.hypot(x[1], x[2]) * R2D, 2)}°`
	);
}

title('Fit: the exact epicycle by least squares on the same new and full Moons (a check)');
{
	const times = in2026(FULL.concat(NEW));
	const residualsOf = q => {
		const model = LunarEpicycle.make(Object.assign({}, FIT, { L0: q[0], M0: q[1], e: q[2] }));

		return times.map(jd => norm180(model(jd) - moonLon(jd)));
	};

	/* Gauss-Newton on (L0, M0, e), from the three-eclipse fit; the
	   Jacobian by differences, the 3 x 3 normal equations by Cramer. */
	let q = [FIT.L0, FIT.M0, FIT.e];

	for (let iteration = 0; iteration < 10; iteration++) {
		const r = residualsOf(q);
		const steps = [1e-5, 1e-5, 1e-7];
		const J = steps.map((h, k) => {
			const moved = q.slice();

			moved[k] += h;

			return residualsOf(moved).map((v, i) => (v - r[i]) / h);
		});
		const N = [0, 1, 2].map(a => [0, 1, 2].map(b => J[a].reduce((sum, v, i) => sum + v * J[b][i], 0)));
		const g = [0, 1, 2].map(a => J[a].reduce((sum, v, i) => sum + v * r[i], 0));
		const det3 = m =>
			m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
			m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
			m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
		const D = det3(N);
		const delta = [0, 1, 2].map(k => det3(N.map((row, i) => row.map((v, j) => (j === k ? g[i] : v)))) / D);

		q = q.map((v, k) => v - delta[k]);
	}

	const r = residualsOf(q).map(v => v * 60);
	const rmsLs = Math.sqrt(r.reduce((sum, v) => sum + v * v, 0) / r.length);

	console.log(
		`exact least squares: r/R = ${f(q[2], 4)}, greatest ${f(asin(q[2]), 2)}°, M0 ${f(q[1] - MEEUS.M0, 2)}° from Meeus' M' + 180; largest error ${f(maxAbs(r), 1)}', rms ${f(rmsLs, 1)}'`
	);
}

title('Fit: the smaller inequalities at new and full Moon (Meeus 47.A, 47.B)');
console.log(
	`annual equation 0.185116° sin M (the Sun's anomaly) = ${f(0.185116 * 60, 1)}'; reduction to the ecliptic 0.114332° sin 2F = ${f(0.114332 * 60, 1)}'`
);

title('Fit: the real Moon at new and full Moon (Meeus 47; Fitzpatrick 6.5 - 6.6)');
console.log(`the Moon's eccentricity (Fitzpatrick, Table 6.1): 0.054881 = ${f(0.054881, 3)}`);
console.log(
	`Kepler: 2 e_K = 2 x 0.0549 = ${f(2 * 0.0549, 4)}, greatest ${f(asin(2 * 0.0549), 2)}°; Meeus' term 6.289°`
);
console.log(
	`evection 1.274° sin(2D - M'): at new and full Moon -1.274 sin M', so the amplitude is 6.289 - 1.274 = ${f(6.289 - 1.274, 3)}°, r/R = ${f(sin(6.289 - 1.274), 4)}`
);
console.log(`at the quarters 6.289 + 1.274 = ${f(6.289 + 1.274, 3)}° (Ptolemy, Almagest V 3: about 7 2/3°)`);

/* ==========================================================================
   7. TEST
   ========================================================================== */

const model = LunarEpicycle.make(LunarEpicycle.FIT_2026);
const uniform = LunarEpicycle.makeUniform(LunarEpicycle.FIT_2026);
const ptolemy = LunarEpicycle.make(PTOLEMY);
const ptolemySun = SolarEccentric.make(SolarEccentric.PTOLEMY);
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

title('Test: our epicycle against the reference Moon, 2026 (Figure 5)');
{
	const all = largest(model, Y2026, Y2027);
	const flat = largest(uniform, Y2026, Y2027);
	const syzygies = in2026(FULL.concat(NEW));
	const atSyzygies = syzygies.map(jd => error(model, jd));
	const quarters = phases(90, Y2026, Y2027).concat(phases(270, Y2026, Y2027));
	const atQuarters = quarters.map(jd => error(model, jd));
	const rms = list => Math.sqrt(list.reduce((s, v) => s + v * v, 0) / list.length);

	console.log(`the uniform Moon: largest error ${f(flat.v / 60, 2)}° on ${date(flat.jd)}`);
	console.log(`the epicycle: largest error ${f(all.v / 60, 2)}° on ${date(all.jd)}`);
	console.log(
		`the epicycle at the ${syzygies.length} new and full Moons: largest ${f(maxAbs(atSyzygies), 1)}', rms ${f(rms(atSyzygies), 1)}'`
	);
	console.log(`the epicycle at the ${quarters.length} quarters: largest ${f(maxAbs(atQuarters) / 60, 2)}°`);
	console.log(`at the three fitted eclipses: ${OURS.map(jd => f(error(model, jd), 2)).join(', ')}'`);
	console.log(`at the eclipse of 14 Mar 2025 (outside the fit): ${f(error(model, pick(2025, 3, 14)), 1)}'`);
}

title('Test: our epicycle over 100 and 1,000 years');
{
	const century = largest(model, Time.julianDay(1976, 1, 1), Time.julianDay(2076, 1, 1), 0.25);

	console.log(`1976 - 2076: largest ${f(century.v / 60, 2)}° on ${date(century.jd)}`);
	[1526, 2526].forEach(y => {
		const syzygies = phases(180, Time.julianDay(y, 1, 1), Time.julianDay(y + 1, 1, 1)).concat(
			phases(0, Time.julianDay(y, 1, 1), Time.julianDay(y + 1, 1, 1))
		);

		console.log(`   new and full Moons of ${y}: largest ${f(maxAbs(syzygies.map(jd => error(model, jd))), 1)}'`);
	});
}

title("Test: Ptolemy's simple Moon (first anomaly only), Figure 6");
{
	/* The real moment of opposition nearest a date. */
	const oppositionNear = (y, m, d) => {
		const jd0 = Time.julianDay(y, m, d);

		return phases(180, jd0 - 3, jd0 + 3)[0];
	};
	const show = (label, y, m, d) => {
		const jd = oppositionNear(y, m, d);
		const s = LunarEpicycle.state(PTOLEMY, jd);
		const sunError = norm180(ptolemySun(jd) - sunLon(jd)) * 60;

		console.log(
			`   ${label}: opposition ${when(jd)} TT; his Moon ${f(s.lambda, 2)}°, real ${f(moonLon(jd), 2)}°, error ${f(error(ptolemy, jd), 0)}'; his Sun's error ${f(sunError, 0)}'`
		);
	};

	console.log('at the eclipses of Almagest IV 6 (at the real moments of opposition):');
	show('721 BC Mar 19', -720, 3, 19);
	show('720 BC Mar 8', -719, 3, 8);
	show('720 BC Sep 1', -719, 9, 1);
	show('AD 133 May 6', 133, 5, 6);
	show('AD 134 Oct 20', 134, 10, 20);
	show('AD 136 Mar 5', 136, 3, 5);

	const from = Time.julianDay(134, 9, 1);
	const to = from + 61;
	const all = largest(ptolemy, from, to);
	const syzygies = phases(180, from, to).concat(phases(0, from, to));

	console.log(
		`Sep - Oct 134: largest error ${f(all.v / 60, 2)}°; at the new and full Moons ${syzygies.map(jd => f(error(ptolemy, jd) / 60, 2)).join(', ')}°`
	);

	[1, 1000, 2026].forEach(y => {
		const a = Time.julianDay(y, 1, 1);
		const errors = phases(180, a, a + 365)
			.concat(phases(0, a, a + 365))
			.map(jd => error(ptolemy, jd));
		const mean = errors.reduce((s, v) => s + v, 0) / errors.length;
		const sunErrors = phases(180, a, a + 365)
			.concat(phases(0, a, a + 365))
			.map(jd => norm180(ptolemySun(jd) - sunLon(jd)));
		const sun = sunErrors.reduce((sum, v) => sum + v, 0) / sunErrors.length;

		console.log(
			`   ${y}: mean error at the new and full Moons ${f(mean / 60, 2)}°; his Sun's at the same moments ${f(sun, 2)}°`
		);
	});

	/* His month: the daily motion in elongation, Moon minus Sun, against
	   the real one (Meeus 47.2), and what it adds up to from AD 135 to
	   2026. */
	const elongation = PTOLEMY.n - MeanSun.PTOLEMY.n;
	const realElongation = 445267.1114034 / 36525;
	const days = (2026 - 135) * 365.25;

	console.log(
		`his elongation ${f(elongation, 9)}°/d, real ${f(realElongation, 9)}°/d: from 135 to 2026 ${f((elongation - realElongation) * days, 2)}°`
	);

	/* The check of the model against Almagest IV 7 and IV 8: the mean
	   positions at the second Babylonian eclipse, 27 Egyptian years 17
	   days 11 1/6 hours after the epoch: Virgo 14;44 and 12;24°. */
	const t = 27 * 365 + 17 + (11 + 1 / 6) / 24;
	const s = LunarEpicycle.state(Object.assign({}, PTOLEMY, { clock: 'tt' }), PTOLEMY.epoch + t);

	console.log(
		`check: at the second Babylonian eclipse ${f(s.meanLongitude, 3)}° (Virgo 14;44 = 164.733), anomaly ${f(s.M, 3)}° (12.400)`
	);
}

/* ==========================================================================
   8. RESIDUAL
   ========================================================================== */

title("Residual: Hipparchus' sighting of 5 August 127 BC (Almagest V 3)");
{
	const M = fromSexagesimal(257, 47);
	const q = LunarEpicycle.equationOfAnomaly(M, PTOLEMY.e);
	const meanToSun = fromSexagesimal(93, 55);
	const observed = fromSexagesimal(86, 15);

	console.log(
		`first anomaly at 257;47: q = +${f(q, 2)}°; predicted Sun - Moon = ${f(meanToSun - q, 2)}°, observed ${f(observed, 2)}°: the model is ${f(meanToSun - q - observed, 2)}° short`
	);
	console.log(`Ptolemy: true minus mean ${f(meanToSun - observed, 2)}° (7 2/3) instead of about 5`);
}

/* ==========================================================================
   9. EXERCISES
   ========================================================================== */

title("Exercise 1: Hipparchus' two ratios (Almagest IV 11)");
[
	['eccentric 60 : 6;15', 6.25 / 60],
	['epicycle 60 : 4;46', (4 + 46 / 60) / 60],
	['Ptolemy 60 : 5;15', 5.25 / 60]
].forEach(([label, e]) =>
	console.log(`   ${label}: r/R = ${f(e, 5)}, greatest equation ${dms(asin(e))} (${f(asin(e), 3)}°)`)
);

title('Exercise 2: the anomalistic month from the beat');
{
	/* The full Moons nearest the perigee: those faster than the full
	   Moons on either side. */
	const full = phases(180, Time.julianDay(2000, 1, 1), Time.julianDay(2040, 1, 1));
	const speeds = full.map(jd => ({ jd, v: moonMotion(jd) }));
	const peaks = speeds.filter(
		(s, i) => i > 0 && i < speeds.length - 1 && s.v > speeds[i - 1].v && s.v > speeds[i + 1].v
	);

	console.log('the fastest full Moons:');
	peaks.forEach((s, i) =>
		console.log(`   ${date(s.jd)} ${f(s.v, 2)}°/d${i ? `  +${f(s.jd - peaks[i - 1].jd, 1)} d` : ''}`)
	);

	const span = peaks[peaks.length - 1].jd - peaks[0].jd;
	const beats = peaks.length - 1;
	const beat = span / beats;

	console.log(
		`${beats} beats in ${f(span, 1)} d, from ${date(peaks[0].jd)} to ${date(peaks[peaks.length - 1].jd)}: one beat = ${f(beat, 2)} d`
	);
	console.log(
		`anomalistic month 1/(1/${f(MONTHS.synodic, 6)} + 1/${f(beat, 2)}) = ${f(1 / (1 / MONTHS.synodic + 1 / beat), 4)} d (real ${f(MONTHS.anomalistic, 4)} d, difference ${f((1 / (1 / MONTHS.synodic + 1 / beat) - MONTHS.anomalistic) * 86400, 0)} s)`
	);
	console.log(
		`in one beat: ${f(beat / MONTHS.synodic, 3)} synodic months, ${f(beat / MONTHS.anomalistic, 3)} anomalistic months`
	);
	console.log(`from the 'Periodic', 223 x synodic / 239: ${f((223 * MONTHS.synodic) / 239, 4)} d`);
}

title("Exercise 3: Ptolemy's three Babylonian eclipses (Figure 4, 'Babylon')");
{
	const data = TRIPLES.babylon;
	const s = LunarEpicycle.threeEclipses(data);
	const rows = LunarEpicycle.firstOrderRows(data);

	console.log(
		`a12 = ${f(data.a12, 4)}°, a23 = ${f(data.a23, 4)}°, d12 = ${f(data.d12, 4)}° = ${f(data.d12 * D2R, 5)} rad, d23 = ${f(data.d23, 4)}° = ${f(data.d23 * D2R, 5)} rad`
	);
	console.log(
		`rows: ${f(rows[0][0], 4)} X + ${f(rows[0][1], 4)} Y = ${f(rows[0][2], 5)};  ${f(rows[1][0], 4)} X + ${f(rows[1][1], 4)} Y = ${f(rows[1][2], 5)}`
	);
	console.log(
		`first order: X = ${f(s.first.X, 5)}, Y = ${f(s.first.Y, 5)}, r/R = ${f(s.first.e, 4)}, M2 = ${f(s.first.M2, 1)}°, ${f(100 * (1 - s.first.e / s.e), 1)}% short of the exact r/R`
	);
	console.log(
		`exact: r/R = ${f(s.e, 5)} = ${sexagesimal(s.e * 60, 2)} = ${f(s.e * 60, 3)} parts in 60 (Ptolemy 5;13 = ${f(5 + 13 / 60, 3)}), M2 = ${dms(s.M2)} (12;24), q2 = ${dms(s.q2)} = ${f(s.q2, 3)}° (-0;59)`
	);
	console.log(
		`the mean Moon at the second eclipse: true Virgo 13;45 (163.75°) - q2 = ${f(163.75 - s.q2, 3)}° (Ptolemy: Virgo 14;44 = 164.733°)`
	);
}

/* ==========================================================================
   10. THE SCALES OF THE FIGURES
   ========================================================================== */

title('Scales');
{
	let lo = 99;
	let hi = 0;

	for (let jd = Y2026 - 1; jd <= Y2027 + 1; jd += 0.05) {
		lo = Math.min(lo, moonMotion(jd));
		hi = Math.max(hi, moonMotion(jd));
	}
	console.log(`Figure 1: the daily motion between ${f(lo, 2)} and ${f(hi, 2)}°/d`);
	console.log(`Figure 2 (b): q for r/R up to 0.3: greatest asin 0.3 = ${f(asin(0.3), 2)}°`);

	const all = Object.values(TRIPLES)
		.concat([OURS_DATA])
		.map(data => LunarEpicycle.threeEclipses(data));
	const reach = Math.max(
		...all.map(s => Math.max(Math.abs(s.X), Math.abs(s.Y), Math.abs(s.first.X), Math.abs(s.first.Y)))
	);

	console.log(`Figure 4 (b): the largest |X| or |Y| of the four solutions is ${f(reach, 4)}`);
}
