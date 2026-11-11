// @ts-check
/* ==========================================================================
   PAGE 2.1 · THE UNEVEN YEAR - SCRIPT (page.js)
   Six figures, each with its own init and draw (and update when it has
   controls):
	 1. the Sun's daily motion       (2D, static: the real Sun from the
									   March equinox of 2026 to that of
									   2027, with its four seasons)
	 2. the Earth or the Sun at rest (2D, static: the eccentric and the
									   equal circle that carries the Earth)
	 3. the equation of centre       (2D: (a) the eccentric with M and q,
									   (b) q through 2026; date, and two
									   views, e = 0.2 and the Sun's e)
	 4. the four seasons             (2D, static: the eccentric cut by the
									   lines to the equinoxes and solstices,
									   at e = 0.2 and at the Sun's e)
	 5. Hipparchus' construction     (2D: (a) the right triangles of the
									   construction, (b) the centre
									   magnified; spring and summer)
	 6. the first error curve        (the eccentric fitted to 2026, over
									   1, 100 and 1000 years)
   Shared code: common.js, time.js, ephemeris.js, models/mean-sun.js,
   models/solar-eccentric.js, plot2d.js, errorcurve.js, components.js.
   Every number quoted in the prose comes from tools/numbers/2.1-uneven-year.js.

   TABLE OF CONTENTS
	 0. Helpers shared by the figures
	 1. Figure 1: the Sun's daily motion
	 2. The drawing of an eccentric (Figures 2 to 4)
	 3. Figure 2: the Earth at rest, the Sun at rest
	 4. Figure 3: the equation of centre
	 5. Figure 4: the four seasons
	 6. Figure 5: Hipparchus' construction
	 7. Figure 6: the error curve
	 8. Page start
   ========================================================================== */

/* ==========================================================================
   0. HELPERS SHARED BY THE FIGURES
   ========================================================================== */

/* The year of the figures, and 0 h of its first day (JD; the models and
   the reference take TT, the dates here are only labels). */
const YEAR = 2026;
const YEAR_START = Time.julianDay(YEAR, 1, 1);
const DAYS_IN_YEAR = 365;

/* The modern year (days), from the mean Sun of page 1.3. */
const YEAR_LENGTH = MeanSun.yearLength();

/* The Figure 3 date slider plays a year in about 12 seconds. */
const PLAY_DAYS_PER_SECOND = 30;

/* The names of the seasons, in order from the spring equinox. */
const SEASON_NAMES = ['spring', 'summer', 'autumn', 'winter'];

/* The directions from the Earth to the equinoxes and the solstices, with
   their labels on the figures. */
const CARDINAL_POINTS = [
	{ lon: 0, label: 'γ' },
	{ lon: 90, label: '90°' },
	{ lon: 180, label: '180°' },
	{ lon: 270, label: '270°' }
];

/* First day of each month of the year and of the next, as a day index
   from 1 January of YEAR (Figure 1 runs into the next year). */
const MONTH_STARTS = [YEAR, YEAR + 1].flatMap(year =>
	Time.MONTH_NAMES.map((name, i) => ({
		value: Time.julianDay(year, i + 1, 1) - YEAR_START,
		label: name
	}))
);

/* Ticks of a date axis: the months within the range, every month when
   there is room, else every other. */
const monthTicks = (min, max, count) =>
	MONTH_STARTS.filter(t => t.value >= min - 0.5 && t.value <= max + 0.5).filter((t, i) => count >= 8 || i % 2 === 0);

/* "3 Apr" for a day index of the year (the year is in the panel titles). */
function dayText(day) {
	const date = Time.calendarDate(YEAR_START + day);

	return `${Math.floor(date.day)} ${Time.MONTH_NAMES[date.month - 1]}`;
}

/* An angle with a sign in TeX: "+1.85^\circ", "-0.40^\circ". */
const texSigned = (degrees, digits = 2) => `${signed(degrees, digits).replace('−', '-')}^\\circ`;

/* Days in TeX: "92.74\,\text{d}". */
const texDays = days => `${fixed(days, 2)}\\,\\text{d}`;

/* The bounds of a square canvas, for its LabelPlacer: labels stay inside. */
const canvasBounds = view => ({ x0: 2, y0: 2, x1: view.width - 2, y1: view.width - 2 });

/* An arrow from one canvas point towards another, its tip 'gap' px short
   of the second (so that it stops at the edge of a dot there). */
const ARROW_HEAD = { length: 11, half: 5 };

function drawArrow(ctx, from, to, style, gap = 0) {
	const length = Math.hypot(to.x - from.x, to.y - from.y);
	const ux = (to.x - from.x) / length;
	const uy = (to.y - from.y) / length;
	const tip = { x: to.x - gap * ux, y: to.y - gap * uy };
	const base = { x: tip.x - ARROW_HEAD.length * ux, y: tip.y - ARROW_HEAD.length * uy };

	segment(ctx, from, base, style);

	ctx.fillStyle = style.color;
	ctx.beginPath();
	ctx.moveTo(tip.x, tip.y);
	ctx.lineTo(base.x - ARROW_HEAD.half * uy, base.y + ARROW_HEAD.half * ux);
	ctx.lineTo(base.x + ARROW_HEAD.half * uy, base.y - ARROW_HEAD.half * ux);
	ctx.closePath();
	ctx.fill();
}

/* ==========================================================================
   1. FIGURE 1: THE SUN'S DAILY MOTION
   Static. For each day from the March equinox of 2026 to that of 2027,
   the arc (arcmin) the reference Sun moves between 0 h the day before and
   0 h the day after, divided by two (centred on the day); the mean daily
   motion n; the four seasons, with their names and lengths above the
   plot. Fixed scale 56' to 62' (the motion ranges from 57.19' to 61.16',
   tools/numbers/2.1-uneven-year.js).
   ========================================================================== */

const MOTION_RANGE = [56, 62];

/* The curve is computed to this day index, past the March equinox of the
   next year. */
const MOTION_LAST_DAY = DAYS_IN_YEAR + 90;

/* The room above the plot box for the names and lengths of the seasons
   (px), and the baselines of the two lines, up from the box. */
