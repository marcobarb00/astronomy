// @ts-check
/* ==========================================================================
   EPILOGUE · BEYOND KEPLER - SCRIPT (page.js)
   One static figure, Jupiter's and Saturn's ellipses over four millennia,
   and the topic cards of the site map.
   Shared code: common.js, time.js, ephemeris.js, vsop87-data.js,
   vsop87-planets.js, vsop87.js, models/mean-sun.js, models/precession.js,
   models/kepler.js, plot2d.js, components.js. Every number quoted in the
   prose comes from tools/numbers/beyond-kepler.js.

   TABLE OF CONTENTS
	 1. Figure 1: Jupiter's and Saturn's ellipses over four millennia
	 2. Page start
   ========================================================================== */

/* ==========================================================================
   1. FIGURE 1: JUPITER'S AND SATURN'S ELLIPSES OVER FOUR MILLENNIA
   Static. The ellipses fitted in the toolbox to the oppositions of
   1926 - 2025 (Kepler.PLANETS_FIT) against VSOP87, in heliocentric
   ecliptic longitude referred to the equinox of J2000: the model's
   longitude of date less the linear precession it uses, against VSOP87
   in the frame of J2000. The error swings once each turn of the planet,
   as the shape of the real orbit changes; averaged over about one turn
   (13 and 29 years) it leaves the slow drift of the mean longitude, the
   kind of change Halley saw, at another phase of the 900-year wave (his
   signs were the opposite). Sampled every year from 1000 BC to AD 3000,
   each value the mean of 2 floor(round(P) / 2) + 1 years centered on it
   (13 for Jupiter, 29 for Saturn). The truncated VSOP87 series were kept
   for AD 1000 - 3000; back to 1000 BC the full series gives the same
   curves within 0.01° (checked in the math review of 2026-11-20). The averages run from -13.2° (Saturn) to +5.2°
   (Jupiter) (tools/numbers/beyond-kepler.js): the scale runs from -15°
   to +7°.
   ========================================================================== */

const DRIFT_YEARS = [-999, 3000];
const DRIFT_RANGE = [-15, 7];

/* The span of the fit, shaded. */
const FIT_YEARS = [1926, 2026];

/* The two planets, their colours and where their names sit (data
   coordinates: the start of each curve, the baseline above Jupiter's,
   the top below Saturn's). */
const DRIFT_PLANETS = [
	{ name: 'jupiter', label: bodyName('Jupiter'), color: COL.earth, at: [-900, 5.7], baseline: 'bottom' },
	{ name: 'saturn', label: bodyName('Saturn'), color: COL.planet, at: [-900, -13.6], baseline: 'top' }
];

/* x ticks: the year, written as on the rest of the site. */
const DRIFT_TICKS = [
	{ value: -999, label: bcText('1000') },
	{ value: 1, label: adText('1') },
	{ value: 1000, label: '1000' },
	{ value: 2000, label: '2000' },
	{ value: 3000, label: '3000' }
];

/* The heliocentric error (deg) of a planet's ellipse at JD(TT), in the
   frame of J2000. */
function ellipseDrift(name, jd) {
	const p = Kepler.PLANETS_FIT[name];
	const model = Kepler.state(p, jd).longitude - Kepler.PRECESSION_PER_DAY * (jd - Time.J2000);
	const real = Ephem.heliocentric(name, jd, { theory: 'vsop87', frame: 'J2000' }).lon;

	return norm180(model - real);
}

/* The error averaged over about one turn of the planet: { years, values },
   a value for each year of DRIFT_YEARS, the mean of the yearly errors over
   2 floor(round(P) / 2) + 1 years centered on it. */
function averagedDrift(name) {
	const period = 360 / (Kepler.PLANETS_FIT[name].n - Kepler.PRECESSION_PER_DAY) / 365.25;
	const half = Math.floor(Math.round(period) / 2);
	const first = DRIFT_YEARS[0] - half;
	const raw = [];

	for (let year = first; year <= DRIFT_YEARS[1] + half; year++) {
		raw.push(ellipseDrift(name, Time.julianDay(year, 1, 1)));
	}

	const years = [];
	const values = [];

	for (let year = DRIFT_YEARS[0]; year <= DRIFT_YEARS[1]; year++) {
		const i = year - first;
		const window = raw.slice(i - half, i + half + 1);

		years.push(year);
		values.push(window.reduce((a, b) => a + b, 0) / window.length);
	}

	return { years, values };
}

const driftFigure = {
	plot: null,
	curves: [],

	init() {
		this.curves = DRIFT_PLANETS.map(planet => averagedDrift(planet.name));

		this.plot = new Plot2D(byId('drift-canvas'), {
			x: DRIFT_YEARS,
			y: DRIFT_RANGE,
			xTicks: () => DRIFT_TICKS,
			xLabel: tr('year', 'anno'),
			yLabel: tr('error (°)', 'errore (°)'),
			aspect: 0.5,
			onDraw: () => this.draw()
		});
		this.plot.redraw();
	},

	draw() {
		const p = this.plot;

		if (!p || this.curves.length === 0) {
			return;
		}

		p.frame();
		p.band(FIT_YEARS, [DRIFT_RANGE[0], DRIFT_RANGE[0]], [DRIFT_RANGE[1], DRIFT_RANGE[1]], {
			color: COL.sun,
			alpha: 0.18
		});
		p.hline(0, { color: COL.ink, width: 1 });

		DRIFT_PLANETS.forEach((planet, i) => {
			p.curve(this.curves[i].years, this.curves[i].values, { color: planet.color, width: 2 });
			p.text(planet.label, planet.at[0], planet.at[1], {
				color: planet.color,
				baseline: planet.baseline,
				dx: 0,
				dy: 0
			});
		});
	}
};

/* ==========================================================================
   2. PAGE START
   Shared components first (they typeset the prose), the topic cards,
   then the figure.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
	Site.initPage();
	Site.renderTopics(byId('topics'));
	startFigures([driftFigure]);
});
