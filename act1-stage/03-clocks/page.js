// @ts-check
/* ==========================================================================
   PAGE 1.3 · CLOCKS - SCRIPT (page.js)
   Six figures, each with its own init and draw (and update when it has
   controls):
	 1. the sky from above the pole   (2D: the stars' day and the Sun's day
									   through 2026)
	 2. the three angles              (2D, static: theta_G = H_m + alpha_m on
									   the equator at one moment)
	 3. sidereal time and hour angle  (3D, horizon frame: the time and the
									   longitude turn the sky, never the ground)
	 4. the star calendar             (2D: transit times through 2026)
	 5. the length of the day         (2D: one latitude through the year, and
									   the map of every latitude)
	 6. the clock against the Sun     (2D: model minus real noon, sunrise,
									   sunset through 2026)
   Shared code: common.js, time.js, ephemeris.js, stars.js, models/diurnal.js,
   models/frames.js, models/mean-sun.js, models/clock.js, sphere3d.js,
   plot2d.js, components.js.
   Every number quoted in the prose comes from tools/numbers/1.3-clocks.js.

   TABLE OF CONTENTS
	 0. Helpers shared by the figures
	 1. Figure 1: the sky from above the pole
	 2. Figure 2: the three angles on the equator
	 3. Figure 3: sidereal time and hour angle
	 4. Figure 4: the star calendar
	 5. Figure 5: the length of the day
	 6. Figure 6: the clock against the Sun
	 7. Page start
   ========================================================================== */

/* ==========================================================================
   0. HELPERS SHARED BY THE FIGURES
   ========================================================================== */

/* The year of the figures, and 0 h UT of its first day. */
const YEAR = 2026;
const YEAR_START = Time.julianDay(YEAR, 1, 1);
const DAYS_IN_YEAR = 365;

/* The time sliders run at one hour per second when playing; the date
   slider of Figure 1 at thirty days per second (a year in 12 s). */
const PLAY_HOURS_PER_SECOND = 1;
const PLAY_DAYS_PER_SECOND = 30;

/* Rome, the default place of the page (as on pages 1.1 and 1.2). */
const ROME = PLACES.rome;

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

/* A clock time inside TeX, as text so the colon is not spaced: "\text{04:23}". */
const texClock = hours => `\\text{${clockText(hours)}}`;

/* Minutes with a sign, in TeX: "+16.5\,\text{min}". */
function texMinutes(minutes) {
	const rounded = Math.round(minutes * 10) / 10;
	const sign = rounded < 0 ? '-' : rounded > 0 ? '+' : '';

	return `${sign}${Math.abs(rounded).toFixed(1)}\\,\\text{min}`;
}

/* An angle in hours, minutes, seconds for TeX: "2^\text{h}35^\text{m}45^\text{s}". */
function texHms(degrees) {
	const { h, m, s } = splitHms(norm360(degrees) / 15);

	return `${h % 24}^\\text{h}${pad2(m)}^\\text{m}${pad2(s)}^\\text{s}`;
}

/* A point on a circle of radius r about (cx, cy), at an angle measured
   clockwise from the top (the meridian), as the figures seen from above P
   draw hour angles. */
