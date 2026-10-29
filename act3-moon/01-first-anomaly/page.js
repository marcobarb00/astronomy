// @ts-check
/* ==========================================================================
   PAGE 3.1 · THE FIRST ANOMALY - SCRIPT (page.js)
   Six figures, each with its own init and draw (and update when it has
   controls):
	 1. the Moon's daily motion      (2D, static: the real Moon through
									   2026, with its full Moons)
	 2. the epicycle                 (2D: (a) the deferent and the epicycle
									   seen from the north ecliptic pole,
									   (b) q over two months; date and r/R)
	 3. the equivalent eccentric     (2D: the epicycle and the eccentric
									   drawn together; date)
	 4. three eclipses               (2D: (a) the three positions on the
									   epicycle, (b) the plane of X, Y with
									   the two equations; four data sets)
	 5. the fitted epicycle against the Moon (error curve, 2026)
	 6. Ptolemy's simple Moon        (error curve, AD 134 and 2000 years)
   Shared code: common.js, time.js, ephemeris.js, models/mean-sun.js,
   models/solar-eccentric.js, models/lunar-epicycle.js, plot2d.js,
   errorcurve.js, components.js.
   Every number quoted in the prose comes from
   tools/numbers/3.1-first-anomaly.js.

   TABLE OF CONTENTS
	 0. Helpers shared by the figures
	 1. Figure 1: the Moon's daily motion
	 2. Figure 2: the epicycle and the equation of anomaly
	 3. Figure 3: the epicycle and its eccentric
	 4. Figure 4: three eclipses
	 5. Figures 5 and 6: the error curves
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

/* The Moon's daily motion (deg a day) at JD(TT): the change of its
   longitude over the day centred on that moment. */
const moonMotion = jd => norm180(moonLongitude(jd + 0.5) - moonLongitude(jd - 0.5));

/* The moments (JD(TT)) in [from, to] when the Moon's elongation from
   the Sun reaches 'target' (0: new Moon, 180: full Moon): a scan every
   half day for the crossing, then bisection. */
function phases(target, from, to) {
	const off = jd => norm180(moonLongitude(jd) - sunLongitude(jd) - target);
	const found = [];

	for (let jd = from; jd < to; jd += 0.5) {
		if (off(jd) < 0 && off(jd + 0.5) >= 0) {
			found.push(bisect(off, jd, jd + 0.5, 30));
		}
	}

	return found;
}

/* The new and full Moons in [from, to], in time order:
   [{ jd, kind: 'new' | 'full' }]. */
function syzygies(from, to) {
	const news = phases(0, from, to).map(jd => ({ jd, kind: 'new' }));
	const fulls = phases(180, from, to).map(jd => ({ jd, kind: 'full' }));

	return news.concat(fulls).sort((a, b) => a.jd - b.jd);
}

/* First day of each month of YEAR, as a day index (0 = 1 January). */
const MONTH_STARTS = Time.MONTH_NAMES.map((name, i) => ({
	value: Time.julianDay(YEAR, i + 1, 1) - YEAR_START,
	label: name
}));

/* Ticks of a date axis over the year: every month when there is room,
   else every other. */
const monthTicks = (min, max, count) => MONTH_STARTS.filter((t, i) => count >= 8 || i % 2 === 0);

/* An angle with a sign in TeX: "+1.85^\circ", "-0.40^\circ". */
const texSigned = (degrees, digits = 2) => `${signed(degrees, digits).replace('−', '-')}^\\circ`;

/* The drawing of one moment of the epicycle (Figures 2 and 3): the
   Earth O at the centre of the canvas, x towards the vernal point. 'view'
   is set up by squareCanvas; view.scale is the deferent's radius (px).
   Returns the canvas points O, K (the centre of the epicycle), C (the
   centre of the equivalent eccentric) and the Moon. */
function epicyclePoints(view, s, e) {
	const parts = LunarEpicycle.construction(s, e);
	const at = point => ({ x: view.cx + view.scale * point[0], y: view.cy - view.scale * point[1] });

	return { O: at([0, 0]), K: at(parts.K), C: at(parts.C), moon: at(parts.moon) };
}

/* ==========================================================================
   1. FIGURE 1: THE MOON'S DAILY MOTION
   Static. The reference Moon's daily motion every quarter of a day of
   2026, the mean motion n, and a dot at each full Moon. Fixed scale 11.5
   to 15.5°/day (the motion ranges from 11.79 to 15.31°/day,
   tools/numbers/3.1-first-anomaly.js).
   ========================================================================== */

const MOTION_RANGE = [11.5, 15.5];

