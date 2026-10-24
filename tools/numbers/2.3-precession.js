/* ==========================================================================
   NUMBERS FOR PAGE 2.3 "PRECESSION" (tools/numbers/2.3-precession.js)
   Loads the site's shared code (common, time, ephemeris, stars and the
   models mean-sun.js, solar-eccentric.js, equation-of-time.js,
   precession.js)
   in a Node vm context and prints every number quoted on the page, in
   page order.

   Run from the repository root:  node tools/numbers/2.3-precession.js
   (about two minutes: section 6 finds the seasons of seventeen years)

   TABLE OF CONTENTS
	 1. Loading the shared code
	 2. Helpers: formatting, stars, the moving apogee, the seasons
	 3. Observation: the recorded longitudes of Spica; latitude and
		declination; Figure 1
	 4. Model: the pole's circle, the change of declination, the pole
		stars, the two years
	 5. Fit: the rate from two records, from Spica's records, from the
		reference sky; Copernicus' mean rate; the apogee's motion
	 6. Test: uniform precession against the real stars; the Sun with a
		moving apogee; the equation of time; Ptolemy's stars
	 7. Residual: the changing rate, the obliquity, the latitudes,
		nutation, what is left of the Sun's error
	 8. Exercises
	 9. The scales of the figures
   ========================================================================== */

const { loadFiles } = require('../check/load.js');

/* ==========================================================================
   1. LOADING THE SHARED CODE
   ========================================================================== */

const shared = loadFiles([
	'shared/common.js',
	'shared/time.js',
	'shared/ephemeris.js',
	'shared/stars.js',
	'shared/models/frames.js',
	'shared/models/mean-sun.js',
	'shared/models/solar-eccentric.js',
	'shared/models/equation-of-time.js',
	'shared/models/precession.js'
]);
const { norm180, sin, cos, Time, Ephem, Stars, MeanSun, SolarEccentric, EquationOfTime, Precession } = shared;

/* ==========================================================================
   2. HELPERS
   ========================================================================== */

/* ---------- Formatting ---------- */

const f = (x, digits) => x.toFixed(digits);
const title = text => console.log(`\n=== ${text} ===`);
const year = y => Time.formatYear(y);

/* The sexagesimal value d;m,s,... of the sources -> decimal. */
const fromSexagesimal = (...parts) => parts.reduce((sum, part, i) => sum + part / Math.pow(60, i), 0);

/* Degrees -> "23°51'20"". */
function dms(degrees) {
	const sign = degrees < 0 ? '-' : '';
	const total = Math.round(Math.abs(degrees) * 3600);
	const d = Math.floor(total / 3600);
	const m = Math.floor((total - 3600 * d) / 60);
	const s = total - 3600 * d - 60 * m;

	return `${sign}${d}°${String(m).padStart(2, '0')}'${String(s).padStart(2, '0')}" (${sign}${Math.abs(degrees).toFixed(2)}°)`;
}

/* A length of year (days) -> "365 d 6 h 9 min 10 s". */
function yearText(days) {
	const seconds = Math.round((days - 365) * 86400);
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds - 3600 * h) / 60);
	const s = seconds - 3600 * h - 60 * m;

	return `365 d ${h} h ${m} min ${s} s`;
}

/* ---------- Stars ----------
   Regulus, beta Scorpii and Thuban were added to shared/stars.js for this
   page (SIMBAD, retrieved 2026-10-24, tools/numbers/data/). */

const star = name => Stars.find(name);

/* Mean ecliptic coordinates of date and the declination of a star:
   { lon, lat, dec } (deg). The reference sky's stars: proper motion, then
   the long-term precession (stars.js); the mean obliquity of date. */
function ofDate(s, jd) {
	const p = Stars.ofDate(s, jd);
	const e = Ephem.equatorialToEcliptic(p.ra, p.dec, Ephem.obliquity(jd, false));

	return { lon: e.lon, lat: e.lat, dec: p.dec };
}

const jdOf = y => Time.julianDay(y, 1, 1);
const J2026 = jdOf(2026);
const DAYS_PER_YEAR = 365.25;

/* The longitude of date of the J2000 equinox: how far the equinox of
   date has moved west along the ecliptic since J2000 (deg). */
const equinoxShift = jd => Ephem.precessEcliptic(0, 0, Time.J2000, jd).lon;

/* The rate of precession in longitude (arcsec a Julian year) at JD,
   from the shift over the century centred on it. */
function rateAt(jd) {
	const half = 36525 / 2;

	return (norm180(equinoxShift(jd + half) - equinoxShift(jd - half)) * 3600) / 100;
}

/* ---------- The reference Sun's seasons (as in 2.1-uneven-year.js) ---------- */

const sunLongitude = jd => Ephem.longitude('sun', jd);

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

