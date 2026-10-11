/* ==========================================================================
   CHAPTER 2 - SPHERICAL ASTRONOMY (chapter2.js)
   Needs ../shared/common.js to be loaded first.

   TABLE OF CONTENTS
	 0. Chapter constants and small helpers
	 6. Coordinate frames     (celestial, ecliptic, horizontal)
	 7. Shared scene pieces   (frame scene, object marker)
	 8. Tab renderers         (one block per tab)
	 9. UI wiring
   ========================================================================== */


/* ==========================================================================
   0. CHAPTER CONSTANTS AND SMALL HELPERS
   ========================================================================== */

const TROPICAL_YEAR = 365.2422;  // days
const MAX_LATITUDE = 89.999;     // keeps tan(L) finite near the poles

const clampLatitude = L => clamp(L, -MAX_LATITUDE, MAX_LATITUDE);

/* Declination of a point on the ecliptic with longitude lam (Eq. 2.15). */
const solarDeclination = lam => asin(sinEps * sin(lam));


/* ==========================================================================
   6. COORDINATE FRAMES
   A frame is three orthonormal axes [e1, e2, e3] written in (v, u, p).
   e3 is the pole and e1 the zero of longitude.
   ========================================================================== */

const AXIS_V = [1, 0, 0];
const AXIS_U = [0, 1, 0];
const AXIS_P = [0, 0, 1];

const FRAMES = {
	celestial: {
		kind: 'celestial',
		axes: [AXIS_V, AXIS_U, AXIS_P],
		names: ['v', 'u', 'p'],
		color: COL.earth,
		origin: 'V'
	},
	ecliptic: {
		kind: 'ecliptic',
		axes: [AXIS_V, [0, cosEps, sinEps], [0, -sinEps, cosEps]],   // Eqs 2.4, 2.5
		names: ['v', 's', 'q'],
		color: COL.sun,
		origin: 'V'
	}
};

/* Horizontal frame for latitude L and meridian right ascension a0 (Eqs 2.21-2.23). */
function horizontalFrame(L, a0) {
	const north = [-sin(L) * cos(a0), -sin(L) * sin(a0), cos(L)];
	const east = [-sin(a0), cos(a0), 0];
	const zenith = [cos(L) * cos(a0), cos(L) * sin(a0), sin(L)];

	return {
		kind: 'horizontal',
		axes: [north, east, zenith],
		names: ['n', 'e', 'z'],
		color: COL.deferent,
		origin: 'N'
	};
}

/* Per-frame decoration: names of the two angles and the labelled points
   [longitude, latitude, text] drawn on the sphere. */
const FRAME_INFO = {
	celestial: {
		angleNames: ['α', 'δ'],
		cardinals: [
			[0,   0,   '0h'],
			[90,  0,   '6h'],
			[180, 0,   '12h'],
			[270, 0,   '18h'],
			[0,   90,  'North (P)'],
			[0,   270, 'South (P′)']
		]
	},
	ecliptic: {
		angleNames: ['λ', 'β'],
		cardinals: [
			[0,   0,   '0°'],
			[90,  0,   '90° summer solstice'],
			[180, 0,   '180°'],
			[270, 0,   '270° winter solstice'],
			[0,   90,  'Q'],
			[0,   270, 'Q′']
		]
	},
	horizontal: {
		angleNames: ['A', 'a'],
		cardinals: [
			[90,  0,   'E'],
			[180, 0,   'S'],
			[270, 0,   'W'],
			[0,   90,  'Zenith'],
			[0,   270, 'Nadir']
		]
	}
};


/* ==========================================================================
   7. SHARED SCENE PIECES
   ========================================================================== */

/* Labelled dots on the fundamental circle (compass points, hours, poles...). */
function drawCardinalPoints(stage, frame, cardinals) {
	cardinals.forEach(([lon, lat, text]) => {
		const point = vec(frame, lon, lat);

		drawPoint(stage, point, COL.muted, 3);
		drawLabel(stage, text, point, COL.muted, 5, 15);
	});
}

/* The three unit vectors of a frame, plus its origin point. */
function drawFrameAxes(stage, frame) {
	frame.names.forEach((name, i) => {
		const tip = scale(frame.axes[i], 0.5);

		drawAxis(stage, tip, name, COL.ink, { width: 1.8 });
	});

	drawPoint(stage, frame.axes[0], COL.ink, 4);
	drawLabel(stage, frame.origin, frame.axes[0], COL.ink, -16, 14);
}

