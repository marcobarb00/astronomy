// @ts-check
/* ==========================================================================
   PAGE 4.1 · GOING BACKWARDS - SCRIPT (page.js)
   Seven figures, each with its own init and draw (and update when it has
   controls):
	 1. Mars turning back            (blue plate, static: Mars' path among
									   the stars of Gemini and Cancer,
									   October 2024 - April 2025)
	 2. the daily motion             (2D, a view per planet: the daily
									   motion against the days from the
									   middle of each loop of 2006 - 2025,
									   one loop chosen with a stepper)
	 3. the epicycle                 (2D: (a) the deferent and the epicycle
									   seen from the north ecliptic pole,
									   (b) the daily motion against the
									   anomaly; date and r)
	 4. the epicycle from the loops  (2D, static: the arc and the anomaly
									   of the first station against r)
	 5. the epicycle against Mars    (error curve, fitted to 2010 - 2025)
	 6. an error in K at the perigee (2D, static: K moved back 12°, the
									   planet's direction turned by 33°)
	 7. the loops of Mars            (2D, static: the arcs and the
									   intervals of 1986 - 2025 against the
									   ecliptic longitude of opposition)
   Shared code: common.js, time.js, ephemeris.js, stars.js, plate-stars.js,
   plate.js, models/mean-sun.js, models/planet-epicycle.js, plot2d.js,
   errorcurve.js, components.js.
   Every number quoted in the prose comes from
   tools/numbers/4.1-going-backwards.js.

   TABLE OF CONTENTS
	 0. Helpers shared by the figures
	 1. Figure 1: Mars turning back (blue plate)
	 2. Figure 2: the daily motion
	 3. Figure 3: the epicycle
	 4. Figure 4: the epicycle from the loops
	 5. Figure 5: the error curve
	 6. Figure 6: an error in K at the perigee
	 7. Figure 7: the loops of Mars
	 8. Page start
   ========================================================================== */

/* ==========================================================================
   0. HELPERS SHARED BY THE FIGURES
   ========================================================================== */

/* The forty years of the loops (Figure 7, section 1 of the text): the
   page's observations all come from years already past (STRUCTURE.md §5). */
const LOOPS_START = Time.julianDay(1986, 1, 1);
const LOOPS_END = Time.julianDay(2026, 1, 1);

/* The reference loops of Mars, computed once for Figures 4, 5 and 7: from
   geometric positions every two days, under 1' from the apparent ones
   the numbers script quotes (planet-epicycle.js, section 5). */
let marsEventsCache = null;

function marsEvents() {
	if (!marsEventsCache) {
		marsEventsCache = PlanetEpicycle.referenceEvents('mars', 'outer', LOOPS_START - 200, LOOPS_END, {
			apparent: false,
			step: 2
		});
	}

	return marsEventsCache;
}

/* The loops of Mars of 1986 - 2025, each with the time to the next
   opposition (days). */
function marsLoops() {
	const loops = marsEvents().loops;

	return loops
		.map((loop, i) => Object.assign({ next: i + 1 < loops.length ? loops[i + 1].middle - loop.middle : NaN }, loop))
		.filter(loop => loop.middle >= LOOPS_START && loop.middle < LOOPS_END);
}

/* The model of Mars fitted on this page, its two motions and its loop. */
const MARS_MOTIONS = PlanetEpicycle.motions(PlanetEpicycle.MARS_FIT);
const MARS_LOOP = PlanetEpicycle.loop(PlanetEpicycle.MARS_FIT.r, MARS_MOTIONS.n, MARS_MOTIONS.nMu);

/* An angle with a sign in TeX: "+1.85^\\circ", "-0.40^\\circ". */
const texSigned = (degrees, digits = 2) => `${signed(degrees, digits).replace('−', '-')}^\\circ`;

/* quarterTicks and nameAbove, shared with page 4.2, are in plot2d.js. */

/* ==========================================================================
   1. FIGURE 1: MARS TURNING BACK (BLUE PLATE)
   A blue plate (shared/plate.js): the stars of 2026 from Gemini to
   Cancer, seen looking south, on the equatorial grid; the ecliptic of
   2026 in the plate's ink, and highlighted the reference path of Mars
   from 15 October 2024 to 15 April 2025 (apparent positions of date, as
   seen from the Earth's center), a tick on the first of each month.
   The area holds the path, right ascension 109° to 129°, declination
   +21° to +26°, and the whole figures of Gemini and Cancer, so that
   none of their lines is cut by the border.
   ========================================================================== */

const PLATE_AREA = { raMin: 87, raMax: 139.5, decMin: 7, decMax: 37 };

/* The room beside the border (units of the drawing): the declinations on
   the left, nothing on the right, so that the chart fills the plate. */
const PLATE_MARGINS = { left: 64, right: 24 };
const PLATE_FROM = Time.julianDay(2024, 10, 15);
const PLATE_TO = Time.julianDay(2025, 4, 15);

/* The two stations and the opposition (JD(TT): 6 December 2024 23:05,
   16 January 2025 02:07, 24 February 2025 01:22, from
   tools/numbers/4.1-going-backwards.js). */
const PLATE_EVENTS = [
	{ jd: Time.julianDayTime(2024, 12, 6, 23, 5), place: 'left' },
	{ jd: Time.julianDayTime(2025, 1, 16, 2, 7) },
	{ jd: Time.julianDayTime(2025, 2, 24, 1, 22), place: 'right' }
];

