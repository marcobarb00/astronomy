/* ==========================================================================
   PREDICTING THE SKY - PAGE COMPONENTS (components.js)
   The site map and the parts every article shares: site bar, page header,
   sticky table of contents, origin badges, exercises, figure numbers,
   detour cards, previous / next navigation, and the hub's map.
   Needs common.js (and KaTeX with its auto-render extension).

   Authoring (see templates/page.html)
	 <body data-page="2.1">                      the page's number in SITE.pages
	 <header class="page-head"></header>          filled from the site map
	 <nav class="toc"></nav>                      built from the article's <h2>
	 <span class="badge" data-origin="ptolemy"></span>
	 <div class="exercise" data-kind="derive"> ... <details class="hint">
		 ... <details class="answer"> ... </div>
	 <figure class="fig"> ... <figcaption>       numbered "Figure n."
	 <aside class="detour" data-topic="nutation"></aside>
	 <nav class="pager"></nav>
	 Site.initPage() then builds everything and typesets the $...$ math.

   Publishing a page = setting ready: true on its entry below. The hub,
   the previous / next links and the detour cards all follow.

   TABLE OF CONTENTS
	 1. Site map (acts, pages, detour topics, origins, exercise kinds)
	 2. Paths
	 3. Page header and site bar
	 4. Table of contents with scroll-spy
	 5. Badges, exercises, figures, detours
	 6. Previous / next navigation
	 7. Hub
	 8. Entry point
   ========================================================================== */

