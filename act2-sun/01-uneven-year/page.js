// @ts-check
/* ==========================================================================
   PAGE 2.1 · THE UNEVEN YEAR - SCRIPT (page.js)
   Six figures, each with its own init and draw (and update when it has
   controls):
	 1. the Sun's daily motion       (2D, static: the real Sun through 2026)
	 2. the eccentric                (2D: (a) the circle seen from the north
									   ecliptic pole, (b) q through 2026;
									   date and eccentricity)
	 3. Hipparchus' construction     (2D: (a) the seasons to scale, (b) the
									   centre magnified; spring and summer)
	 4. the first error curve        (the eccentric fitted to 2026, the
									   uniform circle as a ghost)
	 5. Ptolemy's Sun                (error curve, AD 140 and 2,000 years)
	 6. the eccentric's residual     (error curve, 1 to 1,000 years)
   Shared code: common.js, time.js, ephemeris.js, models/mean-sun.js,
   models/solar-eccentric.js, plot2d.js, errorcurve.js, components.js.
   Every number quoted in the prose comes from tools/numbers/2.1-uneven-year.js.

   TABLE OF CONTENTS
	 0. Helpers shared by the figures
	 1. Figure 1: the Sun's daily motion
	 2. The drawing of an eccentric with its four seasons (Figures 2, 3)
	 3. Figure 2: the eccentric and the equation of centre
	 4. Figure 3: Hipparchus' construction
	 5. Figures 4 to 6: the error curves
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

/* The modern year (days), from the mean Sun of page 1.3. */
const YEAR_LENGTH = MeanSun.yearLength();

/* The Figure 2 date slider plays a year in about 12 seconds. */
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

/* First day of each month, as a day index of the year (0 = 1 January). */
const MONTH_STARTS = Time.MONTH_NAMES.map((name, i) => ({
	value: Time.julianDay(YEAR, i + 1, 1) - YEAR_START,
	label: name
}));

/* Ticks of a date axis: every month when there is room, else every other. */
const monthTicks = (min, max, count) => MONTH_STARTS.filter((t, i) => count >= 8 || i % 2 === 0);

/* "3 Apr" for a day index of the year (the year is in the panel titles). */
function dayText(day) {
	const date = Time.calendarDate(YEAR_START + day);

	return `${Math.floor(date.day)} ${Time.MONTH_NAMES[date.month - 1]}`;
}

/* An angle with a sign in TeX: "+1.85^\circ", "-0.40^\circ". */
const texSigned = (degrees, digits = 2) => `${signed(degrees, digits).replace('−', '-')}^\\circ`;

/* Days in TeX: "92.74\,\text{d}". */
const texDays = days => `${fixed(days, 2)}\\,\\text{d}`;

/* A symbol with a subscript ("λ" and "A"), centred at a canvas point, in
   the text colour of 'color'. */
function subscriptLabel(ctx, base, sub, point, color) {
	const subFont = 'italic 500 15px "Cormorant Garamond", Georgia, serif';

	ctx.font = FONT_SYMBOL;
	const baseWidth = ctx.measureText(base).width;
	ctx.font = subFont;
	const subWidth = ctx.measureText(sub).width;
	const left = point.x - (baseWidth + subWidth) / 2;

	ctx.fillStyle = textColor(color);
	ctx.textAlign = 'left';
	ctx.textBaseline = 'middle';
	ctx.font = FONT_SYMBOL;
	ctx.fillText(base, left, point.y);
	ctx.font = subFont;
	ctx.fillText(sub, left + baseWidth, point.y + 5);
}

/* ==========================================================================
   1. FIGURE 1: THE SUN'S DAILY MOTION
   Static. For each day of 2026, the arc (arcmin) the reference Sun moves
   between noon the day before and noon the day after, divided by two
   (centred on the day); the mean daily motion n; the equinoxes and
   solstices, where the longitude crosses a multiple of 90°. Fixed scale
   56' to 62' (the motion ranges from 57.19' to 61.16',
   tools/numbers/2.1-uneven-year.js).
   ========================================================================== */

