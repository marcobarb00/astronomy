// @ts-check
/* ==========================================================================
   PAGE 4.3 · SAME GEOMETRY, NEW CENTER - SCRIPT (page.js)
   Six figures, each with its own init and draw (and update when it has
   controls):
	 1. the elongations           (2D, static: the five planets' ecliptic
								   longitude less the Sun's, 2022 - 2025,
								   thick where they go back)
	 2. the two descriptions      (2D: (a) Ptolemy's model, the Earth O
								   fixed, with the parallelogram O K P sun;
								   (b) Copernicus' arrangement, the point of
								   the mean Sun fixed; date; views Mars,
								   Venus)
	 3. one scale                 (2D, static: (a) Ptolemy's five models,
								   each deferent the same size; (b) the five
								   circles about the Sun on one scale; (c)
								   the same out to Mars)
	 4. the two right triangles   (Figure 5, 2D, static: (a) Venus at greatest
								   elongation; (b) Saturn at quadrature, and
								   the same a day earlier)
	 5. the error curve           (Figure 4: Mars with Copernicus'
								   epicyclet, page 4.2's equant as ghost;
								   coded after Figure 5)
	 6. Mars' distance            (2D, static: (a) the distance from the
								   Earth, real, model and model without the
								   equant; (b) model less real, 2010 - 2025)
   Shared code: common.js, time.js, ephemeris.js, models/mean-sun.js,
   models/precession.js, models/planet-epicycle.js, models/planet-equant.js,
   models/planet-arrangement.js, plot2d.js, errorcurve.js, components.js.
   Every number quoted in the prose comes from
   tools/numbers/4.3-new-center.js.

   TABLE OF CONTENTS
	 0. Helpers shared by the figures
	 1. Figure 1: the elongations
	 2. Figure 2: the two descriptions
	 3. Figure 3: one scale
	 4. Figure 5: the two right triangles
	 5. Figure 4: the error curve of the epicyclet
	 6. Figure 6: Mars' distance
	 7. Page start
   ========================================================================== */

/* ==========================================================================
   0. HELPERS SHARED BY THE FIGURES
   ========================================================================== */

/* The years of page 4.2's fit, over which Figures 2, 5 and 6 run. */
const FIT_START = Time.julianDay(2010, 1, 1);
const FIT_END = Time.julianDay(2026, 1, 1);

/* Page 4.2's Mars, which this page moves into Copernicus' arrangement. */
const MARS = PlanetEquant.MARS_FIT;

/* A JD as a year with its fraction, for the axes in years. */
const yearOf = jd => 2000 + (jd - 2451545.0) / 365.25;

/* Ticks at whole years, every 'step' years, on an axis of years. */
const yearTicks = step => (min, max) => {
	const ticks = [];

	for (let year = Math.ceil(min / step) * step; year <= max; year += step) {
		ticks.push({ value: year, label: String(year) });
	}

	return ticks;
};

/* The reference planet from geometric positions, under 1' from the
   apparent ones the numbers script quotes and four times faster
   (DECISIONS.md, page 4.1). */
const geometric = (planet, jd) => Ephem.planet(planet, jd, { apparent: false });

/* A canvas as wide as its column (up to maxWidth px) and 'aspect' times
   as high, scaled for the device pixel ratio; it follows the column and
   calls owner.draw() when the width changes. Sets owner.ctx, width and
   height. 'aspect' may be a function of the width, for a drawing that
   changes its layout on a phone. */
