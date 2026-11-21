// @ts-check
/* ==========================================================================
   PAGE 4.3 · SAME GEOMETRY, NEW CENTER - SCRIPT (page.js)
   Eight figures, each with its own init and draw (and update when it has
   controls), in the order of the page:
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
	 4. the loops                 (2D, static: (a) the Earth and Mars on
								   their circles every 15 days about an
								   opposition, with the lines of sight;
								   (b) the ecliptic longitude of Mars seen
								   from the Earth)
	 5. the epicyclet             (2D: page 4.2's deferent and equant beside
								   Copernicus' eccentric with an epicyclet,
								   e three times Mars'; mean anomaly, play)
	 6. the error curve           (Mars with Copernicus' epicyclet, page
								   4.2's equant as ghost, 2016 - 2019; and
								   the difference of the two, 2010 - 2025)
	 7. the two right triangles   (2D, static: (a) Venus at greatest
								   elongation; (b) Saturn at quadrature, and
								   the same a day earlier)
	 8. Mars' distance            (2D, static: (a) the distance from the
								   Earth at each opposition, real, model and
								   model without the eccentricity; (b) model
								   less real, 2010 - 2025)
   Shared code: common.js, time.js, ephemeris.js, models/mean-sun.js,
   models/precession.js, models/planet-epicycle.js, models/planet-equant.js,
   models/planet-arrangement.js, plot2d.js, errorcurve.js, components.js.
   Every number quoted in the prose, and every fixed scale, comes from
   tools/numbers/4.3-new-center.js.

   TABLE OF CONTENTS
	 0. Helpers shared by the figures
	 1. Figure 1: the elongations
	 2. Figure 2: the two descriptions
	 3. Figure 3: one scale
	 4. Figure 4: the loops from the Earth's motion
	 5. Figure 5: the epicyclet beside the equant
	 6. Figure 6: the error curve of the epicyclet
	 7. Figure 7: the two right triangles
	 8. Figure 8: Mars' distance
	 9. Page start
   ========================================================================== */

/* ==========================================================================
   0. HELPERS SHARED BY THE FIGURES
   ========================================================================== */

/* The years of page 4.2's fit, over which Figures 2, 6 and 8 run. */
const FIT_START = Time.julianDay(2010, 1, 1);
const FIT_END = Time.julianDay(2026, 1, 1);

/* Page 4.2's Mars, which this page moves into Copernicus' arrangement. */
const MARS = PlanetEquant.MARS_FIT;

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

/* The oppositions of Mars in [start, end] (JD), from geometric positions:
   a daily scan of the elongation less 180°, which falls through zero at
   an opposition (Mars falls behind the Sun), each change of sign refined
   by bisection. The numbers script finds the same dates from apparent
   positions, minutes away. */
function marsOppositions(start, end) {
	const offset = jd => norm180(geometric('mars', jd).lon - Ephem.sun(jd, { apparent: false }).lon - 180);
	const found = [];
	let before = offset(start);

	for (let jd = start + 1; jd <= end; jd += 1) {
		const now = offset(jd);

		// a change of sign near 0, not the jump at +-180 (a conjunction)
		if (before > 0 && now <= 0 && before < 90) {
			let lo = jd - 1;
			let hi = jd;

			for (let k = 0; k < 30; k++) {
				const middle = (lo + hi) / 2;

				if (offset(middle) > 0) {
					lo = middle;
				} else {
					hi = middle;
				}
			}

			found.push((lo + hi) / 2);
		}

		before = now;
	}

	return found;
}

/* ==========================================================================
   1. FIGURE 1: THE ELONGATIONS
   Static. The elongation of each planet from the true Sun, every day
   of 2022 - 2025 in the reference sky: (a) Venus and Mercury, signed,
   east of the Sun positive; (b) Mars, Jupiter and Saturn, 0° to 360° east
   of the Sun. Thick where the planet goes back among the stars (its
   ecliptic longitude decreasing). Venus reaches 47.2°, Mercury 27.4°
   (tools/numbers/4.3-new-center.js), so (a) is drawn from -50° to 50°.
   In (a) each name sits in an empty place beside its own curve: Venus
   left of its rising branch before the greatest elongation of January
   2025, above Mercury's highest elongations; Mercury above its peaks of
   2022, from the left edge, while Venus is far below. In (b) the three lines cross
   the panel every year or so, and on a phone no name fits between
   them, so a legend names them.
   ========================================================================== */

const ELONGATION_START = Time.julianDay(2022, 1, 1);
const ELONGATION_END = Time.julianDay(2026, 1, 1);
const INNER_RANGE = [-50, 50];
const OUTER_RANGE = [0, 360];

