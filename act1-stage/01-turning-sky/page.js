/* ==========================================================================
   PAGE 1.1 · THE TURNING SKY - SCRIPT (page.js)
   Five figures, each with its own init (and update / draw when it moves):
	 1. the sky around the pole   (a blue plate: a static chart of the stars)
	 2. the observer's sky        (3D, horizon frame: the ground never moves)
	 3. the sky seen from outside (3D, equatorial frame: the stars never move)
	 4. the day of a star         (2D: altitude through a turn, and the map of
								   the three classes over latitude and declination)
	 5. the model against the sky (2D: altitude error from refraction)
   Shared code: common.js, time.js, ephemeris.js, stars.js, models/diurnal.js,
   plate-stars.js, plate.js, sphere3d.js, plot2d.js, components.js.
   Every number quoted in the prose comes from tools/numbers/1.1-turning-sky.js.

   TABLE OF CONTENTS
	 0. Helpers shared by the figures
	 1. Figure 1: the sky around the pole
	 2. Figure 2: the observer's sky
	 3. Figure 3: the sky seen from outside
	 4. Figure 4: the day of a star
	 5. Figure 5: the model against the sky
	 6. Page start
   ========================================================================== */

/* ==========================================================================
   0. HELPERS SHARED BY THE FIGURES
   ========================================================================== */

/* The time sliders run at one hour of sky per second when playing. */
const PLAY_HOURS_PER_SECOND = 1;

/* Epoch of the real sky in Figure 5 (stars carried to it). */
const TEST_EPOCH = Time.julianDay(2026, 1, 1);

/* The style of a background star (STYLE.md §5): ink at 55% opacity,
   sized by its V magnitude. */
const BACKGROUND_STAR = star => ({ color: COL.ink, alpha: 0.55, size: starSize(star.mag) });

/* Text of a declination or latitude: "−16.7°" (one decimal). */
const formatAngle = value => `${value.toFixed(1).replace('-', '−')}°`;

/* Text of a class from Diurnal.classify, for KaTeX. */
const CLASS_TEXT = {
	circumpolar: '\\text{never sets}',
	rises: '\\text{rises and sets}',
	never: '\\text{never rises}'
};

/* Split a curve of horizon-frame points into runs above and below the
   horizon, so each run can get its own style. Consecutive runs share
   their end point, so the curve stays continuous. */
function splitByHorizon(points) {
	const runs = [];
	let run = null;

	points.forEach(point => {
		const above = point[2] >= 0;

		if (!run || run.above !== above) {
			const start = run ? [run.points[run.points.length - 1]] : [];

			run = { above, points: start };
			runs.push(run);
		}

		run.points.push(point);
	});

	return runs;
}

/* A star's daily circle (declination dec) through a frame matrix. */
function dailyCircle(dec, matrix) {
	return sampleParametric(ra => matApply(matrix, fromLonLat(ra, dec)), 2);
}

/* ==========================================================================
   1. FIGURE 1: THE SKY AROUND THE POLE
   A blue plate (shared/plate.js): the stars of 2026 around the north
   celestial pole, as seen from the ground. Highlighted: the circle of
   declination 90° - 41.9°, inside which the stars never set at Rome.
   ========================================================================== */

/* Rome's latitude, as in the prose and the presets. */
const ROME_LATITUDE = 41.9;

const poleFigure = {
	init() {
		const chart = Plate.polar(byId('plate-pole'), {
			rimDec: 25,
			figures: ['URSA MAJOR', 'URSA MINOR', 'CASSIOPEIA', 'CEPHEUS', 'CYGNUS'],
			names: [
				['alf UMi', 'Polaris', 8, 4],
				['bet UMi', 'Kochab', -58, 4],
				['alf UMa', 'Dubhe', 9, 4],
				['alf Aur', 'Capella', 9, 4],
				['alf Lyr', 'Vega', 10, 4],
				['alf Cyg', 'Deneb', 9, 16]
			],
			label: 'Chart of the northern sky around the celestial pole, with a dashed circle around the stars that never set at Rome.'
		});

		Plate.highlightCircle(chart, 90 - ROME_LATITUDE);
	}
};

/* ==========================================================================
   2. FIGURE 2: THE OBSERVER'S SKY
   Drawn in the horizon frame (x south, y east, z zenith): time and latitude
   turn the sky, never the ground. Stars at their J2000 positions.
   ========================================================================== */

