// @ts-check
/* ==========================================================================
   PAGE 1.2 · FRAMES - SCRIPT (page.js)
   Six figures, each with its own init and draw (and update when it has
   controls):
	 1. the zodiac around Taurus  (a blue plate: a static chart of the stars)
	 2. ecliptic and equator      (3D, equatorial frame: the stars never move;
								   the date moves the Sun along the ecliptic)
	 3. equator and horizon       (3D, horizon frame: latitude and the turn
								   of the sky move the sky, never the ground;
								   the arcs theta, alpha and H of a star, or
								   the ecliptic and its angle to the horizon)
	 4. the triangle P, Z, star   (3D, static: the horizon frame at the
								   observation of section 1)
	 5. the noon Sun              (2D, static: its altitude at Alexandria
								   through 2025, for the fit)
	 6. the nutation error        (2D, static: mean against true obliquity
								   over 2026)
   Shared code: common.js, time.js, ephemeris.js, stars.js, models/diurnal.js,
   models/frames.js, plate-stars.js, plate.js, sphere3d.js, plot2d.js,
   components.js.
   Every number quoted in the prose comes from tools/numbers/1.2-frames.js.

   TABLE OF CONTENTS
	 0. Helpers shared by the figures
	 1. Figure 1: the zodiac around Taurus
	 2. Figure 2: ecliptic and equator
	 3. Figure 3: equator and horizon
	 4. Figure 4: the triangle pole, zenith, star
	 5. Figure 5: the noon Sun through the year
	 6. Figure 6: the nutation error
	 7. Page start
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

/* x ticks at the first of every other month (day of the year; 2025 and
   2026 are both common years). */
const MONTH_TICKS = [
	[0, 'Jan'],
	[59, 'Mar'],
	[120, 'May'],
	[181, 'Jul'],
	[243, 'Sep'],
	[304, 'Nov'],
	[365, '']
];

/* Text of an angle with two decimals: "−5.47°". */
const formatDegrees = value => `${value.toFixed(2).replace('-', '−')}°`;

/* An angle in TeX: "-5.47^\circ" (never "-0.00", fixed in common.js). */
const texDegrees = (value, digits = 2) => `${fixed(value, digits)}^\\circ`;

/* An angle that lives in [0°, 360°) in TeX: a value that rounds up to
   360 is written 0 (fixedAngle in common.js). */
const texAngle360 = (value, digits = 2) => `${fixedAngle(value, digits)}^\\circ`;

/* A right ascension in hours and minutes, for TeX: "4^\text{h}37^\text{m}". */
function texHours(ra) {
	const { whole, rest } = splitWithCarry(norm360(ra) / 15, 60);

	return `${whole % 24}^\\text{h}${pad2(rest)}^\\text{m}`;
}

/* An angle in degrees, minutes and seconds, for TeX: "20^\circ 30' 09''". */
function texDms(value) {
	const sign = value < 0 ? '-' : '';
	const { h, m, s } = splitHms(Math.abs(value));

	return `${sign}${h}^\\circ ${pad2(m)}' ${pad2(s)}''`;
}

/* A unit vector in TeX, with four decimals. */
function texVector(name, v) {
	return `${name} = (${v.map(x => fixed(x, 4)).join(',\\ ')})`;
}

/* The name of a chosen star is written on its right, this far from it
   (px), with its baseline this far below the star, or this far above it
   for a star whose own arcs leave towards the lower right. It keeps its
   place beside the star whatever moves (CLAUDE.md, "A label never
   jumps"). */
const STAR_NAME_GAP = 12;
const STAR_NAME_DROP = 5;
const STAR_NAME_RAISE = 8;

/* The symbol of an arc is centred this far from the arc (px), and this far
   below its own middle (half the height of a symbol at the label font). */
const ARC_NAME_GAP = 13;
const SYMBOL_HALF_HEIGHT = 5;

/* An arc shorter than this (deg) gets no arrowhead: the head would be
   longer than the arc. */
const ARROW_MIN_SWEEP = 3;

/* A symbol centred 'distance' px from a point of the sphere, on the screen
   side that faces the 3D point 'toward' (a negative distance: on the
   opposite side). The place follows the point smoothly, so the symbol
   never jumps round it. With 'always', it is not faded on the far side of
   the sphere. */
function labelBeside(sphere, text, point, toward, distance, color, always = false) {
	const q = sphere.project(point);
	const t = sphere.project(toward);
	const length = Math.hypot(t.x - q.x, t.y - q.y) || 1;

	sphere.ctx.font = labelFont(text);

	const width = sphere.ctx.measureText(text).width;

	sphere.label(text, point, {
		color: color,
		always: always,
		dx: (distance * (t.x - q.x)) / length - width / 2,
		dy: (distance * (t.y - q.y)) / length + SYMBOL_HALF_HEIGHT
	});
}

