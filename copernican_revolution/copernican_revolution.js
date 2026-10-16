/* ==========================================================================
   THE COPERNICAN REVOLUTION (copernican_revolution.js)
   Needs ../shared/common.js to be loaded first.

   TABLE OF CONTENTS
	 0. Small DOM and SVG helpers
	 1. Illustrations (one small SVG drawing per kind of diagram)
	 2. Content: themes, timeline events, historical orders of the planets
	 3. Renderers
	 4. Filters
	 5. UI wiring

   Each event may carry an `art` key (name of a drawing in section 1) and/or
   an `image` key { src, alt, credit } for a real public-domain picture.
   Dates marked "c." are approximate; check them before publishing.
   ========================================================================== */


/* ==========================================================================
   0. SMALL DOM AND SVG HELPERS
   ========================================================================== */

const SVG_NS = 'http://www.w3.org/2000/svg';

/* Create an element with an optional class name and text content. */
function el(tag, className, text) {
	const element = document.createElement(tag);

	if (className) {
		element.className = className;
	}

	if (text) {
		element.textContent = text;
	}

	return element;
}

/* Create an SVG element and set its attributes. */
function shape(tag, attributes) {
	const element = document.createElementNS(SVG_NS, tag);

	Object.keys(attributes).forEach(name => {
		element.setAttribute(name, attributes[name]);
	});

	return element;
}


/* ==========================================================================
   1. ILLUSTRATIONS
   Every drawing lives in a 160 x 90 box centered on (CX, CY).
   Colours come from the CSS classes (shared theme variables).
   ========================================================================== */

const CX = 80;
const CY = 45;

/* Point at distance r and angle (deg, counter-clockwise) from (x, y). */
function polar(x, y, r, degrees) {
	const angle = degrees * Math.PI / 180;

	return [x + r * Math.cos(angle), y - r * Math.sin(angle)];
}

function ring(svg, x, y, r, extraClass = '') {
	svg.appendChild(shape('circle', { cx: x, cy: y, r: r, class: `v-ring ${extraClass}` }));
}

function dot(svg, point, r, colorClass) {
	svg.appendChild(shape('circle', { cx: point[0], cy: point[1], r: r, class: colorClass }));
}

function guide(svg, from, to) {
	svg.appendChild(shape('line', {
		x1: from[0], y1: from[1], x2: to[0], y2: to[1], class: 'v-guide'
	}));
}

/* Closed polygon through the given points. */
function polygon(svg, points, extraClass = '') {
	svg.appendChild(shape('polygon', {
		points: points.map(p => p.join(',')).join(' '),
		class: `v-ring ${extraClass}`
	}));
}

/* Arrow from one point to another: a shaft plus a filled head. */
function arrow(svg, from, to, colorClass) {
	const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
	const head = 6;
	const shaftEnd = [
		to[0] - 0.7 * head * Math.cos(angle),
		to[1] - 0.7 * head * Math.sin(angle)
	];
	const left = [
		to[0] - head * Math.cos(angle - 0.45),
		to[1] - head * Math.sin(angle - 0.45)
	];
	const right = [
		to[0] - head * Math.cos(angle + 0.45),
		to[1] - head * Math.sin(angle + 0.45)
	];

	svg.appendChild(shape('line', {
		x1: from[0], y1: from[1], x2: shaftEnd[0], y2: shaftEnd[1], class: 'v-arrow'
	}));
	svg.appendChild(shape('polygon', {
		points: [to, left, right].map(p => p.join(',')).join(' '),
		class: colorClass
	}));
}

/* Earth-Venus distance (in AU) when the angle Sun-Venus-Earth is alpha (deg).
   From the triangle Sun-Venus-Earth with sides 0.723, d and 1. */
function venusDistance(alpha) {
	const a = 0.723;
	const c = a * cos(alpha);

	return c + Math.sqrt(c * c + 1 - a * a);
}

