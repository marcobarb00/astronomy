/* ==========================================================================
   PAGE 1.2 · FRAMES - SCRIPT (page.js)
   Four figures, each with its own init / update / draw:
	 1. ecliptic and equator      (3D, equatorial frame: the stars never move;
								   the obliquity turns the ecliptic frame)
	 2. equator and horizon       (3D, equatorial frame: latitude and the turn
								   of the sky move the horizon frame)
	 3. the Sun on the equator    (2D: declination and alpha - lambda against
								   lambda, with Ptolemy's tables)
	 4. fixed frames, real Sun    (2D: errors of a fixed obliquity over a year)
   Shared code: common.js, time.js, ephemeris.js, stars.js, models/diurnal.js,
   models/frames.js, sphere3d.js, plot2d.js, components.js.
   Every number quoted in the prose comes from tools/numbers/1.2-frames.js.

   TABLE OF CONTENTS
	 0. Helpers shared by the figures
	 1. Figure 1: ecliptic and equator
	 2. Figure 2: equator and horizon
	 3. Figure 3: the Sun on the equator's grid
	 4. Figure 4: fixed frames against the real Sun
	 5. Page start
   ========================================================================== */


/* ==========================================================================
   0. HELPERS SHARED BY THE FIGURES
   ========================================================================== */

/* The stars are shown at their mean positions of 2026.0, and the frames use
   the mean obliquity of that date (tools/numbers/1.2-frames.js). */
const STAR_EPOCH = Time.julianDay(2026, 1, 1);
const EPS_TODAY = Ephem.meanObliquity(STAR_EPOCH);

/* The axes are drawn a little beyond the sphere. */
const AXIS_LENGTH = 1.25;

/* Text of an angle with two decimals: "−5.47°". */
const formatDegrees = value => `${value.toFixed(2).replace('-', '−')}°`;

/* The same in TeX: "-5.47^\circ". */
const texDegrees = (value, digits = 2) => `${value.toFixed(digits)}^\\circ`;

/* A right ascension in hours and minutes, for TeX: "4^\text{h}37^\text{m}". */
function texHours(ra) {
	const { whole, rest } = splitWithCarry(norm360(ra) / 15, 60);

	return `${whole % 24}^\\text{h}${pad2(rest)}^\\text{m}`;
}

/* An angle in degrees, minutes and seconds, for TeX: "20^\circ 30' 09''". */
function texDms(value) {
	const sign = value < 0 ? '-' : '';
	const totalSeconds = Math.round(Math.abs(value) * 3600);
	const d = Math.floor(totalSeconds / 3600);
	const m = Math.floor((totalSeconds - 3600 * d) / 60);
	const s = totalSeconds - 3600 * d - 60 * m;

	return `${sign}${d}^\\circ ${pad2(m)}' ${pad2(s)}''`;
}

/* A unit vector in TeX, with four decimals. */
function texVector(name, v) {
	return `${name} = (${v.map(x => x.toFixed(4)).join(',\\ ')})`;
}

/* The mean position of date of a star of shared/stars.js. */
const starOfDate = name => Stars.ofDate(Stars.find(name), STAR_EPOCH);

/* A coordinate path in a frame: along the fundamental circle from the
   origin to the foot of the point (longitude), then up to the point
   (latitude). axes = [x, y, z] of the frame in the drawing's components.
   Both arcs are labelled at their middle, away from the sphere's centre. */
function drawCoordinatePath(sphere, axes, lon, lat, names, color) {
	const [x, y, z] = axes;
	const foot = lin2(x, y, cos(lon), sin(lon));
	const lonMiddle = arcPoint(x, y, lon / 2);
	const latMiddle = arcPoint(foot, z, lat / 2);
	const centre = { x: sphere.cx, y: sphere.cy };

	sphere.arc(x, y, lon, { color: color, width: 3 });
	sphere.arc(foot, z, lat, { color: color, width: 3, dash: [6, 4] });
	sphere.point(foot, { color: color, radius: 3 });
	sphere.labelAway(names[0], lonMiddle, centre, color);

	if (Math.abs(lat) > 4) {
		sphere.labelAway(names[1], latMiddle, foot, color);
	}
}


