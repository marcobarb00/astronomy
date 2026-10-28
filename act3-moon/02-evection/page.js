// @ts-check
/* ==========================================================================
   PAGE 3.2 · EVECTION AND THE DISTANCE PROBLEM - SCRIPT (page.js)
   Six figures, each with its own init and draw (and update when it has
   controls):
	 1. the equation at the phases   (2D, static: the real Moon's true
									   minus mean longitude against its
									   anomaly, 2021 - 2030)
	 2. Ptolemy's crank              (2D: (a) the epicycle on the turning
									   eccentric, seen from the north
									   ecliptic pole, (b) q over two
									   months; date)
	 3. the direction of the epicycle (2D, static: Ptolemy's example of
									   Almagest V 6, and the epicycle
									   enlarged)
	 4. the crank fitted to 2026     (error curve)
	 5. Ptolemy's complete Moon      (error curve, AD 139 and 2000 years)
	 6. the apparent diameter        (2D, static: the real Moon and the
									   two models through 2026)
   Shared code: common.js, time.js, ephemeris.js, models/mean-sun.js,
   models/solar-eccentric.js, models/lunar-epicycle.js,
   models/lunar-crank.js, plot2d.js, errorcurve.js, components.js.
   Every number quoted in the prose comes from
   tools/numbers/3.2-evection.js.

   TABLE OF CONTENTS
	 0. Helpers shared by the figures
	 1. Figure 1: the equation at the new and full Moons and the quarters
	 2. Figure 2: Ptolemy's crank
	 3. Figure 3: the direction of the epicycle
	 4. Figures 4 and 5: the error curves
	 5. Figure 6: the apparent diameter
	 6. Page start
   ========================================================================== */

/* ==========================================================================
   0. HELPERS SHARED BY THE FIGURES
   ========================================================================== */

/* The year of the figures, and 0 h of its first day (JD; the models and
   the reference take TT, the dates here are only labels). */
const YEAR = 2026;
const YEAR_START = Time.julianDay(YEAR, 1, 1);
const DAYS_IN_YEAR = 365;

/* The reference Moon and Sun (apparent longitudes of date, deg). */
const moonLongitude = jd => Ephem.longitude('moon', jd);
const sunLongitude = jd => Ephem.longitude('sun', jd);

/* The kinds of phase: the elongation Moon - Sun at each (deg), and the
   name that marks it in Figure 2 (b) ("Q" for a quarter, so that the
   letter N stays Ptolemy's point of section 2). */
const PHASES = [
	{ elongation: 0, kind: 'syzygy', name: 'new' },
	{ elongation: 90, kind: 'quarter', name: 'Q' },
	{ elongation: 180, kind: 'syzygy', name: 'full' },
	{ elongation: 270, kind: 'quarter', name: 'Q' }
];

/* Every new Moon, full Moon and quarter in [from, to] (JD(TT)), in time
   order: [{ jd, kind, name }]. One scan of the elongation every half
   day finds the quadrant it enters, then bisection finds the moment. */
function phaseMoments(from, to) {
	const elongation = jd => norm360(moonLongitude(jd) - sunLongitude(jd));
	const quadrant = jd => Math.floor(elongation(jd) / 90);
	const found = [];
	let before = quadrant(from);

	for (let jd = from; jd < to; jd += 0.5) {
		const after = quadrant(jd + 0.5);

		if (after !== before) {
			const phase = PHASES[after];
			const off = t => norm180(elongation(t) - phase.elongation);

			found.push({ jd: bisect(off, jd, jd + 0.5, 30), kind: phase.kind, name: phase.name });
			before = after;
		}
	}

	return found;
}

/* The mean motions of the reference Moon (Meeus 47, as on page 3.1): its
   mean longitude and its anomaly from the apogee at JD(TT). */
const meeusMoon = Object.assign({}, LunarEpicycle.MEEUS, { e: 0 });
const meeusState = jd => LunarEpicycle.state(meeusMoon, jd);

/* An angle with a sign in TeX: "+1.85^\circ", "-0.40^\circ". */
const texSigned = (degrees, digits = 2) => `${signed(degrees, digits).replace('−', '-')}^\\circ`;

