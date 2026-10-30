// @ts-check
/* ==========================================================================
   PREDICTING THE SKY - THE ERROR CURVE (errorcurve.js)
   The running thread of the site (STRUCTURE.md §7.3): a plot of
	   Delta lambda = lambda_model - lambda_reference
   in arcminutes against time, with the curves of earlier models overlaid
   as faint "ghosts". Needs common.js, time.js, ephemeris.js, plot2d.js.

   Usage
	 const curve = new ErrorCurve(byId('error-sun'), {
		 body: 'sun',                       // or reference: jd => lambda
		 start: Time.julianDay(2020, 1, 1), // JD(TT)
		 end: Time.julianDay(2021, 1, 1),
		 spans: [{ label: '1 year', years: 1 }, { label: '100 years', years: 100 }]
	 });
	 curve.addGhost({ label: 'Hipparchus', color: COL.sun, fn: jd => ... });
	 // label may hold $...$ TeX; short = plain name for the hover read-out
	 curve.addModel({ label: 'Eccentric', color: COL.deferent, fn: jd => ...,
		 freeze: () => frozenFn });     // freeze is used by "Keep as ghost"
	 curve.addMarks({ label: 'at new and full Moon', color: COL.deferent,
		 fn: jd => ..., dates: [jd, ...], maxYears: 1 }); // dots on a curve
	 curve.update();                    // after a model parameter changes

   A figure whose models have no sliders passes ghostButtons: false: there
   is nothing new to keep, so "Keep as ghost" and "Clear ghosts" are left
   out. The note on the bands is shown only when one of the spans is long
   enough to draw bands.

   Every model function takes JD(TT) and returns an ecliptic longitude in
   degrees, or, with quantity: 'β' and a reference of its own, another
   angle (page 3.3: the Moon's latitude). Over long spans (a yearly oscillation drawn over centuries) each
   pixel column is sampled several times and the curve is drawn as a band
   between the min and max over one period of the error, so it never
   aliases.

   TABLE OF CONTENTS
	 1. Constants
	 2. Construction and DOM
	 3. Models and ghosts
	 4. Sampling (with a cached reference)
	 5. Drawing
	 6. Time axis and read-out
   ========================================================================== */

/* ==========================================================================
   1. CONSTANTS
   ========================================================================== */

const ERROR_MAX_SAMPLES_PER_COLUMN = 48;
const ERROR_DEGREES_THRESHOLD = 600; // arcmin: above this, 'auto' switches to degrees
const GHOST_ALPHA = 0.4;

/* Default sampling step (days) per body: short enough to follow its error. */
const ERROR_RESOLUTION = {
	sun: 5,
	moon: 0.5,
	mercury: 2,
	venus: 4
};

/* Longest common period (days) of a model's error for each body: the year
   for the Sun, about a month (evection) for the Moon, the synodic period
   for a planet. Over long spans the band is the min / max over this window. */
const ERROR_PERIOD = {
	sun: 365.25,
	moon: 32,
	mercury: 116,
	venus: 584,
	mars: 780,
	jupiter: 399,
	saturn: 378,
	uranus: 370,
	neptune: 368
};

/* The same windows in words, for the note that explains the bands. */
const ERROR_PERIOD_TEXT = {
	sun: 'one year',
	moon: 'about one month'
};

/* The fewest columns a plot has (a phone): a span draws bands when one
   column covers more than the sampling step, so the note on the bands is
   shown when the longest span divided by this exceeds the step. */
const ERROR_NARROWEST_COLUMNS = 200;

/* Shown in the read-out line while the pointer is away from the plot, so
   the dashed pointer line never goes unexplained (CLAUDE.md). */
const ERROR_READOUT_HINT = "Point at the plot to read each curve's error on a date (dashed line).";

/* ==========================================================================
   2. CONSTRUCTION AND DOM
   ========================================================================== */