const MOTION_RANGE = [56, 62];

const motionFigure = {
	plot: null,

	init() {
		this.computeMotion();

		this.plot = new Plot2D(byId('motion-plot'), {
			x: [0, DAYS_IN_YEAR],
			y: MOTION_RANGE,
			xLabel: `date (${YEAR})`,
			yLabel: 'daily motion (′)',
			xTicks: monthTicks,
			aspect: 0.42,
			onDraw: () => this.draw()
		});
	},

	/* The reference Sun's longitude at 0 h of every day from 31 December
	   2025 to 1 January 2027, its daily motion, and the moments (day index)
	   when the longitude crosses 0°, 90°, 180° and 270°. */
	computeMotion() {
		const longitudes = [];

		for (let day = -1; day <= DAYS_IN_YEAR + 1; day++) {
			longitudes.push(Ephem.longitude('sun', YEAR_START + day));
		}

		this.days = [];
		this.motion = [];

		for (let day = 0; day <= DAYS_IN_YEAR; day++) {
			const before = longitudes[day];
			const after = longitudes[day + 2];

			this.days.push(day);
			this.motion.push((norm180(after - before) * 60) / 2);
		}

		this.crossings = [];

		for (let day = 0; day < DAYS_IN_YEAR; day++) {
			const a = longitudes[day + 1];
			const b = a + norm180(longitudes[day + 2] - a);
			const quarter = Math.floor(b / 90);

			if (Math.floor(a / 90) !== quarter) {
				const boundary = 90 * quarter;

				this.crossings.push({ day: day + (boundary - a) / (b - a), quarter: norm360(boundary) / 90 });
			}
		}
	},

	draw() {
		const p = this.plot;
		const mean = MeanSun.MODERN.n * 60;

		p.frame();
		this.crossings.forEach(c => p.vline(c.day, { color: COL.muted, width: 1 }));
		p.hline(mean, { color: COL.muted, width: 1.5, dash: [6, 5] });
		p.curve(this.days, this.motion, { color: COL.sun, width: 2.5 });
		this.labelSeasons();
	},

	/* The name of each season, centred between its boundaries, at the top. */
	labelSeasons() {
		const p = this.plot;
		const edges = [0, ...this.crossings.map(c => c.day), DAYS_IN_YEAR];

		// the year starts in winter: the season before the first crossing
		const first = (this.crossings[0].quarter + 3) % 4;

		for (let i = 0; i + 1 < edges.length; i++) {
			const width = edges[i + 1] - edges[i];

			if (width > 30) {
				p.text(SEASON_NAMES[(first + i) % 4], (edges[i] + edges[i + 1]) / 2, MOTION_RANGE[1], {
					align: 'center',
					baseline: 'top',
					dx: 0,
					dy: 6,
					color: COL.ink
				});
			}
		}
	}
};

/* ==========================================================================
   2. THE DRAWING OF AN ECCENTRIC WITH ITS FOUR SEASONS
   Figures 2 and 3 draw the same thing, seen from the north ecliptic pole
   (longitude anticlockwise, gamma to the right): the Earth O at the centre
   of the canvas, the eccentric of radius 1 centred on C = (x, y), the lines
   from O towards the equinoxes and the solstices up to the circle, and the
   length of each of the four arcs. view: an owner set up by squareCanvas,
   with 'scale' (pixels per unit of the radius).
   ========================================================================== */

/* A point (x, y), in units of the radius, on the canvas of 'view'. */
function toCanvas(view, x, y) {
	return { x: view.cx + view.scale * x, y: view.cy - view.scale * y };
}

/* The distance from O, along the direction 'lon', to the circle of radius
   1 centred on (x, y). */
function reachCircle(lon, x, y) {
	const along = x * cos(lon) + y * sin(lon);

	return along + Math.sqrt(along * along - x * x - y * y + 1);
}