/* Where the symbol of an arc is written, as an angle along it: near its
   start while the arc is short, further along as it grows, and at its end
   when it closes. 'full' is the sweep of the closed arc: 360 for an angle
   counted from 0° to 360°, 180 for one counted from -180° to 180°. The end
   of a closed arc is the start of an empty one, so the symbol does not jump
   when the angle wraps (CLAUDE.md, "A label never jumps"). */
function arcNameAngle(sweep, full) {
	return (sweep * Math.abs(sweep)) / full;
}

/* An arc that ends in an arrowhead, which shows which way its angle is
   counted. pointAt(t) is the 3D point at the angle t along the arc, from
   0 to 'sweep' (deg, either sign). */
function drawArrowArc(sphere, pointAt, sweep, style) {
	const steps = Math.max(2, Math.ceil(Math.abs(sweep) / 2));
	const points = [];

	for (let i = 0; i <= steps; i++) {
		points.push(pointAt((sweep * i) / steps));
	}

	sphere.path(points, style);

	if (Math.abs(sweep) >= ARROW_MIN_SWEEP) {
		sphere.arrow(points[steps - 1], points[steps], style);
	}
}

/* The four-pointed star of a chosen star, with its name on its right:
   level with the star, or raised above it when 'raised' is true. */
function drawNamedStar(sphere, name, point, color, raised = false) {
	sphere.star(point, { color: color, size: STAR_SIZE_CHOSEN, ring: true });
	sphere.label(name, point, {
		color: color,
		kind: 'name',
		dx: STAR_NAME_GAP,
		dy: raised ? -STAR_NAME_RAISE : STAR_NAME_DROP
	});
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
			keep: ['alf Tau'], // Aldebaran, the star of the caption, stays on a phone
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
   rotation does not appear, since the frame turns with the sky. The two
   coordinate paths drawn are those of the chosen object: the Sun, or one
   of three stars.
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

/* The obliquity is marked between the two poles, P and K, at these
   distances from the centre (the arc, and its symbol). */
const OBLIQUITY_ARC_RADIUS = 0.62;
const OBLIQUITY_NAME_RADIUS = 0.74;

/* The symbol of a longitude is written this far behind the end of its arc
   (deg), where the arc is on the near side whenever its object is. */
const LONGITUDE_NAME_BEHIND = 14;

/* The symbols of the two longitudes sit on opposite sides of their
   circles, each on the side away from the other circle. The side changes
   where the circles cross, over this many degrees of ecliptic longitude,
   so that a symbol glides across its arc there. */
const SIDE_CHANGE_DEGREES = 8;

/* Opacity of the stars that are not chosen (STYLE.md §5). */
const BACKGROUND_STAR_ALPHA = 0.55;

/* Day of the year (slider value) -> "21 May". */
function formatDay(day) {
	const date = Time.calendarDate(SUN_YEAR_START + Math.floor(day));

	return `${Math.floor(date.day)} ${Time.MONTH_NAMES[date.month - 1]}`;
}

/* Where the symbol of a longitude is written, as an angle along its arc:
   a little behind the end, and at the origin when the arc is empty or
   closed, so that it does not jump when the longitude wraps. */
function longitudeNameAngle(lon) {
	return lon - Math.min(LONGITUDE_NAME_BEHIND, lon / 2, 360 - lon);
}

/* A coordinate path in a frame: along the fundamental circle from the
   origin to the foot of the point (longitude), then up to the point
   (latitude). axes = [x, y, z] of the frame in the drawing's components.
   names = [longitude, latitude]; a latitude without a name gets no symbol
   (the Sun's ecliptic latitude, which is zero). lonSide is the distance
   (px) of the longitude's symbol from the circle, positive towards the
   frame's pole. The latitude's symbol is on the eastern side of its arc. */
function drawFramePath(sphere, axes, lon, lat, names, color, lonSide) {
	const [x, y, z] = axes;
	const foot = arcPoint(x, y, lon);
	const east = arcPoint(x, y, lon + 90);
	const lonName = arcPoint(x, y, longitudeNameAngle(lon));
	const latName = arcPoint(foot, z, lat / 2);

	sphere.arc(x, y, lon, { color: color, width: 3 });
	sphere.arc(foot, z, lat, { color: color, width: 3, dash: [6, 4] });
	sphere.point(foot, { color: color, radius: 3 });
	labelBeside(sphere, names[0], lonName, add3(lonName, scale(z, 0.2)), lonSide, color);

	if (names[1]) {
		labelBeside(sphere, names[1], latName, add3(latName, scale(east, 0.2)), ARC_NAME_GAP, color);
	}
}

/* The objects whose coordinates the figure can show: the Sun first, then
   the star of section 1, a star well north of both circles and one next
   to the pole. The arcs of Polaris leave it towards the lower right, so
   its name is raised above them. */
const ECLIPTIC_STARS = ['Aldebaran', 'Capella', 'Polaris'];
const ECLIPTIC_CHOICES = ['Sun', ...ECLIPTIC_STARS];
const RAISED_NAMES = ['Polaris'];

const eclipticFigure = {
	sphere: null,
	chosen: 'Sun',
	stars: null,
	state: null,

	init() {
		const figure = byId('ecl-canvas').closest('figure');

		// the vernal point at the front left; Aldebaran far enough from the
		// right edge for its name to fit beside it on a phone
		this.sphere = new Sphere3D(byId('ecl-canvas'), {
			yaw: 230,
			pitch: 20,
			onDraw: () => this.draw()
		});

		// the stars of 2026.0, as equatorial vectors: they never move
		this.stars = Stars.LIST.map(star => {
			const eq = Stars.ofDate(star, STAR_EPOCH);

			return { name: star.name, mag: star.mag, vector: fromLonLat(eq.ra, eq.dec) };
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
			sEq = this.stars.find(star => star.name === this.chosen).vector;
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
			`\\alpha = ${texAngle360(eq.lon)}\\ (${texHours(eq.lon)}),\\quad \\delta = ${texDegrees(eq.lat)}`,
			`\\lambda = ${texAngle360(ecl.lon)},\\quad \\beta = ${texDegrees(ecl.lat)}`,
			texVector('\\mathbf s_\\text{eq}', sEq),
			texVector('\\mathbf s_\\text{ecl}', sEcl)
		]);
	},

	draw() {
		if (!this.state) {
			return; // a resize can ask for a drawing before the first update
		}

		const s = this.sphere;
		const { eclipticAxes } = this.state;
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

		this.drawObliquity();
		this.drawStars();
		this.drawPaths();
		this.drawSun();
	},

	/* The obliquity: the angle between the two poles, from P to K (K is
	   at right ascension 270°, so the arc goes from z towards -y). */
	drawObliquity() {
		const s = this.sphere;
		const name = arcPoint([0, 0, 1], [0, -1, 0], EPS_TODAY / 2, OBLIQUITY_NAME_RADIUS);

		s.arc([0, 0, 1], [0, -1, 0], EPS_TODAY, { color: COL.ink, width: 1.5 }, OBLIQUITY_ARC_RADIUS);
		labelBeside(s, 'ε', name, name, 0, COL.ink);
	},

	/* The fixed stars, sized by magnitude; the ones the reader can choose
	   are named, and the chosen one is in the colour of the object of
	   interest. */
	drawStars() {
		const s = this.sphere;

		this.stars.forEach(star => {
			if (!ECLIPTIC_STARS.includes(star.name)) {
				s.star(star.vector, { color: COL.ink, size: starSize(star.mag), alpha: BACKGROUND_STAR_ALPHA });
			}
		});

		this.stars.forEach(star => {
			if (ECLIPTIC_STARS.includes(star.name)) {
				const color = star.name === this.chosen ? COL.planet : COL.ink;

				drawNamedStar(s, star.name, star.vector, color, RAISED_NAMES.includes(star.name));
			}
		});
	},

	/* The chosen object's two sets of coordinates. Where the ecliptic is
	   north of the equator (ecliptic longitude 0° to 180°) the symbol of
	   lambda is on the northern side of the ecliptic and that of alpha on
	   the southern side of the equator; elsewhere the other way round. */
	drawPaths() {
		const s = this.sphere;
		const { eq, ecl, eclipticAxes } = this.state;
		const equatorAxes = [
			[1, 0, 0],
			[0, 1, 0],
			[0, 0, 1]
		];
		const side = ARC_NAME_GAP * clamp(sin(ecl.lon) / sin(SIDE_CHANGE_DEGREES / 2), -1, 1);
		const latitudeName = this.chosen === 'Sun' ? null : 'β';

		drawFramePath(s, equatorAxes, norm360(eq.lon), eq.lat, ['α', 'δ'], COL.earth, -side);
		drawFramePath(s, eclipticAxes, norm360(ecl.lon), ecl.lat, ['λ', latitudeName], COL.sun, side);
	},

	/* The Sun on the ecliptic, with an arrow along its yearly motion
	   (eastward, towards greater ecliptic longitude). It has no name in
	   the figure: the key and the read-out say what it is. */
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
	}
};

