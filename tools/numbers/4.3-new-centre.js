/* ==========================================================================
   NUMBERS FOR PAGE 4.3 "SAME GEOMETRY, NEW CENTER" (tools/numbers/4.3-new-center.js)
   Loads the site's shared code (common, time, ephemeris and the models
   mean-sun.js, precession.js, planet-epicycle.js, planet-equant.js and
   planet-arrangement.js) in a Node vm context and prints every number
   quoted on the page, in page order.

   Run from the repository root:  node tools/numbers/4.3-new-center.js
   (about a minute: it finds a century of oppositions and conjunctions of
   five planets, and forty years of their loops and greatest elongations)

   Scans use geometric positions, four times faster; every event is then
   refined, and every value printed, from apparent positions, as the
   other numbers scripts quote them.

   TABLE OF CONTENTS
	 1. Loading the shared code
	 2. Helpers
	 3. The events of the reference sky
	 4. Observation
	 5. Model
	 6. Fit
	 7. Test
	 8. Exercises
	 9. The scales of the figures
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
	'shared/models/mean-sun.js',
	'shared/models/precession.js',
	'shared/models/planet-epicycle.js',
	'shared/models/planet-equant.js',
	'shared/models/planet-arrangement.js'
]);
const {
	norm180,
	norm360,
	sin,
	cos,
	atan2d,
	Time,
	Ephem,
	MeanSun,
	Precession,
	PlanetEpicycle,
	PlanetEquant,
	PlanetArrangement
} = shared;
const { PLANETS, KIND, FIT, PTOLEMY, COPERNICUS } = PlanetArrangement;
const MARS = PlanetEquant.MARS_FIT;
const J2000 = 2451545.0;
const R2D = 180 / Math.PI;

/* ==========================================================================
   2. HELPERS
   ========================================================================== */

const title = text => console.log(`\n=== ${text} ===`);
const f = (x, digits) => x.toFixed(digits);
const mean = list => list.reduce((a, b) => a + b, 0) / list.length;
const range = (list, digits) => `${f(Math.min(...list), digits)} to ${f(Math.max(...list), digits)}`;
const JD = (y, m, d) => Time.julianDay(y, m, d);
const date = jd => Time.formatDate(jd);
const name = planet => planet[0].toUpperCase() + planet.slice(1);

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

/* The elongation of a planet from the true Sun (deg, [-180, 180)). */
const elongation = (planet, jd, apparent = true) =>
	norm180(Ephem.planet(planet, jd, { apparent }).lon - Ephem.sun(jd, { apparent }).lon);

/* The slope of a least-squares line through the values (index -> value). */
function slope(values) {
	const km = (values.length - 1) / 2;
	const vm = mean(values);
	let top = 0;
	let bottom = 0;

	values.forEach((v, k) => {
		top += (k - km) * (v - vm);
		bottom += (k - km) * (k - km);
	});

	return top / bottom;
}

/* The tropical year of page 1.3 and the sidereal year of page 2.3. */
const Y = 360 / MeanSun.MODERN.n;
const YS = Precession.siderealYear(Y, Precession.MODERN.rate);

/* ==========================================================================
   3. THE EVENTS OF THE REFERENCE SKY
   The observations are already documented, before 2026 (STRUCTURE.md
   §5): the oppositions and inferior conjunctions of 1926 - 2025, a
   century, for the periods; the greatest elongations and the loops of
   1986 - 2025, every configuration of each planet, for the distances.
   ========================================================================== */

const CENTURY_START = JD(1926, 1, 1);
const DATA_START = JD(1986, 1, 1);
const DATA_END = JD(2026, 1, 1);

/* The oppositions (outer) or inferior conjunctions (inner) in
   [start, end], refined on apparent positions. */
function middles(planet, start, end) {
	const target = KIND[planet] === 'inner' ? 0 : 180;
	let found = roots(jd => norm180(elongation(planet, jd, false) - target), start, end, planet === 'mercury' ? 1 : 3);

	if (KIND[planet] === 'inner') {
		found = found.filter(jd => Ephem.planet(planet, jd, { apparent: false }).dist < Ephem.sun(jd).dist);
	}

	return found.map(jd => bisect(t => norm180(elongation(planet, t) - target), jd - 1, jd + 1, 40));
}