const SEASON_HEADER = { room: 48, name: 26, length: 8 };

/* A season narrower than this (px) has its name in the smaller font. */
const SEASON_NAME_ROOM = 80;
const FONT_NAME_SMALL = '600 14px "Cormorant SC", Georgia, serif';

const motionFigure = {
	plot: null,

	init() {
		this.computeMotion();

		this.plot = new Plot2D(byId('motion-plot'), {
			x: [this.seasons[0], this.seasons[4]],
			y: MOTION_RANGE,
			xLabel: `date (${YEAR}–${YEAR + 1})`,
			yLabel: 'daily motion (′)',
			xTicks: monthTicks,
			aspect: 0.42,
			margin: { top: SEASON_HEADER.room },
			onDraw: () => this.draw()
		});
	},

	/* The reference Sun's daily motion on every day to MOTION_LAST_DAY,
	   and the moments (day index) of the spring equinox of the year, the
	   solstices and equinoxes after it, and the next spring equinox. */
	computeMotion() {
		const longitude = day => Ephem.longitude('sun', YEAR_START + day);

		this.days = [];
		this.motion = [];

		for (let day = 0; day <= MOTION_LAST_DAY; day++) {
			this.days.push(day);
			this.motion.push((norm180(longitude(day + 1) - longitude(day - 1)) * 60) / 2);
		}

		// each season ends when the longitude reaches the next multiple of
		// 90°; the Sun moves about 1° a day, so each boundary lies within
		// a day of the day found by stepping, and is then bisected
		this.seasons = [];

		let day = 0;

		for (let i = 0; i <= 4; i++) {
			const target = 90 * (i % 4);
			const ahead = d => norm180(longitude(d) - target);

			while (ahead(day + 1) < 0) {
				day += 1;
			}

			this.seasons.push(bisect(ahead, day, day + 1));
			day += 30;
		}
	},

	draw() {
		const p = this.plot;
		const mean = MeanSun.MODERN.n * 60;

		p.frame();
		this.seasons.slice(1, 4).forEach(day => p.vline(day, { color: COL.muted, width: 1 }));
		p.hline(mean, { color: COL.muted, width: 1.5, dash: [6, 5] });
		p.curve(this.days, this.motion, { color: COL.sun, width: 2.5 });

		// the mean, named above its line in the middle of summer, where the
		// curve runs well below it
		p.text(`mean, ${fixed(mean, 2)}′`, (this.seasons[1] + this.seasons[2]) / 2, mean, {
			align: 'center',
			baseline: 'bottom',
			dx: 0,
			dy: -5,
			color: COL.muted
		});

		this.labelSeasons();
	},

	/* The name and length of each season, centred above it. */
	labelSeasons() {
		const p = this.plot;
		const ctx = p.ctx;

		ctx.textAlign = 'center';
		ctx.textBaseline = 'alphabetic';
		ctx.fillStyle = textColor(COL.ink);

		for (let i = 0; i < 4; i++) {
			const left = p.px(this.seasons[i]);
			const right = p.px(this.seasons[i + 1]);
			const x = (left + right) / 2;

			ctx.font = right - left >= SEASON_NAME_ROOM ? FONT_NAME : FONT_NAME_SMALL;
			ctx.fillText(SEASON_NAMES[i], x, p.box.top - SEASON_HEADER.name);
			ctx.font = FONT_TICK;
			ctx.fillText(`${fixed(this.seasons[i + 1] - this.seasons[i], 2)} d`, x, p.box.top - SEASON_HEADER.length);
		}
	}
};

/* ==========================================================================
   2. THE DRAWING OF AN ECCENTRIC
   Figures 2 to 4, seen from the north ecliptic pole (longitude
   anticlockwise, gamma to the right). A view is an owner set up by
   squareCanvas, with 'scale' (pixels per unit of the radius) and
   'centre' ({ h, k }, the point of the drawing shown at the centre of
   the canvas). Points are given in units of the radius, with the Earth
   (Figures 3, 4) or the body at rest (Figure 2) at the origin.
   ========================================================================== */

/* A point (x, y), in units of the radius, on the canvas of 'view'. */
function toCanvas(view, x, y) {
	return { x: view.cx + view.scale * (x - view.centre.h), y: view.cy - view.scale * (y - view.centre.k) };
}

/* The distance from the origin, along the direction 'lon', to the circle
   of radius 1 centred on (h, k). */
function reachCircle(lon, h, k) {
	const along = h * cos(lon) + k * sin(lon);

	return along + Math.sqrt(along * along - h * h - k * k + 1);
}

/* The circle of radius 1 centred on (h, k). */
function drawEccentric(view, centre) {
	circle(view.ctx, toCanvas(view, centre.h, centre.k), view.scale, { color: COL.deferent, width: 2.5 });
}

/* The dotted line of apsides, from the perigee through O and C to the
   apogee, with the two names just outside the circle. */
function drawApsides(view, centre, apogee, labels) {
	const ctx = view.ctx;
	const C = toCanvas(view, centre.h, centre.k);
	const far = toCanvas(view, centre.h + cos(apogee), centre.k + sin(apogee));
	const near = toCanvas(view, centre.h - cos(apogee), centre.k - sin(apogee));

	segment(ctx, far, near, { color: COL.muted, width: 1.2, dash: [2, 4] });
	drawDot(ctx, far.x, far.y, 3.5, COL.deferent);
	drawDot(ctx, near.x, near.y, 3.5, COL.deferent);
	labelOutside(ctx, 'apogee', C, view.scale, apogee, COL.deferent, labels);
	labelOutside(ctx, 'perigee', C, view.scale, apogee + 180, COL.deferent, labels);
}

/* The lines from the Earth to the equinoxes and solstices, up to the
   circle, with their labels outside it; 'points' is a subset of
   CARDINAL_POINTS. labelShift (deg): the labels turn by this angle about
   the Earth, to leave room for the names of the apogee and the perigee. */
