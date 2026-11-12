/* ==========================================================================
   NUMBERS FOR PAGE 3.3 "ECLIPSES" (tools/numbers/3.3-eclipses.js)
   Loads the site's shared code (common, time, ephemeris, stars and the
   models mean-sun.js, solar-eccentric.js, lunar-epicycle.js,
   lunar-latitude.js, eclipses.js) in a Node vm context and prints every
   number quoted on the page, in page order.

   Run from the repository root:  node tools/numbers/3.3-eclipses.js
   (about a minute: it finds every new and full Moon of 2016 - 2030, and
   the Moon's node crossings and distances over 1926 - 2025)

   The reference eclipses are those of the reference sky (apparent
   positions of date), with the criteria of models/eclipses.js and the
   reference distances; section 3 checks them against NASA's list.

   TABLE OF CONTENTS
	 1. Loading the shared code
	 2. Formatting and searching
	 3. The reference eclipses, checked against NASA
	 4. Observation
	 5. The plate: the Moon near Regulus in August 2026
	 6. Model: the latitude
	 7. Model: the months
	 8. Model: the shadow and the limits
	 9. Model: the eclipse seasons
	10. Fit, then Ptolemy's parameters (history block)
	11. Test: the latitude
	12. Test: the eclipses
	13. Test: Ptolemy (history block)
	14. Residual
	15. Exercises
	16. The scales of the figures
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
	'shared/models/mean-sun.js',
	'shared/models/solar-eccentric.js',
	'shared/models/lunar-epicycle.js',
	'shared/models/lunar-latitude.js',
	'shared/models/eclipses.js'
]);
const { norm180, norm360, sin, cos, asin, tan, Time, Ephem, Stars } = shared;
const { MeanSun, SolarEccentric, LunarEpicycle, LunarLatitude, Eclipses } = shared;

/* ==========================================================================
   2. FORMATTING AND SEARCHING
   ========================================================================== */

const title = text => console.log(`\n=== ${text} ===`);
const f = (x, digits) => x.toFixed(digits);
const arcmin = (deg, digits = 1) => `${f(deg * 60, digits)}'`;
const date = jd => Time.formatDate(jd);
const mean = list => list.reduce((s, v) => s + v, 0) / list.length;
const rms = list => Math.sqrt(list.reduce((s, v) => s + v * v, 0) / list.length);
const maxAbs = list => Math.max(...list.map(Math.abs));
const Y = (year, month = 1, day = 1) => Time.julianDay(year, month, day);

