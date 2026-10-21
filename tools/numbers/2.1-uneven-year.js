/* ==========================================================================
   NUMBERS FOR PAGE 2.1 "THE UNEVEN YEAR" (tools/numbers/2.1-uneven-year.js)
   Loads the site's shared code (common, time, ephemeris and the models
   diurnal.js, frames.js, mean-sun.js, clock.js) in a Node vm context and
   prints every number quoted on the page, in page order.

   Run from the repository root:  node tools/numbers/2.1-uneven-year.js
   (about 20 seconds: section 7 scans a year of sunrises at three latitudes)

   TABLE OF CONTENTS
	 1. Loading the shared code
	 2. Formatting
	 3. The eccentric (draft of shared/models/solar-eccentric.js)
	 4. The reference Sun's equinoxes and solstices
	 5. Observation: unequal seasons, the Sun's uneven daily motion
	 6. Model: the equation of centre and its greatest value
	 7. Fit: Hipparchus' method, on his numbers and on 2026
	 8. Test: the error curves (our eccentric, Ptolemy's Sun)
	 9. Test: the day of page 1.3 with the eccentric Sun
	10. Residual: the apogee moves, the distance
	11. Exercises
   ========================================================================== */

const { loadFiles } = require('../check/load.js');

/* ==========================================================================
   1. LOADING THE SHARED CODE
   ========================================================================== */

const shared = loadFiles([
	'shared/common.js',
	'shared/time.js',
	'shared/ephemeris.js',
	'shared/models/diurnal.js',
	'shared/models/frames.js',
	'shared/models/mean-sun.js',
	'shared/models/clock.js'
]);
const { norm180, norm360, Time, Ephem, Diurnal, Frames, MeanSun, Clock } = shared;

/* ==========================================================================
   2. FORMATTING
   ========================================================================== */

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const sind = x => Math.sin(x * D2R);
const cosd = x => Math.cos(x * D2R);
const asind = x => Math.asin(x) * R2D;

/* The sexagesimal value d;m,s,... of the sources -> decimal. */
const fromSexagesimal = (...parts) => parts.reduce((sum, part, i) => sum + part / Math.pow(60, i), 0);

/* Degrees -> "2°23'15"" (absolute value, sign in front). */
function dms(degrees, digits = 0) {
	const sign = degrees < 0 ? '-' : '';
	const total = Number((Math.abs(degrees) * 3600).toFixed(digits));
	const d = Math.floor(total / 3600);
	const m = Math.floor((total - 3600 * d) / 60);
	const s = total - 3600 * d - 60 * m;

	return `${sign}${d}°${String(m).padStart(2, '0')}'${s.toFixed(digits).padStart(digits ? digits + 3 : 2, '0')}"`;
}

/* JD -> "20 Mar 2026 14:46" (UT or TT as given). */
const when = jd => Time.formatDate(jd, { time: true });
const date = jd => Time.formatDate(jd);
const title = text => console.log(`\n=== ${text} ===`);
const f = (x, digits) => x.toFixed(digits);

/* ==========================================================================
   3. THE ECCENTRIC
   The Sun moves uniformly on a circle of radius 1 whose centre C is at
   distance e from the Earth O, towards the apogee at longitude lambdaA.
   M = lambdaBar - lambdaA is the mean anomaly (from the apogee); seen
   from O the Sun is at lambda = lambdaBar + q with
	   q = -atan2(e sin M, 1 + e cos M).
   This section moves to shared/models/solar-eccentric.js when the page is
   built; the script will then load it instead.
   ========================================================================== */

function equationOfCentre(M, e) {
	return -Math.atan2(e * sind(M), 1 + e * cosd(M)) * R2D;
}

/* Distance Earth - Sun, in units of the eccentric's radius. */
function distance(M, e) {
	return Math.sqrt(1 + 2 * e * cosd(M) + e * e);
}

/* parameters { L0, n, epoch (JD), e, apogee }, and an optional clock
   'ut' (true: the days are counted in UT, as Ptolemy's were) -> jdTT => lambda. */
function makeEccentric(p) {
	return jdTT => {
		const t = p.ut ? Time.utFromTt(jdTT) : jdTT;
		const meanLongitude = p.L0 + p.n * (t - p.epoch);

		return norm360(meanLongitude + equationOfCentre(meanLongitude - p.apogee, p.e));
	};
}

