/* ==========================================================================
   PREDICTING THE SKY - BUILD shared/vsop87-data.js AND
   shared/vsop87-planets.js (tools/make-vsop87.js)
   The reference of page 4.5 and of the toolbox. The site's reference
   planets (Standish's elements, shared/ephemeris.js) are themselves
   Kepler ellipses, so they cannot judge Kepler's model (STRUCTURE.md,
   page 4.5). VSOP87 adds the planets' pulls on one another to the
   ellipses: this script truncates its version B (heliocentric ecliptic
   coordinates L, B, R, J2000 ecliptic and equinox) and writes the kept
   terms of the Earth and Mars into shared/vsop87-data.js (page 4.5), and
   those of Mercury, Venus, Jupiter and Saturn into
   shared/vsop87-planets.js (the toolbox), which adds them to the first.
   shared/vsop87.js evaluates both.

   Source: P. Bretagnon and G. Francou, "Planetary theories in rectangular
   and spherical variables. VSOP 87 solutions", A&A 202, 309 (1988); the
   files VSOP87B.ear, .mar, .mer, .ven, .jup and .sat of the IMCCE,
   fetched by tools/numbers/data/fetch-vsop87.sh.

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
const OUT_PLANETS = path.join(ROOT, 'shared/vsop87-planets.js');

/* Amplitudes below this (radians, or au for R) are left out. */
const EPS = 1e-7;

/* The bodies: the name in the site, the file, Horizons' number and the
   output file (main: vsop87-data.js, page 4.5; planets:
   vsop87-planets.js, the toolbox). */
const BODIES = [
	{ name: 'earth', file: 'VSOP87B.ear', horizons: 399, out: 'main' },
	{ name: 'mars', file: 'VSOP87B.mar', horizons: 499, out: 'main' },
	{ name: 'mercury', file: 'VSOP87B.mer', horizons: 199, out: 'planets' },
	{ name: 'venus', file: 'VSOP87B.ven', horizons: 299, out: 'planets' },
	{ name: 'jupiter', file: 'VSOP87B.jup', horizons: 599, out: 'planets' },
	{ name: 'saturn', file: 'VSOP87B.sat', horizons: 699, out: 'planets' }
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

/* The largest differences (arcsec) from Horizons of a planet's
   heliocentric ecliptic longitude and of its direction from the Earth,
   for the series of the planet and of the Earth. */
function check(planetSeries, earthSeries, number) {
	const he = horizons(399);
	const hp = horizons(number);
	let helio = 0;
	let geo = 0;

	he.forEach((row, i) => {
		const e = rectangular(earthSeries, row.jd);
		const p = rectangular(planetSeries, row.jd);
		const g = [p[0] - e[0], p[1] - e[1]];
		const hg = [hp[i].v[0] - row.v[0], hp[i].v[1] - row.v[1]];

		helio = Math.max(helio, angle(hp[i].v, p));

		if (number !== 399) {
			geo = Math.max(geo, angle(hg, g));
		}
	});

	return { helio, geo, dates: he.length };
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

/* The lines of one body's entry in VSOP87_DATA. */
function entryLines(body, last) {
	const lines = [`\t${body.name}: [`];

	kept[body.name].forEach((powers, v) => {
		lines.push('\t\t[');
		powers.forEach((terms, k) => {
			lines.push('\t\t\t[');
			terms.forEach((term, i) => lines.push(`\t\t\t\t[${term.join(', ')}]${i < terms.length - 1 ? ',' : ''}`));
			lines.push(`\t\t\t]${k < powers.length - 1 ? ',' : ''}`);
		});
		lines.push(`\t\t]${v < 2 ? ',' : ''}`);
	});
	lines.push(`\t]${last ? '' : ','}`);

	return lines;
}

/* Write one output file: the main one declares VSOP87_DATA, the
   planets' adds to it. */
function writeFile(out, file) {
	const bodies = BODIES.filter(body => body.out === out);
	const main = out === 'main';
	const lines = [
		'// @ts-check',
		`/* GENERATED by tools/make-vsop87.js from the VSOP87B files of the IMCCE in`,
		'   tools/numbers/data/vsop87: do not edit by hand.',
		'   VSOP87_DATA[body][variable][power] = [[A, B, C], ...], the variables',
		'   L, B (rad) and R (au), each term A cos(B + C t) t^power, t in Julian',
		`   millennia from J2000 (TDB). Terms with A < ${EPS} are left out.`
	];

	if (main) {
		lines.push(
			'   The Earth and Mars (page 4.5); vsop87-planets.js adds the others. */',
			'',
			'const VSOP87_DATA = {'
		);
	} else {
		lines.push(
			'   Mercury, Venus, Jupiter and Saturn (the toolbox), added to the',
			'   Earth and Mars of vsop87-data.js, which must be loaded first. */',
			'',
			'Object.assign(VSOP87_DATA, {'
		);
	}

	bodies.forEach((body, b) => {
		lines.push(...entryLines(body, b === bodies.length - 1));
	});
	lines.push(main ? '};' : '});', '');
	fs.writeFileSync(file, lines.join('\n'));
}

writeFile('main', OUT);
writeFile('planets', OUT_PLANETS);

/* ==========================================================================
   4. REPORT
   ========================================================================== */

const fmt = x => x.toFixed(2);

console.log(`wrote ${path.relative(ROOT, OUT)} and ${path.relative(ROOT, OUT_PLANETS)}`);
console.log('against JPL Horizons (DE441), 1900 - 2150, largest differences in ecliptic longitude,');
console.log('heliocentric and seen from the Earth, truncated (full):');
BODIES.forEach(body => {
	const a = check(kept[body.name], kept.earth, body.horizons);
	const b = check(full[body.name], full.earth, body.horizons);
	const geo = body.name === 'earth' ? '' : `, from the Earth ${fmt(a.geo)}" (${fmt(b.geo)}")`;

	console.log(
		`  ${body.name}: ${count(kept[body.name])} terms, heliocentric ${fmt(a.helio)}" (${fmt(b.helio)}")${geo}`
	);
});
