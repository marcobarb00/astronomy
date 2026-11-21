// @ts-check
/* ==========================================================================
   THE TOOLBOX - SCRIPT (page.js)
   Every model of the course gathered to be used (STRUCTURE.md §4,
   Epilogue): the calculator of the places of the Sun, the Moon and the
   five planets on a date, the error ladder of every model, and the table
   of the fitted parameters, read from the models themselves.
   Shared code: common.js, time.js, ephemeris.js, vsop87-data.js,
   vsop87-planets.js, vsop87.js, models/diurnal.js, models/frames.js,
   models/mean-sun.js, models/clock.js, models/precession.js,
   models/solar-eccentric.js, models/lunar-epicycle.js,
   models/lunar-crank.js, models/lunar-latitude.js,
   models/planet-epicycle.js, models/planet-equant.js,
   models/planet-arrangement.js, models/kepler.js, plot2d.js, ladder.js,
   components.js. Every number quoted in the prose comes from
   tools/numbers/toolbox.js.

   TABLE OF CONTENTS
	 1. The bodies: their models and their reference
	 2. Figure 1: the calculator
	 3. Figure 2: the error ladder
	 4. The table of the fitted parameters
	 5. Page start
   ========================================================================== */

/* ==========================================================================
   1. THE BODIES: THEIR MODELS AND THEIR REFERENCE
   Each body: its name, its colour on the strip, its model (JD(TT) ->
   { lon, lat }, degrees), its reference, and the altitude h0 at which it
   rises and sets (Meeus ch. 15): the Sun's upper limb with refraction
   (-50', page 1.3), the center of a planet with refraction (-34', page
   1.1), and the Moon's upper limb with refraction and its mean parallax,
   0.7275 pi - 34' = +0.125° (0.7275 pi = pi - s, s its semidiameter).
   ========================================================================== */

/* The reference of the Sun and the planets (VSOP87, as on page 4.5). */
const VSOP = { theory: 'vsop87' };

/* The models of the calculator: the course's best for each body. */
const sunModel = Kepler.makeSun();
const moonLongitude = LunarCrank.make(LunarCrank.FIT_2026);
const moonLatitude = LunarLatitude.make(LunarLatitude.FIT_2026);

/* A planet's ellipse seen from the Earth on the Sun's ellipse; the
   ellipses lie in the ecliptic, so the ecliptic latitude is 0. */
function planetModel(name) {
	const p = Kepler.PLANETS_FIT[name];

	return jd => ({ lon: Kepler.geocentric(p, Kepler.SUN_2026, jd).lon, lat: 0 });
}

const BODIES = [
	{
		name: 'Sun',
		color: COL.sun,
		model: jd => ({ lon: sunModel(jd), lat: 0 }),
		reference: jd => Ephem.sun(jd, VSOP),
		h0: -50 / 60
	},
	{
		name: 'Moon',
		color: COL.ink,
		model: jd => ({ lon: moonLongitude(jd), lat: moonLatitude(jd) }),
		reference: jd => Ephem.moon(jd),
		h0: 0.125
	}
].concat(
	['mercury', 'venus', 'mars', 'jupiter', 'saturn'].map(name => ({
		name: name.charAt(0).toUpperCase() + name.slice(1),
		color: COL.planet,
		model: planetModel(name),
		reference: jd => Ephem.planet(name, jd, VSOP),
		h0: -34 / 60
	}))
);

/* ==========================================================================
   2. FIGURE 1: THE CALCULATOR
   The date is a slider of days (0h UT) from 1 January 1900 to 31
   December 2100, with previous / next day buttons and a date field for
   any day of that range; the time of day, the geographic latitude and
   longitude are sliders. For each body: the model's ecliptic longitude
   beside the reference's (the first table); the right ascension and
   declination from the model's ecliptic coordinates with the mean
   obliquity of date (page 1.2), and the moments within the chosen UT day
   at which it rises, crosses the meridian and sets (the second table),
   found by sampling the altitude and the hour angle every quarter of an
   hour and bisecting. The strip: the ecliptic seen looking south, east
   to the left, one row per body, the model's place as a dot and the
   reference's as a ring (they differ by 2° at most, a few pixels), and the
   band within 15° of the Sun.
   ========================================================================== */