/* Object R, its projection R' on the fundamental plane, the drop line and
   the two coordinate arcs (longitude in the plane, latitude above it). */
function drawObjectWithAngles(stage, frame, angleNames, lon, lat) {
	const [e1, e2, pole] = frame.axes;
	const r = vec(frame, lon, lat);
	const direction = lin3(frame, cos(lon), sin(lon), 0);   // unit direction of R'
	const projection = scale(direction, cos(lat));          // R' = R - (R.e3) e3

	// longitude arc (in the plane) and latitude arc (in the vertical plane through R)
	strokePath(stage, sampleArc(e1, e2, lon, 0.30), frame.color, 3);
	strokePath(stage, sampleArc(direction, pole, lat, 0.20), COL.planet, 3);
	labelArc(stage, angleNames[0], e1, e2, lon, 0.5, frame.color, -4, 4);
	labelArc(stage, angleNames[1], direction, pole, lat, 0.75, COL.planet, 2, 4);

	// dashed drop line R -> R' (parallel to the pole axis)
	strokePath(stage, [r, projection], COL.planet, 1.8, [5, 4]);

	drawAxis(stage, projection, 'R′', COL.epicycle, {
		width: 2.4,
		labelColor: COL.epicycle,
		dy: 14
	});
	drawMarkedVector(stage, r, 'R', COL.planet, 2.4);
}

/* Main scene for tabs 2-4: shaded fundamental plane, context circles,
   axes, labelled points and the object with its angles. */
function drawFrameScene(canvasId, frame, contextFrames, lon, lat) {
	const stage = createStage(canvasId);
	const info = FRAME_INFO[frame.kind];
	const poleAxis = [
		lin3(frame, 0, 0, -POLE_LENGTH),
		lin3(frame, 0, 0, POLE_LENGTH)
	];

	beginScene(stage);

	fillPath(stage, ringPoints(frame), frame.color, 0.1);

	contextFrames.forEach(context => {
		strokePath(stage, ringPoints(context), context.color, 1.5);
	});

	strokePath(stage, ringPoints(frame), frame.color, 3);
	strokePath(stage, poleAxis, COL.muted, 1);

	drawCardinalPoints(stage, frame, info.cardinals);
	drawFrameAxes(stage, frame);
	drawObjectWithAngles(stage, frame, info.angleNames, lon, lat);
}

/* Rotation about the celestial axis p by 'angle' degrees (diurnal motion). */
function rotateAboutPole(point, angle) {
	return [
		point[0] * cos(angle) - point[1] * sin(angle),
		point[0] * sin(angle) + point[1] * cos(angle),
		point[2]
	];
}


/* ==========================================================================
   8. TAB RENDERERS
   ========================================================================== */

/* ---------- Tab 1: sphere and the two motions ---------- */

/* Fixed pseudo-random "stars" (simple LCG so the sky is the same every load). */
function generateStars(count, seed) {
	let state = seed;

	const random = () => {
		state = (state * 16807) % 2147483647;

		return state / 2147483647;
	};

	return Array.from({ length: count }, () => {
		const z = 2 * random() - 1;
		const longitude = 360 * random();
		const ringRadius = Math.sqrt(1 - z * z);

		return [ringRadius * cos(longitude), ringRadius * sin(longitude), z];
	});
}

const STARS = generateStars(45, 7);

/* Arcs showing epsilon: between the equator and ecliptic (u -> s) and
   between the two poles (p -> q). */
function drawObliquityArcs(stage, rotate) {
	const negU = negate(AXIS_U);
	const arcEquatorToEcliptic = sampleArc(AXIS_U, AXIS_P, EPS, 1, 24).map(rotate);
	const arcPoleToPole = sampleArc(AXIS_P, negU, EPS, 1, 24).map(rotate);

	strokePath(stage, arcEquatorToEcliptic, COL.planet, 2);
	strokePath(stage, arcPoleToPole, COL.planet, 2);

	const labelA = rotate(arcPoint(AXIS_U, AXIS_P, EPS / 2, 1.12));
	const labelB = rotate(arcPoint(AXIS_P, negU, EPS / 2, 1.12));

	drawLabel(stage, 'ε', labelA, COL.planet, 0, 5);
	drawLabel(stage, 'ε', labelB, COL.planet, -14, 0);
}

