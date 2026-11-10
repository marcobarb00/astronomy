// @ts-check
/* ==========================================================================
   PAGE 4.1 · GOING BACKWARDS - SCRIPT (page.js)
   Five figures, each with its own init and draw (and update when it has
   controls):
	 1. Mars turning back            (blue plate, static: Mars' path among
									   the stars of Gemini and Cancer,
									   October 2024 - April 2025)
	 2. the daily motion             (2D, static per view: each planet's
									   daily motion against its place
									   relative to the Sun, 2011 - 2030)
	 3. the epicycle                 (2D: (a) the deferent and the epicycle
									   seen from the north ecliptic pole,
									   (b) the daily motion against the
									   anomaly; date and r; Mars or Venus)
	 4. the epicycle against Mars    (error curve, fitted to 2018 - 2033)
	 5. the loops of Mars            (2D, static: the arcs and the
									   intervals of 2001 - 2040 against the
									   ecliptic longitude of opposition)
   Shared code: common.js, time.js, ephemeris.js, stars.js, plate-stars.js,
   plate.js, models/mean-sun.js, models/planet-epicycle.js, plot2d.js,
   errorcurve.js, components.js.
   Every number quoted in the prose comes from
   tools/numbers/4.1-going-backwards.js.

   TABLE OF CONTENTS
	 0. Helpers shared by the figures
	 1. Figure 1: Mars turning back (blue plate)
	 2. Figure 2: the daily motion
	 3. Figure 3: the epicycle
	 4. Figure 4: the error curve
	 5. Figure 5: the loops of Mars
	 6. Page start
   ========================================================================== */

/* ==========================================================================
   0. HELPERS SHARED BY THE FIGURES
   ========================================================================== */

/* The forty years of the loops (Figure 5, section 1 of the text). */
const LOOPS_START = Time.julianDay(2001, 1, 1);
const LOOPS_END = Time.julianDay(2041, 1, 1);

/* The reference loops of Mars, computed once for Figures 4 and 5: from
   geometric positions every two days, under 1' from the apparent ones
   the numbers script quotes (planet-epicycle.js, section 5), reaching
   past 2040 for the interval after the last loop. */
let marsEventsCache = null;

function marsEvents() {
	if (!marsEventsCache) {
		marsEventsCache = PlanetEpicycle.referenceEvents(
			'mars',
			'outer',
			LOOPS_START - 200,
			Time.julianDay(2043, 3, 1),
			{ apparent: false, step: 2 }
		);
	}

	return marsEventsCache;
}

/* The loops of Mars of 2001 - 2040, each with the time to the next
   opposition (days). */
function marsLoops() {
	const loops = marsEvents().loops;

	return loops
		.map((loop, i) => Object.assign({ next: i + 1 < loops.length ? loops[i + 1].middle - loop.middle : NaN }, loop))
		.filter(loop => loop.middle >= LOOPS_START && loop.middle < LOOPS_END);
}

/* The model of Mars fitted on this page, its two motions and its loop. */
const MARS_MOTIONS = PlanetEpicycle.motions(PlanetEpicycle.MARS_FIT);
const MARS_LOOP = PlanetEpicycle.loop(PlanetEpicycle.MARS_FIT.r, MARS_MOTIONS.n, MARS_MOTIONS.nMu);

/* Ticks every 90° on an axis of [0, 360] degrees. */
const quarterTicks = () => [0, 90, 180, 270, 360].map(value => ({ value, label: `${value}°` }));

/* An angle with a sign in TeX: "+1.85^\circ", "-0.40^\circ". */
const texSigned = (degrees, digits = 2) => `${signed(degrees, digits).replace('−', '-')}^\\circ`;

/* A word above the plot box, at x (e.g. "opposition" over its line):
   centred on x, or starting at the left edge or ending at the right edge
   of the box, so that it never leaves the canvas. */
function nameAbove(plot, text, x) {
	const ctx = plot.ctx;
	let align = 'center';

	if (x <= plot.x[0]) {
		align = 'left';
	} else if (x >= plot.x[1]) {
		align = 'right';
	}

	ctx.fillStyle = textColor(COL.muted);
	ctx.font = FONT_TICK;
	ctx.textAlign = align;
	ctx.textBaseline = 'bottom';
	ctx.fillText(text, plot.px(x), plot.box.top - 4);
}

