/* ==========================================================================
   PREDICTING THE SKY - GOLDEN VALUES (tools/check/golden.js)
   A safety net for refactoring: loads the site's shared code (and each
   page's own script, with a stub for the DOM) in Node vm contexts, as the
   scripts of tools/numbers/ do, and prints a table of reference values:
   time scales and sidereal time, the equation of time, the Sun, the Moon
   and the planets on a set of dates, the stars of date, the models of
   pages 1.1 to 2.2, the formatting helpers behind every read-out, and
   the output of tools/numbers/ (every number quoted in the prose).

   Any change of behaviour in the maths shows up as a difference in this
   table. Values are printed with a fixed number of decimals (angles to
   1e-9 deg, Julian Dates to 1e-9 day), far below anything a page shows,
   so a harmless reordering of floating-point operations does not count.

   Usage, from the repository root:
	 node tools/check/golden.js            print the table
	 node tools/check/golden.js --write    save it as tools/check/golden.txt
	 node tools/check/golden.js --check    compare with golden.txt (exit 1
										   and show the first differences)

   Not part of the site: nothing in the pages loads this file.

   TABLE OF CONTENTS
	 1. Loading the code
	 2. Formatting
	 3. Time and sidereal time
	 4. The reference sky: Sun, Moon, planets
	 5. Stars of date
	 6. The models: turning sky, frames, mean Sun, clocks, solar eccentric,
	    equation of time
	 7. Display helpers (shared)
	 8. Page scripts: helpers and precomputed values
	 9. The numbers scripts (tools/numbers/)
	10. Main
   ========================================================================== */

'use strict';

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const { ROOT, loadFiles, loadPage, inContext } = require('./load.js');

/* ==========================================================================
   1. LOADING THE CODE (tools/check/load.js)
   ========================================================================== */

const GOLDEN_FILE = path.join(__dirname, 'golden.txt');

/* The shared files with no DOM at load time, in dependency order. */
const SHARED_FILES = [
	'shared/common.js',
	'shared/time.js',
	'shared/ephemeris.js',
	'shared/stars.js',
	'shared/plate-stars.js',
	'shared/models/diurnal.js',
	'shared/models/frames.js',
	'shared/models/mean-sun.js',
	'shared/models/clock.js',
	'shared/models/solar-eccentric.js',
	'shared/models/equation-of-time.js',
	'shared/plot2d.js',
	'shared/errorcurve.js'
];

/* The pages whose own script is loaded (helpers and values computed at
   load time; the figures themselves need a browser: tools/check/smoke.js). */
const PAGE_FILES = [
	'act1-stage/01-turning-sky/index.html',
	'act1-stage/02-frames/index.html',
	'act1-stage/03-clocks/index.html',
	'act2-sun/01-uneven-year/index.html',
	'act2-sun/02-equation-of-time/index.html'
];

/* ==========================================================================
   2. FORMATTING
   Every value goes through one of these, so the output is stable.
   ========================================================================== */

const lines = [];

const out = text => lines.push(text);
const title = text => out(`\n=== ${text} ===`);

/* A number with a fixed number of decimals; never "-0.000". */
function num(x, digits = 9) {
	if (typeof x !== 'number') {
		return String(x);
	}

	if (!Number.isFinite(x)) {
		return String(x);
	}

	const text = x.toFixed(digits);

	return Number(text) === 0 ? (0).toFixed(digits) : text;
}

/* "name  value" with the names in a column. */
function row(name, ...values) {
	out(`  ${name.padEnd(30)} ${values.join('  ')}`);
}

/* A vector with each component to 'digits' decimals. */
const vec = (v, digits = 12) => `[${v.map(x => num(x, digits)).join(', ')}]`;

/* A string shown exactly, between quotes. */
const quote = text => JSON.stringify(text);

/* ==========================================================================
   3. TIME AND SIDEREAL TIME
   ========================================================================== */

/* The dates of the table: [label, year, month, day (with fraction), in UT]. */
const DATES = [
	['range start', -2999, 1, 1],
	['Thales eclipse', -584, 5, 28],
	['Ptolemy', 139, 7, 20.5],
	['last Julian day', 1582, 10, 4],
	['first Gregorian day', 1582, 10, 15],
	['Sputnik (Meeus 7.a)', 1957, 10, 4.81],
	['Meeus 12.a', 1987, 4, 10],
	['Meeus 47.a', 1992, 4, 12],
	['Meeus 25.a', 1992, 10, 13],
	['J2000.0', 2000, 1, 1.5],
	['2026 January 1', 2026, 1, 1],
	['2026 June solstice', 2026, 6, 21.5],
	['range end', 3000, 12, 31]
];

