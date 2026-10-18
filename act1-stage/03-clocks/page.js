/* ==========================================================================
   PAGE 1.3 · CLOCKS - SCRIPT (page.js)
   Five figures, each with its own init, update and draw:
	 1. the sky from above the pole   (2D: the stars' day and the Sun's day
									   through 2026)
	 2. sidereal time and hour angle  (3D, horizon frame: the time and the
									   longitude turn the sky, never the ground)
	 3. the star calendar             (2D: transit times through 2026)
	 4. the length of the day         (2D: one latitude through the year, and
									   the map of every latitude)
	 5. the clock against the Sun     (2D: model minus real noon, sunrise,
									   sunset through 2026)
   Shared code: common.js, time.js, ephemeris.js, stars.js, models/diurnal.js,
   models/frames.js, models/mean-sun.js, models/clock.js, sphere3d.js,
   plot2d.js, components.js.
   Every number quoted in the prose comes from tools/numbers/1.3-clocks.js.

   TABLE OF CONTENTS
	 0. Helpers shared by the figures
	 1. Figure 1: the sky from above the pole
	 2. Figure 2: sidereal time and hour angle
	 3. Figure 3: the star calendar
	 4. Figure 4: the length of the day
	 5. Figure 5: the clock against the Sun
	 6. Page start
   ========================================================================== */


/* ==========================================================================
   0. HELPERS SHARED BY THE FIGURES
   ========================================================================== */

/* The year of the figures, and 0 h UT of its first day. */
const YEAR = 2026;
const YEAR_START = Time.julianDay(YEAR, 1, 1);
const DAYS_IN_YEAR = 365;

/* The time sliders run at one hour per second when playing. */
const PLAY_HOURS_PER_SECOND = 1;

/* Rome, the default place of the page (as on pages 1.1 and 1.2). */
const ROME = { lat: 41.9, lon: 12.4964 };

/* The mean obliquity of the year, for the drawn ecliptic. */
const EPS_YEAR = Ephem.meanObliquity(YEAR_START);

/* First day of each month, as a day index of the year (0 = 1 January). */
const MONTH_STARTS = Time.MONTH_NAMES.map((name, i) => ({
	value: Time.julianDay(YEAR, i + 1, 1) - YEAR_START,
	label: name
}));

/* Ticks of a date axis: the first day of each month. */
const monthTicks = () => MONTH_STARTS;

/* "1 Jan 2026" for a day index of the year. */
const dayText = day => Time.formatDate(YEAR_START + day);

/* An angle with one decimal: "−16.8°". */
const formatAngle = value => `${value.toFixed(1).replace('-', '−')}°`;

/* A longitude: "12.50° E", "74.01° W". */
function formatLongitude(lon) {
	if (Math.abs(lon) < 0.005) {
		return '0.00°';
	}

	return `${Math.abs(lon).toFixed(2)}° ${lon > 0 ? 'E' : 'W'}`;
}

/* Hours of a clock -> "19:05" (wrapped to [0, 24)). */
function clockText(hours) {
	const { whole, rest } = splitWithCarry(((hours % 24) + 24) % 24, 60);

	return `${pad2(whole % 24)}:${pad2(rest)}`;
}

/* Hours -> "13 h 05 min" in TeX, with a sign when asked. */
function texDuration(hours) {
	return hmTex(hours);
}

/* A clock time inside TeX, as text so the colon is not spaced: "\text{04:23}". */
const texClock = hours => `\\text{${clockText(hours)}}`;

/* Minutes with a sign, in TeX: "+16.5\,\text{min}". */
function texMinutes(minutes) {
	const rounded = Math.round(minutes * 10) / 10;
	const sign = rounded < 0 ? '-' : (rounded > 0 ? '+' : '');

	return `${sign}${Math.abs(rounded).toFixed(1)}\\,\\text{min}`;
}

/* An angle in hours, minutes, seconds for TeX: "2^\text{h}35^\text{m}45^\text{s}". */
function texHms(degrees) {
	const total = Math.round(norm360(degrees) / 15 * 3600);
	const h = Math.floor(total / 3600);
	const m = Math.floor((total - 3600 * h) / 60);
	const s = total - 3600 * h - 60 * m;

	return `${h % 24}^\\text{h}${pad2(m)}^\\text{m}${pad2(s)}^\\text{s}`;
}

/* The mean position of date of a star of shared/stars.js. */
const starOfDate = (name, jd) => Stars.ofDate(Stars.find(name), jd);


/* ==========================================================================
   1. FIGURE 1: THE SKY FROM ABOVE THE POLE
   A polar view from outside the sphere, above P, from declination +90° at
   the centre to -60° at the rim (equidistant in declination). The
   meridian of Greenwich is fixed and points up; a point at hour angle H
   is drawn H clockwise from it, so the sky turns clockwise.
   ========================================================================== */

