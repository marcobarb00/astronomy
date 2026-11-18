/* ==========================================================================
   NUMBERS FOR PAGE 4.4 "WHAT MOVES?" (tools/numbers/4.4-what-moves.js)
   Loads the site's shared code (common, time, ephemeris, stars and the
   models mean-sun.js, precession.js, planet-epicycle.js,
   planet-equant.js and planet-arrangement.js) in a Node vm context and
   prints every number quoted on the page, in page order.

   Run from the repository root:  node tools/numbers/4.4-what-moves.js
   (about half a minute: it finds forty years of Venus' greatest
   elongations and follows Mars over two centuries)

   The real Venus is the reference sky's: its phase and apparent diameter
   from Ephem.phase (Meeus 41.1, 41.2), its elongation from apparent
   positions. 61 Cygni is Stars.find('61 Cygni'), with the parallax that
   SIMBAD gives (Gaia DR3), tools/numbers/data/stars-4.4-2026-11-17.csv.

   TABLE OF CONTENTS
	 1. Loading the shared code
	 2. Helpers
	 3. Observation: Venus over one synodic period
	 4. Model
	 5. Fit
	 6. Test
	 7. Exercises
	 8. The scales of the figures
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
	'shared/stars.js',
	'shared/models/mean-sun.js',
	'shared/models/precession.js',
	'shared/models/planet-epicycle.js',
	'shared/models/planet-equant.js',
	'shared/models/planet-arrangement.js'
]);
const { norm180, sin, cos, asin, atan2d, Time, Ephem, Stars, PlanetEpicycle, PlanetArrangement } = shared;
const { FIT, VENUS_FIT, ORDERS, NESTED } = PlanetArrangement;
const R2D = 180 / Math.PI;
const ARCSEC_PER_RADIAN = 3600 * R2D;
const AU_PER_LIGHT_YEAR = 63241.077;

/* ==========================================================================
   2. HELPERS
   ========================================================================== */

const title = text => console.log(`\n=== ${text} ===`);
const f = (x, digits) => x.toFixed(digits);
const mean = list => list.reduce((a, b) => a + b, 0) / list.length;
const JD = (y, m, d) => Time.julianDay(y, m, d);
const date = jd => Time.formatDate(jd);

/* Root of fn in [a, b] by bisection (signs of fn(a), fn(b) opposite). */
function bisect(fn, a, b, steps = 50) {
	let fa = fn(a);

	for (let i = 0; i < steps; i++) {
		const m = (a + b) / 2;
		const fm = fn(m);

		if (fa * fm <= 0) {
			b = m;
		} else {
			a = m;
			fa = fm;
		}
	}

	return (a + b) / 2;
}

/* Every root of fn in [start, end], from a scan every 'step' days. */
function roots(fn, start, end, step) {
	const found = [];
	let f0 = fn(start);

	for (let t = start + step; t <= end; t += step) {
		const f1 = fn(t);

		if (f0 * f1 <= 0 && Math.abs(f1 - f0) < 90) {
			found.push(bisect(fn, t - step, t, 40));
		}

		f0 = f1;
	}

	return found;
}

/* The elongation of Venus from the true Sun (deg, east positive). */
const elongation = (jd, apparent = true) =>
	norm180(Ephem.planet('venus', jd, { apparent }).lon - Ephem.sun(jd, { apparent }).lon);

/* The real Venus at jd: { elongation, k, chi, diameter (″) }. */
function realVenus(jd) {
	const p = Ephem.phase('venus', jd);

	return { elongation: elongation(jd), k: p.k, chi: p.phaseAngle, diameter: p.diameter };
}

/* The greatest elongations of Venus in [start, end]: [{ jd, e }]. */
function greatestElongations(start, end) {
	const change = (jd, apparent) =>
		Math.abs(elongation(jd + 0.05, apparent)) - Math.abs(elongation(jd - 0.05, apparent));
	const scan = roots(jd => change(jd, false), start, end, 1).filter(
		jd => Math.abs(elongation(jd, false)) > 12 && change(jd - 2, false) > 0
	);

	return scan.map(jd => {
		const t = bisect(x => change(x, true), jd - 1, jd + 1, 40);

		return { jd: t, e: elongation(t) };
	});
}