/* First day of each month of YEAR, as a day index (0 = 1 January). */
const MONTH_STARTS = Time.MONTH_NAMES.map((name, i) => ({
	value: Time.julianDay(YEAR, i + 1, 1) - YEAR_START,
	label: name
}));

/* Ticks of a date axis over the year: every month when there is room,
   else every other. */
const monthTicks = (min, max, count) => MONTH_STARTS.filter((t, i) => count >= 8 || i % 2 === 0);

/* A canvas point for a point of a model (units of OA, x towards the
   vernal point), in a drawing whose Earth O is at 'origin' and whose OA
   is 'scale' px. */
const toCanvas = (origin, scale, point) => ({ x: origin.x + scale * point[0], y: origin.y - scale * point[1] });

/* ==========================================================================
   1. FIGURE 1: THE EQUATION AT THE NEW AND FULL MOONS AND THE QUARTERS
   Static. The reference Moon's true minus mean longitude at every new and
   full Moon and every quarter of 2021 - 2030, against its anomaly M from
   the apogee (Meeus' mean motions). Fixed scale +-9° (the equation reaches
   7.92°, tools/numbers/3.2-evection.js).
   ========================================================================== */

const EQUATION_RANGE = [-9, 9];
const EQUATION_FROM = Time.julianDay(2021, 1, 1);
const EQUATION_TO = Time.julianDay(2031, 1, 1);

/* Ticks of the anomaly axis, every 90°. */
const anomalyTicks = () => [0, 90, 180, 270, 360].map(value => ({ value, label: `${value}°` }));

const equationFigure = {
	plot: null,

	init() {
		this.points = phaseMoments(EQUATION_FROM, EQUATION_TO).map(phase => {
			const s = meeusState(phase.jd);

			return {
				kind: phase.kind,
				M: s.M,
				q: norm180(moonLongitude(phase.jd) - s.meanLongitude)
			};
		});

		this.plot = new Plot2D(byId('equation-plot'), {
			x: [0, 360],
			y: EQUATION_RANGE,
			xLabel: 'anomaly M from the apogee (°)',
			yLabel: 'true − mean longitude (°)',
			xTicks: anomalyTicks,
			aspect: 0.5,
			onDraw: () => this.draw()
		});
	},

	draw() {
		const p = this.plot;
		const colors = { syzygy: COL.earth, quarter: COL.planet };

		p.frame();
		p.hline(0, { color: COL.ink, width: 1 });
		this.points.forEach(point => p.marker(point.M, point.q, { color: colors[point.kind], radius: 3.2 }));
	}
};

/* ==========================================================================
   2. FIGURE 2: PTOLEMY'S CRANK
   (a) the crank fitted to 2026 (LunarCrank.FIT_2026, without the direction
   of the epicycle, which Figure 3 adds), at the chosen moment, seen from
   the north ecliptic pole: the eccentric about C with its apogee A and its
   line of apsides, the direction of the mean Sun, the epicycle about K
   and the Moon L. (b) q over two months, against the epicycle of page 3.1.
   |q| stays under asin(e / (1 - 2c)) = 7.49°: fixed scale +-8°.
   ========================================================================== */

const Q_RANGE = [-8, 8];

/* The two months of panel (b), from 1 January. */
const CRANK_DAYS = 60;

/* Points per day of the curves of panel (b). */
const CRANK_SAMPLES_PER_DAY = 4;

/* The date slider plays the two months in 12 seconds. */
const CRANK_DAYS_PER_SECOND = 5;

/* The crank of the figure: our fit, without the direction. */
const CRANK = Object.assign({}, LunarCrank.FIT_2026, { direction: false });

/* The room around the drawing (units of OA): the Moon reaches 1 + e. */
const CRANK_REACH = 1 + CRANK.e + 0.12;

/* How far the mean Sun's direction is drawn (units of OA). */
const MEAN_SUN_REACH = 1.1;