const HORIZON_POINTS = [
	['S', [1, 0, 0]],
	['E', [0, 1, 0]],
	['N', [-1, 0, 0]],
	['W', [0, -1, 0]]
];

const skyFigure = {
	sphere: null,
	star: Stars.find('Vega'),
	state: null,

	init() {
		const figure = byId('sky-canvas').closest('figure');

		this.sphere = new Sphere3D(byId('sky-canvas'), {
			yaw: 210,
			pitch: 18,
			onDraw: () => this.draw()
		});

		wireSlider(byId('sky-lat'), () => this.update(), formatAngle);
		wireSlider(byId('sky-time'), () => this.update(), hm);
		wirePresets(figure);
		wirePlayButton(byId('sky-play'), byId('sky-time'), PLAY_HOURS_PER_SECOND);

		buildChoice(
			byId('sky-stars'),
			['Polaris', 'Dubhe', 'Vega', 'Mintaka', 'Sirius', 'Antares', 'Canopus', 'Acrux'],
			this.star.name,
			name => {
				this.star = Stars.find(name);
				this.update();
			}
		);

		this.update();
	},

	/* Recompute the frame and the chosen star, then the read-out. */
	update() {
		const phi = readNumber('sky-lat');
		const theta = Diurnal.DEGREES_PER_HOUR * readNumber('sky-time');
		const matrix = Diurnal.equatorialToHorizon(phi, theta);

		this.state = {
			phi: phi,
			matrix: matrix,
			pole: matApply(matrix, [0, 0, 1]),
			H: Diurnal.hourAngle(theta, this.star.ra)
		};

		this.showReadout();
		this.sphere.redraw();
	},

	showReadout() {
		const { phi, H } = this.state;
		const { dec } = this.star;
		const a = Diurnal.altitude(dec, H, phi);

		showLines('sky-readout', [
			`\\text{${this.star.name}}:\\ ${CLASS_TEXT[Diurnal.classify(dec, phi)]}`,
			`\\delta = ${dec.toFixed(1)}^\\circ,\\quad H = ${H.toFixed(1)}^\\circ`,
			`a = ${a.toFixed(1)}^\\circ`,
			`a_\\text{max} = ${Diurnal.upperCulmination(dec, phi).toFixed(1)}^\\circ,\\quad ` +
				`a_\\text{min} = ${Diurnal.lowerCulmination(dec, phi).toFixed(1)}^\\circ`
		]);
	},

	draw() {
		if (!this.state) {
			return; // a resize can ask for a drawing before the first update
		}

		const s = this.sphere;
		const { matrix, pole } = this.state;
		const toSky = v => matApply(matrix, v);

		s.outline();
		this.drawGround();

		// the equator and Ptolemy's two circles
		s.circle(toSky([1, 0, 0]), toSky([0, 1, 0]), { color: COL.earth, width: 2 });
		this.drawPtolemyCircles(pole);

		// the other bright stars, sized by brightness
		Stars.LIST.forEach(star => {
			if (star !== this.star) {
				s.star(toSky(fromLonLat(star.ra, star.dec)), BACKGROUND_STAR(star));
			}
		});

		this.drawChosenStar(toSky);

		// the axis of the turn
		s.axis(scale(pole, 1.25), 'P', { color: COL.ink });
		s.axis(scale(pole, -1.25), 'P′', { color: COL.muted, labelColor: COL.muted });
	},

	/* The ground: horizon, cardinal points, zenith, meridian. */
	drawGround() {
		const s = this.sphere;

		s.fillPlane([1, 0, 0], [0, 1, 0], { color: COL.deferent, alpha: 0.14 });
		s.circle([1, 0, 0], [0, 1, 0], { color: COL.deferent, width: 2 });
		s.circle([1, 0, 0], [0, 0, 1], { color: COL.muted, width: 1, dash: [2, 4] });

		HORIZON_POINTS.forEach(([name, point]) => {
			s.label(name, scale(point, 1.09), { color: COL.deferent, kind: 'name', dx: -5, dy: 5 });
		});

		s.point([0, 0, 1], { color: COL.deferent, radius: 4 });
		s.label('Z', [0, 0, 1], { color: COL.deferent, dx: -18, dy: 4 });
	},

	/* Around the raised pole, the circle of radius |phi| holds the stars
	   that never set; around the other pole, the stars that never rise. */
	drawPtolemyCircles(pole) {
		const radius = Math.abs(this.state.phi);

		if (radius < 0.5) {
			return; // at the equator both circles shrink to the poles
		}

		const raised = this.state.phi > 0 ? pole : negate(pole);
		const style = { color: COL.epicycle, width: 1.5, dash: [6, 4] };

		this.sphere.smallCircle(raised, radius, style);
		this.sphere.smallCircle(negate(raised), radius, style);
	},

	/* The chosen star and its daily circle, solid above the horizon. */
	drawChosenStar(toSky) {
		const s = this.sphere;
		const point = toSky(fromLonLat(this.star.ra, this.star.dec));

		splitByHorizon(dailyCircle(this.star.dec, this.state.matrix)).forEach(run => {
			s.path(run.points, {
				color: COL.planet,
				width: 2,
				dash: run.above ? [] : [5, 4]
			});
		});

		s.star(point, { color: COL.planet, size: STAR_SIZE_CHOSEN, ring: true });
		s.labelAway(this.star.name, point, { x: s.cx, y: s.cy }, COL.planet);
	}
};

