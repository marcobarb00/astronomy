/* ==========================================================================
   NUMBERS FOR THE EPILOGUE "BEYOND KEPLER" (tools/numbers/beyond-kepler.js)
   Loads the site's shared code in a Node vm context and prints every
   number the epilogue quotes, in page order, and the bounds of the scale
   of its figure. Historical values that come from the literature, not
   from a computation (Clemence's budget of Mercury's perihelion), are
   printed with their source so that the page has one place to read them.

   Run from the repository root:  node tools/numbers/beyond-kepler.js

   TABLE OF CONTENTS
	 1. Loading the shared code
	 2. Helpers
	 3. After Kepler: where page 4.5 left Mars and the Sun
	 4. The Moon's perigee
	 5. Jupiter and Saturn (the figure)
	 6. The Moon's acceleration and the Earth's clock
	 7. Mercury's perihelion
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
	'shared/models/kepler.js'
]);
const { norm180, Time, Ephem, MeanSun, LunarEpicycle, Kepler } = shared;
const J2000 = 2451545.0;

/* ==========================================================================
   2. HELPERS
   ========================================================================== */

const title = text => console.log(`\n=== ${text} ===`);
const f = (x, digits) => x.toFixed(digits);
const JD = (y, m, d) => Time.julianDay(y, m, d);
const VSOP = { theory: 'vsop87' };

/* The largest error (deg) of a model against a reference. */
function largest(fn, ref, start, end, step) {
	let max = 0;

	for (let jd = start; jd < end; jd += step) {
		max = Math.max(max, Math.abs(norm180(fn(jd) - ref(jd))));
	}

	return max;
}

/* ==========================================================================
   3. AFTER KEPLER: WHERE PAGE 4.5 LEFT MARS AND THE SUN
   ========================================================================== */

title("After Kepler: page 4.5's ellipses against VSOP87");
{
	const mars = largest(Kepler.make(), jd => Ephem.planet('mars', jd, VSOP).lon, JD(2010, 1, 1), JD(2026, 1, 1), 1);
	const sun = largest(Kepler.makeSun(), jd => Ephem.sun(jd, VSOP).lon, JD(2026, 1, 1), JD(2027, 1, 1), 1);

	console.log(`Mars within ${f(mars * 60, 1)}' over 2010 - 2025; the Sun within ${f(sun * 60, 2)}' over 2026`);
}

/* ==========================================================================
   4. THE MOON'S PERIGEE
   The perigee turns at n - n_M (page 3.1's fit); Newton's first-order
   theory gives 3/4 m^2 of a turn per revolution, m = n_sun / n (the ratio
   of the mean motions), about half of it. Newton's own value in the
   Principia (Book I, Proposition 45, Corollary 2): 1°31'28".
   ========================================================================== */

title("The Moon's perigee");
{
	const p = LunarEpicycle.FIT_2026;
	const perRevolution = ((p.n - p.nM) / p.n) * 360;
	const m = MeanSun.MODERN.n / p.n;
	const firstOrder = 0.75 * m * m * 360;
	const newton = 1 + 31 / 60 + 28 / 3600;

	console.log(
		`the perigee advances ${f(perRevolution, 3)}° a revolution, a turn in ${f(360 / (p.n - p.nM) / 365.25, 2)} years`
	);
	console.log(
		`first order (3/4) m^2 = ${f(firstOrder, 3)}° (m = ${f(m, 5)}), ${f(firstOrder / perRevolution, 3)} of it;` +
			` Newton's 1°31'28" = ${f(newton, 3)}°, ${f(newton / perRevolution, 3)} of it`
	);
}

/* ==========================================================================
   5. JUPITER AND SATURN (THE FIGURE)
   The ellipses of the toolbox (Kepler.PLANETS_FIT), fitted to the
   oppositions of 1926 - 2025, against VSOP87 in heliocentric ecliptic
   longitude, both referred to the fixed ecliptic and equinox of J2000:
   the model's longitude of date less the linear precession it uses. Every
   10 years from 1000 BC to AD 3000, the range of the figure.
   ========================================================================== */

title('Jupiter and Saturn: the ellipses fitted to 1926 - 2025, 1000 BC - AD 3000');

/* The heliocentric error (deg) of a planet's ellipse at JD(TT), in the
   frame of J2000. */
function drift(name, jd) {
	const p = Kepler.PLANETS_FIT[name];
	const model = Kepler.state(p, jd).longitude - Kepler.PRECESSION_PER_DAY * (jd - J2000);

	return norm180(model - Ephem.heliocentric(name, jd, Object.assign({ frame: 'J2000' }, VSOP)).lon);
}

/* The error averaged over one turn of the planet, as the figure draws
   it (beyond-kepler/page.js): yearly errors, averaged over the whole
   years of one turn centered on each year. */
