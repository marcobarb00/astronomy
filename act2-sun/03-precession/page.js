// @ts-check
/* ==========================================================================
   PAGE 2.3 · PRECESSION - SCRIPT (page.js)
   Six figures, each with its own init and draw (and update when it has
   controls):
	 1. six stars over 6000 years  (2D, static: (a) the change of
									  longitude and latitude, (b) the
									  declination)
	 2. the equator turning over the ecliptic
									 (3D, in the ecliptic frame: year)
	 3. the path of the pole        (blue plate, static)
	 4. Spica's records             (2D, static: the records, the fitted
									  line, Ptolemy's rule, the real Spica)
	 5. the two models against the sky
									 (error curves: (a) Spica, uniform
									  precession; (b) the Sun, moving apogee)
	 6. Ptolemy's stars             (2D, static: records minus the real
									  sky, with the error of Ptolemy's Sun)
   Shared code: common.js, time.js, ephemeris.js, stars.js, plate.js,
   models/mean-sun.js, models/solar-eccentric.js, models/precession.js,
   sphere3d.js, plot2d.js, errorcurve.js, components.js.
   Every number quoted in the prose comes from tools/numbers/2.3-precession.js.

   TABLE OF CONTENTS
	 0. Helpers shared by the figures
	 1. Figure 1: six stars over 6000 years
	 2. Figure 2: the equator turning over the ecliptic
	 3. Figure 3: the path of the pole
	 4. Figure 4: Spica's records
	 5. Figure 5: the two models against the sky
	 6. Figure 6: Ptolemy's stars
	 7. Page start
   ========================================================================== */

/* ==========================================================================
   0. HELPERS SHARED BY THE FIGURES
   ========================================================================== */

/* The page's model: uniform precession fitted to the reference sky around
   2026, with the obliquity of 2026 (models/precession.js). */
const MODEL = Precession.MODERN;

/* Mean ecliptic coordinates of date and the declination of a star of the
   reference sky (proper motion, then the long-term precession of
   ephemeris.js): { lon, lat, dec } in degrees. */
function starOfDate(star, jd) {
	const p = Stars.ofDate(star, jd);
	const e = Ephem.equatorialToEcliptic(p.ra, p.dec, Ephem.meanObliquity(jd));

	return { lon: e.lon, lat: e.lat, dec: p.dec };
}

/* JD of 1 January of an astronomical year (-127 = 128 BC). */
const jdOfYear = year => Time.julianDay(year, 1, 1);

/* "2026", "AD 137", "128 BC", "AD 13·790" for an astronomical year. */
function yearText(year) {
	const rounded = Math.round(year);

	if (rounded <= 0) {
		return `${withThousands(1 - rounded)} BC`;
	}

	return rounded < 1000 || rounded > 9999 ? `AD ${withThousands(rounded)}` : String(rounded);
}

/* 13790 -> "13·790": the thousands set off by a raised dot, never a
   comma, which many readers take for a decimal separator (WRITING.md §4);
   numbers under 10000 keep no separator. */
function withThousands(n) {
	return n >= 10000 ? `${Math.floor(n / 1000)}·${String(n % 1000).padStart(3, '0')}` : String(n);
}

/* Ticks of a year axis at round dates, labelled in BC / AD: the tick of
   "1000 BC" is at the astronomical year -999. 'every' is the step (years). */
function yearTicks(min, max, every) {
	const ticks = [];

	// t is the year as written (-1000 for 1000 BC), year the astronomical
	// one (-999): the axis runs in astronomical years
	for (let t = Math.ceil((min - 1) / every) * every; t <= max; t += every) {
		const year = t < 0 ? t + 1 : t;

		if (t === 0 || year < min) {
			continue; // no year 0: "1 BC" and "AD 1" are one year apart
		}

		ticks.push({ value: year, label: t < 0 ? `${-t} BC` : String(t) });
	}

	return ticks;
}