function clockwisePoint(owner, angle, r) {
	return { x: owner.cx + r * sin(angle), y: owner.cy - r * cos(angle) };
}

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
	labels: new LabelPlacer(), // keeps the labels of one drawing apart
	canvas: null,
	ctx: null,
	state: null,

	init() {
		const figure = byId('wheel-canvas').closest('figure');

		this.stars = Stars.LIST.map(star => ({
			name: star.name,
			mag: star.mag,
			position: Stars.ofDate(star, YEAR_START)
		}));

		squareCanvas(this, byId('wheel-canvas'), 480, 34);

		wireSlider(byId('wheel-day'), () => this.update(), dayText);
		wireSlider(byId('wheel-time'), () => this.update(), clockText);
		wirePresets(figure);
		// two players: the time (the turn of one day) and the date at a fixed
		// time (the drift through the year); starting one pauses the other
		const players = {};

		players.day = wirePlayButton(byId('wheel-play-day'), byId('wheel-time'), PLAY_HOURS_PER_SECOND, {
			playLabel: 'Play a day',
			onPlay: () => players.year.pause()
		});
		players.year = wirePlayButton(byId('wheel-play-year'), byId('wheel-day'), PLAY_DAYS_PER_SECOND, {
			playLabel: 'Play a year',
			onPlay: () => players.day.pause()
		});

		this.sunAtStart = this.sunRightAscension(YEAR_START);
		this.update();
	},

	/* The real Sun's right ascension (deg) at JD(UT). */
	sunRightAscension(jdUT) {
		return this.sunEquatorial(jdUT).ra;
	},

	/* The real Sun's { ra, dec } (deg) at JD(UT). */
	sunEquatorial(jdUT) {
		const jdTT = Time.ttFromUt(jdUT);

		return Ephem.equatorial(Ephem.sun(jdTT), jdTT);
	},

	update() {
		const elapsed = readNumber('wheel-day') + readNumber('wheel-time') / 24;
		const jd = YEAR_START + elapsed;
		const sun = this.sunEquatorial(jd);
		const sunRa = sun.ra;
		const n = MeanSun.MODERN.n;

		// the Sun's right ascension, unwrapped: the mean motion plus the
		// (small) difference of the real Sun from it
		const sunMoved = n * elapsed + norm180(sunRa - this.sunAtStart - n * elapsed);

		this.state = {
			jd: jd,
			elapsed: elapsed,
			theta: Clock.gmst(jd),
			sunRa: sunRa,
			sunDec: sun.dec,
			skyTurns: (Clock.RATE * elapsed) / 360,
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
			`\\text{elapsed: } ${days}\\,\\text{d}\\ ${hmTex(hours)}`,
			`\\text{sky: } ${skyTurns.toFixed(3)}\\ \\text{turns}`,
			`\\text{Sun: } ${sunTurns.toFixed(3)}\\ \\text{turns}`
		]);
	},

	/* Screen position of a direction (ra, dec), with theta the turn of the sky. */
	toScreen(ra, dec) {
		const r = (this.R * (90 - dec)) / (90 - WHEEL_RIM_DEC);

		return clockwisePoint(this, this.state.theta - ra, r);
	},

	draw() {
		if (!this.state) {
			return;
		}

		const ctx = this.ctx;

		ctx.clearRect(0, 0, this.width, this.width);
		this.labels.begin({ x0: 0, y0: 0, x1: this.width, y1: this.width });
		this.drawCircleOfDeclination(WHEEL_RIM_DEC, { color: COL.line, width: 1.5 });
		this.drawCircleOfDeclination(0, { color: COL.earth, width: 2 });
		this.drawEcliptic();
		this.drawMeridian();
		this.drawStars();
		this.drawPoint(0, 0, COL.ink, 4, 'γ');
		this.drawPoint(0, 90, COL.ink, 3.5, 'P');
		this.drawPoint(270, 90 - EPS_YEAR, COL.sun, 3.5, 'K');
		this.drawPoint(this.state.sunRa, this.state.sunDec, COL.sun, 8, 'Sun');
	},

	/* A circle of constant declination. */
	drawCircleOfDeclination(dec, style) {
		const ctx = this.ctx;

		ctx.strokeStyle = style.color;
		ctx.lineWidth = style.width;
		ctx.setLineDash(style.dash ?? []);
		ctx.beginPath();
		ctx.arc(this.cx, this.cy, (this.R * (90 - dec)) / (90 - WHEEL_RIM_DEC), 0, TAU);
		ctx.stroke();
		ctx.setLineDash([]);
	},

	/* The ecliptic, dashed, from Frames.eclipticPoint. It is the great
	   circle 90° from its pole K (alpha = 270°, delta = 90° - eps), so in
	   this view centred on P it is centred near K, off the centre. */
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

		ctx.fillStyle = textColor(COL.deferent);
		ctx.font = labelFont('meridian');
		ctx.textAlign = 'center';
		ctx.textBaseline = 'bottom';
		ctx.fillText('meridian', this.cx, this.cy - this.R - 12);
		this.labels.reserve(LabelPlacer.boxOf(ctx, 'meridian', this.cx, this.cy - this.R - 12));
	},

	/* The bright stars, as four-pointed stars sized by brightness (STYLE.md
	   §5); a few are named. */
	drawStars() {
		const ctx = this.ctx;

		this.stars.forEach(({ name, mag, position }) => {
			if (position.dec < WHEEL_RIM_DEC) {
				return;
			}

			const q = this.toScreen(position.ra, position.dec);
			const size = starSize(mag);

			ctx.globalAlpha = 0.55;
			ctx.fillStyle = COL.ink;
			drawStar(ctx, q.x, q.y, size);
			ctx.globalAlpha = 1;

			if (WHEEL_NAMES.includes(name)) {
				ctx.font = labelFont(name);
				ctx.textAlign = 'left';
				ctx.textBaseline = 'middle';
				ctx.fillStyle = COL.muted;
				this.drawLabel(name, q, size + 4);
			}
		});
	},

	/* A dot (a point that is not a star: γ, P, K, the Sun) with an
	   optional label beside it. */
	drawPoint(ra, dec, color, radius, label = null) {
		const ctx = this.ctx;
		const q = this.toScreen(ra, dec);

		drawDot(ctx, q.x, q.y, radius, color);

		if (label) {
			ctx.font = labelFont(label);
			ctx.textAlign = 'left';
			ctx.textBaseline = 'middle';
			ctx.fillStyle = COL.ink;
			this.drawLabel(label, q, radius + 4);
		}
	},

	/* A label to the right of point q, 'gap' px away; a single symbol goes
	   elsewhere round the point if it would cover an earlier label or
	   leave the canvas (on a phone), a name such as Sirius only slides
	   inside the canvas (LabelPlacer.candidates). Font, alignment and
	   colour are set by the caller. */
	drawLabel(text, q, gap) {
		const designed = { x: q.x + gap, y: q.y };
		const place = this.labels.choose(this.ctx, text, LabelPlacer.candidates(this.ctx, text, designed, q, gap));

		this.ctx.fillText(text, place.x, place.y);
	}
};

