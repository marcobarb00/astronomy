// @ts-check
/* ==========================================================================
   PAGE 0.1 · PTOLEMY'S MARS TONIGHT - SCRIPT (page.js)
   The intro: Ptolemy's Mars, page 4.2's model with the Almagest's own
   parameters (PlanetEquant.PTOLEMY), beside the real Mars.
   Shared code: common.js, time.js, ephemeris.js, vsop87-data.js,
   vsop87.js, stars.js, plate-stars.js, plate.js (for its figures of the
   constellations), models/mean-sun.js, models/precession.js,
   models/solar-eccentric.js, models/planet-epicycle.js,
   models/planet-equant.js, models/planet-arrangement.js,
   models/kepler.js, plot2d.js, ladder.js, errorcurve.js, components.js.
   Every number quoted in the prose comes from
   tools/numbers/0.1-mars-tonight.js.

   TABLE OF CONTENTS
	 0. The models and the reference
	 1. Figure 1: the two places of Mars tonight
	 2. Figure 2: the error curve of Ptolemy's Mars
	 3. Figure 3: every model of Mars in the course
	 4. Page start
   ========================================================================== */

/* ==========================================================================
   0. THE MODELS AND THE REFERENCE
   ========================================================================== */

/* Ptolemy's Mars: JD(TT) -> ecliptic longitude of date (deg). */
const ptolemyMars = PlanetEquant.make(PlanetEquant.PTOLEMY);

/* The real Mars of Figures 1 and 2: the reference sky (Standish), valid
   from 3000 BC to AD 3000, which the 2000 years of Figure 2 need. Its
   longitudes are kept, so that the dashed line of Figure 2, drawn from
   the same dates as the error curve, costs no second evaluation. */
const realMarsCache = new Map();

function realMars(jd) {
	let lon = realMarsCache.get(jd);

	if (lon === undefined) {
		lon = Ephem.longitude('mars', jd);
		realMarsCache.set(jd, lon);
	}

	return lon;
}

/* The lag of Ptolemy's mean Sun behind the modern mean Sun (page 1.3's
   fit) (deg): -1.0° in AD 138, -9.2° in 2026. */
function meanSunLag(jd) {
	return norm180(MeanSun.meanLongitude(MeanSun.PTOLEMY, jd) - MeanSun.meanLongitude(MeanSun.MODERN, jd));
}

/* The real Mars of Figure 3: VSOP87, as on page 4.5, since the reference
   sky's planets are Kepler ellipses themselves (DECISIONS.md). */
const VSOP = { theory: 'vsop87' };
const vsopMars = jd => Ephem.longitude('mars', jd, VSOP);

/* ==========================================================================
   1. FIGURE 1: THE TWO PLACES OF MARS TONIGHT
   Static, drawn once for the moment the page opens (the example date of
   the prose if the device's clock is outside the reference's range). A
   strip of the zodiac, 60° of ecliptic longitude centered between the
   two places, east to the left as seen looking south, and 12° of
   ecliptic latitude on each side. The stars are the plate stars
   (plate-stars.js) at their places of the same moment, with the stick
   figures of the zodiac (Plate.FIGURES); the names of the constellations
   run along the bottom of the strip, under the middle of their stars.
   The real Mars is drawn at its ecliptic latitude; Ptolemy's on the
   ecliptic, since the course rebuilds his longitudes only.
   Scales (tools/numbers/0.1-mars-tonight.js): over AD 2000 - 3000 the
   two places are at most 17.5° apart, so each lies within 9° of the
   middle of the strip, and Mars' ecliptic latitude stays within -6.9°
   and +4.6°.
   ========================================================================== */

/* The example moment of the prose: 20 November 2026, 21:00 UT. */
const EXAMPLE_UT = Time.fromDate(new Date('2026-11-20T21:00:00Z'));

/* Half the strip's width, and its half-height (deg). */
const STRIP_HALF_WIDTH = 30;
const STRIP_HALF_HEIGHT = 12;

/* The stars drawn: brighter than this, or on a figure's line. */
const STRIP_MAG_LIMIT = 4.5;

/* A constellation's name stays this far (deg) inside the strip's ends,
   and this far (px) from the next name. */
const NAME_INSET = 4;
const NAME_GAP = 6;

/* The figures of the zodiac. */
const ZODIAC = [
	'ARIES',
	'TAURUS',
	'GEMINI',
	'CANCER',
	'LEO',
	'VIRGO',
	'LIBRA',
	'SCORPIUS',
	'SAGITTARIUS',
	'CAPRICORNUS',
	'AQUARIUS',
	'PISCES'
];