/* ==========================================================================
   3. FIGURE 3: EQUATOR AND HORIZON
   Drawn in the horizon frame, as Figure 2 of page 1.1: the ground never
   moves, and the latitude and the turn of the sky move the equator and
   what it carries. The reader chooses what the sky carries (buildChoice):
	 - a star: its hour angle H = theta - alpha as three arcs, H on the
	   equator, alpha and theta beside it, then its azimuth and altitude;
	 - the ecliptic: its pole K and its angle I to the horizon (exercise 3).
   The arc theta, from the meridian to the vernal point, is drawn in both.
   Everything is computed in equatorial coordinates and carried into the
   horizon frame by fromEq.
   ========================================================================== */

/* The observation of section 1: Aldebaran from Rome, 1 January 2026,
   19:00 UT (tools/numbers/1.2-frames.js). */
const OBSERVATION = { star: 'Aldebaran', phi: PLACES.rome.lat, theta: 38.94 };

/* Degrees of turn per second when playing (one turn in 24 s). */
const PLAY_DEGREES_PER_SECOND = 15;

/* What the sky can carry: a star (the star of section 1, a southern star
   or one next to the pole), or the ecliptic. */
const ECLIPTIC_SUBJECT = 'the ecliptic';
const HORIZON_SUBJECTS = ['Aldebaran', 'Sirius', 'Polaris', ECLIPTIC_SUBJECT];

