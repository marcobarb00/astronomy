/* ==========================================================================
   MODERN ALMAGEST - SHARED LIBRARY (common.js)
   Loaded by every simulation, before its own script.
   Contains nothing specific to one chapter.

   TABLE OF CONTENTS
	 1. Constants and shared palette
	 2. Math helpers          (trigonometry in degrees, vectors, sampling)
	 3. Formatting helpers    (degrees, hours, days, TeX fragments)
	 4. DOM and KaTeX helpers
	 5. Canvas helpers        (stage, 3D projection, drawing primitives)
	 6. UI wiring helpers     (sliders, presets, dragging, tabs)
   ========================================================================== */


/* ==========================================================================
   1. CONSTANTS AND SHARED PALETTE
   ========================================================================== */

/* Shared palette - must mirror the :root variables in the CSS. */
const COL = {
	bg:       '#f6f4ef',
	card:     '#ffffff',
	ink:      '#2f3440',
	muted:    '#7b8190',
	line:     '#e2ded4',
	earth:    '#6f9bd1',
	planet:   '#d77a7a',
	sun:      '#e6b450',
	deferent: '#8fbf9f',
	epicycle: '#a58bd0'
};

const TAU = 2 * Math.PI;
const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

const EPS = 23 + 26 / 60;        // obliquity of the ecliptic (deg)

const SPHERE_RADIUS = 185;       // radius of the drawn sphere (px)
const POLE_LENGTH = 1.15;        // poles are drawn slightly outside the sphere
const FAR_SIDE_ALPHA = 0.25;     // opacity of path segments behind the sphere
const FAR_ARROW_ALPHA = 0.35;    // opacity of arrows pointing away from the viewer
const ARROW_HEAD_SIZE = 11;      // px

const ORIGIN = [0, 0, 0];


/* ==========================================================================
   2. MATH HELPERS
   ========================================================================== */

/* ---------- Trigonometry in degrees ---------- */
const sin = x => Math.sin(x * D2R);
const cos = x => Math.cos(x * D2R);
const tan = x => Math.tan(x * D2R);

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

/* asin / acos clamp their argument so rounding noise never produces NaN. */
const asin = x => Math.asin(clamp(x, -1, 1)) * R2D;
const acos = x => Math.acos(clamp(x, -1, 1)) * R2D;
const atan2d = (y, x) => Math.atan2(y, x) * R2D;

const norm360 = x => ((x % 360) + 360) % 360;

/* Obliquity of the ecliptic, as sine and cosine. */
const cosEps = cos(EPS);
const sinEps = sin(EPS);

/* ---------- 3D vectors (plain arrays [x, y, z]) ---------- */
const scale = (v, k) => v.map(x => x * k);
const negate = v => scale(v, -1);
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/* x*a + y*b */
function lin2(a, b, x, y) {
	return [0, 1, 2].map(i => x * a[i] + y * b[i]);
}

/* x*e1 + y*e2 + z*e3, where the axes come from a frame (see section 6). */
function lin3(frame, x, y, z) {
	const [e1, e2, e3] = frame.axes;

	return [0, 1, 2].map(i => x * e1[i] + y * e2[i] + z * e3[i]);
}

/* Unit vector with the given (longitude, latitude) in a frame:
   cos(lat)cos(lon) e1 + cos(lat)sin(lon) e2 + sin(lat) e3 */
function vec(frame, lon, lat) {
	return lin3(frame, cos(lat) * cos(lon), cos(lat) * sin(lon), sin(lat));
}

/* ---------- Sampling curves as lists of 3D points ---------- */

/* Sample fn(t) for t = 0..360 degrees. */
function sampleParametric(fn, step = 3) {
	const points = [];

	for (let t = 0; t <= 360; t += step) {
		points.push(fn(t));
	}

	return points;
}

/* Point at the given angle on the circle spanned by unit vectors a, b. */
function arcPoint(a, b, angle, radius = 1) {
	return scale(lin2(a, b, cos(angle), sin(angle)), radius);
}

/* Full circle spanned by a and b. */
function sampleCircle(a, b, radius = 1) {
	return sampleParametric(t => arcPoint(a, b, t, radius));
}

/* Arc from a towards b, sweeping 'angle' degrees. */
function sampleArc(a, b, angle, radius, steps = 40) {
	const points = [];

	for (let i = 0; i <= steps; i++) {
		points.push(arcPoint(a, b, angle * i / steps, radius));
	}

	return points;
}

