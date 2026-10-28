// @ts-check
/* ==========================================================================
   PREDICTING THE SKY - SHARED LIBRARY (common.js)
   Loaded by every page, before any other shared script.
   Contains nothing specific to one page and touches no DOM at load time,
   so the maths can also be loaded in Node for checks.

   TABLE OF CONTENTS
	 1. Constants and shared palette
	 2. Angles and numbers    (trigonometry in degrees, wrapping, polynomials, roots)
	 3. Vectors and matrices  (3D vectors, spherical <-> cartesian, rotations)
	 4. Formatting helpers    (degrees, sexagesimal, hours, days, TeX)
	 5. Colour helpers        (translucent versions, text colours)
	 6. Drawing helpers       (four-pointed stars, canvas fonts)
	 7. DOM and KaTeX helpers
	 8. UI wiring helpers     (sliders, presets, choice buttons, play button)
   ========================================================================== */

/* ==========================================================================
   1. CONSTANTS AND SHARED PALETTE
   ========================================================================== */

/* Shared palette (STYLE.md §2) - must mirror the :root variables in
   shared/theme.css. Figure colours come in two kinds: the line colour
   (strokes and fills only) and its text colour (labels), which is at
   least 4.5:1 on the page background. */
const COL = {
	// page
	bg: '#f3eee2', // parchment
	card: '#f7f3ea', // inside figures and frames
	ink: '#1d2a44', // text, rules, frames, outlines
	muted: '#5b6475', // secondary text
	line: '#c9bc9c', // light rules, grid lines
	accent: '#7a5718', // labels, Play, links

	// figures: line colours
	earth: '#2f5687', // celestial equator, Earth
	planet: '#a23b2e', // object of interest
	sun: '#b8862b', // Sun, ecliptic
	deferent: '#4d7a55', // horizon, deferent
	epicycle: '#6e5a9a', // epicycle, Ptolemy's circles

	// figures: text colours of the same elements
	earthText: '#2f5687',
	planetText: '#8d2f24',
	sunText: '#7a5718',
	deferentText: '#3e6346',
	epicycleText: '#5e4a87',

	// the blue plate (static sky charts only, STYLE.md §7)
	plate: '#1f3a6b',
	plateInk: '#eef3fb',
	plateSoft: '#c9d5ea',
	plateAccent: '#f2c96b'
};

const TAU = 2 * Math.PI;
const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

/* Conventional obliquity of the ecliptic for figures (deg).
   The exact, time-dependent value is Ephem.obliquity(jd). */
const EPS = 23 + 26 / 60;

const ORIGIN = [0, 0, 0];

/* The observers the pages come back to (degrees; longitude positive
   east): Rome is the default place of Act I. */
const PLACES = {
	rome: { lat: 41.9, lon: 12.4964 }
};

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

/* ---------- Numbers ---------- */

/* c0 + c1 t + c2 t^2 + ... (Horner's scheme). */
function polynomial(t, coefficients) {
	let result = 0;

	for (let i = coefficients.length - 1; i >= 0; i--) {
		result = result * t + coefficients[i];
	}

	return result;
}

/* A root of f in [a, b] by 'steps' halvings, NaN when f has the same sign
   at both ends (no root to find there). */
function bisect(f, a, b, steps = 40) {
	const signA = Math.sign(f(a));

	if (signA !== 0 && signA === Math.sign(f(b))) {
		return NaN;
	}

	for (let i = 0; i < steps; i++) {
		const middle = (a + b) / 2;

		if (Math.sign(f(middle)) === signA) {
			a = middle;
		} else {
			b = middle;
		}
	}

	return (a + b) / 2;
}

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
	return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
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
	return [r * cos(lat) * cos(lon), r * cos(lat) * sin(lon), r * sin(lat)];
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
		return a.map(row =>
			[0, 1, 2].map(j => {
				return row[0] * b[0][j] + row[1] * b[1][j] + row[2] * b[2][j];
			})
		);
	});
}

function transpose(m) {
	return [0, 1, 2].map(i => [m[0][i], m[1][i], m[2][i]]);
}

/* ==========================================================================
   4. FORMATTING HELPERS
   ========================================================================== */

const pad2 = n => String(n).padStart(2, '0');

/* x with 'digits' decimals, as toFixed, but never "-0.0": a value that
   rounds to zero is written without a sign. */
function fixed(x, digits = 1) {
	const text = x.toFixed(digits);

	return Number(text) === 0 ? (0).toFixed(digits) : text;
}

/* An angle that lives in [0°, 360°) (a right ascension, a longitude, an
   azimuth, a sidereal time) with 'digits' decimals: a value that rounds
   up to 360 is written 0, as the angle it is. */
function fixedAngle(degrees, digits = 1) {
	const text = fixed(degrees, digits);

	return Number(text) >= 360 ? fixed(Number(text) - 360, digits) : text;
}

const fmt3 = x => fixed(x, 3);

/* An angle with one decimal and a true minus sign, for a slider: "−16.7°". */
const formatAngle = value => `${fixed(value, 1).replace('-', '−')}°`;

/* A value (hours or degrees) as whole units, minutes and seconds, the
   seconds rounded to 'digits' decimals with the carry: { h, m, s }. */
function splitHms(value, digits = 0) {
	const total = Number((value * 3600).toFixed(digits));
	const h = Math.floor(total / 3600);
	const m = Math.floor((total - h * 3600) / 60);

	return { h, m, s: total - h * 3600 - m * 60 };
}

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

