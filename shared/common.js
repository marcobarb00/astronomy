/* ==========================================================================
   PREDICTING THE SKY - SHARED LIBRARY (common.js)
   Loaded by every page, before any other shared script.
   Contains nothing specific to one page and touches no DOM at load time,
   so the maths can also be loaded in Node for checks.

   TABLE OF CONTENTS
	 1. Constants and shared palette
	 2. Angles                (trigonometry in degrees, wrapping)
	 3. Vectors and matrices  (3D vectors, spherical <-> cartesian, rotations)
	 4. Formatting helpers    (degrees, sexagesimal, hours, days, TeX)
	 5. Colour helpers        (translucent versions of the palette)
	 6. DOM and KaTeX helpers
	 7. UI wiring helpers     (sliders, presets)
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

/* Conventional obliquity of the ecliptic for figures (deg).
   The exact, time-dependent value is Ephem.obliquity(jd). */
const EPS = 23 + 26 / 60;

const ORIGIN = [0, 0, 0];


/* ==========================================================================
   2. ANGLES
   All angles in the site's code are in degrees (STRUCTURE.md §6).
   ========================================================================== */

/* ---------- Trigonometry in degrees ---------- */
const sin = x => Math.sin(x * D2R);
const cos = x => Math.cos(x * D2R);
const tan = x => Math.tan(x * D2R);

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const lerp = (a, b, t) => a + (b - a) * t;

/* asin / acos clamp their argument so rounding noise never produces NaN. */
const asin = x => Math.asin(clamp(x, -1, 1)) * R2D;
const acos = x => Math.acos(clamp(x, -1, 1)) * R2D;
const atan2d = (y, x) => Math.atan2(y, x) * R2D;

/* Obliquity of the ecliptic, as sine and cosine (figures only). */
const cosEps = cos(EPS);
const sinEps = sin(EPS);

/* ---------- Wrapping ---------- */

/* Angle in [0, 360). */
const norm360 = x => ((x % 360) + 360) % 360;

/* Angle in [-180, 180): the signed difference of two longitudes. */
const norm180 = x => norm360(x + 180) - 180;


/* ==========================================================================
   3. VECTORS AND MATRICES
   Vectors are plain arrays [x, y, z]; matrices are arrays of three rows.
   ========================================================================== */

/* ---------- 3D vectors ---------- */
const scale = (v, k) => v.map(x => x * k);
const negate = v => scale(v, -1);
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const length3 = v => Math.sqrt(dot3(v, v));

function cross3(a, b) {
	return [
		a[1] * b[2] - a[2] * b[1],
		a[2] * b[0] - a[0] * b[2],
		a[0] * b[1] - a[1] * b[0]
	];
}

function normalize3(v) {
	const length = length3(v);

	return length > 0 ? scale(v, 1 / length) : [0, 0, 0];
}

/* x*a + y*b */
function lin2(a, b, x, y) {
	return [0, 1, 2].map(i => x * a[i] + y * b[i]);
}

/* ---------- Spherical <-> cartesian ---------- */

/* Unit vector (times r) with longitude lon and latitude lat in the base frame. */
function fromLonLat(lon, lat, r = 1) {
	return [
		r * cos(lat) * cos(lon),
		r * cos(lat) * sin(lon),
		r * sin(lat)
	];
}

/* Inverse of fromLonLat: { lon in [0, 360), lat, r }. */
function toLonLat(v) {
	const r = length3(v);

	return {
		lon: norm360(atan2d(v[1], v[0])),
		lat: r > 0 ? asin(v[2] / r) : 0,
		r: r
	};
}

/* ---------- Rotation matrices (active rotations, angle in degrees) ---------- */

/* Rotation by theta about the x axis. */
function rotX(theta) {
	const c = cos(theta);
	const s = sin(theta);

	return [
		[1, 0, 0],
		[0, c, -s],
		[0, s, c]
	];
}

/* Rotation by theta about the y axis. */
function rotY(theta) {
	const c = cos(theta);
	const s = sin(theta);

	return [
		[c, 0, s],
		[0, 1, 0],
		[-s, 0, c]
	];
}

/* Rotation by theta about the z axis. */
function rotZ(theta) {
	const c = cos(theta);
	const s = sin(theta);

	return [
		[c, -s, 0],
		[s, c, 0],
		[0, 0, 1]
	];
}

/* Matrix times vector. */
function matApply(m, v) {
	return [dot3(m[0], v), dot3(m[1], v), dot3(m[2], v)];
}

/* Product of two or more matrices, left to right: matMul(A, B, C) = A B C. */
function matMul(...matrices) {
	return matrices.reduce((a, b) => {
		return a.map(row => [0, 1, 2].map(j => {
			return row[0] * b[0][j] + row[1] * b[1][j] + row[2] * b[2][j];
		}));
	});
}

function transpose(m) {
	return [0, 1, 2].map(i => [m[0][i], m[1][i], m[2][i]]);
}


/* ==========================================================================
   4. FORMATTING HELPERS
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

/* Hours -> "13h14m05.2s" (seconds with 'digits' decimals). */
function hms(hours, digits = 1) {
	const sign = hours < 0 ? '-' : '';
	const totalSeconds = Number((Math.abs(hours) * 3600).toFixed(digits));
	const h = Math.floor(totalSeconds / 3600);
	const m = Math.floor((totalSeconds - h * 3600) / 60);
	const s = totalSeconds - h * 3600 - m * 60;
	const secondsText = s.toFixed(digits).padStart(digits > 0 ? digits + 3 : 2, '0');

	return `${sign}${h}h${pad2(m)}m${secondsText}s`;
}