/* Declination at the rim of the wheel. */
const WHEEL_RIM_DEC = -60;

/* Stars named on the wheel. */
const WHEEL_NAMES = ['Sirius', 'Betelgeuse', 'Vega', 'Arcturus'];

const wheelFigure = {
	canvas: null,
	ctx: null,
	state: null,

	init() {
		const figure = byId('wheel-canvas').closest('figure');

		this.canvas = byId('wheel-canvas');
		this.ctx = this.canvas.getContext('2d');
		this.stars = Stars.LIST.map(star => ({
			name: star.name,
			position: Stars.ofDate(star, YEAR_START)
		}));

		this.resize();
		new ResizeObserver(() => {
			if (this.canvas.clientWidth !== this.width) {
				this.resize();
				this.draw();
			}
		}).observe(this.canvas.parentElement);

		wireSlider(byId('wheel-day'), () => this.update(), dayText);
		wireSlider(byId('wheel-time'), () => this.update(), clockText);
		wirePresets(figure);
		wirePlayButton(byId('wheel-play'), byId('wheel-time'), PLAY_HOURS_PER_SECOND);

		this.sunAtStart = this.sunRightAscension(YEAR_START);
		this.update();
	},

	/* A square canvas as wide as its column (at most 480 px). */
	resize() {
		const width = Math.min(this.canvas.parentElement.clientWidth || 400, 480);
		const ratio = window.devicePixelRatio || 1;

		this.canvas.style.width = `${width}px`;
		this.canvas.style.height = `${width}px`;
		this.canvas.width = Math.round(width * ratio);
		this.canvas.height = Math.round(width * ratio);
		this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
		this.width = width;
		this.cx = width / 2;
		this.cy = width / 2;
		this.R = width / 2 - 34;
	},

	/* The real Sun's right ascension (deg) at JD(UT). */
	sunRightAscension(jdUT) {
		const jdTT = Time.ttFromUt(jdUT);

		return Ephem.equatorial(Ephem.sun(jdTT), jdTT).ra;
	},

	update() {
		const elapsed = readNumber('wheel-day') + readNumber('wheel-time') / 24;
		const jd = YEAR_START + elapsed;
		const sunRa = this.sunRightAscension(jd);
		const n = MeanSun.MODERN.n;

		// the Sun's right ascension, unwrapped: the mean motion plus the
		// (small) difference of the real Sun from it
		const sunMoved = n * elapsed + norm180(sunRa - this.sunAtStart - n * elapsed);

		this.state = {
			jd: jd,
			elapsed: elapsed,
			theta: Clock.gmst(jd),
			sunRa: sunRa,
			sunDec: Ephem.equatorial(Ephem.sun(Time.ttFromUt(jd)), Time.ttFromUt(jd)).dec,
			skyTurns: Clock.RATE * elapsed / 360,
			sunTurns: (Clock.RATE * elapsed - sunMoved) / 360
		};

		this.showReadout();
		this.draw();
	},

	showReadout() {
		const { elapsed, skyTurns, sunTurns } = this.state;
		const days = Math.floor(elapsed + 1e-9);
		const hours = (elapsed - days) * 24;

		showLines('wheel-readout', [
			`\\text{elapsed: } ${days}\\,\\text{d}\\ ${texDuration(hours)}`,
			`\\text{sky: } ${skyTurns.toFixed(3)}\\ \\text{turns}`,
			`\\text{Sun: } ${sunTurns.toFixed(3)}\\ \\text{turns}`
		]);
	},

	/* Screen position of a direction (ra, dec), with theta the turn of the sky. */
	toScreen(ra, dec) {
		const r = this.R * (90 - dec) / (90 - WHEEL_RIM_DEC);
		const H = this.state.theta - ra;

		return { x: this.cx + r * sin(H), y: this.cy - r * cos(H) };
	},

	draw() {
		if (!this.state) {
			return;
		}

		const ctx = this.ctx;

		ctx.clearRect(0, 0, this.width, this.width);
		this.drawCircleOfDeclination(WHEEL_RIM_DEC, { color: COL.line, width: 1.5 });
		this.drawCircleOfDeclination(0, { color: COL.earth, width: 2 });
		this.drawEcliptic();
		this.drawMeridian();
		this.drawStars();
		this.drawPoint(0, 0, COL.ink, 4, 'γ');
		this.drawPoint(0, 90, COL.ink, 3.5, 'P');
		this.drawPoint(this.state.sunRa, this.state.sunDec, COL.sun, 8, 'Sun');
	},

	/* A circle of constant declination. */
	drawCircleOfDeclination(dec, style) {
		const ctx = this.ctx;

		ctx.strokeStyle = style.color;
		ctx.lineWidth = style.width;
		ctx.setLineDash(style.dash ?? []);
		ctx.beginPath();
		ctx.arc(this.cx, this.cy, this.R * (90 - dec) / (90 - WHEEL_RIM_DEC), 0, TAU);
		ctx.stroke();
		ctx.setLineDash([]);
	},

	/* The ecliptic, dashed, from Frames.eclipticPoint. */
	drawEcliptic() {
		const ctx = this.ctx;

		ctx.strokeStyle = COL.sun;
		ctx.lineWidth = 2;
		ctx.setLineDash([6, 5]);
		ctx.beginPath();

		for (let lon = 0; lon <= 360; lon += 2) {
			const p = Frames.eclipticPoint(lon, EPS_YEAR);
			const q = this.toScreen(p.ra, p.dec);

			if (lon === 0) {
				ctx.moveTo(q.x, q.y);
			} else {
				ctx.lineTo(q.x, q.y);
			}
		}

		ctx.stroke();
		ctx.setLineDash([]);
	},

	/* The fixed meridian, from P up to the rim, with its label. */
	drawMeridian() {
		const ctx = this.ctx;

		ctx.strokeStyle = COL.deferent;
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		ctx.moveTo(this.cx, this.cy);
		ctx.lineTo(this.cx, this.cy - this.R - 8);
		ctx.stroke();

		ctx.fillStyle = COL.deferent;
		ctx.font = LABEL_FONT;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'bottom';
		ctx.fillText('meridian', this.cx, this.cy - this.R - 12);
	},

	/* The bright stars; a few are named. */
	drawStars() {
		this.stars.forEach(({ name, position }) => {
			if (position.dec < WHEEL_RIM_DEC) {
				return;
			}

			const label = WHEEL_NAMES.includes(name) ? name : null;

			this.drawPoint(position.ra, position.dec, COL.muted, 3, label);
		});
	},

	/* A dot with an optional label beside it. */
	drawPoint(ra, dec, color, radius, label = null) {
		const ctx = this.ctx;
		const q = this.toScreen(ra, dec);

		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.arc(q.x, q.y, radius, 0, TAU);
		ctx.fill();
		ctx.strokeStyle = COL.card;
		ctx.lineWidth = 1.5;
		ctx.stroke();

		if (label) {
			ctx.font = LABEL_FONT;
			ctx.textAlign = 'left';
			ctx.textBaseline = 'middle';
			ctx.fillStyle = color === COL.muted ? COL.muted : COL.ink;
			ctx.fillText(label, q.x + radius + 4, q.y);
		}
	}
};