const crankFigure = {
	plot: null,
	state: null,
	labels: new LabelPlacer(), // keeps the labels of one drawing apart

	init() {
		squareCanvas(this, byId('crank-canvas'), 420, 10);

		this.phases = phaseMoments(YEAR_START, YEAR_START + CRANK_DAYS);
		this.curves = this.monthsCurves();

		this.plot = new Plot2D(byId('crank-plot'), {
			x: [0, CRANK_DAYS],
			y: Q_RANGE,
			xLabel: `days from 1 January ${YEAR}`,
			yLabel: 'q (°)',
			aspect: 0.95,
			maxHeight: 440,
			margin: { top: 28 },
			onDraw: () => this.drawPlot()
		});

		wireSlider(
			byId('crank-day'),
			() => this.update(),
			value => dateHourText(YEAR_START + Number(value))
		);
		wirePresets(byId('crank-canvas').closest('figure'));
		wirePlayButton(byId('crank-play'), byId('crank-day'), CRANK_DAYS_PER_SECOND, {
			playLabel: 'Play two months'
		});

		this.update();
	},

	/* q over the two months: the crank and the epicycle of page 3.1 (deg). */
	monthsCurves() {
		const days = [];
		const crank = [];
		const epicycle = [];

		for (let i = 0; i <= CRANK_DAYS * CRANK_SAMPLES_PER_DAY; i++) {
			const day = i / CRANK_SAMPLES_PER_DAY;

			days.push(day);
			crank.push(LunarCrank.state(CRANK, YEAR_START + day).q);
			epicycle.push(LunarEpicycle.state(LunarEpicycle.FIT_2026, YEAR_START + day).q);
		}

		return { days, crank, epicycle };
	},

	update() {
		const day = readNumber('crank-day');

		this.state = { day, now: LunarCrank.state(CRANK, YEAR_START + day) };
		this.showReadout();
		this.draw();
		this.plot.redraw();
	},

	showReadout() {
		const { day, now } = this.state;
		const greatest = asin(CRANK.e / now.rho);

		showLines('crank-readout', [
			`\\text{${dateHourText(YEAR_START + day)}:}\\quad \\bar\\lambda = ${fixedAngle(now.meanLongitude, 2)}^\\circ,\\quad D = ${fixedAngle(now.elongation, 2)}^\\circ`,
			`\\rho = \\text{OK} = ${fixed(now.rho, 3)},\\quad M = ${fixedAngle(now.M, 2)}^\\circ`,
			`q = ${texSigned(now.q)},\\quad \\arcsin(e/\\rho) = ${fixed(greatest, 2)}^\\circ`
		]);
	},

	/* Panel (a). */
	draw() {
		if (!this.state) {
			return;
		}

		const ctx = this.ctx;
		const s = this.state.now;
		const scale = this.R / CRANK_REACH;
		const O = { x: this.cx, y: this.cy };
		const parts = LunarCrank.construction(CRANK, s);
		const at = point => toCanvas(O, scale, point);
		const C = at(parts.C);
		const A = at(parts.A);
		const K = at(parts.K);
		const L = at(parts.L);
		const apogee = norm360(s.meanLongitude - 2 * s.elongation);

		ctx.clearRect(0, 0, this.width, this.width);
		this.labels.begin({ x0: 0, y0: 0, x1: this.width, y1: this.width });

		// the mean Sun's direction, and the eccentric's line of apsides
		// from its perigee through O and C to A
		segment(ctx, O, towards(O, s.meanSun, scale * MEAN_SUN_REACH), { color: COL.sun, width: 1.5, dash: [6, 4] });
		segment(ctx, towards(C, apogee + 180, scale * (1 - CRANK.c)), A, {
			color: COL.muted,
			width: 1.2,
			dash: [2, 4]
		});

		// the eccentric and the epicycle
		circle(ctx, C, scale * (1 - CRANK.c), { color: COL.deferent, width: 2 });
		circle(ctx, K, scale * CRANK.e, { color: COL.epicycle, width: 2.2 });

		// the mean direction O K, the Moon on the epicycle, and the line of
		// sight O L
		segment(ctx, O, K, { color: COL.ink, width: 1.2 });
		segment(ctx, K, L, { color: COL.epicycle, width: 1.5 });
		segment(ctx, O, L, { color: COL.planet, width: 2 });

		drawDot(ctx, O.x, O.y, 6, COL.earth);
		drawDot(ctx, C.x, C.y, 3.5, COL.ink);
		drawDot(ctx, A.x, A.y, 3.5, COL.ink);
		drawDot(ctx, K.x, K.y, 3.5, COL.ink);
		drawDot(ctx, L.x, L.y, 7, COL.planet);
		this.drawLabels({ O, C, A, K, L }, s, apogee);
	},

	/* The labels, each just outside its point: single letters, never words,
	   which would jump from side to side as the points turn (CLAUDE.md).
	   The panel title and the caption name the circles. */
	drawLabels(points, s, apogee) {
		const ctx = this.ctx;
		const { O, C, A, K, L } = points;
		const lambda = s.lambda;
		const moonFromK = norm360(Math.atan2(-(L.y - K.y), L.x - K.x) * R2D);

		labelOutside(ctx, 'L', L, 8, clearestDirection([moonFromK + 180, lambda + 180]), COL.planet, this.labels);
		labelOutside(
			ctx,
			'K',
			K,
			4,
			clearestDirection([s.meanLongitude + 180, moonFromK, s.meanLongitude]),
			COL.ink,
			this.labels
		);
		labelOutside(ctx, 'A', A, 4, apogee, COL.ink, this.labels);
		labelOutside(ctx, 'C', C, 4, clearestDirection([apogee, apogee + 180]), COL.ink, this.labels);
		labelOutside(
			ctx,
			'O',
			O,
			7,
			clearestDirection([s.meanLongitude, s.meanSun, apogee, apogee + 180, lambda]),
			COL.earth,
			this.labels
		);
	},

	/* A phase's name above the plot box, over the line of that phase. */
	phaseName(name, x) {
		const ctx = this.plot.ctx;

		ctx.fillStyle = textColor(COL.muted);
		ctx.font = FONT_TICK;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'bottom';
		ctx.fillText(name, this.plot.px(x), this.plot.box.top - 4);
	},

	/* Panel (b). */
	drawPlot() {
		if (!this.state) {
			return;
		}

		const p = this.plot;
		const { days, crank, epicycle } = this.curves;

		p.frame();
		p.hline(0, { color: COL.ink, width: 1 });

		this.phases.forEach(({ jd, name }) => {
			const x = jd - YEAR_START;

			p.vline(x, { color: COL.muted, width: 1, dash: [2, 4] });
			this.phaseName(name, x);
		});

		p.curve(days, epicycle, { color: COL.epicycle, width: 1.5, dash: [6, 4] });
		p.curve(days, crank, { color: COL.planet, width: 2.5 });
		p.marker(this.state.day, this.state.now.q, { color: COL.planet, radius: 5 });
	}
};