/* ==========================================================================
   1. FIGURE 1: MARS TURNING BACK (BLUE PLATE)
   A blue plate (shared/plate.js): the stars of 2026 from Gemini to
   Cancer, seen looking south, on the equatorial grid; the ecliptic of
   2026 in the plate's ink, and highlighted the reference path of Mars
   from 15 October 2024 to 15 April 2025 (apparent positions of date, as
   seen from the Earth's centre), a tick on the first of each month.
   The area holds the path, right ascension 109° to 129°, declination
   +21° to +26°, and the whole figures of Gemini and Cancer, so that
   none of their lines is cut by the border.
   ========================================================================== */

const PLATE_AREA = { raMin: 89, raMax: 138, decMin: 7, decMax: 36 };
const PLATE_FROM = Time.julianDay(2024, 10, 15);
const PLATE_TO = Time.julianDay(2025, 4, 15);

/* The two stations and the opposition (JD(TT): 6 December 2024 23:05,
   16 January 2025 02:07, 24 February 2025 01:22, from
   tools/numbers/4.1-going-backwards.js). */
const PLATE_EVENTS = [
	{ jd: Time.julianDayTime(2024, 12, 6, 23, 5), place: 'left' },
	{ jd: Time.julianDayTime(2025, 1, 16, 2, 7) },
	{ jd: Time.julianDayTime(2025, 2, 24, 1, 22), place: 'right' }
];

const plateFigure = {
	init() {
		const chart = Plate.rectangular(byId('plate-mars'), {
			area: PLATE_AREA,
			figures: ['GEMINI', 'CANCER'],
			keep: ['bet Gem'], // Pollux, near the loop, stays on a phone
			names: [
				['bet Gem', 'Pollux', -8, -10, 'end'],
				['alf Gem', 'Castor', -9, -6, 'end']
			],
			label: 'Chart of the sky from Gemini to Cancer, with the ecliptic and, highlighted, the path of Mars from October 2024 to April 2025.'
		});
		const eps = Ephem.meanObliquity(Plate.EPOCH);
		const ecliptic = [];

		for (let lon = 80; lon <= 145; lon += 1) {
			ecliptic.push(Ephem.eclipticToEquatorial(lon, 0, eps));
		}

		const eclipticName = Ephem.eclipticToEquatorial(94, 0, eps);

		Plate.line(chart, ecliptic, 'ecliptic', [eclipticName.ra, eclipticName.dec, -8, 18]);

		// the path, every day; a plain tick on the first of each month, and
		// a dated one at the two stations and the opposition
		const path = [];
		const ticks = [];
		const at = jd => Ephem.equatorial(Ephem.position('mars', jd), jd, false);

		for (let jd = PLATE_FROM; jd <= PLATE_TO + 1e-9; jd += 1) {
			path.push(at(jd));
		}

		for (let month = 1; month <= 6; month++) {
			const p = at(Time.julianDay(2024, 10 + month, 1));

			ticks.push({ ra: p.ra, dec: p.dec });
		}

		// the dates of the stations outside the loop, at its eastern (left)
		// and western ends; the opposition, inside the loop, between Pollux
		// and the path, has a tick only (the side text gives its date)
		PLATE_EVENTS.forEach(event => {
			const p = at(event.jd);

			ticks.push(event.place ? { ra: p.ra, dec: p.dec, text: dateText(event.jd), place: event.place } : p);
		});

		const nameAt = at(PLATE_FROM);

		Plate.highlightCurve(chart, path, 'Mars', [nameAt.ra, nameAt.dec, 10, 22], ticks, -1);
	}
};

/* ==========================================================================
   2. FIGURE 2: THE DAILY MOTION
   Static, a view per planet: the reference planet's daily motion
   against its place relative to the Sun, one curve per synodic period
   of 2011 - 2030. Outer planets: the Sun's ecliptic longitude minus the
   planet's, 0° at conjunction and 180° at opposition (it grows with
   time, as the anomaly of the model does). Inner planets: the
   elongation, the planet's ecliptic longitude minus the Sun's; each
   synodic period is a closed curve, cut at superior conjunction.
   Geometric positions every two days (every day for Mercury), and the
   motion from the samples on either side. The scales hold the
   reference's daily motions of 2001 - 2040
   (tools/numbers/4.1-going-backwards.js).
   ========================================================================== */

