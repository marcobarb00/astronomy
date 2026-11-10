/* ==========================================================================
   NUMBERS FOR PAGE 4.1 "GOING BACKWARDS" (tools/numbers/4.1-going-backwards.js)
   Loads the site's shared code (common, time, ephemeris and the models
   mean-sun.js and planet-epicycle.js) in a Node vm context and prints
   every number quoted on the page, in page order.

   Run from the repository root:  node tools/numbers/4.1-going-backwards.js
   (about a minute: it finds every loop of five planets over forty years)

   TABLE OF CONTENTS
	 1. Loading the shared code
	 2. Helpers
	 3. Observation: the loop of 2024 - 2025; five planets; IX 5
	 4. Model: the simple epicycle
	 5. Fit: Mars from its oppositions and its loops
	 6. Test: the error curve
	 7. Residual: the loops in different parts of the zodiac
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
	'shared/models/planet-epicycle.js'
]);
const { norm180, norm360, sin, cos, asin, acos, atan2d, Time, Ephem, MeanSun, PlanetEpicycle } = shared;
const { PTOLEMY, MARS_FIT, VENUS_MEAN } = PlanetEpicycle;

/* ==========================================================================
   2. HELPERS
   ========================================================================== */

const title = text => console.log(`\n=== ${text} ===`);
const date = jd => Time.formatDate(jd);
const when = jd => Time.formatDate(jd, { time: true });
const f = (x, digits) => x.toFixed(digits);
const mean = list => list.reduce((a, b) => a + b, 0) / list.length;
const range = (list, digits) => `${f(Math.min(...list), digits)} to ${f(Math.max(...list), digits)}`;
const fromSexagesimal = (...parts) => parts.reduce((sum, part, i) => sum + part / Math.pow(60, i), 0);
const JD = (y, m, d) => Time.julianDay(y, m, d);
const J2000 = 2451545.0;

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
			found.push(bisect(fn, t - step, t));
		}

		f0 = f1;
	}

	return found;
}

const lon = (body, jd) => Ephem.longitude(body, jd);
const speed = (body, jd) => PlanetEpicycle.referenceMotion(body, jd);
const elongation = (body, jd) => PlanetEpicycle.referenceElongation(body, jd);
const meanSun = MeanSun.make(MeanSun.MODERN);
const mars = PlanetEpicycle.meanOfDate('mars');
const marsMotions = { n: mars.n, nMu: MeanSun.MODERN.n - mars.n };

/* ==========================================================================
   3. OBSERVATION
   ========================================================================== */

const START = JD(2001, 1, 1);
const END = JD(2041, 1, 1);
const KINDS = { mars: 'outer', jupiter: 'outer', saturn: 'outer', venus: 'inner', mercury: 'inner' };

const marsEvents = PlanetEpicycle.referenceEvents('mars', 'outer', JD(2000, 6, 1), JD(2041, 6, 1));
const marsLoops = marsEvents.loops;
const loop2425 = marsLoops.find(l => l.middle > JD(2025, 1, 1) && l.middle < JD(2025, 2, 1));

title('Observation: the loop of 2024 - 2025 (Figure 1)');
console.log(`turns back      ${when(loop2425.start)}  ecliptic longitude ${f(lon('mars', loop2425.start), 2)}°`);
console.log(`opposition      ${when(loop2425.middle)}  ecliptic longitude ${f(loop2425.lon, 2)}°`);
console.log(`turns forward   ${when(loop2425.end)}  ecliptic longitude ${f(lon('mars', loop2425.end), 2)}°`);
console.log(`went back ${f(loop2425.arc, 2)}° in ${f(loop2425.days, 1)} days`);
console.log(
	`elongation from the Sun at the stations ${f(elongation('mars', loop2425.start), 1)}°, ${f(elongation('mars', loop2425.end), 1)}°`
);
console.log(`distance at opposition ${f(Ephem.position('mars', loop2425.middle).dist, 3)} au`);
{
	const lats = [];

	for (let jd = JD(2024, 10, 15); jd <= JD(2025, 4, 15); jd += 1) {
		lats.push(Ephem.position('mars', jd).lat);
	}

	console.log(`ecliptic latitude, 15 Oct 2024 - 15 Apr 2025 (the path of the plate): ${range(lats, 2)}°`);
}