/* The greatest elongations of an inner planet in [start, end]:
   [{ jd, e (deg, signed: east positive) }]. */
function greatestElongations(planet, start, end) {
	const change = (jd, apparent) =>
		Math.abs(elongation(planet, jd + 0.05, apparent)) - Math.abs(elongation(planet, jd - 0.05, apparent));
	const scan = roots(jd => change(jd, false), start, end, 1).filter(
		jd => Math.abs(elongation(planet, jd, false)) > 12 && change(jd - 2, false) > 0
	);

	return scan.map(jd => {
		const t = bisect(x => change(x, true), jd - 1, jd + 1, 40);

		return { jd: t, e: elongation(planet, t) };
	});
}

const EVENTS = {};
const GREATEST = {};
const LOOPS = {};

PLANETS.forEach(planet => {
	EVENTS[planet] = middles(planet, CENTURY_START, DATA_END);

	if (KIND[planet] === 'inner') {
		GREATEST[planet] = greatestElongations(planet, DATA_START, DATA_END);
	} else {
		LOOPS[planet] = PlanetEpicycle.referenceEvents(planet, 'outer', DATA_START - 200, DATA_END).loops.filter(
			l => l.middle >= DATA_START
		);
	}
});

/* ==========================================================================
   4. OBSERVATION
   ========================================================================== */

title('Observation: the elongations from the Sun, 2022 - 2025 (Figure 1)');
{
	const start = JD(2022, 1, 1);
	const end = JD(2026, 1, 1);

	PLANETS.forEach(planet => {
		const loops = middles(planet, start, end);

		console.log(
			`${name(planet).padEnd(8)} loops centered on ${KIND[planet] === 'inner' ? 'inferior conjunction' : 'opposition'}: ${loops.length}`
		);
	});

	innerRange(start, end);
}

/* The range of the inner planets' elongations in 2022 - 2025. */
function innerRange(start, end) {
	['venus', 'mercury'].forEach(planet => {
		let most = 0;

		for (let jd = start; jd < end; jd += 1) {
			most = Math.max(most, Math.abs(elongation(planet, jd, false)));
		}

		console.log(`${name(planet)} stays within ${f(most, 1)}° of the Sun (geometric, daily)`);
	});
}

title('Observation: the synodic periods (the mean interval, 1926 - 2025)');
const SYNODIC = {};

PLANETS.forEach(planet => {
	const events = EVENTS[planet];
	const intervals = events.slice(1).map((jd, i) => jd - events[i]);

	SYNODIC[planet] = slope(events);
	console.log(
		`${name(planet).padEnd(8)} ${String(events.length).padStart(3)} ${KIND[planet] === 'inner' ? 'inferior conjunctions' : 'oppositions'}; S = ${f(SYNODIC[planet], 2)} days (single intervals ${range(intervals, 0)})`
	);
});

title("Observation: Ptolemy's epicycles (where the deferent is 60)");
PLANETS.forEach(planet => {
	console.log(`${name(planet).padEnd(8)} ${f(60 * PlanetEpicycle.PTOLEMY[planet].r, 2)}`);
});

/* ==========================================================================
   5. MODEL
   ========================================================================== */

title("Model: Ptolemy's epicycles read as distances (Figure 3a, the table)");
PLANETS.forEach(planet => {
	console.log(`${name(planet).padEnd(8)} a = ${f(PTOLEMY[planet].a, 3)}`);
});

title('Model: the period relations about the Sun (Almagest IX 3, De Revolutionibus V 1)');
PLANETS.forEach(planet => {
	const c = COPERNICUS[planet];
	const rule =
		KIND[planet] === 'inner'
			? `${c.years} + ${c.synodic} = ${c.years + c.synodic}`
			: `${c.years} - ${c.synodic} = ${c.years - c.synodic}`;

	console.log(
		`${name(planet).padEnd(8)} ${c.synodic} synodic periods in ${c.years} years: ${rule} turns about the Sun (Copernicus: ${c.turns}); one turn in ${f(c.years / c.turns, 3)} years`
	);
});

title("Model: the greatest elongation of Ptolemy's Venus, sin epsilon = a");
console.log(`43.17 where the deferent is 60: ${f(PlanetArrangement.greatestElongation(PTOLEMY.venus.a), 1)}°`);

