// @ts-check
/* ==========================================================================
   PREDICTING THE SKY - PAGE DRAWINGS (thumbs.js)
   A small engraved drawing for each page of the course, beside its row
   on the hub (components.js, renderHub): the main construction of the
   page, drawn once, with no labels but a letter or two. Ink and the
   figure colours of STYLE.md §2, set in theme.css §14 by class (ink,
   earth, sun, planet, deferent, epicycle): no colour is written here.
   Needs common.js (starPath).

   Usage
	 Thumbs.svg('2.1')   // an <svg> element, viewBox 0 0 120 72

   A page without a drawing gets an empty svg: a new page adds its own
   function to DRAW, keyed by its number in site-map.js.
   ========================================================================== */

const Thumbs = (function () {
	const SVG_NS = 'http://www.w3.org/2000/svg';
	const W = 120;
	const H = 72;

	/* ======================================================================
	   1. DRAWING KIT
	   ====================================================================== */

	function el(root, tag, attrs) {
		const node = document.createElementNS(SVG_NS, tag);

		Object.entries(attrs).forEach(([name, value]) => {
			node.setAttribute(name, String(value));
		});
		root.appendChild(node);

		return node;
	}

	/* The kit bound to one svg: every mark takes its colour class last. */
	function kit(root) {
		return {
			circle(cx, cy, r, cls = 'ink') {
				return el(root, 'circle', { cx: cx, cy: cy, r: r, class: cls });
			},

			ellipse(cx, cy, rx, ry, cls = 'ink', angle = 0) {
				return el(root, 'ellipse', {
					cx: cx,
					cy: cy,
					rx: rx,
					ry: ry,
					class: cls,
					transform: `rotate(${angle} ${cx} ${cy})`
				});
			},

			line(x1, y1, x2, y2, cls = 'ink') {
				return el(root, 'line', { x1: x1, y1: y1, x2: x2, y2: y2, class: cls });
			},

			path(d, cls = 'ink') {
				return el(root, 'path', { d: d, class: cls });
			},

			/* A polyline through points [[x, y], ...]. */
			poly(points, cls = 'ink') {
				const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');

				return el(root, 'path', { d: d, class: cls });
			},

			/* A filled point (a body, a center). */
			dot(x, y, r = 1.8, cls = 'ink') {
				return el(root, 'circle', { cx: x, cy: y, r: r, class: `${cls} fill` });
			},

			/* A four-pointed star (STYLE.md §5), with starPath of common.js. */
			star(x, y, s = 3, cls = 'ink') {
				return el(root, 'path', { d: starPath(x, y, s), class: `${cls} fill` });
			},

			/* A letter in the text colour of its line. */
			text(x, y, value, cls = 'ink') {
				const node = el(root, 'text', { x: x, y: y, class: `${cls} label` });

				node.textContent = value;

				return node;
			}
		};
	}

	/* ======================================================================
	   2. THE DRAWINGS, ONE PER PAGE
	   ====================================================================== */

	const DRAW = {
		/* Ptolemy's Mars and the real Mars, side by side on the zodiac. */
		'0.1'(k) {
			k.line(6, 44, 114, 44, 'sun');
			k.star(28, 30, 2.2);
			k.star(92, 24, 2.6);
			k.star(78, 58, 1.8);
			k.circle(54, 44, 5, 'planet ghost');
			k.dot(66, 44, 3, 'planet');
		},

		/* The sphere, its axis, the daily circles and the horizon. */
		'1.1'(k) {
			const view = sphereView(60, 36, 30);
			const pole = view.pole;

			k.circle(60, 36, 30);
			k.poly(view.circle([0, 0, 0], [1, 0, 0], [0, 1, 0]), 'deferent');

			// the daily circles: perpendicular to the axis, about it
			[55, 15, -25].forEach(dec => {
				k.poly(view.dailyCircle(dec), 'earth thin');
			});

			const top = view.project([1.12 * pole[0], 0, 1.12 * pole[2]]);
			const bottom = view.project([-1.12 * pole[0], 0, -1.12 * pole[2]]);
			const star = view.onDailyCircle(55, -1.1);

			k.line(bottom.x, bottom.y, top.x, top.y);
			k.star(star.x, star.y, 2.6);
			k.text(top.x - 9, top.y + 2, 'P');
		},

		/* The equator and the ecliptic, crossing at the equinox. */
		'1.2'(k) {
			k.circle(60, 36, 30);
			k.ellipse(60, 36, 30, 7, 'earth');
			k.ellipse(60, 36, 30, 7, 'sun', -23);
			k.dot(32.3, 41.3, 2, 'ink');
			k.text(20, 50, 'γ', 'sun');
			k.star(78, 18, 2.4);
		},

		/* A dial: the hour hand and the star that marks sidereal time. */
		'1.3'(k) {
			k.circle(60, 36, 28);
			for (let h = 0; h < 24; h++) {
				const a = (h * Math.PI) / 12;
				const r1 = h % 6 === 0 ? 21 : 24;

				k.line(
					60 + r1 * Math.sin(a),
					36 - r1 * Math.cos(a),
					60 + 28 * Math.sin(a),
					36 - 28 * Math.cos(a),
					'ink thin'
				);
			}
			k.line(60, 36, 74, 22, 'sun');
			k.line(60, 36, 46, 18, 'earth');
			k.star(43, 14, 2.6);
			k.dot(60, 36, 1.6);
		},

		/* The eccentric: the Sun's circle about C, seen from O. */
		'2.1'(k) {
			k.circle(64, 36, 28, 'sun');
			k.line(22, 36, 98, 36, 'ink thin');
			k.dot(56, 36, 2, 'earth');
			k.dot(64, 36, 1.5);
			k.dot(83.8, 16.2, 3, 'sun');
			k.line(56, 36, 83.8, 16.2, 'ink thin');
			k.text(50, 48, 'O', 'earth');
			k.text(63, 48, 'C');
		},

		/* The equation of time over a year: two waves added. */
		'2.2'(k) {
			const points = [];

			for (let d = 0; d <= 365; d += 5) {
				const b = (2 * Math.PI * (d - 81)) / 364;
				const minutes = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);

				points.push([8 + (d / 365) * 104, 36 - minutes * 1.8]);
			}
			k.line(8, 36, 112, 36, 'ink thin');
			k.poly(points, 'sun');
		},

		/* The pole P turning about the ecliptic pole K. */
		'2.3'(k) {
			k.circle(60, 36, 24, 'earth dashed');
			k.dot(60, 36, 1.6);
			k.dot(76.97, 19.03, 2.2, 'earth');
			k.line(60, 36, 76.97, 19.03, 'ink thin');
			k.text(52, 48, 'K');
			k.text(80, 18, 'P', 'earth');
			k.star(36, 22, 2.8);
			k.star(30, 54, 2);
			k.star(90, 52, 2.4);
		},

		/* The Moon's epicycle on its deferent. */
		'3.1'(k) {
			k.circle(60, 36, 26, 'deferent');
			k.circle(78.4, 17.6, 9, 'epicycle');
			k.line(60, 36, 78.4, 17.6, 'ink thin');
			k.dot(60, 36, 2, 'earth');
			k.dot(86.2, 22.1, 2.4, 'ink');
		},

		/* The crank: the deferent's center turning on a small circle. */
		'3.2'(k) {
			k.circle(60, 36, 6, 'ink thin');
			k.dot(60, 36, 2, 'earth');
			k.dot(64.2, 31.8, 1.5);
			k.circle(64.2, 31.8, 25, 'deferent');
			k.circle(46, 14.7, 7, 'epicycle');
			k.dot(40, 18, 2.4, 'ink');
		},

		/* A new Moon near the node: the Moon's path crosses the ecliptic. */
		'3.3'(k) {
			k.line(6, 40, 114, 40, 'sun');
			k.line(6, 54, 114, 26, 'ink thin');
			k.circle(64, 40, 9, 'sun fill-soft');
			k.circle(67, 35, 8.8, 'ink fill-dark');
		},

		/* A retrograde loop: the trace of a planet on its epicycle. */
		'4.1'(k) {
			const points = [];

			for (let t = -1.25; t <= 1.25; t += 0.02) {
				const x = 60 + 30 * t - 12 * Math.sin(Math.PI * t * 1.25);
				const y = 40 - 12 * Math.cos(Math.PI * t * 1.25) + 4 * t;

				points.push([x, y]);
			}
			k.poly(points, 'planet');
			k.star(20, 14, 2.2);
			k.star(104, 18, 2.6);
		},

		/* The equant: O, C, Q on the line of apsides. */
		'4.2'(k) {
			k.circle(60, 36, 28, 'deferent');
			k.line(24, 36, 96, 36, 'ink thin');
			k.dot(52, 36, 2, 'earth');
			k.dot(60, 36, 1.5);
			k.dot(68, 36, 1.5, 'epicycle');
			k.line(68, 36, 74, 8.6, 'epicycle thin');
			k.dot(74, 8.6, 2.4, 'planet');
			k.text(46, 49, 'O', 'earth');
			k.text(58, 49, 'C');
			k.text(68, 49, 'Q', 'epicycle');
		},

		/* The Sun at the center, the Earth's and Mars' orbits. */
		'4.3'(k) {
			k.circle(60, 36, 14, 'earth');
			k.circle(60, 36, 28, 'planet');
			k.dot(60, 36, 3, 'sun');
			k.dot(72.1, 29, 2, 'earth');
			k.dot(84.2, 22, 2.2, 'planet');
			k.line(72.1, 29, 110, 7, 'ink dashed');
		},

		/* Venus' phases: the lit fraction changes with the elongation. */
		'4.4'(k) {
			const sizes = [5, 7, 10, 13];
			let x = 16;

			sizes.forEach((r, i) => {
				const lit = [0.9, 0.6, 0.35, 0.12][i];

				k.circle(x, 36, r, 'ink thin');
				k.path(phasePath(x, 36, r, lit), 'sun fill-soft');
				x += r + sizes[Math.min(i + 1, 3)] + 6;
			});
		},

		/* Kepler: the ellipse, the Sun at a focus, an area swept. */
		'4.5'(k) {
			k.ellipse(60, 36, 36, 26, 'planet');
			k.path('M 74 36 L 96 36 A 36 26 0 0 0 82.5 15.7 Z', 'sun fill-soft');
			k.dot(74, 36, 3, 'sun');
			k.dot(46, 36, 1.4, 'ink');
		},

		/* Beyond Kepler: an orbit that turns slowly. */
		beyond(k) {
			k.ellipse(60, 36, 34, 22, 'ink thin', 0);
			k.ellipse(60, 36, 34, 22, 'ink thin', 18);
			k.ellipse(60, 36, 34, 22, 'ink thin', 36);
			k.dot(60, 36, 3, 'sun');
		}
	};

	/* The celestial sphere of page 1.1 seen from outside, in the horizon
	   frame (north, east, up) of an observer at geographic latitude 45°,
	   viewed from the azimuth VIEW.azimuth (from north through east) and
	   VIEW.elevation above the horizon: from the south-east and a little
	   above, as textbooks draw it, the axis leans towards the viewer and the
	   daily circles open into wide ellipses. Returns project(vector) ->
	   {x, y}, circle(center, a, b) -> the points of center + cos t a +
	   sin t b, and the daily circle of a declination, perpendicular to the
	   axis through the pole. */
	const VIEW = { azimuth: 160, elevation: 18 };

	function sphereView(cx, cy, radius) {
		const rad = Math.PI / 180;
		const latitude = 45 * rad;
		const a = VIEW.azimuth * rad;
		const e = VIEW.elevation * rad;
		const eye = [Math.cos(e) * Math.cos(a), Math.cos(e) * Math.sin(a), Math.sin(e)];
		const flat = Math.hypot(eye[0], eye[1]);
		const right = [-eye[1] / flat, eye[0] / flat, 0];
		const up = [
			eye[1] * right[2] - eye[2] * right[1],
			eye[2] * right[0] - eye[0] * right[2],
			eye[0] * right[1] - eye[1] * right[0]
		];
		const pole = [Math.cos(latitude), 0, Math.sin(latitude)];
		const across = [-Math.sin(latitude), 0, Math.cos(latitude)]; // in the equator's plane
		const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];

		function project(v) {
			return { x: cx + radius * dot(v, right), y: cy - radius * dot(v, up) };
		}

		function point(center, a, b, t) {
			return [0, 1, 2].map(i => center[i] + Math.cos(t) * a[i] + Math.sin(t) * b[i]);
		}

		function circle(center, a, b) {
			const points = [];

			for (let i = 0; i <= 48; i++) {
				const q = project(point(center, a, b, (2 * Math.PI * i) / 48));

				points.push([q.x, q.y]);
			}

			return points;
		}

		/* The center and the two radii of the daily circle of 'dec' (deg). */
		function daily(dec) {
			const d = (dec * Math.PI) / 180;
			const scale = v => v.map(c => c * Math.cos(d));

			return [pole.map(c => c * Math.sin(d)), scale(across), scale([0, 1, 0])];
		}

		return {
			pole,
			project,
			circle,
			dailyCircle: dec => circle(...daily(dec)),
			onDailyCircle: (dec, t) => project(point(...daily(dec), t))
		};
	}

	/* The lit part of a disk seen from the Earth, lit from the right:
	   lit = the fraction of the diameter that is bright. */
	function phasePath(cx, cy, r, lit) {
		const tx = r * (1 - 2 * lit);
		const sweep = lit > 0.5 ? 1 : 0;

		return (
			`M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} ` +
			`A ${Math.abs(tx)} ${r} 0 0 ${sweep} ${cx} ${cy - r} Z`
		);
	}

	/* ======================================================================
	   3. ENTRY POINT
	   ====================================================================== */

	/* An svg with the drawing of one page (an empty one if it has none). */
	function svg(number) {
		const root = document.createElementNS(SVG_NS, 'svg');

		root.setAttribute('viewBox', `0 0 ${W} ${H}`);
		root.setAttribute('class', 'thumb');
		root.setAttribute('aria-hidden', 'true');

		if (DRAW[number]) {
			DRAW[number](kit(root));
		}

		return root;
	}

	return { svg };
})();
