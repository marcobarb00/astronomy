// @ts-check
/* ==========================================================================
   PAGE 3.3 · ECLIPSES - SCRIPT (page.js)
   Eight figures, each with its own init and draw (and update when it has
   controls):
	 1. the new and full Moons of 2021 - 2030  (2D, static: a calendar,
											   the eclipses marked)
	 2. the Moon near Regulus                 (blue plate, static: the
											   Moon's path of August 2026)
	 3. the Moon's inclined circle            (3D, ecliptic frame; date)
	 4. the Earth's shadow                    (2D, static, not to scale;
											   in its fold, the parallax
											   triangle, not numbered)
	 5. the Sun, the Moon and the shadow      (2D: (a) new Moon, (b) full
		near a node                            Moon, (c) the latitude and
											   the limits; the Sun's
											   distance from the node, the
											   Moon's distance)
	 6. the eclipse seasons of 2026 - 2027    (2D, static)
	 7. the latitude fitted to 2026           (error curve of the latitude)
	 8. Ptolemy's latitude                    (error curve, AD 134 and
											   2000 years)
   Shared code: common.js, time.js, ephemeris.js, stars.js, plate-stars.js,
   plate.js, models/mean-sun.js, models/solar-eccentric.js,
   models/lunar-epicycle.js, models/lunar-latitude.js, models/eclipses.js,
   sphere3d.js, plot2d.js, errorcurve.js, components.js.
   Every number quoted in the prose comes from
   tools/numbers/3.3-eclipses.js.

   TABLE OF CONTENTS
	 0. Helpers shared by the figures
	 1. Figure 1: the new and full Moons of 2021 - 2030
	 2. Figure 2: the Moon near Regulus (blue plate)
	 3. Figure 3: the Moon's inclined circle
	 4. Figure 4: the Earth's shadow, and the parallax triangle
	 5. Figure 5: the Sun, the Moon and the shadow near a node
	 6. Figure 6: the eclipse seasons
	 7. Figures 7 and 8: the error curves of the latitude
	 8. Page start
   ========================================================================== */

/* ==========================================================================
   0. HELPERS SHARED BY THE FIGURES
   ========================================================================== */

/* The year of the figures, and 0 h of its first day (JD; the models and
   the reference take TT, the dates here are only labels). */
const YEAR = 2026;
const YEAR_START = Time.julianDay(YEAR, 1, 1);

/* The eclipse model of the page (models/eclipses.js) and its Moon. */
const MODEL = Eclipses.FIT_2026;
const MOON = LunarLatitude.FIT_2026;

/* The reference Moon's latitude (deg). */
const moonLatitude = jd => Ephem.moon(jd).lat;

/* A whole number with a raised dot between thousands (WRITING.md §4):
   385000 -> "385·000". */
function thousands(value) {
	const digits = String(Math.round(value));

	return digits.length <= 4 ? digits : digits.replace(/\B(?=(\d{3})+(?!\d))/g, '·');
}

/* An angle with a sign in arcminutes for TeX: "+53.5'", "-53.5'". */
const texArcmin = (degrees, digits = 1) => `${signed(degrees * 60, digits).replace('−', '-')}'`;

/* The syzygies (new and full Moons) whose mean moments fall in [from, to):
   their indices for Eclipses.reference and Eclipses.predict. */
function syzygyIndices(from, to) {
	const indices = [];

	for (let k = Eclipses.indexNear(from, true) - 1; Eclipses.meanSyzygy(k) < to; k += 0.5) {
		if (Eclipses.meanSyzygy(k) >= from) {
			indices.push(k);
		}
	}

	return indices;
}

/* First day of each month of a year, as a day index (0 = 1 January). */
const monthStarts = year =>
	Time.MONTH_NAMES.map((name, i) => ({
		value: Time.julianDay(year, i + 1, 1) - Time.julianDay(year, 1, 1),
		label: name
	}));

/* An eclipse mark on a plot: a disc, filled for a total or annular
   eclipse, a ring for a partial one; a small grey dot for a syzygy with
   no eclipse. */
function eclipseMark(plot, x, y, syzygy) {
	const ctx = plot.ctx;
	const px = plot.px(x);
	const py = plot.py(y);

	if (!syzygy.kind) {
		drawDot(ctx, px, py, 2.2, withAlpha(COL.muted, 0.6), false);
		return;
	}

	const color = syzygy.solar ? COL.sun : COL.planet;

	if (syzygy.kind === 'partial') {
		ctx.strokeStyle = color;
		ctx.lineWidth = 2;
		ctx.fillStyle = COL.card;
		ctx.beginPath();
		ctx.arc(px, py, 4.5, 0, TAU);
		ctx.fill();
		ctx.stroke();
	} else {
		drawDot(ctx, px, py, 5.5, color);
	}
}

/* ==========================================================================
   1. FIGURE 1: THE NEW AND FULL MOONS OF 2021 - 2030
   Static. One row a year, the day of the year across: every new and full
   Moon of the reference sky, the eclipses marked (Eclipses.reference,
   the eclipses NASA lists for those years).
   ========================================================================== */

const CALENDAR_FIRST = 2021;
const CALENDAR_LAST = 2030;