/* A straight segment between two canvas points. */
function segment(ctx, a, b, style) {
	ctx.strokeStyle = style.color;
	ctx.lineWidth = style.width ?? 1.5;
	ctx.setLineDash(style.dash ?? []);
	ctx.beginPath();
	ctx.moveTo(a.x, a.y);
	ctx.lineTo(b.x, b.y);
	ctx.stroke();
	ctx.setLineDash([]);
}

/* A circular arc about a canvas point, from angle 'from' to 'to'
   (longitudes, anticlockwise on the screen), of radius r px. */
function screenArc(ctx, centre, r, from, to, style) {
	const start = -from * D2R;
	const end = -to * D2R;

	ctx.strokeStyle = style.color;
	ctx.lineWidth = style.width ?? 2;
	ctx.beginPath();
	ctx.arc(centre.x, centre.y, r, start, end, to > from);
	ctx.stroke();
}

/* The eccentric, the four lines and the season labels. centre = { x, y };
   lengths: the four seasons (days); labelShift (deg): the labels of the
   four lines are turned by this angle about the Earth, to leave room for
   other labels at the ends of the lines. */
function drawSeasons(view, centre, lengths, labelShift = 0) {
	const ctx = view.ctx;
	const C = toCanvas(view, centre.x, centre.y);
	const O = toCanvas(view, 0, 0);

	// the eccentric
	ctx.strokeStyle = COL.deferent;
	ctx.lineWidth = 2.5;
	ctx.beginPath();
	ctx.arc(C.x, C.y, view.scale, 0, TAU);
	ctx.stroke();

	// the lines to the equinoxes and solstices, labelled outside the circle
	CARDINAL_POINTS.forEach(({ lon, label }) => {
		const reach = reachCircle(lon, centre.x, centre.y);
		const end = toCanvas(view, reach * cos(lon), reach * sin(lon));
		const tagLon = lon + labelShift;
		const tag = toCanvas(view, (reach + 0.13) * cos(tagLon), (reach + 0.13) * sin(tagLon));

		segment(ctx, O, end, { color: COL.sun, width: 1.5 });
		centredLabel(ctx, label, tag, COL.sun);
	});

	// each season's name and length, inside its quarter
	SEASON_NAMES.forEach((name, i) => {
		const lon = 45 + 90 * i;
		const at = toCanvas(view, 0.58 * cos(lon), 0.58 * sin(lon));

		centredLabel(ctx, name, { x: at.x, y: at.y - 10 }, COL.ink);
		ctx.font = FONT_TICK;
		ctx.fillText(`${fixed(lengths[i], 2)} d`, at.x, at.y + 11);
	});

	// the Earth, and the centre of the eccentric
	drawDot(ctx, O.x, O.y, 6, COL.earth);
	drawDot(ctx, C.x, C.y, 3.5, COL.ink);
}

/* ==========================================================================
   3. FIGURE 2: THE ECCENTRIC AND THE EQUATION OF CENTRE
   (a) the eccentric with the apogee fixed at the 2026 fit, the Sun at the
   chosen date, the angles M (at C) and q (at the Earth); (b) q through
   2026, exact and to first order. The eccentricity slider runs from 0 to
   0.1, so |q| stays under asin 0.1 = 5.74°: fixed scale +-6°.
   ========================================================================== */

const ECCENTRIC_Q_RANGE = [-6, 6];

/* Radii (fractions of the circle's radius) of the angle arcs. */
const ARC_RADIUS = { M: 0.16, q: 0.62 };

/* The labels of the four lines turn this far clockwise, away from the
   apogee and the perigee, which lie 14° anticlockwise of 90° and 270°. */
const ECCENTRIC_LABEL_SHIFT = -16;

/* The names of the Earth and of C go along one of the diagonals, the one
   farthest from the lines drawn through the centre; distance from the
   point, in units of the radius, so that they keep their places on a
   phone. */
