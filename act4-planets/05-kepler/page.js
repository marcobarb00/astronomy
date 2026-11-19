// @ts-check
/* ==========================================================================
   PAGE 4.5 · KEPLER - SCRIPT (page.js)
   Six figures, each with its own init and draw (and update when it has
   controls):
	 1. the Sun's speed and size     (2D, static: the daily motion, the
									  apparent diameter and its square
									  through 2025, in percent of the mean)
	 2. Mars triangulated            (2D, static: (a) the points from above
									  the ecliptic, one pair drawn; (b) their
									  distances less the circle through the
									  apsides)
	 3. the ellipse and the area law (2D: the ellipse, its circle, twelve
									  sectors of equal time; days from the
									  aphelion, play; views e = 0.6 and Mars)
	 4. Mars' error curve            (the two ellipses against VSOP87, page
									  4.2's equant as ghost)
	 5. the Sun's error curve        (the ellipse against VSOP87, page 2.1's
									  eccentric as ghost)
	 6. every model of the Sun and   (2D, static: one row per model, its
		of Mars                       largest error on a logarithmic scale)
   The reference of the page is Ephem with { theory: 'vsop87' } (the site's
   Standish planets are ellipses: STRUCTURE.md, page 4.5).
   Shared code: common.js, time.js, ephemeris.js, vsop87-data.js,
   vsop87.js, models/mean-sun.js, models/precession.js,
   models/solar-eccentric.js, models/planet-epicycle.js,
   models/planet-equant.js, models/planet-arrangement.js, models/kepler.js,
   plot2d.js, errorcurve.js, components.js. Every number quoted in the
   prose comes from tools/numbers/4.5-kepler.js.

   TABLE OF CONTENTS
	 0. The reference of the page, and helpers
	 1. Figure 1: the Sun's speed and size
	 2. Figure 2: Mars triangulated
	 3. Figure 3: the ellipse and the area law
	 4. Figures 4 and 5: the error curves
	 5. Figure 6: every model of the Sun and of Mars
	 6. Page start
   ========================================================================== */

/* ==========================================================================
   0. THE REFERENCE OF THE PAGE, AND HELPERS
   ========================================================================== */

const VSOP = { theory: 'vsop87' };

/* The real Sun ({ lon, dist }) and Mars' ecliptic longitude, from VSOP87. */
const realSun = jd => Ephem.sun(jd, VSOP);
const realMars = jd => Ephem.longitude('mars', jd, VSOP);

/* The dates where the reference can be trusted: VSOP87's terms were kept
   for AD 1000 to 3000 (vsop87.js). */
const VSOP_RANGE = { start: Time.julianDay(1000, 1, 1), end: Time.julianDay(3000, 12, 31) };

/* The direction (deg, anticlockwise from the right, as towards()) of
   screen point b seen from screen point a. */
const screenDirection = (a, b) => atan2d(a.y - b.y, b.x - a.x);

/* ==========================================================================
   1. FIGURE 1: THE SUN'S SPEED AND SIZE
   Static. Every day of 2025: the Sun's daily motion along the ecliptic,
   its apparent diameter (from its distance, radius 959.63″ at 1 au) and
   the square of the diameter, each in percent of its mean over the year.
   They stay within ±3.5% (tools/numbers/4.5-kepler.js): the axis is ±4%.
   ========================================================================== */

const SUN_YEAR = 2025;
const SUN_RANGE = [-4, 4];

/* The first day of every other month, as days from 1 January. */
const MONTH_TICKS = [
	[0, 'Jan'],
	[59, 'Mar'],
	[120, 'May'],
	[181, 'Jul'],
	[243, 'Sep'],
	[304, 'Nov'],
	[365, '']
];

