// @ts-check
/* ==========================================================================
   PAGE 4.2 · THE EQUANT - SCRIPT (page.js)
   Six figures, each with its own init and draw (and update when it has
   controls):
	 1. the oppositions and the loops  (2D, static: Mars at its oppositions
										to the mean Sun, and its arcs of
										retrogradation, 1986 - 2025)
	 2. the deferent and the equant    (2D: (a) the construction seen from
										the north ecliptic pole, (b) the
										distance of K; date)
	 3. the equant and the ellipse     (2D: (a) the deferent and Kepler's
										ellipse with the same e, (b) the
										difference in direction; M; views
										e = 0.3 and Mars)
	 4. the fit of the centre          (2D: (a) the oppositions, (b) the
										loops of 2010 - 2025 with the model;
										the centre OC)
	 5. the equant against Mars        (error curve, fitted to 2010 - 2025,
										page 4.1's epicycle as ghost)
	 6. the loops of Mars again        (2D, static: arcs and intervals of
										1986 - 2025 with the equant's)
   Shared code: common.js, time.js, ephemeris.js, models/mean-sun.js,
   models/precession.js, models/planet-epicycle.js, models/planet-equant.js,
   plot2d.js, errorcurve.js, components.js.
   Every number quoted in the prose comes from tools/numbers/4.2-equant.js.

   TABLE OF CONTENTS
	 0. Helpers shared by the figures
	 1. Figure 1: the oppositions and the loops
	 2. Figure 2: the deferent and the equant
	 3. Figure 3: the equant and Kepler's ellipse
	 4. Figure 4: the fit of the centre
	 5. Figure 5: the error curve
	 6. Figure 6: the loops of Mars again
	 7. Page start
   ========================================================================== */

/* ==========================================================================
   0. HELPERS SHARED BY THE FIGURES
   ========================================================================== */

/* The page's observations, all from years already past (STRUCTURE.md
   §5): the oppositions and loops of 1986 - 2025, those of the fit from
   2010. */
const DATA_START = Time.julianDay(1986, 1, 1);
const DATA_END = Time.julianDay(2026, 1, 1);
const FIT_START = Time.julianDay(2010, 1, 1);

/* The model of this page and page 4.1's, and the two mean motions. */
const EQUANT = PlanetEquant.MARS_FIT;
const SEPARATE = PlanetEquant.MARS_SEPARATE;
const N_MARS = EQUANT.n;
const N_SUN = MeanSun.MODERN.n;

/* An angle with a sign in TeX: "+1.85^\circ", "-0.40^\circ". */
const texSigned = (degrees, digits = 2) => `${signed(degrees, digits).replace('−', '-')}^\\circ`;

/* The reference Mars from geometric positions, under 1' from the
   apparent ones the numbers script quotes and four times faster
   (DECISIONS.md, page 4.1). */
const marsLongitude = jd => Ephem.position('mars', jd, { apparent: false }).lon;

/* The reference loops of Mars, 1986 - 2025, computed once: every two
   days, refined by bisection (planet-epicycle.js, section 5). */
let loopsCache = null;

function marsLoops() {
	if (!loopsCache) {
		const loops = PlanetEpicycle.referenceEvents('mars', 'outer', DATA_START - 200, DATA_END, {
			apparent: false,
			step: 2
		}).loops;

		loopsCache = loops
			.map((loop, i) =>
				Object.assign({ next: i + 1 < loops.length ? loops[i + 1].middle - loop.middle : NaN }, loop)
			)
			.filter(loop => loop.middle >= DATA_START && loop.middle < DATA_END);
	}

	return loopsCache;
}

/* The oppositions of Mars to the mean Sun of 1986 - 2025 (JD(TT)),
   computed once: a scan every two days, refined by bisection. */
let oppositionsCache = null;

function meanOppositions() {
	if (!oppositionsCache) {
		const off = jd => norm180(marsLongitude(jd) - MeanSun.meanLongitude(MeanSun.MODERN, jd) - 180);
		const found = [];
		let before = off(DATA_START);

		for (let jd = DATA_START + 2; jd <= DATA_END; jd += 2) {
			const now = off(jd);

			if (before * now <= 0 && Math.abs(now - before) < 90) {
				found.push(bisect(off, jd - 2, jd, 40));
			}

			before = now;
		}

		oppositionsCache = found;
	}

	return oppositionsCache;
}