/* ==========================================================================
   2. FIGURE 2: SIDEREAL TIME AND HOUR ANGLE
   Drawn in the horizon frame of an observer at Rome's latitude on
   1 January 2026: the clock and the longitude turn the sky, never the
   ground. Three arcs along the equator: theta (from the meridian point M
   westward to the vernal point), alpha (from the vernal point eastward to
   the star's circle), H (from M westward to the star's circle).
   ========================================================================== */

const HORIZON_POINTS = [
	['S', [1, 0, 0]],
	['E', [0, 1, 0]],
	['N', [-1, 0, 0]],
	['W', [0, -1, 0]]
];

/* The arcs are drawn just outside the sphere, one ring each, so they do
   not hide one another. */
const ARC_RADIUS = { H: 1.0, alpha: 1.08, theta: 1.16 };

const siderealFigure = {
	sphere: null,
	starName: 'Aldebaran',
	state: null,

	init() {
		const figure = byId('sid-canvas').closest('figure');

		// seen from the south, a little below the horizon: the equator is an
		// open ellipse, with the meridian point M on the near side
		this.sphere = new Sphere3D(byId('sid-canvas'), {
			yaw: 250,
			pitch: -20,
			onDraw: () => this.draw()
		});

		wireSlider(byId('sid-time'), () => this.update(), clockText);
		wireSlider(byId('sid-lon'), () => this.update(), formatLongitude);
		wirePresets(figure);
		wirePlayButton(byId('sid-play'), byId('sid-time'), PLAY_HOURS_PER_SECOND);

		buildChoice(byId('sid-stars'), ['Aldebaran', 'Vega', 'Sirius', 'Arcturus'], this.starName, name => {
			this.starName = name;
			this.update();
		});

		this.update();
	},

	update() {
		const jd = YEAR_START + readNumber('sid-time') / 24;
		const lon = readNumber('sid-lon');
		const star = starOfDate(this.starName, YEAR_START);
		const thetaG = Clock.gmst(jd);
		const theta = norm360(thetaG + lon);

		this.state = {
			jd: jd,
			lon: lon,
			thetaG: thetaG,
			theta: theta,
			star: star,
			H: norm180(theta - star.ra),
			matrix: Diurnal.equatorialToHorizon(ROME.lat, theta)
		};

		this.showReadout();
		this.sphere.redraw();
	},

	showReadout() {
		const { jd, lon, thetaG, theta, star, H } = this.state;
		const a = Diurnal.altitude(star.dec, H, ROME.lat);
		const lonText = `${lon < 0 ? '-' : '+'}${Math.abs(lon).toFixed(2)}^\\circ`;

		showLines('sid-readout', [
			`d = ${(jd - Time.J2000).toFixed(4)}`,
			`\\theta_G = ${thetaG.toFixed(2)}^\\circ = ${texHms(thetaG)}`,
			`\\theta = \\theta_G ${lonText} = ${theta.toFixed(2)}^\\circ`,
			`\\alpha = ${star.ra.toFixed(2)}^\\circ,\\quad H = ${H.toFixed(2)}^\\circ`,
			`a = ${a.toFixed(1)}^\\circ`
		]);
	},

	draw() {
		if (!this.state) {
			return;
		}

		const s = this.sphere;
		const toHor = v => matApply(this.state.matrix, v);
		const pole = toHor([0, 0, 1]);

		s.outline();
		this.drawGround();
		s.circle(toHor([1, 0, 0]), toHor([0, 1, 0]), { color: COL.earth, width: 2 });
		this.drawArcs(toHor);
		this.drawStar(toHor, pole);

		s.point(toHor([1, 0, 0]), { color: COL.ink, radius: 5, always: true });
		s.labelAway('γ', toHor([1, 0, 0]), ORIGIN, COL.ink);
		s.axis(scale(pole, 1.25), 'P', { color: COL.ink });
	},

	/* Horizon, cardinal points, zenith, meridian. */
	drawGround() {
		const s = this.sphere;

		s.fillPlane([1, 0, 0], [0, 1, 0], { color: COL.deferent, alpha: 0.14 });
		s.circle([1, 0, 0], [0, 1, 0], { color: COL.deferent, width: 2 });
		s.circle([1, 0, 0], [0, 0, 1], { color: COL.muted, width: 1, dash: [2, 4] });

		HORIZON_POINTS.forEach(([name, point]) => {
			s.label(name, scale(point, 1.09), { color: COL.deferent, dx: -5, dy: 5 });
		});

		s.point([0, 0, 1], { color: COL.deferent, radius: 4 });
		s.label('Z', [0, 0, 1], { color: COL.deferent, dx: -18, dy: 4 });
	},

	/* The arcs theta, alpha and H along the equator, with the point M. */
	drawArcs(toHor) {
		const s = this.sphere;
		const { theta, star, H } = this.state;
		const meridianPoint = toHor(fromLonLat(theta, 0));
		const westOfMeridian = toHor(fromLonLat(theta - 90, 0));
		const gamma = toHor([1, 0, 0]);
		const eastOfGamma = toHor([0, 1, 0]);

		this.labelledArc('θ', meridianPoint, westOfMeridian, theta, ARC_RADIUS.theta, COL.epicycle);
		this.labelledArc('α', gamma, eastOfGamma, star.ra, ARC_RADIUS.alpha, COL.earth);
		this.labelledArc('H', meridianPoint, westOfMeridian, H, ARC_RADIUS.H, COL.planet);

		s.point(meridianPoint, { color: COL.earth, radius: 4, always: true });
		s.labelAway('M', meridianPoint, ORIGIN, COL.earth);
	},

	/* One arc of the equator at radius r, labelled at its middle. */
	labelledArc(text, from, toward, angle, r, color) {
		const s = this.sphere;

		s.arc(from, toward, angle, { color: color, width: 3 }, r);

		if (Math.abs(angle) > 6) {
			s.labelAway(text, scale(arcPoint(from, toward, angle / 2), r + 0.04), ORIGIN, color);
		}
	},

	/* The star, and the great circle from P through it to the equator. */
	drawStar(toHor, pole) {
		const s = this.sphere;
		const { star } = this.state;
		const foot = toHor(fromLonLat(star.ra, 0));
		const point = toHor(fromLonLat(star.ra, star.dec));

		s.arc(pole, foot, 90, { color: COL.planet, width: 1.5, dash: [5, 4] });
		s.point(foot, { color: COL.planet, radius: 3 });
		s.point(point, { color: COL.planet, radius: 6, ring: true });
		s.labelAway(this.starName, point, pole, COL.planet);
	}
};