/* The illuminated fraction at greatest elongation for the order 'ratio'
   (O sun / OK) and the radius r: the line of sight touches the epicycle
   at P = (1 - r^2, r sqrt(1 - r^2)), the Sun on the x axis. */
function kAtGreatest(ratio, r) {
	const c = Math.sqrt(1 - r * r);

	return PlanetArrangement.phaseAt([c * c, r * c], [ratio, 0]).k;
}

/* The fullest phase of Venus in an order, for the radius r: the epicycle
   scanned every 0.01° of anomaly, K at (1, 0). */
function fullest(ratio, r) {
	let best = { k: -1, elongation: 0 };

	for (let theta = 0; theta < 360; theta += 0.01) {
		const P = [1 + r * cos(theta), r * sin(theta)];
		const p = PlanetArrangement.phaseAt(P, [ratio, 0]);

		if (p.k > best.k) {
			best = p;
		}
	}

	return best;
}

/* ==========================================================================
   3. OBSERVATION: VENUS OVER ONE SYNODIC PERIOD
   From the superior conjunction of June 2024 to that of January 2026.
   ========================================================================== */

const SPAN_START = JD(2024, 5, 20);
const SPAN_END = JD(2026, 1, 20);
const CONJUNCTIONS = roots(jd => elongation(jd, false), SPAN_START, SPAN_END, 1).map(jd =>
	bisect(t => elongation(t), jd - 1, jd + 1, 40)
);
const GREATEST_SPAN = greatestElongations(SPAN_START, SPAN_END);

title('Observation: the conjunctions and greatest elongations of Venus, 2024 - 2026');
CONJUNCTIONS.forEach(jd => {
	const v = realVenus(jd);

	console.log(
		`${v.chi > 90 ? 'inferior' : 'superior'} conjunction ${date(jd)}: k = ${f(v.k, 3)}, diameter ${f(v.diameter, 1)}″`
	);
});
GREATEST_SPAN.forEach(g => {
	const v = realVenus(g.jd);

	console.log(`greatest elongation ${date(g.jd)}: ${f(g.e, 2)}°, k = ${f(v.k, 3)}, diameter ${f(v.diameter, 1)}″`);
});

title('Observation: the apparent diameter over the synodic period');
const DIAMETERS = {};
{
	let least = { d: Infinity };
	let most = { d: 0 };

	for (let jd = CONJUNCTIONS[0]; jd <= CONJUNCTIONS[2]; jd += 0.25) {
		const d = Ephem.phase('venus', jd).diameter;

		if (d < least.d) {
			least = { d, jd };
		}

		if (d > most.d) {
			most = { d, jd };
		}
	}

	DIAMETERS.ratio = most.d / least.d;
	console.log(
		`from ${f(least.d, 1)}″ (${date(least.jd)}) to ${f(most.d, 1)}″ (${date(most.jd)}), ${f(DIAMETERS.ratio, 2)} times`
	);
	console.log(`the disk's area: ${f(DIAMETERS.ratio ** 2, 1)} times (Galileo's "40 times", Il Saggiatore p. 217)`);
}

title('Observation: Figure 1, the twelve dates');
const FIGURE_1_DATES = [
	[2024, 6, 4],
	[2024, 9, 15],
	[2024, 11, 20],
	[2025, 1, 10],
	[2025, 2, 15],
	[2025, 3, 12],
	[2025, 4, 3],
	[2025, 4, 25],
	[2025, 5, 31],
	[2025, 8, 15],
	[2025, 10, 25],
	[2026, 1, 6]
];
FIGURE_1_DATES.forEach(([y, m, d]) => {
	const v = realVenus(JD(y, m, d));

	console.log(
		`${date(JD(y, m, d)).padEnd(12)} elongation ${f(v.elongation, 1).padStart(6)}°, k = ${f(v.k, 2)}, diameter ${f(v.diameter, 1)}″`
	);
});