function renderS0() {
	const hours = readNumber('h0');
	const sunLongitude = readNumber('ls0');
	const stage = createStage('cv-s0');
	const diurnalAngle = -15 * hours;                     // east -> west: angle decreases
	const rotate = point => rotateAboutPole(point, diurnalAngle);
	const rotatedRing = frame => ringPoints(frame).map(rotate);
	const eclipticPole = scale(FRAMES.ecliptic.axes[2], POLE_LENGTH);

	beginScene(stage);

	strokePath(stage, rotatedRing(FRAMES.celestial), COL.earth, 2.5);
	strokePath(stage, rotatedRing(FRAMES.ecliptic), COL.sun, 2.5);

	// celestial axis (invariant under diurnal motion)
	strokePath(stage, [[0, 0, -POLE_LENGTH], [0, 0, POLE_LENGTH]], COL.muted, 1);
	drawLabel(stage, 'P', [0, 0, POLE_LENGTH], COL.ink);
	drawLabel(stage, 'P′', [0, 0, -POLE_LENGTH], COL.ink);

	STARS.forEach(star => drawPoint(stage, rotate(star), COL.muted, 2));

	drawObliquityArcs(stage, rotate);

	// ecliptic pole Q
	strokePath(stage, [ORIGIN, rotate(eclipticPole)], COL.sun, 1.5);
	drawLabel(stage, 'Q', rotate(eclipticPole), COL.sun);

	// vernal equinox V
	drawPoint(stage, rotate(AXIS_V), COL.ink, 4);
	drawLabel(stage, 'V', rotate(AXIS_V), COL.ink, 6, 14);

	// sun: intrinsic motion = change of its ecliptic longitude
	const sun = rotate(vec(FRAMES.ecliptic, sunLongitude, 0));

	drawPoint(stage, sun, COL.sun, 9);
	drawLabel(stage, '☉', sun, COL.sun, 10, -8);

	showLines('o-s0', [
		`${texAngle('\\lambda_\\odot', sunLongitude)}`,
		`\\sin\\delta_\\odot=\\sin\\epsilon\\sin\\lambda_\\odot\\Rightarrow\\ ${texAngle('\\delta_\\odot', solarDeclination(sunLongitude))}`
	]);
}

/* Play / pause the diurnal rotation. */
const diurnalPlayer = {
	playing: false,
	timer: null
};

function setPlaying(isPlaying) {
	diurnalPlayer.playing = isPlaying;
	clearTimeout(diurnalPlayer.timer);

	byId('play0').textContent = isPlaying ? '⏸ Pause' : '▶ Play diurnal motion';
}

function stepDiurnalMotion() {
	if (!diurnalPlayer.playing || currentTab !== 's0') {
		setPlaying(false);

		return;
	}

	const slider = byId('h0');

	slider.value = (Number(slider.value) + 0.1) % 24;
	slider.dispatchEvent(new Event('input'));

	diurnalPlayer.timer = setTimeout(stepDiurnalMotion, 40);   // 25 updates per second
}

function toggleDiurnalMotion() {
	setPlaying(!diurnalPlayer.playing);

	if (diurnalPlayer.playing) {
		stepDiurnalMotion();
	}
}

/* ---------- Tabs 2-4: the three coordinate systems ---------- */

function renderC1() {
	const alpha = readNumber('al1');
	const delta = readNumber('de1');

	drawFrameScene('cv-c1', FRAMES.celestial, [], alpha, delta);

	showLines('o-c1', [
		`${texAngle('\\alpha', alpha)},\\ ${texAngle('\\delta', delta)}`,
		texFrameVector(FRAMES.celestial.names, alpha, delta),
		`\\mathbf r\\cdot\\mathbf p=${fmt3(sin(delta))}=\\sin\\delta`
	]);
}

function renderC2() {
	const lambda = readNumber('la2');
	const beta = readNumber('be2');

	drawFrameScene('cv-c2', FRAMES.ecliptic, [FRAMES.celestial], lambda, beta);

	showLines('o-c2', [
		`${texAngle('\\lambda', lambda)},\\ ${texAngle('\\beta', beta)}`,
		texFrameVector(FRAMES.ecliptic.names, lambda, beta)
	]);
}

