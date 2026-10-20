/* ==========================================================================
   PREDICTING THE SKY - CROSS-CHECK OF THE REFERENCE SKY
   (tools/check/crosscheck.js)
   Compares the apparent geocentric ecliptic longitudes of shared/
   ephemeris.js (Standish's elements, Meeus' lunar series) with an
   independent library, astronomy-engine 2.1.19 (MIT, a development
   dependency: the site never loads it), for the Sun, the Moon and the five
   planets, over three date ranges and on the dates of golden.js.

   It reports; it does not pass or fail. For each body and range it gives
   the largest and the RMS difference, the date of the largest, and the
   difference to expect: our measured error against JPL Horizons (DE441,
   from the header of ephemeris.js) plus astronomy-engine's own, stated as
   1' of NOVAS (a modern-era reference). A difference within it is normal;
   a larger one means one of the two is wrong there, which is worth
   finding out. The last section settles who is wrong where JPL values
   are at hand (the spot checks of shared/tests.js).

   What the report of 2026-10-20 shows (crosscheck.txt): over 1800-2050
   every body agrees within the expected difference (the Moon within
   0.3', which validates the 120 transcribed terms of Meeus' series). In
   antiquity the Moon differs by up to 23' (500 BC) and 113' (3000 BC):
   against DE441 our Moon is within 1' at 200 BC and 137 AD, astronomy-
   engine's 12' to 19' off, so the difference is astronomy-engine's.
   For Jupiter and Saturn, astronomy-engine is closer to DE441 than
   Standish's elements, as the header of ephemeris.js documents.

   Usage, from the repository root:
	 node tools/check/crosscheck.js            print the report
	 node tools/check/crosscheck.js --write    also save it as
											   tools/check/crosscheck.txt
   Takes about a minute and a half. Not part of the site.
   ========================================================================== */

'use strict';

const fs = require('fs');
const path = require('path');
const Engine = require('astronomy-engine');
const { loadFiles } = require('./load.js');

const site = loadFiles(['shared/common.js', 'shared/time.js', 'shared/ephemeris.js']);
const { Time, Ephem, norm180 } = site;

const REPORT_FILE = path.join(__dirname, 'crosscheck.txt');

/* astronomy-engine's stated accuracy (arcmin), against NOVAS. */
const ENGINE_ERROR = 1;

/* The bodies, with astronomy-engine's name for each. */
const BODIES = {
	sun: 'Sun',
	moon: 'Moon',
	mercury: 'Mercury',
	venus: 'Venus',
	mars: 'Mars',
	jupiter: 'Jupiter',
	saturn: 'Saturn'
};

/* The ranges, their sampling step (days) and our largest error against
   DE441 in each (arcmin, the table in the header of ephemeris.js). */
const RANGES = [
	{
		label: '1800 - 2050',
		from: 1800,
		to: 2050,
		step: 5,
		ours: { sun: 0.7, moon: 0.3, mercury: 1.1, venus: 2.6, mars: 6.3, jupiter: 14, saturn: 24 }
	},
	{
		label: '500 BC - 2500 AD',
		from: -499,
		to: 2500,
		step: 73,
		ours: { sun: 0.8, moon: 1.7, mercury: 1.1, venus: 3.7, mars: 8.8, jupiter: 14, saturn: 25 }
	},
	{
		label: '3000 BC - 3000 AD',
		from: -2999,
		to: 3000,
		step: 73,
		ours: { sun: 1.1, moon: 11, mercury: 1.5, venus: 3.7, mars: 9.9, jupiter: 17, saturn: 32 }
	}
];

/* The dates of golden.js (UT): [label, year, month, day]. */
const DATES = [
	['Thales eclipse', -584, 5, 28],
	['Ptolemy', 139, 7, 20.5],
	['Sputnik', 1957, 10, 4.81],
	['Meeus 47.a', 1992, 4, 12],
	['J2000.0', 2000, 1, 1.5],
	['2026 January 1', 2026, 1, 1],
	['2026 June solstice', 2026, 6, 21.5]
];

/* ==========================================================================
   1. THE TWO LONGITUDES
   ========================================================================== */

/* astronomy-engine's apparent ecliptic longitude of date (deg) at JD(UT). */
function engineLongitude(body, jdUT) {
	return engineLongitudeAt(body, Engine.MakeTime(jdUT - Time.J2000));
}

/* The same at an instant in Terrestrial Time, JD(TT): no Delta T enters. */
function engineLongitudeTT(body, jdTT) {
	return engineLongitudeAt(body, Engine.AstroTime.FromTerrestrialTime(jdTT - Time.J2000));
}

