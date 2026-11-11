// @ts-check
/* ==========================================================================
   PAGE 1.3 · CLOCKS - SCRIPT (page.js)
   Six figures, each with its own init and draw (and update when it has
   controls):
	 1. the sky from above the pole   (2D: the stars' day and the Sun's day
									   through 2026)
	 2. the three angles              (2D, static: theta_G = H_m + alpha_m on
									   the equator at one moment)
	 3. sidereal time and hour angle  (2D, from above P: the time turns the
									   sky, the longitude the observer's
									   meridian)
	 4. the star calendar             (2D: transit times through 2026)
	 5. the length of the day         (2D: one latitude through the year, and
									   every latitude on three dates)
	 6. the clock against the Sun     (2D: model minus real noon and length
									   of the day through 2026)
   Shared code: common.js, time.js, ephemeris.js, stars.js, models/diurnal.js,
   models/frames.js, models/mean-sun.js, models/clock.js, plot2d.js,
   components.js.
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

/* The longest arrowhead of an arc (px); a shorter arc has a head of its
   own length, so the head shrinks to nothing with the arc. */
const ARROW_SIZE = 10;

/* An arc of a view from above P, about its centre at radius r: from the
   angle 'from' (clockwise from the top) through 'sweep' degrees, clockwise
   when positive (westward) and anticlockwise when negative (eastward),
   with an arrowhead at its end. */
function polarArc(owner, from, sweep, r, color) {
	const ctx = owner.ctx;
	const toCanvas = angle => (angle - 90) * D2R;

	ctx.strokeStyle = color;
	ctx.lineWidth = 3;
	ctx.beginPath();
	ctx.arc(owner.cx, owner.cy, r, toCanvas(from), toCanvas(from + sweep), sweep < 0);
	ctx.stroke();

	polarArrowHead(owner, from + sweep, r, sweep < 0 ? -1 : 1, color, Math.min(ARROW_SIZE, Math.abs(sweep) * D2R * r));
}

/* A filled arrowhead of length 'size' px at the angle 'at' on the circle
   of radius r, pointing clockwise (sense = 1) or anticlockwise (-1). */
function polarArrowHead(owner, at, r, sense, color, size) {
	const ctx = owner.ctx;
	const tip = clockwisePoint(owner, at, r);
	const back = clockwisePoint(owner, at - sense * 4, r);
	const ux = tip.x - back.x;
	const uy = tip.y - back.y;
	const length = Math.hypot(ux, uy) || 1;
	const ax = ux / length;
	const ay = uy / length;

	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.moveTo(tip.x, tip.y);
	ctx.lineTo(tip.x - size * ax - size * 0.5 * ay, tip.y - size * ay + size * 0.5 * ax);
	ctx.lineTo(tip.x - size * ax + size * 0.5 * ay, tip.y - size * ay - size * 0.5 * ax);
	ctx.closePath();
	ctx.fill();
}

/* A straight line of a view from above P, from its centre outwards to the
   radius r at an angle (clockwise from the top). */
function polarRay(owner, angle, r, style) {
	segment(owner.ctx, { x: owner.cx, y: owner.cy }, clockwisePoint(owner, angle, r), style);
}

/* The name of an angle, a symbol with or without a subscript ("H",
   ["θ", "G"]), centred at a canvas point in the text colour of its arc.
   It is drawn where it is asked: it never steps aside. */
function angleName(owner, name, point, color) {
	const ctx = owner.ctx;

	if (Array.isArray(name)) {
		subscriptLabel(ctx, name[0], name[1], point, color);
		return;
	}

	ctx.fillStyle = textColor(color);
	ctx.font = FONT_SYMBOL;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText(name, point.x, point.y);
}

