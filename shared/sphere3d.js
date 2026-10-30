// @ts-check
/* ==========================================================================
   PREDICTING THE SKY - 3D SPHERE (sphere3d.js)
   A draggable celestial sphere drawn on a canvas.
   Needs common.js.

   Usage
	 const sphere = new Sphere3D(canvas, {
		 onDraw: s => {
			 s.outline();
			 s.circle([1, 0, 0], [0, 1, 0], { color: COL.earth });
			 s.point(fromLonLat(30, 10), { color: COL.sun });
			 s.star(fromLonLat(279, 39), { color: COL.planet, size: STAR_SIZE_CHOSEN });
		 }
	 });
	 sphere.redraw();      // after a slider moves

   Geometry
	 Points are 3D vectors in the base frame of the page (by convention the
	 equatorial frame: x towards the vernal point, z towards the north
	 celestial pole), with the sphere of unit radius. The camera looks at
	 the centre; yaw turns about z, pitch tilts towards the viewer.
	 Orthographic projection; a depth d > 0 means "behind the sphere".
	 Everything behind is drawn faded.

	 Sizes (line widths, fonts, point radii) are in CSS pixels; the canvas is
	 scaled for the device pixel ratio and follows the width of its parent.

	 Style (STYLE.md): the outline is ink; stars are four-pointed (star(),
	 never point()); labels take the text colour of their line colour
	 (textColor) and the atlas fonts (labelFont in common.js).

   TABLE OF CONTENTS
	 1. Constants
	 2. Construction, sizing, dragging
	 3. Projection
	 4. Drawing primitives
	 5. Sampling helpers
   ========================================================================== */

/* ==========================================================================
   1. CONSTANTS
   ========================================================================== */

const SPHERE_FILL = 0.38; // sphere radius as a fraction of the canvas size (room for poles and labels)
const FAR_SIDE_ALPHA = 0.25; // opacity of path segments behind the sphere
const FAR_ARROW_ALPHA = 0.35; // opacity of arrows pointing away from the viewer
const ARROW_HEAD_SIZE = 9; // px
const DRAG_DEGREES_PER_PX = 0.5;
const KEY_DEGREES = 5; // one press of an arrow key turns the view by this
const FAR_ARROW_DEPTH = 0.05; // an arrow is faded once its middle is this far behind

/* labelAway: the gap between a point and its label, and the label's
   height above its baseline and its half-height (px, at the label fonts). */
const LABEL_AWAY_GAP = 12;
const LABEL_ASCENT = 13;
const LABEL_HALF_HEIGHT = 5;
const LABEL_FONT = FONT_NAME; // for pages that write on a canvas themselves

/* The cardinal points in the horizon frame (x south, y east, z zenith). */
const HORIZON_POINTS = [
	['S', [1, 0, 0]],
	['E', [0, 1, 0]],
	['N', [-1, 0, 0]],
	['W', [0, -1, 0]]
];

/* ==========================================================================
   2. CONSTRUCTION, SIZING, DRAGGING
   ========================================================================== */

class Sphere3D {
	/* options: yaw, pitch (deg), aspect (height / width), onDraw(sphere). */
	constructor(canvas, options = {}) {
		this.canvas = canvas;
		this.labels = new LabelPlacer(); // keeps the labels of one drawing apart
		this.pendingLabels = null; // the labels of the drawing under way (redraw)
		this.ctx = canvas.getContext('2d');
		this.view = {
			yaw: options.yaw ?? 285,
			pitch: options.pitch ?? 22
		};
		this.aspect = options.aspect ?? 1;
		this.onDraw = options.onDraw ?? (() => {});

		canvas.classList.add('sphere3d');

		this.resize();
		this.wireDrag();
		this.wireKeys();

		// Follow the width of the parent element (height follows the aspect).
		this.observer = new ResizeObserver(() => {
			if (this.canvas.clientWidth === this.width) {
				return;
			}

			this.resize();
			this.redraw();
		});
		this.observer.observe(canvas.parentElement);

		// labels are drawn in web fonts: draw again once they have loaded
		whenCanvasFontsReady().then(() => this.redraw());

		// a new pixel ratio (zoom, another screen): a sharper canvas
		onPixelRatioChange(() => {
			this.resize();
			this.redraw();
		});
	}

	/* The point of a circle (angle -> point) nearest the viewer, offset by
	   'skip' degrees so that two circles get their names at different
	   places: where a circle's name can be read (pages 2.3 and 3.3).
	   pointAt is cos(angle) u + sin(angle) v and the depth is linear in the
	   point, so the depth is cos(angle) d(u) + sin(angle) d(v), least at the
	   angle found below: exactly, so that the name glides along its circle
	   as the sphere turns instead of stepping (CLAUDE.md). */
	frontPoint(pointAt, skip = 0) {
		const du = this.project(pointAt(0)).d;
		const dv = this.project(pointAt(90)).d;

		return pointAt(atan2d(-dv, -du) + skip);
	}