const calendarFigure = {
	plot: null,

	init() {
		this.points = syzygyIndices(Time.julianDay(CALENDAR_FIRST, 1, 1), Time.julianDay(CALENDAR_LAST + 1, 1, 1)).map(
			k => {
				const s = Eclipses.reference(k);
				const date = Time.calendarDate(s.jd);

				return {
					syzygy: s,
					day: s.jd - Time.julianDay(date.year, 1, 1),
					row: CALENDAR_LAST + 1 - date.year
				};
			}
		);

		this.plot = new Plot2D(byId('calendar-plot'), {
			x: [0, 366],
			y: [0.4, CALENDAR_LAST - CALENDAR_FIRST + 1.6],
			xLabel: 'date in the year',
			yLabel: 'year',
			xTicks: (min, max, count) => monthStarts(2026).filter((t, i) => count >= 8 || i % 2 === 0),
			yTicks: () =>
				Array.from({ length: CALENDAR_LAST - CALENDAR_FIRST + 1 }, (v, i) => ({
					value: CALENDAR_LAST + 1 - (CALENDAR_FIRST + i),
					label: String(CALENDAR_FIRST + i)
				})),
			aspect: 0.55,
			margin: { left: 64 },
			onDraw: () => this.draw()
		});
	},

	draw() {
		const p = this.plot;

		p.frame();

		// the syzygies without an eclipse first, under the eclipses
		this.points
			.filter(point => !point.syzygy.kind)
			.forEach(point => eclipseMark(p, point.day, point.row, point.syzygy));
		this.points
			.filter(point => point.syzygy.kind)
			.forEach(point => eclipseMark(p, point.day, point.row, point.syzygy));
	}
};

/* ==========================================================================
   2. FIGURE 2: THE MOON NEAR REGULUS (BLUE PLATE)
   A blue plate (shared/plate.js): the stars of 2026 from Gemini to Virgo,
   seen looking south, on the equatorial grid; the ecliptic of 2026 in
   the plate's ink, and highlighted the reference Moon's path from 11 to
   15 August 2026, a tick at 0 h TT of each day; the Sun at the new Moon
   of 12 August (the sign ☉ drawn on its place, on the ecliptic) and the
   node where the Moon crosses the ecliptic (☋).
   ========================================================================== */

/* The area of the chart (degrees): right ascension 7h to 12h. */
const PLATE_AREA = { raMin: 105, raMax: 180, decMin: -5, decMax: 30 };

/* The Moon's path, and its ticks (0 h TT of each day). */
const PLATE_FROM = Time.julianDay(2026, 8, 11);
const PLATE_TO = Time.julianDay(2026, 8, 15);

const plateFigure = {
	init() {
		const chart = Plate.rectangular(byId('plate-moon'), {
			area: PLATE_AREA,
			figures: ['LEO'],
			keep: ['alf Leo'], // Regulus, the star of the caption, stays on a phone
			names: [
				['alf Leo', 'Regulus', 9, 16],
				['bet Gem', 'Pollux', -9, 18, 'end'],
				['alf CMi', 'Procyon', 9, 4],
				['bet Leo', 'Denebola', 9, 4]
			],
			label: "Chart of the sky from Gemini to Virgo, with the ecliptic and, highlighted, the Moon's path of 11 to 15 August 2026."
		});
		const eps = Ephem.meanObliquity(Plate.EPOCH);
		const equatorial = (lon, lat) => Ephem.eclipticToEquatorial(lon, lat, eps);
		const ecliptic = [];

		for (let lon = 90; lon <= 190; lon += 1) {
			ecliptic.push(equatorial(lon, 0));
		}

		const eclipticName = equatorial(176, 0);

		Plate.line(chart, ecliptic, 'ecliptic', [eclipticName.ra, eclipticName.dec, -8, 18]);

		// the Moon's path (apparent position of date, as seen from the
		// Earth's centre), every two hours
		const path = [];
		const ticks = [];

		for (let jd = PLATE_FROM; jd <= PLATE_TO + 1e-9; jd += 1 / 12) {
			const m = Ephem.moon(jd);

			path.push(Ephem.equatorial(m, jd, false));
		}

		for (let day = 0; day <= PLATE_TO - PLATE_FROM; day++) {
			const jd = PLATE_FROM + day;
			const p = Ephem.equatorial(Ephem.moon(jd), jd, false);

			ticks.push({ ra: p.ra, dec: p.dec, text: String(Time.calendarDate(jd).day) });
		}

		const nameAt = path[Math.round(path.length * 0.62)];

		Plate.highlightCurve(chart, path, "the Moon's path", [nameAt.ra, nameAt.dec, 10, 26], ticks, -1);

		// the Sun at the new Moon, and the node
		const newMoon = Eclipses.reference(Eclipses.indexNear(Time.julianDay(2026, 8, 12), true));
		const sun = Ephem.equatorial(Ephem.sun(newMoon.jd), newMoon.jd, false);
		const crossing = bisect(moonLatitude, newMoon.jd, newMoon.jd + 3, 40);
		const node = equatorial(Ephem.moon(crossing).lon, 0);

		Plate.sun(chart, sun.ra, sun.dec);
		Plate.symbol(chart, node.ra, node.dec, '☋');
	}
};

/* ==========================================================================
   3. FIGURE 3: THE MOON'S INCLINED CIRCLE
   Drawn in the ecliptic frame of date (x towards the vernal point γ, z
   towards the ecliptic pole K): the ecliptic stays still, the date moves
   the Sun along it, the Moon L along its circle, and the circle's line
   of nodes westward (LunarLatitude.FIT_2026 and the Sun of the model).
   At its value, 5.00°, the Moon's circle would hide the ecliptic, so the
   inclination is drawn ORBIT_EXAGGERATION times larger, and the Moon on
   the drawn circle at its argument of latitude F; the read-out gives the
   true values. The date runs over 19 years from 1 January 2026, a turn
   of the nodes and a little more; it opens at the new Moon of 12 August
   2026, a total eclipse, seen from the side of the sphere it happened on.
   ========================================================================== */

/* The two views (CLAUDE.md: a view the reader chooses may change what is
   drawn): a month, with everything drawn, played 1.5 days a second (20
   seconds); and the nodes' turn, with only what moves slowly (the Moon's
   circle and its nodes), played over the whole 18.6 years in about 9
   seconds. Played over years, the Moon and the Sun go round so fast that
   they flicker, so that view leaves them out. */
const MONTH_VIEW = 'A month';
const TURN_VIEW = "The nodes' turn";
const VIEW_DAYS_PER_SECOND = { [MONTH_VIEW]: 1.5, [TURN_VIEW]: 750 };

