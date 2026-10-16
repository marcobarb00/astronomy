/* ==========================================================================
   TAB 2 - PTOLEMY'S SOURCES (tab_ptolemy.js)
   Load after copernican_revolution.js: it uses el(), shape() and the drawing
   helpers (ring, dot, guide, polar).

   TABLE OF CONTENTS
	 1. Diagrams (only for the topics that need one)
	 2. Sources (each one defined once, referenced by key)
	 3. Topics (the text of the tab)
	 4. Renderers

   Roman numerals are Almagest books. Chapter numbers were taken from
   secondary literature: check them against Toomer before publishing.
   Text strings use double quotes so that apostrophes can be typed directly.
   ========================================================================== */


/* ==========================================================================
   1. DIAGRAMS
   Only the topics whose argument is geometric get one. Each entry has a
   viewBox size, a caption and a draw(svg) function. Coordinates are SVG
   pixels; angles are degrees counter-clockwise from the +x axis, as in
   polar(). Colours follow the shared theme: green deferent, violet
   epicycle, yellow Sun, blue Earth, red planet.
   ========================================================================== */

/* A text label at a point, shifted by (dx, dy). */
function label(svg, text, point, options = {}) {
	const node = shape('text', {
		x: point[0] + (options.dx || 0),
		y: point[1] + (options.dy || 0),
		'text-anchor': options.anchor || 'middle',
		class: `d-label ${options.tone || ''}`
	});

	node.textContent = text;
	svg.appendChild(node);
}

/* Where the ray from `from` in direction `degrees` leaves the circle (center, r).
   `from` must be inside the circle. */
function rayExit(from, degrees, center, r) {
	const d = [cos(degrees), -sin(degrees)];
	const w = [from[0] - center[0], from[1] - center[1]];
	const b = w[0] * d[0] + w[1] * d[1];
	const c = w[0] * w[0] + w[1] * w[1] - r * r;
	const t = -b + Math.sqrt(b * b - c);

	return [from[0] + t * d[0], from[1] + t * d[1]];
}

/* Direction of `point` seen from `center`, in degrees counter-clockwise. */
function bearing(center, point) {
	return atan2d(center[1] - point[1], point[0] - center[0]);
}

/* An open polyline through the given points. */
function trace(svg, points, extraClass = '') {
	svg.appendChild(shape('polyline', {
		points: points.map(p => p.join(',')).join(' '),
		class: `v-ring ${extraClass}`
	}));
}

/* A short arc of radius r around `center`, from angle a1 to a2 (a1 < a2). */
function angleArc(svg, center, r, a1, a2) {
	const start = polar(center[0], center[1], r, a1);
	const end = polar(center[0], center[1], r, a2);

	svg.appendChild(shape('path', {
		d: `M ${start[0]} ${start[1]} A ${r} ${r} 0 0 0 ${end[0]} ${end[1]}`,
		class: 'v-guide solid'
	}));
}

/* An arrow whose shaft and head share a tone (sun, planet, muted...). */
function vector(svg, from, to, tone) {
	const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
	const head = 7;
	const tip = (offset) => [
		to[0] - head * Math.cos(angle + offset),
		to[1] - head * Math.sin(angle + offset)
	];
	const shaftEnd = [to[0] - 0.7 * head * Math.cos(angle), to[1] - 0.7 * head * Math.sin(angle)];

	svg.appendChild(shape('line', {
		x1: from[0], y1: from[1], x2: shaftEnd[0], y2: shaftEnd[1], class: `d-vector ${tone}`
	}));
	svg.appendChild(shape('polygon', {
		points: [to, tip(-0.45), tip(0.45)].map(p => p.join(',')).join(' '),
		class: `v-${tone}`
	}));
}

