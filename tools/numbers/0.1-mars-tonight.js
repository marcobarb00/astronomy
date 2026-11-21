/* ==========================================================================
   NUMBERS FOR PAGE 0.1 · PTOLEMY'S MARS TONIGHT (tools/numbers/0.1-mars-tonight.js)
   Loads the site's shared code in a Node vm context and prints every
   number the page quotes, in page order, and the bounds of the scales of
   its figures. Ptolemy's Mars is page 4.2's model with the Almagest's
   parameters (PlanetEquant.PTOLEMY); the real Mars is the reference sky
   (shared/ephemeris.js), and, for the ladder of Figure 3, VSOP87, as on
   page 4.5.

   The example date is the one the smoke test gives the browser
   (tools/check/smoke.js, FIXED_NOW): 20 November 2026, 21:00 UT, so the
   prose and the read-outs it records agree.

   Run from the repository root:  node tools/numbers/0.1-mars-tonight.js

   TABLE OF CONTENTS
	 1. Loading the shared code
	 2. Helpers
	 3. Lead and Figure 1: Mars on 20 November 2026
	 4. Figure 2: nineteen centuries of error
	 5. Where the error comes from: the year and the swing
	 6. Figure 3: the models of the course
	 7. The scales of the figures
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
	'shared/stars.js',
	'shared/plate-stars.js',
	'shared/models/mean-sun.js',
	'shared/models/precession.js',
	'shared/models/solar-eccentric.js',
	'shared/models/planet-epicycle.js',
	'shared/models/planet-equant.js',
	'shared/models/planet-arrangement.js',
	'shared/models/kepler.js'
]);
const { norm180, norm360, Time, Ephem, Stars, MeanSun, PlanetEpicycle, PlanetEquant, PlanetArrangement, Kepler } =
	shared;
const PLATE_STARS = shared.PLATE_STARS;
const { PTOLEMY } = PlanetEquant;

/* ==========================================================================
   2. HELPERS
   ========================================================================== */

const title = text => console.log(`\n=== ${text} ===`);
const f = (x, digits) => x.toFixed(digits);
const JD = (y, m, d) => Time.julianDay(y, m, d);
const date = jd => Time.formatDate(jd);

/* Ptolemy's Mars, and the real one (apparent ecliptic longitude of date). */
const ptolemy = PlanetEquant.make(PTOLEMY);
const real = jd => Ephem.longitude('mars', jd);
const error = jd => norm180(ptolemy(jd) - real(jd));

/* The error over [start, end), every 'step' days: its smallest and
   largest value and its mean (deg). */
function errorRange(fn, start, end, step) {
	let low = Infinity;
	let high = -Infinity;
	let sum = 0;
	let count = 0;

	for (let jd = start; jd < end; jd += step) {
		const d = fn(jd);

		low = Math.min(low, d);
		high = Math.max(high, d);
		sum += d;
		count += 1;
	}

	return { low, high, mean: sum / count };
}

/* Ptolemy's mean Sun less the modern mean Sun (page 1.3's fit) (deg). */
const sunLag = jd => norm180(MeanSun.meanLongitude(MeanSun.PTOLEMY, jd) - MeanSun.meanLongitude(MeanSun.MODERN, jd));

/* Ptolemy's mean longitude of Mars less the reference's mean longitude
   of date (Standish's mean elements, a check, as on page 4.2) (deg). */
const reference = PlanetEpicycle.meanOfDate('mars');
const marsLag = jd =>
	norm180(PlanetEquant.state(PTOLEMY, jd).meanLongitude - (reference.L0 + reference.n * (jd - 2451545.0)));

/* Ecliptic longitude and latitude of date of a star (deg). */
function starEcliptic(star, jdTT) {
	const eq = Stars.ofDate(star, jdTT);

	return Ephem.equatorialToEcliptic(eq.ra, eq.dec, Ephem.meanObliquity(jdTT));
}

/* ==========================================================================
   3. LEAD AND FIGURE 1: MARS ON 20 NOVEMBER 2026
   ========================================================================== */

const EXAMPLE_UT = Time.fromDate(new Date('2026-11-20T21:00:00Z'));
const EXAMPLE = Time.ttFromUt(EXAMPLE_UT);