	/* Match the canvas resolution to its displayed size. */
	resize() {
		const width = this.canvas.clientWidth || 400;
		const height = Math.round(width * this.aspect);

		this.canvas.style.height = `${height}px`;
		scaleCanvas(this.canvas, this.ctx, width, height);

		this.width = width;
		this.height = height;
		this.cx = width / 2;
		this.cy = height / 2;
		this.R = SPHERE_FILL * Math.min(width, height);
	}

	/* Clear and call the page's drawing function. Its labels are kept
	   until the drawing is done, then placed words first and single
	   symbols after (drawLabels): a word keeps its place (CLAUDE.md), so
	   it is a symbol that steps aside when the two would meet, whatever
	   order the page drew them in. */
	redraw() {
		this.ctx.clearRect(0, 0, this.width, this.height);
		this.labels.begin({ x0: 0, y0: 0, x1: this.width, y1: this.height });
		this.pendingLabels = [];
		this.onDraw(this);
		this.drawLabels(this.pendingLabels);
		this.pendingLabels = null;
	}

	/* Drag to rotate (mouse, pen or finger). */
	wireDrag() {
		let last = null;

		this.canvas.addEventListener('pointerdown', event => {
			last = [event.clientX, event.clientY];
			this.canvas.setPointerCapture(event.pointerId);
		});

		this.canvas.addEventListener('pointerup', () => {
			last = null;
		});

		this.canvas.addEventListener('pointercancel', () => {
			last = null;
		});

		this.canvas.addEventListener('pointermove', event => {
			if (!last) {
				return;
			}

			this.view.yaw += (event.clientX - last[0]) * DRAG_DEGREES_PER_PX;
			this.view.pitch = clamp(this.view.pitch + (event.clientY - last[1]) * DRAG_DEGREES_PER_PX, -89, 89);
			last = [event.clientX, event.clientY];

			this.redraw();
		});
	}

	/* The arrow keys turn the view as dragging does (right / down = a drag
	   to the right / down), once the canvas has the keyboard focus. */
	wireKeys() {
		const turns = {
			ArrowLeft: [-KEY_DEGREES, 0],
			ArrowRight: [KEY_DEGREES, 0],
			ArrowUp: [0, -KEY_DEGREES],
			ArrowDown: [0, KEY_DEGREES]
		};

		this.canvas.tabIndex = 0;

		if (!this.canvas.hasAttribute('aria-label')) {
			this.canvas.setAttribute('aria-label', 'A sphere you can turn: drag it, or use the arrow keys.');
		}

		this.canvas.addEventListener('keydown', event => {
			const turn = turns[event.key];

			if (!turn) {
				return;
			}

			event.preventDefault(); // the keys turn the sphere, not the page
			this.view.yaw += turn[0];
			this.view.pitch = clamp(this.view.pitch + turn[1], -89, 89);
			this.redraw();
		});
	}

	/* ======================================================================
	   3. PROJECTION
	   ====================================================================== */

	/* Screen position { x, y } and depth d of a 3D point (d > 0: far side). */
	project(point) {
		const { yaw, pitch } = this.view;

		// rotate about z (yaw), then about the screen's x axis (pitch)
		const x1 = point[0] * cos(yaw) - point[1] * sin(yaw);
		const y1 = point[0] * sin(yaw) + point[1] * cos(yaw);
		const y2 = y1 * cos(pitch) - point[2] * sin(pitch);
		const z2 = y1 * sin(pitch) + point[2] * cos(pitch);

		return {
			x: this.cx + this.R * x1,
			y: this.cy - this.R * z2,
			d: y2
		};
	}

	/* Is a point on the near side of the sphere? */
	isFront(point) {
		return this.project(point).d <= 0;
	}

	/* ======================================================================
	   4. DRAWING PRIMITIVES
	   Every primitive takes a style object: color, width, dash, alpha.
	   ====================================================================== */

	/* The sphere's silhouette. */
	outline(style = {}) {
		const { ctx } = this;

		ctx.strokeStyle = style.color ?? COL.ink;
		ctx.lineWidth = style.width ?? 1.4;
		ctx.beginPath();
		ctx.arc(this.cx, this.cy, this.R, 0, TAU);
		ctx.stroke();
	}

