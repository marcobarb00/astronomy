/* ==========================================================================
   NUMBERS FOR PAGE 1.1 "THE TURNING SKY" (tools/numbers/1.1-turning-sky.js)
   Loads the site's shared code (common, time, ephemeris, stars and the
   model models/diurnal.js) in a Node vm context and prints every number
   quoted on the page, in page order.

   Run from the repository root:  node tools/numbers/1.1-turning-sky.js

   TABLE OF CONTENTS
	 1. Loading the shared code
	 2. Formatting
	 3. Observation: one turn, the pole, Polaris
	 4. Fit: latitude and declination from two culminations
	 5. Test: refraction and the rising times; figure scales
	 6. Exercises
	 7. Residual: Polaris and the pole
   ========================================================================== */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

/* ==========================================================================
   1. LOADING THE SHARED CODE
   ========================================================================== */

const ROOT = path.join(__dirname, '..', '..');
const FILES = ['common.js', 'time.js', 'ephemeris.js', 'stars.js', 'models/diurnal.js'];
const context = {};

vm.createContext(context);

FILES.forEach(file => {
	const source = fs.readFileSync(path.join(ROOT, 'shared', file), 'utf8');

	vm.runInContext(source, context, { filename: file });
});

const shared = vm.runInContext(
	'({ sin, cos, tan, asin, acos, atan2d, norm180, Time, Ephem, Stars, Diurnal })',
	context
);
const { cos, tan, acos, atan2d, norm180, Time, Ephem, Stars, Diurnal } = shared;

/* ==========================================================================
   2. FORMATTING
   ========================================================================== */

/* Hours -> "23h56m04.09s". */
function hms(hours) {
	const total = Math.round(hours * 3600 * 100) / 100;
	const h = Math.floor(total / 3600);
	const m = Math.floor((total - 3600 * h) / 60);
	const s = total - 3600 * h - 60 * m;

	return `${h}h${String(m).padStart(2, '0')}m${s.toFixed(2).padStart(5, '0')}s`;
}

/* Hours -> "9h53m". */
function hm(hours) {
	const minutes = Math.round(hours * 60);

	return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}m`;
}

/* JD(UT) -> "06:02:53". */
function clock(jdUT) {
	const hours = ((jdUT + 0.5) % 1) * 24;

	return hms(hours)
		.replace(/h|m/g, ':')
		.replace(/\.\d\ds$/, '');
}

const dms = (d, m = 0, s = 0) => d + m / 60 + s / 3600; // 23°51'20" -> degrees
const title = text => console.log(`\n=== ${text} ===`);
const star = name => Stars.find(name);

/* The latitudes used on the page. */
const PLACES = {
	alexandria: 31.2, // modern, 31°12' N
	alexandriaPtolemy: dms(30, 58),
	rhodes: 36, // Ptolemy, Almagest II 2
	rome: 41.9,
	london: 51.5,
	greenwich: 51.4769
};

const NOW = Time.julianDay(2026, 1, 1); // epoch of the "fitted" stars

/* Clock hours of a turn of the sky through 'degrees'. */
const clockHours = degrees => degrees / Diurnal.DEGREES_PER_HOUR;

/* ==========================================================================
   3. OBSERVATION: ONE TURN, THE POLE, POLARIS
   ========================================================================== */

title('One turn of the sky');
console.log(`rate ${Diurnal.DEGREES_PER_DAY} deg/day = ${Diurnal.DEGREES_PER_HOUR.toFixed(4)} deg per clock hour`);
console.log(`one turn = ${hms(Diurnal.TURN_HOURS)}, ${((24 - Diurnal.TURN_HOURS) * 60).toFixed(2)} min short of 24 h`);

// the same from time.js: the next instant with the same sidereal time
const start = Time.julianDay(2026, 3, 1);
let lo = start + 0.99;
let hi = start + 1.0;

for (let i = 0; i < 60; i++) {
	const mid = (lo + hi) / 2;

	if (norm180(Time.gmst(mid) - Time.gmst(start)) < 0) {
		lo = mid;
	} else {
		hi = mid;
	}
}

console.log(`check with Time.gmst: ${hms((lo - start) * 24)}`);
console.log(`Polaris from the pole now: ${(90 - Stars.ofDate(star('Polaris'), NOW).dec).toFixed(2)} deg`);

/* ==========================================================================
   4. FIT: LATITUDE AND DECLINATION FROM TWO CULMINATIONS
   Kochab seen from Alexandria. The "measured" altitudes are those of the
   reference sky: true altitude plus refraction. Altitudes are counted from
   the north point of the horizon, so the upper one may pass 90°.
   ========================================================================== */

title('Fit: Kochab from Alexandria');
const kochab = Stars.ofDate(star('Kochab'), NOW);
const phi = PLACES.alexandria;
const upperTrue = phi + 90 - kochab.dec;
const lowerTrue = phi + kochab.dec - 90;
const upperSeen = upperTrue + Ephem.refraction(upperTrue);
const lowerSeen = lowerTrue + Ephem.refraction(lowerTrue);
const phiFit = (upperSeen + lowerSeen) / 2;
const decFit = 90 - (upperSeen - lowerSeen) / 2;

console.log(`Kochab dec of 2026.0 = ${kochab.dec.toFixed(4)}`);
console.log(
	`altitudes above N: upper ${upperTrue.toFixed(3)} -> seen ${upperSeen.toFixed(3)} (+${(Ephem.refraction(upperTrue) * 60).toFixed(2)}'),` +
		` lower ${lowerTrue.toFixed(3)} -> seen ${lowerSeen.toFixed(3)} (+${(Ephem.refraction(lowerTrue) * 60).toFixed(2)}')`
);
console.log(
	`fit: phi = ${phiFit.toFixed(3)} (+${((phiFit - phi) * 60).toFixed(1)}'), dec = ${decFit.toFixed(3)} (+${((decFit - kochab.dec) * 60).toFixed(1)}')`
);
console.log(
	`Ptolemy, Alexandria 30;58 = ${PLACES.alexandriaPtolemy.toFixed(3)}: ${((PLACES.alexandriaPtolemy - phi) * 60).toFixed(0)}' from 31°12'`
);