function averaged(name) {
	const period = 360 / (Kepler.PLANETS_FIT[name].n - Kepler.PRECESSION_PER_DAY) / 365.25;
	const half = Math.floor(Math.round(period) / 2);
	const raw = new Map();

	for (let year = -999 - half; year <= 3000 + half; year++) {
		raw.set(year, drift(name, JD(year, 1, 1)));
	}

	const out = new Map();

	for (let year = -999; year <= 3000; year++) {
		let sum = 0;

		for (let k = -half; k <= half; k++) {
			sum += raw.get(year + k);
		}

		out.set(year, sum / (2 * half + 1));
	}

	return { out, raw, half };
}

const RANGE = { min: Infinity, max: -Infinity };

['jupiter', 'saturn'].forEach(name => {
	const { out, raw, half } = averaged(name);
	const at = year => out.get(year);
	let rawMax = 0;

	out.forEach(v => {
		RANGE.min = Math.min(RANGE.min, v);
		RANGE.max = Math.max(RANGE.max, v);
	});
	raw.forEach(v => {
		rawMax = Math.max(rawMax, Math.abs(v));
	});

	console.log(
		`${name} (averaged over ${2 * half + 1} years): 1000 BC ${f(at(-999), 2)}°, AD 1 ${f(at(1), 2)}°,` +
			` 1000 ${f(at(1000), 2)}°, 2000 ${f(at(2000), 2)}°, 3000 ${f(at(3000), 2)}°; unaveraged up to ${f(rawMax, 2)}°`
	);

	let fitSpan = 0;

	for (let year = 1926; year <= 2025; year++) {
		fitSpan = Math.max(fitSpan, Math.abs(raw.get(year)));
	}

	console.log(`  within 1926 - 2025 (each 1 January): ${f(fitSpan * 60, 1)}'`);
});
console.log(
	`the averaged drift runs from ${f(RANGE.min, 2)}° to ${f(RANGE.max, 2)}°: the figure's scale runs from -15° to +7°`
);
{
	const pj = 360 / (Kepler.PLANETS_FIT.jupiter.n - Kepler.PRECESSION_PER_DAY);
	const ps = 360 / (Kepler.PLANETS_FIT.saturn.n - Kepler.PRECESSION_PER_DAY);

	console.log(
		`sidereal periods: Jupiter ${f(pj / 365.25, 3)} years, Saturn ${f(ps / 365.25, 3)} years; ratio ${f(ps / pj, 4)} (5 : 2 = 2.5)`
	);
	console.log(
		`five turns of Jupiter ${f((5 * pj) / 365.25, 1)} years, two of Saturn ${f((2 * ps) / 365.25, 1)} years`
	);
}

/* ==========================================================================
   6. THE MOON'S ACCELERATION AND THE EARTH'S CLOCK
   ========================================================================== */

title('The Earth as a clock: Delta T (shared/time.js), as page 1.3 quotes it');
[2026, 140, -720].forEach(year => {
	const jd = JD(year, 1, 1);
	const dt = (Time.ttFromUt(jd) - jd) * 24;

	console.log(`${year < 1 ? `${1 - year} BC` : `AD ${year}`}: Delta T = ${f(dt, 2)} h = ${f(dt * 3600, 0)} s`);
});

/* ==========================================================================
   7. MERCURY'S PERIHELION
   The advance of a perihelion in general relativity, per revolution:
   6 pi G M / (c^2 a (1 - e^2)), with Mercury's ellipse of the toolbox.
   ========================================================================== */

title("Mercury's perihelion");
{
	const GM = 1.32712440018e20; // m^3 / s^2, the Sun (IAU 2009)
	const C = 299792458; // m / s
	const AU = 149597870700; // m
	const p = Kepler.PLANETS_FIT.mercury;
	const perRevolution = (6 * Math.PI * GM) / (C * C * p.a * AU * (1 - p.e * p.e));
	const period = 360 / (p.n - Kepler.PRECESSION_PER_DAY);
	const perCentury = perRevolution * (36525 / period) * (180 / Math.PI) * 3600;

	console.log(
		`general relativity: ${f(perCentury, 2)}" a century (a = ${p.a} au, e = ${p.e}, P = ${f(period, 3)} d)`
	);
	console.log('G. M. Clemence, Rev. Mod. Phys. 19, 361 (1947), the budget in a century:');
	console.log('  observed 5599.74", the general precession 5025.64", the planets 531.54" (with the Sun\'s');
	console.log('  oblateness), the sum 5557.18", left over 42.56" +- 0.94"; relativity 43.03"');
	console.log(
		`  (page 2.3's precession: ${f(shared.Precession.MODERN.rate * 3600 * 100, 1)}" a century; Le Verrier 1859: 38"; Newcomb 1882: 43")`
	);
}
