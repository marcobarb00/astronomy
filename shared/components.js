// @ts-check
/* ==========================================================================
   PREDICTING THE SKY - PAGE COMPONENTS (components.js)
   The site map and the parts every article shares, in the star-atlas
   style of STYLE.md: the link to the hub, the sticky table of contents on
   the left, the page header, margin notes (origins, detours), exercises,
   figure numbers, the graduated frame of figures, previous / next
   navigation, and the hub's chapters and timeline.
   Needs common.js and site-map.js (and KaTeX with its auto-render
   extension). The hub passes the drawings of its pages (thumbs.js).

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
			 <div class="note today"> ... </div>     the model used today
		 </aside>
	 </div>
	 <div class="exercise" data-kind="derive"> ... <details class="hint">
		 ... <details class="answer"> ... </div>
	 <figure class="fig">                         numbered "Figure n."
		 <div class="frame"> canvas and controls </div>
		 <figcaption> ... </figcaption>
		 <div class="keys"> ... </div>
	 </figure>
	 <figure class="plate-figure">                a blue plate, numbered with
		 ... <div class="plate-label"></div> ...  the figures (theme.css §13)
	 </figure>
	 <nav class="pager"></nav>
	 Site.initPage() then builds everything and typesets the $...$ math.

   Publishing a page = setting ready: true on its entry in site-map.js.
   The hub, the previous / next links and the detour cards all follow.

   TABLE OF CONTENTS
	 1. Site map (the data is in site-map.js)
	 2. Paths
	 3. Page header and link to the hub
	 4. Table of contents with scroll-spy
	 5. Margin notes (origins, detours), exercises, figure numbers
	 6. Previous / next navigation
	 7. Hub
	 8. Footer: copyright and licences
	 9. Entry point
	 GraduatedFrame (after Site): the border of every figure
   ========================================================================== */