/* Ticks every 'every' years, every other one when the axis is short. */
const yearTicksEvery = every => (min, max, count) => {
	const ticks = yearTicks(min, max, every);

	return ticks.length > count + 1 ? ticks.filter((tick, i) => i % 2 === 0) : ticks;
};

/* ==========================================================================
   1. FIGURE 1: SIX STARS OVER 6000 YEARS
   Static. The reference sky from 3000 BC to AD 3000, every 50 years:
   (a) each star's longitude and latitude minus its values in 2026 (the
   longitudes from -70.0° to +13.3°, all six within 0.85° of each other;
   the latitudes within 0.64° of zero), (b) each declination (from -27.8°
   to +89.5°) (tools/numbers/2.3-precession.js).
   ========================================================================== */

const SIX_STARS = ['Polaris', 'Vega', 'Regulus', 'Aldebaran', 'Spica', 'Antares'];
const SIX_STARS_FROM = -2999;
const SIX_STARS_TO = 3000;
const SIX_STARS_STEP = 50; // years
const CHANGE_RANGE = [-80, 20];
const DECLINATION_RANGE = [-40, 100];

const sixStarsFigure = {
	init() {
		this.years = [];

		for (let year = SIX_STARS_FROM; year <= SIX_STARS_TO; year += SIX_STARS_STEP) {
			this.years.push(year);
		}

		this.series = SIX_STARS.map(name => {
			const star = Stars.find(name);
			const now = starOfDate(star, jdOfYear(2026));
			const points = this.years.map(year => starOfDate(star, jdOfYear(year)));

			return {
				name: name,
				dLon: points.map(p => norm180(p.lon - now.lon)),
				dLat: points.map(p => p.lat - now.lat),
				dec: points.map(p => p.dec)
			};
		});

		const common = {
			x: [SIX_STARS_FROM, SIX_STARS_TO],
			xLabel: 'year',
			xTicks: yearTicksEvery(1000),
			aspect: 0.8,
			maxHeight: 380
		};

		this.changePlot = new Plot2D(
			byId('stars-ecliptic'),
			Object.assign({}, common, {
				y: CHANGE_RANGE,
				yLabel: 'change since 2026 (°)',
				onDraw: p => this.drawChange(p)
			})
		);

		this.declinationPlot = new Plot2D(
			byId('stars-declination'),
			Object.assign({}, common, {
				y: DECLINATION_RANGE,
				yLabel: 'declination δ (°)',
				onDraw: p => this.drawDeclination(p)
			})
		);
	},

	/* The dotted line of 2026. */
	drawNow(p) {
		p.vline(2026, { color: COL.muted, width: 1.2, dash: [2, 4] });
	},

	/* Panel (a): the six longitudes and the six latitudes, one label each. */
	drawChange(p) {
		p.frame();
		this.drawNow(p);

		this.series.forEach(s => {
			p.curve(this.years, s.dLon, { color: COL.ink, width: 1.4 });
			p.curve(this.years, s.dLat, { color: COL.ink, width: 1.4 });
		});

		// the longitude line runs from lower left to upper right: its name
		// goes below it, to the right
		p.text('λ, all six stars', -1200, -45, { color: COL.ink, kind: 'name', dy: 26 });
		p.text('β, all six stars', -2400, 0, { color: COL.ink, kind: 'name', dy: -8 });
	},

	/* Panel (b): the declinations, each named at its right end. */
	drawDeclination(p) {
		p.frame();
		this.drawNow(p);

		this.series.forEach(s => {
			const isSpica = s.name === 'Spica';
			const color = isSpica ? COL.planet : COL.ink;
			const last = s.dec.length - 1;

			p.curve(this.years, s.dec, { color: color, width: isSpica ? 2.4 : 1.4 });
			p.text(s.name, this.years[last], s.dec[last], {
				color: color,
				kind: 'name',
				align: 'right',
				dx: -4,
				dy: -6,
				alternatives: [0.85, 0.7, 0.55].map(f => {
					const i = Math.round(f * last);

					return { x: this.years[i], y: s.dec[i] };
				})
			});
		});
	}
};

