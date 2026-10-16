/* ==========================================================================
   TAB 4 - THE SUN ON AN ECCENTRIC CIRCLE (tab_sun.js)
   Needs ../shared/common.js and hipparchus_model.js.

   Hipparchus' construction (Almagest III 4): the Sun moves uniformly on a
   circle of radius 1 whose center Z is displaced from the Earth E.
   Seen from E, the equinoxes and solstices are 90° apart; seen from Z,
   the Sun covers them in unequal arcs, hence in unequal times.

   Model coordinates: E at the origin, x towards the spring equinox,
   y towards the summer solstice; Z = (Zx, Zy).

   TABLE OF CONTENTS
	 1. Solving for the eccentricity  (from two season lengths)
	 2. Forward model                 (season lengths, Sun's position)
	 3. Drawing the eccentric
	 4. Chart of the equation of center
	 5. Read-out, animation and registration
   ========================================================================== */

(() => {

/* ==========================================================================
   1. SOLVING FOR THE ECCENTRICITY
   The arc spring -> autumn (seen from Z) exceeds 180° by 2 asin(Zy);
   the arc spring -> summer exceeds 90° by asin(Zy) + asin(Zx).
   ========================================================================== */

const MEAN_MOTION = 360 / YEAR_HIPPARCHUS;      // degrees per day

const SEASON_NAMES = ['spring', 'summer', 'autumn', 'winter'];
const CARDINAL_NAMES = ['spring equinox', 'summer solstice', 'autumn equinox', 'winter solstice'];

function solveEccentric(springDays, summerDays) {
	const halfExcess = (MEAN_MOTION * (springDays + summerDays) - 180) / 2;
	const springExcess = MEAN_MOTION * springDays - 90 - halfExcess;
	const zy = sin(halfExcess);
	const zx = sin(springExcess);

	return {
		halfExcess: halfExcess,
		springExcess: springExcess,
		center: [zx, zy],
		e: Math.hypot(zx, zy),
		apogee: norm360(atan2d(zy, zx))
	};
}


/* ==========================================================================
   2. FORWARD MODEL
   ========================================================================== */

/* Point where the ray from the Earth at longitude lon meets the circle. */
function pointOnCircle(center, lon) {
	const d = [cos(lon), sin(lon)];
	const b = -(d[0] * center[0] + d[1] * center[1]);
	const c = center[0] * center[0] + center[1] * center[1] - 1;
	const t = -b + Math.sqrt(b * b - c);

	return [t * d[0], t * d[1]];
}

/* Mean longitude (seen from Z) of the Sun when its true longitude is lon. */
function meanLongitudeAt(center, lon) {
	const p = pointOnCircle(center, lon);

	return norm360(atan2d(p[1] - center[1], p[0] - center[0]));
}

/* Days spent in each of the four seasons. */
function seasonLengths(center) {
	const means = [0, 90, 180, 270].map(lon => meanLongitudeAt(center, lon));

	return means.map((mean, i) => {
		const next = means[(i + 1) % 4];

		return norm360(next - mean) / MEAN_MOTION;
	});
}

/* The Sun 'day' days after the spring equinox. */
function sunAt(center, day) {
	const mean = meanLongitudeAt(center, 0) + MEAN_MOTION * day;
	const position = [center[0] + cos(mean), center[1] + sin(mean)];
	const trueLon = norm360(atan2d(position[1], position[0]));

	return {
		mean: norm360(mean),
		trueLon: trueLon,
		equation: wrap180(trueLon - mean),
		position: position
	};
}


/* ==========================================================================
   3. DRAWING THE ECCENTRIC
   The offset of the center is drawn 'zoom' times larger than it is, so the
   arcs on the picture are exaggerated; the numbers are not.
   ========================================================================== */

const state = {
	day: 0
};

/* Season arcs, alternately strong and faint, with their lengths in days. */
function drawSeasons(plane, center, lengths) {
	const corners = [0, 90, 180, 270].map(lon => pointOnCircle(center, lon));
	const angles = corners.map(p => atan2d(p[1] - center[1], p[0] - center[0]));

	angles.forEach((a1, i) => {
		let a2 = angles[(i + 1) % 4];

		if (a2 < a1) {
			a2 += 360;
		}

		const middle = polarPoint(center, 0.72, (a1 + a2) / 2);

		plane.ctx.globalAlpha = (i % 2 === 0) ? 1 : 0.45;
		strokeArc(plane, center, 1, a1, a2, COL.sun, 5);
		plane.ctx.globalAlpha = 1;

		drawText(plane, SEASON_NAMES[i], middle, 0, -10, { weight: 600 });
		drawText(plane, `${lengths[i].toFixed(2)} d`, middle, 0, 12, { color: COL.muted, size: 14 });
	});

	// equinox and solstice directions, seen from the Earth
	const offsets = [[10, 0, 'left'], [0, -16, 'center'], [-10, 0, 'right'], [0, 18, 'center']];

	corners.forEach((corner, i) => {
		const [dx, dy, align] = offsets[i];

		strokeSegment(plane, [0, 0], corner, COL.muted, 1, [5, 5]);
		fillDot(plane, corner, 4, COL.sun);
		drawText(plane, CARDINAL_NAMES[i], corner, dx, dy, { color: COL.muted, size: 14, align: align });
	});
}

function drawEccentric(solution, lengths, zoom) {
	const plane = createPlane('cv-sun', 2.9);
	const center = scale(solution.center, zoom);
	const sun = sunAt(center, state.day);
	const apogee = polarPoint(center, 1, solution.apogee);

	clearPlane(plane);
	drawSeasons(plane, center, lengths);

	// line of apsides: Earth, center and apogee are aligned
	strokeSegment(plane, [0, 0], apogee, COL.planet, 1.5, [8, 5]);
	drawText(plane, 'apogee', apogee, 8, -10, { color: COL.planet, align: 'left' });

	// the Sun: mean direction from Z, true direction from the Earth
	strokeSegment(plane, center, sun.position, COL.muted, 1.2, [3, 4]);
	strokeSegment(plane, [0, 0], sun.position, COL.sun, 2.5);
	fillDot(plane, sun.position, 11, COL.sun);

	fillDot(plane, center, 3.5, COL.muted);
	drawText(plane, 'Z', center, 10, -10, { color: COL.muted });
	fillDot(plane, [0, 0], 7, COL.earth);
	drawText(plane, 'Earth', [0, 0], -10, 14, { align: 'right' });
}


/* ==========================================================================
   4. CHART OF THE EQUATION OF CENTER
   q = (true longitude) - (mean longitude), over one year.
   ========================================================================== */

function drawEquationChart(center, lengths) {
	const qMax = asin(Math.hypot(center[0], center[1]));
	const yMax = Math.max(1, Math.ceil(qMax + 0.3));
	const chart = createChart('cv-sunchart', {
		xMin: 0,
		xMax: YEAR_HIPPARCHUS,
		yMin: -yMax,
		yMax: yMax
	});
	const curve = [];

	drawChartAxes(chart, 30, yMax > 2 ? 1 : 0.5, x => `${x}`, y => `${y}°`, 'days after the spring equinox', 'q');

	for (let day = 0; day <= YEAR_HIPPARCHUS; day += 1) {
		curve.push([day, sunAt(center, day).equation]);
	}

	// season boundaries
	let boundary = 0;

	lengths.forEach(length => {
		boundary += length;
		plotVertical(chart, boundary, COL.sun, 1.2, [4, 4]);
	});

	plotCurve(chart, curve, COL.sun, 2.5);
	plotVertical(chart, state.day, COL.ink, 1.2);
}


/* ==========================================================================
   5. READ-OUT, ANIMATION AND REGISTRATION
   ========================================================================== */

/* "2;29 parts of 60" for a fraction of the radius. */
const partsOf60 = x => `${sexagesimal(60 * Math.abs(x))}^{p}`;

function renderReadout(springDays, summerDays, solution, lengths) {
	const sun = sunAt(solution.center, state.day);
	const arc = MEAN_MOTION * (springDays + summerDays);

	showLines('o-sun', [
		`n=\\frac{360^\\circ}{365;14,48\\ \\text{d}}=${MEAN_MOTION.toFixed(5)}^\\circ/\\text{d}`,
		`n\\,(${springDays}+${summerDays})=${sexagesimal(arc)}^\\circ`,
		`Z_y=\\sin ${sexagesimal(Math.abs(solution.halfExcess))}^\\circ=${partsOf60(solution.center[1])}`,
		`Z_x=\\sin ${sexagesimal(Math.abs(solution.springExcess))}^\\circ=${partsOf60(solution.center[0])}`,
		`e=\\sqrt{Z_x^2+Z_y^2}=${partsOf60(solution.e)}\\approx\\frac{1}{${(1 / solution.e).toFixed(1)}}`,
		`\\lambda_A=\\tan^{-1}\\frac{Z_y}{Z_x}=${sexagesimal(solution.apogee)}^\\circ`,
		`\\text{autumn}=${lengths[2].toFixed(2)}\\ \\text{d},\\ \\text{winter}=${lengths[3].toFixed(2)}\\ \\text{d}`,
		`\\text{day }${Math.floor(state.day)}:\\ \\lambda_\\odot=${dms(sun.trueLon)},\\ q=${dms(sun.equation)}`
	]);
}

function render() {
	const springDays = readNumber('sun-spring');
	const summerDays = readNumber('sun-summer');
	const zoom = readNumber('sun-zoom');
	const solution = solveEccentric(springDays, summerDays);
	const lengths = seasonLengths(solution.center);

	drawEccentric(solution, lengths, zoom);
	drawEquationChart(solution.center, lengths);
	renderReadout(springDays, summerDays, solution, lengths);
}

/* Advance the Sun by 'sun-speed' days per second. */
function step(dt) {
	state.day = (state.day + readNumber('sun-speed') * dt) % YEAR_HIPPARCHUS;
	render();
}

/* Season lengths (spring, summer): Hipparchus (Almagest III 4), the
   present day, and four equal seasons. */
const SEASON_PRESETS = {
	hipparchus: { 'sun-spring': 94.5, 'sun-summer': 92.5 },
	modern: { 'sun-spring': 92.76, 'sun-summer': 93.65 },
	equal: { 'sun-spring': 91.31, 'sun-summer': 91.31 }
};

function init() {
	createPlayer('sun', 'sun-play', step);

	wireChoices('sun-presets', choice => {
		setSliders(SEASON_PRESETS[choice]);
	});
}

registerTab('sun', { init, render });

})();