/* Lit part of a sphere at phase angle alpha (0 = full, 180 = new), with the
   sunlight coming from the right. The limb is a half circle; the terminator
   is a half ellipse whose half-width is r cos(alpha). */
function litPath(x, y, r, alpha) {
	const width = r * cos(alpha);
	const sweep = (width > 0) ? 1 : 0;

	return `M ${x} ${y - r} A ${r} ${r} 0 0 1 ${x} ${y + r} ` +
		`A ${Math.abs(width)} ${r} 0 0 ${sweep} ${x} ${y - r} Z`;
}

const ART = {
	/* Aristotle, Peurbach: nested spheres around a fixed Earth. */
	spheres(svg) {
		[14, 26, 38].forEach(r => ring(svg, CX, CY, r));
		dot(svg, [CX, CY], 4, 'v-earth');
		dot(svg, polar(CX, CY, 26, 60), 3, 'v-sun');
	},

	/* Ptolemy: a planet on an epicycle riding on a deferent. */
	epicycle(svg) {
		const center = polar(CX, CY, 30, 40);

		ring(svg, CX, CY, 30, 'sun');
		ring(svg, center[0], center[1], 11, 'violet');
		dot(svg, [CX, CY], 4, 'v-earth');
		dot(svg, polar(center[0], center[1], 11, 200), 3.5, 'v-planet');
	},

	/* Aristarchus, Copernicus: planets circling a central Sun. */
	suncentered(svg) {
		[14, 26, 38].forEach(r => ring(svg, CX, CY, r));
		dot(svg, [CX, CY], 6, 'v-sun');
		dot(svg, polar(CX, CY, 14, 120), 2.5, 'v-planet');
		dot(svg, polar(CX, CY, 26, 20), 3.5, 'v-earth');
		dot(svg, polar(CX, CY, 38, 250), 3, 'v-violet');
	},

	/* Hipparchus: the Earth sits off-center in the Sun's circle. */
	eccentric(svg) {
		ring(svg, CX, CY, 36, 'sun');
		dot(svg, [CX, CY], 2, 'v-muted');
		dot(svg, [CX + 10, CY], 4, 'v-earth');
		dot(svg, polar(CX, CY, 36, 60), 5, 'v-sun');
	},

	/* Ibn al-Haytham: the equant, the point that gave the trouble. */
	equant(svg) {
		const equant = [CX + 10, CY];
		const planet = polar(CX, CY, 36, 50);

		ring(svg, CX, CY, 36, 'sun');
		guide(svg, equant, planet);
		dot(svg, [CX, CY], 2, 'v-muted');
		dot(svg, [CX - 10, CY], 4, 'v-earth');
		dot(svg, equant, 3, 'v-violet');
		dot(svg, planet, 4, 'v-planet');
	},

	/* Maragha school: a point on a rolling circle slides along a straight line. */
	tusiCouple(svg) {
		const theta = 50;
		const center = polar(CX, CY, 19, theta);
		const point = [CX + 38 * Math.cos(theta * Math.PI / 180), CY];

		ring(svg, CX, CY, 38);
		ring(svg, center[0], center[1], 19, 'violet');
		guide(svg, [CX - 38, CY], [CX + 38, CY]);
		dot(svg, point, 4, 'v-planet');
	},

	/* Capella: the Sun circles the Earth; only Mercury and Venus circle the Sun. */
	capella(svg) {
		const earth = [70, CY];
		const sun = polar(earth[0], earth[1], 30, 30);

		ring(svg, earth[0], earth[1], 30, 'sun');
		ring(svg, sun[0], sun[1], 12, 'green');
		dot(svg, earth, 4, 'v-earth');
		dot(svg, sun, 5, 'v-sun');
		dot(svg, polar(sun[0], sun[1], 12, 210), 3, 'v-planet');
	},

	/* Tycho: the Sun circles the Earth; all five planets circle the Sun
	   (the orbit of Mars even crosses the Sun's orbit). */
	tychonic(svg) {
		const earth = [60, CY];
		const sun = polar(earth[0], earth[1], 24, 30);

		ring(svg, earth[0], earth[1], 24, 'sun');
		ring(svg, sun[0], sun[1], 10, 'green');
		ring(svg, sun[0], sun[1], 19, 'green');
		ring(svg, sun[0], sun[1], 32, 'green');
		dot(svg, earth, 4, 'v-earth');
		dot(svg, sun, 5, 'v-sun');
		dot(svg, polar(sun[0], sun[1], 10, 210), 2.5, 'v-planet');
		dot(svg, polar(sun[0], sun[1], 19, 100), 3, 'v-planet');
		dot(svg, polar(sun[0], sun[1], 32, 320), 3.5, 'v-violet');
	},

	/* Kepler: an ellipse with the Sun at one focus. */
	ellipse(svg) {
		const focus = Math.sqrt(40 * 40 - 30 * 30);

		svg.appendChild(shape('ellipse', { cx: CX, cy: CY, rx: 40, ry: 30, class: 'v-ring sun' }));
		dot(svg, [CX + focus, CY], 5, 'v-sun');
		dot(svg, [CX + 40 * Math.cos(1.1), CY - 30 * Math.sin(1.1)], 3.5, 'v-planet');
	},

	/* Kepler's first model: circles and regular solids nested in each other. */
	nested(svg) {
		const outer = 40;
		const middle = outer / Math.SQRT2;
		const inner = middle / 2;
		const square = [45, 135, 225, 315].map(a => polar(CX, CY, outer, a));
		const triangle = [90, 210, 330].map(a => polar(CX, CY, middle, a));

		ring(svg, CX, CY, outer, 'violet');
		polygon(svg, square, 'green');
		ring(svg, CX, CY, middle, 'violet');
		polygon(svg, triangle, 'green');
		ring(svg, CX, CY, inner, 'violet');
		dot(svg, [CX, CY], 3, 'v-sun');
	},

	/* Galileo: Venus from a large crescent to a small, almost full disc.
	   alpha is the phase angle; the apparent radius goes as 1 / distance. */
	phases(svg) {
		const phaseAngles = [130, 100, 70, 40, 10];

		phaseAngles.forEach((alpha, i) => {
			const x = 17 + 32 * i;
			const r = 6 / venusDistance(alpha);

			dot(svg, [x, CY], r, 'v-shadow');
			svg.appendChild(shape('path', { d: litPath(x, CY, r, alpha), class: 'v-sun' }));
			ring(svg, x, CY, r);
		});
	},

	/* Newton: two bodies circling their common center of mass. */
	twoBody(svg) {
		const sun = polar(CX, CY, 3, 200);
		const planet = polar(CX, CY, 38, 20);
		const length = Math.hypot(planet[0] - sun[0], planet[1] - sun[1]);
		const unit = [(planet[0] - sun[0]) / length, (planet[1] - sun[1]) / length];

		/* start and end points of an arrow along the line joining the bodies */
		const along = (from, offset, size) => [
			[from[0] + unit[0] * offset, from[1] + unit[1] * offset],
			[from[0] + unit[0] * (offset + size), from[1] + unit[1] * (offset + size)]
		];

		ring(svg, CX, CY, 3);
		ring(svg, CX, CY, 38);
		dot(svg, sun, 6, 'v-sun');
		dot(svg, planet, 3.5, 'v-earth');

		/* gravity pulls each body toward the other, with equal strength */
		const pullOnPlanet = along(planet, -6, -11);
		const pullOnSun = along(sun, 10, 11);

		arrow(svg, pullOnPlanet[0], pullOnPlanet[1], 'v-planet');
		arrow(svg, pullOnSun[0], pullOnSun[1], 'v-planet');
	},

	/* Bradley, Bessel: a star seen from two sides of the Earth's orbit. */
	parallax(svg) {
		const star = [CX, 10];
		const left = [30, 78];
		const right = [130, 78];

		guide(svg, left, star);
		guide(svg, right, star);
		guide(svg, left, right);
		dot(svg, star, 3, 'v-muted');
		dot(svg, left, 4, 'v-earth');
		dot(svg, right, 4, 'v-earth');
		dot(svg, [CX, 78], 5, 'v-sun');
	}
};

