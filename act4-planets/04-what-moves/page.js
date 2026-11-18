// @ts-check
/* ==========================================================================
   PAGE 4.4 · PHASES AND PARALLAX - SCRIPT (page.js)
   Six figures, each with its own init and draw (and update when it has
   controls):
	 1. Venus through a telescope   (2D, static: the real Venus at twelve
									 dates of 2024 - 2026, to scale, east
									 of the Sun in (a) and west of it in (b))
	 2. Copernicus and Tycho        (2D: Venus, the Earth and Mars with the
									 point of the mean Sun fixed (a) and with
									 the Earth fixed (b); date 2010 - 2025,
									 play)
	 3. three orders of Venus       (2D: (a) the drawing from above, (b) the
									 disk seen from O; date over a synodic
									 period, play; views below, around and
									 above the Sun)
	 4. a star's parallax           (2D: (a) the Sun at rest, (b) the Earth
									 at rest, (c) 61 Cygni's place in
									 arcseconds; date over 2026, play)
	 5. the phase and the order     (2D, static: the illuminated fraction
									 against the elongation, the three
									 orders and the real Venus; coded
									 before Figure 4)
	 6. the phase, 2026 - 2033      (2D, static: (a) the real Venus, the
									 order around the Sun and Ptolemy's
									 order; (b) the difference)
   Shared code: common.js, time.js, ephemeris.js, stars.js,
   models/mean-sun.js, models/precession.js, models/planet-epicycle.js,
   models/planet-equant.js, models/planet-arrangement.js, plot2d.js,
   components.js. Every number quoted in the prose comes from
   tools/numbers/4.4-what-moves.js.

   TABLE OF CONTENTS
	 0. Helpers shared by the figures
	 1. Figure 1: Venus through a telescope
	 2. Figure 2: Copernicus and Tycho
	 3. Figure 3: three orders of Venus
	 4. Figure 5: the phase and the order
	 5. Figure 4: a star's parallax
	 6. Figure 6: the phase, 2026 - 2033
	 7. Page start
   ========================================================================== */

/* ==========================================================================
   0. HELPERS SHARED BY THE FIGURES
   ========================================================================== */

/* The direction (deg, anticlockwise from the right, as towards()) of
   screen point b seen from screen point a. */
const screenDirection = (a, b) => atan2d(a.y - b.y, b.x - a.x);

/* A planet's disk of radius R px at (x, y), lit on the fraction k of its
   face, seen by the observer: the lit limb on the side 'litSide' (+1 the
   right, -1 the left). The bright limb is a half circle; the terminator,
   the edge between day and night, is a half ellipse of half-width
   |2k - 1| R, bulging away from the lit limb when k > 1/2 (a gibbous disk)
   and towards it when k < 1/2 (a crescent). The unlit part is drawn as a
   faint dashed outline, so the size of the whole disk shows. */
function drawPhase(ctx, x, y, R, k, litSide) {
	const steps = 48;
	const bulge = (2 * k - 1) * R;

	// the whole disk, faint
	ctx.save();
	ctx.strokeStyle = withAlpha(COL.ink, 0.35);
	ctx.lineWidth = 1;
	ctx.setLineDash([2, 3]);
	ctx.beginPath();
	ctx.arc(x, y, R, 0, TAU);
	ctx.stroke();
	ctx.restore();

	// the lit part: the bright limb from the top to the bottom, then the
	// terminator back up
	ctx.beginPath();

	for (let i = 0; i <= steps; i++) {
		const t = -90 + (180 * i) / steps;

		ctx.lineTo(x + litSide * R * cos(t), y + R * sin(t));
	}

	for (let i = 0; i <= steps; i++) {
		const t = 90 - (180 * i) / steps;

		ctx.lineTo(x - litSide * bulge * cos(t), y + R * sin(t));
	}

	ctx.closePath();
	ctx.fillStyle = withAlpha(COL.sun, 0.55);
	ctx.fill();
	ctx.strokeStyle = COL.ink;
	ctx.lineWidth = 1;
	ctx.stroke();
}

/* The reference Sun's geometric ecliptic longitude and distance. */
const realSun = jd => Ephem.sun(jd, { apparent: false });

/* ==========================================================================
   1. FIGURE 1: VENUS THROUGH A TELESCOPE
   Static. The real Venus (Ephem.phase: its illuminated fraction and its
   apparent diameter) at twelve dates from the superior conjunction of
   4 June 2024 to that of 6 January 2026, all drawn on one scale: six east
   of the Sun (evening), six west of it (morning). The sky is drawn as it
   looks to the south, east on the left, so the Sun is to the right of
   Venus in the evening and to its left in the morning. The largest
   disk, 56.2″ on 12 March 2025, fits a scale set for 60″
   (tools/numbers/4.4-what-moves.js).
   ========================================================================== */