/* ==========================================================================
   3. FIGURE 3: THE SKY SEEN FROM OUTSIDE
   Drawn in the equatorial frame: the stars never move; the observer's
   zenith and horizon turn eastward about the axis.
   ========================================================================== */

const outsideFigure = {
	sphere: null,
	star: Stars.find('Vega'),
	state: null,

	init() {
		this.sphere = new Sphere3D(byId('outside-canvas'), {
			yaw: 40,
			pitch: 20,
			onDraw: () => this.draw()
		});

		wireSlider(byId('out-lat'), () => this.update(), formatAngle);
		wireSlider(byId('out-time'), () => this.update(), hm);
		wirePlayButton(byId('out-play'), byId('out-time'), PLAY_HOURS_PER_SECOND);

		buildChoice(byId('out-stars'), ['Vega', 'Sirius', 'Canopus'], this.star.name, name => {
			this.star = Stars.find(name);
			this.update();
		});

		this.update();
	},

	update() {
		const phi = readNumber('out-lat');
		const theta = Diurnal.DEGREES_PER_HOUR * readNumber('out-time');
		const zenith = fromLonLat(theta, phi);
		const starPoint = fromLonLat(this.star.ra, this.star.dec);

		this.state = {
			phi: phi,
			theta: theta,
			zenith: zenith,
			starPoint: starPoint,
			angle: acos(dot3(zenith, starPoint))
		};

		this.showReadout();
		this.sphere.redraw();
	},

	showReadout() {
		const { angle } = this.state;

		showLines('out-readout', [
			`\\text{${this.star.name}}`,
			`\\angle(\\hat{\\mathbf z}, \\mathbf s) = ${angle.toFixed(1)}^\\circ`,
			`a = 90^\\circ - ${angle.toFixed(1)}^\\circ = ${(90 - angle).toFixed(1)}^\\circ`
		]);
	},

	draw() {
		if (!this.state) {
			return;
		}

		const s = this.sphere;

		s.outline();
		this.drawObserver();

		// the fixed sky: equator, axis, stars
		s.circle([1, 0, 0], [0, 1, 0], { color: COL.earth, width: 2 });
		s.axis([0, 0, 1.25], 'P', { color: COL.ink });
		s.path([ORIGIN, [0, 0, -1.25]], { color: COL.muted, width: 1 });

		Stars.LIST.forEach(star => {
			if (star !== this.star) {
				s.star(fromLonLat(star.ra, star.dec), BACKGROUND_STAR(star));
			}
		});

		this.drawZenithArc();
	},

	/* Horizon, zenith, the zenith's daily circle and its direction of motion. */
	drawObserver() {
		const s = this.sphere;
		const { zenith, theta, phi } = this.state;
		const [h1, h2] = planeBasis(zenith);
		const eastward = [-sin(theta), cos(theta), 0];

		s.fillPlane(h1, h2, { color: COL.deferent, alpha: 0.14 });
		s.circle(h1, h2, { color: COL.deferent, width: 2 });
		s.smallCircle([0, 0, 1], 90 - phi, { color: COL.deferent, width: 1.5, dash: [5, 4] });
		s.arrow(zenith, add3(zenith, scale(eastward, 0.28)), { color: COL.deferent });
		s.point(zenith, { color: COL.deferent, radius: 5 });
	},

	/* The star, the great-circle arc from Z to it (90° - a), and the
	   labels, each placed on its own side so they never overlap. */
	drawZenithArc() {
		const s = this.sphere;
		const { zenith, starPoint, angle } = this.state;
		const toward = normalize3(sub3(starPoint, scale(zenith, dot3(zenith, starPoint))));
		const middle = arcPoint(zenith, toward, angle / 2);
		const a = s.project(zenith);
		const b = s.project(starPoint);

		s.arc(zenith, toward, angle, { color: COL.planet, width: 2.5 });
		s.star(starPoint, { color: COL.planet, size: STAR_SIZE_CHOSEN, ring: true });

		// the star's label beyond the star, Z's label beyond the zenith
		s.labelAway(this.star.name, starPoint, zenith, COL.planet);
		s.labelAway('Z', zenith, starPoint, COL.deferent);

		// the arc's label off its middle, on the side away from the sphere's centre
		const normal = { x: -(b.y - a.y), y: b.x - a.x };
		const m = s.project(middle);
		const outward = (m.x - s.cx) * normal.x + (m.y - s.cy) * normal.y > 0 ? 1 : -1;

		s.labelAway('90° − a', middle, { x: m.x - outward * normal.x, y: m.y - outward * normal.y }, COL.planet);
	}
};

