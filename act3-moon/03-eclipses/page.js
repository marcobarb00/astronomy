// @ts-check
/* ==========================================================================
   PAGE 3.3 · ECLIPSES - SCRIPT (page.js)
   Seven figures, each with its own init and draw (and update when it has
   controls):
	 1. the new and full Moons of 2021 - 2030  (2D, static: a calendar,
											   the eclipses marked)
	 2. the Moon near Regulus                 (blue plate, static: the
											   Moon's path of August 2026)
	 3. the Moon's inclined circle            (3D, ecliptic frame; date;
											   three views: a month, a
											   year, the nodes' turn)
	 4. the two shadows                       (2D, static, not to scale:
											   (a) the Earth's shadow at
											   the Moon's distance, (b)
											   the Moon's shadow on the
											   Earth; in the fold, the
											   parallax triangle, not
											   numbered)
	 5. the Sun, the Moon and the shadow      (2D: (a) new Moon, (b) full
		near a node                            Moon, (c) the latitude and
											   the limits; the Sun's
											   distance from the node, the
											   Moon's distance)
	 6. the eclipse seasons of 2026 - 2027    (2D, static)
	 7. the latitude fitted to 2026           (error curve of the latitude,
											   two months and the year)
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
	 4. Figure 4: the two shadows, and the parallax triangle
	 5. Figure 5: the Sun, the Moon and the shadow near a node
	 6. Figure 6: the eclipse seasons
	 7. Figure 7: the error curve of the latitude
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

/* The marks of a plot are drawn at their full size when its box is at
   least this wide (px), and smaller on a narrower one (a phone), down to
   MARK_SCALE_MIN, so that the two eclipses of a season stay apart. */
const MARK_FULL_WIDTH = 520;
const MARK_SCALE_MIN = 0.62;

const markScale = plot => clamp((plot.box.right - plot.box.left) / MARK_FULL_WIDTH, MARK_SCALE_MIN, 1);

/* An eclipse mark on a plot: a disc, filled for a total or annular
   eclipse, a ring for a partial one; a small grey dot for a syzygy with
   no eclipse. */
function eclipseMark(plot, x, y, syzygy) {
	const ctx = plot.ctx;
	const px = plot.px(x);
	const py = plot.py(y);
	const k = markScale(plot);

	if (!syzygy.kind) {
		drawDot(ctx, px, py, 2.2 * k, withAlpha(COL.muted, 0.6), false);
		return;
	}

	const color = syzygy.solar ? COL.sun : COL.planet;

	if (syzygy.kind === 'partial') {
		ctx.strokeStyle = color;
		ctx.lineWidth = 2 * k;
		ctx.fillStyle = COL.card;
		ctx.beginPath();
		ctx.arc(px, py, 4.5 * k, 0, TAU);
		ctx.fill();
		ctx.stroke();
	} else {
		drawDot(ctx, px, py, 5.5 * k, color);
	}
}

/* The canvas of a drawing: as wide as its column (SQUARE_CANVAS_MIN to
   maxWidth px) and heightFor(width) px tall, scaled for the device pixel
   ratio. It follows the column when the page is resized, or when a fold
   that holds it opens, and calls owner.draw(). Sets owner.ctx, width and
   height. */