/* Samples per day of the curve. */
const MOTION_SAMPLES_PER_DAY = 4;

const motionFigure = {
	plot: null,

	init() {
		this.compute();

		this.plot = new Plot2D(byId('motion-plot'), {
			x: [0, DAYS_IN_YEAR],
			y: MOTION_RANGE,
			xLabel: `date (${YEAR})`,
			yLabel: 'daily motion (°)',
			xTicks: monthTicks,
			aspect: 0.42,
			onDraw: () => this.draw()
		});
	},

	/* The curve, from the longitudes every quarter of a day (one day on
	   either side of each sample), and the full Moons of the year. */
	compute() {
		const step = 1 / MOTION_SAMPLES_PER_DAY;
		const longitudes = [];
		const first = -MOTION_SAMPLES_PER_DAY;
		const last = DAYS_IN_YEAR * MOTION_SAMPLES_PER_DAY + MOTION_SAMPLES_PER_DAY;

		for (let i = first; i <= last; i++) {
			longitudes.push(moonLongitude(YEAR_START + i * step));
		}

		this.days = [];
		this.motion = [];

		for (let i = 0; i <= DAYS_IN_YEAR * MOTION_SAMPLES_PER_DAY; i++) {
			const centre = i - first;
			const half = MOTION_SAMPLES_PER_DAY / 2;

			this.days.push(i * step);
			this.motion.push(norm180(longitudes[centre + half] - longitudes[centre - half]));
		}

		this.fullMoons = phases(180, YEAR_START, YEAR_START + DAYS_IN_YEAR + 1).map(jd => ({
			day: jd - YEAR_START,
			motion: moonMotion(jd)
		}));
	},

	draw() {
		const p = this.plot;

		p.frame();
		p.hline(LunarEpicycle.MEEUS.n, { color: COL.muted, width: 1.5, dash: [6, 5] });
		p.curve(this.days, this.motion, { color: COL.planet, width: 2.2 });
		this.fullMoons.forEach(full => p.marker(full.day, full.motion, { color: COL.ink, radius: 4.5 }));
	}
};

/* ==========================================================================
   2. FIGURE 2: THE EPICYCLE AND THE EQUATION OF ANOMALY
   (a) the deferent and the epicycle of our fit (FIT_2026) with the ratio
   r/R of the slider, at the chosen moment: the mean direction from the
   Earth through K to the apogee of the epicycle, the Moon, the angles M
   (at K) and q (at the Earth). (b) q over the two months, exact and to
   first order, with the new and full Moons. The slider r/R runs from 0
   to 0.3 (it starts at 0.3, three and a half times Ptolemy's 0.0875, so
   that the angles can be seen); |q| stays under asin 0.3 = 17.46°: fixed
   scale +-18°.
   ========================================================================== */

const Q_RANGE = [-18, 18];

/* The two months of panel (b), from 1 January. */
const EPICYCLE_DAYS = 60;

/* Points per day of the curves of panel (b). */
const EPICYCLE_SAMPLES_PER_DAY = 4;

/* The largest r/R of the slider, and the room around the drawing (units
   of the deferent's radius) for the labels outside the epicycle. */
const EPICYCLE_E_MAX = 0.3;
const EPICYCLE_REACH = 1 + EPICYCLE_E_MAX + 0.12;

/* The Figure 2 date slider plays the two months in 12 seconds. */
const EPICYCLE_DAYS_PER_SECOND = 5;

/* Radii of the angle arcs: q at the Earth (units of the deferent's
   radius), M at K (units of the epicycle's radius, at least
   ANGLE_ARC_MIN px). */
const Q_ARC_RADIUS = 0.45;
const M_ARC_RADIUS = 0.45;
const ANGLE_ARC_MIN = 14;

