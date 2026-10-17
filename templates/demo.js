/* ==========================================================================
   DEMO OF THE SHARED COMPONENTS - SCRIPT (demo.js)
   Three figures; the chosen date (day of 2026 + time UT) drives the first two:
	 1. a 3D celestial sphere   (Sphere3D, Time, Ephem)
	 2. a 2D plot               (Plot2D, Ephem.equationOfTime)
	 3. an error curve          (ErrorCurve: uniform circle vs reference Sun)

   TABLE OF CONTENTS
	 0. Shared state: the chosen date
	 1. Figure 1: the sky on a date
	 2. Figure 2: the equation of time
	 3. Figure 3: error curve of the uniform circle
	 4. Page start
   ========================================================================== */


/* ==========================================================================
   0. SHARED STATE: THE CHOSEN DATE
   ========================================================================== */

const DEMO_YEAR = 2026;

const MEAN_LONGITUDE_J2000 = 280.46646;    // mean Sun at J2000 (Meeus 25.2), deg
const TROPICAL_YEAR = 365.24219;           // days
const HIPPARCHUS_YEAR = 365 + 1 / 4 - 1 / 300;

const VEGA = { ra: 279.23, dec: 38.78 };   // J2000, degrees

/* JD(UT) of the date and time chosen with the sliders. */
function chosenJdUT() {
	return Time.julianDay(DEMO_YEAR, 1, readNumber('day')) + readNumber('hour') / 24;
}

/* Text for the date slider: "21 Mar 2026". */
function formatDay(day) {
	return Time.formatDate(Time.julianDay(DEMO_YEAR, 1, day));
}


/* ==========================================================================
   1. FIGURE 1: THE SKY ON A DATE
   Drawn in the observer's frame, so the horizon is fixed ground and the
   sky turns above it: x towards the south point, y towards the east
   point, z towards the zenith. The observer is on the Greenwich meridian.
   ========================================================================== */

const HORIZON_POINTS = [
	['S', [1, 0, 0]],
	['E', [0, 1, 0]],
	['N', [-1, 0, 0]],
	['W', [0, -1, 0]]
];

/* Equatorial -> horizon frame for latitude phi and local sidereal time:
   turn the sky by -LST about the pole (the meridian onto the x axis),
   then tilt the pole down to altitude phi in the north. */
function equatorialToHorizon(latitude, lst) {
	return matMul(rotY(latitude - 90), rotZ(-lst));
}

const skyFigure = {
	sphere: null,
	state: null,

	init() {
		this.sphere = new Sphere3D(byId('fig-sphere'), {
			yaw: 210,
			pitch: 18,
			onDraw: () => this.draw()
		});

		wireSlider(byId('day'), () => onDateChange(), formatDay);
		wireSlider(byId('hour'), () => onDateChange(), hours => hm(hours));
		wireSlider(byId('latitude'), () => this.update());
		wirePresets(byId('fig-sphere').closest('figure'));
	},

	/* Recompute every position in the horizon frame, then the read-out
	   and the drawing. */
	update() {
		const jdUT = chosenJdUT();
		const jdTT = Time.ttFromUt(jdUT);
		const eps = Ephem.obliquity(jdTT);
		const sun = Ephem.sun(jdTT);
		const sunEq = Ephem.equatorial(sun, jdTT);
		const lst = Time.lst(jdUT, 0);
		const M = equatorialToHorizon(readNumber('latitude'), lst);
		const toSky = v => matApply(M, v);
		const eclipticToEquator = rotX(eps);

		this.state = {
			sun: sun,
			lst: lst,
			pole: toSky([0, 0, 1]),
			equator: [toSky([1, 0, 0]), toSky([0, 1, 0])],
			ecliptic: [toSky([1, 0, 0]), toSky(matApply(eclipticToEquator, [0, 1, 0]))],
			vernalPoint: toSky([1, 0, 0]),
			vega: toSky(fromLonLat(VEGA.ra, VEGA.dec)),
			sunPoint: toSky(matApply(eclipticToEquator, fromLonLat(sun.lon, sun.lat)))
		};

		this.showReadout(sunEq, asin(this.state.sunPoint[2]));
		this.sphere.redraw();
	},

	showReadout(sunEq, altitude) {
		const { sun, lst } = this.state;

		showLines('sphere-readout', [
			`\\text{LST} = ${hmTex(lst / 15)}`,
			`\\lambda_\\odot = ${sun.lon.toFixed(2)}^\\circ`,
			`\\alpha_\\odot = ${hmTex(sunEq.ra / 15)},\\quad \\delta_\\odot = ${sunEq.dec.toFixed(2)}^\\circ`,
			`a_\\odot = ${altitude.toFixed(1)}^\\circ`
		]);
	},

	draw() {
		if (!this.state) {
			return;    // a resize can ask for a drawing before the first update
		}

		const s = this.sphere;
		const st = this.state;

		s.outline();
		this.drawGround();

		// the sky: equator, ecliptic, the pole axis
		s.circle(st.equator[0], st.equator[1], { color: COL.earth, width: 2 });
		s.circle(st.ecliptic[0], st.ecliptic[1], { color: COL.sun, width: 2 });
		s.axis(scale(st.pole, 1.2), 'P', { color: COL.muted });
		s.path([ORIGIN, scale(st.pole, -1.2)], { color: COL.muted, width: 1 });
		s.point(st.vernalPoint, { color: COL.sun, radius: 3 });
		s.label('γ', st.vernalPoint, { color: COL.sun, dx: -16, dy: 18 });   // below-left: clear of the Sun at the equinox

		// Vega and its daily circle
		s.smallCircle(st.pole, 90 - VEGA.dec, { color: COL.planet, width: 1.5, dash: [5, 4] });
		s.point(st.vega, { color: COL.planet, radius: 4 });
		s.label('Vega', st.vega, { color: COL.planet });

		// the Sun
		s.point(st.sunPoint, { color: COL.sun, radius: 8, ring: true });
		s.label('Sun', st.sunPoint, { color: COL.ink, dx: 10 });
	},

	/* The observer's fixed ground: horizon, cardinal points, zenith. */
	drawGround() {
		const s = this.sphere;

		s.fillPlane([1, 0, 0], [0, 1, 0], { color: COL.deferent, alpha: 0.14 });
		s.circle([1, 0, 0], [0, 1, 0], { color: COL.deferent, width: 2 });

		HORIZON_POINTS.forEach(([name, point]) => {
			s.label(name, scale(point, 1.08), { color: COL.deferent, dx: -5, dy: 5 });
		});

		s.point([0, 0, 1], { color: COL.deferent, radius: 4 });
		s.label('Z', [0, 0, 1], { color: COL.deferent, dx: -18, dy: 4 });   // left: Vega passes near the zenith
	}
};


