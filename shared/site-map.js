// @ts-check
/* ==========================================================================
   PREDICTING THE SKY - SITE MAP (site-map.js)
   The acts, the pages, the detour topics, the origins and the kinds of
   exercise: the data from which components.js builds the hub, the page
   headers, the previous / next links and the margin notes. Touches no DOM.

   Publishing a page = setting ready: true on its entry in PAGES. The hub,
   the previous / next links and the detour cards all follow.
   ========================================================================== */

const SITE_MAP = (function () {
	/* The acts, in reading order. */
	const ACTS = [
		{
			id: 0,
			name: 'Act 0',
			title: 'The hook',
			blurb: "Ptolemy's Mars against tonight's sky: how can circles do this well, and why are they still wrong?"
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
			number: '0.1',
			act: 0,
			ready: false,
			title: 'Where is Mars tonight?',
			question: 'How good was a model built from circles?',
			path: 'act0-hook/01-mars-tonight/index.html'
		},
		{
			number: '1.1',
			act: 1,
			ready: true,
			title: 'The turning sky',
			question: 'What moves, and around what?',
			path: 'act1-stage/01-turning-sky/index.html'
		},
		{
			number: '1.2',
			act: 1,
			ready: true,
			title: 'Frames',
			question: 'How do we point to stars?',
			path: 'act1-stage/02-frames/index.html'
		},
		{
			number: '1.3',
			act: 1,
			ready: true,
			title: 'Clocks',
			question: 'What time is it according to the sky?',
			path: 'act1-stage/03-clocks/index.html'
		},
		{
			number: '2.1',
			act: 2,
			ready: true,
			title: 'The uneven year',
			question: 'Why are the seasons not equal?',
			path: 'act2-sun/01-uneven-year/index.html'
		},
		{
			number: '2.2',
			act: 2,
			ready: true,
			title: 'The equation of time',
			question: 'Why does the sundial disagree with the clock?',
			path: 'act2-sun/02-equation-of-time/index.html'
		},
		{
			number: '2.3',
			act: 2,
			ready: false,
			title: 'Precession',
			question: "Why do the stars' longitudes grow?",
			path: 'act2-sun/03-precession/index.html'
		},
		{
			number: '3.1',
			act: 3,
			ready: false,
			title: 'The first anomaly',
			question: "Why does the Moon's speed vary, and with what period?",
			path: 'act3-moon/01-first-anomaly/index.html'
		},
		{
			number: '3.2',
			act: 3,
			ready: false,
			title: 'Evection and the distance problem',
			question: 'What goes wrong at the quarters?',
			path: 'act3-moon/02-evection/index.html'
		},
		{
			number: '3.3',
			act: 3,
			ready: false,
			title: 'Eclipses',
			question: 'When does a new Moon become a solar eclipse?',
			path: 'act3-moon/03-eclipses/index.html'
		},
		{
			number: '4.1',
			act: 4,
			ready: false,
			title: 'Going backwards',
			question: 'Why do planets loop, and why always at opposition?',
			path: 'act4-planets/01-going-backwards/index.html'
		},
		{
			number: '4.2',
			act: 4,
			ready: false,
			title: 'The equant',
			question: 'What does the simple model miss?',
			path: 'act4-planets/02-equant/index.html'
		},
		{
			number: '4.3',
			act: 4,
			ready: false,
			title: 'Same geometry, new centre',
			question: 'What changes if the Sun is at the centre?',
			path: 'act4-planets/03-new-centre/index.html'
		},
		{
			number: '4.4',
			act: 4,
			ready: false,
			title: 'Kepler',
			question: 'What shape removes the last error?',
			path: 'act4-planets/04-kepler/index.html'
		},
		{
			number: 'beyond',
			act: 5,
			ready: false,
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
			path: null,
			ready: false
		},
		aberration: {
			title: 'aberration',
			sentence: "the Earth's motion tilts the incoming starlight by up to 20″",
			path: null,
			ready: false
		},
		parallax: {
			title: 'stellar parallax',
			sentence: 'the annual shift that finally measured the distance to the stars',
			path: null,
			ready: false
		},
		latitudes: {
			title: 'planetary latitudes',
			sentence: 'how far the planets wander north and south of the ecliptic',
			path: null,
			ready: false
		},
		tycho: {
			title: 'Tycho Brahe',
			sentence: "the observations, ten times better than Ptolemy's, that Kepler had to fit",
			path: null,
			ready: false
		},
		islamic: {
			title: 'the Islamic critiques of the equant',
			sentence: "al-Tusi's couple and Ibn al-Shatir's models, which Copernicus reused",
			path: null,
			ready: false
		},
		newton: {
			title: 'Newton and gravitation',
			sentence: "why Kepler's laws hold",
			path: null,
			ready: false
		},
		perturbations: {
			title: 'perturbations',
			sentence: 'why the ellipses themselves slowly turn and change',
			path: null,
			ready: false
		},
		calendars: {
			title: 'calendars',
			sentence: 'reconciling the day, the month and the year',
			path: null,
			ready: false
		},
		instruments: {
			title: 'instruments',
			sentence: 'armillary spheres, quadrants and how the old numbers were measured',
			path: null,
			ready: false
		},
		deltaT: {
			title: 'the slowing Earth (ΔT)',
			sentence: "tides lengthen the day, so clocks and the Earth's rotation drift apart by hours over millennia",
			path: null,
			ready: false
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
			text: "the author's own contribution, as far as the sources allow"
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

	return {
		ACTS,
		PAGES,
		TOPICS,
		ORIGINS,
		ORIGIN_KEY,
		EXERCISE_KINDS
	};
})();