/* Closer than this to the Sun (deg), the read-out says that Mars is lost
   in the Sun's light. */
const SUN_GLARE = 15;

/* Mars and the Sun at least this far apart (deg) count as opposite. */
const OPPOSITE = 150;

/* "Leo" from "LEO", "Capricornus" from "CAPRICORNUS". */
const titleCase = name => name.charAt(0) + name.slice(1).toLowerCase();

const tonightFigure = {
	plot: null,

	init() {
		const now = Time.now();

		this.jdUT = Ephem.inRange(Time.ttFromUt(now)) ? now : EXAMPLE_UT;
		this.jdTT = Time.ttFromUt(this.jdUT);
		this.compute();

		this.plot = new Plot2D(byId('tonight-strip'), {
			x: [-STRIP_HALF_WIDTH, STRIP_HALF_WIDTH],
			y: [-STRIP_HALF_HEIGHT, STRIP_HALF_HEIGHT],
			xTicks: () => this.longitudeTicks(),
			yTicks: () => [-10, -5, 0, 5, 10].map(v => ({ value: v, label: `${v}°` })),
			xLabel: 'ecliptic longitude',
			yLabel: 'ecliptic latitude',
			aspect: 0.42,
			minHeight: 240,
			maxHeight: 360,
			onDraw: () => this.draw()
		});

		this.showReadout();
		this.plot.redraw();
	},

	/* The places of the moment: the two Marses, the Sun, the middle of the
	   strip, and every star in ecliptic coordinates of date. */
	compute() {
		const jd = this.jdTT;
		const eps = Ephem.meanObliquity(jd);
		const mars = Ephem.planet('mars', jd);

		this.real = { lon: mars.lon, lat: mars.lat };
		this.ptolemy = ptolemyMars(jd);
		this.sun = Ephem.longitude('sun', jd);
		this.center = norm360(this.ptolemy + norm180(this.real.lon - this.ptolemy) / 2);

		/** @type {Map<string, { lon: number, lat: number, mag: number }>} */
		this.stars = new Map();

		PLATE_STARS.forEach(star => {
			const eq = Stars.ofDate(star, jd);
			const ecl = Ephem.equatorialToEcliptic(eq.ra, eq.dec, eps);

			this.stars.set(star.id, { lon: ecl.lon, lat: ecl.lat, mag: star.mag });
		});
	},

	/* The x of the strip for an ecliptic longitude: degrees west of the
	   middle, so that east is to the left. */
	x(lon) {
		return norm180(this.center - lon);
	},

	/* Ticks every 10° of ecliptic longitude, the larger to the left. */
	longitudeTicks() {
		const ticks = [];
		const first = Math.ceil((this.center - STRIP_HALF_WIDTH) / 10) * 10;

		for (let lon = first; lon <= this.center + STRIP_HALF_WIDTH; lon += 10) {
			ticks.push({ value: this.x(lon), label: `${norm360(lon)}°` });
		}

		// from left to right, as Plot2D draws them
		return ticks.sort((a, b) => a.value - b.value);
	},

	/* Is a place inside the strip? */
	inside(x, lat) {
		return Math.abs(x) <= STRIP_HALF_WIDTH && Math.abs(lat) <= STRIP_HALF_HEIGHT;
	},

	draw() {
		const p = this.plot;

		p.frame();
		this.drawFigures(p);
		this.drawStars(p);
		this.drawEcliptic(p);
		this.drawBodies(p);
	},

	/* The stick figures of the zodiac, faint, and the names along the
	   bottom of the strip under the middle of each figure's stars. */
	drawFigures(p) {
		const line = { color: COL.ink, alpha: 0.28, width: 1, clip: true };
		const names = [];

		ZODIAC.forEach(name => {
			const figure = Plate.FIGURES[name];
			const xs = [];

			figure.lines.forEach(([a, b]) => {
				const s1 = this.stars.get(a);
				const s2 = this.stars.get(b);

				if (!s1 || !s2) {
					return;
				}

				const x1 = this.x(s1.lon);
				const x2 = this.x(s2.lon);

				// a line across the edge of the strip is cut there; a line
				// that would wrap round the sky is not drawn
				if (Math.abs(x1 - x2) < 90 && (this.inside(x1, s1.lat) || this.inside(x2, s2.lat))) {
					p.curve([x1, x2], [s1.lat, s2.lat], line);
					xs.push(x1, x2);
				}
			});

			const middle = this.figureMiddle(xs);

			if (middle !== null) {
				names.push({ text: titleCase(name), middle });
			}
		});

		this.nameFigures(p, names);
	},

	/* The middle of a figure's stars in the strip (x), kept off the
	   strip's ends, where its name would leave the box; null for a figure
	   outside the strip. */
	figureMiddle(xs) {
		const inside = xs.filter(x => Math.abs(x) <= STRIP_HALF_WIDTH);

		if (inside.length === 0) {
			return null;
		}

		const end = STRIP_HALF_WIDTH - NAME_INSET;

		return clamp((Math.min(...inside) + Math.max(...inside)) / 2, -end, end);
	},

	/* The names along the bottom of the strip, the central ones first; a
	   name that would overlap one already written (on a phone) is left
	   out. The figure is static, so no name can jump. */
	nameFigures(p, names) {
		const font = labelFont('Leo', 'name');
		const taken = [];

		p.ctx.font = font;
		names.sort((a, b) => Math.abs(a.middle) - Math.abs(b.middle));
		names.forEach(name => {
			const half = p.ctx.measureText(name.text).width / 2 + NAME_GAP;
			const center = p.px(name.middle);

			if (taken.some(([left, right]) => center + half > left && center - half < right)) {
				return;
			}

			taken.push([center - half, center + half]);
			p.text(name.text, name.middle, -STRIP_HALF_HEIGHT, {
				color: COL.muted,
				align: 'center',
				baseline: 'bottom',
				dx: 0,
				dy: -4,
				font: font
			});
		});
	},

	/* The stars, four-pointed, sized by magnitude, with the names of the
	   bright stars of the site's catalogue (Regulus, Spica, ...) on their
	   left, clear of a planet just west of them. */
	drawStars(p) {
		const onFigure = new Set(ZODIAC.flatMap(name => Plate.FIGURES[name].lines.flat()));

		this.stars.forEach((star, id) => {
			const x = this.x(star.lon);

			if (!this.inside(x, star.lat) || (star.mag > STRIP_MAG_LIMIT && !onFigure.has(id))) {
				return;
			}

			p.star(x, star.lat, { size: starSize(star.mag) });
		});

		Stars.LIST.forEach(bright => {
			const star = this.stars.get(bright.id);

			if (star && this.inside(this.x(star.lon), star.lat)) {
				p.text(bright.name, this.x(star.lon), star.lat, { align: 'right', dx: -7, dy: -5 });
			}
		});
	},

	/* The ecliptic, named at the western end of the strip. */
	drawEcliptic(p) {
		p.hline(0, { color: COL.sun, width: 1.5 });
		p.text('ecliptic', STRIP_HALF_WIDTH, 0, { color: COL.sun, align: 'right', dx: -6, dy: -4 });
	},

	/* The Sun when it falls in the strip, the two places of Mars, and the
	   arc between them, labelled. */
	drawBodies(p) {
		const xReal = this.x(this.real.lon);
		const xPtolemy = this.x(this.ptolemy);
		const xSun = this.x(this.sun);
		const arcY = Math.max(this.real.lat, 0) + 3;

		if (Math.abs(xSun) <= STRIP_HALF_WIDTH) {
			p.marker(xSun, 0, { color: COL.sun, radius: 7 });
			p.text('Sun', xSun, 0, { color: COL.sun, dx: 8, dy: 16 });
		}

		// the arc between the two longitudes, with ticks at its ends
		p.curve([xPtolemy, xReal], [arcY, arcY], { color: COL.ink, width: 1 });
		p.curve([xPtolemy, xPtolemy], [arcY - 0.6, arcY + 0.6], { color: COL.ink, width: 1 });
		p.curve([xReal, xReal], [arcY - 0.6, arcY + 0.6], { color: COL.ink, width: 1 });
		p.text(`${Math.abs(norm180(this.ptolemy - this.real.lon)).toFixed(1)}°`, (xReal + xPtolemy) / 2, arcY, {
			align: 'center',
			dx: 0,
			dy: -4
		});

		p.marker(xPtolemy, 0, { color: COL.epicycle, radius: 5.5 });
		p.text("Ptolemy's Mars", xPtolemy, 0, { color: COL.epicycle, align: 'center', baseline: 'top', dx: 0, dy: 9 });

		p.marker(xReal, this.real.lat, { color: COL.planet, radius: 5.5 });
		p.text('Mars', xReal, this.real.lat, { color: COL.planet, dx: 7, dy: -6 });
	},

	/* Four lines: the moment, the two ecliptic longitudes (the difference
	   is written on the strip), and where Mars is in the sky. */
	showReadout() {
		const elongation = norm180(this.real.lon - this.sun);

		// short lines, so that each fits on a phone
		showLines('tonight-readout', [
			`\\text{${Time.formatDate(this.jdUT, { time: true })} UT}`,
			`\\text{Mars: } \\lambda = ${this.real.lon.toFixed(1)}^\\circ`,
			`\\text{Ptolemy's Mars: } \\lambda = ${this.ptolemy.toFixed(1)}^\\circ`,
			`\\text{${this.visibility(elongation)}}`
		]);
	},

	/* Where Mars is in the sky, from its elongation from the Sun (deg). */
	visibility(elongation) {
		const angle = Math.abs(elongation).toFixed(0);

		if (Math.abs(elongation) < SUN_GLARE) {
			return `Lost in the Sun's light, ${angle}° from it`;
		}

		if (Math.abs(elongation) >= OPPOSITE) {
			return `Up all night, ${angle}° from the Sun`;
		}

		if (elongation < 0) {
			return `Morning sky, ${angle}° west of the Sun`;
		}

		return `Evening sky, ${angle}° east of the Sun`;
	}
};