/* Equator-like ring (e1, e2 plane) of a frame. */
function ringPoints(frame) {
	return sampleCircle(frame.axes[0], frame.axes[1]);
}


/* ==========================================================================
   3. FORMATTING HELPERS
   ========================================================================== */

const pad2 = n => String(n).padStart(2, '0');
const fmt3 = x => x.toFixed(3);

/* Split a value into whole units and a rounded remainder in 1/base units.
   Handles the carry (e.g. 59.9 min -> next unit). */
function splitWithCarry(value, base) {
	let whole = Math.floor(value);
	let rest = Math.round((value - whole) * base);

	if (rest === base) {
		whole++;
		rest = 0;
	}

	return { whole, rest };
}

/* Degrees -> "D°MM'" */
function dms(degrees) {
	const sign = degrees < 0 ? '-' : '';
	const { whole, rest } = splitWithCarry(Math.abs(degrees), 60);

	return `${sign}${whole}°${pad2(rest)}'`;
}

/* Hours -> "13h14m" */
function hm(hours) {
	const { whole, rest } = splitWithCarry(hours, 60);

	return `${whole}h${pad2(rest)}m`;
}

/* Days -> "61d06h" (polar day / night last days, not hours) */
function dh(days) {
	const { whole, rest } = splitWithCarry(days, 24);

	return `${whole}d${pad2(rest)}h`;
}

/* The same two formats typeset for KaTeX. */
function hmTex(hours) {
	const { whole, rest } = splitWithCarry(hours, 60);

	return `${whole}\\,\\text{h}\\,${pad2(rest)}\\,\\text{min}`;
}

function dhTex(days) {
	const { whole, rest } = splitWithCarry(days, 24);

	return `${whole}\\,\\text{d}\\,${pad2(rest)}\\,\\text{h}`;
}

/* ---------- TeX fragments for the live read-outs ---------- */

/* Signed number with three decimals: "+0.500" / "-0.500". */
const signed3 = x => (x < 0 ? '-' : '+') + Math.abs(x).toFixed(3);

/* "\alpha=12°30'" */
const texAngle = (symbol, degrees) => `${symbol}=${dms(degrees)}`;

/* "\mathbf r\cdot\mathbf v=0.500" */
const texDot = (axisName, value) => `\\mathbf r\\cdot\\mathbf ${axisName}=${fmt3(value)}`;

/* "lhs=c0\,\mathbf a+c1\,\mathbf b+c2\,\mathbf c" from [[coefficient, axisName], ...] */
function texLinear(lhs, terms) {
	const pieces = terms.map(([coefficient, axisName], i) => {
		const number = (i === 0) ? fmt3(coefficient) : signed3(coefficient);

		return `${number}\\,\\mathbf ${axisName}`;
	});

	return `${lhs}=${pieces.join('')}`;
}

/* r = x e1 + y e2 + z e3 for a direction (lon, lat) in a frame. */
function texFrameVector(names, lon, lat) {
	return texLinear('\\mathbf r', [
		[cos(lat) * cos(lon), names[0]],
		[cos(lat) * sin(lon), names[1]],
		[sin(lat),            names[2]]
	]);
}


/* ==========================================================================
   4. DOM AND KATEX HELPERS
   ========================================================================== */

const byId = id => document.getElementById(id);
const readNumber = id => Number(byId(id).value);

/* Typeset one TeX string into an element. */
function renderTex(element, source) {
	katex.render(source, element, { throwOnError: false, displayMode: true });
}

/* Typeset every element that carries a data-tex attribute. */
function renderStaticMath() {
	document.querySelectorAll('[data-tex]').forEach(element => {
		renderTex(element, element.dataset.tex);
	});
}

/* Replace the content of a container by one typeset line per TeX string. */
function showLines(containerId, lines) {
	const container = byId(containerId);

	container.innerHTML = '';

	lines.forEach(source => {
		const line = document.createElement('span');

		line.className = 'eq';
		container.appendChild(line);
		renderTex(line, source);
	});
}

/* Append a small paragraph with a badge, e.g. "Verdict: [rises and sets]". */
function appendBadge(containerId, prefix, badgeText) {
	const paragraph = document.createElement('p');

	paragraph.innerHTML = `${prefix} <span class="badge">${badgeText}</span>`;
	byId(containerId).appendChild(paragraph);
}