/* ==========================================================================
   2. FIGURE 2: THE THREE ANGLES ON THE EQUATOR
   Static. The equator seen from above P, as in Figure 1, at Greenwich on
   20 April 2026, 20:00 UT (tools/numbers/1.3-clocks.js): the hour angle of
   the mean Sun H_m, its right ascension alpha_m, and the sidereal time
   theta_G = H_m + alpha_m. Hour angles are measured westward (clockwise in
   this view), right ascension eastward (anticlockwise).
   ========================================================================== */

const ANGLES_MOMENT = { year: 2026, month: 4, day: 20, hour: 20 };

/* Radii of the drawing, as fractions of R: the equator, and one ring per
   angle so the three arcs do not hide one another. */
const ANGLES_RING = { equator: 0.66, alpha: 0.54, H: 0.82, theta: 1.0 };

/* Where each name is written: the angle (clockwise from the meridian) and
   the radius (fraction of R), chosen in the gaps between the rings. */
const ANGLES_LABELS = {
	H: { at: 25, r: 0.91 },
	theta: { at: 74, r: 1.1 },
	alpha: { at: 134, r: 0.44 }
};

const anglesFigure = {
	labels: new LabelPlacer(), // keeps the labels of one drawing apart
	init() {
		const { year, month, day, hour } = ANGLES_MOMENT;
		const jd = Time.julianDayTime(year, month, day, hour, 0, 0);
		const d = jd - Time.J2000;

		// the derivation of section 2, step by step
		this.H = 15 * (hour - 12);
		this.alpha = norm360(Clock.THETA0 + (Clock.RATE - 360) * d);
		this.theta = norm360(this.H + this.alpha);

		squareCanvas(this, byId('angles-canvas'), 420, 30);
		this.draw();
	},

	draw() {
		const ctx = this.ctx;
		const R = this.R;
		const sunPoint = clockwisePoint(this, this.H, ANGLES_RING.equator * R);
		const gammaPoint = clockwisePoint(this, this.theta, ANGLES_RING.equator * R);

		ctx.clearRect(0, 0, this.width, this.width);
		this.labels.begin({ x0: 0, y0: 0, x1: this.width, y1: this.width });

		// the equator and the fixed meridian
		ctx.strokeStyle = COL.earth;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(this.cx, this.cy, ANGLES_RING.equator * R, 0, TAU);
		ctx.stroke();
		this.drawMeridian();

		// dashed guides from P through the mean Sun and γ, to the outer ring
		this.guide(this.H);
		this.guide(this.theta);

		// the three angles
		this.drawAngle({
			from: 0,
			to: this.H,
			r: ANGLES_RING.H * R,
			color: COL.sun,
			name: ['H', 'm'],
			label: ANGLES_LABELS.H
		});
		this.drawAngle({
			from: this.theta,
			to: this.H,
			r: ANGLES_RING.alpha * R,
			color: COL.earth,
			name: ['α', 'm'],
			label: ANGLES_LABELS.alpha,
			anticlockwise: true
		});
		this.drawAngle({
			from: 0,
			to: this.theta,
			r: ANGLES_RING.theta * R,
			color: COL.epicycle,
			name: ['θ', 'G'],
			label: ANGLES_LABELS.theta
		});

		// the points
		this.dot(sunPoint, COL.sun, 7);
		this.dot(gammaPoint, COL.ink, 4.5);
		this.dot({ x: this.cx, y: this.cy }, COL.ink, 3.5);
		centredLabel(ctx, 'P', { x: this.cx + 12, y: this.cy + 2 }, COL.ink, this.labels);
		centredLabel(
			ctx,
			'mean Sun',
			clockwisePoint(this, this.H - 24, ANGLES_RING.equator * R - 22),
			COL.ink,
			this.labels
		);
		centredLabel(
			ctx,
			'γ',
			clockwisePoint(this, this.theta + 7, ANGLES_RING.equator * R + 14),
			COL.ink,
			this.labels
		);
	},

	/* A dashed line from P outwards at an angle (clockwise from the top). */
	guide(angle) {
		const ctx = this.ctx;
		const end = clockwisePoint(this, angle, this.R);

		ctx.strokeStyle = COL.muted;
		ctx.lineWidth = 1;
		ctx.setLineDash([4, 4]);
		ctx.beginPath();
		ctx.moveTo(this.cx, this.cy);
		ctx.lineTo(end.x, end.y);
		ctx.stroke();
		ctx.setLineDash([]);
	},

	/* The meridian of Greenwich, from P up past the rings. */
	drawMeridian() {
		const ctx = this.ctx;
		const top = { x: this.cx, y: this.cy - this.R - 12 };

		ctx.strokeStyle = COL.deferent;
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		ctx.moveTo(this.cx, this.cy);
		ctx.lineTo(top.x, top.y);
		ctx.stroke();
		centredLabel(ctx, 'meridian', { x: top.x, y: top.y - 10 }, COL.deferent, this.labels);
	},

	/* An arc { from, to, r, color, name, label, anticlockwise }: from
	   angle 'from' to angle 'to' (clockwise from the top, or anticlockwise
	   when 'anticlockwise'), at radius r, with an arrowhead at its end and
	   its name ([base, subscript]) at the place given in 'label'. */
	drawAngle(arc) {
		const { from, to, r, color, name, label, anticlockwise = false } = arc;
		const ctx = this.ctx;
		const toCanvas = angle => (angle - 90) * D2R;

		ctx.strokeStyle = color;
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.arc(this.cx, this.cy, r, toCanvas(from), toCanvas(to), anticlockwise);
		ctx.stroke();

		this.arrowHead(to, r, anticlockwise ? -1 : 1, color);
		this.subscriptLabel(name, clockwisePoint(this, label.at, label.r * this.R), color);
	},

	/* A filled arrowhead at angle 'at' on the circle of radius r, pointing
	   clockwise (sense = 1) or anticlockwise (sense = -1). */
	arrowHead(at, r, sense, color) {
		const ctx = this.ctx;
		const tip = clockwisePoint(this, at, r);
		const back = clockwisePoint(this, at - sense * 4, r);
		const ux = tip.x - back.x;
		const uy = tip.y - back.y;
		const length = Math.hypot(ux, uy) || 1;
		const size = 10;
		const ax = ux / length;
		const ay = uy / length;

		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.moveTo(tip.x, tip.y);
		ctx.lineTo(tip.x - size * ax - size * 0.5 * ay, tip.y - size * ay + size * 0.5 * ax);
		ctx.lineTo(tip.x - size * ax + size * 0.5 * ay, tip.y - size * ay - size * 0.5 * ax);
		ctx.closePath();
		ctx.fill();
	},

	/* "θ_G" with a real subscript, centred at a point. */
	subscriptLabel([base, sub], point, color) {
		const ctx = this.ctx;
		const baseFont = FONT_SYMBOL;
		const smallFont = 'italic 500 15px "Cormorant Garamond", Georgia, serif';

		ctx.font = baseFont;
		const baseWidth = ctx.measureText(base).width;
		ctx.font = smallFont;
		const subWidth = ctx.measureText(sub).width;
		const x = point.x - (baseWidth + subWidth) / 2;

		ctx.fillStyle = textColor(color);
		ctx.textAlign = 'left';
		ctx.textBaseline = 'middle';
		ctx.font = baseFont;
		ctx.fillText(base, x, point.y);
		ctx.font = smallFont;
		ctx.fillText(sub, x + baseWidth, point.y + 5);

		// the other labels keep clear of it
		ctx.font = baseFont;

		const box = LabelPlacer.boxOf(ctx, base, x, point.y);

		this.labels.reserve({ x0: box.x0, y0: box.y0, x1: x + baseWidth + subWidth, y1: box.y1 + 5 });
	},

	dot(point, color, radius) {
		drawDot(this.ctx, point.x, point.y, radius, color);
	}
};

