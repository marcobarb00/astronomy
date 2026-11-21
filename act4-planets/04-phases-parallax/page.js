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
	 3. three orders of Venus       (2D: (a) the drawing from above, with
									 the Sun below, around and above Venus,
									 (b) the disk seen from O in the three
									 orders; date over a synodic period,
									 play)
	 4. a star's parallax           (2D: (a) the Earth at rest, Tycho's
									 star and Copernicus', (b) 61 Cygni's
									 place in arcseconds; date over 2026,
									 play)
	 5. the phase and the order     (2D, static: the illuminated fraction
									 at greatest elongation against the
									 order, with the real Venus at the 50
									 greatest elongations of the fit)
	 6. the phase, 2026 - 2033      (2D, static: (a) the real Venus, the
									 order around the Sun and Ptolemy's
									 order; (b) the difference)
   Shared code: common.js, time.js, ephemeris.js, stars.js,
   models/mean-sun.js, models/precession.js, models/planet-epicycle.js,
   models/planet-equant.js, models/planet-arrangement.js, plot2d.js,
   components.js. Every number quoted in the prose comes from
   tools/numbers/4.4-phases-parallax.js.

   TABLE OF CONTENTS
	 0. Helpers shared by the figures
	 1. Figure 1: Venus through a telescope
	 2. Figure 2: Copernicus and Tycho
	 3. Figure 3: three orders of Venus
	 4. Figure 4: a star's parallax
	 5. Figure 5: the phase at greatest elongation and the order
	 6. Figure 6: the phase, 2026 - 2033
	 7. Page start
   ========================================================================== */

/* ==========================================================================
   0. HELPERS SHARED BY THE FIGURES
   ========================================================================== */

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
   (tools/numbers/4.4-phases-parallax.js).
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
			canvasText(ctx, dateYearText(disk.jd), x, top + 6 + 0.9 * slot);
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
   the Sun. Both panels shade the triangle O sun P, with its sides O sun
   and sun P dashed (page 4.3's parallelogram, cut along OP): the same
   triangle, moved, so OP has the same direction in both. The farthest
   point of (b) is 2.672 au from O (tools/numbers/4.4-phases-parallax.js): the
   scale reaches 2.85 au. The date runs over 2010 - 2025.
   ========================================================================== */

const SYSTEMS_START = Time.julianDay(2010, 1, 1);
const SYSTEMS_ROOM = 2.85;

/* Play: a synodic period of Mars in about twenty seconds. */
const SYSTEMS_DAYS_PER_SECOND = 40;

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
			venus: PlanetArrangement.moment('venus', jd)
		};
		this.showReadout();
		this.copernicus.draw();
		this.tycho.draw();
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

	/* The triangle O sun P of Mars, shaded, with its sides O sun and
	   sun P dashed; its third side, OP, is the line of sight. */
	drawTriangle(ctx, O, S, P) {
		ctx.fillStyle = withAlpha(COL.ink, 0.1);
		ctx.beginPath();
		ctx.moveTo(O.x, O.y);
		ctx.lineTo(S.x, S.y);
		ctx.lineTo(P.x, P.y);
		ctx.closePath();
		ctx.fill();
		segment(ctx, O, S, { color: COL.ink, width: 1.2, dash: [5, 4] });
		segment(ctx, S, P, { color: COL.ink, width: 1.2, dash: [5, 4] });
	},

	/* What both panels draw: the circles of Venus and Mars about the Sun,
	   Mars' triangle O sun P, the planets, Mars' line of sight from O,
	   and the letters. The panels differ in what stands still and in the
	   third circle. */
	drawCommon(owner, places, sunCircle) {
		const ctx = owner.ctx;
		const at = this.projector(owner);
		const scale = owner.R / SYSTEMS_ROOM;
		const { mars } = this.state;
		const O = at(places.mars.O);
		const S = at(places.mars.S);
		const P = at(places.mars.P);
		const V = at(places.venus.P);
		const lambda = mars.lambda;

		// the circles of Venus and Mars, about the Sun (Mars' about the
		// center C of its deferent, near the Sun)
		circle(ctx, S, PlanetArrangement.FIT.venus.a * scale, { color: COL.epicycle, width: 1.6 });
		circle(ctx, at(places.mars.C), mars.scale * scale, { color: COL.deferent, width: 1.8 });
		circle(ctx, sunCircle.center, scale, { color: sunCircle.color, width: 1.8 });

		// Mars' triangle, then its line of sight
		this.drawTriangle(ctx, O, S, P);
		segment(ctx, O, towards(O, lambda, 2 * owner.R), { color: COL.planet, width: 1.5 });

		drawDot(ctx, S.x, S.y, 6, COL.sun);
		drawDot(ctx, O.x, O.y, 6, COL.earth);
		drawDot(ctx, V.x, V.y, 5, COL.epicycle);
		drawDot(ctx, P.x, P.y, 6, COL.planet);

		// letters only (CLAUDE.md), each on a side of its point that turns
		// smoothly with the drawing, so that it passes over a line for a
		// moment rather than jumping to the other side of its point: the
		// Sun opposite the Earth, O outward from the Sun, V inside its
		// circle, towards the Sun, P off the line of sight, which it never
		// crosses
		labelOutside(ctx, '☉', S, 6, screenDirection(O, S), COL.sun, owner.labels);
		labelOutside(ctx, 'O', O, 7, screenDirection(S, O), COL.earth, owner.labels);
		labelOutside(ctx, 'V', V, 6, screenDirection(V, S), COL.epicycle, owner.labels);
		labelOutside(ctx, 'P', P, 7, lambda + SIGHT_NAME_TURN, COL.planet, owner.labels);
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

		// the Sun's circle about the Earth
		this.drawCommon(owner, places, { center, color: COL.sun });
	}
};