/* ==========================================================================
   1. FIGURE 1: THE SKY FROM ABOVE THE POLE
   A polar view from outside the sphere, above P, from declination +90° at
   the centre to -60° at the rim (equidistant in declination). The
   meridian of Greenwich is fixed and points up; a point at hour angle H
   is drawn H clockwise from it, so the sky turns clockwise. The part of
   the ecliptic the Sun has covered since 1 January is drawn solid: seen
   from P it is the angle by which the Sun has fallen behind the stars,
   one whole turn by the end of the year.
   ========================================================================== */

/* Declination at the rim of the wheel. */
const WHEEL_RIM_DEC = -60;

/* Stars named on the wheel. */
const WHEEL_NAMES = ['Betelgeuse', 'Vega', 'Arcturus'];

/* The Sun's name stands beside it in the direction away from P, turned
   by this angle (deg, anticlockwise): clear of the meridian and of the
   ecliptic when the Sun is on both, on the side away from the names of
   the stars (written to their right) when the Sun is near the meridian,
   and turning smoothly round the Sun as the sky turns. */
const WHEEL_SUN_NAME_TURN = 45;

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

		this.sunAtStart = this.sunAt(YEAR_START);
		this.update();
	},

	/* The real Sun at JD(UT): its ecliptic longitude lon, and its ra and
	   dec (deg). */
	sunAt(jdUT) {
		const jdTT = Time.ttFromUt(jdUT);
		const ecliptic = Ephem.sun(jdTT);
		const equatorial = Ephem.equatorial(ecliptic, jdTT);

		return { lon: ecliptic.lon, ra: equatorial.ra, dec: equatorial.dec };
	},

	/* An angle of the Sun (deg) since the start of the year, unwrapped:
	   the mean motion plus the (small) difference of the real Sun from it. */
	sunAdvance(now, atStart, elapsed) {
		const mean = MeanSun.MODERN.n * elapsed;

		return mean + norm180(now - atStart - mean);
	},

	update() {
		const elapsed = readNumber('wheel-day') + readNumber('wheel-time') / 24;
		const jd = YEAR_START + elapsed;
		const sun = this.sunAt(jd);

		// how far the Sun has moved since the start of the year: in right
		// ascension (the turns it has lost on the sky) and along the ecliptic
		// (the solid arc, at most the whole circle)
		const sunMoved = this.sunAdvance(sun.ra, this.sunAtStart.ra, elapsed);
		const travelled = clamp(this.sunAdvance(sun.lon, this.sunAtStart.lon, elapsed), 0, 360);

		this.state = {
			jd: jd,
			elapsed: elapsed,
			theta: Clock.gmst(jd),
			sunRa: sun.ra,
			sunDec: sun.dec,
			travelled: travelled,
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
			`\\text{Sun: } ${sunTurns.toFixed(3)}\\ \\text{turns}`,
			`\\text{sky} - \\text{Sun: } ${(skyTurns - sunTurns).toFixed(3)}\\ \\text{turns}`
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
		this.drawSun();
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

	/* The ecliptic, from Frames.eclipticPoint: dashed, and solid from the
	   Sun's place at the start of the year (a small ring) to the Sun. It is
	   the great circle 90° from its own pole, 23.4° from P, so in this view
	   centred on P it is off the centre. */
	drawEcliptic() {
		const start = this.sunAtStart.lon;
		const from = this.eclipticScreen(start);

		this.strokeEcliptic(0, 360, { width: 2, dash: [6, 5] });
		this.strokeEcliptic(start, this.state.travelled, { width: 3.5, dash: [] });
		drawDot(this.ctx, from.x, from.y, 4, COL.card, false);
		circle(this.ctx, from, 4, { color: COL.sun, width: 2 });
	},

	/* Screen position of the point of the ecliptic at longitude lon. */
	eclipticScreen(lon) {
		const p = Frames.eclipticPoint(lon, EPS_YEAR);

		return this.toScreen(p.ra, p.dec);
	},

	/* The arc of the ecliptic from the longitude 'from' through 'length'
	   degrees eastward, with a line style { width, dash }. */
	strokeEcliptic(from, length, style) {
		const ctx = this.ctx;
		const steps = Math.ceil(length / 2);

		if (steps === 0) {
			return;
		}

		ctx.strokeStyle = COL.sun;
		ctx.lineWidth = style.width;
		ctx.setLineDash(style.dash);
		ctx.beginPath();

		for (let i = 0; i <= steps; i++) {
			const q = this.eclipticScreen(from + (length * i) / steps);

			if (i === 0) {
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

	/* The Sun, with its name beside it in the direction away from P turned
	   by WHEEL_SUN_NAME_TURN: the name keeps that side of the Sun as the
	   sky turns, and only slides inside the canvas. */
	drawSun() {
		const q = this.toScreen(this.state.sunRa, this.state.sunDec);
		const outward = atan2d(this.cy - q.y, q.x - this.cx);

		drawDot(this.ctx, q.x, q.y, 8, COL.sun);
		labelOutside(this.ctx, 'Sun', q, 8, outward + WHEEL_SUN_NAME_TURN, COL.ink, this.labels);
	},

	/* A dot (a point that is not a star: γ, P) with an optional label
	   beside it. */
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

/* The name of the mean Sun keeps these distances (px) from the equator
   circle and from the dashed line under it; half its height. */
const ANGLES_NAME_GAP = { circle: 8, line: 4, halfHeight: 8 };

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
		this.drawAngle({ from: 0, sweep: this.H, ring: 'H', color: COL.sun, name: ['H', 'm'] });
		this.drawAngle({ from: this.theta, sweep: -this.alpha, ring: 'alpha', color: COL.earth, name: ['α', 'm'] });
		this.drawAngle({ from: 0, sweep: this.theta, ring: 'theta', color: COL.epicycle, name: ['θ', 'G'] });

		// the points
		this.dot(sunPoint, COL.sun, 7);
		this.dot(gammaPoint, COL.ink, 4.5);
		this.dot({ x: this.cx, y: this.cy }, COL.ink, 3.5);
		centredLabel(ctx, 'mean Sun', this.meanSunLabelPlace(), COL.sun, this.labels);
		centredLabel(ctx, 'P', { x: this.cx + 12, y: this.cy + 2 }, COL.ink, this.labels);
		centredLabel(
			ctx,
			'γ',
			clockwisePoint(this, this.theta + 7, ANGLES_RING.equator * R + 14),
			COL.ink,
			this.labels
		);
	},

	/* Where the name of the mean Sun is centred: inside the equator, which
	   it must not cross, and above the dashed line from P to the mean Sun,
	   as near the mean Sun as the two allow. Drawn before the name of P,
	   which steps aside on a phone, where the circle is small. */
	meanSunLabelPlace() {
		const ctx = this.ctx;

		ctx.font = labelFont('mean Sun');

		const width = ctx.measureText('mean Sun').width;
		const right = ANGLES_RING.equator * this.R - ANGLES_NAME_GAP.circle;
		const slope = -cos(this.H) / sin(this.H); // of the dashed line, downwards to the right
		const bottom = slope * (right - width) - ANGLES_NAME_GAP.line;

		return { x: this.cx + right - width / 2, y: this.cy + bottom - ANGLES_NAME_GAP.halfHeight };
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

	/* An arc { from, sweep, ring, color, name }: from the angle 'from'
	   through 'sweep' degrees (clockwise from the top when positive), on
	   its ring, with an arrowhead at its end and its name ([base,
	   subscript]) at the place ANGLES_LABELS gives it. */
	drawAngle(arc) {
		const { from, sweep, ring, color, name } = arc;
		const label = ANGLES_LABELS[ring];
		const point = clockwisePoint(this, label.at, label.r * this.R);

		polarArc(this, from, sweep, ANGLES_RING[ring] * this.R, color);
		angleName(this, name, point, color);
		this.reserveName(name, point);
	},

	/* The other labels keep clear of the name of an angle. */
	reserveName([base, sub], point) {
		const ctx = this.ctx;

		ctx.font = FONT_SYMBOL;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';

		const box = LabelPlacer.boxOf(ctx, base + sub, point.x, point.y);

		this.labels.reserve({ x0: box.x0, y0: box.y0, x1: box.x1, y1: box.y1 + 5 });
	},

	dot(point, color, radius) {
		drawDot(this.ctx, point.x, point.y, radius, color);
	}
};

/* ==========================================================================
   3. FIGURE 3: SIDEREAL TIME AND HOUR ANGLE
   The equator seen from above P, as in Figures 1 and 2, on 1 January 2026.
   The meridian of Greenwich is fixed and points up; the observer's
   meridian stands l east of it (anticlockwise); the vernal point and the
   star turn clockwise with the time. Four arcs, one ring each:
	 theta_G  from the meridian of Greenwich westward to the vernal point,
	 l        from the meridian of Greenwich eastward to the observer's,
	 alpha    from the vernal point eastward to the star's hour circle,
	 H        from the observer's meridian westward to the star's hour circle,
   so that H = theta_G + l - alpha can be followed round the figure. The
   time moves only the sky, the longitude only the observer's meridian.
   ========================================================================== */

/* Radii of the drawing, as fractions of R: the equator, then one ring per
   angle so the four arcs do not hide one another. */
const SID_RING = { equator: 0.3, alpha: 0.49, H: 0.66, lon: 0.83, theta: 1.0 };

/* Each name is written between its ring and the ring inside it, so two
   names never share a place. */
const SID_NAME_RADIUS = {
	alpha: (SID_RING.equator + SID_RING.alpha) / 2,
	H: (SID_RING.alpha + SID_RING.H) / 2,
	lon: (SID_RING.H + SID_RING.lon) / 2,
	theta: (SID_RING.lon + SID_RING.theta) / 2
};

/* A name written at the end of its arc stands this far (px, along its
   ring) to the east of the line that ends the arc, clear of that line;
   a name with a subscript is wider and stands further. */
const SID_NAME_ASIDE = 15;
const SID_SUBSCRIPT_ASIDE = 22;

const siderealFigure = {
	canvas: null,
	ctx: null,
	starName: 'Aldebaran',
	state: null,

	init() {
		const figure = byId('sid-canvas').closest('figure');

		squareCanvas(this, byId('sid-canvas'), 480, 30);

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
			H: norm180(theta - star.ra)
		};

		this.showReadout();
		this.draw();
	},

	showReadout() {
		const { jd, lon, thetaG, theta, star, H } = this.state;
		const lonValue = fixed(lon, 2);
		const lonText = `${lonValue.startsWith('-') ? lonValue : `+${lonValue}`}^\\circ`;

		showLines('sid-readout', [
			`d = ${(jd - Time.J2000).toFixed(4)}`,
			`\\theta_G = ${fixedAngle(thetaG, 2)}^\\circ = ${texHms(thetaG)}`,
			`\\theta = \\theta_G ${lonText} = ${fixedAngle(theta, 2)}^\\circ`,
			`\\alpha = ${fixedAngle(star.ra, 2)}^\\circ,\\quad H = ${fixed(H, 2)}^\\circ`
		]);
	},

	draw() {
		if (!this.state) {
			return;
		}

		const ctx = this.ctx;
		const R = this.R;
		const { lon, thetaG, star, H } = this.state;

		// where each line stands, clockwise from the meridian of Greenwich
		const at = { observer: -lon, gamma: thetaG, star: thetaG - star.ra };

		ctx.clearRect(0, 0, this.width, this.width);

		circle(ctx, { x: this.cx, y: this.cy }, SID_RING.equator * R, { color: COL.earth, width: 2 });
		this.drawLines(at);

		// the four angles
		polarArc(this, at.gamma, -star.ra, SID_RING.alpha * R, COL.earth);
		polarArc(this, at.observer, H, SID_RING.H * R, COL.planet);
		polarArc(this, 0, -lon, SID_RING.lon * R, COL.deferent);
		polarArc(this, 0, thetaG, SID_RING.theta * R, COL.epicycle);
		this.drawNames(at);

		this.drawPoints(at);
	},

	/* The two meridians, and the lines from P through the vernal point and
	   the star (its hour circle), each as far as the rings that end on it. */
	drawLines(at) {
		const R = this.R;
		const meridian = { color: COL.deferent, width: 2.5 };

		polarRay(this, at.gamma, SID_RING.theta * R, { color: COL.muted, width: 1, dash: [4, 4] });
		polarRay(this, at.star, SID_RING.H * R, { color: COL.planet, width: 1.5, dash: [5, 4] });
		polarRay(this, at.observer, SID_RING.lon * R, meridian);
		polarRay(this, 0, R + 8, meridian);
		centredLabel(this.ctx, 'Greenwich', { x: this.cx, y: this.cy - R - 20 }, COL.deferent);
	},

	/* The names of the four angles. That of alpha stands a quarter of the
	   way along its arc, which only turns with the sky (at the middle it
	   would sit between the two meridians in the first position of the
	   figure). The other arcs change length, and theta_G and H wrap round
	   as the sky turns, so their names stand at the end of their arcs,
	   which never jumps. */
	drawNames(at) {
		const { star } = this.state;

		this.nameOnRing('α', 'alpha', at.gamma - star.ra / 4, COL.earth);
		this.nameOnRing('ℓ', 'lon', at.observer - this.aside('lon'), COL.deferent);
		this.nameOnRing('H', 'H', at.star - this.aside('H'), COL.planet);
		this.nameOnRing(['θ', 'G'], 'theta', at.gamma - this.aside('theta', SID_SUBSCRIPT_ASIDE), COL.epicycle);
	},

	/* A distance along a ring's names (px) as an angle (deg). */
	aside(ring, distance = SID_NAME_ASIDE) {
		return (distance / (SID_NAME_RADIUS[ring] * this.R)) * R2D;
	},

	/* The name of an angle, at an angle (clockwise from the top) in the
	   room inside its ring. */
	nameOnRing(name, ring, angle, color) {
		angleName(this, name, clockwisePoint(this, angle, SID_NAME_RADIUS[ring] * this.R), color);
	},

	/* The pole, the vernal point and the star. */
	drawPoints(at) {
		const ctx = this.ctx;
		const R = this.R;
		const equator = SID_RING.equator * R;
		const gamma = clockwisePoint(this, at.gamma, equator);
		const star = clockwisePoint(this, at.star, (equator * (90 - this.state.star.dec)) / 90);

		drawDot(ctx, gamma.x, gamma.y, 4.5, COL.ink);
		angleName(this, 'γ', clockwisePoint(this, at.gamma + this.gammaAside(), equator - 15), COL.ink);

		ctx.fillStyle = COL.planet;
		drawStar(ctx, star.x, star.y, STAR_SIZE_CHOSEN, COL.card);

		this.drawPole(at);
	},

	/* The angle (deg) by which the name of the vernal point stands west of
	   it, inside the equator, clear of the line from P. */
	gammaAside() {
		return (SID_NAME_ASIDE / (SID_RING.equator * this.R - 15)) * R2D;
	},

	/* P, named on the side farthest from the four lines that leave it (a
	   single letter may move round its point). */
	drawPole(at) {
		const centre = { x: this.cx, y: this.cy };
		const rays = [0, at.observer, at.gamma, at.star].map(angle => 90 - angle);

		drawDot(this.ctx, centre.x, centre.y, 3.5, COL.ink);
		angleName(this, 'P', towards(centre, clearestDirection(rays), 14), COL.ink);
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
	midnightDay: 0, // the night the star crosses nearest midnight

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
			neverSets: Diurnal.classify(dec, phi) === 'circumpolar',
			dusk: this.dusk(sunDays[day]),
			dawn: 24 + this.dawn(sunDays[day + 1])
		}));

		this.unwrapTransits();
		this.midnightDay = this.nightOfMidnightTransit();
		this.phi = phi;
		this.showReadout();
		this.plot.redraw();
	},

	/* The night on which the star crosses the meridian nearest midnight
	   (24 h on the night axis): the night the read-out starts on. */
	nightOfMidnightTransit() {
		let best = 0;

		this.nights.forEach((night, day) => {
			if (Math.abs(night.inside[0] - 24) < Math.abs(this.nights[best].inside[0] - 24)) {
				best = day;
			}
		});

		return best;
	},

	/* The night the read-out and the dot show: the one under the pointer,
	   or the night of the midnight transit. */
	shownNight() {
		return this.nights[this.hoverDay ?? this.midnightDay];
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
		// always four lines (data-lines): the night, two places for transits
		// (the second is empty on all nights but one a year), the altitude
		const night = this.shownNight();
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
		this.drawShownNight();
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
	   around each copy of the transit line. A star that never sets is up
	   at every hour: one band over the whole plot, since the copies would
	   leave a thin gap between them (they are one solar day apart, and the
	   star is up for one turn of the sky, four minutes less). */
	drawStarHours() {
		const xs = this.nights.map(night => night.day + 0.5);
		const style = { color: COL.planet, alpha: 0.16 };

		if (this.nights.every(night => night.neverSets)) {
			this.plot.band([0, DAYS_IN_YEAR], [12, 12], [36, 36], style);
			return;
		}

		[-24, 0, 24, 48].forEach(shift => {
			const lows = this.nights.map((night, i) => this.unwrapped[i] + shift - night.upHalf);
			const highs = this.nights.map((night, i) => this.unwrapped[i] + shift + night.upHalf);

			this.plot.band(xs, lows, highs, style);
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
	},

	/* A dot on each transit of the night the read-out shows. */
	drawShownNight() {
		const night = this.shownNight();

		night.inside.forEach(hours => {
			this.plot.marker(night.day + 0.5, hours, { color: COL.planet, radius: 5 });
		});
	}
};

/* ==========================================================================
   5. FIGURE 5: THE LENGTH OF THE DAY
   (a) the model Sun's day through the year at the chosen latitude;
   (b) its day against the latitude on three dates, those of the table
	   above the figure (the March equinox and the two solstices), with a
	   line at the chosen latitude: the table's rows are read where the
	   line crosses the curves. Fixed scales: 0 to 24 h, and +-90°.
   ========================================================================== */

/* The dates of panel (b), as in the table of the prose
   (tools/numbers/1.3-clocks.js). Each curve is named by its date, at a
   fixed place of the plot where no curve passes, beside its southern
   half (the places of the page are all in the north, so the line of the
   chosen latitude seldom crosses a name): the geographic latitude (deg)
   where the name starts, and the length of the day (h) it stands on, or
   hangs below ('below'), on the side its curve leaves free. */
const DAY_DATES = [
	{ name: '21 Dec', month: 12, day: 21, label: { phi: -56, hours: 19.3, below: false } },
	{ name: '20 Mar', month: 3, day: 20, label: { phi: -78, hours: 12, below: true } },
	{ name: '21 Jun', month: 6, day: 21, label: { phi: -56, hours: 4.7, below: true } }
];

/* Panel (b) samples the latitude every quarter of a degree: the curves
   are steep where the day reaches 0 h or 24 h. */
const DAY_LATITUDE_STEP = 0.25;

/* The default date of the read-out: the June solstice. */
const JUNE_SOLSTICE_DAY = Time.julianDay(YEAR, 6, 21) - YEAR_START;

const dayLengthFigure = {
	curve: null,
	map: null,
	hoverDay: null,

	init() {
		const figure = byId('day-curve').closest('figure');

		this.tabulateDates();

		this.curve = new Plot2D(byId('day-curve'), {
			x: [0, DAYS_IN_YEAR],
			y: [0, 24],
			xLabel: `date (${YEAR})`,
			yLabel: 'length of the day (h)',
			xTicks: (min, max, count) => MONTH_STARTS.filter((t, i) => count >= 8 || i % 2 === 0),
			yTicks: () => this.hourTicks(),
			aspect: 0.85,
			onDraw: () => this.drawCurve(),
			onHover: day => this.hover(day)
		});

		this.map = new Plot2D(byId('day-map'), {
			x: [-90, 90],
			y: [0, 24],
			xLabel: 'geographic latitude φ (°)',
			yLabel: 'length of the day (h)',
			xTicks: () => this.latitudeTicks(),
			yTicks: () => this.hourTicks(),
			aspect: 0.85,
			onDraw: () => this.drawMap()
		});

		wireSlider(byId('day-lat'), () => this.update(), formatAngle);
		wirePresets(figure);
		this.update();
	},

	/* The same ticks on both panels: every 6 hours, and every 30°. */
	hourTicks() {
		return [0, 6, 12, 18, 24].map(value => ({ value: value, label: String(value) }));
	},

	latitudeTicks() {
		return [-90, -60, -30, 0, 30, 60, 90].map(value => ({ value: value, label: String(value).replace('-', '−') }));
	},

	/* For each date of panel (b): the model Sun's declination, and the
	   length of its day at every latitude. */
	tabulateDates() {
		this.latitudes = [];

		for (let phi = -90; phi <= 90; phi += DAY_LATITUDE_STEP) {
			this.latitudes.push(phi);
		}

		this.dates = DAY_DATES.map(date => {
			const dec = Clock.sunDeclination(Time.julianDay(YEAR, date.month, date.day) + 0.5);

			return {
				name: date.name,
				label: date.label,
				dec: dec,
				hours: this.latitudes.map(phi => this.dayHours(dec, phi))
			};
		});
	},

	/* The length of the day (h) of a Sun at declination dec, at latitude phi. */
	dayHours(dec, phi) {
		return (2 * Diurnal.risingHourAngle(dec, phi, Clock.SUN_HORIZON)) / Clock.SUN_DEGREES_PER_HOUR;
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

	/* Panel (b): the three dates, each named beside its curve, and the
	   chosen latitude, with a dot where it crosses each curve. */
	drawMap() {
		const p = this.map;

		p.frame();

		this.dates.forEach(date => {
			p.curve(this.latitudes, date.hours, { color: COL.sun, width: 2.5 });
			p.text(date.name, date.label.phi, date.label.hours, {
				color: COL.sun,
				kind: 'name',
				baseline: date.label.below ? 'top' : 'bottom',
				dy: date.label.below ? 4 : -4
			});
		});

		p.vline(this.phi, { color: COL.planet, width: 2 });

		this.dates.forEach(date => {
			p.marker(this.phi, this.dayHours(date.dec, this.phi), { color: COL.planet, radius: 4 });
		});
	}
};

/* ==========================================================================
   6. FIGURE 6: THE CLOCK AGAINST THE SUN
   Model minus real, through 2026, at the chosen latitude, on the meridian
   of Greenwich: the time of noon and the length of the day as curves (the
   two errors the text discusses; the latitude moves only the second), and
   the times of sunrise and sunset in the read-out. The reference Sun is
   tabulated every 6 hours at the start and interpolated linearly (under
   0.2" from the full ephemeris). Fixed scale +-20 min: over every
   latitude the slider allows, the two curves stay within -14.2 / +16.5
   min (tools/numbers/1.3-clocks.js).
   ========================================================================== */

const TEST_RANGE = [-20, 20];

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

		Plot2D.legend(byId('test-legend'), [
			{ label: 'noon', color: COL.sun },
			{ label: 'length of the day', color: COL.earth }
		]);

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
		p.curve(xs, this.errors.day, { color: COL.earth, width: 2.5 });
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