/* Hipparchus' method (Almagest III 4): from the lengths of spring T1 and
   summer T2 (days) and the year Y, the centre C = (x, y) of the eccentric
   in units of its radius (x towards gamma, y towards the summer solstice),
   e, the apogee, and the two other seasons. The angles at C of the four
   cardinal points: gamma at -asin y, the summer solstice at 90 + asin x,
   the autumnal point at 180 + asin y, the winter solstice at 270 - asin x. */
function fitSeasons(T1, T2, Y) {
	const a1 = (360 * T1) / Y;
	const a2 = (360 * T2) / Y;
	const sy = (a1 + a2 - 180) / 2; // asin y
	const sx = (a1 - a2) / 2; // asin x
	const x = sind(sx);
	const y = sind(sy);
	const a3 = 90 - sx - sy;
	const a4 = 90 + sx - sy;

	return {
		a1,
		a2,
		a3,
		a4,
		sx,
		sy,
		x,
		y,
		e: Math.hypot(x, y),
		apogee: norm360(Math.atan2(y, x) * R2D),
		T3: (a3 * Y) / 360,
		T4: (a4 * Y) / 360,
		lambdaBarAtEquinox: norm360(-sy) // the mean longitude when the Sun is at gamma
	};
}

/* ==========================================================================
   4. THE REFERENCE SUN'S EQUINOXES AND SOLSTICES
   The moment (JD(TT)) when the apparent longitude of date reaches
   'target', within a few days of 'guess', by bisection.
   ========================================================================== */

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

const sunLongitude = jd => Ephem.longitude('sun', jd);

/* The first moment after 'from' (JD(TT)) when the apparent longitude of
   date reaches 'target': scan day by day for the crossing, then bisect. */
function sunReaches(target, from) {
	const behind = jd => norm180(sunLongitude(jd) - target);
	let jd = from;

	while (!(behind(jd) < 0 && behind(jd + 1) >= 0)) {
		jd += 1;
	}

	return bisect(behind, jd, jd + 1);
}

/* The four seasons starting with the first spring equinox after 'from'
   (JD): the moments of the equinoxes and solstices and the four lengths. */
function seasons(from) {
	const t0 = sunReaches(0, from);
	const t90 = sunReaches(90, t0);
	const t180 = sunReaches(180, t90);
	const t270 = sunReaches(270, t180);
	const t360 = sunReaches(0, t270);

	return {
		times: [t0, t90, t180, t270, t360],
		lengths: [t90 - t0, t180 - t90, t270 - t180, t360 - t270]
	};
}

const SEASON_NAMES = ['spring', 'summer', 'autumn', 'winter'];

function printSeasons(label, s) {
	console.log(
		`${label}: ` +
			s.times
				.slice(0, 4)
				.map((t, i) => `${SEASON_NAMES[i]} starts ${when(t)} TT`)
				.join('; ')
	);
	console.log(`   lengths (d): ${s.lengths.map(x => f(x, 2)).join(', ')}; spring + summer = ${f(s.lengths[0] + s.lengths[1], 2)}`);
}

/* ==========================================================================
   5. OBSERVATION
   ========================================================================== */

title('Observation: the seasons of 2026 (reference Sun, apparent longitude of date)');
const Y2026 = Time.julianDay(2026, 1, 1);
const s2026 = seasons(Time.julianDay(2026, 3, 1));
printSeasons('2026', s2026);
const yearReal = s2026.times[4] - s2026.times[0];
console.log(`   equinox to equinox: ${f(yearReal, 4)} d`);
console.log(
	`   in UT: spring equinox ${when(Time.utFromTt(s2026.times[0]))}, autumn equinox ${when(Time.utFromTt(s2026.times[2]))}`
);
console.log(
	`   summer half (spring equinox to autumn equinox) ${f(s2026.times[2] - s2026.times[0], 2)} d, winter half ${f(s2026.times[4] - s2026.times[2], 2)} d`
);

title("Observation: the Sun's daily motion in 2026");
let slowest = { motion: 99 };
let fastest = { motion: 0 };

for (let d = 0; d < 365; d++) {
	const jd = Y2026 + d;
	const motion = norm180(sunLongitude(jd + 1) - sunLongitude(jd)) * 60;

	if (motion < slowest.motion) {
		slowest = { motion, jd };
	}

	if (motion > fastest.motion) {
		fastest = { motion, jd };
	}
}