/* theta, alpha and H are three arcs of the equator, which would cover one
   another. H is drawn on the equator, alpha and theta on the parallels of
   these declinations (deg), just south of it, with ticks down from the
   points of the equator where they begin and end. */
const TRACK_DEC = { alpha: -8, theta: -16 };

/* The symbol of the azimuth is written inside the horizon circle, at this
   fraction of its radius, clear of N, E, S and W. */
const AZIMUTH_NAME_RADIUS = 0.86;

/* The arcs of the declination and the altitude meet at the star, and lie
   on top of each other when the star is on the meridian. Their symbols
   are on the outer sides of the two arcs, and change sides as the star
   crosses the meridian, over this many degrees of hour angle, so that
   they glide across their arcs there. */
const MERIDIAN_SIDE_CHANGE_DEGREES = 16;

const horizonFigure = {
	sphere: null,
	subject: OBSERVATION.star,
	state: null,

	init() {
		const figure = byId('hor-canvas').closest('figure');

		this.sphere = new Sphere3D(byId('hor-canvas'), {
			yaw: 240,
			pitch: 20,
			onDraw: () => this.draw()
		});

		wireSlider(byId('hor-lat'), () => this.update(), formatAngle);
		wireSlider(byId('hor-theta'), () => this.update(), formatAngle);
		wirePresets(figure);
		this.player = wirePlayButton(byId('hor-play'), byId('hor-theta'), PLAY_DEGREES_PER_SECOND);

		buildChoice(byId('hor-subjects'), HORIZON_SUBJECTS, this.subject, name => {
			this.subject = name;
			this.update();
		});

		byId('hor-observation').addEventListener('click', () => this.showObservation());
		this.update();
	},

	/* Back to the observation of section 1. */
	showObservation() {
		this.player.pause();
		this.subject = OBSERVATION.star;
		const buttons = [...byId('hor-subjects').querySelectorAll('button')];

		markChosen(
			buttons,
			buttons.find(button => button.textContent === OBSERVATION.star)
		);
		byId('hor-lat').value = OBSERVATION.phi;
		byId('hor-theta').value = OBSERVATION.theta;
		byId('hor-lat').dispatchEvent(new Event('input'));
		byId('hor-theta').dispatchEvent(new Event('input'));
	},

	update() {
		const phi = readNumber('hor-lat');
		const theta = readNumber('hor-theta');
		const matrix = Frames.equatorialToHorizonMatrix(phi, theta);
		const showsEcliptic = this.subject === ECLIPTIC_SUBJECT;

		this.state = {
			phi: phi,
			theta: theta,
			showsEcliptic: showsEcliptic,
			// the map from the equatorial frame into the frame of the drawing
			fromEq: v => matApply(matrix, v),
			poleAltitude: Frames.eclipticPoleAltitude(EPS_TODAY, phi, theta),
			angle: Frames.eclipticHorizonAngle(EPS_TODAY, phi, theta)
		};

		if (!showsEcliptic) {
			const eq = Stars.ofDateByName(this.subject, STAR_EPOCH);

			this.state.eq = eq;
			this.state.hor = Frames.equatorialToHorizontal(eq.ra, eq.dec, phi, theta);
		}

		this.showReadout();
		this.sphere.redraw();
	},

	/* Three lines for a star, three for the ecliptic. */
	showReadout() {
		const { showsEcliptic, eq, hor, poleAltitude, angle } = this.state;

		if (showsEcliptic) {
			showLines('hor-readout', [
				`\\text{K:}\\ \\alpha = 270^\\circ,\\quad \\delta = ${texDegrees(90 - EPS_TODAY)}`,
				`a_\\text{K} = ${texDegrees(poleAltitude, 1)}`,
				`I = 90^\\circ - |a_\\text{K}| = ${texDegrees(angle, 1)}`
			]);

			return;
		}

		showLines('hor-readout', [
			`\\text{${this.subject}:}\\ \\alpha = ${texAngle360(eq.ra)},\\quad \\delta = ${texDegrees(eq.dec)}`,
			`H = \\theta - \\alpha = ${texDegrees(hor.H)}`,
			`A = ${texAngle360(hor.A)},\\quad a = ${texDegrees(hor.a)}`
		]);
	},

	draw() {
		if (!this.state) {
			return;
		}

		const s = this.sphere;

		s.outline();
		s.ground();
		this.drawSky();

		if (this.state.showsEcliptic) {
			this.drawEcliptic();
		} else {
			this.drawStar();
		}
	},

	/* A point of the sky by its hour angle (westward from the meridian)
	   and declination, in the frame of the drawing. */
	hourPoint(H, dec) {
		const { theta, fromEq } = this.state;

		return fromEq(fromLonLat(theta - H, dec));
	},

	/* A tick from a point of the equator down to a parallel beside it. */
	drawTick(H, dec) {
		this.sphere.path([this.hourPoint(H, 0), this.hourPoint(H, dec)], { color: COL.muted, width: 1 });
	},

	/* The sky: the equator and its pole, the vernal point, and the turn
	   theta, from the meridian westward to the vernal point. */
	drawSky() {
		const s = this.sphere;
		const { theta, fromEq } = this.state;
		const gamma = fromEq([1, 0, 0]);
		const nameAt = arcNameAngle(theta, 360);
		const name = this.hourPoint(nameAt, TRACK_DEC.theta);

		s.circle(gamma, fromEq([0, 1, 0]), { color: COL.earth, width: 2 });
		s.axis(fromEq([0, 0, AXIS_LENGTH]), 'P', { color: COL.earth, labelColor: COL.earth });

		this.drawTick(0, TRACK_DEC.theta);
		this.drawTick(theta, TRACK_DEC.theta);
		drawArrowArc(s, H => this.hourPoint(H, TRACK_DEC.theta), theta, { color: COL.epicycle, width: 2.5 });
		labelBeside(s, 'θ', name, this.hourPoint(nameAt, TRACK_DEC.theta - 10), ARC_NAME_GAP, COL.epicycle);

		s.point(this.hourPoint(0, 0), { color: COL.earth, radius: 3.5 });
		s.point(gamma, { color: COL.ink, radius: 4 });
		labelBeside(s, 'γ', gamma, fromEq(fromLonLat(0, 10)), ARC_NAME_GAP, COL.ink);
	},

	/* The star and its coordinates: alpha eastward from the vernal point,
	   H westward from the meridian and the declination up to the star;
	   then the azimuth from the north point through east, and the
	   altitude. */
	drawStar() {
		const s = this.sphere;
		const { eq, hor, fromEq } = this.state;
		const star = fromEq(fromLonLat(eq.ra, eq.dec));
		const raPoint = (ra, dec) => fromEq(fromLonLat(ra, dec));
		const azimuthPoint = (A, radius = 1) => arcPoint([-1, 0, 0], [0, 1, 0], A, radius);
		const horizonFoot = azimuthPoint(hor.A);
		const nameH = arcNameAngle(hor.H, 180);
		const nameDec = this.hourPoint(hor.H, eq.dec / 2);
		const nameAlt = arcPoint(horizonFoot, [0, 0, 1], hor.a / 2);
		// +1 west of the meridian, -1 east of it, in between near it
		const westward = clamp(sin(hor.H) / sin(MERIDIAN_SIDE_CHANGE_DEGREES / 2), -1, 1);
		// a northern star's declination arc is on the meridian's side of
		// its altitude arc; a southern star's is the other way round
		const decSide = ARC_NAME_GAP * westward * (eq.dec >= 0 ? 1 : -1);

		// alpha, beside the equator
		this.drawTick(hor.H, TRACK_DEC.alpha);
		drawArrowArc(s, ra => raPoint(ra, TRACK_DEC.alpha), eq.ra, { color: COL.earth, width: 2.5 });
		labelBeside(
			s,
			'α',
			raPoint(eq.ra / 2, TRACK_DEC.alpha),
			raPoint(eq.ra / 2, TRACK_DEC.alpha - 10),
			ARC_NAME_GAP,
			COL.earth
		);

		// H on the equator, then the declination
		drawArrowArc(s, H => this.hourPoint(H, 0), hor.H, { color: COL.earth, width: 3 });
		s.arc(this.hourPoint(hor.H, 0), fromEq([0, 0, 1]), eq.dec, { color: COL.earth, width: 3, dash: [6, 4] });
		s.point(this.hourPoint(hor.H, 0), { color: COL.earth, radius: 3 });
		labelBeside(s, 'H', this.hourPoint(nameH, 0), this.hourPoint(nameH, 10), ARC_NAME_GAP, COL.earth);
		labelBeside(s, 'δ', nameDec, this.hourPoint(hor.H - 10, eq.dec / 2), decSide, COL.earth);

		// the azimuth along the horizon, then the altitude
		drawArrowArc(s, A => azimuthPoint(A), hor.A, { color: COL.deferent, width: 3 });
		s.arc(horizonFoot, [0, 0, 1], hor.a, { color: COL.deferent, width: 3, dash: [6, 4] });
		s.point(horizonFoot, { color: COL.deferent, radius: 3 });
		s.label('A', azimuthPoint(arcNameAngle(hor.A, 360), AZIMUTH_NAME_RADIUS), {
			color: COL.deferent,
			dx: -6,
			dy: SYMBOL_HALF_HEIGHT
		});
		labelBeside(
			s,
			'a',
			nameAlt,
			add3(nameAlt, scale(azimuthPoint(hor.A + 90), 0.2)),
			ARC_NAME_GAP * westward,
			COL.deferent
		);

		drawNamedStar(s, this.subject, star, COL.planet);
	},

	/* The ecliptic, its pole K, and the angle I between the ecliptic and
	   the horizon: the arc from the zenith to the pole of the ecliptic
	   that is above the horizon (K, or the opposite pole when K is below). */
	drawEcliptic() {
		const s = this.sphere;
		const { fromEq, poleAltitude, angle } = this.state;
		const K = fromEq(Frames.eclipticPole(EPS_TODAY));
		const upperPole = poleAltitude >= 0 ? K : negate(K);
		const flat = [upperPole[0], upperPole[1], 0];

		s.circle(fromEq([1, 0, 0]), fromEq([0, cos(EPS_TODAY), sin(EPS_TODAY)]), { color: COL.sun, width: 2 });
		s.axis(scale(K, AXIS_LENGTH), 'K', { color: COL.sun, labelColor: COL.sun });

		// the pole exactly at the zenith: no arc to draw
		if (length3(flat) < 1e-9) {
			return;
		}

		// the symbol at the middle of the arc, and drawn back to the zenith
		// as I nears 90°, where the arc passes from one pole to the other:
		// there the symbol does not jump
		const towardsPole = normalize3(flat);
		const nameAt = (angle / 2) * (1 - Math.pow(angle / 90, 6));
		const name = arcPoint([0, 0, 1], towardsPole, nameAt);

		s.arc([0, 0, 1], towardsPole, angle, { color: COL.sun, width: 3 });
		labelBeside(s, 'I', name, add3(name, [0, 0, 0.2]), ARC_NAME_GAP, COL.sun);
	}
};