title('Lead and Figure 1: Mars on 20 November 2026, 21:00 UT');
{
	const mars = Ephem.planet('mars', EXAMPLE);
	const sun = Ephem.longitude('sun', EXAMPLE);
	const regulus = starEcliptic(Stars.find('Regulus'), EXAMPLE);

	console.log(`real Mars: ecliptic longitude ${f(mars.lon, 2)}°, ecliptic latitude ${f(mars.lat, 2)}°`);
	console.log(`Ptolemy's Mars: ecliptic longitude ${f(ptolemy(EXAMPLE), 2)}°`);
	console.log(`difference (Ptolemy - real): ${f(error(EXAMPLE), 2)}°`);
	console.log(`the Sun: ${f(sun, 2)}°; Mars - Sun ${f(norm180(mars.lon - sun), 1)}°`);
	console.log(`Regulus: ecliptic longitude ${f(regulus.lon, 2)}°, latitude ${f(regulus.lat, 2)}°`);

	// the stars near each Mars (brighter than magnitude 4, within 10° of the ecliptic)
	const near = lon =>
		PLATE_STARS.map(star => Object.assign({ id: star.id, mag: star.mag }, starEcliptic(star, EXAMPLE)))
			.filter(s => s.mag < 4 && Math.abs(s.lat) < 10 && Math.abs(norm180(s.lon - lon)) < 6)
			.sort((a, b) => Math.abs(norm180(a.lon - lon)) - Math.abs(norm180(b.lon - lon)))
			.slice(0, 4)
			.map(s => `${s.id} (λ ${f(s.lon, 1)}°, β ${f(s.lat, 1)}°, mag ${s.mag})`)
			.join(', ');

	console.log(`near the real Mars: ${near(mars.lon)}`);
	console.log(`near Ptolemy's Mars: ${near(ptolemy(EXAMPLE))}`);
}

title("Ptolemy's epoch, and the years since his observations");
{
	console.log(`epoch: ${date(MeanSun.PTOLEMY.epoch)} (JD ${f(MeanSun.PTOLEMY.epoch, 3)}, UT)`);
	console.log(`his oppositions of Mars: AD 130 - 139; years from AD 138 to 2026: ${2026 - 138}`);
}

/* ==========================================================================
   4. FIGURE 2: NINETEEN CENTURIES OF ERROR
   ========================================================================== */

title("Figure 2: the error of Ptolemy's Mars (Ptolemy - real)");
{
	const spans = [
		[130, 140],
		[1000, 1010],
		[1500, 1510],
		[2016, 2036]
	];

	spans.forEach(([a, b]) => {
		const r = errorRange(error, JD(a, 1, 1), JD(b, 1, 1), 2);

		console.log(`AD ${a} - ${b}: from ${f(r.low, 2)}° to ${f(r.high, 2)}°, on average ${f(r.mean, 2)}°`);
	});
}

/* ==========================================================================
   5. WHERE THE ERROR COMES FROM: THE YEAR AND THE SWING
   ========================================================================== */

title('The drift: his mean Sun and his mean Mars, behind the modern ones');
{
	[JD(138, 1, 1), JD(1000, 1, 1), JD(2026, 1, 1)].forEach(jd => {
		console.log(`${date(jd)}: his mean Sun ${f(sunLag(jd), 2)}°, his mean Mars ${f(marsLag(jd), 2)}°`);
	});
	console.log(`at his epoch (${date(MeanSun.PTOLEMY.epoch)}): his mean Sun ${f(sunLag(MeanSun.PTOLEMY.epoch), 2)}°`);
}

title('His year');
{
	const his = MeanSun.yearLength(MeanSun.PTOLEMY);
	const modern = MeanSun.yearLength(MeanSun.MODERN);
	const perCentury = (MeanSun.MODERN.n - MeanSun.PTOLEMY.n) * 36525;

	console.log(`his year ${f(his, 6)} d (365;14,48 = ${f(365 + 14 / 60 + 48 / 3600, 6)}), modern ${f(modern, 7)} d`);
	console.log(
		`longer by ${f((his - modern) * 1440, 2)} min; his mean Sun falls behind ${f(perCentury, 3)}° a century`
	);
	console.log(
		`from AD 138 to 2026: ${f((perCentury * (2026 - 138)) / 100, 2)}° (check: lag 2026 - lag 138 = ${f(sunLag(JD(2026, 1, 1)) - sunLag(JD(138, 1, 1)), 2)}°)`
	);
}