function renderC3() {
	const azimuth = readNumber('A3');
	const altitude = readNumber('a3');
	const latitude = readNumber('L4');
	const meridianRA = readNumber('a04');
	const frame = horizontalFrame(latitude, meridianRA);
	const visibility = altitude < 0
		? '\\text{(below the horizon: not visible)}'
		: '\\text{(above the horizon)}';

	drawFrameScene('cv-c3', frame, [FRAMES.celestial], azimuth, altitude);

	// Eq. 2.27 lists the east term first
	showLines('o-c3', [
		`${texAngle('A', azimuth)},\\ ${texAngle('a', altitude)}`,
		texLinear('\\mathbf r', [
			[cos(altitude) * sin(azimuth), 'e'],
			[cos(altitude) * cos(azimuth), 'n'],
			[sin(altitude),                'z']
		]),
		visibility
	]);
}

/* ---------- Tab 5: ecliptic <-> celestial ---------- */

/* The triple (v,u,p) rotated about v by epsilon gives (v,s,q). */
function drawRotationDiagram(canvasId, lambda, beta) {
	const stage = createStage(canvasId);
	const [, axisS, axisQ] = FRAMES.ecliptic.axes;
	const negU = negate(AXIS_U);
	const tipLength = 0.75;

	beginScene(stage);

	// planes: fixed equator (blue) and the plane of the rotated triple (yellow, shaded)
	fillPath(stage, sampleCircle(AXIS_V, axisS), COL.sun, 0.1);
	strokePath(stage, sampleCircle(AXIS_V, AXIS_U), COL.earth, 2);
	strokePath(stage, sampleCircle(AXIS_V, axisS), COL.sun, 3);

	// rotation axis v, shared by both triples
	strokePath(stage, [scale(AXIS_V, -1.3), scale(AXIS_V, 1.3)], COL.muted, 1.5, [6, 4]);

	// fixed triple (blue), rotated triple (yellow) and the shared axis v
	drawArrow(stage, ORIGIN, scale(AXIS_U, tipLength), COL.earth, 2);
	drawArrow(stage, ORIGIN, scale(AXIS_P, tipLength), COL.earth, 2);
	drawArrow(stage, ORIGIN, scale(axisS, tipLength), COL.sun, 3);
	drawArrow(stage, ORIGIN, scale(axisQ, tipLength), COL.sun, 3);
	drawArrow(stage, ORIGIN, scale(AXIS_V, tipLength), COL.ink, 2.4);

	drawLabel(stage, 'u', scale(AXIS_U, tipLength), COL.ink, 6, -4);
	drawLabel(stage, 'p', scale(AXIS_P, tipLength), COL.ink, 6, -4);
	drawLabel(stage, 's', scale(axisS, tipLength), COL.ink, 6, 14);
	drawLabel(stage, 'q', scale(axisQ, tipLength), COL.ink, -16, -4);
	drawLabel(stage, 'v', scale(AXIS_V, tipLength), COL.ink, 6, -4);

	// rotation of epsilon for u -> s and p -> q ...
	labelArc(stage, 'ε', AXIS_U, AXIS_P, EPS, 0.80, COL.planet, 2, 4);
	labelArc(stage, 'ε', AXIS_P, negU, EPS, 0.80, COL.planet, -12, 4);

	// ... and as arrows along the circles swept by the tips
	[[AXIS_U, AXIS_P], [AXIS_P, negU]].forEach(([from, towards]) => {
		const arc = sampleArc(from, towards, EPS, tipLength, 30);

		strokePath(stage, arc, COL.planet, 3);
		drawArrow(stage, arc[arc.length - 3], arc[arc.length - 1], COL.planet, 3);
	});

	// the object R (fixed in space)
	drawMarkedVector(stage, vec(FRAMES.ecliptic, lambda, beta), 'R', COL.planet, 2.4);
}

function renderT1() {
	const lambda = readNumber('la5');
	const beta = readNumber('be5');
	const r = vec(FRAMES.ecliptic, lambda, beta);          // components along v, u, p
	const [x, y, z] = r;
	const delta = asin(z);
	const alpha = norm360(atan2d(y, x));
	const cosDelta = cos(delta);

	// inverse transformation, Eqs. 2.11 and 2.12 (a consistency check)
	const betaCheck = asin(cosEps * z - sinEps * cosDelta * sin(alpha));
	const lambdaCheck = norm360(atan2d(
		cosEps * cosDelta * sin(alpha) + sinEps * z,
		cosDelta * cos(alpha)
	));

	drawRotationDiagram('cv-t1', lambda, beta);

	showLines('o-t1', [
		`${texDot('v', x)},\\ ${texDot('u', y)},\\ ${texDot('p', z)}`,
		`${texAngle('\\delta', delta)},\\quad ${texAngle('\\alpha', alpha)}`,
		`\\text{check: }${texAngle('\\beta', betaCheck)},\\ ${texAngle('\\lambda', lambdaCheck)}`
	]);
}

