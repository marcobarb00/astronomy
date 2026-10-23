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
   so a label never falls below 13 px (CLAUDE.md). The labels are then
   large for a narrow chart: placeLabels moves the ones that would
   overlap, or leave the chart, to a free place nearby, and a chart drawn
   narrower than COMPACT_WIDTH (a phone) shows no names at all, only the
   numbers of its ring or border and the pole's P.

   TABLE OF CONTENTS
	 1. SVG helpers
	 2. Stars and constellation figures
	 3. The Milky Way
	 4. Graduated ring and border
	 5. Readable labels
	 6. Charts: polar and rectangular
	 7. Highlights
	 8. Label placement
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
	function drawFigures(chart, linesGroup, namesGroup, names, project) {
		names.forEach(name => {
			const figure = FIGURES[name];
			const ends = [];

			figure.lines.forEach(([a, b]) => {
				const p = STARS.get(a);
				const q = STARS.get(b);
				const pa = project(p.ra, p.dec);
				const qa = project(q.ra, q.dec);

				if (pa && qa) {
					svgLine(linesGroup, [pa, qa]);
					ends.push(pa, qa);
				}
			});

			const at = project(figure.name[0], figure.name[1]);

			if (at) {
				const element = svgText(namesGroup, name, at.x, at.y, { 'text-anchor': 'middle' });

				// other places only beside the figure's own lines, so that
				// the name never seems to belong to another figure
				addLabel(chart, element, LABEL_ORDER.figure, (size, k) =>
					aroundCentre(at, size, k).filter(place => besideFigure(place, size, ends))
				);
			}
		});
	}

	/* Does a name's box, at a place, touch the area of the figure's lines
	   (their bounding box), so that it reads as that figure's name? */
	function besideFigure(place, size, ends) {
		if (ends.length === 0) {
			return false;
		}

		const xs = ends.map(p => p.x);
		const ys = ends.map(p => p.y);

		return (
			place.x <= Math.max(...xs) &&
			place.x + size.w >= Math.min(...xs) &&
			place.y <= Math.max(...ys) &&
			place.y + size.h >= Math.min(...ys)
		);
	}

	/* Star names: [id, name, dx, dy, anchor] with the offset of the text
	   from the star; anchor 'end' puts the name to the left of that point
	   (default 'start'). */
	function drawStarNames(chart, group, names, at) {
		names.forEach(([id, name, dx, dy, anchor]) => {
			const star = STARS.get(id);
			const q = at(star.ra, star.dec);
			const element = svgText(group, name, q.x + dx, q.y + dy, { 'text-anchor': anchor ?? 'start' });
			const gap = STAR_SCALE * starSize(star.mag);

			addLabel(chart, element, LABEL_ORDER.star, (size, k) => aroundPoint(q, size, gap + LABEL_GAP * k));
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
			// centred on its point, whatever the size of the text
			svgText(group, `${h}h`, at.x, at.y, {
				'text-anchor': 'middle',
				'dominant-baseline': 'central',
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

	/* Hours under the border, degrees on its left: the hours hang from a
	   line under the border, the degrees are centred on their line, so a
	   larger text (on a phone) grows away from the chart. */
	function drawBorderLabels(border, area, at, band) {
		const { raMin, raMax, decMin, decMax } = area;

		for (let hours = Math.ceil(raMin / 15); hours * 15 <= raMax; hours++) {
			const q = at(15 * hours, decMin);

			svgText(border, `${hours}h`, q.x, q.y + band + 6, {
				'text-anchor': 'middle',
				'dominant-baseline': 'hanging',
				class: 'hour'
			});
		}

		for (let dec = Math.ceil(decMin / 10) * 10; dec <= decMax; dec += 10) {
			const q = at(raMax, dec);
			const text = dec > 0 ? `+${dec}°` : `${dec}°`.replace('-', '−');

			svgText(border, text, q.x - band - 6, q.y, {
				'text-anchor': 'end',
				'dominant-baseline': 'central',
				class: 'hour'
			});
		}
	}

	/* ======================================================================
	   5. READABLE LABELS
	   The sizes of theme.css are sizes on the screen. The chart scales with
	   its column, so its text would scale too: --k, the number of chart
	   units per screen pixel (at least 1), multiplies every font size.
	   ====================================================================== */

	/* Below this width on the screen (px), a chart shows no names. */
	const COMPACT_WIDTH = 480;

	function fitText(chart, viewBoxWidth) {
		const svg = chart.svg;
		let current = null;

		// a new --k means new label sizes: place the labels again. A chart
		// drawn narrower than COMPACT_WIDTH (a phone) is 'compact': it shows
		// no names, which would crowd it beyond reading (theme.css §13)
		const update = () => {
			const width = svg.getBoundingClientRect().width || viewBoxWidth;
			const k = Math.max(1, viewBoxWidth / width).toFixed(3);

			if (k !== current) {
				current = k;
				svg.style.setProperty('--k', k);
				svg.classList.toggle('compact', width < COMPACT_WIDTH);
				placeLabels(chart);
			}
		};

		new ResizeObserver(update).observe(svg);
		update();

		// the sizes of the labels are final once the web fonts have loaded
		if (typeof document !== 'undefined' && document.fonts) {
			document.fonts.ready.then(() => placeLabels(chart));
		}
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

		// a label stays inside the rim of the chart, clear of the hour ring
		const inside = box => boxCorners(box).every(p => Math.hypot(p.x - c, p.y - c) <= R - 2);
		const chart = { svg, at, project, radius, centre: c, inside, labels: [] };

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
			chart,
			svgEl('g', { class: 'figure-lines' }, svg),
			svgEl('g', { class: 'figure-names' }, svg),
			options.figures,
			project
		);
		drawStars(svgEl('g', { class: 'stars' }, svg), project);
		drawStarNames(chart, svgEl('g', { class: 'star-names' }, svg), options.names, at);

		const pole = svgText(svg, 'P', c - 16, c + 18, { class: 'symbol' });

		addLabel(chart, pole, LABEL_ORDER.symbol, (box, k) => aroundPoint({ x: c, y: c }, box, LABEL_GAP * k));
		fitText(chart, size);

		return chart;
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
		const left = 108;
		const top = 40;
		const band = 10;
		const width = (raMax - raMin) * scale;
		const height = (decMax - decMin) * scale;
		const svg = newSvg(container, width + 2 * left, height + top + 70, options.label);
		const at = (ra, dec) => ({ x: left + (raMax - ra) * scale, y: top + (decMax - dec) * scale });
		const project = (ra, dec) => {
			const isInside = ra >= raMin && ra <= raMax && dec >= decMin && dec <= decMax;

			return isInside ? at(ra, dec) : null;
		};

		// a label stays inside the chart, clear of the border and its labels
		const inside = box =>
			box.x >= left + 2 &&
			box.y >= top + 2 &&
			box.x + box.w <= left + width - 2 &&
			box.y + box.h <= top + height - 2;

		// the chart is clipped to its rectangle (a page may hold two plates:
		// each clip path gets its own id)
		const clipId = `plate-clip-${container.id}`;
		const clip = svgEl('clipPath', { id: clipId }, svgEl('defs', {}, svg));

		svgEl('rect', { x: left, y: top, width: width, height: height }, clip);

		const layer = svgEl('g', { 'clip-path': `url(#${clipId})` }, svg);
		const chart = { svg, layer, at, project, inside, labels: [] };
		const grid = svgEl('g', { class: 'grid' }, layer);

		for (let ra = Math.ceil(raMin / 15) * 15; ra <= raMax; ra += 15) {
			svgLine(grid, [at(ra, decMin), at(ra, decMax)]);
		}

		for (let dec = Math.ceil(decMin / 10) * 10; dec <= decMax; dec += 10) {
			svgLine(grid, [at(raMin, dec), at(raMax, dec)], dec === 0 ? { class: 'equator' } : {});
		}

		drawMilkyWay(svgEl('g', { class: 'milky-way' }, layer), project);
		drawFigures(
			chart,
			svgEl('g', { class: 'figure-lines' }, layer),
			svgEl('g', { class: 'figure-names' }, layer),
			options.figures,
			project
		);
		drawStars(svgEl('g', { class: 'stars' }, layer), project);
		drawStarNames(chart, svgEl('g', { class: 'star-names' }, layer), options.names, at);

		if (decMin < 0 && decMax > 0) {
			const y = at(0, 0).y;
			const element = svgText(layer, 'equator', left + width - 8, y - 6, {
				class: 'circle-name',
				'text-anchor': 'end'
			});

			// other places: under the line, then further east along it
			addLabel(chart, element, LABEL_ORDER.circle, (box, k) =>
				[0, 1, 2].flatMap(step => {
					const x = left + width - 8 - box.w - step * (box.w + 8);

					return [
						{ x: x, y: y - LABEL_GAP * k - box.h },
						{ x: x, y: y + LABEL_GAP * k }
					];
				})
			);
		}

		drawBorder(svg, area, at, { band: band, raStep: 7.5, decStep: 5 });
		fitText(chart, width + 2 * left);

		return chart;
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
		const screen = points.map(p => chart.at(p.ra, p.dec));

		svgLine(chart.layer, screen, { class: 'highlight' });

		const q = chart.at(nameAt[0], nameAt[1]);
		const element = svgText(chart.layer, name, q.x + nameAt[2], q.y + nameAt[3], {
			class: 'circle-name highlight-text'
		});

		// other places: under or over the curve, at points along it
		addLabel(chart, element, LABEL_ORDER.highlight, (box, k) =>
			screen
				.filter((p, i) => i % 5 === 0)
				.flatMap(p => [
					{ x: p.x - box.w / 2, y: p.y + LABEL_GAP * k },
					{ x: p.x - box.w / 2, y: p.y - LABEL_GAP * k - box.h }
				])
		);
		placeLabels(chart);
	}

	/* ======================================================================
	   8. LABEL PLACEMENT
	   Each label has its designed place and a list of other places (the
	   top-left corners of its box, in chart units, for its size on the
	   screen). placeLabels takes the labels in order (the pole's P, the
	   highlight, the star names, the equator, the constellation names) and
	   gives each the first place that stays inside the chart and clear of
	   every label placed before it; failing that, the place inside that
	   overlaps least. A constellation's name, the least needed, is left out
	   instead when no place is clear (on a narrow screen; the keys say
	   so). Where nothing collides, as on a wide screen, every label keeps
	   its designed place.
	   ====================================================================== */

	/* The order in which labels are placed: the earlier keep their place. */
	const LABEL_ORDER = { symbol: 0, highlight: 1, star: 2, circle: 3, figure: 4 };

	/* Space between a point and its label, and between two labels (chart
	   units at k = 1; both grow with k, as the labels do). */
	const LABEL_GAP = 5;
	const LABEL_CLEAR = 2;

	/* Register a label: its element (drawn at the designed place) and a
	   function (size of its box { w, h }, k) -> other places [{ x, y }]. */
	function addLabel(chart, element, order, otherPlaces) {
		chart.labels.push({
			element: element,
			order: order,
			otherPlaces: otherPlaces,
			designed: {
				x: element.getAttribute('x'),
				y: element.getAttribute('y'),
				anchor: element.getAttribute('text-anchor') ?? 'start'
			}
		});
	}

	/* Places all round a point, 'gap' away: right, left, above, below, then
	   the four diagonals; then the same, twice as far. */
	function aroundPoint(q, box, gap) {
		return [1, 2].flatMap(ring => {
			const g = ring * gap;
			const d = 0.7 * g;

			return [
				{ x: q.x + g, y: q.y - box.h / 2 },
				{ x: q.x - g - box.w, y: q.y - box.h / 2 },
				{ x: q.x - box.w / 2, y: q.y - g - box.h },
				{ x: q.x - box.w / 2, y: q.y + g },
				{ x: q.x + d, y: q.y - d - box.h },
				{ x: q.x + d, y: q.y + d },
				{ x: q.x - d - box.w, y: q.y - d - box.h },
				{ x: q.x - d - box.w, y: q.y + d }
			];
		});
	}

	/* Places for a name centred on a point (a constellation's name): moved
	   up or down by up to three lines, and sideways by up to four thirds of
	   its width, in steps of a third, the nearest first. */
	function aroundCentre(c, box, k) {
		const places = [];
		const line = box.h + LABEL_CLEAR * k;
		const steps = [];

		[0, -1, 1, -2, 2, -3, 3].forEach(rows => {
			[0, -1, 1, -2, 2, -3, 3, -4, 4].forEach(side => {
				if (rows !== 0 || side !== 0) {
					steps.push({ rows, side, distance: Math.hypot(rows * line, (side * box.w) / 3) });
				}
			});
		});

		steps
			.sort((a, b) => a.distance - b.distance)
			.forEach(({ rows, side }) => {
				places.push({ x: c.x - box.w / 2 + (side * box.w) / 3, y: c.y - box.h / 2 + rows * line });
			});

		return places;
	}

	/* The four corners of a box { x, y, w, h }. */
	function boxCorners(box) {
		return [
			{ x: box.x, y: box.y },
			{ x: box.x + box.w, y: box.y },
			{ x: box.x, y: box.y + box.h },
			{ x: box.x + box.w, y: box.y + box.h }
		];
	}

	/* The area two boxes share, counting 'clear' around each as shared. */
	function sharedArea(a, b, clear) {
		const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) + clear;
		const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) + clear;

		return w > 0 && h > 0 ? w * h : 0;
	}

	/* Put a text element at a place: its designed place (x, y, anchor), or
	   the top-left corner of its box. */
	function putLabel(element, place, origin) {
		if (place.anchor) {
			element.setAttribute('x', place.x);
			element.setAttribute('y', place.y);
			element.setAttribute('text-anchor', place.anchor);
		} else {
			element.setAttribute('x', (place.x - origin.x).toFixed(1));
			element.setAttribute('y', (place.y - origin.y).toFixed(1));
			element.setAttribute('text-anchor', 'start');
		}
	}

	/* The box of a text element, { x, y, w, h } in chart units. */
	function boxOf(element) {
		const b = element.getBBox();

		return { x: b.x, y: b.y, w: b.width, h: b.height };
	}

	function placeLabels(chart) {
		const k = Number(chart.svg.style.getPropertyValue('--k')) || 1;
		const clear = LABEL_CLEAR * k;
		const placed = [];
		const labels = [...chart.labels].sort((a, b) => a.order - b.order);

		labels.forEach(label => {
			const element = label.element;

			if (getComputedStyle(element).display === 'none') {
				return;
			}

			// the box at the designed place, and the offset of the box from
			// the text's own (x, y) when it is anchored at its start
			putLabel(element, label.designed);

			const designedBox = boxOf(element);

			putLabel(element, { x: 0, y: 0, anchor: 'start' });

			const origin = boxOf(element);
			const size = { w: origin.w, h: origin.h };
			const places = [label.designed, ...label.otherPlaces(size, k)];
			const boxes = [designedBox, ...places.slice(1).map(p => ({ x: p.x, y: p.y, w: size.w, h: size.h }))];

			let best = 0;
			let bestShared = Infinity;

			for (let i = 0; i < places.length; i++) {
				if (!chart.inside(boxes[i])) {
					continue;
				}

				const shared = placed.reduce((total, other) => total + sharedArea(boxes[i], other, clear), 0);

				if (shared < bestShared) {
					best = i;
					bestShared = shared;
				}

				if (shared === 0) {
					break;
				}
			}

			// a constellation's name with no clear place is left out
			if (label.order === LABEL_ORDER.figure && bestShared > 0) {
				element.setAttribute('visibility', 'hidden');
				return;
			}

			element.removeAttribute('visibility');
			putLabel(element, places[best], origin);
			placed.push(boxes[best]);
		});
	}

	return {
		EPOCH,
		polar,
		rectangular,
		highlightCircle,
		highlightCurve
	};
})();
