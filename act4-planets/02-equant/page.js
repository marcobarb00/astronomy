// @ts-check
/* ==========================================================================
   PAGE 4.2 · THE EQUANT - SCRIPT (page.js)
   Eight figures, each with its own init and draw (and update when it has
   controls):
	 1. the oppositions and the loops  (2D, static: Mars at its oppositions
										to the mean Sun, and its arcs of
										retrogradation, 1986 - 2025)
	 2. the equant's two jobs          (2D: (a) the deferent, C and Q,
										(b) the speed and (c) the distance of
										K against M; the centre OC)
	 3. the perpendiculars onto QK     (2D, static: the right triangles
										of the derivation of QK and rho)
	 4. the whole model                (2D: deferent, equant, epicycle and
										planet; date; views e = 0.2 and Mars)
	 5. the equant and the ellipse     (2D, static: (a) the deferent and
										Kepler's ellipse, (b) the differences
										in direction divided by e^2)
	 6. the fit of the centre          (2D: (a) the oppositions, (b) the
										loops of 2010 - 2025 with the model;
										the centre OC)
	 7. the equant against Mars        (error curve, fitted to 2010 - 2025,
										page 4.1's epicycle as ghost)
	 8. the loops of Mars again        (2D, static: arcs and intervals of
										1986 - 2025 with the equant's)
   Shared code: common.js, time.js, ephemeris.js, models/mean-sun.js,
   models/precession.js, models/planet-epicycle.js, models/planet-equant.js,
   plot2d.js, errorcurve.js, components.js.
   Every number quoted in the prose comes from tools/numbers/4.2-equant.js.

   TABLE OF CONTENTS
	 0. Helpers shared by the figures
	 1. Figure 1: the oppositions and the loops
	 2. Figure 2: the equant's two jobs
	 3. Figure 3: the perpendiculars onto QK
	 4. Figure 4: the whole model
	 5. Figure 5: the equant and Kepler's ellipse
	 6. Figure 6: the fit of the centre
	 7. Figure 7: the error curve
	 8. Figure 8: the loops of Mars again
	 9. Page start
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

/* A plot of a quantity against the ecliptic longitude of the opposition;
   'options' may change its size (Figure 1 stacks two wide plots). */