/* ==========================================================================
   2. FIGURE 2: THE EQUATOR TURNING OVER THE ECLIPTIC
   Drawn in the ecliptic frame of 2026 (x towards the equinox of 2026, z
   towards the ecliptic pole K): the ecliptic and the stars stay still,
   and the year turns the pole P of the equator about K, with the equator
   and its node γ (models/precession.js). The stars are at their places of
   2026 in that frame. The year runs over one turn, 11·001 BC to AD 15·000.
   ========================================================================== */

/* The stars of the figure: the pole stars of the text, and four stars
   near the ecliptic; Spica, whose longitude is drawn, is the chosen one. */
const SPHERE_STARS = ['Polaris', 'Thuban', 'Vega', 'Deneb', 'Regulus', 'Aldebaran', 'Antares', 'Spica'];
const CHOSEN_STAR = 'Spica';

/* The arrows of the poles reach this far. */
const POLE_LENGTH = 1.25;

/* The faint γ of 2026 is named only when γ of date is this far from it
   (deg); nearer, the two names would overlap. */
const FAINT_GAMMA_GAP = 6;

/* The play button runs a turn of the pole in about 26 seconds. */
const PLAY_YEARS_PER_SECOND = 1000;

const modelFigure = {
	sphere: null,
	state: null,

	init() {
		const figure = byId('model-sphere').closest('figure');
		const epoch = MODEL.epoch;

		// the stars in the ecliptic frame of 2026
		this.stars = SPHERE_STARS.map(name => {
			const star = Stars.find(name);
			const p = Stars.ofDate(star, epoch);
			const e = Ephem.equatorialToEcliptic(p.ra, p.dec, MODEL.obliquity);

			return { name: name, mag: star.mag, lon: e.lon, lat: e.lat, vector: fromLonLat(e.lon, e.lat) };
		});
		this.chosen = this.stars.find(star => star.name === CHOSEN_STAR);

		this.sphere = new Sphere3D(byId('model-sphere'), {
			yaw: 115,
			pitch: 28,
			onDraw: () => this.draw()
		});

		wireSlider(byId('model-year'), () => this.update(), yearText);
		wirePresets(figure);
		wirePlayButton(byId('model-play'), byId('model-year'), PLAY_YEARS_PER_SECOND, { playLabel: 'Play a turn' });

		this.update();
	},

	update() {
		const year = readNumber('model-year');
		const jd = jdOfYear(year);
		const shift = Precession.shift(MODEL, jd);
		const pole = Precession.pole(MODEL, jd);
		const chosen = Precession.equatorial(MODEL, this.chosen.lon, this.chosen.lat, jd);

		// the star nearest the pole of date
		let nearest = null;

		this.stars.forEach(star => {
			const distance = acos(dot3(star.vector, pole));

			if (!nearest || distance < nearest.distance) {
				nearest = { name: star.name, distance: distance };
			}
		});

		this.state = {
			year: year,
			shift: shift,
			pole: pole,
			equinox: Precession.equinox(MODEL, jd),
			lambda: Precession.longitude(MODEL, this.chosen.lon, jd),
			dec: chosen.dec,
			nearest: nearest
		};

		this.showReadout();
		this.sphere.redraw();
	},

	showReadout() {
		const { year, shift, lambda, dec, nearest } = this.state;

		showLines('model-readout', [
			`${texText(`${yearText(year)}: shift `)} ${signed(shift, 2).replace('−', '-')}^\\circ`,
			`\\text{Spica: } \\lambda = ${fixed(lambda, 2)}^\\circ,\\ \\delta = ${signed(dec, 2).replace('−', '-')}^\\circ`,
			`\\text{nearest P: ${nearest.name}, } ${fixed(nearest.distance, 1)}^\\circ`
		]);
	},

	draw() {
		if (!this.state) {
			return; // a resize can ask for a drawing before the first update
		}

		const s = this.sphere;
		const { pole, equinox, lambda } = this.state;
		const gamma = fromLonLat(equinox, 0);
		const east = fromLonLat(equinox + 90, 0);

		s.outline();

		// the fixed ecliptic and its pole K; the circle P follows
		s.circle([1, 0, 0], [0, 1, 0], { color: COL.sun, width: 2 });
		s.label(
			'ecliptic',
			frontPoint(s, angle => fromLonLat(angle, 0)),
			{
				color: COL.sun,
				kind: 'name',
				dx: 6,
				dy: 18
			}
		);
		s.axis([0, 0, POLE_LENGTH], 'K', { color: COL.sun, labelColor: COL.sun });
		s.smallCircle([0, 0, 1], MODEL.obliquity, { color: COL.earth, width: 1.2, dash: [5, 4] });

		// the equator of date, its pole P and its node gamma
		s.greatCircle(pole, { color: COL.earth, width: 2 });
		s.label(
			'equator',
			frontPoint(s, angle => crossDirection(pole, angle), 120),
			{
				color: COL.earth,
				kind: 'name',
				dx: 6,
				dy: -8
			}
		);
		s.axis(scale(pole, POLE_LENGTH), 'P', { color: COL.earth, labelColor: COL.earth });

		// Spica's longitude, east from gamma along the ecliptic
		s.arc(gamma, east, lambda, { color: COL.planet, width: 4 });
		s.labelArc('λ', gamma, east, lambda, { color: COL.planet, dx: 4, dy: 18 }, 1.08);

		// gamma of 2026 (faint) and of date
		s.point([1, 0, 0], { color: COL.muted, radius: 3.5 });

		if (Math.abs(norm180(equinox)) > FAINT_GAMMA_GAP) {
			s.label('γ', [1, 0, 0], { color: COL.muted, dx: 6, dy: 18 });
		}

		s.point(gamma, { color: COL.ink, radius: 5, ring: true });
		s.label('γ', gamma, { color: COL.ink, kind: 'symbol', dx: 8, dy: -8 });

		// the stars, the chosen one in the colour of the object of interest
		this.stars.forEach(star => {
			const isChosen = star === this.chosen;

			s.star(star.vector, {
				color: isChosen ? COL.planet : COL.ink,
				size: isChosen ? STAR_SIZE_CHOSEN : starSize(star.mag),
				alpha: isChosen ? 1 : 0.8,
				ring: true
			});
			s.label(star.name, star.vector, { color: isChosen ? COL.planet : COL.ink, kind: 'name' });
		});
	}
};

