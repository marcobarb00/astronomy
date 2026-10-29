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
	 4. the first error curve        ((a) the eccentric fitted to 2026 and
									   the uniform circle; (b) the eccentric
									   alone, magnified)
	 5. Ptolemy's Sun                (error curve, AD 140 and 2000 years)
	 6. the eccentric's residual     (error curve, 100 and 1000 years)
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
   Figure 2 (a), seen from the north ecliptic pole (longitude
   anticlockwise, gamma to the right): the Earth O at the centre of the
   canvas, the eccentric of radius 1 centred on C = (h, k), the lines from
   O towards the equinoxes and the solstices up to the circle, and the
   length of each of the four arcs; with the drawing helpers that Figure 3
   shares. view: an owner set up by squareCanvas, with 'scale' (pixels per
   unit of the radius).
   ========================================================================== */

/* A point (x, y), in units of the radius with the Earth at the origin,
   on the canvas of 'view', whose centre shows the point view.centre
   ({ h, k }, the centre of the eccentric). */
function toCanvas(view, x, y) {
	return { x: view.cx + view.scale * (x - view.centre.h), y: view.cy - view.scale * (y - view.centre.k) };
}

/* The distance from O, along the direction 'lon', to the circle of radius
   1 centred on (h, k). */
function reachCircle(lon, h, k) {
	const along = h * cos(lon) + k * sin(lon);

	return along + Math.sqrt(along * along - h * h - k * k + 1);
}

/* The eccentric, the four lines and the season labels. centre = { h, k };
   lengths: the four seasons (days); labelShift (deg): the labels of the
   four lines are turned by this angle about the Earth, to leave room for
   other labels at the ends of the lines. */