/* ==========================================================================
   4. FIGURE 4: THE TRIANGLE POLE, ZENITH, STAR
   A static figure: no controls. The horizon frame at the observation of
   section 1 (Aldebaran from Rome), with the spherical triangle whose
   corners are the pole P, the zenith Z and the star S. Its sides are the
   complements of the geographic latitude, the declination and the
   altitude; its angle at P is the hour angle.
   ========================================================================== */

/* The sides of the triangle are drawn with this many segments. */
const TRIANGLE_SIDE_STEPS = 30;

/* The hour angle is marked by a small arc between the two sides that
   leave P, this far from P (deg), and named this much further on. */
const HOUR_ANGLE_MARK = 13;
const HOUR_ANGLE_NAME = 22;

/* The names of the corners P and S are this far from them (px), on the
   side away from the triangle. */
const CORNER_NAME_GAP = 18;

/* The great-circle arc from the unit vector a to the unit vector b, as a
   list of points. */
function greatArc(a, b, steps = TRIANGLE_SIDE_STEPS) {
	const angle = acos(clamp(dot3(a, b), -1, 1));
	const across = normalize3(sub3(b, scale(a, dot3(a, b))));
	const points = [];

	for (let i = 0; i <= steps; i++) {
		points.push(arcPoint(a, across, (angle * i) / steps));
	}

	return points;
}