/* ==========================================================================
   3. FIGURE 3: SIDEREAL TIME AND HOUR ANGLE
   Drawn in the horizon frame of an observer at Rome's latitude on
   1 January 2026: the clock and the longitude turn the sky, never the
   ground. Three arcs along the equator: theta (from the meridian point M
   westward to the vernal point), alpha (from the vernal point eastward to
   the star's circle), H (from M westward to the star's circle).
   ========================================================================== */

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
		const star = Stars.ofDateByName(this.starName, YEAR_START);
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
		const lonValue = fixed(lon, 2);
		const lonText = `${lonValue.startsWith('-') ? lonValue : `+${lonValue}`}^\\circ`;

		showLines('sid-readout', [
			`d = ${(jd - Time.J2000).toFixed(4)}`,
			`\\theta_G = ${fixedAngle(thetaG, 2)}^\\circ = ${texHms(thetaG)}`,
			`\\theta = \\theta_G ${lonText} = ${fixedAngle(theta, 2)}^\\circ`,
			`\\alpha = ${fixedAngle(star.ra, 2)}^\\circ,\\quad H = ${fixed(H, 2)}^\\circ`,
			`a = ${fixed(a, 1)}^\\circ`
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
		s.ground();
		s.circle(toHor([1, 0, 0]), toHor([0, 1, 0]), { color: COL.earth, width: 2 });
		this.drawArcs(toHor);
		this.drawStar(toHor, pole);

		s.point(toHor([1, 0, 0]), { color: COL.ink, radius: 5, always: true });
		s.labelAway('γ', toHor([1, 0, 0]), ORIGIN, COL.ink);
		s.axis(scale(pole, 1.25), 'P', { color: COL.ink });
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
		s.star(point, { color: COL.planet, size: STAR_SIZE_CHOSEN, ring: true });
		s.labelAway(this.starName, point, pole, COL.planet);
	}
};

