/* ==========================================================================
   PREDICTING THE SKY - TESTS (tests.js)
   Script of tests.html: checks time.js and ephemeris.js against the worked
   examples of J. Meeus, Astronomical Algorithms (2nd ed., 1998), the SOFA /
   ERFA test values of the long-term precession, positions from JPL
   Horizons (DE441), and a few internal consistency checks, and prints
   pass / fail with the error. Also checks stars.js and the models of
   pages 1.1 to 1.3 (models/diurnal.js, frames.js, mean-sun.js, clock.js).

   TABLE OF CONTENTS
	 1. Test harness       (cases, comparison, table rows)
	 2. Formatting
	 3. Time: Julian Date and calendar (Meeus ch. 7)
	 4. Time: Delta T and sidereal time (Meeus ch. 10, 12)
	 5. Ephemeris: obliquity and nutation (Meeus ch. 22)
	 6. Ephemeris: the Sun and the equation of time (Meeus ch. 25, 28)
	 7. Ephemeris: Venus (Meeus ch. 32, 33)
	 8. Ephemeris: the Moon (Meeus ch. 47)
	 9. Ephemeris: long-term precession (SOFA / ERFA)
	10. Ephemeris: JPL Horizons spot checks (DE441)
	11. Internal consistency
	12. Refraction, stars, the turning sky, frames (Meeus ch. 13, 16, 21; pages 1.1, 1.2)
	13. The clocks and the mean Sun (Meeus ch. 12, 25; Almagest III 7; page 1.3)
	14. Run
   ========================================================================== */

/* ==========================================================================
   1. TEST HARNESS
   A case compares a computed value with an expected one:
	 error = computed - expected (wrapped to +-180° for angles),
	 shown in the case's unit after multiplying by 'scale'.
   ========================================================================== */

const results = [];

/* Start a new group of cases (a heading row in the table). */
function group(title) {
	results.push({ group: title });
}

/* Numeric case. options: name, source, expected, computed, tol (in display
   units), unit, scale (value -> display units), show (formatter), angle. */
function check(options) {
	const { name, source, expected, computed, tol, unit = '', scale = 1, show = String, angle = false } = options;
	const difference = angle ? norm180(computed - expected) : computed - expected;
	const error = difference * scale;
	const pass = Number.isFinite(error) && Math.abs(error) <= tol;

	results.push({
		name,
		source,
		expected: show(expected),
		computed: show(computed),
		error: `${formatError(error)} ${unit}`,
		tolerance: `${tol} ${unit}`,
		pass
	});
}

/* Exact equality case (strings, integers). */
function checkEqual(name, source, expected, computed) {
	results.push({
		name,
		source,
		expected: String(expected),
		computed: String(computed),
		error: expected === computed ? '0' : 'differs',
		tolerance: 'exact',
		pass: expected === computed
	});
}

/* Write the table and the summary banner. */
function render() {
	const body = byId('results');
	const cases = results.filter(r => !r.group);
	const failed = cases.filter(r => !r.pass);
	const summary = byId('summary');

	results.forEach(r => {
		const row = document.createElement('tr');

		if (r.group) {
			row.className = 'group';
			row.innerHTML = `<td colspan="7">${r.group}</td>`;
		} else {
			const verdict = r.pass ? 'PASS' : 'FAIL';
			const cls = r.pass ? 'pass' : 'fail';

			row.innerHTML =
				`<td>${r.name}</td>` +
				`<td>${r.source}</td>` +
				`<td class="num">${r.expected}</td>` +
				`<td class="num">${r.computed}</td>` +
				`<td class="num">${r.error}</td>` +
				`<td class="num">${r.tolerance}</td>` +
				`<td class="verdict ${cls}">${verdict}</td>`;
		}

		body.appendChild(row);
	});

	summary.className = 'summary ' + (failed.length === 0 ? 'pass' : 'fail');
	summary.textContent =
		failed.length === 0
			? `All ${cases.length} tests pass.`
			: `${failed.length} of ${cases.length} tests FAIL: ${failed.map(r => r.name).join(', ')}`;

	// Also report to the console, for automated checks.
	console.log(`tests: ${cases.length - failed.length} / ${cases.length} pass`);
}

/* ==========================================================================
   2. FORMATTING
   ========================================================================== */

const ARCSEC_PER_DEG = 3600;
const SECONDS_PER_DAY = 86400;

/* Error with three significant figures, keeping its sign. */
function formatError(error) {
	if (!Number.isFinite(error)) {
		return String(error);
	}

	if (error === 0) {
		return '0';
	}

	return (error > 0 ? '+' : '−') + Number(Math.abs(error).toPrecision(3));
}

const showJD = jd => jd.toFixed(4);
const showDeg = x => x.toFixed(6) + '°';
const showDms = x => dmsSeconds(x);
const showHours = h => hms(h, 3);

/* Degrees -> "-7°47'01.74"" (two decimals of arcsecond). */
function dmsSeconds(degrees) {
	const sign = degrees < 0 ? '−' : '';
	const total = Number((Math.abs(degrees) * 3600).toFixed(2));
	const d = Math.floor(total / 3600);
	const m = Math.floor((total - d * 3600) / 60);
	const s = total - d * 3600 - m * 60;

	return `${sign}${d}°${pad2(m)}′${s.toFixed(2).padStart(5, '0')}″`;
}