/* ==========================================================================
   5. CANVAS HELPERS
   A "stage" bundles a canvas, its 2D context and the projection center/radius
   so that drawing helpers do not need many positional parameters.
   All 3D points live in the fixed celestial basis (v, u, p).
   ========================================================================== */

/* Camera angles (deg), changed by dragging. */
const view = { yaw: 285, pitch: 25 };

function createStage(canvasId) {
	const canvas = byId(canvasId);

	return {
		canvas: canvas,
		ctx: canvas.getContext('2d'),
		cx: canvas.width / 2,
		cy: canvas.height / 2,
		R: SPHERE_RADIUS
	};
}

/* Clear the canvas and draw the sphere outline. */
function beginScene(stage) {
	const { ctx, canvas, cx, cy, R } = stage;

	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.strokeStyle = COL.line;
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.arc(cx, cy, R, 0, TAU);
	ctx.stroke();
}

/* Orthographic projection of a 3D point (x = v, y = u, z = p).
   Returns the screen position and the depth d (> 0 means far side). */
function project(stage, point) {
	// rotate about the p-axis (yaw), then about the x-axis (pitch)
	const x1 = point[0] * cos(view.yaw) - point[1] * sin(view.yaw);
	const y1 = point[0] * sin(view.yaw) + point[1] * cos(view.yaw);
	const y2 = y1 * cos(view.pitch) - point[2] * sin(view.pitch);
	const z2 = y1 * sin(view.pitch) + point[2] * cos(view.pitch);

	return {
		x: stage.cx + stage.R * x1,
		y: stage.cy - stage.R * z2,
		d: y2
	};
}

/* Trace a closed 2D path through projected 3D points (does not paint it). */
function tracePath(stage, points) {
	stage.ctx.beginPath();

	points.forEach((point, i) => {
		const q = project(stage, point);

		if (i === 0) {
			stage.ctx.moveTo(q.x, q.y);
		} else {
			stage.ctx.lineTo(q.x, q.y);
		}
	});
}

/* Filled translucent polygon (used to shade planes). */
function fillPath(stage, points, color, alpha) {
	const { ctx } = stage;

	ctx.globalAlpha = alpha;
	ctx.fillStyle = color;
	tracePath(stage, points);
	ctx.fill();
	ctx.globalAlpha = 1;
}

/* Polyline through 3D points; far-side segments are faded. */
function strokePath(stage, points, color, width, dash = []) {
	const { ctx } = stage;

	ctx.lineWidth = width;
	ctx.strokeStyle = color;
	ctx.setLineDash(dash);

	for (let i = 0; i < points.length - 1; i++) {
		const a = project(stage, points[i]);
		const b = project(stage, points[i + 1]);
		const isFar = (a.d + b.d) / 2 > 0;

		ctx.globalAlpha = isFar ? FAR_SIDE_ALPHA : 1;
		ctx.beginPath();
		ctx.moveTo(a.x, a.y);
		ctx.lineTo(b.x, b.y);
		ctx.stroke();
	}

	ctx.globalAlpha = 1;
	ctx.setLineDash([]);
}

function drawLabel(stage, text, point, color, dx = 6, dy = -6) {
	const q = project(stage, point);

	stage.ctx.fillStyle = color;
	stage.ctx.font = '600 20px system-ui';
	stage.ctx.fillText(text, q.x + dx, q.y + dy);
}

function drawDisc(ctx, x, y, radius, color) {
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.arc(x, y, radius, 0, TAU);
	ctx.fill();
}

function drawPoint(stage, point, color, radius) {
	const q = project(stage, point);

	drawDisc(stage.ctx, q.x, q.y, radius, color);
}

/* Point 'length' px behind 'from' along direction 'angle' (radians). */
function backOff(from, angle, length) {
	return {
		x: from.x - length * Math.cos(angle),
		y: from.y - length * Math.sin(angle)
	};
}