/* ---------- Tab 6: celestial -> horizontal ---------- */

/* The meridian plane: p and m rotated by L give n and z. */
function drawMeridianDiagram(canvasId, L, a0) {
	const stage = createStage(canvasId);
	const [axisN, axisE, axisZ] = horizontalFrame(L, a0).axes;
	const axisM = [cos(a0), sin(a0), 0];                   // m = sin(a0) u + cos(a0) v (2.19)
	const negM = negate(axisM);
	const tipLength = 0.75;

	beginScene(stage);

	// celestial equator, meridian plane (through p and m) and horizon (through n and e)
	fillPath(stage, sampleCircle(AXIS_V, AXIS_U), COL.earth, 0.08);
	fillPath(stage, sampleCircle(axisM, AXIS_P), COL.epicycle, 0.15);
	strokePath(stage, sampleCircle(AXIS_V, AXIS_U), COL.earth, 2);
	strokePath(stage, sampleCircle(axisM, AXIS_P), COL.epicycle, 3.5);
	strokePath(stage, sampleCircle(axisN, axisE), COL.deferent, 2);

	// celestial v, u, p (blue / grey), m (violet), local n, z, e (green)
	const axes = [
		[AXIS_V, 'v', COL.muted,    1.6, 6,   -4],
		[AXIS_U, 'u', COL.muted,    1.6, 6,   -4],
		[AXIS_P, 'p', COL.earth,    2.4, 6,   -4],
		[axisM,  'm', COL.epicycle, 3,   6,   -4],
		[axisN,  'n', COL.deferent, 3,   -14, -6],
		[axisZ,  'z', COL.deferent, 3,   8,   -4],
		[axisE,  'e', COL.deferent, 2,   6,   14]
	];

	axes.forEach(([direction, text, color, width, dx, dy]) => {
		drawAxis(stage, scale(direction, tipLength), text, color, { width, dx, dy });
	});

	// alpha0 in the equator (v -> m)
	strokePath(stage, sampleArc(AXIS_V, AXIS_U, a0, 0.35), COL.planet, 3);
	labelArc(stage, 'α₀', AXIS_V, AXIS_U, a0, 0.5, COL.planet, 2, 4);

	// L twice in the meridian plane (p -> n and m -> z)
	labelArc(stage, 'L', AXIS_P, negM, L, 0.66, COL.planet, -10, 4);
	labelArc(stage, 'L', axisM, AXIS_P, L, 0.58, COL.planet, 4, 12);

	[[AXIS_P, negM], [axisM, AXIS_P]].forEach(([from, towards]) => {
		const arc = sampleArc(from, towards, L, tipLength, 30);

		strokePath(stage, arc, COL.planet, 3);
		drawArrow(stage, arc[arc.length - 3], arc[arc.length - 1], COL.planet, 3);
	});
}

function renderT2() {
	const alpha = readNumber('al6');
	const delta = readNumber('de6');
	const L = readNumber('L6');
	const a0 = readNumber('a06');
	const [axisN, axisE, axisZ] = horizontalFrame(L, a0).axes;
	const r = vec(FRAMES.celestial, alpha, delta);
	const rn = dot3(r, axisN);
	const re = dot3(r, axisE);
	const rz = dot3(r, axisZ);
	const altitude = asin(rz);
	const azimuth = norm360(atan2d(re, rn));
	const visibility = altitude < 0
		? '\\text{below the horizon}'
		: '\\text{above the horizon}';

	drawMeridianDiagram('cv-t2', L, a0);

	showLines('o-t2', [
		`${texLinear('\\mathbf n', [[cos(L), 'p'], [-sin(L), 'm']])},\\quad ${texLinear('\\mathbf z', [[sin(L), 'p'], [cos(L), 'm']])}`,
		`${texDot('z', rz)},\\ ${texDot('e', re)},\\ ${texDot('n', rn)}`,
		`${texAngle('a', altitude)},\\quad ${texAngle('A', azimuth)}`,
		texAngle('\\alpha-\\alpha_0', alpha - a0),
		visibility
	]);
}

/* ---------- Tab 7: meridian transits ---------- */