function sunReaches(target, from) {
	const behind = jd => norm180(sunLongitude(jd) - target);
	let jd = from;

	while (!(behind(jd) < 0 && behind(jd + 1) >= 0)) {
		jd += 1;
	}

	return bisect(behind, jd, jd + 1);
}

/* The lengths of spring and summer starting with the first spring
   equinox after 'from'. */
function springAndSummer(from) {
	const t0 = sunReaches(0, from);
	const t1 = sunReaches(90, t0);
	const t2 = sunReaches(180, t1);

	return [t1 - t0, t2 - t1];
}

/* Least-squares line y = a + b x: { a, b }. */
function lineFit(xs, ys) {
	const n = xs.length;
	const mx = xs.reduce((s, x) => s + x, 0) / n;
	const my = ys.reduce((s, y) => s + y, 0) / n;
	let sxy = 0;
	let sxx = 0;

	xs.forEach((x, i) => {
		sxy += (x - mx) * (ys[i] - my);
		sxx += (x - mx) * (x - mx);
	});

	return { a: my - (sxy / sxx) * mx, b: sxy / sxx };
}

/* Smallest and largest of fn over [a, b] (step in days). */
function extremes(fn, a, b, step) {
	let low = Infinity;
	let high = -Infinity;

	for (let jd = a; jd <= b; jd += step) {
		const v = fn(jd);

		low = Math.min(low, v);
		high = Math.max(high, v);
	}

	return { low, high };
}

/* ==========================================================================
   3. OBSERVATION
   ========================================================================== */

/* The recorded longitudes of Spica, Regulus and beta Scorpii, from
   Timocharis to Copernicus (Precession.RECORDS, with their sources). */
const RECORDS = Precession.RECORDS;

title('Observation: Hipparchus and Timocharis (Almagest VII 2)');
console.log('Spica "formerly 8°, now 6°" in advance of the autumn equinox: 172° then 174° (quoted, not computed)');
{
	const real = y => ofDate(star('Spica'), Time.julianDay(y, 1, 1)).lon;

	console.log(
		`real Spica: ${f(real(-293), 2)}° in 294 BC (Timocharis), ${f(real(-140), 2)}° in 141 BC (Hipparchus): ${f(real(-140) - real(-293), 2)}° in ${-140 + 293} years`
	);
}

title("Observation: Spica's recorded longitudes against the real sky (the table)");
RECORDS.filter(r => r.star === 'Spica').forEach(r => {
	const real = ofDate(star('Spica'), r.jd);

	console.log(
		`${r.who.padEnd(11)} ${year(Time.calendarDate(r.jd).year).padStart(7)}: recorded ${f(r.lon, 2)}° (${dms(r.lon)}, ${r.source}); real ${f(real.lon, 2)}°, recorded - real ${f(r.lon - real.lon, 2)}°`
	);
});
{
	const first = RECORDS.find(r => r.star === 'Spica');
	const last = RECORDS.filter(r => r.star === 'Spica').pop();

	console.log(
		`recorded growth from Timocharis (294 BC) to Copernicus (1525): ${f(last.lon - first.lon, 2)}° in ${Time.calendarDate(last.jd).year - Time.calendarDate(first.jd).year} years`
	);
}
{
	const hip = ofDate(star('Spica'), jdOf(-127)).lon; // 128 BC
	const now = ofDate(star('Spica'), J2026).lon;

	console.log(
		`real Spica from Hipparchus (128 BC) to 2026: ${f(hip, 2)}° -> ${f(now, 2)}°, ${f(now - hip, 2)}°, about one sign of 30°`
	);
}

title('Observation: latitude and declination of Spica (Almagest VII 3)');
console.log(
	'recorded latitude: 2° south for Timocharis and for Ptolemy (VII 3); Ptolemy: declination 1/2° south (VII 3, De Rev. III 2)'
);
[-293, -127, 139, 1525, 2026].forEach(y => {
	const p = ofDate(star('Spica'), jdOf(y));

	console.log(`${year(y).padStart(7)}: real latitude ${f(p.lat, 2)}°, declination ${f(p.dec, 2)}°`);
});

