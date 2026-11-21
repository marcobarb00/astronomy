// @ts-check
/* ==========================================================================
   PREDICTING THE SKY - SITE MAP (site-map.js)
   The acts, the pages, the detour topics, the origins and the kinds of
   exercise: the data from which components.js builds the hub, the page
   headers, the previous / next links and the margin notes. Touches no DOM.

   Publishing a page = setting ready: true on its entry in PAGES. The hub,
   the previous / next links and the detour cards all follow. The
   toolbox (TOOLBOX) is not in PAGES: it is reached only from the hub's
   button, with no previous / next and no row in the chapters.
   ========================================================================== */

const SITE_MAP = (function () {
	/* The acts, in reading order. */
	const ACTS = [
		{
			id: 0,
			name: tr('Act 0', 'Atto 0'),
			title: tr('Intro', 'Introduzione'),
			blurb: tr(
				"Ptolemy's Mars against tonight's sky: how can circles do this well, and why are they still wrong?",
				'Il Marte di Tolomeo contro il cielo di stanotte: come possono dei cerchi riuscire così bene, e perché sbagliano comunque?'
			)
		},
		{
			id: 1,
			name: tr('Act I', 'Atto I'),
			title: tr('The stage', 'La scena'),
			blurb: tr(
				'The language needed to state any prediction: the sphere, its frames and its clocks.',
				'Il linguaggio che serve per formulare qualunque previsione: la sfera, i suoi sistemi di riferimento e i suoi orologi.'
			)
		},
		{
			id: 2,
			name: tr('Act II', 'Atto II'),
			title: tr('The Sun', 'Il Sole'),
			blurb: tr(
				'The first anomaly and the simplest complete model.',
				'La prima anomalia e il modello completo più semplice.'
			)
		},
		{
			id: 3,
			name: tr('Act III', 'Atto III'),
			title: tr('The Moon', 'La Luna'),
			blurb: tr(
				'Four kinds of month, two anomalies, and the eclipses that test them.',
				'Quattro tipi di mese, due anomalie, e le eclissi che le mettono alla prova.'
			)
		},
		{
			id: 4,
			name: tr('Act IV', 'Atto IV'),
			title: tr('The planets', 'I pianeti'),
			blurb: tr(
				'Loops, the equant, a new center, what the observations can decide, and the ellipse that removes the last error.',
				"I cappi, l'equante, un nuovo centro, ciò che le osservazioni possono decidere, e l'ellisse che elimina l'ultimo errore."
			)
		},
		{
			id: 5,
			name: tr('Epilogue', 'Epilogo'),
			title: tr('Beyond Kepler', 'Oltre Keplero'),
			blurb: tr('Where the story goes next.', 'Dove va la storia dopo Keplero.')
		}
	];

	/* Every page in reading order (STRUCTURE.md §4 and §9).
	   path is relative to the site root; italian: true when the page has
	   its Italian translation, index.it.html beside index.html (see
	   localizePaths below). The words are in the page's language (tr,
	   common.js). */
	const PAGES = [
		{
			number: '0.1',
			act: 0,
			ready: false,
			title: tr('Where is Mars tonight?', "Dov'è Marte stanotte?"),
			question: tr('How good was a model built from circles?', 'Quanto era buono un modello fatto di cerchi?'),
			path: 'act0-intro/01-mars-tonight/index.html'
		},
		{
			number: '1.1',
			act: 1,
			ready: true,
			title: tr('The turning sky', 'Il cielo che ruota'),
			question: tr('What moves, and around what?', 'Che cosa si muove, e attorno a che cosa?'),
			path: 'act1-stage/01-turning-sky/index.html',
			italian: true
		},
		{
			number: '1.2',
			act: 1,
			ready: true,
			title: tr('Frames', 'Sistemi di riferimento'),
			question: tr('How do we point to stars?', 'Come indichiamo una stella?'),
			path: 'act1-stage/02-frames/index.html',
			italian: true
		},
		{
			number: '1.3',
			act: 1,
			ready: true,
			title: tr('Clocks', 'Orologi'),
			question: tr('What time is it according to the sky?', 'Che ore sono secondo il cielo?'),
			path: 'act1-stage/03-clocks/index.html',
			italian: true
		},
		{
			number: '2.1',
			act: 2,
			ready: true,
			title: tr('The uneven year', "L'anno disuguale"),
			question: tr('Why are the seasons not equal?', 'Perché le stagioni non sono uguali?'),
			path: 'act2-sun/01-uneven-year/index.html',
			italian: true
		},
		{
			number: '2.2',
			act: 2,
			ready: true,
			title: tr('The equation of time', "L'equazione del tempo"),
			question: tr(
				'Why does the sundial disagree with the clock?',
				"Perché la meridiana non va d'accordo con l'orologio?"
			),
			path: 'act2-sun/02-equation-of-time/index.html',
			italian: true
		},
		{
			number: '2.3',
			act: 2,
			ready: true,
			title: tr('Precession', 'La precessione'),
			question: tr(
				"Why do the stars' ecliptic longitudes grow?",
				'Perché le longitudini eclittiche delle stelle crescono?'
			),
			path: 'act2-sun/03-precession/index.html',
			italian: true
		},
		{
			number: '3.1',
			act: 3,
			ready: true,
			title: tr('The first anomaly', 'La prima anomalia'),
			question: tr(
				"Why does the Moon's speed vary, and with what period?",
				'Perché la velocità della Luna varia, e con quale periodo?'
			),
			path: 'act3-moon/01-first-anomaly/index.html',
			italian: true
		},
		{
			number: '3.2',
			act: 3,
			ready: true,
			title: tr('Evection and the distance problem', "L'evezione e il problema della distanza"),
			question: tr('What goes wrong at the quarters?', 'Che cosa non va ai quarti?'),
			path: 'act3-moon/02-evection/index.html',
			italian: true
		},
		{
			number: '3.3',
			act: 3,
			ready: true,
			title: tr('Eclipses', 'Le eclissi'),
			question: tr(
				'When does a new Moon become a solar eclipse?',
				"Quando una Luna nuova diventa un'eclissi di Sole?"
			),
			path: 'act3-moon/03-eclipses/index.html',
			italian: true
		},
		{
			number: '4.1',
			act: 4,
			ready: true,
			title: tr('Going backwards', 'Il moto retrogrado'),
			question: tr(
				'Why do planets loop, and why always at opposition?',
				"Perché i pianeti descrivono un cappio, e perché sempre all'opposizione?"
			),
			path: 'act4-planets/01-going-backwards/index.html',
			italian: true
		},
		{
			number: '4.2',
			act: 4,
			ready: true,
			title: tr('The equant', "L'equante"),
			question: tr('What does the simple model miss?', 'Che cosa sfugge al modello semplice?'),
			path: 'act4-planets/02-equant/index.html',
			italian: true
		},
		{
			number: '4.3',
			act: 4,
			ready: true,
			title: tr('Same geometry, new center', 'Stessa geometria, nuovo centro'),
			question: tr('What changes when the Sun is fixed?', 'Che cosa cambia quando si fissa il Sole?'),
			path: 'act4-planets/03-new-center/index.html',
			italian: true
		},
		{
			number: '4.4',
			act: 4,
			ready: true,
			title: tr('Phases and parallax', 'Fasi e parallasse'),
			question: tr(
				'Can the observations decide which body is at rest?',
				'Le osservazioni possono decidere quale corpo è in quiete?'
			),
			path: 'act4-planets/04-phases-parallax/index.html',
			italian: true
		},
		{
			number: '4.5',
			act: 4,
			ready: true,
			title: tr('Kepler', 'Keplero'),
			question: tr('What shape removes the last error?', "Quale forma elimina l'ultimo errore?"),
			path: 'act4-planets/05-kepler/index.html',
			italian: true
		},
		{
			number: 'beyond',
			act: 5,
			ready: false,
			title: tr('Beyond Kepler', 'Oltre Keplero'),
			question: tr('Where does the story go next?', 'Dove va la storia dopo Keplero?'),
			path: 'beyond-kepler/index.html',
			italian: true
		}
	];

	/* The astronomers on the hub's timeline (components.js, renderTimeline),
	   in order. year places the mark on the axis; date is the text beside
	   it; work is what the course takes from them; pages are the pages that
	   rebuild their models or use their observations (a page may sit under
	   two). above: the label goes above the axis, so that neighbours
	   alternate. */
	const ASTRONOMERS = [
		{
			name: tr('Babylonian records', 'Registri babilonesi'),
			year: -721,
			date: tr('721 BC', '721 a.C.'),
			work: tr('eclipses and periods', 'eclissi e periodi'),
			pages: ['3.1', '3.3'],
			above: true
		},
		{
			name: tr('Greek geometers', 'Geometri greci'),
			year: -350,
			date: tr('4th century BC', 'IV secolo a.C.'),
			work: tr('the sphere', 'la sfera'),
			pages: ['1.1'],
			above: false
		},
		{
			name: tr('Hipparchus', 'Ipparco'),
			year: -130,
			date: tr('c. 130 BC', 'ca. 130 a.C.'),
			work: tr('the eccentric, precession', "l'eccentrico, la precessione"),
			pages: ['2.1', '2.3', '3.1'],
			above: true
		},
		{
			name: tr('Ptolemy', 'Tolomeo'),
			year: 150,
			date: tr('c. AD 150', 'ca. 150 d.C.'),
			work: tr('the Almagest', "l'Almagesto"),
			pages: ['1.2', '1.3', '2.2', '3.2', '3.3', '4.1', '4.2'],
			above: false
		},
		{
			name: tr('Copernicus', 'Copernico'),
			year: 1543,
			date: '1543',
			work: 'De revolutionibus',
			pages: ['4.3'],
			above: true
		},
		{
			name: 'Tycho',
			year: 1588,
			date: '1588',
			work: tr('his system', 'il suo sistema'),
			pages: ['4.4'],
			above: false
		},
		{
			name: tr('Kepler', 'Keplero'),
			year: 1609,
			date: '1609',
			work: tr('the ellipse', "l'ellisse"),
			pages: ['4.5'],
			above: true
		}
	];

	/* The toolbox (STRUCTURE.md §4, Epilogue): every model of the course
	   gathered to be used, reached only from the hub. kicker replaces the
	   act line of a page in PAGES. */
	const TOOLBOX = {
		number: 'toolbox',
		kicker: tr('Toolbox', 'Cassetta degli attrezzi'),
		ready: true,
		title: tr('The toolbox', 'La cassetta degli attrezzi'),
		question: tr(
			'Every model of the course, ready to use on any date',
			"Tutti i modelli del corso, pronti all'uso in qualunque data"
		),
		path: 'toolbox/index.html',
		italian: true
	};

	/* Topics outside the scope (STRUCTURE.md §3, §7.4). A detour card
	   becomes a link when its topic has a ready page. */
	const TOPICS = {
		nutation: {
			title: tr('nutation', 'nutazione'),
			sentence: tr(
				'the small wobble of the pole on top of precession',
				'la piccola oscillazione del polo che si aggiunge alla precessione'
			),
			path: null,
			ready: false
		},
		aberration: {
			title: tr('aberration', 'aberrazione'),
			sentence: tr(
				"the Earth's yearly motion relative to the solar system's center of mass tilts the incoming starlight by about 20″",
				'il moto annuo della Terra rispetto al centro di massa del sistema solare inclina la luce delle stelle in arrivo di circa 20″'
			),
			path: null,
			ready: false
		},
		parallax: {
			title: tr('stellar parallax', 'parallasse stellare'),
			sentence: tr(
				'the annual shift that finally measured the distance to the stars',
				'lo spostamento annuo che permise finalmente di misurare la distanza delle stelle'
			),
			path: null,
			ready: false
		},
		latitudes: {
			title: tr('planetary ecliptic latitudes', 'latitudini eclittiche dei pianeti'),
			sentence: tr(
				'how far the planets wander north and south of the ecliptic',
				"quanto i pianeti si allontanano a nord e a sud dell'eclittica"
			),
			path: null,
			ready: false
		},
		tycho: {
			title: tr('Tycho Brahe', 'Tycho Brahe'),
			sentence: tr(
				"the observations, ten times better than Ptolemy's, that Kepler had to fit",
				'le osservazioni, dieci volte più precise di quelle di Tolomeo, che Keplero dovette riprodurre'
			),
			path: null,
			ready: false
		},
		islamic: {
			title: tr('the Islamic critiques of the equant', "le critiche islamiche all'equante"),
			sentence: tr(
				"al-Tusi's couple and Ibn al-Shatir's models, whose devices reappear in Copernicus",
				'la coppia di al-Tusi e i modelli di Ibn al-Shatir, i cui dispositivi ricompaiono in Copernico'
			),
			path: null,
			ready: false
		},
		newton: {
			title: tr('Newton and gravitation', 'Newton e la gravitazione'),
			sentence: tr(
				"why Kepler's laws hold nearly, and where they fail",
				'perché le leggi di Keplero valgono quasi esattamente, e dove non valgono'
			),
			path: null,
			ready: false
		},
		perturbations: {
			title: tr('perturbations', 'perturbazioni'),
			sentence: tr(
				'why the ellipses themselves slowly turn and change',
				'perché le ellissi stesse ruotano e cambiano lentamente'
			),
			path: null,
			ready: false
		},
		moon: {
			title: tr('the Moon after Kepler', 'la Luna dopo Keplero'),
			sentence: tr(
				"the evection, the variation and the annual equation as effects of the Sun's pull, and the series of terms that compute the Moon today",
				"l'evezione, la variazione e l'equazione annua come effetti dell'attrazione del Sole, e le serie di termini con cui oggi si calcola la Luna"
			),
			path: null,
			ready: false
		},
		calendars: {
			title: tr('calendars', 'calendari'),
			sentence: tr('reconciling the day, the month and the year', "accordare il giorno, il mese e l'anno"),
			path: null,
			ready: false
		},
		instruments: {
			title: tr('instruments', 'strumenti'),
			sentence: tr(
				'armillary spheres, quadrants and how the old numbers were measured',
				'sfere armillari, quadranti, e come furono misurati i numeri antichi'
			),
			path: null,
			ready: false
		},
		deltaT: {
			title: tr('the slowing Earth (ΔT)', 'la Terra che rallenta (ΔT)'),
			sentence: tr(
				"tides lengthen the day, so clocks and the Earth's rotation drift apart by hours over millennia",
				'le maree allungano il giorno, così gli orologi e la rotazione della Terra si scostano di ore nel corso dei millenni'
			),
			path: null,
			ready: false
		}
	};

	/* The topic cards of the epilogue (Site.renderTopics), in three
	   groups: what the course left out, where the story went after Kepler,
	   and what stood around the story. */
	const TOPIC_GROUPS = [
		{
			title: tr('Left out of the course', 'Lasciati fuori dal corso'),
			topics: ['nutation', 'aberration', 'parallax', 'latitudes', 'deltaT']
		},
		{
			title: tr('Where the story went', 'Dove è andata la storia'),
			topics: ['newton', 'perturbations', 'moon']
		},
		{
			title: tr('Around the story', 'Intorno alla storia'),
			topics: ['tycho', 'islamic', 'instruments', 'calendars']
		}
	];

	/* Origins (STRUCTURE.md §7.1): the label of each margin note
	   "Origin · Greek". The notes carry no explanation (STYLE.md §4.5); the
	   labels say enough on their own. */
	const ORIGINS = {
		babylonian: tr('Babylonian', 'babilonese'),
		greek: tr('Greek', 'greca'),
		hipparchus: tr('Hipparchus', 'Ipparco'),
		ptolemy: tr('Ptolemy', 'Tolomeo'),
		copernicus: tr('Copernicus', 'Copernico'),
		tycho: 'Tycho',
		kepler: tr('Kepler', 'Keplero'),
		debated: tr('Debated', 'dibattuta'),
		modern: tr('Modern', 'moderna')
	};

	/* Exercise kinds (STRUCTURE.md §7.2). */
	const EXERCISE_KINDS = {
		compute: tr('Compute, then check', 'Calcola, poi verifica'),
		predict: tr('Predict, then play', 'Prevedi, poi prova'),
		derive: tr('Derive', 'Ricava'),
		break: tr('Break the model', 'Fai fallire il modello')
	};

	/* On an Italian page, the links lead to the Italian pages: the path of
	   a page that has its translation becomes its index.it.html. A page
	   without one (the intro, for now) keeps its English path. */
	function localizePaths(entries) {
		entries.forEach(entry => {
			if (ITALIAN && entry.italian) {
				entry.path = entry.path.replace(/index\.html$/, 'index.it.html');
			}
		});
	}

	localizePaths([...PAGES, TOOLBOX]);

	return {
		ACTS,
		PAGES,
		ASTRONOMERS,
		TOOLBOX,
		TOPICS,
		TOPIC_GROUPS,
		ORIGINS,
		EXERCISE_KINDS
	};
})();