/* ==========================================================================
   4. FIGURE 4: THE DAY OF A STAR
   (a) altitude against hour angle for the chosen declination and latitude;
   (b) the plane of latitude and declination, split into the three classes,
	   with lines of equal fraction of the turn above the horizon.
   Both scales are fixed at +-90°, which holds every value of the sliders.
   ========================================================================== */

/* Fractions of the turn drawn as lines in panel (b). */
const FRACTION_LINES = [0.25, 0.5, 0.75];

/* Stars offered as declination presets (J2000). */
const DAY_STARS = ['Dubhe', 'Capella', 'Vega', 'Mintaka', 'Sirius', 'Canopus'];

const dayFigure = {
	curve: null,
	map: null,

	init() {
		const figure = byId('day-curve').closest('figure');

		this.curve = new Plot2D(byId('day-curve'), {
			x: [-180, 180],
			y: [-90, 90],
			xLabel: 'hour angle H (°)',
			yLabel: 'altitude a (°)',
			aspect: 0.85,
			xTicks: () => [-180, -90, 0, 90, 180].map(value => ({ value, label: String(value) })),
			onDraw: () => this.drawCurve()
		});

		this.map = new Plot2D(byId('day-map'), {
			x: [-90, 90],
			y: [-90, 90],
			xLabel: 'latitude φ (°)',
			yLabel: 'declination δ (°)',
			aspect: 0.85,
			xTicks: () => [-90, -45, 0, 45, 90].map(value => ({ value, label: String(value) })),
			onDraw: () => this.drawMap()
		});

		this.buildStarPresets();
		wireSlider(byId('day-dec'), () => this.update(), formatAngle);
		wireSlider(byId('day-lat'), () => this.update(), formatAngle);
		wirePresets(figure);
		this.update();
	},

	/* One preset per star, setting the declination slider. */
	buildStarPresets() {
		const box = byId('day-star-presets');

		DAY_STARS.forEach(name => {
			const button = makeEl('button', '', name);

			button.type = 'button';
			button.dataset.target = 'day-dec';
			button.dataset.value = Stars.find(name).dec.toFixed(2);
			box.appendChild(button);
		});
	},

	update() {
		this.dec = readNumber('day-dec');
		this.phi = readNumber('day-lat');
		this.H0 = Diurnal.risingHourAngle(this.dec, this.phi);
		this.showReadout();
		this.curve.redraw();
		this.map.redraw();
	},

	showReadout() {
		const { dec, phi, H0 } = this;
		const f = H0 / 180;
		const lines = [
			CLASS_TEXT[Diurnal.classify(dec, phi)],
			`a_\\text{max} = ${Diurnal.upperCulmination(dec, phi).toFixed(1)}^\\circ,\\quad ` +
				`a_\\text{min} = ${Diurnal.lowerCulmination(dec, phi).toFixed(1)}^\\circ`,
			`H_0 = ${H0.toFixed(1)}^\\circ,\\quad f = ${f.toFixed(3)}`,
			`\\text{up } ${hmTex(f * Diurnal.TURN_HOURS)}\\ \\text{of each turn}`
		];

		showLines('day-readout', lines);
	},

	/* Panel (a): the altitude through one turn. */
	drawCurve() {
		const p = this.curve;
		const xs = [];
		const altitudes = [];
		const above = [];

		for (let H = -180; H <= 180; H += 1) {
			const a = Diurnal.altitude(this.dec, H, this.phi);

			xs.push(H);
			altitudes.push(a);
			above.push(Math.max(a, 0));
		}

		p.frame();
		p.band(
			xs,
			xs.map(() => 0),
			above,
			{ color: COL.planet, alpha: 0.18 }
		);
		p.hline(0, { color: COL.deferent, width: 2 });
		p.curve(xs, altitudes, { color: COL.planet });

		if (this.H0 > 0 && this.H0 < 180) {
			p.marker(-this.H0, 0, { color: COL.planet });
			p.marker(this.H0, 0, { color: COL.planet });
		}
	},

	/* Panel (b): the three classes, the lines of equal fraction, the dot. */
	drawMap() {
		const p = this.map;

		p.frame();
		this.drawClassBands();
		this.drawFractionLines();
		p.marker(this.phi, this.dec, { color: COL.planet });
	},

	/* Never sets: |phi + dec| > 90. Never rises: |phi - dec| > 90. */
	drawClassBands() {
		const p = this.map;
		const north = [];
		const south = [];

		for (let phi = 0; phi <= 90; phi += 1) {
			north.push(phi);
			south.push(-phi);
		}

		const sunBand = { color: COL.sun, alpha: 0.3 };
		const mutedBand = { color: COL.muted, alpha: 0.25 };

		p.band(
			north,
			north.map(phi => 90 - phi),
			north.map(() => 90),
			sunBand
		);
		p.band(
			south,
			south.map(() => -90),
			south.map(phi => -90 - phi),
			sunBand
		);
		p.band(
			north,
			north.map(() => -90),
			north.map(phi => phi - 90),
			mutedBand
		);
		p.band(
			south,
			south.map(phi => phi + 90),
			south.map(() => 90),
			mutedBand
		);

		p.text('never sets', 30, 72, { color: COL.ink });
		p.text('never rises', 30, -86, { color: COL.ink });
		p.text('never sets', -84, -86, { color: COL.ink });
		p.text('never rises', -84, 72, { color: COL.ink });
	},

	/* Lines where the star is up for a fraction c of the turn:
	   cos(180° c) = -tan(phi) tan(dec), i.e. dec = atan(-cos(180° c) / tan(phi)). */
	drawFractionLines() {
		const p = this.map;
		const style = { color: COL.earth, width: 1.5 };

		// the two hemispheres are drawn apart: at phi = 0 every line but
		// the equator runs off to the corners
		const north = [];
		const south = [];

		for (let phi = 0.5; phi <= 89.5; phi += 0.5) {
			north.push(phi);
			south.push(-phi);
		}

		FRACTION_LINES.forEach(c => {
			const lineAt = phi => Math.atan(-cos(180 * c) / tan(phi)) * R2D;

			p.curve(north, north.map(lineAt), style);
			p.curve(south, south.map(lineAt), style);
			p.text(`${Math.round(c * 100)}%`, 52, lineAt(52), { color: COL.earth, dy: -3 });
		});
	}
};