/* The dates of each row, and the largest diameter drawn (″). */
const TELESCOPE_ROWS = {
	east: [
		[2024, 6, 4],
		[2024, 9, 15],
		[2024, 11, 20],
		[2025, 1, 10],
		[2025, 2, 15],
		[2025, 3, 12]
	],
	west: [
		[2025, 4, 3],
		[2025, 4, 25],
		[2025, 5, 31],
		[2025, 8, 15],
		[2025, 10, 25],
		[2026, 1, 6]
	]
};
const TELESCOPE_LARGEST = 60;

/* The room under each disk for its date and elongation (px). */
const TELESCOPE_TEXT = 38;

/* Under this width (px) a row of six dates would overlap: three a line. */
const TELESCOPE_NARROW = 560;

const telescopeFigure = {
	init() {
		this.rows = {};

		Object.entries(TELESCOPE_ROWS).forEach(([side, dates]) => {
			const owner = {
				side,
				disks: dates.map(([y, m, d]) => {
					const jd = Time.julianDay(y, m, d);
					const p = Ephem.phase('venus', jd);
					const sun = Ephem.sun(jd).lon;

					return {
						jd,
						k: p.k,
						diameter: p.diameter,
						elongation: norm180(Ephem.planet('venus', jd).lon - sun)
					};
				}),
				draw: () => this.draw(owner)
			};

			this.rows[side] = owner;
			wideCanvas(owner, byId(`telescope-${side}`), width => this.aspect(width), 700);
		});
	},

	/* The disks of a row in one line, or in two lines of three on a narrow
	   column (a phone), where six dates would not fit side by side. */
	columns(width) {
		return width < TELESCOPE_NARROW ? 3 : 6;
	},

	/* Height / width: a slot of width / columns for each disk, the largest
	   disk nearly filling it, and two lines of text under it. */
	aspect(width) {
		const columns = this.columns(width);
		const slot = width / columns;

		return ((6 / columns) * (0.9 * slot + TELESCOPE_TEXT + 10)) / width;
	},

	draw(owner) {
		const ctx = owner.ctx;

		if (!ctx) {
			return;
		}

		const columns = this.columns(owner.width);
		const slot = owner.width / columns;
		const lineHeight = 0.9 * slot + TELESCOPE_TEXT + 10;
		const pxPerArcsec = (0.88 * slot) / TELESCOPE_LARGEST;

		ctx.clearRect(0, 0, owner.width, owner.height);

		owner.disks.forEach((disk, i) => {
			const x = slot * ((i % columns) + 0.5);
			const top = lineHeight * Math.floor(i / columns);

			// east of the Sun the Sun is to the right (west), and the reverse
			drawPhase(
				ctx,
				x,
				top + 4 + 0.45 * slot,
				(disk.diameter / 2) * pxPerArcsec,
				disk.k,
				disk.elongation >= 0 ? 1 : -1
			);

			ctx.fillStyle = COL.ink;
			ctx.font = FONT_TICK;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'top';
			ctx.fillText(dateYearText(disk.jd), x, top + 6 + 0.9 * slot);
			ctx.fillStyle = COL.muted;
			ctx.fillText(`${Math.round(Math.abs(disk.elongation))}°`, x, top + 6 + 0.9 * slot + 17);
		});
	}
};

/* ==========================================================================
   2. FIGURE 2: COPERNICUS AND TYCHO
   One moment of Venus and Mars, from page 4.3's models
   (PlanetArrangement.moment), in two panels on the same scale (au):
   (a) Copernicus' arrangement, the point of the mean Sun fixed: the
   Earth's circle, Venus' circle and Mars' circle about it; (b) Tycho's
   system, the same places less the Earth's (moment().tychonic): the
   Sun's circle about the Earth, and the two planets' circles carried by
   the Sun, with Mars' path over the last synodic period. The farthest
   point of (b) is 2.672 au from O (tools/numbers/4.4-what-moves.js): the
   scale reaches 2.85 au. The date runs over 2010 - 2025.
   ========================================================================== */

const SYSTEMS_START = Time.julianDay(2010, 1, 1);
const SYSTEMS_ROOM = 2.85;

/* Play: a synodic period of Mars in about twenty seconds. */
const SYSTEMS_DAYS_PER_SECOND = 40;

/* The step of Mars' path (days). */
const SYSTEMS_PATH_STEP = 2;