/* Daily path of the object: solid above the horizon, dashed below it. */
function drawDailyPath(stage, path) {
	const { ctx } = stage;

	for (let i = 0; i < path.length - 1; i++) {
		const a = project(stage, path[i]);
		const b = project(stage, path[i + 1]);
		const isAbove = path[i][2] + path[i + 1][2] >= 0;

		ctx.strokeStyle = COL.planet;
		ctx.lineWidth = isAbove ? 4 : 2;
		ctx.setLineDash(isAbove ? [] : [4, 4]);
		ctx.beginPath();
		ctx.moveTo(a.x, a.y);
		ctx.lineTo(b.x, b.y);
		ctx.stroke();
	}

	ctx.setLineDash([]);
}

function renderA1() {
	const L = readNumber('L2');
	const delta = readNumber('del2');
	const stage = createStage('cv-a1');

	// Local scene (right-handed): x = north point, y = west point, z = zenith (screen "up").
	const north = [1, 0, 0];
	const west = [0, 1, 0];
	const zenith = [0, 0, 1];
	const pole = [cos(L), 0, sin(L)];                      // celestial pole, raised by L above north
	const meridianEquator = [-sin(L), 0, cos(L)];          // equator point on the meridian (2.17, 2.18)

	// daily circle of the object: declination fixed, hour angle t running
	const diurnalPoint = t => {
		const equatorPoint = arcPoint(meridianEquator, west, t);

		return lin2(equatorPoint, pole, cos(delta), sin(delta));
	};

	const horizonRing = sampleCircle(north, west);

	beginScene(stage);

	// horizon (shaded plane), meridian, celestial equator, celestial axis
	fillPath(stage, horizonRing, COL.deferent, 0.1);
	strokePath(stage, horizonRing, COL.deferent, 3);
	strokePath(stage, sampleCircle(north, zenith), COL.muted, 1.5);
	strokePath(stage, sampleCircle(meridianEquator, west), COL.earth, 2.5);
	strokePath(stage, [scale(pole, -POLE_LENGTH), scale(pole, POLE_LENGTH)], COL.muted, 1);

	drawDailyPath(stage, sampleParametric(diurnalPoint));

	// compass points on the horizon
	[
		['N', north],
		['W', west],
		['S', negate(north)],
		['E', negate(west)]
	].forEach(([text, point]) => {
		drawPoint(stage, point, COL.deferent, 4);
		drawLabel(stage, text, point, COL.ink, 6, 16);
	});

	// zenith and pole arrows
	drawAxis(stage, scale(zenith, 1.25), 'Z', COL.ink, { width: 1.8 });
	drawAxis(stage, scale(pole, 1.25), 'P', COL.earth, { width: 1.8, labelColor: COL.earth });

	// the two meridian crossings (transits)
	const upperTransit = lin2(meridianEquator, pole, cos(delta), sin(delta));
	const lowerTransit = lin2(meridianEquator, pole, -cos(delta), sin(delta));

	drawMarkedVector(stage, upperTransit, 'upper transit', COL.planet, 2, 9, -8);
	drawMarkedVector(stage, lowerTransit, 'lower transit', COL.planet, 2, 9, -8);

	// angles near the centre, all in the meridian (x-z) plane
	strokePath(stage, sampleArc(north, zenith, L, 0.8), COL.earth, 3);
	labelArc(stage, 'L', north, zenith, L, 0.95, COL.earth);
	strokePath(stage, sampleArc(meridianEquator, pole, delta, 0.6), COL.planet, 3);
	labelArc(stage, 'δ', meridianEquator, pole, delta, 0.74, COL.planet);

	// altitudes at the transits
	[
		[upperTransit, 0.45, 'a+'],
		[lowerTransit, 0.30, 'a−']
	].forEach(([transit, radius, text]) => {
		const altitude = asin(transit[2]);
		const horizonPoint = (transit[0] >= 0) ? north : negate(north);

		strokePath(stage, sampleArc(horizonPoint, zenith, altitude, radius), COL.deferent, 3);
		labelArc(stage, text, horizonPoint, zenith, altitude, radius + 0.14, COL.deferent);
	});

	// read-out (Eqs 2.34, 2.35)
	const upperAltitude = 90 - Math.abs(L - delta);
	const lowerAltitude = Math.abs(L + delta) - 90;
	let verdict = 'rises and sets';

	if (Math.abs(L + delta) > 90) {
		verdict = 'circumpolar – never sets';
	} else if (Math.abs(L - delta) > 90) {
		verdict = 'never rises';
	}

	showLines('o-a1', [
		`a_+=90^\\circ-|${L}^\\circ-${delta}^\\circ|=${upperAltitude}^\\circ`,
		`a_-=|${L}^\\circ+${delta}^\\circ|-90^\\circ=${lowerAltitude}^\\circ`
	]);
	appendBadge('o-a1', 'Verdict:', verdict);
}