console.log(
	`slowest ${f(slowest.motion, 2)}'/day (from ${date(slowest.jd)}), fastest ${f(fastest.motion, 2)}'/day (from ${date(fastest.jd)})`
);
console.log(`mean motion n = ${f(MeanSun.MODERN.n * 60, 3)}'/day; ratio fastest / slowest = ${f(fastest.motion / slowest.motion, 4)}`);
console.log(
	`relative swing (fastest - slowest) / (2 n) = ${f((fastest.motion - slowest.motion) / (2 * MeanSun.MODERN.n * 60), 4)}`
);

title("Observation: Hipparchus' seasons (Almagest III 4) and the real ones of his time");
const sHipparchus = seasons(Time.julianDay(-140, 3, 1));
printSeasons('141 BC (Julian calendar)', sHipparchus);
const sPtolemy = seasons(Time.julianDay(140, 3, 1));
printSeasons('AD 140', sPtolemy);

/* ==========================================================================
   6. MODEL
   ========================================================================== */

title('Model: the equation of centre');
[1 / 24, 0.0334, 0.1].forEach(e => {
	const Mmax = 90 + asind(e);

	console.log(
		`e = ${f(e, 4)}: greatest q = ${f(asind(e), 4)}° = ${dms(asind(e))} at M = ${f(Mmax, 3)}° (${dms(Mmax)}); ` +
			`first order e rad = ${f(e * R2D, 4)}°; second-order term e^2/2 = ${f(((e * e) / 2) * R2D * 60, 2)}'`
	);
});

const e2026Preview = 0.0334;
let worstFirstOrder = 0;

for (let M = 0; M < 360; M += 0.5) {
	worstFirstOrder = Math.max(worstFirstOrder, Math.abs(equationOfCentre(M, e2026Preview) + e2026Preview * sind(M) * R2D));
}

console.log(`|q - (-e sin M)| at most ${f(worstFirstOrder * 60, 2)}' for e = ${e2026Preview}`);

/* Ptolemy's table III 6 at M = 30°: equation 1;9 (his worked example III 5). */
console.log(`Ptolemy's III 5 example, M = 30°, e = 2;30/60: q = ${dms(equationOfCentre(30, fromSexagesimal(0, 2, 30)))} (his 1;9), lambda - apogee = ${dms(30 + equationOfCentre(30, fromSexagesimal(0, 2, 30)))} (his 28;51)`);

/* ==========================================================================
   7. FIT: HIPPARCHUS' METHOD
   ========================================================================== */

function printFit(label, T1, T2, Y) {
	const r = fitSeasons(T1, T2, Y);

	console.log(`${label}: T1 = ${f(T1, 4)}, T2 = ${f(T2, 4)}, Y = ${f(Y, 5)}`);
	console.log(
		`   arcs a1 = ${f(r.a1, 4)}° (${dms(r.a1)}), a2 = ${f(r.a2, 4)}° (${dms(r.a2)}), a1 + a2 - 180 = ${f(r.a1 + r.a2 - 180, 4)}°`
	);
	console.log(
		`   asin y = ${f(r.sy, 4)}°, asin x = ${f(r.sx, 4)}°; y = ${f(r.y, 5)}, x = ${f(r.x, 5)}`
	);
	console.log(
		`   e = ${f(r.e, 5)} (1/${f(1 / r.e, 2)}; on a radius of 60: ${dms(60 * r.e).replace('°', ';').replace("'", ',').replace('"', '')}), apogee = ${f(r.apogee, 3)}° (${dms(r.apogee)}), ${f(90 - r.apogee, 3)}° before the summer solstice`
	);
	console.log(`   predicted autumn ${f(r.T3, 3)} d, winter ${f(r.T4, 3)} d (arcs ${f(r.a3, 3)}°, ${f(r.a4, 3)}°)`);
	console.log(`   greatest equation ${dms(asind(r.e))} at M = ${dms(90 + asind(r.e))}`);

	return r;
}