/* { year, month, day } -> "1957 10 4.81". */
function showCalendar(c) {
	return `${c.year} ${c.month} ${Number(c.day.toFixed(4))}`;
}

/* ==========================================================================
   3. TIME: JULIAN DATE AND CALENDAR (Meeus ch. 7)
   ========================================================================== */

function testJulianDay() {
	group('Julian Date and calendar · time.js');

	// Example 7.a and 7.b, then the dates of Meeus' table of Julian Days.
	const cases = [
		['1957 Oct 4.81 (Sputnik 1)', 'Ex. 7.a', 1957, 10, 4.81, 2436116.31],
		['333 Jan 27.5 (Julian cal.)', 'Ex. 7.b', 333, 1, 27.5, 1842713.0],
		['2000 Jan 1.5', 'ch. 7, table', 2000, 1, 1.5, 2451545.0],
		['1999 Jan 1.0', 'ch. 7, table', 1999, 1, 1.0, 2451179.5],
		['1987 Jan 27.0', 'ch. 7, table', 1987, 1, 27.0, 2446822.5],
		['1987 Jun 19.5', 'ch. 7, table', 1987, 6, 19.5, 2446966.0],
		['1988 Jan 27.0', 'ch. 7, table', 1988, 1, 27.0, 2447187.5],
		['1988 Jun 19.5', 'ch. 7, table', 1988, 6, 19.5, 2447332.0],
		['1900 Jan 1.0', 'ch. 7, table', 1900, 1, 1.0, 2415020.5],
		['1600 Jan 1.0', 'ch. 7, table', 1600, 1, 1.0, 2305447.5],
		['1600 Dec 31.0', 'ch. 7, table', 1600, 12, 31.0, 2305812.5],
		['837 Apr 10.3', 'ch. 7, table', 837, 4, 10.3, 2026871.8],
		['−123 Dec 31.0', 'ch. 7, table', -123, 12, 31.0, 1676496.5],
		['−122 Jan 1.0', 'ch. 7, table', -122, 1, 1.0, 1676497.5],
		['−1000 Jul 12.5', 'ch. 7, table', -1000, 7, 12.5, 1356001.0],
		['−1000 Feb 29.0', 'ch. 7, table', -1000, 2, 29.0, 1355866.5],
		['−1001 Aug 17.9', 'ch. 7, table', -1001, 8, 17.9, 1355671.4],
		['−4712 Jan 1.5 (JD 0)', 'ch. 7, table', -4712, 1, 1.5, 0.0]
	];

	cases.forEach(([name, source, y, m, d, expected]) => {
		check({
			name: `JD of ${name}`,
			source,
			expected,
			computed: Time.julianDay(y, m, d),
			tol: 0.001,
			unit: 's',
			scale: SECONDS_PER_DAY,
			show: showJD
		});
	});

	// Inverse: calendar date of a Julian Date (Examples 7.c and 7.d).
	const inverses = [
		['JD 2436116.31', 'Ex. 7.c', 2436116.31, 1957, 10, 4.81],
		['JD 1842713.0', 'Ex. 7.d', 1842713.0, 333, 1, 27.5],
		['JD 1507900.13', 'Ex. 7.d', 1507900.13, -584, 5, 28.63]
	];

	inverses.forEach(([name, source, jd, y, m, d]) => {
		const date = Time.calendarDate(jd);
		const sameMonth = date.year === y && date.month === m;

		check({
			name: `Date of ${name}`,
			source,
			expected: d,
			computed: sameMonth ? date.day : NaN,
			tol: 0.001,
			unit: 's',
			scale: SECONDS_PER_DAY,
			show: day => showCalendar({ year: y, month: m, day: day })
		});
	});

	checkEqual('Day of the week, 1954 Jun 30', 'ch. 7', 'Wednesday', Time.weekdayName(Time.julianDay(1954, 6, 30)));
	checkEqual('Day of the year, 1978 Nov 14', 'ch. 7', 318, Time.dayOfYear(1978, 11, 14));
	checkEqual('Day of the year, 1988 Apr 22', 'ch. 7', 113, Time.dayOfYear(1988, 4, 22));
	checkEqual(
		'Days 1910 Apr 20 → 1986 Feb 9 (Halley)',
		'ch. 7',
		27689,
		Time.julianDay(1986, 2, 9) - Time.julianDay(1910, 4, 20)
	);
	checkEqual('MJD of 1858 Nov 17.0', 'ch. 7', 0, Time.mjd(Time.julianDay(1858, 11, 17)));
}

/* ==========================================================================
   4. TIME: DELTA T AND SIDEREAL TIME (Meeus ch. 10, 12)
   ========================================================================== */