const sunFigure = {
	samples: null,

	init() {
		const start = Time.julianDay(SUN_YEAR, 1, 1);
		const days = [];
		const speed = [];
		const diameter = [];

		for (let day = 0; day < 365; day += 1) {
			const jd = start + day;

			days.push(day);
			speed.push(norm180(realSun(jd + 0.5).lon - realSun(jd - 0.5).lon));
			diameter.push(1 / realSun(jd).dist);
		}

		const percent = list => {
			const average = list.reduce((a, b) => a + b, 0) / list.length;

			return list.map(x => 100 * (x / average - 1));
		};

		this.samples = {
			days,
			speed: percent(speed),
			diameter: percent(diameter),
			square: percent(diameter.map(d => d * d))
		};

		this.plot = new Plot2D(byId('sun-plot'), {
			x: [0, 365],
			y: SUN_RANGE,
			xTicks: () => MONTH_TICKS.map(([value, label]) => ({ value, label })),
			xLabel: SUN_YEAR.toString(),
			yLabel: 'from the mean (%)',
			aspect: 0.45,
			maxHeight: 340,
			minHeight: 220,
			onDraw: () => this.draw()
		});

		Plot2D.legend(byId('sun-legend'), [
			{ label: 'daily motion', color: COL.sun, mark: 'band' },
			{ label: 'apparent diameter', color: COL.earth },
			{ label: 'diameter squared', color: COL.deferent }
		]);
	},

	draw() {
		const p = this.plot;

		if (!this.samples) {
			return;
		}

		const { days, speed, diameter, square } = this.samples;

		p.frame();
		p.hline(0, { color: COL.ink, width: 1 });
		// the daily motion wide and pale, so that the square of the diameter
		// shows on top of it; its legend sample is a pale band of the same
		// look
		p.curve(days, speed, { color: COL.sun, width: 8, alpha: 0.45 });
		p.curve(days, diameter, { color: COL.earth, width: 2 });
		p.curve(days, square, { color: COL.deferent, width: 1.6 });
	}
};

/* ==========================================================================
   2. FIGURE 2: MARS TRIANGULATED
   Static. Kepler.triangulatePath on the reference: a first sighting every
   10 days of 2010 - 2025 with its second one sidereal period of Mars later
   (page 4.1's mean motion less page 2.3's precession), the pairs whose
   lines meet at 20° or more (103 points). (a) From above the ecliptic,
   the Sun at the center: the Earth's path over 2025, the circle through
   the apsides (Kepler.apsidalCircle), the points, and one pair with its
   two lines of sight. The points reach 1.665 au: the drawing reaches
   1.8 au. (b) Each point's distance from the Sun less the circle's in its
   direction: from -0.0064 to 0.0001 au (tools/numbers/4.5-kepler.js), so
   the axis runs from -0.008 to 0.002 au.
   ========================================================================== */

const TRIANGLE_START = Time.julianDay(2010, 1, 1);
const TRIANGLE_END = Time.julianDay(2026, 1, 1);
const TRIANGLE_ROOM = 1.8;
const TRIANGLE_RANGE = [-0.008, 0.002];

/* The pair drawn in (a): the first whose lines meet at this angle or more. */
const TRIANGLE_SHOWN_ANGLE = 60;