const epicycleFigure = {
	plot: null,
	state: null,
	labels: new LabelPlacer(), // keeps the labels of one drawing apart

	init() {
		const figure = byId('epicycle-canvas').closest('figure');

		squareCanvas(this, byId('epicycle-canvas'), 420, 10);

		this.syzygies = syzygies(YEAR_START, YEAR_START + EPICYCLE_DAYS);

		this.plot = new Plot2D(byId('epicycle-plot'), {
			x: [0, EPICYCLE_DAYS],
			y: Q_RANGE,
			xLabel: `days from 1 January ${YEAR}`,
			yLabel: 'q (°)',
			aspect: 0.95,
			maxHeight: 440,
			margin: { top: 28 },
			onDraw: () => this.drawPlot()
		});

		wireSlider(
			byId('epi-day'),
			() => this.update(),
			value => dateHourText(YEAR_START + Number(value))
		);
		wireSlider(
			byId('epi-e'),
			() => this.update(),
			value => fixed(Number(value), 4)
		);
		wirePresets(figure);
		wirePlayButton(byId('epi-play'), byId('epi-day'), EPICYCLE_DAYS_PER_SECOND, {
			playLabel: 'Play two months'
		});

		this.update();
	},

	/* The parameters: our fit, with the ratio of the slider. */
	parameters() {
		return Object.assign({}, LunarEpicycle.FIT_2026, { e: readNumber('epi-e') });
	},

	update() {
		const parameters = this.parameters();
		const day = readNumber('epi-day');

		this.state = {
			parameters: parameters,
			day: day,
			now: LunarEpicycle.state(parameters, YEAR_START + day),
			curve: this.monthsCurve(parameters)
		};

		this.showReadout();
		this.draw();
		this.plot.redraw();
	},

	/* q over the two months, exact and to first order (deg). */
	monthsCurve(parameters) {
		const days = [];
		const exact = [];
		const firstOrder = [];

		for (let i = 0; i <= EPICYCLE_DAYS * EPICYCLE_SAMPLES_PER_DAY; i++) {
			const day = i / EPICYCLE_SAMPLES_PER_DAY;
			const s = LunarEpicycle.state(parameters, YEAR_START + day);

			days.push(day);
			exact.push(s.q);
			firstOrder.push(SolarEccentric.equationOfCentreFirstOrder(s.M, parameters.e));
		}

		return { days, exact, firstOrder };
	},

	showReadout() {
		const { day, now, parameters } = this.state;
		const motion = LunarEpicycle.dailyMotion(parameters, now.M);

		showLines('epicycle-readout', [
			`\\text{${dateHourText(YEAR_START + day)}:}\\quad \\bar\\lambda = ${fixedAngle(now.meanLongitude, 2)}^\\circ,\\quad M = ${fixedAngle(now.M, 2)}^\\circ`,
			`q = ${texSigned(now.q)},\\quad \\lambda = \\bar\\lambda + q = ${fixedAngle(now.lambda, 2)}^\\circ`,
			`\\text{daily motion } ${fixed(motion, 2)}^\\circ \\text{ (mean } ${fixed(parameters.n, 2)}^\\circ)`
		]);
	},

	/* Panel (a). */
	draw() {
		if (!this.state) {
			return;
		}

		const ctx = this.ctx;
		const { now, parameters } = this.state;
		const e = parameters.e;

		this.scale = this.R / EPICYCLE_REACH;
		ctx.clearRect(0, 0, this.width, this.width);
		this.labels.begin({ x0: 0, y0: 0, x1: this.width, y1: this.width });

		const { O, K, moon } = epicyclePoints(this, now, e);
		const r = e * this.scale;
		const apogee = towards(O, now.meanLongitude, this.scale * (1 + e));

		// the direction of gamma, and the deferent
		segment(ctx, O, towards(O, 0, this.scale * (1 + EPICYCLE_E_MAX)), { color: COL.sun, width: 1.2 });
		centredLabel(ctx, 'γ', towards(O, 0, this.scale * (1 + EPICYCLE_E_MAX + 0.07)), COL.sun, this.labels);
		circle(ctx, O, this.scale, { color: COL.deferent, width: 2 });

		// the mean direction, from the Earth through K to the apogee of the
		// epicycle, and the epicycle
		segment(ctx, O, apogee, { color: COL.deferent, width: 1.5, dash: [6, 4] });
		circle(ctx, K, r, { color: COL.epicycle, width: 2.2 });

		// the true direction, from the Earth to the Moon
		segment(ctx, O, moon, { color: COL.planet, width: 2 });
		segment(ctx, K, moon, { color: COL.epicycle, width: 1.5 });

		this.drawAngles(O, K, now, r);

		drawDot(ctx, O.x, O.y, 6, COL.earth);
		drawDot(ctx, K.x, K.y, 3.5, COL.ink);
		drawDot(ctx, moon.x, moon.y, 7, COL.planet);
		this.drawLabels(O, K, moon, now, r);
	},

	/* M at K, from the apogee of the epicycle clockwise to the Moon, and
	   q at the Earth, from the mean direction to the Moon. */
	drawAngles(O, K, now, r) {
		const ctx = this.ctx;
		const { meanLongitude, M, q } = now;
		const mRadius = Math.max(ANGLE_ARC_MIN, M_ARC_RADIUS * r);

		if (r > 0) {
			screenArc(ctx, K, mRadius, meanLongitude - M, meanLongitude, { color: COL.epicycle, width: 2 });
		}

		screenArc(ctx, O, Q_ARC_RADIUS * this.scale, meanLongitude + Math.min(q, 0), meanLongitude + Math.max(q, 0), {
			color: COL.planet,
			width: 3
		});
	},

	/* The labels: the angles first, then the points, each just outside
	   what it names and kept clear of the others. Moving points are named
	   by single letters (O the Earth, K, L the Moon), never by words,
	   which would jump from side to side as the points turn (CLAUDE.md);
	   the panel title names the two circles. */
	drawLabels(O, K, moon, now, r) {
		const ctx = this.ctx;
		const { meanLongitude, M, q } = now;
		const mRadius = Math.max(ANGLE_ARC_MIN, M_ARC_RADIUS * r);
		const qSide = q < 0 ? -1 : 1;

		if (r > 0) {
			labelOutside(
				ctx,
				'q',
				O,
				Q_ARC_RADIUS * this.scale,
				meanLongitude + q + 6 * qSide,
				COL.planet,
				this.labels
			);
			labelOutside(ctx, 'M', K, mRadius, meanLongitude - M / 2, COL.epicycle, this.labels);
		}

		const kSide = clearestDirection([meanLongitude, meanLongitude + 180, meanLongitude - M]);
		const lambda = now.lambda;

		labelOutside(ctx, 'K', K, 4, kSide, COL.ink, this.labels);
		labelOutside(
			ctx,
			'L',
			moon,
			8,
			clearestDirection([meanLongitude - M + 180, lambda + 180]),
			COL.planet,
			this.labels
		);
		labelOutside(ctx, 'O', O, 7, clearestDirection([0, meanLongitude, lambda]), COL.earth, this.labels);
	},

	/* "new" or "full" above the plot box, over the line of that phase. */
	phaseName(kind, x) {
		const ctx = this.plot.ctx;

		ctx.fillStyle = textColor(COL.muted);
		ctx.font = FONT_TICK;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'bottom';
		ctx.fillText(kind, this.plot.px(x), this.plot.box.top - 4);
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

		this.syzygies.forEach(({ jd, kind }) => {
			const x = jd - YEAR_START;

			p.vline(x, { color: COL.muted, width: 1, dash: [2, 4] });
			this.phaseName(kind, x);
		});

		p.curve(days, firstOrder, { color: COL.muted, width: 1.5, dash: [6, 4] });
		p.curve(days, exact, { color: COL.planet, width: 2.5 });
		p.marker(day, this.state.now.q, { color: COL.planet, radius: 5 });
	}
};