title('Observation: five planets, 2001 - 2040');

const SUMMARY = {};

Object.entries(KINDS).forEach(([body, kind]) => {
	const ev = body === 'mars' ? marsEvents : PlanetEpicycle.referenceEvents(body, kind, START - 200, END + 200);
	const loops = ev.loops.filter(l => l.middle >= START && l.middle < END);
	const arcs = loops.map(l => l.arc);
	const days = loops.map(l => l.days);
	const gaps = loops.slice(1).map((l, i) => l.middle - loops[i].middle);
	const atStations = loops.map(l => Math.abs(elongation(body, l.start)));
	const offCentre = loops.map(l => Math.abs((l.start + l.end) / 2 - l.middle));

	SUMMARY[body] = { loops, arcs, days };
	console.log(
		`${body.padEnd(8)} ${loops.length} loops; back ${range(arcs, 1)}° (mean ${f(mean(arcs), 1)}) in ${range(days, 0)} days;` +
			` every ${range(gaps, 0)} days; |elongation| at the stations ${range(atStations, 0)}°;` +
			` ${kind === 'outer' ? 'opposition' : 'inferior conjunction'} within ${f(Math.max(...offCentre), 1)} days of the loop's middle`
	);
});

console.log(
	`the outer planets: ${['mars', 'jupiter', 'saturn'].reduce((sum, body) => sum + SUMMARY[body].loops.length, 0)} loops in all`
);

{
	// the greatest elongations of the inner planets: extremes of the elongation
	['venus', 'mercury'].forEach(body => {
		const turns = roots(jd => elongation(body, jd + 0.5) - elongation(body, jd - 0.5), START, END, 1).filter(
			jd => Math.abs(elongation(body, jd)) > 10
		);
		const values = turns.map(jd => Math.abs(elongation(body, jd)));

		console.log(`${body}: greatest elongations, in ecliptic longitude, ${range(values, 1)}°`);
	});
}

title('Observation: Almagest IX 5, Mars from its fastest to its slowest, 2023 - 2025');
{
	// the fastest moment after the conjunction of 18 November 2023, the
	// moment the daily motion comes down to the mean motion, the opposition
	const conjunction = roots(jd => elongation('mars', jd), JD(2023, 10, 1), JD(2024, 1, 1), 1)[0];
	let fastest = conjunction;

	for (let jd = conjunction - 100; jd < loop2425.middle; jd += 0.25) {
		if (speed('mars', jd) > speed('mars', fastest)) {
			fastest = jd;
		}
	}

	const meanReached = roots(jd => speed('mars', jd) - mars.n, fastest, loop2425.middle, 1)[0];

	console.log(
		`conjunction ${date(conjunction)}; fastest ${date(fastest)}, ${f(speed('mars', fastest), 2)}°/day;` +
			` back to the mean motion ${f(mars.n, 3)}°/day on ${date(meanReached)}; opposition ${date(loop2425.middle)}`
	);
	console.log(
		`from fastest to mean ${f(meanReached - fastest, 0)} days; from mean to the opposition (slowest) ${f(loop2425.middle - meanReached, 0)} days`
	);
	console.log(
		`from the conjunction to the mean motion ${f(meanReached - conjunction, 0)} days (${f((meanReached - conjunction) / 30.44, 1)} months); then to the opposition ${f((loop2425.middle - meanReached) / 30.44, 1)} months`
	);
}

/* ==========================================================================
   4. MODEL
   ========================================================================== */