title('Observation: Figure 1 (six stars, 3000 BC to AD 3000)');
const FIGURE_1_STARS = ['Aldebaran', 'Regulus', 'Spica', 'Antares', 'Vega', 'Polaris'];
{
	const from = jdOf(-2999);
	const to = jdOf(3000);
	const step = 36525 / 4;
	let spread = 0;
	let latChange = 0;
	let dLonLow = Infinity;
	let dLonHigh = -Infinity;

	for (let jd = from; jd <= to; jd += step) {
		const dLon = FIGURE_1_STARS.map(name => norm180(ofDate(star(name), jd).lon - ofDate(star(name), J2026).lon));
		const dLat = FIGURE_1_STARS.map(name => ofDate(star(name), jd).lat - ofDate(star(name), J2026).lat);

		spread = Math.max(spread, Math.max(...dLon) - Math.min(...dLon));
		latChange = Math.max(latChange, ...dLat.map(Math.abs));
		dLonLow = Math.min(dLonLow, ...dLon);
		dLonHigh = Math.max(dLonHigh, ...dLon);
	}

	console.log(
		`change of longitude since 2026: ${f(dLonLow, 1)}° to ${f(dLonHigh, 1)}°; largest spread between the six stars ${f(spread, 2)}°; largest change of latitude ${f(latChange, 2)}°`
	);

	FIGURE_1_STARS.forEach(name => {
		const d = extremes(jd => ofDate(star(name), jd).dec, from, to, step);

		console.log(`   ${name.padEnd(10)} declination ${f(d.low, 1)}° to ${f(d.high, 1)}°`);
	});
}

/* ==========================================================================
   4. MODEL
   ========================================================================== */

const EPS_2026 = Ephem.meanObliquity(J2026);
const P = rateAt(J2026) / 3600; // deg a Julian year, fitted in section 5

title("Model: the pole's circle and the change of declination");
console.log(`radius of P's circle about K: the obliquity, ${f(EPS_2026, 4)}° (page 1.2)`);
console.log(
	`d delta / dt = p sin eps cos beta cos lambda / cos delta; for a star on the ecliptic at an equinox: ${f(P * sin(EPS_2026) * 3600, 2)}" a year = ${f(P * sin(EPS_2026) * 100, 3)}° a century`
);
{
	const mid = ofDate(star('Spica'), jdOf(5));
	const rate = (P * sin(EPS_2026) * cos(mid.lat) * cos(mid.lon)) / cos(mid.dec);
	const a = ofDate(star('Spica'), jdOf(-127));
	const b = ofDate(star('Spica'), jdOf(139));

	console.log(
		`Spica around AD 5 (lambda ${f(mid.lon, 1)}°): ${f(rate * 3600, 1)}" a year, ${f(rate * 267, 2)}° from 128 BC to AD 139`
	);
	console.log(
		`   real: ${f(a.dec, 2)}° -> ${f(b.dec, 2)}°, ${f(b.dec - a.dec, 2)}°; Ptolemy's difference 1 1/10° (VII 3), with his rate 2 2/3° x sin eps x cos lambda = ${f((8 / 3) * sin(23.86) * Math.abs(cos(176)), 2)}°`
	);
}

title('Model: the period and the pole stars');
console.log(`period 360° / p = ${f(360 / P, 0)} years`);
{
	const fromPole = (name, jd) => 90 - Stars.ofDate(star(name), jd).dec;
	const closest = (name, a, b, step) => {
		let best = { d: Infinity, y: 0 };

		for (let y = a; y <= b; y += step) {
			const d = fromPole(name, jdOf(y));

			if (d < best.d) {
				best = { d, y };
			}
		}

		return best;
	};

	/* The uniform model of the page (Precession.MODERN, as Figure 2 draws
	   it): the star fixed at its place of 2026 in the ecliptic frame of
	   2026, the pole of the equator turning about K. */
	const modelFromPole = (name, y) => {
		const epoch = Precession.MODERN.epoch;
		const p = Stars.ofDate(star(name), epoch);
		const e = Ephem.equatorialToEcliptic(p.ra, p.dec, Precession.MODERN.obliquity);

		return 90 - Precession.equatorial(Precession.MODERN, e.lon, e.lat, jdOf(y)).dec;
	};
	const modelClosest = (name, a, b, step) => {
		let best = { d: Infinity, y: 0 };

		for (let y = a; y <= b; y += step) {
			const d = modelFromPole(name, y);

			if (d < best.d) {
				best = { d, y };
			}
		}

		return best;
	};

	[
		['Polaris', 1900, 2300, 1],
		['Thuban', -4000, -2000, 5],
		['Vega', 10000, 16000, 10]
	].forEach(([name, a, b, step]) => {
		const real = closest(name, a, b, step);
		const model = modelClosest(name, a, b, step);

		console.log(
			`${name.padEnd(8)} nearest the pole: real ${year(real.y)}, ${f(real.d, 2)}° (${real.y - 2026} years from 2026); uniform model ${year(model.y)}, ${f(model.d, 2)}° (Figure 2's presets)`
		);
	});
	console.log(`Polaris from the pole in 2026: ${f(fromPole('Polaris', J2026), 2)}°`);
	console.log(
		`Figure 3: one turn centred on 2026, from ${year(Math.round(2026 - 180 / P))} to ${year(Math.round(2026 + 180 / P))}`
	);
}