/* ==========================================================================
   3. FIGURE 3: THE EPICYCLE AND ITS ECCENTRIC
   One moment of our fit, drawn with r/R = EQUIVALENCE_E so that the two
   constructions can be told apart: the deferent and the epicycle (centre
   K), the eccentric (centre C) and the parallelogram O K L C, with
   the line of apsides of the eccentric. The slider runs over one turn of that line,
   8.85 years from 1 January 2026.
   ========================================================================== */

const EQUIVALENCE_E = 0.3;
const EQUIVALENCE_REACH = 1 + EQUIVALENCE_E + 0.14;

/* The two speeds of play (days a second): a month in 9 seconds, the
   whole turn of the eccentric in 8 seconds. */
const MONTH_DAYS_PER_SECOND = 3;
const YEARS_DAYS_PER_SECOND = 400;

const equivalenceFigure = {
	state: null,
	labels: new LabelPlacer(),

	init() {
		const figure = byId('equivalence-canvas').closest('figure');
		const players = [];

		squareCanvas(this, byId('equivalence-canvas'), 460, 10);
		this.parameters = Object.assign({}, LunarEpicycle.FIT_2026, { e: EQUIVALENCE_E });

		wireSlider(
			byId('eq-day'),
			() => this.update(),
			value => dateYearText(YEAR_START + Number(value))
		);
		wirePresets(figure);
		players.push(
			wirePlayButton(byId('eq-play-month'), byId('eq-day'), MONTH_DAYS_PER_SECOND, {
				playLabel: 'Play a month',
				onPlay: () => players[1].pause()
			})
		);
		players.push(
			wirePlayButton(byId('eq-play-years'), byId('eq-day'), YEARS_DAYS_PER_SECOND, {
				playLabel: 'Play 9 years',
				onPlay: () => players[0].pause()
			})
		);

		this.update();
	},

	update() {
		const day = readNumber('eq-day');
		const jd = YEAR_START + day;

		this.state = { day, jd, now: LunarEpicycle.state(this.parameters, jd) };
		this.showReadout();
		this.draw();
	},

	showReadout() {
		const { jd, now } = this.state;

		// the Moon's direction as each construction gives it: the epicycle's
		// lambdaBar + q, and the direction of C + R u(lambdaBar), the Moon on
		// the eccentric at its mean longitude as seen from C
		const C = LunarEpicycle.construction(now, this.parameters.e).C;
		const viaEpicycle = now.lambda;
		const viaEccentric = norm360(atan2d(C[1] + sin(now.meanLongitude), C[0] + cos(now.meanLongitude)));

		showLines('equivalence-readout', [
			`\\text{${dateYearText(jd)}:}\\quad \\bar\\lambda = ${fixedAngle(now.meanLongitude, 2)}^\\circ,\\quad M = ${fixedAngle(now.M, 2)}^\\circ`,
			`\\lambda_A = \\bar\\lambda - M = ${fixedAngle(now.apogee, 2)}^\\circ`,
			`\\text{epicycle: } \\lambda = ${fixedAngle(viaEpicycle, 2)}^\\circ`,
			`\\text{eccentric: } \\lambda = ${fixedAngle(viaEccentric, 2)}^\\circ`
		]);
	},

	draw() {
		if (!this.state) {
			return;
		}

		const ctx = this.ctx;
		const { now } = this.state;
		const e = this.parameters.e;

		this.scale = this.R / EQUIVALENCE_REACH;
		ctx.clearRect(0, 0, this.width, this.width);
		this.labels.begin({ x0: 0, y0: 0, x1: this.width, y1: this.width });

		const { O, K, C, moon } = epicyclePoints(this, now, e);

		this.drawApsides(O, now.apogee, e);

		// the three circles
		circle(ctx, O, this.scale, { color: COL.deferent, width: 1.5 });
		circle(ctx, C, this.scale, { color: COL.earth, width: 2 });
		circle(ctx, K, e * this.scale, { color: COL.epicycle, width: 2 });

		// the parallelogram: O K and C Moon (length R), O C and K Moon (r)
		segment(ctx, O, K, { color: COL.deferent, width: 2.2 });
		segment(ctx, K, moon, { color: COL.epicycle, width: 2.2 });
		segment(ctx, O, C, { color: COL.earth, width: 2.2 });
		segment(ctx, C, moon, { color: COL.earth, width: 2.2 });

		// the Moon's direction from the Earth, the diagonal
		segment(ctx, O, moon, { color: COL.planet, width: 1.5, dash: [6, 4] });

		drawDot(ctx, O.x, O.y, 6, COL.earth);
		drawDot(ctx, K.x, K.y, 4, COL.ink);
		drawDot(ctx, C.x, C.y, 4, COL.ink);
		drawDot(ctx, moon.x, moon.y, 7, COL.planet);

		this.drawLabels(O, K, C, moon, now, e);
	},

	/* The eccentric's line of apsides, dotted, from its perigee through
	   the Earth and C to its apogee. */
	drawApsides(O, apogee, e) {
		const far = towards(O, apogee, this.scale * (1 + e));
		const near = towards(O, apogee + 180, this.scale * (1 - e));

		segment(this.ctx, near, far, { color: COL.muted, width: 1.2, dash: [2, 4] });
	},

	/* The labels, each just outside what it names: single letters for the
	   moving points (O the Earth, K, C, L the Moon, A the eccentric's
	   apogee), never words, which would jump from side to side as the
	   points turn (CLAUDE.md). The key tells the circles apart by their
	   centres. */
	drawLabels(O, K, C, moon, now, e) {
		const ctx = this.ctx;
		const { meanLongitude, apogee, M } = now;
		const lambda = now.lambda;

		labelOutside(
			ctx,
			'L',
			moon,
			8,
			clearestDirection([meanLongitude - M + 180, meanLongitude + 180, lambda + 180]),
			COL.planet,
			this.labels
		);
		labelOutside(ctx, 'K', K, 4, clearestDirection([meanLongitude + 180, meanLongitude - M]), COL.ink, this.labels);
		labelOutside(ctx, 'C', C, 4, clearestDirection([apogee, apogee + 180, meanLongitude]), COL.ink, this.labels);
		labelOutside(
			ctx,
			'O',
			O,
			7,
			clearestDirection([meanLongitude, apogee, apogee + 180, lambda]),
			COL.earth,
			this.labels
		);
		labelOutside(ctx, 'A', O, this.scale * (1 + e), apogee, COL.earth, this.labels);
	}
};

