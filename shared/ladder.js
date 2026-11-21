// @ts-check
/* ==========================================================================
   PREDICTING THE SKY - THE ERROR LADDER (ladder.js)
   A static chart of the largest error of several models against the
   reference, one row per model in the order of the course, its dot on a
   horizontal scale of powers of ten (0.1' to 100°), the dots joined from
   row to row. Page 4.5 (Figure 6, the Sun and Mars) and the toolbox (the
   Sun, the Moon and the planets) draw it; panels drawn one above the
   other share the scale.
   Needs common.js and plot2d.js. The rows are computed when the panel is
   built: one evaluation of every model and of the reference per step.

	 ErrorLadder.panel(canvas, rows, reference, start, end, step, options)
	   rows: [{ page: '4.5', name: 'ellipse', fn: jd -> longitude }, ...],
		 each with its own reference (jd -> longitude) when the rows are
		 models of different bodies
	   reference: jd -> longitude (deg), for the rows without their own;
	   start, end, step: JD(TT), days
	   options.names: the room (px) for the row names on the left
	   options.join: false leaves the dots apart (rows of different
		 bodies, which are not steps of one another)

   TABLE OF CONTENTS
	 1. The scale
	 2. One panel
	 3. Export
   ========================================================================== */

const ErrorLadder = (function () {
	/* ======================================================================
	   1. THE SCALE
	   The errors of the course run from a quarter of an arcminute (the
	   Sun's ellipse) to 54° (the uniform Mars): the axis runs from 0.1' to
	   100° (tools/numbers/4.5-kepler.js, tools/numbers/toolbox.js).
	   ====================================================================== */

	/* The marks of the scale: their value in arcminutes and their label. */
	const MARKS = [
		{ arcmin: 0.1, label: '0.1′' },
		{ arcmin: 1, label: '1′' },
		{ arcmin: 10, label: '10′' },
		{ arcmin: 60, label: '1°' },
		{ arcmin: 600, label: '10°' },
		{ arcmin: 6000, label: '100°' }
	];
	const RANGE = [Math.log10(0.1), Math.log10(6000)];

	/* The height of a row (px), and the default room for the row names
	   (wider in Italian, whose names are longer: "4.3 epiciclo minore"). */
	const ROW = 34;
	const NAMES = tr(100, 136);

	/* The y value of row i of n, the first row at the top: from n down to
	   1, so that no row falls on y = 0, where Plot2D draws a stronger
	   line. */
	function rowValue(i, n) {
		return n - i;
	}

	/* ======================================================================
	   2. ONE PANEL
	   ====================================================================== */

	/* The largest error (deg) of each model over [start, end). */
	function largestErrors(rows, reference, start, end, step) {
		const worst = rows.map(() => 0);

		for (let jd = start; jd < end; jd += step) {
			const ref = reference ? reference(jd) : NaN;

			rows.forEach((row, i) => {
				const own = row.reference ? row.reference(jd) : ref;

				worst[i] = Math.max(worst[i], Math.abs(norm180(row.fn(jd) - own)));
			});
		}

		return worst;
	}

	/* Build and draw one panel on the canvas; returns { rows, worst
	   (deg), plot }. */
	function panel(canvas, rows, reference, start, end, step, options = {}) {
		const worst = largestErrors(rows, reference, start, end, step);
		const values = worst.map(degrees => Math.log10(Math.max(degrees * 60, 1e-6)));
		const ys = rows.map((row, i) => rowValue(i, rows.length));

		// a fixed height: the rows, and the margins of Plot2D for the
		// scale's ticks and title below
		const height = rows.length * ROW + 52;
		const result = { rows, worst, plot: null };

		result.plot = new Plot2D(canvas, {
			x: RANGE,
			y: [0.5, rows.length + 0.5],
			xTicks: () => MARKS.map(mark => ({ value: Math.log10(mark.arcmin), label: mark.label })),
			yTicks: () =>
				rows.map((row, i) => ({ value: ys[i], label: `${row.page} ${row.name}`.trim(), words: true })),
			xLabel: tr('largest error', 'errore massimo'),
			margin: { left: options.names ?? NAMES },
			minHeight: height,
			maxHeight: height,
			onDraw: () => {
				const p = result.plot;

				if (!p) {
					return;
				}

				p.frame();

				if (options.join !== false) {
					p.curve(values, ys, { color: withAlpha(COL.planet, 0.5), width: 1.2 });
				}

				values.forEach((value, i) => p.marker(value, ys[i], { color: COL.planet, radius: 5.5 }));
			}
		});
		result.plot.redraw();

		return result;
	}

	/* ======================================================================
	   3. EXPORT
	   ====================================================================== */

	return {
		MARKS,
		RANGE,
		largestErrors,
		panel
	};
})();