const DIAGRAMS = {
	/* Hipparchus: the Earth off the center of the Sun's circle. */
	seasons: {
		size: [340, 250],
		caption: "The Earth sits off the center of the Sun's circle (here 1/6 of the radius; Hipparchus used 1/24). Seen from the Earth, the equinoxes and solstices are 90° apart, but they cut the circle into unequal arcs. The Sun moves uniformly, so the longest arc takes the most days.",
		draw(svg) {
			const center = [170, 125];
			const r = 90;
			const apogee = 65.5;
			const earth = polar(center[0], center[1], r / 6, apogee + 180);
			const marks = [0, 90, 180, 270].map(a => rayExit(earth, a, center, r));
			const seasons = [
				["spring", "94½ d"],
				["summer", "92½ d"],
				["autumn", "88⅛ d"],
				["winter", "90⅛ d"]
			];
			const names = ["equinox", "solstice", "equinox", "solstice"];
			const offsets = [[8, 4, 'start'], [0, -8, 'middle'], [-8, 4, 'end'], [0, 16, 'middle']];

			ring(svg, center[0], center[1], r, 'sun');
			marks.forEach((point, i) => {
				guide(svg, earth, point);
				dot(svg, point, 3, 'v-sun');
				label(svg, names[i], point, {
					dx: offsets[i][0], dy: offsets[i][1], anchor: offsets[i][2], tone: 'muted'
				});
			});

			/* season names inside each quadrant, halfway along its arc */
			seasons.forEach(([name, days], i) => {
				let a1 = bearing(center, marks[i]);
				let a2 = bearing(center, marks[(i + 1) % 4]);

				if (a2 < a1) {
					a2 += 360;
				}

				const spot = polar(center[0], center[1], r * 0.62, (a1 + a2) / 2);

				label(svg, name, spot, { dy: -2 });
				label(svg, days, spot, { dy: 12, tone: 'muted' });
			});

			const top = polar(center[0], center[1], r, apogee);

			guide(svg, earth, top);
			label(svg, "apogee", top, { dx: 6, dy: -4, anchor: 'start', tone: 'muted' });
			dot(svg, center, 2, 'v-muted');
			dot(svg, earth, 5, 'v-earth');
			label(svg, "Earth", earth, { dx: -8, dy: -7, anchor: 'end' });
		}
	},

	/* Apollonius, Hipparchus: deferent plus epicycle, and the loops it makes. */
	epicycle: {
		size: [280, 280],
		caption: "The planet's path in space during one trip around the deferent, in which the planet goes seven times around its epicycle. On the red stretches, where the planet is on the inner side of the epicycle, its direction seen from the Earth turns backward: these are the retrograde loops.",
		draw(svg) {
			const earth = [140, 140];
			const R = 84;
			const r = 22;
			const turns = 8;		/* epicycle turns per deferent turn, against fixed directions */
			const now = 45;

			/* sample the path; split it where the apparent motion changes sign */
			const runs = [];
			let previous = null;

			for (let t = 0; t <= 360; t += 1) {
				const x = R * cos(t) + r * cos(turns * t);
				const y = R * sin(t) + r * sin(turns * t);
				const vx = -R * sin(t) - turns * r * sin(turns * t);
				const vy = R * cos(t) + turns * r * cos(turns * t);
				const backward = x * vy - y * vx < 0;
				const point = [earth[0] + x, earth[1] - y];

				if (!runs.length || runs[runs.length - 1].backward !== backward) {
					runs.push({ backward, points: previous ? [previous] : [] });
				}

				runs[runs.length - 1].points.push(point);
				previous = point;
			}

			ring(svg, earth[0], earth[1], R, 'green');
			runs.forEach(run => trace(svg, run.points, run.backward ? 'planet thick' : 'muted'));

			const center = polar(earth[0], earth[1], R, now);
			const planet = polar(center[0], center[1], r, turns * now);

			ring(svg, center[0], center[1], r, 'violet');
			guide(svg, earth, center);
			guide(svg, center, planet);
			dot(svg, center, 2.5, 'v-violet');
			dot(svg, planet, 4.5, 'v-planet');
			dot(svg, earth, 5, 'v-earth');

			label(svg, "Earth", earth, { dy: 18 });
			label(svg, "planet", planet, { dx: 8, dy: 4, anchor: 'start' });
			label(svg, "epicycle", polar(center[0], center[1], r, 135), { dx: -4, dy: -4, anchor: 'end', tone: 'violet' });
			label(svg, "deferent", polar(earth[0], earth[1], R + r, 225), { dx: -4, dy: 10, anchor: 'end', tone: 'green' });
			label(svg, "backward", polar(earth[0], earth[1], R - r, 180), { dy: 24, tone: 'planet' });
		}
	},

	/* Ptolemy: equal angles at the equant are covered in equal times. */
	equant: {
		size: [320, 280],
		caption: "Twelve positions of the epicycle center, at equal time intervals. They are equally spaced in angle as seen from the equant, not from the center of the deferent, so they crowd together near the apogee, far from the Earth, and spread out near the perigee. (Eccentricity exaggerated.)",
		draw(svg) {
			const center = [160, 140];
			const R = 100;
			const offset = 26;
			const earth = [center[0], center[1] + offset];
			const equant = [center[0], center[1] - offset];

			ring(svg, center[0], center[1], R, 'green');

			for (let i = 0; i < 12; i++) {
				const point = rayExit(equant, 90 + 30 * i, center, R);

				guide(svg, equant, point);
				dot(svg, point, 3.5, 'v-violet');
			}

			guide(svg, [center[0], center[1] - R], [center[0], center[1] + R]);
			dot(svg, center, 2.5, 'v-muted');
			dot(svg, equant, 3.5, 'v-violet');
			dot(svg, earth, 5, 'v-earth');

			label(svg, "equant", equant, { dx: 10, dy: -3, anchor: 'start', tone: 'violet' });
			label(svg, "center", center, { dx: 10, dy: 4, anchor: 'start', tone: 'muted' });
			label(svg, "Earth", earth, { dx: 10, dy: 8, anchor: 'start' });
			label(svg, "apogee: slow, far", [center[0], center[1] - R], { dy: -10 });
			label(svg, "perigee: fast, near", [center[0], center[1] + R], { dy: 20 });
		}
	},

	/* Mercury: the deferent's center turns on a small circle. */
	mercury: {
		size: [320, 290],
		caption: "The deferent's center C turns on a small circle around D, opposite to the epicycle center K and at the same rate, while K moves uniformly as seen from the equant. The dashed circle is the deferent at the moment shown. The green curve is the full path of K: its nearest points to the Earth are about 120° either side of the apogee. (Eccentricity exaggerated.)",
		draw(svg) {
			const s = 1.5;			/* pixels per Ptolemaic unit (deferent radius 60) */
			const R = 60;
			const e = 10;			/* Ptolemy has 3 */
			const origin = [160, 182];
			const now = 55;

			/* math coordinates around the Earth, apogee up, angles from the apogee */
			const at = (x, y) => [origin[0] + s * x, origin[1] - s * y];
			const up = a => [-sin(a), cos(a)];
			const crank = a => [e * up(-a)[0], 2 * e + e * up(-a)[1]];
			const epicycleCenter = a => {
				const c = crank(a);
				const d = up(a);
				const w = [0 - c[0], e - c[1]];
				const b = w[0] * d[0] + w[1] * d[1];
				const t = -b + Math.sqrt(b * b - (w[0] * w[0] + w[1] * w[1] - R * R));

				return [d[0] * t, e + d[1] * t];
			};

			const path = [];

			for (let a = 0; a <= 360; a += 2) {
				const k = epicycleCenter(a);

				path.push(at(k[0], k[1]));
			}

			const earth = at(0, 0);
			const equant = at(0, e);
			const hub = at(0, 2 * e);
			const c = crank(now);
			const k = epicycleCenter(now);
			const deferentCenter = at(c[0], c[1]);
			const epicycle = at(k[0], k[1]);

			trace(svg, path, 'green thick');
			svg.appendChild(shape('circle', {
				cx: deferentCenter[0], cy: deferentCenter[1], r: s * R, class: 'v-guide'
			}));
			ring(svg, hub[0], hub[1], s * e, 'violet');
			guide(svg, at(0, -60), at(0, 3 * e + R));
			guide(svg, equant, epicycle);
			guide(svg, hub, deferentCenter);

			/* the two nearest points of the path */
			[-121, 121].forEach(a => {
				const p = epicycleCenter(a);
				const point = at(p[0], p[1]);

				guide(svg, earth, point);
				dot(svg, point, 4, 'v-planet');
				label(svg, "nearest", point, { dx: a > 0 ? -8 : 8, dy: 14, anchor: a > 0 ? 'end' : 'start', tone: 'planet' });
			});

			dot(svg, hub, 2, 'v-muted');
			dot(svg, equant, 3, 'v-violet');
			dot(svg, deferentCenter, 3, 'v-green');
			dot(svg, epicycle, 4, 'v-violet');
			dot(svg, earth, 5, 'v-earth');

			label(svg, "apogee", at(0, 3 * e + R), { dx: 6, dy: -6, anchor: 'start', tone: 'muted' });
			label(svg, "K", epicycle, { dx: -8, dy: -4, anchor: 'end', tone: 'violet' });
			label(svg, "C", deferentCenter, { dx: 7, dy: -2, anchor: 'start', tone: 'green' });
			label(svg, "D", hub, { dx: -7, dy: -2, anchor: 'end', tone: 'muted' });
			label(svg, "equant", equant, { dx: -7, dy: 4, anchor: 'end', tone: 'violet' });
			label(svg, "Earth", earth, { dx: 8, dy: 12, anchor: 'start' });
		}
	},

	/* Venus and Mercury: the epicycle center stays on the Earth-mean Sun line. */
	innerRule: {
		size: [240, 280],
		caption: "Two moments six weeks apart. The epicycle center always lies on the line from the Earth to the mean Sun, so the planet can never get farther from the Sun than the lines tangent to the epicycle. For Venus (epicycle radius 0.72 of the deferent) that limit is about 46\u00b0.",
		panels: [
			{ title: "One day", sunAngle: 62, phase: 90 },
			{ title: "Six weeks later", sunAngle: 102, phase: 230 }
		],
		draw(svg, { title, sunAngle, phase }) {
			const R = 64;
			const r = 0.72 * R;
			const limit = asin(0.72);
			const earth = [120, 205];
			const center = polar(earth[0], earth[1], R, sunAngle);
			const sun = polar(earth[0], earth[1], 160, sunAngle);
			const reach = Math.sqrt(R * R - r * r);

			label(svg, title, [120, 20], { tone: 'title' });
			ring(svg, earth[0], earth[1], R, 'green');
			ring(svg, center[0], center[1], r, 'violet');
			guide(svg, earth, sun);

			[-limit, limit].forEach(a => {
				guide(svg, earth, polar(earth[0], earth[1], reach + 34, sunAngle + a));
			});

			angleArc(svg, earth, 26, sunAngle, sunAngle + limit);
			label(svg, "46\u00b0", polar(earth[0], earth[1], 40, sunAngle + limit / 2), { dy: 4, tone: 'muted' });

			dot(svg, center, 2.5, 'v-violet');
			dot(svg, polar(center[0], center[1], r, phase), 4.5, 'v-planet');
			dot(svg, sun, 7, 'v-sun');
			dot(svg, earth, 5, 'v-earth');

			label(svg, "mean Sun", sun, { dy: -13 });
			label(svg, "Earth", earth, { dy: 20 });
		}
	},

	/* Mars, Jupiter, Saturn: the epicycle radius stays parallel to Earth-mean Sun. */
	outerRule: {
		size: [240, 270],
		caption: "The arrow from the epicycle center to the planet always points the same way as the arrow from the Earth to the mean Sun. At opposition the Sun is behind the Earth, so the planet is at the inner point of its epicycle: nearest, brightest and moving backward.",
		panels: [
			{ title: "Any time", centerAngle: 140 },
			{ title: "At opposition", centerAngle: 215 }
		],
		draw(svg, { title, centerAngle }) {
			const R = 84;
			const r = 32;
			const sunAngle = 35;
			const earth = [120, 148];
			const sun = polar(earth[0], earth[1], 40, sunAngle);
			const center = polar(earth[0], earth[1], R, centerAngle);
			const planet = polar(center[0], center[1], r, sunAngle);

			label(svg, title, [120, 20], { tone: 'title' });
			ring(svg, earth[0], earth[1], R, 'green');
			ring(svg, earth[0], earth[1], 40, 'sun');
			ring(svg, center[0], center[1], r, 'violet');

			if (centerAngle === sunAngle + 180) {
				guide(svg, sun, center);
			}

			vector(svg, earth, sun, 'sun');
			vector(svg, center, planet, 'planet');
			dot(svg, center, 2.5, 'v-violet');
			dot(svg, planet, 4.5, 'v-planet');
			dot(svg, sun, 7, 'v-sun');
			dot(svg, earth, 5, 'v-earth');

			label(svg, "mean Sun", sun, { dx: 10, dy: -6, anchor: 'start' });
			label(svg, "Earth", earth, { dx: 4, dy: 18, anchor: 'start' });
			label(svg, "planet", planet, { dx: -6, dy: -10, anchor: 'end', tone: 'planet' });
		}
	}
};