const Site = (function () {
	/* ======================================================================
	   1. SITE MAP (site-map.js)
	   ====================================================================== */

	const { ACTS, PAGES, ASTRONOMERS, TOOLBOX, TOPICS, TOPIC_GROUPS, ORIGINS, EXERCISE_KINDS } = SITE_MAP;

	/* ======================================================================
	   2. PATHS
	   The site root is the folder above shared/, found from this script's
	   own URL, so links work from any depth and under a GitHub Pages
	   project path.
	   ====================================================================== */

	const script = /** @type {HTMLScriptElement | null} */ (document.currentScript);
	const ROOT = script ? new URL('../', script.src).href : '../';

	const href = path => ROOT + path;

	/* A page by its number ('2.1', 'beyond'), or the toolbox. */
	function findPage(number) {
		if (String(number) === TOOLBOX.number) {
			return TOOLBOX;
		}

		return PAGES.find(page => page.number === String(number));
	}

	/* "2.1 · " before a numbered page's title; nothing before the
	   epilogue's or the toolbox's. */
	function numberPrefix(page) {
		return /^\d/.test(page.number) ? `${page.number} · ` : '';
	}

	function actOf(page) {
		return ACTS.find(act => act.id === page.act);
	}

	/* "Act II · 2.1", "Epilogue", or the toolbox's own kicker. */
	function pageKicker(page) {
		if (page.kicker) {
			return page.kicker;
		}

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
	/* The mark before the link's words: a four-pointed star that darts
	   west (to the left, the way back) with a short trail while the
	   pointer is on the link (theme.css §3). Hidden from screen readers,
	   which announce the link by its words. */
	const BACK_MARK =
		'<span class="back-mark" aria-hidden="true"><span class="back-trail"></span>' +
		`<svg class="back-star" viewBox="-9 -9 18 18"><path d="${starPath(0, 0, 9)}"/></svg></span>`;

	function buildSiteLink() {
		if (document.querySelector('.site-link')) {
			return;
		}

		const link = makeEl('a', 'site-link', `${BACK_MARK}Predicting the Sky`);
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

			document.title = `${numberPrefix(page)}${page.title} · Predicting the Sky`;
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
		return text
			.toLowerCase()
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

	/* The contents mark the last heading above this fraction of the window. */
	const SCROLL_SPY_LINE = 0.33;

	/* Mark the last heading that has scrolled past the top third. */
	function wireScrollSpy(headings, links) {
		let pending = false;

		const update = () => {
			const limit = window.innerHeight * SCROLL_SPY_LINE;
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

		window.addEventListener(
			'scroll',
			() => {
				if (!pending) {
					pending = true;
					requestAnimationFrame(update);
				}
			},
			{ passive: true }
		);

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
				note.innerHTML =
					`<div class="note-head">Detour</div>` + `<a href="${href(topic.path)}">${title}</a>: ${text}.`;
			} else {
				note.innerHTML = `<div class="note-head">Detour · coming later</div>${title}: ${text}.`;
			}
		});
	}

	/* Today notes (STRUCTURE.md §7.5): the heading "Today" above the text
	   the author wrote, which says what replaces the page's model as the
	   modern first approximation. */
	function buildTodayNotes(root) {
		root.querySelectorAll('.note.today').forEach(note => {
			note.prepend(makeEl('div', 'note-head', 'Today'));
		});
	}

	/* Exercises: "Exercise n · kind" header and labelled hint / answer. */
	function buildExercises(root) {
		root.querySelectorAll('.exercise').forEach((exercise, i) => {
			const kind = EXERCISE_KINDS[exercise.dataset.kind] ?? '';
			const head = makeEl('div', 'exercise-head');

			head.append(makeEl('span', 'exercise-number', `Exercise ${i + 1}`), makeEl('span', 'exercise-kind', kind));
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

	/* Figures and blue plates, numbered together in page order: "Figure n."
	   in front of a figure's caption, "Figure n" in a plate's label. */
	function numberFigures(root) {
		root.querySelectorAll('figure.fig, figure.plate-figure').forEach((figure, i) => {
			const caption = figure.querySelector('figcaption');
			const plateLabel = figure.querySelector('.plate-label');

			if (!figure.id) {
				figure.id = `figure-${i + 1}`;
			}

			if (plateLabel) {
				plateLabel.textContent = `Figure ${i + 1}`;
			} else if (caption) {
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
		const label = `${numberPrefix(page)}${page.title}`;

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
	   The acts in order as chapters: a small-caps label and a title, then
	   one row per page, with the drawing of the page (thumbs.js), its
	   number, its title and its question under it (as in the page's own
	   header), greyed until ready. The
	   timeline of the astronomers, with the pages under each. The hub's plate of tonight's sky is its own (hub.js).
	   ====================================================================== */

	/* One page of a chapter: a link when the page is ready. drawPage
	   (number -> svg) gives its drawing: Thumbs.svg, passed by the hub, so
	   that the pages need not load thumbs.js. */
	function pageRow(page, drawPage) {
		const row = makeEl(page.ready ? 'a' : 'div', page.ready ? 'page-row' : 'page-row unready');
		const number = /^\d/.test(page.number) ? page.number : '';
		const soon = page.ready ? '' : '<span class="soon">in preparation</span>';

		if (page.ready) {
			row.href = href(page.path);
		} else {
			row.setAttribute('aria-disabled', 'true');
		}

		row.append(
			drawPage(page.number),
			makeEl('span', 'page-number', number),
			makeEl(
				'span',
				'page-words',
				`<span class="page-title">${page.title}${soon}</span>` +
					`<span class="page-question">${page.question}</span>`
			)
		);

		return row;
	}

	function renderHub(container, drawPage) {
		container.classList.add('chapters');

		ACTS.forEach(act => {
			const chapter = makeEl('section', 'chapter');
			const head = makeEl('div', 'chapter-head');
			const rows = makeEl('div', 'page-rows');

			head.append(makeEl('p', 'act-label', act.name), makeEl('h2', 'act-title', act.title));
			chapter.append(head, rows);

			PAGES.filter(page => page.act === act.id).forEach(page => {
				rows.appendChild(pageRow(page, drawPage));
			});

			container.appendChild(chapter);
		});
	}

	/* The timeline: a broken axis, 800 BC to AD 250 and 1500 to 1650 (the
	   two eras share the width by what they hold, not in proportion to
	   their years). Each astronomer has a tick, a date, a
	   name and a work, alternately above and below the axis, and his pages
	   as small links beyond them. Drawn in a fixed viewBox: the svg scales
	   with the column. */
	const TIMELINE = {
		width: 960,
		height: 300,
		axisY: 150,
		eras: [
			{ from: -800, to: 250, x0: 20, x1: 560 },
			{ from: 1500, to: 1650, x0: 600, x1: 940 }
		],
		chip: { w: 38, h: 26, gap: 6 }
	};

	const SVG_NS = 'http://www.w3.org/2000/svg';

	/* An SVG element with attributes (and text), appended to parent. */
	function svgChild(parent, tag, attrs = {}, text = '') {
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

	/* The x of a year on the broken axis. */
	function timelineX(year) {
		const era = TIMELINE.eras.find(e => year >= e.from && year <= e.to);

		return era.x0 + ((year - era.from) * (era.x1 - era.x0)) / (era.to - era.from);
	}

	/* The epilogue's topic cards (STRUCTURE.md §4, Epilogue): one list per
	   group of TOPIC_GROUPS, each topic with its sentence. The list promises
	   no pages: a topic is plain text, and a link only if a page for it
	   exists one day. */
	function renderTopics(container) {
		container.classList.add('topics');

		TOPIC_GROUPS.forEach(group => {
			const section = makeEl('section', 'topic-group');
			const list = makeEl('ul', 'topic-list');

			section.append(makeEl('p', 'act-label', group.title), list);

			group.topics.forEach(id => {
				const topic = TOPICS[id];
				const ready = topic.ready && topic.path;
				const title = capitalise(topic.title);
				const item = makeEl('li', 'topic');
				const head = ready
					? `<a class="topic-title" href="${href(topic.path)}">${title}</a>`
					: `<span class="topic-title">${title}</span>`;

				item.innerHTML = `${head}<span class="topic-sentence">${capitalise(topic.sentence)}.</span>`;
				list.appendChild(item);
			});

			container.appendChild(section);
		});
	}

	/* The links to an astronomer's pages, in a row centered on x. */
	function drawPageChips(svg, numbers, x, y) {
		const { w, h, gap } = TIMELINE.chip;
		const rowWidth = numbers.length * (w + gap) - gap;

		numbers.forEach((number, i) => {
			const page = findPage(number);
			const left = x - rowWidth / 2 + i * (w + gap);
			const link = svgChild(svg, 'a', { href: href(page.path), class: 'chip' });

			svgChild(link, 'title', {}, `${page.number} ${page.title}`);
			svgChild(link, 'rect', { x: left, y: y, width: w, height: h });
			svgChild(link, 'text', { x: left + w / 2, y: y + 18, 'text-anchor': 'middle' }, number);
		});
	}

	function renderTimeline(container) {
		const { width, height, axisY, eras } = TIMELINE;
		const svg = svgChild(container, 'svg', {
			viewBox: `0 0 ${width} ${height}`,
			class: 'timeline-chart',
			role: 'img',
			'aria-label': 'The astronomers of the course on a timeline, with the pages that rebuild their models'
		});

		eras.forEach(era => {
			svgChild(svg, 'line', { x1: era.x0, y1: axisY, x2: era.x1, y2: axisY, class: 'axis' });
		});

		// the break between the eras: two slanted strokes
		[eras[0].x1 + 12, eras[0].x1 + 24].forEach(x => {
			svgChild(svg, 'line', { x1: x - 5, y1: axisY + 8, x2: x + 5, y2: axisY - 8, class: 'axis' });
		});

		ASTRONOMERS.forEach(person => {
			const x = timelineX(person.year);
			const dir = person.above ? -1 : 1;
			const shift = person.above ? 0 : 10; // a text's baseline below the axis
			const nameY = axisY + dir * 34 + shift;

			svgChild(svg, 'line', { x1: x, y1: axisY - 5, x2: x, y2: axisY + 5, class: 'tick' });
			svgChild(
				svg,
				'text',
				{ x: x, y: axisY + dir * 16 + 5, 'text-anchor': 'middle', class: 'date' },
				person.date
			);
			svgChild(svg, 'text', { x: x, y: nameY, 'text-anchor': 'middle', class: 'name' }, person.name);
			svgChild(svg, 'text', { x: x, y: nameY + dir * 20, 'text-anchor': 'middle', class: 'work' }, person.work);
			drawPageChips(svg, person.pages, x, person.above ? axisY - 118 : axisY + 92);
		});

		container.appendChild(timelineList());
	}

	/* The same astronomers as a list, shown instead of the chart on a
	   phone (theme.css §16): date, name, work and the links to the pages. */
	function timelineList() {
		const list = makeEl('ol', 'timeline-list');

		ASTRONOMERS.forEach(person => {
			const chips = person.pages.map(number => `<a href="${href(findPage(number).path)}">${number}</a>`).join('');

			list.appendChild(
				makeEl(
					'li',
					'',
					`<span class="date">${person.date}</span>` +
						`<span class="name">${person.name}</span>` +
						`<span class="work">${person.work}</span>` +
						`<span class="chips">${chips}</span>`
				)
			);
		});

		return list;
	}

	/* ======================================================================
	   8. FOOTER: COPYRIGHT AND LICENCES
	   One line at the foot of every page that loads this file (the
	   articles, the hub and the templates): the copyright and the two
	   licences, linked to their files. GitHub Pages serves .md files and
	   LICENSE as raw text, so the links open them on GitHub, rendered.
	   ====================================================================== */

	const REPOSITORY = 'https://github.com/marcobarb00/astronomy/blob/main/';

	const FOOTER_TEXT =
		'© 2026 Marco Barbieri. ' +
		`Text and figures under <a href="${REPOSITORY}LICENSE-CONTENT.md">CC BY-NC-SA 4.0</a>, ` +
		`code under <a href="${REPOSITORY}LICENSE">MIT</a>.`;

	/* Add the footer once, at the end of the page container. */
	function buildFooter() {
		if (document.querySelector('footer.site-foot')) {
			return;
		}

		const container = document.querySelector('.page') ?? document.body;

		container.appendChild(makeEl('footer', 'site-foot', FOOTER_TEXT));
	}

	/* Every page that loads this file gets the footer, whether or not it
	   calls initPage (the hub does not). */
	document.addEventListener('DOMContentLoaded', buildFooter);

	/* ======================================================================
	   9. ENTRY POINT
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
		buildTodayNotes(article);
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
		EXERCISE_KINDS,
		ROOT,
		href,
		findPage,
		initPage,
		renderHub,
		renderTimeline,
		renderTopics
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
	const BAND_TARGET = 28; // preferred band length, px

	/* The eight parts around the body: [class, grid area]. */
	const PARTS = [
		['frame-corner', 'tl'],
		['frame-edge top', 'top'],
		['frame-corner', 'tr'],
		['frame-edge left', 'left'],
		['frame-edge right', 'right'],
		['frame-corner', 'bl'],
		['frame-edge bottom', 'bottom'],
		['frame-corner', 'br']
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
			edge.appendChild(makeEl('div', i % 2 === 1 ? 'band dark' : 'band'));
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
			return; // already built
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

	/** Build every frame inside root.
	   @param {ParentNode} [root] */
	function attachAll(root = document) {
		root.querySelectorAll('.frame').forEach(attach);
	}

	return {
		bandCount,
		attach,
		attachAll
	};
})();