/* ==========================================================================
   1. FIGURE 1: ECLIPTIC AND EQUATOR
   Drawn in the equatorial frame: the stars and the equator never move.
   The obliquity turns the ecliptic frame about the shared x axis, the
   direction of the vernal point.
   ========================================================================== */

const eclipticFigure = {
	sphere: null,
	starName: 'Aldebaran',
	state: null,

	init() {
		const figure = byId('ecl-canvas').closest('figure');

		this.sphere = new Sphere3D(byId('ecl-canvas'), {
			yaw: 240,
			pitch: 20,
			onDraw: () => this.draw()
		});

		byId('ecl-eps').value = EPS_TODAY.toFixed(4);
		byId('ecl-today').dataset.value = EPS_TODAY.toFixed(4);
		wireSlider(byId('ecl-eps'), () => this.update(), formatDegrees);
		wirePresets(figure);

		buildChoice(byId('ecl-stars'),
			['Aldebaran', 'Spica', 'Antares', 'Vega', 'Polaris', 'Sirius', 'Canopus'],
			this.starName, name => {
				this.starName = name;
				this.update();
			});

		this.update();
	},

	/* The star's two addresses, as vectors and as angles. */
	update() {
		const eps = readNumber('ecl-eps');
		const eq = starOfDate(this.starName);
		const sEq = fromLonLat(eq.ra, eq.dec);
		const sEcl = matApply(Frames.equatorialToEclipticMatrix(eps), sEq);

		this.state = {
			eps: eps,
			eq: eq,
			ecl: toLonLat(sEcl),
			sEq: sEq,
			sEcl: sEcl,
			// the ecliptic frame's axes in equatorial components: the columns
			// of R_x(eps)
			eclipticAxes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map(axis => {
				return matApply(Frames.eclipticToEquatorialMatrix(eps), axis);
			})
		};

		this.showReadout();
		this.sphere.redraw();
	},

	showReadout() {
		const { eq, ecl, sEq, sEcl } = this.state;

		showLines('ecl-readout', [
			`\\text{${this.starName}}`,
			`\\alpha = ${texDegrees(eq.ra)}\\ (${texHours(eq.ra)}),\\quad \\delta = ${texDegrees(eq.dec)}`,
			`\\lambda = ${texDegrees(ecl.lon)},\\quad \\beta = ${texDegrees(ecl.lat)}`,
			texVector('\\mathbf s_\\text{eq}', sEq),
			texVector('\\mathbf s_\\text{ecl}', sEcl)
		]);
	},

	draw() {
		if (!this.state) {
			return;    // a resize can ask for a drawing before the first update
		}

		const s = this.sphere;
		const { eq, ecl, sEq, eclipticAxes } = this.state;
		const equatorAxes = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
		const [, yEcl, K] = eclipticAxes;

		s.outline();

		// the two fundamental circles
		s.circle([1, 0, 0], [0, 1, 0], { color: COL.earth, width: 2 });
		s.circle([1, 0, 0], yEcl, { color: COL.sun, width: 2 });

		// the axes: x shared (towards the vernal point), then y and z of each frame
		s.arrow(ORIGIN, [AXIS_LENGTH, 0, 0], { color: COL.ink });
		s.label('γ', [AXIS_LENGTH, 0, 0], { color: COL.ink, dx: 6, dy: 16 });
		s.arrow(ORIGIN, [0, AXIS_LENGTH, 0], { color: COL.earth });
		s.axis([0, 0, AXIS_LENGTH], 'P', { color: COL.earth, labelColor: COL.earth });
		s.arrow(ORIGIN, scale(yEcl, AXIS_LENGTH), { color: COL.sun });
		s.axis(scale(K, AXIS_LENGTH), 'K', { color: COL.sun, labelColor: COL.sun });

		// the star's two addresses
		drawCoordinatePath(s, equatorAxes, eq.ra, eq.dec, ['α', 'δ'], COL.earth);
		drawCoordinatePath(s, eclipticAxes, ecl.lon, ecl.lat, ['λ', 'β'], COL.sun);

		s.point(sEq, { color: COL.planet, radius: 6, ring: true });
		s.labelAway(this.starName, sEq, { x: s.cx, y: s.cy }, COL.planet);
	}
};