title("Model: the speed on the epicycle (Ptolemy's Mars: his motions and 39;30 / 60)");
{
	const p = PTOLEMY.mars;
	const apogee = PlanetEpicycle.dailyMotion(0, p.r, p.n, p.nMu);
	const perigee = PlanetEpicycle.dailyMotion(180, p.r, p.n, p.nMu);
	const muMean = acos(-p.r);

	console.log(`r = ${f(p.r, 4)}; n = ${f(p.n, 4)}°, n_mu = ${f(p.nMu, 4)}° a day`);
	console.log(`daily motion at the apogee ${f(apogee, 3)}°, at the perigee ${f(perigee, 3)}°`);
	console.log(
		`mean motion where cos mu = -r: mu = ${f(muMean, 1)}°; greatest equation arcsin r = ${f(asin(p.r), 1)}°`
	);
	console.log(
		`apogee -> mean speed ${f(muMean / p.nMu, 0)} days; mean speed -> perigee ${f((180 - muMean) / p.nMu, 0)} days`
	);
	console.log(`no loop when r <= n / (n + n_mu) = ${f(PlanetEpicycle.loopThreshold(p.n, p.nMu), 3)}`);
	console.log(`an error in K is multiplied at the perigee by 1 / (1 - r) = ${f(1 / (1 - p.r), 2)}`);
}
{
	const v = PTOLEMY.venus;

	console.log(`Venus: r = 43;10 / 60 = ${f(v.r, 4)}, greatest elongation arcsin r = ${f(asin(v.r), 1)}°`);
}

/* ==========================================================================
   5. FIT
   ========================================================================== */

title('Fit: the oppositions of Mars to the mean Sun, 2018 - 2033');

const FIT_START = JD(2018, 1, 1);
const FIT_END = JD(2034, 1, 1);
const meanOppositions = roots(jd => norm180(lon('mars', jd) - meanSun(jd) - 180), FIT_START, FIT_END, 2);
const L0s = meanOppositions.map(jd => norm360(lon('mars', jd) - mars.n * (jd - J2000)));
const L0fit = norm360(atan2d(mean(L0s.map(x => sin(x))), mean(L0s.map(x => cos(x)))));
const realOppositions = marsLoops.map(l => l.middle).filter(jd => jd >= FIT_START && jd < FIT_END);

console.log(
	`n = ${mars.n.toFixed(9)}°/day (Standish's L of date); period in ecliptic longitude ${f(360 / mars.n, 3)} days`
);
meanOppositions.forEach((jd, i) => {
	console.log(
		`${date(jd).padEnd(12)} ecliptic longitude ${f(lon('mars', jd), 2).padStart(6)}°  L0 ${f(L0s[i], 2).padStart(6)}°` +
			`  (${f(norm180(L0s[i] - L0fit), 1).padStart(5)}°; the opposition to the true Sun ${f(jd - realOppositions[i], 1)} days away)`
	);
});
console.log(
	`the oppositions to the mean Sun within ${f(Math.max(...meanOppositions.map((jd, i) => Math.abs(jd - realOppositions[i]))), 1)} days of those to the true Sun`
);
console.log(
	`L0 = ${L0fit.toFixed(6)}° (the mean of ${L0s.length}); Standish's mean longitude at J2000 ${f(mars.L0, 2)}°, ` +
		`${f(Math.abs(norm180(L0fit - mars.L0)) * 60, 0)}' away`
);

title('Fit: the epicycle from the arcs of retrogradation, 2018 - 2033');

const fitLoops = marsLoops.filter(l => l.middle >= FIT_START && l.middle < FIT_END);
const ratioFor = arc => PlanetEpicycle.ratioForArc(arc, marsMotions.n, marsMotions.nMu);

fitLoops.forEach(l => {
	console.log(
		`${date(l.middle).padEnd(12)} ecliptic longitude ${f(l.lon, 1).padStart(5)}°  back ${f(l.arc, 2)}° in ${f(l.days, 1)} days  -> r ${f(ratioFor(l.arc), 3)}`
	);
});

const meanArc = mean(fitLoops.map(l => l.arc));
const rFit = ratioFor(meanArc);
const fitLoop = PlanetEpicycle.loop(rFit, marsMotions.n, marsMotions.nMu);

console.log(
	`r from each loop ${range(
		fitLoops.map(l => ratioFor(l.arc)),
		3
	)}`
);
console.log(`mean arc ${f(meanArc, 2)}° -> r = ${rFit.toFixed(6)} (${f(60 * rFit, 1)} where R = 60; Ptolemy 39.5)`);
console.log(
	`stations at mu = ${f(fitLoop.mu, 1)}° and ${f(360 - fitLoop.mu, 1)}°; the loop ${f(fitLoop.arc, 2)}° in ${f(fitLoop.days, 1)} days (real mean ${f(mean(fitLoops.map(l => l.days)), 1)} days)`
);
console.log(`MARS_FIT in planet-epicycle.js: L0 ${MARS_FIT.L0}, r ${MARS_FIT.r}`);

