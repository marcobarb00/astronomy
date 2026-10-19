/* ==========================================================================
   PLATE PREVIEWS (plates.js)
   Three blue plates (STYLE.md §7) drawn as inline SVG, to decide whether
   they earn a place in Act I. Preview only: nothing here is used by the
   pages yet.
	 A. page 1.1: the sky around the pole, as seen from the ground
	 B. page 1.2: the zodiac around Taurus, as seen looking south
	 C. page 1.3: the polar wheel of Figure 1, interactive, in plate style
   Stars: plate-stars.js (SIMBAD, Hipparcos) and shared/stars.js, carried
   to 2026.0 by Stars.ofDate; four-pointed stars from starPath (common.js).
   Needs common.js, time.js, ephemeris.js, stars.js, models/frames.js,
   models/clock.js, models/mean-sun.js, components.js, plate-stars.js.

   TABLE OF CONTENTS
	 0. SVG helpers
	 1. Shared plate pieces: stars of date, constellation figures,
		Milky Way, graduated ring
	 2. Plate A: the sky around the pole (page 1.1)
	 3. Plate B: the zodiac around Taurus (page 1.2)
	 4. Plate C: the polar wheel (page 1.3)
	 5. Page start
   ========================================================================== */


/* ==========================================================================
   0. SVG HELPERS
   ========================================================================== */

const SVG_NS = 'http://www.w3.org/2000/svg';

/* Create an SVG element with attributes, appended to parent if given. */
function svgEl(tag, attrs = {}, parent = null) {
	const element = document.createElementNS(SVG_NS, tag);

	Object.entries(attrs).forEach(([name, value]) => {
		element.setAttribute(name, value);
	});

	if (parent) {
		parent.appendChild(element);
	}

	return element;
}

/* A text element. */
function svgText(parent, text, x, y, attrs = {}) {
	const element = svgEl('text', Object.assign({ x: x.toFixed(1), y: y.toFixed(1) }, attrs), parent);

	element.textContent = text;

	return element;
}

/* A polyline through screen points [{x, y}, ...]. */
function svgLine(parent, points, attrs = {}) {
	const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

	return svgEl('path', Object.assign({ d: d, fill: 'none' }, attrs), parent);
}

/* A new plate SVG in a container, with its viewBox. */
function newPlateSvg(container, width, height, label) {
	container.replaceChildren();

	return svgEl('svg', {
		viewBox: `0 0 ${width} ${height}`,
		role: 'img',
		'aria-label': label
	}, container);
}


/* ==========================================================================
   1. SHARED PLATE PIECES
   ========================================================================== */

/* The plates show the sky of 2026.0. */
const PLATE_EPOCH = Time.julianDay(2026, 1, 1);

/* Stars fainter than this are drawn only when they belong to a figure. */
const PLATE_MAG_LIMIT = 4.6;

/* Star marks on a plate are a little smaller than in the figures, as the
   charts hold many more stars. */
const PLATE_STAR_SCALE = 0.85;

/* Fonts of the plates (STYLE.md §3 and §7). */
const PLATE_FONT_NAME = '"Cormorant SC", Georgia, serif';
const PLATE_FONT_TEXT = 'Spectral, Georgia, serif';

/* Every plate star at its position of 2026.0, by SIMBAD id. */
const plateStars = new Map(PLATE_STARS.map(star => {
	const position = Stars.ofDate(star, PLATE_EPOCH);

	return [star.id, { id: star.id, mag: star.mag, ra: position.ra, dec: position.dec }];
}));

/* Constellation figures: lines between stars (SIMBAD ids), and where the
   name goes (ra, dec of 2026). */
