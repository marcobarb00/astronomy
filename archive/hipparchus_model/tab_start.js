/* ==========================================================================
   TAB 1 - THE STARTING POINT: EUDOXUS' HOMOCENTRIC SPHERES (tab_start.js)
   Needs ../shared/common.js and hipparchus_model.js.

   The world basis here is the ecliptic: x towards the planet's mean
   position at t = 0, z towards the north ecliptic pole.

   Model (one planet, the daily sphere left out):
	 sphere 2: axis = ecliptic pole, one turn per sidereal period
	 sphere 3: axis in the ecliptic, 90° from the mean position,
	           one turn per synodic period
	 sphere 4: axis tilted by i from the axis of sphere 3, turns at the
	           same rate in the opposite direction; the planet sits on
	           its equator.

   TABLE OF CONTENTS
	 1. Model       (sphere axes and planet position)
	 2. Analysis    (longitude rate, retrograde test)
	 3. Drawing
	 4. Read-out
	 5. Animation and registration
   ========================================================================== */

(() => {

/* ==========================================================================
   1. MODEL
   ========================================================================== */

const DAYS_PER_YEAR = 365.25;
const MEAN_DIRECTION = [1, 0, 0];
const SPHERE3_AXIS = [0, 1, 0];
const ECLIPTIC_POLE = [0, 0, 1];

const state = {
	t: 0            // days since the planet was at the center of its figure-eight
};

function readModel() {
	return {
		inclination: readNumber('eu-i'),
		synodic: readNumber('eu-syn'),
		sidereal: readNumber('eu-sid') * DAYS_PER_YEAR,
		speed: readNumber('eu-speed'),
		trail: readNumber('eu-trail')
	};
}

/* Rotation angles of sphere 3 (and, reversed, of sphere 4) and of sphere 2. */
function sphereAngles(m, t) {
	return {
		phi: 360 * t / m.synodic,
		zodiac: 360 * t / m.sidereal
	};
}

/* Axis of sphere 4 before any rotation: sphere 3's axis tilted by i. */
function sphere4AxisAtRest(m) {
	return [0, cos(m.inclination), sin(m.inclination)];
}

/* Axes of spheres 3 and 4 at time t, in the world basis. */
function sphereAxes(m, t) {
	const { phi, zodiac } = sphereAngles(m, t);
	const axis4InSphere3 = rotateAbout(sphere4AxisAtRest(m), SPHERE3_AXIS, phi);

	return {
		axis3: rotateAbout(SPHERE3_AXIS, ECLIPTIC_POLE, zodiac),
		axis4: rotateAbout(axis4InSphere3, ECLIPTIC_POLE, zodiac)
	};
}

/* Planet direction at time t: sphere 4, then sphere 3, then sphere 2. */
function planetAt(m, t) {
	const { phi, zodiac } = sphereAngles(m, t);
	const onSphere4 = rotateAbout(MEAN_DIRECTION, sphere4AxisAtRest(m), -phi);
	const onSphere3 = rotateAbout(onSphere4, SPHERE3_AXIS, phi);

	return rotateAbout(onSphere3, ECLIPTIC_POLE, zodiac);
}

/* Mean position: the center of the figure-eight, carried by sphere 2. */
function meanAt(m, t) {
	return rotateAbout(MEAN_DIRECTION, ECLIPTIC_POLE, sphereAngles(m, t).zodiac);
}


/* ==========================================================================
   2. ANALYSIS
   ========================================================================== */

/* Apparent motion in longitude, degrees per day (central difference). */
function longitudeRate(m, t) {
	const h = 0.05;
	const before = toLonLat(planetAt(m, t - h)).lon;
	const after = toLonLat(planetAt(m, t + h)).lon;

	return wrap180(after - before) / (2 * h);
}

/* Fastest backward speed along the figure-eight and its half-length,
   sampled over one synodic period. */
function analyseFigure(m) {
	let slowest = Infinity;
	let halfLength = 0;
	let highest = 0;

	for (let k = 0; k < 360; k++) {
		const t = m.synodic * k / 360;
		const offset = wrap180(toLonLat(planetAt(m, t)).lon - toLonLat(meanAt(m, t)).lon);

		slowest = Math.min(slowest, longitudeRate(m, t));
		halfLength = Math.max(halfLength, Math.abs(offset));
		highest = Math.max(highest, Math.abs(toLonLat(planetAt(m, t)).lat));
	}

	return { slowest, halfLength, highest };
}


/* ==========================================================================
   3. DRAWING
   ========================================================================== */

/* The past path of the planet, over 'trail' synodic periods. */
function trailPoints(m) {
	const points = [];
	const span = m.trail * m.synodic;
	const steps = Math.max(2, Math.round(240 * m.trail));

	for (let k = 0; k <= steps; k++) {
		points.push(planetAt(m, state.t - span + span * k / steps));
	}

	return points;
}

/* A sphere's axis (a line through the Earth) and its equator. */
function drawSphere(stage, axis, color, name) {
	strokePath(stage, greatCircle(axis), color, 1.6);
	strokePath(stage, [scale(axis, -POLE_LENGTH), scale(axis, POLE_LENGTH)], color, 1.2, [6, 5]);
	drawLabel(stage, name, scale(axis, POLE_LENGTH), color);
}

function drawScene(m) {
	const stage = createStage('cv-eu');
	const axes = sphereAxes(m, state.t);
	const planet = planetAt(m, state.t);
	const mean = meanAt(m, state.t);

	beginScene(stage);

	// sphere 2: the ecliptic and its pole
	strokePath(stage, greatCircle(ECLIPTIC_POLE), COL.sun, 2.5);
	strokePath(stage, [scale(ECLIPTIC_POLE, -POLE_LENGTH), scale(ECLIPTIC_POLE, POLE_LENGTH)], COL.muted, 1);
	drawLabel(stage, 'ecliptic pole', scale(ECLIPTIC_POLE, POLE_LENGTH), COL.muted);

	// spheres 3 and 4
	drawSphere(stage, axes.axis3, COL.deferent, 'sphere 3');
	drawSphere(stage, axes.axis4, COL.epicycle, 'sphere 4');

	// the figure-eight traced by the planet
	strokePath(stage, trailPoints(m), COL.planet, 2.5);

	// mean position, planet and Earth
	drawPoint(stage, mean, COL.muted, 5);
	drawLabel(stage, 'mean', mean, COL.muted, -60, 22);
	drawPoint(stage, planet, COL.planet, 7);
	drawLabel(stage, 'planet', planet, COL.planet, 10, -10);
	drawPoint(stage, ORIGIN, COL.earth, 7);
	drawLabel(stage, 'Earth', ORIGIN, COL.earth, 10, 18);
}


/* ==========================================================================
   4. READ-OUT
   ========================================================================== */

function renderReadout(m) {
	const position = toLonLat(planetAt(m, state.t));
	const offset = wrap180(position.lon - toLonLat(meanAt(m, state.t)).lon);
	const rate = longitudeRate(m, state.t);
	const figure = analyseFigure(m);
	const zodiacRate = 360 / m.sidereal;
	const motion = rate < 0 ? '\\text{retrograde}' : '\\text{direct}';
	const loops = figure.slowest < 0 ? '\\text{yes}' : '\\text{no}';

	showLines('o-eu', [
		`t=${Math.round(state.t)}\\ \\text{d}`,
		`\\lambda-\\bar\\lambda=${offset.toFixed(2)}^\\circ,\\quad \\beta=${position.lat.toFixed(2)}^\\circ`,
		`\\dot\\lambda=${rate.toFixed(3)}^\\circ/\\text{d}\\ (${motion})`,
		`\\text{half-length of the figure-eight}=${figure.halfLength.toFixed(1)}^\\circ`,
		`\\text{zodiac speed}=${zodiacRate.toFixed(3)}^\\circ/\\text{d},\\ \\text{retrograde arcs: }${loops}`,
		`\\text{Earth-planet distance}=1\\ \\text{(always)}`
	]);
}

function render() {
	const m = readModel();

	drawScene(m);
	renderReadout(m);
}


/* ==========================================================================
   5. ANIMATION AND REGISTRATION
   ========================================================================== */

/* Advance the clock by dt seconds of real time. */
function step(dt) {
	state.t += readNumber('eu-speed') * dt;
	render();
}

/* Presets for three planets; inclinations are Schiaparelli's reconstruction. */
const PLANET_PRESETS = {
	saturn: { 'eu-i': 6, 'eu-syn': 390, 'eu-sid': 30 },
	jupiter: { 'eu-i': 13, 'eu-syn': 390, 'eu-sid': 12 },
	mars: { 'eu-i': 34, 'eu-syn': 260, 'eu-sid': 2 },
	marsTrue: { 'eu-i': 34, 'eu-syn': 780, 'eu-sid': 1.88 }
};

function init() {
	createPlayer('start', 'eu-play', step);

	wireChoices('eu-planets', choice => {
		setSliders(PLANET_PRESETS[choice]);
	});
}

registerTab('start', { init, render });

})();
