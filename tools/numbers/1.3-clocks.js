/* ==========================================================================
   NUMBERS FOR PAGE 1.3 "CLOCKS" (tools/numbers/1.3-clocks.js)
   Loads the site's shared code (common, time, ephemeris, stars and the
   models diurnal.js, frames.js, mean-sun.js, clock.js) in a Node vm
   context and prints every number quoted on the page, in page order.

   Run from the repository root:  node tools/numbers/1.3-clocks.js
   (about 15 seconds: section 6 scans a year of sunrises at 53 latitudes)

   TABLE OF CONTENTS
	 1. Loading the shared code
	 2. Formatting
	 3. The reference Sun (tabulated, with its noon, sunrise and sunset)
	 4. Observation: the stars' day and the Sun's day
	 5. Model: the two days, sidereal time, mean time, Julian Date,
	    transits, the length of the day
	 6. Fit: the year, the constant, the longitude
	 7. Test: the stars; the Sun (Figure 6 and its scale)
	 8. Exercises
	 9. Residual: Delta T; the stars' right ascensions drift
   ========================================================================== */

const { loadFiles } = require('../check/load.js');

/* ==========================================================================
   1. LOADING THE SHARED CODE
   ========================================================================== */

/* The shared scripts, in dependency order (tools/check/load.js). */
const shared = loadFiles([
	'shared/common.js',
	'shared/time.js',
	'shared/ephemeris.js',
	'shared/stars.js',
	'shared/models/diurnal.js',
	'shared/models/frames.js',
	'shared/models/mean-sun.js',
	'shared/models/clock.js'
]);
const { norm180, norm360, Time, Ephem, Stars, Diurnal, MeanSun, Clock } = shared;

/* ==========================================================================
   2. FORMATTING
   ========================================================================== */

/* Hours -> "23h56m04.09s" (seconds with 'digits' decimals). */
function hms(hours, digits = 2) {
	const sign = hours < 0 ? '-' : '';
	const total = Number((Math.abs(hours) * 3600).toFixed(digits));
	const h = Math.floor(total / 3600);
	const m = Math.floor((total - 3600 * h) / 60);
	const s = total - 3600 * h - 60 * m;
	const secondsText = s.toFixed(digits).padStart(digits ? digits + 3 : 2, '0');

	return `${sign}${h}h${String(m).padStart(2, '0')}m${secondsText}s`;
}

/* Hours -> "9h07m". */
function hm(hours) {
	const minutes = Math.round(hours * 60);

	return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}m`;
}

/* JD(UT) -> clock time "16:38:44", shifted by offsetHours (time zone). */
function clock(jd, offsetHours = 0) {
	const hours = (((jd + 0.5) % 1) * 24 + offsetHours + 48) % 24;

	return hms(hours, 0).replace(/h|m/g, ':').replace(/s$/, '');
}

/* Degrees, minutes, seconds -> degrees; and the sexagesimal value
   d;m,s,... of the sources -> decimal. */
const fromSexagesimal = (...parts) => parts.reduce((sum, part, i) => sum + part / Math.pow(60, i), 0);

/* Degrees -> "0°59'08.29"". */
function dms(degrees, digits = 0) {
	const total = Number((degrees * 3600).toFixed(digits));
	const d = Math.floor(total / 3600);
	const m = Math.floor((total - 3600 * d) / 60);
	const s = total - 3600 * d - 60 * m;

	return `${d}°${String(m).padStart(2, '0')}'${s.toFixed(digits).padStart(digits ? digits + 3 : 2, '0')}"`;
}

const date = jd => Time.formatDate(jd);
const title = text => console.log(`\n=== ${text} ===`);
const star = name => Stars.find(name);

/* The places of the page: [latitude, longitude east]. */
const PLACES = {
	greenwich: [51.4769, 0],
	alexandria: [31.2, 29.92],
	rome: [41.9, 12.4964],
	london: [51.5, -0.1276]
};