function timeSection(c) {
	const { Time, Ephem, Clock } = c;

	title('3. TIME AND SIDEREAL TIME (input: calendar date in UT)');

	DATES.forEach(([label, year, month, day]) => {
		const jdUT = Time.julianDay(year, month, day);
		const back = Time.calendarDate(jdUT);
		const jdTT = Time.ttFromUt(jdUT);

		out(`\n${label}: ${year}-${month}-${day}`);
		row('JD(UT)', num(jdUT));
		row('calendarDate(JD)', back.year, back.month, num(back.day));
		row(
			'julianDay gregorian / julian',
			num(Time.julianDay(year, month, day, 'gregorian')),
			num(Time.julianDay(year, month, day, 'julian'))
		);
		row('MJD, centuries', num(Time.mjd(jdUT)), num(Time.centuries(jdUT), 12));
		row(
			'weekday, day of year, leap',
			Time.weekdayName(jdUT),
			Time.dayOfYear(year, month, day),
			Time.isLeapYear(year)
		);
		row('decimalYear', num(Time.decimalYear(jdUT)));
		row('jdFromDecimalYear(decimalYear)', num(Time.jdFromDecimalYear(Time.decimalYear(jdUT))));
		row('Delta T (s)', num(Time.deltaT(Time.decimalYear(jdUT)), 6));
		row('JD(TT), utFromTt(JD(TT))', num(jdTT), num(Time.utFromTt(jdTT)));
		row('GMST Time.gmst (deg)', num(Time.gmst(jdUT)));
		row('GMST Clock.gmst (deg)', num(Clock.gmst(jdUT)));
		row('GAST (deg)', num(Ephem.apparentSiderealTime(jdUT)));
		row('LST at 12.4964 E, -74.0 E', num(Time.lst(jdUT, 12.4964)), num(Clock.lst(jdUT, -74)));
		row('local mean time at 12.4964 E (h)', num(Clock.localMeanTime(jdUT, 12.4964)));
		row('equation of time (min)', num(Ephem.equationOfTime(jdTT)));
		row(
			'formatDate',
			quote(Time.formatDate(jdUT)),
			quote(Time.formatDate(jdUT, { time: true })),
			quote(Time.formatDate(jdUT, { era: 'astronomical' }))
		);
		row('Ephem.inRange', Ephem.inRange(jdTT));
	});
}

/* ==========================================================================
   4. THE REFERENCE SKY: SUN, MOON, PLANETS
   ========================================================================== */

/* { lon, lat, dist } -> one line. */
const position = p => `lon ${num(p.lon)}  lat ${num(p.lat)}  dist ${num(p.dist ?? p.r, 9)}`;

function skySection(c) {
	const { Time, Ephem } = c;

	title('4. THE REFERENCE SKY (input: the same dates, converted to TT)');

	DATES.forEach(([label, year, month, day]) => {
		const jdTT = Time.ttFromUt(Time.julianDay(year, month, day));
		const nutation = Ephem.nutation(jdTT);
		const sun = Ephem.sun(jdTT);
		const sunEq = Ephem.equatorial(sun, jdTT);

		out(`\n${label}: JD(TT) ${num(jdTT)}`);
		row('mean / true obliquity', num(Ephem.meanObliquity(jdTT)), num(Ephem.obliquity(jdTT)));
		row('nutation dpsi, deps (deg)', num(nutation.dpsi, 12), num(nutation.deps, 12));
		row('Sun mean longitude', num(Ephem.sunMeanLongitude(jdTT)));
		row('Sun apparent', position(sun));
		row('Sun geometric', position(Ephem.sun(jdTT, { apparent: false })));
		row('Sun ra, dec', num(sunEq.ra), num(sunEq.dec));
		row('Moon apparent', position(Ephem.moon(jdTT)));
		row('Moon geometric', position(Ephem.moon(jdTT, { apparent: false })));

		Ephem.PLANETS.forEach(body => {
			row(body, position(Ephem.planet(body, jdTT)));
			row(`${body} geometric`, position(Ephem.position(body, jdTT, { apparent: false })));
			row(`${body} heliocentric`, position(Ephem.heliocentric(body, jdTT)));
		});

		row('ecliptic pole (J2000 eq.)', vec(Ephem.eclipticPole(jdTT)));
		row('equator pole (J2000 eq.)', vec(Ephem.equatorPole(jdTT)));
	});

	out("\nKepler's equation (M, e -> E)");
	[
		[0, 0.2],
		[5, 0.0167],
		[90, 0.2056],
		[179.9, 0.0934],
		[-120, 0.0485]
	].forEach(([M, e]) => {
		row(`M ${M}, e ${e}`, num(Ephem.solveKepler(M, e), 12));
	});

	out('\nRefraction (deg) at true / apparent altitude');
	[-2, -1, -0.6, 0, 0.5, 1, 5, 10, 30, 45, 89.9].forEach(h => {
		row(`h ${h}`, num(Ephem.refraction(h), 12), num(Ephem.refractionOfApparent(h), 12));
	});
}

/* ==========================================================================
   5. STARS OF DATE
   ========================================================================== */