const MOTION_START = Time.julianDay(2011, 1, 1);
const MOTION_END = Time.julianDay(2031, 1, 1);

const MOTION_VIEWS = {
	Mars: { body: 'mars', kind: 'outer', step: 2, x: [0, 360], y: [-0.5, 0.9] },
	Jupiter: { body: 'jupiter', kind: 'outer', step: 2, x: [0, 360], y: [-0.15, 0.25] },
	Saturn: { body: 'saturn', kind: 'outer', step: 2, x: [0, 360], y: [-0.1, 0.15] },
	Venus: { body: 'venus', kind: 'inner', step: 2, x: [-50, 50], y: [-0.7, 1.3] },
	Mercury: { body: 'mercury', kind: 'inner', step: 1, x: [-30, 30], y: [-1.5, 2.3] }
};

const motionFigure = {
	plot: null,
	view: 'Mars',
	data: {}, // the curves of each view, computed when first chosen

	init() {
		this.plot = new Plot2D(byId('motion-plot'), {
			x: MOTION_VIEWS.Mars.x,
			y: MOTION_VIEWS.Mars.y,
			xLabel: this.xLabel('outer'),
			yLabel: 'daily motion (°)',
			xTicks: quarterTicks,
			aspect: 0.5,
			margin: { top: 26 },
			onDraw: () => this.draw()
		});

		buildChoice(byId('motion-views'), Object.keys(MOTION_VIEWS), this.view, name => this.choose(name));
		this.choose(this.view);
	},

	xLabel(kind) {
		return kind === 'outer'
			? "the Sun's ecliptic longitude minus the planet's (°)"
			: "the planet's ecliptic longitude minus the Sun's (°)";
	},

	/* Show a planet: its scales change with the view (CLAUDE.md: a view the
	   reader chooses may change a scale). */
	choose(name) {
		const view = MOTION_VIEWS[name];

		this.view = name;

		if (!this.data[name]) {
			this.data[name] = this.compute(view);
		}

		this.plot.setRange(view.x, view.y);
		this.plot.xLabel = this.xLabel(view.kind);
		this.plot.xTicks = view.kind === 'outer' ? quarterTicks : null;
		this.plot.resize(); // the new axis title may take one line or two
		this.plot.redraw();
	},

	/* The curves of one planet: [{ xs, ys }], one per synodic period, and
	   the mean daily motion. */
	compute(view) {
		const days = [];
		const lons = [];
		const suns = [];

		for (let jd = MOTION_START - view.step; jd <= MOTION_END + view.step; jd += view.step) {
			days.push(jd);
			lons.push(Ephem.position(view.body, jd, { apparent: false }).lon);
			suns.push(Ephem.sun(jd, { apparent: false }).lon);
		}

		const curves = [];
		let current = { xs: [], ys: [] };

		for (let i = 1; i + 1 < days.length; i++) {
			const motion = norm180(lons[i + 1] - lons[i - 1]) / (2 * view.step);
			const x = view.kind === 'outer' ? norm360(suns[i] - lons[i]) : norm180(lons[i] - suns[i]);
			const last = current.xs[current.xs.length - 1];

			// a new period: the Sun passes the outer planet (x wraps from 360
			// to 0), or the inner planet passes the Sun moving forward
			const wraps =
				view.kind === 'outer' ? last !== undefined && x < last - 180 : last !== undefined && last < 0 && x >= 0;

			// the period that ends takes this sample too (past 360° for an
			// outer planet), so that consecutive curves meet without a gap
			if (wraps) {
				current.xs.push(view.kind === 'outer' ? x + 360 : x);
				current.ys.push(motion);
				curves.push(current);
				current = { xs: [], ys: [] };
			}

			current.xs.push(x);
			current.ys.push(motion);
		}

		curves.push(current);

		// the mean motion: the reference's (Standish's, of date) for an outer
		// planet, the mean Sun's for an inner one
		const meanMotion = view.kind === 'outer' ? PlanetEpicycle.meanOfDate(view.body).n : MeanSun.MODERN.n;

		return { curves, meanMotion };
	},

	draw() {
		const p = this.plot;
		const view = MOTION_VIEWS[this.view];
		const data = this.data[this.view];

		if (!data) {
			return;
		}

		p.frame();
		p.hline(0, { color: COL.ink, width: 1 });
		p.hline(data.meanMotion, { color: COL.muted, width: 1.5, dash: [6, 5] });

		if (view.kind === 'outer') {
			p.vline(180, { color: COL.muted, width: 1, dash: [2, 4] });
			nameAbove(p, 'conjunction', 0);
			nameAbove(p, 'opposition', 180);
			nameAbove(p, 'conjunction', 360);
		} else {
			p.vline(0, { color: COL.muted, width: 1, dash: [2, 4] });
			nameAbove(p, 'conjunctions', 0);
		}

		data.curves.forEach(curve => p.curve(curve.xs, curve.ys, { color: COL.planet, width: 1.3 }));
	}
};