/* ==========================================================================
   3. FIGURE 3: THE DIRECTION OF THE EPICYCLE
   Static. Ptolemy's example of Almagest V 6, with his parameters: double
   elongation 90;30, anomaly 333;12 from the mean apogee. The drawing is
   turned so that K is straight above O. (a) the eccentric about C, the
   points O, N, A, the lines from O and from N through K. (b) the epicycle
   enlarged, with its true apogee (on the line from O) and its mean apogee
   (on the line from N), the angle between them and the Moon L.
   ========================================================================== */

const DIRECTION_TWO_D = 90.5;
const DIRECTION_M = 333.2;

/* The mean longitude of the drawing: K straight up. */
const DIRECTION_LAMBDA = 90;

/* Panel (a): the room around the drawing (units of OA); panel (b): the
   epicycle's radius as a fraction of the canvas' half width. */
const DIRECTION_REACH = 1.12;
const ZOOM_RADIUS = 0.5;

/* Panel (b): how far the two lines run past K (epicycle radii). */
const ZOOM_LINE_END = 1.35;

/* A name beside a point of a static drawing, aligned 'left' (starting
   just right of the point) or 'right' (ending just left of it). */
function sideLabel(ctx, text, point, align, color) {
	const gap = 6;

	ctx.fillStyle = textColor(color);
	ctx.font = labelFont(text);
	ctx.textAlign = align;
	ctx.textBaseline = 'middle';
	ctx.fillText(text, point.x + (align === 'left' ? gap : -gap), point.y);
}

/* Ptolemy's moment, in absolute coordinates (units of OA): O at the
   origin, K at the longitude DIRECTION_LAMBDA. */