/* The point of a circle (angle -> point) nearest the viewer, offset by
   'skip' degrees so that two circles get their names at different places:
   where a circle's name can be read. pointAt is cos(angle) u + sin(angle) v
   and the depth is linear in the point, so the depth is cos(angle) d(u) +
   sin(angle) d(v), least at the angle found below: exactly, so that the
   name glides along its circle as the sphere turns instead of stepping
   (CLAUDE.md). */
function frontPoint(sphere, pointAt, skip = 0) {
	const du = sphere.project(pointAt(0)).d;
	const dv = sphere.project(pointAt(90)).d;

	return pointAt(atan2d(-dv, -du) + skip);
}

/* A point of the great circle with pole 'pole', at the angle 'angle'
   from the direction of P x K: where the name of the equator goes. */
function crossDirection(pole, angle) {
	const node = normalize3(cross3(pole, [0, 0, 1]));
	const quarter = cross3(pole, node);

	return lin2(node, quarter, cos(angle), sin(angle));
}

/* ==========================================================================
   3. FIGURE 3: THE PATH OF THE POLE
   Static, a blue plate (STYLE.md §7; shared/plate.js). The northern sky of
   2026 down to declination +35°, and in gold the pole of the equator over
   one turn of the reference sky's precession, 10·859 BC to AD 14·910,
   seen in the equatorial frame of 2026; ticks every thousand years. It
   circles the ecliptic pole K, at right ascension 18 h and declination
   90° minus the obliquity of 2026.
   ========================================================================== */

const POLE_PATH_FROM = -10858;
const POLE_PATH_TO = 14910;
const POLE_PATH_STEP = 50; // years
const POLE_PATH_LABELS = { '-2999': '3000 BC', 2000: 'AD 2000', 8000: 'AD 8000', 14000: 'AD 14·000' };