/* ==========================================================================
   3. FIGURE 3: THE STAR CALENDAR
   For each night of 2026 (from local mean noon on the date to the next
   noon): the night of the model Sun, the hours the star is above the
   horizon, and the time of its transit. Times are local mean time on the
   meridian of Greenwich; at longitude l a transit's local mean time is
   earlier by l / 360° of 3 min 56 s, under 2 minutes. Fixed scales: the
   year, and one night from 12 h to 36 h.
   ========================================================================== */

const CALENDAR_STARS = ['Sirius', 'Betelgeuse', 'Vega', 'Antares', 'Arcturus', 'Canopus'];

/* Ticks of the night axis, 12 h to 36 h: every 3 hours when there is room
   for them, else every 6 hours, labelled as clock times. */
function nightTicks(count) {
	const step = count >= 8 ? 3 : 6;
	const ticks = [];

	for (let hours = 12; hours <= 36; hours += step) {
		ticks.push({ value: hours, label: `${pad2(hours % 24)}:00` });
	}

	return ticks;
}

const calendarFigure = {
	plot: null,
	starName: 'Sirius',
	nights: [],
	hoverDay: null,

	init() {
		const figure = byId('transit-plot').closest('figure');

		this.plot = new Plot2D(byId('transit-plot'), {
			x: [0, DAYS_IN_YEAR],
			y: [12, 36],
			xLabel: `night starting on the date (${YEAR})`,
			yLabel: 'local mean time',
			yTicks: (min, max, count) => nightTicks(count),
			margin: { left: 70 },
			xTicks: monthTicks,
			aspect: 0.5,
			onDraw: () => this.draw(),
			onHover: day => this.hover(day)
		});

		buildChoice(byId('transit-stars'), CALENDAR_STARS, this.starName, name => {
			this.starName = name;
			this.update();
		});

		wireSlider(byId('transit-lat'), () => this.update(), formatAngle);
		wirePresets(figure);
		this.update();
	},

	/* Recompute, for every night of the year, the transit and the hours
	   of the star above the horizon, and the night of the model Sun. */
	update() {
		const phi = readNumber('transit-lat');
		const star = Stars.find(this.starName);

		this.nights = [];

		for (let day = 0; day < DAYS_IN_YEAR; day++) {
			const jd0 = YEAR_START + day;
			const position = Stars.ofDate(star, jd0);
			const start = Clock.fromLocalMeanTime(jd0, 12, 0);
			const H0 = Diurnal.risingHourAngle(position.dec, phi);
			const inside = Clock.transitsBetween(position.ra, start, 1, 0)
				.map(t => 12 + (t - start) * 24);

			this.nights.push({
				day: day,
				dec: position.dec,
				inside: inside,
				upHalf: H0 / Clock.RATE * 24,
				dusk: this.dusk(Clock.sunDay(jd0, phi, 0)),
				dawn: 24 + this.dawn(Clock.sunDay(jd0 + 1, phi, 0))
			});
		}

		this.unwrapTransits();
		this.phi = phi;
		this.showReadout();
		this.plot.redraw();
	},

	/* The transit time as one continuous line through the year: it falls
	   3 min 56 s a night, so add 24 h each time it wraps from 12 h to 36 h.
	   The drawing repeats it one and two days (24 h, 48 h) above and below. */
	unwrapTransits() {
		let offset = 0;
		let previous = null;

		this.unwrapped = this.nights.map(night => {
			const hours = night.inside[0];

			if (previous !== null && hours - previous > 12) {
				offset -= 24;
			}

			previous = hours;

			return hours + offset;
		});
	},

	/* Local mean time when the night starts (12 h if the Sun never rises,
	   36 h if it never sets). */
	dusk(sunDay) {
		if (sunDay.kind === 'polar night') {
			return 12;
		}

		if (sunDay.kind === 'polar day') {
			return 36;
		}

		return 12 + sunDay.hours / 2;
	},

	/* Local mean time when the night ends, on the next date. */
	dawn(sunDay) {
		if (sunDay.kind === 'polar night') {
			return 12;
		}

		if (sunDay.kind === 'polar day') {
			return 0;
		}

		return 12 - sunDay.hours / 2;
	},

	hover(day) {
		this.hoverDay = day === null ? null : clamp(Math.floor(day), 0, DAYS_IN_YEAR - 1);
		this.showReadout();
	},

	showReadout() {
		if (this.hoverDay === null) {
			showLines('transit-readout', [
				`\\text{${this.starName}: point at the plot to read a night}`
			]);
			return;
		}

		// always four lines (data-lines): the night, two places for transits
		// (the second is empty on all nights but one a year), the altitude
		const night = this.nights[this.hoverDay];
		const a = Diurnal.upperCulmination(night.dec, this.phi);
		const transitLine = hours => {
			if (hours === undefined) {
				return '';
			}

			const dark = hours > night.dusk && hours < night.dawn;

			return `\\text{transit } ${texClock(hours)},\\quad \\text{sky: ${dark ? 'dark' : 'daylight'}}`;
		};

		showLines('transit-readout', [
			`\\text{${this.starName}, night of ${dayText(night.day)}}`,
			transitLine(night.inside[0]),
			transitLine(night.inside[1]),
			a > 0 ? `a = ${a.toFixed(1)}^\\circ` : `a = ${a.toFixed(1)}^\\circ\\ \\text{(below the horizon)}`
		]);
	},

	draw() {
		const p = this.plot;

		p.frame();
		this.drawNights();
		this.drawStarHours();
		this.drawTransits();
	},

	/* The nights of the model Sun, as one band. */
	drawNights() {
		const xs = [];
		const lows = [];
		const highs = [];

		this.nights.forEach(night => {
			[night.day, night.day + 1].forEach(x => {
				xs.push(x);
				lows.push(Math.min(night.dusk, night.dawn));
				highs.push(night.dawn);
			});
		});

		this.plot.band(xs, lows, highs, { color: COL.muted, alpha: 0.28 });
	},

	/* The star's hours above the horizon: a band of half-width upHalf
	   around each copy of the transit line. */
	drawStarHours() {
		const xs = this.nights.map(night => night.day + 0.5);

		[-24, 0, 24, 48].forEach(shift => {
			const lows = this.nights.map((night, i) => this.unwrapped[i] + shift - night.upHalf);
			const highs = this.nights.map((night, i) => this.unwrapped[i] + shift + night.upHalf);

			this.plot.band(xs, lows, highs, { color: COL.planet, alpha: 0.16 });
		});
	},

	/* The transit line, in each copy that crosses the plot (clipped). */
	drawTransits() {
		const xs = this.nights.map(night => night.day + 0.5);

		[0, 24, 48].forEach(shift => {
			this.plot.curve(xs, this.unwrapped.map(hours => hours + shift),
				{ color: COL.planet, width: 2.5, clip: true });
		});
	}
};