/* ==========================================================================
   4. MODEL
   ========================================================================== */

title("Model: Tycho's system against Copernicus' and page 4.2's Ptolemy, Mars, 1926 - 2125");
{
	let againstCopernicus = 0;
	let againstPtolemy = 0;

	for (let jd = JD(1926, 1, 1); jd < JD(2126, 1, 1); jd += 1) {
		const m = PlanetArrangement.moment('mars', jd);
		const T = m.tychonic;
		const tycho = atan2d(T.P[1] - T.O[1], T.P[0] - T.O[0]);
		const ptolemy = atan2d(m.geostatic.P[1], m.geostatic.P[0]);

		againstCopernicus = Math.max(againstCopernicus, Math.abs(norm180(tycho - m.lambda)));
		againstPtolemy = Math.max(againstPtolemy, Math.abs(norm180(tycho - ptolemy)));
	}

	console.log(`Tycho less Copernicus: at most ${againstCopernicus.toExponential(1)}°`);
	console.log(`Tycho less page 4.2's model (Ptolemy's description): at most ${againstPtolemy.toExponential(1)}°`);
}

title('Model: Mars at its oppositions of 2010 - 2025, nearer than the Sun');
{
	// the oppositions of the real Mars (elongation 180°), and its distance
	// from the Earth then, against the Sun's
	const elongationOf = jd =>
		norm180(Ephem.planet('mars', jd, { apparent: false }).lon - Ephem.sun(jd, { apparent: false }).lon - 180);
	const oppositions = roots(elongationOf, JD(2010, 1, 1), JD(2026, 1, 1), 3);
	const real = oppositions.map(jd => Ephem.planet('mars', jd).dist);
	const model = oppositions.map(jd => PlanetArrangement.makeDistance('mars')(jd));

	console.log(
		`${oppositions.length} oppositions: the real Mars ${f(Math.min(...real), 2)} to ${f(Math.max(...real), 2)} au from the Earth, page 4.2's model ${f(Math.min(...model), 2)} to ${f(Math.max(...model), 2)} au; the Sun about 1 au`
	);
	console.log(`Mars' circle about the Sun ${f(FIT.mars.a, 3)} au`);
}

title("Test: page 4.2's Mars (the same in Tycho's and Copernicus' systems), 2010 - 2025");
{
	const model = PlanetArrangement.make('mars');
	let worst = 0;

	for (let jd = JD(2010, 1, 1); jd < JD(2026, 1, 1); jd += 1) {
		worst = Math.max(worst, Math.abs(norm180(model(jd) - Ephem.position('mars', jd).lon)));
	}

	console.log(`largest error ${f(worst, 2)}°`);
}

title('Model: the three orders of Venus (page 4.3: OK = 1, r = the epicycle)');
{
	const r = VENUS_FIT.r;

	console.log(
		`r = ${f(r, 4)}; below the Sun needs O☉ > (1 + r) OK = ${f(1 + r, 3)} OK, above O☉ < (1 - r) OK = ${f(1 - r, 3)} OK`
	);
	console.log(
		`the nested spheres: Venus' farthest point at the Sun's least distance, ${NESTED.sunLeast} earth radii (De Rev. I 10), the Sun at its mean, ${NESTED.sunMean} (Almagest V 15): O☉ = (1 + r) ${NESTED.sunMean} / ${NESTED.sunLeast} = ${f(ORDERS.below, 3)} OK`
	);
	console.log(`the order above the Sun drawn with O☉ = ${f(ORDERS.above, 1)} OK`);
	console.log(`greatest to least distance in every order: (1 + r) / (1 - r) = ${f((1 + r) / (1 - r), 2)}`);
	console.log(
		`k at greatest elongation: below ${f(kAtGreatest(ORDERS.below, r), 3)}, around ${f(kAtGreatest(1, r), 3)}, above ${f(kAtGreatest(ORDERS.above, r), 3)}`
	);
	console.log(
		`fullest Venus: below ${f(fullest(ORDERS.below, r).k, 3)}; least lit: above ${f(1 - fullest(1 / ORDERS.above, r).k, 3)} (not used)`
	);
}