/* ==========================================================================
   3. FIGURE 3: THREE ORDERS OF VENUS
   Page 4.3's simple model of Venus (PlanetArrangement.venusPhase), OK = 1,
   with the Sun on the line OK in the three orders at once: below the Sun
   (O sun = 1.797 OK, Ptolemy's nested spheres: PlanetArrangement.NESTED),
   around it (1) and above it (0.2). (a) The drawing from above the
   ecliptic: the Earth O at the center, the deferent, the epicycle about
   K, Venus P, the line of sight, and the three Suns on the line OK, with
   the sunlight reaching P from each (dashed). (b) The disk seen from O in
   the three orders, side by side: one size, proportional to 1 / OP, from
   0.581 to 3.604 times its size at OP = OK
   (tools/numbers/4.4-phases-parallax.js), the largest nearly filling its
   slot; under each, the order and its illuminated fraction. The date runs
   over one synodic period from the superior conjunction of 4 June 2024.
   ========================================================================== */

const ORDERS_START = Time.julianDay(2024, 6, 4);

/* The three disks of (b), from left to right: their name and their order
   (O sun / OK). */
const ORDER_DISKS = [
	{ name: tr('below', 'sotto'), ratio: PlanetArrangement.ORDERS.below },
	{ name: tr('around', 'attorno'), ratio: PlanetArrangement.ORDERS.around },
	{ name: tr('above', 'sopra'), ratio: PlanetArrangement.ORDERS.above }
];

/* The drawing reaches 1.797 (OK = 1): the scale reaches 1.92. */
const ORDERS_ROOM = 1.92;

/* K's name in (a) stands this far (deg) clockwise from the line OK, clear
   of it and of the deferent, as on page 4.1. */
const K_NAME_TURN = 45;

/* The disk at OP = 1 - r, the largest, fills this fraction of its slot
   in (b); under it, room for two lines of text (px). */
const ORDERS_LARGEST_DISK = 0.9;
const ORDERS_DISK_TEXT = 44;

/* Play: a synodic period in about twenty seconds. */
const ORDERS_DAYS_PER_SECOND = 30;