const systemsFigure = {
	state: null,

	init() {
		this.copernicus = { labels: new LabelPlacer(), draw: () => this.drawCopernicus() };
		this.tycho = { labels: new LabelPlacer(), draw: () => this.drawTycho() };
		squareCanvas(this.copernicus, byId('copernicus-canvas'), 380, 10);
		squareCanvas(this.tycho, byId('tycho-canvas'), 380, 10);

		wireSlider(
			byId('systems-day'),
			() => this.update(),
			value => dateYearText(SYSTEMS_START + Number(value))
		);
		wirePresets(byId('systems-day').closest('figure'));
		wirePlayButton(byId('systems-play'), byId('systems-day'), SYSTEMS_DAYS_PER_SECOND);
		this.update();
	},

	update() {
		const jd = SYSTEMS_START + readNumber('systems-day');

		this.state = {
			jd,
			mars: PlanetArrangement.moment('mars', jd),
			venus: PlanetArrangement.moment('venus', jd),
			path: this.path(jd)
		};
		this.showReadout();
		this.copernicus.draw();
		this.tycho.draw();
	},

	/* Mars' places in Tycho's system over the synodic period before jd. */
	path(jd) {
		const points = [];

		for (let t = jd - PlanetArrangement.FIT.mars.S; t <= jd + 1e-9; t += SYSTEMS_PATH_STEP) {
			points.push(PlanetArrangement.moment('mars', t).tychonic.P);
		}

		return points;
	},

	/* Mars' direction and distance from the Earth, computed in each panel
	   on its own. */
	sight() {
		const h = this.state.mars.heliostatic;
		const t = this.state.mars.tychonic;

		return {
			a: norm360(atan2d(h.P[1] - h.O[1], h.P[0] - h.O[0])),
			b: norm360(atan2d(t.P[1] - t.O[1], t.P[0] - t.O[0])),
			da: Math.hypot(h.P[0] - h.O[0], h.P[1] - h.O[1]),
			db: Math.hypot(t.P[0] - t.O[0], t.P[1] - t.O[1])
		};
	},

	showReadout() {
		const s = this.sight();

		showLines('systems-readout', [
			`\\text{${dateYearText(this.state.jd)}}`,
			`\\lambda_\\text{P} = ${fixedAngle(s.a, 3)}^\\circ \\text{ in (a)},\\quad ${fixedAngle(s.b, 3)}^\\circ \\text{ in (b)}`,
			`\\text{OP} = ${fixed(s.da, 3)} \\text{ in (a)},\\quad ${fixed(s.db, 3)}\\ \\text{au in (b)}`
		]);
	},

	/* The function from points in au to canvas points of a panel. */
	projector(owner) {
		const scale = owner.R / SYSTEMS_ROOM;

		return point => ({ x: owner.cx + scale * point[0], y: owner.cy - scale * point[1] });
	},

	/* What both panels draw: the circles of Venus and Mars about the Sun,
	   the two planets, the lines of sight from O, and the letters. The
	   panels differ in what stands still and in the third circle. */
	drawCommon(owner, places, sunCircle) {
		const ctx = owner.ctx;
		const at = this.projector(owner);
		const scale = owner.R / SYSTEMS_ROOM;
		const { mars, venus } = this.state;
		const O = at(places.mars.O);
		const S = at(places.mars.S);
		const P = at(places.mars.P);
		const V = at(places.venus.P);
		const lambda = mars.lambda;
		const lambdaV = venus.lambda;

		// the circles of Venus and Mars, about the Sun (Mars' about the
		// center C of its deferent, near the Sun)
		circle(ctx, S, PlanetArrangement.FIT.venus.a * scale, { color: COL.epicycle, width: 1.6 });
		circle(ctx, at(places.mars.C), mars.scale * scale, { color: COL.deferent, width: 1.8 });
		circle(ctx, sunCircle.center, scale, { color: sunCircle.color, width: 1.8 });

		// the lines of sight
		segment(ctx, O, towards(O, lambdaV, 2 * owner.R), { color: COL.epicycle, width: 1 });
		segment(ctx, O, towards(O, lambda, 2 * owner.R), { color: COL.planet, width: 1.5 });

		drawDot(ctx, S.x, S.y, 6, COL.sun);
		drawDot(ctx, O.x, O.y, 6, COL.earth);
		drawDot(ctx, V.x, V.y, 5, COL.epicycle);
		drawDot(ctx, P.x, P.y, 6, COL.planet);

		// letters only, each on the side clearest of its lines (CLAUDE.md)
		labelOutside(
			ctx,
			'☉',
			S,
			6,
			clearestDirection([screenDirection(S, O), screenDirection(S, P), screenDirection(S, V), 0]),
			COL.sun,
			owner.labels
		);
		labelOutside(
			ctx,
			'O',
			O,
			7,
			clearestDirection([screenDirection(O, S), lambda, lambdaV]),
			COL.earth,
			owner.labels
		);
		labelOutside(
			ctx,
			'V',
			V,
			6,
			clearestDirection([screenDirection(V, O), screenDirection(V, S)]),
			COL.epicycle,
			owner.labels
		);
		labelOutside(
			ctx,
			'P',
			P,
			7,
			clearestDirection([screenDirection(P, O), screenDirection(P, S)]),
			COL.planet,
			owner.labels
		);
	},

	/* Panel (a): Copernicus, the point of the mean Sun at the center. */
	drawCopernicus() {
		const owner = this.copernicus;
		const ctx = owner.ctx;

		if (!ctx || !this.state) {
			return;
		}

		const places = { mars: this.state.mars.heliostatic, venus: this.state.venus.heliostatic };
		const at = this.projector(owner);
		const center = at([0, 0]);

		ctx.clearRect(0, 0, owner.width, owner.width);
		owner.labels.begin({ x0: 0, y0: 0, x1: owner.width, y1: owner.width });
		segment(ctx, center, towards(center, 0, owner.R), { color: COL.muted, width: 1 });
		centeredLabel(ctx, 'γ', towards(center, 0, owner.R - 8), COL.muted, owner.labels);

		// the Earth's circle about the Sun
		this.drawCommon(owner, places, { center, color: COL.earth });
	},

	/* Panel (b): Tycho, the Earth O at the center. */
	drawTycho() {
		const owner = this.tycho;
		const ctx = owner.ctx;

		if (!ctx || !this.state) {
			return;
		}

		const places = { mars: this.state.mars.tychonic, venus: this.state.venus.tychonic };
		const at = this.projector(owner);
		const center = at([0, 0]);

		ctx.clearRect(0, 0, owner.width, owner.width);
		owner.labels.begin({ x0: 0, y0: 0, x1: owner.width, y1: owner.width });
		segment(ctx, center, towards(center, 0, owner.R), { color: COL.muted, width: 1 });
		centeredLabel(ctx, 'γ', towards(center, 0, owner.R - 8), COL.muted, owner.labels);

		// Mars' path about the Earth over the last synodic period
		ctx.strokeStyle = withAlpha(COL.planet, 0.35);
		ctx.lineWidth = 1.5;
		ctx.setLineDash([]);
		ctx.beginPath();
		this.state.path.map(at).forEach((q, i) => (i === 0 ? ctx.moveTo(q.x, q.y) : ctx.lineTo(q.x, q.y)));
		ctx.stroke();

		// the Sun's circle about the Earth
		this.drawCommon(owner, places, { center, color: COL.sun });
	}
};