title('Model: parallax and aberration of 61 Cygni');
const CYGNI = Stars.find('61 Cygni');
const PARALLAX = CYGNI.plx / 1000;
{
	const jd = JD(2026, 1, 1);
	const p = Stars.atEpoch(CYGNI, jd);
	const eq = Ephem.precessEquatorial(p.ra, p.dec, Time.J2000, jd);
	const ecl = Ephem.equatorialToEcliptic(eq.ra, eq.dec, Ephem.meanObliquity(jd));

	console.log(
		`61 Cygni A: ecliptic longitude ${f(ecl.lon, 2)}°, ecliptic latitude ${f(ecl.lat, 2)}° (of date, 2026)`
	);
	console.log(
		`parallax ${f(PARALLAX, 5)}″: the ellipse's half-axes ${f(PARALLAX, 3)}″ along the ecliptic, ${f(PARALLAX * sin(ecl.lat), 3)}″ across`
	);
	console.log(`the aberration constant ${f(20.49552, 2)}″, ${f(20.49552 / PARALLAX, 0)} times the parallax`);
	console.log(`proper motion ${f(Math.hypot(CYGNI.pmra, CYGNI.pmdec) / 1000, 2)}″ a year`);
}

/* ==========================================================================
   5. FIT
   ========================================================================== */

title('Fit: the order of Venus from its phase at the greatest elongations of 1986 - 2025');
const GREATEST = greatestElongations(JD(1986, 1, 1), JD(2026, 1, 1));
const FITTED = {};
{
	const r = VENUS_FIT.r;
	const ks = GREATEST.map(g => Ephem.phase('venus', g.jd).k);
	const ratios = ks.map(k => bisect(ratio => kAtGreatest(ratio, r) - k, 0.3, 1.7, 60));
	const slope = (kAtGreatest(1.001, r) - kAtGreatest(0.999, r)) / 0.002;

	FITTED.ratio = mean(ratios);
	console.log(`dk / d(O☉/OK) at O☉ = OK: ${f(slope, 3)}`);
	console.log(
		`${GREATEST.length} greatest elongations; k from ${f(Math.min(...ks), 3)} to ${f(Math.max(...ks), 3)}, mean ${f(mean(ks), 4)}`
	);
	console.log(
		`O☉ / OK from each: ${f(Math.min(...ratios), 3)} to ${f(Math.max(...ratios), 3)}; mean ${f(FITTED.ratio, 4)}`
	);
}

title('Fit: the distance of the stars from a missing or a measured parallax');
{
	// Tycho's limit (Graney): the whole yearly shift, across the Earth's
	// orbit (2 au), no more than 1′, so the parallax under half a minute
	const oneMinute = 1 / 60 / R2D;
	const beyond = 2 / oneMinute;

	console.log(
		`a yearly shift under 1′ (ϖ under 0.5′): the stars beyond ${f(beyond, 0)} au, ${f(beyond / FIT.saturn.a, 0)} times Saturn's ${f(FIT.saturn.a, 2)} au (page 4.3)`
	);
	console.log(
		`61 Cygni: ${f(PARALLAX, 5)}″ -> ${f(ARCSEC_PER_RADIAN / PARALLAX, 0)} au, ${f(ARCSEC_PER_RADIAN / PARALLAX / AU_PER_LIGHT_YEAR, 2)} light years`
	);
	console.log(
		`Bessel's 0.3136″ (1838): ${f(ARCSEC_PER_RADIAN / 0.3136 / AU_PER_LIGHT_YEAR, 2)} light years; his parallax ${f(100 * (0.3136 / PARALLAX - 1), 0)}% above today's`
	);
}