function testSiderealTime() {
	group('Delta T and sidereal time · time.js, ephemeris.js');

	// Delta T: Meeus quotes values from observations, rounded to the second.
	check({
		name: 'ΔT on 1977 Feb 18',
		source: 'Ex. 10.a',
		expected: 48,
		computed: Time.deltaT(Time.decimalYear(Time.julianDay(1977, 2, 18))),
		tol: 1,
		unit: 's',
		show: x => x.toFixed(1) + ' s'
	});

	check({
		name: 'ΔT in 2000',
		source: 'Table 10.A',
		expected: 63.8,
		computed: Time.deltaT(2000),
		tol: 0.5,
		unit: 's',
		show: x => x.toFixed(1) + ' s'
	});

	const jd0 = Time.julianDay(1987, 4, 10);
	const hoursPerDegree = 1 / 15;

	check({
		name: 'Mean sidereal time, 1987 Apr 10, 0h UT',
		source: 'Ex. 12.a',
		expected: 13 + 10 / 60 + 46.3668 / 3600,
		computed: Time.gmst(jd0) * hoursPerDegree,
		tol: 0.001,
		unit: 's',
		scale: 3600,
		show: showHours
	});

	check({
		name: 'Apparent sidereal time, same instant',
		source: 'Ex. 12.a',
		expected: 13 + 10 / 60 + 46.1351 / 3600,
		computed: Ephem.apparentSiderealTime(jd0) * hoursPerDegree,
		tol: 0.02,
		unit: 's',
		scale: 3600,
		show: showHours
	});

	check({
		name: 'Mean sidereal time, 1987 Apr 10, 19:21:00 UT',
		source: 'Ex. 12.b',
		expected: 128.7378734,
		computed: Time.gmst(Time.julianDayTime(1987, 4, 10, 19, 21, 0)),
		tol: 0.001,
		unit: '″',
		scale: ARCSEC_PER_DEG,
		show: x => x.toFixed(7) + '°'
	});
}

/* ==========================================================================
   5. EPHEMERIS: OBLIQUITY AND NUTATION (Meeus ch. 22)
   The short nutation series is accurate to 0.5" in longitude and 0.1" in
   obliquity (Meeus ch. 22).
   ====================================================================== */

function testNutation() {
	group('Obliquity and nutation · ephemeris.js');

	const jd = Time.julianDay(1987, 4, 10);
	const nutation = Ephem.nutation(jd);
	const showArcsec = x => x.toFixed(3) + '″';

	check({
		name: 'Nutation in longitude Δψ, 1987 Apr 10',
		source: 'Ex. 22.a',
		expected: -3.788,
		computed: nutation.dpsi * ARCSEC_PER_DEG,
		tol: 0.5,
		unit: '″',
		show: showArcsec
	});

	check({
		name: 'Nutation in obliquity Δε',
		source: 'Ex. 22.a',
		expected: 9.443,
		computed: nutation.deps * ARCSEC_PER_DEG,
		tol: 0.1,
		unit: '″',
		show: showArcsec
	});

	check({
		name: 'Mean obliquity ε₀',
		source: 'Ex. 22.a',
		expected: 23 + 26 / 60 + 27.407 / 3600,
		computed: Ephem.meanObliquity(jd),
		tol: 0.01,
		unit: '″',
		scale: ARCSEC_PER_DEG,
		show: showDms
	});

	// prettier-ignore
	check({
		name: 'True obliquity ε',
		source: 'Ex. 22.a',
		expected: 23 + 26 / 60 + 36.850 / 3600,
		computed: Ephem.obliquity(jd),
		tol: 0.1,
		unit: '″',
		scale: ARCSEC_PER_DEG,
		show: showDms
	});
}

/* ==========================================================================
   6. EPHEMERIS: THE SUN AND THE EQUATION OF TIME (Meeus ch. 25, 28)
   Meeus' values come from the full VSOP87 theory; the reference Sun is
   Standish's, documented to about 0.5' near 2000.
   ========================================================================== */

function testSun() {
	group('The Sun, 1992 Oct 13.0 TD · ephemeris.js');

	const jd = 2448908.5;
	const sun = Ephem.sun(jd);
	const eq = Ephem.equatorial(sun, jd);

	check({
		name: 'Apparent longitude λ',
		source: 'Ex. 25.b',
		expected: 199 + 54 / 60 + 21.56 / 3600,
		computed: sun.lon,
		tol: 30,
		unit: '″',
		scale: ARCSEC_PER_DEG,
		show: showDms,
		angle: true
	});

	check({
		name: 'Latitude β',
		source: 'Ex. 25.b',
		expected: 0.72 / 3600,
		computed: sun.lat,
		tol: 5,
		unit: '″',
		scale: ARCSEC_PER_DEG,
		show: showDms
	});

	check({
		name: 'Distance R',
		source: 'Ex. 25.b',
		expected: 0.99760775,
		computed: sun.dist,
		tol: 0.0001,
		unit: 'au',
		show: x => x.toFixed(8) + ' au'
	});

	check({
		name: 'Apparent right ascension α',
		source: 'Ex. 25.b',
		expected: 13 + 13 / 60 + 30.749 / 3600,
		computed: eq.ra / 15,
		tol: 2,
		unit: 's',
		scale: 3600,
		show: showHours
	});

	check({
		name: 'Apparent declination δ',
		source: 'Ex. 25.b',
		expected: -(7 + 47 / 60 + 1.74 / 3600),
		computed: eq.dec,
		tol: 30,
		unit: '″',
		scale: ARCSEC_PER_DEG,
		show: showDms
	});

	check({
		name: 'Equation of time E',
		source: 'Ex. 28.a',
		expected: 3.427351 * 4,
		computed: Ephem.equationOfTime(jd),
		tol: 2,
		unit: 's',
		scale: 60,
		show: minutes => `${minutes.toFixed(4)} min`
	});
}