title('Model: the periods, by distance (Figure 3)');
PLANETS.forEach(planet => {
	const P = PlanetArrangement.periodAboutSun(KIND[planet], SYNODIC[planet], YS);

	console.log(`${name(planet).padEnd(8)} a = ${f(FIT[planet].a, 3)} au, P = ${f(P / YS, 3)} years (${f(P, 1)} days)`);
});

title("Model: Mars' distance from the Earth in the circle of radius a");
{
	const a = FIT.mars.a;

	console.log(
		`a - 1 = ${f(a - 1, 2)} au at opposition, a + 1 = ${f(a + 1, 2)} au at conjunction, ratio ${f((a + 1) / (a - 1), 1)}`
	);
}

title("Model: Copernicus' eccentric with an epicyclet against the equant (Mars, e = 0.1005)");
const DEVICE = {};
{
	const e = MARS.e;
	let dq = 0;
	let dd = 0;

	for (let M = 0; M < 360; M += 0.05) {
		const z = PlanetEquant.zodiacal(M, e, 2 * e);
		const c = PlanetArrangement.epicyclet(M, e);

		dq = Math.max(dq, Math.abs(norm180(c.q - z.q)));
		dd = Math.max(dd, Math.abs(c.distance - z.distance));
	}

	// the planet itself, 2010 - 2025, the same parameters
	const equant = PlanetEquant.make(MARS);
	const device = PlanetArrangement.makeEpicyclet(MARS);
	const lon = jd => Ephem.position('mars', jd).lon;
	let worstEquant = 0;
	let worstDevice = 0;
	let apart = 0;

	for (let jd = JD(2010, 1, 1); jd < DATA_END; jd += 1) {
		const real = lon(jd);

		worstEquant = Math.max(worstEquant, Math.abs(norm180(equant(jd) - real)));
		worstDevice = Math.max(worstDevice, Math.abs(norm180(device(jd) - real)));
		apart = Math.max(apart, Math.abs(norm180(device(jd) - equant(jd))));
	}

	DEVICE.dq = dq;
	DEVICE.dd = dd;
	console.log(
		`K seen from the center: directions within ${f(60 * dq, 1)}', distances within ${f(dd, 4)} (e^2 / 2 = ${f((e * e) / 2, 4)})`
	);
	console.log(`the planet seen from the Earth, 2010 - 2025: the two within ${f(60 * apart, 1)}' of each other`);
	console.log(
		`largest error: the equant ${f(worstEquant, 2)}°, the eccentric with the epicyclet ${f(worstDevice, 2)}°`
	);
}

/* ==========================================================================
   6. FIT
   ========================================================================== */

title('Fit: the periods about the Sun from the synodic periods (the table)');
console.log(`the tropical year Y = ${f(Y, 5)} days, the sidereal year Y_s = ${f(YS, 5)} days`);
PLANETS.forEach(planet => {
	const P = PlanetArrangement.periodAboutSun(KIND[planet], SYNODIC[planet], YS);
	const reference = (36525 * 360) / Ephem.ELEMENTS[planet].rate[3];

	console.log(
		`${name(planet).padEnd(8)} S = ${f(SYNODIC[planet], 2)} d, P = ${f(P, 2)} d = ${f(P / YS, 3)} years; the reference ${f(reference, 2)} d (${f(P - reference, 2)} d, ${f((100 * (P - reference)) / reference, 2)}%)`
	);
});

title('Fit: Venus and Mercury from their greatest elongations, 1986 - 2025');
const FITTED = {};

['venus', 'mercury'].forEach(planet => {
	const list = GREATEST[planet];
	const values = list.map(x => Math.abs(x.e));

	FITTED[planet] = mean(values.map(v => sin(v)));
	console.log(
		`${name(planet).padEnd(8)} ${list.length} greatest elongations, ${range(values, 1)}°; a = mean of sin = ${f(FITTED[planet], 4)}`
	);
});