/* A diagram with its caption. A diagram with `panels` is drawn once per
   panel, each in its own <svg>, so that the panels can wrap on a phone. */
function buildDiagram(name) {
	const diagram = DIAGRAMS[name];
	const panels = diagram.panels || [{}];
	const figure = el('figure', diagram.panels ? 'diagram wide' : 'diagram');
	const row = el('div', 'panels');

	panels.forEach(panel => {
		const svg = shape('svg', {
			viewBox: `0 0 ${diagram.size[0]} ${diagram.size[1]}`,
			role: 'img',
			'aria-label': panel.title || diagram.caption
		});

		diagram.draw(svg, panel);
		row.appendChild(svg);
	});

	figure.appendChild(row);
	figure.appendChild(el('figcaption', '', diagram.caption));

	return figure;
}


/* ==========================================================================
   2. SOURCES
   ========================================================================== */

const SOURCES = {
	toomer: {
		text: "G. J. Toomer, Ptolemy's Almagest (1984; Princeton, 1998). The standard English translation.",
		url: "https://classicalliberalarts.com/resources/PTOLEMY_ALMAGEST_ENGLISH.pdf"
	},
	pedersen: {
		text: "O. Pedersen, A Survey of the Almagest (Springer, 2011)."
	},
	jones: {
		text: "A. Jones, Hipparchus's computations of solar longitudes, J. Hist. Astron. (1991).",
		url: "https://archive.nyu.edu/bitstream/2451/60904/2/Jones%201991%20Hipparchus%20solar%20longitudes%20JHA.pdf"
	},
	duke2: {
		text: "D. Duke, lecture notes on Almagest III (the Sun), Florida State University.",
		url: "https://people.sc.fsu.edu/~dduke/lectures/lecture2.pdf"
	},
	duke4: {
		text: "D. Duke, lecture notes on Almagest VII\u2013VIII (stars and instruments).",
		url: "https://people.sc.fsu.edu/~dduke/lectures/lecture4.pdf"
	},
	duke5: {
		text: "D. Duke, lecture notes on Almagest IX\u2013XIII (the planets).",
		url: "https://people.sc.fsu.edu/~dduke/lectures/lecture5.pdf"
	},
	dukeInner: {
		text: "D. Duke, analysis of Ptolemy's models for Venus and Mercury, Florida State University.",
		url: "https://people.sc.fsu.edu/~dduke/inner.pdf"
	},
	recio: {
		text: "G. L. Recio and C. C. Carman, On the equant point for the planets and the moon, J. Hist. Astron. 49 (2018).",
		url: "https://ri.conicet.gov.ar/handle/11336/98164"
	},
	gamini: {
		text: "A. M. Gamini, Al-Shirazi and the empirical origin of Ptolemy's equant, Arabic Sciences and Philosophy.",
		url: "https://resolve.cambridge.org/core/journals/arabic-sciences-and-philosophy/article/abs/alshirazi-and-the-empirical-origin-of-ptolemys-equant-in-his-model-of-the-superior-planets/AE2204755F3100E86A8DBE5347D0410A"
	},
	arxivHelio: {
		text: "From heliocentrism to epicycles: a commentary on pre-Ptolemaic astronomy, arXiv:2208.02137.",
		url: "https://arxiv.org/abs/2208.02137"
	},
	arxivCircle: {
		text: "From the epicycles of the Greeks to Kepler's ellipse, arXiv:physics/0107009.",
		url: "https://arxiv.org/abs/physics/0107009"
	},
	arxivTimber: {
		text: "Modeling the history of astronomy: Ptolemy, Copernicus and Tycho, arXiv:1301.2119.",
		url: "https://arxiv.org/abs/1301.2119"
	},
	arxivQuasi: {
		text: "Quasi periodic motions from Hipparchus to Kolmogorov, arXiv:chao-dyn/9907004.",
		url: "https://arxiv.org/abs/chao-dyn/9907004"
	},
	cudl: {
		text: "Regiomontanus's diagrams of Ptolemy's Mercury model, Trinity College Cambridge (Cambridge Digital Library).",
		url: "https://cudl.lib.cam.ac.uk/view/PR-TRINITY-VI-00015-00080-00001"
	},
	diagonal: {
		text: "From Kepler to Ptolemy 12 (Mercury), Diagonal Argument blog.",
		url: "https://diagonalargument.com/2025/03/28/from-kepler-to-ptolemy-12/"
	},
	whewell: {
		text: "W. Whewell, History of the Inductive Sciences (1858), vol. 1, on Ptolemy's instruments.",
		url: "https://geology.19thcenturyscience.org/books/1858-Whewell-HistSci/Vol-I/PDFpages/1858-Whewell-HistSci-I-0165.pdf"
	},
	hps: {
		text: "Starry Messenger, Cambridge HPS: The armillary sphere.",
		url: "https://www.sites.hps.cam.ac.uk/starry/armillary.html"
	}
};


