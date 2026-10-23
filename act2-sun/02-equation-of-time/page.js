// @ts-check
/* ==========================================================================
   PAGE 2.2 · THE EQUATION OF TIME - SCRIPT (page.js)
   Six figures, each with its own init and draw (and update when it has
   controls):
	 1. the sundial and the clock      (2D, static: (a) the true solar day
										 minus 24 h, (b) its running sum, E,
										 through 2026)
	 2. the reduction to the equator   (3D sphere and 2D plot: longitude
										 and obliquity)
	 3. the two parts and their sum    (2D, through 2026, pointer read-out)
	 4. the analemma                   (2D: date; both causes, eccentricity
										 only, obliquity only)
	 5. the model against the real E   (2D, two panels, pointer read-out)
	 6. the equation of time over the centuries
									   (2D: the real E against the Sun's
										 longitude in a chosen year)
   Shared code: common.js, time.js, ephemeris.js, sphere3d.js, plot2d.js,
   models/frames.js, models/mean-sun.js, models/solar-eccentric.js,
   models/equation-of-time.js, components.js.
   Every number quoted in the prose comes from
   tools/numbers/2.2-equation-of-time.js.

   Sign: E is apparent minus mean solar time, positive when the sundial
   is ahead of the clock (models/equation-of-time.js).

   TABLE OF CONTENTS
	 0. Helpers shared by the figures
	 1. Figure 1: the sundial and the clock
	 2. Figure 2: the reduction to the equator
	 3. Figure 3: the two parts and their sum
	 4. Figure 4: the analemma
	 5. Figure 5: the model against the real equation of time
	 6. Figure 6: the equation of time over the centuries
	 7. Page start
   ========================================================================== */

/* ==========================================================================
   0. HELPERS SHARED BY THE FIGURES
   ========================================================================== */

/* The year of the figures, and 0 h UT of its first day (JD). */
const YEAR = 2026;
const YEAR_START = Time.julianDay(YEAR, 1, 1);
const DAYS_IN_YEAR = 365;

/* The page's model: the eccentric of page 2.1 fitted to the seasons of
   2026, with the mean obliquity of date. */
const SUN_MODEL = SolarEccentric.FIT_2026;

/* The date sliders play a year in about 12 seconds. */
const PLAY_DAYS_PER_SECOND = 30;

/* Minutes of time per degree of the sky's turn. */
const MIN_PER_DEG = EquationOfTime.MINUTES_PER_DEGREE;

/* First day of each month, as a day index of the year (0 = 1 January). */
const MONTH_STARTS = Time.MONTH_NAMES.map((name, i) => ({
	value: Time.julianDay(YEAR, i + 1, 1) - YEAR_START,
	label: name
}));

/* Ticks of a date axis: every month when there is room, else every other. */
const monthTicks = (min, max, count) => MONTH_STARTS.filter((t, i) => count >= 8 || i % 2 === 0);

/* Ticks of a longitude axis: every 90°. */
const longitudeTicks = () => [0, 90, 180, 270, 360].map(value => ({ value, label: `${value}°` }));

/* "3 Nov" for a day index of the year (the year is in the panel titles). */
function dayText(day) {
	const date = Time.calendarDate(YEAR_START + day);

	return `${Math.floor(date.day)} ${Time.MONTH_NAMES[date.month - 1]}`;
}

/* JD(TT) of 12:00 UT, mean noon at Greenwich, on a day of the year. */
const noonTT = day => Time.ttFromUt(YEAR_START + day + 0.5);

/* Minutes of time in TeX, to the second: "+16\,\text{min}\ 31\,\text{s}". */
function texMinSec(minutes) {
	const total = Math.round(Math.abs(minutes) * 60);

	// no sign on a value that rounds to zero
	const sign = total === 0 ? '' : minutes < 0 ? '-' : '+';
	const seconds = String(total % 60).padStart(2, '0');

	return `${sign}${Math.floor(total / 60)}\\,\\text{min}\\ ${seconds}\\,\\text{s}`;
}

/* A year as the text says it: "141 BC", "AD 140", "2026". */
function yearText(year) {
	return year > 0 && year < 1000 ? `AD ${year}` : Time.formatYear(year);
}

/* A signed number in TeX, braced so that its sign is never spaced as an
   operator after a word: "{+1.70}", "{-2.43}". */