/* Draw xs, ys as a curve and again shifted by -360° and +360°, so that a
   curve against an ecliptic longitude wraps round the plot. */
function wrappedCurve(plot, xs, ys, style) {
	[-360, 0, 360].forEach(shift => {
		plot.curve(
			xs.map(x => x + shift),
			ys,
			style
		);
	});
}

/* The equant's loops round the zodiac, for the deferent offsets OC and
   OQ, the epicycle r and the apogee: { xs (the ecliptic longitude of the
   opposition, unwrapped), arcs, intervals (when asked) }. */
function modelLoops(centre, equant, r, apogee, withIntervals = false) {
	const xs = [];
	const arcs = [];
	const intervals = [];

	for (let M = 0; M <= 360; M += 5) {
		const loop = PlanetEquant.loopAt(M, centre, equant, r, N_MARS, N_SUN);

		xs.push(apogee + M + PlanetEquant.zodiacal(M, centre, equant).q);
		arcs.push(loop.arc);

		if (withIntervals) {
			intervals.push(PlanetEquant.oppositionInterval(M, centre, equant, N_MARS, N_SUN));
		}
	}

	return { xs, arcs, intervals };
}

/* A plot of a quantity against the ecliptic longitude of the opposition. */
function longitudePlot(canvas, y, yLabel, onDraw) {
	return new Plot2D(canvas, {
		x: [0, 360],
		y,
		xLabel: 'ecliptic longitude of the opposition (°)',
		yLabel,
		xTicks: quarterTicks,
		aspect: 0.75,
		maxHeight: 360,
		onDraw
	});
}

/* The fixed scales (tools/numbers/4.2-equant.js, section 9): the
   oppositions less the mean longitude, -12.0° to +11.0° (Figure 1) and
   -11.6° to +11.6° for every centre (Figure 4); the arcs 10.0° to 19.5°,
   and 1.4° to 31.9° for every centre of Figure 4; the intervals 764 to
   811 days. */
const EQUATION_RANGE = [-14, 14];
const ARC_RANGE = [8, 22];
const FIT_ARC_RANGE = [0, 34];
const INTERVAL_RANGE = [750, 825];

/* ==========================================================================
   1. FIGURE 1: THE OPPOSITIONS AND THE LOOPS
   Static. (a) each opposition to the mean Sun of 1986 - 2025, its
   ecliptic longitude less page 4.1's mean longitude there; (b) how far
   Mars went back in each loop of those years; both against the ecliptic
   longitude of the opposition.
   ========================================================================== */

const observedFigure = {
	init() {
		const fit41 = PlanetEpicycle.MARS_FIT;

		this.points = meanOppositions().map(jd => {
			const lon = marsLongitude(jd);

			return { lon, q: norm180(lon - (fit41.L0 + fit41.n * (jd - fit41.epoch))) };
		});
		this.loops = marsLoops();
		this.oppositions = longitudePlot(
			byId('observed-oppositions'),
			EQUATION_RANGE,
			'ahead of the mean place (°)',
			() => this.drawOppositions()
		);
		this.arcs = longitudePlot(byId('observed-arcs'), ARC_RANGE, 'arc (°)', () => this.drawArcs());
	},

	drawOppositions() {
		const p = this.oppositions;

		if (!this.points) {
			return;
		}

		p.frame();
		p.hline(0, { color: COL.ink, width: 1 });
		this.points.forEach(point => p.marker(point.lon, point.q, { color: COL.planet, radius: 4.5 }));
	},

	drawArcs() {
		const p = this.arcs;

		if (!this.loops) {
			return;
		}

		p.frame();
		this.loops.forEach(loop => p.marker(loop.lon, loop.arc, { color: COL.planet, radius: 4.5 }));
	}
};

/* ==========================================================================
   2. FIGURE 2: THE DEFERENT AND THE EQUANT
   (a) the model fitted on this page at the chosen date, seen from the
   north ecliptic pole: the Earth O, the centre C and the equant Q on the
   line to the apogee A; the deferent with K's place at every 1/24 of a
   turn of the mean longitude (equal angles at Q); the uniform line QK and
   the angle M at Q; the epicycle and the planet P, the line of sight, the
   mean Sun's direction, and P's path over the last synodic period.
   (b) the distance OK against M, with the eccentric that has the same
   directions (C at Q) dashed. The date slider runs over the sixteen years
   of the fit.
   ========================================================================== */