class ErrorCurve {
	/* options: body | reference, start, end (JD TT), spans
	   ([{ label, years, yMax, units }] centred on the current range),
	   resolution (days), period (days, the error's main period: sets the
	   band's window), units ('auto' | 'arcmin' | 'deg'), yMax (fixed
	   half-range, in the chosen units), xLabel, ghostButtons (false: no
	   "Keep as ghost" and "Clear ghosts", for models without sliders),
	   quantity (the symbol of the angle compared, 'λ' by default; page 3.3
	   plots the latitude, 'β', with its own reference), validRange
	   ({ start, end } in JD: the dates where the reference can
	   be trusted, shaded outside; Ephem.RANGE by default, null for a
	   reference valid at every date the plot can show, such as the
	   precession of a star).
	   Without yMax the vertical scale follows the curves. When a slider
	   changes a model, give each span (or the widget) a yMax large enough
	   for every slider value, so the axis does not jump while dragging. */
	constructor(container, options = {}) {
		this.container = container;
		this.body = options.body ?? null;
		this.reference = options.reference ?? (jd => Ephem.longitude(this.body, jd));
		this.start = options.start;
		this.end = options.end;
		this.spans = options.spans ?? [];
		this.resolution = options.resolution ?? ERROR_RESOLUTION[this.body] ?? 5;
		this.period = options.period ?? ERROR_PERIOD[this.body] ?? 365.25;
		this.units = options.units ?? 'auto';
		this.quantity = options.quantity ?? 'λ';
		this.yMax = options.yMax ?? null;
		this.ghostButtons = options.ghostButtons ?? true;
		this.validRange = options.validRange === undefined ? Ephem.RANGE : options.validRange;
		this.span = null;
		this.rescale = true; // choose the scale at the next update
		this.models = [];
		this.ghosts = [];
		this.marks = [];
		this.cache = null;

		this.buildDom(options);
	}

	/* Tools row (spans, ghost buttons), plot, legend, hover read-out. */
	buildDom(options) {
		const tools = makeEl('div', 'errorcurve-tools');
		const wrapper = makeEl('div');
		const canvas = makeEl('canvas');

		canvas.id = `${this.container.id || 'errorcurve'}-plot`;

		this.container.classList.add('errorcurve');
		this.legendBox = makeEl('div');
		this.readout = makeEl('div', 'errorcurve-readout');
		this.readout.textContent = ERROR_READOUT_HINT;
		this.bandNote = makeEl('div', 'errorcurve-note');
		this.spanButtons = this.buildSpanButtons();

		tools.append(this.spanButtons);

		if (this.ghostButtons) {
			tools.append(this.buildGhostButtons());
		}

		wrapper.appendChild(canvas);

		// a tools row with no button, and a note on bands that can never be
		// drawn, are left out (the widget's size still never changes)
		if (this.spans.length > 0 || this.ghostButtons) {
			this.container.append(tools);
		}

		this.container.append(wrapper, this.legendBox);

		if (this.canDrawBands()) {
			this.container.append(this.bandNote);
		}

		this.container.append(this.readout);

		this.plot = new Plot2D(canvas, {
			x: [this.startYear(), this.endYear()],
			y: [-1, 1],
			xLabel: options.xLabel ?? 'date',
			yLabel: '',
			aspect: 0.42,
			minHeight: 240,
			xTicks: (min, max, count) => timeTicks(min, max, count),
			onDraw: () => this.draw(),
			onHover: x => this.showReadout(x)
		});
	}

	/* One button per span preset; the one that matches the initial range
	   starts active. */
	buildSpanButtons() {
		const box = makeEl('div', 'presets');
		const initialYears = (this.end - this.start) / 365.25;

		let active = null;
		const buttons = this.spans.map(span => {
			const button = makeEl('button', '', span.label);

			button.type = 'button';
			button.addEventListener('click', () => this.chooseSpan(span, button));
			box.appendChild(button);

			if (!this.span && Math.abs(span.years - initialYears) < 0.02 * span.years) {
				this.span = span;
				active = button;
			}

			return button;
		});

		markChosen(buttons, active);

		return box;
	}

	/* "Keep as ghost" and "Clear ghosts". */
	buildGhostButtons() {
		const box = makeEl('div', 'presets');

		this.pinButton = makeEl('button', '', 'Keep as ghost');
		this.clearButton = makeEl('button', '', 'Clear ghosts');
		this.pinButton.type = 'button';
		this.clearButton.type = 'button';
		this.pinButton.addEventListener('click', () => this.pinGhost());
		this.clearButton.addEventListener('click', () => this.clearGhosts());
		box.append(this.pinButton, this.clearButton);

		return box;
	}

	startYear() {
		return Time.decimalYear(this.start);
	}