const plateFigure = {
	init() {
		const chart = Plate.rectangular(byId('plate-mars'), {
			area: PLATE_AREA,
			margins: PLATE_MARGINS,
			figures: ['GEMINI', 'CANCER'],
			keep: ['bet Gem'], // Pollux, near the loop, stays on a phone
			names: [
				['bet Gem', 'Pollux', -8, -10, 'end'],
				['alf Gem', 'Castor', -9, -6, 'end']
			],
			label: tr(
				'Chart of the sky from Gemini to Cancer, with the ecliptic and, highlighted, the path of Mars from October 2024 to April 2025.',
				"Carta del cielo dai Gemelli al Cancro, con l'eclittica e, evidenziato, il percorso di Marte dall'ottobre 2024 all'aprile 2025."
			)
		});
		const eps = Ephem.meanObliquity(Plate.EPOCH);
		const ecliptic = [];

		for (let lon = 80; lon <= 145; lon += 1) {
			ecliptic.push(Ephem.eclipticToEquatorial(lon, 0, eps));
		}

		const eclipticName = Ephem.eclipticToEquatorial(94, 0, eps);

		Plate.line(chart, ecliptic, tr('ecliptic', 'eclittica'), [eclipticName.ra, eclipticName.dec, -8, 18]);

		// the path, every day; a plain tick on the first of each month, and
		// a dated one at the two stations and the opposition
		const path = [];
		const ticks = [];
		const at = jd => Ephem.equatorial(Ephem.position('mars', jd), jd, false);

		for (let jd = PLATE_FROM; jd <= PLATE_TO + 1e-9; jd += 1) {
			path.push(at(jd));
		}

		for (let month = 1; month <= 6; month++) {
			const p = at(Time.julianDay(2024, 10 + month, 1));

			ticks.push({ ra: p.ra, dec: p.dec });
		}

		// the dates of the stations outside the loop, at its eastern (left)
		// and western ends; the opposition, inside the loop, between Pollux
		// and the path, has a tick only (the side text gives its date)
		PLATE_EVENTS.forEach(event => {
			const p = at(event.jd);

			ticks.push(event.place ? { ra: p.ra, dec: p.dec, text: dateText(event.jd), place: event.place } : p);
		});

		const nameAt = at(PLATE_FROM);

		Plate.highlightCurve(chart, path, bodyName('Mars'), [nameAt.ra, nameAt.dec, 10, 22], ticks, -1);
	}
};

/* ==========================================================================
   2. FIGURE 2: THE DAILY MOTION
   A view per planet: the reference planet's daily motion against the
   days from the middle of each loop of 2006 - 2025 (the opposition for
   an outer planet, the inferior conjunction for an inner one), each curve
   from the conjunction with the Sun before the loop to the one after it
   (the superior conjunctions for Venus and Mercury; the last curve stops
   at the end of 2025). One loop, chosen with the stepper, is drawn in
   full, the others faint. Geometric positions every two days (every day
   for Mercury), the motion from the samples on either side; the
   conjunctions and oppositions interpolated between samples, the
   stations found by bisection, as in planet-epicycle.js.
   The scales hold the curves of 2006 - 2025 and the reference's daily
   motions of 1986 - 2025 (tools/numbers/4.1-going-backwards.js).
   ========================================================================== */

const MOTION_START = Time.julianDay(2006, 1, 1);
const MOTION_END = Time.julianDay(2026, 1, 1);

const MOTION_VIEWS = {
	Mars: { body: 'mars', kind: 'outer', step: 2, x: [-450, 450], y: [-0.5, 0.9] },
	Jupiter: { body: 'jupiter', kind: 'outer', step: 2, x: [-210, 210], y: [-0.15, 0.25] },
	Saturn: { body: 'saturn', kind: 'outer', step: 2, x: [-200, 200], y: [-0.1, 0.15] },
	Venus: { body: 'venus', kind: 'inner', step: 2, x: [-300, 300], y: [-0.7, 1.3] },
	Mercury: { body: 'mercury', kind: 'inner', step: 1, x: [-70, 70], y: [-1.5, 2.3] }
};

/* A curve cut at the end of 2025 counts as complete when it stops this
   close to its conjunction (days): Mars' of 2025 stops 8 days short. */
const MOTION_COMPLETE_DAYS = 10;

/* Where x crosses 0 between two samples: the fraction of the step. */
const crossing = (x0, x1) => x0 / (x0 - x1);