function longitudePlot(canvas, y, yLabel, onDraw, options = {}) {
	return new Plot2D(
		canvas,
		Object.assign(
			{
				x: [0, 360],
				y,
				xLabel: 'ecliptic longitude of the opposition (°)',
				yLabel,
				xTicks: quarterTicks,
				aspect: 0.75,
				maxHeight: 360,
				onDraw
			},
			options
		)
	);
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
   longitude of the opposition, one above the other on the same axis, so
   that the dotted lines through both, where the dots of (a) change sign
   (near 149° and 333°, tools/numbers/4.2-equant.js), meet the longest and
   the shortest loops.
   ========================================================================== */

/* The two stacked plots: wide and low. */
const STACKED_PLOT = { aspect: 0.3, maxHeight: 280, minHeight: 200 };

const observedFigure = {
	init() {
		const fit41 = PlanetEpicycle.MARS_FIT;

		this.points = meanOppositions().map(jd => {
			const lon = marsLongitude(jd);

			return { lon, q: norm180(lon - (fit41.L0 + fit41.n * (jd - fit41.epoch))) };
		});
		this.crossings = this.signChanges(this.points);
		this.loops = marsLoops();
		this.oppositions = longitudePlot(
			byId('observed-oppositions'),
			EQUATION_RANGE,
			'ahead of the mean place (°)',
			() => this.drawOppositions(),
			STACKED_PLOT
		);
		this.arcs = longitudePlot(byId('observed-arcs'), ARC_RANGE, 'arc (°)', () => this.drawArcs(), STACKED_PLOT);
	},

	/* The ecliptic longitudes where the dots change sign: between two
	   neighbours in longitude (the last and the first included), by linear
	   interpolation, as the numbers script does. */
	signChanges(points) {
		const sorted = points.slice().sort((a, b) => a.lon - b.lon);
		const found = [];

		sorted.forEach((point, i) => {
			const next = sorted[(i + 1) % sorted.length];
			const span = norm360(next.lon - point.lon);

			if (point.q * next.q < 0) {
				found.push(norm360(point.lon + (span * point.q) / (point.q - next.q)));
			}
		});

		return found;
	},

	/* The dotted lines at the sign changes, through both plots. */
	drawCrossings(p) {
		this.crossings.forEach(x => p.vline(x, { color: COL.muted, width: 1.2, dash: [2, 4] }));
	},

	drawOppositions() {
		const p = this.oppositions;

		if (!this.points) {
			return;
		}

		p.frame();
		p.hline(0, { color: COL.ink, width: 1 });
		this.drawCrossings(p);
		this.points.forEach(point => p.marker(point.lon, point.q, { color: COL.planet, radius: 4.5 }));
	},

	drawArcs() {
		const p = this.arcs;

		if (!this.loops) {
			return;
		}

		p.frame();
		this.drawCrossings(p);
		this.loops.forEach(loop => p.marker(loop.lon, loop.arc, { color: COL.planet, radius: 4.5 }));
	}
};

/* ==========================================================================
   2. FIGURE 2: THE EQUANT'S TWO JOBS
   (a) the deferent alone, seen from the north ecliptic pole with the
   apogee A to the right: the Earth O, the centre C and the equant Q; rays
   from Q at equal steps of M, ending at K's places on the circle; and K
   at M = 60° with the triangle O Q K of the text and the angle M at Q.
   (b) the speed of K seen from O, in units of n, against M, exact, with
   its first-order curve n (1 - OQ cos M) dashed; (c) the distance OK
   against M, exact. The slider moves C from O to Q with OQ fixed at 0.2
   (Ptolemy's 12 in 60), so it changes only what the section is about:
   the distance, not the speed. Fixed scales for every OC of the slider:
   speed 0.80 to 1.25 n, OK 0.80 to 1.20 (tools/numbers/4.2-equant.js).
   ========================================================================== */

const JOBS_OQ = 0.2;
const JOBS_M = 60;

/* The drawing is centred halfway between O and Q, so that it stays put
   while C moves; its half-span holds the circle and the label of A. */
const JOBS_REACH = 1.3;

/* The angle M at Q (px), and the half-length of a tick on the circle
   (units of the radius). */
const JOBS_ARC = 22;
const JOBS_TICK = 0.035;

const JOBS_SPEED_RANGE = [0.75, 1.3];
const JOBS_DISTANCE_RANGE = [0.75, 1.25];

/* The speed of K seen from O at the mean anomaly M (deg), in units of n:
   d(M + q)/dM, by a central difference. */
function speedSeenFromEarth(M, centre, equant) {
	const h = 0.01;

	return (
		1 + (PlanetEquant.zodiacal(M + h, centre, equant).q - PlanetEquant.zodiacal(M - h, centre, equant).q) / (2 * h)
	);
}

const jobsFigure = {
	labels: new LabelPlacer(), // keeps the labels of one drawing apart
	centre: 0.1,

	init() {
		const plotOptions = {
			x: [0, 360],
			xLabel: 'mean anomaly M (°)',
			xTicks: quarterTicks,
			aspect: 0.5,
			maxHeight: 240,
			minHeight: 180,
			margin: { top: 26 }
		};

		squareCanvas(this, byId('jobs-canvas'), 400, 10);
		this.speed = new Plot2D(
			byId('jobs-speed'),
			Object.assign({}, plotOptions, {
				y: JOBS_SPEED_RANGE,
				yLabel: 'speed (n)',
				onDraw: () => this.drawSpeed()
			})
		);
		this.distance = new Plot2D(
			byId('jobs-distance'),
			Object.assign({}, plotOptions, {
				y: JOBS_DISTANCE_RANGE,
				yLabel: 'distance OK',
				onDraw: () => this.drawDistance()
			})
		);

		wireSlider(
			byId('jobs-oc'),
			() => this.update(),
			value => fixed(Number(value), 3)
		);
		wirePresets(byId('jobs-oc').closest('figure'));
		this.update();
	},

	update() {
		const OC = readNumber('jobs-oc');
		const OQ = JOBS_OQ;

		this.centre = OC;
		showLines('jobs-readout', [
			`\\text{OC} = ${fixed(OC, 3)} = ${fixed(OC / OQ, 2)}\\,\\text{OQ}`,
			`\\text{speed: } ${fixed(speedSeenFromEarth(0, OC, OQ), 3)}\\,n \\text{ to } ${fixed(speedSeenFromEarth(180, OC, OQ), 3)}\\,n`,
			`\\text{OK: } ${fixed(PlanetEquant.zodiacal(180, OC, OQ).distance, 3)} \\text{ to } ${fixed(PlanetEquant.zodiacal(0, OC, OQ).distance, 3)}`
		]);
		this.draw();
		this.speed.redraw();
		this.distance.redraw();
	},

	/* K on the circle at the mean anomaly M: [x, y], apogee along x. */
	pointK(M) {
		return PlanetEquant.centreOfEpicycle(M, this.centre, JOBS_OQ);
	},

	/* Panel (a). */
	draw() {
		const ctx = this.ctx;

		if (!ctx) {
			return;
		}

		const OC = this.centre;
		const OQ = JOBS_OQ;
		const scale = this.R / JOBS_REACH;
		const at = p => ({ x: this.cx + scale * (p[0] - OQ / 2), y: this.cy - scale * p[1] });
		const O = at([0, 0]);
		const C = at([OC, 0]);
		const Q = at([OQ, 0]);
		const A = at([OC + 1, 0]);
		const K = at(this.pointK(JOBS_M));

		ctx.clearRect(0, 0, this.width, this.width);
		this.labels.begin({ x0: 0, y0: 0, x1: this.width, y1: this.width });

		// the line of the apsides, the circle about C
		segment(ctx, at([OQ / 2 - JOBS_REACH, 0]), at([OQ / 2 + JOBS_REACH, 0]), {
			color: COL.muted,
			width: 1,
			dash: [2, 4]
		});
		circle(ctx, C, scale, { color: COL.deferent, width: 2 });

		// rays from Q at equal steps of M, and K's places where they meet
		// the circle, ticked across it
		for (let M = 0; M < 360; M += 15) {
			const local = this.pointK(M);
			const lon = atan2d(local[1], local[0] - OC); // seen from C
			const inner = [OC + (1 - JOBS_TICK) * cos(lon), (1 - JOBS_TICK) * sin(lon)];
			const outer = [OC + (1 + JOBS_TICK) * cos(lon), (1 + JOBS_TICK) * sin(lon)];

			segment(ctx, Q, at(local), { color: withAlpha(COL.muted, 0.45), width: 1 });
			segment(ctx, at(inner), at(outer), { color: COL.deferent, width: 1.8 });
		}

		// the triangle O Q K at M = 60°, and the angle M at Q
		segment(ctx, Q, K, { color: COL.ink, width: 1.8 });
		segment(ctx, O, K, { color: COL.ink, width: 1.2, dash: [4, 4] });
		screenArc(ctx, Q, JOBS_ARC, 0, JOBS_M, { color: COL.ink, width: 1.5 });

		drawDot(ctx, A.x, A.y, 3, COL.muted);
		drawDot(ctx, O.x, O.y, 6, COL.earth);
		drawDot(ctx, C.x, C.y, 3.5, COL.ink);
		drawDot(ctx, Q.x, Q.y, 3.5, COL.ink);
		drawDot(ctx, K.x, K.y, 4, COL.ink);

		// letters only; O, C and Q below the line at fixed sides, so that C
		// sitting on O or on Q never covers their letters
		labelOutside(ctx, 'O', O, 7, 225, COL.earth, this.labels);
		labelOutside(ctx, 'C', C, 4, 270, COL.ink, this.labels);
		labelOutside(ctx, 'Q', Q, 4, 315, COL.ink, this.labels);
		labelOutside(ctx, 'A', A, 4, -40, COL.muted, this.labels);
		labelOutside(ctx, 'K', K, 5, JOBS_M, COL.ink, this.labels);
		centredLabel(ctx, 'M', towards(Q, JOBS_M / 2, JOBS_ARC + 10), COL.ink, this.labels);
	},

	/* Panel (b): the speed, exact, and its first order dashed. */
	drawSpeed() {
		const p = this.speed;

		p.frame();
		p.hline(1, { color: COL.ink, width: 1 });
		nameAbove(p, 'apogee', 0);
		nameAbove(p, 'perigee', 180);
		nameAbove(p, 'apogee', 360);
		p.fn(M => 1 - JOBS_OQ * cos(M), { color: COL.muted, width: 1.5, dash: [6, 5] });
		p.fn(M => speedSeenFromEarth(M, this.centre, JOBS_OQ), { color: COL.deferent, width: 2.4 });
	},

	/* Panel (c): the distance, exact. */
	drawDistance() {
		const p = this.distance;

		p.frame();
		p.hline(1, { color: COL.ink, width: 1 });
		nameAbove(p, 'apogee', 0);
		nameAbove(p, 'perigee', 180);
		nameAbove(p, 'apogee', 360);
		p.fn(M => PlanetEquant.zodiacal(M, this.centre, JOBS_OQ).distance, { color: COL.deferent, width: 2.4 });
	}
};

/* ==========================================================================
   3. FIGURE 3: THE PERPENDICULARS ONTO QK
   Static, for the derivation of the first-order distance: two panels of
   the same part of the deferent, at offsets three times Mars' (OC = 0.3,
   OQ = 0.6) and M = 60°, so that the feet of the perpendiculars fall
   clearly behind Q. (a) the right triangle C H K, hypotenuse the radius
   CK = 1, short leg CQ sin M; (b) the right triangle O G K, hypotenuse
   OK = rho, short leg OQ sin M. Both drawn in the frame of the apsidal
   line, the apogee to the right.
   ========================================================================== */

const PERPENDICULAR_OFFSETS = { centre: 0.3, equant: 0.6 };
const PERPENDICULAR_M = 60;

/* The part of the plane shown (units of the deferent's radius): from
   just left of the Earth to the apogee, and up to K. */
const PERPENDICULAR_VIEW = { x0: -0.12, y0: -0.47, span: 1.5 };

/* The size of the right-angle mark and the radius of the angle M (px). */
const RIGHT_ANGLE_MARK = 9;
const PERPENDICULAR_ARC = 24;

const perpendicularFigure = {
	panels: [],

	init() {
		this.panels = [
			{ id: 'perp-centre', from: 'C', foot: 'H', hypotenuse: '1', leg: 'CQ sin M' },
			{ id: 'perp-earth', from: 'O', foot: 'G', hypotenuse: 'ρ', leg: 'OQ sin M' }
		].map(panel => {
			const owner = Object.assign({ labels: new LabelPlacer() }, panel);

			owner.draw = () => this.drawPanel(owner);
			squareCanvas(owner, byId(panel.id), 380, 10);
			owner.draw();

			return owner;
		});
	},

	/* The points of the construction, in the frame of the apsidal line:
	   O, C, Q, K, the apogee, and the foot of the perpendicular from O or C
	   onto the line QK (its signed distance from Q along QK is the
	   component of QC or QO along it, -CQ cos M or -OQ cos M). */
	points(from) {
		const { centre, equant } = PERPENDICULAR_OFFSETS;
		const M = PERPENDICULAR_M;
		const u = [cos(M), sin(M)];
		const QK = PlanetEquant.equantDistance(M, centre, equant);
		const Q = [equant, 0];
		const start = from === 'C' ? [centre, 0] : [0, 0];
		const along = (start[0] - Q[0]) * u[0] + (start[1] - Q[1]) * u[1];

		return {
			O: [0, 0],
			C: [centre, 0],
			Q,
			K: [Q[0] + QK * u[0], Q[1] + QK * u[1]],
			A: [centre + 1, 0],
			start,
			foot: [Q[0] + along * u[0], Q[1] + along * u[1]],
			beyond: [Q[0] + (along - 0.04) * u[0], Q[1] + (along - 0.04) * u[1]]
		};
	},

	drawPanel(owner) {
		const ctx = owner.ctx;

		if (!ctx) {
			return;
		}

		const view = PERPENDICULAR_VIEW;
		const scale = (2 * owner.R) / view.span;
		const left = owner.cx - owner.R;
		const top = owner.cy - owner.R;
		const at = p => ({ x: left + scale * (p[0] - view.x0), y: top + scale * (view.y0 + view.span - p[1]) });
		const p = this.points(owner.from);
		const pt = Object.fromEntries(Object.entries(p).map(([name, value]) => [name, at(value)]));
		const M = PERPENDICULAR_M;

		ctx.clearRect(0, 0, owner.width, owner.width);
		owner.labels.begin({ x0: 0, y0: 0, x1: owner.width, y1: owner.width });
		ctx.save();
		ctx.beginPath();
		ctx.rect(0, 0, owner.width, owner.width);
		ctx.clip();

		// the deferent about C, faint where it is not part of the triangle,
		// and the line of the apsides through O, C and Q to the apogee
		ctx.globalAlpha = owner.from === 'C' ? 1 : 0.45;
		circle(ctx, pt.C, scale, { color: COL.deferent, width: 2 });
		ctx.globalAlpha = 1;
		segment(ctx, at([view.x0, 0]), pt.A, { color: COL.muted, width: 1, dash: [2, 4] });

		// the right triangle, shaded
		ctx.fillStyle = withAlpha(COL.epicycle, 0.12);
		ctx.beginPath();
		ctx.moveTo(pt.start.x, pt.start.y);
		ctx.lineTo(pt.foot.x, pt.foot.y);
		ctx.lineTo(pt.K.x, pt.K.y);
		ctx.closePath();
		ctx.fill();

		// the line QK, carried back beyond Q to the foot; the perpendicular,
		// the hypotenuse and the right angle; the angle M at Q
		segment(ctx, pt.Q, pt.K, { color: COL.ink, width: 1.6 });
		segment(ctx, pt.beyond, pt.Q, { color: COL.ink, width: 1.2, dash: [4, 4] });
		segment(ctx, pt.start, pt.foot, { color: COL.epicycle, width: 2.2 });
		segment(ctx, pt.start, pt.K, { color: COL.planet, width: 2.2 });
		this.drawRightAngle(ctx, pt);
		screenArc(ctx, pt.Q, PERPENDICULAR_ARC, 0, M, { color: COL.ink, width: 1.5 });

		['O', 'C', 'Q', 'K', 'foot'].forEach(name => {
			const color = name === 'O' ? COL.earth : COL.ink;

			drawDot(ctx, pt[name].x, pt[name].y, name === 'O' ? 6 : 3.5, color);
		});
		drawDot(ctx, pt.A.x, pt.A.y, 3, COL.muted);
		ctx.restore();
		this.drawLabels(owner, pt);
	},

	/* The small square at the foot, between the line QK (towards K) and
	   the perpendicular (towards O or C). */
	drawRightAngle(ctx, pt) {
		const unit = (a, b) => {
			const length = Math.hypot(b.x - a.x, b.y - a.y);

			return { x: (b.x - a.x) / length, y: (b.y - a.y) / length };
		};
		const along = unit(pt.foot, pt.K);
		const across = unit(pt.foot, pt.start);
		const s = RIGHT_ANGLE_MARK;
		const corner = { x: pt.foot.x + s * (along.x + across.x), y: pt.foot.y + s * (along.y + across.y) };

		ctx.strokeStyle = COL.ink;
		ctx.lineWidth = 1.2;
		ctx.setLineDash([]);
		ctx.beginPath();
		ctx.moveTo(pt.foot.x + s * along.x, pt.foot.y + s * along.y);
		ctx.lineTo(corner.x, corner.y);
		ctx.lineTo(pt.foot.x + s * across.x, pt.foot.y + s * across.y);
		ctx.stroke();
	},

	/* Static labels: the points, the angle M, the short leg on the side
	   away from the triangle, the hypotenuse on its outer side. */
	drawLabels(owner, pt) {
		const ctx = owner.ctx;
		const M = PERPENDICULAR_M;
		const middle = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
		const screenAngle = (a, b) => atan2d(a.y - b.y, b.x - a.x); // counted anticlockwise
		const hypotenuse = screenAngle(pt.start, pt.K);
		const outward = [hypotenuse - 90, hypotenuse + 90].find(a => {
			const m = middle(pt.start, pt.K);
			const probe = towards(m, a, 10);

			return Math.hypot(probe.x - pt.foot.x, probe.y - pt.foot.y) > Math.hypot(m.x - pt.foot.x, m.y - pt.foot.y);
		});

		labelOutside(ctx, 'O', pt.O, 7, 270, COL.earth, owner.labels);
		labelOutside(ctx, 'C', pt.C, 4, 270, COL.ink, owner.labels);
		labelOutside(ctx, 'Q', pt.Q, 4, 270, COL.ink, owner.labels);
		labelOutside(ctx, 'A', pt.A, 4, -40, COL.muted, owner.labels);
		labelOutside(ctx, 'K', pt.K, 4, M, COL.ink, owner.labels);
		labelOutside(ctx, owner.foot, pt.foot, 4, M - 90, COL.ink, owner.labels);
		centredLabel(ctx, 'M', towards(pt.Q, M / 2, PERPENDICULAR_ARC + 10), COL.ink, owner.labels);
		labelOutside(ctx, owner.leg, middle(pt.start, pt.foot), 4, M + 180, COL.epicycle, owner.labels, 'symbol');
		labelOutside(ctx, owner.hypotenuse, middle(pt.start, pt.K), 4, outward, COL.planet, owner.labels, 'symbol');
	}
};

/* ==========================================================================
   4. FIGURE 4: THE WHOLE MODEL
   The model fitted on this page at the chosen date, seen from the north
   ecliptic pole: the Earth O, the centre C and the equant Q on the line
   to the apogee A; the deferent, the uniform line QK, the line OK dashed
   and the angle M at Q; the epicycle and the planet P, the line of sight,
   the mean Sun's direction, and P's path over the last synodic period.
   The button "an opposition" sets the date when K is opposite the mean
   Sun, where P lies on OK. The date slider runs over the sixteen years of
   the fit; two views, e = 0.2 and Mars.
   ========================================================================== */

/* Play at page 4.1's speed: a synodic period, one loop, in about twenty
   seconds, slow enough to follow K, P and the line QK. */
const EQUANT_DAYS_PER_SECOND = 40;

/* Radius of the angle M at Q (units of the deferent's radius) and the
   step of the path (days). */
const M_ARC_RADIUS = 0.16;
const PATH_STEP = 2;

/* The date of the "an opposition" button is searched for near this day of
   the slider (May 2016), in each view's own model. */
const OPPOSITION_NEAR = 2333;

/* Two views: e = 0.2, twice Mars', where O, C and Q stand apart (the
   loops stay at both apsides; at 0.25 they vanish at the perigee), and
   Mars fitted on this page. The drawing's room is the farthest the
   planet goes, 1 + e + r, and the labels. */
const EQUANT_VIEWS = {
	'e = 0.2': { e: 0.2 },
	Mars: { e: EQUANT.e }
};

const planetFigure = {
	state: null,
	labels: new LabelPlacer(), // keeps the labels of one drawing apart

	view: 'e = 0.2',
	params: null,

	init() {
		squareCanvas(this, byId('planet-canvas'), 420, 10);
		this.params = this.parametersOf(this.view);

		wireSlider(
			byId('planet-day'),
			() => this.update(),
			value => dateYearText(FIT_START + Number(value))
		);
		wirePresets(byId('planet-day').closest('figure'));
		wirePlayButton(byId('planet-play'), byId('planet-day'), EQUANT_DAYS_PER_SECOND);
		buildChoice(byId('planet-views'), Object.keys(EQUANT_VIEWS), this.view, name => this.choose(name));
		this.choose(this.view);
	},

	/* The day of the slider when the view's model has K opposite the mean
	   Sun, near OPPOSITION_NEAR: there P lies on the line OK. */
	oppositionDay() {
		const off = day => {
			const s = PlanetEquant.state(this.params, FIT_START + day);

			return norm180(s.centreLongitude - s.sun - 180);
		};

		return bisect(off, OPPOSITION_NEAR - 60, OPPOSITION_NEAR + 60, 40);
	},

	/* The fitted Mars with the eccentricity of a view. */
	parametersOf(name) {
		return Object.assign({}, EQUANT, { e: EQUANT_VIEWS[name].e });
	},

	/* A view: its e, and the date of its opposition for the button. */
	choose(name) {
		this.view = name;
		this.params = this.parametersOf(name);
		byId('planet-opposition').setAttribute('data-value', fixed(Math.round(4 * this.oppositionDay()) / 4, 2));
		this.update();
	},

	update() {
		const jd = FIT_START + readNumber('planet-day');
		const now = PlanetEquant.state(this.params, jd);

		this.state = { jd, now, parts: PlanetEquant.construction(this.params, now), path: this.path(jd) };
		this.showReadout();
		this.draw();
	},

	/* The planet's places over the synodic period before jd. */
	path(jd) {
		const period = 360 / (N_SUN - N_MARS);
		const points = [];

		for (let t = jd - period; t <= jd + 1e-9; t += PATH_STEP) {
			points.push(PlanetEquant.construction(this.params, PlanetEquant.state(this.params, t)).planet);
		}

		return points;
	},

	showReadout() {
		const { jd, now } = this.state;

		showLines('planet-readout', [
			`\\text{${dateYearText(jd)}:}\\quad \\bar\\lambda = ${fixedAngle(now.meanLongitude, 1)}^\\circ,\\quad M = ${fixedAngle(now.M, 1)}^\\circ`,
			`q = ${texSigned(now.q, 2)},\\quad \\rho = \\text{OK} = ${fixed(now.rho, 3)}`,
			`\\mu = ${fixedAngle(now.mu, 1)}^\\circ,\\quad \\eta = ${texSigned(now.eta, 2)}`,
			`\\lambda = \\bar\\lambda + q + \\eta = ${fixedAngle(now.lambda, 1)}^\\circ`
		]);
	},

	/* The drawing. */
	draw() {
		if (!this.state) {
			return;
		}

		const ctx = this.ctx;
		const { now, parts, path } = this.state;
		const r = this.params.r;

		this.scale = this.R / (1 + this.params.e + this.params.r + 0.14);

		const at = point => ({ x: this.cx + this.scale * point[0], y: this.cy - this.scale * point[1] });
		const O = at([0, 0]);
		const C = at(parts.C);
		const Q = at(parts.Q);
		const K = at(parts.K);
		const P = at(parts.planet);
		const edge = this.scale * (1 + this.params.e + r);

		ctx.clearRect(0, 0, this.width, this.width);
		this.labels.begin({ x0: 0, y0: 0, x1: this.width, y1: this.width });

		// the direction of gamma, the line of the apsides through O, C and Q,
		// the deferent about C, and the mean Sun's direction
		segment(ctx, O, towards(O, 0, edge), { color: COL.muted, width: 1 });
		segment(
			ctx,
			towards(O, now.apogee + 180, this.scale * (1 - this.params.e)),
			towards(O, now.apogee, this.scale * (1 + 2 * this.params.e)),
			{
				color: COL.muted,
				width: 1,
				dash: [2, 4]
			}
		);
		circle(ctx, C, this.scale, { color: COL.deferent, width: 2 });
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
		segment(ctx, O, K, { color: COL.ink, width: 1, dash: [3, 3] });
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

	/* The labels: single letters and symbols, never words, which would
	   jump from side to side as the points turn (CLAUDE.md). O, C and Q
	   take the two sides of the line of the apsides alternately. */
	drawLabels(points, now, edge) {
		const ctx = this.ctx;
		const { O, C, Q, K, P } = points;
		const side = now.apogee + 90;

		centredLabel(ctx, 'γ', towards(O, 0, edge + 12), COL.muted, this.labels);
		centredLabel(ctx, '☉', towards(O, now.sun, edge + 12), COL.sun, this.labels);
		centredLabel(
			ctx,
			'A',
			towards(O, now.apogee, this.scale * (1 + 2 * this.params.e) + 12),
			COL.muted,
			this.labels
		);
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
	}
};

/* ==========================================================================
   5. FIGURE 5: THE EQUANT AND KEPLER'S ELLIPSE
   Static. (a) the deferent (centre C) and Kepler's ellipse with the same
   e (semi-major axis 1, centre C, foci O and Q), drawn at e = 0.3 so that
   they differ, the apogee to the right; K on the circle at M = 45° by the
   equant, K' on the ellipse by the area law, and the lines from Q to
   both. (b) the direction of K seen from O less that of K', and the same
   for page 2.1's eccentric (OC = 2e), divided by e^2 (radians), against
   M: exact for Mars, solid, and the second-order terms -1/4 sin 2M and
   3/4 sin 2M, dashed. Exact for Mars the curves reach 0.303 and 0.906, so
   the scale is [-1, 1] (tools/numbers/4.2-equant.js).
   ========================================================================== */

const KEPLER_E = 0.3;
const KEPLER_M = 45;
const KEPLER_REACH = 1.22;
const KEPLER_RANGE = [-1, 1];

const keplerFigure = {
	plot: null,
	labels: new LabelPlacer(),

	init() {
		squareCanvas(this, byId('kepler-canvas'), 420, 10);

		this.plot = new Plot2D(byId('kepler-plot'), {
			x: [0, 360],
			y: KEPLER_RANGE,
			xLabel: 'mean anomaly M (°)',
			yLabel: 'difference ÷ e²',
			xTicks: quarterTicks,
			aspect: 0.95,
			maxHeight: 440,
			margin: { top: 28 },
			onDraw: () => this.drawPlot()
		});
		this.draw();
	},

	/* Panel (a), centred on C, the apogee to the right. */
	draw() {
		const ctx = this.ctx;

		if (!ctx) {
			return;
		}

		const e = KEPLER_E;
		const M = KEPLER_M;
		const scale = this.R / KEPLER_REACH;
		const at = point => ({ x: this.cx + scale * (point[0] - e), y: this.cy - scale * point[1] });
		const O = at([0, 0]);
		const C = at([e, 0]);
		const Q = at([2 * e, 0]);
		const K = PlanetEquant.centreOfEpicycle(M, e, 2 * e);
		const Kc = at(K);
		const ellipsePoint = PlanetEquant.kepler(M, e).point;
		const Ke = at(ellipsePoint);

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

		// the labels: letters only (CLAUDE.md); K outside the circle, K'
		// inside it, clear of the circle and of its line to Q
		const outward = atan2d(K[1], K[0] - e);
		const toQ = atan2d(-ellipsePoint[1], 2 * e - ellipsePoint[0]);

		centredLabel(ctx, 'A', at([e + 1.15, 0]), COL.muted, this.labels);
		centredLabel(ctx, 'M', towards(Q, M / 2, 0.25 * scale + 10), COL.ink, this.labels);
		labelOutside(ctx, 'O', O, 7, 270, COL.earth, this.labels);
		labelOutside(ctx, 'C', C, 4, 90, COL.ink, this.labels);
		labelOutside(ctx, 'Q', Q, 4, 270, COL.ink, this.labels);
		labelOutside(ctx, 'K', Kc, 7, outward, COL.deferent, this.labels);
		labelOutside(
			ctx,
			'K′',
			Ke,
			7,
			clearestDirection([outward, outward + 90, outward - 90, toQ]),
			COL.planet,
			this.labels
		);
	},

	/* Panel (b): the differences from the ellipse divided by e^2, exact
	   for Mars and to second order, with a word on each pair of curves. */
	drawPlot() {
		const p = this.plot;
		const e = EQUANT.e;
		const exact = centre => M =>
			(PlanetEquant.zodiacal(M, centre, 2 * e).q - PlanetEquant.kepler(M, e).q) / R2D / (e * e);

		p.frame();
		p.hline(0, { color: COL.ink, width: 1 });
		nameAbove(p, 'apogee', 0);
		nameAbove(p, 'perigee', 180);
		nameAbove(p, 'apogee', 360);
		p.fn(M => 0.75 * sin(2 * M), { color: COL.muted, width: 1.5, dash: [6, 5] });
		p.fn(M => -0.25 * sin(2 * M), { color: COL.deferent, width: 1.5, dash: [6, 5] });
		p.fn(exact(2 * e), { color: COL.muted, width: 2.4 });
		p.fn(exact(e), { color: COL.deferent, width: 2.4 });
		p.text('eccentric', 60, 0.8, { color: COL.muted, align: 'center', dx: 0 });
		p.text('equant', 135, 0.4, { color: COL.deferent, align: 'center', dx: 0 });
	}
};

/* ==========================================================================
   6. FIGURE 6: THE FIT OF THE CENTRE
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
   7. FIGURE 7: THE ERROR CURVE
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
   8. FIGURE 8: THE LOOPS OF MARS AGAIN
   Static: page 4.1's Figure 7, (a) the arcs and (b) the time from each
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
   9. PAGE START
   Shared components first (they typeset the prose), then the figures.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
	Site.initPage();
	startFigures([
		observedFigure,
		jobsFigure,
		perpendicularFigure,
		planetFigure,
		keplerFigure,
		fitFigure,
		errorFigure,
		loopsFigure
	]);
});