	endYear() {
		return Time.decimalYear(this.end);
	}

	/* ======================================================================
	   3. MODELS AND GHOSTS
	   ====================================================================== */

	/* A model drawn in full colour. fn: jd -> longitude (deg).
	   label may contain $...$ TeX; short (optional) is the plain-text name
	   used in the hover read-out. */
	addModel(model) {
		this.models.push(Object.assign({ id: `model${this.models.length}` }, model));
		this.rescale = true;
		this.update();
	}

	/* A faint curve from an earlier model, for comparison. */
	addGhost(ghost) {
		this.ghosts.push(Object.assign({ id: `ghost${this.ghosts.length}` }, ghost));
		this.rescale = true;
		this.update();
	}

	/* Dots on chosen dates (JD TT): the error of 'fn' there, e.g. a model
	   at every new and full Moon. Drawn only while the span is at most
	   maxYears (default: any span); the legend entry stays whatever the
	   span, so the widget keeps its size (CLAUDE.md). */
	addMarks(marks) {
		this.marks.push(Object.assign({ id: `marks${this.marks.length}` }, marks));
		this.update();
	}

	/* Freeze the current models as ghosts ("Keep as ghost" button). A model
	   whose parameters live in sliders should provide freeze(), returning a
	   function with the current parameters fixed, and may provide
	   ghostLabel() to describe them. Each model keeps one ghost: keeping
	   again replaces it, so the legend has a fixed number of entries and
	   the widget keeps its size (CLAUDE.md). */
	pinGhost() {
		this.models.forEach(model => {
			this.ghosts = this.ghosts.filter(ghost => ghost.keptFrom !== model.id);
			this.ghosts.push({
				id: `${model.id}-kept`,
				keptFrom: model.id,
				label: model.ghostLabel ? model.ghostLabel() : `${model.label} (kept)`,
				short: model.ghostLabel ? model.ghostLabel() : `${model.short ?? stripTex(model.label)} (kept)`,
				color: model.color,
				fn: model.freeze ? model.freeze() : model.fn,
				pinned: true
			});
		});

		this.update();
	}

	/* Remove the ghosts kept by the reader (built-in ghosts stay). */
	clearGhosts() {
		this.ghosts = this.ghosts.filter(ghost => !ghost.pinned);
		this.update();
	}

	/* New time range (JD TT). */
	setRange(start, end) {
		this.start = start;
		this.end = end;
		this.cache = null;
		this.rescale = true;
		this.update();
	}

	/* Span presets keep the centre of the current range. */
	chooseSpan(span, button) {
		const centre = (this.start + this.end) / 2;
		const halfDays = (span.years * 365.25) / 2;

		this.span = span;

		markChosen([...this.spanButtons.querySelectorAll('button')], button);

		this.setRange(centre - halfDays, centre + halfDays);
	}

	/* Recompute and redraw (call after a model parameter changes). */
	update() {
		this.sampleAll();
		this.updateLegend();
		this.plot.redraw();
	}

	/* ======================================================================
	   4. SAMPLING
	   The plot box is cut into one column per pixel; each column gets 'k'
	   sample times. The reference longitudes at those times are cached,
	   so moving a model slider only recomputes the (cheap) model.
	   ====================================================================== */

	/* Sample times and reference longitudes, rebuilt when the range or the
	   plot width changes. */
	referenceSamples() {
		const columns = Math.max(50, Math.round(this.plot.box.right - this.plot.box.left));
		const key = `${this.start}|${this.end}|${columns}`;

		if (this.cache && this.cache.key === key) {
			return this.cache;
		}

		const columnDays = (this.end - this.start) / columns;
		const k = clamp(Math.ceil(columnDays / this.resolution), 1, ERROR_MAX_SAMPLES_PER_COLUMN);
		const times = [];
		const reference = [];

		for (let c = 0; c < columns; c++) {
			for (let i = 0; i < k; i++) {
				const jd = this.start + (c + (k === 1 ? 0.5 : (i + 0.5) / k)) * columnDays;

				times.push(jd);
				reference.push(this.reference(jd));
			}
		}

		this.cache = { key, columns, k, columnDays, times, reference };

		return this.cache;
	}