/* Degrees -> "D°MM'" (no sign on a value that rounds to 0°00'). */
function dms(degrees) {
	const { whole, rest } = splitWithCarry(Math.abs(degrees), 60);
	const sign = degrees < 0 && whole + rest > 0 ? '-' : '';

	return `${sign}${whole}°${pad2(rest)}'`;
}

/* Hours -> "13h14m" */
function hm(hours) {
	const { whole, rest } = splitWithCarry(hours, 60);

	return `${whole}h${pad2(rest)}m`;
}

/* Hours -> "13h14m05.2s" (seconds with 'digits' decimals; no sign on a
   value that rounds to zero). */
function hms(hours, digits = 1) {
	const { h, m, s } = splitHms(Math.abs(hours), digits);
	const sign = hours < 0 && h + m + s > 0 ? '-' : '';
	const secondsText = s.toFixed(digits).padStart(digits > 0 ? digits + 3 : 2, '0');

	return `${sign}${h}h${pad2(m)}m${secondsText}s`;
}

/* Days -> "61d06h" (polar day / night last days, not hours) */
function dh(days) {
	const { whole, rest } = splitWithCarry(days, 24);

	return `${whole}d${pad2(rest)}h`;
}

/* Signed number with a fixed number of decimals: "+0.50" / "−0.50"
   (a value that rounds to zero is "+0.00"). */
function signed(x, digits = 1) {
	const text = Math.abs(x).toFixed(digits);
	const sign = x < 0 && Number(text) !== 0 ? '−' : '+';

	return sign + text;
}

/* An angle in degrees shown in arcminutes: "+12.3′". */
function arcmin(degrees, digits = 1) {
	return signed(degrees * 60, digits) + '′';
}

/* Sexagesimal notation of the historical sources, always with its decimal
   value: sexagesimal(2.4833) -> "2;29 (2.483°)". 'places' = sexagesimal
   places after the semicolon. */