title("Fit: Hipparchus' numbers (Almagest III 4)");
const Y_HIPPARCHUS = 365.25 - 1 / 300;
const Y_PTOLEMY = fromSexagesimal(365, 14, 48);
const N_PTOLEMY = fromSexagesimal(0, 59, 8, 17, 13, 12, 31);
console.log(`Ptolemy: in 94.5 d the mean motion is ${dms(94.5 * N_PTOLEMY)} (his 93;9), in 92.5 d ${dms(92.5 * N_PTOLEMY)} (his 91;11)`);
const fitH = printFit("Hipparchus' 94 1/2 and 92 1/2 days, Ptolemy's year", 94.5, 92.5, Y_PTOLEMY);
printFit("the same with the year 365 1/4", 94.5, 92.5, 365.25);
printFit("the same with Hipparchus' year 365 1/4 - 1/300", 94.5, 92.5, Y_HIPPARCHUS);
console.log(`Ptolemy's rounded values: e = 2;30/60 = ${f(1 / 24, 5)} (1:24), apogee 65;30°, greatest equation 2;23° = ${dms(asind(1 / 24))}`);
console.log(`Toomer's note: precise intervals 94 d 13 h and 92 d 11 h:`);
printFit('   ', 94 + 13 / 24, 92 + 11 / 24, Y_PTOLEMY);

title('Fit: sensitivity to the timing (one hour moved from summer to spring)');
{
	const base = fitSeasons(94.5, 92.5, Y_PTOLEMY);
	const moved = fitSeasons(94.5 + 1 / 24, 92.5 - 1 / 24, Y_PTOLEMY);

	console.log(`apogee ${f(base.apogee, 2)}° -> ${f(moved.apogee, 2)}° (${f(moved.apogee - base.apogee, 2)}°), e ${f(base.e, 5)} -> ${f(moved.e, 5)}`);
	const longer = fitSeasons(94.5 + 1 / 24, 92.5, Y_PTOLEMY);
	console.log(`one hour added to spring only: apogee ${f(longer.apogee - base.apogee, 2)}°, e ${f(longer.e - base.e, 5)}`);
}

title("Fit: the real seasons of Hipparchus' time (141 BC) through his method");
printFit('141 BC, reference Sun', sHipparchus.lengths[0], sHipparchus.lengths[1], 360 / MeanSun.MODERN.n);

title('Fit: 2026');
const fit2026 = printFit('2026 seasons, modern year', s2026.lengths[0], s2026.lengths[1], 360 / MeanSun.MODERN.n);
console.log(`   real autumn ${f(s2026.lengths[2], 3)} d, winter ${f(s2026.lengths[3], 3)} d: errors ${f((fit2026.T3 - s2026.lengths[2]) * 24, 2)} h, ${f((fit2026.T4 - s2026.lengths[3]) * 24, 2)} h`);

/* The mean longitude at the spring equinox, then L0 at J2000 (TT). */
const equinox2026 = s2026.times[0];
const nModern = MeanSun.MODERN.n;
const L0fit = norm360(fit2026.lambdaBarAtEquinox - nModern * (equinox2026 - Time.J2000));
console.log(
	`   mean longitude at the spring equinox: ${f(fit2026.lambdaBarAtEquinox, 4)}° (= -asin y); L0 at J2000 = ${f(L0fit, 4)}° ` +
		`(Meeus 25.2: ${MeanSun.MODERN.L0}°, difference ${f((L0fit - MeanSun.MODERN.L0) * 60, 2)}')`
);

/* Kepler's ellipse, for comparison: Standish's Earth-Moon barycentre
   (Ephem), eccentricity and perihelion of date. */
const T2026 = Time.centuries(Time.julianDay(2026, 7, 2));
const eKepler = 0.01673163 - 0.00003661 * T2026;
const perihelionJ2000 = 102.93005885 + 0.3179526 * T2026;
const perihelionOfDate = Ephem.precessEcliptic(perihelionJ2000, 0, Time.J2000, Time.julianDay(2026, 7, 2)).lon;
console.log(
	`Kepler (Standish, 2026): e = ${f(eKepler, 5)}, 2e = ${f(2 * eKepler, 5)}; the Sun's apogee = the Earth's perihelion = ${f(perihelionOfDate, 3)}° of date`
);
console.log(`   fitted e / 2e_K = ${f(fit2026.e / (2 * eKepler), 4)}; apogee fitted - Kepler = ${f(fit2026.apogee - perihelionOfDate, 3)}°`);

/* The 2026 eccentric, the model of the page. */
const ECC2026 = {
	L0: L0fit,
	n: nModern,
	epoch: Time.J2000,
	e: fit2026.e,
	apogee: fit2026.apogee
};
console.log(`ECCENTRIC_2026 = { L0: ${f(L0fit, 4)}, n: ${nModern}, epoch: J2000, e: ${f(fit2026.e, 5)}, apogee: ${f(fit2026.apogee, 3)} }`);