	/* Polyline through 3D points; segments behind the sphere are faded. */
	path(points, style = {}) {
		const { ctx } = this;
		const alpha = style.alpha ?? 1;

		ctx.lineWidth = style.width ?? 2;
		ctx.strokeStyle = style.color ?? COL.ink;
		ctx.setLineDash(style.dash ?? []);
		ctx.lineCap = 'round';

		for (let i = 0; i < points.length - 1; i++) {
			const a = this.project(points[i]);
			const b = this.project(points[i + 1]);
			const isFar = (a.d + b.d) / 2 > 0;

			ctx.globalAlpha = alpha * (isFar ? FAR_SIDE_ALPHA : 1);
			ctx.beginPath();
			ctx.moveTo(a.x, a.y);
			ctx.lineTo(b.x, b.y);
			ctx.stroke();
		}

		ctx.globalAlpha = 1;
		ctx.setLineDash([]);
	}

	/* Circle spanned by the unit vectors a, b (radius r). */
	circle(a, b, style = {}, r = 1) {
		this.path(sampleCircle(a, b, r), style);
	}

	/* Great circle with the given pole (normal vector). */
	greatCircle(normal, style = {}) {
		const [a, b] = planeBasis(normal);

		this.circle(a, b, style);
	}

	/* Small circle at angular distance 'polarAngle' from 'pole'
	   (e.g. a star's daily circle: pole = celestial pole, 90° - delta). */
	smallCircle(pole, polarAngle, style = {}) {
		const n = normalize3(pole);
		const [a, b] = planeBasis(n);
		const centre = scale(n, cos(polarAngle));
		const points = sampleParametric(t => {
			return add3(centre, arcPoint(a, b, t, sin(polarAngle)));
		});

		this.path(points, style);
	}

	/* Arc from a towards b sweeping 'angle' degrees (radius r). */
	arc(a, b, angle, style = {}, r = 1) {
		this.path(sampleArc(a, b, angle, r), style);
	}

	/* Translucent filled polygon through 3D points (e.g. a plane). */
	fill(points, style = {}) {
		const { ctx } = this;

		ctx.globalAlpha = style.alpha ?? 0.12;
		ctx.fillStyle = style.color ?? COL.earth;
		ctx.beginPath();

		points.forEach((point, i) => {
			const q = this.project(point);

			if (i === 0) {
				ctx.moveTo(q.x, q.y);
			} else {
				ctx.lineTo(q.x, q.y);
			}
		});

		ctx.fill();
		ctx.globalAlpha = 1;
	}

	/* Disc spanned by a, b (a shaded plane through the centre). */
	fillPlane(a, b, style = {}, r = 1) {
		this.fill(sampleCircle(a, b, r), style);
	}

	/* Dot at a 3D point; faded behind the sphere unless style.always. */
	point(p, style = {}) {
		const { ctx } = this;
		const q = this.project(p);
		const isFar = q.d > 0 && !style.always;

		ctx.globalAlpha = isFar ? FAR_ARROW_ALPHA : 1;
		drawDot(ctx, q.x, q.y, style.radius ?? 5, style.color ?? COL.planet, Boolean(style.ring));
		ctx.globalAlpha = 1;
	}

	/* Four-pointed star at a 3D point (STYLE.md §5); faded behind the
	   sphere unless style.always. style: color, size (half-size in px,
	   e.g. starSize(star.mag)), alpha, ring (true: a halo in the card
	   colour, to stand out from a line under it). */
	star(p, style = {}) {
		const { ctx } = this;
		const q = this.project(p);
		const isFar = q.d > 0 && !style.always;

		ctx.globalAlpha = (style.alpha ?? 1) * (isFar ? FAR_ARROW_ALPHA : 1);
		ctx.fillStyle = style.color ?? COL.ink;
		drawStar(ctx, q.x, q.y, style.size ?? STAR_SIZE_CHOSEN, style.ring ? COL.card : null);
		ctx.globalAlpha = 1;
	}