/* The arrow of the ecliptic pole reaches this far. */
const POLE_LENGTH = 1.25;

/* The inclination of the drawing, as a multiple of the model's. */
const ORBIT_EXAGGERATION = 3;

const orbitFigure = {
	sphere: null,
	state: null,
	view: MONTH_VIEW,

	init() {
		const figure = byId('orbit-sphere').closest('figure');

		this.sphere = new Sphere3D(byId('orbit-sphere'), {
			yaw: 115,
			pitch: 22,
			onDraw: () => this.draw()
		});

		wireSlider(
			byId('orbit-day'),
			() => this.update(),
			value => dateYearText(YEAR_START + Number(value))
		);
		wirePresets(figure);
		buildChoice(byId('orbit-views'), [MONTH_VIEW, TURN_VIEW], this.view, name => {
			this.view = name;
			this.update();
		});
		wirePlayButton(byId('orbit-play'), byId('orbit-day'), () => VIEW_DAYS_PER_SECOND[this.view]);

		this.update();
	},

	update() {
		const day = readNumber('orbit-day');
		const jd = YEAR_START + day;
		const moon = LunarLatitude.state(MOON, jd);
		const sun = SolarEccentric.state(MODEL.sun, jd);

		this.state = {
			jd,
			moon,
			sunLongitude: sun.lambda,
			sunFromNode: Eclipses.nodeAngle(sun.lambda - moon.node)
		};
		this.showReadout();
		this.sphere.redraw();
	},

	showReadout() {
		const { jd, moon, sunFromNode } = this.state;

		if (this.view === TURN_VIEW) {
			// only the slow motion: the node, and how far it has turned
			const start = LunarLatitude.state(MOON, YEAR_START).node;

			showLines('orbit-readout', [
				`\\text{${dateYearText(jd)}:}\\quad \\Omega = ${fixed(moon.node, 1)}^\\circ`,
				`\\text{turned } ${fixed(norm360(start - moon.node), 1)}^\\circ \\text{ west since 1 January ${YEAR}}`
			]);
			return;
		}

		showLines('orbit-readout', [
			`\\text{${dateYearText(jd)}:}\\quad \\Omega = ${fixed(moon.node, 1)}^\\circ`,
			`F = ${fixed(moon.F, 1)}^\\circ,\\quad \\beta = ${signed(moon.beta, 2).replace('−', '-')}^\\circ`,
			`\\text{the Sun } ${fixed(Math.abs(sunFromNode), 1)}^\\circ \\text{ ${sunFromNode < 0 ? 'before' : 'past'} the nearest node}`
		]);
	},

	draw() {
		if (!this.state) {
			return; // a resize can ask for a drawing before the first update
		}

		const s = this.sphere;
		const { moon, sunLongitude } = this.state;
		const i = ORBIT_EXAGGERATION * MOON.i;
		const node = moon.node;
		// the pole of the drawn circle: R_z(Omega) R_x(i) applied to z
		const pole = [sin(node) * sin(i), -cos(node) * sin(i), cos(i)];
		const ascending = fromLonLat(node, 0);
		const descending = fromLonLat(node + 180, 0);
		const top = cross3(pole, ascending); // 90° along the circle from the ascending node
		const L = lin2(ascending, top, cos(moon.F), sin(moon.F));
		const drawn = toLonLat(L);
		const foot = fromLonLat(drawn.lon, 0);

		s.outline();

		// the ecliptic and its pole K
		s.circle([1, 0, 0], [0, 1, 0], { color: COL.sun, width: 2 });
		s.label(
			'ecliptic',
			s.frontPoint(angle => fromLonLat(angle, 0)),
			{ color: COL.sun, kind: 'name', dx: 6, dy: 18 }
		);
		s.axis([0, 0, POLE_LENGTH], 'K', { color: COL.sun, labelColor: COL.sun });

		// the Moon's circle and its line of nodes
		s.circle(ascending, top, { color: COL.epicycle, width: 2 });
		s.path([descending, ascending], { color: COL.muted, width: 1.2, dash: [5, 4] });

		// gamma and the nodes
		s.point([1, 0, 0], { color: COL.ink, radius: 4, ring: true });
		s.label('γ', [1, 0, 0], { color: COL.ink, kind: 'symbol', dx: 8, dy: 16 });
		s.point(ascending, { color: COL.ink, radius: 4, ring: true });
		s.label('☊', ascending, { color: COL.ink, kind: 'symbol', dx: 8, dy: -8 });
		s.point(descending, { color: COL.ink, radius: 4, ring: true });
		s.label('☋', descending, { color: COL.ink, kind: 'symbol', dx: 8, dy: -8 });

		if (this.view === TURN_VIEW) {
			return; // the slow motion alone: no Sun, no Moon
		}

		// the Sun
		s.point(fromLonLat(sunLongitude, 0), { color: COL.sun, radius: 7, ring: true });
		s.label('☉', fromLonLat(sunLongitude, 0), { color: COL.sun, kind: 'symbol', dx: -18, dy: 18 });

		// the Moon's latitude, from the ecliptic up (or down) to L
		s.arc(foot, [0, 0, Math.sign(drawn.lat) || 1], Math.abs(drawn.lat), { color: COL.planet, width: 3 });
		s.point(L, { color: COL.planet, radius: 6, ring: true });
		s.label('L', L, { color: COL.planet, kind: 'symbol', dx: 9, dy: -9 });
	}
};

/* ==========================================================================
   4. FIGURE 4: THE EARTH'S SHADOW, AND THE PARALLAX TRIANGLE
   Static, not to scale: the Sun, the Earth O and the Moon's distance,
   with the ray that grazes the Sun and the Earth on the same side and
   closes the umbra. The angles: s_sun - pi_sun at the tip of the cone,
   pi (the Earth's radius seen from the Moon's distance) and u (the
   umbra's radius at the Moon's distance), both seen from O.
   ========================================================================== */