const CENTRE_LABEL_DIRECTIONS = [45, 135, 225, 315];
const CENTRE_LABEL_DISTANCE = { earth: 0.28, C: 0.25 };

const eccentricFigure = {
	plot: null,
	state: null,

	init() {
		const figure = byId('eccentric-canvas').closest('figure');

		squareCanvas(this, byId('eccentric-canvas'), 420, 34);

		this.plot = new Plot2D(byId('eccentric-plot'), {
			x: [0, DAYS_IN_YEAR],
			y: ECCENTRIC_Q_RANGE,
			xLabel: `date (${YEAR})`,
			yLabel: 'q (°)',
			xTicks: monthTicks,
			aspect: 0.95,
			maxHeight: 440,
			onDraw: () => this.drawPlot()
		});

		wireSlider(byId('ecc-day'), () => this.update(), dayText);
		wireSlider(
			byId('ecc-e'),
			() => this.update(),
			value => fixed(value, 4)
		);
		wirePresets(figure);
		wirePlayButton(byId('ecc-play'), byId('ecc-day'), PLAY_DAYS_PER_SECOND, { playLabel: 'Play a year' });

		this.update();
	},

	/* The parameters: the 2026 fit, with the eccentricity of the slider. */
	parameters() {
		return Object.assign({}, SolarEccentric.FIT_2026, { e: readNumber('ecc-e') });
	},

	update() {
		const parameters = this.parameters();
		const day = readNumber('ecc-day');

		this.state = {
			parameters: parameters,
			day: day,
			now: SolarEccentric.state(parameters, YEAR_START + day),
			lengths: SolarEccentric.seasonLengths(parameters.e, parameters.apogee, YEAR_LENGTH),
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
		const { day, now, lengths } = this.state;

		showLines('eccentric-readout', [
			`\\text{${dayText(day)}:}\\quad \\bar\\lambda = ${fixedAngle(now.meanLongitude, 2)}^\\circ,\\quad M = ${fixedAngle(now.M, 2)}^\\circ`,
			`q = ${texSigned(now.q)},\\quad \\lambda = \\bar\\lambda + q = ${fixedAngle(now.lambda, 2)}^\\circ`,
			`\\text{spring } ${texDays(lengths[0])},\\quad \\text{summer } ${texDays(lengths[1])}`,
			`\\text{autumn } ${texDays(lengths[2])},\\quad \\text{winter } ${texDays(lengths[3])}`
		]);
	},

	/* Panel (a). */
	draw() {
		if (!this.state) {
			return;
		}

		const ctx = this.ctx;
		const { parameters, now, lengths } = this.state;
		const { e, apogee } = parameters;
		const centre = { x: e * cos(apogee), y: e * sin(apogee) };

		// the circle and the lines reach 1.1 radii from the Earth at most
		this.scale = this.R / 1.12;
		ctx.clearRect(0, 0, this.width, this.width);

		this.drawApsides(centre, apogee);
		drawSeasons(this, centre, lengths, ECCENTRIC_LABEL_SHIFT);
		this.drawSun(centre, now);
		this.labelCentre(centre, now);
	},

	/* The names of the Earth and of C, on the two diagonals farthest from
	   the lines through the centre: the line of apsides, the mean
	   direction, the Sun, and the middle of the arc M. */
	labelCentre(centre, now) {
		const apogee = this.state.parameters.apogee;
		const busy = [apogee, apogee + 180, now.meanLongitude, now.lambda, apogee + now.M / 2];
		const clearance = lon => Math.min(...busy.map(b => Math.abs(norm180(lon - b))));
		const [first, second] = [...CENTRE_LABEL_DIRECTIONS].sort((a, b) => clearance(b) - clearance(a));
		const O = toCanvas(this, 0, 0);
		const C = toCanvas(this, centre.x, centre.y);
		const away = (from, lon, distance) => ({ x: from.x + distance * cos(lon), y: from.y - distance * sin(lon) });

		centredLabel(this.ctx, 'Earth', away(O, first, CENTRE_LABEL_DISTANCE.earth * this.scale), COL.earth);
		centredLabel(this.ctx, 'C', away(C, second, CENTRE_LABEL_DISTANCE.C * this.scale), COL.ink);
	},

	/* The dotted line of apsides, from the perigee through O and C to the
	   apogee, with the two names outside the circle. */
	drawApsides(centre, apogee) {
		const ctx = this.ctx;
		const far = toCanvas(this, centre.x + cos(apogee), centre.y + sin(apogee));
		const near = toCanvas(this, centre.x - cos(apogee), centre.y - sin(apogee));

		segment(ctx, far, near, { color: COL.muted, width: 1.2, dash: [2, 4] });
		drawDot(ctx, far.x, far.y, 3.5, COL.deferent);
		drawDot(ctx, near.x, near.y, 3.5, COL.deferent);

		[
			['apogee', apogee],
			['perigee', apogee + 180]
		].forEach(([name, lon]) => {
			centredLabel(
				ctx,
				name,
				toCanvas(this, centre.x + 1.12 * cos(lon), centre.y + 1.12 * sin(lon)),
				COL.deferent
			);
		});
	},

	/* The Sun, the mean direction from C and from O, and the angles M and q. */
	drawSun(centre, now) {
		const ctx = this.ctx;
		const { meanLongitude, lambda, q } = now;
		const apogee = this.state.parameters.apogee;
		const O = toCanvas(this, 0, 0);
		const C = toCanvas(this, centre.x, centre.y);
		const S = toCanvas(this, centre.x + cos(meanLongitude), centre.y + sin(meanLongitude));
		const meanEnd = toCanvas(this, cos(meanLongitude), sin(meanLongitude));

		// the mean direction, from C to the Sun and from the Earth parallel to it
		segment(ctx, C, S, { color: COL.deferent, width: 1.5, dash: [6, 4] });
		segment(ctx, O, meanEnd, { color: COL.deferent, width: 1.5, dash: [6, 4] });

		// the true direction, from the Earth to the Sun
		segment(ctx, O, S, { color: COL.planet, width: 2 });

		// M at C, from the apogee anticlockwise to the Sun
		screenArc(ctx, C, ARC_RADIUS.M * this.scale, apogee, apogee + norm360(meanLongitude - apogee), {
			color: COL.deferent
		});
		this.angleLabel('M', C, ARC_RADIUS.M + 0.1, apogee + norm360(meanLongitude - apogee) / 2, COL.deferent);

		// q at the Earth, from the mean direction to the Sun
		screenArc(ctx, O, ARC_RADIUS.q * this.scale, meanLongitude, meanLongitude + q, { color: COL.planet, width: 3 });
		this.angleLabel('q', O, ARC_RADIUS.q + 0.08, meanLongitude + q / 2 + (q < 0 ? -9 : 9), COL.planet);

		drawDot(ctx, S.x, S.y, 8, COL.sun);
		centredLabel(ctx, 'Sun', toCanvas(this, centre.x + 1.14 * cos(lambda), centre.y + 1.14 * sin(lambda)), COL.sun);
	},

	/* An angle's name at radius r (units of the radius) from a canvas
	   point, in the direction 'lon'. */
	angleLabel(text, from, r, lon, color) {
		const at = { x: from.x + r * this.scale * cos(lon), y: from.y - r * this.scale * sin(lon) };

		centredLabel(this.ctx, text, at, color);
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
   4. FIGURE 3: HIPPARCHUS' CONSTRUCTION
   From the lengths of spring and summer (sliders, 90 to 96 days) and the
   modern year: the centre C = (x, y), e and the apogee
   (SolarEccentric.fitSeasons). (a) the eccentric to scale with its four
   seasons; (b) the centre magnified, x and y from -0.1 to 0.1 of the
   radius: over the whole range of the sliders e stays under 0.081
   (tools/numbers/2.1-uneven-year.js), so C never leaves the panel.
   ========================================================================== */

const CENTRE_RANGE = [-0.1, 0.1];

/* The radius (units of the radius of the eccentric) of the arc lambdaA
   drawn about the Earth in panel (b). */
const APOGEE_ARC_RADIUS = 0.022;

/* Below this eccentricity the read-out shows e = 0.0000 and C is at the
   Earth, so there is no apogee to show. The preset "equal" (91.31 days,
   within 0.0005 d of a quarter of the year) gives e = 0.000005; the
   smallest step of a slider, 0.01 day, gives at least 0.00008. */
const NO_ECCENTRICITY = 5e-5;

const fitFigure = {
	plot: null,
	fit: null,

	init() {
		squareCanvas(this, byId('fit-canvas'), 420, 34);

		// a square plot box: margins left + right = top + bottom
		this.plot = new Plot2D(byId('fit-plot'), {
			x: CENTRE_RANGE,
			y: CENTRE_RANGE,
			xLabel: 'x',
			yLabel: 'y',
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
		const { arcs, x, y, e, apogee, lengths } = this.fit;
		const greatest = `|q|_\\text{max} = ${fixed(SolarEccentric.greatestEquation(e).q, 2)}^\\circ`;

		// with no eccentricity there is no apogee: the line says so instead
		const apogeeText =
			e > NO_ECCENTRICITY ? `\\lambda_A = ${fixedAngle(apogee, 1)}^\\circ` : '\\text{no apogee (C at the Earth)}';

		showLines('fit-readout', [
			`a_1 = ${fixed(arcs[0], 2)}^\\circ,\\quad a_2 = ${fixed(arcs[1], 2)}^\\circ`,
			`x = ${fixed(x, 4)},\\ y = ${fixed(y, 4)},\\quad e = ${fixed(e, 4)}`,
			`${apogeeText},\\quad ${greatest}`,
			`\\text{autumn } ${texDays(lengths[2])},\\quad \\text{winter } ${texDays(lengths[3])}`
		]);
	},

	/* Panel (a). */
	draw() {
		if (!this.fit) {
			return;
		}

		this.scale = this.R / 1.12;
		this.ctx.clearRect(0, 0, this.width, this.width);
		drawSeasons(this, this.fit, this.fit.lengths);
	},

	/* Panel (b): the lines from the Earth (the axes), the parallels through
	   C, the line towards the apogee and the angle lambdaA. */
	drawPlot() {
		if (!this.fit) {
			return;
		}

		const p = this.plot;
		const { x, y, e } = this.fit;

		p.frame();
		p.hline(0, { color: COL.sun, width: 1.5 });
		p.vline(0, { color: COL.sun, width: 1.5 });
		p.hline(y, { color: COL.deferent, width: 1.5, dash: [6, 4] });
		p.vline(x, { color: COL.deferent, width: 1.5, dash: [6, 4] });

		// C at the Earth (e = 0) has no direction to draw
		if (e > NO_ECCENTRICITY) {
			this.drawApogee();
		}

		this.labelPlot();
		p.marker(0, 0, { color: COL.earth, radius: 6 });
		p.marker(x, y, { color: COL.ink, radius: 4 });
	},

	/* The line from the Earth through C to the edge of the panel, and the
	   angle lambdaA from gamma, with its name. */
	drawApogee() {
		const p = this.plot;
		const apogee = this.fit.apogee;
		const reach = Math.SQRT2 * CENTRE_RANGE[1];
		const half = apogee / 2;
		const arc = { xs: [], ys: [] };

		p.curve([0, reach * cos(apogee)], [0, reach * sin(apogee)], { color: COL.planet, width: 2, clip: true });

		for (let a = 0; a <= apogee; a += 1) {
			arc.xs.push(APOGEE_ARC_RADIUS * cos(a));
			arc.ys.push(APOGEE_ARC_RADIUS * sin(a));
		}

		p.curve(arc.xs, arc.ys, { color: COL.planet, width: 1.5, clip: true });
		subscriptLabel(
			p.ctx,
			'λ',
			'A',
			{ x: p.px(2 * APOGEE_ARC_RADIUS * cos(half)), y: p.py(2 * APOGEE_ARC_RADIUS * sin(half)) },
			COL.planet
		);
	},

	/* The names in panel (b): the Earth, C, and where the lines lead. */
	labelPlot() {
		const p = this.plot;
		const { x, y, e, apogee } = this.fit;
		const towards = 0.75 * CENTRE_RANGE[1];

		// C beside its point, on the clockwise side of the line to the
		// apogee (below and to the right when C is at the Earth)
		const side = e > NO_ECCENTRICITY ? apogee - 90 : -45;

		p.text('Earth', 0, 0, { color: COL.earth, align: 'right', baseline: 'top', dx: -6, dy: 6 });
		centredLabel(p.ctx, 'C', { x: p.px(x) + 15 * cos(side), y: p.py(y) - 15 * sin(side) }, COL.ink);
		p.text('to γ', towards, 0, { color: COL.sun, align: 'center', baseline: 'top', dx: 0, dy: 6 });
		p.text('to 90°', 0, towards, { color: COL.sun, align: 'right', baseline: 'middle', dx: -6, dy: 0 });
	}
};

/* ==========================================================================
   5. FIGURES 4 TO 6: THE ERROR CURVES
   The models take JD(TT) and return a longitude (models/*.js); the widget
   compares them with the reference Sun (shared/errorcurve.js). No slider
   changes a model here, so the widget fits its scale to each span.
   ========================================================================== */

/* Figure 4: 2026, the fitted eccentric and the uniform circle of page 1.3. */
const errorFigure = {
	init() {
		const curve = new ErrorCurve(byId('error-2026'), {
			body: 'sun',
			start: YEAR_START,
			end: YEAR_START + 365.25,
			spans: []
		});

		curve.addGhost({
			label: 'uniform circle (page 1.3)',
			short: 'uniform circle',
			color: COL.sun,
			fn: MeanSun.make(MeanSun.MODERN)
		});
		curve.addModel({
			label: 'eccentric, fitted to 2026',
			short: 'eccentric',
			color: COL.deferent,
			fn: SolarEccentric.make(SolarEccentric.FIT_2026)
		});
	}
};

/* Figure 5: Ptolemy's Sun in his own time, and over 2,000 years around it
   (861 BC to AD 1141, inside the reference sky's range). */
const ptolemyFigure = {
	init() {
		const start = Time.julianDay(140, 1, 1);
		const curve = new ErrorCurve(byId('error-ptolemy'), {
			body: 'sun',
			start: start,
			end: start + 365.25,
			spans: [
				{ label: '1 year', years: 1 },
				{ label: '2,000 years', years: 2000 }
			]
		});

		curve.addGhost({
			label: "Ptolemy's uniform circle",
			short: 'uniform circle',
			color: COL.sun,
			fn: MeanSun.make(MeanSun.PTOLEMY)
		});
		curve.addModel({
			label: "Ptolemy's eccentric (<em>Almagest</em> III)",
			short: "Ptolemy's eccentric",
			color: COL.epicycle,
			fn: SolarEccentric.make(SolarEccentric.PTOLEMY)
		});
	}
};

/* Figure 6: our eccentric alone, over one year to a thousand. */
const residualFigure = {
	init() {
		const curve = new ErrorCurve(byId('error-residual'), {
			body: 'sun',
			start: YEAR_START,
			end: YEAR_START + 365.25,
			spans: [
				{ label: '1 year', years: 1 },
				{ label: '100 years', years: 100 },
				{ label: '1,000 years', years: 1000 }
			]
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
   6. PAGE START
   Shared components first (they typeset the prose), then the figures.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
	Site.initPage();
	startFigures([motionFigure, eccentricFigure, fitFigure, errorFigure, ptolemyFigure, residualFigure]);
});