function fitCanvas(owner, canvas, heightFor, maxWidth = Infinity) {
	const targetWidth = () => clamp(contentWidth(canvas.parentElement) || 600, SQUARE_CANVAS_MIN, maxWidth);

	const resize = () => {
		const width = targetWidth();
		const height = Math.round(heightFor(width));

		canvas.style.width = `${width}px`;
		canvas.style.height = `${height}px`;
		owner.ctx = canvas.getContext('2d');
		scaleCanvas(canvas, owner.ctx, width, height);
		owner.width = width;
		owner.height = height;
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

/* A text label centred at a canvas point, or set from it to the right
   ('left') or to the left ('right'), in the atlas fonts and the text
   colour of 'color'. For the labels of a static drawing, which never
   move. */
function putLabel(ctx, text, point, color, align = 'center') {
	ctx.fillStyle = textColor(color);
	ctx.font = labelFont(text);
	ctx.textAlign = align;
	ctx.textBaseline = 'middle';
	ctx.fillText(text, point.x, point.y);
}

/* ==========================================================================
   1. FIGURE 1: THE NEW AND FULL MOONS OF 2021 - 2030
   Static. One row a year, the day of the year across: every new and full
   Moon of the reference sky, the eclipses marked (Eclipses.reference,
   the eclipses NASA lists for those years).
   ========================================================================== */

const CALENDAR_FIRST = 2021;
const CALENDAR_LAST = 2030;

/* The days shown: a year, and a few days more at each end, so that a mark
   on 1 January or 31 December (the eclipse of 31 December 2028) stays
   inside the box. */
const CALENDAR_DAYS = [-8, 374];

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
			x: CALENDAR_DAYS,
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

   The month view draws the triangle of sin β = sin i sin F: the arc F
   along the Moon's circle from ☊ to L, the arc λ - Ω along the ecliptic
   from ☊ to the point under L, the arc β between them, and the angle i
   at ☊. The Earth's shadow is a dark disc opposite the Sun. The ecliptic
   has no name in the figure (its key has it): the Moon's circle passes
   within 15° of it on either side, so a name beside it would be crossed
   on some dates.
   ========================================================================== */

/* The three views (CLAUDE.md: a view the reader chooses may change what
   is drawn), each drawing only what moves visibly at its speed:
	 - a month, with everything, played 1.5 days a second (20 seconds);
	 - a year, with the Sun, the shadow and the nodes, played 36 days a
	   second (the Sun goes round in 10 seconds, and meets a node every 5):
	   the Moon would go round more than once a second, so it is left out;
	 - the nodes' turn, with the Moon's circle and its nodes alone, played
	   over the whole 18.6 years in about 9 seconds. */
const MONTH_VIEW = 'A month';
const YEAR_VIEW = 'A year';
const TURN_VIEW = "The nodes' turn";
const VIEW_DAYS_PER_SECOND = { [MONTH_VIEW]: 1.5, [YEAR_VIEW]: 36, [TURN_VIEW]: 750 };

/* The arrow of the ecliptic pole reaches this far. */
const POLE_LENGTH = 1.25;

/* The inclination of the drawing, as a multiple of the model's. */
const ORBIT_EXAGGERATION = 3;

/* The arc that marks the inclination i joins the ecliptic and the Moon's
   circle this far from the ascending node, and its letter sits this far
   (deg). */
const INCLINATION_ARC = 22;
const INCLINATION_LETTER = 31;

/* A thick arc on a sphere, from a towards b sweeping 'angle' degrees.
   Sphere3D.arc strokes its segments one by one, with round ends, and
   behind the sphere, where they are translucent, the ends of a thick
   line show as beads: here each stretch in front of the sphere or behind
   it is one stroke. */
function thickArc(sphere, a, b, angle, color, width) {
	const ctx = sphere.ctx;
	const points = sampleArc(a, b, angle, 1, Math.max(8, Math.ceil(angle / 3))).map(point => sphere.project(point));
	const isFar = index => (points[index].d + points[index + 1].d) / 2 > 0;
	let from = 0;

	ctx.strokeStyle = color;
	ctx.lineWidth = width;
	ctx.lineCap = 'butt';
	ctx.lineJoin = 'round';

	for (let index = 1; index <= points.length - 1; index++) {
		// the stretch ends at the last segment, or where the next one changes side
		if (index < points.length - 1 && isFar(index) === isFar(from)) {
			continue;
		}

		ctx.globalAlpha = isFar(from) ? FAR_SIDE_ALPHA : 1;
		ctx.beginPath();
		ctx.moveTo(points[from].x, points[from].y);

		for (let k = from + 1; k <= index; k++) {
			ctx.lineTo(points[k].x, points[k].y);
		}

		ctx.stroke();
		from = index;
	}

	ctx.globalAlpha = 1;
}

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
		buildChoice(byId('orbit-views'), [MONTH_VIEW, YEAR_VIEW, TURN_VIEW], this.view, name => {
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
		const dateAndNode = `\\text{${dateYearText(jd)}:}\\quad \\Omega = ${fixed(moon.node, 1)}^\\circ`;
		const sunAndNode = `\\text{the Sun } ${fixed(Math.abs(sunFromNode), 1)}^\\circ \\text{ ${sunFromNode < 0 ? 'before' : 'past'} the nearest node}`;

		if (this.view === TURN_VIEW) {
			// only the slow motion: the node, and how far it has turned
			const start = LunarLatitude.state(MOON, YEAR_START).node;

			showLines('orbit-readout', [
				dateAndNode,
				`\\text{turned } ${fixed(norm360(start - moon.node), 1)}^\\circ \\text{ west since 1 January ${YEAR}}`
			]);
			return;
		}

		if (this.view === YEAR_VIEW) {
			showLines('orbit-readout', [dateAndNode, sunAndNode]);
			return;
		}

		showLines('orbit-readout', [
			dateAndNode,
			`F = ${fixed(moon.F, 1)}^\\circ,\\quad \\beta = ${signed(moon.beta, 2).replace('−', '-')}^\\circ`,
			sunAndNode
		]);
	},

	/* The drawn circle: its inclination, its nodes, the point 'top' 90°
	   along it from the ascending node, the Moon L on it, and the point
	   'foot' of the ecliptic under the Moon. */
	geometry() {
		const { moon } = this.state;
		const i = ORBIT_EXAGGERATION * MOON.i;
		const node = moon.node;
		// the pole of the drawn circle: R_z(Omega) R_x(i) applied to z
		const pole = [sin(node) * sin(i), -cos(node) * sin(i), cos(i)];
		const ascending = fromLonLat(node, 0);
		const top = cross3(pole, ascending);
		const L = lin2(ascending, top, cos(moon.F), sin(moon.F));
		const drawn = toLonLat(L);

		return {
			i,
			node,
			ascending,
			descending: fromLonLat(node + 180, 0),
			east: fromLonLat(node + 90, 0), // 90° along the ecliptic from the ascending node
			top,
			L,
			drawn,
			foot: fromLonLat(drawn.lon, 0)
		};
	},

	draw() {
		if (!this.state) {
			return; // a resize can ask for a drawing before the first update
		}

		const s = this.sphere;
		const g = this.geometry();

		s.outline();

		// the ecliptic and its pole K, the Moon's circle and its line of nodes
		s.circle([1, 0, 0], [0, 1, 0], { color: COL.sun, width: 2 });
		s.axis([0, 0, POLE_LENGTH], 'K', { color: COL.sun, labelColor: COL.sun });
		s.circle(g.ascending, g.top, { color: COL.epicycle, width: 2 });
		s.path([g.descending, g.ascending], { color: COL.muted, width: 1.2, dash: [5, 4] });

		if (this.view === MONTH_VIEW) {
			this.drawTriangle(g);
		} else if (this.view === TURN_VIEW) {
			this.drawNodeLongitude(g);
		}

		// gamma and the nodes
		s.point([1, 0, 0], { color: COL.ink, radius: 4, ring: true });
		s.label('γ', [1, 0, 0], { color: COL.ink, kind: 'symbol', dx: 8, dy: 16 });
		s.point(g.ascending, { color: COL.ink, radius: 4, ring: true });
		s.label('☊', g.ascending, { color: COL.ink, kind: 'symbol', dx: 8, dy: -8 });
		s.point(g.descending, { color: COL.ink, radius: 4, ring: true });
		s.label('☋', g.descending, { color: COL.ink, kind: 'symbol', dx: 8, dy: -8 });

		if (this.view === TURN_VIEW) {
			return; // the slow motion alone: no Sun, no Moon
		}

		this.drawSunAndShadow();

		if (this.view === MONTH_VIEW) {
			s.point(g.L, { color: COL.planet, radius: 6, ring: true });
			s.label('L', g.L, { color: COL.planet, kind: 'symbol', dx: 9, dy: -9 });
		}
	},

	/* The Sun, and opposite it the Earth's shadow at the Moon's distance
	   (a dark disc, drawn larger than it is, as the Sun is). */
	drawSunAndShadow() {
		const s = this.sphere;
		const { sunLongitude } = this.state;

		s.point(fromLonLat(sunLongitude + 180, 0), { color: COL.ink, radius: 7, ring: true });
		s.point(fromLonLat(sunLongitude, 0), { color: COL.sun, radius: 7, ring: true });
		s.label('☉', fromLonLat(sunLongitude, 0), { color: COL.sun, kind: 'symbol', dx: -18, dy: 18 });
	},

	/* The month view: the triangle with its corners at ☊, at the Moon L
	   and at the point of the ecliptic under L. Its sides are F (along
	   the Moon's circle), λ - Ω (along the ecliptic, in the same quadrant
	   as F) and β; its angle at ☊ is i. */
	drawTriangle(g) {
		const s = this.sphere;
		const { moon } = this.state;
		const alongEcliptic = norm360(g.drawn.lon - g.node);
		const side = Math.sign(g.drawn.lat) || 1;
		const pole = [0, 0, 1];

		thickArc(s, g.ascending, g.east, alongEcliptic, COL.sun, 5);
		thickArc(s, g.ascending, g.top, moon.F, COL.epicycle, 5);
		s.labelArc('F', g.ascending, g.top, moon.F, { color: COL.epicycle, kind: 'symbol', dx: 8, dy: -10 });

		// the latitude, from the ecliptic up (or down) to L; its letter under
		// the foot of the arc, clear of L and of the arc on either side
		s.arc(g.foot, scale(pole, side), Math.abs(g.drawn.lat), { color: COL.planet, width: 3 });
		s.label('β', g.foot, { color: COL.planet, kind: 'symbol', dx: 7, dy: 22 });

		// the inclination: an arc about the ascending node, from the
		// ecliptic to the Moon's circle
		const about = (distance, angle) =>
			add3(scale(g.ascending, cos(distance)), scale(lin2(g.east, pole, cos(angle), sin(angle)), sin(distance)));
		const mark = [];

		for (let step = 0; step <= 8; step++) {
			mark.push(about(INCLINATION_ARC, (g.i * step) / 8));
		}

		s.path(mark, { color: COL.ink, width: 1.5 });
		s.label('i', about(INCLINATION_LETTER, g.i / 2), { color: COL.ink, kind: 'symbol', dx: -3, dy: 6 });
	},

	/* The nodes' turn: the ecliptic longitude Ω of the ascending node,
	   counted eastward from γ. */
	drawNodeLongitude(g) {
		const s = this.sphere;

		thickArc(s, [1, 0, 0], [0, 1, 0], g.node, COL.ink, 4);
		s.labelArc('Ω', [1, 0, 0], [0, 1, 0], g.node, { color: COL.ink, kind: 'symbol', dx: -6, dy: 24 });
	}
};

/* ==========================================================================
   4. FIGURE 4: THE TWO SHADOWS, AND THE PARALLAX TRIANGLE
   Two static drawings, not to scale, side by side (stacked on a phone).
   (a) The Earth's shadow at the Moon's distance: the Sun, the Earth O and
   the ray that grazes both on the same side and closes the umbra. On the
   Moon's distance the Earth's radius, seen from O under the angle pi, is
   cut by the ray into the umbra's radius u and the part s_sun - pi_sun,
   the angle of the ray to the axis (marked at the tip of the cone too).
   (b) The Moon's shadow on the Earth, from the side: the Moon beta north
   of the Sun as seen from O, and its shadow, whose axis meets the plane
   through O across the line of sight gamma Earth radii north of O.
   ========================================================================== */

/* Each drawing is at most this wide, and this tall for its width (px):
   tall enough on a phone for the labels between its lines. */
const SHADOW_PANEL_MAX = 460;
const shadowPanelHeight = width => clamp(0.62 * width, 240, 290);

/* The width of a symbol with a subscript, as subscriptLabel draws it. */
function subscriptWidth(ctx, base, sub) {
	ctx.font = FONT_SYMBOL;

	const baseWidth = ctx.measureText(base).width;

	ctx.font = 'italic 500 15px "Cormorant Garamond", Georgia, serif';

	return baseWidth + ctx.measureText(sub).width;
}

/* The width of "s_sun − pi_sun" as sunDifferenceLabel draws it. */
const SUN_DIFFERENCE_GAP = 20; // the minus sign and the space round it

function sunDifferenceWidth(ctx) {
	return subscriptWidth(ctx, 's', '⊙') + SUN_DIFFERENCE_GAP + subscriptWidth(ctx, 'π', '⊙');
}

/* "s_sun − pi_sun" from the canvas point 'left' to the right, in the
   Sun's text colour. */
function sunDifferenceLabel(ctx, left) {
	const first = subscriptWidth(ctx, 's', '⊙');
	const second = subscriptWidth(ctx, 'π', '⊙');

	subscriptLabel(ctx, 's', '⊙', { x: left.x + first / 2, y: left.y }, COL.sun);
	putLabel(ctx, '−', { x: left.x + first + SUN_DIFFERENCE_GAP / 2, y: left.y }, COL.sun);
	subscriptLabel(ctx, 'π', '⊙', { x: left.x + first + SUN_DIFFERENCE_GAP + second / 2, y: left.y }, COL.sun);
}

/* ---------- (a) The Earth's shadow at the Moon's distance ---------- */

/* The umbra is drawn darker than the penumbra of panel (b). */
const UMBRA_ALPHA = 0.3;
const PENUMBRA_ALPHA = 0.1;

const shadowFigure = {
	init() {
		fitCanvas(this, byId('shadow-canvas'), shadowPanelHeight, SHADOW_PANEL_MAX);
		this.draw();
	},

	/* The layout for the canvas' size: the Earth's centre O and radius;
	   the tip of the umbra near the right edge; the Moon's distance half
	   way, where the umbra has half the Earth's radius; the angle 'half'
	   (deg) of the grazing ray to the axis; and the Sun, which the same
	   ray grazes, its edge just inside the canvas. */
	layout() {
		const w = this.width;
		const axisY = 0.5 * this.height;
		const radius = 0.2 * this.height;
		const O = { x: 0.3 * w, y: axisY };
		const tip = { x: w - 12, y: axisY };
		const half = asin(radius / (tip.x - O.x));
		const sunX = (0.085 * w - tip.x * sin(half)) / (1 - sin(half));
		const moonX = (O.x + tip.x) / 2;
		const rayHeight = x => (tip.x - x) * tan(half);

		return {
			axisY,
			radius,
			O,
			tip,
			half,
			sun: { x: sunX, y: axisY, r: (tip.x - sunX) * sin(half) },
			moonX,
			rayHeight,
			A: { x: moonX, y: axisY }, // on the axis, at the Moon's distance
			U: { x: moonX, y: axisY - rayHeight(moonX) }, // the umbra's edge there
			E: { x: moonX, y: axisY - radius } // the Earth's radius carried there
		};
	},

	draw() {
		const ctx = this.ctx;
		const w = this.width;
		const h = this.height;
		const at = this.layout();
		const { axisY, radius, O, tip, half, sun, moonX, A, U, E } = at;
		// where the ray touches a circle, above ('side' 1) or below (-1)
		// the axis: its radius there is square to the ray
		const touch = (centre, r, side) => ({ x: centre.x + r * sin(half), y: centre.y - side * r * cos(half) });

		ctx.clearRect(0, 0, w, h);

		// the axis, and the Moon's distance
		segment(ctx, { x: 0, y: axisY }, { x: w, y: axisY }, { color: COL.muted, width: 1, dash: [2, 4] });
		segment(
			ctx,
			{ x: moonX, y: 0.07 * h },
			{ x: moonX, y: h - 26 },
			{ color: COL.muted, width: 1.2, dash: [6, 4] }
		);

		// the umbra
		ctx.fillStyle = withAlpha(COL.ink, UMBRA_ALPHA);
		ctx.beginPath();
		ctx.moveTo(touch(O, radius, 1).x, touch(O, radius, 1).y);
		ctx.lineTo(tip.x, tip.y);
		ctx.lineTo(touch(O, radius, -1).x, touch(O, radius, -1).y);
		ctx.closePath();
		ctx.fill();

		// the Sun, the grazing rays above and below, and the Earth
		disc(ctx, sun, sun.r, withAlpha(COL.sun, 0.35), COL.sun);
		segment(ctx, touch(sun, sun.r, 1), tip, { color: COL.sun, width: 1.5 });
		segment(ctx, touch(sun, sun.r, -1), tip, { color: COL.sun, width: 1.5 });
		disc(ctx, O, radius, COL.card, COL.earth);

		// seen from O: the Earth's radius carried to the Moon's distance
		// (pi), and the umbra's radius there (u)
		segment(ctx, { x: O.x, y: axisY - radius }, E, { color: COL.earth, width: 1, dash: [3, 3] });
		segment(ctx, O, E, { color: COL.earth, width: 1.2 });
		segment(ctx, O, U, { color: COL.ink, width: 1.2 });

		// on the Moon's distance: u, then the part the cone has narrowed by
		segment(ctx, A, U, { color: COL.ink, width: 4 });
		segment(ctx, U, E, { color: COL.sun, width: 4 });

		// the angle of the ray to the axis, at the tip of the cone
		screenArc(ctx, tip, 0.5 * (tip.x - moonX), 180, 180 + half, { color: COL.sun, width: 1.5 });

		drawDot(ctx, O.x, O.y, 3.5, COL.earth);
		drawDot(ctx, U.x, U.y, 3.5, COL.ink);
		drawDot(ctx, E.x, E.y, 3.5, COL.earth);

		this.drawLabels(at);
	},

	/* The labels of a static drawing: they never move. The angles are
	   named on the Moon's distance, where their lines are farthest apart:
	   u and s_sun - pi_sun beside their parts, pi beside a bracket that
	   spans both. */
	drawLabels(at) {
		const ctx = this.ctx;
		const { axisY, radius, O, moonX, rayHeight, U, E } = at;
		const beside = moonX + 9;
		const bracketX = beside + sunDifferenceWidth(ctx) + 8;

		putLabel(ctx, 'O', { x: O.x - 13, y: O.y - 12 }, COL.earth);
		putLabel(ctx, 'Earth', { x: O.x, y: axisY + 0.56 * radius }, COL.earth);
		putLabel(ctx, 'Sun', { x: 8, y: axisY - rayHeight(40) - 15 }, COL.sun, 'left');
		putLabel(ctx, "Moon's distance", { x: moonX, y: this.height - 12 }, COL.muted);

		putLabel(ctx, 'u', { x: beside, y: (axisY + U.y) / 2 }, COL.ink, 'left');
		sunDifferenceLabel(ctx, { x: beside, y: (U.y + E.y) / 2 });

		// pi: a bracket from the axis up to the Earth's radius
		segment(ctx, { x: bracketX, y: axisY }, { x: bracketX, y: E.y }, { color: COL.earth, width: 1.5 });
		segment(ctx, { x: bracketX - 4, y: axisY }, { x: bracketX + 4, y: axisY }, { color: COL.earth, width: 1.5 });
		segment(ctx, { x: bracketX - 4, y: E.y }, { x: bracketX + 4, y: E.y }, { color: COL.earth, width: 1.5 });
		putLabel(ctx, 'π', { x: bracketX + 7, y: axisY - 0.62 * radius }, COL.earth, 'left');

		// the same angle at the tip, named under the lower ray
		sunDifferenceLabel(ctx, { x: beside, y: axisY + rayHeight(beside) + 14 });
	}
};

/* ---------- (b) The Moon's shadow on the Earth, from the side ---------- */

/* The drawing of panel (b): the shadow's axis meets the plane through O
   this many Earth radii north of O; the Moon is drawn with its radius in
   proportion to the Earth's (0.2725), so that its penumbra, about twice
   as wide as the Moon at the Earth, has its proportion too; the umbra
   narrows to this fraction of the Moon's radius at the plane. */
const SIDE_GAMMA = 0.62;
const SIDE_MOON_RADIUS = 0.2725;
const SIDE_UMBRA_END = 0.06;

const moonShadowFigure = {
	init() {
		fitCanvas(this, byId('moon-shadow-canvas'), shadowPanelHeight, SHADOW_PANEL_MAX);
		this.draw();
	},

	/* The layout for the canvas' size: the Earth, centre O, on the right;
	   the line from O to the Sun, to the left; the point G of the plane
	   through O where the shadow's axis meets it; the Moon M on that axis. */
	layout() {
		const w = this.width;
		const axisY = 0.56 * this.height;
		const radius = 0.3 * this.height;
		const O = { x: w - radius - 0.04 * w, y: axisY };
		const G = { x: O.x, y: axisY - SIDE_GAMMA * radius };
		const M = { x: 0.2 * w, y: G.y };
		const moonRadius = SIDE_MOON_RADIUS * radius;
		// the shadows widen and narrow by this much per pixel along the axis
		const slope = ((1 - SIDE_UMBRA_END) * moonRadius) / (G.x - M.x);

		return {
			axisY,
			radius,
			O,
			G,
			M,
			moonRadius,
			penumbraAtPlane: moonRadius + slope * (G.x - M.x),
			umbraAtPlane: SIDE_UMBRA_END * moonRadius,
			beta: atan2d(O.y - M.y, O.x - M.x) // the angle at O between the Sun and the Moon
		};
	},

	draw() {
		const ctx = this.ctx;
		const w = this.width;
		const h = this.height;
		const at = this.layout();
		const { axisY, radius, O, G, M, moonRadius, penumbraAtPlane, umbraAtPlane, beta } = at;
		// a shadow of the Moon, from its two edges to the plane through O
		const shadow = (halfWidthAtPlane, alpha) => {
			ctx.fillStyle = withAlpha(COL.ink, alpha);
			ctx.beginPath();
			ctx.moveTo(M.x, M.y - moonRadius);
			ctx.lineTo(G.x, G.y - halfWidthAtPlane);
			ctx.lineTo(G.x, G.y + halfWidthAtPlane);
			ctx.lineTo(M.x, M.y + moonRadius);
			ctx.closePath();
			ctx.fill();
		};

		ctx.clearRect(0, 0, w, h);

		// the Earth, under the shadow that crosses it to the plane through O
		disc(ctx, O, radius, COL.card, COL.earth);
		shadow(penumbraAtPlane, PENUMBRA_ALPHA);
		shadow(umbraAtPlane, UMBRA_ALPHA);
		circle(ctx, O, radius, { color: COL.earth, width: 1.5 });

		// the plane through O across the line of sight
		segment(ctx, { x: O.x, y: 8 }, { x: O.x, y: h - 8 }, { color: COL.muted, width: 1.2, dash: [6, 4] });

		// the line from O to the Sun, and the shadow's axis, parallel to it
		segment(ctx, { x: 4, y: axisY }, O, { color: COL.muted, width: 1, dash: [2, 4] });
		segment(ctx, { x: 4, y: G.y }, G, { color: COL.muted, width: 1, dash: [2, 4] });
		this.drawArrowHead({ x: 4, y: axisY });
		this.drawArrowHead({ x: 4, y: G.y });

		// seen from O: the Moon, beta north of the Sun
		const arcRadius = Math.hypot(O.x - M.x, O.y - M.y) - moonRadius - 9;

		segment(ctx, O, M, { color: COL.planet, width: 1.2 });
		screenArc(ctx, O, arcRadius, 180 - beta, 180, { color: COL.planet, width: 1.5 });

		// the Moon, and gamma on the plane
		disc(ctx, M, moonRadius, COL.card, COL.planet);
		segment(ctx, O, G, { color: COL.earth, width: 4 });
		drawDot(ctx, O.x, O.y, 3.5, COL.earth);
		drawDot(ctx, G.x, G.y, 3.5, COL.ink);

		this.drawLabels(at, arcRadius);
	},

	/* A small arrow head pointing left, at the end of a line to the Sun. */
	drawArrowHead(tip) {
		const ctx = this.ctx;

		ctx.strokeStyle = COL.muted;
		ctx.lineWidth = 1.2;
		ctx.beginPath();
		ctx.moveTo(tip.x + 7, tip.y - 4);
		ctx.lineTo(tip.x, tip.y);
		ctx.lineTo(tip.x + 7, tip.y + 4);
		ctx.stroke();
	},

	/* The labels of a static drawing: they never move. */
	drawLabels(at, arcRadius) {
		const ctx = this.ctx;
		const { axisY, radius, O, G, M, moonRadius } = at;

		putLabel(ctx, 'Moon', { x: M.x, y: M.y - moonRadius - 12 }, COL.planet);
		putLabel(ctx, 'to the Sun', { x: 8, y: axisY + 14 }, COL.muted, 'left');
		putLabel(ctx, 'O', { x: O.x - 13, y: O.y + 13 }, COL.earth);
		putLabel(ctx, 'Earth', { x: O.x + 10, y: axisY + 0.42 * radius }, COL.earth, 'left');
		putLabel(ctx, 'γ', { x: O.x + 10, y: (O.y + G.y) / 2 }, COL.earth, 'left');
		// beta inside its angle, beside the arc, just above the line to the Sun
		putLabel(ctx, 'β', { x: O.x - arcRadius + 13, y: axisY - 12 }, COL.planet);
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
	/* The canvas as wide as the frame, 0.34 times as tall, and at least
	   160 px tall: on a phone the Earth stays large enough, and the angle
	   at M wide enough, for the labels T and pi. */
	init() {
		fitCanvas(this, byId('parallax-canvas'), width => Math.max(160, 0.34 * width));
		this.draw();
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
   20° from the node); (c) the Moon's path near the node, the latitude of
   the new Moon against x, with a box for each limit: as wide as the
   limit on the Sun's distance from the node and as tall as the limit on
   the latitude, so its corners lie on the path.
   The two drawings are wider than tall, and the sliders sit just under
   them, so that on a phone both stay on the screen while a slider moves.
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
   penumbra's radius. 'total' tells the two central eclipses apart. */
function shadowOnEarth(st) {
	const scale = st.z.pM - st.z.pS;
	const gamma = st.betaNew / scale;

	return {
		gamma,
		penumbra: (st.z.sM + st.z.sS) / scale,
		// seen from where the axis meets the Earth, is the Moon larger than the Sun?
		total: Eclipses.axisRadius(st.km, Math.abs(gamma)) > st.z.sS
	};
}

/* The half-height of panel (a) (Earth radii): the farthest edge of the
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

/* The two drawings of Figure 5 are at most this wide, and this tall for
   their width (px): the Moon and the shadow move up and down only, so a
   drawing wider than tall loses nothing. */
const LIMITS_PANEL_MAX = 440;
const LIMITS_PANEL_MARGIN = 4;
const limitsPanelHeight = width => clamp(0.64 * width, 190, 270);

/* One of the two drawings of Figure 5: 'span' is its half-height, in its
   own unit (a number, or a function giving one). */
function limitsPanel(canvasId, span, drawPanel) {
	return {
		labels: new LabelPlacer(),

		init() {
			fitCanvas(this, byId(canvasId), limitsPanelHeight, LIMITS_PANEL_MAX);
		},

		draw() {
			if (!limitsFigure.state) {
				return;
			}

			const ctx = this.ctx;
			const cx = this.width / 2;
			const cy = this.height / 2;
			const reach = typeof span === 'function' ? span() : span;
			const scalePx = (cy - LIMITS_PANEL_MARGIN) / reach; // px per unit
			const at = (east, north) => ({ x: cx - scalePx * east, y: cy - scalePx * north });

			this.labels.begin({ x0: 2, y0: 2, x1: this.width - 2, y1: this.height - 2 });
			ctx.clearRect(0, 0, this.width, this.height);
			ctx.save();
			ctx.beginPath();
			ctx.rect(0, 0, this.width, this.height);
			ctx.clip();

			// the ecliptic, across the whole panel
			segment(ctx, { x: 0, y: cy }, { x: this.width, y: cy }, { color: COL.sun, width: 1.5 });
			drawPanel(ctx, at, scalePx, limitsFigure.state, this.labels, this.width / (2 * scalePx));
			ctx.restore();
		}
	};
}

/* The Moon's path across a panel, through the point (0, north), with
   the slope of its circle at the argument of latitude F; 'halfWidth' is
   the panel's half-width in its own unit. */
function drawMoonPath(ctx, at, north, F, halfWidth) {
	const slope = tan(MOON.i) * cos(F);
	const reach = 1.2 * halfWidth;

	segment(ctx, at(-reach, north - slope * reach), at(reach, north + slope * reach), {
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

/* The mark on the shadow's axis in panel (a) (px): larger than the umbra
   is. */
const AXIS_MARK_RADIUS = 5;

/* Panel (a): the new Moon. The Earth seen from the Sun, and the Moon's
   shadow on it: the penumbra, where the Moon hides part of the Sun, and
   on the shadow's axis a mark for the umbra, drawn larger than it is: a
   black dot where the Moon, seen from there, is larger than the Sun (a
   total eclipse), a ring where it is smaller (an annular one, in the
   antumbra beyond the umbra's tip). The shadow moves up and down with
   the slider, across the Earth's edge, so it carries no name (the key has
   it). The shadow follows the Moon, so the Moon's path is drawn through
   its axis; seen from the Sun, east is on the right, so the path is
   mirrored from panel (b). A solar eclipse is seen somewhere when the
   penumbra reaches the Earth, and a central one when the axis does. */
const solarPanel = limitsPanel('limits-solar', shadowWindow, (ctx, at, scalePx, st, labels, halfWidth) => {
	const earth = at(0, 0);
	const shadow = shadowOnEarth(st);
	const axis = at(0, shadow.gamma);
	const penumbra = scalePx * shadow.penumbra;

	disc(ctx, earth, scalePx, withAlpha(COL.earth, 0.14), COL.earth);
	labelOutside(ctx, 'Earth', earth, scalePx, 160, COL.earth, labels);
	disc(ctx, axis, penumbra, withAlpha(COL.ink, 0.18), COL.ink);
	drawMoonPath(ctx, (east, north) => at(-east, north), shadow.gamma, st.x, halfWidth);

	if (shadow.total) {
		drawDot(ctx, axis.x, axis.y, AXIS_MARK_RADIUS, COL.ink, false);
	} else {
		disc(ctx, axis, AXIS_MARK_RADIUS, COL.card, COL.ink);
	}
});

/* Panel (b): the full Moon, its centre at -beta from the shadow's. */
const lunarPanel = limitsPanel('limits-lunar', LIMITS_WINDOW, (ctx, at, scalePx, st, labels, halfWidth) => {
	const shadow = at(0, 0);
	const moon = at(0, st.betaFull);
	const umbra = scalePx * st.limits.umbra;
	const moonRadius = scalePx * st.z.sM;

	drawMoonPath(ctx, at, st.betaFull, st.x + 180, halfWidth);
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
			aspect: 0.28,
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

	/* Panel (c): the ecliptic, the Moon's path near the node (as in (a)
	   and (b)), and a box for each limit, as wide as the limit on the
	   Sun's distance from the node and as tall as the limit on the
	   latitude. The dot is the Moon at the new Moon. */
	drawPlot() {
		if (!this.state) {
			return;
		}

		const p = this.plot;
		const st = this.state;
		const box = (limit, color) => {
			const reach = LunarLatitude.argumentForLatitude(limit, MOON.i);

			p.band([-reach, reach], [-limit, -limit], [limit, limit], { color, alpha: 0.24 });
		};

		p.frame();
		box(st.limits.solar, COL.sun);
		box(st.limits.lunar, COL.planet);
		p.hline(0, { color: COL.sun, width: 1.5 });
		p.fn(x => LunarLatitude.latitude(x, MOON.i), { color: COL.epicycle, width: 1.5, dash: [6, 4] });
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
					ticks.push({
						value: t.value + n * 365,
						label: i === 0 ? `${t.label} ${year}` : t.label,
						half: i % 6 === 0 // January and July: the ticks of a narrow plot
					});
				}
			});
		});

		this.plot = new Plot2D(byId('seasons-plot'), {
			x: [0, SEASONS_DAYS],
			y: [-SEASONS_REACH, SEASONS_REACH],
			xLabel: 'date',
			yLabel: 'the Sun from the nearest node',
			// a tick every three months, or every six where there is room for
			// fewer than eight labels (a phone): the plot never drops one itself
			xTicks: (min, max, count) => ticks.filter(tick => count >= ticks.length || tick.half),
			yTicks: () => [-40, -20, 0, 20, 40].map(value => ({ value, label: `${value}°` })),
			aspect: 0.5,
			minHeight: 270,
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
					drawDot(
						p.ctx,
						p.px(point.day),
						p.py(point.angle),
						3 * markScale(p),
						s.solar ? COL.sun : COL.planet,
						true
					);
				}
			});
	}
};

/* ==========================================================================
   7. FIGURE 7: THE ERROR CURVE OF THE LATITUDE
   Delta beta = beta_model - beta_reference (shared/errorcurve.js, with
   the reference Moon's latitude). No slider changes a model here.
   ========================================================================== */

/* The scale of Figure 7 (arcminutes), the same for its three spans: the
   error stays within 29' over the century (tools/numbers/3.3-eclipses.js,
   "The scales of the figures"). */
const LATITUDE_ERROR_MAX = 40;

/* Figure 7: the latitude fitted to 2026, over 2026, two months and a
   century, with dots at the new and full Moons (spans of a year or
   less); and, at the same new and full Moons, the dots of the mean
   inclination 5.145°, which the fit does not use: there they are up to
   10' off. Its curve is not drawn: between the new and full Moons it
   swings as the fitted one does, and would only hide it. */
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
			yMax: LATITUDE_ERROR_MAX,
			ghostButtons: false
		});
		const fit = LunarLatitude.make(MOON);
		const meanInclination = LunarLatitude.make(Object.assign({}, MOON, { i: 5.145 }));
		const syzygies = syzygyIndices(middle - 190, middle + 190).map(k => Eclipses.reference(k).syzygy);

		curve.addModel({
			label: 'fitted to the new and full Moons of 2026',
			short: 'fitted',
			color: COL.planet,
			fn: fit
		});
		curve.addMarks({
			label: 'the fitted latitude at the new and full Moons',
			color: COL.planet,
			fn: fit,
			dates: syzygies,
			maxYears: 1.01
		});
		curve.addMarks({
			label: 'the mean inclination, 5.145°, at the same new and full Moons (dots: spans of a year or less)',
			color: COL.epicycle,
			fn: meanInclination,
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
		moonShadowFigure,
		parallaxDiagram,
		limitsFigure,
		seasonsFigure,
		latitudeErrorFigure
	]);
});