/* The range of the date slider (JD of 0h UT). */
const DAY_FIRST = Time.julianDay(1900, 1, 1);
const DAY_LAST = Time.julianDay(2100, 12, 31);

/* The places of the presets. */
const PRESET_PLACES = [
	{ name: 'Greenwich', lat: 51.5, lon: 0 },
	{ name: 'Rome', lat: PLACES.rome.lat, lon: PLACES.rome.lon },
	{ name: 'Alexandria', lat: 31.2, lon: 29.9 },
	{ name: 'Sydney', lat: -33.9, lon: 151.2 }
];

/* The search for rising, transit and setting: the step (days) and the
   number of bisections. */
const SEARCH_STEP = 1 / 96;
const SEARCH_HALVINGS = 24;

/* Half the width of the band around the Sun on the strip (deg). */
const SUN_BAND = 15;

/* "22 Nov 2026" from a JD of 0h UT, for the slider's value; the date
   field's "2026-11-22" and back. */
const dayText = jd => Time.formatDate(jd);
const pad = (n, width = 2) => String(n).padStart(width, '0');

function isoOf(jd) {
	const d = Time.calendarDate(jd);

	return `${pad(d.year, 4)}-${pad(d.month)}-${pad(Math.floor(d.day))}`;
}

function jdOfIso(text) {
	const parts = text.split('-').map(Number);

	return parts.length === 3 && parts.every(Number.isFinite) ? Time.julianDay(parts[0], parts[1], parts[2]) : NaN;
}