function starSection(c) {
	const { Time, Stars, PLATE_STARS } = c;
	const epochs = [
		['J2000', Time.J2000],
		['2026.0', Time.julianDay(2026, 1, 1)],
		['-584', Time.julianDay(-584, 5, 28)],
		['3000', Time.julianDay(3000, 1, 1)]
	];

	title('5. STARS OF DATE (Stars.ofDate, ra and dec in degrees)');

	Stars.LIST.forEach(star => {
		const values = epochs.map(([name, jd]) => {
			const p = Stars.ofDate(star, jd);

			return `${name} ${num(p.ra)} ${num(p.dec)}`;
		});

		row(star.name, `mag ${star.mag}  size ${num(c.starSize(star.mag), 6)}`);
		row('', ...values);
	});

	out('\nThe stars of the blue plates at 2026.0 (as plate.js places them)');

	PLATE_STARS.forEach(star => {
		const p = Stars.ofDate(star, Time.julianDay(2026, 1, 1));

		row(star.id, num(p.ra), num(p.dec), `mag ${star.mag}`);
	});
}

/* ==========================================================================
   6. THE MODELS: TURNING SKY, FRAMES, MEAN SUN, CLOCKS
   ========================================================================== */

function diurnalSection(c) {
	const { Diurnal } = c;
	const declinations = [-90, -60, -23.44, -0.5, 0, 16.5, 38.78, 60, 89.26, 90];
	const latitudes = [-90, -41.9, 0, 41.9, 66.56, 90];
	const horizons = [0, -34 / 60, -50 / 60];

	title('6a. THE TURNING SKY (models/diurnal.js)');
	row('rates', num(Diurnal.DEGREES_PER_DAY, 12), num(Diurnal.DEGREES_PER_HOUR, 12), num(Diurnal.TURN_HOURS, 12));
	row('hourAngle(10, 350), (350, 10)', num(Diurnal.hourAngle(10, 350)), num(Diurnal.hourAngle(350, 10)));
	row('hourAngle(180, 0), (0, 180)', num(Diurnal.hourAngle(180, 0)), num(Diurnal.hourAngle(0, 180)));
	out("  dec, phi: class (h0 = 0, -34', -50'), H0 for each h0, a_max, a_min, a at H = 0 45 90 180");

	declinations.forEach(dec => {
		latitudes.forEach(phi => {
			const classes = horizons.map(h0 => Diurnal.classify(dec, phi, h0));
			const H0 = horizons.map(h0 => num(Diurnal.risingHourAngle(dec, phi, h0)));
			const altitudes = [0, 45, 90, 180].map(H => num(Diurnal.altitude(dec, H, phi)));

			row(
				`${dec}, ${phi}`,
				classes.join('/'),
				H0.join(' '),
				num(Diurnal.upperCulmination(dec, phi)),
				num(Diurnal.lowerCulmination(dec, phi)),
				altitudes.join(' '),
				num(Diurnal.fractionAbove(dec, phi), 12)
			);
		});
	});

	row('starInSky(38.78, 30)', vec(Diurnal.starInSky(38.78, 30)));
	row('zenithInSky(41.9)', vec(Diurnal.zenithInSky(41.9)));
	row(
		'equatorialToHorizon(41.9, 38.94)',
		Diurnal.equatorialToHorizon(41.9, 38.94)
			.map(r => vec(r))
			.join(' ')
	);
}