/* ==========================================================================
   3. FIGURE 3: THREE ORDERS OF VENUS
   Page 4.3's simple model of Venus (PlanetArrangement.venusPhase), OK = 1,
   with the Sun on the line OK at O sun = ORDERS[view] times OK: below the
   Sun (1.797, Ptolemy's nested spheres: PlanetArrangement.NESTED), around it
   (1), above it (0.2). (a) The drawing from above the ecliptic: the
   Earth O at the center, the deferent, the epicycle about K, the Sun and
   its circle, Venus P with its lit half towards the Sun, the line of
   sight. (b) The disk seen from O, its size proportional to 1 / OP: from
   0.581 to 3.604 times its size at OP = OK (tools/numbers/4.4-what-moves.js),
   the largest filling the panel. The date runs over one synodic period
   from the superior conjunction of 4 June 2024.
   ========================================================================== */

const ORDERS_START = Time.julianDay(2024, 6, 4);

/* The three views: their order (O sun / OK). */
const ORDER_VIEWS = {
	'below the Sun': PlanetArrangement.ORDERS.below,
	'around the Sun': PlanetArrangement.ORDERS.around,
	'above the Sun': PlanetArrangement.ORDERS.above
};

/* The drawing reaches 1.797 (OK = 1): the scale reaches 1.92. */
const ORDERS_ROOM = 1.92;

/* The disk at OP = 1 - r, the largest, fills this fraction of panel (b). */
const ORDERS_LARGEST_DISK = 0.94;

/* Play: a synodic period in about twenty seconds. */
const ORDERS_DAYS_PER_SECOND = 30;