const texSigned = (x, digits = 2) => `{${signed(x, digits).replace('−', '-')}}`;

/* The real equation of time (minutes) at 12:00 UT on every day from
   1 January 2026 to 1 January 2027 (Meeus 28.1, Ephem), computed once
   and shared by Figures 1, 3 and 5. Within 0.22 s of the value from the
   real Sun's meridian crossings (tools/numbers/2.2-equation-of-time.js). */
let realEquationCache = null;

function realEquation() {
	if (!realEquationCache) {
		realEquationCache = [];

		for (let day = 0; day <= DAYS_IN_YEAR; day++) {
			realEquationCache.push(Ephem.equationOfTime(noonTT(day)));
		}
	}

	return realEquationCache;
}

/* The model's parts at 12:00 UT on every day of 2026, computed once:
   [{ eccentricity, obliquity, total (minutes), lambda, ... }]. */
let modelPartsCache = null;

function modelParts() {
	if (!modelPartsCache) {
		modelPartsCache = [];

		for (let day = 0; day <= DAYS_IN_YEAR; day++) {
			modelPartsCache.push(EquationOfTime.parts(SUN_MODEL, noonTT(day)));
		}
	}

	return modelPartsCache;
}

/* The day indexes 0..365. */
const DAYS = Array.from({ length: DAYS_IN_YEAR + 1 }, (_, i) => i);

/* The day index under the pointer, or null off the plot. */
const dayAt = x => (x === null ? null : clamp(Math.round(x), 0, DAYS_IN_YEAR));

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

/* ==========================================================================
   1. FIGURE 1: THE SUNDIAL AND THE CLOCK
   Static. (a) The true solar day, from one real noon at Greenwich to the
   next, minus 24 h, in seconds: the day ending on each date lasts
   24 h - (E(that noon) - E(the noon before)), with E in time. (b) E
   itself, the running sum of (a) with the opposite sign. Dotted lines:
   the days of exactly 24 h, where E turns. Fixed scales: the day from
   -21.4 to +29.8 s, E from -14.20 to +16.45 min
   (tools/numbers/2.2-equation-of-time.js).
   ========================================================================== */

const DAY_EXCESS_RANGE = [-25, 35];
const EQUATION_RANGE = [-18, 18];

const sundialFigure = {
	init() {
		const E = realEquation();

		// the day ending on day d: from the noon of d - 1 to the noon of d
		this.excess = DAYS.map(d => (d === 0 ? NaN : -(E[d] - E[d - 1]) * 60));
		this.turns = [];

		for (let d = 2; d <= DAYS_IN_YEAR; d++) {
			if (Math.sign(this.excess[d]) !== Math.sign(this.excess[d - 1])) {
				this.turns.push(d - 1);
			}
		}

		this.dayPlot = new Plot2D(byId('sundial-day'), {
			x: [0, DAYS_IN_YEAR],
			y: DAY_EXCESS_RANGE,
			xLabel: `date (${YEAR})`,
			yLabel: 'true solar day − 24 h (s)',
			xTicks: monthTicks,
			aspect: 0.75,
			maxHeight: 360,
			onDraw: p => this.drawDay(p)
		});

		this.equationPlot = new Plot2D(byId('sundial-equation'), {
			x: [0, DAYS_IN_YEAR],
			y: EQUATION_RANGE,
			xLabel: `date (${YEAR})`,
			yLabel: 'sundial − clock, E (min)',
			xTicks: monthTicks,
			aspect: 0.75,
			maxHeight: 360,
			onDraw: p => this.drawEquation(p)
		});
	},

	/* The dotted lines of the days of 24 h. */
	drawTurns(p) {
		this.turns.forEach(day => p.vline(day, { color: COL.muted, width: 1.2, dash: [2, 4] }));
	},

	drawDay(p) {
		p.frame();
		p.hline(0, { color: COL.ink, width: 1 });
		this.drawTurns(p);
		p.curve(DAYS, this.excess, { color: COL.sun, width: 2.5 });
	},

	drawEquation(p) {
		p.frame();
		p.hline(0, { color: COL.ink, width: 1 });
		this.drawTurns(p);
		p.curve(DAYS, realEquation(), { color: COL.planet, width: 2.5 });
	}
};

