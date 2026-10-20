// @ts-check
/* ==========================================================================
   PREDICTING THE SKY - 2D PLOTS (plot2d.js)
   Simple 2D plots on a canvas: axes, grid, curves, bands, markers, an HTML
   legend and an optional hover cursor. Used by the error curve and by every
   graph on the pages. Needs common.js.

   Usage
	 const plot = new Plot2D(canvas, {
		 x: [0, 365], y: [-15, 15],
		 xLabel: 'day of the year', yLabel: 'minutes',
		 onDraw: p => {
			 p.frame();
			 p.fn(t => 10 * sin(t), { color: COL.sun });
		 }
	 });
	 plot.redraw();

   Sizes are in CSS pixels; the canvas follows the width of its parent and
   is scaled for the device pixel ratio.

   Style (STYLE.md): ink box, grid in the light rule colour, ticks and axis
   titles in Spectral, labels in the atlas fonts and in the text colour of
   their line colour (labelFont, textColor in common.js); stars are
   four-pointed (star()).

   TABLE OF CONTENTS
	 1. Constants
	 2. Construction, sizing, hover
	 3. Coordinates and ticks
	 4. Frame: grid, axes, labels
	 5. Marks: curves, bands, markers, lines, text
	 6. Legend (HTML)
   ========================================================================== */

/* ==========================================================================
   1. CONSTANTS
   ========================================================================== */

const PLOT_FONT = FONT_TICK;
const PLOT_LABEL_FONT = FONT_AXIS;
const PLOT_MARGIN = { left: 56, right: 14, top: 12, bottom: 40 };

/* ==========================================================================
   2. CONSTRUCTION, SIZING, HOVER
   ========================================================================== */

/** An entry of Plot2D.legend (section 6).
	@typedef {{ label: string, color: string, mark?: string, ghost?: boolean, hidden?: boolean }} LegendItem */

class Plot2D {
	/* options: x, y ([min, max]), xLabel, yLabel, xFormat, yFormat,
	   xTicks, yTicks (function (min, max, count) -> [{ value, label }]),
	   aspect (height / width), minHeight, maxHeight, onDraw(plot),
	   onHover(xValue or null) to enable the hover cursor. */
	constructor(canvas, options = {}) {
		this.canvas = canvas;
		this.ctx = canvas.getContext('2d');
		this.x = options.x ?? [0, 1];
		this.y = options.y ?? [0, 1];
		this.xLabel = options.xLabel ?? '';
		this.yLabel = options.yLabel ?? '';
		this.xFormat = options.xFormat ?? formatTick;
		this.yFormat = options.yFormat ?? formatTick;
		this.xTicks = options.xTicks ?? null;
		this.yTicks = options.yTicks ?? null;
		this.aspect = options.aspect ?? 0.5;
		this.minHeight = options.minHeight ?? 220;
		this.maxHeight = options.maxHeight ?? 420;
		this.margin = Object.assign({}, PLOT_MARGIN, options.margin);
		this.onDraw = options.onDraw ?? (p => p.frame());
		this.onHover = options.onHover ?? null;
		this.cursorX = null;

		canvas.classList.add('plot2d');

		this.resize();

		if (this.onHover) {
			this.wireHover();
		}

		this.observer = new ResizeObserver(() => {
			if (this.canvas.clientWidth === this.width) {
				return;
			}

			this.resize();
			this.redraw();
		});
		this.observer.observe(canvas.parentElement);

		// tick labels and titles are drawn in web fonts: draw again once
		// they have loaded
		whenCanvasFontsReady().then(() => this.redraw());
	}

	/* Match the canvas resolution to its displayed size. */
	resize() {
		const width = this.canvas.clientWidth || 600;
		const height = Math.round(clamp(width * this.aspect, this.minHeight, this.maxHeight));

		this.canvas.style.height = `${height}px`;
		scaleCanvas(this.canvas, this.ctx, width, height);

		this.width = width;
		this.height = height;
		this.box = {
			left: this.margin.left,
			right: width - this.margin.right,
			top: this.margin.top,
			bottom: height - this.margin.bottom
		};
	}

	/* Clear and call the page's drawing function, then the cursor. */
	redraw() {
		this.ctx.clearRect(0, 0, this.width, this.height);
		this.onDraw(this);

		if (this.cursorX !== null) {
			this.vline(this.cursorX, { color: COL.muted, width: 1, dash: [3, 3] });
		}
	}