/* ==========================================================================
   7. EPHEMERIS: VENUS (Meeus ch. 32, 33)
   ========================================================================== */

function testVenus() {
	group('Venus, 1992 Dec 20.0 TD · ephemeris.js');

	const jd = 2448976.5;
	const helio = Ephem.heliocentric('venus', jd);
	const venus = Ephem.planet('venus', jd);
	const eq = Ephem.equatorial(venus, jd);

	check({
		name: 'Heliocentric longitude L',
		source: 'Ex. 32.a',
		expected: 26.11428,
		computed: helio.lon,
		tol: 60,
		unit: '″',
		scale: ARCSEC_PER_DEG,
		show: showDeg,
		angle: true
	});

	// prettier-ignore
	check({
		name: 'Heliocentric latitude B',
		source: 'Ex. 32.a',
		expected: -2.62070,
		computed: helio.lat,
		tol: 60,
		unit: '″',
		scale: ARCSEC_PER_DEG,
		show: showDeg
	});

	check({
		name: 'Heliocentric distance R',
		source: 'Ex. 32.a',
		expected: 0.724603,
		computed: helio.r,
		tol: 0.0001,
		unit: 'au',
		show: x => x.toFixed(6) + ' au'
	});

	check({
		name: 'Apparent geocentric longitude λ',
		source: 'Ex. 33.a',
		expected: 313.08102,
		computed: venus.lon,
		tol: 90,
		unit: '″',
		scale: ARCSEC_PER_DEG,
		show: showDeg,
		angle: true
	});

	check({
		name: 'Apparent geocentric latitude β',
		source: 'Ex. 33.a',
		expected: -2.08474,
		computed: venus.lat,
		tol: 60,
		unit: '″',
		scale: ARCSEC_PER_DEG,
		show: showDeg
	});

	check({
		name: 'Distance from the Earth Δ',
		source: 'Ex. 33.a',
		expected: 0.910947,
		computed: venus.dist,
		tol: 0.0001,
		unit: 'au',
		show: x => x.toFixed(6) + ' au'
	});

	check({
		name: 'Apparent right ascension α',
		source: 'Ex. 33.a',
		expected: 316.17291,
		computed: eq.ra,
		tol: 90,
		unit: '″',
		scale: ARCSEC_PER_DEG,
		show: showDeg,
		angle: true
	});

	check({
		name: 'Apparent declination δ',
		source: 'Ex. 33.a',
		expected: -18.88801,
		computed: eq.dec,
		tol: 60,
		unit: '″',
		scale: ARCSEC_PER_DEG,
		show: showDeg
	});
}

/* ==========================================================================
   8. EPHEMERIS: THE MOON (Meeus ch. 47)
   The reference Moon IS Meeus' truncated theory, so the geometric values
   must match to the last printed digit.
   ========================================================================== */

function testMoon() {
	group('The Moon, 1992 Apr 12.0 TD · ephemeris.js');

	const jd = 2448724.5;
	const geometric = Ephem.moon(jd, { apparent: false });
	const apparent = Ephem.moon(jd);
	const eq = Ephem.equatorial(apparent, jd);

	check({
		name: 'Geometric longitude λ',
		source: 'Ex. 47.a',
		expected: 133.162655,
		computed: geometric.lon,
		tol: 0.01,
		unit: '″',
		scale: ARCSEC_PER_DEG,
		show: showDeg,
		angle: true
	});

	check({
		name: 'Latitude β',
		source: 'Ex. 47.a',
		expected: -3.229126,
		computed: geometric.lat,
		tol: 0.01,
		unit: '″',
		scale: ARCSEC_PER_DEG,
		show: showDeg
	});

	check({
		name: 'Distance Δ',
		source: 'Ex. 47.a',
		expected: 368409.7,
		computed: geometric.dist,
		tol: 0.1,
		unit: 'km',
		show: x => x.toFixed(1) + ' km'
	});

	check({
		name: 'Apparent longitude (with nutation)',
		source: 'Ex. 47.a',
		expected: 133.167265,
		computed: apparent.lon,
		tol: 0.5,
		unit: '″',
		scale: ARCSEC_PER_DEG,
		show: showDeg,
		angle: true
	});

	// prettier-ignore
	check({
		name: 'Apparent right ascension α',
		source: 'Ex. 47.a',
		expected: 134.688470,
		computed: eq.ra,
		tol: 0.5,
		unit: '″',
		scale: ARCSEC_PER_DEG,
		show: showDeg,
		angle: true
	});

	check({
		name: 'Apparent declination δ',
		source: 'Ex. 47.a',
		expected: 13.768368,
		computed: eq.dec,
		tol: 0.5,
		unit: '″',
		scale: ARCSEC_PER_DEG,
		show: showDeg
	});
}

/* ==========================================================================
   9. EPHEMERIS: LONG-TERM PRECESSION (SOFA / ERFA)
   The pole vectors of Vondrak, Capitaine & Wallace (2011), against the
   values of the SOFA / ERFA test suite (t_erfa_c.c, t_ltpecl, t_ltpequ).
   ========================================================================== */

/* JD of a Julian epoch, e.g. -1500.0. */
const jdOfJulianEpoch = epoch => Time.J2000 + (epoch - 2000) * 365.25;