/* ==========================================================================
   2. FIGURE 2: THE REDUCTION TO THE EQUATOR
   (a) The sphere in the equatorial frame (x towards gamma, z towards P):
   the equator, the ecliptic tilted by eps, the Sun on the ecliptic at
   longitude lambda moving uniformly (no eccentricity), its hour circle
   from P down to the equator at its right ascension alpha, and the mean
   Sun on the equator at alpha_m = lambda; the arc between them is
   lambda - alpha. (b) lambda - alpha against lambda, exact and to first
   order, e_eps sin 2 lambda. The obliquity runs from 0 to 45° (it starts
   at 45°, so the arc can be seen): lambda - alpha stays under asin
   tan^2(22.5°) = 9.88°, so the scale is fixed at +-10°.
   ========================================================================== */

const REDUCTION_RANGE = [-10, 10];

/* The arrow of the polar axis and of gamma reach this far. */
const AXIS_LENGTH = 1.25;

/* The name of the arc lambda - alpha sits this far out from the sphere. */
const ARC_LABEL_RADIUS = 1.16;

/* The hour circle is drawn in steps of this many degrees: each step is
   drawn as its own dashed segment, so a step must be longer than a dash. */
const HOUR_CIRCLE_STEP = 10;

/* The name of the mean Sun goes above it, to the right, clear of the
   equator and of the name of the arc below it (px). */
const MEAN_SUN_LABEL = { dx: 10, dy: -10 };

const reductionFigure = {
	sphere: null,
	plot: null,
	state: null,

	init() {
		const figure = byId('reduction-sphere').closest('figure');

		this.sphere = new Sphere3D(byId('reduction-sphere'), {
			yaw: 235,
			pitch: 26,
			onDraw: () => this.draw()
		});

		this.plot = new Plot2D(byId('reduction-plot'), {
			x: [0, 360],
			y: REDUCTION_RANGE,
			xLabel: 'longitude λ',
			yLabel: 'λ − α (°)',
			xTicks: longitudeTicks,
			aspect: 0.95,
			maxHeight: 440,
			onDraw: p => this.drawPlot(p)
		});

		wireSlider(
			byId('red-lon'),
			() => this.update(),
			value => `${value}°`
		);
		wireSlider(
			byId('red-eps'),
			() => this.update(),
			value => `${fixed(value, 2)}°`
		);
		wirePresets(figure);
		wirePlayButton(byId('red-play'), byId('red-lon'), PLAY_DAYS_PER_SECOND, { playLabel: 'Play a year' });

		this.update();
	},

	update() {
		const lon = readNumber('red-lon');
		const eps = readNumber('red-eps');
		const point = Frames.eclipticPoint(lon, eps);

		this.state = {
			lon: lon,
			eps: eps,
			alpha: point.ra,
			dec: point.dec,
			toAlpha: -EquationOfTime.reduction(lon, eps),
			greatest: EquationOfTime.greatestReduction(eps)
		};

		this.showReadout();
		this.sphere.redraw();
		this.plot.redraw();
	},

	showReadout() {
		const { lon, eps, alpha, toAlpha, greatest } = this.state;

		showLines('reduction-readout', [
			`\\lambda = ${fixed(lon, 0)}^\\circ,\\quad \\alpha = ${fixedAngle(alpha, 2)}^\\circ`,
			`\\lambda - \\alpha = ${texSigned(toAlpha)}^\\circ = ${texSigned(toAlpha * MIN_PER_DEG)}\\,\\text{min of time}`,
			`e_\\varepsilon = \\tan^2(\\varepsilon/2) = ${fixed(EquationOfTime.reductionEccentricity(eps), 4)}`,
			`\\text{greatest } ${fixed(greatest.value, 2)}^\\circ \\text{ at } \\lambda = ${fixed(greatest.lon, 1)}^\\circ`
		]);
	},

	/* Panel (a). */
	draw() {
		if (!this.state) {
			return; // a resize can ask for a drawing before the first update
		}

		const s = this.sphere;
		const { lon, eps, alpha } = this.state;
		const toEquatorial = Frames.eclipticToEquatorialMatrix(eps);
		const yEcliptic = matApply(toEquatorial, [0, 1, 0]);
		const sun = matApply(toEquatorial, fromLonLat(lon, 0));
		const meanSun = fromLonLat(lon, 0);
		const foot = fromLonLat(alpha, 0);

		s.outline();

		// the equator and the ecliptic, with P and gamma
		s.circle([1, 0, 0], [0, 1, 0], { color: COL.earth, width: 2 });
		s.circle([1, 0, 0], yEcliptic, { color: COL.sun, width: 2 });
		s.axis([0, 0, AXIS_LENGTH], 'P', { color: COL.earth, labelColor: COL.earth });
		s.arrow(ORIGIN, [AXIS_LENGTH, 0, 0], { color: COL.ink });
		s.label('γ', [AXIS_LENGTH, 0, 0], { color: COL.ink, dx: 6, dy: 16 });

		// the Sun's hour circle, from P through the Sun to the equator
		const hourCircle = [];

		// in steps of 10°, long enough for the dashes to show
		for (let dec = 90; dec >= 0; dec -= HOUR_CIRCLE_STEP) {
			hourCircle.push(fromLonLat(alpha, dec));
		}

		s.path(hourCircle, { color: COL.ink, width: 1.5, dash: [5, 4] });

		// the arc lambda - alpha on the equator, from the foot of the hour
		// circle to the mean Sun
		const arc = [];
		const steps = 30;

		for (let i = 0; i <= steps; i++) {
			arc.push(fromLonLat(lerp(alpha, alpha + norm180(lon - alpha), i / steps), 0));
		}

		s.path(arc, { color: COL.planet, width: 5 });

		if (Math.abs(norm180(lon - alpha)) > 0.5) {
			s.label(
				'λ − α',
				fromLonLat(alpha + norm180(lon - alpha) / 2, 0).map(c => c * ARC_LABEL_RADIUS),
				{
					color: COL.planet,
					dx: -14,
					dy: 18
				}
			);
		}

		s.point(foot, { color: COL.ink, radius: 3.5 });
		s.point(meanSun, { color: COL.earth, radius: 6, ring: true });
		s.point(sun, { color: COL.sun, radius: 7, ring: true });
		s.label('mean Sun', meanSun, { color: COL.earth, dx: MEAN_SUN_LABEL.dx, dy: MEAN_SUN_LABEL.dy });
		s.labelAway('Sun', sun, foot, COL.sun);
	},

	/* Panel (b). */
	drawPlot(p) {
		if (!this.state) {
			return;
		}

		const { lon, eps, toAlpha } = this.state;
		const eEps = EquationOfTime.reductionEccentricity(eps);

		p.frame();
		p.hline(0, { color: COL.ink, width: 1 });
		[90, 180, 270].forEach(x => p.vline(x, { color: COL.line, width: 1 }));
		p.fn(x => eEps * sin(2 * x) * R2D, { color: COL.muted, width: 1.5, dash: [6, 4] }, 360);
		p.fn(x => -EquationOfTime.reduction(x, eps), { color: COL.planet, width: 2.5 }, 360);
		p.marker(lon, toAlpha, { color: COL.planet, radius: 5 });
	}
};