	/* Change the visible ranges. */
	setRange(x, y) {
		if (x) {
			this.x = x;
		}

		if (y) {
			this.y = y;
		}
	}

	/* Report the x value under the pointer (null when it leaves). */
	wireHover() {
		const update = event => {
			const rect = this.canvas.getBoundingClientRect();
			const px = event.clientX - rect.left;
			const inside = px >= this.box.left && px <= this.box.right;

			this.cursorX = inside ? this.fromPx(px) : null;
			this.onHover(this.cursorX);
			this.redraw();
		};

		this.canvas.addEventListener('pointermove', update);
		this.canvas.addEventListener('pointerdown', update);

		this.canvas.addEventListener('pointerleave', () => {
			this.cursorX = null;
			this.onHover(null);
			this.redraw();
		});
	}

	/* ======================================================================
	   3. COORDINATES AND TICKS
	   ====================================================================== */

	/* Data x -> pixel x. */
	px(x) {
		const { left, right } = this.box;

		return left + ((x - this.x[0]) / (this.x[1] - this.x[0])) * (right - left);
	}

	/* Data y -> pixel y. */
	py(y) {
		const { top, bottom } = this.box;

		return bottom - ((y - this.y[0]) / (this.y[1] - this.y[0])) * (bottom - top);
	}

	/* Pixel x -> data x. */
	fromPx(px) {
		const { left, right } = this.box;

		return this.x[0] + ((px - left) / (right - left)) * (this.x[1] - this.x[0]);
	}

	/* Ticks along x: the custom tick function, or round numbers. */
	ticksX() {
		const count = Math.max(3, Math.floor((this.box.right - this.box.left) / 90));

		if (this.xTicks) {
			return this.xTicks(this.x[0], this.x[1], count);
		}

		return niceTicks(this.x[0], this.x[1], count).map(value => {
			return { value, label: this.xFormat(value) };
		});
	}

	ticksY() {
		const count = Math.max(4, Math.floor((this.box.bottom - this.box.top) / 45));

		if (this.yTicks) {
			return this.yTicks(this.y[0], this.y[1], count);
		}

		return niceTicks(this.y[0], this.y[1], count).map(value => {
			return { value, label: this.yFormat(value) };
		});
	}

	/* ======================================================================
	   4. FRAME: GRID, AXES, LABELS
	   ====================================================================== */

	/* Grid, zero line, axis box, tick labels and axis titles. */
	frame() {
		const { ctx, box } = this;

		ctx.font = PLOT_FONT;
		ctx.lineWidth = 1;

		// vertical grid lines and x tick labels; a label that would overlap
		// the previous one is skipped, and the end labels stay inside
		let lastRight = -Infinity;

		ctx.textAlign = 'center';
		ctx.textBaseline = 'top';

		this.ticksX().forEach(tick => {
			const x = this.px(tick.value);
			const half = ctx.measureText(tick.label).width / 2;
			const labelX = clamp(x, half + 2, this.width - half - 2);

			ctx.strokeStyle = COL.line;
			drawSegment(ctx, x, box.top, x, box.bottom);

			if (labelX - half > lastRight + 8) {
				ctx.fillStyle = COL.muted;
				ctx.fillText(tick.label, labelX, box.bottom + 6);
				lastRight = labelX + half;
			}
		});

		// horizontal grid lines and y tick labels
		ctx.textAlign = 'right';
		ctx.textBaseline = 'middle';

		this.ticksY().forEach(tick => {
			const y = this.py(tick.value);

			ctx.strokeStyle = COL.line;
			drawSegment(ctx, box.left, y, box.right, y);
			ctx.fillStyle = COL.muted;
			ctx.fillText(tick.label, box.left - 6, y);
		});

		// the zero line, a little stronger
		if (this.y[0] < 0 && this.y[1] > 0) {
			ctx.strokeStyle = COL.muted;
			ctx.globalAlpha = 0.6;
			drawSegment(ctx, box.left, this.py(0), box.right, this.py(0));
			ctx.globalAlpha = 1;
		}

		// the box
		ctx.strokeStyle = COL.ink;
		ctx.strokeRect(box.left, box.top, box.right - box.left, box.bottom - box.top);

		this.axisTitles();
	}