const motionFigure = {
	plot: null,
	view: 'Mars',
	data: {}, // the loops of each view, computed when first chosen

	init() {
		const figure = byId('motion-plot').closest('figure');

		this.plot = new Plot2D(byId('motion-plot'), {
			x: MOTION_VIEWS.Mars.x,
			y: MOTION_VIEWS.Mars.y,
			xLabel: this.xLabel('outer'),
			yLabel: tr('daily motion (°)', 'moto giornaliero (°)'),
			aspect: 0.5,
			margin: { top: 26 },
			onDraw: () => this.draw()
		});

		wireSlider(
			byId('motion-loop'),
			() => this.update(),
			value => this.loopDate(Number(value))
		);
		wirePresets(figure);
		buildChoice(byId('motion-views'), Object.keys(MOTION_VIEWS), this.view, name => this.choose(name), bodyName);
		this.choose(this.view);
	},

	xLabel(kind) {
		return kind === 'outer'
			? tr('days from opposition', "giorni dall'opposizione")
			: tr('days from inferior conjunction', 'giorni dalla congiunzione inferiore');
	},

	middleName(kind) {
		return kind === 'outer'
			? tr('opposition', 'opposizione')
			: tr('inferior conjunction', 'congiunzione inferiore');
	},

	/* The date of a loop's middle, beside the stepper. */
	loopDate(index) {
		const loops = this.data[this.view]?.loops;

		return loops && loops[index] ? dateYearText(loops[index].middle) : '';
	},

	/* Show a planet: its scales change with the view (CLAUDE.md: a view the
	   reader chooses may change a scale), and the stepper runs through its
	   loops, starting at the latest whose curve is complete. */
	choose(name) {
		const view = MOTION_VIEWS[name];

		this.view = name;

		if (!this.data[name]) {
			this.data[name] = this.compute(view);
		}

		this.plot.setRange(view.x, view.y);
		this.plot.xLabel = this.xLabel(view.kind);
		this.plot.resize();

		const slider = /** @type {HTMLInputElement} */ (byId('motion-loop'));
		const loops = this.data[name].loops;
		const latest = loops.map(loop => loop.complete).lastIndexOf(true);

		slider.max = String(loops.length - 1);
		slider.value = String(latest);
		slider.dispatchEvent(new Event('input'));
	},

	update() {
		this.showReadout();
		this.plot.redraw();
	},

	/* The loops of one planet: [{ middle, lon, arc, days, xs, ys }], and
	   the mean daily motion. */
	compute(view) {
		const step = view.step;
		const days = [];
		const lons = [];
		const elongations = [];

		// from before the conjunction that opens the first curve to after
		// the one that closes the last (beyond 2025 only to know whether
		// the last curve, cut at the end of 2025, is complete)
		for (let jd = MOTION_START + view.x[0] - 2 * step; jd <= MOTION_END + view.x[1] + step; jd += step) {
			const lon = Ephem.position(view.body, jd, { apparent: false }).lon;

			days.push(jd);
			lons.push(lon);
			elongations.push(norm180(lon - Ephem.sun(jd, { apparent: false }).lon));
		}

		const motions = days.map((jd, i) =>
			i > 0 && i + 1 < days.length ? norm180(lons[i + 1] - lons[i - 1]) / (2 * step) : NaN
		);
		const at = (list, i, t) => list[i] + t * norm180(list[i + 1] - list[i]);
		const middles = [];
		const bounds = [];
		const stations = [];

		for (let i = 1; i + 2 < days.length; i++) {
			const e0 = elongations[i];
			const e1 = elongations[i + 1];
			const m0 = motions[i];
			const m1 = motions[i + 1];

			// the planet passes the Sun (elongation 0): a conjunction, the
			// inferior one of an inner planet while it goes back
			if (e0 * e1 <= 0 && Math.abs(e1 - e0) < 90) {
				const jd = days[i] + step * crossing(e0, e1);

				if (view.kind === 'inner' && m0 < 0) {
					middles.push({ jd, lon: at(lons, i, crossing(e0, e1)) });
				} else {
					bounds.push(jd);
				}
			}

			// an outer planet opposite the Sun (elongation 180°)
			if (view.kind === 'outer' && Math.abs(e1 - e0) > 180) {
				const t = crossing(norm180(e0 - 180), norm180(e1 - 180));

				middles.push({ jd: days[i] + step * t, lon: at(lons, i, t) });
			}

			// a station: the daily motion changes sign; its moment found
			// from the reference's motion, its place from the reference
			if (m0 * m1 < 0) {
				const jd = bisect(
					t => PlanetEpicycle.referenceMotion(view.body, t, false),
					days[i] - step,
					days[i + 1] + step,
					30
				);

				stations.push({ jd, lon: PlanetEpicycle.referenceLongitude(view.body, jd, false) });
			}
		}

		const loops = middles
			.filter(m => m.jd >= MOTION_START && m.jd < MOTION_END)
			.map(m => {
				const from = Math.max(...bounds.filter(jd => jd < m.jd));
				const next = Math.min(...bounds.filter(jd => jd > m.jd));
				const to = Math.min(MOTION_END, next);
				const first = stations.filter(s => s.jd < m.jd).pop();
				const second = stations.find(s => s.jd > m.jd);
				const xs = [];
				const ys = [];

				days.forEach((jd, i) => {
					if (jd >= from && jd <= to) {
						xs.push(jd - m.jd);
						ys.push(motions[i]);
					}
				});

				return {
					middle: m.jd,
					lon: norm360(m.lon),
					arc: first && second ? norm180(first.lon - second.lon) : NaN,
					days: first && second ? second.jd - first.jd : NaN,
					complete: next - to <= MOTION_COMPLETE_DAYS,
					xs,
					ys
				};
			});

		// the mean motion: the reference's (Standish's, of date) for an outer
		// planet, the mean Sun's for an inner one
		const meanMotion = view.kind === 'outer' ? PlanetEpicycle.meanOfDate(view.body).n : MeanSun.MODERN.n;

		return { loops, meanMotion };
	},

	/* The chosen loop: how far and how long the planet goes back, and
	   where in the zodiac. */
	showReadout() {
		const loop = this.data[this.view].loops[readNumber('motion-loop')];

		showLines('motion-readout', [
			tr(
				`\\text{goes back } ${fixed(loop.arc, 1)}^\\circ \\text{ in } ${fixed(loop.days, 0)} \\text{ days}`,
				`\\text{torna indietro di } ${fixed(loop.arc, 1)}^\\circ \\text{ in } ${fixed(loop.days, 0)} \\text{ giorni}`
			),
			tr(
				`\\text{centered on ecliptic longitude } ${fixedAngle(loop.lon, 1)}^\\circ`,
				`\\text{centrato sulla longitudine eclittica } ${fixedAngle(loop.lon, 1)}^\\circ`
			)
		]);
	},

	draw() {
		const p = this.plot;
		const view = MOTION_VIEWS[this.view];
		const data = this.data[this.view];

		if (!data) {
			return;
		}

		const chosen = readNumber('motion-loop');

		p.frame();
		p.hline(0, { color: COL.ink, width: 1 });
		p.hline(data.meanMotion, { color: COL.muted, width: 1.5, dash: [6, 5] });
		p.vline(0, { color: COL.muted, width: 1, dash: [2, 4] });
		nameAbove(p, this.middleName(view.kind), 0);

		// the other loops faint, then the chosen one over them
		data.loops.forEach((loop, i) => {
			if (i !== chosen) {
				p.curve(loop.xs, loop.ys, { color: COL.planet, width: 1, alpha: 0.25 });
			}
		});

		const loop = data.loops[chosen];

		if (loop) {
			p.curve(loop.xs, loop.ys, { color: COL.planet, width: 2.4 });
		}
	}
};