/* Build the <svg> for one drawing; decorative, so hidden from screen readers. */
function buildVignette(name) {
	const svg = shape('svg', {
		viewBox: '0 0 160 90',
		class: 'vignette',
		'aria-hidden': 'true'
	});

	ART[name](svg);

	return svg;
}


/* ==========================================================================
   2. CONTENT
   ========================================================================== */

/* The threads of the story; each maps to a colour class in the CSS. */
const THEMES = {
	methods:  'Observations',
	models:   'Models of the sky',
	order:    'Order of the planets',
	center:   'What sits at the center',
	evidence: 'Evidence'
};

const EVENTS = [
	{
		when: 'c. 350 BCE',
		theme: 'center',
		art: 'spheres',
		title: 'Aristotle: a still Earth at the center',
		text: 'Heavy things fall toward the center of the cosmos, so the Earth must be there, and it must not move.',
		more: 'The argument is about physics, not only about position: a spinning or orbiting Earth would leave falling bodies and birds behind.'
	},
	{
		when: 'c. 270 BCE',
		theme: 'center',
		art: 'suncentered',
		title: 'Aristarchus proposes a Sun-centered cosmos',
		text: 'Known mostly through Archimedes. The idea was dropped: it had no supporting observations, and no physics that allowed a moving Earth.',
		more: 'A moving Earth predicts a yearly shift of the stars (parallax). None was seen, because the stars are far too distant for ancient instruments.'
	},
	{
		when: 'c. 130 BCE',
		theme: 'methods',
		art: 'eccentric',
		title: 'Hipparchus: catalogue, precession, solar model',
		text: 'He compares his own star positions with older ones, discovers precession, and builds the first quantitative model of the Sun: a circle with the Earth off-center.',
		more: 'He also inherited centuries of Babylonian records, which gave long baselines for eclipses and planetary cycles.'
	},
	{
		when: 'c. 150 CE',
		theme: 'models',
		art: 'epicycle',
		title: 'The Almagest: deferents, epicycles, equant',
		text: 'A single geometric machine predicts the Sun, Moon and five planets. It works well enough to be the standard for 1400 years.',
		more: 'The equant lets a planet move at a non-uniform speed around its circle while a point stays uniform. Aristotelians disliked it.'
	},
	{
		when: 'c. 5th c. CE',
		theme: 'order',
		art: 'capella',
		title: 'Capella: Mercury and Venus circle the Sun',
		text: 'A popular Latin handbook describes a scheme where the Sun circles the Earth, but Mercury and Venus circle the Sun.',
		more: 'It was well known in medieval Europe, and Copernicus discusses it when he arranges the planets.'
	},
	{
		when: '11th c.',
		theme: 'models',
		art: 'equant',
		title: 'Ibn al-Haytham: "Doubts concerning Ptolemy"',
		text: 'The equant breaks the principle of uniform circular motion that the model claims to respect. Islamic astronomers keep the circles and remove the equant.'
	},
	{
		when: '13th\u201314th c.',
		theme: 'models',
		art: 'tusiCouple',
		title: 'Maragha school: Tusi couple, Ibn al-Shatir',
		text: 'Equant-free models are built from combinations of uniform circles. Some of Copernicus\u2019s constructions are mathematically the same.',
		more: 'How the ideas reached Europe is still debated by historians; the resemblance itself is not.'
	},
	{
		when: '1472',
		theme: 'models',
		art: 'spheres',
		title: 'Peurbach and Regiomontanus bring the Almagest up to date',
		text: 'Their Epitome is the best Latin guide to Ptolemy. Copernicus studies the Almagest closely, and what bothers him is the equant.'
	},
	{
		when: 'c. 1510',
		theme: 'models',
		art: 'suncentered',
		title: 'Copernicus: the Commentariolus',
		text: 'A short manuscript with the main idea: the Earth is a planet that turns daily and orbits the Sun. The equant is replaced by smaller circles.'
	},
	{
		when: '1543',
		theme: 'order',
		art: 'suncentered',
		title: 'De revolutionibus: one order, from the periods',
		text: 'Mercury and Venus take their places inside the Earth\u2019s orbit. Every planet\u2019s distance, in units of the Earth\u2013Sun distance, follows from its observed loops.',
		more: 'Ptolemy\u2019s model could only give ratios within one planet\u2019s system. Copernicus\u2019s linked all of them.'
	},
	{
		when: '1588',
		theme: 'center',
		art: 'tychonic',
		title: 'Tycho: a compromise',
		text: 'The Sun circles the Earth, and the other planets circle the Sun. It predicts the same relative positions as Copernicus\u2019s system while keeping the Earth still.',
		more: 'The three systems agree on where planets appear in the sky. They differ on what must be true for that to happen.'
	},
	{
		when: '1596',
		theme: 'order',
		art: 'nested',
		title: 'Kepler asks: why these distances?',
		text: 'He tries to explain the sizes of the six orbits by fitting the five regular solids between them. The idea fails, but the question remains.'
	},
	{
		when: '1609',
		theme: 'models',
		art: 'ellipse',
		title: 'Kepler: ellipses',
		text: 'Tycho\u2019s precise data leaves a small mismatch with circles, about the size of a quarter of the Sun\u2019s disc for Mars. Kepler replaces the circles by ellipses.'
	},
	{
		when: '1610',
		theme: 'evidence',
		art: 'phases',
		title: 'Galileo: Venus and Jupiter',
		text: 'Venus shows a full set of phases and changes a lot in apparent size (big as a crescent, small when nearly full). That fits an orbit around the Sun, not Ptolemy\u2019s arrangement. Jupiter has moons: not everything orbits the Earth.',
		more: 'Phases fit both the Copernican and the Tychonic system, so they ruled out Ptolemy but not Tycho.'
	},
	{
		when: '1687',
		theme: 'center',
		art: 'twoBody',
		title: 'Newton: why the Sun',
		text: 'Gravity is a mutual pull, equal on both bodies, so the light one circles the heavy one (really, both circle their common center). The question moves from "what is at the center" to "which frame makes the laws simplest".'
	},
	{
		when: '1729\u20131838',
		theme: 'evidence',
		art: 'parallax',
		title: 'Aberration, then parallax',
		text: 'Bradley finds the aberration of starlight in 1729, and Bessel measures the first stellar parallax in 1838. The Earth\u2019s motion is finally seen directly.'
	}
];