title('Fit: Jupiter and Saturn from their loops, 1986 - 2025 (and Mars, for comparison)');
['mars', 'jupiter', 'saturn'].forEach(planet => {
	const loops = LOOPS[planet];
	const arc = mean(loops.map(l => l.arc));
	const n = 360 / PlanetArrangement.periodAboutSun('outer', SYNODIC[planet], Y);
	const r = PlanetEpicycle.ratioForArc(arc, n, MeanSun.MODERN.n - n);

	FITTED[planet] = 1 / r;
	console.log(
		`${name(planet).padEnd(8)} ${loops.length} loops, mean arc ${f(arc, 2)}°; r = ${f(r, 4)} (${f(60 * r, 2)} where the deferent is 60), a = ${f(1 / r, 4)}`
	);
});
console.log(`Mars keeps page 4.2's equant: r = ${f(MARS.r, 4)}, a = ${f(1 / MARS.r, 4)}`);

title('Fit: why not the quadratures (cos psi = 1 / a, psi = 360° t / S)');
['mars', 'jupiter', 'saturn'].forEach(planet => {
	const a = FITTED[planet];
	const psi = PlanetArrangement.quadratureAngle(a);
	const perDay = 360 / SYNODIC[planet];
	const relative = Math.tan(psi / R2D) * (perDay / R2D);

	const early = 1 / cos(psi - perDay);

	console.log(
		`${name(planet).padEnd(8)} psi = ${f(psi, 1)}°, ${f(psi / perDay, 0)} days from opposition; psi moves ${f(perDay, 2)}° a day; a day's error moves a by ${f(100 * relative, 1)}%` +
			` (a day early: a = ${f(early, 2)}, ${f((100 * (early - a)) / a, 1)}%)`
	);
});

title('Fit: the values stored in models/planet-arrangement.js');
{
	// Venus' anomaly at J2000: mu = 180° at each inferior conjunction
	const nMu = 360 / SYNODIC.venus;
	const vectors = EVENTS.venus.map(jd => 180 - nMu * (jd - J2000));
	const x = mean(vectors.map(v => cos(v)));
	const y = mean(vectors.map(v => sin(v)));

	PLANETS.forEach(planet => {
		console.log(
			`${planet}: { S: ${f(SYNODIC[planet], 6)}, a: ${planet === 'mars' ? '1 / r' : f(FITTED[planet], 6)} }`
		);
	});
	console.log(`VENUS_FIT.mu0 = ${f(norm360(atan2d(y, x)), 6)}`);
	console.log(
		`stored: ${PLANETS.map(p => `${p} ${f(FIT[p].S, 6)}/${f(FIT[p].a, 6)}`).join(', ')}; mu0 ${f(PlanetArrangement.VENUS_FIT.mu0, 6)}`
	);
}

title('Fit: the table, fitted against Ptolemy');
PLANETS.forEach(planet => {
	console.log(
		`${name(planet).padEnd(8)} fitted a = ${f(FIT[planet].a, 3)}, Ptolemy ${f(PTOLEMY[planet].a, 3)}, Copernicus ${f(COPERNICUS[planet].a, 3)}`
	);
});

/* ==========================================================================
   7. TEST
   ========================================================================== */

title("Test: the directions of Mars, page 4.2's equant in Copernicus' arrangement (Figure 5)");
{
	const helio = PlanetArrangement.make('mars');
	const geo = PlanetEquant.make(MARS);
	let worst = 0;

	for (let jd = JD(1926, 1, 1); jd < JD(2126, 1, 1); jd += 1) {
		worst = Math.max(worst, Math.abs(norm180(helio(jd) - geo(jd))));
	}

	console.log(`the two descriptions differ by at most ${worst.toExponential(1)}° over 1926 - 2125`);
}

title("Test: Mars' distance from the Earth (Figure 6)");
{
	const model = PlanetArrangement.makeDistance('mars');
	const real = jd => Ephem.planet('mars', jd).dist;

	[
		[JD(2010, 1, 1), DATA_END],
		[JD(1926, 1, 1), JD(2126, 1, 1)]
	].forEach(([start, end]) => {
		let worst = 0;
		let worstRelative = 0;
		let when = start;
		let near = Infinity;
		let far = 0;

		for (let jd = start; jd < end; jd += 1) {
			const d = real(jd);
			const error = model(jd) - d;

			if (Math.abs(error) > worst) {
				worst = Math.abs(error);
				when = jd;
			}

			worstRelative = Math.max(worstRelative, Math.abs(error) / d);
			near = Math.min(near, d);
			far = Math.max(far, d);
		}

		console.log(
			`${date(start)} - ${date(end)}: the real Mars ${f(near, 2)} to ${f(far, 2)} au; the model within ${f(worst, 3)} au (${date(when)}), ${f(100 * worstRelative, 1)}% at most`
		);
	});

	// at the oppositions of 2010 - 2025
	const oppositions = EVENTS.mars.filter(jd => jd >= JD(2010, 1, 1));
	const distances = oppositions.map(real);

	oppositions.forEach(jd =>
		console.log(`   opposition ${date(jd)}: real ${f(real(jd), 3)} au, model ${f(model(jd), 3)} au`)
	);
	console.log(
		`at the oppositions of 2010 - 2025 the real Mars was ${range(distances, 2)} au away; the circle gives ${f(FIT.mars.a - 1, 2)} au at each`
	);
}