const Y2026 = Time.julianDay(2026, 1, 1);
const CET = 1; // Rome's winter time zone, UT + 1 h

/* ==========================================================================
   3. THE REFERENCE SUN
   Apparent right ascension and declination tabulated every hour from
   2025 Dec 1 and interpolated linearly (error under 0.01"). Its noon is
   where its hour angle (apparent sidereal time) is zero; sunrise and
   sunset where its centre is 50' below the horizon, as in the model.
   ========================================================================== */

const TABLE_START = Time.julianDay(2025, 12, 1);
const TABLE_STEP = 1 / 24;
const TABLE = [];

for (let i = 0; i < 24 * 440; i++) {
	const jdUT = TABLE_START + i * TABLE_STEP;
	const jdTT = Time.ttFromUt(jdUT);

	TABLE.push(Ephem.equatorial(Ephem.sun(jdTT), jdTT));
}

function sunEquatorial(jdUT) {
	const x = (jdUT - TABLE_START) / TABLE_STEP;
	const i = Math.floor(x);
	const f = x - i;
	const a = TABLE[i];
	const b = TABLE[i + 1];

	return { ra: norm360(a.ra + f * norm180(b.ra - a.ra)), dec: a.dec + f * (b.dec - a.dec) };
}

function sunHourAngle(jdUT, lon) {
	return norm180(Ephem.apparentSiderealTime(jdUT) + lon - sunEquatorial(jdUT).ra);
}

function sunAltitude(jdUT, phi, lon) {
	const eq = sunEquatorial(jdUT);

	return Diurnal.altitude(eq.dec, norm180(Ephem.apparentSiderealTime(jdUT) + lon - eq.ra), phi);
}

/* Root of f in [a, b] by bisection (f(a) and f(b) of opposite signs). */
function bisect(f, a, b, steps = 45) {
	const signA = Math.sign(f(a));

	for (let i = 0; i < steps; i++) {
		const middle = (a + b) / 2;

		if (Math.sign(f(middle)) === signA) {
			a = middle;
		} else {
			b = middle;
		}
	}

	return (a + b) / 2;
}

/* The real Sun's noon, sunrise and sunset on the date whose 0h UT is jd0. */
function realDay(jd0, phi, lon) {
	const guess = Clock.fromLocalMeanTime(jd0, 12, lon);
	const noon = bisect(jd => sunHourAngle(jd, lon), guess - 0.03, guess + 0.03);
	const above = jd => sunAltitude(jd, phi, lon) - Clock.SUN_HORIZON;

	if (above(noon) < 0 || above(noon - 0.5) > 0) {
		return { noon, rise: NaN, set: NaN, hours: NaN };
	}

	const rise = bisect(above, noon - 0.5, noon);
	const set = bisect(above, noon, noon + 0.5);

	return { noon, rise, set, hours: (set - rise) * 24 };
}

/* ==========================================================================
   4. OBSERVATION: THE STARS' DAY AND THE SUN'S DAY
   ========================================================================== */

title("Observation: the stars' day");
const turn = Clock.SIDEREAL_DAY_HOURS;
console.log(`one turn of the sky = ${hms(turn)} of mean solar time`);
console.log(`a star crosses the meridian ${hms(24 - turn)} earlier each day: ${hm(30 * (24 - turn))} in 30 days`);

/* Dates of 2026 on which a star crosses Rome's meridian closest to a local
   mean time (hours, 12 to 36 = noon to the next noon). */
function dateOfTransitAt(name, targetHours, place = PLACES.rome) {
	let best = null;

	for (let d = 0; d < 365; d++) {
		const jd0 = Y2026 + d;
		const ra = Stars.ofDate(star(name), jd0).ra;
		const start = Clock.fromLocalMeanTime(jd0, 12, place[1]);

		Clock.transitsBetween(ra, start, 1, place[1]).forEach(t => {
			const hours = 12 + (t - start) * 24;
			const offset = Math.abs(hours - targetHours);

			if (!best || offset < best.offset) {
				best = { offset, jd0, hours };
			}
		});
	}

	return best;
}

