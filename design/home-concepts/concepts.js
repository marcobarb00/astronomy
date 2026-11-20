// @ts-check
/* ==========================================================================
   PREDICTING THE SKY - HOME CONCEPTS (concepts.js)
   The pieces of the three mockups of a new home page. Each concept page
   calls Concepts.init('a' | 'b' | 'c') once the shared scripts are loaded.
   Mockup only: once a concept is chosen, its pieces move to
   shared/components.js (the hub) and shared/theme.css.

   TABLE OF CONTENTS
	 1. Helpers and the switcher between concepts
	 2. The acts as illustrated tiles (A)
	 3. The sky today: a blue plate of the zodiac (A)
	 4. The error of every model (B)
	 5. The index of pages (B)
	 6. The loop of Mars on its epicycle (C)
	 7. The timeline of the astronomers (C)
	 8. The chapters (C)
	 9. Entry point
   ========================================================================== */

/* global Thumbs */

const Concepts = (function () {
	const { ACTS, PAGES } = SITE_MAP;
	const SVG_NS = 'http://www.w3.org/2000/svg';

	/* ======================================================================
	   1. HELPERS AND THE SWITCHER BETWEEN CONCEPTS
	   ====================================================================== */

	/* The link to a page from this folder (two levels below the root). */
	const pageHref = page => `../../${page.path}`;

	/* An SVG element with attributes, appended to parent. */
	function svgEl(parent, tag, attrs = {}, text = '') {
		const node = document.createElementNS(SVG_NS, tag);

		Object.entries(attrs).forEach(([name, value]) => {
			node.setAttribute(name, String(value));
		});

		if (text) {
			node.textContent = text;
		}

		parent.appendChild(node);

		return node;
	}

	/* The bar at the top of each mockup, to compare the three. */
	const CONCEPT_NAMES = [
		['d', 'concept-d.html', 'D · Combined'],
		['a', 'concept-a.html', 'A · The sky today'],
		['b', 'concept-b.html', 'B · How wrong is each model'],
		['c', 'concept-c.html', 'C · Loops and astronomers'],
		['now', '../../index.html', 'The current hub']
	];

	function buildSwitcher(current) {
		const bar = byId('concept-bar');

		bar.append(makeEl('span', '', 'Mockups of the home page:'));

		CONCEPT_NAMES.forEach(([id, path, name]) => {
			const link = makeEl('a', '', name);

			link.href = path;

			if (id === current) {
				link.setAttribute('aria-current', 'page');
			}

			bar.append(link);
		});
	}

	/* A read-out of lines that hold links or emphasis: showLines of
	   common.js typesets TeX, so it would show the tags. The number of
	   lines is fixed by data-lines, as there. */
	function showHtmlLines(containerId, lines) {
		const container = byId(containerId);
		const rows = Number(container.dataset.lines);

		container.replaceChildren();

		for (let i = 0; i < rows; i++) {
			container.append(makeEl('span', 'eq', `<span>${lines[i] ?? '&nbsp;'}</span>`));
		}
	}

	/* ======================================================================
	   2. THE ACTS AS ILLUSTRATED TILES (A)
	   The current hub's tiles, each with the engraved drawing of its page
	   (thumbs.js) above the number, the title and the question.
	   ====================================================================== */

	function illustratedTile(page) {
		const tile = makeEl(page.ready ? 'a' : 'div', page.ready ? 'tile' : 'tile unready');
		const art = makeEl('div', 'tile-art');
		const number = page.number === 'beyond' ? 'Epilogue' : page.number;
		const soon = page.ready ? '' : '<span class="soon">in preparation</span>';

		if (page.ready) {
			tile.href = pageHref(page);
		}

		art.append(Thumbs.svg(page.number));
		tile.append(
			art,
			makeEl(
				'div',
				'tile-text',
				`<span class="tile-number">${number}</span>${soon}` +
					`<span class="tile-title">${page.title}</span>` +
					`<span class="tile-question">${page.question}</span>`
			)
		);

		return tile;
	}

	function renderIllustratedActs(container) {
		container.classList.add('acts');

		ACTS.forEach(act => {
			const section = makeEl('section', 'act');
			const tiles = makeEl('div', 'tiles illustrated');

			section.append(
				makeEl('p', 'act-label', act.name),
				makeEl('h2', 'act-title', act.title),
				makeEl('p', 'act-blurb', act.blurb),
				tiles
			);

			PAGES.filter(page => page.act === act.id).forEach(page => {
				tiles.append(illustratedTile(page));
			});

			container.append(section);
		});
	}

	/* ======================================================================
	   3. THE SKY TODAY: A BLUE PLATE OF THE ZODIAC (A)
	   The whole band of the zodiac, right ascension 0h to 24h, seen looking
	   south, with the ecliptic as a plain line and today's Sun, Moon and
	   five naked-eye planets highlighted (the plate's one highlight). The
	   positions are computed when the page opens, by shared/ephemeris.js.
	   ====================================================================== */

	/* The plate shows 12 hours of right ascension centered opposite the
	   Sun, the sky of tonight, inside the band the plate stars cover
	   (right ascension 0° to 195°: shared/plate-stars.js was fetched for
	   pages 1.2 and 3.3 only; a real hub needs the whole zodiac). */
	const STARS_RA_MAX = 195;
	const WINDOW = 180;

	const BODIES = [
		['sun', 'Sun'],
		['moon', 'Moon'],
		['mercury', 'Mercury'],
		['venus', 'Venus'],
		['mars', 'Mars'],
		['jupiter', 'Jupiter'],
		['saturn', 'Saturn']
	];

	/* Today's apparent right ascension and declination of each body. */
	function bodiesToday() {
		const jdTT = Time.now() + 69 / 86400;

		return BODIES.map(([id, name]) => {
			const ecliptic = Ephem.position(id, jdTT);
			const equatorial = Ephem.equatorial(ecliptic, jdTT);

			return { id: id, name: name, ra: equatorial.ra, dec: equatorial.dec };
		});
	}

	/* The area of the chart: centered opposite the Sun, kept inside the
	   stars' band. */
	function tonightArea(sunRa) {
		const centre = (sunRa + 180) % 360;
		const raMin = Math.min(Math.max(centre - WINDOW / 2, 0), STARS_RA_MAX - WINDOW);

		return { raMin: raMin, raMax: raMin + WINDOW, decMin: -30, decMax: 34 };
	}

	function renderSkyToday(containerId, dateId, offId) {
		const bodies = bodiesToday();
		const area = tonightArea(bodies[0].ra);
		const chart = Plate.rectangular(byId(containerId), {
			area: area,
			figures: ['ARIES', 'TAURUS', 'ORION', 'GEMINI', 'CANCER', 'LEO'],
			keep: ['alf Tau'],
			names: [['alf Tau', 'Aldebaran', 8, 22]],
			label: "Tonight's half of the zodiac, with the Moon and the planets."
		});
		const eps = Ephem.meanObliquity(Plate.EPOCH);
		const ecliptic = [];

		for (let lon = 0; lon <= 360; lon += 1) {
			const point = Frames.eclipticPoint(lon, eps);

			if (point.ra >= area.raMin && point.ra <= area.raMax) {
				ecliptic.push(point);
			}
		}

		ecliptic.sort((a, b) => a.ra - b.ra);

		const nameAt = Frames.eclipticPoint(area.raMax - 40, eps);

		Plate.line(chart, ecliptic, 'ecliptic', [nameAt.ra, nameAt.dec, 8, 18]);

		const shown = bodies.filter(body => body.ra >= area.raMin && body.ra <= area.raMax);
		const hidden = bodies.filter(body => !shown.includes(body));

		shown.forEach(body => {
			Plate.body(chart, body.ra, body.dec, body.name, body.id === 'moon' ? 9 : 6);
		});

		byId(dateId).textContent = new Date().toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
		byId(offId).textContent = hidden.map(body => body.name).join(', ');
	}

	/* ======================================================================
	   4. THE ERROR OF EVERY MODEL (B)
	   Each model of the course at the page that builds it, at the height of
	   its largest error against the reference sky (log scale). The values
	   are the output of tools/numbers/4.5-kepler.js ("every model",
	   Figure 6 of page 4.5), 3.1-first-anomaly.js and 3.2-evection.js.
	   ====================================================================== */

	/* Largest errors in arcminutes. span: the years over which they are
	   measured. x: the column, in the order of the course. */
	const LADDER = [
		{
			id: 'sun',
			name: 'Sun',
			span: '2026',
			models: [
				{ page: '1.3', x: 0, name: 'the uniform circle', error: 114.721 },
				{ page: '2.1', x: 1, name: 'the eccentric', error: 1.721 },
				{ page: '4.5', x: 9, name: "Kepler's ellipse", error: 0.24 }
			]
		},
		{
			id: 'moon',
			name: 'Moon',
			span: '2026',
			models: [
				{ page: '3.1', x: 2, name: 'the uniform circle', error: 7.85 * 60 },
				{ page: '3.1', x: 3, name: 'the epicycle', error: 3.24 * 60 },
				{ page: '3.2', x: 4, name: "Ptolemy's crank", error: 1.8 * 60 }
			]
		},
		{
			id: 'mars',
			name: 'Mars',
			span: '2010–2025',
			models: [
				{ page: '4.1', x: 5, name: 'the uniform circle', error: 3220.783 },
				{ page: '4.1', x: 6, name: 'the epicycle', error: 2065.01 },
				{ page: '4.2', x: 7, name: 'the equant', error: 48.847 },
				{ page: '4.3', x: 8, name: "Copernicus' epicyclet", error: 55.283 },
				{ page: '4.5', x: 9, name: "Kepler's ellipses", error: 5.734 }
			]
		}
	];

	/* The vertical scale: 0.1' to 100°, a power of ten per step. */
	const LADDER_MIN = 0.1;
	const LADDER_MAX = 6000;
	const LADDER_TICKS = [
		[0.1, '0.1′'],
		[1, '1′'],
		[10, '10′'],
		[60, '1°'],
		[600, '10°'],
		[6000, '100°']
	];

	/* The acts as bands behind the columns: [name, first x, last x]. */
	const LADDER_ACTS = [
		['Act I', 0, 0],
		['Act II', 1, 1],
		['Act III', 2, 4],
		['Act IV', 5, 9]
	];

	/* Size of the drawing (viewBox units = pixels at full width). */
	const LW = 760;
	const LH = 430;
	const LPAD = { left: 64, right: 20, top: 40, bottom: 52 };

	/* The columns, spaced wider between the acts than inside one, so that
	   an act of one column still has room for its name. */
	const SLOTS = [0, 1.7, 3.4, 4.4, 5.4, 7.1, 8.1, 9.1, 10.1, 11.1];
	const SLOT_MAX = SLOTS[SLOTS.length - 1];

	const ladderX = x => LPAD.left + 34 + (SLOTS[x] * (LW - LPAD.left - LPAD.right - 68)) / SLOT_MAX;

	function ladderY(minutes) {
		const span = Math.log10(LADDER_MAX) - Math.log10(LADDER_MIN);
		const f = (Math.log10(minutes) - Math.log10(LADDER_MIN)) / span;

		return LH - LPAD.bottom - f * (LH - LPAD.top - LPAD.bottom);
	}

	/* An angle in arcminutes as the pages write it. */
	function formatError(minutes) {
		if (minutes >= 60) {
			return `${(minutes / 60).toFixed(2)}°`;
		}

		return `${minutes.toFixed(minutes < 10 ? 2 : 1)}′`;
	}

	function drawLadderFrame(svg) {
		// each act's band reaches halfway to the next act's first column
		const edge = (a, b) => (ladderX(a) + ladderX(b)) / 2;

		LADDER_ACTS.forEach(([name, first, last], i) => {
			const x0 = first === 0 ? LPAD.left : edge(first - 1, first);
			const x1 = last === 9 ? LW - LPAD.right : edge(last, last + 1);

			if (i % 2 === 0) {
				svgEl(svg, 'rect', {
					x: x0,
					y: LPAD.top - 26,
					width: x1 - x0,
					height: LH - LPAD.bottom - LPAD.top + 26,
					class: 'act-band'
				});
			}

			svgEl(svg, 'text', { x: (x0 + x1) / 2, y: LPAD.top - 8, 'text-anchor': 'middle', class: 'act-name' }, name);
		});

		LADDER_TICKS.forEach(([value, label]) => {
			const y = ladderY(value);

			svgEl(svg, 'line', { x1: LPAD.left, y1: y, x2: LW - LPAD.right, y2: y, class: 'grid' });
			svgEl(svg, 'text', { x: LPAD.left - 8, y: y + 5, 'text-anchor': 'end', class: 'tick-label' }, label);
		});

		svgEl(svg, 'line', {
			x1: LPAD.left,
			y1: LH - LPAD.bottom,
			x2: LW - LPAD.right,
			y2: LH - LPAD.bottom,
			class: 'axis'
		});

		// the page under each column (a page with two models once)
		const seen = new Set();

		LADDER.flatMap(series => series.models).forEach(model => {
			const key = `${model.page}`;
			const xs = LADDER.flatMap(s => s.models)
				.filter(m => m.page === model.page)
				.map(m => ladderX(m.x));

			if (seen.has(key)) {
				return;
			}

			seen.add(key);

			const x = (Math.min(...xs) + Math.max(...xs)) / 2;

			svgEl(
				svg,
				'text',
				{ x: x, y: LH - LPAD.bottom + 24, 'text-anchor': 'middle', class: 'page-label' },
				model.page
			);
		});

		svgEl(
			svg,
			'text',
			{ x: (LW + LPAD.left) / 2, y: LH - 6, 'text-anchor': 'middle', class: 'tick-label' },
			'the page that builds the model'
		);
	}

	/* A series as a staircase: its error holds until the next model. */
	function drawSeries(svg, series, onPick) {
		const points = series.models.map(m => ({ x: ladderX(m.x), y: ladderY(m.error), model: m }));
		let d = `M${points[0].x} ${points[0].y}`;

		for (let i = 1; i < points.length; i++) {
			d += ` H${points[i].x} V${points[i].y}`;
		}

		svgEl(svg, 'path', { d: d, class: `series ${series.id}` });

		const first = points[0];

		svgEl(
			svg,
			'text',
			{ x: first.x - 12, y: first.y - 12, 'text-anchor': 'start', class: `series-name ${series.id}` },
			series.name
		);

		return points.map(p => {
			const dot = svgEl(svg, 'circle', { cx: p.x, cy: p.y, r: 7, class: `point ${series.id}`, tabindex: 0 });

			dot.addEventListener('click', () => onPick(series, p.model, dot));
			dot.addEventListener('mouseenter', () => onPick(series, p.model, dot));
			dot.addEventListener('focus', () => onPick(series, p.model, dot));

			return { series: series, model: p.model, dot: dot };
		});
	}

	function renderLadder(containerId, readoutId) {
		const svg = svgEl(byId(containerId), 'svg', {
			viewBox: `0 0 ${LW} ${LH}`,
			class: 'ladder',
			role: 'img',
			'aria-label': 'The largest error of each model of the Sun, the Moon and Mars, page by page'
		});

		drawLadderFrame(svg);

		function pick(series, model, dot) {
			const page = PAGES.find(p => p.number === model.page);

			svg.querySelectorAll('.point.active').forEach(el => el.classList.remove('active'));
			dot.classList.add('active');
			showHtmlLines(readoutId, [
				`<b>${series.name}</b>: ${model.name}`,
				`largest error ${formatError(model.error)} over ${series.span}`,
				`<a href="${pageHref(page)}">page ${page.number}, ${page.title} ›</a>`
			]);
		}

		const all = LADDER.flatMap(series => drawSeries(svg, series, pick));
		const start = all.find(p => p.series.id === 'mars' && p.model.page === '4.2');

		pick(start.series, start.model, start.dot);
	}

	/* ======================================================================
	   5. THE INDEX OF PAGES (B)
	   The acts in two columns, one line per page: a table of contents.
	   ====================================================================== */

	function renderIndex(container) {
		container.classList.add('index-acts');

		ACTS.forEach(act => {
			const block = makeEl('section', 'index-act');
			const list = makeEl('ol', 'index');

			block.append(makeEl('p', 'act-label', act.name), makeEl('h2', '', act.title), list);

			PAGES.filter(page => page.act === act.id).forEach(page => {
				const item = makeEl('li');
				const number = page.number === 'beyond' ? '' : page.number;
				const title = page.ready
					? `<a href="${pageHref(page)}">${page.title}</a>`
					: `<span class="off">${page.title}</span> <span class="soon">in preparation</span>`;

				item.innerHTML = `<span class="n">${number}</span>${title}<span class="q">${page.question}</span>`;
				list.append(item);
			});

			container.append(block);
		});
	}

	/* ======================================================================
	   6. THE LOOP OF MARS ON ITS EPICYCLE (C)
	   Page 4.1's simple model, seen from the Earth O: the center K of the
	   epicycle turns on the deferent at Mars' mean motion, and the radius
	   KP stays parallel to the direction of the mean Sun. Its trace draws a
	   loop at every opposition. The ratio r is page 4.1's fit
	   (1 / (1 - r) = 2.93 in tools/numbers/4.1-going-backwards.js); the
	   apogee and eccentricity are left out, as on page 4.1.
	   ====================================================================== */

	const LOOP = {
		r: 1 - 1 / 2.93, // epicycle radius / deferent radius
		marsRate: 0.524032, // deg a day, Mars' mean motion in longitude
		sunRate: 0.985647, // deg a day, the mean Sun
		daysPerSecond: 90, // speed of the animation
		years: 32 // the trace starts again after this many years
	};

	/* Positions after t days, in units of the deferent's radius. */
	function loopState(t) {
		const k = (LOOP.marsRate * t * Math.PI) / 180;
		const s = (LOOP.sunRate * t * Math.PI) / 180;
		const K = { x: Math.cos(k), y: Math.sin(k) };
		const P = { x: K.x + LOOP.r * Math.cos(s), y: K.y + LOOP.r * Math.sin(s) };

		return { K: K, P: P, oppositions: Math.floor(((LOOP.sunRate - LOOP.marsRate) * t + 180) / 360) };
	}

	function renderLoop(canvasId, buttonId, readoutId) {
		const canvas = byId(canvasId);
		const ctx = canvas.getContext('2d');
		const button = byId(buttonId);
		let playing = true;
		let t = 0;
		let last = null;

		/* Size the canvas to its box at the screen's resolution. */
		function fit() {
			const ratio = window.devicePixelRatio || 1;
			const box = canvas.getBoundingClientRect();

			canvas.width = Math.round(box.width * ratio);
			canvas.height = Math.round(box.height * ratio);
			ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

			return box;
		}

		let box = fit();

		function circle(x, y, radius, colour, width = 1.5) {
			ctx.beginPath();
			ctx.arc(x, y, radius, 0, 2 * Math.PI);
			ctx.strokeStyle = colour;
			ctx.lineWidth = width;
			ctx.stroke();
		}

		function disk(x, y, radius, colour) {
			ctx.beginPath();
			ctx.arc(x, y, radius, 0, 2 * Math.PI);
			ctx.fillStyle = colour;
			ctx.fill();
		}

		function label(text, x, y, colour) {
			ctx.font = 'italic 600 19px "Cormorant Garamond", Georgia, serif';
			ctx.fillStyle = colour;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText(text, x, y);
		}

		function draw() {
			const cx = box.width / 2;
			const cy = box.height / 2;
			const scale = (Math.min(box.width, box.height) / 2 - 14) / (1 + LOOP.r);
			const screen = p => ({ x: cx + p.x * scale, y: cy - p.y * scale });
			const now = loopState(t);
			const K = screen(now.K);
			const P = screen(now.P);

			ctx.clearRect(0, 0, box.width, box.height);

			// the trace of P since the start, the curve the section is about
			ctx.beginPath();
			for (let d = 0; d <= t; d += 3) {
				const q = screen(loopState(d).P);

				if (d === 0) {
					ctx.moveTo(q.x, q.y);
				} else {
					ctx.lineTo(q.x, q.y);
				}
			}
			ctx.lineTo(P.x, P.y);
			ctx.strokeStyle = COL.planet;
			ctx.lineWidth = 1.3;
			ctx.stroke();

			// deferent, epicycle, the line of sight from O
			circle(cx, cy, scale, COL.deferent, 1.6);
			circle(K.x, K.y, LOOP.r * scale, COL.epicycle, 1.6);

			ctx.beginPath();
			ctx.moveTo(cx, cy);
			ctx.lineTo(P.x, P.y);
			ctx.strokeStyle = COL.ink;
			ctx.lineWidth = 0.8;
			ctx.setLineDash([4, 4]);
			ctx.stroke();
			ctx.setLineDash([]);

			disk(cx, cy, 5, COL.earth);
			disk(K.x, K.y, 3, COL.ink);
			disk(P.x, P.y, 5.5, COL.planet);

			label('O', cx - 14, cy + 14, COL.earthText);
			label('K', K.x + (K.x > cx ? 14 : -14), K.y + (K.y > cy ? 14 : -14), COL.ink);

			const years = t / 365.25;
			const loops = now.oppositions === 1 ? 'loop' : 'loops';

			showLines(readoutId, [`${years.toFixed(1).padStart(4, ' ')} years · ${now.oppositions} ${loops}`]);
		}

		function frame(time) {
			if (last !== null && playing) {
				t += ((time - last) / 1000) * LOOP.daysPerSecond;

				if (t > LOOP.years * 365.25) {
					t = 0;
				}
			}

			last = time;
			draw();
			requestAnimationFrame(frame);
		}

		button.addEventListener('click', () => {
			playing = !playing;
			setPlayButton(button, playing);
		});

		new ResizeObserver(() => {
			box = fit();
		}).observe(canvas);

		setPlayButton(button, playing);
		requestAnimationFrame(frame);
	}

	/* The Play button's icon and word (the site's own helper if any). */
	function setPlayButton(button, playing) {
		const icon = playing
			? '<svg class="icon" width="12" height="14" viewBox="0 0 12 14"><rect x="1" y="1" width="3.5" height="12" fill="currentColor"/><rect x="7.5" y="1" width="3.5" height="12" fill="currentColor"/></svg>'
			: '<svg class="icon" width="12" height="14" viewBox="0 0 12 14"><path d="M1 1 L11 7 L1 13 Z" fill="currentColor"/></svg>';

		button.innerHTML = `${icon}${playing ? 'Pause' : 'Play'}`;
	}

	/* ======================================================================
	   7. THE TIMELINE OF THE ASTRONOMERS (C)
	   A broken axis, 800 BC to AD 200 and AD 1500 to 1650, with the pages
	   that rebuild each astronomer's model hanging under his date. Which
	   page goes under whom follows the origin notes of the pages (the
	   commonest author on each); to be checked against the pages.
	   ====================================================================== */

	const ERAS = [
		{ from: -800, to: 250, x0: 20, x1: 560 },
		{ from: 1500, to: 1650, x0: 600, x1: 940 }
	];

	const PEOPLE = [
		{ who: 'Babylonian records', year: -721, what: 'eclipses, periods', pages: ['3.3'], up: true },
		{ who: 'Greek geometers', year: -370, what: 'the sphere', pages: ['1.1'], up: false },
		{
			who: 'Hipparchus',
			year: -135,
			what: 'the eccentric, precession',
			pages: ['1.2', '2.1', '2.3', '3.1'],
			up: true
		},
		{ who: 'Ptolemy', year: 150, what: 'the Almagest', pages: ['1.3', '2.2', '3.2', '4.1', '4.2'], up: false },
		{ who: 'Copernicus', year: 1543, what: 'De revolutionibus', pages: ['4.3'], up: true },
		{ who: 'Tycho', year: 1588, what: 'parallax', pages: ['4.4'], up: false },
		{ who: 'Kepler', year: 1609, what: 'the ellipse', pages: ['4.5'], up: true }
	];

	function timeX(year) {
		const era = ERAS.find(e => year >= e.from && year <= e.to);

		return era.x0 + ((year - era.from) * (era.x1 - era.x0)) / (era.to - era.from);
	}

	/* A year as the pages write it: 721 BC, AD 150 (or 1543). */
	const yearText = year => (year < 0 ? `${-year} BC` : year < 1000 ? `AD ${year}` : `${year}`);

	function renderTimeline(containerId) {
		const width = 960;
		const height = 300;
		const axisY = 150;
		const svg = svgEl(byId(containerId), 'svg', {
			viewBox: `0 0 ${width} ${height}`,
			class: 'time',
			role: 'img',
			'aria-label': 'The astronomers of the course on a time line, with their pages'
		});

		ERAS.forEach(era => {
			svgEl(svg, 'line', { x1: era.x0, y1: axisY, x2: era.x1, y2: axisY, class: 'axis' });
		});

		// the break between the two eras: two slanted strokes
		[ERAS[0].x1 + 12, ERAS[0].x1 + 24].forEach(x => {
			svgEl(svg, 'line', { x1: x - 5, y1: axisY + 8, x2: x + 5, y2: axisY - 8, class: 'axis' });
		});

		PEOPLE.forEach(person => {
			const x = timeX(person.year);
			const dir = person.up ? -1 : 1;
			const nameY = axisY + dir * 34;

			svgEl(svg, 'line', { x1: x, y1: axisY - 5, x2: x, y2: axisY + 5, class: 'tick' });
			svgEl(
				svg,
				'text',
				{ x: x, y: axisY + dir * 16 + 5, 'text-anchor': 'middle', class: 'year' },
				yearText(person.year)
			);
			svgEl(
				svg,
				'text',
				{ x: x, y: nameY + (dir > 0 ? 10 : 0), 'text-anchor': 'middle', class: 'who' },
				person.who
			);
			svgEl(
				svg,
				'text',
				{ x: x, y: nameY + dir * 20 + (dir > 0 ? 10 : 0), 'text-anchor': 'middle', class: 'what' },
				person.what
			);

			// the page chips, in a row beyond the description
			const chipY = axisY + dir * 92 - (dir < 0 ? 26 : 0);
			const chipW = 38;
			const rowW = person.pages.length * (chipW + 6) - 6;

			person.pages.forEach((number, j) => {
				const page = PAGES.find(p => p.number === number);
				const cx = x - rowW / 2 + j * (chipW + 6);
				const link = svgEl(svg, 'a', { href: pageHref(page) });
				const chip = svgEl(link, 'g', { class: 'chip' });

				svgEl(link, 'title', {}, `${page.number} ${page.title}`);
				svgEl(chip, 'rect', { x: cx, y: chipY, width: chipW, height: 26 });
				svgEl(chip, 'text', { x: cx + chipW / 2, y: chipY + 18, 'text-anchor': 'middle' }, number);
			});
		});
	}

	/* ======================================================================
	   8. THE CHAPTERS (C)
	   One row per page, the question first, the drawing on the left.
	   ====================================================================== */

	function renderChapters(container) {
		ACTS.forEach(act => {
			const section = makeEl('section', 'chapter');
			const head = makeEl('div', 'chapter-head');
			const rows = makeEl('div', 'rows');

			head.append(makeEl('p', 'act-label', act.name), makeEl('h2', 'act-title', act.title));
			section.append(head, rows);

			PAGES.filter(page => page.act === act.id).forEach(page => {
				const row = makeEl(page.ready ? 'a' : 'div', page.ready ? 'row-page' : 'row-page unready');
				const number = page.number === 'beyond' ? '' : page.number;
				const soon = page.ready ? '' : ' · in preparation';

				if (page.ready) {
					row.href = pageHref(page);
				}

				row.append(Thumbs.svg(page.number), makeEl('span', 'n', number));
				row.append(
					makeEl(
						'span',
						'',
						`<span class="q">${page.question}</span><span class="t">${page.title}${soon}</span>`
					)
				);
				rows.append(row);
			});

			container.append(section);
		});
	}

	/* ======================================================================
	   9. ENTRY POINT
	   ====================================================================== */

	function init(concept) {
		buildSwitcher(concept);
		Site.renderOriginKey(byId('origins'));

		// the frames first: a canvas takes the width of its frame
		GraduatedFrame.attachAll(document);

		if (concept === 'a') {
			renderSkyToday('plate-today', 'today-date', 'today-off');
			renderIllustratedActs(byId('map'));
		} else if (concept === 'd') {
			renderSkyToday('plate-today', 'today-date', 'today-off');
			renderTimeline('timeline');
			renderChapters(byId('map'));
		} else if (concept === 'b') {
			renderLadder('ladder', 'ladder-readout');
			renderIndex(byId('map'));
		} else {
			renderLoop('loop', 'loop-play', 'loop-readout');
			renderTimeline('timeline');
			renderChapters(byId('map'));
		}
	}

	return { init };
})();
