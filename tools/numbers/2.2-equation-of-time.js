/* ==========================================================================
   NUMBERS FOR PAGE 2.2 "THE EQUATION OF TIME" (tools/numbers/2.2-equation-of-time.js)
   Loads the site's shared code (common, time, ephemeris and the models
   diurnal.js, frames.js, mean-sun.js, clock.js, solar-eccentric.js,
   equation-of-time.js) in a Node vm context and prints every number quoted on the page, in page
   order.

   Run from the repository root:  node tools/numbers/2.2-equation-of-time.js

   Sign convention (Meeus ch. 28, Ephem.equationOfTime): the equation of
   time E is apparent minus mean solar time, positive when the sundial is
   ahead of the clock. In degrees it is alpha_m - alpha, the mean Sun's
   right ascension minus the true Sun's; 1° = 4 minutes of time. The real
   Sun crosses the meridian at 12 h - E local mean time.

   With the eccentric of page 2.1 (lambda = lambdaBar + q) and the
   reduction to the equator R = alpha - lambda of page 1.2:
	   E = lambdaBar - alpha = -q - R.

   TABLE OF CONTENTS
	 1. Loading the shared code
	 2. Formatting and searching
	 3. The real Sun's noon at Greenwich, and the real E
	 4. Observation: the true solar day, the running sum, the analemma
	 5. Model: the two parts, the reduction as an "eccentric"
	 6. Fit: e, the apogee and the obliquity from the equation of time
	 7. Test: the model against the real E; Ptolemy's numbers (III 9)
	 8. Residual: what is left; the equation of time over the centuries
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
	'shared/models/solar-eccentric.js',
	'shared/models/equation-of-time.js'
]);
const {
	norm180,
	norm360,
	asin,
	atan2d,
	sin,
	cos,
	tan,
	R2D,
	Time,
	Ephem,
	Frames,
	MeanSun,
	Clock,
	SolarEccentric,
	EquationOfTime
} = shared;

/* ==========================================================================
   2. FORMATTING AND SEARCHING
   ========================================================================== */

const f = (x, digits) => x.toFixed(digits);
const title = text => console.log(`\n=== ${text} ===`);
const date = jd => Time.formatDate(jd);
const when = jd => Time.formatDate(jd, { time: true });

/* Minutes of time -> "+16 min 23 s" (rounded to the second). */
function minSec(minutes) {
	const sign = minutes < 0 ? '-' : '+';
	const total = Math.round(Math.abs(minutes) * 60);

	return `${sign}${Math.floor(total / 60)} min ${String(total % 60).padStart(2, '0')} s`;
}

/* Degrees -> "2°23'15"". */
function dms(degrees, digits = 0) {
	const sign = degrees < 0 ? '-' : '';
	const total = Number((Math.abs(degrees) * 3600).toFixed(digits));
	const d = Math.floor(total / 3600);
	const m = Math.floor((total - 3600 * d) / 60);
	const s = total - 3600 * d - 60 * m;

	return `${sign}${d}°${String(m).padStart(2, '0')}'${s.toFixed(digits).padStart(digits ? digits + 3 : 2, '0')}"`;
}

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

/* The zeros and the turning points of a daily series values[0..N]
   (index = day of the year): sign changes, interpolated linearly, and
   local extremes, refined by a parabola through three days. */
function zerosAndExtremes(values) {
	const zeros = [];
	const extremes = [];

	for (let i = 0; i + 1 < values.length; i++) {
		if (Math.sign(values[i]) !== Math.sign(values[i + 1])) {
			zeros.push(i + values[i] / (values[i] - values[i + 1]));
		}
	}

	for (let i = 1; i + 1 < values.length; i++) {
		const [a, b, c] = [values[i - 1], values[i], values[i + 1]];

		if ((b > a && b >= c) || (b < a && b <= c)) {
			const shift = (0.5 * (a - c)) / (a - 2 * b + c);

			extremes.push({ day: i + shift, value: b - 0.25 * (a - c) * shift });
		}
	}

	return { zeros, extremes };
}

/* Linear interpolation. */
const lerpN = (a, b, t) => a + (b - a) * t;

/* The year of the page. */
const Y2026 = Time.julianDay(2026, 1, 1);
const YEAR_DAYS = 365;
/* The date of a day index of 2026 (0 = 1 January; the index counts
   noons, so a fraction is rounded to the nearest noon). */
const dayDate = day => date(Y2026 + Math.round(day));

/* Minutes of time per degree of right ascension. */
const MIN_PER_DEG = 4;

/* ==========================================================================
   3. THE REAL SUN'S NOON AT GREENWICH, AND THE REAL E
   The real Sun's hour angle from the apparent sidereal time and its
   apparent right ascension (as on pages 1.3 and 2.1); its noon is the
   moment the hour angle is zero. E = 12 h - noon (UT, at Greenwich).
   ========================================================================== */

function realSunHourAngle(jdUT) {
	const jdTT = Time.ttFromUt(jdUT);
	const eq = Ephem.equatorial(Ephem.sun(jdTT), jdTT);

	return norm180(Ephem.apparentSiderealTime(jdUT) - eq.ra);
}

