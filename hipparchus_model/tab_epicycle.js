/* ==========================================================================
   TAB 5 - ECCENTRIC AND EPICYCLE (tab_epicycle.js)
   Needs ../shared/common.js and hipparchus_model.js.

   Card 1: Apollonius' equivalence. An eccentric circle (center Z, radius 1)
	 and a deferent (center E, radius 1) carrying an epicycle of radius e
	 whose radius stays parallel to the line of apsides give the same point.
   Card 2: the general deferent + epicycle, z = R e^{iθ} + r e^{ikθ}, with k
	 the epicycle's turns per deferent turn against the fixed stars.

   Coordinates: Earth at the origin, apogee towards +y.

   TABLE OF CONTENTS
	 1. Equivalence: geometry
	 2. Equivalence: drawing
	 3. Loops: geometry
	 4. Loops: drawing
	 5. Read-outs, animation and registration
   ========================================================================== */

(() => {

/* ==========================================================================
   1. EQUIVALENCE: GEOMETRY
   ========================================================================== */

const APOGEE = 90;                 // direction of the line of apsides (deg)

const state = {
	theta: 30,                     // mean longitude of the body (deg)
	mode: 'both'                   // 'eccentric', 'epicycle' or 'both'
};

/* The two constructions for a mean longitude theta and eccentricity e. */
function constructions(theta, e) {
	const apsis = [cos(APOGEE), sin(APOGEE)];
	const center = scale(apsis, e);                      // eccentre center Z
	const onDeferent = [cos(theta), sin(theta)];         // epicycle center C

	return {
		center: center,
		epicycleCenter: onDeferent,
		eccentricPoint: [center[0] + cos(theta), center[1] + sin(theta)],
		epicyclePoint: [onDeferent[0] + e * apsis[0], onDeferent[1] + e * apsis[1]]
	};
}


/* ==========================================================================
   2. EQUIVALENCE: DRAWING
   ========================================================================== */

function drawEccentricConstruction(plane, c) {
	strokeCircle(plane, c.center, 1, COL.sun, 2.5);
	strokeSegment(plane, c.center, c.eccentricPoint, COL.sun, 1.5);
	fillDot(plane, c.center, 4, COL.sun);
	drawText(plane, 'Z', c.center, 12, -4, { color: COL.sun, align: 'left' });
}

function drawEpicycleConstruction(plane, c, e) {
	strokeCircle(plane, [0, 0], 1, COL.deferent, 2.5);
	strokeCircle(plane, c.epicycleCenter, e, COL.epicycle, 2);
	strokeSegment(plane, [0, 0], c.epicycleCenter, COL.deferent, 1.5);
	drawArrow2D(plane, c.epicycleCenter, c.epicyclePoint, COL.epicycle, 2);
	fillDot(plane, c.epicycleCenter, 4, COL.epicycle);
	drawText(plane, 'C', c.epicycleCenter, 12, 6, { color: COL.epicycle, align: 'left' });
}

/* The parallelogram E-Z-P-C behind the proof. */
function drawParallelogram(plane, c) {
	const corners = [[0, 0], c.center, c.eccentricPoint, c.epicycleCenter, [0, 0]];

	strokePolyline(plane, corners, COL.muted, 1, [4, 4]);
}

function drawEquivalence(e) {
	const plane = createPlane('cv-equiv', 2 * (1 + e) + 0.5);
	const c = constructions(state.theta, e);
	const showEccentric = state.mode !== 'epicycle';
	const showEpicycle = state.mode !== 'eccentric';

	clearPlane(plane);

	// line of apsides
	strokeSegment(plane, [0, -1.15], [0, 1.15 + e], COL.muted, 1, [6, 5]);
	drawText(plane, 'apogee', [0, 1 + e], 8, -14, { color: COL.muted, align: 'left' });

	if (showEccentric) {
		drawEccentricConstruction(plane, c);
	}

	if (showEpicycle) {
		drawEpicycleConstruction(plane, c, e);
	}

	if (showEccentric && showEpicycle) {
		drawParallelogram(plane, c);
	}

	// the body, and the line of sight from the Earth
	strokeSegment(plane, [0, 0], c.eccentricPoint, COL.ink, 1.2);
	fillDot(plane, c.eccentricPoint, 9, COL.sun);
	fillDot(plane, [0, 0], 7, COL.earth);
	drawText(plane, 'E', [0, 0], -12, 4, { align: 'right' });

	return c;
}


/* ==========================================================================
   3. LOOPS: GEOMETRY
   ========================================================================== */

const loopState = {
	theta: 0
};

/* Position on the general deferent-epicycle model. */
function loopPoint(R, r, k, theta) {
	return [R * cos(theta) + r * cos(k * theta), R * sin(theta) + r * sin(k * theta)];
}

/* True when the apparent motion (seen from the Earth) is backwards:
   the angular momentum x vy - y vx of the path is negative. */
function isBackward(R, r, k, theta) {
	const p = loopPoint(R, r, k, theta);
	const vx = -R * sin(theta) - k * r * sin(k * theta);
	const vy = R * cos(theta) + k * r * cos(k * theta);

	return p[0] * vy - p[1] * vx < 0;
}

/* The path over one deferent turn, split into forward and backward runs. */
function loopRuns(R, r, k) {
	const runs = [];
	let previous = null;

	for (let theta = 0; theta <= 360; theta += 0.5) {
		const point = loopPoint(R, r, k, theta);
		const backward = isBackward(R, r, k, theta);
		const last = runs[runs.length - 1];

		if (!last || last.backward !== backward) {
			runs.push({ backward: backward, points: previous ? [previous] : [] });
		}

		runs[runs.length - 1].points.push(point);
		previous = point;
	}

	return runs;
}


/* ==========================================================================
   4. LOOPS: DRAWING
   ========================================================================== */

function drawLoops(r, k) {
	const R = 1;
	const plane = createPlane('cv-loops', 2 * (R + r) + 0.4);
	const center = loopPoint(R, 0, k, loopState.theta);
	const planet = loopPoint(R, r, k, loopState.theta);

	clearPlane(plane);

	loopRuns(R, r, k).forEach(run => {
		const color = run.backward ? COL.planet : COL.muted;
		const width = run.backward ? 3 : 1.5;

		strokePolyline(plane, run.points, color, width);
	});

	strokeCircle(plane, [0, 0], R, COL.deferent, 2);
	strokeCircle(plane, center, r, COL.epicycle, 2);
	strokeSegment(plane, [0, 0], center, COL.deferent, 1.2, [4, 4]);
	strokeSegment(plane, center, planet, COL.epicycle, 1.5);

	fillDot(plane, center, 3.5, COL.epicycle);
	fillDot(plane, planet, 7, COL.planet);
	fillDot(plane, [0, 0], 7, COL.earth);
}


/* ==========================================================================
   5. READ-OUTS, ANIMATION AND REGISTRATION
   ========================================================================== */

function renderEquivalenceReadout(c, e) {
	const p = c.eccentricPoint;
	const q = c.epicyclePoint;
	const gap = Math.hypot(p[0] - q[0], p[1] - q[1]);

	showLines('o-equiv', [
		`\\bar\\lambda=${dms(norm360(state.theta))}`,
		`\\mathbf P_{\\text{ecc}}=\\mathbf Z+(\\cos\\bar\\lambda,\\sin\\bar\\lambda)=(${fmt3(p[0])},\\ ${fmt3(p[1])})`,
		`\\mathbf P_{\\text{epi}}=(\\cos\\bar\\lambda,\\sin\\bar\\lambda)+\\mathbf Z=(${fmt3(q[0])},\\ ${fmt3(q[1])})`,
		`|\\mathbf P_{\\text{ecc}}-\\mathbf P_{\\text{epi}}|=${gap.toFixed(3)}`,
		`\\text{max equation}=\\sin^{-1}e=${dms(asin(e))}`
	]);
}

function renderLoopReadout(r, k) {
	const product = r * k;
	const verdict = product > 1 ? '\\text{retrograde loops}' : '\\text{no retrograde motion}';
	const loops = product > 1 ? `,\\ ${k - 1}\\text{ per deferent turn}` : '';

	showLines('o-loops', [
		`\\frac{r}{R}=${r.toFixed(2)},\\quad k=\\frac{\\omega_e}{\\omega_d}=${k}`,
		`\\left.\\frac{d\\lambda}{dt}\\right|_{\\text{perigee}}\\propto R\\,\\omega_d-r\\,\\omega_e`,
		`k\\,\\frac{r}{R}=${product.toFixed(2)}\\ ${product > 1 ? '>' : '\\le'}\\ 1\\Rightarrow${verdict}${loops}`
	]);
}

function render() {
	const e = readNumber('eq-e');
	const r = readNumber('lp-r');
	const k = readNumber('lp-k');
	const c = drawEquivalence(e);

	renderEquivalenceReadout(c, e);
	drawLoops(r, k);
	renderLoopReadout(r, k);
}

/* Both cards share one play button: degrees of deferent per second. */
function step(dt) {
	const rate = readNumber('eq-speed');

	state.theta = norm360(state.theta + rate * dt);
	loopState.theta = norm360(loopState.theta + rate * dt / 4);
	render();
}

function init() {
	createPlayer('epicycle', 'eq-play', step);

	wireChoices('eq-mode', choice => {
		state.mode = choice;
		render();
	});
}

registerTab('epicycle', { init, render });

})();