/* Play at page 4.1's speed: a synodic period, one loop, in about twenty
   seconds, slow enough to follow K, P and the line QK. */
const EQUANT_DAYS_PER_SECOND = 40;

/* The room around the drawing (units of the deferent's radius): the
   farthest the planet goes, 1 + e + r, and the labels. */
const EQUANT_REACH = 1 + EQUANT.e + EQUANT.r + 0.14;

/* Radius of the angle M at Q (units of the deferent's radius), the step
   of the path (days) and the length of a tick on the deferent. */
const M_ARC_RADIUS = 0.16;
const PATH_STEP = 2;
const TICK_HALF = 0.035;

/* The scale of panel (b): OK from 1 - 2e to 1 + 2e (the eccentric with
   the same directions), 0.799 to 1.201 (tools/numbers/4.2-equant.js). */
const DISTANCE_RANGE = [0.75, 1.25];

const equantFigure = {
	plot: null,
	state: null,
	labels: new LabelPlacer(), // keeps the labels of one drawing apart

	init() {
		squareCanvas(this, byId('equant-canvas'), 420, 10);

		this.plot = new Plot2D(byId('distance-plot'), {
			x: [0, 360],
			y: DISTANCE_RANGE,
			xLabel: 'mean anomaly M (°)',
			yLabel: 'distance OK',
			xTicks: quarterTicks,
			aspect: 0.95,
			maxHeight: 440,
			margin: { top: 28 },
			onDraw: () => this.drawPlot()
		});

		wireSlider(
			byId('equant-day'),
			() => this.update(),
			value => dateYearText(FIT_START + Number(value))
		);
		wirePresets(byId('equant-day').closest('figure'));
		wirePlayButton(byId('equant-play'), byId('equant-day'), EQUANT_DAYS_PER_SECOND);
		this.update();
	},

	update() {
		const jd = FIT_START + readNumber('equant-day');
		const now = PlanetEquant.state(EQUANT, jd);

		this.state = { jd, now, parts: PlanetEquant.construction(EQUANT, now), path: this.path(jd) };
		this.showReadout();
		this.draw();
		this.plot.redraw();
	},

	/* The planet's places over the synodic period before jd. */
	path(jd) {
		const period = 360 / (N_SUN - N_MARS);
		const points = [];

		for (let t = jd - period; t <= jd + 1e-9; t += PATH_STEP) {
			points.push(PlanetEquant.construction(EQUANT, PlanetEquant.state(EQUANT, t)).planet);
		}

		return points;
	},

	showReadout() {
		const { jd, now } = this.state;

		showLines('equant-readout', [
			`\\text{${dateYearText(jd)}:}\\quad \\bar\\lambda = ${fixedAngle(now.meanLongitude, 1)}^\\circ,\\quad M = ${fixedAngle(now.M, 1)}^\\circ`,
			`q = ${texSigned(now.q, 2)},\\quad \\rho = \\text{OK} = ${fixed(now.rho, 3)}`,
			`\\mu = ${fixedAngle(now.mu, 1)}^\\circ,\\quad \\eta = ${texSigned(now.eta, 2)}`,
			`\\lambda = \\bar\\lambda + q + \\eta = ${fixedAngle(now.lambda, 1)}^\\circ`
		]);
	},

	/* Panel (a). */
	draw() {
		if (!this.state) {
			return;
		}

		const ctx = this.ctx;
		const { now, parts, path } = this.state;
		const r = EQUANT.r;

		this.scale = this.R / EQUANT_REACH;

		const at = point => ({ x: this.cx + this.scale * point[0], y: this.cy - this.scale * point[1] });
		const O = at([0, 0]);
		const C = at(parts.C);
		const Q = at(parts.Q);
		const K = at(parts.K);
		const P = at(parts.planet);
		const edge = this.scale * (1 + EQUANT.e + r);

		ctx.clearRect(0, 0, this.width, this.width);
		this.labels.begin({ x0: 0, y0: 0, x1: this.width, y1: this.width });

		// the direction of gamma, the line of the apsides through O, C and Q,
		// the deferent about C, and the mean Sun's direction
		segment(ctx, O, towards(O, 0, edge), { color: COL.muted, width: 1 });
		segment(
			ctx,
			towards(O, now.apogee + 180, this.scale * (1 - EQUANT.e)),
			towards(O, now.apogee, this.scale * (1 + 2 * EQUANT.e)),
			{
				color: COL.muted,
				width: 1,
				dash: [2, 4]
			}
		);
		circle(ctx, C, this.scale, { color: COL.deferent, width: 2 });
		this.drawTicks(at, now.apogee);
		segment(ctx, O, towards(O, now.sun, edge), { color: COL.sun, width: 1.5, dash: [6, 4] });

		// the path of P over the last synodic period
		ctx.strokeStyle = withAlpha(COL.planet, 0.35);
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		path.map(at).forEach((q, i) => (i === 0 ? ctx.moveTo(q.x, q.y) : ctx.lineTo(q.x, q.y)));
		ctx.stroke();

		// the uniform line QK and the angle M at Q; the epicycle, its
		// radius to P and the line of sight
		segment(ctx, Q, K, { color: COL.ink, width: 1.2 });
		screenArc(ctx, Q, M_ARC_RADIUS * this.scale, now.apogee, now.apogee + now.M, { color: COL.ink, width: 1.5 });
		circle(ctx, K, r * this.scale, { color: COL.epicycle, width: 2 });
		segment(ctx, K, P, { color: COL.epicycle, width: 1.8 });
		segment(ctx, O, towards(O, now.lambda, edge), { color: COL.planet, width: 1.5 });

		drawDot(ctx, O.x, O.y, 6, COL.earth);
		drawDot(ctx, C.x, C.y, 3, COL.ink);
		drawDot(ctx, Q.x, Q.y, 3.5, COL.ink);
		drawDot(ctx, K.x, K.y, 3.5, COL.ink);
		drawDot(ctx, P.x, P.y, 6.5, COL.planet);
		this.drawLabels({ O, C, Q, K, P }, now, edge);
	},

	/* K's place at every 1/24 of a turn of the mean longitude: equal
	   angles at Q, unequal arcs of the deferent. */
	drawTicks(at, apogee) {
		const o = PlanetEquant.offsets(EQUANT);
		const C = [o.centre * cos(apogee), o.centre * sin(apogee)];

		for (let M = 0; M < 360; M += 15) {
			const local = PlanetEquant.centreOfEpicycle(M, o.centre, o.equant);
			const lon = apogee + atan2d(local[1], local[0] - o.centre); // seen from C
			const inner = [C[0] + (1 - TICK_HALF) * cos(lon), C[1] + (1 - TICK_HALF) * sin(lon)];
			const outer = [C[0] + (1 + TICK_HALF) * cos(lon), C[1] + (1 + TICK_HALF) * sin(lon)];

			segment(this.ctx, at(inner), at(outer), { color: COL.deferent, width: 1.5 });
		}
	},

	/* The labels: single letters and symbols, never words, which would
	   jump from side to side as the points turn (CLAUDE.md). O, C and Q
	   take the two sides of the line of the apsides alternately. */
	drawLabels(points, now, edge) {
		const ctx = this.ctx;
		const { O, C, Q, K, P } = points;
		const side = now.apogee + 90;

		centredLabel(ctx, 'γ', towards(O, 0, edge + 12), COL.muted, this.labels);
		centredLabel(ctx, '☉', towards(O, now.sun, edge + 12), COL.sun, this.labels);
		centredLabel(ctx, 'A', towards(O, now.apogee, this.scale * (1 + 2 * EQUANT.e) + 12), COL.muted, this.labels);
		centredLabel(
			ctx,
			'M',
			towards(Q, now.apogee + now.M / 2, M_ARC_RADIUS * this.scale + 10),
			COL.ink,
			this.labels
		);
		labelOutside(ctx, 'O', O, 7, side + 180, COL.earth, this.labels);
		labelOutside(ctx, 'C', C, 4, side, COL.ink, this.labels);
		labelOutside(ctx, 'Q', Q, 4, side + 180, COL.ink, this.labels);
		labelOutside(
			ctx,
			'K',
			K,
			4,
			clearestDirection([now.meanLongitude + 180, now.centreLongitude, now.sun]),
			COL.ink,
			this.labels
		);
		labelOutside(
			ctx,
			'P',
			P,
			7,
			clearestDirection([now.sun + 180, now.lambda + 180, now.lambda]),
			COL.planet,
			this.labels
		);
	},

	/* Panel (b). */
	drawPlot() {
		if (!this.state) {
			return;
		}

		const p = this.plot;
		const o = PlanetEquant.offsets(EQUANT);

		p.frame();
		p.hline(1, { color: COL.ink, width: 1 });
		nameAbove(p, 'apogee', 0);
		nameAbove(p, 'perigee', 180);
		nameAbove(p, 'apogee', 360);
		p.fn(M => PlanetEquant.zodiacal(M, o.equant, o.equant).distance, {
			color: COL.muted,
			width: 1.5,
			dash: [6, 5]
		});
		p.fn(M => PlanetEquant.zodiacal(M, o.centre, o.equant).distance, { color: COL.deferent, width: 2.4 });
		p.marker(this.state.now.M, this.state.now.rho, { color: COL.deferent, radius: 5 });
	}
};

