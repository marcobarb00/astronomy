// @ts-check
/* ==========================================================================
   PAGE 1.2 · FRAMES - SCRIPT (page.js)
   Four figures, each with its own init and draw (and update when it has
   controls):
	 1. the zodiac around Taurus  (a blue plate: a static chart of the stars)
	 2. ecliptic and equator      (3D, equatorial frame: the stars never move;
								   the date moves the Sun along the ecliptic)
	 3. equator and horizon       (3D, equatorial frame: latitude and the turn
								   of the sky move the horizon frame)
	 4. the nutation error        (2D, static: mean against true obliquity
								   over 2026)
   The comparison of Ptolemy's tables with the real Sun is a static table in
   index.html (numbers from tools/numbers/1.2-frames.js).
   Shared code: common.js, time.js, ephemeris.js, stars.js, models/diurnal.js,
   models/frames.js, plate-stars.js, plate.js, sphere3d.js, plot2d.js,
   components.js.
   Every number quoted in the prose comes from tools/numbers/1.2-frames.js.

   TABLE OF CONTENTS
	 0. Helpers shared by the figures
	 1. Figure 1: the zodiac around Taurus
	 2. Figure 2: ecliptic and equator
	 3. Figure 3: equator and horizon
	 4. Figure 4: the nutation error
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

/* A number with 'digits' decimals, never "-0.00" for a value that rounds
   to zero. */
function fixedNoNegativeZero(value, digits) {
	const text = value.toFixed(digits);

	return Number(text) === 0 ? (0).toFixed(digits) : text;
}

/* The same in TeX: "-5.47^\circ". */
const texDegrees = (value, digits = 2) => `${fixedNoNegativeZero(value, digits)}^\\circ`;

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
	return `${name} = (${v.map(x => fixedNoNegativeZero(x, 4)).join(',\\ ')})`;
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
   1. FIGURE 1: THE ZODIAC AROUND TAURUS
   A blue plate (shared/plate.js): the stars of 2026 around Aldebaran, as
   seen looking south, on the equatorial grid. Highlighted: the ecliptic
   of 2026, so that the star's two sets of coordinates in the table can be
   seen against their two circles.
   ========================================================================== */

/* The area of the chart (degrees): right ascension 1h30 to 6h30. */
const ZODIAC_AREA = { raMin: 22.5, raMax: 97.5, decMin: -10, decMax: 30 };

/* The ecliptic is named at this longitude (deg). */
const ZODIAC_ECLIPTIC_NAME_AT = 45;

const zodiacFigure = {
	init() {
		const chart = Plate.rectangular(byId('plate-zodiac'), {
			area: ZODIAC_AREA,
			figures: ['TAURUS', 'ARIES', 'ORION'],
			names: [
				['alf Tau', 'Aldebaran', 8, 22],
				['alf Ori', 'Betelgeuse', 9, 4],
				['bet Ori', 'Rigel', 9, 4],
				['alf Ari', 'Hamal', -9, 4, 'end'],
				['eta Tau', 'Pleiades', -14, -12]
			],
			label: 'Chart of the band of the zodiac around Taurus, with the ecliptic highlighted.'
		});
		const eps = Ephem.meanObliquity(Plate.EPOCH);
		const ecliptic = [];

		for (let lon = 0; lon <= 120; lon += 1) {
			ecliptic.push(Frames.eclipticPoint(lon, eps));
		}

		const nameAt = Frames.eclipticPoint(ZODIAC_ECLIPTIC_NAME_AT, eps);

		Plate.highlightCurve(chart, ecliptic, 'ecliptic', [nameAt.ra, nameAt.dec, 8, 18]);
	}
};

/* ==========================================================================
   2. FIGURE 2: ECLIPTIC AND EQUATOR
   Drawn in the equatorial frame with the obliquity of 2026.0: the stars,
   the equator and the ecliptic never move. The date moves only the Sun,
   along the ecliptic, about 1° a day: the yearly motion. The daily
   rotation does not appear, since the frame turns with the sky.
   ========================================================================== */

/* The year shown by the date slider (day 0 = 1 January, 0h TT). */
const SUN_YEAR = 2026;
const SUN_YEAR_START = Time.julianDay(SUN_YEAR, 1, 1);

/* Days of the year per second when playing (a year in about 24 s). */
const PLAY_DAYS_PER_SECOND = 15;

/* The arrow of the Sun's yearly motion: how far ahead it reaches along the
   ecliptic (deg), and its distance from the centre, just outside the
   sphere so that it does not cover the lambda path. */
const SUN_ARROW_DEGREES = 20;
const SUN_ARROW_RADIUS = 1.1;

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* Day of the year (slider value) -> "21 May". */
function formatDay(day) {
	const date = Time.calendarDate(SUN_YEAR_START + Math.floor(day));

	return `${Math.floor(date.day)} ${MONTH_NAMES[date.month - 1]}`;
}