/* ==========================================================================
   3. FIGURE 3: THE EPICYCLE
   (a) the deferent and the epicycle of the model (Mars fitted to
   2010 - 2025) with the r of the slider, at the chosen moment, seen from
   the north ecliptic pole: the direction of the mean Sun from the Earth
   O, the line from O through K to the apogee of the epicycle, the anomaly
   mu at K, the arc of the epicycle between the stations, where P goes
   back, shaded, and the path of P over the last synodic period. (b) the
   daily motion against mu, with the same retrograde part shaded. The
   slider r runs from 0 to 0.8; panel (b)'s scale holds every daily
   motion of that range (tools/numbers/4.1-going-backwards.js).
   ========================================================================== */

/* The date slider counts days from 1 January 2024: 1600 days, two
   synodic periods of Mars, through the oppositions of 2025 and 2027. */
const EPICYCLE_START = Time.julianDay(2024, 1, 1);
const EPICYCLE_DAYS_PER_SECOND = 40;

/* The largest r of the slider, and the room around the drawing (units
   of the deferent's radius) for the labels. */
const EPICYCLE_R_MAX = 0.8;
const EPICYCLE_REACH = 1 + EPICYCLE_R_MAX + 0.12;

/* Radius of the anomaly's arc at K (units of the epicycle's radius, at
   least ANGLE_ARC_MIN px), and the step of the path (days). */
const MU_ARC_RADIUS = 0.35;
const ANGLE_ARC_MIN = 14;
const PATH_STEP = 2;

/* K's name stands this far (deg) clockwise from the mean direction, clear
   of the deferent, of the line from the Earth and, for most of the
   period, of the arc mu. */
const K_NAME_TURN = 45;

/* Width of the shaded retrograde arc on the epicycle (px). */
const RETROGRADE_ARC_WIDTH = 7;

/* The planet of the figure, Mars: its parameters, Ptolemy's r, panel
   (b)'s scale. (Venus, the inner planet, has no view: its point, the
   greatest elongation, is made in the text.) */
const EPICYCLE_VIEWS = {
	Mars: { parameters: PlanetEpicycle.MARS_FIT, ptolemy: PlanetEpicycle.PTOLEMY.mars.r, y: [-1.4, 0.8] }
};