/* The planets of each panel, their colours, and in (a) the place of each
   name (year, elongation, alignment). */
const ELONGATION_PLANETS = {
	inner: [
		{ planet: 'venus', name: bodyName('Venus'), color: COL.epicycle, label: { x: 2024.75, y: 42, align: 'right' } },
		{ planet: 'mercury', name: bodyName('Mercury'), color: COL.earth, label: { x: 2022.03, y: 43, align: 'left' } }
	],
	outer: [
		{ planet: 'mars', name: bodyName('Mars'), color: COL.planet },
		{ planet: 'jupiter', name: bodyName('Jupiter'), color: COL.deferent },
		{ planet: 'saturn', name: bodyName('Saturn'), color: COL.earth }
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
			xLabel: tr('year', 'anno'),
			xTicks: yearTicks(1),
			aspect: 0.32,
			maxHeight: 280,
			minHeight: 200
		};

		this.inner = new Plot2D(
			byId('elongation-inner'),
			Object.assign({}, options, {
				y: INNER_RANGE,
				yLabel: tr('elongation (°)', 'elongazione (°)'),
				onDraw: () => this.draw(this.inner, 'inner')
			})
		);
		this.outer = new Plot2D(
			byId('elongation-outer'),
			Object.assign({}, options, {
				y: OUTER_RANGE,
				yLabel: tr('elongation (°)', 'elongazione (°)'),
				yTicks: quarterTicks,
				onDraw: () => this.draw(this.outer, 'outer')
			})
		);
		Plot2D.legend(
			byId('elongation-legend'),
			ELONGATION_PLANETS.outer.map(entry => ({ label: entry.name, color: entry.color }))
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
	   opposition), each planet thin, thick where it goes back; in (a) the
	   names. */
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

		// the names, after every curve, at their fixed places
		ELONGATION_PLANETS[panel]
			.filter(entry => entry.label)
			.forEach(entry => {
				p.text(entry.name, entry.label.x, entry.label.y, {
					color: entry.color,
					kind: 'name',
					align: entry.label.align,
					baseline: 'middle',
					dx: 0,
					dy: 0
				});
			});
	}
};

/* ==========================================================================
   2. FIGURE 2: THE TWO DESCRIPTIONS
   One moment of page 4.2's Mars, or of Venus fitted on this page, in
   two panels on the same scale: (a) Ptolemy's model about the Earth O,
   with the deferent, the epicycle, the point sun at the end of KP drawn
   from O and the parallelogram O K P sun; (b) the same points moved by
   -O sun, so that sun stands still: the Earth's circle, the planet's
   circle (for Mars, page 4.2's deferent, centered where C was relative
   to O), and the triangle O sun P. Each circle and each side keeps its
   colour, green for the deferent and OK, violet for the epicycle and
   KP, so the reader sees the two vectors exchange their places and which
   of Ptolemy's circles becomes the Earth's. The date runs over
   2010 - 2025.
   ========================================================================== */