/* ==========================================================================
   3. FIGURE 3: THE EQUANT AND KEPLER'S ELLIPSE
   (a) the deferent (centre C) and Kepler's ellipse with the same e
   (semi-major axis 1, centre C, foci O and Q), apogee to the right; K on
   the circle at the mean anomaly M by the equant, K' on the ellipse by
   the area law; the lines from Q to both. (b) the direction of K seen
   from O less that of K', and the same for page 2.1's eccentric (OC =
   2e), against M. Two views: e = 0.3, exaggerated, and Mars. The scale
   of (b) changes only with the view: up to 135' and 468' at 0.3, 10.5'
   and 31.4' for Mars (tools/numbers/4.2-equant.js).
   ========================================================================== */

const KEPLER_VIEWS = {
	'e = 0.3': { e: 0.3, y: [-500, 500] },
	Mars: { e: EQUANT.e, y: [-35, 35] }
};
const KEPLER_DEGREES_PER_SECOND = 40;
const KEPLER_REACH = 1.22;

const keplerFigure = {
	plot: null,
	view: 'e = 0.3',
	labels: new LabelPlacer(),

	init() {
		const figure = byId('kepler-canvas').closest('figure');

		squareCanvas(this, byId('kepler-canvas'), 420, 10);

		this.plot = new Plot2D(byId('kepler-plot'), {
			x: [0, 360],
			y: KEPLER_VIEWS[this.view].y,
			xLabel: 'mean anomaly M (°)',
			yLabel: 'difference (′)',
			xTicks: quarterTicks,
			aspect: 0.95,
			maxHeight: 440,
			margin: { top: 28 },
			onDraw: () => this.drawPlot()
		});

		wireSlider(
			byId('kepler-m'),
			() => this.update(),
			value => `${fixed(Number(value), 1)}°`
		);
		wirePresets(figure);
		wirePlayButton(byId('kepler-play'), byId('kepler-m'), KEPLER_DEGREES_PER_SECOND);
		buildChoice(byId('kepler-views'), Object.keys(KEPLER_VIEWS), this.view, name => this.choose(name));
		this.choose(this.view);
	},

	/* A view: its e and the scale of (b) (CLAUDE.md: a view the reader
	   chooses may change a scale). */
	choose(name) {
		this.view = name;
		this.plot.setRange([0, 360], KEPLER_VIEWS[name].y);
		this.update();
	},

	update() {
		const e = KEPLER_VIEWS[this.view].e;
		const M = readNumber('kepler-m');
		const equant = PlanetEquant.zodiacal(M, e, 2 * e);
		const ellipse = PlanetEquant.kepler(M, e);

		this.state = { e, M, equant, ellipse, K: PlanetEquant.centreOfEpicycle(M, e, 2 * e) };
		showLines('kepler-readout', [
			`M = ${fixed(M, 1)}^\\circ:\\quad q_\\text{equant} = ${texSigned(equant.q, 2)},\\quad q_\\text{ellipse} = ${texSigned(ellipse.q, 2)}`,
			`q_\\text{equant} - q_\\text{ellipse} = ${signed(60 * (equant.q - ellipse.q), 1).replace('−', '-')}'`,
			`\\text{OK} = ${fixed(equant.distance, 4)},\\quad \\text{OK}' = ${fixed(ellipse.distance, 4)}`
		]);
		this.draw();
		this.plot.redraw();
	},

	/* Panel (a), centred on C, the apogee to the right. */
	draw() {
		if (!this.state) {
			return;
		}

		const ctx = this.ctx;
		const { e, M, K, ellipse } = this.state;
		const scale = this.R / KEPLER_REACH;
		const at = point => ({ x: this.cx + scale * (point[0] - e), y: this.cy - scale * point[1] });
		const O = at([0, 0]);
		const C = at([e, 0]);
		const Q = at([2 * e, 0]);
		const Kc = at(K);
		const Ke = at(ellipse.point);

		ctx.clearRect(0, 0, this.width, this.width);
		this.labels.begin({ x0: 0, y0: 0, x1: this.width, y1: this.width });

		// the line of the apsides, the circle and the ellipse
		segment(ctx, at([e - 1.08, 0]), at([e + 1.08, 0]), { color: COL.muted, width: 1, dash: [2, 4] });
		circle(ctx, C, scale, { color: COL.deferent, width: 2 });
		ctx.strokeStyle = COL.planet;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.ellipse(C.x, C.y, scale, scale * Math.sqrt(1 - e * e), 0, 0, TAU);
		ctx.stroke();

		// the lines from Q, the angle M at Q, and the points
		segment(ctx, Q, Kc, { color: COL.deferent, width: 1.4 });
		segment(ctx, Q, Ke, { color: COL.planet, width: 1.2, dash: [5, 4] });
		screenArc(ctx, Q, 0.25 * scale, 0, M, { color: COL.ink, width: 1.5 });
		drawDot(ctx, O.x, O.y, 6, COL.earth);
		drawDot(ctx, C.x, C.y, 3, COL.ink);
		drawDot(ctx, Q.x, Q.y, 3.5, COL.ink);
		drawDot(ctx, Kc.x, Kc.y, 5.5, COL.deferent);
		drawDot(ctx, Ke.x, Ke.y, 5, COL.planet);

		// the labels: letters only (CLAUDE.md)
		const outward = atan2d(K[1], K[0] - e);

		centredLabel(ctx, 'A', at([e + 1.15, 0]), COL.muted, this.labels);
		centredLabel(ctx, 'M', towards(Q, M / 2, 0.25 * scale + 10), COL.ink, this.labels);
		labelOutside(ctx, 'O', O, 7, 270, COL.earth, this.labels);
		labelOutside(ctx, 'C', C, 4, 90, COL.ink, this.labels);
		labelOutside(ctx, 'Q', Q, 4, 270, COL.ink, this.labels);
		labelOutside(ctx, 'K', Kc, 7, outward, COL.deferent, this.labels);
		labelOutside(ctx, 'K′', Ke, 7, outward + 180, COL.planet, this.labels);
	},

	/* Panel (b): the differences in arcminutes. */
	drawPlot() {
		if (!this.state) {
			return;
		}

		const p = this.plot;
		const e = this.state.e;
		const difference = centre => M =>
			60 * (PlanetEquant.zodiacal(M, centre, 2 * e).q - PlanetEquant.kepler(M, e).q);

		p.frame();
		p.hline(0, { color: COL.ink, width: 1 });
		nameAbove(p, 'apogee', 0);
		nameAbove(p, 'perigee', 180);
		nameAbove(p, 'apogee', 360);
		p.fn(difference(2 * e), { color: COL.muted, width: 1.5, dash: [6, 5] });
		p.fn(difference(e), { color: COL.deferent, width: 2.4 });
		p.marker(this.state.M, difference(e)(this.state.M), { color: COL.deferent, radius: 5 });
	}
};