const epicycleFigure = {
	plot: null,
	state: null,
	view: 'Mars',
	labels: new LabelPlacer(), // keeps the labels of one drawing inside the canvas

	init() {
		const figure = byId('epicycle-canvas').closest('figure');

		squareCanvas(this, byId('epicycle-canvas'), 420, 10);

		this.plot = new Plot2D(byId('epicycle-plot'), {
			x: [0, 360],
			y: EPICYCLE_VIEWS.Mars.y,
			xLabel: tr('anomaly μ (°)', 'anomalia μ (°)'),
			yLabel: tr('daily motion (°)', 'moto giornaliero (°)'),
			xTicks: quarterTicks,
			aspect: 0.95,
			maxHeight: 440,
			margin: { top: 28 },
			onDraw: () => this.drawPlot()
		});

		wireSlider(
			byId('epi-day'),
			() => this.update(),
			value => dateYearText(EPICYCLE_START + Number(value))
		);
		wireSlider(
			byId('epi-r'),
			() => this.update(),
			value => fixed(Number(value), 3)
		);
		wirePresets(figure);
		wirePlayButton(byId('epi-play'), byId('epi-day'), EPICYCLE_DAYS_PER_SECOND);
		this.choose(this.view);
	},

	/* The planet: its parameters, its scale in (b), and its presets of r
	   (Ptolemy's, and the threshold below which there is no loop). */
	choose(name) {
		const view = EPICYCLE_VIEWS[name];
		const motions = PlanetEpicycle.motions(view.parameters);
		const threshold = PlanetEpicycle.loopThreshold(motions.n, motions.nMu);
		const ratios = byId('epicycle-ratios');

		this.view = name;
		this.plot.setRange([0, 360], view.y);
		ratios.querySelector('[data-ratio="ptolemy"]').setAttribute('data-value', String(view.ptolemy));
		// the slider's step is 0.001: the largest step at or below the threshold
		ratios
			.querySelector('[data-ratio="threshold"]')
			.setAttribute('data-value', (Math.floor(threshold * 1000) / 1000).toFixed(3));

		const slider = /** @type {HTMLInputElement} */ (byId('epi-r'));

		slider.value = String(view.ptolemy);
		slider.dispatchEvent(new Event('input'));
	},

	/* The parameters of the view, with the r of the slider. */
	parameters() {
		return Object.assign({}, EPICYCLE_VIEWS[this.view].parameters, { r: readNumber('epi-r') });
	},

	update() {
		const parameters = this.parameters();
		const motions = PlanetEpicycle.motions(parameters);
		const day = readNumber('epi-day');
		const jd = EPICYCLE_START + day;

		this.state = {
			parameters,
			motions,
			day,
			jd,
			now: PlanetEpicycle.state(parameters, jd),
			loop: PlanetEpicycle.loop(parameters.r, motions.n, motions.nMu),
			path: this.path(parameters, motions, jd)
		};

		this.showReadout();
		this.draw();
		this.plot.redraw();
	},

	/* The planet's places over the synodic period before jd (units of the
	   deferent's radius). */
	path(parameters, motions, jd) {
		const period = 360 / motions.nMu;
		const points = [];

		for (let t = jd - period; t <= jd + 1e-9; t += PATH_STEP) {
			points.push(PlanetEpicycle.construction(PlanetEpicycle.state(parameters, t), parameters.r).planet);
		}

		return points;
	},

	showReadout() {
		const { jd, now, parameters, motions, loop } = this.state;
		const motion = PlanetEpicycle.dailyMotion(now.mu, parameters.r, motions.n, motions.nMu);
		const direction = motion < 0 ? tr('back', 'indietro') : tr('forward', 'avanti');
		const threshold = PlanetEpicycle.loopThreshold(motions.n, motions.nMu);
		const stations = Number.isFinite(loop.mu)
			? tr(
					`\\text{stations at } \\mu = ${fixed(loop.mu, 1)}^\\circ, ${fixed(360 - loop.mu, 1)}^\\circ;\\ \\text{back } ${fixed(loop.arc, 1)}^\\circ`,
					`\\text{stazioni in } \\mu = ${fixed(loop.mu, 1)}^\\circ; ${fixed(360 - loop.mu, 1)}^\\circ;\\ \\text{indietro di } ${fixed(loop.arc, 1)}^\\circ`
				)
			: tr(
					`\\text{no loop: } r \\le n/(n + n_\\mu) = ${fixed(threshold, 3)}`,
					`\\text{senza cappio: } r \\le n/(n + n_\\mu) = ${fixed(threshold, 3)}`
				);

		showLines('epicycle-readout', [
			`\\text{${dateYearText(jd)}:}\\quad \\bar\\lambda = ${fixedAngle(now.meanLongitude, 1)}^\\circ,\\quad \\mu = ${fixedAngle(now.mu, 1)}^\\circ`,
			`\\eta = ${texSigned(now.eta, 1)},\\quad \\lambda = \\bar\\lambda + \\eta = ${fixedAngle(now.lambda, 1)}^\\circ`,
			tr(
				`\\text{daily motion } ${texSigned(motion, 3)} \\text{ (${direction})}`,
				`\\text{moto giornaliero } ${texSigned(motion, 3)} \\text{ (${direction})}`
			),
			stations
		]);
	},

	/* Panel (a). */
	draw() {
		if (!this.state) {
			return;
		}

		const ctx = this.ctx;
		const { now, parameters, path, loop } = this.state;
		const r = parameters.r;
		this.scale = this.R / EPICYCLE_REACH;

		const at = point => ({ x: this.cx + this.scale * point[0], y: this.cy - this.scale * point[1] });

		ctx.clearRect(0, 0, this.width, this.width);
		this.labels.begin({ x0: 0, y0: 0, x1: this.width, y1: this.width });

		const parts = PlanetEpicycle.construction(now, r);
		const O = at([0, 0]);
		const K = at(parts.K);
		const P = at(parts.planet);
		const edge = this.scale * (1 + EPICYCLE_R_MAX);

		// the direction of gamma, the deferent, and the mean Sun's direction
		segment(ctx, O, towards(O, 0, edge), { color: COL.muted, width: 1 });
		circle(ctx, O, this.scale, { color: COL.deferent, width: 2 });
		segment(ctx, O, towards(O, now.sun, edge), { color: COL.sun, width: 1.5, dash: [6, 4] });

		// the path of P over the last synodic period
		ctx.strokeStyle = withAlpha(COL.planet, 0.35);
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		path.map(at).forEach((q, i) => (i === 0 ? ctx.moveTo(q.x, q.y) : ctx.lineTo(q.x, q.y)));
		ctx.stroke();

		// the line from the Earth through K to the apogee of the epicycle,
		// the epicycle, its radius to P, and the line of sight
		segment(ctx, O, towards(O, now.meanLongitude, this.scale * (1 + r)), {
			color: COL.deferent,
			width: 1.2,
			dash: [2, 4]
		});
		this.drawRetrogradeArc(K, now, r, loop);
		circle(ctx, K, r * this.scale, { color: COL.epicycle, width: 2 });
		segment(ctx, K, P, { color: COL.epicycle, width: 1.8 });
		segment(ctx, O, towards(O, now.lambda, edge), { color: COL.planet, width: 1.5 });

		this.drawAngle(K, now, r);

		drawDot(ctx, O.x, O.y, 6, COL.earth);
		drawDot(ctx, K.x, K.y, 3.5, COL.ink);
		drawDot(ctx, P.x, P.y, 6.5, COL.planet);
		this.drawLabels(O, K, P, now, r, edge);
	},

	/* The arc of the epicycle where P goes back, between the stations at
	   mu_s and 360° - mu_s, about the perigee: shaded as the retrograde
	   part of (b). None below the threshold. */
	drawRetrogradeArc(K, now, r, loop) {
		if (!Number.isFinite(loop.mu) || r <= 0) {
			return;
		}

		screenArc(this.ctx, K, r * this.scale, now.meanLongitude + loop.mu, now.meanLongitude + 360 - loop.mu, {
			color: withAlpha(COL.planet, 0.3),
			width: RETROGRADE_ARC_WIDTH
		});
	},

	/* The anomaly mu at K, anticlockwise from the apogee to P. */
	drawAngle(K, now, r) {
		if (r <= 0) {
			return;
		}

		const radius = Math.max(ANGLE_ARC_MIN, MU_ARC_RADIUS * r * this.scale);

		screenArc(this.ctx, K, radius, now.meanLongitude, now.meanLongitude + now.mu, {
			color: COL.epicycle,
			width: 2
		});
	},

	/* The labels: single letters and symbols for the moving points and
	   directions (O the Earth, K, P, the Sun's ☉, gamma, mu), never words
	   (CLAUDE.md). Each letter keeps a side of its point that turns
	   smoothly with the construction, and passes over a line for a moment
	   rather than jumping to the other side of its point: K behind the
	   mean direction, outside the arc mu for most of the period; P off the
	   line of sight, which it never crosses; O below the Earth. */
	drawLabels(O, K, P, now, r, edge) {
		const ctx = this.ctx;
		const { meanLongitude, mu, sun, lambda } = now;
		const radius = Math.max(ANGLE_ARC_MIN, MU_ARC_RADIUS * r * this.scale);

		centeredLabel(ctx, 'γ', towards(O, 0, edge + 12), COL.muted, this.labels);
		centeredLabel(ctx, '☉', towards(O, sun, edge + 12), COL.sun, this.labels);

		if (r > 0) {
			labelOutside(ctx, 'μ', K, radius, meanLongitude + mu / 2, COL.epicycle, this.labels);
		}

		labelOutside(ctx, 'K', K, 4, meanLongitude - K_NAME_TURN, COL.ink, this.labels);
		labelOutside(ctx, 'P', P, 7, lambda + SIGHT_NAME_TURN, COL.planet, this.labels);
		labelOutside(ctx, 'O', O, 7, 270, COL.earth, this.labels);
	},

	/* Panel (b). */
	drawPlot() {
		if (!this.state) {
			return;
		}

		const p = this.plot;
		const { parameters, motions, now, loop } = this.state;
		const r = parameters.r;
		const xs = [];
		const ys = [];

		for (let mu = 0; mu <= 360; mu += 1) {
			xs.push(mu);
			ys.push(PlanetEpicycle.dailyMotion(mu, r, motions.n, motions.nMu));
		}

		p.frame();

		// the retrograde part, between the stations, shaded down to the curve
		if (Number.isFinite(loop.mu)) {
			const bx = [];
			const lows = [];
			const highs = [];

			for (let mu = loop.mu; mu <= 360 - loop.mu + 1e-9; mu += 0.5) {
				bx.push(mu);
				lows.push(PlanetEpicycle.dailyMotion(mu, r, motions.n, motions.nMu));
				highs.push(0);
			}

			p.band(bx, lows, highs, { color: COL.planet, alpha: 0.2 });
		}

		p.hline(0, { color: COL.ink, width: 1 });
		p.hline(motions.n, { color: COL.muted, width: 1.5, dash: [6, 5] });
		nameAbove(p, tr('apogee', 'apogeo'), 0);
		nameAbove(p, tr('perigee', 'perigeo'), 180);
		nameAbove(p, tr('apogee', 'apogeo'), 360);
		p.curve(xs, ys, { color: COL.planet, width: 2.4 });
		p.marker(now.mu, PlanetEpicycle.dailyMotion(now.mu, r, motions.n, motions.nMu), {
			color: COL.planet,
			radius: 5
		});
	}
};