/* JD(UT) of the real noon at Greenwich on the date whose 0 h UT is jd0. */
function realNoon(jd0) {
	return bisect(realSunHourAngle, jd0 + 0.45, jd0 + 0.55, 45);
}

/* The real E (minutes) at any moment, Meeus 28.1 (Ephem). */
const ephemE = jdTT => Ephem.equationOfTime(jdTT);

/* ==========================================================================
   4. OBSERVATION
   ========================================================================== */

title('Observation: the real noon at Greenwich through 2026');
const noons = [];

for (let day = -1; day <= YEAR_DAYS + 1; day++) {
	noons.push(realNoon(Y2026 + day));
}

const E2026 = [];

for (let day = 0; day <= YEAR_DAYS; day++) {
	E2026.push((0.5 - (noons[day + 1] - (Y2026 + day))) * 1440);
}

{
	let worst = 0;

	for (let day = 0; day <= YEAR_DAYS; day++) {
		const jd = noons[day + 1];

		worst = Math.max(worst, Math.abs(E2026[day] - ephemE(Time.ttFromUt(jd))) * 60);
	}

	console.log(`E from the noons and from Meeus 28.1 (Ephem.equationOfTime) agree within ${f(worst, 2)} s`);
}

const real = zerosAndExtremes(E2026);
real.extremes.forEach(x => console.log(`   extreme ${minSec(x.value)} on ${dayDate(x.day)}`));
real.zeros.forEach(z => console.log(`   zero on ${dayDate(z)} (day ${f(z, 2)})`));
console.log(
	`   noon at Greenwich: earliest 12 h ${minSec(-Math.max(...E2026))} , latest 12 h ${minSec(-Math.min(...E2026))}`
);
console.log(
	`   peak to peak ${f(Math.max(...E2026) - Math.min(...E2026), 2)} min = ${f((Math.max(...E2026) - Math.min(...E2026)) / 4, 2)} time-degrees`
);

title('Observation: the true solar day (noon to noon) through 2026, Figure 1 (a)');
const dayExcess = [];

for (let day = 0; day <= YEAR_DAYS; day++) {
	dayExcess.push((noons[day + 1] - noons[day] - 1) * 86400);
}

{
	const longest = dayExcess.indexOf(Math.max(...dayExcess));
	const shortest = dayExcess.indexOf(Math.min(...dayExcess));
	const mean = dayExcess.reduce((a, b) => a + b, 0) / dayExcess.length;

	console.log(
		`longest: day ending ${dayDate(longest)}, ${f(dayExcess[longest], 1)} s over 24 h; shortest: day ending ${dayDate(shortest)}, ${f(dayExcess[shortest], 1)} s`
	);
	console.log(`mean excess over the year ${f(mean, 3)} s (page 1.3: 24 h within a tenth of a second)`);

	const z = zerosAndExtremes(dayExcess);

	z.zeros.forEach(d => console.log(`   day of exactly 24 h around ${dayDate(d)}`));
	z.extremes.forEach(x => console.log(`   day excess extreme ${f(x.value, 1)} s around ${dayDate(x.day)}`));
}

title('Observation: the running sum of the excesses is the change of E, Figure 1 (b)');
{
	const from = real.extremes[0];
	const to = real.extremes[3];
	const a = Math.round(from.day);
	const b = Math.round(to.day);
	let sum = 0;

	for (let day = a + 1; day <= b; day++) {
		sum += dayExcess[day];
	}

	console.log(
		`from ${dayDate(a)} to ${dayDate(b)}: the days add up to ${f(sum / 60, 2)} min more than 24 h each; ` +
			`E falls from ${f(E2026[a], 2)} to ${f(E2026[b], 2)} min (change ${f(E2026[b] - E2026[a], 2)} min)`
	);

	let runLong = 0;
	let runShort = 0;
	let best = { long: 0, short: 0 };

	dayExcess.forEach(x => {
		runLong = x > 0 ? runLong + 1 : 0;
		runShort = x < 0 ? runShort + 1 : 0;
		best = { long: Math.max(best.long, runLong), short: Math.max(best.short, runShort) };
	});
	console.log(`longest run of days over 24 h: ${best.long} days; under 24 h: ${best.short} days`);
}