/* ==========================================================================
   5. TEST: REFRACTION AND THE RISING TIMES; FIGURE SCALES
   ========================================================================== */

title('Refraction');
[0, 5, 10, 20, 45].forEach(h => {
	console.log(`true altitude ${String(h).padStart(2)}: R = ${(Ephem.refraction(h) * 60).toFixed(2)}'`);
});

// depth of the apparent horizon: true altitude t with t + R(t) = 0
let horizon = -0.5;

for (let i = 0; i < 60; i++) {
	horizon = -Ephem.refraction(horizon);
}

console.log(`a star on the apparent horizon is ${(-horizon * 60).toFixed(2)}' below the true one`);
console.log(`Figure 5 scale: deepest model - real = ${(horizon * 60).toFixed(2)}' -> fixed range [-40', +5']`);

title('Rising earlier, setting later (stars of 2026.0)');
[
	['Sirius', 'rome'],
	['Mintaka', 'rome'],
	['Vega', 'rome'],
	['Antares', 'rome'],
	['Mintaka', 'london'],
	['Canopus', 'rhodes']
].forEach(([name, place]) => {
	const s = Stars.ofDate(star(name), NOW);
	const model = Diurnal.risingHourAngle(s.dec, PLACES[place]);
	const real = Diurnal.risingHourAngle(s.dec, PLACES[place], horizon);

	console.log(
		`${name.padEnd(8)} at ${place.padEnd(7)}: ${(clockHours(real - model) * 60).toFixed(1)} min earlier;` +
			` up ${hm(clockHours(2 * model))} -> ${hm(clockHours(2 * real))}`
	);
});

/* ==========================================================================
   6. EXERCISES
   ========================================================================== */

title('Exercise 1: which stars never set, which never rise (J2000)');
['rhodes', 'rome', 'london'].forEach(place => {
	const latitude = PLACES[place];
	const line = ['Dubhe', 'Capella', 'Deneb', 'Vega', 'Canopus'].map(name => {
		const dec = star(name).dec;

		return `${name} ${Diurnal.classify(dec, latitude)} (max ${Diurnal.upperCulmination(dec, latitude).toFixed(2)}, min ${Diurnal.lowerCulmination(dec, latitude).toFixed(2)})`;
	});

	console.log(`${place} (${latitude}): never sets above dec ${(90 - latitude).toFixed(1)}; ${line.join('; ')}`);
});
console.log(
	`Capella never sets north of ${(90 - star('Capella').dec).toFixed(2)}, Vega north of ${(90 - star('Vega').dec).toFixed(2)}`
);
console.log(`Canopus rises south of ${(90 + star('Canopus').dec).toFixed(2)}`);

title('Exercise 2: fraction of the day above the horizon');
[
	['Sirius', 'alexandria'],
	['Sirius', 'rome'],
	['Sirius', 'london']
].forEach(([name, place]) => {
	const dec = star(name).dec;
	const H0 = Diurnal.risingHourAngle(dec, PLACES[place]);

	console.log(
		`${name} from ${place}: -tan(phi) tan(dec) = ${(-tan(PLACES[place]) * tan(dec)).toFixed(4)},` +
			` H0 = ${H0.toFixed(2)}, f = ${(H0 / 180).toFixed(3)}, up ${hm(clockHours(2 * H0))} of clock time`
	);
});