/* The objects the read-out can follow: the Sun first, then the stars. */
const ECLIPTIC_CHOICES = ['Sun', 'Aldebaran', 'Spica', 'Antares', 'Vega', 'Polaris', 'Sirius', 'Canopus'];

const eclipticFigure = {
	sphere: null,
	chosen: 'Sun',
	state: null,

	init() {
		const figure = byId('ecl-canvas').closest('figure');

		this.sphere = new Sphere3D(byId('ecl-canvas'), {
			yaw: 240,
			pitch: 20,
			onDraw: () => this.draw()
		});

		wireSlider(byId('ecl-day'), () => this.update(), formatDay);
		wirePresets(figure);
		wirePlayButton(byId('ecl-play'), byId('ecl-day'), PLAY_DAYS_PER_SECOND);

		buildChoice(byId('ecl-objects'), ECLIPTIC_CHOICES, this.chosen, name => {
			this.chosen = name;
			this.update();
		});

		this.update();
	},

	/* The Sun on the chosen date, and the chosen object's two sets of
	   coordinates, as vectors and as angles. */
	update() {
		const day = readNumber('ecl-day');
		const sun = Ephem.sun(SUN_YEAR_START + day);
		const toEquatorial = Frames.eclipticToEquatorialMatrix(EPS_TODAY);
		const sunEcl = fromLonLat(sun.lon, sun.lat);
		const sunEq = matApply(toEquatorial, sunEcl);
		let sEq = sunEq;
		let sEcl = sunEcl;

		if (this.chosen !== 'Sun') {
			const eq = starOfDate(this.chosen);

			sEq = fromLonLat(eq.ra, eq.dec);
			sEcl = matApply(Frames.equatorialToEclipticMatrix(EPS_TODAY), sEq);
		}

		this.state = {
			day: day,
			sunLon: sun.lon,
			sunEq: sunEq,
			sEq: sEq,
			sEcl: sEcl,
			eq: toLonLat(sEq),
			ecl: toLonLat(sEcl),
			// the ecliptic frame's axes in equatorial components: the columns
			// of R_x(eps)
			eclipticAxes: [
				[1, 0, 0],
				[0, 1, 0],
				[0, 0, 1]
			].map(axis => matApply(toEquatorial, axis))
		};

		this.showReadout();
		this.sphere.redraw();
	},

	showReadout() {
		const { day, eq, ecl, sEq, sEcl } = this.state;
		const title =
			this.chosen === 'Sun' ? `\\text{the Sun, ${formatDay(day)} ${SUN_YEAR}}` : `\\text{${this.chosen}}`;

		showLines('ecl-readout', [
			title,
			`\\alpha = ${texDegrees(eq.lon)}\\ (${texHours(eq.lon)}),\\quad \\delta = ${texDegrees(eq.lat)}`,
			`\\lambda = ${texDegrees(ecl.lon)},\\quad \\beta = ${texDegrees(ecl.lat)}`,
			texVector('\\mathbf s_\\text{eq}', sEq),
			texVector('\\mathbf s_\\text{ecl}', sEcl)
		]);
	},

	draw() {
		if (!this.state) {
			return; // a resize can ask for a drawing before the first update
		}

		const s = this.sphere;
		const { eq, ecl, sEq, eclipticAxes } = this.state;
		const equatorAxes = [
			[1, 0, 0],
			[0, 1, 0],
			[0, 0, 1]
		];
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

		// the chosen object's two sets of coordinates
		drawCoordinatePath(s, equatorAxes, eq.lon, eq.lat, ['α', 'δ'], COL.earth);
		drawCoordinatePath(s, eclipticAxes, ecl.lon, ecl.lat, ['λ', 'β'], COL.sun);

		if (this.chosen !== 'Sun') {
			s.star(sEq, { color: COL.planet, size: STAR_SIZE_CHOSEN, ring: true });
			s.labelAway(this.chosen, sEq, { x: s.cx, y: s.cy }, COL.planet);
		}

		this.drawSun();
	},

	/* The Sun on the ecliptic, with an arrow along its yearly motion
	   (eastward, towards greater longitude). */
	drawSun() {
		const s = this.sphere;
		const { sunLon, sunEq, eclipticAxes } = this.state;
		const [xEcl, yEcl] = eclipticAxes;
		const along = degrees => arcPoint(xEcl, yEcl, sunLon + degrees, SUN_ARROW_RADIUS);
		const shaft = [];

		for (let t = 0; t <= SUN_ARROW_DEGREES - 3; t += 1) {
			shaft.push(along(t));
		}

		s.path(shaft, { color: COL.ink, width: 2 });
		s.arrow(along(SUN_ARROW_DEGREES - 3), along(SUN_ARROW_DEGREES), { color: COL.ink, width: 2 });
		s.point(sunEq, { color: COL.sun, radius: 8, ring: true });
		// the label on the side away from the arrow, so the two never overlap
		s.labelAway('Sun', sunEq, along(SUN_ARROW_DEGREES / 2), COL.ink);
	}
};