title('Observation: the Sun at mean noon (12:00 UT at Greenwich), the analemma');
{
	const decs = [];

	for (let day = 0; day <= YEAR_DAYS; day++) {
		const jdTT = Time.ttFromUt(Y2026 + day + 0.5);

		decs.push(Ephem.equatorial(Ephem.sun(jdTT), jdTT).dec);
	}

	console.log(
		`hour angle at mean noon = E/4 degrees: from ${f(Math.min(...E2026) / 4, 2)}° to ${f(Math.max(...E2026) / 4, 2)}°; declination ${f(Math.min(...decs), 2)}° to ${f(Math.max(...decs), 2)}°`
	);
	// the crossing of the figure eight: two daily segments of the curve
	// (hour angle E/4, declination) that intersect
	const H = E2026.map(E => E / 4);
	const cross = (p1, p2, p3, p4) => {
		const d = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p2[1] - p1[1]) * (p4[0] - p3[0]);

		if (d === 0) {
			return null;
		}

		const t = ((p3[0] - p1[0]) * (p4[1] - p3[1]) - (p3[1] - p1[1]) * (p4[0] - p3[0])) / d;
		const u = ((p3[0] - p1[0]) * (p2[1] - p1[1]) - (p3[1] - p1[1]) * (p2[0] - p1[0])) / d;

		return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? { t, u } : null;
	};

	for (let a = 0; a < YEAR_DAYS; a++) {
		for (let b = a + 30; b < YEAR_DAYS - 30; b++) {
			const hit = cross([H[a], decs[a]], [H[a + 1], decs[a + 1]], [H[b], decs[b]], [H[b + 1], decs[b + 1]]);

			if (hit) {
				console.log(
					`   the figure eight crosses itself on ${dayDate(a + hit.t)} and ${dayDate(b + hit.u)}: hour angle ${f(lerpN(H[a], H[a + 1], hit.t), 2)}°, declination ${f(lerpN(decs[a], decs[a + 1], hit.t), 2)}°`
				);
			}
		}
	}
}

/* ==========================================================================
   5. MODEL
   ========================================================================== */

/* The page's model: the eccentric of page 2.1 (FIT_2026) for lambda, the
   mean obliquity of date for the reduction. Returns the parts in
   minutes of time: eccentricity -q, obliquity -R, total E. */
const FIT = SolarEccentric.FIT_2026;

function modelParts(jdTT, parameters = FIT, eps = Ephem.meanObliquity(jdTT)) {
	const p = EquationOfTime.parts(parameters, jdTT, eps);

	return {
		meanLongitude: p.meanLongitude,
		M: p.M,
		q: p.q,
		lambda: p.lambda,
		R: p.alpha - p.lambda - 360 * Math.round((p.alpha - p.lambda) / 360),
		alpha: p.alpha,
		ecc: p.eccentricity,
		obl: p.obliquity,
		E: p.total
	};
}

title('Model: the two amplitudes, to first order');
const EPS2026 = Ephem.meanObliquity(Time.julianDay(2026, 7, 2));
const y2026 = tan(EPS2026 / 2) ** 2;
console.log(`mean obliquity mid-2026 ${f(EPS2026, 4)}°; e_eps = tan^2(eps/2) = ${f(y2026, 5)}`);
console.log(
	`eccentricity part: e sin M, amplitude e = ${f(FIT.e, 5)} rad = ${f(FIT.e * R2D, 3)}° = ${f(FIT.e * R2D * MIN_PER_DEG, 2)} min`
);
console.log(
	`obliquity part: e_eps sin 2 lambda, amplitude e_eps = ${f(y2026, 5)} rad = ${f(y2026 * R2D, 3)}° = ${f(y2026 * R2D * MIN_PER_DEG, 2)} min`
);
console.log(`e_eps / e = ${f(y2026 / FIT.e, 3)}`);

title('Model: the reduction is an "eccentric" with eccentricity y and argument 2 lambda');
{
	let worst = 0;

	for (let lon = 0; lon < 360; lon += 0.5) {
		const exact = Frames.reduction(lon, EPS2026);
		const formula = -atan2d(y2026 * sin(2 * lon), 1 + y2026 * cos(2 * lon));

		worst = Math.max(worst, Math.abs(exact - formula));
	}

	console.log(
		`alpha - lambda = -atan2(y sin 2l, 1 + y cos 2l): largest difference from Frames.reduction ${worst.toExponential(1)}°`
	);

	const greatest = asin(y2026);
	const at = 45 + greatest / 2;
	const meanSpeed = asin(1 / Math.sqrt(1 + cos(EPS2026)));

	console.log(
		`greatest reduction asin y = ${f(greatest, 4)}° (${dms(greatest)}) = ${f(greatest * MIN_PER_DEG, 2)} min, at lambda = 45° + asin(y)/2 = ${f(at, 3)}°`
	);
	console.log(`   where d alpha / d lambda = 1: sin^2 lambda = 1/(1 + cos eps), lambda = ${f(meanSpeed, 3)}°`);
	console.log(
		`   reduction there: ${f(Frames.reduction(at, EPS2026), 4)}°, alpha = ${f(at + Frames.reduction(at, EPS2026), 3)}°`
	);
	console.log(
		`   d alpha / d lambda = cos eps / cos^2 delta: at the equinox ${f(cos(EPS2026), 4)}, at the solstice ${f(1 / cos(EPS2026), 4)}`
	);
	console.log(
		`   second-order term 1/2 y^2 sin 4 lambda: ${f(0.5 * y2026 * y2026 * R2D * 3600, 1)}" = ${f(0.5 * y2026 * y2026 * R2D * 240, 1)} s`
	);
	console.log(`   eccentric's second-order term 1/2 e^2 sin 2M: ${f(0.5 * FIT.e * FIT.e * R2D * 240, 1)} s`);
}