const FIGURES = {
	'URSA MAJOR': {
		lines: [['alf UMa', 'bet UMa'], ['bet UMa', 'gam UMa'], ['gam UMa', 'del UMa'], ['del UMa', 'alf UMa'],
			['del UMa', 'eps UMa'], ['eps UMa', 'zet01 UMa'], ['zet01 UMa', 'eta UMa']],
		name: [188, 43]
	},
	'URSA MINOR': {
		lines: [['alf UMi', 'del UMi'], ['del UMi', 'eps UMi'], ['eps UMi', 'zet UMi'], ['zet UMi', 'bet UMi'],
			['bet UMi', 'gam UMi'], ['gam UMi', 'eta UMi'], ['eta UMi', 'zet UMi']],
		name: [264, 61]
	},
	'CASSIOPEIA': {
		lines: [['eps Cas', 'del Cas'], ['del Cas', 'gam Cas'], ['gam Cas', 'alf Cas'], ['alf Cas', 'bet Cas']],
		name: [16, 51]
	},
	'CEPHEUS': {
		lines: [['alf Cep', 'bet Cep'], ['bet Cep', 'gam Cep'], ['gam Cep', 'iot Cep'], ['iot Cep', 'zet Cep'], ['zet Cep', 'alf Cep']],
		name: [350, 69]
	},
	'CYGNUS': {
		lines: [['alf Cyg', 'gam Cyg'], ['gam Cyg', 'eta Cyg'], ['eta Cyg', 'bet01 Cyg'], ['del Cyg', 'gam Cyg'], ['gam Cyg', 'eps Cyg']],
		name: [318, 36]
	},
	'TAURUS': {
		lines: [['lam Tau', 'gam Tau'], ['gam Tau', 'del Tau'], ['del Tau', 'eps Tau'], ['gam Tau', 'tet02 Tau'],
			['tet02 Tau', 'alf Tau'], ['eps Tau', 'bet Tau'], ['alf Tau', 'zet Tau']],
		name: [62, 11]
	},
	'ARIES': {
		lines: [['gam02 Ari', 'bet Ari'], ['bet Ari', 'alf Ari'], ['alf Ari', '41 Ari']],
		name: [36, 27]
	},
	'ORION': {
		lines: [['lam Ori', 'alf Ori'], ['lam Ori', 'gam Ori'], ['alf Ori', 'zet Ori'], ['gam Ori', 'del Ori'],
			['del Ori', 'eps Ori'], ['eps Ori', 'zet Ori'], ['zet Ori', 'kap Ori'], ['del Ori', 'bet Ori']],
		name: [71, 1]
	}
};

/* Every star that a figure line touches (drawn whatever its magnitude). */
const FIGURE_STARS = new Set(Object.values(FIGURES).flatMap(figure => figure.lines.flat()));

/* Draw the stars of a plate: those brighter than PLATE_MAG_LIMIT and
   those of the figures, through project(ra, dec) -> {x, y} or null. */
function drawPlateStars(group, project) {
	plateStars.forEach(star => {
		if (star.mag > PLATE_MAG_LIMIT && !FIGURE_STARS.has(star.id)) {
			return;
		}

		const q = project(star.ra, star.dec);

		if (q) {
			svgEl('path', { d: starPath(q.x, q.y, PLATE_STAR_SCALE * starSize(star.mag)) }, group);
		}
	});
}

/* Draw the constellation lines and names of the given figures. */
function drawFigures(linesGroup, namesGroup, names, project) {
	names.forEach(name => {
		const figure = FIGURES[name];

		figure.lines.forEach(([a, b]) => {
			const p = plateStars.get(a);
			const q = plateStars.get(b);
			const pa = project(p.ra, p.dec);
			const qa = project(q.ra, q.dec);

			if (pa && qa) {
				svgLine(linesGroup, [pa, qa]);
			}
		});

		const at = project(figure.name[0], figure.name[1]);

		if (at) {
			svgText(namesGroup, name, at.x, at.y, { 'text-anchor': 'middle' });
		}
	});
}

/* The Milky Way as stipple: points spread about the galactic equator
   (Gaussian in latitude, sigma 4°, cut at ±12°), denser towards the
   galactic centre. A fixed seed draws the same points every time.
   Equatorial coordinates (J2000) from the galactic ones, with the IAU
   galactic pole. */
const GALACTIC_POLE = { ra: 192.85948, dec: 27.12825, lonOfCelestialPole: 122.93192 };