	/* Per-column min, max and mean of Delta lambda (arcmin) for one model. */
	sampleCurve(fn) {
		const { columns, k, columnDays, times, reference } = this.referenceSamples();
		const xs = [];
		const lows = [];
		const highs = [];
		const means = [];

		for (let c = 0; c < columns; c++) {
			let low = Infinity;
			let high = -Infinity;
			let sum = 0;

			for (let i = 0; i < k; i++) {
				const n = c * k + i;
				const delta = norm180(fn(times[n]) - reference[n]) * 60;

				low = Math.min(low, delta);
				high = Math.max(high, delta);
				sum += delta;
			}

			xs.push(Time.decimalYear(this.start + (c + 0.5) * columnDays));
			lows.push(low);
			highs.push(high);
			means.push(sum / k);
		}

		const isBand = k > 1;

		if (isBand) {
			const window = Math.ceil(this.period / columnDays);

			return {
				xs,
				lows: runningExtreme(lows, window, Math.min),
				highs: runningExtreme(highs, window, Math.max),
				means,
				isBand
			};
		}

		return { xs, lows, highs, means, isBand };
	}

	/* Sample every curve and choose the vertical scale. */
	sampleAll() {
		let largest = 0;

		this.curves = [...this.ghosts, ...this.models].map(entry => {
			const sample = this.sampleCurve(entry.fn);

			largest = Math.max(largest, ...sample.highs.map(Math.abs), ...sample.lows.map(Math.abs));

			return { entry, sample, ghost: this.ghosts.includes(entry) };
		});

		if (this.rescale) {
			this.chooseScale(Math.max(largest, 1));
			this.rescale = false;
		}

		this.checkScale(largest);
	}

	/* The scale changes only when the view changes (new range, span or
	   curve), never while a slider moves a model (CLAUDE.md): a span preset
	   may fix it (yMax, units), otherwise it fits the curves of that moment. */
	chooseScale(largest) {
		const units = this.span?.units ?? this.units;
		const fixedHalf = this.span?.yMax ?? this.yMax;

		this.inDegrees = units === 'deg' || (units === 'auto' && largest > ERROR_DEGREES_THRESHOLD);
		this.unitFactor = this.inDegrees ? 1 / 60 : 1;
		this.half = fixedHalf ?? niceCeiling(largest * this.unitFactor * 1.08);

		this.plot.setRange([this.startYear(), this.endYear()], [-this.half, this.half]);
		this.plot.yLabel = `Δ${this.quantity} (${this.inDegrees ? 'degrees' : 'arcminutes'})`;
	}

	/* Warn (once) when a curve leaves the scale: the page must give the
	   span a yMax that covers every value its sliders allow. */
	checkScale(largest) {
		if (largest * this.unitFactor > this.half && !this.warnedScale) {
			this.warnedScale = true;
			console.warn(
				`ErrorCurve "${this.container.id}": a curve leaves the scale ` +
					`(±${this.half}); set yMax to cover every value of the sliders.`
			);
		}
	}

	/* ======================================================================
	   5. DRAWING
	   ====================================================================== */

	draw() {
		const plot = this.plot;

		plot.frame();

		(this.curves ?? []).forEach(({ entry, sample, ghost }) => {
			const f = this.unitFactor;
			const scaleAll = values => values.map(v => v * f);
			const style = ghost
				? { color: entry.color ?? COL.muted, width: 1.5, alpha: GHOST_ALPHA, dash: [5, 4] }
				: { color: entry.color ?? COL.planet, width: 2.2 };

			if (sample.isBand) {
				plot.band(sample.xs, scaleAll(sample.lows), scaleAll(sample.highs), {
					color: style.color,
					alpha: ghost ? 0.15 : 0.45
				});
			} else {
				plot.curve(sample.xs, scaleAll(sample.means), style);
			}
		});

		this.marks.forEach(marks => this.drawMarks(marks));
		this.markRange();
	}

	/* The dots of one addMarks entry that fall in the range, at their
	   exact error. */
	drawMarks(marks) {
		const years = (this.end - this.start) / 365.25;

		if (marks.maxYears && years > marks.maxYears) {
			return;
		}

		marks.dates
			.filter(jd => jd >= this.start && jd <= this.end)
			.forEach(jd => {
				const delta = norm180(marks.fn(jd) - this.reference(jd)) * 60 * this.unitFactor;

				this.plot.marker(Time.decimalYear(jd), delta, {
					color: marks.color ?? COL.planet,
					radius: marks.radius ?? 4
				});
			});
	}