title('Model: the parts and their sum through 2026 (Figure 4)');
const parts2026 = [];

for (let day = 0; day <= YEAR_DAYS; day++) {
	parts2026.push(modelParts(Time.ttFromUt(Y2026 + day + 0.5)));
}

['ecc', 'obl', 'E'].forEach(key => {
	const series = parts2026.map(p => p[key]);
	const z = zerosAndExtremes(series);

	console.log(`${key}: range ${f(Math.min(...series), 2)} to ${f(Math.max(...series), 2)} min`);
	z.extremes.forEach(x => console.log(`   extreme ${minSec(x.value)} on ${dayDate(x.day)}`));
	z.zeros.forEach(d => console.log(`   zero on ${dayDate(d)}`));
});

{
	let worst = 0;

	parts2026.forEach(p => {
		const first = EquationOfTime.firstOrder(p.meanLongitude, FIT.e, FIT.apogee, EPS2026);

		worst = Math.max(worst, Math.abs(first - p.E) * 60);
	});

	console.log(
		`first-order E = (e sin M + e_eps sin 2 lambdaBar) differs from the exact model by at most ${f(worst, 1)} s`
	);
}

title('Model: the analemma (Figure 5): hour angle at mean noon = E / 4 degrees');
{
	const variants = {
		both: p => p.E,
		eccentricity: p => p.ecc,
		obliquity: p => {
			// the uniform Sun on the ecliptic: lambda = lambdaBar
			return -Frames.reduction(p.meanLongitude, EPS2026) * MIN_PER_DEG;
		}
	};

	Object.entries(variants).forEach(([name, fn]) => {
		const H = parts2026.map(p => fn(p) / 4);

		console.log(`${name}: hour angle ${f(Math.min(...H), 2)}° to ${f(Math.max(...H), 2)}°`);
	});
}

/* ==========================================================================
   6. FIT
   Over a whole year, sin and cos of lambdaBar and 2 lambdaBar are
   orthogonal: each coefficient of E = c + a1 sin L + b1 cos L + a2 sin 2L
   + b2 cos 2L is an average. Then (first order)
	 e sin(L - lambdaA) = e cos(lambdaA) sin L - e sin(lambdaA) cos L,
   so e = hypot(a1, b1), lambdaA = atan2(-b1, a1), and y = hypot(a2, b2).
   ========================================================================== */

title('Fit: e, the apogee and the obliquity from the real E of 2026');

function fitHarmonics(samples) {
	// least squares on [1, sin L, cos L, sin 2L, cos 2L] (samples: { L, E in rad })
	const basis = L => [1, sin(L), cos(L), sin(2 * L), cos(2 * L)];
	const n = 5;
	const A = Array.from({ length: n }, () => new Array(n).fill(0));
	const b = new Array(n).fill(0);

	samples.forEach(({ L, E }) => {
		const row = basis(L);

		for (let i = 0; i < n; i++) {
			b[i] += row[i] * E;

			for (let j = 0; j < n; j++) {
				A[i][j] += row[i] * row[j];
			}
		}
	});

	// Gaussian elimination
	for (let i = 0; i < n; i++) {
		for (let k = i + 1; k < n; k++) {
			const factor = A[k][i] / A[i][i];

			for (let j = i; j < n; j++) {
				A[k][j] -= factor * A[i][j];
			}

			b[k] -= factor * b[i];
		}
	}

	const x = new Array(n).fill(0);

	for (let i = n - 1; i >= 0; i--) {
		let s = b[i];

		for (let j = i + 1; j < n; j++) {
			s -= A[i][j] * x[j];
		}

		x[i] = s / A[i][i];
	}

	return x;
}