/* ==========================================================================
   3. FIGURE 3: EQUATOR AND HORIZON
   Drawn in the equatorial frame, as Figure 3 of page 1.1: the stars, the
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

		wireSlider(
			byId('hor-lat'),
			() => this.update(),
			value => `${value.toFixed(1)}°`
		);
		wireSlider(
			byId('hor-theta'),
			() => this.update(),
			value => `${value.toFixed(1)}°`
		);
		wirePresets(figure);
		this.player = wirePlayButton(byId('hor-play'), byId('hor-theta'), PLAY_DEGREES_PER_SECOND);

		buildChoice(byId('hor-stars'), ['Aldebaran', 'Vega', 'Sirius', 'Polaris', 'Canopus'], this.starName, name => {
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
		byId('hor-stars')
			.querySelectorAll('button')
			.forEach(button => {
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

		[
			['S', south],
			['E', east],
			['N', negate(south)],
			['W', negate(east)]
		].forEach(([name, point]) => {
			s.label(name, scale(point, 1.09), { color: COL.deferent, kind: 'name', dx: -5, dy: 5 });
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

		s.star(starPoint, { color: COL.planet, size: STAR_SIZE_CHOSEN, ring: true });
		s.labelAway(this.starName, starPoint, { x: s.cx, y: s.cy }, COL.planet);
	}
};

/* ==========================================================================
   4. FIGURE 4: THE NUTATION ERROR
   A static figure: no controls. Each day of 2026, the reference Sun's
   apparent (lambda, beta) is turned into (alpha, delta) with the MEAN
   obliquity of date, and compared with the reference Sun's own
   (alpha, delta), computed with the TRUE obliquity (mean + nutation).
   The same (lambda, beta) on both sides, so the difference is the
   nutation in obliquity alone. Fixed scale: every value lies within
   9.14" (tools/numbers/1.2-frames.js).
   ========================================================================== */

const NUTATION_YEAR = 2026;
const NUTATION_Y_RANGE = [-12, 12]; // arcseconds

/* x ticks at the first of every other month (day of the year 2026). */
const MONTH_TICKS = [
	[0, 'Jan'],
	[59, 'Mar'],
	[120, 'May'],
	[181, 'Jul'],
	[243, 'Sep'],
	[304, 'Nov'],
	[365, '']
];

/* The errors of each day of the year (arcseconds). */
function nutationErrors(year) {
	const start = Time.julianDay(year, 1, 1);
	const days = [];

	for (let day = 0; day <= 365; day++) {
		const jd = start + day;
		const position = Ephem.sun(jd);
		const real = Ephem.equatorial(position, jd);
		const model = Frames.eclipticToEquatorial(position.lon, position.lat, Ephem.meanObliquity(jd));

		days.push({
			day: day,
			deps: Ephem.nutation(jd).deps * 3600,
			dDec: (model.dec - real.dec) * 3600,
			dRA: norm180(model.ra - real.ra) * 3600
		});
	}

	return days;
}

const nutationFigure = {
	plot: null,
	days: null,

	init() {
		this.days = nutationErrors(NUTATION_YEAR);
		this.plot = new Plot2D(byId('nutation-plot'), {
			x: [0, 365],
			y: NUTATION_Y_RANGE,
			xLabel: `date (${NUTATION_YEAR})`,
			yLabel: 'model − real (arcsec)',
			aspect: 0.45,
			xTicks: () => MONTH_TICKS.map(([value, label]) => ({ value, label })),
			onDraw: () => this.draw()
		});
		this.plot.redraw();
	},

	draw() {
		const p = this.plot;
		const xs = this.days.map(d => d.day);
		const envelope = { color: COL.muted, width: 1.5, dash: [5, 4] };

		p.frame();
		p.hline(0, { color: COL.ink, width: 1 });
		p.curve(
			xs,
			this.days.map(d => d.deps),
			envelope
		);
		p.curve(
			xs,
			this.days.map(d => -d.deps),
			envelope
		);
		p.curve(
			xs,
			this.days.map(d => d.dDec),
			{ color: COL.planet, width: 2.5 }
		);
		p.curve(
			xs,
			this.days.map(d => d.dRA),
			{ color: COL.epicycle, width: 2.5 }
		);
	}
};

/* ==========================================================================
   5. PAGE START
   Shared components first (they typeset the prose), then the figures.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
	Site.initPage();
	zodiacFigure.init();
	eclipticFigure.init();
	horizonFigure.init();
	nutationFigure.init();
});