/* ==========================================================================
   3. TOPICS
   Each topic: title, colour thread (tone), optional diagram, summary paragraphs,
   how he justified it, caveats ("asterisks") and source keys.
   ========================================================================== */

const TOPICS = [
	{
		title: "Hipparchus's Sun: why the seasons are unequal",
		tone: "models",
		diagram: "seasons",
		summary: [
			"From the spring equinox to the summer solstice the Sun takes longer than from the summer solstice to the autumn equinox. Ptolemy reports that Hipparchus measured 94\u00bd and 92\u00bd days for these two seasons (Almagest III.4); the other two come out near 88\u215b and 90\u215b.",
			"A Sun moving uniformly on a circle centered on the Earth cannot do this. Hipparchus moved the Earth off-center by 1/24 of the radius, so the Sun looks fastest near the point closest to us. Ptolemy kept the model, with the same eccentricity and the same direction of the apogee."
		],
		how: [
			"The same unequal motion can be produced by a Sun on an epicycle. Ptolemy cites Apollonius's theorem to show the two versions are equivalent, then picks the simpler eccentric circle.",
			"He presents the model as Hipparchus's, with the same parameters, and re-derives it from equinox and solstice observations of his own time."
		],
		caveats: [
			"Ptolemy does not say how Hipparchus obtained the season lengths, and Hipparchus himself doubted that the length of the year was constant (III.1, III.4)."
		],
		sources: ["toomer", "jones", "duke2"]
	},
	{
		title: "Retrograde motion: the epicycle",
		tone: "models",
		diagram: "epicycle",
		summary: [
			"Planets usually drift eastward among the stars, then stop, move backward for weeks, stop again and resume, creating a loop in the sky. Ptolemy inherited a tool for this: the epicycle. The planet moves on a small circle, the epicycle, whose center moves along a large one, the deferent. On the inner part of the small circle the planet's motion opposes the center's, and the planet seems to go backward.",
			"Epicycles and deferents are credited to Apollonius and Hipparchus (2nd century BCE)."
		],
		how: [
			"Retrograde motion is visible in the sky, but its size and timing must be measured. Ptolemy does this for each planet, using the epicycle to fit the data.",
			"Ptolemy treats this in book XII. Using Apollonius's theorem (XII.1), Ptolemy finds where a planet appears to stand still, then computes the retrograde arc, for instance for Mars (XII.4), and compares it with observed values."
		],
		caveats: [
			"Only the ratio of epicycle to deferent can be measured, so the model fixes the shape of each planet's motion but not its size.",
			"In a later work, the Planetary Hypotheses, Ptolemy supplies sizes with a nesting assumption: the shells of the planets fit inside one another with no gaps, so that the greatest distance of one planet equals the least distance of the next one out. Starting from the Moon, whose distance can be found by parallax, this gives a distance for every planet."
		],
		sources: ["toomer", "gamini", "duke5"]
	},
	{
		title: "The equant",
		tone: "models",
		diagram: "equant",
		summary: [
			"A plain epicycle on a Earth-centred deferent gives identical loops everywhere in the sky, which does not match the observations.",
			"To solve this problem, Ptolemy introduced the equant: a point on the opposite side of the deferent's center from the Earth.",
			"The epicycle center moves uniformly around the equant, not around the deferent's center. This makes loops smaller when the planet is far from us and larger when it is near."
		],
		how: [
			"Ptolemy introduces the equant with Venus (Almagest X), relying on observations of his own and of a certain Theon: the data do not fit uniform motion about the deferent's center.",
			"For the outer planets, three oppositions are enough to fix the deferent, the equant and the Earth's offset (X\u2013XI). One historian argues the idea first arose with Mars rather than Venus.",
			"It works because it approximately reproduces what Kepler would call the area law, to second order in the eccentricity."
		],
		caveats: [
			"The Almagest says little about how the equant was found, and many scholars dispute that the Venus observations were really its empirical basis (Recio and Carman, 2018).",
			"It breaks the rule that circular motion be uniform about the circle's own center. Ibn al-Haytham, the Maragha astronomers and Copernicus all objected to it."
		],
		sources: ["toomer", "recio", "dukeInner", "arxivQuasi"]
	},
	{
		title: "Mercury: one more piece of machinery",
		tone: "models",
		diagram: "mercury",
		summary: [
			"In the models of the other planets the epicycle center comes closest to the Earth once per revolution, at the perigee, the point opposite the apogee. From his observations of Mercury, Ptolemy concluded that its epicycle center comes closest twice per revolution, about 120\u00b0 on either side of the apogee, and is slightly farther away at the point opposite the apogee.",
			"To obtain this, he made the center of Mercury's deferent move. It turns on a small circle centered beyond the equant, on the line toward the apogee, at the same angular rate as the epicycle center but in the opposite direction. The device is often called a crank. It moves the deferent, not the planet: without it, the model of Mercury would be the same as that of Venus."
		],
		how: [
			"The same trick was already used for the Moon. Ptolemy adds it to fit his observations of Mercury, which can only be made low in the sky around sunrise or sunset, so good data are scarce."
		],
		caveats: [
			"In the 15th century Regiomontanus showed that the standard textbook account of Mercury's geometry, the Theorica planetarum, contained errors about how the two perigees work."
		],
		sources: ["toomer", "cudl", "diagonal"]
	},
	{
		title: "Venus and Mercury: always near the Sun",
		tone: "order",
		diagram: "innerRule",
		summary: [
			"These two planets never stray far from the Sun: Venus up to about 47\u00b0 and Mercury about 28\u00b0 (modern values). Ptolemy builds this in by hand: the epicycle center of each planet always lies on the line from the Earth to the mean Sun, so the deferent motion is simply the Sun's motion, one turn per year.",
			"The epicycle size follows from the greatest elongation. For Venus, an epicycle radius of 43;10 against a deferent of 60 (ratio 0.72) gives an elongation of about 46\u00b0."
		],
		how: [
			"Observation gives two facts. On average the planet moves along the zodiac exactly as fast as the Sun, and its distance from the Sun never exceeds a fixed limit. Tying the epicycle center to the mean Sun gives the first; the greatest elongations fix the radius of the epicycle (IX for Mercury, X for Venus)."
		],
		caveats: [
			"The tie to the Sun is postulated. Nothing in the model explains why two planets should follow the Sun.",
			"A Sun-centered view explains it at once: both planets orbit inside the Earth's orbit (tab 3).",
			"Ptolemy admits that the order of Venus, Mercury and the Sun cannot be proved (IX.1): there is no perceptible parallax, and no passage of either planet across the Sun has been seen. He keeps them below the Sun, as the older astronomers did."
		],
		sources: ["toomer", "pedersen", "dukeInner", "arxivHelio"]
	},
	{
		title: "Mars, Jupiter, Saturn: the rule of oppositions",
		tone: "order",
		diagram: "outerRule",
		summary: [
			"Unlike Venus and Mercury, the outer planets can be at any angle from the Sun. But they go retrograde only around opposition (Sun, Earth and planet in a line), when they are also at their brightest.",
			"Ptolemy encodes this with a parallel rule: the line from the epicycle center to the planet is always parallel to the line from the Earth to the mean Sun. At opposition the planet is therefore at the near point of its epicycle, moving backward."
		],
		how: [
			"Because of the parallel rule, at opposition the epicycle shifts the planet neither forward nor back: its longitude equals that of the epicycle center. Measurements at oppositions therefore give clean information about the deferent alone.",
			"Three oppositions fix the deferent's center, the equant and the radius (X\u2013XI). Oppositions are taken with respect to the mean Sun; Kepler was the first to use the true Sun."
		],
		caveats: [
			"The parallel rule is imposed, not explained. In the Sun-centered picture it comes for free: the epicycle is the Earth's own orbit (tab 3).",
			"The relative sizes of the orbits stay undetermined, because only ratios inside each planet's model are measured."
		],
		sources: ["toomer", "duke5", "arxivTimber", "arxivCircle"]
	},
	{
		title: "How Ptolemy measured the sky",
		tone: "methods",
		summary: [
			"His main instrument was the armillary astrolabe (Almagest V.1): six rings set up on the local north\u2013south line, with an inner ring carrying two sights. Aiming the sights at a body gave its ecliptic longitude and latitude. For the Moon's altitude he used a parallactic instrument: two sighted rulers, one held vertical by a plumb line, with the angle between them read off.",
			"Stars cannot be seen in daylight, so star longitudes were tied to the Sun through the Moon: the Sun's position came from the solar model, the Moon was measured against the Sun, and the star against the Moon. The best-known case is Regulus, observed in the 2nd year of Antoninus (139 CE). Planets were measured against reference stars, sometimes checked against the Moon."
		],
		how: [
			"Ptolemy compared his star positions with Hipparchus's and with older ones, and obtained a precession of 1\u00b0 per century (VII.1\u20133). The true value is about 1\u00b0 per 72 years. Hipparchus had treated 1\u00b0 per century as a lower bound.",
			"The planetary parameters come from a small set of dated observations in Books IX\u2013XI, mostly from opposition observations."
		],
		caveats: [
			"Many historians conclude that much of the Almagest star catalogue comes from Hipparchus's data, shifted for precession. The question is still debated.",
			"Several modern studies argue that Ptolemy's published derivations from observations are tidier than the real procedure, and that he probably knew the parameters beforehand (R. R. Newton, 1977; Duke).",
			"He could measure only angles. Without parallax, distances come only from the nesting assumption."
		],
		sources: ["toomer", "whewell", "hps", "duke4"]
	}
];