function drawCardinalLines(view, centre, points, labelShift, labels) {
	const C = toCanvas(view, centre.h, centre.k);

	points.forEach(({ lon, label }) => {
		const reach = reachCircle(lon, centre.h, centre.k);
		const end = { x: reach * cos(lon), y: reach * sin(lon) };

		// the label just outside the circle, beyond the end of the line as
		// seen from C, turned by labelShift
		const fromC = Math.atan2(end.y - centre.k, end.x - centre.h) * R2D;

		segment(view.ctx, toCanvas(view, 0, 0), toCanvas(view, end.x, end.y), { color: COL.sun, width: 1.5 });
		labelOutside(view.ctx, label, C, view.scale, fromC + labelShift, COL.sun, labels);
	});
}

/* ==========================================================================
   3. FIGURE 2: THE EARTH AT REST, THE SUN AT REST
   Static. (a) the eccentric about the Earth at rest, (b) the equal circle
   that carries the Earth about the Sun at rest, its centre offset the
   opposite way; in both, the arrow from the Earth to the Sun at the same
   moment, the same in length and direction. The offset is drawn at
   REST_E, six times the Sun's, so that it can be seen.
   ========================================================================== */

const REST_E = 0.2;

/* The moment drawn: the Sun's mean longitude (deg), seen from the centre
   of the eccentric. */
const REST_MEAN_LONGITUDE = 40;

/* The drawing, centred on the centre of the circle, fits this many radii
   from the centre of the canvas (the circle and the names outside it). */
const REST_REACH = 1.3;

const restFigure = {
	init() {
		const apogee = SolarEccentric.FIT_2026.apogee;
		const offset = { h: REST_E * cos(apogee), k: REST_E * sin(apogee) };

		// the Sun on the eccentric, seen from the Earth at the origin
		const sun = {
			x: offset.h + cos(REST_MEAN_LONGITUDE),
			y: offset.k + sin(REST_MEAN_LONGITUDE)
		};

		this.makePanel('rest-earth', view => this.drawEarthAtRest(view, offset, sun));
		this.makePanel('rest-sun', view => this.drawSunAtRest(view, offset, sun));
	},

	/* A square canvas and its view, drawn by draw(view). */
	makePanel(id, draw) {
		const view = {};

		view.draw = () => draw(view);

		squareCanvas(view, byId(id), 380, 10);
		view.draw();

		return view;
	},

	/* Prepare a panel for a new drawing, centred on 'centre'. */
	begin(view, centre) {
		view.scale = view.R / REST_REACH;
		view.centre = centre;
		view.ctx.clearRect(0, 0, view.width, view.width);
	},

	/* (a) The Earth at rest at the origin, the Sun on the eccentric. */
	drawEarthAtRest(view, offset, sun) {
		const ctx = view.ctx;

		this.begin(view, offset);

		const centre = toCanvas(view, offset.h, offset.k);
		const earth = toCanvas(view, 0, 0);
		const S = toCanvas(view, sun.x, sun.y);

		drawEccentric(view, offset);
		segment(ctx, earth, centre, { color: COL.muted, width: 1.2, dash: [2, 4] });
		drawArrow(ctx, earth, S, { color: COL.planet, width: 2 }, 10);
		drawDot(ctx, centre.x, centre.y, 3.5, COL.ink);
		drawDot(ctx, earth.x, earth.y, 6, COL.earth);
		drawDot(ctx, S.x, S.y, 8, COL.sun);

		// the Earth named on the side away from the arrow, the Sun outside
		// the circle
		const arrowLon = Math.atan2(sun.y, sun.x) * R2D;

		labelOutside(ctx, 'Earth', earth, 6, arrowLon + 180, COL.earth);
		labelOutside(ctx, 'Sun', centre, view.scale, REST_MEAN_LONGITUDE, COL.sun);
	},

	/* (b) The Sun at rest at the origin, the Earth on the equal circle
	   centred at -offset, always opposite the Sun's place in (a). */
	drawSunAtRest(view, offset, sun) {
		const ctx = view.ctx;
		const centreOffset = { h: -offset.h, k: -offset.k };

		this.begin(view, centreOffset);

		const centre = toCanvas(view, centreOffset.h, centreOffset.k);
		const S = toCanvas(view, 0, 0);
		const earth = toCanvas(view, -sun.x, -sun.y);

		drawEccentric(view, centreOffset);
		segment(ctx, S, centre, { color: COL.muted, width: 1.2, dash: [2, 4] });
		drawArrow(ctx, earth, S, { color: COL.planet, width: 2 }, 10);
		drawDot(ctx, centre.x, centre.y, 3.5, COL.ink);
		drawDot(ctx, S.x, S.y, 8, COL.sun);
		drawDot(ctx, earth.x, earth.y, 6, COL.earth);

		// the Sun named beyond the tip of the arrow, the Earth outside the
		// circle
		const arrowLon = Math.atan2(sun.y, sun.x) * R2D;

		labelOutside(ctx, 'Sun', S, 8, arrowLon, COL.sun);
		labelOutside(ctx, 'Earth', centre, view.scale, REST_MEAN_LONGITUDE + 180, COL.earth);
	}
};

/* ==========================================================================
   4. FIGURE 3: THE EQUATION OF CENTRE
   (a) the eccentric with the apogee fixed at the 2026 fit, the Sun S at
   the chosen date, the angles M (at C) and q (at the Earth O); (b) q
   through 2026, exact and to first order. Two views, chosen by the
   reader: e = 0.2, six times the Sun's, where the angles can be seen
   (|q| up to asin 0.2 = 11.54°: scale +-12°), and the Sun's e (|q| up to
   1.92°: scale +-2.5°), tools/numbers/2.1-uneven-year.js.
   ========================================================================== */

/* The two views of Figure 3. */
const ECCENTRIC_Q_RANGE = [-12, 12];
const SUN_Q_RANGE = [-2.5, 2.5];

const EOC_VIEWS = [
	{ name: 'exaggerated, e = 0.2', e: 0.2, qRange: ECCENTRIC_Q_RANGE },
	{ name: `the Sun, e = ${fixed(SolarEccentric.FIT_2026.e, 4)}`, e: SolarEccentric.FIT_2026.e, qRange: SUN_Q_RANGE }
];

/* The drawing is centred on C: the circle, and the labels just outside
   it, fit ECCENTRIC_REACH radii. */
const ECCENTRIC_REACH = 1.27;