const polePathFigure = {
	init() {
		const chart = Plate.polar(byId('plate-pole-path'), {
			rimDec: 35,
			figures: ['URSA MINOR'],
			keep: ['alf Dra', 'alf Lyr'], // Thuban and Vega, named in the caption, stay on a phone
			names: [
				['alf UMi', 'Polaris', 8, 4],
				['alf Dra', 'Thuban', 9, 4],
				['alf Lyr', 'Vega', 10, 4]
			],
			label: 'Chart of the northern sky around the celestial pole, with the path of the pole over one turn of precession, a circle around the ecliptic pole.'
		});

		const poleAt = year => Ephem.precessEquatorial(0, 90, jdOfYear(year), Plate.EPOCH);
		const points = [];

		for (let year = POLE_PATH_FROM; year <= POLE_PATH_TO; year += POLE_PATH_STEP) {
			points.push(poleAt(year));
		}

		points.push(poleAt(POLE_PATH_TO));

		// a tick every thousand years, some of them named
		const marks = [];

		for (let thousand = -10; thousand <= 14; thousand++) {
			const year = thousand < 0 ? 1000 * thousand + 1 : 1000 * thousand;

			if (thousand !== 0) {
				marks.push(Object.assign(poleAt(year), { text: POLE_PATH_LABELS[year] ?? '' }));
			}
		}

		const eclipticPole = { ra: 270, dec: 90 - Ephem.meanObliquity(Plate.EPOCH) };

		Plate.highlightPath(chart, points, eclipticPole, marks);
		Plate.symbol(chart, eclipticPole.ra, eclipticPole.dec, 'K');
	}
};

/* ==========================================================================
   4. FIGURE 4: SPICA'S RECORDS
   Static. The six recorded longitudes of Spica (Precession.RECORDS), the
   real Spica, the straight line fitted to the records by least squares
   (50.6" a year), and Ptolemy's rule, 1° in 100 years from his catalogue
   (models/precession.js, PTOLEMY), from 400 BC to AD 1600. Every line
   stays between 170° and 200°.
   ========================================================================== */

const RECORDS_FROM = -399;
const RECORDS_TO = 1600;
const RECORDS_RANGE = [165, 205];

const recordsFigure = {
	init() {
		const spica = Stars.find('Spica');

		this.records = Precession.RECORDS.filter(r => r.star === 'Spica').map(r => ({
			who: r.who,
			year: Time.decimalYear(r.jd),
			lon: r.lon
		}));
		this.line = leastSquares(
			this.records.map(r => r.year),
			this.records.map(r => r.lon)
		);
		this.realYears = [];
		this.real = [];

		for (let year = RECORDS_FROM; year <= RECORDS_TO; year += 25) {
			this.realYears.push(year);
			this.real.push(starOfDate(spica, jdOfYear(year)).lon);
		}

		const catalogue = Precession.RECORDS.find(r => r.who === 'Ptolemy' && r.star === 'Spica');

		this.ptolemy = year => Precession.longitude(Precession.PTOLEMY, catalogue.lon, jdOfYear(year));

		this.plot = new Plot2D(byId('records-plot'), {
			x: [RECORDS_FROM, RECORDS_TO],
			y: RECORDS_RANGE,
			xLabel: 'year',
			yLabel: 'longitude of Spica λ (°)',
			xTicks: yearTicksEvery(200),
			aspect: 0.5,
			maxHeight: 400,
			onDraw: p => this.draw(p)
		});
	},

	draw(p) {
		p.frame();

		p.curve(this.realYears, this.real, { color: COL.planet, width: 2.4 });
		p.fn(year => this.line.a + this.line.b * year, { color: COL.ink, width: 1.6, dash: [6, 4] });
		p.fn(year => this.ptolemy(year), { color: COL.epicycle, width: 2 });

		// the names of the lines: the real Spica above the pair of close
		// lines, the fitted line and Ptolemy's rule below their own
		const fitted = year => this.line.a + this.line.b * year;

		p.text('real Spica', 800, fitted(800), { color: COL.planet, kind: 'name', align: 'right', dy: -14 });
		p.text('fitted to the records', 1150, fitted(1150), { color: COL.ink, kind: 'name', dx: 8, dy: 24 });
		p.text("Ptolemy's rule", 600, this.ptolemy(600), { color: COL.epicycle, kind: 'name', dy: 24 });

		// the records, one name per observer
		const named = new Set();

		this.records.forEach(r => {
			p.marker(r.year, r.lon, { color: COL.ink, radius: 4.5 });

			if (!named.has(r.who)) {
				named.add(r.who);
				p.text(r.who, r.year, r.lon, Object.assign({ color: COL.ink, kind: 'name' }, RECORD_LABELS[r.who]));
			}
		});
	}
};

