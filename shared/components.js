/* ==========================================================================
   PREDICTING THE SKY - PAGE COMPONENTS (components.js)
   The site map and the parts every article shares, in the star-atlas
   style of STYLE.md: the link to the hub, the sticky table of contents on
   the left, the page header, margin notes (origins, detours), exercises,
   figure numbers, the graduated frame of figures, previous / next
   navigation, and the hub's map and key of origins.
   Needs common.js (and KaTeX with its auto-render extension).

   Authoring (see templates/page.html)
	 <body data-page="2.1">                      the page's number in SITE.pages
	 <header class="page-head"></header>          title and subtitle, filled
												  from the site map; the
												  contents go before it
	 <p class="lead">                             the first paragraph (drop cap)
	 <div class="row">                            a paragraph with margin notes
		 <p> ... </p>
		 <aside>
			 <div class="note" data-origin="ptolemy"></div>
			 <div class="note detour" data-topic="nutation"></div>
		 </aside>
	 </div>
	 <div class="exercise" data-kind="derive"> ... <details class="hint">
		 ... <details class="answer"> ... </div>
	 <figure class="fig">                         numbered "Figure n."
		 <div class="frame"> canvas and controls </div>
		 <figcaption> ... </figcaption>
		 <div class="keys"> ... </div>
	 </figure>
	 <nav class="pager"></nav>
	 Site.initPage() then builds everything and typesets the $...$ math.

   Publishing a page = setting ready: true on its entry below. The hub,
   the previous / next links and the detour cards all follow.

   TABLE OF CONTENTS
	 1. Site map (acts, pages, detour topics, origins, exercise kinds)
	 2. Paths
	 3. Page header and link to the hub
	 4. Table of contents with scroll-spy
	 5. Margin notes (origins, detours), exercises, figure numbers
	 6. Previous / next navigation
	 7. Hub
	 8. Entry point
	 GraduatedFrame (after Site): the border of every figure
   ========================================================================== */