/* ==========================================================================
   2. FIGURE 2: THE ERROR CURVE OF PTOLEMY'S MARS
   Two views: 2000 years from Ptolemy's time (AD 100 - 2100), and 20 years
   around 2026. The model has no control, so there are no ghost buttons;
   the dashed line is the lag of his mean Sun (meanSunLag), drawn in the
   style of a ghost, as a line on top of the model (smooth). The scale
   is the same in both views: the error stays between -12.3° and -0.1°
   over AD 100 - 2100 (tools/numbers/0.1-mars-tonight.js), within 14°.
   ========================================================================== */

const ERROR_Y_MAX = 14;

/* One sample every this many days at most: the 20-year view, about 9 days
   a pixel on a desktop and 24 on a phone, is then drawn as a line, so the
   swing between oppositions shows; the 2000-year view is drawn as bands,
   one synodic period or more per pixel. */
const ERROR_RESOLUTION_DAYS = 25;

const errorFigure = {
	init() {
		const year = y => Time.julianDay(y, 1, 1);
		const curve = new ErrorCurve(byId('error-ptolemy'), {
			body: 'mars',
			reference: realMars,
			start: year(100),
			end: year(2100),
			spans: [
				{ label: '2000 years', years: 2000, center: year(1100) },
				{ label: '20 years', years: 20, center: year(2026) }
			],
			units: 'deg',
			yMax: ERROR_Y_MAX,
			resolution: ERROR_RESOLUTION_DAYS,
			ghostButtons: false
		});

		curve.addGhost({
			label: "the lag of Ptolemy's mean Sun",
			short: 'his mean Sun',
			color: COL.sun,
			smooth: true,
			fn: jd => realMars(jd) + meanSunLag(jd)
		});
		curve.addModel({
			label: "Ptolemy's Mars",
			short: "Ptolemy's Mars",
			color: COL.epicycle,
			fn: ptolemyMars
		});
	}
};