[24, 22, 20].forEach(hours => {
	const found = dateOfTransitAt('Betelgeuse', hours);

	console.log(
		`Betelgeuse crosses Rome's meridian at ${hours % 24}:00 local mean time on the night of ${date(found.jd0)}`
	);
});

title("Observation: the Sun's day (true noon to noon, Greenwich, 2026)");
const noons = [];

for (let d = 0; d <= 366; d++) {
	noons.push(realDay(Y2026 + d, 0, 0).noon);
}

let shortest = { length: 99 };
let longest = { length: 0 };

for (let d = 1; d < noons.length; d++) {
	const length = (noons[d] - noons[d - 1]) * 24;

	if (length < shortest.length) {
		shortest = { length, jd: noons[d] };
	}

	if (length > longest.length) {
		longest = { length, jd: noons[d] };
	}
}

console.log(
	`shortest ${hms(shortest.length, 1)} (ending ${date(shortest.jd)}), longest ${hms(longest.length, 1)} (ending ${date(longest.jd)})`
);
console.log(
	`mean of the ${noons.length - 1} days: ${hms(((noons[noons.length - 1] - noons[0]) * 24) / (noons.length - 1), 2)}`
);
console.log(
	`Ptolemy III 9: 0;59 time-degrees = ${dms(fromSexagesimal(0, 59))} = ${fromSexagesimal(0, 59).toFixed(4)} deg; one time-degree = 4 min, so ${(fromSexagesimal(0, 59) * 4).toFixed(2)} min`
);

/* ==========================================================================
   5. MODEL
   ========================================================================== */

title('Model: the two days');
const n = MeanSun.MODERN.n;
const Y = MeanSun.yearLength();
console.log(`mean Sun n = ${n.toFixed(8)} deg/day, Y = 360/n = ${Y.toFixed(5)} days`);
console.log(
	`sidereal day = 24 h x Y/(Y+1) = ${hms((24 * Y) / (Y + 1), 3)}; turns in a year Y+1 = ${(Y + 1).toFixed(5)}`
);
console.log(`ratio of the rates (Y+1)/Y = ${((Y + 1) / Y).toFixed(8)}`);

title("Model: sidereal time and longitude (page 1.2's observation of Aldebaran)");
const observation = Time.julianDayTime(2026, 1, 1, 19, 0, 0);
console.log(
	`1 Jan 2026 19:00 UT: theta_G = ${Clock.gmst(observation).toFixed(2)} deg, Rome theta = ${Clock.lst(observation, PLACES.rome[1]).toFixed(2)} deg` +
		` (page 1.2 used 38.94; apparent ${norm360(Ephem.apparentSiderealTime(observation) + PLACES.rome[1]).toFixed(2)})`
);
console.log(
	`theta in hours at Rome: ${hms(Clock.lst(observation, PLACES.rome[1]) / 15, 0)}; Aldebaran's H = ${norm180(Clock.lst(observation, PLACES.rome[1]) - Stars.ofDate(star('Aldebaran'), Y2026).ra).toFixed(2)} deg`
);