/* Radii (fractions of the circle's radius) of the angle arcs, and the
   distance (px) of the name q from the mean direction from O. */
const ARC_RADIUS = { M: 0.16, q: 0.62 };
const Q_LABEL_GAP = 13;

/* The Earth is named O, 45° to one side of the line of apsides away from
   C, EARTH_LABEL_DISTANCE px from it; C 45° to one side of the line of
   apsides beyond C, CENTRE_LABEL_DISTANCE radii away. Each takes the side
   farther from the other lines through its point: single letters, which
   may change sides (CLAUDE.md). */
const CENTRE_LABEL_TURN = 45;
const CENTRE_LABEL_DISTANCE = 0.2;
const EARTH_LABEL_DISTANCE = 16;

const centreFigure = {
	plot: null,
	state: null,
	view: EOC_VIEWS[0],
	labels: new LabelPlacer(),

	init() {
		squareCanvas(this, byId('eoc-canvas'), 420, 10);

		this.plot = new Plot2D(byId('eoc-plot'), {
			x: [0, DAYS_IN_YEAR],
			y: this.view.qRange,
			xLabel: `date (${YEAR})`,
			yLabel: 'q (°)',
			xTicks: monthTicks,
			aspect: 0.95,
			maxHeight: 440,
			onDraw: () => this.drawPlot()
		});

		wireSlider(byId('eoc-day'), () => this.update(), dayText);
		wirePresets(byId('eoc-day').closest('figure'));
		wirePlayButton(byId('eoc-play'), byId('eoc-day'), PLAY_DAYS_PER_SECOND, { playLabel: 'Play a year' });

		buildChoice(
			byId('eoc-views'),
			EOC_VIEWS.map(v => v.name),
			this.view.name,
			name => {
				this.view = EOC_VIEWS.find(v => v.name === name);
				this.plot.setRange(null, this.view.qRange);
				this.update();
			}
		);

		this.update();
	},

	/* The parameters: the 2026 fit, with the eccentricity of the view. */
	parameters() {
		return Object.assign({}, SolarEccentric.FIT_2026, { e: this.view.e });
	},

	update() {
		const parameters = this.parameters();
		const day = readNumber('eoc-day');

		this.state = {
			parameters: parameters,
			day: day,
			now: SolarEccentric.state(parameters, YEAR_START + day),
			curve: this.yearCurve(parameters)
		};

		this.showReadout();
		this.draw();
		this.plot.redraw();
	},

	/* q through the year, exact and to first order (deg), once a day. */
	yearCurve(parameters) {
		const days = [];
		const exact = [];
		const firstOrder = [];

		for (let day = 0; day <= DAYS_IN_YEAR; day++) {
			const s = SolarEccentric.state(parameters, YEAR_START + day);

			days.push(day);
			exact.push(s.q);
			firstOrder.push(SolarEccentric.equationOfCentreFirstOrder(s.M, parameters.e));
		}

		return { days, exact, firstOrder };
	},

	showReadout() {
		const { day, now } = this.state;

		showLines('eoc-readout', [
			`\\text{${dayText(day)}:}\\quad \\bar\\lambda = ${fixedAngle(now.meanLongitude, 2)}^\\circ,\\quad M = ${fixedAngle(now.M, 2)}^\\circ`,
			`q = ${texSigned(now.q)},\\quad \\lambda = \\bar\\lambda + q = ${fixedAngle(now.lambda, 2)}^\\circ`
		]);
	},

	/* Panel (a). The names that never move (apogee, perigee, γ) are set
	   first; the letters then keep clear of them (LabelPlacer). */
	draw() {
		if (!this.state) {
			return;
		}

		const ctx = this.ctx;
		const { parameters, now } = this.state;
		const { e, apogee } = parameters;
		const centre = { h: e * cos(apogee), k: e * sin(apogee) };

		this.scale = this.R / ECCENTRIC_REACH;
		this.centre = centre;
		ctx.clearRect(0, 0, this.width, this.width);
		this.labels.begin(canvasBounds(this));

		drawApsides(this, centre, apogee, this.labels);
		drawEccentric(this, centre);
		drawCardinalLines(this, centre, [CARDINAL_POINTS[0]], 0, this.labels);
		this.drawSun(centre, now);
		this.labelCentre(centre, now);
	},

	/* The names of the Earth O and of C (CENTRE_LABEL_TURN), clear of the
	   mean direction, the Sun and the middle of the arc M. */
	labelCentre(centre, now) {
		const apogee = this.state.parameters.apogee;
		const busy = [now.meanLongitude, now.lambda, apogee + now.M / 2, 0];
		const clearance = lon => Math.min(...busy.map(b => Math.abs(norm180(lon - b))));
		const better = (a, b) => (clearance(a) >= clearance(b) ? a : b);
		const earthSide = better(apogee + 180 - CENTRE_LABEL_TURN, apogee + 180 + CENTRE_LABEL_TURN);
		const cSide = better(apogee - CENTRE_LABEL_TURN, apogee + CENTRE_LABEL_TURN);
		const O = toCanvas(this, 0, 0);
		const C = toCanvas(this, centre.h, centre.k);

		centredLabel(this.ctx, 'O', towards(O, earthSide, EARTH_LABEL_DISTANCE), COL.earth, this.labels);
		centredLabel(this.ctx, 'C', towards(C, cSide, CENTRE_LABEL_DISTANCE * this.scale), COL.ink, this.labels);
	},

	/* The Sun S, the mean direction from C and from O, and the angles M
	   and q. */
	drawSun(centre, now) {
		const ctx = this.ctx;
		const { meanLongitude, q } = now;
		const apogee = this.state.parameters.apogee;
		const O = toCanvas(this, 0, 0);
		const C = toCanvas(this, centre.h, centre.k);
		const S = toCanvas(this, centre.h + cos(meanLongitude), centre.k + sin(meanLongitude));
		const meanEnd = toCanvas(this, cos(meanLongitude), sin(meanLongitude));
		const sweepM = norm360(meanLongitude - apogee);

		// the mean direction, from C to the Sun and from the Earth parallel to it
		segment(ctx, C, S, { color: COL.deferent, width: 1.5, dash: [6, 4] });
		segment(ctx, O, meanEnd, { color: COL.deferent, width: 1.5, dash: [6, 4] });

		// the true direction, from the Earth to the Sun
		segment(ctx, O, S, { color: COL.planet, width: 2 });

		// M at C, from the apogee anticlockwise to the Sun
		screenArc(ctx, C, ARC_RADIUS.M * this.scale, apogee, apogee + sweepM, { color: COL.deferent });

		// q at the Earth, from the mean direction to the Sun
		screenArc(ctx, O, ARC_RADIUS.q * this.scale, meanLongitude, meanLongitude + q, { color: COL.planet, width: 3 });

		drawDot(ctx, O.x, O.y, 6, COL.earth);
		drawDot(ctx, C.x, C.y, 3.5, COL.ink);
		drawDot(ctx, S.x, S.y, 8, COL.sun);

		// S outside the circle, in its direction from C
		labelOutside(ctx, 'S', C, this.scale + 8, meanLongitude, COL.sun, this.labels);
		this.angleLabel('M', C, ARC_RADIUS.M + 0.1, apogee + sweepM / 2, COL.deferent);

		// q beside the mean direction from O, outside the angle (q is too
		// narrow to hold its name; on the other side, beyond the line O-S,
		// runs the line C-S): a single letter, which changes sides with q
		const outside = q >= 0 ? -90 : 90;
		const onLine = towards(O, meanLongitude, (ARC_RADIUS.q + 0.05) * this.scale);

		centredLabel(ctx, 'q', towards(onLine, meanLongitude + outside, Q_LABEL_GAP), COL.planet, this.labels);
	},

	/* An angle's name at radius r (units of the radius) from a canvas
	   point, in the direction 'lon'. */
	angleLabel(text, from, r, lon, color) {
		centredLabel(this.ctx, text, towards(from, lon, r * this.scale), color, this.labels);
	},

	/* Panel (b). */
	drawPlot() {
		if (!this.state) {
			return;
		}

		const p = this.plot;
		const { days, exact, firstOrder } = this.state.curve;
		const day = this.state.day;

		p.frame();
		p.hline(0, { color: COL.ink, width: 1 });
		p.curve(days, firstOrder, { color: COL.muted, width: 1.5, dash: [6, 4] });
		p.curve(days, exact, { color: COL.planet, width: 2.5 });
		p.marker(day, exact[Math.round(day)], { color: COL.planet, radius: 5 });
	}
};

