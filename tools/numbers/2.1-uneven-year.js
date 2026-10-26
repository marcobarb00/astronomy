/* ==========================================================================
   NUMBERS FOR PAGE 2.1 "THE UNEVEN YEAR" (tools/numbers/2.1-uneven-year.js)
   Loads the site's shared code (common, time, ephemeris and the models
   diurnal.js, frames.js, mean-sun.js, clock.js, solar-eccentric.js) in a
   Node vm context and prints every number quoted on the page, in page
   order.

   Run from the repository root:  node tools/numbers/2.1-uneven-year.js
   (about a minute: section 7 times a year of sunrises at three latitudes,
   section 8 finds the seasons of nine years)

   TABLE OF CONTENTS
	 1. Loading the shared code
	 2. Formatting and searching
	 3. The reference Sun's equinoxes and solstices
	 4. Observation: unequal seasons, the Sun's uneven daily motion
	 5. Model: the equation of centre and its greatest value
	 6. Fit: Hipparchus' method, on his numbers and on 2026
	 7. Test: the error curves; the day of page 1.3
	 8. Residual: the apogee moves; the distance
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
	'shared/models/diurnal.js',
	'shared/models/frames.js',
	'shared/models/mean-sun.js',
	'shared/models/clock.js',
	'shared/models/solar-eccentric.js'
]);
const { norm180, norm360, asin, R2D, Time, Ephem, Diurnal, Frames, MeanSun, Clock, SolarEccentric } = shared;

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

/* A number in the sexagesimal notation of the sources: 2.4827 -> "2;28,58". */
function sexagesimal(value, places = 2) {
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
   3. THE REFERENCE SUN'S EQUINOXES AND SOLSTICES
   The apparent longitude of date, as every error curve of the site uses.
   ========================================================================== */

const sunLongitude = jd => Ephem.longitude('sun', jd);

/* The first moment after 'from' (JD(TT)) when the Sun's longitude
   reaches 'target': scan day by day for the crossing, then bisect. */
function sunReaches(target, from) {
	const behind = jd => norm180(sunLongitude(jd) - target);
	let jd = from;

	while (!(behind(jd) < 0 && behind(jd + 1) >= 0)) {
		jd += 1;
	}

	return bisect(behind, jd, jd + 1);
}

/* The four seasons starting with the first spring equinox after 'from'
   (JD(TT)): the moments of the equinoxes and solstices, and the lengths. */
function seasons(from) {
	const times = [sunReaches(0, from)];

	[90, 180, 270, 0].forEach(target => times.push(sunReaches(target, times[times.length - 1])));

	return { times, lengths: [0, 1, 2, 3].map(i => times[i + 1] - times[i]) };
}

const SEASON_NAMES = ['spring', 'summer', 'autumn', 'winter'];

function printSeasons(label, s) {
	console.log(`${label}:`);
	s.times
		.slice(0, 4)
		.forEach((t, i) =>
			console.log(`   ${SEASON_NAMES[i].padEnd(7)} starts ${when(t)} TT, lasts ${f(s.lengths[i], 3)} d`)
		);
	console.log(
		`   spring + summer = ${f(s.lengths[0] + s.lengths[1], 2)} d, autumn + winter = ${f(s.lengths[2] + s.lengths[3], 2)} d`
	);
}

/* The year of the page, and the modern year (Meeus 25.2, page 1.3). */
const Y2026 = Time.julianDay(2026, 1, 1);
const Y2027 = Time.julianDay(2027, 1, 1);
const YEAR = MeanSun.yearLength();
const N_MODERN = MeanSun.MODERN.n;

/* Ptolemy's year (Almagest III 1) and daily motion (III 2). */
const Y_PTOLEMY = fromSexagesimal(365, 14, 48);
const N_PTOLEMY = MeanSun.PTOLEMY.n;

/* ==========================================================================
   4. OBSERVATION
   ========================================================================== */

title('Observation: the seasons of 2026 (reference Sun)');
const s2026 = seasons(Time.julianDay(2026, 3, 1));
printSeasons('2026', s2026);
console.log(
	`   in UT: ${s2026.times
		.slice(0, 4)
		.map(t => when(Time.utFromTt(t)))
		.join('; ')}`
);
console.log(
	`   a uniform Sun: every season ${f(YEAR / 4, 2)} d; the half from March to September is ${f(s2026.lengths[0] + s2026.lengths[1] - s2026.lengths[2] - s2026.lengths[3], 2)} d longer`
);

title("Observation: the Sun's daily motion in 2026 (Figure 1)");
let slowest = { motion: 99 };
let fastest = { motion: 0 };
const motions = [];

for (let d = 0; d <= 365; d++) {
	const jd = Y2026 + d;
	const motion = norm180(sunLongitude(jd + 0.5) - sunLongitude(jd - 0.5)) * 60;

	motions.push(motion);

	if (motion < slowest.motion) {
		slowest = { motion, jd };
	}

	if (motion > fastest.motion) {
		fastest = { motion, jd };
	}
}

console.log(
	`slowest ${f(slowest.motion, 2)}' a day on ${date(slowest.jd)}, fastest ${f(fastest.motion, 2)}' on ${date(fastest.jd)}`
);
console.log(
	`first days of 2026: ${motions
		.slice(0, 5)
		.map(m => f(m, 2))
		.join(', ')}`
);
console.log(
	`mean n = ${f(N_MODERN * 60, 2)}'; swing +${f((fastest.motion / (N_MODERN * 60) - 1) * 100, 1)}% / ${f((slowest.motion / (N_MODERN * 60) - 1) * 100, 1)}%`
);
console.log(`Figure 1 range: ${f(slowest.motion, 2)}' to ${f(fastest.motion, 2)}' (axis 56' to 62')`);

title("Observation: the seasons of Hipparchus' and Ptolemy's time");
const s141BC = seasons(Time.julianDay(-140, 3, 1));
printSeasons('141 BC', s141BC);
const sAD140 = seasons(Time.julianDay(140, 3, 1));
printSeasons('AD 140', sAD140);

/* ==========================================================================
   5. MODEL
   ========================================================================== */

title('Model: the equation of centre');
[1 / 24, SolarEccentric.FIT_2026.e, 0.1].forEach(e => {
	const g = SolarEccentric.greatestEquation(e);
	let worst = 0;

	for (let M = 0; M < 360; M += 0.25) {
		worst = Math.max(
			worst,
			Math.abs(SolarEccentric.equationOfCentre(M, e) - SolarEccentric.equationOfCentreFirstOrder(M, e))
		);
	}

	console.log(
		`e = ${f(e, 5)}: greatest q = ${f(g.q, 4)}° (${dms(g.q)}) at M = ${f(g.M, 3)}° (${dms(g.M)}); ` +
			`e in degrees ${f(e * R2D, 4)}°; e^2/2 = ${f(((e * e) / 2) * R2D * 60, 2)}'; |q + e sin M| <= ${f(worst * 60, 2)}'`
	);
});
const qAt30 = SolarEccentric.equationOfCentre(30, 2.5 / 60);
console.log(
	`Ptolemy III 5, M = 30°, e = 2;30/60: q = ${dms(qAt30)} (his 1;9); seen from the Earth ${dms(30 + qAt30)} (his 28;51)`
);

title('Model: the seasons of the 2026 eccentric (Figure 2 default)');
const fit2026Lengths = SolarEccentric.seasonLengths(SolarEccentric.FIT_2026.e, SolarEccentric.FIT_2026.apogee, YEAR);
console.log(`FIT_2026: ${fit2026Lengths.map(x => f(x, 2)).join(', ')} d`);
console.log(
	`with e = 0.1: ${SolarEccentric.seasonLengths(0.1, SolarEccentric.FIT_2026.apogee, YEAR)
		.map(x => f(x, 2))
		.join(', ')} d`
);

/* ==========================================================================
   6. FIT
   ========================================================================== */

function printFit(label, spring, summer, Y) {
	const r = SolarEccentric.fitSeasons(spring, summer, Y);

	console.log(`${label}: spring ${f(spring, 4)} d, summer ${f(summer, 4)} d, year ${f(Y, 5)} d`);
	console.log(
		`   arcs a1 = ${f(r.arcs[0], 4)}° (${dms(r.arcs[0])}), a2 = ${f(r.arcs[1], 4)}° (${dms(r.arcs[1])}); a1 + a2 - 180° = ${f(r.arcs[0] + r.arcs[1] - 180, 4)}°`
	);
	console.log(
		`   asin k = ${f(asin(r.k), 4)}°, asin h = ${f(asin(r.h), 4)}°; k = ${f(r.k, 5)} (${sexagesimal(60 * r.k)} on 60), h = ${f(r.h, 5)} (${sexagesimal(60 * r.h)} on 60)`
	);
	console.log(
		`   e = ${f(r.e, 5)} = 1/${f(1 / r.e, 2)} (${sexagesimal(60 * r.e)} on a radius of 60); apogee ${f(r.apogee, 3)}° (${dms(r.apogee)}), ${f(90 - r.apogee, 2)}° before the summer solstice`
	);
	console.log(
		`   autumn ${f(r.lengths[2], 3)} d, winter ${f(r.lengths[3], 3)} d (arcs ${f(r.arcs[2], 3)}°, ${f(r.arcs[3], 3)}°)`
	);
	console.log(
		`   greatest q ${dms(SolarEccentric.greatestEquation(r.e).q)} at M = ${dms(SolarEccentric.greatestEquation(r.e).M)}; mean longitude at the spring equinox ${f(r.meanLongitudeAtEquinox, 4)}°`
	);

	return r;
}

title("Fit: Hipparchus' numbers (Almagest III 4)");
console.log(
	`mean motion in 94 1/2 d: ${dms(94.5 * N_PTOLEMY)} (Ptolemy 93;9); in 92 1/2 d: ${dms(92.5 * N_PTOLEMY)} (91;11)`
);
const fitHipparchus = printFit("Hipparchus' seasons, Ptolemy's year", 94.5, 92.5, Y_PTOLEMY);
printFit("Hipparchus' seasons, modern year (Figure 3 preset)", 94.5, 92.5, YEAR);
console.log(
	"Ptolemy's chords: EX = 2;16, ZX = 1;2 (x 60 on a diameter of 120: halve), EZ = 2;29 1/2 -> 1 : 24, apogee 24;30 before the solstice"
);
console.log(
	`greatest q for 1/24: ${dms(SolarEccentric.greatestEquation(1 / 24).q)} at ${dms(SolarEccentric.greatestEquation(1 / 24).M)} (2;23 at 92;23)`
);

title('Fit: sensitivity to the timing');
{
	const base = SolarEccentric.fitSeasons(94.5, 92.5, YEAR);
	const moved = SolarEccentric.fitSeasons(94.5 + 1 / 24, 92.5 - 1 / 24, YEAR);
	const longer = SolarEccentric.fitSeasons(94.5 + 1 / 24, 92.5, YEAR);

	console.log(
		`one hour from summer to spring: apogee ${f(moved.apogee - base.apogee, 2)}°, e ${f(moved.e - base.e, 5)}`
	);
	console.log(`one hour added to spring: apogee ${f(longer.apogee - base.apogee, 2)}°, e ${f(longer.e - base.e, 5)}`);
}

title('Fit: the real seasons of 141 BC through the same method (Figure 3 preset)');
const fit141BC = printFit('141 BC', s141BC.lengths[0], s141BC.lengths[1], YEAR);
console.log(
	`Hipparchus' spring + summer is ${f(187 - s141BC.lengths[0] - s141BC.lengths[1], 2)} d too long; his e is ${f((fitHipparchus.e / fit141BC.e - 1) * 100, 0)}% too large`
);

title('Fit: 2026 (Figure 3 preset, and the model of the page)');
const fit2026 = printFit('2026', s2026.lengths[0], s2026.lengths[1], YEAR);
console.log(
	`   real autumn ${f(s2026.lengths[2], 3)} d, winter ${f(s2026.lengths[3], 3)} d: predicted - real ${f((fit2026.lengths[2] - s2026.lengths[2]) * 24, 2)} h, ${f((fit2026.lengths[3] - s2026.lengths[3]) * 24, 2)} h`
);
const L0fit = norm360(fit2026.meanLongitudeAtEquinox - N_MODERN * (s2026.times[0] - Time.J2000));
console.log(
	`   spring equinox ${f(s2026.times[0] - Time.J2000, 4)} d after J2000; L0 = ${f(fit2026.meanLongitudeAtEquinox, 4)}° - n x that = ${f(L0fit, 5)}°`
);
console.log(`   Meeus 25.2: ${MeanSun.MODERN.L0}°, ours - Meeus = ${f((L0fit - MeanSun.MODERN.L0) * 60, 2)}'`);
console.log(
	`   FIT_2026 in solar-eccentric.js: L0 ${SolarEccentric.FIT_2026.L0}, e ${SolarEccentric.FIT_2026.e}, apogee ${SolarEccentric.FIT_2026.apogee}`
);
console.log(
	`   rounded here:                   L0 ${f(L0fit, 5)}, e ${f(fit2026.e, 6)}, apogee ${f(fit2026.apogee, 3)}`
);

/* Kepler's ellipse, for comparison: Standish's Earth-Moon barycentre
   (shared/ephemeris.js, Table 2a), eccentricity and perihelion of date.
   The Sun's apogee is the Earth's perihelion. */
const MID_2026 = Time.julianDay(2026, 7, 2);
const T2026 = Time.centuries(MID_2026);
const eKepler = 0.01673163 - 0.00003661 * T2026;
const perihelion = Ephem.precessEcliptic(102.93005885 + 0.3179526 * T2026, 0, Time.J2000, MID_2026).lon;
console.log(
	`Kepler, 2026: e_K = ${f(eKepler, 5)}, 2 e_K = ${f(2 * eKepler, 5)}; our e / 2 e_K = ${f(fit2026.e / (2 * eKepler), 4)}`
);
console.log(`   the Sun's apogee of date ${f(perihelion, 2)}°; ours ${f(fit2026.apogee - perihelion, 2)}° further`);

/* ==========================================================================
   7. TEST
   ========================================================================== */

/* Model - reference (arcmin) every 'step' days from start to end (JD TT):
   the smallest and largest, with their dates, and the RMS. */
function errorStats(model, start, end, step = 1) {
	let low = { value: Infinity };
	let high = { value: -Infinity };
	let sumSquares = 0;
	let count = 0;

	for (let jd = start; jd <= end; jd += step) {
		const value = norm180(model(jd) - sunLongitude(jd)) * 60;

		if (value < low.value) {
			low = { value, jd };
		}

		if (value > high.value) {
			high = { value, jd };
		}

		sumSquares += value * value;
		count++;
	}

	return { low, high, rms: Math.sqrt(sumSquares / count) };
}

function printStats(label, s, unit = 'arcmin') {
	const k = unit === 'deg' ? 1 / 60 : 1;
	const sign = unit === 'deg' ? '°' : "'";

	console.log(
		`${label}: ${f(s.low.value * k, 2)}${sign} (${date(s.low.jd)}) to ${f(s.high.value * k, 2)}${sign} (${date(s.high.jd)}), RMS ${f(s.rms * k, 2)}${sign}`
	);
}

title('Test: Figure 4, 2026');
const meanSun = MeanSun.make();
const ours = SolarEccentric.make(SolarEccentric.FIT_2026);
printStats('uniform circle (MeanSun.MODERN)', errorStats(meanSun, Y2026, Y2027, 0.25));
printStats('eccentric (FIT_2026)', errorStats(ours, Y2026, Y2027, 0.25));

title('Test: the day of page 1.3, with the eccentric Sun (2026, meridian of Greenwich)');

/* The reference Sun's day: its noon (hour angle 0), then sunrise and
   sunset with h0 = -50' (page 1.3), in hours. */
function realDayHours(jd0, phi) {
	const sunNow = jdUT => {
		const jdTT = Time.ttFromUt(jdUT);
		const eq = Ephem.equatorial(Ephem.sun(jdTT), jdTT);

		return { dec: eq.dec, H: norm180(Ephem.apparentSiderealTime(jdUT) - eq.ra) };
	};
	const above = jdUT => {
		const s = sunNow(jdUT);

		return Diurnal.altitude(s.dec, s.H, phi) - Clock.SUN_HORIZON;
	};
	const noon = bisect(jd => sunNow(jd).H, jd0 + 0.47, jd0 + 0.53, 30);

	if (above(noon) < 0 || above(noon - 0.5) > 0) {
		return NaN;
	}

	return (bisect(above, noon, noon + 0.5, 30) - bisect(above, noon - 0.5, noon, 30)) * 24;
}

/* A model Sun's day as on page 1.3: the declination at mean noon, from
   its longitude, gives the rising hour angle H0 (Clock.sunDay with
   another longitude). */
function modelDayHours(jd0, phi, longitude) {
	const jdTT = Time.ttFromUt(jd0 + 0.5);
	const dec = Frames.eclipticPoint(longitude(jdTT), Ephem.meanObliquity(jdTT)).dec;

	return (2 * Diurnal.risingHourAngle(dec, phi, Clock.SUN_HORIZON)) / 15;
}

[41.9, 51.5, 65].forEach(phi => {
	let worstMean = 0;
	let worstOurs = 0;

	for (let d = 0; d < 365; d++) {
		const real = realDayHours(Y2026 + d, phi);

		if (!Number.isNaN(real)) {
			worstMean = Math.max(worstMean, Math.abs(modelDayHours(Y2026 + d, phi, meanSun) - real) * 60);
			worstOurs = Math.max(worstOurs, Math.abs(modelDayHours(Y2026 + d, phi, ours) - real) * 60);
		}
	}

	console.log(
		`phi = ${phi}°: largest error of the day, mean Sun ${f(worstMean, 1)} min, eccentric Sun ${f(worstOurs, 1)} min`
	);
});

title("Test: Ptolemy's Sun (Almagest III 7-8), Figure 5");
const ptolemy = SolarEccentric.make(SolarEccentric.PTOLEMY);
const ptolemyMean = MeanSun.make(MeanSun.PTOLEMY);
console.log(
	`epoch JD(UT) ${f(MeanSun.PTOLEMY.epoch, 4)} = ${when(MeanSun.PTOLEMY.epoch)} UT (noon at Alexandria); Delta T ${f(Time.deltaT(Time.decimalYear(MeanSun.PTOLEMY.epoch)) / 3600, 2)} h`
);
const Y140 = Time.julianDay(140, 1, 1);
printStats("Ptolemy's eccentric, AD 140", errorStats(ptolemy, Y140, Y140 + 365.25, 0.25), 'deg');
printStats("Ptolemy's mean Sun, AD 140", errorStats(ptolemyMean, Y140, Y140 + 365.25, 0.25), 'deg');

/* His autumn equinox of AD 132, 2 equinoctial hours after noon (III 7):
   1769539.0833 is that moment on the meridian of Greenwich (page 1.3). */
const ALEXANDRIA = 29.92;
const atAlexandria = jdTT => Time.utFromTt(jdTT) + ALEXANDRIA / 360;
const equinox132 = Time.ttFromUt(1769539.0833 - ALEXANDRIA / 360);
const realEquinox132 = sunReaches(180, equinox132 - 5);
console.log(
	`at his equinox of 25 Sep 132, 14h at Alexandria, his model gives ${f(ptolemy(equinox132), 3)}°, the real Sun ${f(sunLongitude(equinox132), 3)}°`
);
console.log(
	`   the real equinox: ${when(atAlexandria(realEquinox132))} Alexandria mean time, ${f((equinox132 - realEquinox132) * 24, 1)} h earlier`
);

[-860, -200, 140, 500, 1000, 1140, 1500, 2026].forEach(year => {
	const start = Time.julianDay(year, 1, 1);
	const s = errorStats(ptolemy, start, start + 365.25, 1);

	console.log(
		`   ${Time.formatYear(year).padStart(7)}: ${f(s.low.value / 60, 2)}° to ${f(s.high.value / 60, 2)}°, mean ${f((s.low.value + s.high.value) / 120, 2)}°`
	);
});
console.log(`his mean Sun falls behind by ${f((N_MODERN - N_PTOLEMY) * 36525, 3)}° a century`);

/* ==========================================================================
   8. RESIDUAL
   ========================================================================== */

title('Residual: our eccentric over longer spans, Figure 6');
printStats('2026', errorStats(ours, Y2026, Y2027, 0.25));
[
	[1976, 2076],
	[1526, 2526]
].forEach(([from, to]) => {
	printStats(`${from}-${to}`, errorStats(ours, Time.julianDay(from, 1, 1), Time.julianDay(to, 1, 1), 2));
});

/* The part of the 2026 residual that is the eccentric's shape: Kepler's
   q to second order, -2 e_K sin M + 5/4 e_K^2 sin 2M, with e_K = e / 2,
   differs from the eccentric's -e sin M + e^2 / 2 sin 2M by
   (e^2 / 2 - 5/4 e_K^2) sin 2M. */
const eOurs = SolarEccentric.FIT_2026.e;
console.log(
	`eccentric - ellipse: (e^2/2 - 5/4 (e/2)^2) sin 2M, amplitude ${f(((eOurs * eOurs) / 2 - (5 / 4) * (eOurs / 2) ** 2) * R2D * 60, 2)}'`
);

title('Residual: the monthly ripple (the Earth about the Earth-Moon barycentre)');
{
	let largest = 0;

	for (let jd = Y2026; jd < Y2027; jd += 0.25) {
		const emb = shared.toLonLat(shared.negate(Ephem.heliocentricJ2000('emb', jd)));
		const fromBarycentre = Ephem.precessEcliptic(emb.lon, emb.lat, Time.J2000, jd).lon;
		const fromEarth = Ephem.sun(jd, { apparent: false }).lon;

		largest = Math.max(largest, Math.abs(norm180(fromEarth - fromBarycentre)) * 3600);
	}

	console.log(`the Sun seen from the Earth minus from the barycentre: at most ${f(largest, 1)}" in 2026`);
}

title('Residual: the apogee moves (each year fitted by the same method)');
[-140, 140, 880, 1250, 1515, 2026].forEach(year => {
	const s = seasons(Time.julianDay(year, 3, 1));
	const r = SolarEccentric.fitSeasons(s.lengths[0], s.lengths[1], YEAR);

	console.log(
		`${Time.formatYear(year).padStart(7)}: spring ${f(s.lengths[0], 2)} d, summer ${f(s.lengths[1], 2)} d -> e = ${f(r.e, 4)}, apogee ${f(r.apogee, 2)}°`
	);
});
console.log(
	`al-Battani (De Rev. III 16): spring 93d35dm = ${f(93 + 35 / 60, 3)} d, apogee 7°43' before the solstice = ${f(90 - 7 - 43 / 60, 2)}°`
);
console.log(`Copernicus 1515: e = 1/31 = ${f(1 / 31, 4)}, apogee 6 2/3° after the solstice = ${f(96 + 2 / 3, 2)}°`);
{
	const T = Time.centuries(Time.julianDay(2026, 1, 1));
	const lonAt = jd => Ephem.precessEcliptic(0, 0, Time.J2000, jd).lon;
	const precession = norm180(lonAt(Time.julianDay(2076, 1, 1)) - lonAt(Time.julianDay(1976, 1, 1)));

	console.log(
		`precession in longitude around 2026: ${f(precession, 3)}° a century; the perihelion's own motion (Standish): ${f(0.3179526, 3)}° a century (T = ${f(T, 2)})`
	);
}
console.log(
	`rate since 141 BC: ${f(((SolarEccentric.FIT_2026.apogee - fit141BC.apogee) / (2026 + 140)) * 100, 2)}° a century`
);

title('Residual: the distance');
const dists = [];

for (let d = 0; d < 365; d++) {
	dists.push(Ephem.sun(Y2026 + d).dist);
}

const near = Math.min(...dists);
const far = Math.max(...dists);
const diameterAt1au = 1919.26 / 60; // arcmin, the Sun's apparent diameter at 1 au (Meeus)
console.log(
	`real Sun 2026: ${f(near, 5)} to ${f(far, 5)} au, apparent diameter ${f(diameterAt1au / far, 2)}' to ${f(diameterAt1au / near, 2)}'`
);
console.log(
	`eccentric, e = ${f(eOurs, 4)}: distance 1 -+ ${f(eOurs * 100, 2)}%; with the mean diameter ${f(diameterAt1au, 2)}': ` +
		`${f(diameterAt1au, 2)}' / ${f(1 + eOurs, 4)} = ${f(diameterAt1au / (1 + eOurs), 2)}' at the apogee, ` +
		`${f(diameterAt1au, 2)}' / ${f(1 - eOurs, 4)} = ${f(diameterAt1au / (1 - eOurs), 2)}' at the perigee`
);

/* ==========================================================================
   9. EXERCISES
   ========================================================================== */

title("Exercise 1: Hipparchus' Sun (see section 6)");
console.log(
	`e = ${f(fitHipparchus.e, 4)}, apogee ${f(fitHipparchus.apogee, 2)}°, autumn ${f(fitHipparchus.lengths[2], 2)} d, winter ${f(fitHipparchus.lengths[3], 2)} d (Ptolemy 88 1/8, 90 1/8)`
);
console.log(`141 BC real: e = ${f(fit141BC.e, 4)}, apogee ${f(fit141BC.apogee, 2)}°`);

title('Exercise 2: the greatest equation (see section 5)');

title("Exercise 3: Ptolemy's observations of AD 139-140 (Almagest III 1)");
const real139 = sunReaches(180, Time.julianDay(139, 9, 15));
const real140s = sunReaches(0, Time.julianDay(140, 3, 10));
const real140ss = sunReaches(90, Time.julianDay(140, 6, 10));
console.log(`autumn equinox 139: real ${when(atAlexandria(real139))}; Ptolemy 26 Sep, 1 h after sunrise (about 07h)`);
console.log(`spring equinox 140: real ${when(atAlexandria(real140s))}; Ptolemy 22 Mar, 1 h after noon (13h)`);
console.log(`summer solstice 140: real ${when(atAlexandria(real140ss))}; Ptolemy 25 Jun, 2 h after midnight (02h)`);
const sAD140fit = SolarEccentric.fitSeasons(sAD140.lengths[0], sAD140.lengths[1], YEAR);
console.log(
	`AD 140 real: spring ${f(sAD140.lengths[0], 2)}, summer ${f(sAD140.lengths[1], 2)} -> apogee ${f(sAD140fit.apogee, 2)}°, e ${f(sAD140fit.e, 4)}`
);

/* ==========================================================================
   10. THE SCALES OF THE FIGURES
   ========================================================================== */

title('Scales');
console.log(
	`Figure 2: e up to 0.2 -> |q| up to ${f(SolarEccentric.greatestEquation(0.2).q, 2)}° (axis +-12°); 0.2 / e(2026) = ${f(0.2 / SolarEccentric.FIT_2026.e, 2)}`
);
console.log(
	`Figure 2 at e = 0.2: seasons ${SolarEccentric.seasonLengths(0.2, SolarEccentric.FIT_2026.apogee, YEAR)
		.map(x => f(x, 2))
		.join(', ')} d`
);
let largestE = 0;

for (let a = 90; a <= 96; a += 0.5) {
	for (let b = 90; b <= 96; b += 0.5) {
		largestE = Math.max(largestE, SolarEccentric.fitSeasons(a, b, YEAR).e);
	}
}

console.log(
	`Figure 3: spring and summer from 90 to 96 d -> e up to ${f(largestE, 4)} (zoom panel +-0.1); drawn six times farther out in (a): ${f(6 * largestE, 3)}`
);