/* ==========================================================================
   6. TEST
   ========================================================================== */

title('Test: the model fitted to 2018 - 2033 against the reference Mars');

const fitted = PlanetEpicycle.make(MARS_FIT);
const uniform = PlanetEpicycle.makeUniform(MARS_FIT);

function errors(fn, start, end, step) {
	let max = 0;
	let sum2 = 0;
	let count = 0;

	for (let jd = start; jd < end; jd += step) {
		const d = norm180(fn(jd) - lon('mars', jd));

		max = Math.max(max, Math.abs(d));
		sum2 += d * d;
		count++;
	}

	return { max, rms: Math.sqrt(sum2 / count) };
}

[
	['2018 - 2033', FIT_START, FIT_END, 1],
	['1926 - 2126', JD(1926, 1, 1), JD(2126, 1, 1), 5]
].forEach(([label, a, b, step]) => {
	const model = errors(fitted, a, b, step);
	const plain = errors(uniform, a, b, step);

	console.log(
		`${label}: the epicycle within ${f(model.max, 1)}° (rms ${f(model.rms, 1)}°); the uniform planet within ${f(plain.max, 1)}° (rms ${f(plain.rms, 1)}°)`
	);
});
{
	const atOpposition = realOppositions.map(jd => norm180(fitted(jd) - lon('mars', jd)));
	const conjunctions = roots(jd => elongation('mars', jd), FIT_START, FIT_END, 1);
	const atConjunction = conjunctions.map(jd => norm180(fitted(jd) - lon('mars', jd)));

	console.log(`at the oppositions: ${atOpposition.map(x => f(x, 1)).join(', ')}°`);
	console.log(`at the conjunctions: ${atConjunction.map(x => f(x, 1)).join(', ')}°`);
}

/* ==========================================================================
   7. RESIDUAL
   ========================================================================== */

title('Residual: the loops of Mars, 2001 - 2040 (Figure 5)');

const residualLoops = marsLoops.filter(l => l.middle >= START && l.middle < END);

residualLoops.forEach((l, i) => {
	const next = residualLoops[i + 1];

	console.log(
		`${date(l.middle).padEnd(12)} ecliptic longitude ${f(l.lon, 1).padStart(5)}°  back ${f(l.arc, 2).padStart(5)}° in ${f(l.days, 1)} days` +
			`  ${f(Ephem.position('mars', l.middle).dist, 3)} au${next ? `  next after ${f(next.middle - l.middle, 0)} days` : ''}`
	);
});
{
	const gaps = residualLoops.slice(1).map((l, i) => l.middle - residualLoops[i].middle);

	console.log(
		`${residualLoops.length} loops: back ${range(
			residualLoops.map(l => l.arc),
			1
		)}°; the model ${f(fitLoop.arc, 1)}° every time`
	);
	console.log(`intervals ${range(gaps, 0)} days; the model's synodic period ${f(360 / marsMotions.nMu, 1)} days`);
}

/* ==========================================================================
   8. EXERCISES
   ========================================================================== */