/* ==========================================================================
   3. FIGURE 3: THE TWO PARTS AND THEIR SUM
   Through 2026 at 12:00 UT: the eccentricity part -q (amplitude 7.67
   min), the obliquity part lambda - alpha (9.86 min) and their sum E
   (-14.22 to +16.52 min): fixed scale +-18 min. Pointing at the plot
   reads a date; otherwise the read-out gives the whole year.
   ========================================================================== */

const partsFigure = {
	plot: null,

	init() {
		const parts = modelParts();

		this.eccentricity = parts.map(p => p.eccentricity);
		this.obliquity = parts.map(p => p.obliquity);
		this.total = parts.map(p => p.total);

		this.plot = new Plot2D(byId('parts-plot'), {
			x: [0, DAYS_IN_YEAR],
			y: EQUATION_RANGE,
			xLabel: `date (${YEAR})`,
			yLabel: 'minutes of time',
			xTicks: monthTicks,
			aspect: 0.45,
			maxHeight: 380,
			onDraw: p => this.draw(p),
			onHover: x => this.showReadout(dayAt(x))
		});

		this.showReadout(null);
	},

	draw(p) {
		p.frame();
		p.hline(0, { color: COL.ink, width: 1 });
		p.curve(DAYS, this.eccentricity, { color: COL.deferent, width: 2 });
		p.curve(DAYS, this.obliquity, { color: COL.earth, width: 2 });
		p.curve(DAYS, this.total, { color: COL.planet, width: 3 });
	},

	/* The values on a day, or, off the plot, their range over the year. */
	showReadout(day) {
		if (day === null) {
			const range = list => `${texSigned(Math.min(...list))} \\text{ to } ${texSigned(Math.max(...list))}`;

			showLines('parts-readout', [
				`\\text{${YEAR}:}\\quad E \\text{ from } ${range(this.total)}\\,\\text{min}`,
				`\\text{amplitudes: } -q\\ \\ ${fixed(Math.max(...this.eccentricity), 2)},\\quad \\lambda - \\alpha\\ \\ ${fixed(Math.max(...this.obliquity), 2)}\\,\\text{min}`
			]);
			return;
		}

		showLines('parts-readout', [
			`\\text{${dayText(day)}:}\\quad E = ${texMinSec(this.total[day])}`,
			`-q = ${texSigned(this.eccentricity[day])},\\quad \\lambda - \\alpha = ${texSigned(this.obliquity[day])}\\,\\text{min}`
		]);
	}
};