/* ==========================================================================
   4. FIGURE 4: THREE ECLIPSES
   The three-eclipse method on four sets of data: Ptolemy's Babylonian
   and Alexandrian eclipses (Almagest IV 6), Copernicus' (De Rev. IV 5)
   and ours of 2025 - 2026 (the reference sky).
   (a) the epicycle, its apogee up (away from the Earth), the Moon at the
	   three eclipses, and the arcs a12 and a23 of anomaly between them.
   (b) the plane of X = (r/R) cos M2, Y = (r/R) sin M2: where each of the
	   two equations holds, exactly (solid, found on a grid) and to first
	   order (dashed, straight lines); the solution, the first-order one,
	   and its distance r/R from the origin. Fixed scale: |X|, |Y| <= 0.12
	   (the four solutions reach 0.085, tools/numbers/3.1-first-anomaly.js).
   ========================================================================== */

const XY_RANGE = [-0.12, 0.12];

/* The grid on which the exact curves are traced (cells a side). */
const CONTOUR_CELLS = 120;

/* What each set of data is, and the source's own result, for the
   read-out. */
const TRIPLE_SOURCES = {
	babylon: "\\text{Ptolemy: } 0.08694,\\ M_2 = 12^\\circ 24'",
	alexandria: "\\text{Ptolemy: } 0.08722,\\ M_2 = 64^\\circ 38'",
	copernicus: "\\text{Copernicus: } 0.08604,\\ M_2 = 74^\\circ 27'",
	ours: '\\text{the reference sky, 2025 – 2026}'
};