title('Test: the five distances and periods against the reference (the table)');
PLANETS.forEach(planet => {
	const a = FIT[planet].a;
	const reference = Ephem.ELEMENTS[planet].at[0];
	const P = PlanetArrangement.periodAboutSun(KIND[planet], SYNODIC[planet], YS);
	const Pref = (36525 * 360) / Ephem.ELEMENTS[planet].rate[3];

	console.log(
		`${name(planet).padEnd(8)} a = ${f(a, 3)} au, the reference ${f(reference, 3)} au (${f((100 * (a - reference)) / reference, 1)}%); P = ${f(P / YS, 3)} years, the reference ${f(Pref / YS, 3)} years`
	);
});

/* ==========================================================================
   8. EXERCISES
   ========================================================================== */

title('Exercise 1: Venus from its greatest elongations of 2025');
{
	const list = GREATEST.venus.filter(x => x.jd >= JD(2025, 1, 1));
	const values = list.map(x => sin(Math.abs(x.e)));

	list.forEach(x => {
		const venus = Ephem.heliocentric('venus', x.jd).r;
		const earth = Ephem.sun(x.jd).dist;

		console.log(
			`${date(x.jd)}: ${f(x.e, 3)}° (${x.e > 0 ? 'east, evening' : 'west, morning'}), sin = ${f(sin(Math.abs(x.e)), 4)}; Venus ${f(venus, 4)} au and the Earth ${f(earth, 4)} au from the Sun, ratio ${f(venus / earth, 4)}`
		);
	});
	console.log(
		`mean of the two ${f(mean(values), 4)}; the fit ${f(FIT.venus.a, 4)}, whose greatest elongation is ${f(PlanetArrangement.greatestElongation(FIT.venus.a), 2)}°`
	);

	// Copernicus V 21: 44 4/5° with the Earth at the apogee of Venus'
	// circle, 47;16° at its perigee; the two tangent triangles share the
	// radius, and the Earth's circle has radius 1
	const sinA = sin(44.8);
	const sinB = sin(47 + 16 / 60);
	const radius = 2 / (1 / sinA + 1 / sinB);
	const offset = (radius / sinA - radius / sinB) / 2;

	console.log(
		`Copernicus V 21: sin 44.8° = ${f(sinA, 4)}, sin 47.267° = ${f(sinB, 4)}; the distances from the Earth to the center ${f(radius / sinA, 4)} and ${f(radius / sinB, 4)}; radius ${f(radius, 4)}, center ${f(offset, 4)} from the Sun's mean place (his 7193 and 208 in 10000)`
	);
}