function framesSection(c) {
	const { Frames, EPS } = c;
	const obliquities = [Frames.PTOLEMY_OBLIQUITY, EPS, 23.43];

	title('6b. FRAMES (models/frames.js)');
	row('Ptolemy, 11:83 obliquity', num(Frames.PTOLEMY_OBLIQUITY, 12), num(Frames.RATIO_11_83_OBLIQUITY, 12));
	row(
		'Ptolemy right ascensions',
		Frames.ptolemyRightAscensions()
			.map(x => num(x))
			.join(' ')
	);

	out("  Ptolemy's declination table against eclipticPoint (lon, table, computed)");
	Frames.PTOLEMY_DECLINATIONS.forEach((dec, i) => {
		if ((i + 1) % 5 === 0 || i < 3) {
			row(`lon ${i + 1}`, num(dec), num(Frames.eclipticPoint(i + 1, Frames.PTOLEMY_OBLIQUITY).dec));
		}
	});

	out('  ecliptic -> equatorial -> ecliptic (lon, lat, eps: ra, dec, back lon, back lat, reduction)');
	obliquities.forEach(eps => {
		for (let lon = 0; lon < 360; lon += 45) {
			[-5, 0, 5].forEach(lat => {
				const eq = Frames.eclipticToEquatorial(lon, lat, eps);
				const back = Frames.equatorialToEcliptic(eq.ra, eq.dec, eps);

				row(
					`${lon}, ${lat}, ${num(eps, 4)}`,
					num(eq.ra),
					num(eq.dec),
					num(back.lon),
					num(back.lat),
					num(Frames.reduction(lon, eps))
				);
			});
		}
	});

	out('  equatorial -> horizontal -> equatorial (ra, dec, phi, theta: A, a, H, back ra, back dec)');
	[
		[68.98, 16.51],
		[279.23, 38.78],
		[101.29, -16.72],
		[37.95, 89.26],
		[95.99, -52.7]
	].forEach(([ra, dec]) => {
		[
			[41.9, 38.94],
			[-33.9, 200],
			[0, 0],
			[89, 123.4]
		].forEach(([phi, theta]) => {
			const hor = Frames.equatorialToHorizontal(ra, dec, phi, theta);
			const back = Frames.horizontalToEquatorial(hor.A, hor.a, phi, theta);

			row(`${ra}, ${dec}, ${phi}, ${theta}`, num(hor.A), num(hor.a), num(hor.H), num(back.ra), num(back.dec));
		});
	});

	row('fromHorizontal(120, 30)', vec(Frames.fromHorizontal(120, 30)));
	row(
		'toHorizontal([0.3, -0.4, 0.5])',
		num(Frames.toHorizontal([0.3, -0.4, 0.5]).A),
		num(Frames.toHorizontal([0.3, -0.4, 0.5]).a)
	);
	row('eclipticPole(23.44)', vec(Frames.eclipticPole(23.44)));

	[
		[41.9, 0],
		[41.9, 90],
		[41.9, 270],
		[-33.9, 180],
		[66.56, 90],
		[0, 0]
	].forEach(([phi, theta]) => {
		row(
			`ecliptic-horizon ${phi}, ${theta}`,
			num(Frames.eclipticPoleAltitude(EPS, phi, theta)),
			num(Frames.eclipticHorizonAngle(EPS, phi, theta))
		);
	});
}

function clockSection(c) {
	const { Time, MeanSun, Clock } = c;
	const meanSun = MeanSun.make();

	title('6c. THE MEAN SUN AND THE CLOCKS (models/mean-sun.js, models/clock.js)');
	row('MeanSun.MODERN', num(MeanSun.MODERN.L0), num(MeanSun.MODERN.n, 12), num(MeanSun.MODERN.epoch));
	row('year length (days)', num(MeanSun.yearLength(), 9));
	row(
		'Clock constants',
		num(Clock.THETA0),
		num(Clock.RATE, 12),
		num(Clock.SIDEREAL_DAY_HOURS, 12),
		num(Clock.SUN_HORIZON, 12)
	);

	DATES.forEach(([label, year, month, day]) => {
		const jd = Time.julianDay(year, month, day);

		row(`mean Sun, ${label}`, num(meanSun(jd)), num(Clock.meanLongitude(jd)), num(Clock.sunDeclination(jd)));
	});

	out('  sunDay (jd0, phi, lon): noon, rise, set, hours, H0, dec, kind');
	for (let month = 1; month <= 12; month += 1) {
		const jd0 = Time.julianDay(2026, month, 21);

		[-70, -41.9, 0, 41.9, 60, 66.5, 70, 89].forEach(phi => {
			[0, 12.4964].forEach(lon => {
				const d = Clock.sunDay(jd0, phi, lon);

				row(
					`2026-${month}-21, ${phi}, ${lon}`,
					num(d.noon),
					num(d.rise),
					num(d.set),
					num(d.hours),
					num(d.H0),
					num(d.dec),
					d.kind
				);
			});
		});
	}

	out('  transits of a right ascension within a day (ra, jd0, lon)');
	[0, 68.98, 101.29, 279.23, 359.99].forEach(ra => {
		[Time.julianDay(2026, 1, 1), Time.julianDay(2026, 9, 22)].forEach(jd0 => {
			const within = Clock.transits(ra, jd0, 12.4964).map(t => num(t));
			const between = Clock.transitsBetween(ra, jd0 + 0.5, 1, 0).map(t => num(t));

			row(`${ra}, ${num(jd0, 1)}`, within.join(' '), '|', between.join(' '));
		});
	});

	row(
		'hourAngle(2026-01-01 19h, 12.4964, 68.98)',
		num(Clock.hourAngle(Time.julianDayTime(2026, 1, 1, 19), 12.4964, 68.98))
	);
	row(
		'fromLocalMeanTime(2026-01-01, 12, 12.4964)',
		num(Clock.fromLocalMeanTime(Time.julianDay(2026, 1, 1), 12, 12.4964))
	);
}

/* ==========================================================================
   7. DISPLAY HELPERS (SHARED)
   The text of every read-out, slider value and axis goes through these.
   ========================================================================== */