{
	const samples = [];

	for (let day = 0; day < YEAR_DAYS; day++) {
		const jdUT = Y2026 + day + 0.5;
		const L = Clock.meanLongitude(Time.ttFromUt(jdUT));

		samples.push({ L, E: E2026[day] / MIN_PER_DEG / R2D });
	}

	const [c, a1, b1, a2, b2] = fitHarmonics(samples);
	const e = Math.hypot(a1, b1);
	const apogee = norm360(atan2d(-b1, a1));
	const y = Math.hypot(a2, b2);
	const eps = 2 * Math.atan(Math.sqrt(y)) * R2D;
	const phase2 = atan2d(b2, a2);

	console.log(
		`coefficients (min): c ${f(c * R2D * 4, 3)}, sin L ${f(a1 * R2D * 4, 3)}, cos L ${f(b1 * R2D * 4, 3)}, sin 2L ${f(a2 * R2D * 4, 3)}, cos 2L ${f(b2 * R2D * 4, 3)}`
	);
	console.log(
		`annual amplitude ${f(e * R2D * 4, 3)} min -> e = ${f(e, 5)} (page 2.1: ${FIT.e}), apogee ${f(apogee, 2)}° (page 2.1: ${FIT.apogee}°)`
	);
	console.log(
		`semi-annual amplitude ${f(y * R2D * 4, 3)} min -> y = ${f(y, 5)}, eps = ${f(eps, 3)}° (mean obliquity ${f(EPS2026, 3)}°); phase of 2L term ${f(phase2, 2)}°`
	);
	let rms = 0;

	samples.forEach(({ L, E }) => {
		const fit = c + a1 * sin(L) + b1 * cos(L) + a2 * sin(2 * L) + b2 * cos(2 * L);

		rms += (E - fit) ** 2;
	});
	console.log(`RMS of the fit: ${f(Math.sqrt(rms / samples.length) * R2D * 240, 1)} s`);

	// the exact model fitted by Gauss-Newton: E = -q(L - lambdaA, e) -
	// R(L + q, eps) + c, unknowns e, lambdaA, eps, c (deg, min)
	const exact = (x, L) => {
		const [e, apogee, eps, c0] = x;
		const qq = SolarEccentric.equationOfCentre(L - apogee, e);

		return (-qq - Frames.reduction(L + qq, eps)) * MIN_PER_DEG + c0;
	};
	let x = [e, apogee, eps, c * R2D * 4];

	for (let iteration = 0; iteration < 8; iteration++) {
		const steps = [1e-6, 1e-4, 1e-4, 1e-4];
		const JtJ = Array.from({ length: 4 }, () => new Array(4).fill(0));
		const Jtr = new Array(4).fill(0);

		samples.forEach(({ L, E }) => {
			const r = E * R2D * MIN_PER_DEG - exact(x, L);
			const J = steps.map((h, i) => {
				const xh = x.slice();

				xh[i] += h;

				return (exact(xh, L) - exact(x, L)) / h;
			});

			for (let i = 0; i < 4; i++) {
				Jtr[i] += J[i] * r;

				for (let j = 0; j < 4; j++) {
					JtJ[i][j] += J[i] * J[j];
				}
			}
		});

		// solve the 4 x 4 system by Gaussian elimination
		const A = JtJ.map((row, i) => row.concat([Jtr[i]]));

		for (let i = 0; i < 4; i++) {
			for (let k = i + 1; k < 4; k++) {
				const factor = A[k][i] / A[i][i];

				for (let j = i; j < 5; j++) {
					A[k][j] -= factor * A[i][j];
				}
			}
		}

		const delta = new Array(4).fill(0);

		for (let i = 3; i >= 0; i--) {
			let sum = A[i][4];

			for (let j = i + 1; j < 4; j++) {
				sum -= A[i][j] * delta[j];
			}

			delta[i] = sum / A[i][i];
		}

		x = x.map((v, i) => v + delta[i]);
	}

	let rmsExact = 0;

	samples.forEach(({ L, E }) => {
		rmsExact += (E * R2D * MIN_PER_DEG - exact(x, L)) ** 2;
	});
	console.log(
		`exact model fitted (Gauss-Newton): e = ${f(x[0], 5)}, apogee ${f(x[1], 2)}°, eps = ${f(x[2], 3)}°, constant ${f(x[3] * 60, 2)} s; RMS ${f(Math.sqrt(rmsExact / samples.length) * 60, 2)} s`
	);
	// why the exact fit's obliquity is low: the eccentric's second-order
	// term differs from the ellipse's by (e^2/2 - 5/4 e_K^2) sin 2M in -q
	// (page 2.1); its part along sin 2 lambdaBar is absorbed by e_eps
	{
		const eK = FIT.e / 2;
		const extra = (FIT.e * FIT.e) / 2 - 1.25 * eK * eK;
		const along = -extra * cos(2 * FIT.apogee);
		const dEdEps = tan(EPS2026 / 2) / cos(EPS2026 / 2) ** 2;

		console.log(
			`   eccentric - ellipse in -q: ${f(extra * R2D * 60, 2)}' sin 2M, of which ${f(along * R2D * 60, 2)}' along sin 2 lambdaBar; ` +
				`absorbed by e_eps it lowers eps by ${f((along / dEdEps) * R2D * 60, 1)}'`
		);
	}
	console.log(
		`   cross term e y: the semi-annual wave of the true lambda, y sin 2(lambdaBar + q), has an annual part of amplitude e y = ${f(FIT.e * y2026 * R2D * 4 * 60, 1)} s`
	);
}

/* ==========================================================================
   7. TEST
   ========================================================================== */

title('Test: the model against the real E at 12:00 UT, 2026 (Figure 5)');
{
	// as the page plots it: the real E of Meeus 28.1 at 12:00 UT
	const errors = parts2026.map((p, day) => (p.E - ephemE(Time.ttFromUt(Y2026 + day + 0.5))) * 60);
	const lo = Math.min(...errors);
	const hi = Math.max(...errors);

	console.log(
		`model - real: ${f(lo, 1)} s (${dayDate(errors.indexOf(lo))}) to ${f(hi, 1)} s (${dayDate(errors.indexOf(hi))})`
	);
	console.log(
		`the uniform Sun of page 1.3 (E = 0): error from ${f(-Math.max(...E2026), 2)} to ${f(-Math.min(...E2026), 2)} min`
	);

	// the clock's mean Sun against the eccentric's
	const jd = Time.J2000;
	console.log(
		`at J2000 the clock's mean Sun is at ${Time.GMST_AT_J2000}°, the eccentric's at ${FIT.L0}° (Meeus 25.2: ${f(Clock.meanLongitude(jd), 5)}°)`
	);
	console.log(
		`   clock (280.46061837) - FIT_2026.L0 = ${f((280.46061837 - FIT.L0) * 3600, 1)}" = ${f((280.46061837 - FIT.L0) * 240, 2)} s`
	);
}