function testPrecession() {
	group('Long-term precession · ephemeris.js');

	const cases = [
		[
			'Ecliptic pole, epoch −1500',
			'ERFA ltpecl',
			Ephem.eclipticPole(jdOfJulianEpoch(-1500)),
			// eslint-disable-next-line no-loss-of-precision -- the ERFA values as printed
			[0.4768625676477096525e-3, -0.4052259533091875112, 0.9142164401096448012]
		],
		[
			'Equator pole, epoch −2500',
			'ERFA ltpequ',
			Ephem.equatorPole(jdOfJulianEpoch(-2500)),
			// eslint-disable-next-line no-loss-of-precision -- the ERFA values as printed
			[-0.3586652560237326659, -0.1996978910771128475, 0.9118552442250819624]
		]
	];

	cases.forEach(([name, source, computed, expected]) => {
		['x', 'y', 'z'].forEach((axis, i) => {
			check({
				name: `${name}, ${axis}`,
				source,
				expected: expected[i],
				computed: computed[i],
				tol: 1e-12,
				show: x => x.toFixed(12)
			});
		});
	});
}

/* ==========================================================================
   10. EPHEMERIS: JPL HORIZONS SPOT CHECKS (DE441)
   Apparent geocentric ecliptic longitude of date from JPL Horizons
   (ssd.jpl.nasa.gov/api/horizons.api: CENTER='500@399', QUANTITIES='31',
   TIME_TYPE='TT'; Mars, Jupiter, Saturn as system barycentres 4, 5, 6),
   retrieved 2026-10-17. Tolerances: the accuracy measured over
   500 BC - 2500 AD in the header of ephemeris.js, rounded up.
   ========================================================================== */

// prettier-ignore
const HORIZONS = {
	sun: { tol: 1, lon: [277.8067477, 280.2381372, 280.3681519] },
	moon: { tol: 2, lon: [227.7461056, 165.5780597, 223.3148557] },
	mars: { tol: 10, lon: [274.8599572, 184.3202657, 327.9627159] },
	jupiter: { tol: 15, lon: [230.5986807, 339.8496167, 25.2530433] },
	saturn: { tol: 25, lon: [157.4616007, 289.7995954, 40.3956640] }
};

const HORIZONS_DATES = [
	['200 BC Jan 1', 1648373.5],
	['137 AD Jan 1', 1771097.5],
	['J2000', 2451545.0]
];

function testHorizons() {
	group('JPL Horizons (DE441), apparent longitude · ephemeris.js');

	Object.entries(HORIZONS).forEach(([body, data]) => {
		HORIZONS_DATES.forEach(([label, jd], i) => {
			check({
				name: `${body[0].toUpperCase() + body.slice(1)}, ${label}`,
				source: 'Horizons',
				expected: data.lon[i],
				computed: Ephem.longitude(body, jd),
				tol: data.tol,
				unit: '′',
				scale: 60,
				show: x => x.toFixed(4) + '°',
				angle: true
			});
		});
	});
}

/* ==========================================================================
   11. INTERNAL CONSISTENCY
   ========================================================================== */

function testConsistency() {
	group('Internal consistency');

	// Calendar round trip: JD -> date -> JD at many dates over the range.
	let worstCalendar = 0;

	for (let jd = Ephem.RANGE.start; jd <= Ephem.RANGE.end; jd += 997.37) {
		const c = Time.calendarDate(jd);

		worstCalendar = Math.max(worstCalendar, Math.abs(Time.julianDay(c.year, c.month, c.day) - jd));
	}

	check({
		name: 'JD → date → JD, 3000 BC – 3000 AD',
		source: 'round trip',
		expected: 0,
		computed: worstCalendar,
		tol: 0.001,
		unit: 's',
		scale: SECONDS_PER_DAY,
		show: x => x.toExponential(1) + ' d'
	});

	// The calendar reform: 1582 Oct 4 (Julian) is followed by Oct 15 (Gregorian).
	checkEqual(
		'Day after 1582 Oct 4 (Julian)',
		'ch. 7',
		'1582 10 15',
		showCalendar(Time.calendarDate(Time.julianDay(1582, 10, 4) + 1))
	);

	// Precession there and back again.
	let worstPrecession = 0;

	for (let lon = 0; lon < 360; lon += 37) {
		const forward = Ephem.precessEcliptic(lon, 3, Time.J2000, Time.julianDay(-200, 1, 1));
		const back = Ephem.precessEcliptic(forward.lon, forward.lat, Time.julianDay(-200, 1, 1), Time.J2000);

		worstPrecession = Math.max(worstPrecession, Math.abs(norm180(back.lon - lon)));
	}

	check({
		name: 'Precession J2000 → 200 BC → J2000',
		source: 'round trip',
		expected: 0,
		computed: worstPrecession,
		tol: 0.01,
		unit: '″',
		scale: ARCSEC_PER_DEG,
		show: x => x.toExponential(1) + '°'
	});

	// Kepler's equation: E - e sin E = M after solving.
	let worstKepler = 0;

	for (let M = -180; M < 180; M += 13) {
		const e = 0.2;
		const E = Ephem.solveKepler(M, e);

		worstKepler = Math.max(worstKepler, Math.abs(E - e * R2D * sin(E) - M));
	}

	check({
		name: "Kepler's equation residual, e = 0.2",
		source: 'solveKepler',
		expected: 0,
		computed: worstKepler,
		tol: 1e-6,
		unit: '″',
		scale: ARCSEC_PER_DEG,
		show: x => x.toExponential(1) + '°'
	});
}