	/* Axis titles: x below the tick labels, y rotated on the left. */
	axisTitles() {
		const { ctx, box } = this;

		ctx.fillStyle = COL.muted;
		ctx.font = PLOT_LABEL_FONT;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'bottom';
		ctx.fillText(this.xLabel, (box.left + box.right) / 2, this.height - 2);

		ctx.save();
		ctx.translate(12, (box.top + box.bottom) / 2);
		ctx.rotate(-Math.PI / 2);
		ctx.textBaseline = 'middle';
		ctx.fillText(this.yLabel, 0, 0);
		ctx.restore();
	}

	/* Restrict the following marks to the plot box. */
	clip() {
		const { ctx, box } = this;

		ctx.save();
		ctx.beginPath();
		ctx.rect(box.left, box.top, box.right - box.left, box.bottom - box.top);
		ctx.clip();
	}

	unclip() {
		this.ctx.restore();
	}

	/* ======================================================================
	   5. MARKS: CURVES, BANDS, MARKERS, LINES, TEXT
	   Every mark takes a style object: color, width, dash, alpha.
	   ====================================================================== */

	/* Apply a line style to the context. */
	stroke(style) {
		const { ctx } = this;

		ctx.strokeStyle = style.color ?? COL.ink;
		ctx.lineWidth = style.width ?? 2;
		ctx.globalAlpha = style.alpha ?? 1;
		ctx.setLineDash(style.dash ?? []);
		ctx.lineJoin = 'round';
		ctx.lineCap = 'round';
	}

	/* Reset what stroke() changed. */
	restoreStyle() {
		this.ctx.globalAlpha = 1;
		this.ctx.setLineDash([]);
	}

	/* A figure's scale must show every value its controls allow (CLAUDE.md):
	   warn, once per plot, when data falls outside the y range. Pass
	   style.clip = true where cutting the curve is intended (e.g. tan). */
	checkInside(ys, style) {
		if (style.clip || this.warnedOutside) {
			return;
		}

		const outside = ys.some(y => Number.isFinite(y) && (y < this.y[0] || y > this.y[1]));

		if (outside) {
			this.warnedOutside = true;
			console.warn(
				`Plot2D "${this.canvas.id}": data outside the y range [${this.y}]; ` +
					'widen the fixed range to cover every value of the controls.'
			);
		}
	}

	/* Polyline through (xs[i], ys[i]); NaN / null values break the line.
	   style.breakAt (optional) breaks it where |dy| jumps more than that
	   (e.g. 180 for a wrapped longitude). */
	curve(xs, ys, style = {}) {
		const { ctx } = this;
		let penDown = false;

		this.checkInside(ys, style);
		this.clip();
		this.stroke(style);
		ctx.beginPath();

		for (let i = 0; i < xs.length; i++) {
			const y = ys[i];
			if (y === null || Number.isNaN(y)) {
				penDown = false;
				continue;
			}

			const isJump = style.breakAt && i > 0 && Math.abs(y - ys[i - 1]) > style.breakAt;

			if (!penDown || isJump) {
				ctx.moveTo(this.px(xs[i]), this.py(y));
				penDown = true;
			} else {
				ctx.lineTo(this.px(xs[i]), this.py(y));
			}
		}

		ctx.stroke();
		this.restoreStyle();
		this.unclip();
	}

	/* Sample f(x) across the visible range and draw it. */
	fn(f, style = {}, samples = 400) {
		const xs = [];
		const ys = [];

		for (let i = 0; i <= samples; i++) {
			const x = lerp(this.x[0], this.x[1], i / samples);

			xs.push(x);
			ys.push(f(x));
		}

		this.curve(xs, ys, style);
	}

	/* Filled band between lows[i] and highs[i] (min / max envelopes). */
	band(xs, lows, highs, style = {}) {
		const { ctx } = this;

		this.clip();
		ctx.fillStyle = style.color ?? COL.muted;
		ctx.globalAlpha = style.alpha ?? 0.25;
		ctx.beginPath();

		for (let i = 0; i < xs.length; i++) {
			const x = this.px(xs[i]);
			const y = this.py(highs[i]);

			if (i === 0) {
				ctx.moveTo(x, y);
			} else {
				ctx.lineTo(x, y);
			}
		}

		for (let i = xs.length - 1; i >= 0; i--) {
			ctx.lineTo(this.px(xs[i]), this.py(lows[i]));
		}

		ctx.closePath();
		ctx.fill();
		ctx.globalAlpha = 1;
		this.unclip();
	}

	/* Dot at (x, y). style: color, radius, ring. */
	marker(x, y, style = {}) {
		const { ctx } = this;

		this.checkInside([y], style);
		drawDot(ctx, this.px(x), this.py(y), style.radius ?? 5, style.color ?? COL.planet, style.ring !== false);
	}