/* ==========================================================================
   4. FIGURE 4: THE STAR CALENDAR
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
		const transits = this.starTransits(this.starName);
		const sunDays = [];

		// the model Sun's day of each date, and of the day after the year
		for (let day = 0; day <= DAYS_IN_YEAR; day++) {
			sunDays.push(Clock.sunDay(YEAR_START + day, phi, 0));
		}

		this.nights = transits.map(({ day, dec, inside }) => ({
			day: day,
			dec: dec,
			inside: inside,
			upHalf: (Diurnal.risingHourAngle(dec, phi) / Clock.RATE) * 24,
			dusk: this.dusk(sunDays[day]),
			dawn: 24 + this.dawn(sunDays[day + 1])
		}));

		this.unwrapTransits();
		this.phi = phi;
		this.showReadout();
		this.plot.redraw();
	},

	/* For each night of the year, the star's declination of date and its
	   transits (hours of local mean time, 12 to 36). They do not depend on
	   the latitude, so they are computed once per star. */
	starTransits(name) {
		this.transitCache = this.transitCache ?? new Map();

		if (!this.transitCache.has(name)) {
			const star = Stars.find(name);
			const nights = [];

			for (let day = 0; day < DAYS_IN_YEAR; day++) {
				const jd0 = YEAR_START + day;
				const position = Stars.ofDate(star, jd0);
				const start = Clock.fromLocalMeanTime(jd0, 12, 0);
				const inside = Clock.transitsBetween(position.ra, start, 1, 0).map(t => 12 + (t - start) * 24);

				nights.push({ day: day, dec: position.dec, inside: inside });
			}

			this.transitCache.set(name, nights);
		}

		return this.transitCache.get(name);
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
			showLines('transit-readout', [`\\text{${this.starName}: point at the plot to read a night}`]);
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
			a > 0 ? `a = ${fixed(a, 1)}^\\circ` : `a = ${fixed(a, 1)}^\\circ\\ \\text{(below the horizon)}`
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
			this.plot.curve(
				xs,
				this.unwrapped.map(hours => hours + shift),
				{ color: COL.planet, width: 2.5, clip: true }
			);
		});
	}
};