/* ==========================================================================
   5. FIGURE 4: THE FOUR SEASONS
   Static. The eccentric with the apogee of the 2026 fit, cut into four
   arcs by the lines from the Earth to the equinoxes and solstices, each
   arc named with the length of its season: (a) at e = 0.2, (b) at the
   Sun's e, to scale.
   ========================================================================== */

/* The labels of the four lines turn this far clockwise, away from the
   apogee and the perigee, which lie 14° anticlockwise of 90° and 270°. */
const SEASONS_LABEL_SHIFT = -16;

/* The names of O and C, fixed (the figure is static): O between the lines
   towards 180° and 270°, C on the side of the line of apsides away from
   the line towards 90° (deg, and px from the point). */
const SEASONS_O_LABEL = { lon: 225, distance: 17 };
const SEASONS_C_LABEL = { turn: 45, distance: 17 };

const seasonsFigure = {
	init() {
		this.panels = [this.makePanel('seasons-wide', 0.2), this.makePanel('seasons-sun', SolarEccentric.FIT_2026.e)];
	},

	/* A square canvas and its view, drawing the eccentric 'e'. */
	makePanel(id, e) {
		const view = {
			labels: new LabelPlacer(),
			draw: () => this.drawPanel(view, e)
		};

		squareCanvas(view, byId(id), 420, 10);
		view.draw();

		return view;
	},

	drawPanel(view, e) {
		const ctx = view.ctx;
		const apogee = SolarEccentric.FIT_2026.apogee;
		const centre = { h: e * cos(apogee), k: e * sin(apogee) };
		const lengths = SolarEccentric.seasonLengths(e, apogee, YEAR_LENGTH);

		view.scale = view.R / ECCENTRIC_REACH;
		view.centre = centre;
		ctx.clearRect(0, 0, view.width, view.width);
		view.labels.begin(canvasBounds(view));

		drawApsides(view, centre, apogee, view.labels);
		drawEccentric(view, centre);
		drawCardinalLines(view, centre, CARDINAL_POINTS, SEASONS_LABEL_SHIFT, view.labels);
		this.labelArcs(view, centre, lengths);

		const O = toCanvas(view, 0, 0);
		const C = toCanvas(view, centre.h, centre.k);

		drawDot(ctx, O.x, O.y, 6, COL.earth);
		drawDot(ctx, C.x, C.y, 3.5, COL.ink);
		centredLabel(ctx, 'O', towards(O, SEASONS_O_LABEL.lon, SEASONS_O_LABEL.distance), COL.earth, view.labels);
		centredLabel(
			ctx,
			'C',
			towards(C, apogee + SEASONS_C_LABEL.turn, SEASONS_C_LABEL.distance),
			COL.ink,
			view.labels
		);
	},

	/* Each season's name and length, inside its quarter of the circle. */
	labelArcs(view, centre, lengths) {
		const ctx = view.ctx;

		SEASON_NAMES.forEach((name, i) => {
			const lon = 45 + 90 * i;
			const at = toCanvas(view, centre.h + 0.62 * cos(lon), centre.k + 0.62 * sin(lon));

			centredLabel(ctx, name, { x: at.x, y: at.y - 10 }, COL.ink);
			ctx.font = FONT_TICK;
			ctx.fillText(`${fixed(lengths[i], 2)} d`, at.x, at.y + 11);
		});
	}
};