/* The point at 'degrees' from the unit vector a along the great circle
   towards the unit vector b. */
function alongGreatArc(a, b, degrees) {
	const across = normalize3(sub3(b, scale(a, dot3(a, b))));

	return arcPoint(a, across, degrees);
}

const triangleFigure = {
	sphere: null,
	corners: null,

	init() {
		const eq = Stars.ofDateByName(OBSERVATION.star, STAR_EPOCH);
		const matrix = Frames.equatorialToHorizonMatrix(OBSERVATION.phi, OBSERVATION.theta);

		this.corners = {
			P: matApply(matrix, [0, 0, 1]),
			Z: [0, 0, 1],
			S: matApply(matrix, fromLonLat(eq.ra, eq.dec))
		};

		// seen from the east and from high up, so that the triangle, which
		// lies round the zenith, faces the reader
		this.sphere = new Sphere3D(byId('triangle-canvas'), {
			yaw: 200,
			pitch: 62,
			onDraw: () => this.draw()
		});
		this.sphere.redraw();
	},

	draw() {
		const s = this.sphere;
		const { P, Z, S } = this.corners;
		const sidePZ = greatArc(P, Z);
		const sidePS = greatArc(P, S);
		const sideZS = greatArc(Z, S);
		const middle = normalize3(add3(add3(P, Z), S));
		const middleOf = points => points[Math.floor(points.length / 2)];

		s.outline();
		s.ground();

		// the triangle, lightly shaded, and its three sides: along the
		// meridian, along the star's hour circle, along its vertical circle
		s.fill([...sidePZ, ...sideZS, ...sidePS.slice().reverse()], { color: COL.muted, alpha: 0.16 });
		s.path(sidePZ, { color: COL.ink, width: 3 });
		s.path(sidePS, { color: COL.earth, width: 3 });
		s.path(sideZS, { color: COL.deferent, width: 3 });

		// the hour angle, between the two sides that leave P
		s.path(greatArc(alongGreatArc(P, Z, HOUR_ANGLE_MARK), alongGreatArc(P, S, HOUR_ANGLE_MARK), 8), {
			color: COL.ink,
			width: 1.5
		});
		labelBeside(s, 'H', alongGreatArc(P, middle, HOUR_ANGLE_NAME), middle, 0, COL.ink);

		// the corners (Z is named by the ground)
		// P is just on the far side in this view: drawn at full strength
		s.point(P, { color: COL.earth, radius: 4, always: true });
		labelBeside(s, 'P', P, middle, -CORNER_NAME_GAP, COL.earth, true);
		s.star(S, { color: COL.planet, size: STAR_SIZE_CHOSEN, ring: true });
		labelBeside(s, 'S', S, middle, -CORNER_NAME_GAP, COL.planet);

		// each side is named on its outer side, away from the triangle
		s.labelAway('90° − φ', middleOf(sidePZ), middle, COL.ink);
		s.labelAway('90° − δ', middleOf(sidePS), middle, COL.earth);
		s.labelAway('90° − a', middleOf(sideZS), middle, COL.deferent);
	}
};