/* ==========================================================================
   8. TEST: THE ERROR CURVES
   ========================================================================== */

/* Largest and smallest model - reference (arcmin) and the RMS, sampled
   every 'step' days from start to end (JD TT). */
function errorStats(model, start, end, step = 1) {
	let low = Infinity;
	let high = -Infinity;
	let sumSquares = 0;
	let count = 0;
	let lowAt = null;
	let highAt = null;

	for (let jd = start; jd <= end; jd += step) {
		const delta = norm180(model(jd) - sunLongitude(jd)) * 60;

		if (delta < low) {
			low = delta;
			lowAt = jd;
		}

		if (delta > high) {
			high = delta;
			highAt = jd;
		}

		sumSquares += delta * delta;
		count++;
	}

	return { low, high, lowAt, highAt, rms: Math.sqrt(sumSquares / count) };
}

function printStats(label, s) {
	console.log(
		`${label}: ${f(s.low, 2)}' (${date(s.lowAt)}) to ${f(s.high, 2)}' (${date(s.highAt)}), RMS ${f(s.rms, 2)}'`
	);
}

title('Test: 2026');
const meanSun = MeanSun.make();
const ecc2026 = makeEccentric(ECC2026);
const Y2027 = Time.julianDay(2027, 1, 1);
printStats('uniform circle (MeanSun.MODERN)', errorStats(meanSun, Y2026, Y2027, 0.25));
printStats('eccentric (2026 fit)', errorStats(ecc2026, Y2026, Y2027, 0.25));

/* The same eccentric with the Kepler second-order term, to split the
   residual: what the eccentric's own shape leaves, and what is left. */
const keplerQ = (M, e) => -(2 * e * sind(M)) * R2D + (5 / 4) * e * e * sind(2 * M) * R2D;
const kepler2026 = jd => {
	const lb = ECC2026.L0 + ECC2026.n * (jd - ECC2026.epoch);

	return norm360(lb + keplerQ(lb - ECC2026.apogee, ECC2026.e / 2));
};
printStats('   (Kepler q with e_K = e/2, same L0 and apogee)', errorStats(kepler2026, Y2026, Y2027, 0.25));
console.log(
	`   eccentric minus Kepler: second-order term (e^2/2 - 5/4 e_K^2) sin 2M, amplitude ${f(((ECC2026.e ** 2) / 2 - (5 / 4) * (ECC2026.e / 2) ** 2) * R2D * 60, 2)}'`
);

title('Test: our eccentric over longer spans (fixed apogee)');
[
	['1976-2076', 1976, 2076],
	['1526-2526', 1526, 2526]
].forEach(([label, from, to]) => {
	printStats(`eccentric ${label}`, errorStats(ecc2026, Time.julianDay(from, 1, 1), Time.julianDay(to, 1, 1), 2));
	printStats(`uniform   ${label}`, errorStats(meanSun, Time.julianDay(from, 1, 1), Time.julianDay(to, 1, 1), 2));
});

title("Test: Ptolemy's Sun (Almagest III 7-8)");
/* Epoch: Nabonassar 1, Thoth 1, noon at Alexandria (local mean time,
   longitude 29.92° E), mean longitude Pisces 0;45 = 330;45°; days counted
   in UT. */
const ALEXANDRIA_LON = 29.92;
const NABONASSAR_NOON_GREENWICH = 1448638.0; // page 1.3
const PTOLEMY_EPOCH = NABONASSAR_NOON_GREENWICH - ALEXANDRIA_LON / 360;
const PTOLEMY = {
	L0: 330.75,
	n: N_PTOLEMY,
	epoch: PTOLEMY_EPOCH,
	e: fromSexagesimal(0, 2, 30),
	apogee: 65.5,
	ut: true
};
console.log(`epoch JD(UT) ${f(PTOLEMY_EPOCH, 4)} = ${when(PTOLEMY_EPOCH)} UT; Delta T then ${f(Time.deltaT(Time.decimalYear(PTOLEMY_EPOCH)) / 3600, 2)} h`);
const ptolemySun = makeEccentric(PTOLEMY);
const ptolemyMean = makeEccentric(Object.assign({}, PTOLEMY, { e: 0 }));
const y140 = Time.julianDay(140, 1, 1);
const y141 = Time.julianDay(141, 1, 1);
printStats("Ptolemy's eccentric, AD 140", errorStats(ptolemySun, y140, y141, 0.25));
printStats("Ptolemy's mean Sun, AD 140", errorStats(ptolemyMean, y140, y141, 0.25));