/* ==========================================================================
   6. FIGURE 5: HIPPARCHUS' CONSTRUCTION
   From the lengths of spring and summer (sliders, 90 to 96 days) and the
   modern year: the centre C = (h, k), e and the apogee
   (SolarEccentric.fitSeasons).
   (a) the construction of section 3, centred on C, with C drawn
	   FIT_EXAGGERATION times farther from the Earth than the fit puts it,
	   so that the small angles arcsin h and arcsin k can be seen: the
	   axes through the Earth, the parallels to them through C, the radii
	   from C to the four points where the axes meet the circle, and the
	   two right triangles of the text, each with its short leg (k from
	   the parallel to the x axis, h from the parallel to the y axis) and
	   its angle at C; the arcs a1 (spring) and a2 (summer).
   (b) the centre at its true place, magnified: h and k from -0.1 to 0.1
	   of the radius; over the whole range of the sliders e stays under
	   0.081 (tools/numbers/2.1-uneven-year.js), so C never leaves the
	   panel, and the drawn offset in (a) stays under 0.49 of the radius.
   ========================================================================== */

const CENTRE_RANGE = [-0.1, 0.1];

/* Panel (a) draws C this many times farther from the Earth. */
const FIT_EXAGGERATION = 6;

/* Panel (a): the drawing, centred on C, fits this many radii (the circle
   and the names of the axes outside it). */
const FIT_REACH = 1.27;

/* Panel (a): the radius of the arcs of the two small angles at C, and
   where their names go: 'along' the parallel (units of the radius from
   C), and 'gap' px clear of it on the side away from the angle, where no
   axis passes (the x axis lies on the side of the angle arcsin k, the y
   axis on that of arcsin h). When the angle is within 'ramp' degrees of
   zero, the name slides across the parallel instead of jumping to the
   other side (CLAUDE.md). */
const SMALL_ANGLE_RADIUS = 0.45;
const SMALL_ANGLE_LABEL = { along: { k: 0.64, h: 0.42 }, gap: 7, ramp: 3 };

/* Panel (a): the names of the short legs, this far from the middle of
   their leg (px), inside the triangle. */
const LEG_LABEL_GAP = 12;

/* Panel (b): the radius of the arc lambdaA about the Earth, the two radii
   where its name may go, inside and outside the arc (units of the radius
   of the eccentric), and the half size of the name (px). */
const APOGEE_ARC_RADIUS = 0.05;
const APOGEE_LABEL_RADII = [0.031, 0.069];
const APOGEE_LABEL_HALF = { width: 12, height: 11 };

/* Below this eccentricity the read-out shows e = 0.0000 and C is at the
   Earth, so there is no apogee to show. The preset "equal" (91.31 days,
   within 0.0005 d of a quarter of the year) gives e = 0.000005; the
   smallest step of a slider, 0.01 day, gives at least 0.00008. */
const NO_ECCENTRICITY = 5e-5;

/* "arcsin k": the function upright, the variable in italics, centred at a
   canvas point, in the text colour of 'color'. */
const ARCSIN_FONT = '500 16px Spectral, Georgia, serif';
const ARCSIN_SPACE = 4;
const ARCSIN_HALF_HEIGHT = 9;

/* The width (px) of the label "arcsin" and its variable, and of each part. */
function arcsinWidths(ctx, variable) {
	ctx.font = ARCSIN_FONT;
	const functionWidth = ctx.measureText('arcsin').width;
	ctx.font = FONT_SYMBOL;
	const variableWidth = ctx.measureText(variable).width;

	return { functionWidth, variableWidth, total: functionWidth + ARCSIN_SPACE + variableWidth };
}

function arcsinLabel(ctx, variable, point, color) {
	const { functionWidth, total } = arcsinWidths(ctx, variable);
	const left = point.x - total / 2;

	ctx.fillStyle = textColor(color);
	ctx.textAlign = 'left';
	ctx.textBaseline = 'middle';
	ctx.font = ARCSIN_FONT;
	ctx.fillText('arcsin', left, point.y);
	ctx.font = FONT_SYMBOL;
	ctx.fillText(variable, left + functionWidth + ARCSIN_SPACE, point.y);
}