title('Model: mean time and the sidereal clock');
console.log(`rate ${Clock.RATE} = 360 + ${(Clock.RATE - 360).toFixed(11)}; n = ${n.toFixed(11)}`);
console.log(
	`theta_G at J2000.0 = ${Clock.THETA0} deg = ${hms(Clock.THETA0 / 15)}; mean Sun L0 = ${MeanSun.MODERN.L0}:` +
		` difference ${((MeanSun.MODERN.L0 - Clock.THETA0) * 3600).toFixed(1)}" = ${((MeanSun.MODERN.L0 - Clock.THETA0) * 240).toFixed(2)} s of time`
);
const example = Time.julianDayTime(2026, 4, 20, 20, 0, 0);
const dExample = example - Time.J2000;
const hExample = 15 * (20 - 12);
const alphaExample = norm360(Clock.THETA0 + (Clock.RATE - 360) * dExample);
console.log(
	`worked example (Figure 2), 20 Apr 2026 20:00 UT: d = ${dExample.toFixed(4)} = ${Math.floor(dExample)} + ${(dExample - Math.floor(dExample)).toFixed(4)};` +
		` H_m = 15 x 8 = ${hExample}; 360 d = ${Math.floor(dExample)} turns + ${norm360(360 * dExample).toFixed(4)} deg`
);
console.log(
	`  alpha_m = L0 + n d (the clock's L0 and n) = ${alphaExample.toFixed(2)}; theta_G = H_m + alpha_m = ${norm360(hExample + alphaExample).toFixed(2)};` +
		` the clock formula gives ${Clock.gmst(example).toFixed(2)}`
);
const aberration = 20.4898 / 3600;
console.log(
	`Sun's geometric L0 minus the clock's L0 = ${((MeanSun.MODERN.L0 - Clock.THETA0) * 3600).toFixed(2)}":` +
		` aberration ${(aberration * 3600).toFixed(2)}" (the Sun's motion in the 499.0 s of light-time:` +
		` ${(((n * 499.005) / 86400) * 3600).toFixed(2)}"), remainder ${((MeanSun.MODERN.L0 - aberration - Clock.THETA0) * 3600).toFixed(2)}"`
);
console.log(`light-time 499.0 s = ${(499.005 / 60).toFixed(1)} min`);
console.log(
	`linear clock minus full Meeus 12.4 in 2026: ${((Clock.gmst(Y2026) - Time.gmst(Y2026)) * 240 * 1000).toFixed(1)} ms`
);
console.log(
	`Rome: local mean time = UT + ${hms(PLACES.rome[1] / 15, 0)}; CET = UT + 1 h, so local mean noon at Rome is ${clock(Clock.fromLocalMeanTime(Y2026, 12, PLACES.rome[1]), CET)} CET`
);

title('Model: Julian Date');
console.log(
	`JD 0 = ${JSON.stringify(Time.calendarDate(0))} in the Julian calendar (4713 BC), a ${Time.weekdayName(0)}`
);
console.log(`J2000.0 = 2000 Jan 1, 12h = JD ${Time.julianDay(2000, 1, 1.5)}; 2026 Jan 1, 0h UT = JD ${Y2026}`);
console.log(
	`1582 Oct 4 (Julian) = JD ${Time.julianDay(1582, 10, 4)} -> next day 1582 Oct 15 (Gregorian) = JD ${Time.julianDay(1582, 10, 15)}`
);
const nabonassar = Time.julianDay(-746, 2, 26.5);
const equinox132 = Time.julianDay(132, 9, 25.5 + 2 / 24);
console.log(
	`Nabonassar 1, Thoth 1, noon (-746 Feb 26) = JD ${nabonassar}; Hadrian 17, Athyr 7, 14h (132 Sep 25) = JD ${equinox132.toFixed(4)}`
);
console.log(
	`difference ${(equinox132 - nabonassar).toFixed(4)} d; Ptolemy's 879 x 365 + 66 d + 2 h = ${(879 * 365 + 66 + 2 / 24).toFixed(4)} d`
);
console.log(`879 Egyptian years = ${879 * 365} days = ${((879 * 365) / 365.25).toFixed(2)} Julian years`);

title("Model: the length of the day (uniform Sun, h0 = -50')");
const DAYS = {
	'March equinox': Time.julianDay(2026, 3, 20),
	'June solstice': Time.julianDay(2026, 6, 21),
	'December solstice': Time.julianDay(2026, 12, 21)
};

Object.entries(PLACES)
	.filter(([name]) => name !== 'greenwich')
	.forEach(([name, [phi, lon]]) => {
		const line = Object.entries(DAYS).map(([label, jd0]) => `${label} ${hm(Clock.sunDay(jd0, phi, lon).hours)}`);

		console.log(`${name.padEnd(10)} (${phi}): ${line.join(', ')}`);
	});