function directionGeometry() {
	const P = LunarCrank.PTOLEMY;
	const g = LunarCrank.geometry(P.e, P.c, DIRECTION_TWO_D, DIRECTION_M, true);
	const turn = point => [
		point[0] * cos(DIRECTION_LAMBDA) - point[1] * sin(DIRECTION_LAMBDA),
		point[0] * sin(DIRECTION_LAMBDA) + point[1] * cos(DIRECTION_LAMBDA)
	];

	return {
		e: P.e,
		c: P.c,
		C: turn(g.C),
		K: turn(g.K),
		N: turn(g.N),
		L: turn(g.L),
		A: turn([cos(-DIRECTION_TWO_D), sin(-DIRECTION_TWO_D)]),
		trueApogee: DIRECTION_LAMBDA,
		meanApogee: DIRECTION_LAMBDA + g.shift,
		shift: g.shift
	};
}

/* Panel (a). */
const directionFigure = {
	labels: new LabelPlacer(),

	init() {
		this.geometry = directionGeometry();
		squareCanvas(this, byId('direction-canvas'), 420, 10);
		this.draw();
	},

	draw() {
		const ctx = this.ctx;
		const g = this.geometry;
		const scale = this.R / DIRECTION_REACH;
		const O = { x: this.cx, y: this.cy };
		const at = point => toCanvas(O, scale, point);
		const C = at(g.C);
		const K = at(g.K);
		const N = at(g.N);
		const A = at(g.A);

		ctx.clearRect(0, 0, this.width, this.width);
		this.labels.begin({ x0: 0, y0: 0, x1: this.width, y1: this.width });

		const apogee = DIRECTION_LAMBDA - DIRECTION_TWO_D;

		circle(ctx, C, scale * (1 - g.c), { color: COL.deferent, width: 2 });
		segment(ctx, towards(C, apogee + 180, scale * (1 - g.c)), A, {
			color: COL.muted,
			width: 1.2,
			dash: [2, 4]
		});

		// the lines from O and from N through K, to the epicycle's apogees
		segment(ctx, O, towards(K, g.trueApogee, scale * g.e), { color: COL.earth, width: 1.5 });
		segment(ctx, N, towards(K, g.meanApogee, scale * g.e), { color: COL.ink, width: 1.5, dash: [6, 4] });
		circle(ctx, K, scale * g.e, { color: COL.epicycle, width: 2 });

		drawDot(ctx, O.x, O.y, 6, COL.earth);
		[C, N, A, K].forEach(point => drawDot(ctx, point.x, point.y, 3.5, COL.ink));

		labelOutside(ctx, 'O', O, 7, 270, COL.earth, this.labels);
		labelOutside(ctx, 'C', C, 4, 270, COL.ink, this.labels);
		labelOutside(ctx, 'N', N, 4, 270, COL.ink, this.labels);
		labelOutside(ctx, 'A', A, 4, 0, COL.ink, this.labels);
		labelOutside(ctx, 'K', K, scale * g.e, 180, COL.ink, this.labels);
	}
};

/* Panel (b): the epicycle enlarged about K. The two lines come from below
   (O and N are far below K), so they are drawn from the bottom edge. */