/* ==========================================================================
   4. FIGURE 4: THE LENGTH OF THE DAY
   (a) the model Sun's day through the year at the chosen latitude;
   (b) the plane of date and latitude: polar day and night, and lines of
	   equal length of the day. Fixed scales: 0 to 24 h, and +-90°.
   ========================================================================== */

/* Lines of equal length of the day in panel (b). No 12 h line: with the
   50' horizon the day is longer than 12 h at the equator all year, and
   that line runs off to the poles at the equinoxes. */
const DAY_LEVELS = [6, 9, 15, 18];

/* The default date of the read-out: the June solstice. */
const JUNE_SOLSTICE_DAY = Time.julianDay(YEAR, 6, 21) - YEAR_START;

const dayLengthFigure = {
	curve: null,
	map: null,
	hoverDay: null,

	init() {
		const figure = byId('day-curve').closest('figure');

		this.declinations = [];

		for (let day = 0; day <= DAYS_IN_YEAR; day++) {
			this.declinations.push(Clock.sunDeclination(YEAR_START + day + 0.5));
		}

		this.contours = DAY_LEVELS.map(hours => this.contour(hours));

		this.curve = new Plot2D(byId('day-curve'), {
			x: [0, DAYS_IN_YEAR],
			y: [0, 24],
			xLabel: `date (${YEAR})`,
			yLabel: 'length of the day (h)',
			xTicks: (min, max, count) => MONTH_STARTS.filter((t, i) => count >= 8 || i % 2 === 0),
			aspect: 0.85,
			onDraw: () => this.drawCurve(),
			onHover: day => this.hover(day)
		});

		this.map = new Plot2D(byId('day-map'), {
			x: [0, DAYS_IN_YEAR],
			y: [-90, 90],
			xLabel: `date (${YEAR})`,
			yLabel: 'latitude φ (°)',
			xTicks: (min, max, count) => MONTH_STARTS.filter((t, i) => count >= 8 || i % 2 === 0),
			aspect: 0.85,
			onDraw: () => this.drawMap()
		});

		wireSlider(byId('day-lat'), () => this.update(), formatAngle);
		wirePresets(figure);
		this.update();
	},

	update() {
		this.phi = readNumber('day-lat');
		this.days = [];

		for (let day = 0; day <= DAYS_IN_YEAR; day++) {
			this.days.push(Clock.sunDay(YEAR_START + day, this.phi, 0));
		}

		this.showReadout();
		this.curve.redraw();
		this.map.redraw();
	},

	hover(day) {
		this.hoverDay = day === null ? null : clamp(Math.round(day), 0, DAYS_IN_YEAR);
		this.showReadout();
	},

	showReadout() {
		const day = this.hoverDay ?? JUNE_SOLSTICE_DAY;
		const sunDay = this.days[day];
		const rises = sunDay.kind === 'rises';

		// always three lines (data-lines); polar day and night rewrite the
		// last two instead of removing one
		showLines('day-readout', [
			`\\text{${dayText(day)}:}\\ \\delta_\\odot = ${sunDay.dec.toFixed(2)}^\\circ,\\quad H_0 = ${sunDay.H0.toFixed(1)}^\\circ`,
			`\\text{day } ${texDuration(sunDay.hours)}` + (rises ? '' : `\\ \\text{(${sunDay.kind})}`),
			rises ?
				`\\text{sunrise } ${texClock(12 - sunDay.hours / 2)},\\quad \\text{sunset } ${texClock(12 + sunDay.hours / 2)}` :
				'\\text{no sunrise or sunset}'
		]);
	},

	/* The latitude (deg) where the day lasts 'hours' on each date: the day
	   is monotonic in the latitude for a given declination, so bisect. */
	contour(hours) {
		const h0 = Clock.SUN_HORIZON;

		return this.declinations.map(dec => {
			const f = phi => 2 * Diurnal.risingHourAngle(dec, phi, h0) / 15 - hours;
			let lo = -89.9;
			let hi = 89.9;

			if (f(lo) * f(hi) > 0) {
				return NaN;
			}

			for (let i = 0; i < 40; i++) {
				const mid = (lo + hi) / 2;

				if (f(mid) * f(lo) > 0) {
					lo = mid;
				} else {
					hi = mid;
				}
			}

			return (lo + hi) / 2;
		});
	},

	/* Panel (a). */
	drawCurve() {
		const p = this.curve;
		const xs = this.days.map((d, i) => i);

		p.frame();
		p.curve(xs, this.days.map(d => d.hours), { color: COL.sun, width: 2.5 });
	},

	/* Panel (b). */
	drawMap() {
		const p = this.map;
		const xs = this.declinations.map((d, i) => i);
		const h0 = Clock.SUN_HORIZON;
		const top = xs.map(() => 90);
		const bottom = xs.map(() => -90);
		const sunBand = { color: COL.sun, alpha: 0.3 };
		const nightBand = { color: COL.muted, alpha: 0.3 };

		p.frame();

		// polar day: north of 90° + h0 - dec, south of -(90° + h0) - dec;
		// polar night: north of 90° - h0 + dec, south of dec - 90° + h0
		p.band(xs, this.declinations.map(dec => Math.min(90, 90 + h0 - dec)), top, sunBand);
		p.band(xs, bottom, this.declinations.map(dec => Math.max(-90, -90 - h0 - dec)), sunBand);
		p.band(xs, this.declinations.map(dec => Math.min(90, 90 - h0 + dec)), top, nightBand);
		p.band(xs, bottom, this.declinations.map(dec => Math.max(-90, dec - 90 + h0)), nightBand);

		this.contours.forEach((ys, i) => {
			p.curve(xs, ys, { color: COL.earth, width: 1.5 });
			this.labelContour(xs, ys, `${DAY_LEVELS[i]} h`);
		});

		p.hline(this.phi, { color: COL.planet, width: 2 });
	},

	/* Label a line of equal day length at the June solstice, where the
	   lines are furthest apart. */
	labelContour(xs, ys, text) {
		const day = JUNE_SOLSTICE_DAY;

		if (!Number.isNaN(ys[day])) {
			this.map.text(text, xs[day], ys[day], { color: COL.earth, dx: 4, dy: -3 });
		}
	}
};


