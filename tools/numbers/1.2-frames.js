/* ==========================================================================
   NUMBERS FOR PAGE 1.2 "FRAMES" (tools/numbers/1.2-frames.js)
   Loads the site's shared code (common, time, ephemeris, stars and the
   models diurnal.js, frames.js) in a Node vm context and prints every
   number quoted on the page, in page order.

   Run from the repository root:  node tools/numbers/1.2-frames.js

   TABLE OF CONTENTS
	 1. Loading the shared code
	 2. Formatting
	 3. Observation: one star, three addresses
	 4. Model: the matrices, checked
	 5. Fit: the obliquity from the solstices; the equinox
	 6. Test: Ptolemy's tables; the nutation error (Figure 3)
	 7. Exercises
	 8. Residual: the angle between the frames drifts
   ========================================================================== */

const fs = require('fs');
const path = require('path');
const vm = require('vm');


/* ==========================================================================
   1. LOADING THE SHARED CODE
   ========================================================================== */

const ROOT = path.join(__dirname, '..', '..');
const FILES = ['common.js', 'time.js', 'ephemeris.js', 'stars.js', 'models/diurnal.js', 'models/frames.js'];
const context = {};

vm.createContext(context);

FILES.forEach(file => {
	const source = fs.readFileSync(path.join(ROOT, 'shared', file), 'utf8');

	vm.runInContext(source, context, { filename: file });
});

const shared = vm.runInContext(`({ sin, cos, asin, acos, atan2d, norm180, norm360, fromLonLat,
	toLonLat, matApply, matMul, transpose, rotX, rotZ, cross3, normalize3, dot3,
	Time, Ephem, Stars, Diurnal, Frames })`, context);
const { sin, cos, asin, norm180, norm360, fromLonLat, toLonLat, matApply, transpose,
	cross3, normalize3, Time, Ephem, Stars, Diurnal, Frames } = shared;


/* ==========================================================================
   2. FORMATTING
   ========================================================================== */

const title = text => console.log(`\n=== ${text} ===`);
const f = (x, digits = 2) => x.toFixed(digits);
const arcmin = (degrees, digits = 1) => `${(degrees * 60).toFixed(digits)}'`;
const arcsec = (degrees, digits = 0) => `${(degrees * 3600).toFixed(digits)}"`;
const vec = v => `(${v.map(x => x.toFixed(4)).join(', ')})`;
const dms = (d, m = 0, s = 0) => d + m / 60 + s / 3600;      // 23°51'20" -> degrees

/* Degrees -> "20°30'09"" (rounded to the second). */
function toDms(degrees) {
	const seconds = Math.round(Math.abs(degrees) * 3600);
	const d = Math.floor(seconds / 3600);
	const m = Math.floor((seconds - 3600 * d) / 60);
	const s = seconds - 3600 * d - 60 * m;

	return `${degrees < 0 ? '-' : ''}${d}°${String(m).padStart(2, '0')}'${String(s).padStart(2, '0')}"`;
}

