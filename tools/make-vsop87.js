/* ==========================================================================
   PREDICTING THE SKY - BUILD shared/vsop87-data.js (tools/make-vsop87.js)
   The reference of page 4.5. The site's reference planets (Standish's
   elements, shared/ephemeris.js) are themselves Kepler ellipses, so they
   cannot judge Kepler's model (STRUCTURE.md, page 4.5). VSOP87 adds the
   planets' pulls on one another to the ellipses: this script truncates
   its version B (heliocentric ecliptic coordinates L, B, R, J2000 ecliptic
   and equinox) for the Earth and Mars and writes the kept terms into
   shared/vsop87-data.js, which shared/vsop87.js evaluates.

   Source: P. Bretagnon and G. Francou, "Planetary theories in rectangular
   and spherical variables. VSOP 87 solutions", A&A 202, 309 (1988); the
   files VSOP87B.ear and VSOP87B.mar of the IMCCE, fetched by
   tools/numbers/data/fetch-vsop87.sh.

   Truncation: a term A cos(B + C t) t^k (t in Julian millennia from
   J2000) is kept when A >= EPS, with |t| = 1 (AD 1000 to 3000). The check
   below compares the truncated series, and the full one, with JPL
   Horizons (DE441) every 300 days from 1900 to 2150, and prints the
   largest differences that the header of shared/vsop87.js quotes.

   Run from the repository root:  node tools/make-vsop87.js
   ========================================================================== */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'tools/numbers/data/vsop87');
const OUT = path.join(ROOT, 'shared/vsop87-data.js');

/* Amplitudes below this (radians, or au for R) are left out. */
const EPS = 1e-7;

/* The bodies: the name in the site, the file and Horizons' number. */
const BODIES = [
	{ name: 'earth', file: 'VSOP87B.ear', horizons: 399 },
	{ name: 'mars', file: 'VSOP87B.mar', horizons: 499 }
];

const R2AS = (180 / Math.PI) * 3600;

/* ==========================================================================
   1. READING AND TRUNCATING THE SERIES
   ========================================================================== */

/* The series of a file: series[variable][power] = [[A, B, C], ...], with
   the variables L, B, R. Each header line names the variable and the
   power of t; each term line ends with A, B and C. */
function parse(file) {
	const series = [[], [], []];
	let variable = 0;
	let power = 0;

	fs.readFileSync(file, 'utf8')
		.split('\n')
		.forEach(line => {
			if (line.startsWith(' VSOP87')) {
				variable = Number(line.match(/VARIABLE (\d)/)[1]) - 1;
				power = Number(line.match(/\*T\*\*(\d)/)[1]);
				series[variable][power] = [];
			} else if (line.trim() !== '') {
				const numbers = line.trim().split(/\s+/).map(Number);
				const n = numbers.length;

				series[variable][power].push(numbers.slice(n - 3));
			}
		});

	return series;
}

function truncate(series) {
	return series.map(powers => powers.map(terms => terms.filter(term => term[0] >= EPS)));
}

const count = series => series.reduce((sum, powers) => sum + powers.reduce((s, terms) => s + terms.length, 0), 0);

/* ==========================================================================
   2. EVALUATING THEM (as shared/vsop87.js does) AND CHECKING
   ========================================================================== */

function rectangular(series, jd) {
	const t = (jd - 2451545.0) / 365250;
	const [L, B, R] = series.map(powers =>
		powers.reduce((sum, terms, k) => {
			const value = terms.reduce((s, [A, b, C]) => s + A * Math.cos(b + C * t), 0);

			return sum + value * Math.pow(t, k);
		}, 0)
	);

	return [R * Math.cos(B) * Math.cos(L), R * Math.cos(B) * Math.sin(L), R * Math.sin(B)];
}

function horizons(number) {
	const text = fs.readFileSync(path.join(DATA, `horizons-vectors-${number}.txt`), 'utf8');

	return text
		.split('$$SOE')[1]
		.split('$$EOE')[0]
		.trim()
		.split('\n')
		.map(line => line.split(',').map(s => s.trim()))
		.map(cells => ({ jd: Number(cells[0]), v: cells.slice(2, 5).map(Number) }));
}

/* The angle (arcsec) between two vectors, in the ecliptic plane. */
const angle = (a, b) => Math.abs(Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1])) * R2AS;

function check(earth, mars) {
	const he = horizons(399);
	const hm = horizons(499);
	let helioEarth = 0;
	let helioMars = 0;
	let geoMars = 0;

	he.forEach((row, i) => {
		const e = rectangular(earth, row.jd);
		const m = rectangular(mars, row.jd);
		const g = [m[0] - e[0], m[1] - e[1]];
		const hg = [hm[i].v[0] - row.v[0], hm[i].v[1] - row.v[1]];

		helioEarth = Math.max(helioEarth, angle(row.v, e));
		helioMars = Math.max(helioMars, angle(hm[i].v, m));
		geoMars = Math.max(geoMars, angle(hg, g));
	});

	return { helioEarth, helioMars, geoMars, dates: he.length };
}

/* ==========================================================================
   3. WRITING shared/vsop87-data.js
   ========================================================================== */

const full = {};
const kept = {};

BODIES.forEach(body => {
	full[body.name] = parse(path.join(DATA, body.file));
	kept[body.name] = truncate(full[body.name]);
});

const lines = [
	'// @ts-check',
	'/* GENERATED by tools/make-vsop87.js from the VSOP87B files of the IMCCE in',
	'   tools/numbers/data/vsop87: do not edit by hand.',
	'   VSOP87_DATA[body][variable][power] = [[A, B, C], ...], the variables',
	'   L, B (rad) and R (au), each term A cos(B + C t) t^power, t in Julian',
	`   millennia from J2000 (TDB). Terms with A < ${EPS} are left out. */`,
	'',
	'const VSOP87_DATA = {'
];

BODIES.forEach((body, b) => {
	lines.push(`\t${body.name}: [`);
	kept[body.name].forEach((powers, v) => {
		lines.push('\t\t[');
		powers.forEach((terms, k) => {
			lines.push('\t\t\t[');
			terms.forEach((term, i) => lines.push(`\t\t\t\t[${term.join(', ')}]${i < terms.length - 1 ? ',' : ''}`));
			lines.push(`\t\t\t]${k < powers.length - 1 ? ',' : ''}`);
		});
		lines.push(`\t\t]${v < 2 ? ',' : ''}`);
	});
	lines.push(`\t]${b < BODIES.length - 1 ? ',' : ''}`);
});
lines.push('};', '');
fs.writeFileSync(OUT, lines.join('\n'));

/* ==========================================================================
   4. REPORT
   ========================================================================== */

const fmt = x => x.toFixed(2);
const a = check(kept.earth, kept.mars);
const b = check(full.earth, full.mars);

console.log(`wrote ${path.relative(ROOT, OUT)}: Earth ${count(kept.earth)} terms, Mars ${count(kept.mars)} terms`);
console.log(
	`against JPL Horizons (DE441) at ${a.dates} dates, 1900 - 2150, largest differences in ecliptic longitude:`
);
console.log(
	`  truncated: Earth ${fmt(a.helioEarth)}", Mars ${fmt(a.helioMars)}" (heliocentric), Mars ${fmt(a.geoMars)}" (from the Earth)`
);
console.log(
	`  full:      Earth ${fmt(b.helioEarth)}", Mars ${fmt(b.helioMars)}" (heliocentric), Mars ${fmt(b.geoMars)}" (from the Earth)`
);