function solarEccentricSection(c) {
	const { Time, MeanSun, SolarEccentric } = c;
	const models = {
		'FIT_2026': SolarEccentric.make(SolarEccentric.FIT_2026),
		'PTOLEMY': SolarEccentric.make(SolarEccentric.PTOLEMY),
		'MeanSun.PTOLEMY': MeanSun.make(MeanSun.PTOLEMY)
	};

	title('6d. THE SOLAR ECCENTRIC (models/solar-eccentric.js, MeanSun.PTOLEMY)');
	row(
		'MeanSun.PTOLEMY',
		num(MeanSun.PTOLEMY.L0),
		num(MeanSun.PTOLEMY.n, 12),
		num(MeanSun.PTOLEMY.epoch),
		MeanSun.PTOLEMY.clock
	);
	row('SolarEccentric.PTOLEMY', num(SolarEccentric.PTOLEMY.e, 12), num(SolarEccentric.PTOLEMY.apogee));
	row(
		'SolarEccentric.FIT_2026',
		num(SolarEccentric.FIT_2026.L0),
		num(SolarEccentric.FIT_2026.e, 12),
		num(SolarEccentric.FIT_2026.apogee)
	);

	out('  equationOfCentre, first order, distance (M, e)');
	[0, 30, 90, 92.388, 180, 250, 359].forEach(M => {
		[0, 1 / 24, 0.1].forEach(e => {
			row(
				`M = ${M}, e = ${num(e, 4)}`,
				num(SolarEccentric.equationOfCentre(M, e)),
				num(SolarEccentric.equationOfCentreFirstOrder(M, e)),
				num(SolarEccentric.distance(M, e))
			);
		});
	});

	const greatest = SolarEccentric.greatestEquation(1 / 24);

	row('greatestEquation(1/24)', num(greatest.q), num(greatest.M));

	out('  fitSeasons(spring, summer, Y): h, k, e, apogee, the four lengths, mean longitude at the equinox');
	[
		[94.5, 92.5, 365.24667],
		[92.7391, 93.6629, 365.24219],
		[91.31, 91.31, 365.24219],
		[96, 90, 365.24219]
	].forEach(([spring, summer, Y]) => {
		const r = SolarEccentric.fitSeasons(spring, summer, Y);

		row(
			`${spring}, ${summer}`,
			num(r.h),
			num(r.k),
			num(r.e),
			num(r.apogee),
			r.lengths.map(x => num(x)).join(' '),
			num(r.meanLongitudeAtEquinox)
		);
	});

	DATES.forEach(([label, year, month, day]) => {
		const jd = Time.julianDay(year, month, day);

		row(`models, ${label}`, ...Object.values(models).map(model => num(model(jd))));
	});
}

function equationOfTimeSection(c) {
	const { Time, SolarEccentric, EquationOfTime } = c;

	title('6e. THE EQUATION OF TIME (models/equation-of-time.js)');
	[0, 23.44, 45].forEach(eps => {
		const g = EquationOfTime.greatestReduction(eps);

		row(
			`eps = ${eps}`,
			num(EquationOfTime.reductionEccentricity(eps)),
			num(g.value),
			num(g.lon),
			[10, 46, 90, 134, 300].map(lon => num(EquationOfTime.reduction(lon, eps))).join(' ')
		);
	});

	out('  partsAt(L, e, apogee, eps): eccentricity, obliquity, total (min); firstOrder');
	[0, 90, 222.76, 315].forEach(L => {
		const p = EquationOfTime.partsAt(L, 0.033473, 103.732, 23.4358);

		row(
			`L = ${L}`,
			num(p.eccentricity),
			num(p.obliquity),
			num(p.total),
			num(EquationOfTime.firstOrder(L, 0.033473, 103.732, 23.4358))
		);
	});

	DATES.forEach(([label, year, month, day]) => {
		const jd = Time.julianDay(year, month, day);
		const s = EquationOfTime.atMeanNoon(SolarEccentric.FIT_2026, jd, 12.5);

		row(
			`FIT_2026, ${label}`,
			num(EquationOfTime.equation(SolarEccentric.FIT_2026, jd)),
			num(s.H),
			num(s.dec),
			num(EquationOfTime.apparentNoon(SolarEccentric.FIT_2026, jd, 12.5))
		);
	});
}