const eps2026 = Ephem.meanObliquity(Y2026);
console.log(
	`mean obliquity 2026 = ${eps2026.toFixed(4)}; polar day somewhere in the year north of 90 - eps + h0 = ${(90 - eps2026 + Clock.SUN_HORIZON).toFixed(2)},` +
		` polar night north of 90 - eps - h0 = ${(90 - eps2026 - Clock.SUN_HORIZON).toFixed(2)}`
);
console.log(
	`at the equator: ${hm(Clock.sunDay(DAYS['March equinox'], 0, 0).hours)} at the equinox, ${hm(Clock.sunDay(DAYS['June solstice'], 0, 0).hours)} at the solstice`
);
const rhodes = Diurnal.risingHourAngle(fromSexagesimal(23, 51, 20), 36, Clock.SUN_HORIZON);
console.log(`Ptolemy's longest day at Rhodes (14h30m with h0 = 0) with h0 = -50': ${hm((2 * rhodes) / 15)}`);
let polar = { day: 0, night: 0 };

for (let d = 0; d < 365; d++) {
	const sunDay = Clock.sunDay(Y2026 + d, 69.65, 18.96);

	if (sunDay.kind === 'polar day') {
		polar.day++;
	}

	if (sunDay.kind === 'polar night') {
		polar.night++;
	}
}

console.log(`Tromso (69.65 N): ${polar.day} days without sunset, ${polar.night} without sunrise in 2026 (model)`);

/* ==========================================================================
   6. FIT
   ========================================================================== */

title('Fit: the year and the rate');
const yearPtolemy = fromSexagesimal(365, 14, 48);
const nPtolemy = fromSexagesimal(0, 59, 8, 17, 13, 12, 31);
console.log(
	`Ptolemy's year 365;14,48 = ${yearPtolemy.toFixed(5)} d, ${((yearPtolemy - Y) * 1440).toFixed(1)} min longer than ${Y.toFixed(5)}`
);
console.log(
	`his daily motion 0;59,8,17,13,12,31 = ${dms(nPtolemy, 2)} = ${nPtolemy.toFixed(6)} deg (360 / his year = ${(360 / yearPtolemy).toFixed(6)})`
);
console.log(
	`sidereal day from his year: ${hms((24 * yearPtolemy) / (yearPtolemy + 1), 3)}; modern ${hms((24 * Y) / (Y + 1), 3)}:` +
		` ${(((24 * yearPtolemy) / (yearPtolemy + 1) - (24 * Y) / (Y + 1)) * 3600 * 1000).toFixed(1)} ms`
);
console.log(`his mean Sun falls behind by ${((n - nPtolemy) * 36525).toFixed(2)} deg per century`);

title('Fit: the longitude from a timed transit of Vega');
const night = Time.julianDay(2026, 8, 15);
const vega = Stars.ofDate(star('Vega'), Time.ttFromUt(night));
const vegaTransit = Clock.transits(vega.ra, night, PLACES.rome[1])[0];
const timed = Math.round(vegaTransit * 86400) / 86400;
const lonFit = norm180(vega.ra - Clock.gmst(timed));
console.log(`Vega of date: ra ${vega.ra.toFixed(4)} deg (${hms(vega.ra / 15)}), dec ${vega.dec.toFixed(3)}`);
console.log(
	`crosses Rome's meridian on ${date(night)} at ${clock(vegaTransit)} UT, timed to the second ${clock(timed)}`
);
console.log(
	`theta_G then = ${Clock.gmst(timed).toFixed(4)} deg, so lon = ra - theta_G = ${lonFit.toFixed(4)} deg (true ${PLACES.rome[1]})`
);
console.log(
	`1 s of time = 15" of longitude = ${((((15 / 3600) * Math.PI) / 180) * 6371 * Math.cos((PLACES.rome[0] * Math.PI) / 180) * 1000).toFixed(0)} m at latitude ${PLACES.rome[0]}`
);

/* ==========================================================================
   7. TEST
   ========================================================================== */

title('Test: the stars');
let worstStar = 0;