/* ==========================================================================
   4. FIGURE 4: THE ANALEMMA
   The Sun at mean noon (12:00 UT at Greenwich) each day of 2026: its
   hour angle H = E (as an angle, E / 4 degrees, west to the right) and
   its declination. Three versions: both causes (the page's model); the
   eccentricity only (H = -q, the obliquity left out of E, the
   declination still from the tilted ecliptic); the obliquity only (the
   uniform Sun, e = 0). The dots mark the first of each month. In every
   version |H| < 4.13° and |delta| < 23.44°: fixed scales +-6° (room for
   the names of the months beside the curve, on a phone too) and +-26°.
   ========================================================================== */

const ANALEMMA_H_RANGE = [-6, 6];
const ANALEMMA_DEC_RANGE = [-26, 26];

const ANALEMMA_BOTH = 'both causes';
const ANALEMMA_ECCENTRICITY = 'eccentricity only';
const ANALEMMA_OBLIQUITY = 'obliquity only';

const analemmaFigure = {
	plot: null,
	mode: ANALEMMA_BOTH,
	curves: null,

	init() {
		const figure = byId('analemma-plot').closest('figure');

		this.curves = this.buildCurves();

		this.plot = new Plot2D(byId('analemma-plot'), {
			x: ANALEMMA_H_RANGE,
			y: ANALEMMA_DEC_RANGE,
			xLabel: 'hour angle H at mean noon (°), west →',
			yLabel: 'declination δ (°)',
			aspect: 1.05,
			minHeight: 320,
			maxHeight: 560,
			onDraw: p => this.draw(p)
		});

		buildChoice(
			byId('analemma-modes'),
			[ANALEMMA_BOTH, ANALEMMA_ECCENTRICITY, ANALEMMA_OBLIQUITY],
			this.mode,
			name => {
				this.mode = name;
				this.update();
			}
		);

		wireSlider(byId('ana-day'), () => this.update(), dayText);
		wirePresets(figure);
		wirePlayButton(byId('ana-play'), byId('ana-day'), PLAY_DAYS_PER_SECOND, { playLabel: 'Play a year' });

		this.update();
	},

	/* The three versions: for each day, { H (deg), dec (deg), E (min) }. */
	buildCurves() {
		const uniform = Object.assign({}, SUN_MODEL, { e: 0 });
		const curves = {
			[ANALEMMA_BOTH]: [],
			[ANALEMMA_ECCENTRICITY]: [],
			[ANALEMMA_OBLIQUITY]: []
		};

		DAYS.forEach(day => {
			const jd = noonTT(day);
			const eps = Ephem.meanObliquity(jd);
			const decOf = lon => Frames.eclipticPoint(lon, eps).dec;
			const both = EquationOfTime.parts(SUN_MODEL, jd, eps);
			const eccentricity = EquationOfTime.parts(SUN_MODEL, jd, 0);
			const obliquity = EquationOfTime.parts(uniform, jd, eps);

			curves[ANALEMMA_BOTH].push({ E: both.total, dec: decOf(both.lambda) });
			curves[ANALEMMA_ECCENTRICITY].push({ E: eccentricity.total, dec: decOf(eccentricity.lambda) });
			curves[ANALEMMA_OBLIQUITY].push({ E: obliquity.total, dec: decOf(obliquity.lambda) });
		});

		Object.values(curves).forEach(list => list.forEach(point => (point.H = point.E / MIN_PER_DEG)));

		return curves;
	},

	update() {
		this.day = readNumber('ana-day');
		this.showReadout();
		this.plot.redraw();
	},

	showReadout() {
		const point = this.curves[this.mode][this.day];

		showLines('analemma-readout', [
			`\\text{${dayText(this.day)}:}\\quad E = ${texMinSec(point.E)}`,
			`H = ${texSigned(point.H)}^\\circ,\\quad \\delta = ${texSigned(point.dec, 1)}^\\circ`
		]);
	},

	draw(p) {
		if (!this.curves) {
			return;
		}

		const curve = this.curves[this.mode];
		const both = this.curves[ANALEMMA_BOTH];
		const point = curve[this.day];

		p.frame();

		// the meridian (H = 0) and the celestial equator (delta = 0)
		p.vline(0, { color: COL.muted, width: 1.2, dash: [2, 4] });
		p.hline(0, { color: COL.earth, width: 1.2 });

		// both causes, faint and dashed, under the chosen version
		p.curve(
			both.map(q => q.H),
			both.map(q => q.dec),
			{ color: COL.sun, width: 1.5, dash: [5, 4], alpha: 0.45 }
		);
		p.curve(
			curve.map(q => q.H),
			curve.map(q => q.dec),
			{ color: COL.sun, width: 2.5 }
		);

		// the first of each month, named on the outside of the curve
		MONTH_STARTS.forEach(({ value, label }) => {
			const q = curve[value];
			const right = q.H >= 0;

			p.marker(q.H, q.dec, { color: COL.ink, radius: 3 });
			p.text(label, q.H, q.dec, {
				color: COL.ink,
				font: FONT_TICK,
				align: right ? 'left' : 'right',
				baseline: 'middle',
				dx: right ? 7 : -7,
				dy: 0
			});
		});

		p.marker(point.H, point.dec, { color: COL.sun, radius: 7 });
	}
};