/* Check: Ptolemy's autumn equinox of AD 132 (III 7): his model puts the
   Sun at 180° at 2 h after noon, Athyr 7 = 25 Sep 132. */
const ptolemyEquinox132 = Time.ttFromUt(1769539.0833 - ALEXANDRIA_LON / 360);
console.log(`his model at his autumn equinox of 25 Sep 132, 14 h Alexandria: lambda = ${f(ptolemySun(ptolemyEquinox132), 3)}°`);
console.log(`   real Sun then: ${f(sunLongitude(ptolemyEquinox132), 3)}°; real equinox ${when(Time.utFromTt(sunReaches(180, ptolemyEquinox132 - 5)) + ALEXANDRIA_LON / 360)} Alexandria mean time`);

[-200, 140, 500, 1000, 1500, 2026].forEach(year => {
	const a = Time.julianDay(year, 1, 1);
	const stats = errorStats(ptolemySun, a, a + 365.25, 1);

	console.log(`   Ptolemy's Sun in ${Time.formatYear(year)}: mean error ${f((stats.low + stats.high) / 2 / 60, 2)}°, range ${f(stats.low / 60, 2)}° to ${f(stats.high / 60, 2)}°`);
});
console.log(`   his mean Sun falls behind by ${f((nModern - N_PTOLEMY) * 36525, 3)}° a century (page 1.3)`);

/* ==========================================================================
   9. TEST: THE DAY OF PAGE 1.3 WITH THE ECCENTRIC SUN
   The model day: 2 H0 / 15° from the declination at local noon, h0 = -50'
   (Clock.sunDay with the eccentric's longitude). The real day: sunrise to
   sunset of the reference Sun, as in tools/numbers/1.3-clocks.js.
   ========================================================================== */

title('Test: the length of the day with the eccentric Sun (2026, Greenwich meridian)');

function realDayLength(jd0, phi) {
	const altitude = jdUT => {
		const jdTT = Time.ttFromUt(jdUT);
		const eq = Ephem.equatorial(Ephem.sun(jdTT), jdTT);

		return Diurnal.altitude(eq.dec, norm180(Ephem.apparentSiderealTime(jdUT) - eq.ra), phi) - Clock.SUN_HORIZON;
	};
	const hourAngle = jdUT => {
		const jdTT = Time.ttFromUt(jdUT);
		const eq = Ephem.equatorial(Ephem.sun(jdTT), jdTT);

		return norm180(Ephem.apparentSiderealTime(jdUT) - eq.ra);
	};
	const noon = bisect(hourAngle, jd0 + 0.47, jd0 + 0.53, 30);

	if (altitude(noon) < 0 || altitude(noon - 0.5) > 0) {
		return NaN;
	}

	return (bisect(altitude, noon, noon + 0.5, 30) - bisect(altitude, noon - 0.5, noon, 30)) * 24;
}

function modelDayLength(jd0, phi, longitude) {
	const noonUT = jd0 + 0.5;
	const jdTT = Time.ttFromUt(noonUT);
	const dec = Frames.eclipticPoint(longitude(jdTT), Ephem.meanObliquity(jdTT)).dec;

	return (2 * Diurnal.risingHourAngle(dec, phi, Clock.SUN_HORIZON)) / 15;
}

[41.9, 51.5, 65].forEach(phi => {
	let worstMean = 0;
	let worstEcc = 0;

	for (let d = 0; d < 365; d += 1) {
		const jd0 = Y2026 + d;
		const real = realDayLength(jd0, phi);

		if (Number.isNaN(real)) {
			continue;
		}

		const mean = modelDayLength(jd0, phi, meanSun);
		const ecc = modelDayLength(jd0, phi, ecc2026);

		worstMean = Math.max(worstMean, Math.abs(mean - real) * 60);
		worstEcc = Math.max(worstEcc, Math.abs(ecc - real) * 60);
	}

	console.log(`phi = ${phi}°: largest error of the day, mean Sun ${f(worstMean, 1)} min, eccentric Sun ${f(worstEcc, 1)} min`);
});

/* ==========================================================================
   10. RESIDUAL
   ========================================================================== */