/* ==========================================================================
   5. FIGURE 5: THE MODEL AGAINST THE SKY
   Over one turn, the model's altitude minus the real one. The model's
   star is fitted on the night (its position of TEST_EPOCH); the real sky
   adds refraction. Fixed scale: the deepest value is -34.4' (a star on
   the seen horizon), computed in tools/numbers/1.1-turning-sky.js.
   ========================================================================== */

const TEST_Y_RANGE = [-40, 5]; // arcminutes
const TEST_HALF_TURN = Diurnal.TURN_HOURS / 2;

/* True altitude (deg) of a star seen exactly on the horizon: t = -R(t). */
function seenHorizonDepth() {
	let t = -0.5;

	for (let i = 0; i < 50; i++) {
		t = -Ephem.refraction(t);
	}

	return t;
}

const testFigure = {
	plot: null,
	star: Stars.find('Sirius'),
	depth: seenHorizonDepth(),

	init() {
		const figure = byId('test-plot').closest('figure');

		this.plot = new Plot2D(byId('test-plot'), {
			x: [-12, 12],
			y: TEST_Y_RANGE,
			xLabel: "clock time from the star's highest point (h)",
			yLabel: 'Δa (arcmin)',
			aspect: 0.62,
			xTicks: () => [-12, -9, -6, -3, 0, 3, 6, 9, 12].map(value => ({ value, label: String(value) })),
			onDraw: () => this.draw()
		});

		wireSlider(byId('test-lat'), () => this.update(), formatAngle);
		wirePresets(figure);

		buildChoice(
			byId('test-stars'),
			['Sirius', 'Mintaka', 'Vega', 'Antares', 'Capella', 'Canopus'],
			this.star.name,
			name => {
				this.star = Stars.find(name);
				this.update();
			}
		);

		this.update();
	},

	update() {
		this.phi = readNumber('test-lat');
		this.dec = Stars.ofDate(this.star, TEST_EPOCH).dec;
		this.modelH0 = Diurnal.risingHourAngle(this.dec, this.phi);
		this.realH0 = Diurnal.risingHourAngle(this.dec, this.phi, this.depth);
		this.showReadout();
		this.plot.redraw();
	},

	showReadout() {
		const model = Diurnal.classify(this.dec, this.phi);
		const real = Diurnal.classify(this.dec, this.phi, this.depth);
		const upModel = (2 * this.modelH0) / Diurnal.DEGREES_PER_HOUR;
		const upReal = (2 * this.realH0) / Diurnal.DEGREES_PER_HOUR;
		const lowest = Diurnal.lowerCulmination(this.dec, this.phi);

		// always four lines (data-lines): the star, the model, the real sky,
		// and the difference, so the figure keeps its size
		const upText = (kind, hours) => {
			if (kind === 'circumpolar') {
				return '\\text{never sets}';
			}

			return kind === 'never' ? '\\text{never rises}' : hmTex(hours);
		};
		let difference = '';

		if (model === 'rises' && real === 'rises') {
			difference = `\\Delta t = ${(((upReal - upModel) / 2) * 60).toFixed(1)}\\ \\text{min}`;
		} else if (model === 'circumpolar') {
			difference = `\\text{lowest point lifted by } ${(Ephem.refraction(lowest) * 60).toFixed(1)}'`;
		}

		const lines = [
			`\\text{${this.star.name}},\\ \\delta = ${this.dec.toFixed(2)}^\\circ`,
			`\\text{up, model: } ${upText(model, upModel)}`,
			`\\text{up, real: } ${upText(real, upReal)}`
		];

		if (difference) {
			lines.push(difference);
		}

		showLines('test-readout', lines);
	},

	draw() {
		const p = this.plot;
		const xs = [];
		const errors = [];

		// Delta a = true - seen = -R while the real star is above the horizon
		for (let t = -TEST_HALF_TURN; t <= TEST_HALF_TURN; t += 0.01) {
			const a = Diurnal.altitude(this.dec, t * Diurnal.DEGREES_PER_HOUR, this.phi);

			xs.push(t);
			errors.push(a >= this.depth ? -Ephem.refraction(a) * 60 : NaN);
		}

		p.frame();
		p.curve(xs, errors, { color: COL.planet });
		this.drawEvents(this.modelH0, 0, COL.ink);
		this.drawEvents(this.realH0, this.depth * 60, COL.planet);
	},

	/* Rising and setting dots at +-H0 (when the star does rise and set). */
	drawEvents(H0, y, color) {
		if (H0 <= 0 || H0 >= 180) {
			return;
		}

		const t = H0 / Diurnal.DEGREES_PER_HOUR;

		this.plot.marker(-t, y, { color });
		this.plot.marker(t, y, { color });
	}
};

/* ==========================================================================
   6. PAGE START
   Shared components first (they typeset the prose), then the figures.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
	Site.initPage();
	poleFigure.init();
	skyFigure.init();
	outsideFigure.init();
	dayFigure.init();
	testFigure.init();
});