/* ==========================================================================
   3. FIGURE 3: THE EPICYCLE
   (a) the deferent and the epicycle of the model (Mars fitted to
   2018 - 2033, or Venus with the reference's motions) with the r of the
   slider, at the chosen moment, seen from the north ecliptic pole: the
   direction of the mean Sun from the Earth O, the line from O through K
   to the apogee of the epicycle, the anomaly mu at K, and the path of P
   over the last synodic period. (b) the daily motion against mu, with
   the retrograde part shaded. The slider r runs from 0 to 0.8; panel
   (b)'s scales hold every daily motion of that range, for each planet
   (tools/numbers/4.1-going-backwards.js).
   ========================================================================== */

/* The date slider counts days from 1 January 2024: 1600 days, two
   synodic periods of Mars, through the oppositions of 2025 and 2027. */
const EPICYCLE_START = Time.julianDay(2024, 1, 1);
const EPICYCLE_DAYS_PER_SECOND = 40;

/* The largest r of the slider, and the room around the drawing (units
   of the deferent's radius) for the labels. */
const EPICYCLE_R_MAX = 0.8;
const EPICYCLE_REACH = 1 + EPICYCLE_R_MAX + 0.12;

/* Radius of the anomaly's arc at K (units of the epicycle's radius, at
   least ANGLE_ARC_MIN px), and the step of the path (days). */
const MU_ARC_RADIUS = 0.35;
const ANGLE_ARC_MIN = 14;
const PATH_STEP = 2;

/* The two views: the parameters, Ptolemy's r, panel (b)'s scale. */
const EPICYCLE_VIEWS = {
	Mars: { parameters: PlanetEpicycle.MARS_FIT, ptolemy: PlanetEpicycle.PTOLEMY.mars.r, y: [-1.4, 0.8] },
	Venus: { parameters: PlanetEpicycle.VENUS_MEAN, ptolemy: PlanetEpicycle.PTOLEMY.venus.r, y: [-1.6, 1.4] }
};