/* ---------- Tab 8: climes, equinoxes, solstices ---------- */

/* cos(t_h) at sunrise, for latitude L and solar declination delta (Eq. 2.59). */
function cosHourAngle(L, delta) {
	return -tan(clampLatitude(L)) * tan(delta);
}

/* Day length in hours for latitude L and solar longitude lam.
   Returns 0 (sun never rises) or 24 (sun never sets) when |cos t_h| >= 1. */
function dayLength(L, lam) {
	const c = cosHourAngle(L, solarDeclination(lam));

	if (c >= 1) {
		return 0;                          // polar night
	}

	if (c <= -1) {
		return 24;                         // midnight sun
	}

	return 2 * acos(c) / 15;               // 2 t_h / 15 deg per hour
}

/* Longest day at latitude |L|.
   Below the arctic circle: hours (180 + 2 asin(tan L tan eps)) / 15.
   Above it: the number of DAYS the sun stays up,
   0.5 - asin(cos L / sin eps)/180 of a year (Sect. 2.12). */
function longestDay(L) {
	const absLatitude = Math.abs(clampLatitude(L));
	const x = tan(absLatitude) * tan(EPS);

	if (x < 1) {
		return { polar: false, value: (180 + 2 * asin(x)) / 15 };
	}

	const yearFraction = 0.5 - asin(cos(absLatitude) / sinEps) / 180;

	return { polar: true, value: TROPICAL_YEAR * yearFraction };
}

/* Noon altitude of an object of declination d, plus the side of the zenith. */
function noonAltitude(L, d) {
	const altitude = 90 - Math.abs(L - d);
	const side = (L > d) ? 'S' : 'N';

	return `${dms(altitude)} ${side}`;
}

/* Chart: day length (h) against solar longitude.
   Plateaus at 24 h / 0 h are polar day / polar night. */
function drawDayChart(L, lam, todayLength) {
	const ctx = byId('daychart').getContext('2d');
	const width = 640;
	const height = 460;
	const plot = {
		left: 50,
		top: 20,
		width: width - 50 - 20,
		height: height - 20 - 50
	};

	const xOf = lambda => plot.left + plot.width * lambda / 360;
	const yOf = hours => plot.top + plot.height * (1 - hours / 24);

	ctx.clearRect(0, 0, width, height);
	ctx.font = '12px system-ui';
	ctx.fillStyle = COL.muted;
	ctx.strokeStyle = COL.line;
	ctx.lineWidth = 1;

	// horizontal grid (hours)
	for (let h = 0; h <= 24; h += 4) {
		drawLine2D(ctx, plot.left, yOf(h), plot.left + plot.width, yOf(h));
		ctx.fillText(`${h} h`, 10, yOf(h) + 4);
	}

	// vertical grid (season marks)
	for (let t = 0; t <= 360; t += 90) {
		drawLine2D(ctx, xOf(t), plot.top, xOf(t), plot.top + plot.height);
		ctx.fillText(`${t}°`, xOf(t) - 10, plot.top + plot.height + 18);
	}

	// day-length curve
	ctx.strokeStyle = COL.deferent;
	ctx.lineWidth = 3;
	ctx.beginPath();

	for (let t = 0; t <= 360; t += 2) {
		const x = xOf(t);
		const y = yOf(dayLength(L, t));

		if (t === 0) {
			ctx.moveTo(x, y);
		} else {
			ctx.lineTo(x, y);
		}
	}

	ctx.stroke();

	// annotate the polar plateaus (summer solstice: lambda = 90 north, 270 south)
	const summerLambda = (L >= 0) ? 90 : 270;
	const winterLambda = (L >= 0) ? 270 : 90;

	ctx.fillStyle = COL.muted;

	if (dayLength(L, summerLambda) === 24) {
		ctx.fillText('polar day (sun never sets)', xOf(summerLambda) - 70, plot.top + 16);
	}

	if (dayLength(L, winterLambda) === 0) {
		ctx.fillText('polar night (sun never rises)', xOf(winterLambda) - 75, plot.top + plot.height - 8);
	}

	// marker for the chosen day and the x-axis title
	drawDisc(ctx, xOf(lam), yOf(todayLength), 8, COL.sun);
	ctx.fillStyle = COL.muted;
	ctx.fillText('solar longitude λ☉ (degrees)', plot.left + plot.width / 2 - 70, height - 8);
}