function sexagesimal(degrees, places = 1) {
	let units = Math.round(Math.abs(degrees) * Math.pow(60, places));
	const sign = degrees < 0 && units > 0 ? '-' : '';
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

/* Signed number with three decimals: "+0.500" / "-0.500" (and "+0.000"). */
function signed3(x) {
	const text = Math.abs(x).toFixed(3);

	return (x < 0 && Number(text) !== 0 ? '-' : '+') + text;
}

/* Plain text as TeX, "\text{...}". A raised dot between thousands
   (AD 13·790, WRITING.md §4) is set between two \text groups: KaTeX
   takes "·" inside \text for the math command \cdotp and prints it
   raw. */
function texText(text) {
	return `\\text{${text.split('·').join('}{\\cdotp}\\text{')}}`;
}

/* "\alpha=12°30'" */
const texAngle = (symbol, degrees) => `${symbol}=${dms(degrees)}`;

/* "lhs=c0\,\mathbf a+c1\,\mathbf b+c2\,\mathbf c" from [[coefficient, axisName], ...] */
function texLinear(lhs, terms) {
	const pieces = terms.map(([coefficient, axisName], i) => {
		const number = i === 0 ? fmt3(coefficient) : signed3(coefficient);

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

/* The text colour that goes with a line colour (STYLE.md §2): a label
   drawn in a figure's colour uses its darker text version, so that it
   stays readable. Any other colour is returned unchanged. */
const TEXT_COLOURS = {
	[COL.earth]: COL.earthText,
	[COL.planet]: COL.planetText,
	[COL.sun]: COL.sunText,
	[COL.deferent]: COL.deferentText,
	[COL.epicycle]: COL.epicycleText
};

function textColor(color) {
	return TEXT_COLOURS[color] ?? color;
}

/* ==========================================================================
   6. DRAWING HELPERS
   ========================================================================== */

/* ---------- Four-pointed stars (STYLE.md §5) ----------
   Every star in every figure is drawn by drawStar: never as a dot. */

/* The inner corners of the star sit at this fraction of its half-size. */
const STAR_WAIST = 0.28;

/* Half-size s (px) of a star's mark from its V magnitude: linear from
   STAR_SIZE_BRIGHT at STAR_MAG_BRIGHT to STAR_SIZE_FAINT at
   STAR_MAG_FAINT, and clamped there. The chosen star of a figure is drawn
   at STAR_SIZE_CHOSEN, larger than any background star. */
const STAR_MAG_BRIGHT = -1.5; // Sirius is -1.46
const STAR_MAG_FAINT = 5.5; // sigma Octantis is 5.42
const STAR_SIZE_BRIGHT = 8;
const STAR_SIZE_FAINT = 3;
const STAR_SIZE_CHOSEN = 9;

function starSize(mag) {
	const t = clamp((mag - STAR_MAG_BRIGHT) / (STAR_MAG_FAINT - STAR_MAG_BRIGHT), 0, 1);

	return lerp(STAR_SIZE_BRIGHT, STAR_SIZE_FAINT, t);
}

/* The eight corners of a four-pointed star centred on (x, y), half-size s:
   the four points (north, east, south, west) and the four waists. */
function starCorners(x, y, s) {
	const w = STAR_WAIST * s;

	return [
		[x, y - s],
		[x + w, y - w],
		[x + s, y],
		[x + w, y + w],
		[x, y + s],
		[x - w, y + w],
		[x - s, y],
		[x - w, y - w]
	];
}

/* The same star as an SVG path ("M x y L ... Z"). */
function starPath(x, y, s) {
	const parts = starCorners(x, y, s).map((p, i) => {
		const command = i === 0 ? 'M' : 'L';

		return `${command}${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
	});

	return parts.join(' ') + ' Z';
}

/* A dot (a point that is not a star) of the given radius and colour,
   with a thin ring in the card colour when 'ring' (so it stands out from
   a line under it). */
function drawDot(ctx, x, y, radius, color, ring = true) {
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.arc(x, y, radius, 0, TAU);
	ctx.fill();

	if (ring) {
		ctx.strokeStyle = COL.card;
		ctx.lineWidth = 1.5;
		ctx.stroke();
	}
}

/* Give a canvas a bitmap of width x height CSS pixels at the device pixel
   ratio, and scale its context so the drawing is in CSS pixels. */
function scaleCanvas(canvas, ctx, width, height) {
	const ratio = window.devicePixelRatio || 1;

	canvas.width = Math.round(width * ratio);
	canvas.height = Math.round(height * ratio);
	ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

/* Fill a four-pointed star on a canvas with the current fillStyle.
   ring (a colour, optional) first strokes a thin halo of that colour, so
   the star stands out from a line drawn under it. */
function drawStar(ctx, x, y, s, ring = null) {
	ctx.beginPath();

	starCorners(x, y, s).forEach((p, i) => {
		if (i === 0) {
			ctx.moveTo(p[0], p[1]);
		} else {
			ctx.lineTo(p[0], p[1]);
		}
	});

	ctx.closePath();

	if (ring) {
		ctx.save();
		ctx.strokeStyle = ring;
		ctx.lineWidth = 3;
		ctx.lineJoin = 'round';
		ctx.stroke();
		ctx.restore();
	}

	ctx.fill();
}

/* ---------- Square canvases and centred labels ---------- */

/* The smallest square canvas (px): narrower than any phone's column. */
const SQUARE_CANVAS_MIN = 200;

/* The width of an element inside its padding (px). */
function contentWidth(element) {
	const style = getComputedStyle(element);

	return element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
}

/* A square canvas as wide as its column, SQUARE_CANVAS_MIN to maxWidth
   px, scaled for the device pixel ratio; it follows the column when the
   page is resized and calls owner.draw(). Sets owner.ctx, width, cx, cy
   and R (the radius of the drawing, 'margin' px inside the edge). */
function squareCanvas(owner, canvas, maxWidth, margin) {
	// the width inside the parent's padding (a canvas set directly in a
	// figure's frame would otherwise be wider than the frame, and squeezed);
	// at least SQUARE_CANVAS_MIN px: a column measured before the layout is
	// done can report a few pixels, which would give a negative radius
	const targetWidth = () => clamp(contentWidth(canvas.parentElement) || 400, SQUARE_CANVAS_MIN, maxWidth);

	const resize = () => {
		const width = targetWidth();

		canvas.style.width = `${width}px`;
		canvas.style.height = `${width}px`;
		owner.ctx = canvas.getContext('2d');
		scaleCanvas(canvas, owner.ctx, width, width);
		owner.width = width;
		owner.cx = width / 2;
		owner.cy = width / 2;
		owner.R = width / 2 - margin;
	};

	resize();
	new ResizeObserver(() => {
		if (targetWidth() !== owner.width) {
			resize();
			owner.draw();
		}
	}).observe(canvas.parentElement);

	// labels are drawn in web fonts: draw again once they have loaded
	whenCanvasFontsReady().then(() => owner.draw());

	// a new pixel ratio (zoom, another screen): a sharper canvas
	onPixelRatioChange(() => {
		resize();
		owner.draw();
	});
}

/* A text label centred at a screen point, in the atlas fonts and the text
   colour of 'color' (labelFont, textColor). With a LabelPlacer, a single
   symbol that would cover an earlier label or leave the canvas (on a
   phone) moves next to its point instead; a word stays where it is, only
   moved inside the canvas (LabelPlacer.candidates). */
function centredLabel(ctx, text, point, color, labels = null) {
	ctx.fillStyle = textColor(color);
	ctx.font = labelFont(text);
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';

	const place = labels ? labels.choose(ctx, text, LabelPlacer.candidates(ctx, text, point, point)) : point;

	ctx.fillText(text, place.x, place.y);
}

/* ---------- Segments, arcs and subscripts on a canvas ---------- */

/* A straight segment between two canvas points. */
function segment(ctx, a, b, style) {
	ctx.strokeStyle = style.color;
	ctx.lineWidth = style.width ?? 1.5;
	ctx.setLineDash(style.dash ?? []);
	ctx.beginPath();
	ctx.moveTo(a.x, a.y);
	ctx.lineTo(b.x, b.y);
	ctx.stroke();
	ctx.setLineDash([]);
}

/* A circular arc about a canvas point, from angle 'from' to 'to'
   (longitudes, anticlockwise on the screen), of radius r px. */
function screenArc(ctx, centre, r, from, to, style) {
	const start = -from * D2R;
	const end = -to * D2R;

	ctx.strokeStyle = style.color;
	ctx.lineWidth = style.width ?? 2;
	ctx.beginPath();
	ctx.arc(centre.x, centre.y, r, start, end, to > from);
	ctx.stroke();
}

/* A symbol with a subscript ("λ" and "A"), centred at a canvas point, in
   the text colour of 'color'. */
function subscriptLabel(ctx, base, sub, point, color) {
	const subFont = 'italic 500 15px "Cormorant Garamond", Georgia, serif';

	ctx.font = FONT_SYMBOL;
	const baseWidth = ctx.measureText(base).width;
	ctx.font = subFont;
	const subWidth = ctx.measureText(sub).width;
	const left = point.x - (baseWidth + subWidth) / 2;

	ctx.fillStyle = textColor(color);
	ctx.textAlign = 'left';
	ctx.textBaseline = 'middle';
	ctx.font = FONT_SYMBOL;
	ctx.fillText(base, left, point.y);
	ctx.font = subFont;
	ctx.fillText(sub, left + baseWidth, point.y + 5);
}

/* ---------- Canvas fonts (STYLE.md §3) ----------
   Labels in figures: names (Vega, meridian, never sets) in Cormorant SC,
   symbols (P, Z, gamma, theta, 90° - a) in Cormorant Garamond italic, as
   variables are in the text. Ticks and axis titles in Spectral. */
const FONT_NAME = '600 17px "Cormorant SC", Georgia, serif';
const FONT_SYMBOL = 'italic 500 21px "Cormorant Garamond", Georgia, serif';
const FONT_TICK = '13px Spectral, Georgia, serif';
const FONT_AXIS = 'italic 15px Spectral, Georgia, serif';

/* The font of a label: a name when it holds a word (two lower-case
   letters in a row), a symbol otherwise. kind ('name' or 'symbol')
   overrides the guess, e.g. for the cardinal points N, E, S, W. */
function labelFont(text, kind = null) {
	const isName = kind ? kind === 'name' : /[a-z]{2}/.test(text);

	return isName ? FONT_NAME : FONT_SYMBOL;
}

/* A promise that resolves once the fonts used on canvases are loaded (a
   canvas does not redraw by itself when a web font arrives). Figures call
   it and redraw; it is created on first use, so loading common.js in
   Node touches nothing. */
let canvasFontsPromise = null;

function whenCanvasFontsReady() {
	if (canvasFontsPromise === null) {
		const fonts = typeof document !== 'undefined' ? document.fonts : null;

		canvasFontsPromise = fonts
			? Promise.all([FONT_NAME, FONT_SYMBOL, FONT_TICK, FONT_AXIS].map(font => fonts.load(font))).catch(() => {})
			: Promise.resolve();
	}

	return canvasFontsPromise;
}

/* ---------- Labels that keep clear of one another ----------
   On a phone a figure shrinks but its labels keep their size (13 px or
   more, CLAUDE.md), so two labels can land on each other or past the edge
   of the canvas. A LabelPlacer remembers the boxes of the labels already
   drawn in one drawing (begin() starts a new one) and gives each new label
   the first of its candidate places that stays inside the bounds and
   touches no earlier label. A label's designed place comes first, so it
   moves only where it would collide: on a wide screen, nowhere. Used by
   Sphere3D.label and Plot2D.text.

   Only a single symbol (K, γ, P′) may move round its point: its step
   aside is a few pixels. A word or an expression (Vega, mean Sun,
   90° − a) keeps its designed place, slid inside the canvas if it would
   leave it, even when that place is taken: a name that jumped from one
   side of its point to the other whenever a control moves is worse than
   one that briefly touches another (CLAUDE.md, "Rules for every
   figure"). */

/* Clear space between two labels, and between a point and its label (px). */
const LABEL_CLEARANCE = 1;
const LABEL_POINT_GAP = 7;

class LabelPlacer {
	constructor() {
		this.boxes = [];
		this.bounds = null;
	}

	/* A new drawing: no label yet, labels kept inside 'bounds'
	   ({ x0, y0, x1, y1 }, canvas pixels). */
	begin(bounds) {
		this.boxes = [];
		this.bounds = bounds;
	}

	/* The box of 'text' drawn at (x, y) with the context's current font,
	   alignment and baseline. */
	static boxOf(ctx, text, x, y) {
		const m = ctx.measureText(text);

		return {
			x0: x - m.actualBoundingBoxLeft,
			x1: x + m.actualBoundingBoxRight,
			y0: y - m.actualBoundingBoxAscent,
			y1: y + m.actualBoundingBoxDescent
		};
	}

	/* Candidate places all round a point q, 'gap' px away: right, left,
	   above, below, then the four diagonals; each is the (x, y) to draw at
	   with the context's current alignment and baseline. */
	static around(ctx, text, q, gap = LABEL_POINT_GAP) {
		const box = LabelPlacer.boxOf(ctx, text, 0, 0);
		const w = box.x1 - box.x0;
		const h = box.y1 - box.y0;
		const d = 0.7 * gap;
		const at = (left, top) => ({ x: left - box.x0, y: top - box.y0 });

		return [
			at(q.x + gap, q.y - h / 2),
			at(q.x - gap - w, q.y - h / 2),
			at(q.x - w / 2, q.y - gap - h),
			at(q.x - w / 2, q.y + gap),
			at(q.x + d, q.y - d - h),
			at(q.x + d, q.y + d),
			at(q.x - d - w, q.y - d - h),
			at(q.x - d - w, q.y + d)
		];
	}

	/* May this label move round its point to stay clear of the others?
	   Only a single symbol, of one or two characters (K, γ, P′). */
	static mayMove(text) {
		return [...text].length <= 2;
	}

	/* The candidate places of a label: its designed place, then, for a
	   single symbol only, the places all round its point q (around). */
	static candidates(ctx, text, designed, q, gap = LABEL_POINT_GAP) {
		return LabelPlacer.mayMove(text) ? [designed, ...LabelPlacer.around(ctx, text, q, gap)] : [designed];
	}

	/* Keep later labels clear of a box drawn some other way ({ x0, y0, x1,
	   y1 }, e.g. a label with a subscript). */
	reserve(box) {
		this.boxes.push(box);
	}

	/* The same place moved inside the bounds, if it was past an edge. */
	clampInside(ctx, text, place) {
		const box = LabelPlacer.boxOf(ctx, text, place.x, place.y);
		const { x0, y0, x1, y1 } = this.bounds;
		const dx = Math.max(0, x0 - box.x0) - Math.max(0, box.x1 - x1);
		const dy = Math.max(0, y0 - box.y0) - Math.max(0, box.y1 - y1);

		return { x: place.x + dx, y: place.y + dy };
	}

	/* Is the box inside the bounds? */
	inside(box) {
		const { x0, y0, x1, y1 } = this.bounds;

		return box.x0 >= x0 && box.x1 <= x1 && box.y0 >= y0 && box.y1 <= y1;
	}

	/* The area the box shares with the labels already drawn. */
	overlap(box) {
		return this.boxes.reduce((total, other) => {
			const w = Math.min(box.x1, other.x1) - Math.max(box.x0, other.x0) + LABEL_CLEARANCE;
			const h = Math.min(box.y1, other.y1) - Math.max(box.y0, other.y0) + LABEL_CLEARANCE;

			return total + (w > 0 && h > 0 ? w * h : 0);
		}, 0);
	}

	/* The first candidate inside the bounds and clear of every earlier
	   label; failing that, the one inside that overlaps least; failing
	   that, the first one moved inside. The chosen box is remembered.
	   Without begin() (no bounds), the first candidate is kept as it is. */
	choose(ctx, text, candidates) {
		if (!this.bounds) {
			return candidates[0];
		}

		let best = null;
		let bestOverlap = Infinity;

		for (const place of candidates) {
			const box = LabelPlacer.boxOf(ctx, text, place.x, place.y);

			if (!this.inside(box)) {
				continue;
			}

			const shared = this.overlap(box);

			if (shared === 0) {
				best = place;
				break;
			}

			if (shared < bestOverlap) {
				best = place;
				bestOverlap = shared;
			}
		}

		const chosen = best ?? this.clampInside(ctx, text, candidates[0]);

		this.boxes.push(LabelPlacer.boxOf(ctx, text, chosen.x, chosen.y));

		return chosen;
	}
}

/* ==========================================================================
   7. DOM AND KATEX HELPERS
   ========================================================================== */

/** The element with this id. Typed `any`: the pages look up sliders,
	buttons, canvases and plain blocks alike.
	@type {(id: string) => any} */
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
	// KaTeX did not load (a CDN failure): the TeX source, as plain text
	if (typeof katex === 'undefined') {
		element.textContent = source;
		return;
	}

	katex.render(source, element, { throwOnError: false, displayMode: displayMode });
}

/** Typeset every element that carries a data-tex attribute.
   @param {ParentNode} [root] */
function renderStaticMath(root = document) {
	root.querySelectorAll('[data-tex]').forEach((/** @type {HTMLElement} */ element) => {
		renderTex(element, element.dataset.tex);
	});
}

/* --------------------------------------------------------------------------
   Display equations that fit a phone
   KaTeX never breaks a display equation, so one that holds several
   equations side by side ("a = b, \qquad c = d") or a long chain
   ("a = b = c") would overflow the text column on a phone. The prose's
   display equations are therefore cut, at the top level of their TeX
   (outside braces, brackets, environments and \left ... \right), into
   groups and pieces, each typeset on its own in boxes that wrap
   (.eq-split and .eq-chain in theme.css):
	 - a group ends at \qquad, at "\quad" after a comma, and before an
	   arrow such as \Longrightarrow, which starts the next group;
	 - inside a group, a piece ends before each relation (=, <, \approx...);
	 - an aligned environment becomes a grid of its left and right sides,
	   which keeps the relations lined up.
   On a wide screen everything sits on one line, as KaTeX would set it;
   on a narrow one the groups stack, and a group still too wide breaks
   before one of its relations.
   -------------------------------------------------------------------------- */

/* Relations before which a group may break. */
const TEX_BREAK_RELATIONS = ['=', '<', '>', '\\approx', '\\le', '\\leq', '\\ge', '\\geq', '\\equiv'];

/* Arrows that start a new group. */
const TEX_GROUP_ARROWS = ['\\Longrightarrow', '\\Rightarrow', '\\iff'];

/* Tokens that open or close a level of nesting. */
const TEX_OPENERS = ['{', '(', '[', '\\left', '\\begin'];
const TEX_CLOSERS = ['}', ')', ']', '\\right', '\\end'];

/** Cut TeX into tokens (a command such as \qquad or \{, or one character),
   each with the nesting depth it sits at. 'balanced' is false when the
   depth does not come back to zero (an interval such as [0, 1)), and the
   source is then better left whole.
   @param {string} tex
   @returns {{ tokens: { text: string, depth: number }[], balanced: boolean }} */
function tokenizeTex(tex) {
	const tokens = [];
	let depth = 0;
	let balanced = true;
	let i = 0;

	while (i < tex.length) {
		let text = tex[i];

		if (text === '\\') {
			const match = /^\\([A-Za-z]+|[^A-Za-z])/.exec(tex.slice(i));
			text = match ? match[0] : '\\';
		}

		// a closer sits at the depth of its opener
		if (TEX_CLOSERS.includes(text)) {
			depth--;
		}

		if (depth < 0) {
			balanced = false;
		}

		tokens.push({ text: text, depth: depth });

		if (TEX_OPENERS.includes(text)) {
			depth++;
		}

		i += text.length;
	}

	return { tokens: tokens, balanced: balanced && depth === 0 };
}

/** The groups of a display equation, each a list of pieces of TeX: the
   first piece of a group starts it, the others start with a relation.
   An equation with nothing to split comes back as [[tex]].
   @param {string} tex
   @returns {string[][]} */
function splitDisplayTex(tex) {
	const { tokens, balanced } = tokenizeTex(tex);

	if (!balanced) {
		return [[tex.trim()]];
	}

	/** @type {string[][]} */
	const groups = [];
	/** @type {string[]} */
	let pieces = [];
	let piece = '';

	// the nearest token at depth 0 that is not a space, before or after i
	const neighbour = (i, step) => {
		for (let j = i + step; j >= 0 && j < tokens.length; j += step) {
			if (tokens[j].depth === 0 && tokens[j].text.trim() !== '') {
				return tokens[j].text;
			}
		}

		return '';
	};

	const endPiece = () => {
		if (piece.trim() !== '') {
			pieces.push(piece.trim());
		}

		piece = '';
	};

	const endGroup = () => {
		endPiece();

		if (pieces.length > 0) {
			groups.push(pieces);
		}

		pieces = [];
	};

	tokens.forEach((token, i) => {
		const text = token.text;

		if (token.depth > 0) {
			piece += text;
		} else if (text === '\\qquad') {
			endGroup();
		} else if (text === '\\quad' && neighbour(i, -1) === ',') {
			endGroup();
		} else if (text === '\\quad' && TEX_GROUP_ARROWS.includes(neighbour(i, 1))) {
			// the space before an arrow: the arrow starts the next group
		} else if (TEX_GROUP_ARROWS.includes(text)) {
			endGroup();
			piece = text;
		} else if (
			TEX_BREAK_RELATIONS.includes(text) &&
			piece.trim() !== '' &&
			!TEX_GROUP_ARROWS.includes(piece.trim())
		) {
			endPiece();
			piece = text;
		} else {
			piece += text;
		}
	});

	endGroup();

	return groups.length > 0 ? groups : [[tex.trim()]];
}

/** The rows of an equation that is one aligned environment, each as its
   left side and its right side (from the & on), with any punctuation
   after the environment added to the last row; or null for any other
   equation, or for rows with more than one &.
   @param {string} tex
   @returns {string[][] | null} */
function splitAlignedTex(tex) {
	const match = /^\s*\\begin\{aligned\}([\s\S]*)\\end\{aligned\}\s*([.,;]?)\s*$/.exec(tex);

	if (!match || match[1].includes('\\begin{aligned}')) {
		return null;
	}

	const { tokens, balanced } = tokenizeTex(match[1]);

	if (!balanced) {
		return null;
	}

	/** @type {string[][]} */
	const rows = [];
	let cells = [''];

	const endRow = () => {
		if (cells.join('').trim() !== '') {
			rows.push(cells.map(cell => cell.trim()));
		}

		cells = [''];
	};

	tokens.forEach(token => {
		if (token.depth === 0 && token.text === '\\\\') {
			endRow();
		} else if (token.depth === 0 && token.text === '&') {
			cells.push('');
		} else {
			cells[cells.length - 1] += token.text;
		}
	});

	endRow();

	if (rows.length === 0 || rows.some(row => row.length !== 2)) {
		return null;
	}

	rows[rows.length - 1][1] += match[2];

	return rows;
}

/** An aligned environment as a grid of typeset cells: the left sides
   right-aligned in one column, the right sides (from the relation on) in
   the next, so the relations line up, and a right side too long for a
   phone continues on a second line after a binary operator.
   @param {string[][]} rows
   @returns {HTMLElement} */
function makeAlignedMath(rows) {
	const box = makeEl('span', 'eq-split eq-aligned');

	rows.forEach(([left, right]) => {
		const leftCell = makeEl('span', 'eq-piece eq-left');
		const rightCell = makeEl('span', 'eq-piece eq-right');

		renderTex(leftCell, left);
		// "{}" before the relation keeps its spacing on the left
		renderTex(rightCell, `{}${right}`);
		box.appendChild(leftCell);
		box.appendChild(rightCell);
	});

	return box;
}

/** Replace a typeset display equation by its groups and pieces, typeset
   one by one in wrapping boxes, when its source has more than one piece.
   @param {HTMLElement} display  a .katex-display made by auto-render */
function wrapDisplayMath(display) {
	const annotation = display.querySelector('annotation[encoding="application/x-tex"]');

	// read-outs keep their fixed lines (CLAUDE.md), so they are never split
	if (!annotation || display.closest('.readout, .eq, [data-tex]')) {
		return;
	}

	const rows = splitAlignedTex(annotation.textContent);

	if (rows) {
		display.replaceWith(makeAlignedMath(rows));
		return;
	}

	const groups = splitDisplayTex(annotation.textContent);

	if (groups.length === 1 && groups[0].length === 1) {
		return;
	}

	const box = makeEl('span', 'eq-split');

	groups.forEach(pieces => {
		const chain = makeEl('span', 'eq-chain');

		pieces.forEach((piece, index) => {
			const part = makeEl('span', 'eq-piece');

			// "{}" before a relation keeps its spacing on the left
			renderTex(part, index > 0 ? `{}${piece}` : piece);
			chain.appendChild(part);
		});

		box.appendChild(chain);
	});

	display.replaceWith(box);
}

/** Typeset the $...$ (inline) and $$...$$ (display) math in the prose of root,
   then any data-tex element. Needs KaTeX's auto-render extension.
   @param {HTMLElement} [root] */
function renderMath(root = document.body) {
	// without the auto-render extension (a CDN failure) the prose keeps
	// its $...$ source; the read-outs still get their text
	if (typeof renderMathInElement !== 'function') {
		renderStaticMath(root);
		return;
	}

	// the display equations typeset before this call (read-outs, an
	// earlier call on the same root) are left as they are
	const typesetBefore = new Set(root.querySelectorAll('.katex-display'));

	renderMathInElement(root, {
		delimiters: [
			{ left: '$$', right: '$$', display: true },
			{ left: '$', right: '$', display: false }
		],
		ignoredClasses: ['no-math'],
		throwOnError: false
	});

	root.querySelectorAll('.katex-display').forEach((/** @type {HTMLElement} */ display) => {
		if (!typesetBefore.has(display)) {
			wrapDisplayMath(display);
		}
	});

	renderStaticMath(root);
}

/* Replace the content of a read-out by one typeset line per TeX string.
   A figure keeps one size whatever its controls show (CLAUDE.md), so the
   container declares its number of lines, <div class="readout"
   data-lines="4">, and the missing lines are filled with empty ones. A
   console warning flags a read-out without data-lines, or with more lines
   than it declares: a page must not trigger it. */
function showLines(containerId, lines) {
	const container = byId(containerId);
	const rows = Number(container.dataset.lines);

	if (!rows) {
		console.warn(`showLines: #${containerId} has no data-lines`);
	} else if (lines.length > rows) {
		console.warn(`showLines: #${containerId} shows ${lines.length} lines, more than its data-lines = ${rows}`);
	}

	container.innerHTML = '';

	lines.forEach(source => {
		const line = makeEl('span', 'eq');

		container.appendChild(line);
		renderTex(line, source);
	});

	for (let i = lines.length; i < rows; i++) {
		container.appendChild(makeEl('span', 'eq', '&nbsp;'));
	}
}

/* ==========================================================================
   8. UI WIRING HELPERS
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

	const text = Number.isInteger(value) ? value : fixed(value, 1);

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

/* A button that drives a slider (data-target = slider id):
	 data-value = a value to set (a number, or "eps" for the obliquity), or
	 data-step  = an amount to add (e.g. -1 / +1 for previous / next day),
				  kept within the slider's min and max. */
function applyPreset(button) {
	const slider = byId(button.dataset.target);

	if (button.dataset.step !== undefined) {
		const next = Number(slider.value) + Number(button.dataset.step);

		slider.value = clamp(next, Number(slider.min), Number(slider.max));
	} else {
		slider.value = button.dataset.value === 'eps' ? EPS : button.dataset.value;
	}

	slider.dispatchEvent(new Event('input'));
}

/* Press and hold on a step button: one step at once, then, after a
   pause, repeated steps that speed up (milliseconds). */
const STEP_HOLD_DELAY = 400; // before the first repeat
const STEP_REPEAT_START = 150; // first interval between repeats
const STEP_REPEAT_FASTEST = 25; // shortest interval (40 steps per second)
const STEP_REPEAT_FACTOR = 0.85; // each interval is this times the previous

/* A step button repeats while held (mouse, pen or finger). The click that
   follows a press is ignored, so a short press is still exactly one step;
   a click from the keyboard (Enter, Space) is one step too. */
function wireStepButton(button) {
	let timer = null;
	let pressed = false;

	const stop = () => {
		clearTimeout(timer);
		timer = null;
	};

	const repeat = interval => {
		applyPreset(button);
		timer = setTimeout(() => {
			repeat(Math.max(STEP_REPEAT_FASTEST, interval * STEP_REPEAT_FACTOR));
		}, interval);
	};

	button.addEventListener('pointerdown', event => {
		if (event.button !== 0) {
			return;
		}

		pressed = true;
		button.setPointerCapture(event.pointerId);
		applyPreset(button);
		timer = setTimeout(() => repeat(STEP_REPEAT_START), STEP_HOLD_DELAY);
	});

	button.addEventListener('pointerup', stop);
	button.addEventListener('lostpointercapture', stop);

	button.addEventListener('pointercancel', () => {
		stop();
		pressed = false; // no click follows a cancelled press
	});

	button.addEventListener('click', () => {
		if (pressed) {
			pressed = false; // already stepped on pointerdown
			return;
		}

		applyPreset(button);
	});

	// a long press on a phone must not open the context menu
	button.addEventListener('contextmenu', event => event.preventDefault());
}

/** Wire every button inside root that drives a slider: presets set a value,
   step buttons (data-step) step it and repeat while held.
   @param {ParentNode} [root] */
function wirePresets(root = document) {
	root.querySelectorAll('button[data-target]').forEach((/** @type {HTMLButtonElement} */ button) => {
		if (button.dataset.step !== undefined) {
			wireStepButton(button);
		} else {
			button.addEventListener('click', () => applyPreset(button));
		}
	});
}

/* Start each figure of a page (its init()), one at a time: a figure that
   fails reports it in the console and does not stop the others. */
function startFigures(figures) {
	figures.forEach(figure => {
		try {
			figure.init();
		} catch (error) {
			console.error('A figure could not start:', error);
		}
	});
}

/* A row of buttons, one per name (e.g. a star); the chosen one is marked
   active. onChoose(name) runs when another one is picked. */
function buildChoice(container, names, chosen, onChoose) {
	const buttons = names.map(name => {
		const button = makeEl('button', '', name);

		button.type = 'button';
		button.addEventListener('click', () => {
			markChosen(buttons, button);
			onChoose(name);
		});
		container.appendChild(button);

		return button;
	});

	markChosen(buttons, buttons[names.indexOf(chosen)]);
}

/* Mark 'chosen' as the active button of its row: the class that shows it,
   and aria-pressed, so that a screen reader says which one is chosen. */
function markChosen(buttons, chosen) {
	buttons.forEach(button => {
		const on = button === chosen;

		button.classList.toggle('active', on);
		button.setAttribute('aria-pressed', on ? 'true' : 'false');
	});
}

/* Play / pause button that runs a slider forward at 'unitsPerSecond'
   (slider units, e.g. hours), wrapping from max back to min. Grabbing
   the slider or using its keys pauses it, so the thumb never moves
   under the pointer (CLAUDE.md). The position is kept here, not read back
   from the slider, so a slider with a coarse step (one day) still advances
   by the small amount of each frame. options: playLabel, pauseLabel (the
   two texts of the button), onPlay (called when it starts, e.g. to pause
   another player of the same figure). The button shows a small play or
   pause icon (inline SVG, STYLE.md §8) before its label. While its figure
   is off the screen it stops drawing, and goes on from the same position
   when the figure comes back. Returns { pause }. */
const PLAY_ICON =
	'<svg class="icon" width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">' +
	'<path d="M2 1 L11 6 L2 11 Z" fill="currentColor"></path></svg>';
const PAUSE_ICON =
	'<svg class="icon" width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">' +
	'<path d="M2 1 H5 V11 H2 Z M7 1 H10 V11 H7 Z" fill="currentColor"></path></svg>';

/* A frame longer than this (seconds) is not played through: the tab was
   in the background, or the page stalled. The player moves on by this
   much at most, instead of jumping ahead. */
const PLAY_MAX_FRAME_SECONDS = 0.25;

/* A value past max brought back into [min, max], whole turns at a time. */
function wrapIntoRange(value, min, max) {
	if (value <= max) {
		return value;
	}

	return min + ((value - min) % (max - min));
}

function wirePlayButton(button, slider, unitsPerSecond, options = {}) {
	const playLabel = options.playLabel ?? 'Play';
	const pauseLabel = options.pauseLabel ?? 'Pause';
	let playing = false;
	let looping = false; // a frame loop is running (at most one at a time)
	let visible = true; // the figure is on the screen
	let lastTime = null;
	let position = 0;

	// one frame: move on by the time since the last one
	const step = now => {
		if (!playing || !visible) {
			looping = false; // paused, or suspended while off the screen
			return;
		}

		if (lastTime !== null) {
			const seconds = Math.min((now - lastTime) / 1000, PLAY_MAX_FRAME_SECONDS);

			position = wrapIntoRange(position + seconds * unitsPerSecond, Number(slider.min), Number(slider.max));
			slider.value = position;
			slider.dispatchEvent(new Event('input'));
		}

		lastTime = now;
		requestAnimationFrame(step);
	};

	const startLoop = () => {
		if (!looping) {
			looping = true;
			lastTime = null;
			requestAnimationFrame(step);
		}
	};

	const setPlaying = on => {
		playing = on;
		position = Number(slider.value);
		showPlayState(button, on, on ? pauseLabel : playLabel);

		if (on) {
			if (options.onPlay) {
				options.onPlay();
			}

			startLoop();
		}
	};

	// off the screen a player stops drawing; back on it, it goes on from
	// the same position, still playing
	whenOffScreen(slider.closest('figure') ?? slider, onScreen => {
		visible = onScreen;

		if (visible && playing) {
			startLoop();
		}
	});

	button.addEventListener('click', () => setPlaying(!playing));
	slider.addEventListener('pointerdown', () => setPlaying(false));
	slider.addEventListener('keydown', () => setPlaying(false));
	setPlaying(false);

	return { pause: () => setPlaying(false) };
}

/* Call onChange(true / false) when 'element' comes onto or leaves the
   screen (nothing in a browser without IntersectionObserver). */
function whenOffScreen(element, onChange) {
	if (typeof IntersectionObserver === 'undefined') {
		return;
	}

	new IntersectionObserver(entries => {
		onChange(entries[entries.length - 1].isIntersecting);
	}).observe(element);
}

/* Call 'callback' whenever the device pixel ratio changes (the browser
   zooms, the window moves to another screen): a canvas must then be
   sized and drawn again at the new resolution. */
function onPixelRatioChange(callback) {
	if (typeof window === 'undefined' || !window.matchMedia) {
		return;
	}

	const query = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);

	query.addEventListener(
		'change',
		() => {
			callback();
			onPixelRatioChange(callback);
		},
		{ once: true }
	);
}

/* The icon and label of a play button, and its pressed state. */
function showPlayState(button, playing, label) {
	button.innerHTML = `${playing ? PAUSE_ICON : PLAY_ICON}<span>${label}</span>`;
	button.setAttribute('aria-pressed', playing ? 'true' : 'false');
}