const shadowFigure = {
	init() {
		this.canvas = byId('shadow-canvas');
		this.ctx = this.canvas.getContext('2d');
		this.resize();
		new ResizeObserver(() => {
			if (contentWidth(this.canvas.parentElement) !== this.width) {
				this.resize();
				this.draw();
			}
		}).observe(this.canvas.parentElement);
		whenCanvasFontsReady().then(() => this.draw());
		onPixelRatioChange(() => {
			this.resize();
			this.draw();
		});
		this.draw();
	},

	/* The canvas as wide as the frame, 0.42 times as tall. */
	resize() {
		const width = Math.max(SQUARE_CANVAS_MIN, contentWidth(this.canvas.parentElement) || 600);
		const height = Math.round(0.42 * width);

		this.canvas.style.width = `${width}px`;
		this.canvas.style.height = `${height}px`;
		scaleCanvas(this.canvas, this.ctx, width, height);
		this.width = width;
		this.height = height;
	},

	draw() {
		const ctx = this.ctx;
		const w = this.width;
		const h = this.height;
		const axisY = h * 0.5;
		// the layout, in fractions of the width: the Sun's centre, the
		// Earth's centre, the Moon's distance, the tip of the cone
		const sun = { x: -0.02 * w, y: axisY, r: 0.3 * h };
		const earth = { x: 0.42 * w, y: axisY, r: 0.11 * h };
		const tipX = 0.95 * w;
		const moonX = 0.74 * w;
		// the ray from the Sun's upper edge past the Earth's upper edge
		// (approximately tangent to both) to the tip on the axis
		const slope = earth.r / (tipX - earth.x);
		const rayAt = x => axisY - slope * (tipX - x);
		const umbraTop = rayAt(moonX);
		const O = { x: earth.x, y: axisY };

		ctx.clearRect(0, 0, w, h);

		// the axis, and the Moon's distance
		segment(ctx, { x: 0, y: axisY }, { x: w, y: axisY }, { color: COL.muted, width: 1, dash: [2, 4] });
		segment(
			ctx,
			{ x: moonX, y: h * 0.06 },
			{ x: moonX, y: h * 0.94 },
			{ color: COL.muted, width: 1.2, dash: [6, 4] }
		);

		// the umbra
		ctx.fillStyle = withAlpha(COL.ink, 0.18);
		ctx.beginPath();
		ctx.moveTo(earth.x, axisY - earth.r);
		ctx.lineTo(tipX, axisY);
		ctx.lineTo(earth.x, axisY + earth.r);
		ctx.closePath();
		ctx.fill();

		// the Sun and the Earth
		ctx.fillStyle = withAlpha(COL.sun, 0.35);
		ctx.beginPath();
		ctx.arc(sun.x, sun.y, sun.r, -Math.PI / 2, Math.PI / 2);
		ctx.fill();
		circle(ctx, sun, sun.r, { color: COL.sun, width: 2 });
		ctx.fillStyle = COL.card;
		ctx.beginPath();
		ctx.arc(earth.x, earth.y, earth.r, 0, TAU);
		ctx.fill();
		circle(ctx, earth, earth.r, { color: COL.earth, width: 2 });

		// the grazing rays, above and below
		const sunTop = { x: sun.x, y: axisY - sun.r };

		segment(ctx, sunTop, { x: tipX, y: axisY }, { color: COL.sun, width: 1.5 });
		segment(ctx, { x: sun.x, y: axisY + sun.r }, { x: tipX, y: axisY }, { color: COL.sun, width: 1.5 });

		// seen from O: the Earth's radius at the Moon's distance (pi) and
		// the umbra's radius there (u)
		const earthEdgeAtMoon = { x: moonX, y: axisY - earth.r };

		segment(ctx, O, earthEdgeAtMoon, { color: COL.earth, width: 1.2 });
		segment(ctx, O, { x: moonX, y: umbraTop }, { color: COL.ink, width: 1.2 });
		segment(ctx, { x: earth.x, y: axisY - earth.r }, earthEdgeAtMoon, { color: COL.earth, width: 1, dash: [3, 3] });

		drawDot(ctx, O.x, O.y, 3.5, COL.earth);
		drawDot(ctx, moonX, umbraTop, 3.5, COL.ink);
		drawDot(ctx, moonX, earthEdgeAtMoon.y, 3.5, COL.earth);

		this.drawLabels({ O, moonX, axisY, umbraTop, earthEdge: earthEdgeAtMoon.y, tipX, earth });
	},

	/* The labels of a static drawing: they never move. */
	drawLabels(at) {
		const ctx = this.ctx;
		const h = this.height;
		const put = (text, x, y, color, align = 'center') => {
			ctx.fillStyle = textColor(color);
			ctx.font = labelFont(text);
			ctx.textAlign = align;
			ctx.textBaseline = 'middle';
			ctx.fillText(text, x, y);
		};

		put('O', at.O.x - 14, at.O.y + 14, COL.earth);
		put('Sun', 0.08 * this.width, h * 0.12, COL.sun, 'left');
		put('Earth', at.earth.x, at.axisY + at.earth.r + 16, COL.earth);
		put("Moon's distance", at.moonX, h * 0.97, COL.muted);
		put('π', at.moonX + 14, at.earthEdge - 4, COL.earth, 'left');
		put('u', at.moonX + 14, at.umbraTop + 6, COL.ink, 'left');
		subscriptLabel(ctx, 's', '⊙', { x: at.tipX - 56, y: at.axisY - 28 }, COL.sun);
		put('−', at.tipX - 32, at.axisY - 28, COL.sun);
		subscriptLabel(ctx, 'π', '⊙', { x: at.tipX - 12, y: at.axisY - 28 }, COL.sun);
	}
};