const directionZoomFigure = {
	labels: new LabelPlacer(),

	init() {
		this.geometry = directionGeometry();
		squareCanvas(this, byId('direction-zoom'), 420, 10);
		this.draw();
	},

	draw() {
		const ctx = this.ctx;
		const g = this.geometry;
		const radius = ZOOM_RADIUS * this.R;
		const K = { x: this.cx, y: this.cy + 0.12 * this.R };
		const fromK = (lon, r) => towards(K, lon, r);
		const lineLength = this.width; // long enough to leave the canvas
		const moon = toCanvas(K, radius / g.e, [g.L[0] - g.K[0], g.L[1] - g.K[1]]);

		ctx.clearRect(0, 0, this.width, this.width);
		this.labels.begin({ x0: 0, y0: 0, x1: this.width, y1: this.width });

		// the line from O through K to the true apogee, and the line from N
		// through K to the mean apogee, each from below the canvas
		segment(ctx, fromK(g.trueApogee + 180, lineLength), fromK(g.trueApogee, ZOOM_LINE_END * radius), {
			color: COL.earth,
			width: 1.5
		});
		segment(ctx, fromK(g.meanApogee + 180, lineLength), fromK(g.meanApogee, ZOOM_LINE_END * radius), {
			color: COL.ink,
			width: 1.5,
			dash: [6, 4]
		});

		circle(ctx, K, radius, { color: COL.epicycle, width: 2.2 });
		segment(ctx, K, moon, { color: COL.epicycle, width: 1.5 });

		// the angle between the two apogees, at K
		screenArc(ctx, K, 0.45 * radius, g.meanApogee, g.trueApogee, { color: COL.ink, width: 2 });

		drawDot(ctx, K.x, K.y, 3.5, COL.ink);
		drawDot(ctx, moon.x, moon.y, 7, COL.planet);
		[g.trueApogee, g.meanApogee].forEach(lon => {
			const point = fromK(lon, radius);

			drawDot(ctx, point.x, point.y, 3.5, COL.ink);
		});

		this.drawLabels(K, radius, moon);
	},

	drawLabels(K, radius, moon) {
		const ctx = this.ctx;
		const g = this.geometry;
		const angle = `${Math.round(Math.abs(g.shift))}°`;
		const bottom = this.width - 16;
		const fromK = (lon, r) => towards(K, lon, r);

		// where each line crosses the bottom of the canvas, and its name
		// beside it, away from the other line
		const crossing = lon => K.x + (bottom - K.y) / Math.tan(-lon * D2R);

		// the two apogees named at the ends of their lines, each on the side
		// away from the other line
		sideLabel(ctx, 'true apogee', fromK(g.trueApogee, ZOOM_LINE_END * radius), 'right', COL.earth);
		sideLabel(ctx, 'mean apogee', fromK(g.meanApogee, ZOOM_LINE_END * radius), 'left', COL.ink);
		labelOutside(ctx, angle, K, 0.45 * radius, g.meanApogee - 30, COL.ink, this.labels);
		labelOutside(ctx, 'K', K, 4, 200, COL.ink, this.labels);
		labelOutside(ctx, 'L', moon, 8, 160, COL.planet, this.labels);
		centredLabel(ctx, 'from O', { x: crossing(g.trueApogee + 180) + 34, y: bottom }, COL.earth, this.labels);
		centredLabel(ctx, 'from N', { x: crossing(g.meanApogee + 180) - 34, y: bottom }, COL.ink, this.labels);
	}
};

/* ==========================================================================
   4. FIGURES 4 AND 5: THE ERROR CURVES
   The models take JD(TT) and return a longitude (models/*.js); the widget
   compares them with the reference Moon (shared/errorcurve.js). No slider
   changes a model here, so the widget fits its scale to each span.
   ========================================================================== */

/* Figure 4: the crank fitted to 2026, with page 3.1's epicycle and the
   crank without the direction as ghosts, over the year 2026, and over two
   months and a century centred on it; dots at the quarters. */
const ourErrorFigure = {
	init() {
		const start = YEAR_START;
		const end = YEAR_START + DAYS_IN_YEAR;
		const middle = (start + end) / 2;
		const curve = new ErrorCurve(byId('error-ours'), {
			body: 'moon',
			start: start,
			end: end,
			spans: [
				{ label: '2 months', years: CRANK_DAYS / 365.25 },
				{ label: '1 year', years: 1 },
				{ label: '100 years', years: 100 }
			],
			ghostButtons: false
		});
		const crank = LunarCrank.make(LunarCrank.FIT_2026);
		const quarters = phaseMoments(middle - 190, middle + 190).filter(phase => phase.kind === 'quarter');

		curve.addGhost({
			label: 'the epicycle of page 3.1',
			short: 'epicycle',
			color: COL.epicycle,
			fn: LunarEpicycle.make(LunarEpicycle.FIT_2026)
		});
		curve.addGhost({
			label: 'the crank alone',
			short: 'crank alone',
			color: COL.deferent,
			fn: LunarCrank.make(CRANK)
		});
		curve.addModel({
			label: "Ptolemy's complete model, fitted to 2026",
			short: 'complete model',
			color: COL.planet,
			fn: crank
		});
		curve.addMarks({
			label: 'the complete model at the quarters (spans of a year or less)',
			color: COL.planet,
			fn: crank,
			dates: quarters.map(phase => phase.jd),
			maxYears: 1.01
		});
	}
};

