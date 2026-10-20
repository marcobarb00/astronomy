// @ts-check
/* ==========================================================================
   PAGE TEMPLATE - SCRIPT (page.js)
   Each figure has its own section with three functions:
	 init   - find the elements, build the plot / sphere, wire the controls
	 update - read the controls, recompute the numbers, refresh read-outs
	 draw   - paint the figure (called by the plot or sphere on redraw)
   Shared code: common.js, time.js, ephemeris.js, sphere3d.js, plot2d.js,
   errorcurve.js, components.js.

   TABLE OF CONTENTS
	 1. Figure 1: the Sun's declination over a year
	 2. Figure 2: error curve of a model Sun
	 3. Page start
   ========================================================================== */

/* ==========================================================================
   1. FIGURE 1: THE SUN'S DECLINATION OVER A YEAR
   ========================================================================== */

const declinationFigure = {
	plot: null,
	eps: EPS,

	init() {
		this.plot = new Plot2D(byId('fig-declination'), {
			x: [0, 360],
			y: [-45, 45],
			xLabel: 'ecliptic longitude λ (°)',
			yLabel: 'declination δ (°)',
			onDraw: () => this.draw()
		});

		wireSlider(byId('eps'), () => this.update());
		wirePresets(byId('eps').closest('figure'));
		this.update();
	},

	update() {
		this.eps = readNumber('eps');
		showLines('declination-readout', [`\\delta_\\text{max} = \\varepsilon = ${this.eps.toFixed(1)}^\\circ`]);
		this.plot.redraw();
	},

	draw() {
		this.plot.frame();
		this.plot.fn(lambda => asin(sin(this.eps) * sin(lambda)), { color: COL.sun });
	}
};

/* ==========================================================================
   2. FIGURE 2: ERROR CURVE OF A MODEL SUN
   A model is a function JD(TT) -> ecliptic longitude (deg).
   ========================================================================== */

const errorFigure = {
	curve: null,

	init() {
		const start = Time.julianDay(2026, 1, 1);

		this.curve = new ErrorCurve(byId('fig-error'), {
			body: 'sun',
			start: start,
			end: start + 365.25,
			spans: [
				{ label: '1 year', years: 1 },
				{ label: '100 years', years: 100 }
			]
		});

		this.curve.addModel({
			label: 'mean Sun $\\bar\\lambda$',
			color: COL.sun,
			fn: jd => Ephem.sunMeanLongitude(jd)
		});
	}
};

/* ==========================================================================
   3. PAGE START
   Shared components first (they typeset the prose), then the figures.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
	Site.initPage();
	declinationFigure.init();
	errorFigure.init();
});