function displaySection(c) {
	const samples = [-181.25, -12.5, -0.001, 0, 0.0083, 0.99999, 1.5, 23.99999, 59.99, 61.25, 359.9999];

	title('7. DISPLAY HELPERS (common.js, time.js, plot2d.js, errorcurve.js)');

	samples.forEach(x => {
		row(
			`x = ${x}`,
			[
				c.dms(x),
				c.hm(Math.abs(x)),
				c.hms(x),
				c.hms(x, 0),
				c.dh(Math.abs(x)),
				c.signed(x),
				c.signed(x, 3),
				c.arcmin(x / 60),
				c.sexagesimal(x),
				c.sexagesimal(x, 2),
				c.hmTex(Math.abs(x)),
				c.dhTex(Math.abs(x)),
				c.signed3(x),
				c.fmt3(x),
				c.texAngle('\\alpha', x)
			]
				.map(quote)
				.join(' '),
			num(c.norm360(x)),
			num(c.norm180(x))
		);
	});

	row(
		'texLinear',
		quote(
			c.texLinear('\\mathbf s', [
				[0.5, 'a'],
				[-0.25, 'b'],
				[0.125, 'c']
			])
		)
	);
	row(
		'formatYear',
		[-584, 0, 1, 2026].map(y => quote(c.Time.formatYear(y))).join(' '),
		quote(c.Time.formatYear(-584, 'astronomical'))
	);
	row('withAlpha', quote(c.withAlpha(c.COL.planet, 0.4)), quote(c.withAlpha(c.COL.ink, 1)));
	row(
		'textColor',
		Object.keys(c.COL)
			.map(key => `${key}:${c.textColor(c.COL[key])}`)
			.join(' ')
	);
	row('starSize -1.5 0 2 5.5 7', [-1.5, 0, 2, 5.5, 7].map(m => num(c.starSize(m), 6)).join(' '));
	row('starPath(10, 20, 5)', quote(c.starPath(10, 20, 5)));
	row(
		'labelFont',
		['P', 'Vega', 'N', '90° − a', 'θ'].map(t => quote(c.labelFont(t))).join(' '),
		quote(c.labelFont('N', 'name'))
	);

	out('  niceTicks(min, max, count)');
	[
		[-15, 15, 6],
		[0, 365, 5],
		[-90, 90, 4],
		[0.1, 0.7, 6],
		[1990.3, 2010.8, 7],
		[-3000, 3000, 8],
		[5, 5, 3]
	].forEach(([min, max, count]) => {
		row(
			`${min}, ${max}, ${count}`,
			c
				.niceTicks(min, max, count)
				.map(v => c.formatTick(v))
				.join(' ')
		);
	});

	out('  timeTicks(min, max, count)');
	[
		[2026, 2027, 6],
		[2026.2, 2026.9, 12],
		[1990, 2010, 6],
		[-600, 600, 6]
	].forEach(([min, max, count]) => {
		row(
			`${min}, ${max}, ${count}`,
			c
				.timeTicks(min, max, count)
				.map(t => `${num(t.value, 6)}:${t.label}`)
				.join(' ')
		);
	});

	row('niceCeiling', [0.3, 1, 1.01, 2.2, 4.9, 7, 12, 600].map(v => num(c.niceCeiling(v), 6)).join(' '));
	row('runningExtreme', JSON.stringify(c.runningExtreme([3, 1, 4, 1, 5, 9, 2, 6], 3, Math.max)));
	row('stripTex', quote(c.stripTex('$\\lambda_\\text{model}$ (Hipparchus)')));
	[
		'mean Sun $\\bar\\lambda$',
		"Hipparchus' year, $Y = 365\\tfrac14 - \\tfrac1{300}$ d",
		'$\\Delta\\lambda$ of $\\varepsilon_0$, $\\delta_\\odot$'
	].forEach(label => row('stripTex', quote(c.stripTex(label))));

	out('  fixed and fixedAngle (never "-0.0"; an angle in [0, 360) never "360.0")');
	[-0.04, -0.05, -0.051, 0, 0.04, 12.345, 359.94, 359.95, 359.999, -12.5].forEach(x => {
		row(`x = ${x}`, [c.fixed(x), c.fixed(x, 2), c.fixedAngle(x), c.fixedAngle(x, 2)].map(quote).join(' '));
	});
}

/* ==========================================================================
   8. PAGE SCRIPTS: HELPERS AND PRECOMPUTED VALUES
   Each page's own script, loaded with the shared scripts it lists, in a
   context of its own (pages reuse names such as formatAngle).
   ========================================================================== */

function page11(c) {
	title('8a. PAGE 1.1 (act1-stage/01-turning-sky/page.js)');
	row('formatAngle', [-16.7, -0.04, 0, 41.9, 90].map(v => quote(c.formatAngle(v))).join(' '));
	row('seenHorizonDepth()', num(c.seenHorizonDepth(), 12));
	row('TEST_HALF_TURN, TEST_EPOCH', num(inContext(c, 'TEST_HALF_TURN'), 12), num(inContext(c, 'TEST_EPOCH')));
	row('CLASS_TEXT', quote(JSON.stringify(inContext(c, 'CLASS_TEXT'))));
	row(
		'splitByHorizon',
		quote(
			JSON.stringify(
				c.splitByHorizon([
					[0, 0, 1],
					[0, 0, -1],
					[0, 0, -2],
					[0, 0, 3]
				])
			)
		)
	);
	row('dailyCircle(38.78, R)[7]', vec(c.dailyCircle(38.78, c.Diurnal.equatorialToHorizon(41.9, 30))[7]));
}