title("Exercise 2: Copernicus' eccentric with an epicyclet (V 4)");
{
	const small = 0.001;
	const N = 3600;
	let c1 = 0;
	let c2 = 0;
	let c2e = 0;

	for (let i = 0; i < N; i++) {
		const M = (360 * i) / N;

		c1 += (2 * PlanetArrangement.epicyclet(M, small).q * sin(M)) / N;
		c2 += (2 * PlanetArrangement.epicyclet(M, small).q * sin(2 * M)) / N;
		c2e += (2 * PlanetEquant.zodiacal(M, small, 2 * small).q * sin(2 * M)) / N;
	}

	console.log(
		`coefficients in q at e = 0.001: sin M ${f(c1 / R2D / small, 4)} e, sin 2M ${f(c2 / R2D / small ** 2, 4)} e^2 (equant ${f(c2e / R2D / small ** 2, 4)} e^2)`
	);

	// the distance's second-order term: (rho - 1 - e cos M) / e^2 at M = 90°
	const rho = PlanetArrangement.epicyclet(90, small).distance;
	const rhoEquant = PlanetEquant.zodiacal(90, small, 2 * small).distance;

	console.log(
		`distance at M = 90°, (rho - 1) / e^2: eccentric with epicyclet ${f((rho - 1) / small ** 2, 3)}, equant ${f((rhoEquant - 1) / small ** 2, 3)}`
	);
	console.log(
		`Mars, e = ${f(MARS.e, 4)}: directions within ${f(60 * DEVICE.dq, 1)}', distances within ${f(DEVICE.dd, 4)}`
	);
	console.log(
		`Copernicus' Mars (V 19): 1460 and 500 where the deferent is 10000: sum ${f(0.146 + 0.05, 3)}, difference ${f(0.146 - 0.05, 3)}, ratio ${f(1460 / 500, 2)}; Ptolemy 2e = 0.2, e = 0.1`
	);
}

title("Exercise 3: Mercury's greatest elongations, 1986 - 2025");
{
	const list = GREATEST.mercury;
	const least = list.reduce((a, b) => (Math.abs(b.e) < Math.abs(a.e) ? b : a));
	const most = list.reduce((a, b) => (Math.abs(b.e) > Math.abs(a.e) ? b : a));
	const a = FIT.mercury.a;

	console.log(`the circle of radius a = ${f(a, 4)}: always ${f(PlanetArrangement.greatestElongation(a), 2)}°`);
	[least, most].forEach(x => {
		const mercury = Ephem.heliocentric('mercury', x.jd).r;
		const earth = Ephem.sun(x.jd).dist;

		console.log(
			`${date(x.jd)}: ${f(x.e, 3)}°, sin = ${f(sin(Math.abs(x.e)), 4)}; Mercury ${f(mercury, 4)} au from the Sun, the Earth ${f(earth, 4)} au, ratio ${f(mercury / earth, 4)}`
		);
	});

	const el = Ephem.ELEMENTS.mercury.at;
	const atElongations = mean(list.map(x => Ephem.heliocentric('mercury', x.jd).r));

	console.log(
		`the reference ellipse: perihelion ${f(el[0] * (1 - el[1]), 4)} au, aphelion ${f(el[0] * (1 + el[1]), 4)} au, a = ${f(el[0], 4)} au`
	);
	console.log(`Mercury's mean distance from the Sun at its greatest elongations ${f(atElongations, 4)} au`);

	// sin epsilon = (r_M / r_E) sin(angle at Mercury): the angle is right
	// only at Mercury's apsides; elsewhere the line of sight touches the
	// ellipse where the radius is not perpendicular to it
	const ratios = list.map(x => Ephem.heliocentric('mercury', x.jd).r / Ephem.sun(x.jd).dist);
	const angles = list.map((x, i) => sin(Math.abs(x.e)) / ratios[i]);

	console.log(
		`mean of r_M / r_E at the greatest elongations ${f(mean(ratios), 4)}, mean of sin epsilon ${f(FIT.mercury.a, 4)}; sin(angle at Mercury) from ${f(Math.min(...angles), 3)} to ${f(Math.max(...angles), 3)}`
	);

	const venusRatios = GREATEST.venus.map(x => Ephem.heliocentric('venus', x.jd).r / Ephem.sun(x.jd).dist);

	console.log(`Venus: mean of r_V / r_E ${f(mean(venusRatios), 4)}, mean of sin epsilon ${f(FIT.venus.a, 4)}`);
	console.log(`Copernicus V 27: radius ${f(0.3573, 4)} to ${f(0.3953, 4)}`);
}

/* ==========================================================================
   9. THE SCALES OF THE FIGURES
   ========================================================================== */

title('Scales: Figure 6, the difference in distance over 2010 - 2025');
{
	const model = PlanetArrangement.makeDistance('mars');
	let worst = 0;

	for (let jd = JD(2010, 1, 1); jd < DATA_END; jd += 1) {
		worst = Math.max(worst, Math.abs(model(jd) - Ephem.planet('mars', jd, { apparent: false }).dist));
	}

	console.log(`model less reference (geometric, as the figure): at most ${f(worst, 4)} au; the axis is ±0.03 au`);
}
