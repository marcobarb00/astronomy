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

const SPHERE_FILL = 0.38;          // sphere radius as a fraction of the canvas size (room for poles and labels)
const FAR_SIDE_ALPHA = 0.25;       // opacity of path segments behind the sphere
const FAR_ARROW_ALPHA = 0.35;      // opacity of arrows pointing away from the viewer
const ARROW_HEAD_SIZE = 9;         // px
const DRAG_DEGREES_PER_PX = 0.5;
const LABEL_FONT = '600 15px system-ui, sans-serif';


/* ==========================================================================
   2. CONSTRUCTION, SIZING, DRAGGING
   ========================================================================== */

class Sphere3D {

	/* options: yaw, pitch (deg), aspect (height / width), onDraw(sphere). */
	constructor(canvas, options = {}) {
		this.canvas = canvas;
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

		// Follow the width of the parent element (height follows the aspect).
		this.observer = new ResizeObserver(() => {
			if (this.canvas.clientWidth === this.width) {
				return;
			}

			this.resize();
			this.redraw();
		});
		this.observer.observe(canvas.parentElement);
	}

	/* Match the canvas resolution to its displayed size. */
	resize() {
		const width = this.canvas.clientWidth || 400;
		const height = Math.round(width * this.aspect);
		const ratio = window.devicePixelRatio || 1;

		this.canvas.style.height = `${height}px`;
		this.canvas.width = Math.round(width * ratio);
		this.canvas.height = Math.round(height * ratio);
		this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

		this.width = width;
		this.height = height;
		this.cx = width / 2;
		this.cy = height / 2;
		this.R = SPHERE_FILL * Math.min(width, height);
	}

	/* Clear and call the page's drawing function. */
	redraw() {
		this.ctx.clearRect(0, 0, this.width, this.height);
		this.onDraw(this);
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

		ctx.strokeStyle = style.color ?? COL.line;
		ctx.lineWidth = style.width ?? 1.5;
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
		ctx.fillStyle = style.color ?? COL.planet;
		ctx.beginPath();
		ctx.arc(q.x, q.y, style.radius ?? 5, 0, TAU);
		ctx.fill();

		if (style.ring) {
			ctx.strokeStyle = COL.card;
			ctx.lineWidth = 1.5;
			ctx.stroke();
		}

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
		const isFar = (a.d + b.d) / 2 > 0.05;
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

	/* Text next to a 3D point. style: color, dx, dy, font. */
	label(text, p, style = {}) {
		const { ctx } = this;
		const q = this.project(p);

		ctx.globalAlpha = (q.d > 0 && !style.always) ? 0.5 : 1;
		ctx.fillStyle = style.color ?? COL.ink;
		ctx.font = style.font ?? LABEL_FONT;
		ctx.fillText(text, q.x + (style.dx ?? 6), q.y + (style.dy ?? -6));
		ctx.globalAlpha = 1;
	}

	/* Label on the bisector of the arc from a towards b. */
	labelArc(text, a, b, angle, style = {}, r = 1) {
		this.label(text, arcPoint(a, b, angle / 2, r), style);
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
		points.push(arcPoint(a, b, angle * i / steps, radius));
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