title('Model: the tropical and the sidereal year');
const Y_TROPICAL = MeanSun.yearLength();
const pPerTropicalYear = (P * Y_TROPICAL) / DAYS_PER_YEAR;
const Y_SIDEREAL = Y_TROPICAL / (1 - pPerTropicalYear / 360);
console.log(
	`Y_s = Y_t / (1 - p Y_t / 360°): ${f(Y_TROPICAL, 5)} d -> ${f(Y_SIDEREAL, 5)} d, ${f((Y_SIDEREAL - Y_TROPICAL) * 1440, 2)} min longer; p / n = ${f((P / MeanSun.MODERN.n) * 1440, 2)} min`
);
console.log(`   tropical ${yearText(Y_TROPICAL)}, sidereal ${yearText(Y_SIDEREAL)}`);
console.log(
	`the Earth's mean motion in the reference sky (Standish, fixed J2000 frame), 35999.37306329° a century: sidereal year ${f(36525 / (35999.37306329 / 360), 5)} d`
);
console.log(
	`Thabit ibn Qurra (De Rev. III 13), 365;15,23 d = ${f(fromSexagesimal(365, 15, 23), 5)} d = ${yearText(fromSexagesimal(365, 15, 23))}`
);
console.log(
	`Copernicus (De Rev. III 14), 365;15,24,10 d = ${f(fromSexagesimal(365, 15, 24, 10), 6)} d = ${yearText(fromSexagesimal(365, 15, 24, 10))}, ${f((fromSexagesimal(365, 15, 24, 10) - Y_SIDEREAL) * 86400, 1)} s longer than ours`
);

/* ==========================================================================
   5. FIT
   ========================================================================== */

title("Fit: Hipparchus' and Ptolemy's rate (Almagest VII 2)");
{
	const hip = RECORDS.find(r => r.who === 'Hipparchus');
	const pto = RECORDS.find(r => r.who === 'Ptolemy' && r.star === 'Regulus');
	const moved = pto.lon - hip.lon;

	console.log(
		`Regulus: ${f(hip.lon, 3)}° -> ${f(pto.lon, 3)}°, ${dms(moved)} in Ptolemy's 265 years: 1° in ${f(265 / moved, 1)} years, ${f((moved / 265) * 3600, 1)}" a year`
	);
	console.log(`Hipparchus: "not less than 1/100 of a degree" a year = ${f(3600 / 100, 1)}" a year`);
	console.log(
		`historical values in decimals: 29;50 = ${f(29 + 50 / 60, 2)}°, 44;5 = ${f(44 + 5 / 60, 2)}°, 23;57 = ${f(23 + 57 / 60, 2)}°`
	);
	console.log(`an error of 1° over 265 years: ${f(3600 / 265, 1)}" a year`);
}

title("Fit: the rate from Spica's records");
{
	const spica = RECORDS.filter(r => r.star === 'Spica');
	const years = spica.map(r => Time.decimalYear(r.jd));
	const line = lineFit(
		years,
		spica.map(r => r.lon)
	);
	const first = spica[0];
	const last = spica[spica.length - 1];
	const twoPoint = (last.lon - first.lon) / (Time.decimalYear(last.jd) - Time.decimalYear(first.jd));

	console.log(
		`Timocharis (294 BC) to Copernicus (1525): ${f(twoPoint * 3600, 1)}" a year, 1° in ${f(1 / twoPoint, 1)} years`
	);
	console.log(
		`least squares through the six records: ${f(line.b * 3600, 1)}" a year, 1° in ${f(1 / line.b, 1)} years`
	);
	console.log(
		`an error of 1° spread over the ${f(Time.decimalYear(last.jd) - Time.decimalYear(first.jd), 0)} years: ${f(3600 / (Time.decimalYear(last.jd) - Time.decimalYear(first.jd)), 1)}" a year`
	);
}

title('Fit: the rate from the reference sky, around 2026');
console.log(
	`Precession.MODERN in precession.js: rate ${f(Precession.MODERN.rate * 3600, 3)}" a year, obliquity ${Precession.MODERN.obliquity}° (here ${f(EPS_2026, 5)}°), epoch ${Time.formatDate(Precession.MODERN.epoch)}`
);
console.log(
	`p = ${f(P * 3600, 3)}" a year = ${f(P * 100, 4)}° a century, 1° in ${f(1 / P, 2)} years; from Spica alone ${f((norm180(ofDate(star('Spica'), J2026 + 36525 / 2).lon - ofDate(star('Spica'), J2026 - 36525 / 2).lon) * 3600) / 100, 3)}" a year`
);
{
	const copernicus = (23 + 57 / 60) / 1717; // deg per Egyptian year of 365 days (De Rev. III 6)

	console.log(
		`Copernicus' mean precession, 23;57° in 1,717 Egyptian years: ${f((copernicus * 3600 * DAYS_PER_YEAR) / 365, 2)}" a Julian year; his period 25,816 years (360° / rate = ${f(360 / copernicus, 0)})`
	);
	console.log(`   ours minus his: ${f(P * 3600 - (copernicus * 3600 * DAYS_PER_YEAR) / 365, 3)}" a year`);
	console.log(
		`   the real mean rate over his records, 294 BC to 1525: ${f(((equinoxShift(jdOf(1525)) - equinoxShift(jdOf(-293))) * 3600) / (1525 + 293), 2)}" a year`
	);
}