title("Exercise 1: the stations; Ptolemy's Mars at mean distance (XII 4)");
{
	const p = PTOLEMY.mars;
	const L = PlanetEpicycle.loop(p.r, p.n, p.nMu);
	const k = p.nMu / p.n;

	console.log(
		`n = ${f(p.n, 7)}, n_mu = ${f(p.nMu, 7)}; n_mu / n = ${f(k, 5)} (0;52,51 = ${f(fromSexagesimal(0, 52, 51), 5)})`
	);
	console.log(`n + n_mu = ${f(p.n + p.nMu, 7)}, the mean Sun's ${f(fromSexagesimal(0, 59, 8, 17, 13, 12, 31), 7)}`);
	console.log(
		`cos mu_s = ${f(-(1 + p.r * p.r * (1 + k)) / (p.r * (2 + k)), 5)}; mu_s = ${f(L.mu, 2)}° (${f(180 - L.mu, 2)}° before the perigee)`
	);
	console.log(
		`eta(mu_s) = ${f(PlanetEpicycle.equationOfEpicycle(L.mu, p.r), 2)}°; the anomaly advances ${f(2 * (180 - L.mu), 2)}°;` +
			` mean motion over the loop ${f(p.n * L.days, 2)}°`
	);
	console.log(
		`back ${f(L.arc, 3)}° = ${Math.floor(L.arc)}°${f((L.arc % 1) * 60, 1)}' in ${f(L.days, 1)} days; Ptolemy ${f(fromSexagesimal(16, 18, 44), 3)}° and about 73 days`
	);

	// Apollonius' ratio at the first station: the half chord of the
	// epicycle on the line of sight, over the distance from the Earth to the
	// nearer intersection (the planet itself)
	const P = [1 + p.r * cos(L.mu), p.r * sin(L.mu)];
	const distance = Math.hypot(P[0], P[1]);
	const along = P[0] / distance; // the projection of K = (1, 0) on the line
	const halfChord = Math.sqrt(along * along - (1 - p.r * p.r));

	console.log(
		`Apollonius: planet at ${f(distance, 4)}, nearer intersection ${f(along - halfChord, 4)}, half chord ${f(halfChord, 4)};` +
			` ratio ${f(halfChord / distance, 4)}; n / n_mu = ${f(p.n / p.nMu, 4)}`
	);
	console.log(
		`no loop for r <= ${f(PlanetEpicycle.loopThreshold(p.n, p.nMu), 4)}, ${f(60 * PlanetEpicycle.loopThreshold(p.n, p.nMu), 1)} where R = 60`
	);
	['jupiter', 'saturn'].forEach(body => {
		const q = PTOLEMY[body];
		const M = PlanetEpicycle.loop(q.r, q.n, q.nMu);
		const s = SUMMARY[body];

		console.log(
			`${body}: r = ${f(q.r, 4)} (threshold ${f(PlanetEpicycle.loopThreshold(q.n, q.nMu), 4)}): back ${f(M.arc, 1)}° in ${f(M.days, 0)} days;` +
				` reference mean, 2001 - 2040, ${f(mean(s.arcs), 1)}° in ${f(mean(s.days), 0)} days`
		);
	});
}

title("Exercise 2: synodic periods from sidereal periods; Ptolemy's Mars (IX 3)");
{
	const sidereal = rate => (36525 * 360) / rate;
	// the rates of Standish's mean longitudes, in the fixed frame of J2000
	const rateOf = body => Ephem.ELEMENTS[body].rate[3];
	const year = sidereal(rateOf('emb'));
	const RATES = Object.fromEntries(
		['mercury', 'venus', 'mars', 'jupiter', 'saturn'].map(body => [body, rateOf(body)])
	);

	console.log(`the Earth's sidereal period ${f(year, 3)} days (Standish)`);
	Object.entries(RATES).forEach(([body, rate]) => {
		const P = sidereal(rate);
		const S = 1 / Math.abs(1 / P - 1 / year);

		console.log(`${body.padEnd(8)} sidereal period ${f(P, 2)} days; synodic period ${f(S, 2)} days`);
	});

	const ptolemyYear = fromSexagesimal(365, 14, 48);
	const span = 79 * ptolemyYear + fromSexagesimal(3, 13);
	const S = span / 37;
	const P = span / (42 + fromSexagesimal(3, 10) / 360);

	console.log(
		`Ptolemy's year ${f(ptolemyYear, 5)} days; 79 years + 3;13 days (${f(fromSexagesimal(3, 13), 3)} days) = ${f(span, 2)} days (Toomer: 28857;43 = ${f(fromSexagesimal(28857, 43), 2)})`
	);
	console.log(
		`3;10° = ${f(fromSexagesimal(3, 10), 3)}°; the mean Sun in 3;13 days, at Ptolemy's rate, ${f(fromSexagesimal(3, 13) * fromSexagesimal(0, 59, 8, 17, 13, 12, 31), 3)}°`
	);
	console.log(
		`synodic period ${f(S, 3)} days (modern ${f(360 / marsMotions.nMu, 3)}); period in ecliptic longitude ${f(P, 3)} days (modern ${f(360 / mars.n, 3)})`
	);
	console.log(
		`turns ${f(42 + fromSexagesimal(3, 10) / 360, 4)}; differences ${f((S - 360 / marsMotions.nMu) * 1440, 1)} minutes and ${f((P - 360 / mars.n) * 1440, 0)} minutes`
	);
}

