/* ==========================================================================
   TAB 6 - THE MOON: THE FIRST ANOMALY (tab_moon.js)
   Needs ../shared/common.js and hipparchus_model.js.

   Hipparchus' simple lunar model (Almagest IV 5-11): the epicycle center
   moves uniformly in longitude on a deferent of radius 60 centered on the
   Earth; the Moon moves uniformly on the epicycle, in advance (westward)
   at the apogee, at the rate of the anomaly.

   Coordinates: Earth at the origin, x towards longitude 0, deferent radius 1.

   TABLE OF CONTENTS
	 1. Parameters and model
	 2. Drawing the model
	 3. Chart of the equation over two months
	 4. Read-out, animation and registration
   ========================================================================== */

(() => {

/* ==========================================================================
   1. PARAMETERS AND MODEL
   ========================================================================== */

const DEFERENT = 60;                                   // parts

/* Daily mean motions (Almagest IV 3), degrees per day. */
const MOTION_LONGITUDE = 13 + 10 / 60 + 35 / 3600;    // 13;10,35
const MOTION_ANOMALY = 13 + 3 / 60 + 54 / 3600;       // 13;3,54
const MOTION_SUN = 360 / YEAR_HIPPARCHUS;

/* Epicycle radii in parts of 60 (Almagest IV 11 and IV 6). */
const RADII = [
	{ label: 'Hipparchus, epicycle', r: 4 + 46 / 60, color: COL.epicycle, dash: [] },
	{ label: 'Hipparchus, eccentre', r: 6 + 15 / 60, color: COL.deferent, dash: [] },
	{ label: 'Ptolemy', r: 5 + 15 / 60, color: COL.muted, dash: [6, 4] }
];

const CHART_DAYS = 60;

const state = {
	day: 0                     // days since the Moon was at the epicycle's apogee
};

/* Mean longitude and anomaly; the Sun starts opposite the Moon. */
function moonAt(r, day) {
	const meanLon = norm360(MOTION_LONGITUDE * day);
	const anomaly = norm360(MOTION_ANOMALY * day);
	const equation = atan2d(-r * sin(anomaly), DEFERENT + r * cos(anomaly));

	return {
		meanLon: meanLon,
		anomaly: anomaly,
		equation: equation,
		trueLon: norm360(meanLon + equation),
		sunLon: norm360(180 + MOTION_SUN * day)
	};
}


/* ==========================================================================
   2. DRAWING THE MODEL
   ========================================================================== */

function drawModel(r, zoom) {
	const plane = createPlane('cv-moon', 2.8);
	const moon = moonAt(r, state.day);
	const rho = zoom * r / DEFERENT;                  // drawn epicycle radius
	const center = polarPoint([0, 0], 1, moon.meanLon);
	const position = polarPoint(center, rho, moon.meanLon - moon.anomaly);
	const apogee = polarPoint(center, rho, moon.meanLon);
	const sunEdge = polarPoint([0, 0], 1.32, moon.sunLon);

	clearPlane(plane);

	// deferent and epicycle
	strokeCircle(plane, [0, 0], 1, COL.deferent, 2.5);
	strokeCircle(plane, center, rho, COL.epicycle, 2.5);
	strokeSegment(plane, center, apogee, COL.epicycle, 1.2, [4, 4]);
	drawText(plane, 'apogee', apogee, 0, -14, { color: COL.epicycle, size: 14 });

	// mean direction (to the epicycle center) and true direction (to the Moon)
	strokeSegment(plane, [0, 0], polarPoint([0, 0], 1.25, moon.meanLon), COL.muted, 1.2, [6, 5]);
	strokeSegment(plane, [0, 0], polarPoint([0, 0], 1.25, moon.trueLon), COL.planet, 2);
	strokeSegment(plane, center, position, COL.epicycle, 1.5);

	// the Sun's direction, for oppositions (full Moons)
	strokeSegment(plane, [0, 0], sunEdge, COL.sun, 1.5, [2, 4]);
	fillDot(plane, sunEdge, 9, COL.sun);

	fillDot(plane, center, 3.5, COL.epicycle);
	fillDot(plane, position, 8, COL.planet);
	fillDot(plane, [0, 0], 8, COL.earth);
	drawText(plane, 'Earth', [0, 0], 0, 22, { size: 14 });
	drawText(plane, 'Moon', position, 12, -12, { color: COL.planet, align: 'left', size: 14 });
	drawText(plane, 'Sun', sunEdge, 0, -18, { color: COL.sun, size: 14 });

	return moon;
}


/* ==========================================================================
   3. CHART OF THE EQUATION OVER TWO MONTHS
   ========================================================================== */

/* Equation of anomaly over CHART_DAYS days, for an epicycle radius r. */
function equationCurve(r) {
	const points = [];

	for (let day = 0; day <= CHART_DAYS; day += 0.25) {
		points.push([day, moonAt(r, day).equation]);
	}

	return points;
}

function drawChart(r) {
	const chart = createChart('cv-moonchart', {
		xMin: 0,
		xMax: CHART_DAYS,
		yMin: -7,
		yMax: 7
	});

	drawChartAxes(chart, 5, 1, x => `${x}`, y => `${y}°`, 'days after the Moon was at the apogee of its epicycle', 'q');

	RADII.forEach(preset => {
		plotCurve(chart, equationCurve(preset.r), preset.color, 1.6, preset.dash);
	});

	plotCurve(chart, equationCurve(r), COL.planet, 2.8);
	plotVertical(chart, state.day % CHART_DAYS, COL.ink, 1.2);
}


/* ==========================================================================
   4. READ-OUT, ANIMATION AND REGISTRATION
   ========================================================================== */

/* "near opposition" when the true Moon is within 6° of the anti-Sun. */
function syzygyNote(moon) {
	const fromOpposition = Math.abs(wrap180(moon.trueLon - moon.sunLon - 180));

	if (fromOpposition < 6) {
		return '\\text{full Moon: if near a node, a lunar eclipse}';
	}

	return `\\text{distance from opposition}=${fromOpposition.toFixed(0)}^\\circ`;
}

function renderReadout(r, moon) {
	const month = 360 / MOTION_ANOMALY;

	showLines('o-moon', [
		`r=${sexagesimal(r)}^{p}\\ \\text{(deferent }60^{p})`,
		`\\text{anomalistic month}=\\frac{360^\\circ}{13;3,54^\\circ/\\text{d}}=${month.toFixed(4)}\\ \\text{d}`,
		`\\text{day }${state.day.toFixed(1)}:\\ \\alpha=${dms(moon.anomaly)}`,
		`q=\\tan^{-1}\\frac{-r\\sin\\alpha}{60+r\\cos\\alpha}=${dms(moon.equation)}`,
		`q_{\\max}=\\sin^{-1}\\frac{r}{60}=${dms(asin(r / DEFERENT))}`,
		syzygyNote(moon)
	]);
}

/* Show the epicycle slider in sexagesimal parts. */
function showRadiusOutput(r) {
	byId('moon-r').parentElement.querySelector('output').textContent = `${sexagesimal(r)}ᵖ`;
}

function render() {
	const r = readNumber('moon-r');
	const zoom = readNumber('moon-zoom');
	const moon = drawModel(r, zoom);

	showRadiusOutput(r);
	drawChart(r);
	renderReadout(r, moon);
}

function step(dt) {
	state.day += readNumber('moon-speed') * dt;
	render();
}

function init() {
	createPlayer('moon', 'moon-play', step);
}

registerTab('moon', { init, render });

})();