function drawSeasons(view, centre, lengths, labelShift = 0) {
	const ctx = view.ctx;
	const C = toCanvas(view, centre.h, centre.k);
	const O = toCanvas(view, 0, 0);

	// the eccentric
	ctx.strokeStyle = COL.deferent;
	ctx.lineWidth = 2.5;
	ctx.beginPath();
	ctx.arc(C.x, C.y, view.scale, 0, TAU);
	ctx.stroke();

	// the lines to the equinoxes and solstices, labelled outside the circle
	CARDINAL_POINTS.forEach(({ lon, label }) => {
		const reach = reachCircle(lon, centre.h, centre.k);
		const end = toCanvas(view, reach * cos(lon), reach * sin(lon));
		const tagLon = lon + labelShift;
		const tag = toCanvas(view, (reach + 0.13) * cos(tagLon), (reach + 0.13) * sin(tagLon));

		segment(ctx, O, end, { color: COL.sun, width: 1.5 });
		centredLabel(ctx, label, tag, COL.sun);
	});

	// each season's name and length, inside its quarter of the circle
	SEASON_NAMES.forEach((name, i) => {
		const lon = 45 + 90 * i;
		const at = toCanvas(view, centre.h + 0.7 * cos(lon), centre.k + 0.7 * sin(lon));

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
   0.2 (it starts at 0.2, six times the Sun's, so that the geometry can be
   seen), so |q| stays under asin 0.2 = 11.54°: fixed scale +-12°.
   ========================================================================== */

const ECCENTRIC_Q_RANGE = [-12, 12];

/* The drawing is centred on C: the circle, and the labels just outside
   it (0.12 to 0.14 radii beyond), fit ECCENTRIC_REACH radii. */
const ECCENTRIC_REACH = 1.2;

/* Radii (fractions of the circle's radius) of the angle arcs. */
const ARC_RADIUS = { M: 0.16, q: 0.62 };

/* The labels of the four lines turn this far clockwise, away from the
   apogee and the perigee, which lie 14° anticlockwise of 90° and 270°. */
const ECCENTRIC_LABEL_SHIFT = -16;

/* The Earth is named O, a single letter that may change sides without
   jumping far (CLAUDE.md), 45° to one side of the line of apsides away
   from C, EARTH_LABEL_DISTANCE px from it; C 45° to one side of the line
   of apsides beyond C, CENTRE_LABEL_DISTANCE radii away. Each takes the
   side farther from the other lines through the centre. */
const CENTRE_LABEL_TURN = 45;
const CENTRE_LABEL_DISTANCE = 0.2;
const EARTH_LABEL_DISTANCE = 16;

const eccentricFigure = {
	plot: null,
	state: null,

	init() {
		const figure = byId('eccentric-canvas').closest('figure');

		squareCanvas(this, byId('eccentric-canvas'), 420, 26);

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
		const centre = { h: e * cos(apogee), k: e * sin(apogee) };

		// the circle and the lines reach 1.1 radii from the Earth at most
		this.scale = this.R / ECCENTRIC_REACH;
		this.centre = centre;
		ctx.clearRect(0, 0, this.width, this.width);

		this.drawApsides(centre, apogee);
		drawSeasons(this, centre, lengths, ECCENTRIC_LABEL_SHIFT);
		this.drawSun(centre, now);
		this.labelCentre(centre, now);
	},

	/* The names of the Earth O and of C (CENTRE_LABEL_TURN), clear of the
	   mean direction, the Sun and the middle of the arc M. */
	labelCentre(centre, now) {
		const apogee = this.state.parameters.apogee;
		const busy = [now.meanLongitude, now.lambda, apogee + now.M / 2];
		const clearance = lon => Math.min(...busy.map(b => Math.abs(norm180(lon - b))));
		const better = (a, b) => (clearance(a) >= clearance(b) ? a : b);
		const earthSide = better(apogee + 180 - CENTRE_LABEL_TURN, apogee + 180 + CENTRE_LABEL_TURN);
		const cSide = better(apogee - CENTRE_LABEL_TURN, apogee + CENTRE_LABEL_TURN);
		const O = toCanvas(this, 0, 0);
		const C = toCanvas(this, centre.h, centre.k);
		const away = (from, lon, distance) => ({ x: from.x + distance * cos(lon), y: from.y - distance * sin(lon) });

		const ctx = this.ctx;

		centredLabel(ctx, 'O', away(O, earthSide, EARTH_LABEL_DISTANCE), COL.earth);
		centredLabel(ctx, 'C', away(C, cSide, CENTRE_LABEL_DISTANCE * this.scale), COL.ink);
	},

	/* The dotted line of apsides, from the perigee through O and C to the
	   apogee, with the two names outside the circle. */
	drawApsides(centre, apogee) {
		const ctx = this.ctx;
		const far = toCanvas(this, centre.h + cos(apogee), centre.k + sin(apogee));
		const near = toCanvas(this, centre.h - cos(apogee), centre.k - sin(apogee));

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
				toCanvas(this, centre.h + 1.12 * cos(lon), centre.k + 1.12 * sin(lon)),
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
		const C = toCanvas(this, centre.h, centre.k);
		const S = toCanvas(this, centre.h + cos(meanLongitude), centre.k + sin(meanLongitude));
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
		centredLabel(ctx, 'Sun', toCanvas(this, centre.h + 1.14 * cos(lambda), centre.k + 1.14 * sin(lambda)), COL.sun);
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
   modern year: the centre C = (h, k), e and the apogee
   (SolarEccentric.fitSeasons).
   (a) the construction of section 3, centred on C, with C drawn
	   FIT_EXAGGERATION times farther from the Earth than the fit puts it,
	   so that the small angles arcsin h and arcsin k can be seen: the
	   axes through the Earth, the parallels to them through C, the radii
	   from C to the four points where the axes meet the circle, the two
	   small angles and the arcs a1 (spring) and a2 (summer).
   (b) the centre at its true place, magnified: h and k from -0.1 to 0.1
	   of the radius; over the whole range of the sliders e stays under
	   0.081 (tools/numbers/2.1-uneven-year.js), so C never leaves the
	   panel, and the drawn offset in (a) stays under 0.49 of the radius.
   ========================================================================== */

const CENTRE_RANGE = [-0.1, 0.1];

/* Panel (a) draws C this many times farther from the Earth. */
const FIT_EXAGGERATION = 6;

/* Panel (a): the radius of the arcs of the two small angles at C, and
   where their names go (units of the radius, relative to C): 'along' the
   parallel, and 'clear' beyond the radius, on the side where the angle
   opens, so that the name does not sit on a line. When the angle is
   within 'ramp' of zero the name slides across the radius instead of
   jumping to the other side (CLAUDE.md). */
const SMALL_ANGLE_RADIUS = 0.45;
const SMALL_ANGLE_LABEL = { along: 0.6, clear: { k: 0.11, h: 0.24 }, ramp: 0.03 };

/* Panel (b): the radius of the arc lambdaA about the Earth, and of its
   name (units of the radius of the eccentric), beyond C (e >= 0.033 for
   every preset but "equal"). */
const APOGEE_LABEL_RADIUS = 0.075;

/* The radius (units of the radius of the eccentric) of the arc lambdaA
   drawn about the Earth in panel (b). */
const APOGEE_ARC_RADIUS = 0.05;

/* Below this eccentricity the read-out shows e = 0.0000 and C is at the
   Earth, so there is no apogee to show. The preset "equal" (91.31 days,
   within 0.0005 d of a quarter of the year) gives e = 0.000005; the
   smallest step of a slider, 0.01 day, gives at least 0.00008. */
const NO_ECCENTRICITY = 5e-5;

/* "arcsin k": the function upright, the variable in italics, centred at a
   canvas point, in the text colour of 'color'. */
function arcsinLabel(ctx, variable, point, color) {
	const functionFont = '500 16px Spectral, Georgia, serif';
	const space = 4;

	ctx.font = functionFont;
	const functionWidth = ctx.measureText('arcsin').width;
	ctx.font = FONT_SYMBOL;
	const variableWidth = ctx.measureText(variable).width;
	const left = point.x - (functionWidth + space + variableWidth) / 2;

	ctx.fillStyle = textColor(color);
	ctx.textAlign = 'left';
	ctx.textBaseline = 'middle';
	ctx.font = functionFont;
	ctx.fillText('arcsin', left, point.y);
	ctx.font = FONT_SYMBOL;
	ctx.fillText(variable, left + functionWidth + space, point.y);
}

const fitFigure = {
	plot: null,
	fit: null,

	init() {
		squareCanvas(this, byId('fit-canvas'), 420, 30);

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

		this.scale = this.R / 1.18;

		const C = this.fromC(0, 0);
		const O = this.fromC(-h, -k);

		ctx.clearRect(0, 0, this.width, this.width);

		this.drawParallels();
		this.drawCircle(angles);
		this.drawAxes(h, k, angles);
		this.drawSmallAngles(angles);

		drawDot(ctx, O.x, O.y, 6, COL.earth);
		drawDot(ctx, C.x, C.y, 4, COL.ink);
		centredLabel(ctx, 'O', { x: O.x - 13, y: O.y + 13 }, COL.earth);
		centredLabel(ctx, 'C', { x: C.x - 13, y: C.y - 13 }, COL.ink);
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

		ctx.strokeStyle = COL.deferent;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(C.x, C.y, this.scale, 0, TAU);
		ctx.stroke();

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
			const tag = this.fromC(1.1 * cos(angle), 1.1 * sin(angle));

			segment(ctx, O, point, { color: COL.sun, width: 1.5 });
			segment(ctx, C, point, { color: COL.ink, width: 1 });
			drawDot(ctx, point.x, point.y, 3.5, COL.ink);
			centredLabel(ctx, CARDINAL_POINTS[i].label, tag, COL.sun);
		});
	},

	/* At C, the angle arcsin k from the parallel to the x axis to the
	   radius towards gamma, and arcsin h from the parallel to the y axis
	   to the radius towards 90°, each with its name. */
	drawSmallAngles(angles) {
		const ctx = this.ctx;
		const C = this.fromC(0, 0);
		const r = SMALL_ANGLE_RADIUS * this.scale;
		const { along, clear, ramp } = SMALL_ANGLE_LABEL;
		const side = offset => Math.max(-1, Math.min(1, offset / ramp));

		// how far the radius to gamma has dropped below the parallel (or
		// risen above it) at 'along', and how far the radius to 90° has
		// moved to the left of its parallel (or to the right)
		const drop = along * tan(angles[0]);
		const shift = along * tan(90 - angles[1]);
		const kLabel = this.fromC(along, drop + side(drop) * clear.k);
		const hLabel = this.fromC(shift + side(shift) * clear.h, along);

		this.angleWedge(C, r, 0, angles[0]);
		this.angleWedge(C, r, 90, angles[1]);
		arcsinLabel(ctx, 'k', kLabel, COL.planet);
		arcsinLabel(ctx, 'h', hLabel, COL.planet);
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

		this.labelPlot();
		p.marker(0, 0, { color: COL.earth, radius: 6 });
		p.marker(h, k, { color: COL.ink, radius: 4 });
	},

	/* The line from the Earth through C to the edge of the panel, and the
	   angle lambdaA from gamma, with its name. */
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
		subscriptLabel(
			p.ctx,
			'λ',
			'A',
			{ x: p.px(APOGEE_LABEL_RADIUS * cos(half)), y: p.py(APOGEE_LABEL_RADIUS * sin(half)) },
			COL.ink
		);
	},

	/* The names in panel (b): the Earth O, C, h and k, single letters
	   that may change sides as C crosses an axis (CLAUDE.md). Each goes on
	   the side of the axes away from C, so that none sits on the dashed
	   parallels: O in the quadrant opposite C, h under (or over) the x
	   axis, k beside the y axis, C on its far side from the y axis. The
	   axis titles say where the axes lead. */
	labelPlot() {
		const p = this.plot;
		const { h, k } = this.fit;
		const right = h < 0 ? 1 : -1; // the side of the y axis away from C
		const below = k < 0 ? -1 : 1; // the side of the x axis away from C

		centredLabel(p.ctx, 'O', { x: p.px(0) + 12 * right, y: p.py(0) + 14 * below }, COL.earth);
		centredLabel(p.ctx, 'C', { x: p.px(h) - 14 * right, y: p.py(k) - 12 }, COL.ink);
		centredLabel(p.ctx, 'h', { x: p.px(h / 2), y: p.py(0) + 14 * below }, COL.planet);
		centredLabel(p.ctx, 'k', { x: p.px(0) + 12 * right, y: p.py(k / 2) }, COL.planet);
	}
};

/* ==========================================================================
   5. FIGURES 4 TO 6: THE ERROR CURVES
   The models take JD(TT) and return a longitude (models/*.js); the widget
   compares them with the reference Sun (shared/errorcurve.js). No slider
   changes a model here, so the widget fits its scale to each span.
   ========================================================================== */

/* Figure 4: 2026. (a) the fitted eccentric and the uniform circle of page
   1.3, on the scale of the uniform circle's error; (b) the eccentric
   alone, on a scale about 60 times finer, where its own error shows. */
const errorFigure = {
	init() {
		const both = new ErrorCurve(byId('error-2026'), {
			body: 'sun',
			start: YEAR_START,
			end: YEAR_START + 365.25,
			spans: [],
			ghostButtons: false
		});

		both.addGhost({
			label: 'uniform circle (page 1.3)',
			short: 'uniform circle',
			color: COL.sun,
			fn: MeanSun.make(MeanSun.MODERN)
		});
		both.addModel(eccentricModel());

		const alone = new ErrorCurve(byId('error-2026-zoom'), {
			body: 'sun',
			start: YEAR_START,
			end: YEAR_START + 365.25,
			spans: [],
			ghostButtons: false
		});

		alone.addModel(eccentricModel());
	}
};

/* The fitted eccentric, as an error-curve model (Figures 4 and 6). */
function eccentricModel() {
	return {
		label: 'eccentric, fitted to 2026',
		short: 'eccentric',
		color: COL.deferent,
		fn: SolarEccentric.make(SolarEccentric.FIT_2026)
	};
}

/* Figure 5: Ptolemy's Sun in his own time, and over 2000 years around it
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
				{ label: '2000 years', years: 2000 }
			],
			ghostButtons: false
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

/* Figure 6: our eccentric over a century and a thousand years, centred on
   the middle of 2026 (Figure 4 (b) shows the year itself). */
const residualFigure = {
	init() {
		const middle = YEAR_START + 365.25 / 2;
		const halfCentury = (100 * 365.25) / 2;
		const curve = new ErrorCurve(byId('error-residual'), {
			body: 'sun',
			start: middle - halfCentury,
			end: middle + halfCentury,
			spans: [
				{ label: '100 years', years: 100 },
				{ label: '1000 years', years: 1000 }
			],
			ghostButtons: false
		});

		curve.addModel(eccentricModel());
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
