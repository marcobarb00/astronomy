// @ts-check
/* ==========================================================================
   PREDICTING THE SKY - BLUE PLATES (plate.js)
   Static charts of the sky in the style of a cyanotype star atlas: white
   lines and stars on Prussian blue, one element highlighted (STYLE.md §7).
   Drawn as inline SVG. Needs common.js, time.js, ephemeris.js, stars.js and
   plate-stars.js (the stars, from SIMBAD).

   Usage (see page 1.1, Figure 1)
	 const chart = Plate.polar(byId('plate-pole'), {
		 rimDec: 25,
		 figures: ['URSA MAJOR', 'CASSIOPEIA'],
		 names: [['alf UMi', 'Polaris', 8, 4]],
		 label: 'Chart of the sky around the pole'
	 });
	 Plate.highlightCircle(chart, 48.1);     // the one highlighted element

   Every plate shows the sky of 2026.0. Text sizes in theme.css are sizes
   on the screen: fitText keeps them so whatever the width of the chart,
   so a label never falls below 13 px (CLAUDE.md).

   TABLE OF CONTENTS
	 1. SVG helpers
	 2. Stars and constellation figures
	 3. The Milky Way
	 4. Graduated ring and border
	 5. Readable labels
	 6. Charts: polar and rectangular
	 7. Highlights
   ========================================================================== */