title('Test: what part of the error comes from the longitude (eccentric) and what from the rest');
{
	let worstLon = 0;
	let worstRest = 0;

	for (let day = 0; day <= YEAR_DAYS; day++) {
		const jdTT = Time.ttFromUt(Y2026 + day + 0.5);
		const p = parts2026[day];
		const lamRef = Ephem.longitude('sun', jdTT);
		const alphaWithRef = norm360(lamRef + Frames.reduction(lamRef, EPS2026));
		const EwithRef = norm180(p.meanLongitude - alphaWithRef) * MIN_PER_DEG;

		worstLon = Math.max(worstLon, Math.abs(p.E - EwithRef) * 60);
		worstRest = Math.max(worstRest, Math.abs(EwithRef - E2026[day]) * 60);
	}

	console.log(
		`the eccentric's longitude error gives up to ${f(worstLon, 1)} s; the rest (mean Sun, nutation, latitude) up to ${f(worstRest, 1)} s`
	);
}

title("Test: Ptolemy's numbers (Almagest III 9) with his model");
console.log(
	`the Moon in 16 2/3 time-degrees = 1 1/9 h: at his 0;32,56 an hour (IV 3) it moves ${f((32 / 60 + 56 / 3600) * (10 / 9), 3)}°`
);
const PT = SolarEccentric.PTOLEMY;
const EPS_PT = Frames.PTOLEMY_OBLIQUITY;
{
	// his model as a function of the mean longitude, over one turn
	const byMean = L => {
		const q = SolarEccentric.equationOfCentre(L - PT.apogee, PT.e);
		const lam = L + q;
		const R = Frames.reduction(lam, EPS_PT);

		return { lam, ecc: -q, obl: -R, E: -q - R };
	};
	const series = [];

	for (let L = 0; L < 360; L += 0.05) {
		series.push({ L, ...byMean(L) });
	}

	const Es = series.map(s => s.E);
	const lo = series[Es.indexOf(Math.min(...Es))];
	const hi = series[Es.indexOf(Math.max(...Es))];

	console.log(
		`his E: least ${f(lo.E, 3)}° at true lambda ${f(norm360(lo.lam), 1)}°, greatest ${f(hi.E, 3)}° at ${f(norm360(hi.lam), 1)}°: range ${f(hi.E - lo.E, 3)} time-degrees = ${f((hi.E - lo.E) * 4, 1)} min (his 8 1/3 = 33 1/3 min)`
	);

	// his intervals: from 15° Aquarius (315°) to 30° Libra (210°) and back
	const atTrue = target => {
		// mean longitude whose true longitude is 'target'
		const L = bisect(L => norm180(byMean(L).lam - target), target - 5, target + 5);

		return byMean(L);
	};
	const a = atTrue(315);
	const b = atTrue(210);

	console.log(
		`from 315° to 210° (mid-Aquarius to the end of Libra): anomaly part ${f(b.ecc - a.ecc, 3)}, meridian part ${f(b.obl - a.obl, 3)} time-degrees (his 3 2/3 and 4 2/3)`
	);
	console.log(
		`his anomaly alone, between the points of mean speed: 2 x 2;23 = ${f(2 * SolarEccentric.greatestEquation(PT.e).q, 3)} time-degrees (his 4 3/4)`
	);

	const steps = Frames.PTOLEMY_RIGHT_ASCENSION_STEPS;
	const sum = list => list.reduce((s, x) => s + x, 0);
	const solstice = 2 * sum(steps.slice(6, 9));
	const equinox = 2 * sum(steps.slice(0, 3));

	{
		const ra = lon => lon + EquationOfTime.reduction(lon, EPS_PT);

		console.log(
			`with his obliquity the formula gives ${f(ra(120) - ra(60), 3)} time-degrees for the two signs about a solstice, ${f(ra(30) - ra(-30), 3)} about an equinox`
		);
	}
	console.log(
		`his rising-times (I 16): two signs about a solstice ${dms(solstice)} = 60° + ${f(solstice - 60, 3)}°; about an equinox ${dms(equinox)} = 60° - ${f(60 - equinox, 3)}°`
	);

	// his model in his own time against the real E
	const start = Time.julianDay(140, 1, 1);
	let worst = { lo: Infinity, hi: -Infinity };
	let realLo = Infinity;
	let realHi = -Infinity;

	for (let day = 0; day < 366; day++) {
		const jdTT = Time.ttFromUt(start + day + 0.5);
		const L = MeanSun.meanLongitude(PT, jdTT);
		const err = byMean(L).E * 4 - ephemE(jdTT);
		const r = ephemE(jdTT);

		worst = { lo: Math.min(worst.lo, err), hi: Math.max(worst.hi, err) };
		realLo = Math.min(realLo, r);
		realHi = Math.max(realHi, r);
	}

	console.log(
		`AD 140: real E from ${f(realLo, 2)} to ${f(realHi, 2)} min (range ${f(realHi - realLo, 2)} min = ${f((realHi - realLo) / 4, 2)} time-degrees)`
	);
	console.log(
		`   Ptolemy's E (with his mean Sun) minus real: ${f(worst.lo, 2)} to ${f(worst.hi, 2)} min; minus a constant it varies by ${f(worst.hi - worst.lo, 2)} min`
	);
	console.log(
		`his epoch: mean Sun 330;45, true ${f(norm360(byMean(330.75).lam), 3)}° (his Pisces 3;8 = 333.133°); his E there ${f(byMean(330.75).E * 4, 2)} min`
	);
}