const ordersFigure = {
	view: 'below the Sun',
	state: null,

	init() {
		this.top = { labels: new LabelPlacer(), draw: () => this.drawTop() };
		this.disk = { draw: () => this.drawDisk() };
		squareCanvas(this.top, byId('orders-canvas'), 380, 10);
		squareCanvas(this.disk, byId('disk-canvas'), 260, 6);

		wireSlider(
			byId('orders-day'),
			() => this.update(),
			value => dateYearText(ORDERS_START + Number(value))
		);
		wirePresets(byId('orders-day').closest('figure'));
		wirePlayButton(byId('orders-play'), byId('orders-day'), ORDERS_DAYS_PER_SECOND);
		buildChoice(byId('orders-views'), Object.keys(ORDER_VIEWS), this.view, name => {
			this.view = name;
			this.update();
		});
		this.update();
	},

	update() {
		const jd = ORDERS_START + readNumber('orders-day');
		const ratio = ORDER_VIEWS[this.view];

		this.state = { jd, ratio, now: PlanetArrangement.venusPhase(jd, ratio) };
		this.showReadout();
		this.top.draw();
		this.disk.draw();
	},

	showReadout() {
		const { jd, now } = this.state;

		showLines('orders-readout', [
			`\\text{${dateYearText(jd)}:}\\quad \\lambda - \\bar\\lambda_\\odot = ${fixed(now.elongation, 1).replace('−', '-')}^\\circ`,
			`k = ${fixed(now.k, 2)},\\quad \\chi = ${fixed(now.chi, 0)}^\\circ`,
			`\\text{OP} = ${fixed(now.distance, 2)}\\ \\text{OK}`
		]);
	},

	/* Panel (a): the drawing from above. */
	drawTop() {
		const owner = this.top;
		const ctx = owner.ctx;

		if (!ctx || !this.state) {
			return;
		}

		const { now, ratio } = this.state;
		const scale = owner.R / ORDERS_ROOM;
		const at = point => ({ x: owner.cx + scale * point[0], y: owner.cy - scale * point[1] });
		const O = at([0, 0]);
		const K = at(now.K);
		const P = at(now.P);
		const S = at(now.sun);
		const r = PlanetArrangement.VENUS_FIT.r;
		const sunLon = atan2d(now.K[1], now.K[0]);
		const sightLon = atan2d(now.P[1], now.P[0]);

		ctx.clearRect(0, 0, owner.width, owner.width);
		owner.labels.begin({ x0: 0, y0: 0, x1: owner.width, y1: owner.width });

		// the Sun's circle about O, the deferent, the epicycle
		circle(ctx, O, ratio * scale, { color: COL.sun, width: 1.2, dash: [5, 4] });
		circle(ctx, O, scale, { color: COL.deferent, width: 2 });
		circle(ctx, K, r * scale, { color: COL.epicycle, width: 2 });

		// the line to the Sun through K, the line of sight
		segment(ctx, O, towards(O, sunLon, owner.R), { color: COL.sun, width: 1, dash: [2, 4] });
		segment(ctx, O, towards(O, sightLon, owner.R), { color: COL.planet, width: 1.5 });

		drawDot(ctx, O.x, O.y, 6, COL.earth);
		drawDot(ctx, K.x, K.y, 3.5, COL.ink);
		drawDot(ctx, S.x, S.y, 7, COL.sun);

		// Venus: a small disk, its half towards the Sun lit
		this.drawLitBall(ctx, P, 7.5, screenDirection(P, S));

		labelOutside(ctx, 'O', O, 7, clearestDirection([sunLon, sightLon, sunLon + 180]), COL.earth, owner.labels);
		labelOutside(
			ctx,
			'K',
			K,
			4,
			clearestDirection([screenDirection(K, O), screenDirection(K, P), sunLon]),
			COL.ink,
			owner.labels
		);
		labelOutside(
			ctx,
			'☉',
			S,
			7,
			clearestDirection([screenDirection(S, O), sunLon, screenDirection(S, P)]),
			COL.sun,
			owner.labels
		);
		labelOutside(
			ctx,
			'P',
			P,
			8,
			clearestDirection([screenDirection(P, O), screenDirection(P, K), screenDirection(P, S)]),
			COL.planet,
			owner.labels
		);
	},

	/* A small ball at p, its half facing the direction 'toSun' (screen
	   longitude) lit. */
	drawLitBall(ctx, p, radius, toSun) {
		ctx.fillStyle = COL.card;
		ctx.beginPath();
		ctx.arc(p.x, p.y, radius, 0, TAU);
		ctx.fill();
		ctx.fillStyle = withAlpha(COL.sun, 0.85);
		ctx.beginPath();
		ctx.arc(p.x, p.y, radius, (-toSun - 90) * D2R, (-toSun + 90) * D2R);
		ctx.closePath();
		ctx.fill();
		ctx.strokeStyle = COL.ink;
		ctx.lineWidth = 1.2;
		ctx.beginPath();
		ctx.arc(p.x, p.y, radius, 0, TAU);
		ctx.stroke();
	},

	/* Panel (b): the disk seen from O, east to the left: the Sun is to
	   the right of Venus when Venus is east of it. */
	drawDisk() {
		const owner = this.disk;
		const ctx = owner.ctx;

		if (!ctx || !this.state) {
			return;
		}

		const { now } = this.state;
		const r = PlanetArrangement.VENUS_FIT.r;
		const largest = 1 / (1 - r);
		const R = (ORDERS_LARGEST_DISK * owner.R) / now.distance / largest;

		ctx.clearRect(0, 0, owner.width, owner.width);
		drawPhase(ctx, owner.cx, owner.cy, R, now.k, now.elongation >= 0 ? 1 : -1);
	}
};

/* ==========================================================================
   4. FIGURE 5: THE PHASE AND THE ORDER
   Static. The illuminated fraction k against the elongation over one
   synodic period from the superior conjunction of 4 June 2024: the three
   orders of Figure 3 (curves, PlanetArrangement.venusPhase) and the real
   Venus (dots every 6 days, Ephem.phase). The elongations stay within
   47.2° (tools/numbers/4.4-what-moves.js): the axis runs from -50° to 50°.
   ========================================================================== */

const PHASE_RANGE_X = [-50, 50];
const PHASE_RANGE_K = [0, 1];

/* The three orders and their colours, named in the legend under the
   plot. */