const epicycleFigure = {
	plot: null,
	state: null,
	view: 'Mars',
	labels: new LabelPlacer(), // keeps the labels of one drawing apart

	init() {
		const figure = byId('epicycle-canvas').closest('figure');

		squareCanvas(this, byId('epicycle-canvas'), 420, 10);

		this.plot = new Plot2D(byId('epicycle-plot'), {
			x: [0, 360],
			y: EPICYCLE_VIEWS.Mars.y,
			xLabel: 'anomaly μ (°)',
			yLabel: 'daily motion (°)',
			xTicks: quarterTicks,
			aspect: 0.95,
			maxHeight: 440,
			margin: { top: 28 },
			onDraw: () => this.drawPlot()
		});

		wireSlider(
			byId('epi-day'),
			() => this.update(),
			value => dateYearText(EPICYCLE_START + Number(value))
		);
		wireSlider(
			byId('epi-r'),
			() => this.update(),
			value => fixed(Number(value), 3)
		);
		wirePresets(figure);
		wirePlayButton(byId('epi-play'), byId('epi-day'), EPICYCLE_DAYS_PER_SECOND);
		buildChoice(byId('epicycle-views'), Object.keys(EPICYCLE_VIEWS), this.view, name => this.choose(name));
		this.choose(this.view);
	},

	/* A planet: its parameters, its scale in (b), and its presets of r
	   (Ptolemy's, and the threshold below which there is no loop). */
	choose(name) {
		const view = EPICYCLE_VIEWS[name];
		const motions = PlanetEpicycle.motions(view.parameters);
		const threshold = PlanetEpicycle.loopThreshold(motions.n, motions.nMu);
		const ratios = byId('epicycle-ratios');

		this.view = name;
		this.plot.setRange([0, 360], view.y);
		ratios.querySelector('[data-ratio="ptolemy"]').setAttribute('data-value', String(view.ptolemy));
		// the slider's step is 0.001: the largest step at or below the threshold
		ratios
			.querySelector('[data-ratio="threshold"]')
			.setAttribute('data-value', (Math.floor(threshold * 1000) / 1000).toFixed(3));

		const slider = /** @type {HTMLInputElement} */ (byId('epi-r'));

		slider.value = String(view.ptolemy);
		slider.dispatchEvent(new Event('input'));
	},

	/* The parameters of the view, with the r of the slider. */
	parameters() {
		return Object.assign({}, EPICYCLE_VIEWS[this.view].parameters, { r: readNumber('epi-r') });
	},

	update() {
		const parameters = this.parameters();
		const motions = PlanetEpicycle.motions(parameters);
		const day = readNumber('epi-day');
		const jd = EPICYCLE_START + day;

		this.state = {
			parameters,
			motions,
			day,
			jd,
			now: PlanetEpicycle.state(parameters, jd),
			loop: PlanetEpicycle.loop(parameters.r, motions.n, motions.nMu),
			path: this.path(parameters, motions, jd)
		};

		this.showReadout();
		this.draw();
		this.plot.redraw();
	},

	/* The planet's places over the synodic period before jd (units of the
	   deferent's radius). */
	path(parameters, motions, jd) {
		const period = 360 / motions.nMu;
		const points = [];

		for (let t = jd - period; t <= jd + 1e-9; t += PATH_STEP) {
			points.push(PlanetEpicycle.construction(PlanetEpicycle.state(parameters, t), parameters.r).planet);
		}

		return points;
	},

	showReadout() {
		const { jd, now, parameters, motions, loop } = this.state;
		const motion = PlanetEpicycle.dailyMotion(now.mu, parameters.r, motions.n, motions.nMu);
		const direction = motion < 0 ? 'back' : 'forward';
		const threshold = PlanetEpicycle.loopThreshold(motions.n, motions.nMu);
		const stations = Number.isFinite(loop.mu)
			? `\\text{stations at } \\mu = ${fixed(loop.mu, 1)}^\\circ, ${fixed(360 - loop.mu, 1)}^\\circ;\\ \\text{back } ${fixed(loop.arc, 1)}^\\circ`
			: `\\text{no loop: } r \\le n/(n + n_\\mu) = ${fixed(threshold, 3)}`;

		showLines('epicycle-readout', [
			`\\text{${dateYearText(jd)}:}\\quad \\bar\\lambda = ${fixedAngle(now.meanLongitude, 1)}^\\circ,\\quad \\mu = ${fixedAngle(now.mu, 1)}^\\circ`,
			`\\eta = ${texSigned(now.eta, 1)},\\quad \\lambda = \\bar\\lambda + \\eta = ${fixedAngle(now.lambda, 1)}^\\circ`,
			`\\text{daily motion } ${texSigned(motion, 3)} \\text{ (${direction})}`,
			stations
		]);
	},

	/* Panel (a). */
	draw() {
		if (!this.state) {
			return;
		}

		const ctx = this.ctx;
		const { now, parameters, path } = this.state;
		const r = parameters.r;
		this.scale = this.R / EPICYCLE_REACH;

		const at = point => ({ x: this.cx + this.scale * point[0], y: this.cy - this.scale * point[1] });

		ctx.clearRect(0, 0, this.width, this.width);
		this.labels.begin({ x0: 0, y0: 0, x1: this.width, y1: this.width });

		const parts = PlanetEpicycle.construction(now, r);
		const O = at([0, 0]);
		const K = at(parts.K);
		const P = at(parts.planet);
		const edge = this.scale * (1 + EPICYCLE_R_MAX);

		// the direction of gamma, the deferent, and the mean Sun's direction
		segment(ctx, O, towards(O, 0, edge), { color: COL.muted, width: 1 });
		circle(ctx, O, this.scale, { color: COL.deferent, width: 2 });
		segment(ctx, O, towards(O, now.sun, edge), { color: COL.sun, width: 1.5, dash: [6, 4] });

		// the path of P over the last synodic period
		ctx.strokeStyle = withAlpha(COL.planet, 0.35);
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		path.map(at).forEach((q, i) => (i === 0 ? ctx.moveTo(q.x, q.y) : ctx.lineTo(q.x, q.y)));
		ctx.stroke();

		// the line from the Earth through K to the apogee of the epicycle,
		// the epicycle, its radius to P, and the line of sight
		segment(ctx, O, towards(O, now.meanLongitude, this.scale * (1 + r)), {
			color: COL.deferent,
			width: 1.2,
			dash: [2, 4]
		});
		circle(ctx, K, r * this.scale, { color: COL.epicycle, width: 2 });
		segment(ctx, K, P, { color: COL.epicycle, width: 1.8 });
		segment(ctx, O, towards(O, now.lambda, edge), { color: COL.planet, width: 1.5 });

		this.drawAngle(K, now, r);

		drawDot(ctx, O.x, O.y, 6, COL.earth);
		drawDot(ctx, K.x, K.y, 3.5, COL.ink);
		drawDot(ctx, P.x, P.y, 6.5, COL.planet);
		this.drawLabels(O, K, P, now, r, edge);
	},

	/* The anomaly mu at K, anticlockwise from the apogee to P. */
	drawAngle(K, now, r) {
		if (r <= 0) {
			return;
		}

		const radius = Math.max(ANGLE_ARC_MIN, MU_ARC_RADIUS * r * this.scale);

		screenArc(this.ctx, K, radius, now.meanLongitude, now.meanLongitude + now.mu, {
			color: COL.epicycle,
			width: 2
		});
	},

	/* The labels: single letters and symbols for the moving points and
	   directions (O the Earth, K, P, the Sun's ☉, gamma, mu), never words,
	   which would jump from side to side as the points turn (CLAUDE.md). */
	drawLabels(O, K, P, now, r, edge) {
		const ctx = this.ctx;
		const { meanLongitude, mu, sun, lambda } = now;
		const radius = Math.max(ANGLE_ARC_MIN, MU_ARC_RADIUS * r * this.scale);

		centredLabel(ctx, 'γ', towards(O, 0, edge + 12), COL.muted, this.labels);
		centredLabel(ctx, '☉', towards(O, sun, edge + 12), COL.sun, this.labels);

		if (r > 0) {
			labelOutside(ctx, 'μ', K, radius, meanLongitude + mu / 2, COL.epicycle, this.labels);
		}

		labelOutside(
			ctx,
			'K',
			K,
			4,
			clearestDirection([meanLongitude, meanLongitude + 180, sun]),
			COL.ink,
			this.labels
		);
		labelOutside(ctx, 'P', P, 7, clearestDirection([sun + 180, lambda + 180, lambda]), COL.planet, this.labels);
		labelOutside(ctx, 'O', O, 7, clearestDirection([0, meanLongitude, sun, lambda]), COL.earth, this.labels);
	},

	/* Panel (b). */
	drawPlot() {
		if (!this.state) {
			return;
		}

		const p = this.plot;
		const { parameters, motions, now, loop } = this.state;
		const r = parameters.r;
		const xs = [];
		const ys = [];

		for (let mu = 0; mu <= 360; mu += 1) {
			xs.push(mu);
			ys.push(PlanetEpicycle.dailyMotion(mu, r, motions.n, motions.nMu));
		}

		p.frame();

		// the retrograde part, between the stations, shaded down to the curve
		if (Number.isFinite(loop.mu)) {
			const bx = [];
			const lows = [];
			const highs = [];

			for (let mu = loop.mu; mu <= 360 - loop.mu + 1e-9; mu += 0.5) {
				bx.push(mu);
				lows.push(PlanetEpicycle.dailyMotion(mu, r, motions.n, motions.nMu));
				highs.push(0);
			}

			p.band(bx, lows, highs, { color: COL.planet, alpha: 0.2 });
		}

		p.hline(0, { color: COL.ink, width: 1 });
		p.hline(motions.n, { color: COL.muted, width: 1.5, dash: [6, 5] });
		nameAbove(p, 'apogee', 0);
		nameAbove(p, 'perigee', 180);
		nameAbove(p, 'apogee', 360);
		p.curve(xs, ys, { color: COL.planet, width: 2.4 });
		p.marker(now.mu, PlanetEpicycle.dailyMotion(now.mu, r, motions.n, motions.nMu), {
			color: COL.planet,
			radius: 5
		});
	}
};