	/* Shade the parts of the range outside the ephemeris' valid dates. */
	markRange() {
		if (!this.validRange) {
			return;
		}

		const plot = this.plot;
		const first = Time.decimalYear(this.validRange.start);
		const last = Time.decimalYear(this.validRange.end);
		const shade = (from, to) => {
			plot.band([from, to], [plot.y[0], plot.y[0]], [plot.y[1], plot.y[1]], { color: COL.line, alpha: 0.6 });
		};

		if (plot.x[0] < first) {
			shade(plot.x[0], first);
		}

		if (plot.x[1] > last) {
			shade(last, plot.x[1]);
		}
	}

	/* Legend entries for the ghosts, then the models, each sample drawn
	   like its curve (a line, or a band over long spans), and the shading
	   of the dates outside the reference's range when it is visible. */
	updateLegend() {
		/** @type {LegendItem[]} */
		const items = (this.curves ?? []).map(({ entry, sample, ghost }) => {
			return {
				label: entry.label,
				color: entry.color ?? COL.muted,
				mark: sample.isBand ? 'band' : 'line',
				ghost: ghost
			};
		});

		this.marks.forEach(marks => {
			items.push({ label: marks.label, color: marks.color ?? COL.planet, mark: 'dot' });
		});

		// a hidden entry holds the place of each model's kept ghost until
		// the reader keeps one (when the reader can keep one)
		this.models.forEach(model => {
			if (this.ghostButtons && !this.ghosts.some(ghost => ghost.keptFrom === model.id)) {
				items.push({
					label: model.ghostLabel ? model.ghostLabel() : `${model.label} (kept)`,
					color: model.color,
					ghost: true,
					hidden: true
				});
			}
		});

		if (this.canLeaveRange()) {
			items.push({
				label: 'outside the valid range of the reference sky',
				color: COL.muted,
				mark: 'band'
			});
		}

		Plot2D.legend(this.legendBox, items);
		this.updateBandNote();

		if (this.ghostButtons) {
			this.clearButton.disabled = !this.ghosts.some(ghost => ghost.pinned);
		}
	}

	/* Can a span of this widget (or its first range) draw bands, on the
	   narrowest plot? */
	canDrawBands() {
		const longest = Math.max(this.end - this.start, ...this.spans.map(span => span.years * 365.25));

		return longest / ERROR_NARROWEST_COLUMNS > this.resolution;
	}

	/* Can the plot reach beyond the dates where the ephemeris is valid, now
	   or with one of the span presets (centred on the current range)? The
	   legend entry for the shading is then always shown, so the widget does
	   not change size when the reader changes the span (CLAUDE.md). */
	canLeaveRange() {
		if (!this.validRange) {
			return false;
		}

		const range = this.validRange;
		const centre = (this.start + this.end) / 2;
		const reaches = halfDays => centre - halfDays < range.start || centre + halfDays > range.end;

		return reaches((this.end - this.start) / 2) || this.spans.some(span => reaches((span.years * 365.25) / 2));
	}

	/* The note that explains the bands. It is always shown, whether or not
	   the current span draws bands, so the widget keeps its size. */
	updateBandNote() {
		const window = ERROR_PERIOD_TEXT[this.body] ?? `${Math.round(this.period)} days`;

		this.bandNote.textContent =
			'Over long spans, where one pixel covers more than ' +
			`${this.resolution} days, each curve is drawn as a band, from its smallest to its largest error within ${window}.`;
	}

	/* ======================================================================
	   6. READ-OUT
	   ====================================================================== */

	/* Date under the pointer and the exact Delta lambda of every curve. */
	showReadout(year) {
		if (year === null) {
			this.readout.textContent = ERROR_READOUT_HINT;
			return;
		}

		const jd = Time.jdFromDecimalYear(year);
		const reference = this.reference(jd);
		const parts = [...this.ghosts, ...this.models].map(entry => {
			const delta = norm180(entry.fn(jd) - reference);
			const value = this.inDegrees ? signed(delta, 2) + '°' : arcmin(delta);

			return `${entry.short ?? stripTex(entry.label)}: ${value}`;
		});

		this.readout.textContent = `${Time.formatDate(jd)} · ${parts.join(' · ')}`;
	}
}