/* ==========================================================================
   8. RESIDUAL
   ========================================================================== */

title('Residual: the real E over the centuries (Figure 7), against the sun longitude');

/* The real E over the year starting 'year' Jan 1: range, extremes, and
   the sun's longitude at the extremes. */
function realYear(year) {
	const start = Time.julianDay(year, 1, 1);
	const values = [];
	const lams = [];

	for (let day = 0; day <= 366; day++) {
		const jdTT = Time.ttFromUt(start + day + 0.5);

		values.push(ephemE(jdTT));
		lams.push(Ephem.longitude('sun', jdTT));
	}

	return { values, lams };
}

[-140, 140, 1246, 1515, 2026, 3000].forEach(year => {
	const { values, lams } = realYear(year);
	const z = zerosAndExtremes(values);
	const lo = Math.min(...values);
	const hi = Math.max(...values);
	const text = z.extremes.map(x => `${f(x.value, 1)} at ${f(lams[Math.round(x.day)], 0)}°`).join(', ');

	console.log(
		`${Time.formatYear(year).padStart(7)}: ${f(lo, 2)} to ${f(hi, 2)} min, range ${f(hi - lo, 2)} min = ${f((hi - lo) / 4, 2)} time-degrees; extremes ${text}`
	);
});
console.log(`Copernicus (III 26): 7;48 time-degrees = ${f(7.8 * 4, 1)} min; Ptolemy 8;20 = ${f((25 / 3) * 4, 1)} min`);

{
	// the year when the apogee is at the summer solstice, from page 2.1's
	// fits: the season lengths spring = summer
	let lo = 1100;
	let hi = 1400;
	const fitYear = year => {
		const from = Time.julianDay(year, 3, 1);
		const sunAt = (target, after) => {
			let jd = after;

			while (!(
				norm180(Ephem.longitude('sun', jd) - target) < 0 &&
				norm180(Ephem.longitude('sun', jd + 1) - target) >= 0
			)) {
				jd += 1;
			}

			return bisect(t => norm180(Ephem.longitude('sun', t) - target), jd, jd + 1);
		};
		const t0 = sunAt(0, from);
		const t1 = sunAt(90, t0);
		const t2 = sunAt(180, t1);

		return SolarEccentric.fitSeasons(t1 - t0, t2 - t1, MeanSun.yearLength()).apogee;
	};

	for (let i = 0; i < 12; i++) {
		const mid = (lo + hi) / 2;

		if (fitYear(Math.round(mid)) < 90) {
			lo = mid;
		} else {
			hi = mid;
		}
	}

	console.log(`the fitted apogee passes 90° around ${Math.round((lo + hi) / 2)}`);
}

title("Residual: the page's model (fixed apogee) over the centuries");
[
	[1976, 2076],
	[1526, 2526]
].forEach(([from, to]) => {
	let lo = Infinity;
	let hi = -Infinity;

	for (let jd = Time.julianDay(from, 1, 1); jd < Time.julianDay(to, 1, 1); jd += 2) {
		const err = (modelParts(jd).E - ephemE(jd)) * 60;

		lo = Math.min(lo, err);
		hi = Math.max(hi, err);
	}

	console.log(`${from}-${to}: model - real from ${f(lo, 1)} s to ${f(hi, 1)} s`);
});

/* ==========================================================================
   9. EXERCISES
   ========================================================================== */