/* ==========================================================================
   5. FIGURE 5: THE NOON SUN THROUGH THE YEAR
   A static figure: no controls. The altitude of the reference Sun at noon
   at Alexandria on each day of 2025, as seen (with refraction). The
   highest and the lowest value are the obliquity above and below the
   altitude of the equator, 90° - phi, and the curve crosses that altitude
   at the equinoxes. Fixed scale: every value lies between 35.39° and
   82.24° (tools/numbers/1.2-frames.js).
   ========================================================================== */

/* Alexandria, where Ptolemy observed (deg; longitude positive east), as in
   tools/numbers/1.2-frames.js. */
const ALEXANDRIA = { lat: 31.2, lon: 29.9 };

const NOON_YEAR = 2025; // the last whole year before today (STRUCTURE.md §5)
const NOON_Y_RANGE = [25, 95]; // degrees

/* The altitude of the equator is named under its line on this day of the
   year, below the hump of the curve, where there is room on a phone too.
   The lower mark of the obliquity is drawn this many days before the
   December solstice, so that it does not sit on the edge of the plot. */
const NOON_EQUATOR_NAME_DAY = 172;
const NOON_LOWER_MARK_BEFORE = 9;

/* The seen altitude (deg) of the Sun at noon on each day of a year at a
   place: the declination of the reference Sun when it crosses the
   meridian of the place, raised by refraction. */
function noonAltitudes(year, place) {
	const start = Time.julianDay(year, 1, 1);
	const days = [];

	for (let day = 0; day <= 365; day++) {
		const jdTT = Time.ttFromUt(start + day + 0.5 - place.lon / 360);
		const dec = Ephem.equatorial(Ephem.sun(jdTT), jdTT).dec;
		const altitude = Diurnal.upperCulmination(dec, place.lat);

		days.push({ day: day, altitude: altitude + Ephem.refraction(altitude) });
	}

	return days;
}