/* Figure 5: Ptolemy's complete Moon around his sighting of 9 February
   139, with his simple Moon of page 3.1 as a ghost, and over 2000 years
   (866 BC to AD 1134, inside the reference sky's range). */
const ptolemyErrorFigure = {
	init() {
		const start = Time.julianDay(139, 1, 20);
		const end = start + CRANK_DAYS;
		const curve = new ErrorCurve(byId('error-ptolemy'), {
			body: 'moon',
			start: start,
			end: end,
			spans: [
				{ label: '2 months', years: CRANK_DAYS / 365.25 },
				{ label: '2000 years', years: 2000 }
			],
			ghostButtons: false
		});

		curve.addGhost({
			label: "Ptolemy's simple Moon (<em>Almagest</em> IV)",
			short: 'simple Moon',
			color: COL.planet,
			fn: LunarEpicycle.make(LunarEpicycle.PTOLEMY)
		});
		curve.addModel({
			label: "Ptolemy's complete Moon (<em>Almagest</em> V)",
			short: 'complete Moon',
			color: COL.epicycle,
			fn: LunarCrank.make(LunarCrank.PTOLEMY)
		});
	}
};

/* ==========================================================================
   5. FIGURE 6: THE APPARENT DIAMETER
   Static. The real Moon's apparent diameter through 2026, from the
   reference Moon's distance, and the diameters the two models predict,
   each scaled so that at its greatest distance the Moon has the real
   Moon's smallest diameter of the year. Fixed scale 25' to 60' (the crank
   reaches 56.6', tools/numbers/3.2-evection.js).
   ========================================================================== */

const DIAMETER_RANGE = [25, 60];

/* The Moon's radius (km, IAU). */
const MOON_RADIUS = 1737.4;

/* Points per day of the curves. */
const DIAMETER_SAMPLES_PER_DAY = 4;

/* The apparent diameter (arcmin) at a distance (km). */
const apparentDiameter = km => 2 * asin(MOON_RADIUS / km) * 60;

/* The distance of the epicycle of page 3.1 (units of its deferent). */
function epicycleDistance(jd) {
	const e = LunarEpicycle.FIT_2026.e;
	const M = LunarEpicycle.state(LunarEpicycle.FIT_2026, jd).M;

	return Math.hypot(1 + e * cos(M), e * sin(M));
}

const diameterFigure = {
	plot: null,

	init() {
		this.compute();

		this.plot = new Plot2D(byId('diameter-plot'), {
			x: [0, DAYS_IN_YEAR],
			y: DIAMETER_RANGE,
			xLabel: `date (${YEAR})`,
			yLabel: 'apparent diameter (′)',
			xTicks: monthTicks,
			aspect: 0.45,
			onDraw: () => this.draw()
		});
	},

	/* The three curves. */
	compute() {
		const crankDistance = LunarCrank.makeDistance(LunarCrank.FIT_2026);

		this.days = [];
		this.real = [];

		for (let i = 0; i <= DAYS_IN_YEAR * DIAMETER_SAMPLES_PER_DAY; i++) {
			const day = i / DIAMETER_SAMPLES_PER_DAY;

			this.days.push(day);
			this.real.push(apparentDiameter(Ephem.position('moon', YEAR_START + day).dist));
		}

		const smallest = Math.min(...this.real);
		const scaled = (distance, greatest) => this.days.map(day => (smallest * greatest) / distance(YEAR_START + day));

		this.crank = scaled(crankDistance, 1 + LunarCrank.FIT_2026.e);
		this.epicycle = scaled(epicycleDistance, 1 + LunarEpicycle.FIT_2026.e);
	},

	draw() {
		const p = this.plot;

		p.frame();
		p.curve(this.days, this.epicycle, { color: COL.epicycle, width: 1.5, dash: [6, 4] });
		p.curve(this.days, this.crank, { color: COL.planet, width: 1.5 });
		p.curve(this.days, this.real, { color: COL.ink, width: 2.2 });
	}
};

/* ==========================================================================
   6. PAGE START
   Shared components first (they typeset the prose), then the figures.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
	Site.initPage();
	startFigures([
		equationFigure,
		crankFigure,
		directionFigure,
		directionZoomFigure,
		ourErrorFigure,
		ptolemyErrorFigure,
		diameterFigure
	]);
});