/* ==========================================================================
   4. FIGURE 4: THE FIT OF THE CENTRE
   (a) the eight oppositions to the mean Sun of 2010 - 2025, each as its
   ecliptic longitude less the mean longitude of the separate fit, with
   the model's zodiacal equation; (b) the eight loops of those years with
   the model's loops; both against the ecliptic longitude. The slider
   moves the centre C from O to Q; OQ, r, the apogee and L0 stay at the
   separate fit (MARS_SEPARATE), so a control moves only what the section
   is about. The scales hold every OC of the slider.
   ========================================================================== */

/* The apogee in the middle of the fit, 2018. */
const FIT_APOGEE = PlanetEquant.apogeeAt(SEPARATE, Time.julianDay(2018, 1, 1));

const fitFigure = {
	init() {
		const figure = byId('fit-oc').closest('figure');

		this.oppositions = meanOppositions()
			.filter(jd => jd >= FIT_START)
			.map(jd => ({ jd, lon: marsLongitude(jd) }));
		this.loops = marsLoops().filter(loop => loop.middle >= FIT_START);
		this.directions = longitudePlot(byId('fit-directions'), EQUATION_RANGE, 'ahead of the mean place (°)', () =>
			this.drawDirections()
		);
		this.arcs = longitudePlot(byId('fit-arcs'), FIT_ARC_RANGE, 'arc (°)', () => this.drawArcs());

		wireSlider(
			byId('fit-oc'),
			() => this.update(),
			value => fixed(Number(value), 3)
		);
		wirePresets(figure);
		this.update();
	},

	/* The separate fit with the centre of the slider. */
	parameters() {
		return Object.assign({}, SEPARATE, { centre: readNumber('fit-oc') });
	},

	update() {
		const parameters = this.parameters();
		const { centre, equant, r } = parameters;
		const curves = modelLoops(centre, equant, r, FIT_APOGEE);
		const qs = [];

		for (let M = 0; M <= 360; M += 5) {
			qs.push(PlanetEquant.zodiacal(M, centre, equant).q);
		}

		// the residuals at the observations of 2010 - 2025
		const directions = this.oppositions.map(o =>
			norm180(PlanetEquant.state(parameters, o.jd).centreLongitude - o.lon)
		);
		const arcs = this.loops.map(
			loop =>
				PlanetEquant.loopAt(PlanetEquant.state(parameters, loop.middle).M, centre, equant, r, N_MARS, N_SUN)
					.arc - loop.arc
		);
		const rms = list => Math.sqrt(list.reduce((sum, x) => sum + x * x, 0) / list.length);

		this.state = { parameters, curves, qs };
		showLines('fit-readout', [
			`\\text{OC} = ${fixed(centre, 3)} = ${fixed(centre / equant, 2)}\\,\\text{OQ},\\quad \\text{OQ} = ${fixed(equant, 3)}`,
			`\\text{rms: loops } ${fixed(rms(arcs), 1)}^\\circ,\\quad \\text{oppositions } ${fixed(60 * rms(directions), 0)}'`
		]);
		this.directions.redraw();
		this.arcs.redraw();
	},

	drawDirections() {
		const p = this.directions;

		if (!this.state) {
			return;
		}

		const { parameters, curves, qs } = this.state;

		p.frame();
		p.hline(0, { color: COL.ink, width: 1 });
		wrappedCurve(p, curves.xs, qs, { color: COL.deferent, width: 2.2 });
		this.oppositions.forEach(o =>
			p.marker(o.lon, norm180(o.lon - PlanetEquant.state(parameters, o.jd).meanLongitude), {
				color: COL.planet,
				radius: 4.5
			})
		);
	},

	drawArcs() {
		const p = this.arcs;

		if (!this.state) {
			return;
		}

		p.frame();
		wrappedCurve(p, this.state.curves.xs, this.state.curves.arcs, { color: COL.deferent, width: 2.2 });
		this.loops.forEach(loop => p.marker(loop.lon, loop.arc, { color: COL.planet, radius: 4.5 }));
	}
};