title("His mean motion in anomaly against the modern one (Mars' synodic motion)");
{
	const his = PlanetEpicycle.PTOLEMY.mars;
	const synodicHis = 360 / his.nMu;
	const modernMu = MeanSun.MODERN.n - reference.n;
	const drift = (his.nMu - modernMu) * (JD(2026, 1, 1) - JD(138, 1, 1));

	console.log(`his synodic period ${f(synodicHis, 3)} d, modern ${f(360 / modernMu, 3)} d`);
	console.log(`his anomaly drifts ${f(drift, 2)}° from AD 138 to 2026`);
}

title('The swing: the error less the lag of his mean Sun');
{
	const swing = jd => error(jd) - sunLag(jd);

	[
		[130, 140],
		[2016, 2036]
	].forEach(([a, b]) => {
		const r = errorRange(swing, JD(a, 1, 1), JD(b, 1, 1), 2);

		console.log(`AD ${a} - ${b}: from ${f(r.low, 2)}° to ${f(r.high, 2)}°`);
	});
}

/* The apogee of his eccentric: it moves at his rate of precession, fixed
   among his stars (IX 5); page 4.2's fit, at the modern rate. */
title('His apogee');
{
	const at = (p, y) => PlanetEquant.apogeeAt(p, JD(y, 1, 1));

	console.log(
		`his apogee moves ${f(PTOLEMY.apogeeRate * 36525, 3)}° a century, the modern precession ${f(PlanetEquant.PRECESSION_PER_DAY * 36525, 3)}°`
	);
	console.log(
		`in 2026: his apogee ${f(at(PTOLEMY, 2026), 1)}°, page 4.2's fit ${f(at(PlanetEquant.MARS_FIT, 2026), 1)}°, behind by ${f(at(PlanetEquant.MARS_FIT, 2026) - at(PTOLEMY, 2026), 1)}°`
	);
	console.log(
		`in AD 138: his apogee ${f(at(PTOLEMY, 138), 1)}°, page 4.2's fit carried back ${f(at(PlanetEquant.MARS_FIT, 138), 1)}°`
	);
}

/* The real aphelion of Mars, the direction Ptolemy's apogee stands for:
   Standish's longitude of perihelion (J2000 ecliptic, Table 1 of
   ephemeris.js) plus 180°, carried to the equinox of date by the modern
   precession of page 2.3. Its motion among the stars is Standish's rate. */
title("Mars' real aphelion against Ptolemy's apogee");
{
	const varpi = -23.91744784;
	const varpiRate = 0.45223625; // deg a century
	const precession = shared.Precession.MODERN.rate * 100; // deg a century
	const aphelion = y => {
		const T = (JD(y, 1, 1) - 2451545.0) / 36525;

		return varpi + 180 + (varpiRate + precession) * T;
	};

	console.log(
		`the apsidal line turns ${f(varpiRate, 2)}° a century among the stars; with precession ${f(varpiRate + precession, 2)}°`
	);
	[138, 2026].forEach(y => {
		const his = PlanetEquant.apogeeAt(PTOLEMY, JD(y, 1, 1));

		console.log(
			`${y}: real aphelion ${f(aphelion(y), 1)}°, his apogee ${f(his, 1)}°, behind by ${f(aphelion(y) - his, 1)}°`
		);
	});
}

/* The mean anomaly, the angle of Ptolemy's mean Mars from his apogee,
   against the real one: the reference's mean longitude of date less the
   real aphelion of date (as above). */
title("The mean anomaly: Ptolemy's against the real one");
{
	const T = y => (JD(y, 1, 1) - 2451545.0) / 36525;
	const aphelion = y => -23.91744784 + 180 + (0.45223625 + shared.Precession.MODERN.rate * 100) * T(y);

	[139, 2026].forEach(y => {
		const jd = JD(y, 1, 1);
		const his = PlanetEquant.state(PTOLEMY, jd).M;
		const realM = norm360(reference.L0 + reference.n * (jd - 2451545.0) - aphelion(y));

		console.log(`${y}: his M ${f(his, 2)}°, real ${f(realM, 2)}°, his less real ${f(norm180(his - realM), 2)}°`);
	});
}

/* Tonight (the example moment): the lag of his mean Sun against the
   whole error. */