title("Fit: the apogee's motion (Hipparchus' method on the seasons of seventeen years)");
const FIT_YEARS = [];

for (let y = -1000; y <= 3000; y += 250) {
	FIT_YEARS.push(y);
}

const apogees = FIT_YEARS.map(y => {
	const [spring, summer] = springAndSummer(Time.julianDay(y, 3, 1));
	const fit = SolarEccentric.fitSeasons(spring, summer, Y_TROPICAL);

	console.log(`${year(y).padStart(7)}: apogee ${f(fit.apogee, 2)}°, e = ${f(fit.e, 5)}`);

	return fit;
});
const apogeeLine = lineFit(
	FIT_YEARS,
	apogees.map(a => a.apogee)
);
const APOGEE_RATE = apogeeLine.b * 100; // deg a century
console.log(
	`least squares: ${f(APOGEE_RATE, 3)}° a century relative to the equinox; minus p: ${f(APOGEE_RATE - P * 100, 3)}° a century relative to the stars`
);
console.log(`Standish's perihelion of the Earth (fixed J2000 frame): 0.318° a century`);
console.log(
	`the line at 2026: ${f(apogeeLine.a + apogeeLine.b * 2026, 2)}° (FIT_2026: ${SolarEccentric.FIT_2026.apogee}°)`
);

/* The eccentric of page 2.1 with a moving apogee (SolarEccentric.
   MOVING_2026), through its value of 2026 at the 2026 equinox, when page
   2.1 fitted it. */
const MOVING = SolarEccentric.MOVING_2026;
console.log(
	`MOVING_2026 in solar-eccentric.js: apogee ${MOVING.apogee}° at JD ${MOVING.apogeeEpoch} (${Time.formatDate(MOVING.apogeeEpoch, { time: true })} TT), rate ${MOVING.apogeeRate}° a century (fitted here: ${f(APOGEE_RATE, 3)})`
);

/* ==========================================================================
   6. TEST
   ========================================================================== */

title('Test: uniform precession against the real stars, Figure 5 (a)');
{
	const model = Precession.make(Precession.MODERN, ofDate(star('Spica'), Precession.MODERN.epoch).lon);

	[200, 2000, 6000].forEach(span => {
		const half = (span / 2) * DAYS_PER_YEAR;
		const e = extremes(
			jd => norm180(model(jd) - ofDate(star('Spica'), jd).lon) * 60,
			J2026 - half,
			J2026 + half,
			span * 0.5
		);

		console.log(`Spica, ${span} years around 2026: ${f(e.low, 2)}' to ${f(e.high, 2)}'`);
	});
}

title('Test: the Sun with a moving apogee, Figure 5 (b)');
{
	const fixed = SolarEccentric.make(SolarEccentric.FIT_2026);
	const moving = SolarEccentric.make(MOVING);
	const middle = Time.julianDay(2026, 7, 2);

	[100, 1000, 2000].forEach(span => {
		const half = (span / 2) * DAYS_PER_YEAR;
		const step = span > 500 ? 2 : 1;
		const a = extremes(jd => norm180(fixed(jd) - sunLongitude(jd)) * 60, middle - half, middle + half, step);
		const b = extremes(jd => norm180(moving(jd) - sunLongitude(jd)) * 60, middle - half, middle + half, step);

		console.log(
			`${String(span).padStart(4)} years: fixed apogee ${f(a.low, 1)}' to ${f(a.high, 1)}'; moving apogee ${f(b.low, 1)}' to ${f(b.high, 1)}'`
		);
	});
}

title('Test: the equation of time with a moving apogee (page 2.2)');
{
	/* The model's E with the apogee of date, against the reference E at
	   noon UT on every 5th day. */
	const ephemE = jd => Ephem.equationOfTime(jd);
	const modelE = (parameters, jd) =>
		EquationOfTime.partsAt(
			MeanSun.meanLongitude(parameters, jd),
			parameters.e,
			SolarEccentric.apogeeAt(parameters, jd),
			Ephem.meanObliquity(jd)
		).total;

	[100, 1000].forEach(span => {
		const half = (span / 2) * DAYS_PER_YEAR;
		const centre = Time.julianDay(2026, 7, 2.5);
		const worst = parameters => {
			const e = extremes(jd => (modelE(parameters, jd) - ephemE(jd)) * 60, centre - half, centre + half, 5);

			return Math.max(-e.low, e.high);
		};

		console.log(
			`${String(span).padStart(4)} years: largest error, fixed apogee ${f(worst(SolarEccentric.FIT_2026), 0)} s, moving apogee ${f(worst(MOVING), 0)} s`
		);
	});
}