	/* Horizontal line across the box at y. */
	hline(y, style = {}) {
		this.stroke(Object.assign({ width: 1 }, style));
		drawSegment(this.ctx, this.box.left, this.py(y), this.box.right, this.py(y));
		this.restoreStyle();
	}

	/* Vertical line across the box at x. */
	vline(x, style = {}) {
		this.stroke(Object.assign({ width: 1 }, style));
		drawSegment(this.ctx, this.px(x), this.box.top, this.px(x), this.box.bottom);
		this.restoreStyle();
	}

	/* Four-pointed star at (x, y) (STYLE.md §5). style: color, size
	   (half-size in px), alpha, ring (true: a halo in the card colour). */
	star(x, y, style = {}) {
		const { ctx } = this;

		this.checkInside([y], style);
		ctx.globalAlpha = style.alpha ?? 1;
		ctx.fillStyle = style.color ?? COL.ink;
		drawStar(ctx, this.px(x), this.py(y), style.size ?? STAR_SIZE_CHOSEN, style.ring ? COL.card : null);
		ctx.globalAlpha = 1;
	}

	/* Text at data coordinates. style: color (a line colour is drawn in its
	   text colour), align, baseline, dx, dy, font, kind ('name' or 'symbol',
	   see labelFont). */
	text(label, x, y, style = {}) {
		const { ctx } = this;

		ctx.fillStyle = textColor(style.color ?? COL.ink);
		ctx.font = style.font ?? labelFont(label, style.kind);
		ctx.textAlign = style.align ?? 'left';
		ctx.textBaseline = style.baseline ?? 'bottom';
		ctx.fillText(label, this.px(x) + (style.dx ?? 4), this.py(y) + (style.dy ?? -4));
	}

	/* ======================================================================
	   6. LEGEND (HTML)
	   Built in HTML, not on the canvas, so labels can carry KaTeX ($...$).
	   items: [{ label, color, mark, ghost, hidden }]. The sample must look
	   like the mark it describes (CLAUDE.md): mark 'line' (default), 'dot'
	   for a point, 'band' for a filled region, 'star' for a star (the
	   four-pointed mark of STYLE.md §5); ghost makes it faint and
	   dashed. A hidden item keeps its room but is not shown: a legend that
	   gains an entry in some states holds its place, so the figure keeps
	   its size.
	   ====================================================================== */

	/** @param {HTMLElement} container
		@param {LegendItem[]} items */
	static legend(container, items) {
		container.classList.add('legend');
		container.innerHTML = '';

		items.forEach(item => {
			const entry = makeEl('span', 'legend-item' + (item.ghost ? ' ghost' : ''));
			const mark = item.mark && item.mark !== 'line' ? ` ${item.mark}` : '';
			const swatch = makeEl('span', 'swatch' + mark + (item.ghost ? ' ghost' : ''));
			const label = makeEl('span', '', item.label);

			swatch.style.color = item.color;
			entry.append(swatch, label);

			if (item.hidden) {
				entry.style.visibility = 'hidden';
				entry.setAttribute('aria-hidden', 'true');
			}

			container.appendChild(entry);
		});

		if (typeof renderMathInElement === 'function') {
			renderMath(container);
		}
	}
}

/* ==========================================================================
   HELPERS
   ========================================================================== */

/* About 'count' round tick values covering [min, max] (1, 2, 5 x 10^n). */
function niceTicks(min, max, count) {
	const span = max - min;

	if (!(span > 0)) {
		return [min];
	}

	const raw = span / count;
	const power = Math.pow(10, Math.floor(Math.log10(raw)));
	const fraction = raw / power;
	let step = 10 * power;

	if (fraction <= 1.5) {
		step = power;
	} else if (fraction <= 3) {
		step = 2 * power;
	} else if (fraction <= 7) {
		step = 5 * power;
	}

	const ticks = [];
	const first = Math.ceil(min / step - 1e-9) * step;

	for (let value = first; value <= max + step * 1e-9; value += step) {
		ticks.push(Math.abs(value) < step * 1e-9 ? 0 : value);
	}

	return ticks;
}

/* Default tick label: no trailing noise from floating point. */
function formatTick(value) {
	return String(Number(value.toPrecision(6)));
}

/* Straight 2D segment. */
function drawSegment(ctx, x1, y1, x2, y2) {
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.stroke();
}