const triangleFigure = {
	points: null,

	init() {
		this.points = Kepler.triangulatePath({
			sun: realSun,
			planet: realMars,
			start: TRIANGLE_START,
			end: TRIANGLE_END,
			step: 10,
			period: Kepler.siderealPeriod(PlanetEpicycle.MARS_FIT.n),
			precession: Kepler.PRECESSION_PER_DAY,
			minAngle: 20
		});
		this.circle = Kepler.apsidalCircle(this.points);
		this.shown = this.points.find(q => q.angle >= TRIANGLE_SHOWN_ANGLE) ?? this.points[0];
		this.earthPath = [];

		for (let day = 0; day <= 366; day += 3) {
			const s = realSun(Time.julianDay(2025, 1, 1) + day);

			this.earthPath.push([-s.dist * cos(s.lon), -s.dist * sin(s.lon)]);
		}

		this.top = { labels: new LabelPlacer(), draw: () => this.drawTop() };
		squareCanvas(this.top, byId('triangle-canvas'), 380, 10);

		this.plot = new Plot2D(byId('triangle-plot'), {
			x: [0, 360],
			y: TRIANGLE_RANGE,
			xTicks: quarterTicks,
			yTicks: () => [-0.008, -0.006, -0.004, -0.002, 0, 0.002].map(value => ({ value, label: fixed(value, 3) })),
			xLabel: 'heliocentric ecliptic longitude',
			yLabel: 'au',
			aspect: 0.8,
			maxHeight: 380,
			minHeight: 240,
			onDraw: () => this.drawPlot()
		});
	},

	/* Panel (a): from above the ecliptic. */
	drawTop() {
		const owner = this.top;
		const ctx = owner.ctx;

		if (!ctx || !this.points) {
			return;
		}

		const scale = owner.R / TRIANGLE_ROOM;
		const at = q => ({ x: owner.cx + scale * q[0], y: owner.cy - scale * q[1] });
		const S = at([0, 0]);
		const { circle: c, shown } = this;
		const O1 = at(shown.earth1);
		const O2 = at(shown.earth2);
		const P = at([shown.x, shown.y]);

		ctx.clearRect(0, 0, owner.width, owner.width);
		owner.labels.begin({ x0: 0, y0: 0, x1: owner.width, y1: owner.width });

		// the Earth's path over a year
		ctx.strokeStyle = COL.earth;
		ctx.lineWidth = 1.6;
		ctx.beginPath();
		this.earthPath.map(at).forEach((q, i) => (i === 0 ? ctx.moveTo(q.x, q.y) : ctx.lineTo(q.x, q.y)));
		ctx.stroke();

		// the circle through the apsides, and the line of the apsides
		circle(ctx, at(c.center), c.radius * scale, { color: COL.ink, width: 1, dash: [5, 4] });

		const A = at([c.rFar * cos(c.line), c.rFar * sin(c.line)]);
		const Pi = at([-c.rNear * cos(c.line), -c.rNear * sin(c.line)]);

		segment(ctx, A, Pi, { color: COL.muted, width: 1 });

		// the two lines of sight of the pair drawn
		segment(ctx, O1, P, { color: COL.planet, width: 1.2 });
		segment(ctx, O2, P, { color: COL.planet, width: 1.2 });

		// the points
		this.points.forEach(q => {
			const p = at([q.x, q.y]);

			drawDot(ctx, p.x, p.y, 2.2, COL.planet, false);
		});

		drawDot(ctx, S.x, S.y, 6, COL.sun);
		drawDot(ctx, O1.x, O1.y, 5, COL.earth);
		drawDot(ctx, O2.x, O2.y, 5, COL.earth);
		drawDot(ctx, P.x, P.y, 5, COL.planet);

		// letters, each on the side clearest of its lines (CLAUDE.md)
		labelOutside(ctx, '☉', S, 6, clearestDirection([c.line, c.line + 180]), COL.sun, owner.labels);
		labelOutside(ctx, 'A', A, 4, c.line, COL.ink, owner.labels);
		labelOutside(ctx, 'Π', Pi, 4, c.line + 180, COL.ink, owner.labels);
		labelOutside(
			ctx,
			'O',
			O1,
			6,
			clearestDirection([screenDirection(O1, P), screenDirection(O1, S)]),
			COL.earth,
			owner.labels
		);
		labelOutside(
			ctx,
			'O′',
			O2,
			6,
			clearestDirection([screenDirection(O2, P), screenDirection(O2, S)]),
			COL.earth,
			owner.labels
		);
		labelOutside(
			ctx,
			'P',
			P,
			6,
			clearestDirection([screenDirection(P, O1), screenDirection(P, O2), screenDirection(P, S)]),
			COL.planet,
			owner.labels
		);
	},

	/* Panel (b): the distances less the circle's. */
	drawPlot() {
		const p = this.plot;

		if (!this.points) {
			return;
		}

		const c = this.circle;
		const far = norm360(c.line);
		const near = norm360(c.line + 180);

		p.frame();
		p.hline(0, { color: COL.ink, width: 1.2, dash: [5, 4] });
		p.vline(far, { color: COL.muted, width: 1 });
		p.vline(near, { color: COL.muted, width: 1 });
		p.text('A', far, TRIANGLE_RANGE[1], { color: COL.ink, kind: 'symbol', dx: 5, dy: 22 });
		p.text('Π', near, TRIANGLE_RANGE[1], { color: COL.ink, kind: 'symbol', dx: 5, dy: 22 });

		const radius = p.width < 400 ? 2.4 : 3.2;

		this.points.forEach(q => p.marker(q.lon, q.r - c.along(q.lon), { color: COL.planet, radius }));
	}
};