/* ==========================================================================
   4. FIGURE 4: THE ERROR CURVE
   The model fitted to 2018 - 2033 and the uniform planet against the
   reference Mars, in degrees, over four years, 2024 - 2027, and the
   sixteen years of the fit and two centuries centred on them (a curve
   over four years; over the longer spans one pixel covers more than the
   sampling step, so the curves become bands); dots at the oppositions of
   2001 - 2040, on spans of the fit or less. No slider changes a model, so
   the widget fits its scale to each span.
   ========================================================================== */

const errorFigure = {
	init() {
		const curve = new ErrorCurve(byId('error-mars'), {
			body: 'mars',
			start: Time.julianDay(2024, 1, 1),
			end: Time.julianDay(2028, 1, 1),
			spans: [
				{ label: '4 years', years: 4 },
				{ label: '16 years', years: 16 },
				{ label: '200 years', years: 200 }
			],
			units: 'deg',
			ghostButtons: false
		});

		curve.addGhost({
			label: 'the uniform planet',
			short: 'uniform planet',
			color: COL.muted,
			fn: PlanetEpicycle.makeUniform(PlanetEpicycle.MARS_FIT)
		});
		curve.addModel({
			label: 'the epicycle, fitted to 2018–2033',
			short: 'epicycle',
			color: COL.epicycle,
			fn: PlanetEpicycle.make(PlanetEpicycle.MARS_FIT)
		});
		curve.addMarks({
			label: 'the epicycle at the oppositions (spans of 16 years or less)',
			color: COL.epicycle,
			fn: PlanetEpicycle.make(PlanetEpicycle.MARS_FIT),
			dates: marsLoops().map(loop => loop.middle),
			maxYears: 16.5
		});
	}
};