/* ==========================================================================
   4. FIGURE 4: THE EPICYCLE FROM THE LOOPS
   Static. Against the epicycle r, from the threshold below which there is
   no loop: (a) the model's arc of retrogradation, (b) the anomaly mu_s
   of its first station. In both, a dot for each loop of Mars of
   2010 - 2025, at the r whose arc is the loop's (the eight loops of the
   fit, from geometric positions every two days); in (a) the mean arc and
   the r fitted to it, dashed; in (b) a band of five days of the motion in
   anomaly either side of the fitted mu_s, a station timed five days early
   or late. Fixed scales: r to 0.72, where the arc is 29.6° and mu_s
   162.2° (tools/numbers/4.1-going-backwards.js).
   ========================================================================== */

const FIT_START = Time.julianDay(2010, 1, 1);
const FIT_END = Time.julianDay(2026, 1, 1);
const FIT_R_RANGE = [0.52, 0.72];
const FIT_ARC_RANGE = [0, 30];
const FIT_MU_RANGE = [160, 180];

/* A station timed this many days early or late (the text's example). */
const STATION_TIMING_DAYS = 5;

/* The step of the curves in r. */
const FIT_R_STEP = 0.0005;

const ratioFigure = {
	init() {
		const { n, nMu } = MARS_MOTIONS;

		this.threshold = PlanetEpicycle.loopThreshold(n, nMu);
		this.fitted = PlanetEpicycle.loop(PlanetEpicycle.MARS_FIT.r, n, nMu);
		this.loops = marsEvents()
			.loops.filter(loop => loop.middle >= FIT_START && loop.middle < FIT_END)
			.map(loop => {
				const r = PlanetEpicycle.ratioForArc(loop.arc, n, nMu);

				return { r, arc: loop.arc, mu: PlanetEpicycle.loop(r, n, nMu).mu };
			});

		// the model's loop for every r of the axis above the threshold
		this.rs = [];
		this.arcs = [];
		this.mus = [];

		for (let r = this.threshold + FIT_R_STEP; r <= FIT_R_RANGE[1] + 1e-9; r += FIT_R_STEP) {
			const loop = PlanetEpicycle.loop(r, n, nMu);

			this.rs.push(r);
			this.arcs.push(loop.arc);
			this.mus.push(loop.mu);
		}

		const options = {
			x: FIT_R_RANGE,
			xLabel: tr('epicycle r', 'epiciclo r'),
			aspect: 0.75,
			maxHeight: 360
		};

		this.arcPlot = new Plot2D(
			byId('ratio-arc-plot'),
			Object.assign({}, options, {
				y: FIT_ARC_RANGE,
				yLabel: tr('arc (°)', 'arco (°)'),
				onDraw: () => this.drawArcs()
			})
		);
		this.stationPlot = new Plot2D(
			byId('ratio-station-plot'),
			Object.assign({}, options, {
				y: FIT_MU_RANGE,
				yLabel: tr('anomaly μ (°)', 'anomalia μ (°)'),
				onDraw: () => this.drawStations()
			})
		);
	},

	/* (a) The arc against r: the curve, the mean arc and its r, the loops. */
	drawArcs() {
		const p = this.arcPlot;

		if (!this.loops) {
			return;
		}

		const r = PlanetEpicycle.MARS_FIT.r;
		const arc = this.fitted.arc;
		const guide = { color: COL.muted, width: 1.2, dash: [5, 4] };

		p.frame();
		p.curve([FIT_R_RANGE[0], r], [arc, arc], guide);
		p.curve([r, r], [FIT_ARC_RANGE[0], arc], guide);
		p.curve(this.rs, this.arcs, { color: COL.epicycle, width: 2.4 });
		this.loops.forEach(loop => p.marker(loop.r, loop.arc, { color: COL.planet, radius: 4.5 }));
		p.text(`${fixed(arc, 1)}°`, FIT_R_RANGE[0], arc, { color: COL.muted, dx: 6, dy: -5 });
		p.text(fixed(r, 3), r, FIT_ARC_RANGE[0], { color: COL.muted, dx: 5, dy: -5 });
	},

	/* (b) The anomaly of the first station against r: the band of a
	   station timed five days off, the curve, the loops. */
	drawStations() {
		const p = this.stationPlot;

		if (!this.loops) {
			return;
		}

		const mu = this.fitted.mu;
		const half = STATION_TIMING_DAYS * MARS_MOTIONS.nMu;

		p.frame();
		p.band(FIT_R_RANGE, [mu - half, mu - half], [mu + half, mu + half], { color: COL.planet, alpha: 0.15 });
		p.curve(this.rs, this.mus, { color: COL.epicycle, width: 2.4 });
		this.loops.forEach(loop => p.marker(loop.r, loop.mu, { color: COL.planet, radius: 4.5 }));
	}
};