/* ==========================================================================
   3. FIGURE 3: THE ELLIPSE AND THE AREA LAW
   The ellipse of eccentricity e (a = 1) with the Sun at a focus, drawn
   with the aphelion A on the right: its center C, the empty focus Q, the
   circle on the long axis, and the twelve sectors swept from ☉ in each
   twelfth of the period, every other one shaded. P is the body at the
   date, P' the point of the circle above or below it, at the angle E
   from A seen from C. From Q, the line QP and, faint and dashed, the
   direction that turns uniformly, at the angle M from A, as from page
   4.2's equant: QP leaves it by up to 10° for e = 0.6 and 8.2' for Mars
   (tools/numbers/4.5-kepler.js). The view Mars leaves out C, P' and the
   construction of E, since P' lies on P there. The date runs over one
   period of Mars, 686.98 days, in both views; e is 0.6 or Mars' 0.0934.
   The ellipse reaches 1 + e = 1.6 from ☉ on the right and its circle 1
   from C: the drawing reaches 1.17 a from C, room for the labels A, Π
   and P beyond the circle.
   ========================================================================== */

const ELLIPSE_VIEWS = {
	'e = 0.6': 0.6,
	Mars: Kepler.MARS_FIT.e
};
const ELLIPSE_PERIOD = Kepler.siderealPeriod(PlanetEpicycle.MARS_FIT.n);
const ELLIPSE_ROOM = 1.17;
const ELLIPSE_SECTORS = 12;

/* Play: a period in about twenty seconds. */
const ELLIPSE_DAYS_PER_SECOND = 35;

/* The direction of the point at the eccentric anomaly E seen from the
   empty focus Q (a = 1, Q at e from C towards A), counted from A in the
   direction of motion, 0° to 360°. */
function directionFromQ(E, e) {
	return norm360(atan2d(Math.sqrt(1 - e * e) * sin(E), cos(E) - e));
}

/* How far the ray from Q at the angle M from A runs before it meets the
   circle on the long axis (radius 1 about C): the root t > 0 of
   |Q + t (cos M, sin M)| = 1. */
function rayToCircle(e, M) {
	return -e * cos(M) + Math.sqrt(1 - e * e * sin(M) * sin(M));
}