/* ==========================================================================
   HELPERS
   ========================================================================== */

/* Extreme (Math.min or Math.max) of values over a centred window of
   'window' columns: the envelope of an oscillation shorter than a column
   group, without moire. */
function runningExtreme(values, window, pick) {
	const half = Math.floor(window / 2);

	if (half < 1) {
		return values;
	}

	return values.map((value, i) => {
		const from = Math.max(0, i - half);
		const to = Math.min(values.length, i + half + 1);

		return pick(...values.slice(from, to));
	});
}

/* Round a positive number up to 1, 2 or 5 x 10^n (scale of the y axis). */
function niceCeiling(value) {
	const power = Math.pow(10, Math.floor(Math.log10(value)));

	for (const step of [1, 2, 2.5, 5, 10]) {
		if (value <= step * power) {
			return step * power;
		}
	}

	return 10 * power;
}

/* Ticks for a time axis in decimal years: months for short ranges, round
   years (shown as AD / BC) otherwise. */
function timeTicks(min, max, count) {
	if (max - min > 2.5) {
		return niceTicks(min, max, count)
			.filter(value => Number.isInteger(Math.round(value * 1e6) / 1e6))
			.map(value => ({ value, label: Time.formatYear(Math.round(value)) }));
	}

	// months between ticks: the smallest of 1, 2, 3, 6 that fits 'count' ticks
	const months = (max - min) * 12;
	const monthStep = [1, 2, 3, 6].find(step => months / step <= count) ?? 6;
	const ticks = [];

	for (let year = Math.floor(min); year <= Math.ceil(max); year++) {
		for (let month = 1; month <= 12; month += monthStep) {
			const value = Time.decimalYear(Time.julianDay(year, month, 1));

			if (value >= min && value <= max) {
				const name = Time.MONTH_NAMES[month - 1];
				const label = month === 1 ? `${name} ${Time.formatYear(year)}` : name;

				ticks.push({ value, label });
			}
		}
	}

	return ticks;
}

/* The TeX commands of a label that have a plain-text form. */
const TEX_SYMBOLS = {
	alpha: 'α',
	beta: 'β',
	gamma: 'γ',
	delta: 'δ',
	epsilon: 'ε',
	varepsilon: 'ε',
	eta: 'η',
	theta: 'θ',
	kappa: 'κ',
	lambda: 'λ',
	mu: 'μ',
	nu: 'ν',
	pi: 'π',
	rho: 'ρ',
	sigma: 'σ',
	tau: 'τ',
	phi: 'φ',
	varphi: 'φ',
	omega: 'ω',
	Delta: 'Δ',
	Lambda: 'Λ',
	Omega: 'Ω',
	odot: '☉',
	circ: '°',
	prime: '′'
};

/* Plain text of a label that may contain $...$ TeX, for the hover
   read-out: "$\bar\lambda$" -> "λ̄", "$\lambda_\text{model}$" ->
   "λmodel", "$Y = 365\tfrac14$" -> "Y = 365 1/4". Text outside the
   dollars is kept as it is. */
function stripTex(label) {
	return label.replace(/\$([^$]*)\$/g, (match, tex) => texToText(tex));
}

/* The plain text of one TeX formula. */
function texToText(tex) {
	const group = '(\\{[^{}]*\\}|\\\\[a-zA-Z]+|[^\\s\\\\{}])';
	const unbrace = text => text.replace(/^\{|\}$/g, '');

	return tex
		.replace(/\\(?:text|mathrm|mathit|mathbf)\{([^{}]*)\}/g, '$1')
		.replace(new RegExp(`\\\\[td]?frac\\s*${group}\\s*${group}`, 'g'), (match, top, bottom) => {
			return ` ${unbrace(top)}/${unbrace(bottom)}`;
		})
		.replace(/\\([a-zA-Z]+)/g, (match, name) => TEX_SYMBOLS[name] ?? (name === 'bar' ? '\\bar' : ''))
		.replace(new RegExp(`\\\\bar\\s*${group}`, 'g'), (match, base) => `${unbrace(base)}̄`)
		.replace(new RegExp(`[_^]${group}`, 'g'), (match, script) => unbrace(script))
		.replace(/\\[,;!]|~/g, ' ')
		.replace(/[{}\\]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}