function wideCanvas(owner, canvas, aspect, maxWidth) {
	const targetWidth = () => clamp(contentWidth(canvas.parentElement) || 600, SQUARE_CANVAS_MIN, maxWidth);

	const resize = () => {
		const width = targetWidth();
		const height = Math.round(width * (typeof aspect === 'function' ? aspect(width) : aspect));

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

	whenCanvasFontsReady().then(() => owner.draw());
	onPixelRatioChange(() => {
		resize();
		owner.draw();
	});
}

/* The small square of a right angle at 'corner', between the directions
   towards a and towards b (screen points). */
function rightAngleMark(ctx, corner, a, b, size) {
	const unit = p => {
		const length = Math.hypot(p.x - corner.x, p.y - corner.y);

		return { x: (p.x - corner.x) / length, y: (p.y - corner.y) / length };
	};
	const u = unit(a);
	const v = unit(b);

	ctx.strokeStyle = COL.ink;
	ctx.lineWidth = 1.2;
	ctx.setLineDash([]);
	ctx.beginPath();
	ctx.moveTo(corner.x + size * u.x, corner.y + size * u.y);
	ctx.lineTo(corner.x + size * (u.x + v.x), corner.y + size * (u.y + v.y));
	ctx.lineTo(corner.x + size * v.x, corner.y + size * v.y);
	ctx.stroke();
}

/* The direction (deg, anticlockwise from the right, as towards()) of
   screen point b seen from screen point a. */
const screenDirection = (a, b) => atan2d(a.y - b.y, b.x - a.x);

/* ==========================================================================
   1. FIGURE 1: THE ELONGATIONS
   Static. The elongation of each planet from the true Sun, every day
   of 2022 - 2025 in the reference sky: (a) Venus and Mercury, signed,
   east of the Sun positive; (b) Mars, Jupiter and Saturn, 0° to 360° east
   of the Sun. Thick where the planet goes back among the stars (its
   ecliptic longitude decreasing). Venus reaches 47.2°, Mercury 27.4°
   (tools/numbers/4.3-new-center.js), so (a) is drawn from -50° to 50°.
   ========================================================================== */

const ELONGATION_START = Time.julianDay(2022, 1, 1);
const ELONGATION_END = Time.julianDay(2026, 1, 1);
const INNER_RANGE = [-50, 50];
const OUTER_RANGE = [0, 360];

/* The planets of each panel, their colours and where their names go
   (a year of the axis, and the side of the curve). */
const ELONGATION_PLANETS = {
	inner: [
		{ planet: 'venus', name: 'Venus', color: COL.epicycle, at: 2023.42, dx: -24, dy: 22 },
		{ planet: 'mercury', name: 'Mercury', color: COL.earth, at: 2022.66 }
	],
	outer: [
		{ planet: 'mars', name: 'Mars', color: COL.planet, at: 2023.3 },
		{ planet: 'jupiter', name: 'Jupiter', color: COL.deferent, at: 2022.3 },
		{ planet: 'saturn', name: 'Saturn', color: COL.earth, at: 2022.75 }
	]
};

const elongationFigure = {
	series: null,

	init() {
		this.series = {};

		Object.values(ELONGATION_PLANETS)
			.flat()
			.forEach(entry => {
				this.series[entry.planet] = this.sample(entry.planet);
			});

		const options = {
			x: [yearOf(ELONGATION_START), yearOf(ELONGATION_END)],
			xLabel: 'year',
			xTicks: yearTicks(1),
			aspect: 0.32,
			maxHeight: 280,
			minHeight: 200
		};

		this.inner = new Plot2D(
			byId('elongation-inner'),
			Object.assign({}, options, {
				y: INNER_RANGE,
				yLabel: 'elongation (°)',
				onDraw: () => this.draw(this.inner, 'inner')
			})
		);
		this.outer = new Plot2D(
			byId('elongation-outer'),
			Object.assign({}, options, {
				y: OUTER_RANGE,
				yLabel: 'elongation (°)',
				yTicks: quarterTicks,
				onDraw: () => this.draw(this.outer, 'outer')
			})
		);
	},

	/* Every day: { xs (years), inner (signed elongation), outer (0° to
	   360°), back (the same, NaN unless the planet goes back) }. */
	sample(planet) {
		const xs = [];
		const signedValues = [];
		const eastward = [];
		const backInner = [];
		const backOuter = [];
		let before = geometric(planet, ELONGATION_START - 1).lon;

		for (let jd = ELONGATION_START; jd <= ELONGATION_END; jd += 1) {
			const lon = geometric(planet, jd).lon;
			const e = norm180(lon - Ephem.sun(jd, { apparent: false }).lon);
			const back = norm180(lon - before) < 0;

			xs.push(yearOf(jd));
			signedValues.push(e);
			eastward.push(norm360(e));
			backInner.push(back ? e : NaN);
			backOuter.push(back ? norm360(e) : NaN);
			before = lon;
		}

		return { xs, inner: signedValues, outer: eastward, backInner, backOuter };
	},

	/* One panel: the line where the planets go back (zero elongation or
	   opposition), each planet thin, thick where it goes back, named. */
	draw(p, panel) {
		if (!this.series) {
			return;
		}

		p.frame();
		p.hline(panel === 'inner' ? 0 : 180, { color: COL.ink, width: 1 });

		ELONGATION_PLANETS[panel].forEach(entry => {
			const s = this.series[entry.planet];
			const values = panel === 'inner' ? s.inner : s.outer;
			const back = panel === 'inner' ? s.backInner : s.backOuter;

			p.curve(s.xs, values, { color: entry.color, width: 1.4, breakAt: 180 });
			p.curve(s.xs, back, { color: entry.color, width: 4.5, breakAt: 180 });
		});

		// the names, after every curve, beside a point of their own curve
		ELONGATION_PLANETS[panel].forEach(entry => {
			const s = this.series[entry.planet];
			const i = s.xs.findIndex(x => x >= entry.at);
			const y = panel === 'inner' ? s.inner[i] : s.outer[i];

			p.text(entry.name, s.xs[i], y, { color: entry.color, kind: 'name', dx: entry.dx ?? 6, dy: entry.dy ?? -6 });
		});
	}
};

/* ==========================================================================
   2. FIGURE 2: THE TWO DESCRIPTIONS
   One moment of page 4.2's Mars, or of Venus fitted on this page, in
   two panels on the same scale: (a) Ptolemy's model about the Earth O,
   with the deferent, the epicycle, the point sun at the end of KP drawn
   from O and the parallelogram O K P sun dashed, and P's path over the
   last synodic period; (b) the same points moved by -O sun, so that sun
   stands still: the Earth's circle, the planet's circle (for Mars,
   page 4.2's deferent, centered where C was relative to O), and the
   triangle O sun P. Each circle
   keeps its colour, so the reader sees which of Ptolemy's circles
   becomes the Earth's. The date runs over 2010 - 2025.
   ========================================================================== */

/* Play: a synodic period of Mars in about twenty seconds. */
const ARRANGEMENT_DAYS_PER_SECOND = 40;

/* The step of the path (days). */
const ARRANGEMENT_PATH_STEP = 2;

/* The two views: the planet, and the room of the drawing (units of
   Ptolemy's deferent): the farthest the planet goes from O in (a), and
   the labels outside it. Both panels share the scale. */
const ARRANGEMENT_VIEWS = {
	Mars: { planet: 'mars', room: 1 + 2 * MARS.e + MARS.r + 0.16 },
	Venus: { planet: 'venus', room: 1 + PlanetArrangement.VENUS_FIT.r + 0.16 }
};

const arrangementFigure = {
	view: 'Mars',
	state: null,

	init() {
		this.geo = { labels: new LabelPlacer(), draw: () => this.drawGeostatic() };
		this.helio = { labels: new LabelPlacer(), draw: () => this.drawHeliostatic() };
		squareCanvas(this.geo, byId('geostatic-canvas'), 380, 10);
		squareCanvas(this.helio, byId('heliostatic-canvas'), 380, 10);

		wireSlider(
			byId('arrangement-day'),
			() => this.update(),
			value => dateYearText(FIT_START + Number(value))
		);
		wirePresets(byId('arrangement-day').closest('figure'));
		wirePlayButton(byId('arrangement-play'), byId('arrangement-day'), ARRANGEMENT_DAYS_PER_SECOND);
		buildChoice(byId('arrangement-views'), Object.keys(ARRANGEMENT_VIEWS), this.view, name => {
			this.view = name;
			this.update();
		});
		this.update();
	},

	update() {
		const planet = ARRANGEMENT_VIEWS[this.view].planet;
		const jd = FIT_START + readNumber('arrangement-day');
		const now = PlanetArrangement.moment(planet, jd);

		this.state = { jd, planet, now, path: this.path(planet, jd) };
		this.showReadout();
		this.geo.draw();
		this.helio.draw();
	},

	/* P's places in (a) over the synodic period before jd. */
	path(planet, jd) {
		const period = PlanetArrangement.FIT[planet].S;
		const points = [];

		for (let t = jd - period; t <= jd + 1e-9; t += ARRANGEMENT_PATH_STEP) {
			points.push(PlanetArrangement.moment(planet, t).geostatic.P);
		}

		return points;
	},

	/* The direction of P from O, computed in each panel on its own. */
	directions() {
		const { geostatic: g, heliostatic: h } = this.state.now;

		return {
			a: norm360(atan2d(g.P[1] - g.O[1], g.P[0] - g.O[0])),
			b: norm360(atan2d(h.P[1] - h.O[1], h.P[0] - h.O[0])),
			OPa: Math.hypot(g.P[0] - g.O[0], g.P[1] - g.O[1]),
			OPb: Math.hypot(h.P[0] - h.O[0], h.P[1] - h.O[1])
		};
	},

	showReadout() {
		const { jd, now } = this.state;
		const d = this.directions();

		showLines('arrangement-readout', [
			`\\text{${dateYearText(jd)}:}\\quad \\lambda - \\bar\\lambda_\\odot = ${fixed(now.elongation, 1).replace('−', '-')}^\\circ`,
			`\\lambda = ${fixedAngle(d.a, 2)}^\\circ \\text{ in (a)},\\quad ${fixedAngle(d.b, 2)}^\\circ \\text{ in (b)}`,
			`\\text{OP} = ${fixed(d.OPa, 3)} \\text{ in (a)},\\quad ${fixed(d.OPb, 3)}\\ \\text{au in (b)}`
		]);
	},

	/* The scale (px per unit of Ptolemy's deferent) of a panel. */
	scaleOf(owner) {
		return owner.R / ARRANGEMENT_VIEWS[this.view].room;
	},

	/* Panel (a): Ptolemy's model, the Earth O at the center. */
	drawGeostatic() {
		const owner = this.geo;
		const ctx = owner.ctx;

		if (!ctx || !this.state) {
			return;
		}

		const { now, path, planet } = this.state;
		const g = now.geostatic;
		const scale = this.scaleOf(owner);
		const at = point => ({ x: owner.cx + scale * point[0], y: owner.cy - scale * point[1] });
		const O = at(g.O);
		const K = at(g.K);
		const P = at(g.P);
		const S = at(g.S);
		const isMars = planet === 'mars';
		const r = isMars ? MARS.r : PlanetArrangement.VENUS_FIT.r;
		const edge = owner.R;

		ctx.clearRect(0, 0, owner.width, owner.width);
		owner.labels.begin({ x0: 0, y0: 0, x1: owner.width, y1: owner.width });

		// the direction of gamma; the deferent; the path of P
		segment(ctx, O, towards(O, 0, edge), { color: COL.muted, width: 1 });
		circle(ctx, isMars ? at(g.C) : O, scale, { color: COL.deferent, width: 2 });
		this.drawPath(ctx, path.map(at));

		// the epicycle and its radius KP, the line OK; the parallelogram's
		// other two sides, O sun along the mean Sun's direction and sun P
		circle(ctx, K, r * scale, { color: COL.epicycle, width: 2 });
		segment(ctx, K, P, { color: COL.epicycle, width: 1.8 });
		segment(ctx, O, K, { color: COL.deferent, width: 1.4 });
		segment(ctx, O, towards(O, now.sun, edge), { color: COL.sun, width: 1, dash: [2, 4] });

		if (isMars) {
			segment(ctx, O, S, { color: COL.ink, width: 1.4, dash: [5, 4] });
			segment(ctx, S, P, { color: COL.ink, width: 1.4, dash: [5, 4] });
		}

		// the line of sight
		segment(ctx, O, towards(O, now.lambda, edge), { color: COL.planet, width: 1.5 });

		drawDot(ctx, O.x, O.y, 6, COL.earth);

		if (isMars) {
			drawDot(ctx, K.x, K.y, 3.5, COL.ink);
		}

		drawDot(ctx, S.x, S.y, 5, COL.sun);
		drawDot(ctx, P.x, P.y, 6.5, COL.planet);

		// letters only, each on the side clearest of its lines (CLAUDE.md)
		centeredLabel(ctx, 'γ', towards(O, 0, edge - 8), COL.muted, owner.labels);
		labelOutside(
			ctx,
			'O',
			O,
			7,
			clearestDirection([0, now.sun, now.lambda, screenDirection(O, K)]),
			COL.earth,
			owner.labels
		);

		if (isMars) {
			labelOutside(
				ctx,
				'K',
				K,
				4,
				clearestDirection([screenDirection(K, O), screenDirection(K, P), screenDirection(K, O) + 180]),
				COL.ink,
				owner.labels
			);
		}

		labelOutside(
			ctx,
			'☉',
			S,
			5,
			clearestDirection([screenDirection(S, O), screenDirection(S, P), now.sun]),
			COL.sun,
			owner.labels
		);
		labelOutside(
			ctx,
			'P',
			P,
			7,
			clearestDirection([screenDirection(P, O), screenDirection(P, K), screenDirection(P, S)]),
			COL.planet,
			owner.labels
		);
	},

	/* The faint path of P. */
	drawPath(ctx, points) {
		ctx.strokeStyle = withAlpha(COL.planet, 0.35);
		ctx.lineWidth = 1.5;
		ctx.setLineDash([]);
		ctx.beginPath();
		points.forEach((q, i) => (i === 0 ? ctx.moveTo(q.x, q.y) : ctx.lineTo(q.x, q.y)));
		ctx.stroke();
	},

	/* Panel (b): the same points less O sun, the mean Sun at the center, on
	   the scale of (a). */
	drawHeliostatic() {
		const owner = this.helio;
		const ctx = owner.ctx;

		if (!ctx || !this.state) {
			return;
		}

		const { now, planet } = this.state;
		const h = now.heliostatic;

		// the points in au, drawn on the scale of (a): 1 au is O sun there
		const scale = this.scaleOf(owner) / now.scale;
		const at = point => ({ x: owner.cx + scale * point[0], y: owner.cy - scale * point[1] });
		const S = at(h.S);
		const O = at(h.O);
		const P = at(h.P);
		const isMars = planet === 'mars';
		const r = isMars ? MARS.r : PlanetArrangement.VENUS_FIT.r;
		const edge = owner.R;

		ctx.clearRect(0, 0, owner.width, owner.width);
		owner.labels.begin({ x0: 0, y0: 0, x1: owner.width, y1: owner.width });

		// the direction of gamma from sun; the Earth's circle, in the colour
		// of the circle it was in (a); the planet's circle
		segment(ctx, S, towards(S, 0, edge), { color: COL.muted, width: 1 });
		circle(ctx, S, scale, { color: isMars ? COL.epicycle : COL.deferent, width: 2 });

		if (isMars) {
			circle(ctx, at(h.C), now.scale * scale, { color: COL.deferent, width: 2 });
		} else {
			circle(ctx, S, r * scale, { color: COL.epicycle, width: 2 });
		}

		// the triangle O sun P and the line of sight
		segment(ctx, S, O, { color: COL.ink, width: 1.2 });
		segment(ctx, S, P, { color: COL.ink, width: 1.2 });
		segment(ctx, O, towards(O, now.lambda, edge * 1.6), { color: COL.planet, width: 1.5 });

		drawDot(ctx, S.x, S.y, 5, COL.sun);
		drawDot(ctx, O.x, O.y, 6, COL.earth);
		drawDot(ctx, P.x, P.y, 6.5, COL.planet);

		centeredLabel(ctx, 'γ', towards(S, 0, edge - 8), COL.muted, owner.labels);
		labelOutside(
			ctx,
			'☉',
			S,
			5,
			clearestDirection([0, screenDirection(S, O), screenDirection(S, P)]),
			COL.sun,
			owner.labels
		);

		labelOutside(
			ctx,
			'O',
			O,
			7,
			clearestDirection([screenDirection(O, S), now.lambda, now.lambda + 180]),
			COL.earth,
			owner.labels
		);
		labelOutside(
			ctx,
			'P',
			P,
			7,
			clearestDirection([screenDirection(P, O), screenDirection(P, S)]),
			COL.planet,
			owner.labels
		);
	}
};

/* ==========================================================================
   3. FIGURE 3: ONE SCALE
   Static. (a) Ptolemy's five models (PlanetEpicycle.PTOLEMY), each
   deferent drawn the same size, the epicycle at K 30° above the right,
   the Earth O at the center, with the planet's name and its epicycle
   where the deferent is 60; five in a row, or three and two on a phone.
   (b) the circles of the same numbers read as distances
   (PlanetArrangement.PTOLEMY) about the Sun, with the Earth's, out to
   Saturn; (c) the same out to Mars.
   ========================================================================== */

/* The models of (a), from the Sun outwards, and where (b) and (c) name
   each circle (the angle of the name, deg). */
const SCALE_PLANETS = [
	{ planet: 'mercury', name: 'Mercury', angle: 270 },
	{ planet: 'venus', name: 'Venus', angle: -40 },
	{ planet: 'mars', name: 'Mars', angle: 40 },
	{ planet: 'jupiter', name: 'Jupiter', angle: 30 },
	{ planet: 'saturn', name: 'Saturn', angle: 45 }
];

/* Where K sits on each deferent of (a), and the narrowest width (px) at
   which the five models fit in one row. */
const SCALE_K_ANGLE = 30;
const SCALE_ONE_ROW = 520;

const scaleFigure = {
	init() {
		this.models = {
			labels: new LabelPlacer(),
			draw: () => this.drawModels()
		};
		this.outer = { labels: new LabelPlacer(), reach: 10.1, draw: () => this.drawOrbits(this.outer, 'outer') };
		this.inner = { labels: new LabelPlacer(), reach: 1.75, draw: () => this.drawOrbits(this.inner, 'inner') };

		wideCanvas(this.models, byId('ptolemy-canvas'), width => (width >= SCALE_ONE_ROW ? 0.3 : 0.95), 700);
		squareCanvas(this.outer, byId('orbits-canvas'), 380, 10);
		squareCanvas(this.inner, byId('inner-canvas'), 380, 10);
		this.models.draw();
		this.outer.draw();
		this.inner.draw();
	},

	/* Panel (a). */
	drawModels() {
		const owner = this.models;
		const ctx = owner.ctx;

		if (!ctx) {
			return;
		}

		const columns = owner.width >= SCALE_ONE_ROW ? 5 : 3;
		const rows = Math.ceil(SCALE_PLANETS.length / columns);
		const cellWidth = owner.width / columns;
		const cellHeight = owner.height / rows;
		const radius = Math.min(cellWidth * 0.28, cellHeight * 0.26);

		ctx.clearRect(0, 0, owner.width, owner.height);
		owner.labels.begin({ x0: 0, y0: 0, x1: owner.width, y1: owner.height });

		SCALE_PLANETS.forEach((entry, i) => {
			const row = Math.floor(i / columns);
			const inRow = Math.min(columns, SCALE_PLANETS.length - row * columns);
			const left = (owner.width - inRow * cellWidth) / 2;
			const O = {
				x: left + cellWidth * ((i % columns) + 0.5),
				y: cellHeight * (row + 0.42)
			};
			const r = PlanetEpicycle.PTOLEMY[entry.planet].r;
			const K = towards(O, SCALE_K_ANGLE, radius);

			circle(ctx, O, radius, { color: COL.deferent, width: 1.6 });
			circle(ctx, K, r * radius, { color: COL.epicycle, width: 1.6 });
			segment(ctx, O, K, { color: COL.deferent, width: 1 });
			drawDot(ctx, O.x, O.y, 3.5, COL.earth);
			drawDot(ctx, K.x, K.y, 2.5, COL.ink);
			centeredLabel(ctx, entry.name, { x: O.x, y: cellHeight * (row + 0.76) }, COL.ink, null, 'name');
			centeredLabel(
				ctx,
				fixed(60 * r, entry.planet === 'venus' ? 2 : 1),
				{ x: O.x, y: cellHeight * (row + 0.76) + 20 },
				COL.epicycle,
				null,
				'symbol'
			);
		});
	},

	/* Panels (b) and (c): the circles about the Sun, the Earth's in its
	   colour, named at fixed angles (the drawing never moves). */
	drawOrbits(owner, which) {
		const ctx = owner.ctx;

		if (!ctx) {
			return;
		}

		const scale = owner.R / owner.reach;
		const center = { x: owner.cx, y: owner.cy };
		const shown = which === 'outer' ? SCALE_PLANETS : SCALE_PLANETS.slice(0, 3);

		ctx.clearRect(0, 0, owner.width, owner.width);
		owner.labels.begin({ x0: 0, y0: 0, x1: owner.width, y1: owner.width });

		circle(ctx, center, scale, { color: COL.earth, width: 2 });
		shown.forEach(entry => {
			circle(ctx, center, PlanetArrangement.PTOLEMY[entry.planet].a * scale, { color: COL.planet, width: 1.6 });
		});
		drawDot(ctx, center.x, center.y, 4, COL.sun);

		// in (b) the inner circles leave no room for the Sun's symbol
		if (which === 'inner') {
			labelOutside(ctx, '☉', center, 4, 90, COL.sun, owner.labels);
			labelOutside(ctx, 'Earth', towards(center, 140, scale), 0, 140, COL.earth, owner.labels);
		}

		shown.forEach(entry => {
			const a = PlanetArrangement.PTOLEMY[entry.planet].a;

			// in (b) only the circles wide enough to carry a name
			if (which === 'inner' || a > 2) {
				labelOutside(
					ctx,
					entry.name,
					towards(center, entry.angle, a * scale),
					0,
					entry.angle,
					COL.planet,
					owner.labels
				);
			}
		});
	}
};

/* ==========================================================================
   4. FIGURE 5: THE TWO RIGHT TRIANGLES
   Static, to scale. (a) Venus at its greatest elongation: the Earth O on
   its circle about the Sun, the line of sight touching Venus' circle at
   P, the right angle at P, the angle epsilon at O; Venus at the fitted
   0.723 au. (b) Saturn at quadrature: the right angle at O, the angle
   psi at the Sun, 84°, and dashed the line from the Sun one day's motion
   earlier, psi - 360° / S, meeting the line of sight at P' (a = 8.26
   instead of 9.56, tools/numbers/4.3-new-center.js).
   ========================================================================== */

/* The angle of the Earth in (a), seen from the Sun (deg), and the view
   of (b) in au: from x0 to x1, y0 to y1, with the Sun at the origin and
   the Earth at (0, 1). */
const VENUS_EARTH_ANGLE = 215;
const SATURN_VIEW = { x0: -0.7, x1: 10.2, y0: -0.4, y1: 1.5 };

const triangleFigure = {
	init() {
		this.venus = { labels: new LabelPlacer(), draw: () => this.drawVenus() };
		this.saturn = { labels: new LabelPlacer(), draw: () => this.drawSaturn() };

		const view = SATURN_VIEW;

		squareCanvas(this.venus, byId('venus-triangle'), 340, 10);
		wideCanvas(this.saturn, byId('saturn-triangle'), (view.y1 - view.y0) / (view.x1 - view.x0), 700);
		this.venus.draw();
		this.saturn.draw();
	},

	/* Panel (a). */
	drawVenus() {
		const owner = this.venus;
		const ctx = owner.ctx;

		if (!ctx) {
			return;
		}

		const a = PlanetArrangement.FIT.venus.a;
		const scale = owner.R / 1.15;
		const S = { x: owner.cx, y: owner.cy };
		const O = towards(S, VENUS_EARTH_ANGLE, scale);
		const angleAtSun = acos(a);
		const P = towards(S, VENUS_EARTH_ANGLE - angleAtSun, a * scale);
		const toSun = screenDirection(O, S);
		const toPlanet = screenDirection(O, P);

		ctx.clearRect(0, 0, owner.width, owner.width);
		owner.labels.begin({ x0: 0, y0: 0, x1: owner.width, y1: owner.width });

		circle(ctx, S, scale, { color: COL.earth, width: 1.6 });
		circle(ctx, S, a * scale, { color: COL.epicycle, width: 1.6 });
		segment(ctx, S, O, { color: COL.ink, width: 1.4 });
		segment(ctx, S, P, { color: COL.ink, width: 1.4 });
		segment(ctx, O, towards(O, toPlanet, Math.hypot(P.x - O.x, P.y - O.y) + 40), {
			color: COL.planet,
			width: 1.6
		});
		rightAngleMark(ctx, P, O, S, 9);
		screenArc(ctx, O, 34, toPlanet, toSun, { color: COL.ink, width: 1.4 });

		drawDot(ctx, S.x, S.y, 5, COL.sun);
		drawDot(ctx, O.x, O.y, 6, COL.earth);
		drawDot(ctx, P.x, P.y, 6, COL.planet);

		const middle = (u, v) => ({ x: (u.x + v.x) / 2, y: (u.y + v.y) / 2 });

		labelOutside(ctx, '☉', S, 5, VENUS_EARTH_ANGLE + 180, COL.sun, owner.labels);
		labelOutside(ctx, 'O', O, 7, VENUS_EARTH_ANGLE, COL.earth, owner.labels);
		labelOutside(ctx, 'P', P, 7, VENUS_EARTH_ANGLE - angleAtSun, COL.planet, owner.labels);
		centeredLabel(ctx, 'ε', towards(O, (toPlanet + toSun) / 2, 46), COL.ink, owner.labels);
		labelOutside(ctx, '1', middle(S, O), 3, toSun - 90, COL.ink, owner.labels);
		labelOutside(ctx, 'a', middle(S, P), 3, screenDirection(S, P) + 90, COL.ink, owner.labels);
	},

	/* Panel (b). */
	drawSaturn() {
		const owner = this.saturn;
		const ctx = owner.ctx;

		if (!ctx) {
			return;
		}

		const view = SATURN_VIEW;
		const scale = owner.width / (view.x1 - view.x0);
		const at = (x, y) => ({ x: scale * (x - view.x0), y: scale * (view.y1 - y) });
		const a = PlanetArrangement.FIT.saturn.a;
		const psi = PlanetArrangement.quadratureAngle(a);
		const early = psi - 360 / PlanetArrangement.FIT.saturn.S;
		const S = at(0, 0);
		const O = at(0, 1);
		const P = at(Math.sqrt(a * a - 1), 1);
		const P2 = at(Math.tan((early * Math.PI) / 180), 1);

		ctx.clearRect(0, 0, owner.width, owner.height);
		owner.labels.begin({ x0: 0, y0: 0, x1: owner.width, y1: owner.height });

		// an arc of the Earth's circle; the line of sight; the two lines
		// from the Sun
		ctx.strokeStyle = COL.earth;
		ctx.lineWidth = 1.6;
		ctx.beginPath();
		ctx.arc(S.x, S.y, scale, (-90 - 40) * (Math.PI / 180), (-90 + 40) * (Math.PI / 180));
		ctx.stroke();
		segment(ctx, O, at(view.x1, 1), { color: COL.planet, width: 1.6 });
		segment(ctx, S, O, { color: COL.ink, width: 1.4 });
		segment(ctx, S, P, { color: COL.ink, width: 1.4 });
		segment(ctx, S, P2, { color: COL.ink, width: 1.2, dash: [5, 4] });
		rightAngleMark(ctx, O, S, P, 8);
		screenArc(ctx, S, 0.55 * scale, 90 - psi, 90, { color: COL.ink, width: 1.4 });

		drawDot(ctx, S.x, S.y, 5, COL.sun);
		drawDot(ctx, O.x, O.y, 6, COL.earth);
		drawDot(ctx, P2.x, P2.y, 4, COL.muted);
		drawDot(ctx, P.x, P.y, 6, COL.planet);

		labelOutside(ctx, '☉', S, 5, 180, COL.sun, owner.labels);
		labelOutside(ctx, 'O', O, 7, 120, COL.earth, owner.labels);
		labelOutside(ctx, 'P', P, 7, 90, COL.planet, owner.labels);
		labelOutside(ctx, 'P′', P2, 5, 90, COL.muted, owner.labels);
		centeredLabel(ctx, 'ψ', towards(S, 90 - psi / 2, 0.55 * scale + 12), COL.ink, owner.labels);
	}
};

/* ==========================================================================
   5. FIGURE 4: THE ERROR CURVE OF THE EPICYCLET
   Page 4.2's Mars with Copernicus' eccentric and epicyclet in place of
   the deferent and the equant (PlanetArrangement.makeEpicyclet, the same
   parameters) against the reference Mars, in degrees, with page 4.2's
   equant as a ghost. Over 2016 - 2019, where the two are drawn as
   lines and part by up to 22' at the opposition of 2016, and over the
   sixteen years of page 4.2's fit, 2010 - 2025; dots at the oppositions.
   No slider changes a model, so the widget fits its scale to each span.
   (Copernicus' arrangement itself gives page 4.2's directions exactly,
   so its error curve is page 4.2's Figure 7.)
   ========================================================================== */

/* The four years shown first: around the opposition of 2016. */
const ERROR_START = Time.julianDay(2016, 1, 1);
const ERROR_END = Time.julianDay(2020, 1, 1);

const errorFigure = {
	init() {
		const curve = new ErrorCurve(byId('error-mars'), {
			body: 'mars',
			start: ERROR_START,
			end: ERROR_END,
			spans: [
				{ label: '4 years', years: 4 },
				{ label: '16 years', years: 16 }
			],
			units: 'deg',
			ghostButtons: false
		});
		const epicyclet = PlanetArrangement.makeEpicyclet(MARS);
		const oppositions = PlanetEpicycle.referenceEvents('mars', 'outer', FIT_START - 200, FIT_END, {
			apparent: false,
			step: 2
		})
			.loops.map(loop => loop.middle)
			.filter(jd => jd >= FIT_START);

		curve.addGhost({
			label: "page 4.2's equant",
			short: "page 4.2's equant",
			color: COL.deferent,
			fn: PlanetEquant.make(MARS)
		});
		curve.addModel({
			label: "Copernicus' epicyclet in place of the equant",
			short: "Copernicus' epicyclet",
			color: COL.earth,
			fn: epicyclet
		});
		curve.addMarks({
			label: 'the epicyclet at the oppositions',
			color: COL.earth,
			fn: epicyclet,
			dates: oppositions,
			maxYears: 16.5
		});
	}
};

/* ==========================================================================
   6. FIGURE 6: MARS' DISTANCE
   Static, 2010 - 2025, every day. (a) Mars' distance from the Earth:
   the reference (geometric), page 4.2's equant in Copernicus'
   arrangement, and the same with e = 0 (a concentric deferent: a circle
   of radius a about the mean Sun) faint and dashed; (b) the model less the reference. The real
   Mars runs from 0.38 to 2.68 au, the model is within 0.0204 au
   (tools/numbers/4.3-new-center.js): the axes are 0 to 2.8 au and
   +-0.03 au.
   ========================================================================== */

const DISTANCE_RANGE = [0, 2.8];
const DISTANCE_ERROR_RANGE = [-0.03, 0.03];

/* Page 4.2's Mars with a concentric deferent (e = 0): on a circle about
   the mean Sun. */
const MARS_CIRCLE = Object.assign({}, MARS, { e: 0 });

const distanceFigure = {
	samples: null,

	init() {
		const model = PlanetArrangement.makeDistance('mars');
		const xs = [];
		const real = [];
		const fitted = [];
		const plain = [];
		const errors = [];

		for (let jd = FIT_START; jd <= FIT_END; jd += 1) {
			const d = geometric('mars', jd).dist;
			const m = model(jd);
			const s = PlanetEquant.state(MARS_CIRCLE, jd);
			const c = PlanetEquant.construction(MARS_CIRCLE, s);

			xs.push(yearOf(jd));
			real.push(d);
			fitted.push(m);
			plain.push(Math.hypot(c.planet[0], c.planet[1]) / MARS.r);
			errors.push(m - d);
		}

		this.samples = { xs, real, fitted, plain, errors };

		const options = {
			x: [yearOf(FIT_START), yearOf(FIT_END)],
			xLabel: 'year',
			xTicks: yearTicks(2),
			aspect: 0.4,
			maxHeight: 300,
			minHeight: 200
		};

		this.distance = new Plot2D(
			byId('distance-plot'),
			Object.assign({}, options, {
				y: DISTANCE_RANGE,
				yLabel: 'distance (au)',
				onDraw: () => this.drawDistance()
			})
		);
		this.error = new Plot2D(
			byId('distance-error'),
			Object.assign({}, options, {
				y: DISTANCE_ERROR_RANGE,
				yLabel: 'model − real (au)',
				aspect: 0.3,
				onDraw: () => this.drawError()
			})
		);
	},

	drawDistance() {
		const p = this.distance;

		if (!this.samples) {
			return;
		}

		const { xs, real, fitted, plain } = this.samples;

		p.frame();
		p.curve(xs, plain, { color: COL.epicycle, width: 1.5, dash: [6, 5], alpha: 0.6 });
		p.curve(xs, real, { color: COL.planet, width: 3.5 });
		p.curve(xs, fitted, { color: COL.deferent, width: 1.5 });
	},

	drawError() {
		const p = this.error;

		if (!this.samples) {
			return;
		}

		p.frame();
		p.hline(0, { color: COL.ink, width: 1 });
		p.curve(this.samples.xs, this.samples.errors, { color: COL.deferent, width: 1.8 });
	}
};

/* ==========================================================================
   7. PAGE START
   Shared components first (they typeset the prose), then the figures.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
	Site.initPage();
	startFigures([elongationFigure, arrangementFigure, scaleFigure, triangleFigure, errorFigure, distanceFigure]);
});