/* ==========================================================================
   6. TEST
   ========================================================================== */

title('Test: the phase of Venus over 2026 - 2033 in each order, against the real Venus');
const TEST_START = JD(2026, 1, 1);
const TEST_END = JD(2034, 1, 1);
const TEST = {};
{
	const orders = { fitted: FITTED.ratio, around: ORDERS.around, below: ORDERS.below, above: ORDERS.above };

	Object.entries(orders).forEach(([name, ratio]) => {
		let worst = { d: 0 };

		for (let jd = TEST_START; jd < TEST_END; jd += 1) {
			const d = PlanetArrangement.venusPhase(jd, ratio).k - Ephem.phase('venus', jd).k;

			if (Math.abs(d) > Math.abs(worst.d)) {
				worst = { d, jd };
			}
		}

		TEST[name] = worst.d;
		console.log(`${name.padEnd(7)} O☉ = ${f(ratio, 4)} OK: largest Δk ${f(worst.d, 3)} on ${date(worst.jd)}`);
	});

	// the apparent diameter, the order around the Sun, OK = 1 au
	let worst = 0;

	for (let jd = TEST_START; jd < TEST_END; jd += 1) {
		const model = PlanetArrangement.venusPhase(jd, 1).distance;

		worst = Math.max(worst, Math.abs(Ephem.phase('venus', jd).dist / model - 1));
	}

	console.log(`apparent diameter around the Sun (OK = 1 au): within ${f(100 * worst, 1)}%`);
}

title('Test: 61 Cygni over 2026, its parallax');
{
	let most = 0;

	for (let jd = TEST_START; jd < TEST_START + 365; jd += 0.5) {
		const p = Stars.parallax(CYGNI, jd);

		most = Math.max(most, Math.abs(p.dlon));
	}

	console.log(`largest shift along the ecliptic ${f(most, 3)}″ (the Earth's distance from the Sun included)`);
}

title("Test (history): Tycho's argument from the size of the stars (Graney)");
{
	const minute = 1 / 60 / R2D;
	const distance = 2 / minute;

	[1, 2].forEach(width => {
		console.log(
			`a star ${width}′ wide, ${f(distance, 0)} au away: ${f(distance * width * minute, 1)} au across (the Earth's orbit is 2 au)`
		);
	});
}

/* ==========================================================================
   7. EXERCISES
   ========================================================================== */

title("Exercise 1: Tycho's stars");
console.log(
	"every star on a circle of radius 1 au in a year, parallel to the Sun's: Copernicus' arrangement with the Earth at rest"
);

title("Exercise 2: the fullest Venus in Ptolemy's order");
{
	const r = VENUS_FIT.r;
	const rP = PlanetEpicycle.PTOLEMY.venus.r;
	const kFar = (1 - Math.sqrt(1 - r * r)) / 2;

	console.log(
		`the Sun very far: k = (1 - sqrt(1 - r^2)) / 2 = ${f(kFar, 3)} at greatest elongation ${f(asin(r), 1)}° (r = ${f(r, 4)})`
	);
	[
		[r, 'the figure'],
		[rP, "Ptolemy's 43.17 in 60"]
	].forEach(([radius, text]) => {
		const ratio = PlanetArrangement.nestedRatio(radius);
		const best = fullest(ratio, radius);

		console.log(
			`nested spheres, r = ${f(radius, 4)} (${text}), O☉ = ${f(ratio, 3)} OK: fullest k = ${f(best.k, 3)} at elongation ${f(Math.abs(best.elongation), 1)}°; at greatest elongation k = ${f(kAtGreatest(ratio, radius), 3)}`
		);
	});

	// the real Venus 10° or more from the Sun, near superior conjunction
	let best = { k: 0 };

	for (let jd = CONJUNCTIONS[1]; jd <= CONJUNCTIONS[2]; jd += 0.5) {
		const v = realVenus(jd);

		if (Math.abs(v.elongation) >= 10 && v.chi < 90 && v.k > best.k) {
			best = Object.assign({ jd }, v);
		}
	}

	console.log(
		`the real Venus: k = ${f(best.k, 3)} on ${date(best.jd)}, ${f(Math.abs(best.elongation), 2)}° from the Sun`
	);

	// the same elongation in the order around the Sun, by hand: the
	// triangle O sun P with O sun = 1, sun P = r, the angle at O the
	// elongation; Venus beyond the Sun (the larger root)
	const e = Math.abs(best.elongation);
	const OP = cos(e) + Math.sqrt(r * r - sin(e) ** 2);
	const cosChi = (OP * OP + r * r - 1) / (2 * r * OP);

	console.log(
		`around the Sun at ${f(e, 2)}°: OP = ${f(OP, 3)} OK, cos chi = ${f(cosChi, 4)}, k = ${f((1 + cosChi) / 2, 3)}`
	);
}

