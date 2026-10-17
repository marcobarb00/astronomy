/* ==========================================================================
   HIPPARCHUS' MODEL - PAGE LIBRARY (hipparchus_model.js)
   Needs ../shared/common.js to be loaded first. Every tab_*.js file is
   loaded after this one and registers itself with registerTab().

   TABLE OF CONTENTS
	 0. Page constants
	 1. Small math helpers      (3D rotations, angles, years, sexagesimal)
	 2. DOM helpers
	 3. 2D canvas helpers       (a "plane" = canvas + origin + scale)
	 4. Chart helpers           (axes, ticks, curves)
	 5. Players                 (play / pause buttons and the animation loop)
	 6. Tab registry and UI wiring
   ========================================================================== */


/* ==========================================================================
   0. PAGE CONSTANTS
   ========================================================================== */

/* Modern rate of precession in longitude: 50.29" per year (in degrees). */
const PRECESSION_MODERN = 50.29 / 3600;

/* Hipparchus' tropical year: 365 + 1/4 - 1/300 days (Almagest III 1). */
const YEAR_HIPPARCHUS = 365 + 1 / 4 - 1 / 300;

/* Babylonian synodic month 29;31,50,8,20 days, used by Hipparchus (Almagest IV 2). */
const MONTH_BABYLONIAN = 29 + 31 / 60 + 50 / 3600 + 8 / 216000 + 20 / 12960000;

/* Font used by every label drawn on a canvas. */
const CANVAS_FONT = 'system-ui, sans-serif';


/* ==========================================================================
   1. SMALL MATH HELPERS
   ========================================================================== */

/* Wrap an angle to the interval [-180, 180). */
const wrap180 = x => norm360(x + 180) - 180;

/* ---------- 3D vectors ---------- */
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const length3 = v => Math.sqrt(dot3(v, v));
const unit3 = v => scale(v, 1 / length3(v));

function cross3(a, b) {
	return [
		a[1] * b[2] - a[2] * b[1],
		a[2] * b[0] - a[0] * b[2],
		a[0] * b[1] - a[1] * b[0]
	];
}

/* Rotate v about the unit vector axis by angle degrees (Rodrigues' formula). */
function rotateAbout(v, axis, angle) {
	const c = cos(angle);
	const s = sin(angle);
	const along = scale(axis, dot3(axis, v) * (1 - c));
	const across = scale(cross3(axis, v), s);

	return add3(add3(scale(v, c), across), along);
}

/* Unit vector with longitude lon and latitude lat in the world basis. */
function fromLonLat(lon, lat) {
	return [cos(lat) * cos(lon), cos(lat) * sin(lon), sin(lat)];
}

/* Longitude and latitude (degrees) of a vector in the world basis. */
function toLonLat(v) {
	const u = unit3(v);

	return {
		lon: norm360(atan2d(u[1], u[0])),
		lat: asin(u[2])
	};
}