for (let d = 0; d < 366; d++) {
	const jd = Y2026 + d;

	worstStar = Math.max(worstStar, Math.abs(norm180(Ephem.apparentSiderealTime(jd) - Clock.gmst(jd))));
}

console.log(`|apparent sidereal time - the linear clock| in 2026 <= ${(worstStar * 240).toFixed(2)} s`);

title('Test: the Sun in 2026 (model - real, minutes); scale of Figure 6');
const SCAN = [];

for (let phi = -65; phi <= 65; phi += 2.5) {
	SCAN.push(phi);
}

const LATITUDES = [...new Set([...SCAN, 31.2, 41.9, 51.5])].sort((a, b) => a - b);
const ranges = {};
let noonRange = { min: 99, max: -99 };

LATITUDES.forEach(phi => {
	ranges[phi] = { day: [0, 0], rise: [0, 0], set: [0, 0] };
});

const widen = (range, value) => {
	if (!isNaN(value)) {
		range[0] = Math.min(range[0], value);
		range[1] = Math.max(range[1], value);
	}
};

for (let d = 0; d < 365; d++) {
	const jd0 = Y2026 + d;

	LATITUDES.forEach(phi => {
		const model = Clock.sunDay(jd0, phi, 0);
		const real = realDay(jd0, phi, 0);
		const r = ranges[phi];

		if (phi === 0) {
			const dNoon = (model.noon - real.noon) * 1440;

			if (dNoon < noonRange.min) {
				noonRange = Object.assign(noonRange, { min: dNoon, minJd: jd0 });
			}

			if (dNoon > noonRange.max) {
				noonRange = Object.assign(noonRange, { max: dNoon, maxJd: jd0 });
			}
		}

		if (model.kind === 'rises') {
			widen(r.day, (model.hours - real.hours) * 60);
			widen(r.rise, (model.rise - real.rise) * 1440);
			widen(r.set, (model.set - real.set) * 1440);
		}
	});
}

console.log(
	`noon: from ${noonRange.min.toFixed(1)} (${date(noonRange.minJd)}) to +${noonRange.max.toFixed(1)} (${date(noonRange.maxJd)})`
);
[31.2, 41.9, 51.5, 60, 65, -65].forEach(phi => {
	const r = ranges[phi];
	const f = ([a, b]) => `[${a.toFixed(1)}, ${b.toFixed(1)}]`;

	console.log(`phi ${String(phi).padStart(5)}: day length ${f(r.day)}, sunrise ${f(r.rise)}, sunset ${f(r.set)}`);
});
let all = [0, 0];

SCAN.forEach(phi => {
	['day', 'rise', 'set'].forEach(key => {
		widen(all, ranges[phi][key][0]);
		widen(all, ranges[phi][key][1]);
	});
});
widen(all, noonRange.min);
widen(all, noonRange.max);
let northLong = { value: 0 };

SCAN.filter(phi => phi > 0).forEach(phi => {
	if (ranges[phi].day[1] > northLong.value) {
		northLong = { value: ranges[phi].day[1], phi };
	}
});
console.log(
	`northern hemisphere: the model's day is at most ${northLong.value.toFixed(1)} min too long (at ${northLong.phi})`
);
console.log(
	`Figure 6 (|phi| <= 65, every 2.5 deg): every error within [${all[0].toFixed(1)}, ${all[1].toFixed(1)}] min -> fixed range [-25, 25]`
);

title('Test: why the day length is wrong (5 April 2026, London)');
const april = Time.julianDay(2026, 4, 5);
const aprilNoon = april + 0.5;
const lambdaReal = Ephem.sun(Time.ttFromUt(aprilNoon)).lon;
const lambdaMean = Clock.meanLongitude(Time.ttFromUt(aprilNoon));
console.log(
	`longitude: mean ${lambdaMean.toFixed(2)}, real ${lambdaReal.toFixed(2)} (${(lambdaReal - lambdaMean).toFixed(2)} deg ahead);` +
		` declination: model ${Clock.sunDeclination(aprilNoon).toFixed(2)}, real ${sunEquatorial(aprilNoon).dec.toFixed(2)}`
);
console.log(
	`London: model day ${hms(Clock.sunDay(april, 51.5, 0).hours, 0)}, real ${hms(realDay(april, 51.5, 0).hours, 0)}`
);