/* Historical orders of the bodies, nearest to farthest.
   `aroundSun` marks bodies that circle the Sun rather than the Earth.
   Check each row against its sources before publishing. */
const ORDERS = [
	{
		title: 'Plato, Timaeus (c. 360 BCE)',
		note: 'Venus and Mercury sit above the Sun, the order Ptolemy says some astronomers adopted because the Sun is never obscured by them.',
		bodies: ['Moon', 'Sun', 'Venus', 'Mercury', 'Mars', 'Jupiter', 'Saturn']
	},
	{
		title: 'Ptolemy (c. 150 CE)',
		note: 'Both below the Sun, as the more ancient astronomers had it. He admits the order cannot be proved (see tab 2).',
		bodies: ['Moon', 'Mercury', 'Venus', 'Sun', 'Mars', 'Jupiter', 'Saturn']
	},
	{
		title: 'Capella (5th c. CE)',
		note: 'Mercury and Venus circle the Sun, as the Sun circles the Earth.',
		bodies: ['Moon', 'Sun', 'Mars', 'Jupiter', 'Saturn'],
		aroundSun: ['Mercury', 'Venus']
	},
	{
		title: 'Copernicus (1543)',
		note: 'The Earth is a planet. The order now follows from the periods, with no choices left.',
		bodies: ['Mercury', 'Venus', 'Earth + Moon', 'Mars', 'Jupiter', 'Saturn']
	},
	{
		title: 'Tycho (1588)',
		note: 'The Earth is still at the center. The Moon and the Sun circle it, and all five planets circle the Sun.',
		bodies: ['Moon', 'Sun'],
		aroundSun: ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']
	}
];