/* ==========================================================================
   5. FIGURE 5: THE LENGTH OF THE DAY
   (a) the model Sun's day through the year at the chosen latitude;
   (b) the plane of date and latitude: polar day and night, and lines of
	   equal length of the day. Fixed scales: 0 to 24 h, and +-90°.
   ========================================================================== */

/* Lines of equal length of the day in panel (b). No 12 h line: with the
   50' horizon the day is longer than 12 h at the equator all year, and
   that line runs off to the poles at the equinoxes. */
const DAY_LEVELS = [6, 9, 15, 18];

/* Days from the June solstice where a curve's label may go instead (on a
   phone, when its own place is taken), the nearest first. */
const CONTOUR_LABEL_SHIFTS = [-20, 20, -40, 40, -60, 60];

/* The lines are searched for between these latitudes (deg), just short
   of the poles, where the day's length has no limit. */
const CONTOUR_LATITUDE = 89.9;

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
			`\\text{${dayText(day)}:}\\ \\delta_\\odot = ${fixed(sunDay.dec, 2)}^\\circ,\\quad H_0 = ${fixed(sunDay.H0, 1)}^\\circ`,
			`\\text{day } ${hmTex(sunDay.hours)}` + (rises ? '' : `\\ \\text{(${sunDay.kind})}`),
			rises
				? `\\text{sunrise } ${texClock(12 - sunDay.hours / 2)},\\quad \\text{sunset } ${texClock(12 + sunDay.hours / 2)}`
				: '\\text{no sunrise or sunset}'
		]);
	},

	/* The latitude (deg) where the day lasts 'hours' on each date: the day
	   is monotonic in the latitude for a given declination, so bisect. */
	contour(hours) {
		const h0 = Clock.SUN_HORIZON;

		return this.declinations.map(dec => {
			const f = phi => (2 * Diurnal.risingHourAngle(dec, phi, h0)) / 15 - hours;
			return bisect(f, -CONTOUR_LATITUDE, CONTOUR_LATITUDE);
		});
	},

	/* Panel (a). */
	drawCurve() {
		const p = this.curve;
		const xs = this.days.map((d, i) => i);

		p.frame();
		p.curve(
			xs,
			this.days.map(d => d.hours),
			{ color: COL.sun, width: 2.5 }
		);
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
		p.band(
			xs,
			this.declinations.map(dec => Math.min(90, 90 + h0 - dec)),
			top,
			sunBand
		);
		p.band(
			xs,
			bottom,
			this.declinations.map(dec => Math.max(-90, -90 - h0 - dec)),
			sunBand
		);
		p.band(
			xs,
			this.declinations.map(dec => Math.min(90, 90 - h0 + dec)),
			top,
			nightBand
		);
		p.band(
			xs,
			bottom,
			this.declinations.map(dec => Math.max(-90, dec - 90 + h0)),
			nightBand
		);

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

		// if the place is taken (on a phone), other days of the same curve,
		// the nearest to the solstice first
		const alternatives = CONTOUR_LABEL_SHIFTS.map(shift => day + shift)
			.filter(d => d >= 0 && d < ys.length && !Number.isNaN(ys[d]))
			.map(d => ({ x: xs[d], y: ys[d] }));

		if (!Number.isNaN(ys[day])) {
			this.map.text(text, xs[day], ys[day], { color: COL.earth, dx: 4, dy: -3, alternatives: alternatives });
		}
	}
};