/* ==========================================================================
   4. RENDERERS
   ========================================================================== */

/* A bulleted list of plain strings. */
function buildBullets(items) {
	const list = el('ul');

	items.forEach(text => {
		list.appendChild(el('li', '', text));
	});

	return list;
}

/* A small heading followed by a bulleted list. */
function buildBlock(label, items) {
	const block = el('div');

	block.appendChild(el('h3', '', label));
	block.appendChild(buildBullets(items));

	return block;
}

/* The sources of one topic; entries with a url become links. */
function buildSources(keys) {
	const block = el('div', 'sources');
	const list = el('ul');

	block.appendChild(el('h3', '', 'Sources'));

	keys.forEach(key => {
		const source = SOURCES[key];
		const item = el('li');

		if (source.url) {
			const link = el('a', '', source.text);

			link.href = source.url;
			link.target = '_blank';
			link.rel = 'noopener';
			item.appendChild(link);
		} else {
			item.textContent = source.text;
		}

		list.appendChild(item);
	});

	block.appendChild(list);

	return block;
}

/* One card per topic: text (and its diagram, if any) on top, then the blocks. */
function buildTopic(topic) {
	const card = el('div', `card topic tone-${topic.tone}`);
	const wide = topic.diagram && DIAGRAMS[topic.diagram].panels;
	const head = el('div', topic.diagram ? `topic-head${wide ? ' stacked' : ''}` : '');
	const text = el('div');

	text.appendChild(el('h2', '', topic.title));
	topic.summary.forEach(paragraph => {
		text.appendChild(el('p', '', paragraph));
	});

	head.appendChild(text);

	if (topic.diagram) {
		head.appendChild(buildDiagram(topic.diagram));
	}

	card.appendChild(head);

	if (topic.how) {
		card.appendChild(buildBlock('How he justified it', topic.how));
	}

	card.appendChild(buildBlock('Asterisks', topic.caveats));
	card.appendChild(buildSources(topic.sources));

	return card;
}

function renderTopics() {
	const container = byId('topics');

	TOPICS.forEach(topic => {
		container.appendChild(buildTopic(topic));
	});
}

renderTopics();
