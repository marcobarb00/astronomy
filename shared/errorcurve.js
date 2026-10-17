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
	 curve.update();                    // after a model parameter changes

   Every model function takes JD(TT) and returns an ecliptic longitude in
   degrees. Over long spans (a yearly oscillation drawn over centuries) each
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
const ERROR_DEGREES_THRESHOLD = 600;    // arcmin: above this, 'auto' switches to degrees
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


/* ==========================================================================
   2. CONSTRUCTION AND DOM
   ========================================================================== */

class ErrorCurve {

	/* options: body | reference, start, end (JD TT), spans
	   ([{ label, years }] centred on the current range), resolution (days),
	   period (days, the error's main period: sets the band's window),
	   units ('auto' | 'arcmin' | 'deg'), yMax (fixed half-range, in the
	   chosen units), xLabel. */
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
		this.yMax = options.yMax ?? null;
		this.models = [];
		this.ghosts = [];
		this.cache = null;

		this.buildDom(options);
	}

	/* Tools row (spans, ghost buttons), plot, legend, hover read-out. */
	buildDom(options) {
		const tools = makeEl('div', 'errorcurve-tools');
		const spanButtons = makeEl('div', 'presets');
		const ghostButtons = makeEl('div', 'presets');
		const wrapper = makeEl('div');
		const canvas = makeEl('canvas');

		this.container.classList.add('errorcurve');
		this.legendBox = makeEl('div');
		this.readout = makeEl('div', 'errorcurve-readout', '&nbsp;');

		this.spans.forEach(span => {
			const button = makeEl('button', '', span.label);

			button.type = 'button';
			button.addEventListener('click', () => this.chooseSpan(span, button));
			spanButtons.appendChild(button);
		});

		this.pinButton = makeEl('button', '', 'Keep as ghost');
		this.clearButton = makeEl('button', '', 'Clear ghosts');
		this.pinButton.type = 'button';
		this.clearButton.type = 'button';
		this.pinButton.addEventListener('click', () => this.pinGhost());
		this.clearButton.addEventListener('click', () => this.clearGhosts());
		ghostButtons.append(this.pinButton, this.clearButton);

		tools.append(spanButtons, ghostButtons);
		wrapper.appendChild(canvas);
		this.container.append(tools, wrapper, this.legendBox, this.readout);

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

		this.spanButtons = spanButtons;
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
		this.update();
	}

	/* A faint curve from an earlier model, for comparison. */
	addGhost(ghost) {
		this.ghosts.push(Object.assign({ id: `ghost${this.ghosts.length}` }, ghost));
		this.update();
	}

	/* Freeze the current models as ghosts ("Keep as ghost" button). A model
	   whose parameters live in sliders should provide freeze(), returning a
	   function with the current parameters fixed, and may provide
	   ghostLabel() to describe them. */
	pinGhost() {
		this.models.forEach(model => {
			this.ghosts.push({
				id: `${model.id}-kept${this.ghosts.length}`,
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
		this.update();
	}

	/* Span presets keep the centre of the current range. */
	chooseSpan(span, button) {
		const centre = (this.start + this.end) / 2;
		const halfDays = span.years * 365.25 / 2;

		this.spanButtons.querySelectorAll('button').forEach(b => {
			b.classList.toggle('active', b === button);
		});

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
		let largest = 1;

		this.curves = [...this.ghosts, ...this.models].map(entry => {
			const sample = this.sampleCurve(entry.fn);

			largest = Math.max(largest, ...sample.highs.map(Math.abs), ...sample.lows.map(Math.abs));

			return { entry, sample, ghost: this.ghosts.includes(entry) };
		});

		this.inDegrees = this.units === 'deg' ||
			(this.units === 'auto' && largest > ERROR_DEGREES_THRESHOLD);

		const unitFactor = this.inDegrees ? 1 / 60 : 1;
		const half = this.yMax ?? niceCeiling(largest * unitFactor * 1.08);

		this.unitFactor = unitFactor;
		this.plot.setRange([this.startYear(), this.endYear()], [-half, half]);
		this.plot.yLabel = this.inDegrees ? 'Δλ (degrees)' : 'Δλ (arcminutes)';
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
			const style = ghost ?
				{ color: entry.color ?? COL.muted, width: 1.5, alpha: GHOST_ALPHA, dash: [5, 4] } :
				{ color: entry.color ?? COL.planet, width: 2.2 };

			if (sample.isBand) {
				plot.band(sample.xs, scaleAll(sample.lows), scaleAll(sample.highs), {
					color: style.color,
					alpha: ghost ? 0.15 : 0.45
				});
			} else {
				plot.curve(sample.xs, scaleAll(sample.means), style);
			}
		});

		this.markRange();
	}

	/* Shade the parts of the range outside the ephemeris' valid dates. */
	markRange() {
		const plot = this.plot;
		const first = Time.decimalYear(Ephem.RANGE.start);
		const last = Time.decimalYear(Ephem.RANGE.end);
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

	/* Legend entries for the ghosts, then the models. */
	updateLegend() {
		const items = [...this.ghosts, ...this.models].map(entry => {
			return {
				label: entry.label,
				color: entry.color ?? COL.muted,
				ghost: this.ghosts.includes(entry)
			};
		});

		Plot2D.legend(this.legendBox, items);
		this.clearButton.disabled = !this.ghosts.some(ghost => ghost.pinned);
	}


	/* ======================================================================
	   6. READ-OUT
	   ====================================================================== */

	/* Date under the pointer and the exact Delta lambda of every curve. */
	showReadout(year) {
		if (year === null) {
			this.readout.innerHTML = '&nbsp;';
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

/* Plain text of a label that may contain $...$ TeX. */
function stripTex(label) {
	return label.replace(/\$([^$]*)\$/g, '$1').replace(/\\[a-zA-Z]+/g, '').replace(/[{}]/g, '');
}