title("Test: Ptolemy's stars, Figure 6 (records minus real; Ptolemy's Sun minus real)");
const ptolemySun = SolarEccentric.make(SolarEccentric.PTOLEMY);

/* The yearly mean error of Ptolemy's Sun around JD (deg). */
function ptolemySunError(jd) {
	let sum = 0;
	let count = 0;

	for (let d = -182; d <= 182; d += 2) {
		sum += norm180(ptolemySun(jd + d) - sunLongitude(jd + d));
		count++;
	}

	return sum / count;
}

RECORDS.forEach(r => {
	const real = ofDate(star(r.star), r.jd);

	console.log(
		`${r.who.padEnd(11)} ${r.star.padEnd(10)} ${year(Time.calendarDate(r.jd).year).padStart(7)}: recorded ${f(r.lon, 2)}°, real ${f(real.lon, 2)}°, recorded - real ${f(r.lon - real.lon, 2)}°; Ptolemy's Sun ${f(ptolemySunError(r.jd), 2)}°`
	);
});
{
	const slow = (MeanSun.MODERN.n - MeanSun.PTOLEMY.n) * DAYS_PER_YEAR * 3600;

	console.log(
		`Ptolemy's mean motion is slower than today's by ${f(slow, 1)}" a year; the real rate in his time ${f(rateAt(jdOf(0)), 1)}" a year`
	);

	/* The drift of his Sun's error in his own era, from the yearly mean
	   errors at Timocharis' first record and at the catalogue's epoch
	   (Delta T and the longer year of antiquity make it smaller than
	   the difference of the mean motions). */
	const first = RECORDS[0];
	const catalogue = RECORDS.find(r => r.who === 'Ptolemy' && r.star === 'Spica');
	const drift =
		((ptolemySunError(first.jd) - ptolemySunError(catalogue.jd)) * 3600) /
		(Time.decimalYear(catalogue.jd) - Time.decimalYear(first.jd));

	console.log(
		`his Sun's error drifts by ${f(drift, 1)}" a year from 294 BC to AD 137; the real rate ${f(rateAt(jdOf(0)), 1)}" less this: ${f(rateAt(jdOf(0)) - drift, 1)}" a year (his 36")`
	);
	console.log(
		`Spica's declination: Hipparchus +3/5°, Ptolemy -1/2° (VII 3), a change of 1 1/10°; real change ${f(ofDate(star('Spica'), jdOf(139)).dec - ofDate(star('Spica'), jdOf(-127)).dec, 2)}°; Ptolemy's -1/2° against the real ${f(ofDate(star('Spica'), jdOf(139)).dec, 2)}°, ${f(-0.5 - ofDate(star('Spica'), jdOf(139)).dec, 2)}° short`
	);
}
{
	/* Ptolemy's catalogue rule (VII 4): add 1° a century to the positions
	   of AD 137. Spica by that rule, against the real Spica. */
	const catalogue = RECORDS.find(r => r.who === 'Ptolemy' && r.star === 'Spica');
	const rule = y => Precession.longitude(Precession.PTOLEMY, catalogue.lon, jdOf(y));

	[1515, 2026].forEach(y => {
		const real = ofDate(star('Spica'), jdOf(y)).lon;

		console.log(
			`Ptolemy's rule for Spica in ${y}: ${f(rule(y), 2)}°, real ${f(real, 2)}°, short by ${f(real - rule(y), 3)}°`
		);
	});
	console.log(
		`Ptolemy's year 365;14,48 d is ${f((fromSexagesimal(365, 14, 48) - Y_TROPICAL) * 1440, 2)} min longer than ours (page 2.1)`
	);
}

/* ==========================================================================
   7. RESIDUAL
   ========================================================================== */

title('Residual: the rate changes');
[-127, 139, 880, 1525, 2026, 3000].forEach(y => {
	console.log(`${year(y).padStart(7)}: ${f(rateAt(jdOf(y)), 2)}" a year`);
});