const Site = (function () {

	/* ======================================================================
	   1. SITE MAP
	   ====================================================================== */

	/* The acts, in reading order. */
	const ACTS = [
		{
			id: 0,
			name: 'Act 0',
			title: 'The hook',
			blurb: 'Ptolemy\'s Mars against tonight\'s sky: how can circles do this well, and why are they still wrong?'
		},
		{
			id: 1,
			name: 'Act I',
			title: 'The stage',
			blurb: 'The language needed to state any prediction: the sphere, its frames and its clocks.'
		},
		{
			id: 2,
			name: 'Act II',
			title: 'The Sun',
			blurb: 'The first anomaly and the simplest complete model.'
		},
		{
			id: 3,
			name: 'Act III',
			title: 'The Moon',
			blurb: 'Four kinds of month, two anomalies, and the eclipses that test them.'
		},
		{
			id: 4,
			name: 'Act IV',
			title: 'The planets',
			blurb: 'Loops, the equant, a new centre, and the ellipse that removes the last error.'
		},
		{
			id: 5,
			name: 'Epilogue',
			title: 'Beyond Kepler',
			blurb: 'Where the story goes next.'
		}
	];

	/* Every page in reading order (STRUCTURE.md §4 and §9).
	   path is relative to the site root. */
	const PAGES = [
		{
			number: '0.1', act: 0, ready: false,
			title: 'Where is Mars tonight?',
			question: 'How good was a model built from circles?',
			path: 'act0-hook/01-mars-tonight/index.html'
		},
		{
			number: '1.1', act: 1, ready: true,
			title: 'The turning sky',
			question: 'You spin me right round, baby, right round',
			path: 'act1-stage/01-turning-sky/index.html'
		},
		{
			number: '1.2', act: 1, ready: true,
			title: 'Frames',
			question: 'A whole new world. A new fantastic point of view',
			path: 'act1-stage/02-frames/index.html'
		},
		{
			number: '1.3', act: 1, ready: true,
			title: 'Clocks',
			question: 'What time is it? Summer time!',
			path: 'act1-stage/03-clocks/index.html'
		},
		{
			number: '2.1', act: 2, ready: false,
			title: 'The uneven year',
			question: 'Why is the worst season the longest?',
			path: 'act2-sun/01-uneven-year/index.html'
		},
		{
			number: '2.2', act: 2, ready: false,
			title: 'The equation of time',
			question: 'Time is relative, okay? It can stretch and it can squeeze, but... it can\'t run backwards.',
			path: 'act2-sun/02-equation-of-time/index.html'
		},
		{
			number: '2.3', act: 2, ready: false,
			title: 'Precession',
			question: 'what will we call polaris when it won\'t be the pole star anymore?',
			path: 'act2-sun/03-precession/index.html'
		},
		// TODO find other funny jokes
		{
			number: '3.1', act: 3, ready: false,
			title: 'The first anomaly',
			question: 'Why does the Moon\'s speed vary, and with what period?',
			path: 'act3-moon/01-first-anomaly/index.html'
		},
		{
			number: '3.2', act: 3, ready: false,
			title: 'Evection and the distance problem',
			question: 'What goes wrong at the quarters?',
			path: 'act3-moon/02-evection/index.html'
		},
		{
			number: '3.3', act: 3, ready: false,
			title: 'Eclipses',
			question: 'When does a new Moon become a solar eclipse?',
			path: 'act3-moon/03-eclipses/index.html'
		},
		{
			number: '4.1', act: 4, ready: false,
			title: 'Going backwards',
			question: 'Why do planets loop, and why always at opposition?',
			path: 'act4-planets/01-going-backwards/index.html'
		},
		{
			number: '4.2', act: 4, ready: false,
			title: 'The equant',
			question: 'What does the simple model miss?',
			path: 'act4-planets/02-equant/index.html'
		},
		{
			number: '4.3', act: 4, ready: false,
			title: 'Same geometry, new centre',
			question: 'What changes if the Sun is at the centre?',
			path: 'act4-planets/03-new-centre/index.html'
		},
		{
			number: '4.4', act: 4, ready: false,
			title: 'Kepler',
			question: 'What shape removes the last error?',
			path: 'act4-planets/04-kepler/index.html'
		},
		{
			number: 'beyond', act: 5, ready: false,
			title: 'Beyond Kepler',
			question: 'Where does the story go next?',
			path: 'beyond-kepler/index.html'
		}
	];

	/* Topics outside the scope (STRUCTURE.md §3, §7.4). A detour card
	   becomes a link when its topic has a ready page. */
	const TOPICS = {
		nutation: {
			title: 'nutation',
			sentence: 'the small wobble of the pole on top of precession',
			path: null, ready: false
		},
		aberration: {
			title: 'aberration',
			sentence: 'the Earth\'s motion tilts the incoming starlight by up to 20″',
			path: null, ready: false
		},
		parallax: {
			title: 'stellar parallax',
			sentence: 'the annual shift that finally measured the distance to the stars',
			path: null, ready: false
		},
		latitudes: {
			title: 'planetary latitudes',
			sentence: 'how far the planets wander north and south of the ecliptic',
			path: null, ready: false
		},
		tycho: {
			title: 'Tycho Brahe',
			sentence: 'the observations, ten times better than Ptolemy\'s, that Kepler had to fit',
			path: null, ready: false
		},
		islamic: {
			title: 'the Islamic critiques of the equant',
			sentence: 'al-Tusi\'s couple and Ibn al-Shatir\'s models, which Copernicus reused',
			path: null, ready: false
		},
		newton: {
			title: 'Newton and gravitation',
			sentence: 'why Kepler\'s laws hold',
			path: null, ready: false
		},
		perturbations: {
			title: 'perturbations',
			sentence: 'why the ellipses themselves slowly turn and change',
			path: null, ready: false
		},
		calendars: {
			title: 'calendars',
			sentence: 'reconciling the day, the month and the year',
			path: null, ready: false
		},
		instruments: {
			title: 'instruments',
			sentence: 'armillary spheres, quadrants and how the old numbers were measured',
			path: null, ready: false
		},
		deltaT: {
			title: 'the slowing Earth (ΔT)',
			sentence: 'tides lengthen the day, so clocks and the Earth\'s rotation drift apart by hours over millennia',
			path: null, ready: false
		}
	};

	/* Origins (STRUCTURE.md §7.1): the label of each margin note
	   "Origin · Greek". The notes carry no explanation (STYLE.md §4.5): the
	   hub explains the origins once, with ORIGIN_KEY. */
	const ORIGINS = {
		babylonian: 'Babylonian',
		greek: 'Greek',
		hipparchus: 'Hipparchus',
		ptolemy: 'Ptolemy',
		copernicus: 'Copernicus',
		kepler: 'Kepler',
		debated: 'Debated',
		modern: 'Modern'
	};

	/* The hub's key of origins: one line per kind of origin. 'origin' picks
	   the colour of the label; the four authors share one line. */
	const ORIGIN_KEY = [
		{
			origin: 'babylonian',
			label: 'Babylonian',
			text: 'inherited from Mesopotamian astronomy'
		},
		{
			origin: 'greek',
			label: 'Greek',
			text: 'from earlier Greek astronomers and mathematicians'
		},
		{
			origin: 'ptolemy',
			label: 'Hipparchus, Ptolemy, Copernicus, Kepler',
			text: 'the author\'s own contribution, as far as the sources allow'
		},
		{
			origin: 'debated',
			label: 'Debated',
			text: 'attribution or details still discussed by historians'
		},
		{
			origin: 'modern',
			label: 'Modern',
			text: 'the modern understanding or notation'
		}
	];

	/* Exercise kinds (STRUCTURE.md §7.2). */
	const EXERCISE_KINDS = {
		compute: 'Compute, then check',
		predict: 'Predict, then play',
		derive: 'Derive',
		break: 'Break the model'
	};


	/* ======================================================================
	   2. PATHS
	   The site root is the folder above shared/, found from this script's
	   own URL, so links work from any depth and under a GitHub Pages
	   project path.
	   ====================================================================== */

	const ROOT = (document.currentScript) ?
		new URL('../', document.currentScript.src).href :
		'../';

	const href = path => ROOT + path;

	function findPage(number) {
		return PAGES.find(page => page.number === String(number));
	}

	function actOf(page) {
		return ACTS.find(act => act.id === page.act);
	}

	/* "Act II · 2.1", or "Epilogue". */
	function pageKicker(page) {
		const act = actOf(page);

		return /^\d/.test(page.number) ? `${act.name} · ${page.number}` : act.name;
	}


	/* ======================================================================
	   3. PAGE HEADER AND LINK TO THE HUB
	   STYLE.md §4.2: "Predicting the Sky" in small caps, then the header:
	   act line, title and subtitle on the left, the table of contents in
	   the margin on the right, and a double rule under it (theme.css).
	   ====================================================================== */

	/* The way back to the hub, above the header. */
	function buildSiteLink() {
		if (document.querySelector('.site-link')) {
			return;
		}

		const link = makeEl('a', 'site-link', 'Predicting the Sky');
		const container = document.querySelector('.page') ?? document.body;

		link.href = href('index.html');
		container.prepend(link);
	}

	/* The left block of the header (.titles): filled from the site map when
	   the header is empty. A header written by hand (the template, the test
	   page) is gathered into the same block. Returns the header, or null. */
	function buildPageHeader(page) {
		const head = document.querySelector('.page-head');

		if (!head) {
			return null;
		}

		let titles = head.querySelector(':scope > .titles');

		if (!titles) {
			titles = makeEl('div', 'titles');
			titles.append(...head.childNodes);
			head.appendChild(titles);
		}

		if (page && titles.children.length === 0) {
			titles.append(
				makeEl('p', 'act-line', pageKicker(page)),
				makeEl('h1', '', page.title),
				makeEl('p', 'subtitle', page.question)
			);

			document.title = `${page.number === 'beyond' ? '' : page.number + ' · '}${page.title} · Predicting the Sky`;
		}

		return head;
	}


	/* ======================================================================
	   4. TABLE OF CONTENTS WITH SCROLL-SPY
	   In the left column, following the reader (STYLE.md §4.2): one entry per <h2>,
	   "1 Circles about one point", the section number taken from the step
	   label above the heading; the section in view in the accent colour.
	   ====================================================================== */

	/* Text of a heading without its "1 · Observation" step label. */
	function headingText(heading) {
		if (heading.dataset.toc) {
			return heading.dataset.toc;
		}

		const copy = heading.cloneNode(true);

		copy.querySelectorAll('.step').forEach(step => step.remove());

		return copy.textContent.trim();
	}

	/* Section number of a heading, from its step label "1 · Observation";
	   '' for a heading without one (Exercises, Sources). */
	function sectionNumber(heading) {
		const step = heading.querySelector('.step');
		const match = step ? step.textContent.match(/^\s*(\d+)/) : null;

		return match ? match[1] : '';
	}

	/* "The uneven year" -> "the-uneven-year". */
	function slugify(text) {
		return text.toLowerCase()
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '');
	}

	/* Build the contents in the page's left column, just before the header
	   (an existing <nav class="toc"> anywhere on the page is moved there);
	   theme.css makes them sticky. */
	function buildToc(head) {
		const headings = [...document.querySelectorAll('article h2')];

		if (!head || headings.length === 0) {
			return;
		}

		let toc = document.querySelector('nav.toc');

		if (!toc) {
			toc = makeEl('nav', 'toc');
			toc.setAttribute('aria-label', 'Contents');
		}

		head.before(toc);

		const list = makeEl('ol');

		headings.forEach(heading => {
			const item = makeEl('li');
			const link = makeEl('a');
			const number = sectionNumber(heading);

			if (!heading.id) {
				heading.id = slugify(headingText(heading));
			}

			// the number in its own column (empty for Exercises, Sources),
			// so every title starts at the same place
			link.href = `#${heading.id}`;
			link.append(makeEl('span', 'toc-number', number), makeEl('span', '', ''));
			link.lastChild.textContent = headingText(heading);

			item.appendChild(link);
			list.appendChild(item);
		});

		toc.replaceChildren(list);
		wireScrollSpy(headings, [...list.querySelectorAll('a')]);
	}

	/* Mark the last heading that has scrolled past the top third. */
	function wireScrollSpy(headings, links) {
		let pending = false;

		const update = () => {
			const limit = window.innerHeight * 0.33;
			let current = 0;

			headings.forEach((heading, i) => {
				if (heading.getBoundingClientRect().top < limit) {
					current = i;
				}
			});

			links.forEach((link, i) => {
				link.classList.toggle('current', i === current);
			});

			pending = false;
		};

		window.addEventListener('scroll', () => {
			if (!pending) {
				pending = true;
				requestAnimationFrame(update);
			}
		}, { passive: true });

		update();
	}


	/* ======================================================================
	   5. MARGIN NOTES (ORIGINS, DETOURS), EXERCISES, FIGURE NUMBERS
	   ====================================================================== */

	/* Origin notes: the small-caps heading "Origin · Greek", coloured by
	   origin in theme.css. Any text the author wrote stays under it. */
	function buildOriginNotes(root) {
		root.querySelectorAll('.note[data-origin]').forEach(note => {
			const label = ORIGINS[note.dataset.origin];

			if (!label) {
				console.warn(`Unknown origin "${note.dataset.origin}"`);
				return;
			}

			note.classList.add('origin');
			note.prepend(makeEl('div', 'note-head', `Origin · ${label}`));
		});
	}

	/* "nutation" -> "Nutation". */
	const capitalise = text => text.charAt(0).toUpperCase() + text.slice(1);

	/* Detour notes: "Detour · coming later", then the topic and why it
	   matters. When the topic has a ready page, the topic is a link. */
	function buildDetours(root) {
		root.querySelectorAll('.note.detour[data-topic]').forEach(note => {
			const topic = TOPICS[note.dataset.topic];

			if (!topic) {
				console.warn(`Unknown detour topic "${note.dataset.topic}"`);
				return;
			}

			const text = note.innerHTML.trim() || topic.sentence;
			const title = capitalise(topic.title);

			if (topic.ready && topic.path) {
				note.innerHTML = `<div class="note-head">Detour</div>` +
					`<a href="${href(topic.path)}">${title}</a>: ${text}.`;
			} else {
				note.innerHTML = `<div class="note-head">Detour · coming later</div>${title}: ${text}.`;
			}
		});
	}

	/* Exercises: "Exercise n · kind" header and labelled hint / answer. */
	function buildExercises(root) {
		root.querySelectorAll('.exercise').forEach((exercise, i) => {
			const kind = EXERCISE_KINDS[exercise.dataset.kind] ?? '';
			const head = makeEl('div', 'exercise-head');

			head.append(
				makeEl('span', 'exercise-number', `Exercise ${i + 1}`),
				makeEl('span', 'exercise-kind', kind)
			);
			exercise.prepend(head);

			if (!exercise.id) {
				exercise.id = `exercise-${i + 1}`;
			}

			labelDetails(exercise, 'details.hint', 'Hint');
			labelDetails(exercise, 'details.answer', 'Answer');
		});
	}

	/* Give a <details> its <summary> if the author left it out. */
	function labelDetails(root, selector, text) {
		root.querySelectorAll(selector).forEach(details => {
			if (!details.querySelector(':scope > summary')) {
				details.prepend(makeEl('summary', '', text));
			}
		});
	}

	/* Figures: "Figure n." in front of each caption. */
	function numberFigures(root) {
		root.querySelectorAll('figure.fig').forEach((figure, i) => {
			const caption = figure.querySelector('figcaption');

			if (!figure.id) {
				figure.id = `figure-${i + 1}`;
			}

			if (caption) {
				caption.prepend(makeEl('span', 'fig-label', `Figure ${i + 1}.`));
			}
		});
	}


	/* ======================================================================
	   6. PREVIOUS / NEXT NAVIGATION
	   ====================================================================== */

	/* One side of the pager: a link if the page is ready, a grey label if not. */
	function pagerLink(page, direction) {
		const word = direction === 'prev' ? '← Previous' : 'Next →';
		const label = `${page.number === 'beyond' ? '' : page.number + ' · '}${page.title}`;

		if (page.ready) {
			const link = makeEl('a', direction, `<small>${word}</small>${label}`);

			link.href = href(page.path);

			return link;
		}

		return makeEl('span', direction, `<small>${word} · in preparation</small>${label}`);
	}

	function buildPager(page) {
		const pager = document.querySelector('nav.pager');

		if (!pager || !page) {
			return;
		}

		const index = PAGES.indexOf(page);

		pager.innerHTML = '';

		if (index > 0) {
			pager.appendChild(pagerLink(PAGES[index - 1], 'prev'));
		}

		if (index < PAGES.length - 1) {
			pager.appendChild(pagerLink(PAGES[index + 1], 'next'));
		}
	}


	/* ======================================================================
	   7. HUB
	   The acts in order, each a small-caps label, a title and a blurb; each
	   page is a tile, greyed until ready. Then the key of origins.
	   ====================================================================== */

	function pageTile(page) {
		const number = page.number === 'beyond' ? 'Epilogue' : page.number;
		const soon = page.ready ? '' : '<span class="soon">in preparation</span>';
		const inner = `<span class="tile-number">${number}</span>${soon}` +
			`<span class="tile-title">${page.title}</span>` +
			`<span class="tile-question">${page.question}</span>`;

		if (page.ready) {
			const link = makeEl('a', 'tile', inner);

			link.href = href(page.path);

			return link;
		}

		const tile = makeEl('div', 'tile unready', inner);

		tile.setAttribute('aria-disabled', 'true');

		return tile;
	}

	function renderHub(container) {
		container.classList.add('acts');

		ACTS.forEach(act => {
			const section = makeEl('section', 'act');
			const tiles = makeEl('div', 'tiles');

			section.append(
				makeEl('p', 'act-label', act.name),
				makeEl('h2', 'act-title', act.title),
				makeEl('p', 'act-blurb', act.blurb),
				tiles
			);

			PAGES.filter(page => page.act === act.id).forEach(page => {
				tiles.appendChild(pageTile(page));
			});

			container.appendChild(section);
		});
	}

	/* The key of origins, once for the whole site (STYLE.md §4.5): each
	   line is the heading of a margin note, in its colour, and what it means. */
	function renderOriginKey(container) {
		const list = makeEl('dl', 'origin-key');

		ORIGIN_KEY.forEach(entry => {
			const term = makeEl('dt', 'note-head', `Origin · ${entry.label}`);

			term.dataset.origin = entry.origin;
			list.append(term, makeEl('dd', '', entry.text));
		});

		container.appendChild(list);
	}


	/* ======================================================================
	   8. ENTRY POINT
	   ====================================================================== */

	/* Build every shared component of an article page, then typeset. The
	   frames are built before the page's figures start: their canvases
	   take the width of the frame. */
	function initPage() {
		const page = findPage(document.body.dataset.page);
		const article = document.querySelector('article') ?? document.body;

		buildSiteLink();

		const head = buildPageHeader(page);

		buildOriginNotes(article);
		buildDetours(article);
		buildExercises(article);
		numberFigures(article);
		GraduatedFrame.attachAll(article);
		buildPager(page);
		buildToc(head);
		renderMath(document.body);
	}

	return {
		ACTS,
		PAGES,
		TOPICS,
		ORIGINS,
		ORIGIN_KEY,
		EXERCISE_KINDS,
		ROOT,
		href,
		findPage,
		initPage,
		renderHub,
		renderOriginKey
	};
})();