/* ==========================================================================
   3. RENDERERS
   ========================================================================== */

/* A real picture with its credit, for entries that have an `image` key. */
function buildFigure(image) {
	const figure = el('figure');
	const picture = el('img');

	picture.src = image.src;
	picture.alt = image.alt;
	picture.loading = 'lazy';

	figure.appendChild(picture);
	figure.appendChild(el('figcaption', '', image.credit));

	return figure;
}

/* Text column of one event; the extra text sits inside a <details>. */
function buildEventText(event) {
	const body = el('div');

	body.appendChild(el('span', 'when', event.when));
	body.appendChild(el('h3', '', event.title));
	body.appendChild(el('p', '', event.text));

	if (event.more) {
		const details = el('details');

		details.appendChild(el('summary', '', 'More'));
		details.appendChild(el('p', 'note', event.more));
		body.appendChild(details);
	}

	return body;
}

function buildEvent(event) {
	const item = el('li', `event tone-${event.theme}`);

	item.dataset.theme = event.theme;
	item.appendChild(buildEventText(event));

	if (event.image) {
		item.appendChild(buildFigure(event.image));
	} else if (event.art) {
		item.appendChild(buildVignette(event.art));
	}

	return item;
}

function renderTimeline() {
	const list = byId('timeline');

	EVENTS.forEach(event => {
		list.appendChild(buildEvent(event));
	});
}