const PHASE_ORDERS = [
	{ name: 'below the Sun', ratio: PlanetArrangement.ORDERS.below, color: COL.epicycle },
	{ name: 'around the Sun', ratio: PlanetArrangement.ORDERS.around, color: COL.deferent },
	{ name: 'above the Sun', ratio: PlanetArrangement.ORDERS.above, color: COL.earth }
];

/* Under this plot width (px) the dots of the real Venus are drawn smaller,
   so that they stay apart. */
const PHASE_NARROW = 500;

const phaseFigure = {
	samples: null,

	init() {
		const period = PlanetArrangement.FIT.venus.S;

		this.samples = {
			orders: PHASE_ORDERS.map(order => {
				const xs = [];
				const ks = [];

				for (let day = 0; day <= period; day += 1) {
					const p = PlanetArrangement.venusPhase(ORDERS_START + day, order.ratio);

					xs.push(p.elongation);
					ks.push(p.k);
				}

				return { order, xs, ks };
			}),
			real: []
		};

		for (let day = 0; day <= period; day += 6) {
			const jd = ORDERS_START + day;
			const elongation = norm180(Ephem.planet('venus', jd).lon - Ephem.sun(jd).lon);

			this.samples.real.push({ x: elongation, k: Ephem.phase('venus', jd).k });
		}

		this.plot = new Plot2D(byId('phase-plot'), {
			x: PHASE_RANGE_X,
			y: PHASE_RANGE_K,
			xLabel: 'elongation from the Sun, east positive (°)',
			yLabel: 'illuminated fraction k',
			aspect: 0.55,
			maxHeight: 380,
			minHeight: 240,
			onDraw: () => this.draw()
		});

		Plot2D.legend(byId('phase-legend'), [
			...PHASE_ORDERS.map(order => ({ label: order.name, color: order.color })),
			{ label: 'the real Venus', color: COL.planet, mark: 'dot' }
		]);
	},

	draw() {
		const p = this.plot;

		if (!this.samples) {
			return;
		}

		p.frame();
		p.hline(0.5, { color: COL.muted, width: 1, dash: [3, 4] });

		this.samples.orders.forEach(({ order, xs, ks }) => {
			p.curve(xs, ks, { color: order.color, width: 2 });
		});

		const radius = p.width < PHASE_NARROW ? 2.4 : 3.5;

		this.samples.real.forEach(point => p.marker(point.x, point.k, { color: COL.planet, radius }));
	}
};

/* ==========================================================================
   5. FIGURE 4: A STAR'S PARALLAX
   61 Cygni (Stars.find, with its parallax) over 2026. (a) The Sun at
   rest: the Earth on its circle (the reference Sun's distance and
   ecliptic longitude), the star drawn in the ecliptic plane at its
   ecliptic longitude, 3 au from the Sun (not to scale), the lines of
   sight from the Earth and from the Sun. (b) The same with the Earth at
   rest: the Sun on its circle about O, the star on a circle of the same
   size about its place in (a), turning with the Sun; Tycho's star, at
   rest on its sphere about the Earth, faint. (c) The star's place on the
   sky relative to Tycho's, in arcseconds (Stars.parallax), east on the
   left: within 0.290″ (tools/numbers/4.4-what-moves.js), so the axes are
   ±0.35″.
   ========================================================================== */

const PARALLAX_START = Time.julianDay(2026, 1, 1);
const PARALLAX_STAR = Stars.find('61 Cygni');
const PARALLAX_DRAWN_AU = 3;
const PARALLAX_ROOM = PARALLAX_DRAWN_AU / 2 + 1.25;
const PARALLAX_RANGE = 0.35;

/* Play: a year in about twelve seconds. */
const PARALLAX_DAYS_PER_SECOND = 30;

/* Ticks every 0.1″ on the axes of (c), from left to right (the x axis
   runs from east to west, so its values decrease). */
const TENTHS = [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3];
const tenthTicksX = () =>
	TENTHS.slice()
		.reverse()
		.map(value => ({ value, label: fixed(value, 1) }));
const tenthTicksY = () => TENTHS.map(value => ({ value, label: fixed(value, 1) }));