const ellipseFigure = {
	view: 'e = 0.6',
	state: null,

	init() {
		this.owner = { labels: new LabelPlacer(), draw: () => this.draw() };
		squareCanvas(this.owner, byId('ellipse-canvas'), 400, 10);

		wireSlider(
			byId('ellipse-day'),
			() => this.update(),
			value => `${fixed(value, 0)} days`
		);
		wirePresets(byId('ellipse-day').closest('figure'));
		wirePlayButton(byId('ellipse-play'), byId('ellipse-day'), ELLIPSE_DAYS_PER_SECOND);
		buildChoice(byId('ellipse-views'), Object.keys(ELLIPSE_VIEWS), this.view, name => {
			this.view = name;
			this.update();
		});
		this.update();
	},

	update() {
		const e = ELLIPSE_VIEWS[this.view];
		const M = (360 * readNumber('ellipse-day')) / ELLIPSE_PERIOD;
		const now = Kepler.atAnomaly(M, e);

		this.state = { e, M, now, fromQ: directionFromQ(now.E, e) };
		this.showReadout();
		this.draw();
	},

	/* The angles from A, counted in the direction of motion: at Q, then
	   at ☉ (the true anomaly M + q). */
	showReadout() {
		const { M, now, fromQ } = this.state;

		showLines('ellipse-readout', [
			`M = ${fixed(M, 1)}^\\circ`,
			`E = ${fixed(now.E, 1)}^\\circ`,
			`\\angle\\text{AQP} = ${fixed(fromQ, 1)}^\\circ`,
			`\\angle\\text{A}{\\odot}\\text{P} = M + q = ${fixed(norm360(M + now.q), 1)}^\\circ`,
			`r = ${fixed(now.distance, 3)}\\,a`
		]);
	},

	draw() {
		const owner = this.owner;
		const ctx = owner.ctx;

		if (!ctx || !this.state) {
			return;
		}

		const { e, M, now } = this.state;
		const scale = owner.R / ELLIPSE_ROOM;
		const b = Math.sqrt(1 - e * e);
		const construction = this.view !== 'Mars';

		// points in units of a, the center C at the origin, x towards A
		const at = q => ({ x: owner.cx + scale * q[0], y: owner.cy - scale * q[1] });
		const onEllipse = E => at([cos(E), b * sin(E)]);
		const C = at([0, 0]);
		const S = at([-e, 0]);
		const Q = at([e, 0]);
		const A = at([1, 0]);
		const Pi = at([-1, 0]);
		const P = onEllipse(now.E);
		const P1 = at([cos(now.E), sin(now.E)]);

		ctx.clearRect(0, 0, owner.width, owner.width);
		owner.labels.begin({ x0: 0, y0: 0, x1: owner.width, y1: owner.width });

		this.drawSectors(ctx, e, onEllipse, S);

		// the circle on the long axis, the ellipse, the long axis
		circle(ctx, C, scale, { color: withAlpha(COL.ink, 0.55), width: 1, dash: [5, 4] });
		ctx.strokeStyle = COL.deferent;
		ctx.lineWidth = 2;
		ctx.beginPath();

		for (let E = 0; E <= 360; E += 2) {
			const q = onEllipse(E);

			if (E === 0) {
				ctx.moveTo(q.x, q.y);
			} else {
				ctx.lineTo(q.x, q.y);
			}
		}

		ctx.stroke();
		segment(ctx, Pi, A, { color: COL.muted, width: 1 });

		// E at C: the line to P', and P' straight above or below P
		if (construction) {
			segment(ctx, C, P1, { color: COL.muted, width: 1 });
			segment(ctx, P1, P, { color: COL.muted, width: 1, dash: [2, 3] });
		}

		// from Q: the uniform direction, faint, as far as the circle, then
		// the line to P; from ☉: the line to P
		const reach = rayToCircle(e, M);

		segment(ctx, Q, at([e + reach * cos(M), reach * sin(M)]), {
			color: withAlpha(COL.epicycle, 0.6),
			width: 1.2,
			dash: [5, 4]
		});
		segment(ctx, Q, P, { color: COL.epicycle, width: 1.4 });
		segment(ctx, S, P, { color: COL.planet, width: 1.6 });

		if (construction) {
			drawDot(ctx, C.x, C.y, 3, COL.ink);
			drawDot(ctx, P1.x, P1.y, 3, COL.ink);
		}

		drawDot(ctx, Q.x, Q.y, 3.5, COL.epicycle);
		drawDot(ctx, S.x, S.y, 7, COL.sun);
		drawDot(ctx, P.x, P.y, 6, COL.planet);

		// fixed points keep their sides, A and Π beyond the dot of P when
		// it passes; P and P' are letters (CLAUDE.md)
		labelOutside(ctx, '☉', S, 7, 270, COL.sun, owner.labels);
		labelOutside(ctx, 'Q', Q, 4, 270, COL.epicycle, owner.labels);
		labelOutside(ctx, 'A', A, 8, 0, COL.ink, owner.labels);
		labelOutside(ctx, 'Π', Pi, 8, 180, COL.ink, owner.labels);

		if (construction) {
			labelOutside(ctx, 'C', C, 3, 90, COL.ink, owner.labels);
		}

		// P and P' also keep off the directions of the long axis (0° and
		// 180° on the screen), so that at A and Π they go above or below it,
		// clear of the labels A and Π
		const raysAtP = [screenDirection(P, S), screenDirection(P, Q), 0, 180];

		if (construction) {
			raysAtP.push(screenDirection(P, P1), screenDirection(P1, P));
		}

		labelOutside(ctx, 'P', P, 6, clearestDirection(raysAtP), COL.planet, owner.labels);

		if (construction) {
			labelOutside(
				ctx,
				'P′',
				P1,
				3,
				clearestDirection([
					screenDirection(P1, C),
					screenDirection(P1, P),
					screenDirection(C, P1) + 90,
					screenDirection(C, P1) - 90,
					0,
					180
				]),
				COL.ink,
				owner.labels
			);
		}
	},

	/* The twelve sectors of equal time, from ☉, every other one shaded:
	   each runs between the places at M = 30° k and 30° (k + 1). */
	drawSectors(ctx, e, onEllipse, S) {
		const step = 360 / ELLIPSE_SECTORS;

		for (let k = 0; k < ELLIPSE_SECTORS; k += 2) {
			const E0 = Kepler.eccentricAnomaly(k * step, e);
			const E1 = Kepler.eccentricAnomaly((k + 1) * step, e);

			ctx.beginPath();
			ctx.moveTo(S.x, S.y);

			for (let i = 0; i <= 24; i++) {
				const q = onEllipse(E0 + ((E1 - E0) * i) / 24);

				ctx.lineTo(q.x, q.y);
			}

			ctx.closePath();
			ctx.fillStyle = withAlpha(COL.deferent, 0.18);
			ctx.fill();
		}
	}
};