/* "14:05" for hours; "—" for no time. */
function clockText(hours) {
	if (!Number.isFinite(hours)) {
		return '—';
	}

	const minutes = Math.round(hours * 60) % 1440;

	return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/* "17h 42m" for a right ascension in degrees. */
function raText(ra) {
	const minutes = Math.round((norm360(ra) / 15) * 60) % 1440;

	return `${pad(Math.floor(minutes / 60))}h ${pad(minutes % 60)}m`;
}

/* The roots of fn within [start, start + 1): the sampled sign changes
   (direction +1 rising through zero, -1 falling), refined by bisection;
   a jump of more than 90 (an angle wrapping) is not a root. */
function crossing(fn, start, direction) {
	let t0 = start;
	let f0 = fn(t0);

	for (let t1 = start + SEARCH_STEP; t1 <= start + 1 + 1e-9; t1 += SEARCH_STEP) {
		const f1 = fn(t1);

		if (f0 * direction < 0 && f1 * direction >= 0 && Math.abs(f1 - f0) < 90) {
			let a = t0;
			let b = t1;

			for (let i = 0; i < SEARCH_HALVINGS; i++) {
				const m = (a + b) / 2;

				if (fn(m) * direction < 0) {
					a = m;
				} else {
					b = m;
				}
			}

			return (a + b) / 2;
		}

		t0 = t1;
		f0 = f1;
	}

	return NaN;
}

const calculator = {
	plot: null,
	places: null,

	init() {
		const day = /** @type {HTMLInputElement} */ (byId('calc-day'));

		day.min = '0';
		day.max = String(DAY_LAST - DAY_FIRST);
		this.setNow(false);

		wireSlider(
			day,
			() => this.update(),
			value => dayText(DAY_FIRST + value)
		);
		wireSlider(
			byId('calc-hour'),
			() => this.update(),
			value => clockText(value)
		);
		wireSlider(
			byId('calc-lat'),
			() => this.update(),
			value => `${signed(value, 1)}°`
		);
		wireSlider(
			byId('calc-lon'),
			() => this.update(),
			value => `${signed(value, 1)}°`
		);
		wirePresets(byId('calculator'));
		this.buildPlaces();

		byId('calc-date').addEventListener('change', () => this.fromDateField());
		byId('calc-now').addEventListener('click', () => this.setNow(true));

		this.plot = new Plot2D(byId('calc-strip'), {
			// x = 360° - ecliptic longitude, so that east is to the left; the
			// ticks from left to right, as Plot2D draws them
			x: [0, 360],
			y: [0.5, BODIES.length + 0.5],
			xTicks: () => [360, 300, 240, 180, 120, 60, 0].map(v => ({ value: 360 - v, label: `${v}°` })),
			yTicks: () => BODIES.map((body, i) => ({ value: BODIES.length - i, label: body.name })),
			xLabel: 'ecliptic longitude',
			margin: { left: 76 },
			minHeight: 250,
			maxHeight: 250,
			onDraw: () => this.draw()
		});

		this.update();
	},

	/* The preset places: each sets both sliders. */
	buildPlaces() {
		const container = byId('calc-places');

		PRESET_PLACES.forEach(place => {
			const button = makeEl('button', '', place.name);

			button.type = 'button';
			button.addEventListener('click', () => {
				this.setSlider('calc-lat', place.lat);
				this.setSlider('calc-lon', place.lon);
				this.update();
			});
			container.appendChild(button);
		});
	},

	/* Move a slider and its value beside it. */
	setSlider(id, value) {
		const input = /** @type {HTMLInputElement} */ (byId(id));

		input.value = String(value);
		input.dispatchEvent(new Event('input'));
	},

	/* The date and time of now, within the range of the slider. */
	setNow(update) {
		const now = Date.now() / 86400000 + 2440587.5;
		const day = Math.min(Math.max(Math.floor(now - 0.5) + 0.5, DAY_FIRST), DAY_LAST);
		const hour = Math.min(Math.round((now - day) * 96) / 4, 23.75);

		this.setSlider('calc-day', day - DAY_FIRST);
		this.setSlider('calc-hour', hour);

		if (update) {
			this.update();
		}
	},

	/* A date typed in the date field, kept within the slider's range. */
	fromDateField() {
		const field = /** @type {HTMLInputElement} */ (byId('calc-date'));
		const jd = jdOfIso(field.value);

		if (!Number.isFinite(jd)) {
			return;
		}

		this.setSlider('calc-day', Math.min(Math.max(jd, DAY_FIRST), DAY_LAST) - DAY_FIRST);
	},

	update() {
		const day = DAY_FIRST + readNumber('calc-day');
		const jdUT = day + readNumber('calc-hour') / 24;
		const jdTT = Time.ttFromUt(jdUT);
		const phi = readNumber('calc-lat');
		const lon = readNumber('calc-lon');

		/** @type {HTMLInputElement} */ (byId('calc-date')).value = isoOf(day);

		this.rows = BODIES.map(body => {
			const model = body.model(jdTT);
			const reference = body.reference(jdTT);

			return {
				body,
				model,
				reference,
				eq: this.equatorial(model, jdTT),
				times: this.times(body, day, phi, lon)
			};
		});

		this.fillTables();
		showLines('calc-readout', [
			`\\text{JD(UT)} = ${jdUT.toFixed(4)}, \\quad \\Delta T = ${((jdTT - jdUT) * 86400).toFixed(0)}\\ \\text{s}`,
			`\\theta = \\text{${raText(Clock.lst(jdUT, lon))}}`
		]);
		this.plot.redraw();
	},

	/* Right ascension and declination of ecliptic coordinates, with the
	   mean obliquity of date (page 1.2). */
	equatorial(place, jdTT) {
		return Frames.eclipticToEquatorial(place.lon, place.lat, Ephem.meanObliquity(jdTT));
	},

	/* The UT moments (hours of the day) at which a body rises, crosses
	   the meridian and sets within the UT day starting at day (JD). */
	times(body, day, phi, lon) {
		const at = jdUT => this.equatorial(body.model(Time.ttFromUt(jdUT)), Time.ttFromUt(jdUT));
		const altitude = jdUT => {
			const eq = at(jdUT);

			return Frames.equatorialToHorizontal(eq.ra, eq.dec, phi, Clock.lst(jdUT, lon)).a - body.h0;
		};
		const hourAngle = jdUT => Clock.hourAngle(jdUT, lon, at(jdUT).ra);
		const hours = jd => (jd - day) * 24;

		return {
			rise: hours(crossing(altitude, day, 1)),
			transit: hours(crossing(hourAngle, day, 1)),
			set: hours(crossing(altitude, day, -1))
		};
	},

	/* The two tables: one row per body, always the same rows. */
	fillTables() {
		const longitudes = byId('calc-longitudes').querySelector('tbody');
		const place = byId('calc-place').querySelector('tbody');

		longitudes.innerHTML = this.rows
			.map(row => {
				const difference = norm180(row.model.lon - row.reference.lon) * 60;

				return (
					`<tr><td>${row.body.name}</td><td>${row.model.lon.toFixed(2)}°</td>` +
					`<td>${row.reference.lon.toFixed(2)}°</td><td>${signed(difference, 1)}′</td></tr>`
				);
			})
			.join('');

		place.innerHTML = this.rows
			.map(
				row =>
					`<tr><td>${row.body.name}</td><td>${raText(row.eq.ra)}</td><td>${signed(row.eq.dec, 1)}°</td>` +
					`<td>${clockText(row.times.rise)}</td><td>${clockText(row.times.transit)}</td>` +
					`<td>${clockText(row.times.set)}</td></tr>`
			)
			.join('');
	},

	draw() {
		const p = this.plot;

		if (!p || !this.rows) {
			return;
		}

		p.frame();
		this.drawSunBand(norm360(this.rows[0].model.lon));

		this.rows.forEach((row, i) => {
			const y = BODIES.length - i;

			p.marker(360 - norm360(row.reference.lon), y, { color: row.body.color, radius: 7, ring: false });
			p.marker(360 - norm360(row.reference.lon), y, { color: COL.card, radius: 5.5, ring: false });
			p.marker(360 - norm360(row.model.lon), y, { color: row.body.color, radius: 4 });
		});
	},

	/* The band within SUN_BAND of the Sun, split where it crosses 0°. */
	drawSunBand(sun) {
		const p = this.plot;
		const pieces = [];
		const from = sun - SUN_BAND;
		const to = sun + SUN_BAND;

		if (from < 0) {
			pieces.push([from + 360, 360], [0, to]);
		} else if (to > 360) {
			pieces.push([from, 360], [0, to - 360]);
		} else {
			pieces.push([from, to]);
		}

		p.ctx.save();
		p.ctx.fillStyle = withAlpha(COL.sun, 0.16);
		pieces.forEach(([a, b]) => {
			const x1 = p.px(360 - b);
			const x2 = p.px(360 - a);

			p.ctx.fillRect(x1, p.box.top, x2 - x1, p.box.bottom - p.box.top);
		});
		p.ctx.restore();
	}
};

/* ==========================================================================
   3. FIGURE 2: THE ERROR LADDER
   Static: every model of the course against the reference, the Sun and
   the Moon every day of 2026, Mars every day of 2010 - 2025 (page 4.5's
   Figure 6), the four ellipses of this page every day of 2026
   (tools/numbers/toolbox.js).
   ========================================================================== */

const crankAlone = Object.assign({}, LunarCrank.FIT_2026, { direction: false });

const ladderFigure = {
	init() {
		const year = y => Time.julianDay(y, 1, 1);
		const sun = jd => Ephem.sun(jd, VSOP).lon;
		const moon = jd => Ephem.moon(jd).lon;
		const mars = jd => Ephem.planet('mars', jd, VSOP).lon;
		const names = 128;

		this.panels = [
			ErrorLadder.panel(
				byId('ladder-sun'),
				[
					{ page: '1.3', name: 'uniform', fn: MeanSun.make(MeanSun.MODERN) },
					{ page: '2.1', name: 'eccentric', fn: SolarEccentric.make(SolarEccentric.FIT_2026) },
					{ page: '4.5', name: 'ellipse', fn: sunModel }
				],
				sun,
				year(2026),
				year(2027),
				1,
				{ names }
			),
			ErrorLadder.panel(
				byId('ladder-moon'),
				[
					{ page: '3.1', name: 'uniform', fn: LunarEpicycle.makeUniform(LunarEpicycle.FIT_2026) },
					{ page: '3.1', name: 'epicycle', fn: LunarEpicycle.make(LunarEpicycle.FIT_2026) },
					{ page: '3.2', name: 'crank alone', fn: LunarCrank.make(crankAlone) },
					{ page: '3.2', name: 'crank', fn: moonLongitude }
				],
				moon,
				year(2026),
				year(2027),
				1,
				{ names }
			),
			ErrorLadder.panel(
				byId('ladder-mars'),
				[
					{ page: '4.1', name: 'uniform', fn: PlanetEpicycle.makeUniform(PlanetEpicycle.MARS_FIT) },
					{ page: '4.1', name: 'epicycle', fn: PlanetEpicycle.make(PlanetEpicycle.MARS_FIT) },
					{ page: '4.2', name: 'equant', fn: PlanetEquant.make(PlanetEquant.MARS_FIT) },
					{ page: '4.3', name: 'epicyclet', fn: PlanetArrangement.makeEpicyclet() },
					{ page: '4.5', name: 'ellipses', fn: Kepler.make() }
				],
				mars,
				year(2010),
				year(2026),
				1,
				{ names }
			),
			this.otherPlanets(year, names)
		];
	},

	/* The four ellipses of this page, each against its own planet. */
	otherPlanets(year, names) {
		const rows = ['mercury', 'venus', 'jupiter', 'saturn'].map(name => ({
			page: '',
			name: `${name.charAt(0).toUpperCase() + name.slice(1)} ellipses`,
			fn: Kepler.make(Kepler.PLANETS_FIT[name]),
			reference: jd => Ephem.planet(name, jd, VSOP).lon
		}));

		return ErrorLadder.panel(byId('ladder-planets'), rows, null, year(2026), year(2027), 1, {
			names,
			join: false
		});
	}
};

/* ==========================================================================
   4. THE TABLE OF THE FITTED PARAMETERS
   One row per parameter set, read from the models at load (never copied):
   the page, the model, its parameters with their symbols, and the
   observations it was fitted to (from the comments of shared/models/).
   ========================================================================== */

/* A parameter: its TeX symbol, its value and the number of decimals. */
const param = (symbol, value, digits) => `$${symbol} = ${Number(value).toFixed(digits)}$`;

const PARAMETER_ROWS = [
	{
		page: '1.3',
		model: 'the mean Sun',
		values: () => [param('L_0', MeanSun.MODERN.L0, 6), param('n', MeanSun.MODERN.n, 11)],
		fitted: 'the equinoxes and solstices of 1926–2025; the Sun of 2007–2025'
	},
	{
		page: '2.1',
		model: "the Sun's eccentric",
		values: () => [
			param('L_0', SolarEccentric.FIT_2026.L0, 5),
			param('e', SolarEccentric.FIT_2026.e, 6),
			param('\\lambda_A', SolarEccentric.FIT_2026.apogee, 3)
		],
		fitted: 'the spring and summer of 2026'
	},
	{
		page: '2.3',
		model: 'precession; the apogee',
		values: () => [
			`$p = ${(Precession.MODERN.rate * 3600).toFixed(3)}''$ a year`,
			`$\\dot\\lambda_A = ${SolarEccentric.MOVING_2026.apogeeRate.toFixed(3)}^\\circ$ a century`
		],
		fitted: 'the shift of γ over 1926.0–2026.0; the seasons of 1826–2025'
	},
	{
		page: '3.1',
		model: "the Moon's epicycle",
		values: () => [
			param('L_0', LunarEpicycle.FIT_2026.L0, 6),
			param('n', LunarEpicycle.FIT_2026.n, 9),
			param('M_0', LunarEpicycle.FIT_2026.M0, 6),
			param('n_M', LunarEpicycle.FIT_2026.nM, 9),
			param('e', LunarEpicycle.FIT_2026.e, 6)
		],
		fitted: 'the new Moons of 1926–2025; the eclipses of September 2025, March and August 2026'
	},
	{
		page: '3.2',
		model: 'the crank',
		values: () => [param('c', LunarCrank.FIT_2026.c, 6)],
		fitted: 'the quarter Moons of 2025'
	},
	{
		page: '3.3',
		model: "the Moon's inclined circle",
		values: () => [
			param('F_0', LunarLatitude.FIT_2026.F0, 6),
			param('n_F', LunarLatitude.FIT_2026.nF, 9),
			param('i', LunarLatitude.FIT_2026.i, 4)
		],
		fitted: 'the ecliptic latitudes at the new and full Moons of 1926–2025 and of 2025–2026'
	},
	{
		page: '4.1',
		model: "Mars' epicycle",
		values: () => [
			param('L_0', PlanetEpicycle.MARS_FIT.L0, 6),
			param('n', PlanetEpicycle.MARS_FIT.n, 9),
			param('r', PlanetEpicycle.MARS_FIT.r, 5)
		],
		fitted: 'the oppositions of 1931–1946 and 2010–2025, and their loops'
	},
	{
		page: '4.2',
		model: "Mars' equant",
		values: () => [
			param('L_0', PlanetEquant.MARS_FIT.L0, 6),
			param('\\lambda_A', PlanetEquant.MARS_FIT.apogee, 3),
			param('e', PlanetEquant.MARS_FIT.e, 6),
			param('r', PlanetEquant.MARS_FIT.r, 5)
		],
		fitted: 'the oppositions to the mean Sun of 1931–1946 and 2010–2025, and the loops of 2010–2025'
	},
	{
		page: '4.3',
		model: 'the arrangement',
		values: () =>
			PlanetArrangement.PLANETS.map(name => {
				const fit = PlanetArrangement.FIT[name];

				return `${name}: $S = ${fit.S.toFixed(3)}$ d, $a = ${fit.a.toFixed(4)}$ au`;
			}),
		fitted: 'the oppositions and inferior conjunctions of 1926–2025; the greatest elongations and loops of 1986–2025'
	},
	{
		page: '4.5',
		model: "the Sun's ellipse",
		values: () => [
			param('L_0', Kepler.SUN_2026.L0, 6),
			param('e', Kepler.SUN_2026.e, 6),
			param('\\lambda_A', Kepler.SUN_2026.apogee, 4)
		],
		fitted: 'the spring and summer of 2026'
	},
	{
		page: '4.5',
		model: "Mars' ellipse",
		values: () => [
			param('L_0', Kepler.MARS_FIT.L0, 6),
			param('\\lambda_A', Kepler.MARS_FIT.apogee, 4),
			param('e', Kepler.MARS_FIT.e, 6),
			param('a', Kepler.MARS_FIT.a, 6)
		],
		fitted: 'the oppositions of 1931–1946 and 2010–2025; the third law'
	}
].concat(
	['mercury', 'venus', 'jupiter', 'saturn'].map(name => ({
		page: 'toolbox',
		model: `${name.charAt(0).toUpperCase() + name.slice(1)}'s ellipse`,
		values: () => {
			const p = Kepler.PLANETS_FIT[name];

			return [
				param('L_0', p.L0, 6),
				param('n', p.n, 9),
				param('\\lambda_A', p.apogee, 4),
				param('e', p.e, 6),
				param('a', p.a, 6)
			];
		},
		fitted:
			name === 'mercury' || name === 'venus'
				? 'the inferior conjunctions of 1926–2025; the third law'
				: 'the oppositions to the real Sun of 1926–2025; the third law'
	}))
);

function buildParameters() {
	const body = byId('params-table').querySelector('tbody');

	body.innerHTML = PARAMETER_ROWS.map(
		row =>
			`<tr><td>${row.page}</td><td>${row.model}</td>` +
			`<td class="params">${row.values().join('<br>')}</td><td>${row.fitted}</td></tr>`
	).join('');
}

/* ==========================================================================
   5. PAGE START
   The parameters table first, so that the shared components typeset its
   mathematics with the prose; then the figures.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
	buildParameters();
	Site.initPage();
	startFigures([calculator, ladderFigure]);
});