/* ==========================================================================
   5. FIGURE 5: THE ERROR CURVE
   The equant fitted to 2010 - 2025 against the reference Mars, in
   degrees, with page 4.1's epicycle as a ghost; over four years,
   2016 - 2019, the sixteen years of the fit and two centuries; dots at
   the oppositions of 1986 - 2025 on spans of the fit or less. No slider
   changes a model, so the widget fits its scale to each span.
   ========================================================================== */

const errorFigure = {
	init() {
		const curve = new ErrorCurve(byId('error-mars'), {
			body: 'mars',
			start: Time.julianDay(2016, 1, 1),
			end: Time.julianDay(2020, 1, 1),
			spans: [
				{ label: '4 years', years: 4 },
				{ label: '16 years', years: 16 },
				{ label: '200 years', years: 200 }
			],
			units: 'deg',
			ghostButtons: false
		});

		curve.addGhost({
			label: "page 4.1's epicycle",
			short: "page 4.1's epicycle",
			color: COL.epicycle,
			fn: PlanetEpicycle.make(PlanetEpicycle.MARS_FIT)
		});
		curve.addModel({
			label: 'the equant, fitted to 2010–2025',
			short: 'equant',
			color: COL.deferent,
			fn: PlanetEquant.make(EQUANT)
		});
		curve.addMarks({
			label: 'the equant at the oppositions (spans of 16 years or less)',
			color: COL.deferent,
			fn: PlanetEquant.make(EQUANT),
			dates: marsLoops().map(loop => loop.middle),
			maxYears: 16.5
		});
	}
};