	/* Arrow between two 3D points (shaft + head); faded when pointing away. */
	arrow(from, to, style = {}) {
		const { ctx } = this;
		const a = this.project(from);
		const b = this.project(to);
		const angle = Math.atan2(b.y - a.y, b.x - a.x);
		const shaftEnd = backOff(b, angle, 0.6 * ARROW_HEAD_SIZE);
		const headLeft = backOff(b, angle - 0.4, ARROW_HEAD_SIZE);
		const headRight = backOff(b, angle + 0.4, ARROW_HEAD_SIZE);
		const isFar = (a.d + b.d) / 2 > FAR_ARROW_DEPTH;
		const color = style.color ?? COL.ink;

		ctx.globalAlpha = isFar ? FAR_ARROW_ALPHA : 1;
		ctx.strokeStyle = color;
		ctx.fillStyle = color;
		ctx.lineWidth = style.width ?? 2;

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

	/* Arrow from the centre to 'tip' with a label at the tip. */
	axis(tip, text, style = {}) {
		this.arrow(ORIGIN, tip, style);
		this.label(text, tip, { color: style.labelColor ?? COL.ink, dx: 6, dy: -4 });
	}

	/* The observer's ground, for a sphere drawn in the horizon frame (x
	   towards the south point, y east, z towards the zenith): the shaded
	   horizon plane and its circle, the meridian (dotted), the cardinal
	   points N, E, S, W and the zenith Z. */
	ground() {
		this.fillPlane([1, 0, 0], [0, 1, 0], { color: COL.deferent, alpha: 0.14 });
		this.circle([1, 0, 0], [0, 1, 0], { color: COL.deferent, width: 2 });
		this.circle([1, 0, 0], [0, 0, 1], { color: COL.muted, width: 1, dash: [2, 4] });

		HORIZON_POINTS.forEach(([name, point]) => {
			this.label(name, scale(point, 1.09), { color: COL.deferent, kind: 'name', dx: -5, dy: 5 });
		});

		this.point([0, 0, 1], { color: COL.deferent, radius: 4 });
		this.label('Z', [0, 0, 1], { color: COL.deferent, dx: -18, dy: 4 });
	}

	/* Text next to a 3D point. style: color (a line colour is drawn in its
	   text colour), dx, dy, font, kind ('name' or 'symbol', see labelFont).
	   During a redraw it is drawn when the drawing is done (redraw). */
	label(text, p, style = {}) {
		const q = this.project(p);

		if (this.pendingLabels) {
			this.pendingLabels.push({ text, q, style });
		} else {
			this.drawLabel(text, q, style);
		}
	}

	/* The labels of one drawing: the words first, then the symbols. */
	drawLabels(labels) {
		const words = labels.filter(l => !LabelPlacer.mayMove(l.text));
		const symbols = labels.filter(l => LabelPlacer.mayMove(l.text));

		[...words, ...symbols].forEach(l => this.drawLabel(l.text, l.q, l.style));
	}

	/* A label at the projected point q (see label). */
	drawLabel(text, q, style) {
		const { ctx } = this;

		ctx.globalAlpha = q.d > 0 && !style.always ? 0.5 : 1;
		ctx.fillStyle = textColor(style.color ?? COL.ink);
		ctx.font = style.font ?? labelFont(text, style.kind);
		ctx.textAlign = 'left';
		ctx.textBaseline = 'alphabetic';

		// the designed place first; a single symbol goes elsewhere round
		// the point only if it would cover an earlier label or leave the
		// canvas (on a phone), a word only slides inside the canvas
		const designed = { x: q.x + (style.dx ?? 6), y: q.y + (style.dy ?? -6) };
		const place = this.labels.choose(ctx, text, LabelPlacer.candidates(ctx, text, designed, q));

		ctx.fillText(text, place.x, place.y);
		ctx.globalAlpha = 1;
	}

	/* Label on the bisector of the arc from a towards b. */
	labelArc(text, a, b, angle, style = {}, r = 1) {
		this.label(text, arcPoint(a, b, angle / 2, r), style);
	}

	/* Label a 3D point on the screen side that faces away from 'awayFrom'
	   (a 3D point or a screen position { x, y }), so two nearby labels
	   never overlap. */
	labelAway(text, point, awayFrom, color) {
		const gap = LABEL_AWAY_GAP;
		const q = this.project(point);
		const r = Array.isArray(awayFrom) ? this.project(awayFrom) : awayFrom;
		const length = Math.hypot(q.x - r.x, q.y - r.y) || 1;
		const ux = (q.x - r.x) / length;
		const uy = (q.y - r.y) / length;

		this.ctx.font = labelFont(text);

		const width = this.ctx.measureText(text).width;

		// left-aligned text on its baseline: shift it so its box sits on the far side
		this.label(text, point, {
			color: color,
			dx: gap * ux - (ux < 0 ? width : 0) * Math.abs(ux) - ((1 - Math.abs(ux)) * width) / 2,
			dy: gap * uy + (uy > 0 ? LABEL_ASCENT : 0) * Math.abs(uy) + (1 - Math.abs(uy)) * LABEL_HALF_HEIGHT
		});
	}
}

/* ==========================================================================
   5. SAMPLING HELPERS
   Curves are lists of 3D points. Shared by every sphere on the page.
   ========================================================================== */

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
function sampleArc(a, b, angle, radius = 1, steps = 40) {
	const points = [];

	for (let i = 0; i <= steps; i++) {
		points.push(arcPoint(a, b, (angle * i) / steps, radius));
	}

	return points;
}

/* Two orthonormal vectors spanning the plane perpendicular to n. */
function planeBasis(n) {
	const unit = normalize3(n);
	const helper = Math.abs(unit[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
	const a = normalize3(cross3(helper, unit));
	const b = cross3(unit, a);

	return [a, b];
}

/* Point 'length' px behind 'from' along direction 'angle' (radians). */
function backOff(from, angle, length) {
	return {
		x: from.x - length * Math.cos(angle),
		y: from.y - length * Math.sin(angle)
	};
}