function page12(c) {
	title('8b. PAGE 1.2 (act1-stage/02-frames/page.js)');
	row('EPS_TODAY', num(inContext(c, 'EPS_TODAY'), 12));
	row('formatDegrees', [-5.4721, 0, 12.345].map(v => quote(c.formatDegrees(v))).join(' '));
	row('texDegrees', [-0.001, -5.4721, 359.999].map(v => quote(c.texDegrees(v))).join(' '));
	row('texAngle360', [-0.001, 5.4721, 359.994, 359.999].map(v => quote(c.texAngle360(v))).join(' '));
	row('formatAngle', [-33.9, -0.04, 0, 41.9, 360].map(v => quote(c.formatAngle(v))).join(' '));
	row('texHours', [0, 68.98, 359.999, -15].map(v => quote(c.texHours(v))).join(' '));
	row('texDms', [23.855555, -0.5, 20.5025].map(v => quote(c.texDms(v))).join(' '));
	row('texVector', quote(c.texVector('\\mathbf s', [0.123456, -0.00001, 1])));
	row('formatDay', [0, 31.5, 140, 364.99].map(v => quote(c.formatDay(v))).join(' '));
	const aldebaran = c.Stars.ofDateByName('Aldebaran', inContext(c, 'STAR_EPOCH'));

	row('starOfDate(Aldebaran)', num(aldebaran.ra), num(aldebaran.dec));

	out('  nutationErrors(2026), every 30 days: day, deps, dDec, dRA (arcsec)');
	const days = c.nutationErrors(2026);

	days.forEach(d => {
		if (d.day % 30 === 0) {
			row(`day ${d.day}`, num(d.deps), num(d.dDec), num(d.dRA));
		}
	});

	const largest = key => num(Math.max(...days.map(d => Math.abs(d[key]))));

	row('largest |deps|, |dDec|, |dRA|', largest('deps'), largest('dDec'), largest('dRA'));
}

function page13(c) {
	const test = inContext(c, 'testFigure');
	const calendar = inContext(c, 'calendarFigure');

	title('8c. PAGE 1.3 (act1-stage/03-clocks/page.js)');
	row('YEAR_START, EPS_YEAR', num(inContext(c, 'YEAR_START')), num(inContext(c, 'EPS_YEAR'), 12));
	row(
		'MONTH_STARTS',
		inContext(c, 'MONTH_STARTS')
			.map(m => `${m.value}:${m.label}`)
			.join(' ')
	);
	row('JUNE_SOLSTICE_DAY', inContext(c, 'JUNE_SOLSTICE_DAY'));
	row('dayText', [0, 59, 364].map(d => quote(c.dayText(d))).join(' '));
	row('formatAngle', [-16.7, -0.04, 41.9].map(v => quote(c.formatAngle(v))).join(' '));
	row('formatLongitude', [-74.006, -0.004, 0, 12.4964, 180].map(v => quote(c.formatLongitude(v))).join(' '));
	row('clockText', [-0.5, 0, 12.999, 23.9999, 25.25].map(v => quote(c.clockText(v))).join(' '));
	row('texDuration', [0, 9.99999, 15.25].map(v => quote(c.hmTex(v))).join(' '));
	row('texClock', quote(c.texClock(19.0833)));
	row('texMinutes', [-16.44, -0.04, 0, 0.05, 22.9].map(v => quote(c.texMinutes(v))).join(' '));
	row('texHms', [0, 38.94, 359.9999, -1].map(v => quote(c.texHms(v))).join(' '));
	row(
		'nightTicks 8, 4',
		c
			.nightTicks(8)
			.map(t => t.label)
			.join(' '),
		'|',
		c
			.nightTicks(4)
			.map(t => t.label)
			.join(' ')
	);

	// Figure 4: the night bounds of the model Sun
	[41.9, 66.5, -60].forEach(phi => {
		const jd0 = inContext(c, 'YEAR_START') + 171;

		row(
			`calendar dusk, dawn (day 171, ${phi})`,
			num(calendar.dusk(c.Clock.sunDay(jd0, phi, 0))),
			num(calendar.dawn(c.Clock.sunDay(jd0 + 1, phi, 0)))
		);
	});

	// Figure 6: the real Sun tabulated, its noons, rises and sets
	test.tabulateSun();
	test.noons = [];

	for (let day = 0; day < inContext(c, 'DAYS_IN_YEAR'); day++) {
		test.noons.push(test.realNoon(inContext(c, 'YEAR_START') + day));
	}

	out('  Figure 6, every 30 days: real noon, and rise / set at 41.9 and 65');
	test.noons.forEach((noon, day) => {
		if (day % 30 === 0) {
			const rome = test.realRiseSet(day, 41.9);
			const north = test.realRiseSet(day, 65);

			row(`day ${day}`, num(noon), num(rome.rise), num(rome.set), num(north.rise), num(north.set));
		}
	});
}