/* Days -> "61d06h" (polar day / night last days, not hours) */
function dh(days) {
	const { whole, rest } = splitWithCarry(days, 24);

	return `${whole}d${pad2(rest)}h`;
}

/* Signed number with a fixed number of decimals: "+0.50" / "−0.50". */
function signed(x, digits = 1) {
	const sign = x < 0 ? '−' : '+';

	return sign + Math.abs(x).toFixed(digits);
}

/* An angle in degrees shown in arcminutes: "+12.3′". */
function arcmin(degrees, digits = 1) {
	return signed(degrees * 60, digits) + '′';
}

/* Sexagesimal notation of the historical sources, always with its decimal
   value: sexagesimal(2.4833) -> "2;29 (2.483°)". 'places' = sexagesimal
   places after the semicolon. */
function sexagesimal(degrees, places = 1) {
	const sign = degrees < 0 ? '-' : '';
	let units = Math.round(Math.abs(degrees) * Math.pow(60, places));
	const digits = [];

	for (let i = 0; i < places; i++) {
		digits.unshift(pad2(units % 60));
		units = Math.floor(units / 60);
	}

	return `${sign}${units};${digits.join(',')} (${Math.abs(degrees).toFixed(3)}°)`;
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

/* ---------- TeX fragments for live read-outs ---------- */

/* Signed number with three decimals: "+0.500" / "-0.500". */
const signed3 = x => (x < 0 ? '-' : '+') + Math.abs(x).toFixed(3);

/* "\alpha=12°30'" */
const texAngle = (symbol, degrees) => `${symbol}=${dms(degrees)}`;

/* "lhs=c0\,\mathbf a+c1\,\mathbf b+c2\,\mathbf c" from [[coefficient, axisName], ...] */
function texLinear(lhs, terms) {
	const pieces = terms.map(([coefficient, axisName], i) => {
		const number = (i === 0) ? fmt3(coefficient) : signed3(coefficient);

		return `${number}\\,\\mathbf ${axisName}`;
	});

	return `${lhs}=${pieces.join('')}`;
}


/* ==========================================================================
   5. COLOUR HELPERS
   Pages never invent colours: they use COL, possibly made translucent.
   ========================================================================== */

/* '#rrggbb' + alpha -> 'rgba(r, g, b, a)'. */
function withAlpha(hex, alpha) {
	const value = parseInt(hex.slice(1), 16);
	const r = (value >> 16) & 255;
	const g = (value >> 8) & 255;
	const b = value & 255;

	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}


/* ==========================================================================
   6. DOM AND KATEX HELPERS
   ========================================================================== */

const byId = id => document.getElementById(id);
const readNumber = id => Number(byId(id).value);

/* Create an element with a class and optional text / HTML content. */
function makeEl(tag, className = '', html = '') {
	const element = document.createElement(tag);

	if (className) {
		element.className = className;
	}

	element.innerHTML = html;

	return element;
}

/* Typeset one TeX string into an element (display style by default). */
function renderTex(element, source, displayMode = true) {
	katex.render(source, element, { throwOnError: false, displayMode: displayMode });
}

/* Typeset every element that carries a data-tex attribute. */
function renderStaticMath(root = document) {
	root.querySelectorAll('[data-tex]').forEach(element => {
		renderTex(element, element.dataset.tex);
	});
}

/* Typeset the $...$ (inline) and $$...$$ (display) math in the prose of root,
   then any data-tex element. Needs KaTeX's auto-render extension. */
function renderMath(root = document.body) {
	renderMathInElement(root, {
		delimiters: [
			{ left: '$$', right: '$$', display: true },
			{ left: '$', right: '$', display: false }
		],
		ignoredClasses: ['no-math'],
		throwOnError: false
	});

	renderStaticMath(root);
}

/* Replace the content of a container by one typeset line per TeX string. */
function showLines(containerId, lines) {
	const container = byId(containerId);

	container.innerHTML = '';

	lines.forEach(source => {
		const line = makeEl('span', 'eq');

		container.appendChild(line);
		renderTex(line, source);
	});
}


/* ==========================================================================
   7. UI WIRING HELPERS
   Generic behaviour shared by every figure. Each helper receives a callback
   (onChange) so it does not need to know which page it is on.
   ========================================================================== */

/* Text shown next to a slider. An optional formatter (value -> text) wins
   over the default "value + unit" (unit from data-unit, degrees by default). */
function formatSliderValue(input, formatter) {
	const value = Number(input.value);

	if (formatter) {
		return formatter(value);
	}

	const text = Number.isInteger(value) ? value : value.toFixed(1);

	return text + (input.dataset.unit ?? '°');
}

/* A slider keeps its <output> in sync and calls onChange when it moves. */
function wireSlider(input, onChange, formatter = null) {
	const output = input.parentElement.querySelector('output');
	const syncOutput = () => {
		if (output) {
			output.textContent = formatSliderValue(input, formatter);
		}
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

/* Wire every preset button inside root. */
function wirePresets(root = document) {
	root.querySelectorAll('.presets button[data-target]').forEach(button => {
		button.addEventListener('click', () => applyPreset(button));
	});
}