/* ==========================================================================
   GRADUATED FRAME (STYLE.md §6)
   The border of every figure, like the border of an atlas page: solid ink
   corners, and each edge split into bands light, dark, ..., light. An edge
   of length L has the odd number of bands closest to L / BAND_TARGET (at
   least 3), so the bands stretch or squish to fit it exactly; horizontal
   and vertical edges are counted apart. The bands are recounted whenever
   the frame changes size, so the corners stay aligned at any width.

   Authoring: <div class="frame"> canvas and controls </div> inside the
   figure, before its caption. attach() moves the content into a
   .frame-body and adds the corners and edges around it; the grid that
   places them is in theme.css (section 7).
   ========================================================================== */

const GraduatedFrame = (function () {

	const BAND_TARGET = 28;     // preferred band length, px

	/* The eight parts around the body: [class, grid area]. */
	const PARTS = [
		['frame-corner', 'tl'], ['frame-edge top', 'top'], ['frame-corner', 'tr'],
		['frame-edge left', 'left'], ['frame-edge right', 'right'],
		['frame-corner', 'bl'], ['frame-edge bottom', 'bottom'], ['frame-corner', 'br']
	];

	/* Odd number of bands closest to length / BAND_TARGET, at least 3. */
	function bandCount(length) {
		const k = Math.round((length / BAND_TARGET - 1) / 2);

		return Math.max(3, 2 * k + 1);
	}

	/* Fill one edge with n bands: light, dark, light, ..., light. The bands
	   share the edge equally (flex), so only their number is set here. */
	function fillEdge(edge, length) {
		const n = bandCount(length);

		if (edge.childElementCount === n) {
			return;
		}

		edge.replaceChildren();

		for (let i = 0; i < n; i++) {
			edge.appendChild(makeEl('div', (i % 2 === 1) ? 'band dark' : 'band'));
		}
	}

	/* Recount the bands of the four edges from their current lengths. */
	function layout(frame) {
		const edge = side => frame.querySelector(`:scope > .frame-edge.${side}`);

		fillEdge(edge('top'), edge('top').clientWidth);
		fillEdge(edge('bottom'), edge('bottom').clientWidth);
		fillEdge(edge('left'), edge('left').clientHeight);
		fillEdge(edge('right'), edge('right').clientHeight);
	}

	/* Build one frame and keep it aligned when it resizes. */
	function attach(frame) {
		if (frame.querySelector(':scope > .frame-body')) {
			return;    // already built
		}

		const body = makeEl('div', 'frame-body');

		body.append(...frame.childNodes);
		frame.appendChild(body);

		PARTS.forEach(([className, area]) => {
			const part = makeEl('div', className);

			part.style.gridArea = area;
			frame.appendChild(part);
		});

		// recount on the next frame: a canvas inside may resize itself in the
		// same round of resize callbacks, which changes the frame's height
		let pending = false;

		new ResizeObserver(() => {
			if (!pending) {
				pending = true;
				requestAnimationFrame(() => {
					pending = false;
					layout(frame);
				});
			}
		}).observe(frame);

		layout(frame);
	}

	/* Build every frame inside root. */
	function attachAll(root = document) {
		root.querySelectorAll('.frame').forEach(attach);
	}

	return {
		bandCount,
		attach,
		attachAll
	};
})();