/* ==========================================================================
   5. FIGURE 5: THE CLOCK AGAINST THE SUN
   Model minus real time of noon, sunrise and sunset through 2026, at the
   chosen latitude, on the meridian of Greenwich. The reference Sun is
   tabulated every 6 hours at the start and interpolated linearly (under
   0.2" from the full ephemeris). Fixed scale +-25 min: the largest error
   over every latitude the slider allows is -19.2 / +22.9 min
   (tools/numbers/1.3-clocks.js).
   ========================================================================== */

const TEST_RANGE = [-25, 25];
const SUN_TABLE_STEP = 0.25;            // days

const testFigure = {
	plot: null,
	hoverDay: null,

	init() {
		const figure = byId('test-plot').closest('figure');

		this.tabulateSun();
		this.noons = [];

		for (let day = 0; day < DAYS_IN_YEAR; day++) {
			const jd0 = YEAR_START + day;

			this.noons.push(this.realNoon(jd0));
		}

		this.plot = new Plot2D(byId('test-plot'), {
			x: [0, DAYS_IN_YEAR],
			y: TEST_RANGE,
			xLabel: `date (${YEAR})`,
			yLabel: 'model − real (min)',
			xTicks: (min, max, count) => MONTH_STARTS.filter((t, i) => count >= 8 || i % 2 === 0),
			aspect: 0.7,
			onDraw: () => this.draw(),
			onHover: day => this.hover(day)
		});

		wireSlider(byId('test-lat'), () => this.update(), formatAngle);
		wirePresets(figure);
		this.update();
	},

	/* The reference Sun's apparent ra and dec, every 6 hours of UT from a
	   day before the year to two days after it. */
	tabulateSun() {
		this.tableStart = YEAR_START - 1;
		this.table = [];

		for (let t = 0; t <= DAYS_IN_YEAR + 3; t += SUN_TABLE_STEP) {
			const jdTT = Time.ttFromUt(this.tableStart + t);

			this.table.push(Ephem.equatorial(Ephem.sun(jdTT), jdTT));
		}
	},

	/* The reference Sun at JD(UT), interpolated. */
	sunAt(jdUT) {
		const x = (jdUT - this.tableStart) / SUN_TABLE_STEP;
		const i = Math.floor(x);
		const f = x - i;
		const a = this.table[i];
		const b = this.table[i + 1];

		return { ra: norm360(a.ra + f * norm180(b.ra - a.ra)), dec: a.dec + f * (b.dec - a.dec) };
	},

	/* The real Sun's hour angle at Greenwich and its altitude at latitude phi. */
	sunHourAngle(jdUT) {
		return norm180(Ephem.apparentSiderealTime(jdUT) - this.sunAt(jdUT).ra);
	},

	sunAltitude(jdUT, phi) {
		const sun = this.sunAt(jdUT);

		return Diurnal.altitude(sun.dec, norm180(Ephem.apparentSiderealTime(jdUT) - sun.ra), phi);
	},

	/* Root of f in [a, b] by bisection. */
	bisect(f, a, b) {
		const signA = Math.sign(f(a));

		for (let i = 0; i < 40; i++) {
			const middle = (a + b) / 2;

			if (Math.sign(f(middle)) === signA) {
				a = middle;
			} else {
				b = middle;
			}
		}

		return (a + b) / 2;
	},

	realNoon(jd0) {
		return this.bisect(jd => this.sunHourAngle(jd), jd0 + 0.47, jd0 + 0.53);
	},

	/* The real sunrise and sunset (JD(UT)), NaN if the Sun does not cross h0. */
	realRiseSet(day, phi) {
		const noon = this.noons[day];
		const above = jd => this.sunAltitude(jd, phi) - Clock.SUN_HORIZON;

		if (above(noon) < 0 || above(noon - 0.5) > 0) {
			return { rise: NaN, set: NaN };
		}

		return {
			rise: this.bisect(above, noon - 0.5, noon),
			set: this.bisect(above, noon, noon + 0.5)
		};
	},

	update() {
		const phi = readNumber('test-lat');

		this.errors = { noon: [], rise: [], set: [], day: [] };

		for (let day = 0; day < DAYS_IN_YEAR; day++) {
			const model = Clock.sunDay(YEAR_START + day, phi, 0);
			const real = this.realRiseSet(day, phi);
			const minutes = jd => jd * 1440;

			this.errors.noon.push(minutes(model.noon - this.noons[day]));
			this.errors.rise.push(minutes(model.rise - real.rise));
			this.errors.set.push(minutes(model.set - real.set));
			this.errors.day.push(minutes(model.set - model.rise - real.set + real.rise));
		}

		this.showReadout();
		this.plot.redraw();
	},

	hover(day) {
		this.hoverDay = day === null ? null : clamp(Math.floor(day), 0, DAYS_IN_YEAR - 1);
		this.showReadout();
	},

	showReadout() {
		const e = this.errors;

		if (this.hoverDay === null) {
			const range = values => {
				const finite = values.filter(Number.isFinite);

				return `${texMinutes(Math.min(...finite))}\\ \\text{to}\\ ${texMinutes(Math.max(...finite))}`;
			};

			showLines('test-readout', [
				'\\text{largest over the year:}',
				`\\text{noon } ${range(e.noon)}`,
				`\\text{rise } ${range(e.rise)}`,
				`\\text{set } ${range(e.set)}`,
				`\\text{day } ${range(e.day)}`
			]);
			return;
		}

		const day = this.hoverDay;

		showLines('test-readout', [
			`\\text{${dayText(day)}}`,
			`\\text{noon } ${texMinutes(e.noon[day])}`,
			`\\text{rise } ${texMinutes(e.rise[day])}`,
			`\\text{set } ${texMinutes(e.set[day])}`,
			`\\text{day } ${texMinutes(e.day[day])}`
		]);
	},

	draw() {
		const p = this.plot;
		const xs = this.errors.noon.map((v, day) => day + 0.5);

		p.frame();
		p.hline(0, { color: COL.ink, width: 1 });
		p.curve(xs, this.errors.rise, { color: COL.earth, width: 2 });
		p.curve(xs, this.errors.set, { color: COL.epicycle, width: 2 });
		p.curve(xs, this.errors.noon, { color: COL.sun, width: 2.5 });
	}
};


/* ==========================================================================
   6. PAGE START
   Shared components first (they typeset the prose), then the figures.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
	Site.initPage();
	wheelFigure.init();
	siderealFigure.init();
	calendarFigure.init();
	dayLengthFigure.init();
	testFigure.init();
});