/* Where each observer's name goes, beside the first of his records: the
   records lie below the lines, so the names go below them. */
const RECORD_LABELS = {
	Timocharis: { dx: 10, dy: 22 },
	Menelaus: { dx: 10, dy: 22 },
	Ptolemy: { dx: 10, dy: 42 },
	Copernicus: { align: 'right', dx: -10, dy: -12 }
};

/* Least-squares line y = a + b x through the points. */
function leastSquares(xs, ys) {
	const n = xs.length;
	const mx = xs.reduce((sum, x) => sum + x, 0) / n;
	const my = ys.reduce((sum, y) => sum + y, 0) / n;
	let sxy = 0;
	let sxx = 0;

	xs.forEach((x, i) => {
		sxy += (x - mx) * (ys[i] - my);
		sxx += (x - mx) * (x - mx);
	});

	return { a: my - (sxy / sxx) * mx, b: sxy / sxx };
}

/* ==========================================================================
   5. FIGURE 5: THE TWO MODELS AGAINST THE SKY
   (a) Spica: uniform precession from its place of 2026 against the real
   Spica, whose precession (Vondrák et al. 2011) holds far beyond the
   ephemeris' dates, so nothing is shaded: within 2.6' over 2000 years
   and 18' over 6000. (b) The Sun: the eccentric with its moving apogee
   (SolarEccentric.MOVING_2026), with the fixed apogee of page 2.1 as a
   ghost. Both centred on 2026.
   ========================================================================== */

const CENTRE_2026 = Time.julianDay(2026, 7, 2);
const DAYS_PER_YEAR = 365.25;

const testFigure = {
	init() {
		const spica = Stars.find('Spica');
		const spicaNow = starOfDate(spica, MODEL.epoch);
		const half = years => (years * DAYS_PER_YEAR) / 2;

		const stars = new ErrorCurve(byId('error-spica'), {
			reference: jd => starOfDate(spica, jd).lon,
			start: CENTRE_2026 - half(2000),
			end: CENTRE_2026 + half(2000),
			spans: [
				{ label: '2000 years', years: 2000 },
				{ label: '6000 years', years: 6000 }
			],
			resolution: 36525,
			validRange: null,
			ghostButtons: false
		});

		stars.addModel({
			label: "uniform precession, $p = 50.29''$ a year",
			short: 'uniform precession',
			color: COL.earth,
			fn: Precession.make(MODEL, spicaNow.lon)
		});

		const sun = new ErrorCurve(byId('error-sun'), {
			body: 'sun',
			start: CENTRE_2026 - half(2000),
			end: CENTRE_2026 + half(2000),
			spans: [
				{ label: '100 years', years: 100 },
				{ label: '1000 years', years: 1000 },
				{ label: '2000 years', years: 2000 }
			],
			ghostButtons: false
		});

		sun.addGhost({
			label: 'fixed apogee (page 2.1)',
			short: 'fixed apogee',
			color: COL.deferent,
			fn: SolarEccentric.make(SolarEccentric.FIT_2026)
		});
		sun.addModel({
			label: 'moving apogee, 1.741° a century',
			short: 'moving apogee',
			color: COL.deferent,
			fn: SolarEccentric.make(SolarEccentric.MOVING_2026)
		});
	}
};