title('Exercise 3: the parallax of 61 Cygni');
{
	const sunAt = target =>
		roots(jd => norm180(Ephem.sun(jd, { apparent: false }).lon - target), TEST_START, TEST_START + 365, 2).map(
			date
		);
	const jd = TEST_START;
	const p = Stars.atEpoch(CYGNI, jd);
	const eq = Ephem.precessEquatorial(p.ra, p.dec, Time.J2000, jd);
	const lon = Ephem.equatorialToEcliptic(eq.ra, eq.dec, Ephem.meanObliquity(jd)).lon;

	console.log(
		`distance 1 / ${f(PARALLAX, 5)}″ = ${f(ARCSEC_PER_RADIAN / PARALLAX, 0)} au = ${f(ARCSEC_PER_RADIAN / PARALLAX / AU_PER_LIGHT_YEAR, 2)} light years`
	);
	console.log(`greatest shifts along the ecliptic: east on ${sunAt(lon + 90)}, west on ${sunAt(lon - 90)}`);
	console.log(`aberration's: on ${sunAt(lon)} and ${sunAt(lon + 180)}`);
	console.log(`the whole yearly shift ${f(2 * PARALLAX, 3)}″; 1′ is ${f(60 / (2 * PARALLAX), 0)} times as much`);
}

/* ==========================================================================
   8. THE SCALES OF THE FIGURES
   ========================================================================== */

title("Scales: Figure 2, the farthest point of Tycho's drawing, 2010 - 2025");
{
	let most = 0;

	for (let jd = JD(2010, 1, 1); jd < JD(2026, 1, 1); jd += 2) {
		const T = PlanetArrangement.moment('mars', jd).tychonic;

		most = Math.max(most, Math.hypot(...T.P), Math.hypot(...T.C) + FIT.mars.a);
	}

	console.log(`Mars' circle in Tycho's drawing reaches ${f(most, 3)} au from O; Venus' ${f(1 + VENUS_FIT.r, 3)} au`);
}

title('Scales: Figure 3, the drawing and the disk');
console.log(`the drawing reaches ${f(Math.max(ORDERS.below, 1 + VENUS_FIT.r), 3)} (OK = 1)`);
console.log(
	`the disk: from ${f(1 / (1 + VENUS_FIT.r), 3)} to ${f(1 / (1 - VENUS_FIT.r), 3)} times its size at OP = OK`
);

title('Scales: Figure 4 (c), 61 Cygni in arcseconds');
{
	let most = 0;

	for (let jd = TEST_START; jd < TEST_START + 366; jd += 0.5) {
		const p = Stars.parallax(CYGNI, jd);

		most = Math.max(most, Math.abs(p.dlon), Math.abs(p.dlat));
	}

	console.log(`largest shift ${f(most, 3)}″; the axes are ±0.35″`);
}

title('Scales: Figure 6 (b), the order around the Sun less the real Venus');
console.log(`largest |Δk| ${f(Math.abs(TEST.around), 3)}; the axis is ±0.04`);