const eclipsesFigure = {
	plot: null,
	solution: null,
	labels: new LabelPlacer(),

	init() {
		squareCanvas(this, byId('eclipses-canvas'), 420, 10);

		this.data = Object.assign({}, LunarEpicycle.TRIPLES, { ours: this.ourTriple() });

		this.plot = new Plot2D(byId('eclipses-plot'), {
			x: XY_RANGE,
			y: XY_RANGE,
			xLabel: 'X = (r/R) cos M₂',
			yLabel: 'Y = (r/R) sin M₂',
			aspect: 1,
			maxHeight: 520,
			margin: { left: 60, right: 14, top: 14, bottom: 44 },
			onDraw: () => this.drawPlot()
		});

		this.wireChoice();
		this.choose('babylon');
	},

	/* Our triple: the three eclipses of FIT_2026 in the reference sky,
	   with Meeus' mean motions. */
	ourTriple() {
		const times = LunarEpicycle.ECLIPSES_2026;

		return LunarEpicycle.tripleFromObservations(times, times.map(moonLongitude), LunarEpicycle.MEEUS);
	},

	wireChoice() {
		const buttons = [...byId('eclipses-presets').querySelectorAll('button')];

		buttons.forEach(button => {
			button.addEventListener('click', () => {
				markChosen(buttons, button);
				this.choose(button.dataset.triple);
			});
		});

		markChosen(buttons, buttons[0]);
	},

	choose(name) {
		this.name = name;
		this.triple = this.data[name];
		this.solution = LunarEpicycle.threeEclipses(this.triple);
		this.contours = [0, 1].map(i => this.contour(i));
		this.showReadout();
		this.draw();
		this.plot.redraw();
	},

	showReadout() {
		const { a12, a23, d12, d23 } = this.triple;
		const s = this.solution;

		showLines('eclipses-readout', [
			`a_{12} = ${fixed(a12, 2)}^\\circ,\\quad a_{23} = ${fixed(a23, 2)}^\\circ`,
			`d_{12} = ${texSigned(d12)},\\quad d_{23} = ${texSigned(d23)}`,
			`\\text{first order: } r/R = ${fixed(s.first.e, 5)},\\ M_2 = ${fixedAngle(s.first.M2, 1)}^\\circ`,
			`\\text{exact: } r/R = ${fixed(s.e, 5)},\\ M_2 = ${fixedAngle(s.M2, 1)}^\\circ`,
			TRIPLE_SOURCES[this.name]
		]);
	},

	/* Panel (a). The apogee of the epicycle is up, the Earth below; seen
	   from the north, the Moon moves clockwise on the screen near the
	   apogee (westward), so the anomaly M is the angle clockwise from up. */
	draw() {
		if (!this.solution) {
			return;
		}

		const ctx = this.ctx;
		const centre = { x: this.cx, y: this.cy - 0.05 * this.R };
		const radius = 0.62 * this.R;
		const { a12, a23 } = this.triple;
		const M2 = this.solution.M2;
		const anomalies = [M2 - a12, M2, M2 + a23];
		const onCircle = (M, r) => ({ x: centre.x + r * sin(M), y: centre.y - r * cos(M) });

		ctx.clearRect(0, 0, this.width, this.width);
		this.labels.begin({ x0: 0, y0: 0, x1: this.width, y1: this.width });

		// the line of apsides, the apogee up and the Earth far below
		segment(ctx, onCircle(0, radius * 1.12), onCircle(180, radius * 1.25), {
			color: COL.muted,
			width: 1.2,
			dash: [2, 4]
		});
		circle(ctx, centre, radius, { color: COL.epicycle, width: 2.2 });

		// the arcs of anomaly between the eclipses, clockwise, inside
		this.arc(centre, 0.72 * radius, anomalies[0], anomalies[1], COL.planet);
		this.arc(centre, 0.52 * radius, anomalies[1], anomalies[2], COL.epicycle);
		subscriptLabel(ctx, 'a', '12', onCircle(anomalies[0] + a12 / 2, 0.83 * radius), COL.planet);
		subscriptLabel(ctx, 'a', '23', onCircle(anomalies[1] + a23 / 2, 0.38 * radius), COL.epicycle);

		anomalies.forEach((M, i) => {
			const point = onCircle(M, radius);

			segment(ctx, centre, point, { color: COL.ink, width: 1 });
			drawDot(ctx, point.x, point.y, 6, COL.planet);
			centredLabel(ctx, String(i + 1), onCircle(M, radius + 20), COL.planet, this.labels);
		});

		drawDot(ctx, centre.x, centre.y, 3.5, COL.ink);
		centredLabel(ctx, 'apogee', onCircle(0, radius * 1.12 + 14), COL.epicycle, this.labels);
		centredLabel(ctx, 'to the Earth', { x: centre.x, y: centre.y + radius * 1.25 + 14 }, COL.earth, this.labels);
	},

	/* An arc of the circle 'radius' about 'centre', clockwise on the
	   screen from the anomaly 'from' to 'to' (deg, from up). */
	arc(centre, radius, from, to, color) {
		const ctx = this.ctx;
		const start = (from - 90) * D2R;
		const end = (to - 90) * D2R;

		ctx.strokeStyle = color;
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		ctx.arc(centre.x, centre.y, radius, start, end, false);
		ctx.stroke();
	},

	/* The segments where equation 'which' (0: from the first eclipse to
	   the second, 1: from the second to the third) holds exactly, by
	   marching squares on the grid: [[x1, y1, x2, y2], ...]. */
	contour(which) {
		const n = CONTOUR_CELLS;
		const [lo, hi] = XY_RANGE;
		const step = (hi - lo) / n;
		const value = [];

		for (let i = 0; i <= n; i++) {
			value.push([]);

			for (let j = 0; j <= n; j++) {
				value[i].push(LunarEpicycle.residuals(this.triple, lo + i * step, lo + j * step)[which]);
			}
		}

		const segments = [];

		for (let i = 0; i < n; i++) {
			for (let j = 0; j < n; j++) {
				const points = this.cellCrossings(value, i, j, lo, step);

				if (points.length === 2) {
					segments.push([...points[0], ...points[1]]);
				} else if (points.length === 4) {
					segments.push([...points[0], ...points[1]], [...points[2], ...points[3]]);
				}
			}
		}

		return segments;
	},

	/* The points where the value crosses zero on the four edges of the
	   cell (i, j), by linear interpolation. */
	cellCrossings(value, i, j, lo, step) {
		const corners = [
			[i, j],
			[i + 1, j],
			[i + 1, j + 1],
			[i, j + 1]
		];
		const points = [];

		corners.forEach(([ia, ja], k) => {
			const [ib, jb] = corners[(k + 1) % 4];
			const a = value[ia][ja];
			const b = value[ib][jb];

			if (a === 0 || a * b < 0) {
				const t = a / (a - b);

				points.push([lo + (ia + t * (ib - ia)) * step, lo + (ja + t * (jb - ja)) * step]);
			}
		});

		return points;
	},

	/* Panel (b). */
	drawPlot() {
		if (!this.solution) {
			return;
		}

		const p = this.plot;
		const s = this.solution;
		const colors = [COL.planet, COL.epicycle];

		p.frame();
		p.hline(0, { color: COL.ink, width: 1 });
		p.vline(0, { color: COL.ink, width: 1 });

		LunarEpicycle.firstOrderRows(this.triple).forEach((row, i) => this.line(row, colors[i]));
		this.contours.forEach((segments, i) => this.drawContour(segments, colors[i]));

		// the distance of the solution from the origin is r/R
		p.curve([0, s.X], [0, s.Y], { color: COL.ink, width: 1.5 });
		p.text('r/R', s.X / 2, s.Y / 2, { color: COL.ink, kind: 'symbol', dx: 8, dy: -6 });

		p.marker(s.first.X, s.first.Y, { color: COL.muted, radius: 4 });
		p.marker(s.X, s.Y, { color: COL.ink, radius: 5.5 });
	},

	/* The straight line A X + B Y = d of a first-order row, across the
	   panel, dashed. */
	line(row, color) {
		const [A, B, d] = row;
		const p = this.plot;
		const [lo, hi] = XY_RANGE;
		const style = { color, width: 1.5, dash: [6, 4], clip: true };

		if (Math.abs(B) > Math.abs(A)) {
			p.curve([lo, hi], [(d - A * lo) / B, (d - A * hi) / B], style);
		} else {
			p.curve([(d - B * lo) / A, (d - B * hi) / A], [lo, hi], style);
		}
	},

	/* The segments of an exact curve, solid, in one path. */
	drawContour(segments, color) {
		const p = this.plot;
		const ctx = p.ctx;

		ctx.strokeStyle = color;
		ctx.lineWidth = 2.2;
		ctx.setLineDash([]);
		ctx.beginPath();
		segments.forEach(([x1, y1, x2, y2]) => {
			ctx.moveTo(p.px(x1), p.py(y1));
			ctx.lineTo(p.px(x2), p.py(y2));
		});
		ctx.stroke();
	}
};