const eps = dms(23, 51, 20);
const H0Rhodes = Diurnal.risingHourAngle(eps, PLACES.rhodes);

console.log(
	`Rhodes: -tan 36 tan(23;51,20) = ${(-tan(36) * tan(eps)).toFixed(4)}, H0 = ${H0Rhodes.toFixed(3)},` +
		` longest day = ${((2 * H0Rhodes) / 15).toFixed(4)} h, shortest = ${(24 - (2 * H0Rhodes) / 15).toFixed(4)} h`
);
console.log(`inverse: a 14.5 h day gives phi = ${atan2d(-cos((14.5 / 2) * 15), tan(eps)).toFixed(2)}`);

title('Exercise 3: the equinox day at Greenwich, 20 March 2026');

/* Altitude of the reference Sun at JD(UT) from latitude phi, longitude 0. */
function sunAltitude(jdUT, latitude) {
	const jdTT = Time.ttFromUt(jdUT);
	const eq = Ephem.equatorial(Ephem.sun(jdTT), jdTT);
	const H = Diurnal.hourAngle(Ephem.apparentSiderealTime(jdUT), eq.ra);

	return Diurnal.altitude(eq.dec, H, latitude);
}

/* JD(UT) between a and b where the Sun crosses altitude h0. */
function crossing(a, b, latitude, h0) {
	const above = jd => sunAltitude(jd, latitude) > h0;
	const startAbove = above(a);

	for (let i = 0; i < 60; i++) {
		const mid = (a + b) / 2;

		if (above(mid) === startAbove) {
			a = mid;
		} else {
			b = mid;
		}
	}

	return (a + b) / 2;
}

const day = Time.julianDay(2026, 3, 20);
const lengths = {};

[
	['centre on the geometric horizon', 'geometric', 0],
	["with refraction (-34')", 'refraction', -34 / 60],
	["upper limb with refraction (-50')", 'limb', -50 / 60]
].forEach(([label, key, h0]) => {
	const rise = crossing(day + 0.1, day + 0.4, PLACES.greenwich, h0);
	const set = crossing(day + 0.6, day + 0.9, PLACES.greenwich, h0);

	lengths[key] = (set - rise) * 1440;
	console.log(`${label.padEnd(36)} rise ${clock(rise)}, set ${clock(set)}, day ${hms((set - rise) * 24)}`);
});
console.log(
	`split: Sun's own motion ${(lengths.geometric - 720).toFixed(1)} min, refraction +${(lengths.refraction - lengths.geometric).toFixed(1)} min,` +
		` radius +${(lengths.limb - lengths.refraction).toFixed(1)} min, total +${(lengths.limb - 720).toFixed(1)} min`
);
const climb = 15 * cos(PLACES.greenwich); // deg per hour at sunrise, delta = 0 (da/dH = cos phi)

console.log(
	`climb at sunrise: 15 cos(phi) = ${climb.toFixed(2)} deg/h; 50' takes ${((50 / 60 / climb) * 60).toFixed(1)} min at each end`
);
console.log(`estimate 2 x 0.833 deg / (15 cos phi deg/h) = ${(((2 * (50 / 60)) / climb) * 60).toFixed(1)} min`);

/* ==========================================================================
   7. RESIDUAL: POLARIS AND THE POLE
   ========================================================================== */

title('Polaris and the pole');

/* Angle (deg) between a star and the mean pole of date. */
function fromPole(name, jdTT) {
	const v = Stars.vectorJ2000(star(name), jdTT);
	const pole = Ephem.equatorPole(jdTT);

	return acos(v[0] * pole[0] + v[1] * pole[1] + v[2] * pole[2]);
}

[
	[-129, 'Hipparchus, 130 BC'],
	[137, 'Ptolemy, AD 137'],
	[2026, 'now']
].forEach(([year, label]) => {
	console.log(
		`${label.padEnd(19)}: Polaris ${fromPole('Polaris', Time.julianDay(year, 7, 1)).toFixed(2)} deg from the pole`
	);
});

let closest = { angle: 99, year: 0 };

for (let year = 2000; year <= 2200; year += 0.25) {
	const angle = fromPole('Polaris', Time.jdFromDecimalYear(year));

	if (angle < closest.angle) {
		closest = { angle, year };
	}
}

console.log(`closest: ${(closest.angle * 60).toFixed(1)}' around ${Math.round(closest.year)}`);