/* ==========================================================================
   3. FIGURE 3: EVERY MODEL OF MARS IN THE COURSE
   Static. The largest error of each model of Mars over 2010 - 2025,
   every day, against VSOP87: the rows of page 4.5's Figure 6 for Mars,
   with Ptolemy's model as he left it first. From 5.7' (Kepler's
   ellipses) to 53.7° (the uniform circle)
   (tools/numbers/0.1-mars-tonight.js).
   ========================================================================== */

const MODELS_OF_MARS = [
	{ page: '', name: 'Almagest', fn: ptolemyMars },
	{ page: '4.1', name: 'uniform', fn: PlanetEpicycle.makeUniform(PlanetEpicycle.MARS_FIT) },
	{ page: '4.1', name: 'epicycle', fn: PlanetEpicycle.make(PlanetEpicycle.MARS_FIT) },
	{ page: '4.2', name: 'equant', fn: PlanetEquant.make(PlanetEquant.MARS_FIT) },
	{ page: '4.3', name: 'epicyclet', fn: PlanetArrangement.makeEpicyclet() },
	{ page: '4.5', name: 'ellipses', fn: Kepler.make() }
];

const ladderFigure = {
	init() {
		const year = y => Time.julianDay(y, 1, 1);

		this.panel = ErrorLadder.panel(byId('ladder-mars'), MODELS_OF_MARS, vsopMars, year(2010), year(2026), 1);
	}
};

/* ==========================================================================
   4. PAGE START
   Shared components first (they typeset the prose), then the figures.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
	Site.initPage();
	startFigures([tonightFigure, errorFigure, ladderFigure]);
});
