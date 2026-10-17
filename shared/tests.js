/* ==========================================================================
   PREDICTING THE SKY - TESTS (tests.js)
   Script of tests.html: checks time.js and ephemeris.js against the worked
   examples of J. Meeus, Astronomical Algorithms (2nd ed., 1998), the SOFA /
   ERFA test values of the long-term precession, positions from JPL
   Horizons (DE441), and a few internal consistency checks, and prints
   pass / fail with the error.

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
	12. Run
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
	const {
		name, source, expected, computed, tol,
		unit = '', scale = 1, show = String, angle = false
	} = options;
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
	summary.textContent = failed.length === 0 ?
		`All ${cases.length} tests pass.` :
		`${failed.length} of ${cases.length} tests FAIL: ${failed.map(r => r.name).join(', ')}`;

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

	checkEqual('Day of the week, 1954 Jun 30', 'ch. 7', 'Wednesday',
		Time.weekdayName(Time.julianDay(1954, 6, 30)));
	checkEqual('Day of the year, 1978 Nov 14', 'ch. 7', 318, Time.dayOfYear(1978, 11, 14));
	checkEqual('Day of the year, 1988 Apr 22', 'ch. 7', 113, Time.dayOfYear(1988, 4, 22));
	checkEqual('Days 1910 Apr 20 → 1986 Feb 9 (Halley)', 'ch. 7', 27689,
		Time.julianDay(1986, 2, 9) - Time.julianDay(1910, 4, 20));
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
		['Ecliptic pole, epoch −1500', 'ERFA ltpecl', Ephem.eclipticPole(jdOfJulianEpoch(-1500)),
			[0.4768625676477096525e-3, -0.4052259533091875112, 0.9142164401096448012]],
		['Equator pole, epoch −2500', 'ERFA ltpequ', Ephem.equatorPole(jdOfJulianEpoch(-2500)),
			[-0.3586652560237326659, -0.1996978910771128475, 0.9118552442250819624]]
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
	checkEqual('Day after 1582 Oct 4 (Julian)', 'ch. 7',
		'1582 10 15', showCalendar(Time.calendarDate(Time.julianDay(1582, 10, 4) + 1)));

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
		name: 'Kepler\'s equation residual, e = 0.2',
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
   12. RUN
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
	render();
});