/* ==========================================================================
   2. FIGURE 2: THE EQUATION OF TIME
   ========================================================================== */

const eotFigure = {
	plot: null,
	days: [],
	values: [],

	init() {
		this.sampleYear();

		this.plot = new Plot2D(byId('fig-eot'), {
			x: [1, this.days.length],
			y: [-18, 18],
			xLabel: `day of ${DEMO_YEAR}`,
			yLabel: 'E (minutes)',
			aspect: 0.4,
			onDraw: () => this.draw(),
			onHover: day => this.showReadout(day)
		});

		Plot2D.legend(byId('eot-legend'), [
			{ label: 'equation of time $E$ (reference Sun)', color: COL.sun },
			{ label: 'chosen date', color: COL.planet, mark: 'dot' }
		]);
	},

	/* E at noon UT of every day of the year. */
	sampleYear() {
		const daysInYear = Time.isLeapYear(DEMO_YEAR) ? 366 : 365;

		for (let day = 1; day <= daysInYear; day++) {
			const jdTT = Time.ttFromUt(Time.julianDay(DEMO_YEAR, 1, day + 0.5));

			this.days.push(day);
			this.values.push(Ephem.equationOfTime(jdTT));
		}
	},

	update() {
		this.plot.redraw();
	},

	draw() {
		const p = this.plot;
		const day = readNumber('day') + readNumber('hour') / 24 - 0.5;

		p.frame();
		p.curve(this.days, this.values, { color: COL.sun });
		p.marker(day, Ephem.equationOfTime(Time.ttFromUt(chosenJdUT())), { color: COL.planet });
	},

	showReadout(day) {
		const box = byId('eot-readout');

		if (day === null) {
			box.innerHTML = '&nbsp;';
			return;
		}

		const jdUT = Time.julianDay(DEMO_YEAR, 1, day);
		const minutes = Ephem.equationOfTime(Time.ttFromUt(jdUT));
		const sign = minutes < 0 ? '−' : '+';
		const seconds = Math.round(Math.abs(minutes) * 60);

		box.textContent = `${Time.formatDate(jdUT)}: E = ${sign}${Math.floor(seconds / 60)} min ${pad2(seconds % 60)} s`;
	}
};


/* ==========================================================================
   3. FIGURE 3: ERROR CURVE OF THE UNIFORM CIRCLE
   ========================================================================== */

/* The uniform-circle Sun for a year of Y days: JD(TT) -> longitude (deg). */
function uniformCircle(yearLength) {
	return jd => norm360(MEAN_LONGITUDE_J2000 + 360 / yearLength * (jd - Time.J2000));
}

const errorFigure = {
	curve: null,

	init() {
		const start = Time.julianDay(DEMO_YEAR, 1, 1);

		this.curve = new ErrorCurve(byId('fig-error'), {
			body: 'sun',
			start: start,
			end: start + 365.25,
			// Fixed scales, so the axis does not jump while the slider moves:
			// the largest |Δλ| for any Y in [365.20, 365.30] d and for the
			// ghost is 205' over 1 year, 222' over 10 years and 17.6° over
			// 500 years (computed by script).
			spans: [
				{ label: '1 year', years: 1, yMax: 250, units: 'arcmin' },
				{ label: '10 years', years: 10, yMax: 250, units: 'arcmin' },
				{ label: '500 years', years: 500, yMax: 20, units: 'deg' }
			]
		});

		this.curve.addGhost({
			label: 'Hipparchus\' year, $Y = 365\\tfrac14 - \\tfrac1{300}$ d',
			short: 'Hipparchus\' year',
			color: COL.epicycle,
			fn: uniformCircle(HIPPARCHUS_YEAR)
		});

		this.curve.addModel({
			label: 'uniform circle, $Y$ from the slider',
			short: 'uniform circle',
			color: COL.planet,
			fn: jd => uniformCircle(readNumber('year-length'))(jd),
			freeze: () => uniformCircle(readNumber('year-length')),
			ghostLabel: () => `uniform circle, Y = ${readNumber('year-length').toFixed(4)} d`
		});

		wireSlider(byId('year-length'), () => this.curve.update(), y => `${y.toFixed(4)} d`);
	}
};


/* ==========================================================================
   4. PAGE START
   ========================================================================== */

/* The date or time moved: the sphere and the plot follow. */
function onDateChange() {
	skyFigure.update();
	eotFigure.update();
}

document.addEventListener('DOMContentLoaded', () => {
	Site.initPage();
	skyFigure.init();
	eotFigure.init();
	errorFigure.init();
	onDateChange();
});