/* TeX line describing the day length (or why there is none). */
function dayLengthTex(cosTh, length) {
	if (cosTh >= 1) {
		return '\\text{polar night: }\\cos t_h\\ge 1\\Rightarrow\\ \\text{the sun never rises (0 h)}';
	}

	if (cosTh <= -1) {
		return '\\text{midnight sun: }\\cos t_h\\le -1\\Rightarrow\\ \\text{the sun never sets (24 h)}';
	}

	return `\\text{day}=2t_h/15^\\circ/\\text{h}=\\mathbf{${hmTex(length)}}`;
}

/* Table of climes for |L| = 0..90 every 5 degrees; the row nearest to L is highlighted. */
function buildClimesTable(L) {
	const header = '<tr><th>L</th><th>Longest day</th><th>Summer-solstice noon</th><th>Equinox noon</th><th>Winter-solstice noon</th></tr>';
	const rows = [];

	for (let lat = 0; lat <= 90; lat += 5) {
		const isNear = Math.abs(Math.abs(L) - lat) < 2.5;
		const longest = longestDay(lat);
		const longestText = longest.polar ? dh(longest.value) : hm(longest.value);

		rows.push(
			`<tr class="${isNear ? 'hl' : ''}">` +
			`<td>${lat}°</td>` +
			`<td>${longestText}</td>` +
			`<td>${noonAltitude(lat, EPS)}</td>` +
			`<td>${noonAltitude(lat, 0)}</td>` +
			`<td>${noonAltitude(lat, -EPS)}</td>` +
			'</tr>'
		);
	}

	byId('climes').innerHTML = header + rows.join('');
}

function renderA2() {
	const L = readNumber('L3');
	const lam = readNumber('lam3');
	const delta = solarDeclination(lam);
	const length = dayLength(L, lam);
	const cosTh = cosHourAngle(L, delta);
	const noon = 90 - Math.abs(L - delta);
	const longest = longestDay(L);

	drawDayChart(L, lam, length);

	const noonLine = `a_{\\text{noon}}=90^\\circ-|${L}^\\circ-${delta.toFixed(2)}^\\circ|=${dms(noon)}`;
	const noonNote = (noon < 0) ? '\\ \\text{(below the horizon)}' : '';

	const longestLine = longest.polar
		? `\\text{longest day: the sun stays up for}\\approx ${dhTex(longest.value)}`
		: `\\text{longest day (this }|L|\\text{)}=${hmTex(longest.value)}`;

	showLines('o-a2', [
		`\\sin\\delta=\\sin\\epsilon\\sin(${lam}^\\circ)\\Rightarrow\\delta=${dms(delta)}`,
		`\\cos t_h=-\\tan(${L}^\\circ)\\tan(${delta.toFixed(2)}^\\circ)=${cosTh.toFixed(3)}`,
		dayLengthTex(cosTh, length),
		noonLine + noonNote,
		longestLine
	]);

	buildClimesTable(L);
}


/* ==========================================================================
   9. UI WIRING
   ========================================================================== */

const renderers = {
	s0: renderS0,
	c1: renderC1,
	c2: renderC2,
	c3: renderC3,
	t1: renderT1,
	t2: renderT2,
	a1: renderA1,
	a2: renderA2
};

let currentTab = 's0';

function renderCurrentTab() {
	renderers[currentTab]();
}

function selectTab(tabId) {
	currentTab = tabId;
	renderCurrentTab();
}

function initUI() {
	wireTabs('tabs', selectTab);

	document.querySelectorAll('input[type=range]').forEach(input => {
		wireSlider(input, renderCurrentTab);
	});

	document.querySelectorAll('.presets button[data-target]').forEach(button => {
		button.addEventListener('click', () => applyPreset(button));
	});

	document.querySelectorAll('canvas.sph').forEach(canvas => {
		wireDragRotation(canvas, renderCurrentTab);
	});

	byId('play0').addEventListener('click', toggleDiurnalMotion);
}

initUI();

/* KaTeX is loaded with `defer`, so wait for the page to finish loading. */
window.addEventListener('load', () => {
	renderStaticMath();
	renderCurrentTab();
});