/* The day of the year, with its fraction, on which the noon altitudes
   first rise through 'level' (deg): between two noons the altitude is
   taken to change evenly. */
function risesThrough(days, level) {
	const after = days.findIndex((d, i) => i > 0 && days[i - 1].altitude < level && d.altitude >= level);
	const before = days[after - 1];

	return before.day + (level - before.altitude) / (days[after].altitude - before.altitude);
}

const noonFigure = {
	plot: null,
	days: null,

	init() {
		this.days = noonAltitudes(NOON_YEAR, ALEXANDRIA);
		this.plot = new Plot2D(byId('noon-plot'), {
			x: [0, 365],
			y: NOON_Y_RANGE,
			xLabel: `date (${NOON_YEAR})`,
			yLabel: 'altitude of the Sun at noon (°)',
			aspect: 0.5,
			xTicks: () => MONTH_TICKS.map(([value, label]) => ({ value, label })),
			onDraw: () => this.draw()
		});
		this.plot.redraw();
	},

	draw() {
		const p = this.plot;
		const equator = 90 - ALEXANDRIA.lat;
		const highest = this.days.reduce((best, d) => (d.altitude > best.altitude ? d : best));
		const lowest = this.days.reduce((best, d) => (d.altitude < best.altitude ? d : best));
		const lowerMarkDay = lowest.day - NOON_LOWER_MARK_BEFORE;
		const mark = { color: COL.ink, width: 1.5 };

		p.frame();
		p.hline(equator, { color: COL.muted, width: 1.5, dash: [5, 4] });
		p.curve(
			this.days.map(d => d.day),
			this.days.map(d => d.altitude),
			{ color: COL.sun, width: 2.5 }
		);

		// the obliquity, twice: from the equator's altitude up to the
		// highest noon Sun, and down to the lowest
		p.curve([highest.day, highest.day], [equator, highest.altitude], mark);
		p.curve([lowerMarkDay, lowerMarkDay], [lowest.altitude, equator], mark);
		p.text('ε', highest.day, (equator + highest.altitude) / 2, {
			color: COL.ink,
			baseline: 'middle',
			dx: 8,
			dy: 0
		});
		p.text('ε', lowerMarkDay, (equator + lowest.altitude) / 2, {
			color: COL.ink,
			align: 'right',
			baseline: 'middle',
			dx: -8,
			dy: 0
		});

		p.text('90° − φ', NOON_EQUATOR_NAME_DAY, equator, {
			color: COL.muted,
			kind: 'symbol',
			align: 'center',
			baseline: 'top',
			dx: 0,
			dy: 6
		});

		// the March equinox: where the curve rises through the equator's altitude
		p.marker(risesThrough(this.days, equator), equator, { color: COL.sun, radius: 5 });
	}
};

/* ==========================================================================
   6. FIGURE 6: THE NUTATION ERROR
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

/* The name of each curve: the day of the year it is written at, the
   curve's value there, and whether it goes above or below the curve, this
   many px away. The days are chosen where the four curves are far apart,
   on a phone too; the two dashed lines are named on their inner side,
   where there is room at any width. */
const NUTATION_NAME_GAP = 6;
const NUTATION_NAMES = [
	{ text: 'Δδ', day: 40, value: d => d.dDec, above: false, align: 'right', color: COL.planet },
	{ text: 'Δα', day: 135, value: d => d.dRA, above: true, align: 'center', color: COL.epicycle },
	{ text: '+Δε', day: 275, value: d => d.deps, above: false, align: 'center', color: COL.muted },
	{ text: '−Δε', day: 275, value: d => -d.deps, above: true, align: 'center', color: COL.muted }
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
		this.drawNames();
	},

	/* Each curve is named beside it, in the text colour of its line, on
	   the day and the side of NUTATION_NAMES. */
	drawNames() {
		NUTATION_NAMES.forEach(({ text, day, value, above, align, color }) => {
			this.plot.text(text, day, value(this.days[day]), {
				color: color,
				kind: 'symbol',
				align: align,
				baseline: above ? 'bottom' : 'top',
				dx: 0,
				dy: above ? -NUTATION_NAME_GAP : NUTATION_NAME_GAP
			});
		});
	}
};

/* ==========================================================================
   7. PAGE START
   Shared components first (they typeset the prose), then the figures.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
	Site.initPage();
	startFigures([zodiacFigure, eclipticFigure, horizonFigure, triangleFigure, noonFigure, nutationFigure]);
});