/* ==========================================================================
   5. FIGURE 5: THE MODEL AGAINST THE REAL EQUATION OF TIME
   2026 at 12:00 UT. (a) The model's E and the real E (Ephem, Meeus
   28.1), on the scale of Figure 1 (b). (b) Model minus real, in seconds:
   -4.6 to +6.0 s, fixed scale +-8 s. Pointing at either panel reads a
   date in both.
   ========================================================================== */

const TEST_RANGE = [-8, 8];

const testFigure = {
	init() {
		this.real = realEquation();
		this.model = modelParts().map(p => p.total);
		this.error = this.model.map((m, day) => (m - this.real[day]) * 60);

		this.bothPlot = new Plot2D(byId('test-both'), {
			x: [0, DAYS_IN_YEAR],
			y: EQUATION_RANGE,
			xLabel: `date (${YEAR})`,
			yLabel: 'E (min)',
			xTicks: monthTicks,
			aspect: 0.75,
			maxHeight: 360,
			onDraw: p => this.drawBoth(p),
			onHover: x => this.hover(x, this.errorPlot)
		});

		this.errorPlot = new Plot2D(byId('test-error'), {
			x: [0, DAYS_IN_YEAR],
			y: TEST_RANGE,
			xLabel: `date (${YEAR})`,
			yLabel: 'model − real (s)',
			xTicks: monthTicks,
			aspect: 0.75,
			maxHeight: 360,
			onDraw: p => this.drawError(p),
			onHover: x => this.hover(x, this.bothPlot)
		});

		this.showReadout(null);
	},

	/* The pointer on one panel: the same date marked on the other. */
	hover(x, other) {
		other.cursorX = x;
		other.redraw();
		this.showReadout(dayAt(x));
	},

	drawBoth(p) {
		p.frame();
		p.hline(0, { color: COL.ink, width: 1 });
		p.curve(DAYS, this.real, { color: COL.ink, width: 4, alpha: 0.35 });
		p.curve(DAYS, this.model, { color: COL.planet, width: 2 });
	},

	drawError(p) {
		p.frame();
		p.hline(0, { color: COL.ink, width: 1 });
		p.curve(DAYS, this.error, { color: COL.planet, width: 2 });
	},

	showReadout(day) {
		if (day === null) {
			showLines('test-readout', [
				`\\text{${YEAR}: model} - \\text{real from } ${texSigned(Math.min(...this.error), 1)} \\text{ to } ${texSigned(Math.max(...this.error), 1)}\\,\\text{s}`,
				'\\text{Point at either plot to read a date.}'
			]);
			return;
		}

		showLines('test-readout', [
			`\\text{${dayText(day)}:}\\quad \\text{model } ${texMinSec(this.model[day])},\\quad \\text{real } ${texMinSec(this.real[day])}`,
			`\\text{model} - \\text{real} = ${texSigned(this.error[day], 1)}\\,\\text{s}`
		]);
	}
};