/* ==========================================================================
   2. FIGURE 2: EQUATOR AND HORIZON
   Drawn in the equatorial frame, as Figure 2 of page 1.1: the stars, the
   equator and the ecliptic never move; the latitude and the turn of the
   sky move the observer's horizon frame.
   ========================================================================== */

/* The observation of section 1: Aldebaran from Rome, 1 January 2026,
   19:00 UT (tools/numbers/1.2-frames.js). */
const OBSERVATION = { star: 'Aldebaran', phi: 41.9, theta: 38.94 };

/* Degrees of turn per second when playing (one turn in 24 s). */
const PLAY_DEGREES_PER_SECOND = 15;

const horizonFigure = {
	sphere: null,
	starName: OBSERVATION.star,
	state: null,

	init() {
		const figure = byId('hor-canvas').closest('figure');

		this.sphere = new Sphere3D(byId('hor-canvas'), {
			yaw: 240,
			pitch: 20,
			onDraw: () => this.draw()
		});

		wireSlider(byId('hor-lat'), () => this.update(), value => `${value.toFixed(1)}°`);
		wireSlider(byId('hor-theta'), () => this.update(), value => `${value.toFixed(1)}°`);
		wirePresets(figure);
		this.player = wirePlayButton(byId('hor-play'), byId('hor-theta'), PLAY_DEGREES_PER_SECOND);

		buildChoice(byId('hor-stars'), ['Aldebaran', 'Vega', 'Sirius', 'Polaris', 'Canopus'],
			this.starName, name => {
				this.starName = name;
				this.update();
			});

		byId('hor-observation').addEventListener('click', () => this.showObservation());
		this.update();
	},

	/* Back to the observation of section 1. */
	showObservation() {
		this.player.pause();
		this.starName = OBSERVATION.star;
		byId('hor-stars').querySelectorAll('button').forEach(button => {
			button.classList.toggle('active', button.textContent === OBSERVATION.star);
		});
		byId('hor-lat').value = OBSERVATION.phi;
		byId('hor-theta').value = OBSERVATION.theta;
		byId('hor-lat').dispatchEvent(new Event('input'));
		byId('hor-theta').dispatchEvent(new Event('input'));
	},

	update() {
		const phi = readNumber('hor-lat');
		const theta = readNumber('hor-theta');
		const eq = starOfDate(this.starName);
		const matrix = Frames.equatorialToHorizonMatrix(phi, theta);
		const toEquatorial = transpose(matrix);

		this.state = {
			phi: phi,
			theta: theta,
			eq: eq,
			hor: Frames.equatorialToHorizontal(eq.ra, eq.dec, phi, theta),
			angle: Frames.eclipticHorizonAngle(EPS_TODAY, phi, theta),
			toEquatorial: v => matApply(toEquatorial, v)
		};

		this.showReadout();
		this.sphere.redraw();
	},

	showReadout() {
		const { eq, hor, angle } = this.state;

		showLines('hor-readout', [
			`\\text{${this.starName}:}\\ \\alpha = ${texDegrees(eq.ra)},\\quad \\delta = ${texDegrees(eq.dec)}`,
			`H = \\theta - \\alpha = ${texDegrees(hor.H)}`,
			`A = ${texDegrees(hor.A)},\\quad a = ${texDegrees(hor.a)}`,
			`I = ${texDegrees(angle, 1)}`
		]);
	},

	draw() {
		if (!this.state) {
			return;
		}

		const s = this.sphere;

		s.outline();
		this.drawSky();
		this.drawGround();
		this.drawStar();
	},

	/* The fixed sky: equator, pole, vernal point, ecliptic. */
	drawSky() {
		const s = this.sphere;
		const yEcl = [0, cos(EPS_TODAY), sin(EPS_TODAY)];

		s.circle([1, 0, 0], [0, 1, 0], { color: COL.earth, width: 2 });
		s.axis([0, 0, AXIS_LENGTH], 'P', { color: COL.earth, labelColor: COL.earth });
		s.circle([1, 0, 0], yEcl, { color: COL.sun, width: 1.5, dash: [8, 5] });
		s.point([1, 0, 0], { color: COL.ink, radius: 4 });
		s.label('γ', [1, 0, 0], { color: COL.ink, dx: 6, dy: 16 });
	},

	/* The observer's frame: horizon, cardinal points, zenith, meridian. */
	drawGround() {
		const s = this.sphere;
		const { toEquatorial } = this.state;
		const south = toEquatorial([1, 0, 0]);
		const east = toEquatorial([0, 1, 0]);
		const zenith = toEquatorial([0, 0, 1]);

		s.fillPlane(south, east, { color: COL.deferent, alpha: 0.14 });
		s.circle(south, east, { color: COL.deferent, width: 2 });
		s.circle(south, zenith, { color: COL.muted, width: 1, dash: [2, 4] });

		[['S', south], ['E', east], ['N', negate(south)], ['W', negate(east)]].forEach(([name, point]) => {
			s.label(name, scale(point, 1.09), { color: COL.deferent, dx: -5, dy: 5 });
		});

		s.point(zenith, { color: COL.deferent, radius: 5 });
		s.labelAway('Z', zenith, { x: s.cx, y: s.cy }, COL.deferent);
	},

	/* The star and its two addresses: (H, delta) from the meridian along
	   the equator, (A, a) from the north point along the horizon. */
	drawStar() {
		const s = this.sphere;
		const { theta, eq, hor, toEquatorial } = this.state;
		const meridianPoint = fromLonLat(theta, 0);
		const westward = fromLonLat(theta - 90, 0);
		const hourAxes = [meridianPoint, westward, [0, 0, 1]];
		const horizonAxes = [toEquatorial([-1, 0, 0]), toEquatorial([0, 1, 0]), toEquatorial([0, 0, 1])];
		const starPoint = fromLonLat(eq.ra, eq.dec);

		s.point(meridianPoint, { color: COL.earth, radius: 3.5 });
		drawCoordinatePath(s, hourAxes, hor.H, eq.dec, ['H', 'δ'], COL.earth);
		drawCoordinatePath(s, horizonAxes, hor.A, hor.a, ['A', 'a'], COL.deferent);

		s.point(starPoint, { color: COL.planet, radius: 6, ring: true });
		s.labelAway(this.starName, starPoint, { x: s.cx, y: s.cy }, COL.planet);
	}
};


