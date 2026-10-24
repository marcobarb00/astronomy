/* ==========================================================================
   NUMBERS FOR PAGE 2.3 "PRECESSION" (tools/numbers/2.3-precession.js)
   Loads the site's shared code (common, time, ephemeris, stars and the
   models mean-sun.js, solar-eccentric.js, equation-of-time.js, frames.js)
   in a Node vm context and prints every number quoted on the page, in
   page order.

   Run from the repository root:  node tools/numbers/2.3-precession.js
   (about two minutes: section 6 finds the seasons of seventeen years)

   DRAFT FOR THE PLAN. Until the page is built, the three stars the page
   adds to shared/stars.js (Regulus, beta1 Scorpii, Thuban) and the moving
   apogee that it adds to models/solar-eccentric.js are defined here, in
   section 2. They move to the shared code when the page is built.

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
	'shared/models/equation-of-time.js'
]);
const { norm180, norm360, sin, cos, asin, Time, Ephem, Stars, MeanSun, SolarEccentric, EquationOfTime } = shared;

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

	return `${sign}${d}°${String(m).padStart(2, '0')}'${String(s).padStart(2, '0')}"`;
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
   The stars of shared/stars.js, and the three the page adds (SIMBAD,
   retrieved 2026-10-24, tools/numbers/data/stars-2.3-2026-10-24.csv). */

// prettier-ignore
const ADDED_STARS = [
	{ name: 'Regulus',    id: 'alf Leo',   ra: 152.09296243828146, dec: 11.967208776100023,  pmra: -248.73, pmdec: 5.59,   mag: 1.4 },
	{ name: 'β Scorpii',  id: 'bet01 Sco', ra: 241.3592999275,     dec: -19.805452782777778, pmra: -5.2,    pmdec: -24.04, mag: 2.62 },
	{ name: 'Thuban',     id: 'alf Dra',   ra: 211.09732332021125, dec: 64.3758696175675,    pmra: -56.351, pmdec: 12.329, mag: 3.68 }
];

const star = name => ADDED_STARS.find(s => s.name === name) ?? Stars.find(name);

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

/* ---------- The moving apogee ----------
   The eccentric of page 2.1 with its apogee moving uniformly relative to
   the equinox: apogee(t) = apogee + apogeeRate (t - apogeeEpoch), the
   rate in degrees a Julian century. (To go into solar-eccentric.js.) */
function apogeeAt(parameters, jd) {
	const rate = parameters.apogeeRate ?? 0;

	return parameters.apogee + (rate * (jd - (parameters.apogeeEpoch ?? jd))) / 36525;
}