/* ---------- The parallax triangle (in the fold of Figure 4) ----------
   Static, not to scale: the Earth, centre O and radius R; the Moon M at
   the distance d; the line from M that grazes the Earth at T, square to
   the radius OT. The angle at M is the horizontal parallax pi, and
   sin pi = R / d. A diagram of the fold, not a numbered figure: it sits
   in a frame but not in a <figure class="fig">. The fold is closed when
   the page loads, so the canvas is drawn again when it opens (its frame
   then gets a width). */
const parallaxDiagram = {
	init() {
		this.canvas = byId('parallax-canvas');
		this.ctx = this.canvas.getContext('2d');
		this.width = 0;
		new ResizeObserver(() => {
			if (contentWidth(this.canvas.parentElement) !== this.width) {
				this.resize();
				this.draw();
			}
		}).observe(this.canvas.parentElement);
		whenCanvasFontsReady().then(() => this.draw());
		onPixelRatioChange(() => {
			this.resize();
			this.draw();
		});
		this.resize();
		this.draw();
	},

	/* The canvas as wide as the frame, 0.34 times as tall, and at least
	   160 px tall: on a phone the Earth stays large enough, and the angle
	   at M wide enough, for the labels T and pi. */
	resize() {
		const width = Math.max(SQUARE_CANVAS_MIN, contentWidth(this.canvas.parentElement) || 600);
		const height = Math.max(160, Math.round(0.34 * width));

		this.canvas.style.width = `${width}px`;
		this.canvas.style.height = `${height}px`;
		scaleCanvas(this.canvas, this.ctx, width, height);
		this.width = width;
		this.height = height;
	},

	draw() {
		const ctx = this.ctx;
		const w = this.width;
		const h = this.height;
		// the layout: the Earth on the left, the Moon on the same line
		const r = 0.37 * h;
		const O = { x: Math.max(0.2 * w, r + 14), y: 0.55 * h };
		const M = { x: 0.84 * w, y: O.y };
		const distance = M.x - O.x;
		// T, where the line from M touches the Earth: OT is square to TM,
		// so the angle TOM has the cosine r / OM
		const atO = Math.acos(r / distance) * R2D;
		const T = towards(O, atO, r);
		// the parallax: the angle at M between MO and MT
		const parallax = Math.asin(r / distance) * R2D;

		ctx.clearRect(0, 0, w, h);

		// the Earth
		ctx.fillStyle = withAlpha(COL.earth, 0.12);
		ctx.beginPath();
		ctx.arc(O.x, O.y, r, 0, TAU);
		ctx.fill();
		circle(ctx, O, r, { color: COL.earth, width: 2 });

		// the triangle: OM, the grazing line MT, the radius OT
		segment(ctx, O, M, { color: COL.ink, width: 1.5 });
		segment(ctx, M, T, { color: COL.ink, width: 1.5 });
		segment(ctx, O, T, { color: COL.earth, width: 2 });
		this.drawRightAngle(T, O, M);

		// the angle pi at M, between M -> O (180 deg) and M -> T
		const arcRadius = 0.36 * distance;

		screenArc(ctx, M, arcRadius, 180 - parallax, 180, { color: COL.ink, width: 1.2 });

		drawDot(ctx, O.x, O.y, 3.5, COL.earth);
		drawDot(ctx, M.x, M.y, 5, COL.planet);

		this.drawLabels({ O, M, T, r, atO, parallax, arcRadius });
	},

	/* The mark of the right angle at T, its sides along T -> O and T -> M. */
	drawRightAngle(T, O, M) {
		const size = 9;
		const unit = (from, to) => {
			const length = Math.hypot(to.x - from.x, to.y - from.y);

			return { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
		};
		const a = unit(T, O);
		const b = unit(T, M);
		const ctx = this.ctx;

		ctx.strokeStyle = COL.ink;
		ctx.lineWidth = 1.2;
		ctx.beginPath();
		ctx.moveTo(T.x + size * a.x, T.y + size * a.y);
		ctx.lineTo(T.x + size * (a.x + b.x), T.y + size * (a.y + b.y));
		ctx.lineTo(T.x + size * b.x, T.y + size * b.y);
		ctx.stroke();
	},

	/* The labels of a static drawing: they never move. */
	drawLabels(at) {
		const ctx = this.ctx;
		const { O, M, T, r, atO, parallax, arcRadius } = at;
		const middle = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

		centredLabel(ctx, 'O', { x: O.x - 14, y: O.y + 14 }, COL.earth);
		centredLabel(ctx, 'T', towards(O, atO, r + 14), COL.earth);
		centredLabel(ctx, 'M', { x: M.x + 16, y: M.y }, COL.planet);
		// R beside the radius, on the side away from the angle at O
		centredLabel(ctx, 'R', towards(middle(O, T), atO + 90, 12), COL.earth);
		centredLabel(ctx, 'd', { x: (O.x + M.x) / 2 + 0.1 * (M.x - O.x), y: O.y + 16 }, COL.ink);
		// pi just inside the arc, in the middle of the angle
		centredLabel(ctx, 'π', towards(M, 180 - parallax / 2, arcRadius - 14), COL.ink);
	}
};

/* ==========================================================================
   5. FIGURE 5: THE SUN, THE MOON AND THE SHADOW NEAR A NODE
   A new or full Moon when the Sun is x from the ascending node, the Moon
   at a chosen distance and the Sun at 1 au. (a) the new Moon: the
   Earth seen from the Sun, and the Moon's shadow on it (the penumbra,
   and a dot on its axis for the umbra), in Earth radii, north up; (b)
   the full Moon, at the other node: the Earth's umbra and the Moon, in
   degrees about the shadow's centre, north up and east to the left, as
   on the sky, in a fixed window of +-2° (the latitude reaches 1.71° at
   20° from the node); (c) the latitude of the new Moon against x, with
   the bands of the limits.
   ========================================================================== */

const LIMITS_WINDOW = 2;
const LIMITS_RANGE = [-20, 20];
const LIMITS_SUN_AU = 1;

/* The state of Figure 5 for the Sun x from the node and the Moon at
   'km': the sizes, the limits and the two latitudes. */
function limitsState(x, km) {
	const z = Eclipses.sizes(km, LIMITS_SUN_AU);
	const beta = LunarLatitude.latitude(x, MOON.i);

	return {
		x,
		km,
		z,
		limits: Eclipses.limits(z),
		betaNew: beta,
		betaFull: -beta,
		solar: Eclipses.solarEclipse(beta, z, km),
		lunar: Eclipses.lunarEclipse(beta, z)
	};
}

/* Panel (a) in Earth radii, on the plane through the Earth's centre
   square to the line from the Sun. An observer gamma Earth radii north
   of the Earth's centre, across that line, sees the Moon shifted south by
   gamma pi and the Sun by gamma pi_sun: the two centres coincide, and
   the observer is on the shadow's axis, at gamma = beta / (pi - pi_sun),
   and the discs still touch (s + s_sun) / (pi - pi_sun) further out, the
   penumbra's radius. The eclipse on the axis is total when the Moon seen
   from there (Eclipses.axisRadius) is larger than the Sun. */
function shadowOnEarth(st) {
	const scale = st.z.pM - st.z.pS;
	const gamma = st.betaNew / scale;

	return {
		gamma,
		penumbra: (st.z.sM + st.z.sS) / scale,
		total: Eclipses.axisRadius(st.km, Math.abs(gamma)) > st.z.sS
	};
}

/* The half-width of panel (a) (Earth radii): the farthest edge of the
   penumbra, at 20° from the node, for the nearest and the farthest Moon
   the slider allows, and a margin. */
function shadowWindow() {
	const slider = byId('limits-distance');
	const beta = LunarLatitude.latitude(LIMITS_RANGE[1], MOON.i);
	const reach = km => {
		const z = Eclipses.sizes(km, LIMITS_SUN_AU);

		return (beta + z.sM + z.sS) / (z.pM - z.pS);
	};

	return 1.06 * Math.max(reach(Number(slider.min)), reach(Number(slider.max)));
}

/* One of the two square drawings of Figure 5: 'span' is its half-width,
   in its own unit (a number, or a function giving one). */
function limitsPanel(canvasId, span, drawPanel) {
	return {
		labels: new LabelPlacer(),

		init() {
			squareCanvas(this, byId(canvasId), 340, 4);
		},

		draw() {
			if (!limitsFigure.state) {
				return;
			}

			const ctx = this.ctx;
			const scalePx = this.R / (typeof span === 'function' ? span() : span); // px per unit
			const at = (east, north) => ({ x: this.cx - scalePx * east, y: this.cy - scalePx * north });

			this.labels.begin({ x0: 2, y0: 2, x1: this.width - 2, y1: this.width - 2 });
			ctx.clearRect(0, 0, this.width, this.width);
			ctx.save();
			ctx.beginPath();
			ctx.rect(0, 0, this.width, this.width);
			ctx.clip();

			// the ecliptic, across the whole panel
			segment(ctx, { x: 0, y: this.cy }, { x: this.width, y: this.cy }, { color: COL.sun, width: 1.5 });
			drawPanel(ctx, at, scalePx, limitsFigure.state, this.labels);
			ctx.restore();
		}
	};
}

/* The Moon's path across a panel, through its centre at (0, beta), with
   the slope of its circle there. */
function drawMoonPath(ctx, at, beta, F) {
	const slope = tan(MOON.i) * cos(F);
	const reach = LIMITS_WINDOW * 1.2;

	segment(ctx, at(-reach, beta - slope * reach), at(reach, beta + slope * reach), {
		color: COL.epicycle,
		width: 1.2,
		dash: [6, 4]
	});
}

/* A filled disc with an outline, in degrees on a panel. */
function disc(ctx, centre, radiusPx, fill, stroke) {
	ctx.fillStyle = fill;
	ctx.beginPath();
	ctx.arc(centre.x, centre.y, radiusPx, 0, TAU);
	ctx.fill();
	circle(ctx, centre, radiusPx, { color: stroke, width: 1.5 });
}

/* Panel (a): the new Moon. The Earth seen from the Sun, and the Moon's
   shadow on it: the penumbra, where the Moon hides part of the Sun, and
   a dot on the shadow's axis for the umbra, far smaller than the dot,
   filled when the eclipse there is total and a ring when it is annular.
   A solar eclipse is seen somewhere when the penumbra reaches the Earth,
   and a central one when the axis does. */
const solarPanel = limitsPanel('limits-solar', shadowWindow, (ctx, at, scalePx, st, labels) => {
	const earth = at(0, 0);
	const shadow = shadowOnEarth(st);
	const axis = at(0, shadow.gamma);
	const penumbra = scalePx * shadow.penumbra;

	disc(ctx, earth, scalePx, withAlpha(COL.earth, 0.14), COL.earth);
	labelOutside(ctx, 'Earth', earth, scalePx, 160, COL.earth, labels);
	disc(ctx, axis, penumbra, withAlpha(COL.ink, 0.18), COL.ink);
	labelOutside(ctx, 'penumbra', axis, penumbra, 25, COL.ink, labels);

	if (shadow.total) {
		drawDot(ctx, axis.x, axis.y, 4.5, COL.ink, false);
	} else {
		circle(ctx, axis, 4.5, { color: COL.ink, width: 1.8 });
	}
});

/* Panel (b): the full Moon, its centre at -beta from the shadow's. */
const lunarPanel = limitsPanel('limits-lunar', LIMITS_WINDOW, (ctx, at, scalePx, st, labels) => {
	const shadow = at(0, 0);
	const moon = at(0, st.betaFull);
	const umbra = scalePx * st.limits.umbra;
	const moonRadius = scalePx * st.z.sM;

	drawMoonPath(ctx, at, st.betaFull, st.x + 180);
	disc(ctx, shadow, umbra, withAlpha(COL.ink, 0.22), COL.ink);
	labelOutside(ctx, 'umbra', shadow, umbra, 35, COL.ink, labels);
	disc(ctx, moon, moonRadius, COL.card, COL.planet);

	// the part of the Moon inside the umbra, darkened
	ctx.save();
	ctx.beginPath();
	ctx.arc(shadow.x, shadow.y, umbra, 0, TAU);
	ctx.clip();
	ctx.fillStyle = withAlpha(COL.planet, 0.55);
	ctx.beginPath();
	ctx.arc(moon.x, moon.y, moonRadius, 0, TAU);
	ctx.fill();
	ctx.restore();
	circle(ctx, moon, moonRadius, { color: COL.planet, width: 1.5 });
});

const limitsFigure = {
	plot: null,
	state: null,

	init() {
		const figure = byId('limits-plot').closest('figure');

		solarPanel.init();
		lunarPanel.init();

		this.plot = new Plot2D(byId('limits-plot'), {
			x: LIMITS_RANGE,
			y: [-LIMITS_WINDOW, LIMITS_WINDOW],
			xLabel: 'the Sun from ☊ at the new or full Moon (°)',
			yLabel: 'β at the new Moon (°)',
			aspect: 0.32,
			minHeight: 200,
			onDraw: () => this.drawPlot()
		});

		wireSlider(
			byId('limits-node'),
			() => this.update(),
			value => `${signed(Number(value), 1)}°`
		);
		wireSlider(
			byId('limits-distance'),
			() => this.update(),
			value => `${thousands(Number(value))} km`
		);
		wirePresets(figure);

		this.update();
	},

	update() {
		this.state = limitsState(readNumber('limits-node'), readNumber('limits-distance'));
		this.showReadout();
		solarPanel.draw();
		lunarPanel.draw();
		this.plot.redraw();
	},

	showReadout() {
		const st = this.state;
		const solar = st.solar.kind ?? 'none';
		const lunar = st.lunar.kind ? `${st.lunar.kind}, magnitude ${fixed(st.lunar.magnitude, 2)}` : 'none';

		showLines('limits-readout', [
			`\\text{new Moon: } \\beta = ${texArcmin(st.betaNew)},\\ \\gamma = ${signed(shadowOnEarth(st).gamma, 2)}`,
			`\\text{solar eclipse: ${solar}}`,
			`\\text{full Moon: } \\beta = ${texArcmin(st.betaFull)}`,
			`\\text{lunar eclipse: ${lunar}}`,
			`s = ${fixed(st.z.sM * 60, 1)}',\\ \\pi = ${fixed(st.z.pM * 60, 1)}',\\ u = ${fixed(st.limits.umbra * 60, 1)}'`
		]);
	},

	/* Panel (c). */
	drawPlot() {
		if (!this.state) {
			return;
		}

		const p = this.plot;
		const st = this.state;
		const xs = [LIMITS_RANGE[0], LIMITS_RANGE[1]];
		const band = (limit, color, alpha) => p.band(xs, [-limit, -limit], [limit, limit], { color, alpha });

		p.frame();
		band(st.limits.solar, COL.sun, 0.22);
		band(st.limits.lunar, COL.planet, 0.22);
		p.hline(0, { color: COL.ink, width: 1 });
		p.fn(x => LunarLatitude.latitude(x, MOON.i), { color: COL.ink, width: 2 });
		p.marker(st.x, st.betaNew, { color: COL.ink, radius: 5 });
	}
};

/* ==========================================================================
   6. FIGURE 6: THE ECLIPSE SEASONS
   Static. Through 2026 and 2027, the model Sun's distance from the nearest
   node of the model's Moon (folded onto [-90°, 90°), shown within 40° of
   the node), with the model's new and full Moons on it, and the bands of the solar and lunar limits
   (their range with the Moon's distance, 356·400 to 406·700 km).
   ========================================================================== */

const SEASONS_DAYS = 730;

/* The figure shows the Sun up to this far from a node (deg). */
const SEASONS_REACH = 40;
const SEASONS_SAMPLES_PER_DAY = 2;

/* The Moon's least and greatest distances of the limits (km). */
const MOON_NEAREST = 356400;
const MOON_FARTHEST = 406700;

/* The limits as angles from the node (deg) for a Moon at 'km'. */
function nodeLimits(km) {
	const l = Eclipses.limits(Eclipses.sizes(km, 1));
	const inF = b => LunarLatitude.argumentForLatitude(b, MOON.i);

	return { solar: inF(l.solar), lunar: inF(l.lunar) };
}

/* The model Sun's distance from the nearest node at JD (deg). */
function modelSunFromNode(jd) {
	const sun = SolarEccentric.make(MODEL.sun)(jd);

	return Eclipses.nodeAngle(sun - LunarLatitude.state(MOON, jd).node);
}

const seasonsFigure = {
	plot: null,

	init() {
		this.days = [];
		this.angles = [];

		for (let i = 0; i <= SEASONS_DAYS * SEASONS_SAMPLES_PER_DAY; i++) {
			const day = i / SEASONS_SAMPLES_PER_DAY;

			this.days.push(day);
			this.angles.push(modelSunFromNode(YEAR_START + day));
		}

		this.syzygies = syzygyIndices(YEAR_START, YEAR_START + SEASONS_DAYS).map(k => {
			const s = Eclipses.predict(MODEL, k);

			return { syzygy: s, day: s.jd - YEAR_START, angle: modelSunFromNode(s.jd) };
		});
		this.near = nodeLimits(MOON_NEAREST);
		this.far = nodeLimits(MOON_FARTHEST);

		const ticks = [];

		[YEAR, YEAR + 1].forEach((year, n) => {
			monthStarts(year).forEach((t, i) => {
				if (i % 3 === 0) {
					ticks.push({ value: t.value + n * 365, label: i === 0 ? `${t.label} ${year}` : t.label });
				}
			});
		});

		this.plot = new Plot2D(byId('seasons-plot'), {
			x: [0, SEASONS_DAYS],
			y: [-SEASONS_REACH, SEASONS_REACH],
			xLabel: 'date',
			yLabel: 'the Sun from the nearest node (°)',
			xTicks: () => ticks,
			yTicks: () => [-40, -20, 0, 20, 40].map(value => ({ value, label: `${value}°` })),
			aspect: 0.5,
			onDraw: () => this.draw()
		});
	},

	draw() {
		const p = this.plot;
		const xs = [0, SEASONS_DAYS];
		const band = (low, high, color, alpha) => {
			p.band(xs, [-high, -high], [-low, -low], { color, alpha });
			p.band(xs, [low, low], [high, high], { color, alpha });
		};

		p.frame();

		// each band: the inner limit (farthest Moon) solid, the range out
		// to the outer limit (nearest Moon) lighter
		band(0, this.far.solar, COL.sun, 0.2);
		band(this.far.solar, this.near.solar, COL.sun, 0.1);
		band(0, this.far.lunar, COL.planet, 0.2);
		band(this.far.lunar, this.near.lunar, COL.planet, 0.1);
		p.hline(0, { color: COL.ink, width: 1 });

		// the Sun's distance from the node, where it is within the figure's
		// reach: one segment for each passage by a node
		let start = null;

		for (let i = 0; i <= this.angles.length; i++) {
			const inside = i < this.angles.length && Math.abs(this.angles[i]) <= SEASONS_REACH;

			if (inside && start === null) {
				start = i;
			} else if (!inside && start !== null) {
				p.curve(this.days.slice(start, i), this.angles.slice(start, i), { color: COL.ink, width: 1.5 });
				start = null;
			}
		}

		this.syzygies
			.filter(point => Math.abs(point.angle) <= SEASONS_REACH)
			.forEach(point => {
				const s = point.syzygy;

				if (s.kind) {
					eclipseMark(p, point.day, point.angle, s);
				} else {
					drawDot(p.ctx, p.px(point.day), p.py(point.angle), 3, s.solar ? COL.sun : COL.planet, true);
				}
			});
	}
};

/* ==========================================================================
   7. FIGURES 7 AND 8: THE ERROR CURVES OF THE LATITUDE
   Delta beta = beta_model - beta_reference (shared/errorcurve.js, with
   the reference Moon's latitude). No slider changes a model here, so the
   widget fits its scale to each span.
   ========================================================================== */

/* Figure 7: the latitude fitted to 2026, with the mean inclination 5.145°
   as a ghost, over 2026, two months and a century; dots at the new and
   full Moons (spans of a year or less). */
const latitudeErrorFigure = {
	init() {
		const start = YEAR_START;
		const end = YEAR_START + 365;
		const middle = (start + end) / 2;
		const curve = new ErrorCurve(byId('error-latitude'), {
			body: 'moon',
			reference: moonLatitude,
			quantity: 'β',
			start: start,
			end: end,
			spans: [
				{ label: '2 months', years: 60 / 365.25 },
				{ label: '1 year', years: 1 },
				{ label: '100 years', years: 100 }
			],
			ghostButtons: false
		});
		const fit = LunarLatitude.make(MOON);
		const syzygies = syzygyIndices(middle - 190, middle + 190).map(k => Eclipses.reference(k).syzygy);

		curve.addGhost({
			label: 'the mean inclination, 5.145°',
			short: 'mean inclination',
			color: COL.epicycle,
			fn: LunarLatitude.make(Object.assign({}, MOON, { i: 5.145 }))
		});
		curve.addModel({
			label: 'the ecliptic latitude fitted to the new and full Moons of 2026',
			short: 'fitted',
			color: COL.planet,
			fn: fit
		});
		curve.addMarks({
			label: 'at the new and full Moons (spans of a year or less)',
			color: COL.planet,
			fn: fit,
			dates: syzygies,
			maxYears: 1.01
		});
	}
};

/* Figure 8: Ptolemy's latitude around his eclipse of 20 October 134, and
   over 2000 years (866 BC to AD 1134, inside the reference sky's range). */
const ptolemyErrorFigure = {
	init() {
		const start = Time.julianDay(134, 9, 21);
		const end = start + 60;
		const middle = (start + end) / 2;
		const curve = new ErrorCurve(byId('error-ptolemy'), {
			body: 'moon',
			reference: moonLatitude,
			quantity: 'β',
			start: start,
			end: end,
			spans: [
				{ label: '2 months', years: 60 / 365.25 },
				{ label: '2000 years', years: 2000 }
			],
			ghostButtons: false
		});
		const ptolemy = LunarLatitude.make(LunarLatitude.PTOLEMY);
		const syzygies = syzygyIndices(middle - 40, middle + 40).map(k => Eclipses.reference(k).syzygy);

		curve.addModel({
			label: "Ptolemy's ecliptic latitude (<em>Almagest</em> IV 9, V 12)",
			short: 'Ptolemy',
			color: COL.epicycle,
			fn: ptolemy
		});
		curve.addMarks({
			label: 'at the new and full Moons (spans of a year or less)',
			color: COL.epicycle,
			fn: ptolemy,
			dates: syzygies,
			maxYears: 1.01
		});
	}
};

/* ==========================================================================
   8. PAGE START
   Shared components first (they typeset the prose), then the figures.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
	Site.initPage();
	startFigures([
		calendarFigure,
		plateFigure,
		orbitFigure,
		shadowFigure,
		parallaxDiagram,
		limitsFigure,
		seasonsFigure,
		latitudeErrorFigure,
		ptolemyErrorFigure
	]);
});