/* ==========================================================================
   3. FIGURE 3: THE SUN ON THE EQUATOR'S GRID
   (a) the declination of the ecliptic point at longitude lambda;
   (b) alpha - lambda, the reduction to the equator.
   Dots: Ptolemy's tables (Almagest I 15, I 16), carried to the four
   quadrants by the symmetries of the ecliptic.
   Fixed scales: |delta| <= eps <= 30° (the slider's top) and
   |alpha - lambda| <= asin(tan^2 15°) = 4.12° (tools/numbers/1.2-frames.js).
   ========================================================================== */

const SUN_DEC_RANGE = [-35, 35];
const SUN_REDUCTION_RANGE = [-5, 5];

/* x ticks every 90° of longitude. */
const longitudeTicks = () => [0, 90, 180, 270, 360].map(value => ({ value, label: String(value) }));

/* Ptolemy's declinations every 10° of longitude, all four quadrants. */
function ptolemyDeclinationDots() {
	const dots = [];

	for (let lon = 0; lon <= 360; lon += 10) {
		dots.push([lon, Frames.ptolemyDeclination(lon)]);
	}

	return dots;
}

/* Ptolemy's alpha - lambda every 10°: from I 16 in the first quadrant,
   then r(180 - l) = -r(l), r(180 + l) = r(l), r(360 - l) = -r(l). */