const fitFigure = {
	plot: null,
	fit: null,
	labels: new LabelPlacer(),

	init() {
		squareCanvas(this, byId('fit-canvas'), 420, 10);

		// a square plot box: margins left + right = top + bottom
		this.plot = new Plot2D(byId('fit-plot'), {
			x: CENTRE_RANGE,
			y: CENTRE_RANGE,
			xLabel: 'x, towards γ',
			yLabel: 'y, towards 90°',
			aspect: 1,
			maxHeight: 520,
			margin: { left: 56, right: 14, top: 30, bottom: 40 },
			onDraw: () => this.drawPlot()
		});

		wireSlider(
			byId('fit-spring'),
			() => this.update(),
			value => `${fixed(value, 2)} d`
		);
		wireSlider(
			byId('fit-summer'),
			() => this.update(),
			value => `${fixed(value, 2)} d`
		);
		this.wireSeasonPresets();
		this.update();
	},

	/* The preset buttons set both sliders at once. */
	wireSeasonPresets() {
		byId('fit-presets')
			.querySelectorAll('button')
			.forEach(button => {
				button.addEventListener('click', () => {
					byId('fit-spring').value = button.dataset.spring;
					byId('fit-summer').value = button.dataset.summer;
					byId('fit-spring').dispatchEvent(new Event('input'));
					byId('fit-summer').dispatchEvent(new Event('input'));
				});
			});
	},

	update() {
		this.fit = SolarEccentric.fitSeasons(readNumber('fit-spring'), readNumber('fit-summer'), YEAR_LENGTH);
		this.showReadout();
		this.draw();
		this.plot.redraw();
	},

	showReadout() {
		const { arcs, h, k, e, apogee, lengths } = this.fit;
		const greatest = `|q|_\\text{max} = ${fixed(SolarEccentric.greatestEquation(e).q, 2)}^\\circ`;

		// with no eccentricity there is no apogee: the line says so instead
		const apogeeText =
			e > NO_ECCENTRICITY ? `\\lambda_A = ${fixedAngle(apogee, 1)}^\\circ` : '\\text{no apogee (C at the Earth)}';

		showLines('fit-readout', [
			`a_1 = ${fixed(arcs[0], 2)}^\\circ,\\quad a_2 = ${fixed(arcs[1], 2)}^\\circ`,
			`h = ${fixed(h, 4)},\\ k = ${fixed(k, 4)},\\quad e = ${fixed(e, 4)}`,
			`${apogeeText},\\quad ${greatest}`,
			`\\text{autumn } ${texDays(lengths[2])},\\quad \\text{winter } ${texDays(lengths[3])}`
		]);
	},

	/* A point of panel (a), given relative to C in units of the radius. */
	fromC(x, y) {
		return { x: this.cx + this.scale * x, y: this.cy - this.scale * y };
	},

	/* Panel (a): the construction, centred on C. */
	draw() {
		if (!this.fit) {
			return;
		}

		const ctx = this.ctx;
		const h = FIT_EXAGGERATION * this.fit.h;
		const k = FIT_EXAGGERATION * this.fit.k;

		// seen from C, the four points where the axes meet the circle
		const angles = [-asin(k), 90 + asin(h), 180 + asin(k), 270 - asin(h)];

		this.scale = this.R / FIT_REACH;

		const C = this.fromC(0, 0);
		const O = this.fromC(-h, -k);

		ctx.clearRect(0, 0, this.width, this.width);
		this.labels.begin(canvasBounds(this));

		this.drawParallels();
		this.drawCircle(angles);
		this.drawAxes(h, k, angles);
		this.drawTriangles(angles);

		drawDot(ctx, O.x, O.y, 6, COL.earth);
		drawDot(ctx, C.x, C.y, 4, COL.ink);
		centredLabel(ctx, 'O', { x: O.x - 13, y: O.y + 13 }, COL.earth, this.labels);
		centredLabel(ctx, 'C', { x: C.x - 13, y: C.y - 13 }, COL.ink, this.labels);
	},

	/* The parallels to the axes through C, dashed, across the circle. */
	drawParallels() {
		const style = { color: COL.deferent, width: 1.5, dash: [6, 4] };

		segment(this.ctx, this.fromC(-1, 0), this.fromC(1, 0), style);
		segment(this.ctx, this.fromC(0, -1), this.fromC(0, 1), style);
	},

	/* The eccentric, with the arcs of spring (a1) and summer (a2) drawn
	   thick and named outside the circle. */
	drawCircle(angles) {
		const ctx = this.ctx;
		const C = this.fromC(0, 0);
		const arcs = [
			{ from: angles[0], to: angles[1], color: COL.planet, name: '1' },
			{ from: angles[1], to: angles[2], color: COL.epicycle, name: '2' }
		];

		circle(ctx, C, this.scale, { color: COL.deferent, width: 2 });

		arcs.forEach(({ from, to, color, name }) => {
			const middle = (from + to) / 2;

			screenArc(ctx, C, this.scale, from, to, { color: color, width: 4 });
			subscriptLabel(ctx, 'a', name, this.fromC(1.1 * cos(middle), 1.1 * sin(middle)), color);
		});
	},

	/* The axes, from the Earth to the circle, with the names of their
	   directions outside it; the radii from C to the four points. */
	drawAxes(h, k, angles) {
		const ctx = this.ctx;
		const O = this.fromC(-h, -k);
		const C = this.fromC(0, 0);

		angles.forEach((angle, i) => {
			const point = this.fromC(cos(angle), sin(angle));

			segment(ctx, O, point, { color: COL.sun, width: 1.5 });
			segment(ctx, C, point, { color: COL.ink, width: 1 });
			drawDot(ctx, point.x, point.y, 3.5, COL.ink);
			labelOutside(ctx, CARDINAL_POINTS[i].label, C, this.scale, angle, COL.sun, this.labels);
		});
	},

	/* The two right triangles of the text. Towards γ: the radius from C
	   (length 1), the parallel to the x axis, and the short leg k between
	   the parallel and the point on the x axis; the angle arcsin k at C.
	   Towards 90°: the same with the parallel to the y axis, the leg h
	   and the angle arcsin h. */
	drawTriangles(angles) {
		const ctx = this.ctx;
		const C = this.fromC(0, 0);
		const r = SMALL_ANGLE_RADIUS * this.scale;
		const legStyle = { color: COL.planet, width: 4 };

		// the points on the axes, and the feet of the legs on the parallels
		const towardsGamma = { x: cos(angles[0]), y: sin(angles[0]) };
		const towardsSummer = { x: cos(angles[1]), y: sin(angles[1]) };
		const kTop = this.fromC(towardsGamma.x, 0);
		const kEnd = this.fromC(towardsGamma.x, towardsGamma.y);
		const hTop = this.fromC(0, towardsSummer.y);
		const hEnd = this.fromC(towardsSummer.x, towardsSummer.y);

		this.angleWedge(C, r, 0, angles[0]);
		this.angleWedge(C, r, 90, angles[1]);
		segment(ctx, kTop, kEnd, legStyle);
		segment(ctx, hTop, hEnd, legStyle);

		// the legs' names, inside their triangles
		centredLabel(ctx, 'k', { x: kTop.x - LEG_LABEL_GAP, y: (kTop.y + kEnd.y) / 2 }, COL.planet, this.labels);
		centredLabel(ctx, 'h', { x: (hTop.x + hEnd.x) / 2, y: hTop.y + LEG_LABEL_GAP }, COL.planet, this.labels);

		// the angles' names, across the parallel from their angle: arcsin k
		// above the parallel to the x axis when the angle opens below it;
		// arcsin h to the right of the parallel to the y axis when the angle
		// opens to its left
		const { along, gap, ramp } = SMALL_ANGLE_LABEL;
		const kSide = clamp(-angles[0] / ramp, -1, 1);
		const hSide = clamp((angles[1] - 90) / ramp, -1, 1);
		const kAt = this.fromC(along.k, 0);
		const hAt = this.fromC(0, along.h);
		const hHalfWidth = arcsinWidths(ctx, 'h').total / 2;

		arcsinLabel(ctx, 'k', { x: kAt.x, y: kAt.y - kSide * (ARCSIN_HALF_HEIGHT + gap) }, COL.planet);
		arcsinLabel(ctx, 'h', { x: hAt.x + hSide * (hHalfWidth + gap), y: hAt.y }, COL.planet);
	},

	/* A small angle at C, from the direction 'from' to 'to' (deg): a
	   shaded sector of radius r px, edged by its arc. */
	angleWedge(C, r, from, to) {
		const ctx = this.ctx;
		const start = Math.min(from, to);
		const end = Math.max(from, to);

		ctx.fillStyle = withAlpha(COL.planet, 0.22);
		ctx.beginPath();
		ctx.moveTo(C.x, C.y);
		ctx.arc(C.x, C.y, r, -start * D2R, -end * D2R, true);
		ctx.closePath();
		ctx.fill();
		screenArc(ctx, C, r, start, end, { color: COL.planet, width: 2.5 });
	},

	/* Panel (b): the axes, the parallels through C, which meet the axes at
	   h and k, and the line towards the apogee with the angle lambdaA. */
	drawPlot() {
		if (!this.fit) {
			return;
		}

		const p = this.plot;
		const { h, k, e } = this.fit;

		p.frame();
		p.hline(0, { color: COL.sun, width: 1.5 });
		p.vline(0, { color: COL.sun, width: 1.5 });
		p.hline(k, { color: COL.deferent, width: 1.5, dash: [6, 4] });
		p.vline(h, { color: COL.deferent, width: 1.5, dash: [6, 4] });

		// h and k, measured along the axes from the Earth
		p.curve([0, h], [0, 0], { color: COL.planet, width: 4 });
		p.curve([0, 0], [0, k], { color: COL.planet, width: 4 });

		// C at the Earth (e = 0) has no direction to draw
		if (e > NO_ECCENTRICITY) {
			this.drawApogee();
		}

		p.marker(0, 0, { color: COL.earth, radius: 6 });
		p.marker(h, k, { color: COL.ink, radius: 4 });
		this.labelPlot();
	},

	/* The line from the Earth through C to the edge of the panel, and the
	   angle lambdaA from gamma, with its name inside the arc (kept clear
	   of the letters, which are set after it). */
	drawApogee() {
		const p = this.plot;
		const apogee = this.fit.apogee;
		const reach = Math.SQRT2 * CENTRE_RANGE[1];
		const half = apogee / 2;
		const arc = { xs: [], ys: [] };

		p.curve([0, reach * cos(apogee)], [0, reach * sin(apogee)], { color: COL.muted, width: 1.5, clip: true });

		for (let a = 0; a <= apogee; a += 1) {
			arc.xs.push(APOGEE_ARC_RADIUS * cos(a));
			arc.ys.push(APOGEE_ARC_RADIUS * sin(a));
		}

		p.curve(arc.xs, arc.ys, { color: COL.muted, width: 1.5, clip: true });

		// inside the arc or just outside it, whichever is farther from the
		// axes and the dashed parallels (λA, two characters, may move)
		const { h, k } = this.fit;
		const lines = { xs: [p.px(0), p.px(h)], ys: [p.py(0), p.py(k)] };
		const clearance = point =>
			Math.min(
				...lines.xs.map(x => Math.abs(point.x - x) - APOGEE_LABEL_HALF.width),
				...lines.ys.map(y => Math.abs(point.y - y) - APOGEE_LABEL_HALF.height)
			);
		const places = APOGEE_LABEL_RADII.map(r => ({ x: p.px(r * cos(half)), y: p.py(r * sin(half)) }));
		const at = clearance(places[0]) >= clearance(places[1]) ? places[0] : places[1];

		subscriptLabel(p.ctx, 'λ', 'A', at, COL.ink);
		p.labels.reserve({ x0: at.x - 12, y0: at.y - 12, x1: at.x + 12, y1: at.y + 14 });
	},

	/* The names in panel (b): the Earth O, C, h and k, single letters
	   that may change sides as C crosses an axis (CLAUDE.md), and move
	   round their point when another name takes their place (LabelPlacer).
	   Each goes on the side of the axes away from C, so that none sits on
	   the dashed parallels: O in the quadrant opposite C, h under (or
	   over) the x axis, k beside the y axis, C on its far side from the y
	   axis. The axis titles say where the axes lead. */
	labelPlot() {
		const p = this.plot;
		const { h, k } = this.fit;
		const right = h < 0 ? 1 : -1; // the side of the y axis away from C
		const below = k < 0 ? -1 : 1; // the side of the x axis away from C

		centredLabel(p.ctx, 'O', { x: p.px(0) + 12 * right, y: p.py(0) + 14 * below }, COL.earth, p.labels);
		centredLabel(p.ctx, 'C', { x: p.px(h) - 14 * right, y: p.py(k) - 12 }, COL.ink, p.labels);
		centredLabel(p.ctx, 'h', { x: p.px(h / 2), y: p.py(0) + 14 * below }, COL.planet, p.labels);
		centredLabel(p.ctx, 'k', { x: p.px(0) + 12 * right, y: p.py(k / 2) }, COL.planet, p.labels);
	}
};