title('Residual: the apogee moves');
[-140, 140, 880, 1000, 1200, 1250, 1300, 1515, 2026].forEach(year => {
	const s = seasons(Time.julianDay(year, 3, 1));
	const r = fitSeasons(s.lengths[0], s.lengths[1], 360 / nModern);

	console.log(
		`${Time.formatYear(year).padStart(7)}: spring ${f(s.lengths[0], 2)} d, summer ${f(s.lengths[1], 2)} d -> e = ${f(r.e, 4)}, apogee ${f(r.apogee, 2)}°`
	);
});

title('Residual: the distance');
console.log(
	`eccentric (e = ${f(fit2026.e, 4)}): distance from ${f(1 - fit2026.e, 4)} to ${f(1 + fit2026.e, 4)}, ` +
		`apparent diameter varies by +-${f(fit2026.e * 100, 1)}%`
);
const dists = [];

for (let d = 0; d < 365; d++) {
	dists.push(Ephem.sun(Y2026 + d).dist);
}

const dMin = Math.min(...dists);
const dMax = Math.max(...dists);
console.log(
	`real Sun 2026: ${f(dMin, 5)} to ${f(dMax, 5)} au, +-${f(((dMax - dMin) / (dMax + dMin)) * 100, 2)}%; ` +
		`apparent diameter ${f((1919.26 / dMax / 60), 2)}' to ${f((1919.26 / dMin / 60), 2)}'`
);
const sunEcc = (1919.26 / 60) / 1; // diameter at 1 au, arcmin
console.log(
	`eccentric with the same mean distance: ${f(sunEcc / (1 + fit2026.e), 2)}' to ${f(sunEcc / (1 - fit2026.e), 2)}'`
);

/* ==========================================================================
   11. EXERCISES
   ========================================================================== */

title("Exercise 1: Hipparchus' Sun from two numbers (see section 7)");
console.log(`e = ${f(fitH.e, 4)}, apogee ${f(fitH.apogee, 2)}°, autumn ${f(fitH.T3, 2)} d, winter ${f(fitH.T4, 2)} d`);
console.log(`Ptolemy III 4: 88 1/8 = 88.125, 90 1/8 = 90.125`);

title('Exercise 2: the greatest equation');
console.log(`Ptolemy: e = 1/24 -> ${dms(asind(1 / 24))} at M = ${dms(90 + asind(1 / 24))} (his 2;23 at 92;23)`);
console.log(`2026: e = ${f(fit2026.e, 5)} -> ${dms(asind(fit2026.e))} = ${f(asind(fit2026.e), 4)}° at M = ${f(90 + asind(fit2026.e), 3)}°`);

title("Exercise 3: Ptolemy's observations of AD 139-140 (Almagest III 1, III 4)");
/* His times are local (Alexandria) apparent times; equation of time
   aside, compare with the real moments in Alexandria mean time. */
const alexandria = jdTT => Time.utFromTt(jdTT) + ALEXANDRIA_LON / 360;
const realAutumn139 = sunReaches(180, Time.julianDay(139, 9, 15));
const realSpring140 = sunReaches(0, Time.julianDay(140, 3, 10));
const realSummer140 = sunReaches(90, Time.julianDay(140, 6, 10));
console.log(`autumn equinox 139: real ${when(alexandria(realAutumn139))} Alexandria; Ptolemy: 26 Sep, about 1 h after sunrise`);
console.log(`spring equinox 140: real ${when(alexandria(realSpring140))}; Ptolemy: 22 Mar, about 1 h after noon`);
console.log(`summer solstice 140: real ${when(alexandria(realSummer140))}; Ptolemy: 25 Jun, about 2 h after midnight`);
console.log(`real spring 140: ${f(realSummer140 - realSpring140, 2)} d (Ptolemy 94 1/2 less 1/24)`);
const realHipparchusSpring = sunReaches(0, Time.julianDay(-145, 3, 10));
const realHipparchusAutumn = sunReaches(180, Time.julianDay(-146, 9, 15));
console.log(`Hipparchus' spring equinox of 146 BC: real ${when(alexandria(realHipparchusSpring) - ALEXANDRIA_LON / 360 + 28.2 / 360)} Rhodes mean time; his: 24 Mar, dawn`);
console.log(`Hipparchus' autumn equinox of 147 BC: real ${when(alexandria(realHipparchusAutumn) - ALEXANDRIA_LON / 360 + 28.2 / 360)} Rhodes mean time; his: 26/27 Sep, midnight`);