/* ==========================================================================
   8. EXERCISES
   ========================================================================== */

title("Exercise 1: sidereal days in a year; the Moon's day");
console.log(
	`Y = ${Y.toFixed(5)} solar days hold ${(Y + 1).toFixed(5)} sidereal days; sidereal day ${hms((24 * Y) / (Y + 1), 3)}`
);
console.log(
	`Ptolemy: one turn = 360 / (360 + ${nPtolemy.toFixed(6)}) mean days = ${hms((24 * 360) / (360 + nPtolemy), 3)}`
);
const synodicMonth = 29.530589;
const moonDay = 1 / (1 - 1 / synodicMonth);
console.log(
	`the Moon: 1 / (1 - 1/${synodicMonth}) = ${moonDay.toFixed(6)} d = ${hms(24 * moonDay, 0)}, ${((moonDay - 1) * 1440).toFixed(1)} min later each day`
);

title("Exercise 2: Sirius at Rome on New Year's Eve 2026");
const eve = Time.julianDay(2026, 12, 31);
const sirius = Stars.ofDate(star('Sirius'), Time.ttFromUt(eve));
const gmst0 = Clock.gmst(eve);
console.log(`31 Dec 2026, 0h UT: JD ${eve}, d = ${(eve - Time.J2000).toFixed(1)}`);
const angle = norm360(sirius.ra - PLACES.rome[1] - gmst0);
console.log(`Sirius of date: ra ${sirius.ra.toFixed(4)} deg = ${hms(sirius.ra / 15)}, dec ${sirius.dec.toFixed(3)}`);
console.log(`theta_G at 0h UT on 31 Dec = ${gmst0.toFixed(4)} deg = ${hms(gmst0 / 15)}`);
console.log(
	`alpha - lon - theta_G0 = ${angle.toFixed(4)} deg; / ${Clock.RATE.toFixed(4)} deg per day = ${((angle / Clock.RATE) * 24).toFixed(5)} h`
);
Clock.transits(sirius.ra, eve, PLACES.rome[1]).forEach(t => {
	console.log(`transit ${clock(t)} UT = ${clock(t, CET)} CET = ${clock(t, PLACES.rome[1] / 15)} local mean time`);
});
console.log(
	`altitude at transit = 90 - |phi - dec| = ${Diurnal.upperCulmination(sirius.dec, PLACES.rome[0]).toFixed(1)} deg`
);
const midnight = dateOfTransitAt('Sirius', 24);
console.log(
	`Sirius crosses at local mean midnight on the night of ${date(midnight.jd0)} (${hms(midnight.hours - 24, 0)})`
);
const twice = [];

for (let d = 0; d < 365; d++) {
	const jd0 = Y2026 + d;

	if (Clock.transits(Stars.ofDate(star('Sirius'), jd0).ra, jd0, PLACES.rome[1]).length === 2) {
		twice.push(date(jd0));
	}
}

console.log(`UT days of 2026 with two transits of Sirius at Rome: ${twice.join(', ')}`);

title('Exercise 3: the earliest sunset and the latest sunrise at Rome');
let early = null;
let late = null;
let shortestDay = null;

for (let d = 300; d < 400; d++) {
	const jd0 = Y2026 + d;
	const real = realDay(jd0, PLACES.rome[0], PLACES.rome[1]);

	if (!early || real.set - jd0 < early.value) {
		early = { value: real.set - jd0, jd0, real };
	}

	if (!late || real.rise - jd0 > late.value) {
		late = { value: real.rise - jd0, jd0, real };
	}

	if (!shortestDay || real.hours < shortestDay.real.hours) {
		shortestDay = { jd0, real };
	}
}

