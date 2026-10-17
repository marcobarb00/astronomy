/* ==========================================================================
   TAB 3 - THE DISCOVERY OF PRECESSION (tab_precession.js)
   Needs ../shared/common.js and hipparchus_model.js.

   The world basis is the ecliptic, which precession leaves fixed: x towards
   the vernal equinox of J2000, z towards the north ecliptic pole. The
   equator turns slowly about the ecliptic pole, so the equinoxes slide
   backwards along the ecliptic and every star's longitude grows.

   TABLE OF CONTENTS
	 1. Data          (stars, epochs, ancient observations)
	 2. Geometry      (equinox, celestial pole and equator of a year)
	 3. The sphere
	 4. The chart     (ancient measurements against the modern rate)
	 5. Read-outs, animation and registration
   ========================================================================== */

(() => {

/* ==========================================================================
   1. DATA
   ========================================================================== */

const SPICA = { name: 'Spica', ra: [13, 25.2], dec: -11.16 };
const REGULUS = { name: 'Regulus', ra: [10, 8.4], dec: 11.97 };

const POLE_STARS = [
	{ name: 'Polaris', ra: [2, 31.8], dec: 89.26 },
	{ name: 'Thuban', ra: [14, 4.4], dec: 64.38 },
	{ name: 'Vega', ra: [18, 36.9], dec: 38.78 }
];

/* J2000 ecliptic coordinates, computed once. */
const SPICA_J2000 = starEcliptic(SPICA);
const REGULUS_J2000 = starEcliptic(REGULUS);
const POLE_STARS_J2000 = POLE_STARS.map(star => ({ name: star.name, ...starEcliptic(star) }));

/* Epochs marked on the ecliptic (astronomical years). */
const EPOCHS = [
	{ year: -293, label: 'Timocharis' },
	{ year: -129, label: 'Hipparchus' },
	{ year: 139, label: 'Ptolemy' },
	{ year: 2025, label: 'today' }
];

/* Fixed ancient observations for the chart (Almagest VII 2):
   Regulus 29;50° behind the summer solstice for Hipparchus,
   at Leo 2;30° for Ptolemy. */
const REGULUS_OBSERVATIONS = [
	{ year: -127, lon: 90 + 29 + 50 / 60, label: 'Hipparchus (Regulus)', dx: -8, dy: -14 },
	{ year: 139, lon: 122.5, label: 'Ptolemy (Regulus)', dx: 8, dy: 16 }
];

const YEAR_TIMOCHARIS = -293;
const YEAR_HIPPARCHUS = -129;


/* ==========================================================================
   2. GEOMETRY
   ========================================================================== */

/* Fixed-frame longitude of the vernal equinox of a year. */
const equinoxLongitude = year => -PRECESSION_MODERN * (year - 2000);

/* The north celestial pole lies 90° ahead of the equinox, EPS from the
   ecliptic pole. */
function celestialPole(year) {
	return fromLonLat(equinoxLongitude(year) + 90, 90 - EPS);
}

/* Angular distance (deg) between two unit vectors. */
const separation = (a, b) => acos(dot3(a, b));


/* ==========================================================================
   3. THE SPHERE
   ========================================================================== */

const ECLIPTIC_POLE = [0, 0, 1];

/* Small ticks across the ecliptic where the equinox stood at each epoch. */
function drawEpochTicks(stage) {
	EPOCHS.forEach(epoch => {
		const lon = equinoxLongitude(epoch.year);
		const inner = scale(fromLonLat(lon, 0), 0.94);
		const outer = scale(fromLonLat(lon, 0), 1.06);

		strokePath(stage, [inner, outer], COL.muted, 2);
	});
}

/* Spica, and the arc from it forward to the autumnal equinox. */
function drawSpica(stage, year) {
	const spica = fromLonLat(SPICA_J2000.lon, SPICA_J2000.lat);
	const autumn = equinoxLongitude(year) + 180;
	const foot = fromLonLat(SPICA_J2000.lon, 0);
	const ahead = wrap180(autumn - SPICA_J2000.lon);
	const arc = sampleArc(foot, fromLonLat(SPICA_J2000.lon + 90, 0), ahead, 1, 60);

	strokePath(stage, arc, COL.planet, 4);
	drawPoint(stage, spica, COL.planet, 6);
	drawLabel(stage, 'Spica', spica, COL.planet, 10, -12);
}

function drawScene(year) {
	const stage = createStage('cv-pre');
	const pole = celestialPole(year);
	const vernal = fromLonLat(equinoxLongitude(year), 0);
	const autumnal = negate(vernal);

	beginScene(stage);

	// fixed: the ecliptic and its pole
	strokePath(stage, greatCircle(ECLIPTIC_POLE), COL.sun, 2.5);
	strokePath(stage, [ORIGIN, scale(ECLIPTIC_POLE, POLE_LENGTH)], COL.sun, 1.5);
	drawLabel(stage, 'Q', scale(ECLIPTIC_POLE, POLE_LENGTH), COL.sun);
	drawEpochTicks(stage);

	// moving: the celestial pole on its circle, and the equator of the year
	strokePath(stage, smallCircle(ECLIPTIC_POLE, EPS), COL.earth, 1.2, [6, 5]);
	strokePath(stage, greatCircle(pole), COL.earth, 2.5);
	strokePath(stage, [ORIGIN, scale(pole, POLE_LENGTH)], COL.earth, 1.5);
	drawLabel(stage, 'P', scale(pole, POLE_LENGTH), COL.earth);

	// stars near the pole's circle
	POLE_STARS_J2000.forEach(star => {
		const position = fromLonLat(star.lon, star.lat);

		drawPoint(stage, position, COL.ink, 3.5);
		drawLabel(stage, star.name, position, COL.muted, 6, -6);
	});

	drawSpica(stage, year);

	// the two equinoxes of the year
	drawPoint(stage, vernal, COL.ink, 5);
	drawLabel(stage, '♈︎ V', vernal, COL.ink, 8, 18);
	drawPoint(stage, autumnal, COL.ink, 5);
	drawLabel(stage, '♎︎', autumnal, COL.ink, 8, 18);
}


/* ==========================================================================
   4. THE CHART
   y = (longitude in that year) - (longitude in J2000), the same for every
   star. Ancient positions become points; a rate becomes a straight line.
   ========================================================================== */

const CHART_YEARS = [-350, 250];

/* Shift of longitude from J2000 to a year, for a given rate (deg/year). */
const shiftAt = (year, rate) => rate * (year - 2000);

/* Line with a given rate passing through (year0, shift0). */
function rateLine(rate, year0, shift0) {
	return CHART_YEARS.map(year => [year, shift0 + rate * (year - year0)]);
}

/* Shifts measured from Spica's distance ahead of the autumnal equinox. */
function spicaShift(degreesAhead) {
	return (180 - degreesAhead) - SPICA_J2000.lon;
}

function drawChart(readings) {
	const chart = createChart('cv-prechart', {
		xMin: CHART_YEARS[0],
		xMax: CHART_YEARS[1],
		yMin: -34,
		yMax: -24
	});
	const hipparchusShift = spicaShift(readings.hipparchus);

	drawChartAxes(chart, 100, 2, x => `${x}`, y => `${y}°`, 'astronomical year (0 = 1 BCE, −300 = 301 BCE)', 'λ − λ(2000)');

	// modern precession, Ptolemy's 1° per century, and the slope from the two readings
	plotCurve(chart, CHART_YEARS.map(year => [year, shiftAt(year, PRECESSION_MODERN)]), COL.earth, 2.5);
	plotCurve(chart, rateLine(1 / 100, YEAR_HIPPARCHUS, hipparchusShift), COL.epicycle, 2, [7, 5]);
	plotCurve(chart, rateLine(readings.rate, YEAR_HIPPARCHUS, hipparchusShift), COL.planet, 2);

	// the observations
	plotPoint(chart, YEAR_TIMOCHARIS, spicaShift(readings.timocharis), COL.planet, 'Timocharis (Spica)');
	plotPoint(chart, YEAR_HIPPARCHUS, hipparchusShift, COL.planet, 'Hipparchus (Spica)', 8, 16);

	REGULUS_OBSERVATIONS.forEach(observation => {
		const shift = observation.lon - REGULUS_J2000.lon;

		plotPoint(chart, observation.year, shift, COL.sun, observation.label, observation.dx, observation.dy);
	});
}


/* ==========================================================================
   5. READ-OUTS, ANIMATION AND REGISTRATION
   ========================================================================== */

/* Rate implied by the two Spica distances (deg per year). */
function readReadings() {
	const timocharis = readNumber('pre-timo');
	const hipparchus = readNumber('pre-hipp');
	const rate = (timocharis - hipparchus) / (YEAR_HIPPARCHUS - YEAR_TIMOCHARIS);

	return { timocharis, hipparchus, rate };
}

function renderSphereReadout(year) {
	const pole = celestialPole(year);
	const spicaLon = longitudeAtEpoch(SPICA_J2000.lon, year);
	const ahead = wrap180(180 - spicaLon);
	const polarisVector = fromLonLat(POLE_STARS_J2000[0].lon, POLE_STARS_J2000[0].lat);
	const shift = PRECESSION_MODERN * (year - YEAR_HIPPARCHUS);

	showLines('o-pre', [
		`\\text{${formatYear(year)}}`,
		`\\lambda_{\\text{Spica}}=${dms(spicaLon)}`,
		`\\text{Spica is }${dms(ahead)}\\text{ ahead of the autumnal equinox}`,
		`\\text{equinox shift since Hipparchus}=${shift.toFixed(1)}^\\circ`,
		`\\text{Polaris to the pole}=${dms(separation(pole, polarisVector))}`
	]);
}

function renderChartReadout(readings) {
	const perCentury = 100 * readings.rate;
	const arcsecondsPerYear = 3600 * readings.rate;
	const interval = YEAR_HIPPARCHUS - YEAR_TIMOCHARIS;

	showLines('o-prechart', [
		`p=\\frac{${readings.timocharis.toFixed(1)}^\\circ-${readings.hipparchus.toFixed(1)}^\\circ}{${interval}\\ \\text{yr}}=${perCentury.toFixed(2)}^\\circ/\\text{century}`,
		`p=${arcsecondsPerYear.toFixed(1)}''/\\text{yr}\\quad(\\text{modern }50.3''/\\text{yr})`,
		`\\text{one full turn}=\\frac{360^\\circ}{p}\\approx${Math.round(360 / readings.rate)}\\ \\text{yr}`
	]);
}

function render() {
	const year = readNumber('pre-year');
	const readings = readReadings();

	showYearOutput(year);
	drawScene(year);
	renderSphereReadout(year);
	drawChart(readings);
	renderChartReadout(readings);
}

/* The slider moves in whole years, so the animation keeps its own
   fractional year and only resyncs when the user moves the slider. */
let animatedYear = null;

/* Advance the year slider; wrap round at the end of its range. */
function step(dt) {
	const slider = byId('pre-year');
	const span = Number(slider.max) - Number(slider.min);

	if (animatedYear === null || Math.abs(animatedYear - Number(slider.value)) > 1) {
		animatedYear = Number(slider.value);
	}

	animatedYear += readNumber('pre-speed') * dt;

	if (animatedYear > Number(slider.max)) {
		animatedYear -= span;
	}

	slider.value = animatedYear;
	slider.dispatchEvent(new Event('input'));
}

/* Show the year slider's value as "129 BCE" rather than "-128°". */
function showYearOutput(year) {
	byId('pre-year').parentElement.querySelector('output').textContent = formatYear(year);
}

function init() {
	createPlayer('precession', 'pre-play', step);
}

registerTab('precession', { init, render });

})();