/* ==========================================================================
   12. REFRACTION, STARS, THE TURNING SKY, FRAMES
   ========================================================================== */

function testRefraction() {
	group('Refraction · ephemeris.js (Meeus ch. 16)');

	check({
		name: 'Refraction at apparent altitude 0°30′',
		source: 'Ex. 16.a',
		expected: 28.754,
		computed: Ephem.refractionOfApparent(0.5) * 60,
		tol: 0.001,
		unit: '′',
		show: x => x.toFixed(3) + '′'
	});

	// Saemundsson (true -> apparent) against Bennett (apparent -> true).
	let worst = 0;

	for (let h = -0.5; h <= 90; h += 0.05) {
		const R = Ephem.refraction(h);

		worst = Math.max(worst, Math.abs(Ephem.refractionOfApparent(h + R) - R));
	}

	check({
		name: 'Saemundsson vs Bennett, true altitude −0.5° … 90°',
		source: '16.3, 16.4',
		expected: 0,
		computed: worst,
		tol: 4,
		unit: '″',
		scale: ARCSEC_PER_DEG,
		show: x => (x * 60).toFixed(3) + '′'
	});
}

function testStarPrecession() {
	group('Precession of a star · ephemeris.js (Meeus ch. 21)');

	// Example 21.b: theta Persei, J2000 to 2028 Nov 13.19 TD, with the
	// proper motion in right ascension given in seconds of time per year.
	const years = (2462088.69 - Time.J2000) / 365.25;
	const ra0 = (2 + 44 / 60 + 11.986 / 3600) * 15 + (0.03425 * years * 15) / 3600;
	const dec0 = 49 + 13 / 60 + 42.48 / 3600 - (0.0895 * years) / 3600;
	const p = Ephem.precessEquatorial(ra0, dec0, Time.J2000, 2462088.69);

	check({
		name: 'θ Persei, right ascension',
		source: 'Ex. 21.b',
		expected: (2 + 46 / 60 + 11.331 / 3600) * 15,
		computed: p.ra,
		tol: 0.05,
		unit: 's',
		scale: 240,
		show: x => hms(x / 15, 3),
		angle: true
	});

	check({
		name: 'θ Persei, declination',
		source: 'Ex. 21.b',
		expected: 49 + 20 / 60 + 54.54 / 3600,
		computed: p.dec,
		tol: 0.5,
		unit: '″',
		scale: ARCSEC_PER_DEG,
		show: showDms
	});

	// Stars.ofDate at J2000 is the catalogue position itself.
	const vega = Stars.find('Vega');
	const vegaJ2000 = Stars.ofDate(vega, Time.J2000);

	check({
		name: 'Stars.ofDate(Vega, J2000) = catalogue',
		source: 'stars.js',
		expected: vega.dec,
		computed: vegaJ2000.dec,
		tol: 0.001,
		unit: '″',
		scale: ARCSEC_PER_DEG,
		show: showDeg
	});
}

function testDiurnal() {
	group('The turning sky · models/diurnal.js (page 1.1)');

	// Almagest II 3: at Rhodes (phi = 36°) with Ptolemy's obliquity
	// 23;51,20 the longest day is 14 1/2 equinoctial hours.
	const eps = 23 + 51 / 60 + 20 / 3600;
	const longestDay = (2 * Diurnal.risingHourAngle(eps, 36)) / 15;

	check({
		name: 'Longest day at Rhodes, φ = 36°',
		source: 'Almagest II 3',
		expected: 14.5,
		computed: longestDay,
		tol: 0.5,
		unit: 'min',
		scale: 60,
		show: h => h.toFixed(4) + ' h'
	});

	// The matrices agree with the altitude formula, and the fractions of
	// stars of opposite declination add up to one turn.
	let worstAltitude = 0;
	let worstFraction = 0;

	for (let phi = -85; phi <= 85; phi += 17) {
		for (let dec = -80; dec <= 80; dec += 23) {
			for (let theta = 0; theta < 360; theta += 41) {
				const ra = 123;
				const v = matApply(Diurnal.equatorialToHorizon(phi, theta), fromLonLat(ra, dec));
				const a = Diurnal.altitude(dec, Diurnal.hourAngle(theta, ra), phi);

				worstAltitude = Math.max(worstAltitude, Math.abs(asin(v[2]) - a));
			}

			worstFraction = Math.max(
				worstFraction,
				Math.abs(Diurnal.fractionAbove(dec, phi) + Diurnal.fractionAbove(-dec, phi) - 1)
			);
		}
	}

	check({
		name: 'R_y(φ − 90°) R_z(−θ) vs sin a formula',
		source: 'page 1.1',
		expected: 0,
		computed: worstAltitude,
		tol: 0.01, // asin loses digits near the zenith
		unit: '″',
		scale: ARCSEC_PER_DEG,
		show: x => x.toExponential(1) + '°'
	});

	check({
		name: 'f(δ) + f(−δ) = 1',
		source: 'page 1.1',
		expected: 0,
		computed: worstFraction,
		tol: 1e-9,
		show: x => x.toExponential(1)
	});

	check({
		name: 'One turn of the sky',
		source: 'Meeus 12.4',
		expected: 23 + 56 / 60 + 4.0905 / 3600,
		computed: Diurnal.TURN_HOURS,
		tol: 0.01,
		unit: 's',
		scale: 3600,
		show: h => hms(h, 3)
	});
}