/* Arrow between two 3D points (shaft + filled head); faded when pointing away. */
function drawArrow(stage, from, to, color, width) {
	const { ctx } = stage;
	const a = project(stage, from);
	const b = project(stage, to);
	const angle = Math.atan2(b.y - a.y, b.x - a.x);
	const shaftEnd = backOff(b, angle, 0.6 * ARROW_HEAD_SIZE);
	const headLeft = backOff(b, angle - 0.4, ARROW_HEAD_SIZE);
	const headRight = backOff(b, angle + 0.4, ARROW_HEAD_SIZE);
	const isFar = (a.d + b.d) / 2 > 0.05;

	ctx.globalAlpha = isFar ? FAR_ARROW_ALPHA : 1;
	ctx.strokeStyle = color;
	ctx.fillStyle = color;
	ctx.lineWidth = width;

	// shaft
	ctx.beginPath();
	ctx.moveTo(a.x, a.y);
	ctx.lineTo(shaftEnd.x, shaftEnd.y);
	ctx.stroke();

	// head
	ctx.beginPath();
	ctx.moveTo(b.x, b.y);
	ctx.lineTo(headLeft.x, headLeft.y);
	ctx.lineTo(headRight.x, headRight.y);
	ctx.closePath();
	ctx.fill();

	ctx.globalAlpha = 1;
}

/* Arrow from the origin to 'tip' with a text label at the tip.
   options: width, labelColor, dx, dy */
function drawAxis(stage, tip, text, color, options = {}) {
	const {
		width = 2,
		labelColor = COL.ink,
		dx = 6,
		dy = -4
	} = options;

	drawArrow(stage, ORIGIN, tip, color, width);
	drawLabel(stage, text, tip, labelColor, dx, dy);
}

/* Arrow from the origin to 'tip', a dot at the tip and a label. */
function drawMarkedVector(stage, tip, text, color, width, dx = 9, dy = -9) {
	drawArrow(stage, ORIGIN, tip, color, width);
	drawPoint(stage, tip, color, 6);
	drawLabel(stage, text, tip, color, dx, dy);
}

/* Label placed on the bisector of the arc from a towards b. */
function labelArc(stage, text, a, b, angle, radius, color, dx = 2, dy = 4) {
	const point = arcPoint(a, b, angle / 2, radius);

	drawLabel(stage, text, point, color, dx, dy);
}



/* Straight 2D line (used by flat charts). */
function drawLine2D(ctx, x1, y1, x2, y2) {
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.stroke();
}


/* ==========================================================================
   6. UI WIRING HELPERS
   Generic behaviour shared by every simulation. Each helper receives a
   callback (onChange) so it does not need to know which page it is on.
   ========================================================================== */

/* Show the slider value next to the slider (unit comes from data-unit). */
function formatSliderValue(input) {
	const value = Number(input.value);
	const text = Number.isInteger(value) ? value : value.toFixed(1);

	return text + (input.dataset.unit || '°');
}

/* A slider keeps its <output> in sync and calls onChange when it moves. */
function wireSlider(input, onChange) {
	const output = input.parentElement.querySelector('output');
	const syncOutput = () => {
		output.textContent = formatSliderValue(input);
	};

	input.addEventListener('input', () => {
		syncOutput();
		onChange();
	});

	syncOutput();
}

/* Preset buttons set a slider: data-target = slider id, data-value = number or "eps". */
function applyPreset(button) {
	const slider = byId(button.dataset.target);
	const isEps = button.dataset.value === 'eps';

	slider.value = isEps ? EPS : button.dataset.value;
	slider.dispatchEvent(new Event('input'));
}

/* Drag to rotate a sphere canvas; onChange redraws the scene. */
function wireDragRotation(canvas, onChange) {
	let isDragging = false;
	let last = null;

	canvas.addEventListener('pointerdown', event => {
		isDragging = true;
		last = [event.clientX, event.clientY];
		canvas.setPointerCapture(event.pointerId);
	});

	canvas.addEventListener('pointerup', () => {
		isDragging = false;
	});

	canvas.addEventListener('pointermove', event => {
		if (!isDragging) {
			return;
		}

		view.yaw += (event.clientX - last[0]) * 0.5;
		view.pitch = clamp(view.pitch + (event.clientY - last[1]) * 0.5, -89, 89);
		last = [event.clientX, event.clientY];

		onChange();
	});
}

/* Tab bar: shows the matching <section> and calls onSelect(tabId). */
function wireTabs(navId, onSelect) {
	const buttons = document.querySelectorAll(`#${navId} button`);

	buttons.forEach(button => {
		button.addEventListener('click', () => {
			buttons.forEach(b => {
				b.classList.toggle('active', b === button);
			});

			document.querySelectorAll('section').forEach(section => {
				section.classList.toggle('show', section.id === button.dataset.tab);
			});

			onSelect(button.dataset.tab);
		});
	});
}