title('Residual: the obliquity');
console.log(
	`Ptolemy 23;51,20 = ${f(fromSexagesimal(23, 51, 20), 4)}°; real ${f(Ephem.meanObliquity(jdOf(-250)), 4)}° (250 BC), ${f(Ephem.meanObliquity(jdOf(139)), 4)}° (AD 139): ${f((fromSexagesimal(23, 51, 20) - Ephem.meanObliquity(jdOf(139))) * 60, 1)}' too large`
);
console.log(
	`al-Battani 23;35 = ${f(fromSexagesimal(23, 35), 4)}°; real ${f(Ephem.meanObliquity(jdOf(880)), 4)}° (880)`
);
console.log(
	`Copernicus 23;28,30 = ${f(fromSexagesimal(23, 28, 30), 4)}°; real ${f(Ephem.meanObliquity(jdOf(1525)), 4)}° (1525)`
);
console.log(
	`2026: ${f(EPS_2026, 4)}° = ${dms(EPS_2026)}, changing by ${f((Ephem.meanObliquity(jdOf(2076)) - Ephem.meanObliquity(jdOf(1976))) * 3600, 1)}" a century`
);

title('Residual: the latitudes are not quite fixed');
{
	const a = ofDate(star('Spica'), jdOf(-293)).lat;
	const b = ofDate(star('Spica'), J2026).lat;

	console.log(`Spica's latitude: ${f(a, 3)}° (294 BC) -> ${f(b, 3)}° (2026), ${f((b - a) * 60, 1)}'`);

	// the same without Spica's proper motion: the ecliptic's own turn
	const still = Object.assign({}, star('Spica'), { pmra: 0, pmdec: 0 });
	const c = ofDate(still, jdOf(-293)).lat;
	const d = ofDate(still, J2026).lat;

	console.log(`   without proper motion: ${f((d - c) * 60, 1)}'`);
}

title('Residual: nutation (Ephem.nutation, Meeus ch. 22)');
console.log(
	`largest terms: 17.20" in longitude, 9.20" in obliquity, with the Moon's node, period 360° / 1934.136261° a century = ${f((360 / 1934.136261) * 100, 2)} years`
);

title("Residual: what is left of the Sun's error");
console.log(
	`the eccentricity fitted by Hipparchus' method: ${f(apogees[0].e, 4)} (1000 BC), ${f(apogees[FIT_YEARS.indexOf(2000)].e, 4)} (2000), ${f(apogees[apogees.length - 1].e, 4)} (3000)`
);
console.log(
	`Meeus 25.2, the quadratic term of the mean longitude: 0.0003032 T^2 deg = ${f(0.0003032 * 100 * 60, 2)}' at T = +-10 centuries`
);

/* ==========================================================================
   8. EXERCISES
   ========================================================================== */

title('Exercise 1: the rate from two records of Regulus');
{
	const hip = RECORDS.find(r => r.who === 'Hipparchus');
	const bat = RECORDS.find(r => r.who === 'al-Battani' && r.star === 'Regulus');
	const pto = RECORDS.find(r => r.who === 'Ptolemy' && r.star === 'Regulus');
	const span = 880 + 127;
	const rate = (bat.lon - hip.lon) / span;
	const realHip = ofDate(star('Regulus'), hip.jd).lon;
	const realBat = ofDate(star('Regulus'), bat.jd).lon;
	const realPto = ofDate(star('Regulus'), pto.jd).lon;
	const ptoSpan = Time.decimalYear(pto.jd) - Time.decimalYear(hip.jd);

	console.log(
		`Hipparchus to al-Battani: ${dms(bat.lon - hip.lon)} in ${span} years: ${f(rate * 3600, 1)}" a year, 1° in ${f(1 / rate, 1)} years`
	);
	console.log(
		`   real: ${f(realHip, 2)}° -> ${f(realBat, 2)}°, ${f(realBat - realHip, 2)}°: ${f(((realBat - realHip) / span) * 3600, 1)}" a year; the records are ${f(bat.lon - hip.lon - (realBat - realHip), 2)}° too far apart`
	);
	console.log(
		`Hipparchus to Ptolemy: ${dms(pto.lon - hip.lon)} in 265 years: ${f(((pto.lon - hip.lon) / 265) * 3600, 1)}" a year`
	);
	console.log(
		`   real: ${f(realHip, 2)}° -> ${f(realPto, 2)}°, ${f(realPto - realHip, 2)}° in ${f(ptoSpan, 1)} years: ${f(((realPto - realHip) / ptoSpan) * 3600, 1)}" a year; Ptolemy's value ${f(pto.lon - realPto, 2)}° off, Hipparchus' ${f(hip.lon - realHip, 2)}°`
	);
}