/* ==========================================================================
   6. FIGURE 6: THE LOOPS OF MARS AGAIN
   Static: page 4.1's Figure 5, (a) the arcs and (b) the time from each
   opposition to the mean Sun to the next, like the model's (the last, in
   2025, has none yet), against the ecliptic longitude of the opposition, with the equant's curves and
   page 4.1's single values faint and dashed. The scales are page 4.1's:
   the equant's arcs run from 11.2° to 19.8°, its intervals from 764 to
   809 days, the observed ones from 764.6 to 809.6
   (tools/numbers/4.2-equant.js).
   ========================================================================== */

/* Page 4.1's loop and synodic period. */
const MOTIONS_41 = PlanetEpicycle.motions(PlanetEpicycle.MARS_FIT);
const LOOP_41 = PlanetEpicycle.loop(PlanetEpicycle.MARS_FIT.r, MOTIONS_41.n, MOTIONS_41.nMu);

/* The apogee in the middle of the forty years, 2006. */
const TEST_APOGEE = PlanetEquant.apogeeAt(EQUANT, Time.julianDay(2006, 1, 1));

const loopsFigure = {
	init() {
		const o = PlanetEquant.offsets(EQUANT);
		const oppositions = meanOppositions();

		// (a) a dot per loop; (b) a dot per interval between oppositions to
		// the mean Sun, like the model's, at the ecliptic longitude of the first
		this.arcDots = marsLoops().map(loop => ({ lon: loop.lon, value: loop.arc }));
		this.intervalDots = oppositions
			.slice(0, -1)
			.map((jd, i) => ({ lon: marsLongitude(jd), value: oppositions[i + 1] - jd }));
		this.curves = modelLoops(o.centre, o.equant, EQUANT.r, TEST_APOGEE, true);
		this.arcs = longitudePlot(byId('test-arcs'), ARC_RANGE, 'arc (°)', () =>
			this.draw(this.arcs, this.arcDots, this.curves.arcs, LOOP_41.arc)
		);
		this.intervals = longitudePlot(byId('test-intervals'), INTERVAL_RANGE, 'days', () =>
			this.draw(this.intervals, this.intervalDots, this.curves.intervals, 360 / MOTIONS_41.nMu)
		);
	},

	/* One panel: page 4.1's value, the equant's curve, the dots. */
	draw(p, dots, curve, simple) {
		if (!this.curves) {
			return;
		}

		p.frame();
		p.hline(simple, { color: COL.epicycle, width: 1.5, dash: [6, 5], alpha: 0.6 });
		wrappedCurve(p, this.curves.xs, curve, { color: COL.deferent, width: 2.2 });
		dots.forEach(dot => p.marker(dot.lon, dot.value, { color: COL.planet, radius: 4.5 }));
	}
};

/* ==========================================================================
   7. PAGE START
   Shared components first (they typeset the prose), then the figures.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
	Site.initPage();
	startFigures([observedFigure, equantFigure, keplerFigure, fitFigure, errorFigure, loopsFigure]);
});