/* One row of chips: bodies circling the Earth, then those circling the Sun. */
function buildChips(order) {
	const chips = el('div', 'chips');

	order.bodies.forEach(name => {
		chips.appendChild(el('span', 'chip tone-order', name));
	});

	(order.aroundSun || []).forEach(name => {
		const chip = el('span', 'chip tone-models around-sun', `${name} (around the Sun)`);

		chips.appendChild(chip);
	});

	return chips;
}

function renderOrders() {
	const container = byId('orders');

	ORDERS.forEach(order => {
		const row = el('div', 'order-row');

		row.appendChild(el('h3', '', order.title));
		row.appendChild(buildChips(order));
		row.appendChild(el('p', 'note', order.note));
		container.appendChild(row);
	});
}


/* ==========================================================================
   4. FILTERS
   Clicking a theme button hides or shows the events of that theme.
   ========================================================================== */

/* Themes currently shown. */
const visibleThemes = new Set(Object.keys(THEMES));

function applyFilters() {
	document.querySelectorAll('#timeline .event').forEach(item => {
		item.hidden = !visibleThemes.has(item.dataset.theme);
	});

	document.querySelectorAll('#filters button').forEach(button => {
		button.classList.toggle('off', !visibleThemes.has(button.dataset.theme));
	});
}

function toggleTheme(theme) {
	if (visibleThemes.has(theme)) {
		visibleThemes.delete(theme);
	} else {
		visibleThemes.add(theme);
	}

	applyFilters();
}

function renderFilters() {
	const container = byId('filters');

	Object.keys(THEMES).forEach(theme => {
		const button = el('button', `tone-${theme}`, THEMES[theme]);

		button.dataset.theme = theme;
		button.addEventListener('click', () => toggleTheme(theme));
		container.appendChild(button);
	});
}


/* ==========================================================================
   5. UI WIRING
   ========================================================================== */

function initUI() {
	renderFilters();
	renderTimeline();
	renderOrders();
	applyFilters();

	// the tabs have no canvas to redraw yet, so the callback does nothing
	wireTabs('tabs', () => {});
}

initUI();