function ptolemyReductionDots() {
	const first = Frames.ptolemyRightAscensions().map((ra, i) => ra - 10 * i);
	const dots = [];

	for (let i = 0; i <= 36; i++) {
		const quadrant = Math.floor(i / 9) % 4;
		const k = i % 9;
		const value = [first[k], -first[9 - k], first[k], -first[9 - k]][quadrant];

		dots.push([10 * i, i === 36 ? 0 : value]);
	}

	return dots;
}

const sunFigure = {
	decPlot: null,
	reductionPlot: null,
	decDots: ptolemyDeclinationDots(),
	reductionDots: ptolemyReductionDots(),

	init() {
		const figure = byId('sun-dec').closest('figure');

		this.decPlot = new Plot2D(byId('sun-dec'), {
			x: [0, 360],
			y: SUN_DEC_RANGE,
			xLabel: 'ecliptic longitude λ (°)',
			yLabel: 'declination δ (°)',
			aspect: 0.75,
			xTicks: longitudeTicks,
			onDraw: () => this.drawDeclination()
		});

		this.reductionPlot = new Plot2D(byId('sun-red'), {
			x: [0, 360],
			y: SUN_REDUCTION_RANGE,
			xLabel: 'ecliptic longitude λ (°)',
			yLabel: 'α − λ (°)',
			aspect: 0.75,
			xTicks: longitudeTicks,
			onDraw: () => this.drawReduction()
		});

		byId('sun-eps').value = EPS_TODAY.toFixed(4);
		byId('sun-today').dataset.value = EPS_TODAY.toFixed(4);
		wireSlider(byId('sun-eps'), () => this.update(), formatDegrees);
		wireSlider(byId('sun-lon'), () => this.update(), value => `${value}°`);
		wirePresets(figure);
		this.update();
	},

	update() {
		this.eps = readNumber('sun-eps');
		this.lon = readNumber('sun-lon');
		this.point = Frames.eclipticPoint(this.lon, this.eps);
		this.reduction = Frames.reduction(this.lon, this.eps);
		this.showReadout();
		this.decPlot.redraw();
		this.reductionPlot.redraw();
	},

	showReadout() {
		const { lon, point, reduction } = this;
		const lines = [
			`\\lambda = ${lon}^\\circ\\text{:}\\quad \\delta = ${texDegrees(point.dec, 3)},\\quad \\alpha = ${texDegrees(point.ra, 3)}\\ (${texHours(point.ra)})`,
			`\\alpha - \\lambda = ${texDegrees(reduction, 3)}`,
			`\\text{Ptolemy, I 15: } \\delta = ${texDms(Frames.ptolemyDeclination(lon))}`
		];

		if (lon % 10 === 0 && lon <= 90) {
			const ra = Frames.ptolemyRightAscensions()[lon / 10];

			lines.push(`\\text{Ptolemy, I 16: } \\alpha = ${texDms(ra).replace(/ 00''$/, '')}`);
		}

		showLines('sun-readout', lines);
	},

	/* Panel (a): delta against lambda. */
	drawDeclination() {
		const p = this.decPlot;

		p.frame();
		p.hline(0, { color: COL.earth, width: 2 });
		p.fn(lon => Frames.eclipticPoint(lon, this.eps).dec, { color: COL.sun, width: 2.5 });
		this.decDots.forEach(([lon, dec]) => p.marker(lon, dec, { color: COL.ink, radius: 3 }));
		p.marker(this.lon, this.point.dec, { color: COL.planet, radius: 6 });
	},

	/* Panel (b): alpha - lambda against lambda. */
	drawReduction() {
		const p = this.reductionPlot;

		p.frame();
		p.fn(lon => Frames.reduction(lon, this.eps), { color: COL.sun, width: 2.5 });
		this.reductionDots.forEach(([lon, r]) => p.marker(lon, r, { color: COL.ink, radius: 3 }));
		p.marker(this.lon, this.reduction, { color: COL.planet, radius: 6 });
	}
};