const parallaxFigure = {
	state: null,

	init() {
		const jd = PARALLAX_START;
		const p = Stars.atEpoch(PARALLAX_STAR, jd);
		const eq = Ephem.precessEquatorial(p.ra, p.dec, Time.J2000, jd);

		this.starLon = Ephem.equatorialToEcliptic(eq.ra, eq.dec, Ephem.meanObliquity(jd)).lon;
		this.path = [];

		for (let day = 0; day <= 366; day += 2) {
			this.path.push(Stars.parallax(PARALLAX_STAR, jd + day));
		}

		this.sunFrame = { labels: new LabelPlacer(), draw: () => this.drawSunAtRest() };
		this.earthFrame = { labels: new LabelPlacer(), draw: () => this.drawEarthAtRest() };
		squareCanvas(this.sunFrame, byId('parallax-sun'), 380, 10);
		squareCanvas(this.earthFrame, byId('parallax-earth'), 380, 10);

		this.sky = new Plot2D(byId('parallax-sky'), {
			x: [PARALLAX_RANGE, -PARALLAX_RANGE],
			y: [-PARALLAX_RANGE, PARALLAX_RANGE],
			xTicks: tenthTicksX,
			yTicks: tenthTicksY,
			xLabel: 'along the ecliptic, east to the left (″)',
			yLabel: 'ecliptic latitude (″)',
			aspect: 0.96,
			maxHeight: 440,
			minHeight: 240,
			onDraw: () => this.drawSky()
		});

		wireSlider(
			byId('parallax-day'),
			() => this.update(),
			value => dateYearText(PARALLAX_START + Number(value))
		);
		wirePresets(byId('parallax-day').closest('figure'));
		wirePlayButton(byId('parallax-play'), byId('parallax-day'), PARALLAX_DAYS_PER_SECOND);
		this.update();
	},

	update() {
		const jd = PARALLAX_START + readNumber('parallax-day');
		const sun = realSun(jd);

		this.state = { jd, sun, shift: Stars.parallax(PARALLAX_STAR, jd) };
		this.showReadout();
		this.sunFrame.draw();
		this.earthFrame.draw();
		this.sky.redraw();
	},

	showReadout() {
		const { jd, shift } = this.state;

		showLines('parallax-readout', [
			`\\text{${dateYearText(jd)}}`,
			`\\Delta\\lambda\\cos\\beta = ${fixed(shift.dlon, 3).replace('−', '-')}'',\\quad \\Delta\\beta = ${fixed(shift.dlat, 3).replace('−', '-')}''`
		]);
	},

	/* The star's place in the drawings (au, the Sun at the origin). */
	starPlace() {
		return [PARALLAX_DRAWN_AU * cos(this.starLon), PARALLAX_DRAWN_AU * sin(this.starLon)];
	},

	/* A four-pointed star at a canvas point, in the colour of the chosen
	   star, or faint for Tycho's star at rest. */
	drawMark(ctx, point, faint) {
		ctx.save();
		ctx.globalAlpha = faint ? 0.4 : 1;
		ctx.fillStyle = COL.planet;
		drawStar(ctx, point.x, point.y, STAR_SIZE_CHOSEN, COL.card);
		ctx.restore();
	},

	/* Panel (a): the Sun at rest. */
	drawSunAtRest() {
		const owner = this.sunFrame;
		const ctx = owner.ctx;

		if (!ctx || !this.state) {
			return;
		}

		const { sun } = this.state;
		const scale = owner.R / PARALLAX_ROOM;
		const place = this.starPlace();

		// the drawing is centered halfway between the Sun and the star
		const at = q => ({ x: owner.cx + scale * (q[0] - place[0] / 2), y: owner.cy - scale * (q[1] - place[1] / 2) });
		const S = at([0, 0]);
		const O = at([-sun.dist * cos(sun.lon), -sun.dist * sin(sun.lon)]);
		const star = at(place);

		ctx.clearRect(0, 0, owner.width, owner.width);
		owner.labels.begin({ x0: 0, y0: 0, x1: owner.width, y1: owner.width });

		circle(ctx, S, scale, { color: COL.earth, width: 1.8 });
		segment(ctx, S, star, { color: COL.ink, width: 1, dash: [4, 4] });
		segment(ctx, O, star, { color: COL.planet, width: 1.5 });

		drawDot(ctx, S.x, S.y, 7, COL.sun);
		drawDot(ctx, O.x, O.y, 6, COL.earth);
		this.drawMark(ctx, star, false);

		labelOutside(
			ctx,
			'☉',
			S,
			7,
			clearestDirection([screenDirection(S, O), screenDirection(S, star)]),
			COL.sun,
			owner.labels
		);
		labelOutside(
			ctx,
			'O',
			O,
			7,
			clearestDirection([screenDirection(O, S), screenDirection(O, star)]),
			COL.earth,
			owner.labels
		);
		centeredLabel(ctx, '61 Cygni', { x: star.x, y: star.y - 22 }, COL.planet, owner.labels);
	},

	/* Panel (b): the Earth at rest. */
	drawEarthAtRest() {
		const owner = this.earthFrame;
		const ctx = owner.ctx;

		if (!ctx || !this.state) {
			return;
		}

		const { sun } = this.state;
		const scale = owner.R / PARALLAX_ROOM;
		const sunPlace = [sun.dist * cos(sun.lon), sun.dist * sin(sun.lon)];
		const place = this.starPlace();

		// the drawing is centered halfway between O and Tycho's star
		const shift = [-place[0] / 2, -place[1] / 2];
		const at = q => ({ x: owner.cx + scale * (q[0] + shift[0]), y: owner.cy - scale * (q[1] + shift[1]) });
		const O = at([0, 0]);
		const S = at(sunPlace);
		const tycho = at(place);
		const star = at([place[0] + sunPlace[0], place[1] + sunPlace[1]]);

		ctx.clearRect(0, 0, owner.width, owner.width);
		owner.labels.begin({ x0: 0, y0: 0, x1: owner.width, y1: owner.width });

		circle(ctx, O, scale, { color: COL.sun, width: 1.8 });
		circle(ctx, tycho, scale, { color: COL.sun, width: 1.2, dash: [5, 4] });
		segment(ctx, O, tycho, { color: COL.ink, width: 1, dash: [4, 4] });
		segment(ctx, O, star, { color: COL.planet, width: 1.5 });

		drawDot(ctx, O.x, O.y, 6, COL.earth);
		drawDot(ctx, S.x, S.y, 7, COL.sun);
		this.drawMark(ctx, tycho, true);
		this.drawMark(ctx, star, false);

		labelOutside(
			ctx,
			'O',
			O,
			7,
			clearestDirection([screenDirection(O, S), screenDirection(O, star), screenDirection(O, tycho)]),
			COL.earth,
			owner.labels
		);
		labelOutside(ctx, '☉', S, 7, clearestDirection([screenDirection(S, O)]), COL.sun, owner.labels);
		centeredLabel(ctx, 'T', { x: tycho.x + 14, y: tycho.y + 14 }, COL.planet, owner.labels);
	},

	/* Panel (c): the place on the sky, relative to Tycho's star. */
	drawSky() {
		const p = this.sky;

		if (!this.state) {
			return;
		}

		p.frame();
		p.curve(
			this.path.map(q => q.dlon),
			this.path.map(q => q.dlat),
			{ color: COL.planet, width: 1.2, alpha: 0.45 }
		);
		p.star(0, 0, { color: COL.planet, alpha: 0.4, ring: true });
		p.star(this.state.shift.dlon, this.state.shift.dlat, { color: COL.planet, ring: true });
		p.text('T', 0, 0, { color: COL.planet, kind: 'symbol', dx: 8, dy: 22 });
	}
};