/* Right ascension in degrees -> "4h36m" (and hours). */
function raHours(ra) {
	const minutes = Math.round(ra / 15 * 60);

	return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}m`;
}

/* JD -> "2026-05-21 06:43 UT". */
function dateText(jd) {
	const d = Time.calendarDate(jd);
	const day = Math.floor(d.day);
	const minutes = Math.round((d.day - day) * 1440);

	return `${d.year}-${String(d.month).padStart(2, '0')}-${String(day).padStart(2, '0')} ` +
		`${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/* Places used on the page (latitude, longitude east), as on page 1.1. */
const ROME = { phi: 41.9, lon: 12.5 };
const ALEXANDRIA = { phi: 31.2, lon: 29.9 };

/* Mean obliquity of 1 July of a year (deg). */
const epsOfYear = year => Ephem.meanObliquity(Time.julianDay(year, 7, 1));

/* The reference Sun's apparent (alpha, delta) and longitude at JD(TT). */
function realSun(jdTT) {
	const position = Ephem.sun(jdTT);
	const eq = Ephem.equatorial(position, jdTT);

	return { lon: position.lon, lat: position.lat, ra: eq.ra, dec: eq.dec };
}

/* JD(TT) near jdGuess when the reference Sun reaches longitude lon. */
function sunAtLongitude(lon, jdGuess) {
	let jd = jdGuess;

	for (let i = 0; i < 20; i++) {
		jd += norm180(lon - Ephem.sun(jd).lon) / 0.9856;
	}

	return jd;
}


/* ==========================================================================
   3. OBSERVATION: ONE STAR, THREE ADDRESSES
   Aldebaran from Rome on the evening of 1 January 2026 (CET = UT + 1).
   Positions of date (mean equator and equinox, no nutation or aberration),
   geometric altitude (no air): the conventions of page 1.1.
   ========================================================================== */

title('Observation: Aldebaran, three addresses');
const OBS_JD_UT = Time.julianDay(2026, 1, 1) + 19 / 24;    // 20:00 CET
const OBS_JD_TT = Time.ttFromUt(OBS_JD_UT);
const aldebaranEq = Stars.ofDate(Stars.find('Aldebaran'), OBS_JD_TT);
const epsObs = Ephem.meanObliquity(OBS_JD_TT);
const aldebaranEcl = Frames.equatorialToEcliptic(aldebaranEq.ra, aldebaranEq.dec, epsObs);
const thetaObs = Time.lst(OBS_JD_UT, ROME.lon);
const aldebaranHor = Frames.equatorialToHorizontal(aldebaranEq.ra, aldebaranEq.dec, ROME.phi, thetaObs);

[17, 18, 19, 20, 21].forEach(hour => {
	const jd = Time.julianDay(2026, 1, 1) + hour / 24;
	const h = Frames.equatorialToHorizontal(aldebaranEq.ra, aldebaranEq.dec, ROME.phi, Time.lst(jd, ROME.lon));

	console.log(`  ${hour}:00 UT: A = ${f(h.A, 1)}, a = ${f(h.a, 1)}`);
});
console.log(`instant: ${dateText(OBS_JD_UT)} UT, local sidereal time theta = ${f(thetaObs, 2)} deg = ${raHours(thetaObs)}`);
console.log(`horizon:    A = ${f(aldebaranHor.A, 2)}, a = ${f(aldebaranHor.a, 2)}  (H = ${f(aldebaranHor.H, 2)})`);
console.log(`equatorial: alpha = ${f(aldebaranEq.ra, 3)} (${raHours(aldebaranEq.ra)}), delta = ${f(aldebaranEq.dec, 3)}`);
console.log(`ecliptic:   lambda = ${f(aldebaranEcl.lon, 3)}, beta = ${f(aldebaranEcl.lat, 3)}   (eps of date ${f(epsObs, 4)})`);

// the same star in Ptolemy's catalogue (Almagest VII 5: Taurus 12°40', -5°10'), epoch AD 137 July 20
const PTOLEMY_EPOCH = Time.julianDay(137, 7, 20);
const ptolemyAldebaran = { lon: 30 + dms(12, 40), lat: -dms(5, 10) };
const aldebaran137 = Stars.ofDate(Stars.find('Aldebaran'), PTOLEMY_EPOCH);
const aldebaran137Ecl = Frames.equatorialToEcliptic(aldebaran137.ra, aldebaran137.dec, Ephem.meanObliquity(PTOLEMY_EPOCH));

console.log(`Ptolemy (AD 137): lambda = ${f(ptolemyAldebaran.lon, 3)}, beta = ${f(ptolemyAldebaran.lat, 3)}`);
console.log(`real sky AD 137:  lambda = ${f(aldebaran137Ecl.lon, 3)}, beta = ${f(aldebaran137Ecl.lat, 3)}` +
	`  -> Ptolemy off by ${arcmin(ptolemyAldebaran.lon - aldebaran137Ecl.lon, 0)} in lambda, ${arcmin(ptolemyAldebaran.lat - aldebaran137Ecl.lat, 0)} in beta`);
console.log(`1889 years: lambda grew ${f(aldebaranEcl.lon - aldebaran137Ecl.lon, 2)} deg, beta changed ${arcmin(aldebaranEcl.lat - aldebaran137Ecl.lat, 1)}`);
console.log(`           alpha grew ${f(norm180(aldebaranEq.ra - aldebaran137.ra), 2)} deg, delta changed ${f(aldebaranEq.dec - aldebaran137.dec, 2)} deg`);


/* ==========================================================================
   4. MODEL: THE MATRICES, CHECKED
   ========================================================================== */

title('Model: the matrices against the formulas');
const EPS_2026 = Ephem.meanObliquity(Time.julianDay(2026, 1, 1));
const K = Frames.eclipticPole(EPS_2026);
const Kc = toLonLat(K);

console.log(`eps(2026.0) = ${f(EPS_2026, 4)} = ${toDms(EPS_2026)}`);
console.log(`ecliptic pole K: ${vec(K)} -> alpha = ${f(Kc.lon, 2)}, delta = ${f(Kc.lat, 3)} (= 90 - eps)`);

// random directions: matrix route against formula route, and against Ephem's own formulas.
// A fixed-seed generator, so the output is the same at every run.
let seed = 12345;
const random = () => {
	seed = (seed * 1103515245 + 12345) % 2147483648;

	return seed / 2147483648;
};
let worst = 0;

for (let i = 0; i < 2000; i++) {
	const lon = 360 * random();
	const lat = asin(2 * random() - 1);
	const phi = 180 * random() - 90;
	const theta = 360 * random();
	const viaMatrix = toLonLat(matApply(Frames.eclipticToEquatorialMatrix(EPS_2026), fromLonLat(lon, lat)));
	const viaFormula = Frames.eclipticToEquatorial(lon, lat, EPS_2026);
	const viaEphem = Ephem.eclipticToEquatorial(lon, lat, EPS_2026);
	const back = Frames.equatorialToEcliptic(viaFormula.ra, viaFormula.dec, EPS_2026);
	const hor = Frames.equatorialToHorizontal(viaFormula.ra, viaFormula.dec, phi, theta);
	const horMatrix = Frames.toHorizontal(matApply(Frames.equatorialToHorizonMatrix(phi, theta), fromLonLat(viaFormula.ra, viaFormula.dec)));
	const eqBack = Frames.horizontalToEquatorial(hor.A, hor.a, phi, theta);

	[
		norm180(viaMatrix.lon - viaFormula.ra) * cos(viaFormula.dec), viaMatrix.lat - viaFormula.dec,
		norm180(viaEphem.ra - viaFormula.ra) * cos(viaFormula.dec), viaEphem.dec - viaFormula.dec,
		norm180(back.lon - lon) * cos(lat), back.lat - lat,
		norm180(horMatrix.A - hor.A) * cos(hor.a), horMatrix.a - hor.a,
		norm180(eqBack.ra - viaFormula.ra) * cos(viaFormula.dec), eqBack.dec - viaFormula.dec,
		Diurnal.altitude(viaFormula.dec, hor.H, phi) - hor.a
	].forEach(d => {
		worst = Math.max(worst, Math.abs(d));
	});
}

console.log(`2000 random directions: matrices, formulas, inverses and Ephem agree within ${(worst * 3600).toExponential(1)}"`);


/* ==========================================================================
   5. FIT: THE OBLIQUITY FROM THE SOLSTICES; THE EQUINOX
   Noon altitudes of the reference Sun at Alexandria in 2026, as seen
   (with refraction), at the two solstices.
   ========================================================================== */

title('Fit: the obliquity from two noon shadows (Alexandria, 2026)');

/* Seen noon altitude (deg) of the Sun on day jd0 (0h UT) at a place. */
function noonAltitude(jd0, place) {
	const jdUT = jd0 + 0.5 - place.lon / 360;
	const dec = realSun(Time.ttFromUt(jdUT)).dec;
	const a = Diurnal.upperCulmination(dec, place.phi);

	return a + Ephem.refraction(a);
}

let highest = { a: -99 };
let lowest = { a: 99 };

for (let day = 0; day < 365; day++) {
	const jd0 = Time.julianDay(2026, 1, 1) + day;
	const a = noonAltitude(jd0, ALEXANDRIA);

	if (a > highest.a) {
		highest = { a, jd0 };
	}

	if (a < lowest.a) {
		lowest = { a, jd0 };
	}
}

const epsFit = (highest.a - lowest.a) / 2;
const phiFit = 90 - (highest.a + lowest.a) / 2;
const eps2026Mid = epsOfYear(2026);

console.log(`highest noon Sun ${f(highest.a, 3)} on ${dateText(highest.jd0)}, lowest ${f(lowest.a, 3)} on ${dateText(lowest.jd0)}`);
console.log(`refraction lifts them by ${arcmin(Ephem.refraction(highest.a - 0.002), 2)} and ${arcmin(Ephem.refraction(lowest.a - 0.02), 2)}`);
console.log(`fit: eps = ${f(epsFit, 4)} (${arcmin(epsFit - eps2026Mid, 2)} from the mean ${f(eps2026Mid, 4)}),` +
	` phi = ${f(phiFit, 4)} (${arcmin(phiFit - ALEXANDRIA.phi, 2)} from ${ALEXANDRIA.phi})`);

title('Ptolemy and the others');
console.log(`Ptolemy: 2 eps = 47°42'40\" -> eps = ${toDms(Frames.PTOLEMY_OBLIQUITY)} = ${f(Frames.PTOLEMY_OBLIQUITY, 4)}`);
console.log(`ratio 11/83: 2 eps = ${toDms(2 * Frames.RATIO_11_83_OBLIQUITY)} -> eps = ${toDms(Frames.RATIO_11_83_OBLIQUITY)} = ${f(Frames.RATIO_11_83_OBLIQUITY, 4)}`);
console.log(`Ptolemy's bounds: 47°40' < 2 eps < 47°45' -> ${f(dms(47, 40) / 2, 4)} < eps < ${f(dms(47, 45) / 2, 4)}`);
[[-229, 'Eratosthenes (c. 230 BC)'], [-134, 'Hipparchus (c. 135 BC)'], [137, 'Ptolemy (AD 137)'],
	[1525, 'Copernicus (c. 1525)'], [2026, 'today']].forEach(([year, label]) => {
	const eps = epsOfYear(year);

	console.log(`${label.padEnd(26)} true mean eps = ${f(eps, 4)} = ${toDms(eps)};` +
		` Ptolemy's value is ${arcmin(Frames.PTOLEMY_OBLIQUITY - eps, 1)} larger`);
});
console.log(`Copernicus (De Rev. II 2): "not more than 23°29\'" = ${f(dms(23, 29), 4)}`);

title('The origin: the March equinox 2026');
const equinox = sunAtLongitude(0, Time.julianDay(2026, 3, 20));
console.log(`reference Sun at lambda = 0: ${dateText(Time.utFromTt(equinox))} UT; delta there = ${arcsec(realSun(equinox).dec, 1)}`);


/* ==========================================================================
   6. TEST: PTOLEMY'S TABLES; THE REAL SUN; FIGURE SCALES
   ========================================================================== */

title('Test 1: Ptolemy\'s table of inclination (Almagest I 15) against sin d = sin e sin l');

const tableDiffs = Frames.PTOLEMY_DECLINATIONS.map((table, i) => {
	const lon = i + 1;
	const formula = Frames.eclipticPoint(lon, Frames.PTOLEMY_OBLIQUITY).dec;

	return { lon, table, formula, diff: (table - formula) * 3600 };
});
const absDiffs = tableDiffs.map(row => Math.abs(row.diff)).sort((a, b) => a - b);

console.log(`90 entries: median |table - formula| = ${f(absDiffs[44], 1)}", 90% within ${f(absDiffs[80], 1)}", largest ${f(absDiffs[89], 1)}"`);
tableDiffs.filter(row => Math.abs(row.diff) > 6).forEach(row => {
	console.log(`  lambda ${row.lon}: table ${toDms(row.table)}, formula ${toDms(row.formula)} (${f(row.diff, 1)}")`);
});
[30, 60].forEach(lon => {
	const row = tableDiffs[lon - 1];

	console.log(`  lambda ${lon}: table ${toDms(row.table)}, formula ${toDms(row.formula)} = ${f(row.formula, 4)}`);
});

title('Test 1b: Ptolemy\'s right ascensions (Almagest I 16) against tan a = cos e tan l');

let worstRA = 0;

Frames.ptolemyRightAscensions().slice(1).forEach((cumulative, i) => {
	const lon = 10 * (i + 1);
	const ra = Frames.eclipticPoint(lon, Frames.PTOLEMY_OBLIQUITY).ra;

	worstRA = Math.max(worstRA, Math.abs(cumulative - ra));
	console.log(`  lambda ${String(lon).padStart(2)}: Ptolemy ${toDms(cumulative).slice(0, -3)}, formula ${toDms(ra)} (${f((cumulative - ra) * 60, 2)}')`);
});
console.log(`largest difference ${f(worstRA * 60, 2)}' (Ptolemy rounds to minutes)`);

title('Test 1c: the table on the page, Ptolemy against the real Sun of AD 137');

/* Every 10° of longitude: Ptolemy's declination (I 15) and right ascension
   (I 16), and the real Sun's when it stood at that longitude in AD 137
   (apparent, of date). Differences Ptolemy - real in arcminutes. */
const ptolemyRA = Frames.ptolemyRightAscensions();
let jdGuess137 = Time.julianDay(137, 3, 21);

console.log('lambda | Ptolemy delta        | real delta | d delta | Ptolemy alpha     | real alpha | d alpha');

for (let lon = 10; lon <= 90; lon += 10) {
	const jd = sunAtLongitude(lon, jdGuess137);
	const real = realSun(jd);
	const ptDec = Frames.PTOLEMY_DECLINATIONS[lon - 1];
	const ptRA = ptolemyRA[lon / 10];

	jdGuess137 = jd + 10;
	console.log(`${String(lon).padStart(6)} | ${toDms(ptDec)} (${f(ptDec, 3)}) | ${f(real.dec, 3).padStart(10)} |` +
		` ${((ptDec - real.dec) * 60).toFixed(1).padStart(7)}' | ${toDms(ptRA).slice(0, -3)} (${f(ptRA, 3)}) |` +
		` ${f(real.ra, 3).padStart(10)} | ${((ptRA - real.ra) * 60).toFixed(1).padStart(6)}'  [${dateText(jd)}]`);
}

title('Test 2 (Figure 3): the nutation error over 2026');

/* Each day of 2026 at 0h TT: the reference Sun's apparent (lambda, beta)
   turned into (alpha, delta) with the MEAN obliquity of date (the model:
   fixed frames), against the reference Sun's own (alpha, delta), computed
   with the TRUE obliquity (mean + nutation in obliquity d eps). The same
   (lambda, beta) on both sides, so the difference is the nutation alone. */
const NUTATION_YEAR = 2026;
const nutationDays = [];

for (let day = 0; day <= 365; day++) {
	const jd = Time.julianDay(NUTATION_YEAR, 1, 1) + day;
	const position = Ephem.sun(jd);
	const real = Ephem.equatorial(position, jd);
	const model = Frames.eclipticToEquatorial(position.lon, position.lat, Ephem.meanObliquity(jd));

	nutationDays.push({
		day: day,
		lon: position.lon,
		deps: Ephem.nutation(jd).deps * 3600,
		dDec: (model.dec - real.dec) * 3600,
		dRA: norm180(model.ra - real.ra) * 3600
	});
}

const extreme = (key, pick) => nutationDays.reduce((best, d) => (pick(d[key], best[key]) ? d : best));
const depsMin = extreme('deps', (x, y) => x < y);
const depsMax = extreme('deps', (x, y) => x > y);
const decMax = extreme('dDec', (x, y) => Math.abs(x) > Math.abs(y));
const raMax = extreme('dRA', (x, y) => Math.abs(x) > Math.abs(y));
const june = nutationDays.reduce((best, d) => (Math.abs(norm180(d.lon - 90)) < Math.abs(norm180(best.lon - 90)) ? d : best));
const december = nutationDays.reduce((best, d) => (Math.abs(norm180(d.lon - 270)) < Math.abs(norm180(best.lon - 270)) ? d : best));

console.log(`nutation in obliquity d eps over ${NUTATION_YEAR}: ${f(depsMin.deps, 2)}" (day ${depsMin.day}) to ${f(depsMax.deps, 2)}" (day ${depsMax.day})`);
console.log(`largest |d delta| = ${f(Math.abs(decMax.dDec), 2)}" (day ${decMax.day}, lambda ${f(decMax.lon, 0)}),` +
	` largest |d alpha| = ${f(Math.abs(raMax.dRA), 2)}" (day ${raMax.day}, lambda ${f(raMax.lon, 0)})`);
console.log(`June solstice (day ${june.day}): d delta = ${f(june.dDec, 2)}", -d eps = ${f(-june.deps, 2)}"`);
console.log(`December solstice (day ${december.day}): d delta = ${f(december.dDec, 2)}", +d eps = ${f(december.deps, 2)}"`);
console.log(`Figure 3 scale: every value within ${f(Math.max(Math.abs(depsMin.deps), Math.abs(depsMax.deps), Math.abs(decMax.dDec), Math.abs(raMax.dRA)), 2)}" -> fixed range [-12", +12"]`);

title('Residual: an old obliquity used today');

/* Largest |d delta| (deg) over one year starting 1 January of 'year' when
   the Sun's real longitude is turned into delta with the obliquity eps. */
function largestDecError(eps, year) {
	const start = Time.julianDay(year, 1, 1);
	let largest = 0;

	for (let day = 0; day < 366; day++) {
		const real = realSun(start + day);

		largest = Math.max(largest, Math.abs(Frames.eclipticPoint(real.lon, eps).dec - real.dec));
	}

	return largest;
}

console.log(`the mean obliquity of AD 137 used in 2026: max |d delta| = ${arcmin(largestDecError(epsOfYear(137), 2026), 2)}`);

title('Exercise 1: equatorial -> ecliptic, Aldebaran of 2026.0');
const jd2026 = Time.julianDay(2026, 1, 1);
const ald = Stars.ofDate(Stars.find('Aldebaran'), jd2026);
const aldEcl = Frames.equatorialToEcliptic(ald.ra, ald.dec, EPS_2026);
const sEq = fromLonLat(ald.ra, ald.dec);
const sEcl = matApply(transpose(Frames.eclipticToEquatorialMatrix(EPS_2026)), sEq);

console.log(`alpha = ${f(ald.ra, 4)}, delta = ${f(ald.dec, 4)}, eps = ${f(EPS_2026, 4)}`);
console.log(`s_eq = ${vec(sEq)}, s_ecl = R_x(-eps) s_eq = ${vec(sEcl)}`);
console.log(`sin beta = ${f(sin(ald.dec) * cos(EPS_2026) - cos(ald.dec) * sin(EPS_2026) * sin(ald.ra), 5)} -> beta = ${f(aldEcl.lat, 3)}`);
console.log(`lambda = atan2(${f(sEcl[1], 5)}, ${f(sEcl[0], 5)}) = ${f(aldEcl.lon, 3)}`);

title('Exercise 2: the Sun at lambda = 60');
const jd60 = sunAtLongitude(60, Time.julianDay(2026, 5, 21));
const eps60 = Ephem.meanObliquity(jd60);
const model60 = Frames.eclipticPoint(60, eps60);
const ptolemy60 = Frames.eclipticPoint(60, Frames.PTOLEMY_OBLIQUITY);
const real60 = realSun(jd60);

console.log(`reference Sun at lambda = 60: ${dateText(Time.utFromTt(jd60))} UT; eps of date = ${f(eps60, 4)}`);
console.log(`sin delta = sin eps sin 60 = ${f(sin(eps60) * sin(60), 5)} -> delta = ${f(model60.dec, 3)} = ${toDms(model60.dec)}`);
console.log(`tan alpha = cos eps tan 60 = ${f(cos(eps60) * Math.tan(Math.PI / 3), 5)} -> alpha = ${f(model60.ra, 3)} = ${raHours(model60.ra)}` +
	` (alpha - lambda = ${f(model60.ra - 60, 3)} = ${arcmin(model60.ra - 60, 1)})`);
console.log(`reference Sun then: alpha = ${f(real60.ra, 3)}, delta = ${f(real60.dec, 3)}, beta = ${arcsec(real60.lat, 2)};` +
	` model - real: ${arcsec(norm180(model60.ra - real60.ra), 1)}, ${arcsec(model60.dec - real60.dec, 1)}`);
console.log(`with Ptolemy's eps: delta = ${f(ptolemy60.dec, 4)} = ${toDms(ptolemy60.dec)} (table I 15: 20°30'09\"),` +
	` alpha = ${f(ptolemy60.ra, 4)} = ${toDms(ptolemy60.ra)} (I 16: 57°44')`);

title('Exercise 3: the ecliptic against the horizon at Rome');

/* The ecliptic's rising point: the crossing of ecliptic and horizon on the
   eastern side, as an ecliptic longitude. */
function risingPoint(eps, phi, theta) {
	const toHorizon = Frames.eclipticToHorizonMatrix(eps, phi, theta);
	const K = matApply(toHorizon, [0, 0, 1]);
	const crossing = normalize3(cross3([0, 0, 1], K));     // Z x K, on the horizon
	const east = crossing[1] > 0 ? crossing : crossing.map(x => -x);

	return toLonLat(matApply(transpose(toHorizon), east)).lon;
}

[ROME, ALEXANDRIA].forEach(place => {
	let lo = { angle: 99 };
	let hi = { angle: -1 };

	for (let theta = 0; theta < 360; theta += 0.01) {
		const angle = Frames.eclipticHorizonAngle(EPS_2026, place.phi, theta);

		if (angle < lo.angle) {
			lo = { angle, theta };
		}

		if (angle > hi.angle) {
			hi = { angle, theta };
		}
	}

	console.log(`phi = ${place.phi}: 90 - phi - eps = ${f(90 - place.phi - EPS_2026, 2)}, 90 - phi + eps = ${f(90 - place.phi + EPS_2026, 2)}`);
	console.log(`  scan: least ${f(lo.angle, 2)} at theta = ${f(lo.theta, 2)} (rising point lambda = ${f(risingPoint(EPS_2026, place.phi, lo.theta), 1)}),` +
		` greatest ${f(hi.angle, 2)} at theta = ${f(hi.theta, 2)} (rising point lambda = ${f(risingPoint(EPS_2026, place.phi, hi.theta), 1)})`);
});

// sunset at Rome on the two equinoxes: the Sun's upper limb on the seen
// horizon (centre at -50', page 1.1), the turn theta then, and the angle
// between the ecliptic and the horizon
[[2026, 3, 20, 'March equinox'], [2026, 9, 23, 'September equinox']].forEach(([y, m, d, label]) => {
	const jd0 = Time.julianDay(y, m, d);
	const altitudeAt = jdUT => {
		const sun = realSun(Time.ttFromUt(jdUT));
		const H = Diurnal.hourAngle(Time.lst(jdUT, ROME.lon), sun.ra);

		return Diurnal.altitude(sun.dec, H, ROME.phi);
	};
	let lo = jd0 + 0.6;
	let hi = jd0 + 0.9;

	for (let i = 0; i < 50; i++) {
		const mid = (lo + hi) / 2;

		if (altitudeAt(mid) > -50 / 60) {
			lo = mid;
		} else {
			hi = mid;
		}
	}

	const theta = Time.lst(lo, ROME.lon);
	const angle = Frames.eclipticHorizonAngle(EPS_2026, ROME.phi, theta);
	const hours = (lo - jd0) * 24;

	console.log(`${label}: sunset at Rome ${Math.floor(hours)}:${String(Math.round((hours % 1) * 60)).padStart(2, '0')} UT,` +
		` theta = ${f(theta, 1)}, ecliptic at ${f(angle, 1)} deg to the horizon,` +
		` rising point lambda = ${f(risingPoint(EPS_2026, ROME.phi, theta), 1)}`);
});


/* ==========================================================================
   8. RESIDUAL: THE ANGLE BETWEEN THE FRAMES DRIFTS
   ========================================================================== */

title('Residual: the obliquity changes');
const rate = (epsOfYear(1926) - epsOfYear(2026)) * 3600;
console.log(`eps fell ${f(rate, 1)}" in the last century; ${f((epsOfYear(137) - epsOfYear(2026)) * 60, 1)}' since AD 137`);
console.log(`nutation in obliquity: up to ${f(9.2, 1)}" (Ephem.nutation, 18.6-year period)`);