const Plate = (function () {
	/* ======================================================================
	   1. SVG HELPERS
	   ====================================================================== */

	const SVG_NS = 'http://www.w3.org/2000/svg';

	/* An SVG element with attributes, appended to parent if given. */
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

	/* A text element at (x, y). */
	function svgText(parent, text, x, y, attrs = {}) {
		const element = svgEl('text', Object.assign({ x: x.toFixed(1), y: y.toFixed(1) }, attrs), parent);

		element.textContent = text;

		return element;
	}

	/* A polyline through screen points [{ x, y }, ...]. */
	function svgLine(parent, points, attrs = {}) {
		const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

		return svgEl('path', Object.assign({ d: d, fill: 'none' }, attrs), parent);
	}

	/* A new SVG chart filling the container. */
	function newSvg(container, width, height, label) {
		container.replaceChildren();

		return svgEl(
			'svg',
			{
				viewBox: `0 0 ${width} ${height}`,
				role: 'img',
				'aria-label': label
			},
			container
		);
	}

	/* ======================================================================
	   2. STARS AND CONSTELLATION FIGURES
	   ====================================================================== */

	/* The plates show the sky of 2026.0. */
	const EPOCH = Time.julianDay(2026, 1, 1);

	/* Stars fainter than this are drawn only when they belong to a figure. */
	const MAG_LIMIT = 4.6;

	/* Star marks are a little smaller than in the figures (starSize in
	   common.js), as a chart holds many more stars. */
	const STAR_SCALE = 0.85;

	/* Every plate star at its position of 2026.0, by SIMBAD identifier. */
	const STARS = new Map(
		PLATE_STARS.map(star => {
			const position = Stars.ofDate(star, EPOCH);

			return [star.id, { id: star.id, mag: star.mag, ra: position.ra, dec: position.dec }];
		})
	);

	/* The usual constellation figures: lines between stars (SIMBAD
	   identifiers), and where the name goes (ra, dec of 2026, chosen clear
	   of the lines and of the star names). */
	const FIGURES = {
		'URSA MAJOR': {
			lines: [
				['alf UMa', 'bet UMa'],
				['bet UMa', 'gam UMa'],
				['gam UMa', 'del UMa'],
				['del UMa', 'alf UMa'],
				['del UMa', 'eps UMa'],
				['eps UMa', 'zet01 UMa'],
				['zet01 UMa', 'eta UMa']
			],
			name: [188, 43]
		},
		'URSA MINOR': {
			lines: [
				['alf UMi', 'del UMi'],
				['del UMi', 'eps UMi'],
				['eps UMi', 'zet UMi'],
				['zet UMi', 'bet UMi'],
				['bet UMi', 'gam UMi'],
				['gam UMi', 'eta UMi'],
				['eta UMi', 'zet UMi']
			],
			name: [264, 61]
		},
		'CASSIOPEIA': {
			lines: [
				['eps Cas', 'del Cas'],
				['del Cas', 'gam Cas'],
				['gam Cas', 'alf Cas'],
				['alf Cas', 'bet Cas']
			],
			name: [16, 51]
		},
		'CEPHEUS': {
			lines: [
				['alf Cep', 'bet Cep'],
				['bet Cep', 'gam Cep'],
				['gam Cep', 'iot Cep'],
				['iot Cep', 'zet Cep'],
				['zet Cep', 'alf Cep']
			],
			name: [350, 69]
		},
		'CYGNUS': {
			lines: [
				['alf Cyg', 'gam Cyg'],
				['gam Cyg', 'eta Cyg'],
				['eta Cyg', 'bet01 Cyg'],
				['del Cyg', 'gam Cyg'],
				['gam Cyg', 'eps Cyg']
			],
			name: [318, 36]
		},
		'TAURUS': {
			lines: [
				['lam Tau', 'gam Tau'],
				['gam Tau', 'del Tau'],
				['del Tau', 'eps Tau'],
				['gam Tau', 'tet02 Tau'],
				['tet02 Tau', 'alf Tau'],
				['eps Tau', 'bet Tau'],
				['alf Tau', 'zet Tau']
			],
			name: [62, 11]
		},
		'ARIES': {
			lines: [
				['gam02 Ari', 'bet Ari'],
				['bet Ari', 'alf Ari'],
				['alf Ari', '41 Ari']
			],
			name: [36, 27]
		},
		'ORION': {
			lines: [
				['lam Ori', 'alf Ori'],
				['lam Ori', 'gam Ori'],
				['alf Ori', 'zet Ori'],
				['gam Ori', 'del Ori'],
				['del Ori', 'eps Ori'],
				['eps Ori', 'zet Ori'],
				['zet Ori', 'kap Ori'],
				['del Ori', 'bet Ori']
			],
			name: [71, 1]
		}
	};

	/* Every star that a figure line touches (drawn whatever its magnitude). */
	const FIGURE_STARS = new Set(Object.values(FIGURES).flatMap(figure => figure.lines.flat()));

	/* The stars brighter than MAG_LIMIT and those of the figures, through
	   project(ra, dec) -> { x, y }, or null outside the chart. */
	function drawStars(group, project) {
		STARS.forEach(star => {
			if (star.mag > MAG_LIMIT && !FIGURE_STARS.has(star.id)) {
				return;
			}

			const q = project(star.ra, star.dec);

			if (q) {
				svgEl('path', { d: starPath(q.x, q.y, STAR_SCALE * starSize(star.mag)) }, group);
			}
		});
	}

	/* The lines and names of the given figures. */
	function drawFigures(linesGroup, namesGroup, names, project) {
		names.forEach(name => {
			const figure = FIGURES[name];

			figure.lines.forEach(([a, b]) => {
				const p = STARS.get(a);
				const q = STARS.get(b);
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

	/* Star names: [id, name, dx, dy, anchor] with the offset of the text
	   from the star; anchor 'end' puts the name to the left of that point
	   (default 'start'). */
	function drawStarNames(group, names, at) {
		names.forEach(([id, name, dx, dy, anchor]) => {
			const star = STARS.get(id);
			const q = at(star.ra, star.dec);

			svgText(group, name, q.x + dx, q.y + dy, { 'text-anchor': anchor ?? 'start' });
		});
	}

	/* ======================================================================
	   3. THE MILKY WAY
	   Fine stipple spread about the galactic equator (Gaussian in latitude,
	   sigma 4°, cut at ±12°), denser towards the galactic centre: a drawing
	   of the band, not catalogue data, and the keys say so. A fixed seed
	   draws the same points every time. Equatorial coordinates (J2000) from
	   the galactic ones, with the IAU galactic pole.
	   ====================================================================== */

	const GALACTIC_POLE = { ra: 192.85948, dec: 27.12825, lonOfCelestialPole: 122.93192 };
	const MILKY_WAY_POINTS = 9000;

	/* A small seeded generator of numbers in [0, 1) (mulberry32). */
	function seededRandom(seed) {
		let state = seed;

		return () => {
			state = (state + 0x6d2b79f5) | 0;
			let t = Math.imul(state ^ (state >>> 15), 1 | state);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	/* Galactic longitude and latitude -> { ra, dec } (J2000, degrees). */
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

		while (points.length < MILKY_WAY_POINTS) {
			const l = 360 * random();
			const b = 4 * Math.sqrt(3) * (random() + random() + random() + random() - 2);
			const keep = 0.3 + (0.7 * (1 + cos(l))) / 2;

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

	/* ======================================================================
	   4. GRADUATED RING AND BORDER
	   ====================================================================== */

	/* An hour ring about (cx, cy) between the radii inner and outer: 24
	   segments, light and dark in turn, hour h centred at angleOf(h)
	   (degrees clockwise from the top), labelled at the radius 'label'.
	   Odd hours are 'minor' labels, left out on a phone (theme.css). */
	function drawHourRing(svg, ring, angleOf) {
		const { cx, cy, inner, outer, label } = ring;
		const group = svgEl('g', { class: 'ring' }, svg);
		const point = (angle, r) => ({ x: cx + r * sin(angle), y: cy - r * cos(angle) });

		for (let h = 0; h < 24; h++) {
			const at = point(angleOf(h), label);

			svgEl(
				'path',
				{ d: ringSegment(point, angleOf(h), inner, outer), class: h % 2 === 0 ? 'light' : 'dark' },
				group
			);
			svgText(group, `${h}h`, at.x, at.y + 5, {
				'text-anchor': 'middle',
				class: h % 2 === 0 ? 'hour' : 'hour minor'
			});
		}

		svgEl('circle', { cx: cx, cy: cy, r: inner, class: 'edge' }, group);
		svgEl('circle', { cx: cx, cy: cy, r: outer, class: 'edge' }, group);
	}

	/* The SVG path of one hour of the ring (15° centred on 'centre'), from
	   centre - 7.5° to centre + 7.5°, clockwise on the screen along the
	   inner edge (SVG sweep flag 1), and back along the outer one. */
	function ringSegment(point, centre, inner, outer) {
		const p0 = point(centre - 7.5, inner);
		const p1 = point(centre + 7.5, inner);
		const p2 = point(centre + 7.5, outer);
		const p3 = point(centre - 7.5, outer);

		return (
			`M${p0.x} ${p0.y} A${inner} ${inner} 0 0 1 ${p1.x} ${p1.y} ` +
			`L${p2.x} ${p2.y} A${outer} ${outer} 0 0 0 ${p3.x} ${p3.y} Z`
		);
	}

	/* The border of a rectangular chart, 'band' wide: light and dark bands
	   every raStep degrees of right ascension (top, bottom) and every
	   decStep degrees of declination (sides); hours labelled under it,
	   degrees on its left. at(ra, dec) is the chart's projection. */
	function drawBorder(svg, area, at, style) {
		const border = svgEl('g', { class: 'ring' }, svg);
		const corners = { topLeft: at(area.raMax, area.decMax), bottomRight: at(area.raMin, area.decMin) };

		drawBorderBands(border, area, at, corners, style);
		drawBorderEdges(border, corners, style.band);
		drawBorderLabels(border, area, at, style.band);
	}

	/* The light and dark bands along the four sides. */
	function drawBorderBands(border, area, at, corners, style) {
		const { raMin, raMax, decMin, decMax } = area;
		const { topLeft, bottomRight } = corners;
		const { band, raStep, decStep } = style;
		const box = (x, y, w, h, light) => {
			svgEl('rect', { x: x, y: y, width: w, height: h, class: light ? 'light' : 'dark' }, border);
		};

		for (let ra = raMin, i = 0; ra < raMax - 1e-9; ra += raStep, i++) {
			const x = at(ra + raStep, 0).x;
			const w = at(ra, 0).x - x;

			box(x, topLeft.y - band, w, band, i % 2 === 0);
			box(x, bottomRight.y, w, band, i % 2 === 0);
		}

		for (let dec = decMin, i = 0; dec < decMax - 1e-9; dec += decStep, i++) {
			const y = at(0, dec + decStep).y;
			const h = at(0, dec).y - y;

			box(topLeft.x - band, y, band, h, i % 2 === 0);
			box(bottomRight.x, y, band, h, i % 2 === 0);
		}
	}

	/* The outer and inner edges of the border. */
	function drawBorderEdges(border, corners, band) {
		const { topLeft, bottomRight } = corners;
		const width = bottomRight.x - topLeft.x;
		const height = bottomRight.y - topLeft.y;

		svgEl(
			'rect',
			{
				x: topLeft.x - band,
				y: topLeft.y - band,
				width: width + 2 * band,
				height: height + 2 * band,
				class: 'edge'
			},
			border
		);
		svgEl('rect', { x: topLeft.x, y: topLeft.y, width: width, height: height, class: 'edge' }, border);
	}

	/* Hours under the border, degrees on its left. */
	function drawBorderLabels(border, area, at, band) {
		const { raMin, raMax, decMin, decMax } = area;

		for (let hours = Math.ceil(raMin / 15); hours * 15 <= raMax; hours++) {
			const q = at(15 * hours, decMin);

			svgText(border, `${hours}h`, q.x, q.y + band + 20, { 'text-anchor': 'middle', class: 'hour' });
		}

		for (let dec = Math.ceil(decMin / 10) * 10; dec <= decMax; dec += 10) {
			const q = at(raMax, dec);
			const text = dec > 0 ? `+${dec}°` : `${dec}°`.replace('-', '−');

			svgText(border, text, q.x - band - 6, q.y + 5, { 'text-anchor': 'end', class: 'hour' });
		}
	}

	/* ======================================================================
	   5. READABLE LABELS
	   The sizes of theme.css are sizes on the screen. The chart scales with
	   its column, so its text would scale too: --k, the number of chart
	   units per screen pixel (at least 1), multiplies every font size.
	   ====================================================================== */

	function fitText(svg, viewBoxWidth) {
		const update = () => {
			const width = svg.getBoundingClientRect().width || viewBoxWidth;

			svg.style.setProperty('--k', Math.max(1, viewBoxWidth / width).toFixed(3));
		};

		new ResizeObserver(update).observe(svg);
		update();
	}

	/* ======================================================================
	   6. CHARTS: POLAR AND RECTANGULAR
	   ====================================================================== */

	/* A chart centred on the north celestial pole, as seen from the ground
	   looking up (right ascension increases clockwise), down to declination
	   rimDec, with an hour ring. options: rimDec, figures, names, label.
	   Returns { svg, at, project, radius, centre }. */
	function polar(container, options) {
		const size = 640;
		const R = 250;
		const c = size / 2;
		const rimDec = options.rimDec;
		const svg = newSvg(container, size, size, options.label);
		const radius = dec => (R * (90 - dec)) / (90 - rimDec);
		const at = (ra, dec) => ({ x: c + radius(dec) * sin(ra), y: c - radius(dec) * cos(ra) });
		const project = (ra, dec) => (dec >= rimDec ? at(ra, dec) : null);

		// graticule: declination every 10°, right ascension every 2 h
		const grid = svgEl('g', { class: 'grid' }, svg);

		for (let dec = Math.ceil(rimDec / 10) * 10; dec <= 80; dec += 10) {
			svgEl('circle', { cx: c, cy: c, r: radius(dec) }, grid);
		}

		for (let ra = 0; ra < 360; ra += 30) {
			svgLine(grid, [at(ra, 80), at(ra, rimDec)]);
		}

		[40, 60, 80].forEach(dec => {
			const q = at(15, dec);

			svgText(grid, `+${dec}°`, q.x + 4, q.y - 3, { class: 'grid-label' });
		});

		drawMilkyWay(svgEl('g', { class: 'milky-way' }, svg), project);
		drawHourRing(svg, { cx: c, cy: c, inner: R + 6, outer: R + 20, label: R + 38 }, h => 15 * h);

		drawFigures(
			svgEl('g', { class: 'figure-lines' }, svg),
			svgEl('g', { class: 'figure-names' }, svg),
			options.figures,
			project
		);
		drawStars(svgEl('g', { class: 'stars' }, svg), project);
		drawStarNames(svgEl('g', { class: 'star-names' }, svg), options.names, at);

		svgText(svg, 'P', c - 16, c + 18, { class: 'symbol' });
		fitText(svg, size);

		return { svg, at, project, radius, centre: c };
	}

	/* A rectangular (equirectangular) chart as seen looking south: north
	   up, east (greater right ascension) to the left, with a graduated
	   border. options: area { raMin, raMax, decMin, decMax } (degrees),
	   figures, names, label. The equator is drawn, and named at the
	   western (right) end, when it is in the area. Returns { svg, layer, at, project }; the page draws its
	   highlight in 'layer', clipped to the chart. */
	function rectangular(container, options) {
		const area = options.area;
		const { raMin, raMax, decMin, decMax } = area;
		const scale = 8;
		const left = 96;
		const top = 40;
		const band = 10;
		const width = (raMax - raMin) * scale;
		const height = (decMax - decMin) * scale;
		const svg = newSvg(container, width + 2 * left, height + top + 70, options.label);
		const at = (ra, dec) => ({ x: left + (raMax - ra) * scale, y: top + (decMax - dec) * scale });
		const project = (ra, dec) => {
			const inside = ra >= raMin && ra <= raMax && dec >= decMin && dec <= decMax;

			return inside ? at(ra, dec) : null;
		};

		// the chart is clipped to its rectangle (a page may hold two plates:
		// each clip path gets its own id)
		const clipId = `plate-clip-${container.id}`;
		const clip = svgEl('clipPath', { id: clipId }, svgEl('defs', {}, svg));

		svgEl('rect', { x: left, y: top, width: width, height: height }, clip);

		const layer = svgEl('g', { 'clip-path': `url(#${clipId})` }, svg);
		const grid = svgEl('g', { class: 'grid' }, layer);

		for (let ra = Math.ceil(raMin / 15) * 15; ra <= raMax; ra += 15) {
			svgLine(grid, [at(ra, decMin), at(ra, decMax)]);
		}

		for (let dec = Math.ceil(decMin / 10) * 10; dec <= decMax; dec += 10) {
			svgLine(grid, [at(raMin, dec), at(raMax, dec)], dec === 0 ? { class: 'equator' } : {});
		}

		drawMilkyWay(svgEl('g', { class: 'milky-way' }, layer), project);
		drawFigures(
			svgEl('g', { class: 'figure-lines' }, layer),
			svgEl('g', { class: 'figure-names' }, layer),
			options.figures,
			project
		);
		drawStars(svgEl('g', { class: 'stars' }, layer), project);
		drawStarNames(svgEl('g', { class: 'star-names' }, layer), options.names, at);

		if (decMin < 0 && decMax > 0) {
			svgText(layer, 'equator', left + width - 8, at(0, 0).y - 6, { class: 'circle-name', 'text-anchor': 'end' });
		}

		drawBorder(svg, area, at, { band: band, raStep: 7.5, decStep: 5 });
		fitText(svg, width + 2 * left);

		return { svg, layer, at, project };
	}

	/* ======================================================================
	   7. HIGHLIGHTS
	   The one element of a plate in --plate-accent (STYLE.md §7).
	   ====================================================================== */

	/* A circle of declination on a polar chart. */
	function highlightCircle(chart, dec) {
		svgEl('circle', { cx: chart.centre, cy: chart.centre, r: chart.radius(dec), class: 'highlight' }, chart.svg);
	}

	/* A curve through (ra, dec) points on a rectangular chart, named at the
	   point given by nameAt [ra, dec, dx, dy]. */
	function highlightCurve(chart, points, name, nameAt) {
		svgLine(
			chart.layer,
			points.map(p => chart.at(p.ra, p.dec)),
			{ class: 'highlight' }
		);

		const q = chart.at(nameAt[0], nameAt[1]);

		svgText(chart.layer, name, q.x + nameAt[2], q.y + nameAt[3], { class: 'circle-name highlight-text' });
	}

	return {
		EPOCH,
		polar,
		rectangular,
		highlightCircle,
		highlightCurve
	};
})();