function seededRandom(seed) {
	let state = seed;

	return () => {
		state = (state + 0x6D2B79F5) | 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function galacticToEquatorial(l, b) {
	const { ra, dec, lonOfCelestialPole } = GALACTIC_POLE;
	const dl = lonOfCelestialPole - l;
	const sinDec = sin(b) * sin(dec) + cos(b) * cos(dec) * cos(dl);
	const y = cos(b) * sin(dl);
	const x = sin(b) * cos(dec) - cos(b) * sin(dec) * cos(dl);

	return { ra: norm360(ra + atan2d(y, x)), dec: asin(sinDec) };
}

const MILKY_WAY = (function () {
	const random = seededRandom(1610);
	const points = [];

	while (points.length < 9000) {
		const l = 360 * random();
		const b = 4 * (random() + random() + random() + random() - 2) * Math.sqrt(3);
		const keep = 0.3 + 0.7 * (1 + cos(l)) / 2;

		if (Math.abs(b) < 12 && random() < keep) {
			points.push(galacticToEquatorial(l, b));
		}
	}

	return points;
})();

function drawMilkyWay(group, project) {
	MILKY_WAY.forEach(point => {
		const q = project(point.ra, point.dec);

		if (q) {
			svgEl('circle', { cx: q.x.toFixed(1), cy: q.y.toFixed(1), r: 0.8 }, group);
		}
	});
}

/* A graduated ring between radii r1 and r2 about (cx, cy): 24 segments,
   light and dark in turn, the hour h centred at angleOf(h) (degrees
   clockwise from the top); labels at radius rLabel. */
function drawHourRing(svg, cx, cy, r1, r2, rLabel, angleOf) {
	const ring = svgEl('g', { class: 'ring' }, svg);
	const point = (angle, r) => ({ x: cx + r * sin(angle), y: cy - r * cos(angle) });

	for (let h = 0; h < 24; h++) {
		const a0 = angleOf(h) - 7.5;
		const a1 = angleOf(h) + 7.5;
		const p0 = point(a0, r1);
		const p1 = point(a1, r1);
		const p2 = point(a1, r2);
		const p3 = point(a0, r2);
		// from a0 to a1 is clockwise on the screen (SVG sweep flag 1), and back
		const d = `M${p0.x} ${p0.y} A${r1} ${r1} 0 0 1 ${p1.x} ${p1.y} ` +
			`L${p2.x} ${p2.y} A${r2} ${r2} 0 0 0 ${p3.x} ${p3.y} Z`;

		svgEl('path', { d: d, class: (h % 2 === 0) ? 'light' : 'dark' }, ring);

		const at = point(angleOf(h), rLabel);

		svgText(ring, `${h}h`, at.x, at.y + 5, { 'text-anchor': 'middle', class: 'hour' });
	}

	svgEl('circle', { cx: cx, cy: cy, r: r1, class: 'edge' }, ring);
	svgEl('circle', { cx: cx, cy: cy, r: r2, class: 'edge' }, ring);
}


/* ==========================================================================
   2. PLATE A: THE SKY AROUND THE POLE (PAGE 1.1)
   Azimuthal equidistant chart centred on the north celestial pole, down
   to declination +25°, as seen from the ground looking up: right
   ascension increases clockwise. Highlighted: the circle of declination
   90° - 41.9° = 48.1°, inside which no star sets at Rome.
   ========================================================================== */

const POLAR = { size: 640, rim: 25, R: 250, romeLatitude: 41.9 };

function drawPolarPlate(container) {
	const { size, rim, R, romeLatitude } = POLAR;
	const c = size / 2;
	const svg = newPlateSvg(container, size, size, 'Chart of the northern sky around the celestial pole, with a dashed circle around the stars that never set at Rome.');
	const radius = dec => R * (90 - dec) / (90 - rim);
	const at = (ra, dec) => ({ x: c + radius(dec) * sin(ra), y: c - radius(dec) * cos(ra) });
	const project = (ra, dec) => (dec >= rim ? at(ra, dec) : null);

	// graticule: declination every 10°, right ascension every 2 h
	const grid = svgEl('g', { class: 'grid' }, svg);

	for (let dec = 30; dec <= 80; dec += 10) {
		svgEl('circle', { cx: c, cy: c, r: radius(dec) }, grid);
	}

	for (let ra = 0; ra < 360; ra += 30) {
		svgLine(grid, [at(ra, 80), at(ra, rim)]);
	}

	[40, 60, 80].forEach(dec => {
		const q = at(15, dec);

		svgText(grid, `${dec}°`, q.x + 4, q.y - 3, { class: 'grid-label' });
	});

	drawMilkyWay(svgEl('g', { class: 'milky-way' }, svg), project);
	drawHourRing(svg, c, c, R + 6, R + 20, R + 38, h => 15 * h);

	// the figures, the stars, their names
	const lines = svgEl('g', { class: 'figure-lines' }, svg);
	const names = svgEl('g', { class: 'figure-names' }, svg);

	drawFigures(lines, names, ['URSA MAJOR', 'URSA MINOR', 'CASSIOPEIA', 'CEPHEUS', 'CYGNUS'], project);
	drawPlateStars(svgEl('g', { class: 'stars' }, svg), project);

	const starNames = svgEl('g', { class: 'star-names' }, svg);

	[['alf UMi', 'Polaris', 8, 4], ['bet UMi', 'Kochab', -58, 4], ['alf UMa', 'Dubhe', 9, 4],
		['alf Aur', 'Capella', 9, 4], ['alf Lyr', 'Vega', 10, 4], ['alf Cyg', 'Deneb', 9, 16]].forEach(([id, name, dx, dy]) => {
		const star = plateStars.get(id);
		const q = at(star.ra, star.dec);

		svgText(starNames, name, q.x + dx, q.y + dy);
	});

	// the pole, and the highlighted limit for Rome
	svgText(svg, 'P', c - 16, c + 18, { class: 'symbol' });
	svgEl('circle', { cx: c, cy: c, r: radius(90 - romeLatitude), class: 'highlight' }, svg);

	return svg;
}


/* ==========================================================================
   3. PLATE B: THE ZODIAC AROUND TAURUS (PAGE 1.2)
   Rectangular (equirectangular) chart, right ascension 1h30 to 6h30,
   declination -10° to +30°, as seen looking south: north up, east (greater
   right ascension) to the left. Graduated border every 30 min and every 5°.
   Highlighted: the ecliptic of 2026.
   ========================================================================== */

const ZODIAC = {
	raMin: 22.5, raMax: 97.5, decMin: -10, decMax: 30,
	scale: 8, left: 64, top: 40, band: 10
};

function drawZodiacPlate(container) {
	const { raMin, raMax, decMin, decMax, scale, left, top, band } = ZODIAC;
	const width = (raMax - raMin) * scale;
	const height = (decMax - decMin) * scale;
	const svg = newPlateSvg(container, width + 2 * left, height + top + 70,
		'Chart of the band of the zodiac around Taurus, with the ecliptic highlighted.');
	const at = (ra, dec) => ({ x: left + (raMax - ra) * scale, y: top + (decMax - dec) * scale });
	const project = (ra, dec) => {
		const inside = ra >= raMin && ra <= raMax && dec >= decMin && dec <= decMax;

		return inside ? at(ra, dec) : null;
	};

	// the chart area is clipped to its rectangle
	const clip = svgEl('clipPath', { id: 'zodiac-clip' }, svgEl('defs', {}, svg));

	svgEl('rect', { x: left, y: top, width: width, height: height }, clip);

	const chart = svgEl('g', { 'clip-path': 'url(#zodiac-clip)' }, svg);
	const grid = svgEl('g', { class: 'grid' }, chart);

	for (let ra = 30; ra <= 90; ra += 15) {
		svgLine(grid, [at(ra, decMin), at(ra, decMax)]);
	}

	for (let dec = decMin; dec <= decMax; dec += 10) {
		svgLine(grid, [at(raMin, dec), at(raMax, dec)], dec === 0 ? { class: 'equator' } : {});
	}

	drawMilkyWay(svgEl('g', { class: 'milky-way' }, chart), project);

	const lines = svgEl('g', { class: 'figure-lines' }, chart);
	const names = svgEl('g', { class: 'figure-names' }, chart);

	drawFigures(lines, names, ['TAURUS', 'ARIES', 'ORION'], project);
	drawPlateStars(svgEl('g', { class: 'stars' }, chart), project);

	// the ecliptic of 2026, highlighted
	const eps = Ephem.meanObliquity(PLATE_EPOCH);
	const ecliptic = [];

	for (let lon = 0; lon <= 120; lon += 1) {
		const p = Frames.eclipticPoint(lon, eps);

		ecliptic.push(at(p.ra, p.dec));
	}

	svgLine(chart, ecliptic, { class: 'highlight' });

	// names of stars and of the two circles
	const starNames = svgEl('g', { class: 'star-names' }, chart);

	[['alf Tau', 'Aldebaran', 8, 22], ['alf Ori', 'Betelgeuse', 9, 4], ['bet Ori', 'Rigel', 9, 4],
		['alf Ari', 'Hamal', 9, 4], ['eta Tau', 'Pleiades', -14, -12]].forEach(([id, name, dx, dy]) => {
		const star = plateStars.get(id);
		const q = at(star.ra, star.dec);

		svgText(starNames, name, q.x + dx, q.y + dy);
	});

	svgText(chart, 'equator', left + 8, at(0, 0).y - 6, { class: 'circle-name' });

	const eclipticLabel = Frames.eclipticPoint(25, eps);
	const e = at(eclipticLabel.ra, eclipticLabel.dec);

	svgText(chart, 'ecliptic', e.x + 8, e.y + 18, { class: 'circle-name highlight-text' });

	drawGraduatedBorder(svg, at);

	return svg;
}

/* The border of the rectangular chart: bands light and dark every 30 min
   of right ascension and every 5° of declination, the hours labelled under
   it and the degrees on its left. */
function drawGraduatedBorder(svg, at) {
	const { raMin, raMax, decMin, decMax, band } = ZODIAC;
	const border = svgEl('g', { class: 'ring' }, svg);
	const topLeft = at(raMax, decMax);
	const bottomRight = at(raMin, decMin);
	const box = (x, y, w, h, light) => svgEl('rect', { x: x, y: y, width: w, height: h, class: light ? 'light' : 'dark' }, border);

	for (let ra = raMin, i = 0; ra < raMax; ra += 7.5, i++) {
		const x = at(ra + 7.5, 0).x;
		const w = at(ra, 0).x - x;

		box(x, topLeft.y - band, w, band, i % 2 === 0);
		box(x, bottomRight.y, w, band, i % 2 === 0);
	}

	for (let dec = decMin, i = 0; dec < decMax; dec += 5, i++) {
		const y = at(0, dec + 5).y;
		const h = at(0, dec).y - y;

		box(topLeft.x - band, y, band, h, i % 2 === 0);
		box(bottomRight.x, y, band, h, i % 2 === 0);
	}

	svgEl('rect', {
		x: topLeft.x - band, y: topLeft.y - band,
		width: bottomRight.x - topLeft.x + 2 * band, height: bottomRight.y - topLeft.y + 2 * band,
		class: 'edge'
	}, border);
	svgEl('rect', {
		x: topLeft.x, y: topLeft.y, width: bottomRight.x - topLeft.x, height: bottomRight.y - topLeft.y,
		class: 'edge'
	}, border);

	for (let hours = 2; hours <= 6; hours++) {
		const q = at(15 * hours, decMin);

		svgText(border, `${hours}h`, q.x, q.y + band + 20, { 'text-anchor': 'middle', class: 'hour' });
	}

	for (let dec = decMin; dec <= decMax; dec += 10) {
		const q = at(raMax, dec);
		const text = dec > 0 ? `+${dec}°` : `${dec}°`.replace('-', '−');

		svgText(border, text, q.x - band - 6, q.y + 5, { 'text-anchor': 'end', class: 'hour' });
	}
}


/* ==========================================================================
   4. PLATE C: THE POLAR WHEEL (PAGE 1.3)
   The chart of Figure 1 of page 1.3 in plate style: seen from outside the
   sphere above P, down to declination -60°; the meridian of Greenwich is
   fixed and points up, and the sky turns clockwise under it. The hour ring
   of right ascension turns with the stars. Highlighted: the Sun.
   ========================================================================== */

const WHEEL = { size: 600, rimDec: -60, R: 228, year: 2026 };
const WHEEL_START = Time.julianDay(WHEEL.year, 1, 1);
const WHEEL_EPS = Ephem.meanObliquity(WHEEL_START);
const WHEEL_STAR_NAMES = ['Sirius', 'Betelgeuse', 'Vega', 'Arcturus'];
const WHEEL_STARS = Stars.LIST.map(star => ({
	name: star.name,
	mag: star.mag,
	position: Stars.ofDate(star, WHEEL_START)
}));

const wheelPlate = {
	state: null,

	init() {
		const players = {};

		wireSlider(byId('plate-day'), () => this.update(), day => Time.formatDate(WHEEL_START + day));
		wireSlider(byId('plate-time'), () => this.update(), hours => {
			const { whole, rest } = splitWithCarry(hours % 24, 60);

			return `${pad2(whole % 24)}:${pad2(rest)}`;
		});
		wirePresets(byId('plate-day').closest('.plate'));

		players.day = wirePlayButton(byId('plate-play-day'), byId('plate-time'), 1, {
			playLabel: 'Play a day',
			onPlay: () => players.year.pause()
		});
		players.year = wirePlayButton(byId('plate-play-year'), byId('plate-day'), 30, {
			playLabel: 'Play a year',
			onPlay: () => players.day.pause()
		});

		this.sunAtStart = this.sunRightAscension(WHEEL_START);
		this.update();
	},

	/* The real Sun (ra, dec) at JD(UT). */
	sunAt(jdUT) {
		const jdTT = Time.ttFromUt(jdUT);

		return Ephem.equatorial(Ephem.sun(jdTT), jdTT);
	},

	sunRightAscension(jdUT) {
		return this.sunAt(jdUT).ra;
	},

	/* As in page 1.3: the turns of the sky and of the Sun since the start. */
	update() {
		const elapsed = readNumber('plate-day') + readNumber('plate-time') / 24;
		const jd = WHEEL_START + elapsed;
		const sun = this.sunAt(jd);
		const n = MeanSun.MODERN.n;
		const sunMoved = n * elapsed + norm180(sun.ra - this.sunAtStart - n * elapsed);

		this.state = {
			theta: Clock.gmst(jd),
			sun: sun,
			skyTurns: Clock.RATE * elapsed / 360,
			sunTurns: (Clock.RATE * elapsed - sunMoved) / 360,
			elapsed: elapsed
		};

		const days = Math.floor(elapsed + 1e-9);

		showLines('plate-readout', [
			`\\text{elapsed: } ${days}\\,\\text{d}\\ ${hmTex((elapsed - days) * 24)}`,
			`\\text{sky: } ${this.state.skyTurns.toFixed(3)}\\ \\text{turns}`,
			`\\text{Sun: } ${this.state.sunTurns.toFixed(3)}\\ \\text{turns}`
		]);

		this.draw();
	},

	draw() {
		const { size, rimDec, R } = WHEEL;
		const c = size / 2;
		const { theta, sun } = this.state;
		const svg = newPlateSvg(byId('plate-wheel'), size, size, 'The sky from above the north celestial pole, turning under the fixed meridian.');
		const radius = dec => R * (90 - dec) / (90 - rimDec);
		const at = (ra, dec) => {
			const H = theta - ra;

			return { x: c + radius(dec) * sin(H), y: c - radius(dec) * cos(H) };
		};

		// the rim, the equator, the ecliptic
		const grid = svgEl('g', { class: 'grid' }, svg);

		svgEl('circle', { cx: c, cy: c, r: radius(rimDec) }, grid);
		svgEl('circle', { cx: c, cy: c, r: radius(0), class: 'equator' }, svg);

		const ecliptic = [];

		for (let lon = 0; lon <= 360; lon += 2) {
			const p = Frames.eclipticPoint(lon, WHEEL_EPS);

			ecliptic.push(at(p.ra, p.dec));
		}

		svgLine(svg, ecliptic, { class: 'ecliptic' });

		// the hour ring of right ascension, turning with the sky
		drawHourRing(svg, c, c, R + 6, R + 20, R + 36, h => theta - 15 * h);

		// the fixed meridian, from P up through the ring
		svgLine(svg, [{ x: c, y: c }, { x: c, y: c - R - 22 }], { class: 'meridian' });
		svgText(svg, 'meridian', c + 8, c - R + 20, { class: 'circle-name' });

		// the stars, four of them named
		const stars = svgEl('g', { class: 'stars' }, svg);
		const starNames = svgEl('g', { class: 'star-names' }, svg);

		WHEEL_STARS.forEach(({ name, mag, position }) => {
			if (position.dec < rimDec) {
				return;
			}

			const q = at(position.ra, position.dec);
			const s = starSize(mag);

			svgEl('path', { d: starPath(q.x, q.y, s) }, stars);

			if (WHEEL_STAR_NAMES.includes(name)) {
				svgText(starNames, name, q.x + s + 4, q.y + 5);
			}
		});

		// the points: P, gamma, K, and the Sun (highlighted)
		const points = svgEl('g', { class: 'points' }, svg);
		const dot = (q, r, label, dx, dy, className = '') => {
			svgEl('circle', { cx: q.x, cy: q.y, r: r, class: className }, points);
			svgText(points, label, q.x + dx, q.y + dy, { class: `symbol ${className}` });
		};

		dot({ x: c, y: c }, 3, 'P', 7, 16);
		dot(at(0, 0), 3.5, 'γ', 8, 5);
		dot(at(270, 90 - WHEEL_EPS), 3, 'K', 7, 5);
		dot(at(sun.ra, sun.dec), 7, 'Sun', 11, 5, 'highlight-fill');
	}
};


/* ==========================================================================
   5. PAGE START
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
	Site.initPage();
	drawPolarPlate(byId('plate-polar'));
	drawZodiacPlate(byId('plate-zodiac'));
	wheelPlate.init();
});