/* ==========================================================================
   6. FIGURE 6: THE CLOCK AGAINST THE SUN
   Model minus real time of noon, sunrise and sunset through 2026, at the
   chosen latitude, on the meridian of Greenwich. The reference Sun is
   tabulated every 6 hours at the start and interpolated linearly (under
   0.2" from the full ephemeris). Fixed scale +-25 min: the largest error
   over every latitude the slider allows is -19.2 / +22.9 min
   (tools/numbers/1.3-clocks.js).
   ========================================================================== */

const TEST_RANGE = [-25, 25];

/* The searches for the real Sun's events: noon within NOON_SEARCH days of
   12:00 UT (the equation of time stays under 17 min = 0.012 d), sunrise
   and sunset within half a day of noon, each by 40 halvings (a window
   of 1 day / 2^40, far below a second). */
const NOON_SEARCH = 0.03;
const RISE_SET_SEARCH = 0.5;
const BISECTION_STEPS = 40;
const SUN_TABLE_STEP = 0.25; // days

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

	realNoon(jd0) {
		return bisect(jd => this.sunHourAngle(jd), jd0 + 0.5 - NOON_SEARCH, jd0 + 0.5 + NOON_SEARCH, BISECTION_STEPS);
	},

	/* The real sunrise and sunset (JD(UT)), NaN if the Sun does not cross h0. */
	realRiseSet(day, phi) {
		const noon = this.noons[day];
		const above = jd => this.sunAltitude(jd, phi) - Clock.SUN_HORIZON;

		if (above(noon) < 0) {
			return { rise: NaN, set: NaN };
		}

		return {
			rise: bisect(above, noon - RISE_SET_SEARCH, noon, BISECTION_STEPS),
			set: bisect(above, noon, noon + RISE_SET_SEARCH, BISECTION_STEPS)
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

				if (finite.length === 0) {
					return '\\text{none}';
				}

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
   7. PAGE START
   Shared components first (they typeset the prose), then the figures.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
	Site.initPage();
	startFigures([wheelFigure, anglesFigure, siderealFigure, calendarFigure, dayLengthFigure, testFigure]);
});