title('Exercise 3: the oppositions of 2018 and 2027 in the model');
{
	const centre = jd => MARS_FIT.L0 + MARS_FIT.n * (jd - J2000);
	const modelOpposition = (a, b) => bisect(jd => norm180(meanSun(jd) - centre(jd) - 180), a, b);

	[2018, 2027].forEach(year => {
		const l = marsLoops.find(x => Time.calendarDate(x.middle).year === year);
		const m = modelOpposition(l.middle - 60, l.middle + 60);

		console.log(
			`${year}: model opposition ${when(m)} at ${f(fitted(m), 1)}°; real ${when(l.middle)} at ${f(l.lon, 1)}°` +
				` (${f(m - l.middle, 1)} days, ${f(norm180(fitted(m) - l.lon), 1)}°); real loop ${f(l.arc, 1)}° in ${f(l.days, 0)} days,` +
				` model ${f(fitLoop.arc, 1)}° in ${f(fitLoop.days, 0)} days; distance ${f(Ephem.position('mars', l.middle).dist, 2)} au;` +
				` the real Mars ${f(norm180(L0s[meanOppositions.findIndex(jd => Math.abs(jd - l.middle) < 10)] - L0fit), 1)}° from K at its opposition to the mean Sun`
		);
	});
}

/* ==========================================================================
   9. THE SCALES OF THE FIGURES
   ========================================================================== */

title('Scales');
{
	// Figure 2: the reference daily motions, 2001 - 2040, per planet
	Object.keys(KINDS).forEach(body => {
		const values = [];

		for (let jd = START; jd < END; jd += 1) {
			values.push(speed(body, jd));
		}

		console.log(`Figure 2, ${body}: daily motion ${range(values, 3)}°`);
	});

	// Figure 3(b): the model's daily motion for every r of the slider
	const R_MAX = 0.8;
	const views = { mars: PlanetEpicycle.motions(MARS_FIT), venus: PlanetEpicycle.motions(VENUS_MEAN) };

	Object.entries(views).forEach(([body, m]) => {
		let lo = Infinity;
		let hi = -Infinity;

		for (let r = 0; r <= R_MAX + 1e-9; r += 0.001) {
			lo = Math.min(lo, PlanetEpicycle.dailyMotion(180, r, m.n, m.nMu));
			hi = Math.max(hi, PlanetEpicycle.dailyMotion(0, r, m.n, m.nMu));
		}

		console.log(
			`Figure 3(b), ${body}: r in [0, ${R_MAX}], daily motion ${f(lo, 3)} to ${f(hi, 3)}°; Ptolemy's r ${f(PTOLEMY[body].r, 4)}, no loop below ${f(PlanetEpicycle.loopThreshold(m.n, m.nMu), 4)}`
		);
	});
	console.log(
		`VENUS_MEAN: mu0 ${f(VENUS_MEAN.mu0, 4)}°, nMu ${f(VENUS_MEAN.nMu, 7)}°/day, synodic ${f(360 / VENUS_MEAN.nMu, 2)} days`
	);

	// Figure 5: the arcs and the intervals of 2001 - 2040, in the
	// geometric positions every two days that the figure computes
	const quick = PlanetEpicycle.referenceEvents('mars', 'outer', START - 200, END + 200, { apparent: false, step: 2 });
	const quickLoops = quick.loops.filter(l => l.middle >= START && l.middle < END);
	const largest = Math.max(...quickLoops.map((l, i) => Math.abs(l.arc - residualLoops[i].arc)));

	console.log(
		`Figure 5: arcs ${range(
			quickLoops.map(l => l.arc),
			2
		)}°; ${quickLoops.length} loops; the figure's arcs within ${f(largest * 60, 2)}' of the quoted ones`
	);
}