/* ==========================================================================
   5. FIGURE 5: THE ERROR CURVE
   The model fitted to 2010 - 2025 and the uniform planet against the
   reference Mars, in degrees, over four years, 2016 - 2019, and the
   sixteen years of the fit and two centuries centered on them (a curve
   over four years; over the longer spans one pixel covers more than the
   sampling step, so the curves become bands); dots at the oppositions of
   1986 - 2025, on spans of the fit or less. No slider changes a model, so
   the widget fits its scale to each span.
   ========================================================================== */

const errorFigure = {
	init() {
		const curve = new ErrorCurve(byId('error-mars'), {
			body: 'mars',
			start: Time.julianDay(2016, 1, 1),
			end: Time.julianDay(2020, 1, 1),
			spans: [
				{ label: tr('4 years', '4 anni'), years: 4 },
				{ label: tr('16 years', '16 anni'), years: 16 },
				{ label: tr('200 years', '200 anni'), years: 200 }
			],
			units: 'deg',
			ghostButtons: false
		});

		curve.addGhost({
			label: tr('the uniform planet', 'il pianeta uniforme'),
			short: tr('uniform planet', 'pianeta uniforme'),
			color: COL.muted,
			fn: PlanetEpicycle.makeUniform(PlanetEpicycle.MARS_FIT)
		});
		curve.addModel({
			label: tr('the epicycle, fitted to 2010–2025', "l'epiciclo, adattato al 2010–2025"),
			short: tr('epicycle', 'epiciclo'),
			color: COL.epicycle,
			fn: PlanetEpicycle.make(PlanetEpicycle.MARS_FIT)
		});
		curve.addMarks({
			label: tr(
				'the epicycle at the oppositions (spans of 16 years or less)',
				"l'epiciclo alle opposizioni (intervalli di 16 anni o meno)"
			),
			color: COL.epicycle,
			fn: PlanetEpicycle.make(PlanetEpicycle.MARS_FIT),
			dates: marsLoops().map(loop => loop.middle),
			maxYears: 16.5
		});
	}
};

/* ==========================================================================
   6. FIGURE 6: AN ERROR IN K AT THE PERIGEE
   Static, seen from the north ecliptic pole, the mean Sun to the left:
   the model at an opposition to the mean Sun, K on the line from the
   Earth O away from the mean Sun and P at the perigee of its epicycle;
   then K moved back MAGNIFY_SHIFT degrees along the deferent, to K', with
   the planet P' on the epicycle about K', K'P' still towards the mean
   Sun. The angle at O between K and K' (12°) and between P and P'
   (33.2°, from tools/numbers/4.1-going-backwards.js). Only the arcs of
   the epicycles near the perigee are drawn, so that the drawing can show
   P and P' large enough.
   ========================================================================== */

const MAGNIFY_SHIFT = 12;

/* The part of the plane shown (units of the deferent's radius): a square
   of half-side 'half' about (cx, cy). */
const MAGNIFY_VIEW = { cx: 0.35, cy: -0.17, half: 0.8 };

/* The arc of each epicycle drawn, either side of its perigee (deg), and
   the radii of the two angles at O (units of the deferent's radius). */
const MAGNIFY_EPICYCLE_ARC = 70;
const MAGNIFY_K_ANGLE = 0.7;
const MAGNIFY_P_ANGLE = 0.14;

/* Where the lines from O to K and K' start (units of the deferent's
   radius): beyond P, so that the angle at P stays clear. */
const MAGNIFY_LINES_FROM = 0.45;