function testFrames() {
	group('Frames · models/frames.js (page 1.2)');

	// Meeus example 13.a: Pollux, equatorial -> ecliptic (eps = 23.4392911°).
	const pollux = Frames.equatorialToEcliptic(116.328942, 28.026183, 23.4392911);

	// prettier-ignore
	check({
		name: 'Pollux: λ', source: 'Meeus ex. 13.a',
		expected: 113.215630, computed: pollux.lon,
		tol: 0.1, unit: '″', scale: ARCSEC_PER_DEG, show: showDeg, angle: true
	});

	// prettier-ignore
	check({
		name: 'Pollux: β', source: 'Meeus ex. 13.a',
		expected: 6.684170, computed: pollux.lat,
		tol: 0.1, unit: '″', scale: ARCSEC_PER_DEG, show: showDeg
	});

	// Meeus example 13.b: Venus from Washington, H = 64.352133°,
	// delta = -6°43'11.61", phi = 38°55'17". Meeus counts the azimuth from
	// the south (68.0337°): from the north it is 248.0337°.
	const phi = 38 + 55 / 60 + 17 / 3600;
	const venusDec = -(6 + 43 / 60 + 11.61 / 3600);
	const venus = Frames.equatorialToHorizontal(0, venusDec, phi, 64.352133);

	check({
		name: 'Venus: azimuth from the north',
		source: 'Meeus ex. 13.b',
		expected: 68.0337 + 180,
		computed: venus.A,
		tol: 1,
		unit: '″',
		scale: ARCSEC_PER_DEG,
		show: x => x.toFixed(4) + '°',
		angle: true
	});

	check({
		name: 'Venus: altitude',
		source: 'Meeus ex. 13.b',
		expected: 15.1249,
		computed: venus.a,
		tol: 1,
		unit: '″',
		scale: ARCSEC_PER_DEG,
		show: x => x.toFixed(4) + '°'
	});

	// Almagest I 14: the two worked declinations, lambda = 30° and 60°.
	[
		[30, 11 + 40 / 60],
		[60, 20 + 30 / 60 + 9 / 3600]
	].forEach(([lon, expected]) => {
		check({
			name: `Ptolemy's declination at λ = ${lon}°`,
			source: 'Almagest I 14',
			expected: expected,
			computed: Frames.eclipticPoint(lon, Frames.PTOLEMY_OBLIQUITY).dec,
			tol: 2,
			unit: '″',
			scale: ARCSEC_PER_DEG,
			show: showDms
		});
	});

	// Matrices against the multiplied-out formulas, Ephem's own formulas and
	// the inverses, over a grid of directions, latitudes and turns.
	let worst = 0;

	for (let lon = 5; lon < 360; lon += 37) {
		for (let lat = -80; lat <= 80; lat += 20) {
			const eq = Frames.eclipticToEquatorial(lon, lat, EPS);
			const viaMatrix = toLonLat(matApply(Frames.eclipticToEquatorialMatrix(EPS), fromLonLat(lon, lat)));
			const viaEphem = Ephem.eclipticToEquatorial(lon, lat, EPS);
			const back = Frames.equatorialToEcliptic(eq.ra, eq.dec, EPS);
			const differences = [
				norm180(viaMatrix.lon - eq.ra) * cos(eq.dec),
				viaMatrix.lat - eq.dec,
				norm180(viaEphem.ra - eq.ra) * cos(eq.dec),
				viaEphem.dec - eq.dec,
				norm180(back.lon - lon) * cos(lat),
				back.lat - lat
			];

			for (let latitude = -70; latitude <= 70; latitude += 35) {
				const theta = lon * 1.7 + 11;
				const hor = Frames.equatorialToHorizontal(eq.ra, eq.dec, latitude, theta);
				const horMatrix = Frames.toHorizontal(
					matApply(Frames.equatorialToHorizonMatrix(latitude, theta), fromLonLat(eq.ra, eq.dec))
				);
				const eqBack = Frames.horizontalToEquatorial(hor.A, hor.a, latitude, theta);

				differences.push(
					norm180(horMatrix.A - hor.A) * cos(hor.a),
					horMatrix.a - hor.a,
					norm180(eqBack.ra - eq.ra) * cos(eq.dec),
					eqBack.dec - eq.dec
				);
			}

			differences.forEach(d => {
				worst = Math.max(worst, Math.abs(d));
			});
		}
	}

	check({
		name: 'Matrices vs formulas, Ephem, inverses',
		source: 'page 1.2',
		expected: 0,
		computed: worst,
		tol: 0.001,
		unit: '″',
		scale: ARCSEC_PER_DEG,
		show: x => x.toExponential(1) + '°'
	});

	// Almagest I 15 and I 16 against the formulas with eps = 23°51'20".
	let worstTable = 0;

	Frames.PTOLEMY_DECLINATIONS.forEach((dec, i) => {
		worstTable = Math.max(worstTable, Math.abs(dec - Frames.eclipticPoint(i + 1, Frames.PTOLEMY_OBLIQUITY).dec));
	});

	check({
		name: "Ptolemy's table of inclination, 90 entries",
		source: 'Almagest I 15',
		expected: 0,
		computed: worstTable,
		tol: 10, // the largest is a scribal error Toomer flags (27°)
		unit: '″',
		scale: ARCSEC_PER_DEG,
		show: showDms
	});

	let worstRA = 0;

	Frames.ptolemyRightAscensions().forEach((ra, i) => {
		worstRA = Math.max(worstRA, Math.abs(ra - Frames.eclipticPoint(10 * i, Frames.PTOLEMY_OBLIQUITY).ra));
	});

	check({
		name: "Ptolemy's right ascensions, every 10°",
		source: 'Almagest I 16',
		expected: 0,
		computed: worstRA,
		tol: 0.5, // Ptolemy rounds to the minute
		unit: '′',
		scale: 60,
		show: showDms
	});

	// The ecliptic pole is at alpha = 270°, delta = 90° - eps.
	const pole = toLonLat(Frames.eclipticPole(EPS));

	check({
		name: 'Ecliptic pole: δ = 90° − ε',
		source: 'page 1.2',
		expected: 90 - EPS,
		computed: pole.lat,
		tol: 0.001,
		unit: '″',
		scale: ARCSEC_PER_DEG,
		show: showDeg
	});
}