function makeSun(parameters) {
	return jd => {
		const L = MeanSun.meanLongitude(parameters, jd);

		return norm360(L + SolarEccentric.equationOfCentre(L - apogeeAt(parameters, jd), parameters.e));
	};
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

/* The recorded longitudes (deg, from the spring equinox) of Spica, Regulus
   and beta Scorpii. Ptolemy counts from a solstice or an equinox; the
   conversions are in the comments. Dates are those of the sources, in
   astronomical years (-293 = 294 BC), to the day. */
const RECORDS = [
	// Almagest VII 3: Timocharis' occultations, as Ptolemy reduced them
	{
		who: 'Timocharis',
		star: 'Spica',
		jd: Time.julianDay(-293, 3, 9.8),
		lon: 90 + 82 + 1 / 3,
		text: '82 1/3 from the summer solstice (VII 3)'
	},
	{
		who: 'Timocharis',
		star: 'Spica',
		jd: Time.julianDay(-282, 11, 9.1),
		lon: 90 + 82.5,
		text: '82 1/2 from the summer solstice (VII 3)'
	},
	{
		who: 'Timocharis',
		star: 'β Scorpii',
		jd: Time.julianDay(-294, 12, 21.1),
		lon: 180 + 32,
		text: '32 from the autumn equinox (VII 3)'
	},
	// Almagest VII 2 (-128/7); De Rev. III 2 (196 years after Alexander): 29 50' after the summer solstice
	{
		who: 'Hipparchus',
		star: 'Regulus',
		jd: Time.julianDay(-127, 1, 1),
		lon: 90 + 29 + 50 / 60,
		text: '29;50 from the summer solstice (VII 2; De Rev. III 2)'
	},
	// Almagest VII 3: Menelaus' occultations, as Ptolemy reduced them
	{
		who: 'Menelaus',
		star: 'Spica',
		jd: Time.julianDay(98, 1, 11.2),
		lon: 90 + 86.25,
		text: '86 1/4 from the summer solstice (VII 3)'
	},
	{
		who: 'Menelaus',
		star: 'β Scorpii',
		jd: Time.julianDay(98, 1, 14.2),
		lon: 180 + 35 + 55 / 60,
		text: '35;55 from the autumn equinox (VII 3)'
	},
	// Almagest VII 2 (Regulus, 139 Feb 23); the catalogue, epoch Antoninus 1 = 137 Jul 20 (VII 5, VIII 1)
	{
		who: 'Ptolemy',
		star: 'Regulus',
		jd: Time.julianDay(139, 2, 23.8),
		lon: 90 + 32.5,
		text: '32 1/2 from the summer solstice (VII 2)'
	},
	{
		who: 'Ptolemy',
		star: 'Spica',
		jd: Time.julianDay(137, 7, 20),
		lon: 150 + 26 + 2 / 3,
		text: 'Virgo 26 2/3, catalogue (VIII 1)'
	},
	{
		who: 'Ptolemy',
		star: 'β Scorpii',
		jd: Time.julianDay(139, 2, 23.8),
		lon: 180 + 36 + 1 / 3,
		text: '36 1/3 from the autumn equinox (De Rev. III 2)'
	},
	// De Rev. III 2: al-Battani, 1,202 years after Alexander's death (about 880)
	{
		who: 'al-Battani',
		star: 'Regulus',
		jd: Time.julianDay(880, 1, 1),
		lon: 90 + 44 + 5 / 60,
		text: '44;5 from the summer solstice (De Rev. III 2)'
	},
	{
		who: 'al-Battani',
		star: 'β Scorpii',
		jd: Time.julianDay(880, 1, 1),
		lon: 180 + 47 + 50 / 60,
		text: '47;50 from the autumn equinox (De Rev. III 2)'
	},
	// De Rev. III 2: Copernicus at Frombork, Libra 17;14 (1515) and 17;21 (1525)
	{
		who: 'Copernicus',
		star: 'Spica',
		jd: Time.julianDay(1515, 7, 1),
		lon: 180 + 17 + 14 / 60,
		text: 'Libra 17;14 (De Rev. III 2)'
	},
	{
		who: 'Copernicus',
		star: 'Spica',
		jd: Time.julianDay(1525, 7, 1),
		lon: 180 + 17 + 21 / 60,
		text: 'Libra 17;21 (De Rev. III 2)'
	}
];

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
		`${r.who.padEnd(11)} ${year(Time.calendarDate(r.jd).year).padStart(7)}: recorded ${f(r.lon, 2)}° (${r.text}); real ${f(real.lon, 2)}°, recorded - real ${f(r.lon - real.lon, 2)}°`
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
[-293, -128, 139, 1525, 2026].forEach(y => {
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
	const a = ofDate(star('Spica'), jdOf(-128));
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

	/* The uniform model of the page: the star fixed in the ecliptic
	   frame of 2026, the pole of the equator turning about K at the rate p
	   with the obliquity of 2026. */
	const modelFromPole = (name, y) => {
		const e = ofDate(star(name), J2026);
		const lam = e.lon + P * (y - 2026);

		return 90 - asin(sin(e.lat) * cos(EPS_2026) + cos(e.lat) * sin(EPS_2026) * sin(lam));
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
			`${name.padEnd(8)} nearest the pole: real ${year(real.y)}, ${f(real.d, 2)}°; uniform model ${year(model.y)}, ${f(model.d, 2)}°`
		);
	});
	console.log(`Polaris from the pole in 2026: ${f(fromPole('Polaris', J2026), 2)}°`);
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
	`Copernicus (De Rev. III 14), 365;15,24,10 d = ${f(fromSexagesimal(365, 15, 24, 10), 6)} d = ${yearText(fromSexagesimal(365, 15, 24, 10))}`
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
	`p = ${f(P * 3600, 3)}" a year = ${f(P * 100, 4)}° a century, 1° in ${f(1 / P, 2)} years; from Spica alone ${f((norm180(ofDate(star('Spica'), J2026 + 36525 / 2).lon - ofDate(star('Spica'), J2026 - 36525 / 2).lon) * 3600) / 100, 3)}" a year`
);
{
	const copernicus = (23 + 57 / 60) / 1717; // deg per Egyptian year of 365 days (De Rev. III 6)

	console.log(
		`Copernicus' mean precession, 23;57° in 1,717 Egyptian years: ${f((copernicus * 3600 * DAYS_PER_YEAR) / 365, 2)}" a Julian year; his period 25,816 years (360° / rate = ${f(360 / copernicus, 0)})`
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

/* The eccentric of page 2.1 with a moving apogee, through its value of
   2026 at the 2026 equinox (when page 2.1 fitted it). */
const MOVING = Object.assign({}, SolarEccentric.FIT_2026, {
	apogeeRate: Number(APOGEE_RATE.toFixed(3)),
	apogeeEpoch: 2461120.1
});
console.log(
	`MOVING: apogee ${MOVING.apogee}° at JD ${MOVING.apogeeEpoch} (${Time.formatDate(MOVING.apogeeEpoch, { time: true })}), rate ${MOVING.apogeeRate}° a century`
);

/* ==========================================================================
   6. TEST
   ========================================================================== */

title('Test: uniform precession against the real stars, Figure 4 (a)');
{
	const spicaNow = ofDate(star('Spica'), J2026);
	const model = jd => spicaNow.lon + (P * (jd - J2026)) / DAYS_PER_YEAR;

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

title('Test: the Sun with a moving apogee, Figure 4 (b)');
{
	const fixed = SolarEccentric.make(SolarEccentric.FIT_2026);
	const moving = makeSun(MOVING);
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
			apogeeAt(parameters, jd),
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

title("Test: Ptolemy's stars, Figure 5 (records minus real; Ptolemy's Sun minus real)");
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
		`Ptolemy's mean Sun falls behind by ${f(slow, 1)}" a year; the real rate in his time ${f(rateAt(jdOf(0)), 1)}" a year; minus his Sun's ${f(slow, 1)}": ${f(rateAt(jdOf(0)) - slow, 1)}" a year (his 36")`
	);
}
{
	/* Ptolemy's catalogue rule (VII 4): add 1° a century to the positions
	   of AD 137. Spica by that rule, against the real Spica. */
	const catalogue = RECORDS.find(r => r.who === 'Ptolemy' && r.star === 'Spica');
	const rule = y => catalogue.lon + (y - 137.55) / 100;

	[1515, 2026].forEach(y => {
		console.log(
			`Ptolemy's rule for Spica in ${y}: ${f(rule(y), 2)}°, real ${f(ofDate(star('Spica'), jdOf(y)).lon, 2)}°`
		);
	});
}

/* ==========================================================================
   7. RESIDUAL
   ========================================================================== */

title('Residual: the rate changes');
[-128, 139, 880, 1525, 2026, 3000].forEach(y => {
	console.log(`${year(y).padStart(7)}: ${f(rateAt(jdOf(y)), 2)}" a year`);
});

title('Residual: the obliquity');
console.log(
	`Ptolemy 23;51,20 = ${f(fromSexagesimal(23, 51, 20), 4)}°; real ${f(Ephem.meanObliquity(jdOf(-250)), 4)}° (250 BC), ${f(Ephem.meanObliquity(jdOf(139)), 4)}° (AD 139)`
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
		`   real: ${f(realHip, 2)}° -> ${f(realBat, 2)}°, ${f(realBat - realHip, 2)}°: ${f(((realBat - realHip) / span) * 3600, 1)}" a year`
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
		`modern: ${f(Y_TROPICAL, 5)} d and ${f(P * 3600, 2)}" a year -> sidereal ${f(Y_SIDEREAL, 5)} d (see section 4)`
	);
	console.log(
		`Hipparchus and Ptolemy: tropical 365;14,48 = ${f(ptolemyTropical, 5)} d, 1° a century -> sidereal ${f(ptolemySidereal, 5)} d = ${yearText(ptolemySidereal)}`
	);
	console.log(
		`   errors: tropical ${f((ptolemyTropical - Y_TROPICAL) * 1440, 2)} min too long, sidereal ${f((ptolemySidereal - Y_SIDEREAL) * 86400, 0)} s too long`
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
console.log(`Figure 2: one turn of the pole in ${f(360 / P, 0)} years; the year slider runs from 13000 BC to AD 13000`);
{
	const values = RECORDS.map(r => r.lon - ofDate(star(r.star), r.jd).lon);

	console.log(`Figure 5: records minus real from ${f(Math.min(...values), 2)}° to ${f(Math.max(...values), 2)}°`);

	const band = extremes(jd => norm180(ptolemySun(jd) - sunLongitude(jd)), jdOf(-400), jdOf(1600), 5);

	console.log(`   Ptolemy's Sun minus real, 400 BC to AD 1600: ${f(band.low, 2)}° to ${f(band.high, 2)}°`);
}