/* Play: a synodic period of Mars in about twenty seconds. */
const ARRANGEMENT_DAYS_PER_SECOND = 40;

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
		buildChoice(
			byId('arrangement-views'),
			Object.keys(ARRANGEMENT_VIEWS),
			this.view,
			name => {
				this.view = name;
				this.update();
			},
			bodyName
		);
		this.update();
	},

	update() {
		const planet = ARRANGEMENT_VIEWS[this.view].planet;
		const jd = FIT_START + readNumber('arrangement-day');
		const now = PlanetArrangement.moment(planet, jd);

		this.state = { jd, planet, now };
		this.showReadout();
		this.geo.draw();
		this.helio.draw();
	},

	/* The direction of P from O, computed in each panel on its own. */
	directions() {
		const { geostatic: g, heliostatic: h } = this.state.now;

		return {
			a: norm360(atan2d(g.P[1] - g.O[1], g.P[0] - g.O[0])),
			b: norm360(atan2d(h.P[1] - h.O[1], h.P[0] - h.O[0]))
		};
	},

	/* The elongation from the mean Sun, to 0.01° so that Exercise 1 can
	   read the model's greatest elongation of Venus (46.27°), and the
	   direction of P computed in each panel. */
	showReadout() {
		const { jd, now } = this.state;
		const d = this.directions();

		showLines('arrangement-readout', [
			`\\text{${dateYearText(jd)}:}\\quad \\lambda - \\bar\\lambda_\\odot = ${fixed(now.elongation, 2).replace('−', '-')}^\\circ`,
			tr(
				`\\lambda = ${fixedAngle(d.a, 2)}^\\circ \\text{ in (a)},\\quad ${fixedAngle(d.b, 2)}^\\circ \\text{ in (b)}`,
				`\\lambda = ${fixedAngle(d.a, 2)}^\\circ \\text{ in (a)},\\quad ${fixedAngle(d.b, 2)}^\\circ \\text{ in (b)}`
			)
		]);
	},

	/* The scale (px per unit of Ptolemy's deferent) of a panel. */
	scaleOf(owner) {
		return owner.R / ARRANGEMENT_VIEWS[this.view].room;
	},

	/* The colours of the two vectors: OK (and its copy sun P) is green,
	   KP (and its copy O sun) is violet. For Venus K is sun itself, so
	   O sun is OK, and sun P is KP. */
	sideColors() {
		const isMars = this.state.planet === 'mars';

		return {
			Osun: isMars ? COL.epicycle : COL.deferent,
			sunP: isMars ? COL.deferent : COL.epicycle
		};
	},

	/* Panel (a): Ptolemy's model, the Earth O at the center. */
	drawGeostatic() {
		const owner = this.geo;
		const ctx = owner.ctx;

		if (!ctx || !this.state) {
			return;
		}

		const { now, planet } = this.state;
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

		// the direction of gamma; the deferent and the epicycle
		segment(ctx, O, towards(O, 0, edge), { color: COL.muted, width: 1 });
		circle(ctx, isMars ? at(g.C) : O, scale, { color: COL.deferent, width: 2 });
		circle(ctx, K, r * scale, { color: COL.epicycle, width: 2 });

		// the sides OK and KP; for Mars the copies that close the
		// parallelogram, dashed: O sun (violet, as KP) and sun P (green,
		// as OK). For Venus K is sun, and the two sides are O sun and sun P.
		segment(ctx, O, K, { color: COL.deferent, width: 1.8 });
		segment(ctx, K, P, { color: COL.epicycle, width: 1.8 });

		if (isMars) {
			segment(ctx, O, S, { color: COL.epicycle, width: 1.8, dash: [5, 4] });
			segment(ctx, S, P, { color: COL.deferent, width: 1.8, dash: [5, 4] });
		}

		// the line of sight
		segment(ctx, O, towards(O, now.lambda, edge), { color: COL.planet, width: 1.5 });

		drawDot(ctx, O.x, O.y, 6, COL.earth);

		if (isMars) {
			drawDot(ctx, K.x, K.y, 3.5, COL.ink);
		}

		drawDot(ctx, S.x, S.y, 5, COL.sun);
		drawDot(ctx, P.x, P.y, 6.5, COL.planet);

		// letters only (CLAUDE.md), each on a side of its point that turns
		// smoothly with the construction, so that it passes over a line
		// for a moment rather than jumping to the other side of its
		// point: O opposite the line of sight, K outward from the
		// deferent's center, the Sun outward from O, P off the line of
		// sight, which it never crosses
		centeredLabel(ctx, 'γ', towards(O, 0, edge - 8), COL.muted, owner.labels);
		labelOutside(ctx, 'O', O, 7, now.lambda + 180, COL.earth, owner.labels);

		if (isMars) {
			labelOutside(ctx, 'K', K, 4, screenDirection(at(g.C), K), COL.ink, owner.labels);
		}

		labelOutside(ctx, '☉', S, 5, screenDirection(O, S), COL.sun, owner.labels);
		labelOutside(ctx, 'P', P, 7, now.lambda + SIGHT_NAME_TURN, COL.planet, owner.labels);
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
		const colors = this.sideColors();

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
		circle(ctx, S, scale, { color: colors.Osun, width: 2 });

		if (isMars) {
			circle(ctx, at(h.C), now.scale * scale, { color: COL.deferent, width: 2 });
		} else {
			circle(ctx, S, r * scale, { color: COL.epicycle, width: 2 });
		}

		// the triangle O sun P, each side in its colour of (a), and the line
		// of sight
		segment(ctx, S, O, { color: colors.Osun, width: 1.8 });
		segment(ctx, S, P, { color: colors.sunP, width: 1.8 });
		segment(ctx, O, towards(O, now.lambda, edge * 1.6), { color: COL.planet, width: 1.5 });

		drawDot(ctx, S.x, S.y, 5, COL.sun);
		drawDot(ctx, O.x, O.y, 6, COL.earth);
		drawDot(ctx, P.x, P.y, 6.5, COL.planet);

		// as in (a): the Sun opposite the Earth, O outward from the Sun,
		// P off the line of sight
		centeredLabel(ctx, 'γ', towards(S, 0, edge - 8), COL.muted, owner.labels);
		labelOutside(ctx, '☉', S, 5, screenDirection(O, S), COL.sun, owner.labels);
		labelOutside(ctx, 'O', O, 7, screenDirection(S, O), COL.earth, owner.labels);
		labelOutside(ctx, 'P', P, 7, now.lambda + SIGHT_NAME_TURN, COL.planet, owner.labels);
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
   Saturn, and dashed the square that (c) enlarges; (c) the same out to
   Mars, where the Earth's circle is named. Mercury and Venus are named
   below their circles, one above the other, in the gaps between the
   circles.
   ========================================================================== */

/* The models of (a), from the Sun outwards, and where (b) and (c) name
   each circle (the angle of the name, deg). */
const SCALE_PLANETS = [
	{ planet: 'mercury', name: bodyName('Mercury'), angle: 270 },
	{ planet: 'venus', name: bodyName('Venus'), angle: 270 },
	{ planet: 'mars', name: bodyName('Mars'), angle: 40 },
	{ planet: 'jupiter', name: bodyName('Jupiter'), angle: 30 },
	{ planet: 'saturn', name: bodyName('Saturn'), angle: 45 }
];

/* Where K sits on each deferent of (a), and the narrowest width (px) at
   which the five models fit in one row. */
const SCALE_K_ANGLE = 30;
const SCALE_ONE_ROW = 520;

/* The reach (au) of (b) and (c), from the Sun to the edge of the
   drawing: Saturn's circle, 9.23 au, and Mars', 1.52 au, with room for
   their names. */
const SCALE_REACH = { outer: 10.1, inner: 1.75 };

const scaleFigure = {
	init() {
		this.models = {
			labels: new LabelPlacer(),
			draw: () => this.drawModels()
		};
		this.outer = {
			labels: new LabelPlacer(),
			reach: SCALE_REACH.outer,
			draw: () => this.drawOrbits(this.outer, 'outer')
		};
		this.inner = {
			labels: new LabelPlacer(),
			reach: SCALE_REACH.inner,
			draw: () => this.drawOrbits(this.inner, 'inner')
		};

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

		// in (b), the square that (c) shows: the half-width of (c)'s canvas
		// in au, on the scale of (b)
		if (which === 'outer' && this.inner.R) {
			const half = (this.inner.width / 2) * (SCALE_REACH.inner / this.inner.R) * scale;

			ctx.strokeStyle = COL.ink;
			ctx.lineWidth = 1;
			ctx.setLineDash([4, 3]);
			ctx.strokeRect(center.x - half, center.y - half, 2 * half, 2 * half);
			ctx.setLineDash([]);
		}

		// in (b) the inner circles leave no room for the Sun's symbol, nor
		// for the Earth's name
		if (which === 'inner') {
			labelOutside(ctx, '☉', center, 4, 90, COL.sun, owner.labels);
			labelOutside(ctx, tr('Earth', 'Terra'), towards(center, 140, scale), 0, 140, COL.earth, owner.labels);
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
   4. FIGURE 4: THE LOOPS FROM THE EARTH'S MOTION
   Static, to scale, on the circles of this page: the Earth at 1 au
   moving at the mean Sun's rate, Mars at the fitted distance a, slower
   by one turn in its synodic period S. Nine places 15 days apart, the
   opposition in the middle, at the top of the drawing. (a) The Sun, the
   two circles, the numbered places of the Earth, the places of Mars and
   the line of sight from each Earth to its Mars. (b) The ecliptic
   longitude of Mars seen from the Earth, from its value at opposition,
   against the days from opposition: thin, thick where it goes back (as
   in Figure 1), with the nine places numbered. Over 65 days either side
   it stays within 8.1° of the opposition, so the axis is +-10°
   (tools/numbers/4.3-new-center.js).
   ========================================================================== */

/* The places (days from the opposition), the span of (b) (days), and
   the axis of (b) (deg). */
const LOOP_PLACES = [-60, -45, -30, -15, 0, 15, 30, 45, 60];
const LOOP_DAYS = [-65, 65];
const LOOP_RANGE = [-10, 10];

/* The view of (a) in au, the Sun at the origin and the opposition
   straight up; and where the circles are named (deg from the Sun): Mars
   outside its circle, the Earth inside its own, below the places, where
   a phone leaves no room outside. */
const LOOP_VIEW = { x0: -1.6, x1: 1.6, y0: -0.25, y1: 2.2 };
const LOOP_NAMES = { earth: 168, mars: 136 };

/* The places of the Earth and Mars (au) t days from the opposition, the
   opposition straight up (90°), both moving anticlockwise. */
function loopPlaces(t) {
	const nEarth = MeanSun.MODERN.n;
	const nMars = nEarth - 360 / PlanetArrangement.FIT.mars.S;
	const a = PlanetArrangement.FIT.mars.a;

	return {
		earth: [cos(90 + nEarth * t), sin(90 + nEarth * t)],
		mars: [a * cos(90 + nMars * t), a * sin(90 + nMars * t)]
	};
}

/* The direction of Mars from the Earth t days from the opposition, from
   its direction at opposition (deg, east positive). */
function loopDirection(t) {
	const { earth, mars } = loopPlaces(t);

	return norm180(atan2d(mars[1] - earth[1], mars[0] - earth[0]) - 90);
}

const loopFigure = {
	samples: null,

	init() {
		const xs = [];
		const values = [];
		const back = [];

		for (let t = LOOP_DAYS[0]; t <= LOOP_DAYS[1] + 1e-9; t += 0.5) {
			const value = loopDirection(t);

			xs.push(t);
			values.push(value);
			back.push(loopDirection(t + 0.5) < value ? value : NaN);
		}

		this.samples = { xs, values, back };

		this.plan = { labels: new LabelPlacer(), draw: () => this.drawPlan() };

		const view = LOOP_VIEW;

		wideCanvas(this.plan, byId('loop-plan'), (view.y1 - view.y0) / (view.x1 - view.x0), 420);

		this.directions = new Plot2D(byId('loop-directions'), {
			x: LOOP_DAYS,
			y: LOOP_RANGE,
			xLabel: tr('days from opposition', "giorni dall'opposizione"),
			yLabel: tr('λ − λ at opposition (°)', "λ − λ all'opposizione (°)"),
			aspect: 0.87,
			maxHeight: 380,
			minHeight: 240,
			onDraw: () => this.drawDirections()
		});
		this.plan.draw();
	},

	/* Panel (a). */
	drawPlan() {
		const owner = this.plan;
		const ctx = owner.ctx;

		if (!ctx) {
			return;
		}

		const view = LOOP_VIEW;
		const scale = owner.width / (view.x1 - view.x0);
		const at = point => ({ x: scale * (point[0] - view.x0), y: scale * (view.y1 - point[1]) });
		const sun = at([0, 0]);
		const a = PlanetArrangement.FIT.mars.a;

		ctx.clearRect(0, 0, owner.width, owner.height);
		owner.labels.begin({ x0: 0, y0: 0, x1: owner.width, y1: owner.height });

		circle(ctx, sun, scale, { color: COL.earth, width: 1.6 });
		circle(ctx, sun, a * scale, { color: COL.planet, width: 1.6 });

		// the lines of sight, from each place of the Earth through Mars and
		// on out of the drawing
		LOOP_PLACES.forEach(t => {
			const { earth, mars } = loopPlaces(t);
			const E = at(earth);
			const M = at(mars);

			segment(ctx, E, towards(E, screenDirection(E, M), 3 * scale), { color: COL.planet, width: 1 });
		});

		// the places, and the numbers of the Earth's, towards the Sun
		LOOP_PLACES.forEach((t, i) => {
			const { earth, mars } = loopPlaces(t);
			const E = at(earth);
			const M = at(mars);

			drawDot(ctx, E.x, E.y, 4.5, COL.earth);
			drawDot(ctx, M.x, M.y, 4, COL.planet);
			centeredLabel(ctx, String(i + 1), towards(E, screenDirection(E, sun), 15), COL.ink, owner.labels, 'symbol');
		});

		drawDot(ctx, sun.x, sun.y, 5, COL.sun);
		labelOutside(ctx, '☉', sun, 5, 180, COL.sun, owner.labels);
		labelOutside(
			ctx,
			tr('Earth', 'Terra'),
			towards(sun, LOOP_NAMES.earth, scale),
			0,
			LOOP_NAMES.earth + 180,
			COL.earth,
			owner.labels
		);
		labelOutside(
			ctx,
			tr('Mars', 'Marte'),
			towards(sun, LOOP_NAMES.mars, a * scale),
			0,
			LOOP_NAMES.mars,
			COL.planet,
			owner.labels
		);
	},

	/* Panel (b): the numbers on the side away from the curve, above at the
	   eastern station, below at the western one. */
	drawDirections() {
		const p = this.directions;

		if (!this.samples) {
			return;
		}

		const { xs, values, back } = this.samples;
		const sides = [
			{ dx: -8, dy: -6, align: 'right' },
			{ dx: 0, dy: -9, align: 'center' },
			{ dx: 0, dy: -9, align: 'center' },
			{ dx: 8, dy: -6, align: 'left' },
			{ dx: 8, dy: -6, align: 'left' },
			{ dx: 8, dy: -6, align: 'left' },
			{ dx: 0, dy: 24, align: 'center' },
			{ dx: 0, dy: 24, align: 'center' },
			{ dx: -8, dy: -6, align: 'right' }
		];

		p.frame();
		p.hline(0, { color: COL.ink, width: 1 });
		p.curve(xs, values, { color: COL.planet, width: 1.4 });
		p.curve(xs, back, { color: COL.planet, width: 4.5 });

		LOOP_PLACES.forEach((t, i) => {
			const value = loopDirection(t);

			p.marker(t, value, { color: COL.planet, radius: 4.5 });
			p.text(String(i + 1), t, value, Object.assign({ color: COL.ink, kind: 'symbol' }, sides[i]));
		});
	}
};

/* ==========================================================================
   5. FIGURE 5: THE EPICYCLET BESIDE THE EQUANT
   Page 4.2's deferent of Mars, moved to the Sun (its center C at e, its
   equant Q at 2e), and Copernicus' eccentric with an epicyclet (V 4):
   the center D of his deferent at 3/2 e, the epicyclet of radius e / 2
   carried uniformly about D, the planet on it turning once for each turn
   of the deferent, counted from the deferent's radius
   (PlanetArrangement.epicyclet). The apsidal line to the right. The
   radius 1 of the deferent, the eccentricity three times Mars' (0.301),
   so that the epicyclet can be seen; the two points then part by at most
   0.047, at M = 90° and 270° (tools/numbers/4.3-new-center.js). The
   mean anomaly M runs over a turn; play.
   ========================================================================== */

/* The eccentricity drawn, and the room of the drawing about D (units of
   the deferent): the drawing reaches 1.603 from the Sun to the right,
   0.70 to the left, 1.15 up and down. */
const EPICYCLET_E = 3 * MARS.e;
const EPICYCLET_ROOM = 1.24;

/* Play: a turn of M in twelve seconds. */
const EPICYCLET_DEG_PER_SECOND = 30;

const epicycletFigure = {
	init() {
		this.owner = { labels: new LabelPlacer(), draw: () => this.draw() };
		squareCanvas(this.owner, byId('epicyclet-canvas'), 400, 10);

		wireSlider(
			byId('epicyclet-anomaly'),
			() => this.owner.draw(),
			value => `${fixed(Number(value), 0)}°`
		);
		wirePlayButton(byId('epicyclet-play'), byId('epicyclet-anomaly'), EPICYCLET_DEG_PER_SECOND);
		this.owner.draw();
	},

	draw() {
		const owner = this.owner;
		const ctx = owner.ctx;

		if (!ctx) {
			return;
		}

		const e = EPICYCLET_E;
		const M = readNumber('epicyclet-anomaly');
		const scale = owner.R / EPICYCLET_ROOM;

		// the Sun at the origin, D at the center of the canvas
		const at = point => ({
			x: owner.cx + scale * (point[0] - 1.5 * e),
			y: owner.cy - scale * point[1]
		});
		const sun = at([0, 0]);
		const C = at([e, 0]);
		const D = at([1.5 * e, 0]);
		const Q = at([2 * e, 0]);

		// the equant's point K, and Copernicus': the center A of the
		// epicyclet, uniform about D, and the planet on the epicyclet
		const K = at(PlanetEquant.centreOfEpicycle(M, e, 2 * e));
		const A = at([1.5 * e + cos(M), sin(M)]);
		const P = at(PlanetArrangement.epicyclet(M, e).point);

		ctx.clearRect(0, 0, owner.width, owner.width);
		owner.labels.begin({ x0: 0, y0: 0, x1: owner.width, y1: owner.width });

		// the apsidal line, across the drawing
		segment(ctx, at([1.5 * e - EPICYCLET_ROOM, 0]), at([1.5 * e + EPICYCLET_ROOM, 0]), {
			color: COL.muted,
			width: 1
		});

		// page 4.2's deferent about C, and the line from the equant Q, which
		// turns uniformly
		circle(ctx, C, scale, { color: COL.deferent, width: 2 });
		segment(ctx, Q, K, { color: COL.deferent, width: 1.6 });

		// Copernicus' deferent about D, its radius to A, which turns
		// uniformly, the epicyclet and its radius to the planet
		circle(ctx, D, scale, { color: COL.earth, width: 1.6 });
		segment(ctx, D, A, { color: COL.earth, width: 1.6 });
		circle(ctx, A, (e / 2) * scale, { color: COL.earth, width: 1.6 });
		segment(ctx, A, P, { color: COL.earth, width: 1.6 });

		drawDot(ctx, sun.x, sun.y, 5, COL.sun);
		[C, D, Q].forEach(point => drawDot(ctx, point.x, point.y, 3, COL.ink));
		drawDot(ctx, K.x, K.y, 6, COL.deferent);
		drawDot(ctx, P.x, P.y, 4, COL.earth);

		// the fixed points, single letters (CLAUDE.md) that keep their
		// side of the apsidal line: D, Q and the Sun below, C above,
		// between them. A turning line passes over D or Q for a moment
		// once a turn, rather than sending them to the other side.
		labelOutside(ctx, '☉', sun, 5, 270, COL.sun, owner.labels);
		labelOutside(ctx, 'C', C, 3, 90, COL.ink, owner.labels);
		labelOutside(ctx, 'D', D, 3, 270, COL.ink, owner.labels);
		labelOutside(ctx, 'Q', Q, 3, 270, COL.ink, owner.labels);

		// the equant's moving point, outward from the deferent's center,
		// clear of the line QK and of the epicyclet with its point
		labelOutside(ctx, 'K', K, 6, screenDirection(C, K), COL.deferent, owner.labels);
	}
};

/* ==========================================================================
   6. FIGURE 6: THE ERROR CURVE OF THE EPICYCLET
   (a) Page 4.2's Mars with Copernicus' eccentric and epicyclet in place
   of the deferent and the equant (PlanetArrangement.makeEpicyclet, the
   same parameters) against the reference Mars, in degrees, with page
   4.2's equant as a ghost, over 2016 - 2019, where the two part by up to
   22' at the opposition of 2016; dots at the oppositions. No slider
   changes a model, so the widget fits its scale. (b) The difference of
   the two models over the sixteen years of page 4.2's fit, 2010 - 2025,
   in arcminutes, at most 25.0', so the axis is +-30'
   (tools/numbers/4.3-new-center.js); dots at the oppositions.
   (Copernicus' arrangement itself gives page 4.2's directions exactly,
   so its error curve is page 4.2's Figure 7.)
   ========================================================================== */

/* The four years of (a): around the opposition of 2016. */
const ERROR_START = Time.julianDay(2016, 1, 1);
const ERROR_END = Time.julianDay(2020, 1, 1);

/* The axis of (b) (arcmin), and its step (days). */
const DIFFERENCE_RANGE = [-30, 30];
const DIFFERENCE_STEP = 2;

const errorFigure = {
	samples: null,

	init() {
		const curve = new ErrorCurve(byId('error-mars'), {
			body: 'mars',
			start: ERROR_START,
			end: ERROR_END,
			units: 'deg',
			ghostButtons: false
		});
		const equant = PlanetEquant.make(MARS);
		const epicyclet = PlanetArrangement.makeEpicyclet(MARS);
		const oppositions = PlanetEpicycle.referenceEvents('mars', 'outer', FIT_START - 200, FIT_END, {
			apparent: false,
			step: 2
		})
			.loops.map(loop => loop.middle)
			.filter(jd => jd >= FIT_START);

		curve.addGhost({
			label: tr("page 4.2's equant", "l'equante della pagina 4.2"),
			short: tr("page 4.2's equant", "l'equante della pagina 4.2"),
			color: COL.deferent,
			fn: equant
		});
		curve.addModel({
			label: tr(
				"Copernicus' epicyclet in place of the equant",
				"l'epiciclo minore di Copernico al posto dell'equante"
			),
			short: tr("Copernicus' epicyclet", 'epiciclo minore di Copernico'),
			color: COL.earth,
			fn: epicyclet
		});
		curve.addMarks({
			label: tr('the epicyclet at the oppositions', "l'epiciclo minore alle opposizioni"),
			color: COL.earth,
			fn: epicyclet,
			dates: oppositions,
			maxYears: 16.5
		});

		// (b): the epicyclet less the equant
		const difference = jd => 60 * norm180(epicyclet(jd) - equant(jd));
		const xs = [];
		const values = [];

		for (let jd = FIT_START; jd <= FIT_END; jd += DIFFERENCE_STEP) {
			xs.push(yearOf(jd));
			values.push(difference(jd));
		}

		this.samples = {
			xs,
			values,
			marks: oppositions.map(jd => ({ x: yearOf(jd), y: difference(jd) }))
		};

		this.plot = new Plot2D(byId('error-difference'), {
			x: [yearOf(FIT_START), yearOf(FIT_END)],
			y: DIFFERENCE_RANGE,
			xLabel: tr('year', 'anno'),
			yLabel: tr('difference (′)', 'differenza (′)'),
			xTicks: yearTicks(2),
			aspect: 0.3,
			maxHeight: 260,
			minHeight: 180,
			onDraw: () => this.drawDifference()
		});
	},

	drawDifference() {
		const p = this.plot;

		if (!this.samples) {
			return;
		}

		p.frame();
		p.hline(0, { color: COL.ink, width: 1 });
		p.curve(this.samples.xs, this.samples.values, { color: COL.earth, width: 1.6 });
		this.samples.marks.forEach(mark => p.marker(mark.x, mark.y, { color: COL.earth, radius: 4.5 }));
	}
};

/* ==========================================================================
   7. FIGURE 7: THE TWO RIGHT TRIANGLES
   Static, to scale. (a) Venus at its greatest elongation: the Earth O on
   its circle about the Sun, the line of sight touching Venus' circle at
   P, the right angle at P, the angle epsilon at O; Venus at the fitted
   0.723 au. (b) Saturn at quadrature: the right angle at O, the angle
   psi at the Sun, 84°, and dashed the line from the Sun one day's motion
   earlier, psi - 360° / S, meeting the line of sight at P' (a = 8.26
   instead of 9.56, tools/numbers/4.3-new-center.js). The Earth's circle
   blue and the planet's red, as in Figures 3 and 4.
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
		circle(ctx, S, a * scale, { color: COL.planet, width: 1.6 });
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
   8. FIGURE 8: MARS' DISTANCE
   Static. (a) Mars' distance from the Earth at each opposition of
   2010 - 2025: the reference (geometric), page 4.2's equant in
   Copernicus' arrangement, and dashed the same with e = 0 (a concentric
   deferent: a circle of radius a about the mean Sun), a - 1 at every
   opposition. The eight oppositions give distances from 0.382 to 0.674
   au, so the axis is 0.3 to 0.8 au. (b) The model less the reference,
   every day of 2010 - 2025, within 0.0204 au: the axis is +-0.03 au
   (tools/numbers/4.3-new-center.js).
   ========================================================================== */

const DISTANCE_RANGE = [0.3, 0.8];
const DISTANCE_ERROR_RANGE = [-0.03, 0.03];

const distanceFigure = {
	samples: null,

	init() {
		const model = PlanetArrangement.makeDistance('mars');
		const xs = [];
		const errors = [];

		for (let jd = FIT_START; jd <= FIT_END; jd += 1) {
			xs.push(yearOf(jd));
			errors.push(model(jd) - geometric('mars', jd).dist);
		}

		const oppositions = marsOppositions(FIT_START, FIT_END).map(jd => ({
			x: yearOf(jd),
			real: geometric('mars', jd).dist,
			model: model(jd)
		}));

		this.samples = { xs, errors, oppositions };

		const options = {
			x: [yearOf(FIT_START), yearOf(FIT_END)],
			xLabel: tr('year', 'anno'),
			xTicks: yearTicks(2),
			maxHeight: 300,
			minHeight: 200
		};

		this.distance = new Plot2D(
			byId('distance-plot'),
			Object.assign({}, options, {
				y: DISTANCE_RANGE,
				yLabel: tr('distance (au)', 'distanza (au)'),
				aspect: 0.36,
				onDraw: () => this.drawDistance()
			})
		);
		this.error = new Plot2D(
			byId('distance-error'),
			Object.assign({}, options, {
				y: DISTANCE_ERROR_RANGE,
				yLabel: tr('model − real (au)', 'modello − reale (au)'),
				aspect: 0.3,
				onDraw: () => this.drawError()
			})
		);
		Plot2D.legend(byId('distance-legend'), [
			{ label: tr('the real Mars', 'il Marte reale'), color: COL.planet, mark: 'dot' },
			{
				label: tr(
					"page 4.2's model in Copernicus' arrangement",
					'il modello della pagina 4.2 nella disposizione di Copernico'
				),
				color: COL.deferent,
				mark: 'dot'
			},
			{
				label: tr(
					'the same model with a concentric deferent ($e = 0$)',
					'lo stesso modello con un deferente concentrico ($e = 0$)'
				),
				color: COL.epicycle,
				ghost: true
			}
		]);
	},

	/* Panel (a): the concentric circle's a - 1, then at each opposition the
	   real Mars, with the model's smaller dot on it. */
	drawDistance() {
		const p = this.distance;

		if (!this.samples) {
			return;
		}

		p.frame();
		p.hline(PlanetArrangement.FIT.mars.a - 1, { color: COL.epicycle, alpha: 0.6, width: 1.5, dash: [6, 5] });
		this.samples.oppositions.forEach(o => {
			p.marker(o.x, o.real, { color: COL.planet, radius: 7 });
			p.marker(o.x, o.model, { color: COL.deferent, radius: 3.5 });
		});
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
   9. PAGE START
   Shared components first (they typeset the prose), then the figures.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
	Site.initPage();
	startFigures([
		elongationFigure,
		arrangementFigure,
		scaleFigure,
		loopFigure,
		epicycletFigure,
		errorFigure,
		triangleFigure,
		distanceFigure
	]);
});