/* ==========================================================================
   6. FIGURE 6: THE EQUATION OF TIME OVER THE CENTURIES
   The real E at 12:00 UT on each day of the chosen year, against the real
   Sun's longitude (so the calendar does not matter), with the page's
   model, whose apogee is fixed at its place of 2026, dashed. From 1000 BC
   to AD 3000 the real E stays within -18.29 and +16.98 min: fixed scale
   +-20 min. Moving the slider recomputes a year of the reference Sun
   (about 60 ms), at most once per frame.
   ========================================================================== */

const CENTURIES_RANGE = [-20, 20];

const centuriesFigure = {
	plot: null,
	pending: false,
	year: null,
	real: null,

	init() {
		const figure = byId('centuries-plot').closest('figure');

		this.model = this.modelCurve();

		this.plot = new Plot2D(byId('centuries-plot'), {
			x: [0, 360],
			y: CENTURIES_RANGE,
			xLabel: 'the Sun’s longitude λ',
			yLabel: 'E (min)',
			xTicks: longitudeTicks,
			aspect: 0.5,
			maxHeight: 400,
			onDraw: p => this.draw(p)
		});

		wireSlider(byId('cent-year'), () => this.schedule(), yearText);
		wirePresets(figure);

		this.update();
	},

	/* The page's model through 2026, against its own longitude. */
	modelCurve() {
		return this.sortByLongitude(modelParts().map(p => ({ lon: p.lambda, E: p.total })));
	},

	/* Points sorted by longitude, so the curve runs from 0° to 360°. */
	sortByLongitude(points) {
		return points.slice().sort((a, b) => a.lon - b.lon);
	},

	/* Recompute at the next frame, once however many slider events come. */
	schedule() {
		if (this.pending) {
			return;
		}

		this.pending = true;
		requestAnimationFrame(() => {
			this.pending = false;
			this.update();
		});
	},

	update() {
		const year = readNumber('cent-year');
		const start = Time.julianDay(year, 1, 1);
		const points = [];

		for (let day = 0; day <= DAYS_IN_YEAR; day++) {
			const jd = Time.ttFromUt(start + day + 0.5);
			const sun = Ephem.sun(jd);

			points.push({ lon: sun.lon, E: Ephem.equationOfTime(jd, sun) });
		}

		this.year = year;
		this.real = this.sortByLongitude(points);
		this.showReadout();
		this.plot.redraw();
	},

	showReadout() {
		const values = this.real.map(p => p.E);
		const least = this.real[values.indexOf(Math.min(...values))];
		const greatest = this.real[values.indexOf(Math.max(...values))];
		const range = greatest.E - least.E;

		showLines('centuries-readout', [
			`\\text{${yearText(this.year)}:}\\quad ${texSigned(least.E)}\\,\\text{min at } \\lambda = ${fixed(least.lon, 0)}^\\circ,\\quad ${texSigned(greatest.E)}\\,\\text{min at } ${fixed(greatest.lon, 0)}^\\circ`,
			`\\text{range } ${fixed(range, 2)}\\,\\text{min} = ${fixed(range / MIN_PER_DEG, 2)}\\ \\text{time-degrees}`
		]);
	},

	draw(p) {
		if (!this.real) {
			return;
		}

		p.frame();
		p.hline(0, { color: COL.ink, width: 1 });
		[90, 180, 270].forEach(x => p.vline(x, { color: COL.line, width: 1 }));
		p.curve(
			this.model.map(q => q.lon),
			this.model.map(q => q.E),
			{ color: COL.muted, width: 1.5, dash: [6, 4] }
		);
		p.curve(
			this.real.map(q => q.lon),
			this.real.map(q => q.E),
			{ color: COL.planet, width: 2.5 }
		);
	}
};

/* ==========================================================================
   7. PAGE START
   Shared components first (they typeset the prose), then the figures.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
	Site.initPage();
	startFigures([sundialFigure, reductionFigure, partsFigure, analemmaFigure, testFigure, centuriesFigure]);
});