const ordersFigure = {
	state: null,

	init() {
		this.top = { labels: new LabelPlacer(), draw: () => this.drawTop() };
		this.disks = { draw: () => this.drawDisks() };
		squareCanvas(this.top, byId('orders-canvas'), 380, 10);
		wideCanvas(this.disks, byId('disk-canvas'), width => this.diskAspect(width), 620);

		wireSlider(
			byId('orders-day'),
			() => this.update(),
			value => dateYearText(ORDERS_START + Number(value))
		);
		wirePresets(byId('orders-day').closest('figure'));
		wirePlayButton(byId('orders-play'), byId('orders-day'), ORDERS_DAYS_PER_SECOND);
		this.update();
	},

	update() {
		const jd = ORDERS_START + readNumber('orders-day');

		this.state = {
			jd,
			phases: ORDER_DISKS.map(order => PlanetArrangement.venusPhase(jd, order.ratio))
		};
		this.showReadout();
		this.top.draw();
		this.disks.draw();
	},

	/* The elongation and the distance are the same in every order: read
	   them from the first. */
	showReadout() {
		const { jd, phases } = this.state;
		const now = phases[0];

		showLines('orders-readout', [
			`\\text{${dateYearText(jd)}:}\\quad \\lambda - \\bar\\lambda_\\odot = ${fixed(now.elongation, 1).replace('−', '-')}^\\circ`,
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

		const now = this.state.phases[0];
		const scale = owner.R / ORDERS_ROOM;
		const at = point => ({ x: owner.cx + scale * point[0], y: owner.cy - scale * point[1] });
		const O = at([0, 0]);
		const K = at(now.K);
		const P = at(now.P);
		const suns = this.state.phases.map(phase => at(phase.sun));
		const r = PlanetArrangement.VENUS_FIT.r;
		const sunLon = atan2d(now.K[1], now.K[0]);
		const sightLon = atan2d(now.P[1], now.P[0]);

		ctx.clearRect(0, 0, owner.width, owner.width);
		owner.labels.begin({ x0: 0, y0: 0, x1: owner.width, y1: owner.width });

		// the deferent, the epicycle
		circle(ctx, O, scale, { color: COL.deferent, width: 2 });
		circle(ctx, K, r * scale, { color: COL.epicycle, width: 2 });

		// the line OK out to the farthest Sun, the sunlight on P from each
		// Sun, the line of sight
		segment(ctx, O, towards(O, sunLon, owner.R), { color: COL.sun, width: 1, dash: [2, 4] });
		suns.forEach(S => segment(ctx, S, P, { color: COL.sun, width: 1.2, dash: [5, 4] }));
		segment(ctx, O, towards(O, sightLon, owner.R), { color: COL.planet, width: 1.5 });

		drawDot(ctx, O.x, O.y, 6, COL.earth);
		suns.forEach(S => drawDot(ctx, S.x, S.y, 5.5, COL.sun));
		drawDot(ctx, K.x, K.y, 2.5, COL.ink, false);
		drawDot(ctx, P.x, P.y, 6, COL.planet);

		// letters only (CLAUDE.md), each on a side of its point that turns
		// smoothly with the drawing, so that it passes over a line for a
		// moment rather than jumping to the other side of its point: O
		// opposite the line of sight, K behind the line OK, P off the line
		// of sight, which it never crosses
		labelOutside(ctx, 'O', O, 7, sightLon + 180, COL.earth, owner.labels);
		labelOutside(ctx, 'K', K, 6, sunLon - K_NAME_TURN, COL.ink, owner.labels);
		labelOutside(ctx, 'P', P, 7, sightLon + SIGHT_NAME_TURN, COL.planet, owner.labels);
	},

	/* Height / width of (b): three slots side by side, the largest disk
	   nearly filling one, and two lines of text under it. */
	diskAspect(width) {
		const slot = width / ORDER_DISKS.length;

		return (ORDERS_LARGEST_DISK * slot + ORDERS_DISK_TEXT + 8) / width;
	},

	/* Panel (b): the disk seen from O in each order, east to the left:
	   the Sun is to the right of Venus when Venus is east of it. Under
	   each disk, the order and its illuminated fraction. */
	drawDisks() {
		const owner = this.disks;
		const ctx = owner.ctx;

		if (!ctx || !this.state) {
			return;
		}

		const r = PlanetArrangement.VENUS_FIT.r;
		const slot = owner.width / ORDER_DISKS.length;
		const largest = 1 / (1 - r);
		const centerY = (ORDERS_LARGEST_DISK * slot) / 2 + 2;
		const textY = ORDERS_LARGEST_DISK * slot + 6;

		ctx.clearRect(0, 0, owner.width, owner.height);

		this.state.phases.forEach((phase, i) => {
			const x = slot * (i + 0.5);
			const R = (ORDERS_LARGEST_DISK * slot) / 2 / phase.distance / largest;

			drawPhase(ctx, x, centerY, R, phase.k, phase.elongation >= 0 ? 1 : -1);

			ctx.textAlign = 'center';
			ctx.textBaseline = 'top';
			ctx.fillStyle = COL.ink;
			ctx.font = FONT_NAME;
			ctx.fillText(ORDER_DISKS[i].name, x, textY);
			ctx.font = FONT_TICK;
			canvasText(ctx, `k = ${fixed(phase.k, 2)}`, x, textY + 22);
		});
	}
};

/* ==========================================================================
   4. FIGURE 4: A STAR'S PARALLAX
   61 Cygni (Stars.find, with its parallax) over 2026. (a) Copernicus'
   arrangement with the Earth at rest: the Sun on its circle about O (the
   reference Sun's distance and ecliptic longitude), Tycho's star T, at
   rest, drawn in the ecliptic plane at the star's ecliptic longitude,
   3 au from O (not to scale), faint, and Copernicus' star on a circle of
   1 au about T, turning with the Sun; the lines of sight to both.
   (b) The star's place on the sky relative to T, in arcseconds
   (Stars.parallax), east on the left: within 0.290″
   (tools/numbers/4.4-phases-parallax.js), so the axes are ±0.35″.
   ========================================================================== */

const PARALLAX_START = Time.julianDay(2026, 1, 1);
const PARALLAX_STAR = Stars.find('61 Cygni');
const PARALLAX_DRAWN_AU = 3;
const PARALLAX_ROOM = PARALLAX_DRAWN_AU / 2 + 1.25;
const PARALLAX_RANGE = 0.35;

/* Play: a year in about twelve seconds. */
const PARALLAX_DAYS_PER_SECOND = 30;

/* Ticks every 0.1″ on the axes of (b), from left to right (the x axis
   runs from east to west, so its values decrease), with a true minus
   sign. */
const TENTHS = [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3];
const tenthLabel = value => fixed(value, 1).replace('-', '−');
const tenthTicksX = () =>
	TENTHS.slice()
		.reverse()
		.map(value => ({ value, label: tenthLabel(value) }));
const tenthTicksY = () => TENTHS.map(value => ({ value, label: tenthLabel(value) }));

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

		this.earthFrame = { labels: new LabelPlacer(), draw: () => this.drawEarthAtRest() };
		squareCanvas(this.earthFrame, byId('parallax-earth'), 380, 10);

		this.sky = new Plot2D(byId('parallax-sky'), {
			x: [PARALLAX_RANGE, -PARALLAX_RANGE],
			y: [-PARALLAX_RANGE, PARALLAX_RANGE],
			xTicks: tenthTicksX,
			yTicks: tenthTicksY,
			xLabel: tr('along the ecliptic, east to the left (″)', 'lungo l’eclittica, est a sinistra (″)'),
			yLabel: tr('ecliptic latitude (″)', 'latitudine eclittica (″)'),
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

	/* Tycho's star in the drawing (au, the Earth at the origin), at the
	   star's ecliptic longitude: Copernicus' star seen from the Sun. */
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

	/* Panel (a): the Earth at rest. */
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

		// O on the side away from Tycho's star, which stays still, and the
		// Sun outward from O: the Sun's line passes over O's name for a
		// moment once a year
		labelOutside(ctx, 'O', O, 7, screenDirection(tycho, O), COL.earth, owner.labels);
		labelOutside(ctx, '☉', S, 7, screenDirection(O, S), COL.sun, owner.labels);
		centeredLabel(ctx, 'T', { x: tycho.x + 14, y: tycho.y + 14 }, COL.planet, owner.labels);
	},

	/* Panel (b): the place on the sky, relative to Tycho's star. */
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
   5. FIGURE 5: THE PHASE AT GREATEST ELONGATION AND THE ORDER
   Static. The illuminated fraction k of page 4.3's Venus at greatest
   elongation against the order O sun / OK (the curve: the line of sight
   touches the epicycle, as in tools/numbers/4.4-phases-parallax.js,
   kAtGreatest), from 1 with the Sun at O to 0.284 at O sun = 2 OK; the
   orders above the Sun (O sun < (1 - r) OK) and below it (O sun >
   (1 + r) OK) shaded; Ptolemy's order (1.797) marked. The real Venus at
   the 50 greatest elongations of 1986 - 2025 to which page 4.3 fitted r
   (Ephem.phase), each at the order its phase gives: the fit of section 3.
   The axes run from 0 to 2 OK and from 0 to 1.
   ========================================================================== */

/* The 50 greatest elongations of the fit (JD, TT), as
   tools/numbers/4.4-phases-parallax.js finds them. */
const FIT_GREATEST = [
	2446669.36, 2446811.59, 2447254.32, 2447396.58, 2447839.14, 2447981.17, 2448421.67, 2448562.78, 2449007.2,
	2449148.82, 2449588.97, 2449731.18, 2450173.99, 2450316.24, 2450758.67, 2450900.71, 2451341.26, 2451482.42,
	2451926.83, 2452068.47, 2452508.61, 2452650.74, 2453093.63, 2453235.86, 2453678.17, 2453820.24, 2454260.86,
	2454402.1, 2454846.49, 2454988.13, 2455428.24, 2455570.27, 2456013.24, 2456155.46, 2456597.64, 2456739.81,
	2457180.5, 2457321.8, 2457766.18, 2457907.77, 2458347.84, 2458489.76, 2458932.83, 2459075.06, 2459517.14,
	2459659.41, 2460100.18, 2460241.5, 2460685.87, 2460827.39
];

const FIT_RANGE_X = [0, 2];
const PHASE_RANGE_K = [0, 1];

/* The illuminated fraction at greatest elongation for the order 'ratio'
   (O sun / OK), OK = 1: the line of sight touches the epicycle at
   P = (1 - r^2, r sqrt(1 - r^2)), the Sun on the x axis. */
function phaseAtGreatest(ratio) {
	const r = PlanetArrangement.VENUS_FIT.r;
	const c = Math.sqrt(1 - r * r);

	return PlanetArrangement.phaseAt([c * c, r * c], [ratio, 0]).k;
}

/* The order whose phase at greatest elongation is k, by bisection: the
   phase falls as the order grows. */
function orderOfPhase(k) {
	let low = 0.3;
	let high = 1.7;

	for (let i = 0; i < 50; i++) {
		const middle = (low + high) / 2;

		if (phaseAtGreatest(middle) > k) {
			low = middle;
		} else {
			high = middle;
		}
	}

	return (low + high) / 2;
}

const phaseFigure = {
	real: null,

	init() {
		this.real = FIT_GREATEST.map(jd => {
			const k = Ephem.phase('venus', jd).k;

			return { k, ratio: orderOfPhase(k) };
		});

		this.plot = new Plot2D(byId('phase-plot'), {
			x: FIT_RANGE_X,
			y: PHASE_RANGE_K,
			xLabel: tr('the order O☉ : OK', 'l’ordine O☉ : OK'),
			yLabel: tr('k at greatest elongation', 'k alla massima elongazione'),
			aspect: 0.55,
			maxHeight: 380,
			minHeight: 240,
			onDraw: () => this.draw()
		});

		Plot2D.legend(byId('phase-legend'), [
			{ label: tr('Venus above the Sun', 'Venere sopra il Sole'), color: COL.earth, mark: 'band' },
			{ label: tr('Venus below the Sun', 'Venere sotto il Sole'), color: COL.epicycle, mark: 'band' },
			{ label: tr('the real Venus, 1986–2025', 'la Venere reale, 1986–2025'), color: COL.planet, mark: 'dot' }
		]);
	},

	draw() {
		const p = this.plot;

		if (!this.real) {
			return;
		}

		const r = PlanetArrangement.VENUS_FIT.r;
		const ptolemy = PlanetArrangement.ORDERS.below;

		p.frame();

		// the orders above the Sun and below it
		p.band([0, 1 - r], [0, 0], [1, 1], { color: COL.earth, alpha: 0.16 });
		p.band([1 + r, 2], [0, 0], [1, 1], { color: COL.epicycle, alpha: 0.16 });

		// the model, and Ptolemy's order on it
		p.fn(phaseAtGreatest, { color: COL.ink, width: 2 });
		p.marker(ptolemy, phaseAtGreatest(ptolemy), { color: COL.epicycle, radius: 5 });
		p.text(tr('Ptolemy', 'Tolomeo'), ptolemy, phaseAtGreatest(ptolemy), {
			color: COL.epicycle,
			align: 'center',
			dx: 0,
			dy: -12
		});

		// the real Venus, each greatest elongation at the order it gives
		this.real.forEach(point => p.marker(point.ratio, point.k, { color: COL.planet, radius: 3 }));
	}
};

/* ==========================================================================
   6. FIGURE 6: THE PHASE, 2026 - 2033
   Static, every day. (a) The illuminated fraction of the real Venus
   (Ephem.phase), of page 4.3's Venus with the Sun at K (the order around
   the Sun), and of Ptolemy's order (the Sun at 1.797 OK, faint and dashed);
   (b) the order around the Sun less the real Venus, within 0.029
   (tools/numbers/4.4-phases-parallax.js): the axis is ±0.04.
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
			xLabel: tr('year', 'anno'),
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
				yLabel: tr('model − real', 'modello − reale'),
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
	startFigures([telescopeFigure, systemsFigure, ordersFigure, parallaxFigure, phaseFigure, testFigure]);
});