/* ==========================================================================
   5. FIGURES 5 AND 6: THE ERROR CURVES
   The models take JD(TT) and return a longitude (models/*.js); the widget
   compares them with the reference Moon (shared/errorcurve.js). No slider
   changes a model here, so the widget fits its scale to each span. The
   dots mark the new and full Moons, on spans of a year or less.
   ========================================================================== */

/* Figure 5: the fitted epicycle and the uniform Moon over the year 2026, and
   over two months and a century centred on it. */
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
				{ label: '2 months', years: EPICYCLE_DAYS / 365.25 },
				{ label: '1 year', years: 1 },
				{ label: '100 years', years: 100 }
			],
			ghostButtons: false
		});

		curve.addGhost({
			label: 'the uniform Moon',
			short: 'uniform Moon',
			color: COL.muted,
			fn: LunarEpicycle.makeUniform(LunarEpicycle.FIT_2026)
		});
		curve.addModel({
			label: 'the epicycle, fitted to three eclipses',
			short: 'epicycle',
			color: COL.epicycle,
			fn: LunarEpicycle.make(LunarEpicycle.FIT_2026)
		});
		curve.addMarks({
			label: 'the epicycle at new and full Moon (spans of a year or less)',
			color: COL.epicycle,
			fn: LunarEpicycle.make(LunarEpicycle.FIT_2026),
			dates: syzygies(middle - 190, middle + 190).map(s => s.jd),
			maxYears: 1.01
		});
	}
};