/* ==========================================================================
   13. THE CLOCKS AND THE MEAN SUN (page 1.3)
   ========================================================================== */

function testClock() {
	group('The clocks · models/mean-sun.js, models/clock.js (page 1.3)');

	// The linear sidereal clock against Meeus' worked example (the T^2 and
	// T^3 terms he includes are a few milliseconds in 1987).
	check({
		name: 'Linear mean sidereal time, 1987 Apr 10, 0h UT',
		source: 'Ex. 12.a',
		expected: 13 + 10 / 60 + 46.3668 / 3600,
		computed: Clock.gmst(Time.julianDay(1987, 4, 10)) / 15,
		tol: 0.01,
		unit: 's',
		scale: 3600,
		show: showHours
	});

	// The clock's rate is 360° plus the mean Sun's daily motion; the two
	// published values differ by 2e-5" a day.
	check({
		name: "Sidereal rate − 360° = mean Sun's n",
		source: 'Meeus 12.4, 25.2',
		expected: MeanSun.MODERN.n,
		computed: Clock.RATE - 360,
		tol: 1e-4, // 0.8" a century: UT and TT days, rounding
		unit: '″/day',
		scale: ARCSEC_PER_DEG,
		show: x => x.toFixed(10) + '°'
	});

	check({
		name: 'Tropical year 360° / n',
		source: 'Laskar (1986), J2000',
		expected: 365.2421897,
		computed: MeanSun.yearLength(),
		tol: 1,
		unit: 's',
		scale: SECONDS_PER_DAY,
		show: x => x.toFixed(6) + ' d'
	});

	// Every transit returned has H = 0, at several longitudes and dates.
	let worstTransit = 0;
	let count = 0;

	for (let day = 0; day < 365; day += 7) {
		for (let lon = -180; lon < 180; lon += 37) {
			[0, 101.3, 279.5].forEach(ra => {
				Clock.transits(ra, Time.julianDay(2026, 1, 1) + day, lon).forEach(jd => {
					worstTransit = Math.max(worstTransit, Math.abs(Clock.hourAngle(jd, lon, ra)));
					count++;
				});
			});
		}
	}

	check({
		name: `H = 0 at ${count} transits`,
		source: 'page 1.3',
		expected: 0,
		computed: worstTransit,
		tol: 0.001,
		unit: 's',
		scale: 240,
		show: x => x.toExponential(1) + '°'
	});

	// With the geometric horizon, the equator has 12 h days all year.
	let worstEquator = 0;

	for (let day = 0; day < 365; day += 5) {
		const sunDay = Clock.sunDay(Time.julianDay(2026, 1, 1) + day, 0, 0, 0);

		worstEquator = Math.max(worstEquator, Math.abs(sunDay.hours - 12));
	}

	check({
		name: 'Day at the equator, h₀ = 0',
		source: 'page 1.1',
		expected: 0,
		computed: worstEquator,
		tol: 1e-6,
		unit: 's',
		scale: 3600,
		show: x => x.toExponential(1) + ' h'
	});

	// Almagest III 7: from Nabonassar 1, Thoth 1, noon (-746 Feb 26) to the
	// autumn equinox of Hadrian 17, Athyr 7, 2 h after noon (132 Sep 25),
	// 879 Egyptian years of 365 days, 66 days and 2 hours.
	check({
		name: 'Nabonassar to the equinox of AD 132',
		source: 'Almagest III 7',
		expected: 879 * 365 + 66 + 2 / 24,
		computed: Time.julianDay(132, 9, 25.5 + 2 / 24) - Time.julianDay(-746, 2, 26.5),
		tol: 1,
		unit: 's',
		scale: SECONDS_PER_DAY,
		show: x => x.toFixed(4) + ' d'
	});
}

/* ==========================================================================
   14. RUN
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
	testJulianDay();
	testSiderealTime();
	testNutation();
	testSun();
	testVenus();
	testMoon();
	testPrecession();
	testHorizons();
	testConsistency();
	testRefraction();
	testStarPrecession();
	testDiurnal();
	testFrames();
	testClock();
	render();
});