/* ==========================================================================
   6. FIGURE 6: PTOLEMY'S STARS
   Static. Each record of Precession.RECORDS minus the real longitude of
   its star on its date (from -1.56° to +0.68°), the records reduced with
   Ptolemy's tables in the colour of his circles; and the band of
   Ptolemy's Sun minus the real Sun (SolarEccentric.PTOLEMY), from its
   smallest to its largest value in each decade, from 400 BC to AD 300,
   the centuries of the records he reduced (within -2.3° and +1.5° there).
   ========================================================================== */

/* Where each observer's name goes in Figure 6, beside his first record. */
const ERROR_LABELS = {
	Timocharis: { dx: 10, dy: -8 },
	Hipparchus: { align: 'right', dx: -10, dy: 6 },
	Menelaus: { align: 'right', dx: -10, dy: 22 },
	Ptolemy: { dx: 10, dy: 22 },
	'al-Battani': { dx: 10, dy: 22 },
	Copernicus: { align: 'right', dx: -10, dy: -8 }
};

const PTOLEMY_FROM = -399;
const PTOLEMY_TO = 1600;
const PTOLEMY_RANGE = [-2.5, 2];
const SUN_BAND_TO = 300;
const SUN_BAND_STEP = 10; // years
const SUN_BAND_SAMPLES = 36; // in each step

const ptolemyFigure = {
	init() {
		this.records = Precession.RECORDS.map(r => ({
			who: r.who,
			ptolemy: r.ptolemy,
			year: Time.decimalYear(r.jd),
			error: norm180(r.lon - starOfDate(Stars.find(r.star), r.jd).lon)
		}));

		// the error of Ptolemy's Sun, smallest and largest in each decade
		const ptolemySun = SolarEccentric.make(SolarEccentric.PTOLEMY);

		this.bandYears = [];
		this.bandLows = [];
		this.bandHighs = [];

		for (let year = PTOLEMY_FROM; year <= SUN_BAND_TO; year += SUN_BAND_STEP) {
			const start = jdOfYear(year);
			let low = Infinity;
			let high = -Infinity;

			for (let i = 0; i < SUN_BAND_SAMPLES; i++) {
				const jd = start + ((i + 0.5) * SUN_BAND_STEP * DAYS_PER_YEAR) / SUN_BAND_SAMPLES;
				const error = norm180(ptolemySun(jd) - Ephem.longitude('sun', jd));

				low = Math.min(low, error);
				high = Math.max(high, error);
			}

			this.bandYears.push(year + SUN_BAND_STEP / 2);
			this.bandLows.push(low);
			this.bandHighs.push(high);
		}

		this.plot = new Plot2D(byId('ptolemy-plot'), {
			x: [PTOLEMY_FROM, PTOLEMY_TO],
			y: PTOLEMY_RANGE,
			xLabel: 'year',
			yLabel: 'record − real (°)',
			xTicks: yearTicksEvery(200),
			aspect: 0.5,
			maxHeight: 400,
			onDraw: p => this.draw(p)
		});
	},

	draw(p) {
		p.frame();
		p.hline(0, { color: COL.ink, width: 1 });
		p.band(this.bandYears, this.bandLows, this.bandHighs, { color: COL.epicycle, alpha: 0.25 });

		const named = new Set();

		this.records.forEach(r => {
			const color = r.ptolemy ? COL.epicycle : COL.ink;

			p.marker(r.year, r.error, { color: color, radius: 4.5 });

			if (!named.has(r.who)) {
				named.add(r.who);
				p.text(r.who, r.year, r.error, Object.assign({ color: color, kind: 'name' }, ERROR_LABELS[r.who]));
			}
		});
	}
};

/* ==========================================================================
   7. PAGE START
   Shared components first (they typeset the prose), then the figures.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
	Site.initPage();
	startFigures([sixStarsFigure, modelFigure, polePathFigure, recordsFigure, testFigure, ptolemyFigure]);
});