/* Great circle with the given pole, as a list of 3D points. */
function greatCircle(pole, radius = 1) {
	const helper = Math.abs(pole[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
	const a = unit3(cross3(pole, helper));
	const b = cross3(pole, a);

	return sampleCircle(a, b, radius);
}

/* Small circle at angular distance rho from a pole. */
function smallCircle(pole, rho) {
	const helper = Math.abs(pole[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
	const a = unit3(cross3(pole, helper));
	const b = cross3(pole, a);

	return sampleParametric(t => {
		const ring = lin2(a, b, sin(rho) * cos(t), sin(rho) * sin(t));

		return add3(ring, scale(pole, cos(rho)));
	});
}

/* ---------- Celestial coordinates (obliquity EPS) ---------- */

/* Equatorial unit vector -> ecliptic { lon, lat }. */
function equatorialToEcliptic(v) {
	const y = v[1] * cosEps + v[2] * sinEps;
	const z = -v[1] * sinEps + v[2] * cosEps;

	return toLonLat([v[0], y, z]);
}

/* Ecliptic (lon, lat) -> equatorial unit vector. */
function eclipticToEquatorial(lon, lat) {
	const e = fromLonLat(lon, lat);

	return [e[0], e[1] * cosEps - e[2] * sinEps, e[1] * sinEps + e[2] * cosEps];
}

/* J2000 ecliptic coordinates of a star given as { ra: [h, m], dec }. */
function starEcliptic(star) {
	const raDegrees = 15 * (star.ra[0] + star.ra[1] / 60);

	return equatorialToEcliptic(fromLonLat(raDegrees, star.dec));
}

/* Ecliptic longitude of a star in a given year, from its J2000 value,
   with a uniform precession of PRECESSION_MODERN per year. */
function longitudeAtEpoch(lonJ2000, year) {
	return norm360(lonJ2000 + PRECESSION_MODERN * (year - 2000));
}

/* ---------- Years and numbers ---------- */

/* Astronomical year (0 = 1 BCE, -128 = 129 BCE) as readable text. */
function formatYear(year) {
	const rounded = Math.round(year);

	if (rounded <= 0) {
		return `${1 - rounded} BCE`;
	}

	return `${rounded} CE`;
}

/* A positive number in Ptolemy's sexagesimal notation, e.g. 4.7667 -> "4;46". */
function sexagesimal(value, places = 1) {
	let whole = Math.floor(value);
	let rest = value - whole;
	const digits = [];

	for (let i = 0; i < places; i++) {
		rest *= 60;
		digits.push(Math.floor(rest + 1e-9));
		rest -= digits[i];
	}

	// round the last digit and carry
	if (rest >= 0.5) {
		digits[places - 1]++;
	}

	for (let i = places - 1; i > 0; i--) {
		if (digits[i] === 60) {
			digits[i] = 0;
			digits[i - 1]++;
		}
	}

	if (digits[0] === 60) {
		digits[0] = 0;
		whole++;
	}

	return `${whole};${digits.map(pad2).join(',')}`;
}


/* ==========================================================================
   2. DOM HELPERS
   ========================================================================== */

/* Create an element with an optional class name and text content. */
function el(tag, className, text) {
	const element = document.createElement(tag);

	if (className) {
		element.className = className;
	}

	if (text) {
		element.textContent = text;
	}

	return element;
}

/* Mark one button of a group as active (class "active"). */
function setActiveButton(containerId, activeButton) {
	document.querySelectorAll(`#${containerId} button`).forEach(button => {
		button.classList.toggle('active', button === activeButton);
	});
}

/* Slider read-out with a fixed number of decimals (data-dec) and a unit
   (data-unit, which may be empty). Used where the shared formatter, which
   defaults to degrees and one decimal, would be misleading. */
function formatDecimalOutput(input) {
	const decimals = Number(input.dataset.dec);
	const unit = input.dataset.unit || '';
	const output = input.parentElement.querySelector('output');

	output.textContent = Number(input.value).toFixed(decimals) + unit;
}

/* Wire a group of choice buttons (data-choice) to a callback. */
function wireChoices(containerId, onChoose) {
	document.querySelectorAll(`#${containerId} button`).forEach(button => {
		button.addEventListener('click', () => {
			setActiveButton(containerId, button);
			onChoose(button.dataset.choice);
		});
	});
}

/* Set several sliders at once and fire one input event per slider.
   values: { sliderId: number, ... } */
function setSliders(values) {
	Object.keys(values).forEach(id => {
		const slider = byId(id);

		slider.value = values[id];
		slider.dispatchEvent(new Event('input'));
	});
}


/* ==========================================================================
   3. 2D CANVAS HELPERS
   A plane maps model coordinates (y up) to canvas pixels:
   pixel = center + scale * (x, -y).
   ========================================================================== */

function createPlane(canvasId, unitsAcross, center) {
	const canvas = byId(canvasId);
	const origin = center || [canvas.width / 2, canvas.height / 2];

	return {
		canvas: canvas,
		ctx: canvas.getContext('2d'),
		cx: origin[0],
		cy: origin[1],
		s: Math.min(canvas.width, canvas.height) / unitsAcross
	};
}

function clearPlane(plane) {
	plane.ctx.clearRect(0, 0, plane.canvas.width, plane.canvas.height);
}

/* Model point [x, y] -> pixel {x, y}. */
function toScreen(plane, point) {
	return {
		x: plane.cx + plane.s * point[0],
		y: plane.cy - plane.s * point[1]
	};
}

/* Point at distance r and angle degrees (counter-clockwise) from center. */
function polarPoint(center, r, degrees) {
	return [center[0] + r * cos(degrees), center[1] + r * sin(degrees)];
}

/* Apply a stroke style (colour, width, dash) to a context. */
function setStroke(ctx, color, width, dash = []) {
	ctx.strokeStyle = color;
	ctx.lineWidth = width;
	ctx.setLineDash(dash);
}

function strokeSegment(plane, a, b, color, width, dash = []) {
	const p = toScreen(plane, a);
	const q = toScreen(plane, b);

	setStroke(plane.ctx, color, width, dash);
	drawLine2D(plane.ctx, p.x, p.y, q.x, q.y);
	plane.ctx.setLineDash([]);
}

function strokeCircle(plane, center, r, color, width, dash = []) {
	const c = toScreen(plane, center);

	setStroke(plane.ctx, color, width, dash);
	plane.ctx.beginPath();
	plane.ctx.arc(c.x, c.y, r * plane.s, 0, TAU);
	plane.ctx.stroke();
	plane.ctx.setLineDash([]);
}

/* Open polyline through model points. */
function strokePolyline(plane, points, color, width, dash = []) {
	const { ctx } = plane;

	setStroke(ctx, color, width, dash);
	ctx.beginPath();

	points.forEach((point, i) => {
		const q = toScreen(plane, point);

		if (i === 0) {
			ctx.moveTo(q.x, q.y);
		} else {
			ctx.lineTo(q.x, q.y);
		}
	});

	ctx.stroke();
	ctx.setLineDash([]);
}

/* Arc of a circle (model units) from angle a1 to a2, counter-clockwise. */
function strokeArc(plane, center, r, a1, a2, color, width, dash = []) {
	const c = toScreen(plane, center);

	setStroke(plane.ctx, color, width, dash);
	plane.ctx.beginPath();
	// canvas angles grow clockwise, so negate them and draw anticlockwise
	plane.ctx.arc(c.x, c.y, r * plane.s, -a1 * D2R, -a2 * D2R, true);
	plane.ctx.stroke();
	plane.ctx.setLineDash([]);
}

/* Filled wedge (pie slice) between two angles, translucent. */
function fillWedge(plane, center, r, a1, a2, color, alpha) {
	const { ctx } = plane;
	const c = toScreen(plane, center);

	ctx.globalAlpha = alpha;
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.moveTo(c.x, c.y);
	ctx.arc(c.x, c.y, r * plane.s, -a1 * D2R, -a2 * D2R, true);
	ctx.closePath();
	ctx.fill();
	ctx.globalAlpha = 1;
}

/* Filled disc at a model point; radius in pixels. */
function fillDot(plane, point, radiusPx, color, alpha = 1) {
	const q = toScreen(plane, point);

	plane.ctx.globalAlpha = alpha;
	drawDisc(plane.ctx, q.x, q.y, radiusPx, color);
	plane.ctx.globalAlpha = 1;
}

/* Text at a model point, shifted by (dx, dy) pixels.
   options: color, align, size, weight, baseline */
function drawText(plane, text, point, dx = 0, dy = 0, options = {}) {
	const { ctx } = plane;
	const q = toScreen(plane, point);
	const {
		color = COL.ink,
		align = 'center',
		size = 16,
		weight = 400,
		baseline = 'middle'
	} = options;

	ctx.fillStyle = color;
	ctx.font = `${weight} ${size}px ${CANVAS_FONT}`;
	ctx.textAlign = align;
	ctx.textBaseline = baseline;
	ctx.fillText(text, q.x + dx, q.y + dy);
}

/* Arrow between two model points: shaft plus filled head. */
function drawArrow2D(plane, from, to, color, width) {
	const { ctx } = plane;
	const a = toScreen(plane, from);
	const b = toScreen(plane, to);
	const angle = Math.atan2(b.y - a.y, b.x - a.x);
	const shaftEnd = backOff(b, angle, 0.6 * ARROW_HEAD_SIZE);
	const headLeft = backOff(b, angle - 0.4, ARROW_HEAD_SIZE);
	const headRight = backOff(b, angle + 0.4, ARROW_HEAD_SIZE);

	setStroke(ctx, color, width);
	ctx.fillStyle = color;

	// shaft
	drawLine2D(ctx, a.x, a.y, shaftEnd.x, shaftEnd.y);

	// head
	ctx.beginPath();
	ctx.moveTo(b.x, b.y);
	ctx.lineTo(headLeft.x, headLeft.y);
	ctx.lineTo(headRight.x, headRight.y);
	ctx.closePath();
	ctx.fill();
}


/* ==========================================================================
   4. CHART HELPERS
   A chart maps data (x, y) into a framed rectangle of a canvas.
   ========================================================================== */

/* options: xMin, xMax, yMin, yMax, pad {l, r, t, b} */
function createChart(canvasId, options) {
	const canvas = byId(canvasId);
	const pad = options.pad || { l: 64, r: 18, t: 16, b: 46 };
	const width = canvas.width - pad.l - pad.r;
	const height = canvas.height - pad.t - pad.b;

	return {
		canvas: canvas,
		ctx: canvas.getContext('2d'),
		pad: pad,
		xMin: options.xMin,
		xMax: options.xMax,
		yMin: options.yMin,
		yMax: options.yMax,
		X: x => pad.l + (x - options.xMin) / (options.xMax - options.xMin) * width,
		Y: y => pad.t + (options.yMax - y) / (options.yMax - options.yMin) * height
	};
}

/* Frame, grid lines and tick labels. format(x) turns a tick into text. */
function drawChartAxes(chart, xStep, yStep, xFormat, yFormat, xTitle, yTitle) {
	const { ctx, pad, canvas } = chart;
	const right = canvas.width - pad.r;
	const bottom = canvas.height - pad.b;

	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.font = `14px ${CANVAS_FONT}`;
	ctx.fillStyle = COL.muted;

	// horizontal grid and y labels
	ctx.textAlign = 'right';
	ctx.textBaseline = 'middle';

	for (let y = Math.ceil(chart.yMin / yStep) * yStep; y <= chart.yMax + 1e-9; y += yStep) {
		setStroke(ctx, COL.line, 1);
		drawLine2D(ctx, pad.l, chart.Y(y), right, chart.Y(y));
		ctx.fillText(yFormat(y), pad.l - 8, chart.Y(y));
	}

	// vertical grid and x labels
	ctx.textAlign = 'center';
	ctx.textBaseline = 'top';

	for (let x = Math.ceil(chart.xMin / xStep) * xStep; x <= chart.xMax + 1e-9; x += xStep) {
		setStroke(ctx, COL.line, 1);
		drawLine2D(ctx, chart.X(x), pad.t, chart.X(x), bottom);
		ctx.fillText(xFormat(x), chart.X(x), bottom + 6);
	}

	// axis titles
	ctx.fillText(xTitle, (pad.l + right) / 2, bottom + 26);
	ctx.save();
	ctx.translate(16, (pad.t + bottom) / 2);
	ctx.rotate(-Math.PI / 2);
	ctx.textBaseline = 'middle';
	ctx.fillText(yTitle, 0, 0);
	ctx.restore();

	// frame
	setStroke(ctx, COL.muted, 1);
	ctx.strokeRect(pad.l, pad.t, right - pad.l, bottom - pad.t);
}

/* Curve through data points [[x, y], ...]. */
function plotCurve(chart, points, color, width, dash = []) {
	const { ctx } = chart;

	setStroke(ctx, color, width, dash);
	ctx.beginPath();

	points.forEach(([x, y], i) => {
		if (i === 0) {
			ctx.moveTo(chart.X(x), chart.Y(y));
		} else {
			ctx.lineTo(chart.X(x), chart.Y(y));
		}
	});

	ctx.stroke();
	ctx.setLineDash([]);
}

/* Vertical line across the chart at data x. */
function plotVertical(chart, x, color, width, dash = []) {
	const { ctx, pad, canvas } = chart;

	setStroke(ctx, color, width, dash);
	drawLine2D(ctx, chart.X(x), pad.t, chart.X(x), canvas.height - pad.b);
	ctx.setLineDash([]);
}

/* Data point with a label next to it. */
function plotPoint(chart, x, y, color, text, dx = 8, dy = -8) {
	const { ctx } = chart;

	drawDisc(ctx, chart.X(x), chart.Y(y), 5, color);

	if (text) {
		ctx.fillStyle = COL.ink;
		ctx.font = `14px ${CANVAS_FONT}`;
		ctx.textAlign = dx < 0 ? 'right' : 'left';
		ctx.textBaseline = 'middle';
		ctx.fillText(text, chart.X(x) + dx, chart.Y(y) + dy);
	}
}


/* ==========================================================================
   5. PLAYERS
   A player is a play / pause button with a step(seconds) callback.
   One requestAnimationFrame loop drives the player of the visible tab.
   ========================================================================== */

const players = {};

/* tabId: the tab that owns the player; step(dt) advances the model by dt
   seconds of real time and redraws. */
function createPlayer(tabId, buttonId, step) {
	const button = byId(buttonId);
	const playText = button.textContent;
	const player = {
		playing: false,
		step: step,
		set(isPlaying) {
			player.playing = isPlaying;
			button.textContent = isPlaying ? '⏸ Pause' : playText;
		}
	};

	button.addEventListener('click', () => player.set(!player.playing));
	players[tabId] = player;

	return player;
}

let lastFrameTime = null;

/* The loop always runs, but only advances the player of the visible tab. */
function animationLoop(time) {
	const dt = (lastFrameTime === null) ? 0 : Math.min(0.1, (time - lastFrameTime) / 1000);
	const player = players[currentTab];

	lastFrameTime = time;

	if (player && player.playing) {
		player.step(dt);
	}

	requestAnimationFrame(animationLoop);
}


/* ==========================================================================
   6. TAB REGISTRY AND UI WIRING
   Each tab file calls registerTab(id, { init, render }). init() wires its
   own controls; render() redraws the tab. Sliders, presets and draggable
   spheres are wired here for the whole page.
   ========================================================================== */

const tabs = {};

let currentTab = 'start';

function registerTab(tabId, module) {
	tabs[tabId] = module;
}

function renderCurrentTab() {
	if (tabs[currentTab]) {
		tabs[currentTab].render();
	}
}

function selectTab(tabId) {
	currentTab = tabId;
	renderCurrentTab();
}

function initPage() {
	wireTabs('tabs', selectTab);

	document.querySelectorAll('input[type=range]').forEach(input => {
		wireSlider(input, renderCurrentTab);
	});

	// registered after wireSlider, so these read-outs win
	document.querySelectorAll('input[type=range][data-dec]').forEach(input => {
		input.addEventListener('input', () => formatDecimalOutput(input));
		formatDecimalOutput(input);
	});

	document.querySelectorAll('.presets button[data-target]').forEach(button => {
		button.addEventListener('click', () => applyPreset(button));
	});

	document.querySelectorAll('canvas.sph').forEach(canvas => {
		wireDragRotation(canvas, renderCurrentTab);
	});

	Object.keys(tabs).forEach(tabId => {
		if (tabs[tabId].init) {
			tabs[tabId].init();
		}
	});
}

/* KaTeX is loaded with `defer`, so wait for the page to finish loading. */
window.addEventListener('load', () => {
	initPage();
	renderStaticMath();
	renderCurrentTab();
	requestAnimationFrame(animationLoop);
});