/* "hh:mm" of a JD. */
function clock(jd) {
	const minutes = Math.round(((((jd + 0.5) % 1) + 1) % 1) * 1440) % 1440;

	return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

const minimise = Eclipses.minimise;

/* ==========================================================================
   3. THE REFERENCE ECLIPSES, CHECKED AGAINST NASA
   Every new and full Moon of the reference sky, the least distance of the
   Moon from the Sun or from the centre of the shadow near it, and the
   kind of eclipse by the criteria of models/eclipses.js with the
   reference distances (Eclipses.reference), computed once each.
   ========================================================================== */

const moonLon = jd => Ephem.longitude('moon', jd);
const sunLon = jd => Ephem.longitude('sun', jd);
const REFERENCE_CACHE = new Map();

/* The reference syzygy of index k (integer: new Moon; + 0.5: full Moon). */
function referenceSyzygy(k) {
	if (!REFERENCE_CACHE.has(k)) {
		REFERENCE_CACHE.set(k, computeReferenceSyzygy(k));
	}

	return REFERENCE_CACHE.get(k);
}

function computeReferenceSyzygy(k) {
	return Eclipses.reference(k);
}

/* The syzygies whose mean moments fall in [from, to). */
function referenceSyzygies(from, to) {
	const list = [];

	for (let k = Eclipses.indexNear(from, true) - 1; Eclipses.meanSyzygy(k) < to; k += 0.5) {
		if (Eclipses.meanSyzygy(k) >= from) {
			list.push(referenceSyzygy(k));
		}
	}

	return list;
}

/* Two decades: the Observation's, 2016 - 2025, the last documented one
   (STRUCTURE.md §5), and the Test's, 2021 - 2030, which may run into the
   future. Fits use documented moments only, up to DOCUMENTED_END. */
const OBS_DECADE = referenceSyzygies(Y(2016), Y(2026));
const DECADE = referenceSyzygies(Y(2021), Y(2031));
const DOCUMENTED_END = Y(2026, 11, 1);
const eclipsesOf = list => list.filter(s => s.kind);

/* NASA's eclipses of 2016-2030 (F. Espenak, eclipse.gsfc.nasa.gov,
   SEdecade2011 and LEdecade2011, retrieved 2026-11-12, and SEdecade2021
   and LEdecade2021, retrieved 2026-10-30): the time (TD) of greatest
   eclipse, the kind (hybrid as total) and, for the lunar ones, the
   umbral magnitude. NASA lists penumbral eclipses besides. */
// prettier-ignore
const NASA_SOLAR_2016 = [
	['2016-03-09 01:58', 'total'], ['2016-09-01 09:08', 'annular'], ['2017-02-26 14:54', 'annular'],
	['2017-08-21 18:26', 'total'], ['2018-02-15 20:52', 'partial'], ['2018-07-13 03:02', 'partial'],
	['2018-08-11 09:47', 'partial'], ['2019-01-06 01:42', 'partial'], ['2019-07-02 19:24', 'total'],
	['2019-12-26 05:18', 'annular'], ['2020-06-21 06:41', 'annular'], ['2020-12-14 16:14', 'total']
];
// prettier-ignore
const NASA_LUNAR_2016 = [
	['2017-08-07 18:21', 'partial', 0.246], ['2018-01-31 13:31', 'total', 1.315],
	['2018-07-27 20:22', 'total', 1.609], ['2019-01-21 05:13', 'total', 1.195],
	['2019-07-16 21:31', 'partial', 0.653]
];
// prettier-ignore
const NASA_SOLAR = [
	['2021-06-10 10:43', 'annular'], ['2021-12-04 07:34', 'total'], ['2022-04-30 20:42', 'partial'],
	['2022-10-25 11:01', 'partial'], ['2023-04-20 04:17', 'total'], ['2023-10-14 18:00', 'annular'],
	['2024-04-08 18:18', 'total'], ['2024-10-02 18:46', 'annular'], ['2025-03-29 10:48', 'partial'],
	['2025-09-21 19:43', 'partial'], ['2026-02-17 12:13', 'annular'], ['2026-08-12 17:47', 'total'],
	['2027-02-06 16:00', 'annular'], ['2027-08-02 10:07', 'total'], ['2028-01-26 15:08', 'annular'],
	['2028-07-22 02:56', 'total'], ['2029-01-14 17:13', 'partial'], ['2029-06-12 04:06', 'partial'],
	['2029-07-11 15:37', 'partial'], ['2029-12-05 15:03', 'partial'], ['2030-06-01 06:29', 'annular'],
	['2030-11-25 06:51', 'total']
];
// prettier-ignore
const NASA_LUNAR = [
	['2021-05-26 11:19', 'total', 1.009], ['2021-11-19 09:04', 'partial', 0.974],
	['2022-05-16 04:12', 'total', 1.414], ['2022-11-08 11:00', 'total', 1.359],
	['2023-10-28 20:15', 'partial', 0.122], ['2024-09-18 02:45', 'partial', 0.085],
	['2025-03-14 06:59', 'total', 1.178], ['2025-09-07 18:12', 'total', 1.362],
	['2026-03-03 11:34', 'total', 1.151], ['2026-08-28 04:14', 'partial', 0.93],
	['2028-01-12 04:14', 'partial', 0.066], ['2028-07-06 18:20', 'partial', 0.389],
	['2028-12-31 16:53', 'total', 1.246], ['2029-06-26 03:23', 'total', 1.844],
	['2029-12-20 22:43', 'total', 1.117], ['2030-06-15 18:34', 'partial', 0.502]
];

/* JD(TT) of a NASA "yyyy-mm-dd hh:mm" (TD). */
function nasaJd(text) {
	const [d, t] = text.split(' ');
	const [y, m, day] = d.split('-').map(Number);
	const [h, min] = t.split(':').map(Number);

	return Time.julianDayTime(y, m, day, h, min);
}

title('3. The reference eclipses of 2016-2025 and of 2021-2030 against NASA');
{
	const check = (list, nasa) => {
		let agree = 0;
		const dt = [];
		const dmag = [];

		nasa.forEach(([when, kind, mag]) => {
			const jd = nasaJd(when);
			const match = list.find(s => Math.abs(s.jd - jd) < 0.2);

			if (match && match.kind === kind) {
				agree++;
				dt.push((match.jd - jd) * 1440);
				if (mag !== undefined) {
					dmag.push(match.magnitude - mag);
				}
			}
		});

		const extra = list.filter(s => !nasa.some(([when]) => Math.abs(s.jd - nasaJd(when)) < 0.2));

		console.log(
			`  ${agree} of ${nasa.length} agree in date and kind, ${extra.length} extra; greatest eclipse within ${f(maxAbs(dt), 1)} min` +
				(dmag.length ? `; magnitudes within ${f(maxAbs(dmag), 3)}` : '')
		);
	};

	const inSpan = (nasa, from, to) => nasa.filter(([when]) => nasaJd(when) >= from && nasaJd(when) < to);
	const nasaSolar = NASA_SOLAR_2016.concat(NASA_SOLAR);
	const nasaLunar = NASA_LUNAR_2016.concat(NASA_LUNAR);

	[
		['2016-2025', OBS_DECADE, Y(2016), Y(2026)],
		['2021-2030', DECADE, Y(2021), Y(2031)]
	].forEach(([label, decade, from, to]) => {
		const ours = eclipsesOf(decade);

		console.log(
			`${label}: solar eclipses ${ours.filter(s => s.solar).length}, umbral lunar eclipses ${ours.filter(s => !s.solar).length}, together ${ours.length}`
		);
		check(
			ours.filter(s => s.solar),
			inSpan(nasaSolar, from, to)
		);
		check(
			ours.filter(s => !s.solar),
			inSpan(nasaLunar, from, to)
		);
	});
}

/* ==========================================================================
   THE MOON'S RATES AND MEAN DISTANCE, FITTED (sections 4, 7, 8 and 10)
   n and n_M are page 3.1's. n_F, with i and F0, by least squares on the
   reference Moon's ecliptic latitude at every new and full Moon of
   1926.0 - 2026.0 (the Fit then refits i and F0 to the last 25 documented
   ones with this n_F); the mean distance, the average of the reference
   Moon's distance every quarter of a day over the same century.
   ========================================================================== */

const CENTURY = [Y(1926), Y(2026)];
const CENTURY_SYZ = referenceSyzygies(CENTURY[0], CENTURY[1]);

/* Gauss-Newton on (i, F0, nF) against the latitudes at 'syzygies'; the
   Jacobian by differences, the 3 x 3 normal equations by Cramer. Returns
   the parameters, the rms residual (deg) and the standard error of nF. */
function fitLatitudeRate(syzygies) {
	let q = [5, LunarLatitude.MEEUS.F0, 13.23]; // starting values only
	const resid = v =>
		syzygies.map(
			s =>
				LunarLatitude.state(
					Object.assign({}, LunarEpicycle.FIT_2026, { i: v[0], F0: v[1], nF: v[2] }),
					s.syzygy
				).beta - s.betaSyzygy
		);
	const det3 = m =>
		m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
		m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
		m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
	let N = null;

	for (let step = 0; step < 6; step++) {
		const r = resid(q);
		const J = [1e-5, 1e-5, 1e-9].map((h, k) => {
			const moved = q.slice();

			moved[k] += h;

			return resid(moved).map((v, i) => (v - r[i]) / h);
		});

		N = [0, 1, 2].map(a => [0, 1, 2].map(b => J[a].reduce((sum, v, i) => sum + v * J[b][i], 0)));

		const g = [0, 1, 2].map(a => J[a].reduce((sum, v, i) => sum + v * r[i], 0));
		const D = det3(N);
		const delta = [0, 1, 2].map(k => det3(N.map((row, i) => row.map((v, j) => (j === k ? g[i] : v)))) / D);

		q = q.map((v, k) => v - delta[k]);
	}

	const r = resid(q);
	const scatter = Math.sqrt(r.reduce((sum, v) => sum + v * v, 0) / (r.length - 3));
	const inverse22 = (N[0][0] * N[1][1] - N[0][1] * N[1][0]) / det3(N);

	return { i: q[0], F0: norm360(q[1]), nF: q[2], rms: scatter, nFError: scatter * Math.sqrt(inverse22) };
}

const RATE_FIT = fitLatitudeRate(CENTURY_SYZ);

const MEAN_DISTANCE_FIT = (() => {
	let sum = 0;
	let count = 0;

	for (let jd = CENTURY[0]; jd < CENTURY[1]; jd += 0.25) {
		sum += Ephem.moon(jd).dist;
		count++;
	}

	return sum / count;
})();

const RATES = {
	n: LunarEpicycle.FIT_2026.n,
	nM: LunarEpicycle.FIT_2026.nM,
	nF: RATE_FIT.nF,
	nSun: MeanSun.MODERN.n
};
const P_SYNODIC = 360 / (RATES.n - RATES.nSun);
const P_DRACONITIC = 360 / RATES.nF;
const P_ANOMALISTIC = 360 / RATES.nM;
const NODE_RATE = RATES.nF - RATES.n; // westward, deg a day
const SUN_FROM_NODE_RATE = RATES.nSun + NODE_RATE;
const ECLIPSE_YEAR = 360 / SUN_FROM_NODE_RATE;

title('The rates and the mean distance, fitted over 1926.0 - 2026.0');
console.log(
	`${CENTURY_SYZ.length} new and full Moons: n_F = ${f(RATE_FIT.nF, 9)}° a day +- ${f(RATE_FIT.nFError * 36525, 3)}° a century (i ${f(RATE_FIT.i, 4)}°, rms ${arcmin(RATE_FIT.rms, 2)}); draconitic month ${f(360 / RATE_FIT.nF, 6)} d`
);
console.log(
	`   FIT_2026 in lunar-latitude.js: ${LunarLatitude.FIT_2026.nF}; Meeus ${f(LunarLatitude.MEEUS.nF, 9)}, ours - Meeus ${f((RATE_FIT.nF - LunarLatitude.MEEUS.nF) * 36525, 4)}° a century`
);
console.log(
	`the reference Moon's mean distance ${f(MEAN_DISTANCE_FIT, 1)} km (Eclipses.MOON_MEAN_DISTANCE ${Eclipses.MOON_MEAN_DISTANCE}; Meeus' constant term 385000.56)`
);

/* ==========================================================================
   4. OBSERVATION
   ========================================================================== */

/* The mean longitude of the ascending node of the reference Moon, Meeus
   47.7 (deg). */
function meanNode(jd) {
	const T = Time.centuries(jd);

	return norm360(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T);
}

/* The Moon's greatest |latitude| in each half draconitic month from 'from'. */
function latitudePeaks(from, to) {
	const peaks = [];

	for (let jd = from; jd < to; jd += 27.2122 / 2) {
		peaks.push(-minimise(t => -Math.abs(Ephem.moon(t).lat), jd, jd + 13.6)[1]);
	}

	return peaks;
}

/* Group eclipses into seasons (no more than 40 days apart). */
function seasonsOf(list) {
	const seasons = [];

	list.forEach(s => {
		const last = seasons[seasons.length - 1];

		if (last && s.jd - last[last.length - 1].jd < 40) {
			last.push(s);
		} else {
			seasons.push([s]);
		}
	});

	return seasons;
}

title('4. Observation');
{
	const ours = eclipsesOf(OBS_DECADE);

	console.log(`new and full Moons 2016-2025: ${OBS_DECADE.length}; eclipses ${ours.length}`);

	for (let year = 2016; year <= 2025; year++) {
		const inYear = ours.filter(s => s.jd >= Y(year) && s.jd < Y(year + 1));
		const text = inYear.map(s => `${date(s.jd).replace(/ \d{4}$/, '')} ${s.solar ? 'S' : 'L'}-${s.kind}`);

		console.log(
			`${year}: ${inYear.filter(s => s.solar).length} solar, ${inYear.filter(s => !s.solar).length} lunar   ${text.join(', ')}`
		);
	}

	const seasons = seasonsOf(ours);
	const middles = seasons.map(list => mean(list.map(s => s.jd)));
	const gaps = middles.slice(1).map((m, i) => m - middles[i]);

	console.log(
		`eclipse seasons: ${seasons.length}, ${f(Math.min(...gaps), 0)} to ${f(Math.max(...gaps), 0)} days apart, mean ${f(mean(gaps), 1)}`
	);
	console.log(`  eclipses in each season: ${seasons.map(list => list.length).join(' ')}`);
	console.log(
		`  a year later the season comes 365.24 - 2 x ${f(mean(gaps), 1)} = ${f(365.2422 - 2 * mean(gaps), 0)} days earlier`
	);

	const peaks = latitudePeaks(Y(2016), Y(2026));

	console.log(
		`the Moon's greatest latitude, 2016-2025: ${f(Math.min(...peaks), 2)}° to ${f(Math.max(...peaks), 2)}°`
	);

	/* The node's motion from the measured months (section 7): the Moon
	   returns to the node before it returns to the same ecliptic
	   longitude. */
	const nodeRate = NODE_RATE;

	console.log(
		`the mean node moves west ${f(nodeRate, 5)}° a day, ${f(nodeRate * 365.25, 2)}° a year; a turn in ${f(360 / nodeRate, 1)} days = ${f(360 / nodeRate / 365.25, 2)} years`
	);

	/* The Sun's distance from the nearest mean node at each eclipse. */
	const fromNode = s => Math.abs(Eclipses.nodeAngle(Ephem.sun(s.jd).lon - meanNode(s.jd)));
	const solar = ours.filter(s => s.solar).map(fromNode);
	const lunar = ours.filter(s => !s.solar).map(fromNode);

	console.log(
		`the Sun from the nearest node at the eclipses: solar up to ${f(Math.max(...solar), 1)}°, lunar up to ${f(Math.max(...lunar), 1)}°`
	);
	console.log(
		`  full Moons with the Sun nearest the node than ${f(Math.max(...lunar), 1)}° and no eclipse: ${OBS_DECADE.filter(s => !s.solar && !s.kind && fromNode(s) < Math.max(...lunar)).length}`
	);
}

/* ==========================================================================
   5. THE PLATE: THE MOON NEAR REGULUS IN AUGUST 2026
   ========================================================================== */

title('5. The plate: the Moon near Regulus, August 2026');
{
	const newMoon = referenceSyzygy(Eclipses.indexNear(Y(2026, 8, 12), true));
	const crossing = shared.bisect(jd => Ephem.moon(jd).lat, newMoon.jd, newMoon.jd + 3, 50);
	const regulus = Stars.find('Regulus');
	const p = Stars.ofDate(regulus, Y(2026));
	const e = Ephem.equatorialToEcliptic(p.ra, p.dec, Ephem.meanObliquity(Y(2026)));

	console.log(
		`new Moon ${date(newMoon.jd)} ${clock(newMoon.jd)} TT: the Sun at ${f(Ephem.sun(newMoon.jd).lon, 1)}°, the Moon ${f(Ephem.moon(newMoon.jd).lat, 2)}° north`
	);
	console.log(
		`the Moon crosses the ecliptic southward ${date(crossing)} ${clock(crossing)} TT at ${f(Ephem.moon(crossing).lon, 1)}°, ${f((crossing - newMoon.jd) * 24, 0)} h after the new Moon`
	);
	console.log(`Regulus 2026: lambda ${f(e.lon, 2)}°, beta ${f(e.lat, 2)}°`);
	[10, 11, 12, 13, 14, 15].forEach(day => {
		const m = Ephem.moon(Y(2026, 8, day));

		console.log(`  ${day} Aug 0h TT: Moon lambda ${f(m.lon, 1)}°, beta ${f(m.lat, 2)}°`);
	});
}

/* ==========================================================================
   6. MODEL: THE LATITUDE
   ========================================================================== */

const LAT = LunarLatitude.FIT_2026;

title('6. Model: the latitude');
{
	let worst = 0;

	for (let F = 0; F <= 90; F += 0.05) {
		worst = Math.max(worst, Math.abs(LunarLatitude.latitude(F, LAT.i) - LAT.i * sin(F)));
	}

	const reduction = asin(tan(LAT.i / 2) ** 2);

	console.log(`beta = i sin F to first order: largest error ${f(worst * 3600, 0)}" (i = ${f(LAT.i, 2)}°)`);
	console.log(`reduction to the ecliptic: greatest ${arcmin(reduction, 2)} = asin tan^2(i/2)`);

	/* The reduction as an eccentric: lambda - Omega - F = -atan2(e sin 2F,
	   1 + e cos 2F) with e = tan^2(i/2). Checked against the exact
	   tan(lambda - Omega) = cos i tan F, and its value where eclipses
	   happen (the Sun within 12.1° and 18.3° of a node). */
	const e = tan(LAT.i / 2) ** 2;
	const exact = F => norm180(shared.atan2d(cos(LAT.i) * sin(F), cos(F)) - F);
	const asEccentric = F => -shared.atan2d(e * sin(2 * F), 1 + e * cos(2 * F));
	let identity = 0;
	let largest = { F: 0, value: 0 };

	for (let F = 0; F < 360; F += 0.01) {
		identity = Math.max(identity, Math.abs(exact(F) - asEccentric(F)));
		if (Math.abs(exact(F)) > largest.value) {
			largest = { F, value: Math.abs(exact(F)) };
		}
	}

	console.log(
		`  e = tan^2(i/2) = ${f(e, 6)} (i = ${f(LAT.i, 2)}°); the two forms agree within ${(identity * 3600).toExponential(1)}"`
	);
	console.log(
		`  largest ${arcmin(largest.value, 2)} at F = ${f(largest.F, 2)}° (2F = 90° + asin e: F = ${f((90 + asin(e)) / 2, 2)}°)`
	);
	console.log(`  first order -e sin 2F: largest ${arcmin(e * (180 / Math.PI), 2)}`);
	[12.1, 18.3].forEach(F => {
		console.log(`  at F = ${F}°: lambda - Omega - F = ${arcmin(exact(F), 2)}`);
	});
}

/* ==========================================================================
   7. MODEL: THE MONTHS
   ========================================================================== */

title('7. Model: the months');
console.log(`n_F = ${f(RATES.nF, 5)}° a day, n = ${f(RATES.n, 5)}°: the node moves west ${f(NODE_RATE, 5)}° a day`);
console.log(
	`draconitic month ${f(P_DRACONITIC, 5)} d; tropical ${f(360 / RATES.n, 5)} d; synodic ${f(P_SYNODIC, 5)} d; anomalistic ${f(P_ANOMALISTIC, 5)} d`
);
console.log(
	`the Sun from the node: ${f(SUN_FROM_NODE_RATE, 4)}° a day; eclipse year ${f(ECLIPSE_YEAR, 3)} d, half ${f(ECLIPSE_YEAR / 2, 2)} d`
);
console.log(`  check 1/P_d - 1/P_s: ${f(1 / (1 / P_DRACONITIC - 1 / P_SYNODIC), 3)} d`);

/* ==========================================================================
   8. MODEL: THE SHADOW AND THE LIMITS
   ========================================================================== */

/* The limits for a Moon at moonKm and a Sun at sunAu, in latitude and
   in angle from the node. */
function limitsFor(moonKm, sunAu) {
	const z = Eclipses.sizes(moonKm, sunAu);
	const l = Eclipses.limits(z);
	const inF = b => LunarLatitude.argumentForLatitude(b, LAT.i);

	return {
		z,
		l,
		F: { lunar: inF(l.lunar), lunarTotal: inF(l.lunarTotal), solar: inF(l.solar), central: inF(l.central) }
	};
}

const MOON_NEAREST = 356400; // rounded, below the least distance at a syzygy (printed below)
const MOON_FARTHEST = 406700;

title('8. Model: the shadow and the limits');
{
	const moonKm = [];

	for (let jd = Y(2016); jd < Y(2026); jd += 0.25) {
		moonKm.push(Ephem.moon(jd).dist);
	}

	console.log(
		`the Moon's distance 2016-2025: ${f(Math.min(...moonKm), 0)} to ${f(Math.max(...moonKm), 0)} km (slider ${MOON_NEAREST} to ${MOON_FARTHEST})`
	);

	const cases = [
		['mean', Eclipses.MOON_MEAN_DISTANCE, 1],
		['nearest', Math.min(...moonKm), 1],
		['farthest', Math.max(...moonKm), 1]
	];

	cases.forEach(([name, km, au]) => {
		const { z, l, F } = limitsFor(km, au);

		console.log(
			`${name} Moon (${f(km, 0)} km), Sun at 1 au: s ${arcmin(z.sM)}, pi ${arcmin(z.pM)}, s_sun ${arcmin(z.sS)}, pi_sun ${f(z.pS * 3600, 1)}"`
		);
		console.log(`  u = 1.01 pi + pi_sun - s_sun = ${arcmin(l.umbra)} = ${f(l.umbra / z.sM, 2)} Moon radii`);
		console.log(
			`  lunar: u + s = ${arcmin(l.lunar)} -> ${f(F.lunar, 1)}° from the node; total u - s = ${arcmin(l.lunarTotal)} -> ${f(F.lunarTotal, 1)}°`
		);
		console.log(
			`  solar: pi - pi_sun + s + s_sun = ${arcmin(l.solar)} -> ${f(F.solar, 1)}°; central pi - pi_sun = ${arcmin(l.central)} -> ${f(F.central, 1)}°`
		);
	});

	const sunNear = limitsFor(Eclipses.MOON_MEAN_DISTANCE, 0.98329);
	const sunFar = limitsFor(Eclipses.MOON_MEAN_DISTANCE, 1.01671);

	console.log(
		`the Sun's distance (0.983 to 1.017 au) moves the solar limit by ${arcmin(sunNear.l.solar - sunFar.l.solar)} and the lunar by ${arcmin(sunFar.l.lunar - sunNear.l.lunar)}`
	);

	/* Ptolemy's limits and sizes (VI 5). */
	const PL = Eclipses.PTOLEMY_LIMITS;

	console.log(
		`Ptolemy VI 5, at mean syzygy: lunar ${f(PL.lunar, 2)}°, solar ${f(PL.solarNorth, 2)}° (Moon north) and ${f(PL.solarSouth, 2)}° (south); true: 12;12 = ${f(12.2, 2)}°, 17;41 = ${f(17 + 41 / 60, 2)}°, 8;22 = ${f(8 + 22 / 60, 2)}°`
	);
}

/* ==========================================================================
   9. MODEL: THE ECLIPSE SEASONS
   ========================================================================== */

title('9. Model: the eclipse seasons');
{
	const near = limitsFor(MOON_NEAREST, 1);
	const far = limitsFor(MOON_FARTHEST, 1);
	const days = x => (2 * x) / SUN_FROM_NODE_RATE;

	console.log(
		`solar season: ${f(days(far.F.solar), 1)} to ${f(days(near.F.solar), 1)} days (limits ${f(far.F.solar, 1)}° to ${f(near.F.solar, 1)}°), against the synodic month ${f(P_SYNODIC, 2)} d`
	);
	console.log(
		`lunar season: ${f(days(far.F.lunar), 1)} to ${f(days(near.F.lunar), 1)} days (limits ${f(far.F.lunar, 1)}° to ${f(near.F.lunar, 1)}°)`
	);
	console.log(
		`the Sun moves ${f(P_SYNODIC * SUN_FROM_NODE_RATE, 2)}° from the node in a synodic month; half a month ${f((P_SYNODIC / 2) * SUN_FROM_NODE_RATE, 2)}°`
	);
	console.log(
		`Ptolemy VI 6: six months move the Moon ${f((6 * 29.5305941 * LunarLatitude.PTOLEMY.nF) % 360, 3)}° in latitude`
	);
}

/* ==========================================================================
   10. FIT
   ========================================================================== */

/* Least squares (Gauss-Newton) for i and F0, with the fitted nF, to the
   reference latitudes at the reference syzygies. */
function fitLatitude(syzygies) {
	let i = 5;
	let F0 = LunarLatitude.MEEUS.F0; // a starting value only
	const nF = RATES.nF;
	const resid = (ii, ff) =>
		syzygies.map(s => {
			const p = Object.assign({}, LunarEpicycle.FIT_2026, { F0: ff, nF, i: ii });

			return LunarLatitude.state(p, s.syzygy).beta - s.betaSyzygy;
		});

	for (let step = 0; step < 10; step++) {
		const r = resid(i, F0);
		const ri = resid(i + 1e-5, F0).map((v, j) => (v - r[j]) / 1e-5);
		const rf = resid(i, F0 + 1e-5).map((v, j) => (v - r[j]) / 1e-5);
		const a = ri.reduce((s, v) => s + v * v, 0);
		const b = ri.reduce((s, v, j) => s + v * rf[j], 0);
		const d = rf.reduce((s, v) => s + v * v, 0);
		const gi = ri.reduce((s, v, j) => s + v * r[j], 0);
		const gf = rf.reduce((s, v, j) => s + v * r[j], 0);
		const det = a * d - b * b;

		i -= (d * gi - b * gf) / det;
		F0 -= (a * gf - b * gi) / det;
	}

	return { F0: norm360(F0), i, residuals: resid(i, F0) };
}

/* The fit uses the last 25 documented new and full Moons, from the end
   of October 2025 to October 2026; the Test's table and dots keep the
   new and full Moons of 2026. */
const FIT_SYZ = DECADE.filter(s => s.syzygy < DOCUMENTED_END).slice(-25);
const SYZ_2026 = DECADE.filter(s => s.syzygy >= Y(2026) && s.syzygy < Y(2027));

title('10. Fit');
{
	const fit = fitLatitude(FIT_SYZ);

	console.log(
		`fit to the ${FIT_SYZ.length} new and full Moons from ${date(FIT_SYZ[0].syzygy)} to ${date(FIT_SYZ[FIT_SYZ.length - 1].syzygy)}: i = ${f(fit.i, 6)}°, F0 = ${f(fit.F0, 6)}° (FIT_2026: i ${LAT.i}, F0 ${LAT.F0})`
	);
	console.log(
		`  i = ${f(fit.i, 2)}°; node at J2000 ${f(norm360(LunarEpicycle.FIT_2026.L0 - fit.F0), 2)}° (Meeus' mean node ${f(meanNode(2451545), 2)}°)`
	);
	console.log(`  residuals: largest ${arcmin(maxAbs(fit.residuals))}, rms ${arcmin(rms(fit.residuals))}`);

	const meanI = Object.assign({}, LAT, { i: 5.145 });
	const meanResid = FIT_SYZ.map(s => LunarLatitude.state(meanI, s.syzygy).beta - s.betaSyzygy);

	console.log(
		`  with the mean inclination 5.145° (Meeus' sin F term 5.128° and the Moon's whole range) the latitudes at the 25 are off by up to ${arcmin(maxAbs(meanResid))}`
	);
}

/* Ptolemy's parameters (the history block of the Fit). */
title("10. Fit: Ptolemy's parameters");
{
	/* Ptolemy's inclination (V 12): the Moon 2 1/8° from the zenith at
	   the northern limit near the summer solstice, the equator 30;58° and
	   the solstice 23;51° from the equator. */
	console.log(`Ptolemy V 12: 30;58 - 2 1/8 - 23;51 = ${f(30 + 58 / 60 - 2.125 - (23 + 51 / 60), 2)}°, "about 5°"`);
}

/* ==========================================================================
   11. TEST: THE LATITUDE
   ========================================================================== */

title('11. Test: the latitude');
{
	const meanI = Object.assign({}, LAT, { i: 5.145 });
	const sets = [
		['the fit', LAT],
		['the mean inclination 5.145°', meanI]
	];

	sets.forEach(([name, p]) => {
		const atSyzygies = FIT_SYZ.map(s => LunarLatitude.state(p, s.syzygy).beta - s.betaSyzygy);
		const all = [];

		for (let jd = Y(2026); jd < Y(2027); jd += 0.25) {
			all.push(LunarLatitude.state(p, jd).beta - Ephem.moon(jd).lat);
		}
		console.log(
			`${name}: at the 25 fitted new and full Moons within ${arcmin(maxAbs(atSyzygies))}; over 2026 within ${arcmin(maxAbs(all))}`
		);
	});

	/* The new and full Moons of 2021-2030 that the fit did not use. */
	const others = DECADE.filter(s => !FIT_SYZ.includes(s));
	const othersErr = others.map(s => LunarLatitude.state(LAT, s.syzygy).beta - s.betaSyzygy);

	console.log(
		`the fit at the other ${others.length} new and full Moons of 2021-2030: within ${arcmin(maxAbs(othersErr))}`
	);
}

/* ==========================================================================
   12. TEST: THE ECLIPSES
   ========================================================================== */

/* The model's eclipses against the reference over [from, to). */
function compare(model, from, to) {
	const ref = referenceSyzygies(from, to);
	const result = { real: 0, found: 0, missed: [], added: [], kind: 0, otherKind: [], dt: [], dmag: [], dbeta: [] };

	ref.forEach(r => {
		const m = Eclipses.predict(model, r.k);

		result.dbeta.push(m.beta - r.betaSyzygy);
		result.real += r.kind ? 1 : 0;

		if (r.kind && m.kind) {
			result.found++;
			result.dt.push((m.jd - r.jd) * 1440);
			result.kind += r.kind !== m.kind ? 1 : 0;
			if (r.kind !== m.kind) {
				result.otherKind.push(`${date(r.jd)} ${r.solar ? 'solar' : 'lunar'} ${r.kind}, the model ${m.kind}`);
			}
			if (!r.solar) {
				result.dmag.push(m.magnitude - r.magnitude);
			}
		} else if (r.kind) {
			result.missed.push(`${date(r.jd)} ${r.solar ? 'solar' : 'lunar'} ${r.kind} (least ${arcmin(r.least)})`);
		} else if (m.kind) {
			result.added.push(`${date(m.jd)} ${m.solar ? 'solar' : 'lunar'} ${m.kind}`);
		}
	});

	return result;
}

function printComparison(label, c) {
	console.log(
		`${label}: ${c.real} real eclipses; the model finds ${c.found}, misses ${c.missed.length}, adds ${c.added.length}; of another kind ${c.kind}`
	);
	console.log(
		`  its new or full Moon minus greatest eclipse: rms ${f(rms(c.dt), 0)} min, largest ${f(maxAbs(c.dt), 0)} min`
	);
	console.log(
		`  latitude at the syzygies: largest error ${arcmin(maxAbs(c.dbeta))}; lunar magnitudes within ${f(maxAbs(c.dmag), 2)}`
	);
	console.log(`  missed: ${c.missed.join('; ') || '-'}`);
	console.log(`  added: ${c.added.join('; ') || '-'}`);
	console.log(`  of another kind: ${c.otherKind.join('; ') || '-'}`);
}

title('12. Test: the eclipses');
{
	printComparison('2021-2030', compare(Eclipses.FIT_2026, Y(2021), Y(2031)));
	/* The Moon's path relative to the Sun near a node: tan K = tan i n / (n - nSun). */
	const K = Math.atan((tan(LAT.i) * RATES.n) / (RATES.n - RATES.nSun)) * (180 / Math.PI);

	console.log(
		`the relative path is inclined K = ${f(K, 2)}°: least distance = ${f(Math.cos((K * Math.PI) / 180), 4)} |beta|`
	);

	/* NASA's kinds of four eclipses outside 2021-2030 that test the
	   criterion for total and annular (eclipse.gsfc.nasa.gov): two
	   non-central, one total, one central annular. */
	[
		['2014-04-29', 'annular'],
		['2032-05-09', 'annular'],
		['2043-04-09', 'total'],
		['2043-10-03', 'annular']
	].forEach(([when, kind]) => {
		const [y, mo, d] = when.split('-').map(Number);
		const r = referenceSyzygy(Eclipses.indexNear(Y(y, mo, d), true));

		console.log(`  ${when}: reference ${r.kind}, NASA ${kind}`);
	});

	/* Where the time errors come from: the model's Moon and Sun against
	   the reference at the middle of each eclipse of 2021-2030. */
	const eclipses = DECADE.filter(r => r.kind);
	const moonFit = LunarEpicycle.make(Eclipses.FIT_2026.moon);
	const sunFit = SolarEccentric.make(Eclipses.FIT_2026.sun);
	const moonErr = eclipses.map(r => norm180(moonFit(r.jd) - moonLon(r.jd)));
	const sunErr = eclipses.map(r => norm180(sunFit(r.jd) - sunLon(r.jd)));
	const rate = (RATES.n - RATES.nSun) / 24;

	console.log(
		`at the ${eclipses.length} eclipses of 2021-2030: the epicycle's ecliptic longitude within ${arcmin(maxAbs(moonErr))}, the Sun's within ${arcmin(maxAbs(sunErr))} (${f((maxAbs(sunErr) / rate) * 60, 0)} min at the mean ${f(rate, 4)}° an hour)`
	);

	/* The eclipses of 2026, one by one (the table). */
	eclipsesOf(SYZ_2026).forEach(r => {
		const m = Eclipses.predict(Eclipses.FIT_2026, r.k);

		console.log(
			`  ${date(r.jd)} ${clock(r.jd)} TT ${r.solar ? 'solar' : 'lunar'} ${r.kind}` +
				(r.solar ? '' : ` mag ${f(r.magnitude, 2)}`) +
				` | model ${clock(m.jd)} (${f((m.jd - r.jd) * 1440, 0)} min) ${m.kind}` +
				(m.solar ? '' : ` mag ${f(m.magnitude, 2)}`)
		);
	});
}

/* ==========================================================================
   13. TEST: PTOLEMY
   His Sun (III), his simple Moon (IV) and his latitude (IV 9, V 12), on
   his clock (days of UT).
   ========================================================================== */

/* Alexandria, 29.92° east of Greenwich (models/mean-sun.js, MeanSun.PTOLEMY). */
const ALEXANDRIA = 29.92;

/* Hours from local midnight, local apparent time at Alexandria, of a
   moment (JD(TT)), the midnight being 'midnightUt' (JD(UT)); with the
   Earth's own clock (Delta T) or with a uniform one. */
function alexandriaHours(jdTT, midnightUt, withDeltaT = true) {
	const ut = withDeltaT ? Time.utFromTt(jdTT) : jdTT;

	return (ut - midnightUt) * 24 + Ephem.equationOfTime(jdTT) / 60;
}

/* Ptolemy's three eclipses at Alexandria (IV 6), with the hours of
   mid-eclipse from midnight he gives and his account of the magnitude. */
const ALEXANDRIAN = [
	{ name: '6/7 May 133', y: 133, m: 5, d: 7, hours: -0.75 },
	{ name: '20/21 October 134', y: 134, m: 10, d: 21, hours: -1 },
	{ name: '5/6 March 136', y: 136, m: 3, d: 6, hours: 4 }
];

title('13. Test: Ptolemy');
{
	ALEXANDRIAN.forEach(rec => {
		const midnight = Y(rec.y, rec.m, rec.d) - ALEXANDRIA / 360;
		const k = Eclipses.indexNear(Time.ttFromUt(midnight), false);
		const r = referenceSyzygy(k);
		const m = Eclipses.predict(Eclipses.PTOLEMY, k);

		const asClock = hours => clock(((hours / 24 + 1) % 1) - 0.5);

		console.log(
			`${rec.name}: local apparent times: Ptolemy ${asClock(rec.hours)}, reference ${asClock(alexandriaHours(r.jd, midnight))}, his model ${asClock(alexandriaHours(m.jd, midnight))}`
		);
		console.log(
			`${rec.name}: Ptolemy ${rec.hours} h | reference ${r.kind} mag ${f(r.magnitude, 2)}, ${f(alexandriaHours(r.jd, midnight), 2)} h, beta ${arcmin(r.betaSyzygy)} | his model ${f(alexandriaHours(m.jd, midnight), 2)} h, beta ${arcmin(m.beta)} (${arcmin(m.beta - r.betaSyzygy)})`
		);
		console.log(
			`  his Sun ${arcmin(norm180(SolarEccentric.make(SolarEccentric.PTOLEMY)(r.jd) - sunLon(r.jd)), 0)}, his Moon ${arcmin(norm180(LunarEpicycle.make(LunarLatitude.PTOLEMY)(r.jd) - moonLon(r.jd)), 0)}`
		);
	});

	/* In 2026, his mean argument of latitude against his mean longitude,
	   both from Meeus' mean elements. */
	{
		const jd = Y(2026);
		const theirs = LunarLatitude.state(LunarLatitude.PTOLEMY, jd).meanArgument;
		const meeus = LunarLatitude.MEEUS.F0 + LunarLatitude.MEEUS.nF * (jd - 2451545);
		const lon = LunarEpicycle.state(LunarLatitude.PTOLEMY, jd).meanLongitude;
		const meeusLon = LunarEpicycle.MEEUS.L0 + LunarEpicycle.MEEUS.n * (jd - 2451545);

		console.log(
			`${date(jd)}: Ptolemy's mean argument of latitude minus Meeus' ${f(norm180(theirs - meeus), 2)}°; his mean longitude ${f(norm180(lon - meeusLon), 2)}°`
		);

		/* His motion in latitude (IV 9) against the reference, over the
		   time since his epoch (Nabonassar, 747 BC). */
		const centuries = (jd - LunarLatitude.PTOLEMY.epoch) / 36525;
		const drift = (LunarLatitude.PTOLEMY.nF - RATES.nF) * 36525;

		console.log(
			`  since his epoch ${f(centuries * 100, 0)} years: ${f(drift, 3)}° a century x ${f(centuries, 2)} = ${f(drift * centuries, 2)}°`
		);
	}

	const ptolemyNow = compare(Eclipses.PTOLEMY, Y(2021), Y(2031));

	printComparison('Ptolemy in 2021-2030', ptolemyNow);
	console.log(`  largest time error ${f(maxAbs(ptolemyNow.dt) / 60, 1)} h`);
}

/* ==========================================================================
   14. RESIDUAL
   ========================================================================== */

title('14. Residual');
{
	/* The reference Moon's term in 2D - F: J. Meeus, Astronomical
	   Algorithms, table 47.B, 0.173237° sin(2D - F) (shared/ephemeris.js,
	   MOON_B). */
	console.log(`the latitude term of the reference Moon: 0.173237° sin(2D - F), ${f(0.173237, 2)}°`);

	/* With the main term 5.128122° sin F: at new and full Moon (2D = 0 or
	   360°) the term is -0.173237° sin F, at the quarters (2D = 180°)
	   +0.173237° sin F, so the circle seems inclined by their sum. */
	console.log(
		`the inclination it gives: at new and full Moon 5.128122 - 0.173237 = ${f(5.128122 - 0.173237, 2)}°, at the quarters 5.128122 + 0.173237 = ${f(5.128122 + 0.173237, 2)}°`
	);
}

/* ==========================================================================
   15. EXERCISES
   ========================================================================== */

title('15. Exercise 1: the new Moon of 12 August 2026');
{
	console.log(
		`the constants of the hint (models/eclipses.js): Moon radius ${Eclipses.MOON_RADIUS} km, Earth radius ${Eclipses.EARTH_RADIUS} km, the Sun's radius 959.63" and parallax 8.794" at 1 au`
	);

	const k = Eclipses.indexNear(Y(2026, 8, 12), true);
	const m = Eclipses.predict(Eclipses.FIT_2026, k);
	const r = referenceSyzygy(k);
	const l = Eclipses.limits(m.z);

	console.log(
		`model new Moon ${date(m.jd)} ${clock(m.jd)} TT; reference greatest eclipse ${clock(r.jd)} TT (NASA 17:47): ${f((r.jd - m.jd) * 1440, 0)} min later`
	);
	console.log(`  F = ${f(m.F, 1)}°, ${f(180 - m.F, 1)}° before the descending node`);
	console.log(
		`  beta: first order ${f(LAT.i, 2)} x sin ${f(m.F, 1)} = ${f(LAT.i * sin(m.F), 3)}° = ${arcmin(LAT.i * sin(m.F))}; exact ${arcmin(m.beta)}; reference ${arcmin(r.betaSyzygy)}`
	);
	console.log(
		`  the model's Moon at ${f(m.moonKm, 0)} km, Sun at ${f(m.sunAu, 3)} au (reference ${f(r.moonKm, 0)} km, ${f(r.sunAu, 3)} au)`
	);
	console.log(`  s ${arcmin(m.z.sM)}, pi ${arcmin(m.z.pM)}, s_sun ${arcmin(m.z.sS)}, pi_sun ${f(m.z.pS * 3600, 1)}"`);
	console.log(`  solar limit ${arcmin(l.solar)}, central ${arcmin(l.central)}: ${m.kind} (reference ${r.kind})`);
	const gamma = Math.abs(m.beta) / l.central;
	const axisKm = m.moonKm - Eclipses.EARTH_RADIUS * Math.sqrt(1 - gamma * gamma);

	console.log(
		`  gamma = beta / (pi - pi_sun) = ${f(gamma, 3)}; the axis meets the Earth ${f(axisKm, 0)} km from the Moon: radius ${arcmin(Eclipses.axisRadius(m.moonKm, gamma))} against ${arcmin(m.z.sS)}`
	);

	/* The exercise's rounded data: F = 169.7°, i = 5.00°. */
	const rounded = LunarLatitude.latitude(169.7, 5);

	console.log(
		`  rounded data: 5.00 x sin 169.7 = ${f(5 * sin(169.7), 3)}° = ${arcmin(5 * sin(169.7))}; exactly ${arcmin(rounded)}; gamma ${f(rounded / l.central, 3)}`
	);
	console.log(`  with the reference Sun's 1.013 au: s_sun ${arcmin(Eclipses.sizes(m.moonKm, r.sunAu).sS)}`);

	const next = Eclipses.predict(Eclipses.FIT_2026, k + 1);

	console.log(
		`  next new Moon ${date(next.jd)}: F = ${f(next.F, 1)}° (${f(next.F - 180, 1)}° past the node), beta ${arcmin(next.beta)}; rounded 5° and ${f(next.F, 1)}°: ${arcmin(LunarLatitude.latitude(Number(f(next.F, 1)), 5))}; solar limit ${arcmin(Eclipses.limits(next.z).solar)}: ${next.kind ?? 'none'}`
	);
}

title('15. Exercise 2: the saros');
{
	const ratio = P_SYNODIC / P_DRACONITIC;

	console.log(
		`P_s ${f(P_SYNODIC, 6)}, P_d ${f(P_DRACONITIC, 6)}, P_a ${f(P_ANOMALISTIC, 6)}; P_s / P_d = ${f(ratio, 7)} = [${Eclipses.convergents(
			ratio,
			8
		)
			.map(c => c[2])
			.join(', ')}]`
	);
	Eclipses.convergents(ratio, 8)
		.slice(1)
		.forEach(([p, q]) => {
			console.log(
				`  ${p} draconitic / ${q} synodic: ${f(q * P_SYNODIC, 2)} d against ${f(p * P_DRACONITIC, 2)} d (${f((p * P_DRACONITIC - q * P_SYNODIC) * 24, 1)} h), ${f((q * P_SYNODIC) / P_ANOMALISTIC, 3)} anomalistic, ${f((q * P_SYNODIC) / ECLIPSE_YEAR, 3)} eclipse years`
			);
		});

	const saros = 223 * P_SYNODIC;
	const dF = norm180(RATES.nF * saros);
	const solarLimit = limitsFor(Eclipses.MOON_MEAN_DISTANCE, 1).F.solar;

	console.log(
		`saros 223 P_s = ${f(saros, 3)} d = ${f(saros / 365.25, 3)} Julian years = 18 years ${f(saros - 18 * 365.25, 1)} days (Julian)`
	);
	console.log(
		`  242 P_d = ${f(242 * P_DRACONITIC, 3)} d (${f((242 * P_DRACONITIC - saros) * 24, 2)} h); 239 P_a = ${f(239 * P_ANOMALISTIC, 3)} d (${f((239 * P_ANOMALISTIC - saros) * 24, 1)} h); 19 eclipse years = ${f(19 * ECLIPSE_YEAR, 3)} d (${f((19 * ECLIPSE_YEAR - saros) * 24, 1)} h)`
	);
	console.log(
		`  the extra ${f(saros % 1, 3)} d: the Earth turns ${f((saros % 1) * 360, 0)}° more; three saros ${f(3 * saros, 2)} d (the exeligmos, 19756 days)`
	);
	console.log(
		`  F changes by ${f(dF, 3)}° a saros: a series lasts about 2 x ${f(solarLimit, 1)} / ${f(-dF, 3)} = ${f((2 * solarLimit) / -dF, 0)} saros, ${f((((2 * solarLimit) / -dF) * saros) / 365.25, 0)} years`
	);
	console.log(
		`Hipparchus: 5458 = 7 x 716 + 2 x 223 = ${7 * 716 + 2 * 223}, 5923 = 7 x 777 + 2 x 242 = ${7 * 777 + 2 * 242}; 5923 P_d - 5458 P_s = ${f((5923 * P_DRACONITIC - 5458 * P_SYNODIC) * 24, 2)} h`
	);

	const k = Eclipses.indexNear(Y(2026, 8, 12), true);

	[k - 223, k, k + 223, k + 446].forEach(kk => {
		const r = referenceSyzygy(kk);

		console.log(
			`  ${date(r.jd)} ${clock(r.jd)} TT: ${r.kind}, the Moon ${arcmin(r.least, 0)} from the Sun, ${f(r.moonKm, 0)} km`
		);
	});
}

title('15. Exercise 3: the eclipse of 20 October 134 with a uniformly turning Earth');
{
	const rec = ALEXANDRIAN[1];
	const midnight = Y(rec.y, rec.m, rec.d) - ALEXANDRIA / 360;
	const r = referenceSyzygy(Eclipses.indexNear(Time.ttFromUt(midnight), false));
	const dT = Time.deltaT(Time.decimalYear(r.jd));
	const E = Ephem.equationOfTime(r.jd);
	const local = (ALEXANDRIA / 15) * 60;
	const asClock = hours => clock(((hours / 24 + 1) % 1) - 0.5);

	console.log(`greatest eclipse ${date(r.jd)} ${clock(r.jd)} TT, ${r.kind}, magnitude ${f(r.magnitude, 2)}`);
	console.log(
		`  Delta T ${f(dT, 0)} s = ${f(dT / 3600, 2)} h = ${Math.floor(dT / 3600)} h ${f((dT % 3600) / 60, 0)} min; Alexandria ${ALEXANDRIA}° E = ${f(local, 1)} min; equation of time +${f(E, 1)} min`
	);
	console.log(
		`  with Delta T: ${f(alexandriaHours(r.jd, midnight), 2)} h from midnight = ${asClock(alexandriaHours(r.jd, midnight))} local apparent time; Ptolemy: 1 hour before midnight`
	);
	console.log(
		`  uniform Earth: ${f(alexandriaHours(r.jd, midnight, false), 2)} h = ${asClock(alexandriaHours(r.jd, midnight, false))}; difference ${f(alexandriaHours(r.jd, midnight, false) - alexandriaHours(r.jd, midnight), 2)} h`
	);

	/* Turned round: Delta T from Ptolemy's 23:00, local apparent time. */
	const ptolemyUt = midnight + (-1 - E / 60) / 24;
	const fromPtolemy = (r.jd - ptolemyUt) * 24;

	console.log(
		`  from Ptolemy's 23:00: local mean ${asClock(-1 - E / 60)}, UT ${clock(ptolemyUt)}; Delta T = ${clock(r.jd)} - ${clock(ptolemyUt)} = ${f(fromPtolemy, 2)} h against ${f(dT / 3600, 2)} h (${f((fromPtolemy - dT / 3600) * 60, 0)} min)`
	);
}

/* ==========================================================================
   16. THE SCALES OF THE FIGURES
   ========================================================================== */

title('16. The scales of the figures');
{
	const far = limitsFor(MOON_FARTHEST, 1);
	const near = limitsFor(MOON_NEAREST, 1);

	console.log(
		`Figure 5: |beta| at 20° from the node ${f(LunarLatitude.latitude(20, LAT.i), 3)}° (window +-2°); limits ${arcmin(far.l.solar)} to ${arcmin(near.l.solar)} solar`
	);

	/* Figure 5(c): the boxes of the limits, in the Sun's distance from the
	   node, stay inside the slider's range of +-20°. */
	console.log(
		`Figure 5(c): the boxes reach ${f(far.F.lunar, 1)}° to ${f(near.F.lunar, 1)}° (lunar) and ${f(far.F.solar, 1)}° to ${f(near.F.solar, 1)}° (solar) from the node (axis +-20°)`
	);

	/* Figure 7: the scale of the error curve of the latitude, the same for
	   its three spans. The longest, a century about the middle of 2026, is
	   sampled here every half day; the dots of the mean inclination are at
	   the new and full Moons of 2026. */
	const meanI = Object.assign({}, LAT, { i: 5.145 });
	const century = [];

	for (let jd = Y(1976); jd < Y(2077); jd += 0.5) {
		century.push(LunarLatitude.state(LAT, jd).beta - Ephem.moon(jd).lat);
	}

	const meanDots = SYZ_2026.map(s => LunarLatitude.state(meanI, s.syzygy).beta - s.betaSyzygy);

	console.log(
		`Figure 7: the fit over 1976-2077 within ${arcmin(maxAbs(century))}; the dots of the mean inclination within ${arcmin(maxAbs(meanDots))} (scale +-40')`
	);
}
