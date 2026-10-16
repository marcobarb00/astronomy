/* ==========================================================================
   THE COPERNICAN REVOLUTION - TAB 3: MODEL COMPARISON (tab_epicycles.js)
   Fitzpatrick, A Modern Almagest, chapters 8-9.
   Needs ../shared/common.js and KaTeX to be loaded first.

   The whole tab lives inside one function scope, so its helpers do not clash
   with the globals of the other tab scripts.

   TABLE OF CONTENTS
	 0. Constants and planet presets
	 1. The model           (parameters, positions, dλ/dt)
	 2. Events              (stations, conjunctions, oppositions, elongations)
	 3. 2D drawing helpers
	 4. Heliocentric view
	 5. Geocentric view
	 6. Longitude chart
	 7. Read-outs and tables
	 8. Animation and UI wiring
   ========================================================================== */

(() => {

/* ==========================================================================
   0. CONSTANTS AND PLANET PRESETS
   ========================================================================== */

const YEAR = 365.25;            // days
const MAX_WINDOW = 3000;        // days, caps windows when the synodic period is huge
const SAMPLES_PER_SYNODIC = 360;

const ZODIAC = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓']
	.map(glyph => glyph + '\uFE0E');   // text presentation, not emoji

/* a: mean distance from the Sun (AU), T: sidereal period (years),
   ptolemy: Ptolemy's epicycle radius for a deferent of 60 parts. */
const PLANETS = {
	mercury: { name: 'Mercury', type: 'inferior', a: 0.387, T: 0.2408, ptolemy: 22.5 },
	venus:   { name: 'Venus',   type: 'inferior', a: 0.723, T: 0.6152, ptolemy: 43 + 10 / 60 },
	mars:    { name: 'Mars',    type: 'superior', a: 1.524, T: 1.8809, ptolemy: 39.5 },
	jupiter: { name: 'Jupiter', type: 'superior', a: 5.203, T: 11.862, ptolemy: 11.5 },
	saturn:  { name: 'Saturn',  type: 'superior', a: 9.537, T: 29.457, ptolemy: 6.5 }
};

const EVENT_NAMES = {
	station1: 'station (retrograde begins)',
	station2: 'station (direct again)',
	opp: 'opposition',
	conj: 'conjunction',
	iconj: 'inferior conjunction',
	sconj: 'superior conjunction',
	elong: 'greatest elongation'
};

const STATION_COLOR = '#4b5263';

const wrap180 = x => norm360(x + 180) - 180;

const state = {
	t: 0,                 // days since the epoch (opposition / inferior conjunction)
	type: 'superior',
	name: 'Mars',
	playing: false,
	lastFrame: null,
	lastReadout: 0
};


/* ==========================================================================
   1. THE MODEL
   Heliocentric: Earth on a circle of radius rEarth, planet on a circle of
   radius aPlanet, both uniform, both at longitude 0 at t = 0.
   Geocentric:   z = P - E = R e^{iθd} + r e^{iθe}  (deferent + epicycle).
   ========================================================================== */

function readModel() {
	const R = readNumber('R');
	const r = readNumber('r');
	const superior = state.type === 'superior';
	const rEarth = superior ? r : R;
	const aPlanet = superior ? R : r;
	const kepler = byId('kepler').checked;
	const periodYears = kepler ? Math.pow(aPlanet / rEarth, 1.5) : readNumber('T');

	const nE = 360 / YEAR;                    // Earth, deg/day
	const nP = 360 / (periodYears * YEAR);    // planet, deg/day
	const relative = Math.abs(nE - nP);

	return {
		R, r, superior, rEarth, aPlanet, periodYears, kepler, nE, nP,
		wd: superior ? nP : nE,               // deferent rate
		we: superior ? nE : nP,               // epicycle rate
		synodic: relative > 1e-9 ? 360 / relative : Infinity   // days
	};
}

/* Length of the windows we scan (one synodic period, capped). */
const synodicWindow = m => Math.min(m.synodic, MAX_WINDOW);

function positions(m, t) {
	const thE = m.nE * t;
	const thP = m.nP * t;
	const E = [m.rEarth * cos(thE), m.rEarth * sin(thE)];
	const P = [m.aPlanet * cos(thP), m.aPlanet * sin(thP)];
	const z = [P[0] - E[0], P[1] - E[1]];
	const thD = m.superior ? thP : thE + 180;
	const thEp = m.superior ? thE + 180 : thP;

	return {
		E, P, z,
		G: [m.R * cos(thD), m.R * sin(thD)],   // guide point (geocentric)
		thD, thEp,
		lam: norm360(atan2d(z[1], z[0])),
		lamSun: norm360(thE + 180),
		dist: Math.hypot(z[0], z[1])
	};
}

/* Apparent angular velocity dλ/dt (deg/day) at anomaly mu. */
function lambdaRateAt(m, mu) {
	const { R, r, wd, we } = m;
	const num = R * R * wd + r * r * we + R * r * (wd + we) * cos(mu);
	const den = R * R + r * r + 2 * R * r * cos(mu);

	return num / den;
}

function lambdaRate(m, t) {
	const p = positions(m, t);

	return lambdaRateAt(m, p.thEp - p.thD);
}

/* Half-width μs of the retrograde stretch: the stations sit at anomaly
   180° ∓ μs, symmetric about the perigee. Null when there is no retrograde motion. */
function stationAnomaly(m) {
	const c = (m.R * m.R * m.wd + m.r * m.r * m.we) / (m.R * m.r * (m.wd + m.we));

	return (c > -1 && c < 1) ? acos(c) : null;
}


/* ==========================================================================
   2. EVENTS
   Each event is a root of a function of time; we sample, look for sign
   changes, then bisect.
   ========================================================================== */

function bisect(f, a, b, fa) {
	for (let i = 0; i < 50; i++) {
		const mid = (a + b) / 2;
		const fm = f(mid);

		if ((fm < 0) === (fa < 0)) {
			a = mid;
			fa = fm;
		} else {
			b = mid;
		}
	}

	return (a + b) / 2;
}

/* All events with t1 <= t < t2, sorted by time. */
function findEvents(m, t1, t2) {
	const finders = [
		{ kind: 'station', f: t => lambdaRate(m, t) },
		{ kind: 'conj', f: t => { const p = positions(m, t); return wrap180(p.lam - p.lamSun); }, angular: true },
		{ kind: 'opp', f: t => { const p = positions(m, t); return wrap180(p.lam - p.lamSun - 180); }, angular: true }
	];

	if (!m.superior) {
		finders.push({ kind: 'elong', f: t => lambdaRate(m, t) - m.nE });
	}

	// an odd count keeps the window's midpoint (often an event) off the sample grid
	const steps = 2 * Math.max(20, Math.ceil((t2 - t1) / synodicWindow(m) * SAMPLES_PER_SYNODIC / 2)) + 1;
	const h = (t2 - t1) / steps;
	const events = [];

	finders.forEach(({ kind, f, angular }) => {
		let ta = t1;
		let fa = f(ta);

		for (let i = 1; i <= steps; i++) {
			const tb = t1 + i * h;
			const fb = f(tb);
			// angular functions jump from +180 to -180: that is not a root
			const isJump = angular && Math.abs(fa - fb) > 180;

			if (fa !== 0 && (fa < 0) !== (fb < 0) && !isJump) {
				const t = bisect(f, ta, tb, fa);

				events.push(classify(m, kind, t, fa));
			}

			ta = tb;
			fa = fb;
		}
	});

	return events.sort((a, b) => a.t - b.t);
}

function classify(m, kind, t, before) {
	const p = positions(m, t);
	let type = kind;

	if (kind === 'station') {
		type = before > 0 ? 'station1' : 'station2';
	} else if (kind === 'conj' && !m.superior) {
		type = p.dist < m.R ? 'iconj' : 'sconj';
	}

	return {
		type,
		t,
		lam: p.lam,
		z: p.z,
		elong: wrap180(p.lam - p.lamSun)
	};
}


/* ==========================================================================
   3. 2D DRAWING HELPERS
   A "view" maps model coordinates to canvas pixels: x right, y up,
   longitude 0 (the vernal equinox, ♈) to the right, increasing anticlockwise.
   ========================================================================== */

function createView(canvasId, extent) {
	const canvas = byId(canvasId);
	const ctx = canvas.getContext('2d');
	const W = canvas.width;
	const ringR = 0.42 * W;

	return {
		canvas, ctx, W,
		cx: W / 2,
		cy: canvas.height / 2,
		ringR,
		s: 0.8 * ringR / extent          // px per model unit
	};
}

const toPx = (v, p) => ({ x: v.cx + v.s * p[0], y: v.cy - v.s * p[1] });
const ringPoint = (v, lam, radius = v.ringR) => ({ x: v.cx + radius * cos(lam), y: v.cy - radius * sin(lam) });

function line(ctx, a, b, color, width, dash = []) {
	ctx.strokeStyle = color;
	ctx.lineWidth = width;
	ctx.setLineDash(dash);
	ctx.beginPath();
	ctx.moveTo(a.x, a.y);
	ctx.lineTo(b.x, b.y);
	ctx.stroke();
	ctx.setLineDash([]);
}

function circle(ctx, c, radius, color, width, dash = []) {
	ctx.strokeStyle = color;
	ctx.lineWidth = width;
	ctx.setLineDash(dash);
	ctx.beginPath();
	ctx.arc(c.x, c.y, radius, 0, TAU);
	ctx.stroke();
	ctx.setLineDash([]);
}

function text(ctx, str, q, color, dx = 0, dy = 0, align = 'center', size = 15) {
	ctx.fillStyle = color;
	ctx.font = `${size}px system-ui, sans-serif`;
	ctx.textAlign = align;
	ctx.textBaseline = 'middle';
	ctx.fillText(str, q.x + dx, q.y + dy);
}

/* A body: a disc with an optional halo. */
function body(ctx, q, radius, color, halo = false) {
	if (halo) {
		ctx.globalAlpha = 0.3;
		drawDisc(ctx, q.x, q.y, radius * 1.8, color);
		ctx.globalAlpha = 1;
	}

	drawDisc(ctx, q.x, q.y, radius, color);
}

/* Point where the ray from 'from' along longitude lam leaves the ring. */
function rayToRing(v, from, lam) {
	const dx = from.x - v.cx;
	const dy = from.y - v.cy;
	const ux = cos(lam);
	const uy = -sin(lam);
	const b = dx * ux + dy * uy;
	const c = dx * dx + dy * dy - v.ringR * v.ringR;
	const s = -b + Math.sqrt(Math.max(0, b * b - c));

	return { x: from.x + s * ux, y: from.y + s * uy };
}

/* Event markers: diamond (station), ring (opposition / inferior conjunction),
   sun-coloured disc (conjunction), sun-coloured triangle (elongation). */
function marker(ctx, type, q, size = 6) {
	ctx.lineWidth = 2;
	ctx.setLineDash([]);

	if (type === 'station1' || type === 'station2') {
		ctx.fillStyle = STATION_COLOR;
		ctx.beginPath();
		ctx.moveTo(q.x, q.y - size);
		ctx.lineTo(q.x + size, q.y);
		ctx.lineTo(q.x, q.y + size);
		ctx.lineTo(q.x - size, q.y);
		ctx.closePath();
		ctx.fill();
	} else if (type === 'opp' || type === 'iconj') {
		ctx.fillStyle = COL.card;
		ctx.strokeStyle = STATION_COLOR;
		ctx.beginPath();
		ctx.arc(q.x, q.y, size, 0, TAU);
		ctx.fill();
		ctx.stroke();
	} else if (type === 'conj' || type === 'sconj') {
		ctx.fillStyle = COL.sun;
		ctx.strokeStyle = COL.card;
		ctx.beginPath();
		ctx.arc(q.x, q.y, size, 0, TAU);
		ctx.fill();
		ctx.stroke();
	} else if (type === 'elong') {
		ctx.fillStyle = COL.sun;
		ctx.beginPath();
		ctx.moveTo(q.x, q.y - size);
		ctx.lineTo(q.x + size, q.y + size * 0.8);
		ctx.lineTo(q.x - size, q.y + size * 0.8);
		ctx.closePath();
		ctx.fill();
	}
}

/* Zodiac ring: the fixed stars, with sign boundaries and glyphs. */
function drawZodiac(v) {
	const { ctx } = v;

	ctx.clearRect(0, 0, v.canvas.width, v.canvas.height);
	circle(ctx, { x: v.cx, y: v.cy }, v.ringR, COL.line, 1.5);

	for (let k = 0; k < 12; k++) {
		line(ctx, ringPoint(v, 30 * k, v.ringR - 6), ringPoint(v, 30 * k, v.ringR + 6), COL.line, 1.5);
		text(ctx, ZODIAC[k], ringPoint(v, 30 * k + 15, v.ringR + 22), COL.muted, 0, 0, 'center', 18);
	}
}

/* Longitudes of the visible events, marked on the zodiac ring. */
function drawRingEvents(v, events) {
	events.forEach(e => marker(v.ctx, e.type, ringPoint(v, e.lam), 5));
}

/* Sample the geocentric path between t1 and t2. */
function geocentricPath(m, t1, t2) {
	const steps = Math.max(2, Math.ceil((t2 - t1) / synodicWindow(m) * 400));
	const points = [];

	for (let i = 0; i <= steps; i++) {
		points.push(positions(m, t1 + (t2 - t1) * i / steps).z);
	}

	return points;
}

function polyline(v, points, color, width) {
	const { ctx } = v;

	ctx.strokeStyle = color;
	ctx.lineWidth = width;
	ctx.setLineDash([]);
	ctx.beginPath();

	points.forEach((p, i) => {
		const q = toPx(v, p);

		if (i === 0) {
			ctx.moveTo(q.x, q.y);
		} else {
			ctx.lineTo(q.x, q.y);
		}
	});

	ctx.stroke();
}


/* ==========================================================================
   4. HELIOCENTRIC VIEW
   ========================================================================== */

function drawHelio(m, p, events) {
	const v = createView('cv-helio', Math.max(m.rEarth, m.aPlanet));
	const { ctx } = v;
	const sun = toPx(v, [0, 0]);
	const earth = toPx(v, p.E);
	const planet = toPx(v, p.P);
	// The Earth's orbit plays the epicycle for a superior planet, the deferent for an inferior one.
	const earthColor = m.superior ? COL.epicycle : COL.deferent;
	const planetColor = m.superior ? COL.deferent : COL.epicycle;

	drawZodiac(v);

	circle(ctx, sun, m.rEarth * v.s, earthColor, 1.8, [6, 5]);
	circle(ctx, sun, m.aPlanet * v.s, planetColor, 1.8, [6, 5]);

	// the true longitude is a direction: drawn from the centre, parallel to the sight line
	const lamDot = ringPoint(v, p.lam);
	line(ctx, sun, lamDot, COL.planet, 1, [2, 5]);

	// line of sight Earth -> planet, continued to the stars
	line(ctx, earth, rayToRing(v, earth, p.lam), COL.muted, 1.2, [4, 4]);
	line(ctx, earth, planet, COL.ink, 1.6);

	// the two radii that become the deferent and epicycle radii
	line(ctx, earth, sun, earthColor, 3);
	line(ctx, sun, planet, planetColor, 3);

	drawRingEvents(v, events);

	body(ctx, sun, 9, COL.sun, true);
	body(ctx, earth, 7, COL.earth);
	body(ctx, planet, 6, COL.planet);
	body(ctx, lamDot, 5, COL.planet);

	text(ctx, 'Sun', sun, COL.muted, 0, -20);
	text(ctx, 'Earth', earth, COL.earth, 0, 18);
	text(ctx, state.name, planet, COL.planet, 0, -16);

	const earthRole = m.superior ? 'epicycle' : 'deferent';
	const planetRole = m.superior ? 'deferent' : 'epicycle';

	byId('note-helio').innerHTML =
		`<span class="c-${earthRole}">■</span> Earth's orbit, which plays the ${earthRole} &nbsp; ` +
		`<span class="c-${planetRole}">■</span> ${state.name}'s orbit, which plays the ${planetRole}. ` +
		`The thick Earth→Sun and Sun→${state.name} radii are the same vectors as the two radii on the right. ` +
		`The red dot on the ring is the planet's longitude λ (the stars are infinitely far, so it is drawn parallel to the sight line).`;
}


/* ==========================================================================
   5. GEOCENTRIC VIEW
   ========================================================================== */

function drawGeo(m, p, events, trailStart) {
	const v = createView('cv-geo', m.R + m.r);
	const { ctx } = v;
	const earth = toPx(v, [0, 0]);
	const guide = toPx(v, p.G);
	const planet = toPx(v, p.z);
	const sunPos = [m.rEarth * cos(p.lamSun), m.rEarth * sin(p.lamSun)];
	const sun = toPx(v, sunPos);

	drawZodiac(v);

	// deferent, trail, epicycle
	circle(ctx, earth, m.R * v.s, COL.deferent, 1.8, [6, 5]);
	if (trailStart < state.t) {
		polyline(v, geocentricPath(m, trailStart, state.t), COL.planet, 2.2);
	}
	circle(ctx, guide, m.r * v.s, COL.epicycle, 1.8);

	// direction of the Sun
	line(ctx, earth, ringPoint(v, p.lamSun), COL.sun, 1.3, [2, 4]);

	// line of sight to the stars, then the two radii
	line(ctx, planet, ringPoint(v, p.lam), COL.muted, 1.2, [4, 4]);
	line(ctx, earth, planet, COL.ink, 1.6);
	line(ctx, earth, guide, COL.deferent, 3);
	line(ctx, guide, planet, COL.epicycle, 3);

	// events in the trail: on the path and on the ring
	events.forEach(e => marker(ctx, e.type, toPx(v, e.z), 6));
	drawRingEvents(v, events);

	body(ctx, sun, 8, COL.sun, true);
	body(ctx, guide, 4, COL.ink);
	body(ctx, earth, 8, COL.earth);
	body(ctx, planet, 6, COL.planet);
	body(ctx, ringPoint(v, p.lam), 5, COL.planet);

	text(ctx, 'Earth', earth, COL.earth, 0, 20);
	// for an inferior planet the guide point is the (mean) Sun itself
	if (m.superior) {
		text(ctx, 'Sun', sun, COL.muted, 0, -18);
		text(ctx, 'guide point', guide, COL.muted, 8, 14, 'left', 13);
	} else {
		text(ctx, 'Sun = guide point', sun, COL.muted, 0, -20, 'center', 13);
	}
	text(ctx, state.name, planet, COL.planet, 0, -16);

	const towards = m.superior
		? 'The epicycle radius always points towards the Sun (it is the Earth→Sun vector).'
		: 'The guide point is the mean Sun: the deferent is the Earth\'s orbit seen from the Earth.';
	const middle = m.superior
		? 'Opposition falls at the epicycle\'s perigee, in the middle of the loop.'
		: 'Inferior conjunction falls at the epicycle\'s perigee, in the middle of the loop.';

	byId('note-geo').innerHTML =
		`<span class="c-deferent">■</span> deferent (radius R) &nbsp; ` +
		`<span class="c-epicycle">■</span> epicycle (radius r). ${towards} ${middle}`;
}


/* ==========================================================================
   6. LONGITUDE CHART
   λ(t) over one synodic period either side of now, unwrapped so loops show
   as dips. Retrograde stretches are shaded.
   ========================================================================== */

function niceStep(range) {
	const steps = [1, 2, 5, 10, 15, 30, 45, 60, 90, 180, 360];

	return steps.find(s => range / s <= 7) || 360;
}

function drawLambdaChart(m, events) {
	const canvas = byId('cv-lambda');
	const ctx = canvas.getContext('2d');
	const W = canvas.width;
	const H = canvas.height;
	const pad = { l: 58, r: 14, t: 14, b: 40 };
	const half = synodicWindow(m);
	const t1 = state.t - half;
	const t2 = state.t + half;
	const N = 500;

	// unwrapped longitude samples
	const samples = [];
	let prev = null;
	let offset = 0;

	for (let i = 0; i <= N; i++) {
		const t = t1 + (t2 - t1) * i / N;
		const lam = positions(m, t).lam;

		if (prev !== null) {
			offset += wrap180(lam - prev) - (lam - prev);
		}

		samples.push({ t, y: lam + offset, rate: lambdaRate(m, t) });
		prev = lam;
	}

	let yMin = Math.min(...samples.map(s => s.y));
	let yMax = Math.max(...samples.map(s => s.y));
	const margin = Math.max(2, 0.06 * (yMax - yMin));
	yMin -= margin;
	yMax += margin;

	const X = t => pad.l + (t - t1) / (t2 - t1) * (W - pad.l - pad.r);
	const Y = y => H - pad.b - (y - yMin) / (yMax - yMin) * (H - pad.t - pad.b);

	ctx.clearRect(0, 0, W, H);

	// retrograde shading
	ctx.fillStyle = 'rgba(215, 122, 122, 0.13)';
	samples.forEach((s, i) => {
		if (i > 0 && s.rate < 0) {
			ctx.fillRect(X(samples[i - 1].t), pad.t, X(s.t) - X(samples[i - 1].t) + 0.5, H - pad.t - pad.b);
		}
	});

	// grid and labels
	ctx.font = '13px system-ui, sans-serif';
	ctx.textBaseline = 'middle';
	const yStep = niceStep(yMax - yMin);

	for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax; y += yStep) {
		ctx.strokeStyle = COL.line;
		ctx.lineWidth = 1;
		drawLine2D(ctx, pad.l, Y(y), W - pad.r, Y(y));
		ctx.fillStyle = COL.muted;
		ctx.textAlign = 'right';
		ctx.fillText(`${Math.round(norm360(y))}°`, pad.l - 8, Y(y));
	}

	const tStep = [10, 20, 50, 100, 200, 500, 1000].find(s => (t2 - t1) / s <= 8) || 1000;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'top';

	for (let t = Math.ceil(t1 / tStep) * tStep; t <= t2; t += tStep) {
		ctx.strokeStyle = COL.line;
		drawLine2D(ctx, X(t), H - pad.b, X(t), H - pad.b + 5);
		ctx.fillStyle = COL.muted;
		ctx.fillText(`${Math.round(t)}`, X(t), H - pad.b + 8);
	}

	ctx.fillText('time (days)', (pad.l + W - pad.r) / 2, H - 18);

	ctx.strokeStyle = COL.muted;
	ctx.strokeRect(pad.l, pad.t, W - pad.l - pad.r, H - pad.t - pad.b);

	// the curve
	ctx.strokeStyle = COL.planet;
	ctx.lineWidth = 2.2;
	ctx.beginPath();
	samples.forEach((s, i) => {
		if (i === 0) {
			ctx.moveTo(X(s.t), Y(s.y));
		} else {
			ctx.lineTo(X(s.t), Y(s.y));
		}
	});
	ctx.stroke();

	// events: place each on the unwrapped curve using the nearest sample
	events.forEach(e => {
		const i = Math.round((e.t - t1) / (t2 - t1) * N);
		const s = samples[clamp(i, 0, N)];
		const y = s.y + wrap180(e.lam - norm360(s.y));

		marker(ctx, e.type, { x: X(e.t), y: Y(y) }, 6);
	});

	// now
	ctx.strokeStyle = COL.ink;
	ctx.lineWidth = 1.2;
	drawLine2D(ctx, X(state.t), pad.t, X(state.t), H - pad.b);
}


/* ==========================================================================
   7. READ-OUTS AND TABLES
   ========================================================================== */

function fmtDay(t) {
	return `day ${Math.round(t)} (${(t / YEAR).toFixed(2)} yr)`;
}

function updateClock() {
	byId('clock').textContent = `t = ${fmtDay(state.t)}`;
}

function renderReadout(m, p) {
	const rate = lambdaRate(m, state.t);
	const mu = norm360(p.thEp - p.thD);
	const muS = stationAnomaly(m);
	const motion = Math.abs(rate) < 1e-3 ? 'stationary' : (rate < 0 ? 'retrograde' : 'direct');
	const lhs = m.r * m.we;
	const rhs = m.R * m.wd;
	const synodic = isFinite(m.synodic) ? `${m.synodic.toFixed(1)}\\ \\text{d}=${(m.synodic / YEAR).toFixed(3)}\\ \\text{yr}` : '\\infty';
	const lines = [
		`\\lambda=${dms(p.lam)}\\ \\text{(planet)}`,
		`\\lambda_\\odot=${dms(p.lamSun)}\\ \\text{(Sun)}`,
		`\\text{elongation }\\lambda-\\lambda_\\odot=${dms(wrap180(p.lam - p.lamSun))}`,
		`\\mu=\\theta_e-\\theta_d=${dms(mu)}`,
		`\\dfrac{d\\lambda}{dt}=${rate.toFixed(4)}^\\circ/\\text{d}`,
		`\\omega_d=${m.wd.toFixed(4)}^\\circ/\\text{d},\\quad \\omega_e=${m.we.toFixed(4)}^\\circ/\\text{d}`,
		`r\\,\\omega_e=${lhs.toFixed(4)}\\ ${lhs > rhs ? '>' : '\\le'}\\ R\\,\\omega_d=${rhs.toFixed(4)}`,
		`\\text{synodic period }S=${synodic}`
	];

	if (muS !== null) {
		const duration = 2 * muS / Math.abs(m.we - m.wd);
		const arc = 2 * Math.abs(retrogradeHalfArc(m, muS));

		lines.push(`\\text{stations at }\\mu=180^\\circ\\mp\\mu_s,\\ \\mu_s=${dms(muS)}`);
		lines.push(`\\text{retrograde arc}=${dms(arc)},\\ \\text{lasting }${duration.toFixed(1)}\\ \\text{d}`);
	}

	if (!m.superior) {
		lines.push(`\\text{max elongation}=\\sin^{-1}(r/R)=${dms(asin(m.r / m.R))}`);
	}

	showLines('o-live', lines);
	appendBadge('o-live', 'Motion now:', motion);
	appendBadge('o-live', 'Retrograde loops:', muS !== null ? 'yes, r ω<sub>e</sub> &gt; R ω<sub>d</sub>' : 'none, r ω<sub>e</sub> ≤ R ω<sub>d</sub>');
}

/* Longitude change between a station and the middle of the loop. */
function retrogradeHalfArc(m, muS) {
	// direction of z relative to the guide point direction, at anomaly mu
	const angle = mu => atan2d(m.r * sin(mu), m.R + m.r * cos(mu));
	// the guide point moves on while the anomaly goes from 180° - muS to 180°
	const dt = muS / Math.abs(m.we - m.wd);

	return m.wd * dt - angle(180 - muS);
}

function buildEventsTable(m) {
	const table = byId('events');
	const S = synodicWindow(m);
	const middleName = m.superior ? 'Opposition' : 'Inferior conj.';
	const farName = m.superior ? 'Conjunction' : 'Superior conj.';
	const cell = e => e ? `${e.t.toFixed(1)}<br>${dms(e.lam)}` : '—';
	let rows = '';

	for (let k = 0; k < 6; k++) {
		const centre = k * S;
		const events = findEvents(m, centre - S / 2, centre + S / 2);
		const pick = type => events.find(e => e.type === type);
		const s1 = pick('station1');
		const s2 = pick('station2');
		const mid = pick(m.superior ? 'opp' : 'iconj');
		const far = findEvents(m, centre, centre + S).find(e => e.type === (m.superior ? 'conj' : 'sconj'));
		const arc = (s1 && s2) ? dms(Math.abs(wrap180(s2.lam - s1.lam))) : '—';
		const duration = (s1 && s2) ? `${(s2.t - s1.t).toFixed(1)} d` : '—';

		rows += `<tr><td>${k + 1}</td><td>${cell(s1)}</td><td>${cell(mid)}</td><td>${cell(s2)}</td>` +
			`<td>${arc}</td><td>${duration}</td><td>${cell(far)}</td></tr>`;
	}

	table.innerHTML =
		`<tr><th>Cycle</th><th>Station (retrograde begins)</th><th>${middleName}</th><th>Station (direct again)</th>` +
		`<th>Retrograde arc</th><th>Duration</th><th>Next ${farName.toLowerCase()}</th></tr>` + rows;

	byId('table-note').textContent =
		`Each cell gives the day and the geocentric longitude λ. Day 0 is a${m.superior ? 'n opposition' : 'n inferior conjunction'} at λ = 0°. ` +
		'With circular orbits every cycle is identical, only shifted along the zodiac: compare the arcs and durations with the observed values in the book\'s tables.';
}

function buildRatiosTable() {
	let rows = '';

	Object.values(PLANETS).forEach(planet => {
		const copernicus = planet.type === 'superior' ? 1 / planet.a : planet.a;

		rows += `<tr><td>${planet.name}</td><td>${planet.type}</td><td>${planet.ptolemy.toFixed(2)}</td>` +
			`<td>${(planet.ptolemy / 60).toFixed(3)}</td><td>${planet.a.toFixed(3)} AU</td><td>${copernicus.toFixed(3)}</td></tr>`;
	});

	byId('ratios').innerHTML =
		'<tr><th>Planet</th><th>Type</th><th>Ptolemy r (R = 60)</th><th>Ptolemy r/R</th><th>a</th><th>Heliocentric r/R</th></tr>' + rows;
}


/* ==========================================================================
   8. ANIMATION AND UI WIRING
   ========================================================================== */

function render(force = true) {
	const m = readModel();
	const p = positions(m, state.t);
	const S = synodicWindow(m);
	const trailStart = state.t - readNumber('trail') * S;
	const trailEvents = findEvents(m, trailStart, state.t + 1e-6);
	const chartEvents = findEvents(m, state.t - S, state.t + S);

	if (m.kepler) {
		byId('T').value = m.periodYears;
		byId('T').parentElement.querySelector('output').textContent = `${m.periodYears.toFixed(2)} yr`;
	}

	drawHelio(m, p, trailEvents);
	drawGeo(m, p, trailEvents, trailStart);
	drawLambdaChart(m, chartEvents);
	updateClock();

	// KaTeX is the slow part: refresh it at most ten times a second while playing
	const now = performance.now();

	if (force || now - state.lastReadout > 100) {
		renderReadout(m, p);
		state.lastReadout = now;
	}
}

function onParametersChanged() {
	const m = readModel();

	byId('T').disabled = m.kepler;
	buildEventsTable(m);
	render();
}

function frame(time) {
	if (!state.playing) {
		return;
	}

	if (state.lastFrame !== null) {
		const seconds = Math.min(0.1, (time - state.lastFrame) / 1000);

		state.t += seconds * readNumber('speed');
	}

	state.lastFrame = time;
	render(false);
	requestAnimationFrame(frame);
}

function setPlaying(playing) {
	state.playing = playing;
	state.lastFrame = null;
	byId('play').textContent = playing ? '⏸ Pause' : '▶ Play';

	if (playing) {
		requestAnimationFrame(frame);
	} else {
		render();
	}
}

/* Jump to the next (direction = +1) or previous (-1) event. */
function jumpToEvent(direction) {
	const m = readModel();
	const S = synodicWindow(m);
	const events = direction > 0
		? findEvents(m, state.t + 0.01, state.t + S)
		: findEvents(m, state.t - S, state.t - 0.01);
	const target = direction > 0 ? events[0] : events[events.length - 1];

	setPlaying(false);

	if (target) {
		state.t = target.t;
	}

	render();
}

/* Start some way before the first opposition so a loop is drawn early. */
function resetTime() {
	const m = readModel();

	state.t = -0.3 * synodicWindow(m);
}

/* Slider outputs with a chosen number of decimals (data-dec). */
function syncOutput(input) {
	const output = input.parentElement.querySelector('output');
	const decimals = Number(input.dataset.dec || 0);

	output.textContent = Number(input.value).toFixed(decimals) + (input.dataset.unit || '');
}

function setActive(containerId, button) {
	document.querySelectorAll(`#${containerId} button`).forEach(b => {
		b.classList.toggle('active', b === button);
	});
}

function setType(type) {
	state.type = type;
	setActive('types', document.querySelector(`#types button[data-type="${type}"]`));
}

function choosePlanet(key) {
	const planet = PLANETS[key];

	state.name = planet.name;
	setType(planet.type);
	byId('R').value = planet.type === 'superior' ? planet.a : 1;
	byId('r').value = planet.type === 'superior' ? 1 : planet.a;
	byId('T').value = planet.T;
	byId('kepler').checked = true;
	['R', 'r', 'T'].forEach(id => syncOutput(byId(id)));
	setActive('planets', document.querySelector(`#planets button[data-planet="${key}"]`));
	resetTime();
	onParametersChanged();
}

/* The epicycle must stay smaller than the deferent. */
function keepEpicycleInside(changedId) {
	const R = byId('R');
	const r = byId('r');

	if (Number(r.value) > 0.95 * Number(R.value)) {
		if (changedId === 'R') {
			r.value = 0.95 * Number(R.value);
			syncOutput(r);
		} else {
			R.value = Number(r.value) / 0.95;
			syncOutput(R);
		}
	}
}

/* Any manual change to the model makes it a custom planet. */
function markCustom() {
	state.name = 'Planet';
	setActive('planets', null);
}

function initUI() {
	document.querySelectorAll('#frames input[type=range]').forEach(input => {
		syncOutput(input);

		input.addEventListener('input', () => {
			syncOutput(input);

			if (['R', 'r', 'T'].includes(input.id)) {
				keepEpicycleInside(input.id);
				markCustom();
				onParametersChanged();
			} else if (!state.playing) {
				render();
			}
		});
	});

	byId('kepler').addEventListener('change', () => {
		markCustom();
		onParametersChanged();
	});

	document.querySelectorAll('#planets button').forEach(button => {
		button.addEventListener('click', () => choosePlanet(button.dataset.planet));
	});

	document.querySelectorAll('#types button').forEach(button => {
		button.addEventListener('click', () => {
			setType(button.dataset.type);
			markCustom();
			onParametersChanged();
		});
	});

	byId('play').addEventListener('click', () => setPlaying(!state.playing));
	byId('next').addEventListener('click', () => jumpToEvent(1));
	byId('prev').addEventListener('click', () => jumpToEvent(-1));
	byId('reset').addEventListener('click', () => {
		resetTime();
		render();
	});
}

/* Animate only while this tab is shown: pause when leaving it and resume
   on return if it was playing. The first visit starts the animation. */
let onThisTab = byId('frames').classList.contains('show');
let resumeOnReturn = true;

function onTabClick(tabId) {
	const entering = tabId === 'frames';

	if (entering && !onThisTab && resumeOnReturn) {
		setPlaying(true);
	} else if (!entering && onThisTab) {
		resumeOnReturn = state.playing;
		setPlaying(false);
	}

	onThisTab = entering;
}

initUI();

document.querySelectorAll('#tabs button').forEach(button => {
	button.addEventListener('click', () => onTabClick(button.dataset.tab));
});

/* KaTeX is loaded with `defer`, so wait for the page to finish loading. */
window.addEventListener('load', () => {
	renderStaticMath();
	buildRatiosTable();
	choosePlanet('mars');

	if (onThisTab) {
		setPlaying(true);
	}
});

})();