console.log(
	`real: earliest sunset ${date(early.jd0)} ${clock(early.real.set, CET)} CET; latest sunrise ${date(late.jd0)} ${clock(late.real.rise, CET)} CET;` +
		` shortest day ${date(shortestDay.jd0)} (${hms(shortestDay.real.hours, 0)})`
);
const solstice = Clock.sunDay(DAYS['December solstice'], PLACES.rome[0], PLACES.rome[1]);
console.log(
	`model, on the solstice: sunrise ${clock(solstice.rise, CET)} CET, sunset ${clock(solstice.set, CET)} CET, day ${hms(solstice.hours, 0)}`
);
[Time.julianDay(2026, 12, 8), DAYS['December solstice'], Time.julianDay(2027, 1, 4)].forEach(jd0 => {
	const real = realDay(jd0, PLACES.rome[0], PLACES.rome[1]);

	console.log(
		`  ${date(jd0)}: real noon ${clock(real.noon, CET)} CET, sunrise ${clock(real.rise, CET)}, sunset ${clock(real.set, CET)}, day ${hms(real.hours, 0)}`
	);
});
const noonDrift =
	(realDay(Time.julianDay(2026, 12, 22), 41.9, 12.4964).noon -
		realDay(Time.julianDay(2026, 12, 21), 41.9, 12.4964).noon -
		1) *
	86400;
console.log(`real noon moves ${noonDrift.toFixed(1)} s later each day at the solstice`);

/* ==========================================================================
   9. RESIDUAL
   ========================================================================== */

title('Residual: Delta T');
[
	[2026, 'now (polynomial)'],
	[132, 'Ptolemy, AD 132'],
	[-746, 'Nabonassar, 747 BC']
].forEach(([year, label]) => {
	const deltaT = Time.deltaT(year);

	console.log(
		`${label.padEnd(20)}: Delta T = ${deltaT.toFixed(0)} s = ${hms(deltaT / 3600, 0)}, the sky turns ${((deltaT / 3600) * 15.041).toFixed(1)} deg in that time`
	);
});
console.log(
	`measured now: TT - UTC = 32.184 + 37 (leap seconds since 2017) = ${(32.184 + 37).toFixed(3)} s, and |UT1 - UTC| < 0.9 s`
);

// Why Delta T grows: the long-term parabola of time.js, Delta T = -20 + 32 u^2 s
// with u = (year - 1820) / 100, means a day that lengthens at a constant
// rate. Its excess over 86400 s is the slope, d(Delta T)/dt per day.
const excessMs = year => ((2 * 32 * ((year - 1820) / 100)) / 36525) * 1000;
const daysSince132 = (1820 - 132) * 365.25;
const meanShortfall = -excessMs(132) / 2;

console.log(
	`the day lengthens by ${(((2 * 32) / 36525) * 1000).toFixed(2)} ms a century; in AD 132 it was ${(-excessMs(132)).toFixed(1)} ms shorter than 86400 s,` +
		` in 2026 ${excessMs(2026).toFixed(1)} ms longer (parabola)`
);
console.log(
	`from 132 to 1820: ${daysSince132.toFixed(0)} days, mean shortfall ${meanShortfall.toFixed(1)} ms,` +
		` accumulated ${((daysSince132 * meanShortfall) / 1000).toFixed(0)} s = ${hms((daysSince132 * meanShortfall) / 1000 / 3600, 0)}` +
		` (parabola: ${(-20 + 32 * ((132 - 1820) / 100) ** 2).toFixed(0)} s)`
);

title('Residual: the right ascensions of stars drift');
['Vega', 'Sirius', 'Polaris'].forEach(name => {
	const then = Stars.ofDate(star(name), Time.J2000).ra;
	const now = Stars.ofDate(star(name), Y2026).ra;

	console.log(
		`${name.padEnd(8)}: ra 2000.0 -> 2026.0 changed by ${(norm180(now - then) * 240).toFixed(1)} s of time`
	);
});