/* ==========================================================================
   4. FIGURES 4 AND 5: THE ERROR CURVES
   Figure 4: Kepler's Mars (Kepler.make: Mars' ellipse fitted to the
   oppositions of 2010 - 2025, the Earth's to the seasons of 2026) against
   VSOP87's Mars, page 4.2's equant as ghost, dots at the oppositions to
   the real Sun of 2010 - 2025. Figure 5: the Sun's ellipse against VSOP87's
   Sun, page 2.1's eccentric with its apogee moving at page 2.3's rate as
   ghost. No sliders. Figure 4 keeps one scale, ±60', for every span, so
   the ellipses' error is not flattened by the scale the curves would
   choose (±100'); Figure 5's scales follow the curves of each span.
   ========================================================================== */

/* The oppositions of Mars to the real Sun in [start, end], from the
   reference, every 5 days then by bisection. */
function oppositions(start, end) {
	const offset = jd => norm180(realMars(jd) - realSun(jd).lon - 180);
	const found = [];
	let previous = offset(start);

	for (let jd = start + 5; jd <= end; jd += 5) {
		const value = offset(jd);

		if (previous * value < 0 && Math.abs(previous - value) < 90) {
			found.push(bisect(offset, jd - 5, jd, 30));
		}

		previous = value;
	}

	return found;
}

/* Figure 4's half-range ('), the same for every span: the curves stay
   within 56.0' (page 4.2's equant, 1916 - 2120, the widest span and the
   band's half window beyond it; tools/numbers/4.5-kepler.js). */
const MARS_ERROR_HALF = 60;

const marsErrorFigure = {
	init() {
		const curve = new ErrorCurve(byId('error-mars'), {
			body: 'mars',
			reference: realMars,
			validRange: VSOP_RANGE,
			start: Time.julianDay(2016, 1, 1),
			end: Time.julianDay(2020, 1, 1),
			spans: [
				{ label: '4 years', years: 4 },
				{ label: '16 years', years: 16 },
				{ label: '200 years', years: 200 }
			],
			units: 'arcmin',
			yMax: MARS_ERROR_HALF,
			ghostButtons: false
		});
		const model = Kepler.make();

		curve.addGhost({
			label: "page 4.2's equant",
			short: "page 4.2's equant",
			color: COL.epicycle,
			fn: PlanetEquant.make(PlanetEquant.MARS_FIT)
		});
		curve.addModel({
			label: "Kepler's ellipses, fitted to 2010–2025",
			short: 'ellipses',
			color: COL.deferent,
			fn: model
		});
		curve.addMarks({
			label: 'the ellipses at the oppositions (spans of 16 years or less)',
			color: COL.deferent,
			fn: model,
			dates: oppositions(Time.julianDay(2010, 1, 1), Time.julianDay(2026, 1, 1)),
			maxYears: 16.5
		});
	}
};

const sunErrorFigure = {
	init() {
		const curve = new ErrorCurve(byId('error-sun'), {
			body: 'sun',
			reference: jd => realSun(jd).lon,
			validRange: VSOP_RANGE,
			start: Time.julianDay(2026, 1, 1),
			end: Time.julianDay(2027, 1, 1),
			spans: [
				{ label: '1 year', years: 1 },
				{ label: '100 years', years: 100 },
				{ label: '1000 years', years: 1000 }
			],
			units: 'arcmin',
			ghostButtons: false
		});

		curve.addGhost({
			label: "page 2.1's eccentric, its apogee moving",
			short: "page 2.1's eccentric",
			color: COL.sun,
			fn: SolarEccentric.make(SolarEccentric.MOVING_2026)
		});
		curve.addModel({
			label: "Kepler's ellipse, fitted to 2026",
			short: 'ellipse',
			color: COL.deferent,
			fn: Kepler.makeSun()
		});
	}
};

/* ==========================================================================
   5. FIGURE 6: EVERY MODEL OF THE SUN AND OF MARS
   Static. The largest error of each model against the reference: the Sun
   every day of 2026, Mars every day of 2010 - 2025. One row per model,
   named on the left with its page, in the order of the course, its dot on
   a horizontal scale of the logarithm of the error in arcminutes, and the
   dots of a body joined from row to row. The two panels, one above the
   other, share the scale. The errors run from 0.24' (the Sun's ellipse)
   to 53.7° (the uniform Mars) (tools/numbers/4.5-kepler.js): the axis
   runs from 0.1' to 100°.
   ========================================================================== */