title('Exercise 1: the equation of time on 3 November 2026, 12:00 UT, step by step');
{
	const jdUT = Time.julianDay(2026, 11, 3) + 0.5;
	const jdTT = Time.ttFromUt(jdUT);
	const d = jdTT - Time.J2000;
	const p = modelParts(jdTT);
	const eps = Ephem.meanObliquity(jdTT);

	console.log(`d = ${f(d, 4)} (TT); lambdaBar = L0 + n d = ${f(p.meanLongitude, 4)}°`);
	console.log(`M = lambdaBar - lambdaA = ${f(p.M, 4)}°; q = ${f(p.q, 4)}°; lambda = ${f(p.lambda, 4)}°`);
	console.log(`eps = ${f(eps, 4)}°; alpha = ${f(p.alpha, 4)}°; R = alpha - lambda = ${f(p.R, 4)}°`);
	console.log(
		`E = -q - R = ${f(-p.q, 4)}° + ${f(-p.R, 4)}° = ${f(-p.q - p.R, 4)}° -> ${f(p.ecc, 2)} + ${f(p.obl, 2)} = ${f(p.E, 2)} min (${minSec(p.E)})`
	);
	console.log(
		`real: ${f(ephemE(jdTT), 2)} min (${minSec(ephemE(jdTT))}); real noon at Greenwich ${when(realNoon(Time.julianDay(2026, 11, 3)))} UT`
	);
	console.log(
		`first order: e sin M + y sin 2 lambdaBar = ${f(FIT.e * sin(p.M) * R2D * 4, 2)} + ${f(y2026 * sin(2 * p.meanLongitude) * R2D * 4, 2)} = ${f((FIT.e * sin(p.M) + y2026 * sin(2 * p.meanLongitude)) * R2D * 4, 2)} min`
	);
}

title('Exercise 2: the dates when E vanishes, 2026 (model and real); with e = 0 and with eps = 0');
{
	const z = zerosAndExtremes(parts2026.map(p => p.E));

	z.zeros.forEach((d, i) => console.log(`   model zero ${dayDate(d)}; real ${dayDate(real.zeros[i])}`));

	const zObl = zerosAndExtremes(parts2026.map(p => -Frames.reduction(p.meanLongitude, EPS2026)));
	const zEcc = zerosAndExtremes(parts2026.map(p => p.ecc));

	console.log(`   e = 0 (uniform Sun, obliquity only): zeros ${zObl.zeros.map(dayDate).join(', ')}`);
	console.log(`   eps = 0 (eccentricity only): zeros ${zEcc.zeros.map(dayDate).join(', ')}`);
}

title("Exercise 3: Copernicus' limits (De Rev. III 26) and the greatest reduction");
[
	['Copernicus 23;28,30', 23 + 28.5 / 60],
	['Ptolemy 23;51,20', Frames.PTOLEMY_OBLIQUITY],
	['2026 mean', EPS2026]
].forEach(([name, eps]) => {
	const lam = asin(1 / Math.sqrt(1 + cos(eps)));
	const alpha = norm360(lam + Frames.reduction(lam, eps));
	const arcEq = 180 - 2 * lam;
	const arcRa = 180 - 2 * alpha;
	const y = tan(eps / 2) ** 2;

	console.log(
		`${name}: mean-speed point lambda = ${f(lam, 3)}° (${dms(lam)}), alpha there ${f(alpha, 3)}°; the ${f(arcEq, 2)}° to ${f(180 - lam, 2)}° cross in ${f(arcRa, 3)} time-degrees (excess ${f(arcRa - arcEq, 3)}); greatest reduction asin(y) = ${f(asin(y), 3)}° = ${f(asin(y) * 4, 2)} min`
	);
});
console.log("Copernicus: 88° from 16° Taurus (46°) to 14° Leo (134°) cross in 'about 93 time-degrees', 5 in excess");
{
	const eps = 23 + 28.5 / 60;
	const ra = lam => norm360(lam + Frames.reduction(lam, eps));

	console.log(`   with his obliquity, alpha(134°) - alpha(46°) = ${f(ra(134) - ra(46), 3)}°`);
	console.log(`   and 92° from 14° Leo (134°) to 16° Scorpio (226°): ${f(ra(226) - ra(134), 3)}°`);
}

/* ==========================================================================
   10. THE SCALES OF THE FIGURES
   ========================================================================== */

title('Scales');
{
	// Figure 2: the reduction for eps up to 45°
	[23.44, 30, 45].forEach(eps => {
		console.log(`eps ${eps}°: greatest reduction ${f(asin(tan(eps / 2) ** 2), 3)}°`);
	});

	// Figure 7: the real E over the years of its slider
	let lo = Infinity;
	let hi = -Infinity;

	for (let year = -1000; year <= 3000; year += 10) {
		const { values } = realYear(year);

		lo = Math.min(lo, ...values);
		hi = Math.max(hi, ...values);
	}

	console.log(`real E from 1000 BC to AD 3000 (every 10 years): ${f(lo, 2)} to ${f(hi, 2)} min`);
	console.log('Figure 6 (residual): axis -20 to +20 min covers it');
	console.log(
		`Figure 1: day excess ${f(Math.min(...dayExcess), 1)} to ${f(Math.max(...dayExcess), 1)} s (axis -30 to +35 s); E ${f(Math.min(...E2026), 2)} to ${f(Math.max(...E2026), 2)} min (axis -18 to +18 min)`
	);
	const errors = parts2026.map((p, day) => (p.E - ephemE(Time.ttFromUt(Y2026 + day + 0.5))) * 60);
	console.log(
		`Figure 5: model - real ${f(Math.min(...errors), 1)} to ${f(Math.max(...errors), 1)} s (axis -8 to +8 s)`
	);
	console.log(
		'Figure 4: hour angle at mean noon within +-4.13° for every preset (axis +-6°), declination +-23.44° (axis +-26°)'
	);
}