const Site = (function () {

	/* ======================================================================
	   1. SITE MAP
	   ====================================================================== */

	/* The acts, in reading order. 'color' is a palette variable. */
	const ACTS = [
		{
			id: 0,
			name: 'Act 0',
			title: 'The hook',
			blurb: 'Ptolemy\'s Mars against tonight\'s sky: how can circles do this well, and why are they still wrong?',
			color: 'var(--planet)'
		},
		{
			id: 1,
			name: 'Act I',
			title: 'The stage',
			blurb: 'The language needed to state any prediction: the sphere, its frames and its clocks.',
			color: 'var(--earth)'
		},
		{
			id: 2,
			name: 'Act II',
			title: 'The Sun',
			blurb: 'The first anomaly and the simplest complete model.',
			color: 'var(--sun)'
		},
		{
			id: 3,
			name: 'Act III',
			title: 'The Moon',
			blurb: 'Four kinds of month, two anomalies, and the eclipses that test them.',
			color: 'var(--epicycle)'
		},
		{
			id: 4,
			name: 'Act IV',
			title: 'The planets',
			blurb: 'Loops, the equant, a new centre, and the ellipse that removes the last error.',
			color: 'var(--deferent)'
		},
		{
			id: 5,
			name: 'Epilogue',
			title: 'Beyond Kepler',
			blurb: 'Where the story goes next.',
			color: 'var(--muted)'
		}
	];

	/* Every page in reading order (STRUCTURE.md §4 and §9).
	   path is relative to the site root. */
	const PAGES = [
		{
			number: '0.1', act: 0, ready: false,
			title: 'Where is Mars tonight?',
			question: 'How good was a model built from circles?',
			path: 'act0-hook/01-mars-tonight/'
		},
		{
			number: '1.1', act: 1, ready: true,
			title: 'The turning sky',
			question: 'What moves, and around what?',
			path: 'act1-stage/01-turning-sky/'
		},
		{
			number: '1.2', act: 1, ready: false,
			title: 'Frames',
			question: 'How do we name a direction, and how do we change names?',
			path: 'act1-stage/02-frames/'
		},
		{
			number: '1.3', act: 1, ready: false,
			title: 'Clocks',
			question: 'What time is it according to the sky?',
			path: 'act1-stage/03-clocks/'
		},
		{
			number: '2.1', act: 2, ready: false,
			title: 'The uneven year',
			question: 'Why are the seasons not equal?',
			path: 'act2-sun/01-uneven-year/'
		},
		{
			number: '2.2', act: 2, ready: false,
			title: 'The equation of time',
			question: 'Why does the sundial disagree with the clock?',
			path: 'act2-sun/02-equation-of-time/'
		},
		{
			number: '2.3', act: 2, ready: false,
			title: 'Precession',
			question: 'Why do the stars\' longitudes grow?',
			path: 'act2-sun/03-precession/'
		},
		{
			number: '3.1', act: 3, ready: false,
			title: 'The first anomaly',
			question: 'Why does the Moon\'s speed vary, and with what period?',
			path: 'act3-moon/01-first-anomaly/'
		},
		{
			number: '3.2', act: 3, ready: false,
			title: 'Evection and the distance problem',
			question: 'What goes wrong at the quarters?',
			path: 'act3-moon/02-evection/'
		},
		{
			number: '3.3', act: 3, ready: false,
			title: 'Eclipses',
			question: 'When does a new Moon become a solar eclipse?',
			path: 'act3-moon/03-eclipses/'
		},
		{
			number: '4.1', act: 4, ready: false,
			title: 'Going backwards',
			question: 'Why do planets loop, and why always at opposition?',
			path: 'act4-planets/01-going-backwards/'
		},
		{
			number: '4.2', act: 4, ready: false,
			title: 'The equant',
			question: 'What does the simple model miss?',
			path: 'act4-planets/02-equant/'
		},
		{
			number: '4.3', act: 4, ready: false,
			title: 'Same geometry, new centre',
			question: 'What changes if the Sun is at the centre?',
			path: 'act4-planets/03-new-centre/'
		},
		{
			number: '4.4', act: 4, ready: false,
			title: 'Kepler',
			question: 'What shape removes the last error?',
			path: 'act4-planets/04-kepler/'
		},
		{
			number: 'beyond', act: 5, ready: false,
			title: 'Beyond Kepler',
			question: 'Where does the story go next?',
			path: 'beyond-kepler/'
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
		}
	};

	/* Origin badges (STRUCTURE.md §7.1): label and tooltip. */
	const ORIGINS = {
		babylonian: ['Babylonian', 'Inherited from Mesopotamian astronomy'],
		greek: ['Greek', 'From earlier Greek astronomers and mathematicians'],
		hipparchus: ['Hipparchus', 'Hipparchus\' contribution, as far as the sources allow'],
		ptolemy: ['Ptolemy', 'Ptolemy\'s contribution, as far as the sources allow'],
		copernicus: ['Copernicus', 'Copernicus\' contribution, as far as the sources allow'],
		kepler: ['Kepler', 'Kepler\'s contribution'],
		debated: ['Debated', 'Attribution or details still discussed by historians'],
		modern: ['Modern', 'The modern understanding or notation']
	};

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
	   3. PAGE HEADER AND SITE BAR
	   ====================================================================== */

	/* The thin bar with the way back to the hub. */
	function buildSiteBar() {
		if (document.querySelector('.site-bar')) {
			return;
		}

		const bar = makeEl('div', 'site-bar', `<a href="${href('index.html')}">← Predicting the Sky</a>`);

		document.body.prepend(bar);
	}

	/* Fill an empty <header class="page-head"> from the site map. */
	function buildPageHeader(page) {
		const head = document.querySelector('.page-head');

		if (!head || !page || head.children.length > 0) {
			return;
		}

		head.append(
			makeEl('p', 'page-number', pageKicker(page)),
			makeEl('h1', '', page.title),
			makeEl('p', 'question', page.question)
		);

		document.title = `${page.number === 'beyond' ? '' : page.number + ' · '}${page.title} · Predicting the Sky`;
	}


	/* ======================================================================
	   4. TABLE OF CONTENTS WITH SCROLL-SPY
	   ====================================================================== */

	/* Text of a heading without its "1 · Observation" kicker. */
	function headingText(heading) {
		if (heading.dataset.toc) {
			return heading.dataset.toc;
		}

		const copy = heading.cloneNode(true);

		copy.querySelectorAll('.step').forEach(step => step.remove());

		return copy.textContent.trim();
	}

	/* "The uneven year" -> "the-uneven-year". */
	function slugify(text) {
		return text.toLowerCase()
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '');
	}

	function buildToc() {
		const toc = document.querySelector('nav.toc');
		const headings = [...document.querySelectorAll('article h2')];

		if (!toc || headings.length === 0) {
			return;
		}

		const details = makeEl('details');
		const list = makeEl('ol');

		details.appendChild(makeEl('summary', '', 'Contents'));
		details.appendChild(list);
		details.open = window.matchMedia('(min-width: 861px)').matches;

		headings.forEach(heading => {
			const item = makeEl('li');
			const link = makeEl('a');

			if (!heading.id) {
				heading.id = slugify(headingText(heading));
			}

			link.href = `#${heading.id}`;
			link.textContent = headingText(heading);
			item.appendChild(link);
			list.appendChild(item);
		});

		toc.innerHTML = '';
		toc.appendChild(details);
		wireScrollSpy(headings, [...list.querySelectorAll('a')]);
	}

	/* Highlight the last heading that has scrolled past the top third. */
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
				link.classList.toggle('active', i === current);
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
	   5. BADGES, EXERCISES, FIGURES, DETOURS
	   ====================================================================== */

	/* Origin badges: default label and an explanatory tooltip. */
	function buildBadges(root) {
		root.querySelectorAll('.badge[data-origin]').forEach(badge => {
			const origin = ORIGINS[badge.dataset.origin];

			if (!origin) {
				console.warn(`Unknown badge origin "${badge.dataset.origin}"`);
				return;
			}

			if (badge.textContent.trim() === '') {
				badge.textContent = origin[0];
			}

			badge.title = origin[1];
		});
	}

	/* Exercises: "Exercise n · kind" header and labelled hint / answer. */
	function buildExercises(root) {
		root.querySelectorAll('.exercise').forEach((exercise, i) => {
			const kind = EXERCISE_KINDS[exercise.dataset.kind] ?? '';
			const head = makeEl('div', 'exercise-head');

			head.append(
				makeEl('span', '', `Exercise ${i + 1}`),
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

	/* Detour cards: "Detour: topic, sentence. Coming later." or a link. */
	function buildDetours(root) {
		root.querySelectorAll('aside.detour[data-topic]').forEach(card => {
			const topic = TOPICS[card.dataset.topic];

			if (!topic) {
				console.warn(`Unknown detour topic "${card.dataset.topic}"`);
				return;
			}

			const text = card.innerHTML.trim() || topic.sentence;

			if (topic.ready && topic.path) {
				const link = makeEl('a', 'detour', `<strong>Detour: ${topic.title}</strong>, ${text}. Read more →`);

				link.href = href(topic.path);
				card.replaceWith(link);
			} else {
				card.innerHTML = `<strong>Detour: ${topic.title}</strong>, ${text}. <em>Coming later.</em>`;
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
	   The five acts as a path; each page is a tile, greyed until ready.
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
			const title = act.id === 5 ? act.title : `${act.title}<small>${act.name}</small>`;

			section.style.setProperty('--act', act.color);
			section.append(
				makeEl('h2', 'act-title', title),
				makeEl('p', 'act-blurb', act.blurb),
				tiles
			);

			PAGES.filter(page => page.act === act.id).forEach(page => {
				tiles.appendChild(pageTile(page));
			});

			container.appendChild(section);
		});
	}


	/* ======================================================================
	   8. ENTRY POINT
	   ====================================================================== */

	/* Build every shared component of an article page, then typeset. */
	function initPage() {
		const page = findPage(document.body.dataset.page);
		const article = document.querySelector('article') ?? document.body;

		buildSiteBar();
		buildPageHeader(page);
		buildBadges(article);
		buildExercises(article);
		numberFigures(article);
		buildDetours(article);
		buildPager(page);
		buildToc();
		renderMath(document.body);
	}

	return {
		ACTS,
		PAGES,
		TOPICS,
		ORIGINS,
		EXERCISE_KINDS,
		ROOT,
		href,
		findPage,
		initPage,
		renderHub
	};
})();