/* ==========================================================================
   7. FIGURE 6: THE ERROR CURVE
   The eccentric fitted to 2026 against the reference Sun, over 1, 100
   and 1000 years centred on 2026 (the model takes JD(TT) and returns a
   longitude, models/solar-eccentric.js; the widget compares it with the
   reference Sun, shared/errorcurve.js). No slider changes the model, so
   the widget fits its scale to each span. The uniform circle of page 1.3
   is left out: its error, about seventy times larger, would flatten the
   eccentric's on any scale that showed both.
   ========================================================================== */

const errorFigure = {
	init() {
		const curve = new ErrorCurve(byId('error-2026'), {
			body: 'sun',
			start: YEAR_START,
			end: YEAR_START + 365.25,
			spans: [
				{ label: '1 year', years: 1 },
				{ label: '100 years', years: 100 },
				{ label: '1000 years', years: 1000 }
			],
			ghostButtons: false
		});

		curve.addModel({
			label: 'eccentric, fitted to 2026',
			short: 'eccentric',
			color: COL.deferent,
			fn: SolarEccentric.make(SolarEccentric.FIT_2026)
		});
	}
};

/* ==========================================================================
   8. PAGE START
   Shared components first (they typeset the prose), then the figures.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
	Site.initPage();
	startFigures([motionFigure, restFigure, centreFigure, seasonsFigure, fitFigure, errorFigure]);
});