function engineLongitudeAt(body, time) {
	if (body === 'sun') {
		return Engine.SunPosition(time).elon;
	}

	return Engine.Ecliptic(Engine.GeoVector(BODIES[body], time, true)).elon;
}

/* Ours minus astronomy-engine's, in arcminutes, at JD(UT). Each library
   turns the clock time into TT with its own Delta T. */
function difference(body, jdUT) {
	return norm180(Ephem.longitude(body, Time.ttFromUt(jdUT)) - engineLongitude(body, jdUT)) * 60;
}

/* ==========================================================================
   2. THE REPORT
   ========================================================================== */

const lines = [];
const out = text => lines.push(text);
const arcmin = x => `${x.toFixed(2)}'`.padStart(9);

/* Largest and RMS difference of one body over one range. */
function compareRange(body, range) {
	const start = Time.julianDay(range.from, 1, 1);
	const end = Time.julianDay(range.to, 1, 1);
	let largest = 0;
	let largestAt = start;
	let sumSquares = 0;
	let count = 0;

	for (let jd = start; jd < end; jd += range.step) {
		const d = difference(body, jd);

		if (Math.abs(d) > Math.abs(largest)) {
			largest = d;
			largestAt = jd;
		}

		sumSquares += d * d;
		count++;
	}

	return { largest, largestAt, rms: Math.sqrt(sumSquares / count) };
}

function rangeSection(range) {
	out(`\n=== ${range.label}, every ${range.step} days ===`);
	out('  body        largest      RMS   expected  on              ');

	Object.keys(BODIES).forEach(body => {
		const { largest, largestAt, rms } = compareRange(body, range);
		const expected = range.ours[body] + ENGINE_ERROR;
		const verdict = Math.abs(largest) <= expected ? 'within' : 'LARGER: investigate';

		out(
			`  ${body.padEnd(8)} ${arcmin(largest)} ${arcmin(rms)} ${arcmin(expected)}  ` +
				`${Time.formatDate(largestAt).padEnd(15)} ${verdict}`
		);
	});
}

function datesSection() {
	out('\n=== On the dates of golden.js (ours - astronomy-engine, arcmin) ===');
	out(
		`  ${'date'.padEnd(20)} ${Object.keys(BODIES)
			.map(body => body.padStart(8))
			.join(' ')}`
	);

	DATES.forEach(([label, year, month, day]) => {
		const jd = Time.julianDay(year, month, day);
		const values = Object.keys(BODIES).map(body => difference(body, jd).toFixed(2).padStart(8));

		out(`  ${label.padEnd(20)} ${values.join(' ')}`);
	});
}

/* JPL Horizons (DE441) as the arbiter: the apparent longitudes of
   shared/tests.js (JD(TT), deg), and each library's error against them. */
function horizonsSection() {
	const tests = loadFiles(['shared/common.js', 'shared/time.js', 'shared/ephemeris.js', 'shared/tests.js']);
	const values = tests.HORIZONS;
	const dates = tests.HORIZONS_DATES;

	out('\n=== Against JPL Horizons, DE441 (the values of shared/tests.js; same instant in TT) ===');
	out('  body     date              ephemeris.js  astronomy-engine   (error, arcmin)');

	Object.entries(values).forEach(([body, data]) => {
		dates.forEach(([label, jdTT], i) => {
			const ours = norm180(Ephem.longitude(body, jdTT) - data.lon[i]) * 60;
			const engine = norm180(engineLongitudeTT(body, jdTT) - data.lon[i]) * 60;

			out(`  ${body.padEnd(8)} ${label.padEnd(16)} ${arcmin(ours).padStart(12)} ${arcmin(engine).padStart(17)}`);
		});
	});
}

function main() {
	out('PREDICTING THE SKY - CROSS-CHECK OF THE REFERENCE SKY (tools/check/crosscheck.js)');
	out('Apparent geocentric ecliptic longitude: shared/ephemeris.js minus astronomy-engine 2.1.19.');
	out(`Expected: our error against JPL DE441 (ephemeris.js header) + ${ENGINE_ERROR}' (astronomy-engine).`);

	RANGES.forEach(rangeSection);
	datesSection();
	horizonsSection();

	const report = lines.join('\n') + '\n';

	process.stdout.write(report);

	if (process.argv.includes('--write')) {
		fs.writeFileSync(REPORT_FILE, report);
	}
}

main();