/* ==========================================================================
   4. FIGURE 4: FIXED FRAMES AGAINST THE REAL SUN
   Over one year, the Sun's real longitude is turned into (alpha, delta)
   with a fixed obliquity and compared with the real (alpha, delta).
   Fixed scale: over every year and obliquity the sliders allow, the
   largest error is 46.4' (tools/numbers/1.2-frames.js).
   ========================================================================== */

const TEST_Y_RANGE = [-50, 50];      // arcminutes
const TEST_STEP_DAYS = 2;

/* The real Sun over the year starting 1 January of 'year', sorted by
   longitude: [{ lon, ra, dec }]. */
function realSunYear(year) {
	const start = Time.julianDay(year, 1, 1);
	const days = [];

	for (let day = 0; day <= 366; day += TEST_STEP_DAYS) {
		const jd = start + day;
		const position = Ephem.sun(jd);
		const eq = Ephem.equatorial(position, jd);

		days.push({ lon: position.lon, ra: eq.ra, dec: eq.dec });
	}

	return days.sort((a, b) => a.lon - b.lon);
}

/* Mean obliquity of the middle of a year. */
const obliquityOfYear = year => Ephem.meanObliquity(Time.julianDay(year, 7, 1));

const testFigure = {
	plot: null,
	year: null,
	days: null,

	init() {
		const figure = byId('test-plot').closest('figure');

		this.plot = new Plot2D(byId('test-plot'), {
			x: [0, 360],
			y: TEST_Y_RANGE,
			xLabel: 'the Sun\'s longitude λ (°)',
			yLabel: 'model − real (arcmin)',
			aspect: 0.55,
			xTicks: longitudeTicks,
			onDraw: () => this.draw()
		});

		byId('test-ptolemy').dataset.value = Frames.PTOLEMY_OBLIQUITY.toFixed(4);
		wireSlider(byId('test-year'), () => this.update(), year => Time.formatYear(year));
		wireSlider(byId('test-eps'), () => this.update(), formatDegrees);
		wirePresets(figure);
		byId('test-fit').addEventListener('click', () => this.fitToYear());
		this.update();
	},

	/* Set the obliquity to the real mean value of the chosen year. */
	fitToYear() {
		byId('test-eps').value = obliquityOfYear(readNumber('test-year')).toFixed(4);
		byId('test-eps').dispatchEvent(new Event('input'));
	},

	update() {
		const year = readNumber('test-year');

		// the real Sun is recomputed only when the year changes
		if (year !== this.year) {
			this.year = year;
			this.days = realSunYear(year);
		}

		this.eps = readNumber('test-eps');
		this.errors = this.days.map(day => {
			const model = Frames.eclipticPoint(day.lon, this.eps);

			return {
				lon: day.lon,
				dDec: (model.dec - day.dec) * 60,
				dRA: norm180(model.ra - day.ra) * 60
			};
		});

		this.showReadout();
		this.plot.redraw();
	},

	showReadout() {
		const realEps = obliquityOfYear(this.year);
		const largest = key => Math.max(...this.errors.map(e => Math.abs(e[key])));

		showLines('test-readout', [
			`\\text{${Time.formatYear(this.year)}:}\\ \\varepsilon_\\text{real} = ${texDegrees(realEps, 3)}`,
			`\\varepsilon_\\text{model} - \\varepsilon_\\text{real} = ${((this.eps - realEps) * 60).toFixed(1)}'`,
			`\\max |\\Delta\\delta| = ${largest('dDec').toFixed(1)}'`,
			`\\max |\\Delta\\alpha| = ${largest('dRA').toFixed(1)}'`
		]);
	},

	draw() {
		const p = this.plot;
		const xs = this.errors.map(e => e.lon);

		p.frame();
		p.hline(0, { color: COL.ink, width: 1 });
		p.curve(xs, this.errors.map(e => e.dDec), { color: COL.planet, width: 2.5 });
		p.curve(xs, this.errors.map(e => e.dRA), { color: COL.epicycle, width: 2.5 });
	}
};


/* ==========================================================================
   5. PAGE START
   Shared components first (they typeset the prose), then the figures.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
	Site.initPage();
	eclipticFigure.init();
	horizonFigure.init();
	sunFigure.init();
	testFigure.init();
});