/* ==========================================================================
   6. FIGURE 6: THE PHASE, 2026 - 2033
   Static, every day. (a) The illuminated fraction of the real Venus
   (Ephem.phase), of page 4.3's Venus with the Sun at K (the order around
   the Sun), and of Ptolemy's order (the Sun at 1.797 OK, faint and dashed);
   (b) the order around the Sun less the real Venus, within 0.029
   (tools/numbers/4.4-what-moves.js): the axis is ±0.04.
   ========================================================================== */

const TEST_START = Time.julianDay(2026, 1, 1);
const TEST_END = Time.julianDay(2034, 1, 1);
const TEST_ERROR_RANGE = [-0.04, 0.04];

const testFigure = {
	samples: null,

	init() {
		const xs = [];
		const real = [];
		const around = [];
		const below = [];
		const errors = [];

		for (let jd = TEST_START; jd <= TEST_END; jd += 1) {
			const k = Ephem.phase('venus', jd).k;
			const model = PlanetArrangement.venusPhase(jd, PlanetArrangement.ORDERS.around).k;

			xs.push(yearOf(jd));
			real.push(k);
			around.push(model);
			below.push(PlanetArrangement.venusPhase(jd, PlanetArrangement.ORDERS.below).k);
			errors.push(model - k);
		}

		this.samples = { xs, real, around, below, errors };

		const options = {
			x: [yearOf(TEST_START), yearOf(TEST_END)],
			xLabel: 'year',
			aspect: 0.36,
			maxHeight: 280,
			minHeight: 200
		};

		this.phase = new Plot2D(
			byId('test-phase'),
			Object.assign({}, options, {
				y: PHASE_RANGE_K,
				yLabel: 'k',
				onDraw: () => this.drawPhase()
			})
		);
		this.error = new Plot2D(
			byId('test-error'),
			Object.assign({}, options, {
				y: TEST_ERROR_RANGE,
				yLabel: 'model − real',
				aspect: 0.28,
				onDraw: () => this.drawError()
			})
		);
	},

	drawPhase() {
		const p = this.phase;

		if (!this.samples) {
			return;
		}

		const { xs, real, around, below } = this.samples;

		p.frame();
		p.curve(xs, below, { color: COL.epicycle, width: 1.5, dash: [6, 5], alpha: 0.6 });
		p.curve(xs, real, { color: COL.planet, width: 3.5 });
		p.curve(xs, around, { color: COL.deferent, width: 1.5 });
	},

	drawError() {
		const p = this.error;

		if (!this.samples) {
			return;
		}

		p.frame();
		p.hline(0, { color: COL.ink, width: 1 });
		p.curve(this.samples.xs, this.samples.errors, { color: COL.deferent, width: 1.6 });
	}
};

/* ==========================================================================
   7. PAGE START
   Shared components first (they typeset the prose), then the figures.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
	Site.initPage();
	startFigures([telescopeFigure, systemsFigure, ordersFigure, phaseFigure, parallaxFigure, testFigure]);
});