/* ==========================================================================
   5. FIGURE 5: THE LOOPS OF MARS
   Static. (a) how far Mars went back in each loop of 2001 - 2040, and
   (b) the time from its opposition to the next, against the ecliptic
   longitude of the opposition; the model's constant arc and synodic
   period as lines. Fixed scales: the arcs run from 10.0° to 19.5°, the
   intervals from 764 to 810 days (tools/numbers/4.1-going-backwards.js).
   ========================================================================== */

const ARC_RANGE = [8, 22];
const INTERVAL_RANGE = [750, 825];

const loopsFigure = {
	init() {
		this.loops = marsLoops();

		const options = {
			x: [0, 360],
			xLabel: 'ecliptic longitude of the opposition (°)',
			xTicks: quarterTicks,
			aspect: 0.75,
			maxHeight: 360
		};

		this.arcs = new Plot2D(
			byId('arcs-plot'),
			Object.assign({}, options, {
				y: ARC_RANGE,
				yLabel: 'arc (°)',
				onDraw: () => this.draw(this.arcs, loop => loop.arc, MARS_LOOP.arc)
			})
		);
		this.intervals = new Plot2D(
			byId('intervals-plot'),
			Object.assign({}, options, {
				y: INTERVAL_RANGE,
				yLabel: 'days',
				onDraw: () => this.draw(this.intervals, loop => loop.next, 360 / MARS_MOTIONS.nMu)
			})
		);
	},

	/* One panel: the model's value as a line, a dot per loop. */
	draw(p, value, model) {
		if (!this.loops) {
			return;
		}

		p.frame();
		p.hline(model, { color: COL.epicycle, width: 2 });
		this.loops.forEach(loop => p.marker(loop.lon, value(loop), { color: COL.planet, radius: 4.5 }));
	}
};

/* ==========================================================================
   6. PAGE START
   Shared components first (they typeset the prose), then the figures.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
	Site.initPage();
	startFigures([plateFigure, motionFigure, epicycleFigure, errorFigure, loopsFigure]);
});