function page21(c) {
	title('8d. PAGE 2.1 (act2-sun/01-uneven-year/page.js)');
	row('YEAR_START, YEAR_LENGTH', num(inContext(c, 'YEAR_START')), num(inContext(c, 'YEAR_LENGTH'), 12));
	row('dayText', [0, 59, 92, 364].map(d => quote(c.dayText(d))).join(' '));
	row('texSigned', [-1.234, -0.001, 0, 1.915].map(v => quote(c.texSigned(v))).join(' '));
	row('texDays', [88.123, 92.5, 93.6629].map(v => quote(c.texDays(v))).join(' '));
	row('reachCircle', [0, 90, 180, 270, 103.7].map(lon => num(c.reachCircle(lon, -0.008, 0.0325))).join(' '));
	row(
		'monthTicks 12, 4',
		c
			.monthTicks(0, 365, 12)
			.map(t => t.label)
			.join(' '),
		'|',
		c
			.monthTicks(0, 365, 4)
			.map(t => t.label)
			.join(' ')
	);
	row(
		'fixed ranges',
		JSON.stringify(inContext(c, 'MOTION_RANGE')),
		JSON.stringify(inContext(c, 'ECCENTRIC_Q_RANGE')),
		JSON.stringify(inContext(c, 'CENTRE_RANGE'))
	);
}

function page22(c) {
	title('8e. PAGE 2.2 (act2-sun/02-equation-of-time/page.js)');
	row('YEAR_START', num(inContext(c, 'YEAR_START')));
	row('dayText', [0, 41, 306, 364].map(d => quote(c.dayText(d))).join(' '));
	row('texMinSec', [-14.2, -0.004, 0, 3.6372, 16.457].map(m => quote(c.texMinSec(m))).join(' '));
	row('texSigned', [-14.22, 0, 7.79].map(v => quote(c.texSigned(v))).join(' '));
	row('yearText', [-140, 140, 1246, 2026].map(y => quote(c.yearText(y))).join(' '));
	row(
		'fixed ranges',
		JSON.stringify(inContext(c, 'DAY_EXCESS_RANGE')),
		JSON.stringify(inContext(c, 'EQUATION_RANGE')),
		JSON.stringify(inContext(c, 'REDUCTION_RANGE')),
		JSON.stringify(inContext(c, 'ANALEMMA_H_RANGE')),
		JSON.stringify(inContext(c, 'ANALEMMA_DEC_RANGE')),
		JSON.stringify(inContext(c, 'TEST_RANGE')),
		JSON.stringify(inContext(c, 'CENTURIES_RANGE'))
	);
}

/* ==========================================================================
   9. THE NUMBERS SCRIPTS (tools/numbers/)
   Every number quoted in the prose of the pages, as each script prints it.
   ========================================================================== */

function numbersSection() {
	const folder = path.join(ROOT, 'tools', 'numbers');
	const scripts = fs
		.readdirSync(folder)
		.filter(name => name.endsWith('.js'))
		.sort();

	scripts.forEach(name => {
		const output = childProcess.execFileSync(process.execPath, [path.join(folder, name)], {
			cwd: ROOT,
			encoding: 'utf8',
			maxBuffer: 64 * 1024 * 1024
		});

		title(`9. tools/numbers/${name}`);
		out(output.trimEnd());
	});
}

/* ==========================================================================
   10. MAIN
   ========================================================================== */

/* Build the whole table, as one string. */
function buildTable() {
	const shared = loadFiles(SHARED_FILES);
	const pages = PAGE_FILES.map(file => loadPage(file));

	out('PREDICTING THE SKY - GOLDEN VALUES (tools/check/golden.js)');
	out('Regenerate with: node tools/check/golden.js --write');

	timeSection(shared);
	skySection(shared);
	starSection(shared);
	diurnalSection(shared);
	framesSection(shared);
	clockSection(shared);
	solarEccentricSection(shared);
	equationOfTimeSection(shared);
	displaySection(shared);
	page11(pages[0]);
	page12(pages[1]);
	page13(pages[2]);
	page21(pages[3]);
	page22(pages[4]);
	numbersSection();

	return lines.join('\n') + '\n';
}

/* The first differing lines of two texts, for the --check report. */
function firstDifferences(expected, actual, limit = 20) {
	const a = expected.split('\n');
	const b = actual.split('\n');
	const report = [];

	for (let i = 0; i < Math.max(a.length, b.length) && report.length < limit; i++) {
		if (a[i] !== b[i]) {
			report.push(`line ${i + 1}\n  golden: ${a[i] ?? '(none)'}\n  now:    ${b[i] ?? '(none)'}`);
		}
	}

	return report;
}

function main() {
	const table = buildTable();
	const mode = process.argv[2] ?? '';

	if (mode === '--write') {
		fs.writeFileSync(GOLDEN_FILE, table);
		console.log(`golden: wrote ${path.relative(ROOT, GOLDEN_FILE)} (${table.split('\n').length - 1} lines)`);
		return;
	}

	if (mode === '--check') {
		const golden = fs.readFileSync(GOLDEN_FILE, 'utf8');

		if (golden === table) {
			console.log('golden: identical to golden.txt');
			return;
		}

		console.log('golden: DIFFERENT from golden.txt');
		firstDifferences(golden, table).forEach(text => console.log(text));
		process.exitCode = 1;
		return;
	}

	process.stdout.write(table);
}

main();