title('Tonight: the lag of his mean Sun and the rest');
{
	console.log(
		`error ${f(error(EXAMPLE), 2)}°, lag of his mean Sun ${f(sunLag(EXAMPLE), 2)}°, the rest ${f(error(EXAMPLE) - sunLag(EXAMPLE), 2)}°`
	);
}

/* Page 4.2's fit against this page's reference (Standish), 2010 - 2025
   and 1926 - 2126 (page 4.2 quotes 0.9° and "about a degree"). */
title("Page 4.2's equant against the reference sky");
{
	const fit = PlanetEquant.make(PlanetEquant.MARS_FIT);
	const e = jd => norm180(fit(jd) - real(jd));
	const a = errorRange(e, JD(2010, 1, 1), JD(2026, 1, 1), 1);
	const b = errorRange(e, JD(1926, 1, 1), JD(2126, 1, 1), 2);

	console.log(`2010 - 2025: ${f(a.low, 3)}° to ${f(a.high, 3)}°; 1926 - 2126: ${f(b.low, 3)}° to ${f(b.high, 3)}°`);
}

/* Near opposition the planet is on the near side of the epicycle, at
   distance rho - r from the Earth: a turn delta of the epicycle's center,
   a sideways step rho delta, turns the planet's direction by rho delta /
   (rho - r). */
title('The magnification at opposition, rho / (rho - r)');
{
	const r = PTOLEMY.r;

	[1 - PTOLEMY.e, 1, 1 + PTOLEMY.e].forEach(rho => {
		console.log(`rho ${f(rho, 2)}: ${f(rho / (rho - r), 2)}`);
	});
}

/* ==========================================================================
   6. FIGURE 3: THE MODELS OF THE COURSE
   The largest error over 2010 - 2025 every day against VSOP87, the rows
   of page 4.5's Figure 6 for Mars, with Ptolemy's own model first.
   ========================================================================== */

title('Figure 3: the largest error of each model of Mars, 2010 - 2025, against VSOP87');
{
	const vsop = jd => Ephem.longitude('mars', jd, { theory: 'vsop87' });
	const rows = [
		['Almagest', ptolemy],
		['4.1 uniform', PlanetEpicycle.makeUniform(PlanetEpicycle.MARS_FIT)],
		['4.1 epicycle', PlanetEpicycle.make(PlanetEpicycle.MARS_FIT)],
		['4.2 equant', PlanetEquant.make(PlanetEquant.MARS_FIT)],
		['4.3 epicyclet', PlanetArrangement.makeEpicyclet()],
		['4.5 ellipses', Kepler.make()]
	];
	const worst = rows.map(() => 0);

	for (let jd = JD(2010, 1, 1); jd < JD(2026, 1, 1); jd += 1) {
		const ref = vsop(jd);

		rows.forEach(([, fn], i) => {
			worst[i] = Math.max(worst[i], Math.abs(norm180(fn(jd) - ref)));
		});
	}

	rows.forEach(([name], i) => {
		console.log(`${name}: ${f(worst[i], 3)}° = ${f(worst[i] * 60, 1)}′`);
	});
}

/* ==========================================================================
   7. THE SCALES OF THE FIGURES
   ========================================================================== */

title('Scales');
{
	// Figure 2: the error over each view, with a margin; Figure 1 is drawn
	// for the date of the visit, so its strip must hold the two places
	// whatever the date: their largest separation over AD 2000 - 3000
	const long = errorRange(error, JD(100, 1, 1), JD(2100, 1, 1), 2);
	const short = errorRange(error, JD(2016, 1, 1), JD(2036, 1, 1), 1);
	const later = errorRange(error, JD(2000, 1, 1), JD(3000, 1, 1), 2);
	const lat = errorRange(jd => Ephem.planet('mars', jd).lat, JD(2000, 1, 1), JD(3000, 1, 1), 2);

	console.log(`Figure 2, AD 100 - 2100: from ${f(long.low, 2)}° to ${f(long.high, 2)}°`);
	console.log(`Figure 2, AD 2016 - 2036: from ${f(short.low, 2)}° to ${f(short.high, 2)}°`);
	console.log(`Figure 1, AD 2000 - 3000: the difference from ${f(later.low, 2)}° to ${f(later.high, 2)}°`);
	console.log(`Figure 1, AD 2000 - 3000: Mars' ecliptic latitude from ${f(lat.low, 2)}° to ${f(lat.high, 2)}°`);
}