const magnifyFigure = {
	init() {
		squareCanvas(this, byId('magnify-canvas'), 420, 0);
		this.draw();
	},

	/* A point of the plane on the canvas. */
	at(point) {
		const v = MAGNIFY_VIEW;
		const scale = this.width / (2 * v.half);

		return { x: (point[0] - v.cx + v.half) * scale, y: (v.cy + v.half - point[1]) * scale };
	},

	draw() {
		if (!this.ctx) {
			return;
		}

		const ctx = this.ctx;
		const r = PlanetEpicycle.MARS_FIT.r;
		const scale = this.width / (2 * MAGNIFY_VIEW.half);
		const shift = -MAGNIFY_SHIFT;
		const kNew = [cos(shift), sin(shift)];
		const pNew = [kNew[0] - r, kNew[1]];
		const O = this.at([0, 0]);
		const K = this.at([1, 0]);
		const P = this.at([1 - r, 0]);
		const K2 = this.at(kNew);
		const P2 = this.at(pNew);
		const turn = Math.atan2(pNew[1], pNew[0]) / D2R;
		const sightEnd = towards(O, turn, scale * 0.75);

		ctx.clearRect(0, 0, this.width, this.width);

		// the direction of the mean Sun, and the deferent near K
		segment(ctx, O, towards(O, 180, scale * 0.38), { color: COL.sun, width: 1.5, dash: [6, 4] });
		screenArc(ctx, O, scale, -28, 22, { color: COL.deferent, width: 2 });

		// the lines to K and to K', from MAGNIFY_LINES_FROM out (they would
		// cross the angle at P), and the angle between them
		segment(ctx, towards(O, 0, MAGNIFY_LINES_FROM * scale), K, { color: COL.muted, width: 1 });
		segment(ctx, towards(O, shift, MAGNIFY_LINES_FROM * scale), K2, { color: COL.muted, width: 1 });
		screenArc(ctx, O, MAGNIFY_K_ANGLE * scale, shift, 0, { color: COL.ink, width: 1.5 });

		// the two epicycles near their perigees, and their radii to P and P'
		screenArc(ctx, K, r * scale, 180 - MAGNIFY_EPICYCLE_ARC, 180 + MAGNIFY_EPICYCLE_ARC, {
			color: COL.epicycle,
			width: 2
		});
		ctx.setLineDash([6, 4]);
		screenArc(ctx, K2, r * scale, 180 - MAGNIFY_EPICYCLE_ARC, 180 + MAGNIFY_EPICYCLE_ARC, {
			color: COL.epicycle,
			width: 1.5
		});
		ctx.setLineDash([]);
		segment(ctx, K, P, { color: COL.epicycle, width: 1.8 });
		segment(ctx, K2, P2, { color: COL.epicycle, width: 1.8, dash: [6, 4] });

		// the lines of sight to P and P', and the angle between them
		segment(ctx, O, P, { color: COL.planet, width: 1.5 });
		segment(ctx, O, sightEnd, { color: COL.planet, width: 1.5 });
		screenArc(ctx, O, MAGNIFY_P_ANGLE * scale, turn, 0, { color: COL.planet, width: 1.5 });

		drawDot(ctx, O.x, O.y, 6, COL.earth);
		drawDot(ctx, K.x, K.y, 3.5, COL.ink);
		drawDot(ctx, K2.x, K2.y, 3.5, COL.ink);
		drawDot(ctx, P.x, P.y, 6.5, COL.planet);
		drawDot(ctx, P2.x, P2.y, 6.5, COL.planet);

		this.drawLabels({ O, K, P, K2, P2 }, turn, scale);
	},

	/* The labels: the points (letters), the two angles, the mean Sun. The
	   drawing is static, so every label has its fixed side. */
	drawLabels(points, turn, scale) {
		const ctx = this.ctx;
		const { O, K, P, K2, P2 } = points;
		const labels = new LabelPlacer();

		labels.begin({ x0: 0, y0: 0, x1: this.width, y1: this.width });
		centeredLabel(ctx, '☉', towards(O, 180, scale * 0.38 + 12), COL.sun, labels);
		labelOutside(ctx, 'O', O, 7, 225, COL.earth, labels);
		labelOutside(ctx, 'K', K, 4, 60, COL.ink, labels);
		labelOutside(ctx, 'K′', K2, 4, -40, COL.ink, labels);
		labelOutside(ctx, 'P', P, 7, 130, COL.planet, labels);
		labelOutside(ctx, 'P′', P2, 7, 215, COL.planet, labels);
		centeredLabel(ctx, `${MAGNIFY_SHIFT}°`, towards(O, -MAGNIFY_SHIFT / 2, scale * 0.86), COL.ink, labels);
		centeredLabel(
			ctx,
			`${fixed(-turn, 0)}°`,
			towards(O, turn / 2, (MAGNIFY_P_ANGLE + 0.1) * scale),
			COL.planet,
			labels
		);
	}
};

/* ==========================================================================
   7. FIGURE 7: THE LOOPS OF MARS
   Static. (a) how far Mars went back in each loop of 1986 - 2025, and
   (b) the time from its opposition to the next (for the last, in 2025,
   the next is still to come), against the ecliptic longitude of the
   opposition; the model's constant arc and synodic period as lines.
   Fixed scales: the arcs run from 10.0° to 19.5°, the intervals from 764
   to 811 days (tools/numbers/4.1-going-backwards.js).
   ========================================================================== */

const ARC_RANGE = [8, 22];
const INTERVAL_RANGE = [750, 825];

const loopsFigure = {
	init() {
		this.loops = marsLoops();

		const options = {
			x: [0, 360],
			xLabel: tr('ecliptic longitude of the opposition (°)', "longitudine eclittica dell'opposizione (°)"),
			xTicks: quarterTicks,
			aspect: 0.75,
			maxHeight: 360
		};

		this.arcs = new Plot2D(
			byId('arcs-plot'),
			Object.assign({}, options, {
				y: ARC_RANGE,
				yLabel: tr('arc (°)', 'arco (°)'),
				onDraw: () => this.draw(this.arcs, loop => loop.arc, MARS_LOOP.arc)
			})
		);
		this.intervals = new Plot2D(
			byId('intervals-plot'),
			Object.assign({}, options, {
				y: INTERVAL_RANGE,
				yLabel: tr('days', 'giorni'),
				onDraw: () => this.draw(this.intervals, loop => loop.next, 360 / MARS_MOTIONS.nMu)
			})
		);
	},

	/* One panel: the model's value as a line, a dot per loop. */
	draw(p, value, model) {
		if (!this.loops) {
			return;
		}

		p.frame();
		p.hline(model, { color: COL.epicycle, width: 2 });
		this.loops
			.filter(loop => Number.isFinite(value(loop)))
			.forEach(loop => p.marker(loop.lon, value(loop), { color: COL.planet, radius: 4.5 }));
	}
};

/* ==========================================================================
   8. PAGE START
   Shared components first (they typeset the prose), then the figures.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
	Site.initPage();
	startFigures([plateFigure, motionFigure, epicycleFigure, ratioFigure, errorFigure, magnifyFigure, loopsFigure]);
});