title('Exercise 2: two years');
{
	const ptolemyTropical = fromSexagesimal(365, 14, 48);
	const ptolemySidereal = ptolemyTropical / (1 - 0.01 / 360);

	console.log(
		`modern: ${f(Y_TROPICAL, 5)} d and ${f(P * 3600, 2)}" a year: pY = ${f(pPerTropicalYear, 6)}° -> sidereal ${f(Y_SIDEREAL, 5)} d (see section 4)`
	);
	console.log(
		`Hipparchus and Ptolemy: tropical 365;14,48 = ${f(ptolemyTropical, 5)} d, 1° a century -> sidereal ${f(ptolemySidereal, 5)} d = ${yearText(ptolemySidereal)}`
	);
	console.log(
		`   errors: tropical ${f((ptolemyTropical - Y_TROPICAL) * 1440, 2)} min too long, sidereal ${f((ptolemySidereal - Y_SIDEREAL) * 86400, 0)} s too long`
	);

	/* The Sun's motion among the stars is n - p, both per tropical year:
	   Ptolemy's n is slower than today's, and his p too. */
	const nSlow = (MeanSun.MODERN.n - MeanSun.PTOLEMY.n) * DAYS_PER_YEAR * 3600;
	const pSlow = P * 3600 - 36;

	console.log(
		`   his n slower by ${f(nSlow, 1)}" a year, his p by ${f(pSlow, 1)}": n - p wrong by ${f(nSlow - pSlow, 1)}" a year, ${f(((nSlow - pSlow) / (360 * 3600)) * Y_SIDEREAL * 86400, 0)} s in the sidereal year`
	);
}

title("Exercise 3: Copernicus' uneven precession (De Rev. III 2)");
console.log(
	'Copernicus: 1° in 100 years (Timocharis to Ptolemy, 432 years), 1° in 65 years (Ptolemy to al-Battani, 741 years), 1° in 71 years (al-Battani to 1525, 645 years)'
);
[
	[-293, 139],
	[139, 880],
	[880, 1525]
].forEach(([a, b]) => {
	const moved = equinoxShift(jdOf(b)) - equinoxShift(jdOf(a));

	console.log(
		`   real ${year(a)} to ${year(b)}: ${f(moved, 2)}° in ${b - a} years, 1° in ${f((b - a) / moved, 1)} years`
	);
});
console.log(
	`   the real rate from the first interval to the last grows by ${f(((equinoxShift(jdOf(1525)) - equinoxShift(jdOf(880))) / 645 / ((equinoxShift(jdOf(139)) - equinoxShift(jdOf(-293))) / 432) - 1) * 100, 2)}%`
);
{
	const pick = (who, s) => RECORDS.find(r => r.who === who && r.star === s);
	const pairs = [
		['Timocharis', 'Ptolemy', 'Spica'],
		['Ptolemy', 'al-Battani', 'Regulus'],
		['Menelaus', 'al-Battani', 'β Scorpii']
	];

	pairs.forEach(([a, b, s]) => {
		const ra = pick(a, s);
		const rb = pick(b, s);
		const span = Time.decimalYear(rb.jd) - Time.decimalYear(ra.jd);

		console.log(
			`   records, ${s}, ${a} to ${b}: ${dms(rb.lon - ra.lon)} in ${f(span, 0)} years, 1° in ${f(span / (rb.lon - ra.lon), 1)} years`
		);
	});
}

/* ==========================================================================
   9. THE SCALES OF THE FIGURES
   ========================================================================== */

title('Scales');
console.log(
	'Figure 1: the changes of longitude and latitude and the declinations above (axes -80° to +20°, -40° to +100°)'
);
console.log(
	`Figure 2: one turn of the pole in ${f(360 / P, 0)} years; the year slider runs from 11,001 BC to AD 15,000, past the presets 2831 BC and AD 13,790`
);
{
	/* Figure 4, 400 BC to AD 1600: the real Spica, Ptolemy's rule and
	   the line fitted to the records. */
	const spica = RECORDS.filter(r => r.star === 'Spica');
	const line = lineFit(
		spica.map(r => Time.decimalYear(r.jd)),
		spica.map(r => r.lon)
	);
	const catalogue = RECORDS.find(r => r.who === 'Ptolemy' && r.star === 'Spica');
	let low = Infinity;
	let high = -Infinity;

	for (let y = -399; y <= 1600; y += 25) {
		const values = [
			ofDate(star('Spica'), jdOf(y)).lon,
			Precession.longitude(Precession.PTOLEMY, catalogue.lon, jdOf(y)),
			line.a + line.b * y
		];

		low = Math.min(low, ...values);
		high = Math.max(high, ...values);
	}

	console.log(`Figure 4: the three lines from ${f(low, 2)}° to ${f(high, 2)}° (axis 165° to 205°)`);
}
{
	const values = RECORDS.map(r => r.lon - ofDate(star(r.star), r.jd).lon);

	console.log(`Figure 6: records minus real from ${f(Math.min(...values), 2)}° to ${f(Math.max(...values), 2)}°`);

	const band = extremes(jd => norm180(ptolemySun(jd) - sunLongitude(jd)), jdOf(-399), jdOf(310), 5);

	console.log(
		`   Ptolemy's Sun minus real, 400 BC to AD 310 (the band): ${f(band.low, 2)}° to ${f(band.high, 2)}° (axis -2.5° to +2°)`
	);
}