/* The marks of the scale: their value in arcminutes and their label. */
const SUMMARY_MARKS = [
	{ arcmin: 0.1, label: '0.1′' },
	{ arcmin: 1, label: '1′' },
	{ arcmin: 10, label: '10′' },
	{ arcmin: 60, label: '1°' },
	{ arcmin: 600, label: '10°' },
	{ arcmin: 6000, label: '100°' }
];
const SUMMARY_RANGE = [Math.log10(0.1), Math.log10(6000)];

/* The height of a row, and the room for the row names on the left (px):
   "4.3 epicyclet" is the longest. */
const SUMMARY_ROW = 34;
const SUMMARY_NAMES = 100;

/* The models of each panel, in the order of the course: the page it comes
   from, its name and the model (jd -> longitude). */
const SUMMARY_MODELS = {
	sun: [
		{ page: '1.3', name: 'uniform', fn: MeanSun.make(MeanSun.MODERN) },
		{ page: '2.1', name: 'eccentric', fn: SolarEccentric.make(SolarEccentric.FIT_2026) },
		{ page: '4.5', name: 'ellipse', fn: Kepler.makeSun() }
	],
	mars: [
		{ page: '4.1', name: 'uniform', fn: PlanetEpicycle.makeUniform(PlanetEpicycle.MARS_FIT) },
		{ page: '4.1', name: 'epicycle', fn: PlanetEpicycle.make(PlanetEpicycle.MARS_FIT) },
		{ page: '4.2', name: 'equant', fn: PlanetEquant.make(PlanetEquant.MARS_FIT) },
		{ page: '4.3', name: 'epicyclet', fn: PlanetArrangement.makeEpicyclet() },
		{ page: '4.5', name: 'ellipses', fn: Kepler.make() }
	]
};

const summaryFigure = {
	init() {
		this.panels = [
			this.panel('sun', 'summary-sun', realSun, 2026, 2027, 1),
			this.panel('mars', 'summary-mars', realMars, 2010, 2026, 1)
		];
	},

	/* One panel: the largest errors of its models, and their plot. */
	panel(body, canvasId, reference, fromYear, toYear, step) {
		const models = SUMMARY_MODELS[body];
		const worst = models.map(() => 0);
		const start = Time.julianDay(fromYear, 1, 1);
		const end = Time.julianDay(toYear, 1, 1);

		for (let jd = start; jd < end; jd += step) {
			const ref = body === 'sun' ? reference(jd).lon : reference(jd);

			models.forEach((model, i) => {
				worst[i] = Math.max(worst[i], Math.abs(norm180(model.fn(jd) - ref)));
			});
		}

		const panel = {
			models,
			values: worst.map(degrees => Math.log10(degrees * 60)),
			rows: models.map((model, i) => summaryRow(i, models.length)),
			plot: null
		};

		// a fixed height: the rows, and the margins of Plot2D for the
		// scale's ticks and title below
		const height = models.length * SUMMARY_ROW + 52;

		panel.plot = new Plot2D(byId(canvasId), {
			x: SUMMARY_RANGE,
			y: [0.5, models.length + 0.5],
			xTicks: () => SUMMARY_MARKS.map(mark => ({ value: Math.log10(mark.arcmin), label: mark.label })),
			yTicks: () => models.map((model, i) => ({ value: panel.rows[i], label: `${model.page} ${model.name}` })),
			xLabel: 'largest error',
			margin: { left: SUMMARY_NAMES },
			minHeight: height,
			maxHeight: height,
			onDraw: () => this.draw(panel)
		});

		return panel;
	},

	draw(panel) {
		const p = panel.plot;

		if (!panel.values) {
			return;
		}

		p.frame();
		p.curve(panel.values, panel.rows, { color: withAlpha(COL.planet, 0.5), width: 1.2 });
		panel.values.forEach((value, i) => p.marker(value, panel.rows[i], { color: COL.planet, radius: 5.5 }));
	}
};

/* The y value of row i of n, the first row at the top: from n down to 1,
   so that no row falls on y = 0, where Plot2D draws a stronger line. */
function summaryRow(i, n) {
	return n - i;
}

/* ==========================================================================
   6. PAGE START
   Shared components first (they typeset the prose), then the figures.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
	Site.initPage();
	startFigures([sunFigure, triangleFigure, ellipseFigure, marsErrorFigure, sunErrorFigure, summaryFigure]);
});