/* Figure 6: Ptolemy's simple Moon around his eclipse of 20 October 134,
   and over 2000 years (866 BC to AD 1134, inside the reference sky's
   range). */
const ptolemyErrorFigure = {
	init() {
		const start = Time.julianDay(134, 9, 20);
		const end = start + EPICYCLE_DAYS;
		const curve = new ErrorCurve(byId('error-ptolemy'), {
			body: 'moon',
			start: start,
			end: end,
			spans: [
				{ label: '2 months', years: EPICYCLE_DAYS / 365.25 },
				{ label: '2000 years', years: 2000 }
			],
			ghostButtons: false
		});
		const ptolemy = LunarEpicycle.make(LunarEpicycle.PTOLEMY);

		curve.addModel({
			label: "Ptolemy's simple Moon (<em>Almagest</em> IV)",
			short: "Ptolemy's Moon",
			color: COL.planet,
			fn: ptolemy
		});
		curve.addMarks({
			label: 'at new and full Moon (spans of a year or less)',
			color: COL.planet,
			fn: ptolemy,
			dates: syzygies(start - 5, end + 5).map(s => s.jd),
			maxYears: 1.01
		});
	}
};

/* ==========================================================================
   6. PAGE START
   Shared components first (they typeset the prose), then the figures.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
	Site.initPage();
	startFigures([motionFigure, epicycleFigure, equivalenceFigure, eclipsesFigure, ourErrorFigure, ptolemyErrorFigure]);
});
